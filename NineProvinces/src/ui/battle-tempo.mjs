// Shared command pacing only. The simulation, RNG, speed and save format remain owned by their existing systems.
import {tacticPreview} from '../sim/battle.mjs';
import {TACTICS} from '../data/tactics.mjs';

export const createTempoMilestones=b=>({contact:false,tactic:false,...(b?.gate?{gateHp:b.gate.hp}:{}),...(b?.depot?{depotHp:b.depot.hp}:{})});
export const beginTacticAim=(current,{unit,tactic},paused)=>({unit,tactic,target:null,wasPaused:current?.wasPaused??paused});
export const selectTacticTarget=(aim,target)=>aim?{...aim,target}:null;
export const restoreTacticPause=(aim,paused)=>aim?.wasPaused??paused;

function usefulSupport(b,tactic,preview){
 return preview.targets.some(id=>{
  const unit=b.units[id];if(!unit||unit.gone)return false;
  if(tactic.kind==='heal')return unit.troops<unit.start;
  if(tactic.kind==='rally')return unit.morale<100||unit.routed||Object.keys(unit.status??{}).length>0;
  if(tactic.kind==='rage')return unit.rage<100;
  return true;
 });
}
function opportunity(b,side){
 for(const unit of b.units){
  if(unit.side!==side||unit.gone||unit.routed||unit.autoTactic||unit.rage<100||unit.status.stun>0)continue;
  for(const id of unit.tactics){
   const tactic=TACTICS[id],preview=tacticPreview(b,unit,id);
   if(preview.helping){if(preview.valid&&usefulSupport(b,tactic,preview))return {unitId:unit.id,tacticId:id,targetId:null};}
   else for(const target of b.units)if(target.side!==side&&tacticPreview(b,unit,id,target).valid)return {unitId:unit.id,tacticId:id,targetId:target.id};
  }
 }
 return null;
}
/** Call after a real simulation step, including with prompts disabled, to consume each milestone only once. */
export function inspectTempoMilestones(b,side,seen){
 const next={...seen},reasons=[];
 if(b.over)return {next,reasons,opportunity:null,contactKind:null};
 let contactKind=null;
 if(!seen.contact){
  if(b.gate&&Number.isFinite(seen.gateHp)&&b.gate.hp<seen.gateHp)contactKind='gate';
  else if(b.depot&&Number.isFinite(seen.depotHp)&&b.depot.hp<seen.depotHp)contactKind='depot';
  else if(b.units.some(unit=>unit.side===side&&(unit.lastAttack||unit.record?.taken>0)))contactKind='units';
  if(contactKind){next.contact=true;reasons.push('contact');}
 }
 if(b.gate)next.gateHp=b.gate.hp;if(b.depot)next.depotHp=b.depot.hp;
 const ready=seen.tactic?null:opportunity(b,side);
 if(ready){next.tactic=true;reasons.push('tactic');}
 return {next,reasons,opportunity:ready,contactKind};
}
