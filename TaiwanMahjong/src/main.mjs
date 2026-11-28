// Gameplay orchestration, the unrotated canvas host and table state.
import { play } from '@egret/engine/play';
import { planScreen } from '@egret/engine/web/screen';
import { TABLET_SHORT_SIDE } from '@egret/engine/web/view';
import { browserSaveStorage } from '@egret/engine/web/kit';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { bridgeUiSemantics, createUi } from './ui.mjs';
import { createScreens } from './screens.mjs';
import { createRoundUi } from './round-ui.mjs';
import { createFelt } from './felt.mjs';
import { createHud } from './hud.mjs';
import { getLanguage, onLanguage, setLanguage, startLanguage, t, tileName } from './i18n.mjs';
import { boardLayout, displayPixelRatio, handCentre, handSlots, meldTiles, riverSlot, STAGE, PORTRAIT } from './layout.mjs';
import { LEVEL_NAMES, openSave, recordGame, recordHand } from './saves.mjs';
import { createSound } from './sound.mjs';
import { CHARACTERS, decide } from './sim/bot.mjs';
import { act, chowsFor, createMatch, kindOf, liveLeft, needOf, optionsFor, RULES, seenBy, startHand, waiting } from './sim/game.mjs';
import { countsOf, waitsOf } from './sim/hand.mjs';
import { TAI } from './sim/score.mjs';
import { CELL, paintAtlas } from './tiles.mjs';
import { createView } from './view.mjs';

const params = new URLSearchParams(location.search);
const $ = (selector, root = document) => root.querySelector(selector);

// The save and the language.
const problems = [];
const save = openSave(browserSaveStorage(), startLanguage(navigator.languages ?? [navigator.language]), (problem) => problems.push(problem.kind));
setLanguage(params.get('lang') ?? save.data.settings.language);

/** Who sits where: seat 0 is the player; the others have a character each. */
const SEATS = [
  { key: 'you', seal: 'sealYou' },
  { key: 'steady', seal: 'sealSteady', character: 'steady' },
  { key: 'grand', seal: 'sealGrand', character: 'grand' },
  { key: 'eager', seal: 'sealEager', character: 'eager' }
];
const nameOf = (seat) => t(SEATS[seat].key);
const WORD_AT = [
  { x: 690, y: 520 },
  { x: 800, y: 330 },
  { x: 590, y: 200 },
  { x: 480, y: 390 }
];

const app = {
  game: null,
  save,
  sound: createSound({
    ...save.data.settings,
    onSpeakerChanged(seat) {
      app.hud?.speaker(seat);
    }
  }),
  felt: null,
  view: null,
  board: null,
  match: null,
  screen: 'loading',
  selected: null,
  autoplay: false,
  human: null,
  seed: Number(params.get('seed') ?? Date.now() % 100000),
  last: null,
  asidePlayed: false,
  hidden: new Set(),
  reveal: false,
  quitting: false
};

// The engine owns fit, orientation and safe areas. Only the table's own nodes turn on a narrow portrait phone.
function arrange(game) {
  const screen = game.browser.screen;
  const tablet = Math.min(screen.width, screen.height) * screen.scale >= TABLET_SHORT_SIDE;
  app.board = boardLayout({ safe: game.safe, orientation: game.orientation, screenScale: screen.scale, tablet });
  app.view?.arrange(app.board);
  app.felt?.arrange(game, app.board);
  app.hud?.arrange(app.board);
  app.ui?.arrange();
  if (app.match?.hand && app.screen !== 'title' && app.view) paintHand(false);
  if (app.semantics) syncProjection(game);
}

function syncProjection(game) {
  const { width, height } = game.browser.frame;
  // The browser semantics adapter accepts fixed stage dimensions (ENGINE-NOTES). Keep the tree and focus;
  // only reconnect its browser projection when the engine's expanded frame changes size.
  const key = `${width}x${height}`;
  if (app.projectionSize !== key) {
    const focused = document.activeElement === game.canvas;
    app.projection?.dispose();
    app.projection = createBrowserSemantics({ semantics: app.semantics, canvas: game.canvas, width, height, label: t('title') });
    app.projectionSize = key;
    if (focused) game.canvas.focus({ preventScroll: true });
  }
  app.projection?.sync();
}

