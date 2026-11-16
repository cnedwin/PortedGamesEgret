// Rule tests: how the Monkey King moves and fights, and how the yard counts his blows.
// Run from the LanternShadows folder with `node --test test/*.test.mjs`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import { COMBO_SECONDS, POST_ROOM, REVIVE_SECONDS, createAct, postBox, rankOf, remaining, stepAct } from '../src/rules/act.mjs';
import { FOES, LIE, createFoe, foeAnimation, hitFoe, stepFoe, thrust } from '../src/rules/foes.mjs';
import { ATTACKS, CHAIN_GRACE, TUNE, animationOf, bodyOf, createHero, hurtHero, reach, reviveHero, stepHero } from '../src/rules/hero.mjs';
import { CELL, flatLevel, lay, moveBody, readLevel } from '../src/rules/level.mjs';

const DT = 1 / 120,
  GROUND = 432;
/** A yard to try him in: a flat terrace 1920 wide with one cloud two cells above it. */
const YARD = lay(flatLevel(1920, GROUND), 'cloud', 15, 7, 4);
YARD.start = { x: 250 };
const CLOUD = { x: 15 * CELL, y: 7 * CELL, width: 4 * CELL };
const ask = (over = {}) => ({ move: 0, jump: false, jumpHeld: false, attack: false, dash: false, ...over });
/** Steps for `seconds` with the same input, and returns everything that happened. */
function run(hero, seconds, input = ask(), level = YARD) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += DT) events.push(...stepHero(hero, input, DT, level));
  return events;
}
/** One step with a press, then the rest of `seconds` without it. */
function press(hero, what, seconds = DT, held = {}) {
  const events = stepHero(hero, ask({ ...held, ...what }), DT, YARD);
  return events.concat(run(hero, seconds - DT, ask(held)));
}
const types = events => events.map(event => event.type);
const fresh = (x = YARD.start.x) => createHero(x, GROUND);

test('he gets up to speed quickly, turns to face where he goes, and stops when let go', () => {
  const hero = fresh();
  run(hero, 0.2, ask({ move: 1 }));
  assert.equal(hero.vx, TUNE.run);
  assert.equal(hero.facing, 1);
  run(hero, 0.2, ask({ move: -1 }));
  assert.equal(hero.vx, -TUNE.run);
  assert.equal(hero.facing, -1);
  run(hero, 0.2);
  assert.equal(hero.vx, 0);
  assert.equal(animationOf(hero).name, 'idle');
});

test('a held jump clears a ledge, a tapped one is a hop, and both come down where they went up', () => {
  const heightOf = held => {
    const hero = fresh();
    let top = hero.y;
    const events = press(hero, { jump: true }, DT, { jumpHeld: held });
    for (let i = 0; i < 400 && !hero.grounded; i++) (events.push(...stepHero(hero, ask({ jumpHeld: held }), DT, YARD)), (top = Math.min(top, hero.y)));
    assert.deepEqual(types(events), ['jump', 'land']);
    assert.equal(hero.y, GROUND);
    return GROUND - top;
  };
  const full = heightOf(true),
    hop = heightOf(false);
  assert.ok(full > 130 && full < 190, `full jump ${full}`);
  assert.ok(hop < full * 0.6, `hop ${hop} of ${full}`);
  // Two cells up is within a jump, with room to spare.
  assert.ok(full > 2 * CELL + 30, `a jump of ${full} against a ledge ${2 * CELL} up`);
});

