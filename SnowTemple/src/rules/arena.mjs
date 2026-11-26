// The ground the chapter is played on: where one can walk, what stands in the way, and where things are.
// Distances are metres. The hero starts in the south (+z) and climbs north (-z) to the temple.

/** Places of the chapter. */
export const PLACES = {
  start: { x: 0, z: 34 },
  camp: { x: 2.6, z: 30.5 }, // the first brazier
  yard: { x: 0, z: 8 }, // the fodder yard, where the hired men wait
  rest: { x: -3.2, z: -7.4 }, // the brazier by the temple gate
  gate: { x: 0, z: -11.5 },
  court: { x: 0, z: -29 }, // the temple forecourt
  temple: { x: 0, z: -46 }
};

/** Walkable ground is the smooth union of these discs. */
export const ZONES = [
  { x: 0, z: 34, r: 5 },
  { x: -0.6, z: 27, r: 4.6 },
  { x: 0.8, z: 20.5, r: 4.8 },
  { x: 0, z: 9, r: 11.5 },
  { x: -6, z: 4, r: 8.5 },
  { x: 6.5, z: 5, r: 8 },
  { x: 0, z: -5, r: 5.4 },
  { x: 0, z: -11.5, r: 3.6 },
  { x: 0, z: -17.5, r: 4.6 },
  { x: 0, z: -29, r: 12.5 },
  { x: -7, z: -27, r: 8 },
  { x: 7, z: -27, r: 8 }
];

/** Things with a round footprint: `kind` tells the view what to build there. */
export const ROUNDS = [
  { kind: 'stack', x: -6.5, z: 12.5, r: 1.9 },
  { kind: 'stack', x: 7.2, z: 9.8, r: 1.7 },
  { kind: 'cart', x: 4.2, z: 2.2, r: 1.5 },
  { kind: 'rock', x: -4.2, z: 4.6, r: 1.3 },
  { kind: 'pine', x: 9.4, z: 0.2, r: 0.8 },
  { kind: 'pine', x: -10.4, z: 9.4, r: 0.8 },
  { kind: 'brazier', x: PLACES.camp.x, z: PLACES.camp.z, r: 0.55 },
  { kind: 'brazier', x: PLACES.rest.x, z: PLACES.rest.z, r: 0.55 },
  { kind: 'censer', x: 0, z: -34.5, r: 1.1 },
  { kind: 'lion', x: -5.2, z: -19.6, r: 1 },
  { kind: 'lion', x: 5.2, z: -19.6, r: 1 },
  { kind: 'pine', x: -9.2, z: -33.6, r: 0.9 },
  { kind: 'stele', x: 8.6, z: -34.2, r: 0.9 },
  { kind: 'lantern', x: -2.9, z: 22.4, r: 0.4 },
  { kind: 'lantern', x: 3.4, z: -2.6, r: 0.4 },
  { kind: 'lantern', x: -3.6, z: -16.2, r: 0.4 },
  { kind: 'lantern', x: 3.6, z: -16.2, r: 0.4 },
  { kind: 'lantern', x: -9.6, z: -24, r: 0.4 },
  { kind: 'lantern', x: 9.6, z: -24, r: 0.4 }
];

/** Walls, as fat line segments. The gate's two wings leave the doorway between them. */
export const WALLS = [
  { ax: -9, az: -11.5, bx: -1.9, bz: -11.5, r: 0.7 },
  { ax: 1.9, az: -11.5, bx: 9, bz: -11.5, r: 0.7 },
  { ax: -8, az: 15.5, bx: -3.2, bz: 16.4, r: 0.45 }, // what is left of the yard fence
  { ax: 3.6, az: 16.2, bx: 8.4, bz: 14.8, r: 0.45 }
];

/** The bar across the doorway, and the one that drops behind the hero in the forecourt. */
export const BARS = {
  gate: { ax: -1.9, az: -11.5, bx: 1.9, bz: -11.5, r: 0.7 },
  court: { ax: -3, az: -19.4, bx: 3, bz: -19.4, r: 0.8 }
};

const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};

/** Signed distance to the edge of the walkable ground: negative inside. */
export function edge(x, z) {
  let d = 1e9;
  for (const zone of ZONES) d = smin(d, Math.hypot(x - zone.x, z - zone.z) - zone.r, 2.2);
  return d;
}

function pushFromSegment(p, wall, radius) {
  const dx = wall.bx - wall.ax,
    dz = wall.bz - wall.az,
    t = Math.max(0, Math.min(1, ((p.x - wall.ax) * dx + (p.z - wall.az) * dz) / (dx * dx + dz * dz))),
    cx = wall.ax + dx * t,
    cz = wall.az + dz * t,
    ox = p.x - cx,
    oz = p.z - cz,
    d = Math.hypot(ox, oz),
    need = wall.r + radius;
  if (d >= need) return;
  if (d < 1e-5) p.z += need;
  else {
    p.x = cx + (ox / d) * need;
    p.z = cz + (oz / d) * need;
  }
}

/**
 * Move a body of the given radius out of whatever it overlaps, in place. `bars` are the closed bars.
 * Returns the same object.
 */
export function settle(p, radius, bars = []) {
  for (let pass = 0; pass < 2; pass++) {
    for (const round of ROUNDS) {
      const ox = p.x - round.x,
        oz = p.z - round.z,
        d = Math.hypot(ox, oz),
        need = round.r + radius;
      if (d < need) {
        if (d < 1e-5) p.z += need;
        else {
          p.x = round.x + (ox / d) * need;
          p.z = round.z + (oz / d) * need;
        }
      }
    }
    for (const wall of WALLS) pushFromSegment(p, wall, radius);
    for (const bar of bars) pushFromSegment(p, bar, radius);
    // The edge of the ground: step back along the slope of the distance field.
    const over = edge(p.x, p.z) + radius;
    if (over > 0) {
      const e = 0.05,
        gx = edge(p.x + e, p.z) - edge(p.x - e, p.z),
        gz = edge(p.x, p.z + e) - edge(p.x, p.z - e),
        g = Math.hypot(gx, gz) || 1;
      p.x -= (gx / g) * over;
      p.z -= (gz / g) * over;
    }
  }
  return p;
}

/** Stone that meltwater keeps wet: `[x, z, reach]`, a little longer along the way than across it. */
export const WET = [
  [-1.2, -11.7, 1.5],
  [1.5, -16.5, 1.24],
  [-5.8, -24.9, 2.0],
  [7.2, -31.5, 1.9],
  [-4.3, -36, 1.66],
  [0.1, 1.55, 1.25]
];
/** Whether a point is on wet stone, where a dodge slides farther. */
export const wet = (x, z) => WET.some(([px, pz, reach]) => Math.hypot(x - px, (z - pz) * 0.78) < reach);

/** What burns all night: the two braziers and the fodder stack that is still alight. */
export const FLAMES = [
  { x: PLACES.camp.x, z: PLACES.camp.z, r: 0.55 },
  { x: PLACES.rest.x, z: PLACES.rest.z, r: 0.55 },
  { x: 7.2, z: 9.8, r: 1.7 }
];
/** Whether something as big as a stack or a rock stands at a point: an arrow stops there. */
export const cover = (x, z) => ROUNDS.some((round) => round.r >= 1.2 && Math.hypot(x - round.x, z - round.z) < round.r);
