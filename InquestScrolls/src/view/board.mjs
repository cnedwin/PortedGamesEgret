// 字盘：没有文本框的地方（微信小游戏）用它写判词、记笔录。一行行的字签按量出的字宽排开，每一行只是一个文字标签，
// 字签的方框和点按区按同样的宽度画在字下面，所以五十个字签也只占几张文字图。
// The board: where there is no text field (a WeChat mini game) the verdict and the notes are written by tapping it.
// Rows of tiles are laid out by measured widths, and each row is one text label; the boxes and the places to tap are
// drawn under the words by the same widths, so a board of fifty tiles costs only a few text images.
import { Sprite } from '@egret/engine';
import { INK, PAPER } from './type.mjs';
import { RULE, hitBox } from './ui.mjs';

/** Between two tiles' words: two ideographic spaces, measured like the words. */
const GAP = '　　';

/**
 * Build a board in `parent` over the area { x, y, w, h }. `tiles` are { text, colour?, strong? }; `onTap(tile)` is
 * called when one is tapped. Returns { root, tap(text) (for keys and tests), focus (records), height }.
 */
export function buildBoard(app, parent, area, tiles, onTap, { size = 22 } = {}) {
  const { game, type } = app;
  const root = new Sprite();
  root.x = area.x;
  root.y = area.y;
  parent.addChild(root);
  const view = new Sprite();
  root.addChild(view);
  root.mask = { x: 0, y: 0, width: area.w, height: area.h };
  const pad = Math.round(size * 0.4),
    rowH = Math.round(size * 1.9);
  // Rows: as many tiles as fit, each tile starting where the measured words before it end.
  const rows = [];
  let row = [];
  const widthOf = (list) => type.measure(list.map((t) => t.text).join(GAP), size);
  for (const t of tiles) {
    if (row.length && widthOf([...row, t]) + pad * 2 > area.w) {
      rows.push(row);
      row = [];
    }
    row.push(t);
  }
  if (row.length) rows.push(row);
  const records = [];
  rows.forEach((list, r) => {
    const y = r * (rowH + 6);
    let x = pad;
    const text = list.map((t) => t.text).join(GAP);
    list.forEach((t, i) => {
      const before = i ? type.measure(list.slice(0, i).map((q) => q.text).join(GAP) + GAP, size) : 0;
      const w = type.measure(t.text, size);
      const box = new Sprite();
      box.x = x + before - pad;
      box.y = y;
      view.addChild(box);
      const g = box.graphics;
      g.beginFill(t.strong ? 0xe9dcc0 : PAPER, 1).drawRect(0, 0, w + pad * 2, rowH).endFill();
      g.beginFill(t.colour ?? RULE, 1).drawRect(0, rowH - 3, w + pad * 2, 3).endFill();
      g.lineStyle(1, RULE, 0.7).drawRect(0, 0, w + pad * 2, rowH);
      g.lineStyle(0, 0, 0);
      hitBox(box, 0, 0, w + pad * 2, rowH);
      const act = () => {
        app.sound?.play('brush');
        onTap(t);
      };
      game.onTap(box, act);
      records.push({ sprite: box, ox: 0, oy: 0, w: w + pad * 2, h: rowH, activate: act, tile: t });
    });
    // The words of the whole row, in one label over the boxes.
    const words = type.label(view, text, { size, colour: INK });
    words.x = x;
    words.y = y + (rowH - size * 1.25) / 2;
  });
  const height = rows.length * (rowH + 6);
  // A board taller than its area scrolls under a finger.
  if (height > area.h) {
    hitBox(root, 0, 0, area.w, area.h);
    game.gestures(root, { drag: (d) => (view.y = Math.max(area.h - height, Math.min(0, view.y + d.dy))) });
  }
  return {
    root,
    height,
    focus: records,
    /** Tap the first tile with these words, as a finger would. */
    tap(text) {
      const found = records.find((q) => q.tile.text === text);
      found?.activate();
      return !!found;
    }
  };
}
