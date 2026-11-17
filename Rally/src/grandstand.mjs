// Festival grandstand. Local +X climbs away from the circuit, and Z follows the straight.
import {
  InstancedMesh3D,
  Mesh3D,
  Object3D,
  createCylinderGeometry3D,
  createGeometry3D,
  createSphereGeometry3D,
  createStandardMaterial3D,
  quatFromEuler,
} from '@egret/engine/world3d';
import { BOX, ROD, build, scatterSource, shade } from './shapes.mjs';

const STONE = 0xa39983;
const TRIM = 0xd0c3a3;
const WOOD = 0x713c30;
const RED = 0xad4838;
const GOLD = 0xc79a52;
const JADE = 0x2e5954;
const TILE = 0x315651;
const LENGTH = 56;
const ROWS = 5;
const SEATS_PER_ROW = 46;
const STEP = 1.46;
const RISE = 1.35;
const SEAT_X = 0.12;
const SEAT_TOP = 0.435;
const AISLES = [-9.1, 9.1];
const DECKS = [[-28, -10.22], [-7.98, 7.98], [10.22, 28]];

const JACKET = createCylinderGeometry3D({ radiusTop: 0.94, radiusBottom: 1, height: 1, radialSegments: 6 });
const HEAD = createSphereGeometry3D({ radius: 1, widthSegments: 6, heightSegments: 4 });
const HAIR = createSphereGeometry3D({ radius: 1, widthSegments: 5, heightSegments: 3 });
const EYES = createGeometry3D({
  positions: [
    -0.9, 0.5, 0, -0.9, -0.5, 0, -0.3, 0.5, 0, -0.3, -0.5, 0,
    0.3, 0.5, 0, 0.3, -0.5, 0, 0.9, 0.5, 0, 0.9, -0.5, 0,
  ],
  indices: [0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7],
});
const COATS = [0xbe5750, 0x507d72, 0x476278, 0xd1ac67, 0x8c637d, 0xccb79a, 0x778952, 0xa97049];
const SKINS = [0xf0c597, 0xdba575, 0xba8259, 0x9e6849];
const HAIR_COLORS = [0x332826, 0x423128, 0x574031, 0x81766b];
const choose = (list, random) => list[Math.floor(random() * list.length)];
const tread = (row) => 1.04 + row * RISE;

/** The cross section curls out at the eaves; shallow roll tiles run along its slope. */
function canopyRoof(channels) {
  const profile = [
    [-1.48, 8.22], [-0.85, 8.23], [-0.24, 8.34], [0.52, 8.58],
    [1.55, 9.02], [2.75, 9.70], [3.75, 10.18], [4.45, 10.16],
    [5.66, 9.55], [6.75, 9.05], [7.65, 8.82], [8.22, 8.78],
  ];
  const positions = [], indices = [];
  const segments = channels * 3;
  const stride = segments + 1;
  const length = LENGTH + 2.6;
  for (const [x, y] of profile) {
    for (let i = 0; i <= segments; i++) {
      const z = length * (i / segments - 0.5);
      const gable = Math.max(0, 1 - (length / 2 - Math.abs(z)) / 3.1);
      const corner = Math.max(0, 1 - Math.abs(x - (x < 3.75 ? -1.48 : 8.22)) / 2.8);
      const roll = i % 3 === 1 ? 0.085 : i % 3 === 2 ? 0.04 : 0;
      positions.push(x, y + roll + 0.28 * gable * gable * corner, z);
    }
  }
  for (let i = 0; i < profile.length - 1; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * stride + j;
      indices.push(a, a + 1, a + stride, a + stride, a + 1, a + stride + 1);
    }
  }
  // The lighter detail belongs to the timber below; this smooth underside reads
  // as one continuous canopy from the low chase camera.
  const base = positions.length / 3;
  for (const [x, y] of profile) positions.push(x, y - 0.17, -length / 2, x, y - 0.17, length / 2);
  for (let i = 0; i < profile.length - 1; i++) {
    const a = base + i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  return createGeometry3D({ positions, indices });
}

