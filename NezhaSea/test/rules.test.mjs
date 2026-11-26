// 规则：开局、走位与边界、水族兵冒出来时离哪吒远且冒出来之前打不到、六种法宝的出手（掷出飞回、横扫、直刺、砸落、
// 绕身、火圈）、暴击护甲闪避、珍珠掉落吸取与升级、一波结束的结算、首领波要打倒首领才算完、集市的买留换卖、同阶合成、
// 神器合成、下一波回满血、输赢；以及电脑玩家在「风平」上多半守得住、站着不动守不住。
// The rules: the start, moving and the walls, soldiers rising away from Nezha and untouchable until risen, the six
// treasures' strokes (out and back, sweep, thrust, lob, orbit, nova), crits, armour and dodge, pearls dropped, pulled
// and taken and the levels they bring, the end of a wave, a boss wave ending only with its boss, the market's buying,
// keeping, restocking and selling, merging to the next tier, divine merges, the next wave starting whole, winning and
// losing; and the computer player mostly holding on calm while standing still does not.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { playOut } from '../src/sim/bot.mjs';
import { DIVINE, ENEMIES, FIELD, HEROES, HERO_KINDS, ITEMS, SHOP, START_PEARLS, WAVES, WAVE_PEARLS, WEAPONS, waveSeconds, xpToLevel } from '../src/sim/data.mjs';
import { PLAYER, buy, chooseLevelUp, createRun, merge, mergeResult, nextWave, placeFor, reroll, rerollPrice, sell, sellPrice, statsOf, step, toggleLock } from '../src/sim/world.mjs';

/** A run with no soldiers coming, and soldiers placed by hand. */
function quiet(options) {
  const run = createRun(options);
  run.spawnDebt = -1e9;
  run.waveLeft = 1e9;
  return run;
}
function put(run, kind, x, y) {
  const spec = ENEMIES[kind];
  const enemy = { id: run.nextId++, kind, x, y, hp: spec.hp, max: spec.hp, rising: 0, cool: 0, state: 'move', stateLeft: 0, act: 99, hitBy: new Map(), phase: 0, vx: 0, vy: 0 };
  run.enemies.push(enemy);
  return enemy;
}
const run1 = (run, seconds, move) => {
  const events = [];
  for (let t = 0; t < seconds; t += 1 / 30) events.push(...step(run, 1 / 30, move));
  return events;
};

test('each form of Nezha starts with its treasure, its slots and its health', () => {
  for (const hero of HERO_KINDS) {
    const run = createRun({ hero });
    assert.equal(run.weapons.length, 1);
    assert.equal(run.weapons[0].kind, HEROES[hero].weapon);
    assert.equal(run.slots, HEROES[hero].slots);
    assert.equal(run.player.hp, statsOf(run).maxHp);
    assert.equal(run.pearls, START_PEARLS);
  }
  assert.ok(statsOf(createRun({ hero: 'lotus' })).maxHp > statsOf(createRun({ hero: 'boy' })).maxHp);
});

test('Nezha moves at her speed and stays inside the sea', () => {
  const run = quiet();
  const x = run.player.x;
  run1(run, 1, { x: 1, y: 0 });
  assert.ok(Math.abs(run.player.x - x - PLAYER.speed) < PLAYER.speed * 0.05, `${run.player.x - x}`);
  run1(run, 5, { x: 1, y: -1 });
  assert.equal(run.player.x, FIELD.width - PLAYER.radius);
  assert.equal(run.player.y, PLAYER.radius);
});

test('soldiers rise away from Nezha, and cannot be struck while rising', () => {
  const run = createRun({ seed: 3 });
  run.weapons = [];
  const events = run1(run, 6);
  const spawns = events.filter((e) => e.type === 'spawn');
  assert.ok(spawns.length >= 3);
  for (const e of spawns) assert.ok(Math.hypot(e.x - FIELD.width / 2, e.y - FIELD.height / 2) > 100);
  const fresh = createRun({ seed: 4 });
  fresh.weapons = [{ kind: 'dome', tier: 3, divine: false, cooldown: 0, angle: 0, also: 0 }];
  const rising = put(fresh, 'shrimp', fresh.player.x + 40, fresh.player.y);
  rising.rising = 1;
  rising.act = 99;
  fresh.spawnDebt = -1e9;
  step(fresh, 1 / 30);
  assert.equal(rising.hp, rising.max, 'untouched while rising');
});

