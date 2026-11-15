// Rule tests. Run with `node --test` from this folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as sim from '../src/sim.mjs';
import { HEROINES, HEROINE_IDS } from '../src/data/cast.mjs';
import { CLOTHES, GIFTS, SUPPLIES, SHOPS } from '../src/data/items.mjs';
import { PLACES, DAYS_IN_TERM } from '../src/data/places.mjs';
import { QUESTS } from '../src/data/quests.mjs';
import { CHAPTERS_SCRIPT } from '../src/story/chapters.mjs';
import { CHAT_LINES, GIFT_LINES, DATE_LINES, JEALOUS_LINES } from '../src/story/lines.mjs';
import { ENDINGS, PROLOGUE, FINALE_INTRO, ENDING_SOLO } from '../src/story/scenes.mjs';
import { playTerm } from '../tools/headless.mjs';
import { EVENTS } from '../src/data/events.mjs';
import { PERKS, ACHIEVEMENTS } from '../src/data/memories.mjs';

/** A game in which the hero has already met `girl` and stands beside her. */
function withGirl(girl) {
  const s = sim.newGame();
  s.girls[girl].met = true;
  while (sim.whereIs(s, girl) !== HEROINES[girl].home) sim.advance(s);
  sim.enter(s, HEROINES[girl].home);
  return s;
}

test('a day has four parts and a term has thirty days', () => {
  const s = sim.newGame();
  for (let i = 0; i < 4; i++) sim.advance(s);
  assert.equal(s.day, 2);
  assert.equal(s.slot, 0);
  for (let i = 0; i < DAYS_IN_TERM * 4; i++) sim.advance(s);
  assert.equal(s.finale, true);
  assert.equal(s.day, DAYS_IN_TERM);
});

test('some places close at night', () => {
  const s = sim.newGame();
  s.slot = 3;
  assert.equal(sim.placeOpen(s, 'library'), false);
  assert.equal(sim.placeOpen(s, 'rooftop'), true);
});

test('every senior can be found at her home place at some time of the week', () => {
  for (const id of HEROINE_IDS) {
    const h = HEROINES[id];
    assert.ok([...h.week, ...h.weekend].includes(h.home), id);
    assert.ok(PLACES[h.home], id);
    for (const place of [...h.week, ...h.weekend]) assert.ok(place === null || PLACES[place], `${id}: ${place}`);
  }
});

test('activities change stats, energy and money, and use up the time slot', () => {
  const s = sim.newGame();
  sim.enter(s, 'library');
  const r = sim.act(s, 'library', 'study');
  assert.equal(s.stats.intellect, 13);
  assert.equal(s.energy, 82);
  assert.equal(s.slot, 1);
  assert.deepEqual(r.gain, { intellect: 3 });
  sim.enter(s, 'cafe');
  const money = s.money;
  sim.act(s, 'cafe', 'barista');
  assert.ok(s.money > money);
  s.energy = 5;
  assert.equal(sim.actBlocked(s, PLACES.library.acts[0]), 'energy');
});

test('the push-and-pull gauge rewards the distance each senior likes', () => {
  // Gu Xinglan warms to space; Tang Mi to boldness.
  const a = withGirl('xinglan');
  a.girls.xinglan.pull = -10;
  assert.equal(sim.chat(a, 'xinglan', 'space').zone, 'sweet');
  const b = withGirl('xinglan');
  b.girls.xinglan.pull = 30;
  b.girls.xinglan.aff = 20;
  const pushy = sim.chat(b, 'xinglan', 'closer');
  assert.equal(pushy.zone, 'forward');
  assert.ok(pushy.gain < 0);
  const c = withGirl('tangmi');
  c.girls.tangmi.pull = 10;
  assert.equal(sim.chat(c, 'tangmi', 'closer').zone, 'sweet');
});

test('chatting is limited to once per part of the day, and everyday gains are capped per day', () => {
  const s = withGirl('qingge');
  sim.chat(s, 'qingge', 'steady');
  assert.equal(sim.canChat(s, 'qingge'), false);
  s.bag.tea = 2;
  sim.give(s, 'qingge', 'tea');
  assert.ok(s.girls.qingge.aff <= sim.DAILY_CAP);
  assert.equal(sim.canGift(s, 'qingge'), false);
});

test('presents are judged by her taste', () => {
  assert.equal(sim.giftTaste('qingge', 'tea'), 'love');
  assert.equal(sim.giftTaste('qingge', 'console'), 'hate');
  const s = withGirl('linxia');
  s.girls.linxia.aff = 20;
  s.bag.perfume = 1;
  assert.ok(sim.give(s, 'linxia', 'perfume').gain < 0);
});

