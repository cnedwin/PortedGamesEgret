// 卷片：点开一件证物看到的那一页。左边是它的画，右边是它的文字；文字里带下划线的词，用文字几何找出手指点中的是哪一个，
// 点中就收进词囊。尸身的卷片换成正背人形图，伤痕标在图上，点一下读出它是什么痕。
// The evidence card: the page a piece of evidence opens. Its picture on one side, its text on the other. Underlined
// words in the text are found under the finger with the paragraph's text geometry and go into the pouch when
// tapped. The body's card shows the front and back body chart instead, with each mark on it; a tap reads it out.
import { Sprite } from '@egret/engine';
import { KINDS } from '../sim/kinds.mjs';
import { parseEvidence } from '../sim/text.mjs';
import { INK, PAPER, VERMILION } from './type.mjs';
import { FAINT, RULE, at, hitBox, kids } from './ui.mjs';

/**
 * Open the card of `spotId` over `layer`. `app` gives game, type, kit, lang(), say(key), found(wordId), collect(wordId)
 * → bool, art(id), artInfo(id), picture(spotId) → art id, onClose().
 */
export async function openCard(layer, c, spotId, app) {
  const { game, type, kit } = app;
  const lang = app.lang();
  const spot = c.spots[spotId];
  const scope = game.engine.createScope();
  const root = new Sprite();
  layer.addChild(root);
  const portrait = game.height > game.width;
  const W = portrait ? game.width - 24 : 660,
    H = portrait ? Math.round(game.height * 0.56) : game.height - 96;
  const X = portrait ? 12 : game.width - W - 14,
    Y = portrait ? game.height - H - 12 : 80;
  const veil = kit.veil(root, 0.25, () => close());
  const panel = kit.panel(root, X, Y, W, H);
  hitBox(panel, 0, 0, W, H);
  game.onTap(panel, () => {});
  const title = type.label(panel, spot.title[lang], { size: 34, brush: true, colour: INK });
  title.x = 28;
  title.y = 22;
  const closer = kit.button(panel, app.say('close'), { x: W - 70, y: 44, w: 100, h: 46, size: 22 }, () => close());

  // The picture: the figure or thing itself, or the body chart.
  const picW = portrait ? 170 : 200,
    picH = H - 120;
  const pic = new Sprite();
  pic.x = 24;
  pic.y = 84;
  panel.addChild(pic);
  const picBox = new Sprite();
  pic.addChild(picBox);
  let chartSide = 'front';
  const marksLayer = new Sprite();
  let note = null;
  const drawPicture = async () => {
    for (const ch of kids(picBox)) type.discard(ch);
    picBox.graphics.clear();
    picBox.graphics.beginFill(0xe7dcc2, 1).drawRect(0, 0, picW, picH).endFill();
    picBox.graphics.lineStyle(1, RULE, 0.6).drawRect(0, 0, picW, picH);
    picBox.graphics.lineStyle(0, 0, 0);
    const id = spot.kind === 'body' ? `p-chart-${chartSide}` : app.picture(spotId);
    const info = id && app.artInfo(id);
    if (info) {
      const s = Math.min((picW - 16) / info.w, (picH - (spot.kind === 'body' ? 60 : 16)) / info.h);
      await app.pictures.image(app.art(id), { layer: picBox, x: picW / 2, y: (picH - (spot.kind === 'body' ? 44 : 0)) / 2, width: info.w * s, height: info.h * s });
      if (spot.kind === 'body') {
        pic.addChild(marksLayer);
        const ox = picW / 2 - (info.w * s) / 2,
          oy = (picH - 44) / 2 - (info.h * s) / 2;
        drawMarks(ox, oy, info.w * s, info.h * s);
      }
    }
  };
  const drawMarks = (ox, oy, w, h) => {
    for (const ch of kids(marksLayer)) type.discard(ch);
    marksLayer.graphics.clear();
    for (const [i, m] of (spot.marks ?? []).entries()) {
      if (m.side !== chartSide) continue;
      const mx = ox + m.x * w,
        my = oy + m.y * h;
      const dot = new Sprite();
      dot.x = mx;
      dot.y = my;
      marksLayer.addChild(dot);
      dot.graphics.beginFill(VERMILION, 0.25).drawCircle(0, 0, 16).endFill();
      dot.graphics.lineStyle(2.5, VERMILION, 1).drawCircle(0, 0, 11);
      dot.graphics.lineStyle(0, 0, 0);
      type.label(dot, String(i + 1), { size: 14, colour: VERMILION, align: 'center', middle: true });
      hitBox(dot, -22, -22, 44, 44);
      game.onTap(dot, () => showNote(m));
    }
  };
  const showNote = (m) => {
    if (note) type.discard(note);
    note = new Sprite();
    pic.addChild(note);
    note.y = picH - 40;
    note.graphics.beginFill(PAPER, 0.96).drawRect(4, 0, picW - 8, 36).endFill();
    at(type.label(note, m[lang], { size: Math.min(18, (picW - 16) / Math.max(4, m[lang].length * (lang === 'zh' ? 1 : 0.5))), colour: VERMILION, align: 'center', middle: true }), picW / 2, 18);
    app.sound?.play('brush');
  };
  if (spot.kind === 'body') {
    const flip = kit.button(pic, lang === 'zh' ? '翻身' : 'Turn over', { x: picW / 2, y: picH - 22 - 24, w: picW - 30, h: 40, size: 20 }, () => {
      chartSide = chartSide === 'front' ? 'back' : 'front';
      void drawPicture();
      app.sound?.play('paper');
    });
    pic.addChild(flip);
    void drawPicture();
  } else await drawPicture();

  // The text, with its collectible words coloured, underlined, and found under the finger.
  const textX = 24 + picW + 22,
    textW = W - textX - 28,
    textY = 92;
  const ev = parseEvidence(spot.text[lang], c.words, lang);
  const size = lang === 'zh' ? 23 : 20;
  const body = new Sprite();
  body.x = textX;
  body.y = textY;
  panel.addChild(body);
  const runsFor = () =>
    ev.runs.map((r) => ({ start: r.start, end: r.end, fillColor: app.found(r.word) ? KINDS[c.words[r.word].kind].colour : darken(KINDS[c.words[r.word].kind].colour) }));
  const para = type.paragraph(scope, { text: ev.plain, width: textW, size, lineHeight: Math.round(size * 1.62), runs: runsFor(), locale: lang });
  body.addChild(para.holder);
  const under = new Sprite();
  body.addChild(under);
  const hint = type.label(panel, '', { size: 17, colour: FAINT });
  hint.x = textX;
  hint.y = H - 42;
  const drawUnder = () => {
    const geo = para.geometry();
    const g = under.graphics;
    g.clear();
    if (!geo) return;
    let left = 0;
    for (const r of ev.runs) {
      const colour = KINDS[c.words[r.word].kind].colour;
      const got = app.found(r.word);
      if (!got) left++;
      for (const box of geo.getSelectionRects(r.start, r.end)) {
        if (!got) g.beginFill(colour, 0.1).drawRect(box.left, box.top + 2, box.right - box.left, box.bottom - box.top - 2).endFill();
        g.beginFill(colour, got ? 0.55 : 1).drawRect(box.left, box.bottom - (got ? 2 : 3), box.right - box.left, got ? 1.5 : 3).endFill();
      }
    }
    hint.setText(ev.runs.length === 0 ? '' : left ? app.say('tapWords') : app.say('allCollected'));
  };
  const metrics = await para.ready;
  drawUnder();
  hitBox(body, 0, 0, textW, Math.max(metrics.height, 40));
  game.onTap(body, () => {
    const geo = para.geometry();
    if (!geo) return;
    // The pointer is in the game's units; the stage may hold the game's area off its corner (a mini game's tall screen).
    const o = game.ui.localToGlobal(0, 0);
    const p = para.node.globalToLocal(game.pointer.x + o.x, game.pointer.y + o.y);
    const cluster = geo.clusters.find((k) => p.x >= k.left && p.x <= k.right && p.y >= k.top && p.y <= k.bottom);
    const at = cluster ? cluster.start : geo.hitTest(p.x, p.y)?.offset;
    if (at === undefined) return;
    const run = ev.runs.find((r) => at >= r.start && at < r.end) ?? nearest(ev.runs, geo, p);
    if (run) take(run.word);
  });
  const take = (wordId) => {
    if (!app.collect(wordId)) return;
    void para.set({ runs: runsFor() }).then(drawUnder);
    drawUnder();
  };

  // Keyboard: each word is a stop, Enter collects it.
  const focus = ev.runs.map((r) => ({
    sprite: body,
    get ox() {
      const b = para.geometry()?.getSelectionRects(r.start, r.end)[0];
      return b ? b.left : 0;
    },
    get oy() {
      const b = para.geometry()?.getSelectionRects(r.start, r.end)[0];
      return b ? b.top : 0;
    },
    get w() {
      const b = para.geometry()?.getSelectionRects(r.start, r.end)[0];
      return b ? b.right - b.left : 40;
    },
    get h() {
      const b = para.geometry()?.getSelectionRects(r.start, r.end)[0];
      return b ? b.bottom - b.top : 30;
    },
    activate: () => take(r.word)
  }));

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    type.discard(root);
    scope.dispose();
    app.onClose?.();
  }
  root.alpha = 0;
  game.tween(root).to({ alpha: 1 }, game.reducedMotion ? 0.01 : 0.18);
  /** For tests: where a word sits on the stage, to tap it like a player. */
  const wordRect = (wordId) => {
    const r = ev.runs.find((x) => x.word === wordId);
    const b = r && para.geometry()?.getSelectionRects(r.start, r.end)[0];
    if (!b) return null;
    const p = para.node.localToGlobal((b.left + b.right) / 2, (b.top + b.bottom) / 2);
    return { x: p.x, y: p.y };
  };
  return { close, focus: [...focus, closer.focusRecord], spotId, take, wordRect, root };
}

/** The nearest word to a tap that fell just outside every word: within a line height. */
function nearest(runs, geo, p) {
  let best = null,
    dist = 28;
  for (const r of runs)
    for (const b of geo.getSelectionRects(r.start, r.end)) {
      const dx = p.x < b.left ? b.left - p.x : p.x > b.right ? p.x - b.right : 0;
      const dy = p.y < b.top ? b.top - p.y : p.y > b.bottom ? p.y - b.bottom : 0;
      const d = Math.hypot(dx, dy);
      if (d < dist) (dist = d), (best = r);
    }
  return best;
}

const darken = (c) => {
  const r = (c >> 16) & 255,
    g = (c >> 8) & 255,
    b = c & 255;
  return (Math.round(r * 0.85) << 16) | (Math.round(g * 0.85) << 8) | Math.round(b * 0.85);
};
