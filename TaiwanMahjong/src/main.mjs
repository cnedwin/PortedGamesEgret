// 页面入口：建好图集、引擎（play）、静态牌桌和声音，然后跑牌局：轮到电脑就想一下再出手，轮到玩家就等按键或点击，
// 每一步的事件（摸、打、吃碰槓、补花、胡）播成动画，再把牌桌重画。标题、规则、设置、战绩、暂停、每局结算和终局
// 排名都是页面上的面板。
// The page's entry: makes the atlas, the engine (play), the still table and the sound, then runs the game: a computer
// seat thinks a moment and acts, the player's seat waits for a key or a tap, each step's events (draw, discard,
// calls, flowers, a win) are played as motion and the table painted again. The title, rules, settings, record, pause,
// each hand's result and the final ranking are page panels.
import { play } from '@egret/engine/play';
import { browserSaveStorage } from '@egret/engine/web/kit';
import { createFelt } from './felt.mjs';
import { getLanguage, onLanguage, setLanguage, startLanguage, t, tileName } from './i18n.mjs';
import { handCentre, handSlots, riverSlot, STAGE } from './layout.mjs';
import { LEVEL_NAMES, openSave, recordGame, recordHand } from './saves.mjs';
import { createSound } from './sound.mjs';
import { CHARACTERS, decide } from './sim/bot.mjs';
import { act, chowsFor, createMatch, kindOf, liveLeft, needOf, optionsFor, RULES, seenBy, startHand, waiting } from './sim/game.mjs';
import { countsOf, waitsOf } from './sim/hand.mjs';
import { TAI } from './sim/score.mjs';
import { BACK, CELL, frameOf, paintAtlas } from './tiles.mjs';
import { createView } from './view.mjs';

const params = new URLSearchParams(location.search);
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const table = $('#table');

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
      for (const plate of $$('.plate[data-seat]')) {
        plate.classList.toggle('speaking', seat !== null && Number(plate.dataset.seat) === seat);
      }
    }
  }),
  felt: null,
  view: null,
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

// ——— Sizing ———
function fit() {
  // On a tall screen the table turns a quarter so it is as large as on a wide one; turning the phone sets it upright.
  // The page layers turn with CSS; the engine's canvas may not sit under a turned element, so on a tall screen the
  // engine is made tall and turns its own world instead (ENGINE-NOTES 4).
  const tall = innerHeight > innerWidth,
    w = tall ? STAGE.height : STAGE.width,
    h = tall ? STAGE.width : STAGE.height,
    s = Math.min(innerWidth / w, innerHeight / h),
    left = (innerWidth - w * s) / 2,
    top = (innerHeight - h * s) / 2;
  const turn = tall ? `translate(${left + w * s}px, ${top}px) rotate(90deg) scale(${s})` : `translate(${left}px, ${top}px) scale(${s})`;
  for (const layer of [$('#back'), table]) layer.style.transform = turn;
  $('#stage').style.transform = `translate(${left}px, ${top}px) scale(${(s * 4) / 3})`;
  if (app.atlas && tall !== app.tall) building = building.then(() => buildEngine(tall)).catch((error) => console.error(error));
}
let building = Promise.resolve();
addEventListener('resize', fit);

/** Make (or make again) the engine, wide or tall. */
async function buildEngine(tall) {
  const old = app.game;
  app.tall = tall;
  app.game = null;
  // While the engine is made again, the hand and the motion wait quietly.
  app.view = { showHand() {}, fly: async () => {}, call() {}, clear() {} };
  if (old) await old.dispose();
  const host = $('#stage');
  host.replaceChildren();
  host.classList.toggle('tall', tall);
  // The engine draws at three quarters of the stage; play's canvas has as many pixels as its width (ENGINE-NOTES 3).
  const game = await play({ width: ((tall ? STAGE.height : STAGE.width) * 3) / 4, height: ((tall ? STAGE.width : STAGE.height) * 3) / 4, parent: host, transparent: true, seed: app.seed, onError: (error) => console.error(error) });
  // The holder play makes under a clear canvas is black; the table shows through it (ENGINE-NOTES 2).
  if (game.canvas.parentElement) game.canvas.parentElement.style.background = 'transparent';
  game.reducedMotion = save.data.settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lease = await game.browser.textureFromCanvas(app.atlas);
  app.view = createView(game, lease, { tall });
  app.sound.attach(game);
  app.game = game;
  if (pauseGate) game.pause();
  if (app.match?.hand && app.screen !== 'title' && app.felt) paintTable();
}

