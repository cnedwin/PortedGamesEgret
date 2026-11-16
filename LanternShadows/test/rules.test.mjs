// Rule tests: how the Monkey King moves and fights, and how the yard counts his blows.
// Run from the LanternShadows folder with `node --test test/*.test.mjs`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import { COMBO_SECONDS, POST_ROOM, REVIVE_SECONDS, createAct, peachBox, postBox, rankOf, remaining, stepAct, tuftReady } from '../src/rules/act.mjs';
import { BOSS, bossAnimation, bossBox, bossReach, createBoss, hitBoss, open, present, restoreBoss, stepBoss, wakeBoss } from '../src/rules/boss.mjs';
import { HAIRS, cloneAnimation, createClones, out } from '../src/rules/clones.mjs';
import * as erlang from '../src/rules/erlang.mjs';
import { FOES, LIE, createFoe, foeAnimation, foeBox, hitFoe, stepFoe, thrust } from '../src/rules/foes.mjs';
import { ATTACKS, CHAIN_GRACE, TUNE, animationOf, bodyOf, canBeHurt, createHero, hurtHero, reach, reviveHero, stepHero } from '../src/rules/hero.mjs';
import { CELL, flatLevel, groundUnder as groundUnderFoot, lay, moveBody, overlaps, readLevel } from '../src/rules/level.mjs';

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
  assert.deepEqual([level.columns, level.rows, level.width], [100, 12, 4800]);
  assert.deepEqual([act.hero.x, act.hero.y], [3.5 * CELL, GROUND]);
  assert.equal(act.foes.filter(foe => foe.kind === 'spearman').length, 7);
  assert.equal(act.foes.filter(foe => foe.kind === 'archer').length, 3);
  assert.equal(act.posts.length, 2);
  assert.equal(act.checkpoints.length, 3);
  assert.ok(act.gate.x > act.foes.at(-1).x, 'the gate is past the last soldier');
  // The court before the gate: from its pennant to the end, wider than the stage, with him and the gate inside.
  const { arena } = act.boss;
  assert.deepEqual([arena.left, arena.right], [act.checkpoints.at(-1).x - 48, level.width]);
  assert.ok(arena.right - arena.left > 960 && act.boss.x > arena.left + 300 && act.gate.x < arena.right);
  assert.ok(act.foes.every(foe => foe.x < arena.left), 'no soldier stands in the court');
  const skipped = createAct(level, { from: 'boss' });
  assert.deepEqual([skipped.hero.x, remaining(skipped), skipped.from], [act.checkpoints.at(-1).x, 0, 'boss']);
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

// ---- Nezha -----------------------------------------------------------------------------------------------------
const COURT = { left: 900, right: 2300 };
const fight = (boss, hero, seconds) => {
  const events = [];
  for (let t = 0; t < seconds; t += DT) events.push(...stepBoss(boss, hero, DT));
  return events;
};
/** Him, come down into a court and ready, with someone standing `gap` to his left. */
function nezha(gap = 200) {
  const boss = createBoss(1600, GROUND, COURT),
    hero = { x: 1600 - gap, y: GROUND, state: 'move' },
    entered = [...wakeBoss(boss), ...fight(boss, hero, BOSS.enter.seconds + DT)];
  return { boss, hero, entered };
}
/** Steps until an event of the type happens, and returns it with the time it took. */
function until(boss, hero, type, limit = 8) {
  for (let t = 0; t < limit; t += DT) {
    const found = stepBoss(boss, hero, DT).find(event => event.type === type);
    if (found) return { ...found, after: t };
  }
  assert.fail(`no ${type} within ${limit} s (he is in ${boss.state})`);
}
const HEAVY = { kind: 'slam', power: 2 },
  LIGHT = { kind: 'hit', power: 1 };

test('Nezha comes down from above, cannot be struck until he has, and then faces whoever is there', () => {
  const boss = createBoss(1600, GROUND, COURT),
    hero = { x: 1400, y: GROUND, state: 'move' };
  assert.equal(present(boss), false);
  assert.deepEqual(fight(boss, hero, 1), [], 'he does nothing until he is called');
  assert.deepEqual(types(wakeBoss(boss)), ['boss-enter']);
  assert.equal(boss.rise, BOSS.enter.from);
  fight(boss, hero, BOSS.enter.seconds / 2);
  assert.ok(boss.rise > 0 && boss.rise < BOSS.enter.from / 2, `half way down he hangs at ${boss.rise}`);
  assert.equal(open(boss), false);
  assert.deepEqual(types(fight(boss, hero, BOSS.enter.seconds / 2 + DT)), ['boss-ready']);
  assert.equal(boss.rise, 0);
  assert.equal(boss.facing, -1);
  assert.equal(open(boss), true);
  assert.equal(bossAnimation(boss).name, 'idle');
});

test('he warns before a thrust, and the thrust carries the spear a long way', () => {
  const { boss, hero } = nezha(260);
  const warned = until(boss, hero, 'boss-windup');
  assert.equal(warned.move, 'thrust');
  assert.equal(bossReach(boss), null, 'a warning hurts nobody');
  assert.equal(bossAnimation(boss).name, 'thrustWindup');
  const struck = until(boss, hero, 'boss-strike');
  assert.ok(Math.abs(struck.after - BOSS.thrust.windup) < 2 * DT, `the warning lasted ${struck.after}`);
  const from = boss.x;
  fight(boss, hero, BOSS.thrust.from + 2 * DT);
  const reach = bossReach(boss);
  assert.ok(reach && reach.x + reach.width <= boss.x, 'the spear reaches the way he faces');
  fight(boss, hero, BOSS.thrust.seconds);
  assert.ok(Math.abs(from - boss.x - BOSS.thrust.speed * (BOSS.thrust.until - BOSS.thrust.from)) < 30, `he went ${from - boss.x}`);
  assert.equal(boss.state, 'idle');
  assert.equal(bossReach(boss), null);
});

test('he closes in before thrusting at what is out of reach, and sweeps at what is too near', () => {
  const far = nezha(640);
  const first = until(far.boss, far.hero, 'boss-windup');
  assert.ok(Math.abs(far.hero.x - far.boss.x) < BOSS.thrust.range, 'he came within reach first');
  assert.equal(first.move, 'thrust');
  const near = nezha(80);
  assert.equal(until(near.boss, near.hero, 'boss-windup').move, 'sweep');
  until(near.boss, near.hero, 'boss-strike');
  fight(near.boss, near.hero, BOSS.sweep.from + 2 * DT);
  const reach = bossReach(near.boss);
  assert.ok(reach.height > TUNE.jump ** 2 / (2 * TUNE.gravity) - 20, 'a sweep is not to be jumped');
  assert.ok(overlaps(reach, bodyOf(createHero(near.hero.x, GROUND))));
});

