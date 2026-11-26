// 一案的画面：现场在下，上面一条木色的横栏写着案名，右边是卷宗、笔录、提示、菜单；左下角是词囊里的词数。
// 点证物打开卷片，卷宗里核验，全部核实就结案（最后一案还要写判词）。第一案由仵作老秦一步一步教。
// One case on screen: the scene underneath, a wooden bar across the top with the case's name and, on the right, the
// dossier, notes, hint and menu; the number of words in the pouch at the bottom left. Tapping evidence opens its card,
// the dossier is where pages are checked, and when every page is sealed the case closes (the last case asks for the
// verdict first). In the first case Old Qin, the coroner's aide, teaches each step.
import { Sprite } from '@egret/engine';
import { createBrowserHoverInput } from '@egret/engine/web/hover';
import { planLinearLayout } from '@egret/engine/layout';
import { caseById } from '../sim/cases/index.mjs';
import { caseState, collect, nextHint, pagesDone, seeSpot, wordsOfSpot } from '../sim/rules.mjs';
import { openCard } from './card.mjs';
import { openDossier } from './dossier.mjs';
import { openNotes } from './notes.mjs';
import { openVerdict } from './verdict.mjs';
import { buildScene } from './scene.mjs';
import { SCENES, caseArt, pictureOf } from './scenes.mjs';
import { INK, PAPER, VERMILION } from './type.mjs';
import { WOOD, hitBox, kids, shown } from './ui.mjs';

