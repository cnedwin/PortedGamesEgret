// Disciples as people: how gifted one is, how a roster is ranked, what a
// disciple's temper asks for, the record of their years in the sect, and
// the work each is best put to.
//
// Nothing here needs a page. The record and the pleas are kept only for the
// player's own people, so a save does not grow with every sect in the world.
import { ART_BY_ID, CLASSES, levelOf } from '../data/arts.mjs';
import { BUILDINGS } from '../data/goods.mjs';
import { PLACE_BY_ID } from '../data/places.mjs';
import { heldArts } from './library.mjs';
import { APT_NAMES, LEVEL_CAP, STAT_KEYS, STAT_NAMES, TRAITS, gainXp, learnableArts, prowess } from './persons.mjs';
import { clamp } from './rng.mjs';

const members = (state, sectId) => Object.values(state.persons).filter((person) => person.school === sectId);

// ---- quality --------------------------------------------------------------------------------------------

/**
 * The five grades of gift, lowest first. `at` is the least aptitude score
 * that earns the grade. A newcomer to a little-known sect is most often
 * ordinary or fair; the two highest grades come with renown, or by luck.
 */
export const QUALITIES = [
  { id: 'common', name: '凡品', at: 0, about: '资质平平，胜在肯下苦功' },
  { id: 'fair', name: '良品', at: 50, about: '中人之资，循序渐进可成器' },
  { id: 'fine', name: '上品', at: 60, about: '天资不俗，值得悉心栽培' },
  { id: 'rare', name: '极品', at: 70, about: '百里挑一的好苗子' },
  { id: 'peerless', name: '绝世', at: 82, about: '不世出的奇才，可遇不可求' },
];

/**
 * One number for a person's gifts, 20 to 100: their best aptitude counts
 * most, then their second, then the run of all five. Aptitude sets how fast
 * an art is learned, so this is how fast the person can be brought on.
 */
export function aptitudeScore(person) {
  const values = Object.values(person.apt).sort((a, b) => b - a);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round((2 * values[0] + values[1] + 2 * mean) / 5);
}

/** Index into QUALITIES for a person. */
export function qualityOf(person) {
  const score = aptitudeScore(person);
  let grade = 0;
  QUALITIES.forEach((quality, index) => {
    if (score >= quality.at) grade = index;
  });
  return grade;
}

// ---- ranking --------------------------------------------------------------------------------------------

/**
 * What a roster can be ranked by: `[key, label, value(person)]`. The first
 * few are the whole person; then the seven stats; then the five aptitudes.
 */
export const RANKINGS = [
  ['prowess', '战力', (person) => prowess(person)],
  ['quality', '资质', (person) => aptitudeScore(person)],
  ['level', '等级', (person) => person.level],
  ...STAT_KEYS.map((key) => [key, STAT_NAMES[key], (person) => Math.round(person.stats[key])]),
  ...Object.keys(APT_NAMES).map((key) => ['apt:' + key, APT_NAMES[key] + '资质', (person) => person.apt[key]]),
  ['loyalty', '忠诚', (person) => Math.round(person.loyalty)],
  ['age', '年龄', (person) => person.age],
];
const RANKING_BY_KEY = Object.fromEntries(RANKINGS.map((row) => [row[0], row]));
export const rankingLabel = (key) => RANKING_BY_KEY[key]?.[1] ?? '';
export const rankingValue = (person, key) => RANKING_BY_KEY[key]?.[2](person) ?? 0;

/**
 * People in order by one of RANKINGS, best first unless `ascending`. Ties go
 * to the higher standing, then to whoever joined first.
 */
export function ranked(people, key, ascending = false) {
  const value = RANKING_BY_KEY[key]?.[2] ?? RANKING_BY_KEY.prowess[2];
  const sign = ascending ? 1 : -1;
  return [...people]
    .map((person) => [person, value(person)])
    .sort((a, b) => sign * (a[1] - b[1]) || b[0].rank - a[0].rank || a[0].id - b[0].id)
    .map(([person]) => person);
}

// ---- temper ---------------------------------------------------------------------------------------------

/** What each trait means for the player, in a few words. */
export const TRAIT_NOTES = {
  diligent: '修练快一成',
  lazy: '修练慢一成',
  proud: '久不晋升便生怨',
  greedy: '欠薪时格外不满',
  loyal: '忠诚每旬自增',
  restless: '坐不住，想下山闯荡',
  studious: '有武可练便安心',
  gentle: '待人宽和，善调停',
  stern: '律己律人，眼里不揉沙',
};

