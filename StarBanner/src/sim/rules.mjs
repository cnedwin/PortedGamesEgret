// 规则：一盘战棋的全部状态和每一步怎么走。只用纯数据和固定种子的随机数，不碰页面也不碰引擎，能在 Node 里跑和存档。
// 伤害、反击、暴击、占领、招募、援军、治疗、诅咒、运输、收入和战意槽都按原作规则：
//   伤害 = 攻方生命比 × (基础伤害 + 0~10% 的随机加成) × 地形系数 × 暴击倍率 × 守方受伤系数，四舍五入，至少 1；
//   地形系数：防御星 n 时是 1 − 守方生命比 × n × 10%，骷髅 n 时是 1 + n × 10%；空中单位和建筑不吃地形；
//   暴击时随机加成收窄（总浮动仍是 10% 再除以倍率），平均值不变。
// The rules: the whole state of a battle and how each move is made. Plain data and a seeded random number only, no
// page and no engine, so it runs in Node and saves as it is. Damage, counters, criticals, capture, recruiting,
// reinforcing, healing, hexes, carrying, income and the rally meter follow the original's rules:
//   damage = attacker's health share × (base + a random 0–10% bonus) × terrain × critical × defender's intake, rounded,
//   at least 1; terrain is 1 − defender's health share × stars × 10% for shields, 1 + skulls × 10% for skulls; fliers
//   and buildings take no cover; a critical narrows the random bonus (its spread divided by the multiplier) so the
//   average holds.
import { TERRAIN, stepCost } from './terrain.mjs';
import { UNITS, BUILDINGS, BUILDING_REGEN, GARRISON, isAir } from './units.mjs';
import { COMMANDERS } from './commanders.mjs';

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
];
export const RANDOM_SPREAD = 0.1;

// ---- random --------------------------------------------------------------------------------------------------

