// 电脑对手：每次只想下一步（一个单位的移动和行动，或一次招募，或结束回合），画面播完再问下一步。
// 估值：打出去的期望伤害按对方身价折算、击倒另加；挨的反击和下回合可能挨的打按自己身价扣分；占领、治疗、援军各有收益；
// 没事可做时朝最近的目标前进，并尽量站在有防御的格子上。指挥官倒下即输，所以它对指挥官格外小心。
// The computer side: it thinks one step at a time (one unit's move and action, a recruit, or the end of the turn); the
// view plays it and asks again. Its sense of worth: damage it expects to deal, priced by the target's cost, with a
// bonus for a kill; the counter and next turn's likely blows priced by its own cost; capturing, healing and
// reinforcing each worth something; with nothing to do it heads for the nearest objective, standing on cover where it
// can. Losing the commander loses the battle, so it guards its commander closely.
import { TERRAIN } from './terrain.mjs';
import { UNITS, BUILDINGS, recruitsOf, isAir } from './units.mjs';
import { COMMANDERS } from './commanders.mjs';
import {
  actionsAt,
  artReady,
  baseDamage,
  commanderOf,
  distance,
  forecast,
  reach,
  recruitSpots,
  reinforcePlan,
  stops,
  targetsFrom,
  terrainAt,
  unitById,
  unloadSpots
} from './rules.mjs';

/** What a target is worth to the computer: its price, a commander and a stronghold far more. */
function worth(target) {
  if (target.kind) return target.kind === 'hq' ? 3000 : 700;
  if (target.type === 'commander') return 2600;
  return UNITS[target.type].cost;
}

/** The levels: how far it looks at danger, how much noise is in its choices, how much it likes cover. */
export const LEVELS = {
  easy: { danger: 0.2, noise: 0.35, cover: 0.5, saving: 0 },
  normal: { danger: 0.4, noise: 0.08, cover: 1, saving: 0.1 },
  hard: { danger: 0.55, noise: 0.02, cover: 1.2, saving: 0.2 }
};

/** A computer side's memory for one turn: the danger map is worked out once and kept until the turn ends. */
export function createBrain(level = 'normal') {
  return { level: LEVELS[level] ?? LEVELS.normal, turn: -1, owner: -1, danger: null, rng: 1 };
}

function noise(brain) {
  brain.rng = (brain.rng * 16807) % 2147483647;
  return (brain.rng / 2147483647 - 0.5) * 2 * brain.level.noise;
}

/**
 * Where the other sides could strike next turn: for each tile, the foes that could reach it with a blow, with how
 * hard they are. Worked out from where each foe could stand (blocked as the board is now) and its weapon's range.
 */
function dangerMap(game, owner) {
  const map = new Map();
  for (const foe of game.units) {
    if (foe.owner === owner || !UNITS[foe.type].weapon) continue;
    const w = UNITS[foe.type].weapon;
    const from = w.mobile ? stops(game, { ...foe, done: false }).map((n) => [n.x, n.y]) : [[foe.x, foe.y]];
    const hit = new Set();
    for (const [fx, fy] of from)
      for (let dy = -w.max; dy <= w.max; dy++)
        for (let dx = -w.max; dx <= w.max; dx++) {
          const d = Math.abs(dx) + Math.abs(dy);
          if (d < w.min || d > w.max) continue;
          const x = fx + dx,
            y = fy + dy;
          if (x < 0 || y < 0 || x >= game.w || y >= game.h) continue;
          hit.add(y * 1000 + x);
        }
    for (const k of hit) {
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(foe);
    }
  }
  return map;
}

/** The health `unit` might lose standing at (x, y) next turn, by the danger map (the worst two blows). */
function exposure(game, brain, unit, x, y) {
  const foes = brain.danger.get(y * 1000 + x);
  if (!foes) return 0;
  const cover = isAir(unit.type) ? 0 : TERRAIN[terrainAt(game, x, y)].defence;
  const at = { ...unit, x, y };
  const blows = foes
    .map((foe) => baseDamage(game, foe.type, at) * (foe.hp / 100) * (cover >= 0 ? 1 - (unit.hp / 100) * cover * 0.1 : 1 - cover * 0.1) * 100)
    .sort((a, b) => b - a);
  return Math.min(unit.hp, (blows[0] ?? 0) + (blows[1] ?? 0) * 0.6 + (blows[2] ?? 0) * 0.3);
}

