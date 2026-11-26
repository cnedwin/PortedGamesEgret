// 千机巧匠：页面入口。建好游戏、贴图、位图字体、声音、存档、语义树和键位，然后在各个画面之间切换。
// Mechanism City: the page's entry. Makes the game, the textures, the bitmap font, the sound, the save, the
// semantic tree and the keys, then moves between the screens.
import { parseBitmapFont } from '@egret/engine/bitmapfont';
import { createInputActions } from '@egret/engine/kit';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserGame } from '@egret/engine/web/game';
import { bindBrowserInputActions, browserSaveStorage } from '@egret/engine/web/kit';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { paintDot, paintDust, paintLockLights, paintScoreFont, paintSpark, paintSplinter, paintThunder } from './art/paint.mjs';
import { createIllustrations } from './art/illustrations.mjs';
import { createSound } from './audio/sound.mjs';
import { openSave } from './saves.mjs';
import { endingScreen, filmScreen, levelScreen, resultScreen, selectScreen, titleScreen } from './screens.mjs';
import { openSettings } from './ui/settings.mjs';
import { bindPortraitControls } from './ui/portrait-controls.mjs';

const WIDTH = 960,
  HEIGHT = 540,
  canvas = document.querySelector('#stage'),
  frameHost = document.querySelector('#frame'),
  params = new URLSearchParams(location.search);

let screen = null,
  openingSettings = false,
  going = null,
  settings = null;

const game = await createBrowserGame({
  canvas,
  width: WIDTH,
  height: HEIGHT,
  // WebGL 2 everywhere: it is what every browser this demo is for has, and it needs no probe.
  backend: params.get('backend') ?? 'webgl2',
  pixelRatio: matchMedia('(pointer: coarse)').matches ? Math.min(window.devicePixelRatio || 1, 1.5) : undefined,
  effects: true,
  fit: 'contain',
  fitTo: document.querySelector('#playfield'),
  clearColor: 0x0d1418,
  // Hover and the mouse wheel, for scrolling the list of levels.
  hover: true,
  autoStart: false,
  update: (seconds) => frame(Math.min(seconds, 1 / 20))
});
const { scope } = game;

// What the city is drawn with: the terrain tiles from a PNG, and small textures painted on canvases.
const textures = {
  terrain: await game.loadTexture(new URL('../levels/terrain.png', import.meta.url).href),
  dot: await game.textureFromCanvas(paintDot()),
  splinter: await game.textureFromCanvas(paintSplinter()),
  dust: await game.textureFromCanvas(paintDust()),
  lockLights: await game.textureFromCanvas(paintLockLights()),
  spark: await game.textureFromCanvas(paintSpark()),
  thunder: await game.textureFromCanvas(paintThunder())
};
// The gold lettering of the score: its glyphs painted into one page, read by the engine's font parser.
const painted = paintScoreFont(),
  font = parseBitmapFont(painted.font),
  fontPages = [await game.textureFromCanvas(painted.canvas)];

const levels = await (await fetch(new URL('../levels/levels.json', import.meta.url))).json();
const save = openSave(browserSaveStorage());
const sound = await createSound(scope, save.data.settings);

// The semantic tree: one for the whole game, projected into the page for screen readers and for tests.
const semantics = createUiSemantics();
const projection = scope.use(createBrowserSemantics({ semantics, canvas, width: WIDTH, height: HEIGHT, label: '千机巧匠 · Mechanism City', onError: (cause) => console.warn('semantics', cause) }));