/** A number in [0, 1) from the game's own seeded generator (mulberry32), kept in the state so a save resumes it. */
export function random(game) {
  let t = (game.rng = (game.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ---- making a battle -----------------------------------------------------------------------------------------

/**
 * A battle on `map` (src/sim/maps.mjs) for `sides`: [{ commander, ai }] in turn order. The first side to move gets
 * its income at once, as every side does at the start of its turn.
 */
export function createGame(map, sides, seed = 1) {
  const game = {
    map: map.id,
    w: map.w,
    h: map.h,
    terrain: map.terrain.slice(),
    players: sides.map((side, index) => ({ index, commander: side.commander, ai: !!side.ai, gold: map.gold ?? 0, meter: 0, alive: true })),
    units: [],
    buildings: [],
    turn: 1,
    current: 0,
    rng: seed >>> 0 || 1,
    nextId: 1,
    winner: null,
    over: false,
    stats: sides.map(() => ({ kills: 0, lost: 0, recruited: 0, captured: 0, damage: 0 }))
  };
  for (const b of map.buildings) game.buildings.push({ id: game.nextId++, kind: b.kind, owner: b.owner, x: b.x, y: b.y, hp: 100, recruited: false });
  for (const u of map.units) {
    if (u.owner >= sides.length) continue;
    const unit = spawn(game, u.type, u.owner, u.x, u.y);
    if (u.hp) unit.hp = u.hp;
  }
  // Each side's commander stands where the map puts it.
  map.commanders.forEach((spot, owner) => {
    if (owner >= sides.length) return;
    const unit = spawn(game, 'commander', owner, spot.x, spot.y);
    unit.commander = sides[owner].commander;
  });
  game.events = [];
  startTurn(game);
  return game;
}

function spawn(game, type, owner, x, y) {
  const unit = { id: game.nextId++, type, owner, x, y, sx: x, sy: y, hp: 100, done: false, cargo: [], guard: 0 };
  game.units.push(unit);
  return unit;
}

// ---- looking at the board ------------------------------------------------------------------------------------

export const inside = (game, x, y) => x >= 0 && y >= 0 && x < game.w && y < game.h;
export const terrainAt = (game, x, y) => game.terrain[y * game.w + x];
export const unitAt = (game, x, y) => game.units.find((u) => u.x === x && u.y === y) ?? null;
export const buildingAt = (game, x, y) => game.buildings.find((b) => b.x === x && b.y === y) ?? null;
export const unitById = (game, id) => game.units.find((u) => u.id === id) ?? null;
export const buildingById = (game, id) => game.buildings.find((b) => b.id === id) ?? null;
export const distance = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);
export const commanderOf = (game, owner) => game.units.find((u) => u.owner === owner && u.type === 'commander') ?? null;
const key = (x, y) => y * 1000 + x;

/** Gold a side earns at the start of its turn: its stronghold and villages. */
export function incomeOf(game, owner) {
  return game.buildings.reduce((sum, b) => sum + (b.owner === owner ? BUILDINGS[b.kind].income : 0), 0);
}

/** Whether `unit` may stop on (x, y): open ground it can stand on, or an allied carrier with room for it. */
function canStop(game, unit, x, y) {
  const t = terrainAt(game, x, y);
  if (TERRAIN[t].noStop?.includes(UNITS[unit.type].move)) return false;
  if (buildingAt(game, x, y)) return false;
  const there = unitAt(game, x, y);
  return !there || there === unit || canBoard(unit, there);
}

/** Whether `unit` can climb into `carrier`. */
export function canBoard(unit, carrier) {
  const carry = UNITS[carrier.type].carry;
  if (!carry || carrier.owner !== unit.owner || carrier === unit) return false;
  if (carrier.cargo.length >= carry.room || unit.cargo.length) return false;
  return UNITS[unit.type].tags.some((tag) => carry.takes.includes(tag));
}

/**
 * Every tile `unit` can reach this turn: Map of key → { x, y, cost, from }. Friends may be passed through, foes and
 * buildings that are not its own may not; its own buildings may be crossed but not stopped on.
 */
export function reach(game, unit) {
  const move = UNITS[unit.type].move,
    budget = UNITS[unit.type].steps;
  const seen = new Map([[key(unit.x, unit.y), { x: unit.x, y: unit.y, cost: 0, from: null }]]);
  const open = [seen.get(key(unit.x, unit.y))];
  while (open.length) {
    open.sort((a, b) => a.cost - b.cost);
    const here = open.shift();
    for (const [dx, dy] of DIRS) {
      const x = here.x + dx,
        y = here.y + dy;
      if (!inside(game, x, y)) continue;
      const cost = here.cost + stepCost(terrainAt(game, x, y), move);
      if (cost > budget) continue;
      const other = unitAt(game, x, y);
      if (other && other.owner !== unit.owner) continue;
      const b = buildingAt(game, x, y);
      if (b && b.owner !== unit.owner) continue;
      const k = key(x, y);
      const old = seen.get(k);
      if (old && old.cost <= cost) continue;
      const node = { x, y, cost, from: here };
      seen.set(k, node);
      open.push(node);
    }
  }
  return seen;
}

/** The tiles of `reach` where `unit` may end its move. */
export function stops(game, unit, reached = reach(game, unit)) {
  return [...reached.values()].filter((n) => canStop(game, unit, n.x, n.y));
}

/** The path from the unit to (x, y) through a `reach` result, start excluded. */
export function pathTo(reached, x, y) {
  const out = [];
  for (let n = reached.get(key(x, y)); n && n.from; n = n.from) out.unshift({ x: n.x, y: n.y });
  return out;
}

// ---- damage --------------------------------------------------------------------------------------------------

/** The kind a defender counts as in the damage tables. */
const tableKey = (target) => (target.kind ? 'structure' : target.type);

/** Where a target stands for a weapon's reach: in the air, on land or in water. */
function placeOf(game, target) {
  if (target.kind) return BUILDINGS[target.kind].water ? 'water' : 'land';
  if (isAir(target.type)) return 'air';
  return TERRAIN[terrainAt(game, target.x, target.y)].group;
}

/** Base damage of `attackerType`'s weapon against `target` where it stands, or 0 when the weapon cannot touch it. */
export function baseDamage(game, attackerType, target) {
  const weapon = UNITS[attackerType].weapon;
  if (!weapon) return 0;
  if (attackerType !== 'commander' && !weapon.reach.includes(placeOf(game, target))) return 0;
  return weapon.damage[tableKey(target)] ?? 0;
}

/** Cover the ground gives `target`: stars as a positive number, skulls as a negative one. */
function coverOf(game, target) {
  if (target.kind || isAir(target.type)) return 0;
  return TERRAIN[terrainAt(game, target.x, target.y)].defence;
}

/** How much of a blow `target` takes: half for a stronghold, less under a guard. */
function intakeOf(target) {
  if (target.kind) return BUILDINGS[target.kind].taken;
  return 1 - (target.guard ?? 0);
}

/**
 * The damage of one strike. `base` from the tables, `attackerHp` 0–100 (a building's garrison and a rally art strike
 * at 100), `target` with its place and health, `crit` the multiplier (1 when not critical), `roll` in [0, 1].
 */
export function solveDamage(game, base, attackerHp, target, crit, roll) {
  const narrow = 1 / Math.max(1, crit);
  const bonus = RANDOM_SPREAD * (roll * narrow + (1 - narrow) / 2);
  const cover = coverOf(game, target);
  const terrain = cover >= 0 ? 1 - (target.hp / 100) * cover * 0.1 : 1 - cover * 0.1;
  const damage = (attackerHp / 100) * (base + bonus) * terrain * intakeOf(target) * crit;
  const whole = Math.floor(100 * damage + 0.5);
  return damage > 0.001 && whole < 1 ? 1 : whole;
}

// The critical rules, by name (src/sim/units.mjs). Each sees the attacker where it strikes from (ax, ay).
const neighbours = (game, x, y) => DIRS.map(([dx, dy]) => unitAt(game, x + dx, y + dy)).filter(Boolean);
export const CRITICAL = {
  nearCommander: (g, a, d, s) => neighbours(g, s.ax, s.ay).some((u) => u.owner === a.owner && u.type === 'commander'),
  packHunt: (g, a, d) => neighbours(g, d.x, d.y).some((u) => u !== a && u.owner === a.owner && u.type === 'hound'),
  shieldWall: (g, a, d, s) => neighbours(g, s.ax, s.ay).some((u) => u !== a && u.owner === a.owner && u.type === 'pikeman'),
  standing: (g, a, d, s) => !s.counter && !s.moved,
  highGround: (g, a, d, s) => TERRAIN[terrainAt(g, s.ax, s.ay)].defence >= 3,
  fullCharge: (g, a, d, s) => distance(s.ax, s.ay, a.sx, a.sy) === 6,
  pointBlank: (g, a, d, s) => distance(s.ax, s.ay, d.x, d.y) === 2,
  longShot: (g, a, d, s) => distance(s.ax, s.ay, d.x, d.y) >= 5,
  lastStand: (g, a) => a.hp <= 40,
  aerie: (g, a, d, s) => terrainAt(g, s.ax, s.ay) === 'mountain',
  loneFlier: (g, a, d) => !d.kind && !neighbours(g, d.x, d.y).some((u) => u !== d && u.owner === d.owner && u.type === 'witch'),
  onRoad: (g, a, d) => !d.kind && terrainAt(g, d.x, d.y) === 'road',
  deepWater: (g, a, d, s) => terrainAt(g, s.ax, s.ay) === 'ocean',
  reefAmbush: (g, a, d, s) => terrainAt(g, s.ax, s.ay) === 'reef',
  shoreline: (g, a, d, s) => terrainAt(g, s.ax, s.ay) === 'beach',
  inWater: (g, a, d, s) => ['river', 'sea', 'ocean', 'reef'].includes(terrainAt(g, s.ax, s.ay))
};

/** The critical multiplier of `attacker` striking `target` from (ax, ay); 1 when not critical. */
export function criticalOf(game, attacker, target, situation) {
  const crit = UNITS[attacker.type].crit;
  if (!crit) return 1;
  return CRITICAL[crit.rule](game, attacker, target, situation) ? crit.power : 1;
}

/** Whether `attacker` standing at (ax, ay) can strike `target`, having moved or not. */
export function canStrike(game, attacker, ax, ay, target, moved) {
  const weapon = UNITS[attacker.type].weapon;
  if (!weapon || (moved && !weapon.mobile)) return false;
  if (target.owner === attacker.owner || target.owner < 0) return false;
  const d = distance(ax, ay, target.x, target.y);
  if (d < weapon.min || d > weapon.max) return false;
  return baseDamage(game, attacker.type, target) > 0;
}

/** Whether `defender` hits back at `attacker` standing at (ax, ay). Siege engines never do; buildings at one tile. */
function canCounter(game, defender, attacker, ax, ay) {
  if (defender.kind) return defender.owner >= 0 && distance(ax, ay, defender.x, defender.y) === 1 && (GARRISON[attacker.type] ?? 0) > 0;
  const weapon = UNITS[defender.type].weapon;
  if (!weapon || !weapon.mobile) return false;
  const d = distance(ax, ay, defender.x, defender.y);
  if (d < weapon.min || d > weapon.max) return false;
  return baseDamage(game, defender.type, { ...attacker, x: ax, y: ay }) > 0;
}

/** Everything `unit` could strike standing at (x, y), having moved there or not. */
export function targetsFrom(game, unit, x, y, moved) {
  const out = [];
  for (const u of game.units) if (u !== unit && canStrike(game, unit, x, y, u, moved)) out.push(u);
  for (const b of game.buildings) if (canStrike(game, unit, x, y, b, moved)) out.push(b);
  return out;
}

/**
 * What an attack would do, before it is made: the attacker's damage range and whether it is critical, and the
 * counter's range (null when there is none). Shown in the forecast panel and used by the computer.
 */
export function forecast(game, unit, ax, ay, target, moved) {
  const situation = { ax, ay, moved, counter: false };
  const crit = criticalOf(game, unit, target, situation);
  const base = baseDamage(game, unit.type, target);
  const min = solveDamage(game, base, unit.hp, target, crit, 0);
  const max = solveDamage(game, base, unit.hp, target, crit, 1);
  const out = { min, max, critical: crit > 1, counter: null, counterCritical: false };
  const moved_ = { ...unit, x: ax, y: ay };
  if (!canCounter(game, target, moved_, ax, ay)) return out;
  const reply = (hpLeft, roll) => {
    if (hpLeft <= 0) return 0;
    const hurt = { ...target, hp: hpLeft };
    if (target.kind) return solveDamage(game, GARRISON[tableKey(moved_)] ?? 0, 100, moved_, 1, roll);
    const c = criticalOf(game, hurt, moved_, { ax: target.x, ay: target.y, moved: false, counter: true });
    return solveDamage(game, baseDamage(game, target.type, moved_), hpLeft, moved_, c, roll);
  };
  const best = reply(target.hp - min, 1),
    worst = reply(target.hp - max, 0);
  if (best > 0 || target.hp - max > 0) out.counter = { min: worst, max: best };
  if (!target.kind) out.counterCritical = criticalOf(game, { ...target, hp: Math.max(1, target.hp - min) }, moved_, { ax: target.x, ay: target.y, moved: false, counter: true }) > 1;
  return out;
}

// ---- actions -------------------------------------------------------------------------------------------------

/** The meter a side's commander needs before its art can be used. */
export const meterOf = (game, owner) => COMMANDERS[game.players[owner].commander].meter;
export const artReady = (game, owner) => game.players[owner].meter >= meterOf(game, owner);

function charge(game, unit, how) {
  if (unit.type !== 'commander') return;
  const p = game.players[unit.owner];
  const c = COMMANDERS[p.commander];
  p.meter = Math.min(c.meter, p.meter + (c.charge[how] ?? 0));
}

/**
 * Carry out one order for the side to move. Returns the events the view plays, in order. An order that the rules do
 * not allow throws, so the interface and the computer can only offer what is legal.
 *   { kind: 'move', unit, to: {x, y}, then: { kind: 'wait' | 'attack' | 'capture' | 'reinforce' | 'heal' | 'hex' |
 *     'load' | 'unload' | 'art', ...} }
 *   { kind: 'recruit', building, type, at: {x, y} }
 *   { kind: 'end' }
 */
export function act(game, order) {
  if (game.over) throw new Error('the battle is over');
  const events = [];
  if (order.kind === 'end') endTurn(game, events);
  else if (order.kind === 'recruit') recruit(game, order, events);
  else if (order.kind === 'move') move(game, order, events);
  else throw new Error('unknown order ' + order.kind);
  settle(game, events);
  return events;
}

function recruit(game, order, events) {
  const b = buildingById(game, order.building);
  const ok = recruitSpots(game, b, order.type);
  if (!ok.some((s) => s.x === order.at.x && s.y === order.at.y)) throw new Error('cannot recruit there');
  const p = game.players[game.current];
  p.gold -= UNITS[order.type].cost;
  b.recruited = true;
  const unit = spawn(game, order.type, game.current, order.at.x, order.at.y);
  unit.done = true;
  game.stats[game.current].recruited++;
  events.push({ type: 'recruit', building: b.id, unit: unit.id, unitType: order.type, x: unit.x, y: unit.y, gold: p.gold });
}

/** Where `building` can put a new unit of `type` this turn (empty if it may not recruit it now). */
export function recruitSpots(game, b, type) {
  if (!b || b.owner !== game.current || b.recruited) return [];
  const takes = BUILDINGS[b.kind].takes ?? [];
  const u = UNITS[type];
  if (!u || type === 'commander' || !u.tags.some((tag) => takes.includes(tag))) return [];
  if (game.players[game.current].gold < u.cost) return [];
  const out = [];
  for (const [dx, dy] of DIRS) {
    const x = b.x + dx,
      y = b.y + dy;
    if (!inside(game, x, y) || unitAt(game, x, y) || buildingAt(game, x, y)) continue;
    const t = terrainAt(game, x, y);
    if (stepCost(t, u.move) === Infinity || TERRAIN[t].noStop?.includes(u.move)) continue;
    out.push({ x, y });
  }
  return out;
}

function move(game, order, events) {
  const unit = unitById(game, order.unit);
  if (!unit || unit.owner !== game.current || unit.done) throw new Error('that unit cannot move');
  const reached = reach(game, unit);
  const to = order.to ?? { x: unit.x, y: unit.y };
  const node = reached.get(key(to.x, to.y));
  if (!node || !canStop(game, unit, to.x, to.y)) throw new Error('cannot stop there');
  const then = order.then ?? { kind: 'wait' };
  const moved = to.x !== unit.x || to.y !== unit.y;
  const carrier = moved ? unitAt(game, to.x, to.y) : null;
  if (carrier && then.kind !== 'load') throw new Error('a carrier is there');
  const plan = check(game, unit, to, moved, then);
  const path = pathTo(reached, to.x, to.y);
  if (path.length) events.push({ type: 'move', unit: unit.id, path, from: { x: unit.x, y: unit.y } });
  unit.x = to.x;
  unit.y = to.y;
  unit.done = true;
  plan(events);
}

/** Checks `then` for `unit` ending at `to` and returns the function that carries it out. */
function check(game, unit, to, moved, then) {
  const u = UNITS[unit.type];
  const p = game.players[unit.owner];
  switch (then.kind) {
    case 'wait':
      return () => {};
    case 'attack': {
      const target = then.target.building ? buildingById(game, then.target.building) : unitById(game, then.target.unit);
      if (!target || !canStrike(game, unit, to.x, to.y, target, moved)) throw new Error('cannot attack that');
      return (events) => fight(game, unit, target, moved, events);
    }
    case 'capture': {
      const b = buildingById(game, then.building);
      if (!u.capture || !b || b.owner !== -1 || !BUILDINGS[b.kind].capturable || distance(to.x, to.y, b.x, b.y) !== 1) throw new Error('cannot capture that');
      return (events) => {
        b.owner = unit.owner;
        b.hp = Math.max(1, Math.floor(unit.hp / 2));
        b.recruited = true;
        game.stats[unit.owner].captured++;
        events.push({ type: 'capture', unit: unit.id, building: b.id, owner: unit.owner, hp: b.hp });
      };
    }
    case 'reinforce': {
      const plan = reinforcePlan(game, unit, to.x, to.y);
      if (!plan) throw new Error('cannot reinforce here');
      return (events) => {
        for (const [id, give] of plan.from) buildingById(game, id).hp -= give;
        unit.hp += plan.heal;
        p.gold -= plan.cost;
        events.push({ type: 'reinforce', unit: unit.id, heal: plan.heal, cost: plan.cost, from: plan.from.map(([id]) => id), gold: p.gold });
      };
    }
    case 'heal': {
      const spell = u.heal;
      if (!spell || p.gold < spell.price || distance(to.x, to.y, then.at.x, then.at.y) > spell.reach) throw new Error('cannot heal there');
      return (events) => {
        p.gold -= spell.price;
        const healed = [];
        for (const v of game.units)
          if (v.owner === unit.owner && distance(v.x, v.y, then.at.x, then.at.y) <= spell.radius && v.hp < 100) {
            const add = Math.min(spell.amount, 100 - v.hp);
            v.hp += add;
            healed.push({ unit: v.id, add });
          }
        events.push({ type: 'heal', unit: unit.id, at: then.at, healed, gold: p.gold });
      };
    }
    case 'hex': {
      const spell = u.hex;
      if (!spell || p.gold < spell.price) throw new Error('cannot hex');
      return (events) => {
        p.gold -= spell.price;
        const hit = [];
        for (const v of game.units)
          if (v.owner !== unit.owner && distance(v.x, v.y, to.x, to.y) <= spell.radius) {
            const lose = Math.min(spell.amount, v.hp);
            v.hp -= lose;
            game.stats[unit.owner].damage += lose;
            hit.push({ unit: v.id, lose });
          }
        events.push({ type: 'hex', unit: unit.id, hit, gold: p.gold });
      };
    }
    case 'load': {
      const carrier = unitAt(game, to.x, to.y);
      if (!moved || !carrier || !canBoard(unit, carrier)) throw new Error('cannot board');
      return (events) => {
        game.units.splice(game.units.indexOf(unit), 1);
        carrier.cargo.push(unit);
        events.push({ type: 'load', unit: unit.id, carrier: carrier.id });
      };
    }
    case 'unload': {
      const drops = then.drops ?? [];
      const taken = new Set();
      if (!drops.length) throw new Error('nothing to unload');
      for (const d of drops) {
        const cargo = unit.cargo.find((c) => c.id === d.unit);
        if (!cargo || taken.has(`${d.x},${d.y}`) || !unloadSpots(game, unit, to.x, to.y, cargo).some((s) => s.x === d.x && s.y === d.y)) throw new Error('cannot unload there');
        taken.add(`${d.x},${d.y}`);
      }
      return (events) => {
        for (const d of drops) {
          const cargo = unit.cargo.find((c) => c.id === d.unit);
          unit.cargo.splice(unit.cargo.indexOf(cargo), 1);
          Object.assign(cargo, { x: d.x, y: d.y, sx: d.x, sy: d.y, done: true });
          game.units.push(cargo);
          events.push({ type: 'unload', unit: cargo.id, carrier: unit.id, x: d.x, y: d.y });
        }
      };
    }
    case 'art': {
      if (unit.type !== 'commander' || !artReady(game, unit.owner)) throw new Error('the art is not ready');
      const art = COMMANDERS[p.commander].art;
      if (art.kind === 'line' && !DIRS.some(([dx, dy]) => dx === then.dir?.[0] && dy === then.dir?.[1])) throw new Error('pick a direction');
      if (art.kind === 'blast' && distance(to.x, to.y, then.at?.x, then.at?.y) > art.reach) throw new Error('too far');
      return (events) => useArt(game, unit, art, then, events);
    }
    default:
      throw new Error('unknown action ' + then.kind);
  }
}

/** Where a carrier standing at (x, y) can set `cargo` down. */
export function unloadSpots(game, carrier, x, y, cargo) {
  const out = [];
  for (const [dx, dy] of DIRS) {
    const tx = x + dx,
      ty = y + dy;
    if (!inside(game, tx, ty) || buildingAt(game, tx, ty)) continue;
    const there = unitAt(game, tx, ty);
    if (there && there !== carrier) continue;
    const t = terrainAt(game, tx, ty);
    if (stepCost(t, UNITS[cargo.type].move) === Infinity || TERRAIN[t].noStop?.includes(UNITS[cargo.type].move)) continue;
    out.push({ x: tx, y: ty });
  }
  return out;
}

/**
 * What reinforcing at (x, y) would do for `unit`: the health it gets back, the gold it costs (the unit's price times
 * the share of health), and how much each neighbouring friendly building gives (each keeps at least 1). Null when
 * nothing can be done.
 */
export function reinforcePlan(game, unit, x, y) {
  if (unit.hp >= 100) return null;
  const price = UNITS[unit.type].cost;
  const p = game.players[unit.owner];
  const near = game.buildings.filter((b) => b.owner === unit.owner && BUILDINGS[b.kind].reinforces && distance(x, y, b.x, b.y) === 1 && b.hp > 1);
  if (!near.length) return null;
  const available = near.reduce((s, b) => s + b.hp - 1, 0);
  const affordable = Math.floor((p.gold * 100) / price);
  const heal = Math.min(100 - unit.hp, available, affordable);
  if (heal <= 0) return null;
  // Spread the cost over the buildings as evenly as each can bear.
  const from = near.map((b) => [b.id, 0]);
  let left = heal;
  while (left > 0) {
    const open = from.filter(([id, g]) => buildingById(game, id).hp - 1 - g > 0);
    const share = Math.max(1, Math.floor(left / open.length + 0.5));
    for (const entry of open) {
      if (left <= 0) break;
      const room = buildingById(game, entry[0]).hp - 1 - entry[1];
      const give = Math.min(share, room, left);
      entry[1] += give;
      left -= give;
    }
  }
  return { heal, cost: Math.ceil((heal * price) / 100), from: from.filter(([, g]) => g > 0) };
}

/** One attack and its counter. */
function fight(game, attacker, target, moved, events) {
  const situation = { ax: attacker.x, ay: attacker.y, moved, counter: false };
  const crit = criticalOf(game, attacker, target, situation);
  const dealt = solveDamage(game, baseDamage(game, attacker.type, target), attacker.hp, target, crit, random(game));
  const before = target.hp;
  target.hp = Math.max(0, target.hp - dealt);
  game.stats[attacker.owner].damage += before - target.hp;
  const killed = target.hp <= 0;
  events.push({ type: 'strike', from: attacker.id, to: target.id, building: !!target.kind, damage: before - target.hp, critical: crit > 1, counter: false, killed, hp: target.hp });
  charge(game, attacker, killed ? 'kill' : 'attack');
  if (killed) return;
  if (!canCounter(game, target, attacker, attacker.x, attacker.y)) return;
  let reply;
  let rcrit = 1;
  if (target.kind) reply = solveDamage(game, GARRISON[tableKey(attacker)] ?? 0, 100, attacker, 1, random(game));
  else {
    rcrit = criticalOf(game, target, attacker, { ax: target.x, ay: target.y, moved: false, counter: true });
    reply = solveDamage(game, baseDamage(game, target.type, attacker), target.hp, attacker, rcrit, random(game));
  }
  const had = attacker.hp;
  attacker.hp = Math.max(0, attacker.hp - reply);
  if (target.owner >= 0) game.stats[target.owner].damage += had - attacker.hp;
  events.push({ type: 'strike', from: target.id, to: attacker.id, building: false, fromBuilding: !!target.kind, damage: had - attacker.hp, critical: rcrit > 1, counter: true, killed: attacker.hp <= 0, hp: attacker.hp });
  if (!target.kind) charge(game, target, 'counter');
}

function useArt(game, unit, art, then, events) {
  const p = game.players[unit.owner];
  p.meter = 0;
  const hits = [];
  const foes = (x, y, radius) => [
    ...game.units.filter((u) => u.owner !== unit.owner && distance(u.x, u.y, x, y) <= radius),
    ...game.buildings.filter((b) => b.owner >= 0 && b.owner !== unit.owner && distance(b.x, b.y, x, y) <= radius)
  ];
  const lose = (target, amount, keep) => {
    const before = target.hp;
    target.hp = Math.max(keep ? Math.min(1, before) : 0, before - amount);
    game.stats[unit.owner].damage += before - target.hp;
    hits.push({ id: target.id, building: !!target.kind, damage: before - target.hp, hp: target.hp, killed: target.hp <= 0 });
    return before - target.hp;
  };
  if (art.kind === 'line') {
    const [dx, dy] = then.dir;
    for (let i = 1; i <= art.length; i++) {
      const x = unit.x + dx * i,
        y = unit.y + dy * i;
      if (!inside(game, x, y)) break;
      for (const target of foes(x, y, 0)) {
        const base = UNITS.commander.weapon.damage[tableKey(target)] ?? 0;
        lose(target, solveDamage(game, base * art.power, 100, target, 1, random(game)), false);
      }
    }
  } else if (art.kind === 'blast') {
    for (const target of foes(then.at.x, then.at.y, art.radius)) lose(target, art.amount, target.kind || target.type === 'commander');
  } else if (art.amount) {
    let drained = 0;
    for (const target of foes(unit.x, unit.y, art.radius).filter((t) => !t.kind)) drained += lose(target, art.amount, true);
    if (art.drain) {
      const add = Math.min(100 - unit.hp, Math.round(drained * art.drain));
      unit.hp += add;
      hits.push({ id: unit.id, heal: add, hp: unit.hp });
    }
  } else {
    for (const v of game.units)
      if (v.owner === unit.owner && distance(v.x, v.y, unit.x, unit.y) <= art.radius) {
        const add = Math.min(art.heal, 100 - v.hp);
        v.hp += add;
        v.guard = art.guard;
        hits.push({ id: v.id, heal: add, hp: v.hp, guard: art.guard });
      }
  }
  events.push({ type: 'art', unit: unit.id, commander: p.commander, art: art.kind, dir: then.dir ?? null, at: then.at ?? null, hits });
}

/** Removes the fallen and buildings knocked to nothing, then sees whether anyone has lost. */
function settle(game, events) {
  for (const u of [...game.units])
    if (u.hp <= 0) {
      game.units.splice(game.units.indexOf(u), 1);
      game.stats[u.owner].lost += 1 + u.cargo.length;
      const killer = events.findLast((e) => (e.type === 'strike' && e.to === u.id) || e.type === 'art' || e.type === 'hex');
      const by = killer?.type === 'strike' ? (unitById(game, killer.from) ?? buildingById(game, killer.from)) : killer ? unitById(game, killer.unit) : null;
      if (by && by.owner >= 0) game.stats[by.owner].kills++;
      events.push({ type: 'fall', unit: u.id, unitType: u.type, owner: u.owner, x: u.x, y: u.y, cargo: u.cargo.map((c) => c.id) });
      if (u.type === 'commander') eliminate(game, u.owner, 'commander', events);
    }
  for (const b of game.buildings)
    if (b.hp <= 0 && b.owner >= 0) {
      const owner = b.owner;
      if (b.kind === 'hq') {
        b.owner = -2;
        events.push({ type: 'razed', building: b.id, owner });
        eliminate(game, owner, 'stronghold', events);
      } else {
        b.owner = -1;
        b.hp = 100;
        events.push({ type: 'neutral', building: b.id, owner });
      }
    }
}

function eliminate(game, owner, why, events) {
  const p = game.players[owner];
  if (!p.alive) return;
  p.alive = false;
  events.push({ type: 'defeat', owner, why });
  // A beaten side's army leaves the field and its buildings stand empty.
  for (const u of game.units.filter((u) => u.owner === owner)) game.units.splice(game.units.indexOf(u), 1);
  for (const b of game.buildings) if (b.owner === owner) b.owner = -1;
  const left = game.players.filter((q) => q.alive);
  if (left.length === 1) {
    game.over = true;
    game.winner = left[0].index;
    events.push({ type: 'victory', owner: game.winner });
  }
}

function endTurn(game, events) {
  const me = game.players[game.current];
  const c = COMMANDERS[me.commander];
  me.meter = Math.min(c.meter, me.meter + c.charge.turn);
  events.push({ type: 'endTurn', owner: game.current });
  let next = game.current;
  do {
    next = (next + 1) % game.players.length;
    if (next === 0) game.turn++;
  } while (!game.players[next].alive);
  game.current = next;
  startTurn(game, events);
}

/** The start of the current side's turn: income, its units ready, its commander and buildings mend, guards end. */
function startTurn(game, events = game.events) {
  const owner = game.current;
  const p = game.players[owner];
  const income = incomeOf(game, owner);
  p.gold += income;
  for (const u of game.units)
    if (u.owner === owner) {
      u.done = false;
      u.sx = u.x;
      u.sy = u.y;
      u.guard = 0;
      const regen = UNITS[u.type].regen ?? 0;
      if (regen) u.hp = Math.min(100, u.hp + regen);
      for (const c of u.cargo) c.guard = 0;
    }
  for (const b of game.buildings)
    if (b.owner === owner) {
      b.recruited = false;
      b.hp = Math.min(100, b.hp + BUILDING_REGEN);
    }
  events.push({ type: 'startTurn', owner, turn: game.turn, income, gold: p.gold });
}

// ---- what a unit may do after moving ---------------------------------------------------------------------------

/**
 * The actions open to `unit` if it ends at (x, y): used by the action menu and the computer. Each is
 * { kind, ...detail }; 'wait' is always last.
 */
export function actionsAt(game, unit, x, y) {
  const u = UNITS[unit.type];
  const p = game.players[unit.owner];
  const moved = x !== unit.x || y !== unit.y;
  const there = moved ? unitAt(game, x, y) : null;
  if (there) return canBoard(unit, there) ? [{ kind: 'load', carrier: there.id }] : [];
  const out = [];
  if (unit.type === 'commander' && artReady(game, unit.owner)) out.push({ kind: 'art' });
  if (targetsFrom(game, unit, x, y, moved).length) out.push({ kind: 'attack' });
  if (u.capture)
    for (const b of game.buildings)
      if (b.owner === -1 && BUILDINGS[b.kind].capturable && distance(x, y, b.x, b.y) === 1) out.push({ kind: 'capture', building: b.id });
  if (u.heal && p.gold >= u.heal.price) out.push({ kind: 'heal' });
  if (u.hex && p.gold >= u.hex.price && game.units.some((v) => v.owner !== unit.owner && distance(v.x, v.y, x, y) <= u.hex.radius)) out.push({ kind: 'hex' });
  if (reinforcePlan(game, unit, x, y)) out.push({ kind: 'reinforce' });
  if (unit.cargo.some((c) => unloadSpots(game, unit, x, y, c).length)) out.push({ kind: 'unload' });
  out.push({ kind: 'wait' });
  return out;
}

/** A copy of the state for saving or for looking ahead; the events list is left behind. */
export function cloneGame(game) {
  const { events, ...rest } = game;
  void events;
  return JSON.parse(JSON.stringify(rest));
}
