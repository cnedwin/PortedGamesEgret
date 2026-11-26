// 几种常见的桥式，按跨度和高度生成图纸：桁架（三角格）、石拱、悬索、浮桥、墩上桁架。
// 每关的参考解就是用这些拼出来的；测试在 Node 里让参考解跑一遍试通，保证每关都过得去，造价也由它定。
// Common kinds of bridge, drawn from a span and a height: trusses (rows of triangles), stone arches, suspension
// bridges, pontoon bridges, trusses on piers. Each level's reference solution is made from these; the tests send it
// across in Node, so every level can be passed, and its cost sets the level's budget.
import { GRID, emptyDesign, sameMember } from './design.mjs';

const g = (m) => Math.round(m / GRID);

/** A drawing being made in metres: members are added once, ends snapped to the grid. */
export function sketch() {
  const d = emptyDesign();
  const api = {
    design: d,
    line(x1, y1, x2, y2, material) {
      const m = [g(x1), g(y1), g(x2), g(y2), material];
      if (m[0] === m[2] && m[1] === m[3]) return api;
      if (!d.members.some((o) => sameMember(o, m[0], m[1], m[2], m[3]))) d.members.push(m);
      return api;
    },
    /** A path through points, each step one member. */
    path(points, material) {
      for (let i = 1; i < points.length; i++) api.line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], material);
      return api;
    },
    pontoon(x, y) {
      d.pontoons.push([g(x), g(y)]);
      return api;
    },
    pier(i) {
      if (!d.piers.includes(i)) d.piers.push(i);
      return api;
    }
  };
  return api;
}

/** Points from a to b in `n` equal steps. */
export const along = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);

/**
 * A truss over the deck from `a` to `b` (metres): `panels` deck members, triangles of height `depth` above (or below,
 * with `below`). `kind` 'warren' puts one node over the middle of each panel; 'pratt' a node over each deck node with
 * diagonals.
 */
export function truss(s, a, b, { panels, depth, deck = 'plank', chord = 'wood', web = chord, below = false, kind = 'warren' }) {
  const deckPoints = along(a, b, panels);
  s.path(deckPoints, deck);
  const up = below ? 1 : -1;
  if (kind === 'warren') {
    const tops = [];
    for (let i = 0; i < panels; i++) {
      const p = deckPoints[i],
        q = deckPoints[i + 1];
      tops.push([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2 + up * depth]);
    }
    s.path(tops, chord);
    for (let i = 0; i < panels; i++) {
      s.line(deckPoints[i][0], deckPoints[i][1], tops[i][0], tops[i][1], web);
      s.line(tops[i][0], tops[i][1], deckPoints[i + 1][0], deckPoints[i + 1][1], web);
    }
  } else {
    const tops = deckPoints.slice(1, -1).map(([x, y]) => [x, y + up * depth]);
    s.path([deckPoints[0], ...tops, deckPoints[panels]], chord);
    for (let i = 1; i < panels; i++) {
      s.line(deckPoints[i][0], deckPoints[i][1], tops[i - 1][0], tops[i - 1][1], web);
      // Diagonals lean toward the middle.
      const toward = i < panels / 2 ? i + 1 : i - 1;
      if (toward > 0 && toward < panels) s.line(tops[i - 1][0], tops[i - 1][1], deckPoints[toward][0], deckPoints[toward][1], web);
    }
  }
  return s;
}

/**
 * A stone arch from springing `a` to springing `c` (metres), rising `rise`, laid in `pieces` stones, with posts of
 * `post` up to a deck of `deck` from `d0` to `d1`.
 */
export function arch(s, a, c, rise, pieces, { deck = 'slab', post = 'stone', d0, d1, panels, braced = true, ring = 0 }) {
  let pts = [];
  for (let i = 0; i <= pieces; i++) {
    const t = i / pieces,
      x = a[0] + (c[0] - a[0]) * t,
      base = a[1] + (c[1] - a[1]) * t;
    pts.push([x, base - rise * 4 * t * (1 - t)]);
  }
  s.path(pts, 'stone');
  // A thick arch: a second ring of stones above the first, the two tied by stones across and on the slant.
  if (ring > 0) {
    const outer = pts.map(([x, y], i) => (i === 0 || i === pieces ? [x, y] : [x, y - ring]));
    s.path(outer, 'stone');
    for (let i = 1; i < pieces; i++) {
      s.line(pts[i][0], pts[i][1], outer[i][0], outer[i][1], 'stone');
      const j = i < pieces / 2 ? i + 1 : i - 1;
      s.line(pts[i][0], pts[i][1], outer[j][0], outer[j][1], 'stone');
    }
    pts = outer;
  }
  const deckPoints = along(d0, d1, panels);
  s.path(deckPoints, deck);
  // A post from each deck node down to the arch below it, where the arch is below the deck.
  for (const [x, y] of deckPoints.slice(1, -1)) {
    let best = pts[0];
    for (const p of pts) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p;
    if (Math.abs(best[0] - x) < 0.3 && best[1] > y + 0.4) s.line(x, y, best[0], best[1], post);
    else if (Math.abs(best[1] - y) <= 0.4 && Math.abs(best[0] - x) < 0.3) s.line(x, y, best[0], best[1], post);
    // Braces from the deck to the arch stones either side, so the space between is all triangles.
    if (braced)
      for (const p of pts) {
        const dx = Math.abs(p[0] - x),
          len = Math.hypot(p[0] - x, p[1] - y);
        if (dx > 0.3 && dx < 1.3 && p[1] > y + 0.4 && len <= 2.5) s.line(x, y, p[0], p[1], post);
      }
  }
  return s;
}

/**
 * A suspension bridge: a cable of `cable` from tower `t0` to tower `t1` (metres), sagging to `low`, with `panels`
 * deck members from `d0` to `d1` hung on `hanger`s.
 */
export function suspension(s, t0, t1, low, d0, d1, { panels, cable = 'chain', hanger = 'rope', deck = 'plank' }) {
  const deckPoints = along(d0, d1, panels);
  s.path(deckPoints, deck);
  const cablePoints = [t0];
  for (const [x] of deckPoints.slice(1, -1)) {
    const t = (x - t0[0]) / (t1[0] - t0[0]),
      straight = t0[1] + (t1[1] - t0[1]) * t,
      sag = (low - (t0[1] + t1[1]) / 2) * 4 * t * (1 - t);
    cablePoints.push([x, straight + sag]);
  }
  cablePoints.push(t1);
  s.path(cablePoints, cable);
  deckPoints.slice(1, -1).forEach(([x, y], i) => {
    const c = cablePoints[i + 1];
    if (c[1] < y - 0.3) s.line(c[0], c[1], x, y, hanger);
  });
  return s;
}
