// The wider martial world, applied: what a sect's talents and house rule
// change, which formation a side fights in, and the events and visitors that
// come to the player's door.
//
// An event waits in `state.pending` until the player answers it. A world
// that nobody is watching (`options.interactive` unset) answers for itself.
import { commonArt } from '../data/arts.mjs';
import { EVENT_BY_ID, EVENTS, FORMATIONS, HOUSE_RULES, TALENTS, TRIALS, WANDERER_BY_ID, WANDERERS } from '../data/jianghu.mjs';
import { SECT_BY_ID } from '../data/sects.mjs';
import { findRelic } from './extras.mjs';
import { autoWheel, equipFor, growTo, prowess, rollPerson } from './persons.mjs';
import { clamp } from './rng.mjs';

const members = (state, sectId) => Object.values(state.persons).filter((person) => person.school === sectId);
const log = (state, type, text, sect) => state.log.push({ day: state.day, type, text, sect });

// ---- talents and house rules ---------------------------------------------------------------------------

/** One sect's modifiers on one day, kept so a day's work asks only once. */
let kept = { state: null, day: -1, bySect: {} };

/**
 * Everything a sect's talents and house rule add up to; the keys are
 * described in data/jianghu.mjs. A talent counts once however many have it.
 */
export function modsOf(state, sectId) {
  if (kept.state !== state || kept.day !== state.day) kept = { state, day: state.day, bySect: {} };
  if (kept.bySect[sectId]) return kept.bySect[sectId];
  const total = { train: 0, gather: 0, craft: 0, income: 0, wages: 0, heal: 0, insight: 0, recruit: 0, loyalty: 0, court: 0, attack: 0, defense: 0 };
  const sources = [HOUSE_RULES[state.sects[sectId]?.rule ?? 'plain'] ?? HOUSE_RULES.plain];
  for (const key of new Set(members(state, sectId).map((person) => person.talent).filter(Boolean))) if (TALENTS[key]) sources.push(TALENTS[key]);
  for (const source of sources) for (const [key, value] of Object.entries(source.mods)) total[key] += value;
  // A wanderer whose wish was granted gives their talent twice over.
  for (const person of members(state, sectId)) if (person.talentDeep && TALENTS[person.talent]) for (const [key, value] of Object.entries(TALENTS[person.talent].mods)) total[key] += value;
  return (kept.bySect[sectId] = total);
}
/** Call after changing who is in a sect or its rule within a day. */
export const forgetMods = () => (kept.day = -1);

export function setRule(state, sectId, rule) {
  if (!HOUSE_RULES[rule]) return { ok: false, why: '没有这条门规' };
  state.sects[sectId].rule = rule;
  forgetMods();
  return { ok: true };
}

/** The most a formation, talents, a house rule, a spy and a stronghold's works may add up to for one side. */
export const BONUS_CAP = { attack: 0.2, defense: 0.25 };

// ---- formations ----------------------------------------------------------------------------------------

/** The formations a party may take: the common ones, and its sect's own if an elder or the leader is in it. */
export function formationsFor(sectId, party) {
  const led = party.some((person) => person.rank >= 4);
  return Object.entries(FORMATIONS).filter(([, f]) => !f.sect || (f.sect === sectId && led)).map(([id]) => id);
}

/**
 * How a side stands and what that gives it, in the shape core/battle.mjs
 * takes. A sect the game runs takes its own formation when it can.
 * @param extra  shares added on top, such as a gate's defence
 */
export function formationOf(state, sectId, party, extra = {}) {
  const allowed = formationsFor(sectId, party);
  const wanted = sectId === state.playerSect && !state.options.autoPlayer ? state.sects[sectId].formation : sectId;
  const id = allowed.includes(wanted) ? wanted : 'line';
  const f = FORMATIONS[id],
    mods = modsOf(state, sectId);
  // However much is piled up, a side gains no more than a fifth in attack and a quarter in defence from all of it together.
  return { id, width: f.width, bonus: { attack: Math.min(BONUS_CAP.attack, (f.attack ?? 0) + (extra.attack ?? 0)), defense: Math.min(BONUS_CAP.defense, (f.defense ?? 0) + (extra.defense ?? 0)), regen: f.regen ?? 0 }, mods };
}

// ---- events and visitors -------------------------------------------------------------------------------