function architecture(detail) {
  const parts = [];
  const box = (x, y, z, width, height, depth, color, rotation) => parts.push([BOX, [x, y, z], [width, height, depth], color, rotation]);
  box(3.1, 0.26, 0, 8, 0.62, LENGTH + 0.5, 0x857e71);
  box(3.15, 0.57, 0, 7.92, 0.17, LENGTH + 0.7, TRIM);

  for (let row = 0; row < ROWS; row++) {
    const x = row * STEP, y = tread(row);
    for (const [start, end] of DECKS) {
      const z = (start + end) / 2, length = end - start;
      box(x, (y - 0.2) / 2, z, 1.47, y - 0.2, length, row % 2 ? 0x9c8f77 : STONE);
      box(x, y - 0.135, z, 1.48, 0.27, length, TRIM);
      box(x + SEAT_X, y + SEAT_TOP - 0.075, z, 0.76, 0.15, length - 0.3, WOOD);
      box(x + 0.45, y + 0.57, z, 0.105, 0.46, length - 0.3, shade(RED, 0.82));
    }
    for (const z of AISLES) {
      const height = row ? RISE : y - 0.12;
      for (let step = 1; step <= 3; step++) {
        const surface = y - height + step * height / 3;
        const sx = x - STEP / 2 + (step - 0.5) * STEP / 3;
        box(sx, surface / 2, z, STEP / 3 + 0.016, surface, 2.21, STONE);
        box(sx, surface - 0.024, z, STEP / 3 + 0.026, 0.054, 2.23, TRIM);
      }
    }
  }

  // Timber frames grow from mitered stone shoes. Dark braces leave the seating
  // open, with the stronger vermilion reserved for columns and bench backs.
  for (const z of [-27.6, -18.35, -9.1, 0, 9.1, 18.35, 27.6]) {
    box(7.24, 0.54, z, 0.72, 1.08, 0.72, STONE);
    box(7.24, 4.74, z, 0.30, 7.44, 0.30, RED);
    box(7.24, 8.44, z, 0.54, 0.20, 0.62, GOLD);
    box(6.25, 8.42, z, 2.15, 0.22, 0.29, JADE);
    box(6.49, 7.93, z, 1.74, 0.14, 0.21, WOOD, [0, 0, -0.53]);
    box(3.65, 8.26, z, 7.25, 0.18, 0.24, WOOD);
  }
  for (const z of [-27.55, -9.91, 9.91, 27.55]) {
    box(-0.82, 0.57, z, 0.55, 1.14, 0.55, STONE);
    box(-0.82, 4.58, z, 0.27, 6.96, 0.27, RED);
    box(-0.82, 7.89, z, 0.42, 0.15, 0.42, GOLD);
    box(-0.32, 7.94, z, 1.42, 0.15, 0.22, JADE);
  }
  box(7.21, 8.46, 0, 0.33, 0.27, LENGTH + 1.2, JADE);
  box(-0.79, 8.04, 0, 0.29, 0.24, LENGTH + 1.4, JADE);
  box(-1.40, 8.19, 0, 0.19, 0.115, LENGTH + 2.3, 0x274742);
  box(-1.37, 8.115, 0, 0.17, 0.046, LENGTH + 2.25, GOLD);
  box(8.15, 8.69, 0, 0.17, 0.115, LENGTH + 2.3, WOOD);
  parts.push([canopyRoof(detail ? 67 : 47), [0, 0, 0], 1, TILE]);
  parts.push([ROD, [3.94, 10.19, 0], [0.15, LENGTH + 2.5, 0.15], JADE, [Math.PI / 2, 0, 0]]);
  for (const side of [-1, 1]) {
    box(3.94, 10.27, side * 29.05, 0.24, 0.20, 1.0, GOLD, [side * -0.23, 0, 0]);
    box(3.94, 10.39, side * 29.62, 0.17, 0.24, 0.33, JADE, [side * -0.52, 0, 0]);
  }

  // Openings in the front rails land exactly on the two sets of stone stairs.
  for (const [start, end] of DECKS) {
    const length = end - start;
    box(-0.7, 1.69, (start + end) / 2, 0.11, 0.095, length - 0.22, WOOD);
    box(-0.7, 1.38, (start + end) / 2, 0.082, 0.071, length - 0.22, GOLD);
    for (let z = start + 0.18; z < end - 0.16; z += 2.04) box(-0.70, 1.41, z, 0.095, 0.72, 0.10, WOOD);
  }
  for (const z of [-27.95, 27.95]) {
    const rise = RISE / STEP;
    box(2.92, 4.33, z, STEP * 4.05 * Math.hypot(1, rise), 0.105, 0.115, WOOD, [0, 0, Math.atan(rise)]);
    for (let row = 0; row < ROWS; row++) box(row * STEP, tread(row) + 0.56, z, 0.10, 1.06, 0.10, WOOD);
  }
  return build(parts);
}

