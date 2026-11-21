// 桃溪县的规则：一座城的状态和它随真实时间的变化——生产与消耗、人口与民生、税银、集市卖货、工期、勘探、人才、
// 来敌、民情、离线补算、升格与升迁。不碰页面也不碰引擎；页面、测试和节奏模拟都直接用它。
// The rules of Peach Creek: a county's state and how it changes with real time — production and use, people and
// livelihood, taxes, markets, works, surveys, talents, raids, petitions, catching up after an absence, rising in rank
// and promotion. Free of the page and the engine; the page, the tests and the pacing tool all use it.
import {
  BUILDINGS, BUILDING_STAT, DEFENCE, FINAL_RANK, GOODS, HOUR, MILESTONES, NODES, OFFICES, PEOPLE, PETITIONS, PROMOTION,
  RAIDS, RANKS, RARITY, RECRUIT, RESOURCES, SEASONS, START, SURVEY_COST, SURVEY_ORDER, SURVEY_TIME, TALENTS, ZONES, ZONE_BONUS
} from './data.mjs';

export const DISTRICT_COLS = 3;
export const DISTRICT_ROWS = 2;
export const CORE_WARDS = DISTRICT_COLS * DISTRICT_ROWS;
export const WARD_POSITIONS = Object.freeze([
  [0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1],
  [-1, 0], [-1, 1], [3, 0], [3, 1], [0, 2], [2, 2]
].map((position) => Object.freeze(position)));
export const DISTRICTS = WARD_POSITIONS.length;
export const STARTING_WARDS = 3;
export const PLOT_COLS = 4;
export const PLOT_ROWS = 3;
export const PLOTS_PER_DISTRICT = PLOT_COLS * PLOT_ROWS;
export const SIDES = Object.freeze(['north', 'east', 'south', 'west']);
const wardNeighbours = WARD_POSITIONS.map(([x, y]) =>
  WARD_POSITIONS.flatMap(([otherX, otherY], index) => Math.abs(x - otherX) + Math.abs(y - otherY) === 1 ? [index] : [])
);
export function plotPosition(index) {
  const [x, y] = WARD_POSITIONS[Math.floor(index / PLOTS_PER_DISTRICT)],
    parcel = index % PLOTS_PER_DISTRICT;
  return { x: x * PLOT_COLS + parcel % PLOT_COLS, y: y * PLOT_ROWS + Math.floor(parcel / PLOT_COLS) };
}
const positions = Array.from({ length: DISTRICTS * PLOTS_PER_DISTRICT }, (_, index) => plotPosition(index));
/** Only the first row past the southern bridge touches the river. */
export const RIVERSIDE = new Set(positions.flatMap(({ y }, index) => y === DISTRICT_ROWS * PLOT_ROWS ? [index] : []));
const walk = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const distances = positions.map((a) => positions.map((b) => walk(a, b)));
const cityWidth = DISTRICT_COLS * PLOT_COLS,
  cityHeight = DISTRICT_ROWS * PLOT_ROWS;
const gates = [{ x: cityWidth / 2, y: 0 }, { x: cityWidth - 1, y: cityHeight / 2 }, { x: cityWidth / 2, y: cityHeight - 1 }, { x: 0, y: cityHeight / 2 }];
const gateDistances = positions.map((a) => Math.min(...gates.map((b) => walk(a, b))));
const yamen = { x: (cityWidth - 1) / 2, y: -1 };
const yamenDistances = positions.map((a) => walk(a, yamen));
const countryside = positions.map(({ x, y }) => Math.max(0, 3 - Math.min(x, cityWidth - x - 1, cityHeight - y - 1)) / 3);
export const NODE_SLOTS = 12;

