// 规则：哪吒闹海的一局。一波一波的水族兵从海里冒出来，哪吒只管走位，法宝自己出手；击退的兵掉出珍珠，珍珠既是
// 经验也是钱。一波结束后升级、进龙宫集市买法宝和宝物，同样的法宝同阶两件合成高一阶，两件第三阶以上的配对法宝合成
// 神器。这里不碰页面也不碰引擎，在 Node 里用固定种子就能跑完一局；画面只读这里的状态和 `step` 返回的事件。
// The rules: one game of Nezha Stirs the Sea. Wave after wave of sea soldiers rise from the water; Nezha only moves,
// and her treasures strike by themselves. Fallen soldiers drop pearls, which are both experience and money. After a
// wave come the level-ups and the market of the Dragon Palace, where two of the same treasure and tier merge into the
// next tier, and two paired treasures of the third tier or above merge into a divine one. Nothing here touches the
// page or the engine, so a whole game runs in Node from a seed; the view only reads this state and the events `step`
// returns.
import {
  BASE_STATS,
  BOSS_WAVES,
  DANGER,
  DIVINE,
  DIVINE_TIER,
  ENEMIES,
  FIELD,
  HEROES,
  ITEMS,
  ITEM_KINDS,
  LEVEL_UPS,
  MAX_ON_FIELD,
  SHOP,
  SOLDIER_KINDS,
  START_PEARLS,
  TIERS,
  WAVE_PEARLS,
  WAVES,
  WEAPONS,
  WEAPON_KINDS,
  itemPrice,
  fierceOf,
  spawnRate,
  strengthOf,
  waveSeconds,
  weaponPrice,
  xpToLevel
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

export const PLAYER = { radius: 14, speed: 190, guard: 0.35 };
const pick = (random, list) => list[Math.floor(random() * list.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** A new game with `hero` on `danger` (0 to 2). */
export function createRun({ seed = 1, hero = 'boy', danger = 0 } = {}) {
  const spec = HEROES[hero] ?? HEROES.boy;
  const run = {
    seed,
    random: seeded(seed),
    hero: HEROES[hero] ? hero : 'boy',
    danger: Math.max(0, Math.min(DANGER.length - 1, danger | 0)),
    phase: 'wave',
    wave: 1,
    waveLeft: waveSeconds(1),
    time: 0,
    player: { x: FIELD.width / 2, y: FIELD.height / 2, hp: 0, guard: 0, facing: 0 },
    bonus: {},
    items: {},
    slots: spec.slots,
    weapons: [newWeapon(spec.weapon, 0)],
    pearls: START_PEARLS,
    xp: 0,
    level: 0,
    pending: 0,
    choices: null,
    enemies: [],
    shots: [],
    spits: [],
    drops: [],
    spawnDebt: 0,
    nextId: 1,
    kills: 0,
    boss: null,
    shop: { offers: [], rerolls: 0 },
    merges: 0,
    divines: 0,
    hurtTaken: 0
  };
  run.player.hp = statsOf(run).maxHp;
  return run;
}

function newWeapon(kind, tier) {
  return { kind, tier, divine: Boolean(DIVINE[kind]), cooldown: 0.3, angle: 0, also: 0 };
}

/** Nezha's stats now: her base, her form, her items and her levels. */
export function statsOf(run) {
  const out = { ...BASE_STATS };
  const add = (stats, times = 1) => {
    for (const [key, value] of Object.entries(stats)) out[key] += value * times;
  };
  add(HEROES[run.hero].stats);
  for (const [kind, count] of Object.entries(run.items)) add(ITEMS[kind].stats, count);
  add(run.bonus);
  out.maxHp = Math.max(1, Math.round(out.maxHp));
  return out;
}

/** How a treasure strikes at its tier: damage, cooldown and reach, with what a divine one adds. */
export function specOf(weapon) {
  if (weapon.divine) {
    const d = DIVINE[weapon.kind];
    return { ...d, tierIndex: TIERS };
  }
  const w = WEAPONS[weapon.kind],
    t = weapon.tier;
  return {
    kind: w.kind,
    damage: w.damage[t],
    cooldown: w.cooldown[t],
    reach: w.reach[t],
    arc: w.arc,
    width: w.width,
    splash: w.splash?.[t],
    count: w.count?.[t],
    knock: w.knock,
    tierIndex: t
  };
}

// ---- Soldiers ----

function spawn(run, kind, at) {
  const spec = ENEMIES[kind],
    danger = DANGER[run.danger],
    strength = spec.boss ? 1 : strengthOf(run.wave);
  let x = at?.x,
    y = at?.y;
  for (let tries = 0; x === undefined && tries < 20; tries++) {
    const cx = FIELD.margin + run.random() * (FIELD.width - FIELD.margin * 2),
      cy = FIELD.margin + run.random() * (FIELD.height - FIELD.margin * 2);
    if (Math.hypot(cx - run.player.x, cy - run.player.y) > 140) {
      x = cx;
      y = cy;
    }
  }
  x ??= FIELD.margin;
  y ??= FIELD.margin;
  const hp = Math.round(spec.hp * strength * danger.hp);
  const enemy = { id: run.nextId++, kind, x, y, hp, max: hp, rising: spec.boss ? 1.2 : 0.7, cool: 0, state: 'move', stateLeft: 0, act: 1.5 + run.random() * 2, hitBy: new Map(), phase: run.random() * 6 };
  run.enemies.push(enemy);
  if (spec.boss) run.boss = enemy;
  return enemy;
}

function hurtPlayer(run, amount, events, from) {
  const p = run.player,
    stats = statsOf(run);
  if (p.guard > 0 || run.phase !== 'wave') return;
  if (run.random() * 100 < Math.min(50, stats.dodge)) {
    events.push({ type: 'dodge', x: p.x, y: p.y });
    p.guard = 0.2;
    return;
  }
  const armor = stats.armor,
    taken = Math.max(1, Math.round(amount * (armor >= 0 ? 15 / (15 + armor) : (15 - armor) / 15)));
  p.hp -= taken;
  p.guard = PLAYER.guard;
  run.hurtTaken += taken;
  events.push({ type: 'hurt', amount: taken, from, x: p.x, y: p.y });
  if (p.hp <= 0) {
    p.hp = 0;
    run.phase = 'lost';
    events.push({ type: 'lost', wave: run.wave });
  }
}

function hurtEnemy(run, enemy, amount, weapon, events, knock = 0, fromX = run.player.x, fromY = run.player.y) {
  if (enemy.hp <= 0 || enemy.rising > 0) return false;
  const stats = statsOf(run);
  let damage = amount * (1 + stats.damage / 100);
  const crit = run.random() * 100 < stats.crit;
  if (crit) damage *= 2;
  damage = Math.max(1, Math.round(damage));
  enemy.hp -= damage;
  if (stats.lifesteal > 0 && run.random() * 100 < stats.lifesteal) run.player.hp = Math.min(stats.maxHp, run.player.hp + 1);
  if (knock && !ENEMIES[enemy.kind].boss) {
    const d = Math.hypot(enemy.x - fromX, enemy.y - fromY) || 1;
    enemy.x += ((enemy.x - fromX) / d) * knock;
    enemy.y += ((enemy.y - fromY) / d) * knock;
  }
  events.push({ type: 'hit', id: enemy.id, damage, crit, weapon, x: enemy.x, y: enemy.y });
  if (enemy.hp <= 0) kill(run, enemy, events);
  return true;
}

function kill(run, enemy, events) {
  const spec = ENEMIES[enemy.kind];
  run.kills++;
  let pearls = spec.pearls;
  if (!spec.boss && run.random() * 100 < 5 + statsOf(run).luck * 0.5) pearls++;
  for (let i = 0; i < pearls; i++) run.drops.push({ id: run.nextId++, x: enemy.x + (run.random() - 0.5) * 18, y: enemy.y + (run.random() - 0.5) * 18, value: 1, pulled: false });
  events.push({ type: 'kill', id: enemy.id, kind: enemy.kind, x: enemy.x, y: enemy.y });
  if (spec.boss) {
    run.boss = null;
    events.push({ type: 'bossDown', kind: enemy.kind });
  }
}

/** The nearest standing soldier to (x, y) within `reach`, or null. */
export function nearest(run, x, y, reach = Infinity) {
  let best = null,
    bestD = reach;
  for (const enemy of run.enemies) {
    if (enemy.hp <= 0 || enemy.rising > 0) continue;
    const d = Math.hypot(enemy.x - x, enemy.y - y) - ENEMIES[enemy.kind].radius;
    if (d < bestD) {
      bestD = d;
      best = enemy;
    }
  }
  return best;
}

// ---- Treasures ----

function strike(run, weapon, index, kind, spec, dt, events, field = 'cooldown') {
  const p = run.player,
    stats = statsOf(run),
    reach = spec.reach * (1 + stats.range / 100);
  if (kind === 'orbit') {
    // The wheels turn all the time and burn what they touch, each soldier once a cooldown.
    weapon.angle += dt * 3.2;
    const count = spec.count,
      hitR = 15;
    for (let k = 0; k < count; k++) {
      const a = weapon.angle + (k / count) * Math.PI * 2,
        wx = p.x + Math.cos(a) * reach,
        wy = p.y + Math.sin(a) * reach;
      for (const enemy of run.enemies) {
        if (enemy.hp <= 0 || enemy.rising > 0) continue;
        if (Math.hypot(enemy.x - wx, enemy.y - wy) > hitR + ENEMIES[enemy.kind].radius) continue;
        const key = `${index}:${kind}`;
        if ((enemy.hitBy.get(key) ?? -1) > run.time) continue;
        enemy.hitBy.set(key, run.time + spec.cooldown / (1 + stats.attackSpeed / 100));
        hurtEnemy(run, enemy, spec.damage, weapon.kind, events, spec.knock, p.x, p.y);
      }
    }
    return;
  }
  weapon[field] -= dt * (1 + stats.attackSpeed / 100);
  if (weapon[field] > 0) return;
  const target = nearest(run, p.x, p.y, kind === 'nova' ? reach : reach);
  if (!target) {
    weapon[field] = 0;
    return;
  }
  weapon[field] = spec.cooldown;
  const angle = Math.atan2(target.y - p.y, target.x - p.x);
  p.facing = angle;
  if (kind === 'throw') {
    run.shots.push({ id: run.nextId++, type: 'ring', weapon: weapon.kind, x: p.x, y: p.y, angle, out: reach, gone: 0, back: false, speed: 460, damage: spec.damage, knock: spec.knock, hit: new Set() });
    events.push({ type: 'throw', weapon: weapon.kind });
  } else if (kind === 'sweep') {
    const half = ((spec.arc ?? 120) * Math.PI) / 360;
    for (const enemy of run.enemies) {
      const d = dist(enemy, p);
      if (d > reach + ENEMIES[enemy.kind].radius) continue;
      let off = Math.abs(Math.atan2(enemy.y - p.y, enemy.x - p.x) - angle);
      if (off > Math.PI) off = Math.PI * 2 - off;
      if (off <= half) hurtEnemy(run, enemy, spec.damage, weapon.kind, events, spec.knock);
    }
    events.push({ type: 'sweep', weapon: weapon.kind, x: p.x, y: p.y, angle, reach, arc: spec.arc ?? 120 });
  } else if (kind === 'thrust') {
    const width = spec.width ?? 16,
      cos = Math.cos(angle),
      sin = Math.sin(angle);
    for (const enemy of run.enemies) {
      const dx = enemy.x - p.x,
        dy = enemy.y - p.y,
        along = dx * cos + dy * sin,
        across = Math.abs(-dx * sin + dy * cos),
        r = ENEMIES[enemy.kind].radius;
      if (along > -r && along < reach + r && across < width / 2 + r) hurtEnemy(run, enemy, spec.damage, weapon.kind, events, spec.knock);
    }
    events.push({ type: 'thrust', weapon: weapon.kind, x: p.x, y: p.y, angle, reach, width });
  } else if (kind === 'lob') {
    run.shots.push({ id: run.nextId++, type: 'brick', weapon: weapon.kind, x0: p.x, y0: p.y, x: target.x, y: target.y, t: 0, flight: 0.45, damage: spec.damage, splash: spec.splash, knock: spec.knock });
    events.push({ type: 'lob', weapon: weapon.kind });
  } else if (kind === 'nova') {
    for (const enemy of run.enemies) if (dist(enemy, p) <= reach + ENEMIES[enemy.kind].radius) hurtEnemy(run, enemy, spec.damage, weapon.kind, events, spec.knock);
    events.push({ type: 'nova', weapon: weapon.kind, x: p.x, y: p.y, reach });
  }
}

function moveShots(run, dt, events) {
  const p = run.player;
  for (const shot of run.shots) {
    if (shot.type === 'ring') {
      // Out to its reach, then back to Nezha's hand, striking each soldier once each way.
      const step = shot.speed * dt;
      if (!shot.back) {
        shot.x += Math.cos(shot.angle) * step;
        shot.y += Math.sin(shot.angle) * step;
        shot.gone += step;
        if (shot.gone >= shot.out) {
          shot.back = true;
          shot.hit.clear();
        }
      } else {
        const d = dist(shot, p) || 1;
        shot.x += ((p.x - shot.x) / d) * step * 1.1;
        shot.y += ((p.y - shot.y) / d) * step * 1.1;
        if (d < 18) shot.done = true;
      }
      for (const enemy of run.enemies) {
        if (shot.hit.has(enemy.id) || enemy.hp <= 0) continue;
        if (Math.hypot(enemy.x - shot.x, enemy.y - shot.y) <= 12 + ENEMIES[enemy.kind].radius) {
          shot.hit.add(enemy.id);
          hurtEnemy(run, enemy, shot.damage, shot.weapon, events, shot.knock, shot.x, shot.y);
        }
      }
    } else {
      shot.t += dt;
      if (shot.t >= shot.flight) {
        shot.done = true;
        for (const enemy of run.enemies) if (Math.hypot(enemy.x - shot.x, enemy.y - shot.y) <= shot.splash + ENEMIES[enemy.kind].radius) hurtEnemy(run, enemy, shot.damage, shot.weapon, events, shot.knock, shot.x, shot.y);
        events.push({ type: 'land', weapon: shot.weapon, x: shot.x, y: shot.y, splash: shot.splash });
      }
    }
  }
  run.shots = run.shots.filter((shot) => !shot.done);
  // The conch soldiers' water.
  for (const spit of run.spits) {
    spit.x += spit.vx * dt;
    spit.y += spit.vy * dt;
    spit.life -= dt;
    if (Math.hypot(spit.x - p.x, spit.y - p.y) < PLAYER.radius + 6) {
      spit.life = 0;
      hurtPlayer(run, spit.damage, events, 'spit');
    }
  }
  run.spits = run.spits.filter((spit) => spit.life > 0 && spit.x > -20 && spit.x < FIELD.width + 20 && spit.y > -20 && spit.y < FIELD.height + 20);
}

// ---- Soldiers move ----

function think(run, enemy, dt, events) {
  const spec = ENEMIES[enemy.kind],
    p = run.player,
    dx = p.x - enemy.x,
    dy = p.y - enemy.y,
    d = Math.hypot(dx, dy) || 1,
    hurt = DANGER[run.danger].hurt * fierceOf(run.wave);
  let speed = spec.speed,
    ux = dx / d,
    uy = dy / d;
  enemy.act -= dt;
  if (spec.ai === 'drift') {
    enemy.phase += dt * 2;
    const a = Math.sin(enemy.phase) * 0.9;
    [ux, uy] = [ux * Math.cos(a) - uy * Math.sin(a), ux * Math.sin(a) + uy * Math.cos(a)];
  } else if (spec.ai === 'charge') {
    if (enemy.state === 'charge') {
      ux = Math.cos(enemy.dir);
      uy = Math.sin(enemy.dir);
      speed *= 3.4;
      enemy.stateLeft -= dt;
      if (enemy.stateLeft <= 0) {
        enemy.state = 'move';
        enemy.act = 2.2;
      }
    } else if (enemy.state === 'aim') {
      speed = 0;
      enemy.stateLeft -= dt;
      if (enemy.stateLeft <= 0) {
        enemy.state = 'charge';
        enemy.stateLeft = 0.7;
      }
    } else if (d < 230 && enemy.act <= 0) {
      enemy.state = 'aim';
      enemy.stateLeft = 0.45;
      enemy.dir = Math.atan2(dy, dx);
      events.push({ type: 'aim', id: enemy.id });
    }
  } else if (spec.ai === 'burst') {
    if (enemy.state === 'fuse') {
      speed = 0;
      enemy.stateLeft -= dt;
      if (enemy.stateLeft <= 0) {
        enemy.hp = 0;
        events.push({ type: 'burst', id: enemy.id, x: enemy.x, y: enemy.y, radius: 64 });
        if (d < 64 + PLAYER.radius) hurtPlayer(run, spec.blast * hurt, events, 'burst');
        for (const other of run.enemies) if (other !== enemy && other.hp > 0 && dist(other, enemy) < 64) hurtEnemy(run, other, 6, 'burst', events, 10, enemy.x, enemy.y);
        return;
      }
    } else if (d < 54) {
      enemy.state = 'fuse';
      enemy.stateLeft = 0.75;
      events.push({ type: 'fuse', id: enemy.id });
    }
  } else if (spec.ai === 'shoot') {
    if (d < 190) {
      ux = -ux;
      uy = -uy;
    } else if (d < 260) speed *= 0.2;
    if (enemy.act <= 0) {
      enemy.act = 2.4;
      const sp = 170;
      run.spits.push({ id: run.nextId++, x: enemy.x, y: enemy.y, vx: (dx / d) * sp, vy: (dy / d) * sp, life: 4, damage: spec.shot * hurt });
      events.push({ type: 'spit', id: enemy.id });
    }
  } else if (spec.ai === 'boss') {
    bossThink(run, enemy, dt, d, dx, dy, events);
    if (enemy.state === 'charge') {
      ux = Math.cos(enemy.dir);
      uy = Math.sin(enemy.dir);
      speed *= 3;
    } else if (enemy.state === 'aim' || enemy.state === 'cast') speed = 0;
    if (enemy.kind === 'aoBing' && enemy.hp < enemy.max / 2) speed *= 1.3;
  }
  enemy.vx = ux * speed;
  enemy.vy = uy * speed;
}

function bossThink(run, enemy, dt, d, dx, dy, events) {
  const half = enemy.hp < enemy.max / 2;
  enemy.stateLeft -= dt;
  if (enemy.state !== 'move' && enemy.stateLeft <= 0) {
    if (enemy.state === 'aim') {
      enemy.state = 'charge';
      enemy.stateLeft = 0.8;
      return;
    }
    enemy.state = 'move';
  }
  if (enemy.state !== 'move' || enemy.act > 0) return;
  if (enemy.kind === 'yaksha') {
    // The yaksha rushes Nezha, and calls shrimp soldiers to him.
    enemy.turn = !enemy.turn;
    if (enemy.turn) {
      enemy.state = 'aim';
      enemy.stateLeft = 0.6;
      enemy.dir = Math.atan2(dy, dx);
      enemy.act = half ? 2.6 : 3.6;
      events.push({ type: 'aim', id: enemy.id });
    } else {
      for (let i = 0; i < (half ? 6 : 4); i++) spawn(run, 'shrimp', { x: enemy.x + Math.cos(i) * 40, y: enemy.y + Math.sin(i) * 40 });
      enemy.act = 2.5;
      events.push({ type: 'summon', id: enemy.id });
    }
  } else {
    // Ao Bing throws rings of ice spears, rushes, and calls sharks.
    enemy.turn = ((enemy.turn | 0) + 1) % 3;
    if (enemy.turn === 1) {
      const count = half ? 16 : 12;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + enemy.phase;
        run.spits.push({ id: run.nextId++, x: enemy.x, y: enemy.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 5, damage: 6 * DANGER[run.danger].hurt, ice: true });
      }
      enemy.phase += 0.3;
      enemy.state = 'cast';
      enemy.stateLeft = 0.5;
      enemy.act = half ? 1.6 : 2.2;
      events.push({ type: 'ice', id: enemy.id });
    } else if (enemy.turn === 2) {
      enemy.state = 'aim';
      enemy.stateLeft = 0.55;
      enemy.dir = Math.atan2(dy, dx);
      enemy.act = 2;
      events.push({ type: 'aim', id: enemy.id });
    } else {
      for (let i = 0; i < (half ? 4 : 3); i++) spawn(run, 'shark', { x: enemy.x + Math.cos(i * 2) * 50, y: enemy.y + Math.sin(i * 2) * 50 });
      enemy.act = 2.4;
      events.push({ type: 'summon', id: enemy.id });
    }
  }
}

/** Soldiers that overlap push each other apart, through a grid of cells so a crowd costs little. */
function spread(run) {
  const cell = 40,
    grid = new Map();
  for (const enemy of run.enemies) {
    if (enemy.hp <= 0) continue;
    const key = ((enemy.x / cell) | 0) * 1000 + ((enemy.y / cell) | 0);
    (grid.get(key) ?? grid.set(key, []).get(key)).push(enemy);
  }
  for (const enemy of run.enemies) {
    if (enemy.hp <= 0) continue;
    const cx = (enemy.x / cell) | 0,
      cy = (enemy.y / cell) | 0,
      r = ENEMIES[enemy.kind].radius;
    for (let gx = cx - 1; gx <= cx + 1; gx++)
      for (let gy = cy - 1; gy <= cy + 1; gy++)
        for (const other of grid.get(gx * 1000 + gy) ?? []) {
          if (other.id <= enemy.id) continue;
          const dx = other.x - enemy.x,
            dy = other.y - enemy.y,
            d = Math.hypot(dx, dy) || 0.01,
            gap = r + ENEMIES[other.kind].radius - d;
          if (gap <= 0) continue;
          const push = gap / 2 / d;
          enemy.x -= dx * push;
          enemy.y -= dy * push;
          other.x += dx * push;
          other.y += dy * push;
        }
  }
}

const clampX = (x, r) => Math.max(r, Math.min(FIELD.width - r, x));
const clampY = (y, r) => Math.max(r, Math.min(FIELD.height - r, y));

/**
 * One step of `seconds` with Nezha moving along `move` ({ x, y }, length at most 1). Returns what happened, for the
 * view and the sound.
 */
export function step(run, seconds, move = { x: 0, y: 0 }) {
  const events = [];
  if (run.phase !== 'wave') return events;
  const dt = Math.min(seconds, 0.05);
  run.time += dt;
  const stats = statsOf(run),
    p = run.player;

  // Nezha moves; the guard after a hit wears off; she mends slowly.
  const length = Math.hypot(move.x, move.y);
  const scale = length > 1 ? 1 / length : 1,
    speed = PLAYER.speed * (1 + stats.speed / 100);
  p.x = clampX(p.x + move.x * scale * speed * dt, PLAYER.radius);
  p.y = clampY(p.y + move.y * scale * speed * dt, PLAYER.radius);
  if (length > 0.1) p.facing = Math.atan2(move.y, move.x);
  p.guard = Math.max(0, p.guard - dt);
  if (stats.regen > 0) p.hp = Math.min(stats.maxHp, p.hp + stats.regen * 0.1 * dt);

  // The wave's clock, and soldiers rising from the water.
  const boss = BOSS_WAVES[run.wave];
  run.waveLeft = Math.max(0, run.waveLeft - dt);
  if (boss && !run.bossCalled && run.time >= 2) {
    run.bossCalled = true;
    spawn(run, boss);
    events.push({ type: 'boss', kind: boss });
  }
  const rate = spawnRate(run.wave) * DANGER[run.danger].more * (boss ? 0.45 : 1);
  run.spawnDebt += rate * dt;
  const unlocked = SOLDIER_KINDS.filter((kind) => ENEMIES[kind].from <= run.wave);
  while (run.spawnDebt >= 1) {
    run.spawnDebt--;
    if (run.enemies.length >= MAX_ON_FIELD) continue;
    // Newer kinds come less often than shrimp, which are always the most. From the eighth wave some come as a shoal,
    // five rising together.
    const kind = run.random() < 0.4 ? 'shrimp' : pick(run.random, unlocked);
    const enemy = spawn(run, kind);
    events.push({ type: 'spawn', id: enemy.id, kind, x: enemy.x, y: enemy.y });
    if (run.wave >= 8 && run.random() < 0.12 && run.enemies.length < MAX_ON_FIELD - 5)
      for (let i = 0; i < 4; i++) {
        const mate = spawn(run, kind, { x: clampX(enemy.x + Math.cos(i * 1.6) * 30, 12), y: clampY(enemy.y + Math.sin(i * 1.6) * 30, 12) });
        run.spawnDebt -= 0.5;
        events.push({ type: 'spawn', id: mate.id, kind, x: mate.x, y: mate.y });
      }
  }

  // Soldiers rise, think, move and touch.
  for (const enemy of run.enemies) {
    if (enemy.hp <= 0) continue;
    if (enemy.rising > 0) {
      enemy.rising -= dt;
      continue;
    }
    think(run, enemy, dt, events);
    if (enemy.hp <= 0) continue;
    const r = ENEMIES[enemy.kind].radius;
    enemy.x = clampX(enemy.x + enemy.vx * dt, r);
    enemy.y = clampY(enemy.y + enemy.vy * dt, r);
    enemy.cool = Math.max(0, enemy.cool - dt);
    const touch = ENEMIES[enemy.kind].touch;
    if (touch && enemy.cool === 0 && dist(enemy, p) < r + PLAYER.radius) {
      enemy.cool = 0.6;
      hurtPlayer(run, touch * DANGER[run.danger].hurt * fierceOf(run.wave), events, enemy.kind);
    }
  }
  spread(run);
  if (run.phase !== 'wave') return events;

  // Treasures strike.
  run.weapons.forEach((weapon, index) => {
    const spec = specOf(weapon);
    strike(run, weapon, index, spec.kind, spec, dt, events);
    if (spec.also) strike(run, weapon, index, spec.also, { ...spec, kind: spec.also, cooldown: spec.cooldown * 1.6, reach: spec.also === 'thrust' ? spec.reach * 1.8 : spec.reach }, dt, events, 'also');
  });
  moveShots(run, dt, events);
  run.enemies = run.enemies.filter((enemy) => enemy.hp > 0);
  if (run.phase !== 'wave') return events;

  // Pearls drift to Nezha when she is near, and are hers when they reach her.
  const pull = 60 + stats.pickup;
  for (const drop of run.drops) {
    const d = dist(drop, p);
    if (d < pull) drop.pulled = true;
    if (drop.pulled) {
      const k = Math.min(1, (520 * dt) / (d || 1));
      drop.x += (p.x - drop.x) * k;
      drop.y += (p.y - drop.y) * k;
    }
    if (d < PLAYER.radius + 6) {
      drop.taken = true;
      gain(run, drop.value, events);
    }
  }
  run.drops = run.drops.filter((drop) => !drop.taken);

  // The wave ends with its clock, or on a boss wave with the boss.
  if ((boss && run.bossCalled && !run.boss) || (!boss && run.waveLeft <= 0)) endWave(run, events);
  return events;
}

function gain(run, value, events) {
  run.pearls += value;
  run.xp += value;
  while (run.xp >= xpToLevel(run.level)) {
    run.xp -= xpToLevel(run.level);
    run.level++;
    run.pending++;
    events.push({ type: 'level', level: run.level });
  }
  events.push({ type: 'pearl', value });
}

function endWave(run, events) {
  const stats = statsOf(run);
  for (const enemy of run.enemies) events.push({ type: 'sink', id: enemy.id, x: enemy.x, y: enemy.y });
  run.enemies = [];
  run.shots = [];
  run.spits = [];
  let left = 0;
  for (const drop of run.drops) left += drop.value;
  run.drops = [];
  if (left) gain(run, left, events);
  const harvest = WAVE_PEARLS + Math.max(0, Math.round(stats.harvest));
  run.pearls += harvest;
  events.push({ type: 'waveEnd', wave: run.wave, harvest });
  if (run.wave >= WAVES) {
    run.phase = 'won';
    events.push({ type: 'won' });
    return;
  }
  if (run.pending > 0) {
    run.phase = 'levelUp';
    rollChoices(run);
  } else openShop(run);
}

// ---- Between waves ----

function rollChoices(run) {
  const pool = [...LEVEL_UPS.keys()];
  const out = [];
  while (out.length < 4 && pool.length) out.push(pool.splice(Math.floor(run.random() * pool.length), 1)[0]);
  // A raise grows a little with each level.
  run.choices = out.map((index) => ({ index, stats: Object.fromEntries(Object.entries(LEVEL_UPS[index]).map(([k, v]) => [k, v * (1 + Math.floor(run.level / 6) * 0.5)])) }));
}

/** Take the level-up `choice` (0 to 3). */
export function chooseLevelUp(run, choice) {
  if (run.phase !== 'levelUp' || !run.choices?.[choice]) return { ok: false };
  for (const [key, value] of Object.entries(run.choices[choice].stats)) run.bonus[key] = (run.bonus[key] ?? 0) + value;
  run.pending--;
  if (run.pending > 0) rollChoices(run);
  else {
    run.choices = null;
    openShop(run);
  }
  return { ok: true };
}

function rollOffer(run) {
  const luck = statsOf(run).luck,
    wave = run.wave,
    random = run.random;
  if (random() < 0.45) {
    const kind = pick(random, WEAPON_KINDS);
    let tier = 0;
    const lift = 1 + luck / 100;
    if (wave >= 4 && random() < 0.25 * lift) tier = 1;
    if (wave >= 9 && random() < 0.18 * lift) tier = 2;
    if (wave >= 14 && random() < 0.1 * lift) tier = 3;
    return { type: 'weapon', kind, tier, price: weaponPrice(kind, tier, wave), locked: false };
  }
  const rarity = wave >= 8 && random() < 0.2 * (1 + luck / 100) ? 2 : wave >= 4 && random() < 0.35 * (1 + luck / 100) ? 1 : 0;
  const kinds = ITEM_KINDS.filter((kind) => ITEMS[kind].rarity === rarity);
  const kind = pick(random, kinds);
  return { type: 'item', kind, price: itemPrice(kind, wave), locked: false };
}

function openShop(run) {
  run.phase = 'shop';
  run.shop.rerolls = 0;
  run.shop.offers = Array.from({ length: SHOP.offers }, (_, i) => {
    const kept = run.shop.offers[i];
    return kept && kept.locked && !kept.sold ? kept : rollOffer(run);
  });
}

export const rerollPrice = (run) => SHOP.reroll(run.wave, run.shop.rerolls);

/** New offers in place of every one not locked. */
export function reroll(run) {
  if (run.phase !== 'shop') return { ok: false, why: 'phase' };
  const price = rerollPrice(run);
  if (run.pearls < price) return { ok: false, why: 'pearls' };
  run.pearls -= price;
  run.shop.rerolls++;
  run.shop.offers = run.shop.offers.map((offer) => (offer.locked && !offer.sold ? offer : rollOffer(run)));
  return { ok: true };
}

/** Keep an offer for the next shop, or let it go. */
export function toggleLock(run, index) {
  const offer = run.shop.offers[index];
  if (run.phase !== 'shop' || !offer || offer.sold) return { ok: false };
  offer.locked = !offer.locked;
  return { ok: true };
}

/** Where a treasure of `kind` and `tier` would go: a free slot, or one of the same it merges into. */
export function placeFor(run, kind, tier) {
  if (run.weapons.length < run.slots) return { slot: run.weapons.length, merge: false };
  const same = run.weapons.findIndex((w) => !w.divine && w.kind === kind && w.tier === tier && tier < TIERS - 1);
  return same >= 0 ? { slot: same, merge: true } : null;
}

/** Buy offer `index`. A treasure goes to a free slot, or merges with one the same when the slots are full. */
export function buy(run, index) {
  const offer = run.shop.offers[index];
  if (run.phase !== 'shop' || !offer || offer.sold) return { ok: false, why: 'offer' };
  if (run.pearls < offer.price) return { ok: false, why: 'pearls' };
  if (offer.type === 'weapon') {
    const place = placeFor(run, offer.kind, offer.tier);
    if (!place) return { ok: false, why: 'full' };
    run.pearls -= offer.price;
    if (place.merge) {
      run.weapons[place.slot].tier++;
      run.merges++;
    } else run.weapons.push(newWeapon(offer.kind, offer.tier));
    offer.sold = true;
    return { ok: true, merged: place.merge, slot: place.slot };
  }
  run.pearls -= offer.price;
  run.items[offer.kind] = (run.items[offer.kind] ?? 0) + 1;
  offer.sold = true;
  const stats = statsOf(run);
  run.player.hp = Math.min(run.player.hp, stats.maxHp);
  return { ok: true };
}

/** What merging the treasures in slots `a` and `b` would make, or null. */
export function mergeResult(run, a, b) {
  const x = run.weapons[a],
    y = run.weapons[b];
  if (!x || !y || a === b || x.divine || y.divine) return null;
  if (x.kind === y.kind && x.tier === y.tier && x.tier < TIERS - 1) return { kind: x.kind, tier: x.tier + 1, divine: false };
  if (x.tier >= DIVINE_TIER && y.tier >= DIVINE_TIER)
    for (const [name, recipe] of Object.entries(DIVINE))
      if ((recipe.from[0] === x.kind && recipe.from[1] === y.kind) || (recipe.from[0] === y.kind && recipe.from[1] === x.kind)) return { kind: name, tier: TIERS, divine: true };
  return null;
}

/** Merge the treasures in slots `a` and `b`: into the next tier, or into a divine treasure. */
export function merge(run, a, b) {
  if (run.phase !== 'shop') return { ok: false, why: 'phase' };
  const result = mergeResult(run, a, b);
  if (!result) return { ok: false, why: 'mismatch' };
  run.weapons[a] = result.divine ? newWeapon(result.kind, TIERS) : { ...newWeapon(result.kind, result.tier) };
  run.weapons.splice(b, 1);
  if (result.divine) run.divines++;
  else run.merges++;
  return { ok: true, ...result, slot: b < a ? a - 1 : a };
}

/** What selling the treasure in `slot` returns. */
export function sellPrice(run, slot) {
  const w = run.weapons[slot];
  if (!w) return 0;
  return w.divine ? 60 : Math.floor(weaponPrice(w.kind, w.tier, run.wave) * SHOP.refund);
}

/** Sell the treasure in `slot` (never the last one). */
export function sell(run, slot) {
  if (run.phase !== 'shop' || !run.weapons[slot] || run.weapons.length <= 1) return { ok: false };
  const back = sellPrice(run, slot);
  run.pearls += back;
  run.weapons.splice(slot, 1);
  return { ok: true, pearls: back };
}

/** Leave the market: the next wave begins, Nezha whole again in the middle of the sea. */
export function nextWave(run) {
  if (run.phase !== 'shop') return { ok: false };
  run.wave++;
  run.phase = 'wave';
  run.waveLeft = waveSeconds(run.wave);
  run.bossCalled = false;
  run.spawnDebt = 0;
  run.player.x = FIELD.width / 2;
  run.player.y = FIELD.height / 2;
  run.player.hp = statsOf(run).maxHp;
  run.player.guard = 0.5;
  for (const weapon of run.weapons) {
    weapon.cooldown = 0.3;
    weapon.also = 0.6;
  }
  return { ok: true };
}
