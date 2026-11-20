// 画面：标题、游戏、结算和设置。每个画面在自己的作用域里建，离开时一起放掉；字一律从 t() 取，按舞台的宽高排，
// 横屏和竖屏都排得下。
// The screens: title, play, the round's end and the settings. Each is made in its own scope and let go as a whole
// when it is left; every word comes from t(), and the layout follows the stage's width and height, so it fits both a
// wide and a tall stage.
import { DisplayObjectContainer, Sprite, animate } from '@egret/engine';
import { createActionControl } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { AMBER, INK, NIGHT, PAPER, SANS, TEAL, createScreenKit } from './ui/kit.mjs';
import { FIELD, cleared, createWorld, step } from './sim/world.mjs';
import { recordRound } from './saves.mjs';
import { getLanguage, t } from './i18n.mjs';

/** A screen's common parts: its scope, its kit and its root container. */
function begin(app, prefix) {
  const scope = app.game.engine.createScope(),
    kit = createScreenKit(app.game, scope, { semantics: app.semantics, sound: app.sound, prefix, locale: getLanguage() }),
    root = app.game.stage.addChild(scope.use(new DisplayObjectContainer()));
  return { scope, kit, root, dispose: () => (kit.dispose(), scope.dispose()) };
}

/** The night sky behind every screen, with a soft glow low in the middle. */
/** The lantern bearer: a cloaked figure holding a lit lantern out in front, facing `facing` (1 right, -1 left). */
export function drawHero(g, facing = 1, sway = 0) {
  g.clear();
  g.beginFill(0x000000, 0.25).drawEllipse(-16, 18, 32, 8).endFill();
  g.lineStyle(2, INK, 1);
  g.beginFill(0x2f4f6a, 1).moveTo(-12, 20).lineTo(-9, -6).lineTo(9, -6).lineTo(12, 20).lineTo(-12, 20).endFill();
  g.beginFill(0xe6c9a0, 1).drawCircle(0, -14, 9).endFill();
  g.beginFill(0x8a3b2c, 1).moveTo(-11, -15).lineTo(0, -28).lineTo(11, -15).lineTo(-11, -15).endFill();
  const hx = facing * 18,
    hy = 2 + sway;
  g.lineStyle(2, INK, 1).moveTo(facing * 6, -2).lineTo(hx, hy - 8);
  g.lineStyle(1.5, INK, 1).beginFill(AMBER, 1).drawRoundRect(hx - 5, hy - 8, 10, 13, 3, 3).endFill();
  g.lineStyle(0).beginFill(0xfff2c0, 0.95).drawCircle(hx, hy - 1, 3).endFill();
}

/** The title: the name, the best time, and the ways in. */
export async function titleScreen(app) {
  const s = begin(app, 'title'),
    { width, height } = app.stage,
    { kit, root, scope } = s;
  const tall = height > width,
    left = tall ? 40 : Math.round(width * 0.1);
  await kit.label(root, t('title'), { x: left, y: tall ? 150 : 110, size: tall ? 60 : 72, weight: 800, color: 0xfff1d0 });
  await kit.label(root, t('subtitle'), { x: left + 4, y: tall ? 236 : 212, size: 22, color: AMBER, family: SANS });
  const best = app.save.data.best;
  await kit.label(root, best === null ? t('noBest') : t('best', { time: best.toFixed(1) }), { x: left + 4, y: tall ? 276 : 252, size: 18, color: 0xc8c0aa, family: SANS });
  const buttonWidth = tall ? width - 80 : 300;
  let y = tall ? 420 : 310;
  const start = await kit.button({ x: left, y, width: buttonWidth, height: 64, text: t('start'), primary: true, onActivate: () => app.go('play') });
  y += 80;
  await kit.button({ x: left, y, width: buttonWidth, height: 64, text: t('settings'), onActivate: () => app.go('settings') });
  y += 80;
  await kit.button({ x: left, y, width: buttonWidth, height: 64, text: t('language'), name: t('languageName'), onActivate: () => app.switchLanguage() });
  // The lantern bearer on the right, waiting.
  const hero = root.addChild(scope.use(new Sprite()));
  hero.x = tall ? width / 2 : width * 0.72;
  hero.y = tall ? height - 140 : height * 0.62;
  hero.scaleX = hero.scaleY = 3;
  drawHero(hero.graphics, -1);
  if (!app.reducedMotion) animate(app.game.engine, scope, hero).to({ y: hero.y - 8 }, 1.6, 'sineInOut').to({ y: hero.y }, 1.6, 'sineInOut').loop().start();
  if (app.notice) await kit.label(root, app.notice, { x: left + 4, y: height - 46, size: 15, color: 0xffd08a, family: SANS });
  return { ...s, kit, focusFirst: () => start.focus(false), confirm: () => app.go('play') };
}

