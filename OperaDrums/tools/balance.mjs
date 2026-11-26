// 谱面检查：每首曲子每个难度的音符数、密度、最密的两秒，和电脑玩家在几种准度下的结果。改了 src/sim/songs.mjs 之后跑。
// Chart check: the notes, the density and the busiest two seconds of every chart, and how the computer player does
// at a few levels of steadiness. Run it after changing src/sim/songs.mjs.
//
//   node tools/balance.mjs [games]
import { playOut } from '../src/sim/bot.mjs';
import { buildChart, densityOf } from '../src/sim/chart.mjs';
import { DIFFICULTIES, SONGS } from '../src/sim/songs.mjs';

const games = Number(process.argv[2] ?? 10);
const players = {
  'steady (20 ms)': { spread: 0.02 },
  'fair (40 ms)': { spread: 0.04, slip: 0.02 },
  'loose (60 ms)': { spread: 0.06, slip: 0.04 },
  'wild (90 ms)': { spread: 0.09, slip: 0.08 },
  'mashing 8/s': { mash: 8 }
};
for (const song of SONGS)
  for (const difficulty of DIFFICULTIES) {
    const chart = buildChart(song, difficulty);
    let busiest = 0;
    for (const note of chart.notes) busiest = Math.max(busiest, chart.notes.filter((n) => n.t >= note.t && n.t < note.t + 2).length);
    console.log(`\n${song.id} ${difficulty}: ${chart.notes.length} notes, ${densityOf(chart).toFixed(2)}/s, busiest 2 s ${busiest}, ${chart.end.toFixed(0)} s`);
    for (const [name, options] of Object.entries(players)) {
      let cleared = 0,
        gauge = 0,
        score = 0;
      for (let seed = 1; seed <= games; seed++) {
        const result = playOut(chart, { seed, ...options });
        cleared += result.cleared;
        gauge += result.gauge;
        score += result.score;
      }
      console.log(`  ${name.padEnd(15)} cleared ${String(cleared).padStart(2)}/${games}  gauge ${(gauge / games).toFixed(0).padStart(3)}  score ${Math.round(score / games)}`);
    }
  }