/** A small seeded generator (mulberry32). */
export function seeded(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A new county at real time `now` (seconds). */
export function createCounty({ seed = 1, now = 0, term = 0, talents = [] } = {}) {
  const res = {};
  for (const key of Object.keys(RESOURCES)) res[key] = START[key] ?? 0;
  return {
    version: 3,
    seed,
    rolls: 0,
    term,
    time: now,
    started: now,
    rank: 0,
    res,
    pop: START.pop,
    fame: START.fame,
    life: 50,
    pendingTax: 0,
    districts: Array.from({ length: DISTRICTS }, (_, i) => ({ zone: null, open: i < STARTING_WARDS })),
    // The village the magistrate finds: a house, a paddy and a woodland in use.
    plots: Array.from({ length: DISTRICTS * PLOTS_PER_DISTRICT }, (_, i) => {
      if (i === 0) return { kind: 'house', level: 2 };
      if (i === 2 * PLOTS_PER_DISTRICT + PLOT_COLS - 1) return { kind: 'paddy', level: 1 };
      return { kind: null, level: 0 };
    }),
    nodes: Array.from({ length: NODE_SLOTS }, (_, i) => ({ kind: SURVEY_ORDER[i], found: i === 0, level: i === 0 ? 1 : 0 })),
    surveys: 1,
    defence: { wall: SIDES.map(() => 0), tower: SIDES.map(() => 0), troops: SIDES.map(() => 0), camp: 0 },
    works: [],
    talents: talents.map((t) => ({ ...t, post: null })),
    recruits: 0,
    pity: 0,
    freeRecruitAt: now,
    raid: { n: 0, next: null, drums: false, last: null },
    petition: null,
    nextPetition: now + PETITIONS.first,
    petitionCount: 0,
    petitionRecent: [],
    moods: [],
    goal: 0,
    log: [],
    stats: { taxTaps: 0, raidsWon: 0, raidsLost: 0, built: 0, sold: 0 },
    termDone: false
  };
}

const random = (state) => seeded(state.seed * 7919 + ++state.rolls)();

// ——— Sizes and rates ———

const milestone = (level) => 2 ** MILESTONES.filter((m) => level >= m).length;
/** The price of the next level of something at `level`. */
export function priceOf(spec, level) {
  const out = {};
  // Coin grows by the building's rate; materials more gently, so the rank works keep their weight.
  for (const [key, value] of Object.entries(spec.cost)) out[key] = Math.round(value * (key === 'coin' ? spec.grow : 1.08) ** level);
  return out;
}
/** The works of the next level, in seconds before talents. */
export const worksOf = (spec, level) => Math.round(Math.min(spec.time * 1.16 ** level, 8 * HOUR));
export const afford = (state, price) => Object.entries(price).every(([key, value]) => (key === 'fame' ? state.fame : state.res[key]) >= value);
function pay(state, price) {
  for (const [key, value] of Object.entries(price)) {
    if (key === 'fame') state.fame -= value;
    else state.res[key] -= value;
  }
}

/** What rising to rank `rank` needs in this term. */
export function needFor(state, rank) {
  const base = RANKS[rank]?.need;
  if (!base) return null;
  const scale = 1 + PROMOTION.grow * state.term,
    out = {};
  for (const [key, value] of Object.entries(base)) out[key] = key === 'life' ? value : Math.round(value * scale);
  return out;
}

const seasonIndex = (state) => Math.floor(Math.max(0, state.time - state.started) / SEASONS.length);
const seasonEnd = (state) => state.started + (seasonIndex(state) + 1) * SEASONS.length;
export const seasonOf = (state) => seasonIndex(state) % SEASONS.effects.length;
export function seasonInfo(state) {
  const season = seasonOf(state);
  return {
    season,
    remaining: Math.max(0, seasonEnd(state) - state.time),
    effects: SEASONS.effects[season],
    next: (season + 1) % SEASONS.effects.length
  };
}
export const builders = (state) => RANKS[state.rank].builders;
export const maxLevel = (state) => RANKS[state.rank].maxLevel;
export const wardIsOpen = (state, ward) => Number.isInteger(ward) && state.districts[ward]?.open === true;
export const districtsOpen = (state) => state.districts.filter((ward) => ward.open).length;
export const offlineCap = (state) => Math.min(16, 4 + state.plots.reduce((sum, p) => sum + (p.kind === 'granary' ? BUILDINGS.granary.store * p.level : 0), 0)) * HOUR;

/** The surrounding land only suggests a use; players choose a focus and each building independently. */
export function wardRecommendation(ward) {
  const position = WARD_POSITIONS[ward];
  if (!position) return null;
  const [x, y] = position;
  if (x === 1 && y === 0) return 'market';
  return x <= 0 || x >= DISTRICT_COLS - 1 || y >= DISTRICT_ROWS ? 'farm' : null;
}

/** An undeveloped ward may be acquired from any adjacent open ward. The fee rises with the town's footprint. */
export function expansionQuote(state, ward) {
  if (!Number.isInteger(ward) || !state.districts[ward]) return { cost: null, why: 'none' };
  if (wardIsOpen(state, ward)) return { cost: null, why: 'open' };
  const bought = Math.max(0, districtsOpen(state) - STARTING_WARDS);
  const cost = { coin: 360 + bought * (140 + 260 * bought), wood: 65 + bought * 40 };
  if (!wardNeighbours[ward].some((other) => wardIsOpen(state, other))) return { cost, why: 'adjacent' };
  return afford(state, cost) ? { cost } : { cost, why: 'cost' };
}

export function expandWard(state, ward) {
  const offer = expansionQuote(state, ward);
  if (offer.why) return offer;
  pay(state, offer.cost);
  state.districts[ward].open = true;
  return offer;
}

/** The talent posted somewhere, and its bonus for that place's attribute (0–about 1.2). */
function talentAt(state, post) {
  return state.talents.find((t) => t.post && t.post.type === post.type && t.post.key === post.key);
}
export function talentPower(talent, stat) {
  const spec = TALENTS.find((t) => t.id === talent.id),
    value = spec.stats[['rule', 'farm', 'craft', 'trade', 'arms'].indexOf(stat)];
  return (value / 100) * (1 + 0.06 * (talent.level - 1)) * (1 + 0.1 * (talent.stars - 1));
}
function giftOf(state, key) {
  let sum = 0;
  for (const talent of state.talents) if (talent.post) sum += TALENTS.find((t) => t.id === talent.id).gift[key] ?? 0;
  return sum;
}
const officeBonus = (state, office, scale) => {
  const talent = talentAt(state, { type: 'office', key: office });
  return talent ? talentPower(talent, OFFICES[office]) * scale : 0;
};

function planningSites(state) {
  const sites = {};
  state.plots.forEach(({ kind, level }, index) => {
    if (kind && level > 0) (sites[kind] ??= []).push(index);
  });
  return sites;
}

const nearest = (index, sites, fallback) => {
  let result = fallback;
  for (const other of sites ?? []) if (other !== index) result = Math.min(result, distances[index][other]);
  return result;
};

const LOCAL_INPUT = { brewery: 'paddy', loom: 'mulberry' };
const GROWING = new Set(['paddy', 'mulberry', 'teaGarden']);
const WORKSHOP_GOODS = new Set(['wine', 'silk', 'porcelain']);

function parcelPlan(state, index, kind, sites) {
  const spec = BUILDINGS[kind];
  if (!spec || !positions[index]) return { multiplier: 1, access: 1, smoke: 0, linked: true, upkeep: 0 };
  const trade = Boolean(spec.sell || spec.visitors),
    urbanTrade = trade && !spec.riverside,
    services = Boolean(spec.life && !spec.house),
    input = LOCAL_INPUT[kind],
    stage = 0.35 + state.rank * 0.11;
  const homes = Math.min(nearest(index, sites.house, 8), nearest(index, sites.manor, 8)),
    marketDistance = Math.min(nearest(index, sites.market, 8), nearest(index, sites.dock, 8)),
    reach = Math.min(gateDistances[index], marketDistance);
  // Keep historic shipping rates until an old dock on the former shoreline is relocated.
  const oldBank = positions[index].y === DISTRICT_ROWS * PLOT_ROWS - 1 && state.plots[index].kind === kind;
  const haul = input ? nearest(index, sites[input], 9) : kind === 'kiln' ? gateDistances[index] + 1 : 0,
    inland = Boolean(spec.riverside && !RIVERSIDE.has(index) && !oldBank),
    linked = input ? haul <= 4 : spec.riverside ? !inland : true;
  const travel = (trade ? reach * 0.065 : 0) + (services ? homes * 0.048 : 0) + (input || kind === 'kiln' ? haul * 0.045 : 0);
  const access = Math.max(0.45, 1 - travel * stage - (inland ? 0.35 : 0));
  const neighbours = (sites[kind] ?? []).filter((other) => other !== index && distances[index][other] <= 2).length,
    crowding = trade || spec.smoke ? Math.max(0, neighbours - 1) * 0.035 * stage : 0,
    proximity = input && linked ? (5 - haul) * 0.04 : 0,
    siting = urbanTrade ? Math.max(0, 0.19 - yamenDistances[index] * 0.026) : GROWING.has(kind) ? Math.min(0.16, countryside[index] * 0.16) : 0;
  const smoke = spec.smoke ? spec.smoke * (homes <= 1 ? 2.3 : homes <= 3 ? 1.3 : 0.38) : 0;
  return {
    multiplier: Math.max(0.4, access + proximity + siting - crowding),
    access,
    smoke,
    linked,
    upkeep: Math.max(0, state.rank - 1) * (trade ? reach * 1.3 : 0) + Math.max(0, state.rank - 1) * haul * 0.85
  };
}

/** Show the effect of a building in this particular spot before committing to construction. */
export function plotPlan(state, index, kind = state.plots[index]?.kind) {
  return parcelPlan(state, index, kind, planningSites(state));
}

/** Contributions from a parcel's optional ward focus, talent, deputy and rank of office. */
function plotBoost(state, index) {
  const plot = state.plots[index],
    spec = BUILDINGS[plot.kind],
    zone = state.districts[Math.floor(index / PLOTS_PER_DISTRICT)].zone;
  const talent = talentAt(state, { type: 'plot', key: index });
  return (
    (1 + (spec.zone[0] === zone ? ZONE_BONUS : 0)) *
    (1 + (talent ? talentPower(talent, BUILDING_STAT[plot.kind]) * 0.6 : 0)) *
    (1 + officeBonus(state, 'deputy', 0.25)) *
    (1 + PROMOTION.bonus * state.term)
  );
}

/** Rates an hour right now: { make, use, house, lifePoints, beauty, smoke, sell, export, fame, coin }. */
export function rates(state) {
  const season = SEASONS.effects[seasonOf(state)],
    sites = planningSites(state);
  const planning = { efficiency: 1, upkeep: 0, pollution: 0 };
  const r = { make: {}, use: {}, house: 0, lifePoints: 0, beauty: 0, smoke: 0, sell: 0, export: 0, fame: 0, coin: 0, planning };
  let totalLevel = 0, effectiveLevel = 0;
  const add = (bag, key, value) => (bag[key] = (bag[key] ?? 0) + value);
  state.plots.forEach((plot, i) => {
    if (!plot.kind || plot.level === 0) return;
    const spec = BUILDINGS[plot.kind],
      boost = plotBoost(state, i),
      level = plot.level,
      plan = parcelPlan(state, i, plot.kind, sites),
      base = level * milestone(level) * boost,
      scaled = base * plan.multiplier;
    effectiveLevel += plan.multiplier * level;
    totalLevel += level;
    planning.upkeep += plan.upkeep * level;
    if (spec.house) r.house += spec.house * level * (1 + 0.1 * Math.floor(level / 10));
    if (spec.life) r.lifePoints += spec.life * level ** 0.8 * boost * plan.multiplier;
    if (spec.beauty) r.beauty += spec.beauty * level ** 0.8;
    r.smoke += plan.smoke * level;
    if (spec.sell) (spec.export ? (r.export += spec.sell * scaled) : (r.sell += spec.sell * scaled));
    for (const [key, value] of Object.entries(spec.out ?? {})) {
      const seasonal = WORKSHOP_GOODS.has(key) ? season.craft ?? 1 : season[key] ?? 1,
        visitors = spec.visitors ? (0.5 + state.life / 100) * (season.visitors ?? 1) : 1;
      if (key === 'fame') r.fame += value * scaled;
      else if (key === 'coin') r.coin += value * scaled * visitors;
      else add(r.make, key, value * scaled * seasonal * (1 + giftOf(state, key)));
    }
    for (const [key, value] of Object.entries(spec.use ?? {})) add(r.use, key, value * base);
  });
  if (totalLevel) planning.efficiency = effectiveLevel / totalLevel;
  planning.pollution = r.smoke;
  planning.upkeep += state.defence.troops.reduce((sum, count) => sum + count, 0) * 2;
  state.nodes.forEach((node, i) => {
    if (!node.found || node.level === 0) return;
    const spec = NODES[node.kind],
      talent = talentAt(state, { type: 'node', key: i });
    const boost = (1 + (talent ? talentPower(talent, 'craft') * 0.6 : 0)) * (1 + officeBonus(state, 'deputy', 0.25)) * (1 + PROMOTION.bonus * state.term);
    for (const [key, value] of Object.entries(spec.out)) add(r.make, key, value * node.level * milestone(node.level) * boost * (season[key] ?? 1));
  });
  add(r.use, 'grain', state.pop * PEOPLE.eat);
  r.fame *= 1 + giftOf(state, 'fame');
  r.coin *= 1 + giftOf(state, 'visitors');
  const sellUp = (1 + giftOf(state, 'sell') + officeBonus(state, 'registrar', 0.2)) * (season.sell ?? 1) * (1 + moodValue(state, 'sellBoost'));
  r.sell *= sellUp;
  r.export *= sellUp;
  r.salary = PEOPLE.salary * (1 + state.rank);
  r.tax = state.pop * PEOPLE.tax * (0.5 + state.life / 100) * (1 + officeBonus(state, 'registrar', 0.3) + giftOf(state, 'tax')) * (1 + PROMOTION.bonus * state.term);
  return r;
}

function moodValue(state, key) {
  return state.moods.reduce((sum, m) => (m.until > state.time ? sum + (m[key] ?? 0) : sum), 0);
}

/** Livelihood 0–100 from services, beauty, food, smoke, crowding, the season and recent events. */
export function livelihood(state, r = rates(state)) {
  const need = 6 + 4 * Math.sqrt(state.pop / 50);
  let life = 45 + 35 * Math.min(1.2, r.lifePoints / need) + 10 * Math.min(1, r.beauty / (3 + state.pop / 400));
  life += state.res.grain > 0 || (r.make.grain ?? 0) >= r.use.grain ? 4 : -25;
  life -= Math.min(30, r.smoke * 0.35);
  if (state.pop > r.house * 0.98) life -= 3;
  life += SEASONS.effects[seasonOf(state)].life ?? 0;
  life += moodValue(state, 'life') + giftOf(state, 'life');
  return Math.max(0, Math.min(100, life));
}

/** The strength of the next raid: raiders come for what the county has. */
export const raidPower = (state) => RAIDS.power(state.raid.n, state.rank, state.pop);

/** The raid report announces which quarter is under threat. */
export const raidSide = (state) => ((state.seed >>> 0) + state.raid.n) % SIDES.length;
export const troopCapacity = (state) => state.rank < 2 ? 0 : 12 + (state.rank - 2) * 3 + state.defence.camp * 4;

/** Set a side's garrison without exceeding the county's available troops. */
export function stationTroops(state, side, count) {
  if (!Number.isInteger(side) || !SIDES[side] || !Number.isInteger(count) || count < 0) return { why: 'none' };
  if (state.rank < 2) return { why: 'rank' };
  const other = state.defence.troops.reduce((sum, value, i) => i === side ? sum : sum + value, 0);
  if (count + other > troopCapacity(state)) return { why: 'troops' };
  state.defence.troops[side] = count;
  return {};
}

/** Fortifications and soldiers on the threatened side, supported by the common camp. */
export function defencePower(state, side = raidSide(state)) {
  const d = state.defence;
  const m = (l) => l * milestone(l);
  let power = m(d.wall[side]) * DEFENCE.wall.power + m(d.tower[side]) * DEFENCE.tower.power +
    m(d.camp) * DEFENCE.camp.power + d.troops[side] * 9;
  power *= 1 + officeBonus(state, 'sheriff', 0.5) + giftOf(state, 'defence');
  for (const key of ['wall', 'camp', `wall:${side}`, `tower:${side}`]) {
    const talent = talentAt(state, { type: 'defence', key });
    if (talent) power *= 1 + talentPower(talent, 'arms') * 0.3;
  }
  if (state.raid.drums) power *= 1.25;
  return Math.round(power * (1 + PROMOTION.bonus * state.term));
}

// ——— Time ———

/**
 * Bring the county to real time `now`. Production counts only up to the offline cap (`active` false for an absence);
 * works, raids and petitions keep their real times. Returns the events: { works, raids, petitions, made, sold, tax }.
 */
export function advance(state, now, { active = true } = {}) {
  const elapsed = Math.max(0, now - state.time),
    report = { works: [], raids: [], petitions: 0, made: {}, sold: 0, tax: 0, seconds: elapsed, counted: elapsed };
  if (!elapsed) return report;
  const share = active ? 1 : Math.min(1, offlineCap(state) / elapsed);
  report.counted = elapsed * share;
  let left = elapsed;
  while (left > 0) {
    const next = nextEventAt(state),
      step = Math.min(left, active ? 10 : 60, Math.max(1, next - state.time));
    tick(state, step, share, report);
    left -= step;
    settle(state, report);
  }
  return report;
}

function nextEventAt(state) {
  let next = seasonEnd(state);
  for (const work of state.works) if (work.ends !== null) next = Math.min(next, work.ends);
  for (const mood of state.moods) if (mood.until > state.time) next = Math.min(next, mood.until);
  if (state.raid.next) next = Math.min(next, state.raid.next);
  if (!state.petition && state.nextPetition > state.time) next = Math.min(next, state.nextPetition);
  return next;
}

function tick(state, seconds, share, report) {
  const r = rates(state),
    hours = (seconds / HOUR) * share;
  state.life += (livelihood(state, r) - state.life) * Math.min(1, seconds / 120);
  // Use first, scaled down when an input runs short.
  const supply = {};
  for (const [key, value] of Object.entries(r.make)) supply[key] = value * hours;
  for (const [key, value] of Object.entries(r.use)) {
    if (key === 'grain') continue;
    const want = value * hours,
      have = state.res[key] + (supply[key] ?? 0);
    const ratio = want > 0 ? Math.min(1, have / want) : 1;
    if (ratio < 1) for (const [goods] of Object.entries(r.make)) if (usesInput(goods, key)) supply[goods] *= ratio;
    state.res[key] = Math.max(0, have - want * ratio);
    supply[key] = 0;
  }
  for (const [key, value] of Object.entries(supply)) {
    state.res[key] += value;
    report.made[key] = (report.made[key] ?? 0) + value;
  }
  state.res.grain = Math.max(0, state.res.grain - r.use.grain * hours);
  // Markets sell, dearest first, keeping two hours of grain; the dock pays more.
  const channels = [
    { remaining: r.export * hours, premium: 1.4 },
    { remaining: r.sell * hours, premium: 1 }
  ];
  // Markets keep back what the next rank asks for, and two hours of grain.
  const need = needFor(state, state.rank + 1) ?? {};
  for (const goods of GOODS) {
    const keep = Math.max(need[goods] ?? 0, goods === 'grain' ? r.use.grain * 2 : 0);
    let stock = Math.max(0, state.res[goods] - keep);
    for (const channel of channels) {
      const units = Math.min(stock, channel.remaining);
      if (units <= 0) continue;
      const proceeds = units * RESOURCES[goods].price * channel.premium;
      stock -= units;
      channel.remaining -= units;
      state.res[goods] -= units;
      state.res.coin += proceeds;
      report.sold += proceeds;
      state.stats.sold += proceeds;
    }
  }
  state.res.coin = Math.max(0, state.res.coin + (r.coin + r.salary - r.planning.upkeep) * hours);
  state.fame += r.fame * hours;
  // Taxes wait at the yamen until collected, up to as many hours as an absence counts.
  const taxCap = r.tax * (offlineCap(state) / HOUR),
    before = state.pendingTax;
  state.pendingTax = Math.max(before, Math.min(taxCap, before + r.tax * hours));
  report.tax += state.pendingTax - before;
  // People come towards the housing, faster when life is good; hunger sends some away.
  const starving = state.res.grain <= 0 && (r.make.grain ?? 0) < r.use.grain;
  const target = starving ? state.pop * 0.9 : r.house,
    pace = Math.max(-0.3, Math.min(1.5, (state.life - 35) / 30));
  const halfLife = state.rank === 0 ? PEOPLE.villageGrowHalfLife : PEOPLE.growHalfLife;
  const k = (Math.LN2 / halfLife) * seconds * share;
  if (target > state.pop) state.pop += (target - state.pop) * Math.min(1, k * Math.max(0, pace));
  else state.pop += (target - state.pop) * Math.min(1, k * 0.5);
  if (pace < 0) state.pop *= 1 + pace * 0.02 * (seconds / HOUR);
  state.pop = Math.max(10, state.pop);
  state.time += seconds;
}

function usesInput(goods, input) {
  for (const spec of Object.values(BUILDINGS)) if (spec.out?.[goods] && spec.use?.[input]) return true;
  return false;
}

/** Finish works, fight raids and raise petitions that are due. */
function settle(state, report) {
  for (const work of state.works.filter((w) => w.ends !== null && w.ends <= state.time)) {
    finishWork(state, work);
    report.works.push(work);
  }
  state.works = state.works.filter((w) => w.ends === null || w.ends > state.time);
  startQueued(state);
  if (state.raid.next && state.raid.next <= state.time) report.raids.push(fight(state));
  if (!state.petition && state.time >= state.nextPetition) {
    drawPetition(state);
    report.petitions++;
  }
  state.moods = state.moods.filter((m) => m.until > state.time);
  if (state.time >= state.freeRecruitAt + RECRUIT.freeEvery * 3) state.freeRecruitAt = state.time - RECRUIT.freeEvery * 3;
}

function finishWork(state, work) {
  state.stats.built++;
  if (work.type === 'plot') state.plots[work.key].level = work.level;
  else if (work.type === 'node') state.nodes[work.key].level = work.level;
  else if (work.type === 'tower') state.defence.tower[work.key] = work.level;
  else if (work.type === 'wall') {
    if (work.key === 'wall') state.defence.wall.fill(work.level); // Work started before the old shared wall was split.
    else state.defence.wall[work.key] = work.level;
  } else if (work.type === 'camp') state.defence.camp = work.level;
  else if (work.type === 'survey') state.nodes[work.key].found = true;
  else if (work.type === 'rank') {
    state.rank = work.level;
    if (state.rank === 2 && !state.raid.next) state.raid.next = state.time + RAIDS.every;
    if (state.rank === FINAL_RANK) state.termDone = true;
  }
  const completed = { type: work.type, key: work.key, level: work.level };
  if (work.type === 'plot') completed.kind = state.plots[work.key].kind;
  state.log.unshift({ at: work.ends, type: 'done', work: completed });
  state.log.length = Math.min(state.log.length, 40);
}

function fight(state) {
  const power = raidPower(state),
    side = raidSide(state),
    defence = defencePower(state, side),
    roll = 0.9 + random(state) * 0.2,
    won = defence >= power * roll,
    kind = RAIDS.kinds[state.raid.n % RAIDS.kinds.length];
  const result = { at: state.raid.next, n: state.raid.n, kind, side, power, defence, won, loot: 0, lost: {} };
  if (won) {
    result.loot = Math.round(power * 40);
    state.res.coin += result.loot;
    state.fame += Math.round(power / 3);
    state.stats.raidsWon++;
  } else {
    // Even a losing garrison buys time to move some goods out of reach.
    const loss = RAIDS.loss * (1 - 0.65 * Math.min(1, defence / Math.max(1, power)));
    for (const key of ['coin', ...GOODS]) {
      const amount = Math.floor(state.res[key] * loss);
      state.res[key] -= amount;
      result.lost[key] = amount;
    }
    state.moods.push({ life: -RAIDS.sorrow, until: state.time + 2 * HOUR, why: 'raid' });
    state.stats.raidsLost++;
  }
  state.raid.last = result;
  state.raid.n++;
  state.raid.drums = false;
  state.raid.next = state.raid.next + RAIDS.every;
  state.log.unshift({ at: result.at, type: 'raid', won, kind, side });
  return result;
}

// ——— Actions ———

/** Works under way that need a builder (raising the yamen does not), and works waiting their turn. */
export const busy = (state) => state.works.filter((w) => w.type !== 'rank' && w.ends !== null).length;
export const queued = (state) => state.works.filter((w) => w.ends === null).length;
/** Each builder can have this many works waiting behind it. */
export const QUEUE_PER_BUILDER = 3;
/** Start waiting works while builders are free, oldest first. */
function startQueued(state) {
  for (const work of state.works) {
    if (work.ends !== null || busy(state) >= builders(state)) continue;
    work.starts = state.time;
    work.ends = state.time + work.duration;
  }
}
const worksTime = (state, seconds) => Math.max(5, Math.round(seconds * (1 - Math.min(0.6, giftOf(state, 'works')))));

/** Why something cannot be done now, or null. */
function blocked(state, price, level) {
  if (busy(state) + queued(state) >= builders(state) * (1 + QUEUE_PER_BUILDER)) return 'builders';
  if (level > maxLevel(state)) return 'maxLevel';
  if (!afford(state, price)) return 'cost';
  return null;
}

/** Can a plot take this building? */
export function canPlace(state, index, kind) {
  if (!Number.isInteger(index) || !state.plots[index] || !Object.hasOwn(BUILDINGS, kind)) return 'none';
  const spec = BUILDINGS[kind], ward = Math.floor(index / PLOTS_PER_DISTRICT);
  if (spec.riverside && !RIVERSIDE.has(index)) return 'river';
  if (!wardIsOpen(state, ward)) return 'closed';
  if (state.rank < spec.rank) return 'rank';
  if (state.plots[index].kind) return 'taken';
  return null;
}

const workKey = (state, target) => target.key ?? (target.type === 'wall' ? raidSide(state) : target.type);

/** What upgrading (or first building) a target would cost and take: { price, time, level, why }. */
export function quote(state, target) {
  let spec, level;
  const key = workKey(state, target);
  if (target.type === 'plot') {
    const plot = state.plots[key];
    if (!plot) return { why: 'none' };
    if (!RIVERSIDE.has(key) && (BUILDINGS[plot.kind]?.riverside || BUILDINGS[target.kind]?.riverside)) return { why: 'river' };
    if (!plot.kind) {
      const why = canPlace(state, key, target.kind);
      if (why) return { why };
    }
    spec = BUILDINGS[plot.kind ?? target.kind];
    level = plot.level;
  } else if (target.type === 'node') {
    const node = state.nodes[key];
    if (!node) return { why: 'none' };
    spec = NODES[node.kind];
    level = node.level;
    if (!node.found) return { why: 'hidden' };
  } else if (target.type === 'tower' || target.type === 'wall') {
    if (!Number.isInteger(key) || !SIDES[key]) return { why: 'none' };
    spec = DEFENCE[target.type];
    level = state.defence[target.type][key];
  } else if (target.type === 'camp') {
    spec = DEFENCE.camp;
    level = state.defence.camp;
  } else {
    return { why: 'none' };
  }
  if (state.rank < spec.rank) return { why: 'rank' };
  if (state.works.some((w) => w.type === target.type && (w.key === key || (w.type === 'wall' && w.key === 'wall')))) return { why: 'working' };
  const price = priceOf(spec, level),
    time = worksTime(state, worksOf(spec, level));
  return { price, time, level: level + 1, why: blocked(state, price, level + 1) };
}

/** Build or upgrade a target ({type: plot|node|wall|tower|camp, key, kind?}). Returns the work or a reason. */
export function upgrade(state, target) {
  const q = quote(state, target);
  if (q.why) return { why: q.why };
  pay(state, q.price);
  if (target.type === 'plot' && !state.plots[target.key].kind) state.plots[target.key].kind = target.kind;
  const work = { type: target.type, key: workKey(state, target), level: q.level, starts: null, ends: null, duration: q.time };
  state.works.push(work);
  startQueued(state);
  return { work };
}

/** Choose or clear the optional ward focus. Existing buildings and works stay in place. */
export function zone(state, ward, zoneKey) {
  if (!wardIsOpen(state, ward)) return { why: 'closed' };
  if (zoneKey !== null && !ZONES.includes(zoneKey)) return { why: 'none' };
  state.districts[ward].zone = zoneKey;
  return {};
}

/** Move a dock inherited from an older layout, keeping its building level, work and assigned talent. */
export function moveDock(state, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || !state.plots[to]) return { why: 'none' };
  const dock = state.plots[from];
  if (dock?.kind !== 'dock' || RIVERSIDE.has(from)) return { why: 'none' };
  if (!RIVERSIDE.has(to)) return { why: 'river' };
  if (!wardIsOpen(state, Math.floor(to / PLOTS_PER_DISTRICT))) return { why: 'closed' };
  if (state.plots[to].kind || state.works.some((work) => work.type === 'plot' && work.key === to)) return { why: 'taken' };
  const move = (ref) => {
    if (ref?.type === 'plot' && ref.key === from) ref.key = to;
  };
  state.plots[to] = dock;
  state.plots[from] = { kind: null, level: 0 };
  for (const work of state.works) move(work);
  for (const talent of state.talents) move(talent.post);
  // Older logs looked up the building at the original plot, which is now empty.
  for (const { work } of state.log) if (work?.type === 'plot' && work.key === from) work.kind ??= dock.kind;
  return {};
}

