// 规则的公共部分：种子随机数（状态存在局面里，存档读档后接着走）、历法（一年十二个月、每月三十天）、
// 以及把特性、科技、宝物的效果加起来。规则不碰页面也不碰引擎，能在 Node 里用固定种子跑。
// The shared part of the rules: seeded random numbers (their state lives in the game, so a loaded save goes on from
// where it was), the calendar (twelve months of thirty days), and adding up the effects of traits, inventions and
// treasures. The rules touch neither the page nor the engine and run in Node from a fixed seed.
import { GENERALS } from '../data/generals.mjs';
import { TECHS } from '../data/techs.mjs';
import { TRAITS } from '../data/traits.mjs';
import { TREASURES } from '../data/treasures.mjs';

export const START_YEAR = 184;
export const END_YEAR = 280;
export const DAYS_IN_MONTH = 30;
export const DAYS_IN_YEAR = 360;

/** A random number in [0, 1) from the game's own generator (mulberry32), moving its state on. */
export function random(state) {
  let a = (state.rng = (state.rng + 0x6d2b79f5) >>> 0);
  a = Math.imul(a ^ (a >>> 15), a | 1);
  a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}
export const chance = (state, p) => random(state) < p;
export const pick = (state, list) => list[Math.floor(random(state) * list.length)];
export const between = (state, lo, hi) => lo + random(state) * (hi - lo);

/** The date of a day count: { year, month (1-12), day (1-30) }. */
export function dateOf(day) {
  return {
    year: START_YEAR + Math.floor(day / DAYS_IN_YEAR),
    month: 1 + Math.floor((day % DAYS_IN_YEAR) / DAYS_IN_MONTH),
    day: 1 + (day % DAYS_IN_MONTH)
  };
}
export const dayOf = (year, month = 1, day = 1) => (year - START_YEAR) * DAYS_IN_YEAR + (month - 1) * DAYS_IN_MONTH + (day - 1);
export const yearOf = (state) => dateOf(state.day).year;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** The sum of one effect over a general's traits and treasures (0 when he has none). */
export function generalEffect(state, id, key) {
  const g = GENERALS[id];
  let sum = 0;
  for (const t of g.traits) sum += TRAITS[t]?.effects[key] ?? 0;
  for (const tr of state.generals[id]?.treasures ?? []) sum += TREASURES[tr]?.effects[key] ?? 0;
  return sum;
}

/** The sum of one effect over a faction's inventions. */
export function techEffect(state, factionId, key) {
  const f = state.factions[factionId];
  if (!f) return 0;
  let sum = 0;
  for (const id of f.techs) sum += TECHS[id]?.effects[key] ?? 0;
  return sum;
}

/** A general's ability now: his own, raised by his treasures and by experience. */
export function stat(state, id, key) {
  const g = GENERALS[id],
    s = state.generals[id];
  let v = g.stats[key] + (s?.exp?.[key] ?? 0);
  for (const tr of s?.treasures ?? []) if (TREASURES[tr]?.ability === key) v += TREASURES[tr].amount;
  return Math.min(120, v);
}

// Officers the tale keeps for the player's own events (Xun Yu coming to Cao Cao, the cottage of Zhuge Liang): the
// computer's lords do not win them over while the player's power stands.
const RESERVED = { caocao: ['xunyu', 'guojia', 'xunyou'], liubei: ['zhugeliang'] };
export const reserved = (state, id, factionId) => factionId !== state.player && Boolean(state.factions[state.player]?.alive) && (RESERVED[state.branch] ?? []).includes(id);

// The ids of a game's generals, kept as a list: asked for many times a day, and changed only when someone new appears.
const IDS = new WeakMap();
export function generalIds(state) {
  let ids = IDS.get(state.generals);
  if (!ids) IDS.set(state.generals, (ids = Object.keys(state.generals)));
  return ids;
}
export const forgetGeneralIds = (state) => IDS.delete(state.generals);

/** Generals serving a faction, optionally at one place. */
export function serving(state, factionId, at) {
  const list = [],
    all = state.generals;
  for (const id of generalIds(state)) {
    const s = all[id];
    if (s.status === 'serving' && s.faction === factionId && (at === undefined || s.at === at)) list.push(id);
  }
  return list;
}

/** Two-character surnames, for telling kin by name. */
const DOUBLE = ['诸葛', '司马', '夏侯', '公孙', '皇甫', '太史', '淳于', '毌丘', '钟离', '鲜于', '濮阳', '北宫', '成公', '令狐'];
export function surname(id) {
  const zh = GENERALS[id].zh;
  return DOUBLE.find((d) => zh.startsWith(d)) ?? zh[0];
}

/** Add a line to the log the player reads: a key of the word table and its values. */
export function note(state, key, values = {}, who = null) {
  state.log.unshift({ day: state.day, key, values, who });
  if (state.log.length > 200) state.log.length = 200;
}