/** What a person of each temper says when something goes well for them. */
const WORDS = {
  diligent: '“不过是比旁人多练了几遍。”',
  lazy: '“早知道这么累……不过，还挺痛快。”',
  proud: '“这有何难？”',
  greedy: '“练成了，月例是不是也该涨一涨？”',
  loyal: '“弟子不敢忘师门栽培。”',
  restless: '“掌门，什么时候让我下山试试手？”',
  studious: '“越往上走，越觉得不懂的还多。”',
  gentle: '“都是师兄师姐们教得好。”',
  stern: '“尚有三处破绽，容弟子再练。”',
};
export const wordsOf = (person) => WORDS[person.traits?.[0]] ?? '“谢掌门成全。”';

// ---- a disciple's years ---------------------------------------------------------------------------------

const LIFE_LIMIT = 40;
const watched = (state, person) => person && person.school === state.playerSect && !state.options?.autoPlayer;

/**
 * Writes a line into a disciple's record. With `moment`, the line is also
 * told to the player when it happens: it goes into the chronicle as a
 * moment, with the person it belongs to.
 */
export function remember(state, person, text, { moment = false } = {}) {
  if (!watched(state, person)) return;
  const life = (person.life ??= []);
  life.push({ day: state.day, text });
  if (life.length > LIFE_LIMIT) life.splice(1, life.length - LIFE_LIMIT);
  if (moment) state.log.push({ day: state.day, type: 'moment', text: `${person.name}${text}。`, sect: person.school, person: person.id });
}

/** Marks in an art's mastery that are worth a line: first steps, fit to teach, complete. */
const ART_MARKS = { 3: '初窥门径', 6: '已可授徒', 10: '功行圆满' };
/** Levels at which a disciple has come far enough to be told so. */
const LEVEL_MARKS = { 10: '已是可造之材', 20: '堪为亲传', 30: '足以开坛授业', 40: '当世少有敌手', [LEVEL_CAP]: '已臻化境' };

/** Records an art reaching a new level, if it is one of the marks. */
export function rememberArt(state, person, art, level) {
  const mark = ART_MARKS[level];
  if (!mark || !watched(state, person)) return;
  // The first art a disciple completes is a day to remember; later ones are noted quietly.
  const first = level === 10 && !person.peaked;
  if (first) person.peaked = true;
  remember(state, person, `将${art.name}练到${{ 3: '三', 6: '六', 10: '十' }[level]}重，${mark}`, { moment: first });
}

/** Adds experience, and records it when a level worth telling is passed. */
export function grow(state, person, amount) {
  const before = person.level;
  const gained = gainXp(person, amount);
  if (gained && watched(state, person)) for (let level = before + 1; level <= person.level; level++) if (LEVEL_MARKS[level]) remember(state, person, `修为到了 ${level} 级，${LEVEL_MARKS[level]}`);
  return gained;
}

// ---- what a temper asks for -------------------------------------------------------------------------------

/**
 * Now and then a disciple brings something to the leader, each by their
 * temper. A plea has a few answers; `gives` may hold:
 *   loyalty  the disciple's loyalty      all     every disciple's loyalty
 *   xp       the disciple's experience   allXp   every disciple's experience
 *   wit      the disciple's wit          silver, renown   the sect's
 *   wound    a light wound               heal    wounds mended
 *   job      a job the disciple is put to
 */
