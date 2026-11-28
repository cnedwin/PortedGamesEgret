import { t } from '../i18n.mjs';
import { h } from './dom.mjs';
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
