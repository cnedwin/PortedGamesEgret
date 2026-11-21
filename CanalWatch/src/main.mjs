// 页面入口：存档、语言、引擎的 play（画布和每帧）、地图上的建造位按钮、顶栏、菜单和结算。按钮都是页面自己的
// 按钮，键盘、触屏和读屏都能用；画布只画地图和会动的东西。规则在 src/sim，这里只把操作交给它、把状态显示出来。
// The page's entry: the save, the language, the engine's play (the canvas and each frame), the plot buttons on the
// map, the bar, the menu and the end. Every control is a button of the page, for keys, touch and screen readers alike;
// the canvas draws only the map and what moves. The rules are in src/sim: this hands them what the player does and
// shows what they hold.
import { play } from '@egret/engine/play';
import { browserLanguages, browserSaveStorage, prefersReducedMotion } from '@egret/engine/web/kit';
import { getLanguage, onLanguage, setLanguage, startLanguage, t } from './i18n.mjs';
import { openSave, recordGame } from './saves.mjs';
import { EARLY_BONUS, FIELD, PLOTS, REFUND, TOWERS, TOWER_KINDS, WAVES } from './sim/data.mjs';
import * as rules from './sim/world.mjs';
import { paintGround } from './ground.mjs';
import { createSound } from './sound.mjs';
import { createView } from './view.mjs';

const params = new URLSearchParams(location.search),
  $ = (selector) => document.querySelector(selector),
  field = $('#field'),
  plotsBox = $('#plots'),
  picker = $('#picker'),
  panels = { title: $('#title'), menu: $('#menu'), end: $('#end') };

// The save, and what went wrong with it, said on the title.
let notice = null;
const save = openSave(browserSaveStorage(), startLanguage(browserLanguages()), (problem) => {
  notice = problem.kind === 'write-failed' ? 'saveRefused' : 'saveReset';
});
const settings = () => save.data.settings;
setLanguage(params.get('lang') ?? settings().language);

const app = {
  save,
  screen: 'title',
  difficulty: params.get('difficulty') === 'hard' ? 'hard' : 'normal',
  world: null,
  selected: null,
  speed: 1,
  result: null,
  seed: Number(params.get('seed') ?? Date.now() % 100000),
  get notice() {
    return notice;
  }
};

/** Keep a setting; a refused write is said once. */
function setSetting(key, value) {
  if (!save.update((data) => void (data.settings[key] = value))) notice = 'saveRefused';
}

// ---- The engine: one call makes the canvas in the map's box and runs the frames. ----
let game, view, sound;
await play({
  width: FIELD.width,
  height: FIELD.height,
  parent: field,
  transparent: true,
  seed: app.seed,
  setup(made) {
    game = made;
    sound = createSound(game, { on: settings().sound, music: settings().music });
    view = createView(game, { sound });
  },
  update: (seconds) => frame(seconds),
  onError: (cause) => console.error(cause)
});
// The silk and the map are the page's, painted once under a clear canvas; the box play put the canvas in is made clear.
paintGround($('#ground'));
Object.assign(game.canvas.parentElement.style, { background: 'transparent', zIndex: '1' });
game.canvas.setAttribute('aria-label', t('stage'));
game.canvas.setAttribute('role', 'img');
if (settings().reducedMotion) game.reducedMotion = true;

// ---- The plot buttons, over the plots of the map. ----
const plotButtons = PLOTS.map(([x, y], plot) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.plot = String(plot);
  button.style.left = `${(x / FIELD.width) * 100}%`;
  button.style.top = `${(y / FIELD.height) * 100}%`;
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => (app.selected === plot && !picker.hidden ? closePicker(true) : openPicker(plot)));
  button.addEventListener('focus', () => {
    app.selected = plot;
    showReachOf(plot);
  });
  button.addEventListener('blur', () => picker.hidden && view.showReach(null));
  plotsBox.append(button);
  return button;
});

