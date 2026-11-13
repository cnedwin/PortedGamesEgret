// How much each formation is worth: the same ten fighters on both sides, one
// side in the formation and the other in a plain line, over many fights.
//   node tools/formations.mjs [fights]
import { resolveBattle } from '../src/core/battle.mjs';
import { createWorld, membersOf } from '../src/core/world.mjs';
import { FORMATIONS } from '../src/data/jianghu.mjs';

const fights = Number(process.argv[2] ?? 80);
const world = createWorld({ seed: 1 });
const squad = membersOf(world, 'huashan');
const stand = (id) => ({ width: FORMATIONS[id].width, bonus: { attack: FORMATIONS[id].attack ?? 0, defense: FORMATIONS[id].defense ?? 0, regen: FORMATIONS[id].regen ?? 0 } });
for (const id of Object.keys(FORMATIONS)) {
  let wins = 0;
  for (let seed = 1; seed <= fights; seed++) {
    // Sides swap each fight so that standing on the left or right does not count.
    const first = seed % 2 === 0;
    const result = resolveBattle({ sides: [squad, squad], formations: first ? [stand(id), stand('line')] : [stand('line'), stand(id)], seed });
    if (result.winner === (first ? 0 : 1)) wins++;
  }
  console.log(`${FORMATIONS[id].name.padEnd(6, '　')} ${Math.round((wins / fights) * 100)}%`);
}
