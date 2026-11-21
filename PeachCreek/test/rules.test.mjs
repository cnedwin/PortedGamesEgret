// 规则：一任至少三天（勤快、常来、偶尔来三种玩家，第二任也一样）；同一种子同样结果；离线只按仓廪上限补算；工匠和
// 排队的上限；集市不卖升格要用的货；县城扩建与自由规划；来敌（不设防必败、城防够则胜、鼓声加力）；升格条件和工期；
// 访贤的保底；勘探按顺序找到资源点；升迁带走人才、要求变高。
// The rules: a term lasts at least three days (for keen, regular and casual players, and the second term too); the
// same seed gives the same county; an absence counts only up to the granaries' cap; builders and their queue have a
// limit; markets never sell goods the next rank asks for; expanding and replanning wards; raids (lost with no
// defence, won with enough, the drums add power); what rising a rank needs and how long it takes; the pity on calls
// for worthies; surveys find resource points in order; promotion carries the talents and asks for more.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { HOUR, RANKS, RAIDS, RECRUIT, SURVEY_ORDER, PROMOTION, FINAL_RANK, PETITIONS, SEASONS, TALENTS } = await import('../src/sim/data.mjs');
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
    assert.ok(W.districtsOpen(first.state) > W.CORE_WARDS, 'the simulated magistrate expanded beyond the original town');
    // Every rank comes later than the one before, and the first comes in the first hour.
    assert.ok(first.reached[1] <= 1, `rank 1 at ${first.reached[1]} h`);
    for (let i = 1; i < first.reached.length; i++) assert.ok(first.reached[i] >= first.reached[i - 1]);
    const second = playTerm({ every, after: first.state });
    assert.ok(second.state.termDone, `second term, a visit every ${every / 60} min: the term ends`);
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
  let peak = W.rates(s).tax;
  for (let at = SEASONS.length; at <= 30 * HOUR; at += SEASONS.length) {
    const waiting = s.pendingTax;
    W.advance(s, at, { active: true });
    peak = Math.max(peak, W.rates(s).tax);
    assert.ok(s.pendingTax >= waiting, 'a lean season does not remove earlier taxes');
  }
  assert.ok(s.pendingTax <= peak * 4 + 1, `${s.pendingTax} waiting, peak ${peak}/h`);
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
  s.plots[2 * W.PLOTS_PER_DISTRICT] = { kind: 'market', level: 30 };
  const keep = W.needFor(s, 3).silk;
  s.res.silk = keep + 100;
  W.advance(s, 2 * HOUR, { active: true });
  assert.ok(s.res.silk >= keep, `${s.res.silk} silk, the rank asks ${keep}`);
  assert.ok(s.res.silk < keep + 100, 'the rest was sold');
});

test('all open parcels accept mixed buildings and focus never gates construction', () => {
  const s = rich(fresh());
  assert.equal(s.plots.length, 144);
  assert.equal(s.districts.every((ward) => ward.zone === null), true);
  assert.deepEqual(W.zone(s, 2, 'craft'), {});
  assert.equal(s.districts[2].zone, 'craft');
  assert.deepEqual(W.zone(s, 0, 'farm'), {});
  assert.deepEqual(s.plots[0], { kind: 'house', level: 2 });
  assert.deepEqual(W.zone(s, 0, null), {});
  assert.equal(W.zone(s, 0, 'invalid').why, 'none');
  assert.equal(W.zone(s, 5, 'home').why, 'closed');
  assert.equal(W.canPlace(s, 1, 'paddy'), null);
  assert.equal(W.canPlace(s, 2, 'brewery'), 'rank');
  s.rank = 1;
  assert.equal(s.districts[3].zone, null);
  assert.equal(W.canPlace(s, 3 * W.PLOTS_PER_DISTRICT, 'brewery'), 'closed');
  assert.equal(W.expandWard(s, 3).why, undefined);
  assert.equal(W.canPlace(s, 3 * W.PLOTS_PER_DISTRICT, 'brewery'), null);
  assert.equal(W.canPlace(s, 4 * W.PLOTS_PER_DISTRICT, 'house'), 'closed');
  s.rank = 4;
  assert.equal(W.canPlace(s, 1, 'dock'), 'river');
  assert.equal(W.expandWard(s, 5).why, undefined);
  assert.equal(W.canPlace(s, 5 * W.PLOTS_PER_DISTRICT, 'dock'), 'river');
  const bank = [...W.RIVERSIDE][0];
  assert.equal(W.canPlace(s, bank, 'dock'), 'closed');
  assert.equal(W.expandWard(s, 10).why, undefined);
  assert.equal(W.canPlace(s, bank, 'dock'), null);
  assert.ok(W.plotPlan(s, bank, 'dock').multiplier > W.plotPlan(s, 1, 'dock').multiplier);
});

