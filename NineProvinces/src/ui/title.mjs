// 标题与开局：背后是中平元年的 3D 天下，镜头缓缓掠过洛阳一带；帛书题名和朱印置于左侧。新的征程分三步：选演义、
// 选势力（选中时镜头飞到它的治所）、定规则（寿命、战斗是否亲自指挥、难度）。
// The title and the start: behind, the 3D realm in 184, the camera gliding slowly over the land round Luoyang; on the
// left the title on silk and its vermilion seal. A new campaign takes three steps: the tale, the power (the camera
// flies to its seat as it is chosen), and the rules (lifespans, whether to command battles, difficulty).
import { FACTIONS } from '../data/factions.mjs';
import { NODES } from '../data/map.mjs';
import { BRANCHES } from '../sim/story.mjs';
import { createGame, power } from '../sim/world.mjs';
import { SCENARIOS, scenarioOf } from '../sim/scenarios.mjs';
import { normalizeRoster } from '../custom-officers.mjs';
import { showOfficerRoster } from './officers.mjs';
import { customFactionOptions, validateCustomFaction } from '../sim/custom-faction.mjs';
import { freshFounding, reconcileFounding, foundingFields, foundingSubmission, foundingErrorText } from './founding.mjs';
import { nm, num, t } from '../i18n.mjs';
import { generalName, placeName } from '../view/names.mjs';
import { $, button, choice, clear, face, h, seal } from './dom.mjs';
import { pair } from './text.mjs';

export function showTitle(app) {
  const box = $('#title');
  app.screen = 'title';
  clear(box);
  box.hidden = false;
  box.className = 'title';
  const hasAuto = Boolean(app.slotSummary('auto'));
  box.append(
    h(
      'div.titleMenu',
      h('header.campaignMark', h('span.beaconSeal', { 'aria-hidden': 'true' }, app.language() === 'zh' ? '烽' : '✦'),
        h('h1', t('title'))),
      h('p.subtitle', t('subtitle')),
      h(
        'nav',
        hasAuto ? button(t('continue'), () => app.loadSlot('auto'), { kind: 'main' }) : null,
        button(t('newGame'), () => showSetup(app), { kind: hasAuto ? '' : 'main' }),
        button(t('load'), () => app.open('saves')),
        button(pair(['登录新武将', 'Register officers']), () => showOfficerRoster(app, () => typeof app.toTitle === 'function' ? app.toTitle() : showTitle(app))),
        typeof app.openSandbox === 'function' ? button(pair(['演武沙盘', 'Battle sandbox']), () => app.openSandbox()) : null,
        button(t('settings'), () => app.open('settings')),
        button(t('language'), () => app.setLanguage(app.language() === 'zh' ? 'en' : 'zh'))
      ),
      typeof app.openNanpi === 'function' ? h('button.btn.nanpi-entry', {type:'button',onclick:app.openNanpi},
        h('span',pair(['夕照南皮','Nanpi at sunset'])), h('small',pair(['3D 攻城演武','3D siege trial']))) : null,
      app.notice ? h('p.notice', app.notice) : null,
      h('p.demo', t('demo'))
    )
  );
  box.querySelector('nav .btn')?.focus({ preventScroll: true });
}

