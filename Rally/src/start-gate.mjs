// The ceremonial starting gate. All untextured details share a static mesh.
import { Mesh3D, createGeometry3D, createStandardMaterial3D } from '@egret/engine/world3d';
import { BALL, BOX, ROD, SPHERE, build, canvasTexture, quads } from './shapes.mjs';

const LACQUER = 0x9c3028;
const LACQUER_DARK = 0x672925;
const GOLD = 0xc39a55;
const TRIM = 0x86613e;
const JADE = 0x30574e;
const GLAZE = 0x315b53;
const RIDGE = 0x213d38;

function roofHeight(x, z, rise) {
  // The upper pitch is steeper. The roof flattens at the eaves and curls up at the gables.
  return rise * ((1 - Math.abs(z)) ** 1.75 + Math.abs(x) ** 7 * (0.19 + Math.abs(z) * 0.12));
}

function roofTiles(width, depth, rise, tiles, underside = false) {
  const positions = [];
  const indices = [];
  const runs = tiles * 2 + 1;
  const courses = underside ? [-1, -0.62, -0.24, 0, 0.24, 0.62, 1] : [-1, -0.78, -0.54, -0.29, -0.10, 0, 0.10, 0.29, 0.54, 0.78, 1];
  for (const z of courses) {
    for (let i = 0; i < runs; i++) {
      const x = (2 * i) / (runs - 1) - 1;
      const seam = !underside && i % 2 ? 0.047 : 0;
      positions.push(x * width, roofHeight(x, z, rise) + seam, z * depth);
    }
  }
  for (let j = 1; j < courses.length; j++) {
    for (let i = 1; i < runs; i++) {
      const a = (j - 1) * runs + i - 1;
      const b = a + runs;
      if (underside) indices.push(a, a + 1, b, a + 1, b + 1, b);
      else indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = createGeometry3D({ positions, indices });
  geometry.computeNormals();
  return geometry;
}

function addRoof(parts, center, base, width, depth, rise, tiles) {
  parts.push([roofTiles(width, depth, rise, tiles), [center, base, 0], 1, GLAZE]);
  parts.push([roofTiles(width, depth, rise, 6, true), [center, base - 0.11, 0], 1, RIDGE]);
  // The short timbers under the eaves leave a visible underside from a racing camera.
  for (const side of [-1, 1]) {
    for (let i = 0; i <= tiles; i++) {
      const x = (2 * i) / tiles - 1;
      parts.push([BOX, [center + width * x, base + roofHeight(x, 1, rise) - 0.13, side * (depth - 0.22)], [0.12, 0.17, 0.52], TRIM]);
    }
  }
  const sections = [-1, -0.86, -0.68, -0.41, 0, 0.41, 0.68, 0.86, 1];
  for (const z of [-1, 0, 1]) {
    for (let i = 1; i < sections.length; i++) {
      const a = sections[i - 1], b = sections[i];
      const x0 = a * width, x1 = b * width;
      const y0 = base + roofHeight(a, z, rise), y1 = base + roofHeight(b, z, rise);
      const ridge = z === 0;
      parts.push([BOX, [center + (x0 + x1) / 2, (y0 + y1) / 2 + (ridge ? 0.08 : -0.015), z * depth],
        [Math.hypot(x1 - x0, y1 - y0) + 0.055, ridge ? 0.22 : 0.16, ridge ? 0.30 : 0.20],
        RIDGE, [0, 0, Math.atan2(y1 - y0, x1 - x0)]]);
    }
  }
  for (const side of [-1, 1]) {
    const x = center + side * width;
    parts.push([BALL, [x, base + roofHeight(1, 0, rise) + 0.16, 0], [0.22, 0.20, 0.17], GOLD]);
  }
}

function addColumn(parts, x, height, radius) {
  parts.push(
    [BOX, [x, 0.16, 0], [radius * 2.54, 0.32, radius * 2.68], 0x737c78],
    [BOX, [x, 0.36, 0], [radius * 2.45, 0.14, radius * 2.56], 0xa6aba0],
    [ROD, [x, 0.64, 0], [radius * 1.18, 0.45, radius * 1.18], 0xb3b4a6],
    [ROD, [x, (height + 0.86) / 2, 0], [radius, height - 0.86, radius], LACQUER],
    [ROD, [x, 0.97, 0], [radius * 1.03, 0.16, radius * 1.03], LACQUER_DARK],
    [ROD, [x, height - 0.37, 0], [radius * 1.045, 0.14, radius * 1.045], GOLD],
    [BOX, [x, height - 0.09, 0], [radius * 2.25, 0.22, radius * 2.25], LACQUER_DARK],
    [BOX, [x, height + 0.17, 0], [radius * 3.15, 0.28, radius * 2.7], JADE],
  );
  // Stacked bearing blocks and short corbels carry the crossbeam.
  for (const side of [-1, 1]) {
    parts.push(
      [BOX, [x + side * radius * 1.23, height - 0.34, 0], [radius * 1.35, 0.23, radius * 1.52], LACQUER_DARK],
      [BOX, [x + side * radius * 1.55, height - 0.11, 0], [radius * 1.42, 0.22, radius * 1.70], TRIM],
      [BOX, [x, height + 0.39, side * radius * 1.14], [radius * 1.56, 0.20, radius * 2.2], LACQUER],
    );
  }
}

function addLantern(parts, x) {
  parts.push(
    [ROD, [x, 8.47, 0], [0.045, 0.7, 0.045], 0x332820],
    [SPHERE, [x, 7.72, 0], [0.65, 0.69, 0.65], [1.18, 0.26, 0.13]],
    [ROD, [x, 8.32, 0], [0.34, 0.13, 0.34], GOLD],
    [ROD, [x, 7.07, 0], [0.30, 0.13, 0.30], GOLD],
    [ROD, [x, 6.85, 0], [0.055, 0.33, 0.055], GOLD],
    [BALL, [x, 6.66, 0], [0.09, 0.16, 0.09], LACQUER],
  );
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const dx = Math.sin(angle), dz = Math.cos(angle);
    for (const half of [-1, 1]) {
      parts.push([BOX, [x + dx * 0.56, 7.72 + half * 0.24, dz * 0.56], [0.037, 0.49, 0.035],
        0xb84f2e, [half * -0.31, angle, 0]]);
    }
  }
}

function plaqueTexture() {
  return canvasTexture(640, 160, (c, w, h) => {
    c.fillStyle = '#183637';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#244849';
    c.fillRect(11, 11, w - 22, h - 22);
    c.strokeStyle = '#e1bb71';
    c.lineWidth = 5;
    c.strokeRect(10, 10, w - 20, h - 20);
    c.strokeStyle = '#a98251';
    c.lineWidth = 2;
    c.strokeRect(18, 18, w - 36, h - 36);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '700 89px "KaiTi", "Songti SC", "STSong", "Noto Serif SC", "SimSun", serif';
    [...'锦绣飞车'].forEach((letter, i) => {
      const x = w / 2 + (i - 1.5) * 106;
      c.fillStyle = '#102b2a';
      c.fillText(letter, x + 2, 67);
      c.fillStyle = '#ffe3a4';
      c.fillText(letter, x, 64);
    });
    c.fillStyle = '#e8c783';
    c.font = '600 20px "Songti SC", "Noto Serif SC", "SimSun", serif';
    c.fillText('山 水 环 道', w / 2, 126);
    for (const x of [52, w - 52]) {
      c.save();
      c.translate(x, h / 2);
      c.rotate(Math.PI / 4);
      c.strokeRect(-8, -8, 16, 16);
      c.restore();
    }
  }, { wrapS: 'clamp', wrapT: 'clamp' });
}

/** Mount the gateway at the holder's local origin; the existing column span clears the road. */
export function addStartGate(holder, span) {
  const parts = [];
  for (const side of [-1, 1]) {
    const inner = side * span;
    const outer = side * (span + 3.65);
    const wing = (inner + outer) / 2;
    addColumn(parts, inner, 9.15, 0.69);
    addColumn(parts, outer, 6.77, 0.43);
    parts.push(
      [BOX, [wing, 7.12, 0], [4.75, 0.58, 1.12], LACQUER_DARK],
      [BOX, [wing, 7.49, 0], [5.25, 0.16, 1.38], JADE],
      [BOX, [wing, 7.62, 0], [5.35, 0.11, 1.52], GOLD],
    );
    addRoof(parts, wing, 7.82, 2.82, 1.55, 0.91, 9);
    addLantern(parts, side * (span - 2.5));
  }
  parts.push(
    [BOX, [0, 9.04, 0], [span * 2 + 1.95, 0.42, 1.42], LACQUER_DARK],
    [BOX, [0, 9.32, 0], [span * 2 + 2.35, 0.14, 1.52], GOLD],
    [BOX, [0, 9.81, 0], [span * 2 + 3.0, 0.85, 1.38], JADE],
    [BOX, [0, 10.42, 0], [span * 2 + 3.20, 0.36, 1.60], LACQUER],
    [BOX, [0, 10.69, 0], [span * 2 + 3.51, 0.19, 1.98], GOLD],
    [BOX, [0, 10.90, 0], [span * 2 + 4.06, 0.28, 2.54], RIDGE],
  );
  const roofWidth = span + 2.75;
  addRoof(parts, 0, 11.1, roofWidth, 2.73, 1.82, 42);
  parts.push([ROD, [0, 13.22, 0], [0.22, 0.61, 0.22], TRIM], [BALL, [0, 13.60, 0], [0.3, 0.22, 0.29], GOLD]);

  const plaqueWidth = Math.min(12.2, span * 1.06);
  for (const face of [-1, 1]) {
    parts.push(
      [BOX, [0, 9.80, face * 0.81], [plaqueWidth + 0.43, 2.88, 0.20], LACQUER_DARK],
      [BOX, [0, 9.80, face * 0.93], [plaqueWidth + 0.22, 2.68, 0.07], TRIM],
    );
    for (const side of [-1, 1]) {
      for (let i = 1; i < 5; i++) {
        const x = side * (plaqueWidth / 2 + (i * (span - plaqueWidth / 2)) / 5);
        parts.push([BOX, [x, 9.81, face * 0.705], [0.26, 0.26, 0.065], GOLD, [0, 0, Math.PI / 4]]);
      }
    }
  }
  const gate = new Mesh3D(build(parts), createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.67 }));
  gate.name = 'Start gate architecture';
  gate.castShadow = true;
  gate.receiveShadow = true;
  holder.addChild(gate);

  // Mirrored horizontal axes leave the text readable from either direction.
  const faces = [-1, 1].map((face) => [
    [0, 9.80, face * 0.981],
    [face * plaqueWidth / 2, 0, 0],
    [0, 1.27, 0],
  ]);
  const plaque = new Mesh3D(quads(faces), createStandardMaterial3D({ color: 0xffffff, map: plaqueTexture(), roughness: 0.84 }));
  plaque.name = 'Start gate plaque';
  plaque.castShadow = false;
  plaque.receiveShadow = false;
  holder.addChild(plaque);
}
