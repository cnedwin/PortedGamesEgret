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
