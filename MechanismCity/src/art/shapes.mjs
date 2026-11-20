// 机关和弹丸的样子：每样都用引擎的 Graphics 画，原点在物体中心，随物理世界里的刚体移动和转动。
// What the mechanisms and pellets look like. Each is drawn with the engine's Graphics around its own
// middle, so the physics world can place and turn it as its body moves. Gradients give wood its grain
// light and stone its roundness; the colours keep to ink, lacquer, bronze and old gold.

export const INK = 0x1b1712;
export const LACQUER = 0xa8322a;
export const GOLD = 0xe6b65c;
export const BRONZE = 0x3f7a6e;
export const BRONZE_LIGHT = 0x86c2a6;
export const WOOD = 0x8a5a32;
export const WOOD_LIGHT = 0xc08a52;
export const WOOD_DARK = 0x56361e;
export const STONE = 0x7d8379;
export const STONE_LIGHT = 0xb6baa8;
export const STONE_DARK = 0x4a4f4b;

const stops = (...pairs) => pairs.map(([offset, color, alpha = 1]) => ({ offset, color, alpha }));

/** A loose wooden block: planks lit from above, iron corners. */
export function drawBlock(g, w, h) {
  g.lineStyle(2, INK, 1);
  g.beginLinearGradientFill(0, -h / 2, 0, h / 2, stops([0, WOOD_LIGHT], [0.5, WOOD], [1, WOOD_DARK])).drawRect(-w / 2, -h / 2, w, h).endFill();
  g.lineStyle(1.5, WOOD_DARK, 0.9);
  for (let y = -h / 2 + h / 3; y < h / 2 - 2; y += h / 3) g.moveTo(-w / 2 + 3, y).lineTo(w / 2 - 3, y);
  g.lineStyle(0);
  const c = Math.min(w, h) * 0.22;
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.beginFill(0x3a3a3a, 1).drawRect(sx > 0 ? w / 2 - c : -w / 2, sy > 0 ? h / 2 - c : -h / 2, c, c).endFill();
}

/** A crate of thin boards with a cross brace: it breaks under a hard blow. */
export function drawCrate(g, w, h) {
  g.lineStyle(2, INK, 1);
  g.beginLinearGradientFill(-w / 2, 0, w / 2, 0, stops([0, 0xb48250], [1, 0x8a5c34])).drawRect(-w / 2, -h / 2, w, h).endFill();
  g.lineStyle(3, WOOD_DARK, 1);
  g.drawRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6);
  g.moveTo(-w / 2 + 4, -h / 2 + 4).lineTo(w / 2 - 4, h / 2 - 4);
  g.moveTo(w / 2 - 4, -h / 2 + 4).lineTo(-w / 2 + 4, h / 2 - 4);
  g.lineStyle(0);
}

/** A round stone, shaded as a ball, with a chisel mark so its rolling shows. */
export function drawStone(g, r) {
  g.lineStyle(2, INK, 1);
  g.beginRadialGradientFill(-r * 0.35, -r * 0.4, r * 1.5, stops([0, STONE_LIGHT], [0.55, STONE], [1, STONE_DARK])).drawCircle(0, 0, r).endFill();
  g.lineStyle(2.5, STONE_DARK, 0.9);
  g.moveTo(-r * 0.55, -r * 0.1).lineTo(-r * 0.1, r * 0.05).lineTo(r * 0.2, -r * 0.25);
  g.moveTo(r * 0.15, r * 0.45).lineTo(r * 0.5, r * 0.3);
  g.lineStyle(0);
}

