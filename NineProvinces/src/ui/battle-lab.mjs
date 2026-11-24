import {createLabShell as shell,words as w,unitName,phaseName,stamp} from './battle-lab-shell.mjs';
import {createBattleBoard as makeBoard} from './battle-board.mjs';
import {createBattlePlayground} from './battle-playground.mjs';
// The tactical laboratory/replay is a UI over actual battle states; it never owns a realm save.
import { FORMATIONS } from '../data/battle.mjs';
import { TACTICS } from '../data/tactics.mjs';
import { replayFrameAt } from '../sim/battle-history.mjs';
import { getLanguage, nm, num } from '../i18n.mjs';
import { h, button, clear } from './dom.mjs';
import {battleActionLabel,battleOutcomeReason,hexPositionLabel} from './battle-copy.mjs';

const clone=v=>JSON.parse(JSON.stringify(v));
const recordedTime=time=>Math.round(time*1000)/1000;
const detailStamp=time=>{const tenths=Math.round(time*10);return stamp(tenths/10)+'.'+(tenths%10);};
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
 const {winner,why}=last.over,unit=last.units?.find(unit=>!unit.gone&&!unit.routed&&tape.units.find(identity=>identity.id===unit.id)?.side===winner);
 const hex=why==='keep'?tape.field.keep:why==='depot'?tape.field.depot:unit?.pos;
 moments.push({kind:'result',time:last.time,unit:unit?.id,hex,label:w('胜负落定','Outcome'),
  detail:battleOutcomeReason(last.over,playerSide,getLanguage())});
 return moments.sort((a,b)=>a.time-b.time);
}

function eventText(e,identities){
 const who=id=>{const u=identities.find(u=>u.id===id);return u?unitName(u):w('部队','Unit');};
 if(e.kind==='tactic'||e.kind==='tacticFailed')return who(e.unit)+' · '+nm(TACTICS[e.tactic])+(e.kind==='tacticFailed'?w('（被识破）',' (resisted)'):e.target!=null?' → '+who(e.target):'');
 if(e.kind==='rout')return who(e.unit)+w(' 溃退',' routed');
 if(e.kind==='gateOpen')return w('城门攻破','Gate breached');if(e.kind==='depotBurnt')return w('粮仓焚毁','Depot burned');
 if(e.kind==='contact')return w('初次接敌','First contact');
 if(e.kind==='occupy')return w('开始占营','Keep contested');
 if(e.kind==='structureHit')return who(e.unit)+' · '+(e.structure==='gate'?w('攻击城门','Struck the gate'):w('攻击粮仓','Struck the depot'))+' · −'+num(Math.round(e.amount));
 const detail=e.kind==='formation'?' · '+nm(FORMATIONS[e.formation??e.arg]):e.kind==='attack'?' → '+who(e.arg):e.kind==='move'||e.kind==='deploy'?' · '+hexPositionLabel(e.hex??e.arg,getLanguage()):e.kind==='speed'?' · '+e.speed+'×':e.kind==='autoTactic'?' · '+(e.arg?w('开','on'):w('关','off')):e.kind==='aim'?' · '+nm(TACTICS[e.tactic])+(e.target!=null?' → '+who(e.target):''):'';
 return battleActionLabel(e,getLanguage())+(e.unit!=null?' · '+who(e.unit):'')+detail;
}

export function battleReportContent(report,identities=[],playerSide=null,jump=null){
 if(!report)return h('p',w('没有可显示的战报','No battle report available'));
 const sides=h('div.labTotals',report.sides.map(side=>h('section',h('h3',side.side?w('红军','RED ARMY'):w('蓝军','BLUE ARMY')),h('strong',num(side.remaining)+' / '+num(side.start)),h('p',w('净减员 ','Net losses ')+num(side.losses)+' · '+w('治疗 ','Restored ')+num(side.healing)),h('p',w('克制命中 ','Counter hits ')+side.counterHits+' · '+w('夹击 ','Flanks ')+side.flankHits+' · '+w('战法 ','Tactics ')+side.tactics))));
 const headers=[w('部队 / 阵型','Unit / Formation'),w('起始 → 剩余','Start → Remain'),w('实际杀伤','Damage'),w('承伤 / 治疗','Taken / Healing'),w('克制 / 夹击 / 战法','Counter / Flank / Tactic')];
 const table=h('div.labTableScroll',h('table.labReportTable',h('thead',h('tr',headers.map(x=>h('th',{'scope':'col'},x)))),h('tbody',report.units.map(u=>h('tr',h('th',{'scope':'row'},unitName(u)+' · '+nm(FORMATIONS[u.formation])),h('td',num(u.start)+' → '+num(u.remaining)),h('td',num(Math.round(u.damage))),h('td',num(Math.round(u.taken))+' / '+num(Math.round(u.healing))),h('td',u.counterHits+' / '+u.flankHits+' / '+u.tactics))))));
 const chronology=[...(report.events??[]).map(e=>({...e,time:e.t,source:'event'})),...(report.actions??[]).filter(e=>e.kind!=='select').map(e=>({...e,source:'action'}))].sort((a,b)=>a.time-b.time);
 const rows=chronology.map(entry=>{
  const title=(entry.source==='action'?w('军令 · ','Order · '):'')+eventText(entry,identities);
  const mark=jump?.match(entry);
  const description=mark?button(title,()=>jump.go(mark),{title:w('在战场回放中查看','Show in battle replay')}):
   h('span',{'className':entry.source==='action'?'playerOrder':''},title);
  return h('li',h('time',mark?detailStamp(mark.time):stamp(entry.time)),description);
 });
 return h('div.labReport',h('p.labReportIntro',w('战斗时长 ','Duration ')+stamp(report.seconds)+' · '+(report.winner==null?w('尚未结束','In progress'):(report.winner?w('红军获胜','Red army wins'):w('蓝军获胜','Blue army wins'))+' · '+battleOutcomeReason(report,playerSide,getLanguage()))),sides,table,h('p.labReportNote',w('杀伤包含随后被救治的损伤，净减员只计算战前与战后兵力差。反击与战法均计入实际贡献。','Damage includes casualties later restored by healing. Net losses compare initial and final troops. Retaliation and tactics count toward actual contributions.')),h('h3',w('军令与战局纪要','Orders & battle chronology')),h('ol.labChronology',rows.length?rows:h('li',w('尚无军令或关键战况','No orders or key events yet'))));
}