export const PLEAS = {
  diligent: {
    title: '废寝忘食',
    text: (p) => `${p.name}练功过了头，手上磨出血泡仍不肯歇，教头来请掌门示下。`,
    choices: [
      { label: '命其歇息三日', hint: '伤势尽愈，忠诚 +6', gives: { heal: true, loyalty: 6 }, text: (p) => `${p.name}被按着歇了三日，嘴上不说，心里是暖的。` },
      { label: '由他去', hint: '经验 +200，带些轻伤', gives: { xp: 200, wound: 0.1 }, text: (p) => `${p.name}咬牙练了下去，功夫又深了一层。` },
    ],
  },
  lazy: {
    title: '偷懒被抓',
    text: (p) => `${p.name}练功时靠着兵器架打瞌睡，被教头抓了个正着。`,
    choices: [
      { label: '罚扫山门三日', hint: '忠诚 −4，经验 +150', gives: { loyalty: -4, xp: 150 }, text: (p) => `${p.name}扫了三日石阶，此后倒也不敢再睡。` },
      { label: '一笑置之', hint: '忠诚 +5', gives: { loyalty: 5 }, text: (p) => `${p.name}挠挠头：“掌门大度，弟子下回一定站着睡。”` },
    ],
  },
  proud: {
    title: '心高气傲',
    text: (p) => `${p.name}自觉本事不在师兄之下，来问掌门：何时才轮到自己出头？`,
    choices: [
      { label: '当众嘉许', hint: '忠诚 +8', gives: { loyalty: 8 }, text: (p) => `${p.name}昂着头走了出去，练功比往日更卖力。` },
      { label: '让其再磨一磨', hint: '忠诚 −4，悟性 +1', gives: { loyalty: -4, wit: 1 }, text: (p) => `${p.name}憋了一肚子气，回去把一招使了三百遍。` },
    ],
  },
  greedy: {
    title: '预支月例',
    text: (p) => `${p.name}说家里要翻修屋子，想预支三个月的月例。`,
    choices: [
      { label: '准了', hint: '银 −60，忠诚 +10', cost: 60, gives: { loyalty: 10 }, text: (p) => `${p.name}接过银子，千恩万谢地去了。` },
      { label: '门规不许', hint: '忠诚 −5', gives: { loyalty: -5 }, text: (p) => `${p.name}嘟囔了几句，悻悻而退。` },
    ],
  },
  loyal: {
    title: '倾囊相助',
    text: (p) => `${p.name}把攒下的月例交到账房，说要为山门添几片瓦。`,
    choices: [
      { label: '收下，记其一功', hint: '银 +80，忠诚 +3', gives: { silver: 80, loyalty: 3 }, text: (p) => `账簿上添了${p.name}的名字，门人都看在眼里。` },
      { label: '退回，另加赏赐', hint: '银 −40，忠诚 +10', cost: 40, gives: { loyalty: 10 }, text: (p) => `${p.name}红了眼眶：“弟子这条命，是山门的。”` },
    ],
  },
  restless: {
    title: '静极思动',
    text: (p) => `${p.name}在山上待得发闷，来求掌门放自己下山走一遭。`,
    choices: [
      { label: '准其下山历练', hint: '历练三十日，长进快而有险；忠诚 +6', gives: { loyalty: 6, job: 'travel' }, text: (p) => `${p.name}当晚就收拾好了包袱。` },
      { label: '留在山上练功', hint: '忠诚 −4', gives: { loyalty: -4 }, text: (p) => `${p.name}望着山门外的路，叹了口气。` },
    ],
  },
  studious: {
    title: '挑灯夜读',
    text: (p) => `${p.name}有一处关节怎么也想不通，夜里来敲掌门的门。`,
    choices: [
      { label: '亲自指点', hint: '经验 +300，忠诚 +5', gives: { xp: 300, loyalty: 5 }, text: (p) => `一番点拨，${p.name}豁然开朗。` },
      { label: '让其自悟', hint: '悟性 +1', gives: { wit: 1 }, text: (p) => `${p.name}在院中站到天明，终于自己想通了。` },
    ],
  },
  gentle: {
    title: '居中调停',
    text: (p) => `两名弟子起了争执，${p.name}出面劝开，来请掌门示下如何处置。`,
    choices: [
      { label: '交其全权处置', hint: '其忠诚 +6，全派忠诚 +1', gives: { loyalty: 6, all: 1 }, text: (p) => `${p.name}三言两语，两人握手言和。` },
      { label: '各打五十大板', hint: '全派忠诚 −1，威望 +2', gives: { all: -1, renown: 2 }, text: () => '门规森严的名声传了出去，门人却都有些怕了。' },
    ],
  },
  stern: {
    title: '整肃门风',
    text: (p) => `${p.name}直言门中有人练功敷衍，请掌门准自己督课一月。`,
    choices: [
      { label: '准其督课', hint: '全派经验 +60，全派忠诚 −1', gives: { allXp: 60, all: -1 }, text: (p) => `${p.name}板着脸站在演武场边，没人再敢偷懒。` },
      { label: '宽以待人', hint: '其忠诚 −3，全派忠诚 +1', gives: { loyalty: -3, all: 1 }, text: (p) => `${p.name}没再说什么，只是自己练得更狠了。` },
    ],
  },
};
/** Days before the same disciple brings something to the leader again. */
export const PLEA_REST = 240;

