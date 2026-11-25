// 卷外的几页：标题、序言、卷目、每案前的申状与结案、终卷、设置、说明。每一页都是在 `layer` 里搭出的精灵，
// 返回键盘焦点的列表；横屏和竖屏各排一种版式。
// The pages outside the cases: the title, the prologue, the list of cases, each case's report before and its closing
// after, the end, settings and help. Each is built from sprites in `layer` and returns its list of keyboard stops,
// with one arrangement for a wide screen and one for a tall one.
import { Sprite } from '@egret/engine';
import { planLinearLayout } from '@egret/engine/layout';
import { CASES, PROLOGUE, SCROLLS, caseById } from '../sim/cases/index.mjs';
import { summary } from '../sim/rules.mjs';
import { INK, PAPER, VERMILION } from './type.mjs';
import { FAINT, RULE, WOOD, at, hitBox } from './ui.mjs';

/** A painting that covers the whole stage, drifting slowly sideways unless motion is reduced. */
async function backdrop(app, layer, artId, { dim = 0 } = {}) {
  const { game } = app;
  const info = app.artInfo(artId);
  const holder = new Sprite();
  layer.addChild(holder);
  if (!info) return { update() {} };
  const s = Math.max(game.width / info.w, game.height / info.h);
  const w = info.w * s,
    h = info.h * s;
  // The half-size picture whenever it is enough for the pixels it covers (and always at low quality): a backdrop drawn
  // every frame costs much less from it.
  const low = app.quality === 'low' || w * app.type.density() <= (info.w / 2) * 1.15;
  await app.pictures.image(app.art(artId + (low ? '-low' : '')), { layer: holder, x: game.width / 2, y: game.height / 2, width: w, height: h });
  if (dim) {
    const veil = new Sprite();
    veil.graphics.beginFill(0x1a120a, dim).drawRect(0, 0, game.width, game.height).endFill();
    holder.addChild(veil);
  }
  // The backdrop stands still: a still screen keeps its last frame (play draws on demand), where a slow drift of the
  // whole painting made every frame be drawn again.
  return { update() {} };
}

/** A column of buttons placed by the engine's linear layout planner. */
function buttonColumn(app, parent, items, { x, y, w = 240, h = 58, gap = 14, size = 26 }) {
  const plan = planLinearLayout({ axis: 'vertical', items: items.map(() => ({ width: w, height: h })), gap });
  return items.map(([text, onTap, primary], i) => app.kit.button(parent, text, { x: x + w / 2, y: y + plan.placements[i].y + h / 2, w, h, primary, size }, onTap));
}

export async function titleScreen(app, layer) {
  const { game, type, kit } = app;
  const lang = app.lang();
  const portrait = game.height > game.width;
  const back = await backdrop(app, layer, 'bg-title');
  // The title in one vertical column of brush characters: the paragraph is one character wide, so each one breaks
  // onto its own line. (The engine's paragraph has no vertical writing mode; see ENGINE-NOTES.)
  const scope = game.engine.createScope();
  const size = portrait ? 96 : 100;
  const strip = new Sprite();
  layer.addChild(strip);
  const stripH = size * 4 * 1.12 + 60;
  strip.x = portrait ? game.width / 2 - size / 2 - 30 : game.width - size - 150;
  strip.y = portrait ? 70 : (game.height - stripH) / 2 - 34;
  strip.graphics.beginFill(PAPER, 0.93).drawRect(0, 0, size + 60, stripH).endFill();
  strip.graphics.lineStyle(2, RULE, 0.9).drawRect(6, 6, size + 48, stripH - 12);
  strip.graphics.lineStyle(0, 0, 0);
  const t = type.paragraph(scope, { text: app.say('title', {}, 'zh'), width: size * 1.05, size, brush: true, lineHeight: Math.round(size * 1.12), colour: INK, align: 'center' });
  t.holder.x = 30 - size * 0.025;
  t.holder.y = 30;
  strip.addChild(t.holder);
  kit.seal(strip, size + 60 - 8, stripH + 10, 64, '洗冤');
  const sub = type.label(layer, lang === 'zh' ? 'The Inquest Scrolls' : app.say('subtitle'), { size: 24, colour: PAPER, align: 'center' });
  sub.x = strip.x + (size + 60) / 2;
  sub.y = strip.y + stripH + 40;
  if (lang === 'en') {
    const en = type.label(layer, 'The Inquest Scrolls', { size: 40, colour: PAPER, brush: false, align: 'center' });
    en.x = sub.x;
    en.y = strip.y + stripH + 74;
  }
  const started = Object.values(app.progress().cases).some((s) => s.opened);
  const menu = new Sprite();
  layer.addChild(menu);
  const items = [
    [started ? app.say('resume') : app.say('begin'), () => app.go(started ? 'resume' : 'begin'), true],
    [app.say('caseList'), () => app.go('list')],
    [app.say('settings'), () => app.overlay('settings')],
    [app.say('help'), () => app.overlay('help')]
  ];
  // On a phone held upright one stage unit is about half a CSS pixel: buttons there are made tall enough for a finger.
  const bh = portrait ? 84 : 58;
  const bx = portrait ? game.width / 2 - 180 : 120,
    by = portrait ? game.height - 4 * (bh + 14) - 40 : game.height - 4 * 72 - 70;
  const buttons = buttonColumn(app, menu, items, { x: bx, y: by, w: portrait ? 360 : 260, h: bh, size: portrait ? 32 : 26 });
  const langBtn = kit.button(layer, lang === 'zh' ? 'English' : '中文', { x: game.width - (portrait ? 110 : 90), y: portrait ? 56 : 42, w: portrait ? 180 : 140, h: portrait ? 84 : 46, size: portrait ? 26 : 20, brush: false }, () => app.setLanguage(lang === 'zh' ? 'en' : 'zh'));
  if (app.notice) {
    const n = kit.panel(layer, (game.width - Math.min(640, game.width - 40)) / 2, 16, Math.min(640, game.width - 40), 60, { shadow: false });
    at(type.label(n, app.notice, { size: 19, colour: VERMILION, align: 'center', middle: true }), n.panelWidth / 2, 30);
    n.name = 'notice';
    app.notice = null;
  }
  return { focus: [...buttons.map((b) => b.focusRecord), langBtn.focusRecord], update: (dt) => back.update(dt), dispose: () => scope.dispose(), name: 'title' };
}

