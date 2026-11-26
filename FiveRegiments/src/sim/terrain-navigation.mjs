import { floorAt } from './terrain.mjs';

const clamp = (value, lo, hi) => Math.max(lo, Math.min(value, hi));
const inside = (box, [x, z]) => x > box.minX && x < box.maxX && z > box.minZ && z < box.maxZ;
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Does the open segment enter the interior of this rectangle? */
function crosses(box, a, b) {
  let entry = 0, exit = 1;
  for (const [axis, min, max] of [[0, box.minX, box.maxX], [1, box.minZ, box.maxZ]]) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-7) {
      if (a[axis] <= min || a[axis] >= max) return false;
    } else {
      const first = (min - a[axis]) / delta;
      const last = (max - a[axis]) / delta;
      entry = Math.max(entry, Math.min(first, last));
      exit = Math.min(exit, Math.max(first, last));
      if (entry >= exit) return false;
    }
  }
  return entry < exit;
}

function alongEdge(rect, [x, z]) {
  const gap = .32;
  return [[rect.minX - gap, clamp(z, rect.minZ, rect.maxZ)], [rect.maxX + gap, clamp(z, rect.minZ, rect.maxZ)],
    [clamp(x, rect.minX, rect.maxX), rect.minZ - gap], [clamp(x, rect.minX, rect.maxX), rect.maxZ + gap]];
}

function clearGround(place, a, b) {
  const pieces = Math.ceil(distance(a, b) / .48);
  for (let i = 1; i <= pieces; i++) {
    const part = i / pieces;
    if (floorAt(place, a[0] + (b[0] - a[0]) * part, a[1] + (b[1] - a[1]) * part) > .038) return false;
  }
  return true;
}

function clearPosts(place, a, b, body) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const span = dx * dx + dz * dz;
  if (!span) return true;
  for (const post of place.posts ?? []) {
    const px = post.x - a[0], pz = post.z - a[1];
    const t = clamp((px * dx + pz * dz) / span, 0, 1);
    if (t > 0 && Math.hypot(px - t * dx, pz - t * dz) < post.r + body + .09) return false;
  }
  return true;
}

function trailsAround(place, box, at, end, body) {
  let shortest = Infinity, first;
  const canWalk = (a, b) => !crosses(box, a, b) && clearPosts(place, a, b, body);
  // The wider bypasses clear posts and braziers near the closest corners.
  for (const gap of [.25, 1.2, 2.35]) {
    const corners = [[box.minX - gap, box.minZ - gap], [box.maxX + gap, box.minZ - gap],
      [box.maxX + gap, box.maxZ + gap], [box.minX - gap, box.maxZ + gap]];
    for (const [index, corner] of corners.entries()) {
      if (!canWalk(at, corner)) continue;
      for (const last of [corner, corners[(index + 1) % 4], corners[(index + 3) % 4]]) {
        const length = distance(at, corner) + distance(corner, last) + distance(last, end);
        if (length >= shortest || !canWalk(corner, last) || !canWalk(last, end)) continue;
        shortest = length;
        first = last !== corner && distance(at, corner) < .57 && canWalk(at, last) ? last : corner;
      }
    }
    if (first) break;
  }
  return first;
}

/** Horses cannot use ramps. Steer around the nearest end of the deck/ramp footprint. */
export function mountedDetour(place, man, goal) {
  if (!place.platforms?.length) return goal;
  let aim = goal;
  const at = [man.x, man.z];
  const body = man.body ?? .6;
  const margin = Math.max(.72, body * .85) + .24;
  for (const deck of place.platforms) {
    const rect = {
      minX: Math.min(deck.minX, deck.ramp?.minX ?? deck.minX) - margin,
      maxX: Math.max(deck.maxX, deck.ramp?.maxX ?? deck.maxX) + margin,
      minZ: Math.min(deck.minZ, deck.ramp?.minZ ?? deck.minZ) - margin,
      maxZ: Math.max(deck.maxZ, deck.ramp?.maxZ ?? deck.maxZ) + margin
    };
    if (!crosses(rect, at, aim)) continue;
    if (inside(rect, at)) {
      // A turning horse can end up inside the clearance margin, alongside the real platform.
      // Leave the footprint along a segment that stays at ground height.
      const reachable = alongEdge(rect, at).filter((point) => clearGround(place, at, point) && clearPosts(place, at, point, body));
      if (reachable.length) aim = reachable.sort((a, b) => distance(at, a) - distance(at, b))[0];
      continue;
    }
    if (inside(rect, aim)) {
      const exits = alongEdge(rect, aim);
      aim = exits.sort((a, b) => distance(at, a) - distance(at, b))[0];
    }
    if (crosses(rect, at, aim)) aim = trailsAround(place, rect, at, aim, body) ?? aim;
  }
  return aim;
}

/** Aim at the lower end of the ramp first, then climb along its centre line. */
export function uphillRoute(place, man, target) {
  if (man.mounted || (target.floor ?? 0) - (man.floor ?? 0) <= .12) return null;
  const deck = (place.platforms ?? []).find((area) => area.ramp &&
    (inside(area, [target.x, target.z]) || inside(area.ramp, [target.x, target.z])));
  if (!deck) return null;
  const { ramp } = deck;
  const x = (ramp.minX + ramp.maxX) / 2;
  const aligned = Math.abs(man.x - x) < (ramp.maxX - ramp.minX) * .38;
  if (aligned && man.z >= ramp.minZ - .2 && man.z <= ramp.maxZ + 1.48) return [x, ramp.minZ - .62];
  // Going to the entrance from the back of a deck must also skirt its sides.
  return mountedDetour(place, man, [x, ramp.maxZ + 1.25]);
}
