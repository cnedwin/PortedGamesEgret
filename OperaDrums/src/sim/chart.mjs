// 谱面：把一首曲子按难度排成一串音符，每个音符有时间（秒）、拍、种类（鼓 / 锣）、是不是大音符、滚奏多长和它的字。
// 易只留正拍上的；中按谱面原样，但不留比半拍更碎的；难把过门换成繁一些的，并在半拍空处补一下鼓。
// The chart: a song laid out as notes for a difficulty, each with its time in seconds, its beat, its kind (drum or
// gong), whether it is big, how long a roll lasts, and its syllable. Easy keeps the strokes on the beat; normal keeps
// the score as written but nothing finer than half a beat; hard has the busier bridge, and a drum stroke in each
// half-beat rest.
import { CELLS, FILL, LIGHT, REST, SONGS, SYLLABLES, beatsOf, strokesOf } from './songs.mjs';

/** Seconds of quiet before the count-in, and beats of count-in (the clapper alone) before the first note. */
export const LEAD = { seconds: 1.5, beats: 4 };

const onGrid = (beat, step) => Math.abs(beat / step - Math.round(beat / step)) < 1e-6;

/** The song with id `id`. */
export const songOf = (id) => SONGS.find((song) => song.id === id) ?? SONGS[0];

/**
 * The timeline of a song: each section with the beat it starts on, and the total beats. The view and the music use
 * it to know where the bridges are.
 */
export function timelineOf(song) {
  const out = [];
  let beat = LEAD.beats;
  for (const [cell, times] of song.sections)
    for (let i = 0; i < times; i++) {
      out.push({ cell, beat, beats: beatsOf(cell) });
      beat += beatsOf(cell);
    }
  return { sections: out, beats: beat };
}

/** Seconds at `beat` of `song`. */
export const timeAt = (song, beat) => LEAD.seconds + (beat * 60) / song.bpm;

/** The notes of `song` on `difficulty` (`easy`, `normal` or `hard`), in time order. */
export function buildChart(song, difficulty = 'normal') {
  const notes = [];
  const { sections, beats } = timelineOf(song);
  for (const section of sections) {
    const cell = difficulty === 'hard' && section.cell === 'guomen' ? 'guomenHard' : section.cell;
    let at = 0;
    for (const stroke of strokesOf(cell)) {
      const beat = section.beat + at;
      let syllable = stroke.syllable;
      at += stroke.beats;
      if (syllable === REST) {
        // Hard fills a half-beat rest with a drum stroke; other rests stay empty.
        if (difficulty === 'hard' && stroke.beats === 0.5) syllable = FILL;
        else continue;
      }
      const spec = SYLLABLES[syllable];
      if (difficulty === 'easy' && !spec.roll && (!onGrid(section.beat + at - stroke.beats, 1) || syllable === LIGHT)) continue;
      if (difficulty === 'normal' && !onGrid(beat, 0.5)) continue;
      notes.push({
        beat,
        t: timeAt(song, beat),
        kind: spec.kind,
        big: Boolean(spec.big),
        roll: spec.roll ? (stroke.beats * 60) / song.bpm : 0,
        syllable
      });
    }
  }
  notes.forEach((note, index) => (note.index = index));
  return { song: song.id, difficulty, bpm: song.bpm, notes, beats, end: timeAt(song, beats) + 1.5 };
}

/** Notes a second, over the part of the song that has notes. */
export function densityOf(chart) {
  const { notes } = chart;
  if (notes.length < 2) return 0;
  return notes.length / (notes.at(-1).t - notes[0].t);
}

export { CELLS };
