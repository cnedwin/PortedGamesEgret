// Saving and loading. A save is the world written as text, wrapped with a
// version and a checksum. The page keeps saves in the browser and can also
// hand one to the player as a file, or take one back.
import { SAVE_VERSION } from './world.mjs';

const MAGIC = 'wulin-save';

/** A short fingerprint of a text (FNV-1a), to notice a damaged file. */
function fingerprint(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Steps that bring an older save up to date, keyed by the version they start
 * from. Add one whenever the shape of the world changes.
 */
const MIGRATIONS = {
  // 1: (state) => { ...; state.version = 2; },
};

/** Writes a world out as the text of a save file. */
export function serialize(state, label = '') {
  const body = JSON.stringify(state);
  return JSON.stringify({ magic: MAGIC, version: SAVE_VERSION, label, savedAt: state.day, check: fingerprint(body), body });
}

/**
 * Reads a save file's text back into a world.
 * @returns {{ok:true, state:object, label:string} | {ok:false, why:string}}
 */
export function deserialize(text) {
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, why: '不是有效的存档文件' };
  }
  if (file?.magic !== MAGIC || typeof file.body !== 'string') return { ok: false, why: '不是《武林天下》的存档' };
  if (fingerprint(file.body) !== file.check) return { ok: false, why: '存档已损坏' };
  if (file.version > SAVE_VERSION) return { ok: false, why: '存档来自更新的版本' };
  const state = JSON.parse(file.body);
  while (state.version < SAVE_VERSION) {
    const step = MIGRATIONS[state.version];
    if (!step) return { ok: false, why: `无法升级第 ${state.version} 版存档` };
    step(state);
  }
  return { ok: true, state, label: file.label ?? '' };
}

/** A file name for a save handed to the player. */
export const saveFileName = (state, sectName) => `武林天下-${sectName}-第${1 + Math.floor(state.day / 360)}年.wulin.json`;

// ---- keeping saves in the browser -----------------------------------------------------------------

const SLOT_PREFIX = 'wulin-slot-';

/** Slots kept in the browser's storage; `storage` is localStorage on a page. */
export function createSlots(storage) {
  return {
    write(slot, state, label) {
      try {
        storage.setItem(SLOT_PREFIX + slot, serialize(state, label));
        return true;
      } catch {
        // Storage may be full or refused (a private window): the caller offers a file instead.
        return false;
      }
    },
    read(slot) {
      const text = storage.getItem(SLOT_PREFIX + slot);
      return text ? deserialize(text) : { ok: false, why: '空存档位' };
    },
    list() {
      const slots = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key?.startsWith(SLOT_PREFIX)) continue;
        try {
          const file = JSON.parse(storage.getItem(key));
          slots.push({ slot: key.slice(SLOT_PREFIX.length), label: file.label, day: file.savedAt });
        } catch {
          /* an unreadable entry is left out of the list */
        }
      }
      return slots;
    },
    remove(slot) {
      storage.removeItem(SLOT_PREFIX + slot);
    },
  };
}
