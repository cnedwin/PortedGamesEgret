// 一张桥的图纸：杆件是网格上两点之间的一段，节点就是杆件的端点（同一个格点就是同一个节点）。
// 网格一格半米，坐标用格数（整数），存档和比较都不会有小数误差。这里还有造价、检查、对称、撤销。
// A bridge's drawing: a member is a stretch between two points of the grid, and the nodes are the members' ends (the
// same grid point is the same node). A grid step is half a metre and points are kept in steps (whole numbers), so
// saving and comparing has no rounding. Also here: the cost, the checks, mirroring and undo.
import { MATERIALS, PIER_PRICE, PONTOON, memberPrice } from './materials.mjs';

export const GRID = 0.5;
export const key = (gx, gy) => `${gx},${gy}`;
export const toMetres = (g) => g * GRID;

/** An empty drawing. */
export const emptyDesign = () => ({ members: [], pontoons: [], piers: [] });

/** A copy that can be changed without touching the first. */
export const copyDesign = (d) => ({ members: d.members.map((m) => [...m]), pontoons: d.pontoons.map((p) => [...p]), piers: [...d.piers] });

/** The same member whichever end is given first. */
export function sameMember(m, x1, y1, x2, y2) {
  return (m[0] === x1 && m[1] === y1 && m[2] === x2 && m[3] === y2) || (m[0] === x2 && m[1] === y2 && m[2] === x1 && m[3] === y1);
}

/** Points that are fixed: the level's anchors, and the tops of the piers built. */
export function fixedPoints(level, design) {
  const out = level.anchors.map(([x, y]) => [x, y]);
  for (const i of design.piers) {
    const p = level.piers?.[i];
    if (p) out.push([p.x, p.top]);
  }
  return out;
}

/** Length of a member in metres. */
export const lengthOf = (m) => Math.hypot(m[2] - m[0], m[3] - m[1]) * GRID;

/** The taels a drawing costs: members, pontoons and piers. */
export function costOf(design) {
  let total = 0;
  for (const m of design.members) total += memberPrice(m[4], lengthOf(m));
  total += design.pontoons.length * PONTOON.price + design.piers.length * PIER_PRICE;
  return Math.round(total);
}

/** Whether a grid point is inside the ground of a level (a bank, the bed, a cliff, a pier built). */
export function inGround(level, design, gx, gy) {
  const x = gx * GRID,
    y = gy * GRID;
  for (const g of groundOf(level, design)) if (x > g.x0 + 1e-6 && x < g.x1 - 1e-6 && y > g.y0 + 1e-6 && y < g.y1 - 1e-6) return true;
  return false;
}

/** The ground as rectangles in metres (y down): banks, bed, cliffs, and the piers that are built. */
export function groundOf(level, design = emptyDesign()) {
  const out = level.ground.map((g) => ({ ...g }));
  for (const i of design.piers) {
    const p = level.piers?.[i];
    if (p) out.push({ x0: p.x * GRID - 0.6, x1: p.x * GRID + 0.6, y0: p.top * GRID, y1: level.bed + 4, pier: true });
  }
  return out;
}

/**
 * Why a member could not be laid, or null when it can: `'short'`, `'long'`, `'outside'`, `'ground'`, `'same'`,
 * `'material'`, `'channel'` (it would close a boats' channel).
 */
export function whyNot(level, design, x1, y1, x2, y2, material) {
  if (!level.materials.includes(material)) return 'material';
  if (x1 === x2 && y1 === y2) return 'short';
  const len = Math.hypot(x2 - x1, y2 - y1) * GRID;
  if (len > MATERIALS[material].maxLength + 1e-6) return 'long';
  const a = level.area;
  for (const [x, y] of [
    [x1, y1],
    [x2, y2]
  ])
    if (x < a.x0 || x > a.x1 || y < a.y0 || y > a.y1) return 'outside';
  // Ends may sit on the ground's surface or on an anchor, never inside it; the middle may not pass through it.
  for (let s = 0; s <= 8; s++) {
    const gx = x1 + ((x2 - x1) * s) / 8,
      gy = y1 + ((y2 - y1) * s) / 8;
    if (inGround(level, design, gx, gy)) return 'ground';
  }
  if (design.members.some((m) => sameMember(m, x1, y1, x2, y2))) return 'same';
  if (level.channel && crossesChannel(level, x1 * GRID, y1 * GRID, x2 * GRID, y2 * GRID)) return 'channel';
  return null;
}

