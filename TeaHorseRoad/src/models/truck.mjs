// 山地马帮货车，采用合并顶点色网格和实例化茶包。六个车轮由车辆物理独立驱动。
import {
  InstancedMesh3D,
  Mesh3D,
  Object3D,
  Shape3D,
  createBoxGeometry3D,
  createCylinderGeometry3D,
  createExtrudeGeometry3D,
  createGeometryBuilder3D,
  createLatheGeometry3D,
  createSphereGeometry3D,
  createStandardMaterial3D
} from '@egret/engine/world3d';

/** Lacquer red, indigo and tea green each have their own roof and body trim. */
export const LIVERIES = [
  { body: 0x9b3029, trim: 0xc79453, stripe: 0xf2cf93, roof: 0xdbb387, name: 'lead' },
  { body: 0x2e586a, trim: 0x8eaeac, stripe: 0xe3d6b1, roof: 0xbfc8b1, name: 'indigo' },
  { body: 0x546047, trim: 0xb39c61, stripe: 0xe6ce9a, roof: 0xb9b386, name: 'olive' }
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

const TAU = Math.PI * 2;
const AXLE = [0, 0, Math.PI / 2];
const LENGTHWISE = [Math.PI / 2, 0, 0];
const BOTH_SIDES = [-1, 1];
const shared = new Map();

function once(key, make) {
  if (!shared.has(key)) shared.set(key, make());
  return shared.get(key);
}

function cylinder(radiusTop, radiusBottom, height, radialSegments = 12) {
  return createCylinderGeometry3D({ radiusTop, radiusBottom, height, radialSegments });
}

function box(geometry, size, position, color, rotation) {
  const unit = once('unit-box', () => createBoxGeometry3D());
  geometry.add(unit, { scale: size, position, rotation, color });
}

/** A stamped panel, with clipped corners in its face. */
function panel(geometry, size, position, color, rotation) {
  const face = once('panel', () => {
    const outline = new Shape3D([
      [-0.4, -0.5], [0.4, -0.5], [0.5, -0.39], [0.5, 0.39],
      [0.4, 0.5], [-0.4, 0.5], [-0.5, 0.39], [-0.5, -0.39]
    ]);
    return createGeometryBuilder3D().add(createExtrudeGeometry3D(outline, { depth: 1 }), { position: [0, 0, -0.5] }).build();
  });
  geometry.add(face, { position, rotation, scale: size, color });
}

/** Tyre carcass, staggered tread and steel hub with a contrasting outer rim. */
function wheelGeometry() {
  return once('wheel', () => {
    const r = TRUCK.wheelRadius;
    const b = createGeometryBuilder3D();
    const tyre = createLatheGeometry3D([
      [0.32, -0.202], [0.43, -0.208], [0.509, -0.191], [0.543, -0.142], [0.549, -0.106],
      [0.549, 0.106], [0.543, 0.142], [0.509, 0.191], [0.43, 0.208], [0.32, 0.202]
    ], { segments: 24 });
    b.add(tyre, { rotation: AXLE, color: 0x2b2a26 });
    for (let i = 0; i < 22; i++) {
      for (const side of BOTH_SIDES) {
        const angle = ((i + side * 0.16) / 22) * TAU;
        box(b, [0.18, 0.055, 0.106], [side * 0.1, Math.cos(angle) * (r - 0.013), Math.sin(angle) * (r - 0.013)], 0x3a3730, [angle, 0, side * 0.23]);
      }
    }
    const rim = cylinder(0.319, 0.319, 0.426, 20);
    const dish = cylinder(0.27, 0.27, 0.012, 20);
    const hub = cylinder(0.106, 0.148, 0.056);
    b.add(rim, { rotation: AXLE, color: 0xbab19c });
    for (const side of BOTH_SIDES) {
      b.add(dish, { position: [side * 0.216, 0, 0], rotation: AXLE, color: 0x62645e });
      b.add(hub, { position: [side * 0.232, 0, 0], rotation: [0, 0, -side * Math.PI / 2], color: 0x8c8978 });
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * TAU;
        box(b, [0.02, 0.07, 0.038], [side * 0.224, Math.cos(angle) * 0.221, Math.sin(angle) * 0.221], 0x343730, [angle, 0, 0]);
        const boltAngle = angle + TAU / 16;
        box(b, [0.024, 0.034, 0.034], [side * 0.226, Math.cos(boltAngle) * 0.162, Math.sin(boltAngle) * 0.162], 0xc7bba1, [boltAngle, 0, 0]);
      }
    }
    return b.build();
  });
}