test('a jump asked for just before landing, or just after walking off an edge, still happens', () => {
  const hero = fresh();
  press(hero, { jump: true }, 0.2, { jumpHeld: true });
  while (hero.y < GROUND - 14 || hero.vy < 0) stepHero(hero, ask(), DT, YARD);
  // Still in the air: the press is remembered until his feet touch.
  assert.equal(hero.grounded, false);
  const events = press(hero, { jump: true }, 0.1, { jumpHeld: true });
  assert.deepEqual(types(events), ['land', 'jump']);

  const cloud = CLOUD,
    walker = createHero(cloud.x + cloud.width - 2, cloud.y);
  run(walker, 0.08, ask({ move: 1 }));
  assert.equal(walker.grounded, false);
  assert.deepEqual(types(press(walker, { jump: true }, DT, { jumpHeld: true })), ['jump']);
  // Too late, and he only falls.
  const late = createHero(cloud.x + cloud.width - 2, cloud.y);
  run(late, 0.08 + TUNE.coyote + 0.05, ask({ move: 1 }));
  assert.deepEqual(types(press(late, { jump: true }, DT, { jumpHeld: true })), []);
});

test('clouds can be jumped up through and stood on', () => {
  const cloud = CLOUD,
    hero = fresh(cloud.x + cloud.width / 2);
  press(hero, { jump: true }, 1, { jumpHeld: true });
  assert.equal(hero.y, cloud.y);
  assert.equal(hero.grounded, true);
  // Walking off the end, he drops to the terrace.
  run(hero, 1.2, ask({ move: 1 }));
  assert.equal(hero.y, GROUND);
});

test('he cannot leave the yard', () => {
  const hero = fresh(40);
  run(hero, 1, ask({ move: -1 }));
  assert.ok(Math.abs(hero.x - TUNE.halfWidth) < 0.01);
  hero.x = YARD.width - 40;
  run(hero, 1, ask({ move: 1 }));
  assert.ok(Math.abs(hero.x - (YARD.width - TUNE.halfWidth)) < 0.01);
});

test('three presses make the combination: each blow lands once, at its moment, and the last ends it', () => {
  const hero = fresh(),
    seen = [];
  let clock = 0;
  const tap = seconds => {
    for (const event of press(hero, { attack: true }, seconds)) seen.push({ ...event, at: clock });
    clock += seconds;
  };
  tap(0.19);
  assert.equal(animationOf(hero).name, 'attack1');
  tap(0.21);
  assert.equal(animationOf(hero).name, 'attack2');
  tap(0.3);
  assert.equal(animationOf(hero).name, 'attack3');
  // Pressing again during the last blow does not chain: it plays out, and he is free.
  tap(0.4);
  assert.equal(hero.state, 'move');
  assert.deepEqual(seen.map(event => `${event.type}:${event.attack.name}`), ['swing:attack1', 'strike:attack1', 'swing:attack2', 'strike:attack2', 'swing:attack3', 'strike:attack3']);
  assert.ok(hero.x > YARD.start.x + 40, 'he steps into his blows');
  // The next press starts over.
  tap(0.05);
  assert.equal(animationOf(hero).name, 'attack1');
});

test('a blow lands when its table says, and the next may follow a little after it ends but not later', () => {
  for (const [index, attack] of ATTACKS.entries()) {
    const hero = fresh();
    Object.assign(hero, { grace: index ? 1 : 0, attack: Math.max(0, index - 1) });
    const early = press(hero, { attack: true }, attack.hitAt - 3 * DT);
    assert.deepEqual(types(early), ['swing'], attack.name);
    const landed = run(hero, 6 * DT);
    assert.deepEqual(types(landed), ['strike'], attack.name);
    assert.ok(attack.hitAt < attack.chainAt && attack.chainAt <= attack.seconds, attack.name);
  }
  const quick = fresh();
  press(quick, { attack: true }, ATTACKS[0].seconds + CHAIN_GRACE - 0.05);
  press(quick, { attack: true });
  assert.equal(animationOf(quick).name, 'attack2');
  const slow = fresh();
  press(slow, { attack: true }, ATTACKS[0].seconds + CHAIN_GRACE + 0.05);
  press(slow, { attack: true });
  assert.equal(animationOf(slow).name, 'attack1');
});