function showReachOf(plot, kind) {
  const tower = app.world?.towers[plot];
  if (kind) view.showReach(plot, kind, 0);
  else if (tower) view.showReach(plot, tower.kind, tower.level);
  else view.showReach(null);
}

// ---- The picker: build on an empty plot, or raise or sell a tower. ----
function openPicker(plot) {
  if (app.screen !== 'play') return;
  app.selected = plot;
  plotButtons.forEach((button, i) => button.setAttribute('aria-expanded', String(i === plot && true)));
  fillPicker();
  const [x, y] = PLOTS[plot],
    right = x > FIELD.width * 0.55;
  picker.style.left = right ? 'auto' : `calc(${(x / FIELD.width) * 100}% + 30px)`;
  picker.style.right = right ? `calc(${100 - (x / FIELD.width) * 100}% + 30px)` : 'auto';
  picker.hidden = false;
  // Beside the plot, as high as it can be while the whole picker stays on the map.
  const room = field.clientHeight - picker.offsetHeight - 4,
    wanted = (y / FIELD.height) * field.clientHeight - 60;
  picker.style.top = `${Math.max(4, Math.min(room, wanted))}px`;
  picker.querySelector('button')?.focus();
}

function closePicker(refocus = false) {
  if (picker.hidden) return;
  picker.hidden = true;
  plotButtons.forEach((button) => button.setAttribute('aria-expanded', 'false'));
  view.showReach(null);
  if (refocus && app.selected !== null) plotButtons[app.selected].focus();
}

const option = (words, note, cost, onPick, onLook) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.innerHTML = `<span></span><span class="cost"></span><small></small>`;
  button.children[0].textContent = words;
  button.children[1].textContent = cost === null ? '' : String(cost);
  button.children[2].textContent = note ?? '';
  if (cost !== null) button.dataset.cost = String(cost);
  button.addEventListener('click', onPick);
  if (onLook) {
    button.addEventListener('focus', onLook);
    button.addEventListener('pointerenter', onLook);
  }
  return button;
};

function fillPicker() {
  const plot = app.selected,
    world = app.world,
    tower = world.towers[plot];
  picker.replaceChildren();
  const heading = document.createElement('h2');
  heading.id = 'pickerHeading';
  picker.setAttribute('aria-labelledby', 'pickerHeading');
  picker.append(heading);
  if (!tower) {
    heading.textContent = t('plotName', { n: plot + 1 });
    for (const [index, kind] of TOWER_KINDS.entries()) {
      const cost = TOWERS[kind].levels[0].cost;
      const button = option(`${index + 1} · ${t(kind)}`, t(`${kind}Note`), cost, () => act('build', kind), () => showReachOf(plot, kind));
      button.setAttribute('aria-label', `${t('buildFor', { tower: t(kind), cost })}. ${t(`${kind}Note`)}`);
      picker.append(button);
    }
  } else {
    heading.textContent = `${t(tower.kind)} · ${t('level', { n: tower.level + 1 })}`;
    const next = TOWERS[tower.kind].levels[tower.level + 1];
    if (next) {
      const button = option(t('upgradeFor', { n: tower.level + 2, cost: next.cost }), null, next.cost, () => act('upgrade'), () => view.showReach(plot, tower.kind, tower.level + 1));
      button.setAttribute('aria-label', t('upgradeFor', { n: tower.level + 2, cost: next.cost }));
      picker.append(button);
    } else picker.append(Object.assign(document.createElement('p'), { textContent: t('topLevel') }));
    const back = Math.floor(tower.paid * REFUND);
    const sellButton = option(t('sellFor', { n: back }), null, null, () => act('sell'));
    picker.append(sellButton);
  }
  picker.append(option(t('cancel'), null, null, () => closePicker(true)));
  markAffordable();
}