/** Pull down a building; half its last price comes back. */
export function demolish(state, index) {
  const plot = state.plots[index];
  if (!plot.kind || state.works.some((w) => w.type === 'plot' && w.key === index)) return { why: 'none' };
  const back = priceOf(BUILDINGS[plot.kind], Math.max(0, plot.level - 1));
  for (const [key, value] of Object.entries(back)) state.res[key] += Math.floor(value / 2);
  for (const talent of state.talents) if (talent.post?.type === 'plot' && talent.post.key === index) talent.post = null;
  state.plots[index] = { kind: null, level: 0 };
  return {};
}

/** Send surveyors to find the next resource point. */
export function survey(state) {
  const index = state.nodes.findIndex((n) => !n.found);
  if (index < 0) return { why: 'none' };
  if (state.works.some((w) => w.type === 'survey')) return { why: 'working' };
  const kind = state.nodes[index].kind;
  if (state.rank < NODES[kind].rank) return { why: 'rank' };
  const price = { coin: SURVEY_COST(state.surveys) };
  const why = blocked(state, price, 1);
  if (why) return { why };
  pay(state, price);
  state.surveys++;
  const work = { type: 'survey', key: index, level: 1, starts: null, ends: null, duration: worksTime(state, SURVEY_TIME[Math.min(SURVEY_TIME.length - 1, state.surveys - 1)]) };
  state.works.push(work);
  startQueued(state);
  return { work };
}

