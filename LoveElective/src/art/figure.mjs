// Character painter. Every person in the game is drawn by this one routine
// from a small description (body type, skin, eyes, hair, what they wear and
// their expression), in a 400 x 1000 drawing space with the feet near y = 940.
import { smooth, sym, tube, paint, stroke, shade, mix, rgba, ellipse } from './draw.mjs';
import { GARMENTS } from './garments.mjs';
import { hasLayeredHead, paintLayeredHead, layeredEyeY, layeredCrownY } from './character-art.mjs';

import { CX, metrics, torsoPoints, armLine, legLine, footOutline } from './body.mjs';
export { CX, FIGURE_W, FIGURE_H, metrics } from './body.mjs';

// Leave room above the crown for hairstyles and hats.
export const HEAD_SCALE = 1.05;
export const FIGURE_TOP = 44;

// ---------------------------------------------------------------- body

// Replace the flat end of a limb with its hand or foot so the wrist and
// ankle stay continuous on bare skin as well as under a cuff.
function limbWithEnd(line, end, s) {
  const outline = tube(line);
  const split = line.length;
  return smooth([
    ...outline.slice(0, split - 1),
    ...(s > 0 ? end : end.slice().reverse()),
    ...outline.slice(split + 1),
  ], true, .38);
}

function drawLegs(g, B, skin) {
  for (const s of [-1, 1]) {
    const line = legLine(B, s);
    const [x] = line.at(-1);
    paint(g, limbWithEnd(line, footOutline(B, s), s), skin, {
      y0: 470, y1: 942, x0: x - 27, x1: x + 27, side: .19, line: 1.2,
      stroke: mix(skin, '#68465b', .48),
    });
  }
}

function drawTorsoSkin(g, B, skin) {
  const n = B.nw;
  const neck = smooth(sym([
    [CX - n * .88, 203],
    [CX - n * .85, 221],
    [CX - n, 234],
    [CX - n - 5, 243],
    [CX - n - 12, 252],
  ], CX), true, .37);
  const shadow = mix(skin, '#8a526b', .47);
  paint(g, neck, skin, { y0: 209, y1: 251, top: shadow, bottom: shade(skin, .07), line: 0, side: .22, x0: CX - n, x1: CX + n });
  paint(g, smooth(torsoPoints(B)), skin, {
    y0: 238, y1: 506, side: .22, x0: CX - B.sh, x1: CX + B.sh, line: 1.2,
    stroke: mix(skin, '#68465b', .48),
  });
  for (const s of [-1, 1]) {
    stroke(g, smooth([
      [CX + s * 5, 253],
      [CX + s * 19, 248],
      [CX + s * 36, 252],
    ], false), shadow, 1.1, .66);
  }
}

function drawArms(g, B, skin) {
  for (const s of [-1, 1]) {
    const line = armLine(B, s);
    const [x, y, w] = line.at(-1);
    // The palm tapers into bent fingers. The thumb sits on the inside of
    // the relaxed hand, with a crease between it and the forefinger.
    const hand = [
      [-w, -3], [-w - 1, 8], [-w - 5, 16], [-w - 4, 22],
      [-w - 1, 21], [-w + 2, 15], [-w + 1, 28],
      [-w + 3, 34], [-1, 38], [w - 2, 35], [w + 1, 28],
      [w + 2, 17], [w + 1, 8], [w, -3],
    ].map(([dx, dy]) => [x + s * dx, y + dy]);
    const path = limbWithEnd(line, hand, s);
    const shadeLine = mix(skin, '#68465b', .5);
    paint(g, path, skin, {
      y0: 250, y1: y + 38, x0: x - 20, x1: x + 21, side: .25,
      top: shade(skin, .1), bottom: mix(skin, '#b97576', .22), line: 1.25, stroke: shadeLine,
    });
    const creases = [
      [[-w + 2, 16], [-w + 4, 22], [-w + 3, 26]],
      [[0, 25], [-1, 31], [0, 35]],
      [[w - 3, 25], [w - 3, 31], [w - 2, 33]],
    ];
    for (const crease of creases) {
      stroke(g, smooth(crease.map(([dx, dy]) => [x + s * dx, y + dy]), false), shadeLine, .88, .75);
    }
  }
}

