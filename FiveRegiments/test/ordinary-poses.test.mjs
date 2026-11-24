import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ordinaryCuts } from '../src/view/ordinary-poses.mjs';
import { axisAngle, len, qrot, sub } from '../src/view/rig.mjs';

const arsenal = [
  { main: 'sabre' }, { main: 'jian' }, { main: 'axe', two: true },
  { main: 'ji', two: true }, { main: 'knife' }
];
const lines = ['R', 'L', 'O', 'T'];
const bodyVector = (pose, key) => qrot(axisAngle([0, 1, 0], pose.t), pose[key]);

test('ordinary weapons use distinct chambers and finishes while retaining the intended four lines', () => {
  const cuts = arsenal.map(ordinaryCuts);
  for (const line of lines) {
    assert.equal(new Set(cuts.map((set) => JSON.stringify(set[line][0]))).size, 5);
    assert.equal(new Set(cuts.map((set) => JSON.stringify(set[line][2]))).size, 5);
  }
  for (const set of cuts) {
    assert.ok(bodyVector(set.R[0], 'b')[0] < -0.7, 'right cut chambers on the right');
    assert.ok(bodyVector(set.L[0], 'b')[0] > 0.7, 'left cut chambers on the left');
    assert.ok(bodyVector(set.O[0], 'b')[1] > 0.8, 'overhead chamber is raised');
    assert.ok(bodyVector(set.T[0], 'b')[2] > 0.95, 'thrust is already pointed forward');
    for (const line of lines) {
      assert.ok(bodyVector(set[line][0], 'r')[2] >= 0.14, 'the hand chambers in front of the torso');
    }
  }
  const [,, axe, ji, knife] = cuts;
  assert.ok(bodyVector(axe.R[0], 'r')[1] > bodyVector(knife.R[0], 'r')[1] + 0.15, 'axe load is taller than the knife');
  assert.ok(bodyVector(ji.R[0], 'r')[1] < bodyVector(knife.R[0], 'r')[1], 'halberd chambers low');
});

test('ordinary contact anchors keep their prior reach, blade aim and chest pose', () => {
  for (const arms of arsenal) {
    const cuts = ordinaryCuts(arms);
    const pole = arms.main === 'ji';
    const side = pole ? 0.11 : 0.18;
    const reach = arms.two ? 0.39 : 0.44;
    const expected = {
      R: [[-0.22, -0.08, reach], [side, -0.04, 1], 0.17],
      L: [[-0.135, -0.075, reach], [side, -0.045, 1], -0.17],
      O: [[-0.185, 0.01, reach], [side, -0.34, 1], 0.06],
      T: [[pole ? -0.31 : -0.22, -0.16, reach + 0.03], [pole ? 0.15 : 0.21, 0.025, 1], 0.07]
    };
    for (const line of lines) {
      const contact = cuts[line][1];
      const [hand, blade, twist] = expected[line];
      assert.deepEqual(contact.r, hand);
      assert.ok(len(sub(bodyVector(contact, 'b'), blade)) < 1e-9);
      assert.equal(contact.t, twist);
    }
  }
});
