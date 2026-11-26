// What makes a second run differ from the first, checked without a picture: the pages and their boons,
// the moves that grow out of the three cuts, wine, fire and cover, the tiers, and holding the yard.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FLAMES, PLACES, ROUNDS, WET, cover, edge, wet } from '../src/rules/arena.mjs';
import { BOONS, offer } from '../src/rules/boons.mjs';
import { createGame, grant, quiet, spawn, step } from '../src/rules/game.mjs';
import { TIERS, grade, rulesFor, tierName } from '../src/rules/tiers.mjs';
import { DERIVE, FIRE, FOES, FORMS, HERO, WINE } from '../src/rules/tune.mjs';
import { AFFIXES, waveOf } from '../src/rules/yard.mjs';

const TICK = 1 / 60;
const run = (game, seconds, input = quiet) => {
  const seen = [];
  for (let i = 0; i < seconds * 60; i++) seen.push(...step(game, typeof input === 'function' ? input(game) : input, TICK).map((e) => ({ ...e })));
  return seen;
};
const press = (game, what) => step(game, { ...quiet(), ...what }, TICK).map((e) => ({ ...e }));
/** A game with one foe who stands and does nothing, `distance` north of the hero in the yard. */
function duel(kind = 'blade', distance = 2, options) {
  const game = createGame(3, options);
  game.foes = [];
  game.hero.x = 0;
  game.hero.z = 8;
  game.hero.face = Math.PI;
  const foe = spawn(game, kind, 0, 8 - distance);
  foe.pause = 99;
  game.turnPause = 99;
  return { game, hero: game.hero, foe };
}
const page = (game, key = null) => game.drops.push({ id: ++game.serial, kind: 'page', key, x: game.hero.x, z: game.hero.z, toX: game.hero.x, toZ: game.hero.z, fromX: game.hero.x, fromZ: game.hero.z, t: 0, landed: false, taken: false });

test('a page stops the fight until one of its three lessons is chosen', () => {
  const { game, hero, foe } = duel('blade', 6);
  page(game);
  const seen = run(game, 1.5);
  const asked = seen.find((e) => e.type === 'choice');
  assert.ok(asked && asked.options.length === 3 && new Set(asked.options).size === 3);
  for (const id of asked.options) assert.ok(BOONS[id]);
  const time = game.time,
    hp = foe.hp;
  run(game, 1, () => ({ ...quiet(), attack: true, mz: -1 }));
  assert.equal(game.time, time, 'nothing moves while the page lies open');
  assert.equal(foe.hp, hp);
  assert.equal(hero.z, 8);
  const answered = press(game, { pick: 1 });
  assert.equal(answered.find((e) => e.type === 'boon').id, asked.options[1]);
  assert.deepEqual(game.boons, [asked.options[1]]);
  assert.equal(game.choice, null);
  run(game, 0.2);
  assert.ok(game.time > time);
});

test('a page never offers what he already has, and each of the chapter pages is read once', () => {
  const rand = () => 0.5;
  const owned = Object.keys(BOONS).slice(0, 8);
  assert.equal(offer(rand, owned).length, 2);
  assert.ok(offer(rand, owned).every((id) => !owned.includes(id)));
  assert.equal(offer(rand, Object.keys(BOONS)).length, 0);

  // The last man of the first party leaves a page; killed again after a fall, he leaves none.
  const fell = () => {
    const game = createGame(5);
    for (const foe of game.foes) if (foe.kind !== 'lu') foe.state = 'roam';
    return game;
  };
  const game = fell();
  const kill = () => {
    game.hero.hp = HERO.hp;
    for (const foe of game.foes.filter((f) => f.kind !== 'lu' && f.state !== 'dead')) {
      game.hero.x = foe.x;
      game.hero.z = foe.z + 2;
      game.hero.face = Math.PI;
      foe.hp = 1;
      foe.pause = 99;
      for (let i = 0; i < 90 && foe.state !== 'dead'; i++) step(game, { ...quiet(), attack: i % 12 === 0 }, TICK);
      assert.equal(foe.state, 'dead');
    }
  };
  kill();
  assert.equal(game.drops.filter((d) => d.kind === 'page').length, 1);
  assert.equal(game.drops.find((d) => d.kind === 'page').key, 'first');
  game.pages.first = true;
  game.drops = [];
  game.foes = game.foes.filter((f) => f.kind === 'lu');
  for (const kind of ['blade', 'blade']) spawn(game, kind, 0, 2).party = 0;
  kill();
  assert.equal(game.drops.filter((d) => d.kind === 'page').length, 0);
});

