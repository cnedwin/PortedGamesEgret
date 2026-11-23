// 画面：卷首（标题）、作画（一局）、暂停、卷尾（结算）和设置。每个画面在自己的作用域里建，离开时一起放掉；字一律
// 从 t() 取，按舞台的宽高排，横屏和竖屏都排得下。
// The screens: the title, painting (a round), the pause, the end of a round and the settings. Each is made in its own
// scope and let go as a whole when it is left; every word comes from t(), and the layout follows the stage's width and
// height, so it fits both a wide and a tall stage.
import { DisplayObjectContainer, Sprite } from '@egret/engine';
import { AMBER, PAPER, SANS, createScreenKit } from './ui/kit.mjs';
import { ENDLESS, LEVELS, PIGMENTS, createGame, createRandom, progress } from './sim/sand.mjs';
import { UNPAINT_LEVELS, collectedShare, createUnpaint } from './sim/unpaint.mjs';
import { createUnpaintView } from './view/unpaintview.mjs';
import { unpaintPicture } from './view/unpaintart.mjs';
import { recordRound, recordUnpaint } from './saves.mjs';
import { getLanguage, t } from './i18n.mjs';
import { createPlayView } from './view/play.mjs';
import { KAI, createScrollPainter, drawPanel, mountScroll, paintScroll } from './view/scroll.mjs';

/** A screen's common parts: its scope, its kit and its root container. */
function begin(app, prefix) {
  const scope = app.game.engine.createScope(),
    kit = createScreenKit(app.game, scope, { semantics: app.semantics, sound: app.sound, prefix, locale: getLanguage() }),
    root = app.game.stage.addChild(scope.use(new DisplayObjectContainer()));
  return { scope, kit, root, dispose: () => (kit.dispose(), scope.dispose()) };
}

const locale = () => (getLanguage() === 'zh' ? 'zh-CN' : 'en');

/** Break `text` into lines of about `width` stage units at `size`: by characters in Chinese, by words in English. */
export function wrap(text, width, size) {
  const lines = [];
  if (getLanguage() === 'zh') {
    const per = Math.max(4, Math.floor(width / size));
    let line = '';
    for (const ch of text) {
      // A closing mark never starts a line.
      if (line.length >= per && !'，。、；：！？）」'.includes(ch)) ((lines.push(line), (line = '')));
      line += ch;
    }
    if (line) lines.push(line);
  } else {
    const per = Math.max(8, Math.floor(width / (size * 0.52)));
    let line = '';
    for (const word of text.split(' ')) {
      if (line && (line + ' ' + word).length > per) ((lines.push(line), (line = word)));
      else line = line ? line + ' ' + word : word;
    }
    if (line) lines.push(line);
  }
  return lines.join('\n');
}


/**
 * Grains of pigment drifting down behind the title. They are a tile of dots painted once and slid down by the page
 * (a CSS animation of a transform, done by the browser's compositor), so the engine has nothing more to draw.
 */
function sandRain(app) {
  if (app.reducedMotion) return () => {};
  const tile = Object.assign(document.createElement('canvas'), { width: 240, height: 240 }),
    g = tile.getContext('2d'),
    rng = createRandom(70);
  for (let k = 0; k < 46; k++) {
    const [r, gr, b] = PIGMENTS[[1, 2, 5, 4][k % 4]].rgb;
    g.fillStyle = `rgba(${r}, ${gr}, ${b}, ${0.35 + rng() * 0.35})`;
    const size = 1.5 + rng() * 2;
    g.fillRect(rng() * 240, rng() * 240, size, size);
  }
  const rain = document.createElement('div');
  rain.id = 'rain';
  for (const [k, seconds] of [[0, 34], [1, 22]].entries()) {
    const layer = document.createElement('i');
    layer.style.backgroundImage = `url(${tile.toDataURL()})`;
    layer.style.backgroundPosition = `${k * 97}px ${k * 61}px`;
    layer.style.animationDuration = seconds[1] + 's';
    rain.append(layer);
  }
  const stage = document.querySelector('#stage');
  stage.before(rain);
  const fit = () => {
    rain.style.width = stage.style.width;
    rain.style.height = stage.style.height;
  };
  fit();
  const watch = new ResizeObserver(fit);
  watch.observe(stage);
  return () => {
    watch.disconnect();
    rain.remove();
  };
}

