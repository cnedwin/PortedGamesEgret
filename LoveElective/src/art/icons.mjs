// Item icons, painted in a 100 x 100 box. Each kind takes the item's main colour.
import { rrect, ellipse, poly, smooth, star, heart, shade, rgba, paint, stroke } from './draw.mjs';

const P = (g, path, c, opt = {}) => paint(g, path, c, { y0: 0, y1: 100, x0: 0, x1: 100, line: 2, side: 0.14, ...opt });

const KINDS = {
  cup(g, c) {
    stroke(
      g,
      smooth(
        [
          [70, 44],
          [88, 48],
          [84, 66],
          [68, 68],
        ],
        false,
      ),
      '#ffffff',
      7,
    );
    stroke(
      g,
      smooth(
        [
          [70, 44],
          [88, 48],
          [84, 66],
          [68, 68],
        ],
        false,
      ),
      shade(c, -0.3),
      2,
    );
    P(
      g,
      smooth(
        [
          [22, 36, 1],
          [74, 36, 1],
          [68, 78],
          [48, 86],
          [28, 78],
        ],
        true,
        0.4,
      ),
      '#ffffff',
    );
    P(g, ellipse(48, 37, 26, 7), c, { side: 0 });
    P(g, ellipse(48, 88, 34, 6), '#f1ecf7', { side: 0 });
    for (const x of [38, 50, 62])
      stroke(
        g,
        smooth(
          [
            [x, 26],
            [x + 5, 18],
            [x, 10],
          ],
          false,
        ),
        rgba('#ffffff', 0.9),
        3,
      );
  },
  pen(g, c) {
    g.save();
    g.translate(50, 50);
    g.rotate(-0.75);
    P(g, rrect(-8, -40, 16, 58, 6), c);
    P(g, rrect(-9, -12, 18, 6, 2), '#f2c14e', { side: 0 });
    P(
      g,
      poly([
        [-7, 18],
        [7, 18],
        [0, 44],
      ]),
      '#f2c14e',
    );
    stroke(
      g,
      poly(
        [
          [0, 24],
          [0, 40],
        ],
        false,
      ),
      '#7a5a1a',
      1.5,
    );
    P(g, rrect(6, -38, 4, 26, 2), '#f2c14e', { side: 0, line: 1 });
    g.restore();
  },
  bottle(g, c) {
    P(g, rrect(40, 8, 20, 14, 4), shade(c, -0.25));
    P(
      g,
      smooth(
        [
          [36, 24, 1],
          [64, 24, 1],
          [70, 40],
          [70, 86],
          [50, 92],
          [30, 86],
          [30, 40],
        ],
        true,
        0.35,
      ),
      c,
    );
    P(g, rrect(30, 50, 40, 22, 3), '#ffffff', { side: 0, line: 1.4 });
    g.fillStyle = c;
    g.fill(star(50, 61, 8, 3.5));
    stroke(
      g,
      poly(
        [
          [38, 32],
          [36, 46],
        ],
        false,
      ),
      rgba('#ffffff', 0.7),
      4,
    );
  },
  fish(g, c) {
    P(
      g,
      smooth([
        [14, 50],
        [34, 28],
        [62, 30],
        [76, 46],
        [92, 30],
        [92, 70],
        [76, 54],
        [62, 70],
        [34, 72],
      ]),
      c,
    );
    g.fillStyle = '#5a3a1e';
    g.fill(ellipse(30, 44, 4, 4));
    for (const x of [44, 54, 64])
      stroke(
        g,
        smooth(
          [
            [x, 38],
            [x + 6, 50],
            [x, 62],
          ],
          false,
        ),
        shade(c, -0.35),
        2,
      );
  },
  palette(g, c) {
    P(
      g,
      smooth([
        [12, 52],
        [28, 22],
        [64, 16],
        [88, 40],
        [80, 70],
        [56, 66],
        [50, 84],
        [26, 80],
      ]),
      '#f1dcc0',
    );
    g.fillStyle = '#ffffff';
    g.fill(ellipse(62, 72, 7, 6));
    [
      ['#e8455f', 32, 40],
      ['#f2c14e', 50, 30],
      ['#5fd3b0', 68, 38],
      ['#6fc3ff', 72, 54],
      [c, 30, 60],
    ].forEach(([k, x, y]) => P(g, ellipse(x, y, 7.5, 6.5), k, { line: 1.2 }));
  },
  flowers(g, c) {
    P(
      g,
      poly([
        [34, 52],
        [66, 52],
        [56, 94],
        [44, 94],
      ]),
      '#f6efe0',
    );
    stroke(
      g,
      poly(
        [
          [36, 62],
          [64, 62],
        ],
        false,
      ),
      '#e8455f',
      4,
    );
    [
      [36, 34],
      [64, 34],
      [50, 22],
      [44, 46],
      [58, 46],
    ].forEach(([x, y], i) => {
      for (let k = 0; k < 5; k++)
        P(g, ellipse(x + Math.cos(k * 1.257) * 8, y + Math.sin(k * 1.257) * 8, 6.5, 6.5), i % 2 ? shade(c, 0.25) : c, { line: 1, side: 0 });
      g.fillStyle = '#f2c14e';
      g.fill(ellipse(x, y, 4, 4));
    });
  },
  disc(g, c) {
    P(g, rrect(10, 14, 62, 72, 5), c);
    g.fillStyle = rgba('#ffffff', 0.85);
    g.fill(star(41, 50, 16, 7));
    P(g, ellipse(64, 50, 30, 30), '#22202c', { side: 0.25 });
    for (const r of [24, 18]) stroke(g, ellipse(64, 50, r, r), rgba('#ffffff', 0.18), 1.2);
    P(g, ellipse(64, 50, 10, 10), c, { side: 0, line: 1 });
    g.fillStyle = '#ffffff';
    g.fill(ellipse(64, 50, 2.5, 2.5));
  },
  picks(g, c) {
    [
      [34, 40, -0.3, shade(c, 0.3)],
      [64, 44, 0.3, '#f2c14e'],
      [50, 62, 0, c],
    ].forEach(([x, y, r, k]) => {
      g.save();
      g.translate(x, y);
      g.rotate(r);
      P(
        g,
        smooth(
          [
            [-18, -16],
            [18, -16],
            [0, 24],
          ],
          true,
          0.75,
        ),
        k,
      );
      g.fillStyle = rgba('#ffffff', 0.8);
      g.fill(star(0, -4, 7, 3));
      g.restore();
    });
  },
  keys(g, c) {
    P(g, rrect(8, 30, 84, 46, 8), '#2b2a4a');
    for (let r = 0; r < 2; r++)
      for (let i = 0; i < 4; i++) {
        const x = 14 + i * 19 + r * 4,
          y = 36 + r * 19;
        P(g, rrect(x, y, 16, 15, 4), (i + r) % 3 ? shade(c, 0.35) : c, { line: 1.2 });
      }
    const gl = g.createRadialGradient(50, 52, 4, 50, 52, 50);
    gl.addColorStop(0, rgba(c, 0.35));
    gl.addColorStop(1, rgba(c, 0));
    g.fillStyle = gl;
    g.fillRect(0, 0, 100, 100);
  },
  boba(g, c) {
    stroke(
      g,
      poly(
        [
          [58, 4],
          [52, 40],
        ],
        false,
      ),
      '#ff7fa8',
      6,
    );
    P(
      g,
      smooth(
        [
          [26, 26, 1],
          [74, 26, 1],
          [68, 88],
          [50, 94],
          [32, 88],
        ],
        true,
        0.3,
      ),
      shade(c, 0.35),
    );
    P(g, rrect(22, 20, 56, 9, 4), '#ffffff', { side: 0 });
    g.fillStyle = '#3a2418';
    for (const [x, y] of [
      [38, 80],
      [50, 84],
      [62, 80],
      [44, 72],
      [56, 72],
    ])
      g.fill(ellipse(x, y, 5, 5));
  },
  macaron(g, c) {
    [
      [28, 60, c],
      [58, 68, '#b7e3c0'],
      [44, 36, '#ffe19a'],
    ].forEach(([x, y, k]) => {
      P(g, ellipse(x + 12, y + 8, 24, 9), k);
      P(g, rrect(x - 10, y, 44, 6, 3), '#fff6ea', { side: 0, line: 1 });
      P(
        g,
        smooth(
          [
            [x - 12, y, 1],
            [x - 8, y - 14],
            [x + 32, y - 14],
            [x + 36, y, 1],
          ],
          true,
          0.6,
        ),
        k,
      );
    });
  },
  perfume(g, c) {
    P(g, rrect(40, 10, 20, 14, 3), '#f2c14e');
    P(g, rrect(44, 24, 12, 8, 2), '#d9d3e6', { side: 0 });
    P(
      g,
      smooth(
        [
          [28, 34, 1],
          [72, 34, 1],
          [80, 60],
          [70, 90],
          [30, 90],
          [20, 60],
        ],
        true,
        0.4,
      ),
      shade(c, 0.3),
    );
    g.fillStyle = rgba(c, 0.75);
    g.fill(
      smooth(
        [
          [26, 60],
          [74, 60],
          [68, 86],
          [32, 86],
        ],
        true,
        0.3,
      ),
    );
    g.fillStyle = '#ffffff';
    g.fill(heart(50, 58, 8));
    stroke(
      g,
      poly(
        [
          [34, 42],
          [30, 58],
        ],
        false,
      ),
      rgba('#ffffff', 0.8),
      4,
    );
  },
  chart(g, c) {
    P(g, rrect(12, 16, 76, 68, 6), c);
    const pts = [
      [26, 64],
      [40, 42],
      [56, 52],
      [70, 30],
      [78, 60],
    ];
    stroke(g, poly(pts, false), rgba('#ffffff', 0.55), 1.6);
    g.fillStyle = '#fff3c0';
    pts.forEach(([x, y], i) => g.fill(star(x, y, i === 3 ? 8 : 5, i === 3 ? 3 : 2, 4)));
    P(g, rrect(8, 12, 84, 8, 4), '#c9a13e', { side: 0 });
    P(g, rrect(8, 80, 84, 8, 4), '#c9a13e', { side: 0 });
  },
  bear(g, c) {
    for (const x of [28, 72]) {
      P(g, ellipse(x, 26, 13, 13), c);
      g.fillStyle = shade(c, 0.4);
      g.fill(ellipse(x, 26, 6, 6));
    }
    P(g, ellipse(50, 74, 26, 20), c);
    P(g, ellipse(50, 44, 28, 25), c);
    P(g, ellipse(50, 52, 12, 9), shade(c, 0.5), { side: 0, line: 1 });
    g.fillStyle = '#3a2418';
    g.fill(ellipse(40, 40, 3.5, 4));
    g.fill(ellipse(60, 40, 3.5, 4));
    g.fill(ellipse(50, 49, 4, 3));
    P(
      g,
      smooth([
        [50, 64, 1],
        [34, 58],
        [34, 72],
      ]),
      '#e8455f',
      { line: 1.2 },
    );
    P(
      g,
      smooth([
        [50, 64, 1],
        [66, 58],
        [66, 72],
      ]),
      '#e8455f',
      { line: 1.2 },
    );
  },
  book(g, c) {
    P(g, rrect(22, 12, 58, 78, 5), '#fbf8f0');
    P(g, rrect(18, 10, 58, 78, 5), c);
    g.fillStyle = shade(c, -0.25);
    g.fillRect(18, 10, 9, 78);
    g.fillStyle = rgba('#ffffff', 0.9);
    g.fill(rrect(36, 28, 30, 5, 2));
    g.fill(rrect(36, 38, 20, 4, 2));
    g.fill(star(51, 62, 10, 4.5));
  },
  console(g, c) {
    P(g, rrect(6, 30, 88, 44, 18), c);
    P(g, rrect(28, 36, 44, 32, 4), '#2b2a4a', { side: 0 });
    g.fillStyle = '#7fd3ff';
    g.fill(rrect(31, 39, 38, 26, 2));
    g.fillStyle = '#ffffff';
    g.fill(star(50, 52, 8, 3.5));
    g.fillStyle = '#2b2a4a';
    g.fillRect(13, 49, 12, 4);
    g.fillRect(17, 45, 4, 12);
    for (const [x, y, k] of [
      [80, 46, '#f2c14e'],
      [86, 54, '#5fd3b0'],
    ]) {
      g.fillStyle = k;
      g.fill(ellipse(x, y, 3.6, 3.6));
    }
  },
  musicbox(g, c) {
    P(g, rrect(16, 48, 68, 40, 6), shade(c, -0.15));
    P(
      g,
      poly([
        [16, 48],
        [84, 48],
        [76, 20],
        [24, 20],
      ]),
      c,
    );
    g.fillStyle = '#fff3c0';
    for (const [x, y, s] of [
      [38, 34, 6],
      [56, 30, 4],
      [66, 40, 5],
      [48, 42, 3],
    ])
      g.fill(star(x, y, s, s * 0.4, 4));
    P(g, ellipse(88, 66, 6, 6), '#f2c14e', { line: 1.2 });
    stroke(
      g,
      poly(
        [
          [84, 66],
          [78, 66],
        ],
        false,
      ),
      '#c9a13e',
      3,
    );
    g.fillStyle = '#f2c14e';
    g.fill(rrect(40, 62, 20, 12, 3));
  },
  bar(g, c) {
    P(g, rrect(14, 34, 72, 32, 6), c);
    P(
      g,
      poly([
        [58, 34],
        [86, 34],
        [86, 66],
        [58, 66],
        [64, 50],
      ]),
      '#f6efe0',
      { side: 0 },
    );
    g.fillStyle = rgba('#ffffff', 0.9);
    g.fill(rrect(22, 44, 28, 5, 2));
    g.fill(rrect(22, 53, 18, 4, 2));
  },
};

/** Paint the icon of a gift or supply at (x, y) with the given size. `icon` is [kind, colour]. */
export function drawItemIcon(g, icon, x, y, size) {
  const [kind, color] = icon;
  g.save();
  g.translate(x, y);
  g.scale(size / 100, size / 100);
  (KINDS[kind] ?? KINDS.book)(g, color);
  g.restore();
}
