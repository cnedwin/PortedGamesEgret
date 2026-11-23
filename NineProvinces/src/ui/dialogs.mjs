// 对话框：出征、选将、调兵、武将详情、武将名册、外交、科技、势力、大事记、存档、设置、演义事件、使者、俘虏、
// 交战的抉择与战果、结局。同一时间只开一个；有的必须作答（演义、交战、结局），其余可以按 Esc 关上。
// The dialogs: mustering, choosing an officer, moving troops, an officer's record, the roll of officers, diplomacy,
// inventions, the realm, the chronicle, saves, settings, events of the tale, envoys, captives, the choice before a
// battle and its outcome, the ending. One is open at a time; some must be answered (the tale, battles, the ending), the
// rest close with Esc.
import { FORMATIONS, UNITS } from '../data/battle.mjs';
import { GENERALS } from '../data/generals.mjs';
import { ADJACENT, NODES } from '../data/map.mjs';
import { TACTICS } from '../data/tactics.mjs';
import { TECHS } from '../data/techs.mjs';
import { TRAITS } from '../data/traits.mjs';
import { TREASURES } from '../data/treasures.mjs';
import { FACTIONS } from '../data/factions.mjs';
import { dateOf, serving, stat as statOf } from '../sim/core.mjs';
import { regard } from '../sim/diplomacy.mjs';
import { allied, troopCap, unitAllowed } from '../sim/military.mjs';
import { persuadeChance } from '../sim/people.mjs';
import { choicesOf } from '../sim/story.mjs';
import { income, power, researchRate, upkeep, canStudy } from '../sim/world.mjs';
import { getLanguage, nm, num, t } from '../i18n.mjs';
import { factionName, generalName, placeName } from '../view/names.mjs';
import { $, bar, button, choice, clear, face, h, seal, stat, tabs } from './dom.mjs';
import { ageOf, dayWords, eventOf, logLine, pair, tacticText, techText, traitText, treasureText } from './text.mjs';
import { SLOTS } from '../saves.mjs';

const STATS = ['lead', 'war', 'int', 'pol', 'cha'];
const formationFits = (f, unit) => f.group === 'any' || f.group === UNITS[unit].group || (UNITS[unit].group === 'navy' && f.group === 'inf');

export function createDialogs(app) {
  const host = $('#modal'),
    sheet = $('#sheet');
  let current = null;

  function render() {
    if (!current) return;
    const spec = BUILD[current.name](app, current.args, render);
    if (!spec) return close();
    current.blocking = Boolean(spec.blocking);
    const scroll = sheet.querySelector('.body')?.scrollTop ?? 0;
    clear(sheet);
    sheet.className = 'sheet' + (spec.className ? ' ' + spec.className : '');
    sheet.setAttribute('aria-label', spec.title);
    sheet.append(
      h('header.dlgHead', spec.seal ?? null, h('h2#dlgTitle', spec.title), spec.blocking ? null : h('button.x', { type: 'button', 'aria-label': t('close'), onclick: close }, '×')),
      h('div.body', ...[spec.body].flat().filter(Boolean)),
      spec.actions?.length ? h('footer.dlgFoot', ...spec.actions.filter(Boolean)) : null
    );
    const body = sheet.querySelector('.body');
    if (body) body.scrollTop = scroll;
  }

  function open(name, args = {}) {
    const fresh = current?.name !== name;
    current = { name, args };
    host.hidden = false;
    app.dialogOpen = true;
    render();
    if (fresh) {
      app.sound.play('open');
      (sheet.querySelector('.dlgFoot .main') ?? sheet.querySelector('button:not(.x)') ?? sheet.querySelector('.x'))?.focus({ preventScroll: true });
    }
  }
  function close(force = false) {
    if (!current) return;
    if (current.blocking && !force) return;
    current = null;
    host.hidden = true;
    clear(sheet);
    app.dialogOpen = false;
    app.sound.play('close');
    app.afterDialog?.();
  }
  host.addEventListener('pointerdown', (e) => {
    if (e.target === host) close();
  });

  return {
    open,
    close,
    render,
    get name() {
      return current?.name ?? null;
    },
    get blocking() {
      return current?.blocking ?? false;
    }
  };
}

// ——— Shared pieces ———
function officerRow(app, id, { selected = false, mark = null, onclick, extra = null, disabled = false } = {}) {
  const s = app.state;
  return h(
    'button.officer',
    { type: 'button', 'aria-pressed': selected ? 'true' : 'false', disabled, onclick },
    face(id, 36, app.rulers()),
    h('span.on', generalName(id), mark ? h('em', mark) : null),
    h(
      'span.os',
      STATS.map((k) => h('span', { title: t(k) }, Math.round(statOf(s, id, k))))
    ),
    extra
  );
}
const statHead = () => h('div.officerHead', h('span'), h('span'), h('span.os', STATS.map((k) => h('span', t(k).slice(0, getLanguage() === 'en' ? 3 : 1)))));

