// 驾驶时的叠加层：左上是这段路的名字和一条从茶山到高原的进度线；右上是车上还剩几捆茶和暂停键；右下是速度表
// （位图字体的数字）和里程表；中下是说话的字幕。手机上再加一组触屏控件：左边一条方向滑条（createRangeControl，
// 松手回中），右边油门、刹车两个踏板和喇叭、视角、扶正几个按钮（createActionControl，按住算踩下）。
//
// The overlay while driving: top left, the name of this stretch and a line from the tea hills to the plateau with the
// convoy on it; top right, the bundles still carried and the pause key; bottom right, the speedometer (bitmap-font
// figures) and the odometer; lower middle, the subtitles. On a touch screen there are also on-screen controls: a
// steering slider on the left (`createRangeControl`, centred again on release), and on the right the throttle and brake
// pedals and buttons for the horn, the camera and righting the truck (`createActionControl`, held while pressed).
import { DisplayObjectContainer, Sprite, animate } from '@egret/engine';
import { createBitmapText } from '@egret/engine/bitmapfont';
import { createActionControl, createControlKeys, createRangeControl } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { FLAG_RED, FONT, INK, PAPER, SAFFRON, SANS, STAGE, TURQUOISE } from './kit.mjs';
import { SPEAKERS } from '../play/story.mjs';

const stops = (...pairs) => pairs.map(([offset, color, alpha = 1]) => ({ offset, color, alpha }));

/**
 * Build the HUD on `game.stage` (`width` × `STAGE.height`). `stations` are `{ s, name }` along the road of `length` metres.
 * `touch` adds the on-screen controls, which write into `controls` (`steer`, `throttle`, `brake`). The callbacks are
 * for the buttons.
 */
