// Numbers and names the rules are tuned with. Lengths are metres, times seconds.

export const PLAYER = {
  radius: 0.35,
  height: 1.8,
  eye: 1.62,
  crouchEye: 1.08,
  walk: 4.6,
  sprint: 6.9,
  crouch: 2.3,
  aimWalk: 2.9,
  jump: 6.2,
  gravity: 19,
  health: 100,
  armor: 60,
  /** Share of a hit the armour takes while any is left. */
  armorShare: 0.65,
  /** Health comes back by itself only up to here, after a quiet spell. */
  regenTo: 45,
  regenDelay: 5,
  regenRate: 7,
  bandages: 2,
  bandageHeal: 55,
  bandageTime: 1.8,
  grenades: 2,
  pitchLimit: 1.5,
};

/**
 * Weapons. `spread` is the cone half-angle in radians from the hip and when
 * aiming; `recoil` is the upward kick of one shot in radians.
 */
export const WEAPONS = {
  rifle: {
    key: 'rifle',
    auto: true,
    mag: 30,
    reserve: 120,
    interval: 60 / 700,
    damage: 28,
    spread: [0.021, 0.0035],
    recoil: 0.0105,
    reload: 2.1,
    reloadEmpty: 2.6,
    aimFov: 0.62,
    range: 220,
  },
  pistol: {
    key: 'pistol',
    auto: false,
    mag: 15,
    reserve: Infinity,
    interval: 0.14,
    damage: 34,
    spread: [0.016, 0.004],
    recoil: 0.017,
    reload: 1.5,
    reloadEmpty: 1.8,
    aimFov: 0.8,
    range: 120,
  },
};
/** The marksman rifle: slow, hard-hitting, with a magnifying scope. */
WEAPONS.marksman = {
  key: 'marksman',
  auto: false,
  mag: 10,
  reserve: 30,
  interval: 0.3,
  damage: 78,
  spread: [0.034, 0.0006],
  recoil: 0.03,
  reload: 2.5,
  reloadEmpty: 3,
  aimFov: 0.34,
  range: 300,
};
export const HEADSHOT = 2.2;
export const SWITCH_TIME = 0.42;

export const GRENADE = { fuse: 2.2, speed: 15, lift: 3.2, radius: 6.5, damage: 170, selfDamage: 80 };

/**
 * Enemy soldiers. `near` and `far` bound the distance each kind likes to
 * fight from; `mag` is shots before a reload of `reload` seconds; `burst` is shots per burst, `pause` the rest between bursts,
 * `aim` the chance of a hit at point-blank range.
 */
export const ENEMIES = {
  rifle: {
    key: 'rifle',
    health: 100,
    speed: 3.4,
    near: 9,
    far: 24,
    burst: [3, 4],
    interval: 0.12,
    pause: [0.8, 1.5],
    damage: 11,
    aim: 0.6,
    mag: 24,
    reload: 2.4,
    head: HEADSHOT,
  },
  rush: {
    key: 'rush',
    health: 75,
    speed: 5.4,
    near: 3.5,
    far: 9,
    burst: [4, 6],
    interval: 0.085,
    pause: [0.5, 1.0],
    damage: 8,
    aim: 0.52,
    mag: 30,
    reload: 2,
    head: HEADSHOT,
  },
  heavy: {
    key: 'heavy',
    health: 340,
    speed: 2.3,
    near: 7,
    far: 26,
    burst: [8, 12],
    interval: 0.1,
    pause: [1.3, 2.0],
    damage: 10,
    aim: 0.48,
    mag: 60,
    reload: 3.6,
    head: 1.4,
  },
};
/** The shape shots are tested against, standing and ducked. */
export const ENEMY_BODY = {
  radius: 0.36,
  shoulder: 1.48,
  headY: 1.63,
  headRadius: 0.2,
  eye: 1.6,
  duckedShoulder: 0.98,
  duckedHeadY: 1.1,
  duckedEye: 1.02,
};

/** How many valuables the backpack holds; when it is full the cheapest one is left behind. */
export const BACKPACK = 12;

export const MISSION = {
  introSeconds: 3,
  interactRange: 2.4,
  /** Holding the key this long plugs the uplink in; the transfer then runs by itself. */
  downloadSeconds: 1.5,
  /** Each sector has three transfer phases separated by short signal checks. */
  terminalProfiles: {
    yard: { seconds: 72, waves: [{ rifle: 2, rush: 1 }, { rush: 2 }, { rifle: 2 }] },
    plant: { seconds: 82, waves: [{ rifle: 2 }, { rifle: 1, rush: 1 }, { rifle: 2, rush: 1 }] },
    office: { seconds: 90, waves: [{ rifle: 2, rush: 1 }, { rush: 2 }, { rifle: 1, heavy: 1 }] },
  },
  transferRange: 12,
  relayRange: 1.65,
  relaySeconds: 2,
  /** What a finished terminal hands back: armour, and bandages up to this many. */
  resupplyArmor: 50,
  resupplyBandages: 2,
  resupplyRifle: 42,
  resupplyMarksman: 12,
  searchSeconds: 1.2,
  extractSeconds: 4,
  /** How long the helicopter takes to arrive once the last terminal is done. */
  heliSeconds: 64,
  maxAlive: 10,
  spawnStagger: 1.85,
  spawnFar: 15,
  /** After the last terminal, one more soldier every so often while few are left. */
  pursuitEvery: 8,
  pursuitMinAlive: 4,
  pursuitExtra: 8,
  hearing: 42,
  sight: 55,
  /** How far a soldier who has not been alerted can spot the operator. */
  guardSight: 20,
  intelValue: 30000,
};

/**
 * What a supply crate can hold. `rarity` runs 1 (common) to 6 (rarest) and
 * sets the colour an item is shown in; `value` is its worth once carried out.
 */
export const SUPPLIES = [
  { key: 'ammo', rarity: 1, give: { ammo: 60 } },
  { key: 'bandage', rarity: 2, give: { bandages: 1 } },
  { key: 'plate', rarity: 3, give: { armor: 40 } },
  { key: 'grenade', rarity: 2, give: { grenades: 1 } },
  // Attachments fit the assault rifle as soon as they are found.
  { key: 'foregrip', rarity: 3, give: { recoil: 0.72 } },
  { key: 'extmag', rarity: 3, give: { mag: 10 } },
  { key: 'marksmanAmmo', rarity: 2, give: { marksman: 20 } },
];
export const VALUABLES = [
  { key: 'wire', rarity: 1, value: 800 },
  { key: 'toolbox', rarity: 1, value: 1200 },
  { key: 'battery', rarity: 2, value: 2400 },
  { key: 'drive', rarity: 3, value: 6800 },
  { key: 'medkit', rarity: 3, value: 9500 },
  { key: 'radio', rarity: 4, value: 15000 },
  { key: 'goggles', rarity: 4, value: 21000 },
  { key: 'gold', rarity: 5, value: 38000 },
  { key: 'files', rarity: 5, value: 52000 },
  { key: 'chip', rarity: 6, value: 128000 },
];
/** How often each rarity turns up, 1 to 6. */
export const RARITY_WEIGHT = [0, 30, 26, 20, 13, 8, 3];
