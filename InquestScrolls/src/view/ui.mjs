// 界面部件：宣纸面板、按钮、词签、朱印、提示条，以及键盘与手柄的焦点。全部用引擎画在画布上，不用网页元素，
// 所以同一套界面也能在只有一块画布的小游戏里显示。
// Interface parts: paper panels, buttons, word slips, the red seal, toasts, and keyboard and gamepad focus. All of it
// is drawn by the engine on the canvas, with no page elements, so the same interface shows in a mini game that has
// one canvas and nothing else.
import { Sprite } from '@egret/engine';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { KINDS } from '../sim/kinds.mjs';
import { INK, PAPER, VERMILION } from './type.mjs';

export const WOOD = 0x3b2a1c;
export const RULE = 0x6b5236;
export const FAINT = 0x8a7a62;

/** The children of a container, as a list that stays put while they are removed. */
export function kids(container) {
  const out = [];
  for (let i = 0; i < container.numChildren; i++) out.push(container.getChildAt(i));
  return out;
}

/** Place a display object and return it. */
export function at(node, x, y) {
  node.x = x;
  node.y = y;
  return node;
}

/** A sprite with a transparent hit area of the given size, so taps land on it. */
export function hitBox(sprite, x, y, w, h) {
  sprite.graphics.beginFill(0xffffff, 0.001).drawRect(x, y, w, h).endFill();
  return sprite;
}

/** Whether a sprite is on the stage and nothing above it is hidden. */
export function shown(sprite) {
  for (let n = sprite; n; n = n.parent) if (n.isDisposed || !n.visible || n.alpha === 0) return false;
  return true;
}

/**
 * The interface parts. `semantics` (a tree made by createUiSemantics) gets a node for every button, so a screen reader
 * names it and can press it; `focused(sprite)` says whether the game's focus is on a sprite.
 */
export function createKit(game, type, sound, { semantics = null, focused = () => false } = {}) {
  let made = 0;
  /** A paper panel with a double ruled border. */
  function panel(parent, x, y, w, h, opts = {}) {
    const s = new Sprite();
    s.x = x;
    s.y = y;
    const g = s.graphics;
    if (opts.shadow !== false) g.beginFill(0x000000, 0.18).drawRect(6, 8, w, h).endFill();
    g.beginFill(opts.fill ?? PAPER, opts.alpha ?? 0.98).drawRect(0, 0, w, h).endFill();
    g.lineStyle(2, RULE, 0.9).drawRect(6, 6, w - 12, h - 12);
    g.lineStyle(1, RULE, 0.6).drawRect(10, 10, w - 20, h - 20);
    g.lineStyle(0, 0, 0);
    parent.addChild(s);
    s.panelWidth = w;
    s.panelHeight = h;
    return s;
  }

  /** A dimming veil that swallows taps behind an overlay. */
  function veil(parent, alpha = 0.45, onTap) {
    const s = new Sprite();
    s.graphics.beginFill(0x120d08, alpha).drawRect(-2000, -2000, 6000, 6000).endFill();
    parent.addChild(s);
    game.onTap(s, () => onTap?.());
    return s;
  }

  /**
   * A button: ink-ruled paper, or vermilion when primary. `onTap` runs on a tap, Enter or the gamepad's A while it
   * has focus. Returns the sprite with setText, setEnabled and its focus record.
   */
  function button(parent, text, { x, y, w = 180, h = 54, primary = false, size = 24, brush = true } = {}, onTap) {
    const s = new Sprite();
    s.x = x;
    s.y = y;
    parent.addChild(s);
    let enabled = true;
    const face = new Sprite();
    s.addChild(face);
    const draw = (hot) => {
      const g = face.graphics;
      g.clear();
      const fill = !enabled ? 0xd9cfbd : primary ? VERMILION : hot ? 0xfff8e8 : PAPER;
      g.beginFill(fill, 0.98).drawRect(-w / 2, -h / 2, w, h).endFill();
      g.lineStyle(2, primary ? 0x6e1d16 : RULE, enabled ? 1 : 0.4).drawRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
      g.lineStyle(0, 0, 0);
    };
    draw(false);
    const words = type.label(s, text, { size, colour: primary ? PAPER : INK, brush, align: 'center', middle: true });
    // Only a sprite's own drawing is hit, never its children's: the button keeps a clear box of its own size.
    hitBox(s, -w / 2, -h / 2, w, h);
    const press = () => {
      if (!enabled) return;
      sound?.play('tap');
      onTap?.();
    };
    game.onTap(s, press);
    let name = String(text);
    if (semantics) {
      const node = semantics.add({
        id: `button-${++made}`,
        role: 'button',
        onActivate: press,
        describe: () =>
          s.isDisposed
            ? { name: name || '·', bounds: { x: 0, y: 0, width: 0, height: 0 }, hidden: true }
            : { name: name.replace(/^✓\s*/, '') || '·', bounds: semanticBoundsOf(s), disabled: !enabled, hidden: !shown(s), focused: focused(s) }
      });
      s.dropSemantic = () => node.remove();
    }
    s.setText = (t) => {
      name = String(t);
      words.setText(t);
    };
    s.setEnabled = (on) => {
      enabled = !!on;
      draw(false);
      words.setColour(enabled ? (primary ? PAPER : INK) : FAINT);
    };
    s.setHot = (hot) => draw(hot);
    s.focusRecord = { sprite: s, w, h, activate: () => enabled && (sound?.play('tap'), onTap?.()) };
    s.buttonWidth = w;
    return s;
  }

  /**
   * A word slip: a narrow band in the colour of its kind with the kind's character, and the word. Returns the
   * sprite; its width is `slipWidth`.
   */
  function slip(parent, word, lang, { size = 20, hot = false } = {}) {
    const kind = KINDS[word.kind];
    const s = new Sprite();
    parent?.addChild(s);
    const text = word[lang];
    const textW = Math.ceil(estimateWidth(text, size));
    const w = textW + 46,
      h = size + 18;
    s.graphics.beginFill(hot ? 0xfffaf0 : PAPER, 1).drawRect(0, 0, w, h).endFill();
    s.graphics.beginFill(kind.colour, 1).drawRect(0, 0, 26, h).endFill();
    s.graphics.lineStyle(1.5, kind.colour, 0.9).drawRect(0, 0, w, h);
    s.graphics.lineStyle(0, 0, 0);
    at(type.label(s, kind.zh, { size: 15, colour: PAPER, brush: true, align: 'center', middle: true }), 13, h / 2);
    const l = type.label(s, text, { size, colour: INK, middle: true, locale: lang });
    l.x = 34;
    l.y = h / 2;
    s.slipWidth = w;
    s.slipHeight = h;
    return s;
  }

  /** A red seal stamped with two characters, drawn in code. */
  function seal(parent, x, y, size, chars = '核实') {
    const s = new Sprite();
    s.x = x;
    s.y = y;
    parent.addChild(s);
    const g = s.graphics;
    g.beginFill(VERMILION, 0.92).drawRect(-size / 2, -size / 2, size, size).endFill();
    g.lineStyle(Math.max(2, size * 0.05), PAPER, 0.9).drawRect(-size / 2 + size * 0.09, -size / 2 + size * 0.09, size * 0.82, size * 0.82);
    g.lineStyle(0, 0, 0);
    const [a, b] = [...chars];
    const top = type.label(s, a, { size: size * 0.34, colour: PAPER, brush: true, align: 'center', middle: true });
    top.y = -size * 0.17;
    const bottom = type.label(s, b ?? '', { size: size * 0.34, colour: PAPER, brush: true, align: 'center', middle: true });
    bottom.y = size * 0.19;
    s.rotation = -6;
    return s;
  }

  /** Stamp a seal with a drop and a thud. */
  function stamp(parent, x, y, size, chars) {
    const s = seal(parent, x, y, size, chars);
    if (game.reducedMotion) return s;
    s.scaleX = s.scaleY = 1.8;
    s.alpha = 0;
    game.tween(s).to({ scaleX: 1, scaleY: 1, alpha: 1 }, 0.22, 'quadIn').call(() => sound?.play('seal'));
    return s;
  }

  let toasts = [];
  /** A strip of paper with a line of words that fades after a while. */
  function toast(text, { seconds = 2.2, colour = INK } = {}) {
    const s = new Sprite();
    game.ui.addChild(s);
    const w = Math.min(game.width - 40, estimateWidth(text, 22) + 60);
    s.graphics.beginFill(PAPER, 0.97).drawRect(-w / 2, 0, w, 46).endFill();
    s.graphics.beginFill(VERMILION, 1).drawRect(-w / 2, 0, 6, 46).endFill();
    s.graphics.lineStyle(1, RULE, 0.8).drawRect(-w / 2, 0, w, 46);
    type.label(s, text, { size: 22, colour, align: 'center', middle: true }).y = 23;
    s.x = game.width / 2;
    toasts = toasts.filter((t) => !t.isDisposed);
    s.y = 74 + toasts.length * 54;
    toasts.push(s);
    s.alpha = 0;
    game.tween(s).to({ alpha: 1 }, 0.15).wait(seconds).to({ alpha: 0 }, 0.4).call(() => type.discard(s));
    return s;
  }

  return { panel, veil, button, slip, seal, stamp, toast };
}