export async function createHud(game, scope, kit, { width, font, fontPages, stations, length, touch, controls, semantics, onPause, onHorn, onCamera, onRecover }) {
  const H = STAGE.height,
    root = game.stage.addChild(scope.use(new DisplayObjectContainer())),
    keyboard = game.keyboard;

  // ---- top left: where we are -----------------------------------------------------------------------------------
  const route = root.addChild(scope.use(new Sprite()));
  route.x = 24;
  route.y = 22;
  const routeWidth = Math.min(460, width * 0.36);
  const place = await kit.label(root, '', { x: 28, y: 34, size: 24, color: PAPER, weight: 700 });
  const next = await kit.label(root, '', { x: 28, y: 66, size: 15, color: 0xd8cca8, family: SANS });
  function paintRoute(s) {
    const g = route.graphics;
    g.clear();
    g.beginLinearGradientFill(0, 0, routeWidth + 40, 0, stops([0, 0x0c111c, 0.72], [1, 0x0c111c, 0])).drawRoundRect(-8, -8, routeWidth + 60, 132, 14, 14).endFill();
    const y = 112;
    g.lineStyle(4, 0x0b0f18, 0.9).moveTo(0, y).lineTo(routeWidth, y);
    g.lineStyle(3, 0x8a7a5a, 1).moveTo(0, y).lineTo(routeWidth, y);
    g.lineStyle(3, SAFFRON, 1).moveTo(0, y).lineTo((Math.max(0, Math.min(1, s / length)) * routeWidth), y);
    g.lineStyle(0);
    for (const station of stations) {
      const x = (station.s / length) * routeWidth,
        reached = s >= station.s - 5;
      g.lineStyle(2, INK, 1).beginFill(reached ? SAFFRON : 0x4a5468, 1).drawCircle(x, y, 6).endFill().lineStyle(0);
    }
    const at = Math.max(0, Math.min(1, s / length)) * routeWidth;
    g.lineStyle(2, INK, 1).beginFill(FLAG_RED, 1).moveTo(at, y - 6).lineTo(at - 7, y - 18).lineTo(at + 7, y - 18).lineTo(at, y - 6).endFill().lineStyle(0);
  }

  // ---- top right: the tea and the pause key -------------------------------------------------------------------
  const teaPanel = root.addChild(scope.use(new Sprite()));
  teaPanel.x = width - 300;
  teaPanel.y = 20;
  teaPanel.graphics.beginLinearGradientFill(0, 0, 200, 0, stops([0, 0x0c111c, 0], [0.3, 0x0c111c, 0.72])).drawRoundRect(0, 0, 200, 64, 12, 12).endFill();
  // A bundle of tea, drawn: a wrapped cylinder end-on with its ties.
  const bundle = root.addChild(scope.use(new Sprite()));
  bundle.x = width - 236;
  bundle.y = 52;
  bundle.graphics.lineStyle(2, INK, 1).beginFill(0x8f7442, 1).drawCircle(0, 0, 17).endFill();
  bundle.graphics.lineStyle(2, 0x5a4424, 1).drawCircle(0, 0, 11).lineStyle(0).beginFill(0x5a4424, 1).drawCircle(0, 0, 4).endFill();
  const tea = scope.use(createBitmapText({ font, pages: fontPages, text: '72/72', align: 'left', maxWidth: 160 }));
  root.addChild(tea.display);
  tea.display.x = width - 210;
  tea.display.y = 24;
  tea.display.scaleX = tea.display.scaleY = 0.8;
  const pause = await kit.button({ x: width - 84, y: 20, width: 64, height: 60, text: 'Ⅱ', name: '暂停 Pause', onActivate: onPause, container: root, small: true });

  // ---- bottom right: the gauges ---------------------------------------------------------------------------------
  const dial = root.addChild(scope.use(new Sprite()));
  const dialX = width - (touch ? 520 : 150),
    dialY = H - 120;
  dial.x = dialX;
  dial.y = dialY;
  const speed = scope.use(createBitmapText({ font, pages: fontPages, text: '0', align: 'center', maxWidth: 140 }));
  root.addChild(speed.display);
  speed.display.x = dialX - 70;
  speed.display.y = dialY - 24;
  const unit = await kit.label(root, 'km/h', { x: dialX - 40, y: dialY + 30, size: 14, color: 0xcfc2a0, family: SANS, align: 'center', width: 80 });
  const odometer = scope.use(createBitmapText({ font, pages: fontPages, text: '0.00 km', align: 'center', maxWidth: 220 }));
  root.addChild(odometer.display);
  odometer.display.scaleX = odometer.display.scaleY = 0.5;
  odometer.display.x = dialX - 55;
  odometer.display.y = dialY + 56;
  function paintDial(kmh) {
    const g = dial.graphics,
      r = 92,
      from = Math.PI * 0.75,
      sweep = Math.PI * 1.5,
      share = Math.min(1, kmh / 100);
    g.clear();
    g.beginRadialGradientFill(0, 0, r + 10, stops([0, 0x0c111c, 0.8], [0.85, 0x0c111c, 0.6], [1, 0x0c111c, 0])).drawCircle(0, 0, r + 14).endFill();
    // The scale: a tick every 10 km/h, longer every 20; the red from 80.
    for (let i = 0; i <= 10; i++) {
      const a = from + (i / 10) * sweep,
        long = i % 2 === 0,
        inner = r - (long ? 16 : 9);
      g.lineStyle(long ? 3 : 2, i >= 8 ? FLAG_RED : PAPER, 0.9).moveTo(Math.cos(a) * inner, Math.sin(a) * inner).lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const startX = Math.cos(from) * (r - 26),
      startY = Math.sin(from) * (r - 26);
    g.lineStyle(6, 0x2a3346, 0.9).moveTo(startX, startY).drawArc(0, 0, r - 26, from, from + sweep);
    if (share > 0.005) g.lineStyle(6, kmh > 80 ? FLAG_RED : SAFFRON, 1).moveTo(startX, startY).drawArc(0, 0, r - 26, from, from + sweep * share);
    // The needle.
    const a = from + sweep * share;
    g.lineStyle(4, INK, 1).moveTo(0, 0).lineTo(Math.cos(a) * (r - 4), Math.sin(a) * (r - 4));
    g.lineStyle(2, FLAG_RED, 1).moveTo(0, 0).lineTo(Math.cos(a) * (r - 6), Math.sin(a) * (r - 6));
    g.lineStyle(0).beginFill(INK, 1).drawCircle(0, 0, 6).endFill();
  }

  // ---- subtitles ------------------------------------------------------------------------------------------------
  const subtitle = root.addChild(scope.use(new DisplayObjectContainer()));
  subtitle.y = H - (touch ? 300 : 190);
  const subtitleBack = subtitle.addChild(scope.use(new Sprite()));
  const who = await kit.label(subtitle, '', { x: 0, y: 0, size: 16, color: SAFFRON, family: SANS, weight: 700 });
  const said = await kit.label(subtitle, '', { x: 0, y: 24, size: 24, color: PAPER, family: FONT });
  const saidEn = await kit.label(subtitle, '', { x: 0, y: 60, size: 15, color: 0xc8c0aa, family: SANS });
  subtitle.alpha = 0;
  let subtitleTween = null,
    subtitleFor = 0;
  async function say(line, seconds = 5) {
    const speaker = SPEAKERS[line.who ?? 'road'];
    await who.set(speaker.zh ? `${speaker.zh} · ${speaker.en}` : '');
    await said.set(line.zh);
    await saidEn.set(line.en ?? '');
    const w = Math.max(said.display.width, saidEn.display.width, who.display.width) + 48;
    subtitle.x = (width - w) / 2 + 24;
    for (const part of [who, said, saidEn]) part.display.x = (w - 48 - part.display.width) / 2;
    subtitleBack.graphics.clear();
    subtitleBack.graphics.beginFill(0x0a0e16, 0.62).drawRoundRect(-24, -12, w, 98, 14, 14).endFill();
    subtitleTween?.stop?.();
    subtitle.alpha = 0;
    subtitleTween = animate(game.engine, scope, subtitle).to({ alpha: 1 }, 0.25).start();
    subtitleFor = seconds;
    lastLine = `${speaker.zh ? speaker.zh + '：' : ''}${line.zh}`;
  }
  let lastLine = '';

  // ---- the keys, for those at a keyboard ----------------------------------------------------------------------------
  let hint = null,
    hintFor = 14;
  if (!touch) {
    hint = await kit.label(root, 'W/S 油门·刹车　A/D 转向　H 喇叭　C 视角　R 扶正　Esc 暂停 · 手柄：RT/LT 油门刹车，左摇杆转向，Y 喇叭', { x: 24, y: H - 40, size: 14, color: 0xd8cca8, family: SANS });
  }

  // ---- touch controls -------------------------------------------------------------------------------------------
  const touchParts = [];
  let recover = null;
  if (touch) {
    // Steering: a wide slider on the left, from full left to full right; it springs back to the middle.
    const length = Math.min(360, width * 0.3),
      wheel = root.addChild(scope.use(new DisplayObjectContainer())),
      track = wheel.addChild(scope.use(new Sprite())),
      knob = wheel.addChild(scope.use(new Sprite()));
    wheel.x = 60;
    wheel.y = H - 110;
    track.touchEnabled = true;
    track.hitArea = { x: -50, y: -70, width: length + 100, height: 140 };
    const steer = kit.own(
      createRangeControl({
        input: game.pointer,
        target: track,
        length,
        min: -1,
        max: 1,
        step: 0.01,
        value: 0,
        onChange: (value) => {
          controls.steer = -value;
          paintWheel();
        },
        onDragChange: (dragging) => {
          if (!dragging) steer.setValue(0);
          paintWheel();
        }
      })
    );
    if (keyboard) {
      kit.own(keyboard.registerTarget({ id: 'hud-steer', target: track }));
      kit.own(createControlKeys({ keyboard, target: track, kind: 'range', control: steer, page: 25 }));
    }
    function paintWheel() {
      const g = track.graphics;
      g.clear();
      g.beginFill(0x000000, 0.001).drawRect(-50, -70, length + 100, 140).endFill();
      g.lineStyle(3, INK, 0.9).beginFill(0x0c111c, 0.55).drawRoundRect(-36, -36, length + 72, 72, 36, 36).endFill();
      g.lineStyle(2, PAPER, 0.35).moveTo(length / 2, -26).lineTo(length / 2, 26).lineStyle(0);
      const k = knob.graphics;
      k.clear();
      k.lineStyle(3, INK, 1).beginRadialGradientFill(-6, -6, 34, stops([0, 0xfff1c8], [1, steer.dragging ? FLAG_RED : SAFFRON])).drawCircle(0, 0, 30).endFill();
      k.lineStyle(3, INK, 0.8).moveTo(-12, 0).lineTo(12, 0).moveTo(-12, 0).lineTo(-5, -7).moveTo(-12, 0).lineTo(-5, 7).moveTo(12, 0).lineTo(5, -7).moveTo(12, 0).lineTo(5, 7).lineStyle(0);
      knob.x = steer.fraction * length;
    }
    paintWheel();
    touchParts.push({ id: 'hud-steer', name: '方向 Steering', target: track, role: 'slider', range: () => ({ min: -1, max: 1, now: steer.value }) });

    // Pedals and buttons on the right, sized for thumbs.
    const pedal = async (x, y, w, h, text, sub, colour, onHold, name) => {
      const holder = root.addChild(scope.use(new DisplayObjectContainer())),
        face = holder.addChild(scope.use(new Sprite()));
      holder.x = x;
      holder.y = y;
      face.touchEnabled = true;
      face.hitArea = { x: -10, y: -10, width: w + 20, height: h + 20 };
      await kit.label(holder, text, { x: 0, y: h / 2 - 20, size: 24, color: PAPER, weight: 700, align: 'center', width: w });
      await kit.label(holder, sub, { x: 0, y: h / 2 + 10, size: 12, color: 0xd8cca8, family: SANS, align: 'center', width: w });
      const action = kit.own(createActionControl({ input: game.pointer, target: face, onPressChange: (down) => (onHold(down), paint()) }));
      function paint() {
        const g = face.graphics;
        g.clear();
        g.lineStyle(3, INK, 1).beginLinearGradientFill(0, 0, 0, h, stops([0, action.pressed ? colour : 0x2a3654, 0.92], [1, action.pressed ? 0x1a2236 : 0x121826, 0.92])).drawRoundRect(0, 0, w, h, 18, 18).endFill();
        g.lineStyle(1.5, colour, 0.9).drawRoundRect(5, 5, w - 10, h - 10, 13, 13).lineStyle(0);
      }
      paint();
      touchParts.push({ id: `hud-${name}`, name: `${text} ${sub}`, target: face, role: 'button', press: () => (action.press(), setTimeout(() => action.release(), 300)) });
      return { holder, action };
    };
    await pedal(width - 170, H - 250, 140, 220, '油门', 'Throttle', TURQUOISE, (down) => (controls.throttle = down ? 1 : 0), 'throttle');
    await pedal(width - 330, H - 170, 140, 140, '刹车', 'Brake', FLAG_RED, (down) => (controls.brake = down ? 1 : 0), 'brake');
    const small = async (x, y, text, sub, onActivate, name) => {
      const made = await kit.button({ x, y, width: 104, height: 54, text, sub, onActivate, name: `${text} ${sub}`, container: root, small: true });
      return made;
    };
    await small(width - 330, H - 250, '喇叭', 'Horn', onHorn, 'horn');
    await small(width - 450, H - 250, '视角', 'View', onCamera, 'camera');
    recover = await small(width - 450, H - 170, '扶正', 'Right it', onRecover, 'recover');
    recover.root.visible = false;
  }

  // The semantic nodes of what the HUD shows: the place, the tea, the speed and the subtitle.
  const status = { place: '', tea: '', speed: 0 };
  kit.own(semantics.add({ id: 'hud-status', role: 'status', describe: () => ({ name: `${status.place}。茶 ${status.tea}。时速 ${status.speed} 公里。${lastLine}`, bounds: { x: 24, y: 20, width: routeWidth, height: 120 } }) }));
  for (const part of touchParts)
    kit.own(
      semantics.add({
        id: part.id,
        role: part.role,
        onActivate: part.press,
        describe: () => ({ name: part.name, bounds: semanticBoundsOf(part.target), ...(part.range ? { range: part.range() } : {}) })
      })
    );

  let lastKmh = -1,
    lastTea = '',
    lastOdo = '',
    lastS = -1;
  return {
    root,
    say,
    async setPlace(name, nextName, nextDistance) {
      status.place = name;
      await place.set(name);
      await next.set(nextName ? `下一站 ${nextName} · ${(nextDistance / 1000).toFixed(1)} km` : '');
    },
    setUpset(on) {
      if (recover) recover.root.visible = on;
    },
    update(seconds, { s, kmh, cargo, capacity, odometerKm }) {
      const k = Math.round(kmh);
      if (k !== lastKmh) {
        lastKmh = k;
        status.speed = k;
        speed.text = String(k);
        paintDial(kmh);
      }
      const t = `${cargo}/${capacity}`;
      if (t !== lastTea) {
        lastTea = t;
        status.tea = t;
        tea.text = t;
      }
      const o = `${odometerKm.toFixed(2)} km`;
      if (o !== lastOdo) {
        lastOdo = o;
        odometer.text = o;
      }
      if (Math.abs(s - lastS) > 2) {
        lastS = s;
        paintRoute(s);
      }
      if (subtitleFor > 0) {
        subtitleFor -= seconds;
        if (subtitleFor <= 0) subtitleTween = animate(game.engine, scope, subtitle).to({ alpha: 0 }, 0.6).start();
      }
      if (hint && hintFor > 0) {
        hintFor -= seconds;
        if (hintFor <= 0) animate(game.engine, scope, hint.display).to({ alpha: 0 }, 1).start();
      }
    },
    set visible(on) {
      root.visible = on;
    },
    focusFirst: () => pause.focus()
  };
}
