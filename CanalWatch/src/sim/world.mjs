// 规则：守闸的一局。水寇沿运河和纤道进城，塔射击、溅射、点火、敲锣减速，水闸可以把船拦住几秒。
// 这里不碰页面也不碰引擎，在 Node 里用固定种子就能跑完一局；画面只读这里的状态和 `step` 返回的事件。
//
// The rules: one game of the Canal Watch. Raiders come down the canal and along the towpath; towers shoot, crush,
// set alight and slow them with gongs, and a sluice gate can hold the boats for a few seconds. Nothing here touches
// the page or the engine, so a whole game runs in Node from a seed; the view only reads this state and the events
// `step` returns.
import {
  BREAK,
  DIFFICULTY,
  EARLY_BONUS,
  GATE,
  GATES,
  GROWTH,
  PATHS,
  PLOTS,
  RAIDERS,
  REFUND,
  TOWERS,
  WAVES,
  WAVE_BONUS,
  stars
} from './data.mjs';

/** A small seeded random source (mulberry32), so the same seed gives the same game. */
export function seeded(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A path made walkable: its points, the length of each leg, and the point and heading at a distance along it. */
export function makePath(points) {
  const legs = [];
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1],
      [bx, by] = points[i],
      size = Math.hypot(bx - ax, by - ay);
    legs.push({ ax, ay, bx, by, size, from: length });
    length += size;
  }
  return {
    points,
    length,
    /** The point `s` units along, and the way it faces there. */
    at(s) {
      const d = Math.max(0, Math.min(length, s));
      const leg = legs.find((l) => d <= l.from + l.size) ?? legs[legs.length - 1];
      const t = leg.size ? (d - leg.from) / leg.size : 0;
      return { x: leg.ax + (leg.bx - leg.ax) * t, y: leg.ay + (leg.by - leg.ay) * t, angle: Math.atan2(leg.by - leg.ay, leg.bx - leg.ax) };
    },
    /** The distance along the path of the point on it nearest to (x, y), and how far that point is. */
    nearest(x, y) {
      let best = { s: 0, distance: Infinity };
      for (const l of legs) {
        const dx = l.bx - l.ax,
          dy = l.by - l.ay,
          t = l.size ? Math.max(0, Math.min(1, ((x - l.ax) * dx + (y - l.ay) * dy) / (l.size * l.size))) : 0,
          px = l.ax + dx * t,
          py = l.ay + dy * t,
          distance = Math.hypot(x - px, y - py);
        if (distance < best.distance) best = { s: l.from + l.size * t, distance };
      }
      return best;
    }
  };
}

export const WAYS = { water: makePath(PATHS.water), road: makePath(PATHS.road) };

/** Seconds a stone, an arrow and a fire arrow take to cross 100 units. */
const FLIGHT = { pierce: 100 / 560, blast: 100 / 280, fire: 100 / 400 };

/** A new game. `difficulty` is `normal` or `hard`. */
export function createWorld(seed = 1, difficulty = 'normal') {
  const rules = DIFFICULTY[difficulty] ?? DIFFICULTY.normal;
  return {
    seed,
    difficulty: DIFFICULTY[difficulty] ? difficulty : 'normal',
    random: seeded(seed),
    time: 0,
    silver: rules.silver,
    lives: rules.lives,
    livesAtStart: rules.lives,
    hpScale: rules.hp,
    /** `ready` before the first wave, then `wave` while one is coming, `break` between, and `won` or `lost`. */
    state: 'ready',
    wave: -1,
    breakLeft: BREAK * 2.5,
    queue: [],
    towers: PLOTS.map(() => null),
    raiders: [],
    shots: [],
    gates: GATES.map((gate) => ({ ...gate, shutLeft: 0, cooldownLeft: 0 })),
    nextId: 1,
    kills: 0,
    leaked: 0,
    spent: 0
  };
}

/** What it costs to build `kind`, or to raise the tower on `plot` a level; null when it cannot be. */
export function priceOf(world, plot, kind) {
  const tower = world.towers[plot];
  if (!tower) return TOWERS[kind] ? TOWERS[kind].levels[0].cost : null;
  const next = TOWERS[tower.kind].levels[tower.level + 1];
  return next ? next.cost : null;
}