// ——— Tile pictures for the page ———
let atlas;
const pictures = new Map();
function picture(kind) {
  const key = kind ?? BACK;
  if (!pictures.has(key)) {
    const canvas = document.createElement('canvas'),
      frame = frameOf(key);
    canvas.width = CELL.width / 2;
    canvas.height = CELL.height / 2;
    canvas.getContext('2d').drawImage(atlas, frame.x, frame.y, frame.width, frame.height, 0, 0, canvas.width, canvas.height);
    pictures.set(key, canvas.toDataURL());
  }
  return pictures.get(key);
}
function img(kind, className = '') {
  const image = document.createElement('img');
  image.src = picture(kind);
  image.alt = kind === null ? '' : tileName(kind);
  if (className) image.className = className;
  return image;
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
  app.felt.paint({ hand, turn: hand && !hand.result ? hand.turn : -1, reveal: app.reveal, hidden: app.hidden, last: app.last, winner: hand?.result?.seat ?? -1 });
  if (!hand) return;
  const windOf = (seat) => (seat - hand.dealer + 4) % 4;
  $('#roundLine').textContent = t('roundLine', { wind: t('wind' + hand.wind), seat: t('wind' + hand.passes) });
  $('#wallLeft').textContent = t('wallLeft', { n: Math.max(0, liveLeft(hand)) });
  for (const span of $$('.seatWind')) {
    const seat = Number(span.dataset.seat);
    span.textContent = t('wind' + windOf(seat));
    span.classList.toggle('dealer', seat === hand.dealer);
  }
  for (const plate of $$('.plate')) {
    const seat = Number(plate.dataset.seat);
    $('.seal', plate).textContent = t(SEATS[seat].seal);
    $('.who', plate).textContent = nameOf(seat);
    const badges = $('.badges', plate);
    badges.replaceChildren();
    const wind = document.createElement('span');
    wind.className = 'wind';
    wind.textContent = t('wind' + windOf(seat));
    badges.append(wind);
    if (seat === hand.dealer) {
      const mark = document.createElement('span');
      mark.className = 'dealerMark';
      mark.textContent = t('dealer') + (hand.streak ? ' ' + t('streak', { n: hand.streak }) : '');
      badges.append(mark);
    }
    const score = $('.score', plate);
    score.textContent = signed(match.scores[seat]);
    score.classList.toggle('down', match.scores[seat] < 0);
    plate.classList.toggle('turn', !hand.result && hand.turn === seat && hand.phase === 'act');
    plate.setAttribute('aria-label', `${nameOf(seat)} ${t('wind' + windOf(seat))} ${signed(match.scores[seat])}`);
  }
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

function paintHand() {
  const hand = app.match.hand,
    { ids, apart } = myTiles(),
    human = app.human,
    acting = human?.options.type === 'act',
    hints = save.data.settings.hints && acting ? readyByDiscard() : new Map();
  const ready = new Set(ids.filter((id) => hints.has(kindOf(id))));
  app.view.showHand(
    ids.map((id) => ({ id, kind: kindOf(id) })),
    { drawnApart: apart, selected: app.selected, ready }
  );
  // Keys over the tiles.
  const keys = $('#handKeys'),
    slots = handSlots(ids.length, apart),
    focusedId = Number(document.activeElement?.dataset?.id ?? -1);
  keys.setAttribute('aria-label', t('handTile', { tile: '' }).trim());
  keys.replaceChildren(
    ...ids.map((id, i) => {
      const button = document.createElement('button'),
        kind = kindOf(id);
      button.type = 'button';
      button.dataset.id = id;
      button.style.left = `${slots[i].x - 32}px`;
      const label = (apart && i === ids.length - 1 ? t('drawnTile', { tile: tileName(kind) }) : t('handTile', { tile: tileName(kind) })) + (ready.has(id) ? ' · ' + t('readyMark') : '');
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(app.selected === id));
      if (!acting) button.setAttribute('aria-disabled', 'true');
      button.addEventListener('click', () => tapTile(id));
      return button;
    })
  );
  const again = $$('#handKeys button').find((b) => Number(b.dataset.id) === focusedId);
  if (again) again.focus();
  paintHint(hints);
  paintActions();
  void hand;
}

