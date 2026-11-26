// Application flow. Rendering and input are delegated to Egret; rules and saves keep their own modules.
import { play } from '@egret/engine/play';
import { createUiScreenStack } from '@egret/engine/ui';
import { createUiTester } from '@egret/engine/ui/testing';
import { browserLanguages, browserSaveStorage, prefersReducedMotion } from '@egret/engine/web/kit';
import { getLanguage, onLanguage, setLanguage, startLanguage, t } from './i18n.mjs';
import { createSeaStick } from './sea-stick.mjs';
import { openSave, recordGame } from './saves.mjs';
import { FIELD, WAVES } from './sim/data.mjs';
import * as rules from './sim/world.mjs';
import { createSound } from './sound.mjs';
import { createView } from './view.mjs';
import { createHud } from './ui-hud.mjs';
import { createUiInput } from './ui-input.mjs';
import { createScreens } from './ui-screens.mjs';
import { createMarketUi } from './ui-market.mjs';

const params = new URLSearchParams(location.search);
const field = document.querySelector('#frame');
const surface = document.querySelector('#surface');
const ui = createUiInput();
const stack = createUiScreenStack({ onError: console.error });
let game, view, sound, hud, stick, screens, market, active;
let ready = false, loadFailed = false, notice = null, announcement = '';
const save = openSave(browserSaveStorage(), startLanguage(browserLanguages()), (problem) => {
  notice = problem.kind === 'write-failed' ? 'saveRefused' : 'saveReset';
});
const settings = () => save.data.settings;
setLanguage(params.get('lang') ?? settings().language);

const app = {
  save, screen: 'loading', hero: 'boy', danger: 0, run: null, picked: null, result: null,
  seed: Number(params.get('seed') ?? Date.now() % 100000),
  get notice() { return notice; }
};
const api = {
  app, rules, ui, start: startGame,
  tester: createUiTester({ semantics: ui.tree, screens: stack }),
  refresh: () => app.screen === 'shop' && market.showShop(),
  get screen() { return app.screen; },
  get ready() { return ready; },
  get game() { return game; },
  get hud() { return hud; },
  get stick() { return stick; }
};
window.nezhaSea = window.egretGame = api;

ui.tree.add({
  id: 'announcer', role: 'status',
  describe: () => ({ name: announcement, hidden: !announcement, bounds: { x: 0, y: 0, width: 1, height: 1 } })
});
function say(words) {
  announcement = words === announcement ? words + ' ' : words;
  ui.tree.publish();
}

function back() {
  if (game.asking) return false;
  if (app.screen === 'guide' || app.screen === 'options') showTitle(app.screen);
  else if (app.screen === 'menu') resume();
  else if (app.screen === 'shop') return market.dismissSale() || market.deselect();
  else return false;
  return true;
}

function clearPage() {
  if (!active) return Promise.resolve();
  const old = active;
  active = undefined;
  if (old.view.visible) old.view.hide();
  return stack.close(old.definition).finally(() => old.view.close());
}

function present(name, next, focus) {
  if (active?.view === next) {
    ui.pick(focus, next);
    return;
  }
  const closing = clearPage();
  app.screen = name;
  field.dataset.screen = name;
  stick?.arrange();
  hud?.enable(false);
  const definition = {
    id: name, layer: name === 'title' ? 'page' : 'popup', back,
    // A market refresh may release its view before the queued route changes.
    open: () => ({ close: () => next.close() })
  };
  active = { definition, view: next };
  void closing.then(() => active?.definition === definition && stack.open(definition)).catch(console.error);
  ui.pick(focus, next);
}

function renderScreen(name, focus) {
  present(name, screens[name](), focus);
}

let lastCanvasSize = '';
function canvasSize() {
  const box = game.canvas.getBoundingClientRect();
  return Math.round(box.width * 100) + ':' + Math.round(box.height * 100);
}

function redraw() {
  lastCanvasSize = canvasSize();
  ui.resize();
  stick?.arrange();
  if (hud && app.run && ['play', 'menu', 'shop', 'levelUp'].includes(app.screen)) {
    hud.arrange();
    hud.enable(app.screen === 'play');
    // The HUD was rebuilt after the overlay. Keep the overlay visually on top.
    if (active && app.screen === 'menu') renderScreen('menu', ui.part);
  }
  if (!active) return;
  if (app.screen === 'shop' || app.screen === 'levelUp') market.layout();
  else if (app.screen !== 'menu') renderScreen(app.screen, ui.part);
}

