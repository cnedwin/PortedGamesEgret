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
  assert.equal(bowReleasePose({ kind: 'skill', id: 'volley', t: 0.42 }), null);
});
