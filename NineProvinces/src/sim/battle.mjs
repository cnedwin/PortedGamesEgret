// 六角格战场（即时，可暂停）：按地点的地形生成战场（攻城战有城墙、城门和城内，水战是江面），双方各自布阵；部队按
// 兵种速度在格子间移动，接敌就打——枪克骑、骑克弓、弓克戟、戟克枪，阵型、地形、高低、侧击、士气和训练都算进去；
// 怒气满了放战法（伤害、混乱、恐惧、定身、点火、增益、治疗）；火顺风蔓延；士气耗尽就溃逃。攻方全灭敌军或攻占城中
// 本营即胜，守方撑到日落或击退攻方即胜。电脑替双方指挥；玩家只给自己的部队下令。同一种子同一结果。
// The hex battlefield (real time, with pause): the field is made from the ground of the place (a siege has walls, a gate
// and the town inside; a river battle is open water), each side deploys, and units move between hexes at the pace of
// their kind and fight when they meet — spears beat horse, horse beats bows, bows beat halberds, halberds beat spears,
// with formation, ground, height, flanks, morale and training all counted; at full rage a general unleashes a tactic
// (damage, confusion, fear, stuns, fire, strengthening, healing); fire spreads with the wind; a unit whose morale is gone
// flees. The attackers win by breaking every enemy or holding the keep of a town; the defenders by lasting till sunset
// or driving them off. The computer commands both sides; the player orders only his own. One seed, one outcome.
import { COUNTER, HORSE_BOW_COUNTER, FORMATIONS, TERRAIN, UNITS, formationAllowed, defaultFormation } from '../data/battle.mjs';
import { GENERALS } from '../data/generals.mjs';
import { TACTICS } from '../data/tactics.mjs';
import { generalEffect, stat, techEffect } from './core.mjs';
import { HEX_W, hexCenter } from './hexgrid.mjs';
import { FOOTPRINTS, footprintCell, hexKind } from './land.mjs';
import { aptitudeFactor, mobility } from './aptitude.mjs';

export const FIELD = { cols: 22, rows: 14 };
/** Seconds of battle time before the sun sets (the defenders then win). */
export const LIMIT = 300;

// ——— Hexes (odd rows pushed right) ———
export const idx = (c, r) => r * FIELD.cols + c;
export const colOf = (i) => i % FIELD.cols;
export const rowOf = (i) => Math.floor(i / FIELD.cols);
function cube(i) {
  const c = colOf(i),
    r = rowOf(i);
  const x = c - (r - (r & 1)) / 2;
  return [x, r, -x - r];
}
// Every distance on the field, worked out once: the battle asks for them many thousands of times a second.
const HEXES = FIELD.cols * FIELD.rows;
const DISTANCE = new Uint8Array(HEXES * HEXES);
for (let a = 0; a < HEXES; a++) {
  const [x1, y1, z1] = cube(a);
  for (let b = 0; b < HEXES; b++) {
    const [x2, y2, z2] = cube(b);
    DISTANCE[a * HEXES + b] = Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2), Math.abs(z1 - z2));
  }
}
export function distance(a, b) {
  return DISTANCE[a * HEXES + b];
}
const ODD = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [0, 1],
  [1, 1]
];
const EVEN = [
  [1, 0],
  [0, -1],
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, 1]
];
const NEIGHBOURS = [];
export function neighbours(i) {
  return (NEIGHBOURS[i] ??= findNeighbours(i));
}
function findNeighbours(i) {
  const c = colOf(i),
    r = rowOf(i),
    list = [];
  for (const [dc, dr] of r & 1 ? ODD : EVEN) {
    const nc = c + dc,
      nr = r + dr;
    if (nc >= 0 && nc < FIELD.cols && nr >= 0 && nr < FIELD.rows) list.push(idx(nc, nr));
  }
  return list;
}
export const ring = (centre, radius) => {
  const out = [];
  for (let i = 0; i < FIELD.cols * FIELD.rows; i++) if (distance(centre, i) <= radius) out.push(i);
  return out;
};

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ——— Making the field ———
/**
 * The field from the realm itself: each hex takes the ground of the realm hex under it, the walls of the place are the
 * walls of the battle, and the gate is the one facing the attackers. `along` and `across` measure every hex in hex widths
 * along the attackers' way and across it, so deployment, flight and the facing of blows follow the way they came.
 */
function worldField(setup, random) {
  const { c0, r0 } = setup.grid;
  const [ax, az] = setup.axis ?? [1, 0];
  const n = FIELD.cols * FIELD.rows,
    tiles = new Array(n),
    along = new Float32Array(n),
    across = new Float32Array(n),
    world = new Array(n);
  const mid = hexCenter(c0 + 11, r0 + 7);
  const here = setup.place?.node ? FOOTPRINTS[setup.place.node] : null;
  const walled = setup.kind === 'siege' && here && here.kind !== 'port';
  const walls = [];
  let keep = null;
  for (let i = 0; i < n; i++) {
    const wc = c0 + colOf(i),
      wr = r0 + rowOf(i);
    const p = hexCenter(wc, wr);
    world[i] = [wc, wr];
    along[i] = ((p.x - mid.x) * ax + (p.z - mid.z) * az) / HEX_W;
    across[i] = ((p.x - mid.x) * -az + (p.z - mid.z) * ax) / HEX_W;
    const cell = here ? footprintCell(here, wc, wr) : null;
    if (cell) {
      if (cell === 'keep') keep = i;
      if (cell === 'wall' && walled) {
        tiles[i] = 'wall';
        walls.push(i);
      } else tiles[i] = 'town';
      continue;
    }
    const kind = hexKind(wc, wr);
    tiles[i] = kind === 'wall' ? 'town' : kind;
  }
  // The gate: the wall hex nearest the point of the walls straight toward the attackers.
  let gate = null;
  if (walled && walls.length) {
    const k = keep ?? walls[0];
    let best = Infinity;
    for (const w of walls) {
      const score = (along[w] - along[k]) * 3 + Math.abs(across[w] - across[k]) * 2;
      if (score < best) (best = score), (gate = w);
    }
    tiles[gate] = 'gate';
  }
  // The walls that face the attackers, for engines and climbers.
  const frontWalls = walls.filter((w) => w !== gate && keep !== null && along[w] < along[keep] - 0.4);
  if (setup.special === 'chibi') {
    // The great fleet lies chained on the defenders' side of the river.
    for (let i = 0; i < n; i++) if (tiles[i] === 'water' && along[i] > 1.5 && random() < 0.7) tiles[i] = 'ship';
  }
  let depot = null;
  if (setup.special === 'wuchao') {
    let best = -Infinity;
    for (let i = 0; i < n; i++) {
      if (TERRAIN[tiles[i]].water || tiles[i] === 'mountain') continue;
      const score = along[i] - Math.abs(across[i]) * 0.6;
      if (score > best && along[i] < 7) (best = score), (depot = i);
    }
    if (depot !== null) for (const i of ring(depot, 1)) if (!TERRAIN[tiles[i]].water) tiles[i] = 'camp';
  }
  return { tiles, gate, keep: walled || here ? keep : null, depot, along, across, frontWalls, world };
}

