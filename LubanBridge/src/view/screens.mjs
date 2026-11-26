// 标题、选关、结算、手记、菜单、设置、帮助和确认。选关的版面由引擎的 web/view 按描述排好（横屏五章一行一章，
// 竖屏一样），这里照排好的方框画按钮。
// The title, level choice, results, the carpenter's notes, the menu, settings, help and questions. The level choice is
// laid out by the engine's web/view from a description (a row a chapter, wide or tall), and buttons are drawn in the
// boxes it gives.
import { Sprite } from '@egret/engine';
import { titleArt, makeArtRetry } from './art.mjs';
import { planView } from '@egret/engine/web/view';
import { CHAPTERS, LEVELS } from '../sim/levels.mjs';
import { VEHICLES, weightOf } from '../sim/vehicles.mjs';
import { nextLevel, sealCount, unlocked } from '../saves.mjs';
import { lines, wrap } from './build.mjs';
import { C, brackets, hitBox, panel, landscapeTouchSize } from './kit.mjs';
import { paintScenery } from './paint.mjs';
import { levelById } from '../sim/levels.mjs';

/** A full-screen veil that dims what is under it and takes its taps. */
function veil(game, parent, alpha = 0.5, onTap) {
  const v = new Sprite();
  v.graphics.beginFill(C.ink, alpha).drawRect(-2000, -2000, game.width + 4000, game.height + 4000).endFill();
  parent.addChild(v);
  game.onTap(v, () => onTap?.());
  return v;
}

