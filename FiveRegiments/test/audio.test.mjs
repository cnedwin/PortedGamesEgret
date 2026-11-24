import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { setTimeout as wait } from 'node:timers/promises';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const { imports } = JSON.parse(readFileSync(new URL('vendor/importmap.json', root), 'utf8'));
const hook = registerHooks({
  resolve(name, context, next) {
    if (name === '@egret/engine/web/audio') {
      return { url: 'data:text/javascript,export const createBrowserAudio = (options) => globalThis.testAudio(options)', shortCircuit: true };
    }
    return next(imports[name] ? new URL(imports[name], root).href : name, context);
  }
});
const [{ createAudioMixer }, { createSound, RATE, SOUNDS }] = await Promise.all([
  import('@egret/engine/audio'), import('../src/audio.mjs')
]);
hook.deregister();

test('a bow release has a short attack and a much quieter tail', () => {
  const sample = SOUNDS.bowLoose();
  const rms = (from, to) => {
    const section = sample.subarray(Math.round(from * RATE), Math.round(to * RATE));
    return Math.sqrt(section.reduce((sum, value) => sum + value * value, 0) / section.length);
  };
  assert.ok(sample.length <= 0.2 * RATE);
  assert.ok(rms(0, 0.012) > 0.07, 'the string is audible at release');
  assert.ok(rms(0, 0.022) > rms(0.105, 0.127) * 3);
  assert.ok(sample.every(value => Math.abs(value) <= 0.881));
  assert.equal(sample.at(-1), 0);
});

function fixture({ defer = () => false } = {}) {
  const started = [], buses = [], decoded = [];
  let mixer;
  globalThis.testAudio = (options) => {
    mixer = createAudioMixer({ ...options, backend: {
      time: 0,
      createBus() {
        const bus = { changes: [], setGain(gain, fade) { this.changes.push({ gain, fade }); }, release() {} };
        buses.push(bus);
        return bus;
      },
      decode(bytes) {
        const duration = (bytes.byteLength - 44) / (2 * RATE);
        const sound = { duration, sampleRate: RATE, channels: 1, release() {} };
        const entry = { duration };
        decoded.push(entry);
        if (defer(duration)) return new Promise(resolve => { entry.finish = () => resolve(sound); });
        return Promise.resolve(sound);
      },
      start(request, ended) {
        const entry = { duration: request.sound.duration, ...request, stop: null };
        started.push(entry);
        return { setGain() {}, setRate() {}, setPan() {}, stop(fade) { entry.stop = fade; ended(); } };
      },
      suspend() {}, resume() {}, close() {}
    } });
    return { mixer };
  };
  return {
    sound: () => createSound({ use: value => value }), buses, decoded, started,
    close: () => mixer.dispose()
  };
}

async function until(ready) {
  const limit = performance.now() + 1500;
  while (!ready() && performance.now() < limit) await wait(5);
  assert.ok(ready(), 'audio operation timed out');
}

test('the first interaction starts the mixer without synthesizing all effects at once', async () => {
  const f = fixture();
  try {
    const pending = f.sound();
    assert.equal(f.decoded.length, 0);
    const sound = await pending;
    sound.play('drum');
    await until(() => f.started.some(e => e.duration === 0.6 && !e.loop));
    assert.ok(f.decoded.length < 33);
  } finally {
    f.close();
  }
});

test('rapid music requests share pending decodes and only the current selection plays', async () => {
  const f = fixture({ defer: seconds => seconds >= 8 });
  try {
    const sound = await f.sound();
    const requests = [sound.music('air'), sound.music('drums'), sound.music('air')];
    await until(() => f.decoded.some(e => e.duration === 8 && e.finish));
    for (const track of f.decoded.filter(e => e.finish)) track.finish();
    // Let the synthesis queue settle before releasing any redundant decode.
    await wait(40);
    for (const track of f.decoded.filter(e => e.finish)) track.finish();
    await Promise.all(requests);
    assert.equal(f.decoded.filter(e => e.duration === 20).length, 1);
    assert.deepEqual(f.started.filter(e => e.loop).map(e => e.duration), [20]);
    await sound.music('drums');
    const [air, drums] = f.started.filter(e => e.loop);
    assert.ok(air.stop > 0);
    assert.equal(drums.fadeIn, air.stop, 'outgoing and incoming loops fade together');
  } finally {
    f.close();
  }
});

test('pause and mute discard queued effects and preserve the music loop', async () => {
  const f = fixture({ defer: seconds => seconds === 3.2 });
  try {
    const sound = await f.sound();
    await sound.music('air');
    sound.play('drum');
    await until(() => f.started.some(e => !e.loop));
    sound.play('gong');
    await until(() => f.decoded.some(e => e.duration === 3.2 && e.finish));
    sound.setPaused(true);
    assert.ok(f.started.find(e => !e.loop).stop > 0);
    const musicBus = f.buses[2];
    assert.ok(musicBus.changes.at(-1).gain < 0.38 && musicBus.changes.at(-1).fade > 0);
    f.decoded.find(e => e.duration === 3.2).finish();
    sound.setPaused(false);
    sound.setOn(false);
    sound.play('gong');
    await wait(20);
    sound.setOn(true);
    assert.equal(f.started.filter(e => e.loop).length, 1);
    assert.equal(f.started.find(e => e.loop).stop, null);
    assert.equal(f.started.filter(e => e.duration === 3.2).length, 0);
    sound.play('gong');
    await until(() => f.started.some(e => e.duration === 3.2));
  } finally {
    f.close();
  }
});