/** The title: the name, the scroll, the best scores, and the three ways in. */
export async function titleScreen(app) {
  const s = begin(app, 'title'),
    { width, height } = app.stage,
    { kit, root } = s;
  const tall = height > width;
  kit.own({ dispose: sandRain(app) });
  const centre = tall ? width / 2 : width * 0.33,
    scrollW = tall ? width - 64 : width * 0.5,
    scrollY = tall ? 262 : 236,
    scrollH = Math.round(scrollW / 4),
    { best, bestEndless, finished } = app.save.data,
    infoY = scrollY + scrollH + 30,
    // The latest scroll painted, or the first, hangs on the title.
    shown = [...LEVELS].reverse().find((level) => finished.includes(level.id))?.painting ?? 'spring';
  // Everything on the title that never moves — the name, the scroll on its mount and the best scores — is painted once
  // by the page under the engine's canvas, which then draws only the buttons (ENGINE-NOTES 7).
  const painting = paintScroll(shown, true, { width: 960, height: 240 });
  app.backdrop.set((g) => {
    const text = (words, x, y, size, colour, family = SANS, weight = 400) => {
      g.font = `${weight} ${size}px ${family}`;
      g.fillStyle = colour;
      g.textAlign = 'center';
      g.textBaseline = 'top';
      g.fillText(words, x, y);
    };
    text(t('title'), centre, tall ? 88 : 70, tall ? 84 : 76, '#f1d79a', KAI, 700);
    text(t('subtitle'), centre, tall ? 202 : 176, tall ? 19 : 18, '#d9c6a0');
    mountScroll(g, { x: centre - scrollW / 2, y: scrollY, w: scrollW, h: scrollH });
    g.drawImage(painting, centre - scrollW / 2, scrollY, scrollW, scrollH);
    const line = [best ? t('best', { score: best.toLocaleString(locale()) }) : t('noBest'), bestEndless ? t('bestEndless', { score: bestEndless.toLocaleString(locale()) }) : ''].filter(Boolean).join('    ');
    text(line, centre, infoY, 17, '#c8b48a');
  });
  const buttonWidth = tall ? width - 120 : 280,
    bx = tall ? 60 : width - 316,
    big = tall ? 72 : 68,
    // At least 44 CSS pixels on a phone, where the stage is drawn at about three quarters of its size.
    small = 60;
  let y = tall ? 462 : 60;
  const paint = await kit.button({ x: bx, y, width: buttonWidth, height: big, text: t('modePaint'), sub: t('modePaintSub'), primary: true, onActivate: () => app.go('pick', { mode: 'paint' }) });
  y += big + 14;
  await kit.button({ x: bx, y, width: buttonWidth, height: big, text: t('modeUnpaint'), sub: t('modeUnpaintSub'), onActivate: () => app.go('pick', { mode: 'unpaint' }) });
  y += big + 14;
  await kit.button({ x: bx, y, width: buttonWidth, height: big, text: t('modeEndless'), sub: t('modeEndlessSub'), onActivate: () => app.go('play', { level: ENDLESS }) });
  y += big + (tall ? 30 : 22);
  const half = (buttonWidth - 14) / 2;
  await kit.button({ x: bx, y, width: half, height: small, text: t('settings'), onActivate: () => app.go('settings') });
  await kit.button({ x: bx + half + 14, y, width: half, height: small, text: t('language'), name: t('languageName'), onActivate: () => app.switchLanguage() });
  if (app.notice) await kit.label(root, app.notice, { x: 20, y: height - 40, size: 14, color: 0xffd08a, family: SANS });
  return { ...s, kit, focusFirst: () => paint.focus(false), confirm: () => app.go('pick', { mode: 'paint' }) };
}

/**
 * Choosing what to play: the three scrolls to paint, each open once the one before is finished, or the pictures to
 * unpaint. Each choice is a button with its picture beside it, painted by the page.
 */
