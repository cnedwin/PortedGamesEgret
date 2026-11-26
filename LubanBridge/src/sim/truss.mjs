// 桥身：节点是有质量的点，杆件是两点之间的约束。用小步长的位置约束法（每步一轮，每帧很多小步），
// 每根杆件这一步出了多少力是直接算出来的，所以能按材料判断拉断、压坏。纯计算，不碰引擎和页面，Node 里结果一样。
// The bridge's frame: nodes are points with mass, members are constraints between two of them. Solved by position
// constraints in many small steps (one round a step, many steps a frame), so the force each member carried in a step
// comes straight out of the solve, and whether it tore or crushed is judged by its material. Pure arithmetic: no
// engine and no page, the same in Node.
import { MATERIALS, PONTOON, compressionOf } from './materials.mjs';

const GRAVITY = 9.8;
/** Speed lost each second in the air, and in water. */
const AIR_DAMPING = 0.25,
  WATER_DAMPING = 2.5;
/** A force that lasts this many seconds or longer counts toward breaking: a single jolt of one small step does not. */
const SETTLE = 0.04;
/** Newtons a metre that hold a roller where it was built. */
const ROLLER_HOLD = 3000;

/**
 * Make a frame. `nodes`: [{ x, y, fixed, pontoon, mass }]. `members`: [{ a, b, material }], a and b indexes of nodes.
 * `ground`: rectangles nodes may not pass into ({ x0, y0, x1, y1 }, y down). `water`: the water's surface (y), or
 * undefined.
 */