test('new docks can be built on only the eight open south-bank plots', () => {
  const s = rich(fresh());
  const bank = [120, 121, 122, 123, 132, 133, 134, 135];
  assert.deepEqual([...W.RIVERSIDE], bank);
  s.rank = 4;
  for (const ward of [3, 5, 10, 11]) assert.ok(!W.expandWard(s, ward).why);
  for (let key = 0; key < s.plots.length; key++) {
    const target = { type: 'plot', key, kind: 'dock' };
    assert.equal(W.canPlace(s, key, 'dock'), bank.includes(key) ? null : 'river');
    assert.equal(W.quote(s, target).why, bank.includes(key) ? null : 'river');
  }
  const before = structuredClone(s);
  assert.equal(W.upgrade(s, { type: 'plot', key: 69, kind: 'dock' }).why, 'river');
  assert.equal(W.upgrade(s, { type: 'plot', key: 124, kind: 'dock' }).why, 'river');
  assert.deepEqual(s, before);
  assert.ok(W.upgrade(s, { type: 'plot', key: 132, kind: 'dock' }).work);
});

test('falling back from a failed dock relocation preserves the county, and migration keeps active and queued work', () => {
  const s = rich(fresh());
  s.rank = 4;
  const old = 15, second = 18;
  s.plots[old] = { kind: 'dock', level: 2 };
  s.plots[second] = { kind: 'dock', level: 0 };
  s.talents.push({ id: 'suShi', level: 1, exp: 0, stars: 1, post: { type: 'plot', key: old } });
  const active = { type: 'plot', key: old, level: 3, starts: 0, ends: 100, duration: 100 };
  const queued = { type: 'plot', key: second, level: 1, starts: null, ends: null, duration: 50 };
  s.works.push(active, queued);
  s.log.push({ at: 0, type: 'done', work: { type: 'plot', key: old, level: 2 } });
  assert.ok(W.rates(s).export > 0);
  const closed = structuredClone(s);
  assert.equal(W.moveDock(s, old, 120).why, 'closed');
  assert.deepEqual(s, closed);
  assert.ok(!W.expandWard(s, 3).why);
  assert.ok(!W.expandWard(s, 10).why);
  s.plots[121] = { kind: 'house', level: 1 };
  const before = structuredClone(s);
  assert.equal(W.quote(s, { type: 'plot', key: old }).why, 'river');
  assert.equal(W.upgrade(s, { type: 'plot', key: old }).why, 'river');
  assert.equal(W.upgrade(s, { type: 'plot', key: old, kind: 'house' }).why, 'river');
  assert.equal(W.moveDock(s, old, 121).why, 'taken');
  assert.equal(W.moveDock(s, old, 122.5).why, 'none');
  assert.equal(W.moveDock(s, old, 124).why, 'river');
  assert.equal(W.moveDock(s, 0, 120).why, 'none');
  assert.deepEqual(s, before);
  assert.deepEqual(W.moveDock(s, old, 120), {});
  assert.deepEqual(W.moveDock(s, second, 122), {});
  assert.equal(W.moveDock(s, 120, 123).why, 'none');
  assert.deepEqual(s.res, before.res);
  assert.deepEqual(s.plots[old], { kind: null, level: 0 });
  assert.deepEqual(s.plots[second], { kind: null, level: 0 });
  assert.deepEqual(s.plots[120], { kind: 'dock', level: 2 });
  assert.deepEqual(s.plots[122], { kind: 'dock', level: 0 });
  assert.deepEqual(s.works, [{ ...before.works[0], key: 120 }, { ...before.works[1], key: 122 }]);
  assert.deepEqual(s.talents[0].post, { type: 'plot', key: 120 });
  assert.deepEqual(s.log[0].work, { type: 'plot', key: old, level: 2, kind: 'dock' });
  W.advance(s, 120);
  assert.equal(s.plots[120].level, 3);
  assert.equal(s.plots[122].level, 1);
});

