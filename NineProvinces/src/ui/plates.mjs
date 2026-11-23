// 名牌：地图上每座城、关、津头顶的牌子（城主的旗号印、地名、守军条，被围时泛红），每支军团头顶的牌子（主将头像、
// 名字、兵数、兵力条，本方金边）。只在内容变了时改写，点一下就是点那座城或那支军。
// Name plates: over every city, pass and ferry (the holder's seal, the name, a bar of the garrison, red while besieged),
// and over every army (the commander's face, name, troops and a bar of strength, a gold rim for the player's own). Each
// is rewritten only when what it shows has changed; a tap on one is a tap on that place or army.
import { NODES } from '../data/map.mjs';
import { getLanguage } from '../i18n.mjs';
import { troopCap } from '../sim/military.mjs';
import { factionColour } from '../view3d/realm.mjs';
import { generalName, placeName } from '../view/names.mjs';
import { portrait } from '../view/portrait.mjs';
import { h } from './dom.mjs';

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const fmt = (n) => (getLanguage() === 'en' ? Math.round(n).toLocaleString('en') : Math.round(n).toLocaleString('zh-CN'));

/** Plate makers for the realm view; `app` gives the state, the choice and what to do on a tap. */
export function createPlates(app) {
  const keys = new WeakMap();
  const flagOf = (s, owner) => s?.factions[owner]?.flag ?? '';
  return {
    node(id, element, force = false) {
      const n = NODES[id];
      if (!element) {
        element = h('div.plate.place.' + n.kind, { dataset: { node: id } }, h('span.seal'), h('span.pname'), n.kind === 'city' ? h('span.pbar', h('i')) : null);
        element.addEventListener('click', (e) => {
          e.stopPropagation();
          app.tapNode(id);
        });
        return element;
      }
      const s = app.state ?? app.demoState;
      const node = s?.nodes[id];
      if (!node) return element;
      const owner = node.owner;
      const siege = s.armies && Object.values(s.armies).some((a) => a.besieging === id);
      const capital = owner && s.factions[owner]?.capital === id;
      const chosen = app.sel?.node === id;
      const share = n.kind === 'city' ? Math.min(1, node.troops / Math.max(1, 6000 + n.size * 6000)) : 0;
      const key = [owner, siege, capital, chosen, Math.round(share * 40), getLanguage()].join('|');
      if (!force && keys.get(element) === key) return element;
      keys.set(element, key);
      const [seal, name, bar] = element.children;
      seal.textContent = owner ? flagOf(s, owner) : '·';
      seal.style.setProperty('--c', owner ? hex(factionColour(s, owner)) : '#6b6760');
      name.textContent = placeName(id);
      if (bar) bar.firstChild.style.width = Math.round(share * 100) + '%';
      element.classList.toggle('siege', Boolean(siege));
      element.classList.toggle('capital', Boolean(capital));
      element.classList.toggle('mine', owner === app.state?.player);
      element.classList.toggle('chosen', chosen);
      return element;
    },
    army(id, element, force = false) {
      const s = app.state ?? app.demoState;
      const a = s?.armies[id];
      if (!element) {
        element = h('div.plate.army', { dataset: { army: id } }, h('span.ring', h('img.face', { alt: '' })), h('span.ainfo', h('b.aname'), h('span.atroops'), h('span.pbar', h('i'))));
        element.addEventListener('click', (e) => {
          e.stopPropagation();
          app.tapArmy(id);
        });
        return element;
      }
      if (!a) return element;
      const chosen = app.sel?.army === id;
      const key = [a.commander, Math.round(a.troops / 50), a.faction, chosen, a.besieging ?? '', getLanguage()].join('|');
      if (!force && keys.get(element) === key) return element;
      keys.set(element, key);
      const ring = element.firstChild,
        img = ring.firstChild;
      const [nameEl, troopsEl, bar] = element.lastChild.children;
      const src = a.commander ? portrait(a.commander, 48, app.rulers?.()) : '';
      if (img.getAttribute('src') !== src) img.src = src;
      ring.style.setProperty('--c', hex(factionColour(s, a.faction)));
      nameEl.textContent = generalName(a.commander);
      troopsEl.textContent = fmt(a.troops);
      const cap = a.commander ? troopCap(s, a.commander) : 10000;
      bar.firstChild.style.width = Math.round(Math.min(1, a.troops / Math.max(1, cap)) * 100) + '%';
      element.classList.toggle('mine', a.faction === app.state?.player);
      element.classList.toggle('chosen', chosen);
      element.classList.toggle('siege', Boolean(a.besieging));
      return element;
    }
  };
}
