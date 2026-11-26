// Read-only campaign presentation over the existing battle rules. Snapshots
// belong to an open result screen, never to simulation saves or replay tapes.
import { NODES } from '../data/map.mjs';
import { along, routeLine } from '../sim/ways.mjs';
import { hostile } from '../sim/military.mjs';
import { FERRY_HOLD_SECONDS, isFerryBattle } from '../sim/battle-ferry.mjs';

export function campaignBattlePresentation(state, setup) {
  if (setup.kind !== 'siege' || setup.place.node !== 'nanpi' || setup.factions[0] !== state.player) return setup;
  return { ...setup, presentation: 'nanpi-sunset' };
}

export function campaignBattleBriefing(setup, player) {
  const side = setup.factions.indexOf(player);
  const total = k => ({
    units: setup.units.filter(u => u.side === k).length,
    troops: setup.units.reduce((sum, u) => sum + (u.side === k ? u.troops : 0), 0)
  });
  const attack = side === 0;
  let objective;
  if (setup.special === 'wuchao') objective = attack
    ? ['击溃守军，或焚毁粮仓。日落前未达成目标，守方获胜。', 'Break the defenders or burn their depot. The defenders win if neither is achieved before sunset.']
    : ['保护粮仓，守至日落，或击溃攻方。粮仓一旦烧毁即告失利。', 'Protect the depot until sunset, or break the attackers. A burned depot means defeat.'];
  else if (isFerryBattle(setup)) objective = attack
    ? ['击溃守军，或独占渡口10秒。接近后须及时争夺渡口，守军独守' + FERRY_HOLD_SECONDS + '秒即可取胜。', 'Break the defenders or occupy the crossing for 10 seconds. Contest the crossing once it is in reach. A secure defence of ' + FERRY_HOLD_SECONDS + ' seconds wins.']
    : ['敌军进入渡口4格后，驻军守在渡口，保持两格内无敌军' + FERRY_HOLD_SECONDS + '秒即可获胜。击溃敌军或守至日落也可获胜。', 'Once the attackers reach 4 hexes, occupy the crossing and keep enemies beyond 2 hexes for ' + FERRY_HOLD_SECONDS + ' seconds. Breaking the attack or surviving until sunset also wins.'];
  else if (setup.kind === 'siege') objective = attack
    ? ['击溃守军，或独占敌方本营10秒。破门本身不等于获胜；日落前未取胜，守方获胜。', 'Break the defenders or hold their keep uncontested for 10 seconds. Opening the gate alone does not win; sunset favours the defenders.']
    : ['守住本营，拖至日落，或击溃攻方。不可让敌军独占本营10秒。', 'Hold your keep until sunset, or break the attackers. Do not let them hold it uncontested for 10 seconds.'];
  else objective = attack
    ? ['击溃敌军；若有本营标记，也可独占敌营10秒。日落前未取胜，守方获胜。', 'Break the enemy; where a keep is marked, holding it uncontested for 10 seconds also wins. Sunset favours the defenders.']
    : ['守至日落或击溃攻方；若有本营标记，须防止敌军独占10秒。', 'Hold until sunset or break the attackers; where a keep is marked, prevent 10 seconds of uncontested enemy occupation.'];
  const enemySide = side === 0 ? 1 : 0;
  const roadColumns = k => new Set(setup.units.filter(u => u.side === k && u.army).map(u => u.army)).size;
  const rendezvous = setup.kind === 'field' && setup.place.link
    ? { ours: roadColumns(side), enemy: roadColumns(enemySide) } : null;
  return { side, ours: total(side), enemy: total(enemySide), objective, rendezvous };
}

/** Capture before either manual fighting or explicit entrust; no RNG is read. */
export function captureCampaignBattle(state, setup) {
  const node = setup.place.node;
  const armyIds = [...new Set(setup.units.filter(u => u.army).map(u => u.army))];
  return {
    id: setup.id,
    player: state.player,
    fame: state.factions[state.player]?.fame ?? null,
    place: node && state.nodes[node] ? { id: node, owner: state.nodes[node].owner, garrison: state.nodes[node].troops } : null,
    armies: Object.fromEntries(armyIds.map(id => [id, state.armies[id] ? {
      troops: state.armies[id].troops, commander: state.armies[id].commander, faction: state.armies[id].faction
    } : null]))
  };
}

function armyPoint(army) {
  if (army.link && NODES[army.link.from] && NODES[army.link.to]) {
    const { x, z } = along(routeLine(army.link.from, army.link.to), army.link.length ? army.link.done / army.link.length : 0);
    return { x, z, d: 70 };
  }
  const at = NODES[army.at];
  return at ? { x: at.x, z: at.y, d: 70 } : null;
}

/** Follow the retreat produced by settlement, including a road retreat. */
function actualRetreat(state, player, id) {
  const army = state.armies[id];
  const target = army?.target ?? army?.path?.at(-1);
  if (!army || !target || army.inBattle || !hostile(state, player, army.faction)) return null;
  const camera = armyPoint(army);
  if (!camera || (!army.link && (target === army.at || !army.path?.length))) return null;
  return { id, commander: army.commander, target, camera };
}