test('the ring flies out and back, striking each soldier once each way', () => {
  const run = quiet();
  run.weapons = [{ kind: 'ring', tier: 0, divine: false, cooldown: 0, angle: 0, also: 0 }];
  const target = put(run, 'crab', run.player.x + 100, run.player.y);
  target.hp = target.max = 10000;
  const hits = run1(run, 0.9).filter((e) => e.type === 'hit' && e.weapon === 'ring');
  assert.equal(hits.length, 2, 'once out, once back');
});

test('the ribbon sweeps an arc ahead and leaves what is behind', () => {
  const run = quiet();
  run.weapons = [{ kind: 'ribbon', tier: 0, divine: false, cooldown: 0, angle: 0, also: 0 }];
  const ahead = put(run, 'crab', run.player.x + 50, run.player.y);
  const beside = put(run, 'crab', run.player.x + 40, run.player.y + 42);
  const behind = put(run, 'crab', run.player.x - 66, run.player.y);
  for (const e of [ahead, beside, behind]) e.hp = e.max = 1000;
  step(run, 1 / 30);
  assert.ok(ahead.hp < 1000 && beside.hp < 1000);
  assert.equal(behind.hp, 1000);
});

test('the spear strikes along a line, the brick bursts where it lands, the dome burns all around', () => {
  const run = quiet();
  run.weapons = [{ kind: 'spear', tier: 0, divine: false, cooldown: 0, angle: 0, also: 0 }];
  const near = put(run, 'crab', run.player.x + 50, run.player.y);
  const far = put(run, 'crab', run.player.x + 110, run.player.y + 4);
  const off = put(run, 'crab', run.player.x + 80, run.player.y + 60);
  for (const e of [near, far, off]) e.hp = e.max = 1000;
  step(run, 1 / 30);
  assert.ok(near.hp < 1000 && far.hp < 1000, 'both on the line');
  assert.equal(off.hp, 1000);

  const lob = quiet();
  lob.weapons = [{ kind: 'brick', tier: 0, divine: false, cooldown: 0, angle: 0, also: 0 }];
  const a = put(lob, 'crab', lob.player.x + 150, lob.player.y);
  const b = put(lob, 'crab', lob.player.x + 170, lob.player.y + 10);
  for (const e of [a, b]) e.hp = e.max = 1000;
  const events = run1(lob, 0.6);
  assert.ok(events.some((e) => e.type === 'land'));
  assert.ok(a.hp < 1000 && b.hp < 1000, 'both in the burst');

  const dome = quiet();
  dome.weapons = [{ kind: 'dome', tier: 0, divine: false, cooldown: 0, angle: 0, also: 0 }];
  const ring = [0, 2, 4].map((k) => put(dome, 'crab', dome.player.x + Math.cos(k) * 70, dome.player.y + Math.sin(k) * 70));
  const out = put(dome, 'crab', dome.player.x + 200, dome.player.y);
  for (const e of [...ring, out]) e.hp = e.max = 1000;
  step(dome, 1 / 30);
  assert.ok(ring.every((e) => e.hp < 1000));
  assert.equal(out.hp, 1000);
});

test('the wheels burn what they touch, each soldier once a cooldown', () => {
  const speed = ENEMIES.crab.speed;
  ENEMIES.crab.speed = 0;
  const run = quiet();
  run.weapons = [{ kind: 'wheels', tier: 0, divine: false, cooldown: 0, angle: 0, also: 0 }];
  const reach = WEAPONS.wheels.reach[0];
  const target = put(run, 'crab', run.player.x + reach, run.player.y);
  target.hp = target.max = 10000;
  const hits = run1(run, 2).filter((e) => e.type === 'hit').length;
  ENEMIES.crab.speed = speed;
  assert.ok(hits >= 2 && hits <= Math.ceil(2 / WEAPONS.wheels.cooldown[0]) + 1, `${hits} hits`);
});