export async function caseScreen(app, layer, caseId) {
  const { game, type, kit } = app;
  const lang = app.lang();
  const c = caseById(caseId);
  const st = caseState(app.progress(), caseId);
  const portrait = game.height > game.width;
  if (!st.opened) {
    st.opened = true;
    app.save();
  }
  const topH = 64,
    bottomH = portrait ? 116 : 0;
  const area = { x: 0, y: 0, w: game.width, h: game.height - bottomH };
  const sceneLayer = new Sprite();
  layer.addChild(sceneLayer);
  const L = SCENES[caseId];
  // The case's pictures as one group, held while the case is open.
  const pictureScope = game.engine.createScope();
  await app.pictures.group(caseArt(caseId, app.quality === 'low').map(app.art), pictureScope);
  const scene = await buildScene(sceneLayer, c, L, {
    game,
    art: app.art,
    artInfo: app.artInfo,
    pictures: app.pictures,
    quality: app.quality,
    area,
    seen: (id) => st.seen.includes(id),
    wordsLeft: (id) => wordsOfSpot(c, id).filter((w) => !st.found.includes(w)).length
  });

  // Input on the scene: tap to open evidence, drag to pan, pinch to zoom; the mouse hovers and its wheel zooms.
  const input = new Sprite();
  layer.addChild(input);
  hitBox(input, area.x, area.y, area.w, area.h);
  game.onTap(input, () => {
    const [sx, sy] = scene.toScene(game.pointer.x, game.pointer.y);
    const hit = scene.spotAt(sx, sy);
    if (hit) openSpot(hit.id);
  });
  let pinchFrom = 1;
  game.gestures(input, {
    drag: (d) => scene.pan(d.dx, d.dy),
    pinch: (p) => {
      if (p.phase === 'start' || p.scale === 1) pinchFrom = 1;
      scene.zoomBy(p.scale / pinchFrom);
      pinchFrom = p.scale;
    }
  });
  let hover = null;
  const hoverScope = game.engine.createScope();
  try {
    hover = createBrowserHoverInput({ engine: game.engine, scope: hoverScope, canvas: game.canvas, width: game.width, height: game.height });
    // Hover gives stage points; the scene works in the game's units.
    const inGame = (e) => {
      const o = game.ui.localToGlobal(0, 0);
      hoverAt(e.payload.globalX - o.x, e.payload.globalY - o.y);
    };
    input.on?.(hover.events.move, inGame);
    input.on?.(hover.events.enter, inGame);
    input.on?.(hover.events.leave, () => hoverAt(null));
    input.on?.(hover.events.wheel, (e) => {
      scene.zoomBy(e.payload.deltaY < 0 ? 1.12 : 1 / 1.12, game.pointer.x, game.pointer.y);
      e.preventDefault?.();
    });
  } catch (cause) {
    hover = null;
  }
  function hoverAt(x, y) {
    const id = x === null || overlay ? null : scene.spotAt(...scene.toScene(x, y))?.id ?? null;
    if (id !== hoverId) {
      hoverId = id;
      scene.setHover(id);
      if (game.canvas?.style) game.canvas.style.cursor = id ? 'pointer' : 'grab';
      tag.visible = !!id;
      if (id) tag.setText(c.spots[id].title[lang]);
    }
    if (id) {
      tag.x = Math.min(game.width - 120, x + 18);
      tag.y = Math.max(topH + 6, y - 44);
    }
  }
  let hoverId = null;
  const tag = type.label(layer, '', { size: 20, colour: PAPER });
  tag.visible = false;

  // ---- chrome ----
  const bar = new Sprite();
  layer.addChild(bar);
  bar.graphics.beginFill(WOOD, 0.9).drawRect(0, 0, game.width, topH).endFill();
  bar.graphics.beginFill(0xc9a75a, 0.9).drawRect(0, topH - 3, game.width, 3).endFill();
  const title = type.label(bar, c.title[lang], { size: 30, brush: true, colour: PAPER, middle: true });
  title.x = 22;
  title.y = topH / 2;
  const tools = [
    ['dossier', () => openDossierNow()],
    ['notes', () => openNotesNow()],
    ['hint', () => hint()],
    ['menu', () => openMenu()]
  ];
  const toolLayer = new Sprite();
  layer.addChild(toolLayer);
  const bw = portrait ? Math.floor((game.width - 40) / 4) - 8 : 112;
  // Upright on a phone the tools are tall enough for a finger (one stage unit is about half a CSS pixel there).
  const th = portrait ? 80 : 48;
  const plan = planLinearLayout({ axis: 'horizontal', items: tools.map(() => ({ width: bw, height: th })), gap: 8 });
  toolLayer.x = portrait ? (game.width - plan.width) / 2 : game.width - plan.width - 16;
  toolLayer.y = portrait ? game.height - bottomH + 18 : 8;
  if (portrait) {
    const foot = new Sprite();
    layer.addChildAt?.(foot, layer.getChildIndex?.(toolLayer) ?? 0);
    foot.graphics.beginFill(WOOD, 0.94).drawRect(0, game.height - bottomH, game.width, bottomH).endFill();
    layer.addChild(toolLayer);
  }
  const toolButtons = tools.map(([key, fn], i) => kit.button(toolLayer, app.say(key), { x: plan.placements[i].x + bw / 2, y: th / 2, w: bw, h: th, size: portrait ? 28 : 22, primary: key === 'dossier' }, fn));
  const pouchTag = new Sprite();
  layer.addChild(pouchTag);
  pouchTag.x = 16;
  pouchTag.y = (portrait ? game.height - bottomH : game.height) - 62;
  const pouchLabel = type.label(pouchTag, '', { size: 21, colour: PAPER, middle: true });
  pouchLabel.x = 16;
  pouchLabel.y = 23;
  const drawPouch = () => {
    const total = Object.keys(c.words).length;
    pouchTag.graphics.clear();
    pouchTag.graphics.beginFill(WOOD, 0.85).drawRect(0, 0, 200, 46).endFill();
    pouchTag.graphics.beginFill(VERMILION, 1).drawRect(0, 0, 5, 46).endFill();
    pouchLabel.setText(`${app.say('pouch')}  ${st.found.length} / ${total}`);
  };
  drawPouch();
  hitBox(pouchTag, 0, 0, 200, 46);
  game.onTap(pouchTag, () => openDossierNow());

  // A hint shows on a strip of paper above the bottom edge.
  const hintStrip = new Sprite();
  layer.addChild(hintStrip);
  hintStrip.visible = false;
  const hintScope = game.engine.createScope();
  let hintPara = null;
  async function showHintText(text) {
    for (const ch of kids(hintStrip)) type.discard(ch);
    hintStrip.graphics.clear();
    const w = Math.min(game.width - 40, 900);
    hintPara = type.paragraph(hintScope, { text, width: w - 80, size: 22, locale: lang, colour: INK });
    const m = await hintPara.ready;
    const h = m.height + 36;
    hintStrip.x = (game.width - w) / 2;
    hintStrip.y = (portrait ? game.height - bottomH : game.height) - h - 76;
    hintStrip.graphics.beginFill(PAPER, 0.97).drawRect(0, 0, w, h).endFill();
    hintStrip.graphics.beginFill(0xc9a75a, 1).drawRect(0, 0, 6, h).endFill();
    hintStrip.graphics.lineStyle(1, 0x6b5236, 0.8).drawRect(0, 0, w, h);
    hintStrip.graphics.lineStyle(0, 0, 0);
    hintPara.holder.x = 30;
    hintPara.holder.y = 18;
    hintStrip.addChild(hintPara.holder);
    hitBox(hintStrip, 0, 0, w, h);
    hintStrip.visible = true;
    hintStrip.alpha = 1;
    game.tween(hintStrip).wait(9).to({ alpha: 0 }, 0.6).call(() => (hintStrip.visible = false));
  }
  game.onTap(hintStrip, () => (hintStrip.visible = false));

  const qin = new Sprite();
  layer.addChild(qin);
  // ---- overlays ----
  const overlayLayer = new Sprite();
  layer.addChild(overlayLayer);
  let overlay = null;
  let disposed = false;
  let closingCase = false;
  const common = {
    ...app,
    st,
    lang: app.lang,
    case: c,
    picture: (spotId) => pictureOf(caseId, spotId),
    onClose: () => {
      overlay = null;
      if (disposed) return;
      scene.root.visible = true;
      // A lesson given over the dossier goes with it.
      if (layer.getChildIndex(qin) > layer.getChildIndex(overlayLayer)) {
        qin.visible = false;
        layer.setChildIndex(qin, layer.getChildIndex(overlayLayer));
      }
      app.setFocus(screenFocus());
      drawPouch();
    }
  };
  async function openSpot(id) {
    if (overlay) return;
    hoverAt(null);
    const fresh = seeSpot(st, c, id);
    if (fresh) app.save();
    app.sound.play('paper');
    overlay = { kind: 'card' };
    overlay = await openCard(overlayLayer, c, id, {
      ...common,
      found: (w) => st.found.includes(w),
      collect: (w) => {
        const got = collect(st, c, w);
        if (got) {
          app.save();
          app.sound.play('collect');
          kit.toast(app.say('collected', { w: c.words[w][lang] }), { seconds: 1.4 });
          drawPouch();
          teach('words', st.found.length >= 4);
        }
        return got;
      }
    });
    overlay.kind = 'card';
    app.setFocus(overlay.focus);
  }
  async function openDossierNow(page) {
    if (overlay && overlay.kind !== 'card') return;
    overlay?.close?.();
    overlay = { kind: 'dossier' };
    qin.visible = false;
    app.sound.play('open');
    overlay = await openDossier(
      overlayLayer,
      c,
      {
        ...common,
        onFocus: (list) => app.setFocus(list),
        onSealed: finishCase,
        onChecked: (result) => result === 'near' && teach('near', true),
        onHint: (pageId) => hint(pageId)
      },
      page
    );
    overlay.kind = 'dossier';
    // The dossier covers the whole stage: the scene under it is not drawn meanwhile (fewer images in each frame).
    scene.root.visible = false;
    teach('names', true);
  }
  function openNotesNow() {
    if (overlay && !overlay.close) return;
    overlay?.close();
    try {
      overlay = { ...openNotes(overlayLayer, common), kind: 'notes' };
      app.setFocus(overlay.focus);
    } catch (cause) {
      common.onClose();
      console.warn('notes', cause);
      kit.toast(app.say('loadFailed'));
    }
  }
  function openVerdictNow() {
    if (disposed || overlay?.kind === 'verdict') return;
    overlay?.close?.();
    overlay = openVerdict(overlayLayer, c, {
      ...common,
      board: app.board,
      onDone: () => {
        app.sound.music('closed');
        app.go('outro', caseId);
      }
    });
    overlay.kind = 'verdict';
    app.setFocus(overlay.focus);
  }
  function openMenu() {
    if (overlay) overlay.close?.();
    overlay = app.pauseMenu(overlayLayer, caseId, () => {
      overlay?.root && type.discard(overlay.root);
      common.onClose();
    });
    overlay.kind = 'menu';
    app.setFocus(overlay.focus);
  }
  function finishCase() {
    // Adjacent page seals can finish animating after all pages are already checked.
    if (disposed || closingCase || !pagesDone(st, c)) return;
    closingCase = true;
    if (c.verdict) {
      if (!st.solved) openVerdictNow();
      return;
    }
    app.sound.music('closed');
    game.after(game.reducedMotion ? 0.2 : 0.8, () => {
      if (!disposed) void app.go('outro', caseId);
    });
  }
  function hint(pageId) {
    const h = nextHint(st, c, pageId);
    app.save();
    if (!h) return void showHintText(app.say('hintNone'));
    app.sound.play('hint');
    if (overlay && overlay.kind === 'dossier' && h.level < 3) overlay.close();
    const page = c.pages.find((p) => p.id === h.page);
    const where = app.say('hintFor', { page: page.title[lang] });
    let text;
    if (h.level === 1) text = `${where}：${app.say('hintArea')}`;
    else if (h.level === 2) text = `${where}：${app.say('hintSpots', { spots: h.spots.map((s) => c.spots[s].title[lang]).join(lang === 'zh' ? '、' : ', ') })}`;
    else text = `${where}：${app.say('hintWhy', { why: h.why[lang] })}`;
    if (lang === 'en') text = text.replace('：', ': ');
    if (h.level < 3) scene.showSpots(h.spots);
    if (overlay && overlay.kind === 'dossier') overlay.showHint?.(text);
    void showHintText(text);
  }

  // Old Qin's lessons, once each, in the first case only.
  let qinUntil = 0;
  async function teach(step, when) {
    if (!c.teach?.[step] || !when) return;
    st.taught ??= [];
    if (st.taught.includes(step)) return;
    st.taught.push(step);
    app.save();
    for (const ch of kids(qin)) type.discard(ch);
    qin.graphics.clear();
    // Over the dossier while it is open (its lessons are about the dossier), under the evidence cards otherwise. Over
    // the dossier it sits low in the pouch's column, clear of the page and its seal.
    const onDossier = overlay?.kind === 'dossier';
    const below = layer.getChildIndex(overlayLayer) - (layer.getChildIndex(qin) < layer.getChildIndex(overlayLayer) ? 1 : 0);
    layer.setChildIndex(qin, onDossier ? layer.numChildren - 1 : below);
    const w = onDossier && !portrait ? Math.max(380, game.width - 836) : Math.min(game.width - 30, 760);
    const words = type.paragraph(hintScope, { text: c.teach[step][lang], width: w - 170, size: 20, locale: lang });
    const measured = await words.ready;
    const h = Math.max(150, (measured?.height ?? 90) + 66);
    qin.x = onDossier ? game.width - w - 30 : (game.width - w) / 2;
    qin.y = onDossier ? game.height - h - 30 : (portrait ? game.height - bottomH : game.height) - h - 70;
    qin.graphics.beginFill(PAPER, 0.98).drawRect(0, 0, w, h).endFill();
    qin.graphics.lineStyle(2, 0x6b5236, 0.9).drawRect(5, 5, w - 10, h - 10);
    qin.graphics.lineStyle(0, 0, 0);
    const face = new Sprite();
    face.mask = { x: 0, y: 0, width: 120, height: Math.min(h - 20, 180) };
    face.x = 12;
    face.y = 10;
    qin.addChild(face);
    const info = app.artInfo('f-qin');
    if (info) await app.pictures.image(app.art('f-qin'), { layer: face, x: 70, y: (info.h * (200 / info.w)) / 2 - 6, width: 200, height: info.h * (200 / info.w) });
    const who = type.label(qin, lang === 'zh' ? '仵作老秦' : 'Old Qin', { size: 20, brush: true, colour: VERMILION });
    who.x = 146;
    who.y = 16;
    words.holder.x = 146;
    words.holder.y = 48;
    qin.addChild(words.holder);
    hitBox(qin, 0, 0, w, h);
    qin.size = { w, h };
    qin.visible = true;
    qin.alpha = 1;
    qinUntil = game.time + 12;
  }
  game.onTap(qin, () => (qin.visible = false));
  qin.visible = false;

  function screenFocus() {
    const spots = scene.spots.map((s) => ({
      get sprite() {
        return input;
      },
      get ox() {
        return scene.toStage(s.rect[0], s.rect[1])[0];
      },
      get oy() {
        return scene.toStage(s.rect[0], s.rect[1])[1];
      },
      get w() {
        return s.rect[2] * (scene.toStage(1, 0)[0] - scene.toStage(0, 0)[0]);
      },
      get h() {
        return s.rect[3] * (scene.toStage(1, 0)[0] - scene.toStage(0, 0)[0]);
      },
      activate: () => openSpot(s.id),
      onFocus: () => scene.focusSpot(s.id)
    }));
    return [...spots, ...toolButtons.map((b) => b.focusRecord)];
  }
  app.setFocus(screenFocus());
  // Each piece of evidence is a button in the semantic tree too, where it is drawn, while no card or page covers it.
  const spotNodes = (app.semantics ? scene.spots : []).map((sp) =>
    app.semantics.add({
      id: `spot-${caseId}-${sp.id}`,
      role: 'button',
      onActivate: () => openSpot(sp.id),
      describe: () => {
        const [x0, y0] = scene.toStage(sp.rect[0], sp.rect[1]),
          [x1, y1] = scene.toStage(sp.rect[0] + sp.rect[2], sp.rect[1] + sp.rect[3]),
          o = game.ui.localToGlobal(0, 0);
        const off = x1 < 0 || x0 > game.width || y1 < 0 || y0 > game.height;
        return { name: c.spots[sp.id]?.title[lang] ?? sp.id, bounds: { x: x0 + o.x, y: y0 + o.y, width: x1 - x0, height: y1 - y0 }, hidden: !!overlay || off || !shown(sceneLayer) };
      }
    })
  );
  app.sound.music('scene');
  void teach('start', true);
  if (st.solved === false && c.verdict && pagesDone(st, c)) game.after(0.5, () => openVerdictNow());

  return {
    name: 'case',
    caseId,
    focus: screenFocus(),
    scene,
    get overlay() {
      return overlay;
    },
    openSpot,
    /** For tests: the stage point at the middle of a spot. */
    /** For tests: the middle of Old Qin's note while it shows, in stage units. */
    teachPoint: () => (qin.visible && qin.size ? qin.localToGlobal(qin.size.w / 2, qin.size.h / 2) : null),
    spotPoint: (id) => {
      const r = scene.spots.find((x) => x.id === id)?.rect;
      if (!r) return null;
      const [x, y] = scene.toStage(r[0] + r[2] / 2, r[1] + r[3] / 2),
        p = scene.root.parent.localToGlobal(x, y);
      return [p.x, p.y];
    },
    openDossier: openDossierNow,
    openNotes: openNotesNow,
    openVerdict: openVerdictNow,
    hint,
    back() {
      if (overlay) {
        if (overlay.kind === 'menu') {
          type.discard(overlay.root);
          common.onClose();
        } else overlay.close?.();
        return true;
      }
      openMenu();
      return true;
    },
    keys: {
      j: () => (overlay?.kind === 'dossier' ? overlay.close?.() : openDossierNow()),
      n: () => (overlay?.kind === 'notes' ? overlay.close?.() : openNotesNow()),
      h: () => hint(overlay?.kind === 'dossier' ? overlay.page : undefined)
    },
    pan: (dx, dy) => !overlay && scene.pan(dx, dy),
    zoom: (f) => !overlay && scene.zoomBy(f),
    update(dt) {
      if (scene.root.visible) scene.update(dt);
      if (qin.visible && game.time > qinUntil) qin.visible = false;
      if (!hover && game.device === 'mouse' && !game.pointer.down) hoverAt(game.pointer.x, game.pointer.y);
      if (game.pointer.wheel && !hover && !overlay) scene.zoomBy(game.pointer.wheel < 0 ? 1.12 : 1 / 1.12, game.pointer.x, game.pointer.y);
    },
    dispose() {
      disposed = true;
      overlay?.close?.();
      for (const node of spotNodes) node.remove();
      hintScope.dispose();
      hoverScope.dispose();
      pictureScope.dispose();
      if (game.canvas?.style) game.canvas.style.cursor = '';
    }
  };
}
