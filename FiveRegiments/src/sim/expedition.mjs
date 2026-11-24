// Expedition uses the normal combat rules. A field ends at its gate after the last enemy falls.
const sentry = (regiment, x, z, wakeZ) => ({ regiment, at: [x, z], wakeZ, rank: 'troop', health: 0.27, power: 0.62 });
const captain = (regiment, titleKey, at, wakeZ, health, power, hardHealth, skills, phaseSkills) =>
  ({ regiment, titleKey, at, wakeZ, health, power, hardHealth, skills, phaseSkills, rank: 'boss' });

const stages = [
  {
    place: 'pass', level: 0.29, hardLevel: 0.36, sentryHealth: 0.18, sentryPower: 0.45,
    units: [sentry('yulin', 1.2, -0.6, 8), sentry('tiger', -1.3, -4.4, -0.5), sentry('archer', 0.5, -11, -5.5)]
  },
  {
    place: 'depot', level: 0.38, hardLevel: 0.53, sentryHealth: 0.15, sentryPower: 0.38,
    units: [sentry('vanguard', -0.8, 0, 8), sentry('plume', 1.5, -5.6, -1), sentry('archer', -2.3, -7.6, -5),
      captain('yulin', 'expeditionCaptain', [0, -16.8], -12.8, 0.45, 0.59, 0.86, ['charge', 'counter'], ['bull', 'moon'])]
  },
  {
    place: 'citadel', level: 0.53, hardLevel: 0.68, sentryHealth: 0.18, sentryPower: 0.40,
    units: [sentry('yulin', -1.7, 2, 8), sentry('tiger', 1.2, -3.8, -2),
      captain('vanguard', 'expeditionWarden', [0, -14.8], -10.4, 0.82, 0.61, 1.24, ['down', 'wave'], ['whirl', 'leap'])]
  }
];

export function planExpedition({ veteran = false } = {}) {
  return stages.map((stage, index) => ({
    place: stage.place,
    level: veteran ? stage.hardLevel : stage.level,
    veteran,
    index,
    foes: stage.units.map(unit => unit.regiment),
    units: stage.units.map(unit => ({
      ...unit, at: [...unit.at], skills: unit.skills && [...unit.skills], phaseSkills: unit.phaseSkills && [...unit.phaseSkills],
      health: unit.rank === 'troop' ? (veteran ? unit.health : stage.sentryHealth) : (veteran ? unit.hardHealth : unit.health),
      power: unit.rank === 'troop' ? (veteran ? unit.power : stage.sentryPower) : (veteran ? 1 : unit.power)
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