test('acquire either flank first, go farther through adjacent wards, and pay only once', () => {
  const s = fresh();
  assert.equal(W.districtsOpen(s), 3);
  assert.equal(W.expansionQuote(s, 10).why, 'adjacent');
  assert.equal(W.expansionQuote(s, 6).why, undefined);
  assert.equal(W.expansionQuote(s, 8).why, undefined);
  const initial = { ...s.res };
  const east = W.expandWard(s, 8);
  assert.deepEqual(east.cost, { coin: 360, wood: 65 });
  assert.equal(s.res.coin, initial.coin - east.cost.coin);
  assert.equal(s.res.wood, initial.wood - east.cost.wood);
  assert.equal(W.wardIsOpen(s, 8), true);
  assert.equal(W.wardIsOpen(s, 3), false);
  assert.equal(W.wardIsOpen(s, 6), false);
  assert.equal(W.canPlace(s, 8 * W.PLOTS_PER_DISTRICT, 'house'), null);
  assert.equal(W.expansionQuote(s, 9).why, 'cost');
  const short = { ...s.res };
  assert.equal(W.expandWard(s, 8).why, 'open');
  assert.equal(W.expandWard(s, 9).why, 'cost');
  assert.equal(W.expandWard(s, -1).why, 'none');
  assert.deepEqual(s.res, short);
  rich(s);
  assert.equal(W.expandWard(s, 9).why, undefined);
  assert.equal(W.expandWard(s, 3).why, undefined);
  assert.equal(W.expandWard(s, 10).why, undefined);
  assert.equal(W.wardIsOpen(s, 4), false);
});

test('shops benefit from the yamen and farms from open land without a planting restriction', () => {
  const s = fresh();
  const highStreet = W.PLOTS_PER_DISTRICT + 2;
  const easternEdge = 2 * W.PLOTS_PER_DISTRICT + W.PLOT_COLS - 1;
  assert.equal(W.wardRecommendation(1), 'market');
  assert.equal(W.wardRecommendation(2), 'farm');
  assert.equal(W.wardRecommendation(4), null);
  assert.equal(s.plots[easternEdge].kind, 'paddy');
  assert.equal(W.canPlace(s, highStreet, 'paddy'), null);
  assert.equal(W.canPlace(s, easternEdge + W.PLOT_COLS, 'market'), null);
  assert.ok(W.plotPlan(s, highStreet, 'market').multiplier > W.plotPlan(s, easternEdge, 'market').multiplier);
  assert.ok(W.plotPlan(s, easternEdge, 'paddy').multiplier > W.plotPlan(s, highStreet, 'paddy').multiplier);
});

test('a short year changes crops, visitors, trade and county workshops in their seasons', () => {
  const s = fresh();
  s.plots[W.PLOTS_PER_DISTRICT] = { kind: 'market', level: 1 };
  s.plots[W.PLOTS_PER_DISTRICT + 1] = { kind: 'teahouse', level: 1 };
  s.plots[2] = { kind: 'brewery', level: 1 };
  const actual = SEASONS.effects.map((_, season) => {
    s.time = s.started + SEASONS.length * season;
    assert.equal(W.seasonInfo(s).season, season);
    assert.equal(W.seasonInfo(s).remaining, SEASONS.length);
    assert.equal(W.seasonInfo(s).next, (season + 1) % SEASONS.effects.length);
    return { rates: W.rates(s), life: W.livelihood(s) };
  });
  assert.ok(actual[3].rates.make.grain < actual[2].rates.make.grain);
  assert.ok(actual[2].rates.sell > actual[0].rates.sell);
  assert.ok(actual[2].rates.coin > actual[3].rates.coin);
  assert.ok(actual[3].rates.make.wine > actual[0].rates.make.wine);
  assert.ok(actual[0].rates.make.wood > actual[1].rates.make.wood);
  assert.ok(actual[0].life > actual[3].life);
  s.time = SEASONS.length * SEASONS.effects.length - 1;
  assert.equal(W.seasonInfo(s).remaining, 1);
  W.advance(s, s.time + 1);
  assert.equal(W.seasonOf(s), 0);
});

