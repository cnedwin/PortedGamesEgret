// 入口：读存档，开一局 play（横屏 1280×720，竖屏 720×1280），载入字体与美术索引，然后在标题、序言、卷目、案件、
// 结案与终卷之间切换。键盘、鼠标、触屏、手柄都翻成同一套操作：移动焦点、确定、返回、卷宗、笔录、提示、平移、缩放。
// 页面参数：?lang=zh|en，?case=c1（直接进某案，测试用），?quality=low|high，?board=1（用字盘写判词，等同小游戏）。
// The entry: read the save, start a play game (1280×720 wide, 720×1280 tall), load the fonts and the art index, then
// move between the title, prologue, case list, cases, closings and the end. Keys, mouse, touch and gamepad all become
// one set of actions: move focus, confirm, back, dossier, notes, hint, pan, zoom. Page parameters: ?lang=zh|en,
// ?case=c1 (straight into a case, for tests), ?quality=low|high, ?board=1 (write the verdict on the word board, as
// in a mini game).
import { play } from '@egret/engine/play';
import { createUiSemantics, semanticBoundsOf } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { Sprite } from '@egret/engine';
import { openSave, pageStorage, settingsOf } from './saves.mjs';
import { caseById } from './sim/cases/index.mjs';
import * as rules from './sim/rules.mjs';
import { currentCase, freshProgress } from './sim/rules.mjs';
import { say } from './words.mjs';
import { openType } from './view/type.mjs';
import { createFocus, createKit } from './view/ui.mjs';
import { createSound } from './audio/sound.mjs';
import { createPictures } from './view/pictures.mjs';
import { caseScreen } from './view/casebook.mjs';
import { SCENES } from './view/scenes.mjs';
import { confirmOverlay, endingScreen, helpOverlay, introScreen, listScreen, outroScreen, prologueScreen, settingsOverlay, titleScreen } from './view/screens.mjs';
import { hitBox } from './view/ui.mjs';

const params = new URL(location.href).searchParams;
const pageLanguage = params.get('lang') ?? (/^zh\b/i.test(navigator.language ?? 'zh') ? 'zh' : 'en');
const problems = [];
const store = openSave(pageStorage(), pageLanguage === 'en' ? 'en' : 'zh', (p) => problems.push(p.kind));
if (params.get('lang') === 'zh' || params.get('lang') === 'en') store.update((d) => void (d.settings.language = params.get('lang')));
// A WeChat mini game: `wx` is the host's own object, on GameGlobal, outside the page names the adapter gives the game.
const wxOf = () => (typeof GameGlobal === 'object' && GameGlobal?.wx) || (typeof wx === 'object' ? wx : null);
const host = typeof wxOf()?.getSystemInfoSync === 'function' ? wxOf() : null;
const miniGame = host !== null;

const app = {
  game: null,
  type: null,
  kit: null,
  sound: null,
  editing: false,
  board: miniGame || params.get('board') === '1',
  // No CanvasKit: paragraphs from labels. A mini game has none; ?plain=1 tries the same on a page.
  plain: miniGame || params.get('plain') === '1',
  quality: miniGame || params.get('quality') === 'low' || (params.get('quality') !== 'high' && (navigator.deviceMemory ?? 8) <= 2) ? 'low' : 'high',
  notice: null,
  lang: () => settingsOf(store.data).language,
  settings: () => settingsOf(store.data),
  progress: () => (store.data.progress ??= freshProgress()),
  save: () => store.save(),
  say: (key, values, lang) => say(lang ?? app.lang(), key, values),
  art: (id) => new URL(`../assets/art/${id}.webp`, import.meta.url).href,
  artInfo: (id) => artIndex[id],
  sceneArt: (caseId) => SCENES[caseId]?.bg ?? 'bg-title'
};
let artIndex = {};
if (problems.length) app.notice = say(app.lang(), 'brokenSave');

let screen = null,
  screenLayer = null,
  over = null,
  overLayer = null,
  focus = null,
  busy = false;

app.setFocus = (list) => focus?.set(list ?? []);

