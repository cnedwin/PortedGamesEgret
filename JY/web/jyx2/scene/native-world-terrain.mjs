import { Mesh3D, Texture3D, createCustomShader3D, createGeometry3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { createWorldPathPixels } from './world-map-data.mjs';

const density = 12;
const gutter = 2;
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;
const linear = Uint8Array.from({ length: 256 }, (_, i) => Math.round(255 *
  (i <= 10 ? i / 3294.6 : ((i / 255 + .055) / 1.055) ** 2.4)));
const encoded = Uint8Array.from({ length: 4097 }, (_, i) => Math.round(255 *
  (i / 4096 <= .0031308 ? i / 4096 * 12.92 : 1.055 * (i / 4096) ** (1 / 2.4) - .055)));
const palette = [
  [.075, .136, .047], [.229, .314, .120],
  [.100, .044, .013], [.265, .144, .043],
  [.360, .280, .136], [.543, .436, .229],
  [.435, .488, .467], [.726, .768, .708],
  [.24, .156, .082], [.495, .359, .179],
];

const shoreFragment = `vec4 customFragment(vec4 lit, vec3 world, vec3 normal, vec2 uv) {
  float edge = lit.a;
  float shore = smoothstep(.21, .70, edge);
  if (shore < .0001) return vec4(lit.rgb, 1.0);
  float wash = smoothstep(.20, .41, edge) * (1.0 - smoothstep(.53, .73, edge));
  vec2 tile = world.xz;
  float time = uCustom[0].x;
  float turbulence = sin(tile.x * .53 + tile.y * .65) * cos(tile.y * .93 - tile.x * .38);
  float ripple = sin(tile.x * 7.1 + tile.y * 3.8 + time * 1.3 + sin(tile.y * 2.2) + turbulence * 2.45) * .5 + .5;
  float swell = sin(tile.x - tile.y * 1.25 - time * .66 + turbulence * 1.12) * .5 + .5;
  float glint = smoothstep(.86, .99, ripple) * smoothstep(.26, .79, swell);
  vec3 water = mix(vec3(.022, .118, .159), vec3(.068, .283, .293),
    ripple * .12 + swell * .38 + (1.0 - edge) * .72);
  water += vec3(.11, .15, .15) * glint * (.25 + wash * .64);
  water += vec3(.095, .105, .071) * wash * smoothstep(.64, .92, ripple);
  vec3 sand = mix(lit.rgb, vec3(.252, .209, .115), wash * .64);
  return vec4(mix(sand, water * .93, shore), 1.0);
}`;

async function loadGrain(name) {
  const response = await fetch(new URL(`world-${name}.webp`, import.meta.url));
  if (!response.ok) throw Error(`Could not load world ${name} texture.`);
  const bitmap = await createImageBitmap(await response.blob());
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, size, size);
  bitmap.close();
  const rgba = context.getImageData(0, 0, size, size).data;
  const values = Float32Array.from({ length: size * size }, (_, i) =>
    (.30 * linear[rgba[i * 4]] + .59 * linear[rgba[i * 4 + 1]] + .11 * linear[rgba[i * 4 + 2]]) / 255);
  return (x, y) => {
    const i = Math.floor(x * size) & 63, j = Math.floor(y * size) & 63;
    return values[j * size + i];
  };
}

