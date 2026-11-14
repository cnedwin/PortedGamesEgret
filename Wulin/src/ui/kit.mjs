// The small pieces every screen is made of: icons, buttons, tags, panel
// headings and meters, as markup. Their look comes from the style sheets in
// art-handoff/ui.

const GLYPHS = {
  gate: '<path d="M3 10h18L12 3 3 10Zm3 0v10m12-10v10M3 20h18m-12 0v-5h6v5M9 7h6"/>',
  people: '<circle cx="12" cy="7" r="3"/><path d="M6 20v-2a6 6 0 0 1 12 0v2M5 12a3 3 0 0 0-2 3v3m16-6a3 3 0 0 1 2 3v3"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
  swords: '<path d="m3 3 6 1 11 11-4 4L5 8 3 3Zm12 15 3-3m-3 7 7-7M21 3l-6 1-3 3m-5 5-4 4 4 4 4-4M2 15l7 7"/>',
  scroll: '<path d="M6 3h12v16a2 2 0 0 0 2 2H7a3 3 0 0 1-3-3v-3h12v4a2 2 0 0 0 4 0V6a3 3 0 0 0-3-3M8 7h8m-8 4h8"/>',
  box: '<path d="M4 5h16v14H4zM4 9h16m-11 0V5m6 0v4m-5 5h4"/>',
  settings: '<path d="m12 3 2 2 3 .1 1 2.9 2 2v4l-2 2-1 2.9-3 .1-2 2-2-2-3-.1L6 16l-2-2v-4l2-2 1-2.9 3-.1z"/><circle cx="12" cy="12" r="3"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M10 10h4v4h-4z"/>',
  grain: '<path d="M12 21V4m0 4a5 5 0 0 1 5-4c0 3-2 5-5 5m0 4a6 6 0 0 1-6-5c3 0 6 1 6 5m0 4a5 5 0 0 1 5-4c0 3-2 5-5 5"/>',
  banner: '<path d="M5 21V3m0 2h14l-3 4 3 4H5"/>',
  balance: '<path d="M12 4v16M5 20h14M4 8h16M6 8l-3 6h6L6 8Zm12 0-3 6h6l-3-6Z"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6 6-6-6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  frame: '<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/>',
  pause: '<path d="M9 5v14m6-14v14"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 3v3m0 12v3m-9-9h3m12 0h3"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 4 9 5 9-5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
};

/** Makes text safe to place in markup; names can be typed by the player. */
export const esc = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const icon = (name, css = '') =>
  `<svg class="icon ${css}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLYPHS[name] ?? ''}</svg>`;

/** Extra `data-` attributes for a control, from an object. */
const dataOf = (data) => Object.entries(data).map(([key, value]) => ` data-${key}="${esc(value)}"`).join('');

/**
 * A button that asks for an action. `data` travels with the click.
 * @param kind  'primary', 'outline', 'ghost', 'on-dark', 'danger' or 'gold-button'
 */
export const btn = (label, act, data = {}, kind = 'outline', glyph = '', disabled = false) =>
  `<button type="button" class="button ${kind}" data-act="${act}"${dataOf(data)}${disabled ? ' disabled' : ''}>${glyph ? icon(glyph) : ''}${esc(label)}</button>`;

/** A small toggle among several. */
export const pill = (label, act, data, active) =>
  `<button type="button" class="pill ${active ? 'is-active' : ''}" data-act="${act}"${dataOf(data)} aria-pressed="${!!active}">${esc(label)}</button>`;

export const tag = (label, css = 'plain') => `<span class="tag ${css}">${esc(label)}</span>`;

export const meter = (share, css = '', title = '进度') => {
  const value = Math.max(0, Math.min(100, Math.round(share)));
  return `<span class="meter ${css}" role="meter" aria-label="${esc(title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><i style="width:${value}%"></i></span>`;
};

export const panelTitle = (title, extra = '') => `<div class="panel-title"><h2>${esc(title)}</h2>${extra}</div>`;

export const screenHead = (trail, title, about, actions = '') =>
  `<header class="screen-head"><div><h1>${esc(title)}</h1><p>${esc(about)}</p></div><div class="screen-actions">${actions}</div></header>`;

const NUMBER = new Intl.NumberFormat('zh-CN');
export const num = (value) => NUMBER.format(Math.round(value));

export const resource = (glyph, label, value, unit = '') =>
  `<div class="resource">${icon(glyph)}<div><span>${label}</span><b>${num(value)}${unit ? `<small>${unit}</small>` : ''}</b></div></div>`;

/** A row of a facts list. `value` is markup. */
export const fact = (label, value) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`;

/** A labelled field of a form. `control` is markup. */
export const formRow = (label, control) => `<label class="form-row"><span>${esc(label)}</span>${control}</label>`;

/**
 * Puts a screen on the page. A screen marks the parts that change with
 * `data-region`; when the same screen is drawn again only the regions whose
 * markup differs are replaced, so everything else on the page (the 3D canvas,
 * a list the player has open, the scroll position) is left alone.
 * @param key  names the screen; a different key replaces the whole page
 * @returns true when the whole page was replaced
 */
export function mount(root, html, key) {
  if (root.dataset.key === key) {
    const fresh = document.createElement('template');
    fresh.innerHTML = html;
    const next = [...fresh.content.querySelectorAll('[data-region]')],
      now = [...root.querySelectorAll('[data-region]')];
    if (next.length === now.length && next.every((part, i) => part.dataset.region === now[i].dataset.region)) {
      next.forEach((part, i) => {
        if (now[i].innerHTML !== part.innerHTML) now[i].innerHTML = part.innerHTML;
      });
      return false;
    }
  }
  root.innerHTML = html;
  root.dataset.key = key;
  return true;
}
