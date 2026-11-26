// Original score, foley and playback lifecycle through the shipped engine mixer.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
const audio = await import('../src/audio/sound.mjs');
const { encodeWav } = await import('@egret/engine/kit');

function stats(samples) {
  let peak = 0, squares = 0;
  for (const sample of samples) {
    assert.ok(Number.isFinite(sample));
    peak = Math.max(peak, Math.abs(sample));
    squares += sample * sample;
  }
  return { peak, rms: Math.sqrt(squares / samples.length) };
}
const same = (a, b) => a.length === b.length && a.every((sample, index) => sample === b[index]);

test('the original score is a 48-second stereo loop with restrained peaks and matched boundaries', async () => {
  const mono = audio.music();
  assert.equal(mono.length, audio.RATE * 48);
  const channels = await audio.stereoMusic(() => Promise.resolve());
  assert.equal(channels.length, 2);
  assert.equal(channels[0].length, mono.length);
  assert.equal(channels[1].length, mono.length);
  assert.ok(!same(channels[0], channels[1]), 'the stereo mix has distinct positions and reflection delays');
  for (const samples of channels) {
    const { peak, rms } = stats(samples);
    assert.ok(peak < .6 && rms > .025);
    assert.ok(Math.abs(samples[0] - samples.at(-1)) < .01, 'no large sample jump at loop boundary');
  }
  assert.ok(channels[0].every((v, i) => Math.abs((v + channels[1][i]) * .5 - mono[i]) < 1e-7), 'offline and cooperative score agree');
  const wav = encodeWav(channels, audio.RATE);
  const header = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  assert.equal(header.getUint16(22, true), 2);
  assert.equal(header.getUint32(24, true), audio.RATE);
  assert.equal(header.getUint32(40, true), audio.RATE * 48 * 2 * 2);
});

test('each material and result has a deterministic, bounded, distinguishable sound', () => {
  const variants = ['knock', 'knock-bamboo', 'knock-stone', 'knock-rope', 'knock-chain', 'knock-pontoon',
    'pull', 'pull-stone', 'pull-rope', 'pull-chain', 'crack', 'crack-bamboo', 'crack-stone', 'crack-rope', 'crack-chain',
    'tap', 'deny', 'creak', 'thrum', 'splash', 'roll', 'seal', 'won', 'lost'];
  const wave = {};
  for (const key of variants) {
    assert.equal(typeof audio.EFFECTS[key], 'function', key);
    const a = audio.EFFECTS[key](), b = audio.EFFECTS[key]();
    assert.ok(same(a, b), key + ' is deterministic');
    assert.ok(a.length > 0 && a.length <= audio.RATE * 3, key + ' has a short duration');
    const { peak, rms } = stats(a);
    assert.ok(peak <= .72 && rms > .02, key);
    assert.equal(Math.abs(a[0]), 0, key + ' attack');
    assert.equal(Math.abs(a.at(-1)), 0, key + ' release');
    wave[key] = a;
  }
  for (const base of ['knock', 'pull', 'crack']) {
    for (const key of variants.filter(key => key.startsWith(base + '-'))) assert.ok(!same(wave[base], wave[key]), key);
  }
});

test('the river has a low-level 12-second deterministic seamless loop', () => {
  const samples = audio.ambience();
  assert.equal(samples.length, 12 * audio.RATE);
  const { peak, rms } = stats(samples);
  assert.ok(peak < .15 && rms > .01 && rms < .04);
  assert.ok(Math.abs(samples[0] - samples.at(-1)) < .012);
  assert.ok(same(samples, audio.ambience()));
});

test('real mixer plus simulated host: independent controls, material cue, ambience and async score cancellation', async () => {
  let mixer;
  const calls = [], gains = [], pendingStops = [];
  let now = 0, closed = false;
  const backend = {
    locked: false, attach() {}, get time() { return now; },
    async decode(bytes) {
      const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const channels = header.getUint16(22, true), sampleRate = header.getUint32(24, true);
      const duration = header.getUint32(40, true) / (channels * sampleRate * 2);
      return { duration, channels, sampleRate, release() {} };
    },
    createBus(parent) {
      const bus = { parent, gain: 1, setGain(volume) { bus.gain = volume; gains.push(volume); }, release() {} };
      return bus;
    },
    start(options, ended) {
      calls.push(options);
      return { setGain() {}, setRate() {}, setPan() {}, stop(seconds) { if (seconds > 0 && options.sound.channels === 2) pendingStops.push(ended); else ended(); } };
    },
    suspend() {}, resume() {}, close() { closed = true; }
  };
  const flush = async (n = 500) => { for (let i = 0; i < n; i++) await Promise.resolve(); };
  const sound = audio.createSound({ use(value) { mixer = value; return value; } }, {
    backendFactory: () => backend, yieldTurn: () => Promise.resolve()
  });
  try {
    await flush();
    sound.play('knock', { material: 'chain' });
    assert.equal(calls.at(-1).sound.duration, audio.EFFECTS['knock-chain']().length / audio.RATE);
    const before = calls.length;
    sound.music(true);
    sound.setMusic(false);
    await flush();
    assert.equal(calls.length, before, 'cancelled score never starts after synthesis');
    sound.setMusic(true);
    await flush();
    assert.ok(mixer.music, 'the requested theme starts');
    assert.equal(calls.at(-1).sound.duration, 48);
    assert.equal(calls.at(-1).sound.channels, 2);
    sound.music(true);
    await flush();
    assert.equal(calls.length, before + 1, 'no repeated start on scene refresh');

    // A real browser ends a fade asynchronously. Turning music back on before that callback
    // must replace the stopping voice, rather than asking the mixer to reuse it.
    const originalMusic = mixer.music;
    sound.setMusic(false);
    assert.equal(originalMusic.state, 'stopping');
    assert.equal(mixer.music, undefined);
    sound.setMusic(true);
    await flush();
    assert.notEqual(mixer.music.id, originalMusic.id);
    assert.equal(mixer.music.state, 'playing');
    const resumedMusic = mixer.music.id;
    for (const finish of pendingStops.splice(0)) finish();
    assert.equal(mixer.music.id, resumedMusic);

    sound.scene('title');
    await flush();
    assert.equal(mixer.bus('ambience').voices, 0);
    sound.scene('build');
    await flush();
    assert.equal(calls.at(-1).sound.duration, 12);
    assert.equal(mixer.bus('ambience').voices, 1);
    sound.setSound(false);
    const mutedAt = calls.length;
    sound.play('crack', { material: 'stone' });
    assert.equal(calls.length, mutedAt, 'muted cues are not queued');
    assert.equal(mixer.bus('effects').muted, true);
    assert.equal(mixer.bus('ambience').muted, true);
    assert.equal(mixer.bus('music').muted, false);
    sound.setSound(true);
    await flush();
    sound.setHidden(true);
    assert.equal(mixer.bus('music').muted, true);
    assert.equal(mixer.bus('effects').muted, true);
    assert.equal(mixer.bus('ambience').muted, true);
    sound.setHidden(false);
    await flush();
    assert.equal(mixer.bus('music').muted, false);
    assert.equal(mixer.bus('ambience').voices, 1);
    sound.scene('levels');
    assert.equal(mixer.bus('ambience').voices, 0, 'no river outside worksite');
  } finally {
    mixer?.dispose?.();
  }
  assert.equal(closed, true);
});

