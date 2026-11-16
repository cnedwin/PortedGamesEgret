// Snow at the Mountain Temple: a top-down 3D action chapter from Water Margin. Lin Chong, spear in hand,
// goes up through the burnt fodder yard to the Mountain God's temple, where Lu Qian is waiting.
//
// Address options, for looking at one thing at a time:
//   ?auto        a rule-driven player takes the controls
//   ?at=yard | gate | boss | rage     begin further in
//   ?quality=low | mid | high         fix the picture quality for this visit
//   ?debug       show the state panel (F3 toggles it)
import { createEngine } from '@egret/engine';
import { Scene3D, createPerspectiveCamera3D } from '@egret/engine/world3d';
import { createAtmosphere3D, createWebGL2Renderer3D, createWorld3DHost, createWorld3DView, startWorld3DLoop } from '@egret/engine/webgl2/world3d';
import { createAudio } from './audio.mjs';
import { createHud } from './hud.mjs';
import { DEFAULT_KEYS, createInput } from './input.mjs';
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
  const defaults = { quality: 'auto', particles: 'some', sound: 'on', keys: { ...DEFAULT_KEYS } };
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
    models = await loadModels(),
    view = createView(scene, camera, models, { density: level.density, particles: amount, shadowSize: level.shadows || 1024 });
  progress(0.9, '请陆虞候入座');
  await new Promise((done) => setTimeout(done));

  const input = createInput(canvas, settings.keys),
    audio = createAudio();
  audio.setOn(settings.sound === 'on');
  let game = createGame(),
    mode = 'title',
    clock = 0,
    carry = 0,
    ratio = level.ratio,
    debug = params.has('debug');
  const hud = createHud(document.querySelector('#ui'), input, settings, {
    onSettings(next) {
      saveSettings(next);
      audio.setOn(next.sound === 'on');
    },
    onStart: () => mode === 'title' && startGame()
  });
  input.on('any', (code) => {
    if (code === 'F3') debug = !debug;
  });
  const bot = params.has('auto') ? (await import('../test/bot.mjs')).createBot() : null;

  // ---- staged moments -----------------------------------------------------------------------
  const lerp3 = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k),
    smooth = (k) => k * k * (3 - 2 * k);
  const SHOTS = {
    // Over the burning yard, coming down to the man on the road.
    open: () => (k) => ({ eye: lerp3([14, 20, 26], [6, 13, 44], smooth(Math.min(1, k * 1.3))), look: lerp3([4, 1, 8], [0, 1, 32], smooth(Math.min(1, k * 1.3))) }),
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
  let pending = [];
  function stage(id, time) {
    view.stage(time, SHOTS[id]());
    hud.stage(true);
    pending = LINES[id].map(([at, text, who]) => ({ at: clock + at, text, who }));
    if (id === 'open') {
      setTimeout(() => (hud.card('风雪山神庙', '第一回'), audio.gong()), 600);
    }
    if (id === 'end')
      setTimeout(() => {
        hud.card('第一回　完', '雪还在下。往东，是梁山泊。', 6);
        audio.gong();
      }, 3600);
  }

  function startGame() {
    mode = 'play';
    audio.start();
    hud.hideTitle();
    canvas.focus();
    const at = params.get('at');
    if (at) jump(at);
    else begin(game);
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
    switch (e.type) {
      case 'cine':
        stage(e.id, e.time);
        break;
      case 'stage':
        audio.setMood(e.stage === 'boss' ? 'boss' : e.stage === 'yard' ? 'yard' : 'road');
        if (e.stage === 'gate') hud.say('庙门的闩，落了。', '', 3);
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
      case 'fall':
        hud.card('倒在雪里', '', 2.6);
        setTimeout(() => hud.veil(true), 1700);
        break;
      case 'revive':
        view.snap(game);
        hud.veil(false);
        hud.note('在火盆边缓过一口气。', 1);
        audio.setMood('road');
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
    if (mode === 'play' && !hud.settingsOpen()) {
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
      for (const line of pending) if (!line.said && clock >= line.at) (line.said = true), hud.say(line.text, line.who, 2.6);
      if (hud.staged && game.cine <= 0 && !view.cine) hud.stage(false);
    }
    view.update(game, events, mode === 'play' ? dt * slowFor : dt, clock);
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
  /** Behind the title: a slow look over the burning yard toward the temple. */
  function titleCamera() {
    const a = clock * 0.05;
    camera.setPosition(9 + Math.sin(a) * 3, 9.5, 31 + Math.cos(a) * 2);
    camera.lookAt(0, 1.5, 6);
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
