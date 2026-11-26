// 界面零件：按钮、开关、滑条、单选和文字。状态由引擎的界面控件持有（createActionControl 按下、createToggleControl
// 开关、createRangeControl 取值、createSelectionGroup 选中），键位由 createControlKeys 绑定，读屏器看到的是引擎
// 语义树里的节点；这里只负责画出每个状态。新游戏改这里的配色和形状就能换一身皮。
// The parts of the interface: buttons, switches, sliders, choices and text. Their state is held by the engine's
// controls (`createActionControl` pressed, `createToggleControl` on or off, `createRangeControl` a value,
// `createSelectionGroup` the chosen one), their keys are bound by `createControlKeys`, and what a screen reader finds is
// a node of the engine's semantic tree. This file only paints each state; a new game changes its colours and shapes here.
import { DisplayObjectContainer, Sprite } from '@egret/engine';
import { createActionControl, createControlKeys, createRangeControl, createSelectionGroup, createToggleControl } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';

// In a compact landscape viewport the stage is scaled to about 60%, so 76 units give a 45 px target.
export const LANDSCAPE_TOUCH_BUTTON_HEIGHT = 76;
/** The palette of a painter's desk: rosewood, gold leaf, cinnabar for the main button, malachite for what is on, paper. */
export const INK = 0x140b06,
  NIGHT = 0x2a1810,
  AMBER = 0xe2b866,
  RED = 0xb8402c,
  TEAL = 0x3c8a68,
  PAPER = 0xf3ead6;
const GOLD = AMBER,
  LACQUER = RED;
const BUTTON_TONES = {
  cinnabar: { top: 0x973e31, bottom: 0x64291f, edge: 0xf2c57c },
  jade: { top: 0x315e50, bottom: 0x213d32, edge: 0x8ab9a1 },
  indigo: { top: 0x3d5062, bottom: 0x283543, edge: 0x9ab8cd },
  gold: { top: 0x655032, bottom: 0x46351f, edge: 0xe4bc7c },
  ink: { top: 0x342d28, bottom: 0x211b17, edge: 0xcbac7d }
};

export const FONT = '"Noto Serif SC", "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", serif';
export const SANS = '"Noto Sans SC", "Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", "Source Han Sans SC", sans-serif';

const stops = (...pairs) => pairs.map(([offset, color, alpha = 1]) => ({ offset, color, alpha }));
let serial = 0;

/**
 * The parts of one screen. Everything made through it is let go together when the screen closes:
 * controls, key bindings, keyboard stops, semantic nodes and labels.
 */
