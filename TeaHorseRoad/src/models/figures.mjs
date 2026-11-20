// 会动的角色：山匪和狼。每个都是一副骨骼（Bone3D）加一块蒙皮网格，网格的每一块只跟一根骨头走；跑、站、扑的
// 动作是代码写出的关键帧剪辑（createAnimationClip3D），由 AnimationMixer3D 播放。山匪还带一副布娃娃的身体部件，
// 被车撞倒时交给 createRagdoll3D。
//
// The figures that move: bandits and wolves. Each is a skeleton of `Bone3D`s and one skinned mesh in which every
// piece follows a single bone. Running, standing and pouncing are key-framed clips written in code
// (`createAnimationClip3D`), played by an `AnimationMixer3D`. A bandit also carries the body parts of a ragdoll, handed
// to `createRagdoll3D` when a truck knocks him down.
import {
  AnimationMixer3D,
  Attribute3D,
  Bone3D,
  Geometry3D,
  Mesh3D,
  Object3D,
  Skeleton3D,
  createAnimationClip3D,
  createBoxGeometry3D,
  createCapsuleGeometry3D,
  createConeGeometry3D,
  createCylinderGeometry3D,
  createGeometryBuilder3D,
  createSphereGeometry3D,
  createStandardMaterial3D
} from '@egret/engine/world3d';

const skin = createStandardMaterial3D({ vertexColors: true, roughness: 0.85, metallic: 0 });

/**
 * One skinned geometry from pieces: each piece is `[geometry, bone index, placement]`, the placement in the figure's
 * rest pose. Every vertex of a piece follows its bone alone.
 */
function skinned(pieces) {
  const built = pieces.map(([geometry, bone, place]) => [createGeometryBuilder3D().add(geometry, place).build(), bone]);
  let vertices = 0,
    indices = 0;
  for (const [g] of built) {
    vertices += g.vertexCount;
    indices += g.index ? g.index.count : g.vertexCount;
  }
  const position = new Float32Array(vertices * 3),
    normal = new Float32Array(vertices * 3),
    color = new Float32Array(vertices * 4),
    joints = new Uint16Array(vertices * 4),
    weights = new Float32Array(vertices * 4),
    index = new Uint32Array(indices);
  let v = 0,
    k = 0;
  for (const [g, bone] of built) {
    const p = g.getAttribute('position').data,
      n = g.getAttribute('normal').data,
      c = g.getAttribute('color'),
      count = g.vertexCount;
    position.set(p, v * 3);
    normal.set(n, v * 3);
    for (let i = 0; i < count; i++) {
      const at = (v + i) * 4;
      if (c.itemSize === 4) color.set(c.data.subarray(i * 4, i * 4 + 4), at);
      else {
        color.set(c.data.subarray(i * 3, i * 3 + 3), at);
        color[at + 3] = 1;
      }
      joints[at] = bone;
      weights[at] = 1;
    }
    const source = g.index ? g.index.data : Array.from({ length: count }, (_, i) => i);
    for (let i = 0; i < source.length; i++) index[k + i] = source[i] + v;
    v += count;
    k += source.length;
  }
  const geometry = new Geometry3D();
  geometry.setAttribute('position', new Attribute3D(position, 3));
  geometry.setAttribute('normal', new Attribute3D(normal, 3));
  geometry.setAttribute('color', new Attribute3D(color, 4));
  geometry.setAttribute('joints', new Attribute3D(joints, 4));
  geometry.setAttribute('weights', new Attribute3D(weights, 4));
  geometry.setIndex(vertices > 65535 ? index : Uint16Array.from(index));
  return geometry;
}

/** A tree of bones from `[name, parent index, x, y, z]` rows, under `root`; positions are relative to the parent. */
function bones(root, rows) {
  const list = [];
  for (const [name, parent, x, y, z] of rows) {
    const bone = new Bone3D();
    bone.name = name;
    bone.setPosition(x, y, z);
    (parent < 0 ? root : list[parent]).addChild(bone);
    list.push(bone);
  }
  root.updateWorldMatrix();
  return list;
}

