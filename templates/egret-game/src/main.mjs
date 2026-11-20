// 页面入口：建好游戏、存档、声音、语义树和键位，然后在画面之间切换。舞台的宽高按屏幕的方向定：横着是 960×540，
// 竖着是 540×960；手机一转，画面层整个重建，规则的状态（src/sim）不受影响。
// The page's entry: makes the game, the save, the sound, the semantic tree and the keys, then moves between the
// screens. The stage follows the screen's shape: 960 × 540 when wide, 540 × 960 when tall; when a phone is turned the
// view is made again as a whole, and the state of the rules (src/sim) is untouched.
import { createInputActions } from '@egret/engine/kit';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserGame } from '@egret/engine/web/game';
import { bindBrowserInputActions, browserSaveStorage } from '@egret/engine/web/kit';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { createSound } from './audio/sound.mjs';
import { getLanguage, setLanguage, t } from './i18n.mjs';
import { openSave } from './saves.mjs';
import { endScreen, playScreen, settingsScreen, titleScreen } from './screens.mjs';

const params = new URLSearchParams(location.search),
  frameHost = document.querySelector('#frame'),
  SCREENS = { title: titleScreen, play: playScreen, end: endScreen, settings: settingsScreen };

// The save: what an unreadable save or a refusing browser means is said on the title.
const problems = [];
const save = openSave(browserSaveStorage(), navigator.language?.startsWith('zh') ? 'zh' : 'en', (problem) => problems.push(problem.kind));
const settings = save.data.settings;
setLanguage(params.get('lang') ?? settings.language);

// Named actions over keys and gamepads, read each frame. A key that a focused control used presses no action.
const actions = createInputActions({
  walkX: { kind: 'axis', negative: ['Key:KeyA', 'Key:ArrowLeft', 'Pad:left'], positive: ['Key:KeyD', 'Key:ArrowRight', 'Pad:right'] },
  walkY: { kind: 'axis', negative: ['Key:KeyW', 'Key:ArrowUp', 'Pad:up'], positive: ['Key:KeyS', 'Key:ArrowDown', 'Pad:down'] },
  confirm: { bindings: ['Key:Enter', 'Pad:a'] },
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
  touch: params.has('touch') || matchMedia('(pointer: coarse)').matches,
  reducedMotion: settings.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches,
  notice: null,
  world: null,
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

let screen = null,
  going = Promise.resolve(),
  projection = null,
  browserActions = null,
  options = {};

async function show(name, next) {
  const old = screen;
  screen = null;
  old?.dispose();
  app.screenName = name;
  options = next;
  screen = await SCREENS[name](app, next);
  frameHost.dataset.screen = name;
  app.semantics.publish();
  screen.focusFirst?.();
}

/** Make the view for the screen's current shape: a new canvas, a new game, the same app and save. */
async function boot() {
  const tall = frameHost.clientHeight > frameHost.clientWidth;
  app.stage = tall ? { width: 540, height: 960 } : { width: 960, height: 540 };
  const canvas = document.createElement('canvas');
  canvas.id = 'stage';
  canvas.tabIndex = 0;
  frameHost.querySelector('#stage')?.remove();
  frameHost.append(canvas);
  app.game = await createBrowserGame({
    canvas,
    width: app.stage.width,
    height: app.stage.height,
    backend: params.get('backend') ?? 'webgl2',
    fit: 'contain',
    fitTo: frameHost,
    clearColor: 0x0b1222,
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
    const tall = frameHost.clientHeight > frameHost.clientWidth;
    if (tall === app.stage.height > app.stage.width) return;
    going = going.then(async () => {
      screen?.dispose();
      screen = null;
      await app.game.dispose();
      await boot();
      // A round in play starts again on the new stage; any other screen is shown as it was.
      await show(app.screenName === 'play' ? 'play' : app.screenName, options);
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
  }
};
