// Plays the world forward without a page and prints how the sects fare. Handy
// for checking a change to the rules, the numbers or the other sects' habits.
//
//   node tools/headless.mjs [years, default 10] [seed, default 7]
import { SECTS } from '../src/data/sects.mjs';
import { PLACE_BY_ID } from '../src/data/places.mjs';
import { advanceDay, createWorld, dateText, ledger, placesOf } from '../src/core/world.mjs';

const years = Number(process.argv[2] ?? 10);
const seed = Number(process.argv[3] ?? 7);
const state = createWorld({ seed, autoPlayer: true });

for (let y = 1; y <= years && !state.outcome; y++) {
  for (let day = 0; day < 360 && !state.outcome; day++) advanceDay(state);
  const alive = SECTS.filter((sect) => state.sects[sect.id].alive);
  console.log(`-- ${dateText(state)}: ${alive.length} sects`);
  for (const sect of alive) {
    const row = ledger(state, sect.id);
    console.log(
      `  ${sect.name.padEnd(4, '　')} 人${String(row.members).padStart(3)} 据点${row.places} 银${String(row.silver).padStart(7)} 薪${String(row.wages).padStart(4)} 战力${String(row.strength).padStart(7)} 威望${String(row.renown).padStart(4)}  ${placesOf(state, sect.id)
        .map((id) => PLACE_BY_ID[id].name)
        .join('、')}`,
    );
  }
}
const kinds = {};
for (const entry of state.log) kinds[entry.type] = (kinds[entry.type] ?? 0) + 1;
console.log('recent events:', Object.entries(kinds).map(([type, count]) => `${type} ${count}`).join(', '));
for (const entry of state.log.filter((e) => ['conquer', 'fall', 'insight', 'succession', 'summit'].includes(e.type)).slice(-12)) console.log(`  第${entry.day}日 ${entry.text}`);
if (state.outcome) console.log('outcome:', state.outcome);
