// 模拟玩家：每次上线做一个县令会做的事——收税、领目标奖励、答民情、访贤、派人才、规划坊区、升格、补粮补房补民生、
// 备城防、补升格缺的材料、勘探，剩下的钱投到回本最快的地方。tools/pacing.mjs 用它量一局要多久，测试用它确认一局
// 打得完。
// A stand-in magistrate: on each visit it does what a player would — taxes, goals, petitions, worthies, posts, ward
// plans, rank, food, housing, livelihood, defence, what the next rank lacks, surveys, and the rest into what pays
// back soonest. tools/pacing.mjs measures a term with it; the tests check a term can be finished.
import { BUILDINGS, DEFENCE, NODES, RAIDS, RANKS, TALENTS, STATS, BUILDING_STAT, OFFICES } from './data.mjs';
import {
  afford, answer, busy, builders, queued, canPlace, claimGoal, collectTax, defencePower, districtsOpen, drums, freeRecruit, needFor,
  PLOTS_PER_DISTRICT, SIDES, plotPlan, post, quote, raidPower, raidSide, rankUp, rates, recruit, recruitPrice,
  stationTroops, survey, troopCapacity, upgrade, zone
} from './world.mjs';

const FILLER = ['survey', 'coin', 'fill-pop', 'materials'];
const CAP = { house: 10, manor: 6, paddy: 6, mulberry: 4, teaGarden: 4, market: 4, brewery: 2, loom: 3, kiln: 3, teahouse: 2, inn: 2, dock: 2, clinic: 2, school: 2, temple: 2, theatre: 2, garden: 2, pagoda: 1, granary: 2 };
const PLAN = ['home', 'farm', 'market', 'craft', 'farm', 'home'];
const SERVICES = ['clinic', 'teahouse', 'garden', 'school', 'temple', 'theatre', 'pagoda'];
const MAKERS = { wood: { node: 'forest' }, stone: { node: 'quarry' }, iron: { node: 'iron' }, clay: { node: 'clay' }, mulberry: { plot: 'mulberry' }, silk: { plot: 'loom' }, porcelain: { plot: 'kiln' }, tea: { plot: 'teaGarden' }, grain: { plot: 'paddy' }, wine: { plot: 'brewery' } };
const INPUTS = { silk: 'mulberry', porcelain: 'clay' };

/** One visit: returns how many things were done. */
export function visit(state) {
  if (state !== lastState) (target = null), lacking.clear(), (lastState = state);
  let done = 0;
  collectTax(state);
  while (claimGoal(state)) done++;
  if (state.petition) answer(state, 'a'), done++;
  while (freeRecruit(state) || state.fame >= recruitPrice(state) * 1.0) {
    if (recruit(state).why) break;
    done++;
  }
  placeTalents(state);
  if (state.rank >= 2) {
    const side = raidSide(state), capacity = troopCapacity(state);
    SIDES.forEach((_, i) => stationTroops(state, i, 0));
    if (raidIsNear(state)) stationTroops(state, side, capacity);
    else SIDES.forEach((_, i) => stationTroops(state, i, Math.floor(capacity / SIDES.length) + Number(i < capacity % SIDES.length)));
  }
  if (state.raid.next && state.raid.next - state.time < RAIDS.warn) drums(state);
  for (let w = 0; w < districtsOpen(state); w++) if (!state.districts[w].zone) zone(state, w, PLAN[w]);
  if (!rankUp(state).why) done++;
  // Fill the queue going round the wants, so none starves; keep the coin the next rank needs once the rest is near.
  const need = needFor(state, state.rank + 1);
  saving = {};
  if (need) {
    // Hold back each material the rank asks for; hold back its coin only once all else is in hand.
    for (const [k, v] of Object.entries(need)) if (!['pop', 'life', 'coin'].includes(k) && state.res[k] >= v * 0.5) saving[k] = v;
    const rest = Object.entries(need).filter(([k]) => k !== 'coin');
    if (rest.every(([k, v]) => (k === 'pop' ? state.pop : k === 'life' ? state.life : state.res[k]) >= v)) saving.coin = need.coin;
  }
  const capacity = builders(state) * 4;
  // A target saved for since an earlier visit is tried first; until it is bought, others keep its price.
  wanted = null;
  if (target) {
    saved = {};
    const step = serve(state, target.want, rates(state));
    if (step && !step.why) (target = null), done++;
    else if (++target.visits > 12) target = null;
  }
  for (const k of [...lacking]) if (state.res[k] > 2000 * (1 + state.rank)) lacking.delete(k);
  for (let round = 0; round < 12; round++) {
    let any = false;
    for (const want of wantsOf(state)) {
      // Filler work takes at most half the queue, so what the rank needs always finds a place.
      if (FILLER.includes(want) && busy(state) + queued(state) >= capacity / 2) continue;
      if (!FILLER.includes(want) && round === 0 && want !== 'grain' && want !== 'defence') wanted = wanted ?? null;
      const keep = target ? merge(saving, target.price) : wanted ? merge(saving, wanted) : saving;
      saved = want === 'grain' || want === 'defence' ? {} : FILLER.includes(want) || target ? keep : saving;
      const before = wanted;
      const step = serve(state, want, rates(state));
      if (step && !step.why) (any = true), done++;
      else if (!target && !before && wanted && !FILLER.includes(want)) target = { want, price: wanted, visits: 0 };
    }
    if (!any) break;
  }
  return done;
}