async function startEngine(atlas) {
  const host = $('#stage'), box = host.getBoundingClientRect();
  const initial = planScreen({ box, design: STAGE, portrait: PORTRAIT, fit: 'expand' });
  const semantics = createUiSemantics({ maxNodes: 1024 }), bridge = bridgeUiSemantics(semantics);
  const game = await play({
    ...STAGE, portrait: PORTRAIT, fit: 'expand',
    pixelRatio: displayPixelRatio(initial.scale, window.devicePixelRatio, Math.min(box.width, box.height) < TABLET_SHORT_SIDE),
    parent: host, transparent: true, seed: app.seed, semantics: bridge, audio: typeof globalThis.AudioContext === 'function',
    renderMode: 'on-demand', arrange, onError: console.error
  });
  const lease = await game.browser.textureFromCanvas(atlas);
  game.reducedMotion = save.data.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  app.game = game;
  app.semantics = semantics;
  app.view = createView(game, lease);
  app.hud = createHud(game, lease, { nameOf, signed, semantics, sealOf: seat => t(SEATS[seat].seal) });
  app.sound.attach(game);
  app.ui = createUi(game, bridge, { board: () => app.board });
  app.round = createRoundUi(game, app.ui, lease, { nameOf, signed, sealOf: seat => t(SEATS[seat].seal) });
  app.screens = createScreens(game, app.ui, {
    save, problems, nameOf, seats: SEATS, levelNames: LEVEL_NAMES, rules: RULES, tai: TAI,
    start: () => beginGame(), setSetting, switchLanguage, resume, quit,
    playUi: () => app.sound.play('ui')
  });
  arrange(game);
}

// ——— Delays that stop while paused ———
const pace = () => (save.data.settings.pace === 'brisk' ? 0.55 : 1);
/** Wait, standing still while paused; `app.speed` (1 unless a test asks) runs it faster. */
async function wait(seconds) {
  let left = seconds * pace() * 1000;
  while (left > 0) {
    await new Promise((resolve) => setTimeout(resolve, Math.min(40, left)));
    if (!pauseGate) left -= 40 * (app.speed ?? 1);
  }
}
let pauseGate = null;
async function gate() {
  while (pauseGate) await pauseGate.promise;
}

// ——— Painting the table ———
function paintTable() {
  const match = app.match,
    hand = match?.hand;
  app.felt?.paint({ hand, turn: hand && !hand.result ? hand.turn : -1, reveal: app.reveal, hidden: app.hidden, last: app.last, winner: hand?.result?.seat ?? -1 });
  if (!hand) return;
  const windOf = (seat) => (seat - hand.dealer + 4) % 4;
  app.hud?.paint({ hand, match, windOf });
  paintHand();
}

const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toLocaleString('en-US');

/** The player's tiles in order: sorted, with a tile just drawn apart at the end. */
function myTiles() {
  const hand = app.match.hand,
    mine = hand.players[0].hand,
    apart = hand.turn === 0 && hand.phase === 'act' && hand.selfDrew && mine.includes(hand.drawn) && !hand.result;
  const rest = mine.filter((id) => !(apart && id === hand.drawn) && !app.hidden.has(id)).sort((a, b) => kindOf(a) - kindOf(b) || a - b);
  if (apart && !app.hidden.has(hand.drawn)) rest.push(hand.drawn);
  return { ids: rest, apart };
}

/** Kinds whose discard leaves the player ready, with the waits. */
function readyByDiscard() {
  const player = app.match.hand.players[0],
    counts = countsOf(player.hand.map(kindOf)),
    need = needOf(player),
    out = new Map();
  for (let kind = 0; kind < 34; kind++) {
    if (!counts[kind]) continue;
    counts[kind]--;
    const waits = waitsOf(counts, need);
    counts[kind]++;
    if (waits.length) out.set(kind, waits);
  }
  return out;
}

function laidOutHand(count, apart) {
  const space = app.board?.hand;
  if (!space) return handSlots(count, apart);
  const melds = meldTiles(0, app.match?.hand?.players[0]?.melds ?? [], kindOf);
  const right = melds.length ? Math.min(space.right, ...melds.map(tile => tile.x - CELL.width * tile.scale / 2 - 6)) : space.right;
  return handSlots(count, apart, { ...space, right });
}

function paintHand(moving = true) {
  const hand = app.match.hand,
    { ids, apart } = myTiles(),
    human = app.human,
    acting = human?.options.type === 'act',
    hints = save.data.settings.hints && acting ? readyByDiscard() : new Map();
  const ready = new Set(ids.filter((id) => hints.has(kindOf(id))));
  const slots = laidOutHand(ids.length, apart);
  app.view.showHand(
    ids.map((id) => ({ id, kind: kindOf(id) })),
    { drawnApart: apart, selected: app.selected, ready, slots, moving }
  );
  app.round?.showHand(ids, slots, apart, ready, acting, tapTile);
  paintHint(hints);
  paintActions();
  void hand;
}