export function createScreenKit(game, scope, { semantics, sound, parent = game.stage, prefix = 'ui', semanticParent, locale = 'zh' } = {}) {
  const keyboard = game.keyboard,
    input = game.pointer,
    owned = [],
    painters = [];
  const own = (thing) => (owned.push(thing), thing);
  const focusId = () => keyboard?.getSnapshot().focusedId;
  const focusShown = () => keyboard?.getSnapshot().focusVisible;

  /** A line of text in the page's fonts, made by the game, placed when its words are ready. */
  async function label(container, text, { x = 0, y = 0, size = 22, color = 0xf0e4c8, family = FONT, weight = 400, align = 'left', width, lineHeight } = {}) {
    const made = await game.createLabel({ text, fontSize: size, color, fontFamily: family, fontWeight: weight, locale, ...(lineHeight ? { lineHeight } : {}) });
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
  async function button({
    x, y, width = 160, height = 48, text, sub, onActivate, name = text, primary = false,
    tone = primary ? 'cinnabar' : 'ink', leading = 0, align = 'center', container = parent, small = false, disabledAlpha = 0.60
  }) {
    const id = `${prefix}-button-${++serial}`;
    const root = container.addChild(scope.use(new DisplayObjectContainer())),
      ring = root.addChild(scope.use(new Sprite())),
      face = root.addChild(scope.use(new Sprite()));
    root.x = x;
    root.y = y;
    face.touchEnabled = true;
    face.hitArea = { x: 0, y: 0, width, height };
    const palette = BUTTON_TONES[tone],
      labelX = leading + (align === 'left' ? 18 : 0),
      labelWidth = width - labelX,
      titleSize = small ? 18 : 22,
      titleY = sub ? height * 0.14 : (height - titleSize * 1.25) / 2,
      subY = height * 0.59;
    const words = await label(root, text, { x: labelX, y: titleY, size: titleSize, align, width: labelWidth, color: 0xfff2da, weight: 700 });
    const under = sub ? await label(root, sub, { x: labelX, y: subY, size: 13, align, width: labelWidth, color: 0xe7d5ba, family: SANS }) : null;
    const arrow = align === 'left'
      ? await label(root, '›', { x: width - 18, y: (height - 30) / 2, size: 23, align: 'right', color: palette.edge, family: SANS })
      : null;
    const state = { enabled: true };
    const action = own(createActionControl({ input, target: face, onActivate: () => {
        sound?.play('tap');
        void onActivate?.();
      }, onPressChange: () => paint() }));
    const keyed = stop(id, face, 'action', action, { onPressChange: () => paint() });
    function paint() {
      const pressed = action.pressed || keyed.keys.pressed,
        g = face.graphics,
        focused = focusShown() && focusId() === id;
      g.clear();
      const inset = pressed ? 2 : 0;
      g.lineStyle(0).beginFill(0x090807, 0.45).drawRoundRect(leading, 3, width - leading, height, 10, 10).endFill();
      g.lineStyle(1, palette.edge, state.enabled ? 0.65 : 0.35);
      g.beginLinearGradientFill(0, 0, 0, height, stops([0, pressed ? palette.bottom : palette.top], [1, pressed ? palette.top : palette.bottom]))
        .drawRoundRect(leading, inset, width - leading, height, 10, 10)
        .endFill();
      g.lineStyle(0).beginFill(palette.edge, 0.32).drawRect(leading + 12, inset + 2, width - leading - 24, 1).endFill();
      ring.graphics.clear();
      if (focused) ring.graphics.lineStyle(3, 0xffe08a, 1).drawRoundRect(-4, -4, width + 8, height + 8, 14, 14).lineStyle(0);
      root.alpha = state.enabled ? 1 : disabledAlpha;
      words.display.y = titleY + inset;
      if (under) under.display.y = subY + inset;
      if (arrow) arrow.display.visible = state.enabled;
    }
    painters.push(paint);
    paint();
    if (semantics)
      own(
        semantics.add({
          id,
          ...(semanticParent ? { parent: semanticParent } : {}),
          role: 'button',
          onActivate: () => action.enabled && (action.press(), action.release()),
          onFocus: () => keyboard?.focus(id, { visible: true }),
          describe: () => ({ name, bounds: semanticBoundsOf(face), disabled: !state.enabled, focused: focusId() === id, hidden: !root.visible || !root.parent?.visible })
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
      g.beginFill(on ? TEAL : 0x3a2a20, 1).drawRoundRect(width - 88, 6, 80, 32, 16, 16).endFill();
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
          ...(semanticParent ? { parent: semanticParent } : {}),
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
      g.lineStyle(2, INK, 1).beginFill(0x2a1a10, 0.9).drawRoundRect(0, -6, length, 12, 6, 6).endFill().lineStyle(0);
      g.beginLinearGradientFill(0, 0, length, 0, stops([0, TEAL], [0.6, GOLD], [1, LACQUER])).drawRoundRect(1, -5, Math.max(2, at - 1), 10, 5, 5).endFill();
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
          ...(semanticParent ? { parent: semanticParent } : {}),
          role: 'slider',
          onFocus: () => keyboard?.focus(id, { visible: true }),
          describe: () => ({ name: text ?? '', bounds: semanticBoundsOf(track), range: { min, max, now: control.value }, focused: focusId() === id })
        })
      );
    return { id, control, paint, caption, root };
  }

  /**
   * One of several, side by side: a segmented control over the engine's selection group. `options` are
   * `[key, words]`; arrows move the choice while it holds the focus.
   */
  async function choice({ x, y, text, options, selected, onChange, container = parent, width = 420, height = 44 }) {
    const id = `${prefix}-choice-${++serial}`;
    const root = container.addChild(scope.use(new DisplayObjectContainer())),
      strip = root.addChild(scope.use(new Sprite()));
    root.x = x;
    root.y = y;
    if (text) await label(root, text, { x: 0, y: -34, size: 18, color: 0xe8d8b0 });
    const each = width / options.length,
      faces = [];
    for (const [index, [key, words]] of options.entries()) {
      const face = root.addChild(scope.use(new Sprite()));
      face.x = index * each;
      face.touchEnabled = true;
      face.hitArea = { x: 0, y: 0, width: each, height };
      const made = await label(root, words, { x: index * each, y: (height - 22) / 2, size: 17, align: 'center', width: each, family: SANS });
      faces.push({ key, face, words: made });
    }
    strip.hitArea = { x: 0, y: 0, width, height };
    const group = own(
      createSelectionGroup({
        input,
        items: faces.map(({ key, face }) => ({ key, target: face })),
        selected,
        wrap: false,
        onChange: (key) => (sound?.play('tap'), onChange?.(key), paint())
      })
    );
    if (keyboard) {
      own(keyboard.registerTarget({ id, target: strip }));
      own(createControlKeys({ keyboard, target: strip, kind: 'selection', control: group, orientation: 'horizontal' }));
    }
    function paint() {
      const focused = focusShown() && focusId() === id;
      for (const { key, face } of faces) {
        const g = face.graphics,
          on = group.selected === key;
        g.clear();
        g.lineStyle(2, INK, 1).beginFill(on ? TEAL : 0x2e1c12, on ? 1 : 0.85).drawRoundRect(2, 0, each - 4, height, 10, 10).endFill();
        if (on) g.lineStyle(1.5, GOLD, 0.9).drawRoundRect(5, 3, each - 10, height - 6, 7, 7);
        g.lineStyle(0);
      }
      strip.graphics.clear();
      if (focused) strip.graphics.lineStyle(3, 0xffe08a, 1).drawRoundRect(-4, -4, width + 8, height + 8, 14, 14).lineStyle(0);
    }
    painters.push(paint);
    paint();
    if (semantics)
      own(
        semantics.add({
          id,
          ...(semanticParent ? { parent: semanticParent } : {}),
          role: 'radiogroup',
          onFocus: () => keyboard?.focus(id, { visible: true }),
          describe: () => ({ name: `${text ?? ''} ${options.find(([key]) => key === group.selected)?.[1] ?? ''}`.trim(), bounds: semanticBoundsOf(strip), focused: focusId() === id })
        })
      );
    return { id, group, paint };
  }

  /** A panel of paper and lacquer behind a part of the screen. */
  function panel({ x, y, width, height, container = parent, alpha = 0.92 }) {
    const sprite = container.addChild(scope.use(new Sprite())),
      g = sprite.graphics;
    sprite.x = x;
    sprite.y = y;
    g.lineStyle(3, INK, 1);
    g.beginLinearGradientFill(0, 0, 0, height, stops([0, 0x3e2416, alpha], [1, 0x1e110a, alpha])).drawRoundRect(0, 0, width, height, 16, 16).endFill();
    g.lineStyle(1.5, GOLD, 0.6).drawRoundRect(8, 8, width - 16, height - 16, 10, 10).lineStyle(0);
    g.beginFill(GOLD, 0.9).drawRect(20, 0, width - 40, 4).endFill();
    return sprite;
  }

  return {
    label,
    button,
    toggle,
    slider,
    panel,
    choice,
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
