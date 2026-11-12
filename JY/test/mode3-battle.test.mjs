import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canPractice, canUseGear, createMode3Battle, resolveBattleTeam } from '../src/mode3-battle.mjs';

const tick = 1000 / 60;
const seeded = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32);
const point = (id, x, y, overrides = {}) => ({
  id, x, y, level: 1, exp: 0, lifeGrowth: 3, hp: 30, maxHp: 30, mp: 50, maxMp: 50,
  attack: 30, defence: 0, speed: 90, physicalPower: 25, fist: 20,
  fightFrames: [0, 8, 0, 0, 0], weaponId: -1, armorId: -1,
  learnedMagics: [{ id: 1, level: 0 }], equippedMagics: [0, 0, 0, 0], ...overrides,
});

test('medicine clamps native stat changes and stages consumption through surrender', () => {
  const bag = new Map([[2, 2], [21, 1], [174, 9]]);
  const items = {
    2: { id: 2, name: '白嵐氏雞精', type: 3, hp: 20, hiddenWeaponEffectId: -1 },
    21: { id: 21, name: '寶濟丸', type: 3, poison: -20, hiddenWeaponEffectId: -1 },
    174: { id: 174, name: '銀兩', type: 0 },
  };
  const battle = createMode3Battle(fixture({ items }), { inventory: bag, rng: seeded(5) });
  const { player } = battle.state;
  player.hp = 14;
  player.poison = 12;
  assert.deepEqual(battle.listItems().map(({ id, count }) => [id, count]), [[2, 2], [21, 1]]);
  assert.equal(battle.useItem(174), false);
  assert.equal(battle.useItem(2), true);
  assert.equal(player.hp, 30);
  assert.equal(battle.useItem(2), true);
  assert.equal(battle.useItem(2), false);
  assert.equal(battle.useItem(21), true);
  assert.equal(player.poison, 0);
  assert.equal(bag.get(2), 2);
  assert.equal(bag.get(21), 1);
  assert.equal(battle.surrender(), false);
  assert.deepEqual(battle.state.inventoryDelta, [[2, -2], [21, -1]]);
  assert.equal(battle.state.settlement[0].expGot, 0);
});

test('a hidden weapon advances from the caster, hits once and exposes its original effect', () => {
  const items = { 96: { id: 96, name: '飛蝗石', type: 4, hp: -30, hiddenWeaponEffectId: 23 } };
  const team = [point(0, 3, 3, { hiddenWeapon: 30 })];
  const enemy = [point(35, 7, 7, { maxHp: 50, speed: 0, learnedMagics: [] })];
  const events = [];
  const battle = createMode3Battle(fixture({ items, team, enemy }), {
    inventory: { 96: 1 }, rng: () => 0.125, onEvent: event => events.push(event),
  });
  const { player, target } = battle.state;
  assert.equal(battle.useItem(96), true);
  assert.equal(battle.useItem(96), false);
  const [effect] = battle.state.effects;
  assert.equal(effect.effectId, 23);
  assert.equal(effect.itemId, 96);
  assert.equal(effect.worldX, player.worldX);
  assert.equal(effect.worldY, player.worldY);
  assert.equal(effect.totalFrames, 100);
  advance(battle, 1);
  assert.equal(battle.state.effects[0].worldY, effect.worldY + 10);
  assert.equal(target.hp, 50);
  advance(battle, 100);
  assert.ok(target.hp < 50 && target.hp > 0);
  assert.equal(events.filter(event => event.type === 'hit' && event.itemId === 96).length, 1);
  assert.deepEqual(battle.state.inventoryDelta, [[96, -1]]);
});

function fixture(overrides = {}) {
  return {
    id: 48, width: 10, height: 10, exp: 50, levelUpExp: [50, 150, 300],
    layers: { earth: new Int16Array(100), building: new Int16Array(100) },
    team: [point(0, 3, 3)], enemy: [point(35, 4, 2, { maxHp: 5, learnedMagics: [] })],
    magics: { 1: { id: 1, magicType: 1, effectId: 11, soundId: 2, hurtType: 0, needMp: 12,
      selectDistance: [1], attack: [90] } },
    ...overrides,
  };
}

function advance(battle, count, ...codes) {
  const keys = new Set(codes);
  for (let index = 0; index < count; index++) battle.step(tick, keys);
}

