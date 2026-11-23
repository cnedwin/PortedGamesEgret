// 手卷：每一卷是一幅用代码画的青绿山水——绢底、远山石青、近山上青绿下赭石、皴笔、松树和桃花、水口、亭子和小舟、
// 留白的云带、卷尾的朱印。没开始时只看得见墨线的白描，消掉的沙越多，颜色从左往右一点点"染"上去，边缘带一点毛。
// 画只画一次，揭开的程度变了才合成一次，交给引擎做成贴图。
// The handscroll: each scroll is a blue-and-green landscape painted in code — silk, far hills in azurite, near hills
// green and blue above and ochre below, texture strokes, pines and peach blossom, water, a pavilion and a boat, bands
// of bare mist, a red seal at the end. Before play only the ink drawing shows; the more sand is cleared, the further
// the colour spreads from left to right, with a ragged edge. The painting is drawn once, put together again only when
// the share uncovered changes, and handed to the engine as a texture.
import { createRandom } from '../sim/sand.mjs';

export const PAINTING = { width: 960, height: 240 };
export const KAI = '"KaiTi", "STKaiti", "Kaiti SC", "Noto Serif CJK SC", "Noto Serif SC", "Songti SC", serif';

const INK = 'rgba(38, 30, 22, ';

function canvas(w, h) {
  const c = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  return c;
}

/** Smooth noise along one line, from a seeded table. */
function ridgeNoise(rng, n = 64) {
  const table = Array.from({ length: n + 1 }, () => rng());
  return (t) => {
    const x = t * n,
      i = Math.floor(x),
      f = x - i,
      s = f * f * (3 - 2 * f);
    return table[Math.min(n, i)] * (1 - s) + table[Math.min(n, i + 1)] * s;
  };
}

