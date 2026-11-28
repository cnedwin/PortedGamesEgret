// Native projected unit cards and calligraphy in the attached Play host.
// The same native pointer and semantics own each retained target;
// labels use shared atlases and avatar images use bounded native leases.
import {projectToViewport3D} from '@egret/engine/world3d';
import {createActionControl} from '@egret/engine/ui';
import {portraitCache} from '../ui/native-map-plates.mjs';
import {battlePlateModel,battlePlateWidth,floatStyle,floatFrame,createFloatSlots,oldestOrdinaryFloat} from '../ui/native-battle-marker-model.mjs';
import {layoutBattlePlates} from './battle-plate-layout.mjs';
import {inside,intersects} from './map-marker-math.mjs';

function makePlate(host,layer,id,portraits,onTap,onFocus){
 const {game,semantics}=host;
 const root=game.sprite(undefined,layer);root.visible=false;root.touchChildren=false;root.touchEnabled=false;
 const label=game.text('',{layer:root,size:12,bold:true,baseline:'middle',color:0xf2ede2});
 const count=game.text('',{layer:root,size:11,bold:true,baseline:'middle',retainLastText:true});
 const symbol=game.text('',{layer:root,size:14,bold:true,baseline:'middle',align:'center',color:0xffffff,fontFamily:'serif'});
 const controlId='battle-marker-'+id;
 let data=null,mode='hidden',w=0,url='',portraitRef=null,lease=null,painted='',token=0,closed=false;
 const activate=()=>{if(root.visible&&root.touchEnabled)onTap(id);};
 const control=createActionControl({input:game.browser.pointer,target:root,activation:'tap',onActivate:activate});
 control.setEnabled(false);
 // Play owns keyboard focus in its managed game.show views; the same unit
 // remains fully keyboard selectable through the native battle HUD roster.
 const focused=()=>Boolean(semantics.snapshot.focused?.endsWith(':battle-unit-'+id));
 const bounds=()=>{
   const a=root.localToGlobal(0,0),b=root.localToGlobal(w,44);
   return {x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y};
 };
 const semantic=semantics.add({id:controlId,role:'button',describe:()=>({
   name:data?.name??controlId,hidden:!root.visible,disabled:!root.touchEnabled,bounds:bounds()}),
   ...(onFocus?{onFocus:()=>{if(root.visible&&root.touchEnabled)onFocus(id);}}:{}),
   onActivate:()=>{if(control.enabled){control.press();control.release();}}});
 function loadPortrait(next,wanted){
   next=wanted?next:'';
   if(next===url)return;
   root.graphics.clear();painted='';url=next;const rev=++token;
   portraitRef?.release();portraitRef=null;lease=null;
   if(!next)return;
   const ref=portraits.acquire(next);if(!ref)return;portraitRef=ref;
   void ref.promise.then(value=>{if(!closed&&rev===token&&portraitRef===ref){lease=value;painted='';game.invalidate();}});
 }
 function hide(){
   if(mode==='hidden')return;
   mode='hidden';control.setEnabled(false);root.touchEnabled=false;root.visible=false;
   loadPortrait('',false);painted='';
 }
 function paint(){
   const now=[data.staticKey,data.key,mode,w,Boolean(lease),focused()].join('|');if(now===painted)return;painted=now;
   root.hitArea={x:0,y:0,width:w,height:44};root.alpha=data.routed ? .55 : 1;
   const g=root.graphics;g.clear();
   const compact=mode==='compact',cx=compact?22:19,cy=compact?19:22,r=17,face=14.5;
   const edge=data.chosen?0xffe8a5:data.targetable?0xf0c06c:data.full?0xf3c55e:focused()?0xfff2b8:data.colour;
   const border=data.chosen||data.targetable||data.full||focused()?2:1;
   g.beginFill(0x101a20,.8).drawCircle(cx,cy,r+1).endFill()
    .beginFill(data.colour).drawCircle(cx,cy,r).endFill().lineStyle(border,edge,.95).drawCircle(cx,cy,r).lineStyle(0);
   if(lease){
     const tex=lease.value,scale=Math.max(face*2/tex.width,face*2/tex.height);
     g.beginBitmapFill(lease,{a:scale,b:0,c:0,d:scale,tx:cx-tex.width*scale/2,ty:cy-tex.height*scale/2},false)
      .drawCircle(cx,cy,face).endFill();
   }else g.beginFill(0x263238).drawCircle(cx,cy,face).endFill();
   symbol.x=cx;symbol.y=cy;symbol.visible=!lease;
   label.visible=count.visible=!compact;
   const x=compact?5:42,barW=compact?34:w-48,barY=compact?38:34;
   if(!compact){
     g.beginFill(0x14181e,.85).drawRect(38,3,w-38,38).endFill()
      .beginFill(data.colour).drawRect(38,3,2,38).endFill();
     label.x=44;label.y=12;count.x=44;count.y=25;
   }
   g.beginFill(0xffffff,.16).drawRect(x,barY,barW,2).drawRect(x,barY+3,barW,2).endFill();
   if(data.health>0)g.beginFill(data.mine?0x7fb4ff:0xf07a62).drawRect(x,barY,barW*data.health,2).endFill();
   if(data.rage>0)g.beginFill(0xf3c55e).drawRect(x,barY+3,barW*data.rage,2).endFill();
 }
 return {root,id,focused,get visible(){return root.visible;},get mode(){return mode;},get stageBounds(){return bounds();},
   extent(model){return battlePlateWidth(model,data?.staticKey===model.staticKey?{name:label.getBounds().width,troops:count.getBounds().width}:{});},
   show(model,placement,scale,point,withPortrait){
     const prior=data;data=model;mode=placement.mode;w=placement.box.right-placement.box.left;
     if(prior?.staticKey!==data.staticKey){label.text=data.title;symbol.text=data.symbol;count.color=data.mine?0x9fc6ff:0xf3a093;}
     if(prior?.troops!==data.troops)count.text=data.troops;
     root.x=point.x;root.y=point.y;root.scaleX=root.scaleY=1/scale;
     root.visible=true;root.touchEnabled=true;
     if(!control.enabled)control.setEnabled(true);
     loadPortrait(data.portrait,withPortrait);paint();
   },hide,dispose(){if(closed)return;closed=true;hide();semantic.remove();control.dispose();root.dispose();}
 };
}
function makeFloater(game,layer){
 const root=game.sprite(undefined,layer);root.visible=false;root.touchEnabled=root.touchChildren=false;
 const shadow=game.text('',{layer:root,align:'center',baseline:'middle',bold:true,fontFamily:'serif',color:0x20190c});
 const label=game.text('',{layer:root,align:'center',baseline:'middle',bold:true,fontFamily:'serif'});
 let styleKey='',words='',paintKey='';
 return {root,show(event,style){
   const next=[style.size,style.colour,style.brush].join(':');
   if(next!==styleKey){
     styleKey=next;label.size=shadow.size=style.size;
     label.color=style.colour;shadow.x=1;shadow.y=2;
     root.graphics.clear();paintKey='';
   }
   if(words!==event.text){words=event.text;label.text=shadow.text=words;}
   root.visible=true;
  },extent(event,style){
    const width=Math.ceil(Math.max(label.getBounds().width,Array.from(event.text).reduce((n,ch)=>n+(/[\u3000-\uffff]/u.test(ch)?style.size:style.size*.85),0))+12);
    return {width,height:style.size+13};
  },paint(style,extent){
    const key=[style.brush,style.kind,extent.width,extent.height].join(':');if(key===paintKey)return;paintKey=key;
    // The same restrained dark underprint keeps calligraphy legible over
    // bright terrain without separate page elements.
    const g=root.graphics;g.clear();
    if(style.brush)g.beginFill(0x14272a,.76).drawRoundRect(-extent.width/2,-extent.height/2,extent.width,extent.height,5).endFill();
    if(style.kind==='rout')g.lineStyle(1,0xc7bca5,.9).moveTo(-extent.width/2,-extent.height/2).lineTo(extent.width/2,-extent.height/2).lineStyle(0);
  },hide(){root.visible=false;label.text=shadow.text='';words='';}};
}
export function createNativeBattleMarkers(host,{camera,canvasRect,units,shown,colours,side,onTap,onHover,onFocus,visible=()=>true}){
 const {game}=host,plateLayer=game.sprite(undefined,game.ui),fxLayer=game.sprite(undefined,game.ui);
 fxLayer.touchEnabled=fxLayer.touchChildren=false;
 const portraits=portraitCache(game,48),plates=new Map(),roots=new Map();
 const slots=createFloatSlots(36),floaters=new Map(),effects=new Map();
 let closed=false,hovered,active=0,portraitCount=0,fxCount=0;
 for(const unit of units){const p=makePlate(host,plateLayer,unit.id,portraits,onTap,onFocus);plates.set(unit.id,p);roots.set(p.root,unit.id);}
 const clear=()=>{for(const p of plates.values())p.hide();for(const f of effects.values())f.hide();active=portraitCount=fxCount=0;hovered=undefined;};
 function spawn(x,y,z,text,kind,options={}){
   if(closed)return;let id=slots.take();
   if(id===null&&kind==='brush'){
     const displaced=oldestOrdinaryFloat(floaters.values());if(displaced!==null){effects.get(displaced)?.hide();floaters.delete(displaced);slots.give(displaced);id=slots.take();}
   }
   if(id===null)return;
   const style=floatStyle(kind,canvasRect().width,options);floaters.set(id,{id,x,y,z,text:String(text),kind,options,age:0,...style});
 }
 function frame(dt,{selected,targetable}){
   if(closed)return;
   const shownNow=visible(),{safe,scale}=host.metrics(),scene=canvasRect(),mapper=host.mapper();
   if(!(scene.width>0&&scene.height>0&&scale>0)){clear();return;}
   const localRect=r=>{const a=mapper.toScene(r.x,r.y),b=mapper.toScene(r.x+r.width,r.y+r.height);return {left:a.x,top:a.y,right:b.x,bottom:b.y};};
   const obstacles=host.mapOcclusionRects?.()??[],safeCss=localRect(safe),obstacleCss=obstacles.map(localRect);
   camera.updateViewMatrices();const eye=camera.matrixWorld;
   const point=(x,y,z)=>projectToViewport3D(camera,[x,y,z],scene.width,scene.height);
   if(shownNow){
     const rows=[],models=new Map();
     for(const u of units){
       const plate=plates.get(u.id),s=shown[u.id];if(u.gone||u.pos<0||!s)continue;
       const y=s.y+2.9;if(Math.hypot(s.x-eye[12],y-eye[13],s.z-eye[14])>400)continue;
       const pos=point(s.x,y,s.z);if(!pos.inFront||!pos.onScreen)continue;
       const model=battlePlateModel(u,{side,colours,selected,targetable});models.set(u.id,model);
       rows.push({id:u.id,x:pos.x,y:pos.y,fullWidth:plate.extent(model),selected:model.chosen,targetable:model.targetable,focused:plate.focused()});
     }
     const layout=layoutBattlePlates(rows,{width:scene.width,height:scene.height,safe:safeCss,obstacles:obstacleCss}),chosen=new Set();
     active=portraitCount=0;
     for(const p of layout)if(p.box){
       const data=models.get(p.id),visual=plates.get(p.id),origin=mapper.toDesign(p.box.left,p.box.top),portrait=Boolean(data.portrait)&&portraitCount<24;
       chosen.add(p.id);active++;if(portrait)portraitCount++;visual.show(data,p,scale,origin,portrait);
     }
     for(const [id,p] of plates)if(!chosen.has(id))p.hide();
     // Same native stage contact coordinates for presentation hover, no DOM
     // listener or alternate hit areas.
     const {x,y,down}=game.pointer,stagePoint=game.toStage(x,y),hit=game.browser.stage.hitTest(stagePoint.x,stagePoint.y),id=roots.get(hit);
     if(!down&&id!==hovered){hovered=id;if(id!==undefined)onHover?.(id);}
   }else clear();

   fxCount=0;
   for(const [id,f] of floaters){
     const current=floatFrame(f,dt);if(!current){effects.get(id)?.hide();floaters.delete(id);slots.give(id);continue;}
     if(!shownNow)continue;
     const p=point(current.x,current.y,current.z),origin=mapper.toDesign(p.x,p.y);
     if(!p.inFront||!p.onScreen){effects.get(id)?.hide();continue;}
     let effect=effects.get(id);if(!effect){effect=makeFloater(game,fxLayer);effects.set(id,effect);}
     const style=floatStyle(f.kind,scene.width,f.options);
     effect.show(f,style);const extent=effect.extent(f,style),ratio=current.zoom/scale;
     const rect={x:origin.x-extent.width*ratio/2,y:origin.y-extent.height*ratio/2,width:extent.width*ratio,height:extent.height*ratio};
     if(!inside(safe,rect)||obstacles.some(o=>intersects(o,rect))){effect.root.visible=false;continue;}
     effect.paint(style,extent);effect.root.x=origin.x;effect.root.y=origin.y;effect.root.scaleX=effect.root.scaleY=ratio;effect.root.alpha=current.fade;fxCount++;
   }
 }
 return {spawn,frame,ownsFocus:()=>[...plates.values()].some(p=>p.visible&&p.focused()),
   snapshot(){return {units:plates.size,visible:active,portraits:portraitCount,activeFloaters:slots.active,visibleFloaters:fxCount,createdFloaters:effects.size,
     shown:[...plates.values()].filter(p=>p.visible).map(p=>({id:p.id,mode:p.mode,bounds:p.stageBounds}))};},
   dispose(){if(closed)return;closed=true;for(const p of plates.values())p.dispose();plates.clear();roots.clear();portraits.dispose();plateLayer.dispose();fxLayer.dispose();effects.clear();floaters.clear();}
 };
}
