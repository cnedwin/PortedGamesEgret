// 数据：地图（运河水道、纤道、建造位、水闸）、四种塔、五种敌人和十二波的编排。只有数字，不碰页面也不碰引擎。
// The data: the map (the canal, the towpath, the build plots and the sluice gates), the four towers, the five kinds of
// raider and the twelve waves. Numbers only; neither the page nor the engine.

/** The stage, in the game's own units. */
export const FIELD = { width: 960, height: 540 };

/**
 * The two ways in. Boats come down the canal (`water`), men along the towpath (`road`); both end at the city wall on
 * the right, the canal at the water gate and the road at the land gate.
 */
export const PATHS = {
  water: [
    [-40, 112],
    [150, 112],
    [262, 196],
    [430, 212],
    [545, 138],
    [690, 126],
    [792, 204],
    [826, 326],
    [1000, 340]
  ],
  road: [
    [-40, 478],
    [196, 470],
    [326, 398],
    [516, 396],
    [640, 452],
    [782, 458],
    [1000, 444]
  ]
};

/** How wide each way is drawn and kept clear, half on each side. */
export const WIDTH = { water: 50, road: 30 };

/** Where towers can stand: on the banks between and beside the two ways. */
export const PLOTS = [
  [118, 50],
  [330, 120],
  [612, 62],
  [742, 52],
  [250, 290],
  [420, 300],
  [585, 262],
  [700, 246],
  [892, 236],
  [878, 384],
  [440, 474],
  [620, 520]
];

/** The two sluice gates, as distances along the canal. A closed gate holds every boat above it. */
export const GATES = [
  { at: 500, name: 'upper' },
  { at: 1130, name: 'lower' }
];
/** Seconds a gate stays shut, and seconds before it can be shut again. */
export const GATE = { shut: 6, cooldown: 20 };

/**
 * The towers. `levels` are bought in turn: the first is the build, the next two upgrades. `kind` of damage:
 * `pierce` (arrows, which shields turn), `blast` (stones, with `splash` around the point they land), `fire` (which
 * leaves the target burning for `burn` damage a second over `burnFor` seconds) and `gong` (no damage: slows
 * raiders in range by `slow` and quickens towers in `aura` by `haste`).
 */
export const TOWERS = {
  crossbow: {
    kind: 'pierce',
    levels: [
      { cost: 70, range: 150, rate: 1.2, damage: 26 },
      { cost: 90, range: 160, rate: 1.4, damage: 32 },
      { cost: 130, range: 175, rate: 1.7, damage: 46 }
    ]
  },
  trebuchet: {
    kind: 'blast',
    vsBoat: 1.5,
    levels: [
      { cost: 120, range: 215, minRange: 60, rate: 0.34, damage: 64, splash: 52 },
      { cost: 130, range: 230, minRange: 60, rate: 0.4, damage: 96, splash: 58 },
      { cost: 180, range: 250, minRange: 60, rate: 0.46, damage: 140, splash: 64 }
    ]
  },
  fire: {
    kind: 'fire',
    vsBoat: 2,
    levels: [
      { cost: 100, range: 140, rate: 0.8, damage: 8, burn: 11, burnFor: 4 },
      { cost: 110, range: 150, rate: 0.9, damage: 12, burn: 17, burnFor: 4 },
      { cost: 150, range: 160, rate: 1, damage: 16, burn: 25, burnFor: 5 }
    ]
  },
  gong: {
    kind: 'gong',
    levels: [
      { cost: 80, range: 110, slow: 0.3, aura: 120, haste: 0.15 },
      { cost: 90, range: 125, slow: 0.38, aura: 130, haste: 0.22 },
      { cost: 120, range: 140, slow: 0.45, aura: 140, haste: 0.3 }
    ]
  }
};
export const TOWER_KINDS = Object.keys(TOWERS);
/** A tower sold gives back this share of all that was paid for it. */
export const REFUND = 0.7;