/** A disciple with something to ask, picked by `rng`; null when nobody has. */
export function pleaFor(state, rng) {
  const books = state.sects[state.playerSect];
  const ready = members(state, state.playerSect).filter((person) => person.rank <= 3 && person.id !== books.leaderId && person.traits?.some((key) => PLEAS[key]) && (person.pleaDay ?? -PLEA_REST) + PLEA_REST <= state.day);
  if (!ready.length) return null;
  const person = rng.pick(ready);
  return { kind: 'plea', person: person.id, trait: rng.pick(person.traits.filter((key) => PLEAS[key])) };
}

/** A plea laid out for the page, in the shape `pendingView` gives every event. */
export function pleaView(state, pending) {
  const person = state.persons[pending.person],
    plea = PLEAS[pending.trait];
  if (!person || !plea) return null;
  const silver = state.sects[state.playerSect].silver;
  return {
    kind: 'plea',
    title: `${plea.title} · ${person.name}`,
    person,
    text: plea.text(person),
    choices: plea.choices.map((choice) => ({ label: choice.label, hint: choice.hint, cost: choice.cost, why: (choice.cost ?? 0) > silver ? '银两不足' : '' })),
  };
}

/** Answers a plea with one of its choices. */
export function resolvePlea(state, pending, index) {
  const person = state.persons[pending.person],
    choice = PLEAS[pending.trait]?.choices[index],
    books = state.sects[state.playerSect];
  if (!person || !choice) return { ok: false, why: '此事已了' };
  const gives = choice.gives;
  if (choice.cost) books.silver -= choice.cost;
  if (gives.silver) books.silver += gives.silver;
  if (gives.renown) books.renown = clamp(books.renown + gives.renown, 0, 1000);
  if (gives.loyalty) person.loyalty = clamp(person.loyalty + gives.loyalty, 0, 100);
  if (gives.wit) person.stats.wit = Math.min(100, person.stats.wit + gives.wit);
  if (gives.xp) grow(state, person, gives.xp);
  if (gives.heal) person.wounds = 0;
  if (gives.wound) person.wounds = clamp((person.wounds ?? 0) + gives.wound, 0, 0.8);
  if (gives.job) person.job = { kind: gives.job, days: 0 };
  for (const other of members(state, state.playerSect)) {
    if (gives.all && other.id !== books.leaderId) other.loyalty = clamp(other.loyalty + gives.all, 0, 100);
    if (gives.allXp) grow(state, other, gives.allXp);
  }
  person.pleaDay = state.day;
  const text = choice.text(person);
  remember(state, person, `${PLEAS[pending.trait].title}：${choice.label}`);
  return { ok: true, text };
}

// ---- putting people to work -------------------------------------------------------------------------------

/**
 * The art a person would do best to practise now: the highest tier they can
 * start, and among those the one their aptitude suits, with the sect's own
 * arts ahead of the common ones. Null when there is nothing they can learn.
 */
export function bestArtFor(person, held) {
  const options = learnableArts(person, held).filter((art) => art.tier < 5);
  if (!options.length) return null;
  const worth = (art) => art.tier * 100 + person.apt[CLASSES[art.klass].aptitude] + (art.sect ? 30 : 0) - levelOf(person.arts[art.id] ?? 0) * 2;
  return options.sort((a, b) => worth(b) - worth(a))[0];
}

const badlyWounded = (person) => (person.wounds ?? 0) >= 0.3;
const idleDisciple = (person, leader) => person.id !== leader && (person.job?.kind ?? 'rest') === 'rest' && !badlyWounded(person);

/**
 * Work for everyone in a sect, by what each is good for. The gifted and the
 * senior train; of the rest, enough are sent to the pits and workshops their
 * stronghold has, the least gifted first. People already secluded, on the
 * road or wounded badly are left as they are.
 * @param idleOnly  only people who are resting are given something to do
 * @returns `[{ person, job, why }]`; nothing is changed
 */