/** The silk: warm, a little uneven, with its weave and a few age spots. */
function silk(g, w, h, rng) {
  const base = g.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#e8d9b6');
  base.addColorStop(0.5, '#e4d3ac');
  base.addColorStop(1, '#d9c599');
  g.fillStyle = base;
  g.fillRect(0, 0, w, h);
  g.globalAlpha = 0.05;
  g.strokeStyle = '#7a6440';
  for (let y = 0; y < h; y += 2) {
    g.beginPath();
    g.moveTo(0, y + rng());
    g.lineTo(w, y + rng());
    g.stroke();
  }
  for (let x = 0; x < w; x += 3) {
    g.beginPath();
    g.moveTo(x + rng(), 0);
    g.lineTo(x + rng(), h);
    g.stroke();
  }
  g.globalAlpha = 1;
  for (let k = 0; k < 18; k++) {
    const x = rng() * w,
      y = rng() * h,
      r = 6 + rng() * 26,
      spot = g.createRadialGradient(x, y, 0, x, y, r);
    spot.addColorStop(0, 'rgba(150, 112, 60, 0.10)');
    spot.addColorStop(1, 'rgba(150, 112, 60, 0)');
    g.fillStyle = spot;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/** One mountain mass: an outline of peaks between `x0` and `x1` with its foot at `foot`. Returns its outline points. */
function massOutline(rng, x0, x1, foot, peak, peaks = 3) {
  const noise = ridgeNoise(rng, 24),
    pts = [];
  const tops = Array.from({ length: peaks }, (_, k) => ({ at: (k + 0.5 + (rng() - 0.5) * 0.5) / peaks, height: 0.55 + rng() * 0.45 }));
  for (let k = 0; k <= 80; k++) {
    const t = k / 80;
    let lift = 0;
    for (const p of tops) lift = Math.max(lift, p.height * Math.max(0, 1 - Math.abs(t - p.at) * peaks * 1.25) ** 1.4);
    const edge = Math.sin(Math.PI * t) ** 0.6;
    pts.push([x0 + (x1 - x0) * t, foot - (peak * lift * edge + noise(t) * peak * 0.12 * edge)]);
  }
  return pts;
}

/**
 * The three paintings: their title, the seeds of their drawing, the colours of their hills from the peaks down, the
 * wash under the ridges, and what grows on the lower slopes.
 */
export const PAINTINGS = Object.freeze({
  spring: { title: ['春', '山', '圖'], draw: 911, silk: 2024, flora: 'blossom', wash: 'rgba(18, 58, 110, 0.35)', stops: [[0, 'rgba(30, 84, 158, 0.96)'], [0.28, 'rgba(40, 118, 150, 0.94)'], [0.55, 'rgba(56, 146, 108, 0.92)'], [0.85, 'rgba(132, 140, 80, 0.86)'], [1, 'rgba(178, 120, 66, 0.82)']] },
  autumn: { title: ['秋', '山', '圖'], draw: 512, silk: 33, flora: 'maple', wash: 'rgba(90, 40, 20, 0.35)', stops: [[0, 'rgba(46, 92, 140, 0.95)'], [0.3, 'rgba(112, 130, 96, 0.92)'], [0.55, 'rgba(190, 128, 60, 0.9)'], [0.82, 'rgba(184, 82, 46, 0.88)'], [1, 'rgba(138, 70, 40, 0.84)']] },
  snow: { title: ['雪', '山', '圖'], draw: 77, silk: 5, flora: 'snow', wash: 'rgba(60, 80, 110, 0.3)', stops: [[0, 'rgba(246, 244, 238, 0.98)'], [0.3, 'rgba(206, 216, 226, 0.95)'], [0.55, 'rgba(140, 168, 190, 0.92)'], [0.82, 'rgba(78, 116, 112, 0.9)'], [1, 'rgba(70, 82, 92, 0.86)']] }
});
let season = PAINTINGS.spring;

function fillMass(g, pts, foot, colour, top) {
  // The mass ends where its outline meets the ground: no straight sides below the foot.
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts) g.lineTo(x, y);
  g.closePath();
  if (colour) {
    const grad = g.createLinearGradient(0, top, 0, foot);
    for (const [at, rgba] of season.stops) grad.addColorStop(at, rgba);
    g.fillStyle = grad;
    g.fill();
    // A darker wash just under the ridge gives the mass its roundness.
    g.save();
    g.clip();
    g.lineJoin = 'round';
    g.strokeStyle = season.wash;
    g.lineWidth = 14;
    g.filter = 'blur(5px)';
    g.beginPath();
    for (const [x, y] of pts) g.lineTo(x, y + 6);
    g.stroke();
    g.restore();
  } else {
    g.fillStyle = 'rgba(236, 224, 196, 0.55)';
    g.fill();
  }
}

/** Ink: the outline of a mass, thick and thin, and its texture strokes down the slopes. */
function inkMass(g, pts, foot, rng, weight = 1) {
  g.lineCap = 'round';
  for (let k = 1; k < pts.length; k++) {
    g.strokeStyle = INK + (0.55 + rng() * 0.35) + ')';
    g.lineWidth = (0.8 + rng() * 1.6) * weight;
    g.beginPath();
    g.moveTo(pts[k - 1][0], pts[k - 1][1]);
    g.lineTo(pts[k][0], pts[k][1]);
    g.stroke();
  }
  // Texture strokes: short, slightly curved strokes that follow the slope down from the ridge, thicker near it.
  for (let k = 0; k < pts.length * 1.6; k++) {
    const at = 1 + Math.floor(rng() * (pts.length - 2)),
      p = pts[at],
      q = pts[at + 1],
      slope = Math.atan2(q[1] - p[1], q[0] - p[0]),
      down = slope + (slope > 0 ? 0.9 : -0.9) + Math.PI / 2,
      depth = rng() * Math.max(6, (foot - p[1]) * 0.45),
      x = p[0] + Math.cos(down) * depth * 0.4,
      y = p[1] + 3 + depth,
      len = 4 + rng() * 8;
    g.strokeStyle = INK + (0.12 + rng() * 0.2 * (1 - depth / Math.max(1, foot - p[1]))) + ')';
    g.lineWidth = 0.5 + rng() * 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(down) * len * 0.5 + (rng() - 0.5) * 3, y + len * 0.5, x + Math.cos(down) * len, y + len * 0.8);
    g.stroke();
  }
}