/** Raise the yamen to the next rank. */
export function rankUp(state) {
  if (state.rank >= FINAL_RANK) return { why: 'top' };
  if (state.works.some((w) => w.type === 'rank')) return { why: 'working' };
  const need = needFor(state, state.rank + 1);
  if (state.pop < need.pop) return { why: 'pop' };
  if (need.life && state.life < need.life) return { why: 'life' };
  const price = Object.fromEntries(Object.entries(need).filter(([key]) => key !== 'pop' && key !== 'life'));
  if (!afford(state, price)) return { why: 'cost' };
  pay(state, price);
  const work = { type: 'rank', key: 'rank', level: state.rank + 1, starts: state.time, ends: state.time + worksTime(state, RANKS[state.rank + 1].time) };
  state.works.push(work);
  return { work };
}

/** Collect the taxes waiting at the yamen. */
export function collectTax(state) {
  const amount = Math.floor(state.pendingTax);
  state.res.coin += amount;
  state.pendingTax -= amount;
  if (amount > 0) state.stats.taxTaps++;
  return amount;
}

/** Beat the drums for the coming raid (in its warning hour): a quarter more power. */
export function drums(state) {
  if (!state.raid.next || state.raid.next - state.time > RAIDS.warn || state.raid.drums) return { why: 'not-now' };
  state.raid.drums = true;
  return {};
}

