// Interface panels. A panel is painted with ordinary canvas calls into one
// picture, shown through the engine as a bitmap, and remembers which
// rectangles of it can be tapped. Painter holds the game's visual style.
import { W, H } from './stage.mjs';
import { rrect, rgba, shade, heart, star, poly } from '../art/draw.mjs';

export const FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, sans-serif';
export const SERIF = '"Noto Serif SC", "Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", "STSong", Georgia, serif';

export const THEME = {
  ink: '#27263d', soft: '#575469', faint: '#736f83', line: '#e2d9e0',
  paper: '#fff9ee', canvas: '#181627', night: '#211c32', light: '#fff9ef',
  pink: '#e97984', rose: '#ab3656', violet: '#6554a6', sky: '#426c93',
  gold: '#a07135', mint: '#397e6c', warn: '#b85c3e',
};

/** Break text into lines no wider than maxW: CJK may break anywhere, Latin words stay whole. */
export function wrapText(g, text, maxW) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    const tokens = para.match(/[A-Za-z0-9'’\-.,!?;:"“”()…~→%¥+]+\s*|\s+|./gu) ?? [''];
    let line = '';
    for (const token of tokens) {
      if (line && g.measureText(line + token.trimEnd()).width > maxW) {
        lines.push(line.trimEnd());
        line = token.trimStart();
      } else line += token;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

/** Drawing helpers bound to one panel's canvas. */
export class Painter {
  constructor(g, panel) {
    this.g = g;
    this.panel = panel;
  }

  font(size, weight = 500, family = FONT) {
    this.g.font = `${weight} ${size}px ${family}`;
  }

  /** Draw text; returns the height used. opt: size, weight, color, align, maxW, lineH, family, shadow. */
  text(str, x, y, { size = 18, weight = 500, color = THEME.ink, align = 'left', maxW, lineH, family, stroke, alpha = 1 } = {}) {
    const g = this.g;
    this.font(size, weight, family);
    g.textAlign = align;
    g.textBaseline = 'top';
    const lines = maxW ? wrapText(g, str, maxW) : String(str).split('\n');
    const lh = lineH ?? Math.round(size * 1.45);
    g.save();
    g.globalAlpha *= alpha;
    lines.forEach((line, i) => {
      if (stroke) {
        g.lineWidth = stroke[1];
        g.strokeStyle = stroke[0];
        g.lineJoin = 'round';
        g.strokeText(line, x, y + i * lh);
      }
      g.fillStyle = color;
      g.fillText(line, x, y + i * lh);
    });
    g.restore();
    return lines.length * lh;
  }

  measure(str, size, weight = 500, family) {
    this.font(size, weight, family);
    return this.g.measureText(str).width;
  }

  /** A raised paper surface. */
  card(x, y, w, h, { r = 14, fill = rgba(THEME.paper, 0.97), stroke = THEME.line, shadow = 0.16, lineW = 1.25 } = {}) {
    const g = this.g;
    const p = rrect(x, y, w, h, Math.min(r, 18));
    g.save();
    if (shadow) {
      g.shadowColor = rgba(THEME.night, shadow);
      g.shadowBlur = 22;
      g.shadowOffsetY = 8;
    }
    g.fillStyle = fill;
    g.fill(p);
    g.restore();
    if (stroke) {
      g.lineWidth = lineW;
      g.strokeStyle = stroke;
      g.stroke(p);
    }
  }

  /** Full panel with a warm paper surface and a structured top edge. */
  sheet(x, y, w, h, { accent = THEME.rose, dark = false } = {}) {
    const g = this.g;
    const wash = g.createLinearGradient(x, y, x + w * .75, y + h);
    wash.addColorStop(0, dark ? '#302641' : '#fffbf1');
    wash.addColorStop(1, dark ? '#201a31' : '#f3ebed');
    this.card(x, y, w, h, { fill: wash, stroke: dark ? '#5b4a64' : '#e9d9dc', shadow: .28, r: 16 });
    g.save();
    g.clip(rrect(x, y, w, h, 16));
    g.fillStyle = this.gradient(x, Math.min(210, w * .5), accent, rgba(accent, 0));
    g.fillRect(x, y, w, 3);
    g.restore();
  }

  /** A recessed well for item art, lit from above. */
  well(x, y, w, h, { active = false, accent = THEME.violet } = {}) {
    const g = this.g;
    const fill = g.createRadialGradient(x + w * .52, y + h * .38, 6, x + w * .5, y + h * .52, w * .72);
    fill.addColorStop(0, active ? '#fff8ef' : '#fffbf3');
    fill.addColorStop(1, rgba(accent, active ? .14 : .09));
    this.card(x, y, w, h, { fill, shadow: 0, stroke: active ? rgba(accent, .36) : '#e7dee6', r: 10 });
  }

  /** Shared segmented control used in the wardrobe and phone. */
  segment(x, y, w, h, label, on, tap, { size = 16 } = {}) {
    const g = this.g;
    g.fillStyle = on ? '#34304c' : '#ede5eb';
    g.fill(rrect(x, y, w, h, 9));
    this.text(label, x + w / 2, y + (h - size * 1.22) / 2, { size, weight: 750, color: on ? THEME.light : THEME.soft, align: 'center' });
    if (on) {
      g.fillStyle = '#eda4ad';
      g.fill(rrect(x + w / 2 - 11, y + h - 3, 22, 2, 1));
    }
    this.hit(x, y, w, h, tap, { r: 9 });
  }

  /** Left-to-right gradient fill for accents. */
  gradient(x, w, a = THEME.pink, b = THEME.violet) {
    const gr = this.g.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, a);
    gr.addColorStop(1, b);
    return gr;
  }

  /** Register a tappable rectangle; tap(x, y) receives where inside it the tap landed. */
  hit(x, y, w, h, tap, { hover = true, r = 12 } = {}) {
    this.panel.hits.push({ x, y, w, h, tap, hover, r });
  }

  /** Button styles used by titles, dialogue and transaction panels. */
  button(x, y, w, h, label, tap, { kind = 'plain', disabled = false, size = 18, sub, icon, r = 10, color } = {}) {
    const g = this.g;
    const radius = Math.min(r, h / 2, 12);
    const path = rrect(x, y, w, h, radius);
    g.save();
    if (disabled) g.globalAlpha = .54;
    if (kind === 'primary') {
      g.shadowColor = rgba(color ?? '#ac3e61', .30);
      g.shadowBlur = 14;
      g.shadowOffsetY = 4;
    }
    g.fillStyle = kind === 'primary'
      ? this.gradient(x, w, color ? shade(color, -.17) : '#a93758', color ? shade(color, -.33) : '#754477')
      : kind === 'dark' ? '#322d48' : kind === 'ghost' ? rgba('#211c34', .45) : '#fffbf3';
    g.fill(path);
    g.shadowColor = 'transparent';
    if (kind === 'primary') {
      g.strokeStyle = rgba('#fff0e8', .52);
      g.lineWidth = 1;
      g.stroke(rrect(x + 2, y + 2, w - 4, h - 4, Math.max(1, radius - 2)));
    } else {
      g.strokeStyle = kind === 'ghost' ? rgba('#ffe5d9', .52) : kind === 'dark' ? '#514968' : '#dfd4df';
      g.lineWidth = 1;
      g.stroke(path);
    }
    const ink = kind === 'plain' ? THEME.ink : THEME.light;
    const tx = icon ? x + w / 2 + size * .55 : x + w / 2;
    const top = y + (h - size * 1.22) / 2 - (sub ? 9 : 0);
    if (icon) this.text(icon, tx - this.measure(label, size, 700) / 2 - size * 1.3, top, { size: size * 1.05, color: ink });
    this.text(label, tx, top, { size, weight: 750, color: ink, align: 'center' });
    if (sub) this.text(sub, x + w / 2, y + h / 2 + 5, { size: size * .68, color: ink, align: 'center', alpha: .82 });
    g.restore();
    if (!disabled && tap) this.hit(x, y, w, h, tap, { r: radius });
  }

  /** A small rounded label. */
  chip(str, x, y, { color = THEME.violet, size = 13, ink = '#ffffff', padX = 10, h = 24 } = {}) {
    const w = this.measure(str, size, 700) + padX * 2;
    this.g.fillStyle = color;
    this.g.fill(rrect(x, y, w, h, Math.min(7, h / 2)));
    this.text(str, x + w / 2, y + (h - size * 1.25) / 2, { size, weight: 700, color: ink, align: 'center' });
    return w;
  }

  /** Progress bar from 0 to max. */
  bar(x, y, w, h, value, max, { color = THEME.pink, color2, back = rgba('#2b2a4a', 0.1) } = {}) {
    const g = this.g;
    g.fillStyle = back;
    g.fill(rrect(x, y, w, h, h / 2));
    const fw = Math.max(h, w * Math.max(0, Math.min(1, value / max)));
    if (value > 0) {
      g.fillStyle = this.gradient(x, w, color, color2 ?? shade(color, 0.25));
      g.fill(rrect(x, y, fw, h, h / 2));
    }
  }

  heart(x, y, s, color = THEME.rose) {
    this.g.fillStyle = color;
    this.g.fill(heart(x, y, s));
  }
  star(x, y, s, color = THEME.gold) {
    this.g.fillStyle = color;
    this.g.fill(star(x, y, s, s * 0.45));
  }

  /** Section heading with a small editorial rule. */
  title(str, x, y, { size = 29, color = THEME.ink } = {}) {
    this.text(str, x, y, { size, weight: 750, family: SERIF, color });
    const base = y + size * 1.34;
    this.g.fillStyle = THEME.rose;
    this.g.fill(poly([[x, base], [x + 3, base - 3], [x + 6, base], [x + 3, base + 3]]));
    this.g.fillStyle = this.gradient(x + 11, 50, '#bd637e', rgba('#bd637e', 0));
    this.g.fillRect(x + 11, base - .5, 52, 1);
  }

  /** Draw another canvas (a portrait, an icon) into the panel, optionally inside a rounded frame. */
  image(source, x, y, w, h, { r = 0, sx, sy, sw, sh } = {}) {
    const g = this.g;
    g.save();
    if (r) g.clip(rrect(x, y, w, h, r));
    if (sw) g.drawImage(source, sx, sy, sw, sh, x, y, w, h);
    else g.drawImage(source, x, y, w, h);
    g.restore();
  }
}

/**
 * One painted panel. Options: position and size in game units, `res` (canvas
 * pixels per unit), `parent` (a display container), and `modal` for a pop-up
 * that blocks everything behind it. A screen may also set:
 *   panel.solid = true    taps on the panel never fall through to what is behind
 *   panel.blank = fn      called when an empty part of the panel is tapped
 *   panel.dismiss = fn    called when a pop-up is tapped beside, or Escape is pressed
 */
export class Panel {
  constructor(ui, { x = 0, y = 0, w = W, h = H, res = 1.25, parent, modal = false }) {
    this.ui = ui;
    this.w = w;
    this.h = h;
    this.res = res;
    this.modal = modal;
    this.hits = [];
    this.pic = ui.stage.pic(parent ?? ui.layer);
    this.node = this.pic.node;
    this.node.x = x;
    this.node.y = y;
    this.enabled = true;
    ui.panels.push(this);
  }

  /** Repaint the panel: draw(painter) lays out its content and tappable areas. */
  paint(draw) {
    this.hits = [];
    const canvas = this.ui.stage.canvas(this.w, this.h, this.res, g => draw(new Painter(g, this)));
    this.pic.show(canvas, canvas.res);
    return this;
  }

  close() {
    const i = this.ui.panels.indexOf(this);
    if (i >= 0) this.ui.panels.splice(i, 1);
    if (this.ui.hovered?.panel === this) this.ui.setHover(null);
    this.pic.destroy();
  }
}

/** Panel manager: routes taps to the top-most panel under the pointer and shows the hover highlight. */
export function createUI(stage, layer) {
  const ui = { stage, layer, panels: [], hovered: null, pressed: null, background: null, keys: null, locked: 0 };
  const glow = stage.rect(layer, 0xffffff, 10, 10);
  glow.alpha = 0;

  function find(x, y) {
    for (let i = ui.panels.length - 1; i >= 0; i--) {
      const panel = ui.panels[i];
      if (!panel.enabled || !panel.node.visible) continue;
      let p;
      try {
        p = panel.node.globalToLocal(x, y);
      } catch {
        continue;
      }
      for (let k = panel.hits.length - 1; k >= 0; k--) {
        const h = panel.hits[k];
        if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return { panel, hit: h, lx: p.x - h.x, ly: p.y - h.y };
      }
      const inside = p.x >= 0 && p.y >= 0 && p.x <= panel.w && p.y <= panel.h;
      if (panel.modal || (panel.solid && inside)) return { panel, hit: null, inside };
    }
    return null;
  }

  ui.setHover = found => {
    ui.hovered = found;
    if (!found?.hit?.hover) {
      glow.alpha = 0;
      return;
    }
    const { panel, hit } = found,
      a = panel.node.localToGlobal(hit.x, hit.y),
      b = panel.node.localToGlobal(hit.x + hit.w, hit.y + hit.h);
    glow.x = a.x;
    glow.y = a.y;
    glow.scaleX = (b.x - a.x) / 10;
    glow.scaleY = (b.y - a.y) / 10;
    glow.alpha = ui.pressed ? 0.26 : 0.14;
    layer.setChildIndex(glow, layer.numChildren - 1);
  };

  stage.on('move', (x, y, e) => {
    if (ui.locked || e?.pointerType === 'touch') return;
    const found = find(x, y);
    if (found?.hit !== ui.hovered?.hit) ui.setHover(found);
    stage.canvasElement.style.cursor = found?.hit ? 'pointer' : 'default';
  });
  stage.on('down', (x, y) => {
    if (ui.locked) return;
    ui.pressed = find(x, y);
    ui.setHover(ui.pressed);
  });
  stage.on('up', (x, y, e) => {
    const pressed = ui.pressed;
    ui.pressed = null;
    if (ui.locked) return;
    const found = x < 0 ? null : find(x, y);
    ui.setHover(e?.pointerType === 'touch' ? null : found);
    if (x < 0) return;
    if (pressed?.hit) {
      if (found?.hit === pressed.hit) {
        glow.alpha = 0;
        ui.onTap?.();
        pressed.hit.tap(found.lx, found.ly);
      }
      return;
    }
    // A tap on an empty part of a panel goes to that panel; a tap beside a
    // pop-up dismisses it if it allows that; a tap on nothing goes to the screen.
    if (pressed?.panel) {
      if (pressed.inside) pressed.panel.blank?.();
      else pressed.panel.dismiss?.();
    } else ui.background?.(x, y);
  });
  stage.on('key', (key, e) => {
    if (ui.locked) return;
    // Escape closes the top-most pop-up that can be dismissed.
    const top = [...ui.panels].reverse().find(panel => panel.modal);
    if (key === 'Escape' && top?.dismiss) top.dismiss();
    else ui.keys?.(key, e);
  });

  ui.panel = options => new Panel(ui, options);
  return ui;
}
