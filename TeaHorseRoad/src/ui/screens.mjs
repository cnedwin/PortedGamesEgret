// 几块整屏的界面：标题（画面是缓缓转动的出发驿站）、开场字卡、结尾短片（引擎的 createBrowserVideo 播放）和结算。
// 其余的对话（暂停、设置、驿站、营地）是 card.mjs 的卡片。
// The whole-screen parts of the interface: the title (over a slow turn round the first station), the opening cards,
// the closing film (played by the engine's `createBrowserVideo`) and the account of the journey. The other dialogs —
// pause, settings, stations, the camp — are cards from card.mjs.
import { DisplayObjectContainer, Sprite, animate } from '@egret/engine';
import { createBrowserVideo } from '@egret/engine/web/video';
import { FLAG_RED, FONT, INK, PAPER, SAFFRON, SANS, CONTROL, controlScale, createScreenKit } from './kit.mjs';
import { OPENING } from '../play/story.mjs';

const stops = (...pairs) => pairs.map(([offset, color, alpha = 1]) => ({ offset, color, alpha }));

/** The title: the name, a line about the road, and the ways in. */
export async function titleScreen(ui, { journey, best, onNew, onContinue, onSettings, animateIn = true }) {
  const { game, semantics, sound } = ui,
    scope = game.engine.createScope(),
    kit = createScreenKit(game, scope, { semantics, sound, prefix: 'title' }),
    root = game.stage.addChild(scope.use(new DisplayObjectContainer()));
  // Give the live camera the right half of the title composition.
  const wash = root.addChild(scope.use(new Sprite()));
  const frame = root.addChild(scope.use(new Sprite())).graphics,
    column = root.addChild(scope.use(new DisplayObjectContainer()));
  const ornament = column.addChild(scope.use(new Sprite())).graphics;
  ornament.lineStyle(1, SAFFRON, 0.58).moveTo(0, 32).lineTo(352, 32).lineStyle(0);
  ornament.beginFill(FLAG_RED).drawRect(352, 56, 38, 38).endFill();
  const labels = [];
  const titleLabel = async (text, options) => {
    const made = await kit.label(column, text, options);
    labels.push(made.display);
    return made;
  };
  await titleLabel('滇南茶山  /  金沙峡谷  /  梅里雪山', { y: 8, size: 16, color: SAFFRON, family: SANS });
  await titleLabel('茶马古道', { x: -4, y: 44, size: 84, weight: 900, color: PAPER, family: FONT });
  await titleLabel('茶', { x: 358, y: 60, size: 27, weight: 700, color: PAPER, family: FONT });
  await titleLabel('TEA HORSE ROAD', { x: 2, y: 150, size: 23, weight: 700, color: SAFFRON, family: SANS });
  const savedAndBest = Boolean(journey && journey.station > 0 && best);
  // A resumed journey can have three buttons as well as a personal best. Compact only the surrounding words,
  // reserving the same 70-unit button heights and a separate safe-area footer.
  await titleLabel('雪封山之前，把七十二捆茶送到高原。', { y: savedAndBest ? 182 : 198, size: 24, color: PAPER, family: FONT });
  await titleLabel('Bring the tea caravan across the pass before the snow closes it.', { y: savedAndBest ? 216 : 232, size: 16, color: 0xd7c9ac, family: SANS });
  const buttons = [];
  let y = savedAndBest ? 248 : 270;
  if (journey && journey.station > 0) {
    buttons.push(await kit.button({ x: 0, y, width: 320, text: '继续旅程', sub: `从 ${journey.stationName} 出发 · ${journey.cargoLeft} 捆茶`, primary: true, onActivate: onContinue, container: column, name: '继续旅程' }));
    y += CONTROL + 8;
  }
  buttons.push(await kit.button({ x: 0, y, width: 320, text: journey && journey.station > 0 ? '重新出发' : '出发', sub: 'New journey', primary: !(journey && journey.station > 0), onActivate: onNew, container: column, name: '出发 新的旅程' }));
  y += CONTROL + 8;
  buttons.push(await kit.button({ x: 0, y, width: 320, text: '设置', sub: 'Settings', onActivate: onSettings, container: column, small: true }));
  if (best) await titleLabel(`最好的一趟：送到 ${best.delivered} 捆 · ${Math.floor(best.seconds / 60)} 分 ${Math.round(best.seconds % 60)} 秒`, { x: 4, y: y + CONTROL + 12, size: 15, color: 0xd8c08a, family: SANS });
  const footer = await kit.label(root, '基于新白鹭引擎开发 · Powered by Egret', { size: 14, color: 0xcebb94, family: SANS });
  kit.onScreenChange(({ width, height, safe, scale }) => {
    const margin = 12 / scale,
      left = safe.x + Math.max(margin, Math.min(64, safe.width * 0.06)),
      right = safe.x + safe.width - margin,
      bottom = safe.y + safe.height - margin,
      f = controlScale(game.screen),
      columnHeight = y + CONTROL + (best ? 38 : 0);
    const g = wash.graphics;
    g.clear();
    g.beginLinearGradientFill(0, 0, width * 0.71, 0, stops([0, INK, 0.98], [0.52, INK, 0.82], [1, INK, 0])).drawRect(0, 0, width * 0.71, height).endFill();
    g.beginLinearGradientFill(0, height * 0.8, 0, height, stops([0, INK, 0], [1, INK, 0.8])).drawRect(0, height * 0.8, width, height * 0.2).endFill();
    const fullWidth = Math.max(390, ...labels.map((d) => d.x + d.width));
    // Keep the button height independent of the width of the title words on very narrow screens.
    column.x = left;
    column.y = Math.max(safe.y + margin, safe.y + (safe.height - columnHeight * f - 32 * f) / 2);
    column.scaleX = Math.min(f, (right - left) / fullWidth);
    column.scaleY = f;
    footer.display.x = left;
    footer.display.y = bottom - footer.display.height * f;
    footer.display.scaleX = footer.display.scaleY = f;
    frame.clear();
    frame.lineStyle(1, SAFFRON, 0.58).moveTo(right - 72, safe.y + margin).lineTo(right, safe.y + margin).lineTo(right, safe.y + margin + 72);
    frame.moveTo(right, bottom - 72).lineTo(right, bottom).lineTo(right - 72, bottom).lineStyle(0);
  });
  if (animateIn) {
    root.alpha = 0;
    animate(game.engine, scope, root).to({ alpha: 1 }, 0.8, 'quadOut').start();
  }
  semantics.publish();
  return {
    kit,
    focusFirst: () => buttons[0]?.focus(false),
    confirm: () => void (journey && journey.station > 0 ? onContinue() : onNew()),
    dispose() {
      kit.dispose();
      scope.dispose();
    }
  };
}

