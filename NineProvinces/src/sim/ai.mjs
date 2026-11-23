// 电脑君主：每十天想一次——任命太守、分派人手、开发城池、征兵、定税、研究、登用在野、颁招贤令；看有没有敌军逼近，
// 派兵救援；兵力有余时挑一个最好打的邻近目标出兵，拿下以后接着打或回城驻守。君主的性格（统武高还是智政高）
// 决定他先走霸道还是王道、先修城还是先垦田。玩家的势力只让电脑替他任命太守。
// The computer's rulers: every ten days each thinks again — appoints governors, places his officers, develops his
// cities, raises troops, sets the taxes, studies, wins over the unattached and issues the order for talent; sees whether
// an enemy draws near and sends help; and when he has men to spare, picks the easiest neighbouring target, marches on
// it, and when it falls goes on or settles in. A ruler's bent (command and war, or intellect and politics) decides
// whether he follows dominance or benevolence first, and walls before fields. For the player's own faction the computer
// only appoints governors.
import { UNITS } from '../data/battle.mjs';
import { ADJACENT, NODES } from '../data/map.mjs';
import { TECHS } from '../data/techs.mjs';
import { dayOf, reserved, serving, stat } from './core.mjs';
import { regard } from './diplomacy.mjs';
import { hostile, muster, order, troopCap, unitAllowed } from './military.mjs';
import { issueTalentOrder, moveGeneral, persuade } from './people.mjs';
import { appointGovernor, canStudy, caps, recruit, startWork, study, transfer, upkeep, workQuote } from './world.mjs';

/** Let half of the computer's powers think (the other half think next time). */
export function thinkAll(state, half) {
  const list = Object.values(state.factions).filter((f) => f.alive);
  list.forEach((f, i) => {
    if (i % 2 !== half) return;
    for (const id in state.nodes) if (state.nodes[id].owner === f.id) appointGovernor(state, id);
    if (f.id !== state.player) think(state, f);
  });
}

function think(state, f) {
  const mine = Object.keys(state.nodes).filter((id) => state.nodes[id].owner === f.id);
  if (!mine.length) return;
  const ruler = f.ruler,
    martial = stat(state, ruler, 'lead') + stat(state, ruler, 'war') > stat(state, ruler, 'int') + stat(state, ruler, 'pol');
  const frontier = new Set(mine.filter((id) => ADJACENT[id].some(({ to }) => hostile(state, f.id, state.nodes[to].owner))));
  placeOfficers(state, f, mine, frontier);
  develop(state, f, mine, frontier, martial);
  gather(state, f, mine, frontier);
  research(state, f, martial);
  talent(state, f, mine);
  defend(state, f, mine);
  attack(state, f, mine, frontier, martial);
  // Taxes follow the treasury and the people.
  const support = mine.reduce((s, id) => s + state.nodes[id].support, 0) / mine.length;
  f.tax = f.coin < 400 && support > 55 ? 'high' : support < 35 ? 'low' : 'normal';
}

/** Officers idle at the seat go where they are wanted: frontier cities, and cities without a governor. */
function placeOfficers(state, f, mine, frontier) {
  const cities = mine.filter((id) => NODES[id].kind !== 'port');
  for (const id of cities) {
    const here = serving(state, f.id, id).filter((g) => !(state.generals[g].busyUntil > state.day));
    const want = frontier.has(id) ? 3 : 1;
    if (here.length >= want) continue;
    // Take one from the place with the most to spare.
    let from = null,
      spare = 1;
    for (const other of cities) {
      const n = serving(state, f.id, other).length - (frontier.has(other) ? 3 : 1);
      if (other !== id && n > spare) (spare = n), (from = other);
    }
    if (!from) continue;
    const pick = serving(state, f.id, from).filter((g) => g !== f.ruler && g !== state.nodes[from].governor && !(state.generals[g].busyUntil > state.day))[0];
    if (pick) moveGeneral(state, f.id, pick, id);
  }
}

/** The most soldiers a power keeps under arms: about twelve thousand for each city it holds. */
function troopCeiling(state, mine) {
  return 20000 + mine.filter((id) => NODES[id].kind === 'city').length * 12000;
}