export async function pickScreen(app, { mode = 'paint' } = {}) {
  const s = begin(app, 'pick'),
    { width, height } = app.stage,
    { kit } = s;
  const tall = height > width;
  const { finished, unpainted } = app.save.data;
  const items =
    mode === 'paint'
      ? LEVELS.filter((level) => !level.endless).map((level, k, all) => ({
          name: t('level_' + level.id),
          painting: level.painting,
          done: finished.includes(level.id),
          open: k === 0 || finished.includes(all[k - 1].id),
          go: () => app.go('play', { level: LEVELS.indexOf(level) })
        }))
      : UNPAINT_LEVELS.map((level, k) => ({
          name: t('unpaint_' + level.id),
          painting: level.painting,
          crop: level.crop,
          done: unpainted.includes(level.id),
          open: k === 0 || unpainted.includes(UNPAINT_LEVELS[k - 1].id),
          go: () => app.go('unpaint', { level: k })
        }));
  const rowH = tall ? Math.min(116, (height - 260) / items.length) : Math.min(84, (height - 150) / items.length),
    pw = Math.min(tall ? width - 40 : 820, width - 40),
    px = (width - pw) / 2,
    thumbW = tall ? 150 : 200,
    top = tall ? 130 : 88;
  await kit.label(s.root, mode === 'paint' ? t('chooseScroll') : t('chooseUnpaint'), { x: 0, y: tall ? 52 : 26, size: tall ? 34 : 30, weight: 700, color: 0xf1d79a, family: KAI, align: 'center', width });
  const pictures = {};
  let first = null;
  for (const [k, item] of items.entries()) {
    const y = top + k * rowH;
    const button = await kit.button({
      x: px + thumbW + 24,
      y: y + 6,
      width: pw - thumbW - 24,
      height: rowH - 16,
      text: item.name,
      sub: item.done ? t('done') : item.open ? ' ' : t('locked'),
      primary: item.open && !item.done,
      onActivate: () => item.open && item.go()
    });
    button.setEnabled(item.open);
    first ??= item.open && !item.done ? button : null;
    pictures[k] = paintScroll(item.painting, item.done || mode === 'unpaint', { width: 480, height: 120 });
  }
  const back = await kit.button({ x: (width - 200) / 2, y: top + items.length * rowH + 10, width: 200, height: 50, text: t('back'), small: true, onActivate: () => app.go('title') });
  app.backdrop.set((g) => {
    for (const [k, item] of items.entries()) {
      const y = top + k * rowH + 6,
        h = rowH - 16,
        w = thumbW;
      mountScroll(g, { x: px + 8, y: y + 4, w: w - 8, h: h - 8 });
      if (item.crop) {
        // A part of the scroll, as the unpaint picture is cut from it.
        const [cx, cy, cw, ch] = item.crop;
        g.drawImage(pictures[k], (cx / 960) * 480, (cy / 240) * 120, (cw / 960) * 480, (ch / 240) * 120, px + 8, y + 4, w - 8, h - 8);
      } else g.drawImage(pictures[k], px + 8, y + 4, w - 8, h - 8);
      if (!item.open) {
        g.fillStyle = 'rgba(20, 11, 6, 0.6)';
        g.fillRect(px + 8, y + 4, w - 8, h - 8);
      }
    }
  });
  return { ...s, focusFirst: () => (first ?? back).focus(false), escape: () => app.go('title') };
}