test('dates need affection, take the time slot, and hurt a fond senior who sees', () => {
  const s = withGirl('qingge');
  assert.equal(sim.canDate(s, 'qingge'), false); // strangers do not go on dates
  const t = sim.newGame();
  t.girls.bailu.met = true;
  t.girls.bailu.aff = 60;
  t.girls.qingge.met = true;
  t.girls.qingge.aff = 40;
  t.day = 2;
  t.slot = 1; // Tuesday afternoon: Qingge is in the library; move Bai Lu's schedule there too
  HEROINES.bailu.week[1] = 'library';
  sim.enter(t, 'library');
  assert.ok(sim.canDate(t, 'qingge'));
  const r = sim.date(t, 'qingge', 'gate');
  HEROINES.bailu.week[1] = 'classroom';
  assert.ok(r.gain > 0);
  assert.deepEqual(r.jealous, ['bailu']);
  assert.equal(t.girls.bailu.aff, 56);
  assert.equal(t.slot, 2);
  assert.equal(sim.canDate(t, 'qingge'), false);
});

test('story chapters open with affection and the stat she respects, at her home place', () => {
  const s = withGirl('qingge');
  s.girls.qingge.chapter = 2;
  s.girls.qingge.aff = 50;
  assert.equal(sim.chapterReady(s, 'qingge'), 0);
  s.stats.intellect = 40;
  assert.equal(sim.chapterReady(s, 'qingge'), 3);
  assert.equal(sim.chapterAt(s, 'qingge', 'library'), 3);
  assert.equal(sim.chapterAt(s, 'qingge', 'cafe'), 0);
});

test('clothes: outfits score styles, pieces toggle, dresses replace top and bottom', () => {
  const s = sim.newGame();
  assert.equal(sim.toggleWear(s, 'hero', 'blazer'), false); // not owned yet
  s.money = 1000;
  assert.ok(sim.buy(s, 'boutique', 'blazer'));
  assert.ok(sim.toggleWear(s, 'hero', 'blazer'));
  assert.ok(sim.outfitStyles(s.hero.wear).preppy >= 3);
  assert.ok(sim.charmTotal(s) > s.stats.charm);
  assert.equal(sim.buy(s, 'boutique', 'blazer'), false); // only one of each
  // A dress is bought as a present, then worn by the senior who receives it.
  assert.ok(sim.buy(s, 'boutique', 'sundress'));
  assert.equal(s.bag.sundress, 1);
  s.girls.qingge.met = true;
  s.day = 1;
  s.slot = 1;
  sim.enter(s, 'library');
  assert.ok(sim.give(s, 'qingge', 'sundress').clothes);
  assert.ok(sim.toggleWear(s, 'qingge', 'sundress'));
  assert.equal(s.girls.qingge.wear.top, undefined);
  assert.ok(sim.toggleWear(s, 'qingge', 'shirt'));
  assert.equal(s.girls.qingge.wear.dress, undefined);
  assert.ok(s.girls.qingge.wear.bottom);
  assert.ok(sim.dye(s, 'hero', 'blazer', 0, '#ff0000'));
  assert.equal(s.hero.wear.outer.c[0], '#ff0000');
});

test('tasks become ready when their condition is met and pay out once', () => {
  const s = sim.newGame();
  const wage = QUESTS.find(q => q.id === 'wage');
  assert.equal(sim.questState(s, wage), 'open');
  s.counters.work = 2;
  assert.equal(sim.questState(s, wage), 'ready');
  const money = s.money;
  assert.ok(sim.claim(s, 'wage'));
  assert.equal(s.money, money + 80);
  assert.equal(sim.claim(s, 'wage'), null);
  assert.equal(
    sim.questState(
      s,
      QUESTS.find(q => q.id === 'showcase'),
    ),
    'hidden',
  );
});

test('the confession succeeds only when her story is complete and affection is high', () => {
  const s = sim.newGame();
  s.girls.bailu.aff = 95;
  s.girls.bailu.chapter = 3;
  assert.equal(sim.confess(s, 'bailu'), 'friend');
  s.girls.bailu.chapter = 4;
  assert.equal(sim.confess(s, 'bailu'), 'love');
});

