// 画面：标题、选夜、守城、结算和设置。每个画面在自己的作用域里建，离开时一起放掉；字一律从 t() 取，
// 按舞台的宽高排，竖屏和横屏都排得下。守城画面里规则按固定步长推进（每步 1/60 秒），画面只读规则的状态。
// The screens: title, choosing a night, the watch, the night's end and the settings. Each is made in its own scope
// and let go as a whole when it is left; every word comes from t(), and the layout follows the stage, so it fits both
// a tall and a wide stage. On the watch the rules move in fixed steps of 1/60 s; the view only reads their state.
import { DisplayObjectContainer, Sprite, animate } from '@egret/engine';
import { planLinearLayout } from '@egret/engine/layout';
import { createActionControl } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { RES, loadWardenAtlas, roadUrl } from './art/atlas.mjs';
import { WARD_WORDS, clock, getLanguage, starMarks, t } from './i18n.mjs';
import { NIGHT_COUNT, recordNight } from './saves.mjs';
import { NIGHTS, WARDS } from './sim/data.mjs';
import { FIELD, choose, createWorld, starsFor, step, wardLevel } from './sim/world.mjs';
import { AMBER, INK, PAPER, RED, SANS, TEAL, createScreenKit } from './ui/kit.mjs';
import { createField } from './view/field.mjs';

/** One step of the rules. */
const STEP = 1 / 60;

/** A screen's common parts: its scope, its kit and its root container. */
function begin(app, prefix) {
  const scope = app.game.engine.createScope(),
    kit = createScreenKit(app.game, scope, { semantics: app.semantics, sound: app.sound, prefix, locale: getLanguage() }),
    root = app.game.stage.addChild(scope.use(new DisplayObjectContainer()));
  return { scope, kit, root, dispose: () => (kit.dispose(), scope.dispose()) };
}

/** A sheet picture placed at its centre, scaled from atlas pixels to stage units by `size`. */
function picture(app, scope, parent, name, x, y, size = 1) {
  const b = parent.addChild(scope.use(app.art.common.sheet.createBitmap(name))),
    region = app.art.common.sheet.getRegion(name);
  b.anchorOffsetX = region.width / 2;
  b.anchorOffsetY = region.height * (name === 'crossbow' ? 0.72 : 0.5);
  b.scaleX = b.scaleY = size / RES;
  b.x = x;
  b.y = y;
  return b;
}

/**
 * A night road behind the menus, dimmed: the CSS background of the page's #road under the canvas, painted once and never by the
 * engine (two full-screen layers drawn each frame cost a third of the frame rate under software rendering; QUALITY.md).
 */
function backdrop(app, ground = 'temple', dim = 0.55) {
  const shade = (a) => `rgba(5,6,12,${a})`;
  app.shakeBy(0, 0);
  app.setRoad(`linear-gradient(${shade(dim + 0.2)}, ${shade(dim)} 60%, ${shade(dim - 0.15)}), url(${roadUrl(ground, 0.75)}) center bottom / cover no-repeat, #05060c`);
}

/**
 * The road under the watch, as #road's CSS background placed exactly under the field: `field` is its rectangle
 * on the stage. On a wide stage the panels at the sides are part of the same background.
 */
