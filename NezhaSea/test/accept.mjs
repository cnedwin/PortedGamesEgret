// Browser acceptance for the keyboard, engine semantics and touch controls.
// Use fixed encounter fixtures for rule transitions and real browser input for device behavior.
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, report, serve, until as waitFor } from '../../tools/lib/browser.mjs';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const path = relative(ROOT, GAME).split('\\').join('/');
const server = await serve();
const browser = await launch();
const checks = [], pages = [];
const check = (ok, words) => checks.push([Boolean(ok), words]);
const gameUrl = (lang) => server.url + path + '/?seed=11&lang=' + lang;
let page;
const state = (read, argument) => page.evaluate(read, argument);
const until = (page, predicate, seconds = 16) => waitFor(page, predicate, seconds);
const waitScreen = (screen, seconds = 20) => page.waitForFunction((wanted) => window.nezhaSea?.screen === wanted, screen, {
  timeout: seconds * 1000,
  polling: 100
});
const nodes = () => state(() => window.nezhaSea.ui.tree.snapshot.nodes);
const byPart = async (part) => (await nodes()).find((node) => node.id.endsWith(':' + part) && !node.inert);
const waitPart = (part) => page.waitForFunction((part) => window.nezhaSea.ui.tree.snapshot.nodes.some(
  (node) => !node.inert && node.id.endsWith(':' + part)
), part, { timeout: 8000, polling: 50 });
const wordsOf = async (part) => (await byPart(part))?.name.replace(/\s+/g, ' ') ?? '';
const focus = () => state(() => {
  const { ui } = window.nezhaSea;
  return { name: ui.name, part: ui.part };
});

async function tabTo(part, backwards = false) {
  for (let i = 0; i < 48; i++) {
    if ((await focus()).part === part) return true;
    await page.keyboard.press(backwards ? 'Shift+Tab' : 'Tab');
  }
  return false;
}

const press = (name) => state((name) => window.nezhaSea.tester.press(name), name);
async function pressPart(part) {
  const control = await byPart(part);
  if (!control) throw new Error('A visible control is missing: ' + part);
  return press(control.role + ':' + control.name);
}

async function pointOf(part) {
  return state((part) => {
    const { game, ui } = window.nezhaSea;
    const node = ui.tree.snapshot.nodes.find((item) => !item.inert && item.id.endsWith(':' + part));
    if (!node) throw new Error('No visible part ' + part);
    const r = game.canvas.getBoundingClientRect();
    return {
      x: r.left + (node.bounds.x + node.bounds.width / 2) * r.width / game.screen.width,
      y: r.top + (node.bounds.y + node.bounds.height / 2) * r.height / game.screen.height
    };
  }, part);
}

async function takeBaseline(name) {
  const result = await matchBaseline(page, GAME, name);
  check(result.written || result.passed, name + ' matches its approved screenshot (' + (result.share * 100).toFixed(2) + '% differs)');
}

function newPage(lang, options) {
  return openPage(browser, gameUrl(lang), options).then((opened) => {
    pages.push(opened);
    return opened;
  });
}

const setWeapons = (pairs) => state((pairs) => {
  const { app, refresh } = window.nezhaSea;
  app.picked = null;
  app.run.weapons = pairs.map(([kind, tier]) => ({ kind, tier, divine: false, cooldown: 0, angle: 0, also: 0 }));
  refresh();
}, pairs);
const finishWaveSoon = () => state(() => {
  const { run } = window.nezhaSea.app;
  run.waveLeft = Math.min(run.waveLeft, 2);
  run.pending = Math.max(run.pending, 1);
});
const chooseUpgrades = async () => {
  for (let repeat = 0; repeat < 8 && (await state(() => window.nezhaSea.screen)) === 'levelUp'; repeat++) {
    await page.keyboard.press('1');
    await page.waitForTimeout(100);
  }
};

