// Derive the action poses from the original CMU takes. See docs/combat-motion-source.md.
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { quatFromAxisAngle, quatFromEuler, quatMultiply, quatToEuler, vec3TransformQuat } from '../vendor/engine/dist/rendering/world3d/math3D.js';
import { solveCmuTrial } from './cmu-motion.mjs';

const hashes = {
  '02.asf': 'c9f5ff45b4437b279f58b95dacf017afd3135373096274df69436a9354d796cf',
  '02_07.amc': '6171216b0bd691843096798431a5f201b9d1340503cf89ce20180b6143597cd8',
  '02_08.amc': 'cbf08bb1aeba0487330b0096adb634170f6ddc617c19349b8954a99904a19634',
  '128.asf': 'f90874a64be0d9990d413c7e36d8c0206f941356e3ca544a4932ebff166cd2c4',
  '128_04.amc': 'd7feeaced013212227881145016a1ce39e6054f6e2977f3e83a40741c95882d9'
};
const selections = [
  { name: 'thrust', source: '02_08', marker: [146, 171, 197, 204, 212] },
  { name: 'sweep', source: '02_07', marker: [1538, 1575, 1608, 1635, 1667] },
  { name: 'overhead', source: '02_07', marker: [109, 127, 156, 174, 193] },
  { name: 'slash', source: '02_07', marker: [827, 851, 880, 898, 928] },
  { name: 'duck', source: '128_04', marker: [58, 74, 96, 109, 132] }
];
const joints = ['hips', 'spine', 'head', 'legL', 'shinL', 'footL', 'legR', 'shinR', 'footR', 'armL', 'foreL', 'armR', 'foreR'];
const subdivisions = 8;

const multiply = (a, b) => quatMultiply([], a, b);
const inverse = ([x, y, z, w]) => [-x, -y, -z, w];
const rotate = (q, v) => vec3TransformQuat([], v, q);
const subtract = (a, b) => a.map((v, i) => v - b[i]);
const normalize = v => v.map((value, _, vector) => value / Math.hypot(...vector));
const euler = angles => quatFromEuler([], ...angles);
const relative = (parent, turn) => quatToEuler([], multiply(inverse(parent), turn));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mix = (a, b, f) => a + (b - a) * f;
const down = ([x, y, z]) => [Math.atan2(-z, -y), 0, Math.asin(clamp(x, -1, 1))];
const forward = ([x, y, z]) => [Math.atan2(-y, z), Math.asin(clamp(x, -1, 1)), 0];
const rounded = value => Number(value.toFixed(4));

async function readOriginal(directory, filename) {
  const contents = await readFile(resolve(directory, filename));
  if (createHash('sha256').update(contents).digest('hex') !== hashes[filename]) {
    throw new Error('Unexpected CMU file: ' + filename);
  }
  return contents.toString('utf8');
}

