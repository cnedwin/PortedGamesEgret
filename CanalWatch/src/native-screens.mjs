// Native Egret menu views. These describe presentation only; the controller owns all rules and saves.
import { getLanguage, t } from './i18n.mjs';

const INK = 0x142625, DEEP = 0x1c332d, JADE = 0x2d4a3d, GOLD = 0xe6c58d,
  PAPER = 0xffebbd, MUTED = 0xd7ceb2, COPPER = 0xb5916b, LACQUER = 0x853c2e;
const skin = { text: PAPER, panel: INK, panelAlpha: .96, button: DEEP, buttonText: PAPER,
  accent: GOLD, track: 0x576158, radius: 8, size: 21, dim: .67 };
const starsText = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const panel = (name, x, y, width, height, options = {}) => ({ type: 'panel', name, x, y, width, height, ...options });
const text = (name, value, x, y, width, height, options = {}) => ({ type: 'text', name, text: value, x, y, width, height, size: 20, ...options });
const button = (name, value, x, y, width, height, options = {}) => ({ type: 'button', name, text: value, x, y, width, height,
  size: 20, color: DEEP, textColor: PAPER, border: { color: COPPER, width: 1 }, ...options });
const rule = (name, x, y, width) => panel(name, x, y, width, 1, { color: COPPER, alpha: .68 });
const settingValues = source => typeof source === 'function' ? source() : source;
const zh = () => getLanguage() === 'zh';

// Single-line native text parts do not require an additional paragraph provider. Wrap at language-aware breakpoints;
// a conservative width estimate leaves room for proportional fonts and avoids broken Han punctuation.
function wrap(value, width, size) {
  const tokens = zh() ? String(value).match(/\d+(?:[.,]\d+)*|[A-Za-z]+|./gu) ?? [] : String(value).split(/\s+/u);
  const measure = line => [...line].reduce((units, ch) => units + (/\s/u.test(ch) ? .34 : /[A-Z0-9★☆]/u.test(ch) ? .70 : /^[\x20-\x7e]$/u.test(ch) ? .59 : 1.05), 0) * size;
  const lines = [];
  let row = '';
  for (const token of tokens) {
    const next = row && !zh() ? row + ' ' + token : row + token;
    if (row && measure(next) > width && !(zh() && /^[，。；：、！？）」】]/u.test(token))) {
      lines.push(row.trim());
      row = token.trimStart();
    } else row = next;
  }
  if (row) lines.push(row.trim());
  return lines;
}

function paragraph(items, name, value, x, y, width, size, options = {}) {
  const h = Math.ceil(size * 1.36);
  const lines = wrap(value, width - 6, size);
  for (const [index, line] of lines.entries()) items.push(text(`${name}-${index}`, line, x, y + index * h, width, h,
    { color: MUTED, size, ...options }));
  return y + lines.length * h;
}

function action(bind, name, callback) { bind[name] = { tap: callback }; }

function appendSettings(items, bind, y, width, settings, actions, unit, minHeight = 0) {
  items.push(rule('settings-rule', 0, y, width));
  items.push(text('settings-heading', t('settings'), 0, y + 6 * unit, width, 32 * unit,
    { bold: true, size: 20 * unit, color: GOLD }));
  y += 42 * unit;
  const columns = width >= 520 * unit ? 4 : 2, gap = 8 * unit;
  const height = Math.max(minHeight, 48 * unit), span = (width - (columns - 1) * gap) / columns;
  ['sound', 'music', 'reducedMotion', 'language'].forEach((key, index) => {
    const name = `setting-${key}`, x = (index % columns) * (span + gap), top = y + Math.floor(index / columns) * (height + gap);
    const value = () => key === 'language' ? t('language') : t('switchState', {
      name: t(key), state: t(settingValues(settings)[key] ? 'on' : 'off')
    });
    const size = Math.min((zh() ? 18 : key === 'reducedMotion' ? 14 : 17) * unit,
      (span - 10) / Math.max(3, [...value()].reduce((sum, ch) => sum + (/^[\x20-\x7e]$/u.test(ch) ? .65 : 1.1), 0)));
    items.push(button(name, value(), x, top, span, height, { size }));
    bind[name] = { text: value, tap: key === 'language' ? actions.language : () => actions.toggle(key) };
  });
  return y + Math.ceil(4 / columns) * (height + gap) - gap;
}

