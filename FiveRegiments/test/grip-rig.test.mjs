import assert from 'node:assert/strict';
import { test } from 'node:test';
import { add, createRig, fitElbowPole, fitLinkedGrip, gripRotation, len, qrot, sub, unit } from '../src/view/rig.mjs';

function near(actual, expected) {
  assert.ok(actual, 'expected a feasible pose');
  assert.ok(Math.hypot(...actual.map((value, i) => value - expected[i])) < 1e-7, String(actual));
}

test('a linked grip preserves its target inside both reach balls and in front of the chest', () => {
  const target = [0, 0.2, 0.75];
  assert.equal(fitLinkedGrip(target, [-1, 0, 0], Math.SQRT2, [1, 0, 0], Math.SQRT2, [0, 0, 1], 0.6), target);
});

test('the shared grip clamps to the closest spot on the chest plane and both reach limits', () => {
  const fit = (target, forward, front) => fitLinkedGrip(target, [-1, 0, 0], Math.SQRT2, [1, 0, 0], Math.SQRT2, forward, front);
  near(fit([0, 0, -2], [0, 0, 1], 0.6), [0, 0, 0.6]);
  near(fit([0, 3, -2], [0, 0, 1], 0.6), [0, 0.8, 0.6]);
  near(fit([0, 3, -2], [0, 1, 0], 1), [0, 1, 0]);
  near(fit([0, 3, 0], [0, 0, 1], -1), [0, 1, 0]);
  assert.equal(fit([0, 0, -2], [0, 0, 1], 1.01), null);
});

test('overlapping nested reach balls project to the smaller ball, and disjoint reaches have no fit', () => {
  near(fitLinkedGrip([2, 0, -2], [0, 0, 0], 3, [1, 0, 0], 1, [0, 0, 1], 0.6), [1.8, 0, 0.6]);
  assert.equal(fitLinkedGrip([0, 0, 1], [-2, 0, 0], 1, [2, 0, 0], 1, [0, 0, 1], 0), null);
});

test('the extra clearance plane preserves the nearest shared grip when it is the sole active limit', () => {
  const target = [0, 0, 0.3];
  const fit = (bound) => fitLinkedGrip(target, [-1, 0, 0], Math.SQRT2, [1, 0, 0], Math.SQRT2,
    [0, 0, 1], 0.2, { normal: [1, 0, 0], bound });
  assert.equal(fit(-0.05), target);
  near(fit(0.05), [0.05, 0, 0.3]);
});

test('independent planes clamp a shared grip to the overlap of the two reach intervals', () => {
  near(fitLinkedGrip([0, -0.6, -1], [-1, 0, 0], Math.SQRT2, [1, 0, 0], Math.SQRT2,
    [0, 0, 1], 0.6, { normal: [0, 0.6, 0.8], bound: 0.72 }), [0, 0.4, 0.6]);
  near(fitLinkedGrip([2, -2, -3], [-0.6, 0, 0], 1.2, [0.4, 0, 0], 1,
    [0, 0, 1], 0.6, { normal: [0, 1, 0], bound: 0.5 }), [-0.6 + Math.sqrt(0.83), 0.5, 0.6]);
  assert.equal(fitLinkedGrip([0, 0, 0], [0, 0, 0], 1, [0, 0, 0], 1,
    [0, 0, 1], 0.8, { normal: [0, 1, 0], bound: 0.8 }), null);
});

test('parallel planes can tighten a clearance limit, form a valid slab, or make the fit impossible', () => {
  const fit = (target, normal, bound) => fitLinkedGrip(target, [0, 0, 0], 2, [0, 0, 0], 1,
    [0, 0, 1], 0.2, { normal, bound });
  near(fit([0, 0, 0], [0, 0, 1], 0.4), [0, 0, 0.4]);
  near(fit([0, 0, 0.9], [0, 0, -1], -0.7), [0, 0, 0.7]);
  assert.equal(fit([0, 0, 0], [0, 0, -1], -0.1), null);
  const almostOpposite = unit([0, 1e-5, -1]);
  near(fit([0, -0.6, -1], almostOpposite, 0.2 * almostOpposite[2]), [0, 0, 0.2]);
});