/** Grey out what the silver will not buy; it can still be focused, and says why when pressed. */
function markAffordable() {
  for (const button of picker.querySelectorAll('button[data-cost]')) button.setAttribute('aria-disabled', String(Number(button.dataset.cost) > app.world.silver));
}

function act(what, kind) {
  const world = app.world,
    plot = app.selected;
  if (!world || plot === null) return;
  const result = what === 'build' ? rules.build(world, plot, kind) : what === 'upgrade' ? rules.upgrade(world, plot) : rules.sell(world, plot);
  if (!result.ok) {
    if (result.why === 'silver') say(t('notEnough'));
    return;
  }
  sound(what === 'sell' ? 'down' : 'build');
  view.show(world, []);
  refreshPlots();
  closePicker(true);
  showReachOf(plot);
}

// ---- The bar. ----
const bar = { silver: $('#silver'), lives: $('#lives'), wave: $('#wave'), call: $('#call'), speed: $('#speed'), menu: $('#menuButton'), gates: [$('#gate0'), $('#gate1')] };
const put = (node, words) => node.textContent !== words && (node.textContent = words);
const label = (node, words) => node.getAttribute('aria-label') !== words && node.setAttribute('aria-label', words);
bar.call.addEventListener('click', () => callWave());
bar.speed.addEventListener('click', () => setSpeed(app.speed === 3 ? 1 : app.speed + 1));
bar.menu.addEventListener('click', () => openMenu());
bar.gates.forEach((button, index) => button.addEventListener('click', () => shutGate(index)));

function refreshBar() {
  const world = app.world;
  if (!world) return;
  put(bar.silver, t('silver', { n: world.silver }));
  label(bar.silver, `${t('silverName')} ${world.silver}`);
  put(bar.lives, t('lives', { n: world.lives }));
  label(bar.lives, `${t('livesName')} ${world.lives}`);
  const seconds = Math.ceil(Math.max(0, world.breakLeft));
  put(
    bar.wave,
    world.state === 'ready' ? t('waveReady', { s: seconds }) : world.state === 'break' ? t('waveBreak', { n: world.wave + 2, s: seconds }) : t('wave', { n: Math.max(1, world.wave + 1), total: WAVES.length })
  );
  const waiting = world.state === 'ready' || world.state === 'break',
    bonus = Math.floor(Math.max(0, world.breakLeft) * EARLY_BONUS);
  put(bar.call, waiting ? t('callWaveBonus', { n: bonus }) : t('callWave'));
  label(bar.call, t('callWaveName', { n: waiting ? bonus : 0 }));
  bar.call.setAttribute('aria-disabled', String(!waiting));
  put(bar.speed, t('speed', { n: app.speed }));
  label(bar.speed, t('speedName', { n: app.speed }));
  put(bar.menu, t('menu'));
  world.gates.forEach((gate, index) => {
    const name = t(index ? 'gateLower' : 'gateUpper'),
      button = bar.gates[index];
    const words = gate.shutLeft > 0 ? t('gateShut', { gate: name, s: Math.ceil(gate.shutLeft) }) : gate.cooldownLeft > 0 ? t('gateCooling', { gate: name, s: Math.ceil(gate.cooldownLeft) }) : t('gateReady', { gate: name });
    put(button, words);
    button.classList.toggle('shut', gate.shutLeft > 0);
    button.classList.toggle('cooling', gate.shutLeft === 0 && gate.cooldownLeft > 0);
    button.setAttribute('aria-disabled', String(gate.cooldownLeft > 0));
  });
  if (!picker.hidden) markAffordable();
}

function refreshPlots() {
  const world = app.world;
  plotButtons.forEach((button, plot) => {
    const tower = world?.towers[plot];
    label(button, tower ? t('plotTower', { n: plot + 1, tower: t(tower.kind), level: tower.level + 1 }) : t('plotEmpty', { n: plot + 1 }));
  });
}

