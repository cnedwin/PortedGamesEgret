// How the Monkey King moves and fights: one step of the rules at a time, with nothing here that draws or listens.
// Lengths are stage units (the stage is 960 by 540, y down) and times are seconds. `x`, `y` are where his feet are.
import { moveBody } from './level.mjs';

/** The numbers his movement is made of. */
export const TUNE = {
  run: 330,
  groundAccel: 3600,
  groundBrake: 4400,
  airAccel: 2300,
  jump: 880,
  gravity: 2500,
  fallGravity: 3500,
  maxFall: 1250,
  /** Letting go of jump while rising keeps this much of the upward speed. */
  cutJump: 0.42,
  /** How long after walking off an edge a jump still counts, and how early a jump may be asked for before landing. */
  coyote: 0.09,
  buffer: 0.12,
  dash: { speed: 900, seconds: 0.26, cooldown: 0.46 },
  /** The crouch after a fall, longer for a harder one. */
  land: 0.12,
  halfWidth: 16,
  height: 112,
  /** Peaches: the blows he can take before he falls. */
  health: 5,
  /** A blow throws him back for this long, and for this long after it nothing more can hurt him. */
  hurt: { seconds: 0.34, speed: 300, lift: 320, safe: 1.1 },
  /** Plucking a tuft of hair and blowing on it: how long it takes, and the moment in it at which the hairs change. */
  conjure: { seconds: 0.7, at: 0.4 }
};

/**
 * The three blows of the combination. `hitAt` is when the staff lands and `chainAt` when the next blow may begin;
 * `box` is where it reaches, measured from his feet with x forward and y up; `kind` is how what it meets reacts.
 * The lengths agree with the puppet's animations in tools/puppets/wukong.mjs.
 */
export const ATTACKS = [
  { name: 'attack1', seconds: 0.34, hitAt: 0.1, chainAt: 0.18, lunge: 190, box: { x: 6, y: 34, width: 124, height: 82 }, power: 1, kind: 'hit', stop: 0.05, shake: 0.28 },
  { name: 'attack2', seconds: 0.36, hitAt: 0.12, chainAt: 0.2, lunge: 150, box: { x: 0, y: 20, width: 118, height: 150 }, power: 1, kind: 'lift', stop: 0.065, shake: 0.34 },
  { name: 'attack3', seconds: 0.56, hitAt: 0.235, chainAt: 0.5, lunge: 260, box: { x: 4, y: 0, width: 138, height: 136 }, power: 2, kind: 'slam', stop: 0.12, shake: 0.7 }
];
/** How long after a blow ends the next press still continues the combination. */
export const CHAIN_GRACE = 0.24;

export function createHero(x, y) {
  return { x, y, vx: 0, vy: 0, facing: 1, grounded: true, state: 'move', time: 0, attack: 0, serial: 0, struck: false, queued: false, grace: 0, coyote: 0, buffer: 0, cut: false, dashCooldown: 0, airDash: true, landing: 0, stride: 0, health: TUNE.health, safe: 0 };
}

/** The room he takes up, as a rectangle of the stage: what a spear or an arrow has to meet. */
export const bodyOf = hero => ({ x: hero.x - TUNE.halfWidth, y: hero.y - TUNE.height + 10, width: TUNE.halfWidth * 2, height: TUNE.height - 10 });

/** Whether a blow would land on him now. The cloud roll carries him through anything, and so does working his magic. */
export const canBeHurt = hero => hero.state !== 'down' && hero.state !== 'dash' && hero.state !== 'conjure' && hero.safe <= 0;

/** He stops what he is doing to pluck a tuft of hair. Returns whether he could: not while thrown back or fallen. */
export function conjure(hero) {
  if (hero.state === 'hurt' || hero.state === 'down' || hero.state === 'conjure') return false;
  Object.assign(hero, { state: 'conjure', time: 0, queued: false, grace: 0, serial: hero.serial + 1 });
  return true;
}

/**
 * He is struck from the side `from` (an x). Returns what happened: `hurt`, and `down` with it if that was his
 * last peach; nothing if the blow could not land.
 */
