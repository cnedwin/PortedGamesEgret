// 兵：用代码搭的小兵模型——持枪戟的步卒、刀盾手、弓弩手、骑兵、冲车与器械、战船，每种两份实例网格：一份是本色的
// 盔甲兵器，一份是染成本方颜色的战袍和旗。每帧把要画的兵重新排一遍：行军时上下起伏，交战时前冲后撤。
// Troops: small soldiers made in code — foot with spears and halberds, sword-and-shield men, archers, horsemen, rams and
// engines, ships — each kind as two instanced meshes: one for armour and weapons in their own colours, one for the coats
// and flags dyed in the side's colour. Every frame the soldiers to be drawn are laid out afresh: bobbing on the march,
// lunging and falling back in a fight.
import {
  InstancedMesh3D,
  createBoxGeometry3D,
  createConeGeometry3D,
  createCylinderGeometry3D,
  createGeometryBuilder3D,
  createIcosahedronGeometry3D,
  createStandardMaterial3D,
  mat4Compose,
  quatFromEuler
} from '@egret/engine/world3d';
import { UNITS } from '../data/battle.mjs';

const SKIN = 0xc49a74,
  IRON = 0x4f5c5b,
  LEATHER = 0x5a3e2a,
  WOOD = 0x6b4a2e,
  HORSE = [0x6d4a32, 0x3b2b22, 0x8a6a4a],
  WHITE = 0xffffff;

const cyl = (r1, r2, h, n = 6) => createCylinderGeometry3D({ radiusTop: r1, radiusBottom: r2, height: h, radialSegments: n });
const box = (w, h, d) => createBoxGeometry3D({ width: w, height: h, depth: d });
const ball = (r) => createIcosahedronGeometry3D({ radius: r, detail: 0 });

