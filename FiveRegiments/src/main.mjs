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
import { createFight, step, TICK } from './sim/fight.mjs';
import { incomingAttack } from './sim/combat-tells.mjs';
import { createBrain, createBrains } from './sim/brain.mjs';
import { ORDER, REGIMENTS, loadout, playerLoadout } from './sim/regiments.mjs';
import { PLACES, grade, planRoad, stageScore } from './sim/road.mjs';
import { createInput } from './input.mjs';
import { createHud, createTouchControls } from './hud.mjs';
import { createScreens, placeName } from './screens.mjs';
import { createSound } from './audio.mjs';
import { MARKS, openSave, recordRun, settingsOf } from './saves.mjs';
import { setLanguage, getLanguage, t, say } from './i18n.mjs';
import { loadMotion, skillTrailSegment, swingTrailActive } from './view/motion.mjs';
import { createFigure } from './view/figure.mjs';
import { createHorse } from './view/horse.mjs';
import { createEffects } from './view/effects.mjs';
import { skillSweepStyle } from './view/effect-profiles.mjs';
import { ARMS } from './view/weapons.mjs';
import { createCameraRig } from './view/camera.mjs';
import { createMountedPresentation } from './view/mounted-presentation.mjs';
import { createMountedContactPresentation, mountedContactBody } from './view/mounted-contact.mjs';
import { createContactAccent } from './view/contact-accent.mjs';
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
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mountedPresentation = createMountedPresentation(TICK);
  const mountedContact = createMountedContactPresentation();
  const contactAccent = createContactAccent();
  const fx = createEffects(scene, { particles: quality === 'low' ? 0.5 : 1, blood: settings.blood });

  const ui = document.querySelector('#ui');
  const hud = createHud(ui, { touch: coarse });
  const screens = createScreens(ui, {
    coarse,
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
      sound.setPaused(paused);
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
  function loadFigure(regiment, which) {
    motions[regiment] ??= loadMotion(new URL(`../assets/motion/${regiment}`, import.meta.url));
    return Promise.all([body(regiment, which), motions[regiment], REGIMENTS[regiment].horse ? body('horse', which) : null]);
  }
  function figureFor(man, [b, motion, horseBody]) {
    const fig = createFigure({ regiment: man.regiment, body: b, motion, world: scene, height: HEIGHT[man.regiment] });
    if (!horseBody) return fig;
    // A rider and his horse: the horse moves first, then he sits where its saddle is.
    const horse = createHorse({ body: horseBody, world: scene });
    return {
      ...fig,
      horse,
      update(m, g, dt, options) {
        horse.update(m.horse, dt, { rearing: m.mounted && m.stunKind === 'rear' && m.stun > 0 });
        fig.update(m, g, dt, { ...options, seat: horse.seat() });
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
    const next = await buildPlace(scene, name, { renderer, quality });
    stage?.dispose();
    stage = next;
    stageName = name;
    applyLook(renderer, stage.look, quality);
    fx.weather(stage.look.weather);
    return stage;
  }

  // ---- the lineup on the title and the choice ----------------------------------------------------------------
  let lineup = null;
  async function showLineup() {
    if (lineup) return lineup;
    const g = createFight({ hero: { regiment: ORDER[0] }, foes: ORDER.slice(1).map((regiment) => ({ regiment })) });
    g.men.forEach((m, i) => {
      m.x = (i - 2) * 1.9;
      m.z = 0.5 - Math.abs(i - 2) * 0.35;
      m.face = 0;
      // The rider stands his horse a pace back from the line.
      if (m.horse) Object.assign(m.horse, { x: m.x, z: m.z - 0.6, face: 0 }), (m.z -= 0.6);
    });
    const [, bodies] = await Promise.all([
      enter('county'),
      Promise.all(g.men.map((m) => loadFigure(m.regiment, quality === 'high' ? 'mid' : 'low')))
    ]);
    const figs = g.men.map((man, i) => figureFor(man, bodies[i]));
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
    sound?.setPaused(false);
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
        run = { regiment: s.me, loadout: playerLoadout(s.me), stages: [{ index: 0, place: s.place, foes: [...s.foes], level: 0.5, double: s.foes.length > 1, health: s.foes.length > 1 ? 0.8 : 1 }], at: 0, scores: [], stats: runStats(), free: true };
        card();
      }
    });
  }

  function card() {
    mode = 'card';
    sound?.music('air');
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
    const roster = [run.loadout.regiment, ...st.foes];
    let progress = 0;
    const arrived = (message) => screens.progress(++progress / 2, message);
    const [, bodies] = await Promise.all([
      enter(st.place).then(() => arrived(`${t('loadingMen')} · ${placeName(st.place)}`)),
      Promise.all(roster.map((regiment) => loadFigure(regiment))).then((loaded) => {
        arrived();
        return loaded;
      })
    ]);
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
    const list = game.men.map((man, i) => figureFor(man, bodies[i]));
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
    sound?.clearEffects();
    game = null;
  }

  function pause() {
    if (paused) return;
    paused = true;
    sound?.setPaused(true);
    input.capture(false);
    input.clear();
    if (game) {
      game.hero.queuedSwing = null;
      if (game.hero.act?.awaitingRelease) game.hero.act = null;
    }
    hud.show(false);
    touch.show(false);
    screens.pause({
      onResume: () => {
        paused = false;
        sound?.setPaused(false);
        screens.hide();
        hud.show(true);
        touch.show(coarse);
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
    sound?.music('air');
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

  function onEvent(e, tickEvents) {
    const heroId = game.hero.id;
    const defender = fighter(e.who),
      attacker = fighter(e.by);
    const impact = e.mountedImpact;
    const bearing = impact
      ? Math.atan2(impact.at[0] - impact.from[0], impact.at[1] - impact.from[1])
      : attacker && defender && attacker !== defender
      ? Math.atan2(defender.x - attacker.x, defender.z - attacker.z)
      : undefined;
    if (impact) mountedContact.remember(attacker, e, e.type === 'hit' ? 0.23 : defender?.r.offhand === 'shield' ? 0.43 : 0.34);
    const contactKick = (amount) => cam.kick(amount * (game.hero.mounted ? 0.65 : 1), bearing);
    switch (e.type) {
      case 'swingRelease': {
        const longWeapon = defender?.regiment === 'vanguard' || defender?.regiment === 'plume';
        const mountedRight = defender?.mounted && e.line === 'R';
        play(mountedRight ? 'mountedCut' : longWeapon || e.heavy > 0.5 ? 'heavy' : 'swing', {
          volume: e.line === 'T' ? 0.46 : 0.65,
          rate: e.line === 'T' ? 1.24 : 0.92 + Math.random() * 0.16
        });
        break;
      }
      case 'skillBeat': {
        // Wind and movement cues play even on a miss. Contact keeps its own hit or block sound.
        switch (e.id) {
          case 'spin': play('swing', { volume: 0.78, rate: 0.84 }); break;
          case 'swing': play('swing', { volume: 0.69, rate: [0.98, 1.13, 0.87][e.part] }); break;
          case 'charge': play('swing', { volume: 0.65, rate: 1.36 }); break;
          case 'moon': play('heavy', { volume: 0.64, rate: 1.2 }); break;
          case 'down': play('heavy', { volume: 0.71, rate: 0.81 }); break;
          case 'boar': play(e.part === 0 ? 'step' : 'heavy', { volume: 0.67, rate: e.part === 0 ? 0.84 : 1.39 }); break;
          case 'returnSpear': play(e.part < 0 ? 'spearPlant' : 'spearThrust', { volume: e.part < 0 ? 0.78 : 0.87 }); break;
          case 'turning':
          case 'stepCut': play('swing', { volume: 0.63, rate: 1.06 }); break;
          case 'flowers':
          case 'finisher': play('spearThrust', { volume: 0.49, rate: 1.24 }); break;
          case 'shieldSlam':
          case 'axeSmash':
          case 'poleAxeSmash': play('heavy', { volume: 0.71, rate: 0.9 }); break;
          case 'whirl': play('heavy', { volume: 0.59, rate: e.part % 2 ? 1.05 : 0.95 }); break;
        }
        break;
      }
      case 'skillCancel':
        figures.get(e.who)?.braceFromSpin();
        play('steelReady', { volume: 0.71 });
        if (e.who === heroId) hud.toast(t('spinGuard'), 'good');
        break;
      case 'recoveryCancel':
        if (e.who === heroId) play('steelReady', { volume: 0.58, rate: 0.92 });
        break;
      case 'feint':
        if (e.who === heroId) play('steelReady', { volume: 0.36, rate: 1.12 });
        break;
      case 'skill':
        if (e.id === 'gale') play('draw', { volume: 0.75, rate: 1.55 });
        else if (e.id === 'fan') play('draw', { volume: 0.46, rate: 1.9 });
        break;
      case 'block':
        figures.get(e.who)?.struck(e.heavy ?? 0, bearing, 'block');
        if (!tickEvents.some((next) => next.type === 'break' && next.by === e.by && next.who === e.who)) {
          if (e.arrow) play('shield', { volume: 0.8 });
          else play(defender?.r.offhand === 'shield' ? 'shield' : 'clash', { rate: 0.9 + Math.random() * 0.2 });
          if (e.who === heroId || e.by === heroId) contactKick(0.17);
        }
        break;
      case 'deflect':
        figures.get(e.who)?.struck(0, bearing, 'deflect');
        play('deflect');
        slow = 0.3;
        slowFor = 0.18;
        if (e.who === heroId) {
          contactKick(0.18);
          tally.deflects++;
          hud.toast(t('deflected'), 'good');
        }
        break;
      case 'break':
        play('break');
        if (e.by === heroId) {
          contactKick(0.27);
          tally.broken++;
          hud.toast(t('broken'), 'good');
        } else if (e.who === heroId) hud.toast(t('broken'), 'bad');
        break;
      case 'hit': {
        if (e.quiet) break;
        const p = projectToViewport3D(camera, impact ? mountedContactBody(impact) : chestOf(e.who), canvas.clientWidth, canvas.clientHeight);
        if (p.onScreen) hud.number([p.x, p.y], e.damage, (e.who === heroId ? 'bad' : '') + (e.crit ? ' crit' : ''));
        // A shield covering another line can concede chip damage and still make one contact.
        if (e.graze && tickEvents.some((next) => next.type === 'block' && next.by === e.by && next.who === e.who && next.line === e.line)) break;
        const heavy = (e.heavy ?? 0) > 0.5 || e.broke;
        const skillHit = e.skill && !e.arrow;
        const armoured = defender?.r.armour === 'heavy';
        const reaction = Math.max(e.heavy ?? 0, e.broke ? 0.65 : skillHit ? 0.38 : e.crit ? 0.28 : 0);
        figures.get(e.who)?.struck(reaction, bearing);
        const cue = e.kick ? 'kick' : e.arrow ? 'arrowHit' : e.crit ? 'crit' : heavy ? 'heavyHit'
          : skillHit ? (armoured ? 'skillArmourHit' : 'skillHit') : armoured ? 'armourHit' : 'hit';
        if (!e.broke) play(cue, { volume: 0.9 });
        if (e.who === heroId) contactKick(heavy ? 0.52 : skillHit ? 0.36 : 0.28);
        else if (e.by === heroId) {
          const close = attacker && defender && Math.hypot(defender.x - attacker.x, defender.z - attacker.z) < 3.35;
          const action = attacker?.act;
          if (close && !e.arrow && !e.broke && !e.glance &&
            (action?.kind === 'swing' && action.struck || action?.kind === 'skill' && action.id === e.skill)) {
            contactAccent.hold(attacker, heavy || skillHit ? 0.036 : 0.022);
          }
          // Keep ordinary follow-up inputs on the normal clock. Heavy blows still have a brief accent.
          if (heavy) {
            slow = Math.min(slow, 0.72);
            slowFor = Math.max(slowFor, 0.018);
          }
          if (!e.broke) contactKick(heavy ? 0.30 : skillHit ? 0.25 : 0.18);
        }
        break;
      }
      case 'kick':
        play('step', { volume: 0.6 });
        break;
      // The horse and the saddle.
      case 'horseRam':
        play('horseRam', { volume: 0.86 });
        if (e.who === heroId) {
          cam.kick(0.38, bearing);
          hud.toast(t('horseRamTaken'), 'bad');
        } else if (e.by === heroId) {
          cam.kick(0.19, bearing);
          hud.toast(t('horseRamHit'), 'good');
        }
        break;
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
      case 'mountOnRecovery':
        if (e.who === heroId) hud.toast(t('mountOnRecovery'), 'good');
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
        play('bowDraw', { volume: e.who === heroId ? 0.7 : 0.5 });
        break;
      case 'loose':
        if (e.kind === 'arrow' && !e.skill) {
          figures.get(e.who)?.releaseBow?.(e.power);
          play('bowLoose', { volume: 0.62 + 0.30 * e.power, rate: 1.05 - 0.09 * e.power });
          if (e.who === heroId && !reduceMotion.matches) cam.kick(0.08 + 0.12 * e.power, e.yaw + Math.PI);
        } else play(({ wave: 'bladeWave', fan: 'fanLoose', gale: 'galeLoose' })[e.skill] ?? 'loose');
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
    const target = lockTarget();
    const events = [];
    while (carry >= TICK) {
      carry -= TICK;
      const inputs = {};
      for (const [id, b] of Object.entries(brains)) inputs[id] = b.think(game, TICK);
      if (autoBrain) inputs.hero = autoBrain.think(game, TICK);
      else {
        const aim = target && game.hero.regiment === 'archer' ? null : undefined;
        const threat = incomingAttack(game)?.line;
        inputs.hero = input.sample(TICK, { threat, aim, bow: game.hero.regiment === 'archer' && !game.hero.knife, mounted: game.hero.mounted });
        inputs.hero.skillGuardCancel = true;
        inputs.hero.recoveryHandoff = true;
      }
      for (const man of game.men) mountedPresentation.capture(man);
      const tickEvents = step(game, inputs);
      for (const e of tickEvents) {
        onEvent(e, tickEvents);
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
    const fraction = carry / TICK;
    let cameraHero = game.hero;
    for (const m of game.men) {
      const f = figures.get(m.id);
      const shown = mountedPresentation.pose(m, fraction);
      if (m === game.hero) cameraHero = shown;
      const cut = mountedContact.target(game, m);
      const contactTime = cut?.time ?? contactAccent.sample(m, dt);
      f.update(shown, game, dt * k, { contactTime, mountedContact: cut?.point });
      // A sweep behind the outer half of a blade, only while a blow or a skill moves its point fast.
      const act = m.act,
        b = f.blade(),
        was = tips.get(m.id);
      // A galloping saddle moves faster than the ribbon's threshold by itself.
      // Use the held blade's movement in the rider's frame to measure an actual cut.
      const tip = b && (shown.mounted ? f.holder.worldToLocal([0, 0, 0], b[1]) : b[1]);
      tips.set(m.id, b ? { point: tip, act, mounted: m.mounted } : null);
      const step = dt * k;
      const visualAct = contactTime === null || !shown.act ? shown.act : { ...shown.act, t: contactTime };
      const cutting = swingTrailActive(visualAct, ARMS[m.regiment].main, m.prev?.attack);
      const segment = skillTrailSegment(visualAct);
      const trail = skillSweepStyle(act?.kind === 'skill' ? act.id : undefined, m.mounted);
      const meleeRibbon = m.id + ':melee';
      if (act?.kind === 'swing' && act.line !== 'T' && act !== was?.act) fx.sweep(meleeRibbon).clear();
      if (b && was?.mounted === m.mounted && act === was.act && step > 0 && trail.strength > 0 && (cutting || segment !== null)) {
        const [x, y, z] = was.point;
        const speed = Math.hypot(tip[0] - x, tip[1] - y, tip[2] - z) / step;
        if (speed > 5.5) {
          const edge = b[0].map((v, i) => v + (b[1][i] - v) * trail.edge);
          // Adjacent cuts use different ribbons so a fading cut cannot bridge to the next one.
          const ribbon = cutting ? meleeRibbon : segment > 0 ? m.id + ':' + segment : m.id;
          fx.sweep(ribbon).push(edge, b[1], Math.min(1, (speed - 5.5) / 8) * trail.strength, trail.tint);
        }
      }
    }
    // Contact effects sample this frame's drawn weapon, after the combat pose and hit reaction have been applied.
    for (const e of events) {
      const defender = fighter(e.who);
      fx.event(e, chestOf, (id) => figures.get(id)?.blade(), {
        shield: defender?.r.offhand === 'shield',
        armoured: defender?.r.armour === 'heavy',
        heading: defender?.face
      });
    }
    fx.update(dt * k, game, (id) => figures.get(id)?.takeBowLaunch?.());
    // The picture eases between ticks, while aim assistance still uses combat positions.
    const targetYaw = target ? Math.atan2(target.x - game.hero.x, target.z - game.hero.z) : undefined;
    const yaw = cam.update(dt, { hero: cameraHero, yaw: input.state.yaw, pitch: input.state.pitch, target, targetYaw, place: stage.place, guard: game.hero.guard, dead: !game.hero.alive, finish: over ? Math.min(1, overTime) : 0, mounted: game.hero.mounted, view: input.state.view, zoom: input.state.zoom, eye: figures.get(game.hero.id)?.eye?.(),
      aimingBow: Boolean(game.hero.draw) && !reduceMotion.matches });
    if (target) input.setYaw(yaw);
    const w = canvas.clientWidth,
      h = canvas.clientHeight;
    const project = (point) => {
      const p = projectToViewport3D(camera, point, w, h);
      return p.inFront && p.x > -80 && p.x < w + 80 && p.y > -80 && p.y < h + 80 ? [p.x, p.y] : null;
    };
    const heroAct = game.hero.act;
    const trackingSwing = heroAct?.kind === 'swing' && (!heroAct.struck || heroAct.t - heroAct.strikeAt < 0.08);
    const line = game.hero.guard ? game.hero.guardLine : trackingSwing ? heroAct.line : input.state.line;
    hud.update(dt, game, { line, preparedLine: heroAct?.awaitingRelease ? heroAct.line : undefined,
      incoming: incomingAttack(game), guard: game.hero.guard, locked: !!target, project, yaw: input.state.yaw, input: input.state });
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
        const tickEvents = step(game, inputs);
        for (const e of tickEvents) onEvent(e, tickEvents);
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
    run = { regiment: me, loadout: params.has('auto') ? loadout(me) : playerLoadout(me), stages: [{ index: 0, place: params.get('place') ?? 'county', foes, level: Number(params.get('level') ?? 0.5), double: foes.length > 1, health: foes.length > 1 ? 0.8 : 1 }], at: 0, scores: [], stats: runStats(), free: true };
    await begin(run.stages[0]);
  } else await title();
}

main().catch(fail);
