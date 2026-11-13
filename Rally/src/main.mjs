// Jinxiu Rally: eight racers, one circuit of mountains and water.
//
// This file starts the game and runs its frame. The other modules each own
// one concern:
//   track.mjs            the circuit, shared by the rules and the scenery
//   sim.mjs              the rules of a race (no page needed)
//   data.mjs             racers, items, classes, numbers and text
//   scenery.mjs          the circuit and the land around it
//   racers.mjs           the karts and their drivers
//   view.mjs             karts, items, effects and the camera
//   hud.mjs              the page around the canvas
//   input.mjs, audio.mjs devices and sound
import { createEngine } from '@egret/engine';
import { Scene3D, createPerspectiveCamera3D } from '@egret/engine/world3d';
import { createAudio } from './audio.mjs';
import { LAP_CHOICES, RACERS } from './data.mjs';
import { createHud } from './hud.mjs';
import { createInput } from './input.mjs';
import { createRace } from './sim.mjs';
import { createTrack } from './track.mjs';
import { createView } from './view.mjs';

// ---- address options ------------------------------------------------------------------
//   ?lang=zh|en      interface language (defaults to the browser's)
//   ?backend=webgpu  draw with WebGPU instead of WebGL2
//   ?quality=low     start at a picture quality: high, medium or low
//   ?ratio=1         cap on the device pixel ratio (default 1.5)
//   ?seed=123        replay the same race
const params = new URLSearchParams(location.search);
const useWebGPU = params.get('backend') === 'webgpu';
const backend = await (useWebGPU ? import('@egret/engine/webgpu/world3d') : import('@egret/engine/webgl2/world3d'));
const { createWorld3DHost, createWorld3DView, startWorld3DLoop } = backend;

const canvas = document.querySelector('#stage');

/** State for the browser console and for automated checks; the game never reads it. */
const status = { error: '', frames: 0, mode: 'title', race: undefined, renderer: undefined };
globalThis.__rally = status;

function fail(cause) {
  const box = document.querySelector('#error');
  box.textContent = 'Error / 出错了: ' + (cause?.message ?? cause);
  box.hidden = false;
  status.error = String(cause?.stack ?? cause);
}

