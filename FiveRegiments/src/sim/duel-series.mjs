import { PLACES } from './road.mjs';

export function planDuelSeries(firstPlace, opponent, level = 0.5) {
  const start = Math.max(0, PLACES.indexOf(firstPlace));
  return [0, 1, 2].map(index => ({ index, place: PLACES[(start + index) % PLACES.length], foes: [opponent], level }));
}

export function seriesStanding(wins = 0, losses = 0) {
  return { wins, losses, finished: wins >= 2 || losses >= 2 };
}

export function recordDuelRound(standing, won) {
  if (standing.finished) return standing;
  return seriesStanding(standing.wins + Number(won), standing.losses + Number(!won));
}
