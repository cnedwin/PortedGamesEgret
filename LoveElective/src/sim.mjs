// The rules of the game: time, stats, money, affection, the push-and-pull
// gauge, tasks and endings. Nothing here touches the page, so a whole term can
// be played from Node (see tools/headless.mjs and test/).
import { HEROINES, HEROINE_IDS, HERO, LEVELS } from './data/cast.mjs';
import { CLOTHES, GIFTS, SUPPLIES, HAIRSTYLES, SHOPS } from './data/items.mjs';
import { PLACES, SLOTS_OF_DAY, DAYS_IN_TERM, DATE_SPOTS } from './data/places.mjs';
import { QUESTS } from './data/quests.mjs';

export const SAVE_VERSION = 1;
const clone = value => JSON.parse(JSON.stringify(value));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Affection and stat needed before each story chapter opens (chapter 1 is the first meeting). */
export const CHAPTERS = [null, { aff: 0, stat: 0 }, { aff: 20, stat: 0 }, { aff: 45, stat: 35 }, { aff: 70, stat: 60 }];
/** Most affection one senior can gain from chatting and presents in a single day. */
export const DAILY_CAP = 5;
/** Days between dates with the same senior. */
export const DATE_EVERY = 2;
export const DATE_AFFECTION = 35;
export const DRESS_AFFECTION = 35;
export const CONFESS_AFFECTION = 88;

export function newGame() {
  const girls = {};
  for (const id of HEROINE_IDS) {
    girls[id] = {
      aff: 0,
      pull: 0,
      met: false,
      chapter: 0,
      chats: 0,
      chatAt: -1,
      giftDay: 0,
      dateDay: -9,
      dayGain: 0,
      dates: 0,
      lastDay: 1,
      wear: clone(HEROINES[id].outfits.uniform),
      gifted: [],
    };
  }
  const owned = {};
  for (const id of HERO.owned) owned[id] = true;
  return {
    version: SAVE_VERSION,
    day: 1,
    slot: 0,
    energy: 100,
    money: 300,
    stats: { intellect: 10, fitness: 10, art: 10, charm: 10, eq: 10 },
    hero: { hair: clone(HERO.look.hair), hairs: { swept: true }, wear: clone(HERO.wear), owned },
    girls,
    bag: {},
    counters: {},
    visited: {},
    quests: {},
    flags: {},
    finale: false,
  };
}

// ------------------------------------------------------------------ time

export function clock(s) {
  const weekday = (s.day - 1) % 7;
  return { day: s.day, slot: s.slot, weekday, weekend: weekday >= 5, light: SLOTS_OF_DAY[s.slot].light, absolute: (s.day - 1) * 4 + s.slot };
}

/** Where a senior is right now, or null when she is off campus. */
export function whereIs(s, girl) {
  const c = clock(s),
    h = HEROINES[girl];
  return (c.weekend ? h.weekend : h.week)[c.slot];
}

export const girlsAt = (s, place) => HEROINE_IDS.filter(id => whereIs(s, id) === place);
export const placeOpen = (s, place) => s.slot < 3 || PLACES[place].night;

function startDay(s, rested) {
  s.day += 1;
  s.slot = 0;
  s.energy = rested ? 100 : clamp(s.energy + 55, 0, 100);
  for (const id of HEROINE_IDS) {
    const g = s.girls[id];
    g.dayGain = 0;
    // The gauge drifts back to neutral overnight.
    g.pull -= Math.sign(g.pull) * Math.min(Math.abs(g.pull), 5);
    // A senior who has been ignored for days cools a little, but never below her current stage.
    if (g.met && s.day - g.lastDay >= 4 && g.aff > LEVELS[level(g.aff)].at) g.aff -= 1;
  }
  if (s.day > DAYS_IN_TERM) {
    s.day = DAYS_IN_TERM;
    s.slot = 3;
    s.finale = true;
  }
}

/** Move to the next part of the day; after the night comes a short night's sleep. */
export function advance(s) {
  if (s.finale) return;
  if (s.slot < 3) s.slot += 1;
  else startDay(s, false);
}

/** Sleep in the dormitory: skip to the next morning fully rested. */
export function sleep(s) {
  if (!s.finale) startDay(s, true);
}

// ------------------------------------------------------------------ outfits and stats

/** Every piece in a `wear` description, as { id, c } entries. */
export function pieces(wear) {
  const list = [];
  for (const slot of ['top', 'bottom', 'dress', 'outer', 'shoes', 'legs']) if (wear[slot]) list.push(wear[slot]);
  for (const a of wear.acc ?? []) list.push(a);
  return wear.dress ? list.filter(p => !['top', 'bottom'].includes(CLOTHES[p.id]?.slot)) : list;
}