function makeField(setup, random) {
  if (setup.grid) return worldField(setup, random);
  const { cols, rows } = FIELD,
    tiles = new Array(cols * rows).fill('plain');
  const t = setup.terrain;
  const naval = setup.kind === 'naval' || setup.special === 'chibi';
  if (naval) {
    for (let i = 0; i < tiles.length; i++) tiles[i] = rowOf(i) < 2 || rowOf(i) > rows - 3 ? (random() < 0.5 ? 'plain' : 'forest') : 'water';
    for (let i = 0; i < tiles.length; i++) if ((rowOf(i) === 2 || rowOf(i) === rows - 3) && random() < 0.4) tiles[i] = 'river';
  } else {
    // Patches of hills, woods, marsh and water spread from seeds, so the ground reads as land.
    const patch = (kind, share) => {
      const want = Math.round(tiles.length * share);
      let made = 0;
      while (made < want) {
        let at = Math.floor(random() * tiles.length);
        const size = 3 + Math.floor(random() * 6);
        for (let k = 0; k < size && made < want; k++) {
          if (tiles[at] === 'plain') (tiles[at] = kind), made++;
          const n = neighbours(at);
          at = n[Math.floor(random() * n.length)];
        }
      }
    };
    patch(t.steppe ? 'grass' : 'forest', t.woods);
    patch('hill', t.hills * 0.7);
    patch('mountain', t.hills * 0.25);
    patch('marsh', t.marsh);
    if (t.water > 0.1) {
      // A river across the field, with shallows to ford.
      let c = 9 + Math.floor(random() * 4);
      for (let r = 0; r < rows; r++) {
        tiles[idx(c, r)] = random() < 0.3 ? 'river' : 'water';
        if (random() < 0.4) c = Math.max(6, Math.min(cols - 7, c + (random() < 0.5 ? -1 : 1)));
      }
    }
    // A road through the middle.
    const mid = Math.floor(rows / 2);
    for (let c = 0; c < cols; c++) if (tiles[idx(c, mid)] !== 'water') tiles[idx(c, mid)] = 'road';
    if (t.pass) {
      // A pass: mountains above and below, a narrow way through.
      for (let i = 0; i < tiles.length; i++) {
        const r = rowOf(i);
        if ((r < 4 || r > rows - 5) && colOf(i) > 6 && colOf(i) < cols - 4) tiles[i] = 'mountain';
      }
    }
  }
  let gate = null,
    keep = null,
    depot = null;
  if (setup.kind === 'siege') {
    // A walled town on the right: a wall column with a gate, the town behind it, and its keep.
    const wc = cols - 7;
    for (let r = 1; r < rows - 1; r++) {
      tiles[idx(wc, r)] = 'wall';
      for (let c = wc + 1; c < cols; c++) tiles[idx(c, r)] = 'town';
    }
    for (let c = wc; c < cols; c++) {
      tiles[idx(c, 0)] = 'wall';
      tiles[idx(c, rows - 1)] = 'wall';
    }
    gate = idx(wc, Math.floor(rows / 2));
    tiles[gate] = 'gate';
    keep = idx(cols - 3, Math.floor(rows / 2));
    for (let c = 0; c < wc - 1; c++) if (tiles[idx(c, Math.floor(rows / 2))] !== 'water') tiles[idx(c, Math.floor(rows / 2))] = 'road';
  }
  if (setup.special === 'chibi') {
    // The great fleet lies chained in the river on the right.
    for (let i = 0; i < tiles.length; i++) if (colOf(i) >= cols - 8 && tiles[i] === 'water' && rowOf(i) > 2 && rowOf(i) < rows - 3) tiles[i] = 'ship';
  }
  if (setup.special === 'wuchao') {
    // The grain depot of Wuchao: stacks of grain inside a palisade, at night.
    depot = idx(cols - 4, Math.floor(rows / 2));
    for (const i of ring(depot, 1)) tiles[i] = 'camp';
  }
  const along = Float32Array.from(tiles, (_, i) => colOf(i) - (cols - 1) / 2),
    across = Float32Array.from(tiles, (_, i) => rowOf(i) - (rows - 1) / 2);
  const frontWalls = tiles.map((tile, i) => (tile === 'wall' && colOf(i) === cols - 7 ? i : -1)).filter((i) => i >= 0 && i !== gate);
  return { tiles, gate, keep, depot, along, across, frontWalls, world: null };
}

// ——— Units ———
/** The numbers a unit fights with, read once from its general (or a captain) and its faction. */
function profile(state, u) {
  const g = u.general,
    keys = ['atk', 'def', 'spd', 'rage', 'tactic', 'morale', 'cav', 'inf', 'bow', 'siege', 'navy', 'fire', 'ambush', 'wall', 'charge', 'counter', 'crit', 'resist', 'capture'];
  const fx = {};
  for (const k of keys) fx[k] = (g && state ? generalEffect(state, g, k) : 0) + (state && u.faction ? techEffect(state, u.faction, k) : 0);
  // Deputies lend part of their skill.
  for (const d of u.deputies ?? []) for (const k of ['atk', 'def', 'tactic']) fx[k] += state ? generalEffect(state, d, k) * 0.4 : 0;
  const s = (key, base) => (g && state ? stat(state, g, key) : base);
  const lead = s('lead', 42),
    war = s('war', 45),
    int = s('int', 30);
  const help = (u.deputies ?? []).reduce((m, d) => Math.max(m, state ? stat(state, d, 'lead') : 0), 0);
  const tactics = [];
  if (g) for (const t of Object.values(TACTICS)) if (t.general === g) tactics.push(t.id);
  const weapon = UNITS[u.unit].weapon === 'cav' ? 'cav' : UNITS[u.unit].weapon;
  const generic = Object.values(TACTICS).filter((t) => (t.weapon && t.weapon === weapon) || (t.mind && int >= t.mind));
  // A general knows the tactics of his weapon up to his war, and schemes up to his intellect.
  generic.sort((a, b) => b.power - a.power);
  for (const t of generic) if (tactics.length < 4 && (t.mind ? true : war >= 40 + t.power)) tactics.push(t.id);
  if (!tactics.length && generic.length) tactics.push(generic[generic.length - 1].id);
  // Aptitude for the arm and the general's mobility (a captain fights as a plain B and moves at an ordinary pace).
  const apt = g ? aptitudeFactor(g, UNITS[u.unit].group) : 1;
  const mob = g ? mobility(g) : 45;
  return { lead: Math.max(lead, help * 0.5), war, int, fx, tactics, apt, mob };
}

