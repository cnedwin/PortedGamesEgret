// Derive the game gait clips from the original CMU subject 35 ASF/AMC files.
// See docs/locomotion-source.md for source URLs, selected frames, and rig conventions.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { quatFromAxisAngle, quatFromEuler, quatMultiply, quatToEuler, vec3TransformQuat } from '../vendor/engine/dist/rendering/world3d/math3D.js';

const hashes = {
  '35.asf': '2a8e2eda3c0d7d828566b2a9a8ab36b2b8b3864110574e8b73c8f069fded416c',
  '35_08.amc': '95d6b0b70eb12bed3dc8c1c284a8b7ba1ff845c93fa992ac0ba444fdf9e51762',
  '35_18.amc': 'b83673d6f66b56eef95beda511ebca7ae9c759c1a1694c852bc602623430aa42'
};
const sourceHz = 120;
const radians = Math.PI / 180;
const axes = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const multiply = (a, b) => quatMultiply([], a, b);
const turn = (axis, angle) => quatFromAxisAngle([], axes[axis], angle);
const inverse = ([x, y, z, w]) => [-x, -y, -z, w];
const rotate = (rotation, direction) => vec3TransformQuat([], direction, rotation);
const add = (a, b) => a.map((value, i) => value + b[i]);
const subtract = (a, b) => a.map((value, i) => value - b[i]);
const scale = (v, k) => v.map(value => value * k);
const normalize = v => scale(v, 1 / Math.hypot(...v));
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

async function readOriginal(directory, filename) {
  const bytes = await readFile(resolve(directory, filename));
  if (createHash('sha256').update(bytes).digest('hex') !== hashes[filename]) throw new Error(`Unexpected original CMU file bytes for ${filename}`);
  return bytes.toString('utf8');
}

function asfRotation(angles, order = 'xyz') {
  let rotation = [0, 0, 0, 1];
  for (let index = 0; index < order.length; index++) rotation = multiply(turn(order[index], angles[index] * radians), rotation);
  return rotation;
}

function readSkeleton(source) {
  const unit = Number(source.match(/\n\s*length ([\d.]+)\r?\n/)[1]);
  const meters = 0.0254 / unit;
  const [, bones, hierarchy] = source.match(/:bonedata\s*([\s\S]+?):hierarchy\s*begin\s*([\s\S]+?)\s*end/);
  const joints = new Map();
  for (const [, body] of bones.matchAll(/\bbegin\s+([\s\S]*?)\bend\b/g)) {
    const name = body.match(/\bname\s+(\w+)/)[1];
    const length = Number(body.match(/\blength[^\S\r\n]+([^\r\n]+)/)[1]);
    const direction = body.match(/\bdirection[^\S\r\n]+([^\r\n]+)/)[1].trim().split(/\s+/).map(Number);
    const [, axis] = body.match(/\baxis[^\S\r\n]+([^\r\n]+)/);
    const values = axis.trim().split(/\s+/);
    const order = values.pop().toLowerCase();
    const basis = asfRotation(values.map(Number), order);
    const dof = (body.match(/\bdof[^\S\r\n]+([^\r\n]+)/)?.[1] ?? '').trim().split(/\s+/).filter(Boolean);
    joints.set(name, { basis, unbasis: inverse(basis), dof, offset: scale(direction, length * meters), children: [] });
  }
  joints.set('root', { children: [] });
  for (const line of hierarchy.split(/\r?\n/)) {
    const [parent, ...children] = line.trim().split(/\s+/);
    if (parent) joints.get(parent).children.push(...children);
  }
  return { joints, meters };
}

function readFrames(source) {
  const frames = [];
  for (const value of source.split(/\r?\n/)) {
    const line = value.trim();
    if (!line || line.startsWith('#') || line.startsWith(':')) continue;
    if (/^\d+$/.test(line)) frames.push({ number: Number(line), fields: new Map() });
    else {
      const [name, ...fields] = line.split(/\s+/);
      frames.at(-1).fields.set(name, fields.map(Number));
    }
  }
  return frames;
}

function solveSkeleton({ joints, meters }, frame) {
  const root = frame.fields.get('root');
  const result = { root: { point: scale(root.slice(0, 3), meters), turn: asfRotation(root.slice(3)) } };
  function traverse(parent) {
    const p = result[parent];
    for (const name of joints.get(parent).children) {
      const j = joints.get(name);
      const move = j.dof.length ? asfRotation(frame.fields.get(name), j.dof.map(channel => channel.at(-1)).join('')) : [0, 0, 0, 1];
      const rotation = multiply(p.turn, multiply(multiply(j.basis, move), j.unbasis));
      result[name] = { point: add(p.point, rotate(rotation, j.offset)), turn: rotation };
      traverse(name);
    }
  }
  traverse('root');
  return { number: frame.number, joints: result };
}

