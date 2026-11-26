// The drawing origin of each moving part is the centre of its body.
export const INK = 0x1b1712;
export const LACQUER = 0xa8322a;
export const GOLD = 0xe6b65c;

const RIM = 0xe4be7b;
const BRASS = 0xad7940;
const METAL_DARK = 0x463626;
const CEDAR_EDGE = 0xd39659;
const CEDAR = 0x865035;
const CEDAR_DARK = 0x49291e;
const CELADON = 0x92c5a8;
const TEAL = 0x497f73;
const TEAL_DARK = 0x1c3e3c;
const PALE = 0xffe3a1;
const LIGHT_LINE = { caps: 'round', joints: 'round' };

const stops = (...pairs) => pairs.map(([offset, color, alpha = 1]) => ({ offset, color, alpha }));

function path(g, points, close = false) {
  const [first, ...rest] = points;
  g.moveTo(first[0], first[1]);
  for (const [x, y] of rest) g.lineTo(x, y);
  if (close) g.lineTo(first[0], first[1]);
}

function face(g, points, color, alpha = 1) {
  g.beginFill(color, alpha);
  path(g, points, true);
  g.endFill();
}

function chamfer(x, y, w, h, cut) {
  return [[x + cut, y], [x + w - cut, y], [x + w, y + cut], [x + w, y + h - cut],
    [x + w - cut, y + h], [x + cut, y + h], [x, y + h - cut], [x, y + cut]];
}

function rivet(g, x, y, r = 2.4) {
  g.beginFill(METAL_DARK).drawCircle(x, y + 0.6, r).endFill();
  g.beginFill(RIM).drawCircle(x - 0.35, y - 0.4, r * 0.67).endFill();
}

function cedar(g, x, y, w, h, vertical = false) {
  const grain = vertical ? [CEDAR_EDGE, CEDAR, CEDAR_DARK] : [0xcb8a4d, CEDAR, CEDAR_DARK];
  g.beginLinearGradientFill(x, y, vertical ? x + w : x, vertical ? y : y + h,
    stops([0, grain[0]], [0.34, grain[1]], [1, grain[2]]));
  path(g, chamfer(x, y, w, h, Math.min(2, w / 4, h / 4)), true);
  g.endFill().lineStyle(0);
  const long = vertical ? h : w;
  const wide = vertical ? w : h;
  const mark = vertical
    ? (a, b) => [x + b * wide, y + a * long]
    : (a, b) => [x + a * long, y + b * wide];
  for (const [width, hue, alpha, offset] of [[1.2, INK, 0.35, 0], [0.8, RIM, 0.42, 0.055]]) {
    g.lineStyle(width, hue, alpha, LIGHT_LINE);
    for (let i = 0; i < 4; i++) {
      const a = 0.12 + (i % 2) * 0.12;
      const b = 0.18 + i * 0.19 + offset;
      const [sx, sy] = mark(a, b);
      g.moveTo(sx, sy).cubicCurveTo(...mark(0.3, b - 0.08), ...mark(0.64, b + 0.11), ...mark(0.83 + (i % 2) * 0.06, b));
    }
  }
  g.lineStyle(0);
}

export function drawBlock(g, w, h) {
  const x = -w / 2;
  const y = -h / 2;
  g.lineStyle(2, INK, 1);
  cedar(g, x, y, w, h);
  g.lineStyle(1, CEDAR_EDGE, 0.8).moveTo(x + 4, y + 3).lineTo(-x - 4, y + 3);
  g.lineStyle(0);
  const corner = Math.min(w, h) * 0.26;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const u = (w / 2 - 2) * sx;
      const v = (h / 2 - 2) * sy;
      face(g, [[u, v], [u - sx * corner, v], [u - sx * corner * 0.57, v - sy * corner * 0.48], [u, v - sy * corner]], TEAL_DARK);
      g.lineStyle(1.1, RIM, 0.83).moveTo(u - sx * corner * 0.86, v).lineTo(u, v).lineTo(u, v - sy * corner * 0.86);
      g.lineStyle(0);
      rivet(g, u - sx * 3, v - sy * 3, 1.8);
    }
  }
  face(g, [[-4, 1], [0, -3], [4, 1], [0, 5]], 0xd35030);
  g.lineStyle(0.8, 0xf6d198, 0.68).moveTo(-1.7, 1.4).lineTo(1.9, 1.4).lineStyle(0);
}