/** One soldier on foot, about 0.55 tall, facing +z; `arm` is what he carries. */
function footman(arm) {
  const plain = createGeometryBuilder3D(),
    coat = createGeometryBuilder3D();
  plain.add(cyl(0.035, 0.04, 0.2), { position: [-0.05, 0.1, 0], color: LEATHER });
  plain.add(cyl(0.035, 0.04, 0.2), { position: [0.05, 0.1, 0], color: LEATHER });
  coat.add(cyl(0.07, 0.1, 0.24, 7), { position: [0, 0.31, 0], color: WHITE });
  plain.add(box(0.2, 0.09, 0.13), { position: [0, 0.37, 0], color: IRON });
  plain.add(ball(0.06), { position: [0, 0.49, 0], color: SKIN });
  plain.add(createConeGeometry3D({ radius: 0.075, height: 0.09, radialSegments: 6 }), { position: [0, 0.56, 0], color: IRON });
  // Lamellar apron, bronze belt, shoulder guards and cheek plates read at close command distance.
  plain.add(box(0.18, 0.025, 0.145), { position: [0, 0.305, 0], color: 0x9c8654 });
  for (const side of [-1, 1]) {
    plain.add(box(0.075, 0.06, 0.16), { position: [side * 0.105, 0.385, 0], rotation: [0, 0, side * 0.15], color: IRON });
    plain.add(cyl(0.025, 0.022, 0.12, 4), { position: [side * 0.12, arm==='bow-loose'?0.39:0.32, arm==='spear-braced'?0.13:0.04], rotation: [arm==='spear-braced'?-1.1:arm==='bow-loose'?(side>0?1.3:-1.2):-0.3, 0, side * 0.12], color: LEATHER });
    plain.add(box(0.025, 0.055, 0.07), { position: [side * 0.055, 0.48, 0.01], color: IRON });
  }
  for (let i = -1; i <= 1; i++) plain.add(box(0.042, 0.11, 0.025), { position: [i * 0.052, 0.25, 0.073], rotation: [-0.12, 0, 0], color: i % 2 ? 0x65716b : IRON });
  plain.add(box(0.11, 0.016, 0.04), { position: [0, 0.52, 0.055], color: 0x9c956e });
  if (arm === 'spear' || arm === 'halberd' || arm === 'spear-braced') {
    const pitch=arm==='spear-braced'?1.28:.12;
    plain.add(cyl(0.012, 0.012, 0.95, 4), { position: [0.11, 0.42, 0.06], rotation: [pitch, 0, 0], color: WOOD });
    plain.add(createConeGeometry3D({ radius: 0.025, height: 0.1, radialSegments: 4 }), { position: [0.11, 0.42+Math.cos(pitch)*.51, 0.06+Math.sin(pitch)*.51], rotation: [pitch, 0, 0], color: IRON });
    if (arm === 'halberd') plain.add(box(0.09, 0.03, 0.01), { position: [0.15, 0.86, 0.11], color: IRON });
  } else if (arm === 'sword') {
    plain.add(box(0.2, 0.26, 0.03), { position: [-0.1, 0.3, 0.09], rotation: [0, -0.3, 0], color: WOOD });
    coat.add(box(0.1, 0.1, 0.01), { position: [-0.1, 0.32, 0.112], rotation: [0, -0.3, 0], color: WHITE });
    plain.add(box(0.02, 0.24, 0.02), { position: [0.12, 0.38, 0.08], rotation: [0.6, 0, 0], color: 0xb8bcc2 });
    plain.add(cyl(0.026, 0.026, 0.025, 6), { position: [-0.105, 0.32, 0.13], rotation: [Math.PI / 2, 0, 0], color: 0xa59360 });
    plain.add(box(0.09, 0.018, 0.035), { position: [0.12, 0.31, 0.035], color: 0xa59360 });
  } else if (arm === 'bow' || arm === 'bow-loose') {
    plain.add(cyl(0.01, 0.01, 0.55, 4), { position: [-0.11, 0.38, 0.05], rotation: [0, 0, 0.15], color: WOOD });
    plain.add(box(0.06, 0.18, 0.06), { position: [0.05, 0.34, -0.09], color: LEATHER });
    plain.add(cyl(0.003, 0.003, 0.5, 3), { position: [-0.075, 0.38, 0.065], color: 0xbba985 });
    for (const side of [-1, 1]) plain.add(box(0.014, 0.16, 0.025), { position: [-0.1, 0.38 + side * 0.18, 0.05], rotation: [0, 0, side * 0.27], color: 0x987b48 });
    plain.add(cyl(0.005, 0.005, 0.2, 3), { position: [0.05, 0.47, -0.09], color: 0xc4b895 });
    if(arm==='bow-loose')plain.add(cyl(.004,.004,.48,3),{position:[-.07,.44,.16],rotation:[Math.PI/2,0,0],color:0xd8c9a7});
  }
  return { plain: plain.build(), coat: coat.build() };
}
/** A horseman, about 0.8 tall and 0.7 long. */
function horseman(arm) {
  const plain = createGeometryBuilder3D(),
    coat = createGeometryBuilder3D();
  const hide = HORSE[0];
  plain.add(box(0.16, 0.18, 0.5), { position: [0, 0.36, 0], color: hide });
  plain.add(box(0.1, 0.22, 0.14), { position: [0, 0.48, 0.28], rotation: [0.6, 0, 0], color: hide });
  plain.add(box(0.08, 0.08, 0.16), { position: [0, 0.56, 0.38], rotation: [0.2, 0, 0], color: hide });
  plain.add(box(0.045, 0.19, 0.1), { position: [0, 0.51, 0.24], rotation: [0.6, 0, 0], color: 0x292e29 });
  for (const side of [-1, 1]) {
    plain.add(createConeGeometry3D({ radius: 0.023, height: 0.1, radialSegments: 4 }), { position: [side * 0.039, 0.63, 0.33], rotation: [-0.2, 0, side * -0.2], color: hide });
    plain.add(box(0.015, 0.035, 0.16), { position: [side * 0.048, 0.565, 0.38], color: 0xbaa172 });
    plain.add(box(0.027, 0.16, 0.14), { position: [side * 0.115, 0.38, -0.05], color: LEATHER });
    plain.add(box(0.035, 0.15, 0.035), { position: [side * 0.08, 0.5, -0.015], color: IRON });
  }
  plain.add(box(0.22, 0.055, 0.17), { position: [0, 0.5, -0.04], color: 0x5a402b });
  for (const [x, z] of [
    [-0.06, 0.18],
    [0.06, 0.18],
    [-0.06, -0.18],
    [0.06, -0.18]
  ])
    plain.add(cyl(0.025, 0.02, 0.28, 4), { position: [x, 0.14, z], color: hide });
  plain.add(box(0.04, 0.12, 0.04), { position: [0, 0.36, -0.27], rotation: [-0.5, 0, 0], color: 0x2a1f18 });
  coat.add(box(0.2, 0.06, 0.26), { position: [0, 0.47, 0], color: WHITE });
  coat.add(cyl(0.06, 0.08, 0.2, 7), { position: [0, 0.6, -0.02], color: WHITE });
  plain.add(ball(0.055), { position: [0, 0.75, -0.02], color: SKIN });
  plain.add(createConeGeometry3D({ radius: 0.065, height: 0.08, radialSegments: 6 }), { position: [0, 0.81, -0.02], color: IRON });
  if (arm === 'bow') plain.add(cyl(0.01, 0.01, 0.45, 4), { position: [-0.1, 0.64, 0.02], rotation: [0, 0, 0.2], color: WOOD });
  else {
    plain.add(cyl(0.012, 0.012, 1.0, 4), { position: [0.1, 0.72, 0.12], rotation: [1.15, 0, 0], color: WOOD });
    plain.add(createConeGeometry3D({ radius: 0.025, height: 0.1, radialSegments: 4 }), { position: [0.1, 0.92, 0.58], rotation: [1.15, 0, 0], color: IRON });
  }
  return { plain: plain.build(), coat: coat.build() };
}
/** A battering ram under its roof, or a siege tower or catapult. */
function engine(kind) {
  const plain = createGeometryBuilder3D(),
    coat = createGeometryBuilder3D();
  if (kind === 'ram' || kind === 'ram-frame') {
    plain.add(box(0.5, 0.3, 0.9), { position: [0, 0.3, 0], color: WOOD });
    plain.add(box(0.56, 0.06, 0.95), { position: [0, 0.5, 0], rotation: [0, 0, 0.25], color: 0x4a3a2a });
    if(kind==='ram')plain.add(cyl(0.07, 0.07, 1.1, 6), { position: [0, 0.28, 0.25], rotation: [Math.PI / 2, 0, 0], color: 0x3b2a1c });
    for (const s of [-1, 1]) for (const z of [-0.3, 0.3]) plain.add(cyl(0.11, 0.11, 0.05, 8), { position: [s * 0.27, 0.11, z], rotation: [0, 0, Math.PI / 2], color: 0x2e241c });
    coat.add(box(0.3, 0.18, 0.02), { position: [0, 0.6, -0.4], color: WHITE });
  } else {
    plain.add(box(0.5, 1.2, 0.5), { position: [0, 0.65, 0], color: WOOD });
    plain.add(box(0.56, 0.08, 0.56), { position: [0, 1.28, 0], color: 0x4a3a2a });
    for (const s of [-1, 1]) for (const z of [-0.2, 0.2]) plain.add(cyl(0.1, 0.1, 0.05, 8), { position: [s * 0.27, 0.1, z], rotation: [0, 0, Math.PI / 2], color: 0x2e241c });
    coat.add(box(0.28, 0.2, 0.02), { position: [0, 1.45, 0], color: WHITE });
    plain.add(cyl(0.01, 0.01, 0.4, 4), { position: [0.14, 1.45, 0], color: WOOD });
  }
  return { plain: plain.build(), coat: coat.build() };
}
function ramBeam() {
  const plain=createGeometryBuilder3D(),coat=createGeometryBuilder3D();
  plain.add(cyl(.07,.07,1.1,8),{position:[0,.28,.25],rotation:[Math.PI/2,0,0],color:WOOD});
  plain.add(box(.18,.16,.14),{position:[0,.28,.8],color:IRON});
  for(const z of[-.15,.42])coat.add(cyl(.078,.078,.035,8),{position:[0,.28,z],rotation:[Math.PI/2,0,0],color:0xc5ac72});
  return {plain:plain.build(),coat:coat.build()};
}
/** A war boat with a sail in the side's colour. */
function boat() {
  const plain = createGeometryBuilder3D(),
    coat = createGeometryBuilder3D();
  plain.add(box(0.5, 0.18, 1.3), { position: [0, 0.06, 0], color: 0x4a3524 });
  plain.add(box(0.4, 0.08, 0.3), { position: [0, 0.14, 0.62], rotation: [0.5, 0, 0], color: 0x4a3524 });
  plain.add(box(0.42, 0.22, 0.6), { position: [0, 0.24, -0.15], color: 0x6b5038 });
  plain.add(cyl(0.015, 0.015, 0.9, 4), { position: [0, 0.6, 0.15], color: WOOD });
  coat.add(box(0.5, 0.45, 0.02), { position: [0, 0.68, 0.15], color: WHITE });
  return { plain: plain.build(), coat: coat.build() };
}

