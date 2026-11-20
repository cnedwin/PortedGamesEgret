// 营地：到了驿站可以扎营。从一组营地物件（帐篷、篝火、拴马桩和驮马、茶箱、经幡杆、马灯）里挑一件放下，
// 用引擎的变换控件（createTransformControls3D，它的手柄就是 createTransformGizmo3D）挪动、转向；相机用
// createOrbitControls3D 绕着营地看。布置好的营地由 serializeScene3D 写成场景文档存进存档，下次到这个驿站时
// 由 deserializeScene3D 读回来摆好。
//
// The camp: at a station the crew can make camp. Choose a piece (a tent, a fire, a hitching post with a pack horse,
// tea chests, a flag pole, a lantern), set it down, and move and turn it with the engine's transform controls
// (`createTransformControls3D`, whose handles are a `createTransformGizmo3D`); the camera circles the camp with
// `createOrbitControls3D`. The camp as laid out is written by `serializeScene3D` as a scene document into the save, and
// read back by `deserializeScene3D` the next time the convoy reaches that station.
import {
  Mesh3D,
  Object3D,
  createBoxGeometry3D,
  createConeGeometry3D,
  createCylinderGeometry3D,
  createGeometryBuilder3D,
  createIcosahedronGeometry3D,
  createSphereGeometry3D,
  createStandardMaterial3D,
  createTorusGeometry3D,
  deserializeScene3D,
  serializeScene3D
} from '@egret/engine/world3d';
import { createOrbitControls3D, createTransformControls3D } from '@egret/engine/webgl2/world3d';

const solid = createStandardMaterial3D({ vertexColors: true, roughness: 0.86, metallic: 0 });
const glowing = createStandardMaterial3D({ vertexColors: true, emissive: 0xff9a3a, emissiveIntensity: 2.2, roughness: 1 });

/** A canvas tent: a ridge of two sloping sheets over poles, with its door flaps tied back and guy lines. */
function tent() {
  const b = createGeometryBuilder3D(),
    canvas = 0xd8ccb0,
    shade = 0xb8a888;
  const sheet = createBoxGeometry3D({ width: 2.3, height: 0.04, depth: 3.2 });
  b.add(sheet, { position: [-0.78, 1.0, 0], rotation: [0, 0, 0.82], color: canvas });
  b.add(sheet, { position: [0.78, 1.0, 0], rotation: [0, 0, -0.82], color: shade });
  // The ends: triangles of cloth, one with the door open.
  const end = createConeGeometry3D({ radius: 1.55, height: 1.9, radialSegments: 3 });
  b.add(end, { position: [0, 0.95, -1.6], rotation: [0, Math.PI / 6, 0], scale: [1, 1, 0.02], color: shade });
  b.add(createBoxGeometry3D({ width: 0.04, height: 1.9, depth: 0.04 }), { position: [0, 0.95, 1.62], color: 0x5a4028 });
  b.add(createBoxGeometry3D({ width: 0.04, height: 0.04, depth: 3.4 }), { position: [0, 1.88, 0], color: 0x5a4028 });
  for (const side of [-1, 1]) b.add(createBoxGeometry3D({ width: 0.7, height: 1.4, depth: 0.03 }), { position: [side * 0.62, 0.7, 1.66], rotation: [0, side * 0.6, side * 0.35], color: canvas });
  // A strip of the five colours along the ridge.
  [0x2f6fb5, 0xf2efe6, 0xb8392c, 0x2e8c86, 0xe3a83e].forEach((colour, i) => b.add(createBoxGeometry3D({ width: 0.3, height: 0.05, depth: 0.6 }), { position: [0, 1.92, -1.3 + i * 0.65], color: colour }));
  return [b.build(), solid];
}