function paintHint(hints) {
  const match = app.match, human = app.human;
  app.hud?.hint(null);
  if (!save.data.settings.hints || !match?.hand || match.hand.result) return;
  const seen = seenBy(match, 0);
  const show = (key, tile, waits) => app.hud?.hint({ key, tile, waits, seen });
  if (human?.options.type === 'act' && app.selected !== null) {
    const waits = hints.get(kindOf(app.selected));
    if (waits) return show('discardToReady', kindOf(app.selected), waits);
  }
  const player = match.hand.players[0];
  if (player.hand.length % 3 === 1) {
    const waits = waitsOf(countsOf(player.hand.map(kindOf)), needOf(player));
    if (waits.length) show('readyWith', null, waits);
  }
}

function paintActions() {
  if (!app.round || !app.ui) return;
  const actions = [], option = app.human?.options;
  if (!option || app.screen !== 'play') return app.ui.hide('actions');
  const action = (id, key, run, tone, tile) => actions.push({ id, words: t(key), action: run, tone, tile });
  if (option.type === 'act') {
    if (option.win) action('action-win', 'selfDraw', () => answer({ type: 'win' }), 'win');
    option.kongs.forEach((kong, index) => action(index === 0 ? 'action-kong' : 'action-kong-' + kong.kind, 'kong', () => answer({ type: 'kong', kind: kong.kind }), 'call', kong.kind));
    if (app.selected !== null) action('action-discard', 'discard', () => answer({ type: 'discard', id: app.selected }), 'discard');
  } else {
    const hand = app.match.hand;
    const kind = kindOf(option.type === 'rob' ? hand.rob.id : hand.discard.id);
    if (option.win) action('action-win', 'win', () => answer({ type: 'win' }), 'win', kind);
    if (option.kong) action('action-kong', 'kong', () => answer({ type: 'kong' }), 'call', kind);
    if (option.pong) action('action-pong', 'pong', () => answer({ type: 'pong' }), 'call', kind);
    if (option.chows) action('action-chow', 'chow', () => chooseChow(option.chows, kind), 'call', kind);
    action('action-pass', 'pass', () => answer({ type: 'pass' }), 'pass');
  }
  app.round.showActions(actions);
}
function chooseChow(chows, kind) {
  if (chows.length === 1) return answer({ type: 'chow', ids: chows[0] });
  app.chow = { chows, kind };
  displayChow();
}
function displayChow() {
  app.round?.showChow(app.chow.chows, app.chow.kind, ids => answer({ type: 'chow', ids }), closeChow);
}
function closeChow() {
  app.chow = null;
  app.ui?.hide('chow');
}

function tapTile(id) {
  const human = app.human;
  if (!human || human.options.type !== 'act' || app.ui?.modal || pauseGate) return;
  if (app.selected === id) return answer({ type: 'discard', id });
  app.selected = id;
  app.sound.play('select');
  paintHand();
}

function answer(action) {
  const human = app.human;
  if (!human) return;
  app.human = null;
  app.selected = null;
  closeChow();
  paintActions();
  human.resolve(action);
}

/** Wait for the player's choice. */
function askHuman(options) {
  return new Promise((resolve) => {
    app.human = { options, resolve };
    app.selected = null;
    paintTable();
    announce(options.type === 'act' ? t('yourTurn') : t('canCall'));
    const first = options.win ? 'action-win' : options.type === 'act' ? 'tile-' + myTiles().ids.at(-1)
      : options.kong ? 'action-kong' : options.pong ? 'action-pong' : options.chows ? 'action-chow' : 'action-pass';
    const previous = app.ui?.focused;
    if (!previous || /^(tile-|action-)/.test(previous)) app.ui?.focus(first);
  });
}

const announce = (words) => ($('#announce').textContent = words);

// ——— Playing a hand ———
const BRAINS = SEATS.map((s) => ({ character: s.character ?? 'steady', level: save.data.setup.level }));