/** The title: a bridge over a river in the evening, the name written down the scroll, and the way in. */
export function titleScreen(app, layer) {
  const { game, kit } = app;
  const W = game.width,
    H = game.height,
    tall = H > W;
  const thumb = landscapeTouchSize(game);
  // A chain bridge over a gorge, as built by its level's reference drawing, behind the title.
  const level = levelById('3-3');
  const scene = paintScenery(level);
  const zoom = tall ? W / 25 : (W - 420) / 25;
  scene.scaleX = scene.scaleY = zoom;
  scene.x = tall ? W / 2 - 10 * zoom : 420 + (W - 420) / 2 - 10 * zoom;
  scene.y = tall ? H * 0.72 : H * 0.62;
  const bg = new Sprite();
  bg.graphics.beginFill(0xc4d6bd, 1).drawRect(0, 0, W, H).endFill();
  layer.addChild(bg);
  layer.addChild(scene);
  app.drawReference(scene, level);
  const art = titleArt(game,layer,tall ? {x:0,y:470,w:W,h:H-470} : {x:420,y:0,w:W-420,h:H},scene);
  // A band of silk for the words.
  const band = new Sprite();
  const bandWidth = tall ? W : 420, bandHeight = tall ? 470 : H;
  band.graphics.beginFill(C.ink, 0.16).drawRect(0, 0, bandWidth + 6, bandHeight + 6).endFill();
  band.graphics.beginFill(C.silk, 0.98).drawRect(0, 0, bandWidth, bandHeight).endFill();
  band.graphics.beginFill(C.ink, 0.92).drawRect(0, 0, bandWidth, 10).endFill();
  band.graphics.beginFill(C.silkDeep, 0.65).drawRect(0, bandHeight-12, bandWidth, 12).endFill();
  band.graphics.lineStyle(1, C.gold, 0.85).drawRect(15, 16, bandWidth-30, bandHeight-32);
  brackets(band.graphics, 20, 21, bandWidth - 40, bandHeight - 42, C.inkSoft, 0.8);
  // A restrained, deterministic paper grain; never regenerated per frame.
  for (let i = 0; i < 32; i++) {
    const px = 24 + (i*137.41) % (bandWidth-48), py = 28 + (i*71.31) % (bandHeight-56);
    band.graphics.lineStyle(0.7, C.silkDeep, 0.32).moveTo(px,py).lineTo(px+6+(i%5)*2,py+0.5);
  }
  band.graphics.lineStyle(0, 0, 0);
  layer.addChild(band);
  const zh = app.lang() === 'zh';
  if (zh) kit.spoken(layer, app.say('title'), { x: tall ? W / 2 + 50 : 290, y: tall ? 40 : 46, size: 72, vertical: true, bold: true }, 'heading');
  else kit.spoken(layer, app.say('title'), { x: tall ? W / 2 : 210, y: tall ? 90 : 120, size: 50, align: 'center', bold: true }, 'heading');
  // The carpenter's seal: a cinnabar square with a white character.
  const seal = new Sprite();
  seal.graphics.beginFill(C.cinnabar, 0.94).drawRect(0, 0, 54, 54).endFill();
  seal.graphics.lineStyle(1.4, C.white, 0.86).drawRect(4, 4, 46, 46);
  seal.graphics.lineStyle(0, 0, 0);
  seal.x = tall ? W / 2 - 70 : zh ? 196 : 183;
  seal.y = tall ? (zh ? 300 : 170) : zh ? 300 : 200;
  layer.addChild(seal);
  kit.text(seal, '班', { x: 27, y: 27, size: 34, color: C.white, align: 'center', baseline: 'middle', bold: true });
  kit.text(layer, app.say('subtitle'), { x: tall ? W / 2 : 210, y: tall ? 410 : zh ? (thumb ? 365 : 398) : 290, size: zh ? 20 : 16, color: C.inkSoft, align: 'center' });
  const data = app.data();
  const started = Object.values(data.progress).some((p) => p.passed);
  const bx = tall ? W / 2 : 210,
    by = tall ? H - 480 : thumb ? H-165 : 545;
  const items = [
    [started ? app.say('resume') : app.say('begin'), () => app.go('build', nextLevel(app.data())), 'primary'],
    [app.say('levels'), () => app.go('levels')],
    [app.say('sandbox'), () => app.go('build', 'sandbox')],
    [app.say('settings'), () => app.overlay('settings')],
    [app.say('language'), () => app.setLanguage(app.lang() === 'zh' ? 'en' : 'zh')]
  ];
  const buttons = items.map(([words, fn, kind], i) =>
    tall
      ? kit.button(layer, words, { x: bx, y: by + i * 94, w: 320, h: 84, size: 26, kind: kind ?? 'plain' }, fn)
      : i === 0
        ? kit.button(layer, words, { x: bx, y: by - (thumb ? thumb+17 : 75), w: 260, h: 58, kind: 'primary', size: 26 }, fn)
        : kit.button(layer, words, { x: bx - 66 + ((i - 1) % 2) * 132, y: by + Math.floor((i - 1) / 2) * (thumb ? thumb+7 : 62), w: 124, h: 50, size: 19 }, fn)
  );
  const { got, of } = sealCount(data);
  if (got) kit.text(layer, `${got} / ${of}`, { x: tall ? W / 2 : 210, y: tall ? 450 : H - 34, size: 16, color: C.inkSoft, align: 'center' });
  if (app.notice) {
    kit.spoken(layer, app.notice, { x: W / 2, y: H - 18, size: 16, color: C.cinnabar, align: 'center', baseline: 'middle' }, 'status');
    app.notice = null;
  }
  const retry = makeArtRetry(app,layer,[art.status],{x:W-100,y:tall ? 540 : 60,w:160,h:52,size:18});
  return { name: 'title', art: art.status, dispose: () => art.status.dispose(), focus: [...buttons,retry].map((b) => b.focusRecord) };
}

