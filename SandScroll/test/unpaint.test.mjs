// 拆画的规则：桶的容量加起来正好是画里每种颜料的沙；点一列只上最前面那只；传送带满了就不能再上；三只同色的桶合成
// 一只；装满的桶离开；沙全收完就过关；放上去的桶都够不着自己的颜色、传送带又满了，就会僵住判负；同一关每次发的桶
// 都一样；替身玩家能拆完。
// The unpaint rules: the buckets of each pigment hold exactly its sand; a tap moves only a lane's front bucket; a full
// belt takes no more; three of a colour merge; a full bucket leaves; all sand collected finishes; a full belt whose
// buckets cannot reach their colours jams and loses; a level deals the same buckets every time; the stand-in finishes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOARD, createRandom } from '../src/sim/sand.mjs';
import { PICTURE_TOP, UNPAINT_LEVELS, collectedShare, createUnpaint, stepUnpaint, tapLane } from '../src/sim/unpaint.mjs';
import { playUnpaint } from '../tools/unpaint-bot.mjs';

const { cols, rows } = BOARD;
const H = rows - PICTURE_TOP;
/** A picture in bands of the given pigments, wavy, as a stand-in for a sampled landscape. */
function picture(pigments, seed = 1) {
  const rng = createRandom(seed),
    color = new Uint8Array(cols * H),
    tone = new Uint8Array(cols * H).fill(128);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < cols; x++) {
      if (y < 40 && rng() < 0.6) continue; // a ragged sky
      color[y * cols + x] = pigments[(Math.floor((y + Math.sin(x / 15) * 12) / 50) + Math.floor(x / 80)) % pigments.length];
    }
  return { color, tone };
}
const run = (game, seconds) => {
  for (let t = 0; t < seconds; t += 1 / 60) stepUnpaint(game, 1 / 60);
  return game;
};

test('the buckets of each pigment hold exactly the sand of that pigment', () => {
  const level = UNPAINT_LEVELS[1],
    game = createUnpaint(1, 1, picture(level.pigments));
  const sand = {},
    held = {};
  for (const c of game.color) if (c) sand[c] = (sand[c] ?? 0) + 1;
  for (const b of game.lanes.flat()) held[b.pigment] = (held[b.pigment] ?? 0) + b.capacity;
  assert.deepEqual(held, sand);
  assert.equal(game.lanes.length, level.lanes);
  assert.equal(game.belt.length, level.belt);
});

test('a level deals the same buckets every time', () => {
  const deal = (seed) => createUnpaint(seed, 2, picture(UNPAINT_LEVELS[2].pigments)).lanes.map((q) => q.map((b) => `${b.pigment}:${b.capacity}`).join(',')).join('|');
  assert.equal(deal(1), deal(99));
});

test('a tap moves only the front bucket, and a full belt takes no more', () => {
  const game = createUnpaint(1, 0, picture(UNPAINT_LEVELS[0].pigments));
  const front = game.lanes[0][0],
    second = game.lanes[0][1];
  assert.equal(tapLane(game, 0), true);
  assert.equal(game.belt.filter(Boolean)[0], front);
  assert.equal(game.lanes[0][0], second);
  let taps = 1;
  for (let k = 0; k < 20 && game.belt.includes(null); k++) if (tapLane(game, k % game.lanes.length)) taps++;
  assert.equal(game.belt.includes(null), false);
  assert.equal(tapLane(game, 0), false);
});

test('three buckets of a colour merge into one, freeing two places', () => {
  const game = createUnpaint(1, 0, picture(UNPAINT_LEVELS[0].pigments));
  game.lanes = [
    [
      { id: 1, pigment: 2, capacity: 100, filled: 0 },
      { id: 2, pigment: 2, capacity: 120, filled: 0 },
      { id: 3, pigment: 2, capacity: 80, filled: 0 }
    ]
  ];
  tapLane(game, 0);
  tapLane(game, 0);
  tapLane(game, 0);
  const on = game.belt.filter(Boolean);
  assert.equal(on.length, 1);
  assert.equal(on[0].capacity, 300);
  assert.equal(on[0].big, true);
});

test('buckets draw their colour from the bottom row, leave when full, and all the sand finishes the picture', () => {
  const game = createUnpaint(3, 0, picture(UNPAINT_LEVELS[0].pigments));
  playUnpaint(game, { care: 1, limit: 400 });
  assert.equal(game.won, true, `collected ${Math.round(collectedShare(game) * 100)}%`);
  assert.equal(game.collected, game.total);
  assert.ok(game.color.every((c) => c === 0));
  assert.ok(game.lanes.every((q) => q.length === 0) && game.belt.every((b) => b === null));
});

test('a full belt whose buckets cannot reach their colours jams and loses', () => {
  const game = createUnpaint(1, 0, picture([2]));
  // Buckets of colours the picture does not have, all different so none merge, filling every place.
  game.lanes = [game.belt.map((_, k) => ({ id: 100 + k, pigment: [1, 3, 4, 5, 6][k], capacity: 50, filled: 0 }))];
  game.belt.forEach(() => tapLane(game, 0));
  run(game, 12);
  assert.equal(game.over, true);
  assert.equal(game.won, false);
});
