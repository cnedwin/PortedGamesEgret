import {UNITS,FORMATIONS,TERRAIN,formationAllowed,defaultFormation} from '../data/battle.mjs';
import {GENERALS} from '../data/generals.mjs';
import {TACTICS} from '../data/tactics.mjs';
import {command,stepBattle,useTactic,tacticPreview,combatPreview,deployBattleUnit,canDeployBattle,distance} from '../sim/battle.mjs';
import {createBattleRecorder} from '../sim/battle-history.mjs';
import {DEFAULT_SANDBOX,SANDBOX_MAPS,ENCOUNTERS,encounterConfig,createSandboxBattle} from '../sim/battle-sandbox.mjs';
import {nm,num,t,getLanguage} from '../i18n.mjs';
import {portrait} from '../view/portrait.mjs';
import {h,button,clear} from './dom.mjs';
import {createLabShell,words as w,unitName,phaseName,formationInfo,stamp} from './battle-lab-shell.mjs';
import {createBattleBoard} from './battle-board.mjs';
import {boardPoint,hexPoints} from './battle-board-layout.mjs';
import {tacticPresentation,battleOutcomeReason} from './battle-copy.mjs';
import {createTempoMilestones,inspectTempoMilestones,beginTacticAim,selectTacticTarget,restoreTacticPause} from './battle-tempo.mjs';

const clone=v=>JSON.parse(JSON.stringify(v));
const HELP=['atk','def','spd','heal','rally','rage'];
const OFFICERS=['guanyu','huangzhong','zhangfei','xiahoudun','xiahouyuan','zhangliao','caoren','lidian','zhouyu','huanggai','caocao'];
const orderName=id=>w({auto:'自动接敌',move:'向指定格移动',attack:'追击目标',hold:'坚守阵地'}[id]??id,{auto:'Engage automatically',move:'Moving to hex',attack:'Pursuing target',hold:'Holding position'}[id]??id);
const orderPhase=phase=>{
 const labels={received:['已受令','Accepted'],executing:['执行中','Executing'],done:['已完成','Completed'],failed:['未执行','Failed']};
 return w(...labels[phase]);
};
const tacticWhy=reason=>{
 const reasons={rage:['怒气未满','Not enough rage'],stun:['部队被定身','Unit is stunned'],unavailable:['部队已无法行动','Unit cannot act'],
  target:['请点选有效敌军','Choose a valid enemy'],range:['目标超出战法范围','Target is out of range'],unknown:['部队不会这项战法','Unit does not know this tactic']};
 return w(...(reasons[reason]??reasons.target));
};
const tagNames={counter:['克制','Counter'],countered:['被克制','Countered'],shield:['盾防箭矢','Shield vs arrows'],brace:['枪阵拒骑','Spears brace horse'],height:['高地','High ground'],flank:['夹击','Flank'],charge:['冲锋','Charge'],cavalryTerrain:['骑兵地形修正','Cavalry terrain']};

function selectField(label,values,current,onChange){
 const select=h('select',{'aria-label':label,onchange:e=>onChange(e.target.value)},values.map(([value,text])=>h('option',{value},text)));
 select.value=String(current);return h('label.labField',h('span',label),select);
}

// Each card previews the very same seeded terrain the encounter will use, grouped into a few static SVG paths.
function thumbnail(id){
 const b=createSandboxBattle(encounterConfig(id)),groups=new Map();
 b.tiles.forEach((tile,at)=>{const p=boardPoint(at),points=hexPoints(p.x,p.y).split(' '),path='M'+points.join('L')+'Z';groups.set(tile,(groups.get(tile)??'')+path);});
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 15 800 440');svg.setAttribute('aria-hidden','true');svg.classList.add('labEncounterMap');
 for(const[tile,path]of groups){const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',path);p.setAttribute('fill','#'+TERRAIN[tile].colour.toString(16).padStart(6,'0'));svg.append(p);}
 for(const u of b.units){const p=boardPoint(u.pos),dot=document.createElementNS(svg.namespaceURI,'circle');dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y);dot.setAttribute('r','12');dot.setAttribute('fill',u.side?'#974932':'#315e60');dot.setAttribute('stroke','#fff1bf');dot.setAttribute('stroke-width','3');svg.append(dot);}
 return svg;
}

