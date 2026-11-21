// 平衡：电脑玩家按几种打法各打若干局，打印守住的比例、剩命和星数。改了 src/sim/data.mjs 的数字之后跑一遍。
// Balance: the computer player plays a number of games each way and prints how often it held, the lives left and the
// stars. Run it after changing a number in src/sim/data.mjs.
//
//   node tools/balance.mjs [games]
import { PLAN, playOut } from '../src/sim/bot.mjs';
import { starsOf } from '../src/sim/world.mjs';

const games = Number(process.argv[2] ?? 20);
const ways = {
  'plan, gates, upgrades': {},
  'plan, no gates': { gates: false },
  'plan, no upgrades': { upgrades: false },
  'half the plan': { plan: PLAN.slice(0, 6) },
  'crossbows only': { plan: PLAN.map(([plot]) => [plot, 'crossbow']) },
  'plan, waves called early': { early: true }
};

for (const difficulty of ['normal', 'hard']) {
  console.log(`\n${difficulty}`);
  for (const [name, options] of Object.entries(ways)) {
    let held = 0,
      lives = 0,
      stars = 0,
      reached = 0;
    for (let seed = 1; seed <= games; seed++) {
      const world = playOut({ seed, difficulty, ...options });
      if (world.state === 'won') held++;
      lives += world.lives;
      stars += starsOf(world);
      reached += world.wave + 1;
    }
    console.log(
      `  ${name.padEnd(26)} held ${String(held).padStart(3)}/${games}  lives ${(lives / games).toFixed(1).padStart(5)}  stars ${(stars / games).toFixed(2)}  wave ${(reached / games).toFixed(1)}`
    );
  }
}
