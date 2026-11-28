// Native realm nameplates retain the original seal, commander portrait,
// garrison, ownership and selection information. One reusable native target
// owns pointer activation and the same semantic action.
import { createActionControl, registerScreenOccluder } from '@egret/engine/ui';
import { markerHitArea } from '../view3d/map-marker-math.mjs';
import { plateExtent } from './native-map-plate-model.mjs';

// Active portraits are bounded separately from marker labels, so a dense
// scene cannot exhaust the engine's per-frame image-page admission limit.
function portraitCache(game,limit=48,onWarning=console.warn){
  const entries=new Map();let stamp=0,closed=false;
  function evict(){
    if(entries.size<limit)return;
    const idle=[...entries.values()].filter(e=>!e.refs&&e.settled).sort((a,b)=>a.stamp-b.stamp);
    while(entries.size>=limit&&idle.length){const e=idle.shift();entries.delete(e.url);e.lease?.release();}
  }
  return {acquire(url){
    if(closed||!url)return null;
    let item=entries.get(url);
    if(!item){evict();if(entries.size>=limit)return null;
      item={url,refs:0,stamp:++stamp,settled:false,lease:null};entries.set(url,item);
      item.promise=game.browser.loadTexture(url).then(lease=>{
        item.settled=true;if(closed||entries.get(url)!==item){lease.release();return null;}item.lease=lease;return lease;
      },error=>{item.settled=true;if(!closed)onWarning('Realm portrait unavailable',url,error);return null;});
    }
    item.refs++;item.stamp=++stamp;let held=true;
    return {promise:item.promise,release(){if(held){held=false;item.refs--;item.stamp=++stamp;}}};
  },dispose(){closed=true;for(const e of entries.values())e.lease?.release();entries.clear();},get size(){return entries.size;}};
}

