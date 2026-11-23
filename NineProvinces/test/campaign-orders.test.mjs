import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hostile, marchArmies, muster } from '../src/sim/military.mjs';
import { createGame, income, workQuote } from '../src/sim/world.mjs';

function newCangwu() {
  return createGame({
    scenario: '219',
    customFaction: { zh: '新义军', en: 'New Banner', flag: '义', colour: 0x945b37, town: 'cangwu', ruler: 'history:zhaoyun' }
  });
}

test('a targeted attack cannot spend the garrison or grain during a truce', () => {
  const state = newCangwu();
  const faction = state.player;
  const owner = state.nodes.nanhai.owner;
  const before = structuredClone(state);
  const attack = { commander: 'zhaoyun', troops: 6000, target: 'nanhai', attack: true };
  assert.equal(hostile(state, faction, owner), false);
  assert.deepEqual(muster(state, faction, 'cangwu', attack), { why: 'protectedTarget' });
  assert.deepEqual(state, before);

  state.day = state.factions[faction].treaties[owner].until;
  assert.equal(hostile(state, faction, owner), true);
  const sent = muster(state, faction, 'cangwu', attack);
  assert.equal(sent.ok, true);
  assert.equal(state.armies[sent.army].target, 'nanhai');
});

test('marching to a protected city leaves control and defenders intact and explains the halt', () => {
  const state = newCangwu();
  const faction = state.player;
  const defendingCity = structuredClone(state.nodes.nanhai);
  const dispatched = muster(state, faction, 'cangwu', { commander: 'zhaoyun', troops: 1000, target: 'nanhai' });
  const army = state.armies[dispatched.army];
  for (let i = 0; i < 30 && army.at !== 'nanhai'; i++) marchArmies(state);
  assert.equal(army.at, 'nanhai');
  assert.equal(army.besieging, null);
  assert.deepEqual(state.nodes.nanhai, defendingCity);
  assert.ok(state.log.some((entry) => entry.key === 'logTreatyArrival' && entry.values.place === 'nanhai'));
});

test('work previews use the real income formula and stop at the construction cap', () => {
  const state = newCangwu();
  const city = state.nodes.cangwu;
  const before = income(state, 'cangwu');
  const farm = workQuote(state, 'cangwu', 'farm');
  const market = workQuote(state, 'cangwu', 'market');
  assert.equal(city.farm, 11);
  assert.equal(farm.nextLevel, city.farm + 1);
  assert.ok(farm.gain > 0);
  city.farm = farm.nextLevel;
  assert.equal(farm.gain, income(state, 'cangwu').grain - before.grain);
  assert.equal(market.nextLevel, city.market + 1);
  city.market = market.nextLevel;
  assert.equal(market.gain, income(state, 'cangwu').coin - before.coin);

  city.farm = 56;
  const full = workQuote(state, 'cangwu', 'farm');
  assert.equal(full.nextLevel, city.farm);
  assert.equal(full.gain, 0);
});
