import { createImageData2D } from '@egret/engine';

const root = '/jyx2/actors/';
const clips = ['idle', 'walk', 'attack', 'guard', 'dodge', 'hit', 'defeat'];
const capacity = 64;
// Shared-frame capture budgets charge the entire backing image for each visible frame.
const framesPerPage = 3;
const sheets = new Map();
let manifest;

function textureId(role, clip, row, column) {
  return 2_000_000 + ((role * clips.length + clips.indexOf(clip)) * 4 + row) * capacity + column;
}

async function asset(name) {
  const response = await fetch(root + name);
  if (!response.ok) throw new Error(`角色畫面 ${name} 讀取失敗（${response.status}）`);
  return response;
}

function loadManifest() {
  return manifest ??= asset('manifest.json').then(response => response.status === 204
    ? { version: 1, actors: {} } : response.json()).then(value => {
    if (value.version !== 1 || !value.actors) throw new Error('未知的角色圖集格式');
    return value.actors;
  }).catch(error => {
    console.warn('角色圖集載入失敗，沿用原作畫面', error);
    return {};
  });
}

function validSheet(sheet) {
  return /^[0-9]+-[a-z]+\.png$/.test(sheet.image)
    && Number.isInteger(sheet.frames) && sheet.frames >= 1 && sheet.frames <= capacity
    && [sheet.cellWidth, sheet.cellHeight].every(value => Number.isInteger(value) && value > 0 && value <= 128)
    && Number.isFinite(sheet.fps) && sheet.fps > 0
    && Number.isFinite(sheet.anchorX) && Number.isFinite(sheet.anchorY)
    && Array.isArray(sheet.directions) && sheet.directions.length === 4
    && [0, 1, 2, 3].every(direction => sheet.directions.includes(direction));
}

async function decodeSheet(sheet) {
  if (!validSheet(sheet)) throw new Error('角色圖集尺寸、方向或錨點無效');
  const bitmap = await createImageBitmap(await (await asset(sheet.image)).blob());
  try {
    const { width, height } = bitmap;
    if (width !== sheet.cellWidth * sheet.frames || height !== sheet.cellHeight * sheet.directions.length) {
      throw new Error(`角色圖集尺寸與清單不符：${sheet.image}`);
    }
    const canvas = Object.assign(document.createElement('canvas'), { width, height });
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    return sheet.directions.map((_, row) => Array.from({ length: Math.ceil(sheet.frames / framesPerPage) }, (_, page) => {
      const first = page * framesPerPage;
      const pageWidth = Math.min(framesPerPage, sheet.frames - first) * sheet.cellWidth;
      const { data } = context.getImageData(first * sheet.cellWidth, row * sheet.cellHeight, pageWidth, sheet.cellHeight);
      return createImageData2D({ width: pageWidth, height: sheet.cellHeight, pixels: new Uint8Array(data) });
    }));
  } finally {
    bitmap.close();
  }
}

function loadSheet(sheet) {
  if (!sheets.has(sheet.image)) sheets.set(sheet.image, decodeSheet(sheet).catch(error => {
    console.warn('個別角色動作載入失敗，沿用原作畫面', error);
    return undefined;
  }));
  return sheets.get(sheet.image);
}

export async function loadActorArt(requestedRoles, scale, requestedClips = clips) {
  const textures = new Map();
  const animations = new Map();
  if (!requestedRoles.length) return { textures, frame: () => undefined };
  const catalogue = await loadManifest();
  const wanted = [...new Set(requestedRoles)].filter(role => Number.isInteger(role) && role >= 0 && Object.hasOwn(catalogue, role));
  const entries = await Promise.all(wanted.flatMap(role => requestedClips.flatMap(clip => {
    const sheet = catalogue[role]?.sheets?.[clip];
    return sheet ? [loadSheet(sheet).then(pages => ({ role, clip, sheet, pages }))] : [];
  })));
  for (const { role, clip, sheet, pages } of entries) {
    if (!pages) continue;
    const { cellWidth: width, cellHeight: height, anchorX, anchorY, directions, frames } = sheet;
    animations.set(`${role}:${clip}`, sheet);
    for (const [row] of directions.entries()) {
      for (let column = 0; column < frames; column++) {
        textures.set(textureId(role, clip, row, column), {
          image: pages[row][Math.floor(column / framesPerPage)], scale, dx: anchorX * scale, dy: anchorY * scale,
          region: { x: column % framesPerPage * width, y: 0, width, height },
        });
      }
    }
  }
  return {
    textures,
    frame(role, clip, direction, elapsedMs) {
      const sheet = animations.get(`${role}:${clip}`);
      if (!sheet) return undefined;
      const row = sheet.directions.indexOf(direction);
      if (row < 0) return undefined;
      const elapsedFrames = Math.max(0, Math.floor(elapsedMs * sheet.fps / 1000));
      const column = sheet.loop ? elapsedFrames % sheet.frames : Math.min(elapsedFrames, sheet.frames - 1);
      return textureId(role, clip, row, column);
    },
  };
}
