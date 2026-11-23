// The tactical laboratory/replay is a UI over actual battle states; it never owns a realm save.
import { UNITS, FORMATIONS, TERRAIN, formationAllowed, defaultFormation } from '../data/battle.mjs';
import { TACTICS } from '../data/tactics.mjs';
import { createBattle, stepBattle, command, useTactic, combatPreview, deployBattleUnit, canDeployBattle, distance, idx, FIELD, outcome } from '../sim/battle.mjs';
import { createBattleRecorder, replayFrameAt } from '../sim/battle-history.mjs';
import { createSandboxSetup, SANDBOX_MAPS, DEFAULT_SANDBOX } from '../sim/battle-sandbox.mjs';
import { getLanguage, nm, num, t } from '../i18n.mjs';
import { generalName } from '../view/names.mjs';
import { h, button, clear } from './dom.mjs';

const w=(zh,en)=>getLanguage()==='en'?en:zh;
const clone=v=>JSON.parse(JSON.stringify(v));
const unitName=u=>u.general?generalName(u.general):nm(UNITS[u.kind??u.unit]);
const phaseName=p=>w({deploy:'部署',fight:'交战',result:'结算'}[p]??p,{deploy:'Deployment',fight:'Combat',result:'Result'}[p]??p);
const sign=n=>(n>=0?'+':'')+Math.round(n*100)+'%';
const formationInfo=f=>w('攻','ATK ')+sign(f.atk)+' · '+w('守','DEF ')+sign(f.def)+' · '+w('速','SPD ')+sign(f.spd)+(f.front?' · '+w('正面','Front ')+sign(f.front):'')+(f.flank?' · '+w('夹击','Flank ')+sign(f.flank):'');
const stamp=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const HELP=['atk','def','spd','heal','rally','rage'];
const tagNames={counter:['克制','Counter'],countered:['被克制','Countered'],shield:['盾防箭矢','Shield vs arrows'],brace:['枪阵拒骑','Spears brace horse'],height:['高地','High ground'],flank:['夹击','Flank'],charge:['冲锋','Charge'],cavalryTerrain:['骑兵地形修正','Cavalry terrain']};
const SVG='http://www.w3.org/2000/svg';
function svg(tag,attrs={},text){const e=document.createElementNS(SVG,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!=null)e.textContent=text;return e;}
const xy=at=>({x:25+(at%FIELD.cols)*33+(Math.floor(at/FIELD.cols)%2)*16.5,y:25+Math.floor(at/FIELD.cols)*28.58});
const poly=(x,y)=>Array.from({length:6},(_,i)=>{const a=(i*60-30)*Math.PI/180;return (x+19.05*Math.cos(a)).toFixed(2)+','+(y+19.05*Math.sin(a)).toFixed(2);}).join(' ');

function shell(title,onExit){
 const previous=document.activeElement;
 const host=h('section.battleLab',{'role':'dialog','aria-modal':'true','aria-label':title});
 const heading=h('h2',title),body=h('div.labBody'),notice=h('p.labNotice',{'role':'status','aria-live':'polite'});
 let gone=false,frame=0,runKey=()=>false;
 const close=()=>{if(gone)return;destroy();onExit?.();};
 const closeButton=button(w('返回','Return'),close);closeButton.dataset.lab='exit';
 host.append(h('header.labHeader',h('div',h('small',w('九州烽烟 · 兵法卷','NINE PROVINCES · TACTICS')),heading),closeButton),body,notice);
 document.body.append(host);closeButton.focus({preventScroll:true});
 function key(e){if(!host.isConnected||[...document.querySelectorAll('.battleLab')].at(-1)!==host)return;if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}if(runKey(e.code,e)){e.preventDefault();e.stopImmediatePropagation();}}
 const stop=e=>e.stopPropagation();
 window.addEventListener('keydown',key,true);host.addEventListener('wheel',stop,{passive:true});host.addEventListener('pointerdown',stop);
 function loop(fn){let last=performance.now();function tick(now){if(gone)return;const dt=Math.min(.1,(now-last)/1000);last=now;fn(dt);frame=requestAnimationFrame(tick);}frame=requestAnimationFrame(tick);}
 function destroy(){if(gone)return;gone=true;cancelAnimationFrame(frame);window.removeEventListener('keydown',key,true);host.remove();previous?.focus?.({preventScroll:true});}
 return {host,body,heading,notice,close,destroy,loop,key:code=>runKey(code),setKey:fn=>{runKey=fn;},get gone(){return gone;}};
}