test('manual suitability respects native affinity, signed stat thresholds and known skills', () => {
  const manual = { type: 2, magicId: 30, requirements: { onlyRoleId: 53, mpType: 1, iq: -70 } };
  const hero = { id: 0, mpType: 0, iq: 50, learnedMagics: [] };
  const recruit = { id: 53, mpType: 0, iq: 90, learnedMagics: [] };
  assert.equal(canPractice(hero, manual), false);
  assert.equal(canPractice(recruit, manual), false);
  assert.equal(canPractice({ ...recruit, mpType: 2 }, manual), true);
  assert.equal(canPractice({ ...hero, learnedMagics: [{ id: 30, level: 700 }] }, manual), true);
  assert.equal(canPractice({ ...hero, learnedMagics: [{ id: 30, level: 900 }] }, manual), false);
  const generic = { ...manual, requirements: { iq: -70, fist: 20 } };
  assert.equal(canPractice({ ...hero, iq: 60, fist: 20 }, generic), true);
  assert.equal(canPractice({ ...hero, iq: 71, fist: 20 }, generic), false);
});

test('equipment uses the native signed stat requirements without the manual affinity checks', () => {
  const weapon = { type: 1, requirements: { attack: 25, iq: -70, onlyRoleId: 53, mpType: 1 } };
  const hero = { id: 0, attack: 27, iq: 60, mpType: 0 };
  assert.equal(canUseGear(hero, weapon), true);
  assert.equal(canUseGear({ ...hero, attack: 24 }, weapon), false);
  assert.equal(canUseGear({ ...hero, iq: 71 }, weapon), false);
  assert.equal(canPractice(hero, weapon), false);
});

test('natural settlement splits XP, trains into the first empty magic slot and crafts once', () => {
  const book = { id: 48, name: '子午針灸經', type: 2, practiceExp: 20, magicId: 2, medicine: 3,
    craftingExp: 50, materialId: 171, craftingItems: [{ id: 3, count: 2 }, { id: 1, count: 1 }] };
  const hero = point(0, 3, 3, { iq: 90, maxHp: 5, practiceItemId: 48,
    learnedMagics: [{ id: 1, slot: 0, level: 0 }, { id: 17, slot: 3, level: 0 }] });
  const enemy = point(35, 4, 2, { poison: 50 });
  const data = fixture({ exp: 100, levelUpExp: [], items: { 48: book }, team: [hero], enemy: [enemy] });
  const bag = new Map([[48, 1], [171, 2]]);
  const battle = createMode3Battle(data, { rng: () => 0.125, inventory: bag });
  assert.equal(battle.state.target.poison, 0);
  advance(battle, 210);
  assert.equal(battle.state.result, false);
  const [result] = battle.state.settlement;
  assert.deepEqual([result.expGot, result.exp, result.practiceExp, result.craftingExp, result.medicine], [100, 50, 10, 0, 6]);
  assert.deepEqual(result.learnedMagics.map(({ id, slot, level }) => [id, slot, level]), [[1, 0, 0], [2, 1, 100], [17, 3, 0]]);
  assert.deepEqual(battle.state.inventoryDelta, [[3, 2], [171, -1]]);
  assert.deepEqual(battle.state.progression, [{ roleId: 0,
    practice: { itemId: 48, name: book.name, times: 2, magicId: 2 },
    crafting: { itemId: 3, count: 2, materialId: 171, bookId: 48, bookName: book.name },
  }]);
  assert.equal(bag.get(171), 2);

  const surrendered = createMode3Battle({ ...data, team: [{ ...hero, practiceExp: 100, craftingExp: 100 }] }, { inventory: bag });
  surrendered.surrender();
  assert.deepEqual(surrendered.state.progression, []);
  assert.deepEqual(surrendered.state.inventoryDelta, []);
  assert.equal(surrendered.state.settlement[0].practiceExp, 100);
});

test('manual attacks require a learned skill', () => {
  const team = [point(0, 3, 3, { learnedMagics: [] })];
  const battle = createMode3Battle(fixture({ team }), { rng: seeded(5) });
  advance(battle, 16, 'KeyI');
  assert.equal(battle.state.target.hp, 5);
  assert.equal(battle.state.effects.length, 0);
});

test('battle skill controls cycle learned moves without changing the player position', () => {
  const data = fixture({ team: [point(0, 3, 3, {
    learnedMagics: [{ id: 1, level: 0 }, { id: 2, level: 0 }], equippedMagics: [1, 0, 0, 0],
  })] });
  data.magics[1].name = '野球拳';
  data.magics[2] = { ...data.magics[1], id: 2, name: '鐵掌' };
  const battle = createMode3Battle(data, { rng: seeded(5) });
  assert.equal(battle.state.activeMagicName, '野球拳');
  advance(battle, 1, 'KeyF');
  assert.equal(battle.state.activeMagicName, '鐵掌');
  advance(battle, 20);
  advance(battle, 1, 'KeyQ');
  assert.equal(battle.state.activeMagicName, '野球拳');
  assert.deepEqual([battle.state.player.x, battle.state.player.y], [3, 3]);
});