/** A quaternion for a turn of `angle` about the X, Y or Z axis, as four numbers. */
function q(axis, angle) {
  const s = Math.sin(angle / 2),
    c = Math.cos(angle / 2);
  return axis === 'x' ? [s, 0, 0, c] : axis === 'y' ? [0, s, 0, c] : [0, 0, s, c];
}

/**
 * A looping clip from per-bone swings: each entry turns a bone about an axis by `amplitude * sin(phase + 2πt)`, plus
 * a constant `bias`. `bob` moves the first bone up and down twice a cycle.
 */
function swingClip(name, period, swings, { bob = 0, rest = [0, 0, 0], keys = 12 } = {}) {
  const times = Array.from({ length: keys + 1 }, (_, i) => (i / keys) * period),
    tracks = [];
  for (const { bone, axis = 'x', amplitude, phase = 0, bias = 0, rectify = false } of swings) {
    const values = [];
    for (const t of times) {
      let wave = Math.sin(phase + (t / period) * Math.PI * 2);
      if (rectify) wave = Math.max(0, wave);
      values.push(...q(axis, bias + amplitude * wave));
    }
    tracks.push({ targetName: bone, path: 'quaternion', times, values });
  }
  if (bob) {
    const values = [];
    for (const t of times) values.push(rest[0], rest[1] + bob * Math.abs(Math.sin((t / period) * Math.PI * 2)), rest[2]);
    tracks.push({ targetName: swings[0].root ?? 'hips', path: 'position', times, values });
  }
  return createAnimationClip3D({ name, tracks, duration: period });
}

// ---- the bandit ---------------------------------------------------------------------------------------------------

const BANDIT_BONES = [
  ['hips', -1, 0, 0.98, 0],
  ['spine', 0, 0, 0.2, 0],
  ['head', 1, 0, 0.48, 0],
  ['armL', 1, 0.2, 0.38, 0],
  ['foreL', 3, 0, -0.3, 0],
  ['armR', 1, -0.2, 0.38, 0],
  ['foreR', 5, 0, -0.3, 0],
  ['thighL', 0, 0.1, -0.06, 0],
  ['shinL', 7, 0, -0.44, 0],
  ['thighR', 0, -0.1, -0.06, 0],
  ['shinR', 9, 0, -0.44, 0]
];

/** The bandits' clothes differ a little from man to man. */
const COATS = [0x5a4a3a, 0x3e4a52, 0x6a5232, 0x4a3e48];

