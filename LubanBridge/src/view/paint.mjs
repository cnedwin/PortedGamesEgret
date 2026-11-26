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

/** One range of hills, its foot at `base`, rising to `height`, from `x0` to `x1`. */
function hills(g, rnd, x0, x1, base, height, fill, alpha) {
  g.lineStyle(0.04, INK, 0.35);
  g.beginFill(fill, alpha);
  g.moveTo(x0, base);
  let x = x0;
  while (x < x1) {
    const w = 3 + rnd() * 6,
      h = height * (0.45 + rnd() * 0.55);
    g.curveTo(x + w * 0.35, base - h * 1.05, x + w * 0.5, base - h);
    g.curveTo(x + w * 0.7, base - h * 0.95, x + w, base - h * (0.2 + rnd() * 0.25));
    x += w;
  }
  g.lineTo(x1, base);
  g.lineTo(x0, base);
  g.endFill();
  g.lineStyle(0, 0, 0);
}

/**
 * The still part of a level: sky, hills, water, banks, cliffs, towers, pier marks, the channel and the grid.
 * Returns a sprite in metres.
 */
export function paintScenery(level) {
  const s = new Sprite();
  const g = s.graphics,
    rnd = seeded(level.id),
    left = -40,
    right = level.span + 40,
    top = level.area.y0 * 0.5 - 40,
    bottom = level.bed + 40;
  // Silk, and a wash of sky: opaque bands, each painted once (translucent layers over the whole stage cost the most
  // under software rendering).
  const bands = 6,
    skyTop = top,
    skyBottom = Math.min(level.water, level.road.left.y) + 0.5;
  g.beginFill(C.silk, 1).drawRect(left, top, right - left, bottom - top).endFill();
  for (let i = 0; i < bands; i++) {
    const y0 = skyTop + ((skyBottom - skyTop) * i) / bands;
    g.beginFill(mixColour(C.dusk, C.silk, 0.42 - i * 0.07), 1).drawRect(left, y0, right - left, (skyBottom - skyTop) / bands + 0.01).endFill();
  }
  // Far hills in azurite, near ones in malachite.
  const horizon = level.water;
  hills(g, rnd, left, right, horizon, 10 + level.span * 0.15, mixColour(C.azurite, C.silk, 0.3), 1);
  hills(g, rnd, left, right, horizon + 0.5, 6 + level.span * 0.1, mixColour(C.malachite, C.silk, 0.42), 1);
  // Water: a band with ink ripples.
  g.beginFill(C.water, 1).drawRect(0, level.water, level.span, level.bed - level.water).endFill();
  g.lineStyle(0.025, INK, 0.25);
  for (let i = 0; i < level.span * 1.2; i++) {
    const x = rnd() * level.span,
      y = level.water + 0.2 + rnd() * (level.bed - level.water - 0.4),
      w = 0.4 + rnd() * 0.8;
    g.moveTo(x, y);
    g.curveTo(x + w / 2, y - 0.06, x + w, y);
  }
  g.lineStyle(0.05, INK, 0.5).moveTo(0, level.water).lineTo(level.span, level.water);
  g.lineStyle(0, 0, 0);
  // The ground: earth with stone courses and an ink edge, grass on top.
  for (const r of level.ground) {
    const x0 = Math.max(left, r.x0),
      x1 = Math.min(right, r.x1);
    // The banks and the bed go on down out of sight.
    const y1 = r.y1 >= level.bed + 3.9 ? bottom : Math.min(bottom, r.y1);
    g.beginFill(0x9c8460, 1).drawRect(x0, r.y0, x1 - x0, y1 - r.y0).endFill();
    g.lineStyle(0.03, INK, 0.3);
    for (let y = r.y0 + 0.45; y < Math.min(level.bed + 6, y1); y += 0.45 + rnd() * 0.25) {
      const a = x0 + rnd() * 2;
      g.moveTo(a, y).lineTo(Math.min(x1, a + 2 + rnd() * 4), y);
    }
    g.lineStyle(0.06, INK, 0.75).moveTo(x0, r.y0).lineTo(x1, r.y0);
    if (r.x1 < right) g.moveTo(x1, r.y0).lineTo(x1, Math.min(level.bed, y1));
    if (r.x0 > left) g.moveTo(x0, r.y0).lineTo(x0, Math.min(level.bed, y1));
    g.lineStyle(0, 0, 0);
    // Grass along the top edge.
    g.lineStyle(0.03, C.malachite, 0.9);
    for (let x = x0 + 0.1; x < x1; x += 0.25 + rnd() * 0.3) g.moveTo(x, r.y0).lineTo(x + 0.06, r.y0 - 0.12 - rnd() * 0.15);
    g.lineStyle(0, 0, 0);
  }
  // The roads on both banks, and their stone kerbs.
  g.beginFill(0x7d6a52, 1).drawRect(left, level.road.left.y, -left, 0.12).drawRect(level.span, level.road.right.y, 40, 0.12).endFill();
  // A willow on the left bank and reeds on the right, for the season.
  willow(g, -5.5, level.road.left.y, rnd);
  for (let i = 0; i < 9; i++) {
    const x = level.span + 1.5 + rnd() * 5;
    g.lineStyle(0.025, C.malachite, 0.9).moveTo(x, level.road.right.y).lineTo(x + 0.15, level.road.right.y - 0.7 - rnd() * 0.5);
  }
  g.lineStyle(0, 0, 0);
  // Gate towers on the gorge's edges.
  for (const [x, y] of level.towers) tower(g, x, y, x < level.span / 2 ? level.road.left.y : level.road.right.y);
  // The boats' channel: two poles and a dashed frame.
  if (level.channel) {
    const ch = level.channel,
      topY = level.water - ch.clear;
    g.lineStyle(0.06, C.cinnabar, 0.9);
    for (const x of [ch.x0, ch.x1]) g.moveTo(x, level.water + 0.3).lineTo(x, topY);
    for (let x = ch.x0; x < ch.x1; x += 0.4) g.moveTo(x, topY).lineTo(Math.min(ch.x1, x + 0.22), topY);
    g.lineStyle(0, 0, 0);
  }
  // Where piers may be raised: a faint column and a mark.
  for (const p of level.piers) {
    const x = p.x * 0.5,
      y = p.top * 0.5;
    g.lineStyle(0.04, INK, 0.45);
    for (let yy = y; yy < level.bed; yy += 0.35) g.moveTo(x - 0.6, yy).lineTo(x - 0.6, Math.min(level.bed, yy + 0.18)).moveTo(x + 0.6, yy).lineTo(x + 0.6, Math.min(level.bed, yy + 0.18));
    g.lineStyle(0, 0, 0);
  }
  // Anchors: cinnabar lacquer pegs.
  for (const [gx, gy] of level.anchors) {
    const x = gx * 0.5,
      y = gy * 0.5;
    g.beginFill(C.cinnabar, 1).drawCircle(x, y, 0.16).endFill();
    g.lineStyle(0.04, INK, 1).drawCircle(x, y, 0.16);
    g.lineStyle(0, 0, 0);
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

function willow(g, x, y, rnd) {
  g.lineStyle(0.12, INK, 0.9).moveTo(x, y).curveTo(x + 0.3, y - 1.5, x - 0.1, y - 3);
  g.lineStyle(0.03, C.malachite, 0.8);
  for (let i = 0; i < 26; i++) {
    const sx = x - 1.6 + rnd() * 3.2,
      sy = y - 3.2 + rnd() * 0.6;
    g.moveTo(sx, sy).curveTo(sx + 0.2, sy + 0.8, sx + 0.05, sy + 1.6 + rnd() * 0.8);
  }
  g.lineStyle(0, 0, 0);
}

/** A gate tower on a gorge's edge: a stone base, a timber hall and a roof whose eaves turn up. */
function tower(g, x, top, road) {
  const w = 2.6;
  g.beginFill(0x8f8a7c, 1).drawRect(x - w / 2, top + 1.2, w, road - top - 1.2).endFill();
  g.lineStyle(0.04, INK, 0.8).drawRect(x - w / 2, top + 1.2, w, road - top - 1.2);
  g.beginFill(0x8b3a2b, 1).drawRect(x - w / 2 + 0.25, top + 0.35, w - 0.5, 0.85).endFill();
  g.lineStyle(0.05, INK, 1);
  g.beginFill(0x3b3a38, 1).moveTo(x - w / 2 - 0.7, top + 0.15).curveTo(x - w / 2, top + 0.4, x - 0.6, top - 0.35).lineTo(x + 0.6, top - 0.35).curveTo(x + w / 2, top + 0.4, x + w / 2 + 0.7, top + 0.15).lineTo(x - w / 2 - 0.7, top + 0.15).endFill();
  g.lineStyle(0, 0, 0);
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
  if (material === 'rope') {
    g.lineStyle(t, fill, a).moveTo(0, 0).lineTo(length, 0);
    g.lineStyle(0.015, INK, 0.6 * a);
    for (let x = 0.05; x < length; x += 0.12) g.moveTo(x, -t / 2).lineTo(x + 0.06, t / 2);
  } else if (material === 'chain') {
    g.lineStyle(0.025, fill, a);
    for (let x = 0; x < length; x += 0.2) g.drawEllipse(x, -0.04, 0.22, 0.08);
  } else {
    g.beginFill(fill, a).drawRect(0, -t / 2, length, t).endFill();
    // The face of each material: plank seams, slab joints, bamboo rings, stone joints, timber grain.
    g.lineStyle(0.012, INK, 0.45 * a);
    const step = { plank: 0.45, slab: 0.5, bamboo: 0.4, stone: 0.5, wood: 0 }[material];
    if (step) for (let x = step; x < length - 0.05; x += step) g.moveTo(x, -t / 2).lineTo(x, t / 2);
    if (material === 'wood' || material === 'plank') g.moveTo(0.05, -t * 0.15).lineTo(length - 0.05, -t * 0.1);
    if (material === 'plank' || material === 'slab') {
      g.lineStyle(0.02, C.white, 0.35 * a).moveTo(0, -t / 2 + 0.02).lineTo(length, -t / 2 + 0.02);
    }
    g.lineStyle(0.02, INK, 0.85 * a).drawRect(0, -t / 2, length, t);
  }
  g.lineStyle(0, 0, 0);
  // Iron nails at both ends.
  g.beginFill(0x3c3a36, a).drawCircle(0, 0, 0.07).drawCircle(length, 0, 0.07).endFill();
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

/** A pontoon: a sampan hull under its node, with a little mat roof. */
export function paintPontoon() {
  const s = new Sprite(),
    g = s.graphics;
  g.lineStyle(0.04, INK, 1);
  g.beginFill(0x6b4a2c, 1).moveTo(-1.1, 0.05).lineTo(1.1, 0.05).curveTo(0.9, 0.55, 0.6, 0.6).lineTo(-0.6, 0.6).curveTo(-0.9, 0.55, -1.1, 0.05).endFill();
  g.beginFill(0xb59b62, 1).moveTo(-0.5, 0.05).curveTo(0, -0.45, 0.5, 0.05).lineTo(-0.5, 0.05).endFill();
  g.lineStyle(0, 0, 0);
  return s;
}

/** A built stone pier from its top down to below the riverbed. */
export function paintPier(x, top, bed) {
  const s = new Sprite(),
    g = s.graphics;
  g.beginFill(0x8f8a7c, 1).drawRect(x - 0.6, top, 1.2, bed - top + 0.5).endFill();
  g.lineStyle(0.02, INK, 0.5);
  for (let y = top + 0.4; y < bed; y += 0.4) g.moveTo(x - 0.6, y).lineTo(x + 0.6, y);
  g.lineStyle(0.04, INK, 0.9).drawRect(x - 0.6, top, 1.2, bed - top + 0.5);
  // A cutwater: the pointed upstream face.
  g.lineStyle(0, 0, 0);
  return s;
}

/** A figure: a straw hat, a body in ink-blue, legs; at its feet's middle, facing right. */
function figure(g, x, y, h, { colour = 0x34495e, hat = true } = {}) {
  g.lineStyle(0.06, INK, 1).moveTo(x - 0.1, y).lineTo(x, y - h * 0.45).lineTo(x + 0.12, y);
  g.lineStyle(0, 0, 0);
  g.beginFill(colour, 1).drawRect(x - 0.13, y - h * 0.8, 0.26, h * 0.38).endFill();
  g.beginFill(0xe3c9a0, 1).drawCircle(x, y - h * 0.88, 0.11).endFill();
  if (hat) g.beginFill(0xc8a85a, 1).moveTo(x - 0.28, y - h * 0.9).lineTo(x, y - h * 1.04).lineTo(x + 0.28, y - h * 0.9).lineTo(x - 0.28, y - h * 0.9).endFill();
}

function wheel(g, x, y, r) {
  g.lineStyle(0.05, INK, 1).beginFill(0x7a5634, 1).drawCircle(x, y, r).endFill();
  g.lineStyle(0.025, INK, 0.9);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    g.moveTo(x, y).lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  g.lineStyle(0, 0, 0);
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

/** A sampan with a mat sail, for the channel. */
export function paintBoat() {
  const s = new Sprite(),
    g = s.graphics;
  g.lineStyle(0.04, INK, 1);
  g.beginFill(0x5c4128, 1).moveTo(-1.4, 0).lineTo(1.4, 0).curveTo(1.1, 0.45, 0.8, 0.5).lineTo(-0.8, 0.5).curveTo(-1.1, 0.45, -1.4, 0).endFill();
  g.moveTo(0, 0).lineTo(0, -2.6);
  g.beginFill(0xc4a868, 0.95).moveTo(0.05, -2.5).lineTo(1.0, -2.2).lineTo(0.9, -0.5).lineTo(0.05, -0.6).lineTo(0.05, -2.5).endFill();
  g.lineStyle(0.02, INK, 0.6);
  for (let y = -2.2; y < -0.6; y += 0.35) g.moveTo(0.05, y).lineTo(0.95, y + 0.08);
  g.lineStyle(0, 0, 0);
  return s;
}