/** The levels: one row a chapter, five seals a row, laid out by the engine's view planner. */
export function levelsScreen(app, layer) {
  const { game, kit } = app;
  const W = game.width,
    H = game.height,
    tall = H > W,
    lang = app.lang(),
    data = app.data();
  const thumb = landscapeTouchSize(game);
  const bg = new Sprite();
  bg.graphics.beginFill(C.silk, 1).drawRect(0, 0, W, H).endFill();
  bg.graphics.beginFill(C.silkDeep,0.22).drawRect(12,12,W-24,H-24).endFill();
  bg.graphics.lineStyle(1,C.gold,0.8).drawRect(12,12,W-24,H-24);
  brackets(bg.graphics,17,17,W-34,H-34,C.gold,0.85);
  layer.addChild(bg);
  const row = (c, i) => ({
    type: 'panel',
    name: `chapter-${i}`,
    layout: 'row',
    gap: tall ? 8 : 14,
    align: 'center',
    height: tall ? 150 : 104,
    width: 'fill',
    children: [
      { type: 'text', name: `head-${i}`, text: c.name[lang], width: tall ? 120 : 190, height: 'fill' },
      ...LEVELS.filter((l) => l.chapter === i).map((l) => ({ type: 'button', name: `level-${l.id}`, text: l.id, width: tall ? 100 : 170, height: tall ? 120 : 88 }))
    ]
  });
  const root = {
    type: 'panel',
    name: 'levels',
    layout: 'column',
    padding: 24,
    gap: tall ? 14 : thumb ? 8 : 10,
    width: 'fill',
    height: 'fill',
    children: [{ type: 'text', name: 'title', text: app.say('levels'), height: thumb ? Math.max(92,thumb) : 50, width: 'fill' }, ...CHAPTERS.map(row)]
  };
  const plan = planView({ label: app.say('levels'), root }, app.frame());
  const rect = (name) => plan.parts[plan.names.get(name)].rect;
  const t = rect('title');
  kit.spoken(layer, app.say('levels'), { x: t.x, y: t.y + t.height / 2, size: 32, bold: true, baseline: 'middle' }, 'heading');
  const back = kit.button(layer, app.say('back'), { x: W - 90, y: t.y + t.height / 2 + (tall ? 10 : 0), w: 130, h: 46 }, () => app.go('title'));
  const buttons = [];
  CHAPTERS.forEach((c, i) => {
    const h = rect(`head-${i}`);
    const chapterFrame = new Sprite();
    chapterFrame.graphics.beginFill(C.white,0.53).drawRect(h.x-7,h.y+8,h.width+6,h.height-16).endFill();
    chapterFrame.graphics.beginFill([0x4c8065,0x577e88,0x657f72,0x3c7882,0x8e774c][i],0.95).drawRect(h.x-7,h.y+8,5,h.height-16).endFill();
    layer.addChild(chapterFrame);
    kit.text(layer, c.name[lang], { x: h.x+7, y: h.y + h.height / 2 - 14, size: tall ? 22 : 26, bold: true, baseline: 'middle' });
    kit.text(layer, lines ? wrap(c.lesson[lang], h.width - 6, 14)[0] : '', { x: h.x+7, y: h.y + h.height / 2 + 16, size: 14, color: C.inkSoft, baseline: 'middle' });
    for (const l of LEVELS.filter((q) => q.chapter === i)) {
      const r = rect(`level-${l.id}`),
        open = unlocked(data, l.id, app.allOpen),
        rec = data.progress[l.id];
      const name = `${l.id} ${l.name[lang]}${open ? '' : ' · ' + app.say('locked')}`;
      // One label a button (a frame draws at most 64): the number, and the name where there is room for it.
      const words = tall ? l.id : `${l.id}  ${l.name[lang]}`;
      const fitSize = Math.min(18, Math.floor((r.width - 14) / [...words].reduce((n, ch) => n + (/[\u2e80-\u9fff]/.test(ch) ? 1 : 0.55), 0)));
      const b = kit.button(layer, words, { x: r.x + r.width / 2, y: r.y + r.height / 2 - 8, w: r.width, h: r.height, size: tall ? 20 : fitSize, kind: l.famous ? 'quiet' : 'plain', name }, () => open && app.go('build', l.id));
      if (!open) b.setEnabled(false);
      // Three small seals under each level: across, thrift, unbroken. A famous bridge has a gold rule over them.
      ['pass', 'thrift', 'intact'].forEach((k, j) => {
        const s = new Sprite();
        s.graphics.beginFill(rec?.seals?.[k] ? C.cinnabar : C.silkDeep, rec?.seals?.[k] ? 1 : 0.6).drawRect(0, 0, 12, 12).endFill();
        s.graphics.lineStyle(0.7, rec?.seals?.[k] ? C.white : C.inkSoft, 0.7).drawRect(2,2,8,8);
        s.graphics.lineStyle(0,0,0);
        s.x = -22 + j * 16;
        s.y = r.height / 2 - 20;
        b.addChild(s);
      });
      if (l.famous) {
        const rule = new Sprite();
        rule.graphics.lineStyle(3, C.gold, 1).moveTo(-r.width / 2 + 8, -r.height / 2 + 8).lineTo(r.width / 2 - 8, -r.height / 2 + 8);
        b.addChild(rule);
      }
      buttons.push(b);
    }
  });
  const first = Math.max(0, buttons.findIndex((b, i) => !data.progress[LEVELS[i].id]?.passed));
  return { name: 'levels', focus: [...buttons, back].map((b) => b.focusRecord), focusStart: first, back: () => app.go('title') };
}

