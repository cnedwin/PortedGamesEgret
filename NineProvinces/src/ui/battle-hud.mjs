// Keep the live battle's native scroll, focus and pointer targets while refreshing
// vitals. This renderer is local to the formal battle, not a general UI framework.
import {h as element} from './dom.mjs';

const handlers = new WeakMap();

export function hudElement(spec, props = {}, ...children) {
  const node = element(spec, props, ...children);
  const events = new Map();
  if (props && typeof props === 'object' && !(props instanceof Node) && !Array.isArray(props)) {
    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith('on') && typeof value === 'function') events.set(key.slice(2), value);
    }
  }
  handlers.set(node, events);
  return node;
}

export function hudButton(label, onclick, {kind = '', why = null, title = null, small = false} = {}) {
  return hudElement(`button.btn${kind ? '.' + kind : ''}${small ? '.small' : ''}`, {
    type: 'button', disabled: Boolean(why), title: why ?? title ?? undefined,
    onclick: why ? undefined : onclick
  }, label);
}

function identity(node) {
  if (node.nodeType !== 1) return '#' + node.nodeType;
  return node.tagName + ':' + (node.dataset.k ? 'key:' + node.dataset.k : node.id ? 'id:' + node.id : node.classList[0] ?? '');
}

function updateEvents(current, next) {
  const before = handlers.get(current) ?? new Map();
  const after = handlers.get(next) ?? new Map();
  for (const [type, callback] of before) {
    if (after.get(type) !== callback) current.removeEventListener(type, callback);
  }
  for (const [type, callback] of after) {
    if (before.get(type) !== callback) current.addEventListener(type, callback);
  }
  handlers.set(current, after);
}

function patch(current, next) {
  if (current.nodeType !== 1) {
    if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
    return;
  }
  for (const attribute of [...current.attributes]) {
    if (!next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
  }
  for (const attribute of next.attributes) {
    if (current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name, attribute.value);
  }
  // checked/value are properties in dom.h, not necessarily reflected attributes.
  if (current.tagName === 'INPUT') {
    current.checked = next.checked;
    if (current.value !== next.value) current.value = next.value;
  }
  updateEvents(current, next);
  patchChildren(current, [...next.childNodes]);
}

function patchChildren(parent, children) {
  const available = new Map();
  for (const child of parent.childNodes) {
    const key = identity(child);
    if (!available.has(key)) available.set(key, []);
    available.get(key).push(child);
  }
  const pairs = children.map(next => {
    const matches = available.get(identity(next));
    return {next, current: matches?.shift()};
  });
  // Delete obsolete siblings first. Inserting a new cue above a focused button
  // must not move that button out of its native focus/pointer sequence.
  for (const unused of available.values()) for (const node of unused) node.remove();
  let cursor = parent.firstChild;
  for (const {next, current} of pairs) {
    const node = current ?? next;
    if (current) patch(current, next);
    if (node !== cursor) parent.insertBefore(node, cursor);
    cursor = node.nextSibling;
  }
}

/** Retain panels and keyed controls, including their native scroll/focus state. */
export function updateBattleHud(root, ...children) {
  const focused = root.contains(document.activeElement) ? document.activeElement : null;
  const key = focused?.dataset?.k;
  patchChildren(root, children.flat(Infinity).filter(child => child !== null && child !== undefined && child !== false));
  const available = node => node.isConnected && !node.disabled && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden';
  if (focused && (!available(focused) || document.activeElement !== focused)) {
    const controls = [...root.querySelectorAll('[data-k], button, [tabindex="0"]')].filter(available);
    const replacement = key ? controls.find(node => node.dataset.k === key) : null;
    const fallback = replacement ?? controls.find(node => node.dataset.k === 'cancel-tactic') ?? controls.find(node => node.dataset.k === 'execute') ?? controls[0];
    fallback?.focus({preventScroll: true});
  }
}
