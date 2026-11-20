// 路上的建筑：驿站的木构大殿、马厩、牌坊、白塔、玛尼堆、经幡杆、灯笼和路牌。
// 都是引擎的基本几何体拼出来的（屋顶是曲线轮廓的挤出体），合成一块网格用顶点色上色；字是 Font3D 的立体字。
//
// Buildings along the road: the timber hall of a post station, a stable, a gateway arch, a white stupa, a mani pile,
// prayer-flag poles, lanterns and road signs. All are put together from the engine's basic shapes (the roofs are
// extrusions of a curved profile), merged into one mesh coloured by vertex; the lettering is 3D text in Font3D.
import {
  Mesh3D,
  Object3D,
  Shape3D,
  createBoxGeometry3D,
  createConeGeometry3D,
  createCylinderGeometry3D,
  createExtrudeGeometry3D,
  createGeometryBuilder3D,
  createIcosahedronGeometry3D,
  createLatheGeometry3D,
  createSphereGeometry3D,
  createStandardMaterial3D
} from '@egret/engine/world3d';
import { signText } from '../art/font.mjs';
import { seeded } from '../world/noise.mjs';

const painted = createStandardMaterial3D({ vertexColors: true, roughness: 0.78, metallic: 0 });
const gilt = createStandardMaterial3D({ color: 0xd9b45a, roughness: 0.35, metallic: 0.7 });
const glow = createStandardMaterial3D({ color: 0xff6a3a, emissive: 0xff5020, emissiveIntensity: 1.8, roughness: 0.5 });

const box = (w, h, d) => createBoxGeometry3D({ width: w, height: h, depth: d });
const cyl = (r1, r2, h, seg = 12) => createCylinderGeometry3D({ radiusTop: r1, radiusBottom: r2, height: h, radialSegments: seg });

const TIMBER = 0x7a2e22,
  PLASTER = 0xd9d2c0,
  TILE = 0x3b3f44,
  STONE = 0x8a857a,
  DARK = 0x2a2420;

/** A roof: a curved, sweeping profile across `width`, extruded along `length`, with an upturned ridge. */
function roof(builder, { width, length, height, y, x = 0, z = 0, color = TILE }) {
  const half = width / 2,
    shape = new Shape3D();
  // The profile sags between eave and ridge, and the eaves lift at their tips.
  shape.moveTo(-half - 0.6, 0.25);
  shape.quadraticCurveTo(-half * 0.4, height * 0.35, 0, height);
  shape.quadraticCurveTo(half * 0.4, height * 0.35, half + 0.6, 0.25);
  shape.lineTo(half + 0.5, 0);
  shape.quadraticCurveTo(half * 0.4, height * 0.2, 0, height - 0.32);
  shape.quadraticCurveTo(-half * 0.4, height * 0.2, -half - 0.5, 0);
  shape.lineTo(-half - 0.6, 0.25);
  const body = createExtrudeGeometry3D(shape, { depth: length + 1.2 });
  builder.add(body, { position: [x, y, z - (length + 1.2) / 2], color });
  // Ridge with upturned ends.
  builder.add(box(0.36, 0.34, length + 1.4), { position: [x, y + height + 0.05, z], color: DARK });
  for (const s of [-1, 1]) builder.add(box(0.3, 0.8, 0.3), { position: [x, y + height + 0.35, z + s * (length / 2 + 0.6)], rotation: [s * 0.4, 0, 0], color: DARK });
}

