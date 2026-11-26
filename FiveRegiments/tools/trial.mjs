// Trials: every regiment against every other, both sides played by brains, to see who wins how often, how long
// a bout lasts and what happens in it. `node tools/trial.mjs [rounds] [level]`; `--pair yulin,tiger` for one pair;
// `--two` puts each regiment against every pair of the others.
import { ORDER } from '../src/sim/regiments.mjs';
import { createFight, step, TICK } from '../src/sim/fight.mjs';
import { createBrains } from '../src/sim/brain.mjs';

const args = process.argv.slice(2);
const rounds = Number(args.find((a) => /^\d+$/.test(a)) ?? 20);
const level = Number(args.find((a) => /^0?\.\d+$/.test(a)) ?? 0.6);
const pairArg = args.includes('--pair') ? args[args.indexOf('--pair') + 1] : null;
const two = args.includes('--two');

/** The fields are about this wide now, room for a horse to come round. */
export const FIELD = 18;

export function bout(hero, foes, seed, { heroLevel = level, foeLevel = level, limit = 180, health = 1 } = {}) {
  const game = createFight({ hero: { regiment: hero }, foes: foes.map((regiment) => ({ regiment })), seed, health, place: { radius: FIELD, posts: [] } });
  const brains = createBrains(game, { level: foeLevel, hero: true, heroLevel });
  const tally = {};
  while (!game.over && game.time < limit) {
    const inputs = {};
    for (const [id, brain] of Object.entries(brains)) inputs[id] = brain.think(game, TICK);
    for (const e of step(game, inputs)) if (!e.quiet) tally[e.type] = (tally[e.type] ?? 0) + 1;
  }
  return { result: game.over ?? 'draw', time: game.time, tally, hero: game.hero };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pairs = [];
  if (pairArg && !pairArg.startsWith('-')) pairs.push(pairArg.split(','));
  else if (two) {
    for (const h of ORDER) {
      const others = ORDER.filter((o) => o !== h);
      for (let i = 0; i < others.length; i++) for (let j = i + 1; j < others.length; j++) pairs.push([h, others[i], others[j]]);
    }
  } else for (const h of ORDER) for (const f of ORDER) if (h !== f) pairs.push([h, f]);
  const rows = [];
  const score = {};
  for (const [h, ...f] of pairs) {
    let won = 0,
      time = 0,
      draws = 0;
    const tally = {};
    for (let seed = 1; seed <= rounds; seed++) {
      const r = bout(h, f, seed * 7919);
      if (r.result === 'won') won++;
      if (r.result === 'draw') draws++;
      time += r.time;
      for (const [k, v] of Object.entries(r.tally)) tally[k] = (tally[k] ?? 0) + v;
    }
    const per = (k) => ((tally[k] ?? 0) / rounds).toFixed(1);
    rows.push(`${h.padEnd(9)} vs ${f.join('+').padEnd(16)} ${((won / rounds) * 100).toFixed(0).padStart(3)}%  ${(time / rounds).toFixed(1).padStart(5)}s  draws ${draws}  swing ${per('swing')} hit ${per('hit')} block ${per('block')} deflect ${per('deflect')} break ${per('break')} skill ${per('skill')} loose ${per('loose')}`);
    score[h] = (score[h] ?? 0) + won / rounds;
    for (const x of f) score[x] = (score[x] ?? 0) + 1 - won / rounds;
  }
  console.log(rows.join('\n'));
  if (!two) console.log(Object.entries(score).map(([k, v]) => `${k} ${((v / 8) * 100).toFixed(0)}%`).join('  '));
}