/** A new battle from its setup. `state` is the game, to read generals' abilities and inventions (null in tests). */
export function createBattle(setup, state = null) {
  const random = rng(setup.seed);
  const field = makeField(setup, random);
  const b = {
    setup,
    tiles: field.tiles,
    gate: field.gate !== null ? { at: field.gate, hp: 1500 + setup.wall * 60, open: false } : null,
    keep: field.keep,
    depot: field.depot !== null ? { at: field.depot, hp: 1000, burnt: false } : null,
    fire: {},
    wind: setup.special === 'chibi' ? 0 : Math.floor(random() * 6),
    time: 0,
    // On the realm's ground the attackers start further out, so an assault there is given a longer day.
    limit: setup.special === 'wuchao' ? 200 : setup.grid && setup.kind === 'siege' ? LIMIT * 1.3 : LIMIT,
    night: setup.special === 'wuchao',
    keepHeld: 0,
    along: field.along,
    across: field.across,
    frontWalls: field.frontWalls,
    world: field.world,
    units: [],
    events: [],
    over: null,
    random
  };
  const deploy = [[], []];
  setup.units.forEach((u, i) => {
    const p = profile(state, u);
    const naval = setup.kind === 'naval' || setup.special === 'chibi';
    const unit = {
      id: i,
      side: u.side,
      faction: u.faction,
      general: u.general,
      deputies: u.deputies ?? [],
      kind: u.unit,
      formation: formationAllowed(u.unit,u.formation) ? u.formation : defaultFormation(u.unit),
      troops: u.troops,
      start: u.troops,
      morale: Math.min(100, u.morale + p.fx.morale),
      training: u.training ?? 50,
      rage: 20,
      pos: -1,
      path: [],
      goal: null,
      target: null,
      order: 'auto',
      autoTactic: true,
      cd: 0.5 + random() * 0.8,
      step: 0,
      status: {},
      buffs: [],
      routed: false,
      gone: false,
      kills: 0,
      record: {damage:0,taken:0,healing:0,hits:0,counterHits:0,flankHits:0,charges:0,tactics:0},
      onWall: false,
      afloat: naval,
      ...p
    };
    b.units.push(unit);
    deploy[u.side].push(unit);
  });
  if (setup.grid) deployByWay(b, setup, deploy);
  else deployByColumns(b, setup, deploy);
  // Where routed units leave the field: the edge hexes toward their own side.
  b.exits = [[], []];
  const border = [];
  for (let i = 0; i < b.tiles.length; i++) if (colOf(i) === 0 || colOf(i) === FIELD.cols - 1 || rowOf(i) === 0 || rowOf(i) === FIELD.rows - 1) border.push(i);
  const sorted = border.slice().sort((x, y) => b.along[x] - b.along[y]);
  const third = Math.ceil(sorted.length / 3);
  b.exits[0] = setup.grid ? sorted.slice(0, third) : border.filter((i) => colOf(i) === 0);
  b.exits[1] = setup.grid ? sorted.slice(-third) : border.filter((i) => colOf(i) === FIELD.cols - 1);
  return b;
}

/** Deployment on a made-up field: attackers on the left columns, defenders on the right (inside any walls). */
function deployByColumns(b, setup, deploy) {
  for (const side of [0, 1]) {
    const list = deploy[side];
    const cols = side === 0 ? [1, 2, 3, 0] : setup.kind === 'siege' ? [FIELD.cols - 7, FIELD.cols - 5, FIELD.cols - 4, FIELD.cols - 3] : [FIELD.cols - 2, FIELD.cols - 3, FIELD.cols - 4, FIELD.cols - 1];
    let k = 0;
    for (const unit of list) {
      let placed = false;
      for (let tries = 0; tries < 400 && !placed; tries++) {
        const c = cols[Math.floor(k / 5) % cols.length],
          r = 2 + ((k * 3 + tries) % (FIELD.rows - 4));
        const at = idx(c, r);
        const ranged = UNITS[unit.kind].range > 1;
        const okTile = setup.kind === 'siege' && side === 1 && c === FIELD.cols - 7 ? b.tiles[at] === 'wall' && ranged : canStand(b, unit, at);
        if (okTile && !b.units.some((o) => o.pos === at)) {
          unit.pos = at;
          unit.onWall = b.tiles[at] === 'wall';
          placed = true;
        }
      }
      if (!placed)
        for (let at = 0; at < b.tiles.length && !placed; at++)
          if ((side === 0 ? colOf(at) < 6 : colOf(at) > FIELD.cols - 7) && canStand(b, unit, at) && !b.units.some((o) => o.pos === at)) (unit.pos = at), (placed = true);
      k++;
    }
  }
}

/**
 * Deployment on the realm's ground: each side forms up at its own end of the way the attackers came, spread across it
 * five abreast, later units behind; defenders of walls put their bows on the walls that face the enemy and the rest in
 * the town behind the gate.
 */
function deployByWay(b, setup, deploy) {
  const taken = new Set();
  const n = b.tiles.length;
  let lo = Infinity,
    hi = -Infinity;
  for (let i = 0; i < n; i++) (lo = Math.min(lo, b.along[i])), (hi = Math.max(hi, b.along[i]));
  const town = (i) => b.tiles[i] === 'town' || b.tiles[i] === 'wall' || b.tiles[i] === 'gate';
  for (const side of [0, 1]) {
    deploy[side].forEach((unit, k) => {
      const want = [0, 1, -1, 2, -2][k % 5] * 2.2,
        rank = Math.floor(k / 5);
      const ranged = UNITS[unit.kind].range > 1;
      let best = -1,
        bestScore = Infinity;
      for (let i = 0; i < n; i++) {
        if (taken.has(i)) continue;
        const tile = b.tiles[i];
        let score;
        if (setup.kind === 'siege' && side === 1 && b.keep !== null) {
          if (tile === 'gate' || !town(i)) continue;
          if (tile === 'wall') {
            if (!ranged || !b.frontWalls.includes(i)) continue;
            score = Math.abs(b.across[i] - want) * 0.5;
          } else score = 3 + Math.abs(b.along[i] - b.along[b.gate?.at ?? b.keep]) + Math.abs(b.across[i] - want) * 0.5;
        } else {
          if (!canStand(b, unit, i)) continue;
          if (setup.kind === 'siege' && town(i)) continue;
          const depth = side === 0 ? b.along[i] - lo : hi - b.along[i];
          score = Math.abs(depth - 1 - rank * 1.6) + Math.abs(b.across[i] - want) * 0.7;
        }
        if (score < bestScore) (bestScore = score), (best = i);
      }
      if (best < 0)
        for (let i = 0; i < n && best < 0; i++) if (!taken.has(i) && canStand(b, unit, i)) best = i;
      if (best < 0) return;
      taken.add(best);
      unit.pos = best;
      unit.onWall = b.tiles[best] === 'wall';
    });
  }
}

/** Whether a unit may stand on a hex. */
function canStand(b, u, at) {
  const tile = b.tiles[at];
  if (tile === 'gate') return b.gate?.open || u.side === 1;
  if (tile === 'wall') return u.side === 1 || u.climbing === at;
  const water = TERRAIN[tile].water;
  if (water && !u.afloat && UNITS[u.kind].group !== 'navy') return tile === 'ship';
  if (!water && UNITS[u.kind].group === 'navy' && tile !== 'river') return false;
  return true;
}

/** The identical legal deployment area for campaign and laboratory. */
export function canDeployBattle(b,u,at) {
  if(!u||u.gone||!Number.isInteger(at)||at<0||at>=b.tiles.length||b.units.some(o=>o!==u&&!o.gone&&o.pos===at))return false;
  const tile=b.tiles[at];let lo=Infinity,hi=-Infinity;
  for(const v of b.along){lo=Math.min(lo,v);hi=Math.max(hi,v);}
  const town=tile==='town'||tile==='wall';
  if(u.side===0?b.along[at]>lo+5||town:b.setup.kind==='siege'?!town:b.along[at]<hi-5)return false;
  if(tile==='gate')return false;
  if(tile==='wall')return u.side===1&&UNITS[u.kind].range>1;
  const navy=UNITS[u.kind].group==='navy'||u.afloat;
  return TERRAIN[tile].water?navy||tile==='ship':!navy||tile==='river';
}
export function deployBattleUnit(b,id,at) {
  const u=b.units[id];if(b.time>0||!canDeployBattle(b,u,at))return false;
  u.pos=at;u.onWall=b.tiles[at]==='wall';return true;
}

function moveCost(b, u, at) {
  const tile = b.tiles[at];
  if (tile === 'wall') return u.side === 1 ? 1.5 : u.climbing === at ? 3 : Infinity;
  if (tile === 'gate') return b.gate?.open || u.side === 1 ? 1 : Infinity;
  if (!canStand(b, u, at)) return Infinity;
  let cost = TERRAIN[tile].cost;
  if (UNITS[u.kind].group === 'cav' && cost > 1) cost *= 1.4;
  if (b.fire[at]) cost += 4;
  return cost;
}

