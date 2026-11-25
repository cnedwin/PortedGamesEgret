/**
 * A floating stick for the battlefield. Play draws the ring and knob; native pointer
 * capture preserves the original button, ownership and cancellation behavior.
 */
export function createSeaStick(game, canMove, isUiPoint = () => false) {
  const surface = game.canvas;
  const host = surface.ownerDocument.defaultView;
  const ring = game.sprite(undefined, game.ui);
  const knob = game.sprite(undefined, ring);
  const coarse = host.matchMedia('(pointer: coarse)');
  const compact = host.matchMedia('(max-height: 530px) and (orientation: landscape)');
  const vector = { x: 0, y: 0 };
  let owner = null;
  let startX = 0, startY = 0, radius = 48, units = 1;

  function point(event) {
    const bounds = surface.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const screen = game.screen;
    const scale = bounds.width / screen.width;
    return {
      x: screen.x + (event.clientX - bounds.left) / scale,
      y: screen.y + (event.clientY - bounds.top) * screen.height / bounds.height,
      scale
    };
  }

  function inField(at) {
    return at && at.x >= 0 && at.x <= game.width && at.y >= 0 && at.y <= game.height;
  }

  function draw(active) {
    const small = compact.matches;
    const outer = (small ? 28.5 : 36) * units;
    ring.graphics.clear()
      .beginFill(0x83ad9c, 0.23).drawCircle(0, 0, outer).endFill()
      .lineStyle(units, 0xd8e9c9, active ? 0.74 : 0.35).drawCircle(0, 0, outer);
    knob.graphics.clear()
      .beginFill(0x83ad9c, 0.5).drawCircle(0, 0, 12.5 * units).endFill()
      .lineStyle(units, 0xe1ecb7, 0.57).drawCircle(0, 0, 12.5 * units);
  }

  function reset() {
    const previous = owner;
    owner = null;
    vector.x = vector.y = 0;
    knob.x = knob.y = 0;
    ring.visible = canMove() && coarse.matches;
    ring.x = (compact.matches ? 38 : 55) * units;
    ring.y = game.height - (compact.matches ? 38 : 65) * units;
    if (previous !== null) {
      if (surface.hasPointerCapture(previous)) surface.releasePointerCapture(previous);
      draw(false);
    }
  }

  function arrange() {
    const bounds = surface.getBoundingClientRect();
    if (bounds.width > 0) units = game.screen.width / bounds.width;
    reset();
    draw(false);
  }

  surface.addEventListener('pointerdown', (event) => {
    if (!canMove() || owner !== null || event.button !== 0) return;
    const at = point(event);
    if (!inField(at) || isUiPoint(at.x, at.y)) return;
    event.preventDefault();
    owner = event.pointerId;
    surface.setPointerCapture(owner);
    startX = event.clientX;
    startY = event.clientY;
    units = 1 / at.scale;
    radius = Math.max(36, Math.min(60, game.width * at.scale * 0.14));
    ring.x = at.x;
    ring.y = at.y;
    ring.visible = true;
    draw(true);
  });

  surface.addEventListener('pointermove', (event) => {
    if (event.pointerId !== owner) return;
    if (!canMove()) return reset();
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const distance = Math.hypot(dx, dy);
    const amount = Math.max(0, Math.min(1, (distance - 5) / (radius - 5)));
    vector.x = distance ? dx * amount / distance : 0;
    vector.y = distance ? dy * amount / distance : 0;
    knob.x = vector.x * 25 * units;
    knob.y = vector.y * 25 * units;
  });

  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    surface.addEventListener(type, (event) => {
      if (event.pointerId === owner) reset();
    });
  }
  surface.addEventListener('contextmenu', (event) => {
    if (canMove() && inField(point(event))) event.preventDefault();
  });
  host.addEventListener('blur', reset);
  arrange();
  return { vector, get active() { return owner !== null; }, reset, arrange };
}
