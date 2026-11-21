// 规则：一夜的守城。城门上的符弩左右移动、自动瞄准离城墙最近的邪祟连射；邪祟从路的尽头一波波压过来，
// 碰到城墙就咬掉城墙的血；击杀掉出魂珠，攒满升一级，从三道符法里选一道；天雷符蓄满后可以一次劈遍全场。
// 撑到首领现身并把它打倒、路上清空，这一夜就守住了。纯函数，不碰页面也不碰引擎；画面只读 world 的状态和
// 每一步的 events。
// The rules: one night at the gate. The crossbow on the wall moves left and right and fires on its own at the haunt
// nearest the wall; haunts press down the road in waves and bite the wall when they reach it. Kills drop souls; enough
// souls gain a level and a choice of one ward out of three; a full thunder talisman strikes the whole road at once.
// Hold until the warden comes, bring it down and clear the road, and the night is held. Plain functions, touching
// neither the page nor the engine: the view reads only `world` and each step's `events`.
import { FIELD, HAUNTS, MAX_HAUNTS, NIGHTS, THUNDER_SECONDS, TURRET, WALL_HP, WARDS, soulsFor } from './data.mjs';
import { createChance } from './random.mjs';

export { FIELD } from './data.mjs';

/** How long a soul takes to fly from where its haunt fell to the crossbow. */
export const SOUL_FLIGHT = 0.55;

/** A new night: `night` 1 to 3, `seed` for every chance in it, `wards` to start with (for tests). */
export function createWorld({ night = 1, seed = 1, wards = {} } = {}) {
  const plan = NIGHTS[Math.min(NIGHTS.length, Math.max(1, night)) - 1];
  const world = {
    night: plan.id,
    plan,
    seed,
    chance: createChance(seed),
    time: 0,
    state: 'play',
    turret: { x: FIELD.width / 2, aim: -Math.PI / 2, cooldown: 0.4, shots: 0, target: 0 },
    wall: { hp: WALL_HP, max: WALL_HP },
    thunder: 0,
    level: 1,
    souls: 0,
    need: soulsFor(1),
    wards: Object.fromEntries(Object.keys(WARDS).map((id) => [id, 0])),
    offer: null,
    owed: 0,
    haunts: [],
    bolts: [],
    spits: [],
    orbs: [],
    debt: {},
    boss: null,
    bossCame: false,
    bossFell: false,
    ink: null,
    inkTimer: 6,
    mirrorTimer: 4,
    stats: { kills: 0, shots: 0, bitten: 0, thunders: 0, bossSeconds: 0 },
    events: [],
    nextId: 1
  };
  for (const [id, level] of Object.entries(wards)) for (let i = 0; i < level; i++) applyWard(world, id);
  return world;
}

/** The level of a ward the crossbow holds. */
export const wardLevel = (world, id) => world.wards[id] ?? 0;

/** The crossbow's numbers now, with its wards counted in. */
export function turretStats(world) {
  const w = (id) => wardLevel(world, id);
  return {
    damage: TURRET.damage * (1 + 0.25 * w('cinnabar')),
    interval: TURRET.interval * 0.86 ** w('haste'),
    bolts: 1 + w('volley'),
    pierce: w('pierce'),
    crit: TURRET.crit + 0.1 * w('crit'),
    critScale: TURRET.critScale + 0.25 * w('crit'),
    range: TURRET.range
  };
}

/** Stars for a night held: by how much of the wall still stands. */
export const starsFor = (world) => (world.state !== 'won' ? 0 : world.wall.hp >= world.wall.max * 0.7 ? 3 : world.wall.hp >= world.wall.max * 0.35 ? 2 : 1);

function spawn(world, kind, x, y) {
  const h = HAUNTS[kind];
  const haunt = {
    id: world.nextId++,
    kind,
    x,
    y,
    hp: h.hp,
    max: h.hp,
    radius: h.radius,
    age: 0,
    phase: world.chance.range(0, Math.PI * 2),
    slow: 0,
    burn: 0,
    burnDps: 0,
    stun: 0,
    summonTimer: h.summon ? h.summon.every * 0.6 : 0,
    shootTimer: h.shoot ? h.shoot.every * world.chance.range(0.5, 1) : 0,
    stompTimer: h.stomp ?? 0,
    biteTimer: 0,
    driftTo: x,
    dead: false
  };
  world.haunts.push(haunt);
  world.events.push({ type: 'spawn', id: haunt.id, kind, x, y });
  return haunt;
}