test('dye applies only to supported colour channels and survives a save', () => {
  const s = sim.newGame();
  assert.ok(sim.toggleWear(s, 'hero', 'slacks'));
  assert.ok(sim.dye(s, 'hero', 'slacks', 0, '#334455'));
  assert.equal(sim.dye(s, 'hero', 'slacks', 1, '#ff0066'), false);

  s.money = 1000;
  assert.ok(sim.buy(s, 'boutique', 'turtleneck'));
  assert.ok(sim.toggleWear(s, 'hero', 'turtleneck'));
  assert.ok(sim.dye(s, 'hero', 'turtleneck', 0, '#551144'));
  assert.ok(sim.dye(s, 'hero', 'turtleneck', 1, '#ff0066'));

  const restored = sim.deserialize(sim.serialize(s));
  assert.deepEqual(restored.hero.wear.bottom.c, ['#334455']);
  assert.deepEqual(restored.hero.wear.top.c, ['#551144', '#ff0066']);
});

test('dyes are remembered per character after swapping, unequipping and loading', () => {
  const s = sim.newGame();
  s.hero.owned.glasses = true;
  s.hero.owned.shades = true;
  s.girls.wanqing.gifted.push('glasses');
  assert.ok(sim.toggleWear(s, 'hero', 'glasses'));
  assert.ok(sim.toggleWear(s, 'wanqing', 'glasses'));
  assert.ok(sim.dye(s, 'hero', 'glasses', 1, '#ff0066'));
  assert.ok(sim.dye(s, 'wanqing', 'glasses', 1, '#00aa88'));
  assert.ok(sim.toggleWear(s, 'hero', 'shades'));
  assert.ok(sim.toggleWear(s, 'hero', 'glasses'));
  assert.equal(s.hero.wear.acc[0].c?.[1], '#ff0066');
  assert.ok(sim.toggleWear(s, 'hero', 'glasses'));
  assert.ok(sim.toggleWear(s, 'wanqing', 'glasses'));

  const restored = sim.deserialize(sim.serialize(s));
  assert.ok(sim.toggleWear(restored, 'hero', 'glasses'));
  assert.ok(sim.toggleWear(restored, 'wanqing', 'glasses'));
  assert.equal(restored.hero.wear.acc[0].c?.[1], '#ff0066');
  assert.equal(restored.girls.wanqing.wear.acc.find(p => p.id === 'glasses').c?.[1], '#00aa88');
});

test('dyes follow a garment across presets while untouched channels use the preset defaults', () => {
  const s = sim.newGame();
  const girl = s.girls.wanqing;
  girl.aff = 60;
  const { casual, date } = HEROINES.wanqing.outfits;
  assert.ok(sim.dye(s, 'wanqing', 'sweater', 0, '#336644'));
  assert.ok(sim.wearPreset(s, 'wanqing', 'casual'));
  assert.ok(sim.dye(s, 'wanqing', 'cardigan', 1, '#cc0055'));

  const restored = sim.deserialize(sim.serialize(s));
  assert.ok(sim.wearPreset(restored, 'wanqing', 'date'));
  assert.deepEqual(restored.girls.wanqing.wear.outer.c, [date.outer.c[0], '#cc0055']);
  assert.ok(sim.toggleWear(restored, 'wanqing', 'jeans'));
  assert.equal(restored.girls.wanqing.wear.top.id, 'sweater');
  assert.equal(restored.girls.wanqing.wear.top.c?.[0], '#336644');
  assert.ok(sim.wearPreset(restored, 'wanqing', 'uniform'));
  assert.ok(sim.wearPreset(restored, 'wanqing', 'casual'));
  assert.deepEqual(restored.girls.wanqing.wear.outer.c, [casual.outer.c[0], '#cc0055']);
  assert.equal(casual.outer.c[1], '#7cc47a');
});

test('legacy saves recover equipped dyes without locking in an untouched preset palette', () => {
  const legacy = sim.newGame();
  legacy.hero.wear.top.c = [null, '#cc0055'];
  legacy.girls.wanqing.aff = 60;
  legacy.girls.wanqing.wear = structuredClone(HEROINES.wanqing.outfits.date);
  legacy.girls.wanqing.wear.outer.c[1] = '#00aa88';
  for (const actor of [legacy.hero, ...Object.values(legacy.girls)]) delete actor.dyes;

  const restored = sim.deserialize(sim.serialize(legacy));
  assert.ok(sim.toggleWear(restored, 'hero', 'shirt'));
  assert.ok(sim.toggleWear(restored, 'hero', 'tee'));
  assert.equal(restored.hero.wear.top.c?.[1], '#cc0055');
  assert.ok(sim.wearPreset(restored, 'wanqing', 'casual'));
  assert.deepEqual(restored.girls.wanqing.wear.outer.c, [HEROINES.wanqing.outfits.casual.outer.c[0], '#00aa88']);
});

