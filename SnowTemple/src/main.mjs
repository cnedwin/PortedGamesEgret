// Snow at the Mountain Temple: a top-down 3D action chapter from Water Margin. Lin Chong, spear in hand,
// goes up through the burnt fodder yard to the Mountain God's temple, where Lu Qian is waiting.
//
// Address options, for looking at one thing at a time:
//   ?auto        a rule-driven player takes the controls
//   ?at=yard | gate | boss | rage     begin further in
//   ?quality=low | mid | high         fix the picture quality for this visit
//   ?models=low | mid | high          fix the model detail for this visit
//   ?characters=original              compare the sculpted fallback bodies
//   ?debug       show the state panel (F3 toggles it)
import { createEngine } from '@egret/engine';
import { Scene3D, createPerspectiveCamera3D } from '@egret/engine/world3d';
import { createWebGL2Renderer3D, createWorld3DHost, createWorld3DView, startWorld3DLoop } from '@egret/engine/webgl2/world3d';
import { createAudio } from './audio.mjs';
import { DIALOGUE } from './dialogue.mjs';
import { captureTempleLoadout, createTempleReplay } from './chapter.mjs';
import { createHud } from './hud.mjs';
import { DEFAULT_KEYS, createInput } from './input.mjs';
import { createLessons } from './lessons.mjs';
import { PLACES } from './rules/arena.mjs';
import { begin, createGame, quiet, step } from './rules/game.mjs';
import { loadModels } from './view/models.mjs';
import { loadCharacterGroup } from './view/characters.mjs';
import { loadPropAtlas } from './view/prop-atlas.mjs';
import { createSnowLook } from './view/look.mjs';
import { createView } from './view/view.mjs';

const params = new URLSearchParams(location.search),
  canvas = document.querySelector('#stage'),
  boot = document.querySelector('#boot'),
  status = { frames: 0, error: null };
document.querySelector('#game').addEventListener('contextmenu', (event) => event.preventDefault());

function fail(cause) {
  status.error = cause;
  const box = document.querySelector('#error');
  box.hidden = false;
  box.textContent = /webgl/i.test(String(cause?.message ?? cause)) ? '这台设备的浏览器不支持本游戏需要的 WebGL 2。\n请换一台较新的手机或电脑再试。' : '出了点问题，画面停了。请重新载入。\n' + (cause?.message ?? cause);
  console.error(cause);
}

const SETTINGS_KEY = 'snow-temple-settings';
function loadSettings() {
  const defaults = { quality: 'auto', models: 'auto', particles: 'some', sound: 'on', keys: { ...DEFAULT_KEYS } };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}');
    return { ...defaults, ...saved, keys: { ...DEFAULT_KEYS, ...(saved.keys ?? {}) }, ...(params.get('quality') ? { quality: params.get('quality') } : {}) };
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

// What each quality level means: drawing scale, shadow map, grass, ambient occlusion.
const LEVELS = {
  low: { ratio: 1, shadows: false, density: 0.35, ssao: false },
  mid: { ratio: 1.25, shadows: 1024, density: 0.7, ssao: false },
  high: { ratio: 1.75, shadows: 2048, density: 1, ssao: true }
};