function banditGeometry(variant) {
  const coat = COATS[variant % COATS.length],
    trousers = 0x2c2a2e,
    face = 0x9a6a48,
    cloth = 0x1e1c1c,
    straw = 0xb89a5c;
  const limb = (radius, length) => createCapsuleGeometry3D({ radius, height: Math.max(0.01, length - radius * 2), radialSegments: 8, capSegments: 3 });
  return skinned([
    // Hips and the long coat's skirt.
    [createCylinderGeometry3D({ radiusTop: 0.17, radiusBottom: 0.22, height: 0.3, radialSegments: 10 }), 0, { position: [0, 0.92, 0], color: coat }],
    [createCylinderGeometry3D({ radiusTop: 0.175, radiusBottom: 0.175, height: 0.07, radialSegments: 10 }), 0, { position: [0, 1.06, 0], color: 0x8a2a22 }],
    // The chest, a little forward, and a bundle strapped across the back.
    [createCylinderGeometry3D({ radiusTop: 0.21, radiusBottom: 0.17, height: 0.42, radialSegments: 10 }), 1, { position: [0, 1.3, 0.01], scale: [1, 1, 0.78], color: coat }],
    [createBoxGeometry3D({ width: 0.04, height: 0.5, depth: 0.04 }), 1, { position: [0.02, 1.32, -0.15], rotation: [0, 0, 0.7], color: 0x4a3420 }],
    // The head: a face masked by cloth below the eyes, and a wide bamboo hat.
    [createSphereGeometry3D({ radius: 0.115, widthSegments: 12, heightSegments: 8 }), 2, { position: [0, 1.6, 0], scale: [0.95, 1.08, 1], color: face }],
    [createCylinderGeometry3D({ radiusTop: 0.118, radiusBottom: 0.11, height: 0.09, radialSegments: 12 }), 2, { position: [0, 1.55, 0.008], color: cloth }],
    [createConeGeometry3D({ radius: 0.32, height: 0.16, radialSegments: 16 }), 2, { position: [0, 1.75, 0], color: straw }],
    [createCylinderGeometry3D({ radiusTop: 0.09, radiusBottom: 0.1, height: 0.05, radialSegments: 10 }), 2, { position: [0, 1.69, 0], color: 0x6a4a2a }],
    // Arms: sleeves to the elbow, forearms and fists.
    [limb(0.062, 0.34), 3, { position: [0.2, 1.21, 0], color: coat }],
    [limb(0.05, 0.3), 4, { position: [0.2, 0.92, 0], color: coat }],
    [createSphereGeometry3D({ radius: 0.05, widthSegments: 8, heightSegments: 6 }), 4, { position: [0.2, 0.76, 0], color: face }],
    [limb(0.062, 0.34), 5, { position: [-0.2, 1.21, 0], color: coat }],
    [limb(0.05, 0.3), 6, { position: [-0.2, 0.92, 0], color: coat }],
    [createSphereGeometry3D({ radius: 0.05, widthSegments: 8, heightSegments: 6 }), 6, { position: [-0.2, 0.76, 0], color: face }],
    // A cudgel in the right fist.
    [createCylinderGeometry3D({ radiusTop: 0.03, radiusBottom: 0.022, height: 0.8, radialSegments: 6 }), 6, { position: [-0.2, 0.78, 0.22], rotation: [Math.PI / 2 - 0.3, 0, 0], color: 0x3a2818 }],
    // Round joints at the shoulders, elbows and knees, so the limbs bend without gaps.
    [createSphereGeometry3D({ radius: 0.075, widthSegments: 8, heightSegments: 6 }), 3, { position: [0.2, 1.36, 0], color: coat }],
    [createSphereGeometry3D({ radius: 0.075, widthSegments: 8, heightSegments: 6 }), 5, { position: [-0.2, 1.36, 0], color: coat }],
    [createSphereGeometry3D({ radius: 0.058, widthSegments: 8, heightSegments: 6 }), 4, { position: [0.2, 1.06, 0], color: coat }],
    [createSphereGeometry3D({ radius: 0.058, widthSegments: 8, heightSegments: 6 }), 6, { position: [-0.2, 1.06, 0], color: coat }],
    [createSphereGeometry3D({ radius: 0.075, widthSegments: 8, heightSegments: 6 }), 8, { position: [0.1, 0.48, 0], color: trousers }],
    [createSphereGeometry3D({ radius: 0.075, widthSegments: 8, heightSegments: 6 }), 10, { position: [-0.1, 0.48, 0], color: trousers }],
    // A sash of rope across the chest, and a cloth tied round the brow under the hat.
    [createBoxGeometry3D({ width: 0.05, height: 0.55, depth: 0.32 }), 1, { position: [0, 1.3, 0.02], rotation: [0, 0, 0.75], scale: [1, 1, 1.05], color: 0x8a6a3a }],
    [createCylinderGeometry3D({ radiusTop: 0.12, radiusBottom: 0.12, height: 0.04, radialSegments: 12 }), 2, { position: [0, 1.65, 0], color: 0x8a2a22 }],
    // Legs: wrapped trousers, puttees and straw sandals.
    [limb(0.08, 0.46), 7, { position: [0.1, 0.7, 0], color: trousers }],
    [limb(0.065, 0.42), 8, { position: [0.1, 0.27, 0], color: 0x5a5244 }],
    [createBoxGeometry3D({ width: 0.11, height: 0.05, depth: 0.24 }), 8, { position: [0.1, 0.03, 0.04], color: straw }],
    [limb(0.08, 0.46), 9, { position: [-0.1, 0.7, 0], color: trousers }],
    [limb(0.065, 0.42), 10, { position: [-0.1, 0.27, 0], color: 0x5a5244 }],
    [createBoxGeometry3D({ width: 0.11, height: 0.05, depth: 0.24 }), 10, { position: [-0.1, 0.03, 0.04], color: straw }]
  ]);
}

