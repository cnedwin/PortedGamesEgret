import { createActionControl } from '@egret/engine/ui';
import { TEXT } from '../text.mjs';
const cluster=[['reload','aim','fire'],['crouch','interact','jump'],['heal','grenade','swap']];
const tools=['bag','pause'];
const keys=[...cluster.flat(),...tools];
const labelKey=n=>n==='interact'?'use':n;
const fullNames={zh:{fire:'开火',aim:'瞄准',reload:'换弹',jump:'跳跃',crouch:'蹲下',interact:'按住互动',heal:'使用绷带',grenade:'手雷',swap:'切换武器',bag:'背包',pause:'暂停'},en:{fire:'Fire',aim:'Aim',reload:'Reload',jump:'Jump',crouch:'Crouch',interact:'Hold to use',heal:'Bandage',grenade:'Grenade',swap:'Swap weapon',bag:'Backpack',pause:'Pause'}};
export function layoutTouchControls(safe,scale){
 const unit=1/Math.max(.01,scale),gap=5*unit,size=48*unit,pitch=size+gap,edge=8*unit,right=safe.x+safe.width-edge,bottom=safe.y+safe.height-edge;
 const result={};cluster.forEach((row,ri)=>row.forEach((name,ci)=>{result[name]={x:right-(3-ci)*pitch+gap,y:bottom-(3-ri)*pitch+gap,w:size,h:size}}));
 const wide=safe.width>safe.height,offset=wide?120*unit:0;
 tools.forEach((name,i)=>{result[name]={x:right-offset-(2-i)*pitch+gap,y:safe.y+edge,w:size,h:size}});return result;
}
export function createTouchControls(play,input,semantics,settings){
 const port=play.browser.pointer,scope=play.scope,nodes=new Map();let visible=false,closing=false,stick,stickScale=0,boxes={},lang=settings.lang,layoutSignature='';
 const scale=()=>play.browser.screen.scale||1;
 function draw(item,pressed){const {node}=item;const selected=(item.name==='aim'&&input.aim)||(item.name==='crouch'&&input.crouch);node.graphics.clear().beginFill(pressed||selected?0x347968:0x10212a,(pressed||selected)?0.87:0.70).drawCircle(24,24,23).endFill().lineStyle(1.6,pressed||selected?0x85f3cd:0xb3c6bd,.87).drawCircle(24,24,22.7);}
 function descriptor(name){return fullNames[lang]?.[name]??fullNames.en[name];}
 for(const name of keys){
  const node=play.sprite(undefined,play.ui);node.hitArea={x:0,y:0,width:48,height:48};node.touchEnabled=false;node.visible=false;
  const label=play.text(TEXT[lang]?.touch[labelKey(name)]??TEXT.en.touch[labelKey(name)],{x:24,y:24,baseline:'middle',align:'center',size:name==='interact'?12:13,color:0xf2f7f4,bold:true,layer:node});
  const item={name,node,label,pressed:false,available:false};nodes.set(name,item);
  const hold=['fire','reload','jump','heal','grenade','interact'].includes(name);
  item.control=createActionControl({input:port,target:node,onPressChange(pressed){item.pressed=pressed;if(hold)input.hold(name,name,pressed);if(!closing)draw(item,pressed);},onActivate(){if(!hold&&!closing)input.action(name);}});
  item.control.setEnabled(false);draw(item,false);
  item.semantic=semantics.add({id:'fps-touch-'+name,role:name==='aim'||name==='crouch'?'switch':'button',describe:()=>{const a=node.localToGlobal(0,0),b=node.localToGlobal(48,48);return{name:descriptor(name),bounds:{x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y},hidden:!item.available,disabled:!item.available,...((name==='aim'||name==='crouch')?{checked:name==='aim'?input.aim:input.crouch}:{})};},onActivate:()=>input.action(name)});
 }
 // Native contacts report cancellation after onPressChange released the owner;
 // discard only that owner's unsampled action, not its neighbour's input.
 const unobserve=port.observe(({kind,target})=>{if(kind!=='cancel')return;for(const item of nodes.values())if(item.node===target)input.hold(item.name,item.name,false,true);});
 function relayout(){
  if(closing)return;const s=scale(),safe=play.safe,next=layoutTouchControls(safe,s),signature=[safe.x,safe.y,safe.width,safe.height,s].join(',');if(signature===layoutSignature)return;layoutSignature=signature;boxes=next;
  for(const[name,item]of nodes){const box=boxes[name];item.node.x=box.x;item.node.y=box.y;item.node.scaleX=box.w/48;item.node.scaleY=box.h/48;}
  if(!stick||Math.abs(stickScale-s)>.01){if(stick&&!stick.isDisposed)play.remove(stick);stickScale=s;stick=play.touchStick({radius:56/s,floating:{area:()=>{const a=play.safe;return{x:a.x,y:a.y+a.height*.36,width:a.width*.4,height:a.height*.64}},exclude:(x,y)=>!visible||Object.values(boxes).some(b=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h),deadZonePx:8}});}
  input.setTouchTargets([...nodes.values()].map(i=>i.node),nodes.get('fire').node);play.invalidate();
 }
 function setVisible(next){next=Boolean(next);if(closing||next===visible)return;visible=next;for(const item of nodes.values()){item.available=visible;item.control.setEnabled(visible);item.node.visible=visible;item.node.touchEnabled=visible;draw(item,false);}play.invalidate();}
 function setLanguage(next){lang=next;for(const item of nodes.values())item.label.text=TEXT[lang]?.touch[labelKey(item.name)]??TEXT.en.touch[labelKey(item.name)];}
 function update(){if(closing)return;for(const name of ['aim','crouch']){const item=nodes.get(name),selected=name==='aim'?input.aim:input.crouch;if(item.selected!==selected){item.selected=selected;draw(item,item.pressed);}}}
 const off=play.browser.onScreenChange(relayout);relayout();scope.use({dispose(){closing=true;unobserve();off();for(const item of nodes.values()){item.semantic.remove();item.control.dispose();}}});
 return{setVisible,setLanguage,update,relayout,snapshot:()=>({visible,boxes:Object.fromEntries(Object.entries(boxes).map(([name,b])=>[name,{...b}])),aim:input.aim,crouch:input.crouch})};
}