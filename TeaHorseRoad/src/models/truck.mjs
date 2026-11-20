// 马帮越野车：车身、驾驶室、车斗、轮子和货物全部在代码里拼出来。
// 车身用引擎的几何构建器合成一块网格（顶点色），玻璃、车灯、轮子和茶砖各是自己的网格；
// 茶砖是一组实例，被抢一包少画一包。
//
// A caravan truck of the convoy: body, cab, bed, wheels and cargo all put together in code. The body is merged into one
// mesh by the engine's geometry builder (vertex colours); the glass, the lamps, the wheels and the tea are meshes of
// their own. The tea is one set of instances, drawn one fewer for each bundle taken.
import {
  InstancedMesh3D,
  Mesh3D,
  Object3D,
  createBoxGeometry3D,
  createCapsuleGeometry3D,
  createCylinderGeometry3D,
  createGeometryBuilder3D,
  createLatheGeometry3D,
  createSphereGeometry3D,
  createStandardMaterial3D,
  createTorusGeometry3D
} from '@egret/engine/world3d';

/** The colours of the three trucks: lead red, indigo and olive, each with its trim. */
export const LIVERIES = [
  { body: 0x8a2a20, trim: 0xd8b25a, stripe: 0xf0e2b8, name: 'lead' },
  { body: 0x2c4766, trim: 0xc9c2a6, stripe: 0xe9d9a8, name: 'indigo' },
  { body: 0x55603a, trim: 0xb89a5a, stripe: 0xe2d2a0, name: 'olive' }
];

/** Body dimensions, in metres, around the chassis body's centre of mass. */
export const TRUCK = {
  halfWidth: 1.12,
  frontAxle: -2.05,
  rearAxles: [1.15, 2.2],
  track: 1.02,
  wheelRadius: 0.56,
  wheelY: -0.42,
  cargoSlots: 24
};

const shared = new Map();
function once(key, make) {
  if (!shared.has(key)) shared.set(key, make());
  return shared.get(key);
}

/** A tyre with a deep tread and a steel wheel, its axle along X, as the vehicle's wheel nodes expect. */
function wheelGeometry() {
  return once('wheel', () => {
    const r = TRUCK.wheelRadius,
      w = 0.42,
      b = createGeometryBuilder3D();
    // The tyre: a rounded profile turned about its axle (the lathe turns about Y, so the part is turned to lie on X).
    const profile = [];
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * Math.PI;
      profile.push([r - 0.1 + 0.1 * Math.cos(a), (w / 2) * Math.sin(a)]);
    }
    const tyre = createLatheGeometry3D(
      profile.map(([radius, y]) => [radius, y]),
      { segments: 36 }
    );
    b.add(tyre, { rotation: [0, 0, Math.PI / 2], color: 0x1c1b1a });
    // The tread: two staggered rows of lugs around the tyre.
    const lug = createBoxGeometry3D({ width: 0.16, height: 0.07, depth: 0.12 });
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      for (const side of [-1, 1]) {
        const off = side * 0.1 + (i % 2 ? 0.03 : -0.03);
        b.add(lug, { position: [off, Math.cos(a) * (r - 0.005), Math.sin(a) * (r - 0.005)], rotation: [-a, 0, 0], color: 0x232120 });
      }
    }
    // The wheel: a dished steel disc, a hub and eight bolts.
    b.add(createCylinderGeometry3D({ radiusTop: r * 0.62, radiusBottom: r * 0.62, height: w * 0.86, radialSegments: 28 }), { rotation: [0, 0, Math.PI / 2], color: 0x6b6458 });
    b.add(createCylinderGeometry3D({ radiusTop: 0.13, radiusBottom: 0.18, height: w + 0.04, radialSegments: 16 }), { rotation: [0, 0, Math.PI / 2], color: 0x3d3a35 });
    const bolt = createCylinderGeometry3D({ radiusTop: 0.025, radiusBottom: 0.025, height: 0.06, radialSegments: 6 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      for (const side of [-1, 1]) b.add(bolt, { position: [side * (w / 2 + 0.02), Math.cos(a) * 0.24, Math.sin(a) * 0.24], rotation: [0, 0, Math.PI / 2], color: 0xa89c86 });
    }
    return b.build();
  });
}

