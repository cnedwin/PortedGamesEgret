// 各个画面：标题、开场短片、选关、关卡、结算、结局。每个画面是一个作用域，离开时一起回收。
// The screens: the title, the opening film, choosing a level, a level, its result and the end. Each screen
// has a scope of its own and is let go whole when the game moves on.
import { DisplayObjectContainer, Sprite, animate } from '@egret/engine';
import { createBitmapText } from '@egret/engine/bitmapfont';
import { createScrollControl, createSelectionGroup, createControlKeys } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { createBrowserVideo } from '@egret/engine/web/video';
import { GOLD, INK, LACQUER } from './art/shapes.mjs';
import { createLevel } from './play/level.mjs';
import { createScenery } from './play/scenery.mjs';
import { recordClear, totalStars } from './saves.mjs';
import { BEFORE, CHAPTERS, ENDING, INTRO_LINES, SPEAKERS, chapterOf } from './story.mjs';
import { createHud } from './ui/hud.mjs';
import { FONT, SANS, createScreenKit } from './ui/kit.mjs';

const stops = (...pairs) => pairs.map(([offset, color, alpha = 1]) => ({ offset, color, alpha }));

/** A backdrop for the menus: the night sky and the city, without a level. */
function backdrop(app, scope, chapter = 0) {
  const root = app.game.stage.addChild(scope.use(new DisplayObjectContainer())),
    scenery = createScenery(scope, { width: 1400, height: 800, chapter });
  root.addChild(scenery.sky);
  for (const layer of scenery.layers) {
    root.addChild(layer.display);
    layer.display.y = 40;
  }
  return { root, scenery, layers: scenery.layers };
}