async function playHand() {
  const match = app.match;
  startHand(match);
  app.last = null;
  app.asidePlayed = false;
  app.reveal = false;
  app.hidden.clear();
  let seen = 0;
  app.sound.music('table');
  paintTable();
  seen = await present(seen);
  while (!match.hand.result && !app.quitting && app.match === match) {
    await gate();
    if (app.quitting || app.match !== match) return;
    const hand = match.hand,
      seats = waiting(match);
    // Computer seats answer first; the player last.
    const seat = seats.find((s) => s !== 0 || app.autoplay) ?? seats[0];
    let action;
    if (seat !== 0 || app.autoplay) {
      const brain = { ...BRAINS[seat], level: seat === 0 ? 'normal' : save.data.setup.level, random: match.random };
      await wait(hand.phase === 'act' ? 0.55 + match.random() * 0.35 : 0.05);
      if (app.quitting || app.match !== match) return;
      action = decide(match, seat, brain);
    } else {
      // A nearer seat has already taken the discard with a win: the player has nothing to answer.
      const from = hand.phase === 'rob' ? hand.rob.seat : hand.discard?.seat;
      const nearerWin = hand.phase !== 'act' && Object.entries(hand.answers ?? {}).some(([s, a]) => a.type === 'win' && (Number(s) - from + 4) % 4 < (0 - from + 4) % 4);
      action = nearerWin ? { type: 'pass' } : await askHuman(optionsFor(match, 0));
      if (app.quitting || app.match !== match) return;
    }
    act(match, seat, action);
    seen = await present(seen);
  }
}

/** Play the hand's new events as motion; returns how many have been seen. */
async function present(from) {
  const match = app.match,
    hand = match.hand,
    events = hand.events.slice(from);
  for (const event of events) {
    await gate();
    switch (event.type) {
      case 'deal':
        paintTable();
        app.sound.play('deal');
        if (match.history.length === 0) app.sound.say(1 + match.firstDealer % 3, 'opening');
        await wait(0.35);
        break;
      case 'flower':
        app.view.call(t('flower'), WORD_AT[event.seat], { size: 36, color: 0xf3d36b });
        app.sound.play('flower', event.seat);
        paintTable();
        await wait(0.3);
        break;
      case 'replace':
        app.sound.play('draw', event.seat);
        break;
      case 'draw':
        if (event.seat === 0 && !app.autoplay) {
          app.hidden.add(event.id);
          paintTable();
          const { ids, apart } = myTiles(),
            slots = laidOutHand(ids.length + 1, true);
          void apart;
          await app.view.fly(kindOf(event.id), { x: CENTRE_FROM.x, y: CENTRE_FROM.y, scale: 0.3 }, slots.at(-1), 0.22);
          app.hidden.delete(event.id);
        }
        app.sound.play('draw', event.seat);
        paintTable();
        break;
      case 'discard': {
        const player = hand.players[event.seat],
          index = player.discards.findIndex((d) => d.id === event.id),
          to = riverSlot(event.seat, index);
        let fromPlace;
        if (event.seat === 0) {
          const { ids, apart } = myTiles();
          const order = [...ids, event.id].sort((a, b) => kindOf(a) - kindOf(b));
          fromPlace = laidOutHand(ids.length + 1, apart)[Math.max(0, order.indexOf(event.id))];
        } else fromPlace = { ...handCentre(event.seat), scale: 0.3, rotation: to.rotation };
        app.hidden.add(event.id);
        app.last = event.id;
        paintTable();
        await app.view.fly(kindOf(event.id), fromPlace, to, 0.24);
        app.hidden.delete(event.id);
        app.sound.play('discard', event.seat);
        if (!app.asidePlayed && !hand.result && liveLeft(hand) <= 26) {
          app.asidePlayed = app.sound.say(event.seat, 'aside');
        }
        paintTable();
        announce(`${nameOf(event.seat)} ${tileName(kindOf(event.id))}`);
        await wait(0.12);
        break;
      }
      case 'chow':
      case 'pong':
      case 'kong':
      case 'addKong': {
        if (event.type === 'addKong') break;
        app.view.call(t(event.type), WORD_AT[event.seat], { size: 68, kind: event.type });
        app.sound.play(event.type, event.seat);
        app.sound.say(event.seat, event.type);
        if (event.id !== undefined) app.last = null;
        paintTable();
        announce(`${nameOf(event.seat)} ${t(event.type)}`);
        await wait(0.55);
        break;
      }
      case 'win': {
        app.reveal = true;
        paintTable();
        app.view.call(event.self ? t('selfDraw') : t('win'), WORD_AT[event.seat],
          { size: 96, big: true, kind: event.self ? 'selfDraw' : 'win', color: 0xffedc6 });
        app.sound.play(event.seat === 0 ? (event.self ? 'selfDraw' : 'win') : event.from === 0 ? 'dealIn' : 'opponentWin');
        app.sound.say(event.seat, event.self ? 'selfDraw' : 'win');
        announce(event.self ? t('resultSelf', { name: nameOf(event.seat) }) : t('resultWin', { name: nameOf(event.seat) }));
        await wait(1.5);
        break;
      }
      case 'exhausted':
        app.reveal = true;
        paintTable();
        app.view.call(t('resultDraw'), { x: 640, y: 360 }, { size: 72 });
        app.sound.play('drawn');
        await wait(1.2);
        break;
    }
  }
  return from + events.length;
}
const CENTRE_FROM = { x: 640, y: 360 };

