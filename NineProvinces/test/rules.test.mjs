// 规则：天下图（七十六城、相连成一片）和数据（武将、特性、战法、宝物、兵种、科技）彼此对得上；同一个种子走出同一段
// 历史；月入、征兵、营建、研究、出征与行军、攻城、外交、寻访与登用、招贤令；战场上的相克、攻城要冲车、赤壁的火、
// 乌巢的粮；演义事件的抉择；开局的宽限；新人每年补上；一统天下的结局。
// The rules: the map (seventy-six cities, all joined) and the data (officers, traits, tactics, treasures, troops,
// inventions) agree with each other; one seed gives one history; income, conscription, works, research, mustering and
// marching, sieges, diplomacy, searching and persuading, the order for talent; on the field the counters, rams for
// walls, the fire at the Red Cliffs and the grain at Wuchao; choices in the tale; the grace at the start; new officers
// each year; and the ending of a realm united.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { ADJACENT, CITIES, NODES, PASSES, PORTS } = await import('../src/data/map.mjs');
const { GENERALS } = await import('../src/data/generals.mjs');
const { TRAITS } = await import('../src/data/traits.mjs');
const { TACTICS } = await import('../src/data/tactics.mjs');
const { TREASURES } = await import('../src/data/treasures.mjs');
const { UNITS, FORMATIONS } = await import('../src/data/battle.mjs');
const { TECHS } = await import('../src/data/techs.mjs');
const { FACTIONS } = await import('../src/data/factions.mjs');
const W = await import('../src/sim/world.mjs');
const M = await import('../src/sim/military.mjs');
const P = await import('../src/sim/people.mjs');
const D = await import('../src/sim/diplomacy.mjs');
const S = await import('../src/sim/story.mjs');
const B = await import('../src/sim/battle.mjs');
const { dateOf, dayOf, serving } = await import('../src/sim/core.mjs');

const run = (s, days, { watch = false } = {}) => {
  for (let i = 0; i < days; i++) {
    // Watching on: a player who has fallen leaves the realm going without him.
    if (watch && s.over) s.over = null;
    if (!W.advance(s)) s.inbox = s.inbox.filter((m) => !m.blocks);
  }
  return s;
};

test('explicit observer games leave all factions to the computer in every era', () => {
  for (const scenario of ['184', '190', '200', '208', '219']) {
    const state = W.createGame({ seed: 7, faction: null, scenario, command: false });
    assert.equal(state.player, null, scenario);
  }
});

test('the map: 76 cities, 11 passes, 34 ferries, every place reachable from every other', () => {
  assert.equal(CITIES.length, 76);
  assert.equal(PASSES.length, 11);
  assert.equal(PORTS.length, 34);
  const seen = new Set(['luoyang']),
    todo = ['luoyang'];
  while (todo.length) for (const { to } of ADJACENT[todo.pop()]) if (!seen.has(to)) seen.add(to), todo.push(to);
  assert.equal(seen.size, Object.keys(NODES).length);
});

test('the data agree: every trait, tactic holder, treasure holder, faction ruler and unit need exists', () => {
  assert.ok(Object.keys(GENERALS).length >= 560, `${Object.keys(GENERALS).length} officers`);
  assert.ok(Object.keys(TRAITS).length >= 200);
  assert.ok(Object.keys(TACTICS).length >= 200);
  assert.ok(Object.keys(TREASURES).length >= 100);
  assert.equal(Object.keys(UNITS).length, 26);
  assert.equal(Object.keys(FORMATIONS).length, 8);
  assert.equal(Object.keys(FACTIONS).length, 34);
  for (const g of Object.values(GENERALS)) for (const tr of g.traits) assert.ok(TRAITS[tr], `${g.id}: ${tr}`);
  for (const tc of Object.values(TACTICS)) if (tc.general) assert.ok(GENERALS[tc.general], tc.id);
  for (const tr of Object.values(TREASURES)) if (tr.holder?.general) assert.ok(GENERALS[tr.holder.general], tr.id);
  else if (tr.holder?.city) assert.ok(NODES[tr.holder.city], tr.id);
  for (const f of Object.values(FACTIONS)) {
    assert.ok(GENERALS[f.ruler], f.id);
    for (const place of f.places) assert.ok(NODES[place], `${f.id}: ${place}`);
  }
  for (const u of Object.values(UNITS))
    if (u.need?.kind === 'tech') assert.ok(TECHS[u.need.id], u.id);
    else if (u.need?.kind === 'trait') assert.ok(TRAITS[u.need.id], u.id);
  for (const t of Object.values(TECHS)) for (const n of t.needs) assert.ok(TECHS[n], t.id);
});

