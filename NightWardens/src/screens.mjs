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
function begin(app, prefix, parent = app.game.stage) {
  const scope = app.game.engine.createScope(),
    kit = createScreenKit(app.game, scope, { semantics: app.semantics, sound: app.sound, prefix, locale: getLanguage() }),
    root = parent.addChild(scope.use(new DisplayObjectContainer()));
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
  app.setRoad(`linear-gradient(${shade(Math.min(1, dim + .2))}, ${shade(dim)} 60%, ${shade(Math.max(0, dim - .15))}), url(${roadUrl(ground)}) center bottom / cover no-repeat, #05060c`);
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
  // Under the road on a long phone: the wall's grey falling away to the dark, where the thunder seal sits.
  const bottom = (field.y + field.height) / height,
    under = bottom < 0.999 ? `, linear-gradient(transparent ${pct(bottom)}, #2a2b34 ${pct(bottom)}, #101118 ${pct(Math.min(1, bottom + 0.08))}, #05060c)` : '';
  app.setRoad(`${panels}url(${roadUrl(ground)}) ${pct(atX)} ${pct(atY)} / ${pct(field.width / width)} ${pct(field.height / height)} no-repeat${under}, #05060c`);
}
/** The title: the name, the ways in, and a few haunts drifting up the road. */
export async function titleScreen(app) {
  const s = begin(app, 'title'),
    { width, height } = app.stage,
    { kit, root, scope } = s;
  const tall = height > width;
  backdrop(app, tall ? 'cover' : 'cover-wide', 0.08);
  const left = tall ? 44 : 64, contentWidth = tall ? width - 88 : 420;
  // The painting owns the middle of the screen. Framing sits above and below its gate.
  const veil = root.addChild(scope.use(new Sprite()));
  veil.graphics.beginLinearGradientFill(0, 0, 0, height, [
    { offset: 0, color: INK, alpha: .72 }, { offset: .26, color: INK, alpha: .1 },
    { offset: .62, color: INK, alpha: .02 }, { offset: 1, color: INK, alpha: .9 }
  ]).drawRect(0, 0, width, height).endFill();
  const seal = root.addChild(scope.use(new Sprite()));
  seal.graphics.beginFill(RED, .95).drawRect(0, 0, 38, 44).endFill().lineStyle(1, AMBER, .85).drawRect(4, 4, 30, 36).lineStyle(0);
  seal.x = tall ? (width - 38) / 2 : left;
  seal.y = tall ? 54 : 56;
  await kit.label(seal, t('sealGlyph'), { x: 0, y: 5, size: 27, weight: 700, color: PAPER, align: 'center', width: 38 });
  await kit.label(root, t('title'), { x: left, y: tall ? 112 : 115, size: getLanguage() === 'zh' ? 80 : 50, weight: 700, color: PAPER, align: tall ? 'center' : 'left', width: contentWidth });
  await kit.label(root, t('subtitle'), { x: left, y: tall ? 211 : 203, size: 19, color: 0xe5c994, family: SANS, align: tall ? 'center' : 'left', width: contentWidth, wrap: true });
  const buttonWidth = tall ? width - 96 : 340, y = tall ? height - 210 : height - 176;
  const start = await kit.button({ x: tall ? 48 : left, y, width: buttonWidth, height: 70, text: t('start'), titleSize: 27, primary: true, onActivate: () => app.go('nights') });
  const secondaryWidth = (buttonWidth - 14) / 2;
  await kit.button({ x: tall ? 48 : left, y: y + 85, width: secondaryWidth, height: 52, text: t('settings'), tone: 'quiet', small: true, onActivate: () => app.go('settings') });
  await kit.button({ x: (tall ? 48 : left) + secondaryWidth + 14, y: y + 85, width: secondaryWidth, height: 52, text: t('language'), tone: 'quiet', small: true, name: t('languageName'), onActivate: () => app.switchLanguage() });
  if (app.notice) await kit.label(root, app.notice, { x: left, y: height - 56, size: 15, color: 0xffd08a, family: SANS, width: contentWidth, wrap: true });
  return { ...s, kit, focusFirst: () => start.focus(false), confirm: () => app.go('nights') };
}

