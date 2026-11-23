// 路线（纯算式）：每条连线在地图上的走法——陆路沿着 land.mjs 的道路，水路顺着江河的水道，海路离岸绕一个弧——以及
// 沿线某一处的位置。画面用它摆行军的队伍，战斗用它找两军相遇的地方。
// Ways (by formula): how each link runs over the map — a road along the roads of land.mjs, a river link along the
// river's course, a sea lane in an arc off the shore — and the point a given share of the way along. The picture sets
// marching columns on it; a battle finds where two armies meet on it.
import { LINKS, NODES } from '../data/map.mjs';
import { RIVER_LINES, ROADS, landAt } from './land.mjs';

const lines = new Map();
const key = (a, b) => a + '>' + b;

function nearestOn(points, x, z) {
  let best = Infinity,
    at = 0;
  for (let i = 0; i < points.length; i++) {
    const d = (points[i][0] - x) ** 2 + (points[i][1] - z) ** 2;
    if (d < best) (best = d), (at = i);
  }
  return { at, d: Math.sqrt(best) };
}

function lineOf(link) {
  const a = NODES[link.a],
    b = NODES[link.b];
  if (link.kind === 'land') {
    const road = ROADS.find((r) => (r.a === link.a && r.b === link.b) || (r.a === link.b && r.b === link.a));
    if (road) return road.a === link.a ? road.line : road.line.slice().reverse();
  }
  if (link.kind === 'river') {
    // The river that passes nearest both places, between their nearest points.
    let best = null;
    for (const river of RIVER_LINES) {
      const pa = nearestOn(river.points, a.x, a.y),
        pb = nearestOn(river.points, b.x, b.y);
      const score = pa.d + pb.d;
      if (!best || score < best.score) best = { river, pa, pb, score };
    }
    if (best && best.score < 60) {
      const { river, pa, pb } = best;
      const part = pa.at <= pb.at ? river.points.slice(pa.at, pb.at + 1) : river.points.slice(pb.at, pa.at + 1).reverse();
      return [[a.x, a.y], ...part, [b.x, b.y]];
    }
  }
  // A sea lane: an arc bowed away from the land.
  const out = [];
  const mx = (a.x + b.x) / 2,
    mz = (a.y + b.y) / 2,
    len = Math.hypot(b.x - a.x, b.y - a.y);
  let nx = -(b.y - a.y) / len,
    nz = (b.x - a.x) / len;
  const s = {};
  landAt(mx + nx * len * 0.2, mz + nz * len * 0.2, s);
  if (!s.water) (nx = -nx), (nz = -nz);
  for (let i = 0; i <= 24; i++) {
    const t = i / 24,
      bow = Math.sin(t * Math.PI) * len * 0.18;
    out.push([a.x + (b.x - a.x) * t + nx * bow, a.y + (b.y - a.y) * t + nz * bow]);
  }
  return out;
}
for (const link of LINKS) {
  const line = lineOf(link);
  lines.set(key(link.a, link.b), line);
  lines.set(key(link.b, link.a), line.slice().reverse());
}

/** The line from one place to the next along their link, in map units. */
export function routeLine(from, to) {
  return lines.get(key(from, to)) ?? [
    [NODES[from].x, NODES[from].y],
    [NODES[to].x, NODES[to].y]
  ];
}

/** The point `share` (0..1) of the way along a line, and the heading there. */
export function along(line, share) {
  let total = 0;
  for (let i = 1; i < line.length; i++) total += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
  let goal = Math.max(0, Math.min(1, share)) * total;
  for (let i = 1; i < line.length; i++) {
    const dx = line[i][0] - line[i - 1][0],
      dz = line[i][1] - line[i - 1][1],
      l = Math.hypot(dx, dz);
    if (goal <= l || i === line.length - 1) {
      const t = l ? Math.min(1, goal / l) : 0;
      return { x: line[i - 1][0] + dx * t, z: line[i - 1][1] + dz * t, heading: Math.atan2(dx, dz) };
    }
    goal -= l;
  }
  return { x: line[0][0], z: line[0][1], heading: 0 };
}
