// 画：全部用代码画，单位是米（画在一个按比例放大的容器里）。笔法学界画：尺子画的直线、工整的木构、墨线勾边；
// 背景是青绿山水。静止的东西（山、水、岸、网格）每关只画一次；杆件、车、碎木每帧只挪位置、改透明度，不重画。
// Painting, all in code, in metres (inside a container scaled up to the stage). The manner is ruled-line painting:
// straight lines drawn with a rule, neat timberwork, ink outlines; the background blue-and-green landscape. What does
// not move (hills, water, banks, the grid) is painted once a level; members, carts and debris only move and fade each
// frame, and are not painted again.
import { Sprite } from '@egret/engine';
import { MATERIALS } from '../sim/materials.mjs';
import { C } from './kit.mjs';

const INK = C.ink;

/** A small seeded random for the painting, so a level looks the same each time. */
export function seeded(text) {
  let s = 0;
  for (const ch of String(text)) s = (Math.imul(s, 31) + ch.charCodeAt(0)) >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** The five chapters use their own mineral-pigment palette. */
const REGIONS = [
  { sky:0xc8d5c7, light:0xf5e8c9, far:0xb2c6b8, mid:0x90b1aa, near:0x71978a, water:0x6aa3a0, wet:0x377674, earth:0xb9a487, deep:0x7b6955, grass:0x678452, roof:0x475f60 },
  { sky:0xdacba7, light:0xffefcf, far:0xc5b9a2, mid:0xb6a486, near:0x9f9578, water:0x849e9d, wet:0x4c7779, earth:0xc3ad8b, deep:0x897258, grass:0x808d60, roof:0x526267 },
  { sky:0xa9b7bc, light:0xe8d8b5, far:0xaababb, mid:0x819fa3, near:0x657f7e, water:0x67958f, wet:0x365f60, earth:0x9d927e, deep:0x605b55, grass:0x657a5a, roof:0x354d54 },
  { sky:0xaccacb, light:0xf6dfb7, far:0xb6c5ba, mid:0x86aaa9, near:0x61938d, water:0x76acad, wet:0x397e80, earth:0xbba17d, deep:0x776451, grass:0x6e8657, roof:0x50696a },
  { sky:0xbbd3c5, light:0xf6e5bf, far:0xb6c7af, mid:0x8bb29d, near:0x6e9a80, water:0x6b9c91, wet:0x376f67, earth:0xb39b75, deep:0x756451, grass:0x6b8856, roof:0x3d605a }
];

function polygon(g, points, colour, alpha = 1) {
  g.beginFill(colour, alpha).moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) g.lineTo(x, y);
  g.lineTo(points[0][0], points[0][1]).endFill();
}

/** A continuous painted ridge with restrained folds, concentrated near the actual working space. */
function ridge(g, rnd, x0, x1, floor, height, tint, facet, limit, interval) {
  const points = [[x0, floor], [-14, floor - height * 0.13]];
  const detailRight = Math.min(x1, limit + 14);
  for (let left = -14; left < detailRight; ) {
    const end = Math.min(detailRight, left + interval * (0.8 + rnd() * 0.6));
    const w = end - left;
    const peak = floor - height * (0.62 + rnd() * 0.38);
    points.push([left + w * 0.16, floor - height * 0.29], [left + w * 0.43, peak],
      [left + w * 0.63, peak + height * 0.16], [left + w * 0.78, peak + height * 0.4],
      [end, floor - height * (0.06 + rnd() * 0.18)]);
    left = end;
  }
  points.push([x1, floor - height * 0.13], [x1, floor]);
  polygon(g, points, tint);
  for (let index = 3; index < points.length - 3; index += 5) {
    const [x, y] = points[index];
    polygon(g, [[x, y + height * 0.045], points[index + 2],
      [points[index + 3][0], floor], [x + interval * 0.18, floor - height * 0.16]], facet, 0.6);
  }
}

function river(g, level, palette, rnd) {
  const { span, water, bed } = level;
  const depth = bed - water;
  for (let band = 0; band < 5; band++) {
    const y = water + band * depth / 5;
    g.beginFill(mixColour(palette.wet, palette.water, band / 6))
      .drawRect(0, y, span, depth / 5 + 0.012).endFill();
  }
  const count = Math.min(36, Math.ceil(span * 1.7));
  for (const [colour, n] of [[0xf1e6cf, count], [palette.wet, Math.ceil(count / 2)]]) {
    g.lineStyle(0.026, colour, 0.48);
    for (let i = 0; i < n; i++) {
      const x = rnd() * span, y = water + depth * (0.08 + rnd() * 0.84);
      const w = Math.min(span - x, 0.32 + rnd() * (0.5 + depth * 0.22));
      g.moveTo(x, y).curveTo(x + w * 0.4, y - 0.055, x + w, y);
    }
  }
  g.lineStyle(0.05, palette.wet, 0.8).moveTo(0, water).lineTo(span, water);
  g.lineStyle(0.024, C.white, 0.7).moveTo(0, water + 0.035).lineTo(span, water + 0.035);
  g.lineStyle(0, 0, 0);
}

