// 入口：读存档，开一局 play（横屏 1280×720，竖屏 720×1280），然后在标题、选关和工地之间切换；菜单、设置、帮助、
// 手记、结算和问话叠在上面。键盘、鼠标、触屏、手柄都能完整操作。页面参数：?lang=zh|en；?level=1-1（直接进某关）；
// ?all=1（打开全部关卡）；?ref=1（载入参考解，测试用）；?check=1（按语义树自检一遍）；?seed=。
// The entry: read the save, start a play game (1280×720 wide, 720×1280 tall), then move between the title, the level
// choice and the site, with the menu, settings, help, notes, results and questions over them. Keys, mouse, touch and
// gamepad each play all of it. Page parameters: ?lang=zh|en; ?level=1-1 (straight to a level); ?all=1 (every level
// open); ?ref=1 (load the reference drawing, for tests); ?check=1 (a self check through the semantic tree); ?seed=.
import { Sprite } from '@egret/engine';
import { play } from '@egret/engine/play';
import { createUiSemantics, semanticBoundsOf } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { planScreen } from '@egret/engine/web/screen';
import { createSound } from './audio/sound.mjs';
import { hostStorage, openSave, freshSave } from './saves.mjs';
import { GRID, lengthOf } from './sim/design.mjs';
import { LEVELS, levelById } from './sim/levels.mjs';
import * as rules from './sim/run.mjs';
import { say } from './words.mjs';
import { buildScreen } from './view/build.mjs';
import { createFocus, createKit } from './view/kit.mjs';
import { lay, paintMember } from './view/paint.mjs';
import { confirmCard, helpOverlay, levelsScreen, pauseMenu, resultCard, settingsOverlay, tipCard, titleScreen } from './view/screens.mjs';

const params = new URL(location.href).searchParams;
// A WeChat mini game: `wx` is the host's own object, on GameGlobal.
const wxOf = () => (typeof GameGlobal === 'object' && GameGlobal?.wx) || (typeof wx === 'object' ? wx : null);
const host = typeof wxOf()?.getSystemInfoSync === 'function' ? wxOf() : null;
const miniGame = host !== null;
const pageLanguage = params.get('lang') ?? (/^zh\b/i.test(navigator.language ?? 'zh') ? 'zh' : 'en');
const problems = [];
const store = openSave(hostStorage(host), pageLanguage === 'en' ? 'en' : 'zh', (p) => problems.push(p.kind));
if (params.get('lang') === 'zh' || params.get('lang') === 'en') store.update((d) => void (d.settings.language = params.get('lang')));

const semantics = createUiSemantics();
const app = {
  game: null,
  kit: null,
  sound: { play() {}, music() {}, setSound() {}, setMusic() {}, setHidden() {} },
  params,
  miniGame,
  allOpen: params.get('all') === '1',
  seed: Number(params.get('seed') ?? 1),
  tipSeen: new Set(params.get('tips') === '0' ? ['*'] : []),
  keyboardUsed: false,
  notice: null,
  lang: () => store.data.settings.language,
  settings: () => store.data.settings,
  data: () => store.data,
  say: (key, values, lang) => say(lang ?? app.lang(), key, values),
  /** Change the save and keep it; a refused write is said once. */
  update(fn) {
    const kept = store.update((d) => void fn(d));
    if (kept === false && !app.refusedOnce) {
      app.refusedOnce = true;
      app.game?.toast?.(app.say('saveRefused'));
    }
  },
  sandboxVehicles: () => levelById('sandbox').vehicles
};
if (params.get('tips') === '0') for (const id of ['1-1', '2-1', '3-1', '4-1', '5-1']) app.tipSeen.add(id);
if (problems.some((k) => k !== 'write-failed')) app.notice = say(app.lang(), 'saveReset');

