// 界面零件：按钮、开关、滑条、文字。状态由引擎的界面控件持有（按下、选中、取值），键位由 createControlKeys
// 绑定，读屏器看到的是引擎语义树里的节点；这里只负责画出每个状态。
// The parts of the interface: buttons, switches, a slider and text. Their state is held by the engine's
// controls (pressed, checked, a value in a range), their keys are bound by `createControlKeys`, and what a
// screen reader finds is a node of the engine's semantic tree. This file only paints each state.
import { DisplayObjectContainer, Sprite } from '@egret/engine';
import { createActionControl, createControlKeys, createRangeControl, createToggleControl } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { GOLD, INK, LACQUER } from '../art/shapes.mjs';

export const FONT = '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", serif';
export const SANS = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Source Han Sans SC", sans-serif';

const stops = (...pairs) => pairs.map(([offset, color, alpha = 1]) => ({ offset, color, alpha }));
let serial = 0;

/**
 * The parts of one screen. Everything made through it is let go together when the screen closes:
 * controls, key bindings, keyboard stops, semantic nodes and labels.
 */
export function createScreenKit(game, scope, { semantics, sound, parent = game.stage, prefix = 'ui' } = {}) {
  const keyboard = game.keyboard,
    input = game.pointer,
    owned = [],
    painters = [];
  const own = (thing) => (owned.push(thing), thing);
  const focusId = () => keyboard?.getSnapshot().focusedId;
  const focusShown = () => keyboard?.getSnapshot().focusVisible;

  /** A line of text in the page's fonts, made by the game, placed when its words are ready. */
  async function label(container, text, { x = 0, y = 0, size = 22, color = 0xf0e4c8, family = FONT, weight = 400, align = 'left', width } = {}) {
    const made = await game.createLabel({ text, fontSize: size, color, fontFamily: family, fontWeight: weight, locale: 'zh' });
    own({ dispose: () => made.dispose() });
    container.addChild(made.display);
    const place = () => {
      const w = made.display.width;
      made.display.x = align === 'center' ? x + ((width ?? 0) - w) / 2 : align === 'right' ? x - w : x;
      made.display.y = y;
    };
    await made.ready;
    place();
    return {
      display: made.display,
      async set(words) {
        made.text = words;
        await made.ready;
        place();
      }
    };
  }

  /** A keyboard stop on `target`, with the keys of its kind bound to its control. */
  function stop(id, target, kind, control, extra = {}) {
    if (!keyboard) return { keys: { pressed: false }, id };
    const registration = own(keyboard.registerTarget({ id, target }));
    const keys = own(createControlKeys({ keyboard, target, kind, control, ...extra }));
    return { keys, id, registration };
  }

  /**
   * A lacquered button with words on it. `onActivate` runs on a press that is released on it, on Space or
   * Enter while it holds the focus, and when assistive technology activates it.
   */
  async function button({ x, y, width = 160, height = 48, text, sub, onActivate, name = text, primary = false, container = parent, small = false, disabledAlpha = 0.45 }) {
    const id = `${prefix}-button-${++serial}`;
    const root = container.addChild(scope.use(new DisplayObjectContainer())),
      ring = root.addChild(scope.use(new Sprite())),
      face = root.addChild(scope.use(new Sprite()));
    root.x = x;
    root.y = y;
    face.touchEnabled = true;
    face.hitArea = { x: 0, y: 0, width, height };
    const words = await label(root, text, { x: 0, y: (sub ? height * 0.18 : (height - (small ? 18 : 22) * 1.25) / 2), size: small ? 18 : 22, align: 'center', width, color: primary ? 0xfff2d6 : 0xf0e4c8, weight: 600 });
    const under = sub ? await label(root, sub, { x: 0, y: height * 0.58, size: 12, align: 'center', width, color: 0xc8bba0, family: SANS }) : null;
    const state = { enabled: true };
    const action = own(createActionControl({ input, target: face, onActivate: () => (sound?.play('tap'), onActivate?.()), onPressChange: () => paint() }));
    const keyed = stop(id, face, 'action', action, { onPressChange: () => paint() });
    function paint() {
      const pressed = action.pressed || keyed.keys.pressed,
        g = face.graphics,
        focused = focusShown() && focusId() === id;
      g.clear();
      g.lineStyle(2, INK, 1);
      const top = primary ? 0xc44a3a : 0x3a4a52,
        bottom = primary ? 0x7a1e18 : 0x1e2a32;
      g.beginLinearGradientFill(0, 0, 0, height, stops([0, pressed ? bottom : top], [1, pressed ? top : bottom]))
        .drawRoundRect(0, pressed ? 2 : 0, width, height, 10, 10)
        .endFill();
      g.lineStyle(1.5, state.enabled ? GOLD : 0x6a6050, state.enabled ? 0.85 : 0.5);
      g.drawRoundRect(4, (pressed ? 2 : 0) + 4, width - 8, height - 8, 7, 7);
      g.lineStyle(0);
      ring.graphics.clear();
      if (focused) ring.graphics.lineStyle(3, 0xffe08a, 1).drawRoundRect(-4, -4, width + 8, height + 8, 14, 14).lineStyle(0);
      root.alpha = state.enabled ? 1 : disabledAlpha;
      words.display.y = (sub ? height * 0.18 : (height - (small ? 18 : 22) * 1.25) / 2) + (pressed ? 2 : 0);
    }
    painters.push(paint);
    paint();
    if (semantics)
      own(
        semantics.add({
          id,
          role: 'button',
          onActivate: () => action.enabled && (action.press(), action.release()),
          onFocus: () => keyboard?.focus(id, { visible: true }),
          describe: () => ({ name, bounds: semanticBoundsOf(face), disabled: !state.enabled, focused: focusId() === id, hidden: !root.visible || !root.parent })
        })
      );
    return {
      id,
      root,
      face,
      action,
      setText: (words2) => words.set(words2),
      setSub: (words2) => under?.set(words2),
      setEnabled(on) {
        state.enabled = on;
        action.setEnabled(on);
        keyed.registration?.update?.({ disabled: !on });
        paint();
      },
      focus: (visible = false) => keyboard?.focus(id, { visible }),
      paint
    };
  }

  /** An on/off switch with its words beside it. */
  async function toggle({ x, y, text, checked, onChange, container = parent, width = 260 }) {
    const id = `${prefix}-switch-${++serial}`;
    const root = container.addChild(scope.use(new DisplayObjectContainer())),
      face = root.addChild(scope.use(new Sprite()));
    root.x = x;
    root.y = y;
    face.touchEnabled = true;
    face.hitArea = { x: 0, y: 0, width, height: 44 };
    await label(root, text, { x: 0, y: 10, size: 20 });
    const control = own(createToggleControl({ input, target: face, checked, onChange: (on) => (sound?.play('tap'), onChange?.(on), paint()), onPressChange: () => paint() }));
    const keyed = stop(id, face, 'toggle', control, { onPressChange: () => paint() });
    function paint() {
      const g = face.graphics,
        on = control.checked,
        knob = on ? width - 26 : width - 66,
        focused = focusShown() && focusId() === id;
      g.clear();
      g.beginFill(0x000000, 0.001).drawRect(0, 0, width, 44).endFill();
      if (focused) g.lineStyle(3, 0xffe08a, 1).drawRoundRect(width - 92, 2, 88, 40, 20, 20).lineStyle(0);
      g.lineStyle(2, INK, 1);
      g.beginFill(on ? 0x3f7a6e : 0x3a3530, 1).drawRoundRect(width - 88, 6, 80, 32, 16, 16).endFill();
      g.beginRadialGradientFill(knob - 4, 18, 18, stops([0, on ? 0xfff0c0 : 0xb8b0a0], [1, on ? GOLD : 0x6a6458])).drawCircle(knob, 22, 13).endFill();
      g.lineStyle(0);
      root.alpha = control.enabled ? (control.pressed || keyed.keys.pressed ? 0.8 : 1) : 0.45;
    }
    painters.push(paint);
    paint();
    if (semantics)
      own(
        semantics.add({
          id,
          role: 'switch',
          onActivate: () => control.toggle(),
          onFocus: () => keyboard?.focus(id, { visible: true }),
          describe: () => ({ name: text, bounds: semanticBoundsOf(face), checked: control.checked, focused: focusId() === id })
        })
      );
    return { id, control, paint };
  }

  /** A horizontal slider: a track of `length`, its thumb drawn at the value. */
  async function slider({ x, y, length = 220, min = 0, max = 100, step = 1, value, text, onChange, container = parent }) {
    const id = `${prefix}-slider-${++serial}`;
    const root = container.addChild(scope.use(new DisplayObjectContainer())),
      track = root.addChild(scope.use(new Sprite())),
      thumb = root.addChild(scope.use(new Sprite()));
    root.x = x;
    root.y = y;
    track.touchEnabled = true;
    track.hitArea = { x: -12, y: -16, width: length + 24, height: 32 };
    const caption = text ? await label(root, text, { x: 0, y: -40, size: 18, color: 0xe8d8b0 }) : null;
    const control = own(createRangeControl({ input, target: track, length, min, max, step, value, onChange: (v) => (onChange?.(v), paint()), onDragChange: () => paint() }));
    stop(id, track, 'range', control, { page: 10 });
    function paint() {
      const g = track.graphics,
        at = control.fraction * length,
        focused = focusShown() && focusId() === id;
      g.clear();
      g.beginFill(0x000000, 0.001).drawRect(-12, -16, length + 24, 32).endFill();
      if (focused) g.lineStyle(3, 0xffe08a, 1).drawRoundRect(-10, -12, length + 20, 24, 12, 12).lineStyle(0);
      g.lineStyle(2, INK, 1).beginFill(0x2a2420, 0.9).drawRoundRect(0, -6, length, 12, 6, 6).endFill().lineStyle(0);
      g.beginLinearGradientFill(0, 0, length, 0, stops([0, 0x6a8a50], [0.6, GOLD], [1, LACQUER])).drawRoundRect(1, -5, Math.max(2, at - 1), 10, 5, 5).endFill();
      const t = thumb.graphics;
      t.clear();
      t.lineStyle(2, INK, 1).beginRadialGradientFill(-3, -3, 14, stops([0, 0xfff2cc], [1, control.dragging ? LACQUER : GOLD])).drawCircle(0, 0, control.dragging ? 13 : 11).endFill().lineStyle(0);
      thumb.x = at;
    }
    painters.push(paint);
    paint();
    if (semantics)
      own(
        semantics.add({
          id,
          role: 'slider',
          onFocus: () => keyboard?.focus(id, { visible: true }),
          describe: () => ({ name: text ?? '力度', bounds: semanticBoundsOf(track), range: { min, max, now: control.value }, focused: focusId() === id })
        })
      );
    return { id, control, paint, caption, root };
  }

  /** A panel of paper and lacquer behind a part of the screen. */
  function panel({ x, y, width, height, container = parent, alpha = 0.92 }) {
    const sprite = container.addChild(scope.use(new Sprite())),
      g = sprite.graphics;
    sprite.x = x;
    sprite.y = y;
    g.lineStyle(3, INK, 1);
    g.beginLinearGradientFill(0, 0, 0, height, stops([0, 0x2a2622, alpha], [1, 0x14110e, alpha])).drawRoundRect(0, 0, width, height, 16, 16).endFill();
    g.lineStyle(1.5, GOLD, 0.6).drawRoundRect(8, 8, width - 16, height - 16, 10, 10).lineStyle(0);
    for (const [cx, cy] of [[14, 14], [width - 14, 14], [14, height - 14], [width - 14, height - 14]]) g.beginFill(LACQUER, 1).drawCircle(cx, cy, 4).endFill();
    return sprite;
  }

  return {
    label,
    button,
    toggle,
    slider,
    panel,
    own,
    /** Paint every part again, as the focus moves. */
    repaint: () => painters.forEach((paint) => paint()),
    dispose() {
      for (const thing of owned.reverse()) {
        try {
          if (typeof thing.remove === 'function') thing.remove();
          else thing.dispose();
        } catch {
          /* a part already gone with its screen */
        }
      }
      owned.length = 0;
      painters.length = 0;
    }
  };
}
