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
//   hud.mjs              the engine-owned interface above the scene
//   input.mjs, audio.mjs devices and sound
import { createEngine } from '@egret/engine';
import { prefersReducedMotion, watchReducedMotion } from '@egret/engine/web/kit';
import { Scene3D, createPerspectiveCamera3D } from '@egret/engine/world3d';
import { createAudio } from './audio.mjs';
import { RACERS } from './data.mjs';
import { loadSettings, saveSettings } from './settings.mjs';
import { createHud } from './hud.mjs';
import { createInput } from './input.mjs';
import { createRace } from './sim.mjs';
import { createTrack } from './track.mjs';
import { loadTrackModels } from './track-models.mjs';
import { createView } from './view.mjs';

// ---- address options ------------------------------------------------------------------
//   ?lang=zh|en      interface language (defaults to the browser's)
//   ?backend=webgpu  draw with WebGPU instead of WebGL2
//   ?quality=low     start at a picture quality: high, medium or low
//   ?ratio=1         cap on the device pixel ratio (default 1.5)
//   ?seed=123        replay the same race
//   ?models=original keep the original model artwork for comparison
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
  box.textContent = (status.settings?.lang === 'zh' || (!status.settings && navigator.language?.startsWith('zh')) ? '出错了：' : 'Error: ') + (cause?.message ?? cause);
  box.hidden = false;
  status.error = String(cause?.stack ?? cause);
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
  const gl = useWebGPU ? null : canvas.getContext('webgl2');
  const debugRenderer = gl?.getExtension('WEBGL_debug_renderer_info');
  const adapter = debugRenderer ? gl.getParameter(debugRenderer.UNMASKED_RENDERER_WEBGL) : '';
  // This D3D11 adapter loses the context on the first frame with f1fbd909 shadow maps.
  const shadowCompatible = !/ANGLE .*RTX 5090 Laptop GPU \(0x00002C58\) Direct3D11\b/i.test(adapter);
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

  let storage;
  try { storage = localStorage; } catch { /* private browsing */ }
  const settings = loadSettings(storage, params, navigator.language);
  status.settings = settings;
  const track = createTrack();
  const bundle = params.get('models') === 'original' ? null : scope.use(await loadTrackModels(backend.loadGltfFromUrl3D));
  status.models = { loaded: Object.keys(bundle?.models ?? {}), failures: bundle?.failures ?? {} };
  const view = createView(scene, camera, track, { trackModels: bundle?.models });
  // Less motion when the system asks for it, and again whenever the player changes the setting.
  view.reducedMotion = prefersReducedMotion();
  scope.use({ dispose: watchReducedMotion((reduced) => (view.reducedMotion = reduced)) });
  const input = createInput();
  const audio = createAudio();
  let preview;
  const hud = await createHud(canvas, track, {
    lang: settings.lang,
    onTouch: (name, held) => input.setTouchControl(name, held),
    onPause: () => { if (mode === 'race') setPaused(true); },
    onPreviewRect(rect, screen) {
      preview = rect && screen ? {
        x: (rect.x + rect.width / 2 - (screen.x ?? 0)) / screen.width,
        y: (rect.y + rect.height / 2 - (screen.y ?? 0)) / screen.height,
        width: rect.width / screen.width,
        height: rect.height / screen.height,
      } : undefined;
    },
    onError: fail,
  });
  status.ui = hud.host;
  status.hud = hud;
  status.input = input;
  input.onClearTouch = () => hud.releaseTouch();
  scope.use(input);
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
    renderer.shadowsEnabled = !low && shadowCompatible;
    view.scenery.setReflect(high);
    audio.setMuted(settings.muted);
    hud.lang = settings.lang;
    document.documentElement.lang = settings.lang;
    canvas.setAttribute("aria-label", settings.lang === "zh" ? "锦绣飞车：赛车舞台" : "Jinxiu Rally: racing stage");
    saveSettings(storage, settings);
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
    const driving = next === 'intro' || next === 'race';
    input.setTouchEnabled(driving);
    hud.setTouchAvailable(driving);
    hud.setRacePauseAvailable(next === 'race');
    hud.setSuspended(next === 'paused' || next === 'results');
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

  input.onCommand = (command, detail) => {
    audio.unlock();
    if (command === 'mute') {
      settings.muted = !settings.muted;
      applySettings();
      hud.refresh();
    } else if (mode === 'race') {
      if (command === 'menu' || command === 'back') setPaused(true);
    } else if (mode !== 'intro' && hud.menuActive()) {
      hud.command(command, detail);
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
      else if (event.type === 'pop' || event.type === 'explosion' || event.type === 'gong') {
        if (me && Math.hypot(event.x - me.x, event.z - me.z) < 90)
          audio.play(event.type === 'pop' && event.kind !== 'firecracker' ? 'land' : event.type);
      } else if (event.type === 'ink') {
        if (me && (event.kart === me.index || event.targets.includes(me.index))) audio.play('ink');
      } else if (!me || (event.kart !== me.index && event.other !== me.index)) continue;
      else if (event.type === 'lap') audio.play(event.final ? 'final' : 'lap');
      else if (event.type === 'boost') audio.play(event.source === 'gate' || event.source === 'draft' ? event.source : 'boost');
      else if (event.type === 'use') audio.play(event.item === 'cloud' || event.item === 'jade' ? event.item : 'use');
      else {
        audio.play(event.type, event);
        // Knocks are felt in the hands too.
        if (event.type === 'hit') input.rumble(1, 0.5);
        else if (event.type === 'wall' || event.type === 'thud' || event.type === 'bump') input.rumble(0.5, 0.15);
        else if (event.type === 'turbo') input.rumble(0.3, 0.2);
      }
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
      preview,
    });
    view.scenery.renderReflection(renderer, camera);

    // 4. Page and sound.
    const me = race.human;
    if (me && mode !== 'select') hud.update(race, view, dt, mode === 'race' ? audio : undefined);
    const driving = Boolean(me) && (mode === 'race' || mode === 'intro') && !me.finished;
    // The crowd is heard near the grandstand, and roars once the player is home.
    const nearStand = me ? Math.max(0, 1 - Math.abs(track.delta(me.s, 30)) / 140) : 0;
    audio.drive({
      speed: me ? Math.abs(me.speed) / 50 : 0,
      throttle: me?.throttle ?? 0,
      drift: me?.drifting ? me.driftLevel : -1,
      rough: Boolean(me && (me.grass || me.mud)),
      boost: Boolean(me && (me.boost > 0 || me.cloud > 0)),
      cheer: mode === 'paused' ? 0 : me?.finished ? 1 : mode === 'title' ? 0.35 : nearStand * 0.8,
      active: driving,
    });
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
  if (Object.keys(status.models.failures).length) {
    hud.showFailure({
      message: Object.keys(status.models.failures).join(', '),
      retry: () => location.reload(),
      continue: () => {},
    });
  }
  startWorld3DLoop(engine, fail);
}

main().catch(fail);
