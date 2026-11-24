// Presentation timing only. Damage and occupation remain in the battle simulation.
export const CATAPULT_RELEASE_TIME = .11;
export const CATAPULT_RELEASE_PITCH = -.62;
export const CATAPULT_RESET_TIME = .66;

export function catapultPitch(age) {
  if (age < CATAPULT_RELEASE_TIME) return CATAPULT_RELEASE_PITCH * (age / CATAPULT_RELEASE_TIME) ** 2;
  const settle = Math.min(1, (age - CATAPULT_RELEASE_TIME) / (CATAPULT_RESET_TIME - CATAPULT_RELEASE_TIME));
  return CATAPULT_RELEASE_PITCH * (1 - settle) ** 2;
}

/** Transform a movable part from its mount to the same world space as the chassis. */
export function siegeMount(x, y, z, yaw, scale, [px, py, pz], point, pitch = 0) {
  let lx = px, ly = py, lz = pz;
  if (point) {
    const [cx, cy, cz] = point;
    const sin = Math.sin(pitch), cos = Math.cos(pitch);
    lx += cx;
    ly += cy * cos - cz * sin;
    lz += cy * sin + cz * cos;
  }
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  return [x + scale * (lx * cos + lz * sin), y + scale * ly, z + scale * (lz * cos - lx * sin)];
}
