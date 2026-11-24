// Expedition uses the normal combat rules. A field ends at its gate after the last enemy falls.
const sentry = (regiment, x, z, wakeZ) => ({ regiment, at: [x, z], wakeZ, rank: 'troop', health: 0.27, power: 0.62 });
const captain = (regiment, titleKey, at, wakeZ, health, skills, phaseSkills) =>
  ({ regiment, titleKey, at, wakeZ, health, skills, phaseSkills, rank: 'boss' });

const stages = [
  {
    place: 'pass', level: 0.36,
    units: [sentry('yulin', 1.2, -0.6, 8), sentry('tiger', -1.3, -4.4, 3), sentry('archer', 0.5, -11, -1)]
  },
  {
    place: 'depot', level: 0.48,
    units: [sentry('vanguard', -0.8, 0, 8), sentry('plume', 1.5, -5.6, 2), sentry('archer', -2.3, -7.6, -1),
      captain('yulin', 'expeditionCaptain', [0, -12], -6, 0.80, ['charge', 'counter'], ['bull', 'moon'])]
  },
  {
    place: 'citadel', level: 0.62,
    units: [sentry('yulin', -1.7, 2, 8), sentry('tiger', 1.2, -3.8, 2),
      captain('vanguard', 'expeditionWarden', [0, -12], -5, 1.24, ['down', 'wave'], ['whirl', 'leap'])]
  }
];

export function planExpedition() {
  return stages.map((stage, index) => ({
    ...stage,
    index,
    foes: stage.units.map(unit => unit.regiment),
    units: stage.units.map(unit => ({
      ...unit, at: [...unit.at], skills: unit.skills && [...unit.skills], phaseSkills: unit.phaseSkills && [...unit.phaseSkills]
    })),
    expedition: true
  }));
}

export function atExpeditionGate(hero, gate) {
  return Math.hypot(hero.x - gate.x, hero.z - gate.z) <= gate.r;
}

export function expeditionReady(unit, hero) {
  return unit.wakeZ === undefined || hero.z <= unit.wakeZ || unit.hp < unit.maxHp;
}

/** A captain changes stance between actions, retaining cooldowns for any skill kept in its new stance. */
export function changeExpeditionPhase(unit) {
  if (!unit.alive || !unit.phaseSkills || unit.phase !== 1 || unit.hp > unit.maxHp * 0.58 || unit.act) return false;
  const cooldowns = new Map(unit.skills.map((id, slot) => [id, unit.cool[slot]]));
  unit.skills = [...unit.phaseSkills];
  unit.cool = unit.skills.map(id => Math.max(0.9, cooldowns.get(id) ?? 0));
  unit.phase = 2;
  return true;
}
