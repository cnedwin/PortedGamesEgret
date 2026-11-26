// Plays the rules without a picture, the rule-driven player at the controls, and prints how the climb and
// the yard stand go for each seed: how long, how many falls and blows taken, what was learned, the mark.
// The engine's headless runner does the playing and times every step.
//
//   node tools/balance.mjs            six seeds a tier, tiers 1 to 5 and 7, then the yard
//   node tools/balance.mjs 12 3       twelve seeds, tier 3 only
import '../vendor/node-register.mjs';
import { begin, createGame, step } from '../src/rules/game.mjs';
import { grade, tierName } from '../src/rules/tiers.mjs';
import { createBot } from '../test/bot.mjs';

const { runHeadless } = await import('@egret/engine/kit');

/** A run of the rules in the shape the headless runner plays: the game, a count of what happened, one step. */
export const playable = (options) => (seed) => {
  const game = createGame(seed, options),
    seen = { fall: 0, hurt: 0, scorch: 0, parry: 0, riposte: 0, ignite: 0, arrowStuck: 0 };
  if (game.mode !== 'yard') begin(game);
  return {
    game,
    seen,
    update(seconds, input) {
      for (const event of step(game, input, seconds)) if (event.type in seen) seen[event.type]++;
    }
  };
};
/** The rule-driven player for such a run. */
export const standIn = ({ game }) => {
  const bot = createBot();
  return () => bot(game);
};
/** Play the chapter at `tier` once per seed. */
export const climb = (tier, seeds, maxSeconds = 900) =>
  runHeadless({
    createGame: playable({ tier }),
    createPlayer: standIn,
    done: ({ game }) => game.stage === 'done',
    seeds,
    maxSeconds,
    summary: ({ game, seen }) => ({
      time: Math.round(game.time),
      falls: seen.fall,
      hurts: seen.hurt + seen.scorch,
      parries: seen.parry,
      mark: grade({ time: game.time, falls: seen.fall, hurts: seen.hurt + seen.scorch, parries: seen.parry, ripostes: seen.riposte }).mark,
      learned: game.boons.join(' ')
    })
  });
/** Hold the yard once per seed, until the fall. */
export const stand = (seeds, maxSeconds = 1800) =>
  runHeadless({
    createGame: playable({ mode: 'yard' }),
    createPlayer: standIn,
    done: ({ game }) => game.over,
    seeds,
    maxSeconds,
    summary: ({ game, seen }) => ({ wave: game.wave, time: Math.round(game.time), hurts: seen.hurt + seen.scorch, set_alight: seen.ignite, learned: game.boons.join(' ') })
  });

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const seeds = Number(process.argv[2]) || 6,
    tiers = process.argv[3] ? [Number(process.argv[3])] : [1, 2, 3, 4, 5, 7];
  const rows = (runs) => runs.map((run) => ({ seed: run.seed, ...(run.finished ? {} : { unfinished: true }), ...run.summary, 'ms/step': run.averageMs.toFixed(3) }));
  for (const tier of tiers) {
    console.log(`\n第 ${tier} 重　${tierName(tier)}`);
    console.table(rows(climb(tier, seeds)));
  }
  if (!process.argv[3]) {
    console.log('\n守草料场');
    console.table(rows(stand(seeds)));
  }
}