const [directory, output = '--inspect'] = process.argv.slice(2);
if (!directory) throw new Error('Usage: node tools/retarget-locomotion.mjs <directory-with-cmu-files> [output-mjs]');
const skeleton = readSkeleton(await readOriginal(directory, '35.asf'));
const trials = await Promise.all(['35_08.amc', '35_18.amc'].map(async file => readFrames(await readOriginal(directory, file)).map(frame => solveSkeleton(skeleton, frame))));
if (output === '--inspect') {
  for (const frames of trials) {
    const columns = [['root', 1], ['root', 2], ['ltibia', 1], ['lfoot', 1], ['lfoot', 2], ['rtibia', 1], ['rfoot', 1], ['rfoot', 2]];
    console.log('frame  pelvisY pelvisZ lankleY lballY lballZ rankleY rballY rballZ');
    for (const { number, joints } of frames.filter(frame => (frame.number - 1) % 5 === 0)) {
      console.log(number, ...columns.map(([name, coord]) => joints[name].point[coord].toFixed(3)));
    }
  }
}


const gaitJoints = ['hips', 'spine', 'head', 'legL', 'shinL', 'footL', 'legR', 'shinR', 'footR', 'armL', 'foreL', 'armR', 'foreR'];
const gameRotation = angles => quatFromEuler([], ...angles);
const gameAngles = rotation => quatToEuler([], rotation);
const interpolate = (a, b, k) => a.map((value, i) => value + (b[i] - value) * k);
const relativeTo = (parent, child) => multiply(inverse(parent), child);
const angleOnDownAxis = ([x, y, z]) => [Math.atan2(-z, -y), 0, Math.asin(clamp(x, -1, 1))];
const angleOnForwardAxis = ([x, y, z]) => [Math.atan2(-y, z), Math.asin(clamp(x, -1, 1)), 0];
const times = { walk: { contacts: [110, 174, 246], releases: [185, 250] }, run: { contacts: [31, 76, 126], releases: [54, 99] } };
const samples = 48;
const ease = value => value * value * (3 - 2 * value);

function contact(frame, plant, leave, period) {
  // Begin the plant blend a few recorded frames before heel strike, then lift at toe-off.
  const transition = 5;
  const age = ((frame - plant + transition) % period + period) % period - transition;
  return ease(clamp((age + transition) / transition, 0, 1)) * ease(clamp((leave - plant - age) / transition, 0, 1));
}

function gaitPose({ joints }, heading) {
  const q = name => multiply(heading, joints[name].turn);
  const segment = (from, to) => rotate(heading, normalize(subtract(joints[to].point, joints[from].point)));
  const relativeDirection = (parent, direction) => rotate(inverse(parent), direction);
  const [hipPitch, hipYaw, hipRoll] = gameAngles(q('root'));
  const hips = [hipPitch * .3, hipYaw * .72, hipRoll * .88];
  const hipSpace = gameRotation(hips);
  const spine = gameAngles(relativeTo(hipSpace, q('thorax'))).map((angle, axis) => clamp(angle, axis === 0 ? -.18 : -.35, .4));
  const spineSpace = multiply(hipSpace, gameRotation(spine));
  const head = scale(gameAngles(relativeTo(q('thorax'), q('head'))), .45);
  const pose = { hips, spine, head };
  const floors = [];
  for (const [source, target, hipX] of [['l', 'L', .1], ['r', 'R', -.1]]) {
    const thighDirection = segment(source + 'hipjoint', source + 'femur');
    const leg = angleOnDownAxis(relativeDirection(hipSpace, thighDirection));
    const legSpace = multiply(hipSpace, gameRotation(leg));
    const shinDirection = segment(source + 'femur', source + 'tibia');
    const shin = angleOnDownAxis(relativeDirection(legSpace, shinDirection));
    const shinSpace = multiply(legSpace, gameRotation(shin));
    const footDirection = rotate(q(source + 'foot'), [0, 0, 1]);
    const foot = angleOnForwardAxis(relativeDirection(shinSpace, footDirection));
    const footSpace = multiply(shinSpace, gameRotation(foot));
    const ankle = add(rotate(hipSpace, [hipX, 0, 0]), add(scale(thighDirection, .45), scale(shinDirection, .404)));
    const [heel, toe] = [[0, -.073, -.052], [0, -.073, .15]].map(edge => ankle[1] + rotate(footSpace, edge)[1]);
    floors.push(Math.min(heel, toe));
    pose['leg' + target] = leg;
    pose['shin' + target] = shin;
    pose['foot' + target] = foot;

    const upperArm = angleOnDownAxis(relativeDirection(spineSpace, segment(source + 'clavicle', source + 'humerus')));
    const armSpace = multiply(spineSpace, gameRotation(upperArm));
    const fore = angleOnDownAxis(relativeDirection(armSpace, segment(source + 'humerus', source + 'radius')));
    pose['arm' + target] = upperArm;
    pose['fore' + target] = fore;
  }
  return { pose, floors, rootY: joints.root.point[1] };
}

