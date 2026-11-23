// 规则：同一个种子结果一样；积木落下碰到沙就化成沙、粒数不多不少；沙会滑但滑不远；同色从左墙连到右墙就闪、然后消掉
// 并算进画的进度；连消；沙在线上待太久就输；进度满了就画成；同一处一直放会输（沙不会一路流到两边）。
// The rules: the same seed ends the same way; a piece breaks into exactly its grains where it meets sand; sand slides,
// but not far; one colour from wall to wall shines, then goes, and counts toward the painting; chains; sand over the
// line too long loses; a full count finishes the painting; dropping everything in one place loses (sand does not run
// all the way to both walls).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOARD, DANGER_GRACE, FLASH, LEVELS, SHAPES, createGame, dropPiece, pieceGrains, progress, step, takeChanges, turnBlocks, turnPiece } from '../src/sim/sand.mjs';

const { cols, rows } = BOARD;
const run = (game, seconds) => {
  for (let t = 0; t < seconds; t += 1 / 60) step(game, 1 / 60);
  return game;
};
const count = (game) => game.color.reduce((n, c) => n + (c ? 1 : 0), 0);

test('a round from the same seed and the same moves ends the same way', () => {
  const play = () => {
    const game = createGame(42);
    for (let k = 0; k < 12; k++) {
      dropPiece(game, k % 3, (k * 37) % 160);
      run(game, 1.2);
    }
    return [game.score, game.cleared, game.grains, Buffer.from(game.color).toString('base64').slice(0, 400)];
  };
  assert.deepEqual(play(), play());
});

test('turning a shape four times brings it back, and every shape stays at the origin', () => {
  for (const blocks of Object.values(SHAPES)) {
    const start = turnBlocks(blocks, 0);
    assert.deepEqual(turnBlocks(blocks, 4), start);
    for (let k = 0; k < 4; k++) {
      const turned = turnBlocks(blocks, k);
      assert.equal(Math.min(...turned.map(([x]) => x)), 0);
      assert.equal(Math.min(...turned.map(([, y]) => y)), 0);
      assert.equal(turned.length, blocks.length);
    }
  }
  const game = createGame(1);
  const before = pieceGrains(game.tray[0]);
  turnPiece(game, 0);
  const after = pieceGrains(game.tray[0]);
  assert.equal(before.w * before.h, after.w * after.h);
});

test('a dropped piece falls, breaks into exactly its grains, and a new piece takes its slot', () => {
  const game = createGame(7);
  const piece = game.tray[1],
    grains = pieceGrains(piece).mask.reduce((a, b) => a + b, 0);
  assert.equal(dropPiece(game, 1, 50), true);
  assert.notEqual(game.tray[1], piece);
  assert.equal(dropPiece(game, 0, 10), false, 'a second piece waits while one is falling');
  run(game, 3);
  assert.equal(game.falling, null);
  assert.equal(count(game), grains);
  assert.equal(game.grains, grains);
  // Every grain is of the piece's pigment and rests on the floor or on another grain.
  for (let i = 0; i < cols * (rows - 1); i++) if (game.color[i]) assert.ok(game.color[i + cols], `grain at ${i} floats`);
  const { events } = takeChanges(game);
  assert.ok(events.some((e) => e.kind === 'drop') && events.some((e) => e.kind === 'land'));
});

test('sand slumps where it lands: one piece stays near where it was dropped', () => {
  const game = createGame(3);
  dropPiece(game, 0, 90);
  run(game, 4);
  let left = cols,
    right = 0;
  for (let i = 0; i < cols * rows; i++)
    if (game.color[i]) {
      left = Math.min(left, i % cols);
      right = Math.max(right, i % cols);
    }
  assert.ok(left > 40 && right < 180, `spread from ${left} to ${right}`);
});

test('one colour from the left wall to the right shines, then goes, and counts toward the painting', () => {
  const game = createGame(5);
  // A strip of one pigment, two rows thick, across the floor; and a grain of another above it.
  for (let x = 0; x < cols; x++) for (const y of [rows - 1, rows - 2]) game.color[y * cols + x] = 2;
  game.color[(rows - 3) * cols + 100] = 1;
  game.unsettled = true;
  run(game, 0.1);
  assert.equal(game.clearing.length, 1);
  assert.equal(game.clearing[0].size, cols * 2);
  assert.ok(game.score >= cols * 2);
  run(game, FLASH + 0.2);
  assert.equal(game.clearing.length, 0);
  assert.equal(game.cleared, cols * 2);
  assert.ok(progress(game) > 0);
  // The grain above fell to the floor.
  assert.equal(game.color[(rows - 1) * cols + 100], 1);
});

test('a run that does not reach the right wall stays', () => {
  const game = createGame(5);
  for (let x = 0; x < cols - 1; x++) game.color[(rows - 1) * cols + x] = 2;
  game.unsettled = true;
  run(game, 0.5);
  assert.equal(game.clearing.length + game.cleared, 0);
});

test('a second run soon after the first is a chain, and scores more', () => {
  const game = createGame(5);
  for (let x = 0; x < cols; x++) {
    game.color[(rows - 1) * cols + x] = 2;
    game.color[(rows - 2) * cols + x] = 1;
  }
  game.unsettled = true;
  run(game, 0.1);
  assert.equal(game.clearing.length, 2);
  assert.equal(game.chain, 2);
  assert.ok(game.score > cols * 2);
});

test('sand over the line for too long ends the round', () => {
  const game = createGame(9);
  for (let x = 0; x < cols; x += 3) for (let y = BOARD.danger - 5; y < rows; y++) game.color[y * cols + x] = 1;
  run(game, DANGER_GRACE + 0.5);
  assert.equal(game.over, true);
  assert.equal(game.won, false);
  assert.ok(takeChanges(game).events.some((e) => e.kind === 'lost'));
  assert.equal(dropPiece(game, 0, 0), false);
});

test('the painting is finished when its count is reached', () => {
  const game = createGame(9);
  game.cleared = LEVELS[0].target;
  step(game, 1 / 60);
  assert.equal(game.won, true);
  assert.equal(progress(game), 1);
});

test('dropping every piece in the same place loses', () => {
  for (const x of [0, 60, 120]) {
    const game = createGame(3);
    while (!game.over && game.time < 120) {
      if (!game.falling) dropPiece(game, 0, x);
      step(game, 1 / 60);
    }
    assert.equal(game.won, false, `x ${x}`);
    assert.equal(game.cleared, 0, `x ${x}`);
  }
});

test('laying each colour in flat strips across the tray finishes the painting', () => {
  let won = 0;
  for (const seed of [2, 3, 4]) {
    const game = createGame(seed),
      at = {};
    let wait = 0;
    while (!game.over && game.time < 600) {
      wait -= 1 / 60;
      if (!game.falling && wait <= 0) {
        let slot = 0;
        for (let k = 0; k < 3; k++) if ((at[game.tray[k].pigment] ?? 0) > (at[game.tray[slot].pigment] ?? 0)) slot = k;
        for (let t = 0; t < 4; t++) {
          const g = pieceGrains(game.tray[slot]);
          if (g.w >= g.h) break;
          turnPiece(game, slot);
        }
        const piece = game.tray[slot],
          w = pieceGrains(piece).w,
          x = Math.min(at[piece.pigment] ?? 0, cols - w);
        dropPiece(game, slot, x);
        at[piece.pigment] = x + w >= cols ? 0 : x + w;
        wait = 2;
      }
      step(game, 1 / 60);
    }
    if (game.won) won++;
  }
  assert.ok(won >= 2, `${won} of 3 finished`);
});
