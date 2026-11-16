// The rules, checked without a picture: the ground, the hero's deeds, the hired men and Lu Qian.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BARS, PLACES, ROUNDS, edge, settle } from '../src/rules/arena.mjs';
import { begin, createGame, quiet, revive, spawn, step } from '../src/rules/game.mjs';
import { FOES, HERO, PARTIES } from '../src/rules/tune.mjs';
import { createBot } from './bot.mjs';

const TICK = 1 / 60;
const run = (game, seconds, input = quiet) => {
  const seen = [];
  for (let i = 0; i < seconds * 60; i++) seen.push(...step(game, typeof input === 'function' ? input(game) : input, TICK).map((e) => ({ ...e })));
  return seen;
};
/** A game with only the given foes, standing where asked. */
function duel(kind, distance = 2) {
  const game = createGame(3);
  game.foes = [];
  const foe = spawn(game, kind, 0, 0);
  game.hero.x = 0;
  game.hero.z = 8;
  game.hero.face = Math.PI;
  foe.x = 0;
  foe.z = 8 - distance;
  foe.state = 'roam';
  foe.pause = 99;
  game.turnPause = 99;
  return { game, hero: game.hero, foe };
}

test('every place of the chapter is on walkable ground and clear of obstacles', () => {
  for (const [name, at] of Object.entries(PLACES)) if (name !== 'temple' && name !== 'camp' && name !== 'rest') assert.ok(edge(at.x, at.z) < -1, name);
  for (const party of PARTIES) for (const p of party) assert.ok(edge(p.x, p.z) < -0.5 && !ROUNDS.some((r) => Math.hypot(r.x - p.x, r.z - p.z) < r.r + 0.5), `${p.kind} at ${p.x},${p.z}`);
});

test('nowhere on the ground holds a walker fast', () => {
  // From a grid of starting points, push eight ways, then make sure one can still get away.
  for (let x = -18; x <= 18; x += 1.5)
    for (let z = -40; z <= 38; z += 1.5) {
      if (edge(x, z) > -0.6) continue;
      for (let a = 0; a < 8; a++) {
        const p = settle({ x, z }, HERO.radius);
        for (let i = 0; i < 40; i++) {
          p.x += Math.sin((a * Math.PI) / 4) * 0.09;
          p.z += Math.cos((a * Math.PI) / 4) * 0.09;
          settle(p, HERO.radius);
        }
        const from = { ...p };
        let best = 0;
        for (let b = 0; b < 8; b++) {
          const q = { ...from };
          for (let i = 0; i < 20; i++) {
            q.x += Math.sin((b * Math.PI) / 4) * 0.09;
            q.z += Math.cos((b * Math.PI) / 4) * 0.09;
            settle(q, HERO.radius);
          }
          best = Math.max(best, Math.hypot(q.x - from.x, q.z - from.z));
        }
        assert.ok(best > 0.8, `stuck near ${from.x.toFixed(1)}, ${from.z.toFixed(1)}`);
      }
    }
});

test('the bars close the doorway and the forecourt', () => {
  const p = settle({ x: 0, z: BARS.gate.az }, HERO.radius, [BARS.gate]);
  assert.ok(Math.abs(p.z - BARS.gate.az) >= BARS.gate.r);
  // With the forecourt barred, a walk south from inside is stopped at the bar.
  const q = { x: 0, z: -23 };
  for (let i = 0; i < 200; i++) (q.z += 0.09), settle(q, HERO.radius, [BARS.court]);
  assert.ok(q.z < BARS.court.az);
});

test('three presses make the three cuts, and the third is the heavy one', () => {
  const { game, foe } = duel('blade');
  foe.hp = foe.maxHp = 999;
  const cuts = [];
  for (let i = 0; i < 150; i++) {
    const input = quiet();
    input.attack = i % 12 === 0;
    for (const e of step(game, input, TICK)) if (e.type === 'hit') cuts.push(e.heavy);
  }
  assert.deepEqual(cuts.slice(0, 3), [false, false, true]);
});

test('a cut turns to the nearest man and slides in without passing him', () => {
  const { game, hero, foe } = duel('blade', 4.2);
  hero.face = 0; // looking the wrong way
  const input = quiet();
  input.attack = true;
  input.az = -1;
  step(game, input, TICK);
  const hits = run(game, 0.4).filter((e) => e.type === 'hit');
  assert.equal(hits.length, 1);
  assert.ok(Math.hypot(hero.x - foe.x, hero.z - foe.z) > foe.sheet.radius + HERO.radius);
});