test('out of a dodge the spear goes long; out of the snow step it sweeps', () => {
  let { game, hero, foe } = duel('blade', 9);
  press(game, { dodge: true, mz: -1 });
  run(game, 0.15);
  press(game, { attack: true });
  const seen = run(game, 0.5);
  const swing = seen.find((e) => e.type === 'swing');
  assert.equal(swing.form, 'lunge');
  assert.equal(hero.cut, FORMS.lunge.base, 'it wears the look of the thrust');
  assert.ok(foe.hp < foe.maxHp, 'and reaches a man the plain thrust would not');
  assert.ok(Math.abs(foe.maxHp - foe.hp - FORMS.lunge.damage) < 1e-6);

  // Just after the dodge has ended the thrust is still there; a moment later it is the plain cut again.
  ({ game, hero, foe } = duel('blade', 12));
  press(game, { dodge: true, mx: 1 });
  run(game, HERO.dodge.time + 0.05);
  assert.equal(press(game, { attack: true }).find((e) => e.type === 'swing').form, 'lunge');
  ({ game, hero, foe } = duel('blade', 12));
  press(game, { dodge: true, mx: 1 });
  run(game, HERO.dodge.time + DERIVE.afterDodge + 0.1);
  assert.equal(press(game, { attack: true }).find((e) => e.type === 'swing').form, null);

  ({ game, hero, foe } = duel('blade', 7));
  run(game, 0.3, () => ({ ...quiet(), glide: true, mz: -1 }));
  assert.equal(hero.state, 'glide');
  const sweep = press(game, { glide: true, mz: -1, attack: true }).find((e) => e.type === 'swing');
  assert.equal(sweep.form, 'sweep');
  assert.equal(hero.cut, FORMS.sweep.base);
});

test('the attack held through a cut gathers a heavy blow; tapping makes the plain three', () => {
  const { game, hero, foe } = duel('blade', 2);
  foe.hp = foe.maxHp = 5000;
  press(game, { attack: true, charge: true });
  const seen = run(game, 1.1, () => ({ ...quiet(), charge: true }));
  const swings = seen.filter((e) => e.type === 'swing');
  assert.equal(swings.length, 1);
  assert.equal(swings[0].form, 'charge');
  assert.ok(HERO.stamina - hero.stamina > 0, 'it costs breath');
  const blow = seen.filter((e) => e.type === 'hit').at(-1);
  assert.ok(blow.heavy && blow.amount >= FORMS.charge.damage, 'and lands as one heavy blow');
  // Held on, it does not gather a second one.
  const more = run(game, 1.2, () => ({ ...quiet(), charge: true }));
  assert.equal(more.filter((e) => e.type === 'swing').length, 0);
});

test('raising the guard cuts a cut short, for a little breath', () => {
  const { game, hero } = duel('blade', 9);
  press(game, { attack: true });
  const cut = HERO.cuts[0];
  run(game, cut.windup + cut.active + 0.03);
  assert.equal(hero.state, 'cut');
  const before = hero.stamina;
  press(game, { guard: true });
  assert.equal(hero.state, 'guard');
  assert.ok(Math.abs(before - hero.stamina - DERIVE.cancelCost) < 1.5);
  // Before the blow is given the guard has to wait.
  const other = duel('blade', 9);
  press(other.game, { attack: true });
  press(other.game, { guard: true });
  assert.equal(other.hero.state, 'cut');

  // A guard held all along cuts nothing short: three presses are still the three cuts, at no cost in breath.
  const held = duel('blade', 9);
  press(held.game, { guard: true });
  held.hero.stamina = HERO.stamina;
  const swings = [];
  for (let i = 0; i < 100; i++) swings.push(...step(held.game, { ...quiet(), guard: true, attack: i % 14 === 0 }, TICK).filter((e) => e.type === 'swing').map((e) => e.cut));
  assert.deepEqual(swings.slice(0, 3), [0, 1, 2]);
  assert.equal(held.hero.stamina, HERO.stamina);
});

test('with a riposte open, a strike in a dodge waits and becomes the riposte', () => {
  const { game, hero } = duel('blade', 2.4);
  hero.counter = 1.2;
  press(game, { dodge: true, mx: 1 });
  run(game, 0.15);
  press(game, { attack: true });
  const seen = run(game, 0.6);
  assert.ok(!seen.some((e) => e.type === 'swing'), 'no thrust takes its place');
  assert.ok(seen.some((e) => e.type === 'riposte' || e.type === 'riposteHit'));
});

