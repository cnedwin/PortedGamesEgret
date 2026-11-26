// The road: one regiment chosen, the other four met one at a time in four places, then two at once before the
// palace. Which foes, where, how hard, and the mark for the whole run.
import { ORDER, REGIMENTS } from './regiments.mjs';

export const PLACES = ['county', 'peach', 'bamboo', 'snow', 'palace'];

// Who is met first: the plainer fights before the harder ones, whichever regiment is chosen (by how often each wins
// in the computer-against-computer trials: the Tiger Step least, the Imperial Guard with his 18,000 health most).
const EASE = { tiger: 0, archer: 1, vanguard: 2, plume: 3, yulin: 4 };

/** The stages of a run for a chosen regiment. */
export function planRoad(regiment) {
  if (!REGIMENTS[regiment]) throw Error('Unknown regiment ' + regiment);
  const others = ORDER.filter((r) => r !== regiment).sort((a, b) => EASE[a] - EASE[b]);
  const stages = others.map((foe, i) => ({ index: i, place: PLACES[i], foes: [foe], level: [0.3, 0.42, 0.54, 0.64][i] }));
  // The last fight: two at once, one who closes in and one who keeps away when there is a bow among them.
  const pair = others.includes('archer') ? [others.filter((r) => r !== 'archer').at(-1), 'archer'] : [others.at(-1), others.at(-2)];
  stages.push({ index: 4, place: 'palace', foes: pair, level: 0.36, double: true, health: 0.65 });
  return stages;
}

/** Score one won stage: quicker, cleaner and more deflections are better. */
export function stageScore({ time, taken, deflects, broken, healthLeft }) {
  // Bouts run long with the game's health (a minute is usual), so time counts only past that.
  return Math.max(0, Math.round(1000 + healthLeft * 1200 + deflects * 120 + broken * 80 - taken * 20 - Math.max(0, time - 60) * 5));
}

/** The mark for a run from its stage scores. */
export function grade(scores) {
  const mean = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);
  return mean >= 2000 ? 'jia' : mean >= 1500 ? 'yi' : mean >= 1000 ? 'bing' : 'ding';
}
