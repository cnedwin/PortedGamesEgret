// Jelly Pandas: hold a toy island for fifteen minutes against a candy horde.
//
// This file starts the game and runs its frame. The other modules each own
// one concern:
//   sim.mjs, toys.mjs  the rules (no page needed)
//   island.mjs         the height grid shared by drawing and collision
//   data.mjs           pandas, toys, charms, enemies, bosses and text
//   view.mjs, panda.mjs  everything drawn in 3D
//   hud.mjs            the page around the canvas
//   input.mjs, audio.mjs  devices and sound
import { createEngine } from '@egret/engine';
import { Scene3D, createFollowCamera3D, createPerspectiveCamera3D } from '@egret/engine/world3d';
import { createAudio } from './audio.mjs';
import { createHud } from './hud.mjs';
import { createInput } from './input.mjs';
import { createIslandGeometry } from './island.mjs';
import { createGame } from './sim.mjs';
import { createView } from './view.mjs';

// ---- address options ----------------------------------------------------------------
//   ?backend=webgpu  draw with WebGPU instead of WebGL2
//   ?lang=en|zh      interface language (defaults to the browser's)
//   ?jelly=0         plain glossy pandas instead of see-through ones
//   ?post=0          no bloom, colour grading or FXAA      ?ssao=0  no contact shading
//   ?shadows=0       no shadows          ?shadowSize=1024  smaller shadow maps
//   ?reflect=0       no mirror image on the water
//   ?ratio=1         cap on the device pixel ratio (default 1.5)
//   ?seed=123        replay the same run
const params = new URLSearchParams(location.search);
const useWebGPU = params.get('backend') === 'webgpu';
const backend = await (useWebGPU ? import('@egret/engine/webgpu/world3d') : import('@egret/engine/webgl2/world3d'));
const { createWorld3DHost, createWorld3DView, startWorld3DLoop } = backend;

const canvas = document.querySelector('#stage');

/** State for the browser console and for automated checks; the game never reads it. */
const status = { error: '', frames: 0, mode: 'title', game: undefined };
globalThis.__jellyPandas = status;

function fail(cause) {
  const box = document.querySelector('#error');
  box.textContent = 'Error / 出错了: ' + (cause?.message ?? cause);
  box.hidden = false;
  status.error = String(cause?.stack ?? cause);
}