/** Pressed tea cakes under folded dried bamboo, with binding and a paper seal. */
function teaGeometry() {
  return once('tea', () => {
    const b = createGeometryBuilder3D();
    const wrap = createLatheGeometry3D([
      [0, -0.304], [0.153, -0.303], [0.197, -0.262],
      [0.207, -0.18], [0.207, 0.18], [0.19, 0.264], [0.148, 0.304], [0, 0.305]
    ], { segments: 10 });
    const binding = createLatheGeometry3D([
      [0.198, -0.027], [0.215, -0.021], [0.215, 0.021], [0.198, 0.027]
    ], { segments: 10 });
    b.add(wrap, { rotation: LENGTHWISE, color: 0xb7a474 });
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * TAU;
      const x = Math.sin(angle);
      const y = -Math.cos(angle);
      box(b, [0.024, 0.013, 0.452], [x * 0.201, y * 0.201, 0], i % 3 ? 0xd0ba87 : 0x84784e, [0, 0, angle]);
    }
    for (const z of [-0.169, 0.169]) b.add(binding, { position: [0, 0, z], rotation: LENGTHWISE, color: 0x716541 });
    box(b, [0.128, 0.014, 0.175], [0, 0.207, 0.025], 0xe0cba0, [0, -0.16, 0]);
    box(b, [0.051, 0.018, 0.063], [0.014, 0.215, 0.055], 0xa04835, [0, -0.16, 0]);
    box(b, [0.143, 0.135, 0.015], [0, 0, 0.305], 0xe1cda4, [0, 0, Math.PI / 4]);
    box(b, [0.068, 0.066, 0.016], [0, 0, 0.314], 0xa44d39, [0, 0, Math.PI / 4]);
    return b.build();
  });
}

function wheelArch(inner, outer, width) {
  // An open band leaves the tyre visible from outside the front wing.
  const half = width / 2;
  return createLatheGeometry3D(
    [[inner, -half], [outer - 0.02, -half], [outer, -half + 0.018], [outer, half - 0.018], [outer - 0.02, half], [inner, half], [inner, -half]],
    { segments: 14, phiStart: -0.36, phiLength: Math.PI + 0.72 }
  );
}

