// Balance checks: runs many fights without a page and prints how long they
// take and who wins. Use it after changing a number in src/data or a rule in
// src/core/battle.mjs.
//
//   node tools/balance.mjs [fights per line-up, default 200]
import { ARTS, SECT_TUNING, commonArt, sectArts } from '../src/data/arts.mjs';
import { SECTS } from '../src/data/sects.mjs';
import { resolveBattle } from '../src/core/battle.mjs';
import { autoWheel, equipFor, growTo, rollPerson } from '../src/core/persons.mjs';
import { createRng } from '../src/core/rng.mjs';

const fights = Number(process.argv[2] ?? 200);

/** Typical fighters at three points of a game. */
export const STAGES = {
  early: { level: 5, tier: 1, mastery: 5, grade: 1, inner: 2 },
  mid: { level: 20, tier: 3, mastery: 6, grade: 3, inner: 5 },
  late: { level: 40, tier: 5, mastery: 8, grade: 6, inner: 9 },
};

let nextId = 1;
/** A fighter of a stage who fights with one class, or with a sect's own arts. */
export function fighter(rng, stage, { klass = 'sword', sect = undefined, levelOffset = 0 } = {}) {
  const spec = STAGES[stage];
  const person = rollPerson(rng, { quality: 50, school: sect });
  person.id = nextId++;
  person.rank = spec.tier >= 5 ? 3 : spec.tier >= 4 ? 2 : 1;
  growTo(person, spec.level + levelOffset);
  for (let tier = 1; tier <= Math.min(3, spec.tier); tier++) {
    person.arts[commonArt(klass, tier).id] = spec.mastery * 100;
    person.arts[commonArt('inner', tier).id] = spec.inner * 100;
  }
  if (sect && spec.tier >= 4)
    for (const art of sectArts(sect)) {
      if (art.tier > spec.tier) continue;
      for (let tier = 1; tier <= 3; tier++) person.arts[commonArt(art.klass, tier).id] ??= spec.mastery * 100;
      person.arts[art.id] = spec.mastery * 100;
    }
  equipFor(person, spec.grade);
  person.wheel = autoWheel(person);
  return person;
}

export function series(makeA, makeB, count = fights, seed = 1) {
  const rng = createRng(seed);
  let time = 0,
    wins = 0;
  for (let i = 0; i < count; i++) {
    const result = resolveBattle({ sides: [makeA(rng), makeB(rng)], seed: rng.int(1, 1e9) });
    time += result.time;
    wins += result.winner === 0 ? 1 : result.winner === -1 ? 0.5 : 0;
  }
  return { seconds: time / count, winRate: wins / count };
}

const team = (stage, options, size = 10) => (rng) => Array.from({ length: size }, () => fighter(rng, stage, options));

/** Every sect against every other; returns each one's share of wins. */
export function roundRobin(per, seed = 1) {
  const ids = SECTS.map((sect) => sect.id);
  const totals = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const a of ids)
    for (const b of ids) {
      if (a >= b) continue;
      const mainA = SECTS.find((s) => s.id === a).main,
        mainB = SECTS.find((s) => s.id === b).main;
      const result = series(team('late', { sect: a, klass: mainA }), team('late', { sect: b, klass: mainB }), per, seed);
      totals[a] += result.winRate;
      totals[b] += 1 - result.winRate;
    }
  for (const id of ids) totals[id] /= ids.length - 1;
  return totals;
}

if (process.argv.includes('--tune')) {
  // Nudge each sect's multiplier towards an even record, a little at a time.
  for (let round = 0; round < 14; round++) {
    const rates = roundRobin(24, round + 1);
    for (const [id, rate] of Object.entries(rates)) SECT_TUNING[id] *= (0.5 / Math.min(0.95, Math.max(0.05, rate))) ** 0.22;
    console.log(round, Object.values(rates).map((rate) => (rate * 100).toFixed(0)).join(' '));
  }
  console.log(JSON.stringify(Object.fromEntries(Object.entries(SECT_TUNING).map(([id, value]) => [id, Math.round(value * 100) / 100]))));
} else if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`== how long a fight lasts (${fights} fights each)`);
  for (const stage of Object.keys(STAGES)) {
    const duel = series(team(stage, {}, 1), team(stage, {}, 1));
    const melee = series(team(stage, {}), team(stage, {}));
    console.log(`${stage.padEnd(6)} one on one ${duel.seconds.toFixed(0)}s   ten a side ${melee.seconds.toFixed(0)}s`);
  }
  console.log('== the weapon triangle: sword (edge) against fist (hand), mid game, one on one');
  for (const offset of [0, -2, -3, -4, -5, -6]) {
    const result = series(team('mid', { klass: 'sword', levelOffset: offset }, 1), team('mid', { klass: 'fist' }, 1), fights * 2);
    console.log(`  sword ${String(-offset).padStart(1)} levels lower: wins ${(result.winRate * 100).toFixed(0)}%`);
  }
  console.log('== sect against sect, late game, ten a side (win rate of the row)');
  const rates = roundRobin(Math.max(20, Math.round(fights / 5)), 99);
  for (const [id, rate] of Object.entries(rates)) console.log(`  ${id.padEnd(11)} ${(rate * 100).toFixed(0)}%`);
  console.log(`arts: ${ARTS.length}, moves: ${ARTS.length * 3}`);
}
