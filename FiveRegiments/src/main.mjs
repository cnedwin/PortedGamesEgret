// Five Regiments: choose a regiment, fit two skills and four talents, and fight the other four one at a time in
// four places, then two at once before the palace. Third-person cold-steel duels on the engine's World3D.
//
// Address options, for looking at one thing at a time:
//   ?backend=webgl2 | webgpu   the renderer (WebGL2 by default; WebGPU on request where the browser has it)
//   ?quality=low | medium | high
//   ?duel=yulin,tiger[,archer]&place=bamboo   straight into a free duel, the first named is you
//   ?auto            a brain plays for you (for checks)   ?seed=7  fixed dice   ?debug  the readout
//   ?fixed           each frame drawn is one tick of the world (slow-motion captures on slow machines)
import { Scene3D, createPerspectiveCamera3D, loadGltf3D, projectToViewport3D } from '@egret/engine/world3d';
import { createWorld3DApp } from '@egret/engine/webgpu/world3d';
import { browserSaveStorage } from '@egret/engine/web/kit';
import { createFight, facing, step, TICK } from './sim/fight.mjs';
import { createBrain, createBrains } from './sim/brain.mjs';
import { ORDER, REGIMENTS, loadout } from './sim/regiments.mjs';
import { PLACES, grade, planRoad, stageScore } from './sim/road.mjs';
import { createInput } from './input.mjs';
import { createHud, createTouchControls } from './hud.mjs';
import { createScreens, placeName } from './screens.mjs';
import { createSound } from './audio.mjs';
import { MARKS, openSave, recordRun, settingsOf } from './saves.mjs';
import { setLanguage, getLanguage, t, say } from './i18n.mjs';
import { loadMotion } from './view/motion.mjs';
import { createFigure } from './view/figure.mjs';
import { createHorse } from './view/horse.mjs';
import { createEffects } from './view/effects.mjs';
import { createCameraRig } from './view/camera.mjs';
import { applyLook, buildPlace } from './view/stage.mjs';

const params = new URLSearchParams(location.search);
const canvas = document.querySelector('#stage');
const frame = document.querySelector('#frame');
const status = { frames: 0, mode: 'boot', error: null };
window.egretGame = { status };

function fail(cause) {
  status.error = String(cause?.message ?? cause);
  console.error(cause);
  const box = document.querySelector('#error');
  if (box) {
    box.hidden = false;
    box.textContent = /webgl|context/i.test(status.error) ? t('noGl') : t('error') + '\n' + status.error;
  }
}

// ---- the save: settings and the best mark of each regiment ------------------------------------------------------
// A save that could not be read starts again (the old text kept aside); one that cannot be written is said on the title.
const saveProblems = new Set();
const save = openSave(browserSaveStorage(), (problem) => saveProblems.add(problem.kind));
const settings = settingsOf(save.data);
setLanguage(params.get('lang') ?? settings.language ?? (navigator.language?.startsWith('zh') ? 'zh' : 'en'));
/** The page's own words follow the language: its lang, its title and the name a screen reader gives the canvas. */
function showLanguage() {
  document.documentElement.lang = getLanguage() === 'zh' ? 'zh-CN' : 'en';
  document.title = getLanguage() === 'zh' ? `${t('title')} · Five Regiments` : t('title');
  canvas.setAttribute('aria-label', t('canvasLabel'));
}
showLanguage();
const keep = () => save.update((d) => void (d.settings = { ...settings, language: getLanguage() }));

const fixedStep = params.has('fixed');
let holdAt = null;
const HEIGHT = { yulin: 1.8, tiger: 1.77, vanguard: 1.88, plume: 1.8, archer: 1.76 };