/** Painting: one round on a scroll, or on the endless tray. */
export async function playScreen(app, { level = 0, resume = false } = {}) {
  const s = begin(app, 'play'),
    { width, height } = app.stage,
    { kit, root, scope } = s;
  const tall = height > width;
  // A new round, or after the screen was turned, the round that was in play.
  const game = resume && app.round && !app.round.over ? app.round : (app.round = createGame(app.seed + app.rounds++, level));
  const endless = Boolean(game.level.endless);
  let ended = null;
  const view = await createPlayView(app, scope, root, kit, game, {
    words: t,
    locale: locale(),
    ended(won) {
      if (ended) return;
      app.sound.play(won ? 'won' : 'lost');
      let best = false;
      const saved = app.save.update((data) => {
        best = recordRound(data, { score: game.score, scroll: game.level.id, won, endless });
      });
      ended = { won, best, saved, wait: won ? 2.2 : 1.6 };
    }
  });
  void app.sound.music?.();
  // The pause, as a button on the screen and on Esc.
  const pauseButton = await kit.button({
    x: tall ? width - 108 : 22,
    y: tall ? 150 : height - 66,
    width: tall ? 88 : 140,
    height: 40,
    text: t('pause'),
    small: true,
    onActivate: () => pause(true)
  });
  // The keys, for a keyboard: under the tray on a tall stage, in the left column on a wide one, under the scroll's name.
  if (tall) {
    if (!app.touch) await kit.label(root, t('keys'), { x: 0, y: height - 22, size: 13, color: 0x9c8a6a, family: SANS, align: 'center', width });
  } else {
    await kit.label(root, t('level_' + game.level.id), { x: 22, y: 26, size: 16, color: 0xc8b48a, family: SANS });
    if (!app.touch) await kit.label(root, t('keys').replaceAll(' · ', '\n'), { x: 24, y: 214, size: 14, color: 0x9c8a6a, family: SANS, lineHeight: 24 });
  }
  // The pause card, made when first wanted.
  let card = null;
  async function pause(on) {
    view.setPaused(on);
    if (on && !card) {
      const layer = root.addChild(scope.use(new DisplayObjectContainer()));
      const shade = layer.addChild(scope.use(new Sprite()));
      shade.graphics.beginFill(0x0a0604, 0.72).drawRect(0, 0, width, height).endFill();
      shade.touchEnabled = true;
      shade.hitArea = { x: 0, y: 0, width, height };
      const pw = Math.min(420, width - 60),
        px = (width - pw) / 2,
        py = height / 2 - 170;
      kit.panel({ x: px, y: py, width: pw, height: 330, container: layer });
      await kit.label(layer, t('paused'), { x: px, y: py + 28, size: 30, weight: 700, color: 0xf1d79a, family: KAI, align: 'center', width: pw });
      const resumeButton = await kit.button({ x: px + 36, y: py + 92, width: pw - 72, height: 56, text: t('resume'), primary: true, container: layer, onActivate: () => pause(false) });
      await kit.button({ x: px + 36, y: py + 166, width: pw - 72, height: 52, text: t('restart'), container: layer, onActivate: () => app.go('play', { level: game.levelIndex }) });
      await kit.button({ x: px + 36, y: py + 236, width: pw - 72, height: 52, text: t('toTitle'), container: layer, onActivate: () => app.go('title') });
      card = { layer, resumeButton };
    }
    if (card) card.layer.visible = on;
    if (on) card?.resumeButton.focus(false);
  }
  // The first time: a word over the empty tray on what to do, gone with the first piece.
  const first = app.save.data.plays === 0;
  const hint = first ? await kit.label(root, wrap(t('firstHint'), tall ? 340 : 280, 18), { x: width / 2 - (tall ? 170 : 140), y: height * (tall ? 0.44 : 0.4), size: 18, color: 0xf3e3c0, family: SANS, lineHeight: 28 }) : null;
  return {
    ...s,
    // The keys play the round; the pause button is reached with Tab.
    focusFirst: () => {},
    escape: () => pause(!view.paused),
    keys: view.controls,
    update(seconds) {
      view.update(seconds);
      if (hint) hint.display.visible = game.pieces === 0;
      if (ended && (ended.wait -= seconds) <= 0) {
        const result = { ...ended, level: game.levelIndex, painting: game.painting, paintings: game.paintings, score: game.score, share: progress(game), time: game.time, pieces: game.pieces, chain: game.bestChain };
        ended = null;
        void app.go('end', result);
      }
    }
  };
}

/** The pause card over a round: resume, start over, back to the title. Made when first wanted. */
function pauseCard(app, kit, scope, root, { onResume, onRestart }) {
  const { width, height } = app.stage;
  let card = null;
  return async (on) => {
    if (on && !card) {
      const layer = root.addChild(scope.use(new DisplayObjectContainer()));
      const shade = layer.addChild(scope.use(new Sprite()));
      shade.graphics.beginFill(0x0a0604, 0.72).drawRect(0, 0, width, height).endFill();
      shade.touchEnabled = true;
      shade.hitArea = { x: 0, y: 0, width, height };
      const pw = Math.min(420, width - 60),
        px = (width - pw) / 2,
        py = height / 2 - 170;
      kit.panel({ x: px, y: py, width: pw, height: 330, container: layer });
      await kit.label(layer, t('paused'), { x: px, y: py + 28, size: 30, weight: 700, color: 0xf1d79a, family: KAI, align: 'center', width: pw });
      const resumeButton = await kit.button({ x: px + 36, y: py + 92, width: pw - 72, height: 56, text: t('resume'), primary: true, container: layer, onActivate: onResume });
      await kit.button({ x: px + 36, y: py + 166, width: pw - 72, height: 52, text: t('restart'), container: layer, onActivate: onRestart });
      await kit.button({ x: px + 36, y: py + 236, width: pw - 72, height: 52, text: t('toTitle'), container: layer, onActivate: () => app.go('title') });
      card = { layer, resumeButton };
    }
    if (card) card.layer.visible = on;
    if (on) card?.resumeButton.focus(false);
  };
}

