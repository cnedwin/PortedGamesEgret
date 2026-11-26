import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bowReleasePose } from '../src/view/bow-release.mjs';

test('fan and gale change from drawn to empty on their existing projectile beat', () => {
  for (const id of ['fan', 'gale']) {
    const at = (t) => bowReleasePose({ kind: 'skill', id, t });
    assert.ok(at(0.05).pull < at(0.32).pull, 'pull visibly builds before release');
    assert.equal(at(0.419).loaded, true);
    assert.equal(at(0.419).string, 1);
    assert.equal(at(0.42).loaded, false);
    assert.ok(at(0.45).string < at(0.42).string, 'the bowstring springs forward');
    assert.ok(at(0.54).pull < at(0.419).pull, 'the rear hand relaxes');
    assert.ok(at(0.72).lift < at(0.54).lift, 'both arms return to ready');
    assert.equal(at(0.8).lift, 0);
  }
  assert.equal(bowReleasePose({ kind: 'skill', id: 'spin', t: 0.42 }), null);
});

test('retreat, explosive and web arrows telegraph and settle around their own release beats', () => {
  const skills = [
    { id: 'backStep', release: 0.26, end: 0.58 },
    { id: 'blast', release: 0.55, end: 0.9 },
    { id: 'web', release: 0.36, end: 0.7 }
  ];
  for (const { id, release, end } of skills) {
    const pose = (t) => bowReleasePose({ kind: 'skill', id, t });
    assert.ok(pose(0.04)?.pull < pose(release - 0.02)?.pull, id + ' must visibly draw');
    assert.equal(pose(release - 0.001).loaded, true);
    assert.equal(pose(release).loaded, false);
    assert.equal(pose(release + 0.07).loaded, false);
    assert.ok(pose(release + 0.03).string < pose(release - 0.001).string, id + ' must release the string');
    assert.ok(pose(release + 0.12).pull < pose(release - 0.001).pull, id + ' must relax the hand');
    assert.deepEqual(pose(end), { loaded: false, lift: 0, pull: 0, string: 0 });
  }
  const earlyLift = (id) => bowReleasePose({ kind: 'skill', id, t: 0.1 }).lift;
  assert.ok(earlyLift('backStep') > earlyLift('web'));
  assert.ok(earlyLift('web') > earlyLift('blast'));
});

test('volley stays raised and loads one fresh arrow for each of its three releases', () => {
  const pose = (t) => bowReleasePose({ kind: 'skill', id: 'volley', t });
  for (const beat of [0.25, 0.45, 0.65]) {
    const drawn = pose(beat - 0.005);
    assert.equal(drawn?.loaded, true);
    assert.equal(drawn.lift, 1);
    assert.ok(drawn.pull >= 0.9 && drawn.string >= 0.9);
    assert.equal(pose(beat).loaded, false);
    assert.ok(pose(beat + 0.02).string < drawn.string);
    const recoil = pose(beat + 0.065);
    assert.equal(recoil.loaded, false);
    assert.equal(recoil.string, 0);
    assert.ok(recoil.pull < drawn.pull);
    assert.equal(recoil.lift, 1);
  }
  for (const beat of [0.45, 0.65]) {
    const next = pose(beat - 0.105);
    assert.equal(next.loaded, true);
    assert.ok(next.string > 0 && next.string < pose(beat - 0.02).string);
  }
  assert.equal(pose(0.8).loaded, false);
  assert.deepEqual(pose(1.05), { loaded: false, lift: 0, pull: 0, string: 0 });
});
