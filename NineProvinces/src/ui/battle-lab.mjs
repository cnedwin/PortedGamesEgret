import {createLabShell as shell} from './battle-lab-shell.mjs';
import {createBattleBoard as makeBoard} from './battle-board.mjs';
import {createBattlePlayground} from './battle-playground.mjs';
// The tactical laboratory/replay is a UI over actual battle states; it never owns a realm save.
import { UNITS, FORMATIONS, TERRAIN, formationAllowed, defaultFormation } from '../data/battle.mjs';
import { TACTICS } from '../data/tactics.mjs';
import { createBattle, stepBattle, command, useTactic, combatPreview, deployBattleUnit, canDeployBattle, distance, idx, FIELD, outcome } from '../sim/battle.mjs';
import { createBattleRecorder, replayFrameAt } from '../sim/battle-history.mjs';
import { createSandboxSetup, SANDBOX_MAPS, DEFAULT_SANDBOX } from '../sim/battle-sandbox.mjs';
import { getLanguage, nm, num, t } from '../i18n.mjs';
import { generalName } from '../view/names.mjs';
import { h, button, clear } from './dom.mjs';
import {battleActionLabel,battleOutcomeReason,hexPositionLabel} from './battle-copy.mjs';

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

function eventText(e,identities){
 const who=id=>{const u=identities.find(u=>u.id===id);return u?unitName(u):w('部队','Unit');};
 if(e.kind==='tactic'||e.kind==='tacticFailed')return who(e.unit)+' · '+nm(TACTICS[e.tactic])+(e.kind==='tacticFailed'?w('（被识破）',' (resisted)'):e.target!=null?' → '+who(e.target):'');
 if(e.kind==='rout')return who(e.unit)+w(' 溃退',' routed');
 if(e.kind==='gateOpen')return w('城门攻破','Gate breached');if(e.kind==='depotBurnt')return w('粮仓焚毁','Depot burned');
 const detail=e.kind==='formation'?' · '+nm(FORMATIONS[e.formation??e.arg]):e.kind==='attack'?' → '+who(e.arg):e.kind==='move'||e.kind==='deploy'?' · '+hexPositionLabel(e.hex??e.arg,getLanguage()):e.kind==='speed'?' · '+e.speed+'×':e.kind==='autoTactic'?' · '+(e.arg?w('开','on'):w('关','off')):e.kind==='aim'?' · '+nm(TACTICS[e.tactic])+(e.target!=null?' → '+who(e.target):''):'';
 return battleActionLabel(e,getLanguage())+(e.unit!=null?' · '+who(e.unit):'')+detail;
}

export function battleReportContent(report,identities=[],playerSide=null){
 if(!report)return h('p',w('没有可显示的战报','No battle report available'));
 const sides=h('div.labTotals',report.sides.map(side=>h('section',h('h3',side.side?w('红军','RED ARMY'):w('蓝军','BLUE ARMY')),h('strong',num(side.remaining)+' / '+num(side.start)),h('p',w('净减员 ','Net losses ')+num(side.losses)+' · '+w('治疗 ','Restored ')+num(side.healing)),h('p',w('克制命中 ','Counter hits ')+side.counterHits+' · '+w('夹击 ','Flanks ')+side.flankHits+' · '+w('战法 ','Tactics ')+side.tactics))));
 const headers=[w('部队 / 阵型','Unit / Formation'),w('起始 → 剩余','Start → Remain'),w('实际杀伤','Damage'),w('承伤 / 治疗','Taken / Healing'),w('克制 / 夹击 / 战法','Counter / Flank / Tactic')];
 const table=h('div.labTableScroll',h('table.labReportTable',h('thead',h('tr',headers.map(x=>h('th',{'scope':'col'},x)))),h('tbody',report.units.map(u=>h('tr',h('th',{'scope':'row'},unitName(u)+' · '+nm(FORMATIONS[u.formation])),h('td',num(u.start)+' → '+num(u.remaining)),h('td',num(Math.round(u.damage))),h('td',num(Math.round(u.taken))+' / '+num(Math.round(u.healing))),h('td',u.counterHits+' / '+u.flankHits+' / '+u.tactics))))));
 const chronology=[...(report.events??[]).map(e=>({...e,time:e.t,source:'event'})),...(report.actions??[]).filter(e=>e.kind!=='select').map(e=>({...e,source:'action'}))].sort((a,b)=>a.time-b.time);
 return h('div.labReport',h('p.labReportIntro',w('战斗时长 ','Duration ')+stamp(report.seconds)+' · '+(report.winner==null?w('尚未结束','In progress'):(report.winner?w('红军获胜','Red army wins'):w('蓝军获胜','Blue army wins'))+' · '+battleOutcomeReason(report,playerSide,getLanguage()))),sides,table,h('p.labReportNote',w('杀伤包含随后被救治的损伤，净减员只计算战前与战后兵力差。反击与战法均计入实际贡献。','Damage includes casualties later restored by healing. Net losses compare initial and final troops. Retaliation and tactics count toward actual contributions.')),h('h3',w('军令与战局纪要','Orders & battle chronology')),h('ol.labChronology',chronology.length?chronology.map(e=>h('li',h('time',stamp(e.time)),h('span',{'className':e.source==='action'?'playerOrder':''},(e.source==='action'?w('军令 · ','Order · '):'')+eventText(e,identities)))):h('li',w('尚无军令或关键战况','No orders or key events yet'))));
}

