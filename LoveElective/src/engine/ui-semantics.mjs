// Accessible names for illustration-backed native targets.
/** Existing hand-painted cards carry their names inside their hit rectangles. */
export function describePaintedHit(words, hit, fill) {
  const inside = words.filter(word => word.x + word.w > hit.x && word.x < hit.x + hit.w
    && word.y + word.h > hit.y && word.y < hit.y + hit.h);
  if (inside.length) return [...new Set(inside.map(word => word.text.trim()).filter(Boolean))].join(' · ');
  if (hit.w <= 64 && hit.h <= 40 && /^#[\da-f]{3,8}$/i.test(String(fill))) return `颜色 / Colour ${fill}`;
  if (!hit.hover) return '自定义颜色 / Custom colour';
  return '选项 / Option';
}
