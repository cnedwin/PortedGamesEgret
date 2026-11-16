// The soldiers of heaven: what each kind is made of, how it decides what to do, and how it takes a blow.
// Nothing here draws. A foe is `{ kind, x, y, vx, vy, facing, state, time, health, ... }` with `y` at its feet.
import { groundUnder, moveBody, solidAt } from './level.mjs';

/**
 * The kinds. `sight` is how far along the ground a foe notices him and `tall` how far above or below; `windup`
 * is the warning before a blow, `attack` the blow's length and `hitAt` the moment in it that counts; `rest` is
 * the pause before the next. A spearman's `reach` is measured from his feet, x forward and y up.
 */
export const FOES = {
  spearman: { health: 5, halfWidth: 18, height: 116, walk: 70, chase: 150, patrol: 96, sight: 360, tall: 70, range: 112, windup: 0.42, attack: 0.5, hitAt: 0.1, lunge: 130, rest: 0.8, reach: { x: 8, y: 46, width: 128, height: 46 } },
  archer: { health: 3, halfWidth: 18, height: 116, walk: 0, chase: 0, patrol: 0, sight: 600, tall: 170, range: 600, windup: 0.62, attack: 0.4, hitAt: 0.04, lunge: 0, rest: 1.5, arrow: { speed: 500, seconds: 1.7, from: 86, tilt: 0.36 } }
};
/** How a blow of each kind is felt: seconds stunned, speed thrown back, and speed thrown up. */
const FELT = { hit: [0.34, 170, 0], lift: [0.6, 60, 600], slam: [0.7, 260, 0] };
/** How long a fallen soldier lies there before he is cleared away. */
export const LIE = 1.3;
const GRAVITY = 2600;

export function createFoe(kind, x, y, id) {
  return { id, kind, x, y, vx: 0, vy: 0, facing: -1, grounded: true, state: 'idle', time: 0, health: FOES[kind].health, home: x, rest: 0.4, struck: false, serial: 0, gone: false };
}

/** The room a foe takes up, as a rectangle of the stage. */
export const foeBox = foe => ({ x: foe.x - FOES[foe.kind].halfWidth, y: foe.y - FOES[foe.kind].height, width: FOES[foe.kind].halfWidth * 2, height: FOES[foe.kind].height });

/** Whether a foe is still in the fight. */
export const standing = foe => foe.state !== 'down';

/** Where a spearman's thrust reaches, as a rectangle of the stage. */
export function thrust(foe) {
  const { x, y, width, height } = FOES[foe.kind].reach;
  return { x: foe.facing > 0 ? foe.x + x : foe.x - x - width, y: foe.y - y - height, width, height };
}

/**
 * A blow lands on a foe from the side `side` (1 when the striker stands to its left). Returns what happened:
 * `foe-hurt`, or `foe-down` if that was the end of him.
 */
export function hitFoe(foe, attack, side) {
  const [stun, back, up] = FELT[attack.kind];
  foe.health -= attack.power;
  // A soldier already thrusting is hurt by a light blow but not stopped by it: he has to be rolled away from.
  if (foe.health > 0 && foe.state === 'attack' && attack.kind === 'hit') return [{ type: 'foe-hurt', foe, held: true }];
  Object.assign(foe, { state: foe.health > 0 ? 'hurt' : 'down', time: 0, stun, vx: side * back * (foe.health > 0 ? 1 : 1.5), vy: up ? -up : foe.vy, facing: -side, struck: false, serial: foe.serial + 1 });
  return [{ type: foe.health > 0 ? 'foe-hurt' : 'foe-down', foe }];
}

const begin = (foe, state) => Object.assign(foe, { state, time: 0, struck: false, serial: foe.serial + 1 });
const slow = (value, amount) => (value > 0 ? Math.max(0, value - amount) : Math.min(0, value + amount));

/**
 * One step of a foe. `hero` is who it is watching (`{ x, y, state }`). Returns what happened: `foe-windup`,
 * `foe-strike` (with the rectangle the spear sweeps) and `arrow` (with the arrow let fly).
 */