function groundCut(g, r, level, palette, rnd, left, right, bottom) {
  const x0 = Math.max(left, r.x0), x1 = Math.min(right, r.x1);
  const y1 = r.y1 >= level.bed + 3.9 ? bottom : Math.min(bottom, r.y1);
  if (x1 <= x0 || y1 <= r.y0) return;
  const layers = [0, 0.28, 1.1, 2.4, 4.6];
  for (let i = 0; i < layers.length; i++) {
    const y = Math.min(y1, r.y0 + layers[i]);
    const end = i === layers.length - 1 ? y1 : Math.min(y1, r.y0 + layers[i + 1]);
    if (end <= y) continue;
    g.beginFill(mixColour(palette.deep, palette.earth, i === 0 ? 0.04 : 0.12 + i * 0.13))
      .drawRect(x0, y, x1 - x0, end - y).endFill();
  }
  // Keep fine texture near the authored riverbank rather than drawing dozens of metres of detail off screen.
  const detailLeft = Math.max(x0, -13), detailRight = Math.min(x1, level.span + 13);
  const detailBottom = Math.min(y1, level.bed + 10);
  if (detailRight > detailLeft && detailBottom > r.y0 + 0.35) {
    g.lineStyle(0.025, palette.deep, 0.55);
    for (let y = r.y0 + 0.52; y < detailBottom; y += 0.95 + rnd() * 0.3) {
      const width = detailRight - detailLeft;
      const x = detailLeft + rnd() * width * 0.58;
      const end = Math.min(detailRight, x + width * (0.26 + rnd() * 0.3));
      if (end > x) g.moveTo(x, y).lineTo(x + (end - x) * 0.38, y - 0.075).lineTo(end, y + 0.018);
    }
    g.lineStyle(0, 0, 0);
    const edge = r.x1 === 0 ? x1 : r.x0 === level.span ? x0 : null;
    if (edge !== null) {
      const dx = r.x1 === 0 ? -1 : 1;
      const face = Math.min(level.bed, detailBottom), width = Math.min(0.63, x1 - x0), y = r.y0 + 0.12;
      if (face > y) {
        const inner = edge + dx * width;
        g.beginFill(mixColour(C.white, palette.earth, 0.16))
          .drawRect(Math.min(inner, edge), y, width, face - y).endFill();
        g.lineStyle(0.032, palette.deep, 0.74);
        for (let at = y + 0.55, row = 0; at < face; at += 0.63, row++) {
          g.moveTo(edge, at).lineTo(inner, at + 0.025);
          if (row % 2 === 1) g.moveTo(edge + dx * width * 0.52, at)
            .lineTo(edge + dx * width * 0.52, Math.min(face, at + 0.63));
        }
        g.lineStyle(0, 0, 0);
      }
    }
  }
  g.lineStyle(0.045, palette.deep, 0.88).moveTo(x0, r.y0).lineTo(x1, r.y0);
  if (r.x1 < right) g.moveTo(x1, r.y0).lineTo(x1, Math.min(level.bed, y1));
  if (r.x0 > left) g.moveTo(x0, r.y0).lineTo(x0, Math.min(level.bed, y1));
  g.lineStyle(0, 0, 0);
  if (r.y0 >= level.water || detailRight <= detailLeft) return;
  g.beginFill(palette.grass).drawRect(detailLeft, r.y0 - 0.065, detailRight - detailLeft, 0.08).endFill();
  g.lineStyle(0.028, palette.grass, 0.95);
  for (let x = detailLeft + 0.18; x < detailRight; x += 0.53 + rnd() * 0.5) {
    g.moveTo(x, r.y0).lineTo(x + 0.06, r.y0 - 0.15 - rnd() * 0.15);
    g.moveTo(x + 0.07, r.y0).lineTo(x + 0.17, r.y0 - 0.11);
  }
  g.lineStyle(0, 0, 0);
}

function roadSurface(g, end, edge, y, palette) {
  const x0 = Math.min(end, edge), x1 = Math.max(end, edge);
  g.beginFill(mixColour(palette.deep, 0x8f8574, 0.45)).drawRect(x0, y, x1 - x0, 0.16).endFill();
  g.lineStyle(0.032, C.white, 0.52).moveTo(x0, y + 0.015).lineTo(x1, y + 0.015);
  g.lineStyle(0.025, palette.deep, 0.8);
  for (let d = 0.55; d < 11; d += 0.55) {
    const x = edge + Math.sign(end - edge) * d;
    if (x < x0 || x > x1) break;
    g.moveTo(x, y + 0.035).lineTo(x, y + 0.15);
  }
  g.lineStyle(0, 0, 0);
}

