// A visual envelope for the existing fan/gale projectile beat. It leaves skill timing and aim to the fight.
const RELEASE = 0.42;
const span = (t, begin, end) => {
  const u = Math.max(0, Math.min(1, (t - begin) / (end - begin)));
  return u * u * (3 - 2 * u);
};

export function bowReleasePose(act) {
  if (act?.kind !== 'skill' || !['fan', 'gale'].includes(act.id)) return null;
  const { t } = act;
  const loaded = t < RELEASE;
  return {
    loaded,
    lift: span(t, 0, 0.15) * (1 - span(t, 0.49, 0.8)),
    pull: 0.94 * span(t, act.id === 'gale' ? 0.09 : 0.04, 0.3) * (1 - span(t, RELEASE, 0.59)),
    string: 1 - span(t, RELEASE, 0.475)
  };
}
