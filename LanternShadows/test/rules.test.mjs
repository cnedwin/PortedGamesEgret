// Rule tests: how the Monkey King moves and fights, and how the yard counts his blows.
// Run from the LanternShadows folder with `node --test test/*.test.mjs`.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ATTACKS, CHAIN_GRACE, TUNE, animationOf, createHero, reach, stepHero } from '../src/rules/hero.mjs';
import { COMBO_SECONDS, GROUND, POST_ROOM, YARD, createYard, keepApart, postBox, stepYard, strike } from '../src/rules/yard.mjs';

const DT = 1 / 120;
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
  // Every ledge is within a jump of the one below it.
  const heights = [...new Set(YARD.floors.map(floor => floor.y))].sort((a, b) => b - a);
  for (let i = 1; i < heights.length; i++) assert.ok(heights[i - 1] - heights[i] < full - 12, `a ledge ${heights[i - 1] - heights[i]} above the last`);
});

test('a jump asked for just before landing, or just after walking off an edge, still happens', () => {
  const hero = fresh();
  press(hero, { jump: true }, 0.2, { jumpHeld: true });
  while (hero.y < GROUND - 14 || hero.vy < 0) stepHero(hero, ask(), DT, YARD);
  // Still in the air: the press is remembered until his feet touch.
  assert.equal(hero.grounded, false);
  const events = press(hero, { jump: true }, 0.1, { jumpHeld: true });
  assert.deepEqual(types(events), ['land', 'jump']);

  const cloud = YARD.floors.find(floor => floor.cloud),
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
  const cloud = YARD.floors.find(floor => floor.cloud),
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
  assert.equal(hero.x, TUNE.halfWidth);
  hero.x = YARD.width - 40;
  run(hero, 1, ask({ move: 1 }));
  assert.equal(hero.x, YARD.width - TUNE.halfWidth);
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

test('the yard counts blows in a row and lets the count lapse', () => {
  const yard = createYard(),
    post = yard.posts[0],
    hero = createHero(post.x - 90, post.y);
  const blow = attack => strike(yard, reach(hero, attack), hero.x, attack);
  const [met] = blow(ATTACKS[0]);
  assert.equal(met.post, post);
  assert.equal(met.side, 1, 'struck from its left');
  const box = postBox(post);
  assert.ok(met.at.y > box.y && met.at.y < box.y + box.height);
  blow(ATTACKS[1]);
  blow(ATTACKS[2]);
  assert.deepEqual([yard.combo, yard.best, post.hits, yard.total], [3, 3, 4, 4]);
  // A blow that meets nothing does not count, and does not keep the count alive.
  hero.facing = -1;
  assert.deepEqual(blow(ATTACKS[0]), []);
  assert.equal(yard.combo, 3);
  let lapsed = 0;
  for (let t = 0; t < COMBO_SECONDS + 0.1; t += DT) lapsed += stepYard(yard, DT) ? 1 : 0;
  assert.equal(lapsed, 1);
  assert.deepEqual([yard.combo, yard.best], [0, 3]);
  // From the other side, the post is struck on its right.
  hero.x = post.x + 90;
  assert.equal(blow(ATTACKS[0])[0].side, -1);
});

test('every post can be struck from where he can stand', () => {
  for (const post of YARD.posts) {
    assert.ok(YARD.floors.some(floor => floor.y === post.y && post.x >= floor.x && post.x <= floor.x + floor.width), `post at ${post.x} stands on nothing`);
    const yard = createYard(),
      hero = createHero(post.x - 60, post.y);
    assert.equal(strike(yard, reach(hero, ATTACKS[0]), hero.x, ATTACKS[0]).length, 1);
  }
});

test('a post stops him walking through it, his blows still reach it, and the cloud roll passes it', () => {
  const yard = createYard(),
    post = yard.posts[0],
    hero = createHero(post.x - 200, post.y);
  for (let t = 0; t < 2; t += DT) (stepHero(hero, ask({ move: 1 }), DT, YARD), keepApart(hero, yard));
  assert.equal(hero.x, post.x - POST_ROOM);
  // From where he is stopped, all three blows land, each stepping in and being put back.
  for (const attack of ATTACKS) {
    const events = [];
    for (let t = 0; t < attack.seconds; t += DT) (events.push(...stepHero(hero, ask({ attack: t === 0 }), DT, YARD)), keepApart(hero, yard));
    const blow = events.find(event => event.type === 'strike');
    assert.equal(strike(yard, blow.box, hero.x, blow.attack).length, 1, attack.name);
    assert.ok(hero.x <= post.x - POST_ROOM);
    run(hero, 0.4);
  }
  // The roll carries him through to the far side.
  run(hero, 0.5);
  for (let t = 0; t < 0.6; t += DT) (stepHero(hero, ask({ dash: t === 0 }), DT, YARD), keepApart(hero, yard));
  assert.ok(hero.x >= post.x + POST_ROOM, `he is at ${hero.x}, the post at ${post.x}`);
  // On another ledge, the post is not in his way.
  const cloud = yard.posts.find(other => other.y !== GROUND),
    under = createHero(cloud.x, GROUND);
  keepApart(under, yard);
  assert.equal(under.x, cloud.x);
});
