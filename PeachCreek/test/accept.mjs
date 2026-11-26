// Browser acceptance for Peach Creek. Use real pointer, touch and keyboard input for the game surface.
// Named actions in the county sheets also exercise the same semantic tree that a screen reader sees.
// Run with node test/accept.mjs. Pass --update after reviewing changes to the title and settings.
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, report, serve, until } from '../../tools/lib/browser.mjs';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = relative(ROOT, GAME).split('\\').join('/');
const server = await serve();
const browser = await launch();
const url = server.url + path + '/?seed=1&lang=zh&hour=10';
const checks = [];
const check = (ok, words) => checks.push([Boolean(ok), words]);
const state = (page, fn) => page.evaluate(fn);
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const nodes = page => state(page, () => window.peach.semantics.publish().nodes);
const ready = page => until(page, () => window.peach?.ready);
const coverage = page => page.evaluate(() => {
  const canvas = window.peach.game.canvas, rect = canvas.getBoundingClientRect();
  return Math.min(canvas.width / (rect.width * devicePixelRatio), canvas.height / (rect.height * devicePixelRatio));
});
const start = page => until(page, () => window.peach.screen === 'play');
const close = async page => {
  await page.keyboard.press('Escape');
  await settle(page);
};

async function bounds(page, name) {
  return page.evaluate(name => {
    const { ui, game } = window.peach;
    const logical = ui.rect(name);
    if (!logical?.width || !logical.height) return null;
    const surface = game.canvas.getBoundingClientRect();
    const sx = surface.width / 1280;
    const sy = surface.height / 720;
    return {
      x: surface.left + logical.x * sx, y: surface.top + logical.y * sy,
      width: logical.width * sx, height: logical.height * sy
    };
  }, name);
}