function makeVisual(host,parent,type,portraits,activate){
  const {game,semantics}=host,root=game.sprite(undefined,parent);root.touchChildren=false;root.visible=false;root.touchEnabled=false;
  const name=game.text('',{layer:root,size:type==='relief'?16:type==='army'?12:13,bold:true,baseline:'middle',color:0xf2ede2,fontFamily:type==='relief'?'serif':'sans-serif'});
  const seal=type==='relief'?null:game.text('',{layer:root,size:13,bold:true,baseline:'middle',align:'center',color:0xffffff,fontFamily:'serif'});
  const troops=type==='army'?game.text('',{layer:root,size:11,baseline:'middle',color:0x9fc6ff}):null;
  let current=null,data=null,visual=null,hit=null,control=null,semantic=null,portraitRef=null,portraitLease=null,portraitUrl='',portraitWanted=false,painted='',token=0;
  // Verification only: the passive relief text has a real painted card but
  // deliberately takes no pointer input. The actual local face can still be
  // checked by the engine's screen report, distinct from an invisible holder.
  const occluder=type==='relief'?registerScreenOccluder(root,{name:()=>data?.name??'Relief label',rect:()=>visual??{x:0,y:0,width:0,height:0}}):null;
  const go=()=>{if(current&&root.visible&&root.touchEnabled)activate(current);};
  if(type!=='relief'){
    control=createActionControl({input:game.browser.pointer,target:root,activation:'tap',onActivate:go});control.setEnabled(false);
  }
  const measured=()=>({name:name.getBounds().width,troops:troops?.getBounds().width??0});
  const rect=()=>{
    const bounds=hit??visual;if(!bounds)return {x:0,y:0,width:0,height:0};
    const a=root.localToGlobal(bounds.x,bounds.y),b=root.localToGlobal(bounds.x+bounds.width,bounds.y+bounds.height);
    return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(b.x-a.x),height:Math.abs(b.y-a.y)};
  };
  function changePortrait(url,wanted){
    const same=url===portraitUrl&&wanted===portraitWanted;
    if(same&&(portraitRef||!wanted||!url))return;
    // Drop the previous painted image before giving its lease back.
    if(!same){root.graphics.clear();painted='';portraitRef?.release();portraitRef=null;portraitLease=null;}
    portraitUrl=url;portraitWanted=wanted;const rev=++token;
    if(!wanted||!url)return;
    const ref=portraits.acquire(url);if(!ref)return;portraitRef=ref;
    void ref.promise.then(lease=>{if(rev===token&&portraitRef===ref&&current){portraitLease=lease;painted='';game.invalidate();}});
  }
  function paint(){
    if(!data)return;
    visual=plateExtent(data,measured());hit=type==='relief'?null:markerHitArea(visual);
    const key=[current.id,data.key,visual.width,visual.height,Boolean(portraitLease)].join(':');if(key===painted)return;painted=key;
    if(hit)root.hitArea=hit;
    const g=root.graphics,{x,y,width:w,height:h}=visual;
    g.clear();
    if(type==='relief'){
      g.beginFill(0x17272a,.68).drawRect(x,y,w,h).endFill().lineStyle(1,0xf4e3b9,.68).moveTo(x,y).lineTo(x+w,y).moveTo(x,y+h).lineTo(x+w,y+h).lineStyle(0);
      name.x=x+9;name.y=y+h/2;return;
    }
    const edge=data.selected?0xf0d070:data.siege?0xe6503c:0xc8b994;
    if(type==='place'){
      const square=data.kind==='city'?20:16;
      g.beginFill(0x141a20,.88).drawRoundRect(x,y,w,h,4).endFill().lineStyle(1,edge,data.selected||data.siege?1:.55).drawRoundRect(x,y,w,h,4).lineStyle(0);
      g.beginFill(data.colour).drawRoundRect(x+3,y+(h-square)/2,square,square,3).endFill();
      seal.x=x+3+square/2;seal.y=y+h/2;seal.size=data.kind==='city'?13:11;name.x=x+square+8;name.y=y+h/2-1;
      if(data.kind==='city'){
        const barX=x+square+7,barW=Math.max(2,w-square-12);
        g.beginFill(0xffffff,.16).drawRect(barX,y+h-3,barW,2).endFill();
        if(data.share>0)g.beginFill(0xe0c675).drawRect(barX,y+h-3,barW*data.share,2).endFill();
      }
      return;
    }
    const r=data.far?14:20,face=r-3;
    g.beginFill(data.mine?0xe3c372:data.colour).drawCircle(0,0,r).endFill().lineStyle(1,edge,.95).drawCircle(0,0,r).lineStyle(0);
    if(portraitLease){
      const texture=portraitLease.value,scale=Math.max(face*2/texture.width,face*2/texture.height);
      g.beginBitmapFill(portraitLease,{a:scale,b:0,c:0,d:scale,tx:-texture.width*scale/2,ty:-texture.height*scale/2},false).drawCircle(0,0,face).endFill();
    }else g.beginFill(0x263238).drawCircle(0,0,face).endFill();
    seal.visible=!portraitLease;seal.x=0;seal.y=0;seal.size=data.far?12:15;
    name.visible=!data.far;troops.visible=!data.far;
    if(!data.far){
      const cardX=r+4,cardW=w-r*2-4;
      g.beginFill(0x141a20,.88).drawRect(cardX,-r,cardW,r*2).endFill();
      g.beginFill(data.colour).drawRect(cardX,-r,2,r*2).endFill();
      name.x=cardX+6;name.y=-10;troops.x=cardX+6;troops.y=3;
      g.beginFill(0xffffff,.16).drawRect(cardX+6,14,Math.max(2,cardW-12),3).endFill();
      if(data.share>0)g.beginFill(0x6aa7ee).drawRect(cardX+6,14,Math.max(2,cardW-12)*data.share,3).endFill();
    }
  }
  return {root,get record(){return current;},get stageBounds(){return rect();},extent(next){return plateExtent(next,current?.entity===next.id?measured():{});},
    bind(record,next,wanted){
      if(current!==record){
        this.release();current=record;data=next;
        if(type!=='relief')semantic=semantics.add({id:'realm-marker-'+record.id,role:'button',
          describe:()=>({name:data?.name??record.id,bounds:rect(),hidden:!root.visible,disabled:!root.touchEnabled}),
          onActivate:()=>{if(control.enabled){control.press();control.release();}}});
      }
      if(data?.key!==next.key||!painted){
        data=next;name.text=next.words;name.size=type==='relief'?16:type==='place'&&next.kind!=='city'?12:type==='army'?12:13;
        if(seal)seal.text=next.seal;if(troops)troops.text=next.troops;painted='';
      }else data=next;
      if(type==='army')changePortrait(next.portrait,wanted);
      root.visible=true;root.touchEnabled=type!=='relief';control?.setEnabled(type!=='relief');paint();
    },
    place(point,scale){root.x=point.x;root.y=point.y;root.scaleX=root.scaleY=1/scale;},
    release(){
      if(!current)return;
      if(!root.isDisposed){control?.setEnabled(false);root.touchEnabled=false;root.visible=false;root.graphics.clear();name.text='';if(seal)seal.text='';if(troops)troops.text='';}
      semantic?.remove();semantic=null;painted='';portraitRef?.release();portraitRef=null;portraitLease=null;portraitUrl='';portraitWanted=false;token++;current=data=null;
    },dispose(){this.release();occluder?.dispose();control?.dispose();root.dispose();}
  };
}

export function createMapPlatePool(host,parent,activate,onWarning){
  const portraits=portraitCache(host.game,48,onWarning),all=new Set(),free={place:[],army:[],relief:[]};
  return {take(type){let visual=free[type].pop();if(!visual){
      // The visible set is at most 96; keep only sixteen additional warm
      // objects across type changes instead of a separate unbounded pool.
      if(all.size>=112){const spare=Object.values(free).find(list=>list.length)?.pop();if(spare){spare.dispose();all.delete(spare);}}
      visual=makeVisual(host,parent,type,portraits,activate);all.add(visual);
    }return visual;},
    give(type,visual){visual.release();free[type].push(visual);},
    dispose(){for(const x of all)x.dispose();all.clear();for(const list of Object.values(free))list.length=0;portraits.dispose();},
    stats(){return {created:all.size,free:Object.values(free).reduce((n,a)=>n+a.length,0),portraits:portraits.size};}
  };
}