test('grip rotation seats the captured hand along the blade and fingers toward the edge', () => {
  const hand = { along: [0, 1, 0], fingers: [0, 0, 1] };
  const rotation = gripRotation(hand, [-1, 0, 0], [0, 0, -1]);
  near(qrot(rotation, hand.along), [-1, 0, 0]);
  near(qrot(rotation, hand.fingers), [0, 0, -1]);
});

test('the elbow clears the chest toward the wrist without changing the wrist target', () => {
  const routes = { forward: [0, 0, 1], front: 0.2, outward: [1, 0, 0], side: 1.2 };
  const axis = [1, 0, 0];
  const expected = [0, -Math.sqrt(0.96), 0.2];
  near(fitElbowPole([0, -1, 0], axis, [0, 0, 0], 1, [0, 0, 0.4], routes), expected);
  near(fitElbowPole([0, 0, 1], axis, [0, 0, 0], 1, [0, 0, 0.4], routes), [0, 0, 1]);
  near(fitElbowPole([0, 0, -1], axis, [1.5, 0, 0], 1, [1.5, 0, 0.4], routes), [0, 0, -1]);
});

test('a shoulder limit keeps the upper arm outside the ribs when both limits can be met', () => {
  const routes = { forward: [0, 0, 1], front: 0.2, outward: [1, 0, 0], side: 1.2,
    shoulderOut: [1, 0, 0], shoulderSide: 0.15 };
  const preferred = [-1, 0, 0], axis = [0, 1, 0], centre = [0, 0, 0], wrist = [0, 0, 0.4];
  near(fitElbowPole(preferred, axis, centre, 1, wrist, routes), [0.15, 0, Math.sqrt(1 - 0.15 ** 2)]);
  near(fitElbowPole(preferred, axis, centre, 1, wrist, { ...routes, shoulderSide: 1.01 }), [-Math.sqrt(0.96), 0, 0.2]);
});

function modelArm() {
  const root = {};
  const nodes = {};
  function bone(name, parent, position) {
    const node = { parent, position, quaternion: [0, 0, 0, 1], setQuaternion(...q) { this.quaternion = q; } };
    nodes[name] = node;
    return node;
  }
  for (const [side, x] of [['r', -0.2], ['l', 0.2]]) {
    const shoulder = bone('upperarm_' + side, root, [x, 0, 0]);
    const elbow = bone('lowerarm_' + side, shoulder, [0, -0.3, 0]);
    const hand = bone('hand_' + side, elbow, [0, -0.25, 0]);
    bone('index_01_' + side, hand, [0.02, -0.05, 0]);
    bone('middle_01_' + side, hand, [0, -0.05, 0]);
    bone('pinky_01_' + side, hand, [-0.02, -0.05, 0]);
  }
  return createRig(nodes, { scale: 1, turn: 0, root });
}

test('a parallel elbow pole still reaches its target and a target on the shoulder keeps a valid bend', () => {
  const rig = modelArm();
  const shoulder = rig.world('upperarm_r').t;
  const target = add(shoulder, [0.2, 0.2, 0.2]);
  const parallel = unit(sub(target, shoulder));
  rig.reachArm('r', target, parallel, null);
  near(rig.world('hand_r').t, target);

  rig.reachArm('r', shoulder, parallel, null);
  const elbow = rig.world('lowerarm_r').t;
  const wrist = rig.world('hand_r').t;
  assert.ok(Math.abs(len(sub(elbow, shoulder)) - 0.3) < 1e-7);
  assert.ok(Math.abs(len(sub(wrist, elbow)) - 0.25) < 1e-7);
  assert.ok(Math.abs(len(sub(wrist, shoulder)) - 0.0501) < 1e-7);
});

test('a constrained elbow does not flip to the other side of the bend circle during a cut', () => {
  const rig = modelArm();
  const target = [0.18, 0, 0.24];
  const routes = { forward: [0, 0, 1], front: 0.22, outward: [-1, 0, 0], side: 0.2 };
  rig.reachArm('r', target, [0, -0.01, -1], null, 1, 0, null, null, 0, null, routes);
  const previous = rig.world('lowerarm_r').t;
  rig.reachArm('r', target, [0, 0.01, -1], null, 1, 0, null, null, 0, null, routes);
  const current = rig.world('lowerarm_r').t;
  assert.ok(len(sub(previous, current)) < 0.035, String(current));
  assert.ok(current[2] >= routes.front - 1e-7);
  near(rig.world('hand_r').t, target);
});
