import { num } from '../i18n.mjs';
import { hudElement as h, hudButton } from './battle-hud.mjs';
import { pair } from './text.mjs';

const reasons = {
  unavailable: ['此目标暂无可用路线。', 'There is no available route to this target.'],
  unreachable: ['此目标暂无可用路线。', 'There is no available route to this target.'],
  occupiedDestination: ['落点已有部队，请更换位置。', 'The destination is occupied. Choose another hex.'],
  destinationConflict: ['两条军令落点相同，请调整其中一条。', 'Two orders share a destination. Change one of them.'],
  invalidDestination: ['所选地格无法作为落点。', 'That hex is unavailable as a destination.'],
  invalidTarget: ['所选敌军已无法作为目标。', 'The chosen enemy is unavailable as a target.'],
  unitUnavailable: ['部队已无法受令，请移除该军令。', 'This unit can no longer take orders. Remove its order.'],
  notOwned: ['这支部队不归我方指挥。', 'This unit is outside your command.'],
  duplicateUnit: ['每支部队只能保留一条军令。', 'Keep one order per unit.'],
  tooManyOrders: ['军令已满，请先移除一条。', 'The plan is full. Remove an order first.'],
  commandRejected: ['战况已变，请重新检查军令。', 'The battle has changed. Check the orders again.'],
};

export function battleCommandPlanReason(reason) {
  return reasons[reason] ? pair(reasons[reason]) : (reason || '');
}

function planText(plan, unitName) {
  const action = plan.kind === 'attack'
    ? (Number.isInteger(plan.target)
      ? pair(['进攻 ', 'Attack ']) + unitName(plan.target)
      : pair(['进攻目标', 'Attack target']))
    : pair(['移动至标记地格', 'Move to the marked hex']);
  if (!plan.valid) return action + ' · ' + battleCommandPlanReason(plan.reason ?? 'unavailable');
  const steps = plan.path.length;
  if (plan.gate) return action + pair([' · 先破门', ' · Breach the gate first']);
  if (steps > 0) return action + ' · ' + num(steps) + pair([' 格', ' hexes']);
  return plan.kind === 'attack'
    ? action + pair([' · 已在射程内', ' · In range'])
    : pair(['已在所选地格', 'Already on the selected hex']);
}

function commandButton(key, label, action, options = {}) {
  const { accessible, ...appearance } = options;
  const button = hudButton(label, action, appearance);
  button.dataset.k = key;
  if (accessible) button.setAttribute('aria-label', accessible);
  return button;
}

export function renderBattleCommandPanel({
  preview = null, plans = [], summary = '', reason = '', advanceHint = '', unitName, onQueue, onCancel, onRemove, onAdvance, onContinue,
}) {
  const label = pair(['拟定军令', 'Plan orders']);
  if (!preview && !plans.length) {
    return h('section.bCommandPlan', { 'aria-label': label },
      h('p.bPlanHint', summary || pair(['选中部队，再点地格或敌军拟令。', 'Select a unit, then choose a hex or enemy to plan an order.'])));
  }
  const replacing = preview && plans.some(plan => plan.unit === preview.unit);
  const damage = preview?.combat;
  const damageText = preview?.valid && damage?.inReach !== false && Number.isFinite(damage?.minLoss) && Number.isFinite(damage?.maxLoss)
    ? pair(['到位后普通命中约 ', 'Estimated ordinary hit from the destination: ']) +
      num(damage.minLoss) + '–' + num(damage.maxLoss) + pair([' 人', ' troops'])
    : '';
  const cannotDispatch = battleCommandPlanReason(reason) || (plans.some(plan => !plan.valid)
    ? pair(['先修改或移除无法执行的军令。', 'Change or remove orders that are no longer available.']) : '');
  const why = preview ? pair(['先处理当前预览。', 'Finish the current preview first.']) : cannotDispatch;
  return h('section.bCommandPlan', { 'aria-label': label },
    preview ? h('div.bPlanPreview',
      h('p.bPlanText', { role:'status' }, h('strong', unitName(preview.unit)), ' · ', planText(preview, unitName),
        damageText ? h('small.bPlanEstimate', damageText) : null),
      h('div.bPlanButtons',
        commandButton('stage-order', replacing ? pair(['替换军令', 'Replace order']) : pair(['加入军令', 'Queue order']), onQueue,
          { kind:'main', why:preview.valid ? null : battleCommandPlanReason(preview.reason ?? 'unavailable') }),
        commandButton('cancel-order', pair(['取消预览', 'Cancel preview']), onCancel))) : null,
    plans.length ? h('div.bPlanQueue',
      h('p.bPlanCount', { role:'status' }, pair(['待下达 ', 'Queued: ']) + num(plans.length) + pair([' 条军令', ' orders'])),
      cannotDispatch ? h('p.bPlanReason', { role:'status' }, cannotDispatch) : null,
      h('div.bPlanButtons',
        commandButton('advance-orders', pair(['确认并推进3秒', 'Confirm + run 3s']), onAdvance, { kind:'main', why }),
        onContinue ? commandButton('dispatch-orders', pair(['确认并继续', 'Confirm + continue']), onContinue, { why }) : null),
      h('p.bPlanHint.bPlanAdvanceHint', advanceHint || pair(['最多推进3秒，遇关键时刻可提前暂停。', 'Runs up to 3 seconds and may pause sooner at a milestone.'])),
      h('ul.bPlanList', plans.map(plan => {
        const unit = unitName(plan.unit);
        return h('li.bPlanItem', { dataset:{ k:'plan-' + plan.unit } },
          h('div.bPlanItemText', h('strong', unit), h('small', planText(plan, unitName))),
          commandButton('remove-order-' + plan.unit, pair(['移除', 'Remove']), () => onRemove(plan.unit),
            { accessible:pair(['移除 ', 'Remove order for ']) + unit }));
      })),
      summary ? h('p.bPlanHint', summary) : null) : null);
}
