// Native 2D battle layer. It reads the existing deterministic fight without changing any combat rules.
import { Sprite } from '@egret/engine';
import { createActionControl, createMovementControl } from '@egret/engine/ui';
import { ARTS, REGIMENTS, SKILLS } from './sim/regiments.mjs';
import { recoveryGuardWindow } from './sim/fight.mjs';
import { t, say } from './i18n.mjs';

const C={ink:0x1e1812,edge:0xa98b51,gold:0xf4dca3,paper:0xf7eddb,muted:0xd5c5ae,hp:0xad3b31,st:0xceac59,horse:0x79a882,danger:0xff604a,good:0x87dfa5};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const add=(parent,name)=>{const n=new Sprite();n.name=name;parent.addChild(n);return n;};
const put=(n,x,y)=>{n.x=x;n.y=y;};
const visible=(n,on)=>{n.visible=!!on;};
function box(n,w,h,fill=C.ink,edge=C.edge,alpha=.84){
  const key=[w,h,fill,edge,alpha].join(':');if(n._paint===key)return;n._paint=key;
  const g=n.graphics;g.clear();
  if(edge!==null){g.beginFill(edge,.95).drawRect(0,0,w,h).endFill();g.beginFill(fill,alpha).drawRect(1,1,w-2,h-2).endFill();}
  else g.beginFill(fill,alpha).drawRect(0,0,w,h).endFill();
}
function disk(n,r,fill,alpha=1,edge=null){
  const key=[r,fill,alpha,edge].join(':');if(n._paint===key)return;n._paint=key;
  const g=n.graphics;g.clear();if(edge!==null){g.beginFill(edge,.95).drawCircle(0,0,r).endFill();r-=2;}
  g.beginFill(fill,alpha).drawCircle(0,0,r).endFill();
}
function word(game,parent,value='',opt={}){
  return game.text(value,{size:15,color:C.paper,layer:parent,fontFamily:'serif',...opt});
}
function txt(label,value){const next=String(value??'');if(label.text!==next)label.text=next;}
function fit(label,w,max,min=10){label.size=Math.min(max,Math.max(min,(w-8)/Math.max(4,[...label.text].length*.75)));}
function tag(game,parent,name,w,h,value='',options={}){
  const root=add(parent,name),bg=add(root,'frame'),label=word(game,root,value,{x:w/2,y:h/2,align:'center',baseline:'middle',bold:true,...options});
  box(bg,w,h);return {root,bg,label,w,h,resize(w,h){this.w=w;this.h=h;box(bg,w,h);put(label,w/2,h/2);}};
}
function gauge(game,parent,name,w,h,color,{number=false,trail=false}={}){
  const root=add(parent,name),base=add(root,'background'),lag=add(root,'trail'),fill=add(root,'fill');
  box(base,w,h,C.ink,C.edge,.9);box(lag,w-4,h-4,0x654b3e,null,.95);box(fill,w-4,h-4,color,null,1);put(lag,2,2);put(fill,2,2);visible(lag,trail);
  const label=number?word(game,root,'',{x:w/2,y:h/2,size:12,bold:true,align:'center',baseline:'middle'}):null;
  return {root,label,set(v,total,shown=v,low=false){const k=clamp(total?v/total:0,0,1);fill.scaleX=Math.max(.0001,k);visible(fill,k>0);if(trail)lag.scaleX=Math.max(.0001,clamp(total?shown/total:0,0,1));
    if(label){txt(label,Math.max(0,Math.round(v))+'/'+Math.round(total));label.color=low?C.danger:C.paper;}}};
}
// The native layer's unit is a CSS pixel. All sizing comes from the current engine plan.
export function hudMetrics(game){
  const s=game.screen,a=game.safe,scale=game.browser.screen.scale,L=(a.x-s.x)*scale,T=(a.y-s.y)*scale;
  const w=s.width*scale,h=s.height*scale,aw=a.width*scale,ah=a.height*scale;
  return {scale,screen:{left:0,top:0,right:w,bottom:h,width:w,height:h},safe:{left:L,top:T,right:L+aw,bottom:T+ah,width:aw,height:ah},
    project:(x,y)=>[s.x+x/scale,s.y+y/scale]};
}
function cssLayer(game,root){const m=hudMetrics(game);put(root,game.screen.x,game.screen.y);root.scaleX=root.scaleY=1/m.scale;return m;}
const hitBox=(x,y,width,height)=>({x,y,width,height});
export function touchLayout(safe,ids){
  const {left,top,right,bottom,width,height}=safe,short=height<470;
  const cols=width>=650?4:3,gap=5,size=short?48:clamp(Math.floor(width*.15),48,62);
  const rows=Math.ceil(ids.length/cols),bx=right-8-cols*size-(cols-1)*gap,by=bottom-8-rows*size-(rows-1)*gap;
  const stickSize=short?104:120,result={stick:hitBox(left+9,bottom-stickSize-9,stickSize,stickSize),pause:hitBox(right-56,top+6,48,48)};
  const lookTop=top+60,lookX=left+width*.45;result.look=hitBox(lookX,lookTop,right-8-lookX,Math.max(44,by-7-lookTop));
  ids.forEach((id,i)=>{result[id]=hitBox(bx+i%cols*(size+gap),by+Math.floor(i/cols)*(size+gap),size,size);});
  return result;
}
function targetBox(node,b){put(node,b.x,b.y);node.hitArea={x:0,y:0,width:b.width,height:b.height};}
function polygon(g,points,color,alpha=1){g.beginFill(color,alpha).moveTo(...points[0]);for(let i=1;i<points.length;i++)g.lineTo(...points[i]);g.lineTo(...points[0]).endFill();}
function line(g,points,color,width=2,alpha=1){g.lineStyle(width,color,alpha).moveTo(...points[0]);for(let i=1;i<points.length;i++)g.lineTo(...points[i]);g.lineStyle(0);}
const CROSS={R:[[18,-8],[43,0],[18,8]],L:[[-18,-8],[-43,0],[-18,8]],O:[[-8,-18],[0,-43],[8,-18]],T:[[-8,18],[0,43],[8,18]]};
const PREP={R:[[56,-8],[47,0],[56,8]],L:[[-56,-8],[-47,0],[-56,8]],O:[[-8,-56],[0,-47],[8,-56]],T:[[-8,56],[0,47],[8,56]]};
function itemIcon(node,name){
  if(!name)return;const g=node.graphics,c=C.gold;
  if(name==='shield'){g.lineStyle(2,c,.9).drawCircle(0,0,11).drawCircle(0,0,3).lineStyle(0);return;}
  if(name==='dressing'){line(g,[[-5,-9],[5,-9],[5,-6],[7,-6],[7,10],[-7,10],[-7,-6],[-5,-6],[-5,-9]],c);line(g,[[-4,3],[4,3]],c);line(g,[[0,-1],[0,7]],c);return;}
  if(name==='bow'){line(g,[[-6,-12],[3,-8],[7,0],[3,8],[-6,12],[-6,-12]],c,1.5);line(g,[[-9,0],[11,0]],c);return;}
  line(g,[[-10,12],[8,-8]],c,2);polygon(g,[[4,-5],[13,-14],[11,-3]],c);
  if(name==='axe')polygon(g,[[4,-7],[12,-8],[14,0],[6,3]],c);
  else if(name==='ji')line(g,[[4,-7],[0,-2],[3,4],[10,2]],c);
  else line(g,[[-7,5],[0,12]],c);
}
function nativeBounds(node){
  const b=node.hitArea??node.getBounds(),ps=[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>node.localToGlobal(x,y));
  const x=Math.min(...ps.map(p=>p.x)),y=Math.min(...ps.map(p=>p.y));
  return {x,y,width:Math.max(...ps.map(p=>p.x))-x,height:Math.max(...ps.map(p=>p.y))-y};
}


