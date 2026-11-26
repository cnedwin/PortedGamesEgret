import { UNITS } from '../data/battle.mjs';
import { nm, num, t } from '../i18n.mjs';
import { arrivedArmies } from '../sim/siege-council.mjs';
import { generalName, placeName } from '../view/names.mjs';
import { button, h } from './dom.mjs';
import { pair } from './text.mjs';

function unitRole(kind) {
  const unit = UNITS[kind];
  if (unit?.special === 'gate') return pair(['撞击城门', 'Breach the gate']);
  switch (unit?.group) {
    case 'inf': return pair(['近战接应', 'Melee support']);
    case 'bow': return pair(['远射压制', 'Ranged support']);
    case 'cav': return pair(['机动突击', 'Mobile attack']);
    case 'siege': return pair(['攻城支援', 'Siege support']);
    case 'navy': return pair(['水路作战', 'Naval operations']);
    default: return '';
  }
}

function waitingChange(reason) {
  const captions = {
    arrived: ['所等援军已到阵，按实际兵力重新开议。', 'The awaited reinforcements have arrived. The council now uses the actual forces.'],
    cancelled: ['已停止等援，按当前兵力重新开议。', 'Waiting has ended. The council now uses the forces currently present.'],
    supportGone: ['所等援军已不在，按当前兵力重新开议。', 'The awaited reinforcements are gone. Review the forces currently present.'],
    supportChanged: ['所等援军已变更阵营，按当前兵力重新开议。', 'The awaited reinforcements have changed sides. Review the forces currently present.'],
    supportRedirected: ['援军已改道，按当前兵力重新开议。', 'The reinforcements have been redirected. Review the forces currently present.'],
    supportBlocked: ['援军道路受阻，按当前兵力重新开议。', 'The reinforcement route is blocked. Review the forces currently present.'],
    supportInBattle: ['所等援军卷入交战，按当前兵力重新开议。', 'The awaited reinforcements are in another battle. Review the forces currently present.'],
  };
  return reason ? pair(captions[reason] ?? ['军情有变，按当前兵力重新开议。', 'Conditions have changed. Review the forces currently present.']) : '';
}

function armyRow(row, setup, incoming, showOrigin) {
  const ready = !incoming || row.reachable;
  const deployed = incoming ? [] : setup.units.filter(unit => unit.side === 0 && unit.army === row.armyId);
  const types = [...new Set([row.unit, ...deployed.map(unit => unit.unit)])];
  const role = types.map(kind => [nm(UNITS[kind]), unitRole(kind)].filter(Boolean).join(' · ')).join(' / ');
  const progress = incoming
    ? ready
      ? pair(['约 ', 'About ']) + num(row.etaDays) + pair([' 天抵达', ' days to arrive'])
      : pair(['当前无法会师', 'Cannot currently join'])
    : deployed.length ? pair(['已入本战编制', 'In the current battle']) : pair(['已到阵 · 未编入本战', 'Present · Not assigned to this battle']);
  const grain = pair(['携粮 ', 'Grain carried: ']) + num(Math.floor(row.grain)) +
    (Number.isFinite(row.grainDays) ? ' · ' + t('supplyDays', { n: row.grainDays }) : '');
  const origin = showOrigin && row.origin ? placeName(row.origin) + pair(['出发', ' departure']) : '';
  return h('li.siegeArmy', { dataset: { army: row.armyId, ready: String(ready) } },
    h('div.siegeArmyHead',
      h('div', h('strong', generalName(row.commander) || t('captain')), h('small', ' · ' + num(row.troops) + pair([' 人', ' troops']))),
      h('span.siegeArrival', progress)),
    h('div.siegeArmyDetail', role ? h('span', role) : null, h('span', grain), origin ? h('span', origin) : null),
    incoming && row.from && row.to && row.from !== row.to
      ? h('small.siegeRoad', placeName(row.from) + ' → ' + placeName(row.to)) : null);
}

const siegeButton = (key, label, action, options) => {
  const node = button(label, action, options);
  node.dataset.k = key;
  return node;
};