export function drawCrate(g, w, h) {
  const x = -w / 2;
  const y = -h / 2;
  g.lineStyle(2, INK, 1);
  cedar(g, x, y, w, h, true);
  g.lineStyle(1.5, INK, 0.6);
  for (const f of [-0.25, 0, 0.25]) g.moveTo(w * f, y + 5).lineTo(w * f, -y - 5);
  g.lineStyle(0);
  const bay = h / Math.max(1, Math.round(h / (w * 1.4)));
  for (let top = y; top < -y - 1; top += bay) {
    const bottom = top + bay;
    const brace = [[x + 5, top + 4], [-x - 5, bottom - 4]];
    g.lineStyle(9, CEDAR_DARK).moveTo(...brace[0]).lineTo(...brace[1]);
    g.lineStyle(4.5, 0xb67946).moveTo(...brace[0]).lineTo(...brace[1]);
    g.lineStyle(1.1, RIM, 0.65).moveTo(x + 6, top + 3).lineTo(-x - 4, bottom - 5);
    g.lineStyle(0);
    g.beginLinearGradientFill(x, 0, -x, 0, stops([0, 0x777459], [0.24, TEAL_DARK], [0.77, 0x3b5149], [1, 0x728e76]))
      .drawRect(x + 1, top + 1, w - 2, 6).endFill();
    rivet(g, x + 6, top + 4, 2);
    rivet(g, -x - 6, top + 4, 2);
  }
  g.beginFill(TEAL_DARK).drawRect(x + 1, -y - 6, w - 2, 5).endFill();
  g.lineStyle(1.2, RIM, 0.62).moveTo(x + 2, -y - 5).lineTo(-x - 2, -y - 5).lineStyle(0);
}

export function drawStone(g, r) {
  g.lineStyle(2, INK);
  g.beginRadialGradientFill(-r * 0.34, -r * 0.53, r * 1.58, stops([0, 0xd3d9bf], [0.36, 0x8eaa95], [0.72, 0x4e746d], [1, 0x25403e]))
    .drawCircle(0, 0, r).endFill().lineStyle(0);
  const cut = (points, color, alpha) => face(g, points.map(([x, y]) => [x * r, y * r]), color, alpha);
  cut([[-0.82, -0.28], [-0.57, -0.62], [-0.15, -0.75], [0.24, -0.62], [-0.13, -0.4], [-0.56, -0.47]], 0xe7ead1, 0.38);
  cut([[0.24, -0.49], [0.59, -0.61], [0.89, -0.33], [0.51, -0.21], [0.24, -0.31]], 0x36554b, 0.51);
  cut([[-0.7, 0.37], [-0.48, 0.51], [-0.04, 0.59], [0.27, 0.45], [0.68, 0.52], [0.35, 0.81], [-0.23, 0.84]], 0x233e3a, 0.55);
  g.lineStyle(Math.max(1.1, r * 0.057), TEAL_DARK, 0.86, LIGHT_LINE);
  g.moveTo(-r * 0.72, -r * 0.03).lineTo(-r * 0.4, r * 0.13).lineTo(-r * 0.07, r * 0.13).lineTo(r * 0.24, -r * 0.15).lineTo(r * 0.59, -r * 0.2);
  g.moveTo(-r * 0.09, r * 0.16).lineTo(r * 0.03, r * 0.35).lineTo(r * 0.28, r * 0.38);
  g.lineStyle(0.9, 0xd5dec4, 0.68, LIGHT_LINE);
  g.moveTo(-r * 0.72, r * 0.035).lineTo(-r * 0.39, r * 0.2).lineTo(-r * 0.26, r * 0.2);
  g.moveTo(r * 0.4, r * 0.57).lineTo(r * 0.58, r * 0.42);
  g.lineStyle(0);
}