test('guarding spends stamina; raising the guard just in time spends none and opens a riposte', () => {
  for (const [lead, type] of [
    [0.5, 'block'],
    [0.1, 'parry']
  ]) {
    const { game, hero, foe } = duel('blade');
    foe.pause = 0;
    game.turnPause = 0;
    let seen = null;
    for (let i = 0; i < 240 && !seen; i++) {
      const input = quiet();
      input.guard = foe.state === 'strike' || (foe.state === 'windup' && foe.t > foe.move.windup - lead);
      input.az = -1;
      for (const e of step(game, input, TICK)) if (e.type === 'block' || e.type === 'parry' || e.type === 'hurt') seen = e.type;
    }
    assert.equal(seen, type);
    assert.equal(hero.hp, HERO.hp);
    assert.ok(type === 'parry' ? hero.stamina === HERO.stamina : hero.stamina < HERO.stamina);
    assert.ok(hero.counter > 0);
    const input = quiet();
    input.attack = true;
    step(game, input, TICK);
    for (let i = 0; i < 12 && hero.state !== 'riposte'; i++) step(game, quiet(), TICK);
    assert.equal(hero.state, 'riposte');
    const before = foe.hp;
    run(game, 0.5);
    assert.ok(foe.hp <= before - HERO.riposte.damage || foe.state === 'dead');
  }
});

test('a dodge through a blow takes no harm and slows the moment', () => {
  const { game, hero, foe } = duel('blade');
  foe.pause = 0;
  game.turnPause = 0;
  let slipped = false;
  for (let i = 0; i < 240 && !slipped; i++) {
    const input = quiet();
    input.dodge = foe.state === 'windup' && foe.t > foe.move.windup - 0.05;
    input.mx = 1;
    for (const e of step(game, input, TICK)) if (e.type === 'slip') slipped = true;
  }
  assert.ok(slipped);
  assert.equal(hero.hp, HERO.hp);
  assert.ok(game.slow > 0);
});

test('a dodge breaks out of a cut', () => {
  const { game, hero } = duel('blade', 6);
  const a = quiet();
  a.attack = true;
  step(game, a, TICK);
  assert.equal(hero.state, 'cut');
  const d = quiet();
  d.dodge = true;
  step(game, d, TICK);
  assert.equal(hero.state, 'dodge');
});

test('the shield turns two light cuts aside and answers; the third breaks through', () => {
  const { game, foe } = duel('shield');
  foe.face = 0;
  const seen = [];
  for (let i = 0; i < 200; i++) {
    const input = quiet();
    input.attack = i % 10 === 0;
    seen.push(...step(game, input, TICK).map((e) => e.type));
    game.hero.hp = HERO.hp;
    game.hero.safe = 1;
  }
  assert.ok(seen.filter((t) => t === 'deflect').length >= 2);
  assert.ok(seen.includes('shieldBreak'));
  assert.ok(seen.some((t) => t === 'windup'));
});

test('a blow late in a windup breaks the attack', () => {
  const { game, foe } = duel('blade');
  foe.pause = 0;
  game.turnPause = 0;
  let broke = false;
  for (let i = 0; i < 300 && !broke; i++) {
    const input = quiet();
    input.attack = foe.state === 'windup' && foe.t > foe.move.windup * 0.5 - 0.1 && game.hero.state === 'free';
    for (const e of step(game, input, TICK)) if (e.type === 'interrupt') broke = true;
  }
  assert.ok(broke);
  assert.equal(foe.state, 'stagger');
});

test('only one of the blades strikes at a time', () => {
  const game = createGame(5);
  game.foes = game.foes.filter((foe) => foe.kind === 'blade');
  for (const foe of game.foes) foe.state = 'roam';
  game.hero.z = 8;
  game.hero.hp = 1e6;
  for (let i = 0; i < 60 * 20; i++) {
    step(game, quiet(), TICK);
    assert.ok(game.foes.filter((foe) => foe.state === 'windup' || foe.state === 'strike').length <= 1);
  }
});

test('arrows can be cut out of the air', () => {
  const { game, hero, foe } = duel('bow', 9);
  foe.pause = 0;
  let cut = false;
  for (let i = 0; i < 400 && !cut; i++) {
    const input = quiet();
    const arrow = game.shots.find((shot) => shot.from === 'foe');
    input.attack = !!arrow && Math.hypot(arrow.x - hero.x, arrow.z - hero.z) < 4.4 && hero.state === 'free';
    input.az = -1;
    for (const e of step(game, input, TICK)) if (e.type === 'cutArrow') cut = true;
  }
  assert.ok(cut);
  assert.equal(hero.hp, HERO.hp);
});

test('the three stars fly and seek; the rain needs a full bar and empties it', () => {
  const { game, hero, foe } = duel('blade', 7);
  foe.hp = foe.maxHp = 9999;
  const s = quiet();
  s.stars = true;
  step(game, s, TICK);
  const hits = run(game, 1.5).filter((e) => e.type === 'starHit').length;
  assert.ok(hits >= 2);
  assert.ok(hero.starsWait > 0);
  const r = quiet();
  r.rain = true;
  step(game, r, TICK);
  assert.notEqual(hero.state, 'rain');
  hero.will = HERO.will;
  step(game, r, TICK);
  assert.equal(hero.state, 'rain');
  const before = foe.hp,
    seen = run(game, HERO.rain.time + 0.2);
  assert.equal(seen.filter((e) => e.type === 'spear').length, HERO.rain.spears);
  assert.ok(seen.some((e) => e.type === 'burst'));
  assert.ok(before - foe.hp > 60 && before - foe.hp < 220);
  assert.ok(hero.will < 30);
});