/** Damage to one haunt from the crossbow's side; a kill is counted once. Returns the damage dealt. */
function hurt(world, haunt, amount, cause) {
  if (haunt.dead || amount <= 0) return 0;
  haunt.hp -= amount;
  if (haunt.hp <= 0) {
    haunt.dead = true;
    world.stats.kills++;
    const soul = HAUNTS[haunt.kind].soul;
    world.orbs.push({ x: haunt.x, y: haunt.y, soul, time: 0 });
    world.events.push({ type: 'kill', id: haunt.id, kind: haunt.kind, x: haunt.x, y: haunt.y, cause, boss: haunt === world.boss });
    if (haunt === world.boss) {
      world.boss = null;
      world.bossFell = true;
      world.events.push({ type: 'bossDown', kind: haunt.kind, x: haunt.x, y: haunt.y });
    }
  }
  return amount;
}

/** A bolt reaches a haunt: damage, a critical, burning, slowing and the thunder chain. */
function strike(world, bolt, haunt) {
  const stats = turretStats(world);
  const crit = world.chance.next() < stats.crit;
  hurt(world, haunt, bolt.damage * (crit ? stats.critScale : 1), 'bolt');
  world.events.push({ type: 'hit', id: haunt.id, x: haunt.x, y: haunt.y, crit });
  const fire = wardLevel(world, 'fire'),
    frost = wardLevel(world, 'frost');
  if (fire) {
    haunt.burn = 3;
    haunt.burnDps = Math.max(haunt.burnDps, 3 + 4 * fire);
  }
  if (frost) haunt.slow = Math.max(haunt.slow, 0.8 + 0.4 * frost);
  if (bolt.chain) {
    const points = [[haunt.x, haunt.y]],
      hit = new Set([haunt.id]);
    let from = haunt;
    for (let jump = 0; jump < 1 + wardLevel(world, 'chain'); jump++) {
      let best = null,
        bestDistance = 150;
      for (const other of world.haunts) {
        if (other.dead || hit.has(other.id)) continue;
        const d = Math.hypot(other.x - from.x, other.y - from.y);
        if (d < bestDistance) (best = other), (bestDistance = d);
      }
      if (!best) break;
      hit.add(best.id);
      hurt(world, best, bolt.damage * 0.6, 'chain');
      points.push([best.x, best.y]);
      from = best;
    }
    if (points.length > 1) world.events.push({ type: 'chain', points });
  }
}

/**
 * The haunt the crossbow aims at: the one nearest the wall within reach, where one that spits fire at the wall counts
 * as standing 260 units nearer (it never walks into the wall's reach, so it would otherwise never be shot).
 */
function pickTarget(world, range) {
  const t = world.turret;
  let best = null,
    bestScore = -Infinity;
  for (const haunt of world.haunts) {
    if (haunt.dead || haunt.y < -10) continue;
    if (Math.hypot(haunt.x - t.x, haunt.y - FIELD.turretY) > range) continue;
    const score = haunt.y + (HAUNTS[haunt.kind].shoot && !HAUNTS[haunt.kind].boss ? 260 : 0);
    if (score > bestScore) (best = haunt), (bestScore = score);
  }
  return best;
}

/** Offer three wards not yet at their most; with none left, the wall is mended a little instead. */
function rollOffer(world) {
  const open = Object.entries(WARDS).filter(([id, ward]) => wardLevel(world, id) < ward.max);
  if (open.length === 0) {
    world.wall.hp = Math.min(world.wall.max, world.wall.hp + world.wall.max * 0.1);
    world.owed--;
    return null;
  }
  const picked = [];
  const pool = [...open];
  while (picked.length < 3 && pool.length) {
    const id = world.chance.weighted(pool.map(([key]) => key), pool.map(([, ward]) => ward.weight));
    picked.push(id);
    pool.splice(pool.findIndex(([key]) => key === id), 1);
  }
  return picked;
}