/** Style points of an outfit by tag. */
export function outfitStyles(wear) {
  const total = {};
  for (const { id } of pieces(wear)) for (const [tag, n] of Object.entries(CLOTHES[id]?.styles ?? {})) total[tag] = (total[tag] ?? 0) + n;
  return total;
}

export const outfitCharm = wear => pieces(wear).reduce((sum, { id }) => sum + (CLOTHES[id]?.charm ?? 0), 0);
export const charmTotal = s => s.stats.charm + outfitCharm(s.hero.wear);

/** A stat as the seniors see it: charm includes what the hero is wearing. */
export const statValue = (s, name) => (name === 'charm' || name === 'charmTotal' ? charmTotal(s) : s.stats[name]);

/** How well the hero's outfit suits a senior's taste: a multiplier from 1 to 1.5. */
export function styleBonus(s, girl) {
  const styles = outfitStyles(s.hero.wear);
  const points = HEROINES[girl].likes.reduce((sum, tag) => sum + (styles[tag] ?? 0), 0);
  return 1 + Math.min(0.5, points * 0.05);
}

function addStats(s, gain) {
  for (const [name, n] of Object.entries(gain ?? {})) s.stats[name] = clamp(s.stats[name] + n, 0, 100);
}

/** Practice pays off less the better the hero already is. */
function trained(s, gain) {
  const out = {};
  for (const [name, n] of Object.entries(gain ?? {}))
    out[name] = Math.max(1, Math.round(n * (s.stats[name] >= 70 ? 0.34 : s.stats[name] >= 40 ? 0.67 : 1)));
  return out;
}

// ------------------------------------------------------------------ affection and push-and-pull

/** Index into LEVELS for an affection value. */
export function level(aff) {
  let i = 0;
  LEVELS.forEach((l, n) => {
    if (aff >= l.at) i = n;
  });
  return i;
}

/** everyday: 'capped' for chats and presents (limited per day), 'date' for dates, false for story and tasks. */
function addAffection(s, girl, n, everyday) {
  const g = s.girls[girl];
  if (everyday && n > 0) {
    // Everyday gestures count for less as the two grow closer; the story has to carry them further.
    n = Math.max(1, Math.round(n * (g.aff < 35 ? 1 : g.aff < 55 ? 0.8 : g.aff < 75 ? 0.6 : 0.45)));
    if (everyday === 'capped') {
      n = Math.min(n, DAILY_CAP - g.dayGain);
      g.dayGain += Math.max(0, n);
    }
  }
  const before = g.aff;
  g.aff = clamp(g.aff + n, 0, 100);
  g.lastDay = s.day;
  return g.aff - before;
}

/**
 * Where the gauge sits relative to what she likes:
 * 'sweet' inside her range, 'near' just outside, otherwise 'forward' or 'distant'.
 */
export function paceZone(girl, pull) {
  const [lo, hi] = HEROINES[girl].pace;
  if (pull >= lo && pull <= hi) return 'sweet';
  if (pull >= lo - 12 && pull <= hi + 12) return 'near';
  return pull > hi ? 'forward' : 'distant';
}

const ZONE_FACTOR = { sweet: 1.6, near: 1, forward: 0.4, distant: 0.5 };
export const APPROACHES = { closer: 14, steady: 0, space: -14 };

export const canChat = (s, girl) => whereIs(s, girl) === s.place && s.girls[girl].chatAt !== clock(s).absolute && s.girls[girl].met;

/**
 * Talk to a senior. `approach` is 'closer' (step forward), 'steady' or 'space'
 * (hold back); it moves the gauge before her reaction is worked out.
 */
export function chat(s, girl, approach) {
  const g = s.girls[girl];
  g.pull = clamp(g.pull + APPROACHES[approach], -50, 50);
  g.chatAt = clock(s).absolute;
  g.chats += 1;
  const zone = paceZone(girl, g.pull);
  let gain = Math.round(2.2 * ZONE_FACTOR[zone] * styleBonus(s, girl) + (s.stats.eq >= 40 ? 0.6 : 0));
  // Pressing on when she already feels crowded, or pulling away when she feels ignored, costs a little.
  if ((zone === 'forward' && approach === 'closer') || (zone === 'distant' && approach === 'space')) gain = -1;
  gain = addAffection(s, girl, gain, 'capped');
  return { gain, zone, pull: g.pull };
}

export function giftTaste(girl, item) {
  const t = HEROINES[girl].gifts;
  return t.love.includes(item) ? 'love' : t.like.includes(item) ? 'like' : t.hate.includes(item) ? 'hate' : 'fine';
}

