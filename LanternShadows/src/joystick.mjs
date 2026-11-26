// A horizontal track matches the stage. Vertical movement belongs to the jump button.
export function stickAmount(offset, travel) {
  const position = Math.max(-1, Math.min(1, offset / travel));
  const deadZone = 0.16;
  return Math.sign(position) * Math.max(0, (Math.abs(position) - deadZone) / (1 - deadZone)) || 0;
}

export function bindJoystick(element, target) {
  let grip, move = 0;

  function track(event) {
    if (!grip || event.pointerId !== grip.id) return;
    const offset = event.clientX - grip.center;
    move = stickAmount(offset, grip.travel);
    const pixels = Math.max(-grip.travel, Math.min(grip.travel, offset));
    element.style.setProperty('--stick-shift', pixels + 'px');
  }

  function clear() {
    if (!grip) return;
    const { id } = grip;
    grip = undefined;
    move = 0;
    element.classList.remove('is-held');
    element.style.removeProperty('--stick-shift');
    if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
  }

  function release(event) {
    if (event.pointerId === grip?.id) clear();
  }

  element.addEventListener('pointerdown', event => {
    if (grip || event.button !== 0) return;
    const bounds = element.getBoundingClientRect();
    if (!bounds.width) return;
    event.preventDefault();
    grip = { id: event.pointerId, center: bounds.left + bounds.width / 2, travel: bounds.width * 0.27 };
    element.classList.add('is-held');
    try { element.setPointerCapture(event.pointerId); } catch { /* The window still tracks the contact. */ }
    track(event);
  });
  target.addEventListener('pointermove', track);
  for (const type of ['pointerup', 'pointercancel']) target.addEventListener(type, release);
  element.addEventListener('lostpointercapture', release);
  element.addEventListener('contextmenu', event => event.preventDefault());

  return { get move() { return move; }, clear };
}