export function drawPellet(g, type, r) {
  const thunder = type === 'thunder';
  const heavy = type === 'heavy';
  const palette = thunder ? [0xe5fcff, 0x52b4d3, 0x145476] : heavy
    ? [0xf3ce8c, 0x8d5534, 0x301f1a] : [0xd1e7df, 0x748a8a, 0x29383e];
  g.lineStyle(1.2, INK, 0.96);
  g.beginRadialGradientFill(-r * 0.35, -r * 0.47, r * 1.58, stops([0, palette[0]], [0.5, palette[1]], [1, palette[2]]))
    .drawCircle(0, 0, r).endFill().lineStyle(0);
  if (thunder) {
    face(g, [[0.12, -0.76], [-0.53, 0.08], [-0.08, 0.12], [-0.27, 0.73], [0.55, -0.22], [0.09, -0.21]].map(([x, y]) => [x * r, y * r]), 0xebfff0);
  } else if (heavy) {
    g.lineStyle(2, 0xf0bf68, 0.9, LIGHT_LINE).moveTo(-r * 0.8, r * 0.09).curveTo(r * 0.18, r * 0.65, r * 0.78, -r * 0.32).lineStyle(0);
    rivet(g, r * 0.15, r * 0.07, r * 0.18);
  } else {
    g.lineStyle(1.2, 0xc8eee4, 0.7, LIGHT_LINE).moveTo(-r * 0.64, -r * 0.17).curveTo(-r * 0.55, -r * 0.54, -r * 0.19, -r * 0.64).lineStyle(0);
  }
}

/** Bronze interlocking plates frame the seal. The centre opens and changes shape when struck. */
export function drawLock(g, w, h, open) {
  g.clear();
  const x = -w / 2;
  const y = -h / 2;
  const r = Math.min(w, h) * 0.3;
  const metal = open ? [PALE, BRASS, METAL_DARK] : [CELADON, TEAL, TEAL_DARK];
  g.lineStyle(2.5, INK);
  g.beginLinearGradientFill(x * 0.6, y, -x, -y, stops([0, metal[0]], [0.52, metal[1]], [1, metal[2]]));
  path(g, chamfer(x, y, w, h, 9), true);
  g.endFill().lineStyle(0);
  g.beginLinearGradientFill(-w * 0.22, y, w * 0.24, -y, stops([0, metal[2]], [1, INK]));
  path(g, chamfer(x + 5, y + 5, w - 10, h - 10, 6), true);
  g.endFill();
  g.lineStyle(1, open ? PALE : CELADON, 0.61);
  path(g, chamfer(x + 4, y + 4, w - 8, h - 8, 7), true);
  g.lineStyle(0);

  for (const sx of [-1, 1]) {
    const u = (w / 2 - 9) * sx;
    const edge = (r + 1) * sx;
    for (const sy of [-1, 1]) {
      const v = (h / 2 - 10) * sy;
      g.lineStyle(1.3, open ? RIM : CELADON, 0.68);
      path(g, [[u - 1 * sx, v - 12 * sy], [u - 1 * sx, v], [u - 13 * sx, v], [u - 13 * sx, v - 5 * sy], [u - 6 * sx, v - 5 * sy]]);
      g.lineStyle(0);
      rivet(g, u - 5 * sx, v - 11 * sy, 2.4);
      g.lineStyle(1.6, metal[1], 0.9);
      path(g, [[u - 3 * sx, 5 * sy], [edge + 4 * sx, 5 * sy], [edge, 9 * sy]]);
      g.lineStyle(0);
      if (w > h * 1.5) {
        const a = (w / 2 - 32) * sx;
        const b = 13 * sy;
        g.lineStyle(1, metal[0], 0.36);
        path(g, [[a, b], [a, b + 7 * sy], [a - 11 * sx, b + 7 * sy], [a - 11 * sx, b + 2 * sy], [a - 5 * sx, b + 2 * sy]]);
        g.lineStyle(0);
      }
    }
  }

  const ring = chamfer(-r, -r, r * 2, r * 2, r * 0.51);
  g.lineStyle(2, open ? PALE : RIM);
  g.beginLinearGradientFill(-r, -r, r, r, stops([0, metal[0]], [0.42, metal[1]], [1, metal[2]]));
  path(g, ring, true);
  g.endFill().lineStyle(0);
  g.beginRadialGradientFill(0, -r * 0.2, r * 0.9, open
    ? stops([0, 0xfff4c7], [0.4, 0xf1ba54], [1, 0x754522])
    : stops([0, 0x4b8277], [0.65, TEAL_DARK], [1, INK])).drawCircle(0, 0, r * 0.75).endFill();
  g.lineStyle(1.2, open ? PALE : 0xa5c8ae, 0.74).drawCircle(0, 0, r * 0.76).lineStyle(0);
  if (open) {
    face(g, [[0, -r * 0.54], [r * 0.2, -r * 0.18], [r * 0.55, 0], [r * 0.19, r * 0.2], [0, r * 0.53], [-r * 0.18, r * 0.2], [-r * 0.54, 0], [-r * 0.18, -r * 0.18]], 0xfff4c4);
    g.lineStyle(1.3, 0xffefcb, 0.85).moveTo(-r * 0.66, 0).lineTo(r * 0.66, 0).lineStyle(0);
  } else {
    g.beginFill(INK).drawCircle(0, -r * 0.22, r * 0.22).endFill();
    face(g, [[-r * 0.12, -r * 0.12], [r * 0.12, -r * 0.12], [r * 0.23, r * 0.43], [-r * 0.23, r * 0.43]], INK);
    g.lineStyle(1.05, CELADON, 0.9).moveTo(r * 0.13, r * 0.04).lineTo(r * 0.225, r * 0.42).lineTo(-r * 0.22, r * 0.42).lineStyle(0);
  }
}