/** The background is drawn once per scene; construction stays in the original level coordinates. */
export function paintScenery(level) {
  const s = new Sprite(), backdrop = new Sprite(), rnd = seeded(level.id);
  s.addChild(backdrop);
  s.backdrop = backdrop;
  let g = backdrop.graphics;
  const palette = REGIONS[level.chapter] ?? REGIONS[0];
  const left = -40, right = level.span + 40;
  const top = level.area.y0 * 0.5 - 40, bottom = level.bed + 40;
  const roadMin = Math.min(level.road.left.y, level.road.right.y);
  const horizon = roadMin + Math.min(4.2, level.water * 0.35 + 1.5);
  const bandTop = roadMin - (level.chapter === 2 ? 16 : 9);
  g.beginFill(palette.sky).drawRect(left, top, right - left, Math.max(0, bandTop - top)).endFill();
  for (let i = 0; i < 6; i++) {
    const y = bandTop + (horizon - bandTop) * i / 6;
    g.beginFill(mixColour(palette.light, palette.sky, i / 5))
      .drawRect(left, y, right - left, (horizon - bandTop) / 6 + 0.016).endFill();
  }
  g.beginFill(palette.light).drawRect(left, horizon, right - left, bottom - horizon).endFill();
  g.beginFill(0xffe4b3, 0.75).drawCircle(level.span * 0.66 + 0.8,
    roadMin - (level.chapter === 2 ? 7 : 5), level.chapter === 2 ? 1.32 : 0.85).endFill();
  const heights = level.chapter === 2 ? [12, 9, 6.2] : [6.4, 4.7, 3.3];
  ridge(g, rnd, left, right, horizon + 0.2, heights[0], palette.far,
    mixColour(palette.mid, palette.far, 0.28), level.span, 8.8);
  ridge(g, rnd, left - 1, right, horizon + 1.4, heights[1], palette.mid,
    mixColour(palette.near, palette.mid, 0.2), level.span, 7.5);
  ridge(g, rnd, left - 2, right, horizon + 4.2, heights[2], palette.near,
    mixColour(palette.deep, palette.near, 0.16), level.span, 6.7);
  const foreground = new Sprite();
  s.addChild(foreground);
  g = foreground.graphics;
  river(g, level, palette, rnd);
  for (const r of level.ground) groundCut(g, r, level, palette, rnd, left, right, bottom);
  roadSurface(g, left, 0, level.road.left.y, palette);
  roadSurface(g, right, level.span, level.road.right.y, palette);
  // Individual fallback trees can be replaced by the illustrated sprites, without touching the engineering world.
  s.trees = [[-4.6,level.road.left.y],[level.span+5.2,level.road.right.y]].map(([x,y],index) => {
    const node = new Sprite();
    s.addChild(node);
    willow(node.graphics,x,y,rnd,palette,level.chapter);
    return { node,x,y,index };
  });
  g.lineStyle(0.025, palette.grass, 0.9);
  for (let i = 0; i < 12; i++) {
    const x = level.span + 2 + rnd() * 5, y = level.road.right.y;
    g.moveTo(x, y).curveTo(x - 0.08, y - 0.42, x + 0.14, y - 0.65 - rnd() * 0.5);
  }
  g.lineStyle(0, 0, 0);
  for (const [x, y] of level.towers) tower(g, x, y, x < level.span / 2 ? level.road.left.y : level.road.right.y, palette);

  // Engineering marks are deliberately drawn after the landscape.
  if (level.channel) {
    const ch = level.channel, topY = level.water - ch.clear;
    g.lineStyle(0.06, C.cinnabar, 0.9);
    for (const x of [ch.x0, ch.x1]) g.moveTo(x, level.water + 0.3).lineTo(x, topY);
    for (let x = ch.x0; x < ch.x1; x += 0.4) g.moveTo(x, topY).lineTo(Math.min(ch.x1, x + 0.22), topY);
    g.lineStyle(0, 0, 0);
  }
  for (const p of level.piers) {
    const x = p.x * 0.5, y = p.top * 0.5;
    g.lineStyle(0.04, INK, 0.45);
    for (let yy = y; yy < level.bed; yy += 0.35)
      g.moveTo(x - 0.6, yy).lineTo(x - 0.6, Math.min(level.bed, yy + 0.18))
        .moveTo(x + 0.6, yy).lineTo(x + 0.6, Math.min(level.bed, yy + 0.18));
    g.lineStyle(0, 0, 0);
  }
  for (const [gx, gy] of level.anchors) {
    const x = gx * 0.5, y = gy * 0.5;
    g.beginFill(C.white).drawCircle(x, y, 0.21).endFill();
    g.lineStyle(0.035, INK, 0.92).beginFill(C.cinnabar).drawCircle(x, y, 0.15).endFill();
    g.lineStyle(0, 0, 0);
    g.beginFill(0x4e3227).drawCircle(x, y, 0.055).endFill();
  }
  return s;
}

/**
 * Fine ruled lines every half metre over the area that may be built in, a little stronger every two metres: a sprite
 * of its own, hidden while a test crossing runs.
 */
export function paintGrid(level) {
  const s = new Sprite(),
    g = s.graphics;
  const a = level.area,
    x0 = a.x0 * 0.5,
    x1 = a.x1 * 0.5,
    y0 = a.y0 * 0.5,
    y1 = a.y1 * 0.5;
  // Only over open air and water: the lines stop at the banks' tops.
  const top = (x) => {
    let t = Infinity;
    for (const r of level.ground) if (x > r.x0 - 1e-6 && x < r.x1 + 1e-6) t = Math.min(t, r.y0);
    return t;
  };
  for (let x = x0; x <= x1 + 1e-6; x += 0.5) {
    const strong = Math.abs(x / 2 - Math.round(x / 2)) < 1e-6,
      end = Math.min(y1, top(x));
    if (end > y0) g.lineStyle(strong ? 0.02 : 0.012, INK, strong ? 0.18 : 0.09).moveTo(x, y0).lineTo(x, end);
  }
  for (let y = y0; y <= y1 + 1e-6; y += 0.5) {
    const strong = Math.abs(y / 2 - Math.round(y / 2)) < 1e-6;
    g.lineStyle(strong ? 0.02 : 0.012, INK, strong ? 0.18 : 0.09);
    // Walk along the row, drawing where it is above the ground.
    let from = null;
    for (let x = x0; x <= x1 + 0.25; x += 0.25) {
      const open = x <= x1 && y <= top(x) + 1e-6;
      if (open && from === null) from = x;
      if (!open && from !== null) {
        g.moveTo(from, y).lineTo(Math.min(x1, x - 0.25), y);
        from = null;
      }
    }
  }
  g.lineStyle(0, 0, 0);
  return s;
}

