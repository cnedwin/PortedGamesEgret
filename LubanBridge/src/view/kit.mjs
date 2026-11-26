// 界面零件：颜色、面板、按钮、焦点框。每个按钮在语义树里有一个节点，读屏软件能念出来、能按；
// 键盘和手柄用焦点框在按钮之间走。按钮自己画一块透明的命中区：引擎的点按只认节点自己的绘制。
// Interface parts: colours, panels, buttons and the focus ring. Every button has a node in the semantic tree, so a
// screen reader can name it and press it; keys and gamepads walk between buttons with the focus ring. A button draws a
// clear hit area of its own: the engine's taps land only on a node's own drawing.
import { Sprite } from '@egret/engine';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';

/** The palette of a painting on silk: aged silk, ink, azurite blue, malachite green, cinnabar. */
export const C = {
  silk: 0xe6d8b8,
  silkDeep: 0xcdb98f,
  ink: 0x2b2621,
  inkSoft: 0x5d5347,
  azurite: 0x2f6f8f,
  malachite: 0x4e8b6a,
  cinnabar: 0xb8432f,
  gold: 0xc59a3c,
  water: 0x7fa6a3,
  sky: 0xd9d2b6,
  dusk: 0x9fb3ad,
  white: 0xf7f1e3
};

/** A sprite with a nearly clear rectangle, so taps land on it. */
export function hitBox(sprite, x, y, w, h) {
  sprite.graphics.beginFill(0xffffff, 0.001).drawRect(x, y, w, h).endFill();
  return sprite;
}

/** Whether a sprite and all above it are shown. */
export function shown(sprite) {
  for (let n = sprite; n; n = n.parent) if (n.isDisposed || !n.visible || n.alpha === 0) return false;
  return true;
}

/** A silk panel with an ink rule inside its edge. */
export function panel(parent, x, y, w, h, { fill = C.silk, alpha = 0.97, rule = C.inkSoft } = {}) {
  const p = new Sprite();
  p.x = x;
  p.y = y;
  p.graphics.beginFill(fill, alpha).drawRect(0, 0, w, h).endFill();
  p.graphics.lineStyle(1.5, rule, 0.8).drawRect(5, 5, w - 10, h - 10);
  p.graphics.lineStyle(0, 0, 0);
  parent.addChild(p);
  return p;
}

/**
 * The parts of a screen. `semantics`: the tree buttons go into. `focused(sprite)`: whether the focus is on it.
 * Everything made is a child of a layer, and `game.remove` of the layer takes it all, labels with it.
 */