test('a light blow does not move him; the last of the combination staggers him, but not twice running', () => {
  const { boss, hero } = nezha();
  assert.deepEqual(types(hitBoss(boss, LIGHT)), ['boss-hurt']);
  assert.equal(boss.health, BOSS.health - 1);
  assert.equal(boss.state, 'idle');
  assert.deepEqual(types(hitBoss(boss, HEAVY)), ['boss-stun']);
  assert.equal(bossAnimation(boss).name, 'stun');
  assert.equal(open(boss), true, 'staggered, he can be struck');
  fight(boss, hero, BOSS.stun + DT);
  assert.equal(boss.state, 'idle');
  assert.deepEqual(types(hitBoss(boss, HEAVY)), ['boss-hurt'], 'he has steadied himself');
  fight(boss, { ...hero, state: 'down' }, BOSS.steady);
  assert.deepEqual(types(hitBoss(boss, HEAVY)), ['boss-stun']);
});

test('he fights in three phases, none of which a single blow can skip, and is driven off at the end', () => {
  const { boss, hero } = nezha(300);
  const mighty = { kind: 'slam', power: 100 };
  assert.deepEqual(hitBoss(boss, mighty), [{ type: 'boss-phase', phase: 1 }]);
  assert.equal(boss.health, BOSS.phases[0].until);
  assert.equal(boss.state, 'roar');
  assert.equal(open(boss), false, 'in his rage nothing reaches him');
  fight(boss, hero, BOSS.roar + DT);
  assert.equal(until(boss, hero, 'boss-windup').move, 'ring', 'the second phase opens with the ring');
  assert.deepEqual(hitBoss(boss, mighty), [{ type: 'boss-phase', phase: 2 }]);
  fight(boss, hero, BOSS.roar + DT);
  assert.equal(until(boss, hero, 'boss-windup').move, 'charge', 'the third with the ride');
  assert.deepEqual(types(hitBoss(boss, mighty)), ['boss-down']);
  assert.equal(boss.health, 0);
  assert.equal(bossAnimation(boss).name, 'flee');
  const end = fight(boss, hero, BOSS.flee + DT);
  assert.deepEqual(types(end), ['boss-gone']);
  assert.ok(boss.gone && !present(boss) && boss.rise > 300);
});

test('the ring flies out and comes home to his hand; knocked back, it staggers him and costs him', () => {
  const { boss, hero } = nezha(300);
  hitBoss(boss, { kind: 'slam', power: 100 });
  fight(boss, hero, BOSS.roar + DT);
  hero.x = boss.x - 560;
  const { ring } = until(boss, hero, 'ring');
  assert.ok(ring.vx < 0 && boss.ring === ring);
  let furthest = 0;
  for (let t = 0; t < 3 && boss.ring; t += DT) (stepBoss(boss, hero, DT), (furthest = Math.max(furthest, Math.abs(ring.x - ring.from))));
  assert.equal(boss.ring, null, 'it came home');
  assert.ok(Math.abs(furthest - BOSS.ring.reach) < 40, `it flew ${furthest}`);
  assert.equal(boss.health, BOSS.phases[0].until);

  const again = until(boss, hero, 'ring').ring;
  fight(boss, hero, 0.2);
  Object.assign(again, { struck: true, back: true });
  const home = [];
  for (let t = 0; t < 2 && boss.ring; t += DT) home.push(...stepBoss(boss, hero, DT));
  assert.deepEqual(types(home), ['ring-home', 'boss-stun']);
  assert.equal(boss.health, BOSS.phases[0].until - BOSS.ring.rebound);
});

test('in the last phase he rides his wheels to the end of the court, low and fast, and the ground burns behind', () => {
  const { boss, hero } = nezha(300);
  hitBoss(boss, { kind: 'slam', power: 100 });
  hitBoss(boss, { kind: 'slam', power: 100 });
  fight(boss, hero, BOSS.roar + DT);
  const warned = until(boss, hero, 'boss-windup');
  assert.equal(warned.move, 'charge');
  const struck = until(boss, hero, 'boss-strike');
  assert.ok(Math.abs(struck.after - BOSS.charge.windup * BOSS.quick) < 2 * DT, 'his warnings are shorter now');
  assert.ok(boss.rise > 60, 'he rises first');
  const from = boss.x;
  fight(boss, hero, 0.2);
  assert.ok(bossBox(boss).height === BOSS.charge.height && boss.rise === 0, 'he rides low');
  assert.ok(overlaps(bossReach(boss), bossBox(boss)));
  until(boss, hero, 'boss-halt');
  assert.ok(boss.x < COURT.left + 120, `he stopped at ${boss.x}`);
  const [fire] = boss.fires;
  assert.ok(fire.from === from && Math.abs(fire.to - boss.x) < 1, 'the fire lies along the way he went');
  fight(boss, hero, BOSS.charge.fire - 0.1);
  assert.equal(boss.fires.length, 1);
  fight(boss, hero, 0.2);
  assert.equal(boss.fires.length, 0, 'and burns out');
  assert.equal(boss.state, 'idle');
});

/** An act that is only the court: a pennant, three hundred units of terrace, him, a cloud, and the gate. */
function court() {
  const level = lay(flatLevel(2400, GROUND, [{ type: 'spawn', x: 200, y: GROUND }, { type: 'checkpoint', x: 900, y: GROUND }, { type: 'boss', x: 1700, y: GROUND }, { type: 'gate', x: 2100, y: GROUND }]), 'cloud', 24, 7, 4);
  const act = createAct(level, { from: 'boss' });
  return act;
}

test('he is met in the court when no soldier stands, and nobody leaves it until he is driven off', () => {
  const guarded = actWith([['spearman', 700], ['checkpoint', 900], ['boss', 1700], ['gate', 2100]]);
  guarded.hero.x = 1300;
  play(guarded, 0.5);
  assert.equal(guarded.boss.state, 'wait', 'not while a soldier stands');

  const act = court();
  assert.equal(act.hero.x, 900, 'begun from the court, he stands at its pennant');
  assert.equal(remaining(act), 0);
  assert.deepEqual(types(play(act, 0.2)), []);
  act.hero.x = 1200;
  assert.ok(types(play(act, DT)).includes('boss-enter'));
  play(act, 0.3, ask({ move: -1 }));
  play(act, 2, ask({ move: -1 }));
  assert.ok(Math.abs(act.hero.x - act.boss.arena.left - 44) < 0.01, `he got out to ${act.hero.x}`);
  act.hero.x = 2200;
  play(act, 0.1);
  assert.equal(act.state, 'play', 'the gate is not his yet');
});