function pine(g, x, y, s, colour, rng) {
  g.strokeStyle = INK + '0.8)';
  g.lineWidth = 1.2 * s;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x + (rng() - 0.5) * 6 * s, y - 14 * s, x + (rng() - 0.5) * 4, y - 26 * s);
  g.stroke();
  for (let k = 0; k < 4; k++) {
    const ty = y - (8 + k * 5) * s,
      half = (10 - k * 2) * s;
    g.fillStyle = colour ? `rgba(${30 + k * 6}, ${82 + k * 8}, ${58 + k * 4}, 0.9)` : INK + '0.25)';
    g.beginPath();
    g.ellipse(x, ty, half, 3 * s, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = INK + '0.55)';
    g.lineWidth = 0.6;
    g.stroke();
  }
}

function blossom(g, x, y, s, colour, rng) {
  g.strokeStyle = INK + '0.7)';
  g.lineWidth = 1 * s;
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + 2 * s, y - 12 * s);
  g.lineTo(x - 5 * s, y - 18 * s);
  g.moveTo(x + 2 * s, y - 12 * s);
  g.lineTo(x + 8 * s, y - 17 * s);
  g.stroke();
  for (let k = 0; k < 26; k++) {
    g.fillStyle = colour ? `rgba(${226 + rng() * 20}, ${132 + rng() * 40}, ${150 + rng() * 30}, 0.85)` : INK + '0.18)';
    g.beginPath();
    g.arc(x + (rng() - 0.5) * 18 * s, y - 14 * s + (rng() - 0.5) * 10 * s, 1.1 + rng() * 1.3, 0, Math.PI * 2);
    g.fill();
  }
}

/** A maple: a bent trunk and clusters of red and orange leaves. */
function maple(g, x, y, s, colour, rng) {
  g.strokeStyle = INK + '0.75)';
  g.lineWidth = 1.2 * s;
  g.beginPath();
  g.moveTo(x, y);
  g.quadraticCurveTo(x - 4 * s, y - 10 * s, x + 2 * s, y - 20 * s);
  g.stroke();
  for (let k = 0; k < 30; k++) {
    g.fillStyle = colour ? `rgba(${196 + rng() * 40}, ${60 + rng() * 70}, ${30 + rng() * 20}, 0.88)` : INK + '0.18)';
    g.beginPath();
    g.arc(x + (rng() - 0.5) * 20 * s, y - 18 * s + (rng() - 0.5) * 12 * s, 1.2 + rng() * 1.6, 0, Math.PI * 2);
    g.fill();
  }
}