function apply(state, sectId, gives) {
  const books = state.sects[sectId];
  for (const key of ['silver', 'grain']) if (gives[key]) books[key] = Math.max(0, books[key] + gives[key]);
  if (gives.renown) books.renown = clamp(books.renown + gives.renown, 0, 1000);
  if (gives.virtue) books.virtue = clamp(books.virtue + gives.virtue, -1000, 1000);
  if (gives.court) books.court = clamp(books.court + gives.court, -100, 100);
  if (gives.loyalty) for (const person of members(state, sectId)) if (person.id !== books.leaderId) person.loyalty = clamp(person.loyalty + gives.loyalty, 0, 100);
  if (gives.relations) for (const other of Object.keys(books.relations)) {
    books.relations[other] = clamp(books.relations[other] + gives.relations, -100, 100);
    if (state.sects[other]?.relations) state.sects[other].relations[sectId] = clamp(state.sects[other].relations[sectId] + gives.relations, -100, 100);
  }
  for (const [key, amount] of Object.entries(gives.res ?? {})) books.res[key] += amount;
  if (gives.wound) {
    const best = members(state, sectId).sort((a, b) => prowess(b) - prowess(a))[0];
    if (best) best.wounds = clamp((best.wounds ?? 0) + gives.wound, 0, 0.9);
  }
}

/** What it costs to hire a wanderer outright. */
const hireCost = (wanderer) => 200 + wanderer.level * 15;
/** The chance that a wanderer accepts an invitation with no silver behind it. */
const inviteChance = (books, wanderer) => clamp(0.2 + books.renown / 700 + Math.abs(books.virtue) / 2500 - wanderer.level / 120, 0.1, 0.9);

/** Whom a wanderer would pass their talent to: the most loyal inner disciple or better who has none. */
const heirOf = (state, person) => members(state, person.school).filter((other) => other.id !== person.id && !other.talent && other.rank >= 2 && other.rank < 5).sort((a, b) => b.loyalty - a.loyalty)[0];

/** Brings a wanderer into a sect as a personal disciple with their own talent and face. */
export function join(state, sectId, wandererId, rng) {
  const wanderer = WANDERER_BY_ID[wandererId],
    books = state.sects[sectId];
  const place = state.persons[books.leaderId]?.place ?? Object.keys(state.places).find((id) => state.places[id].owner === sectId);
  const person = rollPerson(rng, { quality: 74, lean: wanderer.aptitude, school: sectId, place, female: wanderer.female });
  Object.assign(person, { name: wanderer.name, age: wanderer.age, portraitId: wanderer.id, talent: wanderer.talent, origin: '江湖奇人', rank: 3, loyalty: 75, joined: state.day });
  growTo(person, wanderer.level);
  const klass = { fist: 'fist', blade: 'sword', pole: 'staff', dart: 'dart', inner: 'palm' }[wanderer.aptitude];
  for (const tier of [1, 2, 3]) for (const k of [klass, 'inner']) person.arts[commonArt(k, tier).id] = tier === 3 ? 500 : 800;
  equipFor(person, 3);
  person.wheel = autoWheel(person);
  person.id = state.nextId++;
  state.persons[person.id] = person;
  (state.met ??= {})[wandererId] = 'joined';
  forgetMods();
  log(state, 'join', `${wanderer.name}投入${SECT_BY_ID[sectId].name}门下（${TALENTS[wanderer.talent].name}：${TALENTS[wanderer.talent].does}）。`, sectId);
  return person;
}

/** The event or visit waiting for an answer, laid out for the page; null when nothing waits. */
export function pendingView(state) {
  const pending = state.pending;
  if (!pending) return null;
  const books = state.sects[state.playerSect];
  const check = (choice) => {
    if ((choice.cost ?? 0) > books.silver) return '银两不足';
    for (const [key, amount] of Object.entries(choice.needs ?? {})) if (books[key] < amount) return { grain: '粮草不足', renown: '威望不足' }[key] ?? '条件不足';
    return '';
  };
  if (pending.kind === 'siege') return null;
  if (pending.kind === 'trial' || pending.kind === 'legacy') {
    const person = state.persons[pending.person];
    if (!person) return (state.pending = null);
    if (pending.kind === 'trial')
      return { kind: 'trial', title: `初试 · ${person.name}`, portraitId: person.portraitId, expression: 'neutral', text: `${person.name}入门不久，${TRIALS[person.talent].text}`, choices: [
        { label: '放手让其施为', hint: '其忠诚 +10，本派多少有些进益', why: '' },
        { label: '按本派的规矩来', hint: '其忠诚 −6', why: '' }] };
    const heir = heirOf(state, person);
    return { kind: 'legacy', title: `托付 · ${person.name}`, portraitId: person.portraitId, expression: 'happy', text: `${person.name}在本派已逾一年，这天说起身后事：一身本事不想带进土里，愿在门中择一人倾囊相授，或是著书留给后来人。`, choices: [
      { label: heir ? `传于${heir.name}` : '门中尚无合适的传人', hint: '传人习得同样的天赋，此艺不因一人去留而断', why: heir ? '' : '需有内门以上、尚无天赋的弟子' },
      { label: '著书立说', hint: '威望 +20，全派忠诚 +2', why: '' }] };
  }
  if (pending.kind === 'wish') {
    const person = state.persons[pending.person];
    if (!person) return (state.pending = null);
    const cost = 150 + person.level * 10;
    return { kind: 'wish', title: `心愿 · ${person.name}`, portraitId: person.portraitId, expression: 'worried', text: `${person.name}入门已有时日，这天来见掌门，说起一桩放不下的旧事：故人所托未了，需要些盘缠和人手。若能了此心愿，此人愿倾囊相授。`, choices: [
      { label: '倾力相助', hint: `银 −${cost}，其天赋之效加倍，忠诚 +20`, cost, why: check({ cost }) },
      { label: '好言宽慰', hint: '忠诚 −5', why: '' }] };
  }
  if (pending.kind === 'visit') {
    const w = WANDERER_BY_ID[pending.who],
      talent = TALENTS[w.talent];
    const choices = [
      { label: '重金延揽', hint: `银 −${hireCost(w)}，必定留下`, cost: hireCost(w) },
      { label: '以诚相邀', hint: `约 ${Math.round(inviteChance(books, w) * 100)}% 留下；威望越高越易成` },
      { label: '礼送下山', hint: '威望 +3' },
    ];
    return { kind: 'visit', title: `江湖奇人 · ${w.name}`, portraitId: w.id, text: `${w.about}此人${w.age}岁，身负「${talent.name}」之能：${talent.does}。`, choices: choices.map((c) => ({ ...c, why: check(c) })) };
  }
  const event = EVENT_BY_ID[pending.id];
  return { kind: 'event', title: event.title, text: event.text, choices: event.choices.map((c) => ({ label: c.label, hint: c.hint, why: check(c) })) };
}