/** A rough width of a line before the browser has measured it: CJK one em, Latin about half. */
export function estimateWidth(text, size) {
  let w = 0;
  for (const ch of String(text)) w += /[⺀-￯]/.test(ch) ? size : /[A-Z]/.test(ch) ? size * 0.66 : /[il.,'’ ]/.test(ch) ? size * 0.3 : size * 0.52;
  return w;
}

/**
 * Keyboard and gamepad focus over a list of records `{ sprite, w, h, activate }`, ringed in vermilion. Arrows and
 * Tab move; Enter, Space or the gamepad's A activates.
 */
export function createFocus(game, layer) {
  let items = [],
    index = -1;
  const ring = new Sprite();
  layer.addChild(ring);
  const draw = () => {
    ring.graphics.clear();
    const it = items[index];
    if (!it || it.sprite.isDisposed || !game.focusVisible) return;
    const p = it.sprite.localToGlobal ? it.sprite.localToGlobal(0, 0) : { x: it.sprite.x, y: it.sprite.y };
    const ox = it.ox ?? -it.w / 2,
      oy = it.oy ?? -it.h / 2;
    ring.graphics.lineStyle(3, VERMILION, 1).drawRect(p.x + ox - 5, p.y + oy - 5, it.w + 10, it.h + 10);
    ring.graphics.lineStyle(0, 0, 0);
  };
  return {
    set(list, keep = false, start = 0) {
      const was = items[index];
      items = list.filter(Boolean);
      index = keep && was ? Math.max(0, items.indexOf(was)) : items.length ? Math.min(start, items.length - 1) : -1;
      draw();
    },
    move(step) {
      if (!items.length) return;
      index = (index + step + items.length) % items.length;
      draw();
    },
    activate() {
      items[index]?.activate();
    },
    current: () => items[index],
    redraw: draw,
    clear() {
      items = [];
      index = -1;
      draw();
    }
  };
}
