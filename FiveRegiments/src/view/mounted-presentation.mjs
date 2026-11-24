// Sample the last physics interval for the rider and saddle together. Only the
// renderer and follow camera use these positions. Combat reads the current tick.
const lerp = (from, to, t) => from + (to - from) * t;
const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
const lerpAngle = (from, to, t) => wrap(from + wrap(to - from) * t);

export function createMountedPresentation(tick) {
  const previous = new WeakMap();
  const displayedSwings = new WeakMap();

  function capture(rider) {
    if (!rider.mounted || !rider.alive) {
      previous.delete(rider);
      return;
    }
    let sample = previous.get(rider);
    if (!sample) previous.set(rider, sample = {});
    const { x, z, face: heading, speed } = rider.horse;
    const swing = rider.act?.kind === 'swing' ? rider.act : null;
    Object.assign(sample, {
      x, z, heading, speed, aim: rider.face,
      swing, swingTime: swing?.t, struck: swing?.struck, awaitingRelease: swing?.awaitingRelease
    });
  }

  function pose(rider, fraction) {
    const before = previous.get(rider);
    if (!before || !rider.mounted || !rider.alive) return rider;
    const current = rider.horse;
    if (Math.hypot(current.x - before.x, current.z - before.z) > 0.6) return rider;
    const t = Math.max(0, Math.min(fraction, 1));
    const x = lerp(before.x, current.x, t);
    const z = lerp(before.z, current.z, t);
    const currentAct = rider.act;
    let act = currentAct;
    if (currentAct?.kind === 'swing') {
      // Keep the visual action identity stable so the rig blends in only at the start.
      act = displayedSwings.get(currentAct);
      if (!act) displayedSwings.set(currentAct, act = {});
      Object.assign(act, currentAct);
      if (currentAct === before.swing && currentAct.struck === before.struck
        && currentAct.awaitingRelease === before.awaitingRelease && currentAct.t >= before.swingTime
        && currentAct.t - before.swingTime <= tick + 1e-7) act.t = lerp(before.swingTime, currentAct.t, t);
    }
    return {
      ...rider, x, z, act, face: lerpAngle(before.aim, rider.face, t),
      horse: { ...current, x, z, face: lerpAngle(before.heading, current.face, t), speed: lerp(before.speed, current.speed, t) }
    };
  }

  return { capture, pose };
}
