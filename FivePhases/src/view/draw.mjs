// 画东西。
//
// 全部走引擎的 Graphics（矢量路径），不上贴图：占位阶段图形简单，矢量在任何
// 分辨率下都干净，也省掉一整套"画到 canvas 再上传成纹理"的流程。
// 将来接真美术时，这里换成 Bitmap 就行，外面的坐标一律不变。
//
// 每个 draw* 都画在**原点**，由调用方决定摆哪儿、转多少度。这样同一个图形
// 能被棋盘、卡面、特效复用，不会出现"这里画对了那里歪了"。

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

  // 底座：深色圆角方块，让相邻的格子有边界
  graphics.beginFill(PALETTE.panel, 0.55).drawRoundRect(-r, -r, r * 2, r * 2, size * 0.16).endFill();
  graphics.lineStyle(Math.max(1.5, size * 0.018), info ? info.deep : PALETTE.line, 0.9).drawRoundRect(-r, -r, r * 2, r * 2, size * 0.16);

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

// ── 敌人 ────────────────────────────────────────────────────────
//
// 三个敌人各一个剪影。形不用准，要的是"一眼分得出是谁"：
// 山魈宽肩长臂、赤蛟细长盘旋、混沌是一团带棱的暗块。

export function drawEnemy(graphics, { kind, w, h }) {
  const cx = 0;
  const cy = 0;

  if (kind === 'shanjiao') {
    // 深色背景上，剪影必须比背景亮一档才看得出轮廓
    const body = 0x6b5442;
    const fur = 0x8f7355;
    graphics.beginFill(body, 1).drawEllipse(cx - w * 0.3, cy - h * 0.05, w * 0.6, h * 0.75).endFill();
    graphics.beginFill(fur, 1).drawEllipse(cx + w * 0.05, cy - h * 0.1, w * 0.42, h * 0.6).endFill();
    graphics.beginFill(body, 1).drawCircle(cx + w * 0.26, cy - h * 0.34, h * 0.15).endFill();
    // 长臂
    graphics.beginFill(fur, 1);
    graphics.drawRoundRect(cx - w * 0.42, cy - h * 0.28, w * 0.13, h * 0.72, w * 0.06);
    graphics.drawRoundRect(cx + w * 0.24, cy - h * 0.26, w * 0.12, h * 0.7, w * 0.06);
    graphics.endFill();
    // 眼
    graphics.beginFill(0xffcf5c, 1);
    graphics.drawCircle(cx + w * 0.22, cy - h * 0.36, h * 0.026);
    graphics.drawCircle(cx + w * 0.3, cy - h * 0.36, h * 0.026);
    graphics.endFill();
  } else if (kind === 'chijiao') {
    // 盘成两圈的蛟：靠"一圈身体 + 一段脖子 + 一个张开的头"三件事认出来，
    // 只堆椭圆会变成一团红色，玩家分不出这是蛇还是石头。
    const scale = 0xa8434a;
    const belly = 0xd97b6c;
    const dark = 0x6d2a2f;

    // 下盘：两圈身体，后一圈暗一点，压出前后关系
    graphics.beginFill(dark, 1).drawEllipse(cx - w * 0.38, cy + h * 0.14, w * 0.76, h * 0.3).endFill();
    graphics.beginFill(scale, 1).drawEllipse(cx - w * 0.32, cy + h * 0.04, w * 0.64, h * 0.26).endFill();
    graphics.beginFill(belly, 0.9).drawEllipse(cx - w * 0.26, cy + h * 0.1, w * 0.4, h * 0.12).endFill();

    // 脖子：一条从盘身右侧立起来的弧
    graphics.beginFill(scale, 1);
    graphics.moveTo(cx + w * 0.06, cy + h * 0.08);
    graphics.curveTo(cx + w * 0.3, cy - h * 0.02, cx + w * 0.26, cy - h * 0.26);
    graphics.lineTo(cx + w * 0.4, cy - h * 0.24);
    graphics.curveTo(cx + w * 0.44, cy + h * 0.06, cx + w * 0.18, cy + h * 0.2);
    graphics.endFill();

    // 头：上颚 + 下颚，中间留一张开的口
    graphics.beginFill(scale, 1);
    graphics.moveTo(cx + w * 0.16, cy - h * 0.3);
    graphics.lineTo(cx + w * 0.44, cy - h * 0.38);
    graphics.lineTo(cx + w * 0.4, cy - h * 0.24);
    graphics.lineTo(cx + w * 0.2, cy - h * 0.2);
    graphics.endFill();
    graphics.beginFill(scale, 1);
    graphics.moveTo(cx + w * 0.18, cy - h * 0.16);
    graphics.lineTo(cx + w * 0.42, cy - h * 0.18);
    graphics.lineTo(cx + w * 0.36, cy - h * 0.08);
    graphics.lineTo(cx + w * 0.16, cy - h * 0.1);
    graphics.endFill();
    // 口中的暗
    graphics.beginFill(0x2a1013, 1);
    graphics.moveTo(cx + w * 0.22, cy - h * 0.22);
    graphics.lineTo(cx + w * 0.4, cy - h * 0.25);
    graphics.lineTo(cx + w * 0.38, cy - h * 0.17);
    graphics.lineTo(cx + w * 0.2, cy - h * 0.15);
    graphics.endFill();
    // 角
    graphics.beginFill(0xe0c58a, 1);
    graphics.moveTo(cx + w * 0.26, cy - h * 0.36);
    graphics.lineTo(cx + w * 0.3, cy - h * 0.48);
    graphics.lineTo(cx + w * 0.34, cy - h * 0.35);
    graphics.endFill();
    // 眼
    graphics.beginFill(0xffd166, 1).drawCircle(cx + w * 0.3, cy - h * 0.3, h * 0.024).endFill();
    // 身上的鳞：几道暗弧
    graphics.lineStyle(w * 0.008, dark, 0.8);
    for (let i = 0; i < 3; i += 1) {
      const y = cy + h * (0.02 + i * 0.07);
      graphics.moveTo(cx - w * 0.28, y);
      graphics.curveTo(cx - w * 0.06, y - h * 0.06, cx + w * 0.16, y);
    }
  } else {
    const shell = 0x4a5163;
    const glow = 0x9aa8cc;
    graphics.beginFill(shell, 1);
    graphics.moveTo(cx - w * 0.36, cy + h * 0.24);
    graphics.curveTo(cx - w * 0.44, cy - h * 0.12, cx - w * 0.12, cy - h * 0.42);
    graphics.curveTo(cx + w * 0.3, cy - h * 0.4, cx + w * 0.4, cy - h * 0.02);
    graphics.curveTo(cx + w * 0.44, cy + h * 0.3, cx + w * 0.1, cy + h * 0.36);
    graphics.curveTo(cx - w * 0.2, cy + h * 0.4, cx - w * 0.36, cy + h * 0.24);
    graphics.endFill();
    // 棱
    graphics.lineStyle(w * 0.012, glow, 0.85);
    for (let i = 0; i < 5; i += 1) {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      graphics.moveTo(cx, cy);
      graphics.lineTo(cx + Math.cos(a) * w * 0.34, cy + Math.sin(a) * h * 0.34);
    }
    graphics.beginFill(0xb9c4e0, 1).drawCircle(cx, cy, h * 0.05).endFill();
  }
}