/** The fame the next call on worthies costs, and whether a free one waits. */
export const recruitPrice = (state) => Math.round(RECRUIT.fame(state.recruits) * (1 - Math.min(0.5, giftOf(state, 'recruit'))));
export const freeRecruit = (state) => state.time >= state.freeRecruitAt + RECRUIT.freeEvery;

/** Call on a worthy: a new talent, or a star for one already here. */
export function recruit(state) {
  const free = freeRecruit(state),
    price = recruitPrice(state);
  if (!free && state.fame < price) return { why: 'cost' };
  if (free) state.freeRecruitAt = state.time;
  else state.fame -= price;
  state.recruits++;
  state.pity++;
  let rarity;
  if (state.pity >= RECRUIT.pity) rarity = random(state) < 0.15 ? 'hero' : 'worthy';
  else {
    let roll = random(state) * 100;
    rarity = Object.keys(RARITY).find((key) => (roll -= RARITY[key].weight) < 0) ?? 'clerk';
  }
  if (rarity === 'hero' || rarity === 'worthy') state.pity = 0;
  const pool = TALENTS.filter((t) => t.rarity === rarity),
    spec = pool[Math.floor(random(state) * pool.length)];
  const have = state.talents.find((t) => t.id === spec.id);
  if (have) {
    have.stars = Math.min(5, have.stars + 1);
    return { talent: have, star: true };
  }
  const talent = { id: spec.id, level: 1, exp: 0, stars: 1, post: null };
  state.talents.push(talent);
  return { talent, star: false };
}