/** Interactive standalone encounters. Every button issues the same commands as a campaign battle. */
export function createBattlePlayground(app,{onExit,openReplay}){
 const ui=createLabShell(w('演武沙盘','Tactical sandbox'),onExit);
 let config=clone(DEFAULT_SANDBOX),b=null,record=null,phase='config',paused=true,speed=1,selected=0;
 let aim=null,hoverTarget=null;
 let board=null,toolbar=null,panel=null,quickTargets=null,quickHeading=null,clock=null,child=null,tape=null;
 let objective=null,situationDetail=null,tempoToggle=null,tempoBadge=null,tempoOfferButton=null,toolbarKey='';
 let accumulator=0,refresh=0,lastImpact=-Infinity;
 let milestones=createTempoMilestones(),autoPause=true,pauseReason=null,milestoneOffer=null,focusOffer=null;
 const orders=new Map();
 const quickButtons=new Map();
 let holdingControl=false,pendingControls=false,releaseTimer=0;
 const controlPointers=new Set();
 const notify=text=>{ui.notice.textContent=text;};
 const releaseControl=event=>{
  controlPointers.delete(event.pointerId);clearTimeout(releaseTimer);
  releaseTimer=setTimeout(()=>{
   if(controlPointers.size)return;
   holdingControl=false;if(pendingControls&&!ui.gone){pendingControls=false;render(true);}
  },0);
 };
 const blurControls=()=>{controlPointers.clear();releaseControl({pointerId:null});};
 ui.host.addEventListener('pointerdown',event=>{
  if(event.target.closest('button,input,select,summary')){clearTimeout(releaseTimer);controlPointers.add(event.pointerId);holdingControl=true;}
 },true);
 window.addEventListener('pointerup',releaseControl,true);window.addEventListener('pointercancel',releaseControl,true);
 window.addEventListener('blur',blurControls);
 ui.onDestroy(()=>{clearTimeout(releaseTimer);window.removeEventListener('pointerup',releaseControl,true);window.removeEventListener('pointercancel',releaseControl,true);window.removeEventListener('blur',blurControls);child?.destroy();board?.destroy();});

 function configuration(){
  board?.destroy();board=null;b=null;phase='config';aim=null;
  ui.host.dataset.labPhase='config';ui.heading.textContent=w('演武沙盘','Tactical sandbox');clear(ui.body);
  const intro=h('div.labEncounterIntro',h('span.labSeal',w('演','WAR')),h('div',h('h3',w('从一场真正的交锋开始','Choose your next encounter')),h('p',w('选好战局，亲手布阵。每道军令、每次施策都能在战后回看。','Choose a scenario and deploy your army. Every order and tactic can be reviewed afterwards.'))));
  const encounters=h('div.labEncounters');
  for(const e of Object.values(ENCOUNTERS)){
   const start=button(w('开始'+e.zh,'Play '+e.en),()=>{config=encounterConfig(e.id);create();},{kind:'main'});start.dataset.encounter=e.id;
   encounters.append(h('article.labEncounterCard',thumbnail(e.id),h('div',h('small',w(...e.tag)),h('h3',nm(e)),h('p',w(...e.description)),start)));
  }
  const nav=h('div.labConfigTop',
   selectField(w('地形','Terrain'),Object.values(SANDBOX_MAPS).map(m=>[m.id,nm(m)]),config.map,value=>{
    config.map=value;config.encounter=null;
    if(value!=='river')for(const army of config.armies)for(const row of army)if(UNITS[row.unit].group==='navy'){row.unit='spear';row.formation='fishscale';}
    configuration();ui.body.querySelector('.labCustomForces').open=true;
   }),
   h('label.labField',h('span',w('种子','Seed')),h('input',{type:'number',min:0,max:4294967295,value:config.seed,'aria-label':w('种子','Seed'),onchange:e=>{config.seed=(+e.target.value)>>>0;config.encounter=null;}})),
   button(w('生成战场','Create battlefield'),create,{kind:'main'})
  );
  const armies=h('div.labArmyConfig');
  for(let side=0;side<2;side++){
   const section=h('section',h('h3',side?w('红军 · 电脑','Red army · AI'):w('蓝军 · 你指挥','Blue army · Player')));
   config.armies[side].forEach((row,index)=>{
    const change=fn=>value=>{fn(value);config.encounter=null;configuration();ui.body.querySelector('.labCustomForces').open=true;};
    section.append(h('fieldset.labArmyRow',h('legend',w('第','Unit ')+(index+1)+w(' 部','')),
     selectField(w('兵种','Troops'),Object.values(UNITS).filter(u=>config.map==='river'||u.group!=='navy').map(u=>[u.id,nm(u)]),row.unit,change(value=>{row.unit=value;row.formation=defaultFormation(value);})),
     selectField(w('阵型','Formation'),Object.values(FORMATIONS).filter(f=>formationAllowed(row.unit,f.id)).map(f=>[f.id,nm(f)]),row.formation,change(value=>{row.formation=value;})),
     h('p.labFormation',formationInfo(FORMATIONS[row.formation])),
     selectField(w('将领','Officer'),[['',w('无名兵长 · 同等基础能力','Captain · Equal base abilities')],...OFFICERS.map(id=>[id,nm(GENERALS[id])])],row.general??'',change(value=>{row.general=value||null;})),
     h('label.labField',h('span',w('兵力','Strength')),h('input',{type:'number',min:1000,max:20000,step:100,value:row.troops,'aria-label':w('兵力','Strength')+' '+side+'-'+index,onchange:e=>{row.troops=+e.target.value;config.encounter=null;}})),
     config.armies[side].length>1?button(w('移除此部','Remove unit'),()=>{config.armies[side].splice(index,1);config.encounter=null;configuration();ui.body.querySelector('.labCustomForces').open=true;}):null
    ));
   });
   if(config.armies[side].length<4)section.append(button(w('增加部队','Add unit'),()=>{config.armies[side].push({unit:config.map==='river'?'mengchong':'spear',troops:6000,formation:'square'});config.encounter=null;configuration();ui.body.querySelector('.labCustomForces').open=true;}));
   armies.append(section);
  }
  ui.body.append(intro,encounters,h('details.labCustomForces',h('summary',w('自由编军 · 自选地形、将领、阵型与兵力','Custom armies · Ground, officers, formations and strength')),nav,armies),
   h('details.labDoctrine',h('summary',w('兵种与阵型取舍','Counters & formation tradeoffs')),h('p',w('枪克骑、骑克弓、弓克戟、戟克枪；刀盾挡箭，枪兵拒骑。林地与高地利于防守，骑兵穿越复杂地形更慢。','Spears counter horse, horse counters bows, bows counter halberds, halberds counter spears. Shields resist arrows; spears brace cavalry. Woods and heights defend well and slow horse.')),Object.values(FORMATIONS).map(f=>h('p',nm(f)+' · '+formationInfo(f)))));
  notify(w('独立演武，不影响战役。名将使用原有基础能力与特性，不携带战役科技、宝物或经验。','Independent practice. Officers use official base abilities and traits, without campaign technology, treasures or experience.'));
 }

 function create(){
  try{b=createSandboxBattle(config);}catch(e){notify(w('配置无效：','Invalid setup: ')+e.message);return;}
  board?.destroy();record=createBattleRecorder(b);phase='deploy';paused=true;selected=0;aim=null;hoverTarget=null;tape=null;
  accumulator=0;refresh=0;lastImpact=-Infinity;
  milestones=createTempoMilestones(b);autoPause=true;pauseReason=null;milestoneOffer=null;focusOffer=null;orders.clear();
  for(const u of b.units)if(u.side===0){command(b,u.id,'autoTactic',false);record.action('autoTactic',{unit:u.id,arg:false});}
  record.capture(phase,{force:true});ui.host.dataset.labPhase=phase;
  ui.heading.textContent=ENCOUNTERS[config.encounter]?w('演武 · ','Practice · ')+nm(ENCOUNTERS[config.encounter]):w('自由演武','Custom battle');
  clear(ui.body);toolbar=h('div.labBattleTools');clock=h('output.labClock');toolbarKey='';
  objective=h('strong');situationDetail=h('span');
  tempoToggle=button(w('关键时刻暂停','Pause at milestones'),()=>{
   if(phase==='result')return;
   autoPause=!autoPause;
   notify(autoPause?w('关键时刻暂停已开启。','Milestone pauses enabled.'):w('关键时刻暂停已关闭。','Milestone pauses disabled.'));
   render(true);
  });
  tempoToggle.classList.add('labTempoToggle');tempoToggle.dataset.lab='tempo-pause';
  tempoBadge=h('small',{'aria-hidden':'true'});tempoToggle.append(tempoBadge);
  tempoOfferButton=button('',()=>{
   if(!milestoneOffer)return;
   const {unitId,tacticId}=milestoneOffer;
   milestoneOffer=null;focusOffer=tacticId;tapUnit(unitId);
  });
  tempoOfferButton.classList.add('labTempoOffer');tempoOfferButton.dataset.lab='tempo-opportunity';
  const situation=h('div.labSituation',objective,situationDetail,tempoOfferButton,tempoToggle);
  const layout=h('div.labBattleLayout'),field=h('div.labFieldArea');
  panel=h('aside.labUnitPanel',{'aria-label':w('部队指挥','Unit commands')});
  quickHeading=h('small',{'aria-hidden':'true'});
  quickTargets=h('div.labQuickTargets',{role:'group',hidden:true},quickHeading);
  quickButtons.clear();
  layout.append(field,h('div.labCommandDock',quickTargets,panel));
  ui.body.append(toolbar,clock,situation,layout);
  board=createBattleBoard(field,b.tiles,tapHex,tapUnit,{onHover:id=>{if(aim&&hoverTarget!==id){hoverTarget=id;render(false);}}});
  field.append(h('p.labBoardLegend',w('青格可部署 · 金格为射程 · 虚线为实际行军路线 · 红线为追击目标。1–4选军，空格暂停。','Cyan: deployment · Gold: range · Dashed line: actual path · Red: attack target. 1–4 select units, Space pauses.')));
  notify(w('点选蓝军，再点青格布阵。也可以调整阵型；准备好后鸣鼓开战。','Select blue, then a cyan hex to deploy. Adjust formations, then begin.'));render(true);
 }

 function issue(what,arg){
  if(!b||phase==='result')return;
  const u=b.units[selected];
  if(!u||u.side!==0)return;
  if(!command(b,u.id,what,arg)){
   const reason=u.gone||u.routed?w('部队已无法行动','Unit cannot act'):
    what==='move'?w('这块地形无法通行，可另选位置。','This terrain cannot be entered. Choose another hex.'):
    what==='attack'?w('目标已不可攻击，可另选敌军。','The target can no longer be attacked. Choose another enemy.'):w('当前无法下达这道军令','This command is unavailable');
   showOrder(u,'failed',reason);render(true);return;
  }
  clearAim(true);
  record.action(what,{unit:u.id,arg:arg??null});record.capture(phase,{force:true});
  if(what==='autoTactic')notify(unitName(u)+' · '+(arg?w('已允许自动施策','Auto tactics enabled'):w('已切回手动施策','Manual tactics enabled')));
  else if(what==='formation')showOrder(u,'done',nm(FORMATIONS[arg]));
  else showOrder(u,'received',orderName(what)+(what==='attack'?' · '+unitName(b.units[arg]):''),{what,arg});
  render(true);
 }
 function showOrder(u,state,detail,pending=null){
  orders.set(u.id,{state,detail,pending});
  if(selected===u.id)notify(unitName(u)+' · '+orderPhase(state)+' · '+detail);
 }
 function observeOrders(){
  for(const [id,entry] of orders){
   if(!entry.pending)continue;
   const u=b.units[id],{what,arg}=entry.pending;
   if(u.gone||u.routed){showOrder(u,'failed',w('部队已无法执行，可以选择其他部队。','Unit cannot act. You can select another unit.'));continue;}
   if(what==='move'&&u.pos===arg){showOrder(u,'done',w('已到达指定格','Reached the destination'));continue;}
   if(what==='attack'&&b.units[arg].gone){showOrder(u,'done',w('目标已离场','The target has left the field'));continue;}
   if(what==='hold'||what==='auto'){showOrder(u,'done',orderName(what));continue;}
   const blocked=what==='move'&&!u.path.length;
   const detail=blocked?w('等待路线，可改派军令','Waiting for a route. You can change the order.'):
    orderName(what)+(what==='attack'?' · '+unitName(b.units[arg]):'');
   const state=blocked?'received':'executing';
   if(entry.state!==state||entry.detail!==detail)orders.set(id,{...entry,state,detail});
  }
 }
 function clearAim(resume){
  if(!aim)return;
  record.action('cancelAim',{unit:aim.unit});
  if(resume)paused=restoreTacticPause(aim,paused);
  aim=null;hoverTarget=null;
 }
 function cancelAim(){clearAim(true);notify(w('已取消施策','Tactic cancelled'));render(true);}
 function togglePause(){
  const next=!paused;clearAim(false);paused=next;pauseReason=null;record.action(paused?'pause':'resume');
  if(!paused)milestoneOffer=null;
  notify(paused?w('已暂停，可下达军令。','Paused. You can issue orders.'):w('战斗继续，部队执行当前军令。','Battle resumed. Units follow their current orders.'));
  render(true);
 }
 function tapUnit(id){
  const u=b?.units[id];if(!u)return;
  if(aim&&u.side!==0){
   aim=selectTacticTarget(aim,id);record.action('aim',{unit:aim.unit,tactic:aim.tactic,target:id});
   const preview=tacticPreview(b,b.units[aim.unit],aim.tactic,u);
   notify(preview.valid?w('已选目标，查看覆盖范围后确认施策。','Target selected. Review the area, then confirm the tactic.'):
    tacticWhy(preview.reason)+w('。可另选敌军或取消施策。','. Choose another enemy or cancel the tactic.'));
   render(true);return;
  }
  if(u.side===0){if(aim)cancelAim();selected=id;record.action('select',{unit:id});render(true);}
  else if(phase==='fight')issue('attack',id);
 }
 function tapHex(at){
  if(!b)return;const there=b.units.find(u=>!u.gone&&u.pos===at);if(there)return tapUnit(there.id);
  if(aim){notify(w('请选择敌军目标，或取消施策。','Choose an enemy target, or cancel.'));return;}
  if(phase==='deploy'){
   const u=b.units[selected];
   if(deployBattleUnit(b,selected,at)){record.action('deploy',{unit:selected,hex:at});record.capture(phase,{force:true});showOrder(u,'done',w('布阵完成','Deployment updated'));}
   else showOrder(u,'failed',w('只能在己方可用的青色空格部署','Deploy on a free cyan hex in your own area'));
   render(true);
  }else if(phase==='fight')issue('move',at);
 }
 function arm(id){
  if(HELP.includes(TACTICS[id].kind)){cast(id,null);return;}
  aim=beginTacticAim(aim,{unit:selected,tactic:id},paused);
  paused=true;hoverTarget=null;
  record.action('aim',{unit:selected,tactic:id,target:null});notify(w('已暂缓战斗。选择敌军，预览范围，再确认施策。','Battle held. Choose an enemy, inspect the area, then confirm.'));render(true);
 }
 function cast(id,target){
  const u=b.units[selected];
  if(phase!=='fight'||!u)return;
  const preview=tacticPreview(b,u,id,target),before=b.events.length;
  if(!preview.valid||!useTactic(b,u,id,target==null?null:b.units[target])){
   showOrder(u,'failed',tacticWhy(preview.reason));render(true);return;
  }
  const resisted=b.events.slice(before).some(event=>event.kind==='tacticFailed'&&event.unit===u.id&&event.tactic===id);
  record.action('tactic',{unit:u.id,tactic:id,target});record.capture(phase,{force:true});
  paused=restoreTacticPause(aim,paused);aim=null;hoverTarget=null;
  if(milestoneOffer?.unitId===u.id)milestoneOffer=null;
  showOrder(u,resisted?'failed':'done',nm(TACTICS[id])+(resisted?w('被识破，可改下军令',' was resisted. You can issue another order.'):w('已施展',' resolved')));
  render(true);
 }
 function begin(){
  if(phase!=='deploy')return;
  phase='fight';paused=false;pauseReason=null;
  record.action('begin');record.capture(phase,{force:true});app.sound?.play('horn');
  notify(w('部队已推进。可点空格移动、点敌军进攻。','Units are advancing. Tap a hex to move, or an enemy to attack.'));
  render(true);
 }
 function finish(){
  phase='result';paused=true;aim=null;pauseReason=null;milestoneOffer=null;record.action('result',{...b.over});record.capture(phase,{force:true});tape=record.finish();
  app.sound?.play(b.over.winner?'lose':'win');notify((b.over.winner?w('红军获胜','Red army wins'):w('蓝军获胜','Blue army wins'))+' · '+battleOutcomeReason(b.over,0,getLanguage()));render(true);
 }
 function stepPractice(){
  stepBattle(b,.1,0);
  observeOrders();
  record.capture(phase);
  const cue=inspectTempoMilestones(b,0,milestones);
  milestones=cue.next;
  return autoPause&&cue.reasons.length?cue:null;
 }
 function announceMilestone(reasons,opportunity,stop,contactKind){
  const prompts=[];
  if(reasons.includes('contact'))prompts.push(contactKind==='gate'?w('城门交战','Assault at the gate'):
   contactKind==='depot'?w('粮仓遭攻','Depot under attack'):w('初次接敌','First contact'));
  if(reasons.includes('tactic')&&opportunity){
   const unit=b.units[opportunity.unitId],tactic=TACTICS[opportunity.tacticId];
   prompts.push(w('战法可施展','Tactic available')+' · '+unitName(unit)+' · '+nm(tactic));
   milestoneOffer=opportunity;
  }
  if(stop){
   paused=true;accumulator=0;pauseReason=reasons.join('+');
   record.action('pause',{source:'milestone',reason:pauseReason});record.capture(phase,{force:true});
  }
  notify(prompts.join(' · ')+w('。可下令或继续战斗。','. Issue an order or continue the battle.'));
 }
 function advance(seconds){
  clearAim(false);pauseReason=null;milestoneOffer=null;
  if(phase==='deploy'){phase='fight';record.action('begin');record.capture(phase,{force:true});}
  if(phase!=='fight')return;
  const reasons=[];let opportunity=null,contactKind=null;
  for(let i=0;i<Math.round(seconds/.1)&&!b.over;i++){
   const cue=stepPractice();
   if(cue){reasons.push(...cue.reasons);opportunity=cue.opportunity??opportunity;contactKind=cue.contactKind??contactKind;}
  }
  if(b.over){finish();return;}
  if(reasons.length)announceMilestone(reasons,opportunity,false,contactKind);
  else notify(w('已单步推进。战斗保持暂停，可以继续下令。','Advanced one step. The battle is paused and ready for orders.'));
  render(true);
 }
 function playback(){
  if(!b)return;clearAim(false);tape=record.finish();paused=true;
  child=openReplay(tape,{tab:phase==='result'?'report':'replay',onExit:()=>{child=null;}});render(true);
 }
 function feedback(event){
  if(event.kind==='impact'){
   const now=performance.now();if(now-lastImpact<350)return;lastImpact=now;app.sound?.play('clash',{volume:.38});
  }else if(event.kind==='tactic')app.sound?.play(event.tacticKind==='burn'?'fire':event.tacticKind==='heal'?'heal':HELP.includes(event.tacticKind)?'rally':'tactic');
 }

 function renderPanel(){
  const u=b.units[selected],active=u&&!u.gone&&!u.routed,foes=b.units.filter(o=>o.side!==0&&!o.gone);
  const {tactic:armed,target:aimTarget}=aim??{};
  const forecastOpen=panel.querySelector('.labForecast')?.open??false,scrollTop=panel.scrollTop;
  clear(panel).append(h('div.labRoster',b.units.filter(o=>o.side===0).map((o,i)=>{
   const x=button(h('span',h('b',String(i+1)),unitName(o),h('small',num(o.troops))),()=>tapUnit(o.id),{kind:selected===o.id?'on':''});
   x.dataset.lab='unit-'+o.id;return x;
  })));
  if(!u)return;
  const likeness=u.general?h('img',{src:portrait(u.general,48),alt:'',width:38,height:48}):h('span.labUnitSigil',nm(UNITS[u.kind]).slice(0,1));
  panel.append(h('div.labSelectedUnit',likeness,
   h('div',h('h4',unitName(u)+' · '+nm(UNITS[u.kind])),h('p',num(u.troops)+' / '+num(u.start)+' · '+w('士气 ','Morale ')+Math.round(Math.max(0,u.morale)))),
   h('strong'+(u.rage>=100?'.ready':''),w('怒气 ','Rage ')+Math.floor(u.rage)+'/100')
  ));
  const latest=orders.get(u.id);
  if(latest)panel.append(h('p.labOrderFeedback',{dataset:{state:latest.state}},h('b',orderPhase(latest.state)),h('span',latest.detail)));
  const setOrder=(text,what,arg,on)=>{
   const x=button(text,()=>issue(what,arg),{kind:on?'on':''});
   x.dataset.lab='order-'+what;
   x.setAttribute('aria-pressed',String(on));
   return x;
  };
  const automation=active&&phase!=='result'?setOrder(w('自动施策：','Auto tactics: ')+(u.autoTactic?w('开','on'):w('关','off')),'autoTactic',!u.autoTactic,u.autoTactic):null;
  if(phase==='deploy'){
   panel.append(selectField(w('阵型','Formation'),Object.values(FORMATIONS).filter(f=>formationAllowed(u.kind,f.id)).map(f=>[f.id,nm(f)]),u.formation,value=>issue('formation',value)),h('p.labFormation',formationInfo(FORMATIONS[u.formation])),h('div.labOrders',automation));
  }else if(!latest)panel.append(h('p.labCurrentOrder',orderName(u.order)+(u.target?' → '+unitName(u.target):'')));
  if(phase==='fight'&&active){
   panel.append(h('div.labOrders',setOrder(w('坚守','Hold'),'hold',null,u.order==='hold'),setOrder(w('自动接敌','Auto engage'),'auto',null,u.order==='auto'),automation));
   panel.append(h('div.labTactics',u.tactics.map(id=>{
    const tc=TACTICS[id],ready=u.rage>=100&&!(u.status.stun>0),spec=tacticPresentation(tc,tacticPreview(b,u,id).reach,{language:getLanguage()});
    const why=ready?null:u.status.stun>0?w('定身中','Stunned'):w('怒气满100后可施展','Requires 100 rage');
    const x=button(h('span',nm(tc),h('small.labTacticEffect',spec.effect),h('small.labTacticTarget',spec.target),h('small.labTacticCost',spec.cost)),()=>arm(id),{why,kind:armed===id?'on':''});
    x.title=spec.detail+(why?' · '+why:'');x.dataset.lab='tactic-'+id;return x;
   })));
   if(armed){
    const preview=tacticPreview(b,u,armed,aimTarget==null?null:b.units[aimTarget]);
    const confirm=button(w('确认施策','Confirm tactic'),()=>cast(armed,aimTarget),{kind:'main',why:preview.valid?null:tacticWhy(preview.reason)});confirm.dataset.lab='confirm-tactic';
    panel.append(h('div.labAimConfirm',h('strong',nm(TACTICS[armed])),h('p.labTacticExplanation',tacticPresentation(TACTICS[armed],preview.reach,{language:getLanguage()}).detail),h('p',aimTarget==null?w('选择下方目标，或点战场上的敌军。','Choose a target below, or on the battlefield.'):unitName(b.units[aimTarget])+' · '+w('覆盖 ','Covers ')+preview.targets.length+w(' 部敌军',' enemy units')),confirm,button(w('取消施策','Cancel tactic'),cancelAim)));
   }
   panel.append(h('div.labEnemyTargets',h('small',armed?w('施策目标','TACTIC TARGETS'):w('进攻目标','ATTACK TARGETS')),foes.map(o=>{
    const preview=armed?tacticPreview(b,u,armed,o):null;
    const x=button(h('span',unitName(o),h('small',num(o.troops)+' · '+w('距离 ','Range ')+distance(u.pos,o.pos))),()=>tapUnit(o.id),{kind:aimTarget===o.id?'on':'',why:preview&&!preview.valid?tacticWhy(preview.reason):null});x.dataset.lab='target-'+o.id;return x;
   })));
  }
  panel.append(h('details.labForecast',h('summary',w('阵型与对阵预估','Formation & matchup forecast')),h('p',nm(FORMATIONS[u.formation])+' · '+formationInfo(FORMATIONS[u.formation])),h('p.labReportNote',w('以下为当前状态下的一次普通命中，不含暴击；须在射程内才能命中。','One ordinary hit at current strength/terrain, before criticals. Attacks require range.')),foes.map(o=>{const p=combatPreview(b,u,o);return h('p.labMatchup',unitName(o)+' · '+p.weaponMultiplier.toFixed(2)+'× · '+p.minLoss+'–'+p.maxLoss+'\n'+p.tags.map(tag=>w(...(tagNames[tag]??[tag,tag]))).join(' / '));})));
  panel.querySelector('.labForecast').open=forecastOpen;panel.scrollTop=scrollTop;
 }

 function renderQuickTargets(){
  const u=b.units[selected];
  const targets=phase==='fight'&&u&&!u.gone&&!u.routed
   ?b.units.filter(enemy=>enemy.side!==u.side&&!enemy.gone&&!enemy.routed&&enemy.pos>=0)
    .map(enemy=>({enemy,range:distance(u.pos,enemy.pos)}))
    .filter(({enemy})=>!aim||tacticPreview(b,u,aim.tactic,enemy).valid)
    .sort((a,b)=>a.range-b.range||a.enemy.id-b.enemy.id)
    .slice(0,2)
   :[];
  const mode=aim?w('施策目标','Tactic targets'):w('就近进攻','Attack nearby');
  const chosen=aim?aim.target:u?.order==='attack'?u.target?.id:null;
  for(const [id,shortcut]of quickButtons)if(!targets.some(({enemy})=>enemy.id===id)){
   shortcut.node.remove();quickButtons.delete(id);
  }
  quickTargets.hidden=!targets.length;
  if(quickHeading.textContent!==mode){
   quickHeading.textContent=mode;
   quickTargets.setAttribute('aria-label',mode);
  }
  for(const {enemy,range}of targets){
   const name=unitName(enemy),distanceLabel=w(range+'格',range+' hexes');
   const label=aim?w('预览'+name,'Preview '+name):w('追击'+name,'Pursue '+name);
   let shortcut=quickButtons.get(enemy.id);
   if(!shortcut){
    const distanceMark=h('small');
    const node=button(h('span',name,distanceMark),()=>tapUnit(enemy.id));
    node.dataset.lab='quick-target-'+enemy.id;
    shortcut={node,distanceMark};
    quickButtons.set(enemy.id,shortcut);
    quickTargets.append(node);
   }
   const {node,distanceMark}=shortcut;
   if(distanceMark.textContent!==distanceLabel)distanceMark.textContent=distanceLabel;
   node.title=label;
   node.classList.toggle('on',chosen===enemy.id);
   node.setAttribute('aria-label',label+' · '+distanceLabel);
   node.setAttribute('aria-pressed',String(chosen===enemy.id));
  }
 }

 function render(force=false){
  if(!b||phase==='config')return;
  const {tactic:armed,target:aimTarget}=aim??{};
  const u=b.units[selected],preview=armed?tacticPreview(b,u,armed,b.units[aimTarget??hoverTarget]):null,reach=preview?.reach??UNITS[u.kind].range;
  ui.host.dataset.labPhase=phase;ui.host.classList.toggle('labAiming',!!armed);
  board.draw(b.units,{selected,time:b.time,naval:b.setup.kind==='naval',events:b.events,calm:app.calm?.(),nameOf:unitName,onFeedback:feedback,
   armed,target:aimTarget,area:preview?.hexes,areaValid:preview?.valid,
   valid:phase==='deploy'?at=>canDeployBattle(b,u,at):null,range:phase==='fight'?at=>!u.gone&&distance(u.pos,at)<=reach:null,
   fire:Object.keys(b.fire).map(Number),gate:b.gate?.at??null,keep:b.keep,depot:b.depot?.at??null});
  clock.textContent=phaseName(phase)+' · '+stamp(b.time)+' / '+stamp(b.limit)+(paused?' ❚❚':' ▶')+' · '+speed+'×';
  if(!force)return;
  if(holdingControl){pendingControls=true;return;}
  const focused=document.activeElement?.dataset?.lab;
  renderToolbar();
  renderSituation();
  renderQuickTargets();
  renderPanel();
  if(focusOffer){
   const tactic=panel.querySelector(`[data-lab="tactic-${CSS.escape(focusOffer)}"]`);
   if(tactic){
    panel.scrollTop+=tactic.getBoundingClientRect().top-panel.getBoundingClientRect().top-6;
    tactic.focus({preventScroll:true});
   }
   focusOffer=null;
  }else if(focused)ui.host.querySelector(`[data-lab="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
 }

 function renderToolbar(){
  const key=[phase,paused,speed].join('/');
  if(toolbarKey===key)return;
  toolbarKey=key;
  const control=(name,action,id,kind='')=>{
   const node=button(name,action,{kind});node.dataset.lab=id;return node;
  };
  clear(toolbar).append(...[
   phase==='deploy'?control(w('鸣鼓开战','Begin battle'),begin,'battle-toggle','main'):
    phase==='fight'?control(paused?w('继续战斗','Resume battle'):w('暂停战斗','Pause battle'),togglePause,'battle-toggle'):null,
   phase!=='result'?control(w('步进 1 秒','Step 1 second'),()=>{paused=true;record.action('step',{seconds:1});advance(1);},'step'):null,
   ...[1,2,4].map(v=>control(v+'×',()=>{speed=v;record.action('speed',{speed:v});render(true);},'speed-'+v,speed===v?'on':'')),
   control(w('战报 / 回放','Report / replay'),playback,'replay'),
   phase==='result'?control(w('再战此局','Play again'),create,'rematch','main'):null,
   control(w('换一场演武','Choose encounter'),()=>{child?.destroy();child=null;configuration();},'encounters')
  ].filter(Boolean));
 }

 function renderSituation(){
  const over=phase==='result',encounter=ENCOUNTERS[config.encounter];
  const goal=encounter?w(...encounter.objective):b.setup.kind==='siege'?w('攻破城门、占营10秒，或击退守军','Breach and hold the keep for 10s, or break the garrison'):
   w('日落前击退红军','Break the red army before sunset');
  objective.textContent=over?(b.over.winner?w('红军获胜','RED VICTORY'):w('蓝军获胜','BLUE VICTORY')):w('目标 · ','OBJECTIVE · ')+goal;
  situationDetail.hidden=!over&&!b.gate;
  if(over)situationDetail.textContent=battleOutcomeReason(b.over,0,getLanguage());
  else if(b.gate)situationDetail.textContent=w('城门 ','Gate ')+Math.max(0,Math.round(b.gate.hp))+' · '+w('占营 ','Keep ')+b.keepHeld.toFixed(1)+'/10s';
  let available=false;
  if(paused&&milestoneOffer&&!aim&&!over){
   const {unitId,tacticId,targetId}=milestoneOffer,offered=b.units[unitId];
   available=tacticPreview(b,offered,tacticId,targetId).valid;
   if(available){const who=unitName(offered);tempoOfferButton.textContent=w('查看'+who+'战法','Show tactics for '+who);}
  }
  tempoOfferButton.hidden=!available;
  tempoToggle.hidden=over;
  tempoToggle.classList.toggle('on',autoPause);
  tempoToggle.setAttribute('aria-pressed',String(autoPause));
  tempoBadge.textContent=autoPause?w('开','On'):w('关','Off');
 }

 ui.setKey((code,event)=>{
  if(child)return false;
  if(code==='Escape'&&aim){cancelAim();return true;}
  if(['INPUT','SELECT','BUTTON'].includes(event?.target?.tagName))return false;
  if(code==='Space'&&phase==='fight'){togglePause();return true;}
  if(code==='Enter'&&phase==='deploy'){begin();return true;}
  if(/^Digit[1-4]$/.test(code)&&b){const u=b.units.filter(u=>u.side===0)[+code.slice(5)-1];if(u){tapUnit(u.id);return true;}}
  return false;
 });
 configuration();
 ui.loop(dt=>{
  if(child)return;board?.tick(dt);
  if(!b||phase!=='fight'||paused)return;
  accumulator+=dt*speed;
  for(let steps=0;accumulator>=.1&&steps<10&&!b.over;steps++){
   accumulator-=.1;
   const cue=stepPractice();
   if(cue){announceMilestone(cue.reasons,cue.opportunity,true,cue.contactKind);render(true);return;}
  }
  if(b.over){finish();return;}
  refresh+=dt;if(refresh>=.2){refresh=0;render(true);}
 });
 return {destroy:ui.destroy,key:ui.key,inspect:()=>({kind:'sandbox',phase,paused,speed,selected,armed:aim?.tactic??null,aimTarget:aim?.target??null,
  autoPause,pauseReason,milestones:{...milestones},config:clone(config),visual:board?.inspect()??null,
  battle:b?{time:b.time,over:b.over,units:b.units.map(u=>({id:u.id,general:u.general,kind:u.kind,side:u.side,pos:u.pos,troops:u.troops,rage:u.rage,formation:u.formation,order:u.order,autoTactic:u.autoTactic})),events:clone(b.events)}:null,
  child:child?.inspect()??null,tape:tape?clone(tape):null})};
}
