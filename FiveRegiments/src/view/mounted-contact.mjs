import { inSweep } from '../sim/fight.mjs';

export function mountedContactBody({ at, mounted, air }) {
  return [at[0], (mounted ? 2.15 : 1.3) + air, at[1]];
}

export function mountedContactPoint(impact, depth = 0.23) {
  const point = mountedContactBody(impact);
  const x = impact.at[0] - impact.from[0];
  const z = impact.at[1] - impact.from[1];
  const distance = Math.hypot(x, z) || 1;
  point[0] -= x * depth / distance;
  point[2] -= z * depth / distance;
  return point;
}

/** The committed cut anticipates the closest opponent within the existing sweep. */
function predictContact(game, actor, act) {
  if (act.awaitingRelease || actor.prev?.attack && !act.releaseOnly) return null;
  const remaining = Math.max(0, act.wind - act.t);
  if (remaining > 0.18) return null;
  const rider = { x: actor.x + actor.vx * remaining, z: actor.z + actor.vz * remaining, face: actor.face };
  let closest = null;
  let distance = Infinity;
  for (const foe of game.men) {
    if (!foe.alive || foe.side === actor.side) continue;
    const target = { x: foe.x + foe.vx * remaining, z: foe.z + foe.vz * remaining, body: foe.body };
    const range = Math.hypot(target.x - rider.x, target.z - rider.z);
    if (range >= distance || !inSweep(rider, target, act.reach, act.blow.arc)) continue;
    const contact = { from: [rider.x, rider.z], at: [target.x, target.z], mounted: foe.mounted, air: foe.act?.air ?? 0 };
    closest = mountedContactPoint(contact);
    distance = range;
  }
  return closest ? { point: closest, time: null } : null;
}

export function createMountedContactPresentation() {
  const impacts = new WeakMap();
  return {
    remember(actor, event, depth) {
      const act = actor?.act;
      const impact = event.mountedImpact;
      if (!impact || act?.kind !== 'swing' || !act.struck) return;
      const range = Math.hypot(impact.at[0] - impact.from[0], impact.at[1] - impact.from[1]);
      const previous = impacts.get(act);
      const guard = event.type !== 'hit';
      if (previous && (previous.range < range || previous.range === range && (previous.guard || !guard))) return;
      impacts.set(act, { range, point: mountedContactPoint(impact, depth), guard, drawContact: true });
    },
    target(game, actor) {
      const act = actor.act;
      if (!actor.mounted || act?.kind !== 'swing' || act.line !== 'R') return null;
      if (!act.struck) return predictContact(game, actor, act);
      const impact = impacts.get(act);
      if (!impact) return null;
      const time = impact.drawContact ? act.strikeAt : null;
      impact.drawContact = false;
      return { point: impact.point, time };
    }
  };
}
