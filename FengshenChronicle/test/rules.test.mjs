import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSession, createSaveSnapshot, dispatch, update } from '../src/sim/world.mjs';
import { MAPS } from '../src/sim/data.mjs';

const run = (state, seconds, input = {}) => {
  const events = [];
  for (let time = 0; time < seconds; time += 1 / 60) events.push(...update(state, 1 / 60, input));
  return events;
};
function startTrail() {
  const state = createSession();
  state.hero.x = MAPS.city.npcs[0].x;
  state.hero.y = MAPS.city.npcs[0].y + 30;
  assert(dispatch(state, { type: 'interact', id: 'elder' }));
  state.hero.x = MAPS.city.portal.x;
  state.hero.y = MAPS.city.portal.y;
  assert(dispatch(state, { type: 'interact', id: 'portal' }));
  return state;
}

test('the normal quest grants the artifact and opens the road', () => {
  const state = startTrail();
  assert.equal(state.mapId, 'trail');
  assert.equal(state.quest.stage, 'hunt');
  assert.equal(state.flags.artifactOwned, true);
  assert.equal(state.hero.potions, 5);
  assert(state.enemies.length >= 6);
});

test('diagonal motion is normalized and cannot cross solid rectangles', () => {
  const a = createSession(), b = createSession();
  run(a, .5, { moveX: 1 }); run(b, .5, { moveX: 1, moveY: 1 });
  assert(Math.abs(Math.hypot(a.hero.x - 800, a.hero.y - 810) - Math.hypot(b.hero.x - 800, b.hero.y - 810)) < .01);
  a.hero.x = 620; a.hero.y = 480;
  run(a, 1, { moveX: 1 });
  assert(a.hero.x <= 632);
});

test('click movement finds a route around an obstructing building', () => {
  const state = createSession(); state.hero.x = 150; state.hero.y = 300;
  assert(dispatch(state, { type: 'moveTo', x: 620, y: 300 }));
  run(state, 9);
  assert(Math.hypot(state.hero.x - 620, state.hero.y - 300) < 6);
});

test('first real kill drops a guaranteed better weapon and equipping changes damage', () => {
  const state = startTrail();
  const enemy = state.enemies[0];
  state.hero.x = enemy.x; state.hero.y = enemy.y + 55;
  enemy.hp = 1;
  dispatch(state, { type: 'target', id: enemy.id });
  const events = run(state, .7);
  assert(events.some(event => event.type === 'hit'));
  assert.equal(state.quest.kills, 1);
  const drop = state.drops.find(drop => drop.itemId === 'iron-sword');
  assert(drop);
  state.hero.x = drop.x; state.hero.y = drop.y;
  assert(dispatch(state, { type: 'pickup', id: drop.id }));
  const weapon = state.inventory.find(item => item.itemId === 'iron-sword');
  const oldAttack = state.hero.attack;
  assert(dispatch(state, { type: 'equip', uid: weapon.uid }));
  assert(state.hero.attack > oldAttack);
  assert(!dispatch(state, { type: 'pickup', id: drop.id }));
});

test('乾坤圈 damages once in each direction, returns, and respects cooldown', () => {
  const state = startTrail();
  state.hero.x = 180; state.hero.y = 1100;
  const enemy = state.enemies[0];
  Object.assign(enemy, { x: 180, y: 900, hp: 200, maxHp: 200, cooldown: 99 });
  state.enemies = [enemy]; state.trailState.enemies = state.enemies;
  assert(dispatch(state, { type: 'artifact', x: 180, y: 900 }));
  assert(!dispatch(state, { type: 'artifact', x: 180, y: 900 }));
  const events = run(state, 2);
  assert.equal(events.filter(event => event.type === 'artifactHit').length, 2);
  assert.equal(state.artifact.phase, 'idle');
  assert(state.artifact.cooldown > 0);
});

test('an enemy warns at a fixed position and moving away avoids its strike', () => {
  const state = startTrail(), enemy = state.enemies[0];
  state.enemies = [enemy]; state.trailState.enemies = state.enemies;
  Object.assign(enemy, { x: 220, y: 1100, cooldown: 0 });
  state.hero.x = 220; state.hero.y = 1140;
  const hp = state.hero.hp;
  const events = run(state, .04);
  assert(events.some(event => event.type === 'telegraph'));
  const warning = { ...enemy.telegraph };
  run(state, .8, { moveX: -1 });
  assert.equal(state.hero.hp, hp);
  assert.equal(warning.x, 220);
});

test('death retries at town with equipment and quest progress retained', () => {
  const state = startTrail(), enemy = state.enemies[0];
  state.hero.hp = 1;
  Object.assign(enemy, { x: 180, y: 1160, cooldown: 0 });
  run(state, 1);
  assert.equal(state.phase, 'dead');
  assert(dispatch(state, { type: 'retry' }));
  assert.equal(state.mapId, 'city');
  assert.equal(state.phase, 'play');
  assert.equal(state.hero.hp, state.hero.maxHp);
  assert.equal(state.quest.stage, 'hunt');
});