/**
 * The raiders. `way` is the path they take; `armor` is the share of arrow damage a shield turns; `leak` is the lives
 * lost when one reaches the wall; `crew` are raiders that jump ashore when a boat sinks.
 */
export const RAIDERS = {
  raider: { way: 'road', hp: 62, speed: 54, bounty: 6, leak: 1, radius: 9 },
  shield: { way: 'road', hp: 150, speed: 38, bounty: 12, leak: 1, armor: 0.55, radius: 11 },
  skiff: { way: 'water', hp: 92, speed: 78, bounty: 9, leak: 1, radius: 12 },
  junk: { way: 'water', hp: 560, speed: 30, bounty: 40, leak: 3, radius: 20, crew: 2 },
  flagship: { way: 'water', hp: 3000, speed: 22, bounty: 200, leak: 10, radius: 28, crew: 6 }
};

/** What a game starts with, per difficulty. Hard raiders have more strength. */
export const DIFFICULTY = {
  normal: { silver: 240, lives: 20, hp: 1 },
  hard: { silver: 240, lives: 15, hp: 1.12 }
};
/** Raiders of each wave are this much stronger than the wave before: wave n has 1 + n × GROWTH of the strength. */
export const GROWTH = 0.06;

/** Seconds between waves, unless the next is called early; each second left gives `earlyBonus` silver. */
export const BREAK = 12;
export const EARLY_BONUS = 2;
/** Silver for clearing a wave: `base` plus `per` for each wave so far. */
export const WAVE_BONUS = { base: 30, per: 5 };

/**
 * The waves. Each is a list of groups: `count` raiders of a `kind`, `gap` seconds apart, starting `delay` seconds into
 * the wave. Boats and men come at once from the fourth wave on, so the gates matter.
 */
export const WAVES = [
  [{ kind: 'raider', count: 8, gap: 1.4 }],
  [{ kind: 'raider', count: 10, gap: 1.1 }, { kind: 'skiff', count: 3, gap: 2.5, delay: 4 }],
  [{ kind: 'skiff', count: 8, gap: 1.3 }],
  [{ kind: 'raider', count: 10, gap: 1 }, { kind: 'shield', count: 4, gap: 2.2, delay: 3 }, { kind: 'skiff', count: 5, gap: 1.5, delay: 2 }],
  [{ kind: 'junk', count: 2, gap: 6 }, { kind: 'skiff', count: 6, gap: 1, delay: 3 }],
  [{ kind: 'shield', count: 9, gap: 1.5 }, { kind: 'raider', count: 10, gap: 0.8, delay: 6 }],
  [{ kind: 'skiff', count: 14, gap: 0.8 }, { kind: 'junk', count: 2, gap: 5, delay: 6 }],
  [{ kind: 'raider', count: 18, gap: 0.6 }, { kind: 'shield', count: 8, gap: 1.4, delay: 4 }, { kind: 'skiff', count: 8, gap: 1, delay: 8 }],
  [{ kind: 'junk', count: 5, gap: 4 }, { kind: 'skiff', count: 10, gap: 0.9, delay: 2 }],
  [{ kind: 'shield', count: 14, gap: 1 }, { kind: 'raider', count: 20, gap: 0.5, delay: 3 }, { kind: 'junk', count: 3, gap: 5, delay: 6 }],
  [{ kind: 'skiff', count: 20, gap: 0.6 }, { kind: 'junk', count: 4, gap: 3.5, delay: 4 }, { kind: 'shield', count: 12, gap: 1, delay: 2 }],
  [{ kind: 'flagship', count: 1, gap: 1, delay: 6 }, { kind: 'junk', count: 4, gap: 4 }, { kind: 'raider', count: 24, gap: 0.6, delay: 2 }, { kind: 'shield', count: 10, gap: 1.2, delay: 10 }]
];

/** Stars for a won game, by the lives kept out of the start. */
export function stars(lives, start) {
  if (lives <= 0) return 0;
  if (lives >= start * 0.9) return 3;
  if (lives >= start * 0.5) return 2;
  return 1;
}
