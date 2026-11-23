// 沙盘的规则：一块 240×300 粒的沙盘，每一格空着或是一粒颜料沙。玩家从托盘里拿一块积木（由二十粒见方的小块拼成），
// 横着挪到想放的地方松手，积木整块落下，碰到沙面就散成沙：每一粒往下落，下面有沙就往左下或右下滑，堆成四十五度的沙坡。
// 同一种颜色的沙只要从左边一路连到右边（八个方向相邻都算连着），整片就闪一下消掉，上面的沙塌下来，可能接着连成下一片，
// 这就是连消。消掉的沙一粒粒算进这一卷画的进度，进度满了画就成了；沙堆过了顶上的警戒线太久，这一局就输了。
// 规则只用数组和固定种子的随机数，不碰页面也不碰引擎；同一个种子、同样的操作，结果每次都一样。
//
// The rules of the sand tray: a tray 240 grains wide and 300 tall, each cell empty or one grain of pigment. The player
// takes a piece from the tray below (blocks twenty grains square), moves it across to where it should go and lets go;
// the piece falls whole and, where it meets the sand, breaks into sand: each grain falls, and slides down to the left
// or right when there is sand below it, so heaps stand at forty-five degrees. A colour whose sand reaches from the left
// wall to the right wall in one connected run (any of eight neighbours counts) flashes and is gone; the sand above
// slumps and may join into another run, a chain. The grains cleared fill this scroll's painting, which is finished when
// the count is reached; sand that stays over the line at the top too long ends the round. The rules use only arrays
// and a seeded random number, never the page or the engine: the same seed and the same moves always end the same way.

export const BOARD = Object.freeze({ cols: 200, rows: 300, block: 20, danger: 40 });

/** The mineral pigments of a blue-and-green landscape: each grain is one of these, its shade varying a little. */
export const PIGMENTS = Object.freeze([
  null,
  { id: 'azurite', rgb: [44, 98, 164] }, // 石青
  { id: 'malachite', rgb: [58, 150, 108] }, // 石绿
  { id: 'cinnabar', rgb: [198, 66, 46] }, // 朱砂
  { id: 'gamboge', rgb: [222, 172, 52] }, // 藤黄
  { id: 'ochre', rgb: [168, 104, 56] }, // 赭石
  { id: 'shell', rgb: [226, 220, 200] } // 蛤粉
]);

/** The shapes of the pieces, as the blocks they are made of. */
export const SHAPES = Object.freeze({
  I: [[0, 0], [1, 0], [2, 0], [3, 0]],
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
  T: [[0, 0], [1, 0], [2, 0], [1, 1]],
  L: [[0, 0], [0, 1], [0, 2], [1, 2]],
  J: [[1, 0], [1, 1], [1, 2], [0, 2]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]],
  Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
  V: [[0, 0], [0, 1], [1, 1]],
  B: [[0, 0], [1, 0], [2, 0]]
});

/** The scrolls. Each names its pigments, the grains it takes to finish, and its painting. */
export const LEVELS = Object.freeze([
  Object.freeze({ id: 'spring', pigments: [1, 2, 5], target: 48000, shapes: ['I', 'O', 'T', 'L', 'J', 'S', 'Z', 'V', 'B'] })
]);

// Timing: the sand moves in fixed ticks, whatever the frame rate.
export const TICK = 1 / 240;
const MAX_TICKS = 16;
const GRAVITY = 1500; // rows per second per second, for a falling piece
const MAX_FALL = 720; // rows per second
export const FLASH = 0.6; // seconds a clearing run shines before it goes
const CHAIN_WINDOW = 2.5; // seconds after one clear in which the next counts as a chain
export const DANGER_GRACE = 2.5; // seconds of sand over the line before the round is lost
const CHECK_EVERY = 6; // ticks between looks for a run from wall to wall
const LAND_ENERGY = 10; // sideways slides a grain of a breaking piece has
const FALL_ENERGY = 4; // the least a grain has after falling straight down a row