// ---------------------------------------------------------------- face

/** How each expression shapes the eyes, brows and mouth. */
const EXPRESSIONS = {
  normal: { open: 1, mouth: 'soft', blush: 0.25 },
  smile: { open: 0.92, mouth: 'smile', blush: 0.35 },
  joy: { closed: 'happy', mouth: 'open', blush: 0.6 },
  shy: { open: 0.86, look: 0.35, mouth: 'wavy', blush: 1, browIn: -2 },
  angry: { open: 0.82, mouth: 'frown', blush: 0.2, browIn: 6, browOut: -3 },
  sad: { open: 0.76, mouth: 'sad', blush: 0.15, browIn: -5, browOut: 4, look: -0.1 },
  surprise: { open: 1.12, iris: 0.82, mouth: 'o', blush: 0.3, browUp: 5 },
  tease: { open: 0.74, mouth: 'smirk', blush: 0.3, browOut: -3, half: true },
};
export const EXPRESSION_NAMES = Object.keys(EXPRESSIONS);

const FEATURES = {
  hero: { eye: .87, brow: -2, tilt: -2, jaw: 2 },
  qingge: { eye: .91, brow: -1, tilt: -3, jaw: -1 },
  linxia: { eye: .96, brow: -2, tilt: 1, jaw: 2 },
  wanqing: { eye: 1, brow: 1, tilt: 3, jaw: -2 },
  xinglan: { eye: .87, brow: 1, tilt: -4, jaw: 0 },
  zhiwei: { eye: .92, brow: 1, tilt: -2, jaw: -2 },
  tangmi: { eye: 1, brow: -1, tilt: 2, jaw: 1 },
  bailu: { eye: .9, brow: 1, tilt: 1, jaw: -1 },
};
const defaultFeatures = { eye: 1, brow: 0, tilt: 0, jaw: 0 };