export function createHud(game,{touch=false,semantics}={}){
  const root=add(game.ui,'battle-hud'),panels=add(root,'battle-panels'),plates=add(panels,'foes'),
    compass=add(panels,'compass'),me=add(panels,'fighter-status'),equipment=add(panels,'equipment'),
    keys=add(panels,'key-hints'),cross=add(root,'direction-cue'),shape=add(cross,'cross'),numbers=add(panels,'floating-values');
  visible(root,false);
  const compassBg=add(compass,'frame'),needle=add(compass,'needle');box(needle,2,24,C.gold,null,1);
  let cw=300;
  const ticks=Array.from({length:25},(_,i)=>({mark:add(compass,'tick-'+i),label:word(game,compass,'',{size:11,align:'center',color:C.muted})}));
  const exit=add(compass,'route-gate');disk(exit,4,C.good,.95);visible(exit,false);
  const meBg=add(me,'frame'),name=word(game,me,'',{x:8,y:4,bold:true,size:16}),arms=word(game,me,'',{x:8,y:23,size:11,color:C.muted});
  const hp=gauge(game,me,'health',194,17,C.hp,{number:true,trail:true}),st=gauge(game,me,'stamina',194,13,C.st,{number:true});
  put(hp.root,8,40);put(st.root,8,61);
  const horse=add(me,'horse'),horseTitle=word(game,horse,'',{x:8,y:0,size:12,color:C.muted}),pace=word(game,horse,'',{x:200,y:0,size:12,align:'right',color:C.gold});
  const horseHp=gauge(game,horse,'horse-hp',194,12,C.horse,{number:true}),horseSt=gauge(game,horse,'horse-st',194,6,C.st);
  put(horse,0,79);put(horseHp.root,8,16);put(horseSt.root,8,31);
  const skills=add(equipment,'skills'),slots=add(equipment,'slots'),modeLine=word(game,keys,'',{size:12,bold:true,align:'right',color:C.gold});
  const keyLabels=Array.from({length:15},(_,i)=>word(game,keys,'',{y:19+i*17,size:12,align:'right'}));
  const tell=tag(game,cross,'incoming',280,28,'',{size:14}),cover=tag(game,cross,'recovery',300,26,'',{size:13,color:C.gold});
  const banner=add(root,'banner'),bannerBg=add(banner,'frame'),bannerTitle=word(game,banner,'',{size:42,bold:true,align:'center'}),bannerSub=word(game,banner,'',{size:16,align:'center',color:C.muted});
  const toast=tag(game,root,'feedback',300,26,'',{size:14}),hint=tag(game,root,'click-hint',300,35,'',{size:15}),objective=tag(game,panels,'objective',320,28,'',{size:13,color:C.gold});
  const pool=Array.from({length:24},()=>({label:word(game,numbers,'',{size:19,bold:true,align:'center',color:C.gold}),life:0,x:0,y:0}));
  for(const n of pool)visible(n.label,false);
  for(const n of [tell.root,cover.root,banner,toast.root,hint.root,objective.root])visible(n,false);
  let currentHero=null,meShown=0,plateViews=[],slotViews=[],skillViews=[],bannerTimer=0,toastTimer=0,kind='',layoutKey='';
  function place(force=false){
    const m=cssLayer(game,root),a=m.safe,mid=a.left+a.width/2,k=[a.left,a.top,a.width,a.height,touch,currentHero?.horse?1:0].join(':');
    if(!force&&layoutKey===k)return m;layoutKey=k;
    const short=a.height<440,portrait=a.height>a.width;
    cw=Math.min(touch&&portrait?a.width-24:300,Math.max(132,a.width-(touch&&!portrait?310:42)));
    box(compassBg,cw,34,C.ink,C.edge,.70);put(compass,mid-cw/2,a.top+5);put(needle,cw/2-1,1);
    box(meBg,210,currentHero?.horse?122:79,C.ink,C.edge,.76);
    put(me,a.left+8,touch?(portrait?a.top+46:a.top+7):a.bottom-(currentHero?.horse?136:91));
    const sw=Math.max(1,slotViews.length*38-4),aw=Math.max(1,skillViews.length*92-4),w=Math.max(sw,aw);
    visible(equipment,!touch);const scale=touch?1:clamp((a.width-260)/w,.6,1);equipment.scaleX=equipment.scaleY=scale;
    put(equipment,mid-w*scale/2,a.bottom-90*scale);put(slots,(w-sw)/2,42);put(skills,(w-aw)/2,0);
    put(keys,a.right-14,a.top+Math.max(45,(a.height-245)/2));
    const cx=m.screen.width/2,cy=m.screen.height/2;put(cross,cx,cy);cross.scaleX=cross.scaleY=short?.78:1;
    const msgW=Math.min(310,a.width-20);tell.resize(msgW,28);cover.resize(msgW,26);
    put(tell.root,-msgW/2,-91);put(cover.root,-msgW/2,62);toast.resize(msgW,26);hint.resize(msgW,35);
    put(toast.root,mid-msgW/2,Math.min(a.bottom-40,cy+82));put(hint.root,mid-msgW/2,cy+46);
    const objW=Math.min(320,a.width-16);objective.resize(objW,28);put(objective.root,mid-objW/2,a.top+(touch&&portrait?174:43));
    put(banner,mid,a.top+(kind==='start'?(short?40:53):a.height*.25));
    const size=Math.min(kind==='start'?38:64,Math.max(24,a.width*.075));bannerTitle.size=size;put(bannerTitle,0,0);put(bannerSub,0,size+7);
    const bw=Math.min(a.width-16,Math.max(270,a.width*.52));box(bannerBg,bw,size+30,C.ink,null,.55);put(bannerBg,-bw/2,-3);
    return m;
  }
  const stopResize=game.browser.onScreenChange(()=>place(true));
  function setup(fight){
    currentHero=fight.hero;meShown=currentHero.hp;
    for(const p of plateViews){p.root.dispose();p.mark.dispose();}
    for(const p of [...slotViews,...skillViews])p.root.dispose();
    const h=fight.hero,r=REGIMENTS[h.regiment];txt(name,say(r.name));txt(arms,say(r.arms));fit(arms,194,11,9);txt(horseTitle,t('horse'));visible(horse,!!h.horse);
    plateViews=fight.men.filter(m=>m.side==='foe').map((man,i)=>{
      const node=add(plates,'foe-'+i),bg=add(node,'frame'),label=word(game,node,'',{x:66,y:3,align:'center',size:12,bold:man.rank==='boss'});
      box(bg,132,man.horse?37:29,C.ink,man.rank==='boss'?C.gold:C.edge,.72);
      const n=man.titleKey?t(man.titleKey):say(REGIMENTS[man.regiment].name);txt(label,man.rank==='troop'?t('expeditionTroop',{name:n}):n);fit(label,130,12,9);
      const hp=gauge(game,node,'hp',126,7,C.hp,{trail:true});put(hp.root,3,19);
      const hhp=man.horse?gauge(game,node,'horse-hp',126,5,C.horse):null;if(hhp)put(hhp.root,3,29);
      const mark=add(compass,'mark-'+i);disk(mark,man.rank==='boss'?4:3,C.danger,.9);
      visible(node,false);return {root:node,man,mark,hp,hhp,shown:man.hp};
    });
    const itemNames={yulin:['sabre','shield'],tiger:['jian',null],vanguard:['axe',null],plume:['ji',null],archer:['bow','knife']}[h.regiment];
    slotViews=Array.from({length:10},(_,i)=>{
      const node=add(slots,'slot-'+i),bg=add(node,'frame'),symbol=add(node,'icon'),item=i===0?itemNames[0]:i===1?itemNames[1]:i===2?'dressing':null;
      itemIcon(symbol,item);put(symbol,17,18);word(game,node,String((i+1)%10),{x:3,y:1,size:10,color:C.muted});
      const count=word(game,node,'',{x:31,y:24,size:11,bold:true,align:'right'});
      put(node,i*38,0);box(bg,34,36,C.ink,item?C.edge:0x554837,item ? .85 : .42);
      return {root:node,bg,item,count};
    });
    skillViews=[0,1,'art',...(ARTS[h.r.offArt]?['off']:[])].map((slot,i)=>{
      const node=add(skills,'ability-'+slot),bg=add(node,'frame'),isArt=slot==='art'||slot==='off';
      word(game,node,slot==='art'?'X':slot==='off'?'Z':slot===0?'R':'T',{x:4,y:2,size:11,bold:true,color:C.gold});
      const title=word(game,node,'',{x:44,y:4,size:12,align:'center',bold:true}),note=word(game,node,'',{x:44,y:18,size:10,align:'center',color:C.muted});
      const meter=gauge(game,node,'progress',80,6,C.st);put(meter.root,4,32);put(node,i*92,0);box(bg,88,40);
      return {root:node,bg,title,note,meter,slot,art:isArt};
    });
    visible(objective.root,false);visible(exit,false);for(const n of pool){n.life=0;visible(n.label,false);}place(true);
  }
  function paintCross(selected,prepared,threat,guard,locked,bow,draw,window){
    const steps=Math.round(clamp(draw||0,0,1)*18),k=[selected,prepared,threat,guard,locked,bow,steps,window].join(':');
    if(shape._paint===k)return;shape._paint=k;const g=shape.graphics;g.clear();
    for(const [l,points] of Object.entries(CROSS)){
      const active=l===(prepared??selected),danger=l===threat;
      polygon(g,points,danger?C.danger:active?C.paper:0xffffff,bow ? .25 : active||danger ? .95 : .24);
      if(l===prepared)line(g,PREP[l],C.gold,2.3);
    }
    g.beginFill(locked?C.danger:C.paper,.95).drawCircle(0,0,2.5).endFill();
    if(guard||window||bow)g.lineStyle(window?2.8:2,window?C.gold:C.muted,.8).drawCircle(0,0,30).lineStyle(0);
    if(bow&&steps>0)line(g,Array.from({length:steps+1},(_,i)=>[Math.sin(i/18*Math.PI*2)*30,-Math.cos(i/18*Math.PI*2)*30]),C.gold,3);
  }


  const arrows={R:'→',L:'←',O:'↑',T:'↓'};
  function update(dt,fight,{line:selected,preparedLine,incoming,guard,locked,project,yaw=0,input={}}){
    const h=fight.hero,m=place(),a=m.safe;
    visible(panels,!input.hidePanels);
    meShown=meShown?meShown+(h.hp-meShown)*(1-Math.exp(-dt*3)):h.hp;
    hp.set(h.hp,h.maxHp,meShown);st.set(h.st,h.maxSt,h.st,h.st<25);
    if(h.horse){
      horseHp.set(h.horse.hp,h.horse.maxHp);horseSt.set(h.horse.st,100);horse.alpha=h.horse.alive?(h.mounted?1:.68):.35;
      const key=!h.mounted||!h.horse.alive?'':h.horse.speed<-.12?'horseReverse':h.horse.galloping?'horseGallop':'';
      txt(pace,key?t(key):'');
    }
    const heading=(((-yaw*180/Math.PI)%360)+360)%360,quarters=t('compass').split(','),center=cw/2;
    ticks.forEach((tick,i)=>{
      const deg=(Math.floor(heading/15)-12+i)*15,x=center+(deg-heading)*2,q=((deg%360)+360)%360,major=q%90===0;
      visible(tick.mark,x>=5&&x<=cw-5);visible(tick.label,major&&x>=12&&x<=cw-12);
      box(tick.mark,major?2:1,major?9:q%45===0?6:4,C.muted,null,.85);put(tick.mark,x,20);
      if(major){txt(tick.label,quarters[q/90]??'');put(tick.label,x,5);}
    });
    function bearing(node,x,z,on){
      const off=wrap(Math.atan2(x-h.x,z-h.z)-yaw),p=center-off*180/Math.PI*2;
      visible(node,on&&p>6&&p<cw-6);put(node,p,30);node.alpha=Math.abs(off)>Math.PI/2?.5:1;
    }
    visible(exit,false);if(fight.exit)bearing(exit,fight.exit.x,fight.exit.z,!plateViews.some(p=>p.man.alive));
    for(const p of plateViews){
      const man=p.man;p.shown+=(man.hp-p.shown)*(1-Math.exp(-dt*3));p.hp.set(man.hp,man.maxHp,p.shown);
      if(p.hhp){p.hhp.set(man.horse.hp,man.horse.maxHp);visible(p.hhp.root,man.mounted);}
      const at=project?.([man.x,(man.floor??0)+(man.mounted?3.05:2.15),man.z]);
      const on=!!at&&man.alive&&!man.waiting&&at[0]>=a.left+66&&at[0]<=a.right-66&&at[1]>=a.top+39&&at[1]<=a.bottom;
      visible(p.root,on);if(on)put(p.root,at[0]-66,at[1]-(man.horse?37:29));
      bearing(p.mark,man.x,man.z,man.alive&&!man.waiting);
    }
    const inHand=h.regiment==='archer'?(h.knife?1:0):0;
    slotViews.forEach((s,i)=>{box(s.bg,34,36,i===inHand?0x65513a:C.ink,i===inHand?C.gold:s.item?C.edge:0x554837,s.item?.length ? .85 : .42);if(i===2){txt(s.count,h.dressings);s.root.alpha=h.dressings>0?1:.42;}});
    for(const s of skillViews){
      const id=s.slot==='art'?(h.mounted?h.r.mountedArt:h.r.art):s.slot==='off'?h.r.offArt:h.skills[s.slot],item=(s.art?ARTS:SKILLS)[id];
      txt(s.title,item?say(item.name):t('noArt'));fit(s.title,80,12,8);
      if(!item){s.root.alpha=.42;txt(s.note,'');s.meter.set(0,1);continue;}
      const wait=(s.art?h.artCool[id]:h.cool[s.slot])??0,note=s.art&&item.mounted&&(h.horse?.speed??0)<item.run?t('needRun'):!s.art&&h.mounted?t('needFoot'):'';
      txt(s.note,note||(wait>0?String(Math.ceil(wait)):''));fit(s.note,80,10,8);
      const value=s.art?(item.rage?Math.min(1,h.rage/item.rage):1):1-clamp(wait/item.cool,0,1);
      s.meter.set(value,1);const ready=s.art&&value>=1&&wait<=0;
      box(s.bg,88,40,note?0x302923:ready?0x735132:C.ink,ready?C.gold:C.edge,.86);s.root.alpha=note?.7:1;
    }
    visible(keys,!touch&&!!input.keyHints);
    if(!touch){
      txt(modeLine,'B '+(input.combo?t('combo'):t('single'))+'  V '+(input.view==='first'?t('viewFirst'):t('viewThird'))+(locked?'  '+t('lock'):''));
      const motion=h.mounted?[['W S',t('horseRein')],['A D',t('horseSteer')],['Shift',t('horseGallop')]]:[['F',t('kick')],['Space',t('jump')],['Shift',t('sprint')]];
      const rows=[['X',t('art')],...(ARTS[h.r.offArt]?[['Z',t('artShield')]]:[]),['R T',t('skills')],...motion,['1 2',t('weapons')],['3',t('dressing')]];
      if(h.horse)rows.unshift(['E',h.mounted?t('getDown'):t('mountUp')],['U',t('callHorse')]);rows.push(['Tab',t('hidePanels')],['Esc',t('menu')]);
      txt(keyLabels[0],t('keysTitle')+' · Ctrl+H');keyLabels.slice(1).forEach((l,i)=>{const r=rows[i];txt(l,r?r.join('  '):'');visible(l,!!r);});
    }
    const bow=h.regiment==='archer'&&!h.knife,guardLine=bow?null:incoming?.line,window=recoveryGuardWindow(h);
    paintCross(selected,preparedLine,guardLine,guard,locked,bow,h.draw?Math.min(1,h.draw.t/h.r.bow.draw):0,window);
    visible(tell.root,!!incoming);
    if(incoming){
      if(bannerTimer>0&&kind==='start'){visible(banner,false);bannerTimer=0;}
      const skill=SKILLS[incoming.id]??ARTS[incoming.id],action=guardLine?t('guard')+' '+arrows[guardLine]:t('evade'),label=skill?say(skill.name):incoming.kind==='kick'?t('kick'):'';
      txt(tell.label,label?action+' · '+label:action);fit(tell.label,tell.w,14,10);
      box(tell.bg,tell.w,tell.h,incoming.progress>=.68?0x6c241b:0x3d1713,C.danger,.94);
    }
    visible(cover.root,window);
    if(window){txt(cover.label,t(h.prev?.guard?'guardRecoveryRetry':'guardRecovery'));fit(cover.label,cover.w,13,10);}
    if(bannerTimer>0){bannerTimer-=dt;visible(banner,bannerTimer>0);}
    if(toastTimer>0){toastTimer-=dt;visible(toast.root,toastTimer>0);}
    for(const n of pool)if(n.life>0){n.life-=dt;visible(n.label,n.life>0);if(n.life>0){put(n.label,n.x,n.y-(.9-n.life)*32);n.label.alpha=Math.min(1,n.life*4);}}
  }
  const handles=[];
  if(semantics)for(const [id,node,label,value] of [['hp',hp.root,()=>t('health'),()=>currentHero?.hp],['st',st.root,()=>t('stamina'),()=>currentHero?.st]]){
    handles.push(semantics.add({id:'battle-'+id,role:'text',describe:()=>({name:label()+' '+Math.round(value()??0),hidden:!root.visible||!panels.visible,bounds:nativeBounds(node)})}));
  }
  return {
    root,setup,update,show(on){visible(root,on);if(on)place(true);},
    objective(value){txt(objective.label,value);fit(objective.label,objective.w,13,10);visible(objective.root,!!value);},
    banner(value,sub='',seconds=2.2,type=''){kind=type;bannerTimer=seconds;txt(bannerTitle,value);txt(bannerSub,sub);bannerTitle.color=kind==='lose'?C.danger:C.gold;visible(banner,true);place(true);},
    hideBanner(){visible(banner,false);bannerTimer=0;},
    toast(value,type=''){txt(toast.label,value);fit(toast.label,toast.w,14,10);toast.label.color=type==='bad'?C.danger:type==='good'?C.good:C.paper;toastTimer=.9;visible(toast.root,true);},
    number(at,value,type=''){if(!at)return;const n=pool.find(x=>x.life<=0)??pool.reduce((a,b)=>a.life<b.life?a:b);n.x=at[0];n.y=at[1];n.life=.9;visible(n.label,true);txt(n.label,value);n.label.color=type.includes('bad')?C.danger:type==='horse'?C.horse:type.includes('crit')?C.gold:C.paper;put(n.label,n.x,n.y);n.label.alpha=1;},
    hint(value){txt(hint.label,value);fit(hint.label,hint.w,15,10);visible(hint.root,!!value);},
    snapshot(){return {visible:root.visible,skillCount:skillViews.length,slotCount:slotViews.length,compass:compass.visible,plates:plateViews.length};},
    touch,dispose(){stopResize();for(const h of handles)h.remove();root.dispose();}
  };
}