/** A path for a unit to a goal hex, around the ground and other units. */
const pathDist = new Float64Array(HEXES),
  pathPrev = new Int16Array(HEXES),
  pathSeen = new Uint32Array(HEXES);
let pathRun = 0;
function findPath(b, u, goal, stopShort = 0) {
  const occupied = new Set();
  for (const o of b.units) if (o !== u && !o.gone && o.pos >= 0) occupied.add(o.pos);
  pathRun++;
  const known = (n) => pathSeen[n] === pathRun;
  pathSeen[u.pos] = pathRun;
  pathDist[u.pos] = 0;
  pathPrev[u.pos] = -1;
  const open = [u.pos];
  let reached = null,
    seen = 1;
  while (open.length) {
    let bi = 0,
      best = pathDist[open[0]] + distance(open[0], goal);
    for (let i = 1; i < open.length; i++) {
      const f = pathDist[open[i]] + distance(open[i], goal);
      if (f < best) (best = f), (bi = i);
    }
    const here = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    if (distance(here, goal) <= stopShort) {
      reached = here;
      break;
    }
    for (const n of neighbours(here)) {
      if (occupied.has(n) && distance(n, goal) > stopShort) continue;
      const c = moveCost(b, u, n);
      if (c === Infinity) continue;
      const d = pathDist[here] + c;
      if (!known(n)) {
        pathSeen[n] = pathRun;
        pathDist[n] = d;
        pathPrev[n] = here;
        open.push(n);
        seen++;
      } else if (d < pathDist[n]) {
        pathDist[n] = d;
        pathPrev[n] = here;
        if (!open.includes(n)) open.push(n);
      }
    }
    if (seen > 400) break;
  }
  if (reached === null) return [];
  const path = [];
  for (let n = reached; n !== u.pos; n = pathPrev[n]) path.unshift(n);
  return path;
}

const hasRam = (b) => b.units.some((u) => u.side === 0 && alive(u) && !u.routed && UNITS[u.kind].special === 'gate');
const canBatterGate = (kind, ram) => kind.special === 'gate' || (kind.group === 'inf' && !ram);

function approachGate(b, unit) {
  unit.atGate = distance(unit.pos, b.gate.at) <= 1;
  return unit.atGate ? [] : findPath(b, unit, b.gate.at, 1);
}

function planAttack(b, unit, target) {
  const kind = UNITS[unit.kind];
  if (distance(unit.pos, target.pos) <= kind.range) return { path: [], ready: true, gate: false, atGate: false };
  const path = findPath(b, unit, target.pos, kind.range);
  // A direct order can name a defender behind a closed wall. Approach the
  // gate with the same eligible troops as the existing automatic siege.
  if (!path.length && b.gate && !b.gate.open && unit.side === 0 &&
      ['town', 'wall', 'gate'].includes(b.tiles[target.pos]) && canBatterGate(kind, hasRam(b))) {
    const atGate = distance(unit.pos, b.gate.at) <= 1;
    return { path: atGate ? [] : findPath(b, unit, b.gate.at, 1), ready: false, gate: true, atGate };
  }
  return { path, ready: false, gate: false, atGate: false };
}

function attackPath(b, unit, target) {
  const plan = planAttack(b, unit, target);
  unit.atGate = plan.atGate;
  return plan.path;
}

/** Read the same route a manual order would use, without giving the order or advancing the battle. */
export function previewBattleOrder(b, unitId, kind, arg) {
  const u = b.units[unitId];
  if (!u || !alive(u) || u.routed) return null;
  if (kind === 'move') {
    if (!Number.isInteger(arg) || arg < 0 || arg >= b.tiles.length) return null;
    const path = canStand(b, u, arg) ? findPath(b, u, arg) : [];
    return { unit: unitId, kind, hex: arg, path, valid: path.length > 0 || u.pos === arg };
  }
  if (kind === 'attack') {
    const target = b.units[arg];
    if (!target || !alive(target) || target.side === u.side) return null;
    const plan = planAttack(b, u, target);
    return { unit: unitId, kind, target: arg, hex: plan.gate ? b.gate.at : target.pos, path: plan.path,
      valid: plan.ready || plan.atGate || plan.path.length > 0, gate: plan.gate };
  }
  return null;
}

// ——— Fighting ———
const alive = (u) => !u.gone && u.troops > 0;
const buff = (u, key) => u.buffs.reduce((s, x) => s + (x.key === key ? x.v : 0), 0) / 100;

function weaponBonus(attacker, defender) {
  const a = UNITS[attacker.kind],
    d = UNITS[defender.kind];
  let m = 1;
  if (a.beats && a.beats === d.weapon) m *= a.weapon==='cav'&&d.weapon==='bow'?HORSE_BOW_COUNTER:COUNTER;
  if (d.beats && d.beats === a.weapon) m /= 1.15;
  if (d.special === 'shield' && a.range > 1) m *= 0.75;
  if (d.special === 'brace' && a.group === 'cav') m *= 0.85;
  if (a.special === 'pierce' && d.group === 'cav') m *= 1.1;
  return m;
}

/** A non-random explanation of one ordinary blow. Inspecting never advances the RNG. */
export function combatPreview(b,a,d) {
  if(!a||!d||a.pos<0||d.pos<0)return null;
  const height=TERRAIN[b.tiles[a.pos]].high&&!TERRAIN[b.tiles[d.pos]].high?1.15:1;
  const flank=flanked(b,d)?1+.15+FORMATIONS[a.formation].flank:1;
  const hide=TERRAIN[b.tiles[a.pos]].hide||TERRAIN[b.tiles[a.pos]].high?1+a.fx.ambush/100:1;
  const ranged=distance(a.pos,d.pos)>1;
  const charge=!ranged&&a.charging?1+.25+a.fx.charge/100:1;
  const weaponMultiplier=weaponBonus(a,d);
  const base=Math.pow(a.troops,.72)*.42*(attackPower(b,a)/defencePower(b,d,a.pos))*weaponMultiplier*height*flank*hide*charge*(ranged?.8:1);
  const tags=[];
  if(UNITS[a.kind].beats===UNITS[d.kind].weapon)tags.push('counter');
  if(UNITS[d.kind].beats===UNITS[a.kind].weapon)tags.push('countered');
  if(UNITS[d.kind].special==='shield'&&UNITS[a.kind].range>1)tags.push('shield');
  if(UNITS[d.kind].special==='brace'&&UNITS[a.kind].group==='cav')tags.push('brace');
  if(height>1)tags.push('height');if(flank>1)tags.push('flank');if(charge>1)tags.push('charge');
  if(UNITS[a.kind].group==='cav'&&TERRAIN[b.tiles[a.pos]].cav)tags.push('cavalryTerrain');
  return {minLoss:Math.round(base*.85),maxLoss:Math.round(base*1.15),weaponMultiplier,attack:attackPower(b,a),defence:defencePower(b,d,a.pos),tags,range:UNITS[a.kind].range,distance:distance(a.pos,d.pos),criticalChance:Math.min(1,.05+a.fx.crit/100)};
}

function classBonus(u) {
  const g = UNITS[u.kind].group;
  return (1 + ((g === 'cav' ? u.fx.cav : g === 'bow' ? u.fx.bow : g === 'inf' ? u.fx.inf : g === 'navy' ? u.fx.navy : 0) + (u.afloat ? u.fx.navy * 0.5 : 0)) / 100) * (u.apt ?? 1);
}

