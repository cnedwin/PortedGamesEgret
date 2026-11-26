// 几块整屏的界面：标题（画面是缓缓转动的出发驿站）、开场字卡、结尾短片（引擎的 createBrowserVideo 播放）和结算。
// 其余的对话（暂停、设置、驿站、营地）是 card.mjs 的卡片。
// The whole-screen parts of the interface: the title (over a slow turn round the first station), the opening cards,
// the closing film (played by the engine's `createBrowserVideo`) and the account of the journey. The other dialogs —
// pause, settings, stations, the camp — are cards from card.mjs.
import { DisplayObjectContainer, Sprite, animate } from '@egret/engine';
import { createBrowserVideo } from '@egret/engine/web/video';
import { FLAG_RED, FONT, INK, PAPER, SAFFRON, SANS, STAGE, createScreenKit } from './kit.mjs';
import { OPENING } from '../play/story.mjs';

const stops = (...pairs) => pairs.map(([offset, color, alpha = 1]) => ({ offset, color, alpha }));

/** The title: the name, a line about the road, and the ways in. */
export async function titleScreen(ui, { journey, best, onNew, onContinue, onSettings, animateIn = true }) {
  const H = STAGE.height,
    // The title is laid out for 720 units; on a shorter stage it closes up.
    v = (y) => Math.round((y * H) / 720),
    { game, width, semantics, sound } = ui,
    scope = game.engine.createScope(),
    kit = createScreenKit(game, scope, { semantics, sound, prefix: 'title' }),
    root = game.stage.addChild(scope.use(new DisplayObjectContainer()));
  // Give the live camera the right half of the title composition.
  const wash = root.addChild(scope.use(new Sprite()));
  wash.graphics.beginLinearGradientFill(0, 0, width * 0.71, 0, stops([0, INK, 0.98], [0.52, INK, 0.82], [1, INK, 0])).drawRect(0, 0, width * 0.71, H).endFill();
  wash.graphics.beginLinearGradientFill(0, H * 0.8, 0, H, stops([0, INK, 0], [1, INK, 0.8])).drawRect(0, H * 0.8, width, H * 0.2).endFill();
  const left = Math.round(width * 0.07);
  const frame = root.addChild(scope.use(new Sprite())).graphics;
  frame.lineStyle(1, SAFFRON, 0.58).moveTo(left, v(84)).lineTo(left + 352, v(84));
  frame.moveTo(width - left - 72, v(64)).lineTo(width - left, v(64)).lineTo(width - left, v(136));
  frame.moveTo(width - left, H - v(136)).lineTo(width - left, H - v(64)).lineTo(width - left - 72, H - v(64)).lineStyle(0);
  frame.beginFill(FLAG_RED).drawRect(left + 352, v(112), 38, 38).endFill();
  await kit.label(root, '滇南茶山  /  金沙峡谷  /  梅里雪山', { x: left, y: v(54), size: 16, color: SAFFRON, family: SANS });
  await kit.label(root, '茶马古道', { x: left - 4, y: v(101), size: 84, weight: 900, color: PAPER, family: FONT });
  await kit.label(root, '茶', { x: left + 358, y: v(116), size: 27, weight: 700, color: PAPER, family: FONT });
  await kit.label(root, 'TEA HORSE ROAD', { x: left + 2, y: v(215), size: 23, weight: 700, color: SAFFRON, family: SANS });
  await kit.label(root, '雪封山之前，把七十二捆茶送到高原。', { x: left, y: v(274), size: 24, color: PAPER, family: FONT });
  await kit.label(root, 'Bring the tea caravan across the pass before the snow closes it.', { x: left, y: v(316), size: 16, color: 0xd7c9ac, family: SANS });
  const buttons = [];
  let y = v(370);
  if (journey && journey.station > 0) {
    buttons.push(await kit.button({ x: left, y, width: 320, height: 58, text: '继续旅程', sub: `从 ${journey.stationName} 出发 · ${journey.cargoLeft} 捆茶`, primary: true, onActivate: onContinue, container: root, name: '继续旅程' }));
    y += 68;
  }
  buttons.push(await kit.button({ x: left, y, width: 320, height: 58, text: journey && journey.station > 0 ? '重新出发' : '出发', sub: 'New journey', primary: !(journey && journey.station > 0), onActivate: onNew, container: root, name: '出发 新的旅程' }));
  y += 68;
  buttons.push(await kit.button({ x: left, y, width: 320, height: 50, text: '设置', sub: 'Settings', onActivate: onSettings, container: root, small: true }));
  if (best) await kit.label(root, `最好的一趟：送到 ${best.delivered} 捆 · ${Math.floor(best.seconds / 60)} 分 ${Math.round(best.seconds % 60)} 秒`, { x: left + 4, y: y + 62, size: 15, color: 0xd8c08a, family: SANS });
  await kit.label(root, '基于新白鹭引擎开发 · Powered by Egret', { x: left, y: H - 38, size: 14, color: 0xcebb94, family: SANS });
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
  const H = STAGE.height,
    { game, width, semantics, sound } = ui,
    scope = game.engine.createScope(),
    kit = createScreenKit(game, scope, { semantics, sound, prefix: 'opening' }),
    root = game.stage.addChild(scope.use(new DisplayObjectContainer()));
  const veil = root.addChild(scope.use(new Sprite()));
  veil.graphics.beginLinearGradientFill(0, H * 0.36, 0, H, stops([0, INK, 0], [0.56, INK, 0.8], [1, INK, 0.98])).drawRect(0, 0, width, H).endFill();
  veil.touchEnabled = true;
  veil.hitArea = { x: 0, y: 0, width, height: H };
  const words = root.addChild(scope.use(new DisplayObjectContainer()));
  const zh = await kit.label(words, '', { x: 0, y: 0, size: 30, color: PAPER, family: FONT, weight: 700 });
  const en = await kit.label(words, '', { x: 0, y: 46, size: 16, color: 0xd7c9ac, family: SANS });
  const pages = root.addChild(scope.use(new Sprite()));
  pages.x = width / 2 - 50;
  pages.y = H - 112;
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
      zh.display.x = (width - zh.display.width) / 2;
      en.display.x = (width - en.display.width) / 2;
      words.y = H - 210;
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
  const skip = await kit.button({ x: width - 184, y: H - 82, width: 152, height: 54, text: '跳过 ›', name: '跳过开场', onActivate: () => {
    if (finished) return;
    finished = true;
    onDone();
  }, container: root, small: true });
  kit.own(semantics.add({ id: 'opening-words', role: 'status', describe: () => ({ name: OPENING[Math.max(0, index)]?.zh ?? '', bounds: { x: 0, y: H - 210, width, height: 100 } }) }));
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
  const H = STAGE.height,
    { game, width, semantics, sound } = ui,
    scope = game.engine.createScope(),
    kit = createScreenKit(game, scope, { semantics, sound, prefix: 'film' }),
    root = game.stage.addChild(scope.use(new DisplayObjectContainer()));
  const black = root.addChild(scope.use(new Sprite()));
  black.graphics.beginFill(0x000000, 1).drawRect(0, 0, width, H).endFill();
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
  const skip = await kit.button({ x: width - 170, y: H - 74, width: 140, height: 48, text: '跳过 ›', name: '跳过结尾短片', onActivate: done, container: root, small: true });
  skip.root.alpha = 0;
  animate(game.engine, scope, skip.root).wait(1.5).to({ alpha: 1 }, 0.4).start();
  kit.own(semantics.add({ id: 'film', role: 'image', describe: () => ({ name: '结尾短片：车队在黄昏驶进高原驿站，经幡在风里飘。', bounds: { x: 0, y: 0, width, height: H } }) }));
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
        const s = Math.min(width / video.width, H / video.height);
        video.display.scaleX = video.display.scaleY = s;
        video.display.x = (width - video.width * s) / 2;
        video.display.y = (H - video.height * s) / 2;
      }
    },
    dispose() {
      kit.dispose();
      scope.dispose();
    }
  };
}
