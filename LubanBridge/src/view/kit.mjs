// 界面零件：颜色、面板、按钮、焦点框。每个按钮在语义树里有一个节点，读屏软件能念出来、能按；
// 键盘和手柄用焦点框在按钮之间走。按钮自己画一块透明的命中区：引擎的点按只认节点自己的绘制。
// Interface parts: colours, panels, buttons and the focus ring. Every button has a node in the semantic tree, so a
// screen reader can name it and press it; keys and gamepads walk between buttons with the focus ring. A button draws a
// clear hit area of its own: the engine's taps land only on a node's own drawing.
import { Sprite } from '@egret/engine';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';

/** The palette of a painting on silk: aged silk, ink, azurite blue, malachite green, cinnabar. */
export const C = {
  silk: 0xf0e4c7,
  silkDeep: 0xcdb890,
  ink: 0x20352f,
  inkSoft: 0x506258,
  azurite: 0x256779,
  malachite: 0x497c5d,
  cinnabar: 0xa73529,
  gold: 0xc3a164,
  water: 0x7fa6a3,
  sky: 0xd9d2b6,
  dusk: 0x9fb3ad,
  white: 0xfff6de
};

/** Touch screens held sideways need more design units for each comfortable physical target. */
export function landscapeTouchSize(game) {
  if (game.height >= game.width || !globalThis.matchMedia?.('(pointer: coarse)')?.matches) return 0;
  const r = game.canvas?.getBoundingClientRect?.();
  const scale = r?.width && r?.height ? Math.min(r.width/game.width,r.height/game.height)
    : Math.min(globalThis.innerWidth/game.width,globalThis.innerHeight/game.height);
  return Number.isFinite(scale) && scale > 0 ? Math.min(108, Math.max(60, Math.ceil(44/scale))) : 88;
}

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

/** Fine brass corner brackets inspired by a carpenter's bound notebook. */
export function brackets(g, x, y, w, h, tone = C.gold, alpha = 0.8) {
  const l = Math.min(14, w / 6, h / 5);
  g.lineStyle(1.6, tone, alpha);
  for (const hx of [0, 1]) for (const hy of [0, 1]) {
    const a = x + hx * w, b = y + hy * h, dx = hx ? -l : l, dy = hy ? -l : l;
    g.moveTo(a, b + dy).lineTo(a, b).lineTo(a + dx, b);
  }
  g.lineStyle(0, 0, 0);
}

/** Silk paper with a recessed brass rule and a shallow shadow. */
export function panel(parent, x, y, w, h, { fill = C.silk, alpha = 0.97, rule = C.inkSoft } = {}) {
  const p = new Sprite();
  p.x = x;
  p.y = y;
  const g = p.graphics;
  g.beginFill(C.ink, 0.21).drawRect(5, 7, w, h).endFill();
  g.beginFill(fill, alpha).drawRect(0, 0, w, h).endFill();
  g.beginFill(C.silkDeep, 0.25).drawRect(0, 0, w, 7).drawRect(0, h - 7, w, 7).endFill();
  g.lineStyle(1, rule, 0.65).drawRect(4, 4, w - 8, h - 8);
  g.lineStyle(0.7, C.gold, 0.6).drawRect(8, 8, w - 16, h - 16);
  brackets(g, 11, 11, w - 22, h - 22);
  g.lineStyle(0, 0, 0);
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
  function button(parent, words, { x, y, w = 200, h = 52, size, kind = 'plain', name, swatch } = {}, onTap) {
    // On a tall screen (a phone held upright) the stage is shrunk most: a button is then at least 84 stage units, so
    // it is 44 CSS pixels or more on a 390-pixel-wide phone.
    if (game.height > game.width) {
      h = Math.max(h, 84);
      w = Math.max(w, 82);
    } else {
      const target = landscapeTouchSize(game);
      if (target) {
        h = Math.max(h,target);
        w = Math.max(w,target);
      }
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
      const x = -w / 2, y = -h / 2, active = kind === 'primary' || on;
      const fill = !enabled ? 0xd3c6aa : kind === 'primary' ? C.cinnabar : on ? C.azurite : hot ? C.white : kind === 'quiet' ? 0xeee1c0 : C.silk;
      g.beginFill(C.ink, enabled ? 0.23 : 0.08).drawRect(x+2, y+3, w-1, h-1).endFill();
      g.beginFill(fill, 0.98).drawRect(x, y, w, h).endFill();
      g.beginFill(active ? 0xf0d3a0 : C.white, enabled ? 0.21 : 0.10).drawRect(x+1, y+1, w-2, 3).endFill();
      g.beginFill(C.ink, 0.12).drawRect(x+1, y+h-4, w-2, 3).endFill();
      g.lineStyle(1, active ? C.gold : C.inkSoft, enabled ? 0.85 : 0.32).drawRect(x+1, y+1, w-2, h-2);
      g.lineStyle(0, 0, 0);
      if (swatch !== undefined && enabled) {
        g.beginFill(swatch,0.95).drawRect(x+7,y+8,4,h-16).endFill();
        g.beginFill(C.white,0.3).drawRect(x+7,y+8,1,h-16).endFill();
      }
      if (enabled) brackets(g, x+4, y+4, w-8, h-8, active ? 0xf0ce8d : C.gold, 0.85);
    };
    paint();
    const label = text(s, words, { size, color: kind === 'primary' ? C.white : C.ink, align: 'center', baseline: 'middle', bold: kind === 'primary' });
    const recolor = () => (label.color = !enabled ? 0x7c7766 : kind === 'primary' || on ? C.white : C.ink);
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
    const p = it && shown(it.sprite) && game.focusVisible ? it.sprite.localToGlobal(0, 0) : null;
    const q = p ? layer.globalToLocal(p.x, p.y) : null;
    const key = q ? `${Math.round(q.x)},${Math.round(q.y)},${it.w},${it.h}` : '';
    if (key === drawn) return;
    drawn = key;
    ring.graphics.clear();
    if (!q) return;
    ring.graphics.lineStyle(2, C.cinnabar, 1).drawRect(q.x - it.w / 2 - 4, q.y - it.h / 2 - 4, it.w + 8, it.h + 8);
    brackets(ring.graphics, q.x-it.w/2-7, q.y-it.h/2-7, it.w+14, it.h+14, C.gold, 1);
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
      for (let n = 0; n < items.length; n++) {
        index = (index + step + items.length) % items.length;
        if (shown(items[index].sprite)) break;
      }
      draw();
    },
    activate: () => { if (items[index] && shown(items[index].sprite)) items[index].activate(); },
    current: () => items[index],
    redraw: draw,
    get ring() {
      return ring;
    }
  };
}
