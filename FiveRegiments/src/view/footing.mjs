import { add, axisAngle, dot, fromTo, len, lerp3, mul, qinv, qmul, qrot, slerp, sub, unit } from './rig.mjs';

const UP = [0, 1, 0];
const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** A short-lived world-space contact for a foot supporting a planted attack or guard. */
export function createFooting(rig) {
  const legs = ['l', 'r'].map((side) => {
    const hip = 'thigh_' + side, knee = 'calf_' + side, ankle = 'foot_' + side, ball = 'ball_' + side;
    return {
      hip, knee, ankle, ball,
      thigh: len(sub(rig.world(knee).t, rig.world(hip).t)),
      shin: len(sub(rig.world(ankle).t, rig.world(knee).t))
    };
  });
  const up = rig.dirToRig(UP);
  const forward = rig.dirToRig([0, 0, 1]);
  let stance = null;
  let previousYaw = null;
  let weight = 0;

  function solve(leg, ballTarget, ankleRotation) {
    const hip = rig.world(leg.hip);
    const knee = rig.world(leg.knee);
    const ankle = rig.world(leg.ankle);
    const ball = rig.world(leg.ball);
    const ballOffset = qrot(qinv(ankle.r), sub(ball.t, ankle.t));
    const rotation = slerp(ankle.r, ankleRotation, weight);
    const desired = sub(lerp3(ball.t, ballTarget, weight), qrot(rotation, ballOffset));
    const reach = sub(desired, hip.t);
    const distance = len(reach);
    if (distance < 1e-5) return;
    const dir = mul(reach, 1 / distance);
    const d = Math.max(Math.abs(leg.thigh - leg.shin) + 1e-4, Math.min(leg.thigh + leg.shin - 1e-4, distance));
    const kneeAlong = (leg.thigh ** 2 - leg.shin ** 2 + d * d) / (2 * d);
    const kneeOut = Math.sqrt(Math.max(0, leg.thigh ** 2 - kneeAlong ** 2));
    const original = sub(knee.t, hip.t);
    const bend = sub(original, mul(dir, dot(original, dir)));
    const fallback = sub(forward, mul(dir, dot(forward, dir)));
    const pole = unit(len(bend) > 1e-5 ? bend : fallback);
    const kneeGoal = add(mul(dir, kneeAlong), mul(pole, kneeOut));
    rig.setWorld(leg.hip, qmul(fromTo(original, kneeGoal), hip.r));
    const nextKnee = rig.world(leg.knee);
    const nextAnkle = rig.world(leg.ankle);
    const ankleGoal = add(hip.t, mul(dir, d));
    rig.setWorld(leg.knee, qmul(fromTo(sub(nextAnkle.t, nextKnee.t), sub(ankleGoal, nextKnee.t)), nextKnee.r));
    rig.setWorld(leg.ankle, rotation);
  }

  return function plant({ x, z, yaw, lift, dt, speed, active, grounded }) {
    const turn = previousYaw === null || dt <= 0 ? 0 : Math.abs(wrap(yaw - previousYaw)) / dt;
    previousYaw = yaw;
    if (!grounded) {
      stance = null;
      weight = 0;
      return;
    }
    const origin = [x, lift, z];
    const facing = axisAngle(UP, yaw);
    const canPlant = active && speed < 0.23 && turn < 1.25;
    if (!stance && canPlant) {
      const samples = legs.map((leg) => rig.toBody(rig.world(leg.ball).t));
      const base = Math.min(samples[0][1], samples[1][1]);
      const contacts = legs.flatMap((leg, i) => {
        const p = samples[i];
        if (p[1] - base > 0.045) return [];
        const at = add(origin, qrot(facing, p));
        at[1] = Math.max(0, at[1]);
        return [{ leg, at, rotation: rig.world(leg.ankle).r }];
      });
      stance = { x, z, yaw, contacts };
    }
    if (!stance) return;
    const angle = wrap(stance.yaw - yaw);
    const hold = canPlant && Math.abs(angle) < 0.24 && Math.hypot(x - stance.x, z - stance.z) < 0.075;
    weight += ((hold ? 1 : 0) - weight) * (1 - Math.exp(-dt * (hold ? 32 : 40)));
    if (weight < 0.015 && !hold) {
      stance = null;
      return;
    }
    const inverse = qinv(facing);
    const ankleTurn = axisAngle(up, angle);
    for (const { leg, at, rotation } of stance.contacts) {
      const goal = rig.toRig(qrot(inverse, sub(at, origin)));
      solve(leg, goal, qmul(ankleTurn, rotation));
    }
  };
}