/** Retained SVG nodes make this a small tactical diagram, not another continuously rasterized game canvas. */
function makeBoard(parent,tiles,onHex,onUnit){
 const area=h('div.labBoardScroll'),root=svg('svg',{viewBox:'0 0 768 425',class:'labBoard',role:'img','aria-label':w('真实六角战场；选部队后点格子下令','Actual hex battlefield; select a unit then choose a hex to issue orders')});
 const ground=svg('g'),markers=svg('g'),figures=svg('g'),cells=[];
 for(let at=0;at<tiles.length;at++){const p=xy(at),cell=svg('polygon',{points:poly(p.x,p.y),'data-hex':at});const title=svg('title',{},nm(TERRAIN[tiles[at]])+' · '+(at%FIELD.cols+1)+','+(Math.floor(at/FIELD.cols)+1));cell.append(title);cell.addEventListener('click',()=>onHex?.(at));ground.append(cell);cells.push(cell);}
 root.append(ground,markers,figures);area.append(root);parent.append(area);
 const unitNodes=new Map();
 function draw(units,{selected=null,valid=null,range=null,fire=[],gate=null,keep=null,depot=null}={}){
  const hot=new Set(fire);
  for(let i=0;i<cells.length;i++){const c=cells[i],terrain=TERRAIN[tiles[i]];c.setAttribute('fill','#'+terrain.colour.toString(16).padStart(6,'0'));c.setAttribute('class',(valid?.(i)?'deployable ':'')+(range?.(i)?'inRange ':'')+(hot.has(i)?'burning':''));}
  markers.replaceChildren();for(const[at,text]of[[gate,w('门','G')],[keep,w('营','K')],[depot,w('粮','D')]])if(at!=null){const p=xy(at);markers.append(svg('text',{x:p.x,y:p.y+4,class:'labObjective'},text));}
  for(const u of units){let g=unitNodes.get(u.id);if(!g){g=svg('g',{class:'labUnit',role:'button',tabindex:'0','data-unit':u.id});const icon=svg('path'),label=svg('text',{y:2}),count=svg('text',{y:15,class:'labTroops'}),bg=svg('rect',{x:-15,y:19,width:30,height:3,class:'labBarBg'}),hp=svg('rect',{x:-15,y:19,height:3,class:'labBarHp'});g.append(icon,label,count,bg,hp);g.addEventListener('click',e=>{e.stopPropagation();onUnit?.(u.id);});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();onUnit?.(u.id);}});unitNodes.set(u.id,g);figures.append(g);}
   const p=xy(u.pos),kind=UNITS[u.kind];g.setAttribute('transform',`translate(${p.x} ${p.y-3})`);g.setAttribute('class','labUnit '+(u.side?'red':'blue')+(selected===u.id?' selected':'')+(u.routed?' routed':''));g.style.display=u.gone||u.pos<0?'none':'';g.setAttribute('aria-label',unitName(u)+' · '+num(u.troops));
   g.children[0].setAttribute('d',kind.group==='cav'?'M0 -17 L16 9 L-16 9 Z':kind.range>1?'M0 -16 A15 15 0 1 1 -.1 -16 Z':'M0 -18 L17 0 L0 17 L-17 0 Z');g.children[1].textContent=nm(kind).slice(0,getLanguage()==='en'?3:1);g.children[2].textContent=num(u.troops);g.children[4].setAttribute('width',Math.max(0,30*u.troops/u.start));
  }
 }
 return {draw,root,setTiles:next=>{tiles=next;}};
}