function bodyGeometry(livery, fittedCab) {
  return once(`${fittedCab ? 'bed' : 'body'}-${livery.name}`, () => {
    const b = createGeometryBuilder3D();
    const frame = 0x333834;
    const iron = 0x555b50;
    const black = 0x252b27;
    const brass = 0xaf8652;
    const timbers = [0x674934, 0x835e3e, 0x936f4b, 0x785237];

    // Box rails and drivetrain stay inside the wheel track.
    for (const side of BOTH_SIDES) box(b, [0.17, 0.23, 6.25], [side * 0.56, -0.18, 0.03], frame);
    const axle = cylinder(0.075, 0.075, 2.01, 8);
    for (const z of [TRUCK.frontAxle, ...TRUCK.rearAxles]) {
      b.add(axle, { position: [0, TRUCK.wheelY, z], rotation: AXLE, color: black });
    }

    if (!fittedCab) {
      // Step-sided cab, dipped bonnet, and high-contrast roof edge.
      panel(b, [2.08, 0.92, 1.59], [0, 0.64, -1.28], livery.body);
      panel(b, [1.97, 0.55, 1.33], [0, 1.38, -1.22], livery.body);
      panel(b, [2.08, 0.15, 1.48], [0, 1.704, -1.22], livery.roof);
      box(b, [1.98, 0.073, 1.38], [0, 1.123, -1.22], livery.trim);
      panel(b, [1.74, 0.65, 1.55], [0, 0.394, -2.845], livery.body);
      panel(b, [1.67, 0.18, 1.46], [0, 0.722, -2.805], livery.body);
      box(b, [0.048, 0.015, 1.36], [0, 0.811, -2.8], livery.trim);

      // Open fenders and the lower side steps.
      const wing = wheelArch(0.643, 0.75, 0.33);
      const rolledEdge = wheelArch(0.704, 0.767, 0.055);
      for (const s of BOTH_SIDES) {
        b.add(wing, { position: [s * 0.991, -0.32, TRUCK.frontAxle], rotation: AXLE, color: livery.body });
        b.add(rolledEdge, { position: [s * 1.167, -0.32, TRUCK.frontAxle], rotation: AXLE, color: livery.trim });
        box(b, [0.38, 0.11, 1.08], [s * 1.03, -0.107, -0.86], iron);
        box(b, [0.085, 0.07, 0.97], [s * 1.194, -0.06, -0.83], livery.trim);
        for (let i = 0; i < 4; i++) {
          box(b, [0.022, 0.018, 0.61], [s * 0.876, 0.53 - i * 0.078, -2.63], black);
        }
        box(b, [0.025, 0.1, 1.38], [s * 1.044, 0.68, -1.28], livery.stripe);
        box(b, [0.046, 0.044, 0.216], [s * 1.061, 0.94, -0.77], black);
        box(b, [0.05, 0.023, 0.145], [s * 1.077, 0.958, -0.77], brass);
        box(b, [0.36, 0.042, 0.035], [s * 1.15, 1.217, -1.888], iron);
        panel(b, [0.196, 0.252, 0.07], [s * 1.317, 1.269, -1.888], frame);
        box(b, [0.15, 0.197, 0.015], [s * 1.317, 1.27, -1.847], 0x839a99);
        box(b, [0.43, 0.475, 0.05], [s * 1.018, -0.319, 2.92], black);
        box(b, [0.466, 0.132, 2.11], [s * 0.91, 0.073, 1.78], iron);
      }

      // Ribbed radiator, sealed beams and bumper with the recovery winch.
      panel(b, [1.47, 0.62, 0.087], [0, 0.397, -3.626], iron);
      panel(b, [1.31, 0.495, 0.04], [0, 0.396, -3.68], black);
      for (let i = 0; i < 8; i++) {
        box(b, [0.036, 0.442, 0.026], [-0.49 + i * 0.14, 0.396, -3.709], 0x9d9682);
      }
      panel(b, [2.31, 0.244, 0.268], [0, -0.03, -3.763], frame);
      box(b, [2.14, 0.069, 0.034], [0, -0.054, -3.914], iron);
      const drum = cylinder(0.098, 0.098, 0.54, 12);
      b.add(drum, { position: [0, 0.009, -3.936], rotation: AXLE, color: black });
      const lightHousing = cylinder(0.186, 0.174, 0.157, 16);
      for (const s of BOTH_SIDES) {
        b.add(lightHousing, { position: [s * 0.642, 0.797, -3.534], rotation: [-Math.PI / 2, 0, 0], color: brass });
        box(b, [0.111, 0.1, 0.105], [s * 0.79, -0.117, -3.926], livery.body, [0, 0, s * 0.14]);
      }
      b.add(cylinder(0.048, 0.117, 0.128), { position: [0, 0.767, -3.72], color: brass });
      box(b, [0.047, 0.144, 0.039], [0, 0.635, -3.721], 0xb53b2f, [0, 0, -0.1]);
    } else {
      for (const side of BOTH_SIDES) {
        box(b, [0.43, 0.475, 0.05], [side * 1.018, -0.319, 2.92], black);
        box(b, [0.466, 0.132, 2.11], [side * 0.91, 0.073, 1.78], iron);
      }
    }

    // Cargo bed with an exposed deck, tiered wood rails and a reinforced tailgate.
    for (let i = 0; i < 7; i++) {
      box(b, [0.306, 0.126, 3.48], [-0.955 + i * 0.318, 0.156, 1.406], timbers[i % timbers.length]);
    }
    for (const s of BOTH_SIDES) {
      for (let i = 0; i < 3; i++) {
        box(b, [0.072, 0.116, 3.48], [s * TRUCK.halfWidth, 0.358 + i * 0.2, 1.404], timbers[i + 1]);
      }
      for (const z of [-0.28, 0.83, 1.94, 3.09]) box(b, [0.102, 0.61, 0.107], [s * TRUCK.halfWidth, 0.496, z], frame);
      box(b, [0.093, 0.049, 3.53], [s * TRUCK.halfWidth, 0.821, 1.405], livery.trim);
      box(b, [0.069, 0.082, 3.48], [s * TRUCK.halfWidth, 0.215, 1.404], frame);
      box(b, [0.245, 0.158, 0.09], [s * 0.887, 0.321, 3.231], black);
    }
    box(b, [2.23, 0.521, 0.102], [0, 0.51, 3.145], timbers[1]);
    for (let i = 0; i < 3; i++) box(b, [2.12, 0.014, 0.014], [0, 0.36 + i * 0.149, 3.2], timbers[0]);
    box(b, [2.28, 0.072, 0.123], [0, 0.8, 3.151], livery.trim);
    box(b, [2.28, 0.173, 0.153], [0, 0.075, 3.16], frame);
    box(b, [2.22, 0.8, 0.082], [0, 0.607, -0.33], timbers[0]);
    for (const s of BOTH_SIDES) {
      box(b, [0.105, 0.587, 0.057], [s * 0.776, 0.514, 3.218], frame);
      box(b, [0.15, 0.076, 0.044], [s * 0.776, 0.697, 3.269], livery.trim);
      box(b, [0.32, 0.051, 0.038], [s * 0.81, 0.13, 3.251], livery.stripe);
    }
    // The caravan's crest, picked out in brass on the enamelled rear plate.
    panel(b, [0.79, 0.317, 0.043], [0, 0.532, 3.226], livery.trim);
    panel(b, [0.735, 0.265, 0.022], [0, 0.532, 3.253], livery.body);
    for (const [x, y, scale] of [[-0.171, 0.533, 0.745], [0, 0.578, 1], [0.171, 0.533, 0.745]]) {
      box(b, [0.142 * scale, 0.026, 0.025], [x - 0.049 * scale, y, 3.269], livery.stripe, [0, 0, 0.84]);
      box(b, [0.142 * scale, 0.026, 0.025], [x + 0.049 * scale, y, 3.27], livery.stripe, [0, 0, -0.84]);
    }
    box(b, [0.47, 0.019, 0.026], [0, 0.453, 3.269], livery.stripe);

    // Fit the retained canvas roll and spare on the smaller roof of the modeled cab.
    const rackScale = fittedCab ? 0.66 : 1;
    const rackZ = z => fittedCab ? -0.86 + (z + 1.22) * rackScale : z;
    const rackY = y => fittedCab ? y - 0.05 : y;
    for (const s of BOTH_SIDES) {
      box(b, [0.055, 0.093, 1.28 * rackScale], [s * 0.896, rackY(1.813), rackZ(-1.211)], frame);
      box(b, [0.046, 0.048, 1.28 * rackScale], [s * 0.896, rackY(1.884), rackZ(-1.211)], livery.trim);
    }
    for (const z of [-1.79, -1.23, -0.635]) box(b, [1.85, 0.049, 0.069], [0, rackY(1.82), rackZ(z)], frame);
    const spare = createLatheGeometry3D([[0.23, -0.122], [0.331, -0.122], [0.439, -0.102], [0.454, -0.056],
      [0.454, 0.06], [0.418, 0.109], [0.32, 0.128], [0.23, 0.128]], { segments: 20 });
    const spareScale = fittedCab ? [0.86, 1, 0.86] : [1, 1, 1];
    b.add(spare, { position: [-0.371, rackY(1.909), rackZ(-1.25)], scale: spareScale, color: black });
    b.add(cylinder(0.294, 0.31, 0.202, 20), { position: [-0.371, rackY(1.909), rackZ(-1.25)], scale: spareScale, color: iron });
    box(b, [0.752 * spareScale[0], 0.024, 0.077], [-0.373, rackY(2.053), rackZ(-1.246)], brass, [0, -0.23, 0]);
    b.add(cylinder(0.185, 0.168, 1.07 * rackScale), { position: [0.416, rackY(1.962), rackZ(-1.23)], rotation: LENGTHWISE, color: 0x89907a });
    const belt = cylinder(0.194, 0.194, 0.068);
    for (const z of [-1.523, -0.92]) b.add(belt, { position: [0.416, rackY(1.959), rackZ(z)], rotation: LENGTHWISE, color: 0x766344 });
    b.add(cylinder(0.051, 0.051, 1.71, 10), { position: [-1.094, 1.155, -0.425], color: frame });
    b.add(cylinder(0.078, 0.073, 0.46, 10), { position: [-1.094, 1.058, -0.425], color: iron });
    b.add(cylinder(0.072, 0.064, 0.045, 10), { position: [-1.094, 2.024, -0.425], color: black });
    return b.build();
  });
}