/** One bundle of pressed tea: seven cakes wrapped in bamboo leaf and tied with bamboo strips. */
function teaGeometry() {
  return once('tea', () => {
    const b = createGeometryBuilder3D();
    b.add(createCylinderGeometry3D({ radiusTop: 0.2, radiusBottom: 0.21, height: 0.58, radialSegments: 14 }), { rotation: [Math.PI / 2, 0, 0], color: 0x8f7442 });
    for (const z of [-0.2, 0, 0.2]) b.add(createTorusGeometry3D({ radius: 0.212, tube: 0.018, radialSegments: 6, tubularSegments: 16 }), { position: [0, 0, z], color: 0x6e5428 });
    b.add(createCylinderGeometry3D({ radiusTop: 0.09, radiusBottom: 0.09, height: 0.6, radialSegments: 8 }), { rotation: [Math.PI / 2, 0, 0], position: [0, 0, 0], color: 0x8a6a36 });
    return b.build();
  });
}

/** The body, merged into one geometry: frame, cab, hood, bed, bumpers, rack, lamps' housings and the convoy's bell. */
function bodyGeometry(livery) {
  return once('body-' + livery.name, () => {
    const b = createGeometryBuilder3D(),
      box = (w, h, d) => createBoxGeometry3D({ width: w, height: h, depth: d }),
      cyl = (r1, r2, h, seg = 16) => createCylinderGeometry3D({ radiusTop: r1, radiusBottom: r2, height: h, radialSegments: seg }),
      hw = TRUCK.halfWidth;
    const dark = 0x24221f,
      steel = 0x55524b,
      wood = 0x5e4027;
    // Ladder frame and axles.
    for (const x of [-0.55, 0.55]) b.add(box(0.14, 0.22, 6.2), { position: [x, -0.18, 0.05], color: dark });
    for (const z of [TRUCK.frontAxle, ...TRUCK.rearAxles]) b.add(cyl(0.08, 0.08, 2.0, 10), { position: [0, TRUCK.wheelY, z], rotation: [0, 0, Math.PI / 2], color: dark });
    // Cab: a rounded box with a sloped windscreen frame and a roof.
    b.add(box(2.1, 1.05, 1.6), { position: [0, 0.62, -1.3], color: livery.body });
    b.add(box(2.12, 0.08, 1.64), { position: [0, 1.18, -1.3], color: livery.trim });
    b.add(box(1.96, 0.5, 1.35), { position: [0, 1.42, -1.22], color: livery.body });
    b.add(box(2.0, 0.07, 1.42), { position: [0, 1.7, -1.22], color: dark });
    // Hood: a long nose rounded on top, its louvres, and the grille.
    b.add(box(1.7, 0.62, 1.55), { position: [0, 0.4, -2.85], color: livery.body });
    b.add(cyl(0.85, 0.85, 1.55, 20), { position: [0, 0.68, -2.85], rotation: [Math.PI / 2, 0, 0], scale: [1, 0.24, 1], color: livery.body });
    for (let i = 0; i < 5; i++) for (const s of [-1, 1]) b.add(box(0.02, 0.05, 0.5), { position: [s * 0.86, 0.5 - i * 0.08, -2.75], color: dark });
    b.add(box(1.36, 0.6, 0.06), { position: [0, 0.38, -3.64], color: dark });
    for (let i = 0; i < 9; i++) b.add(box(0.035, 0.52, 0.04), { position: [-0.56 + i * 0.14, 0.38, -3.67], color: 0xb9b1a0 });
    // Fenders over the front wheels, running boards and steps.
    for (const s of [-1, 1]) {
      b.add(cyl(0.72, 0.72, 0.5, 18), { position: [s * 0.95, TRUCK.wheelY + 0.18, TRUCK.frontAxle], rotation: [0, 0, Math.PI / 2], scale: [1, 1, 1], color: livery.body });
      b.add(box(0.36, 0.06, 1.5), { position: [s * 1.02, -0.12, -1.05], color: dark });
    }
    // Front bumper with a winch and tow hooks.
    b.add(box(2.3, 0.22, 0.24), { position: [0, -0.04, -3.78], color: steel });
    b.add(cyl(0.13, 0.13, 0.6, 12), { position: [0, -0.02, -3.92], rotation: [0, 0, Math.PI / 2], color: dark });
    for (const s of [-1, 1]) b.add(createTorusGeometry3D({ radius: 0.07, tube: 0.025 }), { position: [s * 0.8, -0.08, -3.92], color: 0xb03a2a });
    // Bed: a wooden deck with slatted sides and a tailboard, on two steel sills.
    b.add(box(2.24, 0.12, 3.5), { position: [0, 0.16, 1.4], color: wood });
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) b.add(box(0.06, 0.12, 3.5), { position: [s * hw, 0.36 + i * 0.2, 1.4], color: i === 2 ? livery.trim : wood });
      for (let i = 0; i < 5; i++) b.add(box(0.08, 0.66, 0.08), { position: [s * hw, 0.5, -0.3 + i * 0.85], color: dark });
      // A painted stripe along the cab door.
      b.add(box(0.02, 0.1, 1.3), { position: [s * 1.06, 0.55, -1.3], color: livery.stripe });
      // Mirrors on arms.
      b.add(box(0.5, 0.04, 0.04), { position: [s * 1.25, 1.25, -1.95], color: dark });
      b.add(box(0.06, 0.32, 0.2), { position: [s * 1.5, 1.25, -1.95], color: dark });
      // Mud flaps behind the rear wheels.
      b.add(box(0.5, 0.5, 0.03), { position: [s * 0.98, -0.42, 2.95], color: dark });
    }
    b.add(box(2.24, 0.62, 0.08), { position: [0, 0.47, 3.15], color: wood });
    b.add(box(2.28, 0.08, 0.1), { position: [0, 0.8, 3.16], color: livery.trim });
    b.add(box(2.24, 0.9, 0.08), { position: [0, 0.6, -0.33], color: dark });
    // A roof rack with a spare wheel and a rolled tarp.
    for (const s of [-1, 1]) b.add(box(0.05, 0.05, 1.3), { position: [s * 0.95, 1.8, -1.2], color: steel });
    for (const z of [-1.75, -1.2, -0.65]) b.add(box(1.95, 0.05, 0.05), { position: [0, 1.8, z], color: steel });
    b.add(cyl(0.18, 0.18, 1.6, 12), { position: [0, 1.93, -0.85], rotation: [0, 0, Math.PI / 2], color: 0x8c7a56 });
    // Exhaust stack beside the cab.
    b.add(cyl(0.07, 0.07, 1.6, 10), { position: [-1.12, 1.2, -0.48], color: 0x3a3632 });
    // Lamp housings, tail lamps and the convoy's bell with its red tassel.
    for (const s of [-1, 1]) {
      b.add(cyl(0.17, 0.19, 0.16, 16), { position: [s * 0.62, 0.78, -3.62], rotation: [Math.PI / 2, 0, 0], color: steel });
      b.add(box(0.18, 0.12, 0.05), { position: [s * 0.95, 0.4, 3.2], color: 0x5a1010 });
    }
    b.add(cyl(0.012, 0.012, 0.3, 6), { position: [0, 0.98, -3.66], color: 0xc8a050 });
    b.add(createSphereGeometry3D({ radius: 0.1, widthSegments: 12, heightSegments: 8 }), { position: [0, 0.78, -3.66], color: 0xc8a050 });
    b.add(createCapsuleGeometry3D({ radius: 0.04, height: 0.3 }), { position: [0, 0.55, -3.68], color: 0xb02020 });
    return b.build();
  });
}

