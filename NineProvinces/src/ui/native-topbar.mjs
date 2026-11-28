// Native campaign header. Keep the original resource, clock and menu actions;
// only the drawing, touch areas, names and responsive layout live here.
import { NODES } from '../data/map.mjs';
import { TECHS } from '../data/techs.mjs';
import { power, income, upkeep } from '../sim/world.mjs';
import { getLanguage, nm, num, t } from '../i18n.mjs';
import { factionName, placeName } from '../view/names.mjs';
import { seasonOf } from '../view3d/seasons.mjs';
import { dayWords, pair } from './text.mjs';
import { markOf } from './dom.mjs';

export const CAMPAIGN_SPEEDS=[0.5,1,2,4,8];
const C={ink:0x172529,slate:0x273c3d,paper:0xf2e6c7,gold:0xe2bd83,muted:0xc0cdbc,edge:0x93784d,bad:0xf5a49a};
const skin={panel:C.ink,panelAlpha:.96,text:C.paper,button:C.slate,buttonText:C.paper,disabled:0x667473,accent:C.gold,track:0x47534e,radius:3,size:14,dim:.55};
const word=(zh,en)=>pair([zh,en]);
const sign=n=>(n>=0?'+':'−')+num(Math.abs(n));

function domainOwners(s){
  const counts=new Map();for(const [id,site] of Object.entries(s.nodes))if(NODES[id]?.kind==='city'&&site.owner)counts.set(site.owner,(counts.get(site.owner)??0)+1);
  const rivals=[...counts].filter(([id])=>id!==s.player).sort((a,b)=>b[1]-a[1]).slice(0,3);
  return [s.player,...rivals.map(([id])=>id)].map(id=>({name:factionName(s,id),colour:s.factions[id]?.colour??0x867d68}));
}

export function readCampaignHeader(app){
  const s=app.state;if(!s)return null;const f=s.factions[s.player];if(!f)return null;
  let coin=0,grain=0;for(const id in s.nodes)if(s.nodes[id].owner===s.player){const m=income(s,id);coin+=m.coin;grain+=m.grain;}
  const u=upkeep(s,s.player),p=power(s,s.player),r=f.research,tech=r.current?TECHS[r.current]:null,home=app.homeCity();
  const raw={coin:f.coin,grain:f.grain,troops:u.troops,cities:p.cities,fame:f.fame,netCoin:coin-u.coin,netGrain:grain-u.grain};
  return {raw,faction:factionName(s,s.player),flag:markOf(f),factionColour:f.colour??0x8a7d66,date:dayWords(s.day),season:t('season_'+seasonOf(s.day).name),
    research:tech?nm(tech):t('studyNone'),researchPercent:tech?Math.min(99,Math.floor((r.points/tech.cost)*100)):null,
    home,homeName:home?placeName(home):'',territory:Boolean(app.settings.territoryMap),domains:domainOwners(s),paused:Boolean(app.paused),speed:app.speed,blocked:Boolean(app.dialogOpen),locale:getLanguage(),
    values:{coin:num(raw.coin),grain:num(raw.grain),troops:num(raw.troops),cities:num(raw.cities),fame:num(raw.fame)},
    nets:{coin:t('netShort')+' '+sign(raw.netCoin),grain:t('netShort')+' '+sign(raw.netGrain)}};
}

const row=(children,props={})=>({type:'panel',layout:'row',children,width:'100%',height:48,gap:4,...props});
const col=(children,props={})=>({type:'panel',layout:'column',children,width:'100%',height:'fill',gap:2,...props});
const text=(name,value,props={})=>({type:'text',name,text:String(value),width:'fill',height:20,size:13,color:C.paper,align:'center',...props});
export function campaignHeaderHeight(portrait){return portrait?207:105;}