/** Answers what is waiting with one of its choices. Returns what came of it. */
export function resolvePending(state, index, rng) {
  const view = pendingView(state),
    sectId = state.playerSect,
    books = state.sects[sectId];
  if (!view || !view.choices[index]) return { ok: false, why: '无事可决' };
  if (view.choices[index].why) return { ok: false, why: view.choices[index].why };
  const pending = state.pending;
  state.pending = null;
  let text;
  if (pending.kind === 'trial') {
    const person = state.persons[pending.person];
    if (index === 0) {
      apply(state, sectId, TRIALS[person.talent].gives);
      if (TRIALS[person.talent].gives.applicant) {
        const placeId = state.persons[books.leaderId]?.place;
        if (placeId) state.places[placeId].applicants.unshift(rollPerson(rng, { quality: TRIALS[person.talent].gives.applicant, place: placeId }));
      }
      person.loyalty = clamp(person.loyalty + 10, 0, 100);
      return { ok: true, text: `${person.name}说到做到，门中上下都看在眼里。` };
    }
    person.loyalty = clamp(person.loyalty - 6, 0, 100);
    return { ok: true, text: `${person.name}没有再提，只是此后话少了些。` };
  }
  if (pending.kind === 'legacy') {
    const person = state.persons[pending.person];
    if (index === 0) {
      const heir = heirOf(state, person);
      heir.talent = person.talent;
      heir.loyalty = clamp(heir.loyalty + 10, 0, 100);
      forgetMods();
      log(state, 'event', `${person.name}将「${TALENTS[person.talent].name}」之艺传于${heir.name}。`, sectId);
      return { ok: true, text: `${heir.name}行了大礼。${person.name}说：“往后本派这门本事，就看你的了。”` };
    }
    apply(state, sectId, { renown: 20, loyalty: 2 });
    log(state, 'event', `${person.name}著书一部，传抄江湖。`, sectId);
    return { ok: true, text: `书成之日，求抄本的人从山门排到了山脚。` };
  }
  if (pending.kind === 'wish') {
    const person = state.persons[pending.person];
    if (index === 0) {
      books.silver -= view.choices[0].cost;
      person.talentDeep = true;
      person.loyalty = clamp(person.loyalty + 20, 0, 100);
      forgetMods();
      log(state, 'event', `${person.name}心愿得偿，自此倾囊相授。`, sectId);
      return { ok: true, text: `${person.name}了却旧事归来，长揖到地：“此身此艺，尽付本派。”`, expression: 'happy', portraitId: person.portraitId };
    }
    person.loyalty = clamp(person.loyalty - 5, 0, 100);
    person.wished = true;
    return { ok: true, text: `${person.name}默然良久，告退而去。` };
  }
  if (pending.kind === 'visit') {
    const w = WANDERER_BY_ID[pending.who];
    if (index === 0) (books.silver -= hireCost(w)), join(state, sectId, w.id, rng), (text = `${w.name}收下聘礼，留了下来。`);
    else if (index === 1) {
      if (rng.chance(inviteChance(books, w))) join(state, sectId, w.id, rng), (text = `${w.name}沉吟片刻，点头应允。`);
      else (state.met ??= {})[w.id] = 'left', (text = `${w.name}拱手作别：“他日有缘再会。”`);
    } else (state.met ??= {})[w.id] = 'left', apply(state, sectId, { renown: 3 }), (text = `${w.name}饮罢一盏茶，下山去了。`);
    return { ok: true, text };
  }
  const choice = EVENT_BY_ID[pending.id].choices[index];
  if (choice.cost) books.silver -= choice.cost;
  const risky = choice.risk && rng.chance(choice.risk.chance);
  apply(state, sectId, risky ? choice.risk.gives : choice.gives);
  if (choice.gives.relic && !risky) findRelic(state, sectId, rng);
  if (choice.gives.applicant && !risky) {
    const placeId = state.persons[books.leaderId]?.place;
    if (placeId) state.places[placeId].applicants.unshift(rollPerson(rng, { quality: choice.gives.applicant, place: placeId }));
  }
  text = risky ? choice.risk.text : choice.text;
  log(state, 'event', `${EVENT_BY_ID[pending.id].title}：${text}`, sectId);
  return { ok: true, text };
}

