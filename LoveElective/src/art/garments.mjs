// Garment and accessory painters. Each entry draws one wearable piece on a
// body of either build, in two dye colours (c1 main, c2 trim). The catalogue
// data that goes with each id (name, price, style) lives in src/data/items.mjs.
import { CX, halfWidth, torsoPoints, sleevePoints, legLine, footAnchor, footOutline, metrics } from './body.mjs';
import { drawCatalogueArt } from './catalogue-art.mjs';
import { smooth, sym, tube, poly, paint, stroke, shade, mix, rgba, ellipse, rrect, star } from './draw.mjs';

// ------------------------------------------------------------ shared pieces

const lerp = (a, b, t) => a + (b - a) * t;

function fill(g, path, color) {
  g.fillStyle = color;
  g.fill(path);
}

/** The broad soft reflection and hard folds read at both dialogue and wardrobe sizes. */
function tailoredVolume(g, path, color, { left, right, top, bottom }) {
  const width = right - left, height = bottom - top;
  const at = (u, v) => [left + u * width, top + v * height];
  const seam = points => smooth(points.map(([u, v]) => at(u, v)), false, 0.45);
  g.save();
  g.clip(path);
  const sheen = g.createLinearGradient(left, top, right, top + height * 0.22);
  sheen.addColorStop(0, rgba(shade(color, -0.6), 0.12));
  sheen.addColorStop(0.26, rgba('#fff8f1', 0.2));
  sheen.addColorStop(0.55, rgba('#fff8f1', 0));
  sheen.addColorStop(0.82, rgba(shade(color, -0.55), 0.09));
  sheen.addColorStop(1, rgba(shade(color, -0.8), 0.31));
  g.fillStyle = sheen;
  g.fillRect(left, top, width, height);
  fill(g, smooth([at(0.97, 0.16), at(0.88, 0.39), at(0.91, 0.72), at(0.99, 0.88), at(1.16, 1.05), at(1.14, 0.15)]), rgba(shade(color, -0.65), 0.25));
  stroke(g, seam([[0.04, 0.58], [0.22, 0.69], [0.35, 0.76]]), shade(color, -0.38), 1.35, 0.52);
  stroke(g, seam([[0.08, 0.63], [0.23, 0.74], [0.31, 0.76]]), '#fff7ef', 1.4, 0.5);
  stroke(g, seam([[0.99, 0.55], [0.81, 0.68], [0.68, 0.71]]), shade(color, -0.46), 1.3, 0.58);
  stroke(g, seam([[0.95, 0.78], [0.8, 0.84], [0.74, 0.85]]), '#fff7ef', 1.2, 0.55);
  stroke(g, seam([[0.06, 0.95], [0.34, 0.972], [0.63, 0.98], [0.93, 0.94]]), shade(color, -0.35), 1.15, 0.55);
  g.restore();
}

function dressHem(g, path, color, trim, y, flare) {
  g.save();
  g.clip(path);
  const hem = smooth([[CX - flare, y - 8], [CX - flare * 0.4, y + 2], [CX, y - 3], [CX + flare * 0.4, y + 2], [CX + flare, y - 8]], false);
  stroke(g, hem, shade(color, -0.36), 5.2, 0.28);
  stroke(g, hem, shade(trim, 0.38), 1.55, 0.73);
  g.restore();
}

function metal(g, x, y, radius, color) {
  paint(g, ellipse(x, y, radius, radius), color, {
    top: shade(color, 0.56), bottom: shade(color, -0.31), y0: y - radius, y1: y + radius, side: 0, line: 0.85,
  });
  fill(g, ellipse(x - radius * 0.29, y - radius * 0.39, radius * 0.32, radius * 0.19), rgba('#fff7e3', 0.86));
}

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
  const hem = opt.hem ?? 506;
  const width = B.sh + (opt.ease ?? 0);
  paint(g, path, c, { top: shade(c, 0.19), bottom: shade(c, -0.17), y0: 236, y1: hem, ...paintOpt });
  tailoredVolume(g, path, c, { left: CX - width, right: CX + width, top: 238, bottom: hem });
  return path;
}

