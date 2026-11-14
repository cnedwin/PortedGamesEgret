// People: how one is made, what their numbers mean, and how they grow.
//
// A person is plain data so that a save is just the world written out:
//   stats    arm, waist, leg, nei (inner strength), agi (footwork), wit, dart
//   apt      aptitude 20 to 100 in fist, blade, pole, dart, inner; sets training speed
//   arts     mastery points per art id (100 points to a level, ten levels)
//   wheel    the order they throw their moves in a fight
//   rank     0 servant, 1 outer, 2 inner, 3 personal disciple, 4 elder, 5 leader
import { ART_BY_ID, ARTS, CLASSES, MAX_LEVEL, POINTS_PER_LEVEL, commonArt, levelOf, sectArts, unmetNeeds } from '../data/arts.mjs';
import { GRADES } from '../data/goods.mjs';
import { APTITUDES } from '../data/places.mjs';
import { SECT_BY_ID } from '../data/sects.mjs';
import { clamp } from './rng.mjs';

export const STAT_KEYS = ['arm', 'waist', 'leg', 'nei', 'agi', 'wit', 'dart'];
export const STAT_NAMES = { arm: '臂力', waist: '腰力', leg: '腿力', nei: '内力', agi: '身法', wit: '悟性', dart: '暗器' };
export const APT_NAMES = { fist: '拳脚', blade: '刀剑', pole: '枪棍', dart: '暗器', inner: '内奇' };
export const STAT_CAP = { arm: 300, waist: 300, leg: 300, nei: 300, agi: 250, wit: 100, dart: 250 };
export const LEVEL_CAP = 50;

const SURNAMES = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董梁杜阮蓝闵席季'.split(
  '',
);
const GIVEN_MALE = '山川海岳峰石松柏云霆雷锋毅刚强勇武威远志鸿飞鹏翔龙虎豹麟骏驰安平宁定和顺德仁义礼信忠孝廉明哲思敏达通玄真清虚静'.split('');
const GIVEN_FEMALE = '兰梅竹菊莲荷蓉蕙芷若琴瑟筝箫月霜雪露霞虹烟雨晴岚素青碧紫丹朱婉柔静淑慧敏灵秀雅清宁婵娟瑶琼珠璧'.split('');

/** Where a recruit comes from; each background nudges a few numbers. */
export const ORIGINS = [
  { name: '猎户', stats: { arm: 8, agi: 6 } },
  { name: '镖师', stats: { arm: 6, waist: 6 } },
  { name: '书生', stats: { wit: 12, arm: -6 } },
  { name: '富家子', stats: { wit: 4 }, fee: 60 },
  { name: '逃兵', stats: { waist: 8, leg: 4 }, loyalty: -8 },
  { name: '农家', stats: { leg: 6, waist: 4 } },
  { name: '渔家', stats: { agi: 8 } },
  { name: '药童', stats: { wit: 6, nei: 6 } },
  { name: '孤儿', stats: {}, loyalty: 10 },
  { name: '江湖艺人', stats: { agi: 6, dart: 10 } },
];

/** Traits shape what a disciple wants; see loyalty in world.mjs. */
export const TRAITS = {
  diligent: { name: '勤勉', train: 0.1 },
  lazy: { name: '懒散', train: -0.1 },
  proud: { name: '高傲', wants: 'rank' },
  greedy: { name: '贪财', wants: 'pay' },
  loyal: { name: '重义', loyalty: 1 },
  restless: { name: '好动', wants: 'fight' },
  studious: { name: '好学', wants: 'train' },
  gentle: { name: '温和', wants: 'lenient' },
  stern: { name: '严肃', wants: 'strict' },
};
const TRAIT_KEYS = Object.keys(TRAITS);

function makeName(rng, female) {
  const pool = female ? GIVEN_FEMALE : GIVEN_MALE;
  return rng.pick(SURNAMES) + rng.pick(pool) + (rng.chance(0.6) ? rng.pick(pool) : '');
}

/**
 * Rolls a newcomer.
 * @param rng     the world's random source
 * @param quality the mean aptitude to aim for (40 is ordinary, 80 exceptional)
 * @param lean    the aptitude the stronghold favours, raised by 15
 */