/** Five-petalled stars in a row: lit for the stars earned. */
function drawStars(g, count, { size = 12, gap = 30, x = 0, y = 0, of = 3 } = {}) {
  for (let i = 0; i < of; i++) {
    const cx = x + i * gap,
      lit = i < count,
      points = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5,
        r = k % 2 ? size * 0.45 : size;
      points.push([cx + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    g.lineStyle(1.5, INK, 1).beginFill(lit ? GOLD : 0x3a3530, 1).moveTo(...points[0]);
    for (const point of points.slice(1)) g.lineTo(...point);
    g.lineTo(...points[0]).endFill().lineStyle(0);
  }
}

// ── The title ──────────────────────────────────────────────────────────────────────────────
export async function titleScreen(app) {
  const scope = app.game.engine.createScope(),
    { game, save, semantics } = app,
    kit = createScreenKit(game, scope, { semantics, sound: app.sound, prefix: 'title' });
  const back = backdrop(app, scope, 0);
  const ui = game.stage.addChild(scope.use(new DisplayObjectContainer()));
  // The title, in the page's serif, glowing gold through the engine's glow effect.
  const titleBox = ui.addChild(scope.use(new DisplayObjectContainer()));
  await kit.label(titleBox, '千机巧匠', { x: 0, y: 0, size: 76, weight: 800, color: 0xf2c870, align: 'center', width: 960 });
  await kit.label(titleBox, 'MECHANISM CITY · 墨家机关城', { x: 0, y: 100, size: 18, color: 0xd8ccb0, family: SANS, align: 'center', width: 960 });
  titleBox.y = 84;
  titleBox.renderEffect = { glow: { color: 0xc8782c, blur: 10, strength: 2, alpha: 0.8 } };
  titleBox.alpha = 0;
  animate(game.engine, scope, titleBox).to({ alpha: 1, y: 70 }, 0.9, 'cubicOut').start();
  const rule = ui.addChild(scope.use(new Sprite()));
  rule.graphics.beginLinearGradientFill(330, 0, 630, 0, stops([0, LACQUER, 0], [0.5, LACQUER, 1], [1, LACQUER, 0])).drawRect(330, 202, 300, 3).endFill();

  const stars = totalStars(save.data),
    started = Object.keys(save.data.levels).length > 0;
  const buttons = [
    await kit.button({ x: 380, y: 236, width: 200, height: 58, text: started ? '继续' : '开始', sub: started ? `已得 ${stars} / 36 星` : '进城开锁', primary: true, onActivate: () => (started ? app.go('select') : save.data.seenIntro ? app.startLevel(0) : app.go('film', { then: 'first' })), container: ui }),
    await kit.button({ x: 380, y: 308, width: 200, height: 48, text: '选关', onActivate: () => app.go('select'), container: ui }),
    await kit.button({ x: 380, y: 370, width: 200, height: 48, text: '开场短片', onActivate: () => app.go('film', { then: 'title' }), container: ui }),
    await kit.button({ x: 380, y: 432, width: 200, height: 48, text: '设置', onActivate: () => app.openSettings(), container: ui })
  ];
  await kit.label(ui, '基于新白鹭引擎独立开发的游戏 Demo · A game demo built on Egret Rebuild', { x: 0, y: 508, size: 12, color: 0x8a8070, family: SANS, align: 'center', width: 960 });
  semantics.publish();
  let time = 0;
  return {
    kit,
    update(seconds) {
      time += seconds;
      back.scenery.update(time);
      // The hills and roofs drift slowly behind the title.
      back.layers.forEach((layer, i) => (layer.display.x = -120 + Math.sin(time * 0.05) * (20 + i * 40)));
    },
    focusFirst: () => buttons[0].focus(),
    dispose() {
      kit.dispose();
      scope.dispose();
    }
  };
}

// ── The opening film ───────────────────────────────────────────────────────────────────────
export async function filmScreen(app, { then = 'title' } = {}) {
  const scope = app.game.engine.createScope(),
    { game, semantics } = app,
    kit = createScreenKit(game, scope, { semantics, sound: app.sound, prefix: 'film' });
  const ui = game.stage.addChild(scope.use(new DisplayObjectContainer()));
  const black = ui.addChild(scope.use(new Sprite()));
  black.graphics.beginFill(0x000000, 1).drawRect(0, 0, 960, 540).endFill();
  // H.264 where the browser plays it, VP9 elsewhere: the film is in both forms.
  const probe = document.createElement('video'),
    file = probe.canPlayType('video/mp4; codecs="avc1.42E01E"') ? 'intro.mp4' : 'intro.webm';
  const film = scope.use(createBrowserVideo({ assets: game.engine.assets, src: new URL('../media/' + file, import.meta.url).href, maxWidth: 960, muted: true }));
  ui.addChild(film.display);
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    app.save.update((data) => {
      data.seenIntro = true;
    });
    if (then === 'first') app.startLevel(0);
    else app.go(then);
  };
  film.onEnded(done);
  app.sound.music('title');
  try {
    await film.play();
  } catch {
    // A page that will not play the film goes straight on.
    done();
  }
  const skip = await kit.button({ x: 960 - 150, y: 540 - 66, width: 130, height: 46, text: '跳过 ›', name: '跳过开场短片', onActivate: done, container: ui, small: true });
  skip.root.alpha = 0;
  animate(game.engine, scope, skip.root).wait(1).to({ alpha: 1 }, 0.4).start();
  // The film's words, read out as they appear: the film carries them as pictures only.
  const started = performance.now();
  kit.own(
    semantics.add({
      id: 'film-words',
      role: 'status',
      describe: () => {
        const at = (performance.now() - started) / 1000,
          line = INTRO_LINES.filter(([from]) => from <= at).at(-1);
        return { name: line ? line[1] : '', bounds: { x: 0, y: 460, width: 960, height: 60 } };
      }
    })
  );
  semantics.publish();
  return {
    kit,
    update() {
      void film.update();
      // The pictures come at the size of the film; fit them to the stage.
      if (film.width) {
        const s = Math.min(960 / film.width, 540 / film.height);
        film.display.scaleX = film.display.scaleY = s;
        film.display.x = (960 - film.width * s) / 2;
        film.display.y = (540 - film.height * s) / 2;
      }
    },
    escape: done,
    focusFirst: () => skip.focus(),
    dispose() {
      kit.dispose();
      scope.dispose();
    }
  };
}

// ── Choosing a level ───────────────────────────────────────────────────────────────────────
export async function selectScreen(app, { focus } = {}) {
  const scope = app.game.engine.createScope(),
    { game, save, semantics, levels, font, fontPages } = app,
    kit = createScreenKit(game, scope, { semantics, sound: app.sound, prefix: 'select' }),
    keyboard = game.keyboard;
  const open = save.data.open,
    chosenAt = Math.min(open - 1, focus ?? open - 1);
  const back = backdrop(app, scope, chapterOf(chosenAt));
  const ui = game.stage.addChild(scope.use(new DisplayObjectContainer()));
  await kit.label(ui, '选 关', { x: 40, y: 26, size: 34, weight: 800, color: 0xf2c870 });
  await kit.label(ui, `${totalStars(save.data)} / 36 星 · 拖动滚条、滚轮或方向键浏览`, { x: 40, y: 72, size: 14, color: 0xc8bba0, family: SANS });

  // The strip of cards scrolls across; the viewport clips it to its rectangle (the node's `mask`).
  const VIEW = { x: 40, y: 112, width: 880, height: 300 },
    CARD = { width: 196, height: 268, gap: 24 };
  const viewport = ui.addChild(scope.use(new DisplayObjectContainer()));
  viewport.x = VIEW.x;
  viewport.y = VIEW.y;
  viewport.mask = { x: -8, y: -10, width: VIEW.width + 16, height: VIEW.height + 20 };
  const wheelTarget = viewport.addChild(scope.use(new Sprite()));
  wheelTarget.touchEnabled = true;
  wheelTarget.hitArea = { x: 0, y: 0, width: VIEW.width, height: VIEW.height };
  const strip = viewport.addChild(scope.use(new DisplayObjectContainer()));
  const contentLength = levels.length * (CARD.width + CARD.gap) + CARD.gap * 3;

  const cards = [];
  for (const [index, level] of levels.entries()) {
    const chapter = chapterOf(index),
      x = index * (CARD.width + CARD.gap) + Math.floor(index / 4) * CARD.gap,
      card = strip.addChild(scope.use(new DisplayObjectContainer())),
      face = card.addChild(scope.use(new Sprite())),
      locked = index + 1 > open,
      record = save.data.levels[String(index + 1)];
    card.x = x;
    card.y = 10;
    face.touchEnabled = true;
    face.hitArea = { x: 0, y: 0, width: CARD.width, height: CARD.height };
    const number = scope.use(createBitmapText({ font, pages: fontPages, text: `第${index + 1}关`, align: 'center', maxWidth: CARD.width }));
    card.addChild(number.display);
    number.display.y = 22;
    await kit.label(card, level.title, { x: 0, y: 92, size: 26, weight: 700, color: locked ? 0x7a7060 : 0xf6e2b0, align: 'center', width: CARD.width });
    await kit.label(card, level.en, { x: 0, y: 130, size: 13, color: 0xa89c84, family: SANS, align: 'center', width: CARD.width });
    await kit.label(card, CHAPTERS[chapter].name, { x: 0, y: 156, size: 13, color: 0x8ab4a4, family: SANS, align: 'center', width: CARD.width });
    const starMark = card.addChild(scope.use(new Sprite()));
    if (!locked) drawStars(starMark.graphics, record?.stars ?? 0, { x: CARD.width / 2 - 30, y: 204 });
    else {
      // A padlock where the stars would be, and the card in shadow.
      const chain = card.addChild(scope.use(new Sprite())),
        g = chain.graphics,
        cx = CARD.width / 2;
      g.beginFill(0x000000, 0.4).drawRoundRect(0, 0, CARD.width, CARD.height, 14, 14).endFill();
      g.lineStyle(4, 0x9a8a68, 1).drawArc(cx, 204, 10, Math.PI, 0).lineStyle(0);
      g.lineStyle(2, INK, 1).beginFill(0x9a8a68, 1).drawRoundRect(cx - 16, 202, 32, 26, 5, 5).endFill().lineStyle(0);
      g.beginFill(INK, 1).drawCircle(cx, 213, 3.5).drawRect(cx - 1.5, 214, 3, 8).endFill();
    }
    if (record?.score) await kit.label(card, `最高 ${record.score}`, { x: 0, y: 232, size: 13, color: 0xd8c08a, family: SANS, align: 'center', width: CARD.width });
    cards.push({ index, card, face, locked, chapter });
  }

  // Which card is chosen: the engine's selection group over the cards; locked cards cannot be chosen.
  let chosen = String(chosenAt);
  const group = kit.own(
    createSelectionGroup({
      input: game.pointer,
      items: cards.map((c) => ({ key: String(c.index), target: c.face, enabled: !c.locked })),
      selected: chosen,
      wrap: false,
      onChange: (key) => {
        chosen = key;
        app.sound.play('page');
        reveal(Number(key));
        paint();
      }
    })
  );
  const stripStop = keyboard?.registerTarget({ id: 'select-cards', target: strip });
  if (stripStop) kit.own(stripStop);
  if (keyboard) kit.own(createControlKeys({ keyboard, target: strip, kind: 'selection', control: group, orientation: 'horizontal' }));

  // The scroll position: the engine's scroll control, driven by the wheel and by dragging the bar below.
  const thumb = ui.addChild(scope.use(new Sprite())),
    track = ui.addChild(scope.use(new Sprite()));
  track.x = thumb.x = VIEW.x;
  track.y = thumb.y = VIEW.y + VIEW.height + 22;
  track.graphics.beginFill(0x000000, 0.4).drawRoundRect(0, -4, VIEW.width, 8, 4, 4).endFill();
  ui.setChildIndex(thumb, ui.numChildren - 1);
  thumb.touchEnabled = true;
  const scroll = kit.own(
    createScrollControl({
      axis: 'x',
      viewportLength: VIEW.width,
      contentLength,
      thumb: { input: game.pointer, target: thumb, trackLength: VIEW.width },
      ...(app.hover ? { wheel: { hover: app.hover, target: wheelTarget, lineLength: 120 } } : {}),
      onScroll: (offset) => {
        strip.x = -offset;
        paintThumb();
      }
    })
  );
  function paintThumb() {
    const { start, length } = scroll.thumb;
    thumb.graphics.clear();
    thumb.graphics.lineStyle(1.5, INK, 1).beginLinearGradientFill(0, 0, 0, 14, stops([0, 0xf6d88a], [1, 0xb07c34])).drawRoundRect(start, -7, length, 14, 7, 7).endFill().lineStyle(0);
    thumb.hitArea = { x: start - 6, y: -14, width: length + 12, height: 28 };
  }
  function reveal(index) {
    const x = cards[index].card.x;
    if (x - scroll.offset < 0) scroll.scrollTo(x - CARD.gap);
    else if (x + CARD.width - scroll.offset > VIEW.width) scroll.scrollTo(x + CARD.width - VIEW.width + CARD.gap);
  }

  function paint() {
    const focusVisible = keyboard?.getSnapshot().focusVisible && keyboard?.getSnapshot().focusedId === 'select-cards';
    for (const c of cards) {
      const g = c.face.graphics,
        selected = chosen === String(c.index);
      g.clear();
      g.lineStyle(3, INK, 1);
      g.beginLinearGradientFill(0, 0, 0, CARD.height, stops([0, selected ? 0x4a3a2a : 0x2c2620], [1, 0x14110e])).drawRoundRect(0, 0, CARD.width, CARD.height, 14, 14).endFill();
      g.lineStyle(selected ? 2.5 : 1.2, selected ? GOLD : 0x6a5a44, 1).drawRoundRect(8, 8, CARD.width - 16, CARD.height - 16, 10, 10).lineStyle(0);
      // The chosen card is outlined by the engine's outline effect, and lifts a little.
      c.card.renderEffect = selected ? { outline: { color: focusVisible ? 0xffe08a : 0xe6b65c, width: focusVisible ? 3 : 2 } } : undefined;
      c.card.y = selected ? 2 : 10;
    }
    start.setSub(`第 ${Number(chosen) + 1} 关 · ${levels[Number(chosen)].title}`);
  }

  const start = await kit.button({ x: 960 - 40 - 220, y: 470, width: 220, height: 56, text: '开始此关', sub: ' ', primary: true, onActivate: () => app.startLevel(Number(chosen)), container: ui });
  await kit.button({ x: 40, y: 474, width: 140, height: 48, text: '‹ 返回', name: '返回标题', onActivate: () => app.go('title'), container: ui });
  paintThumb();
  paint();
  reveal(Number(chosen));

  // To a reader the cards are a list box of options, one chosen.
  kit.own(semantics.add({ id: 'select-levels', role: 'listbox', describe: () => ({ name: '关卡', bounds: semanticBoundsOf(viewport) }) }));
  for (const c of cards)
    kit.own(
      semantics.add({
        id: 'select-level-' + c.index,
        role: 'option',
        parent: 'select-levels',
        onActivate: () => group.select(String(c.index)),
        onFocus: () => {
          if (!c.locked) group.select(String(c.index));
          keyboard?.focus('select-cards', { visible: true });
        },
        describe: () => {
          const r = save.data.levels[String(c.index + 1)];
          return {
            name: `第${c.index + 1}关 ${levels[c.index].title}${c.locked ? '，未解锁' : r ? `，${r.stars} 星` : ''}`,
            bounds: semanticBoundsOf(c.face),
            selected: chosen === String(c.index),
            disabled: c.locked,
            position: { index: c.index + 1, size: cards.length },
            focused: keyboard?.getSnapshot().focusedId === 'select-cards' && chosen === String(c.index)
          };
        }
      })
    );
  semantics.publish();
  let time = 0;
  return {
    kit,
    update(seconds) {
      time += seconds;
      back.scenery.update(time);
      // Enter or Space on the cards starts the chosen level.
      const focus = keyboard?.getSnapshot();
      if (focus?.focusedId === 'select-cards' && (app.actions.justPressed('confirm') || app.actions.justPressed('fire'))) app.startLevel(Number(chosen));
    },
    repaint: paint,
    escape: () => app.go('title'),
    focusFirst: () => keyboard?.focus('select-cards', { visible: true }),
    dispose() {
      kit.dispose();
      scope.dispose();
    }
  };
}

// ── A level ───────────────────────────────────────────────────────────────────────────────
export async function levelScreen(app, { index }) {
  const scope = app.game.engine.createScope(),
    { game, save, semantics, levels, textures, font, fontPages, actions } = app,
    entry = levels[index],
    chapter = chapterOf(index),
    kit = createScreenKit(game, scope, { semantics, sound: app.sound, prefix: 'level' });
  app.sound.music('city');
  let hud = null;
  const level = await createLevel(game, {
    file: entry.file,
    chapter,
    textures,
    scope,
    on: (event) => {
      const view = level?.camera.worldToScreen(event.x ?? 0, event.y ?? 0);
      app.sound.event(event, view ? view.x / 960 : 0.5);
      if (!hud) return;
      if (event.type === 'aim') hud.setPower(event.power);
      if (event.type === 'shot') hud.setUsed(level.sim.state.shotsFired);
      if (event.type === 'score') {
        hud.setScore(level.sim.state.score);
        hud.showCombo(event.combo, event.points);
      }
      if (event.type === 'win') finish(true);
      if (event.type === 'lose') finish(false);
    }
  });
  const map = level.map;
  hud = await createHud(game, scope, kit, {
    font,
    fontPages,
    title: `第${index + 1}关 · ${entry.title}`,
    subtitle: `${CHAPTERS[chapter].name} · ${entry.en} · ${map.properties.par} 发得三星`,
    pellets: level.sim.level.shots,
    power: level.aiming.power,
    onPower: (value) => level.setAim(level.aiming.angle, value),
    onFire: () => level.fire(),
    onOverview: () => level.toggleOverview(),
    onRestart: () => app.startLevel(index, { skipStory: true }),
    onMenu: () => app.go('select', { focus: index }),
    onSettings: () => app.openSettings()
  });
  hud.setUsed(0);

  // The city comes up out of the dark.
  const dark = game.stage.addChild(scope.use(new Sprite()));
  dark.graphics.beginFill(0x000000, 1).drawRect(0, 0, 960, 540).endFill();
  animate(game.engine, scope, dark)
    .to({ alpha: 0 }, 0.7, 'quadOut')
    .call(() => (dark.visible = false))
    .start();

  // The words before the level, then the camera goes to the bow.
  const lines = BEFORE[index];
  let talking = null;
  if (lines && !app.skipStory) talking = await dialogue(app, scope, kit, lines);
  setTimeout(() => level.lookAtBow(1.2), talking ? 0 : 900);

  let over = false;
  async function finish(won) {
    if (over) return;
    over = true;
    const stars = level.sim.stars();
    // Leave a moment to see the lock open, or the last pellet stop.
    await new Promise((resolve) => setTimeout(resolve, won ? 1300 : 600));
    if (scope.state !== 'open') return;
    if (won) {
      let change = {};
      save.update((data) => {
        change = recordClear(data, index, { stars, score: level.sim.state.score }, levels.length);
      });
      app.go('result', { index, won, stars, score: level.sim.state.score, shots: level.sim.state.shotsFired, change });
    } else app.go('result', { index, won, stars: 0, score: level.sim.state.score, shots: level.sim.state.shotsFired, change: {} });
  }

  semantics.publish();
  // A status line read when it changes: how many pellets are left and how many locks are open.
  kit.own(
    semantics.add({
      id: 'level-status',
      role: 'status',
      describe: () => {
        const sim = level.sim,
          open = sim.locks.filter((lock) => lock.open).length;
        return { name: `剩余弹丸 ${sim.level.shots.length - sim.state.shotsFired}，机关锁 ${open} / ${sim.locks.length} 已开`, bounds: { x: 12, y: 10, width: 300, height: 92 } };
      }
    })
  );
  return {
    kit,
    level,
    /** Whether words are being spoken over the level. */
    talking: () => Boolean(talking?.open),
    update(seconds) {
      if (talking?.open) talking.update(seconds);
      // Keys: A and D (or the arrows) turn the bow, W and S set the power, Space fires, Z the whole city.
      const busy = talking?.open || app.settingsOpen();
      if (!busy) {
        const focus = game.keyboard?.getSnapshot(),
          onSlider = focus?.focusVisible && focus.focusedId === hud.slider.id,
          onButton = focus?.focusVisible && focus.focusedId && !onSlider;
        // With the slider in focus its own keys move it; the arrows then do not turn the bow as well.
        const turn = onSlider ? 0 : actions.value('turn'),
          pull = onSlider ? 0 : actions.value('pull');
        if (turn || pull) level.setAim(level.aiming.angle + turn * 60 * seconds, level.aiming.power + pull * 45 * seconds);
        if (actions.justPressed('fire') && !onButton) level.fire();
        if (actions.justPressed('overview')) level.toggleOverview();
        if (actions.justPressed('restart') && !onButton) app.startLevel(index, { skipStory: true });
      }
      level.update(talking?.open ? 0 : seconds);
      // While words are spoken the controls step aside.
      hud.root.visible = !talking?.open;
      hud.setReady(level.sim.ready());
      hud.update(seconds);
    },
    escape: () => (talking?.open ? talking.skip() : app.go('select', { focus: index })),
    focusFirst: () => {},
    dispose() {
      kit.dispose();
      scope.dispose();
    }
  };
}

/** Lines spoken in turn at the foot of the screen; a press, Space or Enter goes on. Returns its handle. */
async function dialogue(app, scope, kit, lines, { onDone } = {}) {
  const { game, semantics } = app;
  const box = game.stage.addChild(scope.use(new DisplayObjectContainer())),
    veil = box.addChild(scope.use(new Sprite()));
  veil.graphics.beginLinearGradientFill(0, 300, 0, 540, stops([0, 0x000000, 0], [1, 0x000000, 0.75])).drawRect(0, 300, 960, 240).endFill();
  veil.touchEnabled = true;
  veil.hitArea = { x: 0, y: 0, width: 960, height: 540 };
  kit.panel({ x: 110, y: 384, width: 740, height: 132, container: box });
  // The portrait is cut to a round frame by a shape mask: a circle drawn once, so its image is made once.
  const frame = box.addChild(scope.use(new DisplayObjectContainer())),
    portrait = frame.addChild(scope.use(new Sprite())),
    round = frame.addChild(scope.use(new Sprite())),
    rim = box.addChild(scope.use(new Sprite()));
  frame.x = rim.x = 170;
  frame.y = rim.y = 452;
  round.graphics.beginFill(0xffffff, 1).drawCircle(0, 0, 44).endFill();
  portrait.mask = round;
  rim.graphics.lineStyle(2.5, GOLD, 0.9).drawCircle(0, 0, 45).lineStyle(0);
  const name = await kit.label(box, ' ', { x: 236, y: 398, size: 20, weight: 700, color: 0xf2c870 });
  const first = await kit.label(box, ' ', { x: 236, y: 432, size: 21, color: 0xf0e4c8 });
  const second = await kit.label(box, ' ', { x: 236, y: 466, size: 21, color: 0xf0e4c8 });
  const hint = await kit.label(box, '点击或按空格继续 ›', { x: 836, y: 492, size: 12, color: 0x9a8e78, family: SANS, align: 'right' });
  let at = -1,
    open = true,
    shown = 0,
    full = '';
  const say = async () => {
    at++;
    if (at >= lines.length) return close();
    const [who, words] = lines[at],
      speaker = SPEAKERS[who];
    drawPortrait(portrait.graphics, speaker);
    full = words;
    shown = 0;
    await name.set(speaker.name);
    await first.set(' ');
    await second.set(' ');
    app.sound.play('page');
  };
  const close = () => {
    if (!open) return;
    open = false;
    animate(game.engine, scope, box).to({ alpha: 0 }, 0.25).call(() => (box.visible = false)).start();
    onDone?.();
  };
  const next = () => {
    if (!open) return;
    // A press while the words still come shows them all; the next one goes on.
    if (shown < full.length) shown = full.length;
    else void say();
  };
  const stopTap = veil.on(game.pointer.events.tap, next);
  kit.own({ dispose: stopTap });
  const node = semantics.add({ id: 'dialogue', role: 'dialog', describe: () => ({ name: '对白', modal: false, hidden: !open, bounds: { x: 110, y: 384, width: 740, height: 132 } }) });
  const line = semantics.add({ id: 'dialogue-line', role: 'status', parent: 'dialogue', describe: () => ({ name: open && at >= 0 && at < lines.length ? `${SPEAKERS[lines[at][0]].name}：${lines[at][1]}` : '', hidden: !open, bounds: { x: 236, y: 432, width: 600, height: 64 } }) });
  const go = semantics.add({ id: 'dialogue-next', role: 'button', parent: 'dialogue', onActivate: next, describe: () => ({ name: '继续', hidden: !open, bounds: { x: 700, y: 486, width: 140, height: 24 } }) });
  kit.own(go);
  kit.own(line);
  kit.own(node);
  await say();
  let lastShown = -1,
    time = 0;
  return {
    get open() {
      return open;
    },
    skip: close,
    next,
    update(seconds) {
      time += seconds;
      hint.display.alpha = 0.6 + Math.sin(time * 4) * 0.4;
      if (app.actions.justPressed('fire') || app.actions.justPressed('confirm')) next();
      // The words come a few at a time, as if spoken; two lines of up to twenty-six characters each.
      shown = Math.min(full.length, shown + seconds * 32);
      const count = Math.floor(shown);
      if (count !== lastShown) {
        lastShown = count;
        const words = full.slice(0, count);
        void first.set(words.slice(0, 26) || ' ');
        void second.set(words.slice(26) || ' ');
      }
    }
  };
}

/** A small portrait: a face in ink under a topknot, a collar in the speaker's colours. */
function drawPortrait(g, speaker) {
  g.clear();
  // A square of lamplight behind the figure; the round mask trims it, and the robe, to the frame.
  g.beginRadialGradientFill(-10, -18, 60, stops([0, 0x6a5238], [1, 0x1e1a16])).drawRect(-48, -48, 96, 96).endFill();
  g.beginFill(speaker.robe, 1).moveTo(-52, 52).curveTo(0, 2, 52, 52).lineTo(-52, 52).endFill();
  g.beginFill(speaker.trim, 1).moveTo(-10, 18).lineTo(0, 36).lineTo(10, 18).lineTo(-10, 18).endFill();
  if (speaker === SPEAKERS.tube) {
    g.beginFill(speaker.robe, 1).drawRect(-6, -10, 12, 34).endFill();
    g.beginFill(speaker.trim, 1).moveTo(-4, -10).lineTo(-26, -32).lineTo(18, -32).lineTo(4, -10).endFill();
    g.lineStyle(0);
    return;
  }
  g.beginFill(0xe8d2b0, 1).drawEllipse(-15, -26, 30, 36).endFill();
  g.beginFill(speaker.hair, 1).drawCircle(0, -34, 9).drawEllipse(-16, -30, 32, 12).endFill();
  if (speaker === SPEAKERS.master) g.beginFill(speaker.hair, 1).moveTo(-8, 0).lineTo(0, 20).lineTo(8, 0).lineTo(-8, 0).endFill();
  g.beginFill(INK, 1).drawCircle(-6, -10, 2).drawCircle(6, -10, 2).endFill();
  g.lineStyle(0);
}

// ── The result of a level ──────────────────────────────────────────────────────────────────
export async function resultScreen(app, { index, won, stars, score, shots, change }) {
  const scope = app.game.engine.createScope(),
    { game, semantics, levels, font, fontPages } = app,
    kit = createScreenKit(game, scope, { semantics, sound: app.sound, prefix: 'result' });
  const back = backdrop(app, scope, chapterOf(index));
  const ui = game.stage.addChild(scope.use(new DisplayObjectContainer()));
  kit.panel({ x: 230, y: 70, width: 500, height: 400, container: ui });
  await kit.label(ui, won ? '机关锁开' : '弹丸用尽', { x: 230, y: 96, size: 38, weight: 800, color: won ? 0xf2c870 : 0xd8a090, align: 'center', width: 500 });
  await kit.label(ui, `第${index + 1}关 · ${levels[index].title}`, { x: 230, y: 152, size: 18, color: 0xd8ccb0, align: 'center', width: 500 });
  const starHolder = ui.addChild(scope.use(new Sprite()));
  starHolder.x = 480 - 60;
  starHolder.y = 214;
  if (won) {
    // The stars come one by one, each with a pop and a glint.
    for (let i = 0; i < 3; i++) {
      const star = starHolder.addChild(scope.use(new Sprite()));
      star.x = i * 60;
      drawStars(star.graphics, i < stars ? 1 : 0, { size: 22, of: 1 });
      star.scaleX = star.scaleY = 0;
      animate(game.engine, scope, star)
        .wait(0.3 + i * 0.28)
        .call(() => i < stars && app.sound.play('tap', { rate: 1 + i * 0.25 }))
        .to({ scaleX: 1.3, scaleY: 1.3 }, 0.18, 'backOut')
        .to({ scaleX: 1, scaleY: 1 }, 0.14)
        .start();
      if (i < stars) star.renderEffect = { glow: { color: 0xffc860, blur: 6, strength: 2 } };
    }
  }
  const scoreText = scope.use(createBitmapText({ font, pages: fontPages, text: `${score}分`, align: 'center', maxWidth: 500 }));
  ui.addChild(scoreText.display);
  scoreText.display.x = 230;
  scoreText.display.y = 258;
  const notes = [`用了 ${shots} 发，${levels[index].par} 发内开锁得三星`];
  if (change.newBest) notes.push('新的最高分');
  if (change.opened) notes.push('下一关已解锁');
  await kit.label(ui, won ? notes.join('　') : '再试一次：换个角度，或者先看看全景', { x: 230, y: 324, size: 15, color: 0xc8bba0, family: SANS, align: 'center', width: 500 });
  const last = index + 1 >= levels.length;
  const buttons = [];
  if (won && !last) buttons.push(await kit.button({ x: 500, y: 380, width: 200, height: 56, text: '下一关 ›', primary: true, onActivate: () => app.startLevel(index + 1), container: ui }));
  if (won && last) buttons.push(await kit.button({ x: 500, y: 380, width: 200, height: 56, text: '机枢之心 ›', sub: '城开了', primary: true, onActivate: () => app.go('ending'), container: ui }));
  buttons.push(await kit.button({ x: won ? 260 : 380, y: 380, width: won ? 110 : 200, height: 56, text: '重来', primary: !won, onActivate: () => app.startLevel(index, { skipStory: true }), container: ui }));
  buttons.push(await kit.button({ x: won ? 380 : 380, y: won ? 380 : 444 - 4, width: won ? 110 : 200, height: won ? 56 : 40, text: '选关', small: !won, onActivate: () => app.go('select', { focus: index }), container: ui }));
  ui.alpha = 0;
  ui.y = 20;
  animate(game.engine, scope, ui).to({ alpha: 1, y: 0 }, 0.35, 'cubicOut').start();
  semantics.publish();
  let time = 0;
  return {
    kit,
    update(seconds) {
      time += seconds;
      back.scenery.update(time);
    },
    escape: () => app.go('select', { focus: index }),
    focusFirst: () => buttons[0]?.focus(),
    dispose() {
      kit.dispose();
      scope.dispose();
    }
  };
}

// ── The end ───────────────────────────────────────────────────────────────────────────────
export async function endingScreen(app) {
  const scope = app.game.engine.createScope(),
    { game, semantics, save } = app,
    kit = createScreenKit(game, scope, { semantics, sound: app.sound, prefix: 'ending' });
  const back = backdrop(app, scope, 2);
  app.sound.play('victory');
  app.sound.music('title');
  const ui = game.stage.addChild(scope.use(new DisplayObjectContainer()));
  let credits = null;
  const talk = await dialogue(app, scope, kit, ENDING, {
    onDone: async () => {
      credits = ui.addChild(scope.use(new DisplayObjectContainer()));
      kit.panel({ x: 230, y: 90, width: 500, height: 320, container: credits });
      await kit.label(credits, '城开了', { x: 230, y: 120, size: 44, weight: 800, color: 0xf2c870, align: 'center', width: 500 });
      await kit.label(credits, `十二关 · 共得 ${totalStars(save.data)} / 36 星`, { x: 230, y: 190, size: 20, color: 0xd8ccb0, align: 'center', width: 500 });
      await kit.label(credits, '千机巧匠 · Mechanism City', { x: 230, y: 240, size: 16, color: 0xc8bba0, family: SANS, align: 'center', width: 500 });
      await kit.label(credits, '基于新白鹭引擎独立开发的游戏 Demo', { x: 230, y: 266, size: 14, color: 0x9a8e78, family: SANS, align: 'center', width: 500 });
      const done = await kit.button({ x: 380, y: 324, width: 200, height: 52, text: '回到选关', primary: true, onActivate: () => app.go('select'), container: credits });
      credits.alpha = 0;
      animate(game.engine, scope, credits).to({ alpha: 1 }, 0.6).start();
      done.focus();
      semantics.publish();
    }
  });
  semantics.publish();
  let time = 0;
  return {
    kit,
    update(seconds) {
      time += seconds;
      back.scenery.update(time);
      if (talk.open) talk.update(seconds);
    },
    escape: () => app.go('select'),
    focusFirst: () => {},
    dispose() {
      kit.dispose();
      scope.dispose();
    }
  };
}