// ---- screens and what lies over them ----
// Static WebKit canvases can retain a prior presentation; coalesce one follow-up frame.
let presentationTimer;
function present() {
  app.game.invalidate?.();
  if (miniGame) return;
  clearTimeout(presentationTimer);
  presentationTimer = setTimeout(() => app.game.invalidate?.(), 250);
}
let screen = null,
  screenLayer = null,
  over = null,
  overLayer = null,
  ask = null,
  askLayer = null,
  focus = null,
  busy = false;

const egret = { app, store, rules, levelById, ready: false, screen: null, overlay: null, problems, focusNow: () => focus?.current() };
window.egretGame = egret;
if (host && typeof GameGlobal === 'object') GameGlobal.egretGame = egret;

app.go = async (name, arg) => {
  if (busy) return;
  busy = true;
  egret.busy = true;
  try {
    closeAsk();
    closeOverlay();
    const old = screen;
    screen = null;
    old?.dispose?.();
    if (screenLayer) app.kit.drop(screenLayer);
    screenLayer = new Sprite();
    app.game.ui.addChildAt(screenLayer, 0);
    screen = name === 'build' ? await buildScreen(app, screenLayer, arg) : name === 'levels' ? levelsScreen(app, screenLayer) : titleScreen(app, screenLayer);
    screen.name ??= name;
    screen.arg = arg;
    if (!over && !ask) focus.set(screen.focus ?? [], false, screen.focusStart ?? 0);
    app.sound.scene?.(name);
    app.sound.music(app.settings().music);
  } catch (cause) {
    console.warn('screen', cause);
    showLoadFailure(app.game);
    egret.failed = true;
  } finally {
    busy = false;
    egret.busy = false;
    egret.screen = screen?.name ?? null;
    egret.view = screen;
    present();
  }
};

function openOverlay(kind, make) {
  closeOverlay();
  overLayer = new Sprite();
  app.game.ui.addChild(overLayer);
  over = make(overLayer, () => {
    closeOverlay();
    restoreFocus();
  });
  over.kind = kind;
  focus.set(over.focus ?? []);
  egret.overlay = kind;
  present();
  return over;
}
function closeOverlay() {
  if (!over) return;
  over.dispose?.();
  app.kit.drop(overLayer);
  over = null;
  overLayer = null;
  egret.overlay = null;
}
function closeAsk() {
  if (!ask) return;
  app.kit.drop(askLayer);
  ask = null;
  askLayer = null;
}
function restoreFocus() {
  const items = over?.focus ?? screen?.focus ?? [];
  focus.set(items, false, over ? 0 : screen?.focusStart ?? 0);
  present();
}
app.overlayOpen = () => !!(over || ask);
app.overlay = (kind) => openOverlay(kind, (layer, close) => (kind === 'settings' ? settingsOverlay(app, layer, close) : helpOverlay(app, layer, close)));
app.pauseMenu = (s) => openOverlay('menu', (layer, close) => pauseMenu(app, layer, close, { levelId: s?.level?.id }));
app.showTip = (s, level) => openOverlay('tip', (layer, close) => tipCard(app, layer, level, close));
app.showResult = (s, info) =>
  openOverlay('result', (layer, close) =>
    resultCard(app, layer, info, {
      next: () => app.go('build', nextOf(info.level.id)),
      again: () => {
        close();
        s.closeResult();
      },
      replay: () => {
        close();
        s.replay();
      },
      levels: () => app.go('levels')
    })
  );