/** A page of story: a painting behind, a sheet of paper with a heading and paragraphs, and buttons under it. */
async function storyPage(app, layer, { art, heading, paragraphs, buttons: given, seal }) {
  const { game, type, kit } = app;
  const lang = app.lang();
  const portrait = game.height > game.width;
  const back = await backdrop(app, layer, art, { dim: 0.35 });
  const scope = game.engine.createScope();
  const W = portrait ? game.width - 40 : 860;
  const X = (game.width - W) / 2;
  const sheet = kit.panel(layer, X, portrait ? 60 : 44, W, portrait ? game.height - 120 : game.height - 88);
  const head = type.label(sheet, heading, { size: 38, brush: true, align: 'center' });
  head.x = W / 2;
  head.y = 34;
  const size = lang === 'zh' ? (portrait ? 25 : 26) : portrait ? 22 : 23;
  const para = type.paragraph(scope, { text: paragraphs.join('\n\n'), width: W - 100, size, lineHeight: Math.round(size * 1.75), locale: lang });
  para.holder.x = 50;
  para.holder.y = 104;
  sheet.addChild(para.holder);
  await para.ready;
  if (seal) kit.stamp(sheet, W - 80, 70, 84, seal);
  const row = new Sprite();
  sheet.addChild(row);
  const bh = portrait ? 84 : 56;
  const plan = planLinearLayout({ axis: 'horizontal', items: given.map(() => ({ width: 210, height: bh })), gap: 18 });
  row.x = (W - plan.width) / 2;
  row.y = sheet.panelHeight - bh - 36;
  const buttons = given.map(([text, onTap, primary], i) => kit.button(row, text, { x: plan.placements[i].x + 105, y: bh / 2, w: 210, h: bh, primary, size: portrait ? 30 : 25 }, onTap));
  // The primary button (open, next) holds the focus first, so Enter goes on with the story.
  return { focus: buttons.map((b) => b.focusRecord), focusStart: Math.max(0, given.findIndex((b) => b[2])), update: (dt) => back.update(dt), dispose: () => scope.dispose() };
}

export function prologueScreen(app, layer) {
  return storyPage(app, layer, {
    art: 'bg-title',
    heading: app.say('prologueTitle'),
    paragraphs: PROLOGUE[app.lang()],
    buttons: [[app.say('next'), () => app.go('intro', 'c1'), true]]
  }).then((s) => ({ ...s, name: 'prologue' }));
}

export function introScreen(app, layer, caseId) {
  const c = caseById(caseId);
  const lang = app.lang();
  return storyPage(app, layer, {
    art: app.sceneArt(caseId),
    heading: `${c.title[lang]}`,
    paragraphs: [`${c.place[lang]} · ${c.time[lang]}`, ...c.intro[lang]],
    buttons: [
      [app.say('back'), () => app.go('list')],
      [app.say('open'), () => app.go('case', caseId), true]
    ]
  }).then((s) => ({ ...s, name: 'intro' }));
}

