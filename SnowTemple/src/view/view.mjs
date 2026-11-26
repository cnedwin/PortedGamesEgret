// The picture of the fight: it reads the game each frame, moves the figures, the camera and the lamps,
// and answers the game's events with light, sparks and dust.
import {
  InstancedMesh3D,
  Mesh3D,
  Object3D,
  PlanarReflection3D,
  createAmbientLight3D,
  createDirectionalLight3D,
  createHemisphereLight3D,
  createStandardMaterial3D
} from '@egret/engine/world3d';
import { BARS, PLACES } from '../rules/arena.mjs';
import { HERO } from '../rules/tune.mjs';
import { createBuilder, rgb } from './build.mjs';
import { TINT, createEffects } from './effects.mjs';
import { FALL_CONTACT, bowstringDraws, createFigure, foePose, heroPose, pose, validateCharacterBody } from './figures.mjs';
import { buildScenery, height, paved } from './scenery.mjs';

const GRADE_TINT = [TINT.white, TINT.jade, TINT.gold];
const LEADER_TINT = { swift: TINT.spear, iron: TINT.white, ember: TINT.fire };
const dirOf = (face) => [Math.sin(face), 0, Math.cos(face)];

function lootShape(kind) {
  const b = createBuilder();
  if (kind === 'coin') {
    for (let i = 0; i < 3; i++) b.limb([i * 0.05 - 0.05, 0.1 + i * 0.03, 0], [i * 0.05 - 0.05, 0.12 + i * 0.03, 0], 0.11, 0.11, { tint: rgb(0xc9973a), sides: 10 });
  } else if (kind === 'silver') {
    b.box(0, 0.12, 0, 0.26, 0.1, 0.14, { tint: rgb(0xcfd6e0) });
    b.ball(0, 0.17, 0, 0.1, 0.07, 0.07, { tint: rgb(0xe6ecf4), sides: 8, rings: 4 });
  } else if (kind === 'salve') {
    b.limb([0, 0.05, 0], [0, 0.24, 0], 0.09, 0.07, { tint: rgb(0xe8e2d2), sides: 8 });
    b.limb([0, 0.24, 0], [0, 0.31, 0], 0.035, 0.045, { tint: rgb(0xb3221c), sides: 8 });
  } else if (kind === 'tonic') {
    b.ball(0, 0.15, 0, 0.11, 0.12, 0.11, { tint: rgb(0x3f8f6a), sides: 8, rings: 5 });
    b.limb([0, 0.25, 0], [0, 0.33, 0], 0.03, 0.04, { tint: rgb(0x8a6a2c), sides: 6 });
  } else {
    b.limb([-0.22, 0.12, 0], [0.22, 0.12, 0], 0.06, 0.06, { tint: rgb(0xe6d6a8), sides: 8 });
    b.limb([-0.26, 0.12, 0], [-0.22, 0.12, 0], 0.075, 0.075, { tint: rgb(0x7a1f1a), sides: 8 });
    b.limb([0.22, 0.12, 0], [0.26, 0.12, 0], 0.075, 0.075, { tint: rgb(0x7a1f1a), sides: 8 });
  }
  return b.geometry();
}

