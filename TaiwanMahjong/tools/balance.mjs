// 电脑对局统计：`node tools/balance.mjs [将数]` 让电脑整将对打，看三件事——难度越高是不是真的打得越好（一家高手对
// 三家入门、一家入门对三家普通）、三种性格打法有没有差别（吃碰次数、门清胡、混清一色和碰碰胡的比例、放槍率），以及
// 牌局本身像不像真的十六张（流局率、自摸率、平均台数、每局几巡）。
// Computer games in numbers: `node tools/balance.mjs [games]` has the computer play whole games and shows three
// things — whether a higher level really plays better (one expert against three beginners, one beginner against three
// regulars), whether the three characters play differently (calls, concealed wins, one-suit and all-pong hands,
// deal-ins), and whether the hands look like real sixteen-tile play (draws, self-draws, tai, turns a hand).
import { playMatch } from '../src/sim/bot.mjs';

const games = Number(process.argv[2] ?? 40);

function run(brains, label) {
  const seats = brains.map(() => ({ score: 0, hands: 0, wins: 0, self: 0, dealIns: 0, calls: 0, concealedWins: 0, suitWins: 0, pongWins: 0, tai: 0 }));
  let hands = 0,
    draws = 0,
    turns = 0;
  for (let seed = 1; seed <= games; seed++) {
    const match = playMatch({ seed: seed * 7919, rounds: 1, brains: brains.map((b) => ({ ...b })) });
    match.history.forEach((entry) => {
      hands++;
      entry.calls.forEach((n, i) => (seats[i].calls += n));
      const r = entry.result;
      if (r.kind === 'draw') draws++;
      else {
        const s = seats[r.seat],
          keys = r.score.items.map((i) => i.key);
        s.wins++;
        s.tai += r.score.total;
        if (r.from === null) s.self++;
        else seats[r.from].dealIns++;
        if (keys.includes('concealed') || keys.includes('concealedSelf')) s.concealedWins++;
        if (keys.some((k) => ['pureSuit', 'mixedSuit', 'allHonours'].includes(k))) s.suitWins++;
        if (keys.includes('allTriplets')) s.pongWins++;
      }
    });
    for (let s = 0; s < 4; s++) seats[s].score += match.scores[s];
    turns += match.history.length;
  }
  console.log(`\n${label} — ${games} games, ${hands} hands; exhausted ${pct(draws, hands)}`);
  console.log('seat  brain                points/game  wins   self%  deal-in  calls/hand  concealed  one-suit  all-pong  tai/win');
  seats.forEach((s, i) => {
    const b = brains[i];
    console.log(
      `${i}     ${(b.level + ' ' + b.character).padEnd(20)} ${String(Math.round(s.score / games)).padStart(10)}  ${pct(s.wins, hands).padStart(5)}  ${pct(s.self, s.wins).padStart(5)}  ${pct(s.dealIns, hands).padStart(7)}  ${(s.calls / hands).toFixed(2).padStart(10)}  ${pct(s.concealedWins, s.wins).padStart(9)}  ${pct(s.suitWins, s.wins).padStart(8)}  ${pct(s.pongWins, s.wins).padStart(8)}  ${(s.tai / Math.max(1, s.wins)).toFixed(1).padStart(7)}`
    );
  });
  void turns;
  return seats;
}

const pct = (a, b) => (b ? ((100 * a) / b).toFixed(1) + '%' : '—');
const brain = (level, character) => ({ level, character });

const started = performance.now();
const expert = run([brain('hard', 'steady'), brain('easy', 'steady'), brain('easy', 'eager'), brain('easy', 'grand')], 'One expert against three beginners');
const beginner = run([brain('easy', 'steady'), brain('normal', 'steady'), brain('normal', 'eager'), brain('normal', 'grand')], 'One beginner against three regulars');
run([brain('normal', 'steady'), brain('normal', 'eager'), brain('normal', 'grand'), brain('normal', 'steady')], 'The three characters at one level');
const mean = (list) => list.reduce((a, s) => a + s.score, 0) / list.length / games;
console.log(`\nexpert: ${Math.round(expert[0].score / games)} a game; the beginners average ${Math.round(mean(expert.slice(1)))}`);
console.log(`beginner: ${Math.round(beginner[0].score / games)} a game; the regulars average ${Math.round(mean(beginner.slice(1)))}`);
console.log(`${((performance.now() - started) / 1000).toFixed(1)} s`);