test('fixed allies take the first spawn slots, then selected party members in party order', () => {
  const lineup = {
    party: [0, 53, 8, 12], fixedTeam: [11, 8],
    teamPositions: [[20, 21], [22, 23], [24, 25], [26, 27], [28, 29], [30, 31]],
    roster: [0, 53, 8, 12, 11].map(id => ({ id })),
  };
  const team = resolveBattleTeam(lineup, new Set([12, 53]));
  assert.deepEqual(team.map(role => [role.id, role.x, role.y]), [
    [11, 20, 21], [8, 22, 23], [0, 24, 25], [53, 26, 27], [12, 28, 29],
  ]);
  assert.deepEqual(resolveBattleTeam({ ...lineup, teamPositions: lineup.teamPositions.slice(0, 2) }, []).map(role => role.id),
    [11, 0]);
});

test('a recruited ally fights with AI and shares the battle experience with the protagonist', () => {
  const data = fixture({
    team: [point(0, 8, 8), point(53, 3, 3)], levelUpExp: [],
  });
  const events = [];
  const battle = createMode3Battle(data, { rng: () => 0.125, onEvent: event => events.push(event) });
  advance(battle, 210);
  assert.equal(battle.state.result, true);
  assert.ok(events.some(event => event.type === 'cast' && event.role === 53));
  assert.equal(events.some(event => event.type === 'cast' && event.role === 0), false);
  const [hero, recruit] = battle.state.settlement;
  assert.equal(hero.id, 0);
  assert.equal(hero.expGot, 25);
  assert.equal(recruit.id, 53);
  assert.ok(recruit.expGot > 25);
});

test('physical movement preserves native sprite facing and respects building collision', () => {
  const data = fixture({ enemy: [point(35, 9, 9, { speed: 0, learnedMagics: [] })] });
  data.layers.building[3 + 4 * data.width] = 1502;
  data.layers.building[2 + 4 * data.width] = 1502;
  const battle = createMode3Battle(data, { rng: seeded(8) });
  const { player } = battle.state;
  advance(battle, 60, 'KeyA');
  assert.ok(player.x > 2.5 && player.x < 3);
  assert.equal(player.facing, 3);
  assert.equal(player.picture, 24);
  const blockedX = player.worldX;
  advance(battle, 1, 'KeyD');
  assert.ok(player.worldX > blockedX);
  assert.equal(player.action, 'walk');
  assert.equal(player.facing, 0);
});

test('attack casts the equipped effect, freezes on the knockout, then finishes at quarter speed', () => {
  const battle = createMode3Battle(fixture(), { rng: seeded(5) });
  advance(battle, 1, 'KeyI');
  assert.equal(battle.state.player.action, 'attack');
  advance(battle, 9);
  assert.equal(battle.state.target.hp, 5);
  advance(battle, 1);
  assert.equal(battle.state.effects[0].effectId, 11);
  assert.equal(battle.state.remainingEnemies, 0);
  assert.equal(battle.state.pendingResult, true);
  assert.equal(battle.state.result, null);
  const view = battle.state.presentation;
  assert.deepEqual([view.freeze, view.closeUp, view.slow, view.zoom], [60, 60, 30, 2]);
  assert.equal(view.focus.roleKey, '1:0');
  assert.equal(view.texts[0].frame, 1);
  assert.match(view.texts[0].text, /^-\d+$/);
  assert.equal(view.blood[0].frame, 0);
  assert.match(view.blood[0].group, /^eft\/bld00[0-4]$/);
  assert.ok([90, 270].includes(battle.state.roles[0].rotation));
  advance(battle, 60);
  assert.deepEqual([view.freeze, view.closeUp, view.slow, view.texts[0].frame, view.blood[0].frame], [0, 60, 30, 1, 0]);
  advance(battle, 1);
  assert.deepEqual([view.closeUp, view.slow, view.texts[0].frame, view.blood[0].frame], [59, 29, 2, 1]);
  advance(battle, 3);
  assert.deepEqual([view.closeUp, view.slow, view.texts[0].frame, view.blood[0].frame], [56, 29, 2, 1]);
  advance(battle, 112);
  assert.equal(battle.state.result, null);
  advance(battle, 1);
  assert.equal(battle.state.result, true);
  assert.equal(battle.state.frame, 188);
  assert.equal(view.zoom, 1);
  const [hero] = battle.state.settlement;
  assert.equal(hero.level, 2);
  assert.equal(hero.levelsGained, 1);
  assert.equal(hero.exp, hero.expGot - 50);
  assert.equal(hero.craftingExp, hero.expGot);
  assert.ok(hero.hp >= 39 && hero.hp <= 44);
  assert.equal(hero.hp, hero.maxHp);
  assert.ok(hero.learnedMagics[0].level > 0);
});