function roadBackdrop(app, ground, field) {
  const { width, height } = app.stage,
    pct = (v) => `${(v * 100).toFixed(3)}%`,
    left = field.x / width,
    right = (field.x + field.width) / width;
  const panels = field.width < width - 1 ? `linear-gradient(to right, #07080f ${pct(left)}, transparent ${pct(left)} ${pct(right)}, #07080f ${pct(right)}), ` : '';
  // A background position in percent places the picture's same point on the box's: x / (box - picture).
  const atX = width - field.width > 1 ? field.x / (width - field.width) : 0,
    atY = height - field.height > 1 ? field.y / (height - field.height) : 0;
  app.setRoad(`${panels}url(${roadUrl(ground)}) ${pct(atX)} ${pct(atY)} / ${pct(field.width / width)} ${pct(field.height / height)} no-repeat, #05060c`);
}
/** The title: the name, the ways in, and a few haunts drifting up the road. */
export async function titleScreen(app) {
  const s = begin(app, 'title'),
    { width, height } = app.stage,
    { kit, root, scope } = s;
  const tall = height > width;
  backdrop(app, 'temple', 0.5);
  const left = tall ? 40 : Math.round(width * 0.08);
  // A big talisman seal behind the name.
  const seal = root.addChild(scope.use(new Sprite()));
  seal.graphics.beginFill(RED, 0.9).drawRoundRect(0, 0, 66, 66, 8, 8).endFill().lineStyle(2, 0xffe0a0, 0.9).drawRoundRect(5, 5, 56, 56, 6, 6).lineStyle(0);
  seal.x = left;
  seal.y = tall ? 140 : 86;
  await kit.label(seal, t('sealGlyph'), { x: 0, y: 8, size: 42, weight: 800, color: 0xfff0d0, align: 'center', width: 66 });
  await kit.label(root, t('title'), { x: left + 84, y: tall ? 138 : 84, size: tall ? 60 : 64, weight: 800, color: 0xfff1d0 });
  await kit.label(root, t('subtitle'), { x: left + 4, y: tall ? 232 : 172, size: tall ? 19 : 20, color: AMBER, family: SANS });
  const buttonWidth = tall ? width - 80 : 300;
  let y = tall ? 560 : 250;
  const start = await kit.button({ x: left, y, width: buttonWidth, height: 64, text: t('start'), primary: true, onActivate: () => app.go('nights') });
  y += 80;
  await kit.button({ x: left, y, width: buttonWidth, height: 60, text: t('settings'), onActivate: () => app.go('settings') });
  y += 76;
  await kit.button({ x: left, y, width: buttonWidth, height: 60, text: t('language'), name: t('languageName'), onActivate: () => app.switchLanguage() });
  // The crossbow on its tower and a paper doll coming.
  const towerX = tall ? width / 2 : width * 0.72,
    towerY = tall ? 440 : height * 0.72;
  picture(app, scope, root, 'tower', towerX, towerY + 30, 1.6);
  const bow = picture(app, scope, root, 'crossbow', towerX, towerY, 1.6);
  if (!app.reducedMotion) animate(app.game.engine, scope, bow).to({ rotation: -18 }, 1.8, 'sineInOut').to({ rotation: 18 }, 3.6, 'sineInOut').to({ rotation: 0 }, 1.8, 'sineInOut').loop().start();
  if (app.notice) await kit.label(root, app.notice, { x: left + 4, y: height - 46, size: 15, color: 0xffd08a, family: SANS });
  return { ...s, kit, focusFirst: () => start.focus(false), confirm: () => app.go('nights') };
}

/** Choosing a night: three, each opened by holding the one before, with its stars and best time. */
export async function nightsScreen(app) {
  const opened = app.save.data.open;
  const s = begin(app, 'nights'),
    { width, height } = app.stage,
    { kit, root, scope } = s;
  const tall = height > width;
  backdrop(app, NIGHTS[Math.min(opened, NIGHT_COUNT) - 1].ground, 0.55);
  const left = tall ? 32 : Math.round(width * 0.12),
    buttonWidth = tall ? width - 64 : width - left * 2;
  await kit.label(root, t('chooseNight'), { x: left, y: tall ? 90 : 44, size: 36, weight: 800, color: 0xfff1d0 });
  let first = null;
  for (let night = 1; night <= NIGHT_COUNT; night++) {
    const open = night <= opened,
      kept = app.save.data.nights[night];
    const sub = !open ? t('locked') : kept ? t('heldStars', { stars: starMarks(kept.stars), time: clock(kept.best) }) : t('notHeld');
    const button = await kit.button({
      x: left,
      y: (tall ? 180 : 110) + (night - 1) * (tall ? 130 : 104),
      width: buttonWidth,
      height: tall ? 108 : 88,
      text: t(`night${night}`),
      sub,
      primary: open && !kept,
      onActivate: () => open && app.go('play', { night })
    });
    if (!open) button.setEnabled(false);
    first ??= open && !kept ? button : null;
    if (night === opened) first ??= button;
  }
  const back = await kit.button({ x: left, y: height - (tall ? 110 : 80), width: tall ? buttonWidth : 220, height: 60, text: t('back'), onActivate: () => app.go('title') });
  return { ...s, focusFirst: () => (first ?? back).focus(false), escape: () => app.go('title') };
}