export function buildCampaignHeader(app,state,{selectSpeed}){
  const bind={},named=(name,get,props={})=>{bind[name]={text:()=>get()};return text(name,get(),props);};
  function dynamicButton(name,label,tap,props={}){
    const {semantic=label,disabled,selected, ...style}=props;
    bind[name]={text:()=>label(),label:()=>semantic(),tap:()=>{if(!state.blocked&&!disabled?.())tap();},disabled:()=>state.blocked||Boolean(disabled?.()),...(selected?{color:()=>selected()?0x73582e:C.slate}:{})};
    return {type:'button',name,text:label(),width:'fill',height:48,size:14,color:C.slate,border:{color:C.edge,width:1},...style};
  }
  const control=(name,key,action,props)=>dynamicButton(name,()=>t(key),action,props);
  const realmText=named('campaign-realm-name',()=>state.faction,{height:22,size:14,bold:true});
  bind['campaign-realm-flag']={color:()=>state.factionColour};
  const flag={type:'panel',name:'campaign-realm-flag',color:state.factionColour,width:36,height:36,layout:'free',children:[named('campaign-banner-letter',()=>state.flag,{size:20,bold:true,color:C.paper,width:'100%',height:'100%',anchor:'center'})]};
  bind['campaign-realm']={label:()=>t('menuFaction')+' · '+state.faction,tap:()=>{if(!state.blocked)app.open('realm');},disabled:()=>state.blocked};
  const realm={type:'panel',name:'campaign-realm',role:'button',label:t('menuFaction'),layout:'row',children:[flag,realmText],align:'center',color:C.slate,width:135,height:48,padding:3,gap:3,border:{color:C.edge,width:1}};
  bind['campaign-paused-mark']={text:()=>state.paused?t('paused'):'',visible:()=>state.paused};
  const pausedMark=text('campaign-paused-mark',state.paused?t('paused'):'',{height:13,size:10,color:C.gold,visible:state.paused});
  const date=col([named('campaign-date',()=>state.date,{height:19,size:13,bold:true,color:C.gold}),named('campaign-season',()=>state.season,{height:15,size:12,color:C.muted}),pausedMark],{width:116,height:48,gap:0,justify:'center'});
  const pause=dynamicButton('campaign-pause',()=>t(state.paused?'resume':'pause'),()=>app.setPaused(!app.paused),{width:60,selected:()=>state.paused,size:14});
  const speed=dynamicButton('campaign-speed',()=>String(CAMPAIGN_SPEEDS[state.speed]??2)+word('天/s',' d/s'),selectSpeed,{width:60,semantic:()=>word('推进速度','Campaign speed'),size:13});
  const res=['coin','grain','troops','cities','fame'].map(key=>{
    const label=named('campaign-resource-'+key+'-label',()=>t(key),{height:12,size:11,color:C.muted});
    const value=named('campaign-resource-'+key,()=>state.values[key],{height:19,size:14,bold:true});
    let detail=null;if(key==='coin'||key==='grain'){const name='campaign-resource-'+key+'-net';detail=named(name,()=>state.nets[key],{height:12,size:11,color:C.muted});bind[name].color=()=>state.raw[key==='coin'?'netCoin':'netGrain']<0?C.bad:C.muted;}
    return col([label,value,...(detail?[detail]:[])],{width:'fill',height:48,gap:0,justify:'center'});
  });
  const resources=row(res,{height:48,width:'fill',gap:1});
  const research=dynamicButton('campaign-research',()=>state.researchPercent===null?state.research:state.research+' '+state.researchPercent+'%',()=>app.open('tech'),{width:126,size:12,semantic:()=>t('menuTech')+' · '+state.research+(state.researchPercent===null?'':' '+state.researchPercent+'%')});
  bind['campaign-home']={label:()=>state.home?t('returnHome')+' · '+state.homeName:t('returnHome'),tap:()=>{if(!state.blocked&&state.home)app.goHome();},disabled:()=>state.blocked||!state.home};
  const home={type:'panel',name:'campaign-home',role:'button',label:t('returnHome'),color:C.slate,border:{color:C.edge,width:1},width:'fill',height:48,layout:'column',gap:0,padding:3,justify:'center',children:[named('campaign-home-label',()=>t('returnHome'),{height:20,size:14,bold:true}),named('campaign-home-target',()=>state.homeName,{height:13,size:10,color:C.muted})]};
  const menus=[
    home,
    dynamicButton('campaign-territory',()=>word('势力图','Domains'),()=>app.setSetting('territoryMap',!app.settings.territoryMap),{selected:()=>state.territory}),
    control('campaign-generals','menuGenerals',()=>app.open('generals')),
    control('campaign-diplomacy','menuDiplomacy',()=>app.open('diplomacy')),
    dynamicButton('campaign-tech',()=>t('menuTech')+(state.researchPercent===null?'':' '+state.researchPercent+'%'),()=>app.open('tech'),{semantic:()=>t('menuTech')}),
    control('campaign-chronicle','menuStory',()=>app.open('chronicle')),
    control('campaign-saves','menuSave',()=>app.open('saves')),
    control('campaign-settings','settings',()=>app.open('settings'))
  ];
  bind['campaign-generals'].badge=()=>app.game?.badges.count('campaign/officers')??0;
  bind['campaign-diplomacy'].badge=()=>app.game?.badges.count('campaign/inbox/envoy')??0;
  bind['campaign-chronicle'].badge=()=>((app.game?.badges.count('campaign/inbox/story')??0)+(app.game?.badges.count('campaign/reports')??0));
  const chips=Array.from({length:4},(_,i)=>{
    const name='campaign-domain-'+i,box=name+'-swatch';bind[name]={visible:()=>Boolean(state.domains[i])};bind[box]={color:()=>state.domains[i]?.colour??C.muted};
    return row([{type:'panel',name:box,color:C.muted,width:11,height:11,border:{color:0xc6b694,width:1}},named(name+'-label',()=>state.domains[i]?.name??'',{size:12,height:20,bold:true,color:C.paper,align:'left'})],{name,width:'fill',height:22,gap:3,align:'center'});
  });
  bind['campaign-domain-legend']={visible:()=>state.territory};
  const legend=height=>col([row(chips,{height:23,gap:2}),text('campaign-domain-neutral',word('无主 · 势力边界','Unclaimed · Border'),{height:18,size:11,color:C.muted})],{name:'campaign-domain-legend',card:true,color:C.ink,alpha:.95,width:'50%',height:49,anchor:'top-left',y:height+3,gap:1,padding:3,visible:state.territory});
  bind['campaign-topbar']={pointerOnly:true,tapTargetOnly:true,tap:(_s,a)=>a?.stopPropagation?.()};

  function build(portrait,tablet){
    const topHeight=campaignHeaderHeight(portrait);
    const variantRealm=portrait?{...realm,width:'fill'}:tablet?realm:{...realm,width:90};
    const variantDate=portrait?{...date,width:'fill'}:tablet?date:{...date,width:91};
    // The wider variants show the research directly, as the original desktop
    // bar did. Compact variants retain the named technology button and status.
    const researchNow=tablet&&!portrait?research:{...research,width:0,visible:false};
    const toolRows=portrait?[row(menus.slice(0,4)),row(menus.slice(4))]:[row(menus)];
    const children=portrait?[row([variantRealm,variantDate,pause,speed,researchNow]),resources,...toolRows]:[row([variantRealm,variantDate,resources,researchNow,pause,speed]),...toolRows];
    const bar=col(children,{name:'campaign-topbar',width:'100%',height:topHeight,anchor:'top',gap:3,padding:3,color:C.ink,alpha:.96,border:{color:C.edge,width:1}});
    return {type:'panel',name:'campaign-root',layout:'free',width:'100%',height:'100%',children:[bar,legend(topHeight)]};
  }
  return {description:{label:word('战役指挥栏','Campaign controls'),root:build(false,false),portrait:build(true,false),tablet:build(false,true),tabletPortrait:build(true,true),skin},bind};
}

