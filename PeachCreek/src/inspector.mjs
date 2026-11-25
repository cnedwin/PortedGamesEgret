import { Bitmap } from '@egret/engine';
import { createScrollControl } from '@egret/engine/ui';
import { getLanguage, t } from './i18n.mjs';

const INK = 0x293b38;
const JADE = 0x345d4d;
const SOFT = 0x586e65;
const RED = 0x9c493b;
const PAPER = 0xfcf7eb;
const LINE = 0xdbceb5;
const SCALE = 0.75;

const measure = document.createElement('canvas').getContext('2d');
const breaks = new Map();

/** Canvas text metrics keep English words together and allow breaks between Chinese words. */
export function wrapText(value, width, size, bold = false) {
  const words = String(value ?? '');
  if (!words || !measure) return [words];
  const language = getLanguage();
  if (!breaks.has(language)) breaks.set(language, new Intl.Segmenter(language, { granularity: 'word' }));
  measure.font = (bold ? '700 ' : '') + size + 'px sans-serif';
  return words.split('\n').flatMap((paragraph) => {
    const lines = [];
    let current = '';
    for (const { segment } of breaks.get(language).segment(paragraph)) {
      if (current && measure.measureText(current + segment).width > width) {
        lines.push(current.trimEnd());
        current = segment.trimStart();
      } else current += segment;
    }
    lines.push(current.trimEnd());
    return lines;
  });
}

/** Localized county content and its rule callbacks are independent of the layout. */
export function part(type, props = {}, ...children) {
  return { type, ...props, children: children.filter((value) => value != null && value !== false) };
}

const paper = { radius: 7, border: LINE };
const child = (type, x, y, w, h, options = {}) => ({ type, x, y, w, h, ...options });
const background = (x, y, w, h, color, options = {}) => child('panel', x, y, w, h, { color, card: paper, ...options });

function parchment(node, { w, h }) {
  const inset = 5 * SCALE;
  node.graphics.clear().lineStyle(SCALE, 0xa78c60)
    .beginFill(PAPER).drawRoundRect(0, 0, w, h, 14 * SCALE).endFill()
    .lineStyle(SCALE, 0xc8b189).drawRoundRect(inset, inset, w - inset * 2, h - inset * 2, 6 * SCALE);
}

function wordsOf(entry) {
  return String(entry.text ?? entry.children.map(wordsOf).join(' '));
}

