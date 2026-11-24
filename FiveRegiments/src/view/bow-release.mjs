// Match the projectile beats in fight.mjs. This only poses the bow and never launches an arrow.
const SPREAD = { release: 0.42, raised: 0.15, drawn: 0.3, strength: 0.94, relaxed: 0.59, settled: 0.475, lower: 0.49, end: 0.8 };
const SHOTS = {
  fan: { ...SPREAD, draw: 0.04 },
  gale: { ...SPREAD, draw: 0.09 },
  backStep: { release: 0.26, raised: 0.1, draw: 0.012, drawn: 0.19, strength: 0.97, relaxed: 0.4, settled: 0.309, lower: 0.33, end: 0.58 },
  blast: { release: 0.55, raised: 0.2, draw: 0.105, drawn: 0.44, strength: 1, relaxed: 0.78, settled: 0.612, lower: 0.63, end: 0.9 },
  web: { release: 0.36, raised: 0.14, draw: 0.055, drawn: 0.27, strength: 0.88, relaxed: 0.54, settled: 0.412, lower: 0.42, end: 0.7 }
};
const VOLLEY_BEATS = [0.25, 0.45, 0.65];

const span = (t, begin, end) => {
  const u = Math.max(0, Math.min(1, (t - begin) / (end - begin)));
  return u * u * (3 - 2 * u);
};

function volleyPose(t) {
  const next = VOLLEY_BEATS.findIndex((beat) => t < beat);
  const lift = span(t, 0, 0.13) * (1 - span(t, 0.72, 0.98));
  if (next === 0) {
    return { loaded: true, lift, pull: 0.95 * span(t, 0.02, 0.18), string: 1 };
  }

  const beat = next < 0 ? VOLLEY_BEATS.at(-1) : VOLLEY_BEATS[next - 1];
  const recoil = 1 - span(t, beat, beat + 0.046);
  if (next < 0) {
    return { loaded: false, lift, pull: 0.95 * (1 - span(t, beat, 0.87)), string: recoil };
  }

  // Reload between shots, after the string has sprung forward and before the next live release.
  const release = VOLLEY_BEATS[next];
  const nock = release - 0.122;
  const redraw = span(t, nock, release - 0.034);
  return {
    loaded: t >= nock,
    lift,
    pull: 0.24 + 0.71 * Math.max(1 - span(t, beat, beat + 0.069), redraw),
    string: Math.max(recoil, redraw)
  };
}

export function bowReleasePose(act) {
  if (act?.kind !== 'skill') return null;
  const { id, t } = act;
  if (id === 'volley') return volleyPose(t);
  if (!Object.hasOwn(SHOTS, id)) return null;
  const { release, raised, draw, drawn, strength, relaxed, settled, lower, end } = SHOTS[id];
  return {
    loaded: t < release,
    lift: span(t, 0, raised) * (1 - span(t, lower, end)),
    pull: strength * span(t, draw, drawn) * (1 - span(t, release, relaxed)),
    string: 1 - span(t, release, settled)
  };
}
