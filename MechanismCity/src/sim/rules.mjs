// 机关城的数值：重力、弩力、木石之重、机关的力道。
// The numbers of the city. Distances are world units (one tile is 32), times are seconds.

export const RULES = {
  gravity: 980,
  step: 1 / 120, // the world's fixed step: fast pellets cross no wall in one
  settle: 2, // seconds the city is left to settle before the first shot
  minSpeed: 320, // the bow's pellet speed at power 0 and at 100
  maxSpeed: 1120,
  muzzle: 30, // where a pellet leaves the bow, from its pivot
  restSpeed: 14, // slower than this is at rest
  pelletRest: 1.2, // a pellet at rest this long is picked up
  pelletLife: 9,
  readyAfter: 0.35, // the city is still this long before the next shot
  loseAfter: 2.2, // out of pellets and still this long: the level is lost
  comboWindow: 1.6, // a second mechanism within this of the last makes a combo
  seesawTilt: 20, // degrees
  seesawTime: 0.16,
  seesawMass: 140, // a body lighter than this does not bring an end down
  seesawThrow: 1150, // the fastest a seesaw throws
  seesawLever: 1.6, // how much of the blow on one end the other end passes on
  seesawFling: 0.24, // how far over the post a thrown body goes, for its height
  gateSpeed: 160,
  thunderRadius: 120,
  thunderPush: 520
};

/** What the pellets of the bow are. */
export const PELLETS = {
  iron: { name: '铁丸', radius: 7, density: 3.2, restitution: 0.35 },
  heavy: { name: '沉丸', radius: 10, density: 5, restitution: 0.1 },
  thunder: { name: '雷丸', radius: 8, density: 2.5, restitution: 0.2 }
};

/** The stuff of the loose parts. */
export const BODY = {
  block: { density: 0.55, friction: 0.55 },
  crate: { density: 0.45, hp: 1, toughness: 260000 },
  stone: { density: 2.4, friction: 0.12 }
};

/** Which bodies meet which: every layer meets every other here; sensors meet what moves. */
export const LAYER = { ground: 1, loose: 2, pellet: 4, sensor: 8 };
