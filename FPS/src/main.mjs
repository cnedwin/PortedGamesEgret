// Operation Cutoff: the page's entry point. It starts the engine, builds the
// scene, and runs the loop that passes input to the rules and what the rules
// report to the view, the screen text and the sound.
//
// Options in the address:
//   ?backend=webgpu  draw with WebGPU instead of WebGL2
//   ?lang=zh|en      interface language (defaults to the browser's)
//   ?quality=low|medium|high
//   ?post=0  ?ssao=0  ?shadows=0  ?reflect=0  ?dof=0   switch single features off
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

const gameArea = document.querySelector('#game');
// Cancel the browser menu over both the canvas and its controls. Mouse buttons reach the input handler as usual.
gameArea.addEventListener('contextmenu', (event) => event.preventDefault());

const params = new URLSearchParams(location.search);
const useWebGPU = params.get('backend') === 'webgpu';
const backend = await (useWebGPU ? import('@egret/engine/webgpu/world3d') : import('@egret/engine/webgl2/world3d'));
const { createWorld3DHost, createWorld3DView, startWorld3DLoop } = backend;

const canvas = document.querySelector('#stage');
const boot = document.querySelector('#boot');

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
  // Mist lying in the valley and shafts of low sunlight through it.
  const atmosphere = backend.createAtmosphere3D({
    fogColor: 0xcfb7a2,
    fogDensity: 0.0065,
    fogHeight: 0,
    fogFalloff: 0.07,
    shaftIntensity: 0.5,
    shaftLength: 0.7,
  });
  renderer.postProcess.custom = atmosphere.post;
  const SUNLIGHT = [-0.72, -0.4, -0.56];
  const stats = createStats(renderer, params.get('stats') === '1', gameArea);
  status.stats = stats;

  const settings = loadSettings();
  const scene = new Scene3D();
  const camera = createPerspectiveCamera3D({ fov: settings.fov, near: 0.03, far: 460 });
  scene.addChild(camera);
  const view = createView(scene, camera, { fov: settings.fov });
  status.scene = scene;
  status.camera = camera;

  let focusOn = true;
  /**
   * Picture quality. High: everything. Medium: no contact shading, smaller
   * shadow maps. Low: no post-processing, no shadows and no mirror image on
   * the wet ground. The address options
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
    view.setReflections(!low && !off('reflect'));
    focusOn = high && !off('dof');
    if (!focusOn) renderer.postProcess.dof = false;
  }
  applyQuality();

  const audio = createAudio();
  audio.setVolume(settings.volume);

  // ---- the run -----------------------------------------------------------------------------
  const auto = params.get('auto') === '1';
  let game,
    bot,
    deployed = false,
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
    hud.toggleBag(false);
    hud.setTouch(input.touchMode && next === 'play');
    audio.setPaused(next !== 'play' && next !== 'title');
    if (next !== 'play') input.release();
  }
  function deploy() {
    audio.resume();
    // The title previews a fresh run without advancing its rules. Keep it on first deploy.
    if (deployed) newGame();
    deployed = true;
    hud.reset();
    endIn = 0;
    setMode('play');
    if (!auto) input.capture();
  }

  function pause() {
    if (mode === 'play' && game.state !== 'dead' && game.state !== 'won') setMode('pause');
  }

  const hud = createHud(document.querySelector('#ui'), gameArea, settings, {
    deploy,
    restart: deploy,
    selectWeapon(weapon) {
      if (mode === 'play') input.selectWeapon(weapon);
    },
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
    onBag() {
      if (mode === 'play') hud.toggleBag();
    },
    onPause: pause,
    onTouch() {
      hud.touchMode = true;
      hud.setTouch(mode === 'play');
    },
  });
  hud.touchMode = input.touchMode;
  input.sensitivity = settings.sensitivity;
  input.invertY = settings.invertY;
  let wasFullscreen = document.fullscreenElement === gameArea;
  document.addEventListener('fullscreenchange', () => {
    const fullscreen = document.fullscreenElement === gameArea;
    if (wasFullscreen && !fullscreen && !input.touchMode && !auto) pause();
    wasFullscreen = fullscreen;
  });
  // Clicking the picture while playing takes the mouse back if the browser let go of it.
  canvas.addEventListener('click', () => {
    if (mode === 'play' && !input.locked && !auto) input.capture();
  });

  newGame();

  // ---- how the picture reacts: focus, and what being hurt does to it ------------------------
  const BASE = { saturation: 1.04, contrast: 1.07, vignette: 0.28 };
  renderer.postProcess.dofRadius = 0;
  let focus = 30,
    focusIn = 0,
    hurt = 0,
    deadFor = 0;
  /** Note a blow, so the picture flinches: `amount` in health points. */
  function flinch(amount) {
    hurt = Math.min(1.2, hurt + 0.25 + amount / 35);
  }
  function grade(dt) {
    const post = renderer.postProcess,
      p = game.player,
      playing = mode === 'play';
    hurt = Math.max(0, hurt - dt * 1.4);
    deadFor = playing && game.state === 'dead' ? deadFor + dt : 0;
    // Badly hurt, the colour drains and the edges close in; a fresh blow adds a jolt of both.
    const low = playing ? Math.max(0, 1 - p.health / 45) : 0,
      gone = Math.min(1, deadFor / 1.5);
    post.saturation = BASE.saturation * (1 - Math.min(0.9, low * 0.55 + hurt * 0.25 + gone * 0.9));
    post.vignette = BASE.vignette + low * 0.3 + hurt * 0.3 + gone * 0.35;
    post.contrast = BASE.contrast + hurt * 0.12;
    if (!focusOn) return;
    post.dof = true;
    if (!playing) {
      // Behind a menu the scene goes soft; the title screen keeps it sharp.
      post.dofFocus = 0.4;
      post.dofRange = 0.2;
      post.dofRadius += ((mode === 'title' ? 0 : 5) - post.dofRadius) * Math.min(1, dt * 6);
      return;
    }
    // Focus on whatever is under the crosshair, looked up a few times a second.
    focusIn -= dt;
    if (focusIn <= 0) {
      focusIn = 0.12;
      focus += (Math.max(1.5, game.sightDistance()) - focus) * 0.5;
    }
    post.dofFocus = focus;
    // Aiming narrows the sharp zone so the weapon and the near ground blur; a blow or a wound smears everything a little.
    post.dofRange = Math.max(2.5, focus * (1.1 - 0.45 * p.aim));
    post.dofRadius += (p.aim * 3.2 + hurt * 3 + low * 1.6 + gone * 5 - post.dofRadius) * Math.min(1, dt * 10);
  }

  // ---- one frame ---------------------------------------------------------------------------
  const STEP = 1 / 60;
  function frame(dt) {
    stats.begin();
    status.frames++;
    if (status.frames === 1) requestAnimationFrame(() => {
      if (status.error) return;
      boot.classList.add('done');
      if (auto) deploy();
    });
    dt = Math.min(dt, 0.1);
    time += dt;
    if (mode === 'play' && dt > 1e-5) {
      const record = bot ? bot.think(dt) : input.sample();
      if (record.weapon === 'swap' || record.weapon === 'next' || record.weapon === 'previous') {
        // The wheel and the touch button step through the weapons in order.
        const order = ['rifle', 'pistol', 'marksman'],
          at = order.indexOf(game.player.weapon);
        record.weapon = order[(at + (record.weapon === 'previous' ? order.length - 1 : 1)) % order.length];
      }
      // Long frames are played as several short steps so nothing tunnels or stalls.
      for (let left = dt; left > 1e-5; left -= STEP) {
        game.update(Math.min(STEP, left), record);
        record.lookYaw = record.lookPitch = 0;
        record.firePressed = false;
        record.weapon = '';
      }
      for (const event of game.events) {
        if (event.type === 'playerHit') flinch(event.amount);
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
    atmosphere.update(camera, SUNLIGHT);
    audio.update(dt, game, view.helicopter, mode);
    grade(dt);
    view.renderReflection(renderer);
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
  stats.measure = () =>
    renderer.measureFrame?.(() => {
      view.renderReflection(renderer);
      renderer.render(scene, camera);
    });
  view.warm();
  setMode('title');
  startWorld3DLoop(engine, fail);
}

main().catch(fail);
