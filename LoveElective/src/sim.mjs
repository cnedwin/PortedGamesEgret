// The rules of the game: time, stats, money, affection, the push-and-pull
// gauge, tasks and endings. Nothing here touches the page, so a whole term can
// be played from Node (see tools/headless.mjs and test/).
import { HEROINES, HEROINE_IDS, HERO, LEVELS } from './data/cast.mjs';
import { CLOTHES, GIFTS, SUPPLIES, HAIRSTYLES, SHOPS } from './data/items.mjs';
import { PLACES, SLOTS_OF_DAY, DAYS_IN_TERM, DATE_SPOTS } from './data/places.mjs';
import { QUESTS } from './data/quests.mjs';
import { EVENTS } from './data/events.mjs';
import { PERKS, ACHIEVEMENTS } from './data/memories.mjs';
import { BAILU_ZERO_STAGES, freshBailuZero } from './data/bailu-zero.mjs';
import { SOCIAL_SCENES, SOCIAL_IDS, freshSocialStories, freshSocialStory } from './data/social-stories.mjs';

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

/**
 * A new term. `options.perk` applies one of the perks earned in earlier terms
 * (see src/data/memories.mjs); `options.seed` fixes the daily wishes and events.
 */
export function newGame(options = {}) {
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
      dyes: {},
      gifted: [],
    };
  }
  const owned = {};
  for (const id of HERO.owned) owned[id] = true;
  const state = {
    version: SAVE_VERSION,
    day: 1,
    slot: 0,
    energy: 100,
    money: 300,
    stats: { intellect: 10, fitness: 10, art: 10, charm: 10, eq: 10 },
    hero: { hair: clone(HERO.look.hair), hairs: { swept: true }, wear: clone(HERO.wear), dyes: {}, owned },
    girls,
    bag: {},
    counters: {},
    visited: {},
    quests: {},
    flags: {},
    finale: false,
    seed: options.seed ?? Math.floor(Math.random() * 2 ** 31),
    perk: null,
    wish: null,
    eventDay: 0,
    bailuZero: freshBailuZero(),
    socialStories:freshSocialStories(),
  };
  const perk = PERKS.find(x => x.id === options.perk);
  if (perk) {
    state.perk = perk.id;
    perk.apply(state);
  }
  return state;
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
    s.wish = null;
    return;
  }
  if (s.perk === 'earlybird') s.energy = clamp(s.energy + 10, 0, 100);
  rollWish(s);
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

function outfitPieces(wear) {
  const list = [];
  for (const slot of ['top', 'bottom', 'dress', 'outer', 'shoes', 'legs']) if (wear[slot]) list.push(wear[slot]);
  for (const a of wear.acc ?? []) list.push(a);
  return list;
}

/** Pieces visible in an outfit, as { id, c } entries. */
export function pieces(wear) {
  const list = outfitPieces(wear);
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
  const w = wishFor(s, girl);
  const wish =
    (w?.kind === 'chat' && w.approach === approach) || (w?.kind === 'style' && (outfitStyles(s.hero.wear)[w.style] ?? 0) >= WISH_STYLE)
      ? grantWish(s)
      : 0;
  return { gain, zone, pull: g.pull, wish };
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
    return { taste: fits ? 'love' : 'like', gain: addAffection(s, girl, fits ? 9 : 5, 'capped'), clothes: true, wish: 0 };
  }
  const taste = giftTaste(girl, item);
  const gain = addAffection(s, girl, { love: 8, like: 5, fine: 2, hate: -4 }[taste], 'capped');
  const w = wishFor(s, girl);
  return { taste, gain, wish: w?.kind === 'gift' && w.item === item ? grantWish(s) : 0 };
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
  const w = wishFor(s, girl);
  const wish = w?.kind === 'date' && w.spot === spotId ? grantWish(s) : 0;
  advance(s);
  return { gain, zone, jealous, spot, wish };
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
  if (fx.energy) s.energy = clamp(s.energy + fx.energy, 0, 100);
  if (fx.bailuZero) chooseBailuZero(s, fx.bailuZero.key, fx.bailuZero.value);
  if (fx.social) chooseSocial(s,fx.social.id,fx.social.key,fx.social.value);
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

/** How well the hero kept his focus during an activity, and what that multiplies. */
export const FOCUS = { perfect: 1.5, good: 1.2, ok: 1 };