/**
 * Every ten days: the standing gains and losses of talents and rules, and
 * perhaps something new at the player's door.
 */
export function xunOfJianghu(state, rng) {
  for (const [sectId, books] of Object.entries(state.sects)) {
    if (!books.alive) continue;
    const mods = modsOf(state, sectId);
    books.silver += mods.income;
    books.court = clamp(books.court + mods.court, -100, 100);
    if (mods.loyalty) apply(state, sectId, { loyalty: mods.loyalty });
  }
  const books = state.sects[state.playerSect];
  if (!books?.alive || state.pending || state.options.autoPlayer) return;
  if (!rng.chance(0.14)) return;
  // A wanderer's time in the sect has its chapters: a first trial of what they can do after two months,
  // a wish after half a year (below), and after a year, if the wish was granted, the passing on of their art.
  for (const person of members(state, state.playerSect)) {
    if (!person.talent || person.origin !== '江湖奇人') continue;
    const days = state.day - (person.joined ?? state.day);
    const kind = !person.tried && days > 60 ? 'trial' : person.talentDeep && !person.bequeathed && days > 360 ? 'legacy' : null;
    if (!kind || !rng.chance(0.5)) continue;
    person[kind === 'trial' ? 'tried' : 'bequeathed'] = true;
    state.pending = { kind, person: person.id };
    if (!state.options.interactive) resolvePending(state, kind === 'trial' ? 0 : 1, rng);
    return;
  }
  // Someone who came in from the road may, after half a year, speak of what they left undone.
  const wishful = members(state, state.playerSect).find((person) => person.talent && person.origin === '江湖奇人' && person.tried && !person.talentDeep && !person.wished && state.day - (person.joined ?? state.day) > 180);
  if (wishful && rng.chance(0.5)) {
    wishful.wished = true;
    state.pending = { kind: 'wish', person: wishful.id };
    if (!state.options.interactive) resolvePending(state, 1, rng);
    return;
  }
  const unmet = WANDERERS.filter((w) => !state.met?.[w.id]);
  if (unmet.length && rng.chance(0.35)) state.pending = { kind: 'visit', who: rng.pick(unmet).id };
  else {
    const fitting = EVENTS.filter((event) => event.id !== state.lastEvent && (!event.when || event.when(books, state)));
    // Trouble with the court does not wait its turn.
    const urgent = fitting.filter((event) => event.when);
    const event = urgent.length && rng.chance(0.5) ? rng.pick(urgent) : rng.pick(fitting);
    state.pending = { kind: 'event', id: event.id };
    state.lastEvent = event.id;
  }
  if (!state.options.interactive) {
    // Nobody is watching: invite a visitor without spending, and meet an event with its last, most cautious answer.
    const view = pendingView(state);
    const index = !view ? -1 : view.kind === 'visit' ? 1 : view.choices.findLastIndex((choice) => !choice.why);
    if (index < 0) state.pending = null;
    else resolvePending(state, index, rng);
  }
}

/** Every year: the court grows wary of large sects, and may raise a loyal one above the rest. */
export function yearOfJianghu(state) {
  for (const [sectId, books] of Object.entries(state.sects)) {
    if (!books.alive) continue;
    if (members(state, sectId).length > 25) books.court = clamp(books.court - 4, -100, 100);
  }
  const books = state.sects[state.playerSect];
  if (!state.outcome && books?.alive && books.court >= 80 && books.renown >= 500) {
    log(state, 'court', `朝廷废《禁武令》，封${SECT_BY_ID[state.playerSect].name}掌门为武林都指挥使。`, state.playerSect);
    state.outcome = { result: 'won-court', day: state.day, by: state.playerSect };
  }
}
