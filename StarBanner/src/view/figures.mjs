// 棋子：每个单位一个 3D 人偶，每座建筑一个模型。人形单位带骨骼动画（待机、行走、出手、受击、倒下），马车、器械、船和
// 飞兵用代码驱动（颠簸、悬浮、摇摆、前冲）。人偶会沿路径一格格走、转身朝向目标、出手、受击闪白、行动后变灰、倒下后淡出。
// The pieces: a 3D figure for each unit and a model for each building. Humanoid units are skinned and animated (idle,
// walk, strike, hurt, fall); carts, engines, ships and fliers are driven in code (jolt, hover, sway, lunge). A figure
// walks a path tile by tile, turns to face its target, strikes, flashes white when hit, greys once it has acted and
// fades when it falls.
import { AnimationMixer3D, Mesh3D, Object3D, createBoxGeometry3D, createConeGeometry3D, createCustomShader3D } from '@egret/engine/world3d';
import { UNITS, isAir } from '../sim/units.mjs';
import { TILE, INK } from './stage.mjs';
import { cloneScene, loadModel, measure } from './assets.mjs';
import { paintFigure, toonFrom, toonify, NEUTRAL, TEAMS } from './toon.mjs';
import { BUILDING_BODY,modelOf } from './model-plan.mjs';
export { BUILDING_BODY,modelOf } from './model-plan.mjs';

/** How tall each kind stands on the board (world units), how high fliers hover, and whether it is skinned. */
export const BODY = {
  swordsman: { h: 2.11, rig: true },
  pikeman: { h: 2.11, rig: true },
  archer: { h: 2.15, rig: true },
  mage: { h: 2.18, rig: true },
  giant: { h: 3.05, rig: true },
  merfolk: { h: 2.03, rig: true },
  hound: { h: 1.48, rig: true, heading: -0.43, gaitSpeed: 2.15 },
  knight: { h: 2.72 },
  wagon: { h: 2.27 },
  ballista: { h: 2.11 },
  trebuchet: { h: 2.96 },
  balloon: { h: 3.59, hover: 1.0 },
  griffin: { h: 2.42, hover: 0.9 },
  witch: { h: 1.94, hover: 1.0 },
  wyvern: { h: 2.96, hover: 1.0 },
  ferry: { h: 2.03, sea: true },
  turtle: { h: 1.32, sea: true, width: 2.72 },
  harpoonship: { h: 2.11, sea: true },
  warship: { h: 2.89, sea: true },
  seline: { h: 2.34, rig: true },
  edmund: { h: 2.34, rig: true },
  vireta: { h: 2.34, rig: true },
  garron: { h: 2.5, rig: true }
};
const STRIKE_CLIP = { archer: 'shoot', mage: 'shoot', edmund: 'shoot', vireta: 'shoot', hound: 'pounce' };

/** The figure library shares the pending model load between preload and immediate requests. */
export function createLibrary(set,prefetch) {
  const loaded = new Map();
  const pending = new Map();

  async function load(name) {
    const asset = await loadModel(name,set,undefined,prefetch);
    if (!asset) {
      // Keep the failure for this session. A page retry will make a fresh library.
      loaded.set(name, null);
      return;
    }
    const materials = toonify(asset.scene, { swap: true, rim: [1, 0.92, 0.8, 0.16] });
    for (const m of materials) m.color.set([0.86, 0.86, 0.88]);
    asset.scene.traverse((node) => {
      if (node.material) {
        node.castShadow = true;
        node.receiveShadow = true;
        node.layers |= INK;
      }
    });
    loaded.set(name, { asset, materials });
  }

  async function want(names) {
    await Promise.all(names.map((name) => {
      if (loaded.has(name)) return;
      if (!pending.has(name)) pending.set(name, load(name).finally(() => pending.delete(name)));
      return pending.get(name);
    }));
  }
  return { want, get: (n) => loaded.get(n) ?? null, loaded };
}

let standInGeometry;

