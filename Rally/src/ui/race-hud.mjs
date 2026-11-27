// Native 2D race HUD. Static geometry and a single bilingual glyph atlas are
// retained; the race updates only changing label meshes, transforms and visibility.
import { DisplayObjectContainer, Shape, Sprite } from '@egret/engine';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { DRIVE, ITEMS, ITEM_KEYS, TEXT } from '../data.mjs';
import { createRaceFont } from './race-font.mjs';
import { createRaceMinimap } from './race-map.mjs';
import { bindRaceAction } from './race-touch.mjs';

const PAPER=0xf6efe0,GOLD=0xf2c230,DARK=0x141820,RED=0xd8262c;
const TIER=[0x82cbff,0xffad62,0xd8a1ff], RANK=[GOLD,0xdfe5ee,0xe6a26a];
const TOUCH=[['left','◀'],['right','▶'],['brake','▼'],['item','★'],['drift','⤴']];
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
const pos=(node,x,y)=>{node.x=x;node.y=y;};
const show=(node,visible)=>{node.visible=Boolean(visible);};
const fade=(node,value)=>{node.alpha=clamp(value);show(node,value>0);};
const rect=(x,y,width,height)=>({x,y,width,height});
const controlBounds=(node,size)=>{const p=node.localToGlobal(0,0),q=node.localToGlobal(size,size);return rect(p.x,p.y,q.x-p.x,q.y-p.y);};
export const raceClock=seconds=>{
  const n=Math.max(0,Math.round((seconds||0)*100));
  return String(Math.floor(n/6000))+':'+String(Math.floor(n/100)%60).padStart(2,'0')+'.'+String(n%100).padStart(2,'0');
};

// Compact monochrome controls, drawn in the retained native display tree rather
// than platform emoji glyphs (whose visual weight varies across devices).
function paintControlIcon(node,name,size){
  const g=node.graphics;g.clear();
  const polygon=points=>{
    g.beginFill(PAPER);
    points.forEach(([x,y],i)=>{if(i===0)g.moveTo(x*size,y*size);else g.lineTo(x*size,y*size);});
    g.lineTo(points[0][0]*size,points[0][1]*size).endFill();
  };
  if(name==='pause'){
    g.beginFill(PAPER).drawRoundRect(size*.33,size*.28,size*.12,size*.44,3)
      .drawRoundRect(size*.55,size*.28,size*.12,size*.44,3).endFill();
  }else if(name==='left')polygon([[.27,.5],[.67,.27],[.67,.73]]);
  else if(name==='right')polygon([[.73,.5],[.33,.27],[.33,.73]]);
  else if(name==='brake')polygon([[.27,.34],[.73,.34],[.5,.72]]);
  else if(name==='item'){
    polygon(Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,r=i%2?.13:.27;return [.5+Math.cos(a)*r,.5+Math.sin(a)*r];}));
  }else if(name==='drift'){
    g.lineStyle(size*.10,PAPER,1,{caps:'round',joints:'round'}).moveTo(size*.29,size*.73)
      .lineTo(size*.48,size*.73).lineTo(size*.61,size*.6).lineTo(size*.61,size*.31).lineStyle(0);
    polygon([[.42,.4],[.61,.21],[.80,.4]]);
  }
}

