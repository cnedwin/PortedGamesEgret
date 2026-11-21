// 规则：一任至少三天（勤快、常来、偶尔来三种玩家，第二任也一样）；同一种子同样结果；离线只按仓廪上限补算；工匠和
// 排队的上限；集市不卖升格要用的货；坊区一旦建了房就不能改；来敌（不设防必败、城防够则胜、鼓声加力）；升格条件和工期；
// 访贤的保底；勘探按顺序找到资源点；升迁带走人才、要求变高。
// The rules: a term lasts at least three days (for keen, regular and casual players, and the second term too); the
// same seed gives the same county; an absence counts only up to the granaries' cap; builders and their queue have a
// limit; markets never sell goods the next rank asks for; a ward cannot be replanned once built on; raids (lost with no
// defence, won with enough, the drums add power); what rising a rank needs and how long it takes; the pity on calls
// for worthies; surveys find resource points in order; promotion carries the talents and asks for more.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { HOUR, RANKS, RAIDS, RECRUIT, SURVEY_ORDER, PROMOTION, FINAL_RANK, TALENTS } = await import('../src/sim/data.mjs');
const W = await import('../src/sim/world.mjs');
const { playTerm, HABITS } = await import('../tools/pacing.mjs');

const fresh = (seed = 1) => W.createCounty({ seed, now: 0 });
const rich = (state) => {
  for (const key of Object.keys(state.res)) state.res[key] = 1e9;
  state.fame = 1e9;
  return state;
};

test('a term takes at least three days for every kind of player, the second term too', () => {
  for (const every of Object.values(HABITS)) {
    const first = playTerm({ every });
    assert.ok(first.state.termDone, `a visit every ${every / 60} min: the term ends`);
    assert.ok(first.hours >= 72, `a visit every ${every / 60} min: ${first.hours.toFixed(1)} h`);
    assert.ok(first.hours <= 10 * 24, `a visit every ${every / 60} min: not endless`);
    // Every rank comes later than the one before, and the first comes in the first hour.
    assert.ok(first.reached[1] <= 1, `rank 1 at ${first.reached[1]} h`);
    for (let i = 1; i < first.reached.length; i++) assert.ok(first.reached[i] >= first.reached[i - 1]);
    const second = playTerm({ every, after: first.state });
    assert.ok(second.hours >= 72, `second term, a visit every ${every / 60} min: ${second.hours.toFixed(1)} h`);
  }
});

test('the same seed gives the same county', () => {
  const a = playTerm({ every: HABITS.regular, limit: 30 * HOUR }),
    b = playTerm({ every: HABITS.regular, limit: 30 * HOUR });
  assert.deepEqual(JSON.parse(JSON.stringify(a.state)), JSON.parse(JSON.stringify(b.state)));
});

test('an absence counts only up to the cap, and granaries raise the cap', () => {
  const away = fresh(),
    open = fresh();
  W.advance(away, 24 * HOUR, { active: false });
  W.advance(open, W.offlineCap(open), { active: true });
  // A day away makes no more grain than the four hours the cap allows (time and works still pass).
  assert.equal(W.offlineCap(fresh()), 4 * HOUR);
  assert.ok(Math.abs(away.res.wood - open.res.wood) / open.res.wood < 0.05, `${away.res.wood} vs ${open.res.wood}`);
  const stored = fresh();
  stored.plots[1] = { kind: 'granary', level: 4 };
  assert.equal(W.offlineCap(stored), 6 * HOUR);
  stored.plots[2] = { kind: 'granary', level: 40 };
  assert.equal(W.offlineCap(stored), 16 * HOUR);
});

test('taxes wait at the yamen up to the cap and go to the treasury when collected', () => {
  const s = fresh();
  W.advance(s, 30 * HOUR, { active: true });
  const rate = W.rates(s).tax;
  assert.ok(s.pendingTax <= rate * 4 + 1, `${s.pendingTax} waiting, ${rate}/h`);
  const coin = s.res.coin,
    got = W.collectTax(s);
  assert.ok(got > 0);
  assert.equal(s.res.coin, coin + got);
  assert.ok(s.pendingTax < 1);
});

test('builders work in parallel and each keeps a short queue', () => {
  const s = rich(fresh());
  const all = W.builders(s) * (1 + W.QUEUE_PER_BUILDER);
  let placed = 0;
  for (let key = 1; key < 8 && placed < all + 2; key++) {
    const r = W.upgrade(s, { type: 'plot', key, kind: 'house' });
    if (!r.why) placed++;
    else assert.equal(r.why, 'builders');
  }
  for (let key = 9; key < 16; key++) if (!W.upgrade(s, { type: 'plot', key, kind: 'paddy' }).why) placed++;
  assert.equal(placed, all);
  assert.equal(W.busy(s), W.builders(s));
  assert.equal(W.queued(s), all - W.builders(s));
  // When the first works finish the queue moves up.
  W.advance(s, 3 * HOUR, { active: true });
  assert.equal(s.works.length, 0);
  assert.equal(s.plots.filter((p) => p.kind === 'house' && p.level >= 1).length, 1 + s.plots.slice(1, 8).filter((p) => p.kind).length);
});

test('markets never sell goods the next rank asks for', () => {
  const s = fresh();
  s.rank = 2;
  s.districts[2].zone = 'market';
  s.plots[16] = { kind: 'market', level: 30 };
  const keep = W.needFor(s, 3).silk;
  s.res.silk = keep + 100;
  W.advance(s, 2 * HOUR, { active: true });
  assert.ok(s.res.silk >= keep, `${s.res.silk} silk, the rank asks ${keep}`);
  assert.ok(s.res.silk < keep + 100, 'the rest was sold');
});

