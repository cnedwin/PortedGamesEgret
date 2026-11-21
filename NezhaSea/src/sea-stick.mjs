/** One captured contact steers. Dialogs and ordinary page scrolling stay outside this controller. */
export function createSeaStick(field, indicator, canMove) {
  const cap = indicator.querySelector('span');
  const vector = { x: 0, y: 0 };
  let owner = null;
  let startX = 0, startY = 0, radius = 48;

  function reset() {
    const previous = owner;
    owner = null;
    vector.x = vector.y = 0;
    indicator.classList.remove('dragging');
    cap.style.transform = '';
    if (previous !== null && field.hasPointerCapture(previous)) field.releasePointerCapture(previous);
  }

  field.addEventListener('pointerdown', (event) => {
    if (!canMove() || owner !== null || event.button !== 0 || event.target.closest('button')) return;
    event.preventDefault();
    const bounds = field.getBoundingClientRect();
    owner = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    radius = Math.max(36, Math.min(60, bounds.width * 0.14));
    field.setPointerCapture(owner);
    indicator.style.setProperty('--origin-x', `${startX - bounds.left}px`);
    indicator.style.setProperty('--origin-y', `${startY - bounds.top}px`);
    indicator.classList.add('dragging');
  });
  field.addEventListener('pointermove', (event) => {
    if (event.pointerId !== owner) return;
    if (!canMove()) return reset();
    const x = event.clientX - startX, y = event.clientY - startY;
    const distance = Math.hypot(x, y);
    const amount = Math.max(0, Math.min(1, (distance - 5) / (radius - 5)));
    vector.x = distance ? x * amount / distance : 0;
    vector.y = distance ? y * amount / distance : 0;
    cap.style.transform = `translate(${vector.x * 25}px, ${vector.y * 25}px)`;
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    field.addEventListener(event, (value) => { if (value.pointerId === owner) reset(); });
  }
  field.addEventListener('contextmenu', (event) => { if (canMove()) event.preventDefault(); });
  window.addEventListener('blur', reset);
  window.addEventListener('resize', reset);
  return { vector, get active() { return owner !== null; }, reset };
}