test('standing in his thrust costs a peach, rolling through it costs nothing, and the staff wears him down', () => {
  const act = court();
  act.hero.x = 1440;
  play(act, BOSS.enter.seconds + 0.1);
  let events = [];
  for (let t = 0; t < 4 && !events.some(event => event.type === 'boss-strike'); t += DT) events = stepAct(act, ask(), DT);
  events = play(act, BOSS.thrust.seconds);
  assert.ok(types(events).includes('hurt'));
  assert.equal(act.hero.health, TUNE.health - 1);

  const nimble = court();
  nimble.hero.x = 1440;
  play(nimble, BOSS.enter.seconds + 0.1);
  events = [];
  for (let t = 0; t < 4 && !events.some(event => event.type === 'boss-strike'); t += DT) events = stepAct(nimble, ask(), DT);
  events = tap(nimble, { dash: true, move: 1 }, BOSS.thrust.seconds);
  assert.equal(nimble.hero.health, TUNE.health);
  // Behind him now, with his back turned: the whole combination lands.
  nimble.hero.x = nimble.boss.x + 60;
  events = [...tap(nimble, { attack: true, move: -1 }, 0.2), ...tap(nimble, { attack: true }, 0.22), ...tap(nimble, { attack: true }, 0.6)];
  assert.equal(events.filter(event => event.type === 'met' && event.boss).length, 3);
  assert.equal(nimble.boss.health, BOSS.health - 4);
  assert.equal(nimble.combo, 3);
});

test('the staff sends his ring back at him, and a cloud is clear of his fire', () => {
  const act = court(),
    { boss, hero } = act;
  hero.x = 1200;
  play(act, BOSS.enter.seconds + 0.1);
  hitBoss(boss, { kind: 'slam', power: 100 });
  play(act, BOSS.roar + 0.1);
  let events = [];
  for (let t = 0; t < 5 && !boss.ring; t += DT) stepAct(act, ask(), DT);
  // He waits for it and strikes as it arrives.
  for (let t = 0; t < 2 && Math.abs(boss.ring.x - hero.x) > 150; t += DT) stepAct(act, ask(), DT);
  events = tap(act, { attack: true, move: Math.sign(boss.ring.x - hero.x) }, 1.2);
  assert.ok(events.some(event => event.type === 'deflect' && event.ring), 'the ring was struck');
  assert.ok(types(events).includes('boss-stun'), 'and came home hard');
  assert.equal(hero.health, TUNE.health);

  // The ride: one waits on the ground and is burned, the other on a cloud and is not.
  for (const [where, y, burned] of [[1250, GROUND, true], [26 * CELL, 7 * CELL, false]]) {
    const ride = court();
    ride.hero.x = 1200;
    play(ride, BOSS.enter.seconds + 0.1);
    hitBoss(ride.boss, { kind: 'slam', power: 100 });
    hitBoss(ride.boss, { kind: 'slam', power: 100 });
    play(ride, BOSS.roar);
    Object.assign(ride.hero, { x: where, y, vx: 0, vy: 0, safe: 0 });
    events = [];
    for (let t = 0; t < 6 && !events.some(event => event.type === 'boss-halt'); t += DT) events = stepAct(ride, ask(), DT);
    play(ride, 0.3);
    assert.equal(ride.hero.health < TUNE.health, burned, burned ? 'on the ground he is burned' : 'on a cloud he is not');
  }
});

test('if he falls in the court the fight goes back to the start of its phase, and driving Nezha off opens the gate', () => {
  const act = court(),
    { boss, hero } = act;
  hero.x = 1200;
  play(act, BOSS.enter.seconds + 0.1);
  hitBoss(boss, { kind: 'slam', power: 100 });
  play(act, BOSS.roar + 0.1);
  hitBoss(boss, LIGHT);
  hitBoss(boss, LIGHT);
  assert.equal(boss.health, BOSS.phases[0].until - 2);
  hurtHero(hero, hero.x + 10, TUNE.health);
  const fallen = play(act, 0.1);
  assert.ok(types(fallen).includes('revive'));
  assert.equal(hero.x, 900);
  assert.deepEqual([boss.health, boss.phase, boss.ring, boss.state], [BOSS.phases[0].until, 1, null, 'idle']);
  assert.ok(Math.abs(boss.x - 1700) < 30, 'he is back where he came down');

  hitBoss(boss, { kind: 'slam', power: 100 });
  play(act, BOSS.roar + 0.1);
  hitBoss(boss, { kind: 'slam', power: 100 });
  const end = play(act, BOSS.flee + 0.1);
  assert.deepEqual(types(end).filter(type => type.startsWith('boss') || type === 'gate-open'), ['boss-gone', 'gate-open']);
  hero.x = 2090;
  assert.deepEqual(types(play(act, 0.5)), [], 'the gate takes a moment to open');
  assert.ok(types(play(act, 1)).includes('clear'));
  assert.equal(act.state, 'cleared');
  restoreBoss(createBoss(0, 0, COURT));
});

// ---- The orchard -----------------------------------------------------------------------------------------------
const blowOf = kind => ATTACKS.find(attack => attack.kind === kind);

test('a shield-bearer takes nothing from in front until a lifting blow knocks his shield aside', () => {
  const foe = createFoe('guard', 1000, GROUND, 0);
  // He faces left; the striker stands to his left, so `side` is 1.
  assert.deepEqual(types(hitFoe(foe, blowOf('hit'), 1)), ['foe-block']);
  assert.deepEqual(types(hitFoe(foe, blowOf('slam'), 1)), ['foe-block']);
  assert.equal(foe.health, FOES.guard.health, 'the shield took both');
  assert.equal(foeAnimation(foe).name, 'block');
  assert.deepEqual(types(hitFoe(foe, blowOf('lift'), 1)), ['foe-open']);
  assert.deepEqual([foe.state, foe.health, foeAnimation(foe).name], ['open', FOES.guard.health - 1, 'open']);
  // With the shield aside every blow lands, and he has no time to right himself.
  assert.deepEqual(types(hitFoe(foe, blowOf('hit'), 1)), ['foe-hurt']);
  assert.deepEqual(types(hitFoe(foe, blowOf('slam'), 1)), ['foe-hurt']);
  assert.deepEqual([foe.state, foe.health], ['open', FOES.guard.health - 4]);
  const hero = { x: 900, y: GROUND, state: 'move' };
  for (let t = 0; t < FOES.guard.shield.open + 0.1; t += DT) stepFoe(foe, hero, DT, YARD);
  assert.notEqual(foe.state, 'open', 'he has his shield back');
  assert.deepEqual(types(hitFoe(foe, blowOf('hit'), 1)), ['foe-block']);
  assert.deepEqual(types(hitFoe(foe, blowOf('lift'), 1)), ['foe-open']);
  assert.deepEqual(types(hitFoe(foe, blowOf('slam'), 1)), ['foe-down'], 'and falls like any other when his strength is spent');
});