function spectators(detail, chance) {
  const people = [], flags = [];
  for (let row = 0; row < ROWS; row++) {
    for (let slot = 0; slot < SEATS_PER_ROW; slot++) {
      // A fixed set of random values per seat keeps the rest of the scenery
      // stable even when this seat is empty or its occupant changes pose.
      const attendance = chance();
      const jitter = (chance() - 0.5) * 0.30;
      const seed = Math.floor(chance() * 0x100000000);
      const z = (slot + (row % 2) * 0.42 + 0.5) * (LENGTH - 2) / SEATS_PER_ROW - (LENGTH - 2) / 2;
      if (AISLES.some((aisle) => Math.abs(z - aisle) < 1.4) || attendance < (detail ? 0.30 : 0.47)) continue;
      const random = scatterSource(seed);
      const scale = 0.87 + random() * 0.20;
      const yaw = -Math.PI / 2 + (random() - 0.5) * 0.48;
      const forwardJitter = random() - 0.5;
      const y = tread(row);
      const skin = choose(SKINS, random), hair = choose(HAIR_COLORS, random);
      const standing = random() > 0.65;
      const waving = standing && slot % 3 === row % 3 && flags.length < (detail ? 20 : 10);
      const raised = standing && random() > 0.40;
      const coat = waving ? RED : choose(COATS, random);
      const trousers = shade(choose(COATS, random), 0.39);
      // A standing spectator uses the tread in front of the bench. A seated
      // spectator's hips meet the same seat height at every body scale.
      const x = row * STEP + (standing ? -0.53 + forwardJitter * 0.07 : SEAT_X - 0.14 + forwardJitter * 0.05);
      const seat = SEAT_TOP / scale;
      const shoulder = standing ? 1.16 : seat + 0.52;
      const lean = standing ? 0 : 0.08 + random() * 0.10;
      const sin = Math.sin(yaw), cos = Math.cos(yaw);

      const slotAt = [x, y, z + jitter];
      const locate = (px, py, pz) => [
        slotAt[0] + (px * cos + pz * sin) * scale,
        slotAt[1] + py * scale,
        slotAt[2] + (pz * cos - px * sin) * scale,
      ];
      const part = (geometry, px, py, pz, size, color, pitch = 0) =>
        people.push([geometry, locate(px, py, pz), size.map((value) => value * scale), color, [pitch, yaw, 0]]);

      part(JACKET, 0, shoulder - 0.21, lean, [0.265, standing ? 0.60 : 0.49, 0.17], coat);
      if (row < 3) part(BOX, 0, shoulder + 0.055, lean + 0.120, [0.22, 0.13, 0.09], shade(coat, 1.23));
      part(HEAD, 0, shoulder + 0.29, lean + 0.055, [0.193, 0.225, 0.194], skin);
      part(HAIR, 0, shoulder + 0.417, lean + 0.01, [0.209, 0.125, 0.201], hair);
      if (row < 2) part(EYES, 0, shoulder + 0.33, lean + 0.255, [0.107, 0.041, 0.01], shade(skin, 0.39));

      for (const side of [-1, 1]) {
        if (standing) {
          part(BOX, side * 0.14, 0.30, -0.04, [0.17, 0.59, 0.20], trousers);
        } else {
          const ankle = row < 2 ? 0.14 : 0.005;
          const knee = seat + 0.13;
          part(BOX, side * 0.14, (ankle + knee) / 2, 0.49, [0.17, knee - ankle, 0.16], trousers);
          part(BOX, side * 0.14, seat + 0.09, 0.25, [0.18, 0.18, 0.49], trousers);
        }
        if (row < 2) part(BOX, side * 0.14, 0.08, standing ? -0.015 : 0.475, [0.17, 0.16, 0.215], 0x3c3028);
        if (waving && side === 1) continue;
        const up = raised && side === (slot % 2 ? 1 : -1);
        part(BOX, side * 0.267, shoulder + (up ? 0.14 : -0.16), lean + (up ? 0.04 : 0.11), [0.15, 0.40, 0.15], coat, up ? -0.47 : -0.31);
        part(BOX, side * 0.267, shoulder + (up ? 0.35 : -0.34), lean + (up ? 0.15 : 0.18), [0.135, 0.13, 0.145], skin);
      }
      if (waving) flags.push({ position: locate(0.267, shoulder, 0.05), yaw, scale, phase: random() * Math.PI * 2, pace: 2.0 + random() * 2.0 });
    }
  }
  return { bodies: build(people), flags };
}