function develop(state, f, mine, frontier, martial) {
  const reserve = 600;
  // No more soldiers than the granaries can feed for half a year, nor than the realm can bear.
  const u = upkeep(state, f.id);
  const fed = f.grain > u.grain * 6 && u.troops < troopCeiling(state, mine);
  for (const id of mine) {
    const node = state.nodes[id];
    if (NODES[id].kind === 'city' && !node.work && f.coin > reserve) {
      const c = caps(id);
      const share = (k) => (c[k] ? node[k] / c[k] : 1);
      let kind = f.grain < 8000 || share('farm') < share('market') ? 'farm' : 'market';
      if (frontier.has(id) && share('wall') < (martial ? 0.75 : 0.6)) kind = 'wall';
      else if (share('office') < 0.4 && f.coin > 2000) kind = 'office';
      if (!workQuote(state, id, kind).full) startWork(state, f.id, id, kind);
    } else if (NODES[id].kind !== 'city' && !node.work && frontier.has(id) && f.coin > 1500 && node.wall < caps(id).wall) startWork(state, f.id, id, 'wall');
    // Conscription where the garrison is thin.
    const want = NODES[id].kind === 'city' ? NODES[id].size * (frontier.has(id) ? 5000 : 1600) : frontier.has(id) ? 3000 : 600;
    if (fed && NODES[id].kind === 'city' && node.troops < want && f.coin > 300 && node.support > 25) recruit(state, f.id, id, Math.min(want - node.troops, 6000));
  }
}

/** Interior places send their spare soldiers on towards the frontier. */
function gather(state, f, mine, frontier) {
  for (const id of mine) {
    if (frontier.has(id)) continue;
    const node = state.nodes[id],
      keep = NODES[id].kind === 'city' ? NODES[id].size * 800 : 300;
    if (node.troops < keep + 2000) continue;
    const toward = ADJACENT[id].map((l) => l.to).filter((n) => state.nodes[n].owner === f.id);
    // Towards the frontier, but not onto a frontier already crowded.
    const crowded = (n) => state.nodes[n].troops > (NODES[n].kind === 'city' ? NODES[n].size * 15000 : 9000);
    const next = toward.find((n) => frontier.has(n) && !crowded(n)) ?? toward.filter((n) => !crowded(n)).sort((x, y) => state.nodes[x].troops - state.nodes[y].troops)[0];
    if (next) transfer(state, f.id, id, next, node.troops - keep);
  }
  // A rich treasury goes into soldiers, up to what the realm can bear.
  const u = upkeep(state, f.id);
  if (f.coin > 2500 * Math.max(1, mine.length / 3) && f.grain > u.grain * 10 && u.troops < troopCeiling(state, mine))
    for (const id of frontier) if (NODES[id].kind === 'city') recruit(state, f.id, id, 5000);
}

function research(state, f, martial) {
  if (f.research.current) return;
  const open = Object.values(TECHS).filter((t) => canStudy(state, f.id, t.id));
  if (!open.length) return;
  const way = martial ? 'ba' : 'wang';
  open.sort((a, b) => a.tier - b.tier + (a.way === way ? -0.6 : 0) - (b.way === way ? -0.6 : 0) + (a.cost - b.cost) / 2000);
  study(state, f.id, open[0].id);
}

function talent(state, f, mine) {
  const officers = serving(state, f.id);
  for (const id of mine) {
    for (const g in state.generals) {
      const s = state.generals[g];
      if (s.status !== 'free' || s.at !== id || reserved(state, g, f.id)) continue;
      const by = officers.filter((o) => state.generals[o].at === id || o === f.ruler).sort((a, b) => stat(state, b, 'cha') - stat(state, a, 'cha'))[0];
      if (by && !(state.generals[by].busyUntil > state.day)) persuade(state, f.id, by, g);
    }
  }
  if (officers.length < 6 + mine.length && f.coin > 2500 && !(f.talentOrder > state.day)) issueTalentOrder(state, f.id, 6);
}

/** Enemy armies on the way to one of our places: send help from the neighbours. */
function defend(state, f, mine) {
  for (const a of Object.values(state.armies)) {
    if (!hostile(state, f.id, a.faction) || !a.target || state.nodes[a.target]?.owner !== f.id) continue;
    const target = a.target,
      node = state.nodes[target];
    if (node.troops > a.troops * 1.2) continue;
    const already = Object.values(state.armies).some((b) => b.faction === f.id && (b.target === target || b.at === target));
    if (already) continue;
    for (const { to } of ADJACENT[target]) {
      if (state.nodes[to].owner !== f.id || state.nodes[to].troops < 4000) continue;
      const team = bestTeam(state, f, to);
      if (!team) continue;
      const r = muster(state, f.id, to, { ...team, troops: Math.floor(state.nodes[to].troops * 0.5), target });
      if (r.ok) break;
    }
  }
}

