import {
  Attribute3D, InstancedMesh3D, Mesh3D, Object3D, colorFromHex, computeObjectBounds3D,
  createBatchedMesh3D, createBoxGeometry3D, createCustomShader3D, createIcosahedronGeometry3D,
  createStandardMaterial3D, mat4Compose, mat4Multiply,
} from '@egret/engine/world3d';
import { loadGltfFromUrl3D, loadTexture3D } from '@egret/engine/webgl2/world3d';
import { plantWindVertex } from './native-plant-wind.mjs';
import { createNativeSubmapTerrain, submapElevation as elevation, submapPicture as picture, submapVariation as variation } from './native-submap-terrain.mjs';
import { submapBuildingKind, submapDecorationKind, submapEarthKind, submapWallAxis } from './submap-layout.mjs';

const here = name => new URL(name, import.meta.url).href;
const turn = Math.PI / 2;
const axis = [0, 0, 0, 1], unit = [1, 1, 1];
const plantModel = {
  grass: ['garden-grass', .80, .36, .74], reeds: ['reeds', .65, .64, .65],
  flowers: ['garden-flower-yellow', .69, .48, .69], shrub: ['garden-grass', 1.04, .73, 1.04],
  bamboo: ['reeds', 1, 2.15, 1], pine: ['tree-tall', 1.8, 3.1, 1.8], broadleaf: ['tree-broad', 2.2, 2.8, 2.2],
  autumn: ['tree-slim', 1.93, 2.7, 1.93], 'snow-tree': ['snow-pine', 1.8, 2.95, 1.8],
  palm: ['palm', 2.1, 2.8, 2.1], 'bare-tree': ['bare', 1.45, 2.15, 1.45],
};
const furnitureModel = {
  seat: ['stool', .68, .61, .68], table: ['table', 1.22, .87, 1.08], bed: ['bed', 1.38, 1.05, 1.86],
  cabinet: ['cabinet', .95, 1.40, .64], counter: ['counter', 1.24, 1.02, .72],
  barrel: ['barrel', .65, .70, .67], jar: ['jar', .57, .63, .57], crate: ['chest', .79, .59, .72],
  rock: ['stone', .82, .71, .78], pillar: ['post', .40, 2.20, .40],
};
const wallModel = {
  'timber-wall': ['wall-timber', .18, 1.69], 'bamboo-wall': ['wall-bamboo', .14, 1.71],
  'brick-wall': ['brick', .31, 1.82], 'plaster-wall': ['plaster', .31, 1.88],
  'stone-wall': ['masonry', .45, 1.51], 'cave-wall': ['cave-rock', .78, 1.62],
  fence: ['wood-fence', .15, .72], 'stone-fence': ['masonry', .20, .77], screen: ['wall-lattice', .14, 1.40],
  door: ['wood-door', .19, 1.92], gate: ['wood-door', .32, 2.18],
};
const blocking = new Set([...Object.values(wallModel).map(([name]) => name), 'clay-roof', 'iron']);
const structural = ['earth', 'building', 'buildingHeight', 'decoration', 'decorationHeight'];
const motion = {
  'tree-broad': [.105, .027], 'tree-tall': [.082, .020], 'tree-slim': [.112, .034], 'snow-pine': [.072, .016],
  palm: [.135, .045], bare: [.062, .012], reeds: [.225, .044], 'garden-grass': [.195, .038],
  'garden-flower-yellow': [.173, .035], 'garden-flower-red': [.173, .035],
};

async function loadNativeSubmapAssets() {
  const sampler = { colorSpace: 'srgb', wrapS: 'repeat', wrapT: 'repeat', anisotropy: 4 };
  const results = await Promise.allSettled([
    ...['submap-kit.glb', 'world-scenery-detail.glb', 'submap-garden.glb'].map(name => loadGltfFromUrl3D(here(name))),
    ...['world-grass.webp', 'world-rock.webp', 'battle-paving.webp', 'battle-wood.webp', 'world-road.webp']
      .map(name => loadTexture3D(here(name), sampler)),
  ]);
  const resources = results.filter(result => result.status === 'fulfilled').map(result => result.value);
  const failure = results.find(result => result.status === 'rejected');
  if (failure) {
    for (const resource of resources) resource.dispose();
    throw failure.reason;
  }
  const [kit, outdoors, garden, grass, rock, paving, wood, water] = resources;
  return { kits: [kit, outdoors, garden], textures: { grass, rock, paving, wood, water },
    dispose() { for (const resource of resources) resource.dispose(); } };
}