/** An army's great standard: a tall pole with a long banner in the side's colour. */
function standard() {
  const plain = createGeometryBuilder3D(),
    coat = createGeometryBuilder3D();
  plain.add(cyl(0.02, 0.025, 1.7, 5), { position: [0, 0.85, 0], color: 0x2a1d14 });
  plain.add(createConeGeometry3D({ radius: 0.04, height: 0.12, radialSegments: 5 }), { position: [0, 1.76, 0], color: 0xc9a24a });
  coat.add(box(0.03, 0.62, 0.42), { position: [0, 1.3, 0.22], color: WHITE });
  coat.add(box(0.032, 0.06, 0.46), { position: [0, 1.63, 0.23], color: 0xe8e0c8 });
  return { plain: plain.build(), coat: coat.build() };
}

/** What a kind of troops is drawn as. */
export function figureOf(unit) {
  const u = UNITS[unit];
  if (!u) return 'spear';
  if (u.group === 'navy') return 'boat';
  if (u.id === 'ram') return 'ram';
  if (u.group === 'siege') return 'engine';
  if (u.group === 'cav') return u.weapon === 'bow' ? 'horsebow' : 'horse';
  if (u.weapon === 'bow') return 'bow';
  if (u.weapon === 'sword') return 'sword';
  return u.weapon === 'halberd' ? 'halberd' : 'spear';
}

