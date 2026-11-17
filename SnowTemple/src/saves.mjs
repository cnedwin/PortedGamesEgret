// The player's saves, kept through the engine's save store. Each carries a version, so a later build can
// bring an older one up to date; one that cannot be read is set aside under "<key>.unread" rather than
// lost; and a write the browser refuses never throws.
import { createSaveStore } from '@egret/engine/kit';

/** Saves written before they carried a version were the bare data. Wrap such a one as version 1. */
function adoptBare(storage, key) {
  let value;
  try {
    const text = storage.getItem(key);
    if (text === null) return;
    value = JSON.parse(text);
  } catch {
    return; // unreadable: the store sets it aside
  }
  if (!value || typeof value !== 'object' || (Number.isSafeInteger(value.version) && 'data' in value)) return;
  try {
    storage.setItem(key, JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data: value }));
  } catch {
    /* a full or closed storage: the save is read as it is, or not at all */
  }
}

/**
 * Open the save under `key` in `storage` (the page's, or one in memory for tests).
 * `defaults` makes the data of someone who has never played; `migrations` bring older versions forward.
 */
export function openSave(storage, key, { version = 1, defaults, migrations } = {}) {
  adoptBare(storage, key);
  return createSaveStore({ key, version, defaults, migrations, storage });
}
