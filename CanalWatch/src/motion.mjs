// Pose-only animation. Every anchor is still placed from the rules in view.mjs.
import { RAIDERS, TOWERS } from './sim/data.mjs';

const RAD_TO_DEG = 180 / Math.PI;
const GATE_SWING = 0.38;
const TAU = 2 * Math.PI;
const unit = (n) => Math.max(0, Math.min(1, n));
const smooth = (n) => n * n * (3 - 2 * n);

function impulse(time, trigger, duration) {
  const rest = 1 - unit((time - trigger) / duration);
  return rest * rest;
}

export function poseTower(entry, tower, time, reducedMotion) {
  const work = entry.work;
  const fired = reducedMotion ? 0 : impulse(time, entry.firedAt, 0.42);
  const spec = TOWERS[tower.kind].levels[tower.level];
  const reload = reducedMotion ? 0 : unit(tower.cooldown * (spec.rate ?? 0));
  if (tower.kind === 'crossbow') {
    work.y = -10.5;
    work.x = reducedMotion ? 0 : Math.cos(tower.angle) * (1.4 + 4.4 * fired) - 3.2 * reload;
    work.rotation = reducedMotion ? 0 : Math.sin(tower.angle) * 12;
    work.scaleX = 1 - 0.28 * reload + 0.16 * fired;
  } else if (tower.kind === 'trebuchet') {
    work.y = -14;
    work.rotation = 26 * reload - 66 * fired;
  } else if (tower.kind === 'fire') {
    const draught = reducedMotion ? 0 : Math.sin(time * 8.6 + tower.plot) * 0.085;
    work.scaleY = 1 + draught + 0.36 * fired;
    work.scaleX = 1 - draught + 0.12 * fired;
    work.y = 12 * (work.scaleY - 1);
    work.rotation = reducedMotion ? 0 : Math.sin(time * 5.4 + tower.plot) * 3.2;
  } else {
    const age = time - entry.firedAt;
    const swing = fired > 0 ? Math.sin(age * 23) * fired : 0;
    work.y = -12;
    work.rotation = 28 * swing;
    work.scaleX = 1 - 0.25 * Math.abs(swing);
    entry.mallet.rotation = -43 * fired + 11 * swing;
  }
}

export function poseRaider(entry, raider, time, dt, pathLength, reducedMotion) {
  const previous = entry.distance;
  entry.distance = raider.s;
  const isBoat = entry.boat;
  if (dt > 0 && isBoat) {
    const speed = unit((raider.s - previous) / (dt * RAIDERS[raider.kind].speed));
    entry.drive += (speed - entry.drive) * Math.min(1, dt * 8);
  }
  const flinch = reducedMotion ? 0 : impulse(time, entry.hitAt, 0.28);
  const visual = entry.rig.visual;
  visual.scaleY = 1 - 0.1 * flinch;
  visual.x = -2.6 * flinch;

  if (!isBoat) {
    const stride = reducedMotion ? 0 : Math.sin(raider.s * TAU / 22);
    const lift = reducedMotion ? 0 : Math.abs(stride);
    const brace = reducedMotion ? 0 : unit((raider.s - pathLength + 72) / 44);
    visual.y = -1.9 * lift;
    visual.rotation = -10 * flinch + 3.8 * stride;
    const [far, near] = entry.rig.legs;
    far.rotation = 33 * stride;
    near.rotation = -33 * stride;
    far.y = 5 - Math.max(0, stride) * 2.2;
    near.y = 5 + Math.min(0, stride) * 2.2;
    const gear = entry.rig.gear;
    gear.rotation = raider.kind === 'shield'
      ? 9 * stride - 28 * flinch - 16 * brace
      : -24 * stride + 36 * flinch - 54 * brace;
    return;
  }

  const wake = entry.rig.wake;
  const flow = reducedMotion ? 0 : Math.sin(raider.s * TAU / 37);
  const ripple = reducedMotion ? 0 : Math.sin(time * 4.8 + raider.id * 0.7);
  visual.y = 2.05 * ripple - 0.65 * flinch;
  visual.rotation = 4.4 * ripple + 7 * flinch;
  wake.alpha = reducedMotion ? 0.64 : (0.73 + 0.15 * flow) * (0.24 + 0.76 * entry.drive);
  wake.scaleX = reducedMotion ? 1 : 0.86 + entry.drive * (0.21 + flow * 0.16);
  wake.scaleY = reducedMotion ? 1 : 1 + flow * 0.1;
  for (const [side, oar] of entry.rig.oars) {
    oar.rotation = side * (13 + flow * 37 * entry.drive);
  }
  for (const [index, sail] of entry.rig.sails.entries()) {
    const wind = reducedMotion ? 0 : Math.sin(time * 5.8 + raider.id + index * 1.7);
    sail.rotation = wind * 8.5 - flinch * 6;
    sail.scaleX = 1 + wind * 0.23;
  }
}

/** The two leaves swing toward their banks while their hinge points stay fixed. */
export function poseGate(entry, closed, time, reducedMotion) {
  const next = Number(closed);
  if (next !== entry.target) {
    entry.start = entry.pose;
    entry.changedAt = time;
    entry.target = next;
  }
  if (reducedMotion) {
    entry.start = next;
    entry.changedAt = -Infinity;
  }
  const mix = smooth(unit((time - entry.changedAt) / GATE_SWING));
  entry.pose = entry.start + (next - entry.start) * mix;
  for (const [side, leaf] of entry.leaves) leaf.rotation = -side * 88 * (1 - entry.pose);
}

/** The trail rotates with the tangent of the actual arrow, spark or stone arc. */
export function poseShot(sprite, shot, reducedMotion) {
  const k = unit(shot.t / shot.flight);
  const lift = shot.type === 'blast' ? (reducedMotion ? 22 : 60) : 0;
  const dx = shot.x - shot.x0, dy = shot.y - shot.y0;
  sprite.x = shot.x0 + dx * k;
  sprite.y = shot.y0 + dy * k - Math.sin(k * Math.PI) * lift;
  sprite.rotation = Math.atan2(dy - Math.cos(k * Math.PI) * Math.PI * lift, dx) * RAD_TO_DEG;
}

/** A destroyed actor stays anchored where it fell while the figure settles out. */
export function poseFall(entry, time) {
  const progress = unit((time - entry.fellAt) / (entry.boat ? 0.46 : 0.32));
  const visual = entry.rig.visual;
  visual.y = (entry.boat ? 11 : 5) * progress;
  visual.rotation = (entry.boat ? 23 : -69) * progress;
  visual.scaleY = 1 - (entry.boat ? 0.48 : 0.2) * progress;
  entry.body.alpha = 1 - progress;
  if (entry.boat) entry.rig.wake.alpha = (1 - progress) * 0.45;
  return progress < 1;
}
