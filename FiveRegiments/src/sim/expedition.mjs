// Expedition uses the normal combat rules. A field ends at its gate after the last enemy falls.
const sentry = (regiment, x, z, wakeZ) => ({ regiment, at: [x, z], wakeZ, rank: 'troop', health: 0.27, power: 0.62 });

const stages = [
  {
    place: 'pass', level: 0.36,
    units: [sentry('yulin', 1.2, -0.6, 8), sentry('tiger', -1.3, -4.4, 3), sentry('archer', 0.5, -11, -1)]
  },
  {
    place: 'depot', level: 0.48,
    units: [sentry('vanguard', -0.8, 0, 8), sentry('plume', 1.5, -7.2, 2), sentry('archer', -2.3, -9.5, -1)]
  },
  {
    place: 'citadel', level: 0.62,
    units: [sentry('yulin', -1.7, 2, 8), sentry('tiger', 1.2, -3.8, 2), { regiment: 'vanguard', at: [0, -12], wakeZ: -4 }]
  }
];

export function planExpedition() {
  return stages.map((stage, index) => ({
    ...stage,
    index,
    foes: stage.units.map(unit => unit.regiment),
    units: stage.units.map(unit => ({
      ...unit, at: [...unit.at], skills: unit.skills && [...unit.skills], talents: unit.talents && [...unit.talents]
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
