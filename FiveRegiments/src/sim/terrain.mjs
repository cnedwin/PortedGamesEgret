const inside = (area, x, z) => x >= area.minX && x <= area.maxX && z >= area.minZ && z <= area.maxZ;
const clamp01 = value => Math.max(0, Math.min(1, value));
const ease = value => value * value * (3 - 2 * value);

export function floorAt(place, x, z) {
  let height = 0;
  for (const platform of place?.platforms ?? []) {
    if (inside(platform, x, z)) height = Math.max(height, platform.height);
    if (platform.ramp && inside(platform.ramp, x, z)) {
      const { minZ, maxZ } = platform.ramp;
      height = Math.max(height, platform.height * clamp01((maxZ - z) / (maxZ - minZ)));
    }
  }
  return height;
}

/** Find a low lip directly ahead. The movement comes after the upward phase of the vault. */
export function mantleTarget(place, man, dx, dz) {
  if (man.mounted || !place?.platforms?.length) return null;
  const floor = man.floor ?? 0;
  for (const range of [0.45, 0.65, 0.85, 1.05, 1.22]) {
    const x = man.x + dx * range, z = man.z + dz * range;
    const platform = place.platforms.find(area => inside(area, x, z));
    if (!platform || platform.height - floor <= 0.35 || platform.height - floor > 1.58) continue;
    const to = [x + dx * 0.24, z + dz * 0.24];
    if (inside(platform, ...to)) return { x: to[0], z: to[1], floor: platform.height };
  }
  return null;
}

export function mantlePose(action) {
  const time = clamp01(action.t / action.duration);
  const horizontal = ease(clamp01((time - 0.46) / 0.54));
  const vertical = ease(clamp01(time / 0.72));
  return {
    x: action.from.x + (action.to.x - action.from.x) * horizontal,
    z: action.from.z + (action.to.z - action.from.z) * horizontal,
    floor: action.from.floor + (action.to.floor - action.from.floor) * vertical
  };
}

/** Ramps are shared by foot fighters. Walls catch ordinary movement and horses stay on level terrain. */
export function settleFooting(place, man, oldX, oldZ, dt) {
  if (!place?.platforms?.length || man.act?.kind === 'mantle') return;
  const from = floorAt(place, oldX, oldZ);
  let to = floorAt(place, man.x, man.z);
  const blocks = height => man.mounted ? height > 0.04 : height - from > 0.18;
  if (blocks(to)) {
    if (!blocks(floorAt(place, oldX, man.z))) {
      man.x = oldX;
      man.vx = 0;
    } else if (!blocks(floorAt(place, man.x, oldZ))) {
      man.z = oldZ;
      man.vz = 0;
    } else {
      man.x = oldX;
      man.z = oldZ;
      man.vx = man.vz = 0;
    }
    to = floorAt(place, man.x, man.z);
  }
  man.floor = man.mounted ? 0 : Math.max(to, (man.floor ?? 0) - dt * 6.8);
}
