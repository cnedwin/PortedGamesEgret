// 网页元素的小工具：造元素、清空、按钮、进度条、印章、武将小像。界面的每一处都由这些拼出来。
// Small tools for page elements: making an element, emptying one, buttons, bars, seals, a general's small portrait.
// Every part of the interface is put together from these.
import { GENERALS } from '../data/generals.mjs';
import { portrait } from '../view/portrait.mjs';
import { nm } from '../i18n.mjs';

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

/** An element: `h('div.card#x', { onclick, title, style }, ...children)`. Strings become text. */
export function h(spec, props = {}, ...children) {
  if (props === null || typeof props !== 'object' || props instanceof Node || Array.isArray(props)) {
    children.unshift(props);
    props = {};
  }
  const [, tag = 'div', rest = ''] = /^([a-z0-9]*)(.*)$/i.exec(spec);
  const node = document.createElement(tag || 'div');
  for (const part of rest.match(/[.#][^.#]+/g) ?? []) {
    if (part[0] === '.') node.classList.add(part.slice(1));
    else node.id = part.slice(1);
  }
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? node.style.setProperty(sk, sv) : (node.style[sk] = sv);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k in node && k !== 'list' && k !== 'type') node[k] = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  append(node, children);
  return node;
}
function append(node, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : String(c));
  }
}

export const clear = (node) => {
  node.replaceChildren();
  return node;
};

/** A button. `why` disables it and says why in its title. */
export function button(label, onclick, { kind = '', why = null, title = null, small = false } = {}) {
  return h(`button.btn${kind ? '.' + kind : ''}${small ? '.small' : ''}`, { type: 'button', disabled: Boolean(why), title: why ?? title ?? undefined, onclick: why ? undefined : onclick }, label);
}

/** A thin bar of a share 0..1, coloured by kind. */
export function bar(share, kind = '', label = null) {
  const v = Math.max(0, Math.min(1, share));
  return h(`span.bar${kind ? '.' + kind : ''}`, { role: 'meter', 'aria-valuenow': Math.round(v * 100), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': label ?? undefined }, h('i', { style: { width: (v * 100).toFixed(1) + '%' } }));
}

const hex = (c) => '#' + c.toString(16).padStart(6, '0');
/** A seal: a power's flag character in a square of its colour. */
export function seal(f, size = 'm') {
  return h(`span.seal.${size}`, { style: { '--c': hex(f?.colour ?? 0x8a7d66) }, 'aria-hidden': 'true' }, f?.flag ?? '—');
}
export const colourOf = (f) => hex(f?.colour ?? 0x8a7d66);

/** A general's portrait as an image. */
export function face(id, size = 48, rulers = null) {
  const g = GENERALS[id];
  return h('img.face', { src: portrait(id, size, rulers), width: size, height: Math.round(size * 1.25), alt: g ? nm(g) : '', loading: 'lazy', draggable: false });
}

/** A labelled value: small label above, value below. */
export const stat = (label, value, extra = null) => h('div.stat', h('span.k', label), h('span.v', value), extra);

/** A row of tabs; `on(id)` when one is chosen. */
export function tabs(list, current, on) {
  return h(
    'div.tabs',
    { role: 'tablist' },
    list.map(([id, label]) => h('button.tab', { type: 'button', role: 'tab', 'aria-selected': id === current ? 'true' : 'false', onclick: () => on(id) }, label))
  );
}

/** A choice of a few values, as joined buttons. */
export function choice(list, current, on, { why = {} } = {}) {
  return h(
    'div.choice',
    { role: 'radiogroup' },
    list.map(([id, label]) => h('button', { type: 'button', role: 'radio', 'aria-checked': id === current ? 'true' : 'false', disabled: Boolean(why[id]), title: why[id] ?? undefined, onclick: () => on(id) }, label))
  );
}