/** The order the computer's units act in: siege and archers first, then fighters, then the rest, commander last. */
function rank(unit) {
  const u = UNITS[unit.type];
  if (unit.type === 'commander') return 9;
  if (u.weapon && !u.weapon.mobile) return 0;
  if (u.weapon && u.weapon.max > 1) return 1;
  if (u.weapon) return 2 + (u.capture ? 1 : 0);
  return 5;
}

/** The nearest thing worth walking to: an enemy unit, an enemy or free building, its own stronghold when hurt. */
function objectiveScore(game, unit, x, y) {
  const u = UNITS[unit.type];
  let best = Infinity;
  for (const b of game.buildings) {
    if (b.owner === unit.owner) continue;
    if (b.owner === -1 && u.capture) best = Math.min(best, distance(x, y, b.x, b.y) * 0.8);
    else if (b.owner >= 0 && u.weapon) best = Math.min(best, distance(x, y, b.x, b.y) * (b.kind === 'hq' ? 0.9 : 1.3));
  }
  if (u.weapon)
    for (const foe of game.units)
      if (foe.owner !== unit.owner && baseDamage(game, unit.type, foe) > 0.25) best = Math.min(best, distance(x, y, foe.x, foe.y));
  return best === Infinity ? 0 : best;
}

/** The value of `unit` ending at (x, y) and doing `action`, with the details the order needs. */
function judge(game, brain, unit, x, y, action) {
  const level = brain.level;
  const moved = x !== unit.x || y !== unit.y;
  const own = worth(unit);
  const cover = isAir(unit.type) ? 0 : TERRAIN[terrainAt(game, x, y)].defence;
  let best = null;
  const offer = (score, then) => {
    if (!best || score > best.score) best = { score, then };
  };
  // What standing here afterwards costs: blows next turn, less for good cover.
  const after = (hpLeft) => {
    if (hpLeft <= 0) return 0;
    const lost = Math.min(hpLeft, exposure(game, brain, { ...unit, hp: hpLeft }, x, y));
    return (lost / 100) * own * level.danger * (unit.type === 'commander' ? 2.2 : 1) - cover * 6 * level.cover;
  };
  switch (action.kind) {
    case 'attack':
      for (const target of targetsFrom(game, unit, x, y, moved)) {
        const f = forecast(game, unit, x, y, target, moved);
        const mean = (f.min + f.max) / 2;
        const kills = f.min >= target.hp;
        const dealt = (Math.min(mean, target.hp) / 100) * worth(target) + (kills ? worth(target) * 0.5 : 0);
        const back = f.counter ? (f.counter.min + f.counter.max) / 2 : 0;
        const taken = (Math.min(back, unit.hp) / 100) * own * (unit.type === 'commander' ? 2 : 1);
        offer(dealt - taken - after(unit.hp - back) + 25, { kind: 'attack', target: target.kind ? { building: target.id } : { unit: target.id } });
      }
      break;
    case 'capture': {
      const b = game.buildings.find((v) => v.id === action.building);
      offer(BUILDINGS[b.kind].income ? 420 : 480 - after(unit.hp) * 0.8, { kind: 'capture', building: b.id });
      break;
    }
    case 'heal': {
      const spell = UNITS[unit.type].heal;
      let bestAt = null;
      for (let dy = -spell.reach; dy <= spell.reach; dy++)
        for (let dx = -spell.reach; dx <= spell.reach; dx++) {
          if (Math.abs(dx) + Math.abs(dy) > spell.reach) continue;
          const at = { x: x + dx, y: y + dy };
          let gain = 0;
          for (const v of game.units)
            if (v.owner === unit.owner && distance(v.x, v.y, at.x, at.y) <= spell.radius && v.id !== unit.id)
              gain += (Math.min(spell.amount, 100 - v.hp) / 100) * worth(v);
          if (!bestAt || gain > bestAt.gain) bestAt = { gain, at };
        }
      if (bestAt && bestAt.gain > spell.price * 0.9) offer(bestAt.gain - spell.price * 0.6 - after(unit.hp), { kind: 'heal', at: bestAt.at });
      break;
    }
    case 'hex': {
      const spell = UNITS[unit.type].hex;
      let gain = 0;
      for (const v of game.units) if (v.owner !== unit.owner && distance(v.x, v.y, x, y) <= spell.radius) gain += (Math.min(spell.amount, v.hp) / 100) * worth(v);
      if (gain > spell.price * 0.8) offer(gain - spell.price * 0.6 - after(unit.hp), { kind: 'hex' });
      break;
    }
    case 'reinforce': {
      const plan = reinforcePlan(game, unit, x, y);
      if (plan) offer((plan.heal / 100) * own * 0.9 - plan.cost * 0.5 - after(unit.hp + plan.heal) * 0.7, { kind: 'reinforce' });
      break;
    }
    case 'art': {
      const art = COMMANDERS[game.players[unit.owner].commander].art;
      const plan = planArt(game, unit, x, y, art);
      if (plan) offer(plan.score - after(unit.hp), plan.then);
      break;
    }
    case 'unload': {
      const drops = [];
      const taken = new Set();
      for (const c of unit.cargo) {
        const spot = unloadSpots(game, unit, x, y, c).find((s) => !taken.has(`${s.x},${s.y}`));
        if (spot) {
          taken.add(`${spot.x},${spot.y}`);
          drops.push({ unit: c.id, x: spot.x, y: spot.y });
        }
      }
      if (drops.length) offer(60 - objectiveScore(game, unit.cargo[0], x, y) * 8, { kind: 'unload', drops });
      break;
    }
    case 'wait': {
      const goal = objectiveScore(game, unit, x, y);
      const home = unit.type === 'commander' ? commanderLeash(game, unit, x, y) : 0;
      offer(-goal * 14 - after(unit.hp) - home + (moved ? 0 : -2), { kind: 'wait' });
      break;
    }
    default:
      break;
  }
  return best;
}