/** Unpainting: one picture of sand to collect in buckets. */
export async function unpaintScreen(app, { level = 0, resume = false } = {}) {
  const s = begin(app, 'unpaint'),
    { width, height } = app.stage,
    { kit, root, scope } = s;
  const tall = height > width;
  const game = resume && app.round?.mode === 'unpaint' && !app.round.over && app.round.levelIndex === level ? app.round : (app.round = createUnpaint(app.seed + app.rounds++, level, unpaintPicture(level)));
  const id = game.level.id;
  let ended = null;
  const view = await createUnpaintView(app, scope, root, kit, game, {
    words: t,
    ended(won) {
      if (ended) return;
      app.sound.play(won ? 'won' : 'lost');
      const saved = won ? app.save.update((data) => recordUnpaint(data, id)) : true;
      ended = { won, saved, wait: won ? 1.8 : 1.4 };
    }
  });
  void app.sound.music?.();
  await kit.label(root, t('modeUnpaint') + ' · ' + t('unpaint_' + id), { x: tall ? 24 : 380, y: tall ? 20 : 30, size: tall ? 18 : 22, weight: 700, color: 0xf1d79a, family: SANS });
  const pause = pauseCard(app, kit, scope, root, { onResume: () => (view.setPaused(false), pause(false)), onRestart: () => app.go('unpaint', { level }) });
  const pauseButton = await kit.button({ x: tall ? width - 108 : width - 150, y: tall ? 14 : 18, width: tall ? 88 : 120, height: 40, text: t('pause'), small: true, onActivate: () => (view.setPaused(true), pause(true)) });
  // The first time: how unpainting works, until the first bucket goes on.
  const first = !app.save.data.unpainted.length;
  // Written in ink over the silk of the picture's sky.
  const hint = first ? await kit.label(root, wrap(t('unpaintHint'), tall ? 360 : 240, 16), { x: tall ? width / 2 - 180 : 70, y: tall ? 110 : 40, size: 16, weight: 600, color: 0x3a2414, family: SANS, lineHeight: 25 }) : null;
  return {
    ...s,
    focusFirst: () => {},
    escape: () => {
      const on = !view.paused;
      view.setPaused(on);
      void pause(on);
    },
    keys: { choose: (lane) => view.tap(lane), move() {}, turn() {}, drop() {}, cracker() {} },
    update(seconds) {
      view.update(seconds);
      if (hint) hint.display.visible = game.taps === 0;
      if (ended && (ended.wait -= seconds) <= 0) {
        const result = { mode: 'unpaint', level, won: ended.won, saved: ended.saved, time: game.time, taps: game.taps, share: collectedShare(game) };
        ended = null;
        void app.go('end', result);
      }
    }
  };
}

