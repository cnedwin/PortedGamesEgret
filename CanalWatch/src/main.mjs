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
import { EARLY_BONUS, FIELD, PLOTS, RAIDERS, REFUND, TOWERS, TOWER_KINDS, WAVES } from './sim/data.mjs';
import * as rules from './sim/world.mjs';
import { paintGround } from './ground.mjs';
import { createLandingPreview } from './landing-preview.mjs';
import { createSound } from './sound.mjs';
import { createView } from './view.mjs';

const params = new URLSearchParams(location.search),
  $ = (selector) => document.querySelector(selector),
  field = $('#field'),
  plotsBox = $('#plots'),
  picker = $('#picker'),
  panels = { title: $('#title'), menu: $('#menu'), end: $('#end') };
const guide = $('#guide') ?? Object.assign(document.createElement('p'), { id: 'guide', className: 'game-guide', hidden: true });
if (!guide.isConnected) $('#bar').after(guide);
const firstPlot = 5;

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
  mode: 'standard',
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
let pickerPlot = null, previewKind = null, feedback = null;
const plotButtons = PLOTS.map(([x, y], plot) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.plot = String(plot);
  button.style.left = `${(x / FIELD.width) * 100}%`;
  button.style.top = `${(y / FIELD.height) * 100}%`;
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => (pickerPlot === plot ? closePicker(true) : openPicker(plot)));
  button.addEventListener('focus', () => {
    if (pickerPlot !== null) return;
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
  pickerPlot = plot;
  previewKind = null;
  plotButtons.forEach((button, i) => button.setAttribute('aria-expanded', String(i === plot)));
  fillPicker();
  picker.hidden = false;
  positionPicker();
  picker.querySelector('button')?.focus({ preventScroll: true });
}

function positionPicker() {
  if (pickerPlot === null || picker.hidden) return;
  const [x, y] = PLOTS[pickerPlot],
    right = x > FIELD.width * 0.55;
  picker.style.left = right ? 'auto' : `calc(${(x / FIELD.width) * 100}% + 30px)`;
  picker.style.right = right ? `calc(${100 - (x / FIELD.width) * 100}% + 30px)` : 'auto';
  // Beside the plot, as high as it can be while the whole picker stays on the map.
  const room = field.clientHeight - picker.offsetHeight - 4,
    wanted = (y / FIELD.height) * field.clientHeight - 60;
  picker.style.top = `${Math.max(4, Math.min(room, wanted))}px`;
}
const pickerLayout = new ResizeObserver(positionPicker);
pickerLayout.observe(field);
pickerLayout.observe(picker);

function closePicker(refocus = false) {
  if (picker.hidden) return;
  const plot = pickerPlot;
  picker.hidden = true;
  pickerPlot = previewKind = null;
  plotButtons.forEach((button) => button.setAttribute('aria-expanded', 'false'));
  view.showReach(null);
  if (refocus && plot !== null) plotButtons[plot].focus({ preventScroll: true });
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

function towerStats(kind, level) {
  const stats = TOWERS[kind].levels[level];
  if (kind === 'gong') {
    return `${t('towerRange', stats)} · ${t('gongStats', { slow: Math.round(stats.slow * 100), haste: Math.round(stats.haste * 100), aura: stats.aura })}`;
  }
  return stats.minRange
    ? `${t('rangeBand', { min: stats.minRange, max: stats.range })} · ${t('impact', stats)}`
    : t('towerStats', stats);
}

function buildPreview(plot, kind) {
  previewKind = kind;
  const cost = TOWERS[kind].levels[0].cost;
  for (const button of picker.querySelectorAll('button[data-kind]')) button.setAttribute('aria-pressed', String(button.dataset.kind === kind));
  const confirm = picker.querySelector('[data-build-confirm]');
  confirm.dataset.cost = String(cost);
  confirm.textContent = t('confirmBuild', { cost });
  confirm.setAttribute('aria-label', t('buildFor', { tower: t(kind), cost }));
  confirm.setAttribute('aria-describedby', 'pickerStats');
  picker.querySelector('#pickerStats').textContent = towerStats(kind, 0);
  showReachOf(plot, kind);
  markAffordable();
}

function fillPicker() {
  const plot = pickerPlot,
    world = app.world,
    tower = world.towers[plot];
  picker.replaceChildren();
  const heading = document.createElement('h2');
  heading.id = 'pickerHeading';
  picker.setAttribute('aria-labelledby', 'pickerHeading');
  picker.append(heading);
  const preview = Object.assign(document.createElement('div'), { className: 'picker-preview' });
  const stats = Object.assign(document.createElement('p'), { id: 'pickerStats' });
  preview.append(stats);
  if (!tower) {
    heading.textContent = t('plotName', { n: plot + 1 });
    for (const [index, kind] of TOWER_KINDS.entries()) {
      const cost = TOWERS[kind].levels[0].cost;
      const show = () => buildPreview(plot, kind);
      const button = option(`${index + 1} · ${t(kind)}`, t(`${kind}Note`), cost, (event) => {
        if (event.pointerType === 'touch' || event.pointerType === 'pen' || event.sourceCapabilities?.firesTouchEvents) show();
        else act('build', kind);
      }, show);
      button.dataset.kind = kind;
      button.setAttribute('aria-label', `${t('buildFor', { tower: t(kind), cost })}. ${t(`${kind}Note`)}`);
      picker.append(button);
    }
    const confirm = option('', null, null, () => act('build', previewKind));
    confirm.dataset.buildConfirm = '';
    confirm.className = 'strong';
    preview.append(confirm);
    picker.append(preview);
    buildPreview(plot, previewKind ?? TOWER_KINDS[0]);
  } else {
    heading.textContent = `${t(tower.kind)} · ${t('level', { n: tower.level + 1 })}`;
    const showLevel = (level) => {
      stats.textContent = towerStats(tower.kind, level);
      view.showReach(plot, tower.kind, level);
    };
    const next = TOWERS[tower.kind].levels[tower.level + 1];
    if (next) {
      const button = option(t('upgradeFor', { n: tower.level + 2, cost: next.cost }), null, next.cost, () => act('upgrade'), () => showLevel(tower.level + 1));
      button.setAttribute('aria-label', t('upgradeFor', { n: tower.level + 2, cost: next.cost }));
      picker.append(button);
    } else picker.append(Object.assign(document.createElement('p'), { textContent: t('topLevel') }));
    const back = Math.floor(tower.paid * REFUND);
    const sellButton = option(t('sellFor', { n: back }), null, null, () => act('sell'), () => showLevel(tower.level));
    picker.append(sellButton);
    picker.append(preview);
    showLevel(tower.level);
  }
  const cancel = option(t('cancel'), null, null, () => closePicker(true));
  cancel.className = 'picker-cancel';
  picker.append(cancel);
  markAffordable();
}

/** Grey out what the silver will not buy; it can still be focused, and says why when pressed. */
function markAffordable() {
  for (const button of picker.querySelectorAll('button[data-cost]')) {
    const unavailable = String(Number(button.dataset.cost) > app.world.silver);
    if (button.getAttribute('aria-disabled') !== unavailable) button.setAttribute('aria-disabled', unavailable);
  }
}

function act(what, kind) {
  const world = app.world,
    plot = app.selected;
  if (app.screen !== 'play' || !world || plot === null) return;
  const result = what === 'build' ? rules.build(world, plot, kind) : what === 'upgrade' ? rules.upgrade(world, plot) : rules.sell(world, plot);
  if (!result.ok) {
    if (result.why === 'silver') showFeedback('needSilver', { n: rules.priceOf(world, plot, kind) - world.silver });
    return;
  }
  sound(what === 'sell' ? 'down' : 'build');
  view.show(world, []);
  refreshPlots();
  closePicker(true);
  showReachOf(plot);
  const tower = world.towers[plot];
  if (what === 'sell') showFeedback('sold', { n: result.silver });
  else showFeedback(what === 'build' ? 'built' : 'upgraded', { tower: t(tower.kind), n: tower.level + 1 });
}

// ---- The bar. ----
const bar = { silver: $('#silver'), lives: $('#lives'), wave: $('#wave'), call: $('#call'), speed: $('#speed'), menu: $('#menuButton'), gates: [$('#gate0'), $('#gate1')] };
const put = (node, words) => node.textContent !== words && (node.textContent = words);
const label = (node, words) => node.getAttribute('aria-label') !== words && node.setAttribute('aria-label', words);
const wavesOf = (world) => world.waves ?? WAVES;
const isIntercept = (world) => world?.mode === 'intercept';

const landingButton = Object.assign(document.createElement('button'), { type: 'button', hidden: true });
landingButton.dataset.landingPreview = '';
landingButton.setAttribute('aria-pressed', 'false');
landingButton.setAttribute('aria-describedby', guide.id);
bar.menu.after(landingButton);
let previewBoat = null;

function previewWords(boat) {
  return t('landingSelected', { ship: t(boat.kind === 'flagship' ? 'shipFlagship' : 'shipJunk'), n: RAIDERS[boat.kind].crew });
}

function syncLandingButton(world) {
  const visible = app.screen === 'play' && isIntercept(world) && world.raiders.some((boat) => boat.hp > 0 && RAIDERS[boat.kind].crew);
  if (landingButton.hidden === visible) {
    if (!visible && document.activeElement === landingButton) bar.speed.focus({ preventScroll: true });
    landingButton.hidden = !visible;
  }
  const pressed = String(visible && Boolean(previewBoat));
  if (landingButton.getAttribute('aria-pressed') !== pressed) landingButton.setAttribute('aria-pressed', pressed);
  put(landingButton, t('landingPreview'));
  label(landingButton, t('landingPreviewName'));
}

const landingPreview = createLandingPreview({
  canvas: game.canvas,
  view,
  world: () => app.screen === 'play' && isIntercept(app.world) ? app.world : null,
  onSelect(boat) {
    const changed = previewBoat?.id !== boat?.id;
    previewBoat = boat;
    if (app.screen !== 'play' || !app.world) return;
    if (changed && boat) feedback = null;
    if (changed) say(boat ? previewWords(boat) : t('landingCleared'));
    syncLandingButton(app.world);
    refreshGuide(app.world);
  }
});
landingButton.addEventListener('click', () => landingPreview.cycle());
bar.call.addEventListener('click', () => callWave());
bar.speed.addEventListener('click', () => setSpeed(app.speed === 3 ? 1 : app.speed + 1));
bar.menu.addEventListener('click', () => openMenu());
bar.gates.forEach((button, index) => button.addEventListener('click', () => shutGate(index)));

function showFeedback(key, values) {
  feedback = { key, values, expires: performance.now() + 2400 };
  say(t(key, values));
  refreshBar();
}

function nextRoute(world, wave) {
  const raiders = wavesOf(world)[wave].map(({ kind }) => RAIDERS[kind]);
  const routes = new Set(raiders.map(({ way }) => way));
  const route = t(routes.size > 1 ? 'routeBoth' : routes.has('water') ? 'routeWater' : 'routeRoad');
  return isIntercept(world) && raiders.some(({ crew }) => crew) ? t('routeWithCrew', { route }) : route;
}

function gateReadiness(world) {
  const [upper, lower] = world.gates.map(({ cooldownLeft }) => cooldownLeft <= 0);
  if (upper && lower) return t('gatesBothReady');
  if (upper || lower) return t('gateOneReady', { gate: t(upper ? 'gateUpper' : 'gateLower') });
  return t('gatesCooling');
}

function incomingBoats(world, gate) {
  if (!isIntercept(world) || gate.cooldownLeft > 0 || gate.shutLeft > 0) return 0;
  let count = 0;
  for (const boat of world.raiders) {
    if (boat.way !== 'water' || boat.hp <= 0 || boat.s > gate.at) continue;
    const speed = RAIDERS[boat.kind].speed * (1 - boat.slow);
    if (gate.at - 14 - boat.s <= speed * 2) count++;
  }
  return count;
}

function refreshGuide(world) {
  const preparing = world.state === 'ready';
  const firstBuild = preparing && !world.towers.some(Boolean);
  plotButtons[firstPlot].classList.toggle('recommended', firstBuild);
  let message = '', state = 'active';
  if (feedback?.expires > performance.now()) {
    message = t(feedback.key, feedback.values);
    state = 'feedback';
  } else if (isIntercept(world) && previewBoat) {
    message = previewWords(previewBoat);
    state = 'preview';
  } else if (isIntercept(world) && preparing) {
    const route = nextRoute(world, 0);
    message = firstBuild ? t('interceptSetup', { route }) : t('interceptReady', { route, gates: gateReadiness(world) });
    state = 'prepare';
  } else if (isIntercept(world) && (world.state === 'break' || world.state === 'wave')) {
    const waiting = world.state === 'break';
    const wave = world.wave + Number(waiting);
    message = t(waiting ? 'interceptBetween' : 'interceptActive', {
      n: wave + 1, route: nextRoute(world, wave), gates: gateReadiness(world),
    });
    state = waiting ? 'between' : 'active';
  } else if (preparing) {
    message = t(firstBuild ? 'prepareFirst' : 'prepareDefence');
    state = 'prepare';
  } else if (world.state === 'break' && world.wave + 1 < wavesOf(world).length) {
    message = t('nextWaveRoute', { n: world.wave + 2, route: nextRoute(world, world.wave + 1) });
    state = 'between';
  } else if (world.state === 'wave') {
    message = world.wave === 0 ? t('firstWaveActive') : t('activeWaveRoute', { n: world.wave + 1, route: nextRoute(world, world.wave) });
  }
  if (guide.dataset.state !== state) guide.dataset.state = state;
  put(guide, message);
}

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
    world.state === 'ready' ? t('waveReady', { s: seconds }) : world.state === 'break' ? t('waveBreak', { n: world.wave + 2, s: seconds }) : t('wave', { n: Math.max(1, world.wave + 1), total: wavesOf(world).length })
  );
  const waiting = world.state === 'ready' || world.state === 'break',
    bonus = Math.floor(Math.max(0, world.breakLeft) * EARLY_BONUS);
  put(bar.call, waiting ? t(world.state === 'ready' ? 'callFirst' : 'callWaveBonus', { n: bonus }) : t('waveUnderway'));
  label(bar.call, waiting ? t('callWaveName', { n: bonus }) : t('waveUnderway'));
  bar.call.setAttribute('aria-disabled', String(!waiting));
  put(bar.speed, t('speed', { n: app.speed }));
  label(bar.speed, t('speedName', { n: app.speed }));
  put(bar.menu, t('pause'));
  world.gates.forEach((gate, index) => {
    const name = t(index ? 'gateLower' : 'gateUpper'),
      button = bar.gates[index],
      near = incomingBoats(world, gate);
    const words = gate.shutLeft > 0 ? t('gateShut', { gate: name, s: Math.ceil(gate.shutLeft) }) : gate.cooldownLeft > 0 ? t('gateCooling', { gate: name, s: Math.ceil(gate.cooldownLeft) }) : near ? t('gateNear', { gate: name, n: near }) : t('gateReady', { gate: name });
    put(button, words);
    label(button, near ? t('gateNearName', { gate: name, n: near }) : words);
    button.classList.toggle('has-incoming', near > 0);
    button.classList.toggle('shut', gate.shutLeft > 0);
    button.classList.toggle('cooling', gate.shutLeft === 0 && gate.cooldownLeft > 0);
    button.setAttribute('aria-disabled', String(gate.cooldownLeft > 0));
  });
  if (!picker.hidden) markAffordable();
  syncLandingButton(world);
  refreshGuide(world);
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
  if (app.screen !== 'play' || !world) return;
  const result = rules.callWave(world);
  if (result.ok) {
    announceWave(world.wave);
    refreshBar();
  } else showFeedback('waveUnderway');
}

