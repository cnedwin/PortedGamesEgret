// The combat interface is entirely native Play. The rules/view remain authoritative.
import { projectToViewport3D } from '@egret/engine/world3d';
import { registerScreenOccluder } from '@egret/engine/ui';
import { BOUNDS, BOXES, PLACES } from '../level.mjs';
import { MISSION } from '../data.mjs';
import { TEXT } from '../text.mjs';
import { HUD_COLORS as C, newHudState, refreshHudState, applyHudEvent, advanceHudTimers, edgeMarker, eligibleMapEnemy, wrapHudText } from './hud-state.mjs';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const text=(name,width,height,size,color=C.text,align='left',bold=false)=>({type:'text',name,width,height,size,color,align,bold});
const group=(layout,width,height,children,extras={})=>({type:'panel',layout,width,height,children,...extras});
const card=(name,anchor,x,y,width,height,children,extras={})=>({type:'panel',name,anchor,x,y,width,height,layout:'column',gap:3,padding:8,color:C.panel,alpha:.73,children,...extras});
const bar=(name,width,height,color)=>({type:'bar',name,width,height,color});

// One declarative view for text and bars. Touch uses larger logical lettering;
// portrait retains the same named parts in a narrower native layout.
function describe(touch,portrait=false){
 const unit=touch?1.18:1,sz=Math.round(18*unit),line=Math.round(24*unit),small=Math.round(14*unit),gap=4,m=10;
 const objW=portrait?'63%':touch?390:270, objH=portrait?137:line*4+gap*3+16;
 const upH=line*3+10, mapD=portrait?142:touch?162:170;
 const row=(children,height=line)=>group('row','fill',height,children,{gap:5,align:'center'});
 const objective=card('objective','top-left',m,m,objW,objH,portrait?[
  text('objectiveTitleP','fill',20,16,C.text,'left',true),row([text('objectiveTailP','fill',18,15,C.text,'left',true),text('clock',56,18,15,C.dim,'right')],18),...Array.from({length:3},(_,i)=>text('terminal_'+i,'fill',23,19))
 ]:[row([text('objectiveTitle','fill',line,sz,C.text,'left',true),text('clock',64,line,small,C.dim,'right')]),...Array.from({length:3},(_,i)=>text('terminal_'+i,'fill',line,sz))]);
 const uplink=card('uplink','top-left',m,objH+m+5,objW,upH,[row([text('uplinkLabel','fill',line,sz,C.cyan,'left',true),text('uplinkTime',70,line,small,C.text,'right')]),bar('uplinkValue','fill',7,C.cyan),text('uplinkHint','fill',line,small,C.dim)]);
 const vitals=card('vitals','bottom-left',m,8,portrait?'46%':touch?300:248,Math.round((touch?76:88)),[
  row([bar('armorBar','fill',8,C.cyan),text('armor',48,18,small,C.cyan,'right',true)],18),row([bar('healthBar','fill',9,C.accent),text('health',48,20,small,C.text,'right',true)],20),
  row([text('bandages','30%',18,small,C.accent),text('grenades','30%',18,small,C.text),text('value','fill',18,small,C.gold,'right')],18)
 ],{padding:6,gap:2});
 const ammo=touch?card('ammo','top-right',m,portrait?235:112,portrait?170:208,62,[
  text('weapon','fill',17,small,C.dim,'right'),row([text('ammoCount','fill',24,26,C.text,'right',true),text('reserve',72,24,sz,C.dim,'right')],24),
  row([text('ammoNote','fill',13,Math.round(12*unit),C.gold),text('slots',0,0,small,C.dim,'right')],13)
 ],{padding:3,gap:1}):card('ammo','bottom-right',m,8,225,108,[text('weapon','fill',24,small,C.dim,'right'),row([text('ammoCount','fill',37,37,C.text,'right',true),text('reserve',82,24,sz,C.dim,'right')],37),row([text('ammoNote','fill',20,small,C.gold),text('slots',112,20,small,C.dim,'right')],20)],{padding:5,gap:1});
 const centerW=portrait?'90%':touch?465:480;
 const progressCard=(name,label,value,y,color)=>portrait?card(name,'bottom-left',m,name==='prompt'?145:87,'46%',52,[text(label+'P0','fill',17,14,C.text,'center',true),text(label+'P1','fill',17,14,C.text,'center',true),bar(value,'fill',6,color)],{padding:4,gap:1}):card(name,'bottom',0,y,centerW,line+14,[text(label,'fill',line,sz,C.text,'center',true),bar(value,'fill',6,color)],{padding:5,gap:2});
 const prompt=progressCard('prompt','promptText','promptValue',touch?102:86,C.gold),busy=progressCard('busy','busyText','busyValue',touch?54:44,C.accent);
 const commW=portrait?'92%':touch?'52%':'55%',commLine=touch?22:21,commSize=touch?17:15;
 const comms=portrait?card('comms','center',0,65,commW,98,[text('speaker','fill',17,15,C.gold,'left',true),...Array.from({length:4},(_,i)=>text('commsP'+i,'fill',17,15,C.text,'left'))],{alpha:.53,padding:4,gap:1}):card('comms',touch?'center':'bottom',0,touch?47:87,commW,commLine*2+10,[row([text('speaker',touch?82:74,commLine,commSize,C.gold,'center',true),text('comms0','fill',commLine,commSize,C.text,'left')],commLine),text('comms1','fill',commLine,commSize,C.text,'center')],{alpha:.40,padding:4,gap:1});
 const warning=card('warning','top',0,touch?35:54,portrait?'88%':300,line+16,[text('warn','fill',line,sz,C.red,'center',true)],{alpha:.91});
 const feedW=portrait?'72%':touch?300:340;
 const feed=card('feed',touch?'top-left':'top-right',m,touch?objH+upH+17:mapD+22,feedW,5*(line-2)+20,Array.from({length:5},(_,i)=>text('feed_'+i,'fill',line-2,small,C.text)),{padding:4,gap:1,alpha:0});
 const loot=card('loot','left',m,portrait?60:30,portrait?'73%':touch?290:300,9*(line-6)+12,Array.from({length:9},(_,i)=>text('loot_'+i,'fill',line-6,small,C.text)),{padding:3,gap:0,alpha:0});
 // Native variants require the same named part schema. The inactive orientation's
 // text continuations stay explicitly hidden and cannot receive input.
 const spare=portrait?['objectiveTitle','promptText','busyText','comms0','comms1']:['objectiveTitleP','objectiveTailP','promptTextP0','promptTextP1','busyTextP0','busyTextP1','commsP0','commsP1','commsP2','commsP3'];
 return {type:'panel',name:'combatHUD',width:'fill',height:'fill',layout:'free',children:[objective,uplink,vitals,ammo,prompt,busy,comms,warning,feed,loot,...spare.map(name=>({...text(name,0,0,12),visible:false}))]};
}
function splitLine(words,limit){const chars=Array.from(words);if(chars.length<=limit)return[words,''];let cut=limit;for(let i=limit-1;i>Math.floor(limit*.65);i--)if(/[\s，。；、！？,.!?;]/.test(chars[i])){cut=i+1;break;}return[chars.slice(0,cut).join('').trim(),chars.slice(cut).join('').trim()];}
function bindings(state){const textKey=key=>({text:s=>s[key]??''});const groupLabel=(zh,en)=>s=>s.lang==='zh'?zh:en;const bind={combatHUD:{label:groupLabel('行动界面','Operation HUD')},objective:{label:groupLabel('任务目标','Mission objective')},vitals:{label:groupLabel('状态','Vitals')},ammo:{label:groupLabel('装备','Equipment')},objectiveTitle:textKey('title'),objectiveTitleP:{text:s=>s.portraitTitleLines?.[0]??''},objectiveTailP:{text:s=>s.portraitTitleLines?.[1]??''},clock:textKey('clock'),uplink:{visible:s=>s.uplinkVisible,label:groupLabel('终端状态','Terminal status')},uplinkLabel:textKey('uplinkLabel'),uplinkTime:textKey('uplinkTime'),uplinkHint:textKey('uplinkHint'),uplinkValue:{value:s=>s.uplinkValue,color:s=>s.uplinkColor},armorBar:{value:s=>s.armorValue},healthBar:{value:s=>s.healthValue,color:s=>s.healthColor},armor:{text:s=>s.armor,label:s=>(s.lang==='zh'?'护甲 ':'Armor ')+s.armor},health:{text:s=>s.health,label:s=>(s.lang==='zh'?'生命 ':'Health ')+s.health},bandages:textKey('bandages'),grenades:textKey('grenades'),value:textKey('value'),weapon:textKey('weapon'),ammoCount:{text:s=>s.ammo,color:s=>s.ammoColor},reserve:textKey('reserve'),ammoNote:textKey('ammoNote'),slots:{text:s=>s.slots,visible:s=>!s.touch},prompt:{visible:s=>s.promptVisible,label:groupLabel('互动提示','Interaction prompt')},promptText:textKey('promptText'),promptValue:{value:s=>s.promptValue},busy:{visible:s=>s.busyVisible,label:groupLabel('当前进度','Current progress')},busyText:textKey('busyText'),busyValue:{value:s=>s.busyValue,color:s=>s.busyColor},comms:{visible:s=>s.commsLeft>0,label:groupLabel('无线电讯息','Radio message')},speaker:textKey('speaker'),comms0:{text:s=>s.commsLines?.[0]??''},comms1:{text:s=>s.commsLines?.[1]??''},warning:{visible:s=>s.warnLeft>0,label:groupLabel('警示','Warning')},warn:textKey('warnText'),feed:{visible:s=>s.feed.some(r=>r.ttl>0),label:groupLabel('行动记录','Event feed')},loot:{visible:s=>s.loot.some(r=>r.ttl>0),label:groupLabel('获得物资','Collected items')}};
 for(let i=0;i<4;i++)bind['commsP'+i]={text:s=>s.portraitCommsLines?.[i]??''};for(const key of ['promptText','busyText'])for(let i=0;i<2;i++)bind[key+'P'+i]={text:s=>s[key+'Lines']?.[i]??''};
 for(let i=0;i<3;i++)bind['terminal_'+i]={text:s=>s.terminals[i].text,color:s=>s.terminals[i].done?C.accent:s.terminals[i].live?C.gold:C.cyan};
 for(const [name,rows]of [['feed',state.feed],['loot',state.loot]])for(let i=0;i<rows.length;i++)bind[name+'_'+i]={text:s=>s[name][i].text,color:s=>s[name][i].color,visible:s=>s[name][i].ttl>0};return bind;
}
const drawRect=(g,x,y,w,h,c,a=1)=>{g.beginFill(c,a).drawRect(x,y,w,h).endFill();};
const drawRing=(g,x,y,r,c,a=1,w=1.5)=>{g.lineStyle(w,c,a).drawCircle(x,y,r).lineStyle(0);};
const fillCircle=(g,x,y,r,c,a=1)=>g.beginFill(c,a).drawCircle(x,y,r).endFill();
const poly=(g,p,c,a=1)=>{g.beginFill(c,a).moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)g.lineTo(p[i],p[i+1]);g.lineTo(p[0],p[1]).endFill();};

