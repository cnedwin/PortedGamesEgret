// Garment and accessory painters. Each entry draws one wearable piece on a
// body of either build, in two dye colours (c1 main, c2 trim). The catalogue
// data that goes with each id (name, price, style) lives in src/data/items.mjs.
import { CX, halfWidth, torsoPoints, sleevePoints, legLine, metrics } from './body.mjs';
import { smooth, sym, tube, poly, paint, stroke, shade, mix, rgba, ellipse, rrect, star } from './draw.mjs';

// ------------------------------------------------------------ shared pieces

const lerp = (a, b, t) => a + (b - a) * t;

/** Leg centre x and half width at height y. */
function legAt(B, s, y) {
  const line = legLine(B, s);
  for (let i = 1; i < line.length; i++) {
    if (y <= line[i][1] || i === line.length - 1) {
      const t = Math.max(0, Math.min(1.2, (y - line[i - 1][1]) / (line[i][1] - line[i - 1][1])));
      return [lerp(line[i - 1][0], line[i][0], t), lerp(line[i - 1][2], line[i][2], t)];
    }
  }
  return [line[0][0], line[0][2]];
}

function torso(g, B, c, opt, paintOpt = {}) {
  const path = smooth(torsoPoints(B, opt));
  paint(g, path, c, { y0: 236, y1: opt.hem ?? 506, ...paintOpt });
  return path;
}

function sleeves(g, B, c, len, ease, cuff = 0, band) {
  for (const s of [-1, 1]) {
    const path = smooth(sleevePoints(B, s, len, ease, cuff));
    paint(g, path, c, { y0: 250, y1: 250 + 270 * len, x0: s < 0 ? CX - 110 : CX + 30, x1: s < 0 ? CX - 30 : CX + 110 });
    if (band) {
      // Coloured band at the end of the sleeve.
      const y = 262 + 250 * len;
      g.save();
      g.clip(path);
      g.fillStyle = band;
      g.fillRect(CX + s * 40 - 60, y - 12, 120, 30);
      g.restore();
      stroke(g, path, shade(c, -0.45), 1.6);
    }
  }
}

/** Skin showing at a neckline. depth is the lowest point of the opening. */
function neckline(g, B, skin, depth, wide = 0) {
  const p = smooth(
    sym(
      [
        [CX - B.nw - 2 - wide, 233],
        [CX - B.nw + 2 - wide * 0.4, 236 + (depth - 236) * 0.55],
        [CX, depth, depth > 270 ? 1 : 0],
      ],
      CX,
    ),
  );
  paint(g, p, skin, { y0: 225, y1: depth, side: 0, top: shade(skin, -0.12), bottom: skin, line: 1.3 });
}

function buttons(g, x, y0, y1, n, c) {
  for (let i = 0; i < n; i++) {
    const y = lerp(y0, y1, n === 1 ? 0 : i / (n - 1));
    g.fillStyle = c;
    g.fill(ellipse(x, y, 2.6, 2.6));
    stroke(g, ellipse(x, y, 2.6, 2.6), shade(c, -0.5), 0.8);
  }
}

/** Horizontal ribbing clipped to a band of a garment. */
function rib(g, path, y0, y1, c) {
  g.save();
  g.clip(path);
  g.fillStyle = rgba(shade(c, -0.3), 0.35);
  g.fillRect(0, y0, 400, y1 - y0);
  for (let x = 90; x < 310; x += 6)
    stroke(
      g,
      poly(
        [
          [x, y0],
          [x, y1],
        ],
        false,
      ),
      shade(c, -0.45),
      0.8,
      0.5,
    );
  g.restore();
}

// ------------------------------------------------------------ trousers and skirts

function trousers(g, B, c, { w = 5, end = 892, taper = 0 } = {}) {
  const half = [
    [CX - B.waist - 2, 388, 1],
    [CX - halfWidth(B, 430) - 2 - w * 0.3, 430],
    [CX - B.hip - 2 - w * 0.5, 470],
  ];
  const ys = [560, 700, 785].filter(y => y < end - 20);
  const width = y => legAt(B, -1, y)[1] + w - taper * Math.max(0, (y - 700) / 200);
  for (const y of ys) half.push([legAt(B, -1, y)[0] - width(y), y]);
  half.push([legAt(B, -1, end)[0] - width(end), end, 1], [legAt(B, -1, end)[0] + width(end) * 0.92, end, 1]);
  for (const y of ys.reverse()) half.push([legAt(B, -1, y)[0] + width(y) * 0.9, y]);
  half.push([CX - 1.5, 518, 1]);
  const path = smooth(sym(half, CX), true, 0.4);
  paint(g, path, c, { y0: 388, y1: end });
  // Fly and waistband.
  stroke(
    g,
    smooth(
      [
        [CX, 396],
        [CX + 1, 470],
        [CX, 512],
      ],
      false,
    ),
    shade(c, -0.4),
    1.1,
    0.7,
  );
  stroke(
    g,
    smooth(
      [
        [CX - B.waist - 3, 400],
        [CX, 404],
        [CX + B.waist + 3, 400],
      ],
      false,
    ),
    shade(c, -0.4),
    1.1,
    0.7,
  );
  return path;
}

function skirt(g, B, c, { hem = 560, flare = 26 } = {}) {
  const half = [
    [CX - B.waist - 2, 388, 1],
    [CX - B.hip - 5, 452],
    [CX - B.hip - flare, hem - 4, 1],
    [CX - (B.hip + flare) * 0.5, hem + 5],
  ];
  const path = smooth(
    [
      ...half,
      [CX, hem + 1],
      ...half
        .slice()
        .reverse()
        .map(([x, y, k]) => [2 * CX - x, y, k]),
    ],
    true,
    0.4,
  );
  paint(g, path, c, { y0: 388, y1: hem });
  return path;
}

function pleats(g, B, path, c, hem, flare, n = 9) {
  g.save();
  g.clip(path);
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * 2 - 1;
    stroke(
      g,
      poly(
        [
          [CX + t * (B.waist + 1), 396],
          [CX + t * (B.hip + flare), hem + 8],
        ],
        false,
      ),
      shade(c, -0.42),
      1.1,
      0.55,
    );
    g.fillStyle = rgba('#20143a', 0.07);
    g.fill(
      poly([
        [CX + t * (B.waist + 1), 396],
        [CX + t * (B.hip + flare), hem + 8],
        [CX + (t + 0.11) * (B.hip + flare), hem + 8],
      ]),
    );
  }
  g.restore();
}