export function createTruss({ nodes, members, ground = [], water }) {
  const N = nodes.map((n) => ({
    x: n.x,
    y: n.y,
    px: n.x,
    py: n.y,
    vx: 0,
    vy: 0,
    fixed: !!n.fixed && !n.roller,
    /** A roller holds its height and lets the bridge slide along it, as a beam laid on a bank does. */
    roller: !!n.roller,
    x0: n.x,
    y0: n.y,
    pontoon: !!n.pontoon,
    mass: n.mass,
    w: n.fixed && !n.roller ? 0 : 1 / Math.max(1, n.mass),
    fx: 0,
    fy: 0
  }));
  const M = members.map((m, i) => {
    const a = N[m.a],
      b = N[m.b],
      length = Math.hypot(b.x - a.x, b.y - a.y),
      mat = MATERIALS[m.material];
    return {
      index: i,
      a: m.a,
      b: m.b,
      material: m.material,
      length,
      compliance: length / mat.stiffness,
      rope: !!mat.rope,
      tension: mat.tension,
      compression: compressionOf(m.material, length),
      /** The pull (+) or push (−) of the last step, newtons, and the same held over a short while. */
      force: 0,
      held: 0,
      broken: false,
      hidden: false
    };
  });
  // Stones laid in a line are mortared: a hidden tie across each joint keeps the line from folding.
  const ties = [];
  const byNode = N.map(() => []);
  for (const m of M) if (MATERIALS[m.material].mortar) byNode[m.a].push(m), byNode[m.b].push(m);
  for (let n = 0; n < N.length; n++) {
    const list = byNode[n];
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const p = list[i],
          q = list[j],
          far1 = p.a === n ? p.b : p.a,
          far2 = q.a === n ? q.b : q.a;
        const ax = N[far1].x - N[n].x,
          ay = N[far1].y - N[n].y,
          bx = N[far2].x - N[n].x,
          by = N[far2].y - N[n].y;
        const cos = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by));
        // Only stones meeting nearly end to end, as in an arch or a line of slabs.
        if (cos > -0.7) continue;
        const length = Math.hypot(N[far2].x - N[far1].x, N[far2].y - N[far1].y);
        ties.push({ a: far1, b: far2, length, compliance: length / (MATERIALS[p.material].stiffness * 1.0), parts: [p, q] });
      }
  }

  let flip = false;
  function solve(c, h, isMember) {
    const a = N[c.a],
      b = N[c.b],
      dx = b.x - a.x,
      dy = b.y - a.y,
      len = Math.hypot(dx, dy) || 1e-9,
      C = len - c.length;
    if (isMember && c.rope && C < 0) {
      c.force = 0;
      return;
    }
    const wsum = a.w + b.w;
    if (wsum === 0) {
      c.force = isMember ? -C / c.compliance : 0;
      return;
    }
    const alpha = c.compliance / (h * h),
      dl = -C / (wsum + alpha),
      nx = dx / len,
      ny = dy / len;
    a.x -= dl * a.w * nx;
    a.y -= dl * a.w * ny;
    b.x += dl * b.w * nx;
    b.y += dl * b.w * ny;
    if (isMember) c.force = -dl / (h * h);
  }

  /** One small step of `h` seconds. Loads given by `load` since the last step are applied and cleared. */
  function step(h, settle = 1) {
    for (const n of N) {
      if (n.fixed) continue;
      // A roller is held back only a little by its bearing.
      if (n.roller) n.fx -= ROLLER_HOLD * (n.x - n.x0);
      let ax = n.fx * n.w,
        ay = GRAVITY + n.fy * n.w;
      const wet = water !== undefined && n.y > water;
      if (n.pontoon && water !== undefined) {
        // A pontoon floats where it was built, holding its own share; more weight sinks it, up to its whole freeboard.
        const sink = Math.min(PONTOON.travel, n.y - n.y0),
          lift = Math.max(0, n.mass * GRAVITY * settle + PONTOON.spring * sink);
        ay -= lift * n.w;
      }
      n.vx += ax * h;
      n.vy += ay * h;
      const damp = Math.exp(-(wet || n.pontoon ? WATER_DAMPING : AIR_DAMPING) * h);
      n.vx *= damp;
      n.vy *= damp;
      n.px = n.x;
      n.py = n.y;
      n.x += n.vx * h;
      n.y += n.vy * h;
      n.fx = 0;
      n.fy = 0;
    }
    // One round, alternating its order each step, so no end of the bridge is favoured.
    flip = !flip;
    if (flip) {
      for (let i = 0; i < M.length; i++) if (!M[i].broken) solve(M[i], h, true);
      for (let i = 0; i < ties.length; i++) if (!ties[i].broken) solve(ties[i], h, false);
    } else {
      for (let i = ties.length - 1; i >= 0; i--) if (!ties[i].broken) solve(ties[i], h, false);
      for (let i = M.length - 1; i >= 0; i--) if (!M[i].broken) solve(M[i], h, true);
    }
    for (const n of N) {
      if (n.fixed) continue;
      if (n.roller) {
        // It slides on the bank, a little held back by friction. Pulled half a metre into the gap, it drops off the
        // bank's edge and is a loose end from then on.
        if (n.x < n.x0 - 0.5) n.roller = false;
        else {
          n.y = n.y0;
          n.x = Math.min(n.x0 + 1, n.x);
        }
      }
      // The banks and the riverbed: a node that went in comes back out on the nearest face, and slows.
      for (const g of n.roller ? [] : ground)
        if (n.x > g.x0 && n.x < g.x1 && n.y > g.y0 && n.y < g.y1) {
          const out = [n.y - g.y0, g.y1 - n.y, n.x - g.x0, g.x1 - n.x],
            k = out.indexOf(Math.min(...out));
          if (k === 0) n.y = g.y0;
          else if (k === 1) n.y = g.y1;
          else if (k === 2) n.x = g.x0;
          else n.x = g.x1;
          n.px += (n.x - n.px) * 0.6;
          n.py += (n.y - n.py) * 0.6;
        }
      n.vx = (n.x - n.px) / h;
      n.vy = (n.y - n.py) / h;
    }
    const keep = Math.min(1, h / SETTLE);
    const broke = [];
    for (const m of M) {
      if (m.broken) continue;
      m.held += (m.force - m.held) * keep;
      if (m.held > m.tension || -m.held > m.compression) {
        m.broken = true;
        broke.push(m);
      }
    }
    if (broke.length) for (const t of ties) if (!t.broken && t.parts.some((p) => p.broken)) t.broken = true;
    return broke;
  }

  /** Push a node by a force, in newtons, for the next step. */
  function load(node, fx, fy) {
    N[node].fx += fx;
    N[node].fy += fy;
  }

  /** How hard each member works: its held force against what it takes, −1 (crushing) to 1 (tearing). */
  function strain(m) {
    if (m.held >= 0) return m.tension > 0 ? m.held / m.tension : 0;
    return m.compression > 0 ? m.held / m.compression : -1;
  }

  return { nodes: N, members: M, ties, step, load, strain };
}