export function outroScreen(app, layer, caseId) {
  const c = caseById(caseId);
  const lang = app.lang();
  const i = CASES.findIndex((x) => x.id === caseId);
  const next = CASES[i + 1];
  const buttons = [[app.say('toList'), () => app.go('list')]];
  if (next) buttons.push([app.say('nextCase'), () => app.go('intro', next.id), true]);
  else buttons.push([app.say('end'), () => app.go('ending'), true]);
  return storyPage(app, layer, { art: app.sceneArt(caseId), heading: `${app.say('caseClosed')} · ${c.title[lang]}`, paragraphs: c.outro[lang], buttons, seal: '结案' }).then((s) => ({ ...s, name: 'outro' }));
}

export function endingScreen(app, layer) {
  const c = caseById('c6');
  return storyPage(app, layer, {
    art: 'bg-title',
    heading: app.say('end'),
    paragraphs: c.ending[app.lang()],
    buttons: [
      [app.say('toList'), () => app.go('list')],
      [app.say('title'), () => app.go('title'), true]
    ],
    seal: '洗冤'
  }).then((s) => ({ ...s, name: 'ending' }));
}

export async function listScreen(app, layer) {
  const { game, type, kit } = app;
  const lang = app.lang();
  const portrait = game.height > game.width;
  const back = await backdrop(app, layer, 'bg-title', { dim: 0.45 });
  const head = type.label(layer, app.say('caseList'), { size: 40, brush: true, colour: PAPER, align: 'center' });
  head.x = game.width / 2;
  head.y = portrait ? 26 : 18;
  const focus = [];
  const colW = portrait ? game.width - 40 : 392,
    colH = portrait ? 352 : 560;
  SCROLLS.forEach((scroll, i) => {
    const x = portrait ? 20 : 34 + i * (colW + 18);
    const y = portrait ? 92 + i * (colH + 14) : 86;
    const p = kit.panel(layer, x, y, colW, colH);
    const t = type.label(p, scroll.title[lang], { size: 26, brush: true, align: 'center' });
    t.x = colW / 2;
    t.y = 22;
    scroll.cases.forEach((id, j) => {
      const c = caseById(id);
      const s = summary(app.progress(), id);
      const cardH = portrait ? 132 : 220;
      const card = new Sprite();
      card.x = 22;
      card.y = (portrait ? 64 : 76) + j * (cardH + (portrait ? 14 : 22));
      p.addChild(card);
      const cw = colW - 44;
      const g = card.graphics;
      g.beginFill(s.unlocked ? 0xfbf5e6 : 0xd9cfbd, 1).drawRect(0, 0, cw, cardH).endFill();
      g.beginFill(s.solved ? VERMILION : s.unlocked ? WOOD : FAINT, 1).drawRect(0, 0, 8, cardH).endFill();
      g.lineStyle(1, RULE, 0.8).drawRect(0, 0, cw, cardH);
      g.lineStyle(0, 0, 0);
      const name = type.label(card, `${'一二三四五六'[CASES.indexOf(c)]} · ${c.title[lang]}`, { size: lang === 'zh' ? 28 : 23, brush: lang === 'zh', colour: s.unlocked ? INK : FAINT });
      name.x = 24;
      name.y = 18;
      const place = type.label(card, c.place[lang], { size: 17, colour: FAINT });
      place.x = 24;
      place.y = portrait ? 62 : 70;
      const status = !s.unlocked ? app.say('locked') : s.solved ? app.say('solved') : app.say('sealedOf', { n: s.sealed, m: s.pages });
      const st = type.label(card, status, { size: 19, colour: s.solved ? VERMILION : INK });
      st.x = 24;
      st.y = portrait ? 94 : 110;
      if (s.unlocked && s.hints) {
        const h = type.label(card, app.say('hintsUsed', { n: s.hints }), { size: 16, colour: FAINT });
        h.x = 24;
        h.y = portrait ? 94 : 146;
        if (portrait) h.x = cw - 140;
      }
      if (s.solved) kit.seal(card, cw - 52, cardH / 2, 64, '结案');
      hitBox(card, 0, 0, cw, cardH);
      const open = () => {
        if (!s.unlocked) return kit.toast(app.say('locked'));
        app.sound.play('paper');
        app.go(s.solved || app.progress().cases[id]?.opened ? 'case' : 'intro', id);
      };
      game.onTap(card, open);
      focus.push({ sprite: card, ox: 0, oy: 0, w: cw, h: cardH, activate: open });
    });
  });
  const backBtn = kit.button(layer, app.say('back'), { x: 90, y: portrait ? 44 : 40, w: 130, h: 46, size: 22 }, () => app.go('title'));
  focus.push(backBtn.focusRecord);
  return { focus, update: (dt) => back.update(dt), name: 'list' };
}