test('the first petition is an active choice before the first promotion and leaves an affordable answer', () => {
  const a = fresh(), b = fresh();
  assert.equal(W.advance(a, PETITIONS.first - 1).petitions, 0);
  assert.equal(W.advance(a, PETITIONS.first).petitions, 1);
  assert.equal(W.advance(b, PETITIONS.first).petitions, 1);
  assert.deepEqual(a.petition, { id: 'seedFair', at: PETITIONS.first, season: 0 });
  assert.equal(a.rank, 0);
  const buy = W.petitionOffer(a, 'a');
  const talk = W.petitionOffer(b, 'b');
  assert.ok(buy.delta.coin < 0 && buy.delta.grain > 0);
  assert.ok(talk.delta.fame > 0 && talk.life > 0);
  const { coin, grain } = a.res;
  assert.ok(!W.answer(a, 'a').why);
  assert.equal(a.res.coin, coin + buy.delta.coin);
  assert.equal(a.res.grain, grain + buy.delta.grain);
  b.res.coin = 0;
  assert.equal(W.petitionOffer(b, 'a').why, 'cost');
  assert.equal(W.answer(b, 'a').why, 'cost');
  assert.equal(b.petition.id, 'seedFair');
  assert.ok(!W.answer(b, 'b').why);
  assert.equal(b.fame, talk.delta.fame);
  assert.equal(b.moods[0].until, b.time + talk.duration);
  assert.equal(W.answer(a, 'a').why, 'none');
});

test('seasonal petitions use their own seed, skip recent events and keep one pending on return', () => {
  const play = (useRecruit) => {
    const s = rich(fresh(701));
    s.rank = 3;
    const seen = [];
    for (let i = 0; i < 18; i++) {
      if (useRecruit) W.recruit(s);
      const report = W.advance(s, s.nextPetition, { active: false });
      assert.equal(report.petitions, 1);
      const spec = PETITIONS.list.find(({ id }) => id === s.petition.id);
      assert.ok(spec.seasons.includes(s.petition.season));
      assert.ok(!seen.slice(-3).includes(spec.id), `recent petition repeated: ${spec.id}`);
      seen.push(spec.id);
      W.answer(s, 'a');
    }
    return seen;
  };
  assert.deepEqual(play(false), play(true));
  assert.ok(new Set(play(false)).size > 7);
  const late = fresh();
  assert.equal(W.advance(late, 8 * HOUR, { active: false }).petitions, 1);
  assert.equal(W.advance(late, 12 * HOUR, { active: false }).petitions, 0);
  assert.equal(late.petition.id, 'seedFair');
  W.answer(late, 'b');
  assert.ok(late.nextPetition > late.time);
});

test('a new magistrate can buy land, build and handle a petition in the first twenty minutes', () => {
  const s = fresh();
  const field = 8 * W.PLOTS_PER_DISTRICT;
  assert.ok(!W.expandWard(s, 8).why);
  for (const build of [
    { type: 'plot', key: 1, kind: 'house' },
    { type: 'plot', key: field, kind: 'paddy' },
    { type: 'plot', key: W.PLOTS_PER_DISTRICT + 2, kind: 'market' },
    { type: 'node', key: 0 }
  ]) assert.ok(W.upgrade(s, build).work);
  assert.equal(W.advance(s, 90).works.length, 4);
  assert.ok(W.collectTax(s) > 0);
  while (W.claimGoal(s)) continue;
  assert.equal(s.goal, 5, 'the five opening goals can finish before the first petition');
  const grain = s.res.grain;
  assert.equal(W.advance(s, PETITIONS.first).petitions, 1);
  assert.ok(!W.answer(s, 'a').why);
  assert.ok(s.res.grain > grain);
  for (const key of [2, 4, 5]) assert.ok(W.upgrade(s, { type: 'plot', key, kind: 'house' }).work);
  W.advance(s, 20 * 60);
  assert.ok(W.rates(s).house >= 100);
  assert.ok(s.pop > 60);
  assert.ok(s.res.grain >= 2 * W.rates(s).use.grain);
  assert.ok(s.life >= 45);
});