export const canGift = (s, girl) => whereIs(s, girl) === s.place && s.girls[girl].met && s.girls[girl].giftDay !== s.day;

/** Give a present from the bag (a gift, or a piece of clothing bought for her). */
export function give(s, girl, item) {
  if (!s.bag[item]) return null;
  const g = s.girls[girl];
  s.bag[item] -= 1;
  if (!s.bag[item]) delete s.bag[item];
  g.giftDay = s.day;
  g.pull = clamp(g.pull + 4, -50, 50);
  s.counters.gift = (s.counters.gift ?? 0) + 1;
  if (CLOTHES[item]) {
    // Clothes join her wardrobe; she likes them more when they are her style.
    const fits = Object.keys(CLOTHES[item].styles).some(tag => HEROINES[girl].likes.includes(tag));
    if (!g.gifted.includes(item)) g.gifted.push(item);
    return { taste: fits ? 'love' : 'like', gain: addAffection(s, girl, fits ? 9 : 5, 'capped'), clothes: true };
  }
  const taste = giftTaste(girl, item);
  return { taste, gain: addAffection(s, girl, { love: 8, like: 5, fine: 2, hate: -4 }[taste], 'capped') };
}

export function canDate(s, girl) {
  const g = s.girls[girl];
  return whereIs(s, girl) === s.place && g.aff >= DATE_AFFECTION && s.day - g.dateDay >= DATE_EVERY && s.energy >= 20 && !s.finale;
}

/** Take a senior out. Uses the time slot; other fond seniors who see it are hurt. */
export function date(s, girl, spotId) {
  const spot = DATE_SPOTS.find(d => d.id === spotId),
    g = s.girls[girl];
  if (!spot || s.money < spot.cost || !canDate(s, girl)) return null;
  const jealous = girlsAt(s, s.place).filter(id => id !== girl && s.girls[id].aff >= 55);
  for (const id of jealous) {
    addAffection(s, id, -4, false);
    s.girls[id].pull = clamp(s.girls[id].pull - 10, -50, 50);
  }
  s.money -= spot.cost;
  s.energy -= 20;
  g.pull = clamp(g.pull + 8, -50, 50);
  g.dateDay = s.day;
  g.dates += 1;
  s.counters.date = (s.counters.date ?? 0) + 1;
  const zone = paceZone(girl, g.pull);
  const gain = addAffection(
    s,
    girl,
    Math.round((3.5 + spot.cost / 40) * Math.min(1.3, Math.max(0.7, ZONE_FACTOR[zone])) * styleBonus(s, girl)),
    'date',
  );
  advance(s);
  return { gain, zone, jealous, spot };
}

// ------------------------------------------------------------------ story chapters

/** The next chapter (1–4) if its conditions are met, or 0. Chapters play at her home place. */
export function chapterReady(s, girl) {
  const g = s.girls[girl],
    next = g.chapter + 1,
    need = CHAPTERS[next];
  if (!need) return 0;
  return g.aff >= need.aff && statValue(s, HEROINES[girl].stat) >= need.stat ? next : 0;
}

/** The chapter that plays if the hero walks into `place` now, or 0: she has to be at home there. */
export function chapterAt(s, girl, place) {
  return HEROINES[girl].home === place && whereIs(s, girl) === place ? chapterReady(s, girl) : 0;
}

/** What still stands between the hero and her next chapter, for hints in the phone. */
export function chapterNeeds(s, girl) {
  const g = s.girls[girl],
    need = CHAPTERS[g.chapter + 1];
  if (!need) return null;
  return {
    aff: need.aff,
    stat: HEROINES[girl].stat,
    statNeed: need.stat,
    affOk: g.aff >= need.aff,
    statOk: statValue(s, HEROINES[girl].stat) >= need.stat,
  };
}

/** Apply the outcome of a story choice: { aff, pull, money, stats, flag, item }. */
export function applyEffect(s, girl, fx = {}) {
  const g = girl ? s.girls[girl] : null;
  let gained = 0;
  if (g && fx.aff) gained = addAffection(s, girl, fx.aff, false);
  if (g && fx.pull) g.pull = clamp(g.pull + fx.pull, -50, 50);
  if (fx.money) s.money = Math.max(0, s.money + fx.money);
  if (fx.stats) addStats(s, fx.stats);
  if (fx.flag) s.flags[fx.flag] = true;
  if (fx.item) s.bag[fx.item] = (s.bag[fx.item] ?? 0) + 1;
  return gained;
}

export function finishChapter(s, girl, chapter) {
  const g = s.girls[girl];
  g.met = true;
  g.chapter = Math.max(g.chapter, chapter);
  g.lastDay = s.day;
}

