// 画面：卷首（标题）、作画（一局）、暂停、卷尾（结算）和设置。每个画面在自己的作用域里建，离开时一起放掉；字一律
// 从 t() 取，按舞台的宽高排，横屏和竖屏都排得下。
// The screens: the title, painting (a round), the pause, the end of a round and the settings. Each is made in its own
// scope and let go as a whole when it is left; every word comes from t(), and the layout follows the stage's width and
// height, so it fits both a wide and a tall stage.
import { DisplayObjectContainer, Sprite } from '@egret/engine';
import { AMBER, PAPER, SANS, createScreenKit } from './ui/kit.mjs';
import { PIGMENTS, createGame, createRandom, progress } from './sim/sand.mjs';
import { recordRound } from './saves.mjs';
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

/** The title: the name, the scroll, the best score, and the ways in. */
export async function titleScreen(app) {
  const s = begin(app, 'title'),
    { width, height } = app.stage,
    { kit, root, scope } = s;
  const tall = height > width;
  kit.own({ dispose: sandRain(app) });
  const centre = tall ? width / 2 : width * 0.33,
    scrollW = tall ? width - 64 : width * 0.5,
    scrollY = tall ? 268 : 236,
    scrollH = Math.round(scrollW / 4),
    best = app.save.data.best,
    done = app.save.data.finished.includes('spring'),
    infoY = scrollY + scrollH + 34,
    howWidth = tall ? width - 120 : scrollW;
  // Everything on the title that never moves — the name, the scroll on its mount, the best score and how to play — is
  // painted once by the page under the engine's canvas, which then draws only the buttons and the drifting sand
  // (ENGINE-NOTES 7).
  const painting = paintScroll('spring', true, { width: 960, height: 240 });
  app.backdrop.set((g) => {
    const text = (words, x, y, size, colour, family = SANS, weight = 400, align = 'center', lineHeight = size * 1.5) => {
      g.font = `${weight} ${size}px ${family}`;
      g.fillStyle = colour;
      g.textAlign = align;
      g.textBaseline = 'top';
      words.split('\n').forEach((line, k) => g.fillText(line, x, y + k * lineHeight));
    };
    text(t('title'), centre, tall ? 92 : 70, tall ? 84 : 76, '#f1d79a', KAI, 700);
    text(t('subtitle'), centre, tall ? 206 : 176, tall ? 19 : 18, '#d9c6a0');
    mountScroll(g, { x: centre - scrollW / 2, y: scrollY, w: scrollW, h: scrollH });
    g.drawImage(painting, centre - scrollW / 2, scrollY, scrollW, scrollH);
    text(best ? t('best', { score: best.toLocaleString(locale()) }) : t('noBest'), centre, infoY, 18, '#c8b48a');
    if (done) text(t('scrollDone'), centre, infoY + 28, 16, '#e2b866');
    text(wrap(t('howTo'), howWidth, 15), centre - howWidth / 2, infoY + (done ? 64 : 40), 15, '#b9a37c', SANS, 400, 'left', 23);
  });
  const buttonWidth = tall ? width - 120 : 260,
    bx = tall ? 60 : width - 300;
  let y = tall ? 600 : 170;
  const start = await kit.button({ x: bx, y, width: buttonWidth, height: 68, text: t('start'), primary: true, onActivate: () => app.go('play') });
  y += 86;
  await kit.button({ x: bx, y, width: buttonWidth, height: 60, text: t('settings'), onActivate: () => app.go('settings') });
  y += 76;
  await kit.button({ x: bx, y, width: buttonWidth, height: 60, text: t('language'), name: t('languageName'), onActivate: () => app.switchLanguage() });
  if (app.notice) await kit.label(root, app.notice, { x: 20, y: height - 40, size: 14, color: 0xffd08a, family: SANS });
  return { ...s, kit, focusFirst: () => start.focus(false), confirm: () => app.go('play') };
}

/** Painting: one round on the first scroll. */
export async function playScreen(app, { resume = false } = {}) {
  const s = begin(app, 'play'),
    { width, height } = app.stage,
    { kit, root, scope } = s;
  const tall = height > width;
  // A new round, or after the screen was turned, the round that was in play.
  const game = resume && app.round && !app.round.over ? app.round : (app.round = createGame(app.seed + app.rounds++));
  let ended = null;
  const view = await createPlayView(app, scope, root, kit, game, {
    words: t,
    locale: locale(),
    ended(won) {
      if (ended) return;
      app.sound.play(won ? 'won' : 'lost');
      let best = false;
      const saved = app.save.update((data) => {
        best = recordRound(data, { score: game.score, scroll: game.level.id, won });
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
    await kit.label(root, t('scrollName'), { x: 22, y: 26, size: 16, color: 0xc8b48a, family: SANS });
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
      await kit.button({ x: px + 36, y: py + 166, width: pw - 72, height: 52, text: t('restart'), container: layer, onActivate: () => app.go('play') });
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
        const result = { ...ended, score: game.score, share: progress(game), time: game.time, pieces: game.pieces, chain: game.bestChain };
        ended = null;
        void app.go('end', result);
      }
    }
  };
}

/** The end of a round: the painting as far as it got, the score, and the ways on. */
export async function endScreen(app, result) {
  const s = begin(app, 'end'),
    { width, height } = app.stage,
    { kit, root } = s;
  const tall = height > width;
  const { won, best, saved, score, share, time, pieces, chain } = result;
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
    painter = createScrollPainter('spring', { width: 960, height: 240 });
  painter.paint(won ? 1 : share);
  await kit.label(root, won ? t('won') : t('lost'), { x: px, y: py + (tall ? 30 : 22), size: tall ? 40 : 36, weight: 700, color: 0xf1d79a, family: KAI, align: 'center', width: pw });
  await kit.label(root, t('scrollName'), { x: px, y: py + (tall ? 90 : 74), size: 16, color: 0xc8b48a, family: SANS, align: 'center', width: pw });
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
  const again = await kit.button({ x: px + 40, y, width: tall ? pw - 80 : half, height: 56, text: won ? t('again') : t('retry'), primary: true, onActivate: () => app.go('play') });
  await kit.button({ x: tall ? px + 40 : px + 60 + half, y: tall ? y + 68 : y, width: tall ? pw - 80 : half, height: tall ? 52 : 56, text: t('toTitle'), onActivate: () => app.go('title') });
  const bottom = y + (tall ? 68 + 52 : 56) + 22;
  app.backdrop.set((g) => {
    drawPanel(g, px, py, pw, bottom - py);
    mountScroll(g, { x: (width - sw) / 2, y: sy, w: sw, h: sh });
    g.drawImage(painter.canvas, (width - sw) / 2, sy, sw, sh);
  });
  return { ...s, focusFirst: () => again.focus(false), escape: () => app.go('title'), confirm: () => app.go('play') };
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