test('wine mends, the gourd empties, a brazier fills it again', () => {
  const game = createGame();
  const hero = game.hero;
  hero.hp = 30;
  const d = quiet();
  d.drink = true;
  step(game, d, TICK);
  run(game, 1);
  assert.equal(hero.hp, 30 + HERO.drink.heal);
  assert.equal(hero.gourd, HERO.gourd - 1);
  hero.x = PLACES.camp.x - 1.2;
  hero.z = PLACES.camp.z + 1;
  const seen = run(game, 0.2);
  assert.ok(seen.some((e) => e.type === 'rest'));
  assert.equal(hero.gourd, HERO.gourd);
  assert.equal(hero.hp, HERO.hp);
});

test('Lu Qian: his guard breaks under ripostes, he changes at half, and his fall ends the chapter', () => {
  const game = createGame(2);
  game.foes = game.foes.filter((foe) => foe.kind === 'lu');
  game.stage = 'gate';
  game.bars.gate = false;
  game.hero.x = 0;
  game.hero.z = -22;
  const lu = game.boss;
  let seen = run(game, 0.1);
  assert.ok(seen.some((e) => e.type === 'cine' && e.id === 'meet'));
  assert.ok(game.bars.court);
  assert.equal(game.checkpoint, 'rest');
  run(game, 6);
  lu.posture = lu.sheet.posture - 1;
  lu.postureRest = 9;
  game.hero.x = lu.x;
  game.hero.z = lu.z + 2.5;
  game.hero.face = Math.PI;
  game.hero.safe = 5;
  const a = quiet();
  a.attack = true;
  a.az = -1;
  for (let i = 0; i < 90 && lu.state !== 'down'; i++) step(game, i % 9 === 0 ? a : quiet(), TICK);
  assert.equal(lu.state, 'down');
  lu.hp = lu.maxHp * 0.5 + 1;
  game.hero.safe = 5;
  seen = [];
  for (let i = 0; i < 120 && lu.phase === 1; i++) seen.push(...step(game, i % 9 === 0 ? a : quiet(), TICK).map((e) => ({ ...e })));
  assert.equal(lu.phase, 2);
  assert.ok(seen.some((e) => e.type === 'cine' && e.id === 'rage'));
  run(game, 3);
  lu.hp = 1;
  game.hero.x = lu.x;
  game.hero.z = lu.z + 2.5;
  game.hero.face = Math.PI;
  game.hero.safe = 5;
  game.hero.state = 'free';
  for (let i = 0; i < 200 && game.stage !== 'done'; i++) step(game, i % 9 === 0 ? a : quiet(), TICK);
  assert.equal(game.stage, 'done');
  assert.ok(!game.bars.court);
  assert.ok(game.drops.some((drop) => drop.kind === 'page'));
});

test('a fall leads back to the brazier, and Lu Qian is whole again', () => {
  const game = createGame();
  game.foes = game.foes.filter((foe) => foe.kind === 'lu');
  game.stage = 'gate';
  game.hero.z = -22;
  run(game, 6);
  game.boss.hp = 100;
  game.hero.hp = 0.1;
  game.hero.x = game.boss.x;
  game.hero.z = game.boss.z + 2;
  const seen = run(game, 12);
  assert.ok(seen.some((e) => e.type === 'fall'));
  assert.ok(seen.some((e) => e.type === 'revive'));
  assert.equal(game.boss.hp, FOES.lu.hp);
  assert.equal(game.stage, 'gate');
  assert.ok(Math.hypot(game.hero.x - PLACES.rest.x, game.hero.z - PLACES.rest.z) < 4);
  void revive;
});

test('a careful player finishes the chapter; one who only attacks holds out for a while', () => {
  for (const seed of [1, 2, 3]) {
    const game = createGame(seed),
      bot = createBot();
    begin(game);
    for (let i = 0; i < 60 * 420 && game.stage !== 'done'; i++) step(game, bot(game), TICK);
    assert.equal(game.stage, 'done', `seed ${seed}`);
    assert.ok(game.time > 60, 'the chapter is not over in a moment');
  }
  const game = createGame(1),
    masher = createBot({ skill: 0 });
  begin(game);
  let firstFall = 0;
  for (let i = 0; i < 60 * 240 && !firstFall; i++) for (const e of step(game, masher(game), TICK)) if (e.type === 'fall') firstFall = game.time;
  assert.ok(!firstFall || firstFall > 25, `fell at ${firstFall}`);
});
