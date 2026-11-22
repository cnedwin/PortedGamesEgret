import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWavEffects } from '../web/wav-effects.mjs';

const flush = () => new Promise(resolve => setImmediate(resolve));

function fixture(options = {}) {
  const calls = { created: [], fetched: [], decoded: [], voices: [], stopped: [], resumed: 0, disposed: 0 };
  const listeners = new Set();
  const context = { state: 'running', async resume() {
    calls.resumed++;
    context.state = 'running';
    mixer.state = 'running';
    for (const listener of listeners) listener('running');
  } };
  const mixer = {
    state: 'running',
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async decode(bytes) {
      calls.decoded.push(bytes);
      return { bytes };
    },
    play(sound, options) {
      assert.deepEqual(options, { bus: 'effects', maxInstances: 1 });
      for (const voice of calls.voices) if (voice.sound === sound) voice.stop();
      let retire;
      const ended = new Promise(resolve => { retire = resolve; });
      const voice = { sound, state: 'playing', ended, stop() {
        if (voice.state === 'ended') return;
        voice.state = 'ended';
        calls.stopped.push(sound.bytes);
        retire('stopped');
      } };
      calls.voices.push(voice);
      return voice;
    },
    stopAll({ bus }) {
      assert.equal(bus, 'effects');
      for (const voice of calls.voices) voice.stop();
    },
  };
  const effects = createWavEffects({
    createAudio(config) {
      calls.created.push(config);
      return { context, mixer, dispose() { calls.disposed++; } };
    },
    fetchBytes(path, request) {
      calls.fetched.push([path, request.signal]);
      return options.read ? options.read(path, request) : Promise.resolve(path);
    },
    ...options.settings,
  });
  return { effects, calls, context, mixer, listeners };
}

test('rapid cues share one decode and the latest cue restarts the same sample', async () => {
  let deliver;
  const { effects, calls } = fixture({ read: path => new Promise(resolve => { deliver = () => resolve(path); }) });
  const first = effects.play('wave', 24);
  const second = effects.play('wave', 24);
  deliver();
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.equal(await effects.play('wave', 24), true);
  assert.equal(calls.created.length, 1);
  assert.deepEqual(calls.created[0].buses, ['effects']);
  assert.deepEqual(calls.fetched.map(([path]) => path), ['/audio/wave/24.wav']);
  assert.deepEqual(calls.decoded, ['/audio/wave/24.wav']);
  assert.equal(calls.voices.length, 2);
  assert.deepEqual(calls.stopped, ['/audio/wave/24.wav']);
  effects.dispose();
});

test('battle cleanup stops the battle voice while another sample remains active', async () => {
  const { effects, calls } = fixture();
  const battle = new AbortController();
  assert.equal(await effects.play('wave', 24), true);
  assert.equal(await effects.play('hit', 24, { signal: battle.signal }), true);
  assert.deepEqual(calls.voices.map(voice => voice.state), ['playing', 'playing']);
  battle.abort();
  assert.deepEqual(calls.voices.map(voice => voice.state), ['playing', 'ended']);
  effects.dispose();
  assert.deepEqual(calls.voices.map(voice => voice.state), ['ended', 'ended']);
});

test('switching scenes with mute never replays the previous scene’s cue', async () => {
  let deliver;
  const previous = fixture({ read: path => path === '/audio/hit/3.wav'
    ? new Promise(resolve => { deliver = () => resolve(path); }) : Promise.resolve(path) });
  assert.equal(await previous.effects.play('wave', 24), true);
  const first = previous.effects.play('hit', 3);
  previous.effects.dispose();
  assert.equal(previous.calls.voices[0].state, 'ended');
  assert.equal(await first, false);
  const muted = fixture({ settings: { enabled: false } });
  muted.effects.activate();
  assert.equal(await muted.effects.play('wave', 24), false);
  assert.equal(await muted.effects.preload('hit', 3), false);
  assert.equal(muted.calls.created.length, 0);
  deliver();
  await flush();
  muted.effects.dispose();
  const resumed = fixture();
  resumed.effects.activate();
  assert.equal(previous.calls.voices.length, 1);
  assert.equal(resumed.calls.voices.length, 0);
  assert.equal(await resumed.effects.play('wave', 24), true);
  resumed.effects.dispose();
});

test('preloading is silent and the current cue can wait for the trusted unlock', async () => {
  const { effects, calls, context, mixer, listeners } = fixture();
  context.state = 'suspended';
  mixer.state = 'locked';
  assert.equal(await effects.preload('wave', 24), true);
  assert.deepEqual(calls.voices, []);
  const cue = effects.play('wave', 24);
  await flush();
  assert.equal(listeners.size, 1);
  effects.activate();
  assert.equal(await cue, true);
  assert.equal(calls.resumed, 1);
  assert.equal(calls.fetched.length, 1);
  assert.equal(listeners.size, 0);
  effects.dispose();
});

test('a delayed asset warms the cache but its stale cue never starts', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let deliver;
  const { effects, calls } = fixture({ read: path => new Promise(resolve => { deliver = () => resolve(path); }) });
  const cue = effects.play('hit', 3);
  t.mock.timers.tick(400);
  assert.equal(await cue, false);
  deliver();
  await flush();
  assert.deepEqual(calls.voices, []);
  assert.equal(await effects.play('hit', 3), true);
  assert.equal(calls.fetched.length, 1);
  effects.dispose();
});

test('a long JavaScript task cannot play the stale cue before its timer runs', async t => {
  let time = 100;
  t.mock.method(performance, 'now', () => time);
  let deliver;
  const { effects, calls } = fixture({ read: path => new Promise(resolve => { deliver = () => resolve(path); }) });
  const cue = effects.play('hit', 3);
  time = 450;
  deliver();
  assert.equal(await cue, false);
  assert.deepEqual(calls.voices, []);
  assert.equal(await effects.play('hit', 3), true);
  effects.dispose();
});

test('disposing cancels pending sound and fetch, then disposes exactly one mixer', async () => {
  const { effects, calls } = fixture({ read: () => new Promise(() => {}) });
  const cue = effects.play('wave', 24);
  effects.dispose();
  effects.dispose();
  assert.equal(await cue, false);
  assert.equal(calls.fetched[0][1].aborted, true);
  assert.equal(calls.disposed, 1);
  assert.equal(await effects.play('wave', 24), false);
  assert.deepEqual(calls.voices, []);
});

test('invalid requests stay silent, and a failed read can retry', async () => {
  let fail = true;
  const { effects, calls } = fixture({ read(path) {
    if (fail) throw Error('Unreachable audio');
    return Promise.resolve(path);
  } });
  assert.equal(await effects.play('other', 24), false);
  assert.equal(await effects.play('wave', -1), false);
  assert.equal(await effects.play('wave', 100), false);
  assert.equal(calls.created.length, 0);
  assert.equal(await effects.play('wave', 24), false);
  fail = false;
  assert.equal(await effects.play('wave', 24), true);
  assert.equal(calls.fetched.length, 2);
  effects.dispose();
});

test('a missing original sample stays silent and a second cue reuses the absence', async () => {
  const { effects, calls } = fixture({ read: async () => undefined });
  assert.equal(await effects.preload('hit', 99), false);
  assert.equal(await effects.play('hit', 99), false);
  assert.equal(calls.fetched.length, 1);
  assert.deepEqual(calls.decoded, []);
  effects.dispose();
});
