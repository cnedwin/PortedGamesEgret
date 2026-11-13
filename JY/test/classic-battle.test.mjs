import assert from 'node:assert/strict';
import test from 'node:test';
import { canPractice, canUseGear } from '../src/battle-progression.mjs';
import { createClassicBattle, resolveClassicTeam } from '../src/classic-battle.mjs';

const pointMagic = { id: 1, name: '拳法', magicType: 0, attackArea: 0, hurtType: 0, needMp: 5,
  attack: [60], selectDistance: [1], effectId: 0 };
const role = (id, x, y, properties = {}) => ({
  id, name: String(id), x, y, hp: 100, maxHp: 100, mp: 100, maxMp: 100, physicalPower: 100, speed: 30,
  attack: 30, defence: 10, learnedMagics: [{ id: 1, level: 0 }], equippedMagics: [], ...properties,
});
const spec = overrides => ({ width: 10, height: 10, exp: 100, magics: [null, pointMagic],
  team: [role(0, 2, 2)], enemy: [role(4, 3, 2, { speed: 15 })], ...overrides });
const create = (battle, opts) => createClassicBattle(battle, { rng: () => .5, ...opts });
const advance = (model, until, steps = 40) => {
  for (let i = 0; i < steps && !until(); i++) model.step(250);
  assert.ok(until(), 'battle reached the expected phase');
};

test('turns follow raw speed and role ID, and manual turns pause enemy actions', () => {
  const model = create(spec({
    team: [role(0, 2, 2, { speed: 40 }), role(1, 2, 3, { speed: 40 })],
    enemy: [role(4, 5, 2, { speed: 30 })],
  }));
  assert.equal(model.state.turn.id, 1);
  assert.equal(model.state.round, 1);
  model.step(250);
  assert.equal(model.state.turn.id, 1);
  assert.equal(model.rest(), true);
  advance(model, () => model.state.canAct && model.state.turn.id === 0);
  model.rest();
  advance(model, () => model.state.canAct && model.state.round === 2);
  assert.equal(model.state.turn.id, 1);
});

test('movement stops in enemy control and spends one movement and two stamina', () => {
  const model = create(spec({ team: [role(0, 2, 2, { speed: 90 })], enemy: [role(4, 4, 2, { speed: 1 })] }));
  assert.equal(model.selectAction('move'), true);
  assert.equal(model.state.selection.cells.find(cell => cell.x === 3 && cell.y === 2)?.x, 3);
  assert.equal(model.selectCell(4, 2), false);
  assert.equal(model.selectCell(3, 2), true);
  advance(model, () => model.state.canAct);
  assert.equal(model.state.turn.x, 3);
  assert.equal(model.state.turn.physicalPower, 98);
  assert.equal(model.listActions().includes('move'), false);
});

test('a finishing strike uses classic damage and awards damage, kill bonus and victory experience', () => {
  const model = create(spec({ enemy: [role(4, 3, 2, { speed: 1, hp: 20, maxHp: 20 })] }));
  assert.equal(model.selectAction('magic', 1), true);
  assert.equal(model.selectCell(3, 2), true);
  advance(model, () => model.state.result !== null);
  assert.equal(model.state.result, true);
  assert.equal(model.state.settlement[0].expGot, 130);
  assert.equal(model.state.settlement[0].mp, 95);
  assert.equal(model.state.settlement[0].learnedMagics[0].level, 2);
});

test('a drug uses the shared bag and ends the current actor’s turn', () => {
  const model = create(spec({
    team: [role(0, 2, 2, { hp: 50 })], items: [null, { id: 1, type: 3, hp: 25 }],
  }), { inventory: [[1, 1]] });
  assert.equal(model.state.turn.hp, 50);
  assert.equal(model.useItem(1), true);
  assert.equal(model.state.roles[0].hp, 75);
  assert.deepEqual(model.state.inventoryDelta, [[1, -1]]);
  assert.equal(model.state.canAct, false);
});