/** The hall of a post station: a stone base, red columns, plaster walls with a lattice front, a sweeping roof. */
export function hallGeometry({ width = 12, depth = 7, height = 3.6 } = {}) {
  const b = createGeometryBuilder3D(),
    hw = width / 2,
    hd = depth / 2;
  b.add(box(width + 1.6, 0.6, depth + 1.6), { position: [0, 0.3, 0], color: STONE });
  for (let i = 0; i < 4; i++) b.add(box(2.4, 0.2, 0.6), { position: [0, 0.1 + i * 0.15, hd + 1.1 + (3 - i) * 0.3], color: STONE });
  // Walls set back behind the colonnade.
  b.add(box(width - 0.4, height, depth - 1.6), { position: [0, 0.6 + height / 2, -0.4], color: PLASTER });
  for (let i = 0; i <= 5; i++) {
    const x = -hw + (i * width) / 5;
    b.add(cyl(0.2, 0.24, height + 0.2, 10), { position: [x, 0.6 + height / 2, hd - 0.3], color: TIMBER });
    b.add(cyl(0.2, 0.24, height + 0.2, 10), { position: [x, 0.6 + height / 2, -hd + 0.3], color: TIMBER });
  }
  // Lattice doors and windows on the front wall.
  for (let i = 0; i < 5; i++) {
    const x = -hw + 1.2 + i * ((width - 2.4) / 4);
    b.add(box(1.6, 2.4, 0.08), { position: [x, 0.6 + 1.3, hd - 1.15], color: TIMBER });
    for (let k = 0; k < 5; k++) b.add(box(1.5, 0.05, 0.1), { position: [x, 0.8 + k * 0.5, hd - 1.1], color: 0xb8742f });
    for (let k = 0; k < 4; k++) b.add(box(0.05, 2.3, 0.1), { position: [x - 0.6 + k * 0.4, 0.6 + 1.3, hd - 1.1], color: 0xb8742f });
  }
  // A beam over the columns and brackets under the eaves.
  b.add(box(width + 0.6, 0.4, 0.4), { position: [0, 0.6 + height + 0.1, hd - 0.3], color: 0x2e5a4e });
  b.add(box(width + 0.6, 0.12, 0.42), { position: [0, 0.6 + height - 0.12, hd - 0.3], color: 0xc89a3a });
  // The roof is built along Z and turned to run along the hall.
  const top = createGeometryBuilder3D();
  roof(top, { width: depth + 1.4, length: width + 0.6, height: 2.6, y: 0, color: TILE });
  b.add(top.build(), { position: [0, 0.6 + height + 0.25, 0], rotation: [0, Math.PI / 2, 0], color: 0xffffff, keepColors: true });
  return b.build();
}