function terrainTexture(data, path, grain, left, top, width, height) {
  const pixelsWide = width * density + gutter * 2;
  const pixelsHigh = height * density + gutter * 2;
  const bytes = new Uint8Array(pixelsWide * pixelsHigh * 4);
  const [grass, stone, road] = grain;
  const bounded = (value, size) => Math.max(0, Math.min(value, size - 1));
  for (let py = 0, pixel = 0; py < pixelsHigh; py++) {
    const y = top + (py + .5 - gutter) / density;
    const iy = Math.floor(y), fy = y - iy;
    const row = bounded(iy, data.height) * data.width;
    const nextRow = bounded(iy + 1, data.height) * data.width;
    const pathY = bounded(Math.floor((y + .5) * 4), path.height) * path.width;
    for (let px = 0; px < pixelsWide; px++, pixel += 4) {
      const x = left + (px + .5 - gutter) / density;
      const ix = Math.floor(x), fx = x - ix;
      const col = bounded(ix, data.width), nextCol = bounded(ix + 1, data.width);
      const a = (row + col) * 4, b = (row + nextCol) * 4;
      const c = (nextRow + col) * 4, d = (nextRow + nextCol) * 4;
      const biomes = data.biomes;
      const biome = channel => mix(mix(biomes[a + channel], biomes[b + channel], fx),
        mix(biomes[c + channel], biomes[d + channel], fx), fy);
      const grit = biome(1) / 255, soil = biome(2) / 255, snow = biome(3) / 255;
      const pathX = bounded(Math.floor((x + .5) * 4), path.width);
      const route = path.data[(pathY + pathX) * 4] / 255 * .88;
      const cloud = Math.sin(x * .31 + y * .21) * Math.sin(y * .29 - x * .19);
      const g = grass(x * .45, y * .45), rock = stone(x * .36, y * .36);
      const lush = clamp(g * 1.45 + cloud * .28), dirt = clamp(g * 1.18 + cloud * .18);
      const trail = .40 + road(x * .76, y * .76) * .56;
      for (let channel = 0; channel < 3; channel++) {
        const a = mix(palette[0][channel], palette[1][channel], lush);
        const b = mix(palette[2][channel], palette[3][channel], dirt);
        const c = mix(palette[4][channel], palette[5][channel], rock);
        const d = mix(palette[6][channel], palette[7][channel], rock);
        const e = mix(palette[8][channel], palette[9][channel], trail);
        bytes[pixel + channel] = encoded[Math.round(clamp(mix(mix(mix(mix(a, b, soil), c, grit), d, snow), e, route)) * 4096)];
      }
      bytes[pixel + 3] = Math.round(biome(0));
    }
  }
  return new Texture3D({ width: pixelsWide, height: pixelsHigh, data: bytes }, {
    colorSpace: 'srgb', wrapS: 'clamp', wrapT: 'clamp', mipmaps: true, anisotropy: 4,
  });
}

export async function createNativeWorldTerrain(data) {
  const grain = await Promise.all(['grass', 'rock', 'road'].map(loadGrain));
  const path = createWorldPathPixels(data);
  const shader = createCustomShader3D({ key: 'kys-world-shore', glsl: shoreFragment });
  const { heightAt } = data;

  function chunk(left, top, right, bottom) {
    const width = right - left, height = bottom - top;
    const texture = terrainTexture(data, path, grain, left, top, width, height);
    const positions = [], normals = [], uvs = [], indices = [];
    const stride = width + 1;
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
      positions.push(x, heightAt(x, y), y);
      const sx = heightAt(x - 1, y) - heightAt(x + 1, y), sy = heightAt(x, y - 1) - heightAt(x, y + 1);
      const norm = Math.hypot(sx, 2, sy);
      normals.push(sx / norm, 2 / norm, sy / norm);
      uvs.push(((x - left) * density + gutter) / (width * density + gutter * 2),
        ((y - top) * density + gutter) / (height * density + gutter * 2));
      if (x === right || y === bottom) continue;
      const a = (y - top) * stride + x - left;
      indices.push(a, a + stride + 1, a + 1, a, a + stride, a + stride + 1);
    }
    const geometry = createGeometry3D({ positions, normals, uvs, indices });
    const material = createStandardMaterial3D({ map: texture, metallic: 0, roughness: 1 });
    material.shader = shader;
    material.touch();
    const mesh = new Mesh3D(geometry, material);
    mesh.castShadow = false;
    return { mesh, dispose() { geometry.dispose(); material.dispose(); texture.dispose(); } };
  }
  return { chunk, tick(time) { shader.uniforms[0] = time; } };
}