async function main() {
  const settings = loadSettings(),
    coarse = matchMedia('(pointer: coarse)').matches,
    level = LEVELS[settings.quality] ?? (coarse ? LEVELS.mid : LEVELS.high),
    progress = (k, note) => ((boot.querySelector('i').style.width = k * 100 + '%'), (boot.querySelector('.boot-note').textContent = note));

  progress(0.2, '点灯');
  const engine = await createEngine({ host: createWorld3DHost(canvas) }),
    scope = engine.createScope(),
    renderer = createWebGL2Renderer3D({ canvas, antialias: true, toneMapping: 'aces' });
  scope.use(renderer);
  const scene = new Scene3D(),
    camera = createPerspectiveCamera3D({ fov: 36, near: 0.5, far: 260 });
  scene.addChild(camera);
  const updateLook = createSnowLook(renderer, level.ssao);
  renderer.shadowsEnabled = !!level.shadows;

  progress(0.45, '栽松，铺雪');
  await new Promise((done) => setTimeout(done));
  const amount = { few: 0.5, some: 1, many: 1.6 }[settings.particles] ?? 1,
    // Model detail is its own choice; left to itself, a phone takes the light set.
    detail = ['low', 'mid', 'high'].includes(params.get('models') ?? settings.models) ? (params.get('models') ?? settings.models) : coarse ? 'low' : 'high',
    [models, loadedAtlas] = await Promise.all([loadModels(detail), loadPropAtlas(detail)]),
    propAtlas = loadedAtlas ? scope.use(loadedAtlas).maps : undefined,
    view = createView(scene, camera, models, {
      detail,
      reflect: level === LEVELS.high && !params.has('noreflect'), density: level.density, particles: amount, shadowSize: level.shadows || 1024, propAtlas });
  const loadExternal = params.get('characters') !== 'original';
  const roleScope = engine.createScope();
  const roleLifetime = new AbortController();
  const characterStatus = { level: detail, phase: loadExternal ? 'waiting' : 'disabled', loaded: [], failures: {} };
  status.characters = characterStatus;
  scope.use({
    dispose() {
      roleLifetime.abort();
      if (characterStatus.phase === 'waiting' || characterStatus.phase === 'loading') characterStatus.phase = 'cancelled';
      try {
        view.disposeCharacters();
      } finally {
        roleScope.dispose();
      }
    }
  });

  async function startBackgroundCharacters() {
    const signal = roleLifetime.signal;
    if (signal.aborted) return;
    characterStatus.phase = 'loading';
    try {
      const { group } = await loadCharacterGroup(engine, roleScope, detail, signal);
      const leases = await group.ready;
      for (const { value } of leases) {
        if (signal.aborted) return;
        const { kind, parts, error } = value;
        if (error !== undefined) {
          characterStatus.failures[kind] = error;
          continue;
        }
        try {
          const programs = [];
          for (const { mesh, material } of parts) {
            for (const item of Array.isArray(material) ? material : [material]) {
              programs.push({ mesh, material: item, fog: Boolean(scene.fog), environment: Boolean(scene.environment),
                receiveShadows: renderer.shadowsEnabled });
              if (renderer.shadowsEnabled) programs.push({ mesh, material: item, pass: 'shadow' });
            }
          }
          await renderer.preparePrograms(programs);
          // Give input and presentation a turn between role replacements.
          await new Promise(resolve => requestAnimationFrame(resolve));
          if (signal.aborted) return;
          view.useCharacterBody(kind, parts);
          characterStatus.loaded.push(kind);
        } catch (cause) {
          if (signal.aborted) return;
          characterStatus.failures[kind] = String(cause?.message ?? cause);
        }
      }
      characterStatus.phase = 'ready';
    } catch (cause) {
      if (signal.aborted) return;
      characterStatus.phase = 'failed';
      characterStatus.failures.group = String(cause?.message ?? cause);
    }
  }
  progress(0.9, '请陆虞候入座');
  await new Promise((done) => setTimeout(done));

  const input = createInput(canvas, settings.keys),
    audio = createAudio(),
    ui = document.querySelector('#ui'),
    result = document.querySelector('#chapter-result');
  view.onFoley = (event) => audio.play(event);
  audio.setOn(settings.sound === 'on');
  let game = createGame(),
    mode = 'title',
    clock = 0,
    carry = 0,
    ratio = level.ratio,
    debug = params.has('debug');
  const hud = createHud(ui, input, settings, {
    onSettings(next) {
      saveSettings(next);
      audio.setOn(next.sound === 'on');
    },
    onUiSound: (cue) => audio.playUi(cue),
    onStart: () => mode === 'title' && !hud.settingsOpen() && startGame()
  });
  input.on('any', (code) => {
    if (code === 'F3') debug = !debug;
  });
  const bot = params.has('auto') ? (await import('../test/bot.mjs')).createBot() : null;

  // ---- staged moments -----------------------------------------------------------------------
  const lerp3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k),
    smooth = (k) => k * k * (3 - 2 * k);
  const SHOTS = {
    // Start on Lin Chong's face, orbit outside the spear, then rise into the road camera.
    open: () => (k, { hero }) => {
      const side = 0.58;
      const close = [hero.x - 1.9, 2.04, hero.z - 3.25],
        shoulder = [hero.x - 3.95, 2.68, hero.z + 1.45],
        road = [hero.x - 2.5, 4.1, hero.z + 7],
        focus = [hero.x, 1.53, hero.z],
        trail = [hero.x, 1.25, hero.z - 3.5];
      return {
        eye: k < side ? lerp3(close, shoulder, smooth(Math.max(0, (k - 0.12) / (side - 0.12)))) : lerp3(shoulder, road, smooth((k - side) / (1 - side))),
        look: lerp3(focus, trail, smooth(k))
      };
    },
    // Along the forecourt to Lu Qian.
    meet: () => (k, { boss }) => ({
      eye: lerp3([boss.x + 4.5, 2.9, boss.z + 7.7], [boss.x + 2.4, 2.15, boss.z + 4.3], smooth(Math.min(1, k * 1.24))),
      look: [boss.x, 1.67, boss.z + 0.15]
    }),
    rage: () => (k, g) => ({ eye: [g.boss.x - 3 + k * 2, 2.2 + k, g.boss.z + 6.5], look: [g.boss.x, 1.6, g.boss.z] }),
    end: () => (k, g) => ({ eye: lerp3([g.hero.x + 4, 3, g.hero.z + 7], [g.hero.x + 10, 16, g.hero.z + 20], smooth(k)), look: [g.hero.x, 1.2, g.hero.z - k * 6] })
  };
  const LINES = {
    open: [[0.28, 'lin-opening']],
    meet: [[0.08, 'lu-meet'], [3.0, 'lu-demand']],
    rage: [[0.36, 'lu-rage']],
    end: [[0.62, 'lu-end']]
  };
  let pending = [],
    titleCardAt = Infinity,
    veilAt = Infinity,
    pendingHint = null,
    lesson = createLessons({ structured: true }),
    summary,
    templeLoadout,
    quickMeet = false;
  const freshSummary = () => ({ time: 0, parries: 0, ripostes: 0, falls: 0 });

  function speak(id) {
    const line = DIALOGUE[id];
    hud.say(line.text, line.who, line.seconds + 0.19);
    audio.speak(id);
  }

  function stage(id, time) {
    view.stage(time, SHOTS[id](), id === 'open' || id === 'meet');
    hud.stage(true);
    pending = LINES[id].map(([at, cue]) => ({ at: game.time + at, cue }));
    if (id === 'open') titleCardAt = game.time + 1.15;
  }

  function startGame(replay = '') {
    quickMeet = replay === 'temple';
    game = quickMeet ? createTempleReplay(templeLoadout) : createGame();
    mode = 'play';
    summary = freshSummary();
    if (!quickMeet) templeLoadout = null;
    lesson = createLessons({ structured: true });
    carry = 0;
    pending = [];
    pendingHint = null;
    titleCardAt = veilAt = Infinity;
    result.hidden = true;
    ui.inert = false;
    ui.classList.remove('complete');
    input.setEnabled(true);
    audio.start();
    audio.stopDialogue();
    audio.prepareDialogue(...(quickMeet ? ['lu-rage', 'lu-end'] : ['lin-opening', 'lin-yard', 'lin-wave']));
    audio.setPaused(false);
    audio.setMood(quickMeet ? 'gate' : 'title');
    audio.playUi(replay ? 'confirm' : 'start');
    hud.hideTitle();
    hud.stage(false);
    hud.clearSpeech();
    hud.clearPickups();
    hud.clearHint();
    hud.veil(false);
    view.resetRound(game);
    canvas.focus({ preventScroll: true });
    const at = replay ? '' : params.get('at');
    if (at) {
      jump(at);
      audio.setMood(at === 'yard' ? 'yard' : 'gate');
    }
    else if (!quickMeet) {
      begin(game);
      game.events.forEach(onEvent);
    }
  }
  for (const button of result.querySelectorAll('[data-replay]'))
    button.addEventListener('click', () => mode === 'result' && startGame(button.dataset.replay));

  function showResult() {
    mode = 'result';
    input.setEnabled(false);
    hud.clearSpeech();
    hud.clearHint();
    ui.classList.add('complete');
    ui.inert = true;
    const seconds = Math.floor(summary.time);
    result.querySelector('[data-stat="time"]').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    for (const stat of ['parries', 'ripostes', 'falls']) result.querySelector(`[data-stat="${stat}"]`).textContent = summary[stat];
    result.hidden = false;
    result.querySelector('[data-replay="temple"]').focus({ preventScroll: true });
    audio.gong();
  }
  /** Begin further in, for looking at one part. */
  function jump(at) {
    const hero = game.hero;
    if (at === 'yard') (hero.z = 18), (hero.x = 0);
    else {
      game.foes = game.foes.filter((foe) => foe.kind === 'lu');
      game.party = 1;
      game.stage = 'gate';
      game.bars.gate = false;
      game.checkpoint = 'rest';
      hero.x = 0;
      hero.z = at === 'gate' ? -6 : -20.5;
      hero.will = 100;
      if (at === 'rage') game.boss.hp = game.boss.maxHp * 0.52;
    }
    view.snap(game);
  }

  function onEvent(e) {
    audio.play(e);
    const hint = lesson(e, game.hero.counter > 0);
    if (hint) {
      if (hud.staged) pendingHint = hint;
      else hud.hint(hint.text, hint.action);
    }
    switch (e.type) {
      case 'cine':
        if (e.id === 'rage') audio.setMood('boss2');
        if (e.id === 'meet' && quickMeet) {
          game.cine = 0;
          quickMeet = false;
        } else stage(e.id, e.time);
        break;
      case 'stage':
        audio.setMood(e.stage === 'boss' ? 'boss1' : e.stage === 'done' ? 'end' : e.stage);
        if (e.stage === 'yard') {
          speak('lin-yard');
          audio.prepareDialogue('lin-gate', 'lu-meet', 'lu-demand');
        }
        if (e.stage === 'gate') {
          speak('lin-gate');
          audio.prepareDialogue('lu-rage', 'lu-end');
        }
        if (e.stage === 'boss' && !templeLoadout) templeLoadout = captureTempleLoadout(game);
        break;
      case 'party':
        speak('lin-wave');
        break;
      case 'pickup':
        hud.note(e.note, e.grade);
        if (!hud.flyPickup(e.kind, e.grade, ...view.screen(e.x, 0.5, e.z))) hud.bump();
        break;
      case 'rest':
        hud.note('烤了烤火，伤口不疼了，葫芦也灌满了。', 1);
        break;
      case 'hurt':
        hud.hurt();
        break;
      case 'parry':
        summary.parries++;
        break;
      case 'riposte':
        summary.ripostes++;
        hud.clearHint();
        pendingHint = null;
        break;
      case 'fall':
        summary.falls++;
        hud.card('倒在雪里', '', 2.6);
        veilAt = game.time + 1.7;
        break;
      case 'revive':
        veilAt = Infinity;
        view.snap(game);
        hud.veil(false);
        hud.note('在火盆边缓过一口气。', 1);
        audio.setMood(game.stage);
        break;
    }
  }

  // ---- one frame ----------------------------------------------------------------------------
  const STEP = 1 / 60,
    none = [];
  let slowFor = 0,
    fps = 60,
    fpsLow = 0,
    fpsHigh = 0;
  function frame(dt) {
    status.frames++;
    if (status.frames === 2) {
      boot.classList.add('done');
      hud.ready();
      audio.prepareDialogue('lin-opening');
      if (params.has('auto') || params.get('at')) startGame();
      if (loadExternal) requestAnimationFrame(startBackgroundCharacters);
    }
    dt = Math.min(dt, 0.1);
    clock += dt;
    // Keep the drawing size to the window, at the scale the quality asks for.
    if (renderer.resizeToDisplaySize(Math.min(devicePixelRatio || 1, ratio))) {
      camera.aspect = canvas.width / canvas.height;
      camera.updateProjectionMatrix();
    }
    let events = none;
    if (status.hold) dt = 0;
    const active = mode === 'play' && !hud.settingsOpen();
    audio.setPaused(hud.settingsOpen());
    audio.setListener(game.hero.x, game.hero.z);
    if (active) {
      if (game.stage !== 'done') summary.time += dt;
      // A moment stretched: a slip past a blade or a riposte slows the fight, not the clock.
      slowFor = game.slow > 0 ? 0.32 : 1;
      carry += dt * slowFor;
      events = [];
      while (carry >= STEP) {
        carry -= STEP;
        const record = bot ? bot(game) : input.sample(game.hero, input.pointer.seen ? view.ground(input.pointer.x, input.pointer.y) : null);
        for (const e of step(game, game.cine > 0 ? quiet() : record, STEP)) {
          events.push({ ...e });
          onEvent(e);
        }
      }
      for (const line of pending) if (!line.said && game.time >= line.at) (line.said = true), speak(line.cue);
      if (game.time >= titleCardAt) {
        titleCardAt = Infinity;
        hud.card('风雪山神庙', '第一回', 1.55);
        audio.gong();
      }
      if (game.time >= veilAt) {
        veilAt = Infinity;
        hud.veil(true);
      }
    }
    view.update(game, events, mode === 'play' ? (active ? dt * slowFor : 0) : dt, clock);
    if (active && hud.staged && game.cine <= 0 && !view.cine) {
      hud.stage(false);
      hud.clearSpeech();
      pending = [];
      if (game.stage === 'road') audio.setMood('road');
      if (game.stage === 'done') showResult();
    }
    if (active && pendingHint && !hud.staged) {
      hud.hint(pendingHint.text, pendingHint.action);
      pendingHint = null;
    }
    view.mirror?.(renderer, game);
    if (mode === 'title') titleCamera();
    updateLook(camera, view.fogLights, mode === 'title' || !!view.cine, game.stage === 'boss' && !view.cine, dt);
    hud.update(game, view);
    audio.update();

    // Automatic quality: let the drawing scale follow the frame rate.
    fps += (1 / Math.max(dt, 1e-3) - fps) * 0.05;
    if (settings.quality === 'auto' && mode === 'play') {
      fpsLow = fps < 42 ? fpsLow + dt : 0;
      fpsHigh = fps > 57 ? fpsHigh + dt : 0;
      if (fpsLow > 2.5 && ratio > 0.7) (ratio = Math.max(0.7, ratio - 0.25)), (fpsLow = 0);
      if (fpsHigh > 8 && ratio < level.ratio) (ratio = Math.min(level.ratio, ratio + 0.25)), (fpsHigh = 0);
    }
    hud.debug(debug ? `状态: ${game.hero.state}  关: ${game.stage}  过场: ${game.cine > 0 ? '是' : '否'}\n位置: ${game.hero.x.toFixed(1)}, ${game.hero.z.toFixed(1)}  气血: ${game.hero.hp | 0}  枪意: ${game.hero.will | 0}\n帧率: ${fps.toFixed(0)}  绘制比例: ${ratio}  陆谦: ${game.boss.state} ${game.boss.hp | 0}` : null);
  }
  // A preview pose on the snow road. Starting places the player back at the chapter entrance.
  Object.assign(game.hero, { x: -0.2, z: 24.2, face: -2.65 });
  function titleCamera() {
    const drift = Math.sin(clock * 0.18) * 0.3;
    if (camera.aspect < 1) {
      camera.setPosition(-1.1 + drift, 3.6, 34);
      camera.lookAt(0, 1.8, 11);
    } else {
      camera.setPosition(-4.4 + drift, 3.15, 32.5);
      camera.lookAt(0.5, 1.7, 10.3);
    }
  }

  await view.preparePrograms(renderer);
  createWorld3DView(engine, scope, { renderer, scene, camera, autoResize: false, onUpdate: frame, onError: fail });
  // For the console and for automated checks.
  window.__snow = {
    get game() {
      return game;
    },
    view,
    hud,
    status,
    renderer,
    places: PLACES,
    /** Play on by `seconds` at once, without waiting for frames; `until` may stop it early. */
    run(seconds, until) {
      for (let i = 0; i < seconds * 60; i++) {
        clock += STEP;
        const events = step(game, game.cine > 0 ? quiet() : bot ? bot(game) : quiet(), STEP).map((e) => ({ ...e }));
        events.forEach(onEvent);
        view.update(game, events, STEP, clock);
        if (until?.(game, events)) return true;
      }
      return false;
    }
  };
  progress(1, '起风');
  const loop = startWorld3DLoop(engine, fail);
  function onPageHide(event) {
    if (event.persisted) return;
    removeEventListener('pagehide', onPageHide);
    loop.dispose();
    try {
      scope.dispose();
    } finally {
      void engine.dispose().catch(console.error);
    }
  }
  addEventListener('pagehide', onPageHide);
}

main().catch(fail);