function wavingFlag() {
  // Two faces and a bowed shape read as cloth while the hand and pole pivot
  // at the shoulder. The tapered tail keeps the flag distinct from a sign.
  const positions = [
    0, 1.08, 0.06, -0.41, 1.13, 0.14, -0.80, 1.13, 0.03, -0.66, 0.91, 0.03,
    -0.80, 0.74, 0.03, -0.40, 0.74, 0.14, 0, 0.71, 0.06,
  ];
  const face = [0, 1, 5, 0, 5, 6, 1, 2, 3, 1, 3, 5, 3, 4, 5];
  // Duplicate the vertices before reversing the faces so opposite normals
  // cannot cancel during normal generation.
  const reverse = [];
  for (let i = 0; i < face.length; i += 3) reverse.push(face[i + 2] + 7, face[i + 1] + 7, face[i] + 7);
  const cloth = createGeometry3D({ positions: [...positions, ...positions], indices: [...face, ...reverse] });
  return build([
    [BOX, [0, 0.17, 0.025], [0.155, 0.43, 0.15], RED],
    [BOX, [0, 0.40, 0.025], [0.135, 0.13, 0.14], 0xdba575],
    [ROD, [0, 0.66, 0.055], [0.028, 0.98, 0.028], 0x997046],
    [cloth, [0, 0, 0], 1, 0xe36b4f],
    [BOX, [-0.17, 0.92, 0.11], [0.22, 0.10, 0.027], 0xf6c265],
  ]);
}

/** Builds the trackside landmark in three batches and moves only the flag bearers. */
export function createGrandstand(scene, at, { quality = 'high', chance = scatterSource(43190) } = {}) {
  const detail = quality !== 'low';
  const stand = new Object3D();
  stand.name = 'festival-grandstand';
  stand.setPosition(at.x, at.y - 0.1, at.z);
  stand.setRotation(0, at.heading, 0);
  scene.addChild(stand);
  const material = createStandardMaterial3D({ color: 0xffffff, vertexColors: true, roughness: 0.84 });
  const structure = new Mesh3D(architecture(detail), material);
  structure.name = 'grandstand-structure';
  structure.castShadow = true;
  structure.receiveShadow = true;
  stand.addChild(structure);
  const { bodies, flags } = spectators(detail, chance);
  const crowd = new Mesh3D(bodies, material);
  crowd.name = 'grandstand-crowd';
  crowd.castShadow = false;
  stand.addChild(crowd);
  const waves = new InstancedMesh3D(wavingFlag(), material, flags.length);
  waves.name = 'grandstand-cheering';
  waves.castShadow = false;
  stand.addChild(waves);

  const turn = [0, 0, 0, 1];
  let lastTick = -1;
  function update(time, excitement) {
    const tick = Math.floor(time * 20);
    if (tick === lastTick) return;
    lastTick = tick;
    flags.forEach(({ position, yaw, scale, phase, pace }, i) => {
      const beat = Math.sin(time * pace + phase);
      const sweep = beat * (0.12 + 0.42 * excitement);
      quatFromEuler(turn, 0.21, yaw + sweep * 0.55, sweep);
      waves.setTransformAt(i, position, turn, scale);
    });
  }
  update(0, 0.25);
  return { update };
}