function applyWard(world, id) {
  if (!(id in WARDS) || wardLevel(world, id) >= WARDS[id].max) return false;
  world.wards[id]++;
  if (id === 'wall') {
    world.wall.max = Math.round(world.wall.max * 1.25);
    world.wall.hp = Math.min(world.wall.max, world.wall.hp + world.wall.max * 0.3);
  }
  return true;
}

/** Take one of the offered wards. Returns whether it was taken. */
export function choose(world, id) {
  if (!world.offer || !world.offer.includes(id)) return false;
  applyWard(world, id);
  world.offer = null;
  world.owed--;
  world.events.push({ type: 'ward', id, level: wardLevel(world, id) });
  if (world.owed > 0) world.offer = rollOffer(world);
  return true;
}

/** Whether the thunder talisman can be used now. */
export const thunderReady = (world) => world.thunder >= 1 && world.state === 'play' && !world.offer;

function castThunder(world) {
  world.thunder = 0;
  world.stats.thunders++;
  const struck = [];
  for (const haunt of world.haunts) {
    if (haunt.dead || haunt.y < -20) continue;
    struck.push([haunt.x, haunt.y]);
    haunt.stun = HAUNTS[haunt.kind].boss ? 0.5 : 1.4;
    hurt(world, haunt, HAUNTS[haunt.kind].boss ? 320 : 150, 'thunder');
  }
  world.events.push({ type: 'thunder', points: struck });
}

/** Move one haunt by its kind's walk. */
function walk(world, haunt, kind, seconds) {
  const h = HAUNTS[kind],
    frost = 0.25 + 0.1 * wardLevel(world, 'frost');
  let speed = h.speed * (haunt.slow > 0 ? 1 - frost : 1);
  if (haunt.stun > 0) return;
  if (h.move === 'hop') {
    // A jiangshi hops: still, then a quick leap.
    const beat = (haunt.age + haunt.phase) % 1;
    speed *= beat < 0.42 ? 2.3 : 0.05;
    if (beat < 0.42 && (haunt.age - seconds + haunt.phase) % 1 >= 0.42) world.events.push({ type: 'hop', id: haunt.id });
  } else if (h.move === 'sway') haunt.x += Math.sin(haunt.age * 2.2 + haunt.phase) * 22 * seconds;
  else if (h.move === 'zigzag') haunt.x += Math.cos(haunt.age * 4 + haunt.phase) * 90 * seconds;
  else if (h.move === 'drift') {
    if (Math.abs(haunt.driftTo - haunt.x) < 6) haunt.driftTo = world.chance.range(FIELD.left + 60, FIELD.right - 60);
    haunt.x += Math.sign(haunt.driftTo - haunt.x) * Math.min(Math.abs(haunt.driftTo - haunt.x), 70 * seconds);
  }
  haunt.x = Math.min(FIELD.right, Math.max(FIELD.left, haunt.x));
  if (h.stop && haunt.y >= h.stop) return;
  haunt.y += speed * seconds;
}

/**
 * One step of `seconds`. `input.move` is -1..1 (left or right), `input.thunder` asks for the thunder talisman. Nothing
 * moves while a choice of wards is open or once the night is over. Returns `world.events`, this step's happenings.
 */
