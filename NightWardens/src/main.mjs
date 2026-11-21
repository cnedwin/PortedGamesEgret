// 页面入口：建好游戏、存档、声音、语义树、键位和手柄，载入图集，然后在画面之间切换。舞台按屏幕的方向定：
// 竖着宽 540、高 960 到 1170（随屏幕比例，手机竖拿，最自然的玩法），横着是 960×540；手机一转，画面层整个重建，存档不受影响。
// 渲染后端默认 auto：浏览器给得出 WebGPU 适配器就用 WebGPU，否则用 WebGL2；`?backend=webgl2` 可以指定。
// The page's entry: makes the game, the save, the sound, the semantic tree, the keys and the gamepads, loads the
// atlases, then moves between the screens. The stage follows the screen: 540 wide and 960 to 1170 tall when tall (a
// phone held upright, the natural way to play), 960 × 540 when wide; when a phone is turned the view is made again and the save is
// untouched. The backend is "auto" by default: WebGPU where the browser gives an adapter, WebGL2 otherwise;
// `?backend=webgl2` picks one.
import { createInputActions } from '@egret/engine/kit';
import { bindGamepadKeys } from '@egret/engine/input/gamepad';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserGame } from '@egret/engine/web/game';
import { createBrowserGamepadInput } from '@egret/engine/web/gamepad';
import { bindBrowserInputActions, browserSaveStorage } from '@egret/engine/web/kit';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { loadCommonAtlas, loadParticleTexture } from './art/atlas.mjs';
import { createSound } from './audio/sound.mjs';
import { getLanguage, setLanguage, t } from './i18n.mjs';
import { openSave } from './saves.mjs';
import { endScreen, nightsScreen, playScreen, settingsScreen, titleScreen } from './screens.mjs';

const params = new URLSearchParams(location.search),
  frameHost = document.querySelector('#frame'),
  road = frameHost.insertBefore(Object.assign(document.createElement('div'), { id: 'road' }), frameHost.firstChild),
  SCREENS = { title: titleScreen, nights: nightsScreen, play: playScreen, end: endScreen, settings: settingsScreen };

// The save: what an unreadable save or a refusing browser means is said on the title.
const problems = [];
const save = openSave(browserSaveStorage(), navigator.language?.startsWith('zh') ? 'zh' : 'en', (problem) => problems.push(problem.kind));
const settings = save.data.settings;
setLanguage(params.get('lang') ?? settings.language);

// Named actions over keys and gamepads, read each frame. A key that a focused control used presses no action.
const actions = createInputActions({
  steer: { kind: 'vector', left: ['Key:KeyA', 'Key:ArrowLeft', 'Pad:left'], right: ['Key:KeyD', 'Key:ArrowRight', 'Pad:right'], up: [], down: [], sticks: ['Pad:leftStick'] },
  thunder: { bindings: ['Key:Space', 'Pad:a', 'Pad:r1'] },
  pause: { bindings: ['Key:Escape', 'Key:KeyP', 'Pad:start'] },
  confirm: { bindings: ['Key:Enter'] },
  back: { bindings: ['Key:Escape', 'Pad:b'] },
  pick1: { bindings: ['Key:Digit1', 'Key:Numpad1'] },
  pick2: { bindings: ['Key:Digit2', 'Key:Numpad2'] },
  pick3: { bindings: ['Key:Digit3', 'Key:Numpad3'] }
});

const app = {
  game: null,
  stage: { width: 540, height: 960 },
  save,
  sound: { play() {}, setOn() {}, music() {} },
  semantics: createUiSemantics(),
  actions,
  art: null,
  canvas: null,
  seed: params.has('seed') ? Number(params.get('seed')) : null,
  touch: params.has('touch') || matchMedia('(pointer: coarse)').matches,
  reducedMotion: settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches,
  notice: null,
  world: null,
  screenName: 'title',
  pads: null,
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
    return app.go(app.screenName, options);
  },
  /**
   * Whether a gamepad moves the keyboard focus and presses the focused control (menus and overlays), or plays (the
   * road). In menus the pad's buttons are keys for the focused control; on the road they are the game's actions.
   */
  padMenus(on) {
    if (on && !padKeys && app.game.keyboard && app.pads) padKeys = bindGamepadKeys({ gamepad: app.pads.input, keyboard: app.game.keyboard, map: { b: { key: 'Escape', code: 'Escape' } } });
    if (!on && padKeys) {
      padKeys.dispose();
      padKeys = null;
    }
  },
  /** The picture under the canvas: a CSS background (screens.mjs sets the night's road). */
  setRoad(background) {
    road.style.background = background;
  },
  /** Move the canvas and the road under it together, by CSS pixels: the shake. */
  shakeBy(x, y) {
    const move = x || y ? `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` : '';
    if (road.style.transform !== move) road.style.transform = app.canvas.style.transform = move;
  },
  /** Shake the first gamepad, if it can be shaken. */
  rumble(strong = 0.5, duration = 180) {
    if (!app.reducedMotion) app.pads?.rumble(0, { duration, strong, weak: strong * 0.6 });
  }
};
document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
// What went wrong with the save, said once on the title: a save started again, or a browser that will not keep one.
if (problems.some((kind) => kind !== 'write-failed')) app.notice = t('saveReset');