try {
  page = await newPage('zh', { width: 540, height: 960 });
  await until(page, () => window.nezhaSea?.ready && window.nezhaSea.screen === 'title');
  await page.waitForTimeout(450);
  await takeBaseline('title');
  check((await focus()).part === 'start', 'the title opens on Set out');

  check(await tabTo('danger1'), 'Tab reaches the second danger');
  await page.keyboard.press('Enter');
  await until(page, () => window.nezhaSea.app.danger === 1);
  const danger = await focus();
  check(danger.part === 'danger1' && /^浪急/.test(danger.name), 'Enter chooses the danger and the native focus remains on it');

  await state(() => {
    const outside = document.createElement('button');
    outside.id = 'outside-game';
    outside.textContent = 'Outside game';
    document.body.append(outside);
  });
  check(await tabTo('danger2'), 'Tab reaches the last title control');
  await page.keyboard.press('Tab');
  check(await state(() => document.activeElement.id === 'outside-game'), 'Tab leaves an embedded nonmodal canvas after its last control');
  await state(() => {
    document.querySelector('#outside-game').remove();
    const { game, ui } = window.nezhaSea;
    game.canvas.focus();
    const danger = ui.tree.snapshot.nodes.find(node => node.id.endsWith(':danger1'));
    ui.tree.perform(danger.id, 'focus');
  });

  check(await tabTo('options', true), 'Shift+Tab reaches Settings');
  await page.keyboard.press('Enter');
  await waitScreen('options');
  check(await tabTo('sound'), 'Tab reaches the sound switch');
  await page.keyboard.press('Space');
  await until(page, () => window.nezhaSea.app.save.data.settings.sound === false);
  check(true, 'Space turns off the sound and keeps the setting');
  await page.keyboard.press('Space');
  await until(page, () => window.nezhaSea.app.save.data.settings.sound === true);
  check(await tabTo('language'), 'Tab reaches the language switch');
  await page.keyboard.press('Enter');
  await until(page, () => document.documentElement.lang === 'en');
  await page.keyboard.press('Escape');
  await waitScreen('title');
  const names = (await nodes()).filter((item) => !item.inert && item.role === 'button').map((item) => item.name).join('|');
  check(!/[\u3400-\u9fff]/.test(names.replaceAll('中文', '')) && /Set out/.test(names), 'English title action names are fully localized');

  await press('button:How to play');
  await waitScreen('guide');
  check((await byPart('how1')) !== undefined, 'semantic How to play opens the localized guide');
  await pressPart('close');
  await waitScreen('title');

  check(await tabTo('start', true), 'Shift+Tab goes back to Set out');
  await page.keyboard.press('Enter');
  await waitScreen('play');
  await until(page, () => window.nezhaSea.hud.hints.some((hint) => /WASD/.test(hint)));
  const keyboardHints = await state(() => window.nezhaSea.hud.hints);
  check(keyboardHints.some((hint) => /WASD/.test(hint)), 'battle hints show keyboard prompts');
  await state(() => { window.nezhaSea.app.run.player.hp = 1e6; });
  const x0 = await state(() => window.nezhaSea.app.run.player.x);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyD');
  const x1 = await state(() => window.nezhaSea.app.run.player.x);
  check(x1 > x0 + 60, 'D moves Nezha right (' + x0.toFixed() + ' to ' + x1.toFixed() + ')');
  const pointerOrigin = await state(() => {
    const bounds = window.nezhaSea.game.canvas.getBoundingClientRect();
    return { x: bounds.left + bounds.width * 0.35, y: bounds.top + bounds.height * 0.6 };
  });
  await page.mouse.move(pointerOrigin.x, pointerOrigin.y);
  await page.mouse.down();
  await page.mouse.move(pointerOrigin.x + 48, pointerOrigin.y);
  check(await state(() => window.nezhaSea.stick.active && window.nezhaSea.stick.vector.x > 0.4),
    'desktop mouse dragging retains the existing battlefield steering');
  await page.mouse.up();
  check(await state(() => !window.nezhaSea.stick.active), 'releasing the mouse clears its steering');
  await page.keyboard.press('p');
  await waitScreen('menu');
  const t0 = await state(() => window.nezhaSea.app.run.time);
  await page.waitForTimeout(500);
  check(await state((time) => window.nezhaSea.game.paused && window.nezhaSea.app.run.time === time, t0), 'P pauses the battle simulation');
  await page.keyboard.press('Escape');
  await waitScreen('play');
  check(await state(() => !window.nezhaSea.game.paused), 'Escape resumes play');

  await finishWaveSoon();
  await waitScreen('levelUp', 30);
  check(/Level up/i.test((await byPart('upgradeTitle'))?.name), 'the first wave ends in a level-up');
  await chooseUpgrades();
  await waitScreen('shop');
  check(/Dragon Palace Market/.test((await byPart('marketTitle'))?.name), 'digit 1 selects an upgrade and the market opens');

  await state(() => {
    const { app, refresh } = window.nezhaSea;
    app.run.pearls = 0;
    refresh();
  });
  const unaffordable = await byPart('offerBuy0');
  check(unaffordable?.disabled, 'an unaffordable purchase is exposed as disabled');
  const disabledBefore = await state(() => window.nezhaSea.app.run.weapons.length);
  const refusal = await state((name) => {
    try {
      window.nezhaSea.tester.press('button:' + name);
      return false;
    } catch (error) {
      return /UI_TESTER_REFUSED/.test(String(error));
    }
  }, unaffordable?.name);
  const buyPoint = await pointOf('offerBuy0');
  await page.mouse.click(buyPoint.x, buyPoint.y);
  check(refusal && await state((count) => {
    const run = window.nezhaSea.app.run;
    return run.weapons.length === count && run.pearls === 0 && !run.shop.offers[0].sold;
  }, disabledBefore), 'an unaffordable offer refuses semantic and pointer activation');

  await state(() => { window.nezhaSea.app.run.pearls = 999; window.nezhaSea.refresh(); });
  check(await tabTo('offerBuy0'), 'Tab reaches a purchase');
  await page.keyboard.press('Enter');
  await until(page, () => window.nezhaSea.app.run.shop.offers[0].sold);
  check(await state(() => window.nezhaSea.app.run.pearls < 999), 'Enter buys the offer for pearls');

  const lockId = (await byPart('offerLock1'))?.id;
  if (lockId) {
    const locked = await state(() => window.nezhaSea.app.run.shop.offers[1].locked);
    await pressPart('offerLock1');
    check(await state((previous) => window.nezhaSea.app.run.shop.offers[1].locked !== previous, locked), 'a market offer can be locked');
    const before = await state(() => window.nezhaSea.app.run.pearls);
    await pressPart('reroll');
    check(await state((pearls) => window.nezhaSea.app.run.pearls < pearls && window.nezhaSea.app.run.shop.offers[1].locked, before), 'refresh costs pearls and preserves the locked offer');
  } else check(false, 'the market has a lock control for the second offer');

  if (await byPart('gearTab')) await pressPart('gearTab');
  await setWeapons([['ring', 0], ['ring', 0], ['ring', 2], ['ribbon', 2]]);
  check(await tabTo('relic0'), 'Tab reaches a treasure');
  await page.keyboard.press('Enter');
  check(/Merge into Universe Ring · Tier 2/.test((await byPart('relic1'))?.name), 'the matching treasure exposes its merge preview');
  check(await tabTo('relic1'), 'Tab reaches the matching treasure');
  await page.keyboard.press('Enter');
  await until(page, () => window.nezhaSea.app.run.weapons.length === 3);
  check(await state(() => window.nezhaSea.app.run.weapons.some((w) => w.kind === 'ring' && w.tier === 1)), 'two Tier 1 treasures merge into Tier 2');

  check(await tabTo('relic1'), 'Tab reaches the third-tier ring');
  await page.keyboard.press('Enter');
  check(/Merge into Dragon-Binding Ring/.test((await byPart('relic2'))?.name), 'the third-tier ribbon offers the divine merge');
  check(await tabTo('relic2'), 'Tab reaches the third-tier ribbon');
  await page.keyboard.press('Enter');
  await until(page, () => window.nezhaSea.app.run.divines === 1);
  check(await state(() => window.nezhaSea.app.run.weapons.some((w) => w.divine && w.kind === 'bindDragon')), 'Ring and Ribbon make the Dragon-Binding Ring');

  await setWeapons([['ring', 0], ['ring', 0], ['ribbon', 0]]);
  const a = await pointOf('relic0'), b = await pointOf('relic1');
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.up();
  await until(page, () => window.nezhaSea.app.run.weapons.length === 2);
  check(await state(() => window.nezhaSea.app.run.weapons[0].tier === 1), 'dragging a relic to its matching relic also merges them');

  await pressPart('relic1');
  await pressPart('sell');
  await until(page, () => window.nezhaSea.ui.tree.snapshot.nodes.some((n) => !n.inert && n.role === 'button' && /^Sell \d+/.test(n.name)));
  await page.keyboard.press('Escape');
  await until(page, () => !window.nezhaSea.ui.tree.snapshot.nodes.some((n) => !n.inert && n.role === 'button' && /^Sell \d+/.test(n.name)));
  check(await state(() => window.nezhaSea.app.run.weapons.length === 2), 'Escape cancels the sale without changing the loadout');
  if (!await byPart('sell')) await pressPart('relic1');
  await pressPart('sell');
  await until(page, () => window.nezhaSea.ui.tree.snapshot.nodes.some((n) => !n.inert && n.role === 'button' && /^Sell \d+/.test(n.name)));
  const sale = (await nodes()).find((n) => !n.inert && n.role === 'button' && /^Sell \d+/.test(n.name));
  const namedBefore = await state(() => window.nezhaSea.app.run.pearls);
  await press('button:' + sale.name);
  await until(page, () => window.nezhaSea.app.run.weapons.length === 1);
  check(await state((pearls) => window.nezhaSea.app.run.pearls > pearls, namedBefore), 'the confirmation button sells the selected treasure and awards pearls');

  check(await tabTo('next', true), 'Shift+Tab reaches Next wave');
  await page.keyboard.press('Enter');
  await until(page, () => window.nezhaSea.screen === 'play' && window.nezhaSea.app.run.wave === 2);
  check(true, 'Enter sets out for wave 2');

  await state(() => {
    const run = window.nezhaSea.app.run;
    run.player.hp = 0.5;
    run.player.guard = 0;
    run.weapons = [];
  });
  await waitScreen('end', 60);
  await waitPart('again');
  await page.waitForTimeout(250);
  check(/Nezha falls back/.test(await wordsOf('resultHeading')), 'defeat opens the end result');
  const saved = await state(() => JSON.parse(localStorage.getItem('nezha-sea')).data);
  check(saved.best.boy?.[1] === 2 && saved.plays === 1, 'the furthest wave and one play were saved');
  await takeBaseline('end');
  check((await focus()).part === 'again', 'the end offers another game first');
  await page.keyboard.press('Enter');
  await until(page, () => window.nezhaSea.screen === 'play' && window.nezhaSea.app.run.wave === 1);
  check(true, 'Enter sets out again');

  await state(() => {
    const run = window.nezhaSea.app.run;
    run.wave = 10;
    run.waveLeft = 45;
    run.time = 3;
  });
  await until(page, () => window.nezhaSea.ui.tree.snapshot.nodes.some((n) => n.id.endsWith(':bossAlertText')));
  const announcement = await byPart('bossAlertText'), meter = await byPart('boss');
  check(/sea yaksha/i.test(announcement?.name) && announcement.bounds.y >= meter.bounds.y + meter.bounds.height,
    'the boss introduction is visible below its health bar');
  await until(page, () => !window.nezhaSea.ui.tree.snapshot.nodes.some((n) => n.id.endsWith(':bossAlertText')));
  check(true, 'the boss introduction clears after the opening');

  await state(() => {
    const run = window.nezhaSea.app.run;
    run.player.hp = 1e6;
    run.wave = 20;
    run.bossCalled = true;
    run.boss = null;
    run.enemies = [];
  });
  await waitScreen('end', 30);
  await waitPart('title');
  check(/Chentang Pass held/.test(await wordsOf('resultHeading'))
    && /Unlocked: Lotus Body/.test(await wordsOf('unlocked_lotus'))
    && /Unlocked: Three Heads, Six Arms/.test(await wordsOf('unlocked_sixArms')),
  'holding all twenty waves unlocks both other forms');
  await pressPart('title');
  await waitScreen('title');
  check((await nodes()).filter((n) => /:hero_(boy|lotus|sixArms)$/.test(n.id)).filter((n) => !n.disabled).length === 3, 'the title opens every form');

  await state(() => localStorage.setItem('nezha-sea', '{broken'));
  await page.reload();
  await until(page, () => window.nezhaSea?.ready && window.nezhaSea.screen === 'title');
  check(Boolean((await byPart('saveNotice'))?.name), 'a broken save opens a fresh title and reports it');
  await page.context().close();

  page = await newPage('en', { width: 390, height: 844, touch: true });
  await until(page, () => window.nezhaSea?.ready && window.nezhaSea.screen === 'title');
  const start = await pointOf('start');
  await page.touchscreen.tap(start.x, start.y);
  await waitScreen('play');
  await until(page, () => window.nezhaSea.game.device === 'touch' && window.nezhaSea.hud.hints.length > 0);
  const touchHints = await state(() => window.nezhaSea.hud.hints);
  check(touchHints.join('|') !== keyboardHints.join('|') && !touchHints.some((line) => /WASD/.test(line)), 'browser touch input selects touch-specific battle hints');

  const cdp = await page.context().newCDPSession(page);
  const contact = { id: 1, x: 285, y: 440 };
  const secondary = { id: 2, x: 220, y: 550 };
  const outside = { ...contact, x: 430 };
  const touch = async (type, ...touchPoints) => {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
    await state(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  };
  const axes = () => state(() => {
    const { active, vector } = window.nezhaSea.stick;
    return { active, x: vector.x, y: vector.y, scroll: scrollX + scrollY };
  });
  await touch('touchStart', contact);
  const held = await axes();
  check(held.active && held.x === 0 && held.y === 0, 'the native floating stick starts at an arbitrary battlefield point');
  await touch('touchMove', { ...contact, x: contact.x + 4 });
  check(Math.abs((await axes()).x) < 0.001, 'native touch steering preserves the five CSS pixel dead zone');
  const nudged = { ...contact, x: contact.x + 18 };
  await touch('touchMove', nudged);
  const gentle = await axes();
  check(gentle.x > 0.18 && gentle.x < 0.4, 'native touch steering preserves proportional movement before full reach');
  await touch('touchStart', nudged, secondary);
  await touch('touchMove', outside, { ...secondary, y: 650 });
  const steered = await axes();
  check(steered.active && steered.x > 0.95 && steered.scroll === 0, 'the first touch steers outside the field, even with a second touch and no page movement');
  await touch('touchEnd', outside);
  const released = await axes();
  check(!released.active && released.x === 0 && released.y === 0, 'releasing the owner stops movement without handing it to the second touch');
  await touch('touchEnd');
  await touch('touchStart', contact);
  await touch('touchMove', outside);
  await touch('touchCancel');
  check(!(await axes()).active && (await axes()).x === 0, 'cancel resets the floating stick');

  await touch('touchStart', contact);
  await touch('touchMove', outside);
  await pressPart('pause');
  await waitScreen('menu');
  check(!(await axes()).active && (await axes()).x === 0, 'pause clears the held touch');
  await pressPart('resume');
  await waitScreen('play');
  await touch('touchMove', { ...outside, y: 460 });
  check(!(await axes()).active, 'resuming does not reactivate an old touch');
  await touch('touchEnd');

  await finishWaveSoon();
  await waitScreen('levelUp');
  for (let i = 0; i < 8 && await state(() => window.nezhaSea.screen === 'levelUp'); i++) await pressPart('upgrade0');
  await waitScreen('shop');
  check(Boolean(await byPart('offerBuy0')) && !await byPart('relic0'), 'the narrow market opens to Offers');
  const nextOnOffers = await pointOf('next');
  await pressPart('gearTab');
  check(Boolean(await byPart('relic0')) && !await byPart('offerBuy0'), 'Gear shows the equipped treasures instead of offers');
  const nextOnGear = await pointOf('next');
  check(Math.abs(nextOnOffers.x - nextOnGear.x) < 1 && Math.abs(nextOnOffers.y - nextOnGear.y) < 1, 'Next wave stays fixed when switching pages');
  await pressPart('offersTab');
  check(Boolean(await byPart('offerBuy0')), 'the Offers tab returns to the shop stock');
  await page.context().close();

  // Standard-mapped browser samples exercise the paused and idle input paths.
  page = await newPage('en', {
    width: 1280, height: 800,
    before: (page) => page.addInitScript(() => {
      const pad = {
        index: 0, id: 'Acceptance standard pad', mapping: 'standard', connected: true, axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }))
      };
      window.acceptancePad = pad;
      Object.defineProperty(navigator, 'getGamepads', { value: () => [pad] });
    })
  });
  const padButton = (index, pressed) => state(([index, pressed]) => {
    Object.assign(window.acceptancePad.buttons[index], { pressed, value: Number(pressed) });
  }, [index, pressed]);
  await until(page, () => window.nezhaSea?.ready && window.nezhaSea.screen === 'title');
  await page.waitForTimeout(1200);
  const beforeIdle = await state(() => window.nezhaSea.game.browser.loop.snapshot());
  await page.waitForTimeout(300);
  const afterIdle = await state(() => window.nezhaSea.game.browser.loop.snapshot());
  check(afterIdle.steps > beforeIdle.steps && afterIdle.frames === beforeIdle.frames, 'native on-demand mode polls input without submitting the settled title again');
  await padButton(0, true);
  await waitScreen('play');
  await padButton(0, false);
  check(true, 'the first simulated pad A wakes the idle title and starts the game');
  const firstPadX = await state(() => window.nezhaSea.app.run.player.x);
  await state(() => { window.acceptancePad.axes[0] = 0.91; });
  await page.waitForFunction((x) => window.nezhaSea.app.run.player.x > x + 18, firstPadX);
  await state(() => { window.acceptancePad.axes[0] = 0; });
  check(true, 'the simulated analogue stick moves Nezha');
  await padButton(9, true);
  await waitScreen('menu');
  await padButton(9, false);
  const waitFocus = (part) => page.waitForFunction(part => window.nezhaSea.ui.part === part, part);
  await waitFocus('resume');
  await padButton(13, true);
  await waitFocus('quit');
  await padButton(13, false);
  await padButton(1, true);
  await waitScreen('play');
  await padButton(1, false);
  check(true, 'native gamepad focus moves in the paused menu and B resumes play');
  await padButton(9, true);
  await waitScreen('menu');
  await padButton(9, false);
  await page.waitForTimeout(100);
  await padButton(9, true);
  await waitScreen('play');
  await page.waitForTimeout(120);
  check(await state(() => window.nezhaSea.screen === 'play' && !window.nezhaSea.game.paused), 'holding Start through resume does not open pause again');
  await padButton(9, false);
  await page.context().close();

  page = await newPage('en', {
    width: 390,
    height: 844,
    touch: true,
    before: (page) => page.addInitScript(() => {
      const openContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, options) {
        if (kind === '2d' && options?.willReadFrequently && this.width === 1024
          && !this.isConnected && !sessionStorage.getItem('atlas-fixture-failed')) {
          sessionStorage.setItem('atlas-fixture-failed', '1');
          return null;
        }
        return openContext.apply(this, arguments);
      };
    })
  });
  await waitScreen('error');
  const failed = await state(() => !window.nezhaSea.ready && Boolean(window.nezhaSea.game));
  check(failed && Boolean(await byPart('reload')), 'an atlas creation failure shows an engine error screen with a named reload button');
  await pressPart('reload');
  await until(page, () => window.nezhaSea?.ready && window.nezhaSea.screen === 'title');
  check(true, 'the error screen can reload to a playable title');

  let refusePortraits = true;
  let refused = 0, allowed = 0;
  page = await newPage('en', {
    width: 390,
    height: 844,
    touch: true,
    before: (page) => page.route(/\/assets\/(boy|lotus|sixArms)\.webp(?:\?|$)/, (route) => {
      if (refusePortraits) {
        refused++;
        return route.abort('failed');
      }
      allowed++;
      return route.continue();
    })
  });
  await until(page, () => window.nezhaSea?.ready && window.nezhaSea.screen === 'title');
  await waitPart('artworkRetry');
  check(refused === 3 && Boolean(await byPart('start')), 'portrait network failures leave the game playable and offer an artwork retry');
  refusePortraits = false;
  await pressPart('artworkRetry');
  await until(page, () => window.nezhaSea?.ready && window.nezhaSea.screen === 'title' &&
    !window.nezhaSea.ui.tree.snapshot.nodes.some(node => node.id.endsWith(':artworkRetry')));
  check(allowed === 3, 'retry requests all three previously refused portraits and restores the ordinary title');
  // Chromium reports each route we deliberately aborted as a network console error.
  // Keep every unexpected error in the regular acceptance report.
  const refusedErrors = page.problems.filter(problem => /^console: Failed to load resource: net::ERR_FAILED$/.test(problem));
  check(refusedErrors.length <= refused, 'only the deliberately aborted requests may report a network failure');
  for (const problem of refusedErrors) page.problems.splice(page.problems.indexOf(problem), 1);

} catch (error) {
  const location = error.stack?.match(/accept\.mjs:\d+/)?.[0];
  check(false, 'the walk stopped: ' + error.message.split('\n')[0] + (location ? ' (' + location + ')' : ''));
} finally {
  const problems = pages.flatMap((opened) => opened.problems);
  await browser.close();
  await server.close();
  report('NezhaSea acceptance (headless Chromium, SwiftShader)', checks, problems);
}