function frame(layout, label, items, { x, y, width, height, modal, viewport, contentHeight }) {
  const scroll = contentHeight > height + 1;
  const content = panel(viewport, x, y, width, height, { ...(scroll ? { scroll: 'vertical' } : {}), children: items });
  return { label, area: 'screen', modal, skin, root: panel('screen', 0, 0, layout.width, layout.height, { children: [content] }) };
}

/** Title artwork is a decorative backdrop supplied by the host. The only title controls are native UI parts. */
export function buildTitle({ layout, app, settings, actions }, density = 1) {
  const safe = layout.safe, portrait = layout.mode === 'portrait', wide = layout.mode === 'wide';
  const edge = Math.max(12, Math.min(safe.width * .045, 44));
  const width = Math.max(1, Math.min(safe.width - edge * 2, portrait ? 720 : Math.max(320, safe.width * (wide ? .60 : .54)), wide ? 760 : 660));
  const unit = Math.max(.68, Math.min(1.2, width / (portrait ? 360 : 450), wide ? 1.02 : 1.12) * density);
  const target = Math.max(48 * unit, portrait ? 63 : wide ? 78 : 44);
  const gap = 9 * unit, items = [], bind = {};
  let y = 0;
  items.push(panel('era-mark', 0, 13 * unit, 24 * unit, 2, { color: COPPER }));
  items.push(text('era', t('era'), 34 * unit, y, width - 34 * unit, 29 * unit, { bold: true, size: 17 * unit, color: GOLD }));
  y += 32 * unit;
  const titleSize = Math.min((zh() ? 72 : 58) * unit, width / (zh() ? 4.4 : 6.5));
  items.push(text('title', t('title'), 0, y, width, Math.ceil(titleSize * 1.22), { bold: true, size: titleSize, color: PAPER }));
  y += Math.ceil(titleSize * 1.22) + 3 * unit;
  y = paragraph(items, 'tagline', t('tagline'), 0, y, width, 18 * unit) + 11 * unit;
  if (app.notice) y = paragraph(items, 'notice', t(app.notice), 0, y, width, 15 * unit, { color: 0xf6b38c }) + 8 * unit;
  const choiceWidth = (width - gap) / 2, noteSize = 16 * unit;
  const notes = ['normal', 'hard'].map(d => wrap(t(`${d}Note`), choiceWidth - 12 * unit - 6, noteSize));
  const noteHeight = Math.ceil(noteSize * 1.36) * Math.max(...notes.map(a => a.length));
  const choiceH = target + noteHeight + 37 * unit;
  ['normal', 'hard'].forEach((difficulty, index) => {
    const x = index * (choiceWidth + gap), name = `start-${difficulty}`;
    const selected = difficulty === 'normal';
    items.push(panel(`${name}-card`, x, y, choiceWidth, choiceH, { card: true, color: selected ? 0x385043 : DEEP, alpha: .94,
      border: { color: selected ? GOLD : COPPER, width: selected ? 2 : 1 } }));
    items.push(button(name, t(difficulty), x + 3 * unit, y + 3 * unit, choiceWidth - 6 * unit, target,
      { color: selected ? LACQUER : JADE, size: 25 * unit }));
    action(bind, name, () => actions.start(difficulty, 'standard'));
    // The original card is clickable throughout. Its lower decorative area remains pointer-only, so keyboard
    // and assistive-technology navigation still encounters one actionable difficulty control.
    bind[`${name}-card`] = { pointerOnly: true, tap: () => actions.start(difficulty, 'standard') };
    paragraph(items, `${name}-note`, t(`${difficulty}Note`), x + 6 * unit, y + target + 6 * unit, choiceWidth - 12 * unit, noteSize,
      { align: 'center' });
    const best = app.save.data.best[difficulty];
    items.push(text(`${name}-best`, best ? t('bestStars', { stars: starsText(best) }) : t('noBest'), x + 4 * unit,
      y + choiceH - 25 * unit, choiceWidth - 8 * unit, 24 * unit, { align: 'center', color: GOLD, size: 15 * unit }));
  });
  y += choiceH + 9 * unit;
  items.push(button('intercept', t('intercept'), 0, y, width, target, { size: 23 * unit, color: JADE }));
  action(bind, 'intercept', () => actions.start('normal', 'intercept'));
  y = paragraph(items, 'intercept-note', t('interceptNote'), 5 * unit, y + target + 2 * unit, width - 10 * unit, 16 * unit) + 7 * unit;
  items.push(button('help', t('howTitle'), 0, y, width, target, { size: 18 * unit }));
  action(bind, 'help', actions.help);
  y = appendSettings(items, bind, y + target + 10 * unit, width, settings, actions, unit, portrait ? 63 : wide ? 78 : 44);
  const maxHeight = Math.max(1, safe.height - edge * 2);
  // A desktop title should not scroll merely to reveal a language or settings button. Compact its vertical rhythm
  // within the available safe height first; a genuinely short viewport still gets the native scroll fallback.
  if (!portrait && y + 4 * unit > maxHeight && unit > .70 && density > .65)
    return buildTitle({ layout, app, settings, actions }, density * Math.max(.78, Math.min(.97, maxHeight / (y + 4 * unit))));
  // On tall portrait screens let the illustration breathe above the controls; on compact screens scroll the title.
  const height = Math.min(y + 4 * unit, maxHeight), top = portrait ? safe.y + safe.height - edge - height : safe.y + (safe.height - height) / 2;
  const x = portrait ? safe.x + (safe.width - width) / 2 : safe.x + edge;
  return { description: frame(layout, t('title'), items, { x, y: top, width, height, modal: false, viewport: 'title-scroll', contentHeight: y }), bind };
}

