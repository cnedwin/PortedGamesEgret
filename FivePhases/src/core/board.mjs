// 棋盘：纯数据，不碰任何显示对象。
//
// 一次消除拆成两步——先判定并清空（`findAndClear`），再下落补充（`collapse`）——
// 因为表现层要分开演：清空是"炸开"，下落是"重力"。合成一步的话，
// 动画就只能在最后一起播，连锁的节奏感全没了。
//
// 格子编码：
//   kind    0..4 五行，5 万能（太极），-1 空
//   special 0 无，1 消行，2 消列，3 炸弹，4 彩虹

import { createRng } from './rng.mjs';

export const FIRE = 0;
export const EARTH = 1;
export const METAL = 2;
export const WATER = 3;
export const WOOD = 4;
export const WILD = 5;
export const EMPTY = -1;

export const ELEMENTS = ['fire', 'earth', 'metal', 'water', 'wood'];
export const ELEMENT_NAMES = ['火', '土', '金', '水', '木'];
/** 相生：木→火→土→金→水→木。下标是"生出来"的那个。 */
export const GENERATES = { [WOOD]: FIRE, [FIRE]: EARTH, [EARTH]: METAL, [METAL]: WATER, [WATER]: WOOD };
/** 相克：木克土、土克水、水克火、火克金、金克木。 */
export const OVERCOMES = { [WOOD]: EARTH, [EARTH]: WATER, [WATER]: FIRE, [FIRE]: METAL, [METAL]: WOOD };

export const PLAIN = 0;
export const ROW = 1;
export const COL = 2;
export const BOMB = 3;
export const RAINBOW = 4;

export const index = (board, x, y) => y * board.size + x;
export const xOf = (board, i) => i % board.size;
export const yOf = (board, i) => Math.floor(i / board.size);

export const inBounds = (board, x, y) => x >= 0 && y >= 0 && x < board.size && y < board.size;

/**
 * 这一格不能填什么。
 *
 * 除了"前两个同色就禁掉那个色"，还要防着万能块：`火 火 万能` 和 `火 万能 火`
 * 都算三连，所以只要前两格里有万能，另一格的颜色也得禁。这一条漏了，
 * 开局就会带着白送的三连进游戏。
 */
function bannedAt(board, x, y) {
  const banned = new Set();
  // 判定时是以"串首"为锚的：万能跟谁都配，所以 [火 万能 木] 不成串，
  // 但 [火 万能 火] 和 [火 万能 万能] 都成串。于是只要前两格里有万能，
  // 万能本身和那一格的颜色都得禁。
  const check = (a, b) => {
    if (a === undefined || b === undefined) return;
    if (a === WILD || b === WILD) {
      banned.add(WILD);
      const other = a === WILD ? b : a;
      if (other !== WILD) banned.add(other);
      return;
    }
    if (a === b) {
      banned.add(a);
      banned.add(WILD);
    }
  };
  // 万能块不能和万能块挨着：两格万能加任何一格都成串，等于白送
  if (x >= 1 && board.kind[index(board, x - 1, y)] === WILD) banned.add(WILD);
  if (y >= 1 && board.kind[index(board, x, y - 1)] === WILD) banned.add(WILD);
  if (x >= 2) check(board.kind[index(board, x - 1, y)], board.kind[index(board, x - 2, y)]);
  if (y >= 2) check(board.kind[index(board, x, y - 1)], board.kind[index(board, x, y - 2)]);
  return banned;
}

export function createBoard({ size = 7, rng = createRng(1), weights = [1, 1, 1, 1, 1], wildChance = 0.06 } = {}) {
  const board = {
    size,
    kind: new Int8Array(size * size).fill(EMPTY),
    special: new Uint8Array(size * size),
    weights,
    wildChance,
  };
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = index(board, x, y);
      board.kind[i] = rollKind(board, rng, bannedAt(board, x, y));
    }
  }
  return board;
}

function rollKind(board, rng, banned) {
  for (let tries = 0; tries < 24; tries += 1) {
    const kind = rng.next() < board.wildChance ? WILD : rng.weighted(board.weights);
    if (!banned.has(kind)) return kind;
  }
  // 实在挑不出来就退一步，宁可开局有一个三连，也不要死循环
  return rng.weighted(board.weights);
}

/**
 * 找所有长度 ≥3 的串。
 * 返回 `{ runs, intersections }`：runs 带方向与格子，intersections 是横竖交叉的格子（L/T 形）。
 */
