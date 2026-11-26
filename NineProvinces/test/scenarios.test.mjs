import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, advance, power } from '../src/sim/world.mjs';
import { dateOf, stat } from '../src/sim/core.mjs';
import { GENERALS } from '../src/data/generals.mjs';

test('later starts are distinct dated worlds, with no retroactive story inbox', () => {
  for (const year of [190, 200, 208, 219]) {
    const s = createGame({ scenario: String(year), faction: 'caocao', branch: 'caocao', seed: 17 });
    assert.equal(dateOf(s.day).year, year);
    assert.equal(s.scenario, String(year));
    assert.equal(s.startedDay, s.day);
    assert.equal(s.branch, 'free');
    assert.deepEqual(s.inbox, []);
    assert.ok(s.factions[s.player]?.alive);
    for (const f of Object.values(s.factions).filter(f => f.alive)) {
      assert.equal(s.nodes[f.capital]?.owner, f.id, year + ': ' + f.id + ' capital');
      assert.equal(s.generals[f.ruler]?.faction, f.id, year + ': ' + f.id + ' ruler');
      assert.equal(s.generals[f.ruler]?.status, 'serving');
    }
    for (const [id, officer] of Object.entries(s.generals)) {
      if (officer.status !== 'serving') continue;
      assert.ok(s.factions[officer.faction]?.alive, id + ' serves defeated faction');
      assert.equal(s.nodes[officer.at]?.owner, officer.faction, id + ' outside own territory');
      assert.ok(GENERALS[id].born + 15 <= year, id + ' under age');
    }
  }
});

test('coalition, Guandu, Red Cliffs and Hanzhong have their own fronts and rulers', () => {
  const coalition = createGame({ scenario: '190' });
  assert.equal(coalition.nodes.luoyang.owner, 'dongzhuo');
  assert.equal(coalition.factions.han.alive, false);
  assert.equal(coalition.factions.caocao.treaties.yuanshao.kind, 'ally');
  const guandu = createGame({ scenario: '200' });
  assert.equal(guandu.nodes.ye.owner, 'yuanshao');
  assert.equal(guandu.nodes.xuchang.owner, 'caocao');
  assert.equal(guandu.factions.sunjian.ruler, 'sunce');
  assert.equal(guandu.generals.dianwei.status, 'dead');
  assert.equal(guandu.generals.zhanghe.faction, 'yuanshao');
  assert.ok(power(guandu,'yuanshao').troops > power(guandu,'caocao').troops);
  const chibi = createGame({ scenario: '208', faction: 'liubei' });
  assert.equal(chibi.factions.sunjian.ruler, 'sunquan');
  assert.equal(chibi.nodes.xiangyang.owner, 'caocao');
  assert.equal(chibi.generals.zhugeliang.faction, 'liubei');
  assert.equal(chibi.factions.liubei.treaties.sunjian.kind, 'ally');
  const hanzhong = createGame({ scenario: '219', faction: 'liubei' });
  assert.equal(hanzhong.nodes.hanzhong.owner, 'liubei');
  assert.equal(hanzhong.nodes.chengdu.owner, 'liubei');
  assert.equal(hanzhong.nodes.jiangling.owner, 'liubei');
  assert.equal(hanzhong.factions.liuyan.alive, false);
});

test('184 preserves original time and scripts; later starts do not mutate historical master data', () => {
  const before = JSON.stringify(GENERALS.caocao);
  createGame({ scenario: '219' });
  const s = createGame({ seed: 9, branch: 'liubei', faction: 'liubei' });
  assert.deepEqual(dateOf(s.day), { year: 184, month: 2, day: 1 });
  assert.equal(s.branch, 'liubei');
  assert.equal(s.nodes.qiao.owner, 'caocao');
  assert.equal(JSON.stringify(GENERALS.caocao), before);
});

test('age adjustment is moderate, state-specific and preserves elder expertise', () => {
  const s = createGame({ scenario: '219' });
  assert.ok(s.generals.huangzhong.statAdjust.war < 0);
  assert.equal(s.generals.huangzhong.statAdjust.int, 0);
  s.generals.huangzhong.treasures=[];
  assert.equal(stat(s,'huangzhong','war'),GENERALS.huangzhong.stats.war+s.generals.huangzhong.statAdjust.war);
  assert.ok(stat(s, 'huangzhong', 'war') >= 80);
  const old = createGame();
  assert.equal(old.generals.huangzhong.statAdjust, undefined);
});

test('new starts remain deterministic and advance without stale faction/officer references', () => {
  for (const scenario of ['190', '200', '208', '219']) {
    const play = () => {
      const s = createGame({ scenario, faction: 'caocao', command: false, seed: 86 });
      for (let n = 0; n < 65; n++) { s.inbox = []; advance(s); }
      return JSON.parse(JSON.stringify(s));
    };
    assert.deepEqual(play(), play());
  }
});
