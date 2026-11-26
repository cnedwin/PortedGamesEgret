// Browser acceptance covers keyboard navigation, live calls, the East round record, and rotated touch input.
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, report, serve } from '../../tools/lib/browser.mjs';

const game = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = relative(ROOT, game).split('\\').join('/');
const server = await serve();
const browser = await launch();
const checks = [];
const pages = [];
const check = (ok, words) => checks.push([Boolean(ok), words]);
const state = (page, fn, value) => page.evaluate(fn, value);
const wait = (page, fn, value, timeout = 14000) => page.waitForFunction(fn, value, { timeout });
const names = async (page, role) => state(page, role => window.mahjong.semantics.publish().nodes
  .filter(node => !node.inert && (!role || node.role === role)).map(node => node.name), role);
const focus = page => state(page, () => window.mahjong.ui.focused);
const viewFocus = (page, view) => state(page, view => window.mahjong.ui.view(view)?.focused, view);
const shown = (page, name) => state(page, name => Boolean(window.mahjong.ui.point(name)), name);
const see = (page, name) => wait(page, name => Boolean(window.mahjong.ui.point(name)), name);
const hidden = (page, name) => wait(page, name => !window.mahjong.ui.point(name), name);
const waitScreen = (page, screen, timeout) => wait(page, screen => window.mahjong.screen === screen, screen, timeout);
const frame = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function nativeFocus(page, view, name, words) {
  const actual = await viewFocus(page, view);
  const semantic = await state(page, name => {
    const tree = window.mahjong.semantics.publish();
    const node = tree.nodes.find(node => !node.inert && node.focused && node.id.endsWith(':' + name));
    return node && tree.focused === node.id && Boolean(window.mahjong.game.canvas.getAttribute('aria-activedescendant'));
  }, name);
  check(actual === name && await focus(page) === name && semantic, words);
}