test('a blow reaches in front of him, whichever way he faces', () => {
  const hero = fresh(600);
  for (const attack of ATTACKS) {
    hero.facing = 1;
    const right = reach(hero, attack);
    hero.facing = -1;
    const left = reach(hero, attack);
    assert.ok(right.x >= hero.x && left.x + left.width <= hero.x, attack.name);
    assert.equal(right.x - hero.x, hero.x - (left.x + left.width));
    assert.ok(right.y + right.height <= hero.y + 0.001 && right.y < hero.y - 60, attack.name);
  }
});

test('the cloud roll crosses a set distance level, waits before the next, and is allowed once in the air', () => {
  const hero = fresh();
  const events = press(hero, { dash: true }, TUNE.dash.seconds);
  assert.deepEqual(types(events), ['dash']);
  const crossed = hero.x - YARD.start.x;
  assert.ok(Math.abs(crossed - TUNE.dash.speed * TUNE.dash.seconds) < 12, `rolled ${crossed}`);
  assert.equal(hero.y, GROUND);
  // At once, it is refused.
  assert.deepEqual(types(press(hero, { dash: true })), []);
  run(hero, TUNE.dash.cooldown);
  assert.deepEqual(types(press(hero, { dash: true }, TUNE.dash.seconds)), ['dash']);

  const jumper = fresh();
  press(jumper, { jump: true }, 0.2, { jumpHeld: true });
  const height = jumper.y;
  assert.deepEqual(types(press(jumper, { dash: true }, TUNE.dash.seconds - DT)), ['dash']);
  assert.equal(jumper.y, height, 'the roll does not fall');
  run(jumper, 0.05);
  jumper.dashCooldown = 0;
  assert.deepEqual(types(press(jumper, { dash: true }).filter(event => event.type === 'dash')), [], 'one roll to a jump');
  run(jumper, 1);
  assert.equal(jumper.airDash, true);
});

test('a roll may cut a blow short once it has landed, and a jump may once the next could begin', () => {
  const hero = fresh();
  press(hero, { attack: true }, ATTACKS[0].hitAt - 0.03);
  assert.deepEqual(types(press(hero, { dash: true })), [], 'not before the staff lands');
  run(hero, 0.05);
  assert.deepEqual(types(press(hero, { dash: true })), ['dash']);
});

test('what he is doing names the animation that shows it', () => {
  const hero = fresh();
  assert.equal(animationOf(hero).name, 'idle');
  run(hero, 0.2, ask({ move: 1 }));
  assert.equal(animationOf(hero).name, 'run');
  press(hero, { jump: true }, 0.1, { jumpHeld: true, move: 1 });
  assert.equal(animationOf(hero).name, 'jump');
  while (hero.vy < 100) stepHero(hero, ask(), DT, YARD);
  assert.equal(animationOf(hero).name, 'fall');
  while (!hero.grounded) stepHero(hero, ask(), DT, YARD);
  assert.equal(animationOf(hero).name, 'land');
  run(hero, TUNE.land + 0.3);
  assert.equal(animationOf(hero).name, 'idle');
  // Each new blow or roll has a key of its own, so that the same animation can start again.
  const first = (press(hero, { attack: true }), animationOf(hero).key);
  run(hero, 1);
  const second = (press(hero, { attack: true }), animationOf(hero).key);
  assert.notEqual(first, second);
});

