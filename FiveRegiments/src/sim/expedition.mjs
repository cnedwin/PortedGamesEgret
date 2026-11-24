// Expedition uses the normal combat rules. A field ends at its gate after the last enemy falls.
const stages = [
  { place: 'pass', foes: ['tiger'], level: 0.36 },
  { place: 'depot', foes: ['archer', 'yulin'], level: 0.48, health: 0.62 },
  { place: 'citadel', foes: ['vanguard'], level: 0.62 }
];

export function planExpedition() {
  return stages.map((stage, index) => ({
    ...stage,
    index,
    foes: [...stage.foes],
    expedition: true
  }));
}

export function atExpeditionGate(hero, gate) {
  return Math.hypot(hero.x - gate.x, hero.z - gate.z) <= gate.r;
}