function drawEye(g, s, spec, e, blink) {
  const feature = FEATURES[spec.id] ?? defaultFeatures;
  const ex = CX + s * 25,
    ey = 159,
    lash = shade(spec.hair.color, -0.72);
  g.save();
  g.translate(ex, ey);
  g.scale(s, 1); // local +x now points towards the ear on both sides
  g.transform(1, feature.tilt / 36, 0, 1, 0, 0);
  if (blink || e.closed) {
    const happy = e.closed === 'happy' && !blink;
    const lid = happy
      ? smooth(
          [
            [-13, 4],
            [-1, -7],
            [13, 4],
          ],
          false,
        )
      : smooth(
          [
            [-13, 0],
            [0, 6],
            [14, -1],
          ],
          false,
        );
    stroke(g, lid, lash, 3.2);
    if (!happy)
      for (const x of [6, 11])
        stroke(
          g,
          smooth(
            [
              [x, 3],
              [x + 3, 8],
            ],
            false,
          ),
          lash,
          1.4,
        );
  } else {
    const k = (e.open ?? 1) * feature.eye * (spec.sex === 'm' ? .92 : 1);
    g.save();
    g.scale(1, k);
    const white = smooth([
      [-13, 3],
      [-7, -9],
      [3, -13],
      [11, -9],
      [15, 0],
      [12, 9],
      [2, 13],
      [-9, 10],
    ]);
    const sclera = g.createLinearGradient(0, -12, 0, 12);
    sclera.addColorStop(0, '#b0a9bd');
    sclera.addColorStop(.5, '#faf1eb');
    sclera.addColorStop(1, '#fff8ee');
    g.fillStyle = sclera;
    g.fill(white);
    g.save();
    g.clip(white);
    // Shadow cast by the upper lid.
    g.fillStyle = rgba(shade(spec.skin, -0.5), 0.28);
    g.fillRect(-16, -15, 34, 7);
    const ir = e.iris ?? 1,
      ix = 0.5 + (e.look ?? 0) * 6;
    const grad = g.createLinearGradient(0, -13, 0, 13);
    grad.addColorStop(0, shade(spec.eye, -0.62));
    grad.addColorStop(0.5, spec.eye);
    grad.addColorStop(1, shade(spec.eye, 0.5));
    g.fillStyle = grad;
    g.fill(ellipse(ix, .5, 9.8 * ir, 12.3 * ir));
    g.save();
    g.clip(ellipse(ix, .5, 9.2 * ir, 11.9 * ir));
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * (.17 + i * .065);
      const dx = Math.cos(a) * ir, dy = Math.sin(a) * ir;
      g.beginPath();
      g.moveTo(ix + dx * 6.4, dy * 7.9);
      g.lineTo(ix + dx * 9.4, dy * 11.1);
      g.strokeStyle = rgba(shade(spec.eye, i % 3 ? .55 : -.28), .52);
      g.lineWidth = .48;
      g.stroke();
    }
    g.restore();
    g.fillStyle = shade(spec.eye, -0.8);
    g.fill(ellipse(ix, 0, 4.6 * ir, 6.4 * ir));
    // Bright crescent at the bottom of the iris.
    g.strokeStyle = rgba(shade(spec.eye, 0.75), 0.9);
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(ix, 1, 7.4 * ir, 9.6 * ir, 0, Math.PI * 0.2, Math.PI * 0.8);
    g.stroke();
    g.restore();
    // Highlights stay on the same side of both eyes, so undo the mirroring.
    g.fillStyle = '#ffffff';
    g.fill(ellipse(ix - s * 3.6, -5.2, 2.55, 3.05, -.3));
    g.fill(ellipse(ix + s * 3.6, 4.5, 1.15, 1.45));
    g.restore();
    // Upper lash line with a small wing, and a short lower lash.
    const top = e.half ? -9 : -13.5;
    const lid = smooth(
      [
        [-14, 4 * k],
        [-8, (top + 3) * k],
        [3, top * k],
        [12, (top + 4) * k],
        [17, -1 * k],
        [20, -5 * k],
      ],
      false,
    );
    stroke(g, lid, lash, 3.4);
    stroke(
      g,
      smooth(
        [
          [-9, (top - 4) * k],
          [3, (top - 6) * k],
          [13, (top - 2) * k],
        ],
        false,
      ),
      shade(spec.skin, -0.4),
      1,
      0.7,
    );
    stroke(
      g,
      smooth(
        [
          [5, 13.5 * k],
          [12, 10 * k],
          [15, 5 * k],
        ],
        false,
      ),
      lash,
      1.3,
      0.8,
    );
  }
  // Eyebrow.
  const up = feature.brow - (e.browUp ?? 0);
  const brow = smooth(
    [
      [-14, -27 + (e.browIn ?? 0) + up],
      [0, -31 + up],
      [15, -26 + (e.browOut ?? 0) + up],
    ],
    false,
  );
  stroke(g, brow, shade(spec.hair.color, -0.45), 2.2, 0.9);
  g.restore();
}