/** Build a tower of `kind` on an empty plot. Returns `{ ok, why }`. */
export function build(world, plot, kind) {
  if (!TOWERS[kind]) return { ok: false, why: 'kind' };
  if (plot < 0 || plot >= PLOTS.length) return { ok: false, why: 'plot' };
  if (world.towers[plot]) return { ok: false, why: 'taken' };
  if (world.state === 'won' || world.state === 'lost') return { ok: false, why: 'over' };
  const cost = TOWERS[kind].levels[0].cost;
  if (world.silver < cost) return { ok: false, why: 'silver' };
  world.silver -= cost;
  world.spent += cost;
  const [x, y] = PLOTS[plot];
  world.towers[plot] = { plot, kind, level: 0, x, y, cooldown: 0, paid: cost, angle: 0 };
  return { ok: true };
}

/** Raise the tower on `plot` a level. */
export function upgrade(world, plot) {
  const tower = world.towers[plot];
  if (!tower) return { ok: false, why: 'empty' };
  if (world.state === 'won' || world.state === 'lost') return { ok: false, why: 'over' };
  const next = TOWERS[tower.kind].levels[tower.level + 1];
  if (!next) return { ok: false, why: 'top' };
  if (world.silver < next.cost) return { ok: false, why: 'silver' };
  world.silver -= next.cost;
  world.spent += next.cost;
  tower.level++;
  tower.paid += next.cost;
  return { ok: true };
}

/** Pull the tower on `plot` down for part of what it cost. */
export function sell(world, plot) {
  const tower = world.towers[plot];
  if (!tower) return { ok: false, why: 'empty' };
  if (world.state === 'won' || world.state === 'lost') return { ok: false, why: 'over' };
  const back = Math.floor(tower.paid * REFUND);
  world.silver += back;
  world.towers[plot] = null;
  return { ok: true, silver: back };
}

/** Shut a sluice gate: boats above it are held for `GATE.shut` seconds. */
export function shutGate(world, index) {
  const gate = world.gates[index];
  if (!gate) return { ok: false, why: 'gate' };
  if (gate.shutLeft > 0 || gate.cooldownLeft > 0) return { ok: false, why: 'cooling' };
  if (world.state === 'won' || world.state === 'lost') return { ok: false, why: 'over' };
  gate.shutLeft = GATE.shut;
  gate.cooldownLeft = GATE.shut + GATE.cooldown;
  return { ok: true };
}

/** Bring the next wave now; each second of the break left gives `EARLY_BONUS` silver. */
export function callWave(world) {
  if (world.state !== 'ready' && world.state !== 'break') return { ok: false, why: 'busy' };
  const bonus = Math.floor(Math.max(0, world.breakLeft) * EARLY_BONUS);
  world.silver += bonus;
  startWave(world);
  return { ok: true, silver: bonus };
}

function startWave(world) {
  world.wave++;
  world.state = 'wave';
  world.breakLeft = 0;
  world.silver += WAVE_BONUS.base + WAVE_BONUS.per * world.wave;
  for (const group of WAVES[world.wave])
    for (let i = 0; i < group.count; i++) world.queue.push({ kind: group.kind, at: world.time + (group.delay ?? 0) + i * group.gap });
  world.queue.sort((a, b) => a.at - b.at);
}

function spawn(world, kind, way = RAIDERS[kind].way, s = 0) {
  const spec = RAIDERS[kind],
    hp = Math.round(spec.hp * world.hpScale * (1 + GROWTH * Math.max(0, world.wave)));
  const raider = { id: world.nextId++, kind, way, s, hp, max: hp, slow: 0, burnLeft: 0, burn: 0, lane: world.random() * 2 - 1, x: 0, y: 0, angle: 0 };
  place(raider);
  world.raiders.push(raider);
  return raider;
}

function place(raider) {
  const p = WAYS[raider.way].at(raider.s);
  // Raiders keep to a lane of their own across the way, so a crowd does not stack on one line.
  const side = raider.way === 'water' ? 13 : 7;
  raider.x = p.x - Math.sin(p.angle) * raider.lane * side;
  raider.y = p.y + Math.cos(p.angle) * raider.lane * side;
  raider.angle = p.angle;
}

const isBoat = (raider) => raider.way === 'water';

/** The damage a hit of `kind` does to `raider`, armour and boats counted. */
export function damageTo(raider, tower, amount) {
  const spec = RAIDERS[raider.kind],
    type = TOWERS[tower].kind;
  let hit = amount;
  if (type === 'pierce' && spec.armor) hit *= 1 - spec.armor;
  if (isBoat(raider) && TOWERS[tower].vsBoat) hit *= TOWERS[tower].vsBoat;
  return hit;
}