export function drawPlate(g, w, h, on) {
  g.clear();
  const base = -h / 2;
  const top = base + (on ? 2.5 : -3.5);
  g.lineStyle(1.8, INK);
  g.beginFill(TEAL_DARK).drawRoundRect(-w / 2, base + 2, w, h - 1, 3).endFill();
  g.beginLinearGradientFill(0, top, 0, top + 7, stops([0, on ? PALE : CELADON], [0.38, on ? GOLD : TEAL], [1, on ? BRASS : TEAL_DARK]));
  path(g, chamfer(-w / 2 + 2, top, w - 4, 7, 2), true);
  g.endFill().lineStyle(0);
  for (const t of [-0.3, -0.15, 0, 0.15, 0.3]) {
    const x = w * t;
    g.lineStyle(1.2, on ? PALE : 0xb0cfb3, 0.85).moveTo(x - 2, top + 1.6).lineTo(x + 2, top + 1.6).lineTo(x, top + 4.4).lineStyle(0);
  }
}

export function drawGate(g, w, h) {
  const x = -w / 2;
  const y = -h / 2;
  g.lineStyle(2, INK);
  g.beginLinearGradientFill(x, 0, -x, 0, stops([0, TEAL_DARK], [0.24, INK], [1, 0x383b2c])).drawRect(x, y, w, h).endFill().lineStyle(0);
  for (const f of [0.18, 0.5, 0.82]) {
    const bar = x + f * w - 2.5;
    g.beginLinearGradientFill(bar, 0, bar + 5, 0, stops([0, 0xaddeba], [0.34, TEAL], [1, TEAL_DARK]))
      .drawRect(bar, y + 4, 5, h - 8).endFill();
  }
  for (const f of [0, 0.33, 0.66, 1]) {
    const rail = y + f * (h - 8);
    g.lineStyle(1.2, METAL_DARK);
    g.beginLinearGradientFill(0, rail, 0, rail + 8, stops([0, RIM], [0.35, BRASS], [1, METAL_DARK])).drawRect(x, rail, w, 8).endFill().lineStyle(0);
    rivet(g, x + 5, rail + 3.6, 1.8);
    rivet(g, -x - 5, rail + 3.6, 1.8);
  }
}

