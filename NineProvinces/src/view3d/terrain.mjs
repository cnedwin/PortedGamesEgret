// 地形：按镜头远近加载的地块（每块 64 个单位见方，每个单位一个采样点），高度和颜色都由 sim/land.mjs 算出；地面材质在
// 像素上补上草地、泥土、岩石的细纹，再画出六角格的细线、鼠标所指和选中的格子，以及打仗时战场的范围。
// The land: tiles loaded around the view (64 units square, a sample every unit), their heights and colours worked out
// by sim/land.mjs; the ground material adds the fine grain of grass, earth and rock per pixel, then draws the thin lines
// of the hex grid, the hex under the pointer and the chosen one, and the bounds of the battlefield during a battle.
import { createCustomShader3D, createHeightField3D, createStandardMaterial3D, createTerrainStream3D } from '@egret/engine/world3d';
import { HEX_H, HEX_R, HEX_W } from '../sim/hexgrid.mjs';
import { landAt } from '../sim/land.mjs';

export const TILE = 64;
const COLUMNS = TILE + 1;

const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
/** sRGB 0..255 triple to linear. */
const C = (r, g, b) => [lin(r / 255), lin(g / 255), lin(b / 255)];
const PAL = {
  grass: C(96, 124, 52),
  meadow: C(112, 138, 58),
  farm: C(158, 140, 82),
  steppe: C(150, 140, 84),
  sand: C(200, 168, 110),
  loess: C(168, 136, 92),
  plateau: C(132, 116, 92),
  rock: C(104, 96, 88),
  snow: C(236, 238, 242),
  forest: C(52, 74, 38),
  beach: C(196, 178, 134),
  marsh: C(96, 112, 74),
  bed: C(88, 96, 84),
  town: C(150, 136, 114),
  seabed: C(70, 96, 104)
};
const mix = (out, c, t) => {
  out[0] += (c[0] - out[0]) * t;
  out[1] += (c[1] - out[1]) * t;
  out[2] += (c[2] - out[2]) * t;
};
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** The ground colour at a point, linear RGB, from what the land is there and how steep. */
export function groundColour(s, slope, x, z, out) {
  const south = clamp01((z - 900) / 1200);
  out[0] = PAL.farm[0];
  out[1] = PAL.farm[1];
  out[2] = PAL.farm[2];
  mix(out, PAL.grass, 0.35 + south * 0.65);
  // Patches of meadow and field in the lowland.
  const patch = (Math.sin(x * 0.11 + Math.sin(z * 0.07) * 2) + Math.sin(z * 0.13 + x * 0.03)) * 0.25 + 0.5;
  mix(out, patch > 0.55 ? PAL.meadow : PAL.farm, 0.25);
  if (s.steppe > 0) mix(out, PAL.steppe, s.steppe);
  if (s.desert > 0) mix(out, PAL.sand, s.desert);
  // The loess country west of the Taihang and the plateaux.
  const loess = clamp01((1900 - x) / 500) * (1 - south) * 0.7;
  if (loess > 0) mix(out, PAL.loess, loess * (1 - s.desert));
  if (s.plateau > 0) mix(out, PAL.plateau, s.plateau);
  if (s.marsh > 0) mix(out, PAL.marsh, s.marsh * 0.8);
  if (s.forest > 0) mix(out, PAL.forest, s.forest * 0.9);
  // Mountains: bare rock on steep faces, snow on the heights.
  const rock = clamp01((slope - 0.18) * 3.2) * clamp01(s.mountain / 4 + s.plateau);
  if (rock > 0) mix(out, PAL.rock, rock);
  const snow = clamp01((s.height - 24) / 6) * (1 - clamp01((slope - 0.5) * 3));
  if (snow > 0) mix(out, PAL.snow, snow);
  // Shores and river beds.
  if (s.water === 1 || s.shore < 2) mix(out, PAL.beach, clamp01(1 - s.shore / 2) * (s.water === 1 ? 0.4 : 0.8));
  if (s.water === 1) mix(out, PAL.seabed, clamp01(-s.height / 3));
  if (s.river < 1.3) mix(out, s.river < 1 ? PAL.bed : PAL.beach, s.river < 1 ? 0.9 : 0.5);
  if (s.water === 2) mix(out, PAL.bed, 0.8);
  if (s.place > 0) mix(out, PAL.town, s.place * 0.85);
  return out;
}

