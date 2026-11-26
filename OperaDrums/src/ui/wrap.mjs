// 折行：引擎的数据界面里一个文字部件是一行或几行（\n 分行），不会自己按宽度折行；长句子在这里按字号量好、
// 断成几行，再交给文字部件（见 ENGINE-NOTES.md）。中文按字断，英文按词断。量字用页面的画布，字体与引擎的文字一致。
//
// Wrapping: a text part of the engine's views is one line, or several split by \n, and is not wrapped to its width;
// long sentences are measured at their size and broken here before they go to a text part (see ENGINE-NOTES.md).
// Chinese breaks between characters, English between words. The page's canvas measures in the engine's font.

let context = null;
function measurer() {
  if (context) return context;
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(8, 8) : document.createElement('canvas');
  context = canvas.getContext('2d');
  return context;
}

/** The pieces a line may break between: each CJK character, and each word with its following space. */
const pieces = (text) => text.match(/[\u3000-\u9fff\uff00-\uffef][\uff0c\u3002\u3001\uff1b\uff1a\uff01\uff1f\u300d\u300f\uff09]?|[^\s\u3000-\u9fff\uff00-\uffef]+\s*|\s+/gu) ?? [];

/** `text` broken into lines no wider than `width` at `size` units; a `\n` in it always breaks. */
export function wrapLines(text, width, size, { bold = false } = {}) {
  const measure = measurer();
  measure.font = `${bold ? 'bold ' : ''}${size}px sans-serif`;
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

/** A text part holding `text` wrapped to `width`, as tall as its lines. */
export function wrapped(name, text, width, { size = 16, lineHeight = 1.45, ...more } = {}) {
  const lines = wrapLines(text, width, size, more);
  return { type: 'text', name, text: lines.join('\n'), size, width, height: Math.ceil(lines.length * size * lineHeight), ...more };
}