export function siegeCouncilContent(app, setup, council, briefing) {
  const ready = council.incoming.filter(army => army.reachable);
  const rendezvous = ready.length ? Math.max(...ready.map(army => army.etaDays)) : null;
  const origins = new Map([...council.arrived, ...council.incoming]
    .filter(row => row.origin && Number.isFinite(row.originGarrison)).map(row => [row.origin, row]));
  const group = (title, rows, incoming) => h('div',
    h('h4', title),
    rows.length ? h('ul.siegeArmies', rows.map(row => armyRow(row, setup, incoming, origins.size > 1)))
      : h('p.small.dim', incoming
        ? pair(['目前没有向南皮行军的己方军团。', 'No friendly army is marching towards Nanpi.'])
        : pair(['目前没有已到阵的己方军团。', 'No friendly army is currently at the siege.'])));
  const waitNote = !ready.length ? pair(['当前没有能抵达南皮的援军。', 'No reinforcements can currently reach Nanpi.'])
    : pair(['等待期间战役照常推进，军粮照耗。援军实际抵达后再开军议。', 'The campaign and grain use continue while you wait. The council reopens after the reinforcements arrive.']);
  const sections = [
    h('h3', pair(['南皮军议', 'Siege council at Nanpi'])),
    setup.council?.reason ? h('p.siegeCouncilChange', { role: 'status' }, waitingChange(setup.council.reason)) : null,
    h('p.siegeObjective', pair(briefing.objective)),
    h('div.siegeStrength',
      h('span', pair(['现在可出战 ', 'Ready to fight: ']), h('b', num(briefing.ours.troops))),
      h('span', pair(['敌方出战 ', 'Enemy force: ']), h('b', num(briefing.enemy.troops))),
      rendezvous !== null ? h('span.siegeRendezvous', pair(['约 ', 'About ']), h('b', num(rendezvous)),
        pair([' 天会师', ' days until all arrive'])) : null),
    origins.size ? h('ul.siegeGarrisons', [...origins].map(([id, row]) =>
      h('li', placeName(id), row.originOwner === app.state.player
        ? pair(['留守 ', ' garrison: ']) : pair(['现驻军（已易主） ', ' garrison (control lost): ']), h('b', num(row.originGarrison))))) : null,
    h('div.siegeCouncilColumns',
      group(pair(['已到阵', 'At the siege']), council.arrived, false),
      group(pair(['援军在途', 'Reinforcements on the way']), council.incoming, true)),
    h('p.siegeWaitNote', waitNote),
  ];
  return {
    panel: h('section.siegeCouncil', ...sections),
    actions: [
      siegeButton('campaign-wait-support', pair(['等待援军', 'Wait for reinforcements']),
        () => app.waitForSiegeSupport(setup, ready.map(row => row.armyId)), { why: ready.length ? null : waitNote }),
      siegeButton('campaign-entrust-siege', pair(['委任攻城', 'Entrust siege']), () => app.act('entrust', setup)),
      siegeButton('campaign-command-siege', pair(['立即亲自攻城', 'Command siege now']), () => app.startBattle(setup), {kind:'main'}),
    ],
  };
}

