// Bake the same Egret drawings used by the game into one static sprite atlas.
// Run from any working directory with: node tools/bake-mechanisms.mjs
import '../vendor/node-register.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';
import { mechanismKey } from '../src/art/mechanism-key.mjs';
import { PELLETS } from '../src/sim/rules.mjs';
import * as art from '../src/art/shapes.mjs';

const { Sprite } = await import('@egret/engine');
const { importTiledMap } = await import('@egret/engine/tilemap');
const { createLevelSim } = await import('../src/sim/sim.mjs');
const { visualOf } = await import('../vendor/runtime/dist/displayVisualState.js');
const { resolveShape } = await import('../vendor/runtime/dist/graphicsShape.js');

const scale = 2;
const samples = 2;
const density = scale * samples;
const frames = new Map();
const levels = JSON.parse(readFileSync(new URL('../levels/levels.json', import.meta.url), 'utf8'));
const drawings = {
  block: ({ width, height }) => [art.drawBlock, width, height],
  crate: ({ width, height }) => [art.drawCrate, width, height],
  stone: ({ radius }) => [art.drawStone, radius],
  pellet: ({ type, radius }) => [art.drawPellet, type, radius],
  seesaw: ({ width }) => [art.drawPlank, width, 10],
  post: () => [art.drawPost],
  stand: () => [art.drawStand],
  gate: ({ width, height }) => [art.drawGate, width, height],
  plate: ({ width, height }, active) => [art.drawPlate, width, height, active],
  ramp: ({ points }) => [art.drawRamp, points],
  lock: ({ width, height }, active) => [art.drawLock, width, height, active],
  spring: ({ width, height }, squeeze) => [art.drawSpring, width, height, squeeze]
};

function add(kind, spec, active = false) {
  const key = mechanismKey(kind, spec, active);
  if (!key || frames.has(key)) return;
  const sprite = new Sprite();
  const [draw, ...args] = drawings[kind](spec, active);
  draw(sprite.graphics, ...args);
  const shape = visualOf(sprite).shape;
  const { bounds } = resolveShape(shape);
  const left = Math.floor(bounds.x * scale) - 2;
  const top = Math.floor(bounds.y * scale) - 2;
  const width = Math.ceil((bounds.x + bounds.width) * scale) - left + 2;
  const height = Math.ceil((bounds.y + bounds.height) * scale) - top + 2;
  frames.set(key, { left, top, width, height, batches: [...shape.done, shape] });
}
for (const level of levels) {
  const map = importTiledMap(JSON.parse(readFileSync(new URL('../levels/' + level.file, import.meta.url), 'utf8')));
  createLevelSim(map, {
    display(kind, spec) {
      if (kind === 'spring') {
        for (let pose = 0; pose <= 20; pose++) add(kind, spec, pose / 20);
      } else {
        add(kind, spec);
        if (kind === 'lock' || kind === 'plate') add(kind, spec, true);
      }
    }
  });
}
add('stand', {});
for (const [type, { radius }] of Object.entries(PELLETS)) add('pellet', { type, radius });

