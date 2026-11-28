// Render-only adaptation of the existing plan review. The controller supplies
// a finished preview and the same callback functions; this code never edits it.
import { num } from '../i18n.mjs';
import { pair } from './text.mjs';
import { battleCommandPlanReason } from './battle-command-panel.mjs';
import { makeBattleControl as button, makeBattleText as text, makeBattleRow as row, makeBattleGroup as group } from './native-battle-hud.mjs';

function planText(plan,unitName){
  const action=plan.kind==='attack'?(Number.isInteger(plan.target)?pair(['进攻 ','Attack '])+unitName(plan.target):pair(['进攻目标','Attack target'])):pair(['移动至标记地格','Move to the marked hex']);
  if(!plan.valid)return action+' · '+battleCommandPlanReason(plan.reason??'unavailable');
  const steps=plan.path.length;
  if(plan.gate)return action+pair([' · 先破门',' · Breach the gate first']);
  if(steps>0)return action+' · '+num(steps)+pair([' 格',' hexes']);
  return plan.kind==='attack'?action+pair([' · 已在射程内',' · In range']):pair(['已在所选地格','Already on the selected hex']);
}

export function nativeBattleCommandRows({preview=null,plans=[],summary='',reason='',advanceHint='',unitName,onQueue,onCancel,onRemove,onAdvance,onContinue}){
  if(!preview&&!plans.length)return [text('plan-hint',summary||pair(['选中部队，再点地格或敌军拟令。','Select a unit, then choose a hex or enemy to plan an order.']),{tone:'dim',lines:3})];
  const replacing=preview&&plans.some(p=>p.unit===preview.unit),damage=preview?.combat;
  const damageText=preview?.valid&&damage?.inReach!==false&&Number.isFinite(damage?.minLoss)&&Number.isFinite(damage?.maxLoss)?pair(['到位后普通命中约 ','Estimated ordinary hit from the destination: '])+num(damage.minLoss)+'–'+num(damage.maxLoss)+pair([' 人',' troops']):'';
  const cannotDispatch=battleCommandPlanReason(reason)||(plans.some(p=>!p.valid)?pair(['先修改或移除无法执行的军令。','Change or remove orders that are no longer available.']):'');
  const why=preview?pair(['先处理当前预览。','Finish the current preview first.']):cannotDispatch;
  const output=[];
  if(preview){output.push(group('plan-preview',[text('plan-preview-text',unitName(preview.unit)+' · '+planText(preview,unitName),{lines:3}),damageText?text('plan-estimate',damageText,{lines:2}):null,row('plan-preview-actions',[button('stage-order',replacing?pair(['替换军令','Replace order']):pair(['加入军令','Queue order']),onQueue,{active:true,disabled:!preview.valid,detail:!preview.valid?battleCommandPlanReason(preview.reason??'unavailable'):undefined}),button('cancel-order',pair(['取消预览','Cancel preview']),onCancel)])]));}
  if(plans.length){output.push(text('plan-count',pair(['待下达 ','Queued: '])+num(plans.length)+pair([' 条军令',' orders']),{tone:'gold',lines:1}),
    row('plan-dispatch-actions',[button('advance-orders',pair(['确认并推进3秒','Confirm + run 3s']),onAdvance,{active:true,disabled:Boolean(why)}),onContinue?button('dispatch-orders',pair(['确认并继续','Confirm + continue']),onContinue,{disabled:Boolean(why)}):null]),cannotDispatch?text('plan-reason',cannotDispatch,{tone:'bad',lines:3}):null,
    ...plans.map(plan=>group('plan-'+plan.unit,[text('plan-'+plan.unit+'-info',unitName(plan.unit)+' · '+planText(plan,unitName),{lines:2}),button('remove-order-'+plan.unit,pair(['移除','Remove']),()=>onRemove(plan.unit),{accessible:pair(['移除 ','Remove order for '])+unitName(plan.unit)})])),
    text('plan-advance-hint',advanceHint||pair(['最多推进3秒，遇关键时刻可提前暂停。','Runs up to 3 seconds and may pause sooner at a milestone.']),{tone:'dim',lines:3}),summary?text('plan-summary',summary,{tone:'dim',lines:3}):null);
  }
  return output.filter(Boolean);
}
