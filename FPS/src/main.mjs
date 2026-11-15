// Operation Cutoff: the page's entry point. It starts the engine, builds the
// scene, and runs the loop that passes input to the rules and what the rules
// report to the view, the screen text and the sound.
//
// Options in the address:
//   ?backend=webgpu  draw with WebGPU instead of WebGL2
//   ?lang=zh|en      interface language (defaults to the browser's)
//   ?quality=low|medium|high
//   ?post=0  ?ssao=0  ?shadows=0   switch single features off
//   ?ratio=1         cap on the device pixel ratio (default 1.5)
//   ?seed=123        replay the same run
//   ?auto=1          let the stand-in player play
//   ?stats=1         show frame timings and what was drawn
import { createEngine } from '@egret/engine';
import { Scene3D, createPerspectiveCamera3D } from '@egret/engine/world3d';
import { createAudio } from './audio.mjs';
import { createBot } from './bot.mjs';
import { createHud } from './hud.mjs';
import { createInput } from './input.mjs';
import { createGame } from './sim.mjs';
import { createStats } from './stats.mjs';
import { pickLanguage } from './text.mjs';
import { createView } from './view.mjs';

const params = new URLSearchParams(location.search);
const useWebGPU = params.get('backend') === 'webgpu';
const backend = await (useWebGPU ? import('@egret/engine/webgpu/world3d') : import('@egret/engine/webgl2/world3d'));
const { createWorld3DHost, createWorld3DView, startWorld3DLoop } = backend;

const canvas = document.querySelector('#stage');

/** State for the browser console and for automated checks; the game never reads it. */
const status = { error: '', frames: 0, mode: 'boot', game: undefined };
globalThis.__cutoff = status;

function fail(cause) {
  const box = document.querySelector('#error');
  box.textContent = '出错了 / Error: ' + (cause?.message ?? cause);
  box.hidden = false;
  status.error = String(cause?.stack ?? cause);
}

// ---- saved choices -------------------------------------------------------------------------
const SETTINGS_KEY = 'operation-cutoff';
function loadSettings() {
  const defaults = {
    quality: 'high',
    sensitivity: 1,
    invertY: false,
    volume: 0.8,
    fov: 74,
    lang: pickLanguage(params.get('lang')),
  };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    return {
      ...defaults,
      ...saved,
      ...(params.get('lang') ? { lang: defaults.lang } : {}),
      ...(params.get('quality') ? { quality: params.get('quality') } : {}),
    };
  } catch {
    return defaults;
  }
}
function saveSettings(settings) {
  // Private windows may refuse storage; the choices then last for this visit only.
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* ignored */
  }
}