// ---- saved choices ----------------------------------------------------------------------
const SETTINGS_KEY = 'jinxiu-rally';
function loadSettings() {
  const defaults = { racer: 0, klass: 1, laps: 3, muted: false, quality: 'high', lang: undefined };
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
  } catch {
    /* unreadable: start from the defaults */
  }
  const settings = { ...defaults, ...saved };
  // Anything out of range falls back, so an old or edited entry cannot break the menus.
  if (!RACERS[settings.racer]) settings.racer = 0;
  if (![0, 1, 2].includes(settings.klass)) settings.klass = 1;
  if (!LAP_CHOICES.includes(settings.laps)) settings.laps = 3;
  if (!['high', 'medium', 'low'].includes(settings.quality)) settings.quality = 'high';
  if (['high', 'medium', 'low'].includes(params.get('quality'))) settings.quality = params.get('quality');
  if (params.get('lang')) settings.lang = params.get('lang');
  return settings;
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
  // ---- engine, renderer and scene ---------------------------------------------------------
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
  status.renderer = renderer;
  Object.assign(renderer.postProcess, {
    bloom: true,
    bloomThreshold: 1.25,
    bloomIntensity: 0.4,
    fxaa: true,
    saturation: 1.1,
    contrast: 1.04,
    vignette: 0.18,
    ssaoRadius: 0.8,
    ssaoIntensity: 0.8,
  });

  const scene = new Scene3D();
  const camera = createPerspectiveCamera3D({ fov: 60, near: 0.3, far: 1600 });
  scene.addChild(camera);

  const settings = loadSettings();
  const track = createTrack();
  const view = createView(scene, camera, track);
  const hud = createHud(document.querySelector('#ui'), track, { lang: settings.lang });
  const input = createInput(hud.touchRoot);
  const audio = createAudio();
  audio.setMuted(settings.muted);

  /**
   * Picture quality. High: shadows, contact shading and the lake's mirror
   * image. Medium drops the contact shading and the mirror. Low also drops
   * post-processing and shadows.
   */
  function applySettings() {
    const high = settings.quality === 'high',
      low = settings.quality === 'low';
    renderer.postProcess.enabled = !low;
    renderer.postProcess.ssao = high;
    renderer.shadowsEnabled = !low;
    view.scenery.setReflect(high);
    audio.setMuted(settings.muted);
    saveSettings(settings);
  }
  applySettings();

  // ---- game flow: title -> select -> intro -> race <-> paused -> results --------------------
  const INTRO_SECONDS = 3.2;
  let mode = 'title',
    race,
    introTime = 0,
    resultsAt = 0,
    listed = 0,
    now = 0;
  const setMode = (next) => {
    mode = next;
    status.mode = next;
  };
  const seed = () => Number(params.get('seed')) || Date.now() & 0xffffff || 1;

  function attach(next) {
    race = next;
    status.race = race;
    view.attach(race);
  }
  /** A race between eight rivals, shown behind the title. */
  function demo() {
    attach(createRace({ track, klass: 1, laps: 3, seed: seed(), entries: RACERS.map((_, racer) => ({ racer, human: false })) }));
    race.startCountdown();
  }

  function showTitle() {
    setMode('title');
    hud.endRace();
    demo();
    hud.showTitle(settings, { onStart: showSelect, onChange: applySettings });
  }
  function showSelect() {
    audio.unlock();
    audio.play('click');
    setMode('select');
    hud.endRace();
    view.showcase(settings.racer);
    hud.showSelect(settings, {
      onBack: showTitle,
      onRace: start,
      onChange() {
        applySettings();
        audio.play('click');
        view.showcase(settings.racer);
      },
    });
  }
  function start() {
    audio.unlock();
    audio.play('item');
    // The player starts at the back; the rivals line up ahead in a random order.
    const rivals = RACERS.map((_, racer) => racer)
      .filter((racer) => racer !== settings.racer)
      .sort(() => Math.random() - 0.5);
    attach(
      createRace({
        track,
        klass: settings.klass,
        laps: settings.laps,
        seed: seed(),
        entries: [...rivals.map((racer) => ({ racer, human: false })), { racer: settings.racer, human: true }],
      }),
    );
    setMode('intro');
    introTime = 0;
    resultsAt = 0;
    hud.startRace();
    canvas.focus();
  }

  /** The results table; it is redrawn as the rest of the field finishes. */
  function showResults() {
    listed = race.finishedCount;
    hud.showResults(race, { onRestart: start, onQuit: showTitle });
  }

  function setPaused(on) {
    if (mode !== 'race' && mode !== 'paused') return;
    setMode(on ? 'paused' : 'race');
    hud.showPause(on, settings, {
      onChange: applySettings,
      onResume: () => setPaused(false),
      onRestart: start,
      onQuit: showTitle,
    });
  }

  input.onCommand = (command) => {
    audio.unlock();
    if (command === 'mute') {
      settings.muted = !settings.muted;
      applySettings();
    } else if (command === 'menu' || command === 'back') {
      if (mode === 'select') showTitle();
      else if (command === 'menu') setPaused(mode === 'race');
    } else if (command === 'confirm') {
      if (mode === 'title') showSelect();
      else if (mode === 'select' || mode === 'results') start();
      else if (mode === 'paused') setPaused(false);
    } else if (mode === 'select') {
      // Left and right step through the racers.
      settings.racer = (settings.racer + (command === 'left' ? RACERS.length - 1 : 1)) % RACERS.length;
      showSelect();
    }
  };
  addEventListener('pointerdown', () => audio.unlock());
  // Leaving the tab pauses the race.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setPaused(true);
  });

  /** Sound for what just happened: everything the player's kart does, and loud things nearby. */
  function sounds(events) {
    const me = race.human;
    for (const event of events) {
      if (event.type === 'count' || event.type === 'go' || event.type === 'thunder') audio.play(event.type);
      else if (event.type === 'pop' || event.type === 'explosion') {
        if (me && Math.hypot(event.x - me.x, event.z - me.z) < 90)
          audio.play(event.kind === 'firecracker' || event.type === 'explosion' ? event.type : 'land');
      } else if (!me || (event.kart !== me.index && event.other !== me.index)) continue;
      else if (event.type === 'lap') audio.play(event.final ? 'final' : 'lap');
      else audio.play(event.type, event);
    }
  }

  // ---- one frame -----------------------------------------------------------------------------
  function frame(deltaSeconds) {
    const dt = Math.min(deltaSeconds, 1 / 20);
    now += dt;
    status.frames++;
    const controls = input.poll(dt);
    // Touch controls hold the accelerator by themselves, which would stall the engine on the grid: wait for GO.
    if (input.touch && race.state === 'countdown' && race.countdown > 0.15) controls.throttle = 0;

    // 1. Rules.
    let step = dt;
    if (mode === 'title') {
      race.update(dt);
      if (race.state === 'done') demo();
    } else if (mode === 'intro') {
      introTime += dt;
      race.update(dt, controls);
      if (introTime >= INTRO_SECONDS) {
        race.startCountdown();
        setMode('race');
      }
    } else if (mode === 'race' || mode === 'results') {
      race.update(dt, controls);
      // A moment after the player crosses the line, show the results; the others race on behind them.
      if (mode === 'race' && race.human.finished) {
        if (!resultsAt) resultsAt = now + 2.6;
        else if (now >= resultsAt) {
          setMode('results');
          showResults();
        }
      } else if (mode === 'results' && race.finishedCount !== listed) showResults(); // another kart is home
    } else step = 0; // choosing a racer or paused: the world holds still

    // 2. Effects, banners and sound for what just happened.
    if (race.events.length) {
      view.consume(race.events, race);
      if (mode !== 'title' && mode !== 'select') {
        hud.consume(race.events, race);
        sounds(race.events);
      }
      race.events.length = 0;
    }

    // 3. Draw state and camera.
    const shot = mode === 'title' || mode === 'select' || mode === 'intro' ? mode : 'race';
    view.update(mode === 'select' ? dt : step, race, shot, {
      lookBack: controls.lookBack && mode === 'race',
      sweep: Math.min(1, introTime / INTRO_SECONDS),
    });
    view.scenery.renderReflection(renderer, camera);

    // 4. Page and sound.
    const me = race.human;
    if (me && mode !== 'select') hud.update(race, view, dt, mode === 'race' ? audio : undefined);
    const driving = Boolean(me) && (mode === 'race' || mode === 'intro') && !me.finished;
    audio.drive(me ? Math.abs(me.speed) / 50 : 0, me?.throttle ?? 0, me?.drifting ? me.driftLevel : -1, driving);
    audio.music(
      mode === 'title' || mode === 'select' || mode === 'results'
        ? 'menu'
        : mode === 'paused'
          ? undefined
          : me && me.lap >= race.laps && race.laps > 1 && !me.finished
            ? 'final'
            : 'race',
    );
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
  showTitle();
  startWorld3DLoop(engine, fail);
}

main().catch(fail);
