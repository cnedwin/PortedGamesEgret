import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';
import { ADJACENT } from '../src/data/map.mjs';
import { HEX_W } from '../src/sim/hexgrid.mjs';
import { finishBattle, marchArmies, muster, order } from '../src/sim/military.mjs';
import { advance, createGame } from '../src/sim/world.mjs';
const { openSlot, writeSlot } = await import('../src/saves.mjs');

function convoy({
  from = 'nanpi', to = 'pingyuan', faction = 'yuanshao', opponent = 'liubei',
  scenario = '184', commander = 'qianzhao', defenders = ['liubei', 'guanyu', 'zhangfei', 'jianyong'],
} = {}) {
  const state = createGame({ seed: 8, faction: opponent, scenario, branch: 'free', command: true });
  const road = ADJACENT[from].find(edge => edge.to === to).link;
  const defenderFront = road.length * .55;
  const add = (id, general, owner, origin, destination, done) => {
    const entry = {
      id, faction: owner, commander: general, deputies: [], troops: 2000,
      unit: 'spear', formation: 'fishscale', morale: 75, training: 50, grain: 300,
      at: null, link: { from: origin, to: destination, kind: road.kind, length: road.length, done },
      path: [destination], home: origin, target: destination, besieging: null,
    };
    state.armies[id] = entry;
    state.generals[general].at = id;
    return entry;
  };
  // The marcher's move today encounters a lead with other same-direction
  // columns already at its front. A distant column hasn't joined them yet.
  const lead = add('a1', commander, faction, from, to, road.length - defenderFront - 2);
  const front = defenders.slice(0, 3).map((general, i) =>
    add('a' + (i + 2), general, opponent, to, from, defenderFront));
  const distant = defenders[3] ? add('a8', defenders[3], opponent, to, from, 0) : null;
  return { state, road, lead, front, distant, add, defenderFront };
}

function outcomeFor(setup, winner) {
  return { winner, why: 'broken', gateTaken: false,
    units: setup.units.map(unit => ({ troops: unit.troops - 400, morale: 60, fates: {} })) };
}

function readBack(state) {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key) };
  assert(writeSlot(openSlot(storage, '1'), state, 1));
  return openSlot(storage, '1').data.game;
}

test('co-located columns join one ordinary road battle, distant and already engaged columns do not', () => {
  const { state, road, lead, front, distant, defenderFront } = convoy();
  const locked = structuredClone(front[1]);
  locked.id = 'a9';
  locked.commander = 'zhangfei';
  locked.inBattle = 'previous-battle';
  const idle = front.pop();
  idle.commander = 'tianchou';
  state.armies[locked.id] = locked;
  state.generals[locked.commander].at = locked.id;
  const before = Object.fromEntries(front.concat(idle).map(a => [a.id, { done: a.link.done, grain: a.grain }]));
  marchArmies(state);
  assert.equal(state.inbox.length, 1);
  const [{ setup }] = state.inbox;
  assert.equal(setup.kind, 'field');
  assert.deepEqual(setup.place, { link: ['nanpi', 'pingyuan'] });
  assert.deepEqual(setup.units.map(unit => [unit.side, unit.army]), [[0, lead.id], [1, front[0].id], [1, front[1].id], [1, idle.id]]);
  assert.equal(lead.link.done, road.length - defenderFront);
  for (const a of front.concat(idle)) {
    assert.equal(a.inBattle, setup.id);
    assert.equal(a.link.done, before[a.id].done);
    assert(a.grain < before[a.id].grain);
  }
  assert.equal(locked.inBattle, 'previous-battle');
  assert.equal(locked.grain, 300);
  assert.equal(distant.inBattle, undefined);
});

test('a column one hex from the contact joins from its actual position, without drawing in allied factions', () => {
  const { state, front, defenderFront, add } = convoy();
  front[1].link.done -= 1.5;
  front[2].link.done -= HEX_W + .1;
  const treaty = { kind: 'ally', until: state.day + 10 };
  state.factions.liubei.treaties.caocao = treaty;
  state.factions.caocao.treaties.liubei = treaty;
  const ally = add('a80', 'xiahoudun', 'caocao', 'pingyuan', 'nanpi', defenderFront);
  marchArmies(state);
  assert.equal(state.inbox.length, 1);
  const [{ setup }] = state.inbox;
  assert.deepEqual(setup.units.filter(unit => unit.side === 1).map(unit => unit.army), [front[0].id, front[1].id]);
  assert.equal(front[1].link.done, defenderFront - 1.5);
  assert.equal(ally.inBattle, undefined);
  assert.equal(front[2].inBattle, undefined);
});

test('road reinforcement is capped and only physical columns near the front can enter', () => {
  const { state, road, lead, front, distant, defenderFront, add } = convoy();
  distant.link.done = defenderFront - 10;
  const peer = add('a24', 'tianchou', 'liubei', 'pingyuan', 'nanpi', front[0].link.done);
  const ahead = add('a49', 'cuiyan', 'liubei', 'pingyuan', 'nanpi', defenderFront + HEX_W * 3);
  ahead.inBattle = 'old';
  marchArmies(state);
  const [{ setup }] = state.inbox;
  assert.equal(state.inbox.length, 1);
  assert.deepEqual(setup.units.filter(unit => unit.side === 1).map(unit => unit.army), front.map(army => army.id));
  assert.equal(peer.inBattle, undefined);
  assert.equal(ahead.inBattle, 'old');
  assert(distant.link.done>defenderFront - 10);
  assert.equal(distant.inBattle, undefined);
  assert(lead.link.done<road.length);
});

