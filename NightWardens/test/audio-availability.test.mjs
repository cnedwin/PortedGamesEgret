import test from 'node:test';
import assert from 'node:assert/strict';
import '../vendor/node-register.mjs';
const { createSound } = await import('../src/audio/sound.mjs');
test('no Web Audio host does not block creation of the game sound facade', async () => {
  assert.equal(typeof globalThis.AudioContext, 'undefined');
  const sound = await createSound({ use: x => x }, { on: true });
  sound.play('page'); await sound.music(true); await sound.music(false); sound.setOn(false);
});

test('unrelated audio initialization faults are not hidden by the compatibility fallback', async () => {
  const unexpected = new Error('unexpected mixer construction fault');
  const prior = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: class { constructor() { throw unexpected; } } });
  try {
    await assert.rejects(createSound({ use: x => x }), error => error === unexpected);
  } finally {
    if (prior) Object.defineProperty(globalThis, 'AudioContext', prior);
    else delete globalThis.AudioContext;
  }
});
