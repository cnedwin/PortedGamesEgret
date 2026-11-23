// 天下图上的界面：顶栏（势力、日期、金粮兵名声、研究、时间的快慢、各个菜单），左侧的详情（选中的城关津或军团：
// 数值、营建、征兵、出征、寻访、调兵调将、驻守的武将、在野的人才），右下的大事记，鼠标停留时的提示，和短暂的通告。
// 只在显示的内容变了时才重画，并把键盘焦点放回原来的按钮上。
// The interface over the map of the realm: the top bar (the power, the date, coin, grain, troops and fame, research,
// the speed of time, the menus), the details on the left (the chosen place or army: its figures, works, conscription,
// mustering, searching, moving troops and officers, the officers posted there and the talent waiting), the chronicle
// at the bottom right, a note where the mouse rests, and short notices. Parts are drawn again only when what they show
// has changed, and the keyboard's focus is put back on the button it was on.
import { UNITS, FORMATIONS } from '../data/battle.mjs';
import { GENERALS } from '../data/generals.mjs';
import { ADJACENT, NODES, PROVINCES } from '../data/map.mjs';
import { TECHS } from '../data/techs.mjs';
import { serving, stat as statOf } from '../sim/core.mjs';
import { allied, disband, order, route, troopCap } from '../sim/military.mjs';
import { persuadeChance } from '../sim/people.mjs';
import { caps, income, recruit, researchRate, upkeep, workQuote, power } from '../sim/world.mjs';
import { getLanguage, nm, num, t } from '../i18n.mjs';
import { factionName, generalName, placeName } from '../view/names.mjs';
import { $, bar, button, clear, colourOf, face, h, seal, stat } from './dom.mjs';
import { dayWords, logLine, pair } from './text.mjs';

const SPEEDS = [0.5, 1, 2, 4, 8];
export { SPEEDS };

