// 页面入口：建好游戏、存档、声音、语义树和键位，然后在画面之间切换。舞台的宽高按屏幕的方向定：横着是 960×540，
// 竖着是 540×960；手机一转，画面层整个重建，规则的状态（src/sim）不受影响，正在画的一局接着画。
// The page's entry: makes the game, the save, the sound, the semantic tree and the keys, then moves between the
// screens. The stage follows the screen's shape: 960 × 540 when wide, 540 × 960 when tall; when a phone is turned the
// view is made again as a whole, and the state of the rules (src/sim) is untouched: a round goes on where it was.
import { createInputActions } from '@egret/engine/kit';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserGame } from '@egret/engine/web/game';
import { bindBrowserInputActions, browserSaveStorage } from '@egret/engine/web/kit';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { createSound } from './audio/sound.mjs';
import { getLanguage, setLanguage, t } from './i18n.mjs';
import { fillSave, openSave } from './saves.mjs';
import { settled } from './sim/sand.mjs';
import { endScreen, pickScreen, playScreen, settingsScreen, titleScreen, unpaintScreen } from './screens.mjs';

const params = new URLSearchParams(location.search),
  frameHost = document.querySelector('#frame'),
  SCREENS = { title: titleScreen, pick: pickScreen, play: playScreen, unpaint: unpaintScreen, end: endScreen, settings: settingsScreen };

// The save: what an unreadable save or a refusing browser means is said on the title.
const problems = [];
const save = openSave(browserSaveStorage(), navigator.language?.startsWith('zh') ? 'zh' : 'en', (problem) => problems.push(problem.kind));
// Saves from before the endless tray and the unpaint mode get their new fields.
if (save.data.bestEndless === undefined || !save.data.unpainted) save.update((data) => void fillSave(data));
const settings = save.data.settings;
setLanguage(params.get('lang') ?? settings.language);

// Named actions over keys and gamepads, read each frame. A key that a focused control used presses no action.
const actions = createInputActions({
  move: { kind: 'axis', negative: ['Key:KeyA', 'Key:ArrowLeft', 'Pad:left'], positive: ['Key:KeyD', 'Key:ArrowRight', 'Pad:right'] },
  turn: { bindings: ['Key:ArrowUp', 'Key:KeyW', 'Key:KeyQ', 'Pad:y'] },
  drop: { bindings: ['Key:Space', 'Key:ArrowDown', 'Key:KeyS', 'Pad:a'] },
  cracker: { bindings: ['Key:KeyF', 'Pad:l2'] },
  slot1: { bindings: ['Key:Digit1', 'Pad:l1'] },
  slot2: { bindings: ['Key:Digit2', 'Pad:x'] },
  slot3: { bindings: ['Key:Digit3', 'Pad:r1'] },
  slot4: { bindings: ['Key:Digit4'] },
  slot5: { bindings: ['Key:Digit5'] },
  confirm: { bindings: ['Key:Enter', 'Pad:start'] },
  back: { bindings: ['Key:Escape', 'Pad:b'] }
});

const app = {
  game: null,
  stage: { width: 960, height: 540 },
  save,
  sound: { play() {}, setOn() {} },
  semantics: createUiSemantics(),
  actions,
  seed: Number(params.get('seed') ?? Date.now() % 100000),
  round: null,
  vibrate: (ms) => settings.reducedMotion || navigator.vibrate?.(ms),
  touch: params.has('touch') || matchMedia('(pointer: coarse)').matches,
  reducedMotion: settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches,
  notice: null,
  rounds: 0,
  screenName: 'title',
  /** Move to a screen by name; the one before is let go once the next is made. */
  go(name, options = {}) {
    going = going.then(() => show(name, options)).catch((cause) => console.error(cause));
    return going;
  },
  setSetting(key, value) {
    const kept = save.update((data) => {
      data.settings[key] = value;
    });
    if (!kept) app.notice = t('saveRefused');
    if (key === 'sound') app.sound.setOn(value);
    if (key === 'reducedMotion') app.reducedMotion = value || matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  switchLanguage(language = getLanguage() === 'zh' ? 'en' : 'zh') {
    app.setSetting('language', language);
    setLanguage(language);
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    return app.go(app.screenName);
  }
};
document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
// What went wrong with the save, said once on the title: a save started again, or a browser that will not keep one.
if (problems.some((kind) => kind !== 'write-failed')) app.notice = t('saveReset');

// The page's canvas under the engine's: screens paint what never moves there once (see style.css), in stage units.
const back = document.createElement('canvas');
back.id = 'back';
frameHost.prepend(back);
const backdrop = {
  draw: null,
  /** Paint `draw(g)` under the stage, now and whenever the stage's size on the page changes; null clears it. */
  set(draw) {
    backdrop.draw = draw;
    backdrop.repaint();
  },
  repaint() {
    const stage = frameHost.querySelector('#stage'),
      cssWidth = parseFloat(stage?.style.width) || stage?.clientWidth || 0,
      cssHeight = parseFloat(stage?.style.height) || stage?.clientHeight || 0,
      ratio = Math.min(2, window.devicePixelRatio || 1),
      w = Math.max(1, Math.round(cssWidth * ratio)),
      h = Math.max(1, Math.round(cssHeight * ratio));
    back.style.width = cssWidth + 'px';
    back.style.height = cssHeight + 'px';
    if (back.width !== w || back.height !== h) Object.assign(back, { width: w, height: h });
    const g = back.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.setTransform(w / app.stage.width, 0, 0, h / app.stage.height, 0, 0);
    backdrop.draw?.(g);
  }
};
app.backdrop = backdrop;
const fitted = new ResizeObserver(() => backdrop.repaint());

let screen = null,
  going = Promise.resolve(),
  projection = null,
  browserActions = null,
  options = {};

// Screens with nothing moving (the title, the choosers, the end, the settings) let the engine's frame loop rest a
// moment after the last touch or key; any touch, key or wheel wakes it. A software-drawn page then costs nothing
// while it waits.
const STILL = new Set(['title', 'pick', 'end', 'settings']);
let resting = null;
function wake() {
  clearTimeout(resting);
  if (app.game && (app.game.loop.state === 'idle' || app.game.loop.state === 'failed')) app.game.loop.start();
  if (STILL.has(app.screenName)) resting = setTimeout(() => STILL.has(app.screenName) && app.game.loop.stop(), 1500);
}
for (const kind of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'focusin']) window.addEventListener(kind, wake, { capture: true, passive: true });