function glassGeometry() {
  return once('glazing', () => {
    const b = createGeometryBuilder3D();
    for (const s of BOTH_SIDES) {
      panel(b, [0.908, 0.421, 0.055], [s * 0.469, 1.396, -1.886], 0x526e76);
      panel(b, [1.027, 0.414, 0.039], [s * 0.974, 1.392, -1.229], 0x3c5359, [0, Math.PI / 2, 0]);
      box(b, [0.052, 0.375, 0.049], [s * 0.996, 1.391, -0.997], 0x303b37);
      box(b, [0.674, 0.022, 0.015], [s * 0.48, 1.554, -1.918], 0x92a7a2);
      box(b, [0.414, 0.026, 0.021], [s * 0.446, 1.225, -1.923], 0x313a37, [0, 0, 0.17]);
    }
    panel(b, [1.64, 0.362, 0.042], [0, 1.404, -0.551], 0x475c5b);
    box(b, [1.33, 0.018, 0.02], [0, 1.543, -0.524], 0x89a1a0);
    return b.build();
  });
}

function headlampGeometry(fittedCab) {
  return once(fittedCab ? 'cab-headlamps' : 'headlamps', () => {
    const b = createGeometryBuilder3D();
    const lens = createSphereGeometry3D({ radius: 0.149, widthSegments: 12, heightSegments: 6 });
    const mounts = fittedCab ? [[-0.843, 0.178, -3.388], [0.791, 0.19, -3.278]]
      : BOTH_SIDES.map(side => [side * 0.642, 0.797, -3.62]);
    for (const position of mounts) b.add(lens, { position, scale: fittedCab ? [0.77, 0.86, 0.27] : [1, 1, 0.32] });
    return b.build();
  });
}