const banditClips = {
  run: swingClip(
    'run',
    0.62,
    [
      { bone: 'hips', axis: 'y', amplitude: 0.12 },
      { bone: 'spine', amplitude: 0.05, bias: 0.28, phase: Math.PI / 2 },
      { bone: 'thighL', amplitude: 0.75, bias: -0.15 },
      { bone: 'thighR', amplitude: 0.75, bias: -0.15, phase: Math.PI },
      { bone: 'shinL', amplitude: 0.9, phase: -Math.PI / 2, rectify: true },
      { bone: 'shinR', amplitude: 0.9, phase: Math.PI / 2, rectify: true },
      { bone: 'armL', amplitude: 0.7, phase: Math.PI },
      { bone: 'armR', amplitude: 0.7 },
      { bone: 'foreL', amplitude: 0.3, bias: -1.0 },
      { bone: 'foreR', amplitude: 0.3, bias: -1.1, phase: Math.PI }
    ],
    { bob: 0.07, rest: [0, 0.94, 0] }
  ),
  idle: swingClip(
    'idle',
    2.4,
    [
      { bone: 'hips', axis: 'y', amplitude: 0.05 },
      { bone: 'spine', amplitude: 0.04, bias: 0.06 },
      { bone: 'head', axis: 'y', amplitude: 0.4, phase: 1 },
      { bone: 'armR', amplitude: 0.1, bias: -0.5 },
      { bone: 'foreR', amplitude: 0.15, bias: -1.2 },
      { bone: 'armL', amplitude: 0.05, bias: 0.1 }
    ],
    { bob: 0.01, rest: [0, 0.98, 0] }
  ),
  // Arms raised, the cudgel up, ready to grab: played while he holds on to a truck.
  grab: swingClip(
    'grab',
    0.5,
    [
      { bone: 'spine', amplitude: 0.08, bias: 0.4 },
      { bone: 'armL', amplitude: 0.3, bias: -1.6 },
      { bone: 'armR', amplitude: 0.5, bias: -2.0, phase: 1 },
      { bone: 'foreR', amplitude: 0.4, bias: -0.6 },
      { bone: 'thighL', amplitude: 0.3, bias: -0.3 },
      { bone: 'thighR', amplitude: 0.3, bias: 0.2, phase: Math.PI },
      { bone: 'shinL', amplitude: 0.2, bias: 0.4 }
    ],
    { bob: 0.03, rest: [0, 0.92, 0] }
  )
};

/** The ragdoll's parts over the bandit's bones, from the hips out. */
const BANDIT_PARTS = [
  { bone: 'hips', shape: { type: 'box', halfExtents: [0.18, 0.12, 0.12] }, offset: [0, -0.02, 0], mass: 12 },
  { bone: 'spine', shape: { type: 'box', halfExtents: [0.19, 0.22, 0.13] }, offset: [0, 0.22, 0], mass: 16, parent: 0, joint: { coneLimit: 0.5 } },
  { bone: 'head', shape: { type: 'sphere', radius: 0.13 }, offset: [0, 0.14, 0], mass: 4, parent: 1, joint: { coneLimit: 0.7 } },
  { bone: 'armL', shape: { type: 'capsule', radius: 0.06, halfHeight: 0.11 }, offset: [0, -0.17, 0], mass: 2, parent: 1, joint: { coneLimit: 1.4 } },
  { bone: 'foreL', shape: { type: 'capsule', radius: 0.05, halfHeight: 0.1 }, offset: [0, -0.15, 0], mass: 1.5, parent: 3, joint: { type: 'hinge', axis: [1, 0, 0], limits: [-2.4, 0] } },
  { bone: 'armR', shape: { type: 'capsule', radius: 0.06, halfHeight: 0.11 }, offset: [0, -0.17, 0], mass: 2, parent: 1, joint: { coneLimit: 1.4 } },
  { bone: 'foreR', shape: { type: 'capsule', radius: 0.05, halfHeight: 0.1 }, offset: [0, -0.15, 0], mass: 1.5, parent: 5, joint: { type: 'hinge', axis: [1, 0, 0], limits: [-2.4, 0] } },
  { bone: 'thighL', shape: { type: 'capsule', radius: 0.08, halfHeight: 0.14 }, offset: [0, -0.22, 0], mass: 6, parent: 0, joint: { coneLimit: 1.1 } },
  { bone: 'shinL', shape: { type: 'capsule', radius: 0.065, halfHeight: 0.14 }, offset: [0, -0.22, 0], mass: 4, parent: 7, joint: { type: 'hinge', axis: [1, 0, 0], limits: [0, 2.4] } },
  { bone: 'thighR', shape: { type: 'capsule', radius: 0.08, halfHeight: 0.14 }, offset: [0, -0.22, 0], mass: 6, parent: 0, joint: { coneLimit: 1.1 } },
  { bone: 'shinR', shape: { type: 'capsule', radius: 0.065, halfHeight: 0.14 }, offset: [0, -0.22, 0], mass: 4, parent: 9, joint: { type: 'hinge', axis: [1, 0, 0], limits: [0, 2.4] } }
];

