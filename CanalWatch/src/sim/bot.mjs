// 一个按计划下塔的电脑玩家：给平衡脚本和测试用，看一局在某种打法下能不能守住、剩几条命。
// A computer player that builds to a plan: for the balance script and the tests, to see whether a game can be held
// with a way of playing, and with how many lives left.
import { TOWERS, WAVES } from './data.mjs';
import { build, callWave, createWorld, shutGate, step, upgrade, WAYS } from './world.mjs';

/** The plan a fair player might follow: plot, then tower, in the order they are wanted. */
export const PLAN = [
  [5, 'crossbow'],
  [1, 'crossbow'],
  [4, 'trebuchet'],
  [9, 'fire'],
  [7, 'gong'],
  [6, 'trebuchet'],
  [10, 'crossbow'],
  [8, 'fire'],
  [2, 'crossbow'],
  [11, 'trebuchet'],
  [0, 'fire'],
  [3, 'crossbow']
];

/**
 * Play one game. `plan` is the build order; `gates` shuts a gate when boats pile above it; `early` calls waves at
 * once; `upgrades` raises towers once all are built. Returns the finished world.
 */
export function playOut({ seed = 1, difficulty = 'normal', plan = PLAN, gates = true, early = false, upgrades = true, limit = 3600 } = {}) {
  const world = createWorld(seed, difficulty);
  let next = 0;
  while (world.state !== 'won' && world.state !== 'lost' && world.time < limit) {
    // Build the next tower of the plan when there is the silver for it; then raise the cheapest.
    while (next < plan.length && build(world, plan[next][0], plan[next][1]).ok) next++;
    if (upgrades && next >= Math.min(plan.length, 6)) {
      const raise = world.towers
        .filter((tower) => tower && TOWERS[tower.kind].levels[tower.level + 1])
        .sort((a, b) => TOWERS[a.kind].levels[a.level + 1].cost - TOWERS[b.kind].levels[b.level + 1].cost)[0];
      if (raise && (next >= plan.length || world.silver > 260)) upgrade(world, raise.plot);
    }
    if (gates)
      for (const [index, gate] of world.gates.entries()) {
        const above = world.raiders.filter((r) => r.way === 'water' && r.s < gate.at && r.s > gate.at - 220).length;
        if (above >= 3) shutGate(world, index);
      }
    if (early && (world.state === 'break' || world.state === 'ready')) callWave(world);
    step(world, 1 / 20);
  }
  return world;
}

export { WAVES, WAYS };
