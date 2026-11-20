// 声音：每个合成的声音都是有限的数、不削波；循环的声音首尾接得上。
// Sound: every sound made is finite numbers that do not clip, and the loops join end to start.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RATE, SOUNDS, tune } from '../src/audio/synth.mjs';

test('every sound is finite and under full scale', () => {
  for (const [name, make] of Object.entries(SOUNDS)) {
    const samples = make();
    assert.ok(samples.length > RATE * 0.1, name);
    let peak = 0;
    for (const value of samples) {
      assert.ok(Number.isFinite(value), name);
      peak = Math.max(peak, Math.abs(value));
    }
    assert.ok(peak <= 1 && peak > 0.05, `${name} peaks at ${peak}`);
  }
});

test('the loops join without a click', () => {
  for (const name of ['engine', 'stream', 'wind']) {
    const samples = SOUNDS[name](),
      jump = Math.abs(samples[samples.length - 1] - samples[0]);
    assert.ok(jump < 0.25, `${name} jumps ${jump}`);
  }
});

test('the caravan tune loops in whole bars', () => {
  const calm = tune({ bars: 4, tempo: 84 });
  assert.equal(calm.length, Math.round(((4 * 4 * 60) / 84) * RATE));
});

test('the background music worker transfers complete calm and danger loops', async () => {
  const original = globalThis.self;
  const collected = [];
  let closed = false;
  globalThis.self = {
    postMessage: (message, transfers) => collected.push({ message, transfers }),
    close: () => { closed = true; }
  };
  try {
    await import('../src/audio/musicWorker.mjs');
    assert.equal(collected.length, 2);
    assert.equal(closed, true);
    for (const [index, [bars, tempo]] of [[16, 84], [8, 112]].entries()) {
      const { message, transfers } = collected[index];
      assert.equal(message.mood, index);
      assert.ok(message.samples instanceof Float32Array);
      assert.equal(message.samples.length, Math.round((bars * 4 * 60 * RATE) / tempo));
      assert.deepEqual(transfers, [message.samples.buffer]);
    }
  } finally {
    if (original === undefined) delete globalThis.self;
    else globalThis.self = original;
  }
});