/**
 * A bandit: `root` to place and turn (he faces local +Z), the mixer and its actions, and the parts for a ragdoll.
 * `bundle` is a tea bundle on his back, shown while he carries one off.
 */
export function createBandit(variant = 0) {
  const root = new Object3D(),
    list = bones(root, BANDIT_BONES),
    mesh = new Mesh3D(banditGeometry(variant), skin);
  mesh.castShadow = true;
  mesh.bind(new Skeleton3D(list));
  root.addChild(mesh);
  const bundle = new Mesh3D(
    createGeometryBuilder3D()
      .add(createCylinderGeometry3D({ radiusTop: 0.2, radiusBottom: 0.21, height: 0.58, radialSegments: 12 }), { rotation: [0, 0, Math.PI / 2], color: 0x8f7442 })
      .build(),
    skin
  );
  bundle.setPosition(0, 0.28, -0.2);
  bundle.visible = false;
  list[1].addChild(bundle);
  const mixer = new AnimationMixer3D(root),
    actions = Object.fromEntries(Object.entries(banditClips).map(([name, clip]) => [name, mixer.clipAction(clip)]));
  actions.idle.play();
  return { root, mesh, bones: list, mixer, actions, bundle, parts: BANDIT_PARTS };
}

// ---- the wolf -----------------------------------------------------------------------------------------------------

const WOLF_BONES = [
  ['hips', -1, 0, 0.62, -0.42],
  ['chest', 0, 0, 0.04, 0.78],
  ['head', 1, 0, 0.14, 0.3],
  ['legFL', 1, 0.13, -0.12, 0.08],
  ['legFR', 1, -0.13, -0.12, 0.08],
  ['legBL', 0, 0.14, -0.08, 0],
  ['legBR', 0, -0.14, -0.08, 0],
  ['tail', 0, 0, 0.06, -0.14]
];

function wolfGeometry(shade) {
  const fur = shade,
    belly = 0xb8ad98,
    dark = 0x2e2a26;
  const leg = createCapsuleGeometry3D({ radius: 0.05, height: 0.42, radialSegments: 6, capSegments: 2 });
  return skinned([
    // The body: haunches and a deeper chest, a ruff at the neck.
    [createSphereGeometry3D({ radius: 0.24, widthSegments: 12, heightSegments: 8 }), 0, { position: [0, 0.64, -0.38], scale: [0.85, 0.9, 1.35], color: fur }],
    [createSphereGeometry3D({ radius: 0.27, widthSegments: 12, heightSegments: 8 }), 1, { position: [0, 0.68, 0.28], scale: [0.85, 1.0, 1.3], color: fur }],
    [createSphereGeometry3D({ radius: 0.2, widthSegments: 10, heightSegments: 6 }), 1, { position: [0, 0.6, 0.3], scale: [0.8, 0.8, 1.5], color: belly }],
    [createSphereGeometry3D({ radius: 0.2, widthSegments: 10, heightSegments: 6 }), 1, { position: [0, 0.82, 0.5], scale: [1.0, 1.1, 0.8], color: 0x8a8274 }],
    // The head: skull, a long muzzle with a dark nose, upright ears.
    [createSphereGeometry3D({ radius: 0.14, widthSegments: 10, heightSegments: 8 }), 2, { position: [0, 0.86, 0.66], scale: [1, 0.92, 1.1], color: fur }],
    [createConeGeometry3D({ radius: 0.075, height: 0.24, radialSegments: 8 }), 2, { position: [0, 0.82, 0.84], rotation: [Math.PI / 2, 0, 0], color: 0x8a8274 }],
    [createSphereGeometry3D({ radius: 0.028, widthSegments: 6, heightSegments: 4 }), 2, { position: [0, 0.83, 0.96], color: 0x141210 }],
    [createConeGeometry3D({ radius: 0.045, height: 0.12, radialSegments: 5 }), 2, { position: [0.07, 0.98, 0.62], color: dark }],
    [createConeGeometry3D({ radius: 0.045, height: 0.12, radialSegments: 5 }), 2, { position: [-0.07, 0.98, 0.62], color: dark }],
    // Legs, each one bone, and a brush of a tail.
    [leg, 3, { position: [0.13, 0.31, 0.44], color: fur }],
    [leg, 4, { position: [-0.13, 0.31, 0.44], color: fur }],
    [leg, 5, { position: [0.14, 0.31, -0.42], color: fur }],
    [leg, 6, { position: [-0.14, 0.31, -0.42], color: fur }],
    [createConeGeometry3D({ radius: 0.08, height: 0.48, radialSegments: 7 }), 7, { position: [0, 0.58, -0.78], rotation: [-Math.PI / 2 - 0.5, 0, 0], color: dark }]
  ]);
}