/** The roof of `hallGeometry` runs along Z; this turns the whole hall so it runs along X. */
export function hall(options) {
  const geometry = hallGeometry(options),
    mesh = new Mesh3D(geometry, painted);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** A long low stable with a lean-to roof and hitching rails. */
export function stableGeometry() {
  const b = createGeometryBuilder3D();
  b.add(box(10, 0.3, 4.4), { position: [0, 0.15, 0], color: STONE });
  b.add(box(10, 2.6, 0.2), { position: [0, 1.6, -2], color: 0x6e5236 });
  for (let i = 0; i <= 5; i++) b.add(cyl(0.14, 0.16, 2.8, 8), { position: [-5 + i * 2, 1.7, 2], color: 0x5a3c26 });
  for (let i = 0; i < 4; i++) b.add(box(10, 0.1, 0.1), { position: [0, 0.9, 2.3 + i * 0.002], color: 0x5a3c26 });
  b.add(box(10.8, 0.16, 5.2), { position: [0, 3.05, 0], rotation: [-0.22, 0, 0], color: 0x4a4038 });
  // Bales of fodder and a water trough.
  for (let i = 0; i < 3; i++) b.add(box(1.2, 0.7, 0.8), { position: [-3 + i * 1.3, 0.65, -1.2], color: 0xb39a52 });
  b.add(box(2.4, 0.5, 0.7), { position: [2.8, 0.55, 1.2], color: 0x5a4632 });
  return b.build();
}

/** A paifang: a gateway of three bays over the road, with a board for its name. */
export function archGeometry(span = 11) {
  const b = createGeometryBuilder3D(),
    h = span / 2;
  for (const x of [-h, -h * 0.42, h * 0.42, h]) {
    b.add(box(1.2, 0.8, 1.2), { position: [x, 0.4, 0], color: STONE });
    b.add(cyl(0.32, 0.36, 6.6, 12), { position: [x, 3.8, 0], color: TIMBER });
  }
  b.add(box(span + 1.4, 0.5, 0.6), { position: [0, 6.6, 0], color: 0x2e5a4e });
  b.add(box(span + 1.4, 0.16, 0.62), { position: [0, 6.3, 0], color: 0xc89a3a });
  b.add(box(span * 0.84, 0.4, 0.5), { position: [0, 5.4, 0], color: 0x2e5a4e });
  // Three roofs over the bays, built along Z and turned to run across the road.
  const top = createGeometryBuilder3D();
  roof(top, { width: 2.2, length: span * 0.5, height: 1.1, y: 1.0, color: TILE });
  for (const s of [-1, 1]) roof(top, { width: 1.8, length: span * 0.3, height: 0.9, y: 0, z: s * span * 0.36, color: TILE });
  b.add(top.build(), { position: [0, 6.0, 0], rotation: [0, Math.PI / 2, 0], color: 0xffffff, keepColors: true });
  return b.build();
}

/** A white stupa: a stepped base, a dome, a tapering spire of rings and a gilt finial. */
export function stupaGeometry() {
  const b = createGeometryBuilder3D();
  for (let i = 0; i < 3; i++) b.add(box(7 - i * 1.4, 1, 7 - i * 1.4), { position: [0, 0.5 + i, 0], color: 0xece8de });
  b.add(createLatheGeometry3D([[0, 0], [2.2, 0], [2.6, 0.6], [2.5, 1.6], [2.1, 2.5], [1.2, 3.1], [0, 3.3]], { segments: 28 }), { position: [0, 3, 0], color: 0xf2efe6 });
  b.add(box(1.8, 0.6, 1.8), { position: [0, 6.5, 0], color: 0xece8de });
  for (let i = 0; i < 9; i++) b.add(cyl(0.62 - i * 0.05, 0.66 - i * 0.05, 0.28, 16), { position: [0, 7 + i * 0.3, 0], color: i % 2 ? 0xd8b25a : 0xc69a3e });
  b.add(createConeGeometry3D({ radius: 0.9, height: 0.5, radialSegments: 16 }), { position: [0, 9.9, 0], color: 0xc69a3e });
  b.add(createSphereGeometry3D({ radius: 0.28, widthSegments: 12, heightSegments: 8 }), { position: [0, 10.4, 0], color: 0xe2c062 });
  // A band of red ochre round the dome's foot.
  b.add(cyl(2.62, 2.62, 0.3, 28), { position: [0, 3.5, 0], color: 0x9a3a2a });
  return b.build();
}

/** A mani pile: carved stones heaped into a mound. */
export function maniGeometry(seed = 1) {
  const b = createGeometryBuilder3D(),
    random = seeded(seed);
  for (let i = 0; i < 46; i++) {
    const a = random() * Math.PI * 2,
      r = Math.sqrt(random()) * 2.4,
      layer = 1 - r / 2.6;
    b.add(createIcosahedronGeometry3D({ radius: 0.35 + random() * 0.25, detail: 0 }), {
      position: [Math.cos(a) * r, 0.2 + layer * 1.6 * random(), Math.sin(a) * r],
      scale: [1.3, 0.45, 1],
      rotation: [random() * 0.4, random() * 6, random() * 0.4],
      color: random() < 0.15 ? 0xd8d2c2 : random() < 0.2 ? 0x2f6a8a : 0x8c877c
    });
  }
  return b.build();
}

/** A pole for prayer flags, with a gilt cap; `height` in metres. */
export function poleGeometry(height = 7) {
  const b = createGeometryBuilder3D();
  b.add(cyl(0.09, 0.14, height, 8), { position: [0, height / 2, 0], color: 0x5a3c26 });
  b.add(createConeGeometry3D({ radius: 0.2, height: 0.5, radialSegments: 8 }), { position: [0, height + 0.25, 0], color: 0xd8b25a });
  for (let i = 0; i < 6; i++) b.add(box(0.5, 0.3, 0.12), { position: [Math.cos(i) * 0.4, 0.15, Math.sin(i) * 0.4], rotation: [0, i, 0], color: STONE });
  return b.build();
}

/** A red lantern on a bracket. */
export function lanternMesh() {
  const node = new Object3D(),
    shell = new Mesh3D(createSphereGeometry3D({ radius: 0.32, widthSegments: 14, heightSegments: 10 }), glow);
  shell.setScale(1, 1.25, 1);
  node.addChild(shell);
  const caps = createGeometryBuilder3D();
  for (const y of [-0.38, 0.38]) caps.add(cyl(0.16, 0.16, 0.08, 10), { position: [0, y, 0], color: 0xd8b25a });
  caps.add(cyl(0.015, 0.015, 0.5, 4), { position: [0, -0.62, 0], color: 0xd8b25a });
  node.addChild(new Mesh3D(caps.build(), painted));
  return node;
}

/**
 * A road sign: a dark lacquered board on two posts, gilt letters on it, `lines` of text (the first the larger),
 * and an arrow when `arrow` is ±1. Faces +Z.
 */
export function signBoard(lines, { width = 4.2, arrow = 0, height = 2.4 } = {}) {
  const node = new Object3D(),
    b = createGeometryBuilder3D(),
    boardHeight = lines.length > 1 ? 1.7 : 1.1;
  for (const s of [-1, 1]) b.add(cyl(0.1, 0.12, height + boardHeight, 8), { position: [s * (width / 2 - 0.2), (height + boardHeight) / 2, -0.06], color: 0x5a3c26 });
  b.add(box(width, boardHeight, 0.12), { position: [0, height + boardHeight / 2 - 0.1, 0], color: 0x24302c });
  b.add(box(width + 0.16, 0.12, 0.18), { position: [0, height + boardHeight - 0.05, 0], color: 0x5a3c26 });
  const board = new Mesh3D(b.build(), painted);
  board.castShadow = true;
  node.addChild(board);
  lines.forEach((line, i) => {
    const size = i === 0 ? 0.62 : 0.3,
      text = new Mesh3D(signText(line, { size, depth: 0.05 }), gilt);
    text.setPosition(arrow ? -arrow * 0.3 : 0, height + boardHeight - 0.25 - (i === 0 ? size : 0.62 + 0.16 + size), 0.07);
    node.addChild(text);
  });
  if (arrow) {
    const shape = new Shape3D([[0, 0.25], [0.45, 0], [0, -0.25], [0, -0.1], [-0.4, -0.1], [-0.4, 0.1], [0, 0.1]]);
    const point = new Mesh3D(createExtrudeGeometry3D(shape, { depth: 0.05 }), gilt);
    point.setScale(arrow, 1, 1);
    point.setPosition(arrow * (width / 2 - 0.55), height + boardHeight / 2 - 0.1, 0.07);
    node.addChild(point);
  }
  return node;
}

/** A stone marker on the road with a station's name carved in: a tall slab, lettering down its face. */
export function stele(text, sub) {
  const node = new Object3D(),
    b = createGeometryBuilder3D();
  b.add(box(1.6, 0.5, 1.0), { position: [0, 0.25, 0], color: STONE });
  b.add(box(1.1, 3.0, 0.4), { position: [0, 2.0, 0], color: 0x6f6b64 });
  b.add(box(1.3, 0.3, 0.5), { position: [0, 3.6, 0], color: STONE });
  const slab = new Mesh3D(b.build(), painted);
  slab.castShadow = true;
  node.addChild(slab);
  [...text].forEach((ch, i) => {
    const glyph = new Mesh3D(signText(ch, { size: 0.55, depth: 0.03 }), gilt);
    glyph.setPosition(0, 2.95 - i * 0.68, 0.21);
    node.addChild(glyph);
  });
  if (sub) {
    const line = new Mesh3D(signText(sub, { size: 0.16, depth: 0.02 }), gilt);
    line.setPosition(0, 0.62, 0.21);
    node.addChild(line);
  }
  return node;
}

export const materials = { painted, gilt, glow };