test('a reserve stops at an unresolved contact and resumes its original march after the result', () => {
  const { state, defenderFront, add } = convoy();
  const reserve = add('a28', 'tianchou', 'liubei', 'pingyuan', 'nanpi', defenderFront - HEX_W - 1);
  marchArmies(state);
  const [{ setup }] = state.inbox;
  assert.equal(state.inbox.length, 1);
  assert(!setup.units.some(unit => unit.army === reserve.id));
  assert.equal(reserve.inBattle, undefined);
  assert.equal(reserve.link.done, defenderFront);
  assert.equal(reserve.target, 'nanpi');
  assert.deepEqual(reserve.path, ['nanpi']);
  finishBattle(state, setup, outcomeFor(setup, 1));
  assert(advance(state));
  assert(reserve.link.done > defenderFront);
  assert.equal(reserve.target, 'nanpi');
  assert.deepEqual(reserve.path, ['nanpi']);
});

test('an auto-resolved road battle leaves no obstruction from its previous contact', () => {
  const { state, defenderFront, add } = convoy();
  const reserve = add('a28', 'tianchou', 'liubei', 'pingyuan', 'nanpi', defenderFront - HEX_W - 1);
  state.options.command = false;
  marchArmies(state);
  assert.equal(state.inbox.length, 0);
  assert.equal(state.stats.battlesWon + state.stats.battlesLost, 1);
  assert(reserve.link.done > defenderFront);
  assert.equal(reserve.inBattle, undefined);
});

test('winner paths and individual loser retreat points survive saving a queued field battle', () => {
  const { state, lead, front, road, defenderFront, add } = convoy();
  const support = add('a20', 'yanliang', 'yuanshao', 'nanpi', 'pingyuan', road.length - defenderFront + 2);
  const excluded = add('a21', 'wenchou', 'yuanshao', 'nanpi', 'pingyuan', road.length - defenderFront + HEX_W + 1);
  for (const a of [lead, support]) a.next = 'julu';
  marchArmies(state);
  const copy = readBack(state);
  const [{ setup }] = copy.inbox;
  assert.deepEqual(setup.units.map(unit => unit.army), [lead.id, support.id, ...front.map(a => a.id)]);
  const original = structuredClone(copy.armies);
  const otherBattles = structuredClone(copy.inbox.slice(1));
  finishBattle(copy, setup, outcomeFor(setup, 1));
  assert.deepEqual(copy.inbox, otherBattles);
  assert.equal(copy.stats.battlesWon, 1);
  for (const { id } of front) {
    assert.deepEqual(copy.armies[id].link, original[id].link);
    assert.deepEqual(copy.armies[id].path, original[id].path);
  }
  for (const { id } of [lead, support]) {
    const { from, to, kind, length, done } = original[id].link;
    const a = copy.armies[id];
    assert.equal(a.inBattle, null);
    assert.deepEqual(a.link, { from: to, to: from, kind, length, done: length - done });
    assert.equal(a.target, from);
    assert.equal(a.next, null);
    assert.deepEqual(a.path, [from]);
  }
  assert.notEqual(copy.armies[lead.id].link.done, copy.armies[support.id].link.done);
  assert.deepEqual(copy.armies[excluded.id], original[excluded.id]);
});

test('river encounters keep the existing one-versus-one fleet roster', () => {
  const { state, front } = convoy({ from: 'baqiu', to: 'wulin', faction: 'caocao', opponent: 'sunjian', scenario: '208',
    commander: 'caocao', defenders: ['sunquan', 'zhouyu'] });
  marchArmies(state);
  const [{ setup }] = state.inbox;
  assert.equal(setup.kind, 'naval');
  assert.equal(setup.units.length, 2);
  assert.equal(setup.units[1].army, front[0].id);
});

test('ordinary mustering and route orders can bring a spear and bow column into one encounter', () => {
  const state = createGame({ seed: 8, faction: 'liubei', scenario: '184', branch: 'free', command: true });
  const enemy = muster(state, 'yuanshao', 'nanpi', { commander: 'qianzhao', troops: 1000 });
  const spear = muster(state, 'liubei', 'pingyuan', { commander: 'guanyu', troops: 1800, unit: 'spear', target: 'nanpi' });
  const bow = muster(state, 'liubei', 'pingyuan', { commander: 'jianyong', troops: 1500, unit: 'archer', target: 'nanpi' });
  assert(enemy.ok && spear.ok && bow.ok);
  assert(advance(state));
  assert(order(state, enemy.army, 'pingyuan').ok);
  for (let day = 0; day < 8 && !state.inbox.length; day++) assert(advance(state));
  assert.equal(state.inbox.length, 1);
  assert.deepEqual(state.inbox[0].setup.units.map(unit => [unit.army, unit.unit]), [
    [enemy.army, 'spear'], [spear.army, 'spear'], [bow.army, 'archer'],
  ]);
});