const wolfClips = {
  run: swingClip(
    'run',
    0.42,
    [
      { bone: 'hips', amplitude: 0.12 },
      { bone: 'chest', amplitude: 0.1, phase: Math.PI },
      { bone: 'head', amplitude: 0.1 },
      { bone: 'legFL', amplitude: 0.85, phase: 0.2 },
      { bone: 'legFR', amplitude: 0.85, phase: 0.6 },
      { bone: 'legBL', amplitude: 0.85, phase: Math.PI },
      { bone: 'legBR', amplitude: 0.85, phase: Math.PI + 0.4 },
      { bone: 'tail', amplitude: 0.25, bias: 0.3 }
    ],
    { bob: 0.06, rest: [0, 0.6, -0.42] }
  ),
  idle: swingClip(
    'idle',
    3.0,
    [
      { bone: 'hips', amplitude: 0.02 },
      { bone: 'head', axis: 'y', amplitude: 0.5 },
      { bone: 'tail', axis: 'y', amplitude: 0.3, bias: 0 }
    ],
    { bob: 0.01, rest: [0, 0.62, -0.42] }
  ),
  // Head low, hackles up: the stand before a pounce, and the bite.
  snarl: swingClip(
    'snarl',
    0.36,
    [
      { bone: 'chest', amplitude: 0.08, bias: 0.25 },
      { bone: 'head', amplitude: 0.25, bias: 0.3 },
      { bone: 'legFL', amplitude: 0.3, bias: -0.4 },
      { bone: 'legFR', amplitude: 0.3, bias: -0.4, phase: Math.PI },
      { bone: 'tail', amplitude: 0.1, bias: -0.3 }
    ],
    { bob: 0.02, rest: [0, 0.54, -0.42] }
  )
};

/** A wolf of the high pass: `root` to place and turn (it faces local +Z), with its mixer and actions. */
export function createWolf(variant = 0) {
  const root = new Object3D(),
    list = bones(root, WOLF_BONES),
    mesh = new Mesh3D(wolfGeometry([0x6e675c, 0x5c574f, 0x7a7266][variant % 3]), skin);
  mesh.castShadow = true;
  mesh.bind(new Skeleton3D(list));
  root.addChild(mesh);
  const mixer = new AnimationMixer3D(root),
    actions = Object.fromEntries(Object.entries(wolfClips).map(([name, clip]) => [name, mixer.clipAction(clip)]));
  actions.idle.play();
  return { root, mesh, bones: list, mixer, actions };
}

/** Change what a figure is doing: fade from whatever plays to `name`. */
export function play(figure, name, fade = 0.2) {
  const next = figure.actions[name];
  if (figure.current === next) return;
  if (figure.current) figure.current.crossFadeTo(next.reset().play(), fade);
  else {
    for (const action of Object.values(figure.actions)) action.stop();
    next.reset().play();
  }
  figure.current = next;
}