const materials = {};
function material(name, make) {
  return (materials[name] ??= make());
}

/**
 * A truck's picture: a node holding the body, the glass, the lamps and the cargo, and four wheel nodes for the vehicle
 * to place. `cargo.count` is how many bundles of tea show.
 */
export function createTruckModel(livery) {
  const root = new Object3D();
  const paint = material('paint', () => createStandardMaterial3D({ vertexColors: true, roughness: 0.62, metallic: 0.12 }));
  const body = new Mesh3D(bodyGeometry(livery), paint);
  body.castShadow = true;
  body.receiveShadow = true;
  root.addChild(body);

  // Glass: the windscreen in two panes, the side windows and the back window, dark and glossy.
  const glass = material('glass', () => createStandardMaterial3D({ color: 0x18212a, roughness: 0.08, metallic: 0.55, environmentIntensity: 1.2 }));
  const panes = createGeometryBuilder3D();
  const pane = createBoxGeometry3D({ width: 0.9, height: 0.42, depth: 0.04 });
  for (const s of [-1, 1]) panes.add(pane, { position: [s * 0.47, 1.43, -1.9], rotation: [-0.18, 0, 0] });
  for (const s of [-1, 1]) panes.add(createBoxGeometry3D({ width: 0.04, height: 0.38, depth: 1.0 }), { position: [s * 0.99, 1.43, -1.18] });
  panes.add(createBoxGeometry3D({ width: 1.6, height: 0.32, depth: 0.04 }), { position: [0, 1.43, -0.54] });
  root.addChild(new Mesh3D(panes.build(), glass));

  // Head lamps that glow, and the amber running lamps on the roof.
  const lamp = material('lamp', () => createStandardMaterial3D({ color: 0xfff4d8, emissive: 0xffe2a0, emissiveIntensity: 2.2, roughness: 0.2 }));
  const lamps = createGeometryBuilder3D();
  for (const s of [-1, 1]) lamps.add(createSphereGeometry3D({ radius: 0.14, widthSegments: 14, heightSegments: 10 }), { position: [s * 0.62, 0.78, -3.69], scale: [1, 1, 0.4] });
  const amber = material('amber', () => createStandardMaterial3D({ color: 0xffb040, emissive: 0xff9a20, emissiveIntensity: 1.6 }));
  const roof = createGeometryBuilder3D();
  for (const x of [-0.6, -0.2, 0.2, 0.6]) roof.add(createBoxGeometry3D({ width: 0.12, height: 0.06, depth: 0.06 }), { position: [x, 1.76, -1.92] });
  root.addChild(new Mesh3D(lamps.build(), lamp));
  root.addChild(new Mesh3D(roof.build(), amber));

  // The cargo: bundles of pressed tea in rows on the bed, two layers high.
  const teaMaterial = material('tea', () => createStandardMaterial3D({ vertexColors: true, roughness: 0.9 }));
  const cargo = new InstancedMesh3D(teaGeometry(), teaMaterial, TRUCK.cargoSlots);
  cargo.castShadow = true;
  for (let i = 0; i < TRUCK.cargoSlots; i++) {
    const layer = Math.floor(i / 12),
      k = i % 12,
      row = Math.floor(k / 4),
      col = k % 4;
    cargo.setTransformAt(i, [-0.78 + col * 0.52, 0.45 + layer * 0.4 + (row % 2) * 0.02, 0.15 + row * 0.62 + (layer ? 0.3 : 0)], [0, Math.sin(((k * 7) % 5) * 0.03), 0, 1], 1);
  }
  cargo.count = TRUCK.cargoSlots;
  root.addChild(cargo);

  // The wheels, each its own node, placed and spun by the vehicle.
  const tyre = material('tyre', () => createStandardMaterial3D({ vertexColors: true, roughness: 0.85, metallic: 0.1 }));
  const wheels = [];
  for (const z of [TRUCK.frontAxle, ...TRUCK.rearAxles])
    for (const s of [-1, 1]) {
      const wheel = new Mesh3D(wheelGeometry(), tyre);
      wheel.castShadow = true;
      wheels.push({ node: wheel, position: [s * TRUCK.track, TRUCK.wheelY + 0.1, z], front: z === TRUCK.frontAxle });
    }
  return { root, body, cargo, wheels };
}
