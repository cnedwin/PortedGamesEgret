// Acclaim text decoding and forward kinematics for the CMU motion converters.
import { quatFromAxisAngle, quatMultiply, vec3TransformQuat } from '../vendor/engine/dist/rendering/world3d/math3D.js';

const radians = Math.PI / 180;
const axes = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const multiply = (a, b) => quatMultiply([], a, b);
const turn = (axis, angle) => quatFromAxisAngle([], axes[axis], angle);
const inverse = ([x, y, z, w]) => [-x, -y, -z, w];
const rotate = (rotation, direction) => vec3TransformQuat([], direction, rotation);
const add = (a, b) => a.map((value, i) => value + b[i]);
const scale = (v, k) => v.map(value => value * k);

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

/** Resolve both text files into joint positions (metres) and global rotations. */
export function solveCmuTrial(skeletonSource, motionSource) {
  const skeleton = readSkeleton(skeletonSource);
  return readFrames(motionSource).map(frame => solveSkeleton(skeleton, frame));
}
