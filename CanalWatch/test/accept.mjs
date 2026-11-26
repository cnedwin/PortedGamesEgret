// Browser acceptance: actual keyboard, mouse and emulated touch through the native Egret views.
// The two settlement fixtures accelerate rule outcomes only; they are not full-match playthroughs.
// Run node test/accept.mjs; --update updates the three reviewed desktop screenshots.
import { mkdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, report, serve } from '../../tools/lib/browser.mjs';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = relative(ROOT, GAME).split('\\').join('/');
const server = await serve(), browser = await launch(), checks = [], pages = [];
const check = (ok, message) => checks.push([Boolean(ok), message]);
const state = (page, fn, value) => page.evaluate(fn, value);
const wait = (page, fn, value, timeout = 15000) => page.waitForFunction(fn, value, { timeout, polling: 100 });
const frame = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const focus = page => state(page, () => window.canalWatch.ui.focused);
const nodes = page => state(page, () => window.canalWatch.semantics.publish().nodes.filter(node => !node.inert && !node.hidden));
const names = async (page, role) => (await nodes(page)).filter(node => !role || node.role === role).map(node => node.name).join('|');
const nodeName = async (page, name) => (await nodes(page)).find(node => node.id.endsWith(':' + name))?.name ?? '';
const screen = (page, name) => wait(page, name => window.canalWatch.screen === name, name);
const see = (page, name) => wait(page, name => Boolean(window.canalWatch.ui.point(name)), name);
const waitView = (page, name) => wait(page, name => !!window.canalWatch.ui.view(name), name);

async function open(options = {}, lang = 'zh') {
  const page = await openPage(browser, `${server.url}${path}/?seed=1&lang=${lang}`, options);
  pages.push(page);
  await wait(page, () => window.canalWatch?.ready && window.canalWatch.screen === 'title');
  await frame(page);
  return page;
}
async function key(page, name) { await page.keyboard.press(name); await frame(page); }
async function tabTo(page, name, back = false) {
  for (let index = 0; index < 48; index++) {
    if (await focus(page) === name) return true;
    await key(page, back ? 'Shift+Tab' : 'Tab');
  }
  throw Error(`Cannot reach ${name} with Tab (last focus ${await focus(page)})`);
}
async function focusCheck(page, view, name, words) {
  await frame(page);
  const focused = await state(page, ({ view, name }) => {
    const w = window.canalWatch, tree = w.semantics.publish();
    const active = tree.nodes.find(node => !node.inert && !node.hidden && node.focused && node.id.endsWith(':' + name));
    return { view: w.ui.view(view)?.focused, top: w.ui.focused,
      semantic: Boolean(active && tree.focused === active.id && w.game.canvas.getAttribute('aria-activedescendant')) };
  }, { view, name });
  check(focused.view === name && focused.top === name && focused.semantic, `${words} (${JSON.stringify(focused)})`);
}
async function activate(page, name, touch = false) {
  await see(page, name);
  const point = await state(page, name => window.canalWatch.ui.point(name), name);
  const bounds = page.viewportSize();
  if (!point || point.x < 0 || point.y < 0 || point.x > bounds.width || point.y > bounds.height) {
    throw Error(`Control ${name} lies outside the viewport: ${JSON.stringify(point)}`);
  }
  await (touch ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y));
  await frame(page);
}
async function shot(page, name, baseline = false) {
  if (process.env.CANAL_QA_SHOTS) {
    const out = resolve(process.env.CANAL_QA_SHOTS);
    await mkdir(out, { recursive: true });
    await page.screenshot({ path: join(out, `${name}.png`) });
  }
  if (baseline) {
    const result = await matchBaseline(page, GAME, name, { limit: name === 'map' ? .03 : .02 });
    check(result.written || result.passed, `${name} looks as its baseline (${(result.share * 100).toFixed(2)}% differs)`);
  }
}
async function layoutCheck(page, mode) {
  const geometry = await state(page, () => {
    const { layout, ui, game } = window.canalWatch, f = layout.field, box = game.canvas.getBoundingClientRect(),
      ground = document.querySelector('#ground').getBoundingClientRect(), px = f.x / layout.width * box.width + box.left,
      py = f.y / layout.height * box.height + box.top;
    const target = ui.point('plot-5');
    return { mode: layout.mode, scale: f.scale,
      aligned: Math.abs(ground.left - px) < 2 && Math.abs(ground.top - py) < 2 &&
        Math.abs(ground.width - f.width / layout.width * box.width) < 2 && Math.abs(ground.height - f.height / layout.height * box.height) < 2,
      plot: Boolean(target && target.x >= ground.left && target.x <= ground.right && target.y >= ground.top && target.y <= ground.bottom),
      aspect: Math.abs(ground.width / ground.height - 16 / 9) < .02 };
  });
  check(geometry.mode === mode && geometry.scale > 0 && geometry.aligned && geometry.plot && geometry.aspect,
    `native ${mode} deck and complete simulation map share their coordinate space (${JSON.stringify(geometry)})`);
}

