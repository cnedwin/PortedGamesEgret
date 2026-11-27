// Exercise the official Egret eight-screen verifier on the actual game bundle.
// The disposable scenario pages use the same accelerated wave and sale setup as
// test/accept.mjs. They do not simulate a complete playthrough or physical touch.
// Run: node test/verify-screens.mjs --out <new directory> [--playwright <index.mjs>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const STATES = ['title', 'battle', 'shop', 'confirm', 'pause'];
const SCREENS = ['phone-small', 'phone-notch', 'phone-notch-wide', 'phone-tall',
  'tablet', 'tablet-wide', 'foldable', 'desktop'];
const gameDefault = fileURLToPath(new URL('../', import.meta.url));
const options = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i], value = process.argv[i + 1];
  if (!['--out', '--playwright', '--game', '--lang'].includes(key) || !value || value.startsWith('--') || key in options)
    throw Error('Usage: node test/verify-screens.mjs [--out <new directory>] [--playwright <index.mjs>] [--game <game-directory>] [--lang zh|en]');
  options[key] = value;
}
const game = path.resolve(options['--game'] ?? gameDefault);
const lang = options['--lang'] ?? 'zh';
if (!['zh', 'en'].includes(lang)) throw Error('Expected --lang zh or en');
const output = path.resolve(options['--out'] ?? path.join(os.tmpdir(), 'nezha-screens-' + Date.now()));
if (fs.existsSync(output)) throw Error('Output already exists: ' + output);

const require = createRequire(path.join(game, 'package.json'));
const pw = options['--playwright']
  ? path.resolve(options['--playwright'])
  : path.join(path.dirname(require.resolve('playwright/package.json')), 'index.mjs');
const cli = path.join(game, 'vendor/egret.mjs');
if (!fs.statSync(pw).isFile() || !fs.statSync(cli).isFile()) throw Error('Playwright or official Egret CLI not found.');
const { PNG } = require(path.join(game, 'vendor/egret/third-party/pngjs'));
const source = fs.readFileSync(path.join(game, 'index.html'), 'utf8');
if (!source.includes('<head>') || !source.includes('</body>')) throw Error('Game page needs head/body anchors.');

async function setScenario(wanted) {
  const deadline = performance.now() + 14000;
  const wait = async (test, label) => {
    while (!test()) {
      if (performance.now() > deadline) throw Error('QA state timeout: ' + label);
      await new Promise(resolve => setTimeout(resolve, 40));
    }
  };
  const api = () => window.nezhaSea;
  const byPart = part => api()?.ui.tree.publish().nodes.find(node => !node.inert && !node.hidden && node.id.endsWith(':' + part));
  const press = async part => {
    await wait(() => !!byPart(part), part);
    const node = byPart(part);
    api().tester.press(node.role + ':' + node.name);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  };

  await wait(() => api()?.ready && api().screen === 'title', 'ready title');
  if (wanted === 'title') return;
  api().start();
  await wait(() => api().screen === 'play', 'battle start');
  if (wanted === 'battle') {
    await wait(() => !!byPart('pause'), 'battle HUD');
    return;
  }
  if (wanted === 'pause') {
    await press('pause');
    await wait(() => api().screen === 'menu' && api().game.paused, 'pause menu');
    return;
  }
  // Match the accelerated wave-one browser acceptance fixture, then use the
  // actual rule transition and native semantic commands to open the market.
  const run = api().app.run;
  run.waveLeft = Math.min(run.waveLeft, 2);
  run.pending = Math.max(run.pending, 1);
  await wait(() => ['levelUp', 'shop'].includes(api().screen), 'wave-one upgrade');
  for (let i = 0; i < 8 && api().screen === 'levelUp'; i++) await press('upgrade0');
  await wait(() => api().screen === 'shop' && !!byPart('offerBuy0'), 'market');
  if (wanted === 'shop') return;

  // Two ordinary weapons make sale confirmation reachable without grinding.
  // Nothing is sold or saved.
  const { app, refresh } = api();
  app.picked = null;
  app.run.weapons = [['ring', 0], ['ribbon', 0]].map(([kind, tier]) =>
    ({ kind, tier, divine: false, cooldown: 0, angle: 0, also: 0 }));
  refresh();
  if (byPart('gearTab')) await press('gearTab');
  await press('relic0');
  await press('sell');
  await wait(() => api().game.asking || !!byPart('sellConfirm') || !!byPart('yes'), 'sale confirmation');
}

function scenarioHtml(state) {
  const head = '<head>\n' +
    '<!-- QA-only readiness: the verifier waits for a visible canvas. -->\n' +
    '<script>history.replaceState(null,"",location.pathname+"?seed=11&lang=' + lang + '");</script>\n' +
    '<style id="qa-readiness-gate">#surface canvas{visibility:hidden!important}</style>';
  const script = '<script type="module">\n' +
    'try { await (' + setScenario.toString() + ')(' + JSON.stringify(state) + '); }\n' +
    'catch(error) { console.error("QA fixture ' + state + ': "+String(error?.message??error)); }\n' +
    'finally { document.getElementById("qa-readiness-gate")?.remove(); }\n' +
    '</script>\n';
  return source.replace('<head>', () => head).replace('</body>', () => script + '</body>');
}

