/**
 * Native Play owns touch origin, capture and cancellation. Keep desktop pointer
 * dragging for mouse and pen users, with the same CSS-pixel movement response.
 */
export function createSeaStick(game, canMove, isUiPoint = () => false) {
  const surface = game.canvas;
  const host = surface.ownerDocument.defaultView;
  const ring = game.sprite(undefined, game.ui);
  const knob = game.sprite(undefined, ring);
  const compact = host.matchMedia('(max-height: 530px) and (orientation: landscape)');
  const pointerVector = { x: 0, y: 0 };
  const neutral = Object.freeze({ x: 0, y: 0 });
  const deadZone = 5;
  let pointerOwner = null;
  let startX = 0, startY = 0, radius = 48, units = 1;
  let native, nativeRadius;
  ring.visible = false;

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

  function reach(scale) {
    return Math.max(36, Math.min(60, game.width * scale * 0.14));
  }

  function drawPointer() {
    const outer = (compact.matches ? 28.5 : 36) * units;
    ring.graphics.clear()
      .beginFill(0x83ad9c, 0.23).drawCircle(0, 0, outer).endFill()
      .lineStyle(units, 0xd8e9c9, 0.74).drawCircle(0, 0, outer);
    knob.graphics.clear()
      .beginFill(0x83ad9c, 0.5).drawCircle(0, 0, 12.5 * units).endFill()
      .lineStyle(units, 0xe1ecb7, 0.57).drawCircle(0, 0, 12.5 * units);
  }

  function reset() {
    const previous = pointerOwner;
    pointerOwner = null;
    pointerVector.x = pointerVector.y = 0;
    knob.x = knob.y = 0;
    ring.visible = false;
    if (previous !== null && surface.hasPointerCapture(previous)) surface.releasePointerCapture(previous);
  }

  function retire() {
    reset();
    if (native) game.remove(native);
    native = nativeRadius = undefined;
  }

  function arrange() {
    reset();
    if (!canMove()) return;
    const bounds = surface.getBoundingClientRect();
    if (!bounds.width || !game.screen.width) return;
    const scale = bounds.width / game.screen.width;
    // Native Play subtracts its dead zone before applying the stick radius.
    // Convert the original full CSS reach, less that zone, into design units.
    const nextRadius = (reach(scale) - deadZone) / scale;
    if (native && Math.abs(nextRadius - nativeRadius) < 0.01) return;
    if (native) game.remove(native);
    nativeRadius = nextRadius;
    native = game.touchStick({
      radius: nativeRadius,
      floating: {
        area: () => ({ x: 0, y: 0, width: game.width, height: game.height }),
        deadZonePx: deadZone,
        exclude: (x, y) => !canMove() || pointerOwner !== null || isUiPoint(x, y)
      }
    });
  }

  surface.addEventListener('pointerdown', (event) => {
    // Touches belong exclusively to the engine's floating stick.
    if (event.pointerType === 'touch' || !canMove() || native?.visible || pointerOwner !== null || event.button !== 0) return;
    const at = point(event);
    if (!inField(at) || isUiPoint(at.x, at.y)) return;
    event.preventDefault();
    pointerOwner = event.pointerId;
    surface.setPointerCapture(pointerOwner);
    startX = event.clientX;
    startY = event.clientY;
    units = 1 / at.scale;
    radius = reach(at.scale);
    ring.x = at.x;
    ring.y = at.y;
    ring.visible = true;
    drawPointer();
  });

  surface.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerOwner) return;
    if (!canMove()) return reset();
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const distance = Math.hypot(dx, dy);
    const amount = Math.max(0, Math.min(1, (distance - deadZone) / (radius - deadZone)));
    pointerVector.x = distance ? dx * amount / distance : 0;
    pointerVector.y = distance ? dy * amount / distance : 0;
    knob.x = pointerVector.x * 25 * units;
    knob.y = pointerVector.y * 25 * units;
  });

  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    surface.addEventListener(type, (event) => {
      if (event.pointerId === pointerOwner) reset();
    });
  }
  surface.addEventListener('contextmenu', (event) => {
    if (canMove() && inField(point(event))) event.preventDefault();
  });
  host.addEventListener('blur', reset);

  return {
    get vector() { return pointerOwner !== null ? pointerVector : native?.visible ? game.keys.axis() : neutral; },
    get active() { return pointerOwner !== null || Boolean(native?.visible); },
    reset, retire, arrange
  };
}

