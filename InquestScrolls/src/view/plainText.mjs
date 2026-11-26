// 没有 CanvasKit 的地方（微信小游戏）用的段落：按字量宽、按中文与西文各自的规矩断行，每一行按颜色切成几段，
// 每段是引擎的一个画布文字标签。和 CanvasKit 段落一样给出文字几何（每个字的方框、一段文字的选区、点中的位置），
// 所以证物上点词、卷宗里量空位的代码两边通用。
// Paragraphs where there is no CanvasKit (a WeChat mini game): characters are measured, lines are broken by the rules
// of Chinese and of Western text, each line is cut by colour into a few pieces, and each piece is one of the engine's
// canvas text labels. Like a CanvasKit paragraph it gives text geometry (a box for each character, the boxes of a
// range, the character under a point), so tapping words on evidence and measuring blanks in the dossier work the same.
import { Sprite } from '@egret/engine';

/** Characters that may not begin a line; they stay at the end of the line before. */
const NO_START = new Set('，。、；：？！）》」』”’〉】…—,.;:?!)]}%');
/** Characters that may not end a line; they move to the line after. */
const NO_END = new Set('（《「『“‘〈【([{');
const WIDE = /[⺀-鿿豈-﫿＀-￯　-〿]/;

/**
 * Break `text` into lines no wider than `width`. `advance(ch)` gives a character's width. Returns lines of
 * { start, end, glyphs: [{ start, end, x, w }], width }, in UTF-16 offsets of `text`.
 */
export function breakLines(text, width, advance) {
  const lines = [];
  let line = { start: 0, glyphs: [], width: 0 };
  const finish = (end) => {
    // Spaces at a line's end take no room.
    while (line.glyphs.length && /\s/.test(text[line.glyphs.at(-1).start])) line.glyphs.pop();
    line.end = end;
    line.width = line.glyphs.length ? line.glyphs.at(-1).x + line.glyphs.at(-1).w : 0;
    lines.push(line);
  };
  // Tokens: each wide character alone, a Western word with the spaces after it, a line break.
  const tokens = [];
  for (let i = 0; i < text.length; ) {
    const ch = text[i];
    if (ch === '\n') {
      tokens.push({ start: i, end: i + 1, newline: true });
      i++;
    } else if (WIDE.test(ch) || NO_START.has(ch) || NO_END.has(ch)) {
      tokens.push({ start: i, end: i + 1 });
      i++;
    } else {
      let j = i;
      while (j < text.length && text[j] !== '\n' && !WIDE.test(text[j]) && !/\s/.test(text[j]) && !NO_START.has(text[j]) && !NO_END.has(text[j])) j++;
      while (j < text.length && text[j] !== '\n' && /\s/.test(text[j]) && !WIDE.test(text[j])) j++;
      if (j === i) j++;
      tokens.push({ start: i, end: j });
      i = j;
    }
  }
  const place = (t) => {
    let x = line.glyphs.length ? line.glyphs.at(-1).x + line.glyphs.at(-1).w : 0;
    for (let k = t.start; k < t.end; k++) {
      const w = advance(text[k]);
      line.glyphs.push({ start: k, end: k + 1, x, w });
      x += w;
    }
  };
  const tokenWidth = (t) => {
    let w = 0;
    for (let k = t.start; k < t.end; k++) if (!/\s/.test(text[k]) || k < t.end - 1 || WIDE.test(text[k])) w += advance(text[k]);
    return w;
  };
  for (let n = 0; n < tokens.length; n++) {
    const t = tokens[n];
    if (t.newline) {
      finish(t.start);
      line = { start: t.end, glyphs: [], width: 0 };
      continue;
    }
    const used = line.glyphs.length ? line.glyphs.at(-1).x + line.glyphs.at(-1).w : 0;
    const w = tokenWidth(t);
    if (used + w > width && line.glyphs.length && !NO_START.has(text[t.start])) {
      // An opening bracket at the end of the full line goes down with what it opens.
      const carry = [];
      while (line.glyphs.length > 1 && NO_END.has(text[line.glyphs.at(-1).start])) carry.unshift(line.glyphs.pop());
      finish(carry.length ? carry[0].start : t.start);
      line = { start: carry.length ? carry[0].start : t.start, glyphs: [], width: 0 };
      for (const g of carry) place({ start: g.start, end: g.end });
    }
    // A Western word longer than a whole line is broken where it must be.
    if (w > width && !WIDE.test(text[t.start])) {
      for (let k = t.start; k < t.end; k++) {
        const used2 = line.glyphs.length ? line.glyphs.at(-1).x + line.glyphs.at(-1).w : 0;
        if (used2 + advance(text[k]) > width && line.glyphs.length) {
          finish(k);
          line = { start: k, glyphs: [], width: 0 };
        }
        place({ start: k, end: k + 1 });
      }
      continue;
    }
    place(t);
  }
  finish(text.length);
  return lines;
}