test('a ward can be planned until something is built in it', () => {
  const s = fresh();
  assert.deepEqual(W.zone(s, 2, 'craft'), {});
  assert.equal(s.districts[2].zone, 'craft');
  assert.equal(W.zone(s, 0, 'farm').why, 'built');
  assert.equal(W.zone(s, 5, 'home').why, 'closed');
  // Buildings go only in their own kind of ward, and the dock only by the river.
  assert.equal(W.canPlace(s, 1, 'paddy'), 'zone');
  s.rank = 1;
  s.districts[4].zone = 'market';
  assert.equal(W.canPlace(s, 36, 'dock'), 'closed');
  s.rank = 4;
  assert.equal(W.canPlace(s, 33, 'dock'), 'river');
  assert.equal(W.canPlace(s, 36, 'dock'), null);
});

test('raids: lost with no defence, won with enough, and the drums add power', () => {
  const s = fresh();
  s.rank = 2;
  s.pop = 400;
  s.raid.next = s.time + 10;
  W.advance(s, s.time + 20, { active: true });
  assert.equal(s.raid.n, 1);
  assert.equal(s.raid.last.won, false);
  assert.ok(Object.values(s.raid.last.lost).some((v) => v > 0));
  assert.ok(s.moods.some((m) => m.why === 'raid'));
  assert.equal(s.raid.next, s.raid.last.at + RAIDS.every);

  const strong = fresh();
  strong.rank = 2;
  strong.pop = 400;
  strong.defence = { wall: 10, tower: [8, 8, 8, 8], camp: 0 };
  strong.raid.next = strong.time + 10;
  const coin = strong.res.coin;
  W.advance(strong, strong.time + 20, { active: true });
  assert.equal(strong.raid.last.won, true);
  assert.ok(strong.res.coin > coin);

  const drummed = fresh();
  drummed.raid.next = drummed.time + 2 * HOUR;
  assert.equal(W.drums(drummed).why, 'not-now');
  const plain = W.defencePower(drummed);
  drummed.raid.next = drummed.time + RAIDS.warn;
  assert.deepEqual(W.drums(drummed), {});
  drummed.defence.wall = 3;
  plain === 0 || assert.ok(W.defencePower(drummed) > plain);
  const without = { ...drummed, raid: { ...drummed.raid, drums: false } };
  assert.ok(W.defencePower(drummed) > W.defencePower(without));
});

test('rising a rank needs people, livelihood and goods, takes its time and opens more', () => {
  const s = fresh();
  assert.equal(W.rankUp(s).why, 'pop');
  rich(s);
  s.pop = 1e6;
  s.life = 90;
  const coin = s.res.coin;
  const { work } = W.rankUp(s);
  assert.ok(work);
  assert.equal(s.res.coin, coin - W.needFor({ ...s, rank: 0 }, 1).coin);
  assert.equal(W.rankUp(s).why, 'working');
  W.advance(s, s.time + RANKS[1].time - 5, { active: true });
  assert.equal(s.rank, 0);
  W.advance(s, s.time + 10, { active: true });
  assert.equal(s.rank, 1);
  assert.equal(W.districtsOpen(s), RANKS[1].districts);
  assert.equal(W.maxLevel(s), RANKS[1].maxLevel);
});

test('a worthy or a hero comes at least once in every run of calls the pity allows', () => {
  const s = rich(fresh(9));
  let since = 0,
    longest = 0;
  for (let i = 0; i < 200; i++) {
    s.fame = 1e40;
    const { talent } = W.recruit(s);
    const rarity = TALENTS.find((t) => t.id === talent.id).rarity;
    since = rarity === 'worthy' || rarity === 'hero' ? 0 : since + 1;
    longest = Math.max(longest, since);
  }
  assert.ok(longest < RECRUIT.pity, `${longest} calls without a worthy`);
  // Calls cost more fame each time.
  assert.ok(W.recruitPrice(s) > RECRUIT.fame(0));
});

test('surveys find the resource points in their order, one at a time', () => {
  const s = rich(fresh());
  s.rank = 6;
  assert.ok(W.survey(s).work);
  assert.equal(W.survey(s).why, 'working');
  W.advance(s, s.time + 12 * HOUR, { active: true });
  assert.equal(s.nodes[1].found, true);
  assert.equal(s.nodes[1].kind, SURVEY_ORDER[1]);
  assert.equal(s.nodes[2].found, false);
});

test('promotion needs the last rank, carries the talents and asks for more', () => {
  const s = fresh();
  assert.equal(W.promote(s, 100), null);
  s.rank = FINAL_RANK;
  s.termDone = true;
  s.talents.push({ id: 'suShi', level: 7, exp: 0, stars: 2, post: { type: 'office', key: 'deputy' } });
  const next = W.promote(s, 100);
  assert.equal(next.term, 1);
  assert.equal(next.rank, 0);
  assert.equal(next.talents[0].level, 7);
  assert.equal(next.talents[0].post, null);
  assert.equal(W.needFor(next, 1).coin, Math.round(RANKS[1].need.coin * (1 + PROMOTION.grow)));
});

test('a saved county survives the trip through JSON and goes on the same', () => {
  const a = playTerm({ every: HABITS.keen, limit: 20 * HOUR }).state,
    b = JSON.parse(JSON.stringify(a));
  W.advance(a, a.time + 5 * HOUR, { active: false });
  W.advance(b, b.time + 5 * HOUR, { active: false });
  assert.deepEqual(JSON.parse(JSON.stringify(a)), b);
});