/** Pick an easy neighbour to take, and march on it. */
function attack(state, f, mine, frontier, martial) {
  const armies = Object.values(state.armies).filter((a) => a.faction === f.id);
  // Armies resting at a taken place: settle in, or go on.
  for (const a of armies) {
    if (a.link || a.besieging || a.path.length) continue;
    const node = state.nodes[a.at];
    if (node?.owner === f.id) {
      const next = easiestFrom(state, f, a.at, a.troops);
      if (next && a.troops > 5000 && a.morale > 50) order(state, a.id, next.id);
      else {
        node.troops += a.troops;
        state.factions[f.id].grain += a.grain;
        for (const g of [a.commander, ...a.deputies]) if (g) state.generals[g].at = a.at;
        delete state.armies[a.id];
      }
    }
  }
  // Campaigns under way: one for each place being marched on or besieged.
  const busy = new Set(armies.filter((a) => a.target || a.besieging).map((a) => a.besieging ?? a.target)).size;
  const cities = mine.filter((id) => NODES[id].kind === 'city').length;
  const limit = Math.max(1, Math.min(3, Math.floor(cities / 8) + 1, Math.floor(serving(state, f.id).length / 3)));
  if (busy >= limit) return;
  if (f.ai.cooldown > state.day) return;
  let plan = null;
  for (const from of frontier) {
    const node = state.nodes[from];
    if (NODES[from].kind === 'port' && node.troops < 6000) continue;
    const spare = node.troops - (NODES[from].kind === 'city' ? NODES[from].size * 1000 : 800);
    if (spare < 3000) continue;
    const target = f.ai.joint?.until > state.day && ADJACENT[from].some((l) => l.to === f.ai.joint.target) ? { id: f.ai.joint.target, cost: 0 } : easiestFrom(state, f, from, spare);
    if (target && (!plan || target.cost < plan.cost)) plan = { from, target: target.id, cost: target.cost, spare };
  }
  if (!plan) plan = campaign(state, f, frontier);
  if (!plan) return;
  // Enough men to take it: from each source as many armies as it takes (up to four), each led by its best free team.
  const target = state.nodes[plan.target];
  const guards = Object.values(state.armies)
    .filter((a) => a.at === plan.target && a.faction === target.owner)
    .reduce((n, a) => n + a.troops, 0);
  const needed = (target.troops + guards) * (1 + target.wall / 150) * 1.4 + 3000;
  let sent = 0,
    men = 0;
  for (const from of plan.sources ?? [plan.from]) {
    for (let k = 0; k < 4 && men < needed; k++) {
      const node = state.nodes[from];
      const spare = node.troops - (NODES[from].kind === 'city' ? NODES[from].size * 1000 : 800);
      const team = bestTeam(state, f, from);
      if (!team || spare < 2500) break;
      const r = muster(state, f.id, from, { ...team, troops: Math.min(spare, needed - men, troopCap(state, team.commander) * 1.4), target: plan.target });
      if (!r.ok) break;
      sent++;
      men += state.armies[r.army].troops;
    }
  }
  if (sent) f.ai.cooldown = state.day + (martial ? 60 : 90) + Math.min(60, cities * 3);
}

/** When no one place can take a neighbour alone: every place next to a target sends what it can spare. */
function campaign(state, f, frontier) {
  let best = null;
  const targets = new Set();
  for (const from of frontier) for (const { to } of ADJACENT[from]) if (hostile(state, f.id, state.nodes[to].owner) && !spared(state, state.nodes[to].owner)) targets.add(to);
  for (const to of targets) {
    const node = state.nodes[to];
    if (node.owner && regard(state, f.id, node.owner) > 40) continue;
    if (f.id === 'han' && f.ruler === 'hejin' && node.owner && state.factions[node.owner].camp !== 'Y') continue;
    const sources = ADJACENT[to].map((l) => l.to).filter((n) => state.nodes[n].owner === f.id);
    const spare = sources.reduce((s, n) => s + Math.max(0, state.nodes[n].troops - (NODES[n].kind === 'city' ? NODES[n].size * 1000 : 800)), 0);
    const cost = node.troops * (1 + node.wall / 150) * (NODES[to].kind === 'pass' ? 1.4 : 1);
    if (spare < cost * 1.1 || sources.length < 2) continue;
    const score = cost / (NODES[to].kind === 'city' ? 1 + NODES[to].size / 3 : 0.6);
    if (!best || score < best.cost) best = { sources, target: to, cost: score };
  }
  return best;
}