/** Whether a segment, metres, passes through the boats' channel. */
export function crossesChannel(level, ax, ay, bx, by) {
  const c = level.channel;
  if (!c) return false;
  const top = level.water - c.clear,
    bottom = level.water + 1;
  // Clip the segment to the channel's box.
  let t0 = 0,
    t1 = 1;
  const dx = bx - ax,
    dy = by - ay;
  for (const [p, q] of [
    [-dx, ax - c.x0],
    [dx, c.x1 - ax],
    [-dy, ay - top],
    [dy, bottom - ay]
  ]) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r);
      else t1 = Math.min(t1, r);
    }
  }
  return t0 < t1 - 1e-6;
}

/** Whether a pontoon may go at a grid point: on the water's line, in the river, out of the channel. */
export function pontoonAllowed(level, gx, gy) {
  if (!level.pontoons) return false;
  const x = gx * GRID;
  if (Math.abs(gy * GRID - (level.water - 0.5)) > 1e-6) return false;
  if (x <= level.gap.x0 + 0.5 || x >= level.gap.x1 - 0.5) return false;
  if (level.channel && x > level.channel.x0 - 1 && x < level.channel.x1 + 1) return false;
  return true;
}

/** The drawing turned about the middle of the gap. */
export function mirrored(level, design) {
  const mid = (level.gap.x0 + level.gap.x1) / GRID; // twice the middle, in steps
  const out = copyDesign(design);
  const add = [];
  for (const m of design.members) {
    const n = [mid - m[0], m[1], mid - m[2], m[3], m[4]];
    if (!out.members.some((o) => sameMember(o, n[0], n[1], n[2], n[3])) && !add.some((o) => sameMember(o, n[0], n[1], n[2], n[3]))) add.push(n);
  }
  out.members.push(...add);
  for (const p of design.pontoons) {
    const n = [mid - p[0], p[1]];
    if (!out.pontoons.some((o) => o[0] === n[0] && o[1] === n[1])) out.pontoons.push(n);
  }
  return out;
}

/** Changes that can be taken back and done again. */
export function createHistory(start = emptyDesign(), limit = 200) {
  const back = [],
    ahead = [];
  let now = copyDesign(start);
  return {
    get design() {
      return now;
    },
    /** Make a change: `change(copy)` alters a copy, which becomes the drawing. */
    change(fn) {
      const next = copyDesign(now);
      if (fn(next) === false) return false;
      back.push(now);
      if (back.length > limit) back.shift();
      ahead.length = 0;
      now = next;
      return true;
    },
    undo() {
      if (!back.length) return false;
      ahead.push(now);
      now = back.pop();
      return true;
    },
    redo() {
      if (!ahead.length) return false;
      back.push(now);
      now = ahead.pop();
      return true;
    },
    get canUndo() {
      return back.length > 0;
    },
    get canRedo() {
      return ahead.length > 0;
    },
    reset(d = emptyDesign()) {
      back.length = 0;
      ahead.length = 0;
      now = copyDesign(d);
    }
  };
}

/** A drawing kept in a save: plain arrays, checked when read back. */
export function readDesign(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.members)) return emptyDesign();
  const whole = (n) => Number.isInteger(n) && Math.abs(n) < 2000;
  const members = value.members.filter((m) => Array.isArray(m) && m.length === 5 && m.slice(0, 4).every(whole) && typeof m[4] === 'string' && MATERIALS[m[4]]);
  const pontoons = Array.isArray(value.pontoons) ? value.pontoons.filter((p) => Array.isArray(p) && p.length === 2 && p.every(whole)) : [];
  const piers = Array.isArray(value.piers) ? value.piers.filter((i) => Number.isInteger(i) && i >= 0 && i < 16) : [];
  return { members: members.map((m) => [...m]), pontoons: pontoons.map((p) => [...p]), piers: [...new Set(piers)] };
}

/** What is wrong with a drawing as a whole: each member that could not have been laid, and why. */
export function problemsOf(level, design) {
  const out = [];
  design.members.forEach((m, i) => {
    const others = { ...design, members: design.members.filter((_, j) => j !== i) };
    const why = whyNot(level, others, m[0], m[1], m[2], m[3], m[4]);
    if (why) out.push({ member: m, why });
  });
  for (const p of design.pontoons) if (!pontoonAllowed(level, p[0], p[1])) out.push({ pontoon: p, why: 'pontoon' });
  return out;
}