function shutGate(index) {
  const world = app.world;
  if (app.screen !== 'play' || !world) return;
  const result = rules.shutGate(world, index);
  const gate = t(index ? 'gateLower' : 'gateUpper');
  if (result.ok) {
    sound('gate');
    showFeedback('gateBoatHint', { gate });
    view.show(world, []);
  } else if (result.why === 'cooling') {
    const { shutLeft, cooldownLeft } = world.gates[index];
    showFeedback(shutLeft > 0 ? 'gateShut' : 'gateCooling', { gate, s: Math.ceil(shutLeft || cooldownLeft) });
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
  feedback = null;
  sound('wave');
  const words = wavesOf(app.world)[wave].some((group) => group.kind === 'flagship') ? t('flagship') : t('waveStarts', { n: wave + 1 });
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
  if (isIntercept(world)) landingPreview.update();
  view.show(world, events);
  for (const event of events) {
    if (event.type === 'wave') announceWave(event.wave);
    else if (event.type === 'leak') say(t('leak', { n: event.lives }));
    else if (event.type === 'gate' && event.open) say(t('gateOpenSay', { gate: t(event.gate ? 'gateLower' : 'gateUpper') }));
    else if (event.type === 'won' || event.type === 'lost') finish(world);
  }
  if (world.state === 'wave' || world.state === 'break') sound.music((world.wave + 1) / wavesOf(world).length);
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
  guide.hidden = covered;
  if (covered) panels[name].querySelector('button')?.focus({ preventScroll: true });
}

const sheet = (panel, html) => {
  panel.innerHTML = `<div class="sheet">${html}</div>`;
  return panel.firstElementChild;
};
const starsText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

function switchesHtml() {
  const s = settings();
  const one = (key, on) => `<button type="button" data-setting="${key}" aria-pressed="${on}">${t('switchState', { name: t(key), state: t(on ? 'on' : 'off') })}</button>`;
  return `<div class="row settings-row">${one('sound', s.sound)}${one('music', s.music)}${one('reducedMotion', s.reducedMotion)}<button type="button" data-language aria-label="${t('languageName')}" lang="${getLanguage() === 'zh' ? 'en' : 'zh-CN'}">${t('language')}</button></div>`;
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
  app.mode = 'standard';
  delete $('#frame').dataset.mode;
  app.world = null;
  landingPreview.clear();
  syncLandingButton(null);
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
    `<p class="era">${t('era')}</p>
     <h1>${t('title')}</h1>
     <p class="tagline">${t('tagline')}</p>
     ${notice ? `<p class="notice" role="status">${t(notice)}</p>` : ''}
     <div class="row difficulty">${choice('normal')}${choice('hard')}</div>
     <button type="button" class="intercept-choice" data-intercept><span>${t('intercept')}</span><small>${t('interceptNote')}</small></button>
     <details class="field-manual"><summary>${t('howTitle')}</summary>
       <ul><li>${t('how1')}</li><li>${t('how2')}</li><li>${t('how3')}</li></ul>
       <p>${t('keysLine')}</p>
     </details>
     <h2>${t('settings')}</h2>
     ${switchesHtml()}`
  );
  for (const button of root.querySelectorAll('[data-start]')) button.addEventListener('click', () => startGame(button.dataset.start));
  root.querySelector('[data-intercept]').addEventListener('click', () => startGame('normal', 'intercept'));
  wireSwitches(root, (key) => showTitle(key));
  openPanel('title');
  if (focusKey) root.querySelector(`[data-setting="${focusKey}"]`)?.focus();
}