// ---- The ground ------------------------------------------------------------------------------------------------
test('solid ground stops a body from every side; a cloud only from above', () => {
  const level = lay(lay(flatLevel(960, GROUND), 'solid', 10, 7, 2, 2), 'cloud', 4, 6, 3);
  const size = { halfWidth: 16, height: 112 };
  // Walking into the side of a step.
  const walker = { x: 400, y: GROUND, vx: 300, vy: 0 };
  let hit = false;
  for (let i = 0; i < 120; i++) hit = moveBody(walker, DT, level, size).wall || hit;
  assert.ok(hit);
  assert.ok(Math.abs(walker.x - (10 * CELL - 16)) < 0.01, `stopped at ${walker.x}`);
  assert.equal(walker.grounded, true);
  // Jumping up under it: his head stops at its underside.
  const jumper = { x: 10.5 * CELL, y: GROUND, vx: 0, vy: 0 };
  lay(level, 'solid', 10, 4, 2, 1);
  const under = { x: 4 * CELL + 70, y: GROUND, vx: 0, vy: -900 };
  for (let i = 0; i < 20; i++) moveBody(under, DT, level, size);
  assert.ok(under.y < 6 * CELL, 'he rises through a cloud');
  Object.assign(jumper, { x: 9 * CELL - 40, y: GROUND, vy: -900 });
  const roofed = lay(flatLevel(960, GROUND), 'solid', 8, 5, 2, 1),
    bumper = { x: 8.5 * CELL, y: GROUND, vx: 0, vy: -900 };
  for (let i = 0; i < 30; i++) moveBody(bumper, DT, roofed, size);
  assert.ok(bumper.y - 112 >= 6 * CELL - 0.01, `his head is at ${bumper.y - 112}, the roof at ${6 * CELL}`);
  // Coming down on the cloud, he stands on it.
  const faller = { x: 4 * CELL + 70, y: 5 * CELL, vx: 0, vy: 400 };
  let landed = 0;
  for (let i = 0; i < 60; i++) landed ||= moveBody(faller, DT, level, size).landed;
  assert.equal(faller.y, 6 * CELL);
  assert.ok(landed >= 400);
  // The ends of the world are walls.
  const runner = { x: 40, y: GROUND, vx: -500, vy: 0 };
  for (let i = 0; i < 60; i++) moveBody(runner, DT, level, size);
  assert.ok(Math.abs(runner.x - 16) < 0.01);
});

const ACT1 = JSON.parse(fs.readFileSync(new URL('../assets/levels/act1.tmj', import.meta.url)));

test('the first act is read from its map: ground, soldiers, posts, resting places and the gate', () => {
  const level = readLevel(ACT1),
    act = createAct(level);
  assert.deepEqual([level.columns, level.rows, level.width], [80, 12, 3840]);
  assert.deepEqual([act.hero.x, act.hero.y], [3.5 * CELL, GROUND]);
  assert.equal(act.foes.filter(foe => foe.kind === 'spearman').length, 7);
  assert.equal(act.foes.filter(foe => foe.kind === 'archer').length, 3);
  assert.equal(act.posts.length, 2);
  assert.equal(act.checkpoints.length, 2);
  assert.ok(act.gate.x > act.foes.at(-1).x, 'the gate is past the last soldier');
  // Everything stands on something, and nothing stands inside the ground.
  const size = { halfWidth: 10, height: 100 };
  for (const thing of level.things) {
    const body = { x: thing.x, y: thing.y, vx: 0, vy: 30 };
    moveBody(body, DT, level, size);
    assert.equal(body.y, thing.y, `the ${thing.type} at ${thing.x} hangs in the air`);
    assert.equal(body.grounded, true);
  }
});

// ---- Being struck ----------------------------------------------------------------------------------------------
test('a blow costs a peach and throws him back; for a moment after, nothing more can hurt him', () => {
  const hero = fresh(600);
  assert.deepEqual(types(hurtHero(hero, 700)), ['hurt']);
  assert.deepEqual([hero.health, hero.state], [TUNE.health - 1, 'hurt']);
  assert.ok(hero.vx < 0 && hero.vy < 0, 'thrown away from the blow, and up');
  assert.equal(hero.facing, 1, 'he turns to face what struck him');
  assert.equal(animationOf(hero).name, 'hurt');
  assert.deepEqual(hurtHero(hero, 700), [], 'not twice at once');
  // Presses do nothing while he is thrown.
  assert.deepEqual(types(press(hero, { attack: true, jump: true, dash: true }, 0.1)).filter(type => type !== 'land'), []);
  run(hero, TUNE.hurt.seconds + 0.5);
  assert.equal(hero.state, 'move');
  assert.ok(hero.x < 600);
  run(hero, TUNE.hurt.safe);
  assert.deepEqual(types(hurtHero(hero, 700)), ['hurt']);
});

