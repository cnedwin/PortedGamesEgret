// 武将的第六项能力"机动"与五个兵种的适性（S、A、B、C）：都从五项能力和特性算出，不另记数据。机动快的将领带兵在
// 战场上走得快；适性高的兵种打得更好（S 加百分之六，A 加三，B 不加，C 减五）。
// A general's sixth ability, mobility, and his aptitude (S, A, B or C) for each of the five arms: all worked out from
// the five abilities and the traits, with no data of their own. A mobile general's troops move faster on the field; an
// arm he is apt for fights better (S six in a hundred, A three, B none, C five fewer).
import { GENERALS } from '../data/generals.mjs';
import { TRAITS } from '../data/traits.mjs';

export const ARMS = ['inf', 'cav', 'bow', 'siege', 'navy'];
const GRADE_BONUS = { S: 0.06, A: 0.03, B: 0, C: -0.05 };

function effect(g, key) {
  let sum = 0;
  for (const t of g.traits) sum += TRAITS[t]?.effects[key] ?? 0;
  return sum;
}
function jitter(id, salt) {
  let h = 2166136261;
  for (const c of id + salt) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/** Mobility, 10 to 99: how quickly a general moves his men. */
export function mobility(id) {
  const g = GENERALS[id];
  if (!g) return 45;
  const s = g.stats;
  const v = s.war * 0.45 + s.lead * 0.25 + s.int * 0.12 + effect(g, 'cav') * 0.8 + effect(g, 'spd') * 1.5 + effect(g, 'march') * 0.6 + 10 + (jitter(id, 'm') - 0.5) * 14;
  return Math.max(10, Math.min(99, Math.round(v)));
}

/** Aptitude for each arm, as a letter. */
export function aptitudes(id) {
  const g = GENERALS[id];
  const out = {};
  if (!g) {
    for (const a of ARMS) out[a] = 'C';
    return out;
  }
  const { lead, war, int } = g.stats;
  const south = g.camp === 'U' || ['wu', 'kuaiji', 'danyang', 'lujiang', 'jianye', 'chaisang', 'yuzhang', 'jiangling', 'xiakou', 'changsha', 'guangling', 'jiangzhou'].includes(g.home);
  const score = {
    inf: lead * 0.5 + war * 0.45 + effect(g, 'inf') * 2.2,
    cav: war * 0.55 + lead * 0.35 + effect(g, 'cav') * 2.2 - (int > war + 25 ? 8 : 0),
    bow: war * 0.32 + int * 0.25 + lead * 0.38 + effect(g, 'bow') * 2.2,
    siege: int * 0.5 + lead * 0.32 + effect(g, 'siege') * 1.6 + effect(g, 'tech') * 0.3,
    navy: lead * 0.42 + int * 0.28 + war * 0.18 + effect(g, 'navy') * 1.5 + (south ? 12 : 0)
  };
  for (const a of ARMS) {
    const v = score[a] + (jitter(id, a) - 0.5) * 6;
    out[a] = v >= 90 ? 'S' : v >= 76 ? 'A' : v >= 60 ? 'B' : 'C';
  }
  return out;
}

/** The arm a kind of troops belongs to. */
export const armOf = (group) => (group === 'cav' ? 'cav' : group === 'bow' ? 'bow' : group === 'siege' ? 'siege' : group === 'navy' ? 'navy' : 'inf');

/** How much better (or worse) a general fights with an arm: a factor near 1. */
export function aptitudeFactor(id, group) {
  if (!id) return 1;
  return 1 + GRADE_BONUS[aptitudes(id)[armOf(group)]];
}