function sheet(folder) {
  // Preserve the verifier's red safe-area tints. Four columns, two rows;
  // each source PNG remains available at its original resolution for close inspection.
  const w = 400, h = 400, pad = 10;
  const canvas = new PNG({ width: w * 4, height: h * 2 });
  for (let i = 0; i < canvas.data.length; i += 4) {
    canvas.data[i] = 23; canvas.data[i + 1] = 28;
    canvas.data[i + 2] = 31; canvas.data[i + 3] = 255;
  }
  for (const [index, name] of SCREENS.entries()) {
    const image = PNG.sync.read(fs.readFileSync(path.join(folder, name + '.png')));
    const scale = Math.min((w - pad * 2) / image.width, (h - pad * 2) / image.height);
    const width = Math.max(1, Math.round(image.width * scale)), height = Math.max(1, Math.round(image.height * scale));
    const left = index % 4 * w + Math.floor((w - width) / 2), top = Math.floor(index / 4) * h + Math.floor((h - height) / 2);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const sx = Math.min(image.width - 1, Math.floor((x + .5) / scale));
      const sy = Math.min(image.height - 1, Math.floor((y + .5) / scale));
      const src = (sy * image.width + sx) * 4, dst = ((top + y) * canvas.width + left + x) * 4;
      canvas.data.set(image.data.subarray(src, src + 4), dst);
    }
  }
  fs.writeFileSync(path.join(folder, 'contact-sheet.png'), PNG.sync.write(canvas));
}

fs.mkdirSync(output, { recursive: true });
// Isolate transient HTML outside the checkout, sharing only read-only game
// resource paths. Never rewrite index.html, the bundle, or official vendor.
const fixture = fs.mkdtempSync(path.join(output, '.fixture-'));
const links = [], files = [];
const summary = { profile: 'nezha-five-state-screens/1', language: lang, states: {},
  counts: { screens: 0, passed: 0, errors: 0, warnings: 0, engineWarnings: 0, missingNativeChecks: 0 },
  findings: {} };
try {
  for (const dir of ['assets', 'bundle', 'src', 'vendor']) {
    const link = path.join(fixture, dir);
    fs.symlinkSync(path.join(game, dir), link, process.platform === 'win32' ? 'junction' : 'dir');
    links.push(link);
  }
  fs.copyFileSync(path.join(game, 'style.css'), path.join(fixture, 'style.css'));
  files.push(path.join(fixture, 'style.css'));

  const origin = fs.readFileSync(path.join(game, 'vendor/SOURCE.md'), 'utf8');
  summary.vendor = origin.split(/\r?\n/).find(line => /\b[0-9a-f]{40}\b/i.test(line))?.trim() ?? null;
  for (const state of STATES) {
    const page = path.join(fixture, state + '.html'), folder = path.join(output, state);
    fs.writeFileSync(page, scenarioHtml(state));
    files.push(page);
    const run = spawnSync(process.execPath, [cli, 'verify', page, '--screens', '--playwright', pw, '--out', folder],
      { cwd: fixture, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    const log = (run.stdout ?? '') + (run.stderr ?? '') + (run.error ? String(run.error) : '');
    fs.writeFileSync(path.join(output, state + '.log'), log);
    process.stdout.write('\n--- ' + state + ' ---\n' + log);
    const reportFile = path.join(folder, 'report.json');
    const report = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : null;
    const record = { exitCode: run.status, pass: false, screens: report?.screens ?? [] };
    summary.states[state] = record;
    const complete = record.screens.length === SCREENS.length &&
      SCREENS.every(name => record.screens.some(screen => screen.name === name));
    let hasNativeChecks = complete;
    for (const screen of record.screens) {
      summary.counts.screens++;
      if (screen.pass) summary.counts.passed++;
      for (const finding of screen.findings ?? []) {
        if (finding.severity === 'error') summary.counts.errors++;
        if (finding.severity === 'warning') summary.counts.warnings++;
        summary.findings[finding.check] = (summary.findings[finding.check] ?? 0) + 1;
      }
      summary.counts.engineWarnings += (screen.engineWarnings ?? []).length;
      if (!screen.safe || !Number.isInteger(screen.controls) || screen.controls < 1) {
        summary.counts.missingNativeChecks++;
        hasNativeChecks = false;
      }
    }
    record.pass = run.status === 0 && complete && !!report?.pass && hasNativeChecks;
    if (complete) sheet(folder);
  }
} finally {
  // Remove only entries created by this run; never follow a resource junction.
  const relative = path.relative(fs.realpathSync(output), fs.realpathSync(fixture));
  if (relative.startsWith('..') || path.isAbsolute(relative) || !relative.startsWith('.fixture-'))
    throw Error('Refusing to clean an unexpected fixture path.');
  for (const file of files) fs.unlinkSync(file);
  for (const link of links) {
    if (!fs.lstatSync(link).isSymbolicLink()) throw Error('Unexpected fixture link: ' + link);
    fs.unlinkSync(link);
  }
  fs.rmdirSync(fixture);
}
summary.pass = STATES.every(state => summary.states[state]?.pass);
fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ pass: summary.pass, ...summary.counts, findings: summary.findings, output }, null, 2));
process.exitCode = summary.pass ? 0 : 1;