test('the cloud roll carries him through a blow, and the last peach lays him out until he is stood up', () => {
  const roller = fresh();
  press(roller, { dash: true }, 0.05);
  assert.deepEqual(hurtHero(roller, 0), []);
  assert.equal(roller.health, TUNE.health);

  const hero = fresh(600);
  hero.health = 1;
  assert.deepEqual(types(hurtHero(hero, 700)), ['hurt', 'down']);
  assert.equal(animationOf(hero).name, 'down');
  run(hero, 2, ask({ move: 1, attack: true }));
  assert.equal(hero.state, 'down', 'he does not get up by himself');
  assert.deepEqual(hurtHero(hero, 700), []);
  reviveHero(hero, 200, GROUND);
  assert.deepEqual([hero.state, hero.health, hero.x], ['move', TUNE.health, 200]);
  assert.ok(bodyOf(hero).height > 90);
});

// ---- The soldiers ----------------------------------------------------------------------------------------------
/** Steps a foe and a standing hero together for `seconds`. */
function watch(foe, hero, seconds, level = YARD) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += DT) events.push(...stepFoe(foe, hero, DT, level));
  return events;
}

test('a spearman walks his beat, comes for whoever he sees, and warns before he thrusts', () => {
  const far = fresh(100),
    guard = createFoe('spearman', 1200, GROUND, 0);
  watch(guard, far, 6);
  assert.ok(Math.abs(guard.x - 1200) <= FOES.spearman.patrol + 12, `he wandered to ${guard.x}`);
  assert.ok(['walk', 'idle'].includes(guard.state));

  const hero = fresh(900);
  const events = watch(guard, hero, 4);
  const order = types(events).filter(type => type === 'foe-windup' || type === 'foe-strike');
  assert.deepEqual(order.slice(0, 2), ['foe-windup', 'foe-strike']);
  assert.equal(guard.facing, -1);
  assert.ok(Math.abs(guard.x - hero.x) < FOES.spearman.range + 60);
  // The thrust reaches forward of him, as far as where he stopped.
  const strike = events.find(event => event.type === 'foe-strike');
  assert.ok(strike.box.x < hero.x + TUNE.halfWidth && strike.box.x + strike.box.width > hero.x - TUNE.halfWidth);
  const box = thrust(guard);
  assert.ok(box.x + box.width <= guard.x && box.y < guard.y - 40);
  // Between the warning and the thrust there is time to get out of the way.
  assert.ok(FOES.spearman.windup + FOES.spearman.hitAt > TUNE.dash.seconds);
  // He rests between thrusts, and does not crowd in on top of his man.
  const fresher = createFoe('spearman', 1010, GROUND, 0),
    warned = [];
  for (let t = 0; t < 8; t += DT) for (const event of stepFoe(fresher, hero, DT, YARD)) if (event.type === 'foe-windup') warned.push(t);
  assert.ok(warned.length >= 3);
  for (let i = 1; i < warned.length; i++) assert.ok(warned[i] - warned[i - 1] >= FOES.spearman.windup + FOES.spearman.attack + FOES.spearman.rest - 0.02, `thrusts ${warned[i] - warned[i - 1]} s apart`);
  assert.ok(Math.abs(fresher.x - hero.x) > FOES.spearman.range * 0.4, `he stands ${Math.abs(fresher.x - hero.x)} from him`);
});

test('a spearman does not walk off a cloud or through a step', () => {
  const level = lay(flatLevel(1920, GROUND), 'cloud', 10, 6, 4);
  const guard = createFoe('spearman', 11 * CELL, 6 * CELL, 0),
    hero = createHero(20 * CELL, 6 * CELL - 20);
  watch(guard, hero, 5, level);
  assert.equal(guard.y, 6 * CELL);
  assert.ok(guard.x < 14 * CELL, `he is at ${guard.x}, the cloud ends at ${14 * CELL}`);
});