const nextOf = (id) => LEVELS[LEVELS.findIndex((l) => l.id === id) + 1]?.id ?? id;
app.confirm = (question, yes) => {
  closeAsk();
  askLayer = new Sprite();
  app.game.ui.addChild(askLayer);
  const previous = focus.current();
  ask = confirmCard(app, askLayer, question, yes, () => {
    closeAsk();
    const items = over?.focus ?? screen?.focus ?? [];
    focus.set(items, false, Math.max(0, items.indexOf(previous)));
  });
  focus.set(ask.focus);
};
app.setLanguage = (lang) => {
  store.update((d) => void (d.settings.language = lang));
  showLanguage(lang);
  const keep = over?.kind === 'settings';
  void app.go(screen?.name ?? 'title', screen?.arg).then(() => keep && app.overlay('settings'));
};
app.setSetting = (key, value) => {
  store.update((d) => void (d.settings[key] = value));
  if (key === 'sound') app.sound.setSound(value);
  if (key === 'music') {
    app.sound.setMusic(value);
    app.sound.music(value);
  }
  if (key === 'reducedMotion') app.game.reducedMotion = value;
};
app.resetProgress = () => {
  store.update((d) => {
    const fresh = freshSave(d.settings.language);
    d.progress = fresh.progress;
    d.designs = fresh.designs;
    d.sandbox = null;
  });
  void app.go('title');
};
/** The reference bridge of a level drawn into a scenery sprite (for the title). */
app.drawReference = (scene, level) => {
  for (const m of level.reference?.members ?? []) {
    const s = paintMember(m[4], lengthOf(m));
    lay(s, m[0] * GRID, m[1] * GRID, m[2] * GRID, m[3] * GRID);
    scene.addChild(s);
  }
};
/** Where views are laid out: the stage, and the part of it no notch or home bar covers. */
app.frame = () => {
  const g = app.game;
  let safe = g.safe ?? { x: 0, y: 0, width: g.width, height: g.height };
  // In a mini game the phone says where its notch and home bar are; the engine's screen plan turns that into the
  // safe part of the stage.
  const info = host?.getSystemInfoSync?.();
  if (info?.safeArea && info.windowWidth) {
    const plan = planScreen({
      box: { width: info.windowWidth, height: info.windowHeight },
      design: { width: 1280, height: 720 },
      portrait: { width: 720, height: 1280 },
      fit: 'expand',
      insets: { top: info.safeArea.top, left: info.safeArea.left, right: info.windowWidth - info.safeArea.right, bottom: info.windowHeight - info.safeArea.bottom }
    });
    safe = { x: plan.safe.x - plan.designRect.x, y: plan.safe.y - plan.designRect.y, width: plan.safe.width, height: plan.safe.height };
  }
  return { screen: { x: 0, y: 0, width: g.width, height: g.height }, safe, orientation: g.height > g.width ? 'portrait' : 'landscape' };
};

// ---- keys ----
function moveFocus(step) {
  app.game.focusVisible = true;
  focus.move(step);
}
function handleKeys(g) {
  const k = g.keys;
  const back = k.pressed('escape', 'pad:b');
  if (ask && back) {
    closeAsk();
    restoreFocus();
    return;
  }
  if (back) {
    if (over) {
      if (over.kind === 'result') return;
      closeOverlay();
      restoreFocus();
    } else if (screen?.back) screen.back();
    else if (screen?.name !== 'title') void app.go('title');
    return;
  }
  const building = screen?.name === 'build' && !over && !ask;
  if (!building) {
    if (k.pressed('pad:down', 'pad:right', 'down', 'right')) moveFocus(1);
    else if (k.pressed('pad:up', 'pad:left', 'up', 'left')) moveFocus(-1);
    if (k.pressed('enter', 'space', 'pad:a') && focus.current()) {
      g.focusVisible = true;
      focus.activate();
    }
  } else if (g.focusVisible && k.pressed('enter') && focus.current()) focus.activate();
  if (g.pointer.pressed && g.focusVisible) g.focusVisible = false;
}

/** The page's language and title follow the game's. */
function showLanguage(lang) {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.title = say(lang, 'pageTitle');
  }
}

let projection = null;
function project(game) {
  projection?.dispose();
  projection = null;
  if (miniGame || !game.canvas) return;
  if (!game.canvas.hasAttribute('tabindex')) game.canvas.tabIndex = 0;
  try {
    projection = createBrowserSemantics({ semantics, canvas: game.canvas, width: game.width, height: game.height, label: say(app.lang(), 'stage'), onError: (cause) => console.warn('semantics', cause) });
  } catch (cause) {
    console.warn('semantics', cause);
  }
  game.canvas.focus?.({ preventScroll: true });
}