function retarget(frame, heading, initialY, duck) {
  const j = frame.joints;
  const direction = (from, to) => rotate(heading, normalize(subtract(j[to].point, j[from].point)));
  const [pitch, yaw, roll] = relative([0,0,0,1], multiply(heading, j.root.turn));
  const hips = [pitch * .53, yaw * .77, roll * .86], hip = euler(hips);
  const chest = multiply(heading, j.thorax.turn);
  const spine = relative(hip, chest).map((angle, axis) =>
    clamp(angle * .94, axis === 0 ? -.43 : -.80, axis === 0 && duck ? 1.18 : .80));
  const spineSpace = multiply(hip, euler(spine));
  const pose = { hips, spine, head: relative(j.thorax.turn, j.head.turn).map(value => value * .71) };
  let floor = Infinity;
  for (const [prefix, suffix, hipX] of [['l', 'L', .10], ['r', 'R', -.10]]) {
    const leg = direction(prefix + 'hipjoint', prefix + 'femur');
    const shin = direction(prefix + 'femur', prefix + 'tibia');
    const legAngles = down(rotate(inverse(hip), leg));
    const legSpace = multiply(hip, euler(legAngles));
    const shinAngles = down(rotate(inverse(legSpace), shin));
    const shinSpace = multiply(legSpace, euler(shinAngles));
    const toe = rotate(multiply(heading, j[prefix + 'foot'].turn), [0,0,1]);
    const footAngles = forward(rotate(inverse(shinSpace), toe));
    const footSpace = multiply(shinSpace, euler(footAngles));
    const ankleY = rotate(hip, [hipX, 0, 0])[1] + leg[1] * .45 + shin[1] * .404;
    floor = Math.min(floor, ankleY + rotate(footSpace, [0, -.073, -.052])[1], ankleY + rotate(footSpace, [0, -.073, .15])[1]);
    pose['leg' + suffix] = legAngles;
    pose['shin' + suffix] = shinAngles;
    pose['foot' + suffix] = footAngles;

    const upper = direction(prefix + 'clavicle', prefix + 'humerus');
    const lower = direction(prefix + 'humerus', prefix + 'radius');
    const armAngles = down(rotate(inverse(spineSpace), upper));
    const armSpace = multiply(spineSpace, euler(armAngles));
    pose['arm' + suffix] = armAngles;
    pose['fore' + suffix] = down(rotate(inverse(armSpace), lower));
  }
  // Root travel belongs to the game. Preserve the captured rise and drop, and
  // correct for the difference in leg length so the lower boot meets the floor.
  const rise = (j.root.point[1] - initialY) * .82;
  const lift = clamp(mix(rise, -.94 - floor, .72), -.44, .12);
  return [lift, ...joints.flatMap(name => pose[name])];
}

function renderClip(selection, take) {
  const { name, marker } = selection;
  const start = take[marker[0] - 1].joints.root;
  const end = take[marker.at(-1) - 1].joints.root;
  const hit = take[marker[2] - 1].joints.root;
  const duck = name === 'duck';
  const facing = duck ? subtract(end.point, start.point) : rotate(hit.turn, [0,0,1]);
  const heading = quatFromAxisAngle([], [0,1,0], -Math.atan2(facing[0], facing[2]));
  const rows = take.slice(marker[0] - 1, marker.at(-1)).map(frame => retarget(frame, heading, start.point[1], duck));
  // Avoid wrapping arm/foot Euler angles at +/- pi during interpolation.
  for (let i = 1; i < rows.length; i++) {
    for (let axis = 1; axis < rows[i].length; axis++) {
      const before = rows[i - 1][axis], after = rows[i][axis];
      rows[i][axis] = before + Math.atan2(Math.sin(after - before), Math.cos(after - before));
    }
  }
  const samples = [];
  for (let segment = 0; segment < 4; segment++) {
    for (let index = 0; index < subdivisions; index++) {
      const time = mix(marker[segment], marker[segment + 1], index / subdivisions) - marker[0];
      const lower = Math.floor(time), f = time - lower;
      samples.push(rows[lower].map((value, axis) => rounded(mix(value, rows[lower + 1][axis], f))));
    }
  }
  samples.push(rows.at(-1).map(rounded));
  return samples;
}

const [directory, output] = process.argv.slice(2);
if (!directory || !output) throw new Error('Usage: node tools/retarget-combat.mjs <CMU originals> <output-mjs>');
const takes = new Map();
for (const { source } of selections) {
  if (takes.has(source)) continue;
  const [skeleton, animation] = await Promise.all([readOriginal(directory, source.split('_')[0] + '.asf'), readOriginal(directory, source + '.amc')]);
  takes.set(source, solveCmuTrial(skeleton, animation));
}
const lists = selections.map(({ name, source, marker }) => {
  const frames = renderClip({ name, marker }, takes.get(source));
  console.log(name, source, marker.join(', '), frames.length);
  const provenance = JSON.stringify({ source, marker });
  return `  ${name}: {
    ...${provenance},
    frames: [
${frames.map(row => '      ' + JSON.stringify(row)).join(',\n')}
    ]
  }`;
});
await writeFile(output, `// Generated by tools/retarget-combat.mjs. Timing and reuse terms: docs/combat-motion-source.md.
export const actionJoints = ${JSON.stringify(joints)};
export const samplesPerSegment = ${subdivisions};
export const captures = {
${lists.join(',\n')}
};
`);
