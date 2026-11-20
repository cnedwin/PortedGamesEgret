// 各个画面：标题、开场短片、选关、关卡、结算、结局。每个画面是一个作用域，离开时一起回收。
// The screens: the title, the opening film, choosing a level, a level, its result and the end. Each screen
// has a scope of its own and is let go whole when the game moves on.
import { Bitmap, DisplayObjectContainer, Sprite, animate } from '@egret/engine';
import { createBitmapText } from '@egret/engine/bitmapfont';
import { createScrollControl, createSelectionGroup, createControlKeys } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { createBrowserVideo } from '@egret/engine/web/video';
import { placeIllustration } from './art/illustrations.mjs';
import { GOLD, INK } from './art/shapes.mjs';
import { CHALLENGES, createChallenge } from './challenges.mjs';
import { CLUES, firstShot } from './clues.mjs';
import { createLevel } from './play/level.mjs';
import { recordClear, totalSeals, totalStars } from './saves.mjs';
import { BEFORE, CHAPTERS, ENDING, INTRO_LINES, SPEAKERS, chapterOf } from './story.mjs';
import { createHud } from './ui/hud.mjs';
import { FONT, SANS, createScreenKit } from './ui/kit.mjs';

const stops = (...pairs) => pairs.map(([offset, color, alpha = 1]) => ({ offset, color, alpha }));

/** Static painted scenery keeps the menus legible and does not run a level in the background. */
function backdrop(app, scope, texture) {
  const root = app.game.stage.addChild(scope.use(new DisplayObjectContainer()));
  placeIllustration(root, scope, texture, { focus: 0.54 });
  const shade = root.addChild(scope.use(new Sprite()));
  shade.graphics.beginLinearGradientFill(0, 0, 0, 540, stops([0, 0x09181b, 0.66], [0.52, 0x0a1618, 0.22], [1, 0x081518, 0.9]))
    .drawRect(0, 0, 960, 540).endFill();
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
    g.lineStyle(1.5, lit ? 0xf1cb83 : 0x6e7770, 1).beginLinearGradientFill(cx, y - size, cx, y + size,
      lit ? stops([0, 0xffe9a3], [0.5, GOLD], [1, 0x88451e]) : stops([0, 0x405251], [1, 0x142426])).moveTo(...points[0]);
    for (const point of points.slice(1)) g.lineTo(...point);
    g.lineTo(...points[0]).endFill().lineStyle(0);
  }
}

