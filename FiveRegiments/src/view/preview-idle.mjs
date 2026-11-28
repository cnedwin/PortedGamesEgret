// The title's figures are a display, not a running match. Keep their clock separate
// so pauses, screenshots and gameplay never inherit presentation time.
export function createPreviewIdleClock() {
  let time = 0;
  return {
    update(dt, { playing = true, still = false } = {}) {
      if (still) {
        time = 0;
        return undefined;
      }
      if (playing && Number.isFinite(dt) && dt > 0) time += dt;
      return time;
    }
  };
}

export function previewIdleOffset(id) {
  let hash = 2166136261;
  for (const ch of String(id)) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  return ((hash >>> 0) % 997) / 997;
}

// Only the expressive upper-body portion of the already authored idle capture is
// layered over the established display pose. Feet, pelvis and hip translation
// are not part of this mask; the selected model still stands in its original spot.
const maskWeights = Object.freeze({
  spine_01: .6, spine_03: .85, spine_05: 1, neck_01: .6, head: .65
});

export function createPreviewIdleSampler(motion, sampleLoop, id) {
  const mask = motion.bones.map(name => maskWeights[name] ?? 0);
  const layer = motion.pose();
  const duration = motion.duration('idle');
  const offset = previewIdleOffset(id) * duration;
  return (baselineTime, displayTime, out) => {
    sampleLoop('idle', baselineTime, out, false);
    if (!Number.isFinite(displayTime) || displayTime <= 0) return out;
    // Fade in from the exact existing pose, with asynchronous phases for the
    // five figures and a closed neutral loop rather than a seam every few seconds.
    const t = Math.min(1, displayTime / .35);
    const weight = .4 * t * t * (3 - 2 * t);
    sampleLoop('idle', baselineTime + offset + displayTime * .8, layer, true);
    motion.blend(out, layer, weight, mask);
    return out;
  };
}