test('a nearby supplier lowers upkeep and smoky industry away from homes protects livelihood', () => {
  const make = (rank, brewery) => {
    const s = fresh();
    s.rank = rank;
    s.districts.forEach((ward) => { ward.zone = null; });
    s.plots.forEach((_, i) => { s.plots[i] = { kind: null, level: 0 }; });
    s.plots[0] = { kind: 'house', level: 4 };
    s.plots[70] = { kind: 'paddy', level: 12 };
    s.plots[brewery] = { kind: 'brewery', level: 12 };
    return s;
  };
  const good = make(5, 69), bad = make(5, 1);
  const goodRates = W.rates(good), badRates = W.rates(bad);
  assert.ok(goodRates.make.wine > badRates.make.wine * 1.3);
  assert.ok(goodRates.planning.upkeep < badRates.planning.upkeep);
  assert.ok(W.livelihood(good, goodRates) > W.livelihood(bad, badRates));
  assert.ok(W.plotPlan(bad, 1).access < W.plotPlan(make(1, 1), 1).access);
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
  strong.defence.wall.fill(10);
  strong.defence.tower.fill(8);
  strong.raid.next = strong.time + 10;
  const coin = strong.res.coin;
  W.advance(strong, strong.time + 20, { active: true });
  assert.equal(strong.raid.last.won, true);
  assert.ok(strong.res.coin > coin);
  assert.equal(strong.raid.last.side, (strong.seed >>> 0) % W.SIDES.length);

  const drummed = fresh();
  drummed.raid.next = drummed.time + 2 * HOUR;
  assert.equal(W.drums(drummed).why, 'not-now');
  const plain = W.defencePower(drummed);
  drummed.raid.next = drummed.time + RAIDS.warn;
  assert.deepEqual(W.drums(drummed), {});
  drummed.defence.wall.fill(3);
  plain === 0 || assert.ok(W.defencePower(drummed) > plain);
  const without = { ...drummed, raid: { ...drummed.raid, drums: false } };
  assert.ok(W.defencePower(drummed) > W.defencePower(without));
});

test('walls, gates and troop deployments defend only their own side', () => {
  const s = rich(fresh());
  assert.equal(W.stationTroops(s, 0, 1).why, 'rank');
  s.rank = 2;
  assert.ok(W.upgrade(s, { type: 'wall', key: 0 }).work);
  assert.ok(W.upgrade(s, { type: 'tower', key: 1 }).work);
  W.advance(s, 10 * 60);
  assert.deepEqual(s.defence.wall, [1, 0, 0, 0]);
  assert.deepEqual(s.defence.tower, [0, 1, 0, 0]);
  assert.deepEqual(W.stationTroops(s, 0, W.troopCapacity(s)), {});
  assert.equal(W.stationTroops(s, 1, 1).why, 'troops');
  assert.ok(W.defencePower(s, 0) > W.defencePower(s, 1));
  assert.deepEqual(W.stationTroops(s, 0, 0), {});
  assert.deepEqual(W.stationTroops(s, 1, W.troopCapacity(s)), {});
  assert.ok(W.defencePower(s, 1) > W.defencePower(s, 0));
  assert.equal(W.defencePower(s), W.defencePower(s, W.raidSide(s)));
});

test('rising a rank needs people, livelihood and goods and leaves ward expansion to the player', () => {
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
  assert.equal(W.districtsOpen(s), W.STARTING_WARDS);
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
