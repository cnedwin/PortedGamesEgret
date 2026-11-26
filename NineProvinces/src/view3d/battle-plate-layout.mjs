// The engine still projects and moves each screen marker. On a short landscape
// screen, give those projected positions enough room to display or yield.
const SHORT_LANDSCAPE = '(orientation: landscape) and (min-width: 560px) and (max-width: 1100px) and (max-height: 500px)';
const GAP = 4;
const HEIGHT = 44;
const FULL = 104;
const COMPACT = 44;
const SLOTS = [
  ['full', 0, 0], ['compact', 0, 0], ['compact', 0, -50],
  ['compact', 0, 50], ['compact', -54, 0], ['compact', 54, 0],
];
const blocks = '#battleHud > .bTop, #battleHud > .bSide, #battleHud > .bCommand, #battleHud > .bDeploy, #battleHud > .bFeed';

function intersects(a, b) {
  return a.left < b.right + GAP && a.right + GAP > b.left &&
    a.top < b.bottom + GAP && a.bottom + GAP > b.top;
}

const priority = item => item.selected ? 3 : item.targetable ? 2 : item.focused ? 1 : 0;

export function layoutBattlePlates(items, { width, height, obstacles = [] }) {
  const claimed = obstacles.slice();
  return items.slice().sort((a, b) => priority(b) - priority(a) || a.id - b.id).map(item => {
    const { id, x, y } = item;
    if (item.visible !== false && x >= 0 && y >= 0 && x <= width && y <= height) {
      for (const [mode, dx, dy] of SLOTS) {
        const half = (mode === 'full' ? FULL : COMPACT) / 2;
        const left = x + dx - half, top = y + dy - HEIGHT / 2;
        const box = { left, top, right: left + 2 * half, bottom: top + HEIGHT };
        if (left < GAP || top < GAP || box.right > width - GAP || box.bottom > height - GAP ||
            claimed.some(rect => intersects(rect, box))) continue;
        claimed.push(box);
        return { id, mode, dx, dy, box };
      }
    }
    return { id, mode: 'hidden' };
  });
}

export function createBattlePlateLayout(layer, plates) {
  const media = matchMedia(SHORT_LANDSCAPE);
  const scope = layer.closest('#frame') ?? document;
  const hud = scope.querySelector('#battleHud');
  let dirty = true, pending = false, disposed = false, bounds;
  const observed = new Set();
  const resize = new ResizeObserver(() => { dirty = true; });
  resize.observe(layer);
  const mutation = new MutationObserver(changes => {
    if (changes.some(change => change.type === 'childList' || change.oldValue !== hud.dataset.phase)) dirty = true;
  });
  if (hud) mutation.observe(hud, { childList: true, attributes: true, attributeOldValue: true, attributeFilter: ['data-phase'] });

  function measure() {
    const panels = new Set(scope.querySelectorAll(blocks));
    for (const panel of observed) if (!panels.has(panel)) {
      resize.unobserve(panel);
      observed.delete(panel);
    }
    for (const panel of panels) if (!observed.has(panel)) {
      resize.observe(panel);
      observed.add(panel);
    }
    const root = layer.getBoundingClientRect();
    const obstacles = [];
    for (const panel of panels) {
      const rect = panel.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) obstacles.push({
        left: rect.left - root.left, right: rect.right - root.left,
        top: rect.top - root.top, bottom: rect.bottom - root.top
      });
    }
    bounds = { width: root.width, height: root.height, obstacles };
    dirty = false;
  }

  function reset() {
    for (const { el } of plates) if (el.dataset.battlePlate) {
      delete el.dataset.battlePlate;
      el.style.removeProperty('--plate-shift-x');
      el.style.removeProperty('--plate-shift-y');
    }
  }

  function onViewportChange() {
    dirty = true;
    if (!media.matches) reset();
  }
  media.addEventListener('change', onViewportChange);

  return {
    update(units) {
      if (!media.matches || disposed || pending) return;
      pending = true;
      // The realm updates marker.point after its battle frame listeners return.
      queueMicrotask(() => {
        pending = false;
        if (disposed || !media.matches) return;
        if (dirty) measure();
        if (!bounds.width || !bounds.height) return;
        const focused = document.activeElement;
        const items = plates.map(({ marker, el }, id) => ({
          id, x: marker.point.x, y: marker.point.y,
          visible: marker.point.onScreen && !el.hidden && !units[id]?.gone && units[id]?.pos >= 0,
          selected: el.classList.contains('chosen'),
          targetable: el.classList.contains('targetable'),
          focused: el === focused,
        }));
        for (const { id, mode, dx = 0, dy = 0 } of layoutBattlePlates(items, bounds)) {
          const { el } = plates[id];
          if (el.dataset.battlePlate !== mode) {
            if (mode === 'hidden' && el === focused) hud?.querySelector(`[data-k="u${id}"]`)?.focus({ preventScroll: true });
            el.dataset.battlePlate = mode;
          }
          const x = dx + 'px', y = dy + 'px';
          if (el.style.getPropertyValue('--plate-shift-x') !== x) el.style.setProperty('--plate-shift-x', x);
          if (el.style.getPropertyValue('--plate-shift-y') !== y) el.style.setProperty('--plate-shift-y', y);
        }
      });
    },
    destroy() {
      disposed = true;
      resize.disconnect();
      mutation.disconnect();
      media.removeEventListener('change', onViewportChange);
      reset();
    }
  };
}