// ——— A whole game ———
async function playGame() {
  const setup = save.data.setup;
  app.quitting = false;
  const match = app.match = createMatch({ seed: app.seed, rounds: setup.rounds });
  app.match.dealer = Math.floor(app.match.random() * 4);
  app.match.firstDealer = app.match.dealer;
  show('play');
  while (!match.over && !app.quitting && app.match === match) {
    await playHand();
    if (app.quitting || app.match !== match) return;
    const last = match.history.at(-1);
    save.update((data) => recordHand(data, { ...last.result, dealer: last.dealer }));
    await showResult(last);
    if (app.quitting || app.match !== match) return;
  }
  if (!app.quitting && app.match === match) showFinal();
}

function showResult(entry) {
  return new Promise(resolve => {
    app.resultEntry = entry;
    app.screen = 'result';
    paintTools();
    app.ui?.hide('actions');
    app.sound.music('result');
    app.resolveResult = () => {
      if (app.screen !== 'result') return;
      app.round?.closeResult();
      app.resultEntry = null;
      app.resolveResult = null;
      app.screen = 'play';
      paintTools();
      resolve();
    };
    renderResult();
  });
}
function renderResult() {
  if (app.resultEntry && app.match) app.round?.showResult(app.resultEntry, app.match, app.resolveResult);
}
function showFinal() {
  const match = app.match;
  const order = [0, 1, 2, 3].sort((a, b) => match.scores[b] - match.scores[a] || a - b);
  save.update(data => { app.best = recordGame(data, match.scores[0], order.indexOf(0) + 1); });
  show('final');
  app.sound.music('result');
  renderFinal();
}
function renderFinal() {
  if (!app.match) return;
  app.round?.showFinal(app.match, app.best, () => {
    app.seed = (app.seed * 48271) % 2147483647;
    beginGame();
  }, () => show('title'));
}
function show(name) {
  app.screen = name;
  $('#back').style.visibility = name === 'title' ? 'hidden' : 'visible';
  app.hud?.show(name !== 'title');
  if (name === 'title') {
    app.ui?.hide('actions');
    app.ui?.hide('hand');
    app.round?.closeResult();
    app.sound.music('title');
    app.view?.clear();
    app.felt?.paint({});
    app.screens?.showTitle();
    // A newly presented static screen can stay stale in WebKit; redraw once, not continuously.
    setTimeout(() => { if (app.screen === 'title') app.game?.invalidate(); }, 250);
  } else app.screens?.hideTitle();
  if (name !== 'final') app.ui?.hide('final');
  paintTools();
}
function beginGame() {
  if (app.screen !== 'title' && app.screen !== 'final') return;
  app.sound.play('ui');
  playGame().catch(console.error);
}

function setSetting(key, value) {
  app.sound.play('ui');
  save.update((data) => {
    data.settings[key] = value;
  });
  if (key === 'sound') app.sound.setSound(value);
  if (key === 'music') app.sound.setMusic(value);
  if (key === 'voice') app.sound.setVoice(value);
  if (key === 'reducedMotion' && app.game) app.game.reducedMotion = value || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (key === 'hints' && app.match?.hand) paintHand();
}

