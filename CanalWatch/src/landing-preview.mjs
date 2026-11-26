import { FIELD, RAIDERS } from './sim/data.mjs';
import { landingPoint } from './sim/world.mjs';

/** A crew carrier can be selected directly on the field or through the HUD control. */
export function createLandingPreview({ canvas, view, world, onSelect }) {
  let selected = null;
  let press = null;

  function change(boat) {
    const next = boat?.id ?? null;
    if (selected !== next) {
      selected = next;
      onSelect?.(boat ?? null);
    }
    view.showLanding(boat, boat && landingPoint(boat));
    return boat ?? null;
  }

  function isCarrier(raider) {
    return raider.hp > 0 && raider.way === 'water' && RAIDERS[raider.kind].crew > 0;
  }

  function carriers() {
    const current = world();
    return current?.mode === 'intercept' ? current.raiders.filter(isCarrier) : [];
  }

  function selectAt(x, y) {
    let target;
    let closest = Infinity;
    for (const boat of carriers()) {
      const distance = Math.hypot(boat.x - x, boat.y - y);
      if (distance > RAIDERS[boat.kind].radius + 12 || distance >= closest) continue;
      target = boat;
      closest = distance;
    }
    return change(target?.id === selected ? null : target);
  }

  // The legacy stand-alone field adapter remains useful to headless rules tests. The
  // native view now supplies already transformed stage coordinates through selectAt.
  canvas?.addEventListener('pointerdown', (event) => {
    if (world()?.mode === 'intercept' && event.isPrimary && event.button === 0) {
      press = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
  });
  canvas?.addEventListener('pointercancel', (event) => {
    if (press?.id === event.pointerId) press = null;
  });
  canvas?.addEventListener('pointerup', (event) => {
    if (press?.id !== event.pointerId) return;
    const start = press;
    press = null;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = (event.clientX - box.left) * FIELD.width / box.width;
    const y = (event.clientY - box.top) * FIELD.height / box.height;
    selectAt(x, y);
  });

  return {
    selectAt,
    cycle() {
      const boats = carriers();
      const index = boats.findIndex((boat) => boat.id === selected);
      return change(boats[index + 1]);
    },
    update() {
      if (selected === null) return null;
      const current = world();
      return change(current?.mode === 'intercept'
        ? current.raiders.find((boat) => boat.id === selected && isCarrier(boat))
        : null);
    },
    clear() {
      press = null;
      change(null);
    }
  };
}