function drawMouth(g, kind, skin) {
  const lip = shade(mix(skin, '#c2586b', 0.75), -0.25),
    y = 193;
  const line = pts => stroke(g, smooth(pts, false), lip, 1.9);
  switch (kind) {
    case 'smile':
      line([
        [CX - 10, y - 1],
        [CX, y + 4],
        [CX + 10, y - 1],
      ]);
      break;
    case 'open': {
      const p = smooth([
        [CX - 11, y - 3, 1],
        [CX, y - 1],
        [CX + 11, y - 3, 1],
        [CX + 6, y + 7],
        [CX - 6, y + 7],
      ]);
      g.fillStyle = '#8c3246';
      g.fill(p);
      g.save();
      g.clip(p);
      g.fillStyle = '#f08a9a';
      g.fill(ellipse(CX, y + 8, 6, 4));
      g.restore();
      stroke(g, p, lip, 1.6);
      break;
    }
    case 'wavy':
      line([
        [CX - 8, y + 1],
        [CX - 4, y - 1],
        [CX, y + 1],
        [CX + 4, y - 1],
        [CX + 8, y + 1],
      ]);
      break;
    case 'frown':
      line([
        [CX - 8, y + 3],
        [CX, y - 1],
        [CX + 8, y + 3],
      ]);
      break;
    case 'sad':
      line([
        [CX - 6, y + 2],
        [CX, y],
        [CX + 6, y + 2],
      ]);
      break;
    case 'o':
      g.fillStyle = '#8c3246';
      g.fill(ellipse(CX, y + 2, 4, 5.5));
      stroke(g, ellipse(CX, y + 2, 4, 5.5), lip, 1.4);
      break;
    case 'smirk':
      line([
        [CX - 8, y + 1],
        [CX + 1, y + 3],
        [CX + 10, y - 3],
      ]);
      break;
    default:
      line([
        [CX - 6, y],
        [CX, y + 2.5],
        [CX + 6, y],
      ]);
  }
}

function drawHead(g, spec, e, blink) {
  const { skin } = spec,
    m = spec.sex === 'm';
  const jaw = (m ? 3 : 0) + (FEATURES[spec.id] ?? defaultFeatures).jaw;
  // Ears sit behind the face.
  for (const s of [-1, 1]) paint(g, ellipse(CX + s * 55, 158, 7, 13, s * 0.15), skin, { y0: 140, y1: 175, side: 0 });
  const face = smooth(
    sym(
      [
        [CX, 62],
        [CX - 40, 74],
        [CX - 55, 112],
        [CX - 56, 150],
        [CX - 50 - jaw, 180],
        [CX - 33 - jaw, 202],
        [CX - 12, 214],
        [CX, 216],
      ],
      CX,
    ),
  );
  paint(g, face, skin, { y0: 60, y1: 216, side: .11, bottom: shade(skin, -.04) });
  g.save();
  g.clip(face);
  const light = g.createLinearGradient(CX - 55, 144, CX + 61, 191);
  light.addColorStop(0, rgba('#fff1d2', .58));
  light.addColorStop(.5, rgba('#fff1d2', 0));
  light.addColorStop(1, rgba('#876082', .27));
  g.fillStyle = light;
  g.fillRect(CX - 66, 61, 132, 160);
  g.fillStyle = rgba('#b77585', .12);
  g.fill(smooth([[CX - 60, 126], [CX - 14, 135], [CX + 37, 128], [CX + 58, 131], [CX + 49, 150], [CX - 52, 147]]));
  g.restore();
  // Blush.
  if (e.blush) {
    for (const s of [-1, 1]) {
      const b = g.createRadialGradient(CX + s * 33, 181, 1, CX + s * 33, 181, 17);
      b.addColorStop(0, rgba('#ff7a8c', 0.42 * e.blush));
      b.addColorStop(1, rgba('#ff7a8c', 0));
      g.fillStyle = b;
      g.fillRect(CX + s * 33 - 18, 165, 36, 32);
    }
    if (e.blush >= 1)
      for (const s of [-1, 1])
        for (const d of [-5, 0, 5])
          stroke(
            g,
            smooth(
              [
                [CX + s * 33 + d - 2, 185],
                [CX + s * 33 + d + 2, 178],
              ],
              false,
            ),
            '#f0617b',
            1.1,
            0.7,
          );
  }
  drawEye(g, -1, spec, e, blink);
  drawEye(g, 1, spec, e, blink);
  // Nose: a small shadow and a highlight.
  stroke(
    g,
    smooth(
      [
        [CX + 1, 176],
        [CX + 2.5, 180],
      ],
      false,
    ),
    shade(skin, -0.42),
    1.5,
    0.8,
  );
  drawMouth(g, e.mouth, skin);
}