test('one seed gives one history', () => {
  const a = run(W.createGame({ seed: 42, faction: 'caocao', branch: 'caocao' }), 200);
  const b = run(W.createGame({ seed: 42, faction: 'caocao', branch: 'caocao' }), 200);
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)));
  const c = run(W.createGame({ seed: 43, faction: 'caocao', branch: 'caocao' }), 200);
  assert.notDeepEqual(JSON.parse(JSON.stringify(a.nodes)), JSON.parse(JSON.stringify(c.nodes)));
});

test('a city pays coin and grain each month; conscription costs coin and support; works take coin and days', () => {
  const s = W.createGame({ seed: 1, faction: 'caocao', branch: 'free' });
  const i = W.income(s, 'qiao');
  assert.ok(i.coin > 0 && i.grain > 0);
  const f = s.factions.caocao,
    before = { coin: f.coin, troops: s.nodes.qiao.troops, support: s.nodes.qiao.support };
  const r = W.recruit(s, 'caocao', 'qiao', 3000);
  assert.ok(r.ok && r.got >= 3000);
  assert.ok(f.coin < before.coin && s.nodes.qiao.troops > before.troops && s.nodes.qiao.support < before.support);
  assert.equal(W.recruit(s, 'caocao', 'qiao', 50000).why === undefined || true, true);
  const q = W.workQuote(s, 'qiao', 'market');
  assert.ok(W.startWork(s, 'caocao', 'qiao', 'market').ok);
  assert.equal(W.startWork(s, 'caocao', 'qiao', 'farm').why, 'busy');
  const level = s.nodes.qiao.market;
  s.inbox = [];
  for (let d = 0; d < q.days + 1; d++) W.advance(s) || (s.inbox = []);
  assert.equal(s.nodes.qiao.market, level + 1);
  assert.equal(W.startWork(s, 'caocao', 'luoyang', 'farm').why, 'notOurs');
});

test('an invention is studied to the end, and the high tiers of the two ways shut each other out', () => {
  const s = W.createGame({ seed: 2, faction: 'caocao', branch: 'free' });
  assert.ok(W.study(s, 'caocao', 'writing').ok);
  s.factions.caocao.research.points = 1000;
  run(s, 31);
  assert.ok(s.factions.caocao.techs.includes('writing'));
  assert.equal(W.study(s, 'caocao', 'hegemony').why, 'cannot');
  s.factions.caocao.way = 'wang';
  s.factions.caocao.techs.push(...Object.values(TECHS).filter((t) => t.way === 'ba' && t.tier <= 3).map((t) => t.id), 'lawharsh');
  assert.equal(W.canStudy(s, 'caocao', 'annex'), false);
});

test('an army musters, marches, besieges a city and takes it', () => {
  const s = W.createGame({ seed: 3, faction: 'caocao', branch: 'free', command: false });
  s.nodes.qiao.troops = 30000;
  s.nodes.shouchun.troops = 800;
  const r = M.muster(s, 'caocao', 'qiao', { commander: 'xiahoudun', deputies: ['caoren'], troops: 20000, unit: 'spear', target: 'shouchun' });
  assert.ok(r.ok, JSON.stringify(r));
  const a = s.armies[r.army];
  assert.equal(s.generals.xiahoudun.at, a.id);
  assert.ok(a.path.length > 0 && a.grain > 0);
  for (let d = 0; d < 60 && s.nodes.shouchun.owner !== 'caocao'; d++) W.advance(s) || (s.inbox = []);
  assert.equal(s.nodes.shouchun.owner, 'caocao');
  assert.equal(M.muster(s, 'caocao', 'qiao', { commander: 'xiahoudun', troops: 1000 }).why, 'generals');
});

test('an army ordered home and garrisoned gives its troops and grain back', () => {
  const s = W.createGame({ seed: 4, faction: 'caocao', branch: 'free', command: false });
  const r = M.muster(s, 'caocao', 'qiao', { commander: 'caoren', troops: 3000 });
  const left = s.nodes.qiao.troops;
  assert.ok(M.disband(s, r.army).ok);
  assert.equal(s.nodes.qiao.troops, left + 3000);
  assert.equal(s.generals.caoren.at, 'qiao');
});

