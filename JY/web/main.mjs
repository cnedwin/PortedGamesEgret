import { Bitmap, Sprite, copyImageData2DPixels, createAssetRef, createAssetType, createEngineForProfile, createImageData2D, createTexture, isTexture } from '@egret/engine';
import { createBrowserKeyboardInput } from '@egret/engine/web/keyboard';
import { createTextRasterCache } from '@egret/engine/text';
import { createCanvasTextRasterProvider } from '@egret/engine/web/text';
import { createSharedWebGL2Host } from '@egret/engine/webgl2';
import { createOpeningDialogue } from './opening-dialogue.mjs';
import { loadOpening, openingEventId, playOpening } from './opening-event.mjs';
import { createBattleView } from './battle-view.mjs';
import { createBattleMenu } from './battle-menu.mjs';
import { attachBattleControls } from './jyx2/ui/battle-controls.mjs';
import { createBattleMusic } from './battle-music.mjs';
import { autoSlot, createSaveSlot, manualSlots } from './save-slot.mjs';
import { createClassicBattle, resolveClassicTeam } from './classic-battle.mjs';
import { canUseGear } from './battle-progression.mjs';
import { loadTrainer, playTrainer, trainerEventId } from './trainer-event.mjs';
import { modifySceneEvent } from './cifa-opening.mjs';
import { parseRecruitScript, runRecruitScript } from './cifa-recruit.mjs';
import { parseGameScript, runGameScript } from './cifa-game.mjs';
import { applyScenePatch, playGameEvent } from './game-events.mjs';
import { showWorldMenu } from './world-menu.mjs';
import { attachGamepadInput } from './gamepad-input.mjs';
import { nativeSaveRequest, pickNativeSave, readPreferences, returnToTitle, showTitle } from './jyx2/ui/game-shell.mjs';
import { findTilePath, screenToTile } from './kys-navigation.mjs';
import { createSceneAtmosphere } from './scene-atmosphere.mjs';
import { hasJyx2Scene, loadJyx2Scene } from './jyx2/scene/home.mjs';
import { loadActorArt } from './jyx2/actors/actor-art.mjs';
import { nativeBattleName } from './jyx2/scene/native-battle-fields.mjs';

const canvas = document.querySelector('#game');
const battleGrid = document.querySelector('#battle-grid');
const sceneName = document.querySelector('#scene-name');
const coordinates = document.querySelector('#coordinates');
const hint = document.querySelector('#hint');
const notice = document.querySelector('#notice');
const battleResultPanel = document.querySelector('#battle-result');
const battleResultText = document.querySelector('#battle-result-text');
const battleContinue = document.querySelector('#battle-continue');
const marker = document.querySelector('#event-marker');
const menuToggle = document.querySelector('#open-menu');
const exploreControls = document.querySelector('#explore-controls');
const exploreDpad = document.querySelector('#explore-dpad');
const mapInteract = exploreControls.querySelector('[data-map-command="Enter"]');
const touchExploration = matchMedia('(pointer: coarse)');
const battleMenuPanel = document.querySelector('#battle-menu');
const moves = new Map([
  ['ArrowUp', [0, -1, 0]], ['KeyW', [0, -1, 0]],
  ['ArrowRight', [1, 0, 1]], ['KeyD', [1, 0, 1]],
  ['ArrowLeft', [-1, 0, 2]], ['KeyA', [-1, 0, 2]],
  ['ArrowDown', [0, 1, 3]], ['KeyS', [0, 1, 3]],
]);
const facingOffsets = [[0, -1], [1, 0], [-1, 0], [0, 1]];
const facingKeys = ['ArrowUp', 'ArrowRight', 'ArrowLeft', 'ArrowDown'];
const battleControls = new Set([...moves.keys(), 'KeyM', 'KeyI', 'KeyL', 'KeyQ', 'KeyF', 'KeyB', 'KeyT', 'KeyV', 'KeyR', 'Tab']);
const battleHint = () => touchExploration.matches
  ? '點選移動、武學或其他回合指令'
  : '選擇移動、武學或其他指令 · 滑鼠選格，或用方向鍵與 Enter';
const normalizeEnter = code => code === 'NumpadEnter' ? 'Enter' : code;
const isConfirm = code => normalizeEnter(code) === 'Enter' || code === 'Space';
const water = new Set([179, 180, 181, 261, 511, 662, 663, 664, 665, 674]);
const pictureId = raw => Math.trunc(raw / 2);
const animates = event => event && event.beginPic >= 0 && event.endPic > event.beginPic;
const contactDepth = (x, y) => (x + y) * 1024 + x;
const worldRadius = 34;
const homeScene = 70;
const recruitScene = 61;
const heluoScene = 1;
const previewLocations = new Map([
  ['inn', { id: recruitScene, x: 23, y: 49, facing: 2 }],
  ['heluo', { id: heluoScene, x: 23, y: 53, facing: 0 }],
  ['coast', { id: 'world', x: 374, y: 224, facing: 1 }],
  ['hufei', { id: 0, x: 24, y: 20, facing: 0 }],
]);
const recruitEvents = new Set([476, 477]);
const recruitHead = 53;
const innPeople = [
  { key: 'duan-yu', slot: 0, role: 53, direction: 1, pose: 'sit', visualOffset: [-.2942, -.3647] },
  { key: 'waiter', slot: 3, role: 'waiter', direction: 1 },
  { key: 'innkeeper', slot: 4, role: 'innkeeper', direction: 3 },
  { key: 'patron-1', slot: 1, role: 'patron', direction: 0, variant: 0, pose: 'sit' },
  { key: 'patron-2', slot: 2, role: 'patron', direction: 2, variant: 1, pose: 'sit' },
  { key: 'patron-3', slot: 6, role: 'patron', direction: 1, variant: 2, pose: 'sit' },
  { key: 'patron-4', slot: 7, role: 'patron', direction: 2, variant: 3, pose: 'sit' },
];
const homePeople = [{ key: 'opening-doll', slot: 1, role: 'doll', anchor: 'doll', direction: 3 }];
const heluoPeople = [
  { key: 'heluo-keeper', slot: 0, role: 'innkeeper', direction: 3 },
  { key: 'heluo-waiter', slot: 1, role: 'waiter', direction: 1 },
  { key: 'weixiaobao', slot: 16, role: 'weixiaobao', direction: 3 },
  ...[[3, 0], [4, 3], [5, 3], [6, 0], [11, 0], [12, 3], [13, 3], [14, 0]].map(([slot, direction], index) => ({
    key: 'heluo-patron-' + slot, slot, role: 'patron', direction, variant: index < 4 ? 1 : 3, pose: 'sit',
  })),
];
const scene3dKeys = new Map([[homeScene, 'home'], [recruitScene, 'inn'], [heluoScene, 'heluo']]);
const scene3dPeople = new Map([[homeScene, homePeople], [recruitScene, innPeople], [heluoScene, heluoPeople]]);
const loadNativeSubmapView = () => import('./jyx2/scene/native-submap-view.mjs').then(module => module.createNativeSubmapView);
const nativeSceneViews = new Map([
  ['world', () => import('./jyx2/scene/native-world-view.mjs').then(module => module.createNativeWorldView)],
  [recruitScene, () => import('./jyx2/scene/native-inn-view.mjs').then(module => module.createNativeInnView)],
  [heluoScene, () => import('./jyx2/scene/native-heluo-view.mjs').then(module => module.createNativeHeluoView)],
  [homeScene, () => import('./jyx2/scene/native-home-view.mjs').then(module => module.createNativeHomeView)],
]);
const isWorldWater = id => id === 419 || id >= 179 && id <= 181 || id >= 253 && id <= 335 || id >= 508 && id <= 511;
const fits = (map, x, y) => x >= 0 && y >= 0 && x < map.width && y < map.height;
const samePoint = (point, x, y) => point?.[0] === x && point?.[1] === y;

async function json(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`读取 ${path} 失败（${response.status}）`);
  return response.json();
}

function unpackMap(map) {
  if (map.encoding !== 'i16le-base64') throw new Error('未知的地图编码');
  const count = map.width * map.height;
  const layers = Object.fromEntries(Object.entries(map.layers).map(([name, encoded]) => {
    const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
    if (bytes.byteLength !== count * 2) throw new Error(`图层长度不符：${name}`);
    const view = new DataView(bytes.buffer);
    return [name, Int16Array.from({ length: count }, (_, index) => view.getInt16(index * 2, true))];
  }));
  return { ...map, layers };
}

function mapObjects(scene, scale, project) {
  const { earth, building, decoration, eventIndex, buildingHeight, decorationHeight } = scene.layers;
  const ground = [];
  const objects = [];
  for (let y = 0; y < scene.height; y++) {
    for (let x = 0; x < scene.width; x++) {
      const index = x + y * scene.width;
      const [px, py] = project(x, y);
      const depth = contactDepth(x, y);
      function add(list, raw, height, rank, event) {
        const id = pictureId(raw);
        if (id > 0) list.push({ id, event, x, y, px, py: py - height * scale, depth, rank });
      }
      const elevation = buildingHeight[index];
      // The original scene caches low ground separately. Raised ground is drawn in the depth pass.
      add(elevation <= 2 ? ground : objects, earth[index], 0, 0);
      add(objects, building[index], elevation, 1);
      const event = scene.events[eventIndex[index]];
      add(objects, event?.currentPic ?? 0, elevation, 3, event);
      add(objects, decoration[index], decorationHeight[index], 4);
    }
  }
  ground.sort((a, b) => a.depth - b.depth);
  objects.sort((a, b) => a.depth - b.depth || a.rank - b.rank);
  return { ground, objects };
}

function mapArtIds(map) {
  return [...map.ground, ...map.objects].flatMap(({ id, event }) => {
    if (!animates(event)) return [id];
    const first = pictureId(event.beginPic), last = pictureId(event.endPic);
    return [id, ...Array.from({ length: last - first + 1 }, (_, index) => first + index)];
  });
}

function worldObjects(scene, center, project, available) {
  const ground = [];
  const objects = [];
  for (let y = Math.max(0, center.y - worldRadius); y <= Math.min(scene.height - 1, center.y + worldRadius); y++) {
    for (let x = Math.max(0, center.x - worldRadius); x <= Math.min(scene.width - 1, center.x + worldRadius); x++) {
      const index = x + y * scene.width;
      const [px, py] = project(x, y);
      const depth = contactDepth(x, y);
      const land = pictureId(scene.layers.earth[index]);
      const surface = pictureId(scene.layers.surface[index]);
      const building = pictureId(scene.layers.building[index]);
      if (land > 0 && available.has(land)) ground.push({ id: land, px, py, depth, rank: 0 });
      if (surface > 0 && available.has(surface)) ground.push({ id: surface, px, py, depth, rank: 1 });
      if (building > 0 && available.has(building)) objects.push({ id: building, px, py, x, y, depth, rank: 1 });
    }
  }
  ground.sort((a, b) => a.depth - b.depth || a.rank - b.rank);
  return { ground, objects };
}

function orderWorldBuildings(map, textures, scale) {
  // MainScene offsets building depth by its width and projected foot position.
  for (const item of map.objects) {
    const { region, dy } = textures.get(item.id);
    const widthInTiles = Math.trunc((region.width + 36 * scale - 1) / (36 * scale));
    const heightOffset = Math.trunc((dy - region.height + 1) / Math.trunc(9 * scale / 2));
    item.depth = contactDepth(item.x, item.y) - (widthInTiles + heightOffset) * 1024;
  }
  map.objects.sort((a, b) => a.depth - b.depth);
  return map;
}