test('wine makes him hit harder and be hit harder; an untouched gourd feeds his resolve', () => {
  const sober = duel('blade', 2),
    drunk = duel('blade', 2);
  drunk.hero.tipsy = 5;
  for (const { game } of [sober, drunk]) {
    press(game, { attack: true });
    run(game, 0.3);
  }
  const dealt = (d) => d.foe.maxHp - d.foe.hp;
  assert.ok(Math.abs(dealt(drunk) / dealt(sober) - WINE.deal) < 1e-6);

  const hit = (tipsy) => {
    const { game, hero, foe } = duel('blade', 2);
    hero.tipsy = tipsy;
    foe.pause = 0;
    game.turnPause = 0;
    const seen = run(game, 3);
    return seen.find((e) => e.type === 'hurt').amount;
  };
  assert.ok(Math.abs(hit(9) / hit(0) - WINE.take) < 1e-6);

  // A drink sets the wine working, even at full health.
  const { game, hero } = duel('blade', 12);
  assert.equal(hero.tipsy, 0);
  press(game, { drink: true });
  run(game, HERO.drink.time + 0.1);
  assert.equal(hero.gourd, hero.maxGourd - 1);
  assert.ok(hero.tipsy > WINE.tipsy - 1);

  // Resolve from a hit: more with the gourd full.
  const gained = (gourd) => {
    const d = duel('blade', 2);
    d.hero.gourd = gourd;
    press(d.game, { attack: true });
    run(d.game, 0.3);
    return d.hero.will;
  };
  assert.ok(Math.abs(gained(HERO.gourd) / gained(HERO.gourd - 1) - WINE.fullGourd) < 1e-6);
});

test('a man knocked against the burning stack catches fire; one merely standing by it does not', () => {
  const stack = FLAMES[2];
  const game = createGame(3);
  game.foes = [];
  const foe = spawn(game, 'blade', stack.x - stack.r - 0.5, stack.z);
  foe.pause = 99;
  game.turnPause = 99;
  Object.assign(game.hero, { x: foe.x - 2, z: stack.z, face: Math.PI / 2 });
  assert.ok(!run(game, 1).some((e) => e.type === 'ignite'));
  press(game, { attack: true });
  const seen = run(game, 3.5);
  assert.ok(seen.some((e) => e.type === 'ignite'));
  const burns = seen.filter((e) => e.type === 'hit' && e.source === 'fire');
  assert.ok(burns.length >= 5, `${burns.length} bites of the fire`);
  assert.ok(foe.maxHp - foe.hp > HERO.cuts[0].damage + 25);
});

test('big things stop arrows; wet stone carries a dodge farther', () => {
  assert.ok(cover(-6.5, 12.5) && cover(4.2, 2.2) && !cover(0, 8) && !cover(PLACES.camp.x, PLACES.camp.z));
  // A bowman on the far side of the rock.
  const game = createGame(3);
  game.foes = [];
  const bow = spawn(game, 'bow', -4.2, 0.6);
  Object.assign(game.hero, { x: -4.2, z: 9, face: Math.PI });
  bow.pause = 0;
  const seen = run(game, 2.2);
  assert.ok(seen.some((e) => e.type === 'arrowStuck'));
  assert.ok(!seen.some((e) => e.type === 'hurt'));

  const slide = (x, z) => {
    const g = createGame(3);
    g.foes = [];
    Object.assign(g.hero, { x, z });
    press(g, { dodge: true, mx: -1 });
    run(g, HERO.dodge.time);
    return Math.hypot(g.hero.x - x, g.hero.z - z);
  };
  const [wx, wz] = WET[5];
  assert.ok(wet(wx, wz) && !wet(wx + 4, wz + 5));
  assert.ok(slide(wx, wz) > slide(wx + 4, wz + 5) * 1.2);
});