/** The neighbouring place easiest to take for an army of this size, if any is worth it. */
/** In the first months the computer leaves the player be, longer on easier settings, so a new lord can find his feet. */
const GRACE = { easy: 540, normal: 300, hard: 120 };
// Powers the tales of history need alive until their part is played: the court until Dong Zhuo comes for it, Ding
// Yuan until Lü Bu turns, Dong Zhuo until the lords rise against him, and those a tale's own events are about.
const KEPT = [
  { owner: 'han', branch: 'history', until: [190, 1], done: 'dongEnters' },
  { owner: 'dingyuan', branch: 'history', until: [190, 1], done: 'lvbuTurns' },
  { owner: 'dongzhuo', branch: 'history', until: [191, 6] },
  { owner: 'hanfu', branch: 'yuanshao', until: [191, 8], done: 'y_ji' },
  { owner: 'gongsunzan', branch: 'yuanshao', until: [194, 1], done: 'y_jieqiao' },
  { owner: 'taoqian', branch: 'liubei', until: [194, 4], done: 'l_xu' },
  { owner: 'yuanshao', branch: 'caocao', until: [200, 3], done: 'c_guandu' },
  { owner: 'yuanshao', branch: 'history', until: [196, 1] }
];
function spared(state, owner) {
  if (owner === null) return false;
  if (owner === state.player) return state.day < 30 + (GRACE[state.options?.difficulty] ?? 300);
  if (state.branch === 'free') return false;
  return KEPT.some((k) => k.owner === owner && (k.branch === 'history' || k.branch === state.branch) && state.day < dayOf(...k.until) && !(k.done && state.fired[k.done]));
}

function easiestFrom(state, f, from, troops) {
  let best = null;
  for (const { to, link } of ADJACENT[from]) {
    const node = state.nodes[to];
    if (!hostile(state, f.id, node.owner) || spared(state, node.owner)) continue;
    if (link.kind === 'sea' && troops < 8000) continue;
    // Do not pick a fight with a much loved neighbour; the court marches only on rebels.
    if (node.owner && regard(state, f.id, node.owner) > 40) continue;
    if (f.id === 'han' && f.ruler === 'hejin' && node.owner && state.factions[node.owner].camp !== 'Y') continue;
    const guards = Object.values(state.armies)
      .filter((a) => a.at === to && a.faction === node.owner)
      .reduce((s, a) => s + a.troops, 0);
    const cost = (node.troops + guards) * (1 + node.wall / 150) * (NODES[to].kind === 'pass' ? 1.4 : 1);
    const worth = NODES[to].kind === 'city' ? 1 + NODES[to].size / 3 : 0.6;
    if (cost * 1.05 > troops) continue;
    const total = 76;
    const hated = node.owner && (state.factions[node.owner].size ?? 0) >= total / 3 ? 0.6 : 1;
    const score = (cost / worth) * hated;
    if (!best || score < best.cost) best = { id: to, cost: score };
  }
  return best;
}

/** The best commander and two deputies at a place, and the troops and formation that suit them. */
function bestTeam(state, f, at) {
  const here = serving(state, f.id, at).filter((g) => !(state.generals[g].busyUntil > state.day) && g !== state.nodes[at].governor);
  if (!here.length) {
    const gov = state.nodes[at].governor;
    if (!gov || gov === f.ruler) return null;
    here.push(gov);
  }
  here.sort((a, b) => stat(state, b, 'lead') + stat(state, b, 'war') - stat(state, a, 'lead') - stat(state, a, 'war'));
  const commander = here[0],
    deputies = here.slice(1, 3);
  const team = [commander, ...deputies];
  const options = ['hubao', 'xiliang', 'baima', 'xianzhen', 'xiandeng', 'wudang', 'danyang', 'tengjia', 'elephant', 'qingzhou', 'heavycav', 'cavalry', 'repeater', 'crossbow', 'horsearcher', 'halberd', 'spear'];
  const strong = stat(state, commander, 'war') >= stat(state, commander, 'int');
  let unit = 'spear';
  for (const u of options) {
    if (!unitAllowed(state, f.id, team, u)) continue;
    const g = UNITS[u].group;
    if (!strong && g === 'cav' && u !== 'horsearcher') continue;
    if (f.coin < ((UNITS[u].cost.coin - 100) * 8000) / 1000) continue;
    unit = u;
    break;
  }
  if (!strong && unit === 'spear' && f.coin > 800) unit = 'archer';
  const formation = { cav: 'arrowhead', bow: 'geese', inf: 'fishscale', siege: 'square', navy: 'fishscale' }[UNITS[unit].group];
  return { commander, deputies, unit, formation };
}
