import { createStore, get, update } from './idb-keyval.mjs';

export const autoSlot = 11;
export const manualSlots = Object.freeze(Array.from({ length: 10 }, (_, index) => index + 1));
const format = 1;

export function createSaveSlot(identity, slot = autoSlot) {
  if (slot !== autoSlot && !manualSlots.includes(slot)) throw new RangeError('存檔槽位不存在。');
  const store = createStore('kys-egret-port', 'saves');
  const key = `${identity}:${slot}`;
  let revision = 0;
  let incompatible = false;

  const compatible = save => save?.format === format && Number.isSafeInteger(save.revision) && save.revision >= 1
    && Array.isArray(save.inventory) && Array.isArray(save.openingEvents) && !!save.location;

  async function read() {
    const save = await get(key, store);
    incompatible = false;
    if (save === undefined) { revision = 0; return undefined; }
    if (!compatible(save)) {
      incompatible = true;
      throw Object.assign(new Error(`第 ${slot} 槽的存檔格式不相容。`), { code: 'SAVE_INCOMPATIBLE' });
    }
    revision = save.revision;
    return save;
  }

  async function write(snapshot) {
    if (incompatible) throw new Error('請先明確復原不相容的存檔。');
    const next = { ...snapshot, format, slot, revision: revision + 1, savedAt: new Date().toISOString() };
    await update(key, previous => {
      if ((previous?.revision ?? 0) !== revision) throw new Error(`另一個頁面已更新第 ${slot} 槽，請重新載入。`);
      return next;
    }, store);
    revision = next.revision;
    return next;
  }

  // Only after an explicit UI confirmation and an incompatible read. Keep the
  // unread record and replacement together in one IndexedDB transaction.
  async function recover(snapshot) {
    if (!incompatible) throw new Error('沒有需要復原的存檔。');
    const next = { ...snapshot, format, slot, revision: 1, savedAt: new Date().toISOString() };
    const backupKey = `${key}:unread:${crypto.randomUUID()}`;
    await store('readwrite', objectStore => new Promise((resolve, reject) => {
      const transaction = objectStore.transaction;
      transaction.oncomplete = () => resolve();
      transaction.onabort = transaction.onerror = () => reject(transaction.error ?? Error('存檔復原失敗。'));
      const request = objectStore.get(key);
      request.onsuccess = () => {
        try {
          const current = request.result;
          // Another tab may have repaired the slot while the confirmation was open.
          if (current === undefined || compatible(current)) throw Error('存檔已變更，請重新載入。');
          objectStore.add(current, backupKey);
          objectStore.put(next, key);
        } catch (error) {
          reject(error);
          transaction.abort();
        }
      };
    }));
    incompatible = false;
    revision = next.revision;
    return next;
  }

  return { read, write, recover };
}