/** A seeded random number generator (mulberry32): the same seed gives the same numbers. */
export function createRandom(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The blocks of a shape turned a quarter clockwise `turns` times, moved to start at (0, 0). */
export function turnBlocks(blocks, turns = 1) {
  let out = blocks.map(([x, y]) => [x, y]);
  for (let k = 0; k < (((turns % 4) + 4) % 4); k++) {
    const h = Math.max(...out.map(([, y]) => y));
    out = out.map(([x, y]) => [h - y, x]);
  }
  const minX = Math.min(...out.map(([x]) => x)),
    minY = Math.min(...out.map(([, y]) => y));
  return out.map(([x, y]) => [x - minX, y - minY]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

/** A new piece for the tray: a shape of the level, one of its pigments, and a seed for the shade of its grains. */
function makePiece(game) {
  const { level, rng } = game;
  const shape = level.shapes[Math.floor(rng() * level.shapes.length)];
  const pigment = level.pigments[Math.floor(rng() * level.pigments.length)];
  return { id: ++game.serial, shape, pigment, turns: 0, blocks: turnBlocks(SHAPES[shape], 0), toneSeed: Math.floor(rng() * 1e9) };
}

/**
 * The grains of a piece: its size in grains, a mask (1 where there is a grain) and a shade for each. The blocks show
 * as blocks: each has its own shade, with a lighter rim at the top left and a darker one at the bottom right.
 */
export function pieceGrains(piece) {
  const b = BOARD.block,
    w = (Math.max(...piece.blocks.map(([x]) => x)) + 1) * b,
    h = (Math.max(...piece.blocks.map(([, y]) => y)) + 1) * b,
    mask = new Uint8Array(w * h),
    tone = new Uint8Array(w * h),
    rng = createRandom(piece.toneSeed);
  for (const [bx, by] of piece.blocks) {
    const base = 96 + Math.floor(rng() * 64);
    for (let y = 0; y < b; y++)
      for (let x = 0; x < b; x++) {
        const i = (by * b + y) * w + bx * b + x,
          rim = x < 2 || y < 2 ? 34 : x > b - 3 || y > b - 3 ? -34 : 0;
        mask[i] = 1;
        tone[i] = Math.max(0, Math.min(255, base + rim + Math.floor((rng() - 0.5) * 70)));
      }
  }
  // The lowest grain of each column, for finding where the piece meets the sand.
  const bottom = new Int16Array(w).fill(-1);
  for (let x = 0; x < w; x++) for (let y = h - 1; y >= 0; y--) if (mask[y * w + x]) ((bottom[x] = y), (y = -1));
  return { w, h, mask, tone, bottom };
}

/** A new round on scroll `levelIndex`, from `seed`. */
export function createGame(seed, levelIndex = 0) {
  const { cols, rows } = BOARD,
    cells = cols * rows;
  const game = {
    seed,
    rng: createRandom(seed),
    noise: (seed * 2654435761) >>> 0 || 7,
    level: LEVELS[levelIndex],
    levelIndex,
    serial: 0,
    color: new Uint8Array(cells),
    tone: new Uint8Array(cells),
    frozen: new Uint8Array(cells),
    // How many more times each grain may slide sideways before it packs: sand slumps where it lands, it does not run.
    energy: new Uint8Array(cells),
    active: new Uint8Array(rows + 1),
    visit: new Uint32Array(cells),
    stack: new Int32Array(cells),
    stamp: 0,
    tray: [],
    falling: null,
    clearing: [],
    grains: 0,
    cleared: 0,
    score: 0,
    chain: 0,
    sinceClear: 99,
    bestChain: 0,
    pieces: 0,
    danger: 0,
    time: 0,
    ticks: 0,
    carry: 0,
    sinceCheck: 0,
    unsettled: false,
    over: false,
    won: false,
    // Rows changed since the view last looked, and what happened, for the view to show and sound.
    dirtyTop: 0,
    dirtyBottom: rows - 1,
    events: []
  };
  for (let k = 0; k < 3; k++) game.tray.push(makePiece(game));
  return game;
}

/** Turn the piece in tray slot `slot` a quarter clockwise. */
export function turnPiece(game, slot) {
  const piece = game.tray[slot];
  if (!piece || game.over) return false;
  piece.turns = (piece.turns + 1) % 4;
  piece.blocks = turnBlocks(SHAPES[piece.shape], piece.turns);
  return true;
}

/** The leftmost column a piece of width `w` may be dropped at, near `x`. */
export const clampColumn = (x, w) => Math.max(0, Math.min(BOARD.cols - w, Math.round(x)));

/**
 * Let go of the piece in tray slot `slot` with its left edge at column `x`: it starts falling from the top, and a new
 * piece takes its slot. Refused while another piece is still falling, or once the round is over.
 */
export function dropPiece(game, slot, x) {
  if (game.over || game.falling) return false;
  const piece = game.tray[slot];
  if (!piece) return false;
  const grains = pieceGrains(piece);
  game.falling = { piece, grains, x: clampColumn(x, grains.w), y: 0, vy: 60 };
  game.tray[slot] = makePiece(game);
  game.pieces++;
  game.events.push({ kind: 'drop', slot, x: game.falling.x, pigment: piece.pigment });
  return true;
}

const mark = (game, y) => {
  if (y < game.dirtyTop) game.dirtyTop = y;
  if (y > game.dirtyBottom) game.dirtyBottom = y;
};
const wake = (game, y) => {
  const a = game.active;
  if (y > 0) a[y - 1] = 1;
  a[y] = 1;
  if (y + 1 < BOARD.rows) a[y + 1] = 1;
};

/** Whether the falling piece, with its top at row `y`, would overlap sand or the floor. */
function blocked(game, f, y) {
  const { cols, rows } = BOARD,
    { w, bottom } = f.grains;
  for (let cx = 0; cx < w; cx++) {
    const by = bottom[cx];
    if (by < 0) continue;
    const gy = y + by;
    if (gy >= rows) return true;
    if (gy >= 0 && game.color[gy * cols + f.x + cx]) return true;
  }
  return false;
}

/** The falling piece breaks into sand where it is. */
function land(game) {
  const f = game.falling,
    { cols } = BOARD,
    { w, h, mask, tone } = f.grains,
    top = Math.floor(f.y);
  let lost = 0;
  for (let cy = h - 1; cy >= 0; cy--)
    for (let cx = 0; cx < w; cx++) {
      const k = cy * w + cx;
      if (!mask[k]) continue;
      let gy = top + cy;
      const gx = f.x + cx;
      // A cell already taken (a slope under an overhang): the grain settles on the first free cell above.
      while (gy >= 0 && game.color[gy * cols + gx]) gy--;
      if (gy < 0) {
        lost++;
        continue;
      }
      const i = gy * cols + gx;
      game.color[i] = f.piece.pigment;
      game.tone[i] = tone[k];
      game.energy[i] = LAND_ENERGY;
      game.grains++;
      wake(game, gy);
      mark(game, gy);
    }
  game.events.push({ kind: 'land', x: f.x, y: top, w, h, pigment: f.piece.pigment, lost });
  if (lost) game.danger = Math.max(game.danger, DANGER_GRACE * 0.6);
  game.falling = null;
  game.unsettled = true;
}

/** One tick of the falling piece: it speeds up, and moves down row by row until it meets something. */
function fall(game) {
  const f = game.falling;
  f.vy = Math.min(MAX_FALL, f.vy + GRAVITY * TICK);
  const target = f.y + f.vy * TICK;
  while (Math.floor(f.y) < Math.floor(target)) {
    if (blocked(game, f, Math.floor(f.y) + 1)) return land(game);
    f.y = Math.floor(f.y) + 1;
  }
  f.y = target;
  if (blocked(game, f, Math.floor(f.y) + 1)) land(game);
}

/**
 * One tick of the sand: from the bottom row up, each grain falls one row, or, while it still has slides left, slides
 * one row down to a side. A grain that falls straight down gets a few slides back, so sand over a cleared run slumps.
 */
function settle(game) {
  const { cols, rows } = BOARD,
    { color, tone, frozen, active, energy } = game;
  let s = game.noise,
    moved = 0;
  const leftFirst = (game.ticks & 1) === 0;
  for (let y = rows - 2; y >= 0; y--) {
    if (!active[y]) continue;
    active[y] = 0;
    const row = y * cols;
    for (let k = 0; k < cols; k++) {
      const x = leftFirst ? k : cols - 1 - k,
        i = row + x,
        c = color[i];
      if (!c || frozen[i]) continue;
      const below = i + cols;
      let to = -1,
        left = energy[i];
      if (!color[below]) {
        to = below;
        if (left < FALL_ENERGY) left = FALL_ENERGY;
      } else if (left) {
        const l = x > 0 && !color[below - 1],
          r = x < cols - 1 && !color[below + 1];
        if (l && r) {
          s ^= s << 13;
          s ^= s >>> 17;
          s ^= s << 5;
          to = s & 1 ? below - 1 : below + 1;
        } else if (l) to = below - 1;
        else if (r) to = below + 1;
        if (to >= 0) left--;
      }
      // Nowhere to go for now: it keeps its slides, for when the sand around it moves.
      if (to < 0) continue;
      color[to] = c;
      tone[to] = tone[i];
      energy[to] = left;
      color[i] = 0;
      energy[i] = 0;
      moved++;
      active[y] = 1;
      if (y > 0) active[y - 1] = 1;
      active[y + 1] = 1;
      if (y < game.dirtyTop) game.dirtyTop = y;
      if (y + 1 > game.dirtyBottom) game.dirtyBottom = y + 1;
    }
  }
  game.noise = s >>> 0 || 7;
  if (moved) game.unsettled = true;
  return moved;
}

/**
 * Look for runs from wall to wall: every grain of the left wall starts a search of its colour through its eight
 * neighbours, and a search that reaches the right wall is a run. Each run found starts to shine.
 */
function findRuns(game) {
  const { cols, rows } = BOARD,
    { color, frozen, visit, stack } = game;
  const stamp = ++game.stamp;
  const runs = [];
  for (let y = 0; y < rows; y++) {
    const start = y * cols,
      c = color[start];
    if (!c || frozen[start] || visit[start] === stamp) continue;
    let top = 0,
      size = 0,
      reached = false;
    stack[top++] = start;
    visit[start] = stamp;
    const cells = [];
    while (top) {
      const i = stack[--top];
      cells.push(i);
      size++;
      const x = i % cols;
      if (x === cols - 1) reached = true;
      for (let dy = -1; dy <= 1; dy++) {
        const r = i + dy * cols;
        if (r < 0 || r >= cols * rows) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx === 0 && dy === 0) || (dx < 0 && x === 0) || (dx > 0 && x === cols - 1)) continue;
          const j = r + dx;
          if (visit[j] !== stamp && color[j] === c && !frozen[j]) {
            visit[j] = stamp;
            stack[top++] = j;
          }
        }
      }
    }
    if (reached) runs.push({ pigment: c, cells: Int32Array.from(cells), size });
  }
  for (const run of runs) {
    let minY = rows,
      maxY = 0,
      sumX = 0,
      sumY = 0;
    for (const i of run.cells) {
      frozen[i] = 1;
      const y = (i / cols) | 0;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      sumX += i % cols;
      sumY += y;
    }
    run.t = 0;
    run.minY = minY;
    run.maxY = maxY;
    run.cx = sumX / run.size;
    run.cy = sumY / run.size;
    game.clearing.push(run);
    game.chain = game.sinceClear < CHAIN_WINDOW ? game.chain + 1 : 1;
    game.bestChain = Math.max(game.bestChain, game.chain);
    game.sinceClear = 0;
    const points = Math.round(run.size * (1 + 0.5 * (game.chain - 1)));
    game.score += points;
    game.events.push({ kind: 'shine', pigment: run.pigment, size: run.size, chain: game.chain, points, minY, maxY, cx: run.cx, cy: run.cy });
    mark(game, minY);
    mark(game, maxY);
  }
  return runs.length;
}

