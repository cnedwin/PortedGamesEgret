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

// ── 敌人 ────────────────────────────────────────────────────────
//
// 三个敌人各一个剪影。形不用准，要的是"一眼分得出是谁"：
// 山魈宽肩长臂、赤蛟细长盘旋、混沌是一团带棱的暗块。

export function drawEnemy(graphics, { kind, w, h }) {
  const cx = 0;
  const cy = 0;

  // 椭圆按"中心 + 半径"画。drawEllipse 收的是左上角，直接填中心坐标会整体往下偏半个身位——
  // 第一版山魈变成一团棕色就是从这里来的。
  const ell = (x, y, rx, ry) => graphics.drawEllipse(x - rx, y - ry, rx * 2, ry * 2);

  // 一头粗一头细的肢体：两个端点各给一个半径，中间拉一个四边形。
  // 只铺路径、不收笔——外层 beginFill 一次画完一整组，中间 endFill 会把颜色断掉。
  // 圆头圆尾靠端点的圆补，不然肩膀和拳头会是方的。
  const taper = (ax, ay, bx, by, wa, wb) => {
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    graphics.moveTo(ax + nx * wa, ay + ny * wa);
    graphics.lineTo(bx + nx * wb, by + ny * wb);
    graphics.lineTo(bx - nx * wb, by - ny * wb);
    graphics.lineTo(ax - nx * wa, ay - ny * wa);
  };

  if (kind === 'shanjiao') {
    // 山魈：驼背、肩高过头、手臂垂到地上。这三件事是它和"一坨毛"的区别，
    // 所以先把骨架位置定下来再填肉：脚在 h*0.42，肩在 -h*0.16，头缩在肩之间。
    const body = 0x6b5442;
    const fur = 0x8f7355;
    const dark = 0x463529;
    const face = 0xa8865f;
    const moss = 0x4f7a45;

    // 地面投影，把剪影"按"在地上
    graphics.beginFill(0x0e141b, 0.55).drawEllipse(cx - w * 0.32, cy + h * 0.4, w * 0.64, h * 0.09).endFill();

    // 腿：短而粗，两截
    graphics.beginFill(dark, 1);
    for (const side of [-1, 1]) {
      taper(cx + side * w * 0.13, cy + h * 0.16, cx + side * w * 0.16, cy + h * 0.4, w * 0.075, w * 0.06);
      ell(cx + side * w * 0.16, cy + h * 0.4, w * 0.08, h * 0.035);
    }
    graphics.endFill();

    // 躯干：一个前倾的大椭圆，重心偏左
    graphics.beginFill(body, 1).drawEllipse(cx - w * 0.3, cy - h * 0.26, w * 0.6, h * 0.62).endFill();
    // 胸口浅一档，把"正面"点出来
    graphics.beginFill(fur, 1).drawEllipse(cx - w * 0.17, cy - h * 0.16, w * 0.34, h * 0.42).endFill();

    // 长臂：肩 → 肘 → 拳，一路垂到地面
    graphics.beginFill(fur, 1);
    for (const side of [-1, 1]) {
      const sx = cx + side * w * 0.26;
      const sy = cy - h * 0.14;
      const ex = cx + side * w * 0.36;
      const ey = cy + h * 0.1;
      const hx = cx + side * w * 0.31;
      const hy = cy + h * 0.38;
      taper(sx, sy, ex, ey, w * 0.085, w * 0.07);
      taper(ex, ey, hx, hy, w * 0.07, w * 0.055);
      ell(ex, ey, w * 0.075, w * 0.075);
      ell(hx, hy, w * 0.075, w * 0.06); // 拳头
    }
    graphics.endFill();

    // 肩毛：三根朝上的尖，剪影上最容易认的一处
    graphics.beginFill(dark, 1);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i += 1) {
        const bx = cx + side * (w * 0.18 + i * w * 0.055);
        const by = cy - h * 0.3 + i * h * 0.02;
        graphics.moveTo(bx - w * 0.03, by);
        graphics.lineTo(bx, by - h * 0.11);
        graphics.lineTo(bx + w * 0.03, by);
      }
    }
    graphics.endFill();

    // 头：夹在两只肩之间，比肩低——"缩着脖子"是山魈的体态
    graphics.beginFill(body, 1).drawCircle(cx, cy - h * 0.24, h * 0.155).endFill();
    // 耳
    graphics.beginFill(dark, 1);
    ell(cx - w * 0.17, cy - h * 0.28, w * 0.05, h * 0.045);
    ell(cx + w * 0.17, cy - h * 0.28, w * 0.05, h * 0.045);
    graphics.endFill();
    // 脸盘
    graphics.beginFill(face, 1).drawEllipse(cx - w * 0.11, cy - h * 0.3, w * 0.22, h * 0.2).endFill();
    // 眉骨压一道暗，眼睛就陷进去了
    graphics.beginFill(dark, 1).drawEllipse(cx - w * 0.12, cy - h * 0.32, w * 0.24, h * 0.05).endFill();
    // 眼
    graphics.beginFill(0xffcf5c, 1);
    ell(cx - w * 0.055, cy - h * 0.26, w * 0.026, h * 0.022);
    ell(cx + w * 0.055, cy - h * 0.26, w * 0.026, h * 0.022);
    graphics.endFill();
    // 嘴
    graphics.beginFill(0x2a1c14, 1).drawEllipse(cx - w * 0.05, cy - h * 0.185, w * 0.1, h * 0.035).endFill();
    // 背上的苔：说明它守的是林子
    graphics.beginFill(moss, 0.9);
    ell(cx - w * 0.24, cy - h * 0.16, w * 0.07, h * 0.05);
    ell(cx - w * 0.3, cy - h * 0.04, w * 0.05, h * 0.04);
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
    // 角：两根朝后掠的尖，别竖成一根旗杆——竖着像戴了顶帽子
    graphics.beginFill(0xe0c58a, 1);
    graphics.moveTo(cx + w * 0.24, cy - h * 0.36);
    graphics.lineTo(cx + w * 0.12, cy - h * 0.46);
    graphics.lineTo(cx + w * 0.2, cy - h * 0.33);
    graphics.endFill();
    graphics.beginFill(0xc9a86f, 1);
    graphics.moveTo(cx + w * 0.28, cy - h * 0.34);
    graphics.lineTo(cx + w * 0.2, cy - h * 0.44);
    graphics.lineTo(cx + w * 0.25, cy - h * 0.31);
    graphics.endFill();
    // 眼
    graphics.beginFill(0xffd166, 1).drawCircle(cx + w * 0.29, cy - h * 0.29, h * 0.024).endFill();
    // 鳞：画在盘身里面，别伸到轮廓外面去——伸出去就是一根飘着的线
    graphics.lineStyle(w * 0.006, dark, 0.55);
    for (let i = 0; i < 2; i += 1) {
      const y = cy + h * (0.14 + i * 0.06);
      graphics.moveTo(cx - w * 0.2, y);
      graphics.curveTo(cx - w * 0.04, y - h * 0.05, cx + w * 0.1, y);
    }
  } else {
    // 混沌：一团有棱角的暗块，身上长着好几只冷光的眼。
    //
    // 前两版都不成立：第一版是灰椭圆加五根辐条，像病毒图标；第二版是一块
    // 带裂口的甲片，裂口太抢，整体读成"一个图标"。这两个问题都出在同一件事上
    // ——它们都不像活物。改成"不规则轮廓 + 多只眼"之后，一眼就知道是个东西。
    const body = 0x2f3547;
    const inner = 0x464e68;
    const edge = 0x7d89ad;
    const glow = 0x9fe4ff;

    graphics.beginFill(0x0e141b, 0.55).drawEllipse(cx - w * 0.32, cy + h * 0.42, w * 0.64, h * 0.08).endFill();

    // 轮廓：12 个点，半径一伸一缩，所以边缘是锯齿不是圆
    const blob = (radius, wobble, fill) => {
      graphics.beginFill(fill, 1);
      for (let i = 0; i < 12; i += 1) {
        const a = (Math.PI * 2 * i) / 12 - Math.PI / 2;
        const r = radius * (1 - wobble / 2 + wobble * ((i * 7) % 5) / 4);
        const x = cx + Math.cos(a) * r * w;
        const y = cy + Math.sin(a) * r * h;
        if (i === 0) graphics.moveTo(x, y);
        else graphics.lineTo(x, y);
      }
      graphics.endFill();
    };
    blob(0.42, 0.3, body);
    blob(0.31, 0.26, inner);

    // 外圈的尖：从轮廓里往外戳，剪影才不闷
    graphics.beginFill(body, 1);
    for (let i = 0; i < 7; i += 1) {
      const a = (Math.PI * 2 * i) / 7 + 0.4;
      const bx = cx + Math.cos(a) * w * 0.38;
      const by = cy + Math.sin(a) * h * 0.38;
      const tx = cx + Math.cos(a + 0.09) * w * 0.55;
      const ty = cy + Math.sin(a + 0.09) * h * 0.55;
      const ex = cx + Math.cos(a + 0.3) * w * 0.36;
      const ey = cy + Math.sin(a + 0.3) * h * 0.36;
      graphics.moveTo(bx, by);
      graphics.lineTo(tx, ty);
      graphics.lineTo(ex, ey);
    }
    graphics.endFill();

    // 眼：大小位置都不对称，对称会变成一张脸
    const eyes = [
      [-0.17, -0.1, 0.055],
      [0.11, -0.19, 0.036],
      [0.19, 0.05, 0.046],
      [-0.02, 0.17, 0.03],
    ];
    for (const [ex, ey, r] of eyes) {
      graphics.beginFill(0x121722, 1).drawCircle(cx + w * ex, cy + h * ey, w * r * 1.7).endFill();
      graphics.beginFill(glow, 1).drawCircle(cx + w * ex, cy + h * ey, w * r).endFill();
      graphics.beginFill(0xffffff, 0.9).drawCircle(cx + w * ex - w * r * 0.3, cy + h * ey - h * r * 0.3, w * r * 0.35).endFill();
    }

    // 棱线：几笔亮边，把转折点点出来
    graphics.lineStyle(w * 0.007, edge, 0.55);
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      graphics.moveTo(cx + Math.cos(a) * w * 0.2, cy + Math.sin(a) * h * 0.2);
      graphics.lineTo(cx + Math.cos(a) * w * 0.34, cy + Math.sin(a) * h * 0.34);
    }

    // 飘着的小碎块
    graphics.beginFill(glow, 0.55);
    graphics.drawCircle(cx - w * 0.46, cy - h * 0.2, w * 0.022);
    graphics.drawCircle(cx + w * 0.44, cy - h * 0.26, w * 0.017);
    graphics.drawCircle(cx + w * 0.38, cy + h * 0.34, w * 0.02);
    graphics.endFill();
  }
}
