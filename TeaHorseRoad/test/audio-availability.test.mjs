import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const { createSoundscape } = await import('../src/audio/soundscape.mjs');

test('the optional soundscape does not block a journey with no Web Audio host', async () => {
  const names = ['AudioContext', 'webkitAudioContext'];
  const previous = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  for (const name of names) Object.defineProperty(globalThis, name, { configurable: true, value: undefined });
  try {
    const scene = { addChild() { assert.fail('no sound nodes should be mounted'); } };
    const sound = createSoundscape(scene, scene, { volume: 0.7 });
    assert.equal(sound.available, false);
    assert.equal(sound.started, false);
    assert.equal(sound.volume, 0.7);
    sound.volume = 0.4;
    assert.equal(sound.volume, 0.4);
    sound.music = false;
    await sound.start();
    sound.attach({ trucks: [] });
    sound.play('horn');
    sound.setMood(1);
    sound.hush(true);
    sound.update(1 / 60);
    sound.dispose();
    assert.equal(sound.started, false);
  } finally {
    for (const [index, name] of names.entries()) {
      if (previous[index]) Object.defineProperty(globalThis, name, previous[index]);
      else delete globalThis[name];
    }
  }
});

for (const contextName of ['AudioContext', 'webkitAudioContext']) {
  test(`the real spatial soundscape is retained for ${contextName}`, () => {
    const names = ['AudioContext', 'webkitAudioContext'];
    const previous = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
    class TestContext {
      state = 'suspended';
      sampleRate = 48000;
      destination = {};
      closes = 0;
      createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
      createBuffer(channels, length) {
        const samples = Array.from({ length: channels }, () => new Float32Array(length));
        return { getChannelData: index => samples[index] };
      }
      async close() { this.closes++; this.state = 'closed'; }
    }
    for (const name of names) Object.defineProperty(globalThis, name, { configurable: true, value: name === contextName ? TestContext : undefined });
    let sound;
    try {
      const camera = { addChild() {} };
      sound = createSoundscape(camera, camera, { volume: 0.7 });
      assert.equal(sound.available, true);
      assert.ok(sound.listener.context instanceof TestContext);
      const context = sound.listener.context;
      sound.dispose();
      sound = undefined;
      assert.equal(context.closes, 1);
    } finally {
      sound?.dispose();
      for (const [index, name] of names.entries()) {
        if (previous[index]) Object.defineProperty(globalThis, name, previous[index]);
        else delete globalThis[name];
      }
    }
  });
}