// ---------------------------------------------------------------- hair

/** Fringe tips, listed from the right of the picture to the left as [dx, y, notchY]. */
const BANGS = {
  hime: {
    tips: [
      [46, 141, 137],
      [31, 142, 138],
      [16, 143, 139],
      [0, 143, 139],
      [-16, 143, 138],
      [-31, 142, 137],
      [-46, 141],
    ],
    lock: 262,
    lockW: 15,
    blunt: true,
  },
  side: {
    tips: [
      [50, 156, 112],
      [33, 149, 108],
      [12, 142, 104],
      [-13, 133, 104],
      [-35, 130, 110],
      [-51, 146],
    ],
    lock: 232,
    lockW: 12,
  },
  part: {
    tips: [
      [52, 158, 116],
      [36, 146, 86],
      [-36, 146, 116],
      [-52, 158],
    ],
    lock: 236,
    lockW: 13,
  },
  messy: {
    tips: [
      [50, 150, 114],
      [38, 138, 110],
      [22, 148, 108],
      [6, 134, 106],
      [-10, 147, 108],
      [-27, 136, 112],
      [-41, 150, 116],
      [-52, 142],
    ],
    lock: 208,
    lockW: 11,
  },
  wispy: {
    tips: [
      [48, 150, 120],
      [30, 140, 118],
      [10, 146, 118],
      [-10, 146, 118],
      [-30, 140, 120],
      [-48, 150],
    ],
    lock: 248,
    lockW: 12,
  },
  crop: {
    tips: [
      [52, 128, 104],
      [36, 122, 100],
      [18, 128, 98],
      [0, 120, 98],
      [-18, 127, 100],
      [-36, 121, 104],
      [-52, 130],
    ],
    lock: 168,
    lockW: 9,
  },
  swept: {
    tips: [
      [54, 134, 100],
      [38, 140, 96],
      [16, 136, 92],
      [-8, 126, 90],
      [-32, 116, 96],
      [-54, 128],
    ],
    lock: 170,
    lockW: 9,
  },
  curtain: {
    tips: [
      [55, 150, 112],
      [40, 138, 82],
      [-40, 138, 112],
      [-55, 150],
    ],
    lock: 176,
    lockW: 10,
  },
  spiky: {
    tips: [
      [54, 126, 96],
      [42, 112, 92],
      [24, 124, 88],
      [8, 106, 88],
      [-10, 122, 90],
      [-28, 108, 94],
      [-44, 124, 98],
      [-55, 114],
    ],
    lock: 166,
    lockW: 9,
  },
};

function fringePoints(b) {
  const pts = [
    [CX - 63, 132],
    [CX - 58, 82],
    [CX - 30, 50],
    [CX, 44],
    [CX + 30, 50],
    [CX + 58, 82],
    [CX + 63, 132],
  ];
  // Right side lock, down and back up.
  pts.push([CX + 62, b.lock - 30], [CX + 60 - (b.blunt ? 0 : 4), b.lock, 1]);
  if (b.blunt) pts.push([CX + 60 - b.lockW, b.lock, 1]);
  pts.push([CX + 58 - b.lockW, 150, 1]);
  b.tips.forEach(([dx, y, notch], i) => {
    pts.push([CX + dx, y, 1]);
    const next = b.tips[i + 1];
    if (next) pts.push([CX + (dx + next[0]) / 2, notch ?? 112]);
  });
  pts.push([CX - 58 + b.lockW, 150, 1]);
  if (b.blunt) pts.push([CX - 60 + b.lockW, b.lock, 1]);
  pts.push([CX - 60 + (b.blunt ? 0 : 4), b.lock, 1], [CX - 62, b.lock - 30]);
  return pts;
}