/** The opening: card after card of words over the hills; a press or a key goes to the next. */
export async function openingScreen(ui, { onDone, startAt = 0 }) {
  const { game, semantics, sound } = ui,
    scope = game.engine.createScope(),
    kit = createScreenKit(game, scope, { semantics, sound, prefix: 'opening' }),
    root = game.stage.addChild(scope.use(new DisplayObjectContainer()));
  const veil = root.addChild(scope.use(new Sprite()));
  veil.touchEnabled = true;
  const words = root.addChild(scope.use(new DisplayObjectContainer()));
  const zh = await kit.label(words, '', { x: 0, y: 0, size: 30, color: PAPER, family: FONT, weight: 700 });
  const en = await kit.label(words, '', { x: 0, y: 46, size: 16, color: 0xd7c9ac, family: SANS });
  const pages = root.addChild(scope.use(new Sprite()));
  let index = startAt - 1,
    finished = false,
    changing = false;
  async function next() {
    if (finished || changing) return;
    changing = true;
    try {
      index++;
      if (index >= OPENING.length) {
        finished = true;
        onDone();
        return;
      }
      const card = OPENING[index];
      await zh.set(card.zh);
      await en.set(card.en);
      placeWords(game.screen);
      words.alpha = 0;
      animate(game.engine, scope, words).to({ alpha: 1 }, 0.45, 'quadOut').start();
      pages.graphics.clear();
      for (let i = 0; i < OPENING.length; i++) {
        pages.graphics.beginFill(i === index ? SAFFRON : PAPER, i === index ? 1 : 0.3).drawRoundRect(27 * i, 0, 20, 3, 2, 2).endFill();
      }
      shownFor = 0;
      semantics.publish();
    } finally {
      changing = false;
    }
  }
  let shownFor = 0;
  kit.own({ dispose: veil.on(game.pointer.events.tap, () => void next()) });
  const skip = await kit.button({ x: 0, y: 0, width: 152, text: '跳过 ›', name: '跳过开场', onActivate: () => {
    if (finished) return;
    finished = true;
    onDone();
  }, container: root, small: true });
  function placeWords({ safe, scale }) {
    const f = controlScale(game.screen),
      margin = 12 / scale,
      w = Math.max(1, zh.display.width, en.display.width);
    words.scaleX = words.scaleY = Math.min(f, (safe.width - margin * 2) / w);
    zh.display.x = -zh.display.width / 2;
    en.display.x = -en.display.width / 2;
    words.x = safe.x + safe.width / 2;
    words.y = safe.y + safe.height - margin - CONTROL * f - 82 * f;
  }
  kit.onScreenChange(({ width, height, safe, scale }) => {
    const f = controlScale(game.screen), margin = 12 / scale;
    veil.graphics.clear();
    veil.graphics.beginLinearGradientFill(0, height * 0.36, 0, height, stops([0, INK, 0], [0.56, INK, 0.8], [1, INK, 0.98])).drawRect(0, 0, width, height).endFill();
    veil.hitArea = { x: 0, y: 0, width, height };
    placeWords(game.screen);
    skip.root.scaleX = skip.root.scaleY = f;
    skip.root.x = safe.x + safe.width - margin - 152 * f;
    skip.root.y = safe.y + safe.height - margin - CONTROL * f;
    pages.scaleX = pages.scaleY = f;
    pages.x = safe.x + safe.width / 2 - 50 * f;
    pages.y = skip.root.y - 14 * f;
  });
  kit.own(semantics.add({ id: 'opening-words', role: 'status', describe: () => ({ name: OPENING[Math.max(0, index)]?.zh ?? '', bounds: { x: game.screen.safe.x, y: words.y, width: game.screen.safe.width, height: 100 * words.scaleY } }) }));
  await next();
  return {
    kit,
    get index() { return Math.min(index, OPENING.length - 1); },
    focusFirst: () => skip.focus(false),
    confirm: () => next(),
    update(seconds) {
      shownFor += seconds;
      if (shownFor > 5.5) next();
    },
    dispose() {
      kit.dispose();
      scope.dispose();
    }
  };
}