test('a shield-bearer is struck from behind, and is slow to come about', () => {
  const foe = createFoe('guard', 1000, GROUND, 0),
    behind = { x: 1070, y: GROUND, state: 'move' };
  assert.equal(foe.facing, -1);
  for (let t = 0; t < FOES.guard.shield.turn - 0.1; t += DT) stepFoe(foe, behind, DT, YARD);
  assert.equal(foe.facing, -1, 'he has not come about yet');
  // From behind, `side` is -1: the blow lands and turns him.
  assert.deepEqual(types(hitFoe(foe, blowOf('hit'), -1)), ['foe-hurt']);
  assert.deepEqual([foe.state, foe.facing, foe.health], ['hurt', 1, FOES.guard.health - 1]);
  assert.deepEqual(types(hitFoe(foe, blowOf('lift'), -1)), ['foe-hurt'], 'while he reels the next lands too');
  const other = createFoe('guard', 1000, GROUND, 1);
  for (let t = 0; t < FOES.guard.shield.turn + 0.1; t += DT) stepFoe(other, behind, DT, YARD);
  assert.equal(other.facing, 1, 'given the time, he turns');
  assert.deepEqual(types(hitFoe(other, blowOf('hit'), -1)), ['foe-block']);
});

test('a shield-bearer warns before his hammer falls, and it lands in front of him', () => {
  const foe = createFoe('guard', 1000, GROUND, 0),
    hero = fresh(940),
    events = watch(foe, hero, 2.4);
  assert.ok(types(events).includes('foe-windup'));
  const strike = events.find(event => event.type === 'foe-strike');
  assert.ok(strike && overlaps(strike.box, bodyOf(hero)), 'the hammer comes down on whoever stands before him');
  assert.ok(strike.box.x + strike.box.width <= foe.x + 1);
});

test('a crane keeps its place in the air, warns, stoops along a line at where he stood, and climbs back', () => {
  const crane = createFoe('crane', 1000, GROUND - 150, 0),
    far = { x: 200, y: GROUND, state: 'move' };
  assert.deepEqual([crane.flies, crane.grounded], [true, false]);
  const box = foeBox(crane);
  assert.equal(box.y + box.height / 2, crane.y, 'its room is about its middle');
  watch(crane, far, 3);
  assert.ok(Math.abs(crane.x - 1000) <= FOES.crane.sway + 1 && Math.abs(crane.y - (GROUND - 150)) < 12, 'it sways about its place');
  assert.equal(foeAnimation(crane).name, 'fly');

  const hero = { x: crane.x - 180, y: GROUND, state: 'move' };
  let events = [];
  for (let t = 0; t < 2 && crane.state !== 'attack'; t += DT) events.push(...stepFoe(crane, hero, DT, YARD));
  assert.deepEqual(types(events), ['foe-windup', 'foe-dive']);
  assert.equal(foeAnimation(crane).name, 'dive');
  const line = { vx: crane.vx, vy: crane.vy };
  assert.ok(Math.abs(Math.hypot(line.vx, line.vy) - FOES.crane.stoop) < 90 && line.vx < 0 && line.vy > 0);
  // He steps aside; it keeps to its line.
  hero.x += 300;
  events = [];
  for (let t = 0; t < 2 && crane.state === 'attack'; t += DT) events.push(...stepFoe(crane, hero, DT, YARD));
  assert.ok(events.length > 10 && events.every(event => event.type === 'foe-touch'));
  assert.ok(crane.y > GROUND - 60, `it came down to ${crane.y}`);
  assert.deepEqual([line.vx, line.vy], [events.at(-1).foe.vx, events.at(-1).foe.vy].map((_, i) => [line.vx, line.vy][i]));
  watch(crane, far, 3);
  assert.equal(crane.state, 'idle');
  assert.ok(Math.abs(crane.y - (GROUND - 150)) < 12, 'and is back at its height');
});

test('a crane struck out of the air falls to the ground and lies there', () => {
  const crane = createFoe('crane', 1000, GROUND - 150, 0),
    hero = { x: 2000, y: GROUND, state: 'move' };
  assert.deepEqual(types(hitFoe(crane, blowOf('lift'), 1)), ['foe-hurt']);
  watch(crane, hero, 0.2);
  assert.ok(crane.x > 1000, 'knocked along the air');
  watch(crane, hero, 3);
  assert.equal(crane.state, 'idle');
  assert.deepEqual(types(hitFoe(crane, blowOf('hit'), 1)), ['foe-down']);
  watch(crane, hero, 1);
  assert.ok(crane.grounded && crane.y === GROUND);
  watch(crane, hero, LIE + 0.1);
  assert.equal(crane.gone, true);
});

/** An act in an orchard: a peach on a bough over level ground, and whatever else is asked for. */
const orchardWith = things => createAct(flatLevel(2400, GROUND, [{ type: 'spawn', x: 200, y: GROUND }, { type: 'peach', x: 400, y: GROUND - 120 }, ...things.map(([type, x, y = GROUND]) => ({ type, x, y }))]));

test('a peach knocked from its bough falls to the ground, and is eaten only by one who is short of a peach', () => {
  const act = orchardWith([]),
    [peach] = act.peaches;
  assert.equal(peach.state, 'hung');
  act.hero.x = 330;
  // A level sweep passes under it; the lifting blow reaches.
  let events = tap(act, { attack: true }, 0.19);
  assert.equal(peach.state, 'hung');
  events = tap(act, { attack: true }, 0.4);
  assert.ok(types(events).includes('peach-struck'));
  play(act, 0.6);
  assert.equal(peach.state, 'ground');
  assert.ok(Math.abs(peachBox(peach).y + peachBox(peach).height - GROUND) < 6, 'it lies on the turf');
  // Whole, he walks over it and leaves it.
  play(act, 0.5, ask({ move: 1 }));
  assert.equal(peach.state, 'ground');
  act.hero.health = 3;
  act.hero.x = 300;
  events = play(act, 0.6, ask({ move: 1 }));
  assert.ok(types(events).includes('peach'));
  assert.deepEqual([peach.state, act.hero.health, act.eaten], ['eaten', 4, 1]);

  // One still on its bough can be jumped for.
  const hungry = orchardWith([]);
  hungry.hero.health = 1;
  hungry.hero.x = 400;
  tap(hungry, { jump: true }, 0.5, { jumpHeld: true });
  assert.deepEqual([hungry.peaches[0].state, hungry.hero.health], ['eaten', 2]);
});

test('a crane that touches him in its stoop costs a peach; the staff knocks it out of the air first', () => {
  const act = orchardWith([['crane', 700, GROUND - 150]]);
  act.hero.x = 560;
  const events = play(act, 2.5);
  assert.ok(types(events).includes('foe-dive') && types(events).includes('hurt'));
  assert.equal(act.hero.health, TUNE.health - 1);

  const ready = orchardWith([['crane', 700, GROUND - 150]]);
  ready.hero.x = 560;
  for (let t = 0; t < 3 && ready.foes[0].state !== 'attack'; t += DT) stepAct(ready, ask(), DT);
  // It is on its way: he sweeps at once, and the staff is there before the beak is.
  const met = tap(ready, { attack: true, move: 1 }, 0.3);
  assert.ok(met.some(event => event.type === 'met' && event.foe), 'the sweep met it');
  assert.equal(ready.hero.health, TUNE.health);
});