/** The carpenter's notes for a level: what is new, who crosses, the budget. */
export function tipCard(app, layer, level, close) {
  const { game, kit } = app;
  const W = game.width,
    H = game.height,
    lang = app.lang();
  veil(game, layer, 0.35, close);
  const w = Math.min(620, W - 40),
    h = H > W || landscapeTouchSize(game) ? 420 : 330;
  const p = panel(layer, (W - w) / 2, (H - h) / 2, w, h);
  hitBox(p, 0, 0, w, h);
  game.onTap(p, () => {});
  kit.spoken(p, app.say('tipTitle'), { x: 28, y: 26, size: 26, bold: true }, 'heading');
  const lesson = CHAPTERS[level.chapter]?.lesson[lang];
  let y = 72;
  if (lesson) {
    kit.text(p, lesson, { x: 28, y, size: 18, color: C.azurite });
    y += 34;
  }
  y += lines(kit, p, level.tip[lang], { x: 28, y, width: w - 56, size: 19 });
  const who = level.vehicles.map((v) => `${app.say('v_' + v)} ${app.say('tons', { n: lang === 'zh' ? weightOf(v) * 2 : weightOf(v) })}`).join(lang === 'zh' ? '、' : ', ');
  y += 8 + lines(kit, p, app.say('vehicles', { list: who }), { x: 28, y: y + 8, width: w - 56, size: 17, color: C.inkSoft });
  kit.text(p, Number.isFinite(level.budget) ? app.say('budget', { budget: level.budget }) : app.say('noBudget'), { x: 28, y: y + 14, size: 17, color: C.inkSoft });
  const ok = kit.button(p, app.say('gotIt'), { x: w / 2, y: h - (H > W || landscapeTouchSize(game) ? 62 : 44), w: 180, h: 50, kind: 'primary' }, close);
  return { focus: [ok.focusRecord], close };
}