/** A colour `t` of the way from `b` to `a` (0 is all b, 1 all a). */
export function mixColour(a, b, t) {
  const ch = (c, k) => (c >> k) & 255;
  const mix = (k) => Math.round(ch(a, k) * t + ch(b, k) * (1 - t));
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

function willow(g, x, y, rnd, palette, chapter) {
  const tall = chapter === 2 ? 3.6 : chapter === 4 ? 3.2 : 2.9;
  const bark = 0x58473b, leaf = palette.grass;
  g.lineStyle(0.06, bark, 0.9);
  polygon(g, [[x - 0.14, y], [x + 0.16, y], [x + 0.03, y - tall * 0.72],
    [x - 0.12, y - tall], [x - 0.21, y - tall * 0.7]], bark);
  g.lineStyle(0.075, bark, 0.85);
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * 0.46;
    g.moveTo(x, y - tall * 0.63).curveTo(x + dx * 0.35, y - tall * 0.75, x + dx, y - tall * 0.91);
  }
  g.lineStyle(0, 0, 0);
  const pine = chapter === 1 || chapter === 2;
  for (let i = 0; i < 8; i++) {
    const sx = x + (rnd() - 0.5) * 2.1 - 0.65, sy = y - tall + rnd() * 0.8 - 0.3;
    const width = 0.83 + rnd() * 0.53, height = pine ? 0.3 + rnd() * 0.26 : 0.65 + rnd() * 0.55;
    g.beginFill(mixColour(leaf, palette.near, 0.55 + rnd() * 0.32), 0.95).drawEllipse(sx, sy, width, height).endFill();
  }
  if (!pine) {
    g.lineStyle(0.026, mixColour(leaf, palette.deep, 0.67), 0.88);
    for (let i = 0; i < 17; i++) {
      const sx = x - 1.05 + rnd() * 2.1, sy = y - tall + 0.3 + rnd() * 0.65;
      g.moveTo(sx, sy).curveTo(sx + 0.12, sy + 0.52, sx + 0.07, sy + 0.86 + rnd() * 0.44);
    }
  } else {
    g.lineStyle(0.028, 0x465b48, 0.66);
    for (let i = 0; i < 10; i++) {
      const sx = x - 1.2 + rnd() * 2.2, sy = y - tall - 0.05 + rnd() * 0.85;
      g.moveTo(sx, sy).lineTo(sx + 0.35 + rnd() * 0.24, sy - 0.06);
    }
  }
  g.lineStyle(0, 0, 0);
}

/** Ruled-line architecture: coursed stone, carved wood, lattice and a tiled, upturned roof. */
function tower(g, x, top, road, palette) {
  const w = 2.6, left = x - w / 2, right = x + w / 2, baseTop = top + 1.2;
  const stone = 0xa59a87, dark = 0x5b5851;
  if (road > baseTop) {
    g.lineStyle(0.04, INK, 0.8).beginFill(stone).drawRect(left, baseTop, w, road - baseTop).endFill();
    g.lineStyle(0, 0, 0);
    g.beginFill(dark, 0.24).drawRect(right - 0.38, baseTop, 0.38, road - baseTop).endFill();
    g.beginFill(C.white, 0.17).drawRect(left + 0.08, baseTop, 0.25, road - baseTop).endFill();
    g.lineStyle(0.028, dark, 0.7);
    for (let y = baseTop + 0.55, i = 0; y < road; y += 0.55, i++) {
      g.moveTo(left, y).lineTo(right, y);
      for (const j of [x - (i % 2 ? 0.37 : 0.7), x + (i % 2 ? 0.7 : 0.37)])
        g.moveTo(j, y).lineTo(j, Math.min(road, y + 0.55));
    }
    g.lineStyle(0, 0, 0);
    g.beginFill(0x7c7568).drawRect(left - 0.11, baseTop, w + 0.22, 0.13).endFill();
  }
  const sill = top + 1.15;
  g.lineStyle(0.045, INK, 0.85).beginFill(0x9c4a36).drawRect(left + 0.22, top + 0.23, w - 0.44, 0.93).endFill();
  g.lineStyle(0, 0, 0);
  for (let i = 0; i < 3; i++) {
    const cx = x - 0.68 + i * 0.68;
    g.beginFill(0x302c2a).drawRect(cx - 0.24, top + 0.38, 0.48, 0.62).endFill();
    g.lineStyle(0.032, 0xc6a16a, 0.9).moveTo(cx, top + 0.38).lineTo(cx, top + 1)
      .moveTo(cx - 0.23, top + 0.64).lineTo(cx + 0.23, top + 0.64);
    g.lineStyle(0, 0, 0);
  }
  g.beginFill(0x693626).drawRect(left + 0.13, sill - 0.09, w - 0.26, 0.12).endFill();
  g.lineStyle(0.05, INK, 0.88);
  g.beginFill(palette.roof).moveTo(left - 0.68, top + 0.2)
    .curveTo(left - 0.29, top + 0.25, left + 0.1, top + 0.04)
    .curveTo(x - 0.72, top - 0.42, x - 0.48, top - 0.54)
    .lineTo(x + 0.48, top - 0.54)
    .curveTo(x + 0.72, top - 0.42, right - 0.1, top + 0.04)
    .curveTo(right + 0.29, top + 0.25, right + 0.68, top + 0.2)
    .lineTo(right + 0.52, top + 0.32).lineTo(left - 0.52, top + 0.32)
    .lineTo(left - 0.68, top + 0.2).endFill();
  g.lineStyle(0.03, 0xc0b09c, 0.63);
  for (let i = 0; i < 9; i++) {
    const t = i / 8, bx = left - 0.45 + t * (w + 0.9);
    g.moveTo(x - 0.38 + t * 0.76, top - 0.47).lineTo(bx, top + 0.22);
  }
  g.lineStyle(0.065, INK, 0.9).moveTo(x - 0.52, top - 0.56).lineTo(x + 0.52, top - 0.56);
  g.lineStyle(0, 0, 0);
  g.beginFill(C.gold).drawCircle(x - 0.53, top - 0.56, 0.06)
    .drawCircle(x + 0.53, top - 0.56, 0.06).endFill();
}