// Retain exact routed session ownership. A terminal that cannot reach its retired target cancels.
function own(pointer,target,{begin,move,end,cancel}){
  let owner=null,enabled=true;
  const stop=()=>{if(owner!==null){owner=null;cancel?.();}};
  const terminal=(contact,commit)=>{if(owner!==contact.session)return;owner=null;(commit?end:cancel)?.(contact);};
  const removers=[target.on(pointer.events.begin,({payload:p})=>{if(!enabled||owner!==null)return;owner=p.session;begin?.(p);}),
    target.on(pointer.events.move,({payload:p})=>{if(owner===p.session)move?.(p);}),
    target.on(pointer.events.end,({payload:p})=>terminal(p,true)),
    target.on(pointer.events.cancel,({payload:p})=>terminal(p,false)),
    pointer.observe(n=>{if(owner===n.contact.session&&(n.kind==='end'||n.kind==='cancel')){owner=null;cancel?.(n.contact);}})];
  return {cancel:stop,setEnabled(on){enabled=!!on;if(!on)stop();},dispose(){stop();for(const f of removers)f();}};
}


// Each control uses the native routed input. Bespoke move/hold behavior is game logic, not a second host input path.
export function createTouchControls(game,input,{onPause=()=>{},semantics}={}){
  const root=add(game.ui,'touch-controls'),pointer=game.browser.pointer,st=input.state,targets={},handles=[],owners=[],controls=[],display={};
  let shown=false,hero=null,layout='',mountAction='mount';
  const look=targets.look=add(root,'touch-look');look.touchEnabled=true;
  const stick=targets.stick=add(root,'touch-stick'),stickBase=add(stick,'base'),thumb=add(stick,'thumb');stick.touchEnabled=true;
  const spec=[['attack','attack'],['guard','guard'],['kick','kick'],['step','jump'],['skill0','skills'],['skill1','skills'],['art','art'],['offArt','artShield'],['swap','swap'],['mount','mountUp'],['heal','dressing'],['pause','paused']];
  for(const [id,key] of spec){
    const node=targets[id]=add(root,'touch-'+id),bg=add(node,'frame'),label=word(game,node,t(key),{align:'center',baseline:'middle',size:14,bold:true}),sub=word(game,node,'',{align:'center',baseline:'middle',size:10,color:C.gold});
    display[id]={node,bg,label,sub,key,enabled:true,w:48,h:48};node.touchEnabled=true;
  }
  function style(id,{active=false,ready=false,waiting=false,disabled=false,highlight=false}={}){
    const d=display[id],color=disabled?0x393530:active?0x98743e:ready?0x655137:waiting?0x3c342c:0x34281e;
    box(d.bg,d.w,d.h,color,highlight||active||ready?C.gold:C.edge,.9);d.node.alpha=disabled?.48:1;
    d.enabled=!disabled;d.node.touchEnabled=!disabled;d.label.color=disabled?C.muted:C.paper;
  }
  const markDevice=()=>{st.lastDevice='touch';};
  let lastLook=null,attackAt=null,strikeLine=null,holding=false,holdTimer=0;
  const cssPoint=p=>[p.globalX*game.browser.screen.scale,p.globalY*game.browser.screen.scale];
  const movement=createMovementControl({input:pointer,target:stick,radius:50/game.browser.screen.scale,deadZone:0,onMovement:({x,y})=>{
    st.touch.move=[x,y];if(shown)markDevice();const half=(stick.hitArea?.width??104)/2;put(thumb,half+x*36,half+y*36);
  }});
  controls.push(movement);owners.push(own(pointer,stick,{begin:markDevice}));
  owners.push(own(pointer,look,{begin(p){lastLook=cssPoint(p);markDevice();},move(p){
    if(!lastLook)return;const at=cssPoint(p);st.yaw-=(at[0]-lastLook[0])*.006;st.pitch=clamp(st.pitch+(at[1]-lastLook[1])*.004,-.35,.75);lastLook=at;
  },end(){lastLook=null;},cancel(){lastLook=null;}}));
  function finishAttack(commit=false){
    clearTimeout(holdTimer);holdTimer=0;
    if(commit&&!holding){st.touch.tapAttack=true;st.touch.strikeLine=strikeLine;}
    input.endHeldTouchAttack(commit);attackAt=null;strikeLine=null;holding=st.touch.attack=false;style('attack');
  }
  owners.push(own(pointer,targets.attack,{begin(p){
    attackAt=cssPoint(p);markDevice();style('attack',{active:true});
    holdTimer=setTimeout(()=>{if(!shown||!attackAt)return;holding=st.touch.attack=true;input.beginHeldTouchAttack(strikeLine);},200);
  },move(p){
    if(!attackAt||holding&&strikeLine!==null)return;const at=cssPoint(p),dx=at[0]-attackAt[0],dy=at[1]-attackAt[1];
    if(Math.hypot(dx,dy)>22){if(st.touch.bow&&!holding)clearTimeout(holdTimer);strikeLine=Math.abs(dx)>Math.abs(dy)?dx>0?'R':'L':dy<0?'O':'T';if(holding)input.aimHeldTouchAttack(strikeLine);}
  },end(){finishAttack(true);},cancel(){finishAttack(false);}}));
  owners.push(own(pointer,targets.guard,{begin(){markDevice();st.touch.guard=st.touch.tapGuard=true;style('guard',{active:true});},
    end(){st.touch.guard=false;style('guard');},cancel(){st.touch.guard=st.touch.tapGuard=false;style('guard');}}));
  // Original action buttons fire on down; the engine owns pressed state and cancellation.
  for(const id of ['kick','step','skill0','skill1','art','offArt','swap','mount','heal','pause']){
    const control=createActionControl({input:pointer,target:targets[id],activation:id==='pause'?'releaseInside':'capturedRelease',
      onPressChange(down){if(!shown)return;if(!down){style(id);return;}markDevice();style(id,{active:true});if(id!=='pause')st.once[id==='mount'?mountAction:id]=true;},
      onActivate(){if(id==='pause'&&shown){markDevice();onPause('touch');}}});
    controls.push(control);display[id].control=control;
  }
  function shownIds(){
    return spec.map(([id])=>id).filter(id=>id!=='pause'&&(!hero||id!=='swap'||hero.regiment==='archer')&&(!hero||id!=='mount'||hero.horse)
      &&(!hero||id!=='art'||ARTS[hero.r.art]||ARTS[hero.r.mountedArt])&&(!hero||id!=='offArt'||ARTS[hero.r.offArt]));
  }
  function place(force=false){
    const m=cssLayer(game,root),a=m.safe,ids=shownIds(),key=[a.left,a.top,a.width,a.height,m.scale,...ids].join(':');
    if(!force&&key===layout)return;layout=key;
    const b=touchLayout(a,ids);targetBox(look,b.look);targetBox(stick,b.stick);
    const r=b.stick.width/2;disk(stickBase,r-2,0x352b24,.54,C.edge);put(stickBase,r,r);disk(thumb,r*.39,0xa68c61,.8,C.gold);put(thumb,r+st.touch.move[0]*36,r+st.touch.move[1]*36);
    movement.setGeometry({radius:50/m.scale,deadZone:0});
    for(const [id] of spec){
      const d=display[id],v=b[id];visible(d.node,!!v);if(!v){d.control?.setEnabled(false);continue;}
      targetBox(d.node,v);d.w=v.width;d.h=v.height;put(d.label,v.width/2,v.height/2);put(d.sub,v.width/2,v.height-11);d.label.size=14;style(id);
      d.control?.setEnabled(shown);
    }
  }
  function reset(){
    for(const o of owners)o.cancel();
    movement.setEnabled(false);st.touch.move=[0,0];st.touch.tapAttack=st.touch.tapGuard=false;st.touch.strikeLine=null;
    if(shown)movement.setEnabled(true);
    for(const c of controls)if(c!==movement){c.setEnabled(false);if(shown)c.setEnabled(true);}
    const b=stick.hitArea;if(b)put(thumb,b.width/2,b.height/2);
  }
  const stopClear=input.onClear(reset),stopResize=game.browser.onScreenChange(()=>{reset();place(true);});
  if(semantics){
    for(const [id,key] of spec){
      const d=display[id];handles.push(semantics.add({id:'battle-touch-'+id,role:'button',describe:()=>({name:d.label.text||t(key),hidden:!shown||!d.node.visible,disabled:!d.enabled,bounds:nativeBounds(d.node)}),
        onActivate(){if(!shown||!d.enabled)return;markDevice();if(id==='pause')onPause('touch');else if(id==='attack')st.touch.tapAttack=true;else if(id==='guard')st.touch.tapGuard=true;else st.once[id==='mount'?mountAction:id]=true;}}));
    }
    for(const [id,label] of [['stick','moveStick'],['look','lookDrag']])handles.push(semantics.add({id:'battle-touch-'+id,role:'text',describe:()=>({name:t(label),hidden:!shown,bounds:nativeBounds(targets[id])})}));
  }
  function cool(h){
    if(!shown)return;hero=h;place();
    style('guard',{active:st.touch.guard,highlight:recoveryGuardWindow(h)});
    if(h.horse){
      const dead=!h.horse.alive,mounting=h.act?.kind==='mount',queued=h.mountOnRecovery,distant=!h.mounted&&Math.hypot(h.x-h.horse.x,h.z-h.horse.z)>h.r.horse.near,calling=distant&&h.horse.called;
      mountAction=distant&&!queued&&!mounting?'call':'mount';const key=dead?'mountLost':mounting?'mounting':queued?'mountQueued':h.mounted?'getDown':calling?'horseComing':distant?'callHorseTouch':'mountUp';
      txt(display.mount.label,t(key));const disabled=dead||mounting||queued||calling;display.mount.control.setEnabled(!disabled);style('mount',{disabled,highlight:queued});
    }
    style('heal',{active:display.heal.control.pressed,waiting:h.dressings<=0});txt(display.heal.sub,h.dressings);
    for(const [i,id] of [[0,'skill0'],[1,'skill1']]){
      const item=SKILLS[h.skills[i]],wait=h.cool[i]??0;txt(display[id].label,item?say(item.name):t('skills'));
      txt(display[id].sub,h.mounted?t('footOnly'):wait>0?String(Math.ceil(wait)):'');style(id,{active:display[id].control.pressed,waiting:wait>0||h.mounted});
    }
    for(const [id,artId] of [['art',h.mounted?h.r.mountedArt:h.r.art],['offArt',h.r.offArt]]){
      const item=ARTS[artId],wait=h.artCool[artId]??0;txt(display[id].label,item?say(item.name):t('noArt'));
      txt(display[id].sub,item?(wait>0?String(Math.ceil(wait)):Math.floor(h.rage)+'/'+item.rage):'');
      style(id,{active:display[id].control.pressed,waiting:!item||wait>0||h.rage<item.rage,ready:!!item&&wait<=0&&h.rage>=item.rage});
    }
    for(const d of Object.values(display)){fit(d.label,d.w,14,9);d.label.y=d.sub.text?d.h*.37:d.h/2;}
  }
  visible(root,false);place(true);reset();
  return {root,targets,show(on,h){if(h)hero=h;shown=!!on;visible(root,shown);reset();for(const o of owners)o.setEnabled(shown);for(const c of controls)c.setEnabled(shown);place(true);if(hero&&shown)cool(hero);},
    cool,dispose(){shown=false;reset();stopClear();stopResize();for(const o of owners)o.dispose();for(const c of controls)c.dispose();for(const h of handles)h.remove();root.dispose();}};
}