// The ground material: grain by pixel, then the grid and its highlights, on top of the lit colour.
const GROUND_GLSL = /* glsl */ `
float gHash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float gNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(gHash(i), gHash(i + vec2(1.0, 0.0)), u.x), mix(gHash(i + vec2(0.0, 1.0)), gHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// Distance from a point to the edge of its hex, and that hex's centre.
vec3 hexEdge(vec2 p) {
  const float W = ${HEX_W.toFixed(6)};
  const float RH = ${HEX_H.toFixed(6)};
  float row = floor(p.y / RH);
  vec2 best = vec2(0.0);
  float bestD = 1e9;
  for (int k = 0; k < 2; k++) {
    float r = row + float(k);
    float odd = mod(r, 2.0);
    float c = floor(p.x / W - odd * 0.5 + 0.5);
    vec2 centre = vec2((c + odd * 0.5) * W, r * RH);
    float d = dot(p - centre, p - centre);
    if (d < bestD) { bestD = d; best = centre; }
  }
  vec2 q = abs(p - best);
  float e = max(q.x, q.x * 0.5 + q.y * 0.8660254) - W * 0.5;
  return vec3(-e, best);
}
vec4 customFragment(vec4 color, vec3 worldPosition, vec3 normal, vec2 uv) {
  vec2 p = worldPosition.xz;
  float pixel = max(length(dFdx(p)), length(dFdy(p)));
  // Fine grain, fading where a pixel covers more than the grain.
  float fine = 1.0 - smoothstep(0.08, 0.5, pixel);
  float g1 = gNoise(p * 0.9), g2 = gNoise(p * 3.7 + 11.0), g3 = gNoise(p * 0.18 - 5.0);
  float level = smoothstep(0.75, 0.95, normal.y);
  float g4 = gNoise(p * 0.045 + 3.0);
  vec3 c = color.rgb * (0.8 + g3 * 0.26 + (g4 - 0.5) * 0.25) * (1.0 + ((g1 - 0.5) * 0.22 + (g2 - 0.5) * 0.18 * fine) * mix(0.6, 1.0, level));
  // Tufts on flat lowland.
  float tuft = smoothstep(0.72, 0.9, gNoise(p * 6.5 - 3.0)) * fine * level;
  c *= 1.0 - tuft * 0.18;
  // The hex grid: thin pale lines, faded out when far.
  vec3 hx = hexEdge(p);
  float width = 0.025 + pixel * 0.3;
  float line = 1.0 - smoothstep(width, width + pixel * 1.1, hx.x);
  float gridFade = (1.0 - smoothstep(0.1, 0.24, pixel)) * uCustom[1].w;
  float lum = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 lineCol = c * 1.25 + vec3(lum) * 0.5 + 0.02;
  // The battlefield: inside its bounds the grid is brighter, outside the land is dimmed.
  float field = 1.0;
  if (uCustom[3].x > 0.5) {
    vec2 lo = uCustom[2].xy, hi = uCustom[2].zw;
    vec2 dd = max(lo - p, p - hi);
    float outside = smoothstep(0.0, 2.5, max(dd.x, dd.y));
    field = 1.0 - outside;
    c *= mix(1.0, 0.62, outside);
    gridFade *= mix(1.35, 0.35, outside);
  }
  c = mix(c, lineCol, line * gridFade * 0.24);
  // The hex under the pointer and the chosen hex.
  float inner = smoothstep(0.0, 0.5, hx.x);
  if (uCustom[0].z > 0.5 && distance(hx.yz, uCustom[0].xy) < 0.1) {
    c = mix(c, c * 1.35 + vec3(0.05, 0.045, 0.02), 0.6 * (1.0 - inner * 0.5));
  }
  if (uCustom[1].z > 0.5 && distance(hx.yz, uCustom[1].xy) < 0.1) {
    float ring = 1.0 - smoothstep(0.08, 0.22, hx.x);
    c = mix(c, vec3(1.0, 0.86, 0.45), ring * 0.85);
  }
  return vec4(c, color.a);
}`;

