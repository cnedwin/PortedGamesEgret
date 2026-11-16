// Drawing helpers for shadow-puppet parts. A part is a piece of dyed, carved leather: a filled outline with holes
// cut through it for the lamp to shine through. Everything here returns SVG text in the puppet's design coordinates
// (y down, one unit is one stage unit).

/** The dyes. Leather is translucent, so the colours are kept a little see-through. */
export const DYE = {
  ink: '#1c0f0b',
  black: '#2a1712',
  red: '#b9281d',
  crimson: '#8f1a1a',
  green: '#1c7a52',
  teal: '#176a73',
  gold: '#dc9a16',
  amber: '#c9761a',
  hide: '#ecd29a',
  fur: '#b0642a'
};

const n = value => Number(value.toFixed(2));
export const pt = ([x, y]) => `${n(x)} ${n(y)}`;

/** A closed smooth outline through the given points (a Catmull-Rom spline as cubic curves). */
export function blob(points, tension = 0.5) {
  const count = points.length,
    at = i => points[(i + count) % count];
  let d = `M${pt(at(0))}`;
  for (let i = 0; i < count; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = [p1[0] + ((p2[0] - p0[0]) * tension) / 3, p1[1] + ((p2[1] - p0[1]) * tension) / 3],
      c2 = [p2[0] - ((p3[0] - p1[0]) * tension) / 3, p2[1] - ((p3[1] - p1[1]) * tension) / 3];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d + 'Z';
}

/** An open smooth line through the given points. */
export function curve(points, tension = 0.5) {
  const at = i => points[Math.max(0, Math.min(points.length - 1, i))];
  let d = `M${pt(at(0))}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = [p1[0] + ((p2[0] - p0[0]) * tension) / 3, p1[1] + ((p2[1] - p0[1]) * tension) / 3],
      c2 = [p2[0] - ((p3[0] - p1[0]) * tension) / 3, p2[1] - ((p3[1] - p1[1]) * tension) / 3];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d;
}

/** A straight-sided closed outline. */
export const poly = points => 'M' + points.map(pt).join('L') + 'Z';

/** A circle as a path, so that it can be a hole. */
export const dot = (x, y, r) => `M${n(x - r)} ${n(y)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`;

/** A crescent cut: the carver's commonest stroke. It opens toward `angle` (degrees, clockwise from right). */
export function crescent(x, y, size, angle = 90) {
  const a = (angle * Math.PI) / 180,
    c = Math.cos(a),
    s = Math.sin(a);
  const turn = (px, py) => [x + px * c - py * s, y + px * s + py * c];
  const [l, r, deep, shallow] = [turn(0, -size), turn(0, size), turn(size * 1.05, 0), turn(size * 0.22, 0)];
  return `M${pt(l)}Q${pt(deep)} ${pt(r)}Q${pt(shallow)} ${pt(l)}Z`;
}

/** A slit: a narrow leaf-shaped cut from one point to another. */
export function slit([x1, y1], [x2, y2], width = 1.6) {
  const dx = x2 - x1,
    dy = y2 - y1,
    length = Math.hypot(dx, dy) || 1,
    nx = (-dy / length) * width,
    ny = (dx / length) * width,
    mx = (x1 + x2) / 2,
    my = (y1 + y2) / 2;
  return `M${pt([x1, y1])}Q${pt([mx + nx, my + ny])} ${pt([x2, y2])}Q${pt([mx - nx, my - ny])} ${pt([x1, y1])}Z`;
}

/** Rows of crescents, as fish scales or the plates of armour, over a rectangle; the part's outline clips them. */
export function scales(x, y, width, height, size = 4, angle = 90) {
  const cuts = [];
  for (let row = 0, py = y; py <= y + height; row++, py += size * 1.5)
    for (let px = x + (row % 2 ? size : 0); px <= x + width; px += size * 2) cuts.push(crescent(px, py, size * 0.72, angle));
  return cuts;
}

/** A row of small round holes along a line. */
export function beads([x1, y1], [x2, y2], count, r = 0.9) {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    return dot(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, r);
  });
}

let serial = 0;
/**
 * One piece of leather.
 * @param shape  the outline, as path data
 * @param fill   the dye
 * @param holes  path data of what is cut out of it
 * @param over   SVG drawn on top, uncut (painted lines, a second dye)
 * @param under  SVG drawn below the outline but cut by the holes (a second dye inside the piece)
 */
export function leather({ shape, fill = DYE.hide, holes = [], over = '', under = '', opacity = 0.88, edge = 1.05 }) {
  const id = 'cut' + ++serial;
  const cut = holes.length
    ? `<mask id="${id}" maskUnits="userSpaceOnUse" x="-400" y="-400" width="1200" height="1200"><rect x="-400" y="-400" width="1200" height="1200" fill="#fff"/><path d="${holes.join('')}" fill="#000"/></mask>`
    : '';
  const clip = `<clipPath id="${id}c"><path d="${shape}"/></clipPath>`;
  return (
    `<defs>${cut}${clip}</defs>` +
    `<g${holes.length ? ` mask="url(#${id})"` : ''}><g clip-path="url(#${id}c)"><path d="${shape}" fill="${fill}" fill-opacity="${opacity}"/>${under}</g>` +
    `<path d="${shape}" fill="none" stroke="${DYE.ink}" stroke-width="${edge}" stroke-linejoin="round"/></g>` +
    // The edge of every cut is darker, as the knife leaves it.
    (holes.length ? `<g clip-path="url(#${id}c)"><path d="${holes.join('')}" fill="none" stroke="${DYE.ink}" stroke-width="0.45" stroke-opacity="0.75"/></g>` : '') +
    over
  );
}

/** A painted line on top of the leather. */
export const line = (d, width = 0.8, colour = DYE.ink, extra = '') =>
  `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

/** The stud of a joint: where two pieces are tied together with thread. */
export const stud = (x, y, r = 1.5) => `<circle cx="${n(x)}" cy="${n(y)}" r="${r}" fill="${DYE.ink}"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.4)}" fill="${DYE.hide}"/>`;

/**
 * A strip that follows a centre line: a limb, a feather, a tail. `widths` are half-widths at the first and last
 * point (and the points between, if as many are given); the ends are rounded.
 */
export function ribbon(points, widths) {
  const count = points.length;
  const half = i => (widths.length === count ? widths[i] : widths[0] + ((widths.at(-1) - widths[0]) * i) / (count - 1));
  const left = [],
    right = [];
  for (let i = 0; i < count; i++) {
    const [ax, ay] = points[Math.max(0, i - 1)],
      [bx, by] = points[Math.min(count - 1, i + 1)],
      length = Math.hypot(bx - ax, by - ay) || 1,
      nx = -(by - ay) / length,
      ny = (bx - ax) / length,
      w = half(i);
    left.push([points[i][0] + nx * w, points[i][1] + ny * w]);
    right.push([points[i][0] - nx * w, points[i][1] - ny * w]);
  }
  // Caps: one point beyond each end, so that the spline rounds them.
  const cap = (a, b, w) => {
    const length = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
    return [a[0] + ((a[0] - b[0]) / length) * w, a[1] + ((a[1] - b[1]) / length) * w];
  };
  const head = cap(points[0], points[1], half(0) * 0.8),
    tail = cap(points.at(-1), points.at(-2), half(count - 1) * 0.8);
  return blob([head, ...left, tail, ...right.reverse()], 0.5);
}

/** Barbs along a strip: short slits slanting off its centre line on both sides, as on a feather. */
export function barbs(points, reach, step = 3, slant = 0.6, width = 0.7) {
  const cuts = [];
  let carried = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, ay] = points[i],
      [bx, by] = points[i + 1],
      length = Math.hypot(bx - ax, by - ay) || 1,
      ux = (bx - ax) / length,
      uy = (by - ay) / length;
    for (let at = step - carried; at < length; at += step) {
      const t = (i + at / length) / (points.length - 1),
        r = (typeof reach === 'function' ? reach(t) : reach) * 0.92,
        x = ax + ux * at,
        y = ay + uy * at;
      for (const side of [1, -1]) cuts.push(slit([x + -uy * side * 0.5, y + ux * side * 0.5], [x + (-uy * side + ux * slant) * r, y + (ux * side + uy * slant) * r], width));
    }
    carried = (carried + length) % step;
  }
  return cuts;
}
