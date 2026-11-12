import {
  Mesh3D, Object3D, createBoxGeometry3D, createCylinderGeometry3D, createIcosahedronGeometry3D, createStandardMaterial3D,
} from '@egret/engine/world3d';
import { createNativeStoryContainers } from './native-story-containers.mjs';
import { storyContainer } from './story-container-rules.mjs';

export function nativeStoryEventProp(sceneId, slot, picture) {
  const container = storyContainer(picture);
  if (container) return container;
  if (sceneId === 83 && slot >= 11 && slot <= 24 && (picture === 2331 || picture === 2332)) {
    return { kind: 'lectern', state: picture === 2332 ? 'filled' : 'empty' };
  }
  if (sceneId === 46 && slot === 0 && (picture === 2367 || picture === 2368)) {
    return { kind: 'sword-rock', state: picture === 2367 ? 'sheathed' : 'removed' };
  }
  if (sceneId === 55 && slot === 4 && picture === 2326) return { kind: 'wine-jars', state: 'present' };
}

export function createNativeStoryProps(scene, asset, sceneId) {
  const containers = createNativeStoryContainers(scene, asset);
  const records = new Map(), owned = new Set(), shapes = new Map(), materials = new Map();
  const models = new Map(asset.scene.getObjectByName('story-props').children.map(model => [model.name, model]));

  function mesh(parent, shape, color, metallic, size, position) {
    if (!shapes.has(shape)) {
      const geometry = shape === 'round' ? createCylinderGeometry3D({ radialSegments: 12 })
        : shape === 'rock' ? createIcosahedronGeometry3D({ radius: .5, detail: 1 }) : createBoxGeometry3D();
      shapes.set(shape, geometry);
      owned.add(geometry);
    }
    const key = color + ':' + metallic;
    if (!materials.has(key)) {
      const material = createStandardMaterial3D({ color, metallic, roughness: .77 });
      materials.set(key, material);
      owned.add(material);
    }
    return parent.addChild(new Mesh3D(shapes.get(shape), materials.get(key))).setScale(...size).setPosition(...position);
  }

  function lectern(root) {
    const bronze = 0x735530, rim = 0xaf9050;
    mesh(root, 'round', bronze, .54, [.36, .055, .36], [0, .03, 0]);
    mesh(root, 'round', rim, .58, [.24, .063, .24], [0, .08, 0]);
    mesh(root, 'round', bronze, .54, [.093, .73, .093], [0, .48, 0]);
    mesh(root, 'round', rim, .58, [.15, .083, .15], [0, .84, 0]);
    const tray = root.addChild(new Object3D()).setPosition(0, .91, 0).setRotation(.51, 0, 0);
    mesh(tray, 'box', rim, .58, [.73, .055, .54], [0, 0, 0]);
    mesh(tray, 'box', bronze, .54, [.64, .022, .45], [0, .034, 0]);
    const empty = tray.addChild(new Object3D());
    mesh(empty, 'round', rim, .58, [.31, .018, .31], [0, .054, 0]);
    mesh(empty, 'round', bronze, .54, [.23, .02, .23], [0, .058, 0]);
    mesh(empty, 'round', rim, .58, [.14, .022, .14], [0, .061, 0]);
    const filled = tray.addChild(new Object3D()).setPosition(0, .045, 0);
    const cover = filled.addChild(models.get('book').clone());
    cover.setScale(cover.scale[0], .38, cover.scale[2]);
    for (const side of [-1, 1]) {
      const leaf = filled.addChild(new Object3D()).setPosition(side * .132, .039, 0).setRotation(0, 0, side * -.075);
      mesh(leaf, 'box', 0xe6d5ac, 0, [.257, .032, .373], [0, 0, 0]);
      for (let line = 0; line < 4; line++) {
        mesh(leaf, 'box', 0x554a37, 0, [.006, .001, .22 - line % 3 * .035], [(line - 1.5) * .042, .0163, -.024]);
      }
    }
    return { empty, filled };
  }

  function swordRock(root) {
    mesh(root, 'rock', 0x72786d, 0, [.90, .69, .74], [0, .27, 0]).setRotation(0, .53, 0);
    mesh(root, 'rock', 0x53594f, 0, [.49, .31, .50], [-.22, .12, .13]).setRotation(0, .92, 0);
    const sheathed = root.addChild(models.get('sword').clone()).setPosition(.03, .47, 0).setRotation(0, -.31, -.16);
    return { sheathed };
  }

  function wineJars(root) {
    for (const [x, z, scale] of [[-.19, .18, .65], [.13, -.10, 1]]) {
      root.addChild(models.get('jar').clone()).setScale(scale).setPosition(x, 0, z);
      mesh(root, 'round', 0x8d4030, 0, [.29 * scale, .06 * scale, .29 * scale], [x, .54 * scale, z]);
      mesh(root, 'round', 0xc3a174, 0, [.25 * scale, .026 * scale, .25 * scale], [x, .51 * scale, z]);
    }
    return {};
  }

  const build = { lectern, 'sword-rock': swordRock, 'wine-jars': wineJars };
  return {
    begin() {
      containers.begin();
      for (const { root } of records.values()) root.visible = false;
    },
    draw(key, descriptor, x, y, z, elapsedMs) {
      if (descriptor.kind === 'chest' || descriptor.kind === 'cupboard') return containers.draw(key, descriptor, x, y, z, elapsedMs);
      const id = key + ':' + descriptor.kind;
      if (!records.has(id)) {
        const root = scene.addChild(new Object3D());
        records.set(id, { root, variants: build[descriptor.kind](root) });
      }
      const { root, variants } = records.get(id);
      root.visible = true;
      root.setPosition(x, y, z);
      for (const [state, model] of Object.entries(variants)) model.visible = state === descriptor.state;
      return root;
    },
    tile(picture, x, z, y, left) {
      if (sceneId !== 20 || picture !== 2369 && picture !== 2370) return;
      if (picture === 2370 && left === 2369) return true;
      const boat = new Object3D();
      boat.name = 'story-prop-boat';
      boat.addChild(models.get('boat').clone());
      return boat.setPosition(x + (picture === 2369 ? .5 : -.5), y, z);
    },
    dispose() {
      containers.dispose();
      for (const { root } of records.values()) root.removeFromParent();
      for (const resource of owned) resource.dispose();
      records.clear();
      owned.clear();
    },
  };
}
