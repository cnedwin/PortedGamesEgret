import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const { createSound } = await import('../src/audio/sound.mjs');

test('an unavailable audio clock leaves menus usable but refuses rhythm playback', async () => {
  const prev = globalThis.AudioContext;
  try {
    globalThis.AudioContext = undefined;
    const sound = createSound({ use() { throw new Error('must not construct a missing audio host'); } });
    assert.equal(sound.unavailable, true);
    await assert.rejects(sound.start(), /Web Audio is unavailable/);
    await assert.rejects(sound.clicks(), /Web Audio is unavailable/);
    sound.setOn(false);
    sound.setMusic(0.3);
    sound.stop();
  } finally { globalThis.AudioContext = prev; }
});