/** A commander keeps within reach of its own stronghold early on and of its army after. */
function commanderLeash(game, unit, x, y) {
  const hq = game.buildings.find((b) => b.kind === 'hq' && b.owner === unit.owner);
  const friends = game.units.filter((u) => u.owner === unit.owner && u !== unit);
  const nearFriends = friends.filter((u) => distance(u.x, u.y, x, y) <= 2).length;
  return (hq ? Math.max(0, distance(x, y, hq.x, hq.y) - 6) * 12 : 0) - nearFriends * 10;
}

/** The best way to use the commander's art from (x, y), or null when it would do little. */
function planArt(game, unit, x, y, art) {
  const foes = (cx, cy, r) => game.units.filter((u) => u.owner !== unit.owner && distance(u.x, u.y, cx, cy) <= r);
  if (art.kind === 'line') {
    let best = null;
    for (const dir of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ]) {
      let score = 0;
      for (let i = 1; i <= art.length; i++)
        for (const u of foes(x + dir[0] * i, y + dir[1] * i, 0)) score += (Math.min(100, (UNITS.commander.weapon.damage[u.type] ?? 0) * 105) / 100) * worth(u);
      if (!best || score > best.score) best = { score, then: { kind: 'art', dir } };
    }
    return best && best.score > 500 ? best : null;
  }
  if (art.kind === 'blast') {
    let best = null;
    for (let dy = -art.reach; dy <= art.reach; dy++)
      for (let dx = -art.reach; dx <= art.reach; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > art.reach) continue;
        const at = { x: x + dx, y: y + dy };
        const score = foes(at.x, at.y, art.radius).reduce((s, u) => s + (Math.min(art.amount, u.hp - (u.type === 'commander' ? 1 : 0)) / 100) * worth(u), 0);
        if (!best || score > best.score) best = { score, then: { kind: 'art', at } };
      }
    return best && best.score > 450 ? best : null;
  }
  if (art.amount) {
    const score = foes(x, y, art.radius).reduce((s, u) => s + (Math.min(art.amount, u.hp - 1) / 100) * worth(u), 0) * 1.3;
    return score > 450 ? { score, then: { kind: 'art' } } : null;
  }
  const friends = game.units.filter((u) => u.owner === unit.owner && distance(u.x, u.y, x, y) <= art.radius);
  const score = friends.reduce((s, u) => s + (Math.min(art.heal, 100 - u.hp) / 100) * worth(u) + worth(u) * 0.12, 0);
  return friends.length >= 3 && score > 500 ? { score, then: { kind: 'art' } } : null;
}