function callWave() {
  const world = app.world;
  if (!world) return;
  const result = rules.callWave(world);
  if (result.ok) announceWave(world.wave);
}

function shutGate(index) {
  const world = app.world;
  if (!world) return;
  if (rules.shutGate(world, index).ok) {
    sound('gate');
    say(t('gateShutSay', { gate: t(index ? 'gateLower' : 'gateUpper') }));
    view.show(world, []);
  }
}

function setSpeed(speed) {
  app.speed = speed;
  game.timeScale = speed;
  refreshBar();
}

let lastSaid = '';
function say(words) {
  const live = $('#say');
  // The same words twice are still read: the region is cleared and written again.
  live.textContent = words === lastSaid ? `${words} ` : words;
  lastSaid = live.textContent;
}

function announceWave(wave) {
  sound('wave');
  const words = WAVES[wave].some((group) => group.kind === 'flagship') ? t('flagship') : t('waveStarts', { n: wave + 1 });
  say(words);
  game.toast(words, { seconds: 2.2, color: 0xf1e7cf });
}

// ---- Each frame: the rules step, the view follows, the bar is written. ----
let sinceBar = 0;
function frame(seconds) {
  const world = app.world;
  if (app.screen !== 'play' || !world) return;
  const events = [];
  for (let left = seconds; left > 1e-6; left -= 0.05) events.push(...rules.step(world, Math.min(left, 0.05)));
  view.show(world, events);
  for (const event of events) {
    if (event.type === 'wave') announceWave(event.wave);
    else if (event.type === 'leak') say(t('leak', { n: event.lives }));
    else if (event.type === 'gate' && event.open) say(t('gateOpenSay', { gate: t(event.gate ? 'gateLower' : 'gateUpper') }));
    else if (event.type === 'won' || event.type === 'lost') finish(world);
  }
  if (world.state === 'wave' || world.state === 'break') sound.music((world.wave + 1) / WAVES.length);
  sinceBar += seconds / Math.max(1, app.speed);
  if (sinceBar > 0.1 || events.length) {
    sinceBar = 0;
    refreshBar();
  }
}

// ---- Screens. ----
function openPanel(name) {
  for (const [key, panel] of Object.entries(panels)) panel.hidden = key !== name;
  const covered = name !== null;
  $('#bar').inert = covered;
  field.inert = covered;
  if (covered) panels[name].querySelector('button')?.focus();
}

const sheet = (panel, html) => {
  panel.innerHTML = `<div class="sheet">${html}</div>`;
  return panel.firstElementChild;
};
const starsText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

function switchesHtml() {
  const s = settings();
  const one = (key, on) => `<button type="button" data-setting="${key}" aria-pressed="${on}">${t('switchState', { name: t(key), state: t(on ? 'on' : 'off') })}</button>`;
  return `<div class="row">${one('sound', s.sound)}${one('music', s.music)}${one('reducedMotion', s.reducedMotion)}<button type="button" data-language aria-label="${t('languageName')}" lang="${getLanguage() === 'zh' ? 'en' : 'zh-CN'}">${t('language')}</button></div>`;
}

function wireSwitches(root, redraw) {
  for (const button of root.querySelectorAll('[data-setting]'))
    button.addEventListener('click', () => {
      const key = button.dataset.setting,
        value = !settings()[key];
      setSetting(key, value);
      if (key === 'sound') sound.setOn(value);
      if (key === 'music') sound.setMusic(value);
      if (key === 'reducedMotion') game.reducedMotion = value || prefersReducedMotion();
      redraw(key);
    });
  root.querySelector('[data-language]')?.addEventListener('click', () => {
    const next = getLanguage() === 'zh' ? 'en' : 'zh';
    setSetting('language', next);
    setLanguage(next);
  });
}