/**
 * The streamed land. `quality` sets how far tiles reach. Returns the stream, the ground material (whose `grid` sets
 * hover, choice and battlefield), `heightAt` and `update(x, z, reach)`.
 */
export function createLand(scene, { quality = 'medium', onTile } = {}) {
  const material = createStandardMaterial3D({ vertexColors: true, roughness: 0.92, metallic: 0 });
  material.shader = createCustomShader3D({ key: 'nine-ground', glsl: GROUND_GLSL });
  const u = material.shader.uniforms;
  u.set([0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  const centres = new WeakMap();
  const sample = {},
    colour = [0, 0, 0];
  const stream = createTerrainStream3D({
    tileSize: TILE,
    viewDistance: quality === 'low' ? 200 : 280,
    loadsPerUpdate: 3,
    material,
    terrain: {
      chunkCells: 32,
      levels: 3,
      lodDistance: quality === 'low' ? 70 : 110,
      skirtDepth: 1.5,
      colorAt(height, slope, x, z, out) {
        // `this` is the tile's terrain: its field tells which tile, and so where the sample is on the map.
        const c = centres.get(this.field) ?? [0, 0];
        const wx = x + c[0],
          wz = z + c[1];
        landAt(wx, wz, sample);
        groundColour(sample, slope, wx, wz, colour);
        out[0] = colour[0];
        out[1] = colour[1];
        out[2] = colour[2];
      }
    },
    load(tx, tz) {
      const heights = new Float32Array(COLUMNS * COLUMNS);
      const x0 = tx * TILE,
        z0 = tz * TILE;
      for (let r = 0; r < COLUMNS; r++) for (let c = 0; c < COLUMNS; c++) heights[r * COLUMNS + c] = landAt(x0 + c, z0 + r, sample).height;
      const field = createHeightField3D({ columns: COLUMNS, rows: COLUMNS, width: TILE, depth: TILE, heights });
      centres.set(field, [x0 + TILE / 2, z0 + TILE / 2]);
      return field;
    },
    onLoad(tile) {
      tile.terrain.setShadows(false, true);
      onTile?.(tile, true);
    },
    onUnload(tile) {
      onTile?.(tile, false);
    }
  });
  scene.addChild(stream);
  return {
    stream,
    material,
    /** Ground height from loaded tiles, or worked out where none is loaded. */
    heightAt: (x, z) => stream.heightAt(x, z) ?? landAt(x, z, sample).height,
    update(x, z, reach) {
      stream.viewDistance = Math.min(290, reach);
      stream.update(x, z);
    },
    /** The hex under the pointer and the chosen hex (centres, or null), and how strong the grid is. */
    setHexes(hover, chosen, grid = 1) {
      u[0] = hover?.x ?? 0;
      u[1] = hover?.z ?? 0;
      u[2] = hover ? 1 : 0;
      u[4] = chosen?.x ?? 0;
      u[5] = chosen?.z ?? 0;
      u[6] = chosen ? 1 : 0;
      u[7] = grid;
    },
    /** The battlefield's bounds in map units, or null. */
    setField(bounds) {
      if (!bounds) return void (u[12] = 0);
      u[8] = bounds[0];
      u[9] = bounds[1];
      u[10] = bounds[2];
      u[11] = bounds[3];
      u[12] = 1;
    },
    ready(x, z, radius = 60) {
      for (let dx = -radius; dx <= radius; dx += TILE / 2) for (let dz = -radius; dz <= radius; dz += TILE / 2) if (!stream.tileAt(x + dx, z + dz)) return false;
      return true;
    }
  };
}

export { HEX_R };