export function recommendJobs(state, sectId, { idleOnly = false } = {}) {
  const held = heldArts(state, sectId);
  const leader = state.sects[sectId]?.leaderId;
  const plan = [];
  const byPlace = new Map();
  for (const person of members(state, sectId)) {
    if (!byPlace.has(person.place)) byPlace.set(person.place, []);
    byPlace.get(person.place).push(person);
  }
  for (const [placeId, people] of byPlace) {
    const buildings = state.places[placeId]?.buildings ?? [];
    const pits = buildings.filter((b) => BUILDINGS[b.kind].yields && (PLACE_BY_ID[placeId].resources[BUILDINGS[b.kind].yields] ?? 0) > 0);
    const workshops = buildings.filter((b) => BUILDINGS[b.kind].makes);
    const free = people.filter((person) => idleOnly
      ? idleDisciple(person, leader)
      : !badlyWounded(person) && !['seclude', 'travel'].includes(person.job?.kind));
    // About a third of the junior disciples keep the stronghold supplied, where there is work for them.
    const juniors = free.filter((person) => person.rank <= 1).sort((a, b) => aptitudeScore(a) - aptitudeScore(b));
    const hands = pits.length + workshops.length ? Math.min(juniors.length, Math.max(1, Math.round(people.filter((person) => person.rank <= 1).length / 3))) : 0;
    const working = people.filter((person) => ['gather', 'craft'].includes(person.job?.kind) && !free.includes(person)).length;
    const workers = new Set(juniors.slice(0, Math.max(0, hands - working)));
    let turn = 0;
    for (const person of free) {
      if (workers.has(person)) {
        const spot = turn++;
        if (workshops.length && (spot % 3 === 2 || !pits.length)) {
          const shop = workshops[spot % workshops.length];
          plan.push({ person, job: { kind: 'craft', make: BUILDINGS[shop.kind].makes }, why: '资质平平，去作坊出力' });
        } else {
          const pit = pits[spot % pits.length];
          plan.push({ person, job: { kind: 'gather', res: BUILDINGS[pit.kind].yields }, why: '资质平平，去采集' });
        }
        continue;
      }
      const art = bestArtFor(person, held);
      if (art) plan.push({ person, job: { kind: 'train', art: art.id }, why: `${APT_NAMES[CLASSES[art.klass].aptitude]}资质 ${person.apt[CLASSES[art.klass].aptitude]}` });
      else plan.push({ person, job: { kind: 'patrol' }, why: '眼下无艺可学，下山行侠' });
    }
  }
  // Leave out those who would only be told to go on doing what they are doing.
  return plan.filter(({ person, job }) => {
    const now = person.job ?? { kind: 'rest' };
    return now.kind !== job.kind || now.art !== job.art || now.res !== job.res || now.make !== job.make;
  });
}

/** Whether a person meets what the next standing asks of them (see `promote` in world.mjs). */
export function promotable(state, person) {
  const best = Math.max(0, ...Object.entries(person.arts).map(([id, points]) => (ART_BY_ID[id] ? ART_BY_ID[id].tier * 10 + levelOf(points) : 0)));
  if (person.rank === 0) return person.loyalty >= 50 && best >= 13;
  if (person.rank === 1) return person.level >= 10 && best >= 25;
  if (person.rank === 2) return person.level >= 20 && !!person.master && members(state, person.school).filter((p) => p.rank === 3).length < 5;
  if (person.rank === 3) {
    const seats = 3 + Object.values(state.places).filter((place) => place.owner === person.school).length;
    return person.level >= 30 && members(state, person.school).filter((p) => p.rank === 4).length < seats;
  }
  return false;
}

/**
 * What in the sect is waiting on the leader: people with nothing to do,
 * people who have earned a higher standing, people about to walk out, the
 * wounded, and callers at the boards.
 */
export function attention(state, sectId) {
  const all = members(state, sectId),
    leader = state.sects[sectId].leaderId;
  return {
    idle: all.filter((person) => idleDisciple(person, leader)),
    promotable: all.filter((person) => promotable(state, person)),
    unhappy: all.filter((person) => person.id !== leader && person.loyalty < 30),
    wounded: all.filter(badlyWounded),
    callers: Object.values(state.places).filter((place) => place.owner === sectId).reduce((sum, place) => sum + place.applicants.length, 0),
    masterless: all.filter((person) => person.rank < 4 && !person.master && all.some((elder) => elder.rank >= 4)),
  };
}
