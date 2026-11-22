import { Mesh3D, createGeometry3D, createStandardMaterial3D, setColor3D } from '@egret/engine/world3d';

// Signature weapons use the grip and silhouette that match the character's model.
const blades = new Map([
  [1, { length: .83, width: .057, curve: .13, fitting: 0x9b926f, grip: 0x48382c }],
  [3, { length: .87, width: .033, fitting: 0xa8b5bd, grip: 0x332b27 }],
  [6, { length: .94, width: .040, fitting: 0xc8b36e, grip: 0x4d4641 }],
  [7, { length: .73, width: .041, fitting: 0x99928a, grip: 0x3d2822 }],
  [19, { length: .83, width: .047, fitting: 0xbda06c, grip: 0x3b2e29 }],
  [24, { length: .73, width: .031, fitting: 0x8f9780, grip: 0x454437 }],
  [29, { length: .73, width: .057, curve: .11, fitting: 0xa89368, grip: 0x594027 }],
  [35, { length: .87, width: .039, fitting: 0xc2ab7d, grip: 0x39322c }],
  [36, { length: .69, width: .035, fitting: 0xbb9362, grip: 0x53352a }],
  [43, { length: .89, width: .036, fitting: 0xa0b5c4, grip: 0x414b50 }],
  [51, { length: .79, width: .042, fitting: 0xc5a871, grip: 0x332f40 }],
  [54, { length: .82, width: .036, curve: .07, fitting: 0xc39e4f, grip: 0x50442a }],
  [58, { length: 1.02, width: .072, fitting: 0x807762, grip: 0x343438, hand: 'left', dark: true }],
  [59, { length: .72, width: .031, fitting: 0xadaa9c, grip: 0x88898e }],
  [68, { length: .76, width: .043, fitting: 0xa79d78, grip: 0x504038 }],
]);
const swordSchoolHeads = new Set([76, 77, 78, 81, 82, 83, 84, 85, 86, 90, 95]);
const schoolSword = { length: .72, width: .030, fitting: 0x9b977b, grip: 0x463d37 };

function swordGeometry({ length, width, fitting, grip, curve = 0, dark = false }) {
  const positions = [], colors = [];
  const color = new Float32Array(3);
  const face = (vertices, tint) => {
    setColor3D(color, tint);
    for (const i of [0, 1, 2, 0, 2, 3]) {
      positions.push(...vertices[i]);
      colors.push(...color);
    }
  };
  // Each section is a beveled cross section. Separate faces retain the blade's ridge.
  const ring = (z, halfWidth, depth) => {
    const x = curve * (Math.max(0, -.11 - z) / (length - .11)) ** 2;
    return [[x, depth, z], [x + halfWidth, 0, z], [x, -depth, z], [x - halfWidth, 0, z]];
  };
  const span = (from, to, tints) => {
    for (let i = 0; i < from.length; i++) {
      const next = (i + 1) % from.length;
      face([from[i], to[i], to[next], from[next]], tints[i % tints.length]);
    }
  };
  const steel = dark ? [0x656269, 0x343137, 0x535258, 0x8e8a8c] : [0xd8e4e7, 0x808d94, 0xa6b7bf, 0xe3eaec];
  const shoulder = ring(-.11, width, .009);
  const taper = ring(-length * .82, width * .76, .0055);
  span(shoulder, taper, steel);
  span(taper, ring(-length, .0005, .0005), steel);
  const guard = ring(-.08, width * 1.53, .017);
  span(ring(-.065, width * 1.32, .012), guard, [fitting]);
  span(guard, shoulder, [fitting]);
  span(ring(.063, .013, .013), ring(-.065, .013, .013), [grip]);
  span(ring(.089, .004, .005), ring(.063, .021, .018), [fitting]);
  span(ring(.063, .021, .018), ring(.051, .013, .013), [fitting]);
  return createGeometry3D({ positions, colors });
}

export function createBattleCharacterArt() {
  const geometries = new Map();
  let swordMaterial;

  function finishMaterials(scene) {
    const finished = new Set();
    scene.traverse(mesh => {
      if (!(mesh instanceof Mesh3D) || !mesh.skeleton) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        if (finished.has(material) || material.shading !== 'standard' || !material.map) continue;
        finished.add(material);
        // Keep the source's paint and cutouts. Trilinear sampling and a restrained
        // cloth sheen preserve folds and hems when viewed from the tactical camera.
        material.map.anisotropy = 4;
        material.sheen = .24;
        material.sheenRoughness = .65;
        setColor3D(material.sheenColor, 0xd4c6ae);
        if (!material.emissiveMap && material.emissive.every(value => value === 0)) {
          material.emissiveMap = material.map;
          material.setEmissive([1, 1, 1]);
          material.emissiveIntensity = .075;
        }
        material.touch();
      }
    });
  }

  function equip(actor, role) {
    const design = blades.get(role.id) ?? (role.id >= 81 && swordSchoolHeads.has(role.headId) ? schoolSword : undefined);
    if (!design) return;
    const grip = new RegExp((design.hand ?? 'right') + '_?hand$', 'i');
    let hand;
    actor.traverse(node => {
      if (node.kind === 'bone' && grip.test(node.name)) hand = node;
    });
    if (!hand?.parent) return;
    const wrist = hand.getWorldPosition(), elbow = hand.parent.getWorldPosition();
    const forearmLength = Math.hypot(wrist[0] - elbow[0], wrist[1] - elbow[1], wrist[2] - elbow[2]);
    const scale = Math.hypot(...hand.matrixWorld.subarray(0, 3));
    if (!(forearmLength > 0) || !(scale > 0)) return;
    const palm = wrist.map((coordinate, axis) => coordinate + (coordinate - elbow[axis]) * .057 / forearmLength);
    const offset = hand.worldToLocal(new Float32Array(3), palm);
    if (!geometries.has(design)) geometries.set(design, swordGeometry(design));
    swordMaterial ??= createStandardMaterial3D({
      vertexColors: true, side: 'double', metallic: .28, roughness: .52,
    });
    const sword = hand.addChild(new Mesh3D(geometries.get(design), swordMaterial));
    sword.name = 'Battle sword';
    sword.setPosition(...offset).setScale(1 / scale).lookAt(palm[0], palm[1] + .25, palm[2] + 1);
  }

  return { finishMaterials, equip, dispose() {
    swordMaterial?.dispose();
    for (const geometry of geometries.values()) geometry.dispose();
    geometries.clear();
  } };
}
