import { Bitmap, Sprite, copyImageData2DPixels, createAssetRef, createAssetType, createImageData2D, createTexture, isTexture } from '@egret/engine';
import { createBrowserGamepadInput } from '@egret/engine/web/gamepad';
import { createBrowserAudio } from '@egret/engine/web/audio';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { createOpeningDialogue } from './opening-dialogue.mjs';
import { createOpeningReading } from './opening-reading.mjs';
import { loadOpening, openingEventId, playOpening } from './opening-event.mjs';
import { createBattleView } from './battle-view.mjs';
import { createBattleMenu } from './battle-menu.mjs';
import { attachNativeBattleControls } from './jyx2/ui/native/battle-ui.mjs';
import { createBattleResultUi } from './jyx2/ui/native/battle-result-ui.mjs';
import { mapHudWords } from './jyx2/ui/native/map-hud.mjs';
import { createBattleMusic } from './battle-music.mjs';
import { createWavEffects } from './wav-effects.mjs';
import { autoSlot, createSaveSlot, manualSlots } from './save-slot.mjs';
import { describeSaveSlot } from './save-info.mjs';
import { createClassicBattle, resolveClassicTeam } from './classic-battle.mjs';
import { canUseGear } from './battle-progression.mjs';
import { loadTrainer, playTrainer, trainerEventId } from './trainer-event.mjs';
import { modifySceneEvent } from './cifa-opening.mjs';
import { parseRecruitScript, runRecruitScript } from './cifa-recruit.mjs';
import { parseGameScript, runGameScript } from './cifa-game.mjs';
import { applyScenePatch, playGameEvent } from './game-events.mjs';
import { showWorldMenu } from './world-menu.mjs';
import { createNativeCommandInput, attachStageTap } from './jyx2/ui/native/native-input.mjs';
import { createInputMapping, createRawPadSample } from './jyx2/ui/native/input-mapping.mjs';
import { nativeSaveRequest, pickNativeSave, readPreferences, returnToTitle, showTitle } from './jyx2/ui/game-shell.mjs';
import { createWorldNavigation } from './jyx2/ui/world-navigation.mjs';
import { createMapHud } from './jyx2/ui/native/map-hud.mjs';
import { createExploreControls } from './jyx2/ui/native/explore-controls.mjs';
import { containBoard, boardPoint, designPoint } from './board-viewport.mjs';
import { createDialogueJournal } from './jyx2/ui/dialogue-journal.mjs';
import { findTilePath, screenToTile } from './kys-navigation.mjs';
import { createSceneAtmosphere } from './scene-atmosphere.mjs';
import { hasJyx2Scene, homeExitTextures, loadJyx2Scene, nativeHomeSource, readNativeSceneSpec } from './jyx2/scene/home.mjs';
import { loadActorArt } from './jyx2/actors/actor-art.mjs';
import { nativeBattleName } from './jyx2/scene/native-battle-fields.mjs';

let canvas = document.querySelector('#game');
const bootNotice = document.querySelector('#notice');
const touchExploration = matchMedia('(pointer: coarse)');
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