/** A bar that is painted again only when its shown value changes. */
function meter(scope, parent, { x, y, width, height, colour, back = 0x0a0a12 }) {
  const sprite = parent.addChild(scope.use(new Sprite()));
  sprite.x = x;
  sprite.y = y;
  let shown = -1,
    shownColour = colour;
  return {
    sprite,
    set(fraction, tint = colour) {
      const steps = Math.round(Math.max(0, Math.min(1, fraction)) * width);
      if (steps === shown && tint === shownColour) return;
      shown = steps;
      shownColour = tint;
      sprite.graphics
        .clear()
        .lineStyle(1.5, INK, 1)
        .beginFill(back, 0.85)
        .drawRoundRect(-2, -2, width + 4, height + 4, height / 2 + 2, height / 2 + 2)
        .endFill()
        .lineStyle(0)
        .beginFill(tint, 1)
        .drawRoundRect(0, 0, Math.max(height, steps), height, height / 2, height / 2)
        .endFill()
        .beginFill(0xffffff, 0.22)
        .drawRect(height / 2, 1, Math.max(0, steps - height), height * 0.3)
        .endFill();
      if (steps === 0) sprite.graphics.clear().lineStyle(1.5, INK, 1).beginFill(back, 0.85).drawRoundRect(-2, -2, width + 4, height + 4, height / 2 + 2, height / 2 + 2).endFill();
    }
  };
}

/**
 * The thunder talisman's button: a round seal that fills as the talisman charges and glows when it is ready. Held by
 * the engine's action control, so it works with a second finger while the first steers.
 */
async function thunderButton(app, kit, scope, parent, { x, y, radius, onActivate }) {
  const node = parent.addChild(scope.use(new DisplayObjectContainer())),
    face = node.addChild(scope.use(new Sprite()));
  node.x = x;
  node.y = y;
  face.touchEnabled = true;
  face.hitArea = { x: -radius - 8, y: -radius - 8, width: radius * 2 + 16, height: radius * 2 + 16 };
  const glyph = await kit.label(node, t('thunderGlyph'), { x: -radius, y: -radius * 0.62, size: radius * 0.9, weight: 800, color: 0xfff0c8, align: 'center', width: radius * 2 });
  const caption = await kit.label(node, t('thunder'), { x: -radius, y: radius + 8, size: 15, color: PAPER, align: 'center', width: radius * 2, family: SANS });
  const id = 'play-thunder';
  const control = kit.own(createActionControl({ input: app.game.pointer, target: face, onActivate, onPressChange: () => paint(lastCharge, true) }));
  kit.own(app.semantics.add({ id, role: 'button', onActivate, describe: () => ({ name: t('thunderName'), bounds: semanticBoundsOf(face), disabled: lastCharge < 1 }) }));
  let lastCharge = -1;
  function paint(charge, force = false) {
    const step = Math.floor(charge * 60);
    if (!force && step === Math.floor(lastCharge * 60)) return;
    lastCharge = charge;
    const ready = charge >= 1,
      g = face.graphics,
      down = control.pressed;
    g.clear();
    if (ready) g.beginFill(0x8ccfff, 0.22).drawCircle(0, 0, radius + 12).endFill();
    g.lineStyle(3, INK, 1).beginFill(ready ? 0xc8a030 : 0x3a2a22, ready ? 1 : 0.9).drawCircle(0, down ? 2 : 0, radius).endFill();
    g.lineStyle(0).beginFill(ready ? 0xf4d65a : 0x5a3e2a, 1).drawCircle(0, down ? 2 : 0, radius * 0.78).endFill();
    g.lineStyle(5, ready ? 0xffffff : 0x8ccfff, ready ? 0.95 : 0.85).drawArc(0, 0, radius + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, charge));
    g.lineStyle(0);
    glyph.display.alpha = ready ? 1 : 0.55;
    caption.display.alpha = ready ? 1 : 0.7;
  }
  return { paint, node };
}