/** Choosing a night: three, each opened by holding the one before, with its stars and best time. */
export async function nightsScreen(app) {
  const opened = app.save.data.open;
  const s = begin(app, 'nights'),
    { width, height } = app.stage,
    { kit, root, scope } = s;
  const tall = height > width;
  backdrop(app, NIGHTS[Math.min(opened, NIGHT_COUNT) - 1].ground, .64);
  const left = tall ? 32 : 42,
    buttonWidth = tall ? width - 64 : (width - 116) / 3,
    cardHeight = tall ? 174 : 288;
  await kit.label(root, t('chooseNight'), { x: left, y: tall ? 70 : 38, size: 36, weight: 700, color: PAPER });
  let first = null;
  for (let night = 1; night <= NIGHT_COUNT; night++) {
    const open = night <= opened,
      kept = app.save.data.nights[night];
    const sub = !open ? t('locked') : kept ? t('heldStars', { stars: starMarks(kept.stars), time: clock(kept.best) }) : t('notHeld');
    const button = await kit.button({
      x: left + (tall ? 0 : (night - 1) * (buttonWidth + 16)),
      y: (tall ? 156 : 114) + (tall ? (night - 1) * (cardHeight + 18) : 0),
      width: buttonWidth,
      height: cardHeight,
      text: t(`nightShort${night}`),
      sub,
      name: t(`night${night}`),
      imageUrl: roadUrl(NIGHTS[night - 1].ground),
      textAlign: 'left', titleSize: tall ? 29 : 26, detailSize: tall ? 18 : 17,
      textY: cardHeight - 82, subY: cardHeight - 40,
      accent: [AMBER, TEAL, 0xe49578][night - 1],
      primary: open && !kept,
      onActivate: () => open && app.go('play', { night })
    });
    const marker = button.root.addChild(scope.use(new Sprite()));
    marker.x = 20; marker.y = 18;
    marker.graphics.beginFill(open ? RED : INK, .9).drawRect(0, 0, 39, 39).endFill().lineStyle(1, AMBER, .8).drawRect(3, 3, 33, 33).lineStyle(0);
    await kit.label(marker, t(`nightOrdinal${night}`), { x: 0, y: 5, size: 25, color: PAPER, align: 'center', width: 39 });
    if (!open) button.setEnabled(false);
    first ??= open && !kept ? button : null;
    if (night === opened) first ??= button;
  }
  const back = await kit.button({ x: left, y: height - (tall ? 100 : 88), width: tall ? buttonWidth : 190, height: 56, text: t('back'), tone: 'quiet', onActivate: () => app.go('title') });
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
  const glyph = await kit.label(node, t('thunderGlyph'), { x: -radius, y: -radius * .64, size: radius * .86, weight: 700, color: PAPER, align: 'center', width: radius * 2 });
  const caption = await kit.label(node, t('thunder'), { x: -radius - 15, y: radius + 10, size: 17, color: PAPER, align: 'center', width: radius * 2 + 30, family: SANS });
  const id = 'play-thunder';
  const control = kit.own(createActionControl({ input: app.game.pointer, target: face, onActivate, onPressChange: () => paint(lastCharge, true) }));
  kit.own(app.semantics.add({ id, role: 'button', onActivate, describe: () => ({ name: t('thunderName'), bounds: semanticBoundsOf(face), disabled: lastCharge < 1 }) }));
  let lastCharge = -1, wasReady = null;
  function paint(charge, force = false) {
    const step = Math.floor(charge * 60);
    if (!force && step === Math.floor(lastCharge * 60)) return;
    lastCharge = charge;
    const ready = charge >= 1,
      g = face.graphics,
      down = control.pressed;
    g.clear();
    if (ready) g.beginFill(AMBER, .12).drawCircle(0, 0, radius + 12).endFill();
    g.lineStyle(3, INK, 1).beginLinearGradientFill(0, -radius, 0, radius, [
      { offset: 0, color: ready ? 0xf2d89d : 0x86734e, alpha: 1 },
      { offset: 1, color: ready ? 0x8c622e : 0x372f27, alpha: 1 }
    ]).drawCircle(0, down ? 2 : 0, radius).endFill();
    g.lineStyle(1, PAPER, ready ? .65 : .25).drawCircle(0, down ? 2 : 0, radius - 5);
    g.lineStyle(0).beginFill(ready ? RED : 0x1d2b37, 1).drawCircle(0, down ? 2 : 0, radius * .76).endFill();
    g.lineStyle(4, ready ? PAPER : TEAL, ready ? 1 : .95).drawArc(0, 0, radius + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, charge));
    g.lineStyle(0);
    glyph.display.alpha = ready ? 1 : .7;
    if (wasReady !== ready) { wasReady = ready; void caption.set(t(ready ? 'thunderReady' : 'thunder')); }
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
  // The field fills the height; a tall stage leaves a band at the top for the bars (and, on a long phone, room under
  // the road for the thunder seal and a thumb), a wide one panels at the sides.
  const scale = tall ? Math.min(1, (height - 88) / FIELD.height) : height / FIELD.height;
  field.root.scaleX = field.root.scaleY = scale;
  field.root.x = (width - FIELD.width * scale) / 2;
  field.root.y = tall ? 88 : 0;
  roadBackdrop(app, plan.ground, { x: field.root.x, y: field.root.y, width: FIELD.width * scale, height: FIELD.height * scale });

  // Steering by touch or mouse: a finger on the road leads the crossbow; it keeps that finger until it lifts.
  const pad = root.addChild(scope.use(new Sprite()));
  pad.touchEnabled = true;
  // On a tall stage the room under the road steers too.
  pad.hitArea = { x: field.root.x, y: field.root.y, width: FIELD.width * scale, height: tall ? height - field.root.y : FIELD.height * scale };
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
    band.graphics.beginFill(INK, 1).drawRect(0, 0, width, 84).endFill();
    band.graphics.lineStyle(1, AMBER, .35).moveTo(16, 80).lineTo(width - 16, 80).lineStyle(0);
    band.graphics.beginLinearGradientFill(0, 84, 0, 102, [
      { offset: 0, color: INK, alpha: .9 },
      { offset: 1, color: INK, alpha: 0 }
    ])
      .drawRect(0, 84, width, 18)
      .endFill();
  }
  const L = tall
    ? { name: [16, 9], level: [306, 12], progress: [278, 61, width - 294, 11], wall: [16, 61, 238, 11], wallLabel: [16, 38], souls: [0, 84, width, 4], pause: [width - 110, 7, 96, 38], thunder: [width - 72, height - 92, 46], hint: [18, height - 54] }
    : { name: [20, 22], level: [20, 120], progress: [field.root.x + FIELD.width * scale + 20, 64, 280, 10], wall: [20, 86, 270, 12], wallLabel: [20, 58], souls: [20, 152, 270, 6], pause: [width - 130, 20, 110, 44], thunder: [width - 160, height - 152, 52], hint: [field.root.x + FIELD.width * scale + 20, height - 51] };
  await kit.label(hud, t(`nightShort${night}`), { x: L.name[0], y: L.name[1], size: tall ? 20 : 25, weight: 700, color: PAPER });
  const levelLabel = await kit.label(hud, t('levelShort', { level: world.level }), { x: L.level[0], y: L.level[1], size: 18, color: AMBER, family: SANS });
  await kit.label(hud, t('wall'), { x: L.wallLabel[0], y: L.wallLabel[1], size: 17, color: 0xe3d7bd, family: SANS });
  const progressLabel = await kit.label(hud, t('midnight'), { x: L.progress[0], y: L.progress[1] - 24, size: 17, color: 0xe3d7bd, family: SANS });
  const wallBar = meter(scope, hud, { x: L.wall[0], y: L.wall[1], width: L.wall[2], height: L.wall[3], colour: 0x6fd08a }),
    progressBar = meter(scope, hud, { x: L.progress[0], y: L.progress[1], width: L.progress[2], height: L.progress[3], colour: 0x8ca0e0 }),
    soulBar = meter(scope, hud, { x: L.souls[0], y: L.souls[1], width: L.souls[2], height: L.souls[3], colour: 0x9ad8ff });
  const pauseButton = await kit.button({ x: L.pause[0], y: L.pause[1], width: L.pause[2], height: L.pause[3], text: t('pause'), small: true, container: hud, onActivate: () => pause() });
  let thunderAsked = false;
  const thunder = await thunderButton(app, kit, scope, hud, { x: L.thunder[0], y: L.thunder[1], radius: L.thunder[2], onActivate: () => (thunderAsked = true) });
  await kit.label(hud, app.touch ? t('touchHint') : t('keys'), { x: L.hint[0], y: L.hint[1], size: tall ? 15 : 16, color: 0xc9bda6, family: SANS, width: tall ? width - 166 : 272, wrap: true });
  // On a wide stage the left panel lists the wards held.
  if (!tall) await kit.label(hud, t('wardsHeld'), { x: 20, y: 190, size: 18, color: PAPER, family: SANS });
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
  // Hide nothing in place: old dialog labels hold raster leases until disposed.
  let overlay = null;
  async function buildOffer(dialog) {
    const { offer, scope, kit, root: node } = dialog,
      dim = node.addChild(scope.use(new Sprite()));
    dim.graphics.beginFill(0x020308, 0.62).drawRect(0, 0, width, height).endFill();
    dim.touchEnabled = true;
    dim.hitArea = { x: 0, y: 0, width, height };
    const cardSize = tall ? { width: width - 64, height: 144 } : { width: 276, height: 238 },
      plan2 = planLinearLayout({ axis: tall ? 'vertical' : 'horizontal', items: offer.map(() => cardSize), gap: tall ? 16 : 20, crossAlign: 'center' }),
      originX = (width - plan2.width) / 2,
      originY = (height - plan2.height) / 2 + 30;
    await kit.label(node, t('chooseWard', { level: world.level }), { x: 0, y: originY - 64, size: 28, weight: 700, color: PAPER, align: 'center', width });
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
        text: t(nameKey),
        sub: t(textKey),
        name: `${placement.index + 1} ${t(nameKey)} ${t(textKey)}`,
        tone: 'paper', textAlign: 'left', inset: tall ? 72 : 22,
        titleSize: 27, detailSize: 18, textY: tall ? 24 : 68, subY: tall ? 76 : 118,
        accent: [AMBER, RED, 0x9cafbc][placement.index],
        container: node,
        onActivate: () => pick(id)
      });
      const stamp = card.root.addChild(scope.use(new Sprite()));
      stamp.x = 18; stamp.y = tall ? 24 : 18;
      stamp.graphics.beginFill(RED, .95).drawRect(0, 0, 34, 36).endFill().lineStyle(1, 0xf1d5a4, .85).drawRect(3, 3, 28, 30).lineStyle(0);
      await kit.label(stamp, String(placement.index + 1), { x: 0, y: 4, size: 23, weight: 700, color: PAPER, align: 'center', width: 34 });
      await kit.label(card.root, next === 1 ? t('newWard') : '·'.repeat(next), { x: placement.width - 22, y: 18, size: 16, weight: 700, color: 0x8e3f2e, align: 'right', family: SANS });
      cards.push(card);
    }
    if (!app.touch) await kit.label(node, t('pickKeys'), { x: 0, y: originY + plan2.height + 20, size: 15, color: 0xa8a090, align: 'center', width, family: SANS });
    dialog.cards = cards;
    app.sound.play('level');
    app.padMenus(true);
    cards[0].focus(!app.touch);
  }
  function openOffer() {
    const dialog = overlay = { ...begin(app, 'play', root), offer: world.offer, cards: null };
    void buildOffer(dialog).catch((cause) => {
      if (dialog.scope.state === 'open') throw cause;
    });
  }
  function pick(id) {
    if (!overlay?.cards || !choose(world, id)) return;
    app.sound.play('ward');
    app.rumble(0.3, 120);
    // The focus leaves the hidden cards, so Space on the road is the thunder again and not a card's key.
    app.game.keyboard?.focus(undefined);
    overlay.dispose();
    overlay = null;
    app.padMenus(false);
    quietThunder = 0.3;
  }

  // ——— Pause. ———
  let paused = null;
  async function buildPause(dialog) {
    const { scope, kit, root: node } = dialog;
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
    dialog.resume = resume;
    app.padMenus(true);
    resume.focus(!app.touch);
  }
  function pause() {
    if (paused || ended || world.offer) return;
    const dialog = paused = begin(app, 'play', root);
    void buildPause(dialog).catch((cause) => {
      if (dialog.scope.state === 'open') throw cause;
    });
  }
  function unpause() {
    if (!paused?.resume) return;
    app.game.keyboard?.focus(undefined);
    paused.dispose();
    paused = null;
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
        case 'bossDown':
          app.sound.play('bossDown');
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
          app.sound.play('alert');
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
    kit: {
      repaint() {
        kit.repaint();
        overlay?.kit.repaint();
        paused?.kit.repaint();
      }
    },
    dispose() {
      overlay?.dispose();
      paused?.dispose();
      s.dispose();
    },
    world,
    field,
    focusFirst: () => {},
    // Escape, P or the pad's start button pause, and the same again goes on.
    pause: () => (paused ? unpause() : pause()),
    escape: () => (paused ? unpause() : pause()),
    pick: (index) => overlay?.cards && pick(overlay.offer[index]),
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
        if (!overlay) openOffer();
        if (overlay?.cards) {
          const index = ['pick1', 'pick2', 'pick3'].findIndex((key) => app.actions.justPressed(key));
          if (index !== -1 && overlay.offer[index]) pick(overlay.offer[index]);
        }
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
      return Boolean(overlay?.cards);
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
  backdrop(app, NIGHTS[night - 1].ground, .5);
  const panelWidth = Math.min(480, width - 48),
    x = (width - panelWidth) / 2,
    y = height / 2 - 222;
  kit.panel({ x, y, width: panelWidth, height: 444, container: root });
  await kit.label(root, t(`night${night}`), { x, y: y + 30, size: 18, color: 0xd8d0bc, align: 'center', width: panelWidth, family: SANS });
  await kit.label(root, won ? t('held') : t('fell'), { x, y: y + 62, size: 40, weight: 800, color: won ? 0xfff1d0 : 0xff9a8a, align: 'center', width: panelWidth });
  if (won) await kit.label(root, starMarks(stars), { x, y: y + 124, size: 34, color: AMBER, align: 'center', width: panelWidth });
  await kit.label(root, t('results', { kills, level, time: clock(seconds) }), { x, y: y + 176, size: 17, color: PAPER, align: 'center', width: panelWidth, family: SANS });
  if (won && night === NIGHT_COUNT) await kit.label(root, t('allHeld'), { x: x + 20, y: y + 207, size: 17, color: AMBER, align: 'center', width: panelWidth - 40, family: SANS, wrap: true });
  else if (best) await kit.label(root, t('newBest'), { x, y: y + 207, size: 17, color: TEAL, align: 'center', width: panelWidth, family: SANS });
  if (!saved) await kit.label(root, t('saveShort'), { x: x + 20, y: y + 242, size: 15, color: 0xffd08a, family: SANS, width: panelWidth - 40, wrap: true });
  const next = won && night < NIGHT_COUNT;
  const main = await kit.button({ x: x + 36, y: y + 278, width: panelWidth - 72, height: 60, text: next ? t('nextNight') : t('again'), primary: true, onActivate: () => app.go('play', { night: next ? night + 1 : night }) });
  if (next) await kit.button({ x: x + 36, y: y + 350, width: (panelWidth - 84) / 2, height: 56, text: t('again'), small: true, tone: 'quiet', onActivate: () => app.go('play', { night }) });
  await kit.button({ x: next ? x + 48 + (panelWidth - 84) / 2 : x + 36, y: y + 350, width: next ? (panelWidth - 84) / 2 : panelWidth - 72, height: 56, text: t('toNights'), small: true, tone: 'quiet', onActivate: () => app.go('nights') });
  return { ...s, focusFirst: () => main.focus(false), escape: () => app.go('nights'), confirm: () => app.go('play', { night: next ? night + 1 : night }) };
}

/** Settings: sound, reduced motion and the language, each saved at once. */
export async function settingsScreen(app) {
  const s = begin(app, 'settings'),
    { width, height } = app.stage,
    { kit, root, scope } = s;
  backdrop(app, 'cover', .6);
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
