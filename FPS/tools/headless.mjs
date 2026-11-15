// Play whole runs without a page: `node tools/headless.mjs [runs] [first seed]`.
// The stand-in player from src/bot.mjs plays; each line reports how a run went.
import { register } from 'node:module';

register('./egret-resolve.mjs', import.meta.url);
const { createGame } = await import('../src/sim.mjs');
const { createBot } = await import('../src/bot.mjs');

const runs = Number(process.argv[2]) || 3,
  firstSeed = Number(process.argv[3]) || 1,
  verbose = process.argv.includes('--events');
let wins = 0;
for (let run = 0; run < runs; run++) {
  const seed = firstSeed + run,
    game = createGame({ seed }),
    bot = createBot(game, { skill: Number(process.env.SKILL) || 1 });
  const dt = 1 / 60,
    started = performance.now();
  let steps = 0,
    slowest = 0;
  while (game.state !== 'won' && game.state !== 'dead' && steps < 60 * 60 * 20) {
    const before = performance.now();
    game.update(dt, bot.think(dt));
    slowest = Math.max(slowest, performance.now() - before);
    if (verbose)
      for (const event of game.events)
        if (!['shot', 'enemyShot', 'step', 'enemySpawn'].includes(event.type))
          console.log(game.t.toFixed(1).padStart(6), event.type, event.key ?? event.terminal?.key ?? event.enemy?.kind ?? '');
    game.events.length = 0;
    steps++;
  }
  if (game.state === 'won') wins++;
  const s = game.stats,
    p = game.player;
  console.log(
    `seed ${seed}: ${game.state} at ${game.t.toFixed(0)} s, terminals ${game.terminalsDone}/3, kills ${s.kills} (${s.headshots} head), ` +
      `accuracy ${s.shots ? Math.round((100 * s.hits) / s.shots) : 0}%, damage taken ${Math.round(s.damageTaken)}, health ${Math.round(p.health)}, ` +
      `loot ${game.lootValue}, rating ${game.rating()}, ${((performance.now() - started) / steps).toFixed(3)} ms a step (slowest ${slowest.toFixed(1)})`,
  );
}
console.log(`${wins} of ${runs} runs reached the helicopter`);