async function press(page, name, touch = false) {
  let r = await bounds(page, name);
  if (!r && !touch && await state(page, () => Boolean(window.peach.app.sheet))) {
    await scrollSheet(page, -10000);
    do {
      r = await bounds(page, name);
    } while (!r && await scrollSheet(page, 200));
  }
  if (!r) throw new Error('Missing game control: ' + name);
  const x = r.x + r.width / 2;
  const y = r.y + r.height / 2;
  await (touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
  await settle(page);
}

async function scrollSheet(page, distance) {
  const rect = await bounds(page, 'sheet-content');
  if (!rect) return false;
  const before = await state(page, () => window.peach.app.inspector.offset);
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.wheel(0, distance);
  await settle(page);
  return await state(page, () => window.peach.app.inspector.offset) !== before;
}

async function locate(page, role, name) {
  const relevant = item => item.role === role && !item.inert && name.test(item.name);
  let shown = await nodes(page);
  let item = shown.find(relevant);
  if (!item && await state(page, () => Boolean(window.peach.app.sheet))) {
    await scrollSheet(page, -10000);
    do {
      shown = await nodes(page);
      item = shown.find(relevant);
    } while (!item && await scrollSheet(page, 200));
  }
  return { item, shown };
}

async function named(page, role, name, action = 'press') {
  const { item, shown } = await locate(page, role, name);
  if (!item) throw new Error('Missing semantic ' + role + ' ' + name +
    '. Shown: ' + shown.filter(node => node.role === role && !node.inert).map(node => node.name).join(' | '));
  const same = shown.filter(other => other.role === role && other.name === item.name);
  const query = role + ': ' + item.name + (same.length > 1 ? '#' + same.findIndex(other => other.id === item.id) : '');
  await page.evaluate(async ({ query, action }) => {
    const { createUiTester } = await import('@egret/engine/ui/testing');
    createUiTester({ semantics: window.peach.semantics })[action](query);
  }, { query, action });
  await settle(page);
}

async function focusName(page) {
  return state(page, () => {
    const { game, semantics } = window.peach;
    semantics.publish();
    const descendant = game.canvas.getAttribute('aria-activedescendant');
    const projected = descendant && document.getElementById(descendant);
    return document.activeElement === game.canvas && projected?.getAttribute('aria-label');
  });
}

async function pickSlot(page, number, touch = false) {
  await press(page, 'startButton', touch);
  await press(page, 'saveSlot' + number, touch);
  await start(page);
}

async function returnToTitle(page) {
  await press(page, 'settingsButton');
  await Promise.all([page.waitForNavigation(), press(page, 'returnToTitle').catch(error => {
    if (!/Execution context was destroyed/.test(error.message)) throw error;
  })]);
  await ready(page);
  await until(page, () => window.peach.screen === 'title');
}

let page;
let phone;
try {
  page = await openPage(browser, url, { width: 1280, height: 720 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await ready(page);
  await until(page, () => window.peach.ui.rect('startButton')?.width > 0);
  check(await coverage(page) >= .999, 'title canvas has at least one backing pixel per physical screen pixel');
  const idleTitle = await state(page, async () => {
    const loop = window.peach.game.browser.loop;
    for (let attempt = 0; attempt < 15; attempt++) {
      const before = loop.snapshot();
      await new Promise(resolve => setTimeout(resolve, 200));
      const after = loop.snapshot();
      if (before.frames === after.frames && after.frames > 0 && after.steps > before.steps) return true;
    }
    return false;
  });
  check(idleTitle, 'the still title skips frame submissions while the engine clock advances');
  const title = await matchBaseline(page, GAME, 'title');
  check(title.written || title.passed, 'title looks as its baseline (' + (title.share * 100).toFixed(2) + '% differs)');
  check(/赴任/.test(await focusName(page)), 'the start button holds keyboard focus on the title');
  await page.keyboard.press('Tab');
  await settle(page);
  check(/设置/.test(await focusName(page)), 'Tab moves the game focus to settings');
  await page.keyboard.press('Shift+Tab');
  await settle(page);
  check(/赴任/.test(await focusName(page)), 'Shift+Tab returns focus to the start button');
  check(await state(page, () => getComputedStyle(window.peach.game.canvas.parentElement).backgroundColor === 'rgba(0, 0, 0, 0)'),
    'the transparent engine layer leaves the county map visible underneath');

  await press(page, 'titleSettings');
  await page.waitForTimeout(300);
  const settings = await matchBaseline(page, GAME, 'settings');
  check(settings.written || settings.passed, 'settings look as their baseline (' + (settings.share * 100).toFixed(2) + '% differs)');
  check(/音效/.test(await focusName(page)), 'settings focus starts on the sound switch');
  await page.keyboard.press('Space');
  await settle(page);
  check(await state(page, () => JSON.parse(localStorage.getItem('peach-creek-preferences'))?.data.sound === false),
    'Space on the focused switch turns the sound off and saves the shared preference');
  await close(page);
  check(/设置/.test(await focusName(page)), 'Escape closes the settings and gives the focus back');

  await press(page, 'languageButton');
  check(await state(page, () => document.documentElement.lang === 'en'), 'switching to English changes the page language');
  const names = (await nodes(page)).filter(node => node.role === 'button' && !node.inert).map(node => node.name).join('|');
  check(/Take office/i.test(names) && !/[\u3400-\u9fff]/.test(names.replace('中文', '')), 'buttons read in English: ' + names);

  await named(page, 'button', /^Take office$/, 'focus');
  await page.keyboard.press('Enter');
  await settle(page);
  const empty = (await nodes(page)).filter(node => !node.inert && /Slot \d\b.*Empty/i.test(node.name));
  check(empty.length === 3 && /Slot 1\b/.test(await focusName(page)), 'the title opens three empty save slots and focuses slot one');
  await close(page);
  check(/Take office/.test(await focusName(page)), 'Escape closes the save picker and restores focus');
  await page.keyboard.press('Enter');
  await settle(page);
  await page.keyboard.press('Enter');
  await start(page);
  const titleTextReady = await state(page, async () => {
    const ready = window.peach.ui.textReady('county');
    if (!(ready instanceof Promise)) return false;
    return Promise.race([ready.then(() => true), new Promise(resolve => setTimeout(() => resolve(false), 3000))]);
  });
  check(titleTextReady, 'the county heading settles through the native text-ready promise');
  const mapControls = (await nodes(page)).filter(node => !node.inert && node.role === 'button');
  check(mapControls.length > 20 && !mapControls.some(node => node.name === 'Take office'), 'Enter takes office and the map has its buttons');
  check(mapControls.filter(node => /\bGatehouse\b/.test(node.name)).length === 4, 'all four gatehouses have map controls');
  await until(page, () => window.peach.app.view.activity().farmer > 0, 4);
  check(await state(page, () => {
    const people = window.peach.app.view.activity();
    return people.total === 10 && people.farmer === 1 && people.resident === 9 && people.merchant === 0;
  }), 'the starting paddy brings a farmer alongside the residents');

  const beforeDrag = await state(page, () => document.querySelector('#map').style.transform);
  const mapTarget = await bounds(page, 'map-yamen-0');
  await page.mouse.move(570, 360);
  await page.mouse.down();
  await page.mouse.move(430, 290, { steps: 9 });
  await page.mouse.up();
  await settle(page);
  const movedTarget = await bounds(page, 'map-yamen-0');
  check(await page.evaluate(before => document.querySelector('#map').style.transform !== before && !window.peach.app.sheet, beforeDrag) &&
    (movedTarget.x !== mapTarget.x || movedTarget.y !== mapTarget.y), 'drag moves the map art and hit targets without opening a building sheet');
  await press(page, 'overview');
  await press(page, 'countyFocus');

  let found = false;
  for (let i = 0; i < 60 && !found; i++) {
    await page.keyboard.press('Tab');
    found = /Ward 1 2 · Empty/i.test(await focusName(page));
  }
  check(found, 'Tab reaches the first free plot in ward 1');
  await page.keyboard.press('Enter');
  await settle(page);
  check(await state(page, () => window.peach.app.sheet?.type === 'plot') &&
    /Home|House/i.test(await focusName(page)), 'Enter opens the plot sheet with the focus on the first choice');
  const namesInPlot = (await nodes(page)).filter(node => !node.inert).map(node => node.name);
  check((await nodes(page)).some(node => !node.inert && /^Market\b/.test(node.name) && !node.disabled) &&
    namesInPlot.filter(name => /Site efficiency/i.test(name)).length >= 3, 'the unplanned ward offers markets and shows site efficiency');
  await page.keyboard.press('Enter');
  await settle(page);
  check(await state(page, () => window.peach.app.state.works.some(w => w.type === 'plot' && w.key === 1)), 'Enter on the first choice starts building a house');
  await close(page);
  check(await state(page, () => !window.peach.app.sheet) && /Ward 1 2/.test(await focusName(page)), 'Escape closes the sheet and the focus returns to the plot');

  await state(page, () => window.peach.away(10 * 3600));
  await settle(page);
  const awayLines = (await nodes(page)).filter(node => !node.inert && /:awayLine\d+$/.test(node.id)).length;
  check(await state(page, () => window.peach.app.screens.modal === 'away') && awayLines >= 3,
    'coming back shows what came in (' + awayLines + ' readable lines)');
  check(await state(page, () => window.peach.app.state.plots[1].level === 1), 'the house was finished while away');
  await page.keyboard.press('Enter');
  await settle(page);
  check(await state(page, () => !window.peach.app.screens.modal), 'Enter closes the welcome');

  await press(page, 'almanac');
  const season = (await nodes(page)).filter(node => node.parent?.endsWith(':sheet-content')).map(node => node.name);
  check(season.some(name => / in \d/.test(name)) && season.some(name => /[+−-]\d+/.test(name)),
    'the almanac shows the next season and current effects (' + season.filter(name => / in \d|[+−-]\d+/.test(name)).join(', ') + ')');
  await close(page);
  check(/View almanac/.test(await focusName(page)), 'closing the almanac restores focus');

  const petition = await state(page, () => window.peach.app.state.petition.id);
  await press(page, 'petitionCall');
  const offers = await page.evaluate(async petition => {
    const { t } = await import('./src/i18n.mjs');
    const shown = window.peach.semantics.publish().nodes.filter(node => !node.inert);
    return ['a', 'b'].map(choice => {
      const label = t('p' + choice + '_' + petition);
      return { label, found: shown.some(node => node.role === 'button' && node.name.startsWith(label)),
        note: shown.some(node => node.name.startsWith(label) && node.name.length > label.length) };
    });
  }, petition);
  check(offers.length === 2 && offers.every(offer => offer.found) && offers[1].note,
    'an early petition presents two choices with visible consequences');
  await named(page, 'button', new RegExp('^' + offers[1].label.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&')));
  check(await state(page, () => window.peach.app.state.petition === null) &&
    !(await nodes(page)).some(node => !node.inert && /Petition awaits/.test(node.name)), 'resolving the petition clears the notice');
  await close(page);

  const coin = await state(page, () => window.peach.app.state.res.coin);
  await press(page, 'taxBubble');
  const after = await state(page, () => window.peach.app.state.res.coin);
  check(after > coin + 50, 'collecting the taxes fills the treasury (' + Math.round(coin) + ' → ' + Math.round(after) + ')');

  for (const tab of ['build', 'talent', 'affairs', 'defence']) {
    await press(page, 'tab-' + tab);
    check(await page.evaluate(tab => window.peach.app.sheet?.tab === tab, tab) &&
      (await nodes(page)).some(node => node.role === 'heading' && !node.inert && node.name.length > 0), 'the ' + tab + ' tab opens its sheet');
  }
  await press(page, 'tab-city');

  // A later-rank fixture reaches the garrison without waiting through the idle economy.
  await page.evaluate(() => {
    const s = window.peach.app.state;
    s.rank = 2;
    s.res.coin = 30000;
    s.res.wood = 3000;
    window.peach.tick();
  });
  await press(page, 'frontiers');
  await named(page, 'button', /^Ward 7\b/);
  await named(page, 'button', /^Open this ward\b/);
  check(await state(page, () => {
    const { districts, plots } = window.peach.app.state;
    return plots.length === 144 && districts[6].open && !districts[3].open && districts[6].zone === null;
  }), 'the west ward can be opened first and starts as mixed use');
  await close(page);
  await press(page, 'countyFocus');
  await press(page, 'map-plot-1');
  const drawings = await Promise.all(['sheet-art-0', 'sheet-art-1'].map(name => bounds(page, name)));
  const first = await page.screenshot({ clip: drawings[0] });
  const second = await page.screenshot({ clip: drawings[1] });
  check(!first.equals(second), 'upgrading a house draws distinct current and next illustrations');
  await close(page);
  await press(page, 'tab-defence');
  await press(page, 'deploy-1');
  check(await state(page, () => window.peach.app.state.defence.troops.join(',') === '0,1,0,0'), 'one squad goes to the chosen side');
  await until(page, () => window.peach.app.view.activity().guard === 1, 4);
  check(await state(page, () => window.peach.app.view.activity().guard === 1), 'deploying a squad brings a guard to the county');
  await press(page, 'gatehouse-1');
  await press(page, 'upgrade-tower-1');
  check(await state(page, () => window.peach.app.state.works.some(w => w.type === 'tower' && w.key === 1)), 'only the selected gatehouse receives an upgrade order');
  await press(page, 'tab-city');

  // A save made before docks were restricted to the waterfront can still be moved.
  await page.evaluate(() => {
    const s = window.peach.app.state;
    s.rank = 3;
    Object.assign(s.res, { coin: 120000, wood: 12000, stone: 9000 });
    s.plots[4] = { kind: 'dock', level: 2 };
    window.peach.tick();
  });
  await press(page, 'countyFocus');
  await press(page, 'map-plot-2');
  const { item: dock } = await locate(page, 'button', /^Dock\b/);
  check(dock?.disabled && /blue waterfront plot/.test(dock.name),
    'the inland plot refuses a new dock and explains where it can be placed');
  await close(page);
  await press(page, 'frontiers');
  await named(page, 'button', /^Ward 4\b/);
  await named(page, 'button', /^Open this ward\b/);
  await press(page, 'tab-build');
  await named(page, 'button', /^Find waterfront plots\b/);
  await named(page, 'button', /^View river ward\b/);
  await named(page, 'button', /^Open this ward\b/);
  await press(page, 'tab-city');
  await press(page, 'countyFocus');
  await press(page, 'map-plot-4');
  await named(page, 'button', /^Relocate the old dock\b/);
  await named(page, 'button', /^Waterfront plot 1\b/);
  check(await state(page, () => {
    const { plots, districts } = window.peach.app.state;
    return districts[10].open && !plots[4].kind && plots[120].kind === 'dock' && plots[120].level === 2;
  }), 'a legacy dock can move to a real waterfront lot and retains its level');
  await press(page, 'tab-build');
  await named(page, 'button', /^Find waterfront plots\b/);
  await named(page, 'button', /^Waterfront plot 2\b/);
  await named(page, 'button', /^Dock\b/);
  check(await state(page, () => window.peach.app.state.works.some(w => w.type === 'plot' && w.key === 121)), 'new dock construction starts at the waterfront');
  await press(page, 'tab-city');

  const before = await state(page, () => JSON.stringify(window.peach.app.state.plots));
  await page.evaluate(() => dispatchEvent(new Event('pagehide')));
  await page.reload();
  await ready(page);
  check((await nodes(page)).some(node => node.role === 'button' && /Back to Peach Creek|回到桃溪/.test(node.name)), 'after a reload the title offers to go back');
  await pickSlot(page, 1);
  check(await state(page, () => JSON.stringify(window.peach.app.state.plots)) === before, 'the county is the one left behind');
  check(await state(page, () => window.peach.app.state.defence.troops[1] === 1), 'the garrison layout survives reload');
  check(await state(page, () => window.peach.app.state.districts[6].open && window.peach.app.state.districts[10].open), 'the player-selected expansion survives reload');

  await returnToTitle(page);
  await pickSlot(page, 2);
  check(await state(page, () => window.peach.app.slot === 1 && window.peach.app.state.rank === 0 &&
    !window.peach.app.state.districts[6].open), 'slot two starts a separate county');
  await press(page, 'frontiers');
  await named(page, 'button', /^Ward 9\b|^第9坊/);
  await named(page, 'button', /^Open this ward\b|^开垦此坊/);
  await close(page);
  await returnToTitle(page);
  await pickSlot(page, 3);
  check(await state(page, () => window.peach.app.slot === 2 && !window.peach.app.state.districts[8].open &&
    JSON.parse(localStorage.getItem('peach-creek-slot-2')).data.county.districts[8].open),
    'slot three starts fresh and switching keeps the second county’s expansion');
  await returnToTitle(page);
  await pickSlot(page, 1);
  check(await state(page, () => window.peach.app.state.districts[10].open &&
    !window.peach.app.state.districts[8].open && JSON.parse(localStorage.getItem('peach-creek-slot-3')).data.county.rank === 0),
    'slot one retains its own county and slot three was saved');

  await page.addInitScript(() => localStorage.setItem('peach-creek', '{broken'));
  await page.goto(url);
  await ready(page);
  const notice = (await nodes(page)).some(node => /存档.*(?:损坏|无法)|save.*(?:unreadable|damaged|could not be read)/i.test(node.name));
  await press(page, 'startButton');
  const slots = (await nodes(page)).filter(node => !node.inert && node.role === 'button' && /^(?:Slot \d|存档 \d)/.test(node.name));
  check(notice && slots.length === 3 && /Empty|空白/.test(slots[0].name) &&
    slots.slice(1).every(node => !/Empty|空白/.test(node.name)) && await state(page, () => window.peach.app.state === null),
    'a corrupt first slot leaves the other two counties intact');

  phone = await openPage(browser, url, { width: 411, height: 813, touch: true, scale: 3 });
  await ready(phone);
  const titleRect = await bounds(phone, 'startButton');
  const portraitFits = await phone.evaluate(rect => {
    const { game } = window.peach;
    const canvas = game.canvas.getBoundingClientRect();
    return Math.abs(canvas.width - innerWidth) < 1 && scrollY === 0 &&
      document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === game.canvas;
  }, titleRect);
  check(portraitFits, 'a narrow portrait viewport retains its full frame and a tappable title');
  check(await coverage(phone) >= .999, '3x portrait keeps the UI backing at physical resolution');
  await pickSlot(phone, 2, true);
  await phone.setViewportSize({ width: 844, height: 390 });
  await until(phone, () => matchMedia('(orientation: landscape)').matches, 4);
  check(await state(phone, () => window.peach.app.state.plots.length === 144), 'landscape resize keeps the county open');
  // Real phone rotation can change the usable viewport thanks to browser chrome. The logical surface is fixed.
  check(await coverage(phone) >= .999, '3x landscape keeps physical UI resolution after rotation');
} catch (error) {
  check(false, 'the walk stopped: ' + error.message.split('\n')[0]);
} finally {
  const problems = [...(page?.problems ?? []), ...(phone?.problems ?? [])];
  await browser.close();
  await server.close();
  report('Peach Creek (headless Chromium, SwiftShader)', checks, problems);
}