// ------------------------------------------------------------------ places and activities

export function enter(s, place) {
  s.place = place;
  s.visited[place] = true;
}

/** Why an activity cannot be done right now, or null if it can. */
export function actBlocked(s, act) {
  if (act.special) return null;
  if (s.finale) return 'over';
  if ((act.energy ?? 0) < 0 && s.energy < -act.energy) return 'energy';
  if (act.cost && s.money < act.cost) return 'money';
  return null;
}

/** Do an activity at the current place. Returns what changed. */
export function act(s, placeId, actId) {
  const a = PLACES[placeId].acts.find(x => x.id === actId);
  if (!a || a.special || actBlocked(s, a)) return null;
  const result = { gain: trained(s, a.gain), energy: a.energy ?? 0, pay: 0, cost: a.cost ?? 0 };
  s.energy = clamp(s.energy + result.energy, 0, 100);
  s.money -= result.cost;
  if (a.pay) {
    result.pay = Math.round(a.pay[0] + statValue(s, a.pay[1]) * a.pay[2]);
    s.money += result.pay;
  }
  addStats(s, result.gain);
  s.counters[a.id] = (s.counters[a.id] ?? 0) + 1;
  if (a.work) s.counters.work = (s.counters.work ?? 0) + 1;
  if (!a.free) advance(s);
  return result;
}

// ------------------------------------------------------------------ shopping and wardrobe

export function priceOf(kind, id) {
  return (kind === 'clothes' ? CLOTHES : kind === 'gifts' ? GIFTS : kind === 'supplies' ? SUPPLIES : HAIRSTYLES)[id]?.price ?? 0;
}

/** Has the hero already got this (clothes and hairstyles are bought once)? */
export function owns(s, kind, id) {
  if (kind === 'clothes') return CLOTHES[id].only === 'f' ? false : !!s.hero.owned[id];
  if (kind === 'hair') return !!s.hero.hairs[id];
  return false;
}

export function buy(s, shopId, id) {
  const shop = SHOPS[shopId],
    price = priceOf(shop.kind, id);
  if (!shop.stock.includes(id) || s.money < price || owns(s, shop.kind, id)) return false;
  s.money -= price;
  if (shop.kind === 'clothes' && CLOTHES[id].only !== 'f') s.hero.owned[id] = true;
  else if (shop.kind === 'hair') {
    s.hero.hairs[id] = true;
    s.hero.hair.bangs = id;
  } else s.bag[id] = (s.bag[id] ?? 0) + 1; // gifts, supplies and clothes meant as presents
  return true;
}

export function useSupply(s, id) {
  const item = SUPPLIES[id];
  if (!item || !s.bag[id]) return false;
  s.bag[id] -= 1;
  if (!s.bag[id]) delete s.bag[id];
  const { energy, ...stats } = item.use;
  if (energy) s.energy = clamp(s.energy + energy, 0, 100);
  addStats(s, stats);
  return true;
}

/** Clothes available to dress someone: the hero's own, or a senior's outfits plus presents. */
export function closet(s, who) {
  if (who === 'hero') return Object.keys(s.hero.owned);
  const g = s.girls[who],
    h = HEROINES[who],
    ids = new Set(g.gifted);
  const sets = ['uniform', g.aff >= DRESS_AFFECTION ? 'casual' : null, g.aff >= 60 ? 'date' : null].filter(Boolean);
  for (const name of sets) for (const p of pieces(h.outfits[name])) ids.add(p.id);
  for (const name of sets) for (const slot of ['top', 'bottom']) if (h.outfits[name][slot]) ids.add(h.outfits[name][slot].id);
  return [...ids];
}

export const wearOf = (s, who) => (who === 'hero' ? s.hero.wear : s.girls[who].wear);

/** The colours a senior's own pieces come in, so they keep their look when put back on. */
function defaultColors(who, id) {
  if (who === 'hero') return undefined;
  for (const outfit of Object.values(HEROINES[who].outfits))
    for (const p of [...pieces(outfit), outfit.top, outfit.bottom]) if (p?.id === id && p.c) return [...p.c];
  return undefined;
}