/** When something could not be loaded: a word and a button to load again. */
function showLoadFailure(game) {
  const lang = app.lang();
  const words = game.text(say(lang, 'loadFailed'), { x: game.width / 2, y: game.height / 2 - 50, size: 28, color: 0x2b2621, align: 'center', baseline: 'middle' });
  const retry = game.button(say(lang, 'retry'), { x: game.width / 2, y: game.height / 2 + 30, width: 200, height: 54, color: 0xb8432f, textColor: 0xf7f1e3 }, () => location.reload());
  semantics.add({ id: 'load-failed', role: 'alert', describe: () => ({ name: say(lang, 'loadFailed'), bounds: semanticBoundsOf(words) }) });
  semantics.add({ id: 'retry', role: 'button', onActivate: () => location.reload(), describe: () => ({ name: say(lang, 'retry'), bounds: semanticBoundsOf(retry) }) });
}

/**
 * Whether the page draws with a software renderer (SwiftShader, llvmpipe): every pixel costs there, so the canvas is
 * drawn at three quarters of its size and scaled up.
 */
function softwareRendering() {
  if (miniGame || typeof document === 'undefined') return false;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl?.getParameter(gl.RENDERER);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|software/i.test(String(name ?? ''));
  } catch {
    return false;
  }
}
const software = params.get('quality') === 'low' || (params.get('quality') !== 'high' && softwareRendering());
egret.software = software;

let lastShape = '';
const loading = typeof document !== 'undefined' ? document.getElementById('loading') : null;
await play({
  width: 1280,
  height: 720,
  portrait: { width: 720, height: 1280 },
  fit: miniGame ? 'expand' : 'contain',
  background: 0xf0e4c7,
  // A still site (nothing moving while a bridge is drawn) keeps its last frame; a test crossing draws every frame.
  renderMode: 'on-demand',
  ...(software ? { pixelRatio: 0.75 } : {}),
  audio: false,
  saveKey: 'luban-bridge-play',
  semantics,
  async setup(game) {
    app.game = game;
    egret.game = game;
    game.reducedMotion = app.settings().reducedMotion || game.reducedMotion;
    showLanguage(app.lang());
    project(game);
    app.sound = createSound(game.engine.createScope(), { sound: app.settings().sound, music: app.settings().music });
    app.kit = createKit(game, app.sound, { semantics, focused: (sprite) => game.focusVisible && focus?.current()?.sprite === sprite });
    if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('visibilitychange', () => app.sound.setHidden(document.visibilityState === 'hidden'));
    host?.onHide?.(() => app.sound.setHidden(true));
    host?.onShow?.(() => app.sound.setHidden(false));
    lastShape = `${game.width}x${game.height}`;
    const top = new Sprite();
    game.ui.addChild(top);
    focus = createFocus(game, top);
    game.canvas?.addEventListener?.('keydown', (event) => {
      if (event.key !== 'Tab' || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || busy) return;
      event.preventDefault();
      moveFocus(event.shiftKey ? -1 : 1);
    });
    loading?.remove();
    const jump = params.get('level');
    if (jump && levelById(jump)) await app.go('build', jump);
    else if (params.get('screen') === 'levels') await app.go('levels');
    else await app.go('title');
    egret.ready = true;
    if (params.get('check') === '1') import('./check.mjs').then((m) => m.selfCheck(app, egret, semantics)).catch((cause) => console.warn('check', cause));
  },
  update(dt, game) {
    if (!focus) return;
    handleKeys(game);
    screen?.update?.(dt);
    focus.redraw();
  },
  arrange(game) {
    const shape = `${game.width}x${game.height}`;
    if (shape === lastShape) return;
    lastShape = shape;
    project(game);
    if (egret.ready && screen) void app.go(screen.name, screen.arg);
  }
});