test('new fire gives a moment to step out, and does not bite a man who cannot move', () => {
  const torch = () => {
    const game = createGame(3);
    game.foes = [];
    const foe = spawn(game, 'blade', 0, 6, 'ember');
    Object.assign(game.hero, { x: 0, z: 8, face: Math.PI });
    foe.pause = 0;
    return { game, hero: game.hero, foe };
  };
  // He takes the torch man's blow and stands where he was struck: the blow hurts, the fire waits for him
  // to come to, and only then bites.
  const stood = torch();
  let lit = 0,
    hurt = 0,
    scorched = 0;
  for (let i = 0; i < 60 * 6 && !scorched; i++)
    for (const e of step(stood.game, quiet(), TICK)) {
      if (e.type === 'fire' && !lit) lit = stood.game.time;
      if (e.type === 'hurt' && !hurt) hurt = stood.game.time;
      if (e.type === 'scorch') scorched = stood.game.time;
    }
  assert.ok(lit && hurt && scorched);
  assert.ok(scorched - lit >= FIRE.grace - 1e-6, 'not at once');
  assert.ok(scorched - hurt >= HERO.hurt.safe - 1e-6, 'and not while he reels');

  // He guards the blow and walks out of the fire: it never touches him.
  const left = torch();
  let seen = [];
  for (let i = 0; i < 60 * 4; i++) {
    const fire = left.game.fires[0],
      away = fire && Math.hypot(left.hero.x - fire.x, left.hero.z - fire.z) < fire.r + 0.6;
    seen.push(...step(left.game, { ...quiet(), guard: !fire, az: -1, mz: away ? 1 : 0, mx: away ? 0.4 : 0 }, TICK).map((e) => e.type));
    if (fire && !away) break;
  }
  assert.ok(seen.includes('fire'));
  assert.ok(!seen.includes('scorch'));
});

test('everyone who walks in later has ground to stand on', () => {
  const clear = (x, z, who) => assert.ok(edge(x, z) < -0.5 && !ROUNDS.some((r) => Math.hypot(r.x - x, r.z - z) < r.r + 0.45), `${who} at ${x}, ${z}`);
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let n = 1; n <= 14; n++) for (let again = 0; again < 6; again++) for (const man of waveOf(n, rand).men) clear(man.x, man.z, `wave ${n} ${man.kind}`);
  const game = createGame(2, { tier: 2 });
  for (const foe of game.foes) if (foe.kind !== 'lu') (foe.hp = 0.01), (foe.state = 'dead');
  for (let i = 0; i < 300 && game.party !== 1; i++) step(game, quiet(), TICK);
  const second = game.foes.filter((foe) => foe.party === 1);
  assert.equal(second.length, 6);
  for (const foe of second) clear(foe.x, foe.z, foe.kind);
});

test('boons change the deeds: five stars, stars that pass through, a denser rain, a sharper spear', () => {
  let { game, hero, foe } = duel('blade', 5);
  grant(game, 'fiveStars');
  press(game, { stars: true });
  run(game, HERO.stars.release + 0.02);
  assert.equal(game.shots.filter((s) => s.from === 'hero').length, 5);

  // Two men in a line: a plain star stops in the first, a piercing one goes on to the second.
  const line = (boon) => {
    const g = createGame(3);
    g.foes = [];
    Object.assign(g.hero, { x: 0, z: 10, face: Math.PI });
    const a = spawn(g, 'blade', 0, 6),
      b = spawn(g, 'blade', 0, 3.6);
    a.pause = b.pause = 99;
    g.turnPause = 99;
    if (boon) grant(g, boon);
    press(g, { stars: true, az: -1 });
    run(g, 1.5);
    return [a.maxHp - a.hp, b.maxHp - b.hp];
  };
  const plain = line(null),
    through = line('piercing');
  assert.ok(plain[0] > 0 && through[0] > 0 && through[1] > 0);
  assert.ok(through[0] + through[1] > plain[0] + plain[1], 'the same stars do more work');

  ({ game, hero, foe } = duel('blade', 5));
  hero.will = HERO.will;
  const wide = press(game, { rain: true }).find((e) => e.type === 'rain');
  ({ game, hero, foe } = duel('blade', 5));
  grant(game, 'denseRain');
  hero.will = HERO.will;
  const dense = press(game, { rain: true }).find((e) => e.type === 'rain');
  assert.ok(dense.spears.length > wide.spears.length * 1.5 && dense.radius < wide.radius * 0.75);
  for (const spear of dense.spears) assert.ok(Math.hypot(spear.x - hero.x, spear.z - hero.z) <= dense.radius + 1.2);

  ({ game, hero, foe } = duel('blade', 2));
  grant(game, 'sharp');
  grant(game, 'sharp');
  assert.ok(Math.abs(hero.power - 1.2) < 1e-9, 'a boon is given once');
  grant(game, 'keen');
  assert.equal(hero.keen, 1.5);
});

