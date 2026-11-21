// Feedback observes the timing judge without changing what counts as a hit or a miss.
const EXPLAIN_WINDOW = 0.25;

function timingOffset(off) {
  return { key: off < 0 ? 'timingEarly' : 'timingLate', n: Math.abs(Math.round(1000 * off)) };
}

export function explainStrike(result, kind, time, next, lastMissed) {
  if (result.type === 'judged') {
    if (kind !== result.note.kind) return { key: result.note.kind === 'drum' ? 'timingUseDrum' : 'timingUseGong' };
    return result.judgement === 'great' ? { key: 'timingExact' } : timingOffset(result.off);
  }
  if (result.type === 'double') return { key: 'timingDouble' };
  if (result.type === 'roll') return { key: 'timingRoll' };
  if (result.type !== 'empty') return null;

  const early = next?.kind === kind && !next.roll && next.t > time ? time - next.t : -Infinity;
  const late = lastMissed?.kind === kind && !lastMissed.roll && lastMissed.t <= time ? time - lastMissed.t : Infinity;
  const off = -early <= late ? early : late;
  return Math.abs(off) <= EXPLAIN_WINDOW ? timingOffset(off) : null;
}