function showTitle(focusKey) {
  app.screen = 'title';
  app.world = null;
  view.clear();
  sound.stopMusic();
  game.timeScale = 1;
  if (game.paused) game.resume();
  $('#bar').hidden = true;
  $('#keys').hidden = true;
  closePicker();
  const best = save.data.best;
  const choice = (difficulty) =>
    `<button type="button" class="choice${difficulty === 'normal' ? ' strong' : ''}" data-start="${difficulty}"><span>${t(difficulty)}</span><small>${t(`${difficulty}Note`)}</small><small class="best">${
      best[difficulty] ? t('bestStars', { stars: starsText(best[difficulty]) }) : t('noBest')
    }</small></button>`;
  const root = sheet(
    panels.title,
    `<h1>${t('title')}</h1>
     <p>${t('tagline')}</p>
     <p class="demo">${t('demo')}</p>
     ${notice ? `<p class="notice" role="status">${t(notice)}</p>` : ''}
     <div class="row">${choice('normal')}${choice('hard')}</div>
     <h2>${t('howTitle')}</h2>
     <ul><li>${t('how1')}</li><li>${t('how2')}</li><li>${t('how3')}</li></ul>
     <p class="demo">${t('keysLine')}</p>
     <h2>${t('settings')}</h2>
     ${switchesHtml()}`
  );
  for (const button of root.querySelectorAll('[data-start]')) button.addEventListener('click', () => startGame(button.dataset.start));
  wireSwitches(root, (key) => showTitle(key));
  openPanel('title');
  if (focusKey) root.querySelector(`[data-setting="${focusKey}"]`)?.focus();
}

function startGame(difficulty = app.difficulty) {
  app.difficulty = difficulty;
  app.seed = (app.seed * 7 + 13) % 100000;
  app.world = rules.createWorld(app.seed, difficulty);
  app.screen = 'play';
  app.selected = null;
  view.clear();
  view.show(app.world, []);
  setSpeed(1);
  if (game.paused) game.resume();
  $('#bar').hidden = false;
  $('#keys').hidden = false;
  put($('#keys'), t('keysLine'));
  refreshBar();
  refreshPlots();
  openPanel(null);
  plotButtons[5].focus();
}

function openMenu(focusKey) {
  if (app.screen !== 'play') return;
  closePicker();
  game.pause();
  app.screen = 'menu';
  const root = sheet(
    panels.menu,
    `<h2 id="menuHeading">${t('paused')}</h2>
     <div class="row"><button type="button" class="strong" data-do="resume">${t('resume')}</button><button type="button" data-do="restart">${t('restart')}</button><button type="button" data-do="quit">${t('quit')}</button></div>
     <h2>${t('settings')}</h2>
     ${switchesHtml()}`
  );
  panels.menu.setAttribute('aria-labelledby', 'menuHeading');
  root.querySelector('[data-do=resume]').addEventListener('click', closeMenu);
  root.querySelector('[data-do=restart]').addEventListener('click', () => startGame(app.difficulty));
  root.querySelector('[data-do=quit]').addEventListener('click', () => showTitle());
  wireSwitches(root, (key) => {
    app.screen = 'play';
    openMenu(key);
  });
  openPanel('menu');
  if (focusKey) root.querySelector(`[data-setting="${focusKey}"]`)?.focus();
}

function closeMenu() {
  app.screen = 'play';
  openPanel(null);
  game.resume();
  bar.menu.focus();
}

function finish(world) {
  const stars = rules.starsOf(world);
  let best = false;
  const kept = save.update((data) => void (best = recordGame(data, app.difficulty, stars)));
  if (!kept) notice = 'saveRefused';
  app.result = { won: world.state === 'won', stars, best, lives: world.lives, wave: world.wave + 1, kills: world.kills, kept };
  game.sfx.play(world.state === 'won' ? 'win' : 'lose');
  sound.stopMusic();
  app.screen = 'end';
  closePicker();
  game.after(game.reducedMotion ? 0.2 : 1, showEnd);
}

