const directions = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
const selectionLabels = {
  move: '選擇移動格',
  magic: '選擇武學落點',
  poison: '選擇用毒對象',
  detox: '選擇解毒對象',
  medicine: '選擇醫療對象',
  dart: '選擇暗器目標',
  status: '選擇查看對象',
};
const actionLabels = { attack: '出招中', move: '移動中', dead: '倒下' };

function turnLabel(state, selection) {
  if (!state.turn) return '準備中';
  const round = `第 ${state.round} 輪`;
  if (state.turn.side !== 0) return `${round} · 敵方行動`;
  if (state.auto) return `${round} · 自動戰鬥`;
  if (!state.canAct) return `${round} · 行動演出`;
  const action = selectionLabels[selection] ?? (state.turn.moved ? '選擇指令' : `可移動 ${state.moveRange} 格`);
  return `${round} · ${action}`;
}

export function attachBattleControls(panel, canvas, { signal, getState, getModel, press }) {
  const buttons = new Map([...panel.querySelectorAll('[data-battle-controls-phase="active"] button')]
    .map(button => [button.dataset.battleCommand, button]));
  const phases = [...panel.querySelectorAll('[data-battle-controls-phase]')];
  const skillName = panel.querySelector('[data-battle-skill]');
  const confirmButton = panel.querySelector('[data-battle-controls-phase="confirm"] [data-battle-command="Enter"]');
  const fields = Object.fromEntries(['fighter', 'action', 'hp', 'mp', 'nearby', 'enemy', 'enemy-action', 'enemy-hp']
    .map(key => [key, panel.querySelector(`[data-battle-${key}]`)]));
  const meters = new Map([...panel.querySelectorAll('[data-battle-meter]')].map(meter => [meter.dataset.battleMeter, meter]));
  let phase;

  function setText(element, value) {
    if (element.textContent !== value) element.textContent = value;
  }

  function setDisabled(code, disabled) {
    const button = buttons.get(code);
    if (button.disabled !== disabled) button.disabled = disabled;
  }

  function setPressed(code, pressed) {
    const button = buttons.get(code);
    const value = String(pressed);
    if (button.getAttribute('aria-pressed') !== value) button.setAttribute('aria-pressed', value);
  }

  function showMeter(key, value, max) {
    const meter = meters.get(key);
    max = Math.max(1, max ?? 0);
    value = Math.min(max, Math.max(0, value ?? 0));
    if (meter.max !== max) meter.max = max;
    if (meter.value !== value) meter.value = value;
  }

  function showReadout(actor, state, selection) {
    setText(fields.fighter, actor.name);
    setText(fields.action, turnLabel(state, selection));
    const tone = actor.side !== 0 ? 'warning' : state.canAct ? 'ready' : 'active';
    if (fields.action.dataset.tone !== tone) fields.action.dataset.tone = tone;
    setText(fields.hp, `生命 ${actor.hp}/${actor.maxHp}`);
    setText(fields.mp, `內力 ${actor.mp}/${actor.maxMp}`);
    showMeter('hp', actor.hp, actor.maxHp);
    showMeter('mp', actor.mp, actor.maxMp);
    const target = state.target !== actor && state.target;
    if (fields.nearby.hidden !== !target) fields.nearby.hidden = !target;
    if (target) {
      setText(fields.enemy, `目標 ${target.name}`);
      setText(fields['enemy-action'], actionLabels[target.action] ?? '');
      const targetTone = target.side !== 0 ? 'warning' : 'active';
      if (fields['enemy-action'].dataset.tone !== targetTone) fields['enemy-action'].dataset.tone = targetTone;
      setText(fields['enemy-hp'], `生命 ${target.hp}/${target.maxHp}`);
      showMeter('enemy', target.hp, target.maxHp);
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
      panel.hidden = !phase;
      for (const group of phases) group.hidden = group.dataset.battleControlsPhase !== phase;
    }
    if (phase === 'confirm') setText(confirmButton, prompt === 'restart' ? '重開戰鬥' : '確認認輸');
    if (phase !== 'active') return;

    const mode = canvas.dataset.battleCommandMode;
    const selection = state.selection?.type ?? (mode === 'attack' ? 'magic' : mode);
    const canAct = Boolean(state.canAct && !state.auto);
    const actions = canAct ? getModel()?.listActions() ?? [] : [];
    const actor = state.turn ?? state.controlled ?? state.player;
    showReadout(actor, state, selection);
    setPressed('Tab', state.auto);
    setPressed('KeyM', selection === 'move');
    setPressed('KeyI', selection === 'magic');
    for (const code of directions) setDisabled(code, !canAct || (!selection && !actions.includes('move')));
    setDisabled('Enter', !canAct || !selection);
    setDisabled('KeyM', !actions.includes('move'));
    setDisabled('KeyI', !actions.includes('magic'));
    setDisabled('KeyB', !actions.includes('drug') && !actions.includes('dart'));
    setDisabled('KeyT', !actions.some(action => ['medicine', 'detox', 'poison'].includes(action)));
    setDisabled('KeyV', !actions.includes('status'));
    setDisabled('KeyL', !actions.includes('rest'));
    const canSwitch = canAct && actor.learnedMagics.length > 1;
    setDisabled('KeyQ', !canSwitch);
    setDisabled('KeyF', !canSwitch);
    setText(skillName, state.activeMagicName ?? '');
    setText(buttons.get('Escape'), selection ? '取消選擇' : '認輸');
  }

  panel.addEventListener('click', event => {
    const button = event.target.closest('button[data-battle-command]');
    if (!button || button.disabled || !phase || button.closest('[hidden]')) return;
    canvas.focus({ preventScroll: true });
    press(button.dataset.battleCommand);
  }, { signal });

  const attributes = ['data-trainer', 'data-battle-tick', 'data-battle-prompt', 'data-battle-command-mode'];
  const observer = new MutationObserver(update);
  observer.observe(canvas, { attributes: true, attributeFilter: attributes });
  signal.addEventListener('abort', () => {
    observer.disconnect();
    panel.hidden = true;
    for (const group of phases) group.hidden = true;
  }, { once: true });
  update();
}
