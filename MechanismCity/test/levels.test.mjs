// 每一关都能通：用页面里同一套模拟，把记下的解法重放一遍。
// Every level can be won: the recorded solutions are replayed through the same simulation the page runs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { loadMap, play } = await import('../tools/solve.mjs');
const levels = JSON.parse(readFileSync(new URL('../levels/levels.json', import.meta.url), 'utf8'));
const solutions = JSON.parse(readFileSync(new URL('../src/levels/solutions.json', import.meta.url), 'utf8'));

test('there are twelve levels, each with a title, a map and a par', () => {
  assert.equal(levels.length, 12);
  for (const level of levels) {
    assert.ok(level.title && level.en && level.file, level.id);
    assert.ok(level.par >= 1 && level.par <= level.pellets, level.id);
  }
});

for (const level of levels)
  test(`${level.id} ${level.title}: the recorded aims open every lock with the pellets given`, () => {
    const solution = solutions[level.id];
    assert.ok(solution, 'no solution recorded');
    const map = loadMap(level.file),
      { sim, events } = play(map, solution.shots);
    assert.ok(sim.state.won, `not won; ${sim.locks.filter((lock) => lock.open).length}/${sim.locks.length} locks`);
    assert.ok(solution.shots.length <= level.pellets);
    assert.ok(events.some((event) => event.type === 'lock'));
    assert.ok(sim.stars() >= 1 && sim.stars() <= 3);
  });

test('a level is not won without a shot', () => {
  for (const level of levels) {
    const { sim } = play(loadMap(level.file), [], { seconds: 4 });
    assert.ok(!sim.state.won, level.id);
  }
});

// A player does not fire the moment the city is still. The recorded aims win however long each shot waits.
test('the recorded aims win whether a shot is fired at once or after a pause', async () => {
  const { createLevelSim } = await import('../src/sim/sim.mjs');
  for (const level of levels) {
    const map = loadMap(level.file),
      shots = solutions[level.id].shots;
    for (const wait of [0.4, 2.5]) {
      const sim = createLevelSim(map, { onEvent() {} });
      let next = 0,
        still = 0;
      for (let t = 0; t < 40 && !sim.state.won && !sim.state.lost; t += 1 / 60) {
        still = next < shots.length && sim.ready() ? still + 1 / 60 : 0;
        if (still >= wait) {
          sim.fire(...shots[next++]);
          still = 0;
        }
        sim.update(1 / 60);
      }
      assert.ok(sim.state.won, `${level.id} after ${wait}s`);
    }
  }
});
