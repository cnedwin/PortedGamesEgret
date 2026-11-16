// The body beyond the body: he plucks a tuft of hair, blows on it, and every hair is a small Monkey King. They
// tumble out of the air, run at whoever is near, and beat him in a crowd; when their time is up they are hairs
// again. Nothing here draws.
//
// A clone is `{ id, x, y, vx, vy, facing, grounded, state, time, blow, target, ... }` with `y` at its feet.
// `state` is `wait` (not yet out), `tumble` (in the air it came out into), `run` or `attack`.
import { ATTACKS, TUNE } from './hero.mjs';
import { moveBody } from './level.mjs';

export const HAIRS = {
  /** Blows of his own that must land before he can do it. */
  need: 30,
  count: 100,
  /** How long they stay, and over how long they come out. */
  seconds: 7,
  wave: 0.8,
  speed: [250, 420],
  /** How far from him an enemy may be and still be theirs, and how far they stray with nobody to go for. */
  sight: 900,
  stray: 260,
  /** A crowd's blows are counted this often, and it takes this many at one target to count as a blow. */
  every: 0.32,
  crowd: 3,
  /** Each is this much of his size. */
  scale: 0.68,
  halfWidth: 10,
  height: 76
};
/** What a crowd's blow is to whatever it lands on: light, and now and then one that lifts. */
export const CROWD_BLOWS = [
  { name: 'crowd', kind: 'hit', power: 1, stop: 0, shake: 0.14 },
  { name: 'crowd', kind: 'lift', power: 1, stop: 0, shake: 0.2 }
];
const GRAVITY = 2600;

/** Numbers that look like chance and are the same every time for the same seed. */
const chance = seed => () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;

/** The clones of one tuft, all still to come out, from where he stands. */
export function createClones(hero, count = HAIRS.count, seed = 1) {
  const any = chance(seed),
    [slowest, fastest] = HAIRS.speed;
  return Array.from({ length: count }, (_, id) => {
    const side = id % 2 ? 1 : -1;
    return {
      id,
      x: hero.x,
      y: hero.y - 50,
      // They are blown out to both sides and upward.
      vx: side * (60 + any() * 480),
      vy: -(240 + any() * 660),
      facing: side,
      grounded: false,
      state: 'wait',
      time: 0,
      delay: (id / count) * HAIRS.wave,
      speed: slowest + any() * (fastest - slowest),
      // Where it stands about its target: which side, and how far out.
      side,
      slot: 26 + ((id >> 1) % 14) * 17 + any() * 12,
      hop: 0.6 + any() * 1.4,
      blow: id % ATTACKS.length,
      target: null,
      serial: 0
    };
  });
}

/** Whether a clone is out on the stage. */
export const out = clone => clone.state !== 'wait';

/**
 * One step of all of them. `targets` are who they may go for, each `{ x, y }`, nearest to him first, and `home`
 * is where he stands. Returns the targets at which a crowd's blow landed on this step, each as `{ target, attack }`.
 */
export function stepClones(clones, targets, home, dt, level, crowd) {
  const landed = [];
  for (const clone of clones) {
    clone.time += dt;
    if (clone.state === 'wait') {
      if (clone.time < clone.delay) continue;
      Object.assign(clone, { state: 'tumble', time: 0 });
    }
    const target = targets.length ? targets[clone.id % targets.length] : null;
    clone.target = target;
    if (clone.state === 'tumble') {
      if (clone.grounded) Object.assign(clone, { state: 'run', time: 0 });
    } else if (clone.state === 'attack') {
      if (clone.grounded) clone.vx = 0;
      if (clone.time >= ATTACKS[clone.blow].seconds || !target) Object.assign(clone, { state: 'run', time: 0 });
    } else if (target) {
      // It makes for its place beside whoever it is after, jumping for one who stands higher.
      const place = target.x + clone.side * clone.slot,
        dx = place - clone.x;
      if (Math.abs(dx) > 14) {
        clone.facing = dx > 0 ? 1 : -1;
        if (clone.grounded) clone.vx = clone.facing * clone.speed;
        if (clone.grounded && target.y < clone.y - 40 && Math.abs(target.x - clone.x) < 200) clone.vy = -TUNE.jump * 0.92;
      } else if (clone.grounded && Math.abs(target.y - clone.y) < 50) {
        Object.assign(clone, { state: 'attack', time: 0, vx: 0, facing: target.x >= clone.x ? 1 : -1, blow: (clone.blow + 1) % ATTACKS.length, serial: clone.serial + 1 });
      } else if (clone.grounded) clone.vx = 0;
    } else if (clone.grounded) {
      // With nobody to go for they run about him, and hop now and then.
      if (Math.abs(clone.x - home) > HAIRS.stray + clone.slot) clone.facing = clone.x < home ? 1 : -1;
      clone.vx = clone.facing * clone.speed * 0.6;
      if (clone.time >= clone.hop) ((clone.vy = -TUNE.jump * 0.6), (clone.time = 0));
    }
    clone.vy = Math.min(1200, clone.vy + GRAVITY * dt);
    const { wall } = moveBody(clone, dt, level, HAIRS);
    if ((wall || clone.x <= HAIRS.halfWidth || clone.x >= level.width - HAIRS.halfWidth) && clone.state === 'run') {
      // A wall is jumped at when someone is beyond it, and turned from otherwise.
      if (target && clone.grounded) clone.vy = -TUNE.jump * 0.92;
      else if (!target) clone.facing = clone.x < level.width / 2 ? 1 : -1;
    }
  }
  // Now and then, every target with a crowd about it takes a blow.
  crowd.wait -= dt;
  if (crowd.wait <= 0) {
    crowd.wait += HAIRS.every;
    crowd.blows++;
    for (const target of targets) {
      let about = 0;
      for (const clone of clones) if (clone.state === 'attack' && clone.target === target && Math.abs(clone.x - target.x) < 280) about++;
      if (about >= HAIRS.crowd) landed.push({ target, attack: CROWD_BLOWS[crowd.blows % 3 === 2 ? 1 : 0] });
    }
  }
  return landed;
}

/** The animation that shows what a clone is doing, whether it goes round, and a number that changes when it should start again. */
export function cloneAnimation(clone) {
  if (clone.state === 'tumble') return { name: 'dash', loop: true, key: 0 };
  if (clone.state === 'attack') return { name: ATTACKS[clone.blow].name, loop: false, key: clone.serial };
  if (!clone.grounded) return clone.vy < 60 ? { name: 'jump', loop: false, key: 0 } : { name: 'fall', loop: true, key: 0 };
  return { name: Math.abs(clone.vx) > 40 ? 'run' : 'idle', loop: true, key: 0 };
}
