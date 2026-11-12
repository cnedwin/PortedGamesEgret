const actionLabels = { attack: '出招中', guard: '格擋中', dodge: '閃身中', stagger: '失衡', dead: '倒下' };

function fighterStatus(actor, state) {
  const event = state.lastEvent;
  if (actor.dead) return [state.canTakeControl ? '可接管隊友' : '倒下', 'warning'];
  if (event?.type === 'parry' && event.key === actor.key && state.frame - event.frame < 24) return ['彈反成功', 'ready'];
  if (actor.breathless > 0) return ['失衡', 'warning'];
  if (actor.frozen > 0) return ['受制', 'warning'];
  if (actionLabels[actor.action]) return [actionLabels[actor.action], 'active'];
  if (actor.cooldown > 0) return ['收招中', 'active'];
  if (actor.posture >= actor.maxPosture * .8) return ['架勢不穩', 'warning'];
  return ['可出招', 'ready'];
}

export function attachBattleControls(panel, canvas, { signal, getState, press, release }) {
  const buttons = new Map([...panel.querySelectorAll('[data-battle-controls-phase="active"] button')]
    .map(button => [button.dataset.battleCommand, button]));
  const phases = [...panel.querySelectorAll('[data-battle-controls-phase]')];
  const skillName = panel.querySelector('[data-battle-skill]');
  const confirmButton = panel.querySelector('[data-battle-controls-phase="confirm"] [data-battle-command="Enter"]');
  const fields = Object.fromEntries(['fighter', 'action', 'hp', 'mp', 'nearby', 'enemy', 'enemy-action', 'enemy-hp']
    .map(key => [key, panel.querySelector(`[data-battle-${key}]`)]));
  const meters = new Map([...panel.querySelectorAll('[data-battle-meter]')].map(meter => [meter.dataset.battleMeter, meter]));
  const held = new Map();
  const window = canvas.ownerDocument.defaultView;
  let phase;

  function endHold(pointerId, cancelled) {
    const button = held.get(pointerId);
    if (!button) return;
    held.delete(pointerId);
    if ([...held.values()].includes(button)) return;
    delete button.dataset.held;
    release(button.dataset.battleCommand, cancelled);
  }

  function cancel() {
    for (const pointerId of held.keys()) endHold(pointerId, true);
  }

  function setText(element, value) {
    if (element.textContent !== value) element.textContent = value;
  }

  function showMeter(key, value, max) {
    const meter = meters.get(key);
    max = Math.max(1, max ?? 0);
    value = Math.min(max, Math.max(0, value ?? 0));
    if (meter.max !== max) meter.max = max;
    if (meter.value !== value) meter.value = value;
  }

  function showReadout(actor, state) {
    const [label, tone] = fighterStatus(actor, state);
    setText(fields.fighter, actor.name);
    setText(fields.action, label);
    if (fields.action.dataset.tone !== tone) fields.action.dataset.tone = tone;
    setText(fields.hp, `生命 ${actor.hp}/${actor.maxHp}`);
    setText(fields.mp, `內力 ${actor.mp}/${actor.maxMp}`);
    showMeter('hp', actor.hp, actor.maxHp);
    showMeter('mp', actor.mp, actor.maxMp);
    const enemy = state.target;
    if (fields.nearby.hidden !== !enemy) fields.nearby.hidden = !enemy;
    if (enemy) {
      setText(fields.enemy, `近敵 ${enemy.name}`);
      setText(fields['enemy-action'], actionLabels[enemy.action] ?? '');
      const enemyTone = enemy.action === 'attack' ? 'warning' : 'active';
      if (fields['enemy-action'].dataset.tone !== enemyTone) fields['enemy-action'].dataset.tone = enemyTone;
      setText(fields['enemy-hp'], `生命 ${enemy.hp}/${enemy.maxHp}`);
      showMeter('enemy', enemy.hp, enemy.maxHp);
    }
  }

  function update() {
    const state = getState();
    const prompt = canvas.dataset.battlePrompt;
    const next = !state || state.result !== null ? undefined
      : prompt === 'surrender' || prompt === 'restart' ? 'confirm'
        : prompt || state.pendingResult !== null ? undefined : 'active';
    if (next !== phase) {
      phase = next;
      cancel();
      panel.hidden = !phase;
      for (const group of phases) group.hidden = group.dataset.battleControlsPhase !== phase;
    }
    if (phase === 'confirm') setText(confirmButton, prompt === 'restart' ? '重開戰鬥' : '確認認輸');
    if (phase !== 'active') return;
    const auto = String(state.auto);
    const automatic = buttons.get('Tab');
    if (automatic.getAttribute('aria-pressed') !== auto) automatic.setAttribute('aria-pressed', auto);
    buttons.get('KeyC').hidden = !state.canTakeControl;
    const actor = state.controlled ?? state.player;
    showReadout(actor, state);
    const canSwitch = actor.learnedMagics.length > 1;
    buttons.get('KeyQ').disabled = buttons.get('KeyF').disabled = !canSwitch;
    const name = state.activeMagicName;
    if (skillName.textContent !== name) skillName.textContent = name;
  }

  panel.addEventListener('pointerdown', event => {
    const button = event.target.closest('button[data-battle-hold]');
    if (!button || button.disabled || phase !== 'active' || event.button !== 0) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    button.setPointerCapture(event.pointerId);
    held.set(event.pointerId, button);
    button.dataset.held = '';
    press(button.dataset.battleCommand);
  }, { signal });

  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    panel.addEventListener(type, event => endHold(event.pointerId, type !== 'pointerup'), { signal });
  }

  panel.addEventListener('click', event => {
    const button = event.target.closest('button[data-battle-command]');
    if (!button || button.disabled || !phase || button.closest('[hidden]')) return;
    if (Object.hasOwn(button.dataset, 'battleHold') && event.detail !== 0) return;
    canvas.focus({ preventScroll: true });
    const code = button.dataset.battleCommand;
    press(code);
    release(code);
  }, { signal });

  window.addEventListener('blur', cancel, { signal });
  window.document.addEventListener('visibilitychange', () => {
    if (window.document.hidden) cancel();
  }, { signal });
  const attributes = ['data-trainer', 'data-battle-tick', 'data-battle-prompt'];
  const observer = new MutationObserver(update);
  observer.observe(canvas, { attributes: true, attributeFilter: attributes });
  signal.addEventListener('abort', () => {
    observer.disconnect();
    cancel();
    panel.hidden = true;
    for (const group of phases) group.hidden = true;
  }, { once: true });

  return { cancel };
}
