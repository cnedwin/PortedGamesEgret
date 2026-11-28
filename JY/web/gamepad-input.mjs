const directions = {
  arrows: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'],
  battle: ['KeyA', 'KeyD', 'KeyW', 'KeyS'],
};

const defaultButtons = {
  map: { 0: 'Enter', 1: 'Escape', 9: 'Escape' },
  menu: { 0: 'Enter', 1: 'Escape', 9: 'Enter' },
  team: { 0: 'Enter', 1: 'Escape', 2: 'KeyA', 9: 'KeyO' },
  battle: { 0: 'Enter', 1: 'KeyB', 2: 'KeyL', 3: 'KeyI', 4: 'KeyM', 5: 'KeyI', 6: 'KeyQ', 7: 'KeyF', 10: 'KeyT', 11: 'KeyV',
    8: 'Tab', 9: 'Escape', 12: 'KeyW', 13: 'KeyS', 14: 'ArrowLeft', 15: 'ArrowRight' },
};

const keySample = code => ({ code, key: /^Key[A-Z]$/.test(code) ? code.slice(3).toLowerCase() : code === 'Space' ? ' ' : code });
const buttonDown = (pad, index) => pad.pressed(index) || pad.value(index) >= 0.5;

function readKeys(pad, mode, buttons, deadzone) {
  const keys = new Set();
  let x = pad.axis(0), y = pad.axis(1);
  if (mode !== 'battle') {
    const dx = Number(buttonDown(pad, 15)) - Number(buttonDown(pad, 14));
    const dy = Number(buttonDown(pad, 13)) - Number(buttonDown(pad, 12));
    if (dx || dy) [x, y] = [dx, dy];
  }
  const [left, right, up, down] = directions[mode === 'battle' ? 'battle' : 'arrows'];
  const horizontal = Math.abs(x) >= Math.abs(y);
  if (Math.abs(x) >= deadzone && (mode === 'battle' || horizontal)) keys.add(x < 0 ? left : right);
  if (Math.abs(y) >= deadzone && (mode === 'battle' || !horizontal)) keys.add(y < 0 ? up : down);
  for (const [index, code] of buttons) if (buttonDown(pad, index)) keys.add(code);
  return keys;
}

/** Use Egret's browser controller source, keeping JY's mode-specific keyboard actions. */
export function attachGamepadInput(canvas, { keyboard, createInput, getMode = () => 'map', signal, mapping = {}, deadzone = 0.35, manual = false, filter = () => true } = {}) {
  const document = canvas.ownerDocument;
  const window = document?.defaultView;
  if (signal?.aborted || !window || (!manual && typeof window.requestAnimationFrame !== 'function') || !keyboard || typeof createInput !== 'function') return () => {};
  let controller;
  try { controller = createInput(); }
  catch { return () => {}; }
  const threshold = Number.isFinite(deadzone) && deadzone > 0 && deadzone <= 1 ? deadzone : 0.35;
  const buttons = Object.fromEntries(Object.entries(defaultButtons).map(([mode, defaults]) => [mode,
    Object.entries({ ...defaults, ...mapping?.[mode] }).flatMap(([key, code]) => {
      const index = Number(key);
      return Number.isInteger(index) && index >= 0 && index <= 63 && String(index) === key
        && typeof code === 'string' && code.length > 0 && code.length <= 64 ? [[index, code]] : [];
    }),
  ]));
  const held = new Set();
  const isFocused = () => document.activeElement === canvas && document.visibilityState === 'visible' && document.hasFocus();
  let focusId;
  let padIndex;
  let previousMode;
  let waitForNeutral = false;
  let closed = false;
  let frame;

  function restoreFocus() {
    const focus = keyboard.getSnapshot();
    if (focus.focusedId !== undefined) focusId = focus.focusedId;
    else if (focusId !== undefined && focus.state === 'active' && isFocused()) keyboard.focus(focusId);
  }

  function release(reason, refocus = false) {
    waitForNeutral = true;
    if (!held.size) return;
    held.clear();
    keyboard.cancel(reason);
    if (refocus && !closed) restoreFocus();
  }

  function onBlur() { release('blur'); }
  function onHidden() { if (document.visibilityState !== 'visible') release('hidden'); }
  function onPageHide() { release('pagehide'); }
  function onDisconnected(event) {
    if (event.gamepad.index !== padIndex) return;
    padIndex = undefined;
    release('removed', true);
  }

  function poll(now) {
    frame = undefined;
    if (closed) return;
    const mode = getMode();
    if (!Object.hasOwn(buttons, mode) || !isFocused()) release('blur');
    else {
      try { controller.poll(now); }
      catch { detach(); return; }
      const pads = controller.input.pads;
      const pad = pads.find(pad => pad.standard && pad.index === padIndex) ?? pads.find(pad => pad.standard);
      if (padIndex !== undefined && pad?.index !== padIndex) release('removed', true);
      if (previousMode !== undefined && previousMode !== mode) release('rebind', true);
      previousMode = mode;
      padIndex = pad?.index;
      if (pad) {
        restoreFocus();
        const next = new Set([...readKeys(pad, mode, buttons[mode], threshold)].filter(code => filter(code, mode)));
        if (waitForNeutral) waitForNeutral = next.size > 0;
        else {
          for (const code of held) {
            if (closed) return;
            if (!next.has(code)) {
              held.delete(code);
              keyboard.keyUp(keySample(code));
            }
          }
          for (const code of next) {
            if (closed) return;
            if (!held.has(code)) {
              held.add(code);
              keyboard.keyDown(keySample(code));
            }
          }
        }
      }
    }
    if (!closed && !manual) frame = window.requestAnimationFrame(poll);
  }

  function detach() {
    if (closed) return;
    release('removed', !signal?.aborted);
    closed = true;
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    canvas.removeEventListener('blur', onBlur);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('gamepaddisconnected', onDisconnected);
    document.removeEventListener('visibilitychange', onHidden);
    signal?.removeEventListener('abort', detach);
    controller.dispose();
  }

  canvas.addEventListener('blur', onBlur);
  window.addEventListener('blur', onBlur);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('gamepaddisconnected', onDisconnected);
  document.addEventListener('visibilitychange', onHidden);
  signal?.addEventListener('abort', detach, { once: true });
  if (!manual) frame = window.requestAnimationFrame(poll);
  // A host that already owns the game clock samples this bridge once per update.
  // The legacy callable detach return value remains unchanged.
  detach.poll = manual ? poll : undefined;
  return detach;
}