// ------------------------------------------------------------ jackets

/** Two front panels of an open or V-fronted jacket. */
function jacket(g, B, c, { ease = 6, hem = 478, open = 12, breakY = 0, flare = 0 }) {
  const paths = [];
  for (const s of [-1, 1]) {
    const pts = [
      [CX + s * (B.nw + 5), 234],
      [CX + s * B.sh * 0.64, 242],
      [CX + s * (B.sh + ease * 0.6), 257],
    ];
    for (const y of [292, 320, 396, 462, 560, 660])
      if (y < hem - 8) pts.push([CX + s * (halfWidth(B, Math.min(y, 506), ease) + (y > 470 ? (flare * (y - 470)) / 250 : 0)), y]);
    pts.push([CX + s * (halfWidth(B, Math.min(hem, 506), ease) + (hem > 470 ? (flare * (hem - 470)) / 250 : 0)), hem, 1]);
    if (breakY) pts.push([CX + s * 1, hem, 1], [CX + s * 1, breakY, 1]);
    else pts.push([CX + s * open, hem, 1], [CX + s * open, 300], [CX + s * (open - 2), 262]);
    const path = smooth(pts, true, 0.4);
    paint(g, path, c, { y0: 236, y1: hem });
    paths.push(path);
  }
  return paths;
}

function lapels(g, B, c, breakY, width = 26) {
  for (const s of [-1, 1]) {
    const p = poly([
      [CX + s * (B.nw + 4), 234],
      [CX + s * 2, breakY],
      [CX + s * (width - 2), breakY - 44],
      [CX + s * (width + 6), 276],
      [CX + s * (width - 4), 268],
      [CX + s * (width + 2), 254],
    ]);
    paint(g, p, shade(c, 0.07), { y0: 234, y1: breakY, side: 0.08, line: 1.4, stroke: shade(c, -0.45) });
  }
}

// ------------------------------------------------------------ shoes and legwear

function shoe(g, B, s, c, { top = 888, sole, toe = 20, heel = 0, soleH = 6 }) {
  const x = CX + s * B.hip * 0.42;
  const pts = [
    [x - s * 10, top, 1],
    [x - s * 12, 934 - heel * 0.3],
    [x - s * 9, 941],
    [x + s * toe, 942],
    [x + s * (toe + 3), 934],
    [x + s * 10, 906],
    [x + s * 10, top, 1],
  ];
  const path = smooth(pts, true, 0.45);
  paint(g, path, c, { y0: top, y1: 944, side: 0.1 });
  if (sole) {
    g.save();
    g.clip(path);
    g.fillStyle = sole;
    g.fillRect(x - 40, 942 - soleH, 80, soleH + 4);
    g.restore();
    stroke(g, path, shade(c, -0.45), 1.6);
  }
  if (heel) {
    g.fillStyle = shade(c, -0.3);
    g.fill(
      poly([
        [x - s * 11, 930],
        [x - s * 7, 930],
        [x - s * 9, 944 + heel],
        [x - s * 11, 944 + heel],
      ]),
    );
  }
  return x;
}

function legwear(g, B, c, from, alpha = 1, band) {
  g.save();
  g.globalAlpha = alpha;
  for (const s of [-1, 1]) {
    const line = legLine(B, s).map(([x, y, w]) => [x, y, w + 0.8]);
    const path = smooth(tube(line));
    g.save();
    g.beginPath();
    g.rect(0, from, 400, 1000);
    g.clip();
    paint(g, path, c, { y0: from, y1: 900 });
    const x = CX + s * B.hip * 0.42;
    paint(
      g,
      smooth([
        [x - 9, 892],
        [x - 11, 925],
        [x - 4, 940],
        [x + s * 16, 940],
        [x + s * 18, 930],
        [x + 9, 898],
      ]),
      c,
      { y0: 890, y1: 945, side: 0, line: 0 },
    );
    if (band) {
      g.fillStyle = band;
      g.save();
      g.clip(path);
      g.fillRect(0, from, 400, 9);
      g.restore();
    }
    g.restore();
    const [lx, lw] = legAt(B, s, from);
    stroke(
      g,
      poly(
        [
          [lx - lw - 1, from],
          [lx + lw + 1, from],
        ],
        false,
      ),
      shade(c, -0.4),
      1.3,
    );
  }
  g.restore();
}

// ------------------------------------------------------------ the catalogue of painters