async function titleTargets(page, mode) {
  const smallest = await state(page, () => {
    const w = window.canalWatch, screen = w.game.screen, box = w.game.canvas.getBoundingClientRect();
    const names = ['start-normal','start-hard','intercept','help','setting-sound','setting-music','setting-reducedMotion','setting-language'];
    return Math.min(...names.map(name => {
      const n = w.semantics.publish().nodes.find(n => n.id.endsWith(':' + name) && !n.hidden && !n.inert);
      return n ? Math.min(n.bounds.width * box.width / screen.width, n.bounds.height * box.height / screen.height) : 0;
    }));
  });
  check(smallest >= 44, `${mode} title controls retain at least 44 CSS pixel touch targets (${smallest.toFixed(1)})`);
}

async function desktop() {
  const page = await open({ width: 1280, height: 800 });
  await page.waitForTimeout(600);
  await shot(page, 'title', true);
  await titleTargets(page, 'desktop');
  await focusCheck(page, 'title', 'start-normal', 'title opens with the first difficulty focused in Egret and browser semantics');
  check(/寻常/.test(await nodeName(page, 'start-normal')), 'title difficulty has its Chinese accessible name');
  check(await state(page, () => !document.querySelector('#bar,#plots,#picker,#title,#menu,#end')), 'legacy interactive DOM controls are absent');

  // The settings on the title, by Tab and Space: the sound goes off and is saved.
  await tabTo(page, 'setting-sound');
  await key(page, 'Space');
  check(await state(page, () => !window.canalWatch.app.save.data.settings.sound), 'Tab and Space reach the sound switch and turn it off, and it is saved');
  check(await focus(page) === 'setting-sound' && /关/.test(await nodeName(page, 'setting-sound')), 'the switch keeps native focus and says it is off');
  await tabTo(page, 'setting-language');
  await key(page, 'Enter');
  await wait(page, () => document.documentElement.lang === 'en');
  const english = await names(page, 'button');
  check(!/[\u3400-\u9fff]/.test(english.replace('中文', '')) && /Normal/.test(english), 'all visible native buttons are in English');
  check(await state(page, () => window.canalWatch.app.save.data.settings.language === 'en'), 'the language is saved');
  await shot(page, 'desktop-title-en');

  await tabTo(page, 'help', true);
  await key(page, 'Enter');
  await waitView(page, 'help');
  await focusCheck(page, 'help', 'close-help', 'help is modal with native initial focus');
  check(/Towpath|towpath/.test(await names(page)) && /6 seconds/.test(await names(page)), 'help contains the complete original rules');
  await key(page, 'Escape');
  await wait(page, () => !window.canalWatch.ui.view('help'));
  check(await focus(page) === 'help', 'Escape dismisses the help modal and restores focus');

  // A game: back to the first difficulty, Enter starts it, and plot six has the focus.
  await tabTo(page, 'start-normal', true);
  await key(page, 'Enter');
  await screen(page, 'play');
  await layoutCheck(page, 'desktop');
  await focusCheck(page, 'field', 'plot-5', 'the game starts on plot six');
  check(/Plot 6/.test(await nodeName(page, 'plot-5')), 'the compact plot control has its richer accessible name');
  const silver = await state(page, () => window.canalWatch.app.world.silver);
  await key(page, 'Enter');
  await waitView(page, 'picker');
  check(await focus(page) === 'kind-crossbow' && /Crossbow/.test(await nodeName(page, 'kind-crossbow')), "Enter opens the plot's picker on its first tower");
  await key(page, 'Enter');
  await wait(page, () => window.canalWatch.app.world.towers[5]?.kind === 'crossbow');
  check(await state(page, () => window.canalWatch.app.world.silver) === silver - 70, 'Enter builds the crossbow tower for 70 silver');
  check(await focus(page) === 'plot-5' && /Plot 6: Crossbow tower level 1/.test(await nodeName(page, 'plot-5')), 'focus is back on the plot and describes its standing tower');
  await key(page, 'Tab');
  await key(page, '4');
  await wait(page, () => window.canalWatch.app.world.towers[6]?.kind === 'gong');
  check(true, 'Tab to the next plot and 4 builds a gong post there');
  await page.waitForTimeout(400);
  await shot(page, 'map', true);

  const mouseSilver = await state(page, () => window.canalWatch.app.world.silver);
  await activate(page, 'plot-4'); await activate(page, 'kind-crossbow');
  await wait(page, () => window.canalWatch.app.world.towers[4]?.kind === 'crossbow');
  check(await state(page, () => window.canalWatch.app.world.silver) === mouseSilver - 70, 'actual desktop mouse click builds immediately without a second confirmation');
  await activate(page, 'plot-4'); await activate(page, 'sell');
  await wait(page, () => !window.canalWatch.app.world.towers[4]);

  await key(page, 'n');
  await wait(page, () => window.canalWatch.app.world.wave === 0 && window.canalWatch.app.world.state === 'wave');
  check(true, 'N calls the first wave');
  await key(page, 'f'); await key(page, 'f');
  check(await state(page, () => window.canalWatch.game.timeScale) === 3, 'F twice runs the game three times as fast');
  await key(page, 'q');
  check(await state(page, () => window.canalWatch.app.world.gates[0].shutLeft) > 0, 'Q shuts the upper gate');
  await key(page, 'e');
  check(await state(page, () => window.canalWatch.app.world.gates[1].shutLeft) > 0, 'E shuts the lower gate independently');
  await key(page, 'p');
  await wait(page, () => window.canalWatch.screen === 'menu' && window.canalWatch.game.paused);
  await focusCheck(page, 'menu', 'resume', 'pause modal focuses Resume');
  const time = await state(page, () => window.canalWatch.app.world.time);
  await page.waitForTimeout(500);
  check(await state(page, () => window.canalWatch.app.world.time) === time, 'P opens the menu and nothing moves behind it');
  await key(page, 'Escape');
  await wait(page, () => window.canalWatch.screen === 'play' && !window.canalWatch.game.paused);
  check(await focus(page) === 'menu', 'Escape closes the menu, restores the pause control and game resumes');

  // Outcome fixture: with one life left, the first naturally leaking raider ends this match.
  await state(page, () => { window.canalWatch.app.world.lives = 1; });
  await wait(page, () => window.canalWatch.screen === 'end' && !!window.canalWatch.ui.view('end'), undefined, 90000);
  await see(page, 'again'); await frame(page);
  const loss = await names(page);
  check(/The gate fell/.test(loss), `loss fixture displays The gate fell`);
  const saved = await state(page, () => JSON.parse(localStorage.getItem('canal-watch')).data);
  check(saved.plays === 1 && saved.best.normal === 0, 'the game is counted and no stars are kept');
  await focusCheck(page, 'end', 'again', 'loss offers another game first');
  await key(page, 'Enter');
  await wait(page, () => window.canalWatch.screen === 'play' && window.canalWatch.app.world.time < 5);
  check(await state(page, () => window.canalWatch.app.world.towers.every(tower => tower === null)), 'Enter starts a new game on a clear map');

  // Outcome fixture: the twelfth wave is brought on and its last raider is already gone.
  await state(page, () => {
    const world = window.canalWatch.app.world;
    world.wave = 11; world.state = 'wave'; world.queue = []; world.raiders = [];
  });
  await wait(page, () => window.canalWatch.screen === 'end' && !!window.canalWatch.ui.view('end'));
  await see(page, 'again'); await frame(page);
  await page.waitForTimeout(2600);
  const won = await names(page);
  check(/The gate held/.test(won) && /★★★/.test(won) && /New best/.test(won), 'holding all twelve waves with every life gives three stars and a new best');
  await shot(page, 'end', true);
  check(await state(page, () => JSON.parse(localStorage.getItem('canal-watch')).data.best.normal) === 3, 'three stars are kept for normal');
  await key(page, 'Tab'); await key(page, 'Enter');
  await screen(page, 'title');
  check(/Best ★★★/.test(await names(page)), 'the title shows the best stars for normal');

  // A broken save: the game starts again and says so, without an error.
  await state(page, () => localStorage.setItem('canal-watch', '{broken'));
  await page.reload();
  await wait(page, () => window.canalWatch?.ready && window.canalWatch.screen === 'title');
  check(await state(page, () => window.canalWatch.app.notice === 'saveReset') && /存档/.test(await names(page)), 'a broken save is reset and reported in native title');
  await page.context().close();
}