const ACT2 = JSON.parse(fs.readFileSync(new URL('../assets/levels/act2.tmj', import.meta.url)));

test('the second act is read from its map: an orchard with its own ground, guards, cranes and peaches', () => {
  const level = readLevel(ACT2),
    act = createAct(level),
    count = kind => act.foes.filter(foe => foe.kind === kind).length;
  assert.deepEqual([level.columns, level.rows, level.set], [124, 12, 'orchard']);
  assert.equal(readLevel(ACT1).set, 'terrace');
  assert.deepEqual([count('guard'), count('crane'), count('spearman'), count('archer')], [4, 5, 3, 2]);
  assert.equal(act.peaches.length, 5);
  assert.equal(act.boss.kind, 'erlang');
  assert.equal(createAct(readLevel(ACT1)).boss.kind, 'nezha');
  assert.ok(act.foes.every(foe => foe.x < act.boss.arena.left), 'nobody else stands in his court');
  assert.ok(level.things.filter(thing => thing.type === 'tree').length >= 4);
  // Every peach can be reached: by the lifting blow from where he can stand under it.
  for (const peach of act.peaches) {
    let under = peach.y;
    while (under < level.height && !groundUnderFoot(level, peach.x, under)) under += 4;
    assert.ok(under - peach.y < 170, `the peach at ${peach.x} hangs ${under - peach.y} over the ground`);
  }
  // What stands, stands on something; what flies has air under it.
  for (const foe of act.foes) {
    const body = { x: foe.x, y: foe.y, vx: 0, vy: 30 };
    moveBody(body, DT, level, { halfWidth: 10, height: 40 });
    assert.equal(body.grounded, !foe.flies, `${foe.kind} at ${foe.x}`);
  }
});

// ---- The body beyond the body ----------------------------------------------------------------------------------
/** Gives him hairs enough and has him pluck them: plays until the clones are out, and returns what happened. */
function blow(act) {
  act.hairs = HAIRS.need;
  return [...stepAct(act, ask({ special: true }), DT), ...play(act, TUNE.conjure.at + DT)];
}

test('his own blows that land are hairs toward a tuft, and it cannot be plucked before there are enough', () => {
  const act = actWith([['post', 300]]);
  act.hero.x = 300 - POST_ROOM;
  assert.equal(tuftReady(act), false);
  assert.deepEqual(types(stepAct(act, ask({ special: true }), DT)), [], 'asked for too soon, nothing happens');
  tap(act, { attack: true }, 0.4);
  assert.equal(act.hairs, 1);
  act.hairs = HAIRS.need - 1;
  const events = tap(act, { attack: true }, 0.4);
  assert.ok(types(events).includes('hairs-full'));
  assert.equal(act.hairs, HAIRS.need);
  assert.equal(tuftReady(act), true);
  tap(act, { attack: true }, 0.4);
  assert.equal(act.hairs, HAIRS.need, 'a full tuft is no fuller for another blow');
});

test('he plucks, blows, and a hundred of him come out over a moment; nothing hurts him while he does', () => {
  const act = actWith([]);
  act.hairs = HAIRS.need;
  assert.deepEqual(types(stepAct(act, ask({ special: true }), DT)), ['conjure']);
  assert.deepEqual([act.hero.state, animationOf(act.hero).name, canBeHurt(act.hero), act.hairs], ['conjure', 'conjure', false, 0]);
  assert.equal(act.clones.length, 0, 'not until he blows');
  const events = play(act, TUNE.conjure.at + DT);
  assert.deepEqual(events.filter(event => event.type === 'clones'), [{ type: 'clones', count: HAIRS.count }]);
  assert.ok(act.clones.filter(out).length < 20, 'they do not all come at once');
  play(act, HAIRS.wave);
  assert.equal(act.clones.filter(out).length, HAIRS.count);
  assert.equal(act.hero.state, 'move', 'and he is his own man again');
  assert.equal(tuftReady(act), false);
  assert.deepEqual(cloneAnimation({ state: 'tumble' }).name, 'dash', 'they come out turning somersaults');
  // A tuft of another size, as the address can ask for.
  const few = createAct(flatLevel(2400, GROUND, [{ type: 'spawn', x: 200, y: GROUND }]), { clones: 12 });
  blow(few);
  assert.equal(few.clones.length, 12);
});

test('with nobody to go for the clones run about the stage, and when their time is up they are hairs again', () => {
  const act = actWith([]);
  blow(act);
  play(act, 3);
  const { clones } = act;
  assert.ok(clones.every(clone => clone.x >= HAIRS.halfWidth && clone.x <= act.level.width - HAIRS.halfWidth && clone.y <= GROUND + 0.01), 'they stay on the stage');
  assert.ok(clones.some(clone => clone.facing > 0) && clones.some(clone => clone.facing < 0), 'they go both ways');
  assert.ok(new Set(clones.map(clone => Math.round(clone.x / 50))).size >= 10, 'and spread out');
  assert.ok(clones.every(clone => Math.abs(clone.x - act.hero.x) < HAIRS.stray + 320), 'but not far from him');
  const end = play(act, HAIRS.seconds - 3);
  const gone = end.find(event => event.type === 'clones-gone');
  assert.equal(gone.at.length, HAIRS.count);
  assert.equal(act.clones.length, 0);
  // The same tuft blown the same way comes out the same.
  assert.deepEqual(createClones(act.hero, 30, 7), createClones(act.hero, 30, 7));
  assert.notDeepEqual(createClones(act.hero, 30, 7), createClones(act.hero, 30, 8));
});

test('a crowd of clones fells soldiers, on the ground and on a cloud, and its blows are counted but grow no hairs', () => {
  const level = lay(flatLevel(2400, GROUND, [{ type: 'spawn', x: 200, y: GROUND }, { type: 'spearman', x: 520, y: GROUND }, { type: 'archer', x: 17 * CELL, y: 7 * CELL }]), 'cloud', 15, 7, 4),
    act = createAct(level);
  blow(act);
  const events = play(act, 5, ask({ move: -1 }));
  assert.equal(remaining(act), 0, 'both are down');
  assert.equal(act.felled, 2);
  assert.ok(events.some(event => event.type === 'met' && event.crowd && event.foe));
  assert.ok(act.best >= 8, `the count reached ${act.best}`);
  assert.equal(act.hairs, 0);
});

