// Shared 2D drawing helpers for every painter in src/art: colour maths,
// smooth outlines from point lists, and a few cel-shading fills.

/** Parse `#rgb` or `#rrggbb` into [r, g, b] (0–255). */
export function rgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const hex = ([r, g, b]) =>
  '#' +
  [r, g, b]
    .map(v =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');

/** Blend two colours; t = 0 gives a, t = 1 gives b. */
export function mix(a, b, t) {
  const A = rgb(a),
    B = rgb(b);
  return hex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** Lighten (t > 0) towards white or darken (t < 0) towards a cool dark tone. */
export const shade = (c, t) => (t >= 0 ? mix(c, '#ffffff', t) : mix(c, '#241a33', -t));

export const rgba = (c, a) => {
  const [r, g, b] = rgb(c);
  return `rgba(${r},${g},${b},${a})`;
};

/** HSL (h in degrees, s and l in 0–1) to hex. */
export function hsl(h, s, l) {
  const k = n => (n + h / 30) % 12,
    a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return hex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

/**
 * Build a smooth path through points (Catmull-Rom converted to Béziers).
 * A point written as [x, y, 1] is a sharp corner.
 */
export function smooth(points, closed = true, tension = 0.5) {
  const path = new Path2D(),
    n = points.length;
  if (n < 2) return path;
  const at = i => (closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))]);
  // Tangent at each point; a corner has none, so the curve arrives and leaves straight.
  const tangent = i => {
    const p = at(i);
    if (p[2]) return [0, 0];
    const a = at(i - 1),
      b = at(i + 1);
    return [(b[0] - a[0]) * tension, (b[1] - a[1]) * tension];
  };
  path.moveTo(points[0][0], points[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p1 = at(i),
      p2 = at(i + 1),
      m1 = tangent(i),
      m2 = tangent(i + 1);
    path.bezierCurveTo(p1[0] + m1[0] / 3, p1[1] + m1[1] / 3, p2[0] - m2[0] / 3, p2[1] - m2[1] / 3, p2[0], p2[1]);
  }
  if (closed) path.closePath();
  return path;
}

/** Straight-edged polygon path. */
export function poly(points, closed = true) {
  const path = new Path2D();
  points.forEach((p, i) => (i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1])));
  if (closed) path.closePath();
  return path;
}

/**
 * Mirror a half outline (points listed top to bottom) around x = cx into a
 * closed symmetric point list. Points lying on the axis are not repeated.
 */
export function sym(half, cx) {
  return [
    ...half,
    ...half
      .slice()
      .reverse()
      .filter(p => p[0] !== cx)
      .map(([x, y, c]) => [2 * cx - x, y, c]),
  ];
}

/** Outline of a limb: a centre line of [x, y, halfWidth] points turned into a closed point list. */
export function tube(line) {
  const left = [],
    right = [];
  for (let i = 0; i < line.length; i++) {
    const a = line[Math.max(0, i - 1)],
      b = line[Math.min(line.length - 1, i + 1)];
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len,
      ny = dx / len,
      [x, y, w] = line[i];
    left.push([x + nx * w, y + ny * w]);
    right.push([x - nx * w, y - ny * w]);
  }
  return [...left, ...right.reverse()];
}

/**
 * Fill a path with a soft top-to-bottom gradient, add a side shadow for volume,
 * then outline it in a darker tone of the same colour.
 */
export function paint(g, path, color, { line = 1.6, top, bottom, side = 0.16, x0 = 0, x1 = 400, y0 = 0, y1 = 1000, stroke } = {}) {
  const grad = g.createLinearGradient(0, y0, 0, y1);
  grad.addColorStop(0, top ?? shade(color, 0.1));
  grad.addColorStop(1, bottom ?? shade(color, -0.1));
  g.fillStyle = grad;
  g.fill(path);
  if (side) {
    g.save();
    g.clip(path);
    const s = g.createLinearGradient(x0, 0, x1, 0);
    s.addColorStop(0, rgba('#ffffff', side * 0.5));
    s.addColorStop(0.35, rgba('#ffffff', 0));
    s.addColorStop(0.7, rgba('#2a1a40', 0));
    s.addColorStop(1, rgba('#2a1a40', side));
    g.fillStyle = s;
    g.fillRect(x0 - 50, y0 - 50, x1 - x0 + 100, y1 - y0 + 100);
    g.restore();
  }
  if (line) {
    g.lineWidth = line;
    g.lineJoin = 'round';
    g.strokeStyle = stroke ?? shade(color, -0.45);
    g.stroke(path);
  }
}

/** Stroke an open line. */
export function stroke(g, path, color, width = 1.4, alpha = 1) {
  g.save();
  g.globalAlpha *= alpha;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = color;
  g.stroke(path);
  g.restore();
}

/** Rounded rectangle path. */
export function rrect(x, y, w, h, r) {
  const p = new Path2D();
  r = Math.min(r, w / 2, h / 2);
  p.moveTo(x + r, y);
  p.arcTo(x + w, y, x + w, y + h, r);
  p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r);
  p.arcTo(x, y, x + w, y, r);
  p.closePath();
  return p;
}

export function ellipse(x, y, rx, ry, rot = 0) {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  return p;
}

/** Five-pointed (or n-pointed) star path. */
export function star(x, y, outer, inner, n = 5, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? inner : outer,
      a = rot + (i * Math.PI) / n;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  return poly(pts);
}

/** Heart path centred on (x, y) with overall size s. */
export function heart(x, y, s) {
  const p = new Path2D();
  p.moveTo(x, y + s * 0.9);
  p.bezierCurveTo(x - s * 1.5, y - s * 0.1, x - s * 0.8, y - s * 1.1, x, y - s * 0.35);
  p.bezierCurveTo(x + s * 0.8, y - s * 1.1, x + s * 1.5, y - s * 0.1, x, y + s * 0.9);
  p.closePath();
  return p;
}

/** Small deterministic random generator so painted scenery is identical on every load. */
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}
