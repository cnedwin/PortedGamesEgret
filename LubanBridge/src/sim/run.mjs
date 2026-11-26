// 试通：把图纸变成桥身（src/sim/truss.mjs），把人和车、断下来的木石、河岸放进引擎的 2D 物理世界，一小步一小步地走。
// 车轮落在哪根桥面上，车的重量就压到那根桥面两头的节点上；桥面是跟着桥身走的运动刚体，车轮由引擎的碰撞托住。
// 全部用固定步长、固定种子：同一张图纸每次结果一样，Node 里也一样。
// A test crossing: the drawing becomes a frame (src/sim/truss.mjs); the people and carts, the timber and stone that
// break off, and the banks go into the engine's 2D physics world, and both move in small steps. The weight of a wheel
// goes onto the two nodes of the deck member it stands on; deck members are kinematic bodies that follow the frame,
// and the engine's contacts hold the wheels on them. Fixed steps and a fixed seed throughout: the same drawing ends
// the same way every time, in Node too.
import { createPhysicsWorld } from '@egret/engine/physics2d';
import { GRID, fixedPoints, groundOf, key, crossesChannel } from './design.mjs';
import { MATERIALS, PONTOON } from './materials.mjs';
import { createTruss } from './truss.mjs';
import { VEHICLES } from './vehicles.mjs';

/** Small steps a frame of 1/60 s. */
export const SUBSTEPS = 12;
export const FRAME = 1 / 60;
const H = FRAME / SUBSTEPS;
const PLANK = 0.25;
const LAYER = { ground: 1, plank: 2, wheel: 4, debris: 8 };
/** Seconds over which the bridge takes its own weight when a test starts, so it settles instead of dropping. */
const SETTLE = 0.8;