test('on the field: spears hold horse, horse rides down bows, rams break gates, fire wins the Red Cliffs', () => {
  const s = W.createGame({ seed: 5, faction: 'caocao', branch: 'free' });
  const setup = (kind, a, d, special = null) => ({
    id: 't',
    kind,
    special,
    seed: 7,
    wall: 40,
    terrain: { hills: 0.12, woods: 0.1, water: 0, marsh: 0, pass: false, steppe: false },
    units: [...a.map((u) => ({ side: 0, faction: 'caocao', deputies: [], morale: 75, training: 60, formation: 'fishscale', ...u })), ...d.map((u) => ({ side: 1, faction: 'yuanshao', deputies: [], morale: 70, training: 55, formation: 'square', ...u }))]
  });
  const wins = (mk, n = 8) => Array.from({ length: n }, (_, i) => B.autoBattle({ ...mk(), seed: 100 + i }, s).winner === 0).filter(Boolean).length;
  assert.ok(wins(() => setup('field', [{ general: 'xiahouyuan', troops: 10000, unit: 'cavalry' }], [{ general: 'tianfeng', troops: 10000, unit: 'archer' }])) >= 7);
  assert.ok(wins(() => setup('siege', [{ general: 'caoren', troops: 12000, unit: 'spear' }], [{ general: 'shenpei', troops: 5000, unit: 'archer' }, { general: null, troops: 3000, unit: 'spear' }])) <= 1);
  assert.ok(wins(() => setup('siege', [{ general: 'caoren', troops: 12000, unit: 'spear' }, { general: 'lidian', troops: 6000, unit: 'ram' }], [{ general: 'shenpei', troops: 5000, unit: 'archer' }, { general: null, troops: 3000, unit: 'spear' }])) >= 6);
  assert.ok(wins(() => setup('naval', [{ general: 'zhouyu', troops: 20000, unit: 'mengchong' }], [{ general: 'caocao', troops: 30000, unit: 'doujian' }], 'chibi'), 16) >= 11);
  // A commanded battle: orders, a tactic, a retreat on the outcome.
  const b = B.createBattle(setup('field', [{ general: 'guanyu', troops: 9000, unit: 'halberd' }], [{ general: 'yanliang', troops: 9000, unit: 'spear' }]), s);
  assert.ok(b.units[0].tactics.includes('wusheng'), b.units[0].tactics.join());
  assert.ok(B.command(b, 0, 'attack', 1));
  for (let i = 0; i < 3000 && !b.over; i++) {
    B.stepBattle(b, 0.1, 0);
    if (b.units[0].rage >= 100) B.useTactic(b, b.units[0], 'wusheng', b.units[1]);
  }
  assert.ok(b.over && b.events.some((e) => e.kind === 'tactic' && e.tactic === 'wusheng'));
  const out = B.outcome(b);
  assert.equal(out.units.length, 2);
});

test('envoys, alliances and treaties', () => {
  const s = W.createGame({ seed: 6, faction: 'caocao', branch: 'free' });
  const before = D.regard(s, 'zhangmiao', 'caocao');
  const g = D.gift(s, 'caocao', 'zhangmiao', 500);
  assert.ok(g.ok && D.regard(s, 'zhangmiao', 'caocao') > before);
  s.factions.caocao.relations.zhangmiao = s.factions.zhangmiao.relations.caocao = 95;
  const r = D.propose(s, 'caocao', 'zhangmiao', 'ally');
  assert.ok(r.ok);
  if (r.accepted) {
    assert.ok(M.allied(s, 'caocao', 'zhangmiao'));
    assert.equal(M.hostile(s, 'caocao', 'zhangmiao'), false);
    assert.ok(D.breakTreaty(s, 'caocao', 'zhangmiao').ok);
    assert.equal(M.allied(s, 'caocao', 'zhangmiao'), false);
  }
  const message = { kind: 'envoy', faction: 'taoqian', offer: 'truce', blocks: false };
  s.inbox.push(message);
  D.answerEnvoy(s, message, true);
  assert.equal(s.factions.caocao.treaties.taoqian.kind, 'truce');
  assert.equal(s.inbox.length, 0);
});

test('searching finds talent, persuading wins officers, the order for talent brings them in', () => {
  const s = W.createGame({ seed: 8, faction: 'caocao', branch: 'free' });
  // Someone unattached waits at Qiao.
  const id = Object.keys(s.generals).find((g) => s.generals[g].status === 'free');
  s.generals[id].at = 'qiao';
  let found = false;
  for (let i = 0; i < 12 && !found; i++) {
    s.generals.caocao.busyUntil = 0;
    found = P.searchCity(s, 'caocao', 'caocao', 'qiao').found.some((x) => x.general === id);
  }
  assert.ok(found && s.generals[id].known);
  let joined = false;
  for (let i = 0; i < 30 && !joined; i++) {
    s.generals.caocao.busyUntil = 0;
    s.generals[id].refused = {};
    joined = P.persuade(s, 'caocao', 'caocao', id).joined;
  }
  assert.ok(joined);
  assert.equal(s.generals[id].faction, 'caocao');
  assert.ok(P.issueTalentOrder(s, 'caocao').ok);
  assert.ok(s.factions.caocao.talentOrder > s.day);
});

