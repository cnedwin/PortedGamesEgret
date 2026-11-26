// 卷宗：一案分几页，第一页给人物对名字，其余每页一段带空的文字。空位染成它要的那一类词的颜色。
// 把词囊里的词签拖进空位（或先点词签、再点空位），点已填的空清掉它。一页填满才能核验：全对盖朱印，错两处以内只说
// "尚有两处以内不实"。文字由 CanvasKit 排版，空位的位置用文字几何量出来，拖放的落点就放在那里。
// The dossier: a case has a few pages, the first giving each person a name and the rest a passage with blanks. A
// blank takes the colour of the kind of word it wants. Drag a word slip from the pouch onto a blank (or tap the slip
// and then the blank); tap a filled blank to empty it. A full page can be checked: all right and it is sealed in red;
// two or fewer wrong and it says only that. The text is laid out by CanvasKit, the blanks are measured with its text
// geometry, and the drop targets are put exactly there.
import { Sprite } from '@egret/engine';
import { planLinearLayout } from '@egret/engine/layout';
import { KINDS, KIND_ORDER } from '../sim/kinds.mjs';
import { blanksOfPage, checkPage, pageFull, placeWord } from '../sim/rules.mjs';
import { fillDossier } from '../sim/text.mjs';
import { INK, PAPER, VERMILION } from './type.mjs';
import { FAINT, RULE, at, estimateWidth, hitBox, kids } from './ui.mjs';

const GAP = '　　　';

/**
 * Open the dossier of case `c` over `layer`. `app` gives game, type, kit, sound, lang(), say(key, values), st (the
 * case state), save(), art(id), artInfo(id), picture(spotId), onSealed(pageId), onHint(pageId), onClose().
 */