export function hurtHero(hero, from, damage = 1) {
  if (!canBeHurt(hero)) return [];
  const away = hero.x >= from ? 1 : -1;
  hero.health = Math.max(0, hero.health - damage);
  Object.assign(hero, { state: hero.health ? 'hurt' : 'down', time: 0, vx: away * TUNE.hurt.speed, vy: -TUNE.hurt.lift, grounded: false, facing: -away, safe: TUNE.hurt.safe, queued: false, grace: 0, serial: hero.serial + 1 });
  return hero.health ? [{ type: 'hurt' }] : [{ type: 'hurt' }, { type: 'down' }];
}

/** Stands him up again at a place, whole. */
export function reviveHero(hero, x, y) {
  Object.assign(hero, { x, y, vx: 0, vy: 0, facing: 1, grounded: true, state: 'move', time: 0, health: TUNE.health, safe: TUNE.hurt.safe, landing: 0, grace: 0, queued: false, buffer: 0, serial: hero.serial + 1 });
}

const toward = (value, goal, amount) => (value < goal ? Math.min(goal, value + amount) : Math.max(goal, value - amount));

/** Where a blow reaches, as a rectangle of the stage. */
export function reach(hero, attack) {
  const { x, y, width, height } = attack.box;
  return { x: hero.facing > 0 ? hero.x + x : hero.x - x - width, y: hero.y - y - height, width, height };
}

function beginAttack(hero, index, input, events) {
  if (input.move) hero.facing = Math.sign(input.move);
  Object.assign(hero, { state: 'attack', attack: index, time: 0, struck: false, queued: false, grace: 0, serial: hero.serial + 1 });
  events.push({ type: 'swing', attack: ATTACKS[index] });
}

/**
 * One step. `input` is `{ move, jump, jumpHeld, attack, dash }`: `move` from -1 to 1, the others true on the step
 * they are pressed (`jumpHeld` while held). `level` is the ground, as rules/level.mjs reads it. Returns what
 * happened, for the stage to show and sound: `jump`, `land`, `dash`, `swing`, `strike` (with the rectangle the
 * staff sweeps) and `step`.
 */