export function findRuns(board) {
  const { size, kind } = board;
  const runs = [];

  // 一条串的定义：连续的一段，去掉万能之后只剩一种颜色，且长度 ≥3。
  // 不能拿"第一格"当锚——万能跟谁都配，从万能起头会把整行都吃进去。
  const scan = (orientation) => {
    for (let line = 0; line < size; line += 1) {
      const cellAt = (step) => (orientation === 'row' ? index(board, step, line) : index(board, line, step));
      let start = 0;
      while (start < size) {
        if (kind[cellAt(start)] === EMPTY) {
          start += 1;
          continue;
        }
        let end = start;
        let colour = -1;
        while (end < size) {
          const value = kind[cellAt(end)];
          if (value === EMPTY) break;
          if (value !== WILD) {
            if (colour === -1) colour = value;
            else if (value !== colour) break;
          }
          end += 1;
        }
        const length = end - start;
        if (length >= 3) {
          const cells = [];
          for (let step = start; step < end; step += 1) cells.push(cellAt(step));
          runs.push({
            orientation,
            line,
            from: start,
            to: end - 1,
            length,
            kind: colour === -1 ? WILD : colour,
            cells,
          });
        }
        start = end;
      }
    }
  };

  scan('row');
  scan('col');

  // 同一格既在横串又在竖串里，就是 L 形或 T 形的交点
  const seen = new Map();
  for (const run of runs) for (const i of run.cells) seen.set(i, (seen.get(i) ?? 0) + 1);
  const intersections = [...seen.entries()].filter(([, count]) => count > 1).map(([i]) => i);

  return { runs, intersections };
}

/** 从种子格出发，把特殊块的效果摊开，返回要清掉的格子集合。 */
export function spreadSpecials(board, seeds, { rainbowKind = null } = {}) {
  const { size, kind, special } = board;
  const marked = new Set();
  const queue = [...seeds];
  const triggered = [];

  while (queue.length) {
    const i = queue.shift();
    if (i < 0 || i >= kind.length) continue;
    if (marked.has(i)) continue;
    if (kind[i] === EMPTY) continue;
    marked.add(i);

    const effect = special[i];
    if (effect === PLAIN) continue;
    triggered.push({ index: i, effect });

    if (effect === ROW) {
      const y = yOf(board, i);
      for (let x = 0; x < size; x += 1) queue.push(index(board, x, y));
    } else if (effect === COL) {
      const x = xOf(board, i);
      for (let y = 0; y < size; y += 1) queue.push(index(board, x, y));
    } else if (effect === BOMB) {
      const cx = xOf(board, i);
      const cy = yOf(board, i);
      for (let y = cy - 1; y <= cy + 1; y += 1) {
        for (let x = cx - 1; x <= cx + 1; x += 1) if (inBounds(board, x, y)) queue.push(index(board, x, y));
      }
    } else if (effect === RAINBOW) {
      const target = rainbowKind ?? mostCommonKind(board);
      for (let j = 0; j < kind.length; j += 1) if (kind[j] === target) queue.push(j);
    }
  }

  return { cells: marked, triggered };
}

function mostCommonKind(board) {
  const tally = new Map();
  for (const value of board.kind) {
    if (value === EMPTY || value === WILD) continue;
    tally.set(value, (tally.get(value) ?? 0) + 1);
  }
  let best = FIRE;
  let count = -1;
  for (const [value, n] of tally) {
    if (n > count) {
      count = n;
      best = value;
    }
  }
  return best;
}

/**
 * 判定并清空一步。没有可消的返回 null。
 * `swap` 是刚交换的两格，用来决定特殊块落在哪、彩虹块吃哪个颜色。
 */
export function findAndClear(board, { swap = [], rainbowKind = null } = {}) {
  const { runs, intersections } = findRuns(board);
  if (!runs.length) return null;

  const clearSet = new Set();
  for (const run of runs) for (const i of run.cells) clearSet.add(i);

  // 特殊块先定位置，再清空——否则刚生成的特殊块会被自己这一步清掉
  const spawned = [];
  const taken = new Set();
  const anchorOf = (cells) => {
    const swapped = cells.find((i) => swap.includes(i));
    if (swapped !== undefined) return swapped;
    return cells[Math.floor(cells.length / 2)];
  };

  for (const at of intersections) {
    if (taken.has(at)) continue;
    const run = runs.find((item) => item.cells.includes(at));
    spawned.push({ index: at, kind: run ? run.kind : board.kind[at], special: BOMB });
    taken.add(at);
  }
  for (const run of runs) {
    if (run.length < 4) continue;
    const at = anchorOf(run.cells);
    if (taken.has(at)) continue;
    const special = run.length >= 5 ? RAINBOW : run.orientation === 'row' ? ROW : COL;
    spawned.push({ index: at, kind: run.length >= 5 ? WILD : run.kind, special });
    taken.add(at);
  }

  const { cells, triggered } = spreadSpecials(board, [...clearSet], { rainbowKind });
  for (const at of taken) cells.delete(at);

  const cleared = [];
  for (const i of cells) {
    cleared.push({ index: i, kind: board.kind[i], special: board.special[i], x: xOf(board, i), y: yOf(board, i) });
    board.kind[i] = EMPTY;
    board.special[i] = PLAIN;
  }

  for (const spawn of spawned) {
    board.kind[spawn.index] = spawn.kind;
    board.special[spawn.index] = spawn.special;
  }

  return {
    cleared,
    spawned: spawned.filter((spawn) => board.kind[spawn.index] !== EMPTY),
    triggered,
    runKind: runs[0].kind,
    length: Math.max(...runs.map((run) => run.length)),
  };
}