function modalFrame(layout, label, items, bind, y, width, initialFocus, footer = undefined) {
  const safe = layout.safe, margin = Math.max(8, Math.min(24, safe.width * .04)), inset = 19;
  const footerHeight = footer ? footer.height + 12 : 0;
  const paneWidth = width + inset * 2, paneHeight = Math.min(y + inset * 2 + footerHeight, safe.height - margin * 2);
  const x = safe.x + (safe.width - paneWidth) / 2, top = safe.y + (safe.height - paneHeight) / 2;
  const contentHeight = Math.max(1, paneHeight - inset * 2 - footerHeight);
  const content = panel('modal-scroll', inset, inset, width, contentHeight,
    { ...(y > contentHeight ? { scroll: 'vertical' } : {}), children: items });
  const outer = panel('sheet', x, top, paneWidth, paneHeight,
    { card: true, color: INK, border: { color: COPPER, width: 2 }, children: [content,
      ...(footer ? [button(footer.name, footer.label, inset, paneHeight - inset - footer.height, width, footer.height,
        { color: LACQUER, size: footer.size })] : [])] });
  return { description: { label, area: 'screen', modal: true, skin,
    root: panel('screen', 0, 0, layout.width, layout.height, { children: [outer] }) }, bind, initialFocus };
}

function modalMetrics(layout) {
  const width = Math.max(1, Math.min(620, layout.safe.width - Math.max(16, Math.min(48, layout.safe.width * .08)) - 38));
  const unit = Math.max(.85, Math.min(1.14, width / 345));
  return { width, unit };
}

function modalButtons(items, bind, buttons, y, width, unit) {
  const gap = 8 * unit, height = 50 * unit;
  const columns = width >= 470 * unit ? buttons.length : Math.min(2, buttons.length);
  const span = (width - (columns - 1) * gap) / columns;
  buttons.forEach(([name, label, callback], index) => {
    items.push(button(name, label, (index % columns) * (span + gap), y + Math.floor(index / columns) * (height + gap), span, height,
      { color: index === 0 ? LACQUER : DEEP, size: (zh() ? 20 : label.length > 16 ? 15 : 18) * unit }));
    action(bind, name, callback);
  });
  return y + Math.ceil(buttons.length / columns) * (height + gap) - gap;
}

export function buildMenu({ layout, settings, actions }) {
  const { width, unit } = modalMetrics(layout), items = [], bind = {};
  items.push(text('menu-title', t('paused'), 0, 0, width, 48 * unit, { color: GOLD, bold: true, size: 32 * unit }));
  let y = modalButtons(items, bind, [['resume', t('resume'), actions.resume], ['restart', t('restart'), actions.restart],
    ['quit', t('quit'), actions.quit]], 60 * unit, width, unit);
  y = appendSettings(items, bind, y + 18 * unit, width, settings, actions, unit);
  return modalFrame(layout, t('paused'), items, bind, y, width, 'resume');
}

