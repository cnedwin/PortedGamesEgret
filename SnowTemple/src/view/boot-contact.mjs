import { quatMultiply, quatNormalize, vec3TransformQuat } from '@egret/engine/world3d';
import { JOINTS } from './rig.mjs';

// Keep the measured heel-to-toe roll while holding the boot over the ground contact.
const heel = [0, -.073, -.052], toe = [0, -.073, .15], sole = [0, -.073, .055];
const thigh = -JOINTS.shinL[2], calf = -JOINTS.footL[2];
const centre = [0, 0, 0], end = [0, 0, 0], knee = [0, 0, 0];
const desired = [0, 0, 0], current = [0, 0, 0], axis = [0, 0, 0];
const ankleRotation = [0, 0, 0, 1], correction = [0, 0, 0, 1], inverse = [0, 0, 0, 1];
const thighDown = [0, -thigh, 0], calfDown = [0, -calf, 0];
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const smooth = value => value * value * (3 - 2 * value);

function alignBone(joint, from, to, length) {
  const factor = 1 / (length * length);
  correction[0] = (from[1] * to[2] - from[2] * to[1]) * factor;
  correction[1] = (from[2] * to[0] - from[0] * to[2]) * factor;
  correction[2] = (from[0] * to[1] - from[1] * to[0]) * factor;
  correction[3] = 1 + (from[0] * to[0] + from[1] * to[1] + from[2] * to[2]) * factor;
  quatNormalize(correction, correction);
  quatMultiply(correction, correction, joint.quaternion);
  joint.setQuaternion(...correction);
}

function invert(out, q) {
  out[0] = -q[0];
  out[1] = -q[1];
  out[2] = -q[2];
  out[3] = q[3];
}

function positionAnkle(leg, shin, foot) {
  const maximum = thigh + calf - .007;
  // Yield horizontal lock before lifting a boot to chase an unreachable point.
  end[1] = clamp(end[1], -maximum, maximum);
  const lateral = Math.hypot(end[0], end[2]);
  const nearGround = Math.max(0, Math.abs(end[1]) - .028);
  const width = Math.sqrt(maximum * maximum - nearGround * nearGround);
  if (lateral > width) {
    end[0] *= width / lateral;
    end[2] *= width / lateral;
  }
  const far = Math.hypot(...end);
  if (far < .01) return;
  const reach = clamp(far, Math.abs(thigh - calf) + .01, maximum);
  vec3TransformQuat(current, thighDown, leg.quaternion);
  for (let i = 0; i < 3; i++) axis[i] = end[i] / far;
  const forward = current[0] * axis[0] + current[1] * axis[1] + current[2] * axis[2];
  for (let i = 0; i < 3; i++) knee[i] = current[i] - axis[i] * forward;
  const side = Math.hypot(...knee);
  if (side < .005) return; // Use the captured knee plane, and skip nearly straight legs.
  const along = (thigh * thigh - calf * calf + reach * reach) / (2 * reach);
  const bend = Math.sqrt(Math.max(0, thigh * thigh - along * along)) / side;
  for (let i = 0; i < 3; i++) {
    knee[i] = axis[i] * along + knee[i] * bend;
    desired[i] = axis[i] * reach - knee[i];
  }
  quatMultiply(ankleRotation, leg.quaternion, shin.quaternion);
  quatMultiply(ankleRotation, ankleRotation, foot.quaternion);
  alignBone(leg, current, knee, thigh);
  invert(inverse, leg.quaternion);
  vec3TransformQuat(desired, desired, inverse);
  vec3TransformQuat(current, calfDown, shin.quaternion);
  alignBone(shin, current, desired, calf);
  quatMultiply(correction, leg.quaternion, shin.quaternion);
  invert(inverse, correction);
  quatMultiply(correction, inverse, ankleRotation);
  foot.setQuaternion(...correction);
}

/** A short-lived ground anchor for each half of the captured stride. */
export function groundBoots(joints, plants, target) {
  const stride = target.boots;
  for (const side of ['L', 'R']) {
    const plant = plants[side], contact = stride ? target['contact' + side] : 0;
    if (contact < .33) {
      plant.active = false;
      continue;
    }
    const leg = joints['leg' + side], shin = joints['shin' + side], foot = joints['foot' + side];
    foot.localToWorld(centre, sole);
    if (!plant.active) {
      plant.active = true;
      plant.face = stride.face;
      plant.x = centre[0] + Math.sin(stride.face) * stride.lead;
      plant.z = centre[2] + Math.cos(stride.face) * stride.lead;
    }
    const turn = 1 - smooth(clamp((1 - Math.cos(plant.face - stride.face)) / .55, 0, 1));
    const dx = plant.x - centre[0], dz = plant.z - centre[2], drift = Math.hypot(dx, dz);
    const grip = smooth(clamp((contact - .33) / .44, 0, 1)) * turn;
    // Turning or repositioning can put the old anchor outside the leg's reach.
    const lock = grip * (1 - smooth(clamp((drift - .25) / .20, 0, 1)));
    const floor = Math.min(foot.localToWorld(end, heel)[1], foot.localToWorld(end, toe)[1]);
    foot.getWorldPosition(end);
    end[0] += dx * lock;
    end[1] -= floor * grip;
    end[2] += dz * lock;
    joints.hips.worldToLocal(end, end);
    for (let i = 0; i < 3; i++) end[i] -= leg.position[i];
    positionAnkle(leg, shin, foot);
  }
}