/** Keep failed pieces visible and faction-colored without fetching any additional assets. */
function standIn(holder, { width, height, building = false }) {
  standInGeometry ??= {
    block: createBoxGeometry3D({ width: 1, height: 1, depth: 1 }),
    cap: createConeGeometry3D({ radius: 0.72, height: 1, radialSegments: 4 })
  };
  const marker = new Object3D();
  marker.name = 'model-fallback';
  holder.addChild(marker);
  const material = toonFrom(null, { swap: false });
  const block = new Mesh3D(standInGeometry.block, material);
  const cap = new Mesh3D(standInGeometry.cap, material);
  const baseHeight = height * (building ? 0.7 : 0.35);
  const capHeight = height - baseHeight;
  block.setScale(width, baseHeight, width);
  block.setPosition(0, baseHeight * 0.5, 0);
  cap.setScale(width * (building ? 1.05 : 0.75), capHeight, width * (building ? 1.05 : 0.75));
  cap.setPosition(0, baseHeight + capHeight * 0.5, 0);
  for (const bit of [block, cap]) {
    bit.castShadow = true;
    bit.receiveShadow = true;
    bit.layers |= INK;
    marker.addChild(bit);
  }
  return [material];
}

/** A figure for `unit` on a board `bounds` tiles across. */
export function makeFigure(library, unit, bounds, team) {
  const name = modelOf(unit);
  const body = BODY[name] ?? BODY.swordsman;
  const entry = library.get(name);
  const holder = new Object3D();
  holder.name = `unit-${unit.id}`;
  const pivot = new Object3D();
  holder.addChild(pivot);
  let materials = [];
  let mixer = null;
  const clips = {};
  if (entry) {
    const model = cloneScene(entry.asset.scene);
    // Each figure gets its own materials so it can grey or flash alone.
    const own = new Map();
    model.traverse((node) => {
      if (!node.material) return;
      const pick = (m) => {
        if (!own.has(m)) {
          const copy = m.clone();
          copy.shader = createCustomShader3D({ ...m.shader, uniforms: m.shader.uniforms });
          own.set(m, copy);
        }
        return own.get(m);
      };
      node.material = Array.isArray(node.material) ? node.material.map(pick) : pick(node.material);
    });
    materials = [...own.values()];
    const size = measure(model, body.h);
    const fit = body.width ? Math.min(size.scale, body.width / Math.max(1e-6, Math.max(size.bounds[3] - size.bounds[0], size.bounds[5] - size.bounds[2]))) : size.scale;
    model.setScale(fit, fit, fit);
    model.setPosition(-size.centre[0] * fit, -size.centre[1] * fit, -size.centre[2] * fit);
    pivot.addChild(model);
    if (entry.asset.animations.length) {
      mixer = new AnimationMixer3D(model);
      for (const clip of entry.asset.animations) clips[clip.name] = mixer.clipAction(clip);
    }
  } else {
    materials = standIn(pivot, { width: body.sea ? 1.3 : 0.8, height: body.h });
  }
  const state = {
    unit: unit.id,
    type: unit.type,
    name,
    holder,
    pivot,
    tile: { x: unit.x, y: unit.y },
    facing: unit.owner === 0 ? Math.PI / 2 : 0,
    hover: body.hover ?? 0,
    sea: !!body.sea,
    clock: Math.random() * 10,
    action: null,
    busy: null,
    grey: 0,
    flash: 0,
    fade: 1,
    lunge: 0,
    team,
    rigged: !!mixer && !!clips.idle
  };
  let motionVersion = 0;
  const play = (name, { loop = true, fade = 0.18, speed = 1 } = {}) => {
    const next = clips[name];
    if (!next) return null;
    next.reset();
    next.loop = loop ? 'repeat' : 'once';
    next.clampWhenFinished = !loop;
    next.timeScale = speed;
    next.play();
    const previous = state.action;
    if (previous && previous !== next && !previous.paused) {
      // A one-shot clip must not pause while it is fading out.
      previous.clampWhenFinished = false;
      previous.crossFadeTo(next, fade);
    } else {
      if (previous && previous !== next) previous.stop();
      next.fadeIn(fade);
    }
    state.action = next;
    motionVersion++;
    return next;
  };
  const resumeIdle = (version, delay, fade) => {
    // A counterattack or fatal hit can already be playing a newer clip.
    setTimeout(() => {
      if (motionVersion === version) play('idle', { fade });
    }, delay);
  };
  if (state.rigged) play('idle', { fade: 0 });

  const ground = (x, y) => {
    const c = { x: (x + 0.5 - bounds.w / 2) * TILE, z: (y + 0.5 - bounds.h / 2) * TILE };
    return c;
  };
  const place = () => {
    const p = state.at ?? ground(state.tile.x, state.tile.y);
    const bob = state.hover ? Math.sin(state.clock * 2.2) * 0.12 : state.sea ? Math.sin(state.clock * 1.6) * 0.05 : 0;
    const base = state.sea ? -0.3 : 0;
    holder.setPosition(p.x, base + state.hover + bob, p.z);
    // The hound's shared rig faces +Z at a slight angle. The humanoid rigs face -Z.
    holder.setRotation(0, state.facing + (state.rigged ? (body.heading ?? Math.PI) : 0), 0);
    // Rigid pieces sway, tilt into a lunge and roll a little at sea.
    const roll = state.sea ? Math.sin(state.clock * 1.3) * 0.05 : state.hover ? Math.sin(state.clock * 1.7) * 0.06 : 0;
    pivot.setPosition(0, 0, state.lunge * 0.55);
    pivot.setRotation(state.rigged ? 0 : -state.lunge * 0.25, 0, roll);
    // Rigid pieces on the ground breathe a little so the board never stands quite still.
    const breathe = !state.rigged && !state.hover && !state.sea ? 1 + Math.sin(state.clock * 2.4) * 0.018 : 1;
    pivot.setScale(1, breathe, 1);
  };
  const paint = () => {
    const g = state.grey * (state.fade < 1 ? 0 : 1);
    for (const m of materials) {
      if (!entry) m.color.set(state.team.ring);
      paintFigure(m, state.team, { grey: g, flash: state.flash, swap: Boolean(entry) && unit.type !== 'commander' });
      m.opacity = state.fade;
      if (state.fade < 1 && m.alphaMode === 'opaque') m.alphaMode = 'blend';
    }
  };
  const wait = (s) => new Promise((r) => setTimeout(r, s * 1000 / (state.speed ?? 1)));

  const figure = {
    state,
    holder,
    /** The world point above the head, for the health badge. */
    head() {
      const p = state.at ?? ground(state.tile.x, state.tile.y);
      return [p.x, (state.sea ? -0.3 : 0) + state.hover + body.h + 0.15, p.z];
    },
    setTeam(t) {
      state.team = t;
      paint();
    },
    setDone(done) {
      state.grey = done ? 0.7 : 0;
      paint();
    },
    setSpeed(s) {
      state.speed = s;
    },
    face(x, y) {
      const a = ground(state.tile.x, state.tile.y),
        b = ground(x, y);
      if (a.x === b.x && a.z === b.z) return;
      state.facing = Math.atan2(b.x - a.x, b.z - a.z);
    },
    snap(x, y) {
      state.tile = { x, y };
      state.at = null;
      place();
    },
    /** Walk `path` ([{x, y}] after the start), a fixed time per tile. */
    async walk(path, perTile = 0.16) {
      if (!path.length) return;
      if (state.rigged) play('walk', { speed: body.gaitSpeed ?? 1.4 });
      for (const step of path) {
        const from = ground(state.tile.x, state.tile.y),
          to = ground(step.x, step.y);
        state.facing = Math.atan2(to.x - from.x, to.z - from.z);
        const t0 = performance.now(),
          dur = (perTile * 1000) / (state.speed ?? 1);
        await new Promise((resolve) => {
          state.busy = (now) => {
            const k = Math.min(1, (now - t0) / dur);
            state.at = { x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k };
            if (!state.rigged && !state.hover && !state.sea) state.jolt = Math.abs(Math.sin(k * Math.PI)) * 0.06;
            if (k >= 1) {
              state.busy = null;
              resolve();
            }
          };
        });
        state.tile = { x: step.x, y: step.y };
      }
      state.at = null;
      if (state.rigged) play('idle');
    },
    /** The striking motion; resolves at the moment the blow lands. */
    async strike() {
      const clip = STRIKE_CLIP[name] ?? 'slash';
      if (state.rigged && clips[clip]) {
        const a = play(clip, { loop: false, fade: 0.08, speed: 1.5 });
        const version = motionVersion;
        const length = a?.clip?.duration ?? 1;
        await wait(Math.min(0.55, (length / 1.5) * 0.45));
        resumeIdle(version, Math.min(700, (length / 1.5) * 500), 0.25);
        return;
      }
      // A lunge for the rest.
      for (let i = 0; i <= 6; i++) {
        state.lunge = Math.sin((i / 6) * Math.PI) * 0.9;
        await wait(0.035);
      }
      state.lunge = 0;
    },
    async hurt() {
      state.flash = 0.85;
      paint();
      if (state.rigged && clips.hurt) {
        play('hurt', { loop: false, fade: 0.05, speed: 1.6 });
        resumeIdle(motionVersion, 650 / (state.speed ?? 1), 0.3);
      }
      for (let i = 0; i < 8; i++) {
        state.flash = Math.max(0, 0.85 - i * 0.12);
        state.shake = (i % 2 ? 1 : -1) * 0.06 * (1 - i / 8);
        paint();
        await wait(0.03);
      }
      state.flash = 0;
      state.shake = 0;
      paint();
    },
    async fall() {
      if (state.rigged && clips.fall) play('fall', { loop: false, fade: 0.08, speed: 1.3 });
      await wait(state.rigged ? 0.7 : 0.2);
      for (let i = 10; i >= 0; i--) {
        state.fade = i / 10;
        if (!state.rigged) state.sink = (1 - i / 10) * 0.6;
        paint();
        await wait(0.04);
      }
      holder.visible = false;
    },
    /** Each frame: the clip mixer, the bob and the current walk. */
    update(seconds) {
      state.clock += seconds;
      if (state.busy) state.busy(performance.now());
      mixer?.update(seconds * (state.speed ?? 1));
      place();
      if (state.shake) holder.position[0] += state.shake;
      if (state.jolt) holder.position[1] += state.jolt;
      if (state.sink) holder.position[1] -= state.sink;
    },
    dispose() {
      motionVersion++;
      holder.removeFromParent();
    }
  };
  paint();
  place();
  return figure;
}