/** Snow on a slope: a few white drifts with a grey shadow under them. */
function drifts(g, x, y, s, colour, rng) {
  for (let k = 0; k < 5; k++) {
    const dx = (rng() - 0.5) * 30 * s,
      w = (8 + rng() * 10) * s;
    g.fillStyle = colour ? 'rgba(250, 250, 246, 0.9)' : 'rgba(250, 246, 236, 0.7)';
    g.beginPath();
    g.ellipse(x + dx, y - rng() * 6, w, 2.5 * s, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = INK + '0.2)';
    g.lineWidth = 0.6;
    g.stroke();
  }
}

function pavilion(g, x, y, colour) {
  g.lineWidth = 1.2;
  g.strokeStyle = INK + '0.85)';
  // Platform, red pillars, a roof with lifted eaves.
  g.fillStyle = colour ? 'rgba(200, 188, 160, 0.9)' : 'rgba(236, 224, 196, 0.6)';
  g.fillRect(x - 14, y - 3, 28, 3);
  g.strokeRect(x - 14, y - 3, 28, 3);
  g.fillStyle = colour ? 'rgba(186, 58, 40, 0.95)' : INK + '0.3)';
  for (const dx of [-10, -3, 4, 10]) g.fillRect(x + dx - 1, y - 14, 2, 11);
  g.beginPath();
  g.moveTo(x - 20, y - 13);
  g.quadraticCurveTo(x - 10, y - 15, x - 7, y - 21);
  g.lineTo(x + 7, y - 21);
  g.quadraticCurveTo(x + 10, y - 15, x + 20, y - 13);
  g.closePath();
  g.fillStyle = colour ? 'rgba(54, 70, 80, 0.95)' : INK + '0.35)';
  g.fill();
  g.stroke();
}

function boat(g, x, y, colour) {
  g.strokeStyle = INK + '0.85)';
  g.lineWidth = 1.2;
  g.beginPath();
  g.moveTo(x - 16, y);
  g.quadraticCurveTo(x, y + 6, x + 16, y);
  g.stroke();
  g.fillStyle = colour ? 'rgba(120, 82, 50, 0.9)' : INK + '0.3)';
  g.beginPath();
  g.moveTo(x - 4, y + 1);
  g.lineTo(x - 2, y - 7);
  g.lineTo(x + 3, y - 7);
  g.lineTo(x + 5, y + 1);
  g.fill();
  g.beginPath();
  g.moveTo(x + 6, y - 2);
  g.lineTo(x + 22, y - 12);
  g.stroke();
}

function water(g, w, h, rng, colour) {
  if (colour) {
    const wash = g.createLinearGradient(0, h * 0.68, 0, h);
    wash.addColorStop(0, 'rgba(150, 186, 186, 0.0)');
    wash.addColorStop(0.3, 'rgba(140, 180, 176, 0.45)');
    wash.addColorStop(1, 'rgba(96, 150, 160, 0.6)');
    g.fillStyle = wash;
    g.fillRect(0, h * 0.68, w, h * 0.32);
  }
  g.strokeStyle = INK + '0.28)';
  g.lineWidth = 0.7;
  for (let k = 0; k < 140; k++) {
    const x = rng() * w,
      y = h * 0.78 + rng() * h * 0.2,
      r = 5 + rng() * 7;
    g.beginPath();
    g.arc(x, y, r, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
  }
}

function mist(g, w, h, rng) {
  for (let k = 0; k < 5; k++) {
    const y = h * (0.35 + rng() * 0.35),
      x = rng() * w,
      len = 160 + rng() * 260,
      band = g.createLinearGradient(x, 0, x + len, 0);
    band.addColorStop(0, 'rgba(240, 232, 210, 0)');
    band.addColorStop(0.5, 'rgba(240, 232, 210, 0.5)');
    band.addColorStop(1, 'rgba(240, 232, 210, 0)');
    g.fillStyle = band;
    g.filter = 'blur(6px)';
    g.beginPath();
    g.ellipse(x + len / 2, y, len / 2, 7 + rng() * 6, 0, 0, Math.PI * 2);
    g.fill();
    g.filter = 'none';
  }
}

function seal(g, x, y, s, words) {
  g.fillStyle = 'rgba(178, 40, 32, 0.92)';
  g.fillRect(x, y, s, s);
  g.fillStyle = '#efe0c4';
  g.font = `700 ${Math.round(s * 0.42)}px ${KAI}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(words[0], x + s * 0.72, y + s * 0.3);
  g.fillText(words[1], x + s * 0.72, y + s * 0.72);
  if (words[2]) g.fillText(words[2], x + s * 0.28, y + s * 0.3);
  if (words[3]) g.fillText(words[3], x + s * 0.28, y + s * 0.72);
}

/**
 * Paint scroll `id` in full colour (`colour` true) or as the ink drawing. `bare` leaves out the silk; `silkOnly` paints
 * nothing else. Returns a canvas.
 */
export function paintScroll(id = 'spring', colour = true, { width = PAINTING.width, height = PAINTING.height, bare = false, silkOnly = false } = {}) {
  const c = canvas(width, height),
    g = c.getContext('2d'),
    w = width,
    h = height,
    look = (season = PAINTINGS[id] ?? PAINTINGS.spring),
    rng = createRandom(look.silk),
    // The drawing itself uses its own stream, so the ink and the colour versions match line for line.
    draw = createRandom(look.draw);
  g.save();
  g.scale(w / PAINTING.width, h / PAINTING.height);
  const W = PAINTING.width,
    H = PAINTING.height;
  // Bare: no silk under it, so the clear pixels show where nothing is painted (the unpaint mode's sand).
  if (!bare) silk(g, W, H, rng);
  // Silk only: the bare cloth, under a picture of sand.
  if (silkOnly) {
    g.restore();
    return c;
  }
  if (!colour) {
    g.fillStyle = 'rgba(240, 230, 205, 0.35)';
    g.fillRect(0, 0, W, H);
  }
  // Far hills, pale.
  for (const [x0, x1, foot, peak] of [
    [-40, 380, 130, 78],
    [300, 720, 120, 64],
    [620, 1010, 132, 84]
  ]) {
    const pts = massOutline(draw, x0, x1, foot, peak, 4);
    if (colour) {
      g.save();
      g.globalAlpha = 0.55;
      fillMass(g, pts, foot + 20, true, foot - peak);
      g.restore();
    }
    g.save();
    g.globalAlpha = 0.45;
    inkMass(g, pts, foot, draw, 0.6);
    g.restore();
  }
  mist(g, W, H, draw);
  // Near masses: the body of the painting.
  const near = [
    [-30, 300, 200, 150, 3],
    [240, 520, 192, 118, 2],
    [470, 760, 205, 160, 3],
    [700, 990, 196, 124, 2]
  ];
  const ridges = [];
  for (const [x0, x1, foot, peak, peaks] of near) {
    const pts = massOutline(draw, x0, x1, foot, peak, peaks);
    ridges.push(pts);
    fillMass(g, pts, foot + 30, colour, foot - peak);
    inkMass(g, pts, foot, draw, 1);
  }
  water(g, W, H, draw, colour);
  // Pines on the ridges, peach blossom on the lower slopes.
  for (const pts of ridges)
    for (let k = 0; k < 5; k++) {
      const p = pts[8 + Math.floor(draw() * (pts.length - 16))];
      pine(g, p[0], p[1] + 6 + draw() * 10, 0.7 + draw() * 0.4, colour, draw);
    }
  const flora = { blossom, maple, snow: drifts }[look.flora];
  for (let k = 0; k < 7; k++) {
    // Snow lies on the slopes; blossom and maples grow along the foot of the hills.
    const ridge = ridges[k % ridges.length],
      p = ridge[10 + Math.floor(draw() * (ridge.length - 20))],
      [x, y] = look.flora === 'snow' ? [p[0], p[1] + 14 + draw() * 16] : [40 + draw() * 880, 196 + draw() * 14];
    flora(g, x, y, 0.8 + draw() * 0.4, colour, draw);
  }
  // Falling snow over the snow scroll.
  if (look.flora === 'snow' && colour) {
    g.fillStyle = 'rgba(255, 255, 255, 0.85)';
    for (let k = 0; k < 220; k++) {
      g.beginPath();
      g.arc(draw() * W, draw() * H * 0.8, 0.6 + draw() * 1.2, 0, Math.PI * 2);
      g.fill();
    }
  }
  // The pavilion stands on a shoulder of the third mass, a little below its ridge.
  const shoulder = ridges[2].reduce((a, b) => (Math.abs(b[0] - 540) < Math.abs(a[0] - 540) ? b : a));
  pavilion(g, shoulder[0], shoulder[1] + 16, colour);
  boat(g, 390, 214, colour);
  boat(g, 820, 222, colour);
  mist(g, W, H, draw);
  // The title and the seal at the end of the scroll.
  g.fillStyle = INK + '0.85)';
  g.font = `400 20px ${KAI}`;
  g.textAlign = 'center';
  g.textBaseline = 'top';
  look.title.forEach((ch, k) => g.fillText(ch, 924, 22 + k * 22));
  seal(g, 906, 96, 34, colour ? ['沙', '畫', '江', '山'] : ['沙', '畫', '江', '山']);
  g.restore();
  return c;
}

/**
 * The scroll as it is uncovered: the ink drawing, with the colour spread from the left up to `share` (0 to 1) and a
 * ragged front. `make(canvas)` turns the result into a texture.
 */
export function createScrollPainter(id = 'spring', { width = PAINTING.width, height = PAINTING.height } = {}) {
  const ink = paintScroll(id, false, { width, height }).getContext('2d').getImageData(0, 0, width, height),
    full = paintScroll(id, true, { width, height }).getContext('2d').getImageData(0, 0, width, height),
    out = canvas(width, height),
    g = out.getContext('2d'),
    image = g.createImageData(width, height),
    rng = createRandom(31),
    // The front's raggedness: a coarse noise field over the painting.
    cell = 12,
    nx = Math.ceil(width / cell) + 1,
    ny = Math.ceil(height / cell) + 1,
    field = Float32Array.from({ length: nx * ny }, () => rng());
  const rough = (x, y) => {
    const fx = x / cell,
      fy = y / cell,
      ix = Math.floor(fx),
      iy = Math.floor(fy),
      tx = fx - ix,
      ty = fy - iy,
      a = field[iy * nx + ix],
      b = field[iy * nx + ix + 1],
      c = field[(iy + 1) * nx + ix],
      d = field[(iy + 1) * nx + ix + 1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };
  const threshold = new Float32Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) threshold[y * width + x] = (x / width) * 0.84 + rough(x, y) * 0.16;
  let shown = -1;
  return {
    canvas: out,
    /** Put the painting together at `share`; returns false when nothing visible changed. */
    paint(share) {
      const s = Math.round(share * 400) / 400;
      if (s === shown) return false;
      shown = s;
      const a = ink.data,
        b = full.data,
        o = image.data,
        edge = 0.025,
        reach = s * (1 + edge);
      for (let p = 0, q = 0; p < threshold.length; p++, q += 4) {
        const m = s >= 1 ? 1 : Math.max(0, Math.min(1, (reach - threshold[p]) / edge));
        o[q] = a[q] + (b[q] - a[q]) * m;
        o[q + 1] = a[q + 1] + (b[q + 1] - a[q + 1]) * m;
        o[q + 2] = a[q + 2] + (b[q + 2] - a[q + 2]) * m;
        o[q + 3] = 255;
      }
      g.putImageData(image, 0, 0);
      return true;
    }
  };
}

/** The scroll's mount in Canvas 2D: a shadow, blue-grey silk, a gold line and two rollers with jade ends. */
export function mountScroll(g, { x, y, w, h }) {
  g.fillStyle = 'rgba(0, 0, 0, 0.4)';
  g.fillRect(x - 12, y + 8, w + 24, h + 8);
  g.fillStyle = '#5a6e7a';
  g.fillRect(x - 8, y - 6, w + 16, h + 12);
  g.strokeStyle = 'rgba(226, 184, 102, 0.6)';
  g.lineWidth = 1;
  g.strokeRect(x - 3, y - 3, w + 6, h + 6);
  for (const rx of [x - 16, x + w + 8]) {
    const wood = g.createLinearGradient(rx, 0, rx + 8, 0);
    wood.addColorStop(0, '#3a1f12');
    wood.addColorStop(0.5, '#8a5634');
    wood.addColorStop(1, '#2a160c');
    g.fillStyle = wood;
    g.fillRect(rx, y - 10, 8, h + 20);
    g.fillStyle = '#7fb59a';
    g.fillRect(rx - 1, y - 16, 10, 7);
    g.fillRect(rx - 1, y + h + 9, 10, 7);
  }
}

/** A rosewood panel with a gold inner line and a gold bar on its top edge, as the interface kit draws one (Canvas 2D). */
export function drawPanel(g, x, y, w, h) {
  const face = g.createLinearGradient(0, y, 0, y + h);
  face.addColorStop(0, 'rgba(62, 36, 22, 0.94)');
  face.addColorStop(1, 'rgba(30, 17, 10, 0.94)');
  g.fillStyle = face;
  g.strokeStyle = '#140b06';
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(x, y, w, h, 16);
  g.fill();
  g.stroke();
  g.strokeStyle = 'rgba(226, 184, 102, 0.6)';
  g.lineWidth = 1.5;
  g.beginPath();
  g.roundRect(x + 8, y + 8, w - 16, h - 16, 10);
  g.stroke();
  g.fillStyle = 'rgba(226, 184, 102, 0.9)';
  g.fillRect(x + 20, y, w - 40, 4);
}