test('against Nezha the crowd wears a phase down and cannot skip one; if the Monkey King falls, they are gone', () => {
  const act = court(),
    { boss, hero } = act;
  hero.x = 1200;
  play(act, BOSS.enter.seconds + 0.1);
  hero.x = boss.x - 400;
  blow(act);
  let events = [];
  for (let t = 0; t < HAIRS.seconds && act.clones.length; t += DT) events.push(...stepAct(act, ask({ move: hero.x > boss.arena.left + 100 ? -1 : 0, dash: hero.state === 'move' && boss.state === 'windup' }), DT));
  const dealt = events.filter(event => event.type === 'met' && event.crowd && event.boss).length;
  assert.ok(dealt >= 8 && dealt <= 22, `the crowd landed ${dealt} blows, and he is in ${boss.state} with ${boss.health}`);
  assert.ok(boss.health >= BOSS.phases[0].until, 'he is still in his first phase, or just out of it');
  assert.ok(boss.phase <= 1);

  const fallen = court();
  fallen.hero.x = 1200;
  play(fallen, 0.2);
  blow(fallen);
  play(fallen, 1);
  hurtHero(fallen.hero, 0, TUNE.health);
  fallen.reviveIn = REVIVE_SECONDS;
  assert.ok(types(stepAct(fallen, ask(), DT)).includes('clones-gone'));
  assert.equal(fallen.clones.length, 0);
});

// ---- Erlang ----------------------------------------------------------------------------------------------------
const { ERLANG } = erlang;
const godFight = (boss, hero, seconds) => {
  const events = [];
  for (let t = 0; t < seconds; t += DT) events.push(...erlang.stepBoss(boss, hero, DT));
  return events;
};
/** Him, come down into a court and ready, with someone standing `gap` to his left; his hound kept away unless asked for. */
function god(gap = 200, withHound = false) {
  const boss = erlang.createBoss(1600, GROUND, COURT),
    hero = { x: 1600 - gap, y: GROUND, state: 'move' };
  if (!withHound) boss.hound.wait = Infinity;
  erlang.wakeBoss(boss);
  godFight(boss, hero, ERLANG.enter.seconds + DT);
  return { boss, hero };
}
function godUntil(boss, hero, type, limit = 10) {
  for (let t = 0; t < limit; t += DT) {
    const found = erlang.stepBoss(boss, hero, DT).find(event => event.type === type);
    if (found) return { ...found, after: t };
  }
  assert.fail(`no ${type} within ${limit} s (he is in ${boss.state}, ${boss.move})`);
}
const MIGHTY = { kind: 'slam', power: 100 };

test('Erlang warns before his glaive comes down, and it reaches a long way in front of him', () => {
  const { boss, hero } = god(190);
  assert.deepEqual([boss.kind, boss.state, boss.rise, boss.form], ['erlang', 'idle', 0, 'man']);
  assert.equal(godUntil(boss, hero, 'boss-windup').move, 'slash');
  assert.equal(erlang.bossReach(boss), null);
  assert.equal(erlang.bossAnimation(boss).name, 'windup');
  const struck = godUntil(boss, hero, 'boss-strike');
  assert.ok(Math.abs(struck.after - ERLANG.slash.windup) < 2 * DT);
  godFight(boss, hero, ERLANG.slash.from + 2 * DT);
  const reach = erlang.bossReach(boss);
  assert.ok(reach.x < boss.x - 150 && reach.x + reach.width > boss.x, 'from just behind him to well in front');
  assert.ok(overlaps(reach, bodyOf(createHero(hero.x, GROUND))));
  godFight(boss, hero, ERLANG.slash.seconds);
  assert.equal(boss.state, 'idle');
});

test('he leaps to where the Monkey King stood and strikes what is under him as he lands', () => {
  const { boss, hero } = god(420);
  boss.turn = 1;
  assert.equal(godUntil(boss, hero, 'boss-windup').move, 'leap');
  godUntil(boss, hero, 'boss-strike');
  const aimed = hero.x;
  hero.x += 400;
  let highest = 0;
  for (let t = 0; t < 2 && boss.lift !== null; t += DT) (erlang.stepBoss(boss, hero, DT), (highest = Math.max(highest, boss.rise)));
  assert.ok(highest > 120, `he rose ${highest}`);
  assert.ok(Math.abs(boss.x - aimed) < 12, `he came down at ${boss.x}, having aimed at ${aimed}`);
  assert.deepEqual([boss.rise, boss.waves.length], [0, 0]);
  const reach = erlang.bossReach(boss);
  assert.ok(reach && overlaps(reach, bodyOf(createHero(aimed, GROUND))) && !overlaps(reach, bodyOf(createHero(hero.x, GROUND))));
  godFight(boss, hero, ERLANG.leap.land + 0.02);
  assert.equal(erlang.bossReach(boss), null);
});

test('in his second phase he becomes a hawk, stoops twice, and is himself again; struck as a hawk he falls', () => {
  const { boss, hero } = god(300);
  assert.deepEqual(erlang.hitBoss(boss, MIGHTY), [{ type: 'boss-phase', phase: 1 }]);
  assert.equal(erlang.open(boss), false);
  godFight(boss, hero, ERLANG.roar + DT);
  assert.equal(godUntil(boss, hero, 'boss-windup').move, 'hawk');
  assert.equal(erlang.bossAnimation(boss).name, 'crouch');
  assert.equal(godUntil(boss, hero, 'boss-change').form, 'hawk');
  assert.ok(erlang.bossBox(boss).height < 80, 'a hawk is a small thing to hit');
  let stoops = 0,
    top = 0;
  const events = [];
  for (let t = 0; t < 8 && boss.form === 'hawk'; t += DT) {
    for (const event of erlang.stepBoss(boss, hero, DT)) (events.push(event), event.type === 'boss-strike' && stoops++);
    top = Math.max(top, boss.rise);
    if (boss.step === 'stoop') assert.ok(overlaps(erlang.bossReach(boss), erlang.bossBox(boss)));
  }
  assert.equal(stoops, ERLANG.hawk.stoops);
  assert.ok(Math.abs(top - ERLANG.hawk.height) < 2);
  assert.deepEqual(events.at(-1), { type: 'boss-change', form: 'man' });
  assert.deepEqual([boss.form, boss.rise, boss.state], ['man', 0, 'idle']);

  // The next time, the staff meets him in the air.
  boss.turn = 0;
  godUntil(boss, hero, 'boss-change');
  godFight(boss, hero, 0.3);
  assert.deepEqual(types(erlang.hitBoss(boss, LIGHT)), ['boss-change', 'boss-stun']);
  assert.deepEqual([boss.form, boss.state], ['man', 'stun']);
  godFight(boss, hero, 0.5);
  assert.equal(boss.rise, 0, 'he has come down');
});