export function createCombatHud(play,{camera,stage,settings,actions={}}){
 const state=newHudState();let lang=settings.lang??'zh',t=TEXT[lang]??TEXT.en,visible=false,touch=false,disposed=false,view,hintKey='';const hints=play.hints([]);state.lang=lang;
 const sprite=(parent=play.ui)=>{const s=play.sprite(undefined,parent);s.touchEnabled=false;s.touchChildren=false;return s;};
 const root=sprite(),vignette=sprite(root),scope=sprite(root),cross=sprite(root),hit=sprite(root),hurtLayer=sprite(root),markerLayer=sprite(root),compass=sprite(root),mapRoot=sprite(root);
 root.visible=false;scope.visible=false;hit.visible=false;vignette.visible=false;
 const hurt=state.hurt.map(()=>{const red=sprite(hurtLayer),blue=sprite(hurtLayer);red.visible=blue.visible=false;return{red,blue};});
 // Compass labels and tick marks are retained; only the visible 13 headings change.
 const compassTape=sprite(compass),needle=sprite(compass),ticks=Array.from({length:13},()=>{const node=sprite(compassTape);drawRect(node.graphics,-.7,0,1.4,5,C.dim,.8);const words=play.text('',{x:0,y:13,size:15,color:C.text,bold:true,align:'center',layer:node});return{node,words,degree:-1};}),compassDots=sprite(compass),bearingText=play.text('000°',{x:0,y:46,size:11,color:C.dim,bold:true,align:'center',layer:compass});
 const dirs={zh:['北','东北','东','东南','南','西南','西','西北'],en:['N','NE','E','SE','S','SW','W','NW']};
 // A static, native vector minimap plan. Circular clip preserves the existing information extent.
 const mapBack=sprite(mapRoot),mapWindow=sprite(mapRoot),mapMask=sprite(mapRoot),mapOrbit=sprite(mapWindow),mapWorld=sprite(mapOrbit),mapRim=sprite(mapRoot),mapNorth=play.text('N',{x:0,y:0,size:16,color:C.accent,bold:true,align:'center',baseline:'middle',layer:mapRoot});
 const plan=sprite(mapWorld),MAP_SCALE=2.6;const at=(v)=>v*MAP_SCALE;drawRect(plan.graphics,at(BOUNDS.minX-4),at(BOUNDS.minZ-4),(BOUNDS.maxX-BOUNDS.minX+8)*MAP_SCALE,(BOUNDS.maxZ-BOUNDS.minZ+8)*MAP_SCALE,0x141c1e,.96);
 for(const b of BOXES){if(!b.solid||b.kind==='roof'||b.y-b.h/2>2.5||b.w>60||b.d>60)continue;drawRect(plan.graphics,at(b.x-b.w/2),at(b.z-b.d/2),Math.max(1.5,b.w*MAP_SCALE),Math.max(1.5,b.d*MAP_SCALE),b.h>3?0xaab6b0:b.h>1.6?0x788480:0x56605e,.9);}
 plan.graphics.lineStyle(2,0xc8d2cc,.72).drawRect(at(BOUNDS.minX),at(BOUNDS.minZ),(BOUNDS.maxX-BOUNDS.minX)*MAP_SCALE,(BOUNDS.maxZ-BOUNDS.minZ)*MAP_SCALE).lineStyle(0);
 const dotPools={};const dotStyles={terminal:[C.cyan,5],relay:[C.gold,6],pad:[C.accent,7],crate:[0xffbf33,2.5],enemy:[C.red,3.5],grenade:[C.text,3]};
 const makeDot=kind=>{const s=sprite(mapWorld),[color,r]=dotStyles[kind];fillCircle(s.graphics,0,0,r,color);s.visible=false;return s;};
 for(const [kind,n]of Object.entries({terminal:3,relay:1,pad:1,crate:PLACES.crates.length,enemy:MISSION.maxAlive,grenade:16}))dotPools[kind]=Array.from({length:n},()=>makeDot(kind));
 const mapCount={};let mapAt=-1,mapRadius=84;
 function dot(kind,x,z){const i=mapCount[kind]??0,pool=dotPools[kind];if(i>=pool.length)return;const s=pool[i];s.x=at(x);s.y=at(z);s.visible=true;mapCount[kind]=i+1;}
 function drawMap(game,yaw,time){for(const kind of Object.keys(dotPools))mapCount[kind]=0;const p=game.player;
  mapOrbit.rotation=yaw*180/Math.PI;mapWorld.x=-at(p.x);mapWorld.y=-at(p.z);
  for(const terminal of game.terminals)if(!terminal.done)dot('terminal',terminal.x,terminal.z);
  const relay=game.transfer()?.relay;if(relay)dot('relay',relay.x,relay.z);if(game.terminalsDone===game.terminals.length)dot('pad',PLACES.helipad.x,PLACES.helipad.z);
  for(const crate of game.crates)if(!crate.opened)dot('crate',crate.x,crate.z);for(const enemy of game.enemies)if(eligibleMapEnemy(enemy))dot('enemy',enemy.x,enemy.z);if(Math.floor(time*8)%2)for(const grenade of game.grenades)dot('grenade',grenade.x,grenade.z);
  for(const [kind,pool]of Object.entries(dotPools))for(let i=mapCount[kind];i<pool.length;i++)pool[i].visible=false;
  mapNorth.x=Math.sin(yaw)*(mapRadius-12);mapNorth.y=-Math.cos(yaw)*(mapRadius-12);
 }
 // Pool world markers and their compass equivalents, preserving only old marker conditions.
 const markers=new Map(),point=[0,0,0],projection={x:0,y:0,depth:0,inFront:false,onScreen:false},edge={};
 const makeMarker=(id,color,letter,compassOn)=>{const node=sprite(markerLayer),glyph=sprite(node),words=play.text(letter,{x:0,y:-2,size:17,color:0x102027,bold:true,align:'center',baseline:'middle',layer:node}),distance=play.text('',{x:0,y:18,size:15,color:C.text,bold:true,align:'center',layer:node});
  poly(glyph.graphics,[0,-14,14,0,0,14,-14,0],color,.96);node.visible=false;let onCompass;if(compassOn){onCompass=sprite(compassDots);poly(onCompass.graphics,[0,-7,7,0,0,7,-7,0],color);play.text(letter,{x:0,y:-1,size:9,color:0x102027,align:'center',baseline:'middle',bold:true,layer:onCompass});onCompass.visible=false;}const m={id,node,glyph,words,distance,onCompass,wasEdge:false,color,lastDistance:''};markers.set(id,m);return m;};
 ['A','B','C'].forEach((letter,i)=>makeMarker('t'+i,C.cyan,letter,true));makeMarker('relay',C.gold,'◇',true);makeMarker('pad',C.accent,'▲',true);const crateMarkers=Array.from({length:PLACES.crates.length},(_,i)=>makeMarker('c'+i,0xffbf33,'',false));
 let bearing=0,compassWidth=340,stamp='',shapeStamp='',screen,safe;
 function marker(id,x,y,z,on,label,eye){const m=markers.get(id);if(!m)return;m.node.visible=!!on;if(m.onCompass)m.onCompass.visible=false;if(!on)return;
  point[0]=x;point[1]=y;point[2]=z;projectToViewport3D(camera,point,screen.width,screen.height,projection);edgeMarker(projection,screen,safe,25,edge);m.node.x=edge.x;m.node.y=edge.y;
  const dx=x-eye.x,dz=z-eye.z,distance=label??`${Math.round(Math.hypot(dx,dz))} m`;if(distance!==m.lastDistance){m.lastDistance=distance;m.distance.text=distance;}if(edge.edge!==m.wasEdge){m.wasEdge=edge.edge;m.glyph.alpha=edge.edge ? .72 : 1;}
  if(m.onCompass){let turn=Math.atan2(dx,-dz)*180/Math.PI-bearing;turn=((turn+540)%360)-180;m.onCompass.visible=Math.abs(turn)<=80;m.onCompass.x=turn*compassWidth/160;m.onCompass.y=36;}
 }
 function layout(){screen=play.screen;safe=play.safe;const portrait=play.orientation==='portrait'||safe.height>safe.width,x=screen.x,y=screen.y,w=screen.width,h=screen.height,cx=x+w/2,cy=y+h/2;const next=[x,y,w,h,safe.x,safe.y,safe.width,safe.height,touch].join('/');if(next===stamp)return;stamp=next;syncHints();
  cross.x=hit.x=hurtLayer.x=cx;cross.y=hit.y=hurtLayer.y=cy;vignette.x=x;vignette.y=y;const g=vignette.graphics;g.clear();g.beginRadialGradientFill(w/2,h/2,w*.7,[{offset:0,color:0x690e15,alpha:0},{offset:.52,color:0x690e15,alpha:0},{offset:1,color:0x690e15,alpha:.88}],h*.7).drawRect(0,0,w,h).endFill();
  // Retained geometry for the circular scope. No screen-sized raster or texture.
  scope.x=cx;scope.y=cy;const sg=scope.graphics;sg.clear();const r=Math.min(w,h)*.475,outer=Math.hypot(w,h);for(let i=0;i<48;i++){const a=i*Math.PI*2/48,b=(i+1)*Math.PI*2/48;poly(sg,[Math.cos(a)*r,Math.sin(a)*r,Math.cos(a)*outer,Math.sin(a)*outer,Math.cos(b)*outer,Math.sin(b)*outer,Math.cos(b)*r,Math.sin(b)*r],0x080b0c,.96);}drawRing(sg,0,0,r,0x0a1819,1,3);drawRect(sg,-r,0,r*2,1,0x15201e,.72);drawRect(sg,0,-r,1,r*2,0x15201e,.72);fillCircle(sg,0,0,1.5,C.text,.9);
  const arcR=Math.min(w,h)*.34;for(const q of hurt)for(const [node,color]of [[q.red,C.red],[q.blue,C.cyan]]){const ag=node.graphics;ag.clear();ag.lineStyle(5,color,.78).drawArc(0,0,arcR,-Math.PI*.72,-Math.PI*.28).lineStyle(0);}
  compassWidth=Math.min(portrait?safe.width*.64:touch?safe.width*.29:safe.width*.28,340);compass.x=safe.x+safe.width/2;compass.y=safe.y+(portrait?320:8);compassTape.clipRect={x:-compassWidth/2,y:0,width:compassWidth,height:30};needle.graphics.clear();poly(needle.graphics,[-4,-1,4,-1,0,6],C.accent);drawRect(needle.graphics,-.6,3,1.2,24,C.text,.3);
  mapRadius=portrait?63:touch?78:82;mapRoot.x=safe.x+safe.width-mapRadius-10;mapRoot.y=safe.y+mapRadius+10+(portrait&&touch?72/Math.max(.1,play.browser.screen.scale):0);mapOrbit.scaleX=mapOrbit.scaleY=mapRadius/86;mapBack.graphics.clear();fillCircle(mapBack.graphics,0,0,mapRadius,0x10181d,.86);mapMask.graphics.clear();fillCircle(mapMask.graphics,0,0,mapRadius-2,0xffffff);mapWindow.mask=mapMask;mapRim.graphics.clear();drawRing(mapRim.graphics,0,0,mapRadius-1,C.dim,.68,1.7);poly(mapRim.graphics,[0,-8,5,6,0,3,-5,6],C.text);shapeStamp='';
 }
 function pattern(){const next=state.gap+'/'+state.hitColor+'/'+(state.hitLeft>0);if(next===shapeStamp)return;shapeStamp=next;const g=cross.graphics,k=Math.max(3,state.gap);g.clear();for(const [x,y,w,h]of [[-k-7,-.8,6,1.6],[k+1,-.8,6,1.6],[-.8,-k-7,1.6,6],[-.8,k+1,1.6,6]])drawRect(g,x,y,w,h,C.text,.9);fillCircle(g,0,0,1.05,C.text,.96);
  hit.graphics.clear();hit.graphics.lineStyle(2.2,state.hitColor,.94);for(const [sx,sy]of [[-1,-1],[1,-1],[-1,1],[1,1]])hit.graphics.moveTo(sx*5,sy*5).lineTo(sx*11,sy*11);hit.graphics.lineStyle(0);
 }
 function syncHints(){const allowed=visible&&!touch&&play.safe.width>=720&&play.safe.height>=400, key=allowed?lang:'';if(key===hintKey)return;hintKey=key;hints.set(allowed?[{action:lang==='zh'?'背包':'Backpack',key:'Tab'},{action:lang==='zh'?'暂停':'Pause',key:'Escape'}]:[]);}
 // Name only the actual painted HUD faces. Feed/loot are transparent containers
 // and the minimap/markers/crosshair are not rectangular panels.
 const paintedCards={objective:['任务目标','Mission objective'],uplink:['终端状态','Terminal status'],vitals:['状态','Vitals'],ammo:['装备','Equipment'],prompt:['互动提示','Interaction prompt'],busy:['当前进度','Current progress'],comms:['无线电讯息','Radio message'],warning:['警示','Warning']};
 let paintClaims=[];
 function releasePaintClaims(){for(const claim of paintClaims)claim.dispose();paintClaims=[];}
 function registerPaintedCards(built){
  // A portrait/tablet variant creates new Sprites. The native built callback
  // reconnects each registration to the actual face, not its semantic group.
  releasePaintClaims();
  for(const [name,labels] of Object.entries(paintedCards)){
   const face=built.get(name);
   paintClaims.push(registerScreenOccluder(face,{name:()=>labels[lang==='zh'?0:1],rect:()=>{
    const {width,height}=built.rect(name),inset=Math.min(10,width/4,height/4);
    return{x:inset,y:inset,width:width-2*inset,height:height-2*inset};
   }}));
  }
 }
 // The Play scope may be closed without an explicit HUD.dispose() call.
 play.scope.use({dispose:releasePaintClaims});
 function makeView(){releasePaintClaims();view?.close();view=play.show({label:'Operation HUD',area:'safe',root:describe(touch),portrait:describe(touch,true)},{state,bind:bindings(state),built:registerPaintedCards});if(visible)view.show();else view.hide();}
 makeView();layout();
 return {
  update(game,dt,eye){if(disposed)return;advanceHudTimers(state,dt);if(!visible)return;refreshHudState(state,game,t,touch);const key=state.commsText+'/'+(touch?1:0)+'/'+play.orientation;if(key!==state.commsKey){state.commsKey=key;state.commsLines=splitLine(state.commsText,lang==='zh'?(touch?25:34):(touch?46:64));}
   layout();if(play.orientation==='portrait'){const width=safe.width,stampText=[width,state.title,state.commsText,state.promptText,state.busyText].join('/');if(stampText!==state.portraitTextKey){state.portraitTextKey=stampText;state.portraitTitleLines=wrapHudText(state.title,Math.max(130,width*.63-23),16);state.portraitCommsLines=wrapHudText(state.commsText,Math.max(120,width*.92-14),15);for(const k of ['promptText','busyText'])state[k+'Lines']=wrapHudText(state[k],Math.max(100,width*.46-13),14);}}
   pattern();root.visible=true;cross.alpha=state.crossAlpha;cross.visible=state.crossAlpha>.02;scope.visible=state.scope;hit.visible=state.hitLeft>0;hit.alpha=state.hitLeft>0?Math.min(1,state.hitLeft*12):0;vignette.alpha=state.vignette;vignette.visible=state.vignette>.002;
   for(let i=0;i<hurt.length;i++){const a=state.hurt[i],q=hurt[i];q.red.visible=a.ttl>0&&!a.armor;q.blue.visible=a.ttl>0&&a.armor;const node=a.armor?q.blue:q.red;if(a.ttl>0){node.rotation=-a.bearing*180/Math.PI;node.alpha=Math.min(1,a.ttl/.45);}}
   bearing=(((-eye.yaw*180/Math.PI)%360)+360)%360;const rounded=Math.round(bearing)%360;if(rounded!==state.lastBearing){state.lastBearing=rounded;bearingText.text=String(rounded).padStart(3,'0')+'°';}const base=Math.round(bearing/15)*15;for(let i=0;i<ticks.length;i++){const tick=ticks[i],degree=((base+(i-6)*15)%360+360)%360;tick.node.x=(base+(i-6)*15-bearing)*compassWidth/160;if(tick.degree!==degree||tick.lang!==lang){tick.degree=degree;tick.lang=lang;tick.words.visible=degree%45===0;tick.words.text=degree%45===0?(dirs[lang]??dirs.en)[degree/45]:'';}}
   if(mapAt<0||game.t-mapAt>=1/24||game.t<mapAt){mapAt=game.t;drawMap(game,eye.yaw,game.t);}
   camera.updateViewMatrices();const active=game.transfer(),relay=active?.relay;for(let i=0;i<3;i++){const target=game.terminals[i];marker('t'+i,target?.x,1.7,target?.z,!!target&&!target.done&&(!active||active===target),undefined,eye);}marker('relay',relay?.x,1.25,relay?.z,Boolean(relay),undefined,eye);marker('pad',PLACES.helipad.x,1.2,PLACES.helipad.z,game.terminalsDone===game.terminals.length,undefined,eye);
   for(let i=0;i<crateMarkers.length;i++){const c=game.crates[i],p=game.player;marker('c'+i,c?.x,.9,c?.z,!!c&&!c.opened&&Math.hypot(c.x-p.x,c.z-p.z)<13,'',eye);}
  },
  handle(event){if(!disposed)applyHudEvent(state,event,t);},reset(){const fresh=newHudState();Object.assign(state,fresh);state.touch=touch;state.lang=lang;mapAt=-1;shapeStamp='';for(const m of markers.values()){m.node.visible=false;if(m.onCompass)m.onCompass.visible=false;}},
  setVisible(on){if(visible===!!on)return;visible=!!on;root.visible=visible;visible?view.show():view.hide();syncHints();},setTouch(on){on=!!on;if(touch===on)return;touch=on;state.touch=on;stamp='';makeView();layout();},setLanguage(next){lang=TEXT[next]?next:'en';t=TEXT[lang];state.lang=lang;for(const q of ticks)q.degree=-1;state.commsKey='';syncHints();},
  snapshot(){return{visible,touch,lang,objective:state.title,clock:state.clock,health:Number(state.health),armor:Number(state.armor),ammo:Number(state.ammo),reserve:state.reserve,weapon:state.weaponKey,prompt:state.promptVisible,scope:state.scope,mapDots:{...mapCount},markerCount:[...markers.values()].filter(m=>m.node.visible).length,root:screen&&{...screen},state:{...state,feed:state.feed.map(r=>({...r})),loot:state.loot.map(r=>({...r}))}};},
  dispose(){if(disposed)return;disposed=true;releasePaintClaims();hints.dispose();view.close();play.remove(root);}
 };
}
