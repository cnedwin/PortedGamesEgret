import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudioGraph } from '../src/ui/audio-graph.mjs';

function backend() {
  let state = 'locked';
  const listeners = new Set(), events = [];
  const changed = next => { state = next; for (const listener of listeners) listener(next); };
  const context = { currentTime: 0, async resume() { events.push('resume'); changed('running'); }, async decodeAudioData(bytes) { events.push(['decode', bytes]); return { decoded: true }; } };
  const mixer = { get state() { return state; }, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
  const audio = { context, mixer, createInput(bus, options) { return { bus, options }; }, dispose() { events.push('dispose'); changed('closed'); } };
  return { audio, events, changed, mixer };
}

test('trusted input creates one native audio graph, resumes it only once and uses named buses', async () => {
  const fake = backend();
  let created = 0;
  const graph = createAudioGraph({ create(options) { created++; assert.deepEqual(options.buses, ['music', 'effects', 'voice', 'ambience']); return fake.audio; } });
  let running = 0;
  graph.onRunning(() => running++);
  assert.equal(graph.unlock({ isTrusted: false }), false);
  assert.equal(created, 0, 'cold title must not allocate an audio context');
  assert.equal(graph.unlock({ isTrusted: true }), true);
  assert.equal(graph.unlock({ isTrusted: true }), true);
  assert.equal(created, 1);
  assert.equal(graph.context, fake.audio.context);
  assert.deepEqual(graph.createInput('effects', { volume: .55 }), { bus: 'effects', options: { volume: .55 } });
  await Promise.resolve();
  assert.equal(running, 1);
  assert.equal(fake.events.filter(event => event === 'resume').length, 1);
  fake.changed('suspended');
  assert.equal(graph.ready, false, 'caller must not schedule a one-shot on a suspended clock');
  fake.changed('running');
  assert.equal(graph.ready, true);
  assert.equal(running, 2, 'scene loops can sync on a return from engine suspension');
  graph.dispose(); graph.dispose();
  assert.equal(graph.ready, false);
  assert.equal(graph.unlock({ isTrusted: true }), false);
  assert.equal(fake.events.filter(event => event === 'dispose').length, 1);
});

test('recordings use the same native context and coalesce decoding; a failed request is retryable', async () => {
  const fake = backend();
  let reads = 0;
  const graph = createAudioGraph({ create: () => fake.audio, request: async () => { reads++; return { ok: reads > 1, async arrayBuffer() { return new ArrayBuffer(2); } }; } });
  graph.unlock({ isTrusted: true });
  await assert.rejects(graph.load('one.mp3'));
  const a = graph.load('one.mp3'), b = graph.load('one.mp3');
  assert.equal(a, b);
  assert.deepEqual(await a, { decoded: true });
  assert.equal(reads, 2);
  assert.equal(fake.events.filter(event => Array.isArray(event) && event[0] === 'decode').length, 1);
  graph.dispose();
});
