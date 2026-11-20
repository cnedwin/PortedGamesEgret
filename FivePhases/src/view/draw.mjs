// 图形基础供白鹭特效与旧版骨架预览使用。

import { ELEMENT_INFO } from '../core/cards.mjs';

export const PALETTE = {
  ink: 0x0d1117,
  inkDeep: 0x080a0e,
  panel: 0x161c25,
  panelLight: 0x1f2833,
  line: 0x2c3947,
  gold: 0xf0b45a,
  goldDeep: 0x8a6428,
  text: 0xdfe6f0,
  textDim: 0x8b97a6,
  blood: 0xd94f4f,
  jade: 0x5fd0a0,
};

export const ELEMENT_COLORS = Object.fromEntries(
  Object.entries(ELEMENT_INFO).map(([key, info]) => [key, { color: Number.parseInt(info.color.slice(1), 16), deep: Number.parseInt(info.deep.slice(1), 16), shape: info.shape, name: info.name }]),
);

/** 五行顺序，和棋盘上的 kind 下标一一对应。 */
export const ELEMENT_KEYS = ['fire', 'earth', 'metal', 'water', 'wood'];

// ── 基本形 ──────────────────────────────────────────────────────

/**
 * 把归一化路径（[-0.5,0.5] 的方框）铺到 w×h 上。
 * `smooth` 用二次曲线穿过相邻点的中点，布料的弧线靠它。
 */
export function tracePath(graphics, points, w, h, smooth) {
  const pts = points.map(([x, y]) => [x * w, y * h]);
  if (!smooth) {
    graphics.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i += 1) graphics.lineTo(pts[i][0], pts[i][1]);
    return;
  }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(pts[pts.length - 1], pts[0]);
  graphics.moveTo(start[0], start[1]);
  for (let i = 0; i < pts.length; i += 1) {
    const cur = pts[i];
    const next = pts[(i + 1) % pts.length];
    const m = mid(cur, next);
    graphics.curveTo(cur[0], cur[1], m[0], m[1]);
  }
}

/** 一个部件清单里的图形，画在原点，`shift` 把轴心挪到原点。 */
export function tracePart(graphics, part, shiftX, shiftY) {
  const [w, h] = part.size;
  const hw = w / 2;
  const hh = h / 2;
  if (part.shape === 'path') {
    const points = part.points.map(([x, y]) => [x + shiftX / w, y + shiftY / h]);
    tracePath(graphics, points, w, h, part.smooth);
    return;
  }
  if (part.shape === 'ellipse') {
    graphics.drawEllipse(shiftX - hw, shiftY - hh, w, h);
  } else if (part.shape === 'capsule') {
    graphics.drawRoundRect(shiftX - hw, shiftY - hh, w, h, Math.min(hw, hh));
  } else if (part.shape === 'poly') {
    const top = hw * 0.82;
    graphics.moveTo(shiftX - top, shiftY - hh);
    graphics.lineTo(shiftX + top, shiftY - hh);
    graphics.lineTo(shiftX + hw, shiftY + hh);
    graphics.lineTo(shiftX - hw, shiftY + hh);
  } else {
    graphics.drawRoundRect(shiftX - hw, shiftY - hh, w, h, Math.min(hw, hh) * 0.35);
  }
}

// ── 五行图形 ────────────────────────────────────────────────────
//
// 五种形状不只是装饰：红绿是最经典的色盲冲突对，只靠颜色分不出来。
// 火菱形、水圆、木叶、金方、土六边形，去掉颜色也能认。

export function traceElement(graphics, shape, size) {
  const r = size / 2;
  if (shape === 'diamond') {
    graphics.moveTo(0, -r);
    graphics.lineTo(r, 0);
    graphics.lineTo(0, r);
    graphics.lineTo(-r, 0);
  } else if (shape === 'hex') {
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) graphics.moveTo(x, y);
      else graphics.lineTo(x, y);
    }
  } else if (shape === 'square') {
    graphics.drawRoundRect(-r * 0.82, -r * 0.82, r * 1.64, r * 1.64, r * 0.22);
  } else if (shape === 'circle') {
    graphics.drawCircle(0, 0, r * 0.92);
  } else {
    // 叶形：一头尖一头圆
    graphics.moveTo(0, -r);
    graphics.curveTo(r * 0.95, -r * 0.35, r * 0.62, r * 0.72, 0, r);
    graphics.curveTo(-r * 0.62, r * 0.72, -r * 0.95, -r * 0.35, 0, -r);
  }
}