/** A fire: a ring of stones, crossed logs, and the flames. */
function fire() {
  const b = createGeometryBuilder3D(),
    flames = createGeometryBuilder3D();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    b.add(createIcosahedronGeometry3D({ radius: 0.16, detail: 0 }), { position: [Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62], scale: [1.2, 0.8, 1], color: 0x6c6760 });
  }
  for (let i = 0; i < 4; i++) b.add(createCylinderGeometry3D({ radiusTop: 0.06, radiusBottom: 0.07, height: 0.9, radialSegments: 6 }), { position: [0, 0.14, 0], rotation: [Math.PI / 2, (i / 4) * Math.PI, 0.25], color: 0x4a3220 });
  flames.add(createConeGeometry3D({ radius: 0.28, height: 0.8, radialSegments: 7 }), { position: [0, 0.5, 0], color: 0xffb040 });
  flames.add(createConeGeometry3D({ radius: 0.16, height: 0.55, radialSegments: 6 }), { position: [0.12, 0.42, 0.06], rotation: [0.2, 0, -0.2], color: 0xffd070 });
  flames.add(createConeGeometry3D({ radius: 0.14, height: 0.5, radialSegments: 6 }), { position: [-0.1, 0.4, -0.05], rotation: [-0.2, 0, 0.25], color: 0xff7a30 });
  return [b.build(), solid, flames.build(), glowing];
}

/** A hitching post with a pack horse tied to it, its saddle loaded with two bundles of tea. */
function horse() {
  const b = createGeometryBuilder3D(),
    coat = 0x6a4a32,
    dark = 0x2a2018;
  b.add(createCylinderGeometry3D({ radiusTop: 0.07, radiusBottom: 0.09, height: 1.3, radialSegments: 7 }), { position: [-1.1, 0.65, 0.6], color: 0x5a4028 });
  b.add(createSphereGeometry3D({ radius: 0.5, widthSegments: 12, heightSegments: 8 }), { position: [0, 1.15, 0], scale: [0.85, 0.85, 1.65], color: coat });
  b.add(createCylinderGeometry3D({ radiusTop: 0.17, radiusBottom: 0.24, height: 0.8, radialSegments: 9 }), { position: [0, 1.55, 0.78], rotation: [0.75, 0, 0], color: coat });
  b.add(createSphereGeometry3D({ radius: 0.2, widthSegments: 10, heightSegments: 7 }), { position: [0, 1.85, 1.15], scale: [0.8, 0.9, 1.6], color: coat });
  b.add(createBoxGeometry3D({ width: 0.05, height: 0.32, depth: 0.5 }), { position: [0, 1.75, 0.82], rotation: [0.7, 0, 0], color: dark });
  for (const [x, z] of [[0.25, 0.55], [-0.25, 0.55], [0.25, -0.55], [-0.25, -0.55]]) {
    b.add(createCylinderGeometry3D({ radiusTop: 0.08, radiusBottom: 0.06, height: 0.9, radialSegments: 6 }), { position: [x, 0.45, z], color: coat });
    b.add(createCylinderGeometry3D({ radiusTop: 0.07, radiusBottom: 0.08, height: 0.1, radialSegments: 6 }), { position: [x, 0.05, z], color: dark });
  }
  b.add(createConeGeometry3D({ radius: 0.12, height: 0.7, radialSegments: 6 }), { position: [0, 1.05, -0.95], rotation: [-2.5, 0, 0], color: dark });
  // The pack saddle and the two bundles slung on either side.
  b.add(createBoxGeometry3D({ width: 0.9, height: 0.12, depth: 0.7 }), { position: [0, 1.62, 0], color: 0x8a2a22 });
  for (const side of [-1, 1]) b.add(createCylinderGeometry3D({ radiusTop: 0.2, radiusBottom: 0.2, height: 0.62, radialSegments: 12 }), { position: [side * 0.55, 1.35, 0], rotation: [Math.PI / 2, 0, 0], color: 0x8f7442 });
  b.add(createTorusGeometry3D({ radius: 0.06, tube: 0.02, radialSegments: 6, tubularSegments: 10 }), { position: [0, 1.45, 1.0], color: 0xc8a040 });
  return [b.build(), solid];
}