const level = (state, kind) => state.plots.filter((p) => p.kind === kind).reduce((s, p) => s + p.level, 0);
const raidIsNear = (state) => state.raid.next && state.raid.next - state.time < RAIDS.warn;
function defenceSide(state) {
  return raidIsNear(state) ? raidSide(state) : SIDES.reduce((weakest, _, side) =>
    defencePower(state, side) < defencePower(state, weakest) ? side : weakest, raidSide(state));
}

function tryPlot(state, kind, reserve) {
  // Upgrade the lowest of that kind, or build a new one if that is cheaper.
  const own = state.plots.map((p, i) => ({ p, i })).filter(({ p }) => p.kind === kind);
  const options = [];
  for (const { i } of own) {
    const q = quote(state, { type: 'plot', key: i });
    if (!q.why || q.why === 'cost') options.push({ target: { type: 'plot', key: i }, q });
  }
  // A new building only when there is room to spare or none of this kind yet.
  const home = BUILDINGS[kind].zone[0],
    wardZone = (i) => state.districts[Math.floor(i / PLOTS_PER_DISTRICT)].zone;
  const frees = state.plots.map((_, i) => i).filter((i) => !canPlace(state, i, kind));
  let free = -1;
  if (own.length < (CAP[kind] ?? 2) && (frees.length > 2 || own.length === 0 || own.every(({ p }) => p.level >= 8))) {
    let bestPlan = -Infinity;
    for (const index of frees) {
      const plan = plotPlan(state, index, kind);
      const score = plan.multiplier * (wardZone(index) === home ? 1.2 : 1) - plan.smoke * 0.14 - plan.upkeep * 0.007;
      if (score > bestPlan) {
        bestPlan = score;
        free = index;
      }
    }
  }
  if (free >= 0) {
    const q = quote(state, { type: 'plot', key: free, kind });
    options.push({ target: { type: 'plot', key: free, kind }, q });
  }
  return best(state, options, reserve);
}
function tryNode(state, kind, reserve) {
  const options = [];
  state.nodes.forEach((n, i) => {
    if (n.kind !== kind || !n.found) return;
    options.push({ target: { type: 'node', key: i }, q: quote(state, { type: 'node', key: i }) });
  });
  return best(state, options, reserve);
}
let saving = {},
  saved = {};
let lastState = null;
let wanted = null,
  target = null;
const lacking = new Set();
function best(state, options, reserve = saved) {
  const keeps = (price) => Object.entries(price).every(([k, v]) => (k === 'fame' ? state.fame : state.res[k]) - v >= (reserve[k] ?? 0) || (state.res[k] ?? 0) >= (reserve[k] ?? 0) * 3);
  // Remember the cheapest thing a pressing want could not afford, to save for it.
  const short = options.filter((o) => o.q.why === 'cost').sort((a, b) => (a.q.price.coin ?? 0) - (b.q.price.coin ?? 0))[0];
  if (short && !wanted) wanted = short.q.price;
  if (short) for (const [k, v] of Object.entries(short.q.price)) if (k !== 'coin' && k !== 'fame' && state.res[k] < v) lacking.add(k);
  const ok = options.filter((o) => !o.q.why && keeps(o.q.price)).sort((a, b) => (a.q.price.coin ?? 0) - (b.q.price.coin ?? 0));
  if (!ok.length) return null;
  return upgrade(state, ok[0].target);
}

const merge = (a, b) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v);
  return out;
};