// Named actions over keys and gamepads, read each frame. A key a focused control took (Space on a button, the
// arrows on the slider) presses no action as well.
const actions = createInputActions({
  turn: { kind: 'axis', negative: ['Key:KeyA', 'Key:ArrowLeft', 'Pad:left'], positive: ['Key:KeyD', 'Key:ArrowRight', 'Pad:right'] },
  pull: { kind: 'axis', negative: ['Key:KeyS', 'Key:ArrowDown', 'Pad:down'], positive: ['Key:KeyW', 'Key:ArrowUp', 'Pad:up'] },
  fire: { bindings: ['Key:Space', 'Key:KeyF', 'Pad:a'] },
  confirm: { bindings: ['Key:Enter'] },
  overview: { bindings: ['Key:KeyZ', 'Pad:y'] },
  hint: { bindings: ['Key:KeyH'] },
  restart: { bindings: ['Key:KeyR'] },
  back: { bindings: ['Key:Escape', 'Pad:b'] }
});
const browserActions = scope.use(bindBrowserInputActions(actions, { keyTarget: canvas, skipPrevented: true, passKeys: ['Tab', 'F5', 'F11', 'F12'] }));
const portraitControls = bindPortraitControls({ screen: () => screen, settingsOpen: () => Boolean(settings?.open || openingSettings) });

const app = {
  game,
  save,
  sound,
  semantics,
  levels,
  textures,
  art: createIllustrations(game),
  font,
  fontPages,
  actions,
  hover: game.hover,
  skipStory: false,
  settingsOpen: () => Boolean(settings?.open),
  /** Move to a screen by name; the one before is let go once the next is made. */
  go(name, options = {}) {
    going = (going ?? Promise.resolve()).then(() => show(name, options)).catch((cause) => console.error(cause));
    return going;
  },
  startLevel(index, { skipStory = false } = {}) {
    app.skipStory = skipStory;
    return app.go('level', { index });
  },
  async openSettings() {
    if (settings?.open || openingSettings) return;
    openingSettings = true;
    // A root may be made while the press that asked for it is being delivered (ENGINE-NOTES.md, item 19).
    settings = await openSettings(game, {
      semantics,
      sound,
      settings: { ...save.data.settings },
      onChange: (key, on) => {
        save.update((data) => {
          data.settings[key] = on;
        });
        if (key === 'effects') sound.setEffects(on);
        if (key === 'music') sound.setMusic(on);
      },
      onClose: () => {
        settings = null;
        semantics.publish();
        screen?.focusFirst?.();
      }
    }).finally(() => (openingSettings = false));
    semantics.publish();
  }
};

const SCREENS = { title: titleScreen, film: filmScreen, select: selectScreen, level: levelScreen, result: resultScreen, ending: endingScreen };

async function show(name, options) {
  settings?.close();
  const old = screen;
  screen = null;
  old?.dispose();
  screen = await SCREENS[name](app, options);
  screen.name = name;
  lastFocus = '';
  canvas.dataset.screen = name;
  frameHost.dataset.screen = name;
  semantics.publish();
  screen.focusFirst?.();
}

let sinceSync = 0,
  lastFocus = '';
function frame(seconds) {
  browserActions.poll();
  if (actions.justPressed('back')) {
    if (settings?.open) settings.close();
    else screen?.escape?.();
  }
  screen?.update?.(seconds);
  portraitControls.sync();
  // Parts are painted again only when the keyboard focus moves or shows, not every frame.
  const focus = game.keyboard?.getSnapshot(),
    focusKey = `${focus?.focusedId}|${focus?.focusVisible}|${settings ? 1 : 0}`;
  if (focusKey !== lastFocus) {
    lastFocus = focusKey;
    settings?.repaint();
    screen?.kit?.repaint();
    screen?.repaint?.();
  }
  // The page's copy of the semantic tree follows a few times a second: names, values and bounds.
  sinceSync += seconds;
  if (sinceSync > 0.1) {
    sinceSync = 0;
    semantics.publish();
    projection.sync();
  }
  actions.endFrame();
}

// The canvas takes the keys; a press anywhere on it gives it the focus again.
canvas.addEventListener('pointerdown', () => canvas.focus({ preventScroll: true }));
canvas.focus({ preventScroll: true });
game.loop.start();

const first = params.get('level');
if (first) app.startLevel(Math.max(0, Math.min(levels.length - 1, Number(first) - 1)), { skipStory: params.has('quiet') });
else app.go(params.get('screen') ?? 'title');

// For tests and for anyone curious, from the console.
window.mechanismCity = { app, get screen() { return screen; } };
