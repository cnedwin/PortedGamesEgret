import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ARSENAL_ITEMS, BASIC_SHOPS, FORGE_RECIPES, PROFESSIONS,
  canEquip, equipmentStats, isForgeIngredient, professionStats, rollDrop, rollForge, shopOffers, stockOffers
} from '../src/sim/arsenal.mjs';

const item = id => ARSENAL_ITEMS[id];

test('guard keeps its baseline and each ranged profession pays for its longer reach', () => {
  assert.deepEqual(professionStats('guard', 1), {attack:4, defense:1, maxHp:100, speed:185});
  assert.deepEqual(professionStats('guard', 8), {attack:18, defense:1, maxHp:205, speed:185});
  const {guard, ranger, ritualist} = PROFESSIONS;
  assert.deepEqual([guard.reach, guard.chaseRange, guard.attackCooldown, guard.attackWindup], [88, 70, .48, .12]);
  for (const ranged of [ranger, ritualist]) {
    assert.ok(ranged.reach > guard.reach * 2);
    assert.ok(professionStats(ranged.id, 1).maxHp < 100);
    assert.equal(canEquip(item(ranged.starterWeapon), ranged.id, 1), true);
    assert.equal(canEquip(item(ranged.starterWeapon), 'guard', 1), false);
  }
  assert.equal(new Set(Object.values(PROFESSIONS).map(role => role.active.id)).size, 3);
  assert.equal(new Set(Object.values(PROFESSIONS).map(role => role.rage.id)).size, 3);
});

test('merchant shows future basics, filters professions, and sells only unlocked common goods', () => {
  for (const [npcId, shop] of Object.entries(BASIC_SHOPS)) {
    assert.equal(new Set(shop.offers.map(offer => offer.id)).size, shop.offers.length);
    assert.ok(shop.offers.every(offer => (item(offer.itemId)?.tier ?? 'common') === 'common'));
    for (const role of Object.values(PROFESSIONS)) {
      const future = stockOffers(npcId, role.id);
      assert.ok(future.some(offer => offer.unlockLevel > 1));
      assert.deepEqual(shopOffers(npcId, 4, role.id), future.filter(offer => offer.unlockLevel <= 4));
      assert.ok(future.every(offer => !item(offer.itemId) || item(offer.itemId).consumable || canEquip(item(offer.itemId), role.id, 20)));
    }
  }
});

test('each role gets a matching offhand specialization and common ones are valid forge inputs', () => {
  const specialty = {guard:'defense', ritualist:'attack', ranger:'speed'};
  for (const [role, key] of Object.entries(specialty)) {
    const offer = shopOffers('smith', 4, role).find(offer =>
      item(offer.itemId)?.slot === 'offhand' && item(offer.itemId)?.professions?.includes(role));
    assert.ok(offer);
    const offhand = item(offer.itemId);
    assert.ok(offhand[key] > 0);
    const recipe = FORGE_RECIPES.find(recipe => recipe.slot === 'offhand' && recipe.grade === 1);
    assert.equal(isForgeIngredient(offhand, recipe, role), true);
    assert.equal(isForgeIngredient({...offhand, tier:'rare'}, recipe, role), false);
    assert.equal(isForgeIngredient({...offhand, requiredLevel:1}, recipe, role), false);
    assert.ok(Object.keys(specialty).filter(other => other !== role).every(other =>
      !isForgeIngredient(offhand, recipe, other)));
  }
});

test('forged equipment rolls reproducible, bounded, slot-appropriate bonuses', () => {
  for (const recipe of FORGE_RECIPES) {
    for (const role of Object.values(PROFESSIONS)) {
      const params = {recipeId:recipe.id, seed:1818, level:recipe.unlockLevel, profession:role.id};
      assert.equal(rollForge({...params, level:params.level - 1}), null);
      const result = rollForge(params);
      assert.deepEqual(result, rollForge(params));
      const forged = item(result.itemId);
      assert.equal(forged.slot, recipe.slot);
      assert.equal(forged.tier, 'fine');
      assert.equal(canEquip(forged, role.id, params.level), true);
      assert.ok(forged.sellPrice < recipe.gold);
      assert.equal(Object.keys(result.affixes).length, recipe.count - 1);
      const varied = new Set(Array.from({length:32}, (_, i) => JSON.stringify(rollForge({...params, seed:i * 98761377}).affixes)));
      assert.ok(varied.size >= 4);
      const base = equipmentStats(forged);
      const malicious = equipmentStats(forged, {speed:1e9, maxHp:-10, attack:49.5, defense:Infinity, cheat:10});
      assert.ok(malicious.speed - base.speed <= 10);
      assert.equal(malicious.maxHp, base.maxHp);
      assert.equal(malicious.attack, base.attack);
      assert.equal(malicious.defense, base.defense);
      assert.equal(malicious.cheat, undefined);
    }
  }
});

test('a fixed expedition sample has more loot on elites and reserves legendary gear for the late boss', () => {
  function simulate({mapId, kind, level, tier}) {
    const counts = {common:0, rare:0, epic:0, legendary:0};
    let seed = 87013;
    for (let i = 0; i < 6000; i++) {
      const roll = rollDrop({mapId, kind, level, tier, seed, profession:'ranger'});
      seed = roll.seed;
      if (!roll.itemId) continue;
      const loot = item(roll.itemId);
      assert.equal(canEquip(loot, 'ranger', 20), true);
      counts[loot.tier]++;
    }
    return counts;
  }
  const trail = simulate({mapId:'trail', kind:'normal', level:3, tier:1});
  const siegeNormal = simulate({mapId:'siege', kind:'normal', level:12, tier:3});
  const siegeElite = simulate({mapId:'siege', kind:'elite', level:12, tier:3});
  const siegeBoss = simulate({mapId:'siege', kind:'boss', level:12, tier:3});
  assert.ok(trail.rare > 130 && trail.rare < 260);
  assert.ok(siegeElite.rare > siegeNormal.rare * 2);
  assert.equal(trail.legendary + siegeNormal.legendary + siegeElite.legendary, 0);
  assert.ok(siegeBoss.legendary > 420 && siegeBoss.legendary < 650);
  assert.equal(rollDrop({mapId:'city', kind:'boss', level:12, tier:3, seed:87, profession:'guard'}).itemId, null);
});
