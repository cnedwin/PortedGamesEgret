// The picture of the fight: it reads the game each frame, moves the figures, the camera and the lamps,
// and answers the game's events with light, sparks and dust.
import {
  Mesh3D,
  Object3D,
  createAmbientLight3D,
  createDirectionalLight3D,
  createHemisphereLight3D,
  createStandardMaterial3D
} from '@egret/engine/world3d';
import { BARS, PLACES } from '../rules/arena.mjs';
import { HERO } from '../rules/tune.mjs';
import { createBuilder, rgb } from './build.mjs';
import { TINT, createEffects } from './effects.mjs';
import { createFigure, foePose, heroPose, pose } from './figures.mjs';
import { buildScenery, height } from './scenery.mjs';

const GRADE_TINT = [TINT.white, TINT.jade, TINT.gold];
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

export function createView(scene, camera, models, { density = 1, particles = 1 } = {}) {
  const view = { shake: 0, cine: null, zoom: 1 };

  // ---- night, snow and a cold moon ----------------------------------------------------------
  scene.background = [0.012, 0.018, 0.035];
  scene.fog = { kind: 'exponential', color: [0.03, 0.045, 0.085], density: 0.02 };
  scene.addChild(createHemisphereLight3D({ color: 0x4a66a8, groundColor: 0x141a2a, intensity: 0.3 }));
  scene.addChild(createAmbientLight3D({ intensity: 0.04 }));
  const moon = createDirectionalLight3D({ color: 0x8fb0ff, intensity: 0.82, castShadow: true });
  Object.assign(moon.shadow, { mapSize: 2048, extent: 24, near: 1, far: 90, cascades: 1 });
  scene.addChild(moon);
  const MOON = [-16, 30, 14];
  view.sunDirection = (() => {
    const l = Math.hypot(...MOON);
    return MOON.map((v) => v / l);
  })();

  const scenery = buildScenery(scene, models, { density });
  const fx = createEffects(scene, camera, { particles });
  view.fx = fx;

  // ---- people -------------------------------------------------------------------------------
  const heroFigure = createFigure('hero', models);
  heroFigure.metal.emissive.set([0.45, 0.75, 1]);
  scene.addChild(heroFigure.root);
  let heroTravel = 0,
    heroLast = null;
  const figures = new Map();
  function figureOf(foe) {
    let figure = figures.get(foe.id);
    if (!figure) {
      figure = createFigure(foe.kind, models);
      figure.metal.emissive.set([1, 0.3, 0.12]);
      figure.travel = 0;
      figure.last = { x: foe.x, z: foe.z };
      scene.addChild(figure.root);
      figures.set(foe.id, figure);
    }
    return figure;
  }

  // ---- arrows, loot -------------------------------------------------------------------------
  const arrowShape = createBuilder();
  arrowShape.limb([0, 0, -0.75], [0, 0, 0], 0.013, 0.013, { tint: rgb(0xc9bfa6), sides: 4 });
  arrowShape.limb([0, 0, 0], [0, 0, 0.1], 0.03, 0.002, { tint: rgb(0xd8dde6), sides: 4 });
  const arrowGeometry = arrowShape.geometry(),
    plain = createStandardMaterial3D({ vertexColors: true, roughness: 0.6, emissive: 0xffd9a0, emissiveIntensity: 0.6 }),
    shotViews = new Map(),
    lootGeometry = {},
    lootMaterial = createStandardMaterial3D({ vertexColors: true, roughness: 0.4, metallic: 0.3, emissive: 0xffffff, emissiveIntensity: 0.25 }),
    dropViews = new Map();

  // ---- the two things that bar the way ---------------------------------------------------------
  const marks = new Map(); // warnings on the ground, by foe

  // ---- camera -------------------------------------------------------------------------------
  const focus = { x: PLACES.start.x, z: PLACES.start.z },
    BACK = [0, 18.2, 13.4],
    eye = [0, 0, 0],
    look = [0, 0, 0];
  camera.fov = 36;
  camera.near = 0.5;
  camera.far = 260;
  camera.updateProjectionMatrix();
  /** A staged shot: the camera goes where `at(k)` says for `time` seconds, then returns to the fight. */
  view.stage = (time, at) => (view.cine = { t: 0, time, at });

  function gameCamera(game, dt) {
    const hero = game.hero,
      lu = game.boss;
    let tx = hero.x,
      tz = hero.z - 1.2,
      zoom = 1;
    if (game.stage === 'boss' && lu.state !== 'dead') {
      // Lean toward Lu Qian, but never let the hero leave the middle of the picture.
      const dx = lu.x - hero.x,
        dz = lu.z - hero.z,
        d = Math.hypot(dx, dz) || 1,
        pull = Math.min(3.2, d * 0.3);
      tx += (dx / d) * pull;
      tz += (dz / d) * pull;
      zoom = 1.08 + Math.min(0.14, d * 0.012);
    }
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
  }

  // ---- events -------------------------------------------------------------------------------
  const foeById = (game, id) => game.foes.find((foe) => foe.id === id);
  function warn(game, e) {
    const foe = foeById(game, e.id),
      move = e.move,
      tint = move.unblockable ? TINT.warnHard : TINT.warn,
      list = [];
    const common = { mode: 3, life: e.time + move.active * 0.5, tint, power: 1.7, y: 0.09 };
    const follow = (off = 0) => (item, t) => {
      item.k = t;
      if (foe.state === 'stagger' || foe.state === 'dead' || foe.state === 'down' || foe.state === 'roam') return fx.release(item);
      if (move.shape === 'disc' && !move.self) item.mesh.setPosition(foe.aim.x, 0.09, foe.aim.z);
      else {
        item.mesh.setPosition(foe.x, 0.09, foe.z);
        item.mesh.setRotation(0, foe.face + off, 0);
      }
    };
    if (move.shape === 'arc') {
      const r = move.range + 0.3;
      list.push(fx.spawn(fx.sector(move.arc), { ...common, from: [r, 1, r], track: follow() }));
    } else if (move.shape === 'disc') {
      const r = move.range + 0.2;
      list.push(fx.spawn(fx.sector(Math.PI * 2), { ...common, from: [r, 1, r], track: follow() }));
    } else for (const off of move.shape === 'lines' ? [-0.42, 0, 0.42] : [0]) list.push(fx.spawn('strip', { ...common, from: [move.width + 0.3, 1, move.range], track: follow(off) }));
    marks.set(e.id, list);
  }

  function onEvent(game, e) {
    const hero = game.hero;
    switch (e.type) {
      case 'slash': {
        const d = dirOf(e.face);
        if (e.cut === 0) {
          fx.spawn('strip', { mode: 5, x: e.x + d[0] * 0.6, y: 1.15, z: e.z + d[2] * 0.6, yaw: e.face, life: 0.2, from: [0.9, 1, 2.2], to: [0.5, 1, 4.6], power: 2.6 });
          fx.spawn('arcNarrow', { mode: 0, x: e.x, y: 1.1, z: e.z, yaw: e.face, life: 0.22, from: [1.05, 1, 1.05], power: 2.2 });
        } else if (e.cut === 1) fx.spawn('arcWide', { mode: 0, x: e.x, y: 1.1, z: e.z, yaw: e.face, life: 0.28, from: [1, 1, 1], to: [1.12, 1, 1.12], power: 2.6 });
        else {
          fx.spawn('arcUp', { mode: 0, x: e.x, y: 0.9, z: e.z, yaw: e.face, life: 0.3, from: [1, 1.15, 1.15], power: 3 });
          const px = e.x + d[0] * 2.7,
            pz = e.z + d[2] * 2.7;
          fx.spawn('ring', { mode: 1, x: px, z: pz, life: 0.45, from: [0.6, 1, 0.6], to: [3.4, 1, 3.4], power: 2.2 });
          fx.burst(px, 0.2, pz, { count: 16, spread: 1, speed: 4.5, life: 0.6, size: 0.14, tint: TINT.white, power: 1.1, rise: -6 });
          view.shake = Math.max(view.shake, 0.55);
        }
        break;
      }
      case 'hit': {
        const d = dirOf(e.face),
          px = e.x - d[0] * 0.45,
          pz = e.z - d[2] * 0.45,
          tint = e.source === 'star' || e.source === 'rain' ? TINT.spear : TINT.gold;
        fx.burst(px, 1.15, pz, { count: e.heavy ? 22 : 11, dir: [d[0], 0.35, d[2]], spread: 0.55, speed: e.heavy ? 12 : 8, life: 0.36, size: 0.085, tint, power: 4 });
        fx.spawn('ring', { mode: 1, x: px, y: 1.1, z: pz, life: 0.2, from: [0.2, 1, 0.2], to: [e.heavy ? 1.8 : 1.1, 1, e.heavy ? 1.8 : 1.1], tint: TINT.white, power: 2.4 });
        fx.flash(px, pz, [1, 0.8, 0.55], e.heavy ? 26 : 12, 0.16, 8);
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
        fx.burst(px, 1.2, pz, { count: big ? 34 : 12, spread: 1, speed: big ? 11 : 7, life: big ? 0.5 : 0.3, size: 0.09, tint: TINT.gold, power: big ? 5 : 3 });
        if (big) {
          fx.spawn('ring', { mode: 1, x: px, y: 1.2, z: pz, life: 0.35, from: [0.3, 1, 0.3], to: [3.6, 1, 3.6], tint: TINT.gold, power: 3.2 });
          fx.flash(px, pz, [1, 0.85, 0.5], 60, 0.3, 14);
          view.shake = Math.max(view.shake, 0.6);
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
        const R = HERO.rain.radius;
        fx.spawn('pad', { mode: 2, x: e.x, y: 0.1, z: e.z, life: HERO.rain.time + 0.5, from: [R, 1, R], tint: TINT.gold, power: 2.1, hold: true, track: (item) => ((item.k = Math.min(1, item.age / 0.6)), (item.fade = Math.min(1, (item.life - item.age) / 0.5))) });
        fx.spawn('column', { mode: 4, x: e.x, y: 0, z: e.z, life: HERO.rain.time, from: [2.4, 30, 2.4], tint: TINT.gold, power: 2.4, k: 0.4, track: (item, t) => (item.fade = Math.min(1, t * 6, (1 - t) * 5)) });
        for (const spear of e.spears) fx.dropSpear(spear.x, spear.z, spear.at, spear.lean, spear.turn);
        fx.flash(e.x, e.z, [1, 0.85, 0.6], 40, HERO.rain.time, 18);
        view.shake = Math.max(view.shake, 0.4);
        break;
      }
      case 'spear':
        fx.spawn('ring', { mode: 1, x: e.x, z: e.z, life: 0.4, from: [0.3, 1, 0.3], to: [2.6, 1, 2.6], power: 2.4 });
        fx.spawn('column', { mode: 4, x: e.x, y: 0, z: e.z, life: 0.35, from: [0.9, 9, 0.9], power: 2.2, k: 1.4 });
        fx.burst(e.x, 0.2, e.z, { count: 9, spread: 1, speed: 6, life: 0.5, size: 0.1, tint: TINT.spear, power: 3 });
        view.shake = Math.max(view.shake, 0.3);
        break;
      case 'burst':
        fx.spawn('ring', { mode: 1, x: e.x, z: e.z, life: 0.7, from: [1, 1, 1], to: [HERO.rain.radius + 2, 1, HERO.rain.radius + 2], tint: TINT.gold, power: 3.4 });
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
          if (boss) view.shake = Math.max(view.shake, 0.8);
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
    }
    void hero;
  }

  // ---- one frame ----------------------------------------------------------------------------
  let footstep = 0;
  const fires = [{ x: 7.2, y: 2.4, z: 9.8, size: 1.1 }];
  view.update = function update(game, events, dt, clock) {
    for (const e of events) onEvent(game, e);
    const hero = game.hero;

    // The hero.
    if (heroLast) heroTravel += Math.hypot(hero.x - heroLast.x, hero.z - heroLast.z);
    heroLast = { x: hero.x, z: hero.z };
    const [target, rate] = heroPose(hero, HERO, clock, heroTravel);
    heroFigure.root.setPosition(hero.x, 0, hero.z);
    heroFigure.root.setRotation(0, hero.face, 0);
    pose(heroFigure, target, hero.freeze > 0 ? 0 : rate, dt);
    const cutting = hero.state === 'cut' || hero.state === 'riposte' || hero.state === 'rain' || hero.state === 'stars';
    heroFigure.glow += ((cutting ? 3.2 : hero.counter > 0 ? 2 : 0.25) - heroFigure.glow) * Math.min(1, dt * 14);
    heroFigure.metal.emissiveIntensity = heroFigure.glow;
    heroFigure.flash = Math.max(0, heroFigure.flash - dt * 6);
    heroFigure.cloth.emissive.set([heroFigure.flash * 0.9, heroFigure.flash * 0.2, heroFigure.flash * 0.15]);
    heroFigure.root.visible = !(hero.safe > 0 && hero.state === 'free' && Math.floor(clock * 14) % 2 === 0);
    if (hero.moving) {
      footstep += dt * (hero.state === 'glide' ? 3 : 1);
      if (footstep > 0.16) {
        footstep = 0;
        fx.burst(hero.x, 0.08, hero.z, { count: hero.state === 'glide' ? 5 : 2, spread: 1, speed: 1.4, life: 0.5, size: 0.13, tint: TINT.white, power: 0.7, rise: -1 });
        if (hero.state === 'glide') fx.burst(hero.x, 0.9, hero.z, { count: 3, spread: 0.6, speed: 1, life: 0.45, size: 0.1, tint: TINT.spear, power: 3, rise: 0 });
      }
    }
    // A ring at his feet while the riposte is there to be taken.
    if (hero.counter > 0 && !view.counterRing) view.counterRing = fx.spawn('ring', { mode: 1, y: 0.1, life: 9, from: [1.5, 1, 1.5], tint: TINT.gold, power: 2.2, hold: true, track: (item) => (item.mesh.setPosition(game.hero.x, 0.1, game.hero.z), (item.shader.uniforms[0] = 0.25 + Math.sin(item.age * 16) * 0.1)) });
    if (hero.counter <= 0 && view.counterRing) (fx.release(view.counterRing), (view.counterRing = null));

    // The others.
    for (const foe of game.foes) {
      const figure = figureOf(foe);
      figure.travel += Math.hypot(foe.x - figure.last.x, foe.z - figure.last.z);
      figure.last.x = foe.x;
      figure.last.z = foe.z;
      const [want, speed] = foePose(foe, clock, figure.travel),
        jitter = foe.shake > 0 ? Math.sin(clock * 90) * foe.shake * 0.25 : 0;
      if (foe.state === 'dead' && foe.t > 2.6) figure.sink = Math.min(1.4, figure.sink + dt * 0.5);
      else figure.sink = 0;
      figure.root.visible = figure.sink < 1.4;
      figure.root.setPosition(foe.x + jitter, -figure.sink, foe.z);
      figure.root.setRotation(0, foe.face, 0);
      pose(figure, want, foe.freeze > 0 ? 0 : speed, dt);
      const threat = foe.state === 'windup' ? 0.4 + (foe.t / foe.move.windup) * 3 : foe.state === 'strike' ? 3.5 : foe.kind === 'lu' && foe.phase === 2 ? 1.2 : 0;
      figure.glow += (threat - figure.glow) * Math.min(1, dt * 12);
      figure.metal.emissiveIntensity = figure.glow;
      figure.flash = Math.max(0, figure.flash - dt * 7);
      figure.cloth.emissive.set([figure.flash, figure.flash * 0.9, figure.flash * 0.8]);
      if (foe.kind === 'lu' && foe.phase === 2 && foe.state !== 'dead' && Math.random() < dt * 40) {
        const d = dirOf(foe.face);
        fx.burst(foe.x + d[0] * 1.2 - d[2] * 0.4, 1.5, foe.z + d[2] * 1.2 + d[0] * 0.4, { count: 1, dir: [0, 1, 0], spread: 0.5, speed: 1.6, life: 0.6, size: 0.16, tint: TINT.fire, power: 3.5, rise: 3 });
      }
    }
    for (const [id, figure] of figures)
      if (!game.foes.some((foe) => foe.id === id)) {
        figure.root.removeFromParent();
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
    for (const fire of fires)
      if (Math.hypot(fire.x - focus.x, fire.z - focus.z) < 34)
        for (let i = 0; i < 2; i++) fx.burst(fire.x + (Math.random() - 0.5) * fire.size * 2, fire.y - Math.random() * 1.6, fire.z + (Math.random() - 0.5) * fire.size * 2, { count: 1, dir: [0.25, 1, 0], spread: 0.3, speed: 2.2, life: 0.9, size: 0.26, tint: TINT.fire, power: 2.2, rise: 3, drag: 0.8 });
    const near = [...lit].sort((a, b) => a.distance - b.distance);
    near.forEach((lamp, i) => {
      lamp.share += ((i < 6 ? 1 : 0) - lamp.share) * Math.min(1, dt * 3);
      lamp.light.intensity = lamp.intensity * lamp.share * (1 + Math.sin(clock * 11 + lamp.x) * lamp.flicker * 0.5 + Math.sin(clock * 23 + lamp.z) * lamp.flicker * 0.5);
    });
    scenery.glowMaterial.emissiveIntensity = 2.3 + Math.sin(clock * 9) * 0.25;

    // Whatever tall thing stands between the camera and the hero thins out.
    for (const thing of scenery.tall) {
      const hide = thing.z > hero.z + 0.5 && thing.z < hero.z + 16 && Math.abs(thing.x - hero.x - (thing.z - hero.z) * 0) < thing.r + 0.6 ? 0.22 : 1;
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
    moveCamera(game, dt, clock);
  };

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
    focus.z = game.hero.z - 1.2;
    gameCamera(game, 1);
    for (let i = 0; i < 3; i++) (drawn.eye[i] = eye[i]), (drawn.look[i] = look[i]);
  };
  return view;
}