/**
 * Make paragraphs from labels. `label(parent, text, opts)` makes one label; `measure(text, size, brush)` measures
 * words in the label's own font. Returns `paragraph(scope, opts)` with the shape of the CanvasKit one.
 */
export function createPlainParagraphs({ label, measure, discard, ink }) {
  return function paragraph(scope, opts) {
    const holder = new Sprite();
    const node = new Sprite();
    holder.addChild(node);
    let last = {},
      geometry = null,
      generation = 0;
    const set = (o) => {
      last = { ...last, ...o };
      const mine = ++generation;
      const size = last.size ?? 24,
        lineHeight = last.lineHeight ?? Math.round(size * 1.45),
        width = Math.max(8, last.width),
        text = last.text || ' ',
        brush = !!last.brush;
      const widths = new Map();
      const advance = (ch) => {
        if (!widths.has(ch)) widths.set(ch, measure(ch, size, brush));
        return widths.get(ch);
      };
      const lines = breakLines(text, width, advance);
      for (const [i, l] of lines.entries()) {
        const shift = last.align === 'center' ? (width - l.width) / 2 : last.align === 'right' ? width - l.width : 0;
        for (const g of l.glyphs) g.x += shift;
        l.top = i * lineHeight;
        l.bottom = l.top + lineHeight;
      }
      // The colour of each character: the paragraph's own, or a run's.
      const colourAt = (k) => {
        for (const r of last.runs ?? []) if (k >= r.start && k < r.end) return r.fillColor;
        return last.colour ?? ink;
      };
      for (let i = node.numChildren - 1; i >= 0; i--) discard(node.getChildAt(i));
      const made = [];
      // The label's own line box is 1.25 of its size; it is centred in the paragraph's line.
      const lift = (lineHeight - size * 1.25) / 2;
      for (const l of lines) {
        let piece = null;
        const flush = () => {
          if (!piece) return;
          const words = text.slice(piece.start, piece.end);
          if (words.trim()) {
            const s = label(node, words, { size, colour: piece.colour, brush, locale: last.locale });
            s.x = piece.x;
            s.y = l.top + lift;
            made.push(s);
          }
          piece = null;
        };
        for (const g of l.glyphs) {
          const colour = colourAt(g.start);
          if (piece && piece.colour === colour) piece.end = g.end;
          else {
            flush();
            piece = { start: g.start, end: g.end, x: g.x, colour };
          }
        }
        flush();
      }
      const clusters = lines.flatMap((l) => l.glyphs.map((g) => ({ start: g.start, end: g.end, left: g.x, right: g.x + g.w, top: l.top, bottom: l.bottom })));
      geometry = {
        clusters,
        getSelectionRects(start, end) {
          const out = [];
          for (const l of lines) {
            const inside = l.glyphs.filter((g) => g.start < end && g.end > start);
            if (!inside.length) continue;
            out.push({ left: inside[0].x, right: inside.at(-1).x + inside.at(-1).w, top: l.top, bottom: l.bottom });
          }
          return out;
        },
        hitTest(x, y) {
          const l = lines.find((q) => y >= q.top && y < q.bottom) ?? (y < 0 ? lines[0] : lines.at(-1));
          if (!l || !l.glyphs.length) return { offset: l?.start ?? 0 };
          let best = l.glyphs[0];
          for (const g of l.glyphs) if (Math.abs(g.x + g.w / 2 - x) < Math.abs(best.x + best.w / 2 - x)) best = g;
          return { offset: x > best.x + best.w / 2 ? best.end : best.start };
        }
      };
      const metrics = { width: Math.max(0, ...lines.map((l) => l.width)), height: lines.length * lineHeight, lines: lines.length };
      return Promise.all(made.map((s) => s.labelReady())).then(() => (mine === generation ? metrics : null));
    };
    const ready = set(opts);
    return { holder, node, ready, set, geometry: () => geometry };
  };
}
