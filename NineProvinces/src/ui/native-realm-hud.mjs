// Native, retained city/army side sheet, journal and transient game feedback.
// The simulation provides every quote, availability and receipt; no rules live here.
import { UNITS, FORMATIONS } from '../data/battle.mjs';
import { ADJACENT, NODES, PROVINCES } from '../data/map.mjs';
import { serving, stat as statOf } from '../sim/core.mjs';
import { hostile, route, troopCap } from '../sim/military.mjs';
import { persuadeChance } from '../sim/people.mjs';
import { caps, governorDuties, governorRecruitment, income, workQuote } from '../sim/world.mjs';
import { getLanguage, nm, num, t } from '../i18n.mjs';
import { factionName, generalName, placeName } from '../view/names.mjs';
import { portrait } from '../view/portrait.mjs';
import { dayWords, logLine, pair, treatyAt } from './text.mjs';

const C = { ink:0x1a282c, frame:0xa58c55, panel:0x304344, paper:0xf4e7c9, gold:0xe2bd83, soft:0xb9c9c4, red:0x9c4a40, green:0x69ca9c, gray:0x546061 };
const skin = { panel:C.ink,panelAlpha:.98,text:C.paper,button:C.panel,buttonText:C.paper,disabled:C.gray,accent:C.gold,track:0x30433d,radius:4,size:14,dim:.5 };
const word = (zh,en)=>pair([zh,en]);
const tabs = [['overview',()=>word('概况','Overview')],['works',()=>t('works')],['orders',()=>t('orders')],['officers',()=>word('武将','Officers')]];
const txt=(value,props={})=>({type:'text',text:String(value??''),width:'fill',height:25,size:15,color:C.paper,...props});
const title=value=>txt(value,{size:18,bold:true,color:C.gold,height:29});
const note=(value,lines=3,color=C.soft)=>txt(value,{height:lines*19,size:14,color,paragraph:{fontFamilies:['sans-serif'],locale:getLanguage()==='en'?'en':'zh-CN',lineHeight:19,maxLines:lines,density:2}});
const column=(children,props={})=>({type:'panel',layout:'column',width:'100%',height:'fill',gap:5,children:children.filter(Boolean),...props});
const row=(children,props={})=>({type:'panel',layout:'row',width:'100%',height:48,gap:6,children:children.filter(Boolean),...props});
const chunk=(items,n)=>Array.from({length:Math.ceil(items.length/n)},(_,i)=>items.slice(i*n,i*n+n));
const meter=(value,color=C.green)=>({type:'bar',value:Math.max(0,Math.min(1,value)),height:8,width:'fill',color});
const stat=(label,value,progress=null)=>column([txt(label,{height:18,size:12,color:C.soft,align:'center'}),txt(value,{height:25,size:18,bold:true,align:'center'}),progress],{height:59,gap:1,width:'fill'});
const art=(name,id,size=44)=>({type:'image',name,src:portrait(id,size),label:generalName(id),width:size,height:size,semantic:false});

function controls(){
  const bind={};
  const action=(name,label,tap,{why='',main=false,selected=false,role,width='fill',height=48,...extra}={})=>{
    bind[name]={label:()=>label,disabled:()=>Boolean(why),tap:()=>{if(!why)tap()},...(role==='tab'?{selected:()=>selected}:{})};
    return {type:'button',name,text:label,height,width,size:14,color:main?C.red:selected?0x816339:C.panel,border:{color:C.frame,width:1},...(role?{role,selected}:{}),...extra};
  };
  const chip=(name,id,tap,info='')=>{
    bind[name]={label:()=>generalName(id)+(info?' · '+info:''),tap};
    return {type:'panel',name,role:'button',label:generalName(id),layout:'row',children:[art(name+'-art',id),txt(generalName(id),{height:44,size:14,bold:true})],width:'fill',height:48,card:true,padding:2,gap:4,color:C.panel};
  };
  const wrap=(buttons,n=2)=>chunk(buttons.filter(Boolean),n).map(a=>row(a));
  return {bind,action,chip,wrap};
}