test('a save survives being written and read back', () => {
  const s = sim.newGame();
  sim.enter(s, 'field');
  sim.act(s, 'field', 'train');
  assert.deepEqual(sim.deserialize(sim.serialize(s)), s);
  assert.equal(sim.deserialize('not a save'), null);
});

test('catalogue and story data are complete and consistent', () => {
  for (const shop of Object.values(SHOPS)) assert.ok(shop.stock.length > 0);
  for (const id of HEROINE_IDS) {
    const h = HEROINES[id];
    for (const taste of ['love', 'like', 'hate']) for (const gift of h.gifts[taste]) assert.ok(GIFTS[gift], `${id} ${gift}`);
    for (const outfit of Object.values(h.outfits)) for (const piece of sim.pieces(outfit)) assert.ok(CLOTHES[piece.id], `${id} ${piece.id}`);
    for (const n of [1, 2, 3, 4]) {
      const picks = CHAPTERS_SCRIPT[id][n].filter(step => step[0] === 'pick');
      assert.ok(picks.length >= 1, `${id} chapter ${n} has a choice`);
      for (const [, options] of picks) for (const o of options) assert.equal(o.t.length, 2);
    }
    for (const zone of ['sweet', 'near', 'forward', 'distant']) assert.ok(CHAT_LINES[id][zone].length > 0);
    for (const taste of ['love', 'like', 'fine', 'hate']) assert.equal(GIFT_LINES[id][taste].length, 3);
    assert.ok(DATE_LINES[id].good && DATE_LINES[id].ok && JEALOUS_LINES[id]);
    assert.ok(ENDINGS[id].love.length && ENDINGS[id].friend.length);
  }
  for (const q of QUESTS)
    for (const item of Object.keys({ ...q.take, ...q.reward.items })) assert.ok(GIFTS[item] || SUPPLIES[item], `${q.id} ${item}`);
  assert.ok(PROLOGUE.length && FINALE_INTRO.length && ENDING_SOLO.length);
});

test('a term played start to finish can reach a love ending', () => {
  const s = playTerm(['wanqing']);
  assert.equal(s.finale, true);
  assert.equal(s.girls.wanqing.chapter, 4);
  assert.equal(sim.confess(s, 'wanqing'), 'love');
});

test('a senior the hero has met makes one wish each morning, and granting it brings extra affection', () => {
  const s = withGirl('qingge');
  s.girls.linxia.met = true;
  sim.sleep(s);
  const w = s.wish;
  assert.ok(w && ['qingge', 'linxia'].includes(w.girl));
  assert.equal(w.day, s.day);
  assert.ok(['gift', 'chat', 'style', 'date'].includes(w.kind));
  // Grant a gift wish by hand and check the bonus is outside the daily cap.
  const g = sim.newGame({ seed: 7 });
  g.girls.qingge.met = true;
  g.wish = { girl: 'qingge', day: g.day, kind: 'gift', item: 'tea', done: false };
  while (sim.whereIs(g, 'qingge') !== 'library') sim.advance(g);
  g.wish.day = g.day;
  sim.enter(g, 'library');
  g.bag.tea = 1;
  const before = g.girls.qingge.aff;
  const r = sim.give(g, 'qingge', 'tea');
  assert.equal(r.wish, sim.WISH_AFFECTION);
  assert.equal(g.girls.qingge.aff, before + r.gain + r.wish);
  assert.equal(g.counters.wish, 1);
  assert.equal(sim.wishFor(g, 'qingge'), null, 'a wish is granted only once');
});

test('wishes are the same for the same seed and day, and every kind can be granted', () => {
  const play = () => {
    const s = sim.newGame({ seed: 42 });
    for (const id of HEROINE_IDS) s.girls[id].met = true;
    const seen = [];
    for (let d = 0; d < 20; d++) {
      sim.sleep(s);
      seen.push(JSON.stringify(s.wish));
    }
    return seen;
  };
  const a = play();
  assert.deepEqual(a, play());
  const kinds = new Set(a.map(w => JSON.parse(w).kind));
  assert.ok(kinds.size >= 3, [...kinds].join());
  for (const text of a) {
    const w = JSON.parse(text);
    if (w.kind === 'gift') assert.ok(GIFTS[w.item] && SHOPS.giftshop.stock.includes(w.item), w.item);
    if (w.kind === 'style') assert.ok(HEROINES[w.girl].likes.includes(w.style));
    if (w.kind === 'chat') assert.ok(sim.APPROACHES[w.approach] !== undefined);
  }
});

