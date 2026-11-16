// The soldiers of heaven, and the cranes of the orchard: what each kind is made of, how it decides what to do, and
// how it takes a blow. Nothing here draws. A foe is `{ kind, x, y, vx, vy, facing, state, time, health, ... }` with
// `y` at its feet; for one that flies, `y` is the middle of it.
import { groundUnder, moveBody, solidAt } from './level.mjs';

/**
 * The kinds. `sight` is how far along the ground a foe notices him and `tall` how far above or below; `windup`
 * is the warning before a blow, `attack` the blow's length and `hitAt` the moment in it that counts; `rest` is
 * the pause before the next. A spearman's `reach` is measured from his feet, x forward and y up.
 */
export const FOES = {
  spearman: { health: 5, halfWidth: 18, height: 116, walk: 70, chase: 150, patrol: 96, sight: 360, tall: 70, range: 112, windup: 0.42, attack: 0.5, hitAt: 0.1, lunge: 130, rest: 0.8, reach: { x: 8, y: 46, width: 128, height: 46 } },
  archer: { health: 3, halfWidth: 18, height: 116, walk: 0, chase: 0, patrol: 0, sight: 600, tall: 170, range: 600, windup: 0.62, attack: 0.4, hitAt: 0.04, lunge: 0, rest: 1.5, arrow: { speed: 500, seconds: 1.7, from: 86, tilt: 0.36 } },
  // A shield-bearer takes nothing from in front until a lifting blow has knocked his shield aside: `turn` is how
  // long he takes to face whoever has got behind him, and `open` how long the shield stays aside.
  guard: { health: 6, halfWidth: 20, height: 118, walk: 55, chase: 105, patrol: 80, sight: 340, tall: 70, range: 86, windup: 0.5, attack: 0.56, hitAt: 0.11, lunge: 60, rest: 1.1, reach: { x: 4, y: 0, width: 104, height: 124 }, shield: { turn: 0.55, open: 1.2, block: 0.26 } },
  // A crane keeps its place in the air, and stoops at whoever comes under it: `stoop` is how fast, `back` how
  // fast it climbs to its place again, and `sway` how far it drifts to either side while it waits.
  crane: { health: 2, halfWidth: 24, height: 44, flies: true, sight: 430, tall: 330, windup: 0.5, stoop: 640, back: 260, sway: 56, rest: 1.7 }
};
/** How a blow of each kind is felt: seconds stunned, speed thrown back, and speed thrown up. */
const FELT = { hit: [0.34, 170, 0], lift: [0.6, 60, 600], slam: [0.7, 260, 0] };
/** How long a fallen soldier lies there before he is cleared away. */
export const LIE = 1.3;
const GRAVITY = 2600;

export function createFoe(kind, x, y, id) {
  const flies = !!FOES[kind].flies;
  return { id, kind, x, y, vx: 0, vy: 0, facing: -1, grounded: !flies, flies, state: 'idle', time: 0, health: FOES[kind].health, home: x, perch: y, rest: 0.4, struck: false, serial: 0, gone: false, turning: 0, blocked: 0, blocks: 0 };
}

/** The room a foe takes up, as a rectangle of the stage. */
export function foeBox(foe) {
  const { halfWidth, height } = FOES[foe.kind];
  return { x: foe.x - halfWidth, y: foe.y - (foe.flies ? height / 2 : height), width: halfWidth * 2, height };
}

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
  const [stun, back, up] = FELT[attack.kind],
    { shield } = FOES[foe.kind];
  // A shield turned toward the blow takes it, unless the blow is the one that lifts: that knocks the shield aside,
  // and until he has it back everything lands.
  if (shield && foe.facing === -side && foe.state !== 'open' && foe.state !== 'hurt') {
    if (attack.kind !== 'lift') {
      Object.assign(foe, { blocked: shield.block, blocks: foe.blocks + 1, vx: side * 40 });
      return [{ type: 'foe-block', foe }];
    }
    foe.health -= attack.power;
    if (foe.health > 0) {
      Object.assign(foe, { state: 'open', time: 0, stun: shield.open, vx: side * 90, struck: false, serial: foe.serial + 1 });
      return [{ type: 'foe-open', foe }];
    }
    foe.health += attack.power;
  }
  foe.health -= attack.power;
  // With his shield aside he takes every blow where he stands, and has no time to right himself between them.
  if (foe.state === 'open' && foe.health > 0) return [{ type: 'foe-hurt', foe, held: true }];
  if (foe.flies) {
    // What flies is knocked along the air, and falls out of it when it is beaten.
    Object.assign(foe, { state: foe.health > 0 ? 'hurt' : 'down', time: 0, stun: 0.32, vx: side * (back + 80), vy: foe.health > 0 ? -up * 0.25 : -160, facing: -side, struck: false, serial: foe.serial + 1 });
    return [{ type: foe.health > 0 ? 'foe-hurt' : 'foe-down', foe }];
  }
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
  if (foe.flies) return stepFlier(foe, hero, dt, level);
  const spec = FOES[foe.kind],
    events = [];
  foe.time += dt;
  foe.rest = Math.max(0, foe.rest - dt);
  foe.blocked = Math.max(0, foe.blocked - dt);
  const dx = hero.x - foe.x,
    sees = hero.state !== 'down' && Math.abs(dx) < spec.sight && Math.abs(hero.y - foe.y) < spec.tall;

  if (foe.state === 'down') {
    foe.vx = slow(foe.vx, 600 * dt);
    if (foe.time >= LIE) foe.gone = true;
  } else if (foe.state === 'hurt' || foe.state === 'open') {
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
    // A shield-bearer is slow to come about, which is the moment to be had behind him.
    const toward = dx >= 0 ? 1 : -1,
      slowTurn = spec.shield && sees && foe.facing !== toward;
    foe.turning = slowTurn ? foe.turning + dt : 0;
    if (slowTurn && foe.turning < spec.shield.turn) {
      foe.vx = 0;
      foe.state = 'idle';
    } else if (sees) {
      foe.facing = toward;
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
    if (foe.state !== 'windup' && !(slowTurn && foe.turning < spec.shield.turn)) {
      foe.vx = foe.grounded ? pace : foe.vx;
      foe.state = pace ? 'walk' : 'idle';
    }
  }

  foe.vy = Math.min(1200, foe.vy + GRAVITY * dt);
  moveBody(foe, dt, level, spec);
  return events;
}

