// Run a whole race without a page: the game drives all eight karts. Prints
// the order at the end of each leader lap and the final result. Handy for
// checking a change to the rules, the rivals or the numbers.
//
//   node tools/headless.mjs [class 0-2] [laps] [seed]
import { register } from 'node:module';

register('./egret-resolve.mjs', import.meta.url);
const { CLASSES, RACERS } = await import('../src/data.mjs');
const { createRace } = await import('../src/sim.mjs');
const { createTrack } = await import('../src/track.mjs');

const klass = Math.min(2, Math.max(0, Number(process.argv[2] ?? 1)));
const laps = Math.max(1, Number(process.argv[3] ?? 3));
const seed = Number(process.argv[4] ?? 7);

const track = createTrack();
const race = createRace({ track, klass, laps, seed, entries: RACERS.map((_, racer) => ({ racer, human: false })) });
const name = (kart) => RACERS[kart.racer].name.en;
const clock = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;
const tally = {};

console.log(`${CLASSES[klass].name.en}, ${laps} laps of ${Math.round(track.length)} m, seed ${seed}`);
race.startCountdown();
for (let frame = 0; race.state !== 'done' && frame < 60 * 60 * 10; frame++) {
  race.update(1 / 60);
  for (const event of race.events) {
    tally[event.type] = (tally[event.type] ?? 0) + 1;
    if (event.type === 'lap' && race.karts[event.kart].place === 1)
      console.log(
        `  lap ${event.lap} at ${clock(race.time)}: ${race
          .results()
          .map((row) => name(row.kart).split(' ')[0])
          .join(', ')}`,
      );
  }
  race.events.length = 0;
}
for (const row of race.results())
  console.log(
    `${row.place}. ${name(row.kart).padEnd(28)} ${row.time === undefined ? 'still racing' : clock(row.time)}  best lap ${row.bestLap ? clock(row.bestLap) : '-'}`,
  );
console.log(
  'events:',
  Object.entries(tally)
    .map(([type, count]) => `${type} ${count}`)
    .join(', '),
);