function hurt(world, raider, amount, events, by) {
  if (raider.hp <= 0) return;
  raider.hp -= amount;
  if (raider.hp > 0) return;
  const spec = RAIDERS[raider.kind];
  world.silver += spec.bounty;
  world.kills++;
  events.push({ type: 'kill', id: raider.id, kind: raider.kind, x: raider.x, y: raider.y, bounty: spec.bounty, by });
  // A sinking boat's crew jump ashore and go on along the towpath from the nearest point of it.
  if (spec.crew) {
    const ashore = WAYS.road.nearest(raider.x, raider.y);
    for (let i = 0; i < spec.crew; i++) {
      const man = spawn(world, 'raider', 'road', Math.max(0, ashore.s - 10 + i * 12));
      events.push({ type: 'ashore', id: man.id, x: man.x, y: man.y, from: raider.id });
    }
  }
}

/** The haste the gongs around a tower give it: the strongest one counts. */
function hasteAt(world, tower) {
  let haste = 0;
  for (const other of world.towers) {
    if (!other || other.kind !== 'gong' || other === tower) continue;
    const level = TOWERS.gong.levels[other.level];
    if (Math.hypot(other.x - tower.x, other.y - tower.y) <= level.aura) haste = Math.max(haste, level.haste);
  }
  return haste;
}

/** The raider a tower aims at: the one furthest along its way, within range. */
export function targetOf(world, tower) {
  const level = TOWERS[tower.kind].levels[tower.level];
  let best = null,
    bestProgress = -1;
  for (const raider of world.raiders) {
    if (raider.hp <= 0) continue;
    const distance = Math.hypot(raider.x - tower.x, raider.y - tower.y);
    if (distance > level.range || distance < (level.minRange ?? 0)) continue;
    const progress = raider.s / WAYS[raider.way].length;
    if (progress > bestProgress) {
      bestProgress = progress;
      best = raider;
    }
  }
  return best;
}

/**
 * One step of `seconds`. Returns what happened, for the view and the sound: `wave`, `spawn`, `shot`, `hit`, `kill`,
 * `ashore`, `leak`, `gate`, `won` and `lost` events.
 */