export async function openDossier(layer, c, app, startPage) {
  const { game, type, kit } = app;
  const lang = app.lang();
  const st = app.st;
  const portrait = game.height > game.width;
  const scope = game.engine.createScope();
  const root = new Sprite();
  layer.addChild(root);
  kit.veil(root, 0.4);
  const W = game.width - 24,
    H = game.height - 24;
  const panel = kit.panel(root, 12, 12, W, H, { fill: 0xf3ead4 });
  const backdrop = new Sprite();
  panel.addChild(backdrop);
  hitBox(backdrop, 0, 0, W, H);
  game.onTap(backdrop, () => select(null));

  // Areas: the page on the left (or top), the pouch on the right (or bottom).
  const page = portrait ? { x: 22, y: 128, w: W - 44, h: Math.round(H * 0.5) } : { x: 26, y: 104, w: 760, h: H - 196 };
  const pouch = portrait ? { x: 22, y: page.y + page.h + 70, w: W - 44, h: H - (page.y + page.h + 70) - 18 } : { x: 812, y: 104, w: W - 812 - 22, h: H - 122 };
  const title = type.label(panel, c.title[lang], { size: 32, brush: true });
  title.x = 26;
  title.y = 26;

  // Page tabs, laid out in a row by the engine's linear layout planner.
  let current = startPage && c.pages.some((p) => p.id === startPage) ? startPage : (c.pages.find((p) => !st.sealed.includes(p.id)) ?? c.pages[0]).id;
  const tabs = new Sprite();
  panel.addChild(tabs);
  const tabSize = c.pages.map((p) => ({ width: Math.max(96, estimateWidth(p.title[lang], 20) + 40), height: 44 }));
  const tabPlan = planLinearLayout({ axis: 'horizontal', items: tabSize, gap: 10 });
  tabs.x = portrait ? 22 : 26 + estimateWidth(c.title[lang], 32) + 34;
  tabs.y = portrait ? 74 : 30;
  if (!portrait && tabs.x + tabPlan.width > page.x + page.w + 20) {
    tabs.x = 26;
    tabs.y = 66;
    page.y += 26;
    page.h -= 26;
  }
  const tabButtons = c.pages.map((p, i) => {
    const pl = tabPlan.placements[i];
    const b = kit.button(tabs, (st.sealed.includes(p.id) ? '✓ ' : '') + p.title[lang], { x: pl.x + pl.width / 2, y: pl.y + pl.height / 2, w: pl.width, h: pl.height, size: 19, brush: false }, () => show(p.id));
    return b;
  });
  const closeBtn = kit.button(panel, app.say('close'), { x: W - 74, y: 46, w: 112, h: 46, size: 22 }, () => close());
  const hintBtn = kit.button(panel, app.say('hint'), { x: W - 196, y: 46, w: 112, h: 46, size: 22 }, () => app.onHint(current));

  const pageLayer = new Sprite();
  pageLayer.x = page.x;
  pageLayer.y = page.y;
  panel.addChild(pageLayer);
  const foot = new Sprite();
  foot.x = page.x;
  foot.y = page.y + page.h + 10;
  panel.addChild(foot);
  const checkBtn = kit.button(foot, app.say('check'), { x: 80, y: 26, w: 150, h: 52, primary: true, size: 26 }, () => check());
  const result = type.label(foot, '', { size: 22, colour: VERMILION, middle: true });
  result.x = 176;
  result.y = 26;

  // ---- the pouch ----
  const pouchLayer = new Sprite();
  pouchLayer.x = pouch.x;
  pouchLayer.y = pouch.y;
  panel.addChild(pouchLayer);
  const pouchTitle = type.label(pouchLayer, app.say('pouch'), { size: 26, brush: true });
  pouchTitle.y = -4;
  const chipsView = new Sprite();
  chipsView.y = 40;
  pouchLayer.addChild(chipsView);
  const chips = new Sprite();
  chipsView.addChild(chips);
  chipsView.mask = { x: 0, y: 0, width: pouch.w, height: pouch.h - 40 };
  let scrollY = 0,
    chipsHeight = 0;
  hitBox(chipsView, 0, 0, pouch.w, pouch.h - 40);
  const scrollTo = (y) => {
    scrollY = Math.max(Math.min(0, pouch.h - 40 - chipsHeight), Math.min(0, y));
    chips.y = scrollY;
  };
  game.gestures(chipsView, { drag: (d) => scrollTo(scrollY + d.dy) });

  const dnd = game.dragAndDrop();
  let selected = null;
  const chipSprites = new Map();
  const removers = [];
  const kindOf = (wordId) => c.words[wordId]?.kind;
  function select(wordId) {
    selected = wordId === selected ? null : wordId;
    for (const [id, s] of chipSprites) s.alpha = !selected || id === selected ? 1 : 0.55;
    paintTargets();
  }
  function buildPouch() {
    for (const ch of kids(chips)) type.discard(ch);
    chipSprites.clear();
    let y = 0;
    const found = st.found;
    if (!found.length) {
      const empty = type.label(chips, app.say('pouchEmpty'), { size: 18, colour: FAINT });
      empty.y = 4;
      chipsHeight = 40;
      return;
    }
    for (const kind of KIND_ORDER) {
      const words = found.filter((w) => kindOf(w) === kind);
      if (!words.length) continue;
      const head = type.label(chips, KINDS[kind].name[lang], { size: 18, colour: KINDS[kind].colour, brush: true });
      head.y = y;
      y += 30;
      // Flow the slips into rows, each row placed by the linear layout planner.
      const slips = words.map((w) => kit.slip(null, c.words[w], lang, { size: 19 }));
      let row = [],
        rowW = 0;
      const flush = () => {
        if (!row.length) return;
        const plan = planLinearLayout({ axis: 'horizontal', items: row.map((s) => ({ width: s.slipWidth, height: s.slipHeight })), gap: 8 });
        row.forEach((s, i) => {
          chips.addChild(s);
          s.x = plan.placements[i].x;
          s.y = y + plan.placements[i].y;
        });
        y += plan.height + 8;
        row = [];
        rowW = 0;
      };
      slips.forEach((s, i) => {
        if (rowW + s.slipWidth > pouch.w && row.length) flush();
        row.push(s);
        rowW += s.slipWidth + 8;
        const wordId = words[i];
        chipSprites.set(wordId, s);
        game.onTap(s, () => select(wordId));
        removers.push(dnd.source(s, { data: () => wordId, ghost: () => kit.slip(null, c.words[wordId], lang, { size: 19, hot: true }) }));
      });
      flush();
      y += 6;
    }
    chipsHeight = y;
  }

  // ---- the page ----
  let targets = [];
  const targetSprites = [];
  const targetRemovers = [];
  const targetsLayer = new Sprite();
  const decor = new Sprite();
  let sealSprite = null;
  // Renders run one after another, so a second change while one is laying out waits for it.
  let rendering = Promise.resolve();
  const render = () => (rendering = rendering.then(renderNow, renderNow));
  async function renderNow() {
    for (const r of removers.splice(0)) r?.();
    clearTargets();
    for (const ch of kids(pageLayer)) if (ch !== decor && ch !== targetsLayer) type.discard(ch);
    targets = [];
    const p = c.pages.find((x) => x.id === current);
    const filled = st.place[p.id] ?? {};
    const sealed = st.sealed.includes(p.id);
    const pageTitle = type.label(pageLayer, p.title[lang], { size: 26, brush: true, colour: INK });
    pageTitle.y = 0;
    pageLayer.addChild(decor);
    decor.graphics.clear();
    pageLayer.addChild(targetsLayer);
    if (p.names) await renderNames(p, filled, sealed);
    else await renderText(p, filled, sealed);
    sealSprite = sealed ? kit.seal(pageLayer, page.w - 70, page.h - 70, 92, '核实') : null;
    checkBtn.setEnabled(!sealed);
    result.setText(sealed ? app.say('pageSealed') : '');
    buildPouch();
    scrollTo(scrollY);
    buildTargets();
    refreshFocus();
  }
  async function renderText(p, filled, sealed) {
    const doc = fillDossier(p.text[lang], filled, c.words, lang, GAP);
    const blanks = blanksOfPage(c, p.id);
    const size = portrait ? 25 : lang === 'zh' ? 29 : 25;
    const runs = doc.blanks.map((b) => ({ start: b.start, end: b.end, fillColor: KINDS[blanks.find((x) => x.id === b.id).kind].colour }));
    const para = type.paragraph(scope, { text: doc.plain, width: page.w - 20, size, lineHeight: Math.round(size * 1.85), runs, locale: lang });
    para.holder.y = 52;
    pageLayer.addChild(para.holder);
    pageLayer.addChild(decor);
    pageLayer.addChild(targetsLayer);
    await para.ready;
    const geo = para.geometry();
    for (const b of doc.blanks) {
      const kind = blanks.find((x) => x.id === b.id).kind;
      const rects = geo.getSelectionRects(b.start, b.end);
      if (!rects.length) continue;
      const r = rects[0];
      const box = { x: r.left, y: r.top + 52, w: Math.max(48, rects.reduce((m, q) => Math.max(m, q.right), 0) - r.left), h: r.bottom - r.top };
      if (rects.length > 1) box.w = r.right - r.left;
      targets.push({ blank: b.id, kind, word: b.word, box, rects: rects.map((q) => ({ x: q.left, y: q.top + 52, w: q.right - q.left, h: q.bottom - q.top })), sealed, pageId: p.id });
    }
  }
  async function renderNames(p, filled, sealed) {
    const n = p.portraits.length;
    const perRow = portrait ? 3 : Math.min(5, n);
    const cellW = Math.floor((page.w - 10) / perRow),
      picH = portrait ? 150 : 200;
    await Promise.all(
      p.portraits.map(async (pt, i) => {
        const col = i % perRow,
          row = Math.floor(i / perRow);
        const cell = new Sprite();
        cell.x = col * cellW;
        cell.y = 52 + row * (picH + 90);
        pageLayer.addChild(cell);
        const w = cellW - 14;
        cell.graphics.beginFill(0xe7dcc2, 1).drawRect(0, 0, w, picH).endFill();
        cell.graphics.lineStyle(1, RULE, 0.7).drawRect(0, 0, w, picH);
        cell.graphics.lineStyle(0, 0, 0);
        const id = app.picture(pt.id);
        const info = id && app.artInfo(id);
        if (info) {
          // Head and shoulders: the figure scaled to the cell's width, clipped to its top.
          const holder = new Sprite();
          cell.addChild(holder);
          holder.mask = { x: 0, y: 0, width: w, height: picH };
          const s = (w * 1.25) / info.w;
          await app.pictures.image(app.art(id), { layer: holder, x: w / 2, y: (info.h * s) / 2 + 6, width: info.w * s, height: info.h * s });
        }
        targets.push({ blank: pt.id, kind: 'person', word: filled[pt.id] ?? null, box: { x: cell.x, y: cell.y + picH + 8, w, h: 46 }, sealed, pageId: p.id, plate: true });
      })
    );
  }
  function clearTargets() {
    for (const remove of targetRemovers.splice(0)) remove();
    for (const sprite of targetSprites.splice(0)) type.discard(sprite);
  }
  function paintTargets() {
    const g = decor.graphics;
    g.clear();
    for (const t of targets) {
      const colour = KINDS[t.kind].colour;
      const want = selected && kindOf(selected) === t.kind && !t.sealed;
      for (const r of t.plate ? [t.box] : t.rects) {
        g.beginFill(colour, t.word ? 0.08 : want ? 0.3 : 0.16).drawRect(r.x - 2, r.y + 2, r.w + 4, r.h - 2).endFill();
        g.beginFill(colour, 1).drawRect(r.x - 2, r.y + r.h - 3, r.w + 4, 3).endFill();
      }
    }
  }
  function buildTargets() {
    paintTargets();
    for (const t of targets) {
      const colour = KINDS[t.kind].colour;
      const sprite = at(new Sprite(), t.box.x, t.box.y);
      targetsLayer.addChild(sprite);
      const regions = !t.plate && t.rects.length > 1 ? t.rects : [t.box];
      for (const r of regions) hitBox(sprite, r.x - t.box.x - 4, r.y - t.box.y, r.w + 8, r.h);
      targetSprites.push(sprite);
      if (t.plate) {
        const words = t.word ? c.words[t.word][lang] : KINDS.person[lang];
        at(type.label(sprite, words, { size: 21, colour: t.word ? colour : FAINT, align: 'center', middle: true, brush: !t.word }), t.box.w / 2, t.box.h / 2);
      } else if (!t.word) {
        at(type.label(sprite, KINDS[t.kind].zh, { size: 17, colour, align: 'center', middle: true, brush: true }), t.box.w / 2, t.box.h / 2 + 2);
      }
      if (t.sealed) continue;
      game.onTap(sprite, () => tapTarget(t));
      targetRemovers.push(dnd.target(sprite, {
        accepts: (wordId) => !t.sealed && kindOf(wordId) === t.kind,
        drop: (wordId) => put(t, wordId),
        hover: (_, inside) => (sprite.alpha = inside ? 0.6 : 1)
      }));
    }
  }
  function tapTarget(t) {
    if (t.sealed) return;
    if (selected && kindOf(selected) === t.kind) put(t, selected);
    else if (t.word) put(t, null);
    else kit.toast(st.found.some((w) => kindOf(w) === t.kind) ? app.say('pickWord') : app.say('noWordOfKind'));
  }
  function put(t, wordId) {
    if (!placeWord(st, c, t.pageId, t.blank, wordId)) return false;
    app.sound?.play(wordId ? 'place' : 'paper');
    app.save();
    selected = null;
    result.setText('');
    void render();
    return true;
  }
  function check() {
    const r = checkPage(st, c, current);
    app.save();
    if (r.result === 'incomplete') {
      kit.toast(app.say('checkFull'));
      return;
    }
    if (r.result === 'sealed') {
      app.sound?.play('right');
      kit.stamp(pageLayer, page.w - 70, page.h - 70, 92, '核实');
      result.setText(app.say('sealed'));
      tabButtons[c.pages.findIndex((p) => p.id === current)].setText('✓ ' + c.pages.find((p) => p.id === current).title[lang]);
      checkBtn.setEnabled(false);
      for (const t of targets) t.sealed = true;
      paintTargets();
      game.after(game.reducedMotion ? 0.3 : 1.2, app.onSealed);
      return;
    }
    app.sound?.play(r.result === 'near' ? 'near' : 'wrong');
    result.setText(app.say(r.result));
    app.onChecked?.(r.result);
    if (!game.reducedMotion) game.shake(3, 0.2);
  }
  function show(pageId) {
    current = pageId;
    selected = null;
    app.sound?.play('paper');
    void render();
  }

  // Keyboard and gamepad: tabs, blanks, the check button, the slips, close.
  let focusList = [];
  function refreshFocus() {
    focusList = [
      ...tabButtons.map((b) => b.focusRecord),
      ...targets.map((t, i) => ({ sprite: targetSprites[i] ?? pageLayer, ox: -4, oy: 0, w: t.box.w + 8, h: t.box.h, activate: () => tapTarget(t) })),
      checkBtn.focusRecord,
      ...[...chipSprites.entries()].map(([wordId, s]) => ({
        sprite: s, ox: 0, oy: 0, w: s.slipWidth, h: s.slipHeight, activate: () => select(wordId),
        onFocus() {
          const top = s.y + scrollY, height = pouch.h - 40;
          if (top < 0) scrollTo(-s.y);
          else if (top + s.slipHeight > height) scrollTo(height - s.y - s.slipHeight);
        }
      })),
      hintBtn.focusRecord,
      closeBtn.focusRecord
    ];
    app.onFocus?.(focusList);
  }

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    for (const r of removers.splice(0)) r?.();
    clearTargets();
    type.discard(root);
    scope.dispose();
    app.onClose?.();
  }
  await render();
  root.alpha = 0;
  game.tween(root).to({ alpha: 1 }, game.reducedMotion ? 0.01 : 0.2);
  return {
    close,
    show,
    get page() {
      return current;
    },
    get focus() {
      return focusList;
    },
    /** For tests and the keyboard: put a word in a blank of the page shown. */
    place: (blankId, wordId) => put({ pageId: current, blank: blankId }, wordId),
    settled: () => rendering,
    check,
    full: () => pageFull(st, c, current),
    /** For tests: what the page said after the last check. */
    resultText: () => result.text(),
    /** For tests: where a word slip sits and where a blank of the page shown is, both in stage units. */
    dragPoints: (wordId, blankId) => {
      const s = chipSprites.get(wordId),
        t = targets.find((x) => x.blank === blankId),
        ts = targetSprites[targets.indexOf(t)];
      if (!s || !ts) return null;
      const a = s.localToGlobal(s.slipWidth / 2, s.slipHeight / 2),
        b = ts.localToGlobal(t.box.w / 2, t.box.h / 2);
      return { from: { x: a.x, y: a.y }, to: { x: b.x, y: b.y } };
    },
    root
  };
}
