// 判定：一次击打对上哪个音符、准不准（好 / 可 / 失）、连击、得分和「彩」槽。时间一律是曲子里的秒数，由调用者给，
// 这里不读时钟、不碰页面也不碰引擎，所以可以在 Node 里拿电脑玩家整首整首地打。
// Judging: which note a stroke meets, how true it is (great, good or a miss), the combo, the score and the cheer
// gauge. Every time is seconds into the song, given by the caller; nothing here reads a clock or touches the page or
// the engine, so whole songs can be played in Node by a computer player.

/** How far off a stroke may be, in seconds: within `great` is great, within `ok` good, within `miss` a miss. */
export const WINDOW = { great: 0.045, ok: 0.1, miss: 0.135 };
/** Seconds within which the second hand on a big note doubles it. */
export const DOUBLE = 0.05;
export const SCORE = { great: 300, ok: 150, roll: 100, comboStep: 10, comboEvery: 10, comboMost: 100 };
/** The cheer gauge to clear a song, out of 100, by difficulty. */
export const CLEAR = { easy: 60, normal: 70, hard: 70 };
/** The ranks, worst to best. */
export const RANKS = ['fail', 'clear', 'fullCombo', 'perfect'];

/** A new run of `chart`. */
export function createRun(chart) {
  const counted = chart.notes.filter((note) => !note.roll).length;
  return {
    chart,
    next: 0,
    judged: new Set(),
    counts: { great: 0, ok: 0, miss: 0 },
    combo: 0,
    maxCombo: 0,
    score: 0,
    rolls: 0,
    doubles: 0,
    gauge: 0,
    unit: counted ? 100 / (0.75 * counted) : 0,
    lastBig: null,
    time: 0,
    done: false
  };
}

function judgeNote(run, note, judgement) {
  run.judged.add(note.index);
  run.counts[judgement]++;
  const easy = run.chart.difficulty === 'easy';
  if (judgement === 'miss') {
    run.combo = 0;
    run.gauge = Math.max(0, run.gauge - run.unit * (easy ? 1 : 2));
  } else {
    run.combo++;
    run.maxCombo = Math.max(run.maxCombo, run.combo);
    const bonus = Math.min(SCORE.comboMost, Math.floor(run.combo / SCORE.comboEvery) * SCORE.comboStep);
    run.score += SCORE[judgement] + bonus;
    run.gauge = Math.min(100, run.gauge + run.unit * (judgement === 'great' ? 1 : 0.5));
  }
  while (run.next < run.chart.notes.length && (run.judged.has(run.next) || run.chart.notes[run.next].roll)) run.next++;
}

/** The roll being played at `time`, if any. */
export function rollAt(run, time) {
  for (let i = Math.max(0, run.next - 4); i < run.chart.notes.length; i++) {
    const note = run.chart.notes[i];
    if (note.t > time) break;
    if (note.roll && time < note.t + note.roll - 1e-6) return note;
  }
  return null;
}

/**
 * A stroke of `kind` (`drum` or `gong`) at `time`, by `hand` (any name for the key or finger, so two hands on a big
 * note can be told apart). Returns what it was: `{ type: 'judged', judgement, note }`, `{ type: 'double', note }`,
 * `{ type: 'roll', note }` or `{ type: 'empty' }`.
 */
export function strike(run, kind, time, hand = kind) {
  if (run.done) return { type: 'empty' };
  // The second hand on a big note just struck doubles it and is not a stroke of its own.
  const big = run.lastBig;
  if (big && big.kind === kind && big.hand !== hand && time - big.time <= DOUBLE) {
    run.lastBig = null;
    run.doubles++;
    run.score += SCORE[big.judgement];
    return { type: 'double', note: big.note };
  }
  // The first note not yet judged, if this stroke is near enough to count for it.
  let note = null;
  for (let i = run.next; i < run.chart.notes.length; i++) {
    const candidate = run.chart.notes[i];
    if (candidate.t - time > WINDOW.miss) break;
    if (candidate.roll || run.judged.has(i)) continue;
    if (Math.abs(candidate.t - time) <= WINDOW.miss) {
      note = candidate;
      break;
    }
  }
  // Inside a roll, strokes belong to the roll until it ends, even with the next note near.
  const roll = rollAt(run, time);
  if (roll && (!note || note.t >= roll.t + roll.roll - 1e-9)) {
    run.rolls++;
    run.score += SCORE.roll;
    return { type: 'roll', note: roll };
  }
  if (note) {
    const off = Math.abs(note.t - time);
    // The wrong hand, or too far off, is a miss; struck early in the outer window, it is a miss too.
    const judgement = note.kind !== kind ? (off <= WINDOW.ok ? 'miss' : null) : off <= WINDOW.great ? 'great' : off <= WINDOW.ok ? 'ok' : 'miss';
    if (judgement) {
      judgeNote(run, note, judgement);
      run.lastBig = note.big && judgement !== 'miss' ? { note, kind, hand, time, judgement } : null;
      return { type: 'judged', judgement, note, off: time - note.t };
    }
  }
  return { type: 'empty' };
}

/** Time moves to `time`: every note now too far behind is a miss. Returns the notes missed. */
export function advance(run, time) {
  run.time = time;
  const missed = [];
  while (run.next < run.chart.notes.length) {
    const note = run.chart.notes[run.next];
    if (note.roll || run.judged.has(note.index)) {
      run.next++;
      continue;
    }
    if (time - note.t <= WINDOW.miss) break;
    judgeNote(run, note, 'miss');
    missed.push(note);
  }
  if (time >= run.chart.end) run.done = true;
  return missed;
}

/** How a finished run did. */
export function resultOf(run) {
  const { counts } = run;
  const cleared = run.gauge >= CLEAR[run.chart.difficulty];
  const rank = !cleared ? 'fail' : counts.miss === 0 && counts.ok === 0 ? 'perfect' : counts.miss === 0 ? 'fullCombo' : 'clear';
  return { rank, cleared, score: run.score, maxCombo: run.maxCombo, gauge: run.gauge, counts: { ...counts }, rolls: run.rolls, doubles: run.doubles };
}

/** Whether rank `a` is better than rank `b`. */
export const betterRank = (a, b) => RANKS.indexOf(a) > RANKS.indexOf(b);