/** The watch: the road, the crossbow, the haunts, the wall, and the choice of wards when a level is gained. */
export async function playScreen(app, { night = 1 } = {}) {
  const s = begin(app, 'play'),
    { width, height } = app.stage,
    { kit, root, scope } = s;
  const tall = height > width;
  night = Math.max(1, Math.min(NIGHT_COUNT, night));
  const seed = app.seed ?? Math.floor(Date.now() % 100000);
  const world = (app.world = createWorld({ night, seed }));
  const plan = world.plan,
    art = app.art;
  art.wardens[plan.boss] ??= await loadWardenAtlas(app.game, plan.boss);
  const field = createField(app, scope, world, { ...art, warden: art.wardens[plan.boss] }, { reducedMotion: app.reducedMotion });
  root.addChild(field.root);
  // The field fills the height; a tall stage leaves a band at the top for the bars, a wide one panels at the sides.
  const scale = tall ? (height - 60) / FIELD.height : height / FIELD.height;
  field.root.scaleX = field.root.scaleY = scale;
  field.root.x = (width - FIELD.width * scale) / 2;
  field.root.y = tall ? 60 : 0;
  roadBackdrop(app, plan.ground, { x: field.root.x, y: field.root.y, width: FIELD.width * scale, height: FIELD.height * scale });

  // Steering by touch or mouse: a finger on the road leads the crossbow; it keeps that finger until it lifts.
  const pad = root.addChild(scope.use(new Sprite()));
  pad.touchEnabled = true;
  pad.hitArea = { x: field.root.x, y: field.root.y, width: FIELD.width * scale, height: FIELD.height * scale };
  let steering = null,
    steerX = null;
  const toField = (globalX) => (globalX - field.root.x) / scale;
  kit.own({
    dispose: app.game.pointer.observe(({ kind, contact, target }) => {
      if (kind === 'begin' && target === pad && !steering) {
        steering = contact.session.id;
        steerX = toField(contact.globalX);
      } else if (contact.session.id === steering) {
        if (kind === 'move') steerX = toField(contact.globalX);
        else if (kind === 'end' || kind === 'cancel') steering = steerX = null;
      }
    })
  });

  // ——— The bars and buttons. ———
  const hud = root.addChild(scope.use(new DisplayObjectContainer()));
  if (tall) {
    const band = hud.addChild(scope.use(new Sprite()));
    // Opaque over the top of the road, where haunts come in, then fading into it.
    band.graphics.beginFill(0x05060c, 1).drawRect(0, 0, width, 64).endFill();
    band.graphics.beginLinearGradientFill(0, 64, 0, 84, [
      { offset: 0, color: 0x05060c, alpha: 1 },
      { offset: 1, color: 0x05060c, alpha: 0 }
    ])
      .drawRect(0, 64, width, 20)
      .endFill();
  }
  const L = tall
    ? { name: [16, 8], level: [16, 36], progress: [150, 44, 220, 9], wall: [384, 44, 140, 9], wallLabel: [384, 20], souls: [0, 60, width, 4], pause: [width - 118, 6, 104, 34], thunder: [width - 70, height - 86, 46], hint: [16, height - 30] }
    : { name: [20, 22], level: [20, 120], progress: [field.root.x + FIELD.width * scale + 20, 64, 280, 10], wall: [20, 86, 270, 12], wallLabel: [20, 58], souls: [20, 152, 270, 6], pause: [width - 130, 20, 110, 44], thunder: [width - 160, height - 140, 52], hint: [field.root.x + FIELD.width * scale + 20, height - 40] };
  await kit.label(hud, t(`nightShort${night}`), { x: L.name[0], y: L.name[1], size: tall ? 20 : 24, weight: 700, color: 0xfff1d0 });
  const levelLabel = await kit.label(hud, t('levelShort', { level: world.level }), { x: L.level[0], y: L.level[1], size: 16, color: AMBER, family: SANS });
  await kit.label(hud, t('wall'), { x: L.wallLabel[0], y: L.wallLabel[1], size: 14, color: 0xd8d0bc, family: SANS });
  const progressLabel = await kit.label(hud, t('midnight'), { x: L.progress[0], y: L.progress[1] - 24, size: 14, color: 0xd8d0bc, family: SANS });
  const wallBar = meter(scope, hud, { x: L.wall[0], y: L.wall[1], width: L.wall[2], height: L.wall[3], colour: 0x6fd08a }),
    progressBar = meter(scope, hud, { x: L.progress[0], y: L.progress[1], width: L.progress[2], height: L.progress[3], colour: 0x8ca0e0 }),
    soulBar = meter(scope, hud, { x: L.souls[0], y: L.souls[1], width: L.souls[2], height: L.souls[3], colour: 0x9ad8ff });
  const pauseButton = await kit.button({ x: L.pause[0], y: L.pause[1], width: L.pause[2], height: L.pause[3], text: t('pause'), small: true, container: hud, onActivate: () => pause() });
  let thunderAsked = false;
  const thunder = await thunderButton(app, kit, scope, hud, { x: L.thunder[0], y: L.thunder[1], radius: L.thunder[2], onActivate: () => (thunderAsked = true) });
  await kit.label(hud, app.touch ? t('touchHint') : t('keys'), { x: L.hint[0], y: L.hint[1], size: 13, color: 0xa8a090, family: SANS });
  // On a wide stage the left panel lists the wards held.
  if (!tall) await kit.label(hud, t('wardsHeld'), { x: 20, y: 190, size: 15, color: 0xd8d0bc, family: SANS });
  const wardLines = [];
  async function showWards() {
    if (tall) return;
    const held = Object.keys(WARDS).filter((id) => wardLevel(world, id) > 0);
    for (let i = 0; i < Math.max(held.length, wardLines.length, 1); i++) {
      const words = held[i] ? t('wardLevel', { name: t(WARD_WORDS[held[i]][0]), level: '·'.repeat(wardLevel(world, held[i])) }) : i === 0 ? t('noWards') : '';
      if (!wardLines[i]) wardLines[i] = await kit.label(hud, words, { x: 20, y: 218 + i * 24, size: 16, color: held[i] ? AMBER : 0x8a8478, family: SANS });
      else await wardLines[i].set(words);
    }
  }
  await showWards();

  // ——— The warden's banner. ———
  async function banner(words) {
    const node = root.addChild(scope.use(new DisplayObjectContainer()));
    const band = node.addChild(scope.use(new Sprite()));
    band.graphics.beginLinearGradientFill(0, 0, width, 0, [
      { offset: 0, color: 0x3a0808, alpha: 0 },
      { offset: 0.5, color: 0x5a0c0c, alpha: 0.9 },
      { offset: 1, color: 0x3a0808, alpha: 0 }
    ])
      .drawRect(0, 0, width, 70)
      .endFill();
    await kit.label(node, words, { x: 0, y: 16, size: 32, weight: 800, color: 0xffe6c0, align: 'center', width });
    node.y = height * 0.36;
    node.alpha = 0;
    animate(app.game.engine, scope, node).to({ alpha: 1 }, 0.35, 'quadOut').wait(2).to({ alpha: 0 }, 0.6, 'quadIn').start();
  }

  // ——— The choice of wards. ———
  let overlay = null,
    building = false;
  async function openOffer() {
    building = true;
    const offer = world.offer,
      node = root.addChild(scope.use(new DisplayObjectContainer())),
      dim = node.addChild(scope.use(new Sprite()));
    dim.graphics.beginFill(0x020308, 0.62).drawRect(0, 0, width, height).endFill();
    dim.touchEnabled = true;
    dim.hitArea = { x: 0, y: 0, width, height };
    const cardSize = tall ? { width: width - 64, height: 104 } : { width: 270, height: 170 },
      plan2 = planLinearLayout({ axis: tall ? 'vertical' : 'horizontal', items: offer.map(() => cardSize), gap: tall ? 18 : 24, crossAlign: 'center' }),
      originX = (width - plan2.width) / 2,
      originY = (height - plan2.height) / 2 + (tall ? 30 : 30);
    await kit.label(node, t('chooseWard', { level: world.level }), { x: 0, y: originY - 64, size: 28, weight: 800, color: 0xfff1d0, align: 'center', width });
    const cards = [];
    for (const placement of plan2.placements) {
      const id = offer[placement.index],
        [nameKey, textKey] = WARD_WORDS[id],
        next = wardLevel(world, id) + 1;
      const card = await kit.button({
        x: originX + placement.x,
        y: originY + placement.y,
        width: placement.width,
        height: placement.height,
        text: `${placement.index + 1}  ${t(nameKey)}  ${next === 1 ? '· ' + t('newWard') : '·'.repeat(next)}`,
        sub: t(textKey),
        primary: placement.index === 0,
        container: node,
        onActivate: () => pick(id)
      });
      cards.push(card);
    }
    if (!app.touch) await kit.label(node, t('pickKeys'), { x: 0, y: originY + plan2.height + 20, size: 15, color: 0xa8a090, align: 'center', width, family: SANS });
    overlay = { node, cards, offer };
    building = false;
    app.sound.play('level');
    app.padMenus(true);
    cards[0].focus(!app.touch);
  }
  function pick(id) {
    if (!overlay || !choose(world, id)) return;
    app.sound.play('ward');
    app.rumble(0.3, 120);
    overlay.node.visible = false;
    overlay.cards.forEach((card) => card.setEnabled(false));
    overlay = null;
    // The focus leaves the hidden cards, so Space on the road is the thunder again and not a card's key.
    app.game.keyboard?.focus(undefined);
    app.padMenus(false);
    quietThunder = 0.3;
    void showWards();
  }

  // ——— Pause. ———
  let paused = null;
  async function pause() {
    if (paused || ended || overlay) return;
    const node = root.addChild(scope.use(new DisplayObjectContainer()));
    paused = { node };
    const dim = node.addChild(scope.use(new Sprite()));
    dim.graphics.beginFill(0x020308, 0.7).drawRect(0, 0, width, height).endFill();
    dim.touchEnabled = true;
    dim.hitArea = { x: 0, y: 0, width, height };
    const w = Math.min(380, width - 60),
      x = (width - w) / 2,
      y = height / 2 - 140;
    kit.panel({ x, y, width: w, height: 280, container: node });
    await kit.label(node, t('paused'), { x, y: y + 34, size: 30, weight: 800, color: 0xfff1d0, align: 'center', width: w });
    const resume = await kit.button({ x: x + 30, y: y + 100, width: w - 60, height: 60, text: t('resume'), primary: true, container: node, onActivate: () => unpause() });
    await kit.button({ x: x + 30, y: y + 180, width: w - 60, height: 60, text: t('retreat'), container: node, onActivate: () => app.go('nights') });
    paused.resume = resume;
    app.padMenus(true);
    resume.focus(!app.touch);
  }
  function unpause() {
    if (!paused) return;
    paused.node.visible = false;
    paused.resume.setEnabled(false);
    paused = null;
    app.game.keyboard?.focus(undefined);
    app.padMenus(false);
    quietThunder = 0.3;
  }

  // ——— Sounds and the pad's rumble for what happened. ———
  function hear(events) {
    for (const e of events)
      switch (e.type) {
        case 'shot':
          app.sound.play('shot');
          break;
        case 'hit':
          app.sound.play(e.crit ? 'crit' : 'hit');
          break;
        case 'kill':
          app.sound.play(e.kind === 'paper' ? 'paper' : 'pop');
          if (e.boss) app.rumble(1, 500);
          break;
        case 'bite':
          app.sound.play('bite');
          app.rumble(0.35, 120);
          break;
        case 'spit':
          app.sound.play('spit');
          break;
        case 'chain':
          app.sound.play('chain');
          break;
        case 'mirror':
          app.sound.play('mirror');
          break;
        case 'ink':
          app.sound.play('ink');
          break;
        case 'thunder':
          app.sound.play('thunder');
          app.rumble(0.9, 400);
          break;
        case 'stomp':
          app.sound.play('stomp');
          app.rumble(0.6, 250);
          break;
        case 'bossCame':
          app.sound.play('boss');
          void banner(t('bossCame', { name: t(e.kind) }));
          break;
        case 'won':
          app.sound.play('won');
          break;
        case 'lost':
          app.sound.play('lost');
          break;
      }
  }

  let carried = 0,
    ended = 0,
    quietThunder = 0,
    shownLevel = world.level,
    shownWards = 0;
  void app.sound.music(true);
  const finish = () => {
    const won = world.state === 'won',
      stars = starsFor(world);
    let result = { best: false, opened: false };
    const saved = app.save.update((data) => {
      result = recordNight(data, night, { won, stars, seconds: world.time });
    });
    void app.sound.music(false);
    void app.go('end', { night, won, stars, kills: world.stats.kills, level: world.level, seconds: world.time, best: result.best, saved });
  };

  return {
    ...s,
    world,
    field,
    focusFirst: () => {},
    // Escape, P or the pad's start button pause, and the same again goes on.
    pause: () => (paused ? unpause() : pause()),
    escape: () => (paused ? unpause() : pause()),
    pick: (index) => overlay && pick(overlay.offer[index]),
    update(seconds) {
      if (ended) {
        field.update(seconds, []);
        ended -= seconds;
        if (ended <= 0) {
          ended = Infinity;
          finish();
        }
        return;
      }
      if (paused) return;
      if (world.offer) {
        if (!overlay && !building) void openOffer();
        if (overlay) for (const [i, key] of ['pick1', 'pick2', 'pick3'].entries()) if (app.actions.justPressed(key) && overlay.offer[i]) pick(overlay.offer[i]);
        field.update(seconds, []);
        refreshHud();
        return;
      }
      quietThunder = Math.max(0, quietThunder - seconds);
      const keys = app.actions.vector('steer').x,
        move = steerX !== null ? Math.max(-1, Math.min(1, (steerX - world.turret.x) / 18)) : keys;
      let wantThunder = (app.actions.justPressed('thunder') && quietThunder === 0) || thunderAsked;
      thunderAsked = false;
      const events = [];
      carried += seconds;
      while (carried >= STEP) {
        carried -= STEP;
        events.push(...step(world, { move, thunder: wantThunder }, STEP));
        wantThunder = false;
        if (world.offer || world.state !== 'play') {
          carried = 0;
          break;
        }
      }
      field.update(seconds, events);
      // The shake moves the whole canvas and the road under it, together.
      const cssPerUnit = scale / app.game.unitsPerCssPixel;
      app.shakeBy(field.shakeX * cssPerUnit, field.shakeY * cssPerUnit);
      hear(events);
      refreshHud();
      if (world.state !== 'play') ended = 1.6;
    },
    get offerOpen() {
      return Boolean(overlay);
    },
    get pausedNow() {
      return Boolean(paused);
    },
    pauseButton
  };

  /** The bars and words of the HUD, from the rules' state; each part is painted again only when it changes. */
  function refreshHud() {
      wallBar.set(world.wall.hp / world.wall.max, world.wall.hp / world.wall.max > 0.5 ? 0x6fd08a : world.wall.hp / world.wall.max > 0.25 ? 0xf0b85a : 0xe0484a);
      if (world.boss) {
        progressBar.set(world.boss.hp / world.boss.max, 0xe0484a);
        if (progressLabel.words !== world.boss.kind) {
          progressLabel.words = world.boss.kind;
          void progressLabel.set(t(world.boss.kind));
        }
      } else progressBar.set(world.bossCame ? 0 : world.time / plan.bossAt, 0x8ca0e0);
      soulBar.set(world.souls / world.need);
      thunder.paint(world.thunder);
      if (world.level !== shownLevel) {
        shownLevel = world.level;
        void levelLabel.set(t('levelShort', { level: world.level }));
      }
      const held = Object.values(world.wards).reduce((sum, level) => sum + level, 0);
      if (held !== shownWards) {
        shownWards = held;
        void showWards();
      }
  }
}

