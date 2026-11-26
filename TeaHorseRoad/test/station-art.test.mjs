import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { Scene3D, createBoxGeometry3D, createGeometryBuilder3D, createStandardMaterial3D } = await import('@egret/engine/world3d');
const { createLandmarks } = await import('../src/world/landmarks.mjs');
const { directionAt, pointAt, STATIONS } = await import('../src/world/route.mjs');

const material = createStandardMaterial3D();
const model = () => ({ geometry: createBoxGeometry3D(), material });
const matches = (scene, art) => scene.children.filter(node => node.geometry === art.geometry);

function makeLandmarks(options) {
  const scene = new Scene3D();
  const bodies = [];
  const physics = { createBody(body) { bodies.push(body); return body; } };
  return { scene, bodies, landmarks: createLandmarks(scene, physics, options) };
}

function gateModel(blocked) {
  const builder = createGeometryBuilder3D();
  const post = createBoxGeometry3D({ width: 1, height: 6, depth: 1 });
  for (const x of [-3, 3]) builder.add(post, { position: [x, 3, 0] });
  builder.add(createBoxGeometry3D({ width: 8, height: 1, depth: 2 }), { position: [0, 6, 0] });
  if (blocked) builder.add(post, { position: [0, 3, 0] });
  return { geometry: builder.build(), material };
}

test('fitted station art keeps station names, yard, hall anchors and physics', () => {
  const startAndCreek = model(), gorge = model(), plateau = model(), stable = model();
  const baseline = makeLandmarks({ hallModel: startAndCreek });
  const candidate = makeLandmarks({ hallModel: startAndCreek, stationArt: { gorge, plateau, stable } });
  const { scene, landmarks } = candidate;
  assert.equal(matches(scene, startAndCreek).length, 2);
  for (const [stationId, art] of [['gorge', gorge], ['plateau', plateau]]) {
    const [hall] = matches(scene, art);
    const location = landmarks.stations.find(station => station.id === stationId).hall;
    assert.deepEqual([...hall.position], [...new Float32Array([location.x, location.y, location.z])]);
    assert(hall.castShadow && hall.receiveShadow);
    assert.equal(hall.children.length, stationId === 'gorge' ? 2 : 0);
  }
  assert.equal(matches(scene, stable).length, STATIONS.length);
  const stationData = ({ node, ...station }) => station;
  assert.deepEqual(landmarks.stations.map(stationData), baseline.landmarks.stations.map(stationData));
  assert.deepEqual(candidate.bodies, baseline.bodies);
});

test('the gateway uses the fitted art only when its central lane remains open', () => {
  const open = gateModel(false);
  const blocked = gateModel(true);
  const candidate = makeLandmarks({ stationArt: { gate: open } });
  const fallback = makeLandmarks({ stationArt: { gate: blocked } });
  const [mesh] = matches(candidate.scene, open);
  const route = STATIONS[0].s + 46;
  const origin = pointAt(route);
  assert.deepEqual([mesh.position[0], mesh.position[2]], [...new Float32Array([origin[0], origin[2]])]);
  const [dx, dz] = directionAt(route);
  const [, ry, , rw] = mesh.quaternion;
  assert(Math.hypot(2 * ry * rw + dx, 1 - 2 * ry * ry + dz) < 1e-6);
  const [plaque] = mesh.children;
  assert.equal(plaque.children.length, 2, 'Only Chinese and English lettering should sit on the fascia');
  assert(plaque.position[1] >= 4.8 && plaque.position[2] > 0, 'The sign must sit above the lane on the +Z face');
  assert.equal(matches(fallback.scene, blocked).length, 0);
  assert.deepEqual(candidate.bodies, fallback.bodies);
});