/**
 * The closing film, played by the engine's video player; the account of the journey follows it. `film` holds the
 * addresses of the film in its two forms.
 */
export async function filmScreen(ui, { film, onDone }) {
  const { game, semantics, sound } = ui,
    scope = game.engine.createScope(),
    kit = createScreenKit(game, scope, { semantics, sound, prefix: 'film' }),
    root = game.stage.addChild(scope.use(new DisplayObjectContainer()));
  const black = root.addChild(scope.use(new Sprite()));
  const video = scope.use(
    createBrowserVideo({
      assets: game.engine.assets,
      src: film,
      maxWidth: 1280,
      muted: true
    })
  );
  root.addChild(video.display);
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    onDone();
  };
  video.onEnded(done);
  try {
    await video.play();
  } catch {
    done();
  }
  const skip = await kit.button({ x: 0, y: 0, width: 140, text: '跳过 ›', name: '跳过结尾短片', onActivate: done, container: root, small: true });
  skip.root.alpha = 0;
  animate(game.engine, scope, skip.root).wait(1.5).to({ alpha: 1 }, 0.4).start();
  kit.onScreenChange(({ width, height, safe, scale }) => {
    black.graphics.clear();
    black.graphics.beginFill(0x000000, 1).drawRect(0, 0, width, height).endFill();
    const f = controlScale(game.screen), margin = 12 / scale;
    skip.root.scaleX = skip.root.scaleY = f;
    skip.root.x = safe.x + safe.width - margin - 140 * f;
    skip.root.y = safe.y + safe.height - margin - CONTROL * f;
  });
  kit.own(semantics.add({ id: 'film', role: 'image', describe: () => ({ name: '结尾短片：车队在黄昏驶进高原驿站，经幡在风里飘。', bounds: { x: 0, y: 0, width: game.screen.width, height: game.screen.height } }) }));
  semantics.publish();
  let waited = 0;
  return {
    kit,
    focusFirst: () => skip.focus(false),
    confirm: done,
    update(seconds) {
      // A page that never gets the film's first picture goes on to the account.
      waited += seconds;
      if (!video.width && waited > 6) done();
      void video.update();
      if (video.width) {
        const { width, height } = game.screen;
        const s = Math.min(width / video.width, height / video.height);
        video.display.scaleX = video.display.scaleY = s;
        video.display.x = (width - video.width * s) / 2;
        video.display.y = (height - video.height * s) / 2;
      }
    },
    dispose() {
      kit.dispose();
      scope.dispose();
    }
  };
}