test('boons of the guard and the dodge: wine and breath from a parry, a breaking cut after a slip, fire from the heavy cut', () => {
  // Parry: the gourd fills by one, once in ten seconds, and breath comes back whole.
  const { game, hero, foe } = duel('blade', 2);
  grant(game, 'parryWine');
  grant(game, 'parryBreath');
  hero.gourd = 1;
  hero.stamina = 30;
  hero.staminaWait = 99;
  foe.pause = 0;
  game.turnPause = 0;
  let parried = false;
  for (let i = 0; i < 600 && !parried; i++) {
    const raise = foe.state === 'windup' && foe.t > foe.move.windup - 0.1;
    parried = step(game, { ...quiet(), guard: raise || foe.state === 'strike', az: -1 }, TICK).some((e) => e.type === 'parry');
  }
  assert.ok(parried);
  assert.equal(hero.gourd, 2);
  assert.equal(hero.stamina, HERO.stamina);
  assert.ok(hero.wineWait > 9);

  // Slip: the next cut breaks a man who is not even winding up.
  const d = duel('blade', 2);
  grant(d.game, 'slipBreak');
  d.hero.edge = 3;
  press(d.game, { attack: true });
  const seen = run(d.game, 0.3);
  assert.ok(seen.some((e) => e.type === 'interrupt'));
  assert.equal(d.foe.state, 'stagger');
  assert.equal(d.hero.edge, 0);
  assert.ok(Math.abs(d.foe.maxHp - d.foe.hp - HERO.cuts[0].damage * 1.5) < 1e-6);

  // The third cut lays fire where it lands, and the fire catches the man standing there.
  const f = duel('blade', 2.6);
  f.foe.hp = f.foe.maxHp = 5000;
  grant(f.game, 'fireCut');
  const all = run(f.game, 2.2, (g) => ({ ...quiet(), attack: g.hero.state !== 'cut' || g.hero.t > 0.1 }));
  assert.ok(all.some((e) => e.type === 'fire' && e.harm === 'foes'));
  assert.ok(all.some((e) => e.type === 'ignite'));
});

test('each tier adds one rule to those below it', () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((tier) => {
      const r = rulesFor(tier);
      return [r.extraMen, r.fireArrows, r.luBurning, r.gourd, r.haste < 1];
    }),
    [
      [false, false, false, 3, false],
      [true, false, false, 3, false],
      [true, true, false, 3, false],
      [true, true, true, 3, false],
      [true, true, true, 2, true]
    ]
  );
  assert.ok(rulesFor(7).hp > rulesFor(5).hp && rulesFor(7).damage > 1);
  assert.equal(tierName(1), TIERS[0].name);
  assert.equal(tierName(7), `${TIERS[4].name} +2`);

  const count = (tier) => {
    const game = createGame(2, { tier });
    for (const foe of game.foes) if (foe.kind !== 'lu') (foe.hp = 0.01), (foe.state = 'dead');
    const seen = run(game, 3);
    assert.ok(seen.some((e) => e.type === 'party'));
    return game.foes.filter((foe) => foe.party === 1);
  };
  assert.equal(count(1).length, 4);
  assert.equal(count(2).length, 6);
  assert.equal(count(2).filter((foe) => foe.elite === 'iron').length, 1);
  assert.equal(createGame(1, { tier: 5 }).hero.gourd, 2);

  // Fire arrows leave fire that bites the hero who stands in it.
  const game = createGame(3, { tier: 3 });
  game.foes = [];
  const bow = spawn(game, 'bow', 0, 0);
  Object.assign(game.hero, { x: 0, z: 9, face: Math.PI });
  bow.pause = 0;
  const seen = run(game, 6);
  assert.ok(seen.some((e) => e.type === 'fire' && e.harm === 'hero'));
  assert.ok(seen.some((e) => e.type === 'scorch') || seen.some((e) => e.type === 'hurt'));

  // At the fourth tier Lu Qian has his fire from the first blow.
  const names = (tier) => {
    const g = createGame(4, { tier });
    g.foes = g.foes.filter((foe) => foe.kind === 'lu');
    g.stage = 'boss';
    Object.assign(g.hero, { x: 0, z: -24 });
    const lu = g.boss;
    lu.state = 'roam';
    const used = new Set();
    for (let i = 0; i < 60 * 40; i++) {
      g.hero.hp = HERO.hp;
      for (const e of step(g, quiet(), TICK)) if (e.type === 'windup') used.add(e.move.name);
    }
    return used;
  };
  assert.ok(!names(1).has('fire') && !names(1).has('wheel'));
  assert.ok(names(4).has('fire') || names(4).has('wheel'));
});

