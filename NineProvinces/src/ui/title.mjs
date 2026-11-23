// 标题与开局：背后是中平元年的天下图（三十四路诸侯的疆域），慢慢移动；右边竖排着题名。新的征程分三步：选演义、
// 选势力（选中时地图移到它的治所）、定规则（寿命、战斗是否亲自指挥、难度）。
// The title and the start: behind, the map of the realm in 184 (the lands of thirty-four lords), drifting slowly; on
// the right the title, written top to bottom. A new campaign takes three steps: the tale, the power (the map moves to
// its seat as it is chosen), and the rules (lifespans, whether to command battles, difficulty).
import { FACTIONS } from '../data/factions.mjs';
import { NODES } from '../data/map.mjs';
import { BRANCHES } from '../sim/story.mjs';
import { power } from '../sim/world.mjs';
import { nm, num, t } from '../i18n.mjs';
import { factionName, generalName, placeName } from '../view/names.mjs';
import { $, button, choice, clear, face, h, seal } from './dom.mjs';
import { pair } from './text.mjs';
import { KAI } from '../view/mapart.mjs';

/** The title as a picture: four characters written top to bottom in a silk glow, and a vermilion seal beneath. */
let titleArt = null;
function paintTitle() {
  if (titleArt) return titleArt;
  const size = 128,
    c = document.createElement('canvas');
  c.width = size * 1.6;
  c.height = size * 4.2 + size * 0.9;
  const g = c.getContext('2d');
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${size}px ${KAI}`;
  [...'九州烽烟'].forEach((ch, i) => {
    const x = c.width / 2,
      y = size * 0.55 + i * size * 1.02;
    // Gilt characters with a dark halo, so they read over the realm behind them.
    g.shadowColor = 'rgba(8, 6, 4, 0.95)';
    g.shadowBlur = 26;
    const gold = g.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    gold.addColorStop(0, '#fff1c4');
    gold.addColorStop(0.55, '#e2bd6c');
    gold.addColorStop(1, '#a9803a');
    g.fillStyle = gold;
    g.fillText(ch, x, y);
    g.shadowBlur = 4;
    g.shadowColor = 'rgba(8, 6, 4, 1)';
    g.fillText(ch, x, y);
  });
  // The seal: a square of vermilion with the character for beacon fires cut in white.
  const s = size * 0.62,
    sx = c.width / 2 - s / 2,
    sy = size * 4.25;
  g.shadowBlur = 0;
  g.fillStyle = '#a8322b';
  g.fillRect(sx, sy, s, s);
  g.strokeStyle = 'rgba(255, 248, 234, 0.6)';
  g.lineWidth = 3;
  g.strokeRect(sx + 4, sy + 4, s - 8, s - 8);
  g.fillStyle = '#fff8ea';
  g.font = `700 ${s * 0.72}px ${KAI}`;
  g.fillText('烽', c.width / 2, sy + s / 2 + 2);
  return (titleArt = c.toDataURL('image/png'));
}

export function showTitle(app) {
  const box = $('#title');
  app.screen = 'title';
  clear(box);
  box.hidden = false;
  box.className = 'title';
  const hasAuto = Boolean(app.slotSummary('auto'));
  box.append(
    h('div.titleMark', h('h1', h('img.titleArt', { src: paintTitle(), alt: t('title') })), app.language() === 'en' ? h('p.enTitle', { 'aria-hidden': 'true' }, 'Nine Provinces Ablaze') : null),
    h(
      'div.titleMenu',
      h('p.subtitle', t('subtitle')),
      h(
        'nav',
        hasAuto ? button(t('continue'), () => app.loadSlot('auto'), { kind: 'main' }) : null,
        button(t('newGame'), () => showSetup(app), { kind: hasAuto ? '' : 'main' }),
        button(t('load'), () => app.open('saves')),
        button(t('settings'), () => app.open('settings')),
        button(t('language'), () => app.setLanguage(app.language() === 'zh' ? 'en' : 'zh'))
      ),
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
  app.pickFaction = (id) => {
    if (BRANCHES[pick.branch].faction || !FACTIONS[id]) return;
    pick.faction = id;
    render();
    focus();
  };
  const demo = app.demoState;
  const pick = { branch: pickedBranch ?? 'caocao', faction: null, lifespan: 'history', command: true, difficulty: 'normal' };
  function render() {
    const fixed = BRANCHES[pick.branch].faction;
    if (fixed) pick.faction = fixed;
    pick.faction ??= 'caocao';
    clear(box);
    box.className = 'title setup';
    const factions = Object.values(FACTIONS)
      .map((f) => ({ f, p: power(demo, f.id) }))
      .sort((a, b) => b.p.cities - a.p.cities || b.p.troops - a.p.troops);
    const chosen = FACTIONS[pick.faction];
    const p = power(demo, pick.faction);
    box.append(
      h(
        'section.setupPanel',
        { role: 'dialog', 'aria-label': t('newGame') },
        h('header', h('h2', t('newGame')), h('p.dim', t('scenario184'))),
        h('h3', t('chooseBranch')),
        h(
          'div.branches',
          Object.entries(BRANCHES).map(([id, br]) =>
            h(
              'button.branch',
              { type: 'button', 'aria-pressed': id === pick.branch ? 'true' : 'false', onclick: () => ((pick.branch = id), (pick.faction = BRANCHES[id].faction ?? pick.faction), render(), focus()) },
              h('b', nm(br)),
              h('small', pair(br.about))
            )
          )
        ),
        h('h3', t('chooseFaction')),
        fixed
          ? h('p.note', t('lockedBranch', { faction: nm(FACTIONS[fixed]) }))
          : h(
              'div.factions',
              factions.map(({ f, p: fp }) =>
                h(
                  'button.fac',
                  { type: 'button', 'aria-pressed': f.id === pick.faction ? 'true' : 'false', onclick: () => ((pick.faction = f.id), render(), focus()) },
                  seal(demo.factions[f.id], 's'),
                  h('span', nm(f)),
                  h('small', t('factionCities', { n: fp.cities }))
                )
              )
            ),
        h(
          'div.chosen',
          seal(demo.factions[pick.faction], 'l'),
          face(chosen.ruler, 64, new Set([chosen.ruler])),
          h('div', h('b', nm(chosen)), h('p', t('ruler') + ' ' + generalName(chosen.ruler) + ' · ' + placeName(chosen.seat)), h('p.dim', [t('factionCities', { n: p.cities }), t('factionGenerals', { n: p.generals }), t('factionTroops', { n: num(p.troops) })].join(' · ')))
        ),
        h('h3', t('chooseRules')),
        h('div.setting', h('span', t('lifespan')), choice([['history', t('lifeHistory')], ['fiction', t('lifeFiction')]], pick.lifespan, (v) => ((pick.lifespan = v), render()))),
        h('div.setting', h('span', t('command')), choice([['on', t('commandOn')], ['off', t('commandOff')]], pick.command ? 'on' : 'off', (v) => ((pick.command = v === 'on'), render()))),
        h('div.setting', h('span', t('difficulty')), choice([['easy', t('easy')], ['normal', t('normal')], ['hard', t('hard')]], pick.difficulty, (v) => ((pick.difficulty = v), render()))),
        h('footer', button(t('back'), () => showTitle(app)), button(t('start'), () => app.newGame({ ...pick }), { kind: 'main' }))
      )
    );
  }
  function focus() {
    const n = NODES[FACTIONS[pick.faction].seat];
    app.map?.focus(n.id, 0.9);
  }
  render();
  focus();
  box.querySelector('.branch[aria-pressed="true"]')?.focus({ preventScroll: true });
}