function hairPaint(g, path, color, y0, y1) {
  paint(g, path, color, { y0, y1, top: shade(color, 0.16), bottom: shade(color, -0.2), side: 0.2, x0: CX - 110, x1: CX + 110, line: 1.7 });
}

function drawHairBack(g, hair) {
  const c = hair.color,
    L = hair.length ?? 420;
  switch (hair.style) {
    case 'long':
      hairPaint(
        g,
        smooth(
          sym(
            [
              [CX, 46],
              [CX - 48, 56],
              [CX - 70, 112],
              [CX - 74, 220],
              [CX - 80, L * 0.7],
              [CX - 72, L - 6],
              [CX - 58, L, 1],
              [CX - 30, L - 8],
              [CX - 12, L, 1],
            ],
            CX,
          ),
        ),
        c,
        46,
        L,
      );
      break;
    case 'wavy': {
      const half = [
        [CX, 46],
        [CX - 48, 56],
        [CX - 70, 112],
      ];
      for (let y = 170, i = 0; y < L; y += 46, i++) half.push([CX - 76 - (i % 2 ? 12 : -2) - i * 1.5, y]);
      half.push([CX - 70, L, 1], [CX - 36, L - 16], [CX - 14, L - 2, 1]);
      hairPaint(g, smooth(sym(half, CX)), c, 46, L);
      break;
    }
    case 'bob':
      hairPaint(
        g,
        smooth(
          sym(
            [
              [CX, 46],
              [CX - 48, 56],
              [CX - 72, 112],
              [CX - 76, 190],
              [CX - 62, 232, 1],
              [CX - 30, 226],
            ],
            CX,
          ),
        ),
        c,
        46,
        236,
      );
      break;
    case 'short':
      hairPaint(
        g,
        smooth(
          sym(
            [
              [CX, 46],
              [CX - 48, 56],
              [CX - 70, 112],
              [CX - 72, 190],
              [CX - 80, 238, 1],
              [CX - 58, 224],
              [CX - 50, 246, 1],
              [CX - 30, 226],
            ],
            CX,
          ),
        ),
        c,
        46,
        250,
      );
      break;
    case 'pony': {
      // Tail first so the cap overlaps its root.
      const tail = tube([
        [CX + 46, 84, 14],
        [CX + 84, 96, 20],
        [CX + 104, 170, 22],
        [CX + 100, 270, 17],
        [CX + 88, 340, 6],
      ]);
      hairPaint(g, smooth(tail), c, 80, 340);
      hairPaint(
        g,
        smooth(
          sym(
            [
              [CX, 46],
              [CX - 48, 56],
              [CX - 68, 112],
              [CX - 64, 186],
              [CX - 40, 214],
            ],
            CX,
          ),
        ),
        c,
        46,
        220,
      );
      break;
    }
    case 'twin':
      for (const s of [-1, 1]) {
        const tail = tube([
          [CX + s * 60, 104, 12],
          [CX + s * 86, 150, 21],
          [CX + s * 98, 280, 23],
          [CX + s * 100, 400, 18],
          [CX + s * 94, L, 5],
        ]);
        hairPaint(g, smooth(tail), c, 100, L);
      }
      hairPaint(
        g,
        smooth(
          sym(
            [
              [CX, 46],
              [CX - 48, 56],
              [CX - 68, 112],
              [CX - 64, 186],
              [CX - 40, 214],
            ],
            CX,
          ),
        ),
        c,
        46,
        220,
      );
      break;
    case 'buns':
      for (const s of [-1, 1]) hairPaint(g, ellipse(CX + s * 54, 62, 25, 23), c, 40, 90);
      hairPaint(
        g,
        smooth(
          sym(
            [
              [CX, 46],
              [CX - 48, 56],
              [CX - 72, 112],
              [CX - 76, 196],
              [CX - 64, 244, 1],
              [CX - 30, 232],
            ],
            CX,
          ),
        ),
        c,
        46,
        246,
      );
      break;
    default: // short male cut
      hairPaint(
        g,
        smooth(
          sym(
            [
              [CX, 44],
              [CX - 46, 52],
              [CX - 63, 100],
              [CX - 58, 150],
              [CX - 46, 174],
            ],
            CX,
          ),
        ),
        c,
        44,
        180,
      );
  }
}

