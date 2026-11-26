// 声音全由代码合成：每个音效都有声、不削波、不太长；两段音乐长度合适。
// Every sound is made in code: each effect is audible, unclipped and short; the two pieces of music are a sensible length.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { EFFECTS, RATE, music } = await import('../src/audio/synth.mjs');
const { encodeWav } = await import('@egret/engine/kit');

const peak = (samples) => samples.reduce((most, value) => Math.max(most, Math.abs(value)), 0);

test('every effect is audible, below clipping and under four seconds', () => {
  assert.ok(Object.keys(EFFECTS).length >= 12);
  for (const [name, make] of Object.entries(EFFECTS)) {
    const samples = make();
    assert.ok(samples instanceof Float32Array, name);
    assert.ok(samples.length > 0 && samples.length < RATE * 4, name + ' length');
    const loudest = peak(samples);
    assert.ok(loudest > 0.05 && loudest <= 1, `${name} peak ${loudest}`);
    assert.ok(samples.every(Number.isFinite), name + ' finite');
  }
});

test('the music is between twenty seconds and two minutes and does not clip', () => {
  for (const options of [{ bars: 16, tempo: 84, seed: 7, mood: 1 }, { bars: 12, tempo: 66, seed: 3, mood: 0 }]) {
    const samples = music(options),
      seconds = samples.length / RATE;
    assert.ok(seconds > 20 && seconds < 120, `${seconds}s`);
    assert.ok(peak(samples) <= 1);
  }
});

test('the kit encodes an effect as a WAV the mixer can decode', () => {
  const bytes = new Uint8Array(encodeWav([EFFECTS.tap()], RATE)),
    text = (from, to) => String.fromCharCode(...bytes.slice(from, to));
  assert.equal(text(0, 4), 'RIFF');
  assert.equal(text(8, 12), 'WAVE');
});

// The game's sound board on an engine mixer made by createAudioMixer over a backend that only writes down
// what it is asked: effects go to the effects bus, music to the music bus, and the settings mute each.
test('events of the city reach the effects bus and the music its own, each muted by its setting', async () => {
  const { createAudioMixer } = await import('@egret/engine/audio');
  const { soundBoard, BUSES } = await import('../src/audio/sound.mjs');
  const buses = [],
    started = [];
  const backend = {
    time: 0,
    async decode(bytes) {
      return { duration: bytes.length / 2 / RATE, channels: 1, sampleRate: RATE, release() {} };
    },
    createBus(parent) {
      const bus = { parent, gain: 1, setGain(value) { bus.gain = value; }, release() {} };
      buses.push(bus);
      return bus;
    },
    start(request) {
      started.push(request);
      return { setGain() {}, setRate() {}, setPan() {}, stop() {} };
    },
    suspend() {},
    resume() {},
    close() {}
  };
  const mixer = createAudioMixer({ backend, buses: BUSES }),
    owned = [],
    scope = { use: (thing) => (owned.push(thing), thing) };
  const board = await soundBoard(mixer, scope, { effects: true, music: false });
  assert.equal(mixer.bus('music').muted, true);
  assert.equal(mixer.bus('effects').muted, false);
  board.event({ type: 'lock', x: 0, y: 0 }, 0.9);
  board.event({ type: 'hit', on: 'stone', speed: 600 }, 0.1);
  assert.equal(started.length, 2);
  assert.ok(started[0].pan > 0 && started[1].pan < 0, 'placed left and right by where it happened');
  await board.music('city');
  assert.equal(started.length, 3);
  assert.ok(started[2].loop, 'music loops');
  assert.notEqual(started[2].bus, started[0].bus, 'music and effects on different buses');
  board.setEffects(false);
  assert.equal(mixer.bus('effects').muted, true);
  mixer.dispose();
});