export function createHud(app) {
  const top = $('#topbar'),
    side = $('#side'),
    log = $('#log'),
    tip = $('#tip'),
    toastBox = $('#toasts');
  let lastTop = '',
    lastSide = '',
    lastLog = '';

  /** Draw a part again, keeping the focused button focused. */
  function redraw(node, build) {
    const focused = document.activeElement?.dataset?.k && node.contains(document.activeElement) ? document.activeElement.dataset.k : null;
    clear(node);
    build(node);
    if (focused) node.querySelector(`[data-k="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
  }
  const keyed = (k, el) => ((el.dataset.k = k), el);

  // ——— The top bar ———
  function monthly(s, f) {
    let coin = 0,
      grain = 0;
    for (const id in s.nodes)
      if (s.nodes[id].owner === f) {
        const i = income(s, id);
        coin += i.coin;
        grain += i.grain;
      }
    const u = upkeep(s, f);
    return { coin: coin - u.coin, grain: grain - u.grain, troops: u.troops };
  }
  function drawTop(s) {
    const f = s.factions[s.player];
    const m = monthly(s, s.player),
      p = power(s, s.player);
    const r = f.research;
    const key = [s.day, f.coin, Math.round(f.grain), m.coin, m.grain, m.troops, p.cities, f.fame, r.current, Math.floor(r.points), app.paused, app.speed, f.name?.zh, f.flag, app.dialogOpen].join('|');
    if (key === lastTop) return;
    lastTop = key;
    const sign = (n) => (n >= 0 ? '+' : '−') + num(Math.abs(n));
    redraw(top, (node) => {
      node.append(
        keyed('realm', h('button.realm', { type: 'button', onclick: () => app.open('realm'), title: t('menuFaction') }, seal(f, 'l'), h('span.realmName', factionName(s, s.player)))),
        h('div.date', { 'aria-live': 'off' }, dayWords(s.day)),
        h(
          'div.res',
          h('span.r', { title: t('coin') + ' · ' + t('income') + ' ' + sign(m.coin) }, h('b', t('coin')), num(f.coin), h('small', { className: m.coin < 0 ? 'neg' : '' }, sign(m.coin))),
          h('span.r', { title: t('grain') + ' · ' + t('income') + ' ' + sign(m.grain) }, h('b', t('grain')), num(f.grain), h('small', { className: m.grain < 0 ? 'neg' : '' }, sign(m.grain))),
          h('span.r', h('b', t('troops')), num(m.troops)),
          h('span.r', h('b', t('cities')), p.cities),
          h('span.r', h('b', t('fame')), num(f.fame))
        ),
        keyed(
          'tech',
          h(
            'button.study',
            { type: 'button', onclick: () => app.open('tech') },
            r.current ? [h('span', nm(TECHS[r.current])), h('span.pct', Math.min(99, Math.floor((r.points / TECHS[r.current].cost) * 100)) + '%')] : h('span.idle', t('studyNone'))
          )
        ),
        h(
          'div.clock',
          { role: 'group', 'aria-label': t('speedLabel') },
          keyed('pause', h('button.pause', { type: 'button', 'aria-pressed': app.paused ? 'true' : 'false', title: (app.paused ? t('resume') : t('pause')) + ' (Space)', onclick: () => app.setPaused(!app.paused) }, app.paused ? '▶' : '❚❚')),
          SPEEDS.map((v, i) => keyed('speed' + i, h('button.spd', { type: 'button', 'aria-pressed': app.speed === i ? 'true' : 'false', title: t('speedDays', { n: v }) + ` (${i + 1})`, onclick: () => app.setSpeed(i) }, h('i', { style: { height: 5 + i * 3 + 'px' } }))))
        ),
        h(
          'nav.menu',
          [
            ['generals', t('menuGenerals')],
            ['diplomacy', t('menuDiplomacy')],
            ['tech', t('menuTech')],
            ['chronicle', t('menuStory')],
            ['saves', t('menuSave')],
            ['settings', t('settings')]
          ].map(([id, label]) => keyed('menu' + id, h('button.menuBtn', { type: 'button', onclick: () => app.open(id) }, label)))
        )
      );
      if (app.paused) node.append(h('div.pausedMark', t('paused')));
    });
  }

  // ——— The side panel ———
  function nodePanel(s, id) {
    const n = NODES[id],
      node = s.nodes[id],
      owner = node.owner ? s.factions[node.owner] : null,
      mine = node.owner === s.player;
    const kind = { city: t('kindCity'), pass: t('kindPass'), port: t('kindPort') }[n.kind];
    const parts = [];
    parts.push(
      h(
        'header.sideHead',
        seal(owner, 'l'),
        h('div', h('h2', placeName(id)), h('p.sub', kind + ' · ' + pair(PROVINCES[n.prov]) + (n.kind === 'city' ? ' · ' + t('sizeN', { n: n.size }) : ''), h('br'), owner ? factionName(s, node.owner) : t('noOwner'))),
        keyed('close', h('button.x', { type: 'button', 'aria-label': t('close'), onclick: () => app.select(null) }, '×'))
      )
    );
    const siege = Object.values(s.armies).filter((a) => a.besieging === id);
    if (siege.length) parts.push(h('p.alarm', t('besieged', { n: num(siege.reduce((x, a) => x + a.troops, 0)) })));
    const c = caps(id);
    parts.push(
      h(
        'div.grid',
        stat(t('people'), num(node.people)),
        stat(t('garrison'), num(node.troops)),
        stat(t('training'), Math.round(node.training)),
        stat(t('support'), Math.round(node.support), bar(node.support / 100, node.support < 30 ? 'bad' : 'good')),
        stat(t('order'), Math.round(node.order), bar(node.order / 100, node.order < 30 ? 'bad' : 'good')),
        stat(t('wall'), `${node.wall}/${c.wall}`, bar(node.wall / Math.max(1, c.wall), 'stone'))
      )
    );
    if (!mine) {
      const here = s.generals ? Object.keys(s.generals).filter((g) => s.generals[g].status === 'serving' && s.generals[g].at === id) : [];
      if (owner) parts.push(h('p.note', t('officersN', { n: here.length }) + (s.nodes[id].governor ? ' · ' + t('governor') + ' ' + generalName(s.nodes[id].governor) : '')));
      // Attack from a neighbouring place of ours.
      const ours = ADJACENT[id].map((l) => l.to).filter((x) => s.nodes[x].owner === s.player);
      const hostile = !owner || !allied(s, s.player, node.owner);
      if (ours.length && hostile)
        parts.push(
          h('h3', t('attackFrom')),
          h(
            'div.row.wrap',
            ours.map((from) => keyed('from' + from, button(placeName(from) + ' · ' + num(s.nodes[from].troops), () => app.open('muster', { from, target: id }), { small: true, why: serving(s, s.player, from).length ? null : t('why_generals') })))
          )
        );
      parts.push(armiesHere(s, id));
      return parts;
    }
    // Our place: governor, works, actions, officers.
    const gov = node.governor;
    parts.push(h('div.gov', h('span.k', t('governor')), gov ? keyed('gov', h('button.chip', { type: 'button', onclick: () => app.open('general', { id: gov }) }, face(gov, 28, app.rulers()), generalName(gov))) : h('span.dim', t('noGovernor'))));
    const inc = income(s, id);
    parts.push(h('p.note', t('income') + ' · ' + t('coin') + ' ' + num(inc.coin) + ' · ' + t('grain') + ' ' + num(inc.grain)));
    parts.push(h('h3', t('works')));
    for (const kind of ['farm', 'market', 'wall', 'office']) {
      const q = workQuote(s, id, kind),
        building = node.work?.kind === kind;
      parts.push(
        h(
          'div.work',
          h('span.wk', { title: t(kind + 'About') }, t(kind)),
          h('span.wl', `${node[kind]}/${c[kind]}`),
          building ? bar(1 - node.work.left / node.work.of, 'gold', t('building', { kind: t(kind), days: node.work.left })) : bar(node[kind] / Math.max(1, c[kind])),
          building
            ? h('span.wd', t('daysLeft', { n: node.work.left }))
            : keyed('w' + kind, button(q.full ? t('full') : t('investCost', { coin: q.coin, days: q.days }), () => app.act('work', id, kind), { small: true, why: q.full ? t('why_full') : node.work ? t('why_busy') : s.factions[s.player].coin < q.coin ? t('why_coin') : null }))
        )
      );
    }
    parts.push(h('h3', t('orders')));
    const room = Math.max(0, Math.floor(node.people * 0.05) - (node.levied ?? 0));
    const here = serving(s, s.player, id);
    const idle = here.filter((g) => !(s.generals[g].busyUntil > s.day));
    parts.push(
      h(
        'div.row.wrap',
        n.kind === 'city'
          ? keyed('recruit', button(t('recruitN', { n: num(Math.min(room, 3000)) }), () => app.act('recruit', id, 3000), { why: room < 100 ? t('why_people') : s.factions[s.player].coin < 12 ? t('why_coin') : null, title: t('recruitAbout') }))
          : null,
        keyed('muster', button(t('muster'), () => app.open('muster', { from: id }), { kind: 'main', why: idle.length ? (node.troops < 500 ? t('why_troops') : null) : t('why_generals') })),
        keyed('search', button(t('search'), () => app.open('pickOfficer', { at: id, purpose: 'search' }), { why: idle.length ? null : t('why_generals'), title: t('searchAbout') })),
        keyed('transfer', button(t('transfer'), () => app.open('transfer', { from: id }), { why: node.troops < 100 ? t('why_troops') : null })),
        keyed('moveOfficer', button(t('moveOfficer'), () => app.open('pickOfficer', { at: id, purpose: 'move' }), { why: here.length ? null : t('why_generals') }))
      )
    );
    if (n.kind === 'city' && room < 100) parts.push(h('p.dim.small', t('levyNote')));
    parts.push(h('h3', t('officersHere') + ` (${here.length})`));
    parts.push(
      h(
        'div.chips',
        here.length
          ? here.map((g) => keyed('g' + g, h('button.chip', { type: 'button', onclick: () => app.open('general', { id: g }), title: generalName(g) }, face(g, 28, app.rulers()), h('span', generalName(g)), s.generals[g].busyUntil > s.day ? h('i.busy', '…') : null)))
          : h('span.dim', t('none'))
      )
    );
    const free = Object.keys(s.generals).filter((g) => s.generals[g].status === 'free' && s.generals[g].at === id && s.generals[g].known);
    if (free.length) {
      parts.push(h('h3', t('freeHere')));
      const best = idle.slice().sort((a, b) => statOf(s, b, 'cha') - statOf(s, a, 'cha'))[0];
      parts.push(
        h(
          'div.chips',
          free.map((g) =>
            keyed(
              'f' + g,
              h('button.chip.free', { type: 'button', onclick: () => app.open('general', { id: g }), title: best ? t('chance', { p: Math.round(persuadeChance(s, s.player, best, g) * 100) }) : '' }, face(g, 28), h('span', generalName(g)))
            )
          )
        )
      );
    }
    parts.push(armiesHere(s, id));
    return parts;
  }

  function armiesHere(s, id) {
    const list = Object.values(s.armies).filter((a) => a.at === id || a.besieging === id);
    if (!list.length) return null;
    return h(
      'div',
      h('h3', t('armiesHere')),
      h(
        'div.chips',
        list.map((a) => keyed('a' + a.id, h('button.chip', { type: 'button', onclick: () => app.select({ army: a.id }) }, seal(s.factions[a.faction], 's'), a.commander ? generalName(a.commander) : '—', h('small', num(a.troops)))))
      )
    );
  }

  function armyStatus(s, a) {
    if (a.besieging) return t('besieging', { place: placeName(a.besieging), days: (a.siegeDays ?? 0) + 1 });
    if (a.link) return t('onRoad', { from: placeName(a.link.from), to: placeName(a.link.to) });
    if (a.path.length) {
      const r = route(s, a, a.at, a.target);
      return t('marching', { place: placeName(a.target), days: r?.days ?? '?' });
    }
    return t('resting', { place: placeName(a.at) });
  }

  function armyPanel(s, id) {
    const a = s.armies[id];
    if (!a) return [h('p.dim', t('why_gone'))];
    const f = s.factions[a.faction],
      mine = a.faction === s.player;
    const parts = [];
    parts.push(
      h(
        'header.sideHead',
        a.commander ? face(a.commander, 44, app.rulers()) : seal(f, 'l'),
        h('div', h('h2', t('armyOf', { name: a.commander ? generalName(a.commander) : '—' })), h('p.sub', seal(f, 's'), ' ', factionName(s, a.faction))),
        keyed('close', h('button.x', { type: 'button', 'aria-label': t('close'), onclick: () => app.select(null) }, '×'))
      )
    );
    parts.push(h('p.status', armyStatus(s, a)));
    const eat = a.troops / 400;
    parts.push(
      h(
        'div.grid',
        stat(t('troops'), num(a.troops)),
        stat(t('unit'), nm(UNITS[a.unit])),
        stat(t('formation'), nm(FORMATIONS[a.formation])),
        stat(t('morale'), Math.round(a.morale), bar(a.morale / 100, a.morale < 30 ? 'bad' : 'good')),
        mine ? stat(t('supply'), t('supplyDays', { n: Math.floor(a.grain / Math.max(0.1, eat)) })) : null,
        stat(t('training'), Math.round(a.training ?? 50))
      )
    );
    if (a.deputies.length) parts.push(h('div.gov', h('span.k', t('deputies')), a.deputies.map((d) => keyed('d' + d, h('button.chip', { type: 'button', onclick: () => app.open('general', { id: d }) }, face(d, 28), generalName(d))))));
    if (a.commander) parts.push(h('div.gov', h('span.k', t('commander')), keyed('cmd', h('button.chip', { type: 'button', onclick: () => app.open('general', { id: a.commander }) }, generalName(a.commander), h('small', t('troopCap', { n: num(troopCap(s, a.commander)) }))))));
    if (mine) {
      const at = a.link ? null : a.at;
      const homeOk = at && s.nodes[at]?.owner === s.player;
      parts.push(
        h(
          'div.row.wrap',
          keyed('march', button(app.mode?.kind === 'march' ? t('pickTarget') : t('orderMarch'), () => app.setMode(app.mode?.kind === 'march' ? null : { kind: 'march', army: id }), { kind: 'main' })),
          keyed('return', button(t('orderBack'), () => app.act('return', id), { why: a.at === a.home && !a.link ? t('why_here') : null })),
          keyed('disband', button(t('disband'), () => app.act('disband', id), { why: homeOk ? null : t('why_cannot') }))
        )
      );
      if (app.mode?.kind === 'march') parts.push(h('p.hint', t('pickTargetHelp')));
    }
    return parts;
  }

  function drawSide(s) {
    const sel = app.sel;
    if (!sel || (!sel.node && !sel.army)) {
      if (lastSide !== '') {
        lastSide = '';
        clear(side);
        side.hidden = true;
      }
      return;
    }
    // What the panel shows, as a key: redrawn only when it changes.
    let key;
    if (sel.node) {
      const n = s.nodes[sel.node];
      key = JSON.stringify([sel.node, n, s.factions[s.player].coin > 2000 ? 1 : s.factions[s.player].coin, Object.values(s.armies).filter((a) => a.at === sel.node || a.besieging === sel.node).map((a) => [a.id, a.troops]), serving(s, s.player, sel.node).map((g) => [g, s.generals[g].busyUntil > s.day]), Object.keys(s.generals).filter((g) => s.generals[g].at === sel.node).length, getLanguage()]);
    } else {
      const a = s.armies[sel.army];
      key = JSON.stringify([sel.army, a ? [a.troops, Math.round(a.morale), Math.floor(a.grain), a.at, a.link?.to, a.besieging, a.path.length, a.siegeDays, a.formation] : null, app.mode?.kind, getLanguage()]);
    }
    if (key === lastSide) return;
    lastSide = key;
    side.hidden = false;
    redraw(side, (node) => node.append(...(sel.node ? nodePanel(s, sel.node) : armyPanel(s, sel.army)).filter(Boolean)));
  }

  // ——— The chronicle ———
  function drawLog(s) {
    const lines = s.log.slice(0, 6);
    const key = lines.map((l) => l.day + l.key + JSON.stringify(l.values)).join('|') + getLanguage();
    if (key === lastLog) return;
    lastLog = key;
    log.setAttribute('aria-label', t('menuStory'));
    redraw(log, (node) => {
      node.append(
        h('h3', keyed('chron', h('button.link', { type: 'button', onclick: () => app.open('chronicle') }, t('menuStory')))),
        h(
          'ol',
          lines.map((l) => h('li', h('time', dayWords(l.day)), ' ', logLine(s, l)))
        )
      );
    });
  }

  // ——— Notes and notices ———
  function showTip(text, x, y) {
    if (!text) {
      tip.hidden = true;
      return;
    }
    clear(tip).append(...(Array.isArray(text) ? text : [text]));
    tip.hidden = false;
    const w = tip.offsetWidth,
      hgt = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, x + 16)) + 'px';
    tip.style.top = Math.max(8, Math.min(innerHeight - hgt - 8, y + 12)) + 'px';
  }
  function toast(text, kind = '') {
    const el = h(`div.toast${kind ? '.' + kind : ''}`, { role: 'status' }, text);
    toastBox.append(el);
    while (toastBox.children.length > 4) toastBox.firstChild.remove();
    setTimeout(() => el.classList.add('going'), 2600);
    setTimeout(() => el.remove(), 3200);
  }

  return {
    refresh(force = false) {
      const s = app.state;
      if (!s) return;
      if (force) lastTop = lastSide = lastLog = '-';
      drawTop(s);
      drawSide(s);
      drawLog(s);
    },
    showTip,
    toast,
    armyStatus
  };
}

/** The note for a place or an army under the mouse. */
export function tipFor(app, info) {
  const s = app.state;
  if (!s || !info) return null;
  if (info.node) {
    const id = info.node,
      node = s.nodes[id],
      f = node.owner ? s.factions[node.owner] : null;
    const lines = [h('b', placeName(id)), h('span', f ? factionName(s, node.owner) : t('noOwner')), h('span', t('garrison') + ' ' + num(node.troops))];
    if (app.mode?.kind === 'march') {
      const a = s.armies[app.mode.army];
      const r = a && route(s, a, a.link ? a.link.to : a.at, id);
      lines.push(h('span.hint', r ? t('daysAway', { n: r.days }) : t('noWay')));
    }
    return lines;
  }
  const a = s.armies[info.army];
  if (!a) return null;
  return [h('b', a.commander ? t('armyOf', { name: generalName(a.commander) }) : t('army')), h('span', factionName(s, a.faction)), h('span', nm(UNITS[a.unit]) + ' ' + num(a.troops))];
}

export { GENERALS };
