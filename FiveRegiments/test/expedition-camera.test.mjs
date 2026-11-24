import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCameraRig } from '../src/view/camera.mjs';

const place = { radius: 30, posts: [], spawn: { x: 0, z: 11 }, exit: { x: 0, z: -18, r: 2.5 } };
const depotDefeat = { hero: { x: 0.685, z: -18.139, floor: 0 }, yaw: -0.616, pitch: 0, place, dead: true, finish: 1 };

function capture(params) {
  const shot = {};
  const rig = createCameraRig({
    setPosition(...position) { shot.position = position; },
    lookAt(...look) { shot.look = look; }
  });
  rig.snap([3.65, 1.7, -23.19], [0.12, 1.3, -14.87]);
  rig.update(1 / 60, params);
  return shot;
}

test('a defeat at the grain depot gate immediately frames the fallen fighter from the field', () => {
  const shot = capture(depotDefeat);
  // Existing shoulder framing approaches the back of the rotated gatehouse, whose near face is around z=-18.9.
  assert.ok(shot.position[2] > depotDefeat.hero.z + 2, 'the view stays on the field side of the fallen fighter');
  assert.ok(Math.abs(shot.look[0] - depotDefeat.hero.x) < 0.1 && Math.abs(shot.look[2] - depotDefeat.hero.z) < 0.1);
  assert.ok(shot.look[1] > 0 && shot.look[1] < 1, 'the target is the fallen fighter');
});

test('live fights, victories and defeats away from the exit keep their existing camera', () => {
  const openField = { radius: place.radius, posts: place.posts };
  for (const params of [
    { ...depotDefeat, dead: false, finish: 0 },
    { ...depotDefeat, dead: false },
    { ...depotDefeat, hero: { x: 6, z: -10, floor: 0 } }
  ]) assert.deepEqual(capture(params), capture({ ...params, place: openField }));
});