test('soldiers take blows as the staff deals them, and are felled when their strength is spent', () => {
  const guard = createFoe('spearman', 800, GROUND, 0);
  assert.deepEqual(types(hitFoe(guard, ATTACKS[0], 1)), ['foe-hurt']);
  assert.deepEqual([guard.health, guard.state], [FOES.spearman.health - 1, 'hurt']);
  assert.ok(guard.vx > 0, 'knocked away from the striker');
  assert.equal(foeAnimation(guard).name, 'hurt');
  // Stunned, he does not strike.
  assert.deepEqual(types(watch(guard, fresh(760), 0.2)), []);
  // The lift throws him into the air.
  hitFoe(guard, ATTACKS[1], 1);
  assert.ok(guard.vy < -300);
  // One combination and one blow more end a spearman; one combination ends an archer.
  guard.health = FOES.spearman.health - ATTACKS.reduce((sum, attack) => sum + attack.power, 0);
  assert.ok(guard.health > 0 && guard.health <= ATTACKS[0].power);
  assert.deepEqual(types(hitFoe(guard, ATTACKS[0], 1)), ['foe-down']);
  assert.equal(guard.state, 'down');
  watch(guard, fresh(760), LIE + 0.1);
  assert.equal(guard.gone, true);
  assert.ok(ATTACKS.reduce((sum, attack) => sum + attack.power, 0) >= FOES.archer.health);
  // A soldier in the middle of his thrust is hurt by a light blow, but finishes it.
  const set = createFoe('spearman', 800, GROUND, 0);
  Object.assign(set, { state: 'attack', time: 0.02 });
  const [felt] = hitFoe(set, ATTACKS[0], 1);
  assert.deepEqual([felt.type, felt.held, set.state, set.health], ['foe-hurt', true, 'attack', FOES.spearman.health - 1]);
  hitFoe(set, ATTACKS[2], 1);
  assert.equal(set.state, 'hurt', 'the heaviest blow stops him all the same');
});

test('an archer stands, warns, and sends an arrow at where he is', () => {
  const archer = createFoe('archer', 1000, GROUND, 0),
    hero = fresh(600);
  const events = watch(archer, hero, 3);
  assert.equal(archer.x, 1000, 'he does not leave his place');
  assert.deepEqual(types(events).slice(0, 2), ['foe-windup', 'arrow']);
  const { arrow } = events.find(event => event.type === 'arrow');
  assert.ok(arrow.vx < 0 && Math.abs(arrow.vy) < Math.abs(arrow.vx) * 0.5);
  assert.ok(arrow.y < GROUND - 40 && arrow.y > GROUND - 116);
  // Out of sight, he lets him be.
  const idle = createFoe('archer', 1000, GROUND, 0);
  assert.deepEqual(watch(idle, fresh(100), 3), []);
  // A bow can be tilted only so far: at one high above, the arrow still flies mostly along.
  const high = createHero(900, GROUND - 160);
  const up = watch(createFoe('archer', 1000, GROUND, 0), high, 3).find(event => event.type === 'arrow').arrow;
  assert.ok(up.vy < 0 && Math.abs(up.vy / up.vx) <= FOES.archer.arrow.tilt + 1e-9);
});

// ---- The act ---------------------------------------------------------------------------------------------------
/** An act on a flat terrace with the given things on it. */
const actWith = things => createAct(flatLevel(2400, GROUND, [{ type: 'spawn', x: 200, y: GROUND }, ...things.map(([type, x]) => ({ type, x, y: GROUND }))]));
function play(act, seconds, input = ask()) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += DT) events.push(...stepAct(act, input, DT));
  return events;
}
const tap = (act, what, seconds = DT, held = {}) => stepAct(act, ask({ ...held, ...what }), DT).concat(play(act, seconds - DT, ask(held)));

