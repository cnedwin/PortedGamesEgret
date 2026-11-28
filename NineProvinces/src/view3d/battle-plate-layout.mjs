// Native projection in CSS-sized local geometry, with actual safe and HUD rectangles.
const GAP = 4;
const HEIGHT = 44;
const FULL = 104;
const COMPACT = 44;
const SLOTS = [
  ['full', 0, 0], ['compact', 0, 0], ['compact', 0, -50],
  ['compact', 0, 50], ['compact', -54, 0], ['compact', 54, 0],
];

function intersects(a, b) {
  return a.left < b.right + GAP && a.right + GAP > b.left &&
    a.top < b.bottom + GAP && a.bottom + GAP > b.top;
}

const priority = item => item.selected ? 3 : item.targetable ? 2 : item.focused ? 1 : 0;

export function layoutBattlePlates(items, { width, height, safe = {left:0,top:0,right:width,bottom:height}, obstacles = [] }) {
  const claimed = obstacles.slice();
  return items.slice().sort((a, b) => priority(b) - priority(a) || a.id - b.id).map(item => {
    const { id, x, y } = item;
    if (item.visible !== false && x >= 0 && y >= 0 && x <= width && y <= height) {
      for (const [mode, dx, dy] of SLOTS) {
        const half = (mode === 'full' ? Math.max(FULL,item.fullWidth??FULL) : COMPACT) / 2;
        const left = x + dx - half, top = y + dy - HEIGHT / 2;
        const box = { left, top, right: left + 2 * half, bottom: top + HEIGHT };
        if (left < safe.left + GAP || top < safe.top + GAP || box.right > safe.right - GAP || box.bottom > safe.bottom - GAP ||
            claimed.some(rect => intersects(rect, box))) continue;
        claimed.push(box);
        return { id, mode, dx, dy, box };
      }
    }
    return { id, mode: 'hidden' };
  });
}
