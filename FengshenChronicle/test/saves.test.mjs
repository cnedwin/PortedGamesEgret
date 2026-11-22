import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from '../src/sim/world.mjs';
import { isMuted, readSlot, setMuted, writeSlot } from '../src/saves.mjs';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  };
}

test('browser slots are isolated and restore a detached snapshot after reload', () => {
  const storage = memoryStorage();
  const first = createSession(), second = createSession();
  first.hero.gold = 124;
  second.hero.gold = 42;
  assert.equal(readSlot(storage, 1).status, 'empty');
  assert.equal(writeSlot(storage, 1, first, 42), true);
  assert.equal(writeSlot(storage, 2, second, 51), true);
  const restored = readSlot(storage, 1);
  assert.equal(restored.savedAt, 42);
  assert.equal(createSession(restored.snapshot).hero.gold, 124);
  restored.snapshot.hero.gold = 999;
  assert.equal(readSlot(storage, 1).snapshot.hero.gold, 124);
  assert.equal(readSlot(storage, 2).snapshot.hero.gold, 42);
  assert.equal(readSlot(storage, 3).status, 'empty');
});

test('a corrupt slot or denied storage leaves gameplay available', () => {
  assert.equal(readSlot({ getItem: () => '{incomplete' }, 1).status, 'invalid');
  assert.equal(readSlot({ getItem: () => '{}' }, 1).status, 'invalid');
  const denied = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
  assert.equal(readSlot(denied, 1).status, 'unavailable');
  assert.equal(writeSlot(denied, 1, createSession()), false);
  assert.equal(isMuted(denied), false);
  assert.doesNotThrow(() => setMuted(denied, true));
});

test('mute is remembered independently of in-game save data', () => {
  const storage = memoryStorage();
  assert.equal(isMuted(storage), false);
  setMuted(storage, true);
  assert.equal(isMuted(storage), true);
  writeSlot(storage, 3, createSession(), 20);
  setMuted(storage, false);
  assert.equal(isMuted(storage), false);
  assert.equal(readSlot(storage, 3).status, 'ok');
});
