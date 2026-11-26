// 电脑玩家：按谱面击打，每一下的早晚按给定的偏差随机；用来检查谱面打得完、准的人能过关、乱敲的人过不了。
// A computer player: strikes the chart, each stroke early or late by a given spread at random. It checks that charts
// can be played, that a steady player clears them and that random striking does not.
import { advance, createRun, resultOf, strike } from './judge.mjs';

/** A small seeded random source (mulberry32). */
export function seeded(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A normal spread from a uniform source (Box–Muller). */
const gauss = (random) => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());

/**
 * Play `chart` through. `spread` is the standard deviation of each stroke's error in seconds; `slip` the chance of
 * striking with the wrong hand; `both` the chance of using both hands on a big note; `rollRate` strokes a second in a
 * roll. `mash` strikes at random instead, `mash` strokes a second. Returns the result.
 */
export function playOut(chart, { seed = 1, spread = 0.03, slip = 0, both = 0.8, rollRate = 12, mash = 0 } = {}) {
  const random = seeded(seed),
    run = createRun(chart),
    strokes = [];
  if (mash) {
    for (let t = 0; t < chart.end; t += 1 / mash) strokes.push({ t: t + random() / mash, kind: random() < 0.5 ? 'drum' : 'gong', hand: 'a' });
  } else
    for (const note of chart.notes) {
      if (note.roll) {
        for (let t = note.t; t < note.t + note.roll; t += 1 / rollRate) strokes.push({ t, kind: 'drum', hand: 'a' });
        continue;
      }
      const t = note.t + gauss(random) * spread,
        kind = random() < slip ? (note.kind === 'drum' ? 'gong' : 'drum') : note.kind;
      strokes.push({ t, kind, hand: 'a' });
      if (note.big && random() < both) strokes.push({ t: t + 0.015, kind, hand: 'b' });
    }
  strokes.sort((a, b) => a.t - b.t);
  for (const stroke of strokes) {
    advance(run, stroke.t);
    strike(run, stroke.kind, stroke.t, stroke.hand);
  }
  advance(run, chart.end);
  return { ...resultOf(run), run };
}