// ── The title ──────────────────────────────────────────────────────────────────────────────
export async function titleScreen(app) {
  const scope = app.game.engine.createScope(),
    { game, save, semantics } = app,
    kit = createScreenKit(game, scope, { semantics, sound: app.sound, prefix: 'title' });
  const cover = await app.art.cover();
  const ui = game.stage.addChild(scope.use(new DisplayObjectContainer()));
  placeIllustration(ui, scope, cover);
  const shade = ui.addChild(scope.use(new Sprite()));
  shade.graphics.beginLinearGradientFill(0, 0, 650, 0, stops([0, 0x08191d, 0.94], [0.35, 0x091c21, 0.72], [0.7, 0x092023, 0.22], [1, 0x07191b, 0]))
    .drawRect(0, 0, 960, 540).endFill();
  shade.graphics.beginLinearGradientFill(0, 454, 0, 540, stops([0, 0x09191b, 0], [1, 0x09191b, 0.75])).drawRect(0, 454, 960, 86).endFill();
  const titleBox = ui.addChild(scope.use(new DisplayObjectContainer()));
  const seal = titleBox.addChild(scope.use(new Sprite()));
  seal.graphics.beginFill(0x8f3428, 1).drawRoundRect(56, 1, 28, 28, 4, 4).endFill();
  seal.graphics.lineStyle(1, 0xe5a668, 1).drawRoundRect(59, 4, 22, 22, 2, 2).lineStyle(0);
  await kit.label(titleBox, '墨', { x: 56, y: 5, size: 17, weight: 700, align: 'center', width: 28, color: 0xffe4b7 });
  await kit.label(titleBox, '墨家机关城', { x: 95, y: 6, size: 17, weight: 600, color: 0xcda875 });
  await kit.label(titleBox, '千机巧匠', { x: 53, y: 45, size: 79, weight: 800, color: 0xffe3a5 });
  await kit.label(titleBox, 'MECHANISM CITY', { x: 59, y: 145, size: 16, weight: 600, color: 0xbfc9b9, family: SANS });
  titleBox.y = 83;
  titleBox.alpha = 0;
  animate(game.engine, scope, titleBox).to({ alpha: 1, y: 68 }, 0.55, 'cubicOut').start();
  const rule = ui.addChild(scope.use(new Sprite()));
  rule.graphics.beginLinearGradientFill(58, 0, 403, 0, stops([0, 0xd09961, 0.86], [1, 0xd09961, 0])).drawRect(58, 237, 345, 2).endFill();

  const stars = totalStars(save.data),
    started = Object.keys(save.data.levels).length > 0;
  const buttons = [
    await kit.button({ x: 56, y: 261, width: 280, height: 67, text: started ? '继续' : '开始', sub: started ? `已得 ${stars} / 36 星` : '进城开锁', primary: true, onActivate: () => (started ? app.go('select') : save.data.seenIntro ? app.startLevel(0) : app.go('film', { then: 'first' })), container: ui }),
    await kit.button({ x: 56, y: 344, width: 133, height: 51, text: '选关', onActivate: () => app.go('select'), container: ui }),
    await kit.button({ x: 202, y: 344, width: 134, height: 51, text: '开场短片', onActivate: () => app.go('film', { then: 'title' }), container: ui }),
    await kit.button({ x: 56, y: 408, width: 133, height: 51, text: '设置', onActivate: () => app.openSettings(), container: ui })
  ];
  await kit.label(ui, '新白鹭引擎 · Egret Rebuild', { x: 57, y: 503, size: 14, color: 0xb3bab0, family: SANS });
  semantics.publish();
  return {
    kit,
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
  // The film is in two forms, VP9 and H.264; the browser plays the first it can.
  const media = (file) => new URL('../media/' + file, import.meta.url).href;
  const film = scope.use(
    createBrowserVideo({
      assets: game.engine.assets,
      src: [
        { src: media('intro.webm'), type: 'video/webm; codecs="vp9"' },
        { src: media('intro.mp4'), type: 'video/mp4; codecs="avc1.42C01F"' }
      ],
      maxWidth: 960,
      muted: true
    })
  );
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
  const chapterArt = await Promise.all(CHAPTERS.map((_, index) => app.art.chapter(index)));
  backdrop(app, scope, chapterArt[chapterOf(chosenAt)]);
  const ui = game.stage.addChild(scope.use(new DisplayObjectContainer()));
  await kit.label(ui, '选 关', { x: 40, y: 26, size: 34, weight: 800, color: 0xf2c870 });
  await kit.label(ui, `${totalStars(save.data)} / 36 星　·　巧解印 ${totalSeals(save.data)} / ${levels.length}`, { x: 40, y: 72, size: 16, color: 0xd8cba8, family: SANS });

  // The strip of cards scrolls across; the viewport clips it to its rectangle (the node's `mask`).
  const VIEW = { x: 40, y: 112, width: 880, height: 300 },
    CARD = { width: 196, height: 268, gap: 24 };
  const viewport = ui.addChild(scope.use(new DisplayObjectContainer()));
  viewport.x = VIEW.x;
  viewport.y = VIEW.y;
  viewport.mask = { x: -8, y: -10, width: VIEW.width + 16, height: VIEW.height + 20 };
  // Something under the cards to be over, so the wheel scrolls between them too.
  const backing = viewport.addChild(scope.use(new Sprite()));
  backing.touchEnabled = true;
  backing.hitArea = { x: 0, y: 0, width: VIEW.width, height: VIEW.height };
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
    const painting = placeIllustration(card, scope, chapterArt[chapter], { x: 10, y: 56, width: CARD.width - 20, height: 79 });
    painting.alpha = locked ? 0.34 : 0.85;
    if (record?.seal) {
      const stamp = card.addChild(scope.use(new Sprite()));
      stamp.graphics.lineStyle(1, 0xf0ba72, 1).beginFill(0x91402e, 1)
        .drawRoundRect(CARD.width - 45, 65, 27, 27, 4, 4).endFill().lineStyle(0);
      await kit.label(card, '巧', { x: CARD.width - 45, y: 68, size: 17, color: 0xffe5ae, weight: 700, align: 'center', width: 27 });
    }
    const number = scope.use(createBitmapText({ font, pages: fontPages, text: `第${index + 1}关`, align: 'center', maxWidth: CARD.width }));
    card.addChild(number.display);
    number.display.y = 19;
    await kit.label(card, level.title, { x: 0, y: 147, size: 23, weight: 700, color: locked ? 0xc7bba1 : 0xffe9b8, align: 'center', width: CARD.width });
    await kit.label(card, level.en, { x: 0, y: 179, size: 12, color: 0xb7b9a9, family: SANS, align: 'center', width: CARD.width });
    await kit.label(card, CHAPTERS[chapter].name, { x: 0, y: 199, size: 12, color: 0x9bc4b5, family: SANS, align: 'center', width: CARD.width });
    const starMark = card.addChild(scope.use(new Sprite()));
    if (!locked) drawStars(starMark.graphics, record?.stars ?? 0, { x: CARD.width / 2 - 26, y: 229, size: 9, gap: 26 });
    else {
      // A padlock where the stars would be, and the card in shadow.
      const chain = card.addChild(scope.use(new Sprite())),
        g = chain.graphics,
        cx = CARD.width / 2;
      g.lineStyle(2, 0xb3986a, 1).drawArc(cx, 227, 6, Math.PI, 0).lineStyle(0);
      g.lineStyle(1.5, 0xd2b684, 1).beginFill(0x806948, 1).drawRoundRect(cx - 10, 226, 20, 16, 3, 3).endFill().lineStyle(0);
      g.beginFill(INK, 1).drawCircle(cx, 232, 2.2).drawRect(cx - 0.9, 233, 1.8, 5).endFill();
    }
    if (record?.score) await kit.label(card, `最高 ${record.score}`, { x: 0, y: 245, size: 12, color: 0xd8c08a, family: SANS, align: 'center', width: CARD.width });
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
      // A wheel over the viewport or any card in it: sideways wheels and trackpads scroll the strip.
      ...(app.hover ? { wheel: { hover: app.hover, target: viewport, lineLength: 120 } } : {}),
      onScroll: (offset) => {
        strip.x = -offset;
        paintThumb();
      }
    })
  );
  // An ordinary mouse wheel turns only up and down, which a sideways scroll control does not read; that turn
  // scrolls the strip by the control's own `scrollBy` (ENGINE-NOTES.md, item 20).
  if (app.hover)
    kit.own({
      dispose: viewport.on(app.hover.events.wheel, (event) => {
        const { deltaX, deltaY, unit, zoom } = event.payload;
        if (zoom || event.defaultPrevented || deltaX !== 0 || deltaY === 0) return;
        const step = unit === 'pixel' ? deltaY : unit === 'line' ? deltaY * 120 : deltaY * VIEW.width;
        if (scroll.scrollBy(step)) event.preventDefault();
      })
    });
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

  let shownObjective = '';
  function paint() {
    const focusVisible = keyboard?.getSnapshot().focusVisible && keyboard?.getSnapshot().focusedId === 'select-cards';
    for (const c of cards) {
      const g = c.face.graphics,
        selected = chosen === String(c.index);
      g.clear();
      g.lineStyle(3, INK, 1);
      const tint = [0x593a2a, 0x265052, 0x464a58][c.chapter];
      g.beginLinearGradientFill(0, 0, 0, CARD.height, stops([0, tint], [0.53, 0x172a2b], [1, 0x0e1c20])).drawRoundRect(0, 0, CARD.width, CARD.height, 12, 12).endFill();
      g.lineStyle(selected ? 2 : 1.2, selected ? GOLD : 0x827759, 1).drawRoundRect(5, 5, CARD.width - 10, CARD.height - 10, 8, 8).lineStyle(0);
      g.beginFill(selected ? 0xddab63 : 0x6c5942, 0.78).drawRect(66, 137, 64, 1).endFill();
      // The chosen card is outlined by the engine's outline effect, and lifts a little.
      c.card.renderEffect = selected ? { outline: { color: focusVisible ? 0xffe08a : 0xe6b65c, width: focusVisible ? 3 : 2 } } : undefined;
      c.card.y = selected ? 2 : 10;
    }
    start.setSub(`第 ${Number(chosen) + 1} 关 · ${levels[Number(chosen)].title}`);
    const goal = CHALLENGES[levels[Number(chosen)].id].label;
    if (shownObjective !== goal) {
      shownObjective = goal;
      void objective.set(`巧解 · ${goal}`);
    }
  }

  const objective = await kit.label(ui, ' ', { x: 206, y: 490, size: 17, color: 0xdcb87d, weight: 600 });
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
            name: `第${c.index + 1}关 ${levels[c.index].title}${c.locked ? '，未解锁' : r ? `，${r.stars} 星${r.seal ? '，已得巧解印' : ''}` : ''}`,
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
  return {
    kit,
    update() {
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
  const challenge = CHALLENGES[entry.id];
  const runChallenge = createChallenge(entry.id);
  let hud = null, talking = null, hint = null, over = false;
  const [panorama, mechanisms] = await Promise.all([app.art.chapter(chapter), app.art.mechanisms()]);
  const level = await createLevel(game, {
    file: entry.file,
    chapter,
    textures: { ...textures, panorama, mechanisms },
    scope,
    on: (event) => {
      runChallenge.observe(event);
      const view = level?.camera.worldToScreen(event.x ?? 0, event.y ?? 0);
      app.sound.event(event, view ? view.x / 960 : 0.5);
      if (!hud) return;
      if (event.type === 'aim') hud.setPower(event.power);
      if (event.type === 'shot') {
        hud.setUsed(level.sim.state.shotsFired);
        if (hint) presentHint(null);
      }
      if (event.type === 'score') {
        hud.setScore(level.sim.state.score);
        hud.showCombo(event.combo, event.points);
      }
      if (event.type === 'win') finish(true);
      if (event.type === 'lose') finish(false);
    }
  });
  function presentHint(next) {
    hint = next;
    hud.setHint(next);
  }

  async function toggleHint() {
    if (over || talking?.open || app.settingsOpen() || !level.sim.ready() || level.aiming.pulling) return;
    if (!hint) {
      presentHint({ text: CLUES[entry.id], button: level.sim.state.shotsFired === 0 ? '对准' : '收起' });
      return;
    }
    if (hint.button !== '对准') {
      presentHint(null);
      return;
    }
    const requested = hint;
    const reference = await firstShot(entry.id);
    if (scope.state !== 'open' || hint !== requested || level.sim.state.shotsFired || level.aiming.pulling || app.settingsOpen()) return;
    if (reference) level.setAim(...reference);
    presentHint({
      text: reference ? '已对准首发参考轨迹。可以微调，也可以直接发射。' : CLUES[entry.id],
      button: '收起',
    });
  }

  const map = level.map;
  hud = await createHud(game, scope, kit, {
    font,
    fontPages,
    title: `第${index + 1}关 · ${entry.title}`,
    subtitle: `${CHAPTERS[chapter].name} · ${entry.en} · ${map.properties.par} 发得三星`,
    challenge: challenge.description,
    pellets: level.sim.level.shots,
    power: level.aiming.power,
    onPower: (value) => level.setAim(level.aiming.angle, value),
    onFire: () => level.fire(),
    onOverview: () => level.toggleOverview(),
    onRestart: () => app.startLevel(index, { skipStory: true }),
    onMenu: () => app.go('select', { focus: index }),
    onSettings: () => app.openSettings(),
    onHint: () => { void toggleHint(); },
    onCloseHint: () => presentHint(null),
  });
  hud.setUsed(0);

  // The city comes up out of the dark. (A circle mask growing from the crossbow was measured and is too
  // costly: see ENGINE-NOTES.md, item 3.)
  const dark = game.stage.addChild(scope.use(new Sprite()));
  dark.graphics.beginFill(0x000000, 1).drawRect(0, 0, 960, 540).endFill();
  animate(game.engine, scope, dark)
    .to({ alpha: 0 }, 0.7, 'quadOut')
    .call(() => (dark.visible = false))
    .start();

  // The words before the level, then the camera goes to the bow.
  const lines = BEFORE[index];
  if (lines && !app.skipStory) talking = await dialogue(app, scope, kit, lines);
  setTimeout(() => level.lookAtBow(1.2), talking ? 0 : 900);

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
        change = recordClear(data, index, { stars, score: level.sim.state.score, seal: runChallenge.earned }, levels.length);
      });
      app.go('result', { index, won, stars, score: level.sim.state.score, shots: level.sim.state.shotsFired, seal: runChallenge.earned, change });
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
  kit.own(semantics.add({
    id: 'level-hint-status',
    role: 'status',
    describe: () => ({ name: hint ? `${hint.text} 巧解目标，${challenge.description}` : '', hidden: !hint, bounds: { x: 14, y: 411, width: 544, height: 104 } }),
  }));
  return {
    kit,
    level,
    levelTitle: entry.title,
    get hint() { return hint; },
    challenge: challenge.description,
    touchActions: {
      dialogue: () => talking?.next(),
      overview: () => level.toggleOverview(),
      restart: () => app.startLevel(index, { skipStory: true }),
      menu: () => app.go('select', { focus: index }),
      settings: () => app.openSettings(),
      hint: () => { void toggleHint(); },
      closeHint: () => presentHint(null),
    },
    /** Whether words are being spoken over the level. */
    talking: () => Boolean(talking?.open),
    update(seconds) {
      if (talking?.open) talking.update(seconds);
      // Keys: A and D (or the arrows) turn the bow, W and S set the power, Space fires, Z the whole city.
      const busy = talking?.open || app.settingsOpen();
      if (!busy) {
        // Keys a focused button or the slider took do not come here (`skipPrevented`).
        const turn = actions.value('turn'),
          pull = actions.value('pull');
        if (turn || pull) level.setAim(level.aiming.angle + turn * 60 * seconds, level.aiming.power + pull * 45 * seconds);
        if (actions.justPressed('fire')) level.fire();
        if (actions.justPressed('overview')) level.toggleOverview();
        if (actions.justPressed('hint')) void toggleHint();
        if (actions.justPressed('restart')) app.startLevel(index, { skipStory: true });
      }
      level.update(talking?.open ? 0 : seconds);
      // While words are spoken the controls step aside.
      hud.root.visible = !talking?.open;
      hud.setReady(level.sim.ready());
      hud.update(seconds);
    },
    escape() {
      if (talking?.open) talking.skip();
      else if (hint) presentHint(null);
      else app.go('select', { focus: index });
    },
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
  const speakers = await app.art.speakers();
  const box = game.stage.addChild(scope.use(new DisplayObjectContainer())),
    veil = box.addChild(scope.use(new Sprite()));
  veil.graphics.beginLinearGradientFill(0, 300, 0, 540, stops([0, 0x000000, 0], [1, 0x000000, 0.75])).drawRect(0, 300, 960, 240).endFill();
  veil.touchEnabled = true;
  veil.hitArea = { x: 0, y: 0, width: 960, height: 540 };
  kit.panel({ x: 110, y: 384, width: 740, height: 132, container: box });
  // The portrait is cut to a round frame by a shape mask: a circle drawn once, so its image is made once.
  const frame = box.addChild(scope.use(new DisplayObjectContainer())),
    portrait = frame.addChild(scope.use(new Bitmap(speakers))),
    round = frame.addChild(scope.use(new Sprite())),
    rim = box.addChild(scope.use(new Sprite()));
  frame.x = rim.x = 170;
  frame.y = rim.y = 452;
  round.graphics.beginFill(0xffffff, 1).drawCircle(0, 0, 44).endFill();
  portrait.x = portrait.y = -44;
  portrait.scaleX = portrait.scaleY = 88 / 256;
  portrait.mask = round;
  rim.graphics.lineStyle(2.5, GOLD, 0.9).drawCircle(0, 0, 45).lineStyle(0);
  rim.graphics.lineStyle(1, 0x8b573d, 0.82).drawCircle(0, 0, 49).lineStyle(0);
  const name = await kit.label(box, ' ', { x: 236, y: 398, size: 20, weight: 700, color: 0xf2c870 });
  const first = await kit.label(box, ' ', { x: 236, y: 432, size: 21, color: 0xf0e4c8 });
  const second = await kit.label(box, ' ', { x: 236, y: 466, size: 21, color: 0xf0e4c8 });
  const hint = await kit.label(box, '点击或按空格继续 ›', { x: 836, y: 492, size: 12, color: 0x9a8e78, family: SANS, align: 'right' });
  let at = -1,
    open = true,
    shown = 0,
    lineBreak = 26,
    full = '';
  const say = async () => {
    at++;
    if (at >= lines.length) return close();
    const [who, words] = lines[at],
      speaker = SPEAKERS[who];
    portrait.sourceRect = { x: speaker.portrait * 256, y: 0, width: 256, height: 256 };
    full = words;
    lineBreak = 26;
    if (full.length === 27 && /[，。！？、；：）》」』]/u.test(full[26])) lineBreak = 27;
    while (lineBreak < full.length && /[，。！？、；：）》」』]/u.test(full[lineBreak])) lineBreak--;
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
      // Reveal the words without leaving a closing punctuation mark at the start of a line.
      shown = Math.min(full.length, shown + seconds * 32);
      const count = Math.floor(shown);
      if (count !== lastShown) {
        lastShown = count;
        const words = full.slice(0, count);
        void first.set(words.slice(0, lineBreak) || ' ');
        void second.set(words.slice(lineBreak) || ' ');
      }
    }
  };
}