function rasterize(frame) {
  const width = frame.width * samples;
  const height = frame.height * samples;
  const pixels = new Float32Array(width * height * 4);
  for (const { positions, colors, indices } of frame.batches) {
    for (let triangle = 0; triangle < indices.length; triangle += 3) {
      const [a, b, c] = indices.slice(triangle, triangle + 3);
      const [ax, bx, cx] = [a, b, c].map((i) => positions[i * 2] * density - frame.left * samples);
      const [ay, by, cy] = [a, b, c].map((i) => positions[i * 2 + 1] * density - frame.top * samples);
      const area = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(area) < 1e-7) continue;
      const right = Math.min(width, Math.ceil(Math.max(ax, bx, cx)));
      const bottom = Math.min(height, Math.ceil(Math.max(ay, by, cy)));
      for (let y = Math.max(0, Math.floor(Math.min(ay, by, cy))); y < bottom; y++) {
        for (let x = Math.max(0, Math.floor(Math.min(ax, bx, cx))); x < right; x++) {
          const dx = x + 0.5 - cx;
          const dy = y + 0.5 - cy;
          const u = ((by - cy) * dx + (cx - bx) * dy) / area;
          const v = ((cy - ay) * dx + (ax - cx) * dy) / area;
          const w = 1 - u - v;
          if (u < 0 || v < 0 || w < 0) continue;
          const alpha = colors[a * 4 + 3] * u + colors[b * 4 + 3] * v + colors[c * 4 + 3] * w;
          const at = (y * width + x) * 4;
          for (let channel = 0; channel < 3; channel++) {
            const linear = colors[a * 4 + channel] * u + colors[b * 4 + channel] * v + colors[c * 4 + channel] * w;
            pixels[at + channel] = linear * alpha + pixels[at + channel] * (1 - alpha);
          }
          pixels[at + 3] = alpha + pixels[at + 3] * (1 - alpha);
        }
      }
    }
  }
  return pixels;
}

const srgb = (value) => Math.min(255, Math.round(255 * (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055)));
function place(atlas, atlasWidth, frame) {
  const pixels = rasterize(frame);
  const width = frame.width * samples;
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const sum = [0, 0, 0, 0];
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const at = ((y * samples + sy) * width + x * samples + sx) * 4;
          for (let channel = 0; channel < 4; channel++) sum[channel] += pixels[at + channel];
        }
      }
      const alpha = sum[3];
      if (alpha === 0) continue;
      const at = ((frame.y + y) * atlasWidth + frame.x + x) * 4;
      for (let channel = 0; channel < 3; channel++) atlas[at + channel] = srgb(sum[channel] / alpha);
      atlas[at + 3] = Math.round(255 * alpha / (samples * samples));
    }
  }
}

function pngChunk(name, bytes) {
  const type = Buffer.from(name, 'ascii');
  const output = Buffer.alloc(bytes.length + 12);
  output.writeUInt32BE(bytes.length, 0);
  type.copy(output, 4);
  bytes.copy(output, 8);
  output.writeUInt32BE(crc32(output.subarray(4, -4)), output.length - 4);
  return output;
}

function png(width, height, atlas) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const stride = width * 4;
  const scanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    const start = y * (stride + 1);
    scanlines[start] = 1; // Sub filtering compresses the RGBA changes along each row.
    for (let x = 0; x < stride; x++) scanlines[start + 1 + x] = atlas[row + x] - (x >= 4 ? atlas[row + x - 4] : 0);
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(scanlines, { level: 9 })), pngChunk('IEND', Buffer.alloc(0))]);
}

const atlasWidth = 1024;
let x = 1, y = 1, rowHeight = 0;
const packing = [...frames].sort((a, b) => b[1].height - a[1].height || b[1].width - a[1].width);
for (const [, frame] of packing) {
  if (x + frame.width + 1 > atlasWidth) {
    x = 1;
    y += rowHeight + 2;
    rowHeight = 0;
  }
  frame.x = x;
  frame.y = y;
  x += frame.width + 2;
  rowHeight = Math.max(rowHeight, frame.height);
}
const atlasHeight = y + rowHeight + 1;
const atlas = Buffer.alloc(atlasWidth * atlasHeight * 4);
for (const frame of frames.values()) place(atlas, atlasWidth, frame);
const table = [...frames].map(([key, { x, y, width, height, left, top }]) =>
  '  ' + JSON.stringify(key) + ': ' + JSON.stringify({ x, y, width, height, originX: left / scale, originY: top / scale, scale }));
writeFileSync(new URL('../art/mechanisms.png', import.meta.url), png(atlasWidth, atlasHeight, atlas));
writeFileSync(new URL('../src/art/mechanism-frames.mjs', import.meta.url),
  '// Generated by tools/bake-mechanisms.mjs.\nexport const atlasFrames = {\n' + table.join(',\n') + '\n};\n');
console.log(frames.size + ' frames, ' + atlasWidth + ' × ' + atlasHeight);