export function stepFoe(foe, hero, dt, level) {
  const spec = FOES[foe.kind],
    events = [];
  foe.time += dt;
  foe.rest = Math.max(0, foe.rest - dt);
  const dx = hero.x - foe.x,
    sees = hero.state !== 'down' && Math.abs(dx) < spec.sight && Math.abs(hero.y - foe.y) < spec.tall;

  if (foe.state === 'down') {
    foe.vx = slow(foe.vx, 600 * dt);
    if (foe.time >= LIE) foe.gone = true;
  } else if (foe.state === 'hurt') {
    if (foe.grounded) foe.vx = slow(foe.vx, 700 * dt);
    if (foe.time >= foe.stun && foe.grounded) begin(foe, 'idle'), (foe.rest = Math.max(foe.rest, 0.25));
  } else if (foe.state === 'windup') {
    foe.vx = 0;
    if (foe.time >= spec.windup) begin(foe, 'attack');
  } else if (foe.state === 'attack') {
    // A spearman steps into the thrust; an archer stands.
    foe.vx = foe.time < spec.hitAt + 0.06 ? foe.facing * spec.lunge : slow(foe.vx, 1800 * dt);
    if (!foe.struck && foe.time >= spec.hitAt) {
      foe.struck = true;
      if (spec.arrow) {
        // The arrow is sent at where he stands now, as far up or down as a bow can be tilted.
        const from = { x: foe.x + foe.facing * 34, y: foe.y - spec.arrow.from },
          rise = Math.max(-spec.arrow.tilt, Math.min(spec.arrow.tilt, (hero.y - 60 - from.y) / Math.max(60, Math.abs(hero.x - from.x)))),
          length = Math.hypot(1, rise);
        events.push({ type: 'arrow', foe, arrow: { ...from, vx: (foe.facing * spec.arrow.speed) / length, vy: (rise * spec.arrow.speed) / length, life: spec.arrow.seconds } });
      } else events.push({ type: 'foe-strike', foe, box: thrust(foe) });
    }
    if (foe.time >= spec.attack) begin(foe, 'idle'), (foe.rest = spec.rest);
  } else {
    // Free to act: face him and close in, strike when near enough, or else walk the beat.
    let pace = 0;
    if (sees) {
      foe.facing = dx >= 0 ? 1 : -1;
      if (Math.abs(dx) <= spec.range && foe.rest === 0 && foe.grounded) {
        begin(foe, 'windup');
        events.push({ type: 'foe-windup', foe });
      } else if (Math.abs(dx) > spec.range * 0.9) pace = foe.facing * spec.chase;
      // Too close to use his weapon, he gives ground.
      else if (spec.walk && Math.abs(dx) < spec.range * 0.7) pace = -foe.facing * spec.walk;
    } else if (spec.patrol) {
      if (Math.abs(foe.x - foe.home) > spec.patrol) foe.facing = foe.x > foe.home ? -1 : 1;
      pace = foe.facing * spec.walk;
    }
    // He does not walk off an edge or into a wall; on patrol he turns round instead.
    if (pace) {
      const ahead = foe.x + Math.sign(pace) * (spec.halfWidth + 8);
      if (!groundUnder(level, ahead, foe.y) || solidAt(level, ahead, foe.y - 20)) {
        if (!sees) foe.facing = -foe.facing;
        pace = 0;
      }
    }
    if (foe.state !== 'windup') {
      foe.vx = foe.grounded ? pace : foe.vx;
      foe.state = pace ? 'walk' : 'idle';
    }
  }

  foe.vy = Math.min(1200, foe.vy + GRAVITY * dt);
  moveBody(foe, dt, level, spec);
  return events;
}

/** The animation that shows what a foe is doing, and a number that changes whenever it should start again. */
export function foeAnimation(foe) {
  if (foe.state === 'walk' || foe.state === 'idle') return { name: foe.state === 'walk' && FOES[foe.kind].walk ? 'walk' : 'idle', key: 0 };
  return { name: foe.state, key: foe.serial };
}