export function showSetup(app, pickedBranch = null) {
  const box = $('#title');
  app.screen = 'setup';
  app.wake();
  app.map.setDrift(null);
  app.pickFaction = (id) => {
    if (pick.mode === 'custom') return;
    if ((pick.scenario === '184' && BRANCHES[pick.branch].faction) || !demo.factions[id]?.alive) return;
    pick.faction = id;
    render();
    focus();
  };
  app.pickCustomTown = id => {
    if (pick.mode !== 'custom') return false;
    if (!customFactionOptions(demo, app.officerRoster?.() ?? []).towns.some(town => town.id === id)) return false;
    founding.town = id;
    render();
    focus();
    return true;
  };
  const pick = { scenario: '184', mode: 'historical', branch: BRANCHES[pickedBranch] ? pickedBranch : 'caocao', faction: null, lifespan: 'history', command: true, difficulty: 'normal' };
  const founding = freshFounding();
  let refreshStart = () => {};
  let demo = app.demoState;
  if (demo?.scenario && demo.scenario !== '184') demo = createGame({seed:184});
  app.demoState = demo;
  app.map?.refreshLands?.(true);
  const selected = new Set();
  function chooseScenario(id) {
    pick.scenario = id;
    if (id !== '184') pick.branch = 'free';
    demo = createGame({ scenario: id, seed: 184, branch: 'free', faction: pick.faction ?? 'caocao' });
    app.demoState = demo;
    if (!demo.factions[pick.faction]?.alive) pick.faction = 'caocao';
    app.map?.refreshLands?.(true);
    render(); focus();
  }
  function render() {
    const previousScroll = box.querySelector('.setupBody')?.scrollTop ?? 0;
    const focused = box.contains(document.activeElement) && document.activeElement.dataset.setupKey;
    const spec = scenarioOf(pick.scenario);
    const customMode = pick.mode === 'custom';
    const fixed = !customMode && pick.scenario === '184' ? BRANCHES[pick.branch].faction : null;
    if (fixed) pick.faction = fixed;
    pick.faction ??= 'caocao';
    clear(box);
    box.className = 'title setup';
    const factions = Object.values(demo.factions).filter(f => f.alive)
      .map((f) => ({ f, p: power(demo, f.id) }))
      .sort((a, b) => b.p.cities - a.p.cities || b.p.troops - a.p.troops);
    const chosen = demo.factions[pick.faction];
    const chosenName = chosen.name ?? FACTIONS[pick.faction];
    const roster = normalizeRoster(app.officerRoster?.() ?? []);
    if (customMode) reconcileFounding(demo, roster, founding);
    const p = power(demo, pick.faction);
    const customStatus = h('p.foundingStatus', { role: 'status' });
    const headerSummary = h('div.setupSummary', { 'aria-live': 'polite' });
    const footerSummary = h('div.setupSummary');
    const start = button(t('start'), () => {
      if (customMode) {
        const result = validateCustomFaction(demo, foundingSubmission(founding), roster);
        if (!result.ok) { customStatus.textContent = foundingErrorText(result.errors); return; }
        app.newGame({ ...pick, branch: 'free', officers: normalizeRoster(app.officerRoster?.() ?? []), customFaction: result.config });
      } else app.newGame({ ...pick, officers: normalizeRoster(app.officerRoster?.() ?? []).filter(g => selected.has(g.id)) });
    }, { kind: 'main' });
    start.dataset.setupKey = 'confirm-start';
    refreshStart = () => {
      let summary;
      if (customMode) {
        const result = validateCustomFaction(demo, foundingSubmission(founding), roster);
        start.disabled = !result.ok;
        const town = result.options.towns.find(item => item.id === result.config.town);
        const ruler = result.options.officers.find(item => item.ref === result.config.ruler);
        const companions = result.config.companions.map(ref => result.options.officers.find(item => item.ref === ref)).filter(Boolean);
        summary = [pair(['起家城：', 'Town: ']) + (town ? nm(town) : '—'), pair(['主公：', 'Ruler: ']) + (ruler ? nm(ruler) : '—'),
          pair(['同行：', 'Companions: ']) + (companions.length ? companions.map(nm).join(' / ') : pair(['无', 'None']))].join(' · ');
        customStatus.textContent = result.ok ? '' : foundingErrorText(result.errors);
        customStatus.hidden = result.ok;
      } else summary = [placeName(chosen.capital), generalName(chosen.ruler), nm(chosenName)].join(' · ');
      const rules = [nm(spec), t(pick.lifespan === 'history' ? 'lifeHistory' : 'lifeFiction'),
        t(pick.command ? 'commandOn' : 'commandOff'), t(pick.difficulty === 'easy' ? 'easy' : pick.difficulty === 'hard' ? 'hard' : 'normal')].join(' · ');
      for (const host of [headerSummary, footerSummary]) host.replaceChildren(h('span', summary), h('small', rules));
    };
    box.append(
      h(
        'section.setupPanel',
        { role: 'dialog', 'aria-label': t('newGame') },
        h('header', h('h2', t('newGame')), h('p.dim', nm(spec)), headerSummary),
        h('div.setupBody',
          h('h3', pair(['选择年代', 'Starting year'])),
          h('div.scenarioGrid', Object.values(SCENARIOS).map(s => h('button.scenarioCard', {
            type: 'button', dataset: { setupKey: 'scenario-' + s.id }, 'aria-pressed': s.id === pick.scenario ? 'true' : 'false', onclick: () => chooseScenario(s.id)
          }, h('b', nm(s)), h('small', pair(s.about))))),
          h('p.note', pair(['地图、人才和盟约为该时点的策略快照；之后由原有规则自由推演。', 'Territory, officers and pacts form a strategic snapshot. Existing rules determine what follows.'])),
          h('h3', pair(['出身', 'Your beginning'])),
          choice([['historical', pair(['历史势力', 'Historical faction'])], ['custom', pair(['自建势力', 'Found a faction'])]], pick.mode, mode => {
            pick.mode = mode;
            render();
            focus();
          }, { setupKey: 'mode' }),
          pick.scenario === '184' && !customMode ? h('h3', t('chooseBranch')) : null,
          pick.scenario === '184' && !customMode ? h(
            'div.branches',
            Object.entries(BRANCHES).map(([id, br]) =>
              h(
                'button.branch',
                { type: 'button', dataset: { setupKey: 'tale-' + id }, 'aria-pressed': id === pick.branch ? 'true' : 'false', onclick: () => ((pick.branch = id), (pick.faction = BRANCHES[id].faction ?? pick.faction), render(), focus()) },
                h('b', nm(br)),
                h('small', pair(br.about))
              )
            )
          ) : customMode ? null : h('p.note', pair(['此年代使用自由历史局，不追补184年演义。', 'This era is a free campaign; the 184 story is not replayed.'])),
          customMode ? foundingFields(app, demo, roster, founding, rerender => {
            if (rerender) { render(); focus(); }
            else refreshStart();
          }, () => showOfficerRoster(app, () => { app.screen = 'setup'; render(); focus(); })) : h('div.historicalStart',
          h('h3', t('chooseFaction')),
          fixed
            ? h('p.note', t('lockedBranch', { faction: nm(FACTIONS[fixed]) }))
            : h(
                'div.factions',
              factions.map(({ f, p: fp }) =>
                  h(
                    'button.fac',
                    { type: 'button', dataset: { setupKey: 'power-' + f.id }, 'aria-pressed': f.id === pick.faction ? 'true' : 'false', onclick: () => ((pick.faction = f.id), render(), focus()) },
                    seal(demo.factions[f.id], 's'),
                    h('span', nm(f.name ?? FACTIONS[f.id])),
                    h('small', t('factionCities', { n: fp.cities }))
                  )
                )
              ),
          h(
            'div.chosen',
            seal(demo.factions[pick.faction], 'l'),
          face(chosen.ruler, 96, new Set([chosen.ruler])),
          h('div', h('b', nm(chosenName)), h('p', t('ruler') + ' ' + generalName(chosen.ruler) + ' · ' + placeName(chosen.capital)), h('p.dim', [t('factionCities', { n: p.cities }), t('factionGenerals', { n: p.generals }), t('factionTroops', { n: num(p.troops) })].join(' · ')))
          ),
          h('h3', pair(['自建武将', 'Custom officers'])),
          h('p.note', pair(['只把勾选人物加入本次新局。名册及其他存档不受影响。', 'Only checked officers enter this new campaign. Your roster and other saves stay separate.'])),
          roster.length ? h('div.rosterPick', roster.map(g => h('label.rosterPickRow',
            h('input', {type:'checkbox',checked:selected.has(g.id),onchange:({target})=>{if(target.checked)selected.add(g.id);else selected.delete(g.id)}}),
            h('span', h('b', nm(g)), h('small', g.age+' · '+pair(g.service==='player'?['仕官所选势力','Serve your chosen faction']:['在野登场','Begin unattached']))))))
            : h('p.dim.small', pair(['名册尚为空，可在这里登录人物。', 'Your roster is empty. Register an officer here.'])),
          button(pair(['管理武将名册', 'Manage officer roster']), () => showOfficerRoster(app, () => {app.screen='setup';render();focus();})),
          ),
          h('h3', t('chooseRules')),
          pick.scenario !== '184' ? h('p.dim.small', pair(['年轻武将的阅历、年长武将的体能有温和修正；智略与内政不会随高龄一刀切下降。', 'Younger officers have modest experience adjustments; older officers lose some physical strength, not their strategic or administrative expertise.'])) : null,
          h('div.setting', h('span', t('lifespan')), choice([['history', t('lifeHistory')], ['fiction', t('lifeFiction')]], pick.lifespan, (v) => ((pick.lifespan = v), render()), { setupKey: 'lifespan' })),
          h('div.setting', h('span', t('command')), choice([['on', t('commandOn')], ['off', t('commandOff')]], pick.command ? 'on' : 'off', (v) => ((pick.command = v === 'on'), render()), { setupKey: 'command' })),
          h('div.setting', h('span', t('difficulty')), choice([['easy', t('easy')], ['normal', t('normal')], ['hard', t('hard')]], pick.difficulty, (v) => ((pick.difficulty = v), render()), { setupKey: 'difficulty' })),
          customMode ? customStatus : null,
        ),
        h('footer', button(t('back'), () => typeof app.toTitle === 'function' ? app.toTitle() : showTitle(app)), footerSummary, start)
      )
    );
    box.querySelector('.setupBody').scrollTop = previousScroll;
    refreshStart();
    if (focused) box.querySelector(`[data-setup-key="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
  }
  function focus() {
    const n = NODES[pick.mode === 'custom' ? founding.town : demo.factions[pick.faction].capital];
    if (!n) return;
    app.map?.focus(n.id, 90);
  }
  render();
  focus();
  box.querySelector('.branch[aria-pressed="true"]')?.focus({ preventScroll: true });
}
