// 几块整屏的界面：标题（画面是缓缓转动的出发驿站）、开场字卡、结尾短片（引擎的 createBrowserVideo 播放）和结算。
// 其余的对话（暂停、设置、驿站、营地）是 card.mjs 的卡片。
// The whole-screen parts of the interface: the title (over a slow turn round the first station), the opening cards,
// the closing film (played by the engine's `createBrowserVideo`) and the account of the journey. The other dialogs —
// pause, settings, stations, the camp — are cards from card.mjs.
import { DisplayObjectContainer, Sprite, animate } from '@egret/engine';
import { createBrowserVideo } from '@egret/engine/web/video';
import { FONT, INK, PAPER, SAFFRON, SANS, STAGE, createScreenKit } from './kit.mjs';
import { OPENING } from '../play/story.mjs';

const stops = (...pairs) => pairs.map(([offset, color, alpha = 1]) => ({ offset, color, alpha }));

/** The title: the name, a line about the road, and the ways in. */
export async function titleScreen(ui, { journey, best, onNew, onContinue, onSettings }) {
  const H = STAGE.height,
    // The title is laid out for 720 units; on a shorter stage it closes up.
    v = (y) => Math.round((y * H) / 720),
    { game, width, semantics, sound } = ui,
    scope = game.engine.createScope(),
    kit = createScreenKit(game, scope, { semantics, sound, prefix: 'title' }),
    root = game.stage.addChild(scope.use(new DisplayObjectContainer()));
  // A wash of dusk across the left, where the words are.
  const wash = root.addChild(scope.use(new Sprite()));
  wash.graphics.beginLinearGradientFill(0, 0, width * 0.62, 0, stops([0, 0x0a0e18, 0.86], [0.7, 0x0a0e18, 0.45], [1, 0x0a0e18, 0])).drawRect(0, 0, width * 0.62, H).endFill();
  const left = Math.round(width * 0.07);
  // The five colours, as a line of flags across the top.
  const flags = root.addChild(scope.use(new Sprite()));
  [0x2f6fb5, 0xf2efe6, 0xb8392c, 0x2e8c86, SAFFRON].forEach((colour, i) => {
    for (let k = 0; k < 3; k++) {
      const x = left + (k * 5 + i) * 34,
        sag = Math.sin(((k * 5 + i) / 14) * Math.PI) * 14;
      flags.graphics.lineStyle(1.5, INK, 0.8).beginFill(colour, 0.95).drawRect(x, v(52) + sag, 26, 32).endFill();
    }
  });
  flags.graphics.lineStyle(2, 0xd8cca8, 0.8).moveTo(left - 10, v(50)).curveTo(left + 230, v(50) + 28, left + 500, v(50)).lineStyle(0);
  await kit.label(root, '茶马古道', { x: left, y: v(140), size: 96, weight: 900, color: 0xf8ead0, family: FONT });
  await kit.label(root, 'TEA HORSE ROAD', { x: left + 6, y: v(140) + 122, size: 26, weight: 600, color: SAFFRON, family: SANS });
  await kit.label(root, '三辆车，七十二捆茶，从滇南茶山翻过雪山，送到高原驿站。', { x: left + 4, y: v(140) + 172, size: 20, color: PAPER, family: FONT });
  await kit.label(root, 'Three trucks, seventy-two bundles of tea, over the snow mountains to the plateau.', { x: left + 4, y: v(140) + 204, size: 15, color: 0xc8bfa6, family: SANS });
  const buttons = [];
  let y = v(140) + 254;
  if (journey && journey.station > 0) {
    buttons.push(await kit.button({ x: left, y, width: 320, height: 58, text: '继续旅程', sub: `从 ${journey.stationName} 出发 · ${journey.cargoLeft} 捆茶`, primary: true, onActivate: onContinue, container: root, name: '继续旅程' }));
    y += 68;
  }
  buttons.push(await kit.button({ x: left, y, width: 320, height: 58, text: journey && journey.station > 0 ? '重新出发' : '出发', sub: 'New journey', primary: !(journey && journey.station > 0), onActivate: onNew, container: root, name: '出发 新的旅程' }));
  y += 68;
  buttons.push(await kit.button({ x: left, y, width: 320, height: 50, text: '设置', sub: 'Settings', onActivate: onSettings, container: root, small: true }));
  if (best) await kit.label(root, `最好的一趟：送到 ${best.delivered} 捆 · ${Math.floor(best.seconds / 60)} 分 ${Math.round(best.seconds % 60)} 秒`, { x: left + 4, y: y + 62, size: 15, color: 0xd8c08a, family: SANS });
  await kit.label(root, '基于新白鹭引擎独立开发的游戏 Demo · A demo built on the new Egret engine', { x: left + 4, y: H - 40, size: 13, color: 0x9a9480, family: SANS });
  root.alpha = 0;
  animate(game.engine, scope, root).to({ alpha: 1 }, 0.8, 'quadOut').start();
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
export async function openingScreen(ui, { onDone }) {
  const H = STAGE.height,
    { game, width, semantics, sound } = ui,
    scope = game.engine.createScope(),
    kit = createScreenKit(game, scope, { semantics, sound, prefix: 'opening' }),
    root = game.stage.addChild(scope.use(new DisplayObjectContainer()));
  const veil = root.addChild(scope.use(new Sprite()));
  veil.graphics.beginLinearGradientFill(0, H * 0.45, 0, H, stops([0, 0x05080e, 0], [0.5, 0x05080e, 0.7], [1, 0x05080e, 0.9])).drawRect(0, 0, width, H).endFill();
  veil.touchEnabled = true;
  veil.hitArea = { x: 0, y: 0, width, height: H };
  const words = root.addChild(scope.use(new DisplayObjectContainer()));
  const zh = await kit.label(words, '', { x: 0, y: 0, size: 32, color: 0xf8ead0, family: FONT, weight: 600 });
  const en = await kit.label(words, '', { x: 0, y: 52, size: 17, color: 0xc8bfa6, family: SANS });
  let index = -1,
    finished = false;
  async function next() {
    if (finished) return;
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
    animate(game.engine, scope, words).to({ alpha: 1 }, 0.6, 'quadOut').start();
    shownFor = 0;
    semantics.publish();
  }
  let shownFor = 0;
  kit.own({ dispose: veil.on(game.pointer.events.tap, () => void next()) });
  const skip = await kit.button({ x: width - 170, y: H - 74, width: 140, height: 48, text: '跳过 ›', name: '跳过开场', onActivate: () => ((index = OPENING.length - 1), next()), container: root, small: true });
  kit.own(semantics.add({ id: 'opening-words', role: 'status', describe: () => ({ name: OPENING[Math.max(0, index)]?.zh ?? '', bounds: { x: 0, y: H - 210, width, height: 100 } }) }));
  await next();
  return {
    kit,
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