async function loadArt(group, ids, red = false, atlasSize = 1024) {
  const records = [];
  try {
    for (let start = 0; start < ids.length; start += 12) {
      const batch = await Promise.allSettled(ids.slice(start, start + 12).map(async id => {
        const response = await fetch(`/art/${group}/${id}.png`);
        if (!response.ok) throw new Error(`贴图 ${group}/${id} 读取失败（${response.status}）`);
        return {
          id,
          dx: Number(response.headers.get('X-Kys-Anchor-X')),
          dy: Number(response.headers.get('X-Kys-Anchor-Y')),
          bitmap: await createImageBitmap(await response.blob()),
        };
      }));
      for (const result of batch) if (result.status === 'fulfilled') records.push(result.value);
      const failure = batch.find(result => result.status === 'rejected');
      if (failure) throw failure.reason;
    }
    return makeAtlas(records, red, atlasSize);
  } finally {
    for (const record of records) record.bitmap.close();
  }
}

function makeAtlas(records, red, size) {
  const textures = new Map();
  let rows = [];
  let x = 0, y = 0, rowHeight = 0;
  function writePage(entries, width, height) {
    const page = document.createElement('canvas');
    page.width = width;
    page.height = height;
    const context = page.getContext('2d', { willReadFrequently: true });
    for (const { record, region } of entries) context.drawImage(record.bitmap, region.x, region.y);
    const rgba = context.getImageData(0, 0, page.width, page.height);
    if (red) for (let index = 0; index < rgba.data.length; index += 4) {
      rgba.data[index + 1] = 0;
      rgba.data[index + 2] = 0;
    }
    const image = createImageData2D({ width: page.width, height: page.height, pixels: new Uint8Array(rgba.data) });
    for (const { record, region } of entries) textures.set(record.id, { dx: record.dx, dy: record.dy, image, region });
  }
  function flush() {
    if (!rows.length) return;
    writePage(rows, size, y + rowHeight);
    rows = [];
    x = 0;
    y = 0;
    rowHeight = 0;
  }
  for (const record of records.sort((a, b) => b.bitmap.height - a.bitmap.height)) {
    const { width, height } = record.bitmap;
    if (width > size || height > size) {
      writePage([{ record, region: { x: 0, y: 0, width, height } }], width, height);
      continue;
    }
    if (x + width > size) {
      y += rowHeight;
      rowHeight = 0;
      x = 0;
    }
    if (y + height > size) flush();
    rows.push({ record, region: { x, y, width, height } });
    x += width;
    rowHeight = Math.max(rowHeight, height);
  }
  flush();
  return textures;
}

function bakeGround(items, textures, nextId) {
  // Native SubScene composites low ground below the depth pass. Clip that same
  // painter order into disjoint pages so a busy inn fits the shared-frame view budget.
  const size = 256;
  const sources = new Map();
  const pages = new Map();
  for (const item of items) {
    const texture = textures.get(item.id);
    if (!texture) continue;
    const { image, region, dx, dy } = texture;
    let source = sources.get(image);
    if (!source) {
      source = document.createElement('canvas');
      source.width = image.width;
      source.height = image.height;
      const pixels = new Uint8ClampedArray(copyImageData2DPixels(image).buffer);
      source.getContext('2d').putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
      sources.set(image, source);
    }
    const left = Math.round(item.px - dx);
    const top = Math.round(item.py - dy);
    for (let y = Math.floor(top / size) * size; y < top + region.height; y += size) {
      for (let x = Math.floor(left / size) * size; x < left + region.width; x += size) {
        const key = `${x},${y}`;
        let page = pages.get(key);
        if (!page) {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = size;
          page = { x, y, context: canvas.getContext('2d', { willReadFrequently: true }) };
          pages.set(key, page);
        }
        page.context.drawImage(source, region.x, region.y, region.width, region.height,
          left - x, top - y, region.width, region.height);
      }
    }
  }
  return Array.from(pages.values(), ({ x, y, context }) => {
    const id = nextId();
    const pixels = new Uint8Array(context.getImageData(0, 0, size, size).data.buffer);
    const image = createImageData2D({ width: size, height: size, pixels });
    textures.set(id, { image, region: { x: 0, y: 0, width: size, height: size }, dx: 0, dy: 0 });
    return { id, px: x, py: y };
  });
}

function describeError(error) {
  const messages = [];
  for (let cause = error; cause instanceof Error && messages.length < 4; cause = cause.cause) messages.push(cause.message);
  return messages.join(' / ') || String(error);
}

function initialProgress(initial) {
  return {
    location: { id: initial.sceneId, x: initial.x, y: initial.y, facing: initial.base?.facing ?? 1 },
    mainX: initial.base.mainX,
    mainY: initial.base.mainY,
    inventory: Object.entries(initial.inventory).map(([id, count]) => [Number(id), count]),
    roleState: [],
    party: initial.base.party.filter(id => id >= 0),
    scenePatches: [],
    openingDone: false,
    openingEvents: [],
  };
}

async function start() {
  const settings = new URLSearchParams(window.location.search);
  const preferences = readPreferences();
  const initial = await json('/api/start');
  const previewName = settings.get('preview');
  const baseline = initialProgress(initial);
  const preview = previewName === 'home' && baseline.location.id === homeScene
    ? baseline.location : previewLocations.get(previewName);
  const autoSave = createSaveSlot(preview ? `${initial.saveIdentity}:${previewName}-preview` : initial.saveIdentity);
  let save = await autoSave.read();
  if (preview) baseline.location = { ...preview };
  if (!preview && (settings.get('title') === '1' || !save && settings.get('play') !== '1')) {
    save = await showTitle({ initial, baseline, autoSave, save, preferences, search: settings });
  }
  const requestedStyle = settings.get('visual');
  const visualStyle = ['jyx2', 'classic', 'enhanced'].includes(requestedStyle) ? requestedStyle : preferences.visual;
  document.body.dataset.visual = visualStyle === 'classic' ? 'classic' : 'enhanced';
  document.body.dataset.art = visualStyle;
  const catalog = await json('/api/catalog');
  const game = {
    initial, baseline, autoSave, save, catalog, visualStyle, sound: preferences.sound,
    programs: new Map(), sceneStates: new Map(), openingDone: save?.openingDone ?? false,
    mainX: save?.mainX ?? initial.base.mainX, mainY: save?.mainY ?? initial.base.mainY,
    inventory: new Map(save?.inventory ?? baseline.inventory),
    roleState: save?.roleState ?? [],
    party: save?.party ?? baseline.party,
    scenePatches: new Map(save?.scenePatches ?? []),
  };
  catalog.eventIds = new Set(catalog.eventIds);
  catalog.headIds = new Set(catalog.headIds);
  catalog.leaveEvents = new Map(catalog.leaveEvents);
  showSave(game, save ? 'restored' : 'idle');
  canvas.dataset.recruit = game.scenePatches.has(recruitScene) ? 'restored' : 'idle';
  if (game.openingDone) canvas.dataset.opening = 'complete';
  await openMap(game, save?.location ?? baseline.location);
}

async function sceneFor(game, id) {
  if (!game.sceneStates.has(id)) {
    const scene = unpackMap(await json(`/api/scene/${id}`));
    if (id === game.initial.sceneId) game.save?.openingEvents.forEach((event, index) => Object.assign(scene.events[index], event));
    applyScenePatch(scene, game.scenePatches.get(id));
    game.sceneStates.set(id, scene);
  }
  return game.sceneStates.get(id);
}

function showSave(game, phase) {
  Object.assign(canvas.dataset, {
    ...(phase ? { trainer: phase } : {}),
    saveRevision: game.save?.revision ?? 0,
    wins: game.inventory.get(198) ?? 0,
    losses: game.inventory.get(199) ?? 0,
    party: game.party.join(','),
  });
}

