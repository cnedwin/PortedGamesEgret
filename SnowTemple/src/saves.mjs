// The player's saves, kept through the engine's save store. Each carries a version, so a later build can
// bring an older one up to date; one that cannot be read is set aside under "<key>.unread" rather than
// lost; and a write the browser refuses never throws.
import { createMemorySaveStorage, createSaveStore } from '@egret/engine/kit';

/** Readable browser storage can still carry an older save when writes exceed quota. */
export function snowSaveStorage(getStorage = () => globalThis.localStorage) {
  try {
    const storage = getStorage();
    if (storage) {
      storage.getItem('');
      return storage;
    }
  } catch {
    // The page cannot read local storage.
  }
  return createMemorySaveStorage();
}

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
  let envelope;
  try {
    envelope = JSON.stringify({ version: 1, savedAt: new Date().toISOString(), data: value });
    storage.setItem(key, envelope);
  } catch {
    // Read the versioned record in this session even if it could not be stored.
    return envelope;
  }
}

/**
 * Open the save under `key` in `storage` (the page's, or one in memory for tests).
 * `defaults` makes the data of someone who has never played; `migrations` bring older versions forward.
 */
export function openSave(storage, key, { version = 1, defaults, migrations } = {}) {
  const envelope = adoptBare(storage, key);
  const readableStorage = envelope === undefined ? storage : {
    getItem: name => name === key ? envelope : storage.getItem(name),
    setItem: (name, value) => storage.setItem(name, value),
    removeItem: name => storage.removeItem(name)
  };
  return createSaveStore({ key, version, defaults, migrations, storage: readableStorage });
}
