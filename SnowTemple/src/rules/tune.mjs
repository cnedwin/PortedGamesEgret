// Every number of the fight in one place. Times are seconds, distances metres, angles radians.

export const HERO = {
  radius: 0.45,
  speed: 5.4,
  hp: 120,
  stamina: 100,
  staminaRegen: 26,
  staminaDelay: 0.7, // after spending, before it comes back
  will: 100, // the spear's resolve: a full bar pays for the pear-blossom rain
  gourd: 3,
  // The three cuts of the combo: a thrust, a sweep and a heavy overhead.
  cuts: [
    { windup: 0.11, active: 0.1, recover: 0.27, range: 3.0, arc: 0.75, damage: 13, lunge: 2.2, push: 1.1 },
    { windup: 0.13, active: 0.12, recover: 0.3, range: 3.1, arc: 1.5, damage: 15, lunge: 1.8, push: 1.3 },
    { windup: 0.2, active: 0.12, recover: 0.42, range: 3.5, arc: 0.8, damage: 26, lunge: 2.6, push: 3.2, heavy: true }
  ],
  chain: 0.55, // how long after a cut the next one still continues the combo
  snapReach: 6.2, // how far a cut looks for someone to turn to
  dodge: { time: 0.42, safe: 0.3, speed: 11.5, cost: 22 },
  guard: { arc: 1.25, parry: 0.24, cost: 0.75, counter: 0.85, counterParry: 1.35 },
  riposte: { time: 0.62, strike: 0.2, damage: 58, posture: 22 },
  stars: { time: 0.5, release: 0.24, cooldown: 6, cost: 0, speed: 21, damage: 20, life: 1.25 },
  rain: { time: 2.7, radius: 9, spears: 26, from: 0.55, to: 2.1, spearRadius: 2.1, damage: 13, burst: 40, burstAt: 2.35 },
  glide: { speed: 10.2, cost: 24 },
  drink: { time: 0.85, at: 0.55, heal: 55 },
  hurt: { stagger: 0.36, safe: 0.75 },
  gains: { hit: 3, kill: 8, parry: 12, slip: 10, cutArrow: 4 }
};

/** One attack of a foe. `shape` is what it covers: an arc before it, a line ahead, or a disc on the ground. */
const move = (name, shape, windup, recover, damage, extra = {}) => ({ name, shape, windup, active: 0.12, recover, damage, range: 2.6, arc: 1, width: 1, ...extra });