test('crits double the damage; armour and dodge soften what Nezha takes', () => {
  const run = quiet();
  run.bonus.crit = 100;
  run.weapons = [{ kind: 'ribbon', tier: 0, divine: false, cooldown: 0, angle: 0, also: 0 }];
  const e = put(run, 'crab', run.player.x + 50, run.player.y);
  e.hp = e.max = 1000;
  const hit = step(run, 1 / 30).find((x) => x.type === 'hit');
  assert.equal(hit.damage, WEAPONS.ribbon.damage[0] * 2);
  assert.ok(hit.crit);

  const hurtBy = (armor) => {
    const r = quiet();
    r.weapons = [];
    r.bonus.armor = armor;
    put(r, 'crab', r.player.x + 5, r.player.y);
    const ev = step(r, 1 / 30).find((x) => x.type === 'hurt');
    return ev.amount;
  };
  assert.ok(hurtBy(30) < hurtBy(0));
  const dodger = quiet();
  dodger.weapons = [];
  dodger.bonus.dodge = 500;
  put(dodger, 'crab', dodger.player.x + 5, dodger.player.y);
  let dodges = 0,
    hurts = 0;
  for (let i = 0; i < 300; i++) {
    for (const ev of step(dodger, 1 / 30)) {
      if (ev.type === 'dodge') dodges++;
      if (ev.type === 'hurt') hurts++;
    }
    dodger.player.hp = 100;
  }
  assert.ok(hurts > 0, 'dodge is capped below certainty');
  assert.ok(dodges > 0);
});

test('a fallen soldier drops pearls that drift to Nezha and bring levels', () => {
  const run = quiet();
  run.weapons = [{ kind: 'ribbon', tier: 3, divine: false, cooldown: 0, angle: 0, also: 0 }];
  run.bonus.pickup = 200;
  for (let i = 0; i < 12; i++) put(run, 'shrimp', run.player.x + 30 + i, run.player.y + (i % 3) * 5);
  const pearls = run.pearls;
  const events = run1(run, 4);
  assert.ok(events.filter((e) => e.type === 'kill').length >= 12);
  assert.ok(run.pearls >= pearls + 12, `${run.pearls - pearls} pearls`);
  assert.equal(run.drops.length, 0, 'every pearl taken');
  assert.ok(run.level >= 1 && run.pending === run.level);
  assert.ok(run.xp < xpToLevel(run.level));
});

test('a wave ends with its clock: pearls left are gathered, the harvest paid, then level-ups, then the market', () => {
  const run = createRun({ seed: 2 });
  run.weapons = [];
  run.player.hp = 1e9;
  run.pending = 1;
  run.drops.push({ id: 999, x: 10, y: 10, value: 3, pulled: false });
  const pearls = run.pearls;
  const events = run1(run, waveSeconds(1) + 0.2);
  assert.ok(events.some((e) => e.type === 'waveEnd'));
  assert.equal(run.phase, 'levelUp');
  assert.equal(run.enemies.length, 0);
  assert.ok(run.pearls >= pearls + 3 + WAVE_PEARLS);
  assert.equal(run.choices.length, 4);
  const hp = statsOf(run).maxHp;
  chooseLevelUp(run, run.choices.findIndex((c) => 'maxHp' in c.stats) >= 0 ? run.choices.findIndex((c) => 'maxHp' in c.stats) : 0);
  assert.equal(run.phase, 'shop');
  assert.ok(statsOf(run).maxHp >= hp);
  assert.equal(run.shop.offers.length, SHOP.offers);
});

