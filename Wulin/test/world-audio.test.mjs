import assert from 'node:assert/strict';
import test from 'node:test';
import { courtyardTrack, createWorldAmbience } from '../src/ui/world-audio.mjs';

test('courtyard follows the visual day and night boundaries', () => {
  assert.deepEqual([0, 5.09, 5.1, 6.8, 12, 17, 19.39, 19.4].map(courtyardTrack), [
    'courtyard-night', 'courtyard-night', 'courtyard-dusk', 'courtyard', 'courtyard',
    'courtyard-dusk', 'courtyard-dusk', 'courtyard-night',
  ]);
});

test('switching scenes discards late audio and keeps the marching layer tied to the map', async () => {
  const requests = new Map();
  const sources = [];
  const gains = [];
  const context = {
    currentTime: 10, destination: {},
    createBufferSource() {
      const source = { connect: node => node, start() { sources.push(this); }, stop(at) { this.stops = at; } };
      return source;
    },
    createGain() {
      const gain = { value: 0, cancelScheduledValues() {}, setValueAtTime() {}, setTargetAtTime(value) { this.target = value; } };
      gains.push(gain);
      return { gain, connect: node => node };
    },
  };
  const clips = {
    context, ready: true,
    load(url) {
      const name = url.pathname.split('/').at(-1);
      if (!requests.has(name)) {
        let resolve;
        const promise = new Promise(done => { resolve = done; });
        requests.set(name, { promise, resolve: () => resolve(name) });
      }
      return requests.get(name).promise;
    },
  };
  const audio = createWorldAmbience(null, clips);
  audio.select('courtyard');
  audio.select('realm', true);
  requests.get('courtyard.mp3').resolve();
  requests.get('realm.mp3').resolve();
  requests.get('march.mp3').resolve();
  await Promise.resolve();
  assert.deepEqual(sources.map(source => source.buffer), ['realm.mp3', 'march.mp3']);
  audio.duck(true);
  assert.ok(Math.abs(gains[0].target - .36 * .94 * .38) < 1e-8);
  assert.ok(Math.abs(gains[1].target - .36 * .25) < 1e-8);
  audio.select('realm', false);
  assert.equal(sources[0].stops, undefined);
  assert.equal(sources[1].stops, 10.23);
  audio.select(undefined);
  assert.equal(sources[0].stops, 10.85);
});