function cycle(kind, frames) {
  const { contacts: [left, right, end], releases: [leftOff, rightOff] } = times[kind];
  const span = end - left;
  const track = subtract(frames[end - 1].joints.root.point, frames[left - 1].joints.root.point);
  const heading = turn('y', -Math.atan2(track[0], track[2]));
  const rows = frames.slice(left - 1, end).map(frame => gaitPose(frame, heading));
  const restHip = .94;
  const averageY = rows.reduce((sum, row) => sum + row.rootY, 0) / rows.length;
  const deltaY = row => row.rootY - averageY;
  const floorOffsets = rows.flatMap(({ floors }, index) => {
    const row = rows[index];
    const frame = left + index;
    const weights = [contact(frame, left, leftOff, span), contact(frame, right, rightOff, span)];
    return floors.flatMap((floor, side) => weights[side] > .9 ? [restHip + floor + deltaY(row)] : []);
  }).sort((a, b) => a - b);
  const referenceFloor = floorOffsets[Math.floor(floorOffsets.length / 2)];
  const signal = Array.from({ length: samples + 1 }, (_, i) => {
    // Normalize a slight timing asymmetry so walking and running can blend at the same contacts.
    const phase = i / samples;
    const frame = phase <= .5 ? left + (right - left) * phase * 2 : right + (end - right) * (phase - .5) * 2;
    const index = frame - left;
    const row = rows[Math.floor(index)];
    const next = rows[Math.min(Math.floor(index) + 1, rows.length - 1)];
    const k = index - Math.floor(index);
    const weights = [contact(frame, left, leftOff, span), contact(frame, right, rightOff, span)];
    const soles = interpolate(row.floors, next.floors, k);
    const activeFloor = Math.min(...soles.filter((_, side) => weights[side] > .15));
    const drift = deltaY(row) + (deltaY(next) - deltaY(row)) * k - referenceFloor;
    const lift = Number.isFinite(activeFloor) ? drift + (-restHip - activeFloor - drift) * Math.max(...weights) * .7 : drift;
    return [lift, ...weights, ...gaitJoints.flatMap(name => interpolate(row.pose[name], next.pose[name], k))];
  });
  // Spread the slight discontinuity between filmed contacts over the twelve neighboring samples.
  // This retains the unmodified middle of the filmed stride and has zero correction slope at the seam.
  const drift = subtract(signal.at(-1), signal[0]);
  const round = value => Number(value.toFixed(4));
  const framesOut = signal.slice(0, -1).map((row, i) => {
    const shifted = i / samples;
    const seam = shifted <= .125 ? ease(1 - shifted / .125) : shifted >= .875 ? -ease((shifted - .875) / .125) : 0;
    return row.map((value, axis) => round(axis === 1 || axis === 2 ? value : value + drift[axis] * seam / 2));
  });
  return { sourceHz, sourceFrames: [left, right, end], duration: round(span / sourceHz), strideMeters: round(Math.hypot(track[0], track[2])), frames: framesOut };
}

if (output !== '--inspect') {
  const clips = [cycle('walk', trials[0]), cycle('run', trials[1])];
  const format = ({ frames, ...info }) => `{\n    ...${JSON.stringify(info)},\n    frames: [\n${frames.map(row => `      ${JSON.stringify(row)}`).join(',\n')}\n    ]\n  }`;
  const data = `// Generated by tools/retarget-locomotion.mjs from CMU Graphics Lab subject 35.\n// Source and reuse terms: docs/locomotion-source.md.\nexport const gaitJoints = ${JSON.stringify(gaitJoints)};\nexport const clips = {\n  walk: ${format(clips[0])},\n  run: ${format(clips[1])}\n};\n`;
  await writeFile(output, data);
  for (const [index, kind] of ['walk', 'run'].entries()) {
    const { frames, ...receipt } = clips[index];
    console.log(kind, JSON.stringify({ ...receipt, samples: frames.length }));
  }
}
