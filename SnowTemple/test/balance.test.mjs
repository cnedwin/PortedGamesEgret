// The whole game played without a picture by the rule-driven player, through the engine's headless runner.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { climb, stand } from '../tools/balance.mjs';

test('a careful player climbs every tier', () => {
  for (const tier of [2, 3, 4, 5, 7]) {
    const [run] = climb(tier, [tier], 600);
    assert.ok(run.finished, `tier ${tier}`);
    assert.ok(run.summary.learned.split(' ').length >= 2, 'pages were read on the way');
    assert.ok(run.slowestMs < 50, `no step of the rules is slow (${run.slowestMs.toFixed(1)} ms)`);
  }
});

test('the yard is held for a while, and not for ever', () => {
  const [run] = stand([1]);
  assert.ok(run.finished, 'the stand ends in a fall');
  assert.ok(run.summary.wave >= 3, `held to wave ${run.summary.wave}`);
});