test('the count of blows grows with each that lands and lapses when he rests', () => {
  const act = actWith([['post', 300]]);
  act.hero.x = 300 - POST_ROOM;
  const seen = [...tap(act, { attack: true }, 0.19), ...tap(act, { attack: true }, 0.21), ...tap(act, { attack: true }, 0.6)];
  assert.equal(seen.filter(event => event.type === 'met').length, 3);
  assert.deepEqual([act.combo, act.best, act.posts[0].hits], [3, 3, 4]);
  const [met] = seen.filter(event => event.type === 'met');
  assert.equal(met.side, 1);
  const box = postBox(act.posts[0]);
  assert.ok(met.at.y > box.y && met.at.y < box.y + box.height);
  assert.ok(act.hero.x <= 300 - POST_ROOM, 'the post keeps him off');
  assert.deepEqual(types(play(act, COMBO_SECONDS + 0.1)).filter(type => type === 'lapse'), ['lapse']);
  assert.deepEqual([act.combo, act.best], [0, 3]);
  // The cloud roll goes through the post.
  tap(act, { dash: true }, 0.6);
  assert.ok(act.hero.x >= 300 + POST_ROOM);
});

test('standing still before a spearman costs a peach; rolling through his thrust costs nothing', () => {
  const still = actWith([['spearman', 420]]);
  let waited = 0;
  while (still.wounds === 0 && waited < 4) (stepAct(still, ask(), DT), (waited += DT));
  assert.equal(still.hero.health, TUNE.health - 1);
  assert.equal(still.wounds, 1);
  assert.equal(still.hero.state, 'hurt');

  const nimble = actWith([['spearman', 420]]);
  let rolled = false;
  for (let t = 0; t < 3; t += DT) {
    const foe = nimble.foes[0],
      dodge = !rolled && foe.state === 'windup' && foe.time > FOES.spearman.windup - 0.1;
    rolled ||= dodge;
    stepAct(nimble, ask({ dash: dodge, move: dodge ? 1 : 0 }), DT);
    if (nimble.foes[0].state === 'attack' && nimble.foes[0].struck) break;
  }
  assert.ok(rolled);
  assert.equal(nimble.hero.health, TUNE.health);
});

test('the combination fells a spearman, and the staff knocks an arrow out of the air', () => {
  const act = actWith([['spearman', 330]]);
  act.foes[0].rest = 9;
  act.foes[0].health = 4;
  const seen = [...tap(act, { attack: true }, 0.19), ...tap(act, { attack: true }, 0.21), ...tap(act, { attack: true }, 0.6)];
  assert.deepEqual(types(seen).filter(type => type.startsWith('foe-')), ['foe-hurt', 'foe-hurt', 'foe-down']);
  assert.deepEqual([remaining(act), act.felled, act.combo], [0, 1, 3]);

  const range = actWith([]);
  range.arrows.push({ x: 330, y: GROUND - 70, vx: -500, vy: 0, life: 1 });
  const swung = tap(range, { attack: true }, 0.2);
  assert.deepEqual(types(swung).filter(type => type === 'deflect' || type === 'hurt'), ['deflect']);
  assert.equal(range.arrows.length, 0);
  // Left alone, an arrow finds him; one that misses is spent.
  const struck = actWith([]);
  struck.arrows.push({ x: 500, y: GROUND - 70, vx: -500, vy: 0, life: 2 }, { x: 500, y: GROUND - 300, vx: -500, vy: 0, life: 0.3 });
  const felt = types(play(struck, 1));
  assert.ok(felt.includes('hurt') && felt.includes('stuck'));
  assert.equal(struck.hero.health, TUNE.health - 1);
});