/** Thickness of a member as drawn, metres. */
export const thicknessOf = (material) => ({ plank: 0.22, slab: 0.28, wood: 0.14, bamboo: 0.1, stone: 0.3, rope: 0.05, chain: 0.07 })[material];

/**
 * A member as a sprite lying along +x from 0 to `length`, its middle line on y = 0: its material, and two washes over
 * it (cinnabar for a pull, azurite for a push) whose strength shows how hard it works.
 */
export function paintMember(material, length, { ghost = false, bad = false } = {}) {
  const s = new Sprite();
  const g = s.graphics,
    t = thicknessOf(material),
    m = MATERIALS[material],
    a = ghost ? 0.55 : 1;

  const fill = bad ? C.cinnabar : m.colour;
  const dark = mixColour(INK, fill, 0.44), light = mixColour(C.white, fill, 0.46);
  if (material === 'rope') {
    g.lineStyle(t * 1.2, dark, a).moveTo(0, 0).lineTo(length, 0);
    g.lineStyle(t * 0.82, fill, a).moveTo(0, -t * 0.08).lineTo(length, -t * 0.08);
    g.lineStyle(0.012, light, 0.85 * a);
    for (let x = 0.045; x < length - 0.06; x += 0.15) g.moveTo(x, -t * 0.42).lineTo(x + 0.06, t * 0.35);
  } else if (material === 'chain') {
    g.lineStyle(0.036, dark, a);
    for (let x = 0; x < length; x += 0.2) g.drawEllipse(x, -0.048, 0.22, 0.096);
    g.lineStyle(0.012, light, 0.65 * a);
    for (let x = 0.035; x < length - 0.07; x += 0.4) g.moveTo(x, -0.035).lineTo(x + 0.07, -0.035);
  } else {
    g.lineStyle(0.022, dark, 0.9 * a);
    g.beginFill(fill, a).drawRect(0, -t / 2, length, t).endFill();
    g.lineStyle(0, 0, 0);
    // An illuminated upper edge and darker lower face give the member a readable section in elevation.
    g.beginFill(dark, 0.57 * a).drawRect(0, t * 0.09, length, t * 0.39).endFill();
    g.beginFill(light, 0.68 * a).drawRect(0, -t * 0.46, length, t * 0.17).endFill();
    const step = { plank: 0.45, slab: 0.5, bamboo: 0.4, stone: 0.5, wood: 0 }[material];
    if (step) {
      g.lineStyle(0.016, dark, 0.75 * a);
      for (let x = step; x < length - 0.05; x += step) {
        g.moveTo(x, -t / 2).lineTo(x, t / 2);
        if (material === 'bamboo') g.moveTo(x + 0.045, -t * 0.48).lineTo(x + 0.045, t * 0.48);
      }
    }
    if (material === 'wood' || material === 'plank') {
      g.lineStyle(0.013, light, 0.58 * a);
      g.moveTo(0.08, -t * 0.12).curveTo(length * 0.48, t * 0.02, Math.max(0.08, length - 0.05), -t * 0.13);
      g.lineStyle(0.013, dark, 0.52 * a);
      g.moveTo(0.08, t * 0.07).lineTo(Math.max(0.08, length - 0.08), t * 0.02);
    } else if (material === 'slab' || material === 'stone') {
      g.lineStyle(0.012, light, 0.6 * a);
      for (let x = step * 0.4; x < length - 0.08; x += step * 2)
        g.moveTo(x, -t * 0.18).lineTo(Math.min(length, x + step * 0.3), -t * 0.06);
    }
  }
  g.lineStyle(0, 0, 0);
  g.beginFill(0x352f2b, a).drawCircle(0, 0, 0.072).drawCircle(length, 0, 0.072).endFill();
  g.beginFill(0xc7b49a, 0.82 * a).drawCircle(-0.018, -0.018, 0.021)
    .drawCircle(length - 0.018, -0.018, 0.021).endFill();

  if (!ghost) {
    for (const [colour, key] of [
      [C.cinnabar, 'pull'],
      [C.azurite, 'push']
    ]) {
      const wash = new Sprite();
      wash.graphics.beginFill(colour, 1).drawRect(0, -Math.max(t, 0.08) / 2 - 0.02, length, Math.max(t, 0.08) + 0.04).endFill();
      wash.alpha = 0;
      wash.visible = false;
      s.addChild(wash);
      s[key] = wash;
    }
  }
  s.restLength = length;
  return s;
}

