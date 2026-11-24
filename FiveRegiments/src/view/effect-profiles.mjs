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

// Readable below the weapon silhouette, with a shorter mark for the faster cast.
export const SKILL_PREPARATION = {
  charge: { shape: 'chargeLane', radius: 0.92, time: 0.47 },
  bull: { shape: 'bullHorns', radius: 0.94, time: 0.30 },
  spin: { shape: 'spinGather', radius: 1.02, time: 0.32 },
  swing: { shape: 'swingBeats', radius: 1.02, time: 0.24 },
  down: { shape: 'axePlant', radius: 1.07, time: 0.65 },
  wave: { shape: 'waveFold', radius: 1.02, time: 0.35 },
  returnSpear: { shape: 'returnPlant', radius: 0.94, time: 0.34 },
  stepCut: { shape: 'sidePlant', radius: 0.94, time: 0.34 },
  boar: { shape: 'boarStep', radius: 0.96, time: 0.31 },
  fan: { shape: 'fanFeathers', radius: 0.92, time: 0.40 },
  backStep: { shape: 'retreatHeel', radius: 0.86, time: 0.26 },
  gale: { shape: 'galeChannel', radius: 1.02, time: 0.40 }
};

export const SKILL_RELEASE = {
  charge: { shape: 'sabreDrive', anchor: 'edge', radius: 0.82, time: 0.20 },
  spin: { shape: 'spinEdge', anchor: 'body', radius: 1.34, time: 0.25 },
  swing: { shape: 'swordBeat', anchor: 'body', radius: 1.10, time: 0.18 },
  returnSpear: { shape: 'spearDrive', anchor: 'edge', radius: 0.87, time: 0.19 },
  boar: { shape: 'boarDrive', anchor: 'edge', radius: 0.79, time: 0.23 },
  wave: { shape: 'waveCast', radius: 1.06, time: 0.16, height: 0.91 },
  fan: { shape: 'fanCast', radius: 0.81, time: 0.17, height: 1.43 },
  backStep: { shape: 'retreatCast', radius: 0.70, time: 0.18, height: 1.43 },
  gale: { shape: 'galeCast', radius: 0.85, time: 0.19, height: 1.43 }
};

export const SKILL_CONTACT = {
  charge: { shape: 'sabreDrive', radius: 0.47 },
  bull: { shape: 'bullBuckle', radius: 0.59 },
  spin: { shape: 'swordBeat', radius: 0.52 },
  swing: { shape: 'glint', radius: 0.34 },
  returnSpear: { shape: 'spearDrive', radius: 0.44 },
  boar: { shape: 'boarDrive', radius: 0.58 },
  fan: { shape: 'glint', radius: 0.17 },
  gale: { shape: 'galeCast', radius: 0.31 }
};

const ORDINARY_SWEEP = { tint: [1, 0.94, 0.83], edge: 0.83, strength: 0.78 };
const MOUNTED_SWEEP = { tint: [0.85, 0.93, 1], edge: 0.94, strength: 0.46 };
const NO_SWEEP = { tint: IVORY, edge: 1, strength: 0 };

export function skillSweepStyle(id, mounted) {
  const trail = id ? SKILL_EFFECTS[id]?.trail ?? NO_SWEEP : ORDINARY_SWEEP;
  return mounted && trail.strength > 0 ? MOUNTED_SWEEP : trail;
}