// ── The result of a level ──────────────────────────────────────────────────────────────────
export async function resultScreen(app, { index, won, stars, score, shots, seal = false, change }) {
  const scope = app.game.engine.createScope(),
    { game, save, semantics, levels, font, fontPages } = app,
    kit = createScreenKit(game, scope, { semantics, sound: app.sound, prefix: 'result' });
  backdrop(app, scope, await app.art.chapter(chapterOf(index)));
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
  await kit.label(ui, won ? notes.join('　') : '可以看全景找机关，或用提示试试首发角度', { x: 230, y: 316, size: 15, color: 0xc8bba0, family: SANS, align: 'center', width: 500 });
  const challenge = CHALLENGES[levels[index].id];
  const collected = save.data.levels[String(index + 1)]?.seal;
  const stampText = seal ? `巧解印 · ${challenge.label}` : collected ? `已收藏巧解印 · ${challenge.label}` : `巧解目标 · ${challenge.label}`;
  await kit.label(ui, stampText, { x: 230, y: 344, size: 16, color: collected ? 0xffca79 : 0xaac7b8, weight: seal ? 700 : 400, align: 'center', width: 500 });
  kit.own(semantics.add({ id: 'result-challenge', role: 'status', describe: () => ({ name: stampText, bounds: { x: 230, y: 344, width: 500, height: 24 } }) }));
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
  return {
    kit,
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
  backdrop(app, scope, await app.art.chapter(2));
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
  return {
    kit,
    update(seconds) {
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