export function step(world, input = {}, seconds = 1 / 60) {
  world.events = [];
  if (world.state !== 'play' || world.offer) return world.events;
  world.time += seconds;
  const stats = turretStats(world),
    turret = world.turret;

  // The crossbow moves along the wall.
  const move = Math.max(-1, Math.min(1, input.move ?? 0));
  turret.x = Math.min(FIELD.right, Math.max(FIELD.left, turret.x + move * TURRET.moveSpeed * seconds));

  // The thunder talisman fills, and strikes when asked.
  world.thunder = Math.min(1, world.thunder + seconds / (THUNDER_SECONDS * (1 - 0.25 * wardLevel(world, 'thunder'))));
  if (input.thunder && thunderReady(world)) castThunder(world);

  // Haunts come by the night's table; the warden comes at its hour.
  const phase = world.plan.phases.find((p) => world.time < p.until);
  if (!world.bossCame || world.boss) {
    for (const [kind, rate] of Object.entries(phase.rates)) {
      world.debt[kind] = (world.debt[kind] ?? world.chance.next()) + rate * seconds;
      while (world.debt[kind] >= 1) {
        world.debt[kind] -= 1;
        if (world.haunts.length < MAX_HAUNTS) spawn(world, kind, world.chance.range(FIELD.left + 10, FIELD.right - 10), -30);
      }
    }
  }
  if (!world.bossCame && world.time >= world.plan.bossAt) {
    world.bossCame = true;
    world.boss = spawn(world, world.plan.boss, FIELD.width / 2, -60);
    world.events.push({ type: 'bossCame', kind: world.plan.boss });
  }
  if (world.boss) world.stats.bossSeconds += seconds;

  // Haunts walk, burn, call others, spit at the wall and bite it.
  for (const haunt of world.haunts) {
    if (haunt.dead) continue;
    const h = HAUNTS[haunt.kind];
    haunt.age += seconds;
    haunt.slow = Math.max(0, haunt.slow - seconds);
    haunt.stun = Math.max(0, haunt.stun - seconds);
    walk(world, haunt, haunt.kind, seconds);
    if (haunt.burn > 0) {
      haunt.burn -= seconds;
      hurt(world, haunt, haunt.burnDps * seconds, 'fire');
      if (haunt.dead) continue;
    }
    if (haunt.stun > 0) continue;
    if (h.summon && haunt.y > 0) {
      haunt.summonTimer -= seconds;
      if (haunt.summonTimer <= 0) {
        haunt.summonTimer = h.summon.every;
        for (let i = 0; i < h.summon.count && world.haunts.length < MAX_HAUNTS; i++)
          spawn(world, h.summon.kind, Math.min(FIELD.right, Math.max(FIELD.left, haunt.x + world.chance.range(-70, 70))), haunt.y + world.chance.range(-20, 30));
        world.events.push({ type: 'summon', id: haunt.id, x: haunt.x, y: haunt.y });
      }
    }
    if (h.shoot && haunt.y > 40) {
      haunt.shootTimer -= seconds;
      if (haunt.shootTimer <= 0) {
        haunt.shootTimer = h.shoot.every;
        world.spits.push({ x: haunt.x, y: haunt.y + haunt.radius, damage: h.shoot.damage, speed: 240 });
        world.events.push({ type: 'spit', id: haunt.id, x: haunt.x, y: haunt.y });
      }
    }
    if (h.stomp && haunt.y > 0) {
      haunt.stompTimer -= seconds;
      if (haunt.stompTimer <= 0) {
        haunt.stompTimer = h.stomp;
        world.events.push({ type: 'stomp', id: haunt.id, x: haunt.x, y: haunt.y });
      }
    }
    if (haunt.y + haunt.radius >= FIELD.wallY) {
      if (h.boss) {
        // A warden at the wall stays and keeps biting.
        haunt.y = FIELD.wallY - haunt.radius;
        haunt.biteTimer -= seconds;
        if (haunt.biteTimer <= 0) {
          haunt.biteTimer = 2;
          biteWall(world, h.bite * 0.25, haunt.x);
        }
      } else {
        haunt.dead = true;
        biteWall(world, h.bite, haunt.x);
      }
    }
  }

  // Spit falls to the wall.
  for (const spit of world.spits) {
    spit.y += spit.speed * seconds;
    if (spit.y >= FIELD.wallY) {
      spit.done = true;
      biteWall(world, spit.damage, spit.x);
    }
  }

  // The crossbow aims and fires.
  turret.cooldown -= seconds;
  const target = pickTarget(world, stats.range);
  turret.target = target ? target.id : 0;
  if (target) turret.aim = Math.atan2(target.y - FIELD.turretY, target.x - turret.x);
  if (target && turret.cooldown <= 0) {
    turret.cooldown += stats.interval;
    if (turret.cooldown < 0) turret.cooldown = 0;
    turret.shots++;
    world.stats.shots++;
    const chain = wardLevel(world, 'chain') > 0 && turret.shots % 4 === 0;
    for (let i = 0; i < stats.bolts; i++) {
      const angle = turret.aim + (i - (stats.bolts - 1) / 2) * 0.1;
      world.bolts.push({
        x: turret.x + Math.cos(angle) * 26,
        y: FIELD.turretY + Math.sin(angle) * 26,
        vx: Math.cos(angle) * TURRET.boltSpeed,
        vy: Math.sin(angle) * TURRET.boltSpeed,
        damage: stats.damage,
        pierce: stats.pierce,
        chain,
        hit: [],
        life: 1.4
      });
    }
    world.events.push({ type: 'shot', x: turret.x, aim: turret.aim, bolts: stats.bolts, chain });
  } else if (!target) turret.cooldown = Math.max(turret.cooldown, 0);

  // Bolts fly and strike.
  for (const bolt of world.bolts) {
    bolt.x += bolt.vx * seconds;
    bolt.y += bolt.vy * seconds;
    bolt.life -= seconds;
    if (bolt.life <= 0 || bolt.y < -60 || bolt.x < -40 || bolt.x > FIELD.width + 40) {
      bolt.done = true;
      continue;
    }
    for (const haunt of world.haunts) {
      if (haunt.dead || bolt.hit.includes(haunt.id)) continue;
      const dx = haunt.x - bolt.x,
        dy = haunt.y - bolt.y,
        r = haunt.radius + 6;
      if (dx * dx + dy * dy > r * r) continue;
      bolt.hit.push(haunt.id);
      strike(world, bolt, haunt);
      if (bolt.pierce > 0) bolt.pierce--;
      else {
        bolt.done = true;
        break;
      }
    }
  }

  // The ink line and the bagua mirror.
  const ink = wardLevel(world, 'ink');
  if (ink) {
    world.inkTimer -= seconds;
    if (world.inkTimer <= 0) {
      world.inkTimer = 10 - ink;
      world.ink = { y: 560, until: world.time + 3 + ink };
      world.events.push({ type: 'ink', y: 560 });
    }
    if (world.ink && world.time > world.ink.until) world.ink = null;
    if (world.ink)
      for (const haunt of world.haunts)
        if (!haunt.dead && Math.abs(haunt.y - world.ink.y) < haunt.radius + 8) hurt(world, haunt, (16 + 14 * ink) * seconds, 'ink');
  }
  const mirror = wardLevel(world, 'mirror');
  if (mirror) {
    world.mirrorTimer -= seconds;
    if (world.mirrorTimer <= 0) {
      world.mirrorTimer = 6 - mirror;
      for (const haunt of world.haunts)
        if (!haunt.dead && haunt.y > -20 && Math.abs(haunt.x - turret.x) < haunt.radius + 20) hurt(world, haunt, 40 + 45 * mirror, 'mirror');
      world.events.push({ type: 'mirror', x: turret.x });
    }
  }

  // Souls fly home and are counted; enough of them gain a level.
  for (const orb of world.orbs) {
    orb.time += seconds;
    if (orb.time >= SOUL_FLIGHT) {
      orb.done = true;
      world.souls += orb.soul;
      while (world.souls >= world.need) {
        world.souls -= world.need;
        world.level++;
        world.need = soulsFor(world.level);
        world.owed++;
        world.events.push({ type: 'level', level: world.level });
      }
    }
  }

  world.haunts = world.haunts.filter((h) => !h.dead);
  world.bolts = world.bolts.filter((b) => !b.done);
  world.spits = world.spits.filter((s) => !s.done);
  world.orbs = world.orbs.filter((o) => !o.done);

  if (world.wall.hp <= 0) {
    world.wall.hp = 0;
    world.state = 'lost';
    world.events.push({ type: 'lost' });
  } else if (world.bossFell && world.haunts.length === 0) {
    world.state = 'won';
    world.events.push({ type: 'won', stars: starsFor(world) });
  } else if (world.owed > 0 && !world.offer) world.offer = rollOffer(world);
  return world.events;
}

function biteWall(world, amount, x) {
  world.wall.hp -= amount;
  world.stats.bitten += amount;
  world.events.push({ type: 'bite', x, amount });
}