async function prepareHomeView() {
  const hints = [];
  const { assetDirectory, actorDirectory, modelIds } = nativeHomeSource;
  const playPath = new URL('./', import.meta.url);
  const root = new URL('../', playPath);
  const supportsFetchPreload = document.createElement('link').relList.supports('preload');

  function hint(url, rel) {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = url;
    if (rel === 'preload') {
      link.as = 'fetch';
      link.crossOrigin = 'anonymous';
    }
    hints.push(document.head.appendChild(link));
  }

  // These URLs are the same resources consumed by the model and exit-effect loaders.
  if (supportsFetchPreload) {
    for (const id of modelIds) hint(actorDirectory + id + '.glb', 'preload');
    for (const url of Object.values(homeExitTextures)) hint(url, 'preload');
  }
  const spec = readNativeSceneSpec(nativeHomeSource).then(data => {
    if (supportsFetchPreload) hint(assetDirectory + data.asset, 'preload');
    // Only the hosted /play shell uses these generated virtual module paths.
    if (playPath.pathname.endsWith('/play/') && Array.isArray(data.modulePreloads)) {
      for (const path of data.modulePreloads) hint(new URL(path, root).href, 'modulepreload');
    }
    return data;
  });
  try {
    const [module] = await Promise.all([import('./jyx2/scene/native-home-view.mjs'), spec]);
    return await module.prepareNativeHomeView(spec);
  } finally {
    void spec.then(removeHints, removeHints);
  }

  function removeHints() { for (const link of hints) link.remove(); }
}

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
  let save, saveError;
  try { save = await autoSave.read(); }
  catch (error) { saveError = error; }
  let catalogRequest;
  const loadCatalog = () => catalogRequest ??= json('/api/catalog').catch(error => {
    catalogRequest = undefined;
    throw error;
  });
  if (preview) baseline.location = { ...preview };
  if (!preview && (saveError || settings.get('title') === '1' || !save && settings.get('play') !== '1')) {
    save = await showTitle({ initial, baseline, autoSave, save, saveError, preferences, search: settings, loadCatalog });
  }
  const requestedStyle = settings.get('visual');
  const visualStyle = ['jyx2', 'classic', 'enhanced'].includes(requestedStyle) ? requestedStyle : preferences.visual;
  document.body.dataset.visual = visualStyle === 'classic' ? 'classic' : 'enhanced';
  document.body.dataset.art = visualStyle;
  const destination = save?.location ?? baseline.location;
  let preparedHome;
  if (visualStyle === 'jyx2' && destination.id === homeScene && settings.get('home') !== '2d') {
    // The player has selected a save or a new game. The GLBs can load alongside original data.
    preparedHome = prepareHomeView();
    void preparedHome.catch(() => {}); // openMap reports a load failure when it selects the fallback.
  }
  function takePreparedHome() {
    const pending = preparedHome;
    preparedHome = undefined;
    return pending;
  }
  try {
    const catalog = await loadCatalog();
    const game = {
      initial, baseline, autoSave, save, catalog, visualStyle, sound: preferences.sound, language: preferences.language,
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
    await openMap(game, destination, takePreparedHome);
  } finally {
    // An original-data failure can stop startup before the 3D view takes ownership.
    void preparedHome?.then(home => home.dispose(), () => {});
  }
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

async function openMap(game, destination, takePreparedHome) {
  const { initial, catalog } = game;
  const isWorld = destination.id === 'world';
  const groupName = isWorld ? 'mmap' : 'smap';
  canvas.dataset.phase = 'loading';
  bootNotice.hidden = false;
  bootNotice.textContent = game.language==='en'?'Loading game data…':'正在讀取遊戲資料…';
  const sceneRequest = isWorld
    ? game.world ?? json('/api/world').then(unpackMap)
    : sceneFor(game, destination.id);
  const availableRequest = isWorld
    ? game.worldArt ?? json('/api/art/mmap').then(ids => new Set(ids))
    : game.submapArt ?? json('/api/art/smap').then(ids => new Set(ids));
  const [scene, available, scenes] = await Promise.all([sceneRequest, availableRequest, game.scenes ?? json('/api/scenes')]);
  game.scenes = scenes;
  if (isWorld) {
    game.world = scene;
    game.worldArt = available;
  } else game.submapArt = available;
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
  bootNotice.textContent = game.language==='en'?'Loading terrain, buildings and character art…':'正在載入地形、建築和人物貼圖…';
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

  // A single Play host owns native fit, 2D submission and the map clock.
  // Fixed gameplay coordinates remain a contained board inside the expanded UI.
  // The 3D exploration renderer uses the full Play holder.
  const { createGameHost } = await import('./game-host.mjs');
  const outputAlpha = game.visualStyle === 'jyx2' ? 'premultiplied' : 'opaque';
  const semantics = createUiSemantics();
  const initialHud = { sceneName:isWorld?'江湖大地图':scene.name, coordinates:'—', hint:'方向鍵或 WASD 移動', notice:bootNotice.textContent, marker:'' };
  const viewport = canvas.parentElement;
  const placeholder = canvas;
  let liveCanvas;
  function adoptCanvas(next) {
    Object.assign(next.dataset,placeholder.dataset);
    next.id='game';
    next.tabIndex=0;
    next.setAttribute('aria-label',placeholder.getAttribute('aria-label') ?? 'Game');
    placeholder.remove();
    canvas=liveCanvas=next;
  }
  function restoreCanvas() {
    if (liveCanvas && canvas === liveCanvas) {
      for(const key of Object.keys(placeholder.dataset)) delete placeholder.dataset[key];
      Object.assign(placeholder.dataset,liveCanvas.dataset);
      liveCanvas.removeAttribute('id');
      viewport.prepend(placeholder);
      canvas = placeholder;
    }
  }
  let finishMap, closeMap;
  let mapHost;
  try { mapHost = await createGameHost({
    playOptions: { parent: viewport, width, height, portrait:{width:height,height:width},
      fit:'expand', uiScale:{min:1,max:1.4}, backend: 'webgl2', pixelRatio: wantsMap3d ? 3 : 1,
      transparent: outputAlpha === 'premultiplied', blendSpace: 'linear', audio: false,
      staticLayers: wantsGpuGround, renderMode: 'on-demand', semantics },
    onFrameTiming(sample) {
      if (liveCanvas && sample.outcome === 'submitted') liveCanvas.dataset.frame = String(sample.id);
    },
    onError(error) {
      void closeMap?.().catch(cleanup => console.warn('遊戲資源清理未完成', cleanup));
      fail(error);
    },
    async setup(nativeHost) {
  adoptCanvas(nativeHost.canvas);
  const canvas = nativeHost.canvas;
  const holder=canvas.parentElement;
  holder.classList.add('jy-play-holder');
  const host = nativeHost.renderHost;
  const engine = nativeHost.engine;
  const scope = engine.createScope();
  let map3dView;
  const disposeMapView = () => {
    const view = map3dView;
    map3dView = undefined;
    view?.dispose();
  };
  scope.use({ dispose: disposeMapView });
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
  let cachedGroundHidden = false;
  let groundCacheGeneration = 1;
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
  const worldBoard = nativeHost.world.addChild(scope.use(new Sprite()));
  const stageInput=nativeHost.ui.addChild(scope.use(new Sprite()));
  const boardMask = nativeHost.ui.addChild(scope.use(new Sprite()));
  const overlayBoard = nativeHost.ui.addChild(scope.use(new Sprite()));
  for (const board of [worldBoard,overlayBoard]) board.clipRect={x:0,y:0,width,height};
  boardMask.visible=false;
  let boardRect=containBoard(nativeHost.game.screen,width,height);
  function boardToStage(x,y) {
    const point=boardPoint(boardRect,x,y);
    return nativeHost.game.toStage(point.x,point.y);
  }
  function pickBoard(point) {
    const local=nativeHost.game.fromStage(point.x,point.y);
    return designPoint(boardRect,local.x,local.y);
  }
  function layoutBoard() {
    const screen=nativeHost.game.screen;
    stageInput.hitArea={x:screen.x,y:screen.y,width:screen.width,height:screen.height};
    boardRect=containBoard(screen,width,height);
    for (const board of [worldBoard,overlayBoard]) {
      board.x=boardRect.x; board.y=boardRect.y;
      board.scaleX=board.scaleY=boardRect.scale;
    }
    // Static ground placements are stage-wide; cover only expanded margins.
    // This clip never covers the independent full-screen exploration 3D canvas.
    const left=boardRect.x-screen.x, top=boardRect.y-screen.y;
    const g=boardMask.graphics;g.clear().beginFill(0x101d22);
    if(top>0)g.drawRect(screen.x,screen.y,screen.width,top)
      .drawRect(screen.x,boardRect.y+boardRect.height,screen.width,top);
    if(left>0)g.drawRect(screen.x,boardRect.y,left,boardRect.height)
      .drawRect(boardRect.x+boardRect.width,boardRect.y,left,boardRect.height);
    g.endFill();
    const origin=boardToStage(0,0), corner=boardToStage(width,height);
    const out=canvas.getBoundingClientRect(), outer=holder.getBoundingClientRect(), frame=nativeHost.frame;
    if (frame.width>0 && frame.height>0 && out.width>0 && out.height>0) {
      const cssX=out.width/frame.width, cssY=out.height/frame.height;
      for(const layer of holder.querySelectorAll('.battle3d-canvas')) Object.assign(layer.style,{
        inset:'auto',left:`${out.left-outer.left+origin.x*cssX}px`,top:`${out.top-outer.top+origin.y*cssY}px`,
        width:`${(corner.x-origin.x)*cssX}px`,height:`${(corner.y-origin.y)*cssY}px`
      });
    }
    requestFrame();
  }
  const root = worldBoard.addChild(scope.use(new Sprite()));
  const ground = root.addChild(scope.use(new Sprite()));
  const objects = root.addChild(scope.use(new Sprite()));
  const atmosphere = scene.id === 70 && game.visualStyle !== 'classic'
    ? await createSceneAtmosphere({ engine, scope, root, project, scale, outputAlpha }) : undefined;
  const initialFacing = destination.facing;
  const player = { id: 2501 + initialFacing * 7, rank: 2 };

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
  let closing = false;
  let closeTask;
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
  const menu = createBattleMenu(nativeHost.game, canvas, { portraitUrl: id => `/art/${portraitGroup}/${id}.png`, itemIconUrl,
    visualStyle: () => game.visualStyle, language: () => game.language,
    onActiveChange(active) { if (active) { held = undefined; pointerWalk = undefined; } } });
  const music = createBattleMusic(game.sound);
  let musicClosed = false;
  function closeMusic() {
    if (musicClosed) return;
    musicClosed = true;
    music.close();
  }
  scope.use({ dispose: closeMusic });
  let mapTrack = isWorld ? game.worldMusic ?? game.save?.flags?.mainMusic : scene.entranceMusic;
  let mapMusicStarted = false;
  let animationTick = 0;
  let lastAnimation = 0;
  let musicProbe = 0;
  let musicActive = false;
  let forcedPlayerPicture;
  const openingPoses = new Map();
  const listeners = new AbortController();
  scope.use({ dispose() { listeners.abort(); } });
  nativeHost.onScreenChange(layoutBoard,{signal:listeners.signal});
  layoutBoard();
  const projection = createBrowserSemantics({ semantics, canvas: nativeHost.canvas,
    width: nativeHost.frame.width, height: nativeHost.frame.height, label: 'JY game interface' });
  nativeHost.onScreenChange(() => projection.sync(nativeHost.frame), { signal: listeners.signal });
  scope.use({ dispose() { projection.dispose(); } });
  const mapHud=createMapHud(nativeHost.game,{signal:listeners.signal,language:()=>game.language,initial:initialHud});
  const {sceneName,coordinates,hint,notice,marker}=mapHud;
  const effects = scope.use(createWavEffects({ createAudio: createBrowserAudio, enabled: game.sound }));
  const activateEffects = event => { if (event.isTrusted && !event.repeat) effects.activate(); };
  for (const type of ['keydown', 'pointerup']) {
    document.addEventListener(type, activateEffects, { capture: true, signal: listeners.signal });
  }
  if (navigator.userActivation?.hasBeenActive) effects.activate();
  if (!game.openingDone && opening?.commands.some(({ name, args }) => name === 'PlayWave' && args[0] === 24)) {
    void effects.preload('wave', 24);
  }
  const journal = createDialogueJournal(game.dialoguePages ??= [], {
    game: nativeHost.game, language: () => game.language,
    signal: listeners.signal,
    restoreFocus: () => canvas.focus({ preventScroll: true }),
  });
  const openingReading = opening && createOpeningReading(initial.saveIdentity);
  let openingCommand;
  let exitGuideTimer;
  let exitGuideVisible=false;
  let explore;
  const openingExit = opening && scene.exits?.[0];
  const worldNavigation = isWorld && createWorldNavigation(nativeHost.game, {
    language: () => game.language,
    signal: listeners.signal,
    cancel() {
      cancelWorldRoute();
      canvas.focus({ preventScroll: true });
    },
  });
  const projectWorldTile = (x, y) => {
    if (map3dView) return map3dView.projectTile?.(x, y);
    const [px, py] = project(x, y);
    const point=boardToStage(px+root.x,py+root.y);
    return [point.x/nativeHost.frame.width,point.y/nativeHost.frame.height];
  };
  const battleHudUi = attachNativeBattleControls(nativeHost.game, canvas, {
    signal: listeners.signal, language: () => game.language,
    layout: 'compact', claimGameplayKeys: false,
    getState: () => battle?.model.state,
    getModel: () => battle?.model,
    getPreview: () => battle?.preview,
    getContext: () => ({
      prompt: canvas.dataset.battlePrompt, mode: canvas.dataset.battleCommandMode,
      invalid: canvas.dataset.battlePreview === 'invalid',
      title: sceneName.textContent,
      status: mapHudWords('coordinates', coordinates.textContent, game.language),
      hint: mapHudWords('hint', hint.textContent, game.language),
    }),
    isMenuActive: () => menu.active || journal.open,
    press(code) { if (battle && !menu.active) battleKeyDown(code, false); },
  });
  const battleResultUi = createBattleResultUi(nativeHost.game, {
    signal: listeners.signal, language: () => game.language,
    onContinue() {
      if (closing || !battle || battle.model.state.result === null) return;
      canvas.focus({ preventScroll: true });
      battle.resolve();
    },
  });
  const frameWaiters = [];
  let presenter;
  delete canvas.dataset.blocked;

  function requestFrame() { dirty = true; }

  function dropGpuGround(error) {
    gpuGround?.close();
    if (cachedGroundHidden && !battle && !map3dView) ground.visible = true;
    cachedGroundHidden = false;
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
        groundLayerReused: totals.reused, groundLayerResidentBytes: nativeHost.cache.getStatus().residentBytes,
        groundLayerGeneration: groundCacheGeneration });
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

  // The Play BrowserGame already owns the Engine's text cache. Native views and
  // legacy battle numbers must use that one public label/atlas surface.
  const speakerNames = new Map();
  for (const role of catalog.roles) {
    if (!role?.name) continue;
    if (speakerNames.has(role.headId)) speakerNames.set(role.headId, undefined);
    else speakerNames.set(role.headId, role.name);
  }
  speakerNames.set(114, '黑帝斯');
  const dialogue = createOpeningDialogue({
    game: nativeHost.game, engine, scope, width, height, requestFrame, presentFrame,
    language: () => game.language, onJournal: () => journal.show(), canJournal: () => journal.hasEntries,
    canSkipRead: () => Boolean(openingActive && openingReading?.known(openingCommand)),
    onSkipRead: skipKnownOpening, onAcknowledge() { if (openingActive) canvas.dataset.opening = 'running'; },
    density: wantsMap3d ? 3 : 1,
    bottomDocked: () => Boolean(map3dView),
    loadPortrait, speakerName: head => speakerNames.get(head),
    portraitUrl: id => `/art/${portraitGroup}/${id}.png`,
    onPage({ text, speaker, head, style, voice, page, pages }) {
      Object.assign(canvas.dataset, { talkText: text, talkHead: head, talkStyle: style, talkVoice: voice, talkPage: page, talkPages: pages });
      journal.record(speaker ?? (head < 0 ? '提示' : '對話'), text);
      if (openingActive) canvas.dataset.opening = 'talk';
      updateExploreControls();
      hint.textContent = `${touchExploration.matches ? '點畫面或按繼續' : '點擊畫面 / Enter 繼續'} · ${page}/${pages}`;
    },
  });
  if (opening && !game.openingDone && game.visualStyle === 'jyx2') void dialogue.prepareSkin();

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
    explore?.refresh();
  }

  function showCell() {
    updateExploreControls();
    canvas.dataset.x = String(x);
    canvas.dataset.y = String(y);
    coordinates.textContent = `格点 ${x} · ${y}`;
    const event = eventAt(x, y);
    marker.textContent = event?.event3 > 0 ? `经过事件 ${event.event3}` : '';
    const interaction = facingEvent();
    const trainerNearby = hasTrainer && facingOffsets.some(([dx, dy]) =>
      fits(scene, x + dx, y + dy) && eventAt(x + dx, y + dy)?.event1 === trainerEventId);
    hint.textContent = eventEnded ? '劇情完成 · 在江湖選單可返回主選單'
      : interaction?.id === trainerEventId ? (touchExploration.matches ? '黑帝斯 · 點「對話」可開始試煉' : '黑帝斯 · 按 Enter 開始試煉')
      : trainerNearby ? '面向黑帝斯，對話可開始試煉'
      : interaction ? (touchExploration.matches ? '點「對話」與面前人物交談' : 'Enter / 空格與 NPC 對話')
      : scene.exits?.some(([ex, ey]) => x === ex && y === ey) ? '已到达原作出口'
      : touchExploration.matches ? '點選地圖尋路，或使用方向鍵移動'
        : isWorld && map3dView ? '方向鍵 / WASD 移動 · 點擊地名進入' : '方向鍵或 WASD 移動';
  }

  function maybePlayOpening() {
    if (!opening || openingActive || game.openingDone || eventAt(x, y)?.event3 !== openingEventId) return false;
    openingActive = true;
    held = move = undefined;
    updateExploreControls();
    canvas.dataset.opening = 'running';
    canvas.dataset.animationFrames = '0';
    const slot = scene.layers.eventIndex[indexOf(x, y)];
    const view = {
      requestFrame,
      presentFrame,
      wave: id => effects.play('wave', id, { signal: listeners.signal }),
      async talk(options) {
        if (openingReading.shouldSkip(openingCommand)) return;
        if (await dialogue.talk(options)) openingReading.acknowledge(openingCommand);
      },
      command(name, index) {
        openingCommand = index;
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
    void playOpening({ opening, scene, slot, signal: listeners.signal, view }).then(async () => {
      forcedPlayerPicture = undefined;
      openingPoses.clear();
      await presentFrame();
      game.openingDone = true;
      await commitProgress();
      openingActive = false;
      const events = scene.events.slice(0, 2);
      canvas.dataset.openingResults = JSON.stringify({
        events,
        indices: events.map(event => scene.layers.eventIndex[indexOf(event.x, event.y)]),
        facing,
      });
      canvas.dataset.opening = 'complete';
      showCell();
      if (openingExit) {
        exitGuideVisible=true;updateExploreControls();
        exitGuideTimer = setTimeout(() => { exitGuideVisible=false;updateExploreControls(); }, 18000);
      }
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
    let soundSession = new AbortController();
    let soundSignal = AbortSignal.any([listeners.signal, soundSession.signal]);
    let view;
    let arena;
    let musicLive = false;
    function playSound(group, id) {
      void effects.play(group, id, { signal: soundSignal });
    }
    function resetSound() {
      soundSession.abort();
      soundSession = new AbortController();
      soundSignal = AbortSignal.any([listeners.signal, soundSession.signal]);
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
      // Warm a bounded set of opening skills while the arena and actors load.
      const skillIds = new Set([...spec.team, ...spec.enemy]
        .flatMap(role => (role.learnedMagics ?? []).slice(0, 2).map(skill => skill.id)));
      for (const id of [...skillIds].slice(0, 6)) {
        const skill = spec.magics[id];
        if (!skill) continue;
        void effects.preload('wave', skill.soundId);
        void effects.preload('hit', skill.effectId);
      }
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
            layoutBoard();
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
      const prepared = arena?.prepareOpeningPrograms(model.state.roles).catch(error => {
        console.warn('白鷺 World3D 戰場程式預備未完成', error);
      });
      view = await createBattleView({ engine, browser: nativeHost.game.browser, worldParent: worldBoard, overlayParent: overlayBoard,
        spec, width, height, scale, loadArt, bakeGround, json, visualStyle: game.visualStyle, outputAlpha, arena,
        itemEffectIds });
      await prepared;
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
        battle = { model, makeModel, view, arena, resolve, reject, resetSound, lastTime: performance.now() };
        canvas.dataset.battleAllies = model.state.roles.filter(role => role.side === 0).map(role => role.id).join(',');
        canvas.dataset.trainer = 'battle';
      });
      const state = battle.model.state;
      return { id, name: spec.name, won: state.result, settlement: state.settlement, inventoryDelta: state.inventoryDelta };
    } finally {
      soundSession.abort();
      menu.close();
      musicActive = musicLive = false;
      music.stop();
      mapMusicStarted = false;
      if (!closing) startMapMusic();
      Object.assign(canvas.dataset, { battleMusic: 'stopped', battleMusicLevel: 0 });
      battle = undefined;
      delete canvas.dataset.battleCommandMode;
      delete canvas.dataset.battlePreview;
      view?.close();
      arena?.dispose();
      ground.visible = objects.visible = !map3dView;
      map3dView?.setVisible(true);
      if (atmosphere) atmosphere.light.visible = !map3dView;
      sceneName.textContent = scene.name;
      notice.hidden = true;
      battleResultUi.hide();
      battleHudUi.update();
      mapHud.setBattleMode(false);
      if (!trainerActive) delete canvas.dataset.trainer;
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
    held = undefined;
    delete canvas.dataset.blocked;
    notice.hidden = true;
    let errorText;
    let saving = false, saved = false;
    try {
      const program = game.trainer ??= await loadTrainer();
      await playTrainer({ program, inventory: game.inventory, view: {
        talk(options) {
          canvas.dataset.trainer = 'talk';
          return dialogue.talk(options);
        },
        battle: fight,
        showItem: (id, amount) => showItemReward(id, amount, 'trainer'),
        async save(inventory, result) {
          saving = true;
          await saveTrainer(inventory, result);
          saved = true;
        },
      } });
    } catch (error) {
      if (listeners.signal.aborted) return;
      canvas.dataset.trainer = 'error';
      errorText = describeError(error);
    } finally {
      if (!closing) {
        trainerActive = false;
        showCell();
        if (errorText) {
          hint.textContent = `${saving && !saved ? '自動存檔失敗' : '試煉結算未完成'} · ${errorText}`;
        } else if (saved) {
          hint.textContent = `試煉已記錄 · 勝 ${canvas.dataset.wins} / 負 ${canvas.dataset.losses} · 自動存檔完成`;
          canvas.dataset.trainer = 'saved';
        }
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
          wave(id) { void effects.play('wave', id, { signal: listeners.signal }); },
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
        await leaveGame(command === 'title' ? returnToTitle : () => location.reload());
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
      const { location, detail } = describeSaveSlot(entry.save, scenes, catalog.roles);
      const name = entry.number === autoSlot ? '自動存檔 11' : `第 ${entry.number} 槽`;
      const title = `${name} · ${location}`;
      return { title, detail, label: detail ? `${title} · ${detail}` : title,
        value: entry, dataset: { saveSlot: entry.number } };
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
    if (worldNavigation) worldNavigation.hide();
    updateExploreControls();
    try {
      await showWorldMenu({ menu, signal: listeners.signal, game, catalog, bagOnly, canUseGear, actions: {
        history: journal.hasEntries ? () => journal.show() : undefined,
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
          await leaveGame(() => location.reload());
        },
        async new() {
          if (!await menu.askJoin(listeners.signal, '開始新遊戲並替換自動存檔？')) return;
          await game.autoSave.write(game.baseline);
          await leaveGame(() => location.reload());
        },
        async title() {
          await commitProgress();
          await leaveGame(returnToTitle);
        },
        async import() {
          const imported = await pickNativeSave();
          if (!imported) return;
          await game.autoSave.write(imported);
          await leaveGame(() => location.reload());
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
        showCell();
      }
    }
  }

  function showBattleResult(state) {
    canvas.dataset.trainer = 'result';
    canvas.dataset.battleResult = state.result ? 'win' : 'loss';
    delete canvas.dataset.battlePrompt;
    notice.hidden = true;
    const english = game.language === 'en';
    const experience = state.settlement.map(role => {
      const actor = state.roles.find(entry => entry.side === 0 && entry.id === role.id);
      const name = state.settlement.length > 1 && actor ? `${actor.name} ` : '';
      return english ? `${name}XP +${role.expGot}${role.levelsGained ? ` · Level ${role.level}` : ''}` : `${name}經驗 +${role.expGot}${role.levelsGained ? `，升至 ${role.level} 級` : ''}`;
    });
    const progress = state.progression.flatMap(({ roleId, practice, crafting }) => [
      practice && (english ? `${catalog.roles[roleId].name} · ${practice.name} × ${practice.times}` : `${catalog.roles[roleId].name} 修煉${practice.name} × ${practice.times}`),
      crafting && (english ? `Crafted ${catalog.items[crafting.itemId].name} × ${crafting.count}` : `製成 ${catalog.items[crafting.itemId].name} × ${crafting.count}`),
    ].filter(Boolean));
    const detail = trainerActive
      ? english ? `Continue to return to ${scene.name}; this ${state.result ? 'victory' : 'defeat'} will be recorded and saved automatically.` : `繼續後回到${scene.name}，記錄本場${state.result ? '勝利' : '戰敗'}並自動存檔。` : '';
    hint.textContent = '點擊「繼續」或按 Enter / 空格';
    battleHudUi.update();
    battleResultUi.show({ won: state.result, entries: [...experience, ...progress].filter(Boolean), detail });
  }

  function continueBattle() {
    if (!battle || battle.model.state.result === null) return;
    battleResultUi.continue();
  }

  const supportActions = [
    { label: '醫療', value: 'medicine' },
    { label: '解毒', value: 'detox' },
    { label: '用毒', value: 'poison' },
  ];

  function setBattleCursor(cell, preview = true) {
    battle.cursor = cell;
    battle.preview = cell && preview ? battle.model.previewCell(cell.x, cell.y) : null;
    if (battle.preview) canvas.dataset.battlePreview = battle.preview.type;
    else delete canvas.dataset.battlePreview;
    battle.drawnFrame = undefined;
  }

  function needsBattleConfirmation(type, touch) {
    return type === 'magic' || type === 'dart' || touch && type === 'move';
  }

  function syncBattleCursor() {
    const { state } = battle.model;
    const selection = state.selection;
    if (battle.selection !== selection) {
      battle.selection = selection;
      const cells = selection?.cells ?? [];
      const enemies = new Set(state.roles.filter(role => role.side !== state.turn?.side && !role.dead)
        .map(role => role.x + ',' + role.y));
      const cell = (selection?.type === 'magic' || selection?.type === 'dart' || selection?.type === 'poison')
        ? cells.find(cell => enemies.has(cell.x + ',' + cell.y)) ?? cells[0] : cells[0];
      setBattleCursor(cell, !touchExploration.matches || !needsBattleConfirmation(selection?.type, true));
      if (selection) canvas.dataset.battleCommandMode = selection.type;
      else delete canvas.dataset.battleCommandMode;
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
    if (best) setBattleCursor(best);
  }

  function chooseBattleCell(cell) {
    const { model } = battle;
    const selection = model.state.selection;
    if (!cell || !selection || canvas.dataset.battlePreview === 'invalid' || !model.selectCell(cell.x, cell.y)) return;
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

  function battleCellAt(stagePoint, selection) {
    const point=pickBoard(stagePoint);
    if(!point)return undefined;
    const tile = battle.view.tileAt(point.x,point.y);
    return selection.cells.find(cell => cell.x === tile.x && cell.y === tile.y);
  }

  function pickBattleCell(point) {
    if (menu.active || canvas.dataset.battlePrompt) return;
    const { state } = battle.model;
    if (!state.canAct || !state.selection) return;
    const selectable = battleCellAt(point, state.selection);
    canvas.focus({ preventScroll: true });
    if (!selectable) {
      setBattleCursor(battle.cursor, false);
      canvas.dataset.battlePreview = 'invalid';
      return;
    }
    setBattleCursor(selectable);
    const touch = point.source === 'touch' || touchExploration.matches;
    if (needsBattleConfirmation(state.selection.type, touch)) return;
    chooseBattleCell(selectable);
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
          battle.resetSound();
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
        if (state.selection) setBattleCursor({ x: state.turn.x, y: state.turn.y }, false);
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

  function cancelWorldRoute() {
    const name = pointerWalk?.destination?.name;
    pointerWalk = undefined;
    if (name) worldNavigation.show('cancelled', name, '已取消尋路');
  }

  function clickToWalk(point) {
    if (canvas.dataset.phase !== 'ready') return;
    canvas.focus({ preventScroll: true });
    if (closing || battle || eventEnded) return;
    if (openingActive || trainerActive || recruitActive || eventActive || worldMenuActive) {
      if (!menu.active && dialogue.confirm() && openingActive) canvas.dataset.opening = 'running';
      return;
    }
    const u=point.x/nativeHost.frame.width,v=point.y/nativeHost.frame.height;
    const board=map3dView?undefined:pickBoard(point);
    const hit = map3dView ? map3dView.pick(u, v) : board && screenToTile(board.x,board.y,root.x,root.y,scale);
    const exit = hit?.exit && scene.exits?.[0];
    const target = exit ? { x: exit[0], y: exit[1] } : hit;
    queueWalk(target);
  }

  function queueWalk(target) {
    if (!target || !fits(scene, target.x, target.y)) {
      if (worldNavigation) {
        held = pointerWalk = undefined;
        worldNavigation.show('unreachable', '無法到達', '請點選可通行的地面或地標');
      }
      return;
    }
    held = undefined;
    pointerWalk = undefined;
    const npc = eventAt(target.x, target.y);
    const canTalk = npc?.event1 > 0 && initial.config.useScript && catalog.eventIds.has(npc.event1);
    const entrance = isWorld ? entranceAt(target.x, target.y) : undefined;
    const goals = canTalk || entrance ? facingOffsets.map(([dx, dy]) => ({ x: target.x - dx, y: target.y - dy })) : [target];
    const start = move ?? { x, y };
    const path = findTilePath(start, goals, canWalk);
    const destination = isWorld ? { ...target, name: entrance?.name ?? '地圖落點' } : undefined;
    if (!path) {
      if (destination) worldNavigation.show('unreachable', destination.name, '找不到可通行的路線，請改點附近地面');
      return;
    }
    pointerWalk = { path, target: canTalk || entrance ? target : undefined, entrance, destination };
    if (destination) worldNavigation.show('walking', destination.name, '沿路前往 · 點地面可改道');
    return true;
  }

  function drawWorldRoute(x, y) {
    const route = pointerWalk;
    if (!route?.destination) return;
    const steps = move ? [move, ...route.path.slice(0, 13)] : route.path;
    worldNavigation.draw(projectWorldTile, { x, y }, steps, route.destination);
  }

  function advancePointerWalk(now) {
    const step = pointerWalk.path.shift();
    if (step) {
      if (pointerWalk.destination && !canWalk(step.x, step.y)) {
        worldNavigation.show('unreachable', pointerWalk.destination.name, '路線已受阻，請重新選擇目的地');
        pointerWalk = undefined;
        return;
      }
      tryMove(facingKeys[step.facing], now);
      return;
    }
    const { target, entrance, destination } = pointerWalk;
    pointerWalk = undefined;
    if (destination) worldNavigation.show('arrived', destination.name, '已到達');
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

  function nativeMapFrame(tileX, tileY, elapsedMs, flags = {}) {
    const people = sceneActors.flatMap(person => {
      const event = displayedEvents[person.slot];
      if (!event || event.currentPic <= 0) return [];
      return [{ ...person, x: event.x, y: event.y, animation: openingPoses.get(person.slot), interactive: event.event1 > 0 }];
    });
    const props = map3dView.propSlots.flatMap(slot => displayedEvents[slot] ? [{ slot, ...displayedEvents[slot] }] : []);
    return {
      x: tileX, y: tileY, direction: facing, hidden: hiddenPlayer, people, props, opacity: root.alpha, elapsedMs,
      cameraFocus: cameraOverride, stageEvent: openingActive ? openingEventId : recruitActive ? Number(canvas.dataset.eventId) : undefined,
      heroAnimation: openingPoses.get(-1), sceneEvents: displayedEvents, animationTick,
      animateEvents: !openingActive && !trainerActive && !recruitActive && !eventActive,
      heroPicture: forcedPlayerPicture, ...flags,
    };
  }

  function render(now) {
    if (buildingGpuGround || restoringGpuGround) return;
    boardMask.visible=!battle&&!map3dView;
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
          ? (canvas.dataset.battlePreview === 'invalid' ? '這格不在可選範圍 · 請選高亮格'
            : touchExploration.matches ? '點高亮格選擇 · 預覽後點「確定」'
              : '點選高亮格子 · 方向鍵選格 · Enter 確認 · Esc 取消')
          : state.canAct ? battleHint()
            : state.auto ? (touchExploration.matches ? '自動戰鬥中 · 再點「自動」恢復手動' : '自動戰鬥中 · Tab 恢復手動')
              : '等待行動完成';
        if (hint.textContent !== nextHint) hint.textContent = nextHint;
      }
      battleHudUi.update();
      if (host.getStatus().pendingFrames === 0 && battle.drawnFrame !== state.frame) {
        view.draw(state, battle.cursor, battle.preview);
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
      try {
        const refresh = pendingScene3d && map3dView.setScene;
        if (refresh) map3dView.setScene(pendingScene3d);
        pendingScene3d = undefined;
        const updated = map3dView.update(nativeMapFrame(tx, ty, now, {
          moving: walking, sailing, force: Boolean(refresh || frameWaiters.length),
        }));
        // Project against the camera used for the displayed World3D frame.
        if (updated) drawWorldRoute(tx, ty);
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
    drawWorldRoute(tx, ty);
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
    const useGpuGround = gpuGround && (ground.visible || cachedGroundHidden) && root.alpha === 1;
    if (!useGpuGround) {
      if (cachedGroundHidden) { ground.visible = true; cachedGroundHidden = false; }
      drawItems(ground, mapGroundToDraw, root.x, root.y);
    }
    drawItems(objects, ordered, root.x, root.y);
    drawnHeroArt = heroArt;
    drawnRecruitArt = recruitArt;
    // Movement continues independently. Keep the newest scene dirty until the previous submission drains.
    submitFrame(useGpuGround);
  }

  function submitFrame(useGpuGround = false) {
    // Cached layers are persistent Play placements. Hide the live ground until
    // the next non-cached map paint, not just during this synchronous call.
    if (useGpuGround) {
      try {
        const origin=boardToStage(root.x,root.y);
        gpuGround.place(origin.x,origin.y,boardRect.scale,nativeHost.frame.width,nativeHost.frame.height);
        ground.visible = false;
        cachedGroundHidden = true;
      } catch (error) {
        if (restoringGpuGround) return;
        dropGpuGround(error);
        ground.visible = true;
        drawItems(ground, mapGroundToDraw, root.x, root.y);
      }
    } else {
      gpuGround?.clearPlacement();
      if (cachedGroundHidden && !battle && !map3dView) ground.visible = true;
      cachedGroundHidden = false;
    }
    dirty = false;
    nativeHost.invalidate();
    // These waits are issued only now, after the original map/battle painter
    // has actually prepared the wanted scene and passed its pending-frame gate.
    // A retained/refused Play turn cannot acknowledge an event-script barrier.
    const waiters = frameWaiters.splice(0);
    if (waiters.length) void nativeHost.presentFrame({ scene: presenter, signal: listeners.signal }).then(
      receipt => waiters.forEach(waiter => waiter.resolve(receipt.timingId)),
      error => waiters.forEach(waiter => waiter.reject(error)),
    );
  }

  async function leaveGame(navigate) {
    await close().catch(error => console.warn('遊戲資源清理未完成', error));
    navigate();
  }

  function close() {
    if (closing) return closeTask ?? Promise.resolve();
    closing = true;
    clearTimeout(exitGuideTimer);
    exitGuideVisible=false;
    explore?.clearHeld('scene closed');
    listeners.abort();
    if (globalThis.__jyNativeQa?.host === nativeHost) delete globalThis.__jyNativeQa;
    battleResultUi.hide();
    menu.close();
    closeMusic();
    battle?.reject(listeners.signal.reason);
    dialogue?.close();
    disposeMapView();
    gpuGround?.close();
    for (const key of ['groundMode', 'groundLayerBuilds', 'groundLayerReused', 'groundLayerResidentBytes', 'groundLayerGeneration']) {
      delete canvas.dataset[key];
    }
    if (viewAttribute) delete canvas.dataset[viewAttribute];
    for (const waiter of frameWaiters.splice(0)) waiter.reject(listeners.signal.reason);
    return closeTask = nativeHost.dispose().finally(restoreCanvas);
  }
  closeMap = close;

  function pressGameKey(code, repeat, consume = () => {}) {
    if (canvas.dataset.phase !== 'ready') return;
    if (journal.open) { if (journal.handleKey?.(code, repeat)) consume(); return; }
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
    cancelWorldRoute();
    held = code;
    tryMove(code, performance.now());
  }
  // Native Play owns physical keyboard and standard pad actions. The low-level
  // official pad source is retained only for unexposed stick buttons, analog
  // trigger values and raw axes, preserving the established input thresholds.
  const extraPad=scope.use(createBrowserGamepadInput({optional:true}));
  let nativeInput;
  const rawPad=createRawPadSample({
    source:extraPad,
    active:()=>document.visibilityState==='visible'&&document.hasFocus()&&document.activeElement===canvas,
    onReset:reason=>nativeInput?.suspend(reason)
  });
  function inputMode() {
    if(closing||canvas.dataset.phase!=='ready'||document.visibilityState!=='visible'||!document.hasFocus())return undefined;
    if(journal.open)return {mode:'journal',owner:journal};
    if(menu.active)return {mode:canvas.dataset.trainer==='team'?'team':'menu',owner:menu.getView?.()??menu};
    if(battle) {
      if (battleResultUi.active || battle.model.state.result !== null || canvas.dataset.battlePrompt)
        return {mode:'native-battle-modal',owner:battleResultUi.active ? battleResultUi : battleHudUi};
      return {mode:'battle',owner:battle};
    }
    if(openingActive||trainerActive||recruitActive||eventActive||worldMenuActive)return {mode:'script',owner:dialogue};
    return {mode:'map',owner:canvas};
  }
  nativeInput=createNativeCommandInput({
    game:nativeHost.game,signal:listeners.signal,readMode:inputMode,
    ...createInputMapping(moves.keys(),battleControls),
    readExtra:rawPad.sample,readAxis:()=>rawPad.axis,
    emit({mode,owner,command,phase,reason}){
      const now=inputMode();
      if(phase==='release'){
        if((mode==='menu'||mode==='team')&&now?.owner===owner&&reason==='release')menu.handleKey(command,true);
        if(held===command){held=undefined;dirty=true;}
        return;
      }
      if(now?.owner!==owner)return;
      if(mode==='menu'||mode==='team'){menu.handleKey(command,false);return;}
      pressGameKey(command,phase==='repeat');
    }
  });
  explore=createExploreControls({game:nativeHost.game,signal:listeners.signal,language:()=>game.language,
    readState() {
      const reading=openingActive||trainerActive||recruitActive||eventActive;
      return {visible:!closing&&!reading&&!worldMenuActive&&!battle&&!menu.active&&!journal.open&&!dialogue.presenting,
        canMove:!reading&&!worldMenuActive&&!eventEnded,canInteract:!eventEnded,reading,
        showExit:exitGuideVisible,showMovement:touchExploration.matches,showHistory:false,showSkipRead:false};
    },
    onMoveDown:code=>pressGameKey(code,false),
    onMoveUp:code=>{if(held===code){held=undefined;dirty=true;}},
    onCommand:code=>pressGameKey(code,false),
    onExit:goToOpeningExit,onHistory:()=>journal.show(),onSkipRead:skipKnownOpening
  });
  addEventListener('blur',()=>{explore.clearHeld('blur');nativeInput.suspend('blur');},{signal:listeners.signal});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'){explore.clearHeld('hidden');nativeInput.suspend('hidden');}},{signal:listeners.signal});
  function skipKnownOpening() {
    if (!openingActive || !dialogue.waiting || !openingReading?.start(openingCommand)) return;
    if (dialogue.skip()) canvas.dataset.opening = 'running';
  }
  function goToOpeningExit() {
    if (!openingExit || closing || openingActive || trainerActive || recruitActive || eventActive || worldMenuActive || battle) return;
    canvas.focus({ preventScroll: true });
    if (queueWalk({ x: openingExit[0], y: openingExit[1] })) {exitGuideVisible=false;updateExploreControls();}
  }
  // The native input router delivers a tap to the world only when its
  // contact began and ended on that lower-layer target. UI activation cannot
  // close a menu and then fall through as another world click.
  function uiOwnsStagePoint(point) {
    if(menu.active || journal.open || battleResultUi.active || battleHudUi.ownsPoint(point)) return true;
    return semantics.snapshot.nodes.some(node=>{
      const b=node.bounds;
      return !node.inert&&b&&(node.actions.length||['button','switch','checkbox','tab','option'].includes(node.role))
        &&point.x>=b.x&&point.x<=b.x+b.width&&point.y>=b.y&&point.y<=b.y+b.height;
    });
  }
  attachStageTap(nativeHost.game,stageInput,point=>{
    if(uiOwnsStagePoint(point))return;
    if(battle)pickBattleCell(point);else clickToWalk(point);
  },{signal:listeners.signal});
  function updateBattleHover() {
    const state=battle?.model.state;
    if(nativeHost.game.device!=='mouse'||!state?.canAct||state.selection?.type!=='move'
      ||menu.active||canvas.dataset.battlePrompt)return;
    const point=nativeHost.game.toStage(nativeHost.game.pointer.x,nativeHost.game.pointer.y);
    if(uiOwnsStagePoint(point))return;
    const cell=battleCellAt(point,state.selection);
    if(cell&&(cell!==battle.cursor||!battle.preview))setBattleCursor(cell);
  }
  addEventListener('pagehide', event => { if (!event.persisted) void close(); }, { signal: listeners.signal });
  if (wantsGpuGround) {
    canvas.dataset.groundMode = 'canvas';
    if (nativeHost.cache) {
      const { createGpuGround } = await import('./jyx2/scene/gpu-ground.mjs');
      gpuGround = createGpuGround({ engine, host, cache: nativeHost.cache, scope, textures, leaseFor: id => leasesById.get(id) });
      canvas.addEventListener('webglcontextlost', () => {
        if (!gpuGround || closing) return;
        restoringGpuGround = true;
        groundCacheGeneration++;
        gpuGround.clearPlacement();
        if (cachedGroundHidden && !battle && !map3dView) ground.visible = true;
        cachedGroundHidden = false;
        void nativeHost.cache.whenReady().then(async () => {
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
      const options = isWorld ? { world: scene, places: scenes, canEnter, uiGame:nativeHost.game,language:()=>game.language }
        : { map: scene, textures, width, height, scale };
      const prepared = await takePreparedHome?.();
      const createNativeView = prepared?.create ?? await loadNativeView();
      map3dView = await createNativeView(viewport, canvas, options);
      if (closing || scope.signal.aborted) { disposeMapView(); return; }
      if (map3dView.prepareFirstFrame) {
        await map3dView.prepareFirstFrame(nativeMapFrame(x, y, performance.now()));
        if (closing || scope.signal.aborted) { disposeMapView(); return; }
      }
      ground.visible = objects.visible = false;
      if (atmosphere) atmosphere.light.visible = false;
    } catch (error) {
      if (closing) return;
      map3dView?.dispose();
      map3dView = undefined;
      console.warn(`${isWorld ? '江湖大地图' : scene.name} 3D 素材無法載入，沿用原作畫面`, error);
    }
  }
  if (viewAttribute) canvas.dataset[viewAttribute] = map3dView ? '3d' : '2d';
  showCell();
  // Preserve the original 3D draw / camera projection / 2D preparation order.
  // The presenter is a single owner for this map and its temporary battle; both
  // existing World3D renderers remain caller-owned. No second map/controller RAF.
  presenter = nativeHost.createScene({
    name: 'map',
    update() {
      if (closing) return;
      const now = performance.now();
      nativeInput.sample(now);
      if(closing)return;
      explore.sync();
      mapHud.setCovered(dialogue.presenting||menu.active||journal.open);
      mapHud.setBattleMode(Boolean(battle));
      updateBattleHover();
      render(now);
    }
  });
  nativeHost.activateScene(presenter);
  render(performance.now());
  // Play setup must return before waiting for an accepted native submission.
  finishMap = async () => {
    try { await nativeHost.presentFrame({ scene: presenter, signal: listeners.signal }); }
    catch (error) { if (closing || listeners.signal.aborted) return; throw error; }
    if (closing) return;
    // Native 2D has accepted its first frame; retain only pre-host boot/error DOM text.
    bootNotice.hidden = true;
    if (viewSettings.get('qa') === '1') globalThis.__jyNativeQa = {
      semantics, game: nativeHost.game, host: nativeHost, menu, journal, battleControls: battleHudUi, battleResult: battleResultUi,
    };
    canvas.dataset.scene = String(destination.id);
    canvas.dataset.mode = isWorld ? 'world' : 'submap';
    canvas.dataset.phase = 'ready';
    notice.hidden = true;
    canvas.focus({ preventScroll: true });
    maybePlayOpening();
  };
    },
  }); } catch(error) { restoreCanvas(); throw error; }
  try { await finishMap?.(); }
  catch (error) { await mapHost.dispose().catch(() => {}); restoreCanvas(); throw error; }
}

function fail(error) {
  canvas.dataset.phase = 'failed';
  bootNotice.textContent = `${document.documentElement.lang==='en'?'Game paused':'遊戲暫停'} · ${describeError(error)}`;
  bootNotice.hidden = false;
  console.error(error);
}

void start().catch(fail);
