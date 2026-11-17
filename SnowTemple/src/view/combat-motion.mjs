import { actionJoints, captures, samplesPerSegment } from './combat-motion-data.mjs';

const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;

/** Map the captured preparation, impact and follow-through to game time. */
export function attackTiming(windup, active, recover, contact = windup) {
  return [0, contact * .56, contact, windup + active, windup + active + recover];
}

/** Five increasing game times correspond to the five selected capture markers. */
export function sampleCombat(name, time, marks, out = {}) {
  const { frames } = captures[name];
  let segment = 0;
  while (segment < 3 && time > marks[segment + 1]) segment++;
  const progress = clamp((time - marks[segment]) / (marks[segment + 1] - marks[segment]));
  const index = (segment + progress) * samplesPerSegment, first = Math.floor(index);
  const from = frames[first], to = frames[Math.min(first + 1, frames.length - 1)], part = index - first;
  let channel = 0;
  const interpolate = () => {
    const v = mix(from[channel], to[channel], part);
    channel++;
    return v;
  };
  out.phase = (segment + progress) * .25;
  out.lift = interpolate();
  for (const joint of actionJoints) {
    const angles = out[joint] ??= [0, 0, 0];
    for (let axis = 0; axis < 3; axis++) angles[axis] = interpolate();
  }
  return out;
}

const transfer = {
  hips: .94, spine: .82, head: .65,
  legL: .86, legR: .86, shinL: .84, shinR: .84, footL: .86, footR: .86,
  armL: .70, foreL: .54, armR: .65, foreR: .48
};

/** Retarget the weight transfer without overriding the game-authored weapon line. */
export function applyCombatBody(target, sample, blend) {
  target.lift = mix(target.lift ?? 0, sample.lift, blend * .86);
  for (const name of actionJoints) {
    const destination = target[name];
    const source = sample[name];
    for (let axis = 0; axis < 3; axis++) destination[axis] = mix(destination[axis], source[axis], blend * transfer[name]);
  }
  return target;
}
