import test from 'node:test';
import assert from 'node:assert/strict';
import '../vendor/node-register.mjs';
const { createSound } = await import('../src/sound.mjs');
test('no Web Audio host does not turn valid art into a startup failure', () => {
  assert.equal(typeof globalThis.AudioContext, 'undefined');
  const game = { scope: { use: x => x }, sfx: { muted: false } };
  const sound = createSound(game, { on: true, music: true });
  sound('select'); sound.music('title'); sound.setMusic(false); sound.setOn(false);
  sound.stopMusic(); sound.pause(); sound.resume();
  assert.equal(game.sfx.muted, true);
});

test('unrelated audio initialization faults are not hidden by the compatibility fallback', async () => {
  const unexpected = new Error('unexpected mixer construction fault');
  const prior = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: class { constructor() { throw unexpected; } } });
  try {
    assert.throws(() => createSound({ scope: { use: x => x }, sfx: {} }), error => error === unexpected);
  } finally {
    if (prior) Object.defineProperty(globalThis, 'AudioContext', prior);
    else delete globalThis.AudioContext;
  }
});