test('a boss wave ends only when its boss falls', () => {
  const run = createRun({ seed: 5 });
  run.wave = 10;
  run.waveLeft = 1;
  run.weapons = [];
  run.player.hp = 1e9;
  const events = run1(run, 4);
  assert.ok(events.some((e) => e.type === 'boss' && e.kind === 'yaksha'));
  assert.equal(run.phase, 'wave', 'the clock alone does not end it');
  run.boss.hp = 1;
  run.boss.rising = 0;
  run.weapons = [{ kind: 'dome', tier: 3, divine: false, cooldown: 0, angle: 0, also: 0 }];
  run.player.x = run.boss.x;
  run.player.y = run.boss.y;
  const after = run1(run, 1);
  assert.ok(after.some((e) => e.type === 'bossDown'));
  assert.notEqual(run.phase, 'wave');
});

/** A run standing in the market after wave `wave`, with `pearls`. */
function market(wave = 5, pearls = 1000, hero = 'boy') {
  const run = createRun({ seed: 9, hero });
  run.wave = wave;
  run.phase = 'shop';
  run.pearls = pearls;
  run.shop.offers = [];
  return run;
}

test('buying a treasure takes a free slot; when full it merges with one the same, or is refused', () => {
  const run = market();
  run.shop.offers = [
    { type: 'weapon', kind: 'brick', tier: 0, price: 30, locked: false },
    { type: 'item', kind: 'elixir', price: 20, locked: false }
  ];
  assert.ok(buy(run, 0).ok);
  assert.equal(run.weapons.length, 2);
  assert.equal(buy(run, 0).why, 'offer', 'sold once');
  assert.ok(buy(run, 1).ok);
  assert.equal(run.items.elixir, 1);
  assert.equal(statsOf(run).damage, ITEMS.elixir.stats.damage);
  // Full slots.
  run.weapons = Array.from({ length: run.slots }, () => ({ kind: 'spear', tier: 1, divine: false, cooldown: 0, angle: 0, also: 0 }));
  assert.equal(placeFor(run, 'ring', 0), null);
  run.shop.offers = [
    { type: 'weapon', kind: 'ring', tier: 0, price: 10, locked: false },
    { type: 'weapon', kind: 'spear', tier: 1, price: 10, locked: false }
  ];
  assert.equal(buy(run, 0).why, 'full');
  const merged = buy(run, 1);
  assert.ok(merged.ok && merged.merged);
  assert.equal(run.weapons[merged.slot].tier, 2);
  const poor = market(5, 5);
  poor.shop.offers = [{ type: 'item', kind: 'elixir', price: 20, locked: false }];
  assert.equal(buy(poor, 0).why, 'pearls');
});

test('two of the same treasure and tier merge into the next tier, up to the fourth', () => {
  const run = market();
  run.weapons = [
    { kind: 'ring', tier: 1, divine: false, cooldown: 0, angle: 0, also: 0 },
    { kind: 'ring', tier: 1, divine: false, cooldown: 0, angle: 0, also: 0 },
    { kind: 'ring', tier: 3, divine: false, cooldown: 0, angle: 0, also: 0 },
    { kind: 'ring', tier: 3, divine: false, cooldown: 0, angle: 0, also: 0 },
    { kind: 'spear', tier: 1, divine: false, cooldown: 0, angle: 0, also: 0 }
  ];
  assert.deepEqual(mergeResult(run, 0, 1), { kind: 'ring', tier: 2, divine: false });
  assert.equal(mergeResult(run, 0, 4), null, 'different treasures');
  assert.equal(mergeResult(run, 2, 3), null, 'the fourth tier is the top');
  assert.equal(mergeResult(run, 0, 2), null, 'different tiers');
  const result = merge(run, 0, 1);
  assert.ok(result.ok);
  assert.equal(run.weapons.length, 4);
  assert.equal(run.weapons[0].tier, 2);
  assert.equal(merge(run, 0, 3).why, 'mismatch');
});