test('fallen, he is stood up at the last place he rested, and the fall is counted', () => {
  const act = actWith([['checkpoint', 500], ['spearman', 900]]);
  act.foes[0].rest = 99;
  play(act, 1.2, ask({ move: 1 }));
  assert.equal(act.checkpoints[0].reached, true);
  assert.deepEqual(act.resting, { x: 500, y: GROUND });
  act.hero.health = 1;
  act.hero.safe = 0;
  act.arrows.push({ x: act.hero.x + 60, y: GROUND - 70, vx: -500, vy: 0, life: 1 });
  const events = types(play(act, REVIVE_SECONDS + 0.6));
  assert.ok(events.includes('down') && events.includes('revive'));
  assert.deepEqual([act.hero.x, act.hero.health, act.hero.state, act.falls], [500, TUNE.health, 'move', 1]);
});

test('the gate stays shut while a soldier stands, and opens to end the act', () => {
  const act = actWith([['spearman', 2000], ['gate', 600]]);
  act.foes[0].rest = 99;
  const barred = play(act, 2, ask({ move: 1 })).filter(event => event.type === 'barred');
  assert.deepEqual(barred.map(event => event.left), [1], 'told once, not every step');
  assert.equal(act.state, 'play');
  act.foes[0].state = 'down';
  act.hero.x = 400;
  const [clear] = play(act, 2, ask({ move: 1 })).filter(event => event.type === 'clear');
  assert.equal(act.state, 'cleared');
  assert.deepEqual(Object.keys(clear.result).sort(), ['best', 'falls', 'felled', 'rank', 'time', 'wounds']);
  assert.deepEqual(stepAct(act, ask({ move: 1 }), DT), [], 'the act is over');
  assert.equal(rankOf({ time: 90, falls: 0, wounds: 0 }), 'S');
  assert.equal(rankOf({ time: 200, falls: 0, wounds: 3 }), 'A');
  assert.equal(rankOf({ time: 200, falls: 1, wounds: 9 }), 'B');
  assert.equal(rankOf({ time: 60, falls: 4, wounds: 20 }), 'C');
});

test('the first act can be played through, and is not over in a moment', () => {
  // A simple player: makes for the nearest soldier to the left of the rest, jumping toward one who stands higher
  // and backing off to try again when he ends up underneath; strikes what is near, and rolls from a warning.
  const act = createAct(readLevel(ACT1));
  let stuck = 0,
    last = 0,
    retreat = 0;
  for (let t = 0; t < 600 && act.state === 'play'; t += DT) {
    const hero = act.hero,
      target = act.foes.find(foe => foe.state !== 'down') ?? act.gate,
      dx = target.x - hero.x,
      above = target.y < hero.y - 40,
      level = Math.abs(target.y - hero.y) < 40,
      gap = Math.abs(dx);
    if (above && gap < 70 && hero.grounded && target.y < hero.y - 150) retreat = 1.3;
    retreat -= DT;
    const move = retreat > 0 ? -1 : level && gap < 70 && 'health' in target ? 0 : Math.sign(dx) || 1;
    stuck = move && Math.abs(hero.x - last) < 0.05 && hero.grounded ? stuck + DT : 0;
    last = hero.x;
    const jump = hero.grounded && retreat <= 0 && ((above && gap < 420) || stuck > 0.1);
    const warned = act.foes.some(foe => foe.kind === 'spearman' && foe.state === 'windup' && foe.time > 0.3 && Math.abs(foe.x - hero.x) < 150 && Math.abs(foe.y - hero.y) < 40);
    stepAct(act, ask({ move, attack: level && gap < 120 && 'health' in target, jump, jumpHeld: true, dash: warned }), DT);
  }
  assert.equal(act.state, 'cleared', `stopped at x ${Math.round(act.hero.x)} with ${remaining(act)} soldiers left after ${Math.round(act.time)} s`);
  assert.equal(act.result.felled, 10);
  assert.ok(act.result.time > 25, `cleared in ${act.result.time} s`);
  console.log(`    a simple player clears the first act in ${Math.round(act.result.time)} s, falling ${act.result.falls} times and wounded ${act.result.wounds} times: rank ${act.result.rank}`);
});