test('save restoration preserves items, map, artifact unlock and loot identity', () => {
  const state = startTrail();
  state.hero.gold = 127; state.quest.kills = 3;
  const snapshot = createSaveSnapshot(state);
  const restored = createSession(JSON.parse(JSON.stringify(snapshot)));
  assert.equal(restored.mapId, 'trail');
  assert.equal(restored.hero.gold, 127);
  assert.equal(restored.quest.kills, 3);
  assert.deepEqual(restored.inventory, state.inventory);
  assert.equal(restored.flags.artifactOwned, true);
  assert.equal(createSession({ version: 77 }).quest.stage, 'unaccepted');
  assert.equal(createSession({ ...snapshot, nextId: 'broken' }).quest.stage, 'unaccepted');
  assert.equal(createSession({ ...snapshot, hero: { ...snapshot.hero, hp: -5 } }).quest.stage, 'unaccepted');
});

test('a save during artifact flight preserves damage and cooldown without duplicating a ground pickup', () => {
  const state = startTrail(), foe = state.enemies[0];
  state.hero.x = foe.x; state.hero.y = foe.y + 80;
  dispatch(state, { type: 'target', id: foe.id });
  run(state, .15);
  dispatch(state, { type: 'artifact', x: foe.x, y: foe.y });
  run(state, .2);
  const restored = createSession(createSaveSnapshot(state));
  assert.equal(restored.artifact.phase, 'idle');
  assert(restored.artifact.cooldown > 4);
  assert(!dispatch(restored, { type: 'artifact' }));
  assert.equal(restored.enemies[0].hp, foe.hp);
  const drop = restored.drops.find(item => item.itemId === 'iron-sword');
  assert(drop);
  restored.hero.x = drop.x; restored.hero.y = drop.y;
  assert(dispatch(restored, { type: 'pickup', id: drop.id }));
  const again = createSession(createSaveSnapshot(restored));
  assert(!dispatch(again, { type: 'pickup', id: drop.id }));
  assert.equal(again.inventory.filter(item => item.itemId === 'iron-sword').length, 1);
});

test('a full backpack keeps a refused item on the ground and potions never go below zero', () => {
  const state = startTrail();
  state.inventory = Array.from({ length: 30 }, (_, index) => ({ uid: `bag-${index}`, itemId: 'bronze-sword' }));
  const item = { id: 'full-bag-loot', itemId: 'iron-sword', x: state.hero.x, y: state.hero.y, amount: 1 };
  state.drops.push(item);
  assert(!dispatch(state, { type: 'pickup', id: item.id }));
  assert(state.drops.includes(item));
  state.hero.potions = 1; state.hero.hp = 1;
  assert(dispatch(state, { type: 'potion' }));
  assert(!dispatch(state, { type: 'potion' }));
  assert.equal(state.hero.potions, 0);
});

test('a fresh character completes the quest using normal actions, equips loot and restores the earned ending', () => {
  const state = createSession();
  const travel = (point, radius = 80) => {
    dispatch(state, { type: 'moveTo', x: point.x, y: point.y });
    for (let frame = 0; frame < 60 * 30 && distanceTo(point) > radius; frame++) update(state, 1 / 60);
    assert(distanceTo(point) <= radius, `Arrived near ${point.x},${point.y}`);
  };
  const distanceTo = point => Math.hypot(state.hero.x - point.x, state.hero.y - point.y);
  travel(MAPS.city.npcs[0]);
  assert(dispatch(state, { type: 'interact', id: 'elder' }));
  travel(MAPS.city.portal);
  assert(dispatch(state, { type: 'interact', id: 'portal' }));
  const fight = foe => {
    dispatch(state, { type: 'target', id: foe.id });
    for (let frame = 0; frame < 60 * 50 && !foe.dead && state.phase === 'play'; frame++) {
      if (state.hero.hp < 55) dispatch(state, { type: 'potion' });
      if (distanceTo(foe) < 330) dispatch(state, { type: 'artifact', x: foe.x, y: foe.y });
      update(state, 1 / 60);
    }
    assert.equal(state.phase, 'play', `Survived ${foe.kind}`);
    assert(foe.dead, `Defeated ${foe.kind}`);
    for (const drop of [...state.drops].filter(item => distanceTo(item) < 100)) dispatch(state, { type: 'pickup', id: drop.id });
    for (const instance of state.inventory) dispatch(state, { type: 'equip', uid: instance.uid });
  };
  for (const foe of [...state.enemies].slice(0, 6)) fight(foe);
  assert.equal(state.quest.stage, 'boss');
  assert(state.inventory.some(item => item.itemId === 'iron-sword'));
  fight(state.enemies.find(foe => foe.boss));
  assert.equal(state.quest.stage, 'return');
  const reward = state.drops.find(item => item.itemId === 'jade-seal');
  if (reward) { travel(reward, 60); assert(dispatch(state, { type: 'pickup', id: reward.id })); }
  travel(MAPS.trail.portal);
  assert(dispatch(state, { type: 'interact', id: 'portal' }));
  travel(MAPS.city.npcs[0]);
  assert(dispatch(state, { type: 'interact', id: 'elder' }));
  assert.equal(state.quest.stage, 'complete');
  const gold = state.hero.gold;
  dispatch(state, { type: 'interact', id: 'elder' });
  assert.equal(state.hero.gold, gold, 'The quest reward is paid once');
  const restored = createSession(createSaveSnapshot(state));
  assert.equal(restored.quest.stage, 'complete');
  assert(restored.flags.bossDefeated);
  assert(restored.inventory.some(item => item.itemId === 'jade-seal'));
});