/**
 * 下落与补充。返回给表现层用的位移与新生表。
 * `fillKind` 指定新方块的颜色——潮汐这类"清完必掉某色"的卡靠它。
 */
export function collapse(board, rng = createRng(1), { fillKind = null } = {}) {
  const { size, kind, special } = board;
  const drops = [];
  const fills = [];

  for (let x = 0; x < size; x += 1) {
    let write = size - 1;
    for (let y = size - 1; y >= 0; y -= 1) {
      const from = index(board, x, y);
      if (kind[from] === EMPTY) continue;
      if (write !== y) {
        const to = index(board, x, write);
        kind[to] = kind[from];
        special[to] = special[from];
        kind[from] = EMPTY;
        special[from] = PLAIN;
        drops.push({ from, to });
      }
      write -= 1;
    }
    // 上面空出来的格补新的
    for (let y = write; y >= 0; y -= 1) {
      const to = index(board, x, y);
      kind[to] = fillKind ?? rollKind(board, rng, new Set());
      special[to] = PLAIN;
      fills.push({ index: to, kind: kind[to], x, y });
    }
  }

  return { drops, fills };
}

export function swapCells(board, a, b) {
  const kindA = board.kind[a];
  const specialA = board.special[a];
  board.kind[a] = board.kind[b];
  board.special[a] = board.special[b];
  board.kind[b] = kindA;
  board.special[b] = specialA;
}

/** 两格相邻（不含斜角）。 */
export function adjacent(board, a, b) {
  const ax = xOf(board, a);
  const ay = yOf(board, a);
  const bx = xOf(board, b);
  const by = yOf(board, b);
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}

/** 有没有一步能消。没有就得洗牌，否则玩家会卡死。 */
export function hasMove(board) {
  const { size } = board;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const a = index(board, x, y);
      // 特殊块摆在那儿本身就是一步
      if (board.special[a] !== PLAIN) return true;
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ]) {
        if (!inBounds(board, x + dx, y + dy)) continue;
        const b = index(board, x + dx, y + dy);
        swapCells(board, a, b);
        const found = findRuns(board).runs.length > 0;
        swapCells(board, a, b);
        if (found) return true;
      }
    }
  }
  return false;
}

/**
 * 把棋盘上现有的方块重新打散，尽量保留颜色配比。
 *
 * 纯洗牌不行：颜色少的棋盘洗一百次也凑不出"一个三连都没有"的排列。
 * 所以洗完之后就地修——把落在串里的格子重掷成不犯规的颜色，修几轮就干净了。
 */
export function reshuffle(board, rng = createRng(1)) {
  const kinds = [...board.kind].filter((value) => value !== EMPTY);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    rng.shuffle(kinds);
    let cursor = 0;
    for (let i = 0; i < board.kind.length; i += 1) {
      if (board.kind[i] === EMPTY) continue;
      board.kind[i] = kinds[cursor];
      cursor += 1;
    }
    for (let pass = 0; pass < 40; pass += 1) {
      const { runs } = findRuns(board);
      if (!runs.length) break;
      for (const run of runs) {
        for (const i of run.cells) {
          const x = xOf(board, i);
          const y = yOf(board, i);
          const keep = board.kind[i];
          board.kind[i] = EMPTY;
          board.kind[i] = rollKind(board, rng, bannedAt(board, x, y));
          void keep;
        }
      }
    }
    if (!findRuns(board).runs.length && hasMove(board)) return true;
  }
  return false;
}

/** 棋盘上每种元素各有多少，用来给数值做参考。 */
export function countKinds(board) {
  const counts = new Array(ELEMENTS.length).fill(0);
  for (const value of board.kind) if (value >= 0 && value < ELEMENTS.length) counts[value] += 1;
  return counts;
}
