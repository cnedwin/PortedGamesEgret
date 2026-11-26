// A small, optional appointment for new terms. This module never changes the
// calendar, affection or resources; the ordinary simulation owns those effects.
// Missing state stays missing so existing saves do not acquire a new invitation.
export const FIRST_EVENING = {
  girl: 'linxia',
  place: 'gate',
  slot: 2,
  title: ['林夏的消息', 'A message from Lin Xia'],
  time: ['傍晚至夜晚', 'Evening or night'],
  venue: ['樱花道', 'Cherry-tree Walk'],
  task: ['帮林夏给夜跑计时', 'Time one lap for Lin Xia'],
  message: [
    '傍晚有空嗎？我想去櫻花道慢跑。能幫我按碼錶嗎？不比成績，跑完一起走走。',
    'Free this evening? I would like a relaxed lap along the cherry-tree walk. Could you time it for me? No chasing records. We can take a walk afterwards.',
  ],
};

/** Called only when creating a new term, never to repair an older save. */
export const freshFirstEvening = () => ({
  version: 1,
  invited: false,
  day: null,
  read: false,
  noticeTaken: false,
  completed: false,
  playback: null,
});

const stateFor = s => s?.firstEvening?.version === 1 ? s.firstEvening : null;
const checkpointFor = q => q?.playback?.id === 'first-evening' && q.playback.done && q.playback.choices
  && typeof q.playback.done === 'object' && !Array.isArray(q.playback.done)
  && typeof q.playback.choices === 'object' && !Array.isArray(q.playback.choices) ? q.playback : null;

/** The first completed routine action anchors the offer to its actual day. */
export function offerFirstEvening(s) {
  const q = stateFor(s);
  if (!q || q.invited || s.finale || !Number.isInteger(s.day) || s.day < 1) return false;
  q.invited = true;
  q.day = s.day;
  return true;
}

/** Read-only projection, including the history of completed or missed invites. */
export function firstEveningStatus(s) {
  const q = stateFor(s);
  if (!q?.invited || !Number.isInteger(q.day) || q.day < 1) return null;
  const phase = q.completed ? 'completed' : s.day > q.day ? 'missed'
    : s.day === q.day && s.slot >= FIRST_EVENING.slot ? 'ready' : 'upcoming';
  return { day: q.day, phase, read: Boolean(q.read), resumable: phase === 'ready' && Boolean(checkpointFor(q)) };
}

export function markFirstEveningRead(s) {
  const q = stateFor(s);
  if (!q?.invited || q.read) return false;
  q.read = true;
  return true;
}

/** Consumed once; the acknowledgement is part of the normal serialized save. */
export function takeFirstEveningNotice(s) {
  const q = stateFor(s);
  if (!q?.invited || q.noticeTaken) return false;
  q.noticeTaken = true;
  return true;
}

/** Starting the story acknowledges the message and reuses any paused cursor. */
export function beginFirstEvening(s) {
  if (firstEveningStatus(s)?.phase !== 'ready') return null;
  const q = stateFor(s);
  q.read = true;
  q.playback = checkpointFor(q) ?? { id: 'first-evening', done: {}, choices: {}, cursor: null };
  return q.playback;
}

/** The caller grants any one-time effect only when this returns true. */
export function finishFirstEvening(s) {
  const q = stateFor(s);
  if (firstEveningStatus(s)?.phase !== 'ready' || !checkpointFor(q)) return false;
  q.completed = true;
  q.playback = null;
  return true;
}

/** The UI supplies its own “today” context; history retains the original day. */
export function firstEveningTime(status) {
  if (!status || !Number.isInteger(status.day) || status.day < 1) return null;
  return [`第${status.day}天 · 傍晚至夜晚`, `Day ${status.day} · Evening or night`];
}

export function firstEveningAction(status) {
  if (status?.phase === 'upcoming') return ['等到傍晚赴约', 'Wait until evening and meet'];
  if (status?.phase !== 'ready') return null;
  return status.resumable ? ['继续赴约', 'Resume the meeting'] : ['赴约', 'Go to the meeting'];
}