/** Activities with a focus challenge: practice and work, not purchases or rest. */
export const hasFocus = a => !a.special && !a.free && (a.energy ?? 0) < 0;

/**
 * Do an activity at the current place. Returns what changed. `focus` is the
 * result of the focus challenge ('perfect', 'good' or 'ok'); it raises what
 * the activity gives.
 */
export function act(s, placeId, actId, focus = 'ok') {
  const a = PLACES[placeId].acts.find(x => x.id === actId);
  if (!a || a.special || actBlocked(s, a)) return null;
  const k = hasFocus(a) ? (FOCUS[focus] ?? 1) : 1;
  const gain = trained(s, a.gain);
  for (const name of Object.keys(gain)) gain[name] = Math.ceil(gain[name] * k);
  const result = { gain, energy: a.energy ?? 0, pay: 0, cost: a.cost ?? 0, focus: hasFocus(a) ? focus : null };
  s.energy = clamp(s.energy + result.energy, 0, 100);
  s.money -= result.cost;
  if (a.pay) {
    result.pay = Math.round((a.pay[0] + statValue(s, a.pay[1]) * a.pay[2]) * k);
    s.money += result.pay;
  }
  addStats(s, result.gain);
  s.counters[a.id] = (s.counters[a.id] ?? 0) + 1;
  if (a.work) s.counters.work = (s.counters.work ?? 0) + 1;
  if (result.focus === 'perfect') s.counters.perfect = (s.counters.perfect ?? 0) + 1;
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

const wardrobeOwner = (s, who) => (who === 'hero' ? s.hero : s.girls[who]);
export const wearOf = (s, who) => wardrobeOwner(s, who).wear;

/** The colours a senior's own pieces come in, so they keep their look when put back on. */
function defaultColors(who, id) {
  if (who === 'hero') return undefined;
  for (const outfit of Object.values(HEROINES[who].outfits))
    for (const p of outfitPieces(outfit)) if (p.id === id && p.c) return [...p.c];
  return undefined;
}

/** Overlay hand-dyed channels on the defaults for this outfit. */
function applyDyes(actor, piece) {
  const colors = actor.dyes?.[piece.id];
  if (colors) {
    colors.forEach((color, channel) => {
      // JSON stores an untouched channel before a dyed one as null.
      if (typeof color !== 'string') return;
      piece.c ??= [];
      piece.c[channel] = color;
    });
  }
  return piece;
}

function equipPiece(actor, who, id) {
  const c = defaultColors(who, id);
  return applyDyes(actor, c ? { id, c } : { id });
}

/** Put a piece on, or take it off if it is already worn. Accessories stack, one per zone of the body. */
export function toggleWear(s, who, id) {
  const actor = wardrobeOwner(s, who),
    wear = actor.wear,
    def = CLOTHES[id];
  if (!def || !closet(s, who).includes(id)) return false;
  if (who === 'hero' && def.only === 'f') return false;
  if (def.slot === 'acc') {
    wear.acc ??= [];
    const at = wear.acc.findIndex(a => a.id === id);
    if (at >= 0) wear.acc.splice(at, 1);
    else {
      wear.acc = wear.acc.filter(a => CLOTHES[a.id].zone !== def.zone);
      wear.acc.push(equipPiece(actor, who, id));
    }
    return true;
  }
  if (wear[def.slot]?.id === id) {
    // Tops, bottoms and shoes cannot simply be taken off; optional layers can.
    if (['outer', 'legs'].includes(def.slot)) delete wear[def.slot];
    return true;
  }
  wear[def.slot] = equipPiece(actor, who, id);
  if (def.slot === 'dress') {
    delete wear.top;
    delete wear.bottom;
  }
  if ((def.slot === 'top' || def.slot === 'bottom') && wear.dress) {
    delete wear.dress;
    const have = closet(s, who),
      other = def.slot === 'top' ? 'bottom' : 'top';
    const spare = have.find(x => CLOTHES[x].slot === other);
    if (spare && !wear[other]) wear[other] = equipPiece(actor, who, spare);
  }
  return true;
}

/** Dye a supported colour channel of a worn piece. */
export function dye(s, who, id, channel, color) {
  if (channel !== 0 && (channel !== 1 || CLOTHES[id]?.singleDye)) return false;
  const actor = wardrobeOwner(s, who);
  const piece = outfitPieces(actor.wear).find(p => p.id === id);
  if (!piece) return false;
  const colors = ((actor.dyes ??= {})[id] ??= []);
  colors[channel] = color;
  piece.c ??= [];
  piece.c[channel] = color;
  return true;
}

export function wearPreset(s, girl, name) {
  const g = s.girls[girl];
  if (name !== 'uniform' && g.aff < (name === 'casual' ? DRESS_AFFECTION : 60)) return false;
  g.wear = clone(HEROINES[girl].outfits[name]);
  for (const piece of outfitPieces(g.wear)) applyDyes(g, piece);
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

/** Old saves carry colours on equipped pieces only. Infer overrides from the
 * active preset, or from the known defaults when the outfit has been mixed. */
function recoverLegacyDyes(actor, presets) {
  if (!actor?.wear || actor.dyes) return;
  actor.dyes = {};
  const equipped = outfitPieces(actor.wear);
  const signature = items => items.map(p => p.id).sort().join(',');
  const current = signature(equipped);
  const defaults = presets.map(outfitPieces);
  const matched = defaults.find(items => signature(items) === current);
  const reference = matched ? [matched] : defaults;
  for (const { id, c } of equipped) {
    if (!CLOTHES[id] || !Array.isArray(c)) continue;
    const channels = CLOTHES[id].singleDye ? 1 : 2;
    const original = reference.flatMap(items => items.filter(p => p.id === id));
    for (let channel = 0; channel < channels; channel++) {
      const color = c[channel];
      if (typeof color !== 'string' || original.some(p => p.c?.[channel] === color)) continue;
      (actor.dyes[id] ??= [])[channel] = color;
    }
  }
}

export function deserialize(text) {
  try {
    const s = JSON.parse(text);
    if (!s || s.version !== SAVE_VERSION || !s.girls || !s.hero) return null;
    // Saves from before wishes, events and perks existed.
    s.seed ??= 1;
    s.perk ??= null;
    s.wish ??= null;
    s.eventDay ??= 0;
    restoreBailuZero(s);
    restoreSocialStories(s);
    recoverLegacyDyes(s.hero, [HERO.wear]);
    for (const id of HEROINE_IDS) recoverLegacyDyes(s.girls[id], Object.values(HEROINES[id].outfits));
    return s;
  } catch {
    return null;
  }
}

// The optional interlude has its own resumable scene progress and one-time
// effects. Calendar, main chapters and normal confession rules remain intact.
function restoreBailuZero(s){
 const previous=s.bailuZero??{},fresh=freshBailuZero();
 s.bailuZero={...fresh,...previous,version:1,stage:Number.isInteger(previous.stage)?clamp(previous.stage,0,5):0,
  clues:Array.isArray(previous.clues)?[...new Set(previous.clues.filter(id=>['mail','roster','timer'].includes(id)))]:[]};
 const p=s.bailuZero.playback;
 if(p&&p.id===`bailu-zero-${s.bailuZero.stage}`&&p.done&&p.choices){p.cursor=typeof p.cursor==='string'?p.cursor:'0';}
 else s.bailuZero.playback=null;
}
export function bailuZeroStatus(s){
 const q=s.bailuZero??freshBailuZero(),unlocked=(s.girls?.bailu?.chapter??0)>=2;
 return{unlocked,stage:q.stage,complete:q.stage>=5,ending:q.ending,next:BAILU_ZERO_STAGES[q.stage]??null};
}
export function beginBailuZero(s){
 if(!bailuZeroStatus(s).unlocked)return null;
 if(!s.bailuZero)restoreBailuZero(s);
 const q=s.bailuZero;if(q.stage>=5)return null;
 const id=`bailu-zero-${q.stage}`;
 if(q.playback?.id!==id)q.playback={id,cursor:'0',done:{},choices:{}};
 return q.playback;
}
export function chooseBailuZero(s,key,value){
 const q=s.bailuZero;if(!q||!bailuZeroStatus(s).unlocked||q.stage>=5)return false;
 const permitted={archive:[1,['public','ask']],outfit:[2,['own','night']],distance:[3,['close','space']],reading:[3,['read','wait']],ending:[4,['renew','farewell']]};
 const rule=permitted[key];if(!rule||q.stage!==rule[0]||!rule[1].includes(value))return false;
 const field=key==='outfit'?'outfitChoice':key;
 if(q[field])return q[field]===value;
 q[field]=value;
 if(key==='outfit'){
  const g=s.girls.bailu;for(const id of ['cardigan','scarf'])if(!g.gifted.includes(id))g.gifted.push(id);
  if(value==='night')for(const id of ['cardigan','scarf'])if(!pieces(g.wear).some(p=>p.id===id))toggleWear(s,'bailu',id);
 }
 return true;
}
export function finishBailuZero(s,stage){
 const q=s.bailuZero;if(!q||!Number.isInteger(stage)||stage<0||stage>=BAILU_ZERO_STAGES.length||q.stage!==stage||!bailuZeroStatus(s).unlocked)return false;
 if(stage===1&&!q.archive||stage===2&&!q.outfitChoice||stage===3&&(!q.distance||!q.reading)||stage===4&&!q.ending)return false;
 const clue={0:'mail',1:'roster',3:'timer'}[stage];if(clue&&!q.clues.includes(clue))q.clues.push(clue);
 if(stage===2)q.outfit=clone({wear:s.girls.bailu.wear,dyes:s.girls.bailu.dyes});
 addAffection(s,'bailu',2,false);q.stage++;q.playback=null;
 if(q.stage===5)s.flags['bailu-zero:'+q.ending]=true;
 return true;
}
export function bailuZeroMatches(s,condition){const[key,value]=condition.split(':');return s.bailuZero?.[key]===value;}

function restoreSocialStories(s){
 const previous=s.socialStories??{};
 s.socialStories=Object.fromEntries(SOCIAL_IDS.map(id=>{
  const q={...freshSocialStory(),...previous[id],version:1};q.stage=Number.isInteger(q.stage)?clamp(q.stage,0,2):0;
  q.topics=Array.isArray(q.topics)?q.topics.filter(t=>typeof t==='string'):[];
  const p=q.playback,expected=`social-${id}-${q.stage===2?'followup':q.stage}`;
  if(!p||p.id!==expected||!p.done||!p.choices)q.playback=null;
  return[id,q];
 }));
}
export function socialStatus(s,id){
 const def=SOCIAL_SCENES[id];if(!def)return null;
 const q=s.socialStories?.[id]??freshSocialStory(),g=s.girls?.[def.lead];
 const unlocked=Boolean(q.invited||(g?.met&&g.chapter>=def.chapter&&g.aff>=def.aff));
 return{...def,unlocked,stage:q.stage,complete:q.stage===2,followupAvailable:q.stage===2&&(Boolean(q.playback)||q.followup!=='done'&&q.followupAt!==clock(s).absolute),
  hint:!unlocked?['讀完她的第二章並累積好感，即可收到邀請。','Finish her second chapter and build affection to receive an invitation.']:q.stage===0?['接受邀請，選擇雙方舒服的服裝。','Accept and choose comfortable outfits together.']:q.stage===1?['服裝已保存，前往約定的公共場所。','Outfits saved; meet at the agreed public place.']:['下次正常聊天，會接續你們選的話題與約定。','Your next ordinary chat continues your topic and invitation.']};
}
export function beginSocial(s,id){
 const status=socialStatus(s,id);if(!status?.unlocked)return null;
 if(!s.socialStories)restoreSocialStories(s);
 const q=s.socialStories[id];if(q.stage===2&&!status.followupAvailable)return null;
 q.invited=true;
 for(const item of status.heroItems)if(CLOTHES[item])s.hero.owned[item]=true;
 for(const item of [...status.leadItems,...status.optionalLeadItems??[]])if(CLOTHES[item]&&!s.girls[status.lead].gifted.includes(item))s.girls[status.lead].gifted.push(item);
 q.loanGranted=[...status.heroItems,...status.leadItems,...status.optionalLeadItems??[]].every(item=>Boolean(CLOTHES[item]));
 const key=`social-${id}-${q.stage===2?'followup':q.stage}`;
 if(q.playback?.id!==key)q.playback={id:key,cursor:'0',done:{},choices:{}};
 return q.playback;
}
export function chooseSocial(s,id,key,value){
 const def=SOCIAL_SCENES[id],q=s.socialStories?.[id];if(!def||!q?.invited||!q.playback)return false;
 const rules={outfit:[0,['borrow','own']],approach:[1,['closer','respond','space']],response:[1,['yes','later']],followup:[2,['accept','later']]};
 const rule=rules[key];if(!rule||q.stage!==rule[0]||!rule[1].includes(value))return false;
 const field=key==='outfit'?'outfitChoice':key==='followup'?'followupDecision':key;
 if(q[field]!==null)return q[field]===value;
 q[field]=value;
 if(key==='outfit'&&value==='borrow'){
  for(const [who,items]of [[def.lead,def.leadItems],['hero',def.heroItems]])for(const item of items){
   if(!CLOTHES[item])continue;
   if(!pieces(wearOf(s,who)).some(piece=>piece.id===item))toggleWear(s,who,item);
  }
 }
 return true;
}
export function finishSocial(s,id,stage){
 const def=SOCIAL_SCENES[id],q=s.socialStories?.[id];if(!def||!q?.playback||q.stage!==stage||![0,1,2].includes(stage))return false;
 if(stage===0){
  if(!q.outfitChoice)return false;
  q.outfit=clone({lead:{wear:s.girls[def.lead].wear,dyes:s.girls[def.lead].dyes},hero:{wear:s.hero.wear,dyes:s.hero.dyes}});q.stage=1;
 }else if(stage===1){
  if(!q.approach||!q.response)return false;
  q.stage=2;q.nameUnlocked=true;q.topics=[def.topic[0]];q.invitation={id:`${id}-next`,accepted:q.response==='yes',used:false};
  addAffection(s,def.lead,3,false);s.flags[`social:${id}`]=true;
 }else{
  if(!q.followupDecision)return false;
  const accept=q.followupDecision==='accept';q.followup=accept?'done':'later';q.followupAt=clock(s).absolute;
  q.invitation??={id:`${id}-next`,accepted:false,used:false};q.invitation.accepted=accept;q.invitation.used=accept;
  if(accept&&!q.followupRewarded){addAffection(s,def.lead,1,false);q.followupRewarded=true;}
  q.followupDecision=null;
 }
 q.playback=null;return true;
}
export function socialMatches(s,condition){const[id,key,value]=condition.split(':');return s.socialStories?.[id]?.[key]===value;}
export function socialFollowUpReady(s,girl){return SOCIAL_IDS.find(id=>SOCIAL_SCENES[id].lead===girl&&socialStatus(s,id).followupAvailable)??null;}

// ------------------------------------------------------------------ randomness

/** A number in [0, 1) that depends only on the save's seed and the given parts. */
export function chance(s, ...parts) {
  let h = (s.seed ?? 1) >>> 0;
  for (const part of parts) {
    for (const ch of String(part)) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
  }
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 2 ** 32;
}
const pickBy = (list, r) => list[Math.floor(r * list.length) % list.length];

// ------------------------------------------------------------------ daily wishes

/** Style points an outfit needs to satisfy a wish to see the hero in that style. */
export const WISH_STYLE = 4;
/** Affection a granted wish brings, on top of the gesture itself and outside the daily cap. */
export const WISH_AFFECTION = 5;

/**
 * Each morning one senior the hero has met wishes for something small: a
 * present, a way of being spoken to, an outing or a look. Granting it the
 * same day brings extra affection. Her wish also hints at what she likes.
 */
function rollWish(s) {
  const met = HEROINE_IDS.filter(id => s.girls[id].met);
  if (!met.length) {
    s.wish = null;
    return;
  }
  const girl = pickBy(met, chance(s, 'wish-girl', s.day)),
    h = HEROINES[girl],
    g = s.girls[girl];
  const kinds = ['gift', 'chat', 'style'];
  if (g.aff >= DATE_AFFECTION) kinds.push('date');
  const kind = pickBy(kinds, chance(s, 'wish-kind', s.day));
  const wish = { girl, day: s.day, kind, done: false };
  if (kind === 'gift') wish.item = pickBy([...h.gifts.love, ...h.gifts.like].filter(id => SHOPS.giftshop.stock.includes(id)), chance(s, 'wish-item', s.day));
  if (kind === 'chat') {
    const middle = (h.pace[0] + h.pace[1]) / 2;
    wish.approach = middle - g.pull > 7 ? 'closer' : middle - g.pull < -7 ? 'space' : 'steady';
  }
  if (kind === 'style') wish.style = pickBy(h.likes, chance(s, 'wish-style', s.day));
  if (kind === 'date') wish.spot = pickBy(DATE_SPOTS, chance(s, 'wish-spot', s.day)).id;
  s.wish = wish;
}

/** Today's wish of this senior, if she has one still open. */
export function wishFor(s, girl) {
  const w = s.wish;
  return w && w.girl === girl && w.day === s.day && !w.done ? w : null;
}

function grantWish(s) {
  const w = s.wish;
  w.done = true;
  s.counters.wish = (s.counters.wish ?? 0) + 1;
  return addAffection(s, w.girl, WISH_AFFECTION, false);
}

// ------------------------------------------------------------------ campus events

/** How likely a small event is when the hero walks into a place, at most once per part of the day. */
export const EVENT_CHANCE = 0.34;

/** Can this event happen here and now? */
export function eventFits(s, ev, place) {
  if (!ev.places.includes(place)) return false;
  if (ev.slots && !ev.slots.includes(s.slot)) return false;
  if (ev.from && s.day < ev.from) return false;
  if (s.flags['event:' + ev.id] && !ev.again) return false;
  if (ev.girl && !(s.girls[ev.girl].met && whereIs(s, ev.girl) === place)) return false;
  if (ev.money && s.money < ev.money) return false;
  return true;
}

/**
 * Perhaps start a small event on entering a place. Returns the event (its
 * script is played by the campus screen), or null. Events the hero has
 * already seen this term do not come back unless marked `again`.
 */
export function rollEvent(s, place) {
  const at = clock(s).absolute;
  if (s.eventDay === at || s.finale) return null;
  if (chance(s, 'event', at, place) >= EVENT_CHANCE) return null;
  const fits = EVENTS.filter(ev => eventFits(s, ev, place));
  if (!fits.length) return null;
  // Events with a senior come up a little more often than the ones without.
  const weights = fits.map(ev => (ev.girl ? 2 : 1));
  let r = chance(s, 'event-pick', at, place) * weights.reduce((a, b) => a + b, 0);
  const ev = fits.find((_, i) => (r -= weights[i]) < 0) ?? fits[0];
  s.eventDay = at;
  s.flags['event:' + ev.id] = true;
  s.counters.event = (s.counters.event ?? 0) + 1;
  return ev;
}

// ------------------------------------------------------------------ memories across terms

/** A fresh record of everything kept between terms. */
export const newMemories = () => ({ version: 1, terms: 0, endings: {}, achievements: {}, events: {}, best: 0 });

/** Ending key for the album: '<girl>:love', '<girl>:friend' or 'solo'. */
export const endingKey = (girl, result) => (girl ? `${girl}:${result}` : 'solo');

/**
 * Add a finished term to the memories. Returns what is new: endings and
 * achievements seen for the first time, and the perks they unlock.
 */
export function recordTerm(memories, s, girl, result) {
  const m = memories;
  m.terms += 1;
  const fresh = { endings: [], achievements: [], perks: [] };
  const key = endingKey(girl, result);
  if (!m.endings[key]) fresh.endings.push(key);
  m.endings[key] = (m.endings[key] ?? 0) + 1;
  for (const id of Object.keys(s.flags)) if (id.startsWith('event:')) m.events[id.slice(6)] = true;
  m.best = Math.max(m.best, ...HEROINE_IDS.map(id => s.girls[id].aff));
  const before = new Set(unlockedPerks(m).map(p => p.id));
  for (const a of ACHIEVEMENTS)
    if (!m.achievements[a.id] && a.test(s, { girl, result, memories: m })) {
      m.achievements[a.id] = true;
      fresh.achievements.push(a.id);
    }
  fresh.perks = unlockedPerks(m)
    .filter(p => !before.has(p.id))
    .map(p => p.id);
  return fresh;
}

/** Perks the memories have earned, to choose one from at the start of a new term. */
export const unlockedPerks = m => PERKS.filter(p => !p.needs || m.achievements[p.needs]);

export function readMemories(text) {
  try {
    const m = JSON.parse(text);
    if (m?.version === 1) return { ...newMemories(), ...m };
  } catch {
    /* fall through */
  }
  return newMemories();
}
