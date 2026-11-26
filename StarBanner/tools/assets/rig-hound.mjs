// Give the three existing StarBanner hound GLBs the same in-place quadruped rig.
// Run: node tools/assets/rig-hound.mjs <original model directory> <output directory>
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { decodeMeshopt3D } from '../../vendor/engine/dist/rendering/world3d/Meshopt3D.js';

const [sourceDirectory, outputDirectory] = process.argv.slice(2);
assert(sourceDirectory && outputDirectory && resolve(sourceDirectory) !== resolve(outputDirectory),
  'Use distinct source and output directories so the original models stay available.');

const origin = [-0.032, 0, 0.04];
const heading = 0.43;
const cosine = Math.cos(heading);
const sine = Math.sin(heading);

const parts = [];
function joint(name, parent, rest) {
  const id = parts.length;
  parts.push({ name, parent, rest });
  return id;
}
const body = joint('hound_body', null, [0, -0.065, -0.025]);
const head = joint('hound_head', body, [0, 0.015, 0.25]);
const earL = joint('hound_ear_left', head, [-0.16, 0.19, 0.265]);
const earR = joint('hound_ear_right', head, [0.16, 0.19, 0.265]);
const tail = joint('hound_tail', body, [0, -0.012, -0.317]);
const tip = joint('hound_tail_tip', tail, [0, 0.1, -0.436]);
const legs = [
  ['front_left', -0.123, 0.222, -0.103, 0.216, 0.247],
  ['front_right', 0.123, 0.222, -0.103, 0.216, 0.209],
  ['rear_left', -0.145, -0.235, -0.113, -0.268, -0.224],
  ['rear_right', 0.145, -0.235, -0.113, -0.268, -0.23]
].map(([side, across, hipZ, hipY, kneeZ, pawZ]) => ({
  upper: joint('hound_' + side + '_upper', body, [across, hipY, hipZ]),
  lower: null, across, kneeZ, pawZ, side
}));
for (const leg of legs) {
  leg.lower = joint('hound_' + leg.side + '_lower', leg.upper, [leg.across, -0.274, leg.kneeZ]);
  leg.paw = joint('hound_' + leg.side + '_paw', leg.lower, [leg.across, -0.36, leg.pawZ]);
}
const blend = (a, b, v) => {
  const k = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

function weightsAt(x, y, z) {
  const dx = x - origin[0], dz = z - origin[2];
  const side = cosine * dx - sine * dz;
  const ahead = sine * dx + cosine * dz;
  const weights = [];
  const headWeight = blend(0.09, 0.21, ahead) * blend(-0.07, 0.115, y);
  const earWeight = headWeight * 0.72 * blend(0.14, 0.24, Math.abs(side)) *
    (1 - blend(0.205, 0.31, y)) * (1 - blend(0.28, 0.36, ahead));
  const tailWeight = (1 - blend(-0.408, -0.326, ahead)) * blend(-0.13, 0.055, y);
  const tailTip = tailWeight * blend(0.055, 0.24, y);
  if (headWeight) weights.push([head, headWeight - earWeight], [side < 0 ? earL : earR, earWeight]);
  if (tailWeight) weights.push([tail, tailWeight - tailTip], [tip, tailTip]);
  const leg = legs[(ahead < 0 ? 2 : 0) + (side >= 0 ? 1 : 0)];
  const upper = 1 - blend(-0.265, -0.122, y);
  const legWeight = upper * blend(0.035, 0.128, Math.abs(ahead)) *
    (1 - blend(0.069, 0.16, Math.abs(side - leg.across)) * blend(-0.29, -0.12, y));
  if (legWeight) {
    const lower = legWeight * (1 - blend(-0.31, -0.217, y));
    const paw = lower * (1 - blend(-0.394, -0.322, y));
    weights.push([leg.upper, legWeight - lower], [leg.lower, lower - paw], [leg.paw, paw]);
  }
  weights.push([body, Math.max(0, 1 - headWeight - tailWeight - legWeight)]);
  return weights.filter(([, weight]) => weight > 0.001).sort((a, b) => b[1] - a[1]).slice(0, 4);
}

function euler(rx, ry, rz) {
  const sx = Math.sin(rx / 2), cx = Math.cos(rx / 2);
  const sy = Math.sin(ry / 2), cy = Math.cos(ry / 2);
  const sz = Math.sin(rz / 2), cz = Math.cos(rz / 2);
  return [sx * cy * cz + cx * sy * sz, cx * sy * cz - sx * cy * sz,
    cx * cy * sz + sx * sy * cz, cx * cy * cz - sx * sy * sz];
}

function pose({ shift = [0, 0, 0], bodyTurn = [0, 0, 0], headTurn = [0, 0, 0],
  wag = 0, ears = 0, legs: strokes = [] } = {}) {
  const turns = {
    [body]: bodyTurn,
    [head]: headTurn,
    [earL]: [ears, 0, -ears * 0.35],
    [earR]: [ears, 0, ears * 0.35],
    [tail]: [0.09, wag, 0],
    [tip]: [0.05, wag * 0.65, 0]
  };
  legs.forEach(({ upper, lower, paw }, index) => {
    const [hip = 0, knee = 0, ankle = 0] = strokes[index] ?? [];
    turns[upper] = [hip, 0, 0];
    turns[lower] = [knee, 0, 0];
    turns[paw] = [ankle, 0, 0];
  });
  return { translation: shift, turns };
}
const allLegs = (front, rear = front) => [front, front, rear, rear];

function gait(phase) {
  const t = phase * Math.PI * 2;
  const strokes = legs.map((_, index) => {
    const stride = t + [0, Math.PI, Math.PI * 1.13, 0.13 * Math.PI][index];
    const swing = Math.sin(stride);
    const lift = Math.max(0, -swing);
    const hip = 0.27 * Math.cos(stride);
    const knee = (index < 2 ? 0.32 : -0.35) * lift;
    return [hip, knee, -0.62 * (hip + knee)];
  });
  return pose({
    shift: [0, 0.008 + 0.014 * Math.sin(t * 2), 0],
    bodyTurn: [Math.cos(t) * 0.024, 0, Math.sin(t) * 0.027],
    headTurn: [Math.sin(t * 2) * 0.04, 0, -Math.sin(t) * 0.015],
    wag: Math.sin(t) * 0.17, ears: Math.sin(t * 2 - 0.4) * 0.09,
    legs: strokes
  });
}

const clips = [
  ['idle', [0, 0.45, 0.9, 1.35, 1.8], (t) => {
    const phase = t / 1.8 * Math.PI * 2;
    const wag = Math.sin(phase) * 0.25;
    return pose({ shift: [0, Math.sin(phase) * 0.009, 0], headTurn: [Math.sin(phase) * 0.026, wag * 0.17, 0],
      wag, ears: -Math.sin(phase - 0.45) * 0.045 });
  }],
  ['walk', Array.from({ length: 9 }, (_, i) => i * 0.1), (t) => gait(t / 0.8)],
  ['pounce', [0, 0.12, 0.21, 0.324, 0.43, 0.55, 0.72], [
    pose(),
    pose({ shift: [0, -0.055, -0.055], bodyTurn: [-0.08, 0, 0], headTurn: [0.165, 0, 0],
      wag: -0.1, ears: 0.1, legs: allLegs([-0.18, 0.34, -0.13], [0.15, -0.31, 0.2]) }),
    pose({ shift: [0, 0.087, 0.088], bodyTurn: [-0.18, 0, 0], headTurn: [0.18, 0, 0],
      wag: -0.25, ears: -0.14, legs: allLegs([0.5, -0.18, -0.22], [-0.42, 0.12, 0.15]) }),
    pose({ shift: [0, 0.098, 0.205], bodyTurn: [0.018, 0, 0], headTurn: [0.06, 0, 0],
      wag: -0.32, ears: -0.13, legs: allLegs([0.56, -0.23, -0.19], [-0.28, -0.19, 0.18]) }),
    pose({ shift: [0, -0.028, 0.182], bodyTurn: [0.11, 0, 0], headTurn: [-0.08, 0, 0],
      wag: 0.25, ears: 0.12, legs: allLegs([0.11, 0.3, -0.25], [0.32, -0.25, 0.08]) }),
    pose({ shift: [0, 0.022, 0.085], bodyTurn: [-0.035, 0, 0], ears: 0.09,
      legs: allLegs([-0.16, 0.12, 0.02], [0.12, -0.16, 0.04]) }),
    pose()
  ]],
  ['hurt', [0, 0.11, 0.22, 0.36, 0.5], [
    pose(),
    pose({ shift: [-0.028, 0.047, -0.13], bodyTurn: [-0.14, -0.09, 0.12], headTurn: [-0.25, -0.12, 0],
      wag: 0.4, ears: -0.25, legs: allLegs([0.23, 0.38, -0.3], [-0.12, -0.21, 0.18]) }),
    pose({ shift: [-0.013, -0.037, -0.092], headTurn: [0.135, 0.06, -0.08],
      wag: -0.26, ears: 0.19, legs: allLegs([-0.1, 0.19, -0.08], [0.14, -0.15, 0.09]) }),
    pose({ shift: [0, 0.01, -0.025], headTurn: [-0.04, 0, 0], wag: 0.1, ears: -0.08 }),
    pose()
  ]],
  ['fall', [0, 0.24, 0.38, 0.56, 0.74, 0.88], [
    pose(),
    pose({ shift: [-0.055, 0.04, -0.047], bodyTurn: [-0.04, 0.04, 0.22], headTurn: [0.11, 0.04, -0.12],
      wag: -0.26, ears: 0.13, legs: [[-0.08, 0.45], [0.2, 0.42], [0.11, -0.29], [0.18, -0.3]] }),
    pose({ shift: [-0.095, -0.049, -0.083], bodyTurn: [0.01, 0.08, 0.63], headTurn: [0.14, 0.05, -0.08],
      wag: -0.39, ears: 0.19, legs: [[-0.21, 0.44], [0.31, 0.43], [0.29, -0.45], [0.17, -0.35]] }),
    pose({ shift: [-0.13, -0.112, -0.098], bodyTurn: [0.017, 0.12, 1.33], headTurn: [-0.035, -0.14, -0.22],
      wag: -0.51, ears: 0.24, legs: [[-0.2, 0.47], [0.12, 0.6], [0.32, -0.44], [0.08, -0.36]] }),
    pose({ shift: [-0.15, -0.103, -0.115], bodyTurn: [0.017, 0.12, 1.42], headTurn: [0.04, -0.15, -0.18],
      wag: -0.42, ears: 0.18, legs: [[-0.11, 0.39], [0.15, 0.54], [0.21, -0.35], [0.07, -0.28]] }),
    pose({ shift: [-0.15, -0.103, -0.115], bodyTurn: [0.017, 0.12, 1.42], headTurn: [0.04, -0.15, -0.18],
      wag: -0.42, ears: 0.18, legs: [[-0.11, 0.39], [0.15, 0.54], [0.21, -0.35], [0.07, -0.28]] })
  ]]
];

const pad = (length) => (4 - length % 4) % 4;
function encodeGlb(json, bin) {
  const text = Buffer.from(JSON.stringify(json));
  const jsonSize = text.length + pad(text.length);
  const binSize = bin.length + pad(bin.length);
  const result = Buffer.alloc(28 + jsonSize + binSize);
  result.write('glTF', 0);
  result.writeUInt32LE(2, 4);
  result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(jsonSize, 12);
  result.write('JSON', 16);
  result.fill(0x20, 20, 20 + jsonSize);
  text.copy(result, 20);
  result.writeUInt32LE(binSize, 20 + jsonSize);
  result.writeUInt32LE(0x004e4942, 24 + jsonSize);
  bin.copy(result, 28 + jsonSize);
  return result;
}

function rig(source) {
  assert.equal(source.toString('utf8', 0, 4), 'glTF');
  assert.equal(source.readUInt32LE(8), source.length);
  const jsonSize = source.readUInt32LE(12);
  const json = JSON.parse(source.toString('utf8', 20, 20 + jsonSize));
  assert(!json.skins && !json.animations && json.meshes.length === 1 && json.meshes[0].primitives.length === 1);
  const bin = source.subarray(28 + jsonSize);
  const meshNodeIndex = json.nodes.findIndex((node) => node.mesh === 0);
  const mesh = json.nodes[meshNodeIndex];
  assert(mesh.translation?.length === 3 && mesh.scale?.length === 3 && !mesh.rotation);
  const attrs = json.meshes[0].primitives[0].attributes;
  const position = json.accessors[attrs.POSITION];
  const positionViewIndex = position.bufferView;
  const packed = json.bufferViews[positionViewIndex].extensions.EXT_meshopt_compression;
  assert.equal(position.componentType, 5123);
  const packedPositions = bin.subarray(packed.byteOffset, packed.byteOffset + packed.byteLength);
  const decoded = decodeMeshopt3D(packedPositions, packed.count, packed.byteStride, packed.mode, packed.filter);
  const quantized = new DataView(decoded.buffer, decoded.byteOffset, decoded.byteLength);

  const positions = new Float32Array(position.count * 3);
  const joints = new Uint8Array(position.count * 4);
  const weights = new Uint8Array(position.count * 4);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < position.count; i++) {
    const vertex = mesh.translation.map((v, axis) => v + mesh.scale[axis] *
      quantized.getUint16(i * packed.byteStride + (position.byteOffset ?? 0) + axis * 2, true));
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], vertex[axis]);
      max[axis] = Math.max(max[axis], vertex[axis]);
    }
    positions.set(vertex, i * 3);
    const skin = weightsAt(...vertex);
    const total = skin.reduce((sum, [, weight]) => sum + weight, 0);
    let cumulative = 0, earlier = 0;
    skin.forEach(([id, weight], slot) => {
      cumulative += weight;
      const rounded = slot === skin.length - 1 ? 255 : Math.round(cumulative * 255 / total);
      joints[i * 4 + slot] = id;
      weights[i * 4 + slot] = rounded - earlier;
      earlier = rounded;
    });
  }

  // Repack binary views, preserving textures and other packed streams verbatim.
  const chunks = [];
  let byteLength = 0;
  const push = (bytes) => {
    const offset = byteLength;
    chunks.push(bytes, Buffer.alloc(pad(bytes.length)));
    byteLength += bytes.length + pad(bytes.length);
    return offset;
  };
  for (const [i, view] of json.bufferViews.entries()) {
    if (i === positionViewIndex) continue;
    const descriptor = view.extensions?.EXT_meshopt_compression ?? view;
    assert.equal(descriptor.buffer, 0);
    const start = descriptor.byteOffset ?? 0;
    descriptor.byteOffset = push(bin.subarray(start, start + descriptor.byteLength));
  }
  const view = (data, target) => {
    const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    return { buffer: 0, byteOffset: push(bytes), byteLength: bytes.length, ...(target ? { target } : {}) };
  };
  const add = (data, count, type, componentType, extra = {}, target) => {
    const bufferView = json.bufferViews.push(view(data, target)) - 1;
    return json.accessors.push({ bufferView, componentType, count, type, ...extra }) - 1;
  };
  json.bufferViews[positionViewIndex] = view(positions, 34962);
  Object.assign(position, { componentType: 5126, byteOffset: 0, min, max });
  attrs.JOINTS_0 = add(joints, position.count, 'VEC4', 5121, {}, 34962);
  attrs.WEIGHTS_0 = add(weights, position.count, 'VEC4', 5121, { normalized: true }, 34962);
  delete mesh.translation;
  delete mesh.scale;
  mesh.skin = 0;

  const armature = json.nodes.push({ name: 'hound_armature', translation: origin, rotation: euler(0, heading, 0),
    children: [json.nodes.length + 1] }) - 1;
  const firstBone = armature + 1;
  json.scenes[json.scene ?? 0].nodes.push(armature);
  const sizes = new Float32Array(parts.length * 16);
  for (const [id, part] of parts.entries()) {
    const parent = part.parent === null ? [0, 0, 0] : parts[part.parent].rest;
    const translation = part.rest.map((v, axis) => v - parent[axis]);
    const children = parts.flatMap((node, i) => node.parent === id ? [firstBone + i] : []);
    json.nodes.push({ name: part.name, translation, ...(children.length ? { children } : {}) });
    const [x, y, z] = part.rest;
    const originX = cosine * origin[0] - sine * origin[2];
    const originZ = sine * origin[0] + cosine * origin[2];
    sizes.set([cosine, 0, sine, 0, 0, 1, 0, 0, -sine, 0, cosine, 0,
      -x - originX, -y, -z - originZ, 1], id * 16);
  }
  json.skins = [{ name: 'hound_skin', skeleton: firstBone,
    joints: parts.map((_, index) => firstBone + index),
    inverseBindMatrices: add(sizes, parts.length, 'MAT4', 5126) }];

  json.animations = clips.map(([name, times, poses]) => {
    const input = add(Float32Array.from(times), times.length, 'SCALAR', 5126, { min: [0], max: [times.at(-1)] });
    const frames = typeof poses === 'function' ? times.map(poses) : poses;
    const channels = [], samplers = [];
    const track = (id, path, values, type) => {
      const output = add(Float32Array.from(values), times.length, type, 5126);
      const sampler = samplers.push({ input, output, interpolation: 'LINEAR' }) - 1;
      channels.push({ sampler, target: { node: firstBone + id, path } });
    };
    track(body, 'translation', frames.flatMap(({ translation }) =>
      parts[body].rest.map((value, i) => value + translation[i])), 'VEC3');
    parts.forEach((_, id) => {
      track(id, 'rotation', frames.flatMap(({ turns }) => euler(...(turns[id] ?? [0, 0, 0]))), 'VEC4');
    });
    return { name, channels, samplers };
  });
  json.asset.extras = { ...json.asset.extras, sourceSha256: createHash('sha256').update(source).digest('hex'),
    rig: 'StarBanner original hound: locally authored four-legged rig and in-place clips.' };
  json.buffers[0].byteLength = byteLength;
  return encodeGlb(json, Buffer.concat(chunks, byteLength));
}

await mkdir(outputDirectory, { recursive: true });
for (const tier of ['high', 'mid', 'low']) {
  const name = 'hound-' + tier + '.glb';
  const source = await readFile(join(sourceDirectory, name));
  const output = rig(source);
  await writeFile(join(outputDirectory, name), output);
  console.log(tier, source.length, '→', output.length,
    'source SHA-256', createHash('sha256').update(source).digest('hex'));
}