/** The end of a crossing: the outcome, the three seals, and where to go. */
export function resultCard(app, layer, { level, outcome, cost, fresh }, actions) {
  const { game, kit, sound } = app;
  const W = game.width,
    H = game.height;
  veil(game, layer, 0.4);
  const w = Math.min(640, W - 40),
    h = H > W || landscapeTouchSize(game) ? 420 : 360;
  const p = panel(layer, (W - w) / 2, (H - h) / 2, w, h);
  hitBox(p, 0, 0, w, h);
  game.onTap(p, () => {});
  const won = outcome.won;
  const emblem = new Sprite();
  emblem.graphics.lineStyle(1.4,C.gold,0.7).moveTo(24,16).lineTo(w-24,16);
  emblem.graphics.lineStyle(1.4,C.gold,0.7).moveTo(24,106).lineTo(w-24,106);
  emblem.graphics.lineStyle(0,0,0);
  p.addChild(emblem);
  kit.spoken(p, won ? app.say('won') : app.say('lost'), { x: w / 2, y: 30, size: 34, bold: true, align: 'center', color: won ? C.ink : C.cinnabar }, 'heading');
  kit.spoken(p, won ? app.say('cost', { cost }) : app.say(outcome.reason), { x: w / 2, y: 82, size: 19, align: 'center', color: C.inkSoft }, 'status');
  if (!level.sandbox) {
    const seals = { pass: won, thrift: won && cost <= level.budget, intact: won && (outcome.broken ?? 0) === 0 };
    ['pass', 'thrift', 'intact'].forEach((k, i) => {
      const s = new Sprite(),
        x = w / 2 + (i - 1) * 150;
      s.graphics.beginFill(C.ink,0.22).drawRect(-37,4,80,80).endFill();
      s.graphics.beginFill(seals[k] ? C.cinnabar : C.silkDeep, seals[k] ? 0.97 : 0.78).drawRect(-40,0,80,80).endFill();
      s.graphics.lineStyle(1.6, seals[k] ? C.white : C.inkSoft, 0.8).drawRect(-34,6,68,68);
      brackets(s.graphics,-31,9,62,62,seals[k] ? C.gold : C.inkSoft,0.9);
      s.x = x;
      s.y = 120;
      p.addChild(s);
      const word = app.say({ pass: 'sealPass', thrift: 'sealThrift', intact: 'sealIntact' }[k]);
      kit.spoken(s, word, { x: 0, y: 40, size: app.lang() === 'zh' ? 26 : 15, align: 'center', baseline: 'middle', color: seals[k] ? C.white : C.inkSoft, bold: true }, 'text');
      kit.text(p, app.say({ pass: 'sealPassDesc', thrift: 'sealThriftDesc', intact: 'sealIntactDesc' }[k]), { x, y: 210, size: 14, align: 'center', color: C.inkSoft });
      // A new seal is pressed down with a sound, one after another.
      if (fresh[k] && !game.reducedMotion) {
        s.alpha = 0;
        game.after(0.35 + i * 0.3, () => {
          // A player can go straight to the next level before the seal ceremony is over.
          if (s.isDisposed) return;
          s.alpha = 1;
          sound.play('seal');
          game.invalidate?.();
        });
      }
    });
  }
  const last = LEVELS[LEVELS.length - 1].id === level.id;
  const items = [
    ...(won && !level.sandbox && !last ? [[app.say('next'), actions.next, 'primary']] : []),
    [app.say('again'), actions.again, won ? 'plain' : 'primary'],
    [app.say('replay'), actions.replay],
    [app.say('toLevels'), actions.levels]
  ];
  const bw = Math.min(150, (w - 40) / items.length - 10);
  const buttons = items.map(([words, fn, kind], i) => kit.button(p, words, { x: w / 2 + (i - (items.length - 1) / 2) * (bw + 10), y: h - (H > W || landscapeTouchSize(game) ? 62 : 52), w: bw, h: 50, size: 18, kind: kind ?? 'plain' }, fn));
  if (won && last) kit.text(p, app.say('finished'), { x: w / 2, y: 240, size: 16, align: 'center', color: C.azurite });
  return { focus: buttons.map((b) => b.focusRecord) };
}

/** The menu of the site. */
export function pauseMenu(app, layer, close, { levelId }) {
  const { game, kit } = app;
  const W = game.width,
    H = game.height;
  veil(game, layer, 0.4, close);
  const tall = H > W,
    thumb = landscapeTouchSize(game),
    roomy = tall || thumb,
    step = roomy ? Math.max(94, thumb+6) : 58;
  const w = roomy ? 440 : 360,
    h = 100 + step * 5;
  const p = panel(layer, (W - w) / 2, (H - h) / 2, w, h);
  hitBox(p, 0, 0, w, h);
  game.onTap(p, () => {});
  kit.spoken(p, app.say('menu'), { x: w / 2, y: 26, size: 28, bold: true, align: 'center' }, 'heading');
  const items = [
    [app.say('back'), close, 'primary'],
    [app.say('levels'), () => app.go('levels')],
    [app.say('settings'), () => app.overlay('settings')],
    [app.say('help'), () => app.overlay('help')],
    [app.say('title'), () => app.go('title')]
  ];
  const buttons = items.map(([words, fn, kind], i) => kit.button(p, words, { x: w / 2, y: 96 + i * step + (roomy ? 10 : 0), w: 280, h: 48, kind: kind ?? 'plain' }, fn));
  return { focus: buttons.map((b) => b.focusRecord), levelId };
}