function startGame(difficulty = app.difficulty, mode = 'standard') {
  landingPreview.clear();
  app.difficulty = difficulty;
  if (mode === 'standard') app.seed = (app.seed * 7 + 13) % 100000;
  app.world = rules.createWorld(mode === 'intercept' ? 1 : app.seed, difficulty, { mode });
  app.mode = mode;
  $('#frame').dataset.mode = mode;
  app.screen = 'play';
  app.selected = null;
  app.result = null;
  feedback = null;
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
  plotButtons[firstPlot].focus({ preventScroll: true });
}

function openMenu(focusKey) {
  if (app.screen !== 'play') return;
  closePicker();
  game.pause();
  app.screen = 'menu';
  landingPreview.clear();
  syncLandingButton(app.world);
  const root = sheet(
    panels.menu,
    `<h2 id="menuHeading">${t('paused')}</h2>
     <div class="row"><button type="button" class="strong" data-do="resume">${t('resume')}</button><button type="button" data-do="restart">${t('restart')}</button><button type="button" data-do="quit">${t('quit')}</button></div>
     <h2>${t('settings')}</h2>
     ${switchesHtml()}`
  );
  panels.menu.setAttribute('aria-labelledby', 'menuHeading');
  root.querySelector('[data-do=resume]').addEventListener('click', closeMenu);
  root.querySelector('[data-do=restart]').addEventListener('click', () => startGame(app.difficulty, app.mode));
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
  refreshBar();
  bar.menu.focus({ preventScroll: true });
}