async function main() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const backend = params.get('backend') === 'webgpu' && navigator.gpu ? 'webgpu' : 'webgl2';
  const app = await createWorld3DApp(canvas, {
    backend,
    quality: params.get('quality') ?? (settings.quality === 'auto' ? 'auto' : settings.quality),
    onError: fail,
    onDeviceLost: () => fail('device lost')
  });
  const renderer = app.renderer;
  const quality = app.quality;
  const set = quality === 'low' ? 'low' : quality === 'medium' ? 'mid' : 'high';
  const scene = new Scene3D();
  const camera = createPerspectiveCamera3D({ fov: 52, near: 0.08, far: 600 });
  scene.addChild(camera);
  const cam = createCameraRig(camera);
  const fx = createEffects(scene, { particles: quality === 'low' ? 0.5 : 1, blood: settings.blood });

  const ui = document.querySelector('#ui');
  const hud = createHud(ui, { touch: coarse });
  const screens = createScreens(ui, {
    onLanguage: () => {
      setLanguage(getLanguage() === 'zh' ? 'en' : 'zh');
      showLanguage();
      keep();
      redraw?.();
    }
  });
  let redraw = null;
  const input = createInput(canvas, {
    settings,
    onPause: (why) => {
      if (mode === 'fight' && !over) pause();
      void why;
    },
    onLock: () => {
      locked = !locked;
    }
  });
  const touch = createTouchControls(ui, input, {
    onPause: () => {
      if (mode === 'fight' && !over) pause();
    }
  });
  let sound = null;
  const startSound = async () => {
    if (sound) return;
    removeEventListener('pointerdown', startSound);
    removeEventListener('keydown', startSound);
    try {
      sound = await createSound(app.scope, { on: settings.sound });
      sound.music(mode === 'fight' ? 'drums' : 'air');
    } catch (e) {
      console.warn(e);
    }
  };
  addEventListener('pointerdown', startSound);
  addEventListener('keydown', startSound);
  const play = (name, opts) => sound?.play(name, opts);

  // ---- characters ------------------------------------------------------------------------------------------
  const motions = {};
  const bytes = {};
  const decode = async ({ bytes: b, mimeType }) => createImageBitmap(new Blob([b], { type: mimeType }), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  async function body(regiment, which = set) {
    const key = regiment + which;
    bytes[key] ??= fetch(new URL(`../assets/characters/${regiment}-${which}.glb`, import.meta.url)).then((r) => {
      if (!r.ok) throw Error('Character HTTP ' + r.status);
      return r.arrayBuffer();
    });
    const asset = await loadGltf3D(new Uint8Array(await bytes[key]), { decodeImage: decode });
    return { scene: asset.scene, dispose: () => asset.dispose() };
  }
  async function figureFor(man, which) {
    motions[man.regiment] ??= loadMotion(new URL(`../assets/motion/${man.regiment}`, import.meta.url));
    const [b, motion, horseBody] = await Promise.all([body(man.regiment, which), motions[man.regiment], man.horse ? body('horse', which) : null]);
    const fig = createFigure({ regiment: man.regiment, body: b, motion: await motion, world: scene, height: HEIGHT[man.regiment] });
    if (!horseBody) return fig;
    // A rider and his horse: the horse moves first, then he sits where its saddle is.
    const horse = createHorse({ body: horseBody, world: scene });
    return {
      ...fig,
      horse,
      update(m, g, dt) {
        horse.update(m.horse, dt, { rearing: m.mounted && m.stunKind === 'rear' && m.stun > 0 });
        fig.update(m, g, dt, { seat: horse.seat() });
      },
      dispose() {
        fig.dispose();
        horse.dispose();
        horseBody.dispose();
      }
    };
  }

  // ---- places ----------------------------------------------------------------------------------------------
  let stage = null,
    stageName = null;
  async function enter(name) {
    if (stageName === name) return stage;
    stage?.dispose();
    stage = await buildPlace(scene, name, { renderer, quality });
    stageName = name;
    applyLook(renderer, stage.look, quality);
    fx.weather(stage.look.weather);
    return stage;
  }

  // ---- the lineup on the title and the choice ----------------------------------------------------------------
  let lineup = null;
  async function showLineup() {
    await enter('county');
    if (lineup) return lineup;
    const g = createFight({ hero: { regiment: ORDER[0] }, foes: ORDER.slice(1).map((regiment) => ({ regiment })) });
    g.men.forEach((m, i) => {
      m.x = (i - 2) * 1.9;
      m.z = 0.5 - Math.abs(i - 2) * 0.35;
      m.face = 0;
      // The rider stands his horse a pace back from the line.
      if (m.horse) Object.assign(m.horse, { x: m.x, z: m.z - 0.6, face: 0 }), (m.z -= 0.6);
    });
    const figs = await Promise.all(g.men.map((m) => figureFor(m, quality === 'high' ? 'mid' : 'low')));
    lineup = { game: g, figs, focus: null };
    cam.snap([0, 2.1, 8.2], [0, 1.25, 0]);
    return lineup;
  }
  function dropLineup() {
    if (!lineup) return;
    for (const f of lineup.figs) f.dispose();
    lineup = null;
  }

  // ---- state ---------------------------------------------------------------------------------------------------
  let mode = 'title';
  let game = null,
    brains = {},
    figures = new Map(),
    over = null,
    overTime = 0,
    paused = false,
    locked = false,
    slow = 1,
    slowFor = 0,
    carry = 0,
    clock = 0,
    run = null,
    tally = null,
    autoBrain = null;
  const runStats = () => ({ time: 0, deflects: 0, broken: 0, taken: 0 });

  async function title() {
    mode = 'title';
    status.mode = 'title';
    hud.show(false);
    touch.show(false);
    input.capture(false);
    sound?.music('air');
    screens.loading(t('loading'));
    await showLineup();
    const marks = Object.entries(save.data.marks)
      .map(([r, m]) => `${say(REGIMENTS[r].name)} ${t('marks')[MARKS.indexOf(m)]}`)
      .join(' · ');
    redraw = title;
    const note = saveProblems.has('write-failed') ? t('saveRefused') : saveProblems.size ? t('saveReset') : '';
    screens.title({ onRoad: choose, onFree: free, onSettings: () => openSettings(title), best: marks ? `${t('best')}：${marks}` : '', note });
  }

  function choose() {
    mode = 'choose';
    redraw = choose;
    screens.choose({
      selected: run?.regiment ?? 'yulin',
      onLook: (r) => lineup && (lineup.focus = ORDER.indexOf(r)),
      onBack: () => {
        if (lineup) lineup.focus = null;
        title();
      },
      onPick: (r) => fit(r)
    });
  }

  function fit(regiment) {
    mode = 'loadout';
    redraw = () => fit(regiment);
    screens.loadout({
      regiment,
      chosen: run?.regiment === regiment ? run.loadout : undefined,
      onBack: choose,
      onDone: (picked) => {
        run = { regiment, loadout: picked, stages: planRoad(regiment), at: 0, scores: [], stats: runStats() };
        card();
      }
    });
  }

  const freeState = { me: 'yulin', foes: ['tiger'], place: 'county' };
  function free() {
    mode = 'free';
    redraw = free;
    screens.free({
      state: freeState,
      onLook: (r) => lineup && (lineup.focus = ORDER.indexOf(r)),
      onBack: title,
      onGo: (s) => {
        run = { regiment: s.me, loadout: loadout(s.me), stages: [{ index: 0, place: s.place, foes: [...s.foes], level: 0.5, double: s.foes.length > 1, health: s.foes.length > 1 ? 0.8 : 1 }], at: 0, scores: [], stats: runStats(), free: true };
        card();
      }
    });
  }

  function card() {
    mode = 'card';
    const st = run.stages[run.at];
    redraw = card;
    screens.stageCard({ stage: st, total: run.stages.length, onGo: () => begin(st) });
  }

  async function begin(st) {
    mode = 'loading';
    status.mode = 'loading';
    screens.loading(`${t('loadingPlace')} · ${placeName(st.place)}`);
    dropLineup();
    clearFight();
    await enter(st.place);
    screens.progress(0.5);
    screens.loading(`${t('loadingMen')} · ${placeName(st.place)}`);
    const seed = Number(params.get('seed') ?? Math.floor(Math.random() * 1e9));
    game = createFight({
      hero: { ...run.loadout, turn: 14 },
      foes: st.foes.map((regiment) => ({ regiment, ...loadout(regiment) })),
      place: stage.place,
      seed,
      health: st.health ?? 1
    });
    brains = createBrains(game, { level: st.level });
    autoBrain = params.has('auto') ? createBrain(game.hero, { level: 0.7, rng: game.rng }) : null;
    const list = await Promise.all(game.men.map((m) => figureFor(m)));
    figures = new Map(game.men.map((m, i) => [m.id, list[i]]));
    hud.setup(game);
    over = null;
    overTime = 0;
    paused = false;
    // No lock-on by default, as the keys' layout has none; the middle button holds the camera on a foe. On a touch
    // screen a single foe is held from the start.
    locked = coarse && !st.double;
    tally = { deflects: 0, broken: 0 };
    input.setYaw(game.hero.face);
    cam.snap([game.hero.x, 2.2, game.hero.z + 3.5], [0, 1.4, 0]);
    screens.hide();
    hud.show(true);
    touch.show(coarse, game.hero);
    mode = 'fight';
    status.mode = 'fight';
    sound?.music('drums');
    play('drum');
    hud.banner(st.double ? t('oneTwo') : t('fight'), placeName(st.place), 2.2, 'start');
    if (!coarse && !params.has('auto')) input.capture(true);
  }

  function clearFight() {
    for (const f of figures.values()) f.dispose();
    figures.clear();
    tips.clear();
    fx.clear();
    game = null;
  }

  function pause() {
    if (paused) return;
    paused = true;
    input.capture(false);
    input.clear();
    hud.show(false);
    screens.pause({
      onResume: () => {
        paused = false;
        screens.hide();
        hud.show(true);
        if (!coarse) input.capture(true);
      },
      onSettings: () => openSettings(() => ((paused = false), pause())),
      onLeave: () => {
        paused = false;
        clearFight();
        title();
      }
    });
  }

  function openSettings(back) {
    redraw = () => openSettings(back);
    screens.settings({
      settings,
      onChange: (key, value) => {
        settings[key] = value;
        if (key === 'sound') sound?.setOn(value);
        if (key === 'blood') fx.blood = value;
        keep();
        openSettings(back);
      },
      onDone: () => {
        if (settings.quality !== 'auto' && settings.quality !== quality && app.setQuality) app.setQuality(settings.quality);
        back();
      }
    });
  }

  function finish() {
    const won = game.over === 'won';
    const st = run.stages[run.at];
    const hero = game.hero;
    const stats = { time: game.time, deflects: tally.deflects, broken: tally.broken, taken: hero.stats.taken, healthLeft: hero.hp / hero.maxHp };
    stats.score = won ? stageScore(stats) : 0;
    const last = run.at === run.stages.length - 1;
    let runMark = null;
    if (won) {
      run.scores.push(stats.score);
      if (last && !run.free) {
        runMark = grade(run.scores);
        save.update((d) => void recordRun(d, run.regiment, runMark));
      }
    }
    input.capture(false);
    hud.show(false);
    touch.show(false);
    mode = 'result';
    status.mode = 'result';
    status.last = { won, score: stats.score, time: stats.time };
    redraw = null;
    screens.result({
      won,
      double: st.double && won,
      stats,
      last,
      runMark,
      onNext: () => {
        run.at++;
        clearFight();
        card();
      },
      onRetry: () => {
        clearFight();
        card();
      },
      onTitle: () => {
        clearFight();
        title();
      }
    });
  }

  // ---- one tick of the fight --------------------------------------------------------------------------------
  const fighter = (id) => game?.men.find((m) => m.id === id);
  const chestOf = (id) => {
    const m = fighter(id);
    return m ? [m.x, (m.mounted ? 2.15 : 1.3) + (m.act?.air ?? 0), m.z] : [0, 1.3, 0];
  };
  function threatLine() {
    const hero = game.hero;
    let best = null,
      bd = Infinity;
    for (const m of game.men) {
      if (m.side === 'hero' || !m.alive) continue;
      const a = m.act;
      if (a?.kind === 'swing' && !a.struck) {
        const d = Math.hypot(m.x - hero.x, m.z - hero.z);
        if (d < a.reach + 1.2 && d < bd) [best, bd] = [facing(a.line), d];
      }
    }
    return best;
  }
  function lockTarget() {
    if (!locked) return null;
    const hero = game.hero;
    let best = null,
      bd = Infinity;
    for (const m of game.men) {
      if (m.side === 'hero' || !m.alive) continue;
      const d = Math.hypot(m.x - hero.x, m.z - hero.z);
      if (d < bd) [best, bd] = [m, d];
    }
    return best;
  }

  function onEvent(e) {
    const heroId = game.hero.id;
    const defender = fighter(e.who),
      attacker = fighter(e.by);
    const bearing = attacker && defender && attacker !== defender
      ? Math.atan2(defender.x - attacker.x, defender.z - attacker.z)
      : undefined;
    switch (e.type) {
      case 'swingRelease': {
        const longWeapon = defender?.regiment === 'vanguard' || defender?.regiment === 'plume';
        play(longWeapon || e.heavy > 0.5 ? 'heavy' : 'swing', {
          volume: e.line === 'T' ? 0.46 : 0.65,
          rate: e.line === 'T' ? 1.24 : 0.92 + Math.random() * 0.16
        });
        break;
      }
      case 'block':
        figures.get(e.who)?.struck(e.heavy ?? 0, bearing, 'block');
        if (e.arrow) play('shield', { volume: 0.8 });
        else play(defender?.r.offhand === 'shield' ? 'shield' : 'clash', { rate: 0.9 + Math.random() * 0.2 });
        if (e.who === heroId) cam.kick(0.16, bearing);
        break;
      case 'deflect':
        figures.get(e.who)?.struck(0, bearing, 'deflect');
        play('deflect');
        slow = 0.3;
        slowFor = 0.18;
        if (e.who === heroId) {
          cam.kick(0.18, bearing);
          tally.deflects++;
          hud.toast(t('deflected'), 'good');
        }
        break;
      case 'break':
        play('break');
        if (e.by === heroId) {
          tally.broken++;
          hud.toast(t('broken'), 'good');
        } else if (e.who === heroId) hud.toast(t('broken'), 'bad');
        break;
      case 'hit': {
        if (e.quiet) break;
        const heavy = (e.heavy ?? 0) > 0.5 || e.broke;
        figures.get(e.who)?.struck(e.heavy ?? 0, bearing);
        const cue = e.kick ? 'kick' : e.arrow ? 'arrowHit' : e.crit ? 'crit' : heavy ? 'heavyHit'
          : defender?.r.armour === 'heavy' ? 'armourHit' : 'hit';
        play(cue, { volume: 0.9 });
        if (e.who === heroId) cam.kick(heavy ? 0.52 : 0.28, bearing);
        else if (e.by === heroId) {
          slow = 0.12;
          slowFor = e.heavy ? 0.07 : 0.04;
          cam.kick(heavy ? 0.30 : 0.16, bearing);
        }
        const p = projectToViewport3D(camera, chestOf(e.who), canvas.clientWidth, canvas.clientHeight);
        if (p.onScreen) hud.number([p.x, p.y], e.damage, (e.who === heroId ? 'bad' : '') + (e.crit ? ' crit' : ''));
        break;
      }
      case 'kick':
        play('step', { volume: 0.6 });
        break;
      // The horse and the saddle.
      case 'horseHit': {
        const p = projectToViewport3D(camera, chestOf(e.who).map((v, i) => (i === 1 ? 1.2 : v)), canvas.clientWidth, canvas.clientHeight);
        if (p.onScreen) hud.number([p.x, p.y], e.damage, 'horse');
        break;
      }
      case 'horseDown':
        play('fall', { rate: 0.7 });
        break;
      case 'thrown':
        play('fall');
        if (e.who === heroId) hud.toast(t('thrown'), 'bad'), cam.kick(0.7);
        break;
      case 'mount':
      case 'dismount':
        play('step', { volume: 0.7, rate: 0.8 });
        break;
      case 'lance':
        play('heavy', { rate: 0.85 });
        break;
      case 'onFoot':
        if (e.who === heroId) hud.toast(t('needFoot'), 'bad');
        break;
      case 'noRage':
        if (e.who === heroId) hud.toast(t('needRage'), 'bad');
        break;
      case 'needHorse':
        if (e.who === heroId) hud.toast(t('needHorse'), 'bad');
        break;
      case 'needRun':
        if (e.who === heroId) hud.toast(t('needRun'), 'bad');
        break;
      case 'refund':
        if (e.who === heroId) hud.toast(t('refund'), 'good');
        break;
      case 'noArt':
        if (e.who === heroId) hud.toast(t('noArt'), 'bad');
        break;
      case 'daze':
        play('shield', { rate: 0.7 });
        if (e.who === heroId) hud.toast(t('dazed'), 'bad'), cam.kick(0.5);
        break;
      case 'noHorse':
        if (e.who === heroId) hud.toast(e.dead ? t('horseDead') : t('horseFar'), 'bad');
        break;
      case 'call':
        play('draw', { rate: 1.6, volume: 0.5 });
        break;
      case 'dressing':
        play('draw', { rate: 0.6, volume: 0.5 });
        break;
      case 'evade':
      case 'step':
        play('step', { volume: 0.5 });
        break;
      case 'draw':
        play('draw', { volume: 0.7 });
        break;
      case 'loose':
        play(e.kind === 'wave' ? 'heavy' : 'loose');
        break;
      case 'blast':
        play('blast');
        cam.kick(0.5);
        break;
      case 'mist':
        play('mist');
        break;
      case 'web':
        play('web');
        break;
      case 'shout':
        play('shout');
        break;
      case 'slam':
        play('kick');
        cam.kick(0.3);
        break;
      case 'down':
        play('fall');
        if (e.who !== heroId) {
          const left = game.men.filter((m) => m.side === 'foe' && m.alive).length;
          if (!left && game.men.filter((m) => m.side === 'foe').length > 1) hud.banner(t('double'), '', 2.5, 'win');
        }
        break;
      case 'won':
        play('gong');
        hud.banner(e.double ? t('double') : t('won'), '', 2.6, 'win');
        break;
      case 'lost':
        play('gong', { rate: 0.7 });
        hud.banner(t('lost'), '', 2.6, 'lose');
        break;
    }
  }

  const tips = new Map();
  function fightFrame(dt) {
    if (!game || paused) return;
    if (slowFor > 0) slowFor -= dt;
    else slow += (1 - slow) * (1 - Math.exp(-dt * 10));
    const k = over ? 0.35 : slow;
    carry += dt * k;
    const threat = threatLine();
    const target = lockTarget();
    const events = [];
    while (carry >= TICK) {
      carry -= TICK;
      const inputs = {};
      for (const [id, b] of Object.entries(brains)) inputs[id] = b.think(game, TICK);
      if (autoBrain) inputs.hero = autoBrain.think(game, TICK);
      else {
        const aim = target && game.hero.regiment === 'archer' ? null : undefined;
        inputs.hero = input.sample(TICK, { threat, aim, bow: game.hero.regiment === 'archer' && !game.hero.knife });
      }
      for (const e of step(game, inputs)) {
        onEvent(e);
        events.push(e);
      }
      if (game.over && !over) {
        over = game.over;
        overTime = 0;
      }
    }
    if (over) {
      overTime += dt;
      if (overTime > 2.4) return finish();
    }
    // Figures, effects, camera.
    for (const m of game.men) {
      const f = figures.get(m.id);
      f.update(m, game, dt * k);
      // A sweep behind the outer half of a blade, only while a blow or a skill moves its point fast.
      const act = m.act,
        b = f.blade(),
        was = tips.get(m.id);
      tips.set(m.id, b?.[1] ?? null);
      const step = dt * k;
      const cutting = act?.kind === 'swing' && (act.struck
        ? act.t - act.strikeAt < 0.12
        : !act.held && act.t >= act.wind - 0.07);
      if (b && was && step > 0 && (cutting || act?.kind === 'skill')) {
        const speed = Math.hypot(b[1][0] - was[0], b[1][1] - was[1], b[1][2] - was[2]) / step;
        if (speed > 5.5) {
          const edge = b[0].map((v, i) => v + (b[1][i] - v) * 0.76);
          fx.sweep(m.id).push(edge, b[1], Math.min(0.7, (speed - 5.5) / 8), m.side === 'hero' ? [1, 0.95, 0.85] : [1, 0.75, 0.6]);
        }
      }
    }
    // Contact effects sample this frame's drawn weapon, after the combat pose and hit reaction have been applied.
    for (const e of events) {
      const defender = fighter(e.who);
      fx.event(e, chestOf, (id) => figures.get(id)?.blade(), {
        shield: defender?.r.offhand === 'shield',
        armoured: defender?.r.armour === 'heavy'
      });
    }
    fx.update(dt * k, game);
    const yaw = cam.update(dt, { hero: game.hero, yaw: input.state.yaw, pitch: input.state.pitch, target, place: stage.place, guard: game.hero.guard, dead: !game.hero.alive, finish: over ? Math.min(1, overTime) : 0, mounted: game.hero.mounted, view: input.state.view, zoom: input.state.zoom, eye: figures.get(game.hero.id)?.eye?.() });
    if (target) input.setYaw(yaw);
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    const project = (point) => {
      const p = projectToViewport3D(camera, point, w, h);
      return p.inFront && p.x > -80 && p.x < w + 80 && p.y > -80 && p.y < h + 80 ? [p.x, p.y] : null;
    };
    hud.update(dt, game, { line: input.state.line, threat, guard: game.hero.guard, locked: !!target, project, yaw: input.state.yaw, input: input.state });
    touch.cool(game.hero);
    hud.hint(!coarse && !autoBrain && input.state.wantLock && !input.state.pointerLocked && !over ? t('clickToFight') : null);
  }

  // ---- one frame -----------------------------------------------------------------------------------------------
  app.show(scene, camera, {
    onUpdate(dt) {
      status.frames++;
      // `?fixed` (for captures on slow machines): every frame drawn moves the world on by one tick, so motion and
      // blade trails look as they do at full speed.
      dt = fixedStep ? TICK : Math.min(dt, 0.1);
      // Held for a capture: the picture goes on drawing while the fight stands still at the time asked for.
      if (holdAt !== null && game && game.time >= holdAt) dt = 0;
      clock += dt;
      stage?.update(dt);
      fx.tickWeather(dt);
      // Braziers burn.
      for (const f of stage?.fires ?? []) if (Math.random() < dt * 30) fx.flame([f.x, f.y, f.z]);
      if (mode === 'fight') fightFrame(dt);
      else {
        fx.update(dt, null);
        if (lineup) {
          lineup.game.men.forEach((m, i) => {
            m.guard = lineup.focus === i && Math.sin(clock * 0.8) > 0.6;
            m.guardLine = 'R';
            lineup.figs[i].update(m, lineup.game, dt);
          });
          const f = lineup.focus;
          if (f === null || f === undefined) {
            const a = clock * 0.08;
            cam.frame(dt, [Math.sin(a) * 2.5, 2.1, 7.6 + Math.cos(a) * 0.6], [0, 1.25, 0], 1.5);
          } else {
            const m = lineup.game.men[f];
            if (m.mounted) cam.frame(dt, [m.x + 1.4, 2.4, m.z + 4.6], [m.x, 1.75, m.z], 3);
            else cam.frame(dt, [m.x + 0.9, 1.65, m.z + 3.0], [m.x, 1.2, m.z], 3);
          }
        }
      }
    }
  });

  window.egretGame = {
    status,
    get game() {
      return game;
    },
    get mode() {
      return mode;
    },
    screens,
    renderer,
    camera,
    get lineup() {
      return lineup;
    },
    backend: app.backend,
    /** Stand the fight still once it reaches `seconds` (for screenshot baselines); null lets it go on. */
    holdAt(seconds) {
      holdAt = seconds;
    },
    /** Play the fight on by `seconds` at once with brains on both sides (for checks). */
    run(seconds) {
      if (!game) return false;
      autoBrain ??= createBrain(game.hero, { level: 0.7, rng: game.rng });
      for (let i = 0; i < seconds * 60 && !game.over; i++) {
        const inputs = { hero: autoBrain.think(game, TICK) };
        for (const [id, b] of Object.entries(brains)) inputs[id] = b.think(game, TICK);
        for (const e of step(game, inputs)) onEvent(e);
      }
      return game.over;
    }
  };
  // Hidden mid-fight (another tab, a phone call): held keys are let go and the fight waits on the pause page. The
  // engine's audio suspends itself while the page is hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return;
    input.clear();
    if (mode === 'fight' && !over && !autoBrain) pause();
  });
  document.querySelector('#boot')?.classList.add('done');

  const duel = params.get('duel');
  if (duel) {
    const [me, ...foes] = duel.split(',');
    run = { regiment: me, loadout: loadout(me), stages: [{ index: 0, place: params.get('place') ?? 'county', foes, level: Number(params.get('level') ?? 0.5), double: foes.length > 1, health: foes.length > 1 ? 0.8 : 1 }], at: 0, scores: [], stats: runStats(), free: true };
    await begin(run.stages[0]);
  } else await title();
}

main().catch(fail);