function drawHairFront(g, hair) {
  const c = hair.color,
    b = BANGS[hair.bangs] ?? BANGS.side;
  const path = smooth(fringePoints(b), true, 0.42);
  hairPaint(g, path, c, 44, 200);
  g.save();
  g.clip(path);
  // Strands running from the crown to each tip.
  for (const [dx, y] of b.tips)
    stroke(
      g,
      smooth(
        [
          [CX + dx * 0.25, 52],
          [CX + dx * 0.8, (52 + y) / 2],
          [CX + dx, y - 6],
        ],
        false,
      ),
      shade(c, -0.4),
      1,
      0.35,
    );
  // Glossy band across the crown.
  const glow = g.createRadialGradient(CX - 32, 70, 0, CX - 32, 70, 102);
  glow.addColorStop(0, rgba('#ffdbbd', .31));
  glow.addColorStop(.56, rgba('#c1baff', .12));
  glow.addColorStop(1, rgba(c, 0));
  g.fillStyle = glow;
  g.fillRect(CX - 94, 18, 188, 170);
  for (let i = 0; i < 20; i++) {
    const x = -55 + i * 5.7;
    const tip = 96 + Math.abs(x) * .28 + Math.sin(i * 2.4) * 12;
    const strand = smooth([[CX + x * .32 - 14, 56], [CX + x * .82 - 8, 74], [CX + x, tip]], false);
    stroke(g, strand, shade(c, i % 3 === 0 ? .62 : .34), i % 4 === 0 ? 2.15 : .72, .34);
  }
  for (let i = 0; i < 7; i++) {
    const x = -47 + i * 5;
    const strand = smooth([[CX + x * .67 - 7, 66], [CX + x * .87, 82], [CX + x, 105 + i % 4 * 5]], false);
    stroke(g, strand, '#ffe4cc', .85, .31);
  }
  g.restore();
  if (hair.streak) {
    g.save();
    g.clip(path);
    stroke(
      g,
      smooth(
        [
          [CX + 20, 50],
          [CX + 34, 100],
          [CX + 33, 150],
        ],
        false,
      ),
      hair.streak,
      8,
      0.9,
    );
    g.restore();
  }
  if (hair.ahoge) {
    const a = smooth([
      [CX - 4, 50],
      [CX - 14, 22],
      [CX + 8, 10],
      [CX + 20, 22],
      [CX + 8, 20],
      [CX + 2, 34],
      [CX + 6, 50],
    ]);
    hairPaint(g, a, c, 10, 50);
  }
}

// ---------------------------------------------------------------- whole figure

/** Resolve what is worn in a slot to its garment definition and colours. */
function worn(spec, slot) {
  const w = spec.wear?.[slot];
  if (!w) return null;
  const def = GARMENTS[w.id];
  if (!def) return null;
  return { def, c: [w.c?.[0] ?? def.c[0], w.c?.[1] ?? def.c[1]] };
}

// Match hatbands to the crown and keep the ear cups at the sides of the face.
function fitHeadwear(g, id, crown, illustrated) {
  switch (id) {
    case 'beret':
      g.translate(0, crown - 53);
      break;
    case 'cap':
      g.translate(0, illustrated ? crown - 69 : -5);
      break;
    case 'bow':
      g.translate(illustrated ? -10 : -5, crown - 27);
      break;
    case 'headphones':
      g.translate(0, 153);
      g.scale(1, (156 - crown) / 127);
      g.translate(0, -153);
      break;
  }
}

