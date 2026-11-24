// Only presentation: casts use a small cue, and execution uses the fight's actual event.
const BRASS = [1, 0.75, 0.32];
const COPPER = [1, 0.42, 0.37];
const EMBER = [1, 0.48, 0.17];
const STEEL = [0.54, 0.78, 1];
const JADE = [0.56, 1, 0.83];
const IVORY = [0.88, 0.95, 1];
const FROST = [0.57, 0.96, 1];
const MOSS = [0.68, 0.87, 0.38];

function effect(tint, preparation, release, impact, strength = 0, edge = 0.86) {
  return { tint, preparation, release, impact, trail: { tint, edge, strength } };
}

export const SKILL_EFFECTS = {
  charge: effect(BRASS, 'split', 'thrust', 'steel', 0.62, 0.91),
  bull: effect(BRASS, 'thrust', null, 'blunt'),
  counter: effect(IVORY, 'arc', null, 'steel'),
  turning: effect(BRASS, 'arc', 'split', 'steel', 0.83),
  moon: effect(BRASS, 'ring', 'arc', 'steel', 0.95, 0.79),
  finisher: effect(BRASS, 'glint', 'thrust', 'steel', 0.65, 0.90),
  shieldSlam: effect(BRASS, 'arc', 'arc', 'blunt'),

  swing: effect(COPPER, 'split', 'arc', 'steel', 0.78, 0.85),
  spin: effect(COPPER, 'ring', 'split', 'steel', 0.88, 0.82),
  mist: effect(MOSS, 'fan', null, 'arcane'),

  down: effect(EMBER, 'glint', null, 'blunt', 1, 0.80),
  wave: effect(EMBER, 'arc', 'arc', 'arcane', 0.75, 0.88),
  whirl: effect(EMBER, 'split', 'split', 'steel', 0.74, 0.87),
  leap: effect(EMBER, 'ring', null, 'blunt', 0.9, 0.87),
  shout: effect([1, 0.7, 0.36], 'glint', null, 'arcane'),
  axeSmash: effect(EMBER, 'thrust', 'arc', 'blunt', 1, 0.81),

  returnSpear: effect(STEEL, 'split', 'thrust', 'steel', 0.64, 0.94),
  stepCut: effect(STEEL, 'arc', 'arc', 'steel', 0.75, 0.89),
  boar: effect(STEEL, 'thrust', 'thrust', 'blunt', 0.64, 0.93),
  flowers: effect(FROST, 'glint', 'thrust', 'steel', 0.56, 0.95),
  drop: effect(STEEL, 'ring', null, 'blunt', 0.74, 0.88),
  poleAxeSmash: effect(STEEL, 'glint', 'split', 'steel', 0.83, 0.88),
  couch: effect(STEEL, 'thrust', null, 'blunt'),

  fan: effect(JADE, 'fan', 'fan', 'arrow'),
  gale: effect(FROST, 'thrust', 'thrust', 'arrow'),
  backStep: effect(JADE, 'split', 'glint', 'arrow'),
  blast: effect(EMBER, 'glint', 'glint', 'arcane'),
  web: effect(IVORY, 'ring', 'glint', 'arrow'),
  volley: effect(JADE, 'glint', 'thrust', 'arrow')
};

const ORDINARY_SWEEP = { tint: [1, 0.94, 0.83], edge: 0.83, strength: 0.78 };
const MOUNTED_SWEEP = { tint: [0.85, 0.93, 1], edge: 0.94, strength: 0.46 };
const NO_SWEEP = { tint: IVORY, edge: 1, strength: 0 };

export function skillSweepStyle(id, mounted) {
  const trail = id ? SKILL_EFFECTS[id]?.trail ?? NO_SWEEP : ORDINARY_SWEEP;
  return mounted && trail.strength > 0 ? MOUNTED_SWEEP : trail;
}
