// The camera over the player's right shoulder. It turns with the mouse; locked on, it swings to keep the foe in
// view. It eases toward where it should be, kicks on heavy blows and pulls in a little while he guards, and it
// does not pass through the posts of the field.

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function createCameraRig(camera) {
  const rig = {
    at: [0, 1.6, -4],
    look: [0, 1.4, 0],
    shake: 0,
    shakeT: 0,
    distance: 3.3,
    fovKick: 0
  };
  /**
   * Follow `hero` with heading `yaw` and elevation `pitch`. `target` is the locked foe or null; `place` has posts.
   * Returns the yaw the camera settled on (locking turns it).
   */
  rig.update = (dt, { hero, yaw, pitch, target, place, guard = false, dead = false, finish = 0 }) => {
    if (target) {
      const want = Math.atan2(target.x - hero.x, target.z - hero.z);
      yaw += wrap(want - yaw) * (1 - Math.exp(-dt * 7));
    }
    const dist = (dead ? 5 : guard ? 3.4 : 3.9) + finish * 1.2;
    rig.distance += (dist - rig.distance) * (1 - Math.exp(-dt * 5));
    const fwd = [Math.sin(yaw), Math.cos(yaw)];
    const right = [-Math.cos(yaw), Math.sin(yaw)];
    const shoulder = 0.78;
    const height = 1.65 + Math.sin(pitch) * rig.distance;
    let cx = hero.x - fwd[0] * Math.cos(pitch) * rig.distance + right[0] * shoulder,
      cz = hero.z - fwd[1] * Math.cos(pitch) * rig.distance + right[1] * shoulder;
    // Keep out of posts: pull in along the line to the shoulder.
    for (const post of place?.posts ?? []) {
      const dx = cx - post.x,
        dz = cz - post.z,
        d = Math.hypot(dx, dz),
        need = post.r + 0.35;
      if (d < need && d > 1e-4) {
        cx = post.x + (dx / d) * need;
        cz = post.z + (dz / d) * need;
      }
    }
    const want = [cx, Math.max(0.4, height), cz];
    const lookAt = [hero.x + fwd[0] * 4 + right[0] * shoulder * 0.5, 1.3 - Math.sin(pitch) * 1.4, hero.z + fwd[1] * 4 + right[1] * shoulder * 0.5];
    const k = 1 - Math.exp(-dt * 16);
    for (let i = 0; i < 3; i++) {
      rig.at[i] += (want[i] - rig.at[i]) * k;
      rig.look[i] += (lookAt[i] - rig.look[i]) * k;
    }
    rig.shake = Math.max(0, rig.shake - dt * 2.4);
    rig.shakeT += dt;
    const s = rig.shake * rig.shake * 0.09;
    const jx = Math.sin(rig.shakeT * 61) * s,
      jy = Math.sin(rig.shakeT * 47 + 1) * s;
    camera.setPosition(rig.at[0] + jx, rig.at[1] + jy, rig.at[2]);
    camera.lookAt(rig.look[0], rig.look[1] + jy * 0.5, rig.look[2]);
    rig.fovKick += (0 - rig.fovKick) * (1 - Math.exp(-dt * 8));
    return yaw;
  };
  rig.kick = (amount = 0.5) => {
    rig.shake = Math.min(1, rig.shake + amount);
  };
  /** A camera somewhere fixed, for the title and between fights. */
  rig.frame = (dt, from, to, rate = 2) => {
    const k = 1 - Math.exp(-dt * rate);
    for (let i = 0; i < 3; i++) {
      rig.at[i] += (from[i] - rig.at[i]) * k;
      rig.look[i] += (to[i] - rig.look[i]) * k;
    }
    camera.setPosition(rig.at[0], rig.at[1], rig.at[2]);
    camera.lookAt(rig.look[0], rig.look[1], rig.look[2]);
  };
  rig.snap = (from, to) => {
    rig.at = [...from];
    rig.look = [...to];
    camera.setPosition(...from);
    camera.lookAt(...to);
  };
  return rig;
}
