import { clips, gaitJoints } from './locomotion-data.mjs';

/** Measured stride length and duration for a full left-foot-to-left-foot cycle. */
export const LOCOMOTION = Object.freeze(Object.fromEntries(Object.entries(clips).map(([name, clip]) => [name, Object.freeze({
  sourceHz: clip.sourceHz,
  sourceFrames: Object.freeze(clip.sourceFrames),
  duration: clip.duration,
  strideMeters: clip.strideMeters
})])));

/**
 * Sample the pose at the given phase in cycles. Phase 0 starts the left plant and .5 the right plant.
 * Joint fields are local XYZ Euler radians. `lift` is a vertical hip offset in metres.
 * `contactL/R` are [0, 1] weights following the plants and toe-offs in the capture.
 */
export function sampleLocomotion(kind, phase, out = {}) {
  if (!Object.hasOwn(clips, kind) || !Number.isFinite(phase)) throw new RangeError('Unknown locomotion clip or invalid phase');
  const { frames } = clips[kind];
  const position = (phase - Math.floor(phase)) * frames.length;
  const lower = Math.floor(position);
  const index = lower % frames.length;
  const from = frames[index], to = frames[(index + 1) % frames.length];
  const fraction = position - lower;
  const sample = channel => from[channel] + (to[channel] - from[channel]) * fraction;
  out.lift = sample(0);
  out.contactL = sample(1);
  out.contactR = sample(2);
  let channel = 3;
  for (const joint of gaitJoints) {
    const angles = out[joint] ??= [0, 0, 0];
    for (let axis = 0; axis < 3; axis++) angles[axis] = sample(channel++);
  }
  return out;
}
