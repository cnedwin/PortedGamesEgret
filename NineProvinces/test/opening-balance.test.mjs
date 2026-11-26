import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, income, upkeep, power } from '../src/sim/world.mjs';
import { serving } from '../src/sim/core.mjs';
import { customFactionOptions } from '../src/sim/custom-faction.mjs';
import { hostile } from '../src/sim/military.mjs';
import { breakTreaty } from '../src/sim/diplomacy.mjs';

test('the one-town 208 Liu Bei opening does not pre-hire the later Shu court into a salary trap', () => {
  const s = createGame({ scenario: '208', faction: 'liubei', seed: 7 });
  const monthlyCoin = Object.entries(s.nodes).filter(([, node]) => node.owner === 'liubei')
    .reduce((total, [id]) => total + income(s, id).coin, 0);
  assert.ok(serving(s, 'liubei').length <= 20);
  assert.ok(monthlyCoin - upkeep(s, 'liubei').coin >= -100);
  for (const id of ['guanyu', 'zhangfei', 'zhaoyun', 'zhugeliang', 'mizhu', 'mifang', 'sunqian', 'jianyong', 'liuqi', 'chendao', 'guanping', 'liufeng', 'yiji']) {
    assert.equal(s.generals[id].faction, 'liubei', id + ' is an opening companion');
  }
  for (const id of ['qinmi', 'yanghong2', 'zhangyi', 'gaoxiang', 'puyuan', 'wangping', 'mazhong', 'zhangni']) {
    assert.equal(s.generals[id].status, 'free', id + ' remains available rather than prematurely hired');
  }
});

test('an alternate founding uses a finite withdrawal truce with its former owner, not blanket immunity', () => {
  const base = createGame({ scenario: '219' });
  const town = customFactionOptions(base).towns.find(n => n.id === 'cangwu');
  const s = createGame({ scenario: '219', customFaction: { zh: '青岚军', en: 'Azure', flag: '岚', colour: 0x85643f,
    town: town.id, ruler: 'history:guanyu', companions: [] } });
  assert.equal(s.factions.player.treaties.shixie?.until - s.day, 540);
  assert.deepEqual(s.factions.player.treaties.shixie, s.factions.shixie.treaties.player);
  assert.equal(hostile(s, 'player', 'shixie'), false);
  assert.equal(hostile(s, 'player', 'caocao'), true);
  const expiry = s.factions.player.treaties.shixie.until;
  s.day = expiry;
  assert.equal(hostile(s, 'player', 'shixie'), true);
  s.day = expiry - 1;
  assert.ok(breakTreaty(s, 'player', 'shixie').ok);
  assert.equal(hostile(s, 'player', 'shixie'), true);
  const ordinary = createGame({ scenario: '219' });
  assert.equal(ordinary.factions.player, undefined);
  const vacant = createGame({ customFaction: { zh: '青岚军', en: 'Azure', flag: '岚', colour: 0x85643f,
    town: 'hedong', ruler: 'history:guanyu', companions: [] } });
  assert.deepEqual(vacant.factions.player.treaties, {});
});

test('the 200 custom default offers the tested quieter Baxi foothold while retaining high-pressure Anding', () => {
  const s = createGame({ scenario: '200' });
  const before = JSON.stringify(s.nodes);
  const options = customFactionOptions(s);
  assert.equal(options.towns[0].id, 'baxi');
  assert.equal(options.towns[0].recommended, true);
  assert.ok(options.towns.some(town => town.id === 'anding'));
  assert.equal(JSON.stringify(s.nodes), before);
});

test('the 208 custom default offers Lingling without removing the more exposed Changsha challenge', () => {
  const s = createGame({ scenario: '208' });
  const options = customFactionOptions(s);
  assert.equal(options.towns[0].id, 'lingling');
  assert.equal(options.towns[0].recommended, true);
  assert.equal(options.alternateHistory, false);
  assert.ok(options.towns.some(town => town.id === 'changsha'));
  assert.equal(s.nodes.wuling.owner, null);
  assert.equal(s.nodes.changsha.owner, null);
});

test('opening fiscal repair preserves historical scenario fronts, allies and late Shu talent', () => {
  const s = createGame({ scenario: '208', faction: 'liubei' });
  assert.equal(power(s, 'liubei').cities, 1);
  assert.equal(s.factions.liubei.coin, 4950);
  assert.equal(s.factions.liubei.treaties.sunjian.kind, 'ally');
  assert.equal(s.factions.liubei.treaties.sunjian.until - s.day, 540);
  assert.ok(power(s, 'caocao').troops > 4 * (power(s, 'sunjian').troops + power(s, 'liubei').troops));
  const late = createGame({ scenario: '219', faction: 'liubei' });
  assert.equal(late.generals.qinmi.faction, 'liubei');
  assert.equal(late.generals.wangping.faction, 'liubei');
  assert.equal(late.nodes.hanzhong.owner, 'liubei');
  const original = createGame({ scenario: '184', faction: 'liubei', branch: 'liubei' });
  assert.equal(original.branch, 'liubei');
  assert.equal(original.generals.qinmi.status, 'unborn');
});
