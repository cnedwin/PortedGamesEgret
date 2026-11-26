import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOCOMOTION, sampleLocomotion } from '../src/view/locomotion.mjs';
import { quatFromEuler, quatMultiply, vec3TransformQuat } from '../vendor/engine/dist/rendering/world3d/math3D.js';

const posed = ['hips', 'spine', 'head', 'legL', 'shinL', 'footL', 'legR', 'shinR', 'footR', 'armL', 'foreL', 'armR', 'foreR'];

for (const kind of ['walk', 'run']) {
  test(`${kind}: contact-aligned, continuous full cycles sampled from the 120 Hz recordings`, () => {
    const clip = LOCOMOTION[kind];
    assert.equal(clip.sourceHz, 120);
    assert(clip.strideMeters > 0.8 && clip.strideMeters < 4);
    assert(clip.duration > .45 && clip.duration < 1.6);
    const left = sampleLocomotion(kind, 0);
    assert.deepEqual(left, sampleLocomotion(kind, 1));
    assert.deepEqual(left, sampleLocomotion(kind, -Number.EPSILON / 4));
    assert.deepEqual(sampleLocomotion(kind, -0.25), sampleLocomotion(kind, .75));
    assert(left.contactL > .70);
    const right = sampleLocomotion(kind, .5);
    assert(right.contactR > .65);
    const preceding = sampleLocomotion(kind, .9999);
    for (const name of posed) {
      assert.equal(left[name].length, 3);
      assert(left[name].every(Number.isFinite));
      assert(Math.hypot(...left[name].map((v, axis) => v - preceding[name][axis])) < .015, `${name} wraps continuously`);
    }
    assert(Math.abs(left.lift - preceding.lift) < .005);
    const knee = Array.from({ length: 32 }, (_, i) => sampleLocomotion(kind, i / 32).shinL[0]);
    assert(Math.max(...knee) - Math.min(...knee) > .7, 'the captured step contains knee flexion');
    for (let index = 0; index < 48; index++) {
      const sample = sampleLocomotion(kind, index / 48);
      assert(sample.contactL >= 0 && sample.contactL <= 1);
      assert(sample.contactR >= 0 && sample.contactR <= 1);
    }
  });
}

test('run has longer strides, faster cadence and more knee flexion than the walk', () => {
  assert(LOCOMOTION.run.duration < LOCOMOTION.walk.duration);
  assert(LOCOMOTION.run.strideMeters > LOCOMOTION.walk.strideMeters);
  const maximum = kind => Math.max(...Array.from({ length: 32 }, (_, i) => sampleLocomotion(kind, i / 32).shinL[0]));
  assert(maximum('run') > maximum('walk') + .25);
});

test('sampling can reuse an existing pose and all its rotation arrays', () => {
  const target = sampleLocomotion('walk', 0);
  const knee = target.shinL;
  assert.equal(sampleLocomotion('run', .25, target), target);
  assert.equal(target.shinL, knee);
  assert.deepEqual(target, sampleLocomotion('run', .25));
  assert.throws(() => sampleLocomotion('walk', NaN), RangeError);
  assert.throws(() => sampleLocomotion('swim', 0), RangeError);
});

test('retargeted plants bring the boot to the ground without flattening the swing in the run', () => {
  const rotation = angles => quatFromEuler([], ...angles);
  const child = (parent, angles) => quatMultiply([], parent, rotation(angles));
  const height = (transform, offset) => vec3TransformQuat([], offset, transform)[1];
  const lowestSole = (sample, side) => {
    const hips = rotation(sample.hips);
    const leg = child(hips, sample['leg' + side]);
    const shin = child(leg, sample['shin' + side]);
    const foot = child(shin, sample['foot' + side]);
    const ankleHeight = .94 + sample.lift + height(hips, [side === 'L' ? .1 : -.1, 0, 0]) + height(leg, [0, -.45, 0]) + height(shin, [0, -.404, 0]);
    return ankleHeight + Math.min(height(foot, [0, -.073, -.052]), height(foot, [0, -.073, .15]));
  };
  const peak = {};
  for (const kind of ['walk', 'run']) {
    peak[kind] = 0;
    for (let i = 0; i < 48; i++) {
      const sample = sampleLocomotion(kind, i / 48);
      for (const side of ['L', 'R']) {
        const sole = lowestSole(sample, side);
        if (sample['contact' + side] > .85) assert(Math.abs(sole) < .025, `${kind} strongly planted ${side} foot, phase ${i / 48}`);
        peak[kind] = Math.max(peak[kind], sole);
      }
    }
  }
  assert(peak.run > peak.walk * 1.8);
});
