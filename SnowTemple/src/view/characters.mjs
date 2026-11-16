// Optional external bodies are packed in the same bind pose as the game's existing figures.
import { Mesh3D, loadGltf3D } from '@egret/engine/world3d';
import { BONES, YARD_BONES } from './rig.mjs';

const PATH = new URL('../../assets/characters/', import.meta.url);
const ROLES = ['hero', 'lu', 'blade', 'shield', 'bow'];
const LEVELS = ['high', 'mid', 'low'];

function bodyParts(root, palette) {
  const parts = [];
  root.traverse((node) => {
    if (!(node instanceof Mesh3D)) return;
    const bones = node.skeleton?.bones;
    const joints = node.geometry.getAttribute('joints');
    const weights = node.geometry.getAttribute('weights');
    if (node.isInstanced || bones?.length !== palette.length ||
        !bones.every((bone, index) => bone.name === palette[index]) ||
        !joints || !weights || joints.data.length !== weights.data.length ||
        joints.data.some((joint) => joint >= palette.length)) {
      throw Error('Character skin does not match the game rig');
    }
    node.updateWorldMatrix();
    if (node.matrixWorld.some((value, index) => Math.abs(value - (index % 5 === 0 ? 1 : 0)) > 0.0001)) {
      throw Error('Character mesh must use the game bind space');
    }
    parts.push({ geometry: node.geometry, material: node.material });
  });
  if (!parts.length) throw Error('Character has no body mesh');
  return parts;
}

async function loadCharacter(kind, level, signal) {
  const bitmaps = [];
  let asset, abandoned = false;
  const dispose = () => {
    abandoned = true;
    try {
      asset?.dispose();
    } finally {
      for (const bitmap of bitmaps.splice(0)) bitmap.close();
    }
  };
  try {
    const response = await fetch(new URL(kind + '-' + level + '.glb', PATH), { signal });
    if (!response.ok) throw Error('Character HTTP ' + response.status);
    asset = await loadGltf3D(new Uint8Array(await response.arrayBuffer()), {
      decodeImage: async ({ bytes, mimeType }) => {
        if (!bytes) throw Error('Character texture must be embedded');
        const bitmap = await createImageBitmap(new Blob([bytes], { type: mimeType }), {
          colorSpaceConversion: 'none', premultiplyAlpha: 'none'
        });
        if (abandoned) {
          bitmap.close();
          throw Error('Character asset already rejected');
        }
        bitmaps.push(bitmap);
        return bitmap;
      }
    });
    const palette = kind === 'hero' || kind === 'lu' ? BONES : YARD_BONES;
    return { parts: bodyParts(asset.scene, palette), dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}

/** Select only the level advertised in the same-origin availability list. */
export async function loadCharacterBodies(level, roles = ROLES) {
  const bodies = {}, failures = {}, loaded = [];
  const bundle = { bodies, failures, dispose: () => { for (const asset of loaded.splice(0)) asset.dispose(); } };
  if (!LEVELS.includes(level)) return bundle;
  const signal = AbortSignal.timeout(15000);
  let available;
  try {
    const response = await fetch(new URL('index.json', PATH), { signal });
    if (!response.ok) return bundle;
    available = await response.json();
  } catch {
    return bundle;
  }
  await Promise.all(ROLES.filter((kind) => roles.includes(kind) &&
    Array.isArray(available?.[kind]) && available[kind].includes(level)).map(async (kind) => {
    try {
      const asset = await loadCharacter(kind, level, signal);
      loaded.push(asset);
      bodies[kind] = asset.parts;
    } catch (error) {
      failures[kind] = error.message;
    }
  }));
  return bundle;
}
