// Retained native 2D combat HUD. Rules and world projections are only read.
import { DisplayObjectContainer, Shape, Sprite } from '@egret/engine';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { createControlKeys } from '@egret/engine/ui';
import { prefersReducedMotion, watchReducedMotion } from '@egret/engine/web/kit';
import { DEEDS, keyName } from '../input.mjs';
import { BOONS } from '../rules/boons.mjs';
import { tierName } from '../rules/tiers.mjs';
import { GRADES, HERO, LOOT } from '../rules/tune.mjs';
import { AFFIXES } from '../rules/yard.mjs';
import { createCombatFont } from './combat-font.mjs';
import { paintDeedIcon } from './combat-icons.mjs';
import { bindSnowAction, bindSnowStick, contactBounds } from './touch.mjs';

export const DEED_NAMES={attack:'出枪',guard:'格挡（按住）',stars:'寒星',rain:'梨花枪雨',dodge:'闪避',glide:'踏雪（按住）',drink:'饮酒'};
const ACTIONS={attack:'出枪',guard:'格挡',stars:'寒星',rain:'枪雨',dodge:'闪避',glide:'踏雪',drink:'饮酒'};
const GOALS={road:'往草料场去',yard:'清掉草料场里的人',gate:'上山神庙',boss:'',done:''},LOOT_MARKS={coin:'钱',silver:'银',salve:'药',tonic:'丹',page:'谱'};
const GRID={rain:[2,0],drink:[0,1],guard:[1,1],stars:[2,1],glide:[0,2],dodge:[1,2],attack:[2,2]};
const INK=0x0a0f18,SNOW=0xe9eef5,DIM=0x9aa6b8,LACQUER=0xb3221c,GOLD=0xe2b866,JADE=0x7fd8b2,FROST=0x9cc8f2;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),rect=(x,y,width,height)=>({x,y,width,height});
const at=(node,x,y)=>{node.x=x;node.y=y;};
const shown=(node,value)=>{node.visible=Boolean(value);};
const fade=(node,value)=>{node.alpha=clamp(value);shown(node,value>0);};
const wall=()=>performance.now()/1000;

/** Safe, non-overlapping logical control boxes with physical minimum 44 CSS pixels. */
export function combatPadLayout(safe,scale){
  const {x,y,width:w,height:h}=safe,right=x+w,bottom=y+h,margin=10,gap=6,min=Math.ceil(44/Math.max(.01,scale));
  const cell=Math.max(min,Math.min(70,Math.floor((h*.61-2*gap)/3),Math.floor((w*.55-2*gap)/3)));
  const cluster=3*cell+2*gap,left=right-margin-cluster,top=bottom-margin-cluster;
  return {cluster:rect(left,top,cluster,cluster),cells:Object.fromEntries(DEEDS.map(name=>{
    const [col,row]=GRID[name],size=name==='attack'?cell:Math.max(min,Math.round(cell*.85));
    return [name,rect(left+col*(cell+gap)+(cell-size)/2,top+row*(cell+gap)+(cell-size)/2,size,size)];
  }))};
}

