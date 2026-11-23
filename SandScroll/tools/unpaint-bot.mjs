// 拆画的替身玩家：传送带有空位时，点各列最前面的桶里、它的颜色在沙盘最底下一行最多的那只；凑合成的优先。
// 用来看每一关能不能过、要点几次、会不会僵住。规则测试和 tools/balance.mjs 都用它。
// A stand-in for unpainting: while the belt has a free place, tap the front bucket whose colour is most common on the
// bottom row, preferring one that makes three of a colour. Used to see whether a level can be finished, in how many
// taps, and whether the belt jams. The rules test and tools/balance.mjs use it.
import { BOARD } from '../src/sim/sand.mjs';
import { stepUnpaint, tapLane } from '../src/sim/unpaint.mjs';

/** Choose a lane to tap, or -1 to wait. `care` from 0 (taps anything) to 1 (the best it can see). */
export function chooseLane(game, care = 1, rng = Math.random) {
  if (!game.belt.includes(null)) return -1;
  const { cols, rows } = BOARD,
    bottom = (rows - 1) * cols,
    on = {};
  for (let x = 0; x < cols; x++) on[game.color[bottom + x]] = (on[game.color[bottom + x]] ?? 0) + 1;
  const belted = {};
  for (const b of game.belt) if (b) belted[b.pigment] = (belted[b.pigment] ?? 0) + 1;
  let best = -1,
    bestScore = -Infinity;
  game.lanes.forEach((queue, lane) => {
    if (!queue.length) return;
    const p = queue[0].pigment;
    const score = (on[p] ?? 0) + (belted[p] === 2 ? 500 : 0) - (belted[p] ? 40 : 0) + (1 - care) * rng() * 400;
    if (score > bestScore) ((bestScore = score), (best = lane));
  });
  // A careful player waits rather than put a colour on the belt that is nowhere below and makes no three, as long as
  // a bucket already on the belt is still drawing.
  if (care > 0.5 && best >= 0) {
    const p = game.lanes[best][0].pigment,
      drawing = game.belt.some((b) => b && on[b.pigment]);
    if (!on[p] && belted[p] !== 2 && drawing) return -1;
  }
  return best;
}

/** Play a whole round; returns the game when it is over or after `limit` seconds. */
export function playUnpaint(game, { care = 1, pace = 0.6, limit = 900, rng = Math.random } = {}) {
  let wait = 0;
  while (!game.over && game.time < limit) {
    wait -= 1 / 60;
    if (wait <= 0) {
      const lane = chooseLane(game, care, rng);
      if (lane >= 0 && tapLane(game, lane)) wait = pace;
    }
    stepUnpaint(game, 1 / 60);
    game.events.length = 0;
  }
  return game;
}