/** The end of a night: held or fallen, the stars, the counts, and the ways on. */
export async function endScreen(app, { night = 1, won = false, stars = 0, kills = 0, level = 1, seconds = 0, best = false, saved = true } = {}) {
  const s = begin(app, 'end'),
    { width, height } = app.stage,
    { kit, root, scope } = s;
  backdrop(app, NIGHTS[night - 1].ground, 0.62);
  const panelWidth = Math.min(480, width - 48),
    x = (width - panelWidth) / 2,
    y = height / 2 - 220;
  kit.panel({ x, y, width: panelWidth, height: 440, container: root });
  await kit.label(root, t(`night${night}`), { x, y: y + 30, size: 18, color: 0xd8d0bc, align: 'center', width: panelWidth, family: SANS });
  await kit.label(root, won ? t('held') : t('fell'), { x, y: y + 62, size: 40, weight: 800, color: won ? 0xfff1d0 : 0xff9a8a, align: 'center', width: panelWidth });
  if (won) await kit.label(root, starMarks(stars), { x, y: y + 124, size: 34, color: AMBER, align: 'center', width: panelWidth });
  await kit.label(root, t('results', { kills, level, time: clock(seconds) }), { x, y: y + 176, size: 17, color: PAPER, align: 'center', width: panelWidth, family: SANS });
  if (best) await kit.label(root, t('newBest'), { x, y: y + 204, size: 16, color: TEAL, align: 'center', width: panelWidth, family: SANS });
  if (won && night === NIGHT_COUNT) await kit.label(root, t('allHeld'), { x, y: y + 204, size: 15, color: AMBER, align: 'center', width: panelWidth, family: SANS });
  if (!saved) await kit.label(root, t('saveRefused'), { x: x + 20, y: y + 230, size: 12, color: 0xffd08a, family: SANS });
  const next = won && night < NIGHT_COUNT;
  const main = await kit.button({ x: x + 36, y: y + 254, width: panelWidth - 72, height: 60, text: next ? t('nextNight') : t('again'), primary: true, onActivate: () => app.go('play', { night: next ? night + 1 : night }) });
  if (next) await kit.button({ x: x + 36, y: y + 324, width: (panelWidth - 84) / 2, height: 56, text: t('again'), small: true, onActivate: () => app.go('play', { night }) });
  await kit.button({ x: next ? x + 48 + (panelWidth - 84) / 2 : x + 36, y: y + 324, width: next ? (panelWidth - 84) / 2 : panelWidth - 72, height: 56, text: t('toNights'), small: true, onActivate: () => app.go('nights') });
  return { ...s, focusFirst: () => main.focus(false), escape: () => app.go('nights'), confirm: () => app.go('play', { night: next ? night + 1 : night }) };
}