async function main() {
  // ---- engine, renderer and scene ----------------------------------------------------------
  const engine = await createEngine({ host: createWorld3DHost(canvas) });
  const scope = engine.createScope();
  const renderer = useWebGPU
    ? await backend.createWebGPURenderer3D({
        canvas,
        antialias: true,
        toneMapping: 'aces',
        onDeviceLost: (message) => fail(message || 'device lost'),
      })
    : backend.createWebGL2Renderer3D({ canvas, antialias: true, toneMapping: 'aces' });
  scope.use(renderer);
  Object.assign(renderer.postProcess, {
    bloom: true,
    bloomThreshold: 1.15,
    bloomIntensity: 0.4,
    fxaa: true,
    saturation: 1.04,
    contrast: 1.07,
    vignette: 0.28,
    ssaoRadius: 0.6,
    ssaoIntensity: 1,
  });
  const stats = createStats(renderer, params.get('stats') === '1');
  status.stats = stats;

  const settings = loadSettings();
  const scene = new Scene3D();
  const camera = createPerspectiveCamera3D({ fov: settings.fov, near: 0.03, far: 460 });
  scene.addChild(camera);
  const view = createView(scene, camera, { fov: settings.fov });
  status.scene = scene;
  status.camera = camera;

  /**
   * Picture quality. High: everything. Medium: no contact shading, smaller
   * shadow maps. Low: no post-processing and no shadows. The address options
   * can switch single features off on top of that.
   */
  function applyQuality() {
    const high = settings.quality === 'high',
      low = settings.quality === 'low',
      off = (name) => params.get(name) === '0';
    renderer.postProcess.enabled = !low && !off('post');
    renderer.postProcess.ssao = high && !off('ssao');
    renderer.shadowsEnabled = !low && !off('shadows');
    view.setShadowSize(high ? 2048 : 1024);
  }
  applyQuality();

  const audio = createAudio();
  audio.setVolume(settings.volume);

  // ---- the run -----------------------------------------------------------------------------
  const auto = params.get('auto') === '1';
  let game,
    bot,
    mode = 'title',
    time = 0,
    endIn = 0;
  function newGame() {
    const seed = Number(params.get('seed')) || (Date.now() % 100000) + 1;
    game = createGame({ seed });
    bot = auto ? createBot(game) : undefined;
    view.attach(game);
    status.game = game;
  }
  function setMode(next) {
    mode = next;
    status.mode = next;
    hud.show(next === 'play' ? 'none' : next);
    input.setEnabled(next === 'play');
    hud.setTouch(input.touchMode && next === 'play');
    audio.setPaused(next !== 'play' && next !== 'title');
    if (next !== 'play') input.release();
  }
  function deploy() {
    audio.resume();
    newGame();
    hud.reset();
    endIn = 0;
    setMode('play');
    if (!auto) input.capture();
  }

  const hud = createHud(document.querySelector('#ui'), settings, {
    deploy,
    restart: deploy,
    resume() {
      audio.resume();
      setMode('play');
      input.capture();
    },
    click: () => {
      audio.resume();
      audio.click();
    },
    changed(key) {
      saveSettings(settings);
      if (key === 'quality') applyQuality();
      if (key === 'volume') audio.setVolume(settings.volume);
      if (key === 'fov') view.setFov(settings.fov);
      input.sensitivity = settings.sensitivity;
      input.invertY = settings.invertY;
    },
  });
  const input = createInput(canvas, hud.touch, {
    onPause() {
      if (mode === 'play' && game.state !== 'dead' && game.state !== 'won') setMode('pause');
    },
    onTouch() {
      hud.touchMode = true;
      hud.setTouch(mode === 'play');
    },
  });
  input.sensitivity = settings.sensitivity;
  input.invertY = settings.invertY;
  // Clicking the picture while playing takes the mouse back if the browser let go of it.
  canvas.addEventListener('click', () => {
    if (mode === 'play' && !input.locked && !auto) input.capture();
  });

  newGame();

  // ---- one frame ---------------------------------------------------------------------------
  const STEP = 1 / 60;
  function frame(dt) {
    stats.begin();
    status.frames++;
    dt = Math.min(dt, 0.1);
    time += dt;
    if (mode === 'play') {
      const record = bot ? bot.think(dt) : input.sample();
      if (record.weapon === 'swap') record.weapon = game.player.weapon === 'rifle' ? 'pistol' : 'rifle';
      // Long frames are played as several short steps so nothing tunnels or stalls.
      for (let left = dt; left > 1e-5; left -= STEP) {
        game.update(Math.min(STEP, left), record);
        record.lookYaw = record.lookPitch = 0;
        record.weapon = '';
      }
      for (const event of game.events) {
        view.handle(event, game);
        hud.handle(event);
        audio.handle(event, game);
      }
      game.events.length = 0;
      // The end of a run lingers a moment before its screen comes up.
      if (game.state === 'dead' || game.state === 'won') {
        endIn += dt;
        if (endIn > (game.state === 'dead' ? 1.8 : 4)) {
          if (game.state === 'dead') hud.setDead(game);
          else hud.setDebrief(game);
          setMode(game.state === 'dead' ? 'dead' : 'debrief');
        }
      }
    }
    stats.lap('rules');
    view.update(mode === 'pause' ? 0 : dt, game, mode === 'title' ? 'title' : 'play', time);
    if (mode !== 'title') {
      const p = game.player;
      hud.update(game, dt, {
        x: p.x,
        y: p.y + p.eye,
        z: p.z,
        yaw: p.yaw,
        pitch: p.pitch + p.kick,
        fov: camera.fov,
        aspect: canvas.clientWidth / Math.max(1, canvas.clientHeight),
      });
    }
    audio.update(dt, game, view.helicopter);
    stats.lap('view');
    stats.end(game.aliveCount());
  }

  // The Engine clock calls `frame`, then the view draws the scene.
  createWorld3DView(engine, scope, {
    renderer,
    scene,
    camera,
    maxPixelRatio: Number(params.get('ratio')) || 1.5,
    onUpdate: frame,
    onError: fail,
  });
  // For the console and automated checks: draw one extra frame and return what each pass cost (WebGL2 only).
  stats.measure = () => renderer.measureFrame?.(() => renderer.render(scene, camera));
  view.warm();
  setMode('title');
  document.querySelector('#boot').classList.add('done');
  startWorld3DLoop(engine, fail);
  if (auto) deploy();
}

main().catch(fail);