/** A shining run is gone: its grains leave and the sand above wakes. */
function vanish(game, run) {
  const { cols } = BOARD,
    { color, frozen } = game;
  for (const i of run.cells) {
    color[i] = 0;
    frozen[i] = 0;
    wake(game, (i / cols) | 0);
  }
  game.grains -= run.size;
  game.cleared += run.size;
  mark(game, run.minY);
  mark(game, run.maxY);
  game.unsettled = true;
  game.events.push({ kind: 'clear', pigment: run.pigment, size: run.size, cleared: game.cleared, minY: run.minY, maxY: run.maxY, cx: run.cx, cy: run.cy });
}

/** Whether any grain lies above the line at the top. */
function overLine(game) {
  const { color } = game,
    end = BOARD.danger * BOARD.cols;
  for (let i = 0; i < end; i++) if (color[i]) return true;
  return false;
}

/** The share of the painting done, from 0 to 1. */
export const progress = (game) => Math.min(1, game.cleared / game.level.target);

/** Move the round on by `seconds`. What happened is added to `game.events` for the view. */
export function step(game, seconds) {
  if (game.over) return game;
  game.time += seconds;
  game.sinceClear += seconds;
  game.carry += seconds;
  let ticks = Math.min(MAX_TICKS, Math.floor(game.carry / TICK));
  game.carry -= ticks * TICK;
  if (game.carry > TICK) game.carry = 0;
  while (ticks-- > 0) {
    game.ticks++;
    if (game.falling) fall(game);
    settle(game);
    for (const run of game.clearing) run.t += TICK;
    while (game.clearing.length && game.clearing[0].t >= FLASH) vanish(game, game.clearing.shift());
    if (++game.sinceCheck >= CHECK_EVERY && game.unsettled) {
      game.sinceCheck = 0;
      game.unsettled = false;
      findRuns(game);
    }
  }
  // Sand over the line: a little while is forgiven, as a fresh piece settles; too long ends the round.
  if (overLine(game)) game.danger += seconds;
  else game.danger = Math.max(0, game.danger - seconds * 2);
  if (!game.won && game.cleared >= game.level.target && !game.clearing.length) {
    game.won = game.over = true;
    game.events.push({ kind: 'won' });
  } else if (game.danger >= DANGER_GRACE) {
    game.over = true;
    game.events.push({ kind: 'lost' });
  }
  return game;
}

/** Take what happened since the last call, and the rows that changed, for the view. */
export function takeChanges(game) {
  const events = game.events;
  game.events = [];
  const rows = game.dirtyTop <= game.dirtyBottom ? [game.dirtyTop, game.dirtyBottom] : null;
  game.dirtyTop = BOARD.rows;
  game.dirtyBottom = -1;
  return { events, rows };
}

/** Whether the tray is still: nothing falling, nothing shining and no grain left to move. */
export function settled(game) {
  if (game.falling || game.clearing.length || game.unsettled) return false;
  for (let y = 0; y < BOARD.rows - 1; y++) if (game.active[y]) return false;
  return true;
}