export function buildHelp({ layout, actions }) {
  const { width, unit } = modalMetrics(layout), items = [], bind = {};
  items.push(text('help-title', t('howTitle'), 0, 0, width, 48 * unit, { color: GOLD, bold: true, size: 32 * unit }));
  let y = 54 * unit;
  const points = ['how1', 'how2', 'how3'];
  for (const [index, key] of points.entries()) {
    items.push(text(`help-number-${index}`, String(index + 1).padStart(2, '0'), 0, y, 34 * unit, 28 * unit,
      { bold: true, size: 18 * unit, color: GOLD }));
    y = paragraph(items, key, t(key), 38 * unit, y, width - 38 * unit, 20 * unit) + 13 * unit;
  }
  items.push(rule('help-rule', 0, y, width));
  y = paragraph(items, 'keys', t('keysLine'), 0, y + 13 * unit, width, 17 * unit) + 16 * unit;
  action(bind, 'close-help', actions.closeHelp);
  // Keep dismissal visible without revealing the bottom of the instructional scroll viewport on open.
  return modalFrame(layout, t('howTitle'), items, bind, y, width, 'close-help',
    { name: 'close-help', label: t('close'), height: 50 * unit, size: 20 * unit });
}

export function buildEnd({ layout, app, actions }) {
  const { width, unit } = modalMetrics(layout), items = [], bind = {}, r = app.result;
  const title = t(r.intercept ? (r.won ? 'interceptWon' : 'interceptLost') : r.won ? 'won' : 'lost');
  const note = t(r.won ? (r.intercept ? 'interceptWonNote' : 'wonNote') : 'lostNote', r);
  let y = paragraph(items, 'result-title', title, 0, 0, width, 33 * unit, { color: r.won ? GOLD : 0xe8a38f, bold: true });
  y = paragraph(items, 'result-note', note, 0, y + 8 * unit, width, 20 * unit) + 12 * unit;
  if (r.intercept) {
    const rows = [['interceptedUpper', r.intercept.held[0]], ['interceptedLower', r.intercept.held[1]],
      ['crewLanded', r.intercept.landed], ['crewStopped', r.intercept.crewStopped], ['crewLeaked', r.intercept.crewLeaked]];
    const cols = width >= 510 * unit ? 2 : 1, gap = 6 * unit, span = (width - (cols - 1) * gap) / cols, h = 44 * unit;
    rows.forEach(([key, value], index) => {
      const x = index % cols * (span + gap), top = y + Math.floor(index / cols) * (h + gap), rowSpan = index === 4 ? width : span;
      items.push(panel(`${key}-card`, x, top, rowSpan, h, { color: DEEP, border: { color: 0x587369, width: 1 } }));
      items.push(text(key, t(key), x + 8 * unit, top, rowSpan - 76 * unit, h, { size: (zh() ? 18 : cols === 2 ? 14 : 17) * unit }));
      items.push(text(`${key}-value`, String(value), x + rowSpan - 66 * unit, top, 58 * unit, h, { size: 22 * unit, color: GOLD, bold: true, align: 'right' }));
    });
    y += Math.ceil(rows.length / cols) * (h + gap) + 3 * unit;
  } else {
    if (r.won) {
      items.push(text('stars', starsText(r.stars), 0, y, width, 47 * unit, { color: GOLD, bold: true, align: 'center', size: 40 * unit }));
      y += 54 * unit;
    }
    if (r.best) y = paragraph(items, 'new-best', t('newBest'), 0, y, width, 21 * unit, { bold: true, color: GOLD }) + 5 * unit;
    y = paragraph(items, 'kills', t('kills', { n: r.kills }), 0, y, width, 19 * unit) + 7 * unit;
  }
  if (!r.kept) y = paragraph(items, 'save-refused', t('saveRefused'), 0, y, width, 17 * unit, { color: 0xf6b38c }) + 8 * unit;
  items.push(rule('result-rule', 0, y, width));
  y = modalButtons(items, bind, [['again', t('again'), actions.again], ['quit', t('quit'), actions.quit]], y + 15 * unit, width, unit);
  return modalFrame(layout, title, items, bind, y, width, 'again');
}
