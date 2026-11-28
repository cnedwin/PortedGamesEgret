// The toy island: one height grid shared by the drawn mesh, the physics
// triangle mesh and the simulation's own ground queries, so all three agree.
import { createGeometry3D } from '@egret/engine/world3d';

export const ISLAND = Object.freeze({
  half: 56, // the grid covers [-half, half] on x and z
  cells: 112, // one cell per metre
  sea: -1.1, // height of the water surface
  shore: 37, // beyond this radius the beach slopes into the sea
  playRadius: 35, // spawns and wandering stay inside this radius
});

const bump = (x, z, cx, cz, radius, height) => {
  const d = ((x - cx) ** 2 + (z - cz) ** 2) / (radius * radius);
  return height * Math.exp(-d);
};
const smooth = (a, b, t) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/** The designed height before it is sampled into the grid. */
function designHeight(x, z) {
  const r = Math.hypot(x, z);
  let top =
    0.35 +
    bump(x, z, 15, -11, 9, 2.4) +
    bump(x, z, -17, 12, 8, 1.9) +
    bump(x, z, -6, -21, 6.5, 1.5) +
    bump(x, z, 21, 17, 6, 1.3) -
    bump(x, z, 2, 6, 7, 0.5) +
    0.12 * Math.sin(x * 0.45) * Math.cos(z * 0.38);
  // A lumpy coastline keeps the island from reading as a perfect disc.
  const coast = ISLAND.shore + 2.2 * Math.sin(Math.atan2(z, x) * 3 + 0.6) + 1.2 * Math.cos(Math.atan2(z, x) * 5);
  const t = smooth(coast - 3, coast + 8, r);
  return top * (1 - t) + -4.5 * t;
}

const N = ISLAND.cells,
  STRIDE = N + 1,
  STEP = (ISLAND.half * 2) / N;
const heights = new Float32Array(STRIDE * STRIDE);
for (let j = 0; j <= N; j++)
  for (let i = 0; i <= N; i++) heights[j * STRIDE + i] = designHeight(-ISLAND.half + i * STEP, -ISLAND.half + j * STEP);

/**
 * Ground height at a point, interpolated across the same two triangles per
 * cell that the mesh draws. Outside the grid the sea bed continues flat.
 */
export function groundHeight(x, z) {
  const fx = (x + ISLAND.half) / STEP,
    fz = (z + ISLAND.half) / STEP;
  if (!(fx >= 0 && fz >= 0 && fx < N && fz < N)) return -4.5;
  const i = fx | 0,
    j = fz | 0,
    u = fx - i,
    v = fz - j,
    k = j * STRIDE + i;
  const a = heights[k],
    b = heights[k + 1],
    c = heights[k + STRIDE],
    d = heights[k + STRIDE + 1];
  // The cell splits along the diagonal from (i, j+1) to (i+1, j).
  return u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
}

/** Downhill direction and steepness at a point, written to `out` as [dx, dz]. */
export function groundSlope(x, z, out) {
  const e = 0.6;
  out[0] = (groundHeight(x - e, z) - groundHeight(x + e, z)) / (2 * e);
  out[1] = (groundHeight(x, z - e) - groundHeight(x, z + e)) / (2 * e);
  return out;
}

export const isWater = (x, z) => groundHeight(x, z) < ISLAND.sea - 0.25;

/** Pull a point back onto dry land when it lies past the play radius. */
export function clampToLand(point, radius = ISLAND.playRadius) {
  const r = Math.hypot(point[0], point[2]);
  if (r > radius) {
    point[0] *= radius / r;
    point[2] *= radius / r;
  }
  return point;
}

/** The island mesh: positions, grass-to-sand vertex colours and indices. */
export function createIslandGeometry() {
  const positions = new Float32Array(STRIDE * STRIDE * 3),
    colors = new Float32Array(STRIDE * STRIDE * 3),
    uvs = new Float32Array(STRIDE * STRIDE * 2);
  const indices = new Uint32Array(N * N * 6);
  for (let j = 0; j <= N; j++)
    for (let i = 0; i <= N; i++) {
      const k = j * STRIDE + i,
        h = heights[k],
        x = -ISLAND.half + i * STEP,
        z = -ISLAND.half + j * STEP;
      positions[k * 3] = x;
      positions[k * 3 + 1] = h;
      positions[k * 3 + 2] = z;
      uvs[k * 2] = i / 4;
      uvs[k * 2 + 1] = j / 4;
      // Grass on top, pale sand along the beach, darker wet sand under water.
      const beach = smooth(0.25, -0.5, h),
        wet = smooth(ISLAND.sea + 0.2, ISLAND.sea - 1.2, h),
        patch = 0.5 + 0.5 * Math.sin(x * 0.7 + Math.sin(z * 0.5) * 2) * Math.cos(z * 0.6);
      // A softly edged biscuit trail loops around the toy garden; colour is
      // purely visual. The height grid and collision triangles stay identical.
      const angle=Math.atan2(z,x), distance=Math.hypot(x,z);
      const ringRadius=18+1.8*Math.sin(angle*3)+.8*Math.sin(angle*5);
      const ring=1-smooth(1.05,2.35,Math.abs(distance-ringRadius));
      const radial=Math.abs(Math.sin((angle+.32)*1.5))*distance;
      const spoke=(1-smooth(.75,1.8,radial))*smooth(2.5,5,distance)*(1-smooth(15,19,distance));
      const landing=(1-smooth(2.3,4.5,distance))*.7;
      const trail=Math.max(ring,spoke*.78,landing)*(1-beach);
      const meadow=.5+.5*Math.sin(x*.12+z*.15);
      let r=.32+.10*patch+.05*meadow,
        g=.67+.08*patch+.05*meadow,
        b=.38+.07*(1-meadow);
      r+=(.82+.025*patch-r)*trail;
      g+=(.73+.025*patch-g)*trail;
      b+=(.55+.035*patch-b)*trail;
      r += (0.96 - r) * beach;
      g += (0.86 - g) * beach;
      b += (0.6 - b) * beach;
      r += (0.55 - r) * wet;
      g += (0.62 - g) * wet;
      b += (0.5 - b) * wet;
      // Written as screen colours; the renderer lights linear values.
      colors[k * 3] = Math.pow(r, 2.2);
      colors[k * 3 + 1] = Math.pow(g, 2.2);
      colors[k * 3 + 2] = Math.pow(b, 2.2);
    }
  let o = 0;
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const a = j * STRIDE + i,
        b = a + 1,
        c = a + STRIDE,
        d = c + 1;
      indices[o++] = a;
      indices[o++] = c;
      indices[o++] = b;
      indices[o++] = b;
      indices[o++] = c;
      indices[o++] = d;
    }
  return createGeometry3D({ positions, colors, uvs, indices });
}

/**
 * Length of the flat vector (x, z). The rules ask for this thousands of times
 * a step, and it is several times quicker than Math.hypot.
 */
export const span = (x, z) => Math.sqrt(x * x + z * z);