function paintTools() {
  if (!app.round || !app.ui) return;
  if (app.screen !== 'play') return app.ui.hide('tools');
  app.round.showTools(app.autoplay, toggleAuto, openMenu);
}
function toggleAuto() {
  app.autoplay = !app.autoplay;
  paintTools();
  if (!app.autoplay || !app.human) return;
  const options = app.human.options;
  answer(decide(app.match, 0, { character: 'steady', level: 'normal', random: app.match.random }) ??
    (options.type === 'act' ? { type: 'discard', id: options.discard.at(-1) } : { type: 'pass' }));
}
function switchLanguage(language = getLanguage() === 'zh' ? 'en' : 'zh') {
  save.update(data => { data.settings.language = language; });
  setLanguage(language);
}
function updateLanguage() {
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-Hant' : 'en';
  document.title = t('pageTitle');
  app.game?.canvas.setAttribute('aria-label', t('title'));
  app.screens?.refresh();
  paintTools();
  if (app.match?.hand && app.screen !== 'title') paintTable();
  if (app.screen === 'result') renderResult();
  if (app.screen === 'final') renderFinal();
  if (app.chow) displayChow();
}
onLanguage(updateLanguage);

function openMenu() {
  if (app.screen !== 'play' || !app.screens || app.screens.modal) return;
  pause(true);
  app.screens.open('menu');
}
function resume() {
  app.screens?.close('menu');
  pause(false);
  if (app.match?.hand) paintTable();
}
function quit() {
  app.screens?.closeAll();
  app.quitting = true;
  if (app.human) answer({ type: 'pass' });
  pause(false);
  app.match = null;
  show('title');
}

function pause(on) {
  if (on && !pauseGate) {
    let resolve;
    const promise = new Promise((r) => (resolve = r));
    pauseGate = { promise, resolve };
    app.sound.pause(true);
    app.game?.pause();
  } else if (!on && pauseGate) {
    const gateNow = pauseGate;
    pauseGate = null;
    app.sound.pause(false);
    app.game?.resume();
    gateNow.resolve();
  }
}
// Gameplay shortcuts yield to an open engine modal.
document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || !app.ui) return;
  if (event.key === 'Escape') {
    if (app.ui.modal) return; // Native modal focus owns Escape and dismisses once.
    if (app.human && app.human.options.type !== 'act') answer({ type: 'pass' });
    else if (app.screen === 'play') openMenu();
    else return;
    event.preventDefault();
    return;
  }
  if (app.screen !== 'play' || app.ui.modal) return;
  const key = event.key.toLowerCase(), options = app.human?.options;
  if (key === 'p' && !options?.pong) {
    event.preventDefault();
    return openMenu();
  }
  if (!options) return;
  let command;
  if ((key === 'h' || key === 'w') && options.win) command = { type: 'win' };
  if (key === 'p' && options.pong) command = { type: 'pong' };
  if (key === 'k' && (options.kong || options.kongs?.length)) command = options.kong ? { type: 'kong' } : { type: 'kong', kind: options.kongs[0].kind };
  if (key === 'x' && options.type !== 'act') command = { type: 'pass' };
  if (command) {
    event.preventDefault();
    return answer(command);
  }
  if (key === 'c' && options.chows) {
    event.preventDefault();
    return chooseChow(options.chows, kindOf(app.match.hand.discard.id));
  }
  if (options.type === 'act' && ['ArrowLeft', 'ArrowRight'].includes(event.key) && app.ui.focused?.startsWith('tile-')) {
    const tiles = myTiles().ids;
    const id = Number(app.ui.focused.slice(5)), at = tiles.indexOf(id);
    const index = Math.max(0, Math.min(tiles.length - 1, at + (event.key === 'ArrowLeft' ? -1 : 1)));
    if (tiles[index] !== undefined) app.ui.focus('tile-' + tiles[index]);
    event.preventDefault();
  }
}, true);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && app.screen === 'play') openMenu();
});

// ——— Start ———
async function boot() {
  if (document.fonts?.ready) await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]);
  const atlas = paintAtlas();
  app.felt = createFelt($('#felt'), atlas, kindOf);
  await startEngine(atlas);
  await app.screens.ready;
  updateLanguage();
  show('title');
  $('#loading').hidden = true;
  app.ready = true;
}

/** For tests: the app, the rules and a way to start. */
window.mahjong = {
  app,
  get ui() { return app.ui; },
  get semantics() { return app.semantics; },
  rules: { act, chowsFor, createMatch, kindOf, liveLeft, optionsFor, startHand, waiting, CHARACTERS },
  get game() {
    return app.game;
  },
  get ready() {
    return Boolean(app.ready);
  },
  get screen() {
    return app.screen;
  },
  answer,
  paintTable
};

boot().catch((error) => {
  console.error(error);
  $('#loading').textContent = String(error.message ?? error);
});
