// 量字、折行和缩字。引擎的数据界面里一个文字部件是一行或几行（\n 分行），不会自己按宽度折行，也不会缩小放不下的
// 字（见 ENGINE-NOTES.md）。这里按引擎画字时同样的字体量：引擎向画布要的是带引号的 "sans-serif"，那是一个叫这个名字的
// 字体，不是通用的无衬线字体族，量出来的宽度也不同（ENGINE-NOTES 22），所以这里也写带引号的名字。中文按字断，英文按
// 词断。
//
// Measuring, wrapping and shrinking words. A text part of the engine's views is one line, or several split by \n; it is
// neither wrapped to its width nor shrunk when its words do not fit (see ENGINE-NOTES.md). Words are measured here in
// the font the engine draws with: it asks the canvas for "sans-serif" in quotes, a family of that name rather than the
// generic sans-serif family, which measures differently (ENGINE-NOTES 22), so the name is quoted here too. Chinese
// breaks between characters, English between words.

let context = null;
function measurer() {
  if (context) return context;
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(8, 8) : document.createElement('canvas');
  context = canvas.getContext('2d');
  return context;
}
const fontOf = (size, bold) => `normal ${bold ? 700 : 400} ${size}px "sans-serif"`;

/** How wide the widest line of `text` is at `size` units. */
export function widthOf(text, size, { bold = false } = {}) {
  const measure = measurer();
  measure.font = fontOf(size, bold);
  return Math.max(0, ...String(text).split('\n').map((line) => measure.measureText(line).width));
}

/** The pieces a line may break between: each CJK character, and each word with its following space. */
const pieces = (text) => text.match(/[\u3000-\u9fff\uff00-\uffef][\uff0c\u3002\u3001\uff1b\uff1a\uff01\uff1f\u300d\u300f\uff09]?|[^\s\u3000-\u9fff\uff00-\uffef]+\s*|\s+/gu) ?? [];

/** `text` broken into lines no wider than `width` at `size` units; a `\n` in it always breaks. */
export function wrapLines(text, width, size, { bold = false } = {}) {
  const measure = measurer();
  measure.font = fontOf(size, bold);
  const lines = [];
  for (const paragraph of String(text).split('\n')) {
    let line = '';
    for (const piece of pieces(paragraph)) {
      const next = line + piece;
      if (line && measure.measureText(next.trimEnd()).width > width) {
        lines.push(line.trimEnd());
        line = piece.trimStart();
      } else line = next;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

/** A text part holding `text` wrapped to `width`, as tall as its lines. A little room is kept for rounding. */
export function wrapped(name, text, width, { size = 16, lineHeight = 1.45, ...more } = {}) {
  const lines = wrapLines(text, width - 4, size, more);
  return { type: 'text', name, text: lines.join('\n'), size, width, height: Math.ceil(lines.length * size * lineHeight), ...more };
}

/**
 * The largest size from `size` down to `min` at which every one of `texts` fits `width`, each wrapped into at most
 * `lines` lines.
 */
export function fitSize(texts, width, size, { min = 11, lines = 1, bold = false } = {}) {
  for (let at = size; at > min; at--) {
    if (texts.every((words) => {
      const broken = lines > 1 ? wrapLines(words, width, at, { bold }) : String(words).split('\n');
      return broken.length <= Math.max(lines, String(words).split('\n').length) && widthOf(broken.join('\n'), at, { bold }) <= width;
    })) return at;
  }
  return min;
}

/**
 * The largest size from `size` down to `min` at which each of `texts`, broken by `breakAtDot` where it must be, fits
 * `width`.
 */
export function fitBroken(texts, width, size, { min = 11, bold = false } = {}) {
  for (let at = size; at > min; at--) if (texts.every((words) => widthOf(breakAtDot(words, width, at, { bold }), at, { bold }) <= width)) return at;
  return min;
}

/**
 * `text` on one line if it fits `width` at `size`, otherwise broken after its first « · ». The engine draws the lines
 * of one text flush left and centres only the block (ENGINE-NOTES 22), so the shorter line is led by spaces to stand in
 * the middle.
 */
export function breakAtDot(text, width, size, { bold = false } = {}) {
  if (widthOf(text, size, { bold }) <= width || !text.includes(' · ')) return text;
  const lines = [text.slice(0, text.indexOf(' · ')), text.slice(text.indexOf(' · ') + 3)];
  const widths = lines.map((line) => widthOf(line, size, { bold })), space = widthOf('\u00a0', size, { bold }) || size / 4;
  const widest = Math.max(...widths);
  return lines.map((line, at) => '\u00a0'.repeat(Math.round((widest - widths[at]) / 2 / space)) + line).join('\n');
}

/**
 * Shrinks the words of every text and button in a view's description that would not fit their part. Widths follow the
 * engine's planner for what these screens use: fixed widths first, then equal shares of the rest among `'fill'` parts in
 * a row; in a column, or with anchors, a part without a number takes the width inside its parent. A part's own words
 * are measured when they are written in the description; `fits: [...]` on a part lists the words a binding may give it,
 * and is taken out before the engine sees the description. `skin` gives the sizes the engine uses when a part has none.
 */
export function fitWords(part, width, skin) {
  const { fits, ...clean } = part;
  if (clean.type === 'text' || clean.type === 'button') {
    const button = clean.type === 'button';
    const size = clean.size ?? (button ? Math.round(skin.size * 0.9) : skin.size);
    const room = (typeof clean.width === 'number' ? clean.width : width) - (button ? 16 : 0);
    const words = fits ?? (typeof clean.text === 'string' && clean.text ? [clean.text] : []);
    if (words.length && room > 0) {
      const fitted = fitSize(words, room, size, { bold: button || clean.bold === true, min: Math.min(size, 11) });
      if (fitted < size) clean.size = fitted;
    }
    return clean;
  }
  if (!Array.isArray(clean.children)) return clean;
  const own = typeof clean.width === 'number' ? clean.width : width;
  const inside = own - 2 * (clean.padding ?? 0);
  let widths;
  if (clean.layout === 'row') {
    const gap = clean.gap ?? 0;
    const fixed = clean.children.reduce((sum, child) => sum + (typeof child.width === 'number' ? child.width : 0), 0);
    const shares = clean.children.filter((child) => typeof child.width !== 'number').length;
    const share = shares ? (inside - fixed - gap * (clean.children.length - 1)) / shares : 0;
    widths = clean.children.map((child) => (typeof child.width === 'number' ? child.width : share));
  } else widths = clean.children.map((child) => (typeof child.width === 'number' ? child.width : inside));
  clean.children = clean.children.map((child, index) => fitWords(child, widths[index], skin));
  return clean;
}