function eventText(e,identities){
 const who=id=>{const u=identities.find(u=>u.id===id);return u?unitName(u):w('部队','Unit');};
 if(e.kind==='tactic'||e.kind==='tacticFailed')return who(e.unit)+' · '+nm(TACTICS[e.tactic])+(e.kind==='tacticFailed'?w('（被识破）',' (resisted)'):e.target!=null?' → '+who(e.target):'');
 if(e.kind==='rout')return who(e.unit)+w(' 溃退',' routed');
 if(e.kind==='gateOpen')return w('城门攻破','Gate breached');if(e.kind==='depotBurnt')return w('粮仓焚毁','Depot burned');
 const action={select:['选军','Select'],deploy:['部署','Deploy'],formation:['变阵','Formation'],move:['移动','Move'],attack:['进攻','Attack'],hold:['坚守','Hold'],auto:['自动指挥','Auto orders'],autoTactic:['自动战法','Auto tactics'],tactic:['战法','Tactic'],pause:['暂停','Pause'],resume:['继续','Resume'],begin:['开战','Begin'],entrust:['全军委任','Entrust'],speed:['倍速','Speed'],step:['步进','Step'],result:['结算','Result']};
 const label=action[e.kind]??[e.kind,e.kind];return w(...label)+(e.unit!=null?' · '+who(e.unit):'')+(e.kind==='formation'?' · '+nm(FORMATIONS[e.formation??e.arg]):e.kind==='attack'?' → '+who(e.arg):e.kind==='move'||e.kind==='deploy'?' · '+w('格','hex ')+(e.hex??e.arg):e.kind==='speed'?' · '+e.speed+'×':e.kind==='autoTactic'?' · '+(e.arg?w('开','on'):w('关','off')):'');
}

export function battleReportContent(report,identities=[]){
 if(!report)return h('p',w('没有可显示的战报','No battle report available'));
 const sides=h('div.labTotals',report.sides.map(side=>h('section',h('h3',side.side?w('红军','RED ARMY'):w('蓝军','BLUE ARMY')),h('strong',num(side.remaining)+' / '+num(side.start)),h('p',w('净减员 ','Net losses ')+num(side.losses)+' · '+w('治疗 ','Restored ')+num(side.healing)),h('p',w('克制命中 ','Counter hits ')+side.counterHits+' · '+w('夹击 ','Flanks ')+side.flankHits+' · '+w('战法 ','Tactics ')+side.tactics))));
 const headers=[w('部队 / 阵型','Unit / Formation'),w('起始 → 剩余','Start → Remain'),w('实际杀伤','Damage'),w('承伤 / 治疗','Taken / Healing'),w('克制 / 夹击 / 战法','Counter / Flank / Tactic')];
 const table=h('div.labTableScroll',h('table.labReportTable',h('thead',h('tr',headers.map(x=>h('th',{'scope':'col'},x)))),h('tbody',report.units.map(u=>h('tr',h('th',{'scope':'row'},unitName(u)+' · '+nm(FORMATIONS[u.formation])),h('td',num(u.start)+' → '+num(u.remaining)),h('td',num(Math.round(u.damage))),h('td',num(Math.round(u.taken))+' / '+num(Math.round(u.healing))),h('td',u.counterHits+' / '+u.flankHits+' / '+u.tactics))))));
 const chronology=[...(report.events??[]).map(e=>({...e,time:e.t,source:'event'})),...(report.actions??[]).filter(e=>e.kind!=='select').map(e=>({...e,source:'action'}))].sort((a,b)=>a.time-b.time);
 return h('div.labReport',h('p.labReportIntro',w('战斗时长 ','Duration ')+stamp(report.seconds)+' · '+(report.winner==null?w('尚未结束','In progress'):(report.winner?w('红军','Red army'):w('蓝军','Blue army'))+' · '+t('why_'+report.why))),sides,table,h('p.labReportNote',w('杀伤包含随后被救治的损伤，净减员只计算战前与战后兵力差。反击与战法均计入实际贡献。','Damage includes casualties later restored by healing. Net losses compare initial and final troops. Retaliation and tactics count toward actual contributions.')),h('h3',w('军令与战局纪要','Orders & battle chronology')),h('ol.labChronology',chronology.length?chronology.map(e=>h('li',h('time',stamp(e.time)),h('span',{'className':e.source==='action'?'playerOrder':''},(e.source==='action'?w('军令 · ','Order · '):'')+eventText(e,identities)))):h('li',w('尚无军令或关键战况','No orders or key events yet'))));
}