/** Play: the field, the lights, the lantern bearer, the count and the time; touch arrows on a touch screen. */
export async function playScreen(app) {
  const s = begin(app, 'play'),
    { width, height } = app.stage,
    { kit, root, scope } = s;
  const world = (app.world = createWorld(app.seed)),
    // The field is drawn at the size of the rules' field, scaled to fit the stage above the controls.
    field = root.addChild(scope.use(new DisplayObjectContainer())),
    controlsHeight = app.touch ? (height > width ? 300 : 0) : 0,
    scale = Math.min(width / FIELD.width, (height - controlsHeight) / FIELD.height);
  field.scaleX = field.scaleY = scale;
  field.x = (width - FIELD.width * scale) / 2;
  field.y = height > width ? 90 : (height - FIELD.height * scale) / 2;
  const ground = field.addChild(scope.use(new Sprite()));
  ground.graphics.lineStyle(2, AMBER, 0.35).beginFill(0x15202f, 0.75).drawRoundRect(FIELD.margin - 20, FIELD.margin + 20, FIELD.width - FIELD.margin * 2 + 40, FIELD.height - FIELD.margin * 2 + 20, 18, 18).endFill();
  const lights = world.lights.map((light) => {
    const glow = field.addChild(scope.use(new Sprite()));
    glow.x = light.x;
    glow.y = light.y;
    glow.graphics.beginRadialGradientFill(0, 0, 22, [
      { offset: 0, color: 0xfff4c4, alpha: 1 },
      { offset: 0.35, color: AMBER, alpha: 0.85 },
      { offset: 1, color: AMBER, alpha: 0 }
    ])
      .drawCircle(0, 0, 22)
      .endFill();
    return glow;
  });
  const hero = field.addChild(scope.use(new Sprite()));
  const count = await kit.label(root, t('count', { taken: 0, total: world.lights.length }), { x: 24, y: 20, size: 24, weight: 700, color: PAPER });
  const clock = await kit.label(root, t('time', { time: '0.0' }), { x: 24, y: 54, size: 18, color: 0xc8c0aa, family: SANS });
  const back = await kit.button({ x: width - 144, y: 16, width: 128, height: 64, text: t('back'), onActivate: () => app.go('title') });
  if (!app.touch) await kit.label(root, t('keys'), { x: 24, y: height - 36, size: 15, color: 0xa8a090, family: SANS });

  // Touch arrows: four buttons, each held while a finger is on it (createActionControl), one finger per arrow.
  const held = { x: 0, y: 0, up: 0, down: 0, left: 0, right: 0 };
  if (app.touch) {
    const size = 80,
      cx = height > width ? width / 2 : 130,
      cy = height - 130;
    for (const [key, dx, dy, glyph] of [['up', 0, -1, '▲'], ['down', 0, 1, '▼'], ['left', -1, 0, '◀'], ['right', 1, 0, '▶']]) {
      const pad = root.addChild(scope.use(new DisplayObjectContainer())),
        face = pad.addChild(scope.use(new Sprite()));
      pad.x = cx + dx * (size + 6) - size / 2;
      pad.y = cy + dy * (size + 6) - size / 2;
      face.touchEnabled = true;
      face.hitArea = { x: 0, y: 0, width: size, height: size };
      await kit.label(pad, glyph, { x: 0, y: size / 2 - 16, size: 28, align: 'center', width: size, color: PAPER, family: SANS });
      const action = kit.own(createActionControl({ input: app.game.pointer, target: face, onPressChange: (down) => ((held[key] = down ? 1 : 0), paint()) }));
      const paint = () => face.graphics.clear().lineStyle(2, INK, 1).beginFill(action.pressed ? TEAL : 0x2a3c56, 0.85).drawRoundRect(0, 0, size, size, 16, 16).endFill();
      paint();
      kit.own(app.semantics.add({ id: `play-pad-${key}`, role: 'button', onActivate: () => ((held[key] = 1), setTimeout(() => (held[key] = 0), 250)), describe: () => ({ name: t(key), bounds: semanticBoundsOf(face) }) }));
    }
  }

  let finished = false,
    shownTime = '';
  return {
    ...s,
    focusFirst: () => back.focus(false),
    escape: () => app.go('title'),
    update(seconds) {
      if (finished) return;
      const move = {
        x: app.actions.value('walkX') + held.right - held.left,
        y: app.actions.value('walkY') + held.down - held.up
      };
      const taken = step(world, move, seconds);
      for (const light of taken) {
        lights[world.lights.indexOf(light)].visible = false;
        app.sound.play('light', { rate: 0.9 + world.taken * 0.05 });
        void count.set(t('count', { taken: world.taken, total: world.lights.length }));
      }
      hero.x = world.hero.x;
      hero.y = world.hero.y;
      hero.scaleX = hero.scaleY = 1.6;
      drawHero(hero.graphics, world.hero.facing, world.hero.moving && !app.reducedMotion ? Math.sin(world.time * 12) * 2 : 0);
      if (!app.reducedMotion) lights.forEach((glow, i) => (glow.alpha = 0.75 + 0.25 * Math.sin(world.time * 3 + i)));
      const time = world.time.toFixed(1);
      if (time !== shownTime) {
        shownTime = time;
        void clock.set(t('time', { time }));
      }
      if (cleared(world)) {
        finished = true;
        let best = false;
        const saved = app.save.update((data) => {
          best = recordRound(data, world.time);
        });
        app.sound.play('done');
        void app.go('end', { seconds: world.time, best, saved });
      }
    }
  };
}