test('a loss keeps role and bag changes and only grants experience when scripted', () => {
  const battle = spec({
    team: [role(0, 2, 2, { hp: 10, speed: 1, defence: 0 })],
    enemy: [role(4, 3, 2, { attack: 90 })],
  });
  for (const getExp of [0, 1]) {
    const model = create(battle, { getExp });
    advance(model, () => model.state.result !== null);
    assert.equal(model.state.result, false);
    assert.equal(model.state.settlement[0].hp, 0);
    assert.equal(model.state.settlement[0].expGot, getExp ? 100 : 0);
  }
});

test('a fixed original lineup uses only its recorded IDs in recorded order', () => {
  const lineup = {
    party: [0, 1], autoTeamMate: [3, 2, -1], roster: [role(0), role(1), role(2), role(3)],
    teamPositions: [[7, 6], [5, 4]],
  };
  assert.deepEqual(resolveClassicTeam(lineup, [0, 1]).map(({ id, x, y }) => [id, x, y]), [[3, 7, 6], [2, 5, 4]]);
  assert.deepEqual(resolveClassicTeam({ ...lineup, autoTeamMate: [-1] }, [1]).map(({ id }) => id), [1]);
});

test('manual training respects affinity, signed stat requirements and the level cap', () => {
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

test('equipment uses signed stat requirements without manual affinity checks', () => {
  const weapon = { type: 1, requirements: { attack: 25, iq: -70, onlyRoleId: 53, mpType: 1 } };
  const hero = { id: 0, attack: 27, iq: 60, mpType: 0 };
  assert.equal(canUseGear(hero, weapon), true);
  assert.equal(canUseGear({ ...hero, attack: 24 }, weapon), false);
  assert.equal(canUseGear({ ...hero, iq: 71 }, weapon), false);
  assert.equal(canPractice(hero, weapon), false);
});

test('a line attack follows the chosen direction and never hits allies', () => {
  const lineMagic = { ...pointMagic, attackArea: 1, selectDistance: [3] };
  const model = create(spec({
    magics: [null, lineMagic],
    team: [role(0, 3, 3, { speed: 70 }), role(1, 5, 3)],
    enemy: [role(4, 4, 3), role(5, 6, 3), role(6, 2, 3), role(7, 4, 4)],
  }));
  assert.equal(model.attackAt(4, 4), false);
  assert.equal(model.attackAt(4, 3), true);
  model.step(250);
  assert.deepEqual(model.state.roles.map(entry => [entry.id, entry.hp]), [[0, 100], [1, 100], [4, 60], [5, 68], [6, 100], [7, 100]]);
});

test('a hidden weapon targets a tile, costs stamina and uses the original item effect', () => {
  const darts = { id: 4, type: 4, hp: -25, hiddenWeaponEffectId: 13 };
  const model = create(spec({
    items: { 4: darts }, team: [role(0, 2, 2, { hiddenWeapon: 30 })],
  }), { inventory: [[4, 2]] });
  assert.equal(model.useItem(4), true);
  assert.equal(model.state.selection.type, 'dart');
  assert.equal(model.selectCell(3, 2), true);
  model.step(250);
  assert.equal(model.state.roles[1].hp, 45);
  assert.equal(model.state.roles[0].physicalPower, 95);
  assert.deepEqual(model.state.inventoryDelta, [[4, -1]]);
  assert.equal(model.state.effects[0].effectId, 13);
});


test('both strikes award original experience before a knockout removes the target', () => {
  const casts = [];
  const model = create(spec({
    team: [role(0, 2, 2, { attackTwice: 1 })],
    enemy: [role(4, 3, 2, { speed: 1, hp: 20, maxHp: 20 })],
  }), { onEvent: event => { if (event.type === 'cast') casts.push(event); } });
  assert.equal(model.attackAt(3, 2), true);
  advance(model, () => model.state.result !== null);
  const [hero] = model.state.settlement;
  assert.equal(casts.length, 2);
  assert.equal(hero.expGot, 160);
  assert.equal(hero.mp, 90);
});
