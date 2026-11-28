// 地形：按镜头远近加载的地块（每块 64 个单位见方，每个单位一个采样点），高度和颜色都由 sim/land.mjs 算出；地面材质在
// 像素上补上草地、泥土、岩石的细纹，再画出六角格的细线、鼠标所指和选中的格子，以及打仗时战场的范围。
// The land: tiles loaded around the view (64 units square, a sample every unit), their heights and colours worked out
// by sim/land.mjs; the ground material adds the fine grain of grass, earth and rock per pixel, then draws the thin lines
// of the hex grid, the hex under the pointer and the chosen one, and the bounds of the battlefield during a battle.
import { createCustomShader3D, createHeightField3D, createStandardMaterial3D, createTerrainStream3D, Texture3D } from '@egret/engine/world3d';
import { MAP } from '../data/map.mjs';
import { HEX_H, HEX_R, HEX_W } from '../sim/hexgrid.mjs';
import { landAt } from '../sim/land.mjs';

import { TILE, COLUMNS, ROCK, sampleTerrainTile } from './terrain-sampling.mjs';
import { createTerrainSampler } from './terrain-sampler.mjs';
export { TILE, groundColour } from './terrain-sampling.mjs';

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
float changedDomain(vec4 a, vec4 b) {
  return max(step(0.05, distance(a.rgb, b.rgb)), abs(step(0.01, a.a) - step(0.01, b.a)));
}
float domainFrontier(vec2 atlas, vec2 px) {
  ivec2 last = textureSize(uEmissiveMap, 0) - 1;
  vec2 grid = atlas * vec2(last + 1);
  ivec2 cell = ivec2(grid);
  vec2 around = fract(grid);
  ivec2 direction = ivec2(step(vec2(0.5), around) * 2.0 - 1.0);
  vec2 edge = min(around, 1.0 - around);
  vec2 width = clamp(px * 0.71, vec2(0.036), vec2(0.23));
  vec2 falloff = 1.0 - smoothstep(width * 0.35, width * 1.65, edge);
  if (max(falloff.x, falloff.y) <= 0.0) return 0.0;
  vec4 current = texelFetch(uEmissiveMap, cell, 0);
  float line = 0.0;
  if (falloff.x > 0.0) {
    vec4 across = texelFetch(uEmissiveMap, clamp(cell + ivec2(direction.x, 0), ivec2(0), last), 0);
    line = falloff.x * changedDomain(current, across);
  }
  if (falloff.y > 0.0) {
    vec4 across = texelFetch(uEmissiveMap, clamp(cell + ivec2(0, direction.y), ivec2(0), last), 0);
    line = max(line, falloff.y * changedDomain(current, across));
  }
  return line;
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
  c *= 1.0 - tuft * 0.13;
  // Date-driven seasons occupy the three unused ground uniforms. No tile rebuild.
  float vegetation = smoothstep(-0.025, 0.08, color.g - color.r * 0.82);
  c = mix(c, c * vec3(1.35, 0.89, 0.65), uCustom[3].y * vegetation * 0.72);
  c *= mix(vec3(1.0), vec3(0.93, 1.09, 0.98), uCustom[3].w * vegetation * 0.48);
  float north = 1.0 - smoothstep(1050.0, 2050.0, p.y);
  float warm = smoothstep(0.12, 0.46, c.r - c.b);
  float snow = uCustom[3].z * clamp(north * 0.32 + smoothstep(12.0, 31.0, worldPosition.y) * 0.55, 0.0, 0.82);
  snow *= 1.0 - warm * 0.73;
  float snowPatch = smoothstep(0.15, 0.7, g3) * smoothstep(0.55, 0.93, normal.y);
  c = mix(c, vec3(0.72, 0.78, 0.77), snow * snowPatch * step(0.35, worldPosition.y));
  // Cold raised ground retains a slate midtone and exposes its rocky folds.
  float upland = smoothstep(0.025, 0.19, c.b - c.r) * smoothstep(10.0, 18.5, worldPosition.y);
  c *= mix(vec3(1.0), vec3(0.65, 0.73, 0.89), upland * (0.53 + 0.32 * (1.0 - level)));
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
  // The engine binds the atlas through the emissive sampler. The material
  // emits no light. Read in realm coordinates, independently of the tile UV.
  if (uCustom[0].w > 0.0 && uCustom[3].x < 0.5) {
    vec2 atlas = p / vec2(${MAP.width.toFixed(1)}, ${MAP.height.toFixed(1)});
    vec2 territoryPixel = fwidth(atlas) * vec2(textureSize(uEmissiveMap, 0));
    if (all(greaterThanEqual(atlas, vec2(0.0))) && all(lessThan(atlas, vec2(1.0)))) {
      vec4 domain = texture(uEmissiveMap, atlas);
      float light = clamp(dot(c, vec3(0.299, 0.587, 0.114)), 0.0, 1.1);
      vec3 ink = domain.rgb * (0.9 + light * 0.55) + vec3(light * 0.09);
      float held = smoothstep(0.06, 0.34, domain.a);
      float rim = smoothstep(0.53, 0.72, domain.a);
      c = mix(c, ink, held * 0.37 * uCustom[0].w);
      // At the frontier, draw a narrow line in screen pixels instead of a broad band.
      float border = domain.a > 0.54 ? domainFrontier(atlas, territoryPixel) : 0.0;
      c *= 1.0 - (rim * 0.11 + border * 0.43) * uCustom[0].w;
    }
  }
  return vec4(c, color.a);
}`;

/**
 * The streamed land. `quality` sets how far tiles reach. Returns the stream, the ground material (whose `grid` sets
 * hover, choice and battlefield), `heightAt` and `update(x, z, reach)`.
 */
export function createLand(scene, { quality = 'medium', onTile, samplerOptions } = {}) {
  const material = createStandardMaterial3D({ vertexColors: true, roughness: 0.92, metallic: 0 });
  const atlas = new Texture3D({ width: 1, height: 1, data: new Uint8Array(4) },
    { wrapS: 'clamp', wrapT: 'clamp', mipmaps: false });
  material.emissiveMap = atlas;
  material.shader = createCustomShader3D({ key:'nine-ground-domains', glsl:GROUND_GLSL });
  const u = material.shader.uniforms;
  u.set([0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  // Each tile's colours are worked out with its heights, in one pass over the land, and read back as its chunks are built.
  const colours = new WeakMap();
  const sample = {}, sampler=createTerrainSampler({limit:32,...samplerOptions});
  let retired=false;
  function fieldFromSamples(tx,tz,data){
    // The stream is retired before stopping its worker: an outstanding job
    // can settle, but it cannot construct or publish another live tile.
    if(retired||data===undefined)return undefined;
    const n=COLUMNS*COLUMNS;
    if(!(data.heights instanceof Float32Array)||data.heights.length!==n||!(data.tint instanceof Float32Array)||data.tint.length!==n*4)data=sampleTerrainTile(tx,tz);
    const field=createHeightField3D({columns:COLUMNS,rows:COLUMNS,width:TILE,depth:TILE,heights:data.heights});
    colours.set(field,data.tint);
    return field;
  }
  const stream = createTerrainStream3D({
    tileSize: TILE,
    viewDistance: quality === 'low' ? 200 : 280,
    loadsPerUpdate: 2,
    material,
    terrain: {
      chunkCells: 32,
      levels: 3,
      lodDistance: quality === 'low' ? 45 : 110,
      skirtDepth: 1.5,
      colorAt(height, slope, x, z, out) {
        // `this` is the tile's terrain: its field finds the tile's colours, worked out when its heights were.
        const tile = colours.get(this.field);
        if (!tile) return;
        const c = Math.round(x + TILE / 2),
          r = Math.round(z + TILE / 2);
        const i = r * COLUMNS + c,
          k = i * 3;
        // Steep faces turn to rock, which only the drawn slope knows.
        const rock = Math.min(1, Math.max(0, (slope - 0.2) * 3.2)) * (tile[COLUMNS * COLUMNS * 3 + i] ?? 0);
        out[0] = tile[k] + (ROCK[0] - tile[k]) * rock;
        out[1] = tile[k + 1] + (ROCK[1] - tile[k + 1]) * rock;
        out[2] = tile[k + 2] + (ROCK[2] - tile[k + 2]) * rock;
      }
    },
    load(tx, tz) {
      // Native TerrainStream3D accepts a Promise of its actual HeightField3D.
      // The unavailable-worker path is still synchronous, like the original.
      const result=sampler.request(tx,tz);
      return result&&typeof result.then==='function'?result.then(data=>fieldFromSamples(tx,tz,data)):fieldFromSamples(tx,tz,result);
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
    get usingWorker(){return sampler.usingWorker;},get cancelledSamples(){return sampler.cancelled;},
    setTerritory(source) {
      atlas.setSource(source);
    },
    setTerritoryOpacity(opacity) {
      u[3] = opacity;
    },
    /** Update palette only: streamed geometry and simulation terrain stay unchanged. */
    setSeason(season) {
      u[13] = season.autumn;
      u[14] = season.winter;
      u[15] = season.spring;
    },
    /** Ground height from loaded tiles, or worked out where none is loaded. */
    heightAt: (x, z) => stream.heightAt(x, z) ?? landAt(x, z, sample).height,
    update(x, z, reach) {
      stream.viewDistance = Math.min(290, reach);
      sampler.retain(x,z,stream.viewDistance);
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
    },
    dispose(){
      if(retired)return;retired=true;
      try{stream.dispose();}finally{
        sampler.dispose();stream.removeFromParent();material.dispose();atlas.dispose();
      }
    }
  };
}

export { HEX_R };