function paintHint(hints) {
  const hint = $('#hint'),
    match = app.match,
    human = app.human;
  hint.replaceChildren();
  if (!save.data.settings.hints || !match?.hand || match.hand.result) return;
  const seen = seenBy(match, 0);
  const show = (key, tile, waits) => {
    const [before, after] = t(key, { tile: '\u0001', tiles: '\u0002' }).split('\u0002');
    const [lead, middle] = before.split('\u0001');
    hint.append(lead);
    if (tile !== null) {
      hint.append(img(tile), middle ?? '');
    }
    for (const kind of waits) {
      hint.append(img(kind));
      const count = document.createElement('span');
      count.className = 'count';
      count.textContent = `×${Math.max(0, 4 - seen[kind])}`;
      hint.append(count);
    }
    hint.append(after ?? '');
  };
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

function button(words, className, onClick, tile) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.append(words);
  if (tile !== undefined) b.append(img(tile));
  b.addEventListener('click', onClick);
  return b;
}

function paintActions() {
  const bar = $('#actions'),
    human = app.human;
  bar.replaceChildren();
  if (!human) return;
  const o = human.options;
  if (o.type === 'act') {
    if (o.win) bar.append(button(t('selfDraw'), 'win', () => answer({ type: 'win' })));
    for (const kong of o.kongs) bar.append(button(t('kong'), '', () => answer({ type: 'kong', kind: kong.kind }), kong.kind));
    if (app.selected !== null) bar.append(button(t('discard'), 'discard', () => answer({ type: 'discard', id: app.selected })));
    return;
  }
  const kind = kindOf(o.type === 'rob' ? app.match.hand.rob.id : app.match.hand.discard.id);
  if (o.win) bar.append(button(t('win'), 'win', () => answer({ type: 'win' }), kind));
  if (o.kong) bar.append(button(t('kong'), '', () => answer({ type: 'kong' }), kind));
  if (o.pong) bar.append(button(t('pong'), '', () => answer({ type: 'pong' }), kind));
  if (o.chows) bar.append(button(t('chow'), '', () => chooseChow(o.chows, kind), kind));
  bar.append(button(t('pass'), 'pass', () => answer({ type: 'pass' })));
  bar.setAttribute('aria-label', t('canCall'));
}

function chooseChow(chows, kind) {
  if (chows.length === 1) return answer({ type: 'chow', ids: chows[0] });
  const pick = $('#chowPick'),
    list = $('#chowChoices');
  $('#chowTitle').textContent = t('chooseChow');
  list.replaceChildren(
    ...chows.map((ids) => {
      const kinds = [...ids.map(kindOf), kind].sort((a, b) => a - b);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chowChoice';
      b.setAttribute('aria-label', kinds.map(tileName).join(' '));
      for (const k of kinds) b.append(img(k));
      b.addEventListener('click', () => {
        pick.hidden = true;
        answer({ type: 'chow', ids });
      });
      return b;
    }),
    button(t('back'), '', () => {
      pick.hidden = true;
      $('#actions button')?.focus();
    })
  );
  pick.hidden = false;
  $('button', list).focus();
}

function tapTile(id) {
  const human = app.human;
  if (!human || human.options.type !== 'act') return;
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
  $('#chowPick').hidden = true;
  human.resolve(action);
}