export function createNativeTopbar(app,host,{onGeometry=()=>{}}={}){
  const {game}=host;let state=null,view=null,visible=false,closed=false,lastKey='',lastLanguage='',geometry=null,selecting=false;
  function updateGeometry(){
    const r=view?.visibleRect('campaign-topbar');if(!visible||!r){geometry=null;host.reserveTop?.(0);onGeometry({heightCss:0,rect:null,bottomDesign:host.metrics().screen.y});return;}
    const origin=game.fromStage(r.x,r.y),metrics=host.metrics(),bottomDesign=origin.y+r.height;
    geometry={rect:{...r},heightCss:Math.max(0,bottomDesign-metrics.screen.y)*metrics.scale,bottomDesign,topDesign:origin.y};
    host.reserveTop?.(Math.max(0,bottomDesign-metrics.screen.y));onGeometry(geometry);
  }
  async function selectSpeed(){
    if(selecting||!visible||app.dialogOpen)return;selecting=true;
    try{const selected=await game.select(CAMPAIGN_SPEEDS.map((rate,value)=>({value,text:String(rate)+word(' 天/秒',' days/s')})),{title:word('推进速度','Campaign speed'),value:app.speed,cancel:word('取消','Cancel')});if(selected!==undefined&&visible&&app.screen==='play')app.setSpeed(selected);}
    finally{selecting=false;}
  }
  const layout=()=>{if(!closed){updateGeometry();game.invalidate();}};
  const off=host.addLayout(layout);
  function setVisible(on){if(closed)return;on=Boolean(on);if(on===visible)return;visible=on;if(!on)view?.hide();else view?.show();layout();}
  function refresh(force=false){
    if(closed)return;const next=app.screen==='play'?readCampaignHeader(app):null;if(!next){setVisible(false);return;}
    const key=JSON.stringify(next),language=next.locale;
    if(!view||lastLanguage!==language){view?.close();state=next;const authored=buildCampaignHeader(app,state,{selectSpeed});view=game.show(authored.description,{bind:authored.bind,paragraphCache:host.paragraphCache,gamepad:true,built:()=>queueMicrotask(layout)});lastLanguage=language;visible=true;updateGeometry();}
    else{Object.assign(state,next);setVisible(true);if(force||key!==lastKey)view.refresh();}
    lastKey=key;
  }
  function close(){if(closed)return;closed=true;off?.();view?.close();view=null;visible=false;host.reserveTop?.(0);onGeometry({heightCss:0,rect:null,bottomDesign:host.metrics().screen.y});}
  return {refresh,setVisible,close,get geometry(){return geometry},snapshot:()=>({visible,state:state?structuredClone(state):null,geometry:geometry?structuredClone(geometry):null,focus:view?.focused})};
}
