// 百年推演：没有玩家，三十四路诸侯全由电脑执掌，从中平元年走到太康元年，每十年记一笔——还剩几家、最大的三家各有
// 几城、发生了哪些史实事件——用来检查天下分合的节奏。`node tools/balance.mjs [种子] [演义]`。
// A century run: no player, all thirty-four lords in the computer's hands, from 184 to 280, with a line every ten
// years — how many powers are left, the three greatest and their cities, and which events of history came to pass —
// to check the pace at which the realm divides and joins. `node tools/balance.mjs [seed] [tale]`.
import '../vendor/node-register.mjs';

const { createGame, advance } = await import('../src/sim/world.mjs');
const { NODES } = await import('../src/data/map.mjs');
const { dateOf, dayOf } = await import('../src/sim/core.mjs');
const { answerStory } = await import('../src/sim/story.mjs');
const { setLanguage } = await import('../src/i18n.mjs');
const { factionName } = await import('../src/view/names.mjs');

const seed = Number(process.argv[2] ?? 7),
  branch = process.argv[3] ?? 'caocao';
setLanguage('zh');
const s = createGame({ seed, faction: null, branch, command: false });
const cities = (f) => Object.keys(s.nodes).filter((id) => s.nodes[id].owner === f && NODES[id].kind === 'city').length;
const lines = [];
function mark() {
  const { year } = dateOf(s.day);
  const alive = Object.values(s.factions).filter((f) => f.alive);
  const top = alive
    .map((f) => [factionName(s, f.id), cities(f.id)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([n, c]) => `${n} ${c}`)
    .join('、');
  const events = Object.entries(s.fired)
    .filter(([, d]) => d !== 'missed' && dateOf(d).year > year - 10 && dateOf(d).year <= year)
    .map(([id]) => id);
  lines.push(`| ${year} | ${alive.length} | ${top} | ${events.join(', ') || '—'} |`);
}
const t0 = performance.now();
mark();
for (let year = 190; year <= 280; year += 10) {
  while (s.day < dayOf(year, 1)) {
    if (!advance(s)) {
      const m = s.inbox.find((x) => x.blocks) ?? s.inbox[0];
      if (m?.kind === 'story') answerStory(s, m.event, 0);
      else if (m) s.inbox = s.inbox.filter((x) => x !== m);
      else break;
    }
  }
  mark();
}
console.log(`seed ${seed}, tale ${branch}, ${((performance.now() - t0) / 1000).toFixed(0)} s, ${(((performance.now() - t0) / (s.day - 30)) | 0) || '<1'} ms a day`);
console.log('| 年 · Year | 势力 · Powers | 最大的三家（城） · The three greatest (cities) | 史实事件 · Events |');
console.log('| --- | --- | --- | --- |');
console.log(lines.join('\n'));
console.log('tally', JSON.stringify(s.tally));
