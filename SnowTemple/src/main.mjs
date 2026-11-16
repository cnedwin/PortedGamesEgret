// Snow at the Mountain Temple: a top-down 3D action chapter from Water Margin. Lin Chong, spear in hand,
// goes up through the burnt fodder yard to the Mountain God's temple, where Lu Qian is waiting.
//
// Address options, for looking at one thing at a time:
//   ?auto        a rule-driven player takes the controls
//   ?at=yard | gate | boss | rage     begin further in
//   ?quality=low | mid | high         fix the picture quality for this visit
//   ?models=low | mid | high          fix the model detail for this visit
//   ?debug       show the state panel (F3 toggles it)
import { createEngine } from '@egret/engine';
import { Scene3D, createPerspectiveCamera3D } from '@egret/engine/world3d';
import { createAtmosphere3D, createWebGL2Renderer3D, createWorld3DHost, createWorld3DView, startWorld3DLoop } from '@egret/engine/webgl2/world3d';
import { createAudio } from './audio.mjs';
import { captureTempleLoadout, createTempleReplay } from './chapter.mjs';
import { createHud } from './hud.mjs';
import { DEFAULT_KEYS, createInput } from './input.mjs';
import { createLessons } from './lessons.mjs';
import { PLACES } from './rules/arena.mjs';
import { begin, createGame, quiet, step } from './rules/game.mjs';
import { loadModels } from './view/models.mjs';
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
  Object.assign(renderer.postProcess, { enabled: true, bloom: true, bloomThreshold: 1.05, bloomKnee: 0.5, bloomIntensity: 0.36, bloomLevels: 6, fxaa: true, vignette: 0.42, contrast: 1.06, saturation: 1.05, ssao: level.ssao, ssaoRadius: 0.7, ssaoIntensity: 1.1 });
  renderer.shadowsEnabled = !!level.shadows;
  const atmosphere = createAtmosphere3D({ fogColor: 0x30405e, fogDensity: 0.03, fogHeight: 0.2, fogFalloff: 0.32, shaftIntensity: 0 });
  renderer.postProcess.custom = atmosphere.post;

  progress(0.45, '栽松，铺雪');
  await new Promise((done) => setTimeout(done));
  const amount = { few: 0.5, some: 1, many: 1.6 }[settings.particles] ?? 1,
    // Model detail is its own choice; left to itself, a phone takes the light set.
    detail = ['low', 'mid', 'high'].includes(params.get('models') ?? settings.models) ? (params.get('models') ?? settings.models) : coarse ? 'low' : 'high',
    models = await loadModels(detail),
    view = createView(scene, camera, models, {
      detail,
      reflect: level === LEVELS.high && !params.has('noreflect'), density: level.density, particles: amount, shadowSize: level.shadows || 1024 });
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
    // Hold the spear and cloak against the yard fire, then rise into the play camera.
    open: () => (k, { hero }) => ({
      eye: lerp3([hero.x - 3.4, 2.75, hero.z + 5.2], [hero.x - 2.5, 4.1, hero.z + 7], smooth(k)),
      look: lerp3([hero.x, 1.8, hero.z - 7], [hero.x, 1.25, hero.z - 3.5], smooth(k))
    }),
    // Along the forecourt to Lu Qian.
    meet: () => (k, g) => ({ eye: lerp3([g.boss.x + 5, 3.2, g.boss.z + 9], [g.boss.x + 2.5, 2.4, g.boss.z + 5.5], smooth(Math.min(1, k * 1.25))), look: [g.boss.x, 1.5, g.boss.z] }),
    rage: () => (k, g) => ({ eye: [g.boss.x - 3 + k * 2, 2.2 + k, g.boss.z + 6.5], look: [g.boss.x, 1.6, g.boss.z] }),
    end: () => (k, g) => ({ eye: lerp3([g.hero.x + 4, 3, g.hero.z + 7], [g.hero.x + 10, 16, g.hero.z + 20], smooth(k)), look: [g.hero.x, 1.2, g.hero.z - k * 6] })
  };
  const LINES = {
    open: [[0.4, '草料场烧起来了。这把火，是有人放的。', '']],
    meet: [
      [0.5, '林教头。火里没寻着你的骨头，我只好多等一夜。', '陆谦'],
      [3.0, '太尉要的不过是你一条命，莫叫我为难。', '陆谦']
    ],
    rage: [[0.5, '我回不去了。你也休想走！', '陆谦']],
    end: [[0.6, '……高太尉，不会放过你。', '陆谦']]
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

  function stage(id, time) {
    view.stage(time, SHOTS[id]());
    hud.stage(true);
    pending = LINES[id].map(([at, text, who]) => ({ at: game.time + at, text, who }));
    if (id === 'open') titleCardAt = game.time + 0.6;
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
    audio.setPaused(false);
    audio.setMood(quickMeet ? 'gate' : 'title');
    audio.playUi(replay ? 'confirm' : 'start');
    hud.hideTitle();
    hud.stage(false);
    hud.clearSpeech();
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
        if (e.stage === 'gate') hud.say('庙门的闩，落了。', '', 3);
        if (e.stage === 'boss' && !templeLoadout) templeLoadout = captureTempleLoadout(game);
        break;
      case 'party':
        hud.say('庙那边又下来几个。', '', 2.6);
        break;
      case 'pickup':
        hud.note(e.note, e.grade);
        hud.bump();
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
      if (params.has('auto') || params.get('at')) startGame();
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
      for (const line of pending) if (!line.said && game.time >= line.at) (line.said = true), hud.say(line.text, line.who, 2.2);
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
    atmosphere.update(camera, view.sunDirection);
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
  startWorld3DLoop(engine, fail);
}

main().catch(fail);