function showEnd() {
  const r = app.result;
  if (!r) return;
  const root = sheet(
    panels.end,
    `<h1 id="endHeading">${t(r.won ? 'won' : 'lost')}</h1>
     <p>${r.won ? t('wonNote', { lives: r.lives }) : t('lostNote', { wave: r.wave })}</p>
     ${r.won ? `<p class="stars" aria-label="${t('stars', { n: r.stars })}">${starsText(r.stars)}</p>` : ''}
     ${r.best ? `<p><strong>${t('newBest')}</strong></p>` : ''}
     <p>${t('kills', { n: r.kills })}</p>
     ${r.kept ? '' : `<p class="notice" role="status">${t('saveRefused')}</p>`}
     <div class="row"><button type="button" class="strong" data-do="again">${t('again')}</button><button type="button" data-do="quit">${t('quit')}</button></div>`
  );
  panels.end.setAttribute('aria-labelledby', 'endHeading');
  root.querySelector('[data-do=again]').addEventListener('click', () => startGame(app.difficulty));
  root.querySelector('[data-do=quit]').addEventListener('click', () => showTitle());
  say(t(r.won ? 'won' : 'lost'));
  openPanel('end');
}

// ---- Keys. Caught before play's own key handling, which keeps Tab and Space from the page: here they must still
// move between the page's buttons and press them. ----
window.addEventListener(
  'keydown',
  (event) => {
    event.stopPropagation();
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase(),
      onButton = document.activeElement?.tagName === 'BUTTON';
    if (app.screen === 'menu' && key === 'escape') return closeMenu();
    if (app.screen !== 'play' || !app.world) return;
    const handled = () => event.preventDefault();
    if (key === 'escape') {
      handled();
      return picker.hidden ? openMenu() : closePicker(true);
    }
    if (key === 'enter' && !onButton && app.selected !== null) return handled(), openPicker(app.selected);
    const digit = Number(key);
    if (digit >= 1 && digit <= TOWER_KINDS.length && app.selected !== null && !app.world.towers[app.selected]) return handled(), act('build', TOWER_KINDS[digit - 1]);
    if (key === 'u' && app.selected !== null) return handled(), act('upgrade');
    if (key === 'x' && app.selected !== null) return handled(), act('sell');
    if (key === 'q' || key === 'e') return handled(), shutGate(key === 'q' ? 0 : 1);
    if (key === 'n' || (key === ' ' && !onButton)) return handled(), callWave();
    if (key === 'f') return handled(), setSpeed(app.speed === 3 ? 1 : app.speed + 1);
    if (key === 'p') return handled(), openMenu();
  },
  true
);
// Taps on the map away from a plot close the picker.
game.canvas.addEventListener('pointerdown', () => closePicker());
// A hidden tab pauses a game in play behind the menu, so nothing is lost while the player is away.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && app.screen === 'play') openMenu();
});

// A change of language writes every word again, on whichever screen is shown.
onLanguage(() => {
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
  document.title = t('pageTitle');
  game.canvas.setAttribute('aria-label', t('stage'));
  refreshPlots();
  if (app.screen === 'title') showTitle();
  else if (app.screen === 'menu') {
    app.screen = 'play';
    openMenu();
    panels.menu.querySelector('[data-language]')?.focus();
  } else if (app.screen === 'end') showEnd();
  if (app.world) {
    refreshBar();
    put($('#keys'), t('keysLine'));
    if (!picker.hidden) fillPicker();
  }
  if (app.screen === 'title') panels.title.querySelector('[data-language]')?.focus();
});
document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
refreshPlots();
$('#loading').remove();
if (params.get('screen') === 'play') startGame(app.difficulty);
else showTitle();

// For tests and for anyone curious, from the console.
window.canalWatch = {
  app,
  rules,
  game,
  start: startGame,
  get screen() {
    return app.screen;
  },
  get ready() {
    return true;
  }
};