export function rollPerson(rng, { quality = 40, lean = undefined, school, place, female = rng.chance(0.4) } = {}) {
  const origin = rng.pick(ORIGINS);
  const stat = (base) => Math.round(clamp(base + rng.range(-18, 18) + (quality - 40) * 0.4, 30, 100));
  const stats = { arm: stat(55), waist: stat(55), leg: stat(55), nei: stat(50), agi: stat(50), wit: stat(55), dart: stat(40) };
  for (const [key, bonus] of Object.entries(origin.stats)) stats[key] = clamp(stats[key] + bonus, 20, 100);
  const apt = {};
  for (const key of APTITUDES) apt[key] = Math.round(clamp(quality + rng.range(-22, 22) + (key === lean ? 15 : 0), 20, 100));
  const traits = [rng.pick(TRAIT_KEYS)];
  if (rng.chance(0.4)) {
    const second = rng.pick(TRAIT_KEYS);
    if (!traits.includes(second)) traits.push(second);
  }
  return {
    id: 0,
    name: makeName(rng, female),
    female,
    age: rng.int(15, 24),
    origin: origin.name,
    school,
    place,
    rank: 0,
    level: 1,
    xp: 0,
    /** Individual health factor, 0.85 to 1.15. */
    vigor: Math.round(rng.range(0.85, 1.15) * 100) / 100,
    stats,
    apt,
    traits,
    loyalty: clamp(60 + (origin.loyalty ?? 0), 0, 100),
    arts: {},
    insights: [],
    wheel: [],
    gear: { weapon: null, armor: 0 },
    job: { kind: 'rest' },
    master: null,
    /** How much each stat was exercised since the last level; drives growth. */
    used: {},
    wounds: 0,
    bonePills: 0,
    fee: origin.fee ?? 6,
  };
}

/** A sect's leader, built to the sect's design rather than rolled. */
export function makeLeader(rng, sectId, level = 30) {
  const sect = SECT_BY_ID[sectId];
  const person = rollPerson(rng, { quality: 82, school: sectId, place: sect.seat, female: sect.leader.female });
  Object.assign(person, { name: sect.leader.name, age: sect.leader.age, rank: 5, loyalty: 100, origin: '掌门', traits: ['loyal'] });
  growTo(person, level);
  // A leader has the common arts of the sect's two classes and all of its own.
  for (const klass of new Set([sect.main, sect.second, 'inner'])) for (const tier of [1, 2, 3]) person.arts[commonArt(klass, tier).id] = 800;
  for (const art of sectArts(sectId)) {
    for (const tier of [1, 2, 3]) person.arts[commonArt(art.klass, tier).id] ??= 700;
    person.arts[art.id] = art.tier === 5 ? 600 : 800;
    if (art.tier === 5) person.insights.push(art.id);
  }
  equipFor(person, 5);
  person.wheel = autoWheel(person);
  return person;
}

/** Raises a person straight to a level, as if they had trained evenly. */
export function growTo(person, level) {
  while (person.level < level) {
    person.level++;
    for (const key of ['arm', 'waist', 'leg', 'nei', 'agi']) person.stats[key] = Math.min(STAT_CAP[key], person.stats[key] + 4);
    person.stats.dart = Math.min(STAT_CAP.dart, person.stats.dart + 4);
  }
  return person;
}

/** Gives a person the weapon their best art needs and a robe, both at `grade`. */
export function equipFor(person, grade) {
  const art = bestCombatArt(person);
  const slot = art ? CLASSES[art.klass].weapon : null;
  person.gear = { weapon: slot ? { slot, grade } : null, armor: grade };
  return person;
}

// ---- numbers derived from a person ----------------------------------------------------------

export const hpMax = (person) => Math.round((400 + 190 * person.level) * person.vigor);
export const neiMax = (person) => person.stats.nei * 8;
export const staminaMax = (person) => (person.stats.arm + person.stats.waist + person.stats.leg) * 2;

/** Mastery level of the person's deepest inner art, weighted a little by tier. */
export function innerDepth(person) {
  let best = 0;
  for (const [id, points] of Object.entries(person.arts)) {
    const art = ART_BY_ID[id];
    if (art?.klass === 'inner') best = Math.max(best, levelOf(points));
  }
  return best;
}

/** Total defence: robe, waist and inner art. */
export function defense(person) {
  return (GRADES[person.gear.armor]?.defense ?? 0) + person.stats.waist / 4 + innerDepth(person) * 3;
}

/** Seconds between a person's moves. */
export const attackInterval = (person) => (3 * 100) / (100 + person.stats.agi / 2);