function layout(parts, width, compact, imageFor, allowPointer) {
  const items = [];
  let actionIndex = 0, artIndex = 0, textIndex = 0;
  const font = compact ? 18 : 15;
  function text(value, x, y, w, { size = font, color = INK, bold = false, align = 'left', name = 'sheet-text-' + ++textIndex, role, semantic = true } = {}) {
    const lines = wrapText(value, w - 4, size, bold), h = Math.ceil(size * 1.38);
    lines.forEach((line, i) => items.push(child('text', x, y + h * i, w, h, {
      ...(i === 0 && semantic ? { name, role, label: String(value) } : {}),
      text: line, color, size, bold, align
    })));
    return h * lines.length;
  }
  function action(entry, x, y, w) {
    const { appearance = '', name = 'sheet-action-' + ++actionIndex, disabled, pressed } = entry;
    const style = appearance.includes('primary')
      ? { color: RED, textColor: 0xfff8ef }
      : appearance.includes('jade') || pressed ? { color: 0xe3ecdf, textColor: JADE } : { color: 0xfffdf5, textColor: INK };
    const contentWidth = w - 20;
    const first = entry.children[0];
    const heading = first ? wordsOf(first) : wordsOf(entry);
    const notes = entry.children.slice(1).map((line) => ({ text: wordsOf(line), color: line.appearance === 'planScore' ? JADE : style.textColor }))
      .filter(({ text }) => text);
    const position = items.length;
    const linesH = text(heading, x + 10, y + 6, contentWidth, { color: style.textColor, bold: true, size: compact ? 18 : 16, semantic: false });
    let contentH = linesH;
    for (const note of notes) contentH += text(note.text, x + 10, y + 7 + contentH, contentWidth, { color: note.color, size: compact ? 15 : 12, semantic: false });
    const h = Math.max(compact ? 62 : 46, contentH + 15);
    if (disabled) for (const item of items.slice(position)) item.alpha = 0.58;
    items.splice(position, 0, child('button', x, y, w, h, {
      name, text: '', label: [heading, ...notes.map((note) => note.text)].join(' · '), ...style, disabled, selected: pressed,
      card: paper, action: (event) => { if (allowPointer(event)) entry.action?.(); },
      onDisabledTap: entry.onDisabledTap ? (event) => { if (allowPointer(event)) entry.onDisabledTap(); } : undefined
    }));
    return h;
  }
  function flow(entries, x, y, w, gap = 6) {
    let next = y;
    for (const entry of entries) next += render(entry, x, next, w) + gap;
    return entries.length ? next - y - gap : 0;
  }
  function section(entry, x, y, w, inset, color) {
    const index = items.length;
    const height = flow(entry.children, x + inset, y + inset, w - inset * 2) + inset * 2;
    items.splice(index, 0, background(x, y, w, height, color));
    return height;
  }
  function columns(entries, x, y, w, count = 2) {
    const colW = (w - (count - 1) * 7) / count;
    let next = y;
    for (let i = 0; i < entries.length; i += count) {
      const row = entries.slice(i, i + count).map((entry, j) => render(entry, x + j * (colW + 7), next, colW));
      next += Math.max(...row) + 7;
    }
    return entries.length ? next - y - 7 : 0;
  }
  function render(entry, x, y, w) {
    const { type, appearance, children } = entry;
    const value = entry.text === undefined ? '' : entry.text;
    if (type === 'action') return action(entry, x, y, w);
    if (type === 'heading') {
      const h = text(value, x, y, Math.max(w - 74, 120), { size: 24, bold: true, name: 'sheet-heading', role: 'heading' });
      items.push(child('panel', x, y + h + 4, 35, 2, { color: RED }));
      return h + 11;
    }
    if (type === 'subheading') return 5 + text(value, x, y + 5, w, { color: JADE, size: 17, bold: true, role: 'heading' });
    if (type === 'paragraph' || type === 'label' || type === 'strong' || type === 'note' || (type === 'group' && entry.text !== undefined)) {
      if (!value) return 0;
      return text(value, x, y, w, {
        color: appearance === 'planScore' ? JADE : appearance === 'petitionSeason' ? RED : ['muted', 'stats'].includes(appearance) ? SOFT : INK,
        size: type === 'note' || appearance === 'stats' ? 13 : font,
        bold: type === 'strong' || appearance === 'planScore'
      });
    }
    if (appearance === 'architecture') {
      const cardW = (w - 7 * (children.length - 1)) / children.length;
      const pictureH = Math.min(142, cardW * 190 / 320);
      children.forEach((figure, index) => {
        const left = x + (cardW + 7) * index;
        const [picture, caption] = figure.children;
        const name = 'sheet-art-' + artIndex++;
        items.push(background(left, y + 2, cardW, pictureH + 25, 0xe7ecdd, { name, decorate: imageFor(picture.image, pictureH) }),
          background(left + 1, y + pictureH + 2, cardW - 2, 23, 0xf8f1df));
        text(wordsOf(caption), left + 3, y + pictureH + 3, cardW - 6, { size: 13, align: 'center', color: SOFT });
      });
      return pictureH + 29;
    }
    if (appearance === 'choices' || (appearance === 'row' && children.length > 1)) return columns(children, x, y, w);
    if (appearance === 'petition') return section(entry, x, y, w, 12, 0xf5e7cb);
    if (appearance === 'defenceSide') return section(entry, x, y, w, 9, 0xfffaf1);
    if (appearance === 'talent') {
      const [portrait, detail] = children;
      const colors = { 'r-clerk': 0x697d7b, 'r-able': 0x557f65, 'r-worthy': 0x56738b, 'r-hero': 0xa15839 };
      const index = items.length;
      const h = Math.max(56, flow(detail.children, x + 56, y + 7, w - 63, 1) + 14);
      items.splice(index, 0, background(x, y, w, h, 0xedf0e8));
      items.push(background(x + 7, y + (h - 42) / 2, 42, 42, colors[portrait.appearance.split(' ')[1]], { card: { radius: 21 } }));
      text(wordsOf(portrait), x + 7, y + h / 2 - 15, 42, { size: 23, color: 0xffffff, bold: true, align: 'center' });
      return h;
    }
    if (appearance === 'needs') {
      return children.reduce((used, row) => {
        const [name, meter, counts] = row.children;
        const y0 = y + used;
        text(wordsOf(name), x, y0, 84, { size: 14 });
        text(wordsOf(counts), x + w - 93, y0, 93, { size: 14, align: 'right' });
        items.push(child('bar', x + 89, y0 + 7, w - 187, 8, { color: row.appearance === 'met' ? 0x527a68 : 0x9d7438, value: meter.value }));
        return used + 24;
      }, 0);
    }
    if (appearance === 'almanacSeason') return section(entry, x, y, w, 9, 0xe9ead5);
    if (type === 'entry') {
      if (children.length === 1 && children[0].type === 'action') return render(children[0], x, y, w);
      const index = items.length;
      const trailing = children.at(-1);
      let h;
      if (children.length > 1 && trailing.type === 'action') {
        const actionW = w * 0.53;
        h = Math.max(flow(children.slice(0, -1), x + 7, y + 8, w - actionW - 22), action(trailing, x + w - actionW - 7, y + 5, actionW));
      } else if (children.length === 2 && !children[0].action) {
        h = Math.max(text(wordsOf(children[0]), x + 7, y + 6, w * .65 - 10),
          text(wordsOf(trailing), x + w * .65, y + 6, w * .35 - 7, { align: 'right', color: SOFT }));
      } else h = flow(children, x + 7, y + 6, w - 14);
      items.splice(index, 0, background(x, y, w, h + 12, 0xe9ebdf));
      return h + 12;
    }
    return flow(children, x, y, w, appearance === 'row' ? 7 : 5);
  }
  const height = flow(parts.filter(Boolean), 0, 0, width);
  return { height, items };
}