function attackPower(b, u) {
  const t = UNITS[u.kind],
    f = FORMATIONS[u.formation];
  const fear = u.status.fear > 0 ? 0.7 : 1;
  const morale = 0.55 + u.morale / 220;
  const cavalryGround=t.group==='cav'&&!u.afloat?1+(TERRAIN[b.tiles[u.pos]].cav??0):1;
  return t.atk * (0.55 + u.lead / 300 + u.war / 260) * (1 + u.fx.atk / 100 + buff(u, 'atk')) * (1 + f.atk) * classBonus(u) * morale * (0.75 + u.training / 400) * fear * cavalryGround;
}

function defencePower(b, u, from) {
  const t = UNITS[u.kind],
    f = FORMATIONS[u.formation],
    tile = TERRAIN[b.tiles[u.pos]];
  let ground = 1 + tile.def;
  if (u.onWall || b.tiles[u.pos] === 'gate') ground += u.fx.wall / 100 + 0.2;
  const facing = from !== undefined && Math.abs(b.along[from] - b.along[u.pos]) >= Math.abs(b.across[from] - b.across[u.pos]) ? 1 + f.front : 1;
  const tengjia = t.special === 'fireweak' ? 1.2 : 1;
  return t.def * (0.55 + u.lead / 260 + u.int / 500) * (1 + u.fx.def / 100 + buff(u, 'def')) * (1 + f.def) * ground * facing * classBonus(u) * tengjia * (u.routed ? 0.5 : 1);
}

/** Damage from one blow: soldiers lost by the defender. */
function blow(b, a, d, scale = 1) {
  const height = TERRAIN[b.tiles[a.pos]].high && !TERRAIN[b.tiles[d.pos]].high ? 1.15 : 1;
  const flank = flanked(b, d) ? 1 + 0.15 + FORMATIONS[a.formation].flank : 1;
  const hide = TERRAIN[b.tiles[a.pos]].hide || TERRAIN[b.tiles[a.pos]].high ? 1 + a.fx.ambush / 100 : 1;
  const ranged = distance(a.pos, d.pos) > 1;
  const charge = !ranged && a.charging ? 1 + 0.25 + a.fx.charge / 100 : 1;
  const crit = b.random() < 0.05 + a.fx.crit / 100 ? 1.5 : 1;
  const swing = 0.85 + b.random() * 0.3;
  const strength = Math.pow(a.troops, 0.72) * 0.42;
  if(a.record){a.record.hits++;if(UNITS[a.kind].beats===UNITS[d.kind].weapon)a.record.counterHits++;if(flank>1)a.record.flankHits++;if(charge>1)a.record.charges++;}
  // Momentum is spent on first contact; it returns only after another actual movement into contact.
  if(!ranged){a.charging=false;a.chargeSteps=0;}
  return Math.round(strength * (attackPower(b, a) / defencePower(b, d, a.pos)) * weaponBonus(a, d) * height * flank * hide * charge * crit * swing * scale * (ranged ? 0.8 : 1));
}

function flanked(b, u) {
  const foes = b.units.filter((o) => alive(o) && o.side !== u.side && !o.routed && distance(o.pos, u.pos) === 1);
  return foes.length >= 2;
}

function hurt(b, d, loss, by) {
  loss = Math.min(d.troops, Math.max(0, loss));
  d.troops -= loss;
  if (by) {
    if(by.record)by.record.damage+=loss;
    by.kills += loss;
    by.rage = Math.min(100, by.rage + (4 + loss / 120) * (1 + by.fx.rage / 100));
    by.morale = Math.min(100, by.morale + loss / Math.max(400, by.troops) * 4);
  }
  if(d.record)d.record.taken+=loss;
  d.rage = Math.min(100, d.rage + (2 + loss / 200) * (1 + d.fx.rage / 100));
  // Morale falls with losses as a share of the unit.
  d.morale -= (loss / Math.max(1, d.start)) * 90 * (1 - d.fx.resist / 200);
  if (d.troops <= 0) {
    d.troops = 0;
    d.gone = true;
    d.end = 'destroyed';
    shock(b, d);
  } else if (d.morale <= 0 && !d.routed) rout(b, d);
}

function rout(b, u) {
  u.routed = true;
  u.morale = 0;
  u.path = [];
  u.target = null;
  b.events.push({ t: b.time, kind: 'rout', unit: u.id });
  shock(b, u);
}

/** Allies near a broken unit lose heart. */
function shock(b, u) {
  for (const o of b.units) if (alive(o) && o.side === u.side && o !== u && distance(o.pos, u.pos) <= 3) o.morale -= 8 * (1 - o.fx.resist / 150);
}

// ——— Tactics ———
function tacticTargets(b, u, t) {
  if (['atk', 'def', 'spd', 'heal', 'rally', 'rage'].includes(t.kind)) {
    if (t.shape === 'self') return [u];
    if (t.shape === 'all') return b.units.filter((o) => alive(o) && o.side === u.side);
    return b.units.filter((o) => alive(o) && o.side === u.side && distance(o.pos, u.pos) <= 3);
  }
  return [];
}

/** Where a damaging tactic would land on a target, and whom it would hit. */
function struck(b, u, t, centre) {
  let hexes;
  if (t.shape === 'one') hexes = [centre];
  else if (t.shape === 'ring1') hexes = ring(centre, 1);
  else if (t.shape === 'ring2') hexes = ring(centre, 2);
  else if (t.shape === 'line') {
    hexes = [centre];
    let at = centre;
    for (let k = 0; k < 2; k++) {
      const next = neighbours(at).slice().sort((x, y) => distance(y, u.pos) - distance(x, u.pos))[0];
      if (next === undefined) break;
      hexes.push(next);
      at = next;
    }
  } else hexes = b.units.filter((o) => alive(o) && o.side !== u.side).map((o) => o.pos);
  return { hexes, foes: b.units.filter((o) => alive(o) && o.side !== u.side && hexes.includes(o.pos)) };
}

const tacticReach = (u, t) => (t.mind ? 5 : Math.max(2, UNITS[u.kind].range + 1));

/** Pure targeting preview, using the exact same shapes and reach as useTactic. */
export function tacticPreview(b,u,id,target=null) {
  const t=TACTICS[id];if(!u||!t||!u.tactics.includes(id))return {valid:false,reason:'unknown',reach:0,hexes:[],targets:[]};
  const helping=['atk','def','spd','heal','rally','rage'].includes(t.kind),reach=tacticReach(u,t);
  const foe=typeof target==='number'?b.units[target]:target;
  const area=helping?{hexes:tacticTargets(b,u,t).map(o=>o.pos),foes:tacticTargets(b,u,t)}:foe&&alive(foe)&&foe.side!==u.side?struck(b,u,t,foe.pos):{hexes:[],foes:[]};
  const reason=!alive(u)||u.routed?'unavailable':u.status.stun>0?'stun':u.rage<100?'rage':!helping&&(!foe||!alive(foe)||foe.side===u.side)?'target':!helping&&distance(u.pos,foe.pos)>reach?'range':null;
  return {valid:reason===null,reason,reach,helping,hexes:area.hexes,targets:area.foes.map(o=>o.id)};
}