/** The end of a round: the painting as far as it got, the score, and the ways on. */
export async function endScreen(app, result) {
  if (result.mode === 'unpaint') return unpaintEnd(app, result);
  const s = begin(app, 'end'),
    { width, height } = app.stage,
    { kit, root } = s;
  const tall = height > width;
  const { won, best, saved, score, share, time, pieces, chain, level = 0, painting = 'spring', paintings = 0 } = result;
  const scroll = LEVELS[level],
    next = !scroll.endless && won ? LEVELS[level + 1] : null,
    hasNext = Boolean(next && !next.endless);
  const pw = Math.min(tall ? width - 32 : 680, width - 32),
    px = (width - pw) / 2,
    py = tall ? 150 : 16,
    lines = (words) => words.split('\n').length;
  // The panel and the painting as it now is — finished in colour, or the ink drawing with the colour as far as it got —
  // are painted by the page under the engine's canvas; the words and buttons are drawn over them, top to bottom, and
  // the panel is as tall as they need.
  const sw = tall ? pw - 70 : 400,
    sh = Math.round(sw / 4),
    sy = py + (tall ? 136 : 112),
    painter = createScrollPainter(painting, { width: 960, height: 240 });
  painter.paint(won ? 1 : share);
  await kit.label(root, won ? t('won') : t('lost'), { x: px, y: py + (tall ? 30 : 22), size: tall ? 40 : 36, weight: 700, color: 0xf1d79a, family: KAI, align: 'center', width: pw });
  await kit.label(root, scroll.endless ? t('level_endless') + ' · ' + t('paintingsDone', { n: paintings }) : t('level_' + scroll.id), { x: px, y: py + (tall ? 90 : 74), size: 16, color: 0xc8b48a, family: SANS, align: 'center', width: pw });
  let y = sy + sh + (tall ? 36 : 26);
  await kit.label(root, t('finalScore', { score: score.toLocaleString(locale()) }), { x: px, y, size: 28, weight: 700, color: PAPER, align: 'center', width: pw });
  y += 42;
  if (best) {
    await kit.label(root, t('newBest'), { x: px, y, size: 17, color: AMBER, family: SANS, align: 'center', width: pw });
    y += 28;
  }
  const minutes = Math.floor(time / 60),
    secs = Math.floor(time % 60);
  await kit.label(root, t('stats', { time: `${minutes}:${String(secs).padStart(2, '0')}`, pieces, chain: Math.max(1, chain) }), { x: px, y, size: 15, color: 0xd9c6a0, family: SANS, align: 'center', width: pw });
  y += 28;
  if (!won) {
    const hint = wrap(t('lostHint', { percent: Math.floor(share * 100) }), pw - 60, 14);
    await kit.label(root, hint, { x: px + 30, y, size: 14, color: 0xc8b48a, family: SANS, lineHeight: 20 });
    y += lines(hint) * 20 + 6;
  }
  if (!saved) {
    const notice = wrap(t('saveRefused'), pw - 40, 13);
    await kit.label(root, notice, { x: px + 20, y, size: 13, color: 0xffd08a, family: SANS, lineHeight: 18 });
    y += lines(notice) * 18 + 6;
  }
  // Two buttons, one above the other on a tall stage and side by side on a wide one.
  y += 8;
  const half = (pw - 100) / 2;
  const again = await kit.button({
    x: px + 40,
    y,
    width: tall ? pw - 80 : half,
    height: 56,
    text: hasNext ? t('nextScroll') : won ? t('again') : t('retry'),
    primary: true,
    onActivate: () => app.go('play', { level: hasNext ? level + 1 : level })
  });
  await kit.button({ x: tall ? px + 40 : px + 60 + half, y: tall ? y + 68 : y, width: tall ? pw - 80 : half, height: tall ? 52 : 56, text: t('toTitle'), onActivate: () => app.go('title') });
  const bottom = y + (tall ? 68 + 52 : 56) + 22;
  app.backdrop.set((g) => {
    drawPanel(g, px, py, pw, bottom - py);
    mountScroll(g, { x: (width - sw) / 2, y: sy, w: sw, h: sh });
    g.drawImage(painter.canvas, (width - sw) / 2, sy, sw, sh);
  });
  return { ...s, focusFirst: () => again.focus(false), escape: () => app.go('title'), confirm: () => app.go('play', { level: hasNext ? level + 1 : level }) };
}

