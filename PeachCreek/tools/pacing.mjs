// 节奏模拟：`node tools/pacing.mjs` 让模拟玩家按几种上线习惯各打一局，报告升到每一级用了几小时、来敌赢输几次、
// 最后的人口和民生。白天八点到半夜十二点醒着，按习惯隔一段时间上线一次，每次待几分钟；夜里八小时不上线（离线
// 收益按仓廪的上限算）。第一天先连着玩一个钟头。
// Pacing: `node tools/pacing.mjs` has the stand-in magistrate play a term under a few habits and reports the hours
// to each rank, raids won and lost, and the final people and livelihood. Awake from eight in the morning to midnight,
// visiting every so often for a few minutes; eight hours asleep (an absence counts up to the granaries' cap). The
// first day starts with an hour of steady play.
import { pathToFileURL } from 'node:url';
import { HOUR, RANKS, FINAL_RANK } from '../src/sim/data.mjs';
import { advance, createCounty, promote, trainTalents } from '../src/sim/world.mjs';
import { visit } from '../src/sim/bot.mjs';

export const HABITS = { keen: 20 * 60, regular: 90 * 60, casual: 4 * HOUR };

export function playTerm({ every, seed = 1, limit = 10 * 24 * HOUR, after = null }) {
  const start = 8 * HOUR,
    // A later term starts from the one before (`after`), as the promotion button does.
    state = after ? promote(after, start) : createCounty({ seed, now: start }),
    reached = [0];
  let now = start;
  const step = (to, active) => {
    const before = state.time;
    advance(state, to, { active });
    trainTalents(state, (state.time - before) / HOUR);
  };
  // The first hour: the page open, something done every half minute.
  for (let m = 0; m < 120; m++) {
    now += 30;
    step(now, true);
    visit(state);
    while (reached.length <= state.rank) reached.push(now - start);
  }
  while (!state.termDone && now - start < limit) {
    const hourOfDay = (now / HOUR) % 24;
    let next = now + every;
    if (hourOfDay + every / HOUR >= 24) next = Math.ceil(now / (24 * HOUR)) * 24 * HOUR + 8 * HOUR; // asleep till eight
    now = next;
    step(now, false);
    visit(state);
    // A visit lasts three minutes with the page open.
    now += 180;
    step(now, true);
    visit(state);
    while (reached.length <= state.rank) reached.push(now - start);
  }
  return { state, reached: reached.map((s) => s / HOUR), hours: (now - start) / HOUR };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const [name, every] of Object.entries(HABITS)) {
    const { state, reached, hours } = playTerm({ every });
    console.log(`\n${name} (a visit every ${every / 60} min while awake)`);
    console.log('  rank hours: ' + reached.map((h, i) => `${RANKS[i].key}@${h.toFixed(1)}h`).join('  '));
    console.log(`  term ${state.termDone ? 'done' : 'NOT done'} after ${hours.toFixed(1)} h (${(hours / 24).toFixed(2)} days); people ${Math.round(state.pop)}, life ${state.life.toFixed(0)}, raids ${state.stats.raidsWon} won / ${state.stats.raidsLost} lost, talents ${state.talents.length}, built ${state.stats.built}`);
    console.log(`  coin ${Math.round(state.res.coin)}, wood ${Math.round(state.res.wood)}, stone ${Math.round(state.res.stone)}, iron ${Math.round(state.res.iron)}, silk ${Math.round(state.res.silk)}, porcelain ${Math.round(state.res.porcelain)}, tea ${Math.round(state.res.tea)}`);
    void FINAL_RANK;
    const second = playTerm({ every, after: state });
    console.log(`  second term: ${second.state.termDone ? 'done' : 'NOT done'} after ${second.hours.toFixed(1)} h (${(second.hours / 24).toFixed(2)} days); ranks ${second.reached.map((h) => h.toFixed(0)).join('/')}`);
  }
}
