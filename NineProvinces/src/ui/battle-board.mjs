// Retained, layered war-table presentation. Every position, order, loss and tactic comes from the battle model.
import {UNITS,TERRAIN} from '../data/battle.mjs';
import {TACTICS} from '../data/tactics.mjs';
import {distance} from '../sim/battle.mjs';
import {getLanguage,nm,num} from '../i18n.mjs';
import {h,button} from './dom.mjs';
import {BOARD,boardPoint,terrainLift,hexPoints,formationSlots} from './battle-board-layout.mjs';
const NS='http://www.w3.org/2000/svg',w=(a,b)=>getLanguage()==='en'?b:a;
let serial=0;
function svg(tag,props={},text){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(props))e.setAttribute(k,v);if(text!=null)e.textContent=text;return e;}
const colours={plain:'#beac81',grass:'#a2aa76',road:'#d9bd81',forest:'#718568',hill:'#a99470',mountain:'#858176',river:'#76a7a2',water:'#4c8588',marsh:'#849b7a',wall:'#aa9f88',gate:'#9d7b53',town:'#c2b290',camp:'#b5a078',ship:'#7f8d7c'};

export function createBattleBoard(parent,initialTiles,onHex,onUnit,{onHover}={}){
 const id='warTable'+serial++,area=h('div.labMapStage'),tools=h('div.labMapTools'),viewport=h('div.labBoardScroll'),root=svg('svg',{viewBox:`0 0 ${BOARD.width} ${BOARD.height}`,class:'labBoard warTable',role:'group','aria-label':w('演武战场。可以平移、缩放，选择部队下令。','Tactical battlefield. Pan, zoom, select units and issue orders.')});
 let tiles=initialTiles,options={},units=[],selected=null,lastTime=null,seen=0,zoom=1,destroyed=false,fxCount=0,actualHits=0,actualTactics=0;
 const defs=svg('defs');
 function symbol(name,markup){const e=svg('symbol',{id:id+name,overflow:'visible'});e.innerHTML=markup;defs.append(e);}
 const pattern=svg('pattern',{id:id+'grain',width:17,height:13,patternUnits:'userSpaceOnUse'});pattern.innerHTML='<path d="M2 3l2 0M10 9l1-1M15 2l1 1M6 12l2-1" stroke="#463c26" opacity=".11" stroke-width=".6"/>';defs.append(pattern);
 const water=svg('pattern',{id:id+'water',width:34,height:20,patternUnits:'userSpaceOnUse'});water.innerHTML='<path d="M-5 5q8-5 17 0t17 0t17 0M-12 15q8-5 17 0t17 0t17 0" fill="none" stroke="#b3d6c0" opacity=".28" stroke-width=".75"/>';defs.append(water);
 const glow=svg('radialGradient',{id:id+'glow'});glow.innerHTML='<stop stop-color="#ffe9b0" stop-opacity=".8"/><stop offset="1" stop-color="#edb55c" stop-opacity="0"/>';defs.append(glow);
 symbol('pine','<path d="M0 0v-12" stroke="#564b31" stroke-width="1.6"/><path d="M-6-4L0-17L6-4Z" fill="#345849" stroke="#294639" stroke-width=".5"/><path d="M-5-9L0-21L5-9Z" fill="#4e7556"/><path d="M-3-14L0-24L3-14Z" fill="#829064"/>');
 symbol('soldier','<ellipse cy="2" rx="2.6" ry="1" fill="#192c2b" opacity=".35"/><path d="M-1.5 1l.4-3M1.5 1l-.4-3" stroke="#26342e" stroke-width="1.1"/><path d="M-2-2L-1.4-6H1.4L2-2Z" fill="currentColor" stroke="#25302d" stroke-width=".5"/><circle cy="-7" r="1.4" fill="#bca879"/><path d="M-1.6-7.3Q0-10 1.6-7.3Z" fill="#555b51"/><path d="M3 0V-12l-.8 2" stroke="#ad985f" stroke-width=".65"/>');
 symbol('bowman','<ellipse cy="2" rx="2.8" ry="1" fill="#192c2b" opacity=".35"/><path d="M-1.5 1l.4-3M1.5 1l-.4-3" stroke="#26342e" stroke-width="1.1"/><path d="M-2-2L-1.3-6H1.3L2-2Z" fill="currentColor" stroke="#25302d" stroke-width=".5"/><circle cy="-7.3" r="1.4" fill="#c0aa7b"/><path d="M2.5-9q5 4 0 8M2.5-9v8" fill="none" stroke="#ac8e55" stroke-width=".8"/>');
 symbol('rider','<ellipse cy="2" rx="4.6" ry="1.2" fill="#192c2b" opacity=".35"/><path d="M-3 1l.5-4M2.5 1l-.3-4" stroke="#433a2a" stroke-width="1"/><path d="M-4-4q1.8-3 6-1L3-9l2 2L3.5-3L-3-2Z" fill="#7d6847" stroke="#473e2e" stroke-width=".6"/><path d="M-1-4L-1.2-8H1.2L2-4Z" fill="currentColor" stroke="#293b33" stroke-width=".5"/><circle cy="-9.3" r="1.3" fill="#baa575"/><path d="M2-6l1-7" stroke="#b7a36b" stroke-width=".7"/>');
 symbol('ship','<ellipse cy="2" rx="8.5" ry="2" fill="#c1e0cd" opacity=".3"/><path d="M-9-1L-6 4H5L10-1Z" fill="#6e4b31" stroke="#342f27" stroke-width=".8"/><path d="M-7-1H8" stroke="#c6ab73"/><path d="M0-1V-17L6-12L0-8" fill="currentColor" stroke="#c4b582" stroke-width=".8"/><path d="M-5 1l-5 4M6 1l5 3" stroke="#bd9e63" stroke-width=".8"/>');
 root.append(defs);
 const shadows=svg('g',{class:'tableTerrainShadows'}),ground=svg('g'),decor=svg('g',{'pointer-events':'none'}),orders=svg('g',{'pointer-events':'none',class:'tableOrders'}),markers=svg('g',{'pointer-events':'none'}),figures=svg('g'),fx=svg('g',{'pointer-events':'none',class:'tableFx'});
 root.append(svg('rect',{x:5,y:14,width:790,height:438,rx:14,fill:'#433f2b',opacity:'.45'}),shadows,ground,decor,orders,markers,figures,fx);
 viewport.append(root);area.append(tools,viewport);parent.append(area);
 const cells=[],decorations=[],lastTiles=[],states=new Map(),effects=[];
 for(let at=0;at<tiles.length;at++){
  const p=boardPoint(at),shadow=svg('polygon',{points:hexPoints(p.x,p.y+5),fill:'#4f5039',opacity:'.55'}),cell=svg('polygon',{'data-hex':at,class:'tableCell'}),g=svg('g'),title=svg('title');cell.append(title);cell.addEventListener('click',()=>onHex?.(at));cells.push(cell);decorations.push(g);shadows.append(shadow);ground.append(cell);decor.append(g);
 }
 const makeUse=(name,x,y,scale=1)=>svg('use',{href:'#'+id+name,transform:`translate(${x} ${y}) scale(${scale})`});
 function terrain(at){const tile=tiles[at],p=boardPoint(at),lift=terrainLift(tile),g=decorations[at],cell=cells[at];lastTiles[at]=tile;cell.setAttribute('points',hexPoints(p.x,p.y-lift));cell.setAttribute('fill',colours[tile]??colours.plain);cell.firstChild.textContent=nm(TERRAIN[tile])+' · '+(at%22+1)+','+(Math.floor(at/22)+1);g.replaceChildren();g.setAttribute('transform',`translate(${p.x} ${p.y-lift})`);
  if(lift)g.append(svg('path',{d:`M-16.5 9.5L0 19L16.5 9.5v${lift}L0 ${19+lift}L-16.5 ${9.5+lift}Z`,fill:tile==='wall'?'#777463':'#756e52'}));
  g.append(svg('polygon',{points:hexPoints(0,0),fill:`url(#${id}grain)`}));
  if(tile==='forest'){g.append(makeUse('pine',-7,8,.82),makeUse('pine',7,11,.65),makeUse('pine',2,0,.9));}
  else if(tile==='hill')g.append(svg('path',{d:'M-14 5q12-15 26 0M-10 8q8-9 18-2M-7-1q7-7 14-1',fill:'none',stroke:'#ded0a0','stroke-width':'1',opacity:'.6'}));
  else if(tile==='mountain')g.append(svg('path',{d:'M-17 9L-6-21L4-5L10-15L18 9Z',fill:'#697571',stroke:'#525e57','stroke-width':'.7'}),svg('path',{d:'M-6-21L-2-4L-11 4Z',fill:'#b4b5a0'}),svg('path',{d:'M10-15L12 5L3 9Z',fill:'#939e8e'}));
  else if(tile==='water'||tile==='river'||tile==='ship'){g.append(svg('polygon',{points:hexPoints(0,0),fill:`url(#${id}water)`}));if(tile==='river')g.append(svg('path',{d:'M-10 7h5M1 1h6M8 10h3',stroke:'#c5c2a2','stroke-width':'2.7'}));if(tile==='ship')g.append(makeUse('ship',-1,4,.9));}
  else if(tile==='wall'||tile==='gate'){g.append(svg('path',{d:'M-15-3h30v9h-30Z',fill:'#bdb6a0',stroke:'#676b5e','stroke-width':'.7'}),svg('path',{d:'M-15-3v-5h5v5h5v-5h5v5h5v-5h5v5h5v-5h5v5M-14 2h28M-8-2v4M2 2v4M9-2v4',fill:'none',stroke:'#696d5f','stroke-width':'1'}));if(tile==='gate')g.append(svg('path',{d:'M-4 6V0Q0-7 4 0V6',fill:'#5c4a32'}));}
  else if(tile==='town')g.append(svg('path',{d:'M-10 8V1H-1V8M4 5V-2H12V5',fill:'#d4c2a0',stroke:'#6e6d5e','stroke-width':'.7'}),svg('path',{d:'M-13 1L-6-6L3 1ZM1-2L8-8L15-2Z',fill:'#677973',stroke:'#435f59','stroke-width':'.6'}));
  else if(tile==='camp')g.append(svg('path',{d:'M-10 8L-2-10L9 8Z',fill:'#e0c18b',stroke:'#6b6245','stroke-width':'.8'}),svg('path',{d:'M-2-10V8H9Z',fill:'#ba9b63'}),svg('path',{d:'M-14 11H14M-13 7v8M-8 8v8M8 8v8M13 7v8',stroke:'#746141','stroke-width':'1'}));
  else if(tile==='marsh')g.append(svg('path',{d:'M-9 8l-2-8M-8 8l1-5M3 1l-2-8M5 1l3-5M9 10l2-8',stroke:'#526d4c','stroke-width':'.9'}));
  else if(tile==='road')g.append(svg('path',{d:'M-16 0H16M-15 3H15',stroke:'#9f8753','stroke-width':'.5',opacity:'.45'}));
 }
 let fit=true;
 function size(){
  const width=Math.max(280,viewport.clientWidth-12),height=Math.max(200,viewport.clientHeight);
  root.classList.toggle('tableOverview',fit);
  root.style.width=(fit?Math.min(width,height*BOARD.width/BOARD.height):Math.max(width,BOARD.width)*zoom)+'px';
  root.style.minWidth='0';
  root.style.margin='auto';
 }
 function focusSelected(){const s=states.get(selected);if(!s)return;fit=false;zoom=Math.max(1,zoom);size();requestAnimationFrame(()=>s.g.scrollIntoView({block:'nearest',inline:'center',behavior:'auto'}));}
 tools.append(button(w('全景','Overview'),()=>{fit=true;size();}),button('＋',()=>{fit=false;zoom=Math.min(1.8,zoom+.25);size();}),button('−',()=>{fit=false;zoom=Math.max(.75,zoom-.25);size();}),button(w('定位所选','Find selected'),focusSelected));
 const resize=new ResizeObserver(size);resize.observe(viewport);size();
 function addEffect(kind,from,to,text=null,colour='#ffe4a0'){
  if(effects.length>=32){effects.shift().g.remove();}
  const g=svg('g',{class:'effect-'+kind}),duration=kind==='tactic'?1.2:kind==='rout'?1.1:kind==='loss'?.85:.48;
  if(kind==='arrow'){g.append(svg('path',{d:`M${from.x} ${from.y}Q${(from.x+to.x)/2} ${Math.min(from.y,to.y)-28} ${to.x} ${to.y}`,fill:'none',stroke:colour,'stroke-width':'1.6','stroke-linecap':'round'}));}
  else if(kind==='loss')g.append(svg('text',{x:to.x,y:to.y-15,class:'tableLoss'},text));
  else if(kind==='rout')g.append(svg('circle',{cx:to.x,cy:to.y,r:18,fill:'none',stroke:'#c8baa0','stroke-width':'2','stroke-dasharray':'3 4'}),svg('text',{x:to.x,y:to.y-24,class:'tableRout'},text));
  else if(kind==='tactic'){g.append(svg('circle',{cx:to.x,cy:to.y,r:42,fill:`url(#${id}glow)`}),svg('circle',{cx:to.x,cy:to.y,r:25,fill:'none',stroke:colour,'stroke-width':'2'}),svg('path',{d:`M${to.x-24} ${to.y-3}l48 6M${to.x-14} ${to.y-20}l28 40`,stroke:colour,'stroke-width':'1.8',opacity:'.8'}),svg('text',{x:to.x,y:to.y-31,class:'tableSkill'},text));}
  else g.append(svg('path',{d:`M${to.x-11} ${to.y+5}Q${to.x+6} ${to.y-20} ${to.x+16} ${to.y-3}M${to.x-7} ${to.y-8}l14 16M${to.x+3} ${to.y-14}l-5 25`,stroke:colour,fill:'none','stroke-width':'2','stroke-linecap':'round'}));
  fx.append(g);effects.push({g,kind,time:0,duration,x:to.x,y:to.y});fxCount++;
 }
 function targetFor(u){const target=typeof u.target==='number'?units.find(o=>o.id===u.target):u.target;return target&&!target.gone?target:units.filter(o=>o.side!==u.side&&!o.gone&&distance(u.pos,o.pos)<=UNITS[u.kind].range).sort((a,b)=>distance(a.pos,u.pos)-distance(b.pos,u.pos))[0];}
 function draw(nextUnits,nextOptions={}){
  if(destroyed)return;units=nextUnits;options=nextOptions;selected=options.selected??null;
  const time=options.time??0,seeking=lastTime!==null&&(time<lastTime||Math.abs(time-lastTime)>1.65),animate=options.animate!==false&&!seeking,hot=new Set(options.fire??[]),targetArea=new Set(options.area??[]);
  root.classList.toggle('calm',!!options.calm);root.classList.toggle('aiming',!!options.armed);
  if(seeking){for(const e of effects)e.g.remove();effects.length=0;}
  for(let at=0;at<cells.length;at++){if(lastTiles[at]!==tiles[at])terrain(at);const klass='tableCell'+(options.valid?.(at)?' deployable':'')+(options.range?.(at)?' inRange':'')+(hot.has(at)?' burning':'')+(targetArea.has(at)?options.areaValid===false?' unsafeArea':' tacticArea':'');if(cells[at].getAttribute('class')!==klass)cells[at].setAttribute('class',klass);}
  markers.replaceChildren();for(const[at,label]of[[options.gate,w('城门','GATE')],[options.keep,w('本营','KEEP')],[options.depot,w('粮仓','DEPOT')]])if(at!=null){const p=boardPoint(at);markers.append(svg('path',{d:`M${p.x} ${p.y-4}v-25l16 4-16 7`,stroke:'#e5c582',fill:'#7c4734','stroke-width':'1.5'}),svg('text',{x:p.x,y:p.y+15,class:'tableObjective'},label));}
  orders.replaceChildren();const chosen=units.find(u=>u.id===selected);
  if(chosen&&!chosen.gone){const origin=boardPoint(chosen.pos),path=chosen.path??[];if(path.length){const points=[origin,...path.map(boardPoint)];orders.append(svg('polyline',{points:points.map(p=>p.x+','+p.y).join(' '),class:'tableMovePath'}));const end=points.at(-1);orders.append(svg('circle',{cx:end.x,cy:end.y,r:7,class:'tableMoveGoal'}));}const target=targetFor(chosen);if(chosen.order==='attack'&&target){const to=boardPoint(target.pos);orders.append(svg('path',{d:`M${origin.x} ${origin.y}L${to.x} ${to.y}`,class:'tableAttackPath'}),svg('circle',{cx:to.x,cy:to.y,r:22,class:'tableAttackGoal'}));}}
  for(const u of units){const p=boardPoint(u.pos);p.y-=terrainLift(tiles[u.pos]??'plain');let s=states.get(u.id);if(!s){const g=svg('g',{class:'labUnit tableArmy',role:'button',tabindex:'0','data-unit':u.id}),selection=svg('ellipse',{cx:0,cy:3,rx:20,ry:12,class:'tableSelection'}),mini=svg('g',{class:'tableMiniatures'}),flag=svg('path',{d:'M-14 3V-24L0-21L-14-14',class:'tableBanner'}),badge=svg('text',{x:-10,y:-17,class:'tableArmyIndex'},String(u.id+1)),label=svg('text',{x:1,y:26,class:'tableArmyCount'}),bar=svg('rect',{x:-16,y:30,width:32,height:3,class:'tableStrength'}),hp=svg('rect',{x:-16,y:30,height:3,class:'tableStrengthValue'}),rage=svg('rect',{x:-16,y:34,height:2,class:'tableRage'}),hit=svg('circle',{cx:0,cy:-4,r:23,fill:'transparent',class:'tableArmyHit'});
    g.append(selection,mini,flag,badge,label,bar,hp,rage,hit);g.addEventListener('click',e=>{e.stopPropagation();onUnit?.(u.id);});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();onUnit?.(u.id);}});g.addEventListener('pointerenter',()=>onHover?.(u.id));g.addEventListener('pointerleave',()=>onHover?.(null));figures.append(g);s={g,mini,label,hp,rage,x:p.x,y:p.y,tx:p.x,ty:p.y,troops:u.troops,hits:u.record?.hits??u.hits??0,routed:u.routed,gone:u.gone,miniKey:''};states.set(u.id,s);
   }
   const hits=u.record?.hits??u.hits??0,canFeedback=lastTime!==null&&animate;
   if(canFeedback&&u.troops<s.troops){addEffect('loss',p,p,'−'+num(Math.round(s.troops-u.troops)));addEffect('strike',p,p);actualHits++;options.onFeedback?.({kind:'impact'});}
   const attack=u.lastAttack,attackKey=attack?attack.time+':'+attack.target+':'+attack.kind:null;
   // New recordings retain the actual resolved target. Legacy snapshots deliberately show no inferred arrows.
   if(canFeedback&&attackKey&&attackKey!==s.attackKey&&UNITS[u.kind].range>1){const target=units.find(o=>o.id===attack.target);if(target){const to=boardPoint(target.pos);addEffect('arrow',p,to,null,u.side?'#efb29b':'#eadeaa');}}
   s.attackKey=attackKey;
   if(canFeedback&&((u.routed&&!s.routed)||(u.gone&&!s.gone)))addEffect('rout',p,p,u.gone?w('击破','BROKEN'):w('溃退','ROUT'));
   s.troops=u.troops;s.hits=hits;s.routed=u.routed;s.gone=u.gone;s.tx=p.x;s.ty=p.y;
   if(seeking||options.calm){s.x=p.x;s.y=p.y;}
   const kind=UNITS[u.kind],naval=options.naval||kind.group==='navy',count=Math.max(3,Math.min(12,Math.round(u.troops/1000))),miniKey=(naval?'ship':kind.group)+':'+u.formation+':'+count;
   if(s.miniKey!==miniKey){s.miniKey=miniKey;s.mini.replaceChildren();if(naval){for(const[x,y]of[[-8,1],[8,5]])s.mini.append(makeUse('ship',x,y,.82));}else for(const v of formationSlots(u.formation,count))s.mini.append(makeUse(kind.group==='cav'?'rider':kind.range>1?'bowman':'soldier',v.x,v.y,kind.group==='cav'?.82:1));}
   s.g.setAttribute('class','labUnit tableArmy '+(u.side?'red':'blue')+(u.id===selected?' selected':'')+(u.routed?' routed':'')+(u.rage>=100?' ready':'')+(u.path?.length&&time!==lastTime?' marching':'')+(u.id===options.target?' targeted':''));s.g.style.display=u.gone||u.pos<0?'none':'';s.g.setAttribute('aria-label',(u.general?options.nameOf?.(u)??nm(kind):nm(kind))+' · '+num(u.troops));s.label.textContent=num(u.troops);s.hp.setAttribute('width',Math.max(0,32*u.troops/u.start));s.rage.setAttribute('width',Math.max(0,32*(u.rage??0)/100));
  }
  const events=options.events??[];if(seeking)seen=events.length;
  for(;seen<events.length;seen++){const e=events[seen];if(!animate||e.kind!=='tactic')continue;const source=units.find(u=>u.id===e.unit),target=units.find(u=>u.id===e.target)??source;if(!target)continue;const tc=TACTICS[e.tactic],p=boardPoint(target.pos),colour=tc?.kind==='burn'?'#f0a44e':['heal','rally','def','atk','spd','rage'].includes(tc?.kind)?'#b6e1af':'#f1d18b';addEffect('tactic',p,p,nm(tc),colour);actualTactics++;options.onFeedback?.({kind:'tactic',tacticKind:tc?.kind});}
  lastTime=time;tick(0);
 }
 function tick(dt){if(destroyed)return;for(const s of states.values()){const k=options.calm?1:1-Math.exp(-dt*16);s.x+=(s.tx-s.x)*k;s.y+=(s.ty-s.y)*k;s.g.setAttribute('transform',`translate(${s.x.toFixed(2)} ${s.y.toFixed(2)})`);}for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.time+=dt;const t=e.time/e.duration;if(t>=1){e.g.remove();effects.splice(i,1);continue;}e.g.setAttribute('opacity',String(Math.min(1,(1-t)*1.7)));if(e.kind==='loss'||e.kind==='rout')e.g.setAttribute('transform',`translate(0 ${-t*14})`);if(e.kind==='tactic'&&!options.calm){const scale=1+t*.3;e.g.setAttribute('transform',`translate(${e.x} ${e.y}) scale(${scale}) translate(${-e.x} ${-e.y})`);}}}
 function destroy(){if(destroyed)return;destroyed=true;resize.disconnect();effects.length=0;states.clear();area.remove();}
 return {root,draw,tick,destroy,setTiles:next=>{tiles=next;},focusSelected,inspect:()=>({units:states.size,effects:effects.length,createdEffects:fxCount,actualHits,actualTactics,zoom,overview:fit})};
}