export function stepHero(hero, input, dt, level) {
  const events = [];
  hero.dashCooldown = Math.max(0, hero.dashCooldown - dt);
  hero.landing = Math.max(0, hero.landing - dt);
  hero.grace = Math.max(0, hero.grace - dt);
  hero.safe = Math.max(0, hero.safe - dt);
  hero.buffer = input.jump ? TUNE.buffer : Math.max(0, hero.buffer - dt);
  hero.coyote = hero.grounded ? TUNE.coyote : Math.max(0, hero.coyote - dt);

  // Thrown back by a blow, or lying where he fell, he answers to nothing.
  if (hero.state === 'hurt' || hero.state === 'down') {
    hero.time += dt;
    if (hero.grounded) hero.vx = toward(hero.vx, 0, TUNE.groundBrake * 0.5 * dt);
    if (hero.state === 'hurt' && hero.time >= TUNE.hurt.seconds) hero.state = 'move';
    input = { move: 0, jump: false, jumpHeld: true, attack: false, dash: false };
    hero.buffer = 0;
  }

  // Working his magic he stands where he is and answers to nothing until it is done.
  if (hero.state === 'conjure') {
    hero.time += dt;
    hero.vx = toward(hero.vx, 0, TUNE.groundBrake * dt);
    if (hero.time >= TUNE.conjure.seconds) hero.state = 'move';
    input = { move: 0, jump: false, jumpHeld: true, attack: false, dash: false };
    hero.buffer = 0;
  }

  const mayDash = input.dash && hero.dashCooldown === 0 && (hero.grounded || hero.airDash);
  if (hero.state === 'attack') {
    const attack = ATTACKS[hero.attack];
    hero.time += dt;
    if (input.attack) hero.queued = true;
    // He steps into the blow, and stands his ground once it has landed.
    const pushing = hero.time < attack.hitAt + 0.03;
    hero.vx = pushing ? hero.facing * attack.lunge * (1 - hero.time / (attack.hitAt + 0.03)) : toward(hero.vx, 0, TUNE.groundBrake * dt);
    if (!hero.struck && hero.time >= attack.hitAt) {
      hero.struck = true;
      events.push({ type: 'strike', attack, box: reach(hero, attack) });
    }
    if (hero.struck && mayDash) hero.state = 'move';
    else if (hero.time >= attack.chainAt && hero.queued && hero.attack < ATTACKS.length - 1) beginAttack(hero, hero.attack + 1, input, events);
    else if (hero.time >= attack.chainAt && hero.buffer > 0 && (hero.grounded || hero.coyote > 0)) hero.state = 'move';
    else if (hero.time >= attack.seconds) {
      hero.state = 'move';
      hero.grace = hero.attack < ATTACKS.length - 1 ? CHAIN_GRACE : 0;
    }
  }
  if (hero.state === 'dash') {
    hero.time += dt;
    hero.vx = hero.facing * TUNE.dash.speed;
    hero.vy = 0;
    if (hero.time >= TUNE.dash.seconds) {
      hero.state = 'move';
      hero.vx = hero.facing * TUNE.run;
    }
  } else if (hero.state === 'move') {
    if (input.move) hero.facing = Math.sign(input.move);
    const goal = input.move * TUNE.run,
      rate = !hero.grounded ? TUNE.airAccel : input.move && Math.sign(input.move) === Math.sign(hero.vx || input.move) ? TUNE.groundAccel : TUNE.groundBrake;
    hero.vx = toward(hero.vx, goal, rate * dt);
    if (mayDash) {
      if (!hero.grounded) hero.airDash = false;
      Object.assign(hero, { state: 'dash', time: 0, vx: hero.facing * TUNE.dash.speed, vy: 0, dashCooldown: TUNE.dash.cooldown, serial: hero.serial + 1 });
      events.push({ type: 'dash' });
    } else if (hero.buffer > 0 && (hero.grounded || hero.coyote > 0)) {
      Object.assign(hero, { vy: -TUNE.jump, grounded: false, coyote: 0, buffer: 0, cut: false });
      events.push({ type: 'jump' });
    } else if (input.attack) beginAttack(hero, hero.grace > 0 ? hero.attack + 1 : 0, input, events);
  }

  if (hero.state !== 'dash') {
    // Letting go early makes a short hop; a blow struck in the air hangs there for a moment.
    if (!input.jumpHeld && hero.vy < 0 && !hero.cut) (hero.vy *= TUNE.cutJump), (hero.cut = true);
    const pull = hero.vy < 0 ? TUNE.gravity : TUNE.fallGravity,
      hang = hero.state === 'attack' && !hero.grounded ? 0.3 : 1;
    hero.vy = Math.min(TUNE.maxFall, hero.vy + pull * hang * dt);
    if (hang < 1 && hero.vy > 160) hero.vy = 160;
  }

  // Sideways until a wall, then down onto whatever is under his feet.
  const was = hero.grounded,
    { landed } = moveBody(hero, dt, level, TUNE);
  if (hero.grounded) {
    hero.airDash = true;
    if (!was) {
      hero.landing = landed > 500 && hero.state === 'move' ? TUNE.land : 0;
      events.push({ type: 'land', speed: landed });
    }
  }
  if (hero.grounded && hero.state === 'move' && Math.abs(hero.vx) > 60) {
    hero.stride += Math.abs(hero.vx) * dt;
    if (hero.stride > 86) (hero.stride = 0), events.push({ type: 'step' });
  }
  return events;
}

/** The animation that shows what he is doing, and a number that changes whenever it should start again. */
export function animationOf(hero) {
  if (hero.state === 'down' || hero.state === 'hurt' || hero.state === 'conjure') return { name: hero.state, key: hero.serial };
  if (hero.state === 'dash') return { name: 'dash', key: hero.serial };
  if (hero.state === 'attack') return { name: ATTACKS[hero.attack].name, key: hero.serial };
  if (!hero.grounded) return { name: hero.vy < 60 ? 'jump' : 'fall', key: 0 };
  if (hero.landing > 0) return { name: 'land', key: 0 };
  return { name: Math.abs(hero.vx) > 50 ? 'run' : 'idle', key: 0 };
}