/** Post a talent to a plot, a resource point, a defence or an office (or nowhere with null). */
export function post(state, id, place) {
  const talent = state.talents.find((t) => t.id === id);
  if (!talent) return { why: 'none' };
  if (place) for (const other of state.talents) if (other.post && other.post.type === place.type && other.post.key === place.key) other.post = null;
  talent.post = place;
  return {};
}

/** Talents posted gain experience with time; called by the page and the pacing tool with the hours that passed. */
export function trainTalents(state, hours) {
  for (const talent of state.talents) {
    if (!talent.post || talent.level >= RECRUIT.maxLevel) continue;
    talent.exp += hours;
    while (talent.level < RECRUIT.maxLevel && talent.exp >= RECRUIT.levelExp(talent.level)) {
      talent.exp -= RECRUIT.levelExp(talent.level);
      talent.level++;
    }
  }
}

const petitionRandom = (state, salt) => seeded((state.seed ^ Math.imul(state.petitionCount ?? 0, 0x9e3779b9) ^ salt) >>> 0)();

function drawPetition(state) {
  const season = seasonOf(state),
    eligible = PETITIONS.list.filter((p) => p.seasons.includes(season) && (p.rank ?? 0) <= state.rank),
    recent = state.petitionRecent ?? [],
    fresh = eligible.filter((p) => !recent.includes(p.id)),
    pool = fresh.length ? fresh : eligible.filter((p) => p.id !== recent.at(-1));
  const id = !state.petitionCount && !recent.length && season === 0
    ? 'seedFair'
    : pool[Math.floor(petitionRandom(state, 0x9632) * pool.length)].id;
  state.petition = { id, at: state.time, season };
  state.petitionCount = (state.petitionCount ?? 0) + 1;
  state.petitionRecent = [...recent, id].slice(-PETITIONS.recent);
}

