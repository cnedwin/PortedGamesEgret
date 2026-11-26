import { createSaveSnapshot } from './sim/world.mjs';

const prefix = 'ported-games-egret:fengshen:';

function slotKey(slot) {
  if (!['1', '2', '3'].includes(String(slot))) throw new RangeError('Invalid save slot');
  return prefix + 'slot-' + slot;
}

export function readSlot(storage, slot) {
  const key = slotKey(slot);
  try {
    const raw = storage.getItem(key);
    if (raw === null) return { status: 'empty' };
    const { snapshot, savedAt } = JSON.parse(raw);
    if (snapshot?.version !== 1 || !Number.isFinite(savedAt)) return { status: 'invalid' };
    return { status: 'ok', snapshot, savedAt };
  } catch (error) {
    return { status: error instanceof SyntaxError ? 'invalid' : 'unavailable' };
  }
}

export function writeSlot(storage, slot, state, savedAt = Date.now()) {
  const key = slotKey(slot);
  try {
    storage.setItem(key, JSON.stringify({ snapshot: createSaveSnapshot(state), savedAt }));
    return true;
  } catch {
    return false;
  }
}

export function isMuted(storage) {
  try { return storage.getItem(prefix + 'mute') === '1'; } catch { return false; }
}

export function setMuted(storage, muted) {
  try { storage.setItem(prefix + 'mute', muted ? '1' : '0'); } catch { /* Session audio remains usable. */ }
}