/** A native scroll model, a clipped Egret view and bounded preview textures share one inspector. */
export function createInspector(game, ui, { close, compact, allowPointer }) {
  let model = null, geometry, painting = false;
  const previews = new Map();
  const bitmaps = new WeakMap();
  const scroll = createScrollControl({
    viewportLength: 1, contentLength: 0, onScroll: () => { if (!painting) render(); }
  });

  function imageFor(image, pictureH) {
    let entry = previews.get(image);
    if (!entry) {
      entry = { lease: null, pending: null, active: true };
      previews.set(image, entry);
      if (previews.size > 36) {
        const first = previews.keys().next().value;
        const removed = previews.get(first);
        removed.active = false;
        removed.lease?.release();
        previews.delete(first);
      }
    } else {
      previews.delete(image);
      previews.set(image, entry);
    }
    // Only visible art enters the GPU cache. The same preview is reused on clock refreshes.
    return (node, { w }) => {
      const fit = Math.min(w / image.width, pictureH * SCALE / image.height);
      const attach = (lease) => {
        if (!entry.active || node.isDisposed || bitmaps.get(node)?.image !== image) return;
        const existing = bitmaps.get(node);
        const bitmap = existing.bitmap ?? new Bitmap(lease);
        if (!existing.bitmap) {
          existing.bitmap = bitmap;
          node.addChild(bitmap);
        }
        bitmap.width = image.width * fit;
        bitmap.height = image.height * fit;
        bitmap.x = (w - bitmap.width) / 2;
      };
      const previous = bitmaps.get(node);
      if (previous?.image !== image) {
        previous?.bitmap?.dispose();
        bitmaps.set(node, { image });
      }
      if (entry.lease) return attach(entry.lease);
      entry.pending ??= game.browser.textureFromCanvas(image).then((lease) => {
        if (!entry.active) lease.release();
        else entry.lease = lease;
        return lease;
      }).catch((error) => { console.warn('County preview could not be displayed.', error); });
      void entry.pending.then((lease) => { if (lease) attach(lease); });
    };
  }
  function setContent(parts) {
    const small = compact();
    const x = small ? 772 : 852, y = small ? 120 : 113, w = small ? 490 : 410, h = small ? 506 : 521;
    geometry = { x, y, w, h, inset: 18, height: h - 32, closeHeight: small ? 62 : 38 };
    model = layout(parts, w - 39, small, imageFor, allowPointer);
    painting = true;
    scroll.setLengths(geometry.height, model.height + 4);
    painting = false;
    render();
  }
  function render() {
    if (!model) return;
    const { x, y, w, h, inset, height, closeHeight } = geometry;
    const content = model.items.filter((item) => item.y + item.h > scroll.offset && item.y < height + scroll.offset)
      .map((item) => ({ ...item, parent: 'sheet-content', y: item.y - scroll.offset }));
    const items = [
      background(x, y, w, h, PAPER, { name: 'sheet', intercept: true, decorate: parchment, role: 'dialog' }),
      child('panel', x + inset, y + 14, w - 36, height, { name: 'sheet-content', clip: true }),
      ...content,
      child('button', x + w - (closeHeight + 42), y + 13, closeHeight + 29, closeHeight, {
        name: 'sheetClose', text: t('close'), size: 16, color: PAPER, textColor: INK, card: paper,
        action: close
      })
    ];
    if (scroll.maximum > 0) {
      const barHeight = Math.max(22, height * height / (height + scroll.maximum));
      items.push(background(x + w - 10, y + 14 + (height - barHeight) * scroll.offset / scroll.maximum, 4, barHeight, 0xb6bcaa,
        { card: { radius: 2 } }));
    }
    ui.show('inspector', { label: model.items.find((item) => item.name === 'sheet-heading')?.label, items });
  }
  function reveal(name) {
    const item = model?.items.find((entry) => entry.name === name);
    if (!item) return false;
    if (item.y < scroll.offset || item.y + item.h > scroll.offset + geometry.height) {
      scroll.scrollTo(Math.max(0, item.y - 35));
    }
    return ui.focus(name);
  }
  return {
    setContent,
    reveal,
    get offset() { return scroll.offset; },
    reset() {
      model = null;
      scroll.toStart();
    },
    hide() {
      model = null;
      ui.hide('inspector');
    },
    scrollBy(distance) { return scroll.scrollBy(distance); },
    focusFirst() {
      const first = model?.items.find((item) => item.type === 'button' && item.y < geometry.height && !item.disabled);
      ui.focus(first?.name ?? 'sheetClose');
    },
    advanceFocus(event) {
      if (!model || !ui.focused) return false;
      const available = model.items.filter((item) => item.type === 'button' && !item.disabled);
      const index = available.findIndex((item) => item.name === ui.focused);
      const next = index >= 0 ? available[index + (event.shiftKey ? -1 : 1)] : null;
      if (!next || (next.y >= scroll.offset && next.y + next.h <= scroll.offset + geometry.height)) return false;
      reveal(next.name);
      return true;
    },
    dispose() {
      scroll.dispose();
      for (const entry of previews.values()) {
        entry.active = false;
        entry.lease?.release();
      }
      previews.clear();
    }
  };
}
