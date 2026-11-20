import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BOMB,
  COL,
  EMPTY,
  FIRE,
  METAL,
  PLAIN,
  RAINBOW,
  ROW,
  WATER,
  WILD,
  WOOD,
  adjacent,
  collapse,
  createBoard,
  findAndClear,
  findRuns,
  hasMove,
  index,
  reshuffle,
  spreadSpecials,
  swapCells,
} from '../src/core/board.mjs';
import { createRng } from '../src/core/rng.mjs';

/** 用字符画摆一个棋盘：0-4 五行，5 万能，. 空。 */
function fromRows(rows) {
  const size = rows.length;
  const board = { size, kind: new Int8Array(size * size).fill(EMPTY), special: new Uint8Array(size * size), weights: [1, 1, 1, 1, 1], wildChance: 0 };
  rows.forEach((row, y) => {
    [...row.replaceAll(' ', '')].forEach((char, x) => {
      board.kind[index(board, x, y)] = char === '.' ? EMPTY : Number(char);
    });
  });
  return board;
}

const kinds = (board) => [...board.kind];
const filled = (board) => [...board.kind].every((value) => value !== EMPTY);

test('开局没有现成的三连', () => {
  for (let seed = 1; seed <= 40; seed += 1) {
    const board = createBoard({ size: 7, rng: createRng(seed) });
    assert.equal(findRuns(board).runs.length, 0, `种子 ${seed} 开局就有三连`);
  }
});

test('横竖都能认出三连，长度记对', () => {
  const board = fromRows(['0001234', '1234567'.replace('7', '1'), '2340123', '3401234', '4012340', '0123401', '1234012']);
  const { runs } = findRuns(board);
  const row = runs.find((run) => run.orientation === 'row' && run.line === 0);
  assert.ok(row, '第一行应该有横三连');
  assert.equal(row.length, 3);
  assert.deepEqual(row.cells, [0, 1, 2]);
});

test('十字交叉算 L/T 形，交点会生成炸弹', () => {
  // 中间 (3,3) 是 2，横向 2,2,2 与纵向 2,2,2 在它身上交叉
  const board = fromRows([
    '0101010',
    '1010101',
    '0101010',
    '2222222'.replace(/^2/, '0'),
    '1012101',
    '0101010',
    '1010101',
  ]);
  // 上面那行改过头了，重新摆一个干净的十字
  const cross = fromRows([
    '0101010',
    '1010101',
    '0101010',
    '1222221',
    '0102010',
    '1012101',
    '0101010',
  ]);
  const { intersections } = findRuns(cross);
  assert.ok(intersections.length >= 1, '应该认出交叉点');
  const result = findAndClear(cross, { swap: [index(cross, 3, 3)] });
  assert.ok(result, '应该能消');
  assert.ok(
    result.spawned.some((spawn) => spawn.special === BOMB),
    `交叉要生成炸弹，实际生成 ${JSON.stringify(result.spawned)}`,
  );
  void board;
});

test('四连生成消行块，五连生成彩虹块', () => {
  const four = fromRows(['0000123', '1234012', '2340123', '3401234', '4012340', '0123401', '1234012']);
  const fourResult = findAndClear(four, { swap: [index(four, 1, 0)] });
  assert.equal(fourResult.spawned.length, 1);
  assert.equal(fourResult.spawned[0].special, ROW, '横四连应该是消行块');

  const five = fromRows(['0000012', '1234012', '2340123', '3401234', '4012340', '0123401', '1234012']);
  const fiveResult = findAndClear(five, { swap: [index(five, 1, 0)] });
  assert.equal(fiveResult.spawned[0].special, RAINBOW, '五连应该是彩虹块');
  assert.equal(fiveResult.spawned[0].kind, WILD);
});

test('交叉连成一组只留一个炸弹，各自独立的匹配照常生成特殊块', () => {
  const board = fromRows(['.22....', '2222...', '.22..3.', '1..3333', '.....3.', '.......', '44444..']);
  const firstCross = index(board, 2, 1);
  const secondCross = index(board, 5, 3);
  const rainbow = index(board, 2, 6);
  board.special[secondCross] = ROW;

  const result = findAndClear(board, { swap: [firstCross] });

  assert.deepEqual(result.spawned, [
    { index: firstCross, kind: METAL, special: BOMB },
    { index: secondCross, kind: WATER, special: BOMB },
    { index: rainbow, kind: WILD, special: RAINBOW },
  ]);
  assert.deepEqual(result.triggered, [{ index: secondCross, effect: ROW }]);
  assert.ok(result.cleared.some((cell) => cell.index === index(board, 0, 3)));
});

test('全盘同色的交叉生成一个炸弹，其余 48 格消除', () => {
  const board = fromRows(Array(7).fill('3333333'));
  const swapped = index(board, 5, 5);

  const result = findAndClear(board, { swap: [swapped] });

  assert.equal(result.cleared.length, 48);
  assert.deepEqual(result.spawned, [{ index: swapped, kind: WATER, special: BOMB }]);
  assert.equal(findAndClear(board), null);
});

test('特殊块落在交换的那一格上，而不是随手挑一个', () => {
  const board = fromRows(['0000123', '1234012', '2340123', '3401234', '4012340', '0123401', '1234012']);
  const swapAt = index(board, 3, 0);
  const result = findAndClear(board, { swap: [swapAt] });
  assert.equal(result.spawned[0].index, swapAt);
});