// ---- saved choices --------------------------------------------------------------------
const SETTINGS_KEY = 'jelly-pandas';
function loadSettings() {
  const defaults = { skin: 0, party: 1, muted: false, quality: 'high' };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
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
  // ---- engine, renderer and scene ------------------------------------------------------
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
    bloomThreshold: 1.3,
    bloomIntensity: 0.35,
    fxaa: true,
    saturation: 1.12,
    contrast: 1.04,
    vignette: 0.16,
    ssaoRadius: 0.7,
    ssaoIntensity: 0.9,
  });

  const scene = new Scene3D();
  const camera = createPerspectiveCamera3D({ fov: 55, near: 0.3, far: 400 });
  scene.addChild(camera);

  const settings = loadSettings();
  const view = createView(scene, { shadowSize: Number(params.get('shadowSize')) || 2048 });
  /**
   * Picture quality. High: see-through pandas, contact shading, water mirror.
   * Medium: drops the contact shading and the mirror. Low: also drops
   * post-processing and shadows and draws plain glossy pandas. The address
   * options can switch single features off on top of that.
   */
  function applyQuality() {
    const high = settings.quality === 'high',
      low = settings.quality === 'low',
      off = (name) => params.get(name) === '0';
    renderer.postProcess.enabled = !low && !off('post');
    renderer.postProcess.ssao = high && !off('ssao');
    renderer.shadowsEnabled = !low && !off('shadows');
    view.setReflect(high && !off('reflect'));
    view.jelly = !low && !off('jelly');
  }
  applyQuality();
  // One island geometry serves the drawn mesh and every game's collision shape.
  const islandGeometry = createIslandGeometry();
  view.attachIsland(islandGeometry);

  const audio = createAudio();
  const hud = createHud(document.querySelector('#ui'), { lang: params.get('lang') ?? undefined });
  const input = createInput(canvas, hud.touch);
  audio.setMuted(settings.muted);

  // The camera orbits a point that eases toward the watched panda.
  const target = [0, 1, 0];
  const follow = createFollowCamera3D(camera, target, {
    distance: 12,
    minDistance: 5,
    maxDistance: 22,
    height: 1.3,
    pitch: 0.5,
    minPitch: 0.08,
    maxPitch: 1.35,
  });
  const moveScratch = [0, 0, 0],
    screenScratch = [0, 0, 0];
  const simInput = { moveX: 0, moveZ: 0, jump: false, slam: false, roll: false };

  // ---- game flow: title -> play <-> paused -> over ----------------------------------------
  let hitStop = 0;
  let mode = 'title',
    game,
    human,
    cardsShown = false,
    endAt = 0,
    now = 0;
  function syncTouchControls() {
    const active = input.touchMode && mode === 'play' && !cardsShown && game?.state === 'play';
    input.setTouchEnabled(active);
    hud.setTouchControls(active, input.touchMode);
  }
  input.onJumpCancel = () => {
    human.jumpHeld = false;
    human.charge = 0;
  };
  hud.touch.pause.addEventListener('click', () => input.onCommand?.('menu'));

  const setMode = (next) => {
    mode = next;
    status.mode = next;
    syncTouchControls();
  };
  const capturePointer = () => {
    if (!input.touchMode) canvas.requestPointerLock?.()?.catch?.(() => {});
  };

  function newGame(party, seed) {
    game = createGame({ party, seed, islandGeometry });
    human = game.pandas.find((panda) => panda.human) ?? game.pandas[0];
    applyQuality();
    view.attach(game);
    target[0] = human.x;
    target[1] = human.y;
    target[2] = human.z;
    status.game = game;
  }
  /** A still scene behind the title: the chosen panda and its friends on the island. */
  function preview() {
    newGame(
      Array.from({ length: settings.party }, (_, index) => ({ skin: (settings.skin + index) % 8, human: index === 0 })),
      1,
    );
    follow.distance = canvas.inert ? 6 : 7.5;
    follow.pitch = 0.32;
  }
  function showTitle() {
    setMode('title');
    input.release();
    cardsShown = false;
    preview();
    hud.showTitle(settings, {
      onPlay: start,
      onChange() {
        saveSettings(settings);
        audio.setMuted(settings.muted);
        audio.unlock();
        audio.play('click');
        preview();
      },
    });
  }
  function start() {
    audio.unlock();
    audio.play('levelup');
    // Friends get skins other than the player's, in a random order.
    const others = [0, 1, 2, 3, 4, 5, 6, 7].filter((index) => index !== settings.skin).sort(() => Math.random() - 0.5);
    const party = Array.from({ length: settings.party }, (_, index) => ({
      skin: index === 0 ? settings.skin : others[index - 1],
      human: index === 0,
    }));
    newGame(party, Number(params.get('seed')) || Date.now() & 0xffffff);
    cardsShown = false;
    setMode('play');
    endAt = 0;
    follow.distance = 12;
    follow.pitch = 0.5;
    hud.startPlay();
    canvas.focus();
    capturePointer();
  }

  // Level-up cards: the run waits while the player chooses.
  function openCards() {
    cardsShown = true;
    syncTouchControls();
    input.release();
    hud.showCards(human, { onPick: pickCard, onReroll: rerollCards });
  }
  function closeCards() {
    cardsShown = false;
    syncTouchControls();
    hud.hideCards();
    capturePointer();
  }
  function pickCard(index) {
    if (!game.choose(human.index, index)) return;
    audio.play('click');
    if (game.waitingForChoice()) openCards();
    else closeCards();
  }
  function rerollCards() {
    if (!game.reroll(human.index)) return;
    audio.play('click');
    openCards();
  }

  function setPaused(on) {
    if (mode !== 'play' && mode !== 'paused') return;
    setMode(on ? 'paused' : 'play');
    if (on) input.release();
    else capturePointer();
    hud.showMenu(on, {
      onResume: () => setPaused(false),
      onRestart: () => {
        hud.showMenu(false);
        start();
      },
      onQuit: () => {
        hud.showMenu(false);
        showTitle();
      },
    });
  }

  input.onCommand = (command) => {
    audio.unlock();
    if (command === 'menu') {
      if (!cardsShown) setPaused(mode === 'play');
      return;
    }
    if (mode !== 'play' || !cardsShown) return;
    if (command === 'reroll') rerollCards();
    else pickCard(Number(command.slice(4)) - 1);
  };
  // The browser releases the pointer on Esc before the key reaches the page, so losing capture mid-run opens the menu.
  document.addEventListener('pointerlockchange', () => {
    if (!input.touchMode && !input.captured && mode === 'play' && !cardsShown && game?.state === 'play' && game.t > 0.5 && document.hasFocus())
      setPaused(true);
  });
  canvas.addEventListener('pointerdown', () => audio.unlock());

  /** Page position of a world point, or undefined when it is behind the camera or off screen. */
  function project(x, y, z) {
    const m = camera.matrixWorld,
      dx = x - m[12],
      dy = y - m[13],
      dz = z - m[14];
    // The camera looks along its -Z axis.
    if (dx * -m[8] + dy * -m[9] + dz * -m[10] <= 0.3) return undefined;
    screenScratch[0] = x;
    screenScratch[1] = y;
    screenScratch[2] = z;
    const ndc = camera.worldToScreenPoint(screenScratch, screenScratch);
    if (Math.abs(ndc[0]) > 1.05 || Math.abs(ndc[1]) > 1.05) return undefined;
    return [((ndc[0] + 1) / 2) * canvas.clientWidth, ((1 - ndc[1]) / 2) * canvas.clientHeight];
  }

  // ---- one frame ---------------------------------------------------------------------------
  function frame(deltaSeconds) {
    const real = Math.min(deltaSeconds, 1 / 20);
    now += real;
    status.frames++;
    // Hit-stop: after a heavy blow the world almost holds still for a few frames.
    if (view.freeze > 0) {
      hitStop = Math.max(hitStop, view.freeze);
      view.freeze = 0;
    }
    const dt = hitStop > 0 && mode === 'play' ? real * 0.08 : real;
    hitStop = Math.max(0, hitStop - real);

    // 1. Input: the mouse or right stick turns the camera in every mode.
    const pad = input.poll();
    follow.yaw -= pad.lookX * 0.0032;
    follow.pitch += pad.lookY * 0.0026;
    follow.distance += pad.zoom * 1.2;

    // 2. Rules.
    if (mode === 'title') follow.yaw += real * 0.2;
    else if (mode === 'play') {
      if (game.state === 'play' && game.waitingForChoice()) {
        if (!cardsShown) openCards();
      } else if (game.state === 'play') {
        // Movement keys are relative to where the camera looks.
        const wish = follow.moveDirection(pad.forward, pad.right, moveScratch);
        simInput.moveX = wish[0];
        simInput.moveZ = wish[2];
        simInput.jump = pad.jump;
        simInput.slam = pad.slam;
        simInput.roll = pad.roll;
        game.update(dt, simInput);
      }
      // A moment after the run ends, show the result.
      if (game.state !== 'play' && !endAt) {
        syncTouchControls();
        endAt = now + 1.6;
        audio.play(game.state === 'won' ? 'won' : 'lost');
      }
      if (endAt && now >= endAt) {
        setMode('over');
        input.release();
        cardsShown = false;
        hud.showEnd(game, { onRestart: start, onQuit: showTitle });
      }
    }

    // 3. Effects, text and sound for what just happened.
    const events = game.events;
    if (events.length) {
      view.consume(events);
      if (mode !== 'title') {
        hud.consume(events, game, project, now);
        for (const event of events) audio.play(event.type, event);
      }
      events.length = 0;
    }

    // 4. Draw state. A paused game holds its pose.
    view.update(mode === 'paused' ? 0 : dt, game);

    // 5. Camera: follow the player, or a standing friend while the player is down.
    //    Leave room for the title panel when it overlays the full-screen canvas.
    const watched = human.down ? (game.pandas.find((panda) => !panda.down) ?? human) : human;
    const aside = mode === 'title' && !canvas.inert ? 2.3 : 0,
      ease = Math.min(1, real * 12),
      // Look a little ahead of a moving panda so more of what is coming is in view.
      lead = mode === 'play' && !watched.down ? Math.min(1.6, watched.speedNow * 0.14) : 0;
    target[0] += (watched.x + watched.headingX * lead + Math.cos(follow.yaw) * aside - target[0]) * ease;
    target[2] += (watched.z + watched.headingZ * lead - Math.sin(follow.yaw) * aside - target[2]) * ease;
    target[1] += (watched.y - target[1]) * Math.min(1, real * 5);
    follow.update(real);
    // The view widens with speed: rolling, diving and big jumps feel faster.
    const rush =
      mode === 'play' && !watched.down
        ? (watched.rolling ? 7 : 0) + (watched.slamming ? 10 : 0) + Math.min(6, Math.max(0, watched.speedNow - 8) * 0.8)
        : 0;
    camera.fov += (55 + rush - camera.fov) * Math.min(1, real * 7);
    camera.updateProjectionMatrix();
    if (view.shake > 0) {
      const p = camera.position,
        k = view.shake * view.shake * 0.35;
      camera.setPosition(p[0] + (Math.random() - 0.5) * k, p[1] + (Math.random() - 0.5) * k, p[2] + (Math.random() - 0.5) * k);
    }
    camera.updateWorldMatrix();
    camera.updateViewMatrices();
    view.renderReflection(renderer, camera);

    // 6. Page and music. The tune is calm on the title and picks up for surges and bosses.
    if (mode !== 'title') hud.update(game, project, now, input.captured || input.touchMode);
    audio.music(mode === 'title' || mode === 'over' ? 0 : game.boss || game.t < game.surgeUntil ? 2 : 1);
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
  hud.setTitlePreview(canvas, (embedded) => {
    if (mode === 'title') follow.distance = embedded ? 6 : 7.5;
  });
  showTitle();
  startWorld3DLoop(engine, fail);
}

main().catch(fail);