export function siegeAftermathActions(app, done) {
  const { aftermath, setup } = done;
  if (!aftermath || aftermath.ending || setup.kind !== 'siege' || aftermath.place?.id !== 'nanpi' || aftermath.side !== 0) return null;
  const state = app.state;
  const armies = aftermath.armies.filter(row => state.armies[row.id]?.faction === state.player);
  const action = (id, label, descriptor) =>
    siegeButton('campaign-next-' + id, label, () => app.returnFromBattle(done, descriptor));
  const town = 'nanpi';
  const actions = [];
  if (aftermath.won) {
    actions.push(action('town', pair(['查看南皮', 'View Nanpi']), { kind:'inspect-town', node:town }));
    if (state.nodes[town]?.owner === state.player) {
      const stationed = armies.find(row => {
        const army = state.armies[row.id];
        return army.at === town && !army.link;
      });
      if (stationed) actions.push(action('garrison', pair(['查看驻守军团', 'View army for garrisoning']),
        { kind:'inspect-garrison', node:town, army:stationed.id }));
    } else {
      const besieger = armies.find(row => row.disposition === 'besieging' && row.besieging === town);
      if (besieger) actions.push(action('siege', pair(['查看围城军团', 'View besieging army']), { kind:'inspect-army', army:besieger.id }));
    }
    const retreat = aftermath.retreatingEnemies?.find(row => row.target && state.armies[row.id]);
    if (retreat) actions.push(action('enemy-retreat', pair(['查看敌军撤退至 ', 'View enemy retreat towards ']) + placeName(retreat.target),
      { kind:'inspect-enemy-retreat', army:retreat.id, node:retreat.target }));
  } else {
    const retreat = armies.find(row => row.disposition === 'withdrawing' && row.target && state.nodes[row.target]);
    if (retreat) actions.push(action('retreat', pair(['查看撤退至 ', 'View withdrawal towards ']) + placeName(retreat.target),
      { kind:'inspect-retreat', node:retreat.target, army:retreat.id }));
    const friendly = [retreat?.target, ...armies.flatMap(row => [row.at, state.armies[row.id].home]), state.factions[state.player]?.capital]
      .find(id => id && state.nodes[id]?.owner === state.player);
    if (friendly) actions.push(action('replenish', pair(['查看整补据点 ', 'View resupply point: ']) + placeName(friendly),
      { kind:'inspect-town', node:friendly }));
  }
  if (!actions.length) return null;
  return h('div.siegeAftermathActions', h('h4', pair(['战后去向', 'Next on the campaign map'])),
    h('div.row.wrap', ...actions),
    h('p.small.dim', actions.some(node => node.dataset.k === 'campaign-next-garrison')
      ? pair(['地图保持暂停。查看军团后，可自行选择「入城驻守」。', 'The campaign stays paused. In the army panel, you can choose whether to station it in the town.'])
      : pair(['只查看地图，战役保持暂停。', 'These actions show the map and leave the campaign paused.'])));
}

/** Keep the map panel and its disclosure state across daily progress updates. */
export function renderSiegeWait(app, wait) {
  let panel = document.querySelector('#siegeWait');
  if (!wait) {
    panel?.remove();
    return;
  }
  if (!panel) {
    const stop = siegeButton('campaign-cancel-wait', pair(['取消等援', 'Stop waiting']), () => app.cancelSiegeSupport());
    panel = h('details#siegeWait.siegeWait', { open: true },
      h('summary', h('span.siegeWaitStatus', { role: 'status' })),
      h('div.siegeWaitBody', h('p.siegeWaitArrived'), h('p.siegeWaitIncoming'), stop));
    document.querySelector('#hud').append(panel);
  }
  panel.hidden = app.screen !== 'play' || app.dialogOpen;
  const setLine = (selector, text) => {
    const line = panel.querySelector(selector);
    if (line.textContent !== text) line.textContent = text;
  };
  const arrived = arrivedArmies(app.state, wait.faction, wait.nodeId).map(row => generalName(row.commander) || t('captain'));
  const incoming = wait.incoming.map(row => generalName(row.commander) || t('captain'));
  const eta = wait.etaDays;
  const time = Number.isFinite(eta) && eta > 0
    ? pair(['约 ', 'About ']) + num(eta) + pair([' 天会师', ' days until rendezvous'])
    : pair(['重新核对军情', 'Checking the siege']);
  const label = pair(['南皮等援 · ', 'Nanpi reinforcements · ']) +
    (app.paused ? pair(['已暂停 · ', 'Paused · ']) : '') + time;
  const names = rows => rows.length ? rows.join(pair(['、', ', '])) : t('none');
  setLine('.siegeWaitStatus', label);
  setLine('.siegeWaitArrived', pair(['已到阵 ', 'At the siege: ']) + names(arrived));
  setLine('.siegeWaitIncoming', pair(['尚在途 ', 'On the way: ']) + names(incoming));
  setLine('[data-k="campaign-cancel-wait"]', pair(['取消等援', 'Stop waiting']));
}
