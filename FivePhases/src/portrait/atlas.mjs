// 接缝与关节使用同一张原画的坐标，打包位置只决定从哪里取像素。
export const ATLAS_PORTRAITS = ['fire', 'shanjiao', 'chijiao', 'hundun'];

const isName = (name) => typeof name === 'string' && /^[a-z][a-z0-9_-]*$/.test(name);
const positive = (n) => Number.isSafeInteger(n) && n > 0;
const pair = (v) => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite);

export function portraitFromAtlas(id, manifest, atlasWidth, atlasHeight) {
  const invalid = (detail) => new Error(`立绘 ${id}：${detail}`);
  if (!ATLAS_PORTRAITS.includes(id)) throw invalid('未知立绘');
  const { canvas, anchor, bones: rawBones, parts: rawParts, name } = manifest ?? {};
  if (!positive(canvas?.width) || !positive(canvas?.height) || !pair(anchor) ||
      !positive(atlasWidth) || !positive(atlasHeight) || !Array.isArray(rawBones) ||
      !Array.isArray(rawParts) || !rawParts.length) {
    throw invalid('无效的画布、图集或部件数据');
  }

  const boneById = new Map();
  for (const bone of rawBones) {
    const { id: key, x, y, parent = null } = bone ?? {};
    if (!isName(key) || !Number.isFinite(x) || !Number.isFinite(y) || boneById.has(key) ||
        (parent !== null && !isName(parent))) throw invalid('无效或重复的骨骼');
    boneById.set(key, { id: key, parent, x, y });
  }
  if (rawBones.filter((bone) => bone.parent == null).length !== 1) throw invalid('骨架需要一根根骨');
  const boneOrder = new Map();
  const pending = new Set();
  function collectBone(key) {
    if (boneOrder.has(key)) return;
    if (pending.has(key)) throw invalid(`骨骼存在循环：${key}`);
    const bone = boneById.get(key);
    if (!bone) throw invalid(`未知父骨：${key}`);
    pending.add(key);
    if (bone.parent) collectBone(bone.parent);
    pending.delete(key);
    boneOrder.set(key, bone);
  }
  for (const key of boneById.keys()) collectBone(key);

  const names = new Set();
  const parts = rawParts.map((part, layer) => {
    const { id: key, bone, rect, at, pivot = [0.5, 0.5] } = part ?? {};
    if (!isName(key) || names.has(key) || !boneById.has(bone) ||
        !Array.isArray(rect) || rect.length !== 4 || !rect.every(Number.isSafeInteger) ||
        !pair(at) || !pair(pivot) || pivot.some((v) => v < 0 || v > 1)) {
      throw invalid(`无效或重复的部件：${key}`);
    }
    names.add(key);
    const [x, y, w, h] = rect;
    if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > atlasWidth || y + h > atlasHeight) {
      throw invalid(`部件越出图集：${key}`);
    }
    const socket = boneById.get(bone);
    return {
      id: key, bone, layer, rect: [...rect], size: [w, h], pivot: [...pivot], rotation: 0,
      offset: [at[0] + pivot[0] * w - socket.x, at[1] + pivot[1] * h - socket.y],
    };
  });
  return {
    id, name: typeof name === 'string' && name ? name : id, canvas: { ...canvas }, anchor: [...anchor],
    bones: [...boneOrder.values()], parts, atlas: { width: atlasWidth, height: atlasHeight },
  };
}

export async function loadPortraitAtlas(game, id, fetchManifest = globalThis.fetch) {
  if (!ATLAS_PORTRAITS.includes(id)) throw new Error(`未知立绘：${id}`);
  const art = new URL(`../../assets/portraits/${id}/`, import.meta.url);
  const response = await fetchManifest(new URL('rig.json', art));
  if (!response.ok) throw new Error(`读取立绘清单失败：${id} HTTP ${response.status}`);
  const manifest = await response.json();
  const textureLease = await game.loadTexture(new URL('atlas.png', art).href);
  const { width, height } = textureLease.value;
  const portrait = portraitFromAtlas(id, manifest, width, height);
  return { portrait, textureLease };
}