test('the focus challenge raises what practice and work give', () => {
  const plain = sim.newGame();
  sim.enter(plain, 'library');
  const ok = sim.act(plain, 'library', 'study', 'ok');
  const sharp = sim.newGame();
  sim.enter(sharp, 'library');
  const perfect = sim.act(sharp, 'library', 'study', 'perfect');
  assert.ok(perfect.gain.intellect > ok.gain.intellect);
  assert.equal(sharp.counters.perfect, 1);
  const work = sim.newGame();
  sim.enter(work, 'cafe');
  const paid = sim.act(work, 'cafe', 'barista', 'good').pay;
  const base = sim.newGame();
  sim.enter(base, 'cafe');
  assert.ok(paid > sim.act(base, 'cafe', 'barista').pay);
  // Buying a coffee has no challenge.
  assert.equal(sim.hasFocus(PLACES.cafe.acts.find(a => a.id === 'coffee')), false);
});

test('campus events fit their place, time and senior, and do not repeat in a term', () => {
  for (const ev of EVENTS) {
    for (const place of ev.places) assert.ok(PLACES[place], `${ev.id}: ${place}`);
    if (ev.girl) assert.ok(HEROINES[ev.girl], ev.id);
    const picks = ev.script.filter(step => step[0] === 'pick');
    assert.ok(picks.length >= 1, ev.id);
    for (const option of picks.flatMap(step => step[1])) {
      assert.ok(option.t[0] && option.t[1], ev.id);
      for (const k of Object.keys(option.fx ?? {})) assert.ok(['aff', 'pull', 'stats', 'money', 'energy', 'item'].includes(k), `${ev.id}: ${k}`);
    }
  }
  assert.equal(new Set(EVENTS.map(ev => ev.id)).size, EVENTS.length);
  // Over a term of visits, events come up, and none without `again` comes twice.
  const s = sim.newGame({ seed: 5 });
  for (const id of HEROINE_IDS) s.girls[id].met = true;
  const seen = [];
  while (!s.finale) {
    for (const place of Object.keys(PLACES)) {
      if (!sim.placeOpen(s, place)) continue;
      const ev = sim.rollEvent(s, place);
      if (ev) {
        assert.ok(sim.eventFits({ ...s, flags: {} }, ev, place), ev.id);
        seen.push(ev.id);
      }
    }
    sim.advance(s);
  }
  assert.ok(seen.length >= 15, `only ${seen.length} events`);
  const once = seen.filter(id => !EVENTS.find(ev => ev.id === id).again);
  assert.equal(new Set(once).size, once.length);
});

test('a finished term fills the memories and unlocks perks for the next', () => {
  const m = sim.newMemories();
  const s = playTerm(['qingge']);
  const result = sim.confess(s, 'qingge');
  const fresh = sim.recordTerm(m, s, 'qingge', result);
  assert.equal(m.terms, 1);
  assert.ok(fresh.endings.includes(`qingge:${result}`));
  assert.ok(fresh.achievements.includes('firstterm'));
  assert.ok(fresh.perks.includes('notes'));
  // The same ending again is not new.
  assert.deepEqual(sim.recordTerm(m, s, 'qingge', result).endings, []);
  // A perk changes the next term's start.
  const next = sim.newGame({ perk: 'notes' });
  assert.equal(next.perk, 'notes');
  assert.equal(next.stats.intellect, 14);
  // Unknown perks are ignored; memories survive being stored.
  assert.equal(sim.newGame({ perk: 'nope' }).perk, null);
  assert.deepEqual(sim.readMemories(JSON.stringify(m)), m);
  assert.deepEqual(sim.readMemories('garbage'), sim.newMemories());
  for (const perk of PERKS) assert.ok(!perk.needs || ACHIEVEMENTS.find(a => a.id === perk.needs), perk.id);
});

test('saves from before wishes and events still load', () => {
  const s = sim.newGame();
  delete s.seed;
  delete s.wish;
  delete s.perk;
  delete s.eventDay;
  const back = sim.deserialize(JSON.stringify(s));
  assert.equal(back.seed, 1);
  assert.equal(back.wish, null);
  sim.sleep(back);
});