function part(g, B, item, name, spec) {
  if (item && item.def[name]) item.def[name](g, B, item.c[0], item.c[1], spec);
}

/**
 * Draw one character.
 * spec: { sex, skin, eye, hair: { style, bangs, color, length, streak, ahoge },
 *         wear: { top, bottom, dress, outer, shoes, legs, acc: [..] }, expr }
 * options.blink draws the eyes shut for one frame of a blink.
 */
export function drawFigure(g, spec, { blink = false } = {}) {
  const B = metrics(spec.sex),
    e = EXPRESSIONS[spec.expr] ?? EXPRESSIONS.normal;
  const top = worn(spec, 'top'),
    bottom = worn(spec, 'bottom'),
    dress = worn(spec, 'dress');
  const outer = worn(spec, 'outer'),
    shoes = worn(spec, 'shoes'),
    legs = worn(spec, 'legs');
  const acc = (spec.wear?.acc ?? [])
    .map(a => ({ id: a.id, def: GARMENTS[a.id], c: [a.c?.[0] ?? GARMENTS[a.id]?.c[0], a.c?.[1] ?? GARMENTS[a.id]?.c[1]] }))
    .filter(a => a.def);

  // Use the same scale and pivot for the head, hair and attached accessories.
  const head = draw => {
    g.save();
    g.translate(CX, 216);
    g.scale(HEAD_SCALE, HEAD_SCALE);
    g.translate(-CX, -216);
    draw();
    g.restore();
  };
  const illustrated = hasLayeredHead(spec);
  const crown = illustrated ? layeredCrownY(spec) : 44;
  const accessories = layer => {
    for (const a of acc) {
      if (a.def.layer !== layer) continue;
      g.save();
      if (layer === 'head') fitHeadwear(g, a.id, crown, illustrated);
      a.def.draw(g, B, a.c[0], a.c[1], spec);
      g.restore();
    }
  };
  g.save();
  g.translate(0, FIGURE_TOP);
  if (!illustrated) head(() => drawHairBack(g, spec.hair));
  part(g, B, outer, 'back', spec);
  drawLegs(g, B, spec.skin);
  part(g, B, legs, 'legs', spec);
  part(g, B, shoes, 'shoes', spec);
  drawArms(g, B, spec.skin);
  drawTorsoSkin(g, B, spec.skin);
  const tucked = top && top.def.tuck && !dress;
  if (tucked) part(g, B, top, 'torso', spec);
  if (!dress) part(g, B, bottom, 'bottom', spec);
  if (dress) part(g, B, dress, 'dress', spec);
  else {
    if (!tucked) part(g, B, top, 'torso', spec);
    part(g, B, top, 'sleeves', spec);
  }
  accessories('neck');
  part(g, B, outer, 'torso', spec);
  part(g, B, outer, 'sleeves', spec);
  accessories('body');
  head(() => {
    if (illustrated) paintLayeredHead(g, spec);
    else drawHead(g, spec, e, blink);
    g.save();
    if (illustrated) g.translate(0, layeredEyeY(spec) - 160);
    accessories('face');
    g.restore();
    if (!illustrated) drawHairFront(g, spec.hair);
    accessories('head');
  });
  g.restore();
}

/** A plain mannequin used behind garments in shop and wardrobe thumbnails. */
export function drawMannequin(g, sex) {
  const B = metrics(sex),
    c = '#d9d3e6';
  g.save();
  g.globalAlpha = 0.55;
  drawLegs(g, B, c);
  drawTorsoSkin(g, B, c);
  drawArms(g, B, c);
  paint(
    g,
    smooth(
      sym(
        [
          [CX, 62],
          [CX - 40, 74],
          [CX - 55, 112],
          [CX - 56, 150],
          [CX - 50, 180],
          [CX - 33, 202],
          [CX - 12, 214],
          [CX, 216],
        ],
        CX,
      ),
    ),
    c,
    { y0: 60, y1: 216 },
  );
  g.restore();
}