/** Settings: language, sound, music, reduced motion, and clearing progress. */
export function settingsOverlay(app, layer, close) {
  const { game, kit } = app;
  const W = game.width,
    H = game.height,
    s = app.settings();
  veil(game, layer, 0.4, close);
  const tall = H > W,
    thumb = landscapeTouchSize(game),
    roomy = tall || thumb,
    step = roomy ? Math.max(94, thumb+6) : 58;
  const w = roomy ? 500 : 440,
    h = Math.min(H-12, 130 + step * 5 + (roomy ? 48 : 0));
  const p = panel(layer, (W - w) / 2, (H - h) / 2, w, h);
  hitBox(p, 0, 0, w, h);
  game.onTap(p, () => {});
  kit.spoken(p, app.say('settings'), { x: w / 2, y: 26, size: 28, bold: true, align: 'center' }, 'heading');
  const toggle = (key, label, i) => {
    const words = () => `${label}：${app.settings()[key] ? app.say('on') : app.say('off')}`;
    const b = kit.button(p, words(), { x: w / 2, y: 100 + i * step + (roomy ? 14 : 0), w: 320, h: 48 }, () => {
      app.setSetting(key, !app.settings()[key]);
      b.setText(words());
      b.setOn(app.settings()[key]);
    });
    b.setOn(s[key]);
    return b;
  };
  const buttons = [
    kit.button(p, app.say('language'), { x: w / 2, y: 100 + (roomy ? 14 : 0), w: 320, h: 48 }, () => app.setLanguage(app.lang() === 'zh' ? 'en' : 'zh')),
    toggle('sound', app.say('sound'), 1),
    toggle('music', app.say('music'), 2),
    toggle('reducedMotion', app.say('reducedMotion'), 3),
    kit.button(p, app.say('resetProgress'), { x: w / 2, y: 100 + 4 * step + (roomy ? 14 : 0), w: 320, h: 48 }, () => app.confirm(app.say('resetAsk'), () => app.resetProgress())),
    kit.button(p, app.say('close'), { x: w / 2, y: h - (roomy ? 60 : 46), w: 180, h: 48, kind: 'primary' }, close)
  ];
  return { focus: buttons.map((b) => b.focusRecord) };
}

/** How to play. */
export function helpOverlay(app, layer, close) {
  const { game, kit } = app;
  const W = game.width,
    H = game.height;
  veil(game, layer, 0.4, close);
  const w = Math.min(760, W - 40),
    h = Math.min(560, H - 60);
  const p = panel(layer, (W - w) / 2, (H - h) / 2, w, h);
  hitBox(p, 0, 0, w, h);
  game.onTap(p, () => {});
  kit.spoken(p, app.say('help'), { x: 28, y: 24, size: 28, bold: true }, 'heading');
  lines(kit, p, app.say('helpText'), { x: 28, y: 74, width: w - 56, size: W < 800 ? 15 : 17, lineHeight: W < 800 ? 22 : 26 });
  const ok = kit.button(p, app.say('close'), { x: w / 2, y: h - (H > W || landscapeTouchSize(game) ? 62 : 42), w: 180, h: 48, kind: 'primary' }, close);
  return { focus: [ok.focusRecord] };
}

/** A yes-or-no question. */
export function confirmCard(app, layer, question, yes, close) {
  const { game, kit } = app;
  const W = game.width,
    H = game.height;
  veil(game, layer, 0.45, close);
  const w = 460,
    h = H > W || landscapeTouchSize(game) ? 270 : 210;
  const p = panel(layer, (W - w) / 2, (H - h) / 2, w, h);
  hitBox(p, 0, 0, w, h);
  game.onTap(p, () => {});
  lines(kit, p, question, { x: 28, y: 30, width: w - 56, size: 20 });
  const b1 = kit.button(p, app.say('yes'), { x: w / 2 - 90, y: h - (H > W || landscapeTouchSize(game) ? 62 : 50), w: 150, h: 48, kind: 'primary' }, () => {
    close();
    yes();
  });
  const b2 = kit.button(p, app.say('no'), { x: w / 2 + 90, y: h - (H > W || landscapeTouchSize(game) ? 62 : 50), w: 150, h: 48 }, close);
  return { focus: [b2.focusRecord, b1.focusRecord] };
}

export { VEHICLES };