function armyStatus(s,a) {
  if(a.besieging)return t('besieging',{place:placeName(a.besieging),days:(a.siegeDays??0)+1});
  if(a.link)return t('onRoad',{from:placeName(a.link.from),to:placeName(a.link.to)});
  if(a.path.length)return t('marching',{place:placeName(a.target),days:route(s,a,a.at,a.target)?.days??'?'});
  return t('resting',{place:placeName(a.at)});
}
function nearbyArmies(app,c,id){
  const s=app.state,list=Object.values(s.armies).filter(a=>a.at===id||a.besieging===id);
  if(!list.length)return [];
  return [title(t('armiesHere')),...c.wrap(list.map(a=>c.action('army-'+a.id,(a.commander?generalName(a.commander):'—')+' · '+num(a.troops),()=>app.select({army:a.id}))))];
}
function dutyRows(app,c,id,node){
  const s=app.state,recruit=governorRecruitment(s,id),{governor,build,search}=governorDuties(s,id);
  const view=(key,label,v,status,details,last,toggle)=>column([
    txt(label,{size:16,bold:true,color:C.gold}),note(status,2),
    details?note(details,2):null,last?note(last,2):null,
    c.action('governor-'+key,label+' · '+t(v.enabled?'on':'off'),()=>toggle(!v.enabled),{why:!v.enabled&&v.why?t('governorDuty_'+v.why):'',selected:v.enabled})
  ],{height:29+38+(details?38:0)+(last?38:0)+48+20,padding:3,color:C.panel,border:{color:C.frame,width:1}});
  const buildDetail=node.work?t('building',{kind:t(node.work.kind),days:node.work.left}):build.kind?t('governorBuildQuote',{kind:t(build.kind),days:build.days,coin:num(build.coin)}):null;
  const searchDetail=search.status==='searching'?t('governorSearchRemaining',{days:search.daysLeft}):search.enabled&&search.status==='waiting'?t('governorDutyNext',{days:search.daysLeft}):governor&&search.why!=='noGovernor'&&Number.isFinite(search.chance)&&Number.isFinite(search.days)?t('governorSearchQuote',{days:search.days,chance:num(Math.round(search.chance*100))}):null;
  const found=search.last?.found.map(generalName).join(getLanguage()==='en'?', ':'、');
  return [title(t('governorDutyTitle')+' · '+(governor?generalName(governor):t('noGovernor'))),
    view('recruit',t('governorDutyRecruit'),recruit,t('governorRecruitStatus',{status:t('governorRecruit_'+recruit.status),troops:num(node.troops),target:num(recruit.target)}),
      recruit.enabled&&recruit.status==='waiting'?t('governorRecruitNext',{days:recruit.daysLeft}):null,recruit.lastGot>0?t('governorRecruitLast',{n:num(recruit.lastGot)}):null,v=>app.act('governorRecruit',id,v)),
    view('build',t('governorDutyBuild'),build,t('governorDuty_'+build.status),build.enabled&&build.status==='waiting'?t('governorDutyNext',{days:build.daysLeft}):buildDetail,
      build.last?t('governorBuildLast',{date:dayWords(build.last.day),kind:t(build.last.kind),days:build.last.days}):null,v=>app.act('governorDuty',id,'build',v)),
    view('search',t('governorDutySearch'),search,t('governorDuty_'+search.status),searchDetail,
      search.last?t(found?'governorSearchFound':'governorSearchNoFind',{date:dayWords(search.last.day),found}):null,v=>app.act('governorDuty',id,'search',v)),
    title(t('governorDutyRules')),note(t('governorRecruitAbout',{grain:num(recruit.reserveGrain)}),3),note(t('governorBuildAbout',{coin:num(build.reserveCoin)}),3),note(t('governorSearchAbout'),3)];
}
function cityRows(app,c,id,section){
  const s=app.state,n=NODES[id],node=s.nodes[id],owner=node.owner?s.factions[node.owner]:null,mine=node.owner===s.player;
  const limit=caps(id),kind=t({city:'kindCity',pass:'kindPass',port:'kindPort'}[n.kind]);
  const subtitle=[kind,pair(PROVINCES[n.prov]),n.kind==='city'?t('sizeN',{n:n.size}):null,owner?factionName(s,node.owner):t('noOwner')].filter(Boolean).join(' · ');
  const siege=Object.values(s.armies).filter(a=>a.besieging===id);
  const overview=[
    siege.length?note(t('besieged',{n:num(siege.reduce((x,a)=>x+a.troops,0))}),2,C.red):null,
    row([stat(t('people'),num(node.people)),stat(t('garrison'),num(node.troops)),stat(t('training'),Math.round(node.training))],{height:60}),
    row([stat(t('support'),Math.round(node.support),meter(node.support/100,node.support<30?C.red:C.green)),stat(t('order'),Math.round(node.order),meter(node.order/100,node.order<30?C.red:C.green)),stat(t('wall'),node.wall+'/'+limit.wall,meter(node.wall/Math.max(1,limit.wall),C.soft))],{height:60})];
  if(!mine){
    const here=Object.keys(s.generals).filter(g=>s.generals[g].status==='serving'&&s.generals[g].at===id),pact=treatyAt(s,s.player,id);
    const adjacent=ADJACENT[id].map(l=>l.to).filter(x=>s.nodes[x].owner===s.player);
    return {heading:placeName(id),subtitle,owner,mine,body:[...overview,owner?note(t('officersN',{n:here.length})+(node.governor?' · '+t('governor')+' '+generalName(node.governor):''),2):null,
      pact?note(t('protectedCity',{treaty:pact}),3):null,adjacent.length&&hostile(s,s.player,node.owner)?title(t('attackFrom')):null,
      ...(hostile(s,s.player,node.owner)?adjacent.flatMap(from=>{const ready=serving(s,s.player,from).some(g=>!(s.generals[g].busyUntil>s.day)),why=!ready?t('why_generals'):s.nodes[from].troops<500?t('why_troops'):'';return [c.action('from-'+from,placeName(from)+' · '+num(s.nodes[from].troops),()=>app.open('muster',{from,target:id}),{why}),why?note(why,2):null]}):[]),...nearbyArmies(app,c,id)]};
  }
  const inc=income(s,id),f=s.factions[s.player],here=serving(s,s.player,id),idle=here.filter(g=>!(s.generals[g].busyUntil>s.day));
  if(section==='overview')return {heading:placeName(id),subtitle,owner,mine,body:[...overview,node.governor?row([txt(t('governor'),{width:62,height:44,color:C.soft}),c.chip('governor',node.governor,()=>app.open('general',{id:node.governor}))]):note(t('noGovernor'),1),note(t('cityYield')+' · '+t('coin')+' '+num(inc.coin)+' · '+t('grain')+' '+num(inc.grain),2)]};
  if(section==='works'){
    const body=[title(t('works'))];
    for(const k of ['farm','market','wall','office']){
      const quote=workQuote(s,id,k),building=node.work?.kind===k;
      const why=quote.full?t('why_full'):node.work?t('workBusyDetail',{kind:t(node.work.kind),days:node.work.left}):f.coin<quote.coin?t('why_coin'):'';
      const result=k==='farm'||k==='market'?t('workGain',{resource:t(k==='farm'?'grain':'coin'),n:num(quote.gain)}):t(k+'About');
      body.push(row([txt(t(k),{size:16,bold:true,height:28}),txt(node[k]+'/'+limit[k],{align:'right',width:90,height:28})],{height:30}),meter(building?1-node.work.left/node.work.of:node[k]/Math.max(1,limit[k]),building?C.gold:C.green),
        building?note(t('daysLeft',{n:node.work.left})+(node.work.governor?' · '+t('governorBuildSource',{name:generalName(node.work.governor)}):''),2):c.action('work-'+k,quote.full?t('full'):t('investCost',{coin:num(quote.coin),days:quote.days}),()=>app.act('work',id,k),{why}),
        !quote.full?note(t('workPreview',{before:node[k],after:quote.nextLevel})+' · '+result,3):null,why&&!building?note(why,2):null);
    }
    return {heading:placeName(id),subtitle,owner,mine,body};
  }
  if(section==='orders'){
    const room=Math.max(0,Math.floor(node.people*.05)-(node.levied??0));
    const commands=[
      n.kind==='city'?c.action('recruit',t('recruitN',{n:num(Math.min(room,3000))}),()=>app.act('recruit',id,3000),{why:room<100?t('why_people'):f.coin<12?t('why_coin'):''}):null,
      c.action('muster',t('muster'),()=>app.open('muster',{from:id}),{main:true,why:idle.length?(node.troops<500?t('why_troops'):''):t('why_generals')}),
      c.action('search',t('search'),()=>app.open('pickOfficer',{at:id,purpose:'search'}),{why:idle.length?'':t('why_generals')}),
      c.action('transfer',t('transfer'),()=>app.open('transfer',{from:id}),{why:node.troops<100?t('why_troops'):''}),
      c.action('moveOfficer',t('moveOfficer'),()=>app.open('pickOfficer',{at:id,purpose:'move'}),{why:here.length?'':t('why_generals')})];
    return {heading:placeName(id),subtitle,owner,mine,body:[title(t('orders')),...c.wrap(commands),
      !here.length?note(t('cityNoOfficers'),2):!idle.length?note(t('cityOfficersBusy'),2):node.troops<500?note(t('cityMusterMinimum'),2):null,
      !here.length&&Object.values(s.nodes).some(other=>other!==node&&other.owner===s.player)?c.action('bringOfficer',t('bringOfficer'),()=>app.open('pickOfficer',{at:id,purpose:'bring'})):null,
      n.kind==='city'?dutyRows(app,c,id,node):[],n.kind==='city'&&room<100?note(t('levyNote'),2):null].flat()};
  }
  const free=Object.keys(s.generals).filter(g=>s.generals[g].status==='free'&&s.generals[g].at===id&&s.generals[g].known),best=idle.slice().sort((a,b)=>statOf(s,b,'cha')-statOf(s,a,'cha'))[0];
  return {heading:placeName(id),subtitle,owner,mine,body:[title(t('officersHere')+' ('+here.length+')'),...c.wrap(here.map(g=>c.chip('officer-'+g,g,()=>app.open('general',{id:g}),s.generals[g].busyUntil>s.day?'…':''))),here.length?null:note(t('none'),1),free.length?title(t('freeHere')):null,...c.wrap(free.map(g=>c.chip('free-'+g,g,()=>app.open('general',{id:g}),best?t('chance',{p:Math.round(persuadeChance(s,s.player,best,g)*100)}):''))),...nearbyArmies(app,c,id)]};
}
function armyRows(app,c,id){
  const s=app.state,a=s.armies[id];if(!a)return {heading:t('army'),subtitle:'',body:[note(t('why_gone'),2)]};
  const mine=a.faction===s.player,commander=a.commander,homeOk=!a.link&&s.nodes[a.at]?.owner===s.player;
  const body=[note(armyStatus(s,a),2),row([stat(t('troops'),num(a.troops)),stat(word('兵种','Unit type'),nm(UNITS[a.unit])),stat(t('formation'),nm(FORMATIONS[a.formation]))],{height:60}),
    row([stat(t('morale'),Math.round(a.morale),meter(a.morale/100,a.morale<30?C.red:C.green)),mine?stat(t('supply'),t('supplyDays',{n:Math.floor(a.grain/Math.max(.1,a.troops/400))})):null,stat(t('training'),Math.round(a.training??50))],{height:60}),
    commander?row([txt(t('commander'),{width:84,height:44}),c.chip('army-commander',commander,()=>app.open('general',{id:commander}),t('troopCap',{n:num(troopCap(s,commander))}))]):null,
    a.deputies.length?title(t('deputies')):null,...c.wrap(a.deputies.map(d=>c.chip('deputy-'+d,d,()=>app.open('general',{id:d}))))];
  if(mine)body.push(...c.wrap([
    c.action('army-march',app.mode?.kind==='march'?t('pickTarget'):t('orderMarch'),()=>app.setMode(app.mode?.kind==='march'?null:{kind:'march',army:id}),{main:true}),
    c.action('army-return',t('orderBack'),()=>app.act('return',id),{why:a.at===a.home&&!a.link?t('why_here'):''}),
    c.action('army-disband',t('disband'),()=>app.confirmAction(word('确认解散这个军团？','Disband this army?'),()=>app.act('disband',id)),{why:homeOk?'':t('why_cannot')})]),
    app.mode?.kind==='march'?note(t('pickTargetHelp'),3):null);
  return {heading:t('armyOf',{name:commander?generalName(commander):'—'}),subtitle:factionName(s,a.faction),owner:s.factions[a.faction],body};
}
export function buildRealmSheet(app,section,layout,onTab) {
  const c=controls(),sel=app.sel,spec=sel.node?cityRows(app,c,sel.node,section):armyRows(app,c,sel.army);
  const mark=spec.owner? (getLanguage()==='zh'?spec.owner.flag:nm(spec.owner.name)?.[0]?.toUpperCase()):'—';
  const head=row([{type:'panel',width:38,height:38,color:spec.owner?.colour??0x6a6a60,children:[txt(mark||'—',{width:38,height:38,bold:true,size:20,align:'center'})]},column([txt(spec.heading,{size:20,bold:true,color:C.gold,height:28}),txt(spec.subtitle,{size:12,height:18,color:C.soft})],{height:48,width:'fill',gap:0}),c.action('realm-close',t('close'),()=>app.select(null),{width:48})],{height:50});
  const tabRow=spec.mine&&sel.node?row(tabs.map(([id,label])=>c.action('realm-tab-'+id,label(),()=>onTab(id),{role:'tab',selected:section===id,size:13})),{name:'realm-tabs',role:'tablist',label:word('城务','City management')}):null;
  c.bind['realm-shell']={pointerOnly:true,tapTargetOnly:true,tap:(_s,a)=>a?.stopPropagation?.()};
  const body=spec.body.flat().filter(Boolean).map((p,i)=>p.name?p:{...p,name:'side-row-'+i});
  const root=column([head,tabRow,column(body,{name:'realm-body',scroll:'vertical',height:'fill',padding:2,gap:5})],{name:'realm-shell',anchor:layout.portrait?'bottom':'top-left',x:layout.portrait?0:6,y:layout.portrait?4:layout.top+6,width:layout.width,height:layout.height,padding:6,gap:4,card:true,color:C.ink,border:{color:C.frame,width:2}});
  return {description:{label:spec.heading,skin,root},bind:c.bind};
}
function sheetLayout(host){
  const m=host.metrics(),unit=m.scale*m.uiScale,sw=m.safe.width/m.uiScale,sh=m.safe.height/m.uiScale,top=(host.topInset??0)/unit;
  const portrait=m.portrait;return {portrait,top,width:portrait?sw-8:Math.min(355,sw*.43),height:portrait?Math.max(210,Math.min(sh*.39,430)):Math.max(160,Math.min(530,sh-top-12))};
}