/** The soldiers of the world, laid out each frame. */
export function createTroops(scene, { quality = 'medium', capacity = 2400 } = {}) {
  const shapes = {
    spear: footman('spear'),
    'spear-braced': footman('spear-braced'),
    halberd: footman('halberd'),
    sword: footman('sword'),
    bow: footman('bow'),
    'bow-loose': footman('bow-loose'),
    horse: horseman('spear'),
    horsebow: horseman('bow'),
    ram: engine('ram'),
    'ram-frame': engine('ram-frame'),
    'ram-beam': ramBeam(),
    engine: engine('tower'),
    boat: boat(),
    standard: standard()
  };
  const plainMaterial = createStandardMaterial3D({ vertexColors: true, roughness: 0.75, metallic: 0.1 });
  const coatMaterial = createStandardMaterial3D({ vertexColors: true, roughness: 0.85, metallic: 0 });
  const kinds = {};
  for (const [kind, shape] of Object.entries(shapes)) {
    const cap = kind.startsWith('ram') || kind === 'engine' || kind === 'boat' || kind === 'standard' ? Math.ceil(capacity / 6) : capacity;
    const plain = new InstancedMesh3D(shape.plain, plainMaterial, cap);
    const coat = new InstancedMesh3D(shape.coat, coatMaterial, cap);
    for (const mesh of [plain, coat]) {
      mesh.count = 0;
      mesh.castShadow = quality !== 'low';
      mesh.receiveShadow = true;
      mesh.pickable = false;
      mesh.frustumCulled = false;
      scene.addChild(mesh);
    }
    kinds[kind] = { plain, coat, cap, n: 0 };
  }
  const m = new Float32Array(16),
    q = [0, 0, 0, 1],
    one = [1, 1, 1];
  return {
    begin() {
      for (const k of Object.values(kinds)) k.n = 0;
    },
    /** One soldier: its figure kind, place, heading (radians, 0 faces +z), colour (linear RGB) and lean. */
    add(kind, x, y, z, yaw, colour, lean = 0, scale = 1) {
      const k = kinds[kind] ?? kinds.spear;
      if (k.n >= k.cap) return;
      quatFromEuler(q, lean, yaw, 0);
      one[0] = one[1] = one[2] = scale;
      mat4Compose(m, [x, y, z], q, one);
      k.plain.setMatrixAt(k.n, m);
      k.coat.setMatrixAt(k.n, m);
      k.coat.setColorAt(k.n, colour[0], colour[1], colour[2]);
      k.n++;
    },
    end() {
      for (const k of Object.values(kinds)) {
        k.plain.count = k.n;
        k.coat.count = k.n;
        k.plain.visible = k.n > 0;
        k.coat.visible = k.n > 0;
      }
    }
  };
}
