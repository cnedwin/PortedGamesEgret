import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CHALLENGES, createChallenge } from '../src/challenges.mjs';
import { loadMap, play } from '../tools/solve.mjs';

const levels = JSON.parse(readFileSync(new URL('../levels/levels.json', import.meta.url), 'utf8'));
const solutions = JSON.parse(readFileSync(new URL('../src/levels/solutions.json', import.meta.url), 'utf8'));

test('each campaign level has one described replay objective', () => {
  assert.deepEqual(Object.keys(CHALLENGES).sort(), levels.map(({ id }) => id).sort());
  for (const { id } of levels) {
    assert.ok(CHALLENGES[id].label.trim(), id);
    assert.ok(CHALLENGES[id].description.trim(), id);
  }
});

for (const level of levels) {
  test(`${level.id}: the recorded solution earns the replay objective only on victory`, () => {
    const challenge = createChallenge(level.id);
    const { sim, events } = play(loadMap(level.file), solutions[level.id].shots);
    try {
      assert.ok(sim.state.won);
      for (const event of events) {
        if (event.type === 'win') assert.equal(challenge.earned, false);
        challenge.observe(event);
        if (event.type === 'win') assert.equal(challenge.earned, true);
      }
      assert.equal(challenge.earned, true);
    } finally {
      sim.dispose();
    }
  });
}

test('a three-star bank shot in the first level does not earn the direct-arc objective', () => {
  const level = levels[0];
  const challenge = createChallenge(level.id);
  const { sim, events } = play(loadMap(level.file), [[-58, 94]]);
  try {
    assert.equal(sim.stars(), 3);
    assert.ok(events.some(({ type, on }) => type === 'hit' && on === 'ground'));
    events.forEach((event) => challenge.observe(event));
    assert.equal(challenge.earned, false);
  } finally {
    sim.dispose();
  }
});

test('the twin locks require cutting the rope and throwing the block on the same shot', () => {
  const challenge = createChallenge('l08');
  for (const type of ['shot', 'cut', 'lock', 'shot', 'tip', 'thrown', 'lock', 'win']) {
    challenge.observe({ type });
  }
  assert.equal(challenge.earned, false);
});

test('a rope already cut before a thunder blast does not qualify', () => {
  const challenge = createChallenge('l09');
  for (const type of ['shot', 'cut', 'boom', 'lock', 'win']) {
    challenge.observe({ type });
  }
  assert.equal(challenge.earned, false);
});

test('an earlier thunder blast cannot qualify a later rope cut', () => {
  const challenge = createChallenge('l09');
  for (const type of ['shot', 'boom', 'shot', 'cut', 'lock', 'win']) {
    challenge.observe({ type });
  }
  assert.equal(challenge.earned, false);
});

test('a spring event after victory cannot earn the replay objective', () => {
  const challenge = createChallenge('l06');
  for (const type of ['shot', 'lock', 'win', 'spring']) challenge.observe({ type });
  assert.equal(challenge.earned, false);
});

test('the spring must launch the winning pellet', () => {
  const challenge = createChallenge('l06');
  for (const type of ['shot', 'spring', 'shot', 'lock', 'win']) challenge.observe({ type });
  assert.equal(challenge.earned, false);
});

test('an unknown level has no replay objective', () => {
  const challenge = createChallenge('custom');
  challenge.observe({ type: 'win' });
  assert.equal(challenge.earned, false);
});