/** The strike art a person fights best with: highest tier, then mastery. */
export function bestCombatArt(person) {
  let best = null,
    score = -1;
  for (const [id, points] of Object.entries(person.arts)) {
    const art = ART_BY_ID[id];
    if (!art || !CLASSES[art.klass].combat || levelOf(points) < 1) continue;
    const value = art.tier * 100 + levelOf(points);
    if (value > score) (best = art), (score = value);
  }
  return best;
}

/** Moves of an art the person has reached. */
export const knownMoves = (person, art) => art.moves.filter((move) => levelOf(person.arts[art.id] ?? 0) >= move.level);

/** A default move order: every known move of the best art, strongest last. */
export function autoWheel(person) {
  const art = bestCombatArt(person);
  if (!art) return [];
  const slots = [0, 4, 6, 8, 8, 8][person.rank] || 4;
  const moves = knownMoves(person, art);
  const wheel = [];
  for (let i = 0; i < slots; i++) wheel.push({ art: art.id, move: art.moves.indexOf(moves[i % moves.length]), link: 'power' });
  return wheel;
}

// ---- training and growth ----------------------------------------------------------------------

/**
 * Mastery points one watch of practice adds.
 * @param site  level of the training ground (0 if none)
 * @param tutor bonus from a master, 0 to 0.3
 * @param boost other multipliers already combined (offices, traits, rules)
 */
export function trainingRate(person, art, site = 1, tutor = 0, boost = 0) {
  const aptitude = person.apt[CLASSES[art.klass].aptitude];
  return ((1 * aptitude) / 50) * (1 + 0.1 * site) * (1 + tutor) * (1 + boost) / art.tier;
}

/** Adds practice to an art; returns the new mastery level if it rose. */
export function practise(person, art, points) {
  const before = levelOf(person.arts[art.id] ?? 0);
  person.arts[art.id] = Math.min(MAX_LEVEL * POINTS_PER_LEVEL, (person.arts[art.id] ?? 0) + points);
  for (const key of CLASSES[art.klass].attrs) person.used[key] = (person.used[key] ?? 0) + points;
  const after = levelOf(person.arts[art.id]);
  return after > before ? after : 0;
}

/**
 * Experience needed to leave a level. Set so that someone who trains steadily under a master is fit
 * to be taken as a personal disciple (level 20) in about five years and to sit as an elder (level 30)
 * in about twelve: within a game, not beyond it.
 */
export const xpToNext = (level) => Math.round(100 * level ** 1.35);

/** Adds experience and applies any levels gained; returns how many. */
export function gainXp(person, amount) {
  person.xp += amount;
  let gained = 0;
  while (person.level < LEVEL_CAP && person.xp >= xpToNext(person.level)) {
    person.xp -= xpToNext(person.level);
    person.level++;
    gained++;
    // Each stat grows 0 to 3 by how much it was used this level, plus a floor of one for the body stats.
    const total = Object.values(person.used).reduce((sum, value) => sum + value, 0) || 1;
    for (const key of ['arm', 'waist', 'leg', 'nei', 'agi', 'dart']) {
      const share = (person.used[key] ?? 0) / total;
      const rise = Math.min(3, Math.round(share * 9)) + (key === 'dart' ? 0 : 1);
      person.stats[key] = Math.min(STAT_CAP[key], person.stats[key] + rise);
    }
    person.used = {};
  }
  return gained;
}

/**
 * The arts a person could start now, for menus and for the game's own sects.
 * @param held the arts their sect can teach; left out, every art is taken to be on offer
 */
export function learnableArts(person, held = null) {
  return ARTS.filter((art) => levelOf(person.arts[art.id] ?? 0) < MAX_LEVEL && unmetNeeds(person, art, held).length === 0);
}

/** A rough single number for how dangerous a person is in a fight. */
export function prowess(person) {
  const art = bestCombatArt(person);
  if (!art) return Math.round(hpMax(person) / 20);
  const move = art.moves[0];
  const weapon = person.gear.weapon ? GRADES[person.gear.weapon.grade].attack : 0;
  const main = CLASSES[art.klass].attrs.reduce((sum, key) => sum + person.stats[key], 0) / CLASSES[art.klass].attrs.length;
  const hit = (move.power + weapon) * (1 + main / 200) * (1 + 0.05 * levelOf(person.arts[art.id]));
  return Math.round((hit / attackInterval(person)) * (hpMax(person) * (1 + defense(person) / 100)) ** 0.5);
}