function finish(world) {
  const stars = rules.starsOf(world);
  const intercept = isIntercept(world) ? { ...world.intercept, held: world.intercept.held.slice() } : null;
  let best = false;
  const kept = intercept !== null || save.update((data) => void (best = recordGame(data, app.difficulty, stars)));
  if (!kept) notice = 'saveRefused';
  app.result = { won: world.state === 'won', stars, best, lives: world.lives, wave: world.wave + 1, waves: wavesOf(world).length, kills: world.kills, kept, intercept };
  game.sfx.play(world.state === 'won' ? 'win' : 'lose');
  sound.stopMusic();
  app.screen = 'end';
  landingPreview.clear();
  syncLandingButton(world);
  closePicker();
  game.after(game.reducedMotion ? 0.2 : 1, showEnd);
}

function interceptResults({ held, landed, crewStopped, crewLeaked }) {
  const row = (key, value) => `<div><dt>${t(key)}</dt><dd>${value}</dd></div>`;
  return `<dl class="intercept-results">
    ${row('interceptedUpper', held[0])}${row('interceptedLower', held[1])}
    ${row('crewLanded', landed)}${row('crewStopped', crewStopped)}${row('crewLeaked', crewLeaked)}
  </dl>`;
}

function showEnd() {
  const r = app.result;
  if (!r) return;
  const title = t(r.intercept ? (r.won ? 'interceptWon' : 'interceptLost') : r.won ? 'won' : 'lost');
  const note = t(r.won ? (r.intercept ? 'interceptWonNote' : 'wonNote') : 'lostNote', r);
  const root = sheet(
    panels.end,
    `<h1 id="endHeading">${title}</h1>
     <p>${note}</p>
     ${r.intercept ? interceptResults(r.intercept) : r.won ? `<p class="stars" aria-label="${t('stars', { n: r.stars })}">${starsText(r.stars)}</p>` : ''}
     ${r.best ? `<p><strong>${t('newBest')}</strong></p>` : ''}
     ${r.intercept ? '' : `<p>${t('kills', { n: r.kills })}</p>`}
     ${r.kept ? '' : `<p class="notice" role="status">${t('saveRefused')}</p>`}
     <div class="row"><button type="button" class="strong" data-do="again">${t('again')}</button><button type="button" data-do="quit">${t('quit')}</button></div>`
  );
  panels.end.setAttribute('aria-labelledby', 'endHeading');
  root.querySelector('[data-do=again]').addEventListener('click', () => startGame(app.difficulty, app.mode));
  root.querySelector('[data-do=quit]').addEventListener('click', () => showTitle());
  say(title);
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
    if (app.screen === 'menu' && (key === 'escape' || key === 'p')) {
      event.preventDefault();
      if (!event.repeat) closeMenu();
      return;
    }
    if (app.screen !== 'play' || !app.world) return;
    if (event.repeat && /^(escape|enter|[1-4uxqenfp ])$/.test(key)) return event.preventDefault();
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
// Taps away from the picker and plots dismiss it without moving focus or spending silver.
document.addEventListener('pointerdown', (event) => {
  if (pickerPlot !== null && event.target instanceof Element && !event.target.closest('#picker, [data-plot]')) closePicker();
});
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