/** A small fixed-seed random, so debris spins the same way each time. */
function randomOf(seed) {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/** The nodes and members of a drawing, merged by grid point, with masses from half of each member. */
export function frameOf(level, design) {
  const fixed = new Set(fixedPoints(level, design).map(([x, y]) => key(x, y)));
  const pontoon = new Set(design.pontoons.map(([x, y]) => key(x, y)));
  // The right end of the road is a roller: the bridge rests on that bank and may slide on it.
  const roller = key(level.anchors[1][0], level.anchors[1][1]);
  const index = new Map(),
    nodes = [],
    members = [];
  const nodeAt = (gx, gy) => {
    const k = key(gx, gy);
    if (!index.has(k)) {
      index.set(k, nodes.length);
      nodes.push({
        gx,
        gy,
        x: gx * GRID,
        y: gy * GRID,
        fixed: fixed.has(k),
        roller: k === roller,
        pontoon: pontoon.has(k),
        mass: pontoon.has(k) ? PONTOON.mass : 0
      });
    }
    return index.get(k);
  };
  for (const m of design.members) {
    const a = nodeAt(m[0], m[1]),
      b = nodeAt(m[2], m[3]),
      kg = (MATERIALS[m[4]].mass * Math.hypot(m[2] - m[0], m[3] - m[1]) * GRID) / 2;
    nodes[a].mass += kg;
    nodes[b].mass += kg;
    members.push({ a, b, material: m[4], source: m });
  }
  // A pontoon drawn with nothing on it still floats.
  for (const [x, y] of design.pontoons) nodeAt(x, y);
  return { nodes, members };
}

/**
 * Start a crossing of `level` over `design`. `step()` moves it one frame and gives what happened in it:
 * { type: 'break', member, x, y, material } · { type: 'splash', x, y, size } · { type: 'arrive', vehicle } ·
 * { type: 'won' } · { type: 'lost', reason: 'fell' | 'stuck' | 'boat' }.
 */
export function createRun(level, design, { seed = 1, vehicles = level.vehicles } = {}) {
  const random = randomOf(seed);
  const ground = groundOf(level, design);
  const frame = frameOf(level, design);
  const truss = createTruss({ nodes: frame.nodes, members: frame.members, ground, water: level.water });
  const world = createPhysicsWorld({ gravity: { x: 0, y: 9.8 }, fixedStep: H, maxSteps: 1, iterations: 8, cellSize: 2, maxBodies: 2048 });
  for (const g of ground)
    world.addBody({
      kind: 'static',
      shape: { kind: 'box', width: g.x1 - g.x0, height: g.y1 - g.y0 },
      x: (g.x0 + g.x1) / 2,
      y: (g.y0 + g.y1) / 2,
      friction: 0.6,
      layer: LAYER.ground,
      mask: LAYER.wheel | LAYER.debris
    });
  // Deck members: a plank whose top is the member's line.
  const planks = new Map();
  for (const m of truss.members) {
    if (!MATERIALS[m.material].deck) continue;
    const body = world.addBody({
      kind: 'kinematic',
      shape: { kind: 'box', width: m.length + 0.04, height: PLANK },
      friction: 0,
      layer: LAYER.plank,
      mask: LAYER.wheel,
      data: m.index
    });
    planks.set(m.index, body);
  }
  const placePlanks = () => {
    for (const [i, body] of planks) {
      const m = truss.members[i],
        a = truss.nodes[m.a],
        b = truss.nodes[m.b],
        dx = b.x - a.x,
        dy = b.y - a.y,
        len = Math.hypot(dx, dy) || 1;
      // The plank hangs below its line by half its thickness: its top is where wheels run.
      const nx = -dy / len,
        ny = dx / len,
        down = ny > 0 ? 1 : -1;
      body.x = (a.x + b.x) / 2 + nx * down * (PLANK / 2);
      body.y = (a.y + b.y) / 2 + ny * down * (PLANK / 2);
      body.angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      body.vx = (a.vx + b.vx) / 2;
      body.vy = (a.vy + b.vy) / 2;
    }
  };
  placePlanks();

  // The road on the left runs back from the first anchor; carts wait on it, one behind another.
  const road = level.road;
  const carts = [];
  let queue = road.left.x - 2;
  vehicles.forEach((kind, v) => {
    const spec = VEHICLES[kind];
    const parts = [];
    let front = queue;
    spec.parts.forEach((p, i) => {
      if (i) front -= p.hitch;
      const wheels = [front, front - p.base].map((x) =>
        world.addBody({
          kind: 'dynamic',
          shape: { kind: 'circle', radius: p.radius },
          x,
          y: road.left.y - p.radius - 0.02,
          density: p.mass / 2 / (Math.PI * p.radius * p.radius),
          friction: 0,
          restitution: 0,
          layer: LAYER.wheel,
          mask: LAYER.ground | LAYER.plank,
          data: { vehicle: v }
        })
      );
      world.addJoint({ kind: 'distance', a: wheels[0], b: wheels[1] });
      if (i) world.addJoint({ kind: 'rope', a: parts[i - 1].wheels[1], b: wheels[0], length: p.hitch + 0.05 });
      parts.push({ ...p, wheels });
      front -= p.base;
    });
    carts.push({ kind, index: v, parts, speed: spec.speed, start: v * 1.6, state: 'waiting', stuck: 0, lastX: queue });
    queue = front - spec.gap;
  });
  const goal = road.right.x + 4;

  const debris = [];
  let time = 0,
    outcome = null,
    gravityScale = 0;
  const events = [];
  const supports = new Map();

  /** The deck member under a wheel, and where along it (0 at a, 1 at b), when the wheel stands on one. */
  function standing(wheel, r) {
    let best = null;
    for (const [i] of planks) {
      const m = truss.members[i];
      if (m.broken) continue;
      const a = truss.nodes[m.a],
        b = truss.nodes[m.b],
        dx = b.x - a.x,
        dy = b.y - a.y,
        l2 = dx * dx + dy * dy || 1,
        t = Math.max(0, Math.min(1, ((wheel.x - a.x) * dx + (wheel.y - a.y) * dy) / l2)),
        px = a.x + dx * t,
        py = a.y + dy * t,
        d = Math.hypot(wheel.x - px, wheel.y - py);
      if (wheel.y < py + 0.05 && d < r + 0.12 && (!best || d < best.d)) best = { m, t, d, tx: dx / Math.sqrt(l2), ty: dy / Math.sqrt(l2) };
    }
    return best;
  }
  function onGround(wheel, r) {
    for (const g of ground) if (wheel.x >= g.x0 - 0.05 && wheel.x <= g.x1 + 0.05 && Math.abs(wheel.y + r - g.y0) < 0.12) return true;
    return false;
  }

  function breakMember(m) {
    const a = truss.nodes[m.a],
      b = truss.nodes[m.b];
    const body = planks.get(m.index);
    if (body) {
      world.removeBody(body);
      planks.delete(m.index);
    }
    events.push({ type: 'break', member: m.index, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, material: m.material, pull: m.held > 0 });
    // Two halves fall, turning a little, from where the member was.
    for (const [p, q] of [
      [a, b],
      [b, a]
    ]) {
      if (debris.length > 160) break;
      const cx = p.x * 0.75 + q.x * 0.25,
        cy = p.y * 0.75 + q.y * 0.25,
        len = m.length / 2,
        thick = MATERIALS[m.material].deck ? PLANK : MATERIALS[m.material].rope ? 0.06 : 0.18;
      const body = world.addBody({
        kind: 'dynamic',
        shape: { kind: 'box', width: Math.max(0.1, len), height: thick },
        x: cx,
        y: cy,
        angle: (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI,
        vx: p.vx,
        vy: p.vy,
        density: 30,
        friction: 0.5,
        restitution: 0.1,
        layer: LAYER.debris,
        mask: LAYER.ground
      });
      debris.push({ body, spin: (random() - 0.5) * 340, material: m.material, length: len, thick, life: 0, wet: false });
    }
  }

  function step() {
    events.length = 0;
    if (outcome) return events;
    for (let s = 0; s < SUBSTEPS; s++) {
      time += H;
      gravityScale = Math.min(1, time / SETTLE);
      // Weight of what stands on the deck, onto the deck's nodes.
      for (const cart of carts) {
        if (cart.state === 'arrived' || cart.state === 'lost') continue;
        for (const part of cart.parts)
          for (const wheel of part.wheels) {
            const on = standing(wheel, part.radius);
            supports.set(wheel, on);
            if (on) {
              const w = (part.mass / 2) * 9.8;
              truss.load(on.m.a, 0, w * (1 - on.t));
              truss.load(on.m.b, 0, w * on.t);
            }
          }
      }
      // The frame takes its own weight over the first moments: a lighter gravity, by a load against it.
      if (gravityScale < 1)
        for (let n = 0; n < truss.nodes.length; n++) if (!truss.nodes[n].fixed) truss.load(n, 0, -(1 - gravityScale) * 9.8 * truss.nodes[n].mass);
      const broke = truss.step(H, gravityScale);
      if (time > SETTLE * 0.5) for (const m of broke) breakMember(m);
      else for (const m of broke) (m.broken = false), (m.held = 0);
      placePlanks();
      // Carts drive: each wheel on something keeps to its speed along what it stands on.
      for (const cart of carts) {
        if (cart.state === 'arrived' || cart.state === 'lost') continue;
        const going = time >= cart.start + SETTLE;
        if (going && cart.state === 'waiting') cart.state = 'going';
        for (const part of cart.parts)
          for (const wheel of part.wheels) {
            const on = supports.get(wheel),
              grounded = on || onGround(wheel, part.radius);
            if (!grounded) continue;
            let tx = 1,
              ty = 0;
            if (on) {
              tx = on.tx;
              ty = on.ty;
              if (tx < 0) (tx = -tx), (ty = -ty);
            }
            const target = going ? cart.speed : 0,
              along = wheel.vx * tx + wheel.vy * ty,
              change = Math.max(-6 * H, Math.min(6 * H, target - along));
            wheel.vx += tx * change;
            wheel.vy += ty * change;
          }
      }
      world.step(H);
      for (const d of debris) {
        d.life += H;
        d.body.angle += d.spin * H;
        if (d.body.y > level.water) {
          if (!d.wet) {
            d.wet = true;
            events.push({ type: 'splash', x: d.body.x, y: level.water, size: 0.5 });
          }
          // Timber floats, stone sinks; both slow in the water.
          const floats = !MATERIALS[d.material].mortar && d.material !== 'chain';
          d.body.vy = d.body.vy * 0.96 + (floats ? -0.06 : 0.02);
          d.body.vx *= 0.97;
          d.spin *= 0.97;
        }
      }
    }
    // Who arrived, who fell, who is stuck.
    for (const cart of carts) {
      if (cart.state === 'arrived' || cart.state === 'lost') continue;
      const wheels = cart.parts.flatMap((p) => p.wheels);
      if (wheels.some((w) => w.y > level.water + 0.2)) {
        cart.state = 'lost';
        const w = wheels.find((q) => q.y > level.water + 0.2);
        events.push({ type: 'splash', x: w.x, y: level.water, size: 1.4 });
        outcome = { won: false, reason: 'fell', time };
        events.push({ type: 'lost', reason: 'fell', vehicle: cart.index });
        break;
      }
      const last = Math.min(...wheels.map((w) => w.x));
      if (last > goal) {
        cart.state = 'arrived';
        for (const w of wheels) world.removeBody(w);
        events.push({ type: 'arrive', vehicle: cart.index });
        continue;
      }
      if (cart.state === 'going') {
        const front = Math.max(...wheels.map((w) => w.x));
        if (front > cart.lastX + 0.3) {
          cart.lastX = front;
          cart.stuck = 0;
        } else if ((cart.stuck += FRAME) > 6) {
          outcome = { won: false, reason: 'stuck', time };
          events.push({ type: 'lost', reason: 'stuck', vehicle: cart.index });
          break;
        }
      }
    }
    // Boats pass through the channel while carts cross; a member in their way stops them.
    if (!outcome && level.channel && time > 2) {
      for (const m of truss.members) {
        if (m.broken) continue;
        const a = truss.nodes[m.a],
          b = truss.nodes[m.b];
        if (crossesChannel(level, a.x, a.y, b.x, b.y)) {
          outcome = { won: false, reason: 'boat', time };
          events.push({ type: 'lost', reason: 'boat' });
          break;
        }
      }
    }
    if (!outcome && carts.every((c) => c.state === 'arrived')) {
      outcome = { won: true, time, broken: truss.members.filter((m) => m.broken).length };
      events.push({ type: 'won' });
    }
    // A last guard: a crossing that runs far too long ends.
    if (!outcome && time > 30 + carts.length * 14) {
      outcome = { won: false, reason: 'stuck', time };
      events.push({ type: 'lost', reason: 'stuck' });
    }
    for (let i = debris.length - 1; i >= 0; i--)
      if (debris[i].life > 9 || debris[i].body.y > level.bed + 6) {
        world.removeBody(debris[i].body);
        debris.splice(i, 1);
      }
    return events;
  }

  return {
    level,
    design,
    truss,
    carts,
    debris,
    step,
    get time() {
      return time;
    },
    get outcome() {
      return outcome;
    },
    /** The most any member worked, 0–1+, since the start. */
    peak() {
      let p = 0;
      for (const m of truss.members) if (!m.broken) p = Math.max(p, Math.abs(truss.strain(m)));
      return p;
    },
    dispose() {
      world.dispose();
    }
  };
}

/** Run a crossing to its end without drawing it: what tests and the reference solutions use. */
export function runToEnd(level, design, options = {}) {
  const run = createRun(level, design, options);
  let peak = 0,
    frames = 0,
    worst = null;
  while (!run.outcome && frames < 60 * 200) {
    run.step();
    if (run.time > 1)
      for (const m of run.truss.members) {
        const k = m.broken ? 0 : Math.abs(run.truss.strain(m));
        if (k > peak) (peak = k), (worst = m);
      }
    frames++;
  }
  const outcome = {
    ...run.outcome,
    peak,
    worst: worst && { material: worst.material, length: worst.length, pull: worst.held > 0 },
    broken: run.truss.members.filter((m) => m.broken).length
  };
  run.dispose();
  return outcome;
}