/** Settings: sound, reduced motion and the language, each saved at once. */
export async function settingsScreen(app) {
  const s = begin(app, 'settings'),
    { width, height } = app.stage,
    { kit, root, scope } = s;
  backdrop(app, 'temple', 0.62);
  const settings = app.save.data.settings,
    panelWidth = Math.min(440, width - 48),
    x = (width - panelWidth) / 2,
    y = height / 2 - 190;
  kit.panel({ x, y, width: panelWidth, height: 380, container: root });
  await kit.label(root, t('settings'), { x: x + 30, y: y + 28, size: 30, weight: 700, color: 0xfff1d0 });
  const sound = await kit.toggle({ x: x + 30, y: y + 96, width: panelWidth - 60, text: t('sound'), checked: settings.sound, onChange: (on) => app.setSetting('sound', on) });
  await kit.toggle({ x: x + 30, y: y + 156, width: panelWidth - 60, text: t('reducedMotion'), checked: settings.reducedMotion, onChange: (on) => app.setSetting('reducedMotion', on) });
  await kit.button({ x: x + 30, y: y + 220, width: panelWidth - 60, height: 56, text: t('language'), name: t('languageName'), onActivate: () => app.switchLanguage() });
  await kit.button({ x: x + 30, y: y + 296, width: panelWidth - 60, height: 56, text: t('close'), primary: true, onActivate: () => app.go('title') });
  return { ...s, focusFirst: () => app.game.keyboard?.focus(sound.id, { visible: false }), escape: () => app.go('title') };
}