/** Unleash a tactic: on a target unit for those that strike, on allies for those that help. */
export function useTactic(b, u, tacticId, targetUnit = null) {
  if (!alive(u) || u.routed || u.rage < 100 || !u.tactics.includes(tacticId) || u.status.stun > 0) return false;
  const t = TACTICS[tacticId];
  const helping = ['atk', 'def', 'spd', 'heal', 'rally', 'rage'].includes(t.kind);
  let foe = targetUnit;
  if (!helping) {
    if (!foe || !alive(foe) || foe.side === u.side) foe = bestFoeFor(b, u, t);
    if (!foe || distance(foe.pos, u.pos) > tacticReach(u, t)) return false;
  }
  // A scheme may fail against a sharper mind.
  if (t.mind && foe) {
    const p = 0.75 + (u.int - foe.int) / 120 + u.fx.tactic / 200 - foe.fx.resist / 200;
    if (b.random() > p) {
      u.rage = 30;
      b.events.push({ t: b.time, kind: 'tacticFailed', unit: u.id, tactic: tacticId, target: foe.id });
      return true;
    }
  }
  u.rage = 0;
  if(u.record)u.record.tactics++;
  const power = (t.power / 10) * (1 + (u.fx.tactic + (t.kind === 'burn' ? u.fx.fire : 0)) / 100) * (t.mind ? 0.6 + u.int / 120 : 0.6 + u.war / 140);
  b.events.push({ t: b.time, kind: 'tactic', unit: u.id, tactic: tacticId, target: foe?.id ?? null });
  if (helping) {
    for (const o of tacticTargets(b, u, t)) {
      if (t.kind === 'heal') {
        const was=o.troops;o.troops=Math.min(o.start,o.troops+Math.round(o.start*(t.power/100)*(.6+u.int/200)));
        if(u.record)u.record.healing+=o.troops-was;
      }
      else if (t.kind === 'rally') {
        o.morale = Math.min(100, o.morale + t.power);
        o.status = {};
        if (o.routed && o.morale > 20) o.routed = false;
      } else if (t.kind === 'rage') o.rage = Math.min(100, o.rage + t.power);
      else o.buffs.push({ key: t.kind, v: t.power, t: t.seconds || 8 });
    }
    return true;
  }
  const { hexes, foes } = struck(b, u, t, foe.pos);
  for (const d of foes) {
    const resist = d.fx.resist / 100;
    hurt(b, d, blow(b, u, d, power * 1.6 * (d === foe ? 1 : 0.7)), u);
    const last = (t.seconds || 5) * (1 - resist);
    if (t.kind === 'confuse' && b.random() > resist) d.status.confuse = last;
    if (t.kind === 'fear' && b.random() > resist) d.status.fear = last;
    if (t.kind === 'stun' && b.random() > resist) d.status.stun = Math.min(4, last);
    if (t.kind === 'drain') {
      d.morale -= 12 * power;
      u.morale = Math.min(100, u.morale + 6 * power);
    }
    if (t.kind === 'burn' && UNITS[d.kind].special === 'fireweak') hurt(b, d, blow(b, u, d, power * 2.5), u);
  }
  if (t.kind === 'burn') for (const h of hexes) if (TERRAIN[b.tiles[h]].burn || b.tiles[h] === 'camp' || b.tiles[h] === 'plain' || b.tiles[h] === 'grass') b.fire[h] = Math.max(b.fire[h] ?? 0, TERRAIN[b.tiles[h]].burn ? 14 : 6);
  return true;
}

function bestFoeFor(b, u, t) {
  let best = null,
    score = -Infinity;
  for (const o of b.units) {
    if (!alive(o) || o.side === u.side) continue;
    const d = distance(o.pos, u.pos);
    if (d > tacticReach(u, t)) continue;
    const many = t.shape === 'one' ? 1 : struck(b, u, t, o.pos).foes.length;
    const s = many * 3 + o.troops / 2000 - d + (o.routed ? -4 : 0);
    if (s > score) (score = s), (best = o);
  }
  return best;
}

// ——— Thinking ———
/** The computer's choice for one unit: whom to fight, where to go, and whether to unleash its tactic. */
function think(b, u) {
  if (u.routed) {
    // Flee off the field at the own side's edge.
    const exits = b.exits[u.side];
    if (exits.includes(u.pos)) {
      u.gone = true;
      u.end = 'fled';
      return;
    }
    let goal = exits[0],
      near = Infinity;
    for (const e of exits) {
      const d = distance(u.pos, e) + (moveCost(b, u, e) === Infinity ? 99 : 0);
      if (d < near) (near = d), (goal = e);
    }
    u.path = findPath(b, u, goal);
    return;
  }
  if (u.status.confuse > 0) {
    // A confused unit wanders.
    const n = neighbours(u.pos).filter((h) => moveCost(b, u, h) < Infinity && !b.units.some((o) => o.pos === h && !o.gone));
    u.path = n.length ? [n[Math.floor(b.random() * n.length)]] : [];
    u.target = null;
    return;
  }
  if (u.autoTactic && u.rage >= 100) for (const t of u.tactics) if (useTactic(b, u, t)) return;
  if (u.order === 'hold' && u.goal === null) {
    u.target = nearestFoe(b, u, UNITS[u.kind].range);
    u.path = [];
    return;
  }
  if (u.goal !== null) {
    if (u.pos === u.goal) {
      u.goal = null;
      u.path = [];
      return;
    }
    u.path = findPath(b, u, u.goal);
    u.target = nearestFoe(b, u, UNITS[u.kind].range);
    return;
  }
  // When the enemy is through the walls, the defenders turn to the keep: archers on the walls keep shooting while they can.
  if (u.side === 1 && b.keep !== null && u.order === 'auto') {
    // On the realm's ground the town is small, so the threat is whoever is inside the walls, not merely near the keep.
    const within = (o) => (b.world ? ['town', 'gate', 'wall'].includes(b.tiles[o.pos]) : true) && distance(o.pos, b.keep) <= 4;
    const threat = b.units.filter((o) => alive(o) && o.side === 0 && !o.routed && within(o)).sort((x, y) => distance(x.pos, b.keep) - distance(y.pos, b.keep))[0];
    const reach = UNITS[u.kind].range;
    if (threat && !(u.onWall && reach > 1 && distance(u.pos, threat.pos) <= reach)) {
      u.target = threat;
      u.path = distance(u.pos, threat.pos) > reach ? findPath(b, u, threat.pos, reach) : [];
      return;
    }
  }
  // While the gate holds, the garrison of a walled town stays within its walls and meets only what comes over them.
  if (u.side === 1 && b.gate && !b.gate.open && b.world && u.order === 'auto' && ['town', 'wall', 'gate'].includes(b.tiles[u.pos])) {
    const inside = (o) => ['town', 'wall', 'gate'].includes(b.tiles[o.pos]);
    const foe = b.units.filter((o) => alive(o) && o.side === 0 && !o.routed && inside(o)).sort((x, y) => distance(x.pos, u.pos) - distance(y.pos, u.pos))[0];
    if (foe) {
      u.target = foe;
      u.path = distance(u.pos, foe.pos) > UNITS[u.kind].range ? findPath(b, u, foe.pos, UNITS[u.kind].range) : [];
    } else {
      u.target = nearestFoe(b, u, UNITS[u.kind].range);
      u.path = [];
    }
    return;
  }
  // Defenders on the walls stay there; the keep is held.
  if (u.side === 1 && (u.onWall || (b.keep !== null && u.pos === b.keep)) && u.order === 'auto') {
    u.target = nearestFoe(b, u, UNITS[u.kind].range);
    u.path = [];
    return;
  }
  // At Wuchao the raiders make for the grain.
  if (b.depot && u.side === 0 && !b.depot.burnt) {
    if (distance(u.pos, b.depot.at) <= 1) {
      u.target = null;
      u.path = [];
      return;
    }
    u.path = findPath(b, u, b.depot.at, 1);
    return;
  }
  // Siege: rams go for the gate; the rest wait for it, climb with towers, or shoot at the walls.
  if (b.gate && u.side === 0 && !b.gate.open) {
    const kind = UNITS[u.kind];
    const rams = hasRam(b);
    if (canBatterGate(kind, rams)) {
      u.path = approachGate(b, u);
      if (u.atGate) u.target = null;
      return;
    }
    if (kind.special === 'overwall') {
      // Siege towers go up to the wall; the foot beside them climb.
      const walls = b.frontWalls.slice();
      const wall = walls.sort((x, y) => distance(x, u.pos) - distance(y, u.pos))[0];
      if (distance(u.pos, wall) <= 1) {
        u.climbing = wall;
        for (const o of b.units) if (o.side === 0 && alive(o) && UNITS[o.kind].group === 'inf') o.climbing = wall;
        u.path = [];
        u.target = nearestFoe(b, u, UNITS[u.kind].range);
        return;
      }
      u.path = findPath(b, u, wall, 1);
      return;
    }
    if (kind.group === 'inf' && rams) {
      // Keep clear of the gate for the rams, and climb where a tower stands.
      if (u.climbing !== undefined) {
        u.path = findPath(b, u, b.keep ?? u.climbing);
        return;
      }
      if (distance(u.pos, b.gate.at) <= 3) {
        u.path = [];
        return;
      }
      u.path = findPath(b, u, b.gate.at, 3);
      return;
    }
  }
  const foe = chooseFoe(b, u);
  u.target = foe;
  if (!foe) {
    if (b.keep !== null && u.side === 0 && (b.gate?.open || u.climbing !== undefined)) u.path = findPath(b, u, b.keep);
    else u.path = [];
    return;
  }
  const range = UNITS[u.kind].range;
  const d = distance(u.pos, foe.pos);
  if (range > 1 && d <= range && d > 1) u.path = [];
  else if (range > 1 && d <= 1) {
    // Archers step back from a foe in their face.
    const away = neighbours(u.pos)
      .filter((h) => moveCost(b, u, h) < Infinity && !b.units.some((o) => o.pos === h && !o.gone))
      .sort((x, y) => distance(y, foe.pos) - distance(x, foe.pos))[0];
    u.path = away !== undefined && distance(away, foe.pos) > 1 ? [away] : [];
  } else if (d > range) u.path = findPath(b, u, foe.pos, range);
  else u.path = [];
}

