import { NODES } from '../data/map.mjs';
import { getLanguage, t } from '../i18n.mjs';
import { factionName } from '../view/names.mjs';
import { colourOf, h } from './dom.mjs';
import { pair } from './text.mjs';

export const CITY_OVERVIEW = 'overview';
const citySections = [
  { id: CITY_OVERVIEW, label: () => pair(['概况', 'Overview']) },
  { id: 'works', label: () => t('works') },
  { id: 'orders', label: () => t('orders') },
  { id: 'officers', label: () => pair(['武将', 'Officers']) }
];

const tabId = id => 'place-tab-' + id;
const panelId = id => 'place-content-' + id;

export function cityTabs(active, select) {
  return h('nav.placeTabs', { role: 'tablist', 'aria-label': pair(['城务', 'City management']) },
    citySections.map(({ id, label }, index) => h('button.placeTab', {
      type: 'button', role: 'tab', id: tabId(id), 'aria-controls': panelId(id),
      'aria-selected': String(id === active), tabIndex: id === active ? 0 : -1,
      dataset: { k: tabId(id), cityTab: id },
      onclick: () => select(id),
      onkeydown: event => {
        const last = citySections.length - 1;
        let next;
        if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1;
        else if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = last;
        else return;
        event.preventDefault();
        event.stopPropagation();
        select(citySections[next].id);
      }
    }, label()))
  );
}

export function cityContent(active, sections) {
  return h('div.placeBody', citySections.map(({ id }) => h('section.placeSection', {
    id: panelId(id), role: 'tabpanel', 'aria-labelledby': tabId(id), hidden: id !== active,
    tabIndex: 0, dataset: { k: panelId(id) }
  }, id === active ? sections[id] : null)));
}

export function createCampaignTime(app, speeds) {
  const pause = h('button.pause', { type: 'button', dataset: { k: 'pause' }, onclick: () => app.setPaused(!app.paused) },
    h('span.pauseGlyph', { 'aria-hidden': 'true' }), h('span.pauseWord'));
  const [icon, word] = pause.children;
  const speed = h('select.campaignSpeed#campaignSpeed', { dataset: { k: 'speed' },
    onchange: ({ target }) => app.setSpeed(Number(target.value)) });
  const control = h('div.clock.campaignTime', { role: 'group' }, pause, speed);
  let language;
  return {
    element: control,
    sync() {
      const paused = app.paused, label = t(paused ? 'resume' : 'pause');
      icon.textContent = paused ? '▶' : '❚❚';
      word.textContent = label;
      pause.title = label + ' (Space)';
      pause.setAttribute('aria-label', label);
      pause.setAttribute('aria-pressed', String(paused));
      if (language !== getLanguage()) {
        language = getLanguage();
        const speedLabel = pair(['推进速度', 'Campaign speed']);
        control.setAttribute('aria-label', t('speedLabel'));
        speed.setAttribute('aria-label', speedLabel);
        speed.title = speedLabel + ' (1–5)';
        speed.replaceChildren(...speeds.map((rate, index) => h('option', { value: String(index) },
          rate + pair([' 天/秒', ' days/s']))));
      }
      const selected = String(app.speed);
      if (speed.value !== selected) speed.value = selected;
    }
  };
}

export function territoryLegend(state) {
  const counts = new Map();
  for (const [id, site] of Object.entries(state.nodes)) {
    if (NODES[id]?.kind === 'city' && site.owner) counts.set(site.owner, (counts.get(site.owner) ?? 0) + 1);
  }
  const rivals = [...counts].filter(([id]) => id !== state.player).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const chips = [state.player, ...rivals.map(([id]) => id)].map(id => h('span.legendChip',
    h('i', { style: { '--legend-colour': colourOf(state.factions[id]) }, 'aria-hidden': 'true' }), factionName(state, id)));
  return h('div.territoryLegend#territoryLegend', { role: 'note', 'aria-label': pair(['势力图图例', 'Domains legend']) },
    h('div.legendColours', chips),
    h('div.legendKey',
      h('span.legendChip', h('i.legendNeutral', { 'aria-hidden': 'true' }), pair(['无主', 'Unclaimed'])),
      h('span.legendChip', h('i.legendBorder', { 'aria-hidden': 'true' }), pair(['势力边界', 'Border'])))
  );
}
