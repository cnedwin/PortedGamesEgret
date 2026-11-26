// Optional external bodies are packed in the same bind pose as the game's existing figures.
import { createAssetRef, createAssetType } from '@egret/engine';
import { Mesh3D, loadGltf3D } from '@egret/engine/world3d';
import { BONES, YARD_BONES } from './rig.mjs';

const PATH = new URL('../../assets/characters/', import.meta.url);
const ROLES = ['hero', 'lu', 'blade', 'shield', 'bow'];
const LEVELS = ['high', 'mid', 'low'];
const CHARACTER_BODY = createAssetType('snowtemple.character-body', (value) =>
  value !== null && typeof value === 'object' && ROLES.includes(value.kind) &&
  (typeof value.error === 'string' || (value.parts?.length > 0 && typeof value.dispose === 'function')));
const registered = new WeakSet();

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
    parts.push({ mesh: node, geometry: node.geometry, material: node.material });
  });
  if (!parts.length) throw Error('Character has no body mesh');
  return parts;
}

async function loadCharacter(kind, level, signal) {
  const bitmaps = [];
  let asset, abandoned = false;
  const dispose = () => {
    if (abandoned) return;
    abandoned = true;
    try {
      asset?.dispose();
    } finally {
      for (const bitmap of bitmaps.splice(0)) bitmap.close();
    }
  };
  try {
    signal.throwIfAborted();
    const response = await fetch(new URL(kind + '-' + level + '.glb', PATH), { signal });
    if (!response.ok) throw Error('Character HTTP ' + response.status);
    const bytes = new Uint8Array(await response.arrayBuffer());
    signal.throwIfAborted();
    asset = await loadGltf3D(bytes, {
      decodeImage: async ({ bytes, mimeType }) => {
        signal.throwIfAborted();
        if (!bytes) throw Error('Character texture must be embedded');
        const bitmap = await createImageBitmap(new Blob([bytes], { type: mimeType }), {
          colorSpaceConversion: 'none', premultiplyAlpha: 'none'
        });
        if (abandoned || signal.aborted) {
          bitmap.close();
          signal.throwIfAborted();
          throw Error('Character asset already rejected');
        }
        bitmaps.push(bitmap);
        return bitmap;
      }
    });
    signal.throwIfAborted();
    const palette = kind === 'hero' || kind === 'lu' ? BONES : YARD_BONES;
    const parts = bodyParts(asset.scene, palette);
    return { kind, parts, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}

function characterDeadline(parent, milliseconds) {
  const controller = new AbortController();
  const abort = () => controller.abort(parent.reason);
  if (parent?.aborted) abort();
  else parent?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException('Character request timed out', 'TimeoutError')), milliseconds);
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer);
      parent?.removeEventListener('abort', abort);
    }
  };
}

async function loadScopedCharacter(ref, context) {
  const [, kind, level] = ref.id.split('/');
  const deadline = characterDeadline(context.signal, 15000);
  const { signal } = deadline;
  let interrupt;
  let body;
  try {
    signal.throwIfAborted();
    const cancelled = new Promise((_, reject) => {
      interrupt = () => reject(signal.reason);
      signal.addEventListener('abort', interrupt, { once: true });
    });
    // A browser image decode cannot be interrupted. Its eventual bitmap is closed by loadCharacter.
    body = await Promise.race([loadCharacter(kind, level, signal), cancelled]);
    signal.throwIfAborted();
    return body;
  } catch (error) {
    body?.dispose();
    if (context.signal.aborted) throw context.signal.reason;
    // A failed optional role keeps its stock body without rejecting healthy members.
    return { kind, error: String(error?.message ?? error) };
  } finally {
    if (interrupt) signal.removeEventListener('abort', interrupt);
    deadline.dispose();
  }
}

async function loadCharacterIndex(pageSignal) {
  const deadline = characterDeadline(pageSignal, 8000);
  const { signal } = deadline;
  try {
    signal.throwIfAborted();
    const response = await fetch(new URL('index.json', PATH), { signal });
    if (!response.ok) throw Error('Character index HTTP ' + response.status);
    const available = await response.json();
    signal.throwIfAborted();
    return available;
  } finally {
    deadline.dispose();
  }
}

/** Start the bounded asset group for the optional bodies advertised at this detail. */
export async function loadCharacterGroup(engine, roleScope, level, pageSignal, { requested = ROLES, available } = {}) {
  if (!LEVELS.includes(level)) throw Error('Unknown character detail: ' + level);
  available ??= await loadCharacterIndex(pageSignal);
  pageSignal?.throwIfAborted();
  const roles = ROLES.filter((kind) => requested.includes(kind) && Array.isArray(available?.[kind]) && available[kind].includes(level));
  if (!registered.has(engine.assets)) {
    engine.assets.register(CHARACTER_BODY, { load: loadScopedCharacter, dispose: (body) => body.dispose?.() });
    registered.add(engine.assets);
  }
  const refs = roles.map((kind) => createAssetRef(CHARACTER_BODY, 'snowtemple-character/' + kind + '/' + level));
  const group = engine.createAssetGroup(roleScope, refs, { concurrency: 2 });
  if (pageSignal) {
    const abort = () => group.dispose();
    if (pageSignal.aborted) abort();
    else pageSignal.addEventListener('abort', abort, { once: true });
    const detach = () => pageSignal.removeEventListener('abort', abort);
    void group.ready.then(detach, detach);
  }
  return { group, roles };
}

/** Resolve the opening body before the first scene, regardless of the speed of other roles. */
export async function loadOpeningCharacter(engine, roleScope, level, pageSignal, timeoutMs = 6500) {
  const deadline = characterDeadline(pageSignal, timeoutMs);
  let available;
  try {
    available = await loadCharacterIndex(deadline.signal);
    const { group } = await loadCharacterGroup(engine, roleScope, level, deadline.signal, { requested: ['hero'], available });
    const [lease] = await group.ready;
    deadline.signal.throwIfAborted();
    return { available, hero: lease?.value ?? { error: 'Hero is missing from the character index' } };
  } catch (cause) {
    pageSignal?.throwIfAborted();
    const error = deadline.signal.reason ?? cause;
    return { available, hero: { error: String(error?.message ?? error) } };
  } finally {
    deadline.dispose();
  }
}