/** The pellets of the bow: iron, the heavier one, and the thunder pellet that bursts. */
export function drawPellet(g, type, r) {
  if (type === 'thunder') {
    g.beginRadialGradientFill(-r * 0.3, -r * 0.3, r * 1.4, stops([0, 0xe8f6ff], [0.5, 0x5aa8e8], [1, 0x1a3f78])).drawCircle(0, 0, r).endFill();
    g.lineStyle(1.5, 0xfff6c0, 1);
    g.moveTo(-r * 0.4, -r * 0.5).lineTo(r * 0.1, -r * 0.05).lineTo(-r * 0.15, r * 0.1).lineTo(r * 0.4, r * 0.55);
    g.lineStyle(0);
    return;
  }
  const dark = type === 'heavy' ? 0x241c18 : 0x2a2f36;
  g.beginRadialGradientFill(-r * 0.35, -r * 0.35, r * 1.5, stops([0, 0xd8dde4], [0.45, 0x7b8592], [1, dark])).drawCircle(0, 0, r).endFill();
}

/** The lock: a bronze plate with a keyhole and a ring of runes; open, its keyhole burns gold. */
export function drawLock(g, w, h, open) {
  g.clear();
  g.lineStyle(3, INK, 1);
  g.beginLinearGradientFill(0, -h / 2, 0, h / 2, stops([0, open ? 0x9ad8b8 : BRONZE_LIGHT], [1, BRONZE])).drawRoundRect(-w / 2, -h / 2, w, h, 12, 12).endFill();
  g.lineStyle(2, open ? GOLD : 0x23453f, 1);
  g.drawRoundRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 8, 8);
  g.lineStyle(0);
  const r = Math.min(w, h) * 0.22;
  g.beginFill(open ? GOLD : INK, 1).drawCircle(0, -r * 0.3, r * 0.55).endFill();
  g.beginFill(open ? GOLD : INK, 1).moveTo(-r * 0.3, -r * 0.1).lineTo(r * 0.3, -r * 0.1).lineTo(r * 0.45, r * 0.9).lineTo(-r * 0.45, r * 0.9).lineTo(-r * 0.3, -r * 0.1).endFill();
  // Runes along the rim: short strokes of the craft's marks.
  g.lineStyle(2, open ? 0xfff0c0 : 0x2c5a50, 1);
  const n = Math.max(6, Math.round((w + h) / 18));
  for (let i = 0; i < n; i++) {
    const t = i / n,
      x = -w / 2 + 10 + t * (w - 20);
    g.moveTo(x, -h / 2 + 10).lineTo(x + 4, -h / 2 + 15);
    g.moveTo(x, h / 2 - 10).lineTo(x + 4, h / 2 - 15);
  }
  g.lineStyle(0);
}

/** A pressure plate set into the floor: bronze, sunk when pressed. */
export function drawPlate(g, w, h, on) {
  g.clear();
  g.lineStyle(2, INK, 1);
  g.beginFill(on ? 0x6f6150 : 0x3a332b, 1).drawRect(-w / 2 - 4, -h / 2 + (on ? 4 : 0), w + 8, h).endFill();
  g.beginLinearGradientFill(0, -h / 2, 0, h / 2, stops([0, on ? GOLD : BRONZE_LIGHT], [1, on ? 0xa87a30 : BRONZE])).drawRect(-w / 2, -h / 2 + (on ? 4 : -2), w, h).endFill();
  g.lineStyle(0);
}

/** A gate of bronze bars between two rails. */
export function drawGate(g, w, h) {
  g.lineStyle(2, INK, 1);
  g.beginFill(0x2b2622, 1).drawRect(-w / 2, -h / 2, w, h).endFill();
  g.lineStyle(0);
  for (let x = -w / 2 + 3; x < w / 2 - 2; x += Math.max(6, w / 3)) g.beginLinearGradientFill(x, 0, x + 6, 0, stops([0, BRONZE_LIGHT], [1, BRONZE])).drawRect(x, -h / 2 + 4, 5, h - 8).endFill();
  g.beginFill(GOLD, 1).drawRect(-w / 2, -h / 2, w, 6).endFill();
  g.beginFill(GOLD, 1).drawRect(-w / 2, h / 2 - 6, w, 6).endFill();
}