function nearestFoe(b, u, reach) {
  let best = null,
    bd = Infinity;
  for (const o of b.units)
    if (alive(o) && o.side !== u.side) {
      const d = distance(o.pos, u.pos);
      if (d <= reach && d < bd) (bd = d), (best = o);
    }
  return best;
}

function chooseFoe(b, u) {
  if (u.target && alive(u.target) && !u.target.routed && b.random() < 0.85) return u.target;
  let best = null,
    score = -Infinity;
  for (const o of b.units) {
    if (!alive(o) || o.side === u.side) continue;
    if (o.onWall && UNITS[u.kind].range < 2) continue;
    const d = distance(o.pos, u.pos);
    let s = -d * 2 + weaponBonus(u, o) * 6 - o.troops / 4000 + (o.routed ? -6 : 0);
    // Horse looks for bows and the flanks.
    if (UNITS[u.kind].group === 'cav' && UNITS[o.kind].group === 'bow') s += 4;
    if (s > score) (score = s), (best = o);
  }
  return best;
}

// ——— The clock ———
/**
 * Move the battle on by `dt` seconds. The player's units follow his orders (see `command`); every other unit is the
 * computer's. Returns the battle.
 */
export function stepBattle(b, dt, playerSide = -1) {
  if (b.over) return b;
  b.time += dt;
  // Fire: burns, spreads with the wind, and dies down.
  for (const key of Object.keys(b.fire)) {
    const h = +key;
    b.fire[h] -= dt;
    if (b.fire[h] <= 0) {
      delete b.fire[h];
      if (b.tiles[h] === 'ship' || b.tiles[h] === 'forest' || b.tiles[h] === 'camp') b.tiles[h] = b.tiles[h] === 'ship' ? 'water' : 'plain';
      continue;
    }
    if (b.random() < dt * 0.35) {
      const n = neighbours(h);
      const downwind = n[b.wind % n.length];
      for (const next of [downwind, n[Math.floor(b.random() * n.length)]])
        if (next !== undefined && !b.fire[next] && (TERRAIN[b.tiles[next]].burn || b.tiles[next] === 'camp')) b.fire[next] = TERRAIN[b.tiles[next]].burn ? 12 : 6;
    }
    if (b.depot && h === b.depot.at) {
      b.depot.hp -= dt * 30;
      if (b.depot.hp <= 0 && !b.depot.burnt) {
        b.depot.burnt = true;
        b.events.push({ t: b.time, kind: 'depotBurnt' });
      }
    }
  }
  for (const u of b.units) {
    if (!alive(u)) continue;
    for (const k in u.status) if ((u.status[k] -= dt) <= 0) delete u.status[k];
    u.buffs = u.buffs.filter((x) => (x.t -= dt) > 0);
    u.rage = Math.min(100, u.rage + dt * 1.6 * (1 + u.fx.rage / 100));
    if (b.fire[u.pos]) {
      const scorch = u.afloat || b.tiles[u.pos] === 'ship' ? 2.5 : 1;
      hurt(b, u, Math.round(u.start * 0.012 * dt * scorch * (UNITS[u.kind].special === 'fireweak' ? 3 : 1)), null);
      u.morale -= dt * 3;
      if (u.morale <= 0 && !u.routed) rout(b, u);
    }
    if (!alive(u)) continue;
    // Each unit thinks about once a second (the player's when they have nothing to do).
    u.think = (u.think ?? b.random()) - dt;
    if (u.think <= 0) {
      u.think = 1;
      if (u.side !== playerSide || u.routed || u.status.confuse > 0 || u.order === 'auto') think(b, u);
      else if (u.side === playerSide) playerThink(b, u);
    }
    if (u.status.stun > 0) continue;
    // Movement.
    if (u.path.length) {
      const kind = UNITS[u.kind],
        f = FORMATIONS[u.formation];
      u.step += dt * kind.spd * (1 + f.spd) * (1 + (u.fx.spd + buff(u, 'spd') * 100) / 100) * (0.97 + (u.mob ?? 45) / 1500) * (u.routed ? 1.2 : 1) * (u.status.fear > 0 ? 0.8 : 1);
      const next = u.path[0];
      const cost = moveCost(b, u, next);
      if (cost === Infinity || b.units.some((o) => o !== u && !o.gone && o.pos === next)) {
        u.path = [];
        u.step = 0;
      } else if (u.step >= cost) {
        u.step -= cost;
        u.pos = next;
        u.chargeSteps=(u.chargeSteps??0)+1;
        u.path.shift();
        u.onWall = b.tiles[next] === 'wall';
        u.charging = UNITS[u.kind].group === 'cav' && u.path.length === 0 && u.chargeSteps>=2;
      }
    } else u.step = 0;
    // Fighting.
    u.cd -= dt;
    if (u.cd > 0) continue;
    if (u.routed) continue;
    u.cd = 1.2 + b.random() * 0.2;
    if (b.gate && u.side === 0 && u.atGate && !b.gate.open && distance(u.pos, b.gate.at) <= 1) {
      const kind = UNITS[u.kind];
      const hit = (kind.special === 'gate' ? 30 : 2) * Math.pow(u.troops, 0.5) * 0.1 * (1 + u.fx.siege / 100);
      b.gate.hp -= hit;
      if (b.setup.presentation === 'nanpi-sunset') {
        b.events.push({ t: b.time, kind: 'structureHit', structure: 'gate', at: b.gate.at,
          unit: u.id, amount: hit, hp: Math.max(0, b.gate.hp) });
      }
      if (b.gate.hp <= 0) {
        b.gate.open = true;
        b.tiles[b.gate.at] = 'road';
        b.events.push({ t: b.time, kind: 'gateOpen' });
      }
      continue;
    }
    if (b.depot && u.side === 0 && !b.depot.burnt && distance(u.pos, b.depot.at) <= 1) {
      b.depot.hp -= 6 * Math.pow(u.troops, 0.5) * 0.1;
      if (b.random() < 0.3) b.fire[b.depot.at] = 10;
      if (b.depot.hp <= 0) {
        b.depot.burnt = true;
        b.events.push({ t: b.time, kind: 'depotBurnt' });
      }
      continue;
    }
    const range = UNITS[u.kind].range;
    let foe = u.target && alive(u.target) && distance(u.pos, u.target.pos) <= range ? u.target : nearestFoe(b, u, range);
    if (!foe) continue;
    // Shooting from a wall needs no line; at night archers see less.
    const scale = b.night && range > 1 ? 0.7 : 1;
    u.lastAttack={time:b.time,target:foe.id,kind:'normal'};
    hurt(b, foe, blow(b, u, foe, scale), u);
    // A blow in reach is answered.
    if (alive(foe) && !foe.routed && distance(u.pos, foe.pos) <= UNITS[foe.kind].range && distance(u.pos, foe.pos) === 1) {
      foe.lastAttack={time:b.time,target:u.id,kind:'retaliation'};
      hurt(b, u, blow(b, foe, u, 0.45 * (1 + foe.fx.counter / 100)), foe);
    }
  }
  // Holding the keep of a town.
  if (b.keep !== null) {
    const holder = b.units.find((o) => alive(o) && o.pos === b.keep);
    const defenderNear = b.units.some((o) => alive(o) && o.side === 1 && !o.routed && distance(o.pos, b.keep) <= 1);
    if (holder && holder.side === 0 && !defenderNear) b.keepHeld += dt;
    else b.keepHeld = Math.max(0, b.keepHeld - dt);
  }
  decide(b);
  return b;
}

