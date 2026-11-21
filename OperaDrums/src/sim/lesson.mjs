import { timeAt } from './chart.mjs';

export const LESSON_SONG = { id: 'lesson', bpm: 96 };
export const LESSON_STEPS = [
  { beat: 4, skill: 'drum' },
  { beat: 8, skill: 'gong' },
  { beat: 12, skill: 'double' },
  { beat: 16, skill: 'roll' }
];

export const LESSON_CLICKS = 23;

/** The backing is the same clapper the player will hear in the calibration and the formal charts. */
export function buildLesson() {
  const beatSeconds = 60 / LESSON_SONG.bpm;
  const pattern = [
    [4, 'drum'], [5, 'drum'], [6, 'drum'], [7, 'drum'],
    [8, 'gong'], [9, 'gong'], [10, 'gong'], [11, 'gong'],
    [12, 'gong', true], [14, 'gong', true],
    [16, 'drum', false, 4]
  ];
  const notes = pattern.map(([beat, kind, big = false, duration = 0], index) => ({
    index, beat, t: timeAt(LESSON_SONG, beat), kind, big,
    roll: duration * beatSeconds,
    syllable: duration ? '\u561f' : big ? '\u4ed3' : kind === 'drum' ? '\u516b' : '\u53f0'
  }));
  return {
    song: LESSON_SONG.id, difficulty: 'easy', bpm: LESSON_SONG.bpm,
    notes, beats: 21, end: timeAt(LESSON_SONG, 21)
  };
}

/** Give the player the next cue slightly before its first note reaches the timing line. */
export function lessonStepAt(seconds) {
  const nextBeat = (seconds - timeAt(LESSON_SONG, 0)) * LESSON_SONG.bpm / 60 + 0.85;
  return Math.max(0, LESSON_STEPS.findLastIndex((step) => step.beat <= nextBeat));
}