/** What the county wants now, most pressing first. */
function wantsOf(state) {
  const r = rates(state),
    need = needFor(state, state.rank + 1) ?? {},
    wants = [];
  const net = (key) => (r.make[key] ?? 0) - (r.use[key] ?? 0);
  const farming = state.works.some((w) => w.type === 'plot' && state.plots[w.key].kind === 'paddy');
  if (!farming && net('grain') < r.use.grain * 0.15 + 5) wants.push('grain');
  if (state.rank >= 2 && state.raid.next && defencePower(state, defenceSide(state)) < raidPower(state) * 1.15) wants.push('defence');
  for (const [key, value] of Object.entries(need)) {
    if (key === 'pop') {
      if (r.house < value * 1.1 || (state.rank === 0 && state.pop > r.house * 0.9)) wants.push('pop');
    } else if (key === 'life') {
      if (state.life < value + 3) wants.push('life');
    } else if (key !== 'coin' && state.res[key] < value) wants.push(key);
  }
  if (state.life < 58 && !wants.includes('life')) wants.push('life');
  for (const k of lacking) if (!wants.includes(k) && MAKERS[k]) wants.push(k);
  wants.push(...FILLER);
  return wants;
}

/** One step towards a want. */
function serve(state, key, r) {
  if (key === 'defence') {
    const side = defenceSide(state);
    const options = [{ type: 'wall', key: side }, { type: 'tower', key: side }, { type: 'camp' }].map((t) => ({ target: t, q: quote(state, t) }));
    return best(state, options);
  }
  if (key === 'survey') return state.works.some((w) => w.type === 'survey') || state.res.coin < (saved.coin ?? 0) * 1.5 ? null : survey(state);
  if (key === 'materials') {
    for (const kind of ['forest', 'quarry', 'iron', 'clay']) {
      const step = tryNode(state, kind);
      if (step) return step;
    }
    return null;
  }
  const populationGoal = needFor(state, state.rank + 1)?.pop ?? state.pop;
  if (key === 'pop' || key === 'fill-pop') {
    if (state.rank > 0 && r.house >= populationGoal * 1.16) return null;
    return (state.rank >= 3 && tryPlot(state, 'manor')) || tryPlot(state, 'house');
  }
  if (key === 'life') {
    for (const kind of SERVICES) {
      if (state.rank < BUILDINGS[kind].rank) continue;
      const step = tryPlot(state, kind);
      if (step) return step;
    }
    return null;
  }
  if (key === 'coin') {
    for (const kind of ['market', 'house', 'teahouse', 'inn', 'dock', 'theatre', 'brewery']) {
      if (state.rank < BUILDINGS[kind].rank || (kind === 'house' && state.rank > 0 && r.house >= populationGoal * 1.16)) continue;
      const step = tryPlot(state, kind);
      if (step) return step;
    }
    return null;
  }
  const maker = MAKERS[key],
    input = INPUTS[key];
  if (input && (r.make[input] ?? 0) < (r.use[input] ?? 0) * 1.1 + 1) {
    const step = MAKERS[input].node ? tryNode(state, MAKERS[input].node) : tryPlot(state, MAKERS[input].plot);
    if (step) return step;
  }
  if (key === 'porcelain' && (r.make.wood ?? 0) < (r.use.wood ?? 0) * 1.2) {
    const step = tryNode(state, 'forest');
    if (step) return step;
  }
  const step = maker.node ? tryNode(state, maker.node) : tryPlot(state, maker.plot);
  if (step) return step;
  if (maker.node && !state.nodes.some((n) => n.kind === maker.node && n.found) && !state.works.some((w) => w.type === 'survey')) {
    const found = survey(state);
    if (!found.why) return found;
  }
  return null;
}

/** Post talents where their best attribute helps most: offices first, then the busiest plots. */
function placeTalents(state) {
  const free = state.talents.filter((t) => !t.post);
  if (!free.length) return;
  const statOf = (t, stat) => TALENTS.find((s) => s.id === t.id).stats[STATS.indexOf(stat)];
  for (const office of ['deputy', 'registrar', 'sheriff']) {
    if (state.talents.some((t) => t.post?.type === 'office' && t.post.key === office)) continue;
    const pick = free.filter((t) => !t.post).sort((a, b) => statOf(b, OFFICES[office]) - statOf(a, OFFICES[office]))[0];
    if (pick) post(state, pick.id, { type: 'office', key: office });
  }
  const spots = state.plots
    .map((p, i) => ({ p, i }))
    .filter(({ p, i }) => p.kind && p.level > 0 && !state.talents.some((t) => t.post?.type === 'plot' && t.post.key === i))
    .sort((a, b) => b.p.level - a.p.level);
  for (const { p, i } of spots) {
    const pick = state.talents.filter((t) => !t.post).sort((a, b) => statOf(b, BUILDING_STAT[p.kind]) - statOf(a, BUILDING_STAT[p.kind]))[0];
    if (!pick) break;
    post(state, pick.id, { type: 'plot', key: i });
  }
}

export { DEFENCE, NODES, RANKS, afford, PLOTS_PER_DISTRICT };
