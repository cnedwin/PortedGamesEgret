// Static, etched stage furnishings and the rectangle-only travelling note artwork.
export const INK = 0x131c1b,
  LACQUER = 0x281820,
  RED = 0xa8332d,
  CORAL = 0xff8c6d,
  GOLD = 0xf1c777,
  IVORY = 0xffedd0,
  BRONZE = 0x9b6838,
  JADE = 0x77c3ab,
  ASH = 0xe6a9a1,
  NOTE_HALF = 23;

export const rect = (g, color, x, y, width, height, alpha = 1) =>
  g.beginFill(color, alpha).drawRect(x, y, width, height).endFill();

const ellipse = (g, color, x, y, width, height, alpha = 1) =>
  g.beginFill(color, alpha).drawEllipse(x, y, width, height).endFill();
const stops = (light, middle, dark) => [
  { offset: 0, color: light }, { offset: 0.53, color: middle }, { offset: 1, color: dark }
];

export function drawLane(g, { laneTop, laneBottom, laneY, hitX }) {
  const height = laneBottom - laneTop;
  rect(g, 0x0b1010, 0, laneTop - 5, 960, height + 14, 0.92);
  rect(g, 0x22302d, 0, laneTop, 960, height, 0.95);
  rect(g, INK, 0, laneY - 35, 960, 70, 0.88);
  rect(g, 0x2b2320, 0, laneTop, hitX + 64, height, 0.76);
  rect(g, BRONZE, 0, laneTop - 3, 960, 2, 0.88);
  rect(g, GOLD, 0, laneBottom, 960, 2, 0.61);
  rect(g, GOLD, 0, laneY - 1, 960, 2, 0.12);
  rect(g, GOLD, hitX + 64, laneTop + 1, 1, height - 2, 0.29);
  for (const y of [laneTop + 8, laneBottom - 12]) {
    rect(g, BRONZE, 14, y, 70, 2, 0.65);
    rect(g, GOLD, 14, y + 3, 42, 1, 0.32);
    for (const x of [88, 94, 100, 916, 922, 928]) rect(g, BRONZE, x, y, 2, 2);
  }
}

/** Only plain rectangles enter the moving-note batch, including a gong's rotated seal. */
export function drawSeal(g, note) {
  const half = note.big ? 28 : note.kind === 'gong' ? 19 : NOTE_HALF;
  const face = note.kind === 'gong' ? 0xa46a2d : RED;
  const edge = note.kind === 'gong' ? 0xe8ba69 : 0xe77966;
  rect(g, 0x100d0d, -half - 2, -half + 1, 2 * half + 4, 2 * half + 4);
  rect(g, IVORY, -half, -half, 2 * half, 2 * half);
  rect(g, face, -half + 2.5, -half + 2.5, 2 * half - 5, 2 * half - 5);
  if (note.big) {
    rect(g, GOLD, -half + 6, -half + 6, 2 * half - 12, 2 * half - 12);
    rect(g, 0x7c4926, -half + 8, -half + 8, 2 * half - 16, 2 * half - 16);
  }
  g.beginFill(edge, 0.8)
    .drawRect(-half + 4, -half + 4, 7, 1.5)
    .drawRect(-half + 4, -half + 4, 1.5, 7)
    .drawRect(half - 11, half - 5.5, 7, 1.5)
    .drawRect(half - 5.5, half - 11, 1.5, 7)
    .endFill();
}

/** The roll strip is 100 units wide here and is scaled to the remaining time by the view. */
export function drawStrip(g) {
  rect(g, 0x170d0e, 0, -18, 100, 38, 0.95);
  rect(g, GOLD, 0, -17, 100, 34);
  rect(g, 0x92392c, 0, -14, 100, 28);
  rect(g, 0xe39f68, 0, -10, 100, 3);
  rect(g, 0x602425, 0, 8, 100, 4);
}

export function drawReceiver(g) {
  ellipse(g, 0x130d11, -49, -46, 98, 98);
  ellipse(g, 0x87583e, -46, -46, 92, 92);
  g.beginRadialGradientFill(9, -12, 59, stops(0x6a4933, 0x3b2928, 0x241819))
    .drawCircle(0, 0, 42)
    .endFill();
  g.lineStyle(1.5, IVORY, 0.5).drawCircle(0, 0, 40).lineStyle(0);
  g.lineStyle(2, GOLD, 0.82).drawCircle(0, 0, 32).lineStyle(0);
  g.lineStyle(1, BRONZE, 0.8).drawCircle(0, 0, 25).lineStyle(0);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    ellipse(g, GOLD, 43 * Math.cos(angle) - 1.5, 43 * Math.sin(angle) - 1.5, 3, 3);
  }
  rect(g, GOLD, -1, -55, 2, 110, 0.67);
  rect(g, IVORY, -6, -53, 12, 3);
  rect(g, IVORY, -6, 50, 12, 3);
  rect(g, IVORY, -5, -1, 10, 2, 0.62);
}

export function drawStick(g, gong) {
  rect(g, 0x2b1719, 0, -2, 39, 4);
  rect(g, 0xbe7343, 0, -2, 39, 1.5);
  if (gong) {
    rect(g, 0x7b3633, 32, -6, 12, 12);
    rect(g, 0xcb6854, 34, -5, 8, 3);
  } else rect(g, IVORY, 29, -2, 11, 2.5);
}

export function drawImpact(g, kind, big) {
  const color = kind === 'drum' ? CORAL : GOLD;
  const radius = big ? 53 : 40;
  g.lineStyle(big ? 3.5 : 3, color, 0.93).drawCircle(0, 0, radius).lineStyle(0);
  g.lineStyle(1.5, IVORY, 0.62).drawCircle(0, 0, radius - 8).lineStyle(0);
  g.lineStyle(2, color, 0.9);
  for (let i = 0; i < (big ? 8 : 4); i++) {
    const angle = (i + 0.5) * (big ? Math.PI / 4 : Math.PI / 2);
    g.moveTo(Math.cos(angle) * (radius + 5), Math.sin(angle) * (radius + 5))
      .lineTo(Math.cos(angle) * (radius + 13), Math.sin(angle) * (radius + 13));
  }
  g.lineStyle(0);
}