/** A player's unit with an order: move, hold, or strike its target. */
function playerThink(b, u) {
  if (u.goal !== null) {
    if (u.pos === u.goal) {
      u.goal = null;
      u.path = [];
    } else u.path = findPath(b, u, u.goal);
  }
  if (u.order === 'attack' && u.target && alive(u.target)) {
    u.path = attackPath(b, u, u.target);
  } else if (u.order === 'attack') {
    u.order = 'auto';
  }
  if (u.order === 'hold' && u.goal === null) u.path = [];
  if (u.autoTactic && u.rage >= 100) for (const t of u.tactics) if (useTactic(b, u, t)) break;
}

/** The player's order for one of his units: 'move' to a hex, 'attack' a unit, 'hold', or 'auto'. */
export function command(b, unitId, what, arg) {
  const u = b.units[unitId];
  if (!u || !alive(u) || u.routed) return false;
  if(what==='move'&&(!Number.isInteger(arg)||arg<0||arg>=b.tiles.length||!canStand(b,u,arg)))return false;
  if(what==='attack'&&(!b.units[arg]||!alive(b.units[arg])||b.units[arg].side===u.side))return false;
  if(what==='formation'&&!formationAllowed(u.kind,arg))return false;
  if(!['move','attack','hold','auto','autoTactic','formation'].includes(what))return false;
  if (what === 'move') {
    const path = findPath(b, u, arg);
    if (!path.length && u.pos !== arg) return false;
    u.goal = arg;
    u.order = 'move';
    u.target = null;
    u.atGate = false;
    u.path = path;
  } else if (what === 'attack') {
    u.target = b.units[arg];
    u.goal = null;
    u.order = 'attack';
    u.path = attackPath(b, u, u.target);
  } else if (what === 'hold') {
    u.order = 'hold';
    u.goal = null;
    u.path = [];
    u.atGate = false;
  } else if (what === 'auto') {
    u.order = 'auto';
    u.goal = null;
  } else if (what === 'autoTactic') u.autoTactic = Boolean(arg);
  else if (what === 'formation' && FORMATIONS[arg]) u.formation = arg;
  return true;
}

/** Whether the battle is over, and who won. */
function decide(b) {
  const standing = (side) => b.units.some((u) => alive(u) && u.side === side && !u.routed);
  let winner = null,
    why = null;
  if (!standing(1)) (winner = 0), (why = 'broken');
  else if (!standing(0)) (winner = 1), (why = 'broken');
  else if (b.keepHeld >= 10) (winner = 0), (why = 'keep');
  else if (b.depot?.burnt) (winner = 0), (why = 'depot');
  else if (b.time >= b.limit) (winner = 1), (why = 'sunset');
  if (winner === null) return;
  b.over = { winner, why };
}

/** The outcome for the realm: each unit's troops and morale, and the fate of the generals on the losing side. */
export function outcome(b) {
  const w = b.over.winner;
  const units = b.units.map((u) => {
    const fates = {};
    const lost = u.side !== w;
    for (const g of [u.general, ...u.deputies].filter(Boolean)) {
      if (!lost) {
        fates[g] = 'ok';
        continue;
      }
      const foeCapture = Math.max(0, ...b.units.filter((o) => o.side === w).map((o) => o.fx.capture));
      const broken = u.end === 'destroyed' ? 0.35 : u.routed && !u.gone ? 0.25 : u.end === 'fled' ? 0.08 : 0.12;
      const escape = (GENERALS[g]?.stats.war ?? 50) / 300;
      const r = b.random();
      if (r < 0.03 + (u.end === 'destroyed' ? 0.05 : 0)) fates[g] = 'killed';
      else if (r < broken + foeCapture / 100 - escape) fates[g] = 'captured';
      else fates[g] = 'ok';
    }
    return { troops: Math.round(u.troops), morale: Math.round(Math.max(0, u.morale)), fates };
  });
  return { winner: w, why: b.over.why, units, gateTaken: Boolean(b.gate?.open) || b.over.why === 'keep', depot: b.depot?.burnt ?? false, seconds: Math.round(b.time), report:battleReport(b) };
}

/** Pure detailed statistics. Losses are net troops lost; damage includes subsequently healed casualties. */
export function battleReport(b) {
  const units=b.units.map(u=>({id:u.id,side:u.side,general:u.general,kind:u.kind,formation:u.formation,start:Math.round(u.start),remaining:Math.round(u.troops),losses:Math.round(u.start-u.troops),morale:Math.round(Math.max(0,u.morale)),end:u.end??(u.routed?'routed':'standing'),...u.record}));
  const sides=[0,1].map(side=>{const us=units.filter(u=>u.side===side),sum=k=>Math.round(us.reduce((a,u)=>a+(u[k]??0),0));return {side,start:sum('start'),remaining:sum('remaining'),losses:sum('losses'),damage:sum('damage'),taken:sum('taken'),healing:sum('healing'),counterHits:sum('counterHits'),flankHits:sum('flankHits'),charges:sum('charges'),tactics:sum('tactics')};});
  return {version:1,seconds:Math.round(b.time),winner:b.over?.winner??null,why:b.over?.why??null,units,sides,events:b.events.map(e=>({...e}))};
}

/** Fight a battle with the computer on both sides, at once. */
export function autoBattle(setup, state = null) {
  const b = createBattle(setup, state);
  for (let i = 0; i < 1600 && !b.over; i++) stepBattle(b, 0.25);
  if (!b.over) b.over = { winner: 1, why: 'sunset' };
  return outcome(b);
}
