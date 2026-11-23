#!/usr/bin/env node
// 平衡推演：一个会往前看一步的机器人，按人的节奏（默认每 1.6 秒放一块）玩几局，报告每局多久画成、消了几次、最长连消、
// 是不是输了。机器人把每个候选放法（托盘里三块、四个朝向、每隔十粒一个位置）在一份沙盘副本上落下、沉一秒半，
// 看同色的沙从两边墙往中间伸出多远。调难度（颜料数、目标粒数、沙盘宽窄）时用它看节奏变没变。
//   node tools/balance.mjs [局数] [每块的秒数]
// The balance run: a robot that looks one move ahead plays a few rounds at a person's pace (one piece every 1.6
// seconds by default) and reports how long each takes to finish its painting, how many runs it cleared, its longest
// chain and whether it lost. For each candidate (the tray's three pieces, four turns, every ten grains across) it drops
// the piece on a copy of the tray, lets it settle a second and a half, and measures how far each colour reaches in
// from the two walls. Use it after changing the pigments, the target or the tray's width.
import { BOARD, createGame, dropPiece, pieceGrains, progress, step, turnPiece } from '../src/sim/sand.mjs';

const rounds = Number(process.argv[2] ?? 5),
  pace = Number(process.argv[3] ?? 1.6);
const { cols, rows } = BOARD;

function copy(game) {
  return {
    ...game,
    color: game.color.slice(),
    tone: game.tone.slice(),
    frozen: game.frozen.slice(),
    active: game.active.slice(),
    visit: new Uint32Array(game.visit.length),
    stack: game.stack,
    tray: game.tray.map((p) => ({ ...p, blocks: p.blocks.map((b) => [...b]) })),
    falling: null,
    clearing: game.clearing.map((r) => ({ ...r })),
    rng: () => 0.5,
    events: []
  };
}

/** How good the tray looks: runs cleared, how far each colour reaches from each wall, and how low the sand is. */
function judge(g, before) {
  let score = (g.cleared - before) * 0.02 + g.clearing.reduce((n, r) => n + r.size, 0) * 0.02;
  const { color, visit, stack } = g;
  for (const side of [0, cols - 1]) {
    const stamp = ++g.stamp;
    const reach = {};
    for (let y = 0; y < rows; y++) {
      const s = y * cols + side,
        c = color[s];
      if (!c || visit[s] === stamp) continue;
      let top = 0,
        far = 0;
      stack[top++] = s;
      visit[s] = stamp;
      while (top) {
        const i = stack[--top],
          x = i % cols,
          d = side ? cols - 1 - x : x;
        if (d > far) far = d;
        for (const j of [i - 1, i + 1, i - cols, i + cols, i - cols - 1, i - cols + 1, i + cols - 1, i + cols + 1]) {
          if (j < 0 || j >= cols * rows || Math.abs((j % cols) - x) > 1) continue;
          if (visit[j] !== stamp && color[j] === c) ((visit[j] = stamp), (stack[top++] = j));
        }
      }
      reach[c] = Math.max(reach[c] ?? 0, far);
    }
    for (const far of Object.values(reach)) score += (far / cols) ** 2 * 6;
  }
  let height = rows;
  for (let i = 0; i < cols * rows; i++)
    if (color[i]) {
      height = (i / cols) | 0;
      break;
    }
  score -= Math.max(0, 140 - height) * 0.05;
  return score;
}

function choose(game) {
  let best = null;
  for (let slot = 0; slot < 3; slot++)
    for (let turn = 0; turn < 4; turn++) {
      const piece = { ...game.tray[slot] };
      const probe = copy(game);
      for (let k = 0; k < turn; k++) turnPiece(probe, slot);
      const w = pieceGrains(probe.tray[slot]).w;
      for (let x = 0; x <= cols - w; x += 10) {
        const g = copy(probe);
        dropPiece(g, slot, x);
        for (let k = 0; k < 90; k++) step(g, 1 / 60);
        const score = judge(g, game.cleared);
        if (!best || score > best.score) best = { score, slot, turn, x };
      }
      if (piece.shape === 'O') break;
    }
  return best;
}

for (let round = 1; round <= rounds; round++) {
  const game = createGame(round);
  let wait = 0,
    clears = 0,
    firstClear = null;
  while (!game.over && game.time < 900) {
    wait -= 1 / 60;
    if (!game.falling && wait <= 0) {
      const b = choose(game);
      for (let k = 0; k < b.turn; k++) turnPiece(game, b.slot);
      dropPiece(game, b.slot, b.x);
      wait = pace;
    }
    step(game, 1 / 60);
    for (const e of game.events) if (e.kind === 'clear') ((clears += 1), (firstClear ??= game.time));
    game.events.length = 0;
  }
  console.log(
    `round ${round}: ${game.won ? 'finished' : game.over ? 'lost' : 'timed out'} at ${game.time.toFixed(0)} s, ${game.pieces} pieces, ` +
      `${clears} clears (first at ${firstClear?.toFixed(0) ?? '-'} s), longest chain ${game.bestChain}, painting ${Math.round(progress(game) * 100)}%`
  );
}