export async function createRaceHud(host,track,{language='zh',onTouch=()=>{},onPause=()=>{}}={}){
  const font=await createRaceFont(host),scope=host.scope,root=host.raceLayer;
  let lang=language==='en'?'en':'zh',touchRequested=false,pauseRequested=false,suspended=false;
  let now=0,tick=-1,bannerUntil=0,bannerStart=0,bannerData,rankAt=-10,lastRank=0;
  let turboUntil=0,turboLevel=0,hurtAlpha=0,lastPublish=0,lastGame,lastView,driftWidth=226,rankW=110,rankH=48;
  let hudValues={};
  const t=()=>TEXT[lang],own=value=>scope.use(value);
  const group=parent=>{const item=own(new DisplayObjectContainer());parent.addChild(item);return item;};
  const shape=parent=>{const item=own(new Shape());parent.addChild(item);return item;};
  const sprite=parent=>{const item=own(new Sprite());parent.addChild(item);return item;};
  const chip=(parent,{fill=DARK,alpha=.75,border=0xb99259,radius=9}={})=>{
    const node=shape(parent);let pw,ph;
    return {node,rect(x,y,w,h){
      pos(node,x,y);
      if(w===pw&&h===ph)return;pw=w;ph=h;
      node.graphics.clear().beginFill(fill,alpha).drawRoundRect(0,0,w,h,radius*2).endFill();
      if(border!==undefined)node.graphics.lineStyle(1,border,.72).drawRoundRect(.5,.5,Math.max(1,w-1),Math.max(1,h-1),radius*2).lineStyle(0);
    }};
  };
  const slab=(parent,color,alpha=1)=>{
    const node=shape(parent);
    node.graphics.beginFill(color,alpha).drawRect(0,0,1,1).endFill();
    return {node,rect(x,y,w,h){pos(node,x,y);node.scaleX=w;node.scaleY=h;}};
  };
  const fx=group(root);
  // All visual effects live in the same engine stage, behind the information
  // and buttons. Their paths never change after creation.
  const speedLines=shape(fx);
  {
    const g=speedLines.graphics;
    g.beginFill(0xfff5cc,.55);
    for(let i=0;i<32;i++){
      const a=i/32*Math.PI*2+.039,ux=Math.cos(a),uy=Math.sin(a),
        r0=.39+(i%4)*.025,r1=.72+(i%3)*.08,d=.0027+(i%3)*.0015;
      g.moveTo(.5+ux*r0,.5+uy*r0).lineTo(.5+ux*r1-uy*d,.5+uy*r1+ux*d)
        .lineTo(.5+ux*r1+uy*d,.5+uy*r1-ux*d).lineTo(.5+ux*r0,.5+uy*r0);
    }
    g.endFill();
  }
  const hurt=shape(fx);
  hurt.graphics.beginRadialGradientFill(.5,.5,.72,[
    {offset:0,color:RED,alpha:0},{offset:.54,color:RED,alpha:0},
    {offset:.83,color:RED,alpha:.72},{offset:1,color:RED,alpha:1}
  ]).drawRect(0,0,1,1).endFill();
  const ink=group(fx),inkNodes=[[18,30,34],[62,22,40],[40,58,46],[78,62,30],[12,70,26],[52,36,22]].map(([x,y,size],i)=>{
    const node=shape(ink),g=node.graphics;
    g.beginRadialGradientFill(0,0,.52,[
      {offset:0,color:0x12141b,alpha:1},{offset:.68,color:0x181a20,alpha:.98},
      {offset:.86,color:0x2f2b30,alpha:.92},{offset:1,color:0x4b444a,alpha:0}
    ]);
    for(let j=0;j<=20;j++){
      const a=j/20*Math.PI*2,r=.45+Math.sin(j*2.2+i)*.045+Math.cos(j*1.7-i)*.025;
      const xx=Math.cos(a)*r,yy=Math.sin(a)*r;
      if(j===0)g.moveTo(xx,yy);else g.lineTo(xx,yy);
    }
    g.endFill();
    return {node,x,y,size};
  });
  const flash=slab(fx,0xffffff);
  const placeGroup=group(root),rankPanel=chip(placeGroup,{fill:0x18212c}),place=font.label(placeGroup,'',GOLD);
  const lapGroup=group(root),lapPanel=chip(lapGroup),lap=font.label(lapGroup);
  const clockGroup=group(root),clockPanel=chip(clockGroup),time=font.label(clockGroup);
  const itemGroup=group(root),itemPanel=chip(itemGroup,{fill:0x25272d,border:0x9c906b}),itemPulse=chip(itemGroup,{fill:0x4b3b22,alpha:.58,border:GOLD}),itemIcon=font.label(itemGroup,'',0xffffff),itemCount=font.label(itemGroup,'',GOLD);
  const coinsGroup=group(root),coinsPanel=chip(coinsGroup),coinGlyph=shape(coinsGroup),coins=font.label(coinsGroup,'',GOLD);
  coinGlyph.graphics.lineStyle(1,0xb28b42,1).beginFill(GOLD).drawCircle(0,0,7).endFill().lineStyle(0).beginFill(DARK).drawRect(-2.1,-2.1,4.2,4.2).endFill();
  const speedGroup=group(root),speedPanel=chip(speedGroup,{fill:0x18212c}),speed=font.label(speedGroup),speedUnit=font.label(speedGroup,'',0xcdd5d7);
  const speedBack=slab(speedGroup,0x666e73,.62),speedFill=slab(speedGroup,GOLD),speedBoost=slab(speedGroup,0xff7752);
  let speedBarW=105;
  const minimap=createRaceMinimap(root,scope,track);
  const driftGroup=group(root),driftPanel=chip(driftGroup),driftTitle=font.label(driftGroup,'',TIER[0]),driftHint=font.label(driftGroup,'',PAPER);
  const driftBars=TIER.map(color=>({back:slab(driftGroup,0x777b80,.45),fill:slab(driftGroup,color)}));
  let driftBarW=64;
  const popups=Array.from({length:4},()=>({label:font.label(root),start:-99,data:undefined}));
  const banner=font.label(root),wrong=font.label(root,'',0xff5b48);
  const controls=new Map();
  host.addSemantic({id:'race-hud',role:'group',describe:()=>({name:lang==='zh'?'比赛信息':'Race information',hidden:!root.visible,bounds:host.metrics().safe})});
  const controlLabel=name=>name==='pause'?t().pause:t().touchControls[name];
  for(const [name] of [...TOUCH,['pause','']]){
    const node=sprite(root);node.touchChildren=false;
    const icon=shape(node);
    const item={node,icon,name,size:48,x:0,y:0,binding:undefined,iconSize:0};
    const paint=held=>{
      const size=item.size,r=size/2,g=node.graphics;
      g.clear().beginFill(held?0xb85137:0x203039,held?.92:.74).drawCircle(r,r,r-1).endFill()
        .lineStyle(2,held?GOLD:PAPER,held?1:.82).drawCircle(r,r,r-2).lineStyle(0);
      if(item.iconSize!==size){item.iconSize=size;paintControlIcon(icon,name,size);}
    };
    item.paint=paint;
    item.binding=bindRaceAction(host,node,{name,pause:name==='pause',onHeld:onTouch,onActivate:name==='pause'?onPause:undefined,onPaint:paint});
    controls.set(name,item);paint(false);
    host.addSemantic({id:'race-hud:'+name,parent:'race-hud',role:'button',
      describe:()=>({name:controlLabel(name),hidden:!root.visible||!item.binding.available,
        disabled:!item.binding.available,bounds:controlBounds(node,item.size)}),
      onActivate:()=>item.binding.activate()});
  }
  const semanticText=(id,label,{role='status',name=()=>label.text,active=()=>Boolean(label.root.visible&&label.text)}={})=>host.addSemantic({id:'race-hud:'+id,parent:'race-hud',role,
    describe:()=>({name:name(),hidden:!root.visible||!active(),bounds:semanticBoundsOf(label.root)})});
  // The race clock and speed change many times per second. They remain discoverable text instead of repeatedly announcing live regions.
  semanticText('place',place);semanticText('lap',lap);
  semanticText('clock',time,{role:'text',name:()=>t().time+' '+time.text});
  semanticText('coins',coins,{role:'text',name:()=>t().coins+' '+coins.text});
  semanticText('speed',speed,{role:'text',name:()=>speed.text+' '+t().kmh});
  semanticText('drift-status',driftTitle,{name:()=>[driftTitle.text,driftHint.text].filter(Boolean).join(' · '),active:()=>driftGroup.visible&&Boolean(driftTitle.text)});
  semanticText('banner',banner);semanticText('wrong-way',wrong);
  host.addSemantic({id:'race-hud:item-status',parent:'race-hud',role:'status',describe:()=>({
    name:hudValues.itemName||'',hidden:!root.visible||!hudValues.itemName,bounds:semanticBoundsOf(itemGroup)})});

  let popupArea={x:0,y:0,w:1,h:1},bannerArea={x:0,y:0,w:1,h:1},rankCenter={x:0,y:0},controlY=0;
  function syncControls(){
    for(const c of controls.values()){
      const offered=root.visible&&!suspended&&(c.name==='pause'?pauseRequested:host.metrics().touch&&touchRequested);
      c.binding.setAvailable(offered);
    }
    host.requestPublish();
  }
  function layout(){
    const {screen,safe,scale,touch}=host.metrics(),{x:sx,y:sy,width:w,height:h}=safe,
      right=sx+w,bottom=sy+h,mid=sx+w*.5,compact=h<440||w<520,portrait=w<520&&h>w;
    // Collision checks are based on the engine's safe rect; do not separately
    // read browser dimensions. A physical 44px target wins over a decorative gap.
    const minTarget=Math.ceil(44/Math.max(.01,scale)),desired=compact?62:70,
      controlSize=Math.max(minTarget,Math.min(desired,Math.floor((w-20-4*8)/5))),
      margin=portrait?8:12,spacing=8;
    const fxW=screen?.width??w,fxH=screen?.height??h;
    speedLines.scaleX=hurt.scaleX=fxW;speedLines.scaleY=hurt.scaleY=fxH;
    flash.rect(0,0,fxW,fxH);
    for(const {node,x,y,size} of inkNodes){pos(node,x/100*fxW,y/100*fxH);node.scaleX=node.scaleY=Math.min(fxW,fxH)*size/100;}
    const lower=compact?45:60,itemSize=portrait?66:compact?58:82,mapSize=portrait?94:compact?90:Math.min(168,Math.round(w*.17)),
      itemX=sx+margin,itemY=sy+8;
    rankW=compact?104:126;rankH=lower;
    rankCenter={x:sx+margin+rankW/2,y:bottom-8-rankH/2};
    pos(placeGroup,rankCenter.x-rankW/2,rankCenter.y-rankH/2);
    rankPanel.rect(0,0,rankW,rankH);place.rect(4,1,rankW-8,rankH-2,compact?27:36);
    const sw=compact?113:142,sh=lower;
    pos(speedGroup,right-margin-sw,bottom-8-sh);
    speedPanel.rect(0,0,sw,sh);speed.rect(5,1,sw*.61,sh-12,compact?30:38);speedUnit.rect(sw*.61,3,sw*.38-4,sh-14,compact?12:16);
    speedBarW=sw-16;speedBack.rect(8,sh-10,speedBarW,5);speedFill.rect(8,sh-10,0,5);speedBoost.rect(8,sh-10,0,5);
    pos(itemGroup,itemX,itemY);itemPanel.rect(0,0,itemSize,itemSize);itemPulse.rect(1,1,itemSize-2,itemSize-2);
    itemIcon.rect(3,0,itemSize-6,itemSize-10,itemSize*.64);
    itemCount.rect(4,itemSize-21,itemSize-9,20,20,'right');
    pos(coinsGroup,itemX,itemY+itemSize+5);coinsPanel.rect(0,0,itemSize+8,26);
    pos(coinGlyph,13,13);coins.rect(24,1,itemSize-22,24,17,'left');
    minimap.rect(right-margin-mapSize,sy+6,mapSize);
    const usableCenter=Math.max(110,w-2*margin-itemSize-mapSize-26);
    const chipH=compact?30:38,lw=portrait?Math.min(132,usableCenter):Math.min(126,usableCenter*.47),tw=portrait?lw:Math.min(146,usableCenter*.5);
    if(portrait||usableCenter<240){
      // Stack the central lap and clock on narrow phones; the item and map remain flanking.
      const cx=(itemX+itemSize+right-margin-mapSize)/2;
      pos(lapGroup,cx-lw/2,sy+8);pos(clockGroup,cx-tw/2,sy+11+chipH);
    }else{
      const lx=mid-(lw+tw+8)/2;pos(lapGroup,lx,sy+8);pos(clockGroup,lx+lw+8,sy+8);
    }
    lapPanel.rect(0,0,lw,chipH);clockPanel.rect(0,0,tw,chipH);
    lap.rect(4,0,lw-8,chipH,compact?19:23);time.rect(4,0,tw-8,chipH,compact?20:25);
    controlY=bottom-lower-14-controlSize;
    for(const [i,[name]] of TOUCH.entries()){
      const c=controls.get(name),x=i<2?sx+margin+i*(controlSize+spacing):right-margin-(5-i)*controlSize-(4-i)*spacing;
      c.x=x;c.y=controlY;c.size=controlSize;pos(c.node,x,controlY);
      c.node.hitArea=rect(0,0,controlSize,controlSize);c.node.name=controlLabel(name);
      c.paint(c.binding.held);
    }
    const pause=controls.get('pause'),pauseSize=Math.max(48,minTarget);
    pause.x=right-margin-pauseSize;pause.y=sy+mapSize+11;pause.size=pauseSize;pos(pause.node,pause.x,pause.y);
    pause.node.hitArea=rect(0,0,pauseSize,pauseSize);pause.node.name=controlLabel('pause');pause.paint(pause.binding.held);
    driftWidth=Math.min(w-2*margin,compact?246:300);
    const driftHeight=53,driftY=(touch&&touchRequested)?controlY-driftHeight-8:bottom-lower-driftHeight-18;
    pos(driftGroup,mid-driftWidth/2,driftY);driftPanel.rect(0,0,driftWidth,driftHeight);
    driftTitle.rect(7,2,driftWidth*.48,27,21,'left');driftHint.rect(driftWidth*.46,2,driftWidth*.54-7,27,15,'right');
    driftBarW=(driftWidth-22)/3;
    driftBars.forEach(({back,fill},i)=>{const x=7+i*(driftBarW+4);back.rect(x,34,driftBarW,9);fill.rect(x,34,0,9);});
    bannerArea={x:sx+Math.max(12,w*.12),y:sy+h*.26,w:w-Math.max(24,w*.24),h:Math.min(100,h*.23)};
    popupArea={x:mid-Math.min(188,w*.41),y:sy+h*.58,w:Math.min(376,w*.82),h:31};
    wrong.rect(mid-Math.min(170,w*.4),sy+h*.14,Math.min(340,w*.8),37,compact?24:31);
    syncControls();
    // Apply the last known transforms after a safe-area/orientation change.
    if(lastGame&&root.visible)refresh(lastGame,lastView??{},0,undefined,false);
  }
  function textFor(data){
    if(!data)return '';
    if(data.type==='count')return String(data.n);
    if(data.type==='lap')return t().lap+' '+data.lap+'/'+data.laps;
    if(data.type==='item')return ITEMS[data.item]?.name[lang]??'';
    if(data.type==='overtake')return t().popups.overtake+' '+(t().place[data.place-1]??'');
    if(data.type==='popup')return t().popups[data.key]??'';
    return t()[data.type]??'';
  }
  const announce=(data,seconds,kind='')=>{
    bannerData={...data,kind};bannerStart=now;bannerUntil=now+seconds;banner.setText(textFor(data));show(banner.root,true);
  };
  const popup=(data,color)=>{
    const entry=popups.find(p=>!p.data||now-p.start>=1.25)??popups.reduce((a,b)=>a.start<b.start?a:b);
    entry.start=now;entry.data=data;entry.label.setText(textFor(data));entry.label.setColor(color);show(entry.label.root,true);
  };
  const animPopups=()=>{
    let i=0;
    for(const p of popups){
      const age=now-p.start;
      if(!p.data||age>=1.25){p.data=undefined;show(p.label.root,false);continue;}
      const a=clamp(1-(age-.76)/.49),s=(.87+Math.min(1,age/.13)*.13),r=popupArea;
      p.label.rect(r.x,r.y-i*27-age*26,r.w,r.h,26*s);
      fade(p.label.root,a);i++;
    }
  };
  function refresh(game,view,dt,audio,advance=true){
    if(!game?.human)return;
    lastGame=game;lastView=view;
    if(advance)now+=dt;
    const kart=game.human;
    if(kart.place!==lastRank){lastRank=kart.place;rankAt=now;}
    place.setText(t().place[kart.place-1]??'');place.setColor(RANK[kart.place-1]??PAPER);
    const bump=view.reducedMotion?1:1+.13*Math.sin(clamp((now-rankAt)/.38)*Math.PI);
    pos(placeGroup,rankCenter.x-rankW*bump/2,rankCenter.y-rankH*bump/2);placeGroup.scaleX=placeGroup.scaleY=bump;
    lap.setText(t().lap+' '+Math.max(1,kart.lap)+'/'+game.laps);
    time.setText(raceClock(kart.finished?kart.finishTime:game.time));
    coins.setText(kart.coins+'/'+DRIVE.coinLimit);coins.setColor(kart.coins>=DRIVE.coinLimit?GOLD:PAPER);
    speed.setText(Math.round(Math.abs(kart.speed)*3.6));speedUnit.setText(t().kmh);
    const sf=clamp(Math.abs(kart.speed)/55);speedFill.node.scaleX=speedBarW*sf;speedBoost.node.scaleX=speedBarW*sf;
    show(speedFill.node,kart.boost<=0);show(speedBoost.node,kart.boost>0);
    let itemName='';
    if(kart.roulette>0){
      const next=Math.floor(now*12);if(advance&&next!==tick){tick=next;audio?.play('roulette',{tick});}
      const item=ITEMS[ITEM_KEYS[Math.max(0,tick)%ITEM_KEYS.length]];
      itemIcon.setText(item.icon);itemCount.setText('');itemName=item.name[lang];fade(itemPulse.node,.6+.35*Math.sin(now*15));
    }else if(kart.item&&ITEMS[kart.item]){
      const item=ITEMS[kart.item];itemIcon.setText(item.icon);itemCount.setText(kart.itemCount>1?'×'+kart.itemCount:'');
      itemName=item.name[lang];fade(itemPulse.node,.82);
    }else{itemIcon.setText('');itemCount.setText('');fade(itemPulse.node,0);}
    const turbo=!kart.drifting&&now<turboUntil,level=turbo?turboLevel:kart.driftLevel,showDrift=kart.drifting||turbo;
    show(driftGroup,showDrift);
    if(showDrift){
      driftTitle.setText((turbo?t().popups.turbo[level-1]:t().driftTiers[level-1])??t().driftBuild);
      driftTitle.setColor(TIER[level-1]??PAPER);
      driftHint.setText(kart.drifting&&level?t().driftRelease:'');
      driftBars.forEach(({fill},i)=>{
        const from=DRIVE.driftLevels[i-1]??0,to=DRIVE.driftLevels[i];
        const fraction=turbo?Number(i<level):clamp((kart.driftCharge-from)/(to-from));
        fill.node.scaleX=driftBarW*fraction;
      });
    }
    if(advance)hurtAlpha=Math.max(0,hurtAlpha-dt*1.6);
    fade(hurt,hurtAlpha);fade(ink,Math.min(1,(kart.inked||0)/.8));
    fade(flash.node,(view.reducedMotion?.3:1)*(view.flash||0));
    fade(speedLines,kart.boost>0||kart.cloud>0?.6:kart.draft>.3?.25:0);
    wrong.setText(kart.wrongWay?t().wrongWay:'');fade(wrong.root,kart.wrongWay?(view.reducedMotion?1:.68+.32*Math.sin(now*10)):0);
    if(bannerUntil&&now>=bannerUntil){bannerData=undefined;bannerUntil=0;banner.setText('');}
    show(banner.root,Boolean(bannerData));
    if(bannerData){
      const age=now-bannerStart,kind=bannerData.kind,base=kind==='count'?88:kind==='small'?32:56;
      const swell=view.reducedMotion?1:1+.2*Math.sin(clamp(age/.35)*Math.PI),r=bannerArea;
      banner.setColor(kind==='count'?PAPER:GOLD);banner.rect(r.x,r.y,r.w,r.h,base*swell);
    }
    animPopups();minimap.update(game);
    hudValues={place:place.text,lap:lap.text,time:time.text,speed:speed.text,coins:coins.text,itemIcon:itemIcon.text,itemCount:itemCount.text,itemName,
      drift:{visible:showDrift,level,charge:kart.driftCharge,title:driftTitle.text,hint:driftHint.text},banner:bannerData?banner.text:'',wrong:wrong.text,ink:ink.alpha,
      popups:popups.filter(x=>x.data).map(x=>x.label.text)};
    if(now-lastPublish>=.25||!advance){host.requestPublish();lastPublish=now;}
  }
  function releaseTouch(){for(const c of controls.values())c.binding.release();}
  root.visible=false;
  show(driftGroup,false);show(banner.root,false);show(wrong.root,false);fade(hurt,0);fade(ink,0);fade(flash.node,0);fade(speedLines,0);
  for(const p of popups)show(p.label.root,false);
  scope.use({dispose:host.registerLayout(layout)});
  layout();host.requestPublish();
  return {
    startRace(){
      releaseTouch();lastGame=lastView=undefined;now=0;tick=-1;bannerUntil=turboUntil=hurtAlpha=0;turboLevel=0;bannerData=undefined;rankAt=-10;lastRank=0;lastPublish=0;
      for(const p of popups){p.data=undefined;show(p.label.root,false);}
      minimap.reset();for(const l of [place,lap,time,speed,coins,itemIcon,itemCount,driftTitle,driftHint,banner,wrong])l.setText('');
      show(driftGroup,false);show(banner.root,false);show(wrong.root,false);fade(hurt,0);fade(ink,0);fade(flash.node,0);fade(speedLines,0);fade(itemPulse.node,0);
      speedFill.node.scaleX=speedBoost.node.scaleX=0;hudValues={};root.visible=true;suspended=false;layout();host.requestPublish();
    },
    endRace(){releaseTouch();root.visible=false;syncControls();lastGame=lastView=undefined;host.requestPublish();},
    update(game,view,dt,audio){if(root.visible&&!suspended)refresh(game,view,dt,audio);},
    consume(events,game){
      if(!root.visible||suspended)return;
      const mine=game.human?.index;
      for(const event of events){
        if(event.type==='count')announce({type:'count',n:event.n},.9,'count');
        else if(event.type==='go')announce({type:'go'},.65,'start-go');
        else if(event.kart!==mine)continue;
        else if(event.type==='lap'&&event.final)announce({type:'finalLap'},2.2,'final');
        else if(event.type==='lap')announce({type:'lap',lap:event.lap,laps:game.laps},1.6);
        else if(event.type==='finish')announce({type:'finish'},3,'go');
        else if(event.type==='item')announce({type:'item',item:event.item},1.1,'small');
        else if(event.type==='turbo'){turboLevel=event.level;turboUntil=now+.8;}
        else if(event.type==='boost'&&t().popups[event.source])popup({type:'popup',key:event.source},GOLD);
        else if(event.type==='overtake')popup({type:'overtake',place:event.place},0x87efb0);
        else if(event.type==='coin'&&event.full)popup({type:'popup',key:'purse'},GOLD);
        else if(event.type==='blocked')popup({type:'popup',key:'blocked'},0x87efb0);
        else if(event.type==='mud')popup({type:'popup',key:'mud'},0xe4b78d);
        else if(event.type==='hit')hurtAlpha=1;
      }
      if(events.length)host.requestPublish();
    },
    setTouchAvailable(value){value=Boolean(value);if(touchRequested!==value){touchRequested=value;layout();}},
    setRacePauseAvailable(value){pauseRequested=Boolean(value);syncControls();},
    setSuspended(value){value=Boolean(value);if(suspended!==value){suspended=value;if(value)releaseTouch();syncControls();}},
    setLanguage(value){
      const next=value==='en'?'en':'zh';if(next===lang)return;lang=next;speedUnit.setText(t().kmh);
      for(const c of controls.values())c.node.name=controlLabel(c.name);
      if(bannerData)banner.setText(textFor(bannerData));
      for(const p of popups)if(p.data)p.label.setText(textFor(p.data));
      if(root.visible&&lastGame)refresh(lastGame,lastView??{},0,undefined,false);
      host.requestPublish();
    },
    releaseTouch,
    snapshot:()=>({...hudValues,visible:root.visible,language:lang,suspended,
      touchControls:Object.fromEntries([...controls].map(([name,c])=>[name,{name:controlLabel(name),held:c.binding.held,available:c.binding.available,
        ...rect(c.x,c.y,c.size,c.size)}])),font:font.info(),map:minimap.info()})
  };
}
