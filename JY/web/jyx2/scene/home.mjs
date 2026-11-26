import { createImageData2D } from '@egret/engine';

const source = '/jyx2/scene/';
const sceneArt = new Map([
  [61, { filename: 'inn.json', replaces: innReplaces }],
  [70, { filename: 'home.json', replaces: homeReplaces }],
]);

export const nativeHomeSource = {
  sceneId: 70, assetDirectory: '/jyx2/home3d/', manifest: 'scene.json',
  actorDirectory: '/jyx2/home3d-actors/', modelIds: ['0', 'doll'],
};
export const homeExitTextures = {
  beam: new URL('../home3d/exit-lightbeam.png', import.meta.url).href,
  rays: new URL('../home3d/exit-rays.png', import.meta.url).href,
};

export async function readNativeSceneSpec({ sceneId, assetDirectory, manifest }) {
  const response = await fetch(assetDirectory + manifest);
  if (!response.ok) throw Error(`Could not load 3D scene ${sceneId}.`);
  const spec = await response.json();
  if (spec.scene !== sceneId || !/^[a-z0-9_.-]+\.glb$/i.test(spec.asset) || !spec.camera?.offset) {
    throw Error(`Invalid 3D scene manifest for ${sceneId}.`);
  }
  return spec;
}

export const hasJyx2Scene = id => sceneArt.has(id);

async function fetchAsset(name) {
  const response = await fetch(source + name);
  if (!response.ok) throw new Error(`JYX2 場景素材 ${name} 讀取失敗（${response.status}）`);
  return response;
}

async function loadAtlas(name) {
  const bitmap = await createImageBitmap(await (await fetchAsset(name)).blob());
  try {
    const { width, height } = bitmap;
    const canvas = Object.assign(document.createElement('canvas'), { width, height });
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    const pixels = new Uint8Array(context.getImageData(0, 0, width, height).data.buffer);
    return createImageData2D({ width, height, pixels });
  } finally {
    bitmap.close();
  }
}

export async function loadJyx2Scene(sceneId, scale) {
  const { filename, replaces } = sceneArt.get(sceneId);
  const manifest = await (await fetchAsset(filename)).json();
  if (manifest.scene !== sceneId) throw new Error(`JYX2 場景索引不符（${sceneId}）`);
  const atlases = await Promise.all(manifest.images.map(loadAtlas));
  const ground = [];
  const objects = [];
  const textures = new Map();
  for (const [index, tile] of manifest.tiles.entries()) {
    const id = 1_000_000 + index;
    const [x, y, width, height] = tile.rect;
    const [left, top] = tile.at;
    textures.set(id, { image: atlases[tile.page], region: { x, y, width, height }, dx: 0, dy: 0 });
    const layer = tile.kind === 'ground' ? ground : objects;
    layer.push({ id, px: left * scale, py: top * scale, scale, depth: tile.depth, rank: 1 });
  }
  return { ground, objects, textures, replaces };
}

function homeReplaces(item) {
  // Keep the original event sprites and yard art. Only the house's static art is replaced.
  const { x, y, rank, event } = item;
  const indoors = x >= 15 && (x <= 33 && y >= 17 && y <= 26 || x <= 23 && y >= 27 && y <= 37);
  return indoors && !event && (rank === 0 || rank === 1 || rank === 4);
}

function innReplaces({ x, y, rank, event }) {
  if (event) return false;
  if (rank === 0) return x >= 16 && x <= 45 && y >= 14 && y <= 28;
  return (rank === 1 || rank === 4) && x >= 17 && x <= 44 && y >= 15 && y <= 26;
}