/** Wait for the player's choice. */
function askHuman(options) {
  return new Promise((resolve) => {
    app.human = { options, resolve };
    app.selected = null;
    paintTable();
    announce(options.type === 'act' ? t('yourTurn') : t('canCall'));
    const first = $('#actions button.win') ?? (options.type === 'act' ? $$('#handKeys button').at(-1) : $('#actions button'));
    if (!document.activeElement || document.activeElement === document.body || document.activeElement.closest('#handKeys, #actions')) first?.focus({ preventScroll: true });
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
  while (!match.hand.result && !app.quitting) {
    await gate();
    const hand = match.hand,
      seats = waiting(match);
    // Computer seats answer first; the player last.
    const seat = seats.find((s) => s !== 0 || app.autoplay) ?? seats[0];
    let action;
    if (seat !== 0 || app.autoplay) {
      const brain = { ...BRAINS[seat], level: seat === 0 ? 'normal' : save.data.setup.level, random: match.random };
      await wait(hand.phase === 'act' ? 0.55 + match.random() * 0.35 : 0.05);
      if (app.quitting) return;
      action = decide(match, seat, brain);
    } else {
      // A nearer seat has already taken the discard with a win: the player has nothing to answer.
      const from = hand.phase === 'rob' ? hand.rob.seat : hand.discard?.seat;
      const nearerWin = hand.phase !== 'act' && Object.entries(hand.answers ?? {}).some(([s, a]) => a.type === 'win' && (Number(s) - from + 4) % 4 < (0 - from + 4) % 4);
      action = nearerWin ? { type: 'pass' } : await askHuman(optionsFor(match, 0));
      if (app.quitting) return;
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
            slots = handSlots(ids.length + 1, true);
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
          fromPlace = handSlots(ids.length + 1, apart)[Math.max(0, order.indexOf(event.id))];
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
  app.match = createMatch({ seed: app.seed, rounds: setup.rounds });
  app.match.dealer = Math.floor(app.match.random() * 4);
  app.match.firstDealer = app.match.dealer;
  show('play');
  while (!app.match.over && !app.quitting) {
    await playHand();
    if (app.quitting) return;
    const last = app.match.history.at(-1);
    save.update((data) => recordHand(data, { ...last.result, dealer: last.dealer }));
    await showResult(last);
    if (app.quitting) return;
  }
  showFinal();
}

function showResult(entry) {
  const result = entry.result,
    match = app.match;
  return new Promise((resolve) => {
    const panel = $('#result');
    const hand = match.hand, portrait = $('#resultPortrait');
    portrait.hidden = result.kind === 'draw';
    if (result.kind === 'draw') {
      $('#resultTitle').textContent = t('resultDraw');
      $('#resultNote').textContent = t('resultDrawNote');
      $('#resultHand').replaceChildren();
      $('#resultTai').replaceChildren();
      $('#resultTotal').textContent = '';
    } else {
      const seat = result.seat;
      portrait.dataset.seat = seat;
      portrait.textContent = t(SEATS[seat].seal);
      $('#resultTitle').textContent = result.from === null ? t('resultSelf', { name: nameOf(seat) }) : t('resultWin', { name: nameOf(seat) });
      $('#resultNote').textContent = result.from === null ? t('paidByAll') : t('dealIn', { name: nameOf(result.from) });
      const player = hand.players[seat],
        row = $('#resultHand');
      row.replaceChildren();
      const concealed = player.hand.filter((id) => id !== result.winTile).sort((a, b) => kindOf(a) - kindOf(b));
      for (const id of concealed) row.append(img(kindOf(id)));
      if (result.winTile !== null && result.winTile !== undefined) {
        row.append(Object.assign(document.createElement('span'), { className: 'gap' }), img(kindOf(result.winTile), 'won'));
      }
      for (const meld of player.melds) {
        row.append(Object.assign(document.createElement('span'), { className: 'gap' }));
        meld.tiles.forEach((id, i) => row.append(img(meld.how === 'closed' && (i === 0 || i === 3) ? null : kindOf(id))));
      }
      if (player.flowers.length) {
        row.append(Object.assign(document.createElement('span'), { className: 'gap' }));
        for (const id of player.flowers) row.append(img(kindOf(id)));
      }
      const list = $('#resultTai');
      list.replaceChildren(
        ...result.score.items.map((item) => li(t('tai_' + item.key) + (item.kind !== undefined ? ` (${tileName(item.kind)})` : ''), t('taiUnit', { n: item.tai }))),
        ...(entry.dealer === seat || result.from === entry.dealer || (result.from === null && seat !== entry.dealer)
          ? [li(entry.streak ? t('dealerStreakNote', { s: entry.streak }) : t('dealerTaiNote'), t('taiUnit', { n: result.dealerTai }))]
          : [])
      );
      const dealerAdds = entry.dealer === seat || result.from === entry.dealer;
      $('#resultTotal').textContent = t('taiTotal', { n: result.score.total + (dealerAdds ? result.dealerTai : 0) });
    }
    const pay = $('#resultPay');
    pay.replaceChildren(
      ...[0, 1, 2, 3].map((seat) => {
        const tr = document.createElement('tr'),
          amount = result.payments?.[seat] ?? 0;
        tr.innerHTML = '<td></td><td class="num"></td><td class="num"></td>';
        tr.children[0].textContent = nameOf(seat) + (seat === entry.dealer ? ` · ${t('dealer')}` : '');
        tr.children[1].textContent = amount ? signed(amount) : '0';
        tr.children[1].className = 'num ' + (amount > 0 ? 'plus' : amount < 0 ? 'minus' : '');
        tr.children[2].textContent = signed(match.scores[seat]);
        return tr;
      })
    );
    const next = $('#nextButton');
    next.textContent = match.over ? t('finalScores') : t('nextHand');
    next.onclick = () => {
      panel.hidden = true;
      app.screen = 'play';
      resolve();
    };
    app.resolveResult = next.onclick;
    panel.hidden = false;
    app.screen = 'result';
    app.sound.music('result');
    next.focus();
  });
}

function li(name, value, className = '') {
  const item = document.createElement('li');
  item.className = className;
  const a = document.createElement('span'),
    b = document.createElement('span');
  a.textContent = name;
  b.textContent = value;
  item.append(a, b);
  return item;
}

function showFinal() {
  const match = app.match,
    order = [0, 1, 2, 3].sort((a, b) => match.scores[b] - match.scores[a] || a - b),
    place = order.indexOf(0) + 1;
  let best = false;
  save.update((data) => {
    best = recordGame(data, match.scores[0], place);
  });
  $('#finalTitle').textContent = t('gameOver');
  $('#againButton').textContent = t('again');
  $('#homeButton').textContent = t('toTitle');
  $('#finalRanks').replaceChildren(
    ...order.map((seat, i) => {
      const item = document.createElement('li');
      item.className = seat === 0 ? 'me' : '';
      item.innerHTML = '<span class="place"></span><span></span><b></b>';
      item.children[0].textContent = t('place' + (i + 1));
      item.children[1].textContent = nameOf(seat);
      item.children[2].textContent = t('points', { n: signed(match.scores[seat]) });
      return item;
    })
  );
  $('#finalNote').textContent = best ? t('bestGame') : '';
  show('final');
  app.sound.music('result');
  $('#againButton').focus();
}

// ——— Screens and panels ———
const PANELS = ['title', 'result', 'final', 'rules', 'settings', 'record', 'menu'];
function show(name) {
  for (const id of ['title', 'final']) $('#' + id).hidden = id !== name;
  table.classList.toggle('atTitle', name === 'title');
  app.screen = name;
  if (name === 'title') {
    app.sound.music('title');
    app.view?.clear();
    app.felt?.paint({});
    paintTitle();
  }
}

function openPanel(id, returnTo) {
  app.sound.play('ui');
  const panel = $('#' + id);
  panel.hidden = false;
  panel.returnTo = returnTo;
  ($('.closeButton', panel) ?? $('button', panel))?.focus();
}
function closePanel(id) {
  const panel = $('#' + id);
  panel.hidden = true;
  panel.returnTo?.focus?.();
}
for (const id of ['rules', 'settings', 'record']) $(`#${id} .closeButton`).addEventListener('click', () => closePanel(id));

function paintTitle() {
  document.title = t('pageTitle');
  $('#titleType').textContent = t('titleType');
  $('#titleName').textContent = t('title');
  $('#tagline').textContent = t('tagline');
  const notice = $('#title .notice');
  const words = [problems.includes('corrupt') || problems.includes('unreadable') || problems.includes('invalid') ? t('saveBroken') : '', problems.includes('write') || problems.includes('refused') ? t('saveRefused') : ''].filter(Boolean);
  notice.hidden = words.length === 0;
  notice.textContent = words.join(' ');
  $('#lengthLegend').textContent = t('length');
  $('#levelLegend').textContent = t('level');
  const setup = save.data.setup;
  $('#lengthChoices').replaceChildren(
    ...[
      [1, 'oneRound', 'oneRoundNote'],
      [4, 'fullGame', 'fullGameNote']
    ].map(([value, name, note]) =>
      choice(t(name), t(note), setup.rounds === value, () => {
        save.update((data) => {
    data.setup.rounds = value;
  });
        paintTitle();
        $$('#lengthChoices button')[value === 1 ? 0 : 1].focus();
      })
    )
  );
  $('#levelChoices').replaceChildren(
    ...LEVEL_NAMES.map((level, i) =>
      choice(t(level), t(level + 'Note'), setup.level === level, () => {
        save.update((data) => {
    data.setup.level = level;
  });
        paintTitle();
        $$('#levelChoices button')[i].focus();
      })
    )
  );
  $('#people').replaceChildren(
    ...[1, 3, 2].map((seat) => {
      const person = document.createElement('div');
      person.className = 'person';
      person.dataset.seat = seat;
      person.innerHTML = '<i class="seal" aria-hidden="true"></i><span><b></b><span></span></span>';
      $('.seal', person).textContent = t(SEATS[seat].seal);
      $('b', person).textContent = nameOf(seat);
      $('span span', person).textContent = t(SEATS[seat].key + 'Note');
      return person;
    })
  );
  $('#startButton').textContent = t('play');
  $('#rulesButton').textContent = t('rules');
  $('#recordButton').textContent = t('record');
  $('#settingsButton').textContent = t('settings');
  const language = $('#languageButton');
  language.textContent = getLanguage() === 'zh' ? t('english') : t('chinese');
  language.setAttribute('aria-label', t('switchLanguage'));
  language.lang = getLanguage() === 'zh' ? 'en' : 'zh-Hant';
}

function choice(name, note, pressed, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'choice';
  b.setAttribute('aria-pressed', String(pressed));
  b.innerHTML = '<b></b><small></small>';
  b.firstChild.textContent = name;
  b.lastChild.textContent = note;
  b.addEventListener('click', onClick);
  return b;
}

function paintRules() {
  const panel = $('#rules');
  $('#rulesTitle').textContent = t('rules');
  const text = $('.rulesText', panel);
  text.replaceChildren(
    ...['rulesIntro', 'rulesFlow', 'rulesPay', 'rulesNotIncluded'].map((key) => {
      const p = document.createElement('p');
      p.textContent = t(key, { base: RULES.base, per: RULES.perTai });
      return p;
    })
  );
  const rows = Object.entries(TAI).map(([key, tai]) => `<tr><td></td><td class="note"></td><td class="num">${tai}</td></tr>`);
  const tableBox = $('.taiTable', panel);
  tableBox.innerHTML = `<table><caption class="sr"></caption><tbody>${rows.join('')}</tbody></table>`;
  $('caption', tableBox).textContent = t('taiTable');
  $$('tr', tableBox).forEach((tr, i) => {
    const key = Object.keys(TAI)[i];
    tr.children[0].textContent = t('tai_' + key);
    tr.children[1].textContent = t('note_' + key);
  });
  $('.closeButton', panel).textContent = t('close');
}

function paintSettings() {
  const panel = $('#settings'),
    s = save.data.settings,
    list = $('.settingsList', panel);
  $('#settingsTitle').textContent = t('settings');
  const toggle = (key, label) => [label, `${t(s[key] ? 'on' : 'off')}`, () => setSetting(key, !s[key])];
  const rows = [
    toggle('sound', t('sound')),
    toggle('music', t('music')),
    toggle('voice', t('voice')),
    [t('pace'), t(s.pace), () => setSetting('pace', s.pace === 'calm' ? 'brisk' : 'calm')],
    toggle('hints', t('hints')),
    toggle('reducedMotion', t('reducedMotion')),
    [t('switchLanguage'), getLanguage() === 'zh' ? t('english') : t('chinese'), () => switchLanguage()]
  ];
  list.replaceChildren(
    ...rows.flatMap(([label, value, onClick], i) => {
      const name = document.createElement('span');
      name.textContent = label;
      name.id = 'setting' + i;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = value;
      b.setAttribute('aria-labelledby', `setting${i} setting${i}v`);
      b.id = `setting${i}v`;
      b.addEventListener('click', () => {
        onClick();
        paintSettings();
        $(`#setting${i}v`).focus();
      });
      return [name, b];
    })
  );
  $('.closeButton', panel).textContent = t('close');
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

function paintRecord() {
  const r = save.data.record;
  $('#recordTitle').textContent = t('record');
  const rows = [
    ['recordGames', r.games],
    ['recordFirsts', r.firsts],
    ['recordHands', r.hands],
    ['recordWins', r.wins],
    ['recordSelf', r.selfDraws],
    ['recordDealIn', r.dealIns],
    ['recordBestTai', r.bestTai ? t('taiUnit', { n: r.bestTai }) : t('none')],
    ['recordBestGame', r.bestGame === null ? t('none') : t('points', { n: signed(r.bestGame) })]
  ];
  $('#record .recordList').replaceChildren(
    ...rows.flatMap(([key, value]) => {
      const dt = document.createElement('dt'),
        dd = document.createElement('dd');
      dt.textContent = t(key);
      dd.textContent = String(value);
      return [dt, dd];
    })
  );
  $('#record .closeButton').textContent = t('close');
}

function paintMenu() {
  $('#menuTitle').textContent = t('pauseTitle');
  $('#resumeButton').textContent = t('resume');
  $('#menuRules').textContent = t('rules');
  $('#menuSettings').textContent = t('settings');
  $('#quitButton').textContent = t('quit');
}

function paintTools() {
  const auto = $('#autoButton');
  auto.textContent = app.autoplay ? t('autoplayOn') : t('autoplay');
  auto.setAttribute('aria-pressed', String(app.autoplay));
  $('#pauseButton').textContent = t('pause');
}

function switchLanguage(language = getLanguage() === 'zh' ? 'en' : 'zh') {
  setLanguage(language);
  save.update((data) => {
    data.settings.language = language;
  });
}

onLanguage(() => {
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-Hant' : 'en';
  document.title = t('pageTitle');
  paintTitle();
  paintRules();
  paintSettings();
  paintRecord();
  paintMenu();
  paintTools();
  if (app.match?.hand && app.screen !== 'title') paintTable();
});

function openMenu() {
  if (app.screen !== 'play' || !$('#menu').hidden) return;
  pause(true);
  paintMenu();
  openPanel('menu', document.activeElement);
  $('#resumeButton').focus();
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
$('#resumeButton').addEventListener('click', () => {
  closePanel('menu');
  pause(false);
  paintTable();
});
$('#menuRules').addEventListener('click', () => {
  paintRules();
  openPanel('rules', $('#menuRules'));
});
$('#menuSettings').addEventListener('click', () => {
  paintSettings();
  openPanel('settings', $('#menuSettings'));
});
$('#quitButton').addEventListener('click', () => {
  $('#menu').hidden = true;
  app.quitting = true;
  if (app.human) answer({ type: 'pass' });
  pause(false);
  app.match = null;
  show('title');
  $('#startButton').focus();
});
$('#pauseButton').addEventListener('click', openMenu);
$('#autoButton').addEventListener('click', () => {
  app.autoplay = !app.autoplay;
  paintTools();
  if (app.autoplay && app.human) {
    const options = app.human.options;
    answer(decide(app.match, 0, { character: 'steady', level: 'normal', random: app.match.random }) ?? (options.type === 'act' ? { type: 'discard', id: options.discard.at(-1) } : { type: 'pass' }));
  }
});

$('#startButton').addEventListener('click', () => {
  app.sound.play('ui');
  playGame().catch((error) => console.error(error));
});
$('#rulesButton').addEventListener('click', () => {
  paintRules();
  openPanel('rules', $('#rulesButton'));
});
$('#recordButton').addEventListener('click', () => {
  paintRecord();
  openPanel('record', $('#recordButton'));
});
$('#settingsButton').addEventListener('click', () => {
  paintSettings();
  openPanel('settings', $('#settingsButton'));
});
$('#languageButton').addEventListener('click', () => {
  switchLanguage();
  $('#languageButton').focus();
});
$('#againButton').addEventListener('click', () => {
  app.seed = (app.seed * 48271) % 2147483647;
  playGame().catch((error) => console.error(error));
});
$('#homeButton').addEventListener('click', () => {
  show('title');
  $('#startButton').focus();
});

// ——— Keys ———
// play takes Tab, Space and the arrows on the window for its own keys; this game reads none of play's keys, so every
// key is caught first, handled here, and kept from play (ENGINE-NOTES 1).
addEventListener(
  'keydown',
  (event) => {
    event.stopPropagation();
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const open = PANELS.find((id) => id !== 'title' && id !== 'final' && !$('#' + id).hidden);
    if (event.key === 'Escape') {
      if (!$('#chowPick').hidden) {
        $('#chowPick').hidden = true;
        $('#actions button')?.focus();
      } else if (open === 'rules' || open === 'settings' || open === 'record') closePanel(open);
      else if (open === 'menu') $('#resumeButton').click();
      else if (app.human && app.human.options.type !== 'act') answer({ type: 'pass' });
      else if (app.screen === 'play') openMenu();
      event.preventDefault();
      return;
    }
    if (app.screen !== 'play' || open || !$('#chowPick').hidden) return;
    const key = event.key.toLowerCase();
    if (key === 'p' && !app.human?.options.pong) return openMenu();
    if (!app.human) return;
    const o = app.human.options,
      click = (selector) => $(selector)?.click();
    if ((key === 'h' || key === 'w') && o.win) return click('#actions button.win');
    if (key === 'p' && o.pong) return answer({ type: 'pong' });
    if (key === 'k' && (o.kong || o.kongs?.length)) return o.kong ? answer({ type: 'kong' }) : answer({ type: 'kong', kind: o.kongs[0].kind });
    if (key === 'c' && o.chows) return chooseChow(o.chows, kindOf(app.match.hand.discard.id));
    if (key === 'x' && o.type !== 'act') return answer({ type: 'pass' });
    if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && document.activeElement?.closest('#handKeys')) {
      const keys = $$('#handKeys button'),
        at = keys.indexOf(document.activeElement),
        next = keys[Math.max(0, Math.min(keys.length - 1, at + (event.key === 'ArrowLeft' ? -1 : 1)))];
      next?.focus();
      event.preventDefault();
    }
  },
  true
);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && app.screen === 'play') openMenu();
});

// ——— Start ———
async function boot() {
  fit();
  if (document.fonts?.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
  atlas = paintAtlas();
  app.atlas = atlas;
  await buildEngine(innerHeight > innerWidth);
  fit();
  app.felt = createFelt($('#felt'), atlas, kindOf);
  onLanguage(() => {});
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-Hant' : 'en';
  paintRules();
  paintSettings();
  paintRecord();
  paintMenu();
  paintTools();
  $('#loading').hidden = true;
  show('title');
  $('#startButton').focus();
  app.ready = true;
}

/** For tests: the app, the rules and a way to start. */
window.mahjong = {
  app,
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