test('消行块被消掉时，整行跟着走', () => {
  const board = fromRows(['0101010', '1010101', '0101010', '2222222', '0101010', '1010101', '0101010']);
  board.special[index(board, 1, 3)] = ROW;
  // 把 (1,3) 纳入一个三连：它自己是 2，左边右边都是 2
  const result = findAndClear(board);
  assert.ok(result);
  const rowCells = result.cleared.filter((cell) => cell.y === 3);
  // 整行七格都要清，但会留一格当彩虹块——七连生成的特殊块不能自己把自己清掉
  assert.equal(rowCells.length, 6, `整行应清 6 格（留一格生成彩虹块），实际 ${rowCells.length}`);
  assert.equal(result.spawned.length, 1);
  assert.equal(result.spawned[0].special, RAINBOW);
});

test('彩虹块吃掉指定的颜色', () => {
  const board = fromRows(['0101010', '1010101', '0101010', '2222222', '0101010', '1010101', '0101010']);
  board.special[index(board, 0, 0)] = RAINBOW;
  board.kind[index(board, 0, 0)] = WILD;
  const before = kinds(board).filter((value) => value === FIRE).length;
  const { cells } = spreadSpecials(board, [index(board, 0, 0)], { rainbowKind: FIRE });
  const fireCleared = [...cells].filter((i) => board.kind[i] === FIRE).length;
  assert.ok(fireCleared > 0, '应该清掉一批火');
  assert.ok(fireCleared >= before - 1, `清掉的火 ${fireCleared} 应覆盖场上大部分火（${before}）`);
});

test('万能块能接进任何颜色的串里', () => {
  const board = fromRows(['0050123', '1234012', '2340123', '3401234', '4012340', '0123401', '1234012']);
  const { runs } = findRuns(board);
  const row = runs.find((run) => run.orientation === 'row' && run.line === 0);
  assert.ok(row, '0 0 万能 应该算一条三连');
  assert.equal(row.kind, FIRE, '这一串算火');
});

test('下落之后没有空洞，且每列都补满', () => {
  const board = fromRows(['0101010', '1010101', '0101010', '2222222', '0101010', '1010101', '0101010']);
  const rng = createRng(9);
  findAndClear(board);
  assert.ok(!filled(board), '刚清完必然有空');
  const { drops, fills } = collapse(board, rng);
  assert.ok(filled(board), '补完之后不该有空洞');
  assert.ok(drops.length > 0, '应该有方块下落');
  assert.ok(fills.length > 0, '应该有新方块补充');
  // 下落只能往下走
  for (const drop of drops) {
    const fromY = Math.floor(drop.from / board.size);
    const toY = Math.floor(drop.to / board.size);
    assert.ok(toY > fromY, '方块只能往下掉');
    assert.equal(drop.from % board.size, drop.to % board.size, '下落不能换列');
  }
});

test('连消循环一定会停下来，并且棋盘始终是满的', () => {
  for (let seed = 1; seed <= 20; seed += 1) {
    const rng = createRng(seed);
    const board = createBoard({ size: 7, rng });
    for (let turn = 0; turn < 30; turn += 1) {
      // 找一个能消的交换
      let moved = false;
      for (let i = 0; i < board.kind.length && !moved; i += 1) {
        for (const next of [i + 1, i + board.size]) {
          if (next >= board.kind.length) continue;
          if (!adjacent(board, i, next)) continue;
          swapCells(board, i, next);
          if (findRuns(board).runs.length) moved = true;
          else swapCells(board, i, next);
        }
      }
      if (!moved) break;
      let guard = 0;
      while (findAndClear(board, { swap: [] })) {
        collapse(board, rng);
        guard += 1;
        assert.ok(guard < 60, `种子 ${seed} 第 ${turn} 回合连锁停不下来`);
      }
      assert.ok(filled(board), `种子 ${seed} 第 ${turn} 回合之后棋盘有空洞`);
    }
  }
});

test('死局能被认出来，洗牌能救活', () => {
  // 一个怎么换都凑不出三连的棋盘
  const dead = fromRows(['0120120', '1201201', '2012012', '0120120', '1201201', '2012012', '0120120']);
  assert.equal(findRuns(dead).runs.length, 0);
  assert.equal(hasMove(dead), false, '这个局面应该没有解');
  const rng = createRng(3);
  assert.equal(reshuffle(dead, rng), true);
  assert.ok(findRuns(dead).runs.length === 0, '洗牌后不该立刻有三连');
  assert.equal(hasMove(dead), true, '洗牌后应该有解');
});

test('相邻判定不含斜角，也不含自己', () => {
  const board = fromRows(['0120120', '1201201', '2012012', '0120120', '1201201', '2012012', '0120120']);
  assert.equal(adjacent(board, index(board, 0, 0), index(board, 1, 0)), true);
  assert.equal(adjacent(board, index(board, 0, 0), index(board, 0, 1)), true);
  assert.equal(adjacent(board, index(board, 0, 0), index(board, 1, 1)), false);
  assert.equal(adjacent(board, index(board, 0, 0), index(board, 0, 0)), false);
});

test('元素常量与相生相克对得上', () => {
  assert.equal(WATER, 3);
  assert.equal(METAL, 2);
  assert.equal(WOOD, 4);
  assert.equal(PLAIN, 0);
  assert.equal(COL, 2);
});