/** Read the actual changes this choice would make, with a two-hour reserve for feeding the county. */
export function petitionOffer(state, choice) {
  const spec = PETITIONS.list.find((p) => p.id === state.petition?.id);
  if (!spec || (choice !== 'a' && choice !== 'b')) return { why: 'none' };
  const effect = spec[choice],
    scale = PETITIONS.scale[state.rank] * Math.sqrt(1 + PROMOTION.grow * state.term),
    delta = {};
  for (const key of ['coin', 'grain', 'wood']) {
    if (effect[key]) delta[key] = Math.sign(effect[key]) * Math.round(Math.abs(effect[key]) * scale);
  }
  if (effect.fame) delta.fame = effect.fame;
  const offer = { delta, life: effect.life ?? 0, sellBoost: effect.sellBoost ?? 0, duration: (effect.minutes ?? 0) * 60, talent: Boolean(effect.talent) };
  const short = ['coin', 'grain', 'wood'].some((key) => {
    const guard = key === 'grain' ? Math.ceil(state.pop * PEOPLE.eat * 2) : 0;
    return delta[key] < 0 && state.res[key] + delta[key] < guard;
  });
  return short ? { ...offer, why: 'cost' } : offer;
}

/** Answer the waiting petition with 'a' or 'b'. */
export function answer(state, choice) {
  const offer = petitionOffer(state, choice);
  if (offer.why) return offer;
  const { id } = state.petition;
  for (const [key, value] of Object.entries(offer.delta)) {
    if (key === 'fame') state.fame += value;
    else state.res[key] += value;
  }
  if (offer.duration) state.moods.push({ life: offer.life, sellBoost: offer.sellBoost, until: state.time + offer.duration, why: id });
  const talent = offer.talent ? recruitFree(state) : null;
  if (!state.petitionRecent?.includes(id)) {
    state.petitionRecent = [...(state.petitionRecent ?? []), id].slice(-PETITIONS.recent);
    state.petitionCount ??= 1;
  }
  state.petition = null;
  state.nextPetition = state.time + PETITIONS.every + Math.round(petitionRandom(state, 0xaf23) * PETITIONS.jitter);
  return { talent };
}
function recruitFree(state) {
  const next = state.freeRecruitAt;
  state.freeRecruitAt = -Infinity;
  const result = recruit(state);
  state.freeRecruitAt = next;
  return result;
}