/** Lay a member sprite between two points (metres), stretched to their distance. */
export function lay(sprite, ax, ay, bx, by) {
  sprite.x = ax;
  sprite.y = ay;
  sprite.rotation = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
  sprite.scaleX = Math.hypot(bx - ax, by - ay) / (sprite.restLength || 1);
}

/** Show how hard a member works, −1 (crushing) to 1 (tearing). */
export function showStrain(sprite, strain) {
  const pull = Math.max(0, strain),
    push = Math.max(0, -strain);
  const set = (wash, k) => {
    if (!wash) return;
    const v = k < 0.15 ? 0 : Math.min(0.85, (k - 0.15) * 1.1);
    wash.visible = v > 0;
    wash.alpha = v;
  };
  set(sprite.pull, pull);
  set(sprite.push, push);
}

/** A floating sampan with planked hull and woven canopy. */
export function paintPontoon() {
  const s = new Sprite(), g = s.graphics;
  g.lineStyle(0.046, INK, 1);
  g.beginFill(0x7f5935).moveTo(-1.1, 0.05).lineTo(1.1, 0.05)
    .curveTo(0.91, 0.5, 0.6, 0.6).lineTo(-0.6, 0.6)
    .curveTo(-0.91, 0.5, -1.1, 0.05).endFill();
  g.lineStyle(0, 0, 0);
  polygon(g, [[-0.95, 0.16], [0.95, 0.16], [0.68, 0.53], [-0.68, 0.53]], 0x563d2a);
  g.lineStyle(0.024, 0xd1ae71, 0.8).moveTo(-0.97, 0.13).lineTo(0.97, 0.13)
    .moveTo(-0.83, 0.37).lineTo(0.83, 0.37);
  g.lineStyle(0.034, INK, 0.9).beginFill(0xc4a76b).moveTo(-0.62, 0.05)
    .curveTo(0, -0.49, 0.62, 0.05).lineTo(-0.62, 0.05).endFill();
  g.lineStyle(0.018, 0x725636, 0.7);
  for (let x = -0.47; x < 0.5; x += 0.15) g.moveTo(x, 0).lineTo(x * 0.8, -0.19);
  g.lineStyle(0.03, INK, 0.9).moveTo(-0.63, 0.06).lineTo(0.63, 0.06);
  g.lineStyle(0, 0, 0);
  return s;
}

/** A pier of staggered stone courses, with beveled sides and a cap under the deck. */
export function paintPier(x, top, bed) {
  const s = new Sprite(), g = s.graphics;
  const y1 = bed + 0.5, w = 1.2, left = x - w / 2, right = x + w / 2;
  if (y1 <= top) return s;
  g.lineStyle(0.04, INK, 0.85).beginFill(0xa6a393).drawRect(left, top, w, y1 - top).endFill();
  g.lineStyle(0, 0, 0);
  g.beginFill(0x67665d, 0.55).drawRect(right - 0.25, top, 0.25, y1 - top).endFill();
  g.beginFill(C.white, 0.23).drawRect(left + 0.03, top, 0.17, y1 - top).endFill();
  g.lineStyle(0.028, 0x5b5a56, 0.75);
  let row = 0;
  for (let y = top + 0.4; y < y1; y += 0.4, row++) {
    g.moveTo(left, y).lineTo(right, y);
    const split = x + (row % 2 ? -0.18 : 0.17);
    g.moveTo(split, y).lineTo(split, Math.min(y1, y + 0.4));
  }
  g.lineStyle(0.038, INK, 0.9).beginFill(0xc4ba9e).drawRect(left - 0.06, top, w + 0.12, 0.16).endFill();
  g.lineStyle(0, 0, 0);
  return s;
}