export function createView(scene, camera, models, { density = 1, particles = 1, detail = 'high', reflect = false, shadowSize = 2048, characters = {}, propAtlas, manyLights = false } = {}) {
  const view = { shake: 0, cine: null, zoom: 1, fogLights: [] };

  // ---- night, snow and a cold moon ----------------------------------------------------------
  scene.background = [0.012, 0.017, 0.034];
  scene.fog = { kind: 'exponential', color: [0.026, 0.036, 0.07], density: 0.016 };
  scene.addChild(createHemisphereLight3D({ color: 0x8a9cbd, groundColor: 0x292c42, intensity: 0.32 }));
  scene.addChild(createAmbientLight3D({ intensity: 0.055 }));
  const moon = createDirectionalLight3D({ color: 0xb6c8ec, intensity: 0.82, castShadow: true });
  Object.assign(moon.shadow, { mapSize: shadowSize, extent: 24, near: 1, far: 90, cascades: 1 });
  scene.addChild(moon);
  // Soft camera-side fill lets the faces and forged edges read in the two low shots.
  const portraitFill = createDirectionalLight3D({ color: 0xf8dfc3, intensity: 0 });
  portraitFill.visible = false;
  scene.addChild(portraitFill);
  const MOON = [-17, 29, -9];

  const scenery = buildScenery(scene, models, { density, propAtlas });
  const fx = createEffects(scene, camera, { particles, manyLights });
  view.fx = fx;
  for (const lamp of scenery.lights) lamp.halo = { x: lamp.x, y: lamp.light.position[1] + 0.1, z: lamp.z, size: lamp.fire ? 3.4 : 2.15, colour: lamp.fire ? [1, 0.42, 0.14] : [1, 0.58, 0.26], strength: 0 };
  fx.setHalos(scenery.lights.map((lamp) => lamp.halo));

  // ---- people -------------------------------------------------------------------------------
  const bodies = { ...characters };
  const heroFigure = createFigure('hero', models, detail, bodies.hero);
  heroFigure.metal.emissive.set([0.45, 0.75, 1]);
  scene.addChild(heroFigure.root);
  let heroTravel = 0,
    heroLast = null;
  const figures = new Map();
  let charactersDisposed = false;
  function figureOf(foe) {
    let figure = figures.get(foe.id);
    if (!figure) {
      if (!bodies[foe.kind] && !models[foe.kind]) return null;
      figure = createFigure(foe.kind, models, detail, bodies[foe.kind]);
      figure.metal.emissive.set([1, 0.3, 0.12]);
      figure.travel = 0;
      figure.last = { x: foe.x, z: foe.z };
      if (foe.elite) {
        // A leader stands a little taller, with a ring of his colour at his feet.
        figure.root.setScale(1.12, 1.12, 1.12);
        figure.mark = fx.spawn('ring', { mode: 7, life: 1e6, from: [1.25, 1, 1.25], tint: LEADER_TINT[foe.elite], power: 2, k: 1, track: (item) => item.mesh.setPosition(foe.x, 0.12, foe.z) });
      }
      scene.addChild(figure.root);
      figures.set(foe.id, figure);
    }
    return figure;
  }

  /** Attach a loaded body to current figures and use it for later spawns of this kind. */
  view.useCharacterBody = (kind, parts) => {
    if (charactersDisposed || !parts?.length) return false;
    const targets = kind === 'hero' ? [heroFigure] : [...figures.values()].filter(figure => figure.kind === kind);
    if (!targets.length) validateCharacterBody(parts);
    const staged = [];
    try {
      for (const figure of targets) staged.push({ figure, body: figure.stageBody(parts) });
    } catch (error) {
      for (const { figure, body } of staged) figure.disposeBody(body);
      throw error;
    }
    const retired = staged.map(({ figure, body }) => ({ figure, body: figure.installBody(body) }));
    bodies[kind] = parts;
    for (const { figure, body } of retired) figure.disposeBody(body);
    return true;
  };

  view.disposeCharacters = () => {
    if (charactersDisposed) return;
    charactersDisposed = true;
    const mounted = [heroFigure, ...figures.values()];
    figures.clear();
    for (const kind of Object.keys(bodies)) delete bodies[kind];
    for (const figure of mounted) figure.dispose();
  };

  // ---- arrows, loot -------------------------------------------------------------------------
  const arrowShape = createBuilder();
  arrowShape.limb([0, 0, -0.75], [0, 0, 0], 0.011, 0.012, { tint: rgb(0xaf8860), sides: 5 });
  arrowShape.limb([0, 0, 0], [0, 0, 0.1], 0.027, 0.002, { tint: rgb(0xd1e0e5), sides: 4 });
  for (let feather = 0; feather < 3; feather++) {
    const angle = feather * Math.PI * 2 / 3;
    const point = (radius, depth) => [Math.cos(angle) * radius, Math.sin(angle) * radius, depth];
    const corners = [point(0.008, -0.72), point(0.044, -0.686), point(0.033, -0.615), point(0.008, -0.576)];
    const tint = rgb(feather === 0 ? 0x995448 : 0xc8bea7);
    arrowShape.sheet(...corners, { tint });
    arrowShape.sheet(...corners.reverse(), { tint });
  }
  const arrowGeometry = arrowShape.geometry(),
    plain = createStandardMaterial3D({ vertexColors: true, roughness: 0.6, emissive: 0xffd9a0, emissiveIntensity: 0.6 }),
    shotViews = new Map(),
    lootGeometry = {},
    lootMaterial = createStandardMaterial3D({ vertexColors: true, roughness: 0.4, metallic: 0.3, emissive: 0xffffff, emissiveIntensity: 0.25 }),
    dropViews = new Map();

  // ---- camera -------------------------------------------------------------------------------
  const focus = { x: PLACES.start.x, z: PLACES.start.z },
    BACK = [0, 14.2, 12.1],
    eye = [0, 0, 0],
    look = [0, 0, 0];
  camera.fov = 36;
  camera.near = 0.5;
  camera.far = 260;
  camera.updateProjectionMatrix();
  /** A staged shot: the camera goes where `at(k)` says for `time` seconds, then returns to the fight. */
  view.stage = (time, at, portrait = false) => (view.cine = { t: 0, time, at, portrait });

  function gameCamera(game, dt) {
    const hero = game.hero,
      lu = game.boss;
    let tx = hero.x,
      tz = hero.z - 1.45,
      zoom = game.stage === 'yard' ? 1.06 : 1;
    if (game.stage === 'boss' && lu.state !== 'dead') {
      // Lean toward Lu Qian, but never let the hero leave the middle of the picture.
      const dx = lu.x - hero.x,
        dz = lu.z - hero.z,
        d = Math.hypot(dx, dz) || 1,
        pull = Math.min(3.2, d * 0.3);
      tx += (dx / d) * pull;
      tz += (dz / d) * pull;
      zoom = 1.025 + Math.min(0.26, d * 0.014);
    }
    // Keep threats at the edges of a narrow viewport in view.
    zoom *= Math.min(1.22, Math.max(1, 1.2 / camera.aspect));
    const k = 1 - Math.exp(-dt * 5.5);
    focus.x += (tx - focus.x) * k;
    focus.z += (tz - focus.z) * k;
    view.zoom += (zoom - view.zoom) * (1 - Math.exp(-dt * 2));
    eye[0] = focus.x + BACK[0];
    eye[1] = BACK[1] * view.zoom;
    eye[2] = focus.z + BACK[2] * view.zoom;
    look[0] = focus.x;
    look[1] = 0.9;
    look[2] = focus.z;
  }

  const drawn = { eye: [0, 30, 60], look: [0, 0, 20] };
  function moveCamera(game, dt, clock) {
    gameCamera(game, dt);
    let wantEye = eye,
      wantLook = look;
    if (view.cine) {
      const cine = view.cine;
      cine.t += dt;
      const k = Math.min(1, cine.t / cine.time),
        shot = cine.at(k, game),
        back = Math.max(0, (k - 0.78) / 0.22),
        e = back * back * (3 - 2 * back);
      wantEye = shot.eye.map((v, i) => v + (eye[i] - v) * e);
      wantLook = shot.look.map((v, i) => v + (look[i] - v) * e);
      if (k >= 1) view.cine = null;
      for (let i = 0; i < 3; i++) (drawn.eye[i] = wantEye[i]), (drawn.look[i] = wantLook[i]);
    } else
      for (let i = 0; i < 3; i++) {
        const k = 1 - Math.exp(-dt * 14);
        drawn.eye[i] += (wantEye[i] - drawn.eye[i]) * k;
        drawn.look[i] += (wantLook[i] - drawn.look[i]) * k;
      }
    view.shake = Math.max(0, view.shake - dt * 2.6);
    const s = view.shake * view.shake,
      jx = Math.sin(clock * 71) * s * 0.5,
      jy = Math.sin(clock * 93 + 1) * s * 0.4;
    camera.setPosition(drawn.eye[0] + jx, Math.max(drawn.eye[1] + jy, height(drawn.eye[0], drawn.eye[2]) + 1.5), drawn.eye[2]);
    camera.lookAt(drawn.look[0] + jx, drawn.look[1], drawn.look[2]);
    moon.setPosition(focus.x + MOON[0], MOON[1], focus.z + MOON[2]);
    moon.lookAt(focus.x, 0, focus.z);
    const fill = view.cine?.portrait ? 0.34 * Math.min(1, (view.cine.time - view.cine.t) * 2.1) : 0;
    portraitFill.intensity += (fill - portraitFill.intensity) * Math.min(1, dt * 12);
    portraitFill.visible = portraitFill.intensity > 0.001;
    if (!portraitFill.visible) portraitFill.intensity = 0;
    else {
      portraitFill.setPosition(drawn.eye[0] + 1.4, drawn.eye[1] + 1.2, drawn.eye[2]);
      portraitFill.lookAt(drawn.look[0], drawn.look[1], drawn.look[2]);
    }
  }

  // ---- events -------------------------------------------------------------------------------
  const foeById = (game, id) => game.foes.find((foe) => foe.id === id);
  const warnings = new WeakMap();
  function warn(game, e) {
    const foe = foeById(game, e.id);
    if (!foe) return;
    const move = e.move;
    const disc = move.shape === 'disc';
    const arc = move.shape === 'arc';
    const impact = e.time + (foe.state === 'windup' ? move.active * 0.5 : 0);
    const y = 0.11;
    const common = { mode: 3, y, life: impact + 0.14, tint: move.unblockable ? TINT.warnHard : TINT.warn, hard: move.unblockable, edgeType: disc ? 0 : arc ? 1 : 2 };
    // Preview the playable hit area from inShape, including the hero's collision margin.
    // Arrows keep a directional strip because their hit moves with the projectile.
    const margin = HERO.radius * 0.6;
    const radius = move.range + margin;
    const tail = 0.4;
    warnings.set(foe, e);
    const follow = (off = 0) => (item) => {
      if (warnings.get(foe) !== e || foe.move !== move || (foe.state !== 'windup' && foe.state !== 'strike')) return fx.release(item);
      const elapsed = foe.state === 'windup' ? foe.t : impact + foe.t - move.active * 0.5;
      item.k = Math.max(0, Math.min(1, elapsed / impact));
      const aftermath = Math.max(0, Math.min(1, (elapsed - impact) / 0.14));
      item.fade = Math.min(1, item.age * 30) * (1 - aftermath);
      if (disc) {
        item.mesh.setPosition(foe.aim.x, y, foe.aim.z);
        return;
      }
      const angle = foe.face + off;
      const behind = arc ? 0 : tail;
      item.mesh.setPosition(foe.x - Math.sin(angle) * behind, y, foe.z - Math.cos(angle) * behind);
      item.mesh.setRotation(0, angle, 0);
    };
    if (disc || arc) {
      fx.spawn(fx.sector(disc ? Math.PI * 2 : move.arc + 0.24), { ...common, from: [radius, 1, radius], track: follow() });
    } else {
      for (const off of move.shape === 'lines' ? [-0.42, 0, 0.42] : [0]) {
        fx.spawn('strip', { ...common, from: [move.width + margin * 2, 1, move.range + tail], track: follow(off) });
      }
    }
  }

  function onEvent(game, e) {
    const hero = game.hero;
    switch (e.type) {
      case 'slash': {
        const d = dirOf(e.face);
        // The moves that grow out of a cut wear its look, drawn larger.
        if (e.form === 'lunge') {
          fx.spawn('strip', { mode: 5, x: e.x + d[0] * 0.6, y: 1.15, z: e.z + d[2] * 0.6, yaw: e.face, life: 0.26, from: [1.1, 1, 3], to: [0.5, 1, 7], power: 3.2 });
          fx.spawn('arcNarrow', { mode: 0, x: e.x, y: 1.1, z: e.z, yaw: e.face, life: 0.24, from: [1.5, 1, 1.5], power: 2.6 });
          fx.burst(e.x, 0.15, e.z, { count: 10, dir: [-d[0], 0.3, -d[2]], spread: 0.6, speed: 4, life: 0.5, size: 0.15, tint: TINT.white, power: 0.9, rise: -3 });
        } else if (e.form === 'sweep') {
          fx.spawn('arcWide', { mode: 0, x: e.x, y: 1.1, z: e.z, yaw: e.face, life: 0.32, from: [1.2, 1, 1.2], to: [1.36, 1, 1.36], power: 3 });
          fx.spawn('arcWide', { mode: 0, x: e.x, y: 0.5, z: e.z, yaw: e.face + 0.5, life: 0.36, from: [1.05, 1, 1.05], to: [1.2, 1, 1.2], tint: TINT.white, power: 1.4 });
          fx.burst(e.x + d[0] * 1.6, 0.15, e.z + d[2] * 1.6, { count: 18, spread: 1, speed: 5, life: 0.55, size: 0.15, tint: TINT.white, power: 0.9, rise: -4 });
        } else if (e.cut === 0) {
          fx.spawn('strip', { mode: 5, x: e.x + d[0] * 0.6, y: 1.15, z: e.z + d[2] * 0.6, yaw: e.face, life: 0.2, from: [0.9, 1, 2.2], to: [0.5, 1, 4.6], power: 2.6 });
          fx.spawn('arcNarrow', { mode: 0, x: e.x, y: 1.1, z: e.z, yaw: e.face, life: 0.22, from: [1.05, 1, 1.05], power: 2.2 });
        } else if (e.cut === 1) fx.spawn('arcWide', { mode: 0, x: e.x, y: 1.1, z: e.z, yaw: e.face, life: 0.28, from: [1, 1, 1], to: [1.12, 1, 1.12], power: 2.6 });
        else {
          const gathered = e.form === 'charge',
            size = gathered ? 1.3 : 1;
          fx.spawn('arcUp', { mode: 0, x: e.x, y: 0.9, z: e.z, yaw: e.face, life: 0.3, from: [size, 1.15 * size, 1.15 * size], tint: gathered ? TINT.gold : TINT.spear, power: gathered ? 3.6 : 3 });
          const px = e.x + d[0] * 2.7,
            pz = e.z + d[2] * 2.7;
          fx.spawn('ring', { mode: 1, x: px, z: pz, life: 0.45, from: [0.6, 1, 0.6], to: [3.4 * size, 1, 3.4 * size], tint: gathered ? TINT.gold : TINT.spear, power: 2.2 });
          fx.scar(px, pz, 1.5 * size);
          fx.burst(px, 0.2, pz, { count: gathered ? 28 : 16, spread: 1, speed: 4.5, life: 0.6, size: 0.14, tint: TINT.white, power: 1.1, rise: -6 });
          if (gathered) fx.flash(px, pz, [1, 0.8, 0.5], 46, 0.22, 12);
          view.shake = Math.max(view.shake, gathered ? 0.85 : 0.55);
        }
        break;
      }
      case 'hit': {
        if (e.source === 'fire') {
          // A bite of the fire he is burning with: flame, not steel.
          fx.burst(e.x, 1.1, e.z, { count: 7, dir: [0, 1, 0], spread: 0.7, speed: 2.6, life: 0.6, size: 0.2, tint: TINT.fire, power: 3.2, rise: 3, drag: 1 });
          const burning = figures.get(e.id);
          if (burning) burning.flash = 0.5;
          break;
        }
        const d = dirOf(e.face),
          px = e.x - d[0] * 0.45,
          pz = e.z - d[2] * 0.45,
          tint = e.source === 'star' || e.source === 'rain' ? TINT.spear : TINT.gold;
        fx.burst(px, 1.15, pz, { count: e.heavy ? 22 : 11, dir: [d[0], 0.35, d[2]], spread: 0.55, speed: e.heavy ? 12 : 8, life: 0.36, size: 0.085, tint, power: 4 });
        const counter = e.source === 'riposte';
        const impactSize = counter ? 2.45 : e.heavy ? 1.8 : 1.1;
        fx.spawn('ring', { mode: 1, x: px, y: 1.1, z: pz, life: counter ? 0.26 : 0.2, from: [0.2, 1, 0.2], to: [impactSize, 1, impactSize], tint: counter ? TINT.gold : TINT.white, power: counter ? 3.6 : 2.4 });
        fx.flash(px, pz, [1, 0.8, 0.55], counter ? 41 : e.heavy ? 26 : 12, 0.16, 8);
        const figure = figures.get(e.id);
        if (figure) figure.flash = 1;
        view.shake = Math.max(view.shake, e.heavy ? 0.6 : 0.25);
        if (e.interrupted) fx.spawn('ring', { mode: 1, x: e.x, y: 1.2, z: e.z, life: 0.4, from: [0.4, 1, 0.4], to: [3, 1, 3], tint: TINT.gold, power: 3 });
        break;
      }
      case 'deflect':
      case 'block':
      case 'parry': {
        const big = e.type === 'parry',
          d = dirOf(e.face),
          px = e.x + d[0] * 0.7,
          pz = e.z + d[2] * 0.7;
        const tint = big ? TINT.gold : TINT.spear;
        fx.burst(px, 1.2, pz, { count: big ? 34 : 12, spread: 1, speed: big ? 11 : 7, life: big ? 0.5 : 0.3, size: 0.09, tint, power: big ? 5 : 3 });
        if (big) {
          fx.spawn('ring', { mode: 1, x: px, y: 1.2, z: pz, life: 0.35, from: [0.3, 1, 0.3], to: [3.6, 1, 3.6], tint: TINT.gold, power: 3.2 });
          fx.flash(px, pz, [1, 0.85, 0.5], 60, 0.3, 14);
          view.shake = Math.max(view.shake, 0.6);
        } else if (e.type === 'block') {
          fx.spawn('arcUp', { mode: 0, x: px, y: 1.15, z: pz, yaw: e.face, life: 0.18, from: [0.28, 0.36, 0.28], tint, power: 2.45 });
        }
        break;
      }
      case 'riposte':
        fx.spawn('strip', { mode: 5, x: e.fromX, y: 1.1, z: e.fromZ, yaw: Math.atan2(e.x - e.fromX, e.z - e.fromZ), life: 0.3, from: [1.1, 1, Math.hypot(e.x - e.fromX, e.z - e.fromZ) + 0.5], tint: TINT.gold, power: 2.4 });
        break;
      case 'riposteHit': {
        const d = dirOf(e.face);
        fx.spawn('strip', { mode: 5, x: e.x, y: 1.1, z: e.z, yaw: e.face, life: 0.34, from: [1.6, 1, 3], to: [0.9, 1, 8.5], power: 3.4 });
        fx.spawn('arcNarrow', { mode: 0, x: e.x, y: 1.1, z: e.z, yaw: e.face, life: 0.3, from: [1.5, 1, 1.5], power: 3 });
        fx.spawn('ring', { mode: 1, x: e.x + d[0] * 2.5, z: e.z + d[2] * 2.5, life: 0.5, from: [0.5, 1, 0.5], to: [5, 1, 5], power: 2.6 });
        view.shake = Math.max(view.shake, 0.85);
        break;
      }
      case 'dodge':
        fx.burst(e.x, 0.15, e.z, { count: 14, spread: 1, speed: 3, life: 0.55, size: 0.16, tint: TINT.white, power: 0.9, rise: -3 });
        break;
      case 'slip':
        fx.spawn('ring', { mode: 1, x: e.x, y: 0.9, z: e.z, life: 0.5, from: [0.4, 1, 0.4], to: [3.2, 1, 3.2], tint: TINT.white, power: 2 });
        break;
      case 'starsStart':
        fx.spawn('pad', { mode: 2, x: e.x, z: e.z, life: 0.7, from: [1.7, 1, 1.7], power: 1.8, track: (item, t) => ((item.k = Math.min(1, t * 3)), (item.fade = 1 - Math.max(0, t - 0.6) / 0.4)) });
        break;
      case 'stars':
        fx.flash(e.x, e.z, [0.6, 0.8, 1], 30, 0.25, 10);
        break;
      case 'starHit':
        fx.spawn('ring', { mode: 1, x: e.x, y: 1.1, z: e.z, life: 0.3, from: [0.2, 1, 0.2], to: [2, 1, 2], power: 2.6 });
        break;
      case 'cutArrow':
        fx.burst(e.x, 1.2, e.z, { count: 10, spread: 1, speed: 6, life: 0.3, tint: TINT.gold, power: 3 });
        break;
      case 'rain': {
        const R = e.radius ?? HERO.rain.radius;
        fx.spawn('pad', { mode: 2, x: e.x, y: 0.1, z: e.z, life: HERO.rain.time + 0.5, from: [R, 1, R], tint: TINT.gold, power: 2.1, hold: true, track: (item) => ((item.k = Math.min(1, item.age / 0.6)), (item.fade = Math.min(1, (item.life - item.age) / 0.5))) });
        fx.spawn('column', { mode: 4, x: e.x, y: 0, z: e.z, life: HERO.rain.time, from: [2.4, 30, 2.4], tint: TINT.gold, power: 2.4, k: 0.4, track: (item, t) => (item.fade = Math.min(1, t * 6, (1 - t) * 5)) });
        for (const spear of e.spears) fx.dropSpear(spear.x, spear.z, spear.at, spear.lean, spear.turn);
        fx.flash(e.x, e.z, [1, 0.85, 0.6], 40, HERO.rain.time, 18);
        view.shake = Math.max(view.shake, 0.4);
        break;
      }
      case 'spear':
        fx.scar(e.x, e.z, 1.1, 5);
        fx.spawn('ring', { mode: 1, x: e.x, z: e.z, life: 0.4, from: [0.3, 1, 0.3], to: [2.6, 1, 2.6], power: 2.4 });
        fx.spawn('column', { mode: 4, x: e.x, y: 0, z: e.z, life: 0.35, from: [0.9, 9, 0.9], power: 2.2, k: 1.4 });
        fx.burst(e.x, 0.2, e.z, { count: 9, spread: 1, speed: 6, life: 0.5, size: 0.1, tint: TINT.spear, power: 3 });
        view.shake = Math.max(view.shake, 0.3);
        break;
      case 'burst':
        fx.scar(e.x, e.z, 4.5, 9);
        fx.spawn('ring', { mode: 1, x: e.x, z: e.z, life: 0.7, from: [1, 1, 1], to: [(hero.rainRadius ?? HERO.rain.radius) + 2, 1, (hero.rainRadius ?? HERO.rain.radius) + 2], tint: TINT.gold, power: 3.4 });
        fx.spawn('ring', { mode: 1, x: e.x, z: e.z, life: 0.5, from: [0.5, 1, 0.5], to: [6, 1, 6], tint: TINT.white, power: 3 });
        fx.burst(e.x, 0.3, e.z, { count: 60, spread: 1, speed: 13, life: 0.8, size: 0.12, tint: TINT.gold, power: 4, rise: -4 });
        fx.flash(e.x, e.z, [1, 0.9, 0.7], 120, 0.5, 22);
        view.shake = 1;
        break;
      case 'windup':
        warn(game, e);
        break;
      case 'strike': {
        const move = e.move,
          boss = e.kind === 'lu',
          tint = boss ? (game.boss.phase === 2 ? TINT.fire : [1, 0.35, 0.3]) : [0.9, 0.85, 0.8];
        if (move.shape === 'arc') {
          const s = move.range / 3.4;
          fx.spawn(move.arc > 1.4 ? 'arcWide' : 'arcNarrow', { mode: 0, x: e.x, y: 1.1, z: e.z, yaw: e.face, life: 0.26, from: [s, 1, s], tint, power: boss ? 2.6 : 1.6 });
        } else if (move.shape === 'disc') {
          fx.spawn('ring', { mode: 1, x: e.aim.x, z: e.aim.z, life: 0.5, from: [0.5, 1, 0.5], to: [move.range + 0.6, 1, move.range + 0.6], tint, power: 2.6 });
          fx.burst(e.aim.x, 0.2, e.aim.z, { count: 24, spread: 1, speed: 7, life: 0.6, size: 0.15, tint: boss ? tint : TINT.white, power: boss ? 2.5 : 1 });
          if (boss) (view.shake = Math.max(view.shake, 0.8)), fx.scar(e.aim.x, e.aim.z, move.range * 0.9, 9);
        } else if (e.kind === 'lu') {
          for (const off of move.shape === 'lines' ? [-0.42, 0, 0.42] : [0]) {
            const a = e.face + off,
              d = dirOf(a);
            fx.spawn('strip', { mode: 5, x: e.x, y: 0.5, z: e.z, yaw: a, life: 0.55, from: [move.width + 0.6, 1, 2], to: [move.width + 0.2, 1, move.range], tint, power: 3 });
            if (move.shape === 'lines') for (let i = 1; i < 8; i++) fx.burst(e.x + d[0] * i * 1.9, 0.2, e.z + d[2] * i * 1.9, { count: 8, dir: [0, 1, 0], spread: 0.5, speed: 6, life: 0.7, size: 0.2, tint: TINT.fire, power: 3, rise: 3 });
          }
          view.shake = Math.max(view.shake, 0.6);
        }
        break;
      }
      case 'hurt':
        fx.burst(e.x, 1.2, e.z, { count: 16, spread: 1, speed: 6, life: 0.4, tint: [1, 0.3, 0.25], power: 3 });
        heroFigure.flash = 1;
        view.shake = Math.max(view.shake, e.heavy ? 0.9 : 0.55);
        break;
      case 'guardBreak':
      case 'shieldBreak':
      case 'postureBreak':
        fx.spawn('ring', { mode: 1, x: e.x, y: 1, z: e.z, life: 0.5, from: [0.4, 1, 0.4], to: [4, 1, 4], tint: TINT.gold, power: 3 });
        fx.burst(e.x, 1.2, e.z, { count: 30, spread: 1, speed: 9, life: 0.5, tint: TINT.gold, power: 4 });
        break;
      case 'death':
        fx.burst(e.x, 0.3, e.z, { count: 22, spread: 1, speed: 3.5, life: 0.9, size: 0.2, tint: TINT.white, power: 0.8, rise: -2 });
        break;
      case 'dropLand':
        fx.spawn('ring', { mode: 1, x: e.x, z: e.z, life: 0.45, from: [0.2, 1, 0.2], to: [1 + e.grade * 0.8, 1, 1 + e.grade * 0.8], tint: GRADE_TINT[e.grade], power: 2 });
        break;
      case 'pickup':
        fx.burst(e.x, 0.5, e.z, { count: 10, dir: [0, 1, 0], spread: 0.5, speed: 5, life: 0.5, tint: GRADE_TINT[e.grade], power: 3, rise: 4 });
        break;
      case 'drink':
        fx.burst(e.x, 1.4, e.z, { count: 16, dir: [0, 1, 0], spread: 0.6, speed: 2.5, life: 0.9, tint: TINT.jade, power: 2.5, rise: 2 });
        fx.spawn('ring', { mode: 1, x: e.x, z: e.z, life: 0.6, from: [0.3, 1, 0.3], to: [2, 1, 2], tint: TINT.jade, power: 1.6 });
        break;
      case 'rest': {
        const at = PLACES[e.id];
        fx.spawn('ring', { mode: 1, x: at.x, z: at.z, life: 0.9, from: [0.5, 1, 0.5], to: [4.5, 1, 4.5], tint: TINT.fire, power: 2 });
        fx.burst(at.x, 1, at.z, { count: 40, dir: [0, 1, 0], spread: 0.7, speed: 4, life: 1.2, tint: TINT.fire, power: 3, rise: 2.5 });
        break;
      }
      case 'cine':
        if (e.id === 'rage') {
          fx.spawn('ring', { mode: 1, x: e.x, z: e.z, life: 0.9, from: [0.5, 1, 0.5], to: [9, 1, 9], tint: TINT.fire, power: 3.2 });
          fx.burst(e.x, 0.5, e.z, { count: 70, spread: 1, speed: 10, life: 1.1, size: 0.16, tint: TINT.fire, power: 4, rise: 2 });
          fx.flash(e.x, e.z, [1, 0.5, 0.2], 90, 1.2, 20);
          view.shake = 1;
        }
        break;
      case 'revive':
        focus.x = e.x;
        focus.z = e.z;
        break;
      case 'fire': {
        // Fire on the ground. What burns the hero is drawn like any blow he must step out of; what he
        // laid himself is a formation in the colour of fire. The flames over both are fed each frame.
        const fade = (item) => (item.fade = Math.min(1, item.age * 8, (item.life - item.age) * 2.5));
        if (e.harm === 'hero') fx.spawn(fx.sector(Math.PI * 2), { mode: 3, x: e.x, y: 0.1, z: e.z, life: e.life, from: [e.r, 1, e.r], tint: TINT.warnHard, hard: true, k: 1, track: fade });
        else fx.spawn('pad', { mode: 2, x: e.x, y: 0.1, z: e.z, life: e.life, from: [e.r, 1, e.r], tint: TINT.fire, power: 2.2, k: 1, hold: true, track: fade });
        fx.spawn('ring', { mode: 1, x: e.x, z: e.z, life: 0.4, from: [0.3, 1, 0.3], to: [e.r * 1.15, 1, e.r * 1.15], tint: TINT.fire, power: 2.4 });
        fx.burst(e.x, 0.2, e.z, { count: 18, spread: 1, speed: 5, life: 0.6, size: 0.18, tint: TINT.fire, power: 3.2, rise: 2 });
        fx.flash(e.x, e.z, [1, 0.5, 0.2], 34, 0.5, 9);
        break;
      }
      case 'ignite':
        fx.spawn('ring', { mode: 1, x: e.x, y: 1, z: e.z, life: 0.4, from: [0.3, 1, 0.3], to: [2.4, 1, 2.4], tint: TINT.fire, power: 3 });
        fx.burst(e.x, 1.1, e.z, { count: 26, spread: 1, speed: 5, life: 0.7, size: 0.2, tint: TINT.fire, power: 3.6, rise: 3 });
        fx.flash(e.x, e.z, [1, 0.5, 0.2], 44, 0.35, 10);
        break;
      case 'scorch':
        fx.burst(e.x, 0.9, e.z, { count: 12, dir: [0, 1, 0], spread: 0.7, speed: 3, life: 0.5, size: 0.18, tint: TINT.fire, power: 3.2, rise: 3 });
        heroFigure.flash = 0.7;
        view.shake = Math.max(view.shake, 0.3);
        break;
      case 'arrowStuck':
        fx.burst(e.x, 1.1, e.z, { count: 7, spread: 1, speed: 3.5, life: 0.35, size: 0.08, tint: TINT.white, power: 1.6 });
        break;
      case 'wave':
        view.shake = Math.max(view.shake, 0.3);
        break;
    }
  }

  // ---- one frame ----------------------------------------------------------------------------
  const footPosition = [0, 0, 0],
    contacts = { L: 0, R: 0 };
  let glideTrailTime = 0;
  const fires = [{ x: 7.2, y: 2.4, z: 9.8, size: 1.1 }];

  function bodyContact(figure, time, x, z) {
    const landed = time >= FALL_CONTACT;
    if (landed && !figure.landed) {
      const surface = paved(x, z) ? 'stone' : 'snow';
      view.onFoley?.({ type: 'bodyLand', x, z, surface });
      fx.burst(x, 0.08, z, { count: surface === 'snow' ? 7 : 3, spread: 1.15, speed: 1.5, life: 0.42, size: 0.16, tint: TINT.white, power: 0.73, rise: -1 });
    }
    figure.landed = landed;
  }

  view.update = function update(game, events, dt, clock) {
    for (const e of events) onEvent(game, e);
    const hero = game.hero;

    // The hero.
    if (heroLast) heroTravel += Math.hypot(hero.x - heroLast.x, hero.z - heroLast.z);
    heroLast = { x: hero.x, z: hero.z };
    const [target, rate] = heroPose(hero, HERO, clock, heroTravel, game.deadFor, heroFigure.gait, dt);
    heroFigure.root.setPosition(hero.x, 0, hero.z);
    heroFigure.root.setRotation(0, hero.face, 0);
    pose(heroFigure, target, hero.freeze > 0 ? 0 : rate, dt);
    if (dt > 0) {
      // Footprints and foley come from the same contact in the captured stride.
      for (const side of ['L', 'R']) {
        const contact = target['contact' + side] ?? 0;
        if (contact >= 0.55 && contacts[side] < 0.55) {
          const [x, , z] = heroFigure.joints['foot' + side].getWorldPosition(footPosition),
            surface = paved(x, z) ? 'stone' : 'snow';
          if (surface === 'snow') {
            fx.print(x, z, hero.face);
            fx.burst(x, 0.08, z, { count: 2, spread: 1, speed: 1.4, life: 0.5, size: 0.13, tint: TINT.white, power: 0.7, rise: -1 });
          }
          view.onFoley?.({ type: 'footstep', x, z, surface });
        }
        contacts[side] = contact;
      }
      bodyContact(heroFigure, hero.state === 'dead' ? game.deadFor : 0, hero.x, hero.z);
    }
    const cutting = hero.state === 'cut' || hero.state === 'riposte' || hero.state === 'rain' || hero.state === 'stars';
    heroFigure.glow += ((cutting ? 3.2 : hero.counter > 0 ? 2 : 0.25) - heroFigure.glow) * Math.min(1, dt * 14);
    heroFigure.metal.emissiveIntensity = heroFigure.glow;
    heroFigure.flash = Math.max(0, heroFigure.flash - dt * 6);
    const [heroRed, heroGreen, heroBlue] = heroFigure.look.fill,
      rim = game.stage === 'boss' && !view.cine ? 0.018 : 0;
    heroFigure.tintBody(heroRed + rim * 0.55 + heroFigure.flash * 0.9, heroGreen + rim * 0.72 + heroFigure.flash * 0.2, heroBlue + rim + heroFigure.flash * 0.15);
    heroFigure.root.visible = !(hero.safe > 0 && hero.state === 'free' && Math.floor(clock * 14) % 2 === 0);
    if (hero.moving && hero.state === 'glide') {
      glideTrailTime += dt;
      if (glideTrailTime > 0.054) {
        glideTrailTime = 0;
        fx.burst(hero.x, 0.08, hero.z, { count: 5, spread: 1, speed: 1.4, life: 0.5, size: 0.13, tint: TINT.white, power: 0.7, rise: -1 });
        fx.burst(hero.x, 0.9, hero.z, { count: 3, spread: 0.6, speed: 1, life: 0.45, size: 0.1, tint: TINT.spear, power: 3, rise: 0 });
      }
    }
    // A ring at his feet while the riposte is there to be taken.
    const counter = hero.counter > 0 && hero.state !== 'dead';
    if (counter && !view.counterRing) view.counterRing = fx.spawn('ring', { mode: 7, life: 60, from: [1.45, 1, 1.45], tint: TINT.gold, power: 2.6, track: (item) => {
      item.mesh.setPosition(hero.x, 0.13, hero.z);
      item.k = Math.min(1, hero.counter / HERO.guard.counter);
    } });
    if (!counter && view.counterRing) (fx.release(view.counterRing), (view.counterRing = null));

    // The others.
    for (const foe of game.foes) {
      const figure = figureOf(foe);
      if (!figure) continue;
      figure.travel += Math.hypot(foe.x - figure.last.x, foe.z - figure.last.z);
      figure.last.x = foe.x;
      figure.last.z = foe.z;
      const [want, speed] = foePose(foe, clock, figure.travel, figure.gait, dt),
        jitter = foe.shake > 0 ? Math.sin(clock * 90) * foe.shake * 0.25 : 0;
      if (foe.state === 'dead' && foe.t > 2.6) figure.sink = Math.min(1.4, figure.sink + dt * 0.5);
      else figure.sink = 0;
      figure.root.visible = figure.sink < 1.4;
      figure.root.setPosition(foe.x + jitter, -figure.sink, foe.z);
      figure.root.setRotation(0, foe.face, 0);
      pose(figure, want, foe.freeze > 0 ? 0 : speed, dt);
      if (dt > 0) bodyContact(figure, foe.state === 'dead' ? foe.t : 0, foe.x, foe.z);
      const threat = foe.state === 'windup' ? 0.4 + (foe.t / foe.move.windup) * 3 : foe.state === 'strike' ? 3.5 : foe.kind === 'lu' && foe.phase === 2 ? 1.2 : 0;
      figure.glow += (threat - figure.glow) * Math.min(1, dt * 12);
      figure.metal.emissiveIntensity = figure.glow;
      figure.flash = Math.max(0, figure.flash - dt * 7);
      const [red, green, blue] = figure.look.fill;
      const alight = foe.burning > 0 && foe.state !== 'dead',
        heat = alight ? 0.22 + Math.sin(clock * 17 + foe.id) * 0.06 : 0;
      figure.tintBody(red + rim * 0.85 + figure.flash + heat, green + rim * 0.48 + figure.flash * 0.9 + heat * 0.35, blue + rim * 0.40 + figure.flash * 0.8);
      if (alight && Math.random() < dt * 34) fx.burst(foe.x + (Math.random() - 0.5) * 0.5, 0.5 + Math.random() * 1.1, foe.z + (Math.random() - 0.5) * 0.5, { count: 1, dir: [0, 1, 0], spread: 0.4, speed: 1.8, life: 0.6, size: 0.2, tint: TINT.fire, power: 3.4, rise: 3, drag: 1 });
      if (figure.mark && foe.state === 'dead') (fx.release(figure.mark), (figure.mark = null));
      if (foe.kind === 'lu' && foe.phase === 2 && foe.state !== 'dead' && Math.random() < dt * 40) {
        const d = dirOf(foe.face);
        fx.burst(foe.x + d[0] * 1.2 - d[2] * 0.4, 1.5, foe.z + d[2] * 1.2 + d[0] * 0.4, { count: 1, dir: [0, 1, 0], spread: 0.5, speed: 1.6, life: 0.6, size: 0.16, tint: TINT.fire, power: 3.5, rise: 3 });
      }
    }
    for (const [id, figure] of figures)
      if (!game.foes.some((foe) => foe.id === id)) {
        if (figure.mark) fx.release(figure.mark);
        figure.dispose();
        figures.delete(id);
      }

    // What flies.
    for (const shot of game.shots) {
      let item = shotViews.get(shot.id);
      if (!item) {
        if (shot.from === 'hero') item = { fx: fx.spawn('bolt', { mode: 5, y: 1.15, life: 9, from: [0.7, 0.7, 3.4], power: 3.2, hold: true }) };
        else {
          item = { mesh: new Mesh3D(arrowGeometry, plain) };
          scene.addChild(item.mesh);
        }
        shotViews.set(shot.id, item);
      }
      const mesh = item.mesh ?? item.fx.mesh;
      mesh.setPosition(shot.x, 1.15, shot.z);
      mesh.setRotation(0, shot.face, 0);
      if (item.fx && Math.random() < dt * 60) fx.burst(shot.x, 1.15, shot.z, { count: 1, spread: 0.6, speed: 1, life: 0.3, tint: TINT.spear, power: 3, rise: 0 });
    }
    for (const [id, item] of shotViews)
      if (!game.shots.some((shot) => shot.id === id)) {
        if (item.fx) fx.release(item.fx);
        else item.mesh.removeFromParent();
        shotViews.delete(id);
      }

    // What lies waiting to be picked up.
    for (const drop of game.drops) {
      let item = dropViews.get(drop.id);
      if (!item) {
        const node = new Object3D();
        node.addChild(new Mesh3D((lootGeometry[drop.kind] ??= lootShape(drop.kind)), lootMaterial));
        scene.addChild(node);
        item = { node, beam: null };
        dropViews.set(drop.id, item);
      }
      item.node.setPosition(drop.x, (drop.lift ?? 0) + 0.08 + (drop.landed ? Math.sin(clock * 3 + drop.id) * 0.05 + 0.1 : 0), drop.z);
      item.node.setRotation(0, clock * 1.6 + drop.id, drop.landed ? 0.2 : clock * 9);
      if (drop.landed && !item.beam) {
        const grade = drop.kind === 'page' ? 2 : drop.kind === 'coin' ? 0 : 1;
        item.beam = fx.spawn('column', { mode: 4, x: drop.x, y: 0, z: drop.z, life: 999, from: [0.5 + grade * 0.35, 2.2 + grade * 3.4, 0.5 + grade * 0.35], tint: GRADE_TINT[grade], power: 1.3 + grade * 0.5, k: 1, hold: true });
      }
    }
    for (const [id, item] of dropViews)
      if (!game.drops.some((drop) => drop.id === id)) {
        item.node.removeFromParent();
        if (item.beam) fx.release(item.beam);
        dropViews.delete(id);
      }

    // The gate swings open; fire closes the forecourt.
    for (const door of scenery.doors) {
      door.open += ((game.bars.gate ? 0 : 1) - door.open) * Math.min(1, dt * 1.6);
      door.hinge.setRotation(0, -door.side * door.open * 1.75, 0);
    }
    if (game.bars.court) {
      const bar = BARS.court;
      for (let i = 0; i < 3; i++) {
        const t = Math.random();
        fx.burst(bar.ax + (bar.bx - bar.ax) * t, 0.2, bar.az, { count: 1, dir: [0, 1, 0], spread: 0.35, speed: 3.2, life: 0.7, size: 0.34, tint: TINT.fire, power: 2.6, rise: 4, drag: 1 });
      }
    }

    // Fires and lamps: flames rise from every brazier and from the stack that is still burning.
    const lit = scenery.lights;
    for (const lamp of lit) {
      lamp.distance = Math.hypot(lamp.x - focus.x, lamp.z - focus.z);
      if (lamp.fire && lamp.distance < 30 && Math.random() < dt * 50) fx.burst(lamp.x + (Math.random() - 0.5) * 0.4, lamp.y - 0.4, lamp.z + (Math.random() - 0.5) * 0.4, { count: 1, dir: [0, 1, 0], spread: 0.25, speed: 1.8, life: 0.7, size: 0.22, tint: TINT.fire, power: 2.8, rise: 2.5, drag: 1 });
    }
    // Fire lying on the ground from a blow, an arrow or a torch.
    for (const patch of game.fires) {
      if (Math.random() < dt * 24 * patch.r) {
        const a = Math.random() * Math.PI * 2,
          r = Math.sqrt(Math.random()) * patch.r * 0.92;
        fx.burst(patch.x + Math.sin(a) * r, 0.1, patch.z + Math.cos(a) * r, { count: 1, dir: [0, 1, 0], spread: 0.3, speed: 1.9, life: 0.65, size: 0.22, tint: TINT.fire, power: 3, rise: 2.6, drag: 1 });
      }
    }
    if (manyLights) {
      // Fire on the ground and men alight throw their own light, brightest while they burn well.
      const burning = [];
      for (const patch of game.fires) burning.push({ key: patch.id, x: patch.x, y: 0.9, z: patch.z, power: 6 * patch.r * Math.min(1, patch.life / 0.7), range: 5 + patch.r * 2.4 });
      for (const foe of game.foes) if (foe.burning > 0 && foe.state !== 'dead') burning.push({ key: 'foe' + foe.id, x: foe.x, y: 1.3, z: foe.z, power: 7 * Math.min(1, foe.burning / 0.6), range: 6.5 });
      fx.setFires(burning);
    }
    for (const fire of fires)
      if (Math.hypot(fire.x - focus.x, fire.z - focus.z) < 34)
        for (let i = 0; i < 2; i++) fx.burst(fire.x + (Math.random() - 0.5) * fire.size * 2, fire.y - Math.random() * 1.6, fire.z + (Math.random() - 0.5) * fire.size * 2, { count: 1, dir: [0.25, 1, 0], spread: 0.3, speed: 2.2, life: 0.9, size: 0.26, tint: TINT.fire, power: 2.2, rise: 3, drag: 0.8 });
    const near = [...lit].sort((a, b) => a.distance - b.distance);
    view.fogLights = near;
    // The six nearest lamps burn and the rest fade out. Every pixel pays for each of the first eight lights
    // whether it is near one or not, and the lamps beyond the sixth are too far off to be missed.
    near.forEach((lamp, i) => {
      lamp.share += ((i < 6 ? 1 : 0) - lamp.share) * Math.min(1, dt * 3);
      lamp.light.intensity = lamp.intensity * lamp.share * (1 + Math.sin(clock * 11 + lamp.x) * lamp.flicker * 0.5 + Math.sin(clock * 23 + lamp.z) * lamp.flicker * 0.5);
    });
    scenery.glowMaterial.emissiveIntensity = 1.66 + Math.sin(clock * 9) * 0.13;
    for (const lamp of lit) lamp.halo.strength = lamp.distance < 34 ? lamp.share * 0.57 : 0;

    moveCamera(game, dt, clock);
    // Fade the roof or a nearby tree only where it crosses the camera's sightline to the hero.
    const sightX = camera.position[0] - hero.x,
      sightZ = camera.position[2] - hero.z,
      sightLengthSquared = sightX * sightX + sightZ * sightZ;
    for (const thing of scenery.tall) {
      const dx = thing.x - hero.x,
        dz = thing.z - hero.z,
        t = (dx * sightX + dz * sightZ) / Math.max(0.01, sightLengthSquared),
        sightY = 1.35 + (camera.position[1] - 1.35) * t,
        hide = t > 0 && t < 1 && sightY < thing.top && Math.hypot(dx - sightX * t, dz - sightZ * t) < thing.r ? 0.22 : 1;
      thing.opacity = (thing.opacity ?? 1) + (hide - (thing.opacity ?? 1)) * Math.min(1, dt * 7);
      const see = thing.opacity < 0.98;
      if (see !== thing.see) {
        thing.see = see;
        thing.material.alphaMode = see ? 'blend' : 'opaque';
        thing.mesh.castShadow = !see;
        thing.material.touch();
      }
      thing.material.opacity = thing.opacity;
    }

    // Grass parts round the hero's feet.
    const g = scenery.grass.shader.uniforms;
    g[0] = clock;
    g[1] = hero.x;
    g[2] = hero.z;

    fx.update(dt, clock);
  };

  // The first roof or pine to fade, the first formation, footprint and falling spear each need a program
  // that the opening frames never draw. Have the renderer link them under the loading screen.
  view.preparePrograms = async (renderer) => {
    // What every colour draw of this scene has in common.
    const seen = { fog: Boolean(scene.fog), environment: Boolean(scene.environment), receiveShadows: renderer.shadowsEnabled },
      faded = scenery.tall.map((thing) => {
        const material = thing.material.clone();
        material.alphaMode = 'blend';
        return { mesh: thing.mesh, material, ...seen };
      });
    // What is first drawn after the game has started would link its program in the middle of play. The
    // bowmen's strings are such a thing; so are the instanced batches the renderer makes of eight like
    // things in view, which a crowded yard reaches with four bowmen's strings or with coins left lying.
    const batches = [...bowstringDraws(), new InstancedMesh3D((lootGeometry.coin ??= lootShape('coin')), lootMaterial, 1)].map((mesh) => ({ mesh, material: mesh.material, ...seen }));
    try {
      await renderer.preparePrograms([...faded, ...batches, ...fx.programs().map((request) => ({ ...request, ...seen }))]);
    } finally {
      for (const { material } of faded) material.dispose();
    }
  };

  // Only damp patches mirror the scene at the highest picture quality.
  if (reflect) {
    const mirror = new PlanarReflection3D({ width: 640, height: 360 });
    mirror.interval = 4;
    mirror.layerMask = ~2;
    // The main colour pass draws in linear light. The mirror does the same, so the two share their programs
    // and the first wet stone links nothing new.
    mirror.toneMapping = 'none';
    let mirrored = false;
    const { material, mesh, nearReflection } = scenery.paving;
    const plane = [0, 1, 0, -0.05];
    const hidden = [mesh];
    material.reflectionMap = mirror.texture;
    material.reflectionStrength = 0.36;
    material.reflectionDistortion = 0.008;
    material.touch();
    /** Draw the mirror picture; call once a frame before the scene is drawn. */
    view.mirror = (renderer, game) => {
      const near = nearReflection(game.hero.x, game.hero.z);
      material.reflectionStrength = near ? 0.36 : 0;
      // Away from the wet stone nothing is drawn; on coming back the picture is made afresh at once.
      if (!near && mirrored) mirror.invalidate();
      mirrored = near;
      if (near) mirror.render(renderer, scene, camera, plane, hidden);
    };
  }

  /** Where a point of the world falls on screen, as fractions of the width and height. */
  const projected = [0, 0, 0];
  view.screen = (x, y, z) => {
    camera.worldToScreenPoint(projected, [x, y, z]);
    return [(projected[0] + 1) / 2, (1 - projected[1]) / 2, projected[2]];
  };
  /** The point on the ground under a point of the screen (fractions), for aiming with the mouse. */
  const origin = [0, 0, 0],
    direction = [0, 0, 0];
  view.ground = (sx, sy) => {
    camera.screenPointToRay(sx * 2 - 1, 1 - sy * 2, origin, direction);
    const t = (0.9 - origin[1]) / (direction[1] || -1e-6);
    return [origin[0] + direction[0] * t, origin[2] + direction[2] * t];
  };
  view.snap = (game) => {
    focus.x = game.hero.x;
    focus.z = game.hero.z - 1.45;
    gameCamera(game, 1);
    for (let i = 0; i < 3; i++) (drawn.eye[i] = eye[i]), (drawn.look[i] = look[i]);
  };
  view.resetRound = (game) => {
    for (const figure of figures.values()) figure.dispose();
    for (const item of shotViews.values()) item.mesh?.removeFromParent();
    for (const item of dropViews.values()) item.node.removeFromParent();
    figures.clear();
    shotViews.clear();
    dropViews.clear();
    fx.clear();
    view.counterRing = null;
    view.cine = null;
    view.shake = 0;
    heroTravel = glideTrailTime = 0;
    contacts.L = contacts.R = 0;
    heroFigure.gait.phase = heroFigure.gait.travelled = heroFigure.gait.speed = 0;
    heroFigure.landed = false;
    heroFigure.held = heroFigure.slide = heroFigure.rightOpening = 0;
    heroLast = { x: game.hero.x, z: game.hero.z };
    heroFigure.glow = heroFigure.flash = 0;
    // He stands as the new round finds him, whatever he was doing when the last one ended.
    heroFigure.root.setPosition(game.hero.x, 0, game.hero.z);
    heroFigure.root.setRotation(0, game.hero.face, 0);
    pose(heroFigure, heroPose(game.hero, HERO, 0, 0, 0, heroFigure.gait, 0)[0], 1, 1e3);
    for (const door of scenery.doors) {
      door.open = game.bars.gate ? 0 : 1;
      door.hinge.setRotation(0, -door.side * door.open * 1.75, 0);
    }
    view.snap(game);
  };
  return view;
}
