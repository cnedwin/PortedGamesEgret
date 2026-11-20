// 求解器：在 Node 里把每关从头打到尾，找出最少几发能开锁，并记下解法。
// The solver: plays each level in Node, through the same simulation the page runs, and finds aims that open
// every lock in as few pellets as it can. It writes them to src/levels/solutions.json, which the tests replay.
// It also says how wide each solution is — how many neighbouring aims work too — which is how forgiving the
// level is to a player.
//
//   node tools/solve.mjs            every level
//   node tools/solve.mjs l03 l04    only these
import '../vendor/node-register.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const { importTiledMap } = await import('@egret/engine/tilemap');
const { createLevelSim } = await import('../src/sim/sim.mjs');

const levels = JSON.parse(readFileSync(new URL('../levels/levels.json', import.meta.url), 'utf8'));
const solutionsFile = new URL('../src/levels/solutions.json', import.meta.url);
let solutions = {};
try {
  solutions = JSON.parse(readFileSync(solutionsFile, 'utf8'));
} catch {
  /* a first run */
}

export const loadMap = (file) => importTiledMap(JSON.parse(readFileSync(new URL('../levels/' + file, import.meta.url), 'utf8')));

/** Play `shots` (each [angle, power]) on a fresh level; returns the sim and what happened. */
export function play(map, shots, { seconds = 14 } = {}) {
  const events = [];
  const sim = createLevelSim(map, { onEvent: (event) => events.push(event) });
  let next = 0,
    waited = 0;
  for (let t = 0; t < seconds && !sim.state.won && !sim.state.lost; t += 1 / 60) {
    if (next < shots.length && sim.ready()) {
      sim.fire(shots[next][0], shots[next][1]);
      next++;
      waited = 0;
    }
    sim.update(1 / 60);
    waited += 1 / 60;
    if (next >= shots.length && waited > 8) break;
  }
  return { sim, events };
}

/** How good an outcome is, for the search: locks first, then what the mechanisms did. */
function progress({ sim, events }) {
  if (sim.state.won) return 1000;
  const opened = sim.locks.filter((lock) => lock.open).length,
    kinds = new Set(events.map((event) => event.type));
  return opened * 100 + ['plate', 'cut', 'tip', 'break', 'gate', 'boom', 'spring'].filter((kind) => kinds.has(kind)).length * 10 + sim.state.score / 1000;
}

function search(map, prefix, angles, powers) {
  let best = { score: -1 };
  for (const angle of angles)
    for (const power of powers) {
      const outcome = play(map, [...prefix, [angle, power]]),
        score = progress(outcome);
      if (score > best.score) best = { score, shot: [angle, power], won: outcome.sim.state.won };
      if (outcome.sim.state.won) return { ...best, score: 1000, shot: [angle, power], won: true };
    }
  return best;
}

const range = (from, to, step) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

/** How many of the aims around a winning one also win: a measure of how forgiving the level is. */
function width(map, prefix, [angle, power]) {
  let wins = 0,
    tried = 0;
  for (const da of [-2, -1, 0, 1, 2])
    for (const dp of [-4, -2, 0, 2, 4]) {
      tried++;
      if (play(map, [...prefix, [angle + da, Math.max(0, Math.min(100, power + dp))]]).sim.state.won) wins++;
    }
  return wins / tried;
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const only = process.argv.slice(2);
  for (const entry of levels) {
    if (only.length && !only.includes(entry.id)) continue;
    const map = loadMap(entry.file),
      par = Number(map.properties.par),
      shots = [];
    const started = Date.now();
    let won = false;
    for (let shot = 0; shot < par + 1 && !won; shot++) {
      const coarse = search(map, shots, range(-80, 10, 2), range(0, 100, 4));
      let found = coarse;
      if (!coarse.won) {
        const [a, p] = coarse.shot;
        found = search(map, shots, range(a - 2, a + 2, 1), range(Math.max(0, p - 4), Math.min(100, p + 4), 1));
        if (found.score < coarse.score) found = coarse;
      }
      shots.push(found.shot);
      won = found.won;
    }
    const forgiving = won ? width(map, shots.slice(0, -1), shots.at(-1)) : 0;
    console.log(`${entry.id} ${entry.title}: ${won ? 'won' : 'NOT SOLVED'} in ${shots.length} (par ${par}) ${JSON.stringify(shots)} width ${(forgiving * 100).toFixed(0)}% ${((Date.now() - started) / 1000).toFixed(1)}s`);
    if (won) solutions[entry.id] = { shots, width: Number(forgiving.toFixed(2)) };
  }
  writeFileSync(solutionsFile, JSON.stringify(solutions, null, 2) + '\n');
}