export function step(world, seconds) {
  const events = [];
  if (world.state === 'won' || world.state === 'lost') return events;
  const dt = Math.min(seconds, 0.1);
  world.time += dt;

  // The break between waves runs down; the next wave comes by itself when it is over.
  if (world.state === 'ready' || world.state === 'break') {
    world.breakLeft -= dt;
    if (world.breakLeft <= 0) {
      startWave(world);
      events.push({ type: 'wave', wave: world.wave });
    }
  }
  while (world.queue.length && world.queue[0].at <= world.time) {
    const raider = spawn(world, world.queue.shift().kind);
    events.push({ type: 'spawn', id: raider.id, kind: raider.kind });
  }
  if (world.state === 'wave' && !world.queue.length && world.wave < WAVES.length - 1) {
    world.state = 'break';
    world.breakLeft = BREAK;
  }

  // Gates.
  for (const [index, gate] of world.gates.entries()) {
    const wasShut = gate.shutLeft > 0;
    gate.shutLeft = Math.max(0, gate.shutLeft - dt);
    gate.cooldownLeft = Math.max(0, gate.cooldownLeft - dt);
    if (wasShut && gate.shutLeft === 0) events.push({ type: 'gate', gate: index, open: true });
  }

  // Gongs slow what is in their reach; the strongest gong counts.
  for (const raider of world.raiders) raider.slow = 0;
  for (const tower of world.towers) {
    if (!tower || tower.kind !== 'gong') continue;
    const level = TOWERS.gong.levels[tower.level];
    for (const raider of world.raiders) if (Math.hypot(raider.x - tower.x, raider.y - tower.y) <= level.range) raider.slow = Math.max(raider.slow, level.slow);
  }

  // Raiders move, burn and reach the wall. A boat stops behind a shut gate, and the boats behind it stop in a queue.
  const held = new Map();
  for (const raider of world.raiders.filter(isBoat).sort((a, b) => b.s - a.s)) {
    const gate = world.gates.find((g) => g.shutLeft > 0 && raider.s <= g.at);
    if (!gate) continue;
    const behind = held.get(gate) ?? gate.at - 14;
    const radius = RAIDERS[raider.kind].radius;
    held.set(gate, Math.min(behind, raider.s + radius) - radius * 2 - 4);
    raider.limit = Math.min(behind - radius, gate.at - 14);
  }
  for (const raider of world.raiders) {
    const spec = RAIDERS[raider.kind];
    const path = WAYS[raider.way];
    let next = raider.s + spec.speed * (1 - raider.slow) * dt;
    if (raider.limit !== undefined && isBoat(raider)) next = Math.max(raider.s, Math.min(next, raider.limit));
    raider.limit = undefined;
    raider.s = next;
    place(raider);
    if (raider.burnLeft > 0) {
      raider.burnLeft -= dt;
      hurt(world, raider, raider.burn * dt, events, 'fire');
    }
    if (raider.hp > 0 && raider.s >= path.length) {
      raider.hp = 0;
      raider.leaked = true;
      world.lives -= spec.leak;
      world.leaked++;
      events.push({ type: 'leak', id: raider.id, kind: raider.kind, lives: spec.leak });
    }
  }

  // Towers aim and shoot.
  for (const tower of world.towers) {
    if (!tower || tower.kind === 'gong') continue;
    tower.cooldown -= dt * (1 + hasteAt(world, tower));
    const target = targetOf(world, tower);
    if (target) tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    if (tower.cooldown > 0 || !target) continue;
    const level = TOWERS[tower.kind].levels[tower.level],
      type = TOWERS[tower.kind].kind;
    tower.cooldown = 1 / level.rate;
    const distance = Math.hypot(target.x - tower.x, target.y - tower.y);
    const shot = {
      id: world.nextId++,
      tower: tower.kind,
      level: tower.level,
      type,
      from: tower.plot,
      x0: tower.x,
      y0: tower.y,
      x: target.x,
      y: target.y,
      target: target.id,
      t: 0,
      flight: Math.max(0.12, (distance / 100) * FLIGHT[type])
    };
    world.shots.push(shot);
    events.push({ type: 'shot', id: shot.id, tower: tower.kind, from: tower.plot, x: target.x, y: target.y });
  }

  // Shots land. Arrows and fire arrows follow their mark; a stone lands where it was thrown.
  for (const shot of world.shots) {
    shot.t += dt;
    const target = world.raiders.find((r) => r.id === shot.target && r.hp > 0);
    if (target && shot.type !== 'blast') {
      shot.x = target.x;
      shot.y = target.y;
    }
    if (shot.t < shot.flight) continue;
    shot.done = true;
    const level = TOWERS[shot.tower].levels[shot.level];
    if (shot.type === 'blast') {
      for (const raider of world.raiders) {
        if (raider.hp <= 0) continue;
        const d = Math.hypot(raider.x - shot.x, raider.y - shot.y);
        if (d <= level.splash + RAIDERS[raider.kind].radius) hurt(world, raider, damageTo(raider, shot.tower, level.damage * (d < level.splash * 0.4 ? 1 : 0.6)), events, shot.tower);
      }
      events.push({ type: 'hit', tower: shot.tower, x: shot.x, y: shot.y, splash: level.splash });
    } else if (target) {
      hurt(world, target, damageTo(target, shot.tower, level.damage), events, shot.tower);
      if (shot.type === 'fire') {
        target.burn = Math.max(target.burn, level.burn * (isBoat(target) ? TOWERS.fire.vsBoat : 1));
        target.burnLeft = Math.max(target.burnLeft, level.burnFor);
      }
      events.push({ type: 'hit', tower: shot.tower, x: shot.x, y: shot.y, id: target.id });
    }
  }
  world.shots = world.shots.filter((shot) => !shot.done);
  world.raiders = world.raiders.filter((raider) => raider.hp > 0);

  if (world.lives <= 0) {
    world.lives = 0;
    world.state = 'lost';
    events.push({ type: 'lost', wave: world.wave });
  } else if (world.wave === WAVES.length - 1 && !world.queue.length && !world.raiders.length) {
    world.state = 'won';
    events.push({ type: 'won', stars: stars(world.lives, world.livesAtStart) });
  }
  return events;
}

/** The stars a finished game earned. */
export const starsOf = (world) => (world.state === 'won' ? stars(world.lives, world.livesAtStart) : 0);
