import {UNITS,FORMATIONS,TERRAIN,formationAllowed,defaultFormation} from '../data/battle.mjs';
import {GENERALS} from '../data/generals.mjs';
import {TACTICS} from '../data/tactics.mjs';
import {command,stepBattle,useTactic,tacticPreview,combatPreview,deployBattleUnit,canDeployBattle,distance} from '../sim/battle.mjs';
import {createBattleRecorder} from '../sim/battle-history.mjs';
import {DEFAULT_SANDBOX,SANDBOX_MAPS,ENCOUNTERS,encounterConfig,createSandboxBattle} from '../sim/battle-sandbox.mjs';
import {nm,num,t,getLanguage} from '../i18n.mjs';
import {portrait} from '../view/portrait.mjs';
import {openNativeSandboxSetup} from './native-battle-sandbox-setup.mjs';
import {createNativeSandboxBattleView,labAction as act,labText as note,labImage as figure} from './native-sandbox-battle-view.mjs';
import {openNativeBattleReplay} from './native-battle-replay.mjs';
import {unitName,phaseName,stamp} from './native-replay-copy.mjs';
const w=(zh,en)=>getLanguage()==='en'?en:zh;
const sign=n=>(n>=0?'+':'')+Math.round(n*100)+'%';
const formationInfo=f=>w('攻','ATK ')+sign(f.atk)+' · '+w('守','DEF ')+sign(f.def)+' · '+w('速','SPD ')+sign(f.spd)+(f.front?' · '+w('正面','Front ')+sign(f.front):'')+(f.flank?' · '+w('夹击','Flank ')+sign(f.flank):'');
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

