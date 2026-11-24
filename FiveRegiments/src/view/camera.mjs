// The camera over the player's right shoulder. It turns with the mouse; locked on, it swings to keep the foe in
// view. It eases toward where it should be, kicks on heavy blows and pulls in a little while he guards, and it
// does not pass through the posts of the field.
import { floorAt } from '../sim/terrain.mjs';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function createCameraRig(camera) {
  const rig = {
    at: [0, 1.6, -4],
    look: [0, 1.4, 0],
    shake: 0,
    shakeT: 0,
    distance: 3.3,
    up: 0,
    bowFrame: 0,
    contact: [0, 0, 0]
  };
  /**
   * Follow `hero` with heading `yaw` and elevation `pitch`. `target` is the locked foe or null; `place` has posts.
   * Returns the yaw the camera settled on (locking turns it).
   */
  rig.update = (dt, { hero, yaw, pitch, target, targetYaw, place, guard = false, dead = false, finish = 0, mounted = false, view = 'third', zoom = 1, eye = null, aimingBow = false }) => {
    if (target) {
      const want = targetYaw ?? Math.atan2(target.x - hero.x, target.z - hero.z);
      yaw += wrap(want - yaw) * (1 - Math.exp(-dt * 7));
    }
    const contactDecay = Math.exp(-dt * 22);
    for (let i = 0; i < rig.contact.length; i++) rig.contact[i] *= contactDecay;
    // On horseback the camera rides higher and further back.
    rig.up += ((mounted ? 0.85 : 0) - rig.up) * (1 - Math.exp(-dt * 4));
    const bowFrame = aimingBow && view === 'third' && !dead && !finish ? 1 : 0;
    rig.bowFrame += (bowFrame - rig.bowFrame) * (1 - Math.exp(-dt * 7));
    // The first-person view (V): at his eyes, looking where the mouse looks; it gives way to the shoulder view when he
    // falls or the fight ends.
    if (view === 'first' && eye && !dead && !finish) {
      const fwd = [Math.sin(yaw) * Math.cos(pitch * 0.9), -Math.sin(pitch * 0.9) + 0.02, Math.cos(yaw) * Math.cos(pitch * 0.9)];
      const at = [eye[0] + fwd[0] * 0.14, eye[1], eye[2] + fwd[2] * 0.14];
      for (let i = 0; i < 3; i++) {
        rig.at[i] = at[i];
        rig.look[i] = at[i] + fwd[i] * 4;
      }
      rig.shake = Math.max(0, rig.shake - dt * 2.4);
      camera.setPosition(rig.at[0] + rig.contact[0] * 0.45, rig.at[1] + rig.contact[1] * 0.45, rig.at[2] + rig.contact[2] * 0.45);
      camera.lookAt(rig.look[0], rig.look[1], rig.look[2]);
      return yaw;
    }
    const dist = ((dead ? 5 : guard ? 3.4 : 3.9) + finish * 1.2 + rig.up * 1.4 - 0.34 * rig.bowFrame) * zoom;
    rig.distance += (dist - rig.distance) * (1 - Math.exp(-dt * 5));
    const fwd = [Math.sin(yaw), Math.cos(yaw)];
    const right = [-Math.cos(yaw), Math.sin(yaw)];
    const shoulder = 0.78;
    // Reveal the hands from the draw side while keeping the sight point fixed.
    const drawSide = shoulder + 0.56 * rig.bowFrame;
    const floor = hero.floor ?? 0;
    const height = floor + 1.65 + rig.up + Math.sin(pitch) * rig.distance + 0.09 * rig.bowFrame;
    let cx = hero.x - fwd[0] * Math.cos(pitch) * rig.distance + right[0] * drawSide,
      cz = hero.z - fwd[1] * Math.cos(pitch) * rig.distance + right[1] * drawSide;
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
    const want = [cx, Math.max(floorAt(place, cx, cz) + 0.4, height), cz];
    const lookAt = [hero.x + fwd[0] * 4 + right[0] * shoulder * 0.5, floor + 1.3 + rig.up * 0.7 - Math.sin(pitch) * 1.4, hero.z + fwd[1] * 4 + right[1] * shoulder * 0.5];
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
    camera.setPosition(rig.at[0] + jx + rig.contact[0], rig.at[1] + jy + rig.contact[1], rig.at[2] + rig.contact[2]);
    camera.lookAt(rig.look[0], rig.look[1] + jy * 0.5, rig.look[2]);
    return yaw;
  };
  rig.kick = (amount = 0.5, bearing) => {
    rig.shake = Math.min(1, rig.shake + amount);
    if (Number.isFinite(bearing)) {
      const push = Math.min(1, amount) * 0.085;
      rig.contact[0] = Math.sin(bearing) * push;
      rig.contact[1] = -push * 0.2;
      rig.contact[2] = Math.cos(bearing) * push;
    }
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
    rig.bowFrame = 0;
    rig.contact.fill(0);
    camera.setPosition(...from);
    camera.lookAt(...to);
  };
  return rig;
}