export function openBattleReplay(app,tape,{onExit,tab='report',playerSide=null}={}) {
 if(!tape?.frames?.length)throw new Error('Replay has no recorded frames');
 const ui=shell(w('战斗详报与回放','Battle report & replay'),onExit),tabs=h('nav.labTabs'),content=h('div.labReplayContent');ui.body.append(tabs,content);
 const inferredSide=tape.setup.factions?.indexOf(app.state?.player);if(playerSide===null&&inferredSide>=0)playerSide=inferredSide;
 let cursor=0,playing=false,speed=1,board=null,clock=null,slider=null,orders=null,lastKey='';
 ui.onDestroy(()=>board?.destroy());
 const total=tape.frames.at(-1).time;
 function change(next){board?.destroy();board=null;tab=next;ui.host.dataset.labTab=tab;playing=false;clear(tabs).append(button(w('战斗详报','Detailed report'),()=>change('report'),{kind:tab==='report'?'main':''}),button(w('战场回放','Battle replay'),()=>change('replay'),{kind:tab==='replay'?'main':''}));clear(content);
  if(tab==='report'){content.append(battleReportContent(tape.report,tape.units,playerSide));return;}
  const controls=h('div.labReplayControls');clock=h('output');slider=h('input',{type:'range',min:0,max:Math.max(.001,total),step:.001,value:cursor,'aria-label':w('回放时间','Replay time'),oninput:e=>{cursor=+e.target.value;playing=false;render(true);}});
  const toggle=button(w('播放 / 暂停','Play / pause'),()=>{playing=!playing;if(cursor>=total)cursor=0;render(true);});toggle.dataset.lab='play';
  controls.append(toggle,button(w('回到开场','Opening'),()=>{cursor=0;playing=false;render(true);}),...[1,2,4].map(v=>button(v+'×',()=>{speed=v;render(true);})),clock);content.append(controls,slider);board=makeBoard(content,tape.field.tiles);orders=h('div.labReplayOrders',{'aria-live':'polite'});content.append(orders,h('p.labReportNote',w('每秒记录真实战况，可拖动时间轴；蓝/红为双方，金圈为部队位置。此处不会推进或改写战役存档。','Actual battle snapshots, sampled about once per second; seek with the timeline. Blue/red identify the sides. Replays never advance or overwrite the campaign.')));lastKey='';render(true);
 }
 function render(force=false){if(tab!=='replay')return;const frame=replayFrameAt(tape,cursor),key=frame.time+':'+frame.phase+':'+playing+':'+speed;if(!force&&lastKey===key)return;lastKey=key;const units=frame.units.map(u=>({...tape.units[u.id],...u})),tiles=tape.field.tiles.slice();for(const[at,tile]of frame.terrain??[])tiles[at]=tile;board.setTiles(tiles);board.draw(units,{time:frame.time,animate:playing,naval:tape.setup.kind==='naval',nameOf:unitName,calm:app.calm?.(),events:tape.events.filter(e=>e.t<=cursor),fire:frame.fire,gate:tape.field.gate,keep:tape.field.keep,depot:tape.field.depot});clock.textContent=phaseName(frame.phase)+' · '+stamp(cursor)+' / '+stamp(total)+' · '+speed+'×'+(playing?' ▶':' ❚❚');slider.value=cursor;
  const recent=[...tape.actions.map(a=>({...a,at:a.time,order:true})),...tape.events.map(e=>({...e,at:e.t}))].filter(e=>e.at<=cursor).sort((a,b)=>b.at-a.at).slice(0,5);clear(orders).append(h('strong',w('此刻军令与战况','Orders and events at this point')),...(recent.length?recent.map(e=>h('p',stamp(e.at)+' · '+(e.order?w('军令 · ','Order · '):'')+eventText(e,tape.units))):[h('p',phaseName(frame.phase))]));
 }
 ui.setKey((code,e)=>{if(['INPUT','SELECT','BUTTON'].includes(e?.target?.tagName))return false;if(code==='Space'){playing=!playing;render(true);return true;}if(code==='ArrowRight'||code==='ArrowLeft'){cursor=Math.max(0,Math.min(total,cursor+(code==='ArrowRight'?1:-1)));playing=false;render(true);return true;}return false;});
 change(tab);ui.loop(dt=>{board?.tick(dt);if(tab==='replay'&&playing){cursor=Math.min(total,cursor+dt*speed);if(cursor===total)playing=false;render();}});
 return {destroy:ui.destroy,key:ui.key,inspect:()=>({kind:'replay',tab,cursor,playing,speed,total,frame:clone(replayFrameAt(tape,cursor))})};
}

export function openBattleSandbox(app,options={}) {
 return createBattlePlayground(app,{...options,openReplay:(tape,opts)=>openBattleReplay(app,tape,{playerSide:0,...opts})});
}