/** Move to another screen: the old one is taken down first. */
app.go = async (name, arg) => {
  if (busy) return;
  busy = true;
  window.egretGame.busy = true;
  try {
    closeOverlay();
    // The old screen stops updating before it is taken down; the next one is built while nothing updates.
    const old = screen;
    screen = null;
    if (old?.dispose) old.dispose();
    if (screenLayer) app.type.discard(screenLayer);
    screenLayer = new Sprite();
    app.game.ui.addChildAt ? app.game.ui.addChildAt(screenLayer, 0) : app.game.ui.addChild(screenLayer);
    const g = app.game;
    if (name === 'begin') {
      name = app.progress().prologue ? 'intro' : 'prologue';
      arg = currentCase(app.progress());
      app.progress().prologue = true;
      app.save();
    }
    if (name === 'resume') {
      arg = currentCase(app.progress());
      name = app.progress().cases[arg]?.opened ? 'case' : 'intro';
    }
    app.sound?.music(name === 'case' ? 'scene' : name === 'ending' ? 'ending' : name === 'outro' ? null : 'title');
    screen =
      name === 'title'
        ? await titleScreen(app, screenLayer)
        : name === 'prologue'
          ? await prologueScreen(app, screenLayer)
          : name === 'list'
            ? await listScreen(app, screenLayer)
            : name === 'intro'
              ? await introScreen(app, screenLayer, arg)
              : name === 'case'
                ? await caseScreen(app, screenLayer, arg)
                : name === 'outro'
                  ? await outroScreen(app, screenLayer, arg)
                  : await endingScreen(app, screenLayer);
    screen.name ??= name;
    screen.arg = arg;
    focus.set(screen.focus ?? [], false, screen.focusStart ?? 0);
    if (name !== 'case') app.sound?.play('paper');
    g.ready = true;
  } finally {
    busy = false;
    window.egretGame.busy = false;
    window.egretGame.screen = screen?.name;
    window.egretGame.view = screen;
  }
};

/** An overlay over whatever screen shows: settings, help or a question. */
app.overlay = (kind) => {
  closeOverlay();
  overLayer = new Sprite();
  app.game.ui.addChild(overLayer);
  const close = () => {
    closeOverlay();
    focus.set(screen?.focus ?? [], false, screen?.focusStart ?? 0);
  };
  over = kind === 'settings' ? settingsOverlay(app, overLayer, close) : helpOverlay(app, overLayer, close);
  over.kind = kind;
  focus.set(over.focus);
  window.egretGame.overlay = kind;
};
app.confirm = (question, yes) => {
  const layer = new Sprite();
  app.game.ui.addChild(layer);
  const prev = { over, overLayer };
  const done = () => {
    app.type.discard(layer);
    q.dispose?.();
    focus.set(prev.over?.focus ?? screen?.focus ?? []);
  };
  const q = confirmOverlay(app, layer, question, yes, done);
  focus.set(q.focus);
};
function closeOverlay() {
  if (!over) return;
  over.dispose?.();
  app.type.discard(overLayer);
  over = null;
  overLayer = null;
  window.egretGame.overlay = null;
}

/** The menu a case opens with Escape or its menu button. */
app.pauseMenu = (layer, caseId, close) => {
  const { game, kit, type } = app;
  const root = new Sprite();
  layer.addChild(root);
  kit.veil(root, 0.45, close);
  const W = 400,
    H = 400;
  const p = kit.panel(root, (game.width - W) / 2, (game.height - H) / 2, W, H);
  hitBox(p, 0, 0, W, H);
  game.onTap(p, () => {});
  const head = type.label(p, caseById(caseId).title[app.lang()], { size: 30, brush: true, align: 'center' });
  head.x = W / 2;
  head.y = 24;
  const items = [
    [app.say('back'), close, true],
    [app.say('caseList'), () => app.go('list')],
    [app.say('settings'), () => app.overlay('settings')],
    [app.say('help'), () => app.overlay('help')],
    [app.say('title'), () => app.go('title')]
  ];
  const buttons = items.map(([t, fn, primary], i) => kit.button(p, t, { x: W / 2, y: 104 + i * 60, w: 280, h: 50, primary, size: 23 }, fn));
  return { root, focus: buttons.map((b) => b.focusRecord), close };
};