/**
 * One step of a foe that flies. It keeps its place, swaying, until it sees him under it; then it rears as a
 * warning and stoops along a straight line at where he stood, and climbs back to its place. Returns `foe-windup`,
 * `foe-dive`, and `foe-touch` (with the room it takes up) on every step of the stoop.
 */
function stepFlier(foe, hero, dt, level) {
  const spec = FOES[foe.kind],
    events = [];
  foe.time += dt;
  foe.rest = Math.max(0, foe.rest - dt);
  const dx = hero.x - foe.x,
    sees = hero.state !== 'down' && Math.abs(dx) < spec.sight && hero.y > foe.y && hero.y - foe.y < spec.tall;
  if (foe.state === 'down') {
    // It falls to whatever is under it, and lies there.
    if (!foe.grounded) {
      foe.vx = slow(foe.vx, 200 * dt);
      foe.vy = Math.min(1200, foe.vy + GRAVITY * dt);
      moveBody(foe, dt, level, { halfWidth: spec.halfWidth, height: spec.height / 2 });
      if (foe.grounded) foe.time = 0;
    } else if (foe.time >= LIE) foe.gone = true;
    return events;
  }
  if (foe.state === 'hurt') {
    foe.vx = slow(foe.vx, 500 * dt);
    foe.vy = slow(foe.vy, 500 * dt);
    if (foe.time >= foe.stun) begin(foe, 'rise');
  } else if (foe.state === 'windup') {
    foe.vx = foe.vy = 0;
    if (foe.time >= spec.windup) {
      // The line of the stoop is fixed as it begins: he may step out of it.
      const to = { x: hero.x - foe.x, y: hero.y - 46 - foe.y },
        length = Math.hypot(to.x, to.y) || 1;
      begin(foe, 'attack');
      Object.assign(foe, { vx: (to.x / length) * spec.stoop, vy: (Math.max(to.y, 40) / length) * spec.stoop, floor: hero.y - 30 });
      events.push({ type: 'foe-dive', foe });
    }
  } else if (foe.state === 'attack') {
    events.push({ type: 'foe-touch', foe, box: foeBox(foe) });
    if (foe.y >= foe.floor || foe.time > 1.4) (begin(foe, 'rise'), (foe.rest = spec.rest));
  } else if (foe.state === 'rise') {
    // Back to its place, by the straight way.
    const to = { x: foe.home - foe.x, y: foe.perch - foe.y },
      length = Math.hypot(to.x, to.y);
    if (length < spec.back * dt + 2) (Object.assign(foe, { x: foe.home, y: foe.perch, vx: 0, vy: 0 }), begin(foe, 'idle'));
    else Object.assign(foe, { vx: (to.x / length) * spec.back, vy: (to.y / length) * spec.back, facing: to.x >= 0 ? 1 : -1 });
  } else {
    // Keeping its place: a slow sway from side to side and a slower one up and down.
    foe.vx = Math.cos(foe.time * 0.9 + foe.id) * spec.sway * 0.9;
    foe.vy = Math.cos(foe.time * 2.1 + foe.id) * 18;
    if (sees) {
      foe.facing = dx >= 0 ? 1 : -1;
      if (foe.rest === 0) {
        begin(foe, 'windup');
        events.push({ type: 'foe-windup', foe });
      }
    } else if (Math.abs(foe.vx) > 8) foe.facing = foe.vx > 0 ? 1 : -1;
  }
  foe.x = Math.min(level.width - spec.halfWidth, Math.max(spec.halfWidth, foe.x + foe.vx * dt));
  foe.y += foe.vy * dt;
  return events;
}

/** The animation that shows what a foe is doing, and a number that changes whenever it should start again. */
export function foeAnimation(foe) {
  if (foe.flies) return foe.state === 'idle' || foe.state === 'rise' ? { name: 'fly', key: 0 } : { name: foe.state === 'attack' ? 'dive' : foe.state, key: foe.serial };
  if (foe.state === 'walk' || foe.state === 'idle') return foe.blocked > 0 ? { name: 'block', key: 'b' + foe.blocks } : { name: foe.state === 'walk' && FOES[foe.kind].walk ? 'walk' : 'idle', key: 0 };
  return { name: foe.state, key: foe.serial };
}
