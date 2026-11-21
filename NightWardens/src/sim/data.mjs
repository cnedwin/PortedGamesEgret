// 数据：场地尺寸、符弩的初始属性、每种邪祟、每种符法和三夜的出怪表。规则（world.mjs）只读这里的数，
// 调平衡只改这一个文件，再用 tools/balance.mjs 跑整夜看结果。
// The data: the field, the crossbow's starting numbers, every kind of haunt, every ward and the three nights' spawn
// tables. The rules (world.mjs) only read numbers from here: balance is changed in this one file, then whole nights
// are played with tools/balance.mjs to see what it did.

/** The field in rule units, tall: haunts come in at the top and walk down to the wall at the bottom. */
export const FIELD = Object.freeze({ width: 540, height: 900, wallY: 812, turretY: 790, left: 34, right: 506 });

/** The crossbow at the start of a night. */
export const TURRET = Object.freeze({
  damage: 11,
  interval: 0.34,
  boltSpeed: 640,
  range: 760,
  moveSpeed: 330,
  crit: 0.05,
  critScale: 2
});

/** The wall's health and how fast the thunder talisman fills, in seconds from empty. */
export const WALL_HP = 100;
export const THUNDER_SECONDS = 22;

/**
 * The haunts. `hp` health, `speed` units a second, `radius` for hits, `bite` the wall's loss when one reaches it,
 * `soul` experience dropped. `move` names the way it walks; `summon`, `shoot` and `stop` are what some of them do.
 */
export const HAUNTS = Object.freeze({
  paper: { hp: 15, speed: 44, radius: 15, bite: 4, soul: 1, move: 'sway' },
  wisp: { hp: 8, speed: 92, radius: 11, bite: 3, soul: 1, move: 'zigzag' },
  jiangshi: { hp: 64, speed: 34, radius: 19, bite: 10, soul: 3, move: 'hop' },
  lantern: { hp: 46, speed: 30, radius: 17, bite: 6, soul: 3, move: 'straight', stop: 400, shoot: { every: 3.4, damage: 3 } },
  bride: { hp: 300, speed: 20, radius: 24, bite: 18, soul: 14, move: 'straight', summon: { kind: 'paper', every: 6, count: 3 }, elite: true },
  // The three wardens of the nights, one for each.
  general: { hp: 2600, speed: 13, radius: 46, bite: 60, soul: 40, move: 'straight', summon: { kind: 'paper', every: 5, count: 5 }, stomp: 4.5, boss: true },
  wuchang: { hp: 5200, speed: 15, radius: 42, bite: 60, soul: 60, move: 'drift', summon: { kind: 'wisp', every: 4, count: 6 }, shoot: { every: 2.6, damage: 5 }, stop: 330, boss: true },
  hanba: { hp: 7600, speed: 12, radius: 50, bite: 80, soul: 80, move: 'straight', summon: { kind: 'jiangshi', every: 7, count: 3 }, shoot: { every: 2.5, damage: 5 }, stomp: 5, stop: 300, boss: true }
});

/**
 * The wards offered when the crossbow gains a level: three of those not yet at their most, by weight. Each level adds
 * what its line says; `world.mjs` reads `levels` through `wardLevel`.
 */
export const WARDS = Object.freeze({
  volley: { max: 4, weight: 9 }, // 连弩: one more bolt a shot
  haste: { max: 5, weight: 10 }, // 速射: shots come faster
  cinnabar: { max: 5, weight: 10 }, // 朱砂: more damage
  pierce: { max: 3, weight: 7 }, // 穿心: bolts go through one more
  fire: { max: 3, weight: 7 }, // 火符: hits set haunts burning
  chain: { max: 3, weight: 6 }, // 雷引: every fourth shot leaps between haunts
  frost: { max: 3, weight: 6 }, // 寒符: hits slow haunts
  ink: { max: 3, weight: 5 }, // 墨斗线: a line across the road burns what crosses it
  mirror: { max: 3, weight: 5 }, // 八卦镜: a beam straight up from the crossbow
  wall: { max: 3, weight: 5 }, // 固城: the wall grows and mends
  crit: { max: 3, weight: 6 }, // 破邪: more and harder critical hits
  thunder: { max: 2, weight: 4 } // 引雷: the thunder talisman fills faster
});

/** Experience to the next level: a little more each level. */
export const soulsFor = (level) => 6 + level * 5 + Math.floor(level * level * 0.6);

/**
 * The three nights. `phases` are spawn rates (haunts a second) up to a time; at `bossAt` the warden comes, and the
 * night is won when it falls and the road is clear. `ground` names the view's painting of the road.
 */
export const NIGHTS = Object.freeze([
  {
    id: 1,
    ground: 'temple',
    boss: 'general',
    bossAt: 200,
    phases: [
      { until: 30, rates: { paper: 1.1 } },
      { until: 70, rates: { paper: 1.6, wisp: 0.6 } },
      { until: 120, rates: { paper: 2.1, wisp: 0.9, jiangshi: 0.25 } },
      { until: 170, rates: { paper: 2.6, wisp: 1.2, jiangshi: 0.4, bride: 0.03 } },
      { until: 200, rates: { paper: 3.0, wisp: 1.4, jiangshi: 0.5, bride: 0.04 } },
      { until: Infinity, rates: { paper: 1.2, wisp: 0.5 } }
    ]
  },
  {
    id: 2,
    ground: 'graves',
    boss: 'wuchang',
    bossAt: 210,
    phases: [
      { until: 30, rates: { paper: 1.2, wisp: 0.5 } },
      { until: 80, rates: { paper: 1.8, wisp: 0.8, lantern: 0.1 } },
      { until: 130, rates: { paper: 2.2, wisp: 1.0, jiangshi: 0.3, lantern: 0.12 } },
      { until: 180, rates: { paper: 2.6, wisp: 1.2, jiangshi: 0.45, lantern: 0.15, bride: 0.04 } },
      { until: 210, rates: { paper: 3.0, wisp: 1.4, jiangshi: 0.55, lantern: 0.18, bride: 0.05 } },
      { until: Infinity, rates: { paper: 1.0, wisp: 0.6, lantern: 0.05 } }
    ]
  },
  {
    id: 3,
    ground: 'market',
    boss: 'hanba',
    bossAt: 220,
    phases: [
      { until: 30, rates: { paper: 1.68, wisp: 0.9, jiangshi: 0.17 } },
      { until: 80, rates: { paper: 2.24, wisp: 1.23, jiangshi: 0.39, lantern: 0.12 } },
      { until: 140, rates: { paper: 2.8, wisp: 1.57, jiangshi: 0.62, lantern: 0.15, bride: 0.04 } },
      { until: 190, rates: { paper: 3.36, wisp: 1.9, jiangshi: 0.78, lantern: 0.18, bride: 0.07 } },
      { until: 220, rates: { paper: 3.81, wisp: 2.24, jiangshi: 0.9, lantern: 0.2, bride: 0.08 } },
      { until: Infinity, rates: { paper: 1.34, wisp: 0.9, jiangshi: 0.22, lantern: 0.06 } }
    ]
  }
]);

/** How many of a kind may be on the road at once, so the field never fills past what a phone draws smoothly. */
export const MAX_HAUNTS = 180;