/** The plank of a seesaw. */
export function drawPlank(g, w, h) {
  g.lineStyle(2, INK, 1);
  g.beginLinearGradientFill(0, -h / 2, 0, h / 2, stops([0, WOOD_LIGHT], [1, WOOD_DARK])).drawRect(-w / 2, -h / 2, w, h).endFill();
  g.lineStyle(0);
  g.beginFill(GOLD, 1).drawCircle(0, 0, 4).endFill();
  for (const x of [-w / 2 + 8, w / 2 - 8]) g.beginFill(0x2b2622, 1).drawRect(x - 3, -h / 2, 6, h).endFill();
}

/** The post a seesaw turns on: a wedge of lacquered wood. */
export function drawPost(g) {
  g.lineStyle(2, INK, 1);
  g.beginLinearGradientFill(0, -10, 0, 22, stops([0, 0xc0463a], [1, 0x6a1c18])).moveTo(0, -10).lineTo(14, 22).lineTo(-14, 22).lineTo(0, -10).endFill();
  g.lineStyle(0);
}

/** A spring board: a board on a coil, squeezed by `squeeze` from 0 to 1. */
export function drawSpring(g, w, h, squeeze = 0) {
  g.clear();
  const top = -h / 2 - 10 + squeeze * 8;
  g.lineStyle(3, 0x6c7a80, 1);
  const turns = Math.max(3, Math.round(w / 14));
  for (let i = 0; i <= turns; i++) {
    const x = -w / 2 + 6 + (i / turns) * (w - 12);
    g.moveTo(x, h / 2).lineTo(x + 5, top + 6);
  }
  g.lineStyle(2, INK, 1);
  g.beginLinearGradientFill(0, top, 0, top + 8, stops([0, 0xf2d48a], [1, 0xb07c34])).drawRect(-w / 2, top, w, 8).endFill();
  g.beginFill(0x2b2622, 1).drawRect(-w / 2, h / 2 - 4, w, 4).endFill();
  g.lineStyle(0);
}

/** A slope of dressed stone, through its points around its middle. */
export function drawRamp(g, points) {
  const top = Math.min(...points.map((p) => p.y)),
    bottom = Math.max(...points.map((p) => p.y));
  g.lineStyle(2, INK, 1);
  g.beginLinearGradientFill(0, top, 0, bottom, stops([0, 0x8c9284], [1, 0x50564f]));
  g.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) g.lineTo(point.x, point.y);
  g.lineTo(points[0].x, points[0].y).endFill();
  g.lineStyle(0);
}

/** The crossbow: a stock and a bow of lacquered wood, its string drawn back by `draw` (0 to 1). */
export function drawBow(g, draw = 0.6) {
  g.clear();
  g.lineStyle(2, INK, 1);
  g.beginLinearGradientFill(0, -6, 0, 6, stops([0, WOOD_LIGHT], [1, WOOD_DARK])).drawRect(-30, -5, 58, 10).endFill();
  g.beginFill(0x2b2622, 1).drawRect(-34, -8, 10, 16).endFill();
  g.lineStyle(5, LACQUER, 1);
  g.moveTo(14, -30).curveTo(26, 0, 14, 30);
  g.lineStyle(1.5, 0xf0e2c0, 1);
  const back = 14 - draw * 26;
  g.moveTo(14, -30).lineTo(back, 0).lineTo(14, 30);
  g.lineStyle(0);
  g.beginFill(GOLD, 1).drawCircle(14, -30, 3).drawCircle(14, 30, 3).endFill();
}

/** The stand the crossbow turns on. */
export function drawStand(g) {
  g.lineStyle(2, INK, 1);
  g.beginFill(0x3a2c22, 1).moveTo(-16, 22).lineTo(16, 22).lineTo(4, -2).lineTo(-4, -2).lineTo(-16, 22).endFill();
  g.beginFill(GOLD, 1).drawCircle(0, 0, 5).endFill();
  g.lineStyle(0);
}
