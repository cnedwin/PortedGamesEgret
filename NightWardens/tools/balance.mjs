// 平衡：用替身玩家把三夜各跑一批种子，打印每一夜的时长、胜负、城墙剩多少、到了几级、击杀数和最慢的一步。
// 改了 src/sim/data.mjs 的数之后跑同一批种子，比较前后两张表。目标：每夜 3–5 分钟，熟练的替身大多守住，
// 粗心的替身在第三夜常常守不住。
//   node --import ./vendor/node-register.mjs tools/balance.mjs [--seeds 12] [--skill 0.7]
// Balance: the stand-in player plays a batch of seeds on each of the three nights, and a table per night prints the
// length, the outcome, the wall left, the level reached, the kills and the slowest step. After changing numbers in
// src/sim/data.mjs, run the same seeds and compare the tables. The aim: three to five minutes a night, a skilled stand-in
// holding most nights, a careless one often losing the third.
import { runHeadless } from '@egret/engine/kit';
import { createBot } from '../src/sim/bot.mjs';
import { createWorld, starsFor, step } from '../src/sim/world.mjs';

const arg = (name, fallback) => {
  const at = process.argv.indexOf(name);
  return at < 0 ? fallback : Number(process.argv[at + 1]);
};
const seeds = arg('--seeds', 12),
  skill = arg('--skill', 0.7);

/** One night as a headless game: the world and one step of its rules. */
function nightGame(night, seed) {
  const world = createWorld({ night, seed });
  return { world, update: (seconds, input) => step(world, input, seconds) };
}

export function playNights({ seeds: count = seeds, skill: level = skill } = {}) {
  const table = [];
  for (const night of [1, 2, 3]) {
    const runs = runHeadless({
      seeds: count,
      maxSeconds: 900,
      createGame: (seed) => nightGame(night, seed),
      createPlayer: (game) => {
        const bot = createBot(game.world, { skill: level });
        return () => bot.think();
      },
      done: (game) => game.world.state !== 'play',
      summary: (game) => ({
        outcome: game.world.state,
        stars: starsFor(game.world),
        wall: Math.round((100 * game.world.wall.hp) / game.world.wall.max),
        level: game.world.level,
        kills: game.world.stats.kills,
        boss: Math.round(game.world.stats.bossSeconds)
      })
    });
    table.push({ night, runs });
  }
  return table;
}

const quantile = (values, q) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(q * values.length))];

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const { night, runs } of playNights()) {
    console.log(`\n第 ${night} 夜 · Night ${night}  (skill ${skill})`);
    console.table(runs.map((r) => ({ seed: r.seed, finished: r.finished, seconds: Math.round(r.seconds), ...r.summary, slowestMs: r.slowestMs.toFixed(2) })));
    const seconds = runs.map((r) => r.seconds),
      held = runs.filter((r) => r.summary.outcome === 'won').length;
    console.log(`held ${held}/${runs.length}; seconds p10 ${Math.round(quantile(seconds, 0.1))} p50 ${Math.round(quantile(seconds, 0.5))} p90 ${Math.round(quantile(seconds, 0.9))}`);
  }
}