export function openBattleReplay(app,tape,{onExit,tab='report',playerSide=null}={}) {
 if(!tape?.frames?.length)throw new Error('Replay has no recorded frames');
 const ui=shell(w('战斗详报与回放','Battle report & replay'),onExit),tabs=h('nav.labTabs'),content=h('div.labReplayContent');ui.body.append(tabs,content);
 const inferredSide=tape.setup.factions?.indexOf(app.state?.player);if(playerSide===null&&inferredSide>=0)playerSide=inferredSide;
 const total=tape.frames.at(-1).time;
 const moments=replayMoments(tape,playerSide);
 const recordedEvents=tape.events??[],recordedActions=tape.actions??[];
 const timeline=[...recordedEvents.map(e=>({...e,at:e.t})),
  ...recordedActions.filter(e=>e.kind!=='select'&&e.kind!=='aim'&&e.kind!=='cancelAim').map(e=>({...e,at:e.time,order:true}))]
  .sort((a,b)=>b.at-a.at);
 const tabButtons={report:button(w('战斗详报','Detailed report'),()=>change('report')),
  replay:button(w('战场回放','Battle replay'),()=>change('replay'))};
 tabs.append(tabButtons.report,tabButtons.replay);
 let cursor=0,playing=false,speed=1,board=null,clock=null,slider=null,orders=null,lastKey='';
 let activeMoment=null,selectedUnit=null,caption=null;
 const momentButtons=new Map();
 ui.onDestroy(()=>board?.destroy());

 function matchMoment(entry){
  const time=recordedTime(entry.time);
  return moments.find(moment=>moment.time===time&&(
   moment.kind==='contact'&&contactOrder(entry)||
   moment.kind==='gate'&&entry.kind==='gateOpen'||
   moment.kind==='depot'&&entry.kind==='depotBurnt'||
   moment.kind==='occupy'&&occupiedOrder(entry)||
   moment.kind==='tactic'&&entry.kind==='tactic'&&entry.source==='event'&&entry.unit===moment.unit&&entry.tactic===moment.tactic||
   moment.kind==='result'&&entry.kind==='result'
  ));
 }
 function momentStrip(){
  if(!moments.length)return null;
  const group=h('div.labReplayMoments',{role:'group','aria-label':w('本局关键时刻','Battle highlights')});
  group.append(h('strong',w('本局关键时刻','Battle highlights')));
  for(const moment of moments){
   const when=detailStamp(moment.time);
   const control=button([h('span',moment.label),h('time',when)],()=>jump(moment));
   control.dataset.labMoment=moment.kind;
   control.setAttribute('aria-label',moment.label+' · '+when);
   control.setAttribute('aria-pressed',String(activeMoment===moment));
   momentButtons.set(moment.kind,control);
   group.append(control);
  }
  return group;
 }
 function jump(moment){
  cursor=moment.time;
  playing=false;
  activeMoment=moment;
  selectedUnit=null;
  if(tab==='replay')render(true);
  else change('replay');
  momentButtons.get(moment.kind)?.focus({preventScroll:true});
 }
 function seek(time){
  cursor=Math.max(0,Math.min(total,time));playing=false;activeMoment=null;render(true);
 }
 function togglePlayback(){
  playing=!playing;
  if(playing)activeMoment=null;
  if(cursor>=total)cursor=0;
  render(true);
 }
 function change(next){
  board?.destroy();board=null;tab=next;ui.host.dataset.labTab=tab;playing=false;momentButtons.clear();
  for(const [name,control]of Object.entries(tabButtons)){
   const current=name===tab;control.classList.toggle('main',current);control.setAttribute('aria-pressed',String(current));
  }
  clear(content);ui.body.scrollTop=0;
  if(tab==='report'){
   content.append(momentStrip()??'',battleReportContent(tape.report,tape.units,playerSide,{go:jump,match:matchMoment}));
   return;
  }
  const controls=h('div.labReplayControls');clock=h('output');
  slider=h('input',{type:'range',min:0,max:Math.max(.001,total),step:.001,value:cursor,
   'aria-label':w('回放时间','Replay time'),oninput:e=>seek(+e.target.value)});
  const toggle=button(w('播放 / 暂停','Play / pause'),togglePlayback);toggle.dataset.lab='play';
  controls.append(toggle,button(w('回到开场','Opening'),()=>seek(0)),...[1,2,4].map(v=>button(v+'×',()=>{speed=v;render(true);})),clock);
  content.append(controls,slider);
  board=makeBoard(content,tape.field.tiles,null,id=>{selectedUnit=id;activeMoment=null;render(true);});
  caption=h('p.labReplaySelection',{role:'status',hidden:true});
  orders=h('div.labReplayCurrent');
  content.append(h('div.labReplayOrders',momentStrip(),caption,orders),
   h('p.labReportNote',w('回放读取每秒的战况快照，可拖动时间轴或点选关键时刻。回放不会推进战役。','Replay uses battle snapshots. Drag the timeline or choose a highlight. Replays never advance the campaign.')));
  lastKey='';render(true);
 }
 function currentFrame(){
  // A highlight uses the first snapshot that includes the event. Free scrubbing retains the last preceding sample.
  if(activeMoment?.kind==='result')return tape.frames.at(-1);
  return activeMoment?tape.frames.find(frame=>frame.time>=activeMoment.time)??tape.frames.at(-1):replayFrameAt(tape,cursor);
 }
 function render(force=false){
  if(tab!=='replay')return;
  const frame=currentFrame(),key=frame.time+':'+frame.phase+':'+playing+':'+speed;
  if(!force&&lastKey===key)return;
  lastKey=key;
  const units=frame.units.map(u=>({...tape.units[u.id],...u})),tiles=tape.field.tiles.slice();
  for(const [at,tile]of frame.terrain??[])tiles[at]=tile;
  board.setTiles(tiles);
  const target=activeMoment?.target,area=Number.isInteger(activeMoment?.hex)&&activeMoment.hex>=0&&activeMoment.hex<tiles.length?[activeMoment.hex]:[];
  board.draw(units,{time:frame.time,animate:playing,naval:tape.setup.kind==='naval',nameOf:unitName,calm:app.calm?.(),
   events:recordedEvents.filter(e=>e.t<=cursor+1e-7),fire:frame.fire,gate:tape.field.gate,keep:tape.field.keep,depot:tape.field.depot,
   selected:activeMoment?.unit??selectedUnit,target,area});
  clock.textContent=phaseName(frame.phase)+' · '+detailStamp(cursor)+' / '+detailStamp(total)+' · '+speed+'×'+(playing?' ▶':' ❚❚');
  slider.value=cursor;
  for(const [kind,control]of momentButtons){
   const selected=activeMoment?.kind===kind;control.classList.toggle('on',selected);control.setAttribute('aria-pressed',String(selected));
  }
  const subject=tape.units.find(u=>u.id===activeMoment?.unit),object=tape.units.find(u=>u.id===activeMoment?.target);
  const destination=area.length?hexPositionLabel(area[0],getLanguage()):'';
  const highlighted=activeMoment?.detail??[
   subject?(object?unitName(subject)+' → '+unitName(object):unitName(subject)):'',
   destination
  ].filter(Boolean).join(' · ');
  if(caption.textContent!==highlighted)caption.textContent=highlighted;
  caption.hidden=!highlighted;
  const recent=timeline.filter(e=>e.at<=cursor+1e-7).slice(0,5);
  const lines=recent.length?recent.map(e=>h('p',detailStamp(e.at)+' · '+(e.order?w('军令 · ','Order · '):'')+eventText(e,tape.units))):[h('p',phaseName(frame.phase))];
  clear(orders).append(h('strong',w('此刻军令与战况','Orders and events at this point')),...lines);
 }
 ui.setKey((code,e)=>{
  if(['INPUT','SELECT','BUTTON'].includes(e?.target?.tagName))return false;
  if(code==='Space'){togglePlayback();return true;}
  if(code==='ArrowRight'||code==='ArrowLeft'){seek(cursor+(code==='ArrowRight'?1:-1));return true;}
  return false;
 });
 change(tab);ui.loop(dt=>{board?.tick(dt);if(tab==='replay'&&playing){cursor=Math.min(total,cursor+dt*speed);if(cursor===total)playing=false;render();}});
 return {destroy:ui.destroy,key:ui.key,inspect:()=>({kind:'replay',tab,cursor,playing,speed,total,frame:clone(currentFrame()),
  highlight:activeMoment?{kind:activeMoment.kind,time:activeMoment.time,unit:activeMoment.unit,target:activeMoment.target,hex:activeMoment.hex}:null})};
}

export function openBattleSandbox(app,options={}) {
 return createBattlePlayground(app,{...options,openReplay:(tape,opts)=>openBattleReplay(app,tape,{playerSide:0,...opts})});
}
