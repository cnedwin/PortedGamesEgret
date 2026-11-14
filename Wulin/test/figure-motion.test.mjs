import assert from 'node:assert/strict';
import { register } from 'node:module';
import { test } from 'node:test';

register('../tools/egret-resolve.mjs', import.meta.url);
const { sampleAnimationTrack3D } = await import('@egret/engine/world3d');
const { ACTIONS, STRIKE_CONTACT, STRIKE_OF, clipOf } = await import('../src/view/figure-motion.mjs');

const sample = (clip, bone, path, time) => {
  const track = clip.tracks.find(track => track.targetName === bone && track.path === path);
  assert.ok(track, `${bone} ${path}`);
  const values = new Float32Array(track.size);
  sampleAnimationTrack3D(track, time, values, { index: 0 });
  return [...values];
};

test('all nine martial art classes have distinct contact poses and visible preparation', () => {
  const strikes = ['fist', 'palm', 'leg', 'point', 'saber', 'sword', 'spear', 'staff', 'dart'];
  const contacts = new Set();
  for (const klass of strikes) {
    const name = STRIKE_OF[klass];
    const clip = clipOf(name);
    const contact = STRIKE_CONTACT[name];
    assert.ok(contact > .08 && contact < ACTIONS[name].length / 2, name);
    const bodyPose = (time) => ['hips', 'chest', 'shoulderL', 'shoulderR', 'legR', 'grip'].flatMap(bone =>
      sample(clip, bone, 'quaternion', time).map(value => Number(value.toFixed(3))));
    const impact = bodyPose(contact);
    assert.notDeepEqual(bodyPose(contact / 2), impact, name);
    assert.notDeepEqual(bodyPose(ACTIONS[name].length), impact, name);
    contacts.add(JSON.stringify(impact));
    assert.strictEqual(clipOf(name), clip);
  }
  assert.equal(contacts.size, strikes.length);
});

test('cloth follows the action, and a fallen fighter holds its last pose', () => {
  const blade = clipOf('slash');
  assert.notDeepEqual(sample(blade, 'clothBack', 'quaternion', 0),
    sample(blade, 'clothBack', 'quaternion', STRIKE_CONTACT.slash));
  const down = clipOf('down');
  const bodyAt = time => sample(down, 'hips', 'position', time);
  assert.ok(bodyAt(ACTIONS.down.length)[1] < bodyAt(.15)[1] - .3);
  assert.deepEqual(bodyAt(down.duration), bodyAt(ACTIONS.down.length + .03));
});