/** Describe already-settled facts. This must never call finishBattle itself. */
export function campaignBattleAftermath(state, setup, result, before = null) {
  const player = state.player;
  const side = setup.factions.indexOf(player);
  const ours = setup.units.map((unit, index) => ({ unit, index })).filter(({ unit }) => unit.side === side);
  const ids = [...new Set(ours.filter(({ unit }) => unit.army).map(({ unit }) => unit.army))];
  const armies = ids.map(id => {
    const parts = ours.filter(({ unit }) => unit.army === id);
    const army = state.armies[id]?.faction === player ? state.armies[id] : null;
    const fieldRemaining = parts.reduce((sum, { index }) => sum + (result.units[index]?.troops ?? 0), 0);
    const start = parts.reduce((sum, { unit }) => sum + unit.troops, 0);
    const target = army?.target ?? army?.path?.at(-1) ?? null;
    const travelling = army && (army.link || (target && target !== army.at));
    return {
      id, commander: army?.commander ?? before?.armies?.[id]?.commander ?? parts[0]?.unit.general ?? null,
      start, fieldRemaining, troops: army?.troops ?? 0,
      beforeTroops: before?.armies?.[id]?.troops ?? start,
      disposition: !army ? 'dissolved' : army.besieging ? 'besieging' : travelling
        ? result.winner === side ? 'marching' : 'withdrawing' : 'stationed',
      at: army?.at ?? null, target, besieging: army?.besieging ?? null,
      camera: army ? armyPoint(army) : null
    };
  }).sort((a, b) => b.start - a.start || a.id.localeCompare(b.id));
  const node = setup.place.node;
  const place = node && state.nodes[node] ? {
    id: node, owner: state.nodes[node].owner, garrison: state.nodes[node].troops,
    beforeOwner: before?.place?.owner ?? null,
    changed: Boolean(before?.place && before.place.owner !== state.nodes[node].owner)
  } : null;
  const survivor = armies.find(army => army.disposition !== 'dissolved' && army.camera);
  const capital = state.factions[player]?.capital;
  const friendly = state.nodes[capital]?.owner === player ? capital
    : Object.keys(state.nodes).find(id => state.nodes[id].owner === player);
  const fallback = place?.id ?? friendly ?? null;
  let returnView;
  if (place?.owner === player || !survivor) {
    const at = NODES[fallback];
    returnView = { selection: fallback ? { node: fallback } : null, camera: at ? { x: at.x, z: at.y, d: 70 } : null };
  } else returnView = { selection: { army: survivor.id }, camera: survivor.camera };
  const fame = state.factions[player]?.fame;
  const retreatingEnemies = result.winner === side && setup.place.node === 'nanpi'
    ? [...new Set(setup.units.filter(u => u.side !== side && u.army).map(u => u.army))]
      .map(id => actualRetreat(state, player, id)).filter(Boolean)
    : [];
  return {
    id: setup.id, side, won: result.winner === side, armies, place, returnView, retreatingEnemies,
    ending: state.over ? { ...state.over } : null,
    fieldRemaining: ours.reduce((sum, { index }) => sum + (result.units[index]?.troops ?? 0), 0),
    fameDelta: Number.isFinite(before?.fame) && Number.isFinite(fame) ? fame - before.fame : null,
    pending: {
      battles: state.inbox.filter(m => m.kind === 'battle').length,
      captives: state.inbox.filter(m => m.kind === 'captive').length
    }
  };
}

/** Map destinations for review buttons. They never issue an order. */
export function campaignAftermathView(state, aftermath, action) {
  if (!action || aftermath.place?.id !== 'nanpi') return aftermath.returnView;
  if (action.kind === 'inspect-town' && NODES[action.node] &&
    (action.node === aftermath.place.id || !aftermath.won && state.nodes[action.node]?.owner === state.player)) {
    const node = NODES[action.node];
    return { selection: { node: node.id }, camera: {x: node.x, z: node.y, d: 70} };
  }
  if (action.kind === 'inspect-enemy-retreat' && aftermath.retreatingEnemies?.some(e => e.id === action.army)) {
    const retreat = actualRetreat(state, state.player, action.army);
    if (retreat) return { selection: { army: retreat.id }, camera: retreat.camera };
  }
  if (['inspect-army','inspect-retreat','inspect-garrison'].includes(action.kind)
    && aftermath.armies.some(a => a.id === action.army)) {
    const army = state.armies[action.army];
    const eligible = action.kind !== 'inspect-garrison' ||
      army?.at === aftermath.place.id && !army.link && !army.inBattle && state.nodes[army.at]?.owner === state.player;
    const camera = eligible && army?.faction === state.player ? armyPoint(army) : null;
    if (camera) return { selection: { army: army.id }, camera };
  }
  return aftermath.returnView;
}