function showTitle(focus = 'start') {
  app.run = null;
  view.clear();
  hud.close();
  market.reset();
  if (game.paused) game.resume();
  sound.resume();
  sound.music('title', 0.2);
  if (!save.data.unlocked.includes(app.hero)) app.hero = 'boy';
  renderScreen('title', focus);
}
function hero(design) {
  if (!save.data.unlocked.includes(design)) return;
  app.hero = design;
  sound('select', { every: 0.13 });
  showTitle('hero_' + design);
}
function danger(value) {
  app.danger = value;
  sound('select', { every: 0.13 });
  showTitle('danger' + value);
}
function setSetting(key, value) {
  if (!save.update((data) => void (data.settings[key] = value))) notice = 'saveRefused';
}
function setting(key) {
  const value = !settings()[key];
  setSetting(key, value);
  if (key === 'sound') sound.setOn(value);
  if (key === 'music') sound.setMusic(value);
  if (key === 'reducedMotion') game.reducedMotion = value || prefersReducedMotion();
  renderScreen(app.screen, key);
}
function language() {
  const next = getLanguage() === 'zh' ? 'en' : 'zh';
  setSetting('language', next);
  setLanguage(next);
}
function applyLanguage() {
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
  document.title = t('pageTitle');
  game?.canvas.setAttribute('aria-label', t('stage'));
}
onLanguage(() => {
  applyLanguage();
  if (!ready) return;
  if (app.run) hud.arrange();
  if (['options', 'menu'].includes(app.screen)) renderScreen(app.screen, 'language');
  else if (app.screen === 'title') showTitle();
});

function openBattle() {
  void clearPage().catch(console.error);
  app.screen = field.dataset.screen = 'play';
  stick.reset();
  stick.arrange();
  hud.enable(true);
  ui.focusCanvas();
}
function startGame() {
  if (!ready) return;
  app.seed = (app.seed * 7 + 13) % 100000;
  app.run = rules.createRun({ seed: app.seed, hero: app.hero, danger: app.danger });
  app.result = null;
  app.picked = null;
  market.reset();
  view.clear();
  openBattle();
  hud.arrange();
  hud.update();
  sound('wave');
  sound.music('battle', 1 / WAVES);
  if (game.paused) game.resume();
  say(t('wave', { n: 1, total: WAVES }));
}
function nextWave() {
  const run = app.run;
  app.picked = null;
  rules.nextWave(run);
  openBattle();
  sound('wave');
  sound.music(run.boss ? 'boss' : 'battle', run.wave / WAVES);
  say(t('wave', { n: run.wave, total: WAVES }));
}
function chooseLevel(index) {
  if (!rules.chooseLevelUp(app.run, index).ok) return;
  sound('confirm', { every: 0.12 });
  if (app.run.phase === 'levelUp') market.showLevelUp();
  else market.showShop({ fresh: true });
}
function pause() {
  if (app.screen !== 'play') return;
  stick.reset();
  game.pause();
  sound.pause();
  renderScreen('menu', 'resume');
}
function resume() {
  openBattle();
  sound.resume();
  game.resume();
}
function finish() {
  const run = app.run, won = run.phase === 'won';
  let record = { best: false, unlocked: [] };
  const kept = save.update((data) => void (record = recordGame(data, run.hero, run.danger, run.wave, won)));
  if (!kept) notice = 'saveRefused';
  app.result = { won, wave: run.wave, kills: run.kills, level: run.level, merges: run.merges, divines: run.divines, ...record, kept };
  app.screen = 'end';
  stick.retire();
  hud.enable(false);
  sound.stopMusic();
  sound(won ? 'win' : 'lose');
  game.after(game.reducedMotion ? 0.2 : 1.2, () => {
    if (app.screen !== 'end') return;
    hud.close();
    view.clear();
    renderScreen('end', 'again');
    say(t(won ? 'won' : 'lost'));
  });
}

function frame(seconds) {
  if (!ready) return;
  if (app.screen !== 'play' || !app.run) return;
  if (game.keys.pressed('pad:start')) {
    pause();
    return;
  }
  const run = app.run;
  const axis = stick.active ? stick.vector : game.keys.axis();
  const events = [];
  for (let left = seconds; left > 1e-6 && run.phase === 'wave'; left -= 1 / 30) {
    events.push(...rules.step(run, Math.min(left, 1 / 30), axis));
  }
  view.show(run, events, seconds);
  hear(events);
  hud.update();
  if (run.phase === 'levelUp') {
    sound.music('market', 0.3);
    market.showLevelUp();
  } else if (run.phase === 'shop') {
    sound.music('market', 0.4);
    market.showShop({ fresh: true });
  } else if (run.phase === 'won' || run.phase === 'lost') finish();
}

