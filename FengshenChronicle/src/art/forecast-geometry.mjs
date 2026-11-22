// The warning is the union of the same two round-ended segments used by
// forecastHits. A single contour avoids darker overlaps and false flat ends.
const contours = new Map();
export function capsuleCrossContour(radius, width = 70) {
  const key = `${radius}:${width}`;
  if (contours.has(key)) return contours.get(key);
  if (!Number.isFinite(radius) || !Number.isFinite(width) || width <= 0 || radius < width / 2)
    throw new RangeError('A cross arm must be at least as long as its cap radius');
  const a = width / 2, start = Object.freeze({ x: 0, y: -radius - a });
  const segments = [];
  let x = start.x, y = start.y, length = 0;
  function line(toX, toY) {
    const size = Math.hypot(toX - x, toY - y);
    segments.push(Object.freeze({ kind: 'line', fromX: x, fromY: y, x: toX, y: toY, length: size }));
    x = toX; y = toY; length += size;
  }
  function arc(cx, cy, from, to) {
    const size = a * (to - from);
    segments.push(Object.freeze({ kind: 'arc', x: cx, y: cy, radius: a, from, to, length: size }));
    x = cx + Math.cos(to) * a; y = cy + Math.sin(to) * a; length += size;
  }
  arc(0, -radius, -Math.PI / 2, 0);
  line(a, -a); line(radius, -a);
  arc(radius, 0, -Math.PI / 2, Math.PI / 2);
  line(a, a); line(a, radius);
  arc(0, radius, 0, Math.PI);
  line(-a, a); line(-radius, a);
  arc(-radius, 0, Math.PI / 2, Math.PI * 1.5);
  line(-a, -a); line(-a, -radius);
  arc(0, -radius, Math.PI, Math.PI * 1.5);
  const shape = Object.freeze({ start, segments: Object.freeze(segments), length,
    bounds: Object.freeze({ minX: -radius-a, minY: -radius-a, maxX: radius+a, maxY: radius+a }) });
  if (contours.size >= 16) contours.delete(contours.keys().next().value);
  contours.set(key, shape);
  return shape;
}

// Both filled ground tint and unfilled roof-visible edge take this exact path.
// Progress is measured along the boundary, so it never implies a danger circle.
export function traceCapsuleCross(graphics, x, y, radius, width = 70, progress = 1) {
  const fraction = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  if (!fraction) return graphics;
  const shape = capsuleCrossContour(radius, width);
  let remaining = shape.length * fraction;
  graphics.moveTo(x + shape.start.x, y + shape.start.y);
  for (const part of shape.segments) {
    if (remaining <= 0) break;
    const ratio = Math.min(1, remaining / part.length);
    if (part.kind === 'arc') graphics.drawArc(x + part.x, y + part.y, part.radius, part.from, part.from + (part.to - part.from) * ratio);
    else graphics.lineTo(x + part.fromX + (part.x - part.fromX) * ratio, y + part.fromY + (part.y - part.fromY) * ratio);
    remaining -= part.length;
  }
  if (fraction === 1) graphics.lineTo(x + shape.start.x, y + shape.start.y);
  return graphics;
}