export const FOES = {
  // A hired blade: closes in, cuts, and often cuts again.
  blade: {
    name: '庄客',
    hp: 84,
    radius: 0.45,
    speed: 3.1,
    reach: 2.2,
    poise: 1,
    moves: {
      cut: move('cut', 'arc', 0.62, 0.55, 11, { range: 2.7, arc: 1.0, lunge: 1.2, next: 'again' }),
      again: move('again', 'arc', 0.36, 0.8, 13, { range: 2.8, arc: 1.2, lunge: 1.4 })
    }
  },
  // A shield man: turns aside light cuts and answers at once.
  shield: {
    name: '牌手',
    hp: 132,
    radius: 0.5,
    speed: 2.6,
    reach: 2.1,
    poise: 3,
    moves: {
      bash: move('bash', 'arc', 0.7, 0.75, 13, { range: 2.5, arc: 1.1, lunge: 1.5 }),
      answer: move('answer', 'arc', 0.34, 0.85, 14, { range: 2.7, arc: 0.9, lunge: 1.2 })
    }
  },
  // A bowman: keeps his distance; his arrows can be cut out of the air.
  bow: {
    name: '弓手',
    hp: 58,
    radius: 0.42,
    speed: 2.8,
    reach: 11,
    poise: 1,
    moves: {
      shot: move('shot', 'line', 1.05, 0.9, 12, { range: 16, width: 0.5 }),
      volley: move('volley', 'disc', 1.25, 1.1, 16, { range: 2.5, unblockable: true })
    }
  },
  // Lu Qian, with a long-hafted broadsword.
  lu: {
    name: '陆谦',
    title: '太尉府虞候',
    hp: 980,
    radius: 0.6,
    speed: 3.4,
    reach: 2.9,
    poise: 5,
    posture: 100,
    moves: {
      sweep: move('sweep', 'arc', 0.72, 0.8, 22, { range: 3.7, arc: 1.7, lunge: 1.4, heavy: true }),
      twin: move('twin', 'arc', 0.55, 0.3, 16, { range: 3.4, arc: 1.1, lunge: 1.6, next: 'twinEnd' }),
      twinEnd: move('twinEnd', 'arc', 0.42, 0.85, 20, { range: 3.5, arc: 1.2, lunge: 1.6, heavy: true }),
      lunge: move('lunge', 'line', 0.85, 0.9, 24, { range: 9, width: 1.1, lunge: 8, heavy: true }),
      slam: move('slam', 'disc', 1.05, 1.0, 28, { range: 4.2, unblockable: true, heavy: true, self: true }),
      // Once the brazier is over: fire runs along the ground, and the blade turns twice.
      fire: move('fire', 'lines', 1.1, 1.0, 22, { range: 15, width: 1.0, unblockable: true, heavy: true }),
      wheel: move('wheel', 'disc', 0.8, 1.1, 24, { range: 4.6, unblockable: true, heavy: true, self: true, repeat: 1 })
    }
  }
};

/** Who waits in the fodder yard: two parties, the second walks in when the first is down. */
export const PARTIES = [
  [
    { kind: 'blade', x: -3.5, z: 7 },
    { kind: 'blade', x: 3.2, z: 5.6 },
    { kind: 'bow', x: 0.6, z: -1.5 }
  ],
  [
    { kind: 'shield', x: -1.5, z: -3.5 },
    { kind: 'blade', x: 2.4, z: -4.2 },
    { kind: 'bow', x: -6.8, z: 1.2 },
    { kind: 'bow', x: 7, z: 2.6 }
  ]
];

/** What can fall from the fallen. `grade` 0 common, 1 good, 2 rare. */
export const LOOT = {
  coin: { name: '铜钱', grade: 0 },
  silver: { name: '碎银', grade: 1 },
  salve: { name: '金创药', grade: 1 },
  tonic: { name: '回气散', grade: 1 },
  page: { name: '枪谱残页', grade: 2 }
};
export const GRADES = ['凡', '良', '珍'];

/** Moves that grow out of the three cuts. Each keeps the timing and the look of the cut it grows from. */
export const FORMS = {
  // Out of a dodge: a long thrust.
  lunge: { base: 0, range: 4.6, arc: 0.6, damage: 21, lunge: 4.8, push: 2.2, recover: 0.3 },
  // Out of the snow step: a running sweep.
  sweep: { base: 1, range: 3.7, arc: 2.5, damage: 18, lunge: 3.4, push: 2.6, recover: 0.34 },
  // The attack held down through a cut: a gathered overhead blow, slow to come and dear in breath.
  charge: { base: 2, windup: 0.34, range: 3.9, arc: 0.9, damage: 46, lunge: 2.8, push: 4.4, recover: 0.5, heavy: true, cost: 24 }
};
/** How long after a dodge the thrust is still there, how long a hold gathers the blow, what cancelling a cut into a guard costs. */
export const DERIVE = { afterDodge: 0.28, hold: 0.36, cancelCost: 8 };

/** Wine: for a while after a drink he hits harder and is hit harder; an untouched gourd feeds his resolve. */
export const WINE = { tipsy: 10, deal: 1.25, take: 1.2, fullGourd: 1.3 };

/** Fire on the ground and on a man: how often it bites, how hard, and how long a man burns. */
export const FIRE = { tick: 0.5, damage: 6, burn: 4, hero: 5 };