export function drawPlank(g, w, h) {
  const x = -w / 2;
  const y = -h / 2;
  g.lineStyle(1.7, INK);
  cedar(g, x, y, w, h);
  g.lineStyle(1.4, RIM, 0.88).moveTo(x + 2, y + 1).lineTo(-x - 2, y + 1).lineStyle(0);
  for (const f of [-0.46, -0.28, 0, 0.28, 0.46]) {
    g.beginFill(TEAL_DARK).drawRect(w * f - 3.8, y, 7.6, h).endFill();
    rivet(g, w * f, 0, f === 0 ? 3.4 : 2.1);
  }
  g.lineStyle(1.5, LACQUER, 0.95).moveTo(x + 15, 2).lineTo(x + 35, 2).moveTo(-x - 35, 2).lineTo(-x - 15, 2).lineStyle(0);
}

export function drawPost(g) {
  g.lineStyle(1.7, INK);
  g.beginLinearGradientFill(-10, 0, 11, 19, stops([0, 0xcf6651], [0.5, LACQUER], [1, CEDAR_DARK]));
  path(g, [[0, -10], [14, 22], [-14, 22]], true);
  g.endFill().lineStyle(0);
  face(g, [[0, -5], [3, 7], [9, 18], [-9, 18], [-3, 7]], METAL_DARK);
  g.lineStyle(1.4, RIM, 0.8).moveTo(-10, 19).lineTo(0, -5).lineTo(10, 19).lineStyle(0);
  rivet(g, 0, 1, 3.5);
  rivet(g, 0, 15, 2.5);
}

export function drawSpring(g, w, h, squeeze = 0) {
  g.clear();
  const x = -w / 2;
  const top = -h / 2 - 10 + squeeze * 8;
  const base = h / 2;
  const turns = Math.max(3, Math.round(w / 20));
  const coil = (offset) => {
    for (let i = 0; i < turns; i++) {
      const at = x + 8 + i * (w - 16) / turns;
      const next = x + 8 + (i + 1) * (w - 16) / turns;
      g.moveTo(at, base - 2 + offset).lineTo((at + next) / 2, top + 5 + offset).lineTo(next, base - 2 + offset);
    }
  };
  g.lineStyle(3.4, METAL_DARK, 1, LIGHT_LINE);
  coil(0);
  g.lineStyle(1.3, RIM, 0.95, LIGHT_LINE);
  coil(-0.5);
  g.lineStyle(1.4, INK);
  g.beginLinearGradientFill(0, top, 0, top + 7, stops([0, PALE], [0.36, RIM], [1, BRASS]));
  path(g, chamfer(x, top, w, 8, 2.5), true);
  g.endFill();
  g.beginFill(TEAL_DARK).drawRect(x, base - 4, w, 4).endFill().lineStyle(0);
  for (const f of [-0.35, 0, 0.35]) rivet(g, f * w, top + 3.5, 2);
}

export function drawRamp(g, points) {
  const top = Math.min(...points.map((p) => p.y));
  const bottom = Math.max(...points.map((p) => p.y));
  const coordinates = points.map(({ x, y }) => [x, y]);
  g.lineStyle(2, INK);
  g.beginLinearGradientFill(0, top, 0, bottom, stops([0, 0x91a393], [0.52, 0x526d64], [1, 0x283d3c]));
  path(g, coordinates, true);
  g.endFill().lineStyle(0);
  const centre = points.reduce((p, q) => ({ x: p.x + q.x / points.length, y: p.y + q.y / points.length }), { x: 0, y: 0 });
  const inset = (from, scale) => [centre.x + (from.x - centre.x) * scale, centre.y + (from.y - centre.y) * scale];
  const inside = points.map((point) => inset(point, 0.9));
  g.lineStyle(1.3, 0xb9be9e, 0.57).moveTo(...inside[0]).lineTo(...inside[1]).lineStyle(0);
  g.lineStyle(1, TEAL_DARK, 0.9);
  path(g, inside, true);
  for (const part of [0.29, 0.56, 0.8]) {
    const a = { x: points[0].x + (points[1].x - points[0].x) * part, y: points[0].y + (points[1].y - points[0].y) * part };
    path(g, [inset(a, 0.87), inset(a, 0.58), inset(a, 0.48)]);
  }
  g.lineStyle(0);
}

