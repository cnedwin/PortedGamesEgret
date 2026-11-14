// What the things a sect can pile onto its fighters are worth: the same ten
// on both sides, one side given an advantage. Fights between equals are
// decided by small edges, so each advantage is given as the number of levels
// the other side would need to win half the fights against it.
//   node tools/stacking.mjs [fights]
import { resolveBattle } from '../src/core/battle.mjs';
import { openMeridian } from '../src/core/extras.mjs';
import { equipFor, growTo } from '../src/core/persons.mjs';
import { createWorld, membersOf } from '../src/core/world.mjs';
import { MERIDIANS } from '../src/data/extras.mjs';

const fights = Number(process.argv[2] ?? 80);
const squad = () => structuredClone(membersOf(createWorld({ seed: 1 }), 'huashan'));
const stand = (attack = 0, defense = 0) => ({ width: 5, bonus: { attack, defense, regen: 0 } });

/** The share of fights the favoured side wins when the other side is `handicap` levels higher. */
function winShare(change, formation, handicap) {
  let wins = 0;
  for (let seed = 1; seed <= fights; seed++) {
    const favoured = squad(),
      plain = squad();
    change(favoured);
    plain.forEach((person) => growTo(person, person.level + handicap));
    const first = seed % 2 === 0;
    const result = resolveBattle({ sides: first ? [favoured, plain] : [plain, favoured], formations: first ? [formation, stand()] : [stand(), formation], seed });
    if (result.winner === (first ? 0 : 1)) wins++;
  }
  return wins / fights;
}
/** An advantage's worth in levels: how many levels the other side needs to win half the fights. */
function rate(change, formation = stand()) {
  let last = winShare(change, formation, 0);
  if (last <= 0.5) return '0 levels';
  for (let levels = 1; levels <= 30; levels++) {
    const share = winShare(change, formation, levels);
    if (share <= 0.5) return `${(levels - 1 + (last - 0.5) / (last - share)).toFixed(1)} levels`;
    last = share;
  }
  return 'over 30 levels';
}
const meridians = (people) => {
  // The rule on inner strength is set aside here; the question is what eight open meridians are worth.
  for (const person of people) for (let i = 0; i < MERIDIANS.length; i++) (person.arts.inner3 = 1000), (person.arts.inner2 = 1000), (person.arts.inner1 = 1000), openMeridian({ persons: { [person.id]: person } }, person.id, 'a') ;
};
const relics = (people) => people.slice(0, 3).forEach((person) => person.gear.weapon && (person.gear.weapon = { ...person.gear.weapon, grade: 7, power: 180 }));
const gear = (grade) => (people) => people.forEach((person) => equipFor(person, grade));

console.log('gear one grade up  ', rate((people) => people.forEach((person) => equipFor(person, person.gear.armor + 1))));
console.log('gear at grade six  ', rate(gear(6)));
console.log('three named weapons', rate(relics));
console.log('eight meridians    ', rate(meridians));
console.log('attack +10%        ', rate(() => {}, stand(0.1)));
console.log('attack +20%        ', rate(() => {}, stand(0.2)));
console.log('attack +30%        ', rate(() => {}, stand(0.3)));
console.log('defence +15%       ', rate(() => {}, stand(0, 0.15)));
console.log('everything at once ', rate((people) => (gear(6)(people), relics(people), meridians(people)), stand(0.28, 0.1)));