function hear(events) {
  let hits = 0;
  for (const event of events) {
    if (event.type === 'throw' || event.type === 'sweep' || event.type === 'thrust' || event.type === 'lob' || event.type === 'nova' || event.type === 'land') sound(event.type);
    else if (event.type === 'hit' && hits++ < 1) sound('hitSoft', { every: 0.06 });
    else if (event.type === 'kill') sound('splash', { every: 0.07 });
    else if (event.type === 'pearl') sound('pearl', { every: 0.08, volume: 0.6 });
    else if (event.type === 'hurt') sound('ouch', { every: 0.2 });
    else if (event.type === 'level') sound('levelUp');
    else if (event.type === 'boss') {
      sound('boss');
      say(t(event.kind === 'yaksha' ? 'bossYaksha' : 'bossAoBing'));
    } else if (event.type === 'waveEnd') sound('wave', { volume: 0.64 });
  }
  if (app.run && app.run.phase === 'wave') sound.music(app.run.boss ? 'boss' : 'battle', app.run.wave / WAVES);
}

function wireKeys() {
  // Only the game region owns these shortcuts. Tabs and activations use the published canvas controls.
  game.canvas.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (app.screen === 'play' && (key === 'escape' || key === 'p')) {
      event.preventDefault();
      pause();
    } else if (key === 'escape' && !game.asking && active) {
      event.preventDefault();
      if (stack.active === active.definition) void stack.back().catch(console.error);
      else back();
    }
    else if (app.screen === 'levelUp' && /^[1-4]$/.test(key)) {
      event.preventDefault();
      chooseLevel(Number(key) - 1);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') pause();
  });
}

const yieldStartup = () => globalThis.scheduler?.yield?.() ?? new Promise((resolve) => setTimeout(resolve, 0));
applyLanguage();
await play({
  width: FIELD.width, height: FIELD.height, parent: surface, fit: 'expand',
  transparent: true, audio: false, renderMode: 'on-demand', seed: app.seed, semantics: ui.semantics,
  setup(made) {
    game = made;
    ui.attach(made);
    applyLanguage();
    game.reducedMotion = settings().reducedMotion || prefersReducedMotion();
  },
  arrange: () => { if (ready || loadFailed) redraw(); },
  update: frame,
  onError: console.error
});
screens = createScreens(game, app, {
  title: showTitle, start: startGame, hero, danger, language, setting,
  artworkUnavailable: () => { if (ready && app.screen === 'title') renderScreen('title', ui.part); },
  guide: () => renderScreen('guide', 'start'),
  options: () => renderScreen('options', 'close'),
  resume, quit: showTitle
});
const loading = game.loading([async () => {
  await yieldStartup();
  view = createView(game);
  await yieldStartup();
  sound = createSound(game, { on: settings().sound, music: settings().music });
  await view.ready;
  if (game.browser.backend === 'webgpu') {
    // Let the browser frame loop reserve shared storage for the optional atlas warm-up.
    // A busy GPU may skip this frame; it must not turn successful asset loading into an error.
    await yieldStartup();
    await view.primeActorAtlas();
  }
}], { label: t('loading') });
requestAnimationFrame(() => document.querySelector('#boot')?.remove());
try {
  await loading;
} catch (error) {
  loadFailed = true;
  console.warn('Game assets could not be loaded.', error);
  renderScreen('error', 'reload');
}
if (!loadFailed) {
  hud = createHud(game, app, rules, pause);
  stick = createSeaStick(game, () => app.screen === 'play', hud.exclude);
  market = createMarketUi({ game, app, rules, sound, say, present, chooseLevel, nextWave, aliasPart: ui.alias, focusPart: ui.pick });
  wireKeys();
  showTitle();
  ready = true;
}

// Play's arrange hook reports changes to design units/safe bounds. An embedded
// field can keep identical design bounds while its physical CSS pixels shrink.
lastCanvasSize = canvasSize();
const cssResize = new ResizeObserver(() => {
  if ((ready || loadFailed) && canvasSize() !== lastCanvasSize) redraw();
});
cssResize.observe(game.canvas);