test('a fresh guard deflects the same attack that damages a sustained guard', () => {
  const data = fixture({ enemy: [point(35, 4, 2)], team: [point(0, 3, 3, { maxHp: 100 })] });
  const parry = createMode3Battle(data, { rng: () => 0.125 });
  advance(parry, 11);
  advance(parry, 1, 'KeyE');
  assert.equal(parry.state.lastEvent.type, 'parry');
  assert.equal(parry.state.lastEvent.soundId, 10);
  assert.equal(parry.state.player.hp, 100);
  assert.ok(parry.state.target.posture > 98);
  assert.deepEqual([parry.state.presentation.swordLight, parry.state.presentation.swordLightColor, parry.state.presentation.shake],
    [30, 0xffffff, 30]);
  assert.equal(parry.state.presentation.blood.length, 0);
  const guard = createMode3Battle(data, { rng: () => 0.125 });
  advance(guard, 12, 'KeyE');
  assert.equal(guard.state.lastEvent.type, 'guard');
  assert.ok(guard.state.player.hp < 100);
  assert.ok(guard.state.target.posture < 30);
  assert.equal(guard.state.presentation.swordLight, 10);
  assert.equal(guard.state.presentation.texts[0].color, 0xff1414);
  assert.equal(guard.state.presentation.blood.length, 1);
});

test('AI can defeat the player, while surrender finishes without experience', () => {
  const data = fixture({ exp: 6, team: [point(0, 3, 3, { maxHp: 5 })], enemy: [point(35, 4, 2)] });
  const loss = createMode3Battle(data, { rng: () => 0.125 });
  advance(loss, 12);
  assert.equal(loss.state.player.dead, true);
  assert.equal(loss.state.pendingResult, false);
  advance(loss, 180);
  assert.equal(loss.state.result, false);
  assert.equal(loss.state.settlement[0].expGot, 6);

  const surrender = createMode3Battle(data, { rng: seeded(5) });
  advance(surrender, 1, 'Tab');
  assert.equal(surrender.state.auto, true);
  assert.equal(surrender.surrender(), false);
  assert.equal(surrender.state.lastEvent.surrendered, true);
  assert.equal(surrender.state.settlement[0].expGot, 0);
});

test('a stranded survivor can take over without moving through terrain or receiving a victory', () => {
  const data = fixture({
    team: [point(0, 3, 3, { maxHp: 5 }), point(53, 3, 7, { speed: 59 })],
    enemy: [point(35, 4, 2)],
    items: { 2: { id: 2, name: '白嵐氏雞精', type: 3, hp: 20 } },
  });
  data.layers.building.fill(100, 5 * data.width, 6 * data.width);
  const battle = createMode3Battle(data, { rng: () => 0.125, inventory: { 2: 1 } });
  assert.equal(battle.state.stranded, null);
  assert.equal(battle.takeControl(53), false);
  advance(battle, 12);
  assert.equal(battle.state.player.dead, true);
  assert.deepEqual(battle.state.stranded, { allyIds: [53], enemyIds: [35] });
  assert.equal(battle.state.result, null);
  assert.equal(battle.state.canTakeControl, true);
  assert.equal(battle.takeControl(35), false);
  const ally = battle.state.roles.find(role => role.id === 53);
  const before = ally.worldX;
  advance(battle, 6, 'KeyA');
  assert.equal(battle.state.controlled, ally);
  assert.equal(battle.state.canTakeControl, false);
  assert.ok(ally.worldX < before);
  assert.ok(ally.y > 5.5);
  ally.hp = 20;
  assert.equal(battle.useItem(2), true);
  assert.equal(ally.hp, 30);
  assert.equal(battle.surrender(), false);
  assert.equal(battle.state.stranded, null);
  assert.deepEqual(battle.state.settlement.map(role => role.expGot), [0, 0]);
});

test('automatic play approaches a reachable enemy when a closer opponent is across a wall', () => {
  const data = fixture({
    width: 12, height: 12,
    layers: { earth: new Int16Array(144), building: new Int16Array(144) },
    team: [point(0, 3, 8)],
    enemy: [point(35, 3, 4, { maxHp: 5, speed: 0 }), point(36, 10, 8, { maxHp: 10, speed: 0 })],
  });
  data.layers.building.fill(100, 5 * data.width, 7 * data.width);
  const battle = createMode3Battle(data, { rng: () => 0.75 });
  assert.equal(battle.state.stranded, null); // A reachable reservist can still enter.
  advance(battle, 1, 'Tab');
  assert.ok(battle.state.player.directionY < 0);
  advance(battle, 1);
  assert.ok(battle.state.player.directionY > 0);
  assert.equal(battle.state.stranded, null);
});