async function startPage(seed, { width = 1280, height = 720, touch = false } = {}) {
  const page = await openPage(browser, server.url + path + '/?seed=' + seed + '&lang=zh', { width, height, touch });
  pages.push(page);
  await wait(page, () => window.mahjong?.ready && window.mahjong.screen === 'title');
  return page;
}
async function activate(page, name, touch = false) {
  await see(page, name);
  const point = await state(page, name => window.mahjong.ui.point(name), name);
  const { x, y } = point;
  const size = page.viewportSize();
  if (!(x >= 0 && y >= 0 && x <= size.width && y <= size.height)) {
    throw new Error('Control lies outside the browser at ' + name + ': ' + JSON.stringify(point));
  }
  await (touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
  await frame(page);
}
async function key(page, name) {
  await page.keyboard.press(name);
  await frame(page);
}
async function tabTo(page, test, back = false) {
  for (let index = 0; index < 48; index++) {
    const current = await focus(page);
    if (typeof test === 'string' ? current === test : test.test(current ?? '')) return true;
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
  }
  return false;
}
async function setTempo(page) {
  await state(page, () => {
    window.mahjong.app.speed = 16;
    window.mahjong.game.timeScale = 16;
  });
}
async function visibleRules(page) {
  const words = new Set(await names(page));
  for (let i = 0; i < 12 && await shown(page, 'rulesDown'); i++) {
    const before = words.size;
    await activate(page, 'rulesDown');
    for (const word of await names(page)) words.add(word);
    if (words.size === before) break;
  }
  return [...words].join(' ');
}

async function walkEastRound() {
  const page = await startPage(11);
  await page.waitForTimeout(500);
  const title = await matchBaseline(page, game, 'title');
  check(title.written || title.passed, 'title looks as its baseline (' + (title.share * 100).toFixed(2) + '% differs)');
  check(await focus(page) === 'startButton', 'the title focuses Sit down');
  await nativeFocus(page, 'title', 'startButton', 'title focus agrees with the native view and browser semantics');
  const accessibility = await page.locator('body').ariaSnapshot();
  check(/button "開始打牌/.test(accessibility), 'the browser semantic tree names Sit down');

  check(await tabTo(page, 'rounds-4'), 'Tab reaches the full game');
  await key(page, 'Enter');
  await wait(page, () => window.mahjong.app.save.data.setup.rounds === 4);
  check(await focus(page) === 'rounds-4', 'Enter chooses it and the focus stays');
  check(await tabTo(page, 'level-hard'), 'Tab reaches Expert');
  await key(page, 'Space');
  await wait(page, () => window.mahjong.app.save.data.setup.level === 'hard');
  check(true, 'Space chooses Expert and the save keeps it');
  check(await tabTo(page, 'rounds-1', true), 'Shift+Tab goes back to the East round');
  await key(page, 'Enter');
  await wait(page, () => window.mahjong.app.save.data.setup.rounds === 1);
  check(true, 'Enter selects the East round again');

  check(await tabTo(page, 'settingsButton'), 'Tab reaches Settings');
  await key(page, 'Enter');
  await see(page, 'settingsClose');
  await nativeFocus(page, 'settings', 'setting-sound', 'Settings native initial focus lands on sound');
  check(await tabTo(page, 'setting-sound'), 'Tab reaches the sound switch');
  await key(page, 'Enter');
  await wait(page, () => window.mahjong.app.save.data.settings.sound === false);
  check(true, 'Enter turns the sound off and persists the preference');
  await key(page, 'Escape');
  await hidden(page, 'settingsClose');
  check(await focus(page) === 'settingsButton', 'Escape closes Settings and restores focus');
  await nativeFocus(page, 'title', 'settingsButton', 'native modal dismissal restores its title opener');

  check(await tabTo(page, 'rulesButton', true), 'Shift+Tab reaches rules');
  await key(page, 'Enter');
  await see(page, 'rulesClose');
  await nativeFocus(page, 'rules', 'rulesClose', 'Rules native initial focus selects Close rather than the scroll viewport');
  const rules = await matchBaseline(page, game, 'rules');
  check(rules.written || rules.passed, 'rules look as their baseline (' + (rules.share * 100).toFixed(2) + '% differs)');
  const words = await visibleRules(page);
  check(/門清一摸三/.test(words) && /八仙過海/.test(words) && /截胡/.test(words), 'the paged rules expose tai and nearest-winner text');
  await key(page, 'Escape');
  await hidden(page, 'rulesClose');
  await nativeFocus(page, 'title', 'rulesButton', 'closing paged Rules restores the title button');

  check(await tabTo(page, 'languageButton'), 'Tab reaches the language switch');
  await key(page, 'Enter');
  await wait(page, () => document.documentElement.lang === 'en');
  const english = (await names(page, 'button')).join('|');
  check(!/[\u3400-\u9fff]/.test(english) && /Sit down/.test(english), 'every visible English title button has an English accessible name');
  await key(page, 'Enter');
  await wait(page, () => document.documentElement.lang === 'zh-Hant');
  check(await focus(page) === 'languageButton', 'the same keyboard key switches back to Taiwanese Chinese');

  check(await tabTo(page, 'startButton', true), 'Shift+Tab reaches Sit down');
  await key(page, 'Enter');
  await waitScreen(page, 'play');
  await setTempo(page);
  let discarded = false;
  for (let index = 0; index < 16 && !discarded; index++) {
    await wait(page, () => window.mahjong.app.human || window.mahjong.screen !== 'play', null, 25000);
    if (await state(page, () => window.mahjong.screen !== 'play')) break;
    const options = await state(page, () => window.mahjong.app.human.options);
    if (options.type !== 'act') {
      await key(page, 'Escape');
      continue;
    }
    const tile = await focus(page);
    check(/^tile-\d+$/.test(tile), 'the keyboard focus moves to the current hand');
    const before = await state(page, () => window.mahjong.app.match.hand.players[0].discards.length);
    await key(page, 'Enter');
    await wait(page, () => window.mahjong.app.selected !== null);
    check('tile-' + await state(page, () => window.mahjong.app.selected) === tile, 'Enter raises the focused tile');
    check(await state(page, before => window.mahjong.app.match.hand.players[0].discards.length === before, before),
      'the first native Enter selects a tile without discarding it');
    await key(page, 'Enter');
    await wait(page, before => window.mahjong.app.match.hand.players[0].discards.length > before, before);
    discarded = true;
  }
  check(discarded, 'the player discards with real keyboard events');

  await wait(page, () => !window.mahjong.app.human || window.mahjong.app.human.options.type === 'act');
  await activate(page, 'pauseButton');
  await see(page, 'resumeButton');
  await nativeFocus(page, 'menu', 'resumeButton', 'Pause natively focuses Resume');
  await activate(page, 'menuRules');
  await see(page, 'rulesClose');
  await nativeFocus(page, 'rules', 'rulesClose', 'nested Rules receives its native initial focus');
  await key(page, 'Escape');
  await hidden(page, 'rulesClose');
  await nativeFocus(page, 'menu', 'menuRules', 'closing nested Rules returns to its Pause opener');
  await activate(page, 'menuSettings');
  await see(page, 'settingsClose');
  await nativeFocus(page, 'settings', 'setting-sound', 'nested Settings receives its native initial focus');
  await activate(page, 'setting-language');
  await wait(page, () => document.documentElement.lang === 'en');
  await nativeFocus(page, 'settings', 'setting-language', 'changing language retains the native focus within nested Settings');
  await key(page, 'Enter');
  await wait(page, () => document.documentElement.lang === 'zh-Hant');
  await key(page, 'Escape');
  await hidden(page, 'settingsClose');
  await nativeFocus(page, 'menu', 'menuSettings', 'closing translated Settings restores the original Pause opener');
  const events = await state(page, () => window.mahjong.app.match.hand.events.length);
  await page.waitForTimeout(1100);
  check(await state(page, events => window.mahjong.game.paused && window.mahjong.app.match.hand.events.length === events, events),
    'the table and its event sequence stand still behind Pause');
  await key(page, 'Escape');
  await hidden(page, 'resumeButton');
  check(await state(page, () => !window.mahjong.game.paused), 'Escape resumes the table');

  await activate(page, 'autoButton');
  check(await state(page, () => window.mahjong.app.autoplay), 'the autoplay control starts autoplay');
  await waitScreen(page, 'result', 120000);
  const settlement = await state(page, () => {
    const app = window.mahjong.app;
    const result = app.match.hand.result;
    return { result, sum: app.match.scores.reduce((total, score) => total + score, 0) };
  });
  const payRows = await Promise.all([0, 1, 2, 3].map(seat => shown(page, 'result-seat-' + seat)));
  const details = (await names(page)).join(' ');
  check(payRows.every(Boolean) && settlement.sum === 0 && /你/.test(details) && /阿德/.test(details) && /小美/.test(details) && /老陳/.test(details) &&
    (settlement.result.kind === 'draw' ? /流局/.test(details) : /台/.test(details)),
  'the settlement reads four players and tai or a draw, with a zero-sum payout');
  check(await focus(page) === 'nextButton', 'settlement focuses the next hand');
  await nativeFocus(page, 'result', 'nextButton', 'settlement native initial focus skips decorative paper');
  check(await state(page, () => JSON.parse(localStorage.getItem('taiwan-mahjong')).data.record.hands === 1), 'the record keeps the completed hand');
  await key(page, 'Enter');

  for (let i = 0; i < 35; i++) {
    await wait(page, () => ['result', 'final'].includes(window.mahjong.screen), null, 120000);
    if (await state(page, () => window.mahjong.screen === 'final')) break;
    await activate(page, 'nextButton');
  }
  await waitScreen(page, 'final');
  const rankRows = await Promise.all([0, 1, 2, 3].map(index => shown(page, 'rank-name-' + index)));
  const ranks = (await names(page)).join(' ');
  check(rankRows.every(Boolean) && /你/.test(ranks) && /阿德/.test(ranks) && /小美/.test(ranks) && /老陳/.test(ranks),
    'the final panel names all four ranked players');
  check(await state(page, () => {
    const record = JSON.parse(localStorage.getItem('taiwan-mahjong')).data.record;
    return record.games === 1 && record.bestGame !== null && record.hands >= 4;
  }), 'the record keeps the East round and best score');
  check(await focus(page) === 'againButton', 'the final panel focuses another match');
  await nativeFocus(page, 'final', 'againButton', 'final native initial focus skips decorative paper');
  await key(page, 'Tab');
  await key(page, 'Enter');
  await waitScreen(page, 'title');
  check(true, 'the keyboard returns to the title');

  await state(page, () => localStorage.setItem('taiwan-mahjong', '{broken'));
  await page.reload();
  await wait(page, () => window.mahjong?.ready && window.mahjong.screen === 'title');
  const notice = (await names(page)).join(' ');
  check(/存檔讀不懂.*重新開始/.test(notice), 'the title reports the broken save and starts again');
  await page.context().close();
}

// PC Chromium simulations: a vertical gesture in the rules panel's *local* coordinates must
// scroll once even when the whole interface is rotated 90 degrees for a portrait screen.
// No direct scroll-controller writes: actual CDP touch contacts and real mouse wheel input.
async function checkNativeRulesScroll(tall) {
  const page = await startPage(16, tall ? { width: 390, height: 844, touch: true } : { width: 1280, height: 720, touch: true });
  const label = tall ? 'rotated portrait (PC touch simulation)' : 'landscape (PC touch simulation)';
  await activate(page, 'rulesButton', true);
  await see(page, 'rulesClose');
  await nativeFocus(page, 'rules', 'rulesClose', label + ' Rules opens with native focus');
  const session = await page.context().newCDPSession(page);
  const offset = () => state(page, () => window.mahjong.ui.view('rules').scroll('rulesScroll').offset);
  async function drag(axis, delta) {
    const plan = await state(page, ({ axis, delta }) => {
      const { ui, game } = window.mahjong;
      const view = ui.view('rules'), panel = view.get('rulesScroll'), scroll = view.scroll('rulesScroll');
      const bounds = ui.rect('rulesScroll'), pixels = game.canvas.getBoundingClientRect();
      const unit = Math.max(game.width, game.height) / 1280;
      const origin = { x: bounds.w * unit / 2, y: bounds.h * unit / 2 };
      const points = Array.from({ length: 8 }, (_, i) => {
        const spot = { ...origin, [axis]: origin[axis] + delta * i / 7 };
        const global = panel.localToGlobal(spot.x, spot.y);
        return { x: pixels.left + global.x * pixels.width / game.width, y: pixels.top + global.y * pixels.height / game.height };
      });
      return { points, before: scroll.offset, maximum: scroll.maximum, rotation: game.ui.rotation };
    }, { axis, delta });
    const size = page.viewportSize();
    if (plan.points.some(({ x, y }) => x < 0 || y < 0 || x > size.width || y > size.height)) throw new Error('Rules drag outside viewport');
    const dispatch = (type, point) => session.send('Input.dispatchTouchEvent', { type, touchPoints: point ? [{ ...point, id: 1 }] : [] });
    await dispatch('touchStart', plan.points[0]);
    for (const point of plan.points.slice(1)) {
      await dispatch('touchMove', point);
      await frame(page);
    }
    await dispatch('touchEnd');
    await frame(page);
    return { ...plan, after: await offset() };
  }
  if (!tall) {
    const point = await state(page, () => window.mahjong.ui.point('rulesScroll'));
    await page.mouse.move(point.x, point.y);
    await page.mouse.wheel(0, 92);
    await wait(page, () => window.mahjong.ui.view('rules').scroll('rulesScroll').offset > 0);
    check(await offset() > 0, 'landscape Rules accepts real mouse wheel input');
    await page.mouse.wheel(0, -200);
    await wait(page, () => window.mahjong.ui.view('rules').scroll('rulesScroll').offset === 0);
  }
  const cross = await drag('x', -80);
  const forward = await drag('y', -90);
  const reverse = await drag('y', 90);
  check(cross.rotation === (tall ? 90 : 0) && Math.abs(cross.after - cross.before) < 1,
    label + ' perpendicular local drag does not scroll');
  check(forward.maximum > 90 && Math.abs(forward.after - forward.before - 90) <= 4,
    label + ' advances exactly once by the local 90-unit drag (' + (forward.after - forward.before).toFixed(1) + ')');
  check(Math.abs(reverse.after - cross.before) <= 4,
    label + ' reverses the drag back to the first row (' + reverse.after.toFixed(1) + ')');
  await activate(page, 'rulesClose', true);
  await hidden(page, 'rulesClose');
  await nativeFocus(page, 'title', 'rulesButton', label + ' close returns focus to its opener');
  await session.detach();
  await page.context().close();
}

// Each input below is a real legal choice in an unchanged seed. The browser never edits a hand or its options.
const routes = [
  { seed: 16, name: 'two Chow combinations in portrait', touch: true, actions: [{ type: 'chow', ids: [49, 57] }] },
  { seed: 3, name: 'Pong', actions: [{ type: 'pong' }] },
  { seed: 34, name: 'open Kong', actions: [{ type: 'discard', id: 109 }, { type: 'discard', id: 122 }, { type: 'kong' }] },
  { seed: 200, name: 'win on a discard', actions: [
    { type: 'discard', id: 67 }, { type: 'pong' }, { type: 'discard', id: 102 }, { type: 'chow', ids: [7, 9] },
    { type: 'discard', id: 29 }, { type: 'chow', ids: [85, 90] }, { type: 'discard', id: 89 }, { type: 'win' }
  ] },
  { seed: 79, name: 'self-draw win', actions: [
    { type: 'discard', id: 113 }, { type: 'pong' }, { type: 'discard', id: 126 }, { type: 'discard', id: 78 },
    { type: 'discard', id: 85 }, { type: 'kong' }, { type: 'discard', id: 57 }, { type: 'win' }
  ] }
];

async function replay({ seed, name, touch = false, actions }) {
  const page = await startPage(seed, touch ? { width: 390, height: 844, touch } : {});
  await setTempo(page);
  await activate(page, 'startButton', touch);
  await waitScreen(page, 'play');
  for (const action of actions) {
    await wait(page, () => window.mahjong.app.human, null, 25000);
    const { options, firstEvent } = await state(page, () => ({
      options: window.mahjong.app.human.options, firstEvent: window.mahjong.app.match.hand.events.length
    }));
    if (action.type === 'discard') {
      await activate(page, 'tile-' + action.id, touch);
      await wait(page, id => window.mahjong.app.selected === id, action.id);
      await activate(page, 'tile-' + action.id, touch);
    } else {
      await activate(page, 'action-' + action.type, touch);
      if (action.type === 'chow' && options.chows?.length > 1) {
        const choice = options.chows.findIndex(ids => ids.length === action.ids.length && ids.every(id => action.ids.includes(id)));
        if (choice < 0) throw new Error('The fixed seed did not offer the expected Chow option');
        await see(page, 'chow-choice-' + choice);
        await nativeFocus(page, 'chow', 'chow-choice-0', name + ' chooser opens on first native action');
        if (touch) {
          await activate(page, 'chow-back', true);
          await hidden(page, 'chow-choice-' + choice);
          await nativeFocus(page, 'actions', 'action-chow', name + ' back returns to Chow opener');
          await activate(page, 'action-chow', true);
        }
        await activate(page, 'chow-choice-' + choice, touch);
      }
    }
    await wait(page, ({ action, firstEvent }) => window.mahjong.app.match.hand.events.slice(firstEvent).some(event =>
      event.seat === 0 && event.type === action.type && (action.id === undefined || event.id === action.id) &&
      (!action.ids || action.ids.every(id => event.tiles?.includes(id)))), { action, firstEvent }, 26000);
  }
  if (actions.at(-1).type === 'win') {
    await waitScreen(page, 'result');
    const win = await state(page, () => window.mahjong.app.match.hand.result);
    check((win.from === null) === name.startsWith('self-draw') && await shown(page, 'nextButton'), name + ' reaches the correct settlement');
  } else {
    check(true, name + ' resolves via real ' + (touch ? 'touch input' : 'mouse input'));
  }
  if (touch) {
    await page.setViewportSize({ width: 844, height: 390 });
    await wait(page, () => window.mahjong.ready && !window.mahjong.app.tall && window.mahjong.app.game);
    check(await state(page, () => window.mahjong.app.match.hand.players[0].melds.some(meld => meld.type === 'chow')),
      'touch browser rotation preserves the active hand and chosen combination');
    await activate(page, 'pauseButton', true);
    await see(page, 'resumeButton');
    await activate(page, 'resumeButton', true);
    await hidden(page, 'resumeButton');
    check(true, 'touch controls still pause and resume after rotation');
  }
  await page.context().close();
}

try {
  await walkEastRound();
  await checkNativeRulesScroll(false);
  await checkNativeRulesScroll(true);
  for (const route of routes) await replay(route);
} catch (error) {
  check(false, 'the walk stopped: ' + error.message.split('\n')[0]);
} finally {
  const problems = pages.flatMap(page => page.problems);
  await browser.close();
  await server.close();
  report('TaiwanMahjong acceptance (headless Chromium, SwiftShader)', checks, problems);
}