export function createNativeRealmHud(app,host) {
  const {game}=host;let toasts=[],side=null,journal=null,tip=null,section='overview',lastSel='',sideKey='',logKey='',tipKey='',gutter=sheetLayout(host);
  function closeSide(){side?.close();side=null;lastSel='';section='overview';sideKey='';}
  function redrawSide(force=false) {
    if(!app.state||app.screen!=='play'||app.lab||!app.sel){closeSide();return;} if(app.dialogOpen){side?.hide();return;} side?.show();
    gutter=sheetLayout(host); const key=app.sel.node??app.sel.army;if(key!==lastSel){section='overview';lastSel=key;}
    const sel=app.sel,st=app.state,stamp=JSON.stringify([key,section,getLanguage(),st.day,sel.node?st.nodes[key]:st.armies[key],app.mode?.kind,st.factions[st.player].coin,app.dialogOpen,gutter]);
    if(!force&&sideKey===stamp)return;
    const focus=side?.focused,offset=side?.scroll('realm-body')?.offset??0;
    const built=buildRealmSheet(app,section,gutter,selectTab);
    side?.close();side=game.show(built.description,{bind:built.bind,paragraphCache:host.paragraphCache,gamepad:true});
    if(offset)try{side.scroll('realm-body').scrollTo(offset)}catch{}
    if(focus)side.focus(focus);sideKey=stamp;
  }
  function selectTab(next){
    if(section===next)return;
    section=next;queueMicrotask(()=>{redrawSide(true);side?.focus('realm-tab-'+next);});
  }
  function stepTab(direction){
    const focused=side?.focused;
    if(!focused?.startsWith('realm-tab-'))return false;
    const i=tabs.findIndex(([id])=>id===focused.slice('realm-tab-'.length));
    if(i<0)return false;
    selectTab(tabs[(i+direction+tabs.length)%tabs.length][0]);return true;
  }
  function redrawJournal(){
    const s=app.state;if(!s||app.screen!=='play'||app.lab||app.dialogOpen||gutter.portrait&&app.sel||host.metrics().safe.height*host.metrics().scale<440){journal?.close();journal=null;logKey='';return;}
    const entries=s.log.slice(0,6),key=JSON.stringify([entries,getLanguage(),gutter.portrait]);if(key===logKey)return;
    const c=controls(),lines=entries.map(e=>note(dayWords(e.day)+' · '+logLine(s,e),2));
    journal?.close();journal=game.show({label:t('menuStory'),skin,root:column([c.action('realm-journal',t('menuStory'),()=>app.open('chronicle')),column(lines,{name:'journal-body',scroll:'vertical'})],{name:'journal-shell',anchor:'bottom-right',width:gutter.portrait?'92%':Math.min(315,host.metrics().safe.width/host.metrics().uiScale*.31),height:Math.min(200,48+lines.length*41),card:true,color:C.ink,border:{color:C.frame,width:1},padding:5,gap:2})},{bind:c.bind,paragraphCache:host.paragraphCache});logKey=key;
  }
  function showTip(words,x,y){
    if(!words||app.dialogOpen||host.metrics().portrait){tip?.close();tip=null;tipKey='';return;}
    const list=Array.isArray(words)?words:[words],key=list.join('|');if(key===tipKey)return;tipKey=key;
    const m=host.metrics(),pos=host.clientToDesign(x,y),unit=m.uiScale, w=Math.min(270,m.safe.width/unit-14),h=Math.min(140,26*list.length+10);
    // Use the real native safe area, never viewport globals.
    tip?.close();tip=null;
    const ww=w*unit,hh=h*unit,screenTop=Math.max(m.safe.y,m.screen.y+(host.topInset??0)/m.scale);
    const obstacles=host.mapOcclusionRects?.()??[];
    const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
    const candidates=[[pos.x+16,pos.y+12],[pos.x-ww-16,pos.y+12],[pos.x+16,pos.y-hh-12],[pos.x-ww-16,pos.y-hh-12]].map(([x,y])=>({x:clamp(x,m.safe.x,m.safe.x+m.safe.width-ww),y:clamp(y,screenTop,m.safe.y+m.safe.height-hh),width:ww,height:hh}));
    const box=candidates.find(r=>r.y+hh<=m.safe.y+m.safe.height&&!obstacles.some(o=>r.x<o.x+o.width&&o.x<r.x+r.width&&r.y<o.y+o.height&&o.y<r.y+r.height));
    if(!box)return;
    tip=game.show({label:list[0],skin,root:column(list.map((line,i)=>txt(line,{size:13,height:24,color:i===0?C.gold:C.paper})),{name:'tooltip-shell',anchor:'top-left',x:(box.x-m.safe.x)/unit,y:(box.y-m.safe.y)/unit,width:w,height:h,color:C.ink,padding:4})});
  }
  function toast(text,kind=''){const m=host.metrics();toasts=toasts.filter(t=>t.active);const notice=game.toast(text,{seconds:3,color:kind==='bad'?0xffc3b7:C.paper,background:C.ink,borderColor:C.frame,placement:{anchor:'top-center',offsetY:Math.max(8,(host.topInset??0)/m.scale/m.uiScale+8),maxWidth:320,fontSize:16,foreground:true}});toasts.push(notice);return notice;}
  function clearTransient(){for(const notice of toasts)notice.close();toasts=[];tip?.close();tip=null;tipKey='';}
  let pending=false,forced=false; function refresh(force=false){forced ||= force;if(pending)return;pending=true;queueMicrotask(()=>{pending=false;const f=forced;forced=false;redrawSide(f);redrawJournal();});}
  const off=host.addLayout(()=>{gutter=sheetLayout(host);sideKey='';logKey='';refresh(true)});
  const occlusionRects=()=>[[side,'realm-shell'],[journal,'journal-shell'],[tip,'tooltip-shell']].flatMap(([view,name])=>{
    const rect=view?.visibleRect(name);if(!rect)return [];
    const p=game.fromStage(rect.x,rect.y);return [{x:p.x,y:p.y,width:rect.width,height:rect.height}];
  });
  return {refresh,showTip,toast,clearTransient,armyStatus,occlusionRects,stepTab,get view(){return side;},get journal(){return journal;},close(){off();closeSide();journal?.close();tip?.close();}};
}
export function nativeTipFor(app,info){
  const s=app.state;if(!s||!info)return null;
  if(info.node){const id=info.node,node=s.nodes[id],lines=[placeName(id),node.owner?factionName(s,node.owner):t('noOwner'),t('garrison')+' '+num(node.troops)];
    if(app.mode?.kind==='march'){const a=s.armies[app.mode.army],r=a&&route(s,a,a.link?a.link.to:a.at,id),pact=treatyAt(s,s.player,id);lines.push(r?t('daysAway',{n:r.days}):t('noWay'));if(pact)lines.push(t('marchTreatyNotice',{treaty:pact}));}
    return lines;}
  const a=s.armies[info.army];return a?[a.commander?t('armyOf',{name:generalName(a.commander)}):t('army'),factionName(s,a.faction),nm(UNITS[a.unit])+' '+num(a.troops)]:null;
}