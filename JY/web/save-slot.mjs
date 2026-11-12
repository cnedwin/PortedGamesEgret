import { createStore, get, update } from './idb-keyval.mjs';

export const autoSlot = 11;
export const manualSlots = Object.freeze(Array.from({ length: 10 }, (_, index) => index + 1));
const format = 1;

export function createSaveSlot(identity, slot = autoSlot) {
  if (slot !== autoSlot && !manualSlots.includes(slot)) throw new RangeError('存檔槽位不存在。');
  const store = createStore('kys-egret-port', 'saves');
  const key = `${identity}:${slot}`;
  let revision = 0;

  async function read() {
    const save = await get(key, store);
    if (save === undefined) return undefined;
    if (save.format !== format || !Number.isSafeInteger(save.revision) || save.revision < 1
      || !Array.isArray(save.inventory) || !Array.isArray(save.openingEvents) || !save.location) {
      throw new Error(`第 ${slot} 槽的存檔格式不相容。`);
    }
    revision = save.revision;
    return save;
  }

  async function write(snapshot) {
    const next = { ...snapshot, format, slot, revision: revision + 1 };
    await update(key, previous => {
      if ((previous?.revision ?? 0) !== revision) throw new Error(`另一個頁面已更新第 ${slot} 槽，請重新載入。`);
      return next;
    }, store);
    revision = next.revision;
    return next;
  }

  return { read, write };
}
