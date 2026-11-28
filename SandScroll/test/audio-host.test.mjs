import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const { createSound } = await import('../src/audio/sound.mjs');

test('a browser without an audio host can still play SandScroll silently', async () => {
  const prev = globalThis.AudioContext;
  try {
    globalThis.AudioContext = undefined;
    const sound = await createSound({ use() { throw new Error('must not construct a missing audio host'); } });
    sound.play('land');
    await sound.music('act');
    sound.setOn(false);
    sound.setPaused(true);
    sound.stopMusic();
  } finally { globalThis.AudioContext = prev; }
});
