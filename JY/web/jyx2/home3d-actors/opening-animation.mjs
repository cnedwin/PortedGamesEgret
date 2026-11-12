const openingActions = new Map([
  ['-1:6890:6932', 'wake'],
  ['-1:6934:6986', 'inspect'],
  ['-1:6988:7000', 'look'],
  ['1:6820:6860', 'appear'],
  ['1:6862:6888', 'address'],
]);

export function homeOpeningAnimation(animation) {
  if (!animation) return;
  const { action, progress, target, from, to, picture } = animation;
  if (typeof action === 'string' && Number.isFinite(progress)) return { action, progress };
  const name = openingActions.get(`${target}:${from}:${to}`);
  if (!name || !Number.isFinite(picture)) return;
  const raw = picture < from && picture * 2 >= from && picture * 2 <= to ? picture * 2 : picture;
  return { action: name, progress: Math.max(0, Math.min(1, (raw - from) / (to - from))) };
}