/** slot: top | bottom | dress | outer | shoes | legs | acc. `only` limits a piece to one build. */
export const GARMENTS = {
  // ---- tops
  shirt: {
    slot: 'top',
    c: ['#ffffff', '#dfe6f5'],
    tuck: true,
    torso(g, B, c1, c2, spec) {
      torso(g, B, c1, { ease: 3, hem: 452 });
      neckline(g, B, spec.skin, 262);
      for (const s of [-1, 1])
        paint(
          g,
          poly([
            [CX + s * (B.nw + 6), 232],
            [CX + s * 1, 262],
            [CX + s * 22, 270],
          ]),
          c2,
          { y0: 230, y1: 270, side: 0, line: 1.3, stroke: shade(c1, -0.45) },
        );
      stroke(
        g,
        poly(
          [
            [CX, 264],
            [CX, 452],
          ],
          false,
        ),
        shade(c1, -0.35),
        1.1,
        0.7,
      );
      buttons(g, CX, 290, 430, 5, c2);
    },
    sleeves(g, B, c1) {
      sleeves(g, B, c1, 1, 3.5, 1);
    },
  },
  tee: {
    slot: 'top',
    c: ['#f4f6fb', '#ff8a5c'],
    torso(g, B, c1, c2, spec) {
      const p = torso(g, B, c1, { ease: 4, hem: 448 });
      g.save();
      g.clip(p);
      g.fillStyle = c2;
      g.fillRect(0, 306, 400, 20);
      g.fillStyle = rgba(c2, 0.5);
      g.fillRect(0, 331, 400, 5);
      g.restore();
      stroke(g, p, shade(c1, -0.45), 1.6);
      neckline(g, B, spec.skin, 256, 3);
      stroke(
        g,
        smooth(
          sym(
            [
              [CX - B.nw - 6, 233],
              [CX - B.nw - 1, 250],
              [CX, 259],
            ],
            CX,
          ),
          false,
        ),
        c2,
        3,
      );
    },
    sleeves(g, B, c1, c2) {
      sleeves(g, B, c1, 0.3, 5.5, 1, c2);
    },
  },
  hoodie: {
    slot: 'top',
    c: ['#8fb6ff', '#ffffff'],
    torso(g, B, c1, c2, spec) {
      const p = torso(g, B, c1, { ease: 9, hem: 458 });
      rib(g, p, 444, 460, c1);
      neckline(g, B, spec.skin, 254, 2);
      // Hood resting on the shoulders.
      for (const s of [-1, 1])
        paint(
          g,
          smooth([
            [CX + s * (B.nw - 2), 226],
            [CX + s * (B.nw + 22), 236],
            [CX + s * (B.nw + 26), 258],
            [CX + s * 10, 276],
            [CX + s * 1, 262, 1],
          ]),
          shade(c1, -0.06),
          { y0: 226, y1: 276, side: 0.06 },
        );
      paint(
        g,
        smooth(
          [
            [CX - 38, 398, 1],
            [CX + 38, 398, 1],
            [CX + 46, 440, 1],
            [CX - 46, 440, 1],
          ],
          true,
          0.2,
        ),
        shade(c1, -0.05),
        { y0: 398, y1: 440, side: 0 },
      );
      for (const s of [-1, 1]) {
        stroke(
          g,
          smooth(
            [
              [CX + s * 8, 270],
              [CX + s * 10, 300],
              [CX + s * 9, 326],
            ],
            false,
          ),
          c2,
          2.2,
        );
        g.fillStyle = shade(c2, -0.2);
        g.fill(ellipse(CX + s * 9, 329, 2.6, 4));
      }
    },
    sleeves(g, B, c1) {
      sleeves(g, B, c1, 1, 7.5, -3);
    },
  },
  sweater: {
    slot: 'top',
    c: ['#f5e1c4', '#ffffff'],
    torso(g, B, c1, c2, spec) {
      const p = torso(g, B, c1, { ease: 6, hem: 456 });
      rib(g, p, 442, 458, c1);
      g.save();
      g.clip(p);
      for (let x = CX - 60; x <= CX + 60; x += 20)
        stroke(
          g,
          smooth(
            [
              [x, 250],
              [x + 3, 340],
              [x, 440],
            ],
            false,
          ),
          shade(c1, -0.3),
          1,
          0.3,
        );
      g.restore();
      neckline(g, B, spec.skin, 286);
      for (const s of [-1, 1])
        paint(
          g,
          poly([
            [CX + s * (B.nw + 5), 232],
            [CX + s * 1, 258],
            [CX + s * 18, 264],
          ]),
          c2,
          { y0: 230, y1: 266, side: 0, line: 1.2, stroke: shade(c2, -0.4) },
        );
      stroke(
        g,
        smooth(
          sym(
            [
              [CX - B.nw - 4, 234],
              [CX - B.nw + 1, 264],
              [CX, 288, 1],
            ],
            CX,
          ),
          false,
        ),
        shade(c1, -0.3),
        3.2,
      );
    },
    sleeves(g, B, c1) {
      sleeves(g, B, c1, 1, 5.5, -1);
    },
  },
  turtleneck: {
    slot: 'top',
    c: ['#3b3f58', '#8088b0'],
    torso(g, B, c1) {
      torso(g, B, c1, { ease: 3.5, hem: 452 });
      const neck = smooth(
        sym(
          [
            [CX - B.nw - 3, 210],
            [CX - B.nw - 4, 240],
            [CX - B.nw - 7, 250, 1],
          ],
          CX,
        ),
      );
      paint(g, neck, c1, { y0: 208, y1: 250, side: 0.08 });
      for (let y = 218; y < 248; y += 7)
        stroke(
          g,
          smooth(
            [
              [CX - B.nw - 3, y],
              [CX, y + 2],
              [CX + B.nw + 3, y],
            ],
            false,
          ),
          shade(c1, -0.4),
          0.9,
          0.5,
        );
    },
    sleeves(g, B, c1) {
      sleeves(g, B, c1, 1, 3.5, 0);
    },
  },
  jersey: {
    slot: 'top',
    c: ['#ff6b5c', '#ffffff'],
    torso(g, B, c1, c2, spec) {
      const p = torso(g, B, c1, { ease: 4, hem: 452 });
      g.save();
      g.clip(p);
      g.fillStyle = c2;
      for (const s of [-1, 1])
        g.fill(
          poly([
            [CX + s * (B.bust + 2), 290],
            [CX + s * (B.bust + 14), 290],
            [CX + s * (B.hip + 12), 460],
            [CX + s * (B.hip - 2), 460],
          ]),
        );
      g.font = '800 44px "Trebuchet MS", sans-serif';
      g.textAlign = 'center';
      g.fillText('07', CX, 372);
      g.restore();
      stroke(g, p, shade(c1, -0.45), 1.6);
      neckline(g, B, spec.skin, 268, 5);
      stroke(
        g,
        smooth(
          sym(
            [
              [CX - B.nw - 8, 233],
              [CX - B.nw - 2, 256],
              [CX, 271, 1],
            ],
            CX,
          ),
          false,
        ),
        c2,
        3,
      );
    },
  },
  sailor: {
    slot: 'top',
    c: ['#ffffff', '#31447c'],
    only: 'f',
    torso(g, B, c1, c2, spec) {
      torso(g, B, c1, { ease: 4, hem: 420, flare: 3 });
      const collar = smooth(
        sym(
          [
            [CX - B.nw - 2, 232],
            [CX - B.sh + 8, 250],
            [CX - B.sh + 14, 286, 1],
            [CX - 24, 290],
            [CX, 310, 1],
          ],
          CX,
        ),
        true,
        0.35,
      );
      paint(g, collar, c2, { y0: 232, y1: 310, side: 0.08 });
      g.save();
      g.clip(collar);
      stroke(g, collar, '#ffffff', 9);
      stroke(g, collar, c2, 4.5);
      g.restore();
      neckline(g, B, spec.skin, 284);
      // Scarf knot and tails.
      const red = mix(c2, '#e8455f', 0.85);
      paint(
        g,
        poly([
          [CX - 3, 304],
          [CX - 16, 346],
          [CX - 5, 342],
        ]),
        red,
        { y0: 300, y1: 346, side: 0 },
      );
      paint(
        g,
        poly([
          [CX + 3, 304],
          [CX + 15, 350],
          [CX + 4, 344],
        ]),
        red,
        { y0: 300, y1: 350, side: 0 },
      );
      paint(g, ellipse(CX, 306, 7, 6), shade(red, 0.1), { y0: 300, y1: 312, side: 0 });
    },
    sleeves(g, B, c1, c2) {
      sleeves(g, B, c1, 0.3, 6, 1, c2);
    },
  },
  blouse: {
    slot: 'top',
    c: ['#fff5f8', '#f285a5'],
    tuck: true,
    only: 'f',
    torso(g, B, c1, c2, spec) {
      const p = torso(g, B, c1, { ease: 2.5, hem: 452 });
      g.save();
      g.clip(p);
      for (const dx of [-7, 7])
        stroke(
          g,
          smooth(
            [
              [CX + dx, 262],
              [CX + dx * 1.3, 340],
              [CX + dx, 450],
            ],
            false,
          ),
          shade(c1, -0.25),
          1,
          0.6,
        );
      g.restore();
      neckline(g, B, spec.skin, 250);
      for (const s of [-1, 1])
        paint(
          g,
          smooth([
            [CX + s * 1, 250, 1],
            [CX + s * (B.nw + 4), 232],
            [CX + s * (B.nw + 22), 246],
            [CX + s * 20, 266],
          ]),
          '#ffffff',
          { y0: 230, y1: 268, side: 0, line: 1.3, stroke: shade(c2, -0.2) },
        );
      // Ribbon bow.
      for (const s of [-1, 1]) {
        paint(
          g,
          smooth([
            [CX, 262, 1],
            [CX + s * 20, 252],
            [CX + s * 22, 274],
          ]),
          c2,
          { y0: 250, y1: 276, side: 0 },
        );
        paint(
          g,
          poly([
            [CX + s * 1, 266],
            [CX + s * 9, 300],
            [CX + s * 2, 296],
          ]),
          shade(c2, -0.08),
          { y0: 264, y1: 300, side: 0 },
        );
      }
      paint(g, ellipse(CX, 263, 5, 5), shade(c2, 0.12), { y0: 258, y1: 268, side: 0 });
    },
    sleeves(g, B, c1, c2) {
      sleeves(g, B, c1, 0.24, 10, -4, c2);
    },
  },

  // ---- bottoms
  slacks: {
    slot: 'bottom',
    c: ['#3c4563', '#2b3250'],
    bottom(g, B, c1) {
      trousers(g, B, c1, { w: 5 });
      for (const s of [-1, 1])
        stroke(
          g,
          smooth(
            [
              [legAt(B, s, 540)[0], 540],
              [legAt(B, s, 700)[0], 700],
              [legAt(B, s, 885)[0], 885],
            ],
            false,
          ),
          shade(c1, -0.35),
          1,
          0.5,
        );
    },
  },
  jeans: {
    slot: 'bottom',
    c: ['#5b7fb8', '#f2d58a'],
    bottom(g, B, c1, c2) {
      const p = trousers(g, B, c1, { w: 3.5, taper: 2 });
      g.save();
      g.clip(p);
      g.fillStyle = shade(c1, 0.25);
      g.fillRect(0, 868, 400, 30);
      for (const s of [-1, 1]) {
        const o = poly(
          [
            [CX + s * (B.hip + 2), 420],
            [CX + s * (B.hip - 16), 452],
            [CX + s * (B.hip + 2), 470],
          ],
          false,
        );
        stroke(g, o, c2, 1.2, 0.9);
        g.setLineDash([4, 3]);
        stroke(
          g,
          smooth(
            [
              [legAt(B, s, 480)[0] + s * legAt(B, s, 480)[1], 480],
              [legAt(B, s, 700)[0] + s * (legAt(B, s, 700)[1] + 1), 700],
              [legAt(B, s, 890)[0] + s * (legAt(B, s, 890)[1] + 1), 890],
            ],
            false,
          ),
          c2,
          1,
          0.8,
        );
        g.setLineDash([]);
        const fade = g.createRadialGradient(legAt(B, s, 600)[0], 600, 4, legAt(B, s, 600)[0], 600, 60);
        fade.addColorStop(0, rgba('#ffffff', 0.22));
        fade.addColorStop(1, rgba('#ffffff', 0));
        g.fillStyle = fade;
        g.fillRect(0, 520, 400, 180);
      }
      g.restore();
      stroke(g, p, shade(c1, -0.45), 1.6);
    },
  },
  cargo: {
    slot: 'bottom',
    c: ['#7d8a6a', '#565f49'],
    bottom(g, B, c1, c2) {
      trousers(g, B, c1, { w: 11, taper: 5 });
      for (const s of [-1, 1]) {
        const [x, w] = legAt(B, s, 620);
        paint(g, rrect(x + s * (w - 6) - 13, 590, 26, 46, 3), shade(c1, 0.05), { y0: 590, y1: 636, side: 0.05, line: 1.2, stroke: c2 });
        stroke(
          g,
          poly(
            [
              [x + s * (w - 6) - 13, 604],
              [x + s * (w - 6) + 13, 604],
            ],
            false,
          ),
          c2,
          1.1,
        );
        const [ax, aw] = legAt(B, s, 880);
        stroke(
          g,
          poly(
            [
              [ax - aw - 6, 876],
              [ax + aw + 5, 876],
            ],
            false,
          ),
          c2,
          2.2,
        );
      }
    },
  },
  shorts: {
    slot: 'bottom',
    c: ['#4c5878', '#ffffff'],
    bottom(g, B, c1, c2) {
      const p = trousers(g, B, c1, { w: 9, end: 606 });
      g.save();
      g.clip(p);
      g.fillStyle = c2;
      for (const s of [-1, 1]) g.fillRect(CX + s * (B.hip + 5) - 3, 400, 6, 220);
      g.restore();
      stroke(g, p, shade(c1, -0.45), 1.6);
    },
  },
  pleated: {
    slot: 'bottom',
    c: ['#3d4f8a', '#ffffff'],
    only: 'f',
    bottom(g, B, c1, c2) {
      const p = skirt(g, B, c1, { hem: 566, flare: 26 });
      pleats(g, B, p, c1, 566, 26);
      g.save();
      g.clip(p);
      stroke(
        g,
        smooth(
          [
            [CX - B.hip - 26, 548],
            [CX, 556],
            [CX + B.hip + 26, 548],
          ],
          false,
        ),
        c2,
        3,
        0.9,
      );
      g.restore();
      stroke(g, p, shade(c1, -0.45), 1.6);
    },
  },
  longskirt: {
    slot: 'bottom',
    c: ['#e9d9c2', '#c9a77a'],
    only: 'f',
    bottom(g, B, c1, c2) {
      const p = skirt(g, B, c1, { hem: 806, flare: 36 });
      g.save();
      g.clip(p);
      for (const t of [-0.7, -0.3, 0.15, 0.55])
        stroke(
          g,
          smooth(
            [
              [CX + t * B.waist, 400],
              [CX + t * (B.hip + 20), 600],
              [CX + t * (B.hip + 34), 810],
            ],
            false,
          ),
          shade(c1, -0.35),
          1.2,
          0.45,
        );
      g.fillStyle = rgba(c2, 0.55);
      g.fillRect(0, 778, 400, 8);
      g.restore();
      paint(g, rrect(CX - B.waist - 3, 386, (B.waist + 3) * 2, 13, 3), c2, { y0: 386, y1: 400, side: 0.05, line: 1.2 });
    },
  },

  // ---- dresses
  sundress: {
    slot: 'dress',
    c: ['#fff1c9', '#ff9bb0'],
    only: 'f',
    dress(g, B, c1, c2) {
      const half = [
        [CX - 24, 268, 1],
        [CX - halfWidth(B, 292) - 1, 296],
        [CX - B.bust - 1, 320],
        [CX - B.waist - 1, 396],
        [CX - B.hip - 12, 472],
        [CX - B.hip - 46, 650, 1],
        [CX - (B.hip + 46) / 2, 660],
      ];
      const p = smooth(
        [
          ...half,
          [CX, 655],
          ...half
            .slice()
            .reverse()
            .map(([x, y, k]) => [2 * CX - x, y, k]),
        ],
        true,
        0.4,
      );
      for (const s of [-1, 1])
        stroke(
          g,
          poly(
            [
              [CX + s * 22, 272],
              [CX + s * (B.nw + 12), 238],
            ],
            false,
          ),
          shade(c1, -0.12),
          5,
        );
      paint(g, p, c1, { y0: 268, y1: 660 });
      g.save();
      g.clip(p);
      for (const t of [-0.75, -0.4, 0, 0.4, 0.75])
        stroke(
          g,
          smooth(
            [
              [CX + t * B.waist, 404],
              [CX + t * (B.hip + 46), 664],
            ],
            false,
          ),
          shade(c1, -0.3),
          1.1,
          0.4,
        );
      g.fillStyle = rgba(c2, 0.6);
      g.fillRect(0, 628, 400, 7);
      g.fillStyle = c2;
      g.fillRect(0, 388, 400, 12);
      g.restore();
      stroke(g, p, shade(c1, -0.45), 1.6);
      for (const s of [-1, 1])
        paint(
          g,
          smooth([
            [CX + 30, 394, 1],
            [CX + 30 + s * 16, 384],
            [CX + 30 + s * 18, 404],
          ]),
          c2,
          { y0: 384, y1: 404, side: 0, line: 1.2 },
        );
    },
  },
  gown: {
    slot: 'dress',
    c: ['#2b2d52', '#f2d58a'],
    only: 'f',
    dress(g, B, c1, c2) {
      const half = [
        [CX - B.nw - 3, 236, 1],
        [CX - B.bust + 4, 276],
        [CX - B.bust - 1, 318],
        [CX - B.waist - 1, 396],
        [CX - B.hip - 2, 470],
        [CX - B.hip - 4, 700],
        [CX - B.hip - 34, 926, 1],
      ];
      const p = smooth(sym(half, CX), true, 0.4);
      paint(g, p, c1, { y0: 236, y1: 926 });
      g.save();
      g.clip(p);
      // A scatter of sequins that thickens towards the hem.
      for (let i = 0; i < 90; i++) {
        const y = 420 + ((i * 97) % 500),
          x = CX + (((i * 53) % 190) - 95);
        g.fillStyle = rgba(c2, 0.25 + ((i * 31) % 60) / 100);
        g.fill(star(x, y, 2.6, 1, 4));
      }
      stroke(
        g,
        smooth(
          [
            [CX + 14, 560],
            [CX + 26, 760],
            [CX + 44, 930],
          ],
          false,
        ),
        shade(c1, -0.5),
        1.4,
        0.8,
      );
      g.restore();
      stroke(g, p, shade(c1, -0.45), 1.6);
      stroke(
        g,
        smooth(
          [
            [CX - B.waist - 1, 394],
            [CX, 400],
            [CX + B.waist + 1, 394],
          ],
          false,
        ),
        c2,
        3,
      );
    },
  },

  // ---- outerwear
  blazer: {
    slot: 'outer',
    c: ['#2f3a63', '#e8c25a'],
    torso(g, B, c1, c2) {
      jacket(g, B, c1, { ease: 5, hem: 480, breakY: 338 });
      lapels(g, B, c1, 338);
      buttons(g, CX + 3, 366, 410, 2, c2);
      paint(g, star(CX - B.bust + 12, 318, 6, 2.6), c2, { y0: 310, y1: 326, side: 0, line: 0.8 });
      for (const s of [-1, 1])
        stroke(
          g,
          poly(
            [
              [CX + s * (B.waist + 8), 432],
              [CX + s * (B.waist - 10), 434],
            ],
            false,
          ),
          shade(c1, -0.4),
          1.2,
        );
    },
    sleeves(g, B, c1) {
      sleeves(g, B, c1, 1, 5, 0);
    },
  },
  cardigan: {
    slot: 'outer',
    c: ['#f6dfe6', '#d98aa5'],
    torso(g, B, c1, c2) {
      const paths = jacket(g, B, c1, { ease: 7.5, hem: 486, breakY: 372 });
      for (const p of paths) rib(g, p, 472, 488, c1);
      stroke(
        g,
        smooth(
          [
            [CX - B.nw - 5, 236],
            [CX - 12, 310],
            [CX, 372],
            [CX, 486],
          ],
          false,
        ),
        c2,
        4.5,
        0.9,
      );
      stroke(
        g,
        smooth(
          [
            [CX + B.nw + 5, 236],
            [CX + 12, 310],
            [CX, 372],
          ],
          false,
        ),
        c2,
        4.5,
        0.9,
      );
      buttons(g, CX, 392, 466, 4, '#ffffff');
    },
    sleeves(g, B, c1) {
      sleeves(g, B, c1, 1, 6.5, 1);
    },
  },
  varsity: {
    slot: 'outer',
    c: ['#b23a4a', '#f7f1e6'],
    torso(g, B, c1, c2) {
      const paths = jacket(g, B, c1, { ease: 9, hem: 448, open: 15 });
      for (const p of paths) {
        g.save();
        g.clip(p);
        g.fillStyle = c2;
        g.fillRect(0, 434, 400, 16);
        g.fillStyle = c1;
        g.fillRect(0, 439, 400, 3);
        g.restore();
        stroke(g, p, shade(c1, -0.45), 1.6);
      }
      for (const s of [-1, 1])
        stroke(
          g,
          smooth(
            [
              [CX + s * (B.nw + 2), 232],
              [CX + s * 14, 256],
              [CX + s * 15, 290],
            ],
            false,
          ),
          c2,
          5,
        );
      g.fillStyle = c2;
      g.font = '800 26px Georgia, serif';
      g.textAlign = 'center';
      g.fillText('E', CX - B.bust + 14, 330);
    },
    sleeves(g, B, c1, c2) {
      sleeves(g, B, c2, 1, 7.5, -3, c1);
    },
  },
  trench: {
    slot: 'outer',
    c: ['#cdb590', '#7a5a3a'],
    torso(g, B, c1, c2) {
      jacket(g, B, c1, { ease: 7, hem: 736, open: 15, flare: 18 });
      lapels(g, B, c1, 350, 30);
      for (const s of [-1, 1]) {
        const w = halfWidth(B, 400, 7);
        paint(
          g,
          poly([
            [CX + s * 15, 392],
            [CX + s * (w + 1), 388],
            [CX + s * (w + 1), 406],
            [CX + s * 15, 410],
          ]),
          c2,
          { y0: 388, y1: 410, side: 0.06, line: 1.2 },
        );
      }
      paint(g, rrect(CX + 15, 388, 14, 24, 3), shade(c2, 0.3), { y0: 388, y1: 412, side: 0, line: 1.2 });
      buttons(g, CX + 26, 300, 360, 3, c2);
      buttons(g, CX - 26, 300, 360, 3, c2);
    },
    sleeves(g, B, c1) {
      sleeves(g, B, c1, 1, 6, 1);
    },
  },
  denim: {
    slot: 'outer',
    c: ['#6f93c9', '#f2d58a'],
    torso(g, B, c1, c2) {
      const paths = jacket(g, B, c1, { ease: 6.5, hem: 442, open: 15 });
      for (const [i, p] of paths.entries()) {
        const s = i ? 1 : -1;
        g.save();
        g.clip(p);
        g.setLineDash([4, 3]);
        stroke(
          g,
          poly(
            [
              [CX + s * 19, 240],
              [CX + s * 19, 442],
            ],
            false,
          ),
          c2,
          1.1,
        );
        stroke(
          g,
          poly(
            [
              [CX + s * 15, 426],
              [CX + s * 100, 426],
            ],
            false,
          ),
          c2,
          1.1,
        );
        g.setLineDash([]);
        paint(g, rrect(CX + s * 44 - 14, 300, 28, 26, 3), shade(c1, 0.08), { y0: 300, y1: 326, side: 0, line: 1.1, stroke: c2 });
        g.restore();
      }
      for (const s of [-1, 1])
        paint(
          g,
          poly([
            [CX + s * (B.nw + 3), 230],
            [CX + s * 13, 262],
            [CX + s * 34, 268],
            [CX + s * (B.nw + 20), 240],
          ]),
          shade(c1, 0.1),
          { y0: 230, y1: 268, side: 0, line: 1.3 },
        );
    },
    sleeves(g, B, c1) {
      sleeves(g, B, c1, 1, 6.5, -1);
    },
  },

  // ---- shoes
  sneakers: {
    slot: 'shoes',
    c: ['#ffffff', '#ff6b7a'],
    shoes(g, B, c1, c2) {
      for (const s of [-1, 1]) {
        const x = shoe(g, B, s, c1, { top: 884, sole: shade(c1, -0.12), toe: 21, soleH: 7 });
        stroke(
          g,
          smooth(
            [
              [x - s * 4, 912],
              [x + s * 6, 922],
              [x + s * 15, 920],
            ],
            false,
          ),
          c2,
          3.2,
        );
        for (const d of [0, 6])
          stroke(
            g,
            poly(
              [
                [x - s * 2, 894 + d],
                [x + s * 7, 897 + d],
              ],
              false,
            ),
            shade(c1, -0.4),
            1,
          );
      }
    },
  },
  loafers: {
    slot: 'shoes',
    c: ['#5a3a2e', '#e8c25a'],
    shoes(g, B, c1, c2) {
      for (const s of [-1, 1]) {
        const x = shoe(g, B, s, c1, { top: 900, sole: shade(c1, -0.4), toe: 19, soleH: 4 });
        stroke(
          g,
          poly(
            [
              [x + s * 2, 914],
              [x + s * 13, 918],
            ],
            false,
          ),
          c2,
          3,
        );
      }
    },
  },
  boots: {
    slot: 'shoes',
    c: ['#3a3340', '#8a7f94'],
    shoes(g, B, c1, c2) {
      for (const s of [-1, 1]) {
        const line = legLine(B, s)
          .filter(p => p[1] > 760)
          .map(([x, y, w]) => [x, y, w + 3]);
        const [tx, tw] = legAt(B, s, 800);
        paint(g, smooth(tube([[tx, 800, tw + 3], ...line])), c1, { y0: 800, y1: 900 });
        const x = shoe(g, B, s, c1, { top: 880, sole: shade(c1, -0.5), toe: 20, soleH: 7 });
        for (let y = 820; y < 900; y += 14)
          stroke(
            g,
            poly(
              [
                [x - 4, y],
                [x + 4, y + 3],
              ],
              false,
            ),
            c2,
            1.4,
          );
      }
    },
  },
  heels: {
    slot: 'shoes',
    c: ['#d94a6a', '#ffffff'],
    only: 'f',
    shoes(g, B, c1) {
      for (const s of [-1, 1]) {
        const x = shoe(g, B, s, c1, { top: 916, toe: 20, heel: 4 });
        stroke(
          g,
          poly(
            [
              [x - s * 9, 902],
              [x + s * 9, 904],
            ],
            false,
          ),
          c1,
          2.4,
        );
      }
    },
  },

  // ---- legwear
  socks: {
    slot: 'legs',
    c: ['#ffffff', '#31447c'],
    legs(g, B, c1, c2) {
      legwear(g, B, c1, 838, 1, c2);
    },
  },
  kneesocks: {
    slot: 'legs',
    c: ['#2b2f48', '#ffffff'],
    only: 'f',
    legs(g, B, c1, c2) {
      legwear(g, B, c1, 716, 1, c2);
    },
  },
  thighhighs: {
    slot: 'legs',
    c: ['#ffffff', '#f2a0b8'],
    only: 'f',
    legs(g, B, c1, c2) {
      legwear(g, B, c1, 612, 1, c2);
    },
  },
  tights: {
    slot: 'legs',
    c: ['#2a2538', '#2a2538'],
    only: 'f',
    legs(g, B, c1) {
      legwear(g, B, c1, 470, 0.72);
    },
  },

  // ---- accessories
  glasses: {
    slot: 'acc',
    zone: 'face',
    layer: 'face',
    c: ['#3a3340', '#ffffff'],
    draw(g, B, c1) {
      for (const s of [-1, 1]) {
        const lens = rrect(CX + s * 26 - 17, 147, 34, 26, 9);
        g.fillStyle = rgba('#ffffff', 0.14);
        g.fill(lens);
        stroke(g, lens, c1, 2.3);
        stroke(
          g,
          poly(
            [
              [CX + s * 43, 156],
              [CX + s * 56, 152],
            ],
            false,
          ),
          c1,
          2,
        );
      }
      stroke(
        g,
        smooth(
          [
            [CX - 9, 158],
            [CX, 155],
            [CX + 9, 158],
          ],
          false,
        ),
        c1,
        2,
      );
    },
  },
  shades: {
    slot: 'acc',
    zone: 'face',
    layer: 'face',
    c: ['#1d1a2b', '#b08cff'],
    draw(g, B, c1, c2) {
      for (const s of [-1, 1]) {
        const lens = smooth(
          [
            [CX + s * 8, 148, 1],
            [CX + s * 46, 146, 1],
            [CX + s * 44, 170],
            [CX + s * 26, 177],
            [CX + s * 11, 168],
          ],
          true,
          0.4,
        );
        const grad = g.createLinearGradient(0, 146, 0, 178);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, mix(c1, c2, 0.75));
        g.fillStyle = grad;
        g.globalAlpha = 0.92;
        g.fill(lens);
        g.globalAlpha = 1;
        stroke(g, lens, shade(c1, -0.3), 1.8);
        stroke(
          g,
          poly(
            [
              [CX + s * 46, 150],
              [CX + s * 57, 150],
            ],
            false,
          ),
          c1,
          2.2,
        );
      }
      stroke(
        g,
        poly(
          [
            [CX - 8, 151],
            [CX + 8, 151],
          ],
          false,
        ),
        c1,
        2.4,
      );
    },
  },
  beret: {
    slot: 'acc',
    zone: 'head',
    layer: 'head',
    c: ['#b23a4a', '#7c2533'],
    draw(g, B, c1, c2) {
      paint(
        g,
        smooth([
          [CX - 70, 86],
          [CX - 52, 40],
          [CX - 4, 20],
          [CX + 52, 30],
          [CX + 78, 62],
          [CX + 66, 92],
          [CX + 10, 80],
          [CX - 30, 84],
        ]),
        c1,
        { y0: 20, y1: 95, x0: CX - 80, x1: CX + 80 },
      );
      stroke(
        g,
        smooth(
          [
            [CX - 66, 88],
            [CX - 28, 82],
            [CX + 12, 79],
            [CX + 64, 90],
          ],
          false,
        ),
        c2,
        4,
      );
      stroke(
        g,
        poly(
          [
            [CX + 4, 22],
            [CX + 8, 10],
          ],
          false,
        ),
        c2,
        3,
      );
    },
  },
  cap: {
    slot: 'acc',
    zone: 'head',
    layer: 'head',
    c: ['#2f3a63', '#ffffff'],
    draw(g, B, c1, c2) {
      paint(
        g,
        smooth([
          [CX - 44, 112],
          [CX + 40, 96],
          [CX + 98, 112],
          [CX + 96, 124],
          [CX + 20, 122],
          [CX - 44, 122],
        ]),
        shade(c1, -0.1),
        { y0: 96, y1: 124, side: 0.05 },
      );
      paint(
        g,
        smooth([
          [CX - 66, 108, 1],
          [CX - 62, 62],
          [CX - 30, 34],
          [CX + 14, 30],
          [CX + 52, 52],
          [CX + 66, 104, 1],
          [CX, 100],
        ]),
        c1,
        { y0: 30, y1: 110, x0: CX - 70, x1: CX + 70 },
      );
      g.fillStyle = c2;
      g.fill(star(CX + 6, 70, 11, 4.6));
    },
  },
  bow: {
    slot: 'acc',
    zone: 'head',
    layer: 'head',
    c: ['#e8455f', '#ffffff'],
    only: 'f',
    draw(g, B, c1) {
      const x = CX + 46,
        y = 58;
      for (const s of [-1, 1]) {
        paint(
          g,
          smooth([
            [x, y, 1],
            [x + s * 30, y - 20],
            [x + s * 36, y + 4],
            [x + s * 26, y + 18],
          ]),
          c1,
          { y0: y - 22, y1: y + 20, side: 0.06 },
        );
        paint(
          g,
          poly([
            [x + s * 2, y + 4],
            [x + s * 16, y + 40],
            [x + s * 4, y + 34],
          ]),
          shade(c1, -0.08),
          { y0: y, y1: y + 40, side: 0 },
        );
      }
      paint(g, ellipse(x, y, 7, 8), shade(c1, 0.12), { y0: y - 8, y1: y + 8, side: 0 });
    },
  },
  headphones: {
    slot: 'acc',
    zone: 'head',
    layer: 'head',
    c: ['#30303e', '#7df0d0'],
    draw(g, B, c1, c2) {
      stroke(
        g,
        smooth(
          [
            [CX - 68, 146],
            [CX - 64, 70],
            [CX, 26],
            [CX + 64, 70],
            [CX + 68, 146],
          ],
          false,
        ),
        shade(c1, -0.3),
        9,
      );
      stroke(
        g,
        smooth(
          [
            [CX - 68, 146],
            [CX - 64, 70],
            [CX, 26],
            [CX + 64, 70],
            [CX + 68, 146],
          ],
          false,
        ),
        c1,
        6,
      );
      for (const s of [-1, 1]) {
        paint(g, rrect(CX + s * 66 - 13, 128, 26, 50, 11), c1, { y0: 128, y1: 178, side: 0.08, x0: CX + s * 66 - 13, x1: CX + s * 66 + 13 });
        g.fillStyle = c2;
        g.fill(ellipse(CX + s * 68, 153, 4, 13));
      }
    },
  },
  hairpin: {
    slot: 'acc',
    zone: 'hair',
    layer: 'head',
    c: ['#ffd76a', '#ffffff'],
    draw(g, B, c1, c2) {
      paint(g, star(CX - 46, 118, 11, 4.8), c1, { y0: 106, y1: 130, side: 0, line: 1.1 });
      g.fillStyle = c2;
      g.fill(ellipse(CX - 48, 115, 2, 2));
      paint(g, star(CX - 34, 132, 5.5, 2.4), c1, { y0: 126, y1: 138, side: 0, line: 0.9 });
    },
  },
  necklace: {
    slot: 'acc',
    zone: 'neck',
    layer: 'neck',
    c: ['#ffd76a', '#8fd3ff'],
    draw(g, B, c1, c2) {
      stroke(
        g,
        smooth(
          [
            [CX - B.nw - 1, 240],
            [CX - 8, 262],
            [CX, 268],
            [CX + 8, 262],
            [CX + B.nw + 1, 240],
          ],
          false,
        ),
        c1,
        1.6,
      );
      paint(g, star(CX, 273, 6.5, 2.8, 4), c2, { y0: 266, y1: 280, side: 0, line: 0.9, stroke: shade(c1, -0.3) });
    },
  },
  tie: {
    slot: 'acc',
    zone: 'neck',
    layer: 'neck',
    c: ['#a8323f', '#e8c25a'],
    draw(g, B, c1, c2) {
      const blade = poly([
        [CX - 5, 270],
        [CX + 5, 270],
        [CX + 9, 372],
        [CX, 386],
        [CX - 9, 372],
      ]);
      paint(g, blade, c1, { y0: 262, y1: 386, side: 0.08, x0: CX - 10, x1: CX + 10 });
      g.save();
      g.clip(blade);
      for (let y = 286; y < 380; y += 22)
        stroke(
          g,
          poly(
            [
              [CX - 12, y + 8],
              [CX + 12, y - 4],
            ],
            false,
          ),
          c2,
          2.6,
        );
      g.restore();
      paint(
        g,
        poly([
          [CX - 8, 258],
          [CX + 8, 258],
          [CX + 5, 272],
          [CX - 5, 272],
        ]),
        shade(c1, 0.08),
        { y0: 258, y1: 272, side: 0 },
      );
    },
  },
  scarf: {
    slot: 'acc',
    zone: 'neck',
    layer: 'body',
    c: ['#e8455f', '#ffffff'],
    draw(g, B, c1, c2) {
      const tail = smooth(
        [
          [CX + 12, 244, 1],
          [CX + 36, 248],
          [CX + 40, 356, 1],
          [CX + 14, 362, 1],
        ],
        true,
        0.3,
      );
      paint(g, tail, shade(c1, -0.06), { y0: 244, y1: 362, x0: CX, x1: CX + 44 });
      g.save();
      g.clip(tail);
      g.fillStyle = c2;
      g.fillRect(0, 332, 400, 7);
      g.fillRect(0, 346, 400, 4);
      g.restore();
      const wrap = smooth(
        sym(
          [
            [CX - B.nw - 12, 214],
            [CX - B.nw - 22, 238],
            [CX - B.nw - 8, 262],
            [CX, 268],
          ],
          CX,
        ),
      );
      paint(g, wrap, c1, { y0: 212, y1: 268, x0: CX - 44, x1: CX + 44 });
      g.save();
      g.clip(wrap);
      for (const y of [232, 248])
        stroke(
          g,
          smooth(
            [
              [CX - 44, y],
              [CX, y + 8],
              [CX + 44, y],
            ],
            false,
          ),
          shade(c1, -0.35),
          1.1,
          0.55,
        );
      g.restore();
    },
  },
  bag: {
    slot: 'acc',
    zone: 'bag',
    layer: 'body',
    c: ['#c98a4b', '#7a4d24'],
    draw(g, B, c1, c2) {
      stroke(
        g,
        poly(
          [
            [CX + B.sh - 14, 250],
            [CX - B.hip - 14, 458],
          ],
          false,
        ),
        shade(c2, -0.2),
        6.5,
      );
      stroke(
        g,
        poly(
          [
            [CX + B.sh - 14, 250],
            [CX - B.hip - 14, 458],
          ],
          false,
        ),
        c2,
        4,
      );
      const x = CX - B.hip - 44,
        y = 452;
      paint(g, rrect(x, y, 52, 56, 9), c1, { y0: y, y1: y + 56, x0: x, x1: x + 52 });
      paint(
        g,
        smooth(
          [
            [x, y + 4, 1],
            [x + 52, y + 4, 1],
            [x + 50, y + 26],
            [x + 26, y + 34],
            [x + 2, y + 26],
          ],
          true,
          0.4,
        ),
        shade(c1, -0.1),
        { y0: y, y1: y + 34, side: 0.05 },
      );
      paint(g, rrect(x + 21, y + 26, 10, 12, 2), '#ffd76a', { y0: y + 26, y1: y + 38, side: 0, line: 1 });
    },
  },
};