function markerLampGeometry(fittedCab) {
  return once(fittedCab ? 'cab-marker-lamps' : 'marker-lamps', () => {
    const b = createGeometryBuilder3D();
    for (const x of [-0.62, 0, 0.62]) box(b, [0.121, 0.057, 0.069], [x, fittedCab ? 1.786 : 1.759, fittedCab ? -1.28 : -1.944], 0xfbaa4c);
    for (const s of BOTH_SIDES) {
      panel(b, [0.119, 0.106, 0.023], [s * 0.934, 0.321, 3.286], 0xe45c36);
      panel(b, [0.063, 0.106, 0.022], [s * 0.831, 0.321, 3.286], 0xefbb69);
    }
    return b.build();
  });
}

/** One truck, with six wheel nodes and a countable instanced cargo load. */
export function createTruckModel(livery, cab = null) {
  const root = new Object3D();
  const paint = once('paint-material', () => createStandardMaterial3D({ vertexColors: true, roughness: 0.63, metallic: 0.1 }));
  const body = new Mesh3D(cab?.geometry ?? bodyGeometry(livery, false), cab?.material ?? paint);
  body.castShadow = true;
  body.receiveShadow = true;
  root.addChild(body);

  const glass = once('glass-material', () => createStandardMaterial3D({ vertexColors: true, roughness: 0.16, metallic: 0.33, environmentIntensity: 1.1 }));
  const lamp = once('lamp-material', () => createStandardMaterial3D({ color: 0xffe6b7, emissive: 0xffdfa2, emissiveIntensity: 1.25, roughness: 0.28 }));
  const markers = once('markers-material', () => createStandardMaterial3D({ vertexColors: true, emissive: 0x682b17, emissiveIntensity: 0.5, roughness: 0.46 }));
  let bed = null;
  if (cab) {
    bed = new Mesh3D(bodyGeometry(livery, true), paint);
    bed.castShadow = bed.receiveShadow = true;
    root.addChild(bed);
  } else {
    root.addChild(new Mesh3D(glassGeometry(), glass));
  }
  root.addChild(new Mesh3D(headlampGeometry(Boolean(cab)), lamp));
  root.addChild(new Mesh3D(markerLampGeometry(Boolean(cab)), markers));

  // Two layers. Removing instances starts with the topmost bundles at the rear.
  const tea = once('tea-material', () => createStandardMaterial3D({ vertexColors: true, roughness: 0.92 }));
  const cargo = new InstancedMesh3D(teaGeometry(), tea, TRUCK.cargoSlots);
  cargo.castShadow = true;
  const shades = [[1, 1, 1], [0.85, 0.9, 0.77], [0.99, 0.86, 0.68], [0.89, 0.96, 0.83], [0.79, 0.83, 0.71]];
  for (let i = 0; i < TRUCK.cargoSlots; i++) {
    const layer = Math.floor(i / 12);
    const row = Math.floor((i % 12) / 4);
    const col = i % 4;
    const yaw = ((i * 7) % 5 - 2) * 0.046;
    const x = -0.774 + col * 0.516 + (layer ? (col % 2 ? -0.024 : 0.024) : 0);
    cargo.setTransformAt(i, [x, 0.431 + layer * 0.399, 0.18 + row * 0.85 + layer * 0.16], [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)], 1);
    cargo.setColorAt(i, ...shades[(i * 7 + row) % shades.length]);
  }
  root.addChild(cargo);

  const tyre = once('tyre-material', () => createStandardMaterial3D({ vertexColors: true, roughness: 0.87, metallic: 0.08 }));
  const wheels = [];
  for (const z of [TRUCK.frontAxle, ...TRUCK.rearAxles]) {
    for (const s of BOTH_SIDES) {
      const wheel = new Mesh3D(wheelGeometry(), tyre);
      wheel.castShadow = true;
      wheels.push({ node: wheel, position: [s * TRUCK.track, TRUCK.wheelY + 0.1, z], front: z === TRUCK.frontAxle });
    }
  }
  return { root, body, bed, cargo, wheels };
}