test('in his last phase he grows, his reach grows with him, and his landing sends a wave each way', () => {
  const { boss, hero } = god(300);
  erlang.hitBoss(boss, MIGHTY);
  godFight(boss, hero, ERLANG.roar + DT);
  const before = erlang.bossBox(boss);
  assert.deepEqual(erlang.hitBoss(boss, MIGHTY), [{ type: 'boss-phase', phase: 2 }]);
  godFight(boss, hero, ERLANG.roar + 0.3);
  assert.equal(boss.size, ERLANG.phases[2].size);
  const grown = erlang.bossBox(boss);
  assert.ok(Math.abs(grown.height / before.height - boss.size) < 0.01 && grown.y + grown.height === before.y + before.height, 'he stands on the same ground, taller');
  assert.equal(godUntil(boss, hero, 'boss-windup').move, 'leap');
  godUntil(boss, hero, 'boss-land');
  assert.deepEqual(boss.waves.map(wave => Math.sign(wave.vx)), [-1, 1]);
  const [hazard] = erlang.bossHazards(boss);
  assert.ok(hazard.box.y + hazard.box.height === GROUND && hazard.box.height < 60, 'a wave is low, and can be jumped');
  godFight(boss, hero, ERLANG.leap.wave.seconds + 0.1);
  assert.equal(boss.waves.length, 0);
  // Beaten, he kneels, and then he is gone.
  assert.deepEqual(types(erlang.hitBoss(boss, MIGHTY)), ['boss-down']);
  assert.equal(erlang.bossAnimation(boss).name, 'down');
  assert.deepEqual(types(godFight(boss, hero, ERLANG.yield + DT)), ['boss-gone']);
});

test('his hound comes from behind the Monkey King, shows itself, and runs past him; struck twice it keeps away', () => {
  const { boss, hero } = god(300, true),
    hound = boss.hound;
  // Its master is kept waiting, so that he stays on his side of the court.
  boss.rest = 99;
  assert.equal(erlang.houndAnimation(hound), null, 'it keeps out of sight at first');
  const shown = godUntil(boss, hero, 'hound-windup');
  assert.ok(shown.hound.x < hero.x && hound.facing === 1, 'he faces its master, so it comes from the left');
  assert.equal(erlang.houndAnimation(hound).name, 'crouch');
  assert.ok(!erlang.bossHazards(boss).length, 'showing itself, it hurts nobody');
  godUntil(boss, hero, 'hound-run');
  assert.equal(erlang.bossHazards(boss).length, 1);
  godUntil(boss, hero, 'hound-gone');
  assert.ok(hound.x >= hero.x + ERLANG.hound.past - 12, `it ran on to ${hound.x}`);
  assert.equal(hound.state, 'lurk');
  // The other way round, and the staff ready for it.
  hero.x = boss.x + 300;
  godUntil(boss, hero, 'hound-run');
  assert.equal(hound.facing, -1);
  assert.deepEqual(types(erlang.hitHound(boss)), ['hound-yelp']);
  assert.equal(erlang.houndAnimation(hound).name, 'yelp');
  assert.deepEqual(erlang.hitHound(boss), [], 'backing away, it is out of reach');
  godUntil(boss, hero, 'hound-gone');
  godUntil(boss, hero, 'hound-run');
  erlang.hitHound(boss);
  godUntil(boss, hero, 'hound-gone');
  assert.ok(hound.wait > ERLANG.phases[0].hound + ERLANG.hound.sulk - 1, 'after two it keeps away longer');
});

/** An act that is only Erlang's court. */
function godCourt() {
  const level = lay(flatLevel(2400, GROUND, [{ type: 'spawn', x: 200, y: GROUND }, { type: 'checkpoint', x: 900, y: GROUND }, { type: 'erlang', x: 1700, y: GROUND }, { type: 'gate', x: 2100, y: GROUND }]), 'cloud', 24, 7, 4);
  return createAct(level, { from: 'boss' });
}

test('in the court the hound bites whoever stands in its way, a jump clears it, and the staff sends it off', () => {
  const run = input => {
    const act = godCourt();
    act.hero.x = 1200;
    play(act, ERLANG.enter.seconds + 0.1);
    Object.assign(act.boss, { rest: 99 });
    act.boss.hound.wait = 0;
    const events = [];
    for (let t = 0; t < 4; t += DT) events.push(...stepAct(act, input(act), DT));
    return { act, events };
  };
  const bitten = run(() => ask());
  assert.equal(bitten.act.hero.health, TUNE.health - 1);
  const near = act => act.boss.hound.state === 'run' && Math.abs(act.boss.hound.x - act.hero.x) < 170;
  const jumped = run(act => ask({ jump: near(act) && act.hero.grounded, jumpHeld: true }));
  assert.equal(jumped.act.hero.health, TUNE.health);
  const struck = run(act => ask({ attack: near(act), move: near(act) ? -1 : 0 }));
  assert.ok(struck.events.some(event => event.type === 'met' && event.hound), 'the staff met the hound');
  assert.ok(types(struck.events).includes('hound-yelp'));
  assert.equal(struck.act.hero.health, TUNE.health);
});

test('driving Erlang off opens the moon gate, and a fall in his court puts the fight back to its phase', () => {
  const act = godCourt(),
    { boss, hero } = act;
  hero.x = 1200;
  assert.ok(types(play(act, 0.1)).includes('boss-enter'));
  play(act, ERLANG.enter.seconds + 0.1);
  erlang.hitBoss(boss, MIGHTY);
  erlang.hitBoss(boss, { kind: 'hit', power: 3 });
  hurtHero(hero, hero.x + 10, TUNE.health);
  play(act, 0.1);
  assert.deepEqual([boss.health, boss.phase, boss.form, boss.state], [ERLANG.phases[0].until, 1, 'man', 'idle']);
  erlang.hitBoss(boss, MIGHTY);
  play(act, ERLANG.roar + 0.5);
  erlang.hitBoss(boss, MIGHTY);
  const end = play(act, ERLANG.yield + 0.1);
  assert.deepEqual(types(end).filter(type => type.startsWith('boss') || type === 'gate-open'), ['boss-gone', 'gate-open']);
  hero.x = 2090;
  assert.ok(types(play(act, 1.5)).includes('clear'));
});

/**
 * How a simple player fights Erlang: strikes him when near; rolls as the glaive comes down and as he lands;
 * jumps the hound and the waves; and strikes the hawk as it stoops.
 */