/** Which part of the figure a thumbnail of each slot should frame: [x, y, w, h]. */
const ICON_FRAME = {
  top: [90, 215, 220, 260],
  outer: [80, 215, 240, 290],
  bottom: [100, 370, 200, 540],
  dress: [70, 215, 260, 730],
  shoes: [110, 800, 180, 160],
  legs: [100, 560, 200, 400],
  face: [130, 110, 140, 90],
  head: [100, 0, 220, 200],
  hair: [110, 60, 140, 110],
  neck: [120, 205, 160, 190],
  bag: [110, 230, 220, 300],
};

/** Paint a square thumbnail of one garment on a faint mannequin. */
export function drawGarmentIcon(g, id, size, colors, mannequin) {
  const def = GARMENTS[id];
  if (!def) return;
  const sex = def.only ?? 'f',
    B = metrics(sex);
  const [x, y, w, h] = ICON_FRAME[def.slot === 'acc' ? def.zone : def.slot];
  const k = Math.min(size / w, size / h);
  g.save();
  g.beginPath();
  g.rect(0, 0, size, size);
  g.clip();
  g.translate((size - w * k) / 2 - x * k, (size - h * k) / 2 - y * k);
  g.scale(k, k);
  mannequin?.(g, sex);
  const c1 = colors?.[0] ?? def.c[0],
    c2 = colors?.[1] ?? def.c[1],
    spec = { skin: '#e4dfee', sex };
  for (const name of ['back', 'legs', 'shoes', 'bottom', 'dress', 'torso', 'sleeves', 'draw']) def[name]?.(g, B, c1, c2, spec);
  g.restore();
}