/** The end of an unpaint round: the picture in colour, the time and the taps, and the next picture. */
async function unpaintEnd(app, { level, won, saved, time, taps, share }) {
  const s = begin(app, 'end'),
    { width, height } = app.stage,
    { kit, root } = s;
  const tall = height > width;
  const item = UNPAINT_LEVELS[level],
    hasNext = won && level + 1 < UNPAINT_LEVELS.length;
  const pw = Math.min(tall ? width - 32 : 680, width - 32),
    px = (width - pw) / 2,
    py = tall ? 120 : 16,
    ph = tall ? Math.round((pw - 120) * 1.2) : 200,
    pwid = Math.round(ph / 1.2),
    sy = py + (tall ? 130 : 106),
    painting = paintScroll(item.painting, true, { width: 960, height: 240 });
  await kit.label(root, won ? t('unpaintWon') : t('unpaintLost'), { x: px, y: py + (tall ? 30 : 22), size: tall ? 38 : 34, weight: 700, color: 0xf1d79a, family: KAI, align: 'center', width: pw });
  await kit.label(root, t('modeUnpaint') + ' · ' + t('unpaint_' + item.id), { x: px, y: py + (tall ? 86 : 70), size: 16, color: 0xc8b48a, family: SANS, align: 'center', width: pw });
  let y = sy + ph + 26;
  const minutes = Math.floor(time / 60),
    secs = Math.floor(time % 60);
  await kit.label(root, t('unpaintStats', { time: `${minutes}:${String(secs).padStart(2, '0')}`, taps, percent: Math.floor(share * 100) }), { x: px, y, size: 16, color: 0xd9c6a0, family: SANS, align: 'center', width: pw });
  y += 30;
  if (!won) {
    const hint = wrap(t('unpaintLostHint'), pw - 60, 14);
    await kit.label(root, hint, { x: px + 30, y, size: 14, color: 0xc8b48a, family: SANS, lineHeight: 20 });
    y += hint.split('\n').length * 20 + 6;
  }
  if (!saved) {
    await kit.label(root, wrap(t('saveRefused'), pw - 40, 13), { x: px + 20, y, size: 13, color: 0xffd08a, family: SANS, lineHeight: 18 });
    y += 40;
  }
  y += 8;
  const half = (pw - 100) / 2;
  const again = await kit.button({
    x: px + 40,
    y,
    width: tall ? pw - 80 : half,
    height: 56,
    text: hasNext ? t('nextPicture') : won ? t('again') : t('retry'),
    primary: true,
    onActivate: () => app.go('unpaint', { level: hasNext ? level + 1 : level })
  });
  await kit.button({ x: tall ? px + 40 : px + 60 + half, y: tall ? y + 68 : y, width: tall ? pw - 80 : half, height: tall ? 52 : 56, text: t('toTitle'), onActivate: () => app.go('title') });
  const bottom = y + (tall ? 68 + 52 : 56) + 22;
  app.backdrop.set((g) => {
    drawPanel(g, px, py, pw, bottom - py);
    const x = (width - pwid) / 2;
    mountScroll(g, { x, y: sy, w: pwid, h: ph });
    const [cx, cy, cw, ch] = item.crop;
    g.drawImage(painting, cx, cy, cw, ch, x, sy, pwid, ph);
  });
  return { ...s, focusFirst: () => again.focus(false), escape: () => app.go('title'), confirm: () => app.go('unpaint', { level: hasNext ? level + 1 : level }) };
}

/** The settings: sound, reduced motion and the language; each change is saved at once. */
export async function settingsScreen(app) {
  const s = begin(app, 'settings'),
    { width, height } = app.stage,
    { kit, root } = s;
  const panelWidth = Math.min(520, width - 48),
    x = (width - panelWidth) / 2,
    y = Math.max(20, height / 2 - 260);
  kit.panel({ x, y, width: panelWidth, height: 520, container: root });
  await kit.label(root, t('settings'), { x, y: y + 26, size: 32, weight: 700, color: 0xf1d79a, family: KAI, align: 'center', width: panelWidth });
  const settings = app.save.data.settings;
  const sound = await kit.toggle({ x: x + 40, y: y + 96, width: panelWidth - 80, text: t('sound'), checked: settings.sound, onChange: (on) => app.setSetting('sound', on) });
  await kit.toggle({ x: x + 40, y: y + 156, width: panelWidth - 80, text: t('reducedMotion'), checked: settings.reducedMotion, onChange: (on) => app.setSetting('reducedMotion', on) });
  await kit.choice({ x: x + 40, y: y + 236, width: panelWidth - 80, height: 48, options: [['zh', '中文'], ['en', 'English']], selected: getLanguage(), onChange: (language) => app.switchLanguage(language) });
  await kit.label(root, wrap(t('howTo'), panelWidth - 80, 15), { x: x + 40, y: y + 310, size: 15, color: 0xc8b48a, family: SANS, lineHeight: 22 });
  await kit.button({ x: x + 40, y: y + 440, width: panelWidth - 80, height: 58, text: t('close'), primary: true, onActivate: () => app.go('title') });
  return { ...s, focusFirst: () => app.game.keyboard?.focus(sound.id, { visible: false }), escape: () => app.go('title') };
}
