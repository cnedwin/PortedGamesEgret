// The retained nameplate model is presentation only: no campaign state is
// mutated. Its keys mirror the prior ownership/troop/selection/language cache.
import {FACTIONS,LATER} from '../data/factions.mjs';
import {NODES} from '../data/map.mjs';
import {getLanguage} from '../i18n.mjs';
import {troopCap} from '../sim/military.mjs';
import {generalName,placeName} from '../view/names.mjs';
import {portrait} from '../view/portrait.mjs';

const factionColour=(state,id)=>state?.factions[id]?.colour??FACTIONS[id]?.colour??LATER[id]?.colour??0x8a8478;
const fmt=n=>Math.round(n).toLocaleString(getLanguage()==='en'?'en':'zh-CN');
const sealOf=(s,id)=>{
  const f=s.factions[id];if(!f)return '·';
  if(getLanguage()!=='en')return f.flag??'—';
  const name=f.name?.en??FACTIONS[id]?.en??LATER[id]?.en??f.en??'';
  return (name.replace(/^The /,'')[0]??'—').toUpperCase();
};
const clampShare=n=>Math.max(0,Math.min(1,n));

export function placePlate(state,id,selection,player,sieges){
  const n=NODES[id],node=state?.nodes[id];if(!n||!node)return null;
  const owner=node.owner,capital=Boolean(owner&&state.factions[owner]?.capital===id),selected=selection?.node===id;
  const name=placeName(id),siege=sieges.has(id),share=n.kind==='city'?clampShare(node.troops/Math.max(1,6000+n.size*6000)):0;
  return {type:'place',kind:n.kind,id,name,words:name+(capital?' ◆':''),seal:owner?sealOf(state,owner):'·',colour:owner?factionColour(state,owner):0x6b6760,
    capital,selected,mine:owner===player,siege,share,priority:(selected?1000:0)+(capital?100:0)+(n.kind==='city'?35:0)+(owner===player?10:0),
    key:[owner,siege,capital,selected,owner===player,Math.round(share*40),getLanguage()].join('|')};
}
export function armyPlate(state,id,selection,player,far){
  const a=state?.armies[id];if(!a)return null;
  const selected=selection?.army===id,mine=a.faction===player,name=generalName(a.commander),
    share=clampShare(a.troops/Math.max(1,a.commander?troopCap(state,a.commander):10000));
  return {type:'army',id,name,words:name,seal:sealOf(state,a.faction),colour:factionColour(state,a.faction),selected,mine,
    siege:Boolean(a.besieging),troops:fmt(a.troops),share,portrait:a.commander?portrait(a.commander,48):'',far,
    priority:(selected?1000:0)+(mine?200:0)+70,key:[a.commander,a.faction,Math.round(a.troops/50),selected,mine,a.besieging??'',far,getLanguage()].join('|')};
}

// Conservative fallback before the native atlas's real raster bounds arrive.
const labelWidth=(value,size)=>Array.from(String(value)).reduce((sum,ch)=>sum+(/[\u3000-\uffff]/u.test(ch)?size:size*.8),0);
export function plateExtent(data,measured={}){
  if(data.type==='relief'){
    const width=Math.ceil(Math.max(labelWidth(data.words,16),measured.name??0)+18);return {x:-width/2,y:-26,width,height:25};
  }
  if(data.type==='place'){
    const city=data.kind==='city',height=city?26:22,seal=city?20:16;
    const width=Math.ceil(seal+14+Math.max(labelWidth(data.words,city?13:12),measured.name??0));
    return {x:-width/2,y:-height,width,height};
  }
  const radius=data.far?14:20;
  const card=data.far?0:Math.ceil(Math.max(64,labelWidth(data.words,12)+12,labelWidth(data.troops,11)+12,(measured.name??0)+12,(measured.troops??0)+12));
  return {x:-radius,y:-radius,width:radius*2+(card?card+4:0),height:radius*2};
}
