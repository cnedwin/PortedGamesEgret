import { FIELD } from './sim/data.mjs';

/** The game has one unchanging simulation map. This only plans its place on the native UI stage. */
export function planCanalLayout(screen) {
  const { width, height } = screen;
  const raw = screen.safe ?? { x: 0, y: 0, width, height };
  const safe = { x: raw.x ?? 0, y: raw.y ?? 0, width: raw.width ?? width, height: raw.height ?? height };
  const { x, y, width: w, height: h } = safe;
  const mode = h > w ? 'portrait' : w / h >= 2.0 ? 'wide' : 'desktop';
  let area;
  if (mode === 'portrait') {
    // The controls stay above the canal; a selected tower opens its sheet below.
    area = { x: x + 12, y: y + 204, width: w - 24, height: Math.max(120, h - 574) };
  } else if (mode === 'wide') {
    // On a short landscape phone, move the same controls beside the map.
    const sidebar = Math.min(314, Math.max(242, Math.round(w * 0.20)));
    area = { x: x + sidebar + 12, y: y + 12, width: w - sidebar - 24, height: h - 48 };
  } else {
    area = { x: x + 16, y: y + 124, width: w - 32, height: h - 168 };
  }
  const scale = Math.min(area.width / FIELD.width, area.height / FIELD.height);
  const fw = FIELD.width * scale, fh = FIELD.height * scale;
  const field = { x: area.x + (area.width - fw) / 2,
    y: area.y + (mode === 'portrait' ? 0 : (area.height - fh) / 2), width: fw, height: fh, scale };
  return { width, height, safe, mode, field };
}

/** Convert a native stage point back to the simulation map. */
export function stageToField(layout, x, y) {
  const f = layout.field;
  if (x < f.x || y < f.y || x > f.x + f.width || y > f.y + f.height) return null;
  return { x: (x - f.x) / f.scale, y: (y - f.y) / f.scale };
}