async function portrait() {
  const page = await open({ width: 390, height: 844, touch: true }, 'en');
  await shot(page, 'portrait-title');
  await titleTargets(page, 'portrait');
  await activate(page, 'start-normal', true);
  await screen(page, 'play').catch(error => { throw Error(`English portrait start-normal did not activate: ${error.message}`); });
  await layoutCheck(page, 'portrait');
  const silver = await state(page, () => window.canalWatch.app.world.silver);
  await activate(page, 'plot-5', true);
  await waitView(page, 'picker');
  await activate(page, 'kind-fire', true);
  check(await state(page, () => !window.canalWatch.app.world.towers[5] && window.canalWatch.app.world.silver) === silver,
    'emulated touch on a tower only previews and does not spend silver');
  check(/100/.test(await nodeName(page, 'build-confirm')), 'touch preview changes confirmation to its tower price');
  await shot(page, 'portrait-picker');
  await activate(page, 'build-confirm', true);
  await wait(page, () => window.canalWatch.app.world.towers[5]?.kind === 'fire');
  check(await state(page, () => window.canalWatch.app.world.silver) === silver - 100, 'explicit touch confirmation constructs exactly the selected tower');
  await activate(page, 'plot-5', true);
  await activate(page, 'upgrade', true);
  await wait(page, () => window.canalWatch.app.world.towers[5]?.level === 1);
  check(await state(page, () => window.canalWatch.app.world.silver) === silver - 210, 'occupied plot upgrades through the native action');
  await activate(page, 'plot-6', true);
  await activate(page, 'kind-trebuchet', true);
  await activate(page, 'build-confirm', true);
  check(await state(page, () => !window.canalWatch.app.world.towers[6] && window.canalWatch.app.world.silver) === silver - 210 &&
    /more silver needed/.test(await names(page)), 'unaffordable touch purchase is refused with explanatory feedback, not silent disablement');
  await activate(page, 'cancel', true);
  await activate(page, 'plot-5', true);
  await activate(page, 'sell', true);
  await wait(page, () => !window.canalWatch.app.world.towers[5]);
  check(await state(page, () => window.canalWatch.app.world.silver) > silver - 210, 'selling removes the tower and refunds silver');
  await activate(page, 'menu', true);
  await screen(page, 'menu');
  await shot(page, 'portrait-menu');
  await activate(page, 'resume', true);
  await screen(page, 'play');
  check(await state(page, () => !window.canalWatch.game.paused), 'portrait emulated touch can pause and resume');
  await page.context().close();
}