/** A building on its tile, painted for its owner. */
export function makeBuilding(library, b, bounds) {
  const spec = BUILDING_BODY[b.kind];
  const entry = library.get(spec.model);
  const holder = new Object3D();
  holder.name = `building-${b.id}`;
  let materials = [];
  if (entry) {
    const model = cloneScene(entry.asset.scene);
    const own = new Map();
    model.traverse((node) => {
      if (!node.material) return;
      const pick = (m) => {
        if (!own.has(m)) {
          const copy = m.clone();
          copy.shader = createCustomShader3D({ ...m.shader, uniforms: m.shader.uniforms });
          own.set(m, copy);
        }
        return own.get(m);
      };
      node.material = Array.isArray(node.material) ? node.material.map(pick) : pick(node.material);
    });
    materials = [...own.values()];
    const size = measure(model, spec.h);
    const width = Math.max(size.bounds[3] - size.bounds[0], size.bounds[5] - size.bounds[2]) * size.scale;
    const fit = width > TILE * 0.94 ? size.scale * ((TILE * 0.94) / width) : size.scale;
    model.setScale(fit, fit, fit);
    model.setPosition(-size.centre[0] * fit, -size.centre[1] * fit + (b.kind === 'port' ? -0.25 : 0), -size.centre[2] * fit);
    holder.addChild(model);
  } else {
    materials = standIn(holder, { width: TILE * 0.7, height: spec.h, building: true });
  }
  const c = { x: (b.x + 0.5 - bounds.w / 2) * TILE, z: (b.y + 0.5 - bounds.h / 2) * TILE };
  holder.setPosition(c.x, 0, c.z);
  holder.setRotation(0, b.y < bounds.h / 2 ? Math.PI * 0.25 : -Math.PI * 0.75, 0);
  let flash = 0;
  const building = {
    holder,
    owner: b.owner,
    setOwner(owner) {
      building.owner = owner;
      const team = owner >= 0 ? TEAMS[owner] : NEUTRAL;
      for (const m of materials) {
        if (!entry) m.color.set(team.ring);
        paintFigure(m, team, { flash, grey: owner === -2 ? 0.8 : 0, swap: Boolean(entry) });
      }
    },
    async hurt() {
      for (let i = 0; i < 6; i++) {
        flash = Math.max(0, 0.7 - i * 0.14);
        building.setOwner(building.owner);
        holder.position[0] = c.x + (i % 2 ? 0.05 : -0.05);
        await new Promise((r) => setTimeout(r, 30));
      }
      flash = 0;
      holder.position[0] = c.x;
      building.setOwner(building.owner);
    },
    head: () => [c.x, spec.h + 0.2, c.z],
    dispose() {
      holder.removeFromParent();
    }
  };
  building.setOwner(b.owner);
  return building;
}

export { isAir, UNITS };