/** Small painted silhouettes keep hat, sleeves and feet recognizable at game scale. */
function figure(g, x, y, h, { colour = 0x34495e, hat = true } = {}) {
  const dark = mixColour(INK, colour, 0.6), light = mixColour(C.white, colour, 0.35);
  g.lineStyle(0.055, dark, 1).moveTo(x - 0.12, y).lineTo(x - 0.06, y - h * 0.38)
    .moveTo(x + 0.14, y).lineTo(x + 0.036, y - h * 0.4);
  g.lineStyle(0.05, INK, 0.8).moveTo(x - 0.17, y).lineTo(x - 0.02, y)
    .moveTo(x + 0.09, y).lineTo(x + 0.24, y);
  g.lineStyle(0.025, dark, 0.95);
  polygon(g, [[x - 0.12, y - h * 0.78], [x + 0.12, y - h * 0.78],
    [x + 0.17, y - h * 0.46], [x + 0.21, y - h * 0.35],
    [x - 0.18, y - h * 0.35], [x - 0.14, y - h * 0.48]], colour);
  g.lineStyle(0.028, light, 0.8).moveTo(x - 0.08, y - h * 0.74).lineTo(x + 0.09, y - h * 0.53)
    .moveTo(x - 0.14, y - h * 0.52).lineTo(x + 0.14, y - h * 0.52);
  g.lineStyle(0.075, colour, 0.95).moveTo(x + 0.12, y - h * 0.72).lineTo(x + 0.32, y - h * 0.62)
    .moveTo(x - 0.12, y - h * 0.71).lineTo(x - 0.28, y - h * 0.58);
  g.lineStyle(0, 0, 0);
  g.beginFill(0xd9b389).drawCircle(x + 0.04, y - h * 0.865, 0.112)
    .drawCircle(x + 0.33, y - h * 0.62, 0.045).drawCircle(x - 0.28, y - h * 0.58, 0.045).endFill();
  g.beginFill(INK).drawCircle(x + 0.1, y - h * 0.875, 0.023).endFill();
  if (hat) {
    g.lineStyle(0.024, 0x70593a, 0.9);
    polygon(g, [[x - 0.29, y - h * 0.91], [x, y - h * 1.04], [x + 0.29, y - h * 0.91]], 0xc6a362);
    g.lineStyle(0.025, 0xe7c17e).moveTo(x - 0.22, y - h * 0.928).lineTo(x + 0.22, y - h * 0.928);
  } else g.beginFill(INK).drawEllipse(x - 0.075, y - h * 0.96, 0.22, 0.075).endFill();
  g.lineStyle(0, 0, 0);
}

function wheel(g, x, y, r) {
  g.lineStyle(0.04, INK, 1).beginFill(0x42382e).drawCircle(x, y, r).endFill();
  g.lineStyle(0.028, 0x9a7850, 0.9).beginFill(0xbe9960).drawCircle(x, y, r * 0.8).endFill();
  g.lineStyle(0.025, 0x65482d, 0.95);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    g.moveTo(x + Math.cos(a) * r * 0.22, y + Math.sin(a) * r * 0.22)
      .lineTo(x + Math.cos(a) * r * 0.77, y + Math.sin(a) * r * 0.77);
  }
  g.lineStyle(0, 0, 0);
  g.beginFill(0x48362a).drawCircle(x, y, r * 0.23).endFill();
  g.beginFill(0xb8b0a1).drawCircle(x - r * 0.05, y - r * 0.05, r * 0.09).endFill();
}

/**
 * One part of a cart, drawn in its own frame: x from the rear wheel (−base/2) to the front wheel (+base/2), y = 0 at
 * the wheels' centres, up negative.
 */