/** Begin a new term after the county reached 州: talents and the rank of office carry over. */
export function promote(state, now) {
  if (!state.termDone) return null;
  return createCounty({ seed: state.seed + 1, now, term: state.term + 1, talents: state.talents.map((t) => ({ ...t })) });
}

// ——— Goals for the first steps ———

export const GOALS = [
  { id: 'houses', check: (s) => s.plots.filter((p) => p.kind === 'house' && p.level > 0).length >= 2, reward: { coin: 200 } },
  { id: 'fields', check: (s) => s.plots.filter((p) => p.kind === 'paddy' && p.level > 0).length >= 2, reward: { coin: 200, wood: 40 } },
  { id: 'forest', check: (s) => s.nodes.some((n) => n.kind === 'forest' && n.level > 0), reward: { coin: 300 } },
  { id: 'tax', check: (s) => s.stats.taxTaps >= 1, reward: { coin: 150 } },
  { id: 'market', check: (s) => s.plots.some((p) => p.kind === 'market' && p.level > 0), reward: { coin: 400, wood: 60 } },
  { id: 'rank1', check: (s) => s.rank >= 1, reward: { coin: 800, fame: 60 } },
  { id: 'recruit', check: (s) => s.talents.length >= 1, reward: { coin: 1000 } },
  { id: 'posted', check: (s) => s.talents.some((t) => t.post), reward: { wood: 300 } },
  { id: 'brewery', check: (s) => s.plots.some((p) => p.kind === 'brewery' && p.level > 0), reward: { coin: 1500 } },
  { id: 'rank2', check: (s) => s.rank >= 2, reward: { coin: 6000, fame: 120 } },
  { id: 'wall', check: (s) => s.defence.wall.some((level) => level >= 1), reward: { stone: 600 } },
  { id: 'silk', check: (s) => s.plots.some((p) => p.kind === 'loom' && p.level > 0), reward: { coin: 12000 } },
  { id: 'rank3', check: (s) => s.rank >= 3, reward: { coin: 60000, fame: 300 } },
  { id: 'porcelain', check: (s) => s.plots.some((p) => p.kind === 'kiln' && p.level > 0), reward: { coin: 100000 } },
  { id: 'rank4', check: (s) => s.rank >= 4, reward: { coin: 500000, fame: 600 } },
  { id: 'rank5', check: (s) => s.rank >= 5, reward: { coin: 3e6, fame: 1000 } },
  { id: 'rank6', check: (s) => s.rank >= 6, reward: { fame: 2000 } }
];

/** Claim the current goal if it is met; returns its reward or null. */
export function claimGoal(state) {
  const goal = GOALS[state.goal];
  if (!goal || !goal.check(state)) return null;
  for (const [key, value] of Object.entries(goal.reward)) {
    if (key === 'fame') state.fame += value;
    else state.res[key] += value;
  }
  state.goal++;
  return goal;
}