/** Chests of tea stacked and roped. */
function chests() {
  const b = createGeometryBuilder3D();
  const plank = createBoxGeometry3D({ width: 0.8, height: 0.154, depth: 0.55 });
  const rail = createBoxGeometry3D({ width: 0.09, height: 0.5, depth: 0.58 });
  const lid = createBoxGeometry3D({ width: 0.82, height: 0.045, depth: 0.57 });
  const seal = createBoxGeometry3D({ width: 0.13, height: 0.12, depth: 0.009 });
  const tones = [0x836343, 0xa0865a, 0x8f704c, 0xb09262];
  for (const [x, y, z, r] of [[0, 0.25, 0, 0], [0.84, 0.25, 0.04, 0.05], [0.4, 0.75, 0.02, -0.08], [-0.1, 0.25, 0.62, 0.1]]) {
    const add = (geometry, dx, dy, dz, color) => b.add(geometry, {
      position: [x + dx * Math.cos(r) + dz * Math.sin(r), y + dy, z - dx * Math.sin(r) + dz * Math.cos(r)],
      rotation: [0, r, 0], color
    });
    for (let i = 0; i < 3; i++) add(plank, 0, (i - 1) * 0.166, 0, tones[(i + Math.round(x * 5) + 4) % 4]);
    add(lid, 0, 0.244, 0, 0xa38256);
    for (const side of [-1, 1]) add(rail, side * 0.31, 0, 0, 0x554536);
    add(seal, 0, 0, 0.281, 0xa54f37);
  }
  return [b.build(), solid];
}

/** A tall pole with a long banner of the five colours down it. */
function pole() {
  const b = createGeometryBuilder3D();
  b.add(createCylinderGeometry3D({ radiusTop: 0.05, radiusBottom: 0.08, height: 5.2, radialSegments: 8 }), { position: [0, 2.6, 0], color: 0x6a4a2a });
  b.add(createConeGeometry3D({ radius: 0.12, height: 0.3, radialSegments: 8 }), { position: [0, 5.35, 0], color: 0xe3a83e });
  [0x2f6fb5, 0xf2efe6, 0xb8392c, 0x2e8c86, 0xe3a83e].forEach((colour, i) => b.add(createBoxGeometry3D({ width: 0.02, height: 0.75, depth: 0.55 }), { position: [0, 4.7 - i * 0.78, 0.32], rotation: [0.06 * i, 0, 0], color: colour }));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    b.add(createIcosahedronGeometry3D({ radius: 0.22, detail: 0 }), { position: [Math.cos(a) * 0.3, 0.1, Math.sin(a) * 0.3], color: 0x77736c });
  }
  return [b.build(), solid];
}

/** A lantern on a stand, lit. */
function lantern() {
  const b = createGeometryBuilder3D(),
    lit = createGeometryBuilder3D();
  b.add(createCylinderGeometry3D({ radiusTop: 0.04, radiusBottom: 0.05, height: 1.6, radialSegments: 6 }), { position: [0, 0.8, 0], color: 0x3a2818 });
  b.add(createBoxGeometry3D({ width: 0.5, height: 0.04, depth: 0.04 }), { position: [0.2, 1.58, 0], color: 0x3a2818 });
  lit.add(createSphereGeometry3D({ radius: 0.17, widthSegments: 10, heightSegments: 8 }), { position: [0.4, 1.35, 0], scale: [1, 1.25, 1], color: 0xd84a2a });
  return [b.build(), solid, lit.build(), glowing];
}

/** The pieces of a camp, by key: their names and how to make them. */
export const CAMP_PIECES = [
  { key: 'tent', zh: '帐篷', en: 'Tent', make: tent },
  { key: 'fire', zh: '篝火', en: 'Fire', make: fire },
  { key: 'horse', zh: '驮马', en: 'Pack horse', make: horse },
  { key: 'chests', zh: '茶箱', en: 'Tea chests', make: chests },
  { key: 'pole', zh: '经幡杆', en: 'Flag pole', make: pole },
  { key: 'lantern', zh: '马灯', en: 'Lantern', make: lantern }
];