export function openBattleReplay(app,tape,{onExit,tab='report'}={}) {
 if(!tape?.frames?.length)throw new Error('Replay has no recorded frames');
 const ui=shell(w('战斗详报与回放','Battle report & replay'),onExit),tabs=h('nav.labTabs'),content=h('div.labReplayContent');ui.body.append(tabs,content);
 let cursor=0,playing=false,speed=1,board=null,clock=null,slider=null,orders=null,lastKey='';
 const total=tape.frames.at(-1).time;
 function change(next){tab=next;playing=false;clear(tabs).append(button(w('战斗详报','Detailed report'),()=>change('report'),{kind:tab==='report'?'main':''}),button(w('战场回放','Battle replay'),()=>change('replay'),{kind:tab==='replay'?'main':''}));clear(content);
  if(tab==='report'){content.append(battleReportContent(tape.report,tape.units));return;}
  const controls=h('div.labReplayControls');clock=h('output');slider=h('input',{type:'range',min:0,max:Math.max(.001,total),step:.001,value:cursor,'aria-label':w('回放时间','Replay time'),oninput:e=>{cursor=+e.target.value;playing=false;render(true);}});
  const toggle=button(w('播放 / 暂停','Play / pause'),()=>{playing=!playing;if(cursor>=total)cursor=0;render(true);});toggle.dataset.lab='play';
  controls.append(toggle,button(w('回到开场','Opening'),()=>{cursor=0;playing=false;render(true);}),...[1,2,4].map(v=>button(v+'×',()=>{speed=v;render(true);})),clock);content.append(controls,slider);board=makeBoard(content,tape.field.tiles);orders=h('div.labReplayOrders',{'aria-live':'polite'});content.append(orders,h('p.labReportNote',w('每秒记录真实战况，可拖动时间轴；蓝/红为双方，金圈为部队位置。此处不会推进或改写战役存档。','Actual battle snapshots, sampled about once per second; seek with the timeline. Blue/red identify the sides. Replays never advance or overwrite the campaign.')));lastKey='';render(true);
 }
 function render(force=false){if(tab!=='replay')return;const frame=replayFrameAt(tape,cursor),key=frame.time+':'+frame.phase+':'+playing+':'+speed;if(!force&&lastKey===key)return;lastKey=key;const units=frame.units.map(u=>({...tape.units[u.id],...u})),tiles=tape.field.tiles.slice();for(const[at,tile]of frame.terrain??[])tiles[at]=tile;board.setTiles(tiles);board.draw(units,{fire:frame.fire,gate:tape.field.gate,keep:tape.field.keep,depot:tape.field.depot});clock.textContent=phaseName(frame.phase)+' · '+stamp(cursor)+' / '+stamp(total)+' · '+speed+'×'+(playing?' ▶':' ❚❚');slider.value=cursor;
  const recent=[...tape.actions.map(a=>({...a,at:a.time,order:true})),...tape.events.map(e=>({...e,at:e.t}))].filter(e=>e.at<=cursor).sort((a,b)=>b.at-a.at).slice(0,5);clear(orders).append(h('strong',w('此刻军令与战况','Orders and events at this point')),...(recent.length?recent.map(e=>h('p',stamp(e.at)+' · '+(e.order?w('军令 · ','Order · '):'')+eventText(e,tape.units))):[h('p',phaseName(frame.phase))]));
 }
 ui.setKey((code,e)=>{if(['INPUT','SELECT','BUTTON'].includes(e?.target?.tagName))return false;if(code==='Space'){playing=!playing;render(true);return true;}if(code==='ArrowRight'||code==='ArrowLeft'){cursor=Math.max(0,Math.min(total,cursor+(code==='ArrowRight'?1:-1)));playing=false;render(true);return true;}return false;});
 change(tab);ui.loop(dt=>{if(tab==='replay'&&playing){cursor=Math.min(total,cursor+dt*speed);if(cursor===total)playing=false;render();}});
 return {destroy:ui.destroy,key:ui.key,inspect:()=>({kind:'replay',tab,cursor,playing,speed,total,frame:clone(replayFrameAt(tape,cursor))})};
}

