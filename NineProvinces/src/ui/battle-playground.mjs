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

const clone=v=>JSON.parse(JSON.stringify(v));
const HELP=['atk','def','spd','heal','rally','rage'];
const OFFICERS=['guanyu','huangzhong','zhangfei','xiahoudun','xiahouyuan','zhangliao','caoren','lidian','zhouyu','huanggai','caocao'];
const orderName=id=>w({auto:'自动接敌',move:'向指定格移动',attack:'追击目标',hold:'坚守阵地'}[id]??id,{auto:'Engage automatically',move:'Moving to hex',attack:'Pursuing target',hold:'Holding position'}[id]??id);
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
 let armed=null,aimTarget=null,hoverTarget=null,resumeAfterAim=false;
 let board=null,toolbar=null,panel=null,clock=null,situation=null,child=null,tape=null;
 let accumulator=0,refresh=0,lastImpact=-Infinity,readyNotice=0;
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
  board?.destroy();board=null;b=null;phase='config';armed=null;
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
  board?.destroy();record=createBattleRecorder(b);phase='deploy';paused=true;selected=0;armed=null;aimTarget=null;hoverTarget=null;tape=null;accumulator=0;readyNotice=0;
  if(config.encounter)for(const u of b.units)if(u.side===0){command(b,u.id,'autoTactic',false);record.action('autoTactic',{unit:u.id,arg:false});}
  record.capture(phase,{force:true});ui.host.dataset.labPhase=phase;
  ui.heading.textContent=ENCOUNTERS[config.encounter]?w('演武 · ','Practice · ')+nm(ENCOUNTERS[config.encounter]):w('自由演武','Custom battle');
  clear(ui.body);toolbar=h('div.labBattleTools');clock=h('output.labClock');situation=h('div.labSituation');
  const layout=h('div.labBattleLayout'),field=h('div.labFieldArea');panel=h('aside.labUnitPanel',{'aria-label':w('部队指挥','Unit commands')});layout.append(field,panel);
  ui.body.append(toolbar,clock,situation,layout);
  board=createBattleBoard(field,b.tiles,tapHex,tapUnit,{onHover:id=>{if(armed&&hoverTarget!==id){hoverTarget=id;render(false);}}});
  field.append(h('p.labBoardLegend',w('青格可部署 · 金格为射程 · 虚线为实际行军路线 · 红线为追击目标。1–4选军，空格暂停。','Cyan: deployment · Gold: range · Dashed line: actual path · Red: attack target. 1–4 select units, Space pauses.')));
  notify(w('点选蓝军，再点青格布阵。也可以调整阵型；准备好后鸣鼓开战。','Select blue, then a cyan hex to deploy. Adjust formations, then begin.'));render(true);
 }

 function issue(what,arg){
  if(!b||phase==='result')return;
  const u=b.units[selected];
  if(!u||u.side!==0||!command(b,u.id,what,arg)){notify(w('这条军令当前不可执行','This order cannot be issued now'));return;}
  record.action(what,{unit:u.id,arg:arg??null});record.capture(phase,{force:true});armed=null;aimTarget=null;
  notify(unitName(u)+' · '+(what==='formation'?nm(FORMATIONS[arg]):what==='autoTactic'?w('自动战法','Auto tactics')+' '+(arg?w('开启','on'):w('关闭','off')):orderName(what)));
  render(true);
 }
 function clearAim(resume){
  if(!armed)return;record.action('cancelAim',{unit:selected});armed=null;aimTarget=null;hoverTarget=null;
  if(resume&&resumeAfterAim)paused=false;resumeAfterAim=false;
 }
 function cancelAim(){clearAim(true);notify(w('已取消施策','Tactic cancelled'));render(true);}
 function togglePause(){
  const next=!paused;clearAim(false);paused=next;record.action(paused?'pause':'resume');render(true);
 }
 function tapUnit(id){
  const u=b?.units[id];if(!u)return;
  if(armed&&u.side!==0){aimTarget=id;record.action('aim',{unit:selected,tactic:armed,target:id});notify(w('已选目标，查看覆盖范围后确认施策。','Target selected. Review the area, then confirm the tactic.'));render(true);return;}
  if(u.side===0){if(armed)cancelAim();selected=id;record.action('select',{unit:id});render(true);}
  else if(phase==='fight')issue('attack',id);
 }
 function tapHex(at){
  if(!b)return;const there=b.units.find(u=>!u.gone&&u.pos===at);if(there)return tapUnit(there.id);
  if(armed){notify(w('请选择敌军目标，或取消施策。','Choose an enemy target, or cancel.'));return;}
  if(phase==='deploy'){
   if(deployBattleUnit(b,selected,at)){record.action('deploy',{unit:selected,hex:at});record.capture(phase,{force:true});notify(w('布阵完成','Deployment updated'));}
   else notify(w('只能在己方可用的青色空格部署','Deploy on a free cyan hex in your own area'));
   render(true);
  }else if(phase==='fight')issue('move',at);
 }
 function arm(id){
  if(HELP.includes(TACTICS[id].kind)){cast(id,null);return;}
  if(!armed)resumeAfterAim=!paused;
  paused=true;armed=id;aimTarget=null;hoverTarget=null;
  record.action('aim',{unit:selected,tactic:id,target:null});notify(w('已暂缓战斗。选择敌军，预览范围，再确认施策。','Battle held. Choose an enemy, inspect the area, then confirm.'));render(true);
 }
 function cast(id,target){
  const u=b.units[selected];
  if(!useTactic(b,u,id,target==null?null:b.units[target])){notify(w('怒气不足，或目标不在战法范围内','Insufficient rage, or target outside tactic range'));render(true);return;}
  record.action('tactic',{unit:u.id,tactic:id,target});record.capture(phase,{force:true});armed=null;aimTarget=null;hoverTarget=null;
  if(resumeAfterAim)paused=false;resumeAfterAim=false;notify(nm(TACTICS[id])+w(' 已施展',' used'));render(true);
 }
 function begin(){phase='fight';paused=false;record.action('begin');record.capture(phase,{force:true});app.sound?.play('horn');notify(w('接敌后留意怒气，点亮的战法可以手动施展。','Watch rage as the armies meet; lit tactics can be used manually.'));render(true);}
 function finish(){
  phase='result';paused=true;armed=null;record.action('result',{...b.over});record.capture(phase,{force:true});tape=record.finish();
  app.sound?.play(b.over.winner?'lose':'win');notify((b.over.winner?w('红军获胜','Red army wins'):w('蓝军获胜','Blue army wins'))+' · '+t('why_'+b.over.why));render(true);
 }
 function advance(seconds){
  clearAim(false);
  if(phase==='deploy'){phase='fight';record.action('begin');record.capture(phase,{force:true});}
  if(phase!=='fight')return;
  for(let i=0;i<Math.round(seconds/.1)&&!b.over;i++){stepBattle(b,.1,0);record.capture(phase);}
  if(b.over)finish();else{notify(w('已单步推进。战斗保持暂停，可以继续下令。','Advanced one step. The battle is paused and ready for orders.'));render(true);}
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
  const forecastOpen=panel.querySelector('.labForecast')?.open??false,scrollTop=panel.scrollTop;
  clear(panel).append(h('div.labRoster',b.units.filter(o=>o.side===0).map((o,i)=>{
   const x=button(h('span',h('b',String(i+1)),unitName(o),h('small',num(o.troops))),()=>{if(armed)cancelAim();selected=o.id;record.action('select',{unit:o.id});render(true);},{kind:selected===o.id?'on':''});
   x.dataset.lab='unit-'+o.id;return x;
  })));
  if(!u)return;
  const likeness=u.general?h('img',{src:portrait(u.general,48),alt:'',width:38,height:48}):h('span.labUnitSigil',nm(UNITS[u.kind]).slice(0,1));
  panel.append(h('div.labSelectedUnit',likeness,
   h('div',h('h4',unitName(u)+' · '+nm(UNITS[u.kind])),h('p',num(u.troops)+' / '+num(u.start)+' · '+w('士气 ','Morale ')+Math.round(Math.max(0,u.morale)))),
   h('strong'+(u.rage>=100?'.ready':''),w('怒气 ','Rage ')+Math.floor(u.rage)+'/100')
  ));
  if(phase==='deploy'){
   panel.append(selectField(w('阵型','Formation'),Object.values(FORMATIONS).filter(f=>formationAllowed(u.kind,f.id)).map(f=>[f.id,nm(f)]),u.formation,value=>issue('formation',value)),h('p.labFormation',formationInfo(FORMATIONS[u.formation])));
  }else panel.append(h('p.labCurrentOrder',orderName(u.order)+(u.target?' → '+unitName(u.target):'')));
  if(phase==='fight'&&active){
   const setOrder=(text,what,arg,on)=>{const x=button(text,()=>issue(what,arg),{kind:on?'on':''});x.dataset.lab='order-'+what;return x;};
   panel.append(h('div.labOrders',setOrder(w('坚守','Hold'),'hold',null,u.order==='hold'),setOrder(w('自动指挥','Auto orders'),'auto',null,u.order==='auto'),setOrder(w('自动战法：','Auto tactics: ')+(u.autoTactic?w('开','on'):w('关','off')),'autoTactic',!u.autoTactic,u.autoTactic)));
   panel.append(h('div.labTactics',u.tactics.map(id=>{
    const tc=TACTICS[id],ready=u.rage>=100&&!(u.status.stun>0),x=button(h('span',nm(tc),h('small',HELP.includes(tc.kind)?w('支援','Support'):w('选择目标','Aim'))),()=>arm(id),{why:ready?null:u.status.stun>0?w('定身中','Stunned'):w('怒气满100后可施展','Requires 100 rage'),kind:armed===id?'on':''});x.dataset.lab='tactic-'+id;return x;
   })));
   if(armed){
    const preview=tacticPreview(b,u,armed,aimTarget==null?null:b.units[aimTarget]);
    const confirm=button(w('确认施策','Confirm tactic'),()=>cast(armed,aimTarget),{kind:'main',why:preview.valid?null:preview.reason==='range'?w('目标超出战法范围','Outside tactic range'):w('先选择敌军目标','Choose a target first')});confirm.dataset.lab='confirm-tactic';
    panel.append(h('div.labAimConfirm',h('strong',nm(TACTICS[armed])),h('p',aimTarget==null?w('选择下方目标，或点战场上的敌军。','Choose a target below, or on the battlefield.'):unitName(b.units[aimTarget])+' · '+w('覆盖 ','Covers ')+preview.targets.length+w(' 部敌军',' enemy units')),confirm,button(w('取消施策','Cancel tactic'),cancelAim)));
   }
   panel.append(h('div.labEnemyTargets',h('small',armed?w('施策目标','TACTIC TARGETS'):w('进攻目标','ATTACK TARGETS')),foes.map(o=>{
    const preview=armed?tacticPreview(b,u,armed,o):null,inRange=preview?.reason!=='range';
    const x=button(h('span',unitName(o),h('small',num(o.troops)+' · '+w('距离 ','Range ')+distance(u.pos,o.pos))),()=>tapUnit(o.id),{kind:aimTarget===o.id?'on':'',why:armed&&!inRange?w('超出战法范围','Outside tactic range'):null});x.dataset.lab='target-'+o.id;return x;
   })));
  }
  panel.append(h('details.labForecast',h('summary',w('阵型与对阵预估','Formation & matchup forecast')),h('p',nm(FORMATIONS[u.formation])+' · '+formationInfo(FORMATIONS[u.formation])),h('p.labReportNote',w('以下为当前状态下的一次普通命中，不含暴击；须在射程内才能命中。','One ordinary hit at current strength/terrain, before criticals. Attacks require range.')),foes.map(o=>{const p=combatPreview(b,u,o);return h('p.labMatchup',unitName(o)+' · '+p.weaponMultiplier.toFixed(2)+'× · '+p.minLoss+'–'+p.maxLoss+'\n'+p.tags.map(tag=>w(...(tagNames[tag]??[tag,tag]))).join(' / '));})));
  panel.querySelector('.labForecast').open=forecastOpen;panel.scrollTop=scrollTop;
 }

 function render(force=false){
  if(!b||phase==='config')return;
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
  clear(toolbar).append(...[
   phase==='deploy'?button(w('鸣鼓开战','Begin battle'),begin,{kind:'main'}):phase==='fight'?button(paused?w('继续战斗','Resume battle'):w('暂停战斗','Pause battle'),togglePause):null,
   phase!=='result'?button(w('步进 1 秒','Step 1 second'),()=>{paused=true;record.action('step',{seconds:1});advance(1);}):null,
   ...[1,2,4].map(v=>button(v+'×',()=>{speed=v;record.action('speed',{speed:v});render(true);},{kind:speed===v?'on':''})),
   button(w('战报 / 回放','Report / replay'),playback),phase==='result'?button(w('再战此局','Play again'),create,{kind:'main'}):null,
   button(w('换一场演武','Choose encounter'),()=>{child?.destroy();child=null;configuration();})
  ].filter(Boolean));
  const encounter=ENCOUNTERS[config.encounter],goal=encounter?w(...encounter.objective):b.setup.kind==='siege'?w('攻破城门、占营10秒，或击退守军','Breach and hold the keep for 10s, or break the garrison'):w('击退红军；日落前结束战斗','Break the red army before sunset');
  const ready=b.units.filter(u=>u.side===0&&!u.gone&&!u.routed&&u.rage>=100).length;
  clear(situation).append(h('strong',phase==='result'?(b.over.winner?w('红军获胜','RED VICTORY'):w('蓝军获胜','BLUE VICTORY')):w('目标 · ','OBJECTIVE · ')+goal),
   h('span',phase==='result'?t('why_'+b.over.why):b.gate?w('城门 ','Gate ')+Math.max(0,Math.round(b.gate.hp))+' · '+w('占营 ','Keep ')+b.keepHeld.toFixed(1)+'/10s':ready?w(ready+' 部战法已就绪',ready+' tactics ready'):w('前军接敌，后军支援','Screen the front; support from behind')));
  if(ready>readyNotice&&phase==='fight'&&!armed)notify(w('战法已就绪：点选亮起的战法，再选择目标。','A tactic is ready: choose the lit tactic, then a target.'));readyNotice=ready;
  renderPanel();
  if(focused)ui.host.querySelector(`[data-lab="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
 }

 ui.setKey((code,event)=>{
  if(child)return false;
  if(code==='Escape'&&armed){cancelAim();return true;}
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
  for(let steps=0;accumulator>=.1&&steps<10&&!b.over;steps++){stepBattle(b,.1,0);record.capture(phase);accumulator-=.1;}
  if(b.over){finish();return;}
  refresh+=dt;if(refresh>=.2){refresh=0;render(true);}
 });
 return {destroy:ui.destroy,key:ui.key,inspect:()=>({kind:'sandbox',phase,paused,speed,selected,armed,aimTarget,config:clone(config),visual:board?.inspect()??null,
  battle:b?{time:b.time,over:b.over,units:b.units.map(u=>({id:u.id,general:u.general,kind:u.kind,side:u.side,pos:u.pos,troops:u.troops,rage:u.rage,formation:u.formation,order:u.order,autoTactic:u.autoTactic})),events:clone(b.events)}:null,
  child:child?.inspect()??null,tape:tape?clone(tape):null})};
}