async function openMap(game, destination) {
  const { initial, catalog } = game;
  const isWorld = destination.id === 'world';
  const groupName = isWorld ? 'mmap' : 'smap';
  canvas.dataset.phase = 'loading';
  notice.hidden = false;
  notice.textContent = '正在读取原作地图与贴图…';
  menuToggle.disabled = true;
  const scene = isWorld ? (game.world ??= unpackMap(await json('/api/world'))) : await sceneFor(game, destination.id);
  const width = initial.config?.renderWidth ?? 640;
  const height = initial.config?.renderHeight ?? 360;
  const scale = initial.config?.tileScale ?? 1;
  const viewKey = isWorld ? 'world' : scene3dKeys.get(scene.id) ?? 'submap';
  const viewAttribute = viewKey && `${viewKey}View`;
  const sceneActors = scene3dPeople.get(scene.id) ?? [];
  const viewSettings = new URLSearchParams(window.location.search);
  const wantsMap3d = game.visualStyle === 'jyx2' && viewSettings.get(viewKey) !== '2d';
  const loadNativeView = nativeSceneViews.get(isWorld ? 'world' : scene.id) ?? loadNativeSubmapView;
  const project = (x, y) => [(x - y) * 18 * scale, (x + y) * 9 * scale];
  const available = isWorld ? (game.worldArt ??= new Set(await json('/api/art/mmap')))
    : (game.submapArt ??= new Set(await json('/api/art/smap')));
  const scenes = game.scenes ??= await json('/api/scenes');
  let map = isWorld ? worldObjects(scene, destination, project, available) : mapObjects(scene, scale, project);
  const opening = !isWorld && initial.config.useScript && scene.events.some(event => event.event3 === openingEventId)
    ? (game.opening ??= await loadOpening()) : undefined;
  const hasTrainer = !isWorld && initial.config.useScript && scene.events.some(event => event.event1 === trainerEventId);
  const hasRecruit = scene.id === recruitScene && initial.config.useScript && scene.events.some(event => recruitEvents.has(event.event1));
  const portraitIds = [...new Set([...(opening?.portraits ?? []), ...(hasTrainer ? [114] : []), ...(hasRecruit ? [0, recruitHead] : [])])];
  const portraitGroup = { classic: 'head', enhanced: 'portrait', jyx2: 'jyx2-portrait' }[game.visualStyle];
  const itemGroup = game.visualStyle === 'jyx2' ? 'jyx2-item' : 'item';
  const itemIconUrl = id => `/art/${itemGroup}/${id}.png`;
  const mapActorsPromise = game.visualStyle === 'jyx2'
    ? loadActorArt(hasRecruit ? [0, recruitHead] : [0], scale, ['idle', 'walk'])
    : undefined;
  const ids = isWorld ? [...available] : [...new Set([
    ...mapArtIds(map),
    ...Array.from({ length: 28 }, (_, index) => 2501 + index),
    ...(opening?.pictures ?? []),
  ])].filter(id => available.has(id));
  sceneName.textContent = isWorld ? '江湖大地图' : scene.name;
  notice.textContent = '正在载入原作地形、建筑和人物贴图…';
  const useJyx2Scene = game.visualStyle === 'jyx2' && hasJyx2Scene(scene.id);
  const [textures, portraits, sceneArt] = await Promise.all([
    isWorld ? (game.worldTextures ??= loadArt(groupName, ids)) : loadArt(groupName, ids, false, useJyx2Scene ? 256 : 1024),
    portraitIds.length ? loadArt(portraitGroup, portraitIds) : undefined,
    useJyx2Scene ? loadJyx2Scene(scene.id, scale).catch(error => {
      console.warn(`${scene.name} JYX2 場景載入失敗，沿用原作貼圖`, error);
      return undefined;
    }) : undefined,
  ]);
  const wantsGpuGround = !isWorld && !wantsMap3d && !sceneArt
    && new URLSearchParams(window.location.search).get('ground') === 'gpu';
  let gpuGroundSource = wantsGpuGround ? map.ground : undefined;
  let groundId = -2;
  const allocateGroundId = () => groundId--;
  if (isWorld) orderWorldBuildings(map, textures, scale);
  else {
    map.ground = bakeGround(map.ground, textures, allocateGroundId);
    ids.push(...map.ground.map(item => item.id));
  }
  if (sceneArt) for (const [id, art] of sceneArt.textures) {
    textures.set(id, art);
    ids.push(id);
  }
  function visualObjects(source) {
    return sceneArt ? [...source.objects.filter(item => !sceneArt.replaces(item)), ...sceneArt.objects]
      .sort((a, b) => a.depth - b.depth || a.rank - b.rank) : source.objects;
  }
  function visualGround(source) {
    return sceneArt ? [...source.ground, ...sceneArt.ground, ...source.objects.filter(item => item.rank === 0 && sceneArt.replaces(item))]
      : source.ground;
  }
  let mapObjectsToDraw = visualObjects(map);
  let mapGroundToDraw = visualGround(map);
  const mapActors = await mapActorsPromise;
  if (mapActors) for (const [id, art] of mapActors.textures) {
    textures.set(id, art);
    ids.push(id);
  }

  canvas.width = width;
  canvas.height = height;
  const outputAlpha = game.visualStyle === 'jyx2' ? 'premultiplied' : 'opaque';
  const host = createSharedWebGL2Host({ canvas, pixelRatio: wantsMap3d ? 3 : 1, outputAlpha });
  const engine = await createEngineForProfile({ host }, 'egret.shared-frame2d/1');
  const scope = engine.createScope();
  let map3dView;
  const type = createAssetType('original-map-art', isTexture);
  engine.assets.register(type, {
    async load(ref) {
      const { image, region } = textures.get(Number(ref.id.slice('map:'.length)));
      return createTexture(image, region);
    },
    dispose(texture) { texture.dispose(); },
  });
  const leasesById = new Map();
  async function acquireMapArt(needed, owner = scope) {
    for (let offset = 0; offset < needed.length; offset += 128) {
      const batch = needed.slice(offset, offset + 128);
      const group = engine.createAssetGroup(owner, batch.map(id => createAssetRef(type, `map:${id}`)));
      const leases = await group.ready;
      batch.forEach((id, index) => leasesById.set(id, leases[index]));
    }
  }
  let groundScope = scope.use(engine.createScope());
  let gpuGround;
  let buildingGpuGround = false;
  let restoringGpuGround = false;
  await acquireMapArt(ids.filter(id => id >= 0));
  await acquireMapArt(ids.filter(id => id < 0), groundScope);
  const portraitsById = new Map();
  const itemType = createAssetType('original-reward-item', isTexture);
  if (!isWorld) engine.assets.register(itemType, {
    async load(ref) {
      const id = Number(ref.id.slice('item:'.length));
      const { image, region } = (await loadArt(itemGroup, [id])).get(id);
      return createTexture(image, region);
    },
    dispose(texture) { texture.dispose(); },
  });
  let loadPortrait;
  {
    const portraitType = createAssetType('opening-portraits', isTexture);
    engine.assets.register(portraitType, {
      async load(ref) {
        const id = Number(ref.id.slice('head:'.length));
        const { image, region } = portraits?.get(id) ?? (await loadArt(portraitGroup, [id])).get(id);
        return createTexture(image, region);
      },
      dispose(texture) { texture.dispose(); },
    });
    loadPortrait = async id => {
      if (!catalog.headIds.has(id)) return undefined;
      if (!portraitsById.has(id)) {
        const group = engine.createAssetGroup(scope, [createAssetRef(portraitType, `head:${id}`)]);
        portraitsById.set(id, group.ready.then(([lease]) => lease));
      }
      return portraitsById.get(id);
    };
    await Promise.all(portraitIds.map(loadPortrait));
  }
  const root = engine.stage.addChild(scope.use(new Sprite()));
  const ground = root.addChild(scope.use(new Sprite()));
  const objects = root.addChild(scope.use(new Sprite()));
  const atmosphere = scene.id === 70 && game.visualStyle !== 'classic'
    ? await createSceneAtmosphere({ engine, scope, root, project, scale, outputAlpha }) : undefined;
  const initialFacing = destination.facing;
  const player = { id: 2501 + initialFacing * 7, rank: 2 };
  const keyboard = createBrowserKeyboardInput({ engine, scope });
  keyboard.registerTarget({ id: 'map', target: root });

  let x = destination.x, y = destination.y;
  let facing = initialFacing;
  let stride = 0;
  let walkingSince = 0;
  let lastWalk = -Infinity;
  let drawnHeroArt;
  let drawnRecruitArt;
  let recruitArt;
  let move;
  let held;
  let pointerWalk;
  let dirty = true;
  let request = 0;
  let closing = false;
  let openingActive = false;
  let trainerActive = false;
  let recruitActive = false;
  let eventActive = false;
  let worldMenuActive = false;
  let eventEnded = Boolean(game.save?.flags?.finished);
  let cameraOverride;
  let hiddenPlayer = eventEnded;
  let worldCenter = destination;
  const freeMapNodes = [];
  let battle;
  const menu = createBattleMenu(battleMenuPanel, canvas, { portraitUrl: id => `/art/${portraitGroup}/${id}.png`, itemIconUrl });
  const music = createBattleMusic(game.sound);
  let mapTrack = isWorld ? game.worldMusic ?? game.save?.flags?.mainMusic : scene.entranceMusic;
  let mapMusicStarted = false;
  let animationTick = 0;
  let lastAnimation = 0;
  let musicProbe = 0;
  let musicActive = false;
  let forcedPlayerPicture;
  const openingPoses = new Map();
  const listeners = new AbortController();
  attachBattleControls(document.querySelector('#battle-controls'), canvas, {
    signal: listeners.signal,
    getState: () => battle?.model.state,
    getModel: () => battle?.model,
    press(code) { if (battle && !menu.active) battleKeyDown(code, false); },
  });
  const frameWaiters = [];
  delete canvas.dataset.blocked;

  function requestFrame() { dirty = true; }

  function dropGpuGround(error) {
    gpuGround?.close();
    gpuGround = undefined;
    gpuGroundSource = undefined;
    canvas.dataset.groundMode = 'canvas';
    for (const key of ['groundLayerBuilds', 'groundLayerReused', 'groundLayerResidentBytes', 'groundLayerGeneration']) {
      delete canvas.dataset[key];
    }
    if (error && !closing) console.warn('GPU 地面圖層無法使用，沿用原作地面', error);
  }

  async function rebuildGpuGround(items) {
    gpuGroundSource = items;
    buildingGpuGround = true;
    try {
      await gpuGround.update(items);
      if (closing) return;
      const totals = gpuGround.totals;
      Object.assign(canvas.dataset, { groundMode: 'gpu', groundLayerBuilds: totals.builds,
        groundLayerReused: totals.reused, groundLayerResidentBytes: host.getSharedLayerStatus().residentBytes,
        groundLayerGeneration: host.getStatus().generation });
    } catch (error) {
      if (!closing && !restoringGpuGround) dropGpuGround(error);
    } finally {
      buildingGpuGround = false;
      requestFrame();
    }
  }

  function startMapMusic() {
    if (mapMusicStarted || !Number.isInteger(mapTrack) || mapTrack < 1) return;
    mapMusicStarted = true;
    void music.play(mapTrack).catch(() => {});
  }

  function presentFrame() {
    if (closing) return Promise.reject(new DOMException('Map closed', 'AbortError'));
    requestFrame();
    return new Promise((resolve, reject) => frameWaiters.push({ resolve, reject }));
  }

  const cache = scope.use(createTextRasterCache(engine.assets, { provider: createCanvasTextRasterProvider() }));
  const speakerNames = new Map();
  for (const role of catalog.roles) {
    if (!role?.name) continue;
    if (speakerNames.has(role.headId)) speakerNames.set(role.headId, undefined);
    else speakerNames.set(role.headId, role.name);
  }
  speakerNames.set(114, '黑帝斯');
  const dialogue = createOpeningDialogue({
    engine, scope, cache, width, height, requestFrame, presentFrame,
    density: wantsMap3d ? 3 : 1,
    bottomDocked: () => Boolean(map3dView),
    loadPortrait, speakerName: head => speakerNames.get(head),
    onPage({ text, head, style, voice, page, pages }) {
      Object.assign(canvas.dataset, { talkText: text, talkHead: head, talkStyle: style, talkVoice: voice, talkPage: page, talkPages: pages });
      if (openingActive) canvas.dataset.opening = 'talk';
      updateExploreControls();
      hint.textContent = `${touchExploration.matches ? '點畫面或按繼續' : '點擊畫面 / Enter 繼續'} · ${page}/${pages}`;
    },
  });

  const indexOf = (x, y) => x + y * scene.width;
  const eventAt = (x, y) => scene.events?.[scene.layers.eventIndex[indexOf(x, y)]];
  function facingEvent(field = 'event1') {
    const [dx, dy] = facingOffsets[facing];
    if (isWorld || !fits(scene, x + dx, y + dy)) return undefined;
    const slot = scene.layers.eventIndex[indexOf(x + dx, y + dy)];
    const id = scene.events[slot]?.[field];
    if (initial.config.useScript && catalog.eventIds.has(id) && id > 0) return { id, slot };
  }
  const elevationAt = (x, y) => isWorld ? 0 : scene.layers.buildingHeight[indexOf(x, y)];
  function canEnter(entry) {
    const condition = game.scenePatches.get(entry.id)?.entranceCondition ?? entry.entranceCondition;
    const fast = condition === 2 && game.party.some(id => (game.roleState.find(role => role.id === id)?.speed ?? catalog.roles[id].speed) >= 70);
    return condition === 0 || fast;
  }
  const entranceAt = (tx, ty) => scenes.find(entry => canEnter(entry) && entry.worldEntrances.some(point => samePoint(point, tx, ty)));
  function canWalk(tx, ty) {
    if (!fits(scene, tx, ty)) return false;
    const index = indexOf(tx, ty);
    if (isWorld) {
      const bx = scene.layers.buildx[index], by = scene.layers.buildy[index];
      if (!fits(scene, bx, by)) return true;
      const tile = pictureId(scene.layers.building[indexOf(bx, by)]);
      return tile <= 0 || !available.has(tile);
    }
    const tile = scene.layers.building[index];
    return !(tile > 0 && tile < 9999) && !water.has(pictureId(scene.layers.earth[index])) && !eventAt(tx, ty)?.cannotWalk;
  }

  function updateExploreControls() {
    const reading = openingActive || trainerActive || recruitActive || eventActive;
    const canMove = !reading && !worldMenuActive && !eventEnded && !battle;
    exploreDpad.hidden = !canMove;
    mapInteract.textContent = reading ? '繼續' : '對話';
  }

  function showCell() {
    updateExploreControls();
    canvas.dataset.x = String(x);
    canvas.dataset.y = String(y);
    coordinates.textContent = `格点 ${x} · ${y}`;
    const event = eventAt(x, y);
    marker.textContent = event?.event3 > 0 ? `经过事件 ${event.event3}` : '';
    hint.textContent = eventEnded ? '劇情完成 · 在江湖選單可返回主選單'
      : facingEvent() ? (touchExploration.matches ? '點「對話」與面前人物交談' : 'Enter / 空格與 NPC 對話')
      : scene.exits?.some(([ex, ey]) => x === ex && y === ey) ? '已到达原作出口'
      : touchExploration.matches ? '點選地圖尋路，或使用方向鍵移動'
        : isWorld && map3dView ? '方向鍵 / WASD 移動 · 點擊地名進入' : '方向鍵或 WASD 移動';
  }

  function maybePlayOpening() {
    if (!opening || openingActive || game.openingDone || eventAt(x, y)?.event3 !== openingEventId) return false;
    openingActive = true;
    menuToggle.disabled = true;
    held = move = undefined;
    updateExploreControls();
    canvas.dataset.opening = 'running';
    canvas.dataset.animationFrames = '0';
    const slot = scene.layers.eventIndex[indexOf(x, y)];
    const view = {
      requestFrame,
      presentFrame,
      talk: options => dialogue.talk(options),
      command(name, index) {
        canvas.dataset.opening = 'running';
        canvas.dataset.command = String(index);
        canvas.dataset.commandName = name;
      },
      animationStart() {
        canvas.dataset.opening = 'animation';
        hint.textContent = '原作動畫播放中';
      },
      animationFrame(count, picture) {
        canvas.dataset.animationPicture = String(picture);
        canvas.dataset.animationFrames = String(count);
      },
      animationPose(pose) { if (map3dView) openingPoses.set(pose.target, pose); },
      setPlayerPicture(picture) { forcedPlayerPicture = picture; },
      setFacing(direction) {
        facing = direction;
        forcedPlayerPicture = undefined;
        openingPoses.delete(-1);
        requestFrame();
      },
    };
    void playOpening({ opening, scene, slot, signal: listeners.signal, view, sound: game.sound }).then(async () => {
      forcedPlayerPicture = undefined;
      openingPoses.clear();
      await presentFrame();
      game.openingDone = true;
      await commitProgress();
      openingActive = false;
      menuToggle.disabled = false;
      const events = scene.events.slice(0, 2);
      canvas.dataset.openingResults = JSON.stringify({
        events,
        indices: events.map(event => scene.layers.eventIndex[indexOf(event.x, event.y)]),
        facing,
      });
      canvas.dataset.opening = 'complete';
      showCell();
    }).catch(error => {
      if (listeners.signal.aborted) return;
      canvas.dataset.opening = 'error';
      void close();
      fail(error);
    });
    return true;
  }

  async function fight(id, getExp, inventory, party = game.party, roleState = game.roleState) {
    canvas.dataset.trainer = 'loading';
    canvas.dataset.battleId = String(id);
    notice.hidden = false;
    notice.textContent = '正在讀取原作戰場與人物動畫…';
    const spec = unpackMap(await json(`/api/battle/${id}?party=${party.join(',')}`));
    for (const role of [...spec.roster, ...spec.enemy]) {
      const saved = roleState.find(entry => entry.id === role.id);
      if (saved) Object.assign(role, saved);
    }
    listeners.signal.throwIfAborted();
    const soundPlayers = new Map();
    let view;
    let arena;
    let musicLive = false;
    function playSound(group, id) {
      if (!game.sound || !Number.isInteger(id) || id < 0 || id > 99) return;
      const path = `/audio/${group}/${id}.wav`;
      let audio = soundPlayers.get(path);
      if (!audio) {
        audio = new Audio(path);
        soundPlayers.set(path, audio);
      }
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    }
    try {
      const roster = spec.party.map(roleId => spec.roster.find(role => role.id === roleId));
      Object.assign(canvas.dataset, { trainer: 'team', teamCount: roster.length, battleMusic: game.sound ? 'loading' : 'muted',
        battleMusicTrack: spec.music, battleMusicLevel: 0, battleCue: '', battleCueCount: 0 });
      delete canvas.dataset.battleItemId;
      delete canvas.dataset.battleItemCount;
      delete canvas.dataset.battleDartHit;
      delete canvas.dataset.battleCastRole;
      delete canvas.dataset.battleResult;
      notice.hidden = true;
      hint.textContent = touchExploration.matches ? '點選隊友，再點「確定出戰」' : '選擇出戰隊友 · O 確認';
      musicActive = musicLive = game.sound;
      const track = music.play(spec.music);
      void track.catch(() => {
        if (musicLive) canvas.dataset.battleMusic = 'unavailable';
      });
      const selected = spec.autoTeamMate[0] >= 0 ? undefined : await menu.chooseTeam(roster, listeners.signal);
      spec.team = resolveClassicTeam(spec, selected);
      Object.assign(canvas.dataset, { trainer: 'loading', battleTeam: spec.team.map(role => role.id).join(',') });
      notice.hidden = false;
      notice.textContent = '正在讀取原作戰場與人物動畫…';
      const makeModel = () => createClassicBattle(spec, {
        getExp, inventory, tileWidth: 18 * scale,
        onEvent(event) {
          if (event.type === 'cast' || event.type === 'parry') playSound('wave', event.soundId);
          if (event.type === 'cast') canvas.dataset.battleCastRole = String(event.role);
          if ((event.type === 'hit' || event.type === 'guard') && event.itemId === undefined) playSound('hit', event.effectId);
          if (['hit', 'guard', 'parry', 'defeat'].includes(event.type)) {
            canvas.dataset.battleCue = event.type;
            canvas.dataset.battleCueCount = String(Number(canvas.dataset.battleCueCount) + 1);
            if (event.itemId !== undefined) canvas.dataset.battleDartHit = String(event.itemId);
          }
          if (event.type === 'item') {
            canvas.dataset.battleItemId = String(event.itemId);
            canvas.dataset.battleItemCount = String(event.count);
          }
        },
      });
      const model = makeModel();
      if (game.visualStyle === 'jyx2' && viewSettings.get('battle') !== '2d') {
        if (nativeBattleName(spec.battlefieldId)) {
          try {
            const { createNativeBattleArena } = await import('./jyx2/scene/native-battle-view.mjs');
            arena = await createNativeBattleArena(canvas, spec, width, height, scale, { loadArt, json });
          } catch (error) {
            console.warn('白鷺 World3D 戰場無法載入，沿用原作戰場', error);
          }
        }
      }
      canvas.dataset.battleView = arena?.name ?? '2d';
      canvas.dataset.battleLiveActors = arena?.actors ?? '';
      const usedItems = new Set([...inventory.keys(), ...spec.enemy.flatMap(role => role.carriedItems.map(item => item.id))]);
      const itemEffectIds = [0, 30, 36, ...[...usedItems].map(id => spec.items[id]).filter(item => item?.type === 4)
        .map(item => item.hiddenWeaponEffectId)];
      view = await createBattleView({ engine, cache, spec, width, height, scale, loadArt, bakeGround, json, visualStyle: game.visualStyle, outputAlpha, arena,
        itemEffectIds, grid: battleGrid });
      listeners.signal.throwIfAborted();
      // Keep the Egret keyboard target active while the map layers are hidden.
      ground.visible = objects.visible = false;
      map3dView?.setVisible(false);
      if (atmosphere) atmosphere.light.visible = false;
      sceneName.textContent = spec.name;
      hint.textContent = battleHint();
      marker.textContent = '經典回合制';
      notice.hidden = true;
      await new Promise((resolve, reject) => {
        battle = { model, makeModel, view, arena, resolve, reject, soundPlayers, lastTime: performance.now() };
        canvas.dataset.battleAllies = model.state.roles.filter(role => role.side === 0).map(role => role.id).join(',');
        canvas.dataset.trainer = 'battle';
      });
      const state = battle.model.state;
      return { id, name: spec.name, won: state.result, settlement: state.settlement, inventoryDelta: state.inventoryDelta };
    } finally {
      menu.close();
      musicActive = musicLive = false;
      music.stop();
      mapMusicStarted = false;
      if (!closing) startMapMusic();
      Object.assign(canvas.dataset, { battleMusic: 'stopped', battleMusicLevel: 0 });
      for (const audio of soundPlayers.values()) audio.pause();
      battle = undefined;
      delete canvas.dataset.battleCommandMode;
      view?.close();
      arena?.dispose();
      ground.visible = objects.visible = !map3dView;
      map3dView?.setVisible(true);
      if (atmosphere) atmosphere.light.visible = !map3dView;
      sceneName.textContent = scene.name;
      notice.hidden = true;
      battleResultPanel.hidden = true;
      delete canvas.dataset.battlePrompt;
      showCell();
      requestFrame();
    }
  }

  function captureProgress({ inventory = game.inventory, roleState = game.roleState, party = game.party,
    scenePatches = game.scenePatches, flags = game.save?.flags, lastBattle = game.save?.lastBattle } = {}) {
    const openingScene = game.sceneStates.get(initial.sceneId);
    return {
      inventory: [...inventory], roleState, party, scenePatches: [...scenePatches], lastBattle, flags,
      nativeTemplate: game.save?.nativeTemplate,
      location: { id: destination.id, x, y, facing }, mainX: isWorld ? x : game.mainX, mainY: isWorld ? y : game.mainY,
      openingDone: game.openingDone, openingEvents: openingScene?.events.slice(0, 2) ?? game.save?.openingEvents ?? [],
    };
  }

  async function commitProgress(changes = {}) {
    game.save = await game.autoSave.write(captureProgress(changes));
    Object.assign(game, Object.fromEntries(['inventory', 'roleState', 'party', 'scenePatches']
      .filter(key => Object.hasOwn(changes, key)).map(key => [key, changes[key]])));
    showSave(game);
  }

  async function saveTrainer(inventory, result) {
    canvas.dataset.trainer = 'saving';
    hint.textContent = '正在寫入自動存檔…';
    const roles = new Map(game.roleState.map(role => [role.id, role]));
    for (const { expGot, levelsGained, ...role } of result.settlement) roles.set(role.id, { ...roles.get(role.id), ...role });
    await commitProgress({ inventory, roleState: [...roles.values()], lastBattle: { id: result.id, won: result.won } });
    canvas.dataset.trainer = 'saved';
  }

  async function showItemReward(id, amount, phase) {
    const item = await json(`/api/item/${id}`);
    const rewardScope = engine.createScope();
    try {
      const group = engine.createAssetGroup(rewardScope, [createAssetRef(itemType, `item:${id}`)]);
      const [icon] = await group.ready;
      canvas.dataset[phase] = 'reward';
      canvas.dataset.rewardItem = String(id);
      await dialogue.talk({ text: `獲得${item.name}  ${amount}`, head: -1, style: 3, voice: -1, item: icon });
      await presentFrame();
    } finally {
      rewardScope.dispose();
    }
  }

  async function interactWithTrainer() {
    trainerActive = true;
    menuToggle.disabled = true;
    held = undefined;
    delete canvas.dataset.blocked;
    notice.hidden = true;
    let errorText;
    try {
      const program = game.trainer ??= await loadTrainer();
      await playTrainer({ program, inventory: game.inventory, view: {
        talk(options) {
          canvas.dataset.trainer = 'talk';
          return dialogue.talk(options);
        },
        battle: fight,
        showItem: (id, amount) => showItemReward(id, amount, 'trainer'),
        save: saveTrainer,
      } });
    } catch (error) {
      if (listeners.signal.aborted) return;
      canvas.dataset.trainer = 'error';
      errorText = describeError(error);
    } finally {
      if (!closing) {
        trainerActive = false;
        menuToggle.disabled = false;
        showCell();
        marker.textContent = errorText ? '事件 692 暫停' : `已自動存檔 · 勝 ${canvas.dataset.wins} / 負 ${canvas.dataset.losses}`;
        if (errorText) hint.textContent = errorText;
        requestFrame();
      }
    }
  }

  function replaceMap(next) {
    for (const layer of ['ground', 'objects']) {
      if (map[layer] === next[layer]) continue;
      for (const item of map[layer]) if (item.node) freeMapNodes.push(item.node);
    }
    map = next;
    mapObjectsToDraw = visualObjects(next);
    mapGroundToDraw = visualGround(next);
    requestFrame();
  }

  function refreshSceneObjects(source) {
    displayedEvents = source.events;
    pendingScene3d = source;
    replaceMap({ ground: map.ground, objects: mapObjects(source, scale, project).objects });
  }

  let displayedEvents = scene.events;
  let pendingScene3d;
  let displayedEarth = isWorld ? undefined : scene.layers.earth.slice();
  let displayedElevation = isWorld ? undefined : scene.layers.buildingHeight.slice();

  async function ensureSceneArt(ids) {
    const missing = [...new Set(ids)].filter(id => available.has(id) && !leasesById.has(id));
    if (!missing.length) return;
    for (const [id, art] of await loadArt('smap', missing, false, sceneArt ? 256 : 1024)) textures.set(id, art);
    await acquireMapArt(missing);
  }

  async function previewScene(source) {
    if (isWorld) return;
    const next = mapObjects(source, scale, project);
    await ensureSceneArt(mapArtIds(next));
    pendingScene3d = source;
    const { earth, buildingHeight } = source.layers;
    const changedGround = earth.some((value, index) => value !== displayedEarth[index])
      || buildingHeight.some((value, index) => value !== displayedElevation[index]);
    if (!changedGround) {
      displayedEvents = source.events;
      replaceMap({ ground: map.ground, objects: next.objects });
      return;
    }
    const oldGround = map.ground;
    const oldScope = groundScope;
    const rawGround = next.ground;
    groundScope = scope.use(engine.createScope());
    next.ground = bakeGround(next.ground, textures, allocateGroundId);
    await acquireMapArt(next.ground.map(item => item.id), groundScope);
    if (gpuGround) await rebuildGpuGround(rawGround);
    displayedEarth = earth.slice();
    displayedElevation = buildingHeight.slice();
    displayedEvents = source.events;
    replaceMap(next);
    await presentFrame();
    for (const { id } of oldGround) {
      leasesById.delete(id);
      textures.delete(id);
    }
    oldScope.dispose();
  }

  async function fadeScene(to) {
    const from = root.alpha;
    for (let frame = 1; frame <= 8; frame++) {
      root.alpha = from + (to - from) * frame / 8;
      await presentFrame();
    }
  }

  async function interactWithRecruit({ id, slot }) {
    recruitActive = true;
    held = undefined;
    menuToggle.disabled = true;
    delete canvas.dataset.blocked;
    Object.assign(canvas.dataset, { recruit: 'loading', eventId: id });
    const bag = new Map(game.inventory);
    const party = [...game.party];
    const changed = new Set();
    const grid = scene.layers.eventIndex.slice();
    const draft = { ...scene, events: scene.events.map(event => ({ ...event })), layers: { ...scene.layers, eventIndex: grid } };
    let member;
    let errorText;
    try {
      const response = await fetch(`/api/event/${id}`);
      if (!response.ok) throw new Error(`無法讀取原作事件 ${id}（${response.status}）`);
      const program = parseRecruitScript(await response.text());
      listeners.signal.throwIfAborted();
      await runRecruitScript(program, {
        talk(text, head, style, voice) {
          canvas.dataset.recruit = 'talk';
          return dialogue.talk({ text, head, style, voice });
        },
        askJoin() {
          canvas.dataset.recruit = 'choice';
          hint.textContent = '選擇是否邀請加入';
          return menu.askJoin(listeners.signal);
        },
        async checkRoleMorality(role, minimum, maximum) {
          const value = game.roleState.find(entry => entry.id === role)?.morality
            ?? (role === 0 ? initial.morality : (await json(`/api/role/${role}`)).morality);
          return value >= minimum && value <= maximum;
        },
        teamIsFull: () => party.length >= initial.base.party.length,
        modifyEvent(...args) {
          modifySceneEvent(draft, slot, ...args);
          changed.add(args[1] < 0 ? slot : args[1]);
        },
        darkScene: () => fadeScene(0),
        lightScene() {
          refreshSceneObjects(draft);
          return fadeScene(1);
        },
        async join(roleId) {
          if (party.includes(roleId)) return;
          const role = await json(`/api/role/${roleId}`);
          party.push(roleId);
          for (const { id: itemId, count } of role.carriedItems) {
            const amount = count || 1;
            bag.set(itemId, (bag.get(itemId) ?? 0) + amount);
            await showItemReward(itemId, amount, 'recruit');
          }
          member = role;
        },
      });
      listeners.signal.throwIfAborted();
      if (changed.size || member) {
        const scenePatches = new Map(game.scenePatches);
        const previous = scenePatches.get(scene.id);
        const events = new Map(previous?.events);
        const eventTiles = new Map(previous?.eventTiles);
        for (const index of changed) events.set(index, draft.events[index]);
        for (let index = 0; index < grid.length; index++) {
          if (grid[index] !== scene.layers.eventIndex[index]) eventTiles.set(index, grid[index]);
        }
        scenePatches.set(scene.id, { ...previous, events: [...events], eventTiles: [...eventTiles] });
        const roleState = new Map(game.roleState.map(role => [role.id, role]));
        if (member) roleState.set(member.id, { ...roleState.get(member.id), id: member.id, carriedItems: [] });
        canvas.dataset.recruit = 'saving';
        hint.textContent = '正在寫入自動存檔…';
        await commitProgress({ inventory: bag, party, roleState: [...roleState.values()], scenePatches });
        scene.events = draft.events;
        scene.layers.eventIndex = grid;
        canvas.dataset.recruit = 'saved';
      } else canvas.dataset.recruit = 'idle';
    } catch (error) {
      if (listeners.signal.aborted) return;
      canvas.dataset.recruit = 'error';
      errorText = describeError(error);
    } finally {
      if (!closing) {
        root.alpha = 1;
        refreshSceneObjects(scene);
        recruitActive = false;
        menuToggle.disabled = false;
        showCell();
        if (errorText) {
          marker.textContent = `事件 ${id} 暫停`;
          hint.textContent = errorText;
        } else if (member) marker.textContent = `${member.name}加入 · 已自動存檔`;
      }
    }
  }

  const showMessage = text => dialogue.talk({ text, head: -1, style: 3, voice: -1 });

  async function travelScript(playerMoves, startX, startY, endX, endY) {
    let tx = startX, ty = startY;
    while (true) {
      if (playerMoves) {
        x = tx;
        y = ty;
        stride = stride % 6 + 1;
      }
      cameraOverride = { x: tx, y: ty };
      await presentFrame();
      if (tx === endX && ty === endY) break;
      if (tx !== endX) {
        const direction = Math.sign(endX - tx);
        if (playerMoves) facing = direction > 0 ? 1 : 2;
        tx += direction;
      } else {
        const direction = Math.sign(endY - ty);
        if (playerMoves) facing = direction > 0 ? 3 : 0;
        ty += direction;
      }
    }
    if (playerMoves) cameraOverride = undefined;
  }

  async function animateEvent(source, target, frames, final, update, extraPictures) {
    const pictures = target < 0 ? [...frames, final] : [...frames, final, ...extraPictures].map(pictureId);
    await ensureSceneArt(pictures);
    const first = frames[0] ?? final;
    if (target >= 0) {
      update(first, 0);
      await previewScene(source);
    }
    for (const picture of [...frames, ...(frames.at(-1) === final ? [] : [final])]) {
      update(picture, picture - first);
      if (target < 0) forcedPlayerPicture = picture;
      await presentFrame();
    }
  }

  async function readEventProgram(id) {
    if (!game.programs.has(id)) {
      const response = await fetch(`/api/event/${id}`);
      if (!response.ok) throw new Error(`無法讀取原作事件 ${id}（${response.status}）`);
      game.programs.set(id, parseGameScript(await response.text(), { eventId: id }));
    }
    return game.programs.get(id);
  }

  async function interactWithEvent({ id, slot }, usedItem) {
    eventActive = true;
    menuToggle.disabled = true;
    held = undefined;
    pointerWalk = undefined;
    delete canvas.dataset.blocked;
    Object.assign(canvas.dataset, { event: 'loading', eventId: id });
    const position = { x, y, facing };
    let errorText;
    try {
      const result = await playGameEvent({ program: await readEventProgram(id), run: runGameScript,
        game, catalog, sceneId: scene.id, eventSlot: slot, usedItem, view: {
          getProgram: readEventProgram,
          getScene: sceneId => sceneFor(game, sceneId),
          preview: previewScene,
          talk(text, head, style, voice) {
            canvas.dataset.event = 'talk';
            return dialogue.talk({ text, head, style, voice });
          },
          message: showMessage,
          oldTalk: id => json(`/api/talk/${id}`),
          ask(title) {
            canvas.dataset.event = 'choice';
            return menu.askJoin(listeners.signal, title);
          },
          reward: (id, count) => showItemReward(id, count, 'event'),
          battle: fight,
          fade: fadeScene,
          animation: animateEvent,
          setFacing(direction) { facing = direction; forcedPlayerPicture = undefined; requestFrame(); },
          setPosition(nextX, nextY) { x = nextX; y = nextY; cameraOverride = undefined; requestFrame(); },
          travel: travelScript,
          hidePlayer() { hiddenPlayer = true; requestFrame(); },
          wave(id) { if (game.sound) void new Audio(`/audio/wave/${id}.wav`).play().catch(() => {}); },
          music(id) { mapTrack = id; music.stop(); mapMusicStarted = false; startMapMusic(); },
          shop(stock, money) {
            return menu.choose(`商店 · 銀兩 ${money}`, stock.filter(row => row.count > 0 && row.price <= money).map(row => ({
              label: `${row.name} · ${row.price} 兩`, value: row.index, dataset: { shopItem: row.id }, icon: itemIconUrl(row.id),
            })), listeners.signal);
          },
        } });
      listeners.signal.throwIfAborted();
      if (result.ended === 'defeat') {
        eventEnded = true;
        const command = await menu.choose('勝敗乃兵家常事', [
          { label: '讀取自動存檔', value: 'retry', dataset: { defeatAction: 'retry' } },
          { label: '返回主選單', value: 'title', dataset: { defeatAction: 'title' } },
        ], listeners.signal);
        if (command === 'title') returnToTitle();
        else location.reload();
        return;
      }
      if (result.ended === 'complete') result.flags.finished = true;
      if (result.shouldSave) await commitProgress(result);
      for (const [id, changed] of result.changedScenes) {
        if (id === scene.id) Object.assign(scene, changed);
        else game.sceneStates.set(id, changed);
      }
      await previewScene(scene);
      canvas.dataset.event = result.shouldSave ? 'saved' : 'complete';
      if (result.ended === 'complete') {
        eventEnded = true;
        canvas.dataset.event = 'finished';
        await showMessage('劇情完成');
      }
      return true;
    } catch (error) {
      if (listeners.signal.aborted) return;
      errorText = describeError(error);
      canvas.dataset.event = 'error';
      ({ x, y, facing } = position);
      await previewScene(scene);
    } finally {
      if (!closing) {
        root.alpha = 1;
        cameraOverride = forcedPlayerPicture = undefined;
        hiddenPlayer = eventEnded;
        eventActive = false;
        menuToggle.disabled = false;
        showCell();
        requestFrame();
        if (errorText) {
          marker.textContent = `事件 ${id} 暫停`;
          hint.textContent = errorText;
        }
      }
    }
  }

  function dispatchEvent(interaction, usedItem) {
    pointerWalk = undefined;
    if (interaction.id === trainerEventId && usedItem === undefined) {
      if (typeof AudioContext === 'function') void music.unlock().catch(() => {});
      return interactWithTrainer();
    }
    if (hasRecruit && recruitEvents.has(interaction.id) && usedItem === undefined) return interactWithRecruit(interaction);
    return interactWithEvent(interaction, usedItem);
  }

  async function chooseSaveSlot(loading) {
    const entries = await Promise.all((loading ? [...manualSlots, autoSlot] : manualSlots).map(async number => {
      const store = createSaveSlot(initial.saveIdentity, number);
      return { number, store, save: await store.read() };
    }));
    const choices = entries.filter(entry => !loading || entry.save).map(entry => {
      const location = entry.save?.location;
      const title = !location ? '空槽' : location.id === 'world' ? '江湖大地圖' : scenes.find(row => row.id === location.id)?.name ?? '原作場景';
      const name = entry.number === autoSlot ? '自動存檔 11' : `第 ${entry.number} 槽`;
      return { label: `${name} · ${title}`, value: entry, dataset: { saveSlot: entry.number } };
    });
    if (!choices.length) {
      await showMessage('目前沒有存檔。');
      return undefined;
    }
    return menu.choose(loading ? '選擇讀取的存檔' : '選擇手動存檔槽', choices, listeners.signal, 2);
  }

  async function openWorldMenu(bagOnly) {
    worldMenuActive = true;
    held = undefined;
    pointerWalk = undefined;
    menuToggle.disabled = true;
    updateExploreControls();
    try {
      await showWorldMenu({ menu, signal: listeners.signal, game, catalog, bagOnly, canUseGear, actions: {
        useQuestItem(itemId) {
          const target = facingEvent('event2');
          return target ? dispatchEvent(target, itemId) : showMessage('這裡無法使用這件物品。');
        },
        leave(roleId) {
          const id = catalog.leaveEvents.get(roleId);
          if (id !== undefined && game.party.includes(roleId)) return dispatchEvent({ id, slot: -1 });
        },
        message: showMessage,
        async update(patches, inventory, message) {
          const roles = new Map(game.roleState.map(role => [role.id, role]));
          for (const patch of patches) roles.set(patch.id, { ...roles.get(patch.id), ...patch });
          await commitProgress({ inventory, roleState: [...roles.values()] });
          await showMessage(message);
        },
        async save() {
          const entry = await chooseSaveSlot(false);
          if (!entry) return;
          if (entry.save && !await menu.askJoin(listeners.signal, `覆蓋第 ${entry.number} 槽？`)) return;
          await entry.store.write(captureProgress());
          await showMessage(`已儲存第 ${entry.number} 槽。`);
        },
        async load() {
          const entry = await chooseSaveSlot(true);
          if (!entry) return;
          if (entry.number !== autoSlot) await game.autoSave.write(entry.save);
          location.reload();
        },
        async new() {
          if (!await menu.askJoin(listeners.signal, '開始新遊戲並替換自動存檔？')) return;
          await game.autoSave.write(game.baseline);
          location.reload();
        },
        async title() {
          await commitProgress();
          returnToTitle();
        },
        async import() {
          const imported = await pickNativeSave();
          if (!imported) return;
          await game.autoSave.write(imported);
          location.reload();
        },
        async export() {
          await commitProgress();
          const response = await nativeSaveRequest('export', JSON.stringify(game.save));
          const url = URL.createObjectURL(await response.blob());
          const link = document.createElement('a');
          link.href = url;
          link.download = 'KYS-11.zip';
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
      } });
    } catch (error) {
      if (!listeners.signal.aborted) await showMessage(describeError(error));
    } finally {
      if (!closing) {
        worldMenuActive = false;
        menuToggle.disabled = false;
        showCell();
      }
    }
  }

  function showBattleResult(state) {
    canvas.dataset.trainer = 'result';
    canvas.dataset.battleResult = state.result ? 'win' : 'loss';
    delete canvas.dataset.battlePrompt;
    notice.hidden = true;
    const experience = state.settlement.map(role => {
      const actor = state.roles.find(entry => entry.side === 0 && entry.id === role.id);
      const name = state.settlement.length > 1 && actor ? `${actor.name} ` : '';
      return `${name}經驗 +${role.expGot}${role.levelsGained ? `，升至 ${role.level} 級` : ''}`;
    }).join(' · ');
    const progress = state.progression.flatMap(({ roleId, practice, crafting }) => [
      practice && `${catalog.roles[roleId].name} 修煉${practice.name} × ${practice.times}`,
      crafting && `製成 ${catalog.items[crafting.itemId].name} × ${crafting.count}`,
    ].filter(Boolean));
    battleResultText.textContent = [state.result ? '勝利' : '戰敗', experience, ...progress].join(' · ');
    hint.textContent = '點擊「繼續」或按 Enter / 空格返回場景';
    battleResultPanel.hidden = false;
    restoreMapKeyboardFocus();
  }

  function continueBattle() {
    if (battleResultPanel.hidden || !battle || battle.model.state.result === null) return;
    battleResultPanel.hidden = true;
    canvas.focus({ preventScroll: true });
    restoreMapKeyboardFocus();
    battle.resolve();
  }

  const supportActions = [
    { label: '醫療', value: 'medicine' },
    { label: '解毒', value: 'detox' },
    { label: '用毒', value: 'poison' },
  ];

  function syncBattleCursor() {
    const { state } = battle.model;
    const selection = state.selection;
    if (battle.selection !== selection) {
      battle.selection = selection;
      const cells = selection?.cells ?? [];
      const enemies = new Set(state.roles.filter(role => role.side !== state.turn?.side && !role.dead)
        .map(role => role.x + ',' + role.y));
      battle.cursor = (selection?.type === 'magic' || selection?.type === 'dart' || selection?.type === 'poison')
        ? cells.find(cell => enemies.has(cell.x + ',' + cell.y)) ?? cells[0] : cells[0];
      if (selection) canvas.dataset.battleCommandMode = selection.type;
      else delete canvas.dataset.battleCommandMode;
      battle.drawnFrame = undefined;
    }
  }

  function shiftBattleCursor(code) {
    const { cursor, model } = battle;
    if (!cursor) return;
    const [dx, dy] = moves.get(code);
    const vector = code === 'ArrowLeft' || code === 'KeyA' ? [-1, 0]
      : code === 'ArrowRight' || code === 'KeyD' ? [1, 0] : [dx, dy];
    let best;
    let distance = Infinity;
    for (const cell of model.state.selection.cells) {
      const x = cell.x - cursor.x, y = cell.y - cursor.y;
      const forward = (x - y) * vector[0] + (x + y) * vector[1];
      if (forward <= 0) continue;
      const across = (x - y) * vector[1] - (x + y) * vector[0];
      const score = forward + Math.abs(across) * 2;
      if (score < distance) {
        best = cell;
        distance = score;
      }
    }
    if (best) {
      battle.cursor = best;
      battle.drawnFrame = undefined;
    }
  }

  function chooseBattleCell(cell) {
    const { model } = battle;
    const selection = model.state.selection;
    if (!cell || !selection || !model.selectCell(cell.x, cell.y)) return;
    syncBattleCursor();
    if (selection.type === 'status' && model.state.inspected) {
      void showCombatantStatus(model.state.inspected).catch(error => { if (!listeners.signal.aborted) fail(error); });
    }
  }

  async function showCombatantStatus(role) {
    const detail = `等級 ${role.level} · 生命 ${role.hp}/${role.maxHp} · 內力 ${role.mp}/${role.maxMp} · 體力 ${role.physicalPower}`
      + ` · 攻擊 ${role.attack} · 防禦 ${role.defence} · 輕功 ${role.speed} · 中毒 ${role.poison}`;
    canvas.dataset.battlePrompt = 'status';
    try {
      const label = game.visualStyle === 'classic' ? detail + ' · 返回戰鬥' : '返回戰鬥';
      await menu.choose(role.name, [{ label, value: true }], listeners.signal, 1, { detail });
    } finally {
      delete canvas.dataset.battlePrompt;
    }
  }

  function pickBattleCell(event) {
    if (event.button !== 0 || menu.active || canvas.dataset.battlePrompt) return;
    const bounds = canvas.getBoundingClientRect();
    const tile = battle.view.tileAt((event.clientX - bounds.left) * width / bounds.width,
      (event.clientY - bounds.top) * height / bounds.height);
    canvas.focus({ preventScroll: true });
    chooseBattleCell(tile);
  }

  async function chooseSupport(model) {
    const actions = model.listActions();
    const choices = supportActions.filter(row => actions.includes(row.value));
    if (!choices.length) return;
    canvas.dataset.battlePrompt = 'support';
    try {
      const action = await menu.choose('醫療、解毒與用毒', choices, listeners.signal);
      if (action) model.selectAction(action);
      syncBattleCursor();
    } finally {
      delete canvas.dataset.battlePrompt;
    }
  }

  function battleKeyDown(code, repeat) {
    if (repeat && !moves.has(code)) return;
    const { model } = battle;
    const { state } = model;
    const prompt = canvas.dataset.battlePrompt;
    if (state.result !== null) {
      if (isConfirm(code)) continueBattle();
      return;
    }
    if (prompt === 'surrender' || prompt === 'restart') {
      if (isConfirm(code)) {
        if (prompt === 'surrender') model.surrender();
        else {
          for (const audio of battle.soundPlayers.values()) audio.pause();
          battle.model = battle.makeModel();
          battle.drawnFrame = undefined;
          battle.lastTime = performance.now();
          Object.assign(canvas.dataset, { battleCue: '', battleCueCount: 0 });
          for (const key of ['battleDartHit', 'battleItemId', 'battleItemCount', 'battleCastRole']) delete canvas.dataset[key];
        }
      } else if (code !== 'Escape') return;
      delete canvas.dataset.battlePrompt;
      notice.hidden = true;
      syncBattleCursor();
      return;
    }
    if (prompt || state.pendingResult !== null) return;
    if (code === 'Escape' && state.selection) model.cancelSelection();
    else if (code === 'Escape' || code === 'KeyR') {
      canvas.dataset.battlePrompt = code === 'KeyR' ? 'restart' : 'surrender';
      const question = code === 'KeyR' ? '使用同一隊伍重開本場戰鬥？' : '放棄本場戰鬥？';
      notice.textContent = touchExploration.matches ? question : question + 'Enter 確認 · Esc 取消';
      notice.hidden = false;
    } else if (code === 'Tab') model.toggleAutomatic();
    else if (!state.canAct) return;
    else if (moves.has(code)) {
      if (!state.selection) {
        model.selectAction('move');
        syncBattleCursor();
        if (state.selection) battle.cursor = { x: state.turn.x, y: state.turn.y };
      }
      shiftBattleCursor(code);
    } else if (isConfirm(code)) chooseBattleCell(battle.cursor);
    else if (code === 'KeyM') model.selectAction('move');
    else if (code === 'KeyI') model.selectAction('magic');
    else if (code === 'KeyL') model.rest();
    else if (code === 'KeyV') model.selectAction('status');
    else if (code === 'KeyQ' || code === 'KeyF') model.selectMagic(code === 'KeyQ' ? -1 : 1);
    else if (code === 'KeyT') {
      void chooseSupport(model).catch(error => { if (!listeners.signal.aborted) fail(error); });
    } else if (code === 'KeyB') {
      const items = model.listItems().filter(item => model.canUseItem(item.id));
      if (!items.length) return;
      canvas.dataset.battlePrompt = 'items';
      hint.textContent = '選擇藥品或暗器';
      const resume = () => {
        menu.close();
        delete canvas.dataset.battlePrompt;
      };
      menu.showItems(items, id => {
        if (!model.useItem(id)) return;
        resume();
        syncBattleCursor();
      }, resume);
    }
    syncBattleCursor();
  }

  function switchTo(next) {
    if (closing) return;
    canvas.dataset.phase = 'loading';
    notice.hidden = false;
    notice.textContent = '正在切换原作场景…';
    void close().then(() => openMap(game, next)).catch(fail);
  }

  function enterFromWorld(entrance) {
    game.mainX = x;
    game.mainY = y;
    switchTo({ id: entrance.id, x: entrance.entrance[0], y: entrance.entrance[1], facing });
  }

  function clickToWalk(event) {
    canvas.focus({ preventScroll: true });
    if (event.button !== 0 || closing || battle || eventEnded) return;
    if (openingActive || trainerActive || recruitActive || eventActive || worldMenuActive) {
      if (!menu.active && dialogue.confirm() && openingActive) canvas.dataset.opening = 'running';
      return;
    }
    const bounds = canvas.getBoundingClientRect();
    const u = (event.clientX - bounds.left) / bounds.width;
    const v = (event.clientY - bounds.top) / bounds.height;
    const hit = map3dView ? map3dView.pick(u, v) : screenToTile(u * width, v * height, root.x, root.y, scale);
    const exit = hit?.exit && scene.exits?.[0];
    const target = exit ? { x: exit[0], y: exit[1] } : hit;
    if (!target || !fits(scene, target.x, target.y)) return;
    held = undefined;
    pointerWalk = undefined;
    const npc = eventAt(target.x, target.y);
    const canTalk = npc?.event1 > 0 && initial.config.useScript && catalog.eventIds.has(npc.event1);
    const entrance = isWorld ? entranceAt(target.x, target.y) : undefined;
    const goals = canTalk || entrance ? facingOffsets.map(([dx, dy]) => ({ x: target.x - dx, y: target.y - dy })) : [target];
    const start = move ?? { x, y };
    const path = findTilePath(start, goals, canWalk);
    if (!path) return;
    pointerWalk = { path, target: canTalk || entrance ? target : undefined, entrance };
  }

  function advancePointerWalk(now) {
    const step = pointerWalk.path.shift();
    if (step) {
      tryMove(facingKeys[step.facing], now);
      return;
    }
    const { target, entrance } = pointerWalk;
    pointerWalk = undefined;
    if (!target) return;
    const direction = facingOffsets.findIndex(([dx, dy]) => x + dx === target.x && y + dy === target.y);
    if (direction < 0) return;
    facing = direction;
    requestFrame();
    if (entrance) enterFromWorld(entrance);
    else {
      const interaction = facingEvent();
      if (interaction) void dispatchEvent(interaction);
    }
  }

  function followScenePortal() {
    if (closing || eventEnded) return;
    if (scene.exits?.some(point => samePoint(point, x, y))) {
      game.worldMusic = game.save?.flags?.mainMusic ?? scene.exitMusic;
      switchTo({ id: 'world', x: game.mainX, y: game.mainY, facing });
    } else if (scene.jumpTo >= 0 && samePoint(scene.jump, x, y)) {
      const target = scenes.find(entry => entry.id === scene.jumpTo);
      const [tx, ty] = scene.worldEntrances[0][0] !== 0 ? target.entrance : target.jumpReturn;
      switchTo({ id: target.id, x: tx, y: ty, facing });
    }
  }

  function afterStep() {
    showCell();
    if (isWorld) {
      const entrance = entranceAt(x, y);
      if (entrance) enterFromWorld(entrance);
      else if (Math.max(Math.abs(x - worldCenter.x), Math.abs(y - worldCenter.y)) >= 10) {
        worldCenter = { x, y };
        replaceMap(orderWorldBuildings(worldObjects(scene, worldCenter, project, available), textures, scale));
      }
      return;
    }
    if (maybePlayOpening()) return;
    const stepId = eventAt(x, y)?.event3;
    if (initial.config.useScript && stepId > 0 && catalog.eventIds.has(stepId)) {
      // The original finishes the step event before checking the player's current tile for an exit.
      void dispatchEvent({ id: stepId, slot: scene.layers.eventIndex[indexOf(x, y)] })
        .then(completed => { if (completed) followScenePortal(); }).catch(fail);
      return;
    }
    followScenePortal();
  }

  function tryMove(code, now) {
    if (move) return;
    const [dx, dy, direction] = moves.get(code);
    const tx = x + dx, ty = y + dy;
    facing = direction;
    dirty = true;
    if (!canWalk(tx, ty)) {
      const entrance = isWorld && entranceAt(tx, ty);
      if (entrance) {
        enterFromWorld(entrance);
        return;
      }
      canvas.dataset.blocked = `${tx},${ty}`;
      hint.textContent = facingEvent()
        ? (touchExploration.matches ? '點「對話」與面前人物交談' : 'Enter / 空格與 NPC 對話')
        : `無法通行 · ${tx}, ${ty}`;
      return;
    }
    delete canvas.dataset.blocked;
    if (now - lastWalk > 145) walkingSince = now;
    lastWalk = now;
    stride = stride % 6 + 1;
    const mode = initial.config?.smoothWalking ?? 2;
    const duration = [0, 33, 66, 150][mode] ?? 66;
    if (duration === 0) {
      x = tx;
      y = ty;
      afterStep();
    } else {
      move = { x: tx, y: ty, start: now, duration };
    }
  }

  function drawItems(container, items, cameraX, cameraY) {
    const visible = [];
    for (const item of items) {
      const event = item.event;
      const ambient = animates(event) && !openingActive && !trainerActive && !recruitActive && !eventActive;
      const span = ambient ? event.endPic - event.beginPic : 0;
      const duanYu = recruitArt !== undefined && event?.currentPic > 0 && recruitEvents.has(event.event1);
      if (duanYu && event.index === 8) continue;
      const id = duanYu && event.index === 0 ? recruitArt
        : ambient ? pictureId(event.beginPic + ((event.picDelay * 2 % span + animationTick) % (span + 1)))
        : event ? pictureId(event.currentPic) : item.id;
      const texture = textures.get(id);
      if (!texture) continue;
      const { dx, dy, region } = texture;
      const artScale = texture.scale ?? item.scale ?? 1;
      const left = item.px - dx;
      const top = item.py - dy;
      if (left + cameraX >= width || top + cameraY >= height || left + region.width * artScale + cameraX <= 0 || top + region.height * artScale + cameraY <= 0) continue;
      const lease = leasesById.get(id);
      const node = item.node ??= freeMapNodes.pop() ?? scope.use(new Bitmap(lease));
      if (node.textureLease !== lease) node.textureLease = lease;
      node.x = Math.round(left);
      node.y = Math.round(top);
      node.scaleX = node.scaleY = artScale;
      if (item === player && atmosphere) visible.push(atmosphere.shadow);
      visible.push(node);
    }
    const keep = new Set(visible);
    for (let index = container.numChildren - 1; index >= 0; index--) {
      const node = container.getChildAt(index);
      if (!keep.has(node)) container.removeChild(node);
    }
    visible.forEach((node, index) => {
      if (node.parent !== container) container.addChild(node);
      if (container.getChildAt(index) !== node) container.setChildIndex(node, index);
    });
  }

  function render(now) {
    if (buildingGpuGround || restoringGpuGround) return;
    if (!isWorld && now - lastAnimation >= 200 && scene.events.some(animates)) {
      lastAnimation = now;
      animationTick++;
      dirty = true;
    }
    if (musicActive && now >= musicProbe) {
      musicProbe = now + 100;
      const level = music.level();
      if (level > 0.0001) {
        canvas.dataset.battleMusic = 'playing';
        canvas.dataset.battleMusicLevel = level.toFixed(5);
      }
    }
    if (battle) {
      const { model, view, lastTime } = battle;
      const state = model.state;
      battle.lastTime = now;
      if (state.result === null && !canvas.dataset.battlePrompt) {
        model.step(now - lastTime);
        syncBattleCursor();
      }
      if (state.result !== null && !battle.resultShown) {
        battle.resultShown = true;
        showBattleResult(state);
      }
      const player = state.turn ?? state.player;
      const status = `第 ${state.round} 回合 · 剩餘敵人 ${state.remainingEnemies}/${state.totalEnemies}${state.auto ? ' · 自動戰鬥' : ''}`;
      if (coordinates.textContent !== status) coordinates.textContent = status;
      Object.assign(canvas.dataset, { battleTick: state.frame, battleRound: state.round,
        battleHp: player.hp, battleMaxHp: player.maxHp, battleMp: player.mp, battleAction: player.action,
        battleAuto: state.auto, battleControlled: player.id, battleTurnSide: player.side });
      if (state.result === null && !canvas.dataset.battlePrompt) {
        const nextHint = state.selection
          ? (touchExploration.matches ? '點高亮格直接選取，或用方向鍵選格後點「確定」' : '點選高亮格子 · 方向鍵選格 · Enter 確認 · Esc 取消')
          : state.canAct ? battleHint()
            : state.auto ? (touchExploration.matches ? '自動戰鬥中 · 再點「自動」恢復手動' : '自動戰鬥中 · Tab 恢復手動')
              : '等待行動完成';
        if (hint.textContent !== nextHint) hint.textContent = nextHint;
      }
      if (host.getStatus().pendingFrames === 0 && battle.drawnFrame !== state.frame) {
        view.draw(state, battle.cursor);
        submitFrame();
        Object.assign(canvas.dataset, { battleZoom: state.presentation.zoom, battleEffectCount: state.effects.length,
          battleFreeze: state.presentation.freeze, battleBloodCount: state.presentation.blood.length });
        battle.drawnFrame = state.frame;
      }
      return;
    }
    let progress = 0;
    if (move) {
      progress = Math.min(1, (now - move.start) / move.duration);
      dirty = true;
      if (progress === 1) {
        x = move.x;
        y = move.y;
        move = undefined;
        progress = 0;
        afterStep();
      }
    }
    if (!closing && !openingActive && !trainerActive && !recruitActive && !eventActive && !worldMenuActive && !eventEnded && !move) {
      if (pointerWalk) advancePointerWalk(now);
      else if (held && !canvas.dataset.blocked) tryMove(held, now);
    }
    if (closing) return;
    const tx = move ? x + (move.x - x) * progress : x;
    const ty = move ? y + (move.y - y) * progress : y;
    const sailing = isWorld && isWorldWater(pictureId(scene.layers.earth[indexOf(x, y)]));
    const walking = Boolean(move) || now - lastWalk < 100;
    if (map3dView) {
      const people = sceneActors.flatMap(person => {
        const event = displayedEvents[person.slot];
        if (!event || event.currentPic <= 0) return [];
        return [{ ...person, x: event.x, y: event.y, animation: openingPoses.get(person.slot), interactive: event.event1 > 0 }];
      });
      try {
        const refresh = pendingScene3d && map3dView.setScene;
        if (refresh) map3dView.setScene(pendingScene3d);
        pendingScene3d = undefined;
        const stageEvent = openingActive ? openingEventId : recruitActive ? Number(canvas.dataset.eventId) : undefined;
        const props = map3dView.propSlots.flatMap(slot => displayedEvents[slot] ? [{ slot, ...displayedEvents[slot] }] : []);
        map3dView.update({ x: tx, y: ty, direction: facing, moving: walking, hidden: hiddenPlayer,
          people, props, opacity: root.alpha, elapsedMs: now, cameraFocus: cameraOverride,
          stageEvent, heroAnimation: openingPoses.get(-1), sailing, sceneEvents: displayedEvents,
          animationTick, animateEvents: !openingActive && !trainerActive && !recruitActive && !eventActive,
          heroPicture: forcedPlayerPicture, force: Boolean(refresh || frameWaiters.length) });
        if (dirty && host.getStatus().pendingFrames === 0) submitFrame();
        return;
      } catch (error) {
        console.warn(`${scene.name} 3D 畫面中斷，沿用原作畫面`, error);
        map3dView.dispose();
        map3dView = undefined;
        canvas.dataset[viewAttribute] = '2d';
        ground.visible = objects.visible = true;
        if (atmosphere) atmosphere.light.visible = true;
        dirty = true;
      }
    }
    const heroArt = !sailing && !openingActive && forcedPlayerPicture === undefined && !hiddenPlayer
      ? mapActors?.frame(0, walking ? 'walk' : 'idle', facing, walking ? now - walkingSince : now) : undefined;
    const duan = hasRecruit ? displayedEvents[0] : undefined;
    recruitArt = duan?.currentPic > 0 && recruitEvents.has(duan.event1)
      ? mapActors?.frame(recruitHead, 'idle', 3, now) : undefined;
    if (heroArt !== drawnHeroArt || recruitArt !== drawnRecruitArt) dirty = true;
    if (!dirty || host.getStatus().pendingFrames !== 0) return;
    const [px, py] = project(tx, ty);
    let camera = [px, py];
    if (cameraOverride) camera = project(cameraOverride.x, cameraOverride.y);
    else if (atmosphere && move && !openingActive && !eventActive && !trainerActive && !recruitActive) {
      const follow = atmosphere.cameraProgress(progress);
      camera = project(x + (move.x - x) * follow, y + (move.y - y) * follow);
    }
    const elevation = elevationAt(x, y);
    const interpolated = move ? elevation + (elevationAt(move.x, move.y) - elevation) * progress : elevation;
    root.x = Math.round(width / 2 - camera[0]);
    root.y = Math.round(height / 2 - camera[1]);
    const frameIndex = move || held ? stride : 0;
    const actorId = sailing ? 3715 + facing * 4 + frameIndex % 4 : 2501 + facing * 7 + frameIndex;
    player.id = forcedPlayerPicture ?? heroArt ?? (textures.has(actorId) ? actorId : 2501 + facing * 7);
    player.px = px;
    player.py = py - interpolated * scale;
    player.depth = contactDepth(tx, ty);
    atmosphere?.positionShadow(player.px, player.py);
    const split = mapObjectsToDraw.findIndex(item => item.depth > player.depth || item.depth === player.depth && (isWorld || item.rank > player.rank));
    const ordered = hiddenPlayer ? mapObjectsToDraw
      : split === -1 ? [...mapObjectsToDraw, player] : [...mapObjectsToDraw.slice(0, split), player, ...mapObjectsToDraw.slice(split)];
    const useGpuGround = gpuGround && ground.visible && root.alpha === 1;
    if (!useGpuGround) drawItems(ground, mapGroundToDraw, root.x, root.y);
    drawItems(objects, ordered, root.x, root.y);
    drawnHeroArt = heroArt;
    drawnRecruitArt = recruitArt;
    // Movement continues independently. Keep the newest scene dirty until the previous submission drains.
    submitFrame(useGpuGround);
  }

  function submitFrame(useGpuGround = false) {
    const options = { width, height, clearColor: 0, clearAlpha: (battle ? battle.arena : map3dView) ? 0 : 1, outputAlpha };
    let frame;
    if (useGpuGround) {
      ground.visible = false;
      try {
        const overlay = engine.captureSharedFrame(options);
        host.renderSharedFrameWithLayers(overlay, gpuGround.placements(root.x, root.y, 1, width, height));
        frame = overlay;
      } catch (error) {
        if (restoringGpuGround) return;
        dropGpuGround(error);
      } finally {
        ground.visible = true;
      }
      if (!frame) drawItems(ground, mapGroundToDraw, root.x, root.y);
    }
    frame ??= engine.renderSharedFrame(options);
    canvas.dataset.frame = String(frame.frameId);
    dirty = false;
    const waiters = frameWaiters.splice(0);
    if (waiters.length) void host.whenIdle().then(
      () => waiters.forEach(waiter => waiter.resolve(frame.frameId)),
      error => waiters.forEach(waiter => waiter.reject(error)),
    );
  }

  function close() {
    if (closing) return Promise.resolve();
    closing = true;
    cancelAnimationFrame(request);
    listeners.abort();
    battleResultPanel.hidden = true;
    menu.close();
    music.close();
    battle?.reject(listeners.signal.reason);
    dialogue?.close();
    map3dView?.dispose();
    gpuGround?.close();
    for (const key of ['groundMode', 'groundLayerBuilds', 'groundLayerReused', 'groundLayerResidentBytes', 'groundLayerGeneration']) {
      delete canvas.dataset[key];
    }
    if (viewAttribute) delete canvas.dataset[viewAttribute];
    for (const waiter of frameWaiters.splice(0)) waiter.reject(listeners.signal.reason);
    return engine.dispose();
  }

  function tick(now) {
    if (closing) return;
    try {
      render(now);
      if (!closing) request = requestAnimationFrame(tick);
    } catch (error) {
      void close();
      fail(error);
    }
  }

  function pressGameKey(code, repeat, consume = () => {}) {
    if (!battle && !trainerActive && !eventActive) startMapMusic();
    if (openingActive) {
      if (moves.has(code) || ['Enter', 'Space', 'Escape'].includes(code)) consume();
      if (repeat) return;
      const accepted = code === 'Escape' ? dialogue.skip()
        : isConfirm(code) && dialogue.confirm();
      if (accepted) canvas.dataset.opening = 'running';
      return;
    }
    if (trainerActive || recruitActive || eventActive || worldMenuActive) {
      if (menu.handleKey(code, false)) {
        consume();
        return;
      }
      if (battleControls.has(code) || isConfirm(code) || code === 'Escape') consume();
      if (battle) battleKeyDown(code, repeat);
      else if (!repeat && code === 'Escape') dialogue.skip();
      else if (!repeat && isConfirm(code)) dialogue.confirm();
      return;
    }
    if (eventEnded) {
      if (!repeat && code === 'Escape') {
        consume();
        void openWorldMenu(false);
      }
      return;
    }
    const interaction = !repeat && isConfirm(code) && !move ? facingEvent() : undefined;
    if (interaction) {
      consume();
      void dispatchEvent(interaction);
      return;
    }
    if (!repeat && !move && (code === 'Escape' || code === 'KeyB')) {
      consume();
      void openWorldMenu(code === 'KeyB');
      return;
    }
    if (!moves.has(code)) return;
    consume();
    if (repeat) return;
    pointerWalk = undefined;
    held = code;
    tryMove(code, performance.now());
  }
  engine.stage.on(keyboard.events.keyDown, event => {
    pressGameKey(normalizeEnter(event.payload.code), event.payload.repeat, () => event.preventDefault());
  }, { signal: scope.signal });
  engine.stage.on(keyboard.events.keyUp, event => {
    const code = normalizeEnter(event.payload.code);
    if (menu.handleKey(code, true)) return;
    if (held !== code) return;
    held = undefined;
    dirty = true;
  }, { signal: scope.signal });
  engine.stage.on(keyboard.events.cancel, () => { held = undefined; dirty = true; }, { signal: scope.signal });
  attachGamepadInput(canvas, { keyboard, signal: listeners.signal, getMode() {
    if (closing) return undefined;
    if (canvas.dataset.trainer === 'team' && menu.active) return 'team';
    if (battle && battle.model.state.result === null && !canvas.dataset.battlePrompt) return 'battle';
    return openingActive || trainerActive || recruitActive || eventActive || worldMenuActive ? 'menu' : 'map';
  } });

  let touchDirection;
  function releaseTouchDirection(event) {
    if (touchDirection?.pointerId !== event.pointerId) return;
    const { command } = touchDirection;
    touchDirection = undefined;
    if (held === command) held = undefined;
  }
  exploreDpad.addEventListener('pointerdown', event => {
    const button = event.target.closest('button');
    const command = button?.dataset.mapCommand;
    if (event.button !== 0 || !moves.has(command) || touchDirection || closing || battle || menu.active || exploreDpad.hidden) return;
    touchDirection = { pointerId: event.pointerId, command };
    button.setPointerCapture(event.pointerId);
    pressGameKey(command, false);
  }, { signal: listeners.signal });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    exploreDpad.addEventListener(type, releaseTouchDirection, { signal: listeners.signal });
  }
  addEventListener('blur', () => {
    if (touchDirection) releaseTouchDirection(touchDirection);
  }, { signal: listeners.signal });
  exploreControls.addEventListener('click', event => {
    const command = event.target.closest('button')?.dataset.mapCommand;
    if (!command || closing || battle || menu.active) return;
    if (moves.has(command) && event.detail !== 0) return;
    canvas.focus({ preventScroll: true });
    pressGameKey(command, false);
    if (moves.has(command)) held = undefined;
  }, { signal: listeners.signal });
  function restoreMapKeyboardFocus() {
    if (document.activeElement === canvas && document.visibilityState === 'visible') keyboard.focus('map');
  }

  canvas.addEventListener('focus', restoreMapKeyboardFocus, { signal: listeners.signal });
  addEventListener('focus', restoreMapKeyboardFocus, { signal: listeners.signal });
  document.addEventListener('visibilitychange', restoreMapKeyboardFocus, { signal: listeners.signal });
  battleContinue.addEventListener('click', continueBattle, { signal: listeners.signal });
  document.addEventListener('keydown', event => {
    if (battleResultPanel.hidden || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (!isConfirm(event.code) && event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (!event.repeat) continueBattle();
  }, { signal: listeners.signal });
  canvas.addEventListener('click', event => {
    if (battle) pickBattleCell(event);
    else clickToWalk(event);
  }, { signal: listeners.signal });
  addEventListener('pagehide', event => { if (!event.persisted) void close(); }, { signal: listeners.signal });
  if (wantsGpuGround) {
    canvas.dataset.groundMode = 'canvas';
    if (typeof host.renderSharedFrameWithLayers === 'function' && typeof host.createSharedLayer2D === 'function') {
      const { createGpuGround } = await import('./jyx2/scene/gpu-ground.mjs');
      gpuGround = createGpuGround({ engine, host, scope, textures, leaseFor: id => leasesById.get(id) });
      canvas.addEventListener('webglcontextlost', () => {
        if (!gpuGround || closing) return;
        restoringGpuGround = true;
        void host.whenReady().then(async () => {
          if (closing) return;
          restoringGpuGround = false;
          await rebuildGpuGround(gpuGroundSource);
          if (battle) battle.lastTime = performance.now();
        }).catch(error => {
          if (!closing) { void close(); fail(error); }
        });
      }, { signal: listeners.signal });
      await rebuildGpuGround(gpuGroundSource);
    } else gpuGroundSource = undefined;
  }
  if (wantsMap3d) {
    notice.textContent = `正在載入${isWorld ? '江湖大地图' : scene.name}的 3D 場景…`;
    try {
      const viewport = canvas.parentElement;
      const createNativeView = await loadNativeView();
      const options = isWorld ? { world: scene, places: scenes, canEnter } : { map: scene, textures, width, height, scale };
      map3dView = await createNativeView(viewport, canvas, options);
      if (closing) { map3dView.dispose(); return; }
      ground.visible = objects.visible = false;
      if (atmosphere) atmosphere.light.visible = false;
    } catch (error) {
      console.warn(`${isWorld ? '江湖大地图' : scene.name} 3D 素材無法載入，沿用原作畫面`, error);
    }
  }
  if (viewAttribute) canvas.dataset[viewAttribute] = map3dView ? '3d' : '2d';
  showCell();
  render(performance.now());
  await host.whenIdle();
  canvas.dataset.scene = String(destination.id);
  canvas.dataset.mode = isWorld ? 'world' : 'submap';
  canvas.dataset.phase = 'ready';
  notice.hidden = true;
  menuToggle.disabled = false;
  keyboard.focus('map');
  canvas.focus({ preventScroll: true });
  request = requestAnimationFrame(tick);
  maybePlayOpening();
}

function fail(error) {
  canvas.dataset.phase = 'failed';
  notice.textContent = `遊戲暫停 · ${describeError(error)}`;
  notice.hidden = false;
  menuToggle.disabled = true;
  console.error(error);
}

void start().catch(fail);