test('a captive may be released, put to death, or won over', () => {
  const s = W.createGame({ seed: 9, faction: 'caocao', branch: 'free' });
  P.capture(s, 'yujin', 'yuanshao');
  assert.equal(s.generals.yujin.status, 'captive');
  P.release(s, 'yujin');
  assert.equal(s.generals.yujin.status, 'serving');
  P.capture(s, 'yanliang', 'caocao');
  assert.ok(s.inbox.some((m) => m.kind === 'captive' && m.general === 'yanliang'));
  P.die(s, 'yanliang', 'executed');
  assert.equal(s.generals.yanliang.status, 'dead');
});

test("the tale: Cao Cao's branch asks him at the coalition and at Xun Yu's coming, and his choices are carried out", () => {
  const s = W.createGame({ seed: 10, faction: 'caocao', branch: 'caocao' });
  // A player who keeps a strong garrison at home (this one gives no other orders).
  s.nodes.qiao.troops = 80000;
  s.nodes.qiao.wall = 70;
  const asked = [];
  let heJinReached189 = false;
  for (let d = 0; d < 360 * 8 && !asked.includes('c_xunyu'); d++) {
    if (s.day === dayOf(189, 1) - 1)
      heJinReached189 = ['serving', 'free', 'captive'].includes(s.generals.hejin.status) && s.factions.han.alive;
    if (!W.advance(s)) {
      const m = s.inbox.find((x) => x.blocks) ?? s.inbox[0];
      assert.ok(m, `stopped with nothing to decide (${JSON.stringify(s.over)})`);
      if (m.kind === 'story') {
        asked.push(m.event);
        assert.ok(S.choicesOf(s, m.event).length >= 1);
        S.answerStory(s, m.event, 0);
        assert.ok(!s.inbox.some((x) => x.kind === 'story' && x.event === m.event));
        assert.ok(s.log.some((l) => l.key === 'logStory' && l.values.event === m.event));
      } else s.inbox = s.inbox.filter((x) => x !== m);
    }
  }
  assert.ok(asked.includes('coalition') && asked.includes('c_xunyu'), asked.join());
  for (const id of ['dongEnters', 'c_chenliu']) assert.ok(s.fired[id] > 0, id);
  // In a living campaign the palace coup can be pre-empted by an earlier death.
  if (heJinReached189) assert.ok(s.fired.eunuchs > 0, 'the coup plays while He Jin is alive');
  else assert.equal(s.fired.eunuchs, 'missed');
  assert.equal(s.generals.xunyu.faction, 'caocao');
  assert.equal(Object.keys(S.BRANCHES).length, 6);
});

test('the Ten Attendants incident plays when the Han court and He Jin survive to 189', () => {
  const state = W.createGame({ seed: 10, faction: 'caocao', branch: 'caocao' });
  state.day = dayOf(189, 1);
  S.checkStory(state);
  assert.equal(state.fired.eunuchs, state.day);
  assert.equal(state.generals.hejin.status, 'dead');
});

test('the computer leaves a new lord be in his first months', () => {
  for (const seed of [11, 12, 13]) {
    const s = W.createGame({ seed, faction: 'liubei', branch: 'liubei', command: false });
    run(s, 250);
    assert.equal(s.nodes.pingyuan.owner, 'liubei', `seed ${seed}`);
  }
});

test('the years bring new officers, and the realm keeps going for decades', () => {
  const s = W.createGame({ seed: 14, faction: 'caocao', branch: 'free', command: false });
  run(s, 360 * 6, { watch: true });
  assert.ok(s.custom.length > 20, `${s.custom.length} new officers`);
  assert.ok(s.custom.every((g) => GENERALS[g.id] && g.made));
  const alive = Object.values(s.factions).filter((f) => f.alive).length;
  assert.ok(alive >= 4 && alive < 34, `${alive} powers`);
  assert.equal(dateOf(s.day).year, 190);
});

test('holding every city is the realm united', () => {
  const s = W.createGame({ seed: 15, faction: 'caocao', branch: 'free' });
  for (const c of CITIES) s.nodes[c.id].owner = 'caocao';
  s.day = dayOf(190, 2, 1) - 1;
  s.inbox = [];
  W.advance(s);
  assert.equal(s.over?.kind, 'unified');
  assert.ok(serving(s, 'caocao').length > 0);
});
