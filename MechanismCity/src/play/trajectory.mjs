import { LAYER, PELLETS, RULES } from '../sim/rules.mjs';

const DOT_SPACING = 22;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const distanceSquared = (x, y, point) => (x - point.x) ** 2 + (y - point.y) ** 2;

function nearestOnSegment(x, y, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const fraction = clamp01(((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1));
  return { x: a.x + dx * fraction, y: a.y + dy * fraction };
}

function collider(body) {
  const { shape, x, y, angle } = body;
  const at = { x, y, kind: body.data?.kind ?? 'ground', bounds: body.bounds(), shape };
  if (shape.kind === 'circle') return at;
  const w = shape.width / 2, h = shape.height / 2;
  const points = shape.kind === 'box' ? [{ x: -w, y: -h }, { x: w, y: -h }, { x: w, y: h }, { x: -w, y: h }] : shape.points;
  const c = Math.cos(angle * Math.PI / 180), s = Math.sin(angle * Math.PI / 180);
  at.points = points.map((p) => ({ x: x + p.x * c - p.y * s, y: y + p.x * s + p.y * c }));
  return at;
}

function touchBody(body, x, y, radius) {
  const bounds = body.bounds;
  if (x + radius < bounds.x || x - radius > bounds.x + bounds.width || y + radius < bounds.y || y - radius > bounds.y + bounds.height) return;
  if (body.shape.kind === 'circle') {
    const reach = radius + body.shape.radius, squared = distanceSquared(x, y, body);
    if (squared > reach * reach) return;
    const part = body.shape.radius / (Math.sqrt(squared) || 1);
    return { x: body.x + (x - body.x) * part, y: body.y + (y - body.y) * part };
  }

  let near, closest = Infinity, positive = false, negative = false;
  for (const [i, a] of body.points.entries()) {
    const b = body.points[(i + 1) % body.points.length];
    const side = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    positive ||= side > 0;
    negative ||= side < 0;
    const point = nearestOnSegment(x, y, a, b), distance = distanceSquared(x, y, point);
    if (distance < closest) {
      closest = distance;
      near = point;
    }
  }
  if (closest <= radius * radius || !(positive && negative)) return near;
}

function touchRope({ anchor, end }, from, to, reach) {
  if (Math.max(from.x, to.x) + reach < Math.min(anchor.x, end.x) || Math.min(from.x, to.x) - reach > Math.max(anchor.x, end.x)
    || Math.max(from.y, to.y) + reach < Math.min(anchor.y, end.y) || Math.min(from.y, to.y) - reach > Math.max(anchor.y, end.y)) return;
  const squared = reach * reach;
  for (const p of [from, to]) {
    const near = nearestOnSegment(p.x, p.y, anchor, end);
    if (distanceSquared(p.x, p.y, near) <= squared) return near;
  }
  for (const p of [anchor, end]) {
    if (distanceSquared(p.x, p.y, nearestOnSegment(p.x, p.y, from, to)) <= squared) return p;
  }
  // The interiors of both segments may cross even when their ends are far apart.
  const dx = to.x - from.x, dy = to.y - from.y, rx = end.x - anchor.x, ry = end.y - anchor.y;
  const cross = dx * ry - dy * rx;
  if (cross === 0) return;
  const ax = anchor.x - from.x, ay = anchor.y - from.y;
  const alongShot = (ax * ry - ay * rx) / cross;
  const alongRope = (ax * dy - ay * dx) / cross;
  if (alongShot >= 0 && alongShot <= 1 && alongRope >= 0 && alongRope <= 1) return { x: from.x + dx * alongShot, y: from.y + dy * alongShot };
}

/** Estimate the first interaction with the mechanisms in their current positions. */
export function projectTrajectory(sim, angle, power) {
  const type = sim.level.shots[sim.state.shotsFired];
  const { radius } = PELLETS[type] ?? PELLETS.iron;
  const acceptsPellet = ({ needs }) => needs === 'any' || needs === 'pellet';
  const sensors = new Set();
  for (const lock of sim.locks) if (!lock.open && acceptsPellet(lock)) sensors.add(lock.part.body);
  for (const plate of sim.plates) if (!plate.on && acceptsPellet(plate)) sensors.add(plate.part.body);
  const colliders = sim.world.bodies.filter((body) => (body.mask & LAYER.pellet) !== 0 && (!body.sensor || sensors.has(body))).map(collider);
  const ropes = sim.ropes.filter((rope) => !rope.cut).map((rope) => ({
    anchor: { x: rope.x, y: rope.y },
    end: { x: rope.weight.body.x, y: rope.weight.body.y - rope.top - 4 }
  }));

  const launch = sim.launch(angle, power), gravity = sim.world.gravity;
  const points = [];
  const previous = { x: launch.x, y: launch.y }, at = { ...previous };
  let { vx, vy } = launch;
  let distance = 0;
  for (let step = 1; step <= RULES.pelletLife / RULES.step; step++) {
    previous.x = at.x;
    previous.y = at.y;
    // Egret advances velocity before position. Match its fixed step up to the projected contact.
    vx += gravity.x * RULES.step;
    vy += gravity.y * RULES.step;
    at.x += vx * RULES.step;
    at.y += vy * RULES.step;
    const time = step * RULES.step;
    for (const body of colliders) {
      const point = touchBody(body, at.x, at.y, radius);
      if (point) return { points, contact: { ...point, kind: body.kind, time } };
    }
    for (const rope of ropes) {
      const point = touchRope(rope, previous, at, radius + 2);
      if (point) return { points, contact: { ...point, kind: 'rope', time } };
    }
    if (at.x < -200 || at.x > sim.width + 200 || at.y > sim.height + 200) break;
    distance += Math.hypot(at.x - previous.x, at.y - previous.y);
    if (distance >= DOT_SPACING) {
      points.push({ ...at });
      distance = 0;
    }
  }
  return { points, contact: null };
}