export async function loadNativeSubmapScenery(map, options = {}) {
  const assets = await loadNativeSubmapAssets();
  let scenery;
  try {
    scenery = createNativeSubmapScenery(assets.kits, assets.textures, options);
    scenery.setMap(map);
    const disposeScenery = scenery.dispose;
    scenery.dispose = () => { disposeScenery(); assets.dispose(); };
    return scenery;
  } catch (error) {
    scenery?.dispose();
    assets.dispose();
    throw error;
  }
}

function createNativeSubmapScenery(kits, textures, { sprite, storyTile }) {
  const root = new Object3D();
  const terrain = createNativeSubmapTerrain(textures);
  const floor = root.addChild(terrain.root);
  const decor = root.addChild(new Object3D());
  const blockers = decor.addChild(new Object3D());
  const templates = new Map(), wind = new Map(), spriteBatches = new Map();
  const box = createBoxGeometry3D(), snow = createIcosahedronGeometry3D({ radius: .55, detail: 1 });
  const caveRock = createIcosahedronGeometry3D({ radius: .64, detail: 1 });
  const cavePositions = caveRock.getAttribute('position').data.slice();
  for (let i = 0; i < cavePositions.length; i += 3) {
    const [x, y, z] = cavePositions.subarray(i, i + 3);
    const scale = .96 + .15 * Math.sin(x * 10.7 + y * 8.9 + z * 12.7);
    cavePositions.set([x * scale, y * scale, z * scale], i);
  }
  caveRock.setAttribute('position', new Attribute3D(cavePositions, 3)).computeNormals();
  const owned = [box, snow, caveRock];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const matrix = new Float32Array(16), position = new Float32Array(16), origin = new Float32Array(16);
  const tint = new Float32Array(3);
  let map, snapshot, cave, modeled, retained, omitted, maskCells, floorCells, vegetationInstances;
  let disposed = false, layoutRevision = 0;

  function register(name, node) {
    const parts = [];
    node.updateWorldMatrices();
    node.traverse(part => { if (part instanceof Mesh3D) parts.push(part); });
    const bounds = computeObjectBounds3D(node);
    const low = bounds.slice(0, 3), high = bounds.slice(3, 6);
    const dimensions = high.map((value, i) => value - low[i]);
    if (!parts.length || dimensions.some(value => !(value > .00001))) return;
    templates.set(name, { parts, dimensions, offset: [-(low[0] + high[0]) / 2, -low[1], -(low[2] + high[2]) / 2] });
  }

  for (const asset of kits) for (const node of asset.scene.children) register(node.name, node);
  for (const [name, geometry, map, color] of [
    ['brick', box, textures.paving, 0xbb8070], ['plaster', box, undefined, 0xd5ccb0],
    ['masonry', box, textures.paving, 0xaeb1a8], ['cave-rock', caveRock, textures.rock, 0xb9ada1],
    ['timber-trim', box, textures.wood, 0x977356], ['clay-roof', box, textures.paving, 0x65716a],
    ['step', box, textures.paving, 0xc5beb0], ['wood-block', box, textures.wood, 0xa27e5c],
    ['iron', box, undefined, 0x666b68], ['snow-cap', snow, undefined, 0xe1eae5],
    ['snow-rock', snow, textures.rock, 0x8b857b],
  ]) {
    const material = createStandardMaterial3D({ color, map, roughness: .88 });
    owned.push(material);
    register(name, new Mesh3D(geometry, material));
  }

  function plantMaterial(name, source, worldHeight) {
    if (!motion[name]) return source.material;
    if (!wind.has(source)) {
      const bounds = source.geometry.boundingBox;
      const localHeight = Math.max(.01, bounds[4] - bounds[1]);
      const clone = material => {
        const value = material.clone();
        value.shader = createCustomShader3D({ key: 'kys-submap-plant-wind', glslVertex: plantWindVertex,
          uniforms: [0, ...motion[name], 1 / localHeight, worldHeight, Number(!reducedMotion.matches), bounds[1]] });
        value.touch();
        owned.push(value);
        return value;
      };
      wind.set(source, Array.isArray(source.material) ? source.material.map(clone) : clone(source.material));
    }
    return wind.get(source);
  }

  function heightAt(x, y) {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return 0;
    return elevation(map.layers.buildingHeight[y * map.width + x]);
  }

  function heightAtActor(x, y) {
    const a = Math.floor(x), b = Math.floor(y);
    const tx = x - a, ty = y - b;
    return (1 - ty) * ((1 - tx) * heightAt(a, b) + tx * heightAt(a + 1, b))
      + ty * ((1 - tx) * heightAt(a, b + 1) + tx * heightAt(a + 1, b + 1));
  }

  function clearDecor() {
    blockers.removeChildren();
    for (const child of [...decor.children]) if (child !== blockers) child.removeFromParent();
    for (const batch of spriteBatches.values()) batch.dispose();
    spriteBatches.clear();
  }

  function setMap(next) {
    const same = snapshot && next.width === map.width && next.height === map.height
      && next.name === map.name && next.blendOutdoorGround === map.blendOutdoorGround
      && structural.every(key => next.layers[key].every((value, i) => value === snapshot[key][i]));
    map = next;
    if (same) return;
    snapshot = Object.fromEntries(structural.map(key => [key, next.layers[key].slice()]));
    clearDecor();
    modeled = retained = omitted = maskCells = floorCells = vegetationInstances = 0;
    const { width, height, layers } = map;
    cave = /洞|地道|地牢|迷宮|聖堂|古墓/.test(map.name);
    const tileAt = (x, y) => x >= 0 && y >= 0 && x < width && y < height ? y * width + x : -1;
    const walls = Array.from(layers.building, raw => submapBuildingKind(picture(raw)));
    const tiles = new Map(), coverage = new Map(), placements = new Map();

    function addFloor(kind, x, y, yWorld, id) {
      if (!tiles.has(kind)) tiles.set(kind, []);
      tiles.get(kind).push([x, y, yWorld, id]);
      floorCells++;
    }

    function place(name, x, y, yWorld, w, h, d, angle = 0, color = 0xffffff) {
      if (!templates.has(name)) return false;
      if (!placements.has(name)) placements.set(name, []);
      placements.get(name).push({ x, y, yWorld, w, h, d, angle, color });
      return true;
    }

    function fallback(id, x, y, yWorld, rank) {
      const mesh = sprite?.(id, x, y, yWorld, rank);
      if (!mesh) { omitted++; return; }
      retained++;
      if (Array.isArray(mesh.material) || !mesh.geometry.getAttribute('normal')) {
        decor.addChild(mesh);
        return;
      }
      let batch = spriteBatches.get(mesh.material);
      if (!batch) {
        batch = decor.addChild(createBatchedMesh3D(mesh.material));
        batch.name = 'submap-original-atlas';
        batch.receiveShadow = false;
        spriteBatches.set(mesh.material, batch);
      }
      mesh.updateWorldMatrix();
      batch.addGeometry(mesh.geometry, mesh.matrixWorld);
    }

    function addWall(kind, id, x, y, yWorld) {
      const [name, depth, nominalHeight] = wallModel[kind];
      const isWall = (a, b) => Boolean(wallModel[walls[tileAt(a, b)]]);
      const across = Number(isWall(x - 1, y)) + Number(isWall(x + 1, y));
      const along = Number(isWall(x, y - 1)) + Number(isWall(x, y + 1));
      const angle = along > across || along === across && submapWallAxis(id) === 'z' ? turn : 0;
      const h = cave && kind === 'cave-wall' ? nominalHeight * .83 : nominalHeight;
      if (kind === 'cave-wall') {
        const random = variation(x, y, id);
        place('cave-rock', x, y, yWorld - .045, 1.49, h * (1 + random * .31), 1.14, angle);
        return place('cave-rock', x + (angle ? 0 : .30), y + (angle ? .30 : 0), yWorld - .08,
          .83, h * (.55 + random * .12), .97, angle + .34);
      }
      if (!place(name, x, y, yWorld, 1.025, h, depth, angle)) return false;
      if (across && along && kind !== 'door' && kind !== 'gate' && kind !== 'fence') {
        place('wood-block', x, y, yWorld, depth + .03, h + .07, depth + .03);
      }
      if (kind === 'plaster-wall' || kind === 'brick-wall') {
        place('clay-roof', x, y, yWorld + h, 1.035, .13, depth + .14, angle);
      }
      return true;
    }

    function addBars(id, x, y, yWorld, door) {
      const z = submapWallAxis(id) === 'z';
      const angle = z ? turn : 0;
      for (let i = -2; i <= 2; i++) {
        const shift = i * .196;
        place('iron', x + (z ? 0 : shift), y + (z ? shift : 0), yWorld, .039, 1.32, .039);
      }
      place('iron', x, y, yWorld + 1.24, 1.015, .056, .05, angle);
      place('iron', x, y, yWorld + .08, 1.015, .052, .05, angle);
      if (door) {
        place('iron', x, y, yWorld + .04, .90, .72, .07, angle, 0xbdc5c4);
        place('iron', x, y, yWorld + .74, 1.015, .056, .09, angle);
      }
      return true;
    }

    function addObject(kind, id, x, y, yWorld, rank) {
      if (kind === 'mask' || kind === 'void' || id <= 0) return;
      const random = variation(x, y, id), angle = random > .5 ? 0 : turn;
      const plant = plantModel[kind], furniture = furnitureModel[kind];
      let converted;
      if (map.id === 57 && rank === 1 && (id === 1377 || id === 1378)) {
        place('wood-block', x, y, yWorld, .72, .41, 1, 0, 0x957153);
        place('wood-block', x, y, yWorld + .40, .79, .12, 1.01);
        converted = place('wood-block', x - .33, y, yWorld + .50, .13, .48, 1.01);
      } else if (map.id === 57 && rank === 1 && id === 1438) {
        converted = place('cabinet', x, y, yWorld, .74, .64, .70, angle);
      } else if (plant) {
        const [name, w, h, d] = plant, size = .87 + random * .24;
        const color = kind === 'autumn' ? 0xe6a472 : kind === 'snow-tree' ? 0xd5e8e6 : 0xefefd2;
        converted = place(name, x, y, yWorld, w * size, h * size, d * size, random * 6.283, color);
      } else if (furniture) {
        converted = place(furniture[0], x, y, yWorld, ...furniture.slice(1), angle);
      } else if (wallModel[kind]) {
        converted = addWall(kind, id, x, y, yWorld);
      } else if (kind === 'iron-bars' || kind === 'iron-door') {
        converted = addBars(id, x, y, yWorld, kind === 'iron-door');
      } else if (kind === 'snow-rock' || kind === 'snow-drift') {
        const size = .45 + random * .37, rotation = random * 6.283;
        const dx = (random - .5) * .25, dy = (variation(y, x, id) - .5) * .27;
        if (kind === 'snow-rock') {
          const h = .19 + random * .16;
          place('snow-rock', x + dx, y + dy, yWorld, size, h, size * .81, rotation);
          converted = place('snow-cap', x + dx, y + dy, yWorld + h * .52, size * .89, h * .74, size * .73, rotation);
        } else converted = place('snow-cap', x + dx, y + dy, yWorld, size * 1.12, .064 + random * .05, size * .88, rotation);
      } else if (kind === 'flower-shrub') {
        for (let i = 0; i < 5; i++) {
          const t = variation(x + i * 3, y, id + i), dx = (i % 3 - 1) * .29, dy = i < 3 ? -.26 : .27;
          const name = (id + i) % 5 < 2 ? 'garden-flower-yellow' : 'garden-flower-red';
          converted = place(name, x + dx, y + dy, yWorld, .67, .43 + .29 * t, .65, t * 6.283) || converted;
        }
      } else if (kind === 'cliff') {
        converted = place('cave-rock', x, y, yWorld, 1.28, 1.78 + random * .65, 1.30, random * 6.283, 0xccbdab);
      } else if (kind === 'stairs' || kind === 'platform') {
        converted = place('step', x, y, yWorld, 1.005, kind === 'stairs' ? .18 : .11, 1.005);
      } else if (kind === 'water' || kind === 'swamp') {
        addFloor(kind, x, y, yWorld + .015, id);
        converted = true;
      }
      if (converted) modeled++;
      else fallback(id, x, y, yWorld, rank);
    }

    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const index = tileAt(x, y), tile = picture(layers.earth[index]), earth = submapEarthKind(tile);
      const kind = walls[index], yWorld = heightAt(x, y);
      if (kind === 'mask') maskCells++;
      if (tile > 0 && earth !== 'void' && !(cave && kind === 'mask')) {
        addFloor(earth, x, y, yWorld, tile);
        coverage.set(earth, (coverage.get(earth) ?? 0) + 1);
      }
      const id = picture(layers.building[index]);
      const left = x > 0 ? picture(layers.building[index - 1]) : 0;
      const special = storyTile?.(id, x, y, yWorld, left);
      if (special) {
        if (special instanceof Object3D) decor.addChild(special);
        modeled++;
      } else addObject(kind, id, x, y, yWorld, 1);
      const decoration = picture(layers.decoration[index]);
      if (decoration > 0) addObject(submapDecorationKind(decoration), decoration, x, y, elevation(layers.decorationHeight[index]), 4);
    }

    terrain.build(map, tiles, coverage, cave);
    for (const [name, entries] of placements) {
      const { parts, dimensions, offset } = templates.get(name);
      const parent = blocking.has(name) ? blockers : decor;
      if (motion[name]) vegetationInstances += entries.length;
      mat4Compose(origin, offset, axis, unit);
      for (const source of parts) {
        const material = plantMaterial(name, source, entries[0].h);
        const batch = parent.addChild(new InstancedMesh3D(source.geometry, material, entries.length));
        batch.name = name;
        for (const [i, item] of entries.entries()) {
          const { x, y, yWorld, w, h, d, angle, color } = item;
          mat4Compose(position, [x, yWorld, y], [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)],
            [w / dimensions[0], h / dimensions[1], d / dimensions[2]]);
          mat4Multiply(matrix, position, origin);
          mat4Multiply(matrix, matrix, source.matrixWorld);
          batch.setMatrixAt(i, matrix);
          if (color !== 0xffffff) {
            colorFromHex(tint, color);
            batch.setColorAt(i, tint[0], tint[1], tint[2]);
          }
        }
      }
    }
    layoutRevision++;
  }

  return { root, floor, blockers, setMap, heightAtActor,
    get cave() { return cave; }, get modeled() { return modeled; }, get retained() { return retained; },
    get omitted() { return omitted; }, get maskCells() { return maskCells; }, get floorCells() { return floorCells; },
    get layoutRevision() { return layoutRevision; },
    get storyTiles() { return decor.children.filter(node => node.name.startsWith('story-prop-'))
      .map(node => node.name.slice('story-prop-'.length)).join(','); },
    get vegetationInstances() { return vegetationInstances; },
    get windActive() { return vegetationInstances > 0 && !reducedMotion.matches; },
    updateWind(elapsedMs) {
      const time = (elapsedMs % 120000) / 1000;
      const enabled = Number(!reducedMotion.matches);
      for (const materials of wind.values()) for (const material of [materials].flat()) {
        material.shader.uniforms[0] = time;
        material.shader.uniforms[5] = enabled;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearDecor();
      terrain.dispose();
      root.removeFromParent();
      for (const resource of owned) resource.dispose();
    },
  };
}