function duelGod(act) {
  const { hero, boss } = act,
    dx = boss.x - hero.x,
    gap = Math.abs(dx),
    toward = Math.sign(dx) || 1,
    low = erlang.bossHazards(boss).some(({ box }) => Math.abs(box.x + box.width / 2 - hero.x) < 150) || (boss.hound.state === 'run' && Math.abs(boss.hound.x - hero.x) < 170 && Math.sign(hero.x - boss.hound.x) === boss.hound.facing);
  if (low && hero.grounded) return ask({ jump: true, jumpHeld: true });
  if (!hero.grounded) return ask({ jumpHeld: true });
  if (boss.form === 'hawk') return ask({ move: toward * 0.01, attack: boss.step === 'stoop' && Math.hypot(dx, boss.rise - 60) < 190 && hero.state === 'move' });
  if (boss.state === 'attack' && boss.move === 'slash' && boss.time < 0.06) return ask({ move: toward, dash: true });
  if (boss.state === 'attack' && boss.move === 'leap' && boss.lift !== null) return ask({ move: -toward, dash: boss.lift < 0 && boss.rise < 90 });
  const reach = 104 + ERLANG.halfWidth * boss.size,
    left = boss.state === 'windup' ? ERLANG[boss.move].windup - boss.time : 9;
  if (!erlang.open(boss)) return ask({ move: gap > reach + 80 ? toward : 0 });
  return ask({ move: gap > reach - 20 ? toward : 0, attack: gap < reach && left > 0.4 });
}

/** The clouds of a level, each as the span it covers and the height of its top. */
function cloudsOf(level) {
  const spans = [];
  for (let row = 0; row < level.rows; row++)
    for (let column = 0; column < level.columns; column++)
      if (level.kind[row * level.columns + column] === 2) {
        const last = spans.at(-1);
        if (last && last.y === row * CELL && last.to === column * CELL) last.to += CELL;
        else spans.push({ from: column * CELL, to: (column + 1) * CELL, y: row * CELL });
      }
  return spans;
}
/**
 * How a simple player fights him: stands close and strikes; rolls through a thrust or a sweep at the last
 * moment; knocks the ring back when it comes; and waits out the ride on the nearest cloud.
 */
function duel(act, clouds) {
  const { hero, boss } = act,
    dx = boss.x - hero.x,
    gap = Math.abs(dx),
    toward = Math.sign(dx) || 1;
  if ((boss.move === 'charge' && boss.state !== 'idle') || boss.fires.length) {
    const cloud = clouds.reduce((best, each) => (Math.abs((each.from + each.to) / 2 - hero.x) < Math.abs((best.from + best.to) / 2 - hero.x) ? each : best)),
      middle = (cloud.from + cloud.to) / 2;
    if (hero.grounded && hero.y <= cloud.y) return ask({ jumpHeld: true });
    return ask({ move: Math.abs(middle - hero.x) < 30 ? 0 : Math.sign(middle - hero.x), jump: hero.grounded && Math.abs(middle - hero.x) < 110, jumpHeld: true });
  }
  const ring = boss.ring;
  if (ring && !ring.struck) {
    const away = ring.x - hero.x,
      coming = Math.sign(ring.vx) === -Math.sign(away);
    return ask({ move: coming ? Math.sign(away) * 0.01 : 0, attack: coming && Math.abs(away) < 170 && hero.state === 'move' });
  }
  const warning = boss.state === 'windup' && boss.move !== 'ring',
    left = warning ? BOSS[boss.move].windup * (boss.phase === 2 ? BOSS.quick : 1) - boss.time : 9;
  if (warning && left < 0.07 && gap < (boss.move === 'thrust' ? 520 : 200)) return ask({ move: toward, dash: true });
  if (!open(boss)) return ask({ move: gap > 180 ? toward : 0 });
  return ask({ move: gap > 90 ? toward : 0, attack: gap < 120 && left > 0.4 });
}

/**
 * A simple player, for any act: makes for the nearest foe to the left of the rest, jumping toward one who stands
 * higher and backing off to try again when he ends up underneath; strikes what is near (and what flies low
 * enough over him), and rolls from a spearman's warning. Whoever bars the gate is fought as `duel` fights.
 */
function playThrough(level, limit = 600) {
  const act = createAct(level),
    clouds = act.boss ? cloudsOf(level).filter(cloud => cloud.from > act.boss.arena.left) : [];
  let stuck = 0,
    last = 0,
    retreat = 0;
  for (let t = 0; t < limit && act.state === 'play'; t += DT) {
    if (act.boss && present(act.boss)) {
      stepAct(act, act.boss.kind === 'erlang' ? duelGod(act) : duel(act, clouds), DT);
      continue;
    }
    const hero = act.hero,
      target = act.foes.find(foe => foe.state !== 'down') ?? act.gate,
      dx = target.x - hero.x,
      above = target.y < hero.y - 40,
      level = Math.abs(target.y - hero.y) < 40,
      inReach = level || (target.flies && hero.y - target.y < 170),
      gap = Math.abs(dx);
    if (above && !target.flies && gap < 70 && hero.grounded && target.y < hero.y - 150) retreat = 1.3;
    retreat -= DT;
    const move = retreat > 0 ? -1 : inReach && gap < 70 && 'health' in target ? 0 : Math.sign(dx) || 1;
    stuck = move && Math.abs(hero.x - last) < 0.05 && hero.grounded ? stuck + DT : 0;
    last = hero.x;
    const jump = hero.grounded && retreat <= 0 && ((above && !target.flies && gap < 420) || stuck > 0.1);
    const warned = act.foes.some(foe => (foe.kind === 'spearman' || foe.kind === 'guard') && foe.state === 'windup' && foe.time > 0.3 && Math.abs(foe.x - hero.x) < 150 && Math.abs(foe.y - hero.y) < 40);
    stepAct(act, ask({ move, attack: inReach && gap < 120 && 'health' in target, jump, jumpHeld: true, dash: warned }), DT);
  }
  return act;
}
const told = act => `stopped at x ${Math.round(act.hero.x)} with ${remaining(act)} standing after ${Math.round(act.time)} s`;

test('the first act can be played through, Nezha and all, and is not over in a moment', () => {
  const act = playThrough(readLevel(ACT1));
  assert.equal(act.state, 'cleared', told(act));
  assert.equal(act.result.felled, 10);
  assert.ok(act.boss.gone, 'Nezha was driven off');
  assert.ok(act.result.time > 45, `cleared in ${act.result.time} s`);
  console.log(`    a simple player clears the first act in ${Math.round(act.result.time)} s, falling ${act.result.falls} times and wounded ${act.result.wounds} times: rank ${act.result.rank}`);
});

test('the second act can be played through: shields, cranes, Erlang and all', () => {
  const act = playThrough(readLevel(ACT2));
  assert.equal(act.state, 'cleared', told(act));
  assert.equal(act.result.felled, 14);
  assert.ok(act.boss.gone, 'Erlang was driven off');
  assert.ok(act.result.time > 60, `cleared in ${act.result.time} s`);
  console.log(`    a simple player clears the second act in ${Math.round(act.result.time)} s, falling ${act.result.falls} times, wounded ${act.result.wounds} times and eating ${act.eaten} peaches: rank ${act.result.rank}`);
});