test('paired treasures of the third tier or above merge into a divine treasure, and lower ones do not', () => {
  for (const [name, recipe] of Object.entries(DIVINE)) {
    const run = market();
    run.weapons = [
      { kind: recipe.from[1], tier: 2, divine: false, cooldown: 0, angle: 0, also: 0 },
      { kind: recipe.from[0], tier: 3, divine: false, cooldown: 0, angle: 0, also: 0 },
      { kind: recipe.from[0], tier: 1, divine: false, cooldown: 0, angle: 0, also: 0 }
    ];
    assert.equal(mergeResult(run, 0, 2), null, `${name}: the second tier is too low`);
    const result = merge(run, 1, 0);
    assert.ok(result.ok && result.divine, name);
    assert.equal(result.kind, name);
    assert.equal(run.weapons.length, 2);
    assert.ok(run.weapons.some((w) => w.divine && w.kind === name));
    assert.equal(mergeResult(run, 0, 1), null, 'a divine treasure merges no further');
    assert.equal(run.divines, 1);
  }
});

test('a divine treasure strikes as both its treasures did', () => {
  const run = quiet();
  run.weapons = [{ kind: 'bindDragon', tier: 4, divine: true, cooldown: 0, angle: 0, also: 0 }];
  const e = put(run, 'crab', run.player.x + 60, run.player.y);
  e.hp = e.max = 100000;
  const events = run1(run, 1);
  assert.ok(events.some((x) => x.type === 'throw'));
  assert.ok(events.some((x) => x.type === 'sweep'));
});

test('restocking costs more each time; a kept offer stays; selling returns part of the price', () => {
  const run = market(6, 1000);
  run.shop.offers = [
    { type: 'item', kind: 'peach', price: 20, locked: false },
    { type: 'item', kind: 'coral', price: 20, locked: false },
    { type: 'item', kind: 'shell', price: 20, locked: false },
    { type: 'item', kind: 'conch', price: 20, locked: false }
  ];
  toggleLock(run, 2);
  const first = rerollPrice(run);
  assert.ok(reroll(run).ok);
  assert.ok(rerollPrice(run) > first);
  assert.equal(run.shop.offers[2].kind, 'shell');
  assert.equal(run.pearls, 1000 - first);
  run.weapons.push({ kind: 'brick', tier: 2, divine: false, cooldown: 0, angle: 0, also: 0 });
  const back = sellPrice(run, 1);
  assert.ok(back > 0);
  assert.ok(sell(run, 1).ok);
  assert.equal(run.weapons.length, 1);
  assert.equal(sell(run, 0).ok, false, 'never the last treasure');
});

test('the next wave starts with Nezha whole in the middle of the sea', () => {
  const run = market(3, 0);
  run.player.hp = 1;
  run.player.x = 10;
  assert.ok(nextWave(run).ok);
  assert.equal(run.wave, 4);
  assert.equal(run.phase, 'wave');
  assert.equal(run.player.hp, statsOf(run).maxHp);
  assert.equal(run.player.x, FIELD.width / 2);
  assert.equal(run.waveLeft, waveSeconds(4));
});

test('no health left is a lost game; the twentieth wave held is a won one', () => {
  const run = quiet();
  run.weapons = [];
  run.player.hp = 1;
  put(run, 'crab', run.player.x + 5, run.player.y);
  const events = run1(run, 0.5);
  assert.ok(events.some((e) => e.type === 'lost'));
  assert.equal(run.phase, 'lost');
  const last = createRun({ seed: 1 });
  last.wave = WAVES;
  last.weapons = [];
  last.player.hp = 1e9;
  run1(last, 3);
  assert.equal(last.boss?.kind, 'aoBing');
  last.boss.hp = 0;
  last.enemies = last.enemies.filter((e) => e !== last.boss);
  last.boss = null;
  run1(last, 0.1);
  assert.equal(last.phase, 'won');
});

test('the same seed plays the same game', () => {
  const a = playOut({ seed: 7, limit: 200 }),
    b = playOut({ seed: 7, limit: 200 });
  assert.equal(a.kills, b.kills);
  assert.equal(a.pearls, b.pearls);
  assert.equal(a.wave, b.wave);
});

test('on calm the computer player mostly holds; standing still never does', () => {
  let won = 0;
  for (let seed = 1; seed <= 4; seed++) won += playOut({ seed, danger: 0 }).phase === 'won';
  assert.ok(won >= 3, `${won} of 4 won`);
  for (let seed = 1; seed <= 3; seed++) assert.equal(playOut({ seed, still: true }).phase, 'lost');
});
