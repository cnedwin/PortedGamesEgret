// 平衡：电脑玩家用三种哪吒、在三档难度上各打若干局，打印过关的比例、平均打到第几波、合成和神器的次数；另有「不动」
// 和「不买东西」两种对照。改了 src/sim/data.mjs 的数字之后跑一遍。
// Balance: the computer player plays each form of Nezha on each danger a number of times and prints how often it won,
// the average wave reached, and the merges and divine treasures made; standing still and buying nothing are the
// controls. Run it after changing a number in src/sim/data.mjs.
//
//   node tools/balance.mjs [games]
import { playOut } from '../src/sim/bot.mjs';
import { HERO_KINDS } from '../src/sim/data.mjs';

const games = Number(process.argv[2] ?? 8);
const line = (name, options) => {
  let won = 0,
    waves = 0,
    merges = 0,
    divines = 0,
    level = 0;
  for (let seed = 1; seed <= games; seed++) {
    const run = playOut({ seed, ...options });
    won += run.phase === 'won';
    waves += run.wave;
    merges += run.merges;
    divines += run.divines;
    level += run.level;
  }
  console.log(`  ${name.padEnd(26)} won ${String(won).padStart(2)}/${games}  wave ${(waves / games).toFixed(1).padStart(4)}  level ${(level / games).toFixed(1)}  merges ${(merges / games).toFixed(1)}  divine ${(divines / games).toFixed(1)}`);
};
for (let danger = 0; danger <= 2; danger++) {
  console.log(`\ndanger ${danger}`);
  for (const hero of HERO_KINDS) line(hero, { hero, danger });
}
console.log('\ncontrols, danger 0');
line('standing still', { still: true });
line('buying nothing', { shop: false });
