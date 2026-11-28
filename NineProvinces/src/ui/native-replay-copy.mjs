// Shared read-only presentation for completed fictional battle tapes.
import { FORMATIONS, UNITS } from '../data/battle.mjs';
import { TACTICS } from '../data/tactics.mjs';
import { generalName } from '../view/names.mjs';
import { getLanguage,nm,num } from '../i18n.mjs';
import { battleActionLabel,battleOutcomeReason,hexPositionLabel } from './battle-copy.mjs';
const w=(zh,en)=>getLanguage()==='en'?en:zh;
export const unitName=u=>u.general?generalName(u.general):nm(UNITS[u.kind??u.unit]);
export const phaseName=p=>w({deploy:'部署',fight:'交战',result:'结算'}[p]??p,{deploy:'Deployment',fight:'Combat',result:'Result'}[p]??p);
export const stamp=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const recordedTime=time=>Math.round(time*1000)/1000;
export const detailStamp=time=>{const tenths=Math.round(time*10);return stamp(tenths/10)+'.'+(tenths%10);};
const contactOrder=entry=>entry.kind==='contact'||entry.kind==='pause'&&entry.reason?.split('+').includes('contact');
const occupiedOrder=entry=>entry.kind==='occupy';
const firstStrike=frames=>{
 for(const frame of frames){
  const strikes=(frame.units??[]).filter(unit=>Number.isFinite(unit.lastAttack?.time));
  if(strikes.length){
   const unit=strikes.reduce((first,next)=>next.lastAttack.time<first.lastAttack.time?next:first);
   return {time:unit.lastAttack.time,unit:unit.id,target:unit.lastAttack.target};
  }
 }
 return null;
};

/** Highlights refer only to this completed tape's actual events and captured unit positions. */
export function replayMoments(tape,playerSide=null){
 const last=tape?.frames?.at(-1);
 if(last?.phase!=='result'||![0,1].includes(last.over?.winner)||!Number.isFinite(last.time))return [];
 const events=tape.events??[],actions=tape.actions??[],moments=[];
 const firstAction=actions.find(contactOrder),strike=firstStrike(tape.frames),firstStructure=events.find(event=>event.kind==='structureHit');
 const firstCombat=[strike,firstStructure?{time:firstStructure.t,unit:firstStructure.unit,at:firstStructure.at}:null]
  .filter(mark=>Number.isFinite(mark?.time)).sort((a,b)=>a.time-b.time)[0];
 const contact=firstAction??firstCombat;
 if(contact&&Number.isFinite(contact.time)){
  const supporting=firstCombat&&Math.abs(firstCombat.time-contact.time)<=.2?firstCombat:null;
  moments.push({kind:'contact',time:recordedTime(contact.time),unit:contact.unit??supporting?.unit,
   target:contact.target??supporting?.target,hex:contact.at??supporting?.at,
   label:firstAction?w('初次接敌','First contact'):w('接敌记录','Recorded contact')});
 }

 const breach=events.find(event=>event.kind==='gateOpen'||event.kind==='depotBurnt');
 const occupy=actions.find(occupiedOrder);
 const tactics=events.filter(event=>event.kind==='tactic'&&TACTICS[event.tactic]);
 const tactic=tactics.find(event=>tape.units.find(unit=>unit.id===event.unit)?.side===playerSide)??tactics[0];
 if(breach&&Number.isFinite(breach.t)){
  const gate=breach.kind==='gateOpen',structure=gate?'gate':'depot';
  const hit=events.findLast(event=>event.kind==='structureHit'&&event.structure===structure&&event.t<=breach.t);
  moments.push({kind:structure,time:recordedTime(breach.t),unit:breach.unit??hit?.unit,
   hex:breach.at??hit?.at??tape.field[structure],label:gate?w('城门攻破','Gate breached'):w('粮仓焚毁','Depot burned')});
 }else if(occupy&&Number.isFinite(occupy.time)){
  moments.push({kind:'occupy',time:recordedTime(occupy.time),unit:occupy.unit,hex:occupy.at??tape.field.keep,label:w('开始占营','Keep contested')});
 }else if(tactic&&Number.isFinite(tactic.t)){
  moments.push({kind:'tactic',time:recordedTime(tactic.t),unit:tactic.unit,target:tactic.target,tactic:tactic.tactic,label:nm(TACTICS[tactic.tactic])});
 }
 const crossing=events.find(event=>event.kind==='ferryEngaged');
 if(crossing&&Number.isFinite(crossing.t))moments.push({kind:'crossing',time:recordedTime(crossing.t),hex:crossing.at,label:w('争夺渡口','Crossing contested')});
 const pincers=events.filter(event=>event.kind==='flankContact');
 const pincer=pincers.find(event=>event.side===playerSide)??pincers[0];
 if(pincer&&Number.isFinite(pincer.t))moments.push({kind:'flank',time:recordedTime(pincer.t),unit:pincer.unit,target:pincer.target,hex:pincer.at,label:w('两翼夹击','Pincer attack')});
 const {winner,why}=last.over,unit=last.units?.find(unit=>!unit.gone&&!unit.routed&&tape.units.find(identity=>identity.id===unit.id)?.side===winner);
 const hex=why==='keep'||why==='crossingHeld'||why==='crossingTaken'?tape.field.keep:why==='depot'?tape.field.depot:unit?.pos;
 moments.push({kind:'result',time:last.time,unit:unit?.id,hex,label:w('胜负落定','Outcome'),
  detail:battleOutcomeReason(last.over,playerSide,getLanguage())});
 return moments.sort((a,b)=>a.time-b.time);
}

export function eventText(e,identities){
 const who=id=>{const u=identities.find(u=>u.id===id);return u?unitName(u):w('部队','Unit');};
 if(e.kind==='tactic'||e.kind==='tacticFailed')return who(e.unit)+' · '+nm(TACTICS[e.tactic])+(e.kind==='tacticFailed'?w('（被识破）',' (resisted)'):e.target!=null?' → '+who(e.target):'');
 if(e.kind==='rout')return who(e.unit)+w(' 溃退',' routed');
 if(e.kind==='gateOpen')return w('城门攻破','Gate breached');if(e.kind==='depotBurnt')return w('粮仓焚毁','Depot burned');
 if(e.kind==='contact')return w('初次接敌','First contact');
 if(e.kind==='ferryEngaged')return w('开始争夺渡口','The crossing is contested');
 if(e.kind==='flankContact')return who(e.target)+w(' 遭两翼夹击',' caught in a pincer');
 if(e.kind==='occupy')return w('开始占营','Keep contested');
 if(e.kind==='structureHit')return who(e.unit)+' · '+(e.structure==='gate'?w('攻击城门','Struck the gate'):w('攻击粮仓','Struck the depot'))+' · −'+num(Math.round(e.amount));
 const detail=e.kind==='formation'?' · '+nm(FORMATIONS[e.formation??e.arg]):e.kind==='attack'?' → '+who(e.arg):e.kind==='move'||e.kind==='deploy'?' · '+hexPositionLabel(e.hex??e.arg,getLanguage()):e.kind==='speed'?' · '+e.speed+'×':e.kind==='autoTactic'?' · '+(e.arg?w('开','on'):w('关','off')):e.kind==='aim'?' · '+nm(TACTICS[e.tactic])+(e.target!=null?' → '+who(e.target):''):'';
 return battleActionLabel(e,getLanguage())+(e.unit!=null?' · '+who(e.unit):'')+detail;
}
