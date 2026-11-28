// Battle presentation reads the original unit and never writes to simulation.
import {UNITS} from '../data/battle.mjs';
import {nm,getLanguage} from '../i18n.mjs';
import {generalName} from '../view/names.mjs';
import {portrait} from '../view/portrait.mjs';
const share=n=>Math.max(0,Math.min(1,n));
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const widthOf=(value,size)=>Array.from(String(value)).reduce((acc,ch)=>acc+(/[\u3000-\uffff]/u.test(ch)?size:size*.82),0);
export function battlePlateModel(unit,{side,colours,selected,targetable}){
  const kind=nm(UNITS[unit.kind]),title=unit.general?generalName(unit.general):kind;
  const mine=unit.side===side,chosen=selected===unit.id,aim=Boolean(targetable?.has(unit.id)),routed=Boolean(unit.routed);
  const troops=Math.round(unit.troops).toLocaleString(getLanguage()==='en'?'en':'zh-CN');
  const health=share(Math.round(unit.troops/Math.max(1,unit.start)*100)/100),rage=share(Math.round(unit.rage)/100),full=unit.rage>=100;
  return {id:unit.id,name:title+' · '+kind,title,symbol:kind.slice(0,1)||'?',troops,health,rage,
    mine,chosen,targetable:aim,routed,full,colour:colours[unit.side],portrait:unit.general?portrait(unit.general,48):'',
    staticKey:[getLanguage(),unit.general,unit.kind,mine].join(':'),key:[troops,health,rage,mine,chosen,aim,routed,full].join(':')};
}
export function battlePlateWidth(data,measured={}){
  return Math.ceil(42+Math.max(62,widthOf(data.title,12)+12,widthOf(data.troops,11)+12,(measured.name??0)+12,(measured.troops??0)+12));
}
export function floatStyle(kind,screenWidth,{ours=true,signature=false}={}){
  const brush=kind==='brush';
  const size=brush?signature?clamp(screenWidth*.038,30,54):clamp(screenWidth*.032,24,44):kind==='rout'?15:19;
  return {kind,brush,signature,ours,life:brush?1.9:kind==='tactic'?1.8:1.15,size:Math.round(size),
    colour:brush?signature?0xffe4a6:ours?0xf2d69d:0xefb397:kind==='hurt'?0xf4b69e:kind==='rout'?0xc7bca5:0xffe6b4};
}
export function floatFrame(f,dt){
  f.age+=dt;if(f.age>=f.life)return null;
  return {x:f.x,y:f.y+(f.brush?0:f.age*.9),z:f.z,fade:f.brush?Math.min(1,(f.life-f.age)*2.5):1-Math.max(0,f.age/f.life-.5)*2,
    zoom:f.brush?1+Math.min(.25,f.age*.6):1};
}
export function createFloatSlots(limit=36){
  const active=new Set(),free=[];
  for(let i=limit-1;i>=0;i--)free.push(i);
  return {take(){if(!free.length)return null;const id=free.pop();active.add(id);return id;},give(id){if(!active.delete(id))return false;free.push(id);return true;},get active(){return active.size;}};
}
export function oldestOrdinaryFloat(floaters){
  let oldest=null;
  for(const f of floaters)if(!f.brush&&(!oldest||f.age>oldest.age))oldest=f;
  return oldest?.id??null;
}