export function paintPart(part) {
  const s = new Sprite(),
    g = s.graphics,
    b = part.base / 2,
    r = part.radius,
    ground = r;
  switch (part.look) {
    case 'porter':
      // A carrying pole over the shoulder, a basket at each end.
      figure(g, 0, ground, 1.65);
      g.lineStyle(0.05, 0x6d5330, 1).moveTo(-0.7, ground - 1.25).lineTo(0.7, ground - 1.3);
      g.lineStyle(0.03, INK, 0.9).beginFill(0xb58f4c, 1).drawRect(-0.85, ground - 0.75, 0.32, 0.32).drawRect(0.53, ground - 0.8, 0.32, 0.32).endFill();
      g.moveTo(-0.7, ground - 1.25).lineTo(-0.7, ground - 0.75).moveTo(0.7, ground - 1.3).lineTo(0.7, ground - 0.8);
      g.lineStyle(0, 0, 0);
      break;
    case 'barrow':
      wheel(g, b - 0.1, 0, r);
      g.lineStyle(0.05, INK, 1).beginFill(0x8b6a3e, 1).drawRect(-b + 0.1, -0.55, part.base - 0.3, 0.32).endFill();
      g.beginFill(0xd0b47a, 1).drawRect(-b + 0.2, -0.85, part.base - 0.55, 0.32).endFill();
      g.moveTo(-b + 0.1, -0.4).lineTo(-b - 0.35, -0.6);
      g.lineStyle(0, 0, 0);
      figure(g, -b - 0.45, ground, 1.6);
      break;
    case 'sedan':
      figure(g, -b, ground, 1.6, { hat: false, colour: 0x7b2c22 });
      figure(g, b, ground, 1.6, { hat: false, colour: 0x7b2c22 });
      g.lineStyle(0.05, 0x5b3d1f, 1).moveTo(-b - 0.2, ground - 1.3).lineTo(b + 0.2, ground - 1.3);
      g.lineStyle(0.04, INK, 1).beginFill(C.cinnabar, 1).drawRect(-0.6, ground - 2.0, 1.2, 1.0).endFill();
      g.beginFill(C.gold, 1).moveTo(-0.75, ground - 2.0).lineTo(0, ground - 2.35).lineTo(0.75, ground - 2.0).lineTo(-0.75, ground - 2.0).endFill();
      g.beginFill(C.gold, 1).drawRect(-0.15, ground - 1.75, 0.3, 0.45).endFill();
      g.lineStyle(0, 0, 0);
      break;
    case 'horse':
    case 'ox': {
      const ox = part.look === 'ox',
        body = ox ? 0x4a3b2f : 0x8c5a32,
        h = ox ? 0.85 : 1.0;
      g.lineStyle(0.07, INK, 1);
      for (const lx of [-b + 0.1, -b + 0.3, b - 0.3, b - 0.1]) g.moveTo(lx, ground).lineTo(lx, ground - h * 0.55);
      g.lineStyle(0.04, INK, 1).beginFill(body, 1).drawEllipse(-b - 0.05, ground - h - 0.35, part.base + 0.1, 0.62).endFill();
      // Neck and head toward the front.
      g.moveTo(b - 0.2, ground - h - 0.1).lineTo(b + 0.35, ground - h - (ox ? 0.15 : 0.75)).lineTo(b + 0.6, ground - h - (ox ? 0.05 : 0.55)).lineTo(b + 0.15, ground - h + 0.15);
      g.beginFill(body, 1).drawEllipse(b + 0.25, ground - h - (ox ? 0.25 : 0.85), 0.45, 0.32).endFill();
      if (ox) g.lineStyle(0.05, 0xe8dcc0, 1).moveTo(b + 0.35, ground - h - 0.35).curveTo(b + 0.6, ground - h - 0.65, b + 0.75, ground - h - 0.45);
      else g.lineStyle(0.06, INK, 1).moveTo(-b - 0.1, ground - h - 0.15).lineTo(-b - 0.35, ground - h + 0.25);
      g.lineStyle(0, 0, 0);
      figure(g, b + 0.9, ground, 1.6);
      break;
    }
    case 'cart':
    case 'oxcart':
    case 'stonecart':
      g.lineStyle(0.05, INK, 1).beginFill(0x7a5634, 1).drawRect(-b - 0.2, -r - 0.35, part.base + 0.4, 0.4).endFill();
      g.moveTo(b + 0.2, -r - 0.15).lineTo(b + 0.75, -r - 0.05);
      if (part.look === 'stonecart')
        for (let i = 0; i < 3; i++) g.beginFill(0x9a9a8c, 1).drawRect(-b + i * 0.62, -r - 0.95, 0.56, 0.6).endFill();
      else if (part.look === 'oxcart') g.beginFill(0xd7bd77, 1).drawEllipse(-b - 0.1, -r - 1.15, part.base + 0.2, 0.85).endFill();
      else {
        g.beginFill(0x5b6a74, 1).drawRect(-b, -r - 1.25, part.base, 0.9).endFill();
        g.beginFill(0x3b3a38, 1).moveTo(-b - 0.2, -r - 1.25).curveTo(0, -r - 1.75, b + 0.2, -r - 1.25).lineTo(-b - 0.2, -r - 1.25).endFill();
      }
      g.lineStyle(0, 0, 0);
      wheel(g, 0, 0, r);
      break;
    default:
      g.beginFill(C.inkSoft, 1).drawRect(-b, -1, part.base, 1).endFill();
  }
  return s;
}

/** A piece of a broken member, centred, along +x. */
export function paintDebris(material, length, thick) {
  const s = new Sprite(),
    g = s.graphics;
  g.lineStyle(0.02, INK, 0.8).beginFill(MATERIALS[material].colour, 1).drawRect(-length / 2, -thick / 2, length, Math.max(0.05, thick)).endFill();
  g.lineStyle(0, 0, 0);
  return s;
}

/** A trading sampan with ribbed sail, hull planking and rigging. */
export function paintBoat() {
  const s = new Sprite(), g = s.graphics;
  g.lineStyle(0.04, INK, 1);
  g.beginFill(0x765238).moveTo(-1.4, 0).lineTo(1.4, 0)
    .curveTo(1.1, 0.45, 0.8, 0.5).lineTo(-0.8, 0.5)
    .curveTo(-1.1, 0.45, -1.4, 0).endFill();
  g.lineStyle(0, 0, 0);
  polygon(g, [[-1.21, 0.12], [1.21, 0.12], [0.8, 0.43], [-0.8, 0.43]], 0x543827);
  g.lineStyle(0.025, 0xd4b176, 0.76).moveTo(-1.23, 0.11).lineTo(1.23, 0.11);
  g.lineStyle(0.04, INK, 0.94).moveTo(0, 0).lineTo(0, -2.6);
  g.beginFill(0xd2b378, 0.95).moveTo(0.05, -2.5).curveTo(0.68, -2.51, 1.0, -2.2)
    .lineTo(0.9, -0.5).curveTo(0.55, -0.45, 0.05, -0.6).lineTo(0.05, -2.5).endFill();
  g.lineStyle(0, 0, 0);
  polygon(g, [[0.72, -2.32], [0.97, -2.2], [0.9, -0.5], [0.69, -0.51]], 0xb18e5e, 0.72);
  g.lineStyle(0.024, 0x785737, 0.82);
  for (let y = -2.2; y < -0.6; y += 0.35) g.moveTo(0.05, y).curveTo(0.5, y + 0.095, 0.94, y + 0.08);
  g.moveTo(0, -2.6).lineTo(-1.08, -0.04).moveTo(0.92, -0.49).lineTo(1.13, -0.03);
  g.lineStyle(0, 0, 0);
  return s;
}