/** The computer's next order for the side to move. */
export function nextOrder(game, brain) {
  const owner = game.current;
  if (brain.turn !== game.turn || brain.owner !== owner) {
    brain.turn = game.turn;
    brain.owner = owner;
    brain.danger = dangerMap(game, owner);
    brain.rng = (game.rng % 2147483646) + 1;
    brain.recruited = false;
  }
  const ready = game.units.filter((u) => u.owner === owner && !u.done).sort((a, b) => rank(a) - rank(b));
  for (const unit of ready) {
    let best = null;
    for (const spot of stops(game, unit, reach(game, unit))) {
      for (const action of actionsAt(game, unit, spot.x, spot.y)) {
        let choice;
        if (action.kind === 'load') choice = { score: -1e6, then: { kind: 'load' } };
        else choice = judge(game, brain, unit, spot.x, spot.y, action);
        if (!choice) continue;
        const score = choice.score * (1 + noise(brain));
        if (!best || score > best.score) best = { score, to: { x: spot.x, y: spot.y }, then: choice.then };
      }
    }
    if (best) return { kind: 'move', unit: unit.id, to: best.to, then: best.then };
    // Nowhere legal to stop (hemmed in on a carrier's tile): it stays.
    return { kind: 'move', unit: unit.id, to: { x: unit.x, y: unit.y }, then: { kind: 'wait' } };
  }
  const recruit = pickRecruit(game, brain);
  if (recruit) return recruit;
  return { kind: 'end' };
}

/** What to train and where, or null. Spends on what beats the enemy army best for the price, keeping some back. */
function pickRecruit(game, brain) {
  const owner = game.current;
  const p = game.players[owner];
  const foes = game.units.filter((u) => u.owner !== owner);
  const mine = game.units.filter((u) => u.owner === owner);
  const freeBuildings = game.buildings.filter((b) => b.owner === -1 && BUILDINGS[b.kind].capturable).length;
  const capturers = mine.filter((u) => UNITS[u.type].capture && u.type !== 'commander').length;
  let best = null;
  for (const b of game.buildings) {
    if (b.owner !== owner || b.recruited || !BUILDINGS[b.kind].takes) continue;
    for (const type of recruitsOf(b.kind)) {
      const spots = recruitSpots(game, b, type);
      if (!spots.length) continue;
      const u = UNITS[type];
      if (p.gold - u.cost < 0) continue;
      if (u.carry) continue;
      let value = 0;
      for (const foe of foes) {
        const probe = { type, owner, x: foe.x, y: foe.y, hp: 100 };
        value += baseDamage(game, type, foe) * worth(foe) * 0.6;
        value -= baseDamage(game, foe.type, probe) * u.cost * 0.5;
      }
      value = value / Math.max(1, foes.length) + u.cost * 0.35;
      // A mixed army: each unit of the same kind already in the field makes another less wanted.
      value -= mine.filter((m) => m.type === type).length * 70;
      if (u.capture && freeBuildings > capturers) value += 260;
      if (type === 'hound' && mine.filter((m) => m.type === 'hound').length === 1) value += 60;
      value *= 1 + noise(brain);
      // Keep a little gold for the next turn's better units unless the purse is large.
      const after = p.gold - u.cost;
      if (after < 0) continue;
      const score = value - (after < p.gold * brain.level.saving ? 120 : 0);
      if (!best || score > best.score) {
        const front = nearestFoe(game, spots, owner);
        best = { score, order: { kind: 'recruit', building: b.id, type, at: front } };
      }
    }
  }
  return best && best.score > 40 ? best.order : null;
}

function nearestFoe(game, spots, owner) {
  const foes = game.units.filter((u) => u.owner !== owner);
  return spots.slice().sort((a, b) => {
    const da = Math.min(...foes.map((f) => distance(a.x, a.y, f.x, f.y)), 99);
    const db = Math.min(...foes.map((f) => distance(b.x, b.y, f.x, f.y)), 99);
    return da - db;
  })[0];
}

/** Plays a whole battle between two computer sides (for checks and the balance tool). */
export function autoPlay(game, act, levels = ['normal', 'normal'], limit = 60) {
  const brains = levels.map((l) => createBrain(l));
  let guard = 0;
  while (!game.over && game.turn <= limit && guard++ < 20000) act(game, nextOrder(game, brains[game.current]));
  return game;
}

export { unitById, commanderOf, artReady };
