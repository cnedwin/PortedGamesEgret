// A native texture for the painted land. Dynamic marks and camera frame are
// retained Graphics, never a per-frame texture readback or a page canvas.
import { Bitmap } from '@egret/engine';
import { registerScreenOccluder } from '@egret/engine/ui';
import { MAP } from '../data/map.mjs';
import { getLanguage } from '../i18n.mjs';
import { factionColour } from '../view3d/realm.mjs';
import { paintBase, paintLands } from '../view/mapart.mjs';
import { buildTerritoryGrid } from '../view/territory.mjs';
import { layoutMiniMap, miniMapTarget, miniMapMarks } from './native-minimap-model.mjs';

const RAW_WIDTH=464;

export function createNativeMinimap(app,host,{topbar,onError=console.error}={}){
  const {game,semantics}=host,root=game.sprite(undefined,game.ui),marks=game.sprite(undefined,root);
  const base=paintBase(RAW_WIDTH/MAP.width),surface=document.createElement('canvas');surface.width=base.width;surface.height=base.height;
  const ctx=surface.getContext('2d');let lands=null,layer=null,ownerKey=null,bitmap=null,lease=null,box={x:0,y:0,width:0,height:0},visible=false,closed=false,desired=0,generated=0,pending=false,markKey='',inputEnabled=false;
  const canJump=()=>visible&&!closed&&!app.dialogOpen&&app.screen==='play';
  const name=()=>getLanguage()==='en'?'Minimap':'小地图';
  const shadow=()=>{const a=root.localToGlobal(0,0),b=root.localToGlobal(box.width,box.height);return{x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y};};
  function jump(x,y){if(!canJump()||!Number.isFinite(x)||!Number.isFinite(y))return;const point=miniMapTarget(x,y,box.width,box.height);app.map.rig.glideTo(point.x,point.z,app.map.rig.view.td,.5);}
  game.onTap(root,activation=>{activation.stopPropagation();jump(activation.localX,activation.localY)});
  const offGesture=game.gestures(root,{drag:drag=>{if(drag.phase==='start'||drag.phase==='move')jump(drag.localX,drag.localY)}});
  const semantic=semantics.add({id:'nine-minimap',role:'button',describe:()=>({name:name(),bounds:shadow(),hidden:!visible,disabled:!canJump()}),onActivate:()=>{if(canJump())jump(box.width/2,box.height/2)}});
  const paintClaim=registerScreenOccluder(root,{name,rect:()=>({x:0,y:0,width:box.width,height:box.height})});

  function fitBitmap(){if(bitmap){bitmap.width=box.width;bitmap.height=box.height;}}
  function relayout(){
    if(closed)return;const m=host.metrics(),top=topbar?.geometry?.bottomDesign??m.safe.y,next=layoutMiniMap(m.safe,m.scale,top,m.portrait);box=next;
    root.x=box.x;root.y=box.y;root.hitArea={x:0,y:0,width:box.width,height:box.height};
    // A native border and backing are the actual painted face; bitmap plus
    // graphics remain children, and no page overlay is needed.
    root.graphics.clear().beginFill(0x172529,.97).drawRect(0,0,box.width,box.height).endFill().lineStyle(1,0xb79962,.95).drawRect(0,0,box.width,box.height);
    fitBitmap();markKey='';draw();game.invalidate();
  }
  const offLayout=host.addLayout(relayout);
  async function generate(){
    if(pending||closed)return;pending=true;
    try{while(!closed&&generated!==desired){
      const rev=desired;ctx.clearRect(0,0,surface.width,surface.height);ctx.drawImage(base,0,0,surface.width,surface.height);
      if(layer){ctx.globalAlpha=.82;ctx.drawImage(layer,0,0,surface.width,surface.height);ctx.globalAlpha=1;}
      const next=await game.browser.textureFromCanvas(surface);generated=rev;
      if(closed||rev!==desired){next.release();continue;}
      const old=lease;lease=next;
      if(!bitmap){bitmap=new Bitmap(next);root.addChildAt(bitmap,0);}else bitmap.textureLease=next;
      fitBitmap();old?.release();game.invalidate();
    }}catch(error){generated=desired;if(!closed)onError(error);}finally{pending=false;}
  }
  function refresh(){
    if(closed)return;const state=app.state??app.demoState;if(!state)return;
    lands??=buildTerritoryGrid();const color=id=>factionColour(state,id),owners=lands.ids.map(id=>state.nodes[id]?.owner??null),key=owners.map(id=>id?id+':'+color(id):'').join('|');
    if(key===ownerKey)return;ownerKey=key;layer=paintLands(lands,owners,color);app.map.setTerritorySource(layer);desired++;void generate();
  }
  function edge(g,x1,y1,x2,y2){
    // Keep just the segment that the old minimap's canvas would have shown.
    const w=box.width,h=box.height;
    if(y1===y2){if(y1<0||y1>h)return;const a=Math.max(0,Math.min(x1,x2)),b=Math.min(w,Math.max(x1,x2));if(a<=b)g.moveTo(a,y1).lineTo(b,y1);}
    else{if(x1<0||x1>w)return;const a=Math.max(0,Math.min(y1,y2)),b=Math.min(h,Math.max(y1,y2));if(a<=b)g.moveTo(x1,a).lineTo(x1,b);}
  }
  function draw(){
    if(closed)return;const state=app.state??app.demoState;if(!visible||!state||box.width<=0||box.height<=0)return;
    const active=canJump();if(active!==inputEnabled){inputEnabled=active;root.touchEnabled=active;}
    const v=app.map.rig.view,data=miniMapMarks(state,app.homeCity(),v),kx=box.width/MAP.width,ky=box.height/MAP.height;
    const x=value=>Math.round(value*kx*10)/10,y=value=>Math.round(value*ky*10)/10,c=data.camera;
    const key=[box.width,box.height,data.home?.x,data.home?.z,...data.armies.flatMap(a=>[a.id,a.x,a.z]),x(c.x),y(c.z),x(c.width),y(c.height)].join('|');
    if(key===markKey)return;markKey=key;const g=marks.graphics;g.clear();
    if(data.home)g.beginFill(0xf1d792).lineStyle(1,0x2a1a06).drawCircle(x(data.home.x),y(data.home.z),2.7).endFill();
    g.lineStyle(0).beginFill(0xffffff);for(const a of data.armies)g.drawRect(x(a.x)-1,y(a.z)-1,2,2);g.endFill();
    g.lineStyle(1,0xfff6dc,.95);const left=x(c.x),top=y(c.z),right=x(c.x+c.width),bottom=y(c.z+c.height);
    edge(g,left,top,right,top);edge(g,left,bottom,right,bottom);edge(g,left,top,left,bottom);edge(g,right,top,right,bottom);
    game.invalidate();
  }
  function setVisible(on){if(closed)return;on=Boolean(on);if(on===visible)return;visible=on;root.visible=on;root.touchEnabled=on&&canJump();inputEnabled=root.touchEnabled;if(on){relayout();refresh();draw();}else game.invalidate();}
  function close(){if(closed)return;closed=true;visible=false;offLayout?.();offGesture?.();semantic.remove();paintClaim.dispose();if(bitmap){bitmap.dispose();bitmap=null;}root.dispose();lease?.release();lease=null;}
  root.visible=false;root.touchEnabled=false;refresh();
  return {refresh,draw,relayout,setVisible,close,snapshot:()=>({visible,inputEnabled,box:{...box},textureReady:Boolean(bitmap),revision:generated})};
}