/** The end of a round: the time, a new best, and the ways on. */
export async function endScreen(app, { seconds, best, saved }) {
  const s = begin(app, 'end'),
    { width, height } = app.stage,
    { kit, root, scope } = s;
  const panelWidth = Math.min(520, width - 48),
    x = (width - panelWidth) / 2,
    y = height / 2 - 170;
  kit.panel({ x, y, width: panelWidth, height: 340, container: root });
  await kit.label(root, t('done', { time: seconds.toFixed(1) }), { x, y: y + 50, size: 28, weight: 700, color: 0xfff1d0, align: 'center', width: panelWidth });
  if (best) await kit.label(root, t('newBest'), { x, y: y + 100, size: 20, color: AMBER, align: 'center', width: panelWidth, family: SANS });
  if (!saved) await kit.label(root, t('saveRefused'), { x: x + 20, y: y + 130, size: 14, color: 0xffd08a, family: SANS });
  const again = await kit.button({ x: x + 40, y: y + 170, width: panelWidth - 80, height: 64, text: t('again'), primary: true, onActivate: () => app.go('play') });
  await kit.button({ x: x + 40, y: y + 250, width: panelWidth - 80, height: 64, text: t('back'), onActivate: () => app.go('title') });
  return { ...s, focusFirst: () => again.focus(false), escape: () => app.go('title'), confirm: () => app.go('play') };
}

/** The settings: sound, reduced motion and the language; each change is saved at once. */
export async function settingsScreen(app) {
  const s = begin(app, 'settings'),
    { width, height } = app.stage,
    { kit, root, scope } = s;
  const panelWidth = Math.min(520, width - 48),
    x = (width - panelWidth) / 2,
    y = Math.max(20, height / 2 - 200);
  kit.panel({ x, y, width: panelWidth, height: 400, container: root });
  await kit.label(root, t('settings'), { x, y: y + 30, size: 30, weight: 700, color: 0xfff1d0, align: 'center', width: panelWidth });
  const settings = app.save.data.settings;
  const sound = await kit.toggle({ x: x + 40, y: y + 100, width: panelWidth - 80, text: t('sound'), checked: settings.sound, onChange: (on) => app.setSetting('sound', on) });
  await kit.toggle({ x: x + 40, y: y + 160, width: panelWidth - 80, text: t('reducedMotion'), checked: settings.reducedMotion, onChange: (on) => app.setSetting('reducedMotion', on) });
  await kit.choice({ x: x + 40, y: y + 250, width: panelWidth - 80, height: 48, options: [['zh', '中文'], ['en', 'English']], selected: getLanguage(), onChange: (language) => app.switchLanguage(language) });
  await kit.button({ x: x + 40, y: y + 320, width: panelWidth - 80, height: 64, text: t('close'), primary: true, onActivate: () => app.go('title') });
  return { ...s, focusFirst: () => app.game.keyboard?.focus(sound.id, { visible: false }), escape: () => app.go('title') };
}