function sleeves(g, B, c, len, ease, cuff = 0, band, contrast = false) {
  for (const s of [-1, 1]) {
    const outline = sleevePoints(B, s, len, ease, cuff);
    const n = outline.length / 2;
    const left = outline.slice(0, n);
    const right = outline.slice(n).reverse();
    const outer = s < 0 ? left : right;
    const inner = s < 0 ? right : left;
    // Carry the cloth from the shoulder slope into the sleeve. The inside
    // edge at the shoulder is a construction seam, so it has no outline.
    outer.splice(0, 1,
      [CX + s * (B.sh - 12 + ease * 0.45), 250],
      [CX + s * (B.sh + 1 + ease * 0.67), 265],
    );
    inner[0] = [CX + s * (B.sh - 22), 253];
    if (len === 1) {
      outer.at(-1)[1] -= 5;
      inner.at(-1)[1] -= 5;
    }
    const outerCuff = outer.at(-1);
    const innerCuff = inner.at(-1);
    const end = (outerCuff[1] + innerCuff[1]) / 2;
    const cuffX = (outerCuff[0] + innerCuff[0]) / 2;
    const cuffEdge = [cuffX, end + 1];
    const path = smooth([...outer, cuffEdge, ...inner.slice().reverse()], true, 0.48);
    const edge = shade(c, -0.43);
    const xs = [...outer, ...inner].map(p => p[0]);
    paint(g, path, c, {
      line: 0, side: 0, y0: 237, y1: 470,
      top: shade(c, 0.17), bottom: shade(c, -0.17),
    });

    g.save();
    g.clip(path);
    const fold = g.createLinearGradient(Math.min(...xs), 0, Math.max(...xs), 0);
    fold.addColorStop(0, rgba(edge, s < 0 ? 0.25 : 0.38));
    fold.addColorStop(s < 0 ? 0.26 : 0.36, rgba('#fff8ef', 0.12));
    fold.addColorStop(s < 0 ? 0.64 : 0.74, rgba(c, 0));
    fold.addColorStop(1, rgba(edge, s < 0 ? 0.28 : 0.2));
    g.fillStyle = fold;
    g.fillRect(Math.min(...xs), 245, Math.max(...xs) - Math.min(...xs), end - 237);
    if (band) {
      const bandDepth = len < 0.5 ? 9 : 14;
      g.fillStyle = band;
      g.fillRect(0, end - bandDepth, 400, bandDepth + 6);
      stroke(g, poly([[0, end - bandDepth], [400, end - bandDepth]], false), shade(band, -0.32), 1.1, 0.65);
    } else if (len === 1) {
      const at = ([x, y]) => [x, y - 11];
      stroke(g, poly([at(outerCuff), at(innerCuff)], false), edge, 1.1, 0.64);
    }
    stroke(g, smooth([
      [cuffX - s * 11, end - 40],
      [cuffX - s * 5, end - 29],
      [cuffX + s * 4, end - 23],
    ], false), edge, 1.25, 0.48);
    g.restore();

    // Only the part below the armpit is exposed next to the torso.
    const exposedInner = inner.slice(2).reverse();
    if (len === 1) exposedInner.push([CX + s * (B.sh - 10), 339]);
    stroke(g, smooth([...outer, cuffEdge, ...exposedInner], false, 0.48), edge, 1.45, 0.84);
    if (contrast) {
      stroke(g, smooth([outer[0], inner[0], inner[1], ...inner.slice(2, 3)], false), edge, 1.2, 0.74);
    }
  }
}

/** Skin showing at a neckline, measured from the base of the neck. */
function neckline(g, B, skin, depth, wide = 0) {
  const width = B.nw + 1 + wide;
  const points = sym([
    [CX - width, 235],
    [CX - width * 0.81, 238 + (depth - 238) * 0.38],
    [CX - width * 0.46, depth - 4],
    [CX, depth, depth > 270 ? 1 : 0],
  ], CX);
  const path = smooth(points, true, 0.47);
  paint(g, path, skin, { y0: 235, y1: depth, side: 0, top: shade(skin, -0.14), bottom: skin, line: 0 });
  stroke(g, smooth(points, false, 0.47), shade(skin, -0.38), 1.1, 0.8);
}

