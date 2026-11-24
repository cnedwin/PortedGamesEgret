import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFight, strike } from '../src/sim/fight.mjs';
import { createMountedContactPresentation, mountedContactPoint } from '../src/view/mounted-contact.mjs';

test('a mounted right-cut hit records the positions from its actual hit tick', () => {
  const game = createFight({ hero: { regiment: 'plume' }, foes: [{ regiment: 'archer' }] });
  const [rider, foe] = game.men;
  Object.assign(rider, { x: 3, z: 0, face: 0 });
  Object.assign(foe, { x: 2, z: 1.8 });
  rider.act = { kind: 'swing', line: 'R', struck: true, strikeAt: 0.5 };
  const blow = rider.r.mounted.R;
  assert.deepEqual(strike(game, rider, { ...blow, line: 'R', all: true }), [foe]);
  const hit = game.events.find((e) => e.type === 'hit');
  assert.ok(hit.damage > 0);
  foe.z += 0.45;
  assert.deepEqual(hit.mountedImpact, { from: [3, 0], at: [2, 1.8], mounted: false, air: 0 });
});

test('a committed sweep picks the near contact, while held and missed cuts have no actual hit pose', () => {
  const game = createFight({ hero: { regiment: 'plume' }, foes: [{ regiment: 'archer' }, { regiment: 'tiger' }] });
  const [rider, near, far] = game.men;
  const blow = rider.r.mounted.R;
  Object.assign(rider, { x: 0, z: 0, face: 0, vx: 0, vz: 9.2 });
  Object.assign(near, { x: -1, z: 2.6, vx: 0, vz: 0 });
  Object.assign(far, { x: 2, z: 2.8, vx: 0, vz: 0 });
  rider.act = { kind: 'swing', line: 'R', t: 0.36, wind: blow.wind, blow, reach: blow.reach, awaitingRelease: true };
  const view = createMountedContactPresentation();
  assert.equal(view.target(game, rider), null);
  rider.act.awaitingRelease = false;
  assert.ok(view.target(game, rider).point[0] < 0, 'anticipates the nearer eligible opponent');
  Object.assign(rider.act, { struck: true, strikeAt: 0.5, t: 0.55 });
  assert.equal(view.target(game, rider), null);
  const record = (at) => ({ type: 'hit', mountedImpact: { from: [0, 1.3], at, mounted: false, air: 0 } });
  const nearHit = record([near.x, near.z]);
  view.remember(rider, nearHit);
  view.remember(rider, record([far.x, far.z]));
  const point = mountedContactPoint(nearHit.mountedImpact);
  assert.deepEqual(view.target(game, rider), { point, time: 0.5 });
  assert.deepEqual(view.target(game, rider), { point, time: null });
});
