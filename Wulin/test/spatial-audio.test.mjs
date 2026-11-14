import assert from 'node:assert/strict';
import test from 'node:test';
import { createSpatialAudio, spatialPlacement } from '../src/ui/spatial-audio.mjs';

test('moving and turning the camera changes audibility and direction independently', () => {
  const source = { kind: 'forge', x: 10, y: 1, z: 0 };
  const camera = { target: [0, 0, 0], distance: 18, yaw: 0 };
  const near = spatialPlacement(source, camera);
  const turned = spatialPlacement(source, { ...camera, yaw: Math.PI });
  const zoomedOut = spatialPlacement(source, { ...camera, distance: 90 });
  const distant = spatialPlacement(source, { ...camera, target: [-140, 0, 0] });
  assert.ok(near.pan > 0);
  assert.equal(turned.pan, -near.pan);
  assert.equal(turned.gain, near.gain);
  assert.ok(near.gain > zoomedOut.gain && zoomedOut.gain > distant.gain);
  assert.ok(near.cutoff > zoomedOut.cutoff && zoomedOut.cutoff > distant.cutoff);
  assert.equal(distant.gain, 0);
});

test('leaving the 3D scene cancels any unfinished audio loads', async () => {
  const { promise, resolve } = Promise.withResolvers();
  const context = { currentTime: 1 };
  let started = 0, requested = 0;
  context.createGain = () => { started++; };
  const clips = { context, ready: true, load: () => { requested++; return promise; } };
  const audio = createSpatialAudio(clips, { on: true, volume: .36 });
  const scene = { soundSources: () => [{ kind: 'bell', x: 0, y: 2, z: 0 }] };
  const camera = { target: [0, 0, 0], distance: 20, yaw: 0 };
  audio.select(scene);
  audio.update(camera);
  assert.equal(requested, 1);
  audio.select(undefined);
  resolve({});
  await promise;
  assert.equal(started, 0);
});