/** 一块棋盘上的方块。`size` 是整格边长，图形按 0.56 缩进去。 */
export function drawTile(graphics, { kind, special, size }) {
  const info = ELEMENT_COLORS[ELEMENT_KEYS[kind]];
  const r = size * 0.42;

  // 底座 + 边框。
  //
  // 原来是"填充 + 描边"，描边是一圈圆角矩形的 stroke——这一笔在引擎里要
  // 把轮廓摊成三角形带、每个圆角还要加圆形接头，49 格加起来吃掉整整 258k
  // 每帧几何预算（全场 1,048,576 的四分之一）。改成"外圈实心 + 内圈实心盖上去"，
  // 同样的样子，省掉四分之三。
  const radius = size * 0.16;
  const edge = Math.max(1.5, size * 0.018);
  graphics.beginFill(info ? info.deep : PALETTE.line, 0.85).drawRoundRect(-r, -r, r * 2, r * 2, radius).endFill();
  graphics.beginFill(PALETTE.panel, 0.92).drawRoundRect(-r + edge, -r + edge, (r - edge) * 2, (r - edge) * 2, Math.max(2, radius - edge)).endFill();

  if (!info) {
    // 万能块：五色环
    const colours = ELEMENT_KEYS.map((key) => ELEMENT_COLORS[key].color);
    for (let i = 0; i < 5; i += 1) {
      graphics.beginFill(colours[i], 0.95);
      const a0 = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      graphics.moveTo(0, 0);
      for (let step = 0; step <= 6; step += 1) {
        const a = a0 + ((Math.PI * 2) / 5) * (step / 6);
        graphics.lineTo(Math.cos(a) * size * 0.26, Math.sin(a) * size * 0.26);
      }
      graphics.endFill();
    }
    graphics.beginFill(PALETTE.ink, 1).drawCircle(0, 0, size * 0.13).endFill();
    return;
  }

  // 主体：外深内亮，做出一点体积
  graphics.beginFill(info.deep, 0.95);
  traceElement(graphics, info.shape, size * 0.56);
  graphics.endFill();
  graphics.beginFill(info.color, 1);
  traceElement(graphics, info.shape, size * 0.42);
  graphics.endFill();

  // 高光：左上角一小块，斜着放
  graphics.beginFill(0xffffff, 0.22);
  graphics.drawEllipse(-size * 0.08, -size * 0.1, size * 0.14, size * 0.1);
  graphics.endFill();

  if (special === 1) {
    // 消行：横两道
    graphics.beginFill(0xffffff, 0.85);
    graphics.drawRect(-r * 0.86, -size * 0.07, r * 1.72, size * 0.05);
    graphics.drawRect(-r * 0.86, size * 0.02, r * 1.72, size * 0.05);
    graphics.endFill();
  } else if (special === 2) {
    graphics.beginFill(0xffffff, 0.85);
    graphics.drawRect(-size * 0.07, -r * 0.86, size * 0.05, r * 1.72);
    graphics.drawRect(size * 0.02, -r * 0.86, size * 0.05, r * 1.72);
    graphics.endFill();
  } else if (special === 3) {
    // 炸弹：一圈放射线
    graphics.lineStyle(size * 0.04, 0xffffff, 0.9);
    for (let i = 0; i < 8; i += 1) {
      const a = (Math.PI * 2 * i) / 8;
      graphics.moveTo(Math.cos(a) * size * 0.2, Math.sin(a) * size * 0.2);
      graphics.lineTo(Math.cos(a) * size * 0.3, Math.sin(a) * size * 0.3);
    }
  }
}