app.setLanguage = (lang) => {
  store.update((d) => void (d.settings.language = lang));
  showLanguage(lang);
  const keep = over?.kind;
  void app.go(screen?.name ?? 'title', screen?.arg).then(() => keep && app.overlay(keep));
};
app.setSetting = (key, value) => {
  store.update((d) => void (d.settings[key] = value));
  if (key === 'sound') app.sound.setSound(value);
  if (key === 'music') app.sound.setMusic(value);
  if (key === 'reducedMotion') app.game.reducedMotion = value || matchMedia?.('(prefers-reduced-motion: reduce)').matches;
};
app.resetProgress = () => {
  store.update((d) => void (d.progress = freshProgress()));
  void app.go('title');
};

// ---- input ----
const HELD = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
function handleKeys(dt, g) {
  const k = g.keys;
  const typing = app.editing || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT';
  if (typing) return;
  const pressed = (...names) => k.pressed(...names);
  if (pressed('Tab', 'pad:r1', 'pad:down', 'pad:right')) {
    g.focusVisible = true;
    const back = k.down('shift') || pressed('pad:l1', 'pad:up', 'pad:left');
    focus.move(back ? -1 : 1);
    focus.current()?.onFocus?.();
  } else if (pressed('pad:l1', 'pad:up', 'pad:left')) {
    g.focusVisible = true;
    focus.move(-1);
    focus.current()?.onFocus?.();
  }
  if (pressed('enter', 'space', 'pad:a') && focus.current()) {
    g.focusVisible = true;
    focus.activate();
  }
  if (pressed('escape', 'Backspace', 'pad:b')) {
    if (over) {
      closeOverlay();
      focus.set(screen?.focus ?? [], false, screen?.focusStart ?? 0);
    } else if (screen?.back) screen.back();
    else if (screen?.name !== 'title') void app.go(screen?.name === 'case' || screen?.name === 'intro' ? 'list' : 'title');
  }
  if (screen?.keys) {
    if (pressed('j', 'pad:y')) screen.keys.j();
    if (pressed('n')) screen.keys.n();
    if (pressed('h', 'pad:x')) screen.keys.h();
  }
  if (screen?.pan && !over) {
    let dx = 0,
      dy = 0;
    for (const [key, [x, y]] of Object.entries(HELD))
      if (k.down(key, { left: 'a', right: 'd', up: 'w', down: 's' }[key])) {
        dx += x;
        dy += y;
      }
    const look = k.look?.() ?? { x: 0, y: 0 };
    dx += look.x;
    dy += look.y;
    if (dx || dy) screen.pan(-dx * 700 * dt, -dy * 700 * dt);
    if (k.down('Equal', 'NumpadAdd', 'pad:r2')) screen.zoom(1 + dt * 1.6);
    if (k.down('Minus', 'NumpadSubtract', 'pad:l2')) screen.zoom(1 / (1 + dt * 1.6));
  }
  if (g.pointer.pressed) g.focusVisible = false;
}

const loading = document.getElementById('loading');
/** The page's language and title follow the game's (a mini game has neither). */
function showLanguage(lang) {
  if (document.documentElement) document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.title = say(lang, 'pageTitle');
}
/** In a mini game the pictures are a subpackage, downloaded once the game has started. */
const loadPictures = () =>
  host && typeof host.loadSubpackage === 'function' ? new Promise((done, fail) => host.loadSubpackage({ name: 'art', success: done, fail: (e) => fail(Error('INQUEST_ART_PACKAGE ' + (e?.errMsg ?? ''))) })) : Promise.resolve();
let lastShape = '';
// For tests and the acceptance walks: the app, the save, what shows, and the rules (also where modules cannot be
// imported again, as in a mini game's single script).
window.egretGame = { app, store, screen: null, overlay: null, ready: false, problems, rules, caseById };