export async function createCombatHud(host,input,{onUiSound=()=>{},locale}={}){
  if(!locale)throw Error('Combat HUD requires its presentation locale');
  const scope=host.scope,root=host.combatLayer,font=await createCombatFont(host),t=(zh,en)=>locale.t(zh,en);
  const own=x=>scope.use(x),group=parent=>{const node=own(new DisplayObjectContainer());parent.addChild(node);return node;},
    shape=parent=>{const node=own(new Shape());parent.addChild(node);return node;},
    sprite=parent=>{const node=own(new Sprite());parent.addChild(node);return node;};
  let visible=false,staged=false,interactive=false,geometry,gameNow=0,lastGame,lastView,lastPublish=0;
  let heroData={},bossData={},goalRaw='',goalUnder='',hintData,hintUntil=0,hurtAt=-99,bumpAt=-99,debugRaw='',debugLast=-99,
    bagOpen=false,bagRows=[],bagStamp='',bagPage=0,bagTotal=0,rowsOnPage=5;
  const padStates={};
  // Respect the browser prefers-reduced-motion setting through the engine watcher.
  let reducedMotion=prefersReducedMotion();scope.use({dispose:watchReducedMotion(value=>{reducedMotion=value;})});
  const trKey=name=>t(keyName(input.keys[name]??''));
  const controlLive=()=>visible&&!staged&&interactive;
  function panel(parent,color=INK,alpha=.88,border=0x607087,radius=3){
    const node=shape(parent);let pw,ph,pcolor;
    return {node,rect(x,y,w,h,c=color){
      at(node,x,y);if(w===pw&&h===ph&&pcolor===c)return;pw=w;ph=h;pcolor=c;
      node.graphics.clear().beginFill(c,alpha).drawRoundRect(0,0,w,h,radius*2).endFill();
      if(border!==false)node.graphics.lineStyle(1,border,.72).drawRoundRect(.5,.5,Math.max(1,w-1),Math.max(1,h-1),radius*2).lineStyle(0);
    }};
  }
  function slab(parent,c,alpha=1){
    const node=shape(parent);node.graphics.beginFill(c,alpha).drawRect(0,0,1,1).endFill();
    return {node,rect(x,y,w,h){at(node,x,y);node.scaleX=w;node.scaleY=h;}};
  }
  const fx=group(root),hurtNode=shape(fx);
  hurtNode.graphics.beginRadialGradientFill(.5,.5,.72,[{offset:0,color:0xa0100c,alpha:0},{offset:.52,color:0xa0100c,alpha:0},{offset:.86,color:0xa0100c,alpha:.9},{offset:1,color:0xa0100c,alpha:1}])
    .drawRect(0,0,1,1).endFill();fade(hurtNode,0);
  function bar(parent,top,bottom,{lag=false}={}){
    const node=group(parent),back=shape(node),lagFill=lag?slab(node,0xf1e3c4):null,fill=shape(node),edge=slab(node,0xffffff,.85);
    let w=1,h=1,current=1,delayed=1,from=1,damageAt=-99,previousFull=false,oldW=0,oldH=0;
    const diagonal=(c,d)=>fill.graphics.clear().beginLinearGradientFill(0,0,0,1,[{offset:0,color:c},{offset:1,color:d}])
      .moveTo(.06,0).lineTo(1,0).lineTo(.94,1).lineTo(0,1).lineTo(.06,0).endFill();
    diagonal(top,bottom);
    function paint(now){
      const inside=Math.max(0,w-4),high=Math.max(0,h-3),value=current;
      if(lagFill){if(now>damageAt+.25)delayed=from+(current-from)*clamp((now-damageAt-.25)/.7);lagFill.rect(2,1.5,inside*delayed,high);}
      at(fill,2,1.5);fill.scaleX=inside*value;fill.scaleY=high;
      edge.rect(2+inside*value-Math.min(2,inside*value),1.5,Math.min(2,inside*value),high);shown(edge.node,value>.012);
    }
    return {node,get value(){return current;},
      rect(x,y,width,height){w=width;h=height;at(node,x,y);
        if(w!==oldW||h!==oldH){oldW=w;oldH=h;back.graphics.clear().beginFill(0x05080d,.8)
          .moveTo(7,0).lineTo(w,0).lineTo(w-7,h).lineTo(0,h).lineTo(7,0).endFill();}paint(wall());},
      reset(value){current=delayed=from=clamp(value);damageAt=-99;paint(wall());},
      set(value,now=wall(),full=false){
        value=clamp(value);if(lagFill&&value<current){from=delayed;damageAt=now;}
        else if(value>current){delayed=from=value;damageAt=-99;}current=value;
        if(full!==previousFull){previousFull=full;diagonal(full?0xfff3c9:top,full?GOLD:bottom);}
        fill.alpha=full&&!reducedMotion?.85+.15*Math.sin(now*6):1;paint(now);
      }
    };
  }
  const heroGroup=group(root),heroHp=bar(heroGroup,0xe2473c,0x8f1712,{lag:true}),heroSt=bar(heroGroup,0xf0d28a,0xb98b2e),heroWill=bar(heroGroup,0xbfe2ff,0x5f9fe0);
  // One shared glyph atlas labels each meter without dynamic canvas uploads.
  const statLabels=[font.label(heroGroup,'',0xffd8d2),font.label(heroGroup,'',0xf0d28a),font.label(heroGroup,'',0xbfe2ff)];
  const statNames=['气血','气力','枪意'];
  const purse=font.label(heroGroup,'',GOLD),lore=font.label(heroGroup,'',0xf1dcae);
  const chips=['wine','edge','full'].map((name,i)=>{
    const node=group(heroGroup),back=panel(node,i===1?0x23394b:0x080d16,.78,i===0?GOLD:i===1?FROST:0x536077,3),label=font.label(node,'',i===0?0xffd9a8:i===1?FROST:DIM);
    return {name,node,back,label};
  });
  const goalGroup=group(root),goalMark=shape(goalGroup),goal=font.label(goalGroup),goalSub=font.label(goalGroup,'',DIM);
  goalMark.graphics.beginFill(LACQUER).moveTo(4,0).lineTo(8,4).lineTo(4,8).lineTo(0,4).lineTo(4,0).endFill();
  const bossGroup=group(root),bossName=font.label(bossGroup),bossTitle=font.label(bossGroup,'',DIM),bossHp=bar(bossGroup,0xe2473c,0x8f1712,{lag:true}),
    bossPosture=bar(bossGroup,GOLD,0xa16c30);shown(bossGroup,false);
  const pipLayer=group(root),pipPool=Array.from({length:16},()=>{
    const node=group(pipLayer),back=panel(node,0x05080d,.82,0x66717d,1),fill=slab(node,0xd6453a),leader=font.label(node,'',GOLD);
    shown(node,false);back.rect(-27,-3,54,6);fill.rect(-26,-2,52,4);leader.rect(-41,-23,82,17,13,'center');
    return {node,back,fill,leader,id:undefined,elite:undefined,width:54};
  });
  const noteLayer=group(root),notePool=Array.from({length:5},()=>{
    const node=group(noteLayer),back=shape(node),stripe=slab(node,DIM),label=font.label(node);shown(node,false);
    return {node,back,stripe,label,data:undefined,start:-99};
  });
  const hintGroup=group(root),hintPanel=panel(hintGroup,0x142332,.93,0x536c86,4),hintStripe=slab(hintGroup,FROST),
    hintIcon=shape(hintGroup),hintKey=font.label(hintGroup,'',FROST),hintText=font.label(hintGroup);shown(hintGroup,false);
  const deedsGroup=group(root),stickTarget=sprite(root),stickVisual=group(root),stickRim=shape(stickVisual),stickThumb=shape(stickVisual),touchGroup=group(root);
  stickTarget.touchChildren=false;
  stickRim.graphics.lineStyle(.026,0xd6e8fa,.48).beginFill(0xd6e8fa,.08).drawCircle(0,0,1).endFill().lineStyle(0);
  stickThumb.graphics.beginFill(0xd6e8fa,.30).drawCircle(0,0,1).endFill();shown(stickVisual,false);
  const stick=bindSnowStick(host,stickTarget,{onMovement:(x,y)=>input.setStick(x,y),onPaint(state){
    shown(stickVisual,state.available&&state.active&&state.origin);
    if(!state.origin)return;at(stickVisual,state.origin.x,state.origin.y);
    stickRim.scaleX=stickRim.scaleY=state.radius*56/48;stickThumb.scaleX=stickThumb.scaleY=state.radius*23/48;
    at(stickThumb,state.value.x*state.radius*34/48,state.value.y*state.radius*34/48);
  }});

  function makeDeed(parent,name,touch){
    const node=sprite(parent);node.touchChildren=false;
    const bg=shape(node),mask=slab(node,0x000000,.50),icon=shape(node),meter=shape(node),caption=font.label(node),badge=font.label(node,'',DIM),count=font.label(node,'',GOLD);
    const entry={node,bg,mask,icon,meter,caption,badge,count,name,touch,size:58,height:64,paintKey:'',iconName:'',arcKey:'',binding:undefined};
    shown(mask.node,!touch);shown(meter,touch);shown(badge.root,!touch);shown(count.root,name==='drink');
    paintDeedIcon(icon,name);entry.iconName=name;
    if(touch)entry.binding=bindSnowAction(host,node,{name,onHeld:(key,held)=>input.hold(key,held),onPaint:()=>paintDeed(entry)});
    else node.touchEnabled=false;
    return entry;
  }
  const deeds=Object.fromEntries(DEEDS.map(name=>[name,makeDeed(deedsGroup,name,false)])),pads=Object.fromEntries(DEEDS.map(name=>[name,makeDeed(touchGroup,name,true)]));
  const deedLabel=name=>t(padStates[name]?.counter&&name==='attack'?'反击':ACTIONS[name]);
  const deedName=name=>t(padStates[name]?.counter&&name==='attack'?'回马枪':DEED_NAMES[name]);
  function paintDeed(entry){
    const {name,touch,size,height,bg,icon,meter,mask,caption,badge,count,node}=entry,s=padStates[name]??{},held=entry.binding?.held??false;
    const counter=name==='attack'&&s.counter,ready=s.ready,active=s.now,rim=held||active?FROST:ready?GOLD:name==='attack'?0xd3b77c:0x8da5ba,
      key=[size,height,held,ready,active,name].join('/');
    if(entry.paintKey!==key){
      entry.paintKey=key;const g=bg.graphics;g.clear();
      if(touch){
        const r=size/2;
        g.beginRadialGradientFill(r,r*.60,r*1.15,[{offset:0,color:held?0x59697b:ready?0x6b441d:name==='attack'?0x49362a:0x24394d,alpha:.96},
          {offset:1,color:0x0a101b,alpha:.88}]).drawCircle(r,r,r-1).endFill();
        g.lineStyle(held||ready||active?2:1,rim,.92).drawCircle(r,r,r-2).lineStyle(0);
      }else{
        g.beginLinearGradientFill(0,0,0,height,[{offset:0,color:held?0x314861:name==='attack'?0x3e2928:0x192635,alpha:.96},{offset:1,color:0x0a101c,alpha:.94}])
          .drawRoundRect(0,0,size,height,5).endFill().lineStyle(held||ready||active?2:1,rim,.8).drawRoundRect(1,1,size-2,height-2,5).lineStyle(0);
      }
    }
    const nextIcon=counter?'counter':name;if(entry.iconName!==nextIcon){entry.iconName=nextIcon;paintDeedIcon(icon,nextIcon,ready?0xffe3a5:SNOW);}
    icon.alpha=s.off?.46:1;caption.setText(deedLabel(name));caption.setColor(ready?0xffe3a5:s.off?0xc1ccd9:SNOW);node.name=deedName(name);
    if(!touch){mask.rect(1,height*(1-clamp(s.wait??0)),size-2,height*clamp(s.wait??0));shown(mask.node,(s.wait??0)>0);badge.setText(trKey(name));}
    if(touch&&(name==='attack'||name==='stars'||name==='rain')){
      const progress=Math.round(clamp(s.charge??0)*40)/40,seen=name!=='attack'||counter,arcKey=[size,progress,ready,seen].join('/');
      shown(meter,seen&&progress>0);
      if(entry.arcKey!==arcKey){
        entry.arcKey=arcKey;const g=meter.graphics;g.clear();
        if(seen&&progress>0){g.lineStyle(2.5,ready?GOLD:FROST,.95,{caps:'round'});
          if(progress>=1)g.drawCircle(size/2,size/2,size/2-2.2);
          else g.drawArc(size/2,size/2,size/2-2.2,-Math.PI/2,-Math.PI/2+progress*Math.PI*2);
          g.lineStyle(0);}
      }
    }else shown(meter,false);
    if(name==='drink')count.setText(s.count??HERO.gourd);
  }
  function sizeDeed(entry,r){
    const {node,touch,name}=entry;entry.size=r.width;entry.height=r.height;entry.box={...r};at(node,r.x,r.y);
    if(touch)node.hitArea=rect(0,0,r.width,r.height);
    const iconSize=Math.min(r.width*.58,r.height*.52,38);at(entry.icon,(r.width-iconSize)/2,touch?r.height*.10:8);
    entry.icon.scaleX=entry.icon.scaleY=iconSize/40;
    entry.caption.rect(2,r.height*.68,r.width-4,r.height*.27,name==='attack'&&touch?15:13,'center');
    entry.badge.rect(2,-9,r.width-4,15,11,'center');entry.count.rect(r.width-20,1,18,16,13,'right');paintDeed(entry);
  }

  // Non-modal bag, as before. Paged rows preserve the full learned text on
  // phones; the free movement region is reserved below its open panel.
  const bagLayer=group(root),bagTag=sprite(bagLayer),tagBack=shape(bagTag),tagLabel=font.label(bagTag),bagPanel=group(bagLayer),
    bagBack=panel(bagPanel,0x070b12,.94,0x718091,5),bagRowsLayer=group(bagPanel),pageRow=group(bagPanel);
  let tagRect=rect(0,0,20,20),bagRect=rect(0,0,1,1),tagHeld=false,pageRects={},bagKeyboard;
  const focusOn=id=>{if(host.keyboard){host.keyboard.focus(id,{visible:true});host.focus?.();host.requestPublish();}};
  const isFocused=id=>host.keyboard?.getSnapshot().focusedId===id&&host.keyboard?.getSnapshot().focusVisible;
  function keysFor(id,node,binding,paint){
    if(!host.keyboard)return undefined;let closing=false,disabled=true;
    const registration=host.keyboard.registerTarget({id,target:node,disabled});
    const keys=createControlKeys({keyboard:host.keyboard,target:node,kind:'action',control:binding.control,onPressChange:()=>{if(!closing)paint();}});
    scope.use({dispose(){closing=true;keys.dispose();registration.dispose();}});
    return {keys,update(){if(disabled===!binding.available)return;disabled=!binding.available;registration.update({disabled});}};
  }
  bagTag.touchChildren=false;
  function paintTag(){
    const g=tagBack.graphics,w=tagRect.width,h=tagRect.height,held=tagHeld||bagKeyboard?.keys.pressed,focused=isFocused('snow-combat:bag');
    g.clear().beginFill(held?0x33485e:0x070b12,.88).drawRoundRect(0,0,w,h,6).endFill()
      .lineStyle(focused?2:1,focused?GOLD:held?FROST:0x748095,.88).drawRoundRect(1,1,w-2,h-2,6).lineStyle(0);
  }
  const tagControl=bindSnowAction(host,bagTag,{name:'bag',onActivate:()=>toggleBag(),onPaint:held=>{tagHeld=held;paintTag();}});
  bagKeyboard=keysFor('snow-combat:bag',bagTag,tagControl,paintTag);
  const bagPool=Array.from({length:10},()=>{
    const node=group(bagRowsLayer),name=font.label(node),desc=font.label(node,'',DIM),amount=font.label(node,'',GOLD),divider=slab(node,0x73849a,.24);
    return {node,name,desc,amount,divider,data:undefined};
  });
  const pageControls={};
  for(const [name,glyph,step] of [['previous','‹',-1],['next','›',1]]){
    const node=sprite(pageRow),back=shape(node),label=font.label(node,glyph),entry={node,back,label,held:false};node.touchChildren=false;
    entry.paint=()=>{
      const r=pageRects[name];if(!r)return;const g=back.graphics,focused=isFocused('snow-combat:bag-'+name);
      g.clear().beginFill(entry.held||entry.keyboard?.keys.pressed?0x314861:0x182535,.95).drawRoundRect(0,0,r.width,r.height,6).endFill()
        .lineStyle(focused?2:1,focused?GOLD:0x748095,.78).drawRoundRect(.5,.5,r.width-1,r.height-1,6).lineStyle(0);
    };
    entry.binding=bindSnowAction(host,node,{name,onActivate:()=>setPage(bagPage+step),onPaint:held=>{entry.held=held;entry.paint();}});
    entry.keyboard=keysFor('snow-combat:bag-'+name,node,entry.binding,entry.paint);pageControls[name]=entry;
  }
  const pageLabel=font.label(pageRow,'',DIM);
  if(host.registerPainter)scope.use({dispose:host.registerPainter(()=>{if(tagControl.available)paintTag();for(const p of Object.values(pageControls))if(p.binding.available)p.paint();})});
  function setPage(page){
    const next=clamp(page,0,Math.max(0,Math.ceil(bagRows.length/rowsOnPage)-1));if(next===bagPage)return;
    const focus=host.keyboard?.getSnapshot().focusedId;bagPage=next;paintBag();
    if(focus?.startsWith('snow-combat:bag-')&&!pageControls[focus.slice('snow-combat:bag-'.length)]?.binding.available){
      const another=Object.keys(pageControls).find(key=>pageControls[key].binding.available);focusOn(another?'snow-combat:bag-'+another:'snow-combat:bag');
    }
    onUiSound('select');host.requestPublish();
  }
  function paintBag(){
    const touch=geometry?.touch??false,totalPages=Math.max(1,Math.ceil(bagRows.length/rowsOnPage));bagPage=clamp(bagPage,0,totalPages-1);
    const pageStart=bagPage*rowsOnPage;
    tagLabel.setText(t('行囊')+' '+bagTotal+(!touch?'  '+trKey('bag'):''));bagTag.name=t('行囊');
    shown(bagPanel,bagOpen&&visible&&!staged);
    for(let i=0;i<bagPool.length;i++){
      const row=bagPool[i],data=i<rowsOnPage?bagRows[pageStart+i]:undefined;row.data=data;shown(row.node,Boolean(data));
      if(!data)continue;
      row.name.setText(data.kind==='empty'?t('空'):t(data.name)+(data.grade!==undefined?' · '+t(GRADES[data.grade]):''));
      row.name.setColor(data.learned?GOLD:data.grade===2?GOLD:data.grade===1?JADE:SNOW);
      row.desc.setText(data.desc?t(data.desc):'');row.amount.setText(data.count??'');
    }
    pageLabel.setText((bagPage+1)+' / '+totalPages);
    const pager=bagOpen&&controlLive()&&totalPages>1;
    shown(pageLabel.root,pager);pageControls.previous.binding.setAvailable(pager&&bagPage>0);pageControls.next.binding.setAvailable(pager&&bagPage<totalPages-1);
    for(const p of Object.values(pageControls))p.keyboard?.update();
    host.requestPublish();
  }
  function toggleBag(){
    if(!controlLive())return;const focus=host.keyboard?.getSnapshot().focusedId;bagOpen=!bagOpen;if(bagOpen)bagPage=0;
    onUiSound(bagOpen?'open':'close');layout();paintBag();
    if(!bagOpen&&focus?.startsWith('snow-combat:bag-'))focusOn('snow-combat:bag');
  }
  function updateBag(game){
    const stamp=Object.keys(LOOT).map(k=>game.bag[k]??0).join('/')+'|'+game.boons.join('/');
    if(stamp===bagStamp)return false;bagStamp=stamp;
    bagRows=Object.keys(LOOT).filter(kind=>game.bag[kind]>0).map(kind=>({kind,name:LOOT[kind].name,grade:LOOT[kind].grade,count:game.bag[kind]}));
    for(const id of game.boons){const boon=BOONS[id];if(boon)bagRows.push({kind:id,name:boon.name,desc:boon.text,learned:true});}
    if(!bagRows.length)bagRows.push({kind:'empty'});
    bagTotal=Object.values(game.bag).reduce((a,b)=>a+b,0);bagPage=clamp(bagPage,0,Math.max(0,Math.ceil(bagRows.length/rowsOnPage)-1));
    paintBag();return true;
  }
  const flightLayer=group(root),flights=Array.from({length:8},()=>{
    const node=group(flightLayer),circle=shape(node),label=font.label(node,'',GOLD);
    circle.graphics.beginFill(0x0a0f18,.82).drawCircle(0,0,14).endFill().lineStyle(1,GOLD,.9).drawCircle(0,0,13).lineStyle(0);
    label.rect(-13,-13,26,26,17,'center');shown(node,false);return {node,circle,label,data:undefined,start:-99};
  });
  const debugGroup=group(root),debugBack=panel(debugGroup,0x000000,.65,false,0),debugLabel=font.label(debugGroup);shown(debugGroup,false);
  function releaseTouch(){
    stick.release();for(const p of Object.values(pads))p.binding.release();
    tagControl.release();for(const p of Object.values(pageControls))p.binding.release();
  }
  function sync(){
    const live=controlLive(),touch=geometry?.touch??false;
    shown(root,visible&&!staged);shown(deedsGroup,visible&&!staged&&!touch);
    stick.setAvailable(live&&touch);for(const p of Object.values(pads))p.binding.setAvailable(live&&touch);
    tagControl.setAvailable(live);bagKeyboard?.update();paintBag();host.requestPublish();
  }

  function layout(){
    const {safe,screen,scale,touch,portrait}=host.metrics(),{x,y,width:w,height:h}=safe,right=x+w,bottom=y+h,
      compact=h<450||w<560,vertical=portrait||h>w,margin=compact?10:16,minTap=Math.ceil(44/Math.max(.01,scale));
    const heroW=Math.min(vertical?Math.max(170,w*.55):w*.36,compact?250:300),heroX=x+margin,heroY=y+margin,heroH=touch?86:136;
    const actualScreen=screen??{width:w,height:h},padLayout=combatPadLayout(safe,scale),bagAtTop=touch||vertical||w<650;
    geometry={safe,screen:actualScreen,scale,touch,portrait:vertical,padLayout,heroW,heroX,heroY,heroH,compact};
    hurtNode.scaleX=actualScreen.width;hurtNode.scaleY=actualScreen.height;
    at(heroGroup,heroX,heroY);
    const labelWidth=Math.min(64,Math.max(47,heroW*.25)),barX=labelWidth+5,barWidth=heroW-barX;
    statLabels.forEach((label,index)=>label.rect(0,index*15,labelWidth,14,12,'left'));
    heroHp.rect(barX,1,barWidth,13);heroSt.rect(barX,18,barWidth,9);heroWill.rect(barX,33,barWidth,7);
    purse.rect(0,45,heroW,16,16,'left');const chipW=(heroW-8)/3;
    for(let i=0;i<chips.length;i++){const c=chips[i];at(c.node,i*(chipW+4),64);c.back.rect(0,0,chipW,19);c.label.rect(2,0,chipW-4,19,12,'center');}
    lore.rect(0,89,heroW,46,13,'left',true);shown(lore.root,!touch);
    // Keep the game objective clear of both the hero bars and top-right tool
    // buttons. Narrow portrait uses a second line beneath the toolbar.
    const toolW=Math.min(228,w*.55),toolBottom=y+Math.min(48,Math.max(6,h*.07))+48,
      gapLeft=heroX+heroW+12,gapRight=right-toolW-16,gapW=gapRight-gapLeft,
      goalW=gapW>=115?Math.min(gapW,compact?190:360):Math.max(90,Math.min(190,w*.44)),
      goalX=gapW>=115?gapRight-goalW:right-margin-goalW,goalY=gapW>=115?y+margin:toolBottom+7;
    at(goalGroup,goalX,goalY);at(goalMark,0,7);
    goal.rect(11,0,goalW-11,25,compact?16:20,'right',true);goalSub.rect(0,27,goalW,20,13,'right',true);
    const bossW=touch&&vertical?w-2*margin:Math.min(w*(touch?.53:.68),560),
      bossX=touch&&!vertical?right-margin-bossW:x+(w-bossW)/2,
      bossY=touch?(vertical?Math.max(y+heroH+margin+62,goalY+56):Math.max(y+margin+68,toolBottom+6)):bottom-150;
    at(bossGroup,bossX,bossY);bossName.rect(0,0,bossW*.34,27,22,'left');bossTitle.rect(bossW*.34,0,bossW*.66,27,14,'left');
    bossHp.rect(0,31,bossW,12);bossPosture.rect(0,47,bossW,5);

    const tagW=Math.max(minTap+28,Math.min(vertical?132:158,heroW)),tagH=Math.max(minTap,46),
      availableDeck=bagAtTop?w-2*margin:w-2*(margin+tagW+6),
      desktopSize=Math.max(38,Math.min(61,Math.floor((availableDeck-8*6)/DEEDS.length))),deckH=62,deckW=DEEDS.length*desktopSize+6*8;
    for(const [i,name] of DEEDS.entries())sizeDeed(deeds[name],rect(x+(w-deckW)/2+i*(desktopSize+8),bottom-margin-deckH,desktopSize,deckH));
    for(const name of DEEDS)sizeDeed(pads[name],padLayout.cells[name]);
    const tagY=bagAtTop?heroY+heroH+7:bottom-margin-tagH,tagX=bagAtTop?heroX:right-margin-tagW;
    tagRect=rect(tagX,tagY,tagW,tagH);at(bagTag,tagX,tagY);bagTag.hitArea=rect(0,0,tagW,tagH);
    tagLabel.rect(6,2,tagW-12,tagH-4,17,'center');paintTag();
    const bagW=Math.max(150,Math.min(bagAtTop?Math.min(w*.43,245):250,w-2*margin)),rowH=touch?44:45,pagerH=minTap+6,
      availableH=bagAtTop?Math.max(2*rowH+pagerH,Math.min(h*.42,bottom-tagY-tagH-minTap-20)):h*.61;
    rowsOnPage=Math.max(1,Math.min(bagPool.length,Math.floor((availableH-pagerH-10)/rowH)));
    const showRows=Math.min(rowsOnPage,Math.max(1,bagRows.length)),pages=Math.max(1,Math.ceil(bagRows.length/rowsOnPage)),
      panelHeight=showRows*rowH+(pages>1?pagerH:0)+12,bagX=bagAtTop?tagX:right-margin-bagW,bagY=bagAtTop?tagY+tagH+5:tagY-panelHeight-6;
    bagRect=rect(bagX,bagY,bagW,panelHeight);at(bagPanel,bagX,bagY);bagBack.rect(0,0,bagW,panelHeight);
    for(let i=0;i<bagPool.length;i++){
      const row=bagPool[i];at(row.node,8,5+i*rowH);row.name.rect(3,0,bagW-52,22,16,'left');
      row.desc.rect(3,20,bagW-22,rowH-19,12,'left',true);row.amount.rect(bagW-46,0,25,23,15,'right');row.divider.rect(1,rowH-2,bagW-18,1);
    }
    at(pageRow,4,panelHeight-pagerH);const pw=Math.max(minTap,44);
    pageRects.previous=rect(0,0,pw,minTap);pageRects.next=rect(bagW-8-pw,0,pw,minTap);
    for(const name of ['previous','next']){
      const p=pageControls[name],r=pageRects[name];at(p.node,r.x,r.y);p.node.hitArea=rect(0,0,r.width,r.height);p.label.rect(0,0,r.width,r.height,27,'center');
      p.node.name=name==='previous'?t('上页','Previous page'):t('下页','Next page');p.paint();
    }
    pageLabel.rect(pw+3,0,Math.max(1,bagW-14-2*pw),minTap,14,'center');
    const stickLeft=x,stickRight=Math.max(x+minTap,Math.min(x+w*.46,padLayout.cluster.x-10)),
      stickTop=Math.min(bottom-minTap,Math.max(y+h*.30,touch?tagY+tagH+8:y+80,touch&&bagOpen?bagY+panelHeight+6:0));
    stickTarget.name=t('移动');stick.setBounds(rect(stickLeft,stickTop,Math.max(minTap,stickRight-stickLeft),Math.max(minTap,bottom-stickTop)),scale);

    const hintW=Math.min(vertical?w*.75:w*.38,compact?310:350),hintY=touch?Math.max(tagY+tagH+8,vertical&&bossData.visible?bossY+60:tagY+tagH+8):y+140;
    at(hintGroup,x+margin,hintY);hintPanel.rect(0,0,hintW,64);hintStripe.rect(0,0,3,64);
    at(hintIcon,9,17);hintIcon.scaleX=hintIcon.scaleY=.88;
    hintKey.rect(52,4,hintW-60,24,14,'left',true);hintText.rect(52,25,hintW-61,34,14,'left',true);
    if(hintData&&!hintData.action){hintKey.show(false);hintText.rect(10,7,hintW-19,50,15,'left',true);}
    const noteW=Math.min(w*(vertical?.77:.40),330),noteH=compact?22:32,noteY=touch?Math.min(bottom-44,y+h*.66):bottom-112;
    geometry.note={x:x+margin,y:noteY,w:noteW,h:noteH};
    for(const p of notePool){
      p.back.graphics.clear().beginLinearGradientFill(0,0,noteW,0,[{offset:0,color:0x070b12,alpha:.86},{offset:1,color:0x070b12,alpha:0}])
        .drawRect(0,0,noteW,noteH).endFill();p.stripe.rect(0,1,2,noteH-2);p.label.rect(8,1,noteW-15,noteH-2,15,'left',true);
    }
    at(debugGroup,x+8,bottom-95);debugBack.rect(0,0,Math.min(w-16,650),87);debugLabel.rect(7,3,Math.min(w-30,636),81,12,'left',true);
    sync();
  }

  function setHintText(text,action){
    const mark=action==='attack'?'counter':action;hintData={text,action,mark};
    hintText.setText(t(text));hintKey.setText(mark?t(mark==='counter'?'反击':ACTIONS[action])+(geometry?.touch?'':' · '+trKey(action)):'');
    hintKey.show(Boolean(mark));shown(hintIcon,Boolean(mark));
    if(mark){paintDeedIcon(hintIcon,mark,mark==='counter'?GOLD:FROST);hintKey.setColor(mark==='counter'?GOLD:FROST);}
    hintStripe.node.alpha=mark==='counter'?1:.85;
    if(geometry){
      const w=Math.min(geometry.portrait?geometry.safe.width*.75:geometry.safe.width*.38,geometry.compact?310:350);
      hintText.rect(mark?52:10,mark?25:7,w-(mark?61:19),mark?34:50,mark?14:15,'left',true);hintKey.rect(52,4,w-60,24,14,'left',true);
    }
    shown(hintGroup,true);host.requestPublish();
  }
  function clearHint(){hintData=undefined;hintUntil=0;shown(hintGroup,false);hintText.setText('');hintKey.setText('');host.requestPublish();}
  function note(text,grade=0){
    const p=notePool.find(p=>!p.data||wall()-p.start>=3.7)??notePool.reduce((a,b)=>a.start<b.start?a:b);
    p.data={text,grade};p.start=wall();p.label.setText(t(text));p.label.setColor(grade===2?GOLD:SNOW);
    p.stripe.node.graphics.clear().beginFill(grade===2?GOLD:grade===1?JADE:DIM).drawRect(0,0,1,1).endFill();
    shown(p.node,true);host.requestPublish();
  }
  function updateNotes(now){
    const active=notePool.filter(p=>p.data&&now-p.start<3.7).sort((a,b)=>a.start-b.start);
    for(const p of notePool)if(!active.includes(p)){p.data=undefined;shown(p.node,false);}
    const r=geometry.note;
    // Never clamp the individual rows to the same coordinate. The whole
    // stack moves as one to avoid overlapping text during a burst of loot.
    const base=Math.max(geometry.heroY+geometry.heroH+6,hintGroup.visible?hintGroup.y+68:0,r.y-active.length*r.h),
      top=Math.min(base,geometry.safe.y+geometry.safe.height-active.length*r.h-6);
    active.forEach((p,i)=>{const age=now-p.start,alpha=clamp(age/.18)*clamp((3.65-age)/.65);
      at(p.node,r.x-12*(1-clamp(age/.18)),top+i*r.h);fade(p.node,alpha);});
  }
  function updatePips(game,view){
    const seen=new Set(),screen=geometry.screen;
    // Retire IDs no longer in the active projected set before allocating new ones.
    for(const foe of game.foes){
      if(foe.kind==='lu'||foe.state==='dead'||(foe.hp>=foe.maxHp&&!foe.elite))continue;
      const [sx,sy,depth]=view.screen(foe.x,2.25,foe.z);
      if(!Number.isFinite(sx)||!Number.isFinite(sy)||depth>1||sx<0||sx>1||sy<0||sy>1)continue;
      const p=pipPool.find(v=>v.id===foe.id)??pipPool.find(v=>v.id===undefined);if(!p)continue;p.id=foe.id;seen.add(foe.id);
      if(p.elite!==foe.elite){p.elite=foe.elite;p.width=foe.elite?68:54;p.back.rect(-p.width/2,-3,p.width,6);
        p.leader.setText(foe.elite?t(AFFIXES[foe.elite]?.name??''):'');}
      at(p.node,sx*screen.width,sy*screen.height);p.fill.rect(-p.width/2+1,-2,(p.width-2)*clamp(foe.hp/foe.maxHp),4);shown(p.node,true);
    }
    for(const p of pipPool)if(!seen.has(p.id)){p.id=undefined;shown(p.node,false);}
  }
  function updateFlights(now){
    for(const p of flights){
      if(!p.data)continue;const age=(now-p.start)/.445;
      if(age>=1){p.data=undefined;shown(p.node,false);bumpAt=now;continue;}
      const s=clamp(age),smooth=s*s*(3-2*s),x=p.data.x*geometry.screen.width,y=p.data.y*geometry.screen.height,
        destX=tagRect.x+tagRect.width/2,destY=tagRect.y+tagRect.height/2;
      at(p.node,x+(destX-x)*smooth,y+(destY-y)*smooth-36*Math.sin(s*Math.PI));
      p.node.scaleX=p.node.scaleY=.7+.4*Math.sin(s*Math.PI)-.4*s;fade(p.node,.9-.78*s);
    }
    const age=now-bumpAt,amount=age<.22&&!reducedMotion?1+.18*Math.sin(clamp(age/.22)*Math.PI):1;
    // Bounce only the decoration, not the actual touch rectangle.
    tagBack.scaleX=tagBack.scaleY=amount;tagBack.x=(1-amount)*tagRect.width/2;tagBack.y=(1-amount)*tagRect.height/2;
  }

  function refresh(game,view,advance=true){
    if(!geometry||!game||!view)return;
    const now=wall(),hero=game.hero,lu=game.boss;
    gameNow=game.time;lastGame=game;lastView=view;
    heroHp.set(hero.hp/HERO.hp,now);heroSt.set(hero.stamina/HERO.stamina,now);heroWill.set(hero.will/HERO.will,now,hero.will>=HERO.will);
    statLabels.forEach((label,index)=>label.setText(t(statNames[index])));
    heroData={hp:hero.hp,stamina:hero.stamina,will:hero.will,coins:game.coins,tipsy:Math.ceil(hero.tipsy),edge:hero.edge>0,gourd:hero.gourd,maxGourd:hero.maxGourd,
      counter:hero.counter>0&&hero.state!=='dead',state:hero.state,boons:[...game.boons]};
    purse.setText(t('银钱')+' '+game.coins);
    const chipTexts=[t('酒意')+' '+heroData.tipsy,t('乘隙'),t('满壶')+(geometry.touch?'':' · '+t('养气'))],
      chipVisible=[heroData.tipsy>0,heroData.edge,hero.gourd>=hero.maxGourd];
    chips.forEach((c,i)=>{c.label.setText(chipTexts[i]);shown(c.node,chipVisible[i]);});
    lore.setText(game.boons.map(id=>t(BOONS[id]?.name??'')).join(' · '));
    goalRaw=game.mode==='yard'?'守住草料场':GOALS[game.stage];
    goalUnder=game.mode==='yard'?(game.wave?locale.wave(game.wave):''):goalRaw&&game.tier>1?locale.tier(game.tier,tierName(game.tier)):'';
    goal.setText(t(goalRaw));goalSub.setText(goalUnder);shown(goalGroup,goalRaw);
    const bossVisible=game.stage==='boss'&&lu.state!=='dead',changedBoss=bossData.visible!==bossVisible;
    bossData={visible:bossVisible,hp:lu.hp,maxHp:lu.maxHp,posture:lu.posture,maxPosture:lu.sheet.posture,name:lu.sheet.name,title:lu.sheet.title,state:lu.state};
    shown(bossGroup,bossVisible);
    if(bossVisible){bossName.setText(t(lu.sheet.name));bossTitle.setText(t(lu.sheet.title));bossHp.set(lu.hp/lu.maxHp,now);bossPosture.set(lu.state==='down'?1:lu.posture/lu.sheet.posture,now,lu.state==='down');}
    Object.assign(padStates,{
      attack:{counter:heroData.counter,ready:heroData.counter,now:hero.state==='cut'||hero.state==='riposte',charge:clamp(hero.counter/HERO.guard.counter)},
      guard:{off:hero.stamina<=0,now:hero.state==='guard'},
      stars:{wait:hero.starsWait/HERO.stars.cooldown,off:hero.starsWait>0,charge:1-hero.starsWait/HERO.stars.cooldown},
      rain:{wait:1-hero.will/HERO.will,off:hero.will<HERO.will,ready:hero.will>=HERO.will,charge:hero.will/HERO.will},
      dodge:{off:hero.stamina<HERO.dodge.cost*.5,now:hero.state==='dodge'},
      glide:{off:hero.stamina<=1,now:hero.state==='glide'},
      drink:{off:hero.gourd<=0,count:hero.gourd}
    });
    for(const name of DEEDS){paintDeed(deeds[name]);paintDeed(pads[name]);}
    if(hintUntil&&(gameNow>=hintUntil||hintData?.action==='attack'&&hero.state==='riposte'))clearHint();
    if(changedBoss&&hintData){
      const y=geometry.portrait&&bossVisible?bossGroup.y+58:geometry.heroY+geometry.heroH+tagRect.height+18;
      hintGroup.y=y;
    }
    if(updateBag(game)&&bagOpen)layout();
    updatePips(game,view);updateNotes(now);updateFlights(now);
    const hurtAge=(now-hurtAt)/.52;fade(hurtNode,hurtAge<1?(reducedMotion?.26:.75)*(1-clamp(hurtAge))**2:0);
    if(now-lastPublish>=.25||!advance){lastPublish=now;host.requestPublish();}
  }

  host.addSemantic({id:'snow-combat',role:'group',describe:()=>({name:t('战斗','Combat'),hidden:!visible||staged,bounds:host.metrics().safe})});
  const semanticText=(id,node,name,active=()=>true,role='text')=>host.addSemantic({id:'snow-combat:'+id,parent:'snow-combat',role,
    describe:()=>({name:name(),hidden:!visible||staged||!active(),bounds:semanticBoundsOf(node)})});
  function meter(id,node,read,max,name,active=()=>true){
    host.addSemantic({id:'snow-combat:'+id,parent:'snow-combat',role:'progressbar',describe:()=>({name:t(name),
      hidden:!visible||staged||!active(),bounds:semanticBoundsOf(node),range:{min:0,max,now:clamp(read()??0,0,max)}})});
  }
  meter('hp',heroHp.node,()=>heroData.hp,HERO.hp,'气血');meter('stamina',heroSt.node,()=>heroData.stamina,HERO.stamina,'气力');
  meter('will',heroWill.node,()=>heroData.will,HERO.will,'枪意');
  semanticText('coins',purse.root,()=>purse.text,()=>Boolean(purse.text));
  semanticText('goal',goalGroup,()=>[goal.text,goalSub.text].filter(Boolean).join(' · '),()=>Boolean(goalRaw));
  semanticText('hero-status',heroGroup,()=>chips.filter(c=>c.node.visible).map(c=>c.label.text).join(' · '),()=>chips.some(c=>c.node.visible&&c.label.text));
  semanticText('boss',bossGroup,()=>[bossName.text,bossTitle.text,Math.ceil(bossData.hp)+' / '+bossData.maxHp].join(' · '),()=>bossData.visible);
  semanticText('hint',hintGroup,()=>[hintKey.text,hintText.text].filter(Boolean).join(' · '),()=>Boolean(hintData),'status');
  for(const [index,n] of notePool.entries())semanticText('note-'+index,n.node,()=>n.label.text,()=>Boolean(n.data),'status');
  for(const name of DEEDS){
    const p=pads[name],d=deeds[name];
    host.addSemantic({id:'snow-combat:'+name,parent:'snow-combat',role:'button',
      describe:()=>({name:deedName(name),hidden:!p.binding.available,disabled:!p.binding.available,bounds:contactBounds(p.node,p.size,p.height)}),onActivate:()=>p.binding.activate()});
    semanticText('key-'+name,d.node,()=>deedName(name)+' · '+trKey(name),()=>!geometry?.touch&&Boolean(visible));
  }
  host.addSemantic({id:'snow-combat:stick',parent:'snow-combat',role:'group',describe:()=>({name:t('移动'),hidden:!stick.available,bounds:stick.box??rect(0,0,0,0)})});
  host.addSemantic({id:'snow-combat:bag',parent:'snow-combat',role:'button',describe:()=>({name:t('行囊'),hidden:!tagControl.available,
    expanded:bagOpen,bounds:contactBounds(bagTag,tagRect.width,tagRect.height),focused:isFocused('snow-combat:bag')}),onActivate:()=>tagControl.activate(),onFocus:()=>focusOn('snow-combat:bag')});
  for(const [name,p] of Object.entries(pageControls))host.addSemantic({id:'snow-combat:bag-'+name,parent:'snow-combat',role:'button',
    describe:()=>({name:name==='previous'?t('上页','Previous page'):t('下页','Next page'),hidden:!p.binding.available,
      bounds:contactBounds(p.node,pageRects[name]?.width??0,pageRects[name]?.height??0),focused:isFocused('snow-combat:bag-'+name)}),onActivate:()=>p.binding.activate(),onFocus:()=>focusOn('snow-combat:bag-'+name)});
  for(const [i,row] of bagPool.entries())semanticText('bag-row-'+i,row.node,()=>[row.name.text,row.amount.text,row.desc.text].filter(Boolean).join(' · '),()=>bagOpen&&Boolean(row.data));
  semanticText('debug',debugGroup,()=>debugLabel.text,()=>Boolean(debugRaw&&debugLabel.text));
  scope.use({dispose:host.registerLayout(layout)});
  shown(root,false);layout();

  return {
    setVisible(value){value=Boolean(value);if(visible===value)return;visible=value;
      if(!value){releaseTouch();bagOpen=false;for(const p of notePool){p.data=undefined;shown(p.node,false);}lastGame=undefined;}
      sync();},
    setStaged(value){value=Boolean(value);if(staged===value)return;staged=value;if(value)releaseTouch();sync();},
    setInteractive(value){value=Boolean(value);if(interactive===value)return;interactive=value;if(!value)releaseTouch();sync();},
    releaseTouch,labelKeys(){for(const name of DEEDS)paintDeed(deeds[name]);paintBag();if(hintData)setHintText(hintData.text,hintData.action);host.requestPublish();},
    setLanguage(){if(hintData)setHintText(hintData.text,hintData.action);
      for(const p of notePool)if(p.data)p.label.setText(t(p.data.text));for(const p of flights)if(p.data)p.label.setText(t(LOOT_MARKS[p.data.kind]??'物'));
      for(const p of pipPool)p.elite=undefined;layout();paintBag();if(visible&&!staged&&lastGame)refresh(lastGame,lastView,false);host.requestPublish();},
    toggleBag,clearHint,hinting:()=>hintUntil>gameNow,
    hint(text,action=null){hintUntil=gameNow+4.2;setHintText(text,action);},
    note,bump(){bumpAt=wall();},hurt(){hurtAt=wall();},
    clearPickups(){for(const p of flights){p.data=undefined;shown(p.node,false);}},
    flyPickup(kind,grade,x,y){
      if(!geometry||!visible||staged||![x,y].every(v=>Number.isFinite(v)&&v>=0&&v<=1)||reducedMotion)return false;
      const p=flights.find(p=>!p.data)??flights.reduce((a,b)=>a.start<b.start?a:b);
      p.data={kind,grade,x,y};p.start=wall();p.label.setText(t(LOOT_MARKS[kind]??'物'));
      p.label.setColor(grade===2?GOLD:grade===1?JADE:SNOW);at(p.node,x*geometry.screen.width,y*geometry.screen.height);shown(p.node,true);return true;
    },
    debug(text){
      const next=String(text??'');if(next===debugRaw)return;debugRaw=next;shown(debugGroup,Boolean(next));
      if(next&&wall()-debugLast>=.25){debugLast=wall();debugLabel.setText(t(next));host.requestPublish();}
    },
    update(game,view){
      if(!visible||staged)return;
      if(lastGame!==game){heroHp.reset(game.hero.hp/HERO.hp);heroSt.reset(game.hero.stamina/HERO.stamina);heroWill.reset(game.hero.will/HERO.will);bossHp.reset(game.boss.hp/game.boss.maxHp);bagStamp='';}
      refresh(game,view);
    },
    snapshot:()=>({visible,staged,interactive,hero:heroData,boss:bossData,statLabels:statLabels.map(label=>label.text),goal:[goal.text,goalSub.text].filter(Boolean).join(' · '),
      bag:{open:bagOpen,total:bagTotal,page:bagPage,rows:bagRows.map(r=>({...r,name:r.name?t(r.name):t('空'),desc:r.desc?t(r.desc):''}))},
      hint:{text:hintText.text,action:hintData?.action,visible:Boolean(hintData)},notes:notePool.filter(p=>p.data).map(p=>p.label.text),
      stick:{available:stick.available,active:stick.active,value:stick.value,origin:stick.origin,box:stick.box,radius:48/(geometry?.scale??1),radiusCss:48,deadZone:.2},
      pads:Object.fromEntries(DEEDS.map(name=>[name,{available:pads[name].binding.available,held:pads[name].binding.held,box:pads[name].box,label:deedName(name),...padStates[name]}])),
      pips:{active:pipPool.filter(p=>p.id!==undefined).length,pool:pipPool.length},font:font.info(),flights:flights.filter(p=>p.data).length})
  };
}