/** A recurved lacquered bow on a cedar stock, with a draw-weight dependent hemp string. */
export function drawBow(g, draw = 0.6) {
  g.clear();
  g.lineStyle(2, INK);
  g.beginLinearGradientFill(0, -9, 0, 8, stops([0, CEDAR_EDGE], [0.49, CEDAR], [1, CEDAR_DARK]));
  path(g, [[-34, -5], [-26, -8], [-15, -6], [7, -7], [26, -6], [29, -3], [29, 3], [24, 6], [-3, 5], [-13, 8], [-31, 8], [-34, 4]], true);
  g.endFill().lineStyle(0);
  g.lineStyle(1.3, RIM, 0.86).moveTo(-26, -4).lineTo(27, -3).lineStyle(0);
  face(g, [[-34, -5], [-28, -7], [-25, -5], [-25, 6], [-32, 7], [-34, 4]], TEAL_DARK);
  face(g, [[-9, 4], [-7, -3], [6, -3], [8, 3], [2, 7], [-5, 7]], TEAL_DARK);
  rivet(g, -1, 1, 3.8);
  rivet(g, -29, 1, 2.1);

  function limb() {
    g.moveTo(14, -30).cubicCurveTo(11, -24, 25, -16, 24, 0).cubicCurveTo(25, 16, 11, 24, 14, 30);
  }
  g.lineStyle(8.2, INK, 1, LIGHT_LINE);
  limb();
  g.lineStyle(5.7, LACQUER, 1, LIGHT_LINE);
  limb();
  g.lineStyle(2, 0xe87750, 0.9, LIGHT_LINE);
  limb();
  g.lineStyle(0);
  g.beginFill(BRASS).drawRoundRect(20.5, -5.5, 7, 11, 3).endFill();
  const back = 14 - draw * 26;
  g.lineStyle(2.5, METAL_DARK, 0.95, LIGHT_LINE).moveTo(14, -30).lineTo(back, 0).lineTo(14, 30);
  g.lineStyle(1.15, 0xffe5ac, 0.94, LIGHT_LINE).moveTo(14, -30).lineTo(back, 0).lineTo(14, 30).lineStyle(0);
  rivet(g, 14, -30, 3.3);
  rivet(g, 14, 30, 3.3);
}

export function drawStand(g) {
  g.lineStyle(2, INK);
  g.beginLinearGradientFill(-14, 2, 13, 23, stops([0, CEDAR_EDGE], [0.52, CEDAR], [1, CEDAR_DARK]));
  path(g, [[-16, 22], [-11, 16], [-5, 0], [4, -2], [9, 16], [16, 22]], true);
  g.endFill().lineStyle(0);
  g.lineStyle(2.2, RIM, 0.88).moveTo(-12, 20).lineTo(-3, 3).moveTo(3, 3).lineTo(11, 20).lineStyle(0);
  g.beginLinearGradientFill(0, 18, 0, 22, stops([0, TEAL], [1, TEAL_DARK])).drawRoundRect(-15, 18, 30, 5, 2).endFill();
  rivet(g, 0, 0, 5);
}

export function drawRope(g, x, y, endX, endY) {
  g.lineStyle(4.1, METAL_DARK, 1, LIGHT_LINE).moveTo(x, y).lineTo(endX, endY);
  g.lineStyle(2.7, 0xb18c55, 1, LIGHT_LINE).moveTo(x, y).lineTo(endX, endY);
  g.lineStyle(1.3, 0xf2c38c, 0.93, { dash: [3, 3.5] }).moveTo(x, y).lineTo(endX, endY);
  g.lineStyle(1, INK);
  g.beginFill(TEAL_DARK).drawRoundRect(x - 8, y - 5, 16, 8, 3).endFill().lineStyle(0);
  rivet(g, x - 4.5, y - 1.5, 1.6);
  rivet(g, x + 4.5, y - 1.5, 1.6);
  g.beginFill(CEDAR_DARK).drawRoundRect(endX - 3, endY - 4, 6, 7, 2).endFill();
  g.lineStyle(1.2, RIM, 0.88).moveTo(endX - 2, endY - 1).lineTo(endX + 2, endY - 2).lineStyle(0);
}