// The semantic tree: every button the game draws has a node in it, published by play after each frame. On a page it is
// projected for screen readers over the canvas, which keeps the keyboard; a mini game has no page to project it to.
const semantics = createUiSemantics();
app.semantics = semantics;
let projection = null;
function project(game) {
  projection?.dispose();
  projection = null;
  if (miniGame || !game.canvas) return;
  if (!game.canvas.hasAttribute('tabindex')) game.canvas.tabIndex = 0;
  try {
    projection = createBrowserSemantics({ semantics, canvas: game.canvas, width: game.width, height: game.height, label: say(app.lang(), 'pageTitle'), onError: (cause) => console.warn('semantics', cause) });
  } catch (cause) {
    console.warn('semantics', cause);
  }
  // The canvas holds the keyboard focus, so a screen reader follows the node the game's focus is on.
  game.canvas.focus?.({ preventScroll: true });
}

/** When the game's own files could not be had: a word on the stage and a button that loads the page again. */
function showLoadFailure(game) {
  const lang = app.lang();
  const words = game.text(say(lang, 'loadFailed'), { x: game.width / 2, y: game.height / 2 - 60, size: 28, color: 0xf6eedb, align: 'center', baseline: 'middle' });
  const retry = game.button(say(lang, 'retry'), { x: game.width / 2, y: game.height / 2 + 30, width: 180, height: 54, color: 0xa3342a, textColor: 0xf6eedb }, () => location.reload());
  semantics.add({ id: 'load-failed', role: 'alert', describe: () => ({ name: say(lang, 'loadFailed'), bounds: semanticBoundsOf(words) }) });
  semantics.add({ id: 'retry', role: 'button', onActivate: () => location.reload(), describe: () => ({ name: say(lang, 'retry'), bounds: semanticBoundsOf(retry) }) });
}
// In a mini game the same state is on GameGlobal too, where the mini game's checks look for it.
if (host && typeof GameGlobal === 'object') GameGlobal.egretGame = window.egretGame;

await play({
  width: 1280,
  height: 720,
  portrait: { width: 720, height: 1280 },
  // A mini game's canvas fills the phone's screen: the stage grows to its shape instead of being stretched. A page
  // keeps the stage's own shape, so the platform text fields sit exactly over the canvas.
  fit: miniGame ? 'expand' : 'contain',
  background: 0x1b140d,
  audio: false,
  saveKey: 'inquest-scrolls-play',
  semantics,
  async setup(game) {
    app.game = game;
    window.egretGame.game = game;
    game.reducedMotion = app.settings().reducedMotion || game.reducedMotion;
    showLanguage(app.lang());
    project(game);
    let type, index;
    try {
      [type, index] = await game.loading(
        [() => openType(game, { plain: app.plain }), () => loadPictures().then(() => fetch(new URL('../assets/art/index.json', import.meta.url))).then((r) => r.json())],
        { label: say(app.lang(), 'loading') }
      );
    } catch (cause) {
      // A file that did not arrive: say so on the stage and offer to load again, instead of stopping.
      console.warn('loading', cause);
      loading?.remove();
      showLoadFailure(game);
      window.egretGame.ready = true;
      window.egretGame.failed = true;
      return;
    }
    artIndex = index;
    app.type = type;
    app.pictures = createPictures(game);
    app.sound = createSound(game.engine.createScope(), { sound: app.settings().sound, music: app.settings().music });
    // A hidden page or mini game is quiet until it shows again.
    if (typeof document !== 'undefined' && document.addEventListener)
      document.addEventListener('visibilitychange', () => app.sound.setHidden(document.visibilityState === 'hidden'));
    app.kit = createKit(game, type, app.sound, { semantics, focused: (sprite) => game.focusVisible && focus?.current()?.sprite === sprite });
    lastShape = `${game.width}x${game.height}`;
    const top = new Sprite();
    game.ui.addChild(top);
    focus = createFocus(game, top);
    loading?.remove();
    const jump = params.get('case');
    if (jump && caseById(jump)) await app.go('case', jump);
    else await app.go('title');
    window.egretGame.ready = true;
  },
  update(dt, game) {
    if (!focus) return;
    handleKeys(dt, game);
    screen?.update?.(dt);
    focus.redraw();
  },
  arrange(game) {
    // Turning a phone changes the stage's shape: build the current screen again in the new arrangement.
    const shape = `${game.width}x${game.height}`;
    if (shape === lastShape) return;
    lastShape = shape;
    project(game);
    if (window.egretGame.ready && screen) void app.go(screen.name, screen.arg);
  }
});