let screen = null,
  going = Promise.resolve(),
  projection = null,
  browserActions = null,
  padKeys = null,
  options = {};

async function show(name, next) {
  const old = screen;
  screen = null;
  old?.dispose();
  app.screenName = name;
  options = next;
  app.padMenus(name !== 'play');
  screen = await SCREENS[name](app, next);
  frameHost.dataset.screen = name;
  app.semantics.publish();
  screen.focusFirst?.();
}

/** The pictures every screen uses: the common atlas and the particle textures. */
async function loadArt(game) {
  const [common, glow, spark, scrap, smoke] = await Promise.all([
    loadCommonAtlas(game, game.scope),
    loadParticleTexture(game, 'glow', 32),
    loadParticleTexture(game, 'spark', 32),
    loadParticleTexture(game, 'scrap', 16),
    loadParticleTexture(game, 'smoke', 64)
  ]);
  return { common, particles: { glow, spark, scrap, smoke }, wardens: {} };
}

/** Make the view for the screen's current shape: a new canvas, a new game, the same app and save. */
async function boot() {
  const tall = frameHost.clientHeight >= frameHost.clientWidth * 0.9;
  // A tall stage takes the screen's own shape, up to a modern phone's: the extra height goes under the road, where
  // the thumbs are.
  const tallHeight = Math.round(Math.min(1170, Math.max(960, (540 * frameHost.clientHeight) / Math.max(1, frameHost.clientWidth))));
  app.stage = tall ? { width: 540, height: tallHeight } : { width: 960, height: 540 };
  const canvas = document.createElement('canvas');
  canvas.id = 'stage';
  canvas.tabIndex = 0;
  frameHost.querySelector('#stage')?.remove();
  frameHost.append(canvas);
  // The road keeps the size and place of the canvas, which the game fits into the frame.
  new ResizeObserver(() => {
    road.style.width = canvas.style.width;
    road.style.height = canvas.style.height;
  }).observe(canvas);
  app.game = await createBrowserGame({
    canvas,
    width: app.stage.width,
    height: app.stage.height,
    backend: params.get('backend') ?? 'auto',
    fit: 'contain',
    fitTo: frameHost,
    // Clear to nothing: behind the menus the page shows the night's road as the canvas's CSS background.
    clearColor: 0x05060c,
    clearAlpha: 0,
    stats: params.has('stats'),
    autoStart: false,
    update: (seconds) => frame(Math.min(seconds, 1 / 20))
  });
  app.canvas = canvas;
  app.sound = await createSound(app.game.scope, { on: settings.sound });
  app.pads = app.game.scope.use(createBrowserGamepadInput({ onError: (cause) => console.warn('gamepad', cause) }));
  app.art = await loadArt(app.game);
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
  app.pads.poll();
  if (actions.justPressed('pause') && screen?.pause) screen.pause();
  else if (actions.justPressed('back')) screen?.escape?.();
  if (actions.justPressed('confirm')) screen?.confirm?.();
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
    const tall = frameHost.clientHeight >= frameHost.clientWidth * 0.9;
    if (tall === app.stage.height > app.stage.width) return;
    going = going.then(async () => {
      app.padMenus(false);
      screen?.dispose();
      screen = null;
      await app.game.dispose();
      await boot();
      // A night in play starts again on the new stage; any other screen is shown as it was.
      await show(app.screenName, options);
    });
  }, 250);
});

await boot();
document.querySelector('#loading')?.remove();
const firstNight = Number(params.get('night'));
await app.go(params.get('screen') ?? 'title', firstNight ? { night: firstNight } : {});

// For tests and for anyone curious, from the console.
window.egretGame = {
  app,
  get screen() {
    return app.screenName;
  },
  get ready() {
    return screen !== null;
  },
  get view() {
    return screen;
  }
};