async function show(name, next) {
  wake();
  const old = screen;
  screen = null;
  old?.dispose();
  backdrop.set(null);
  if (name !== 'play' && name !== 'unpaint') app.sound.stopMusic?.();
  app.sound.setPaused?.(next.paused === true);
  app.screenName = name;
  options = next;
  screen = await SCREENS[name](app, next);
  frameHost.dataset.screen = name;
  app.semantics.publish();
  screen.focusFirst?.();
  wake();
}

/** Make the view for the screen's current shape: a new canvas, a new game, the same app and save. */
async function boot() {
  const tall = frameHost.clientHeight > frameHost.clientWidth;
  app.stage = tall ? { width: 540, height: 960 } : { width: 960, height: 540 };
  // WebGPU where the browser has a working adapter, WebGL2 otherwise; ?backend= picks one by hand.
  const backend = params.get('backend') ?? ((await navigator.gpu?.requestAdapter?.().catch(() => null)) ? 'webgpu' : 'webgl2');
  const canvas = document.createElement('canvas');
  canvas.id = 'stage';
  canvas.tabIndex = 0;
  frameHost.querySelector('#stage')?.remove();
  frameHost.append(canvas);
  fitted.disconnect();
  fitted.observe(canvas);
  app.game = await createBrowserGame({
    canvas,
    width: app.stage.width,
    height: app.stage.height,
    backend,
    fit: 'contain',
    fitTo: frameHost,
    // The night sky is the canvas's own CSS background (style.css): drawn by the page once, not by the engine each
    // frame. As a full-screen gradient or picture in the stage it halved the frame rate under software rendering.
    clearColor: 0x1a0e08,
    clearAlpha: 0,
    autoStart: false,
    update: (seconds) => frame(Math.min(seconds, 1 / 20))
  });
  app.sound = await createSound(app.game.scope, { on: settings.sound });
  projection = app.game.scope.use(createBrowserSemantics({ semantics: app.semantics, canvas, width: app.stage.width, height: app.stage.height, label: t('stage'), onError: (cause) => console.warn('semantics', cause) }));
  browserActions = app.game.scope.use(bindBrowserInputActions(actions, { keyTarget: canvas, skipPrevented: true, passKeys: ['Tab', 'F5', 'F11', 'F12'] }));
  canvas.addEventListener('pointerdown', () => canvas.focus({ preventScroll: true }));
  canvas.focus({ preventScroll: true });
  app.game.loop.start();
}

let sinceSync = 0,
  lastFocus = '';
function frame(seconds) {
  browserActions.poll();
  if (actions.justPressed('back')) screen?.escape?.();
  if (actions.justPressed('confirm')) screen?.confirm?.();
  // The round's keys: pick a piece, move it, turn it, drop it.
  const keys = screen?.keys;
  if (keys) {
    ['slot1', 'slot2', 'slot3', 'slot4', 'slot5'].forEach((name, slot) => actions.justPressed(name) && keys.choose(slot));
    const move = actions.value('move');
    if (move) keys.move(move, seconds);
    if (actions.justPressed('turn')) keys.turn();
    if (actions.justPressed('drop')) keys.drop();
    if (actions.justPressed('cracker')) keys.cracker?.();
  }
  screen?.update?.(seconds);
  // Parts are painted again only when the keyboard focus moves or shows.
  const focus = app.game.keyboard?.getSnapshot(),
    key = `${focus?.focusedId}|${focus?.focusVisible}`;
  if (key !== lastFocus) {
    lastFocus = key;
    screen?.kit?.repaint();
  }
  sinceSync += seconds;
  if (sinceSync > 0.1) {
    sinceSync = 0;
    app.semantics.publish();
    projection.sync();
  }
  actions.endFrame();
}

// A turned phone or a resized window that changes the shape: the view is made again on the same screen.
let rebuilding = null;
window.addEventListener('resize', () => {
  clearTimeout(rebuilding);
  rebuilding = setTimeout(() => {
    going = going.then(async () => {
      const tall = frameHost.clientHeight > frameHost.clientWidth;
      if (tall === (app.stage.height > app.stage.width)) return;
      const paused = screen?.paused === true;
      const settlement = screen?.settlement;
      screen?.dispose();
      screen = null;
      await app.game.dispose();
      await boot();
      // The view can be new even while the current round and its pause state stay put.
      await show(app.screenName, { ...options, resume: true, paused, settlement });
    });
  }, 250);
});

await boot();
document.querySelector('#loading')?.remove();
await app.go(params.get('screen') ?? 'title');

// For tests and for anyone curious, from the console.
window.egretGame = {
  app,
  get screen() {
    return app.screenName;
  },
  get ready() {
    return screen !== null;
  },
  /** Whether the round's sand has come to rest, for tests that take pictures of it. */
  isSettled: () => Boolean(app.round) && settled(app.round),
  /** The screen shown now, for tests that time or drive it. */
  get current() {
    return screen;
  }
};
