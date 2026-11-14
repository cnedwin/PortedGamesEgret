// Plays many worlds forward and prints, year by year, how the numbers run:
// how many sects are left, and for those that are, the spread of their
// people, strongholds, silver, grain, renown and strength, how far their
// best people have come, how many arts they have found, and how many of
// their people have risen to stand close to the leader or beside them. It ends with
// how and when each world was won. For checking the balance of the whole
// game after a change to any of its numbers.
//
//   node tools/audit.mjs [years, default 30] [worlds, default 8] [first seed, default 1]
import { SECTS } from '../src/data/sects.mjs';
import { ART_BY_ID, levelOf } from '../src/data/arts.mjs';
import { advanceDay, createWorld, ledger, membersOf } from '../src/core/world.mjs';
import { commonArts, heldArts } from '../src/core/library.mjs';

const years = Number(process.argv[2] ?? 30),
  worlds = Number(process.argv[3] ?? 8),
  first = Number(process.argv[4] ?? 1);
const spread = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  return `${Math.round(at(0.1))}/${Math.round(at(0.5))}/${Math.round(at(0.9))}`;
};
const rows = Array.from({ length: years }, () => ({ alive: [], members: [], places: [], silver: [], grain: [], renown: [], strength: [], level: [], top: [], tier: [], arts: [], wages: [], close: [], elders: [], middle: [] }));
const endings = [],
  wins = {},
  falls = {};
const started = Date.now();
for (let w = 0; w < worlds; w++) {
  const state = createWorld({ seed: first + w, autoPlayer: true });
  let y = 0;
  for (; y < years && !state.outcome; y++) {
    for (let day = 0; day < 360 && !state.outcome; day++) advanceDay(state);
    const row = rows[y];
    const alive = SECTS.filter((sect) => state.sects[sect.id].alive);
    row.alive.push(alive.length);
    for (const sect of alive) {
      const books = ledger(state, sect.id),
        people = membersOf(state, sect.id);
      row.members.push(books.members);
      row.places.push(books.places);
      row.silver.push(books.silver);
      row.grain.push(state.sects[sect.id].grain);
      row.renown.push(books.renown);
      row.strength.push(books.strength);
      row.wages.push(books.wages);
      row.level.push(Math.max(0, ...people.map((p) => p.level)));
      row.close.push(people.filter((p) => p.rank === 3).length);
      row.elders.push(people.filter((p) => p.rank >= 4).length);
      row.middle.push([...people].sort((a, b) => a.level - b.level)[Math.floor(people.length / 2)]?.level ?? 0);
      // The deepest mastery anyone there has of a strike art, and the tier of it.
      let top = 0,
        tier = 0;
      for (const p of people) for (const [id, points] of Object.entries(p.arts)) if (ART_BY_ID[id] && levelOf(points) * 10 + ART_BY_ID[id].tier > top * 10 + tier) (top = levelOf(points)), (tier = ART_BY_ID[id].tier);
      row.top.push(top);
      row.tier.push(Math.max(0, ...people.flatMap((p) => Object.entries(p.arts).filter(([id, points]) => ART_BY_ID[id] && levelOf(points) >= 5).map(([id]) => ART_BY_ID[id].tier))));
      const held = heldArts(state, sect.id);
      row.arts.push(commonArts().filter((art) => held.has(art.id)).length);
    }
  }
  for (const entry of state.log.filter((e) => e.type === 'fall')) falls[Math.ceil(entry.day / 360)] = (falls[Math.ceil(entry.day / 360)] ?? 0) + 1;
  const leader = SECTS.filter((sect) => state.sects[sect.id].alive).sort((a, b) => ledger(state, b.id).places - ledger(state, a.id).places)[0];
  endings.push(state.outcome ? `${state.outcome.result}@${y}` : `none(${SECTS.filter((s) => state.sects[s.id].alive).length} left, ${leader.name} ${ledger(state, leader.id).places})`);
  wins[leader.id] = (wins[leader.id] ?? 0) + 1;
}
console.log(`${worlds} worlds, ${years} years, ${((Date.now() - started) / 1000).toFixed(1)}s. Each cell is the 10th / 50th / 90th centile over every sect still standing.`);
console.log('year sects  people   places   silver             grain        renown       strength           wages     level    best-art  tier5+  common-arts  close  elders  median-level');
rows.forEach((row, y) => {
  if (!row.alive.length || ![0, 1, 2, 4, 7, 9, 14, 19, 24, 29, 39, 49].includes(y)) return;
  console.log([String(y + 1).padStart(3), spread(row.alive).padEnd(7), spread(row.members).padEnd(9), spread(row.places).padEnd(8), spread(row.silver).padEnd(18), spread(row.grain).padEnd(12), spread(row.renown).padEnd(12), spread(row.strength).padEnd(18), spread(row.wages).padEnd(9), spread(row.level).padEnd(8), spread(row.top).padEnd(9), spread(row.tier).padEnd(7), spread(row.arts).padEnd(12), spread(row.close).padEnd(6), spread(row.elders).padEnd(7), spread(row.middle)].join(' '));
});
console.log('endings:', endings.join('  '));
console.log('leading sect at the end:', Object.entries(wins).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${id} ${n}`).join(', '));
console.log('sects fallen by year:', Object.entries(falls).map(([year, n]) => `y${year}:${n}`).join(' '));