export function openBattleSandbox(app,{onExit}={}) {
 const ui=shell(w('演武沙盘','Tactical sandbox'),onExit);
 const config=clone(DEFAULT_SANDBOX);let b=null,record=null,phase='config',paused=true,speed=1,selected=0,armed=null,board=null,toolbar=null,panel=null,clock=null,acc=0,refresh=0,child=null,tape=null;
 function notify(text){ui.notice.textContent=text;}
 function makeSelect(label,values,current,onChange){return h('label.labField',h('span',label),h('select',{'aria-label':label,value:current,onchange:e=>onChange(e.target.value)},values.map(([id,name])=>h('option',{value:id,selected:id===String(current)},name))));}
 function configuration(){phase='config';b=null;clear(ui.body);notify(w('演武独立于战役。双方同士气、同训练，兵种克制与地形均按正式规则计算。','Independent of the campaign. Equal morale and training; actual troop counters and terrain rules apply.'));
  const nav=h('div.labConfigTop',makeSelect(w('地形','Terrain'),Object.values(SANDBOX_MAPS).map(m=>[m.id,nm(m)]),config.map,v=>{config.map=v;if(v!=='river')for(const army of config.armies)for(const row of army)if(UNITS[row.unit].group==='navy'){row.unit='spear';row.formation='fishscale';}configuration();}),h('label.labField',h('span',w('种子','Seed')),h('input',{type:'number',min:0,max:4294967295,value:config.seed,'aria-label':w('种子','Seed'),onchange:e=>config.seed=(+e.target.value)>>>0})),button(w('生成战场','Create battlefield'),create,{kind:'main'}));
  const armies=h('div.labArmyConfig');for(let side=0;side<2;side++){const section=h('section',h('h3',side?w('红军 · 电脑','Red army · AI'):w('蓝军 · 你指挥','Blue army · Player')));config.armies[side].forEach((row,index)=>{
   const kinds=Object.values(UNITS).filter(u=>config.map==='river'||u.group!=='navy');const forms=Object.values(FORMATIONS).filter(f=>formationAllowed(row.unit,f.id));
   section.append(h('fieldset.labArmyRow',h('legend',w('第','Unit ')+(index+1)+w(' 部','')),makeSelect(w('兵种','Troops'),kinds.map(u=>[u.id,nm(u)]),row.unit,v=>{row.unit=v;row.formation=defaultFormation(v);configuration();}),makeSelect(w('阵型','Formation'),forms.map(f=>[f.id,nm(f)]),row.formation,v=>{row.formation=v;configuration();}),h('p.labFormation',formationInfo(FORMATIONS[row.formation])),h('label.labField',h('span',w('兵力','Strength')),h('input',{type:'number',min:1000,max:20000,step:100,value:row.troops,'aria-label':w('兵力','Strength')+' '+side+'-'+index,onchange:e=>row.troops=+e.target.value})),config.armies[side].length>1?button(w('移除此部','Remove unit'),()=>{config.armies[side].splice(index,1);configuration();}):null));
  });if(config.armies[side].length<4)section.append(button(w('增加部队','Add unit'),()=>{config.armies[side].push({unit:config.map==='river'?'mengchong':'spear',troops:6000,formation:'square'});configuration();}));armies.append(section);}
  ui.body.append(nav,armies,h('details.labDoctrine',h('summary',w('兵种与阵型取舍','Counters & formation tradeoffs')),h('p',w('枪克骑、骑克弓、弓克戟、戟克枪；刀盾挡箭，枪兵拒骑。林地与高地利于防守，骑兵穿越复杂地形更慢。','Spears counter horse, horse counters bows, bows counter halberds, halberds counter spears. Shields resist arrows; spears brace cavalry. Woods and heights defend well and slow horse.')),Object.values(FORMATIONS).map(f=>h('p',nm(f)+' · '+formationInfo(f)))));
 }
 function create(){try{b=createBattle(createSandboxSetup(config));}catch(e){notify(w('配置无效：','Invalid setup: ')+e.message);return;}record=createBattleRecorder(b);phase='deploy';paused=true;selected=0;armed=null;tape=null;acc=0;clear(ui.body);toolbar=h('div.labBattleTools');clock=h('output.labClock');const layout=h('div.labBattleLayout'),field=h('div.labFieldArea');panel=h('aside.labUnitPanel');layout.append(field,panel);ui.body.append(toolbar,clock,layout);board=makeBoard(field,b.tiles,tapHex,tapUnit);field.append(h('p.labBoardLegend',w('蓝：你指挥 · 红：电脑 · 青格：可部署 · 金格：射程。选蓝军后点格移动，点敌军进攻。','Blue: player · Red: AI · Cyan: legal deployment · Gold: range. Select blue, then choose a hex to move or an enemy to attack.')));notify(w('先布阵或调整阵型，再鸣鼓开战。','Deploy or choose formations, then begin.'));render(true);}
 function issue(what,arg){if(!b||phase==='result')return;const u=b.units[selected];if(!u||u.side!==0||!command(b,u.id,what,arg)){notify(w('这条军令当前不可执行','This order cannot be issued now'));return;}record.action(what,{unit:u.id,arg:arg??null});record.capture(phase,{force:true});armed=null;render(true);}
 function tapUnit(id){const u=b.units[id];if(armed){if(u.side!==0)cast(armed,id);else if(HELP.includes(TACTICS[armed].kind))cast(armed,null);else notify(w('请选择敌军目标','Choose an enemy target'));return;}if(u.side===0){selected=id;record.action('select',{unit:id});}else if(phase==='fight'){issue('attack',id);return;}else notify(w('红军由电脑指挥，开战后可点击下达进攻令。','Red units are AI-controlled; select an enemy after battle begins to attack.'));render(true);}
 function tapHex(at){if(!b)return;const there=b.units.find(u=>!u.gone&&u.pos===at);if(there)return tapUnit(there.id);if(armed){notify(w('请点选战法目标部队，或取消施策','Choose a unit target or cancel the tactic'));return;}if(phase==='deploy'){if(deployBattleUnit(b,selected,at)){record.action('deploy',{unit:selected,hex:at});record.capture(phase,{force:true});notify(w('布阵完成','Deployment updated'));}else notify(w('只能在己方可用的青色空格部署','Deploy on a free cyan hex in your own area'));render(true);}else if(phase==='fight')issue('move',at);}
 function cast(id,target){const u=b.units[selected];if(useTactic(b,u,id,target==null?null:b.units[target])){record.action('tactic',{unit:u.id,tactic:id,target});record.capture(phase,{force:true});notify(nm(TACTICS[id])+w(' 已施展',' used'));}else notify(w('怒气不足，或目标不在战法范围内','Insufficient rage, or target outside tactic range'));armed=null;render(true);}
 function begin(){phase='fight';paused=false;record.action('begin');record.capture(phase,{force:true});notify(w('交战中；可随时暂停或单步下令。','Combat underway. Pause or step to issue orders.'));render(true);}
 function advance(seconds){
  if(phase==='deploy'){
   phase='fight';record.action('begin');record.capture(phase,{force:true});
  }
  if(phase!=='fight')return;
  for(let i=0;i<Math.round(seconds/.1)&&!b.over;i++){
   stepBattle(b,.1,0);record.capture(phase);
  }
  if(b.over){
   phase='result';paused=true;record.action('result',{...b.over});record.capture(phase,{force:true});tape=record.finish();
   notify((b.over.winner?w('红军获胜','Red army wins'):w('蓝军获胜','Blue army wins'))+' · '+t('why_'+b.over.why));
  }else notify(w('已单步推进。战斗保持暂停，可以继续下令。','Advanced one step. The battle is paused and ready for orders.'));
  render(true);
 }
 function playback(){if(!b)return;tape=record.finish();child=openBattleReplay(app,tape,{tab:phase==='result'?'report':'replay',onExit:()=>{child=null;}});paused=true;render(true);}
 function render(force=false){if(!b||phase==='config')return;const u=b.units[selected],reach=u?UNITS[u.kind].range:0;
  board.draw(b.units,{selected,valid:phase==='deploy'?at=>canDeployBattle(b,u,at):null,range:phase==='fight'?at=>u&&!u.gone&&distance(u.pos,at)<=reach:null,fire:Object.keys(b.fire).map(Number),gate:b.gate?.at??null,keep:b.keep,depot:b.depot?.at??null});clock.textContent=phaseName(phase)+' · '+stamp(b.time)+' / '+stamp(b.limit)+(paused?' ❚❚':' ▶')+' · '+speed+'×'+(b.gate?' · '+w('城门 ','Gate ')+Math.max(0,Math.round(b.gate.hp)):'');
  if(!force)return;const focused=document.activeElement?.dataset?.lab;
  clear(toolbar).append(...[phase==='deploy'?button(w('鸣鼓开战','Begin battle'),begin,{kind:'main'}):phase==='fight'?button(paused?w('继续战斗','Resume battle'):w('暂停战斗','Pause battle'),()=>{paused=!paused;record.action(paused?'pause':'resume');render(true);}):null,phase!=='result'?button(w('步进 1 秒','Step 1 second'),()=>{paused=true;record.action('step',{seconds:1});advance(1);}):null,[1,2,4].map(v=>button(v+'×',()=>{speed=v;record.action('speed',{speed:v});render(true);},{kind:speed===v?'on':''})),button(w('战报 / 回放','Report / replay'),playback),button(w('重新配置','Reconfigure'),()=>{child?.destroy();child=null;configuration();})].flat(Infinity).filter(Boolean));
  clear(panel).append(h('h3',w('蓝军指挥','Blue army orders')),h('div.labRoster',b.units.filter(o=>o.side===0).map(o=>{const x=button(unitName(o)+' · '+num(o.troops),()=>{selected=o.id;armed=null;record.action('select',{unit:o.id});render(true);},{kind:selected===o.id?'on':''});x.dataset.lab='unit-'+o.id;return x;})));
  if(u){panel.append(h('h4',unitName(u)),h('p',nm(FORMATIONS[u.formation])+' · '+formationInfo(FORMATIONS[u.formation])),h('p',w('士气 ','Morale ')+Math.round(Math.max(0,u.morale))+' · '+w('怒气 ','Rage ')+Math.floor(u.rage)+'/100 · '+w('射程 ','Range ')+reach));
   if(phase==='deploy')panel.append(makeSelect(w('阵型','Formation'),Object.values(FORMATIONS).filter(f=>formationAllowed(u.kind,f.id)).map(f=>[f.id,nm(f)]),u.formation,v=>issue('formation',v)));
   if(phase==='fight'){panel.append(h('div.labOrders',button(w('坚守','Hold'),()=>issue('hold')),button(w('自动指挥','Auto orders'),()=>issue('auto')),button(w('自动战法：','Auto tactics: ')+(u.autoTactic?w('开','on'):w('关','off')),()=>issue('autoTactic',!u.autoTactic))));panel.append(h('div.labTactics',u.tactics.map(id=>{const tc=TACTICS[id],help=HELP.includes(tc.kind),btn=button(nm(tc),()=>{if(help)cast(id,null);else{armed=id;notify(w('请点敌方部队施策：','Choose an enemy: ')+nm(tc));render(true);}},{why:u.gone||u.routed||u.rage<100?w('怒气满100后可施展','Requires 100 rage'):null,kind:armed===id?'on':''});btn.dataset.lab='tactic-'+id;return btn;})));if(armed)panel.append(button(w('取消施策','Cancel tactic'),()=>{armed=null;render(true);}));}
   const foes=b.units.filter(o=>o.side!==u.side&&!o.gone);panel.append(h('h4',w('对阵预估','Matchup forecast')),h('p.labReportNote',w('单次普通命中，按当前状态与地形；不含暴击。须在射程内才能命中。','One ordinary hit at current strength/terrain, before criticals. Actual attacks require range.')),...foes.map(o=>{const p=combatPreview(b,u,o);return h('p.labMatchup',unitName(o)+' · '+p.weaponMultiplier.toFixed(2)+'× · '+p.minLoss+'–'+p.maxLoss+'\n'+p.tags.map(tag=>w(...(tagNames[tag]??[tag,tag]))).join(' / '));}));
  }
  if(focused)ui.host.querySelector(`[data-lab="${CSS.escape(focused)}"]`)?.focus({preventScroll:true});
 }
 ui.setKey((code,e)=>{if(child)return false;if(['INPUT','SELECT','BUTTON'].includes(e?.target?.tagName))return false;if(code==='Space'&&phase==='fight'){paused=!paused;record.action(paused?'pause':'resume');render(true);return true;}if(code==='Enter'&&phase==='deploy'){begin();return true;}return false;});
 configuration();ui.loop(dt=>{if(child)return;if(b&&phase==='fight'&&!paused){acc+=dt*speed;let steps=0;while(acc>=.1&&steps<10&&!b.over){stepBattle(b,.1,0);record.capture(phase);acc-=.1;steps++;}if(b.over){phase='result';paused=true;record.action('result',{...b.over});record.capture(phase,{force:true});tape=record.finish();notify((b.over.winner?w('红军获胜','Red army wins'):w('蓝军获胜','Blue army wins'))+' · '+t('why_'+b.over.why));render(true);}refresh+=dt;if(refresh>=.2){refresh=0;render(true);}}});
 return {destroy(){child?.destroy();ui.destroy();},key:ui.key,inspect:()=>({kind:'sandbox',phase,paused,speed,selected,armed,config:clone(config),battle:b?{time:b.time,over:b.over,units:b.units.map(u=>({id:u.id,kind:u.kind,side:u.side,pos:u.pos,troops:u.troops,rage:u.rage,formation:u.formation,order:u.order,autoTactic:u.autoTactic})),events:clone(b.events)}:null,child:child?.inspect()??null,tape:tape?clone(tape):null})};
}
