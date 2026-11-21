import { SCORE } from './judge.mjs';

// A compact fourth score for the optional challenge. The normal scorebook remains separate.
export const ENCORE_SONG = {
  id: 'encore',
  bpm: 128,
  seed: 53,
  sections: [
    ['duotou', 1], ['choutou', 1], ['guomen', 2],
    ['chongtou', 2], ['sibian', 1], ['gudian', 1],
    ['jijifeng', 3], ['jijifengEnd', 1], ['chongtou', 3],
    ['sibian', 1], ['sijitou', 1]
  ]
};

export const ENCORE_POWER = Object.freeze({ capacity: 8, seconds: 7 });

export function createEncore() {
  return { charge: 0, activeUntil: 0, rallies: 0, bonus: 0, missed: 0, lastBigPoints: 0 };
}

/** Apply the challenge bonus after ordinary judging. Pass null after advance() to observe missed notes and the clock. */
export function updateEncore(state, result, run, time) {
  const missed = run.counts.miss;
  const broke = missed > state.missed;
  const expired = state.activeUntil !== 0 && time >= state.activeUntil;
  const type = result?.type;
  if (!broke && !expired && (!type || type === 'empty')) return { state, award: 0, activated: false };

  let { charge, activeUntil, rallies, bonus, lastBigPoints } = state;
  if (broke) {
    charge = 0;
    lastBigPoints = 0;
  }
  if (broke || expired) activeUntil = 0;
  let points = 0;
  let activated = false;
  if (type === 'judged') {
    points = SCORE[result.judgement] ?? 0;
    lastBigPoints = result.note.big ? points : 0;
    if (!activeUntil && points > 0) {
      const gain = result.judgement === 'great' ? 2 : 1;
      charge = Math.min(ENCORE_POWER.capacity, charge + gain);
    }
  } else if (type === 'double') {
    points = lastBigPoints;
    lastBigPoints = 0;
    if (points > 0 && charge === ENCORE_POWER.capacity && !activeUntil) {
      activated = true;
      activeUntil = time + ENCORE_POWER.seconds;
      rallies++;
      charge = 0;
      // The preceding hand already scored. Double both halves of the triggering gong.
      points *= 2;
    }
  } else if (type === 'roll') {
    points = SCORE.roll;
  }

  const award = activeUntil > time ? points : 0;
  bonus += award;
  return { state: { charge, activeUntil, rallies, bonus, missed, lastBigPoints }, award, activated };
}