/** Put a piece on, or take it off if it is already worn. Accessories stack, one per zone of the body. */
export function toggleWear(s, who, id) {
  const wear = wearOf(s, who),
    def = CLOTHES[id];
  if (!def || !closet(s, who).includes(id)) return false;
  if (who === 'hero' && def.only === 'f') return false;
  const piece = { id },
    c = defaultColors(who, id);
  if (c) piece.c = c;
  if (def.slot === 'acc') {
    wear.acc ??= [];
    const at = wear.acc.findIndex(a => a.id === id);
    if (at >= 0) wear.acc.splice(at, 1);
    else {
      wear.acc = wear.acc.filter(a => CLOTHES[a.id].zone !== def.zone);
      wear.acc.push(piece);
    }
    return true;
  }
  if (wear[def.slot]?.id === id) {
    // Tops, bottoms and shoes cannot simply be taken off; optional layers can.
    if (['outer', 'legs'].includes(def.slot)) delete wear[def.slot];
    return true;
  }
  wear[def.slot] = piece;
  if (def.slot === 'dress') {
    delete wear.top;
    delete wear.bottom;
  }
  if ((def.slot === 'top' || def.slot === 'bottom') && wear.dress) {
    delete wear.dress;
    const have = closet(s, who),
      other = def.slot === 'top' ? 'bottom' : 'top';
    const spare = have.find(x => CLOTHES[x].slot === other);
    if (spare && !wear[other]) {
      wear[other] = { id: spare };
      const sc = defaultColors(who, spare);
      if (sc) wear[other].c = sc;
    }
  }
  return true;
}

/** Dye a supported colour channel of a worn piece. */
export function dye(s, who, id, channel, color) {
  if (channel !== 0 && (channel !== 1 || CLOTHES[id]?.singleDye)) return false;
  const wear = wearOf(s, who);
  const piece = [...pieces(wear), wear.top, wear.bottom].find(p => p?.id === id);
  if (!piece) return false;
  piece.c ??= [];
  piece.c[channel] = color;
  return true;
}

export function wearPreset(s, girl, name) {
  const g = s.girls[girl];
  if (name !== 'uniform' && g.aff < (name === 'casual' ? DRESS_AFFECTION : 60)) return false;
  g.wear = clone(HEROINES[girl].outfits[name]);
  return true;
}

// ------------------------------------------------------------------ tasks

function needMet(s, need) {
  if (need.count) return (s.counters[need.count[0]] ?? 0) >= need.count[1];
  if (need.stat) return statValue(s, need.stat[0]) >= need.stat[1];
  if (need.style) return (outfitStyles(s.hero.wear)[need.style[0]] ?? 0) >= need.style[1];
  if (need.aff) return need.aff[0] === 'any' ? HEROINE_IDS.some(id => s.girls[id].aff >= need.aff[1]) : s.girls[need.aff[0]].aff >= need.aff[1];
  if (need.own) return (s.bag[need.own[0]] ?? 0) >= need.own[1];
  if (need.clothes) return Object.keys(s.hero.owned).length >= need.clothes;
  if (need.places) return Object.keys(s.visited).length >= need.places;
  return false;
}

/** 'hidden' (not posted yet), 'open', 'ready' (can be handed in) or 'done'. */
export function questState(s, q) {
  if (s.quests[q.id]) return 'done';
  if (q.from && s.day < q.from) return 'hidden';
  if (q.girl && s.girls[q.girl].aff < q.aff) return 'hidden';
  return needMet(s, q.need) ? 'ready' : 'open';
}

export const visibleQuests = s => QUESTS.map(q => ({ q, state: questState(s, q) })).filter(x => x.state !== 'hidden');

export function claim(s, id) {
  const q = QUESTS.find(x => x.id === id);
  if (!q || questState(s, q) !== 'ready') return null;
  s.quests[id] = true;
  for (const [item, n] of Object.entries(q.take ?? {})) {
    s.bag[item] -= n;
    if (!s.bag[item]) delete s.bag[item];
  }
  const r = q.reward;
  if (r.money) s.money += r.money;
  addStats(s, r.stats);
  for (const [item, n] of Object.entries(r.items ?? {})) s.bag[item] = (s.bag[item] ?? 0) + n;
  if (r.aff) addAffection(s, r.aff[0], r.aff[1], false);
  return r;
}

// ------------------------------------------------------------------ the end of term

/** Seniors the hero may confess to on the last night. */
export const confessable = s => HEROINE_IDS.filter(id => s.girls[id].aff >= 55);

/** 'love' when she returns his feelings, 'friend' when she is not there yet. */
export function confess(s, girl) {
  const g = s.girls[girl];
  s.flags.confessed = girl;
  return g.aff >= CONFESS_AFFECTION && g.chapter >= 4 ? 'love' : 'friend';
}

// ------------------------------------------------------------------ saving

export const serialize = s => JSON.stringify(s);

export function deserialize(text) {
  try {
    const s = JSON.parse(text);
    return s && s.version === SAVE_VERSION && s.girls && s.hero ? s : null;
  } catch {
    return null;
  }
}