/** Native sandbox. The existing simulation and recorder remain owned here. */
export function createNativeBattlePlayground(app,{onExit,openReplay=(tape,opts)=>openNativeBattleReplay(app.uiHost,tape,{playerSide:0,...opts}),createPresentation=createNativeSandboxBattleView,createSetup=openNativeSandboxSetup,onError=console.error}={}){
 let config=clone(DEFAULT_SANDBOX),b=null,record=null,phase='config',paused=true,speed=1,selected=0;
 let aim=null,hoverTarget=null,sceneView=null,setupView=null,child=null,tape=null,notice='',forecastOpen=false,closed=false;
 let accumulator=0,refresh=0,lastImpact=-Infinity;
 let milestones=createTempoMilestones(),autoPause=true,pauseReason=null,milestoneOffer=null,focusOffer=null;
 const orders=new Map();const notify=text=>{notice=text;};
 function destroy(){if(closed)return;closed=true;child?.destroy();setupView?.destroy();sceneView?.destroy();child=setupView=sceneView=null;}
 function exit(){destroy();onExit?.();}
 function configuration(){sceneView?.destroy();sceneView=null;setupView?.destroy();b=null;phase='config';aim=null;setupView=createSetup(app.uiHost,{initial:config,onStart:next=>{config=next;create()},onExit:exit,onError});}
 function create(){
  try{b=createSandboxBattle(config);}catch(e){notify(w('配置无效：','Invalid setup: ')+e.message);onError(e);return;}
  setupView?.destroy();setupView=null;sceneView?.destroy();record=createBattleRecorder(b);phase='deploy';paused=true;selected=0;aim=null;hoverTarget=null;tape=null;
  accumulator=0;refresh=0;lastImpact=-Infinity;
  milestones=createTempoMilestones(b);autoPause=true;pauseReason=null;milestoneOffer=null;focusOffer=null;orders.clear();forecastOpen=false;
  for(const u of b.units)if(u.side===0){command(b,u.id,'autoTactic',false);record.action('autoTactic',{unit:u.id,arg:false});}
  record.capture(phase,{force:true});sceneView=createPresentation(app.uiHost,{onHex:tapHex,onUnit:tapUnit,onHover:id=>{if(aim&&hoverTarget!==id){hoverTarget=id;render(false)}},onExit:exit,onError});
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
  if(!b)return;clearAim(false);tape=record.finish();paused=true;sceneView?.hide();
  child=openReplay(tape,{tab:phase==='result'?'report':'replay',onExit:()=>{child=null;sceneView?.show();sceneView?.focus('replay');render(true);}});render(true);
 }
 function feedback(event){
  if(event.kind==='impact'){
   const now=performance.now();if(now-lastImpact<350)return;lastImpact=now;app.sound?.play('clash',{volume:.38});
  }else if(event.kind==='tactic')app.sound?.play(event.tacticKind==='burn'?'fire':event.tacticKind==='heal'?'heal':HELP.includes(event.tacticKind)?'rally':'tactic');
 }

 function render(force=false){
  if(!b||phase==='config'||!sceneView)return;
  const {tactic:armed,target:aimTarget}=aim??{},u=b.units[selected],preview=armed?tacticPreview(b,u,armed,b.units[aimTarget??hoverTarget]):null,reach=preview?.reach??UNITS[u.kind].range;
  sceneView.setTiles(b.tiles);sceneView.draw(b.units,{selected,time:b.time,naval:b.setup.kind==='naval',events:b.events,calm:app.calm?.(),nameOf:unitName,onFeedback:feedback,armed,target:aimTarget,area:preview?.hexes,areaValid:preview?.valid,valid:phase==='deploy'?at=>canDeployBattle(b,u,at):null,range:phase==='fight'?at=>!u.gone&&distance(u.pos,at)<=reach:null,fire:Object.keys(b.fire).map(Number),gate:b.gate?.at??null,keep:b.keep,depot:b.depot?.at??null});
  if(!force)return;const controls=[phase==='deploy'?act('battle-toggle',w('鸣鼓开战','Begin battle'),begin,{active:true}):phase==='fight'?act('battle-toggle',paused?w('继续战斗','Resume battle'):w('暂停战斗','Pause battle'),togglePause):null,
   phase!=='result'?act('step',w('步进 1 秒','Step 1 second'),()=>{paused=true;record.action('step',{seconds:1});advance(1);}):null,
   ...[1,2,4].map(v=>act('speed-'+v,v+'×',()=>{speed=v;record.action('speed',{speed:v});render(true);},{active:speed===v})),act('replay',w('战报 / 回放','Report / replay'),playback),phase==='result'?act('rematch',w('再战此局','Play again'),create,{active:true}):null,act('encounters',w('换一场演武','Choose encounter'),()=>{child?.destroy();child=null;configuration();}),act('exit',w('返回','Return'),exit)].filter(Boolean);
  const over=phase==='result',encounter=ENCOUNTERS[config.encounter],goal=encounter?w(...encounter.objective):b.setup.kind==='siege'?w('攻破城门、占营10秒，或击退守军','Breach and hold the keep for 10s, or break the garrison'):w('日落前击退红军','Break the red army before sunset');
  const objective=over?(b.over.winner?w('红军获胜','RED VICTORY'):w('蓝军获胜','BLUE VICTORY')):w('目标 · ','OBJECTIVE · ')+goal,situation=over?battleOutcomeReason(b.over,0,getLanguage()):b.gate?w('城门 ','Gate ')+Math.max(0,Math.round(b.gate.hp))+' · '+w('占营 ','Keep ')+b.keepHeld.toFixed(1)+'/10s':'';
  const rows=[];if(!over){rows.push(act('tempo-pause',w('关键时刻暂停','Pause at milestones')+' · '+(autoPause?w('开','On'):w('关','Off')),()=>{autoPause=!autoPause;notify(autoPause?w('关键时刻暂停已开启。','Milestone pauses enabled.'):w('关键时刻暂停已关闭。','Milestone pauses disabled.'));render(true);},{active:autoPause}));if(paused&&milestoneOffer&&!aim){const {unitId,tacticId,targetId}=milestoneOffer,offered=b.units[unitId];if(tacticPreview(b,offered,tacticId,targetId).valid)rows.push(act('tempo-opportunity',w('查看'+unitName(offered)+'战法','Show tactics for '+unitName(offered)),()=>{milestoneOffer=null;focusOffer=tacticId;tapUnit(unitId);},{active:true}));}}
  rows.push(act('board-overview',w('全览战场','Overview'),()=>sceneView.board?.overview()),act('board-zoom-in',w('放大战场','Zoom in'),()=>{const board=sceneView.board;if(board)board.setZoom(board.zoom*1.25)}),act('board-zoom-out',w('缩小战场','Zoom out'),()=>{const board=sceneView.board;if(board)board.setZoom(board.zoom/1.25)}),act('board-locate',w('定位部队','Locate unit'),()=>sceneView.board?.focusSelected(selected)));
  rows.push(note('board-legend',w('青格可部署 · 金格为射程 · 虚线为实际行军路线 · 红线为追击目标。1–4选军，空格暂停。','Cyan: deployment · Gold: range · Dashed line: actual path · Red: selected target. 1–4 select units, Space pauses.'),{lines:4}));
  const active=u&&!u.gone&&!u.routed,foes=b.units.filter(o=>o.side!==0&&!o.gone),targets=phase==='fight'&&active?foes.filter(o=>!o.routed&&o.pos>=0).map(enemy=>({enemy,range:distance(u.pos,enemy.pos)})).filter(({enemy})=>!aim||tacticPreview(b,u,aim.tactic,enemy).valid).sort((a,b)=>a.range-b.range||a.enemy.id-b.enemy.id).slice(0,2):[];
  rows.push(...targets.map(({enemy,range})=>act('quick-target-'+enemy.id,unitName(enemy)+' · '+w(range+'格',range+' hexes'),()=>tapUnit(enemy.id),{accessible:(aim?w('预览','Preview '):w('追击','Pursue '))+unitName(enemy)+' · '+range,active:(aim?aim.target:u?.order==='attack'?u.target?.id:null)===enemy.id})));
  rows.push(...b.units.filter(o=>o.side===0).map((o,i)=>act('unit-'+o.id,String(i+1)+' · '+unitName(o)+' · '+num(o.troops),()=>tapUnit(o.id),{active:selected===o.id})));
  if(u){if(u.general)rows.push(figure('selected-portrait',portrait(u.general,48),unitName(u)));rows.push(note('selected-info',unitName(u)+' · '+nm(UNITS[u.kind])+' · '+num(u.troops)+' / '+num(u.start)+' · '+w('士气 ','Morale ')+Math.round(Math.max(0,u.morale))+' · '+w('怒气 ','Rage ')+Math.floor(u.rage)+'/100',{lines:4}));const latest=orders.get(u.id);if(latest)rows.push(note('order-feedback',orderPhase(latest.state)+' · '+latest.detail,{lines:4,tone:latest.state==='failed'?'bad':'good'}));
   const setOrder=(label,what,arg,on)=>act('order-'+what,label,()=>issue(what,arg),{active:on}),automation=active&&!over?setOrder(w('自动施策：','Auto tactics: ')+(u.autoTactic?w('开','on'):w('关','off')),'autoTactic',!u.autoTactic,u.autoTactic):null;
   if(phase==='deploy'){rows.push(...Object.values(FORMATIONS).filter(f=>formationAllowed(u.kind,f.id)).map(f=>act('formation-'+f.id,nm(f),()=>issue('formation',f.id),{active:u.formation===f.id,detail:formationInfo(f),lines:2})),automation);}
   else if(!latest)rows.push(note('current-order',orderName(u.order)+(u.target?' → '+unitName(u.target):''),{lines:2}));
   if(phase==='fight'&&active){rows.push(setOrder(w('坚守','Hold'),'hold',null,u.order==='hold'),setOrder(w('自动接敌','Auto engage'),'auto',null,u.order==='auto'),automation,...u.tactics.map(id=>{const tc=TACTICS[id],ready=u.rage>=100&&!(u.status.stun>0),spec=tacticPresentation(tc,tacticPreview(b,u,id).reach,{language:getLanguage()}),why=ready?null:u.status.stun>0?w('定身中','Stunned'):w('怒气满100后可施展','Requires 100 rage');return act('tactic-'+id,nm(tc),()=>arm(id),{disabled:!ready,active:armed===id,detail:[spec.detail,why].filter(Boolean).join(' · '),lines:4});}));
    if(armed)rows.push(note('aim-summary',nm(TACTICS[armed])+' · '+tacticPresentation(TACTICS[armed],preview.reach,{language:getLanguage()}).detail+' · '+(aimTarget==null?w('选择下方目标，或点战场上的敌军。','Choose a target below, or on the battlefield.'):unitName(b.units[aimTarget])+' · '+w('覆盖 ','Covers ')+preview.targets.length+w(' 部敌军',' enemy units')),{lines:5}),act('confirm-tactic',w('确认施策','Confirm tactic'),()=>cast(armed,aimTarget),{active:true,disabled:!preview.valid,detail:preview.valid?undefined:tacticWhy(preview.reason)}),act('cancel-tactic',w('取消施策','Cancel tactic'),cancelAim));
    rows.push(...foes.map(o=>{const p=armed?tacticPreview(b,u,armed,o):null;return act('target-'+o.id,unitName(o)+' · '+num(o.troops)+' · '+w('距离 ','Range ')+distance(u.pos,o.pos),()=>tapUnit(o.id),{active:aimTarget===o.id,disabled:p&&!p.valid,detail:p&&!p.valid?tacticWhy(p.reason):undefined});}));
   }
   rows.push(act('forecast-toggle',forecastOpen?w('收起阵型与对阵预估','Hide formation & matchup forecast'):w('阵型与对阵预估','Formation & matchup forecast'),()=>{forecastOpen=!forecastOpen;render(true);}),...(forecastOpen?[note('formation-forecast',nm(FORMATIONS[u.formation])+' · '+formationInfo(FORMATIONS[u.formation]),{lines:3}),note('forecast-limit',w('以下为当前状态下的一次普通命中，不含暴击；须在射程内才能命中。','One ordinary hit at current strength/terrain, before criticals. Attacks require range.'),{lines:3}),...foes.map(o=>{const p=combatPreview(b,u,o);return note('matchup-'+o.id,unitName(o)+' · '+p.weaponMultiplier.toFixed(2)+'× · '+p.minLoss+'–'+p.maxLoss+'\n'+p.tags.map(tag=>w(...(tagNames[tag]??[tag,tag]))).join(' / '),{lines:3})})]:[]));
  }
  sceneView.render({title:encounter?w('演武 · ','Practice · ')+nm(encounter):w('自由演武','Custom battle'),clock:phaseName(phase)+' · '+stamp(b.time)+' / '+stamp(b.limit)+(paused?' ❚❚':' ▶')+' · '+speed+'×',objective,situation,controls,rows:rows.filter(Boolean),notice});if(focusOffer){sceneView.focus('tactic-'+focusOffer);focusOffer=null;}
 }
 function key(code){
  if(child)return child.key?.(code)??false;
  if(code==='Escape'&&aim){cancelAim();return true;}
  if((code==='Space'||code==='Enter')&&sceneView?.focused)return false;
  if(code==='Space'&&phase==='fight'){togglePause();return true;}
  if(code==='Enter'&&phase==='deploy'){begin();return true;}
  if(/^Digit[1-4]$/.test(code)&&b){const u=b.units.filter(u=>u.side===0)[+code.slice(5)-1];if(u){tapUnit(u.id);return true;}}
  return false;
 }
 configuration();
 function update(dt){
  if(closed)return;if(child){child.update?.(dt);return;}sceneView?.tick(dt);
  if(!b||phase!=='fight'||paused)return;
  accumulator+=dt*speed;
  for(let steps=0;accumulator>=.1&&steps<10&&!b.over;steps++){
   accumulator-=.1;
   const cue=stepPractice();
   if(cue){announceMilestone(cue.reasons,cue.opportunity,true,cue.contactKind);render(true);return;}
  }
  if(b.over){finish();return;}
  refresh+=dt;if(refresh>=.2){refresh=0;render(true);}
 }
 return {destroy,key,update,get nativeView(){return child?.nativeView??sceneView?.nativeView??setupView?.nativeView},get nativePresentation(){return sceneView?.presentation?.()??[]},inspect:()=>({kind:'sandbox',phase,paused,speed,selected,armed:aim?.tactic??null,aimTarget:aim?.target??null,
  autoPause,pauseReason,milestones:{...milestones},config:clone(config),visual:sceneView?.inspect()??null,
  battle:b?{time:b.time,over:b.over,units:b.units.map(u=>({id:u.id,general:u.general,kind:u.kind,side:u.side,pos:u.pos,troops:u.troops,rage:u.rage,formation:u.formation,order:u.order,autoTactic:u.autoTactic})),events:clone(b.events)}:null,
  child:child?.inspect()??null,tape:tape?clone(tape):null})};
}