/** A piece as a node: its meshes under one parent, named by its key so a saved camp knows what it holds. */
export function makePiece(key) {
  const piece = CAMP_PIECES.find((p) => p.key === key),
    made = piece.make(),
    node = new Object3D();
  node.name = key;
  node.userData = { piece: key };
  for (let i = 0; i < made.length; i += 2) {
    const mesh = new Mesh3D(made[i], made[i + 1]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    node.addChild(mesh);
  }
  return node;
}

/**
 * The camp of the station `station` (its `yard` centre and `heightAt`). `saved` is the scene document of an earlier
 * visit, if any. While editing, `canvas` takes the pointer for the handles and the camera.
 */
export function createCamp(scene, camera, canvas, { station, heightAt, saved }) {
  let group = new Object3D(),
    loaded = null;
  group.name = 'camp';
  if (saved) {
    try {
      loaded = deserializeScene3D(saved);
      group = loaded.root;
    } catch (cause) {
      console.warn('camp', cause);
    }
  }
  scene.addChild(group);
  let controls = null,
    orbit = null,
    selected = null;

  /** Keep every piece on the ground, upright, wherever the handles put it. */
  function settle(node) {
    node.position[1] = heightAt(node.position[0], node.position[2]);
    node.setPosition(node.position[0], node.position[1], node.position[2]);
  }

  return {
    get group() {
      return group;
    },
    get pieces() {
      return group.children;
    },
    get selected() {
      return selected;
    },
    /** Begin laying out: the camera circles the yard, the handles appear on what is chosen. */
    edit() {
      // The camera stands out over the road, looking back at the yard (whose +Z faces the road).
      const centre = [station.x, heightAt(station.x, station.z) + 1, station.z],
        fx = Math.sin(station.yaw ?? 0),
        fz = Math.cos(station.yaw ?? 0);
      camera.setPosition(centre[0] + fx * 20, centre[1] + 11, centre[2] + fz * 20);
      camera.lookAt(centre[0], centre[1], centre[2]);
      orbit = createOrbitControls3D(camera, canvas, { target: centre, minDistance: 6, maxDistance: 45, maxPolarAngle: 1.35, damping: 0.85 });
      controls = createTransformControls3D(camera, canvas, { size: 0.16 });
      controls.gizmo.translationSnap = 0.25;
      controls.gizmo.rotationSnap = Math.PI / 12;
      controls.gizmo.onDraggingChanged = (dragging) => {
        orbit.enabled = !dragging;
        if (!dragging && selected) settle(selected);
      };
      controls.gizmo.onChange = (node) => {
        if (controls.mode === 'translate') settle(node);
      };
      scene.addChild(controls.gizmo);
      if (group.children.length) this.select(group.children[group.children.length - 1]);
    },
    /** Set down a new piece of `key` a few metres from the middle of the yard, and choose it. */
    add(key) {
      const node = makePiece(key),
        n = group.children.length,
        a = n * 2.3,
        r = n ? 3 + (n % 4) * 1.6 : 0;
      node.setPosition(station.x + Math.cos(a) * r, 0, station.z + Math.sin(a) * r);
      settle(node);
      node.setRotation(0, -a, 0);
      group.addChild(node);
      this.select(node);
      return node;
    },
    /** Choose a piece for the handles. */
    select(node) {
      selected = node;
      if (controls && node) controls.attach(node);
    },
    /** Choose the next piece, in the order they were set down. */
    selectNext() {
      const list = group.children;
      if (!list.length) return;
      const i = (list.indexOf(selected) + 1) % list.length;
      this.select(list[i]);
    },
    /** Take away the chosen piece. */
    removeSelected() {
      if (!selected) return;
      controls?.detach();
      selected.removeFromParent();
      selected = null;
      this.selectNext();
    },
    set mode(value) {
      if (controls) controls.mode = value;
    },
    get mode() {
      return controls?.mode ?? 'translate';
    },
    /** The camp as a scene document, for the save. */
    serialize() {
      return serializeScene3D(group);
    },
    update() {
      orbit?.update();
      controls?.update();
    },
    /** Stop editing: the handles and the orbit go; the camp stays standing. */
    finish() {
      controls?.detach();
      controls?.gizmo.removeFromParent();
      controls?.dispose();
      orbit?.dispose();
      controls = null;
      orbit = null;
      selected = null;
    },
    dispose() {
      this.finish();
      group.removeFromParent();
      loaded?.dispose();
    }
  };
}