async function wide() {
  const page = await open({ width: 844, height: 390, touch: true });
  await shot(page, 'wide-title');
  await titleTargets(page, 'wide');
  await activate(page, 'intercept', true);
  await wait(page, () => window.canalWatch.screen === 'play' && window.canalWatch.app.world.mode === 'intercept');
  await layoutCheck(page, 'wide');
  await shot(page, 'wide-map');
  await activate(page, 'gate-0', true); await activate(page, 'gate-1', true);
  check(await state(page, () => window.canalWatch.app.world.gates.every(g => g.shutLeft > 0)), 'wide emulated touch reaches both independent sluices');
  await activate(page, 'call', true);
  await wait(page, () => window.canalWatch.app.world.wave === 0);
  check(true, 'wide emulated touch calls the first intercept wave');
  // Skip only the first wave's remaining raiders to expose the second wave's normally scheduled carrier.
  // The carrier is created and moves through the ordinary rules; the preview is selected through actual input.
  await state(page, () => { const w = window.canalWatch.app.world; w.queue = []; w.raiders = []; });
  await wait(page, () => window.canalWatch.app.world.state === 'break');
  await activate(page, 'call', true);
  await wait(page, () => window.canalWatch.app.world.wave === 1);
  await activate(page, 'speed', true); await activate(page, 'speed', true);
  await wait(page, () => window.canalWatch.app.world.raiders.some(r => r.kind === 'junk' && r.x > 45 && r.x < 130), undefined, 45000);
  await activate(page, 'landing-preview', true);
  check(/若在此处沉没/.test(await state(page, () => document.querySelector('#say').textContent)), 'landing-preview HUD selects the live carrier and announces its landing point');
  await activate(page, 'landing-preview', true);
  check(/已关闭登陆预判/.test(await state(page, () => document.querySelector('#say').textContent)), 'landing-preview HUD can clear the selection');
  const boat = await state(page, () => {
    const carrier = window.canalWatch.app.world.raiders.find(r => r.kind === 'junk' && r.x > 0 && r.x < 960);
    const box = document.querySelector('#ground').getBoundingClientRect();
    return { x: box.left + carrier.x / 960 * box.width, y: box.top + carrier.y / 540 * box.height };
  });
  await page.touchscreen.tap(boat.x, boat.y); await frame(page);
  check(/若在此处沉没/.test(await state(page, () => document.querySelector('#say').textContent)), 'actual tap on the rendered carrier also opens its landing preview');
  // Five-wave intercept outcome fixture verifies its own result fields and that it cannot alter standard scores.
  await state(page, () => {
    const w = window.canalWatch.app.world; w.wave = w.waves.length - 1; w.state = 'wave'; w.queue = []; w.raiders = [];
    w.intercept.held = [3, 5]; w.intercept.landed = 8; w.intercept.crewStopped = 6; w.intercept.crewLeaked = 2;
  });
  await wait(page, () => window.canalWatch.screen === 'end' && !!window.canalWatch.ui.view('end'));
  await see(page, 'again'); await frame(page);
  check(await state(page, () => window.canalWatch.app.result.intercept?.held[1] === 5) && /截漕挑战完成/.test(await names(page)) &&
    /上闸截停/.test(await names(page)) && /拦下的登陆兵/.test(await names(page)), 'intercept result shows the distinct native challenge statistics');
  check(await state(page, () => window.canalWatch.app.save.data.plays === 0 && window.canalWatch.app.save.data.best.normal === 0),
    'intercept result never changes the standard mode score or play count');
  await shot(page, 'wide-intercept-end');
  await page.context().close();
}

try {
  for (const [name, route] of [['Desktop keyboard', desktop], ['Portrait emulated touch', portrait], ['Wide emulated touch', wide]]) {
    const start = pages.length;
    try { await route(); }
    catch (error) { check(false, `${name} walk stopped: ${error.message.split('\n')[0]}`); }
    finally { for (const page of pages.slice(start)) if (!page.isClosed()) await page.context().close(); }
  }
} finally {
  const problems = pages.flatMap(page => page.problems ?? []);
  await browser.close(); await server.close();
  report('CanalWatch acceptance (headless Chromium, SwiftShader; touch emulation, not physical device)', checks, problems);
}