test('a run is marked: clean and quick is the top mark, falls cost most', () => {
  assert.equal(grade({ time: 200, falls: 0, hurts: 2, parries: 3, ripostes: 2 }).mark, '甲');
  assert.equal(grade({ time: 300, falls: 0, hurts: 8 }).mark, '乙');
  assert.equal(grade({ time: 300, falls: 1, hurts: 5 }).mark, '丙');
  assert.equal(grade({ time: 600, falls: 3, hurts: 30 }).mark, '丁');
  assert.ok(grade({ time: 100, falls: 0 }).score <= 100 && grade({ time: 9999, falls: 9, hurts: 99 }).score >= 0);
});

test('holding the yard: waves grow, leaders come from the third, and a fall ends it', () => {
  const rand = () => 0.3;
  assert.equal(waveOf(1, rand).men.length, 3);
  assert.ok(waveOf(8, rand).men.length > waveOf(1, rand).men.length && waveOf(30, rand).men.length <= 7);
  assert.ok(waveOf(1, rand).men.every((man) => !man.elite) && waveOf(2, rand).men.every((man) => !man.elite));
  for (let n = 3; n < 12; n++) {
    const leaders = waveOf(n, rand).men.filter((man) => man.elite);
    assert.equal(leaders.length, 1);
    assert.ok(AFFIXES[leaders[0].elite] && leaders[0].kind !== 'bow');
  }
  assert.ok(waveOf(9, rand).hp > waveOf(2, rand).hp);

  const game = createGame(4, { mode: 'yard' });
  assert.equal(game.stage, 'yard');
  assert.equal(game.boss.state, 'wait');
  const seen = run(game, 3);
  assert.equal(seen.find((e) => e.type === 'wave').wave, 1);
  assert.equal(game.foes.filter((foe) => foe.kind !== 'lu').length, 3);
  // Two waves down: a page lies in the yard.
  const clear = () => {
    for (const foe of game.foes) if (foe.kind !== 'lu') (foe.state = 'dead'), (foe.t = 0);
  };
  clear();
  assert.equal(run(game, 4).find((e) => e.type === 'wave').wave, 2);
  clear();
  const after = run(game, 0.2);
  assert.ok(after.some((e) => e.type === 'waveDown'));
  assert.ok(game.drops.some((drop) => drop.kind === 'page'));
  // The brazier does not mend him here, and a fall is the end.
  game.hero.hp = 0.5;
  game.drops = [];
  const end = run(game, 30);
  assert.ok(end.some((e) => e.type === 'fall'));
  assert.ok(!end.some((e) => e.type === 'revive'));
  assert.equal(end.find((e) => e.type === 'over').wave, game.wave);
  assert.equal(game.hero.state, 'dead');
});

test('leaders: the quick one is quick, the iron one hard to move, the torch leaves fire', () => {
  const plain = duel('blade', 2),
    swift = duel('blade', 2),
    iron = duel('blade', 2);
  swift.game.foes = [];
  iron.game.foes = [];
  const quick = spawn(swift.game, 'blade', 0, 6, 'swift'),
    hard = spawn(iron.game, 'blade', 0, 6, 'iron');
  assert.ok(quick.haste < plain.foe.haste && quick.speed > FOES.blade.speed);
  assert.ok(hard.maxHp > plain.foe.maxHp * 1.7 && hard.poise > FOES.blade.poise);
  // One light cut staggers a plain man, not the iron one.
  hard.pause = 99;
  iron.game.turnPause = 99;
  for (const d of [plain, iron]) {
    press(d.game, { attack: true });
    run(d.game, 0.2);
  }
  assert.equal(plain.foe.state, 'stagger');
  assert.notEqual(hard.state, 'stagger');

  const game = createGame(3);
  game.foes = [];
  const torch = spawn(game, 'blade', 0, 6, 'ember');
  Object.assign(game.hero, { x: 0, z: 8, face: Math.PI });
  torch.pause = 0;
  const seen = run(game, 4);
  assert.ok(seen.some((e) => e.type === 'fire' && e.harm === 'hero'));
});