function whyText(r) {
  return r?.why ? t('why_' + r.why) : null;
}

// ——— The dialogs ———
const BUILD = {
  muster(app, args, again) {
    const s = app.state,
      from = args.from,
      node = s.nodes[from];
    if (!node || node.owner !== s.player) return null;
    const here = serving(s, s.player, from).filter((g) => !(s.generals[g].busyUntil > s.day));
    if (!args.commander || !here.includes(args.commander)) {
      args.commander = here.slice().sort((a, b) => statOf(s, b, 'lead') + statOf(s, b, 'war') - statOf(s, a, 'lead') - statOf(s, a, 'war'))[0];
      args.deputies = [];
    }
    args.deputies = (args.deputies ?? []).filter((d) => here.includes(d) && d !== args.commander);
    const team = [args.commander, ...args.deputies].filter(Boolean);
    const naval = NODES[from].traits.includes('r') || NODES[from].traits.includes('c') || NODES[from].kind === 'port';
    const allowed = (u) => unitAllowed(s, s.player, team, u) && (UNITS[u].group !== 'navy' || naval);
    if (!args.unit || !allowed(args.unit)) args.unit = 'spear';
    if (!args.formation || !formationFits(FORMATIONS[args.formation], args.unit)) args.formation = Object.values(FORMATIONS).find((f) => formationFits(f, args.unit)).id;
    const most = args.commander ? Math.min(node.troops, Math.round(troopCap(s, args.commander) + args.deputies.reduce((x, d) => x + troopCap(s, d) * 0.25, 0))) : 0;
    args.troops = Math.max(0, Math.min(args.troops ?? most, most));
    const u = UNITS[args.unit];
    const coin = Math.max(0, Math.round(((u.cost.coin - 100) * args.troops) / 1000)),
      grain = Math.round((args.troops / 400) * 60);
    const f = s.factions[s.player];
    const why = !args.commander ? t('why_generals') : args.troops < 500 ? t('why_troops') : f.coin < coin ? t('why_coin') : f.grain < grain * 0.5 ? t('why_grain') : null;
    const lockWhy = (id) => {
      const need = UNITS[id].need;
      if (UNITS[id].group === 'navy' && !naval) return t('why_water');
      if (!need) return null;
      if (need.kind === 'tech') return t('needTech', { tech: nm(TECHS[need.id]) });
      if (need.kind === 'trait') return t('needTrait', { trait: nm(TRAITS[need.id]) });
      return t('needFaction', { faction: nm(FACTIONS[need.id]) });
    };
    const slider = h('input.range', {
      type: 'range',
      min: 0,
      max: most,
      step: 100,
      value: args.troops,
      'aria-label': t('troops'),
      oninput: (e) => {
        args.troops = +e.target.value;
        again();
      }
    });
    return {
      title: t('musterTitle', { place: placeName(from) }),
      className: 'wide',
      body: [
        h('h3', t('commander'), h('small', ' ' + t('musterPickHelp'))),
        statHead(),
        h(
          'div.officers',
          here.map((g) =>
            officerRow(app, g, {
              selected: g === args.commander || args.deputies.includes(g),
              mark: g === args.commander ? t('commander') : args.deputies.includes(g) ? t('deputies') : null,
              extra: h('span.cap', num(troopCap(s, g))),
              onclick: () => {
                if (g === args.commander) return;
                if (args.deputies.includes(g)) args.deputies = args.deputies.filter((d) => d !== g);
                else if (!args.commander) args.commander = g;
                else if (args.deputies.length < 2) args.deputies.push(g);
                else {
                  args.commander = g;
                  args.deputies = [];
                }
                again();
              }
            })
          )
        ),
        here.length > 1 ? keyedRow(button(t('makeCommander'), () => {
          const d = args.deputies[0];
          if (!d) return;
          args.deputies = [args.commander, ...args.deputies.slice(1)];
          args.commander = d;
          again();
        }, { small: true, why: args.deputies.length ? null : t('why_none') })) : null,
        h('h3', t('troops'), h('small', ' ' + t('musterTroops', { n: num(args.troops), max: num(most) }))),
        slider,
        h('h3', t('unit')),
        h(
          'div.units',
          Object.keys(UNITS).map((id) => {
            const ok = allowed(id);
            const un = UNITS[id];
            return h(
              'button.unitCard',
              { type: 'button', 'aria-pressed': id === args.unit ? 'true' : 'false', disabled: !ok, title: ok ? `${t('atkShort')} ${un.atk} · ${t('defShort')} ${un.def} · ${t('spdShort')} ${un.spd} · ${t('rangeShort')} ${un.range}` : lockWhy(id), onclick: () => ((args.unit = id), again()) },
              h('b', nm(un)),
              h('small', ok ? t('costPerK', { coin: un.cost.coin }) : t('locked'))
            );
          })
        ),
        h('h3', t('formation')),
        choice(
          Object.values(FORMATIONS)
            .filter((fm) => formationFits(fm, args.unit))
            .map((fm) => [fm.id, nm(fm)]),
          args.formation,
          (id) => ((args.formation = id), again())
        ),
        h('p.note', formationNote(FORMATIONS[args.formation])),
        h('p.cost', t('musterCost', { coin: num(coin), grain: num(grain) })),
        args.target ? h('p.note', t('target') + '：' + placeName(args.target)) : h('p.hint', t('musterThenPick'))
      ],
      actions: [
        button(t('cancel'), () => app.dialogs.close()),
        button(t('muster'), () => app.act('muster', from, { commander: args.commander, deputies: args.deputies, troops: args.troops, unit: args.unit, formation: args.formation, target: args.target ?? null }), { kind: 'main', why })
      ]
    };
  },

  pickOfficer(app, args, again) {
    const s = app.state;
    const purpose = args.purpose;
    let list;
    if (purpose === 'persuade') list = serving(s, s.player).filter((g) => g !== args.target && !(s.generals[g].busyUntil > s.day));
    else list = serving(s, s.player, args.at);
    const score = (g) => (purpose === 'persuade' ? persuadeChance(s, s.player, g, args.target) : purpose === 'search' ? statOf(s, g, 'int') + statOf(s, g, 'cha') : statOf(s, g, 'pol'));
    list.sort((a, b) => score(b) - score(a));
    const titles = { search: t('searchTitle', { place: placeName(args.at) }), move: t('moveTitle'), persuade: t('persuadeTitle', { name: generalName(args.target) }) };
    const body = [statHead()];
    if (purpose === 'move' && args.picked) {
      const ours = Object.keys(s.nodes)
        .filter((id) => s.nodes[id].owner === s.player && id !== args.at)
        .sort((a, b) => Math.hypot(NODES[a].x - NODES[args.at].x, NODES[a].y - NODES[args.at].y) - Math.hypot(NODES[b].x - NODES[args.at].x, NODES[b].y - NODES[args.at].y));
      return {
        title: t('moveWhere', { name: generalName(args.picked) }),
        body: [h('div.places', ours.map((id) => button(placeName(id), () => app.act('moveGeneral', args.picked, id), { small: true })))],
        actions: [button(t('back'), () => ((args.picked = null), again()))]
      };
    }
    body.push(
      h(
        'div.officers',
        list.length
          ? list.map((g) => {
              const busy = s.generals[g].busyUntil > s.day;
              const extra = purpose === 'persuade' ? h('span.cap', Math.round(score(g) * 100) + '%') : busy ? h('span.cap', t('busy')) : null;
              return officerRow(app, g, {
                disabled: busy && purpose !== 'move',
                extra,
                onclick: () => {
                  if (purpose === 'search') app.act('search', g, args.at);
                  else if (purpose === 'persuade') app.act('persuade', g, args.target);
                  else {
                    args.picked = g;
                    again();
                  }
                }
              });
            })
          : h('p.dim', t('why_generals'))
      )
    );
    return { title: titles[purpose], body, actions: [button(t('cancel'), () => app.dialogs.close())] };
  },

  transfer(app, args, again) {
    const s = app.state,
      from = args.from,
      node = s.nodes[from];
    const near = ADJACENT[from].map((l) => l.to).filter((id) => s.nodes[id].owner === s.player);
    args.to = near.includes(args.to) ? args.to : near[0];
    args.amount = Math.min(args.amount ?? Math.floor(node.troops / 2 / 100) * 100, node.troops);
    return {
      title: t('transferTitle', { place: placeName(from) }),
      body: near.length
        ? [
            h('h3', t('transferTo')),
            choice(
              near.map((id) => [id, placeName(id) + ' · ' + num(s.nodes[id].troops)]),
              args.to,
              (id) => ((args.to = id), again())
            ),
            h('h3', t('troops'), h('small', ' ' + num(args.amount) + ' / ' + num(node.troops))),
            h('input.range', { type: 'range', min: 0, max: node.troops, step: 100, value: args.amount, 'aria-label': t('troops'), oninput: (e) => ((args.amount = +e.target.value), again()) })
          ]
        : [h('p.dim', t('noNeighbour'))],
      actions: [button(t('cancel'), () => app.dialogs.close()), near.length ? button(t('transfer'), () => app.act('transfer', from, args.to, args.amount), { kind: 'main', why: args.amount < 100 ? t('why_troops') : null }) : null]
    };
  },

  general(app, args, again) {
    const s = app.state,
      id = args.id,
      g = GENERALS[id],
      gs = s.generals[id];
    if (!g || !gs) return null;
    const mine = gs.status === 'serving' && gs.faction === s.player;
    const f = gs.faction ? s.factions[gs.faction] : null;
    const where = gs.at ? (s.nodes[gs.at] ? placeName(gs.at) : s.armies[gs.at] ? t('inArmyOf') : '—') : '—';
    const signature = Object.values(TACTICS).filter((tc) => tc.general === id);
    const schemes = Object.values(TACTICS)
      .filter((tc) => tc.mind && statOf(s, id, 'int') >= tc.mind)
      .sort((a, b) => b.power - a.power)
      .slice(0, 4);
    const store = s.factions[s.player].store ?? [];
    const body = [
      h(
        'div.bio',
        face(id, 120, app.rulers()),
        h(
          'div',
          h('p.names', h('b', nm(g)), getLanguage() === 'zh' ? h('small', g.en) : null),
          h('p', t('status_' + gs.status), f ? ' · ' + factionName(s, gs.faction) : '', gs.status === 'captive' ? ' · ' + t('heldBy', { faction: factionName(s, gs.captor) }) : ''),
          h('p', t('age') + ' ' + (gs.status === 'unborn' ? '—' : ageOf(s, id)), ' · ', t('location') + ' ' + where),
          gs.status === 'serving' ? h('p', t('loyalty') + ' ', h('b', Math.round(gs.loyalty)), bar(gs.loyalty / 100, gs.loyalty < 50 ? 'bad' : 'good')) : null,
          h('p.dim.small', t('lifeYears', { born: g.born, died: gs.status === 'dead' ? (gs.deathDay !== undefined ? dateOf(gs.deathDay).year : g.died) : s.options.lifespan === 'fiction' ? '?' : g.died }))
        )
      ),
      h(
        'div.statBars',
        STATS.map((k) => h('div.sb', h('span.k', t(k)), bar(statOf(s, id, k) / 120, k), h('b', Math.round(statOf(s, id, k)))))
      ),
      h('h3', t('traits')),
      h(
        'ul.traits',
        g.traits.map((tr) => h('li', h('b', nm(TRAITS[tr])), h('span', traitText(tr))))
      ),
      h('h3', t('tactics')),
      h(
        'ul.traits',
        [...signature, ...schemes].map((tc) => h('li', h('b', nm(tc), tc.general ? h('em.sig', t('signature')) : null), h('span', tacticText(tc.id)))),
        h('li.dim', t('weaponTactics'))
      ),
      gs.treasures?.length ? [h('h3', t('treasures')), h('ul.traits', gs.treasures.map((tr) => h('li', h('b', nm(TREASURES[tr])), h('span', treasureText(tr)))))] : null
    ];
    const actions = [];
    if (mine && s.nodes[gs.at]) actions.push(button(t('moveTo'), () => app.dialogs.open('pickOfficer', { at: gs.at, purpose: 'move', picked: id })));
    if (mine && store.length)
      body.push(
        h('h3', t('give')),
        h(
          'div.row.wrap',
          store.map((tr) => button(nm(TREASURES[tr]), () => app.act('give', tr, id), { small: true, title: treasureText(tr) }))
        )
      );
    const canAsk = (gs.status === 'free' && gs.known) || (gs.status === 'captive' && gs.captor === s.player) || (gs.status === 'serving' && gs.faction !== s.player && s.factions[gs.faction]?.ruler !== id);
    if (canAsk) actions.push(button(t('persuade'), () => app.dialogs.open('pickOfficer', { purpose: 'persuade', target: id }), { kind: 'main' }));
    if (gs.status === 'captive' && gs.captor === s.player) actions.push(button(t('release'), () => app.act('release', id)), button(t('execute'), () => app.act('execute', id), { kind: 'danger' }));
    actions.push(button(t('close'), () => app.dialogs.close()));
    return { title: nm(g), className: 'person', body, actions };
  },

  generals(app, args, again) {
    const s = app.state;
    args.tab ??= 'ours';
    args.sort ??= 'lead';
    args.page ??= 0;
    args.find ??= '';
    let list = Object.keys(s.generals);
    if (args.tab === 'ours') list = serving(s, s.player);
    else if (args.tab === 'free') list = list.filter((g) => s.generals[g].status === 'free' && s.generals[g].known);
    else if (args.tab === 'captives') list = list.filter((g) => s.generals[g].status === 'captive' && s.generals[g].captor === s.player);
    else list = list.filter((g) => ['serving', 'free', 'captive'].includes(s.generals[g].status));
    if (args.find) {
      const q = args.find.toLowerCase();
      list = list.filter((g) => GENERALS[g].zh.includes(args.find) || GENERALS[g].en.toLowerCase().includes(q));
    }
    const key = (g) => (args.sort === 'name' ? 0 : args.sort === 'loyalty' ? s.generals[g].loyalty ?? 0 : args.sort === 'age' ? -GENERALS[g].born : statOf(s, g, args.sort));
    list.sort((a, b) => (args.sort === 'name' ? GENERALS[a].en.localeCompare(GENERALS[b].en) : key(b) - key(a)));
    const per = 40,
      pages = Math.max(1, Math.ceil(list.length / per));
    args.page = Math.min(args.page, pages - 1);
    const shown = list.slice(args.page * per, args.page * per + per);
    const col = (k, label) => h('button.th', { type: 'button', 'aria-pressed': args.sort === k ? 'true' : 'false', onclick: () => ((args.sort = k), (args.page = 0), again()) }, label);
    return {
      title: t('menuGenerals'),
      className: 'wide',
      body: [
        h(
          'div.row',
          tabs(
            [
              ['ours', t('rosterOurs')],
              ['free', t('rosterFree')],
              ['captives', t('rosterCaptives')],
              ['all', t('rosterAll')]
            ],
            args.tab,
            (id) => ((args.tab = id), (args.page = 0), again())
          ),
          h('input.find', { type: 'search', placeholder: t('findName'), value: args.find, 'aria-label': t('findName'), onchange: (e) => ((args.find = e.target.value.trim()), (args.page = 0), again()) })
        ),
        h(
          'div.table',
          { role: 'table' },
          h('div.tr.thead', { role: 'row' }, h('span'), col('name', t('nameCol')), STATS.map((k) => col(k, t(k))), col('loyalty', t('loyalty')), col('age', t('age')), h('span', t('location'))),
          shown.map((g) => {
            const gs = s.generals[g];
            return h(
              'button.tr',
              { type: 'button', role: 'row', onclick: () => app.dialogs.open('general', { id: g }) },
              face(g, 28, app.rulers()),
              h('span.nm', generalName(g), gs.faction && args.tab !== 'ours' ? h('small', ' ' + factionName(s, gs.faction)) : null),
              STATS.map((k) => h('span.n', Math.round(statOf(s, g, k)))),
              h('span.n', gs.status === 'serving' ? Math.round(gs.loyalty) : '—'),
              h('span.n', ageOf(s, g)),
              h('span.loc', gs.at ? (s.nodes[gs.at] ? placeName(gs.at) : t('inArmyOf')) : '—')
            );
          })
        ),
        pages > 1 ? h('div.pager', button('‹', () => (args.page--, again()), { small: true, why: args.page ? null : ' ' }), h('span', `${args.page + 1} / ${pages}`), button('›', () => (args.page++, again()), { small: true, why: args.page < pages - 1 ? null : ' ' })) : null,
        h('p.dim.small', t('rosterCount', { n: list.length }))
      ],
      actions: [button(t('close'), () => app.dialogs.close())]
    };
  },

  diplomacy(app, args, again) {
    const s = app.state;
    const me = s.factions[s.player];
    const others = Object.values(s.factions).filter((f) => f.alive && f.id !== s.player);
    others.sort((a, b) => power(s, b.id).cities - power(s, a.id).cities);
    const rows = others.map((f) => {
      const p = power(s, f.id),
        r = regard(s, s.player, f.id),
        tr = me.treaties[f.id];
      const active = tr && tr.until > s.day;
      const treaty = active ? t('treaty_' + tr.kind, { date: dayWords(tr.until) }) : t('noTreaty');
      const ally = active && tr.kind === 'ally';
      return h(
        'div.power',
        seal(f, 'l'),
        h('div.pw', h('b', factionName(s, f.id)), h('small', t('ruler') + ' ' + generalName(f.ruler)), h('small', t('factionCities', { n: p.cities }) + ' · ' + t('factionTroops', { n: num(p.troops) }) + ' · ' + t('factionGenerals', { n: p.generals }))),
        h('div.rg', h('small', t('regard') + ' ' + Math.round(r)), bar((r + 100) / 200, r < 0 ? 'bad' : 'good'), h('small.treaty', { className: active ? 'on' : '' }, treaty)),
        h(
          'div.row.wrap.acts',
          button(t('gift', { coin: 500 }), () => app.act('gift', f.id, 500), { small: true, why: me.coin < 500 ? t('why_coin') : null }),
          button(t('proposeAlly'), () => app.act('propose', f.id, 'ally'), { small: true, why: ally ? t('why_already') : null }),
          button(t('proposeTruce'), () => app.act('propose', f.id, 'truce'), { small: true, why: active ? t('why_already') : null }),
          active ? button(t('breakTreaty'), () => app.act('breakTreaty', f.id), { small: true, kind: 'danger' }) : null,
          button(t('demandSurrender'), () => app.act('demand', f.id), { small: true }),
          ally ? button(t('jointAttack'), () => ((args.ask = f.id), again()), { small: true }) : null
        ),
        args.ask === f.id
          ? h(
              'div.row.wrap.ask',
              h('small', t('jointWho')),
              others
                .filter((o) => o.id !== f.id && !allied(s, s.player, o.id))
                .slice(0, 10)
                .map((o) => button(factionName(s, o.id), () => ((args.ask = null), app.act('askAttack', f.id, o.id)), { small: true }))
            )
          : null
      );
    });
    return { title: t('menuDiplomacy'), className: 'wide', body: [h('p.note', t('diploHelp')), ...rows], actions: [button(t('close'), () => app.dialogs.close())] };
  },

  tech(app) {
    const s = app.state,
      f = s.factions[s.player];
    const rate = researchRate(s, s.player);
    const cur = f.research.current;
    const col = (way, label) =>
      h(
        'section.way',
        h('h3', label),
        [1, 2, 3, 4, 5].map((tier) => {
          const list = Object.values(TECHS).filter((x) => x.way === way && x.tier === tier);
          if (!list.length) return null;
          return h(
            'div.tier',
            h('span.tn', t('tierN', { n: tier })),
            list.map((x) => {
              const done = f.techs.includes(x.id),
                can = canStudy(s, s.player, x.id);
              const state = done ? 'done' : cur === x.id ? 'now' : can ? 'open' : 'shut';
              const needs = x.needs.filter((n) => !f.techs.includes(n)).map((n) => nm(TECHS[n]));
              const why = done ? null : can ? null : needs.length ? t('needTech', { tech: needs.join(getLanguage() === 'en' ? ', ' : '、') }) : t('wayShut');
              return h(
                `button.tech.${state}`,
                { type: 'button', disabled: !can || cur === x.id, title: why ?? techText(x.id), onclick: () => app.act('study', x.id) },
                h('b', nm(x)),
                h('small', techText(x.id)),
                h('small.tc', done ? t('done') : cur === x.id ? Math.floor((f.research.points / x.cost) * 100) + '%' : t('pointsN', { n: x.cost }))
              );
            })
          );
        })
      );
    return {
      title: t('menuTech'),
      className: 'wide',
      body: [
        h('p.note', cur ? t('studying', { tech: nm(TECHS[cur]), p: Math.floor((f.research.points / TECHS[cur].cost) * 100) }) : t('studyNone'), ' · ', t('perMonth', { n: Math.round(rate) }), f.way ? ' · ' + t('wayChosen', { way: t(f.way === 'ba' ? 'wayBa' : 'wayWang') }) : ''),
        h('p.dim.small', t('wayNote')),
        h('div.ways', col('base', t('wayBase')), col('ba', t('wayBa')), col('wang', t('wayWang')))
      ],
      actions: [button(t('close'), () => app.dialogs.close())]
    };
  },

  realm(app, args, again) {
    const s = app.state,
      f = s.factions[s.player];
    let coin = 0,
      grain = 0;
    const places = Object.keys(s.nodes).filter((id) => s.nodes[id].owner === s.player);
    for (const id of places) {
      const i = income(s, id);
      coin += i.coin;
      grain += i.grain;
    }
    const u = upkeep(s, s.player);
    places.sort((a, b) => (NODES[b].kind === 'city') - (NODES[a].kind === 'city') || s.nodes[b].people - s.nodes[a].people);
    const store = f.store ?? [];
    return {
      title: factionName(s, s.player),
      seal: seal(f, 'l'),
      className: 'wide',
      body: [
        h(
          'div.grid.four',
          stat(t('ruler'), generalName(f.ruler)),
          stat(t('income'), `${t('coin')} ${num(coin)} · ${t('grain')} ${num(grain)}`),
          stat(t('upkeep'), `${t('coin')} ${num(u.coin)} · ${t('grain')} ${num(u.grain)}`),
          stat(t('fame'), num(f.fame))
        ),
        h('h3', t('tax')),
        choice(
          ['low', 'normal', 'high'].map((k) => [k, t('tax_' + k)]),
          f.tax,
          (k) => app.act('tax', k)
        ),
        h('p.dim.small', t('taxNote')),
        h('h3', t('talentOrderTitle')),
        f.talentOrder > s.day ? h('p.note', t('talentActive') + ' · ' + dayWords(f.talentOrder)) : button(t('talentOrder'), () => app.act('talentOrder'), { why: f.coin < 300 ? t('why_coin') : null }),
        h('h3', t('store')),
        store.length ? h('ul.traits', store.map((tr) => h('li', h('b', nm(TREASURES[tr])), h('span', treasureText(tr))))) : h('p.dim', t('noTreasureStore')),
        h('h3', t('cities') + ` (${places.length})`),
        h(
          'div.table.cities',
          h('div.tr.thead', h('span', t('placeCol')), h('span', t('people')), h('span', t('support')), h('span', t('order')), h('span', t('garrison')), h('span', t('governor'))),
          places.map((id) => {
            const n = s.nodes[id];
            return h(
              'button.tr',
              { type: 'button', onclick: () => (app.dialogs.close(), app.select({ node: id }), app.map.focus(id)) },
              h('span.nm', placeName(id)),
              h('span.n', num(n.people)),
              h('span.n', { className: n.support < 30 ? 'neg' : '' }, Math.round(n.support)),
              h('span.n', { className: n.order < 30 ? 'neg' : '' }, Math.round(n.order)),
              h('span.n', num(n.troops)),
              h('span.loc', n.governor ? generalName(n.governor) : '—')
            );
          })
        )
      ],
      actions: [button(t('close'), () => app.dialogs.close())]
    };
  },

  chronicle(app, args, again) {
    const s = app.state;
    args.tab ??= 'log';
    const fired = Object.entries(s.fired)
      .filter(([, d]) => d !== 'missed')
      .sort((a, b) => b[1] - a[1]);
    return {
      title: t('menuStory'),
      className: 'wide',
      body: [
        tabs(
          [
            ['log', t('chronicleLog')],
            ['tale', t('chronicleTale')]
          ],
          args.tab,
          (id) => ((args.tab = id), again())
        ),
        args.tab === 'log'
          ? h(
              'ol.chron',
              s.log.map((l) => h('li', h('time', dayWords(l.day)), logLine(s, l)))
            )
          : fired.length
            ? h(
                'ol.chron',
                fired.map(([id, d]) => {
                  const e = eventOf(id);
                  return e ? h('li', h('time', dayWords(d)), h('b', pair(e.title)), h('p', pair(e.text))) : null;
                })
              )
            : h('p.dim', s.branch === 'free' ? t('freeNoTale') : t('noTaleYet'))
      ],
      actions: [button(t('close'), () => app.dialogs.close())]
    };
  },

  saves(app, args, again) {
    const slots = SLOTS.map((slot) => {
      const sum = app.slotSummary(slot);
      return h(
        'div.slot',
        h('b', slot === 'auto' ? t('autosave') : t('slot', { n: slot })),
        sum
          ? h('span', seal(app.state?.factions[sum.faction] ?? FACTIONS[sum.faction], 's'), ' ', factionName(null, sum.faction), ' · ', dayWords(sum.day), ' · ', t('factionCities', { n: sum.cities }))
          : h('span.dim', t('empty')),
        h('div.row', app.state && slot !== 'auto' ? button(t('saveHere'), () => app.act('saveSlot', slot), { small: true }) : null, sum ? button(t('loadThis'), () => app.loadSlot(slot), { small: true, kind: 'main' }) : null)
      );
    });
    const file = h('input', { type: 'file', accept: '.json,application/json', hidden: true, onchange: (e) => e.target.files[0] && app.importFile(e.target.files[0]) });
    return {
      title: t('menuSave'),
      body: [...slots, file, h('div.row.wrap', app.state ? button(t('exportSave'), () => app.exportFile()) : null, button(t('importSave'), () => file.click()))],
      actions: [button(t('close'), () => app.dialogs.close())]
    };
  },

  settings(app, args, again) {
    const st = app.settings;
    const onOff = (key) => choice(
      [
        [true, t('on')],
        [false, t('off')]
      ].map(([v, l]) => [String(v), l]),
      String(st[key]),
      (v) => (app.setSetting(key, v === 'true'), again())
    );
    return {
      title: t('settings'),
      body: [
        h('div.setting', h('span', t('languageLabel')), choice([['zh', '中文'], ['en', 'English']], getLanguage(), (v) => app.setLanguage(v))),
        h('div.setting', h('span', t('sound')), onOff('sound')),
        h('div.setting', h('span', t('music')), onOff('music')),
        h('div.setting', h('span', t('reducedMotion')), onOff('reducedMotion')),
        h('p.dim.small', t('keysHelp')),
        app.state ? h('div.row', button(t('toTitle'), () => app.toTitle(), { kind: 'danger', small: true })) : null,
        h('p.dim.small', t('demo'))
      ],
      actions: [button(t('close'), () => app.dialogs.close())]
    };
  },

  story(app, args) {
    const s = app.state,
      e = eventOf(args.event);
    if (!e) return null;
    const options = args.told ? [] : choicesOf(s, e.id);
    return {
      title: pair(e.title),
      className: 'scroll',
      blocking: true,
      body: [h('p.when', dayWords(s.day)), h('p.tale', pair(e.text))],
      actions: args.told ? [button(t('next'), () => app.act('told'), { kind: 'main' })] : options.map((c, i) => button(pair(c.label), () => app.act('story', e.id, i), { kind: i === 0 ? 'main' : '' }))
    };
  },

  envoy(app, args) {
    const s = app.state,
      m = args.message,
      f = s.factions[m.faction];
    if (!f?.alive) return null;
    return {
      title: t('envoyTitle', { faction: factionName(s, m.faction) }),
      seal: seal(f, 'l'),
      blocking: true,
      body: [h('div.bio', face(f.ruler, 80, app.rulers()), h('p.tale', m.offer === 'ally' ? t('envoyAlly') : t('envoyTruce')))],
      actions: [button(t('decline'), () => app.act('envoy', m, false)), button(t('agree'), () => app.act('envoy', m, true), { kind: 'main' })]
    };
  },

  captive(app, args) {
    const s = app.state,
      id = args.general,
      gs = s.generals[id];
    if (!gs || gs.status !== 'captive' || gs.captor !== s.player) return null;
    const ruler = s.factions[s.player].ruler;
    const best = serving(s, s.player)
      .filter((g) => !(s.generals[g].busyUntil > s.day))
      .sort((a, b) => persuadeChance(s, s.player, b, id) - persuadeChance(s, s.player, a, id))[0] ?? ruler;
    return {
      title: t('captiveTitle', { name: generalName(id) }),
      blocking: true,
      body: [h('div.bio', face(id, 100, app.rulers()), h('div', h('p.tale', t('captiveText', { name: generalName(id) })), h('div.statBars', STATS.map((k) => h('div.sb', h('span.k', t(k)), bar(statOf(s, id, k) / 120, k), h('b', Math.round(statOf(s, id, k)))))), h('p.note', t('persuadeBy', { name: generalName(best), p: Math.round(persuadeChance(s, s.player, best, id) * 100) }))))],
      actions: [
        button(t('execute'), () => app.act('execute', id, true), { kind: 'danger' }),
        button(t('release'), () => app.act('release', id, true)),
        button(t('keepCaptive'), () => app.act('keepCaptive', id)),
        button(t('persuade'), () => app.act('persuade', best, id, true), { kind: 'main' })
      ]
    };
  },

  battle(app, args) {
    const s = app.state,
      setup = args.setup;
    const mineSide = setup.factions.indexOf(s.player);
    const side = (k) =>
      h(
        'div.side',
        h('h3', seal(s.factions[setup.factions[k]], 's'), ' ', setup.factions[k] ? factionName(s, setup.factions[k]) : t('noOwner'), k === 0 ? h('small', ' ' + t('attackerSide')) : h('small', ' ' + t('defenderSide'))),
        setup.units
          .filter((u) => u.side === k)
          .map((u) => h('div.bu', u.general ? face(u.general, 28, app.rulers()) : h('span.face.blank'), h('span', u.general ? generalName(u.general) : t('captain')), h('small', nm(UNITS[u.unit]) + ' ' + num(u.troops))))
      );
    const place = setup.place.node ? placeName(setup.place.node) : placeName(setup.place.link[0]) + '—' + placeName(setup.place.link[1]);
    const kind = setup.special ? t('special_' + setup.special) : t('battleKind_' + setup.kind);
    return {
      title: t('battleAt', { place }),
      className: 'wide battleAsk',
      blocking: true,
      body: [h('p.note', kind + ' · ' + t('battleAsk', { a: factionName(s, setup.factions[0]), b: setup.factions[1] ? factionName(s, setup.factions[1]) : t('noOwner') })), h('div.sides', side(0), h('span.vs', '⚔'), side(1)), mineSide < 0 ? null : h('p.dim.small', t('battleChoiceHelp'))],
      actions: [button(t('battleEntrust'), () => app.act('entrust', setup)), button(t('battleCommand'), () => app.startBattle(setup), { kind: 'main' })]
    };
  },

  battleResult(app, args) {
    const s = app.state,
      { setup, result } = args;
    const mine = setup.factions.indexOf(s.player);
    const won = result.winner === mine;
    const losses = [0, 1].map((k) => setup.units.reduce((x, u, i) => (u.side === k ? x + u.troops - result.units[i].troops : x), 0));
    const fates = [];
    setup.units.forEach((u, i) => {
      for (const [g, fate] of Object.entries(result.units[i].fates ?? {})) if (fate === 'killed') fates.push(t('fateKilled', { name: generalName(g) }));
      else if (fate === 'captured') fates.push(t('fateCaptured', { name: generalName(g) }));
    });
    return {
      title: won ? t('victory') : t('defeat'),
      className: 'result ' + (won ? 'won' : 'lost'),
      blocking: true,
      body: [
        h('div.stamp', won ? t('stampWon') : t('stampLost')),
        h('p.note', t('why_' + result.why) + ' · ' + t('secondsN', { n: result.seconds })),
        h('div.grid', stat(t('ourLosses'), num(losses[Math.max(0, mine)])), stat(t('theirLosses'), num(losses[1 - Math.max(0, mine)]))),
        fates.length ? h('ul.fates', fates.map((x) => h('li', x))) : null
      ],
      actions: [button(t('ok'), () => app.dialogs.close(true), { kind: 'main' })]
    };
  },

  ending(app) {
    const s = app.state,
      kind = s.over.kind;
    const st = s.stats;
    return {
      title: t('ending_' + kind),
      className: 'ending ' + kind,
      blocking: true,
      body: [h('div.stamp.big', t('ending_' + kind)), h('p.tale', t('endingText_' + kind)), h('p.note', dayWords(s.day) + ' · ' + factionName(s, s.player)), h('p.note', t('endingStats', { won: st.battlesWon, lost: st.battlesLost, taken: st.citiesTaken, recruited: st.generalsRecruited }))],
      actions: [kind !== 'fallen' ? button(t('keepPlaying'), () => app.keepWatching()) : null, button(t('playAgain'), () => app.toTitle(), { kind: 'main' })]
    };
  }
};

function formationNote(f) {
  const part = (k, v) => (v ? `${t(k)} ${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%` : null);
  return [part('atkShort', f.atk), part('defShort', f.def), part('spdShort', f.spd), part('frontShort', f.front), part('flankShort', f.flank)].filter(Boolean).join(' · ') || '—';
}
const keyedRow = (...nodes) => h('div.row', ...nodes);

export { STATS, dateOf };