export function createKit(game, sound, { semantics, focused = () => false }) {
  let made = 0;
  const text = (parent, words, { x = 0, y = 0, size = 22, color = C.ink, align = 'left', baseline = 'top', bold = false, vertical } = {}) =>
    game.text(String(words), { x, y, size, color, align, baseline, bold, layer: parent, ...(vertical ? { vertical } : {}) });

  /** A button whose middle is at (x, y). `kind`: 'plain', 'primary' (cinnabar) or 'quiet' (no fill). */
  function button(parent, words, { x, y, w = 200, h = 52, size, kind = 'plain', name } = {}, onTap) {
    // On a tall screen (a phone held upright) the stage is shrunk most: a button is then at least 84 stage units, so
    // it is 44 CSS pixels or more on a 390-pixel-wide phone.
    if (game.height > game.width) {
      h = Math.max(h, 84);
      w = Math.max(w, 82);
    }
    size ??= Math.round(Math.min(h, 60) * 0.42);
    const s = new Sprite();
    s.x = x;
    s.y = y;
    parent.addChild(s);
    const face = new Sprite();
    s.addChild(face);
    let enabled = true,
      on = false,
      hot = false;
    const paint = () => {
      const g = face.graphics;
      g.clear();
      const fill = !enabled ? 0xd8ccb2 : kind === 'primary' ? C.cinnabar : on ? C.azurite : hot ? C.white : kind === 'quiet' ? C.silk : C.silk;
      g.beginFill(fill, kind === 'quiet' && !on && !hot ? 0.55 : 0.97).drawRect(-w / 2, -h / 2, w, h).endFill();
      g.lineStyle(1.5, kind === 'primary' || on ? C.ink : C.inkSoft, enabled ? 0.9 : 0.35).drawRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
      g.lineStyle(0, 0, 0);
    };
    paint();
    const label = text(s, words, { size, color: kind === 'primary' ? C.white : C.ink, align: 'center', baseline: 'middle' });
    const recolor = () => (label.color = !enabled ? 0x8f8577 : kind === 'primary' || on ? C.white : C.ink);
    hitBox(s, -w / 2, -h / 2, w, h);
    const press = () => {
      if (!enabled) return;
      sound?.play('tap');
      onTap?.();
    };
    game.onTap(s, press);
    let spoken = name ?? String(words);
    const node = semantics.add({
      id: `button-${++made}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'button',
      onActivate: press,
      describe: () =>
        s.isDisposed
          ? { name: spoken || '·', bounds: { x: 0, y: 0, width: 0, height: 0 }, hidden: true }
          : { name: spoken || '·', bounds: semanticBoundsOf(s), disabled: !enabled, hidden: !shown(s), focused: focused(s), ...(on ? { pressed: true } : {}) }
    });
    s.dropSemantic = () => node.remove();
    s.setText = (t, spokenName) => {
      label.text = String(t);
      spoken = spokenName ?? String(t);
    };
    s.setEnabled = (value) => {
      enabled = !!value;
      paint();
      recolor();
    };
    s.setOn = (value) => {
      on = !!value;
      paint();
      recolor();
    };
    s.setHot = (value) => {
      if (hot === !!value) return;
      hot = !!value;
      paint();
    };
    s.focusRecord = { sprite: s, w, h, activate: press };
    s.label = label;
    return s;
  }

  /** A label the semantic tree reads as plain text (a heading or a line of status). */
  function spoken(parent, words, options = {}, role = 'text') {
    const t = text(parent, words, options);
    let said = String(words);
    const node = semantics.add({
      id: `text-${++made}-${Math.random().toString(36).slice(2, 7)}`,
      role,
      describe: () => (t.isDisposed ? { name: said, bounds: { x: 0, y: 0, width: 0, height: 0 }, hidden: true } : { name: said, bounds: semanticBoundsOf(t), hidden: !shown(t) })
    });
    t.dropSemantic = () => node.remove();
    t.say = (w) => {
      said = String(w);
      t.text = said;
    };
    return t;
  }

  /** Take a layer down: its semantic nodes first, then the sprites and labels. */
  function drop(layer) {
    const walk = (n) => {
      n.dropSemantic?.();
      for (let i = 0; i < (n.numChildren ?? 0); i++) walk(n.getChildAt(i));
    };
    walk(layer);
    game.remove(layer);
  }

  return { text, button, spoken, drop, panel: (parent, x, y, w, h, o) => panel(parent, x, y, w, h, o) };
}

/** The focus ring: a cinnabar frame round the part the keyboard or gamepad is on, drawn again only when it moves. */
export function createFocus(game, layer) {
  let items = [],
    index = -1,
    drawn = '';
  const ring = new Sprite();
  layer.addChild(ring);
  const draw = () => {
    const it = items[index];
    const p = it && !it.sprite.isDisposed && game.focusVisible ? it.sprite.localToGlobal(0, 0) : null;
    const q = p ? layer.globalToLocal(p.x, p.y) : null;
    const key = q ? `${Math.round(q.x)},${Math.round(q.y)},${it.w},${it.h}` : '';
    if (key === drawn) return;
    drawn = key;
    ring.graphics.clear();
    if (!q) return;
    ring.graphics.lineStyle(3, C.cinnabar, 1).drawRect(q.x - it.w / 2 - 5, q.y - it.h / 2 - 5, it.w + 10, it.h + 10);
    ring.graphics.lineStyle(0, 0, 0);
    game.invalidate?.();
  };
  return {
    set(list, keep = false, start = 0) {
      const was = items[index];
      items = list.filter((x) => x && !x.sprite.isDisposed);
      index = keep && was && items.includes(was) ? items.indexOf(was) : items.length ? Math.min(start, items.length - 1) : -1;
      draw();
    },
    move(step) {
      if (!items.length) return;
      index = (index + step + items.length) % items.length;
      draw();
    },
    activate: () => items[index]?.activate(),
    current: () => items[index],
    redraw: draw,
    get ring() {
      return ring;
    }
  };
}
