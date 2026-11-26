/** Thumb-sized controls below the landscape board on a portrait touch device. */
export function bindPortraitControls({ screen, settingsOpen }) {
  const panel = document.querySelector('#portrait-controls');
  const portrait = matchMedia('(orientation: portrait) and (pointer: coarse)');
  const power = panel.querySelector('#touch-power');
  const powerValue = panel.querySelector('#touch-power-value');
  const title = panel.querySelector('#touch-level');
  const ammo = panel.querySelector('#touch-ammo');
  const clue = panel.querySelector('#touch-clue');
  const buttons = [...panel.querySelectorAll('button[data-touch-action]')];
  const fire = buttons[0];
  const hintButton = panel.querySelector('[data-touch-action="hint"]');
  const closeHint = panel.querySelector('[data-touch-action="closeHint"]');

  panel.addEventListener('click', (event) => {
    const action = event.target.closest('button')?.dataset.touchAction;
    const current = screen();
    if (!action || !current?.touchActions || settingsOpen()) return;
    if (current.talking()) {
      if (action === 'fire') current.touchActions.dialogue();
    } else if (action === 'fire') {
      current.level.fire();
    } else current.touchActions[action]();
  });

  power.addEventListener('input', () => {
    const current = screen();
    if (!current?.touchActions || current.talking() || settingsOpen() || !current.level.sim.ready()) return;
    current.level.setAim(current.level.aiming.angle, Number(power.value));
  });

  let previous = '';
  return {
    sync() {
      const current = screen();
      if (!portrait.matches || !current?.touchActions) return;
      const { sim, aiming } = current.level;
      const inDialogue = current.talking();
      const blocked = settingsOpen();
      const ready = sim.ready();
      const value = Math.round(aiming.power);
      const remaining = sim.level.shots.length - sim.state.shotsFired;
      const hint = current.hint;
      const key = [current.levelTitle, inDialogue, blocked, ready, value, remaining, hint?.text, hint?.button].join('|');
      if (key === previous) return;
      previous = key;
      title.textContent = current.levelTitle;
      ammo.textContent = `剩余弹丸 ${remaining}`;
      clue.textContent = hint?.text ?? `巧解目标 · ${current.challenge}`;
      power.value = value;
      powerValue.value = value;
      power.disabled = blocked || inDialogue || !ready;
      fire.textContent = inDialogue ? '继续对白' : ready ? '发射' : '机关运转中';
      fire.disabled = blocked || (!inDialogue && !ready);
      for (const button of buttons.slice(1)) button.disabled = blocked || inDialogue;
      hintButton.textContent = hint?.button ?? '提示';
      hintButton.disabled = blocked || inDialogue || !ready;
      closeHint.hidden = hint?.button !== '对准';
      closeHint.disabled = closeHint.hidden || blocked || inDialogue;
    }
  };
}
