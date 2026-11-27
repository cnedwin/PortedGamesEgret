// Exercise the official Egret eight-screen verifier on the actual game bundle.
// Every screen opens the ordinary game page and uses the engine's trusted local
// --prepare interface. This is layout QA, not a complete playthrough or physical touch.
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
function sheet(folder, picture = name => name + '.png', outputName = 'contact-sheet.png') {
  // Preserve the verifier's red safe-area tints. Four columns, two rows;
  // each source PNG remains available at its original resolution for close inspection.
  const w = 400, h = 400, pad = 10;
  const canvas = new PNG({ width: w * 4, height: h * 2 });
  for (let i = 0; i < canvas.data.length; i += 4) {
    canvas.data[i] = 23; canvas.data[i + 1] = 28;
    canvas.data[i + 2] = 31; canvas.data[i + 3] = 255;
  }
  for (const [index, name] of SCREENS.entries()) {
    const image = PNG.sync.read(fs.readFileSync(path.join(folder, picture(name))));
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
  fs.writeFileSync(path.join(folder, outputName), PNG.sync.write(canvas));
}

const page = path.join(game, 'index.html');
const prepare = fileURLToPath(new URL('./prepare-screen.mjs', import.meta.url));
if (!fs.statSync(page).isFile() || !fs.statSync(prepare).isFile()) throw Error('Game page or preparation module is missing.');
const actualState = { title: 'title', battle: 'play', shop: 'shop', confirm: 'shop/confirm', pause: 'menu' };

fs.mkdirSync(output, { recursive: true });
const summary = {
  profile: 'nezha-five-state-screens/2', language: lang, states: {},
  counts: { screens: 0, passed: 0, errors: 0, warnings: 0, engineWarnings: 0,
    missingNativeChecks: 0, preparedMismatches: 0, missingGearPictures: 0 },
  findings: {}
};
const origin = fs.readFileSync(path.join(game, 'vendor/SOURCE.md'), 'utf8');
summary.vendor = origin.split(/\r?\n/).find(line => /\b[0-9a-f]{40}\b/i.test(line))?.trim() ?? null;

for (const state of STATES) {
  const folder = path.join(output, state);
  const run = spawnSync(process.execPath, [cli, 'verify', page, '--screens', '--prepare', prepare,
    '--playwright', pw, '--out', folder], {
    cwd: game, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, NEZHA_VERIFY_SCREEN_STATE: state, NEZHA_VERIFY_SCREEN_LANG: lang }
  });
  const log = (run.stdout ?? '') + (run.stderr ?? '') + (run.error ? String(run.error) : '');
  fs.writeFileSync(path.join(output, state + '.log'), log);
  process.stdout.write('\n--- ' + state + ' ---\n' + log);
  const reportFile = path.join(folder, 'report.json');
  const report = fs.existsSync(reportFile) ? JSON.parse(fs.readFileSync(reportFile, 'utf8')) : null;
  const record = { exitCode: run.status, pass: false, screens: report?.screens ?? [] };
  summary.states[state] = record;
  const complete = record.screens.length === SCREENS.length &&
    SCREENS.every(name => record.screens.some(screen => screen.name === name));
  let hasNativeChecks = complete, preparedMatches = complete, hasAllGearPictures = true;
  for (const screen of record.screens) {
    summary.counts.screens++;
    if (screen.pass) summary.counts.passed++;
    for (const finding of screen.findings ?? []) {
      if (finding.severity === 'error') summary.counts.errors++;
      if (finding.severity === 'warning') summary.counts.warnings++;
      summary.findings[finding.check] = (summary.findings[finding.check] ?? 0) + 1;
    }
    summary.counts.engineWarnings += (screen.engineWarnings ?? []).length;
    const phone = Math.min(...screen.size) < 600;
    const minimum = { title: 9, battle: 1, shop: phone ? 12 : 17, confirm: 2, pause: 6 }[state];
    if (!screen.safe || !Number.isInteger(screen.controls) || screen.controls < minimum ||
        (state === 'confirm' && screen.controls !== 2)) {
      summary.counts.missingNativeChecks++;
      hasNativeChecks = false;
    }
    if (screen.prepared?.pass !== true || screen.prepared.scene !== actualState[state] + ':' + lang) {
      summary.counts.preparedMismatches++;
      preparedMatches = false;
    }
  }
  if (state === 'confirm') {
    // The preparation module also captures the selected treasure before opening
    // the modal; these are supplemental and are not official tinted screenshots.
    const gearName = name => 'prepared-' + name + '-gear-selected.png';
    for (const name of SCREENS) if (!fs.existsSync(path.join(folder, gearName(name)))) {
      summary.counts.missingGearPictures++;
      hasAllGearPictures = false;
    }
    if (hasAllGearPictures) sheet(folder, gearName, 'gear-selected-sheet.png');
  }
  record.pass = run.status === 0 && complete && !!report?.pass && hasNativeChecks &&
    preparedMatches && hasAllGearPictures;
  if (complete && record.screens.every(screen => screen.picture && fs.existsSync(screen.picture))) sheet(folder);
}
summary.pass = STATES.every(state => summary.states[state]?.pass);
fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ pass: summary.pass, ...summary.counts, findings: summary.findings, output }, null, 2));
process.exitCode = summary.pass ? 0 : 1;