function buttons(g, x, y0, y1, n, c) {
  for (let i = 0; i < n; i++) {
    const y = lerp(y0, y1, n === 1 ? 0 : i / (n - 1));
    metal(g, x, y, 2.8, c);
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
  const ys = [535, 586, 682, 765, 839].filter(y => y < end - 18);
  const width = (w0, y) => w0 + w - taper * Math.max(0, (y - 682) / 213);
  const outline = s => {
    const point = (y, side, corner) => {
      const [x, radius] = legAt(B, s, y);
      return [x + s * side * width(radius, y), y, corner];
    };
    return [
      [CX + s * (B.waist + 2), 388, 1],
      [CX + s * (halfWidth(B, 430) + 2 + w * 0.3), 430],
      [CX + s * (B.hip + 2 + w * 0.5), 470],
      ...ys.map(y => point(y, 1)),
      point(end, 1, 1),
      point(end, -1, 1),
      ...ys.slice().reverse().map(y => point(y, -0.97)),
    ];
  };
  const path = smooth([...outline(-1), [CX, 518, 1], ...outline(1).reverse()], true, 0.4);
  paint(g, path, c, { y0: 388, y1: end, top: shade(c, 0.13), bottom: shade(c, -0.19) });
  g.save();
  g.clip(path);
  for (const s of [-1, 1]) {
    const cx = y => legAt(B, s, Math.min(y, end))[0];
    const hemY = end - 10;
    const knee = Math.min(hemY - 24, 682);
    const thigh = Math.min(knee - 18, 548);
    const side = smooth([[CX + s * (B.hip - 3), 445], [cx(thigh) + s * 10, thigh], [cx(knee) + s * 8, knee], [cx(hemY) + s * 4, hemY]], false);
    stroke(g, side, shade(c, -0.45), 1.8, 0.63);
    const crease = smooth([[CX + s * B.waist * 0.45, 426], [cx(thigh), thigh], [cx(knee) - s * 2, knee], [cx(hemY), hemY]], false);
    stroke(g, crease, shade(c, 0.39), 1.9, 0.6);
    stroke(g, smooth([[cx(knee) - 11, knee - 15], [cx(knee), knee - 6], [cx(knee) + 12, knee - 7]], false), shade(c, -0.38), 1.3, 0.63);
    stroke(g, poly([[cx(hemY) - 22, hemY], [cx(hemY) + 22, hemY]], false), shade(c, 0.29), 1.2, 0.72);
  }
  g.restore();
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
  const edge = B.hip + flare;
  paint(g, path, c, { y0: 388, y1: hem, top: shade(c, 0.16), bottom: shade(c, -0.15) });
  tailoredVolume(g, path, c, { left: CX - edge, right: CX + edge, top: 388, bottom: hem });
  dressHem(g, path, c, c, hem - 6, edge);
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
      [CX + s * B.sh * 0.46, 244],
      [CX + s * (B.sh * 0.79 + ease * 0.45), 257],
      [CX + s * (B.sh + ease * 0.7), 272],
    ];
    for (const y of [292, 320, 396, 462, 560, 660])
      if (y < hem - 8) pts.push([CX + s * (halfWidth(B, Math.min(y, 506), ease) + (y > 470 ? (flare * (y - 470)) / 250 : 0)), y]);
    pts.push([CX + s * (halfWidth(B, Math.min(hem, 506), ease) + (hem > 470 ? (flare * (hem - 470)) / 250 : 0)), hem, 1]);
    if (breakY) pts.push([CX + s * 1, hem, 1], [CX + s * 1, breakY, 1]);
    else pts.push([CX + s * open, hem, 1], [CX + s * open, 300], [CX + s * (open - 2), 262]);
    const path = smooth(pts, true, 0.4);
    const extent = Math.max(B.sh + ease, B.hip + ease + flare);
    paint(g, path, c, { y0: 236, y1: hem, top: shade(c, 0.16), bottom: shade(c, -0.18) });
    tailoredVolume(g, path, c, { left: CX - extent, right: CX + extent, top: 236, bottom: hem });
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

function shoe(g, B, s, c, { top, sole, soleH, pointed = false, shaft = false }) {
  const { x, y: ankleY, ankle, ground, toe } = footAnchor(B, s);
  const at = (dx, y, corner) => [x + s * dx, y, corner];
  const tip = toe + (pointed ? 4 : 3);
  const cuff = shaft ? [top, top + 28, ankleY - 31, ankleY - 9] : [top];
  const rim = side => cuff.map(y => {
    const [lx, w] = legAt(B, s, y);
    return [lx + s * side * (w + (shaft ? 3.4 : 2.7)), y, y === top ? 1 : 0];
  });
  const path = smooth([
    ...rim(-1),
    at(-ankle - 2.2, ankleY + 19),
    at(-ankle + 0.4, ground - 2.1),
    at(-0.5, ground + 0.9),
    at(tip - 6, ground + 0.3),
    at(tip + 0.9, ground - 4.5),
    at(tip + (pointed ? 0.6 : -0.8), ground - 10.5),
    at(tip - 8, ground - (pointed ? 15.5 : 17)),
    at(ankle + 1, ankleY + 11),
    ...rim(1).reverse(),
  ], true, 0.56);
  paint(g, path, c, {
    y0: top, y1: ground, x0: x - 30, x1: x + 30, side: 0.21, line: 1.4,
    top: shade(c, 0.16), bottom: shade(c, -0.18),
  });
  g.save();
  g.clip(path);
  const welt = [
    at(-ankle - 5, ground - soleH - 4),
    at(0, ground - soleH),
    at(tip - 8, ground - soleH),
    at(tip + 5, ground - soleH - 4),
  ];
  fill(g, smooth([...welt, at(tip + 6, ground + 8, 1), at(-ankle - 6, ground + 8, 1)], true, 0.32), sole);
  stroke(g, smooth(welt, false, 0.32), shade(c, 0.32), 1, 0.64);
  stroke(g, smooth([
    at(-ankle + 1, ankleY + 18),
    at(ankle - 3, ground - 19),
    at(tip - 4, ground - 12),
  ], false), shade(c, 0.52), 1.45, 0.65);
  g.restore();
  return { ankleY, ground, tip, at };
}

function legwear(g, B, c, from, alpha = 1, band) {
  g.save();
  g.globalAlpha = alpha;
  for (const s of [-1, 1]) {
    const line = legLine(B, s).slice(0, -1).map(([x, y, w]) => [x, y, w + 0.75]);
    const outline = tube(line);
    const left = outline.slice(0, line.length);
    const right = outline.slice(line.length).reverse();
    const [inner, outer] = s < 0 ? [right, left] : [left, right];
    const column = footAnchor(B, s).x;
    const foot = footOutline(B, s).map(([x, y]) => [x + Math.sign(x - column) * 0.7, y]);
    const path = smooth([...inner, ...foot, ...outer.reverse()], true, 0.38);
    g.save();
    g.beginPath();
    g.rect(0, from, 400, 1000);
    g.clip();
    paint(g, path, c, { y0: from, y1: 942, top: shade(c, 0.09), bottom: shade(c, -0.17) });
    tailoredVolume(g, path, c, { left: column - 24, right: column + 24, top: from, bottom: 940 });
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
    c: ['#f6ecdc', '#cc755d'],
    torso(g, B, c1, c2, spec) {
      const p = torso(g, B, c1, { ease: 5, hem: 464 });
      g.save();
      g.clip(p);
      // Screen-printed campus silhouette with transparent cloth folds beneath.
      const ink = rgba(c2, .79);
      g.fillStyle = ink;
      g.fill(rrect(CX - 31, 304, 62, 36, 5));
      g.fillStyle = rgba(c1, .84);
      g.fill(ellipse(CX + 16, 314, 4, 4));
      g.fill(poly([[CX - 27, 331], [CX - 15, 317], [CX - 8, 325], [CX + 1, 314], [CX + 16, 332]]));
      g.fillRect(CX - 23, 335, 46, 1.1);

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
      sleeves(g, B, c1, .29, 3.2);
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
      paint(g, p, c1, { y0: 268, y1: 660, top: shade(c1, 0.17), bottom: shade(c1, -0.19) });
      tailoredVolume(g, p, c1, { left: CX - 96, right: CX + 96, top: 270, bottom: 664 });
      dressHem(g, p, c1, c2, 653, 94);
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
      paint(g, p, c1, { y0: 236, y1: 926, top: shade(c1, 0.22), bottom: shade(c1, -0.22) });
      tailoredVolume(g, p, c1, { left: CX - 85, right: CX + 85, top: 237, bottom: 927 });
      dressHem(g, p, c1, c2, 921, 84);
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
      sleeves(g, B, c2, 1, 7.5, -3, c1, true);
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
        const { at, ankleY, ground, tip } = shoe(g, B, s, c1, { top: 882, sole: shade(c1, -0.16), soleH: 8 });
        stroke(g, smooth([at(-5, ankleY + 16), at(5, ground - 21), at(tip - 7, ground - 16)], false), c2, 3.3);
        for (const step of [1, 8, 15]) {
          stroke(g, poly([at(-4, ankleY + step), at(7 + step * 0.22, ankleY + step + 2)], false), shade(c1, -0.42), 1.05);
        }
      }
    },
  },
  loafers: {
    slot: 'shoes',
    c: ['#5a3a2e', '#e8c25a'],
    shoes(g, B, c1, c2) {
      for (const s of [-1, 1]) {
        const { at, ankleY, ground, tip } = shoe(g, B, s, c1, { top: 895, sole: shade(c1, -0.45), soleH: 4.5 });
        stroke(g, smooth([at(1, ankleY + 13), at(13, ground - 22), at(tip - 3, ground - 11)], false), shade(c1, 0.31), 1.3);
        stroke(g, poly([at(2, ankleY + 18), at(12, ankleY + 21)], false), c2, 2.8);
      }
    },
  },
  boots: {
    slot: 'shoes',
    c: ['#3a3340', '#8a7f94'],
    shoes(g, B, c1, c2) {
      for (const s of [-1, 1]) {
        const { at, ankleY, ground, tip } = shoe(g, B, s, c1, { top: 800, sole: shade(c1, -0.51), soleH: 7, shaft: true });
        stroke(g, smooth([at(7, 811), at(7, 853), at(6, ankleY + 3), at(tip - 5, ground - 15)], false), shade(c1, 0.37), 1.2, 0.83);
        for (let y = 820; y < ankleY + 3; y += 12) {
          const [x] = legAt(B, s, Math.min(y, ankleY));
          stroke(g, poly([[x - s * 4, y], [x + s * 5, y + 2]], false), c2, 1.5, 0.86);
        }
      }
    },
  },
  heels: {
    slot: 'shoes',
    c: ['#d94a6a', '#ffffff'],
    only: 'f',
    shoes(g, B, c1, c2) {
      for (const s of [-1, 1]) {
        const { at, ankleY, ground, tip } = shoe(g, B, s, c1, { top: 896, sole: shade(c1, -0.43), soleH: 3.8, pointed: true });
        stroke(g, smooth([at(-7, ankleY + 5), at(1, ankleY + 7), at(9, ankleY + 10)], false), shade(c1, -0.45), 2.3);
        const [buckleX, buckleY] = at(8, ankleY + 9);
        metal(g, buckleX, buckleY, 1.7, c2);
        stroke(g, smooth([at(9, ground - 15), at(tip - 7, ground - 12), at(tip, ground - 9)], false), shade(c1, 0.48), 1.4, 0.7);
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
        const reflection = g.createLinearGradient(0, 147, 0, 173);
        reflection.addColorStop(0, rgba('#e5f4ff', 0.44));
        reflection.addColorStop(0.5, rgba('#fff4ef', 0.08));
        reflection.addColorStop(1, rgba('#c5c4f1', 0.17));
        g.fillStyle = reflection;
        g.fill(lens);
        g.save();
        g.clip(lens);
        const x = CX + s * 26;
        stroke(g, poly([[x - 20, 168], [x + 12, 146]], false), '#fff7ef', 2.4, 0.66);
        stroke(g, poly([[x - 14, 171], [x + 18, 149]], false), '#fff7ef', 0.85, 0.69);
        g.restore();
        stroke(g, lens, shade(c1, -0.16), 2.7);
        stroke(g, smooth([[x - 12, 151], [x - 6, 148], [x + 8, 148]], false), shade(c1, 0.57), 0.9, 0.85);
        metal(g, CX + s * 42, 155, 1.7, shade(c1, 0.52));
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
        g.save();
        g.clip(lens);
        const x = CX + s * 28;
        stroke(g, smooth([[x - 20, 165], [x - 3, 157], [x + 18, 148]], false), shade(c2, 0.69), 1.8, 0.67);
        stroke(g, poly([[x - 8, 167], [x + 6, 160]], false), shade(c2, 0.43), 0.8, 0.55);
        g.restore();
        stroke(g, lens, shade(c1, -0.3), 1.8);
        metal(g, CX + s * 43, 150, 1.45, shade(c1, 0.67));
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
        { y0: 20, y1: 95, x0: CX - 80, x1: CX + 80, top: shade(c1, 0.3), bottom: shade(c1, -0.23) },
      );
      stroke(g, smooth([[CX - 55, 53], [CX - 25, 31], [CX + 9, 27], [CX + 43, 39]], false), shade(c1, 0.58), 2.7, 0.42);
      stroke(g, smooth([[CX + 67, 54], [CX + 56, 66], [CX + 29, 72], [CX - 16, 72]], false), shade(c1, -0.5), 2, 0.56);
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
      stroke(g, smooth([[CX + 13, 34], [CX + 20, 58], [CX + 29, 81], [CX + 37, 99]], false), shade(c1, -0.42), 1.4, 0.78);
      stroke(g, smooth([[CX - 35, 48], [CX - 46, 70], [CX - 51, 102]], false), shade(c1, 0.44), 1.25, 0.61);
      stroke(g, smooth([[CX - 20, 116], [CX + 47, 109], [CX + 91, 116]], false), shade(c2, 0.35), 1.4, 0.76);
      paint(g, star(CX + 6, 70, 11, 4.6), c2, { y0: 61, y1: 80, side: 0, line: 0.85 });
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
      for (const s of [-1, 1]) {
        stroke(g, smooth([[x + s * 5, y], [x + s * 18, y - 8], [x + s * 28, y - 11]], false), shade(c1, 0.48), 1.8, 0.66);
        stroke(g, smooth([[x + s * 3, y + 3], [x + s * 14, y + 5], [x + s * 24, y + 13]], false), shade(c1, -0.56), 1.35, 0.67);
      }
      paint(g, ellipse(x, y, 7, 8), shade(c1, 0.12), { top: shade(c1, 0.36), y0: y - 8, y1: y + 8, side: 0 });
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
        const x = CX + s * 68;
        paint(g, ellipse(x, 153, 7, 16), shade(c1, 0.13), { y0: 137, y1: 169, side: 0.05, line: 0.7 });
        stroke(g, smooth([[x - 2, 140], [x + 2, 150], [x - 1, 164]], false), c2, 2.7, 0.93);
        metal(g, x - s * 7, 169, 1.45, shade(c1, 0.62));
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
      metal(g, CX - 48, 115, 2.8, c2);
      metal(g, CX - 43, 121, 1.45, c2);
      stroke(g, poly([[CX - 54, 126], [CX - 40, 129]], false), shade(c1, 0.56), 1.3, 0.82);
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
      metal(g, CX, 266, 1.7, c1);
      paint(g, star(CX, 274, 7.8, 3, 4), c2, { top: shade(c2, 0.56), bottom: shade(c2, -0.31), y0: 265, y1: 282, side: 0, line: 1, stroke: shade(c1, -0.3) });
      stroke(g, poly([[CX - 3, 274], [CX, 273], [CX + 2, 270]], false), '#fff9e8', 0.9, 0.89);
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
      g.save();
      g.setLineDash([2, 2]);
      stroke(g, smooth([[x + 4, y + 7], [x + 6, y + 25], [x + 26, y + 32], [x + 46, y + 25], [x + 48, y + 7]], false), shade(c1, 0.5), 1, 0.83);
      stroke(g, smooth([[x + 5, y + 37], [x + 7, y + 50], [x + 27, y + 52], [x + 45, y + 49], [x + 47, y + 37]], false), shade(c1, 0.49), 0.9, 0.72);
      g.restore();
      paint(g, rrect(x + 21, y + 26, 10, 12, 2), '#d5a96e', { top: '#ffe5ad', bottom: '#a87847', y0: y + 26, y1: y + 38, side: 0, line: 1 });
      fill(g, rrect(x + 23.5, y + 28.5, 5, 6, 1), shade(c2, -0.27));
      metal(g, x + 26, y + 35, 1.6, '#f2cf8c');
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
  if ((!colors || colors.every((color, channel) => !color || color.toLowerCase() === def.c[channel].toLowerCase()))
    && drawCatalogueArt(g, id, 0, 0, size)) return;
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