/** Settings as an overlay on whatever screen is showing. */
export function settingsOverlay(app, layer, close) {
  const { game, type, kit } = app;
  const lang = app.lang();
  const root = new Sprite();
  layer.addChild(root);
  kit.veil(root, 0.45, close);
  const W = Math.min(560, game.width - 40),
    H = 470;
  const p = kit.panel(root, (game.width - W) / 2, (game.height - H) / 2, W, H);
  hitBox(p, 0, 0, W, H);
  game.onTap(p, () => {});
  const head = type.label(p, app.say('settings'), { size: 34, brush: true, align: 'center' });
  head.x = W / 2;
  head.y = 24;
  const s = app.settings();
  const rows = [
    ['language', () => (lang === 'zh' ? '中文' : 'English'), () => app.setLanguage(lang === 'zh' ? 'en' : 'zh')],
    ['sound', () => app.say(app.settings().sound ? 'on' : 'off'), () => app.setSetting('sound', !app.settings().sound)],
    ['music', () => app.say(app.settings().music ? 'on' : 'off'), () => app.setSetting('music', !app.settings().music)],
    ['reducedMotion', () => app.say(app.settings().reducedMotion ? 'on' : 'off'), () => app.setSetting('reducedMotion', !app.settings().reducedMotion)]
  ];
  const focus = [];
  const plan = planLinearLayout({ axis: 'vertical', items: rows.map(() => ({ width: W - 80, height: 56 })), gap: 10 });
  rows.forEach(([key, value, toggle], i) => {
    const y = 96 + plan.placements[i].y;
    const l = type.label(p, app.say(key), { size: 24, middle: true });
    l.x = 44;
    l.y = y + 28;
    const b = kit.button(p, value(), { x: W - 130, y: y + 28, w: 170, h: 48, size: 22, brush: false }, () => {
      toggle();
      b.setText(value());
    });
    focus.push(b.focusRecord);
  });
  const reset = kit.button(p, app.say('resetProgress'), { x: 130, y: H - 56, w: 190, h: 50, size: 22 }, () => app.confirm(app.say('resetAsk'), () => app.resetProgress()));
  const done = kit.button(p, app.say('close'), { x: W - 110, y: H - 56, w: 160, h: 50, primary: true, size: 24 }, close);
  focus.push(reset.focusRecord, done.focusRecord);
  void s;
  return { root, focus };
}

export function helpOverlay(app, layer, close) {
  const { game, type, kit } = app;
  const lang = app.lang();
  const root = new Sprite();
  layer.addChild(root);
  kit.veil(root, 0.45, close);
  const portrait = game.height > game.width;
  const W = portrait ? game.width - 30 : 900,
    H = portrait ? game.height - 60 : game.height - 60;
  const p = kit.panel(root, (game.width - W) / 2, (game.height - H) / 2, W, H);
  hitBox(p, 0, 0, W, H);
  game.onTap(p, () => {});
  const head = type.label(p, app.say('help'), { size: 34, brush: true, align: 'center' });
  head.x = W / 2;
  head.y = 22;
  const scope = game.engine.createScope();
  const size = lang === 'zh' ? 22 : 20;
  const body = type.paragraph(scope, { text: app.say('helpBody') + '\n\n' + app.say('keysHint'), width: W - 80, size, lineHeight: Math.round(size * 1.7), locale: lang });
  body.holder.x = 40;
  body.holder.y = 86;
  p.addChild(body.holder);
  const done = kit.button(p, app.say('close'), { x: W / 2, y: H - 50, w: 180, h: 50, primary: true, size: 24 }, close);
  return { root, focus: [done.focusRecord], dispose: () => scope.dispose() };
}

/** A yes-or-no question over everything. */
export function confirmOverlay(app, layer, question, yes, close) {
  const { game, type, kit } = app;
  const root = new Sprite();
  layer.addChild(root);
  kit.veil(root, 0.5, close);
  const W = Math.min(560, game.width - 40),
    H = 230;
  const p = kit.panel(root, (game.width - W) / 2, (game.height - H) / 2, W, H);
  hitBox(p, 0, 0, W, H);
  game.onTap(p, () => {});
  const scope = game.engine.createScope();
  const q = type.paragraph(scope, { text: question, width: W - 70, size: 23, locale: app.lang(), align: 'center' });
  q.holder.x = 35;
  q.holder.y = 34;
  p.addChild(q.holder);
  const no = kit.button(p, app.say('no'), { x: W / 2 - 110, y: H - 52, w: 170, h: 50, size: 24 }, close);
  const ok = kit.button(p, app.say('yes'), { x: W / 2 + 110, y: H - 52, w: 170, h: 50, primary: true, size: 24 }, () => {
    close();
    yes();
  });
  return { root, focus: [no.focusRecord, ok.focusRecord], dispose: () => scope.dispose() };
}
