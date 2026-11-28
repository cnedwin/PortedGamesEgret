// Title, campaign preparation and independent registered-officer roster.
// Rendered by Play's native data views; the existing world remains behind them.
import { FACTIONS } from '../data/factions.mjs';
import { TRAITS } from '../data/traits.mjs';
import { BRANCHES } from '../sim/story.mjs';
import { SCENARIOS } from '../sim/scenarios.mjs';
import { OFFICER_LIMIT, OFFICER_STATS, OFFICER_TRAITS } from '../custom-officers.mjs';
import { BANNER_COLOURS } from '../sim/custom-faction.mjs';
import { getLanguage, nm, num, t } from '../i18n.mjs';
import { factionName, generalName, placeName } from '../view/names.mjs';
import { portrait } from '../view/portrait.mjs';
import { pair } from './text.mjs';
import { createCampaignDraft, createOfficerDraft } from './native-title-model.mjs';

const C={ink:0x18282d,slate:0x25393c,paper:0xf1e4c3,gold:0xcba567,muted:0xc4c6b6,selected:0x73532e,red:0x985043,edge:0x9b805a};
const SKIN={panel:C.ink,panelAlpha:.95,text:C.paper,button:C.slate,buttonText:C.paper,disabled:0x566464,accent:C.gold,track:0x3b4847,radius:5,size:15,dim:.6};
const art=(i,kind='panel')=>new URL(`../../assets/portraits/${kind}/type-${i}.webp`,import.meta.url).href;
const p=(zh,en)=>pair([zh,en]);
// Native single-line label fontFamily is a literal family, not a CSS list.
const titleFont=()=>getLanguage()==='en'?'Georgia':'KaiTi';
const bodyFont=()=>getLanguage()==='en'?'Arial':'Microsoft YaHei';
const para=(maxLines=4)=>({fontFamilies:['Microsoft YaHei','Noto Sans CJK SC','Arial','sans-serif'],locale:getLanguage()==='en'?'en':'zh-CN',lineHeight:20,maxLines,density:2});
const text=(value,props={})=>({type:'text',text:String(value??''),width:'fill',height:24,size:15,color:C.paper,...props});
const note=(value,lines=3,props={})=>text(value,{height:lines*20,size:14,color:C.muted,paragraph:para(lines),...props});
const heading=(value,props={})=>text(value,{size:19,bold:true,color:C.gold,fontFamily:bodyFont(),height:28,...props});
const image=(name,src,label,props={})=>({type:'image',name,src,label,width:88,height:104,...props});
const row=(children,props={})=>({type:'panel',layout:'row',width:'100%',height:52,gap:5,children:children.filter(Boolean),...props});
const col=(children,props={})=>({type:'panel',layout:'column',width:'100%',height:'fill',gap:6,children:children.filter(Boolean),...props});
const root=children=>({type:'panel',layout:'free',name:'screen-root',width:'100%',height:'100%',children});
const chunks=(a,n)=>Array.from({length:Math.ceil(a.length/n)},(_,i)=>a.slice(i*n,(i+1)*n));
function parts(){
  const bind={};
  const b=(name,label,tap,opts={})=>{
    const {active,disabled=false,detail,lines=2,semanticLabel=label,...rest}=opts;
    bind[name]={label:()=>String(semanticLabel),disabled:()=>Boolean(typeof disabled==='function'?disabled():disabled),tap};
    return {type:'button',name,text:String(label),width:'fill',height:48,size:15,color:active?C.selected:C.slate,textColor:C.paper,border:{color:active?C.gold:C.edge,width:1},...(detail?{description:detail,paragraph:para(lines),height:52+lines*20}:{}),...rest};
  };
  const toggle=(name,label,checked,tap)=>{
    bind[name]={checked:()=>Boolean(checked),tap};return {type:'toggle',name,text:label,checked:Boolean(checked),width:'fill',height:48,size:15};
  };
  const clickPanel=(name,label,children,tap,props={})=>{
    bind[name]={tap,label:()=>label,tapTargetOnly:false};return {type:'panel',name,role:'button',label,layout:'column',children,width:'fill',height:90,color:C.slate,padding:3,gap:2,border:{color:C.edge,width:1},...props};
  };
  // Absorb map input over the painted panel, without adding a keyboard stop.
  const absorb=name=>{bind[name]={tap:(_s,a)=>a?.stopPropagation?.(),tapTargetOnly:true,pointerOnly:true};};
  return {bind,b,toggle,clickPanel,absorb};
}
function variants(content,{label,kind='sheet',bind}){
  const widths=kind==='title'?['46%','96%','38%','90%']:kind==='roster'?['72%','98%',650,'96%']:['62%','98%',590,'96%'];
  const mode=(width,portrait)=>root([col(content,{name:'painted-panel',card:true,color:C.ink,alpha:.94,border:{color:C.gold,width:2},width,height:'96%',anchor:kind==='title'&&!portrait?'left':'center',x:kind==='title'&&!portrait?10:0,padding:10,gap:6})]);
  return {description:{label,root:mode(widths[0],false),portrait:mode(widths[1],true),tablet:mode(widths[2],false),tabletPortrait:mode(widths[3],true),skin:SKIN},bind};
}
function firstName(part){return part?.name??part?.children?.map(firstName).find(Boolean);}
const scroll=children=>col(children.filter(Boolean).map((part,index)=>part.name?part:{...part,name:firstName(part)?'body-row-'+firstName(part):'body-static-'+index}),{name:'page-body',height:'fill',scroll:'vertical',padding:2,gap:7});

export function buildTitleView(app,handlers){
  const parts0=parts(),{b,bind,absorb}=parts0;absorb('painted-panel');
  const hasAuto=Boolean(app.slotSummary('auto'));
  const en=getLanguage()==='en',primary=hasAuto?b('title-continue',t('continue'),()=>app.loadSlot('auto'),{color:0x883d32,active:true,size:17}):b('title-new',t('newGame'),()=>handlers.goSetup(),{color:0x883d32,active:true,size:17});
  const compact=[hasAuto?b('title-new',t('newGame'),()=>handlers.goSetup()):null,b('title-load',t('load'),()=>app.open('saves')),b('title-roster',p('登录新武将','Register officers'),()=>handlers.goRoster()),
    typeof app.openSandbox==='function'?b('title-sandbox',p('演武沙盘','Battle sandbox'),()=>app.openSandbox()):null,b('title-settings',t('settings'),()=>app.open('settings')),b('title-language',t('language'),()=>app.setLanguage(app.language()==='zh'?'en':'zh'))].filter(Boolean);
  let nanpi=null;
  if(typeof app.openNanpi==='function')nanpi=parts0.clickPanel('title-nanpi',p('夕照南皮','Nanpi at sunset'),[
    text(p('夕照南皮','Nanpi at sunset'),{name:'title-nanpi-caption',width:'fill',height:44,size:18,bold:true,fontFamily:titleFont(),semantic:false}),
    text(p('3D 攻城演武','3D siege trial'),{name:'title-nanpi-detail',width:104,height:44,size:12,color:C.gold,align:'right',semantic:false})],()=>app.openNanpi(),{height:48,layout:'row',align:'center',padding:5,color:0x51362d,border:{color:0xa0754c,width:1}});
  // Authored native text lines avoid a blank first-title frame while a longer
  // paragraph raster is still being scheduled. The title's complete copy is
  // retained, at mobile-friendly line lengths.
  const subtitle=en?['In the first year of Zhongping,','the Yellow Turbans rose','in eight provinces.','Every lord in the realm','had a purpose of his own.']:['中平元年，黄巾起于八州。','天下诸侯，各怀其志。'];
  const demo=en?['A game demo developed independently','on the new Egret engine']:['基于新白鹭引擎独立开发的游戏 Demo'];
  const noticeLines=app.notice?(en?String(app.notice).match(/.{1,30}(?:\s|$)|\S+/g)??[String(app.notice)]:Array.from({length:Math.ceil([...app.notice].length/16)},(_,i)=>[...app.notice].slice(i*16,i*16+16).join(''))):[];
  const notice=noticeLines.length?col(noticeLines.map((s,i)=>text(s.trim(),{height:18,size:12,color:0xffd98a,fontFamily:bodyFont(),semantic:false})),{name:'title-notice',label:String(app.notice),height:noticeLines.length*18+4,color:0x432d24,padding:2,gap:0}):null;
  const line={type:'panel',color:0xa78957,alpha:.6,width:'100%',height:1,semantic:false};
  const make=(form,width,height,x=0)=>{
    const upright=form==='portrait'||form==='tabletPortrait',wide=form==='tablet',big=wide||form==='tabletPortrait';
    const titleSize=en?(big?29:20):(big?49:35),sealSize=big?46:36;
    const seal=col([text(en?'✦':'烽',{name:'title-seal',width:'100%',height:sealSize-6,size:big?27:22,color:0xffe3a4,fontFamily:titleFont(),bold:true,align:'center'})],{color:0x8d4034,width:sealSize,height:sealSize,padding:3,border:{color:0xd5a76d,width:2}});
    const head=row([seal,heading(t('title'),{name:'title-heading',height:big?64:48,size:titleSize,fontFamily:titleFont(),color:0xf4d698,align:'left'})],{height:big?64:52,align:'center',gap:10});
    const body=[...subtitle.map((s,i)=>text(s,{name:'title-subtitle-'+i,height:en?18:23,size:en?13:16,fontFamily:bodyFont(),color:0xf1e5cd})),
      primary,...chunks(compact,2).map(a=>row(a,{height:48,gap:7})),nanpi,...demo.map((s,i)=>text(s,{name:'title-demo-'+i,height:16,size:12,color:0xe0d4ba}))];
    return root([col([line,head,notice,scroll(body),line],{name:'painted-panel',layout:'column',width,height,anchor:upright?'bottom':'left',x,y:upright?24:0,padding:6,gap:8})]);
  };
  return {description:{label:t('title'),root:make('landscape','46%','96%',12),portrait:make('portrait','94%',hasAuto?520:en?510:460),tablet:make('tablet',410,hasAuto?560:510,64),tabletPortrait:make('tabletPortrait','75%',hasAuto?560:510),skin:SKIN},bind};
}

function labelledField(P,name,label,value,edit,{maxLength=48,mode='text',live}={}){
  return col([text(label,{size:14,height:22,color:C.muted}),P.b(name,value===''?'—':String(value),()=>edit(name,{label,value:String(value??''),maxLength,inputMode:mode,live}),{height:48,semanticLabel:label})],{height:73,gap:2});
}
const serviceName=value=>value==='player'?p('仕官所选势力','Serve chosen faction'):p('在野，已发现','Unattached, known');
const officerLabel=(app,d,g)=>nm(g)+' · '+g.age+' · '+(g.source==='roster'?p('名册人物','Registered'):g.formerFaction?factionName(d.demo,g.formerFaction):p('在野','Unattached'));

function foundingRows(P,app,d,handlers){
  const f=d.founding, opts=d.options();
  const field=(name,label,key,limit)=>labelledField(P,name,label,f[key],(name,edit)=>handlers.edit(name,edit,value=>d.setFounding(key,value)),{maxLength:limit});
  const pick=(name,label,current,entries,onChange)=>P.b(name,label+' · '+(current?.text??'—'),()=>handlers.select(label,entries,current?.value,onChange),{height:52,semanticLabel:label});
  const townEntries=opts.towns.map(n=>({value:n.id,text:nm(n)+(n.recommended?p('（推荐起点）',' (recommended)'):'')+' · '+(n.formerOwner?p('架空据点，原属','Alternate site, formerly ')+factionName(d.demo,n.formerOwner):p('无主城','Vacant town'))}));
  const selected=opts.officers.find(g=>g.ref===f.ruler);
  const candidates=index=>[...(index==='ruler'?[]:[{value:'',text:p('不携带','None')}]),...d.officers(index).map(g=>({value:g.ref,text:officerLabel(app,d,g)}))];
  const officerPicker=(name,label,index)=>{
    const value=index==='ruler'?f.ruler:f.companions[index]??'', entries=candidates(index), current=entries.find(g=>g.value===value);
    return pick(name,label,current,entries,ref=>index==='ruler'?d.chooseRuler(ref):d.chooseCompanion(index,ref));
  };
  const search=labelledField(P,'founding-search',p('搜索主公与同行姓名','Find a ruler or companion by name'),f.search,(name,edit)=>handlers.edit(name,{...edit,live:true},value=>d.setFounding('search',value)),{maxLength:48});
  const matches=()=>p('匹配 ','Matches: ')+d.officers('ruler').length+p(' 人；当前选择始终保留，清空搜索可浏览全部。',' officers. Current choices stay available; clear search to browse everyone.');
  P.bind['founding-match-count']={text:matches};
  const banner=chunks(BANNER_COLOURS.map((colour,i)=>P.b('founding-colour-'+i,(f.colour===colour?'✓ ':'')+p('旗色 ','Colour ')+(i+1),()=>{d.setFounding('colour',colour);handlers.refresh();},{color:colour,active:f.colour===colour,height:48,size:13})),3).map(a=>row(a,{height:48}));
  return [
    note(p('从一座空城起家。可用登录人物或历史人物为主公，携最多三位同行；本局采用自由推演，不补播历史演义。','Found a new banner in one town. Lead with a registered or historical officer and up to three companions. This is a free campaign without scripted historical events.'),5),
    field('founding-name',p('势力名称','Faction name'),'zh',12),field('founding-English',p('英文名称（可留空）','English name (optional)'),'en',48),field('founding-flag',p('旗号字','Banner character'),'flag',2),
    heading(p('旗帜颜色','Banner colour')),...banner,
    pick('founding-town',p('起家城','Founding town'),townEntries.find(x=>x.value===f.town),townEntries,value=>d.chooseTown(value)),
    opts.alternateHistory?note(p('本年代没有原生空城。仅最终选中的非首府边城会在架空分支中转为中立：原守军与驻将撤回原首府，其他候选城不变。与原领主停战540日，可按正常外交规则到期或毁约，其他敌人不受限制。','This era has no vacant city. Only your chosen non-capital border town becomes neutral: its former garrison and officers return to their capital. A 540-day withdrawal truce with that power follows normal expiry and treaty-breaking rules; third powers remain unrestricted.'),7,{color:C.gold}):null,
    heading(p('选择主公','Choose the ruler')),note(p('列表按本年代筛选：未成年、已故、现任君主与不在场人物不参与。离开原势力的武将和宝物只转移一次，不会复制。','The list excludes underage, deceased, active rulers and unavailable officers. Departing officers and their equipment transfer once, without duplication.'),5),
    search,note(matches(),3,{name:'founding-match-count'}),
    officerPicker('founding-ruler',p('主公','Ruler'),'ruler'),
    selected?row([image('founding-ruler-art',selected.source==='history'?portrait(selected.id,96):art(selected.portrait),nm(selected),{width:86,height:112}),col([heading(nm(selected)),note(officerLabel(app,d,selected),3),note(OFFICER_STATS.map(k=>t(k)+' '+selected.stats[k]).join(' · '),2)],{height:112,width:'fill'})],{height:120,color:C.slate,padding:4}):null,
    P.b('founding-roster',p('登录／管理新武将','Register / manage officers'),()=>handlers.goRoster()),
    heading(p('携带同行（最多三人）','Companions (up to three)')),
    ...Array.from({length:3},(_,i)=>officerPicker('founding-companion-'+i,p('同行 ','Companion ')+(i+1),i)),
    note(p('起家提供6000以上守军、6500钱和初始粮秣。离任人员会退出原任职，与原势力略有嫌隙；开局宽限规则保持一致。','Start with at least 6,000 troops, 6,500 coin and grain. Departing officers leave their former posts, mildly straining relations. The normal starting grace applies.'),5)
  ];
}
export function buildSetupView(app,d,handlers){
  d.reconcile();const P=parts(),{b,bind,absorb}=P;absorb('painted-panel');const q=d.pick,chosen=d.chosen,custom=q.mode==='custom';
  const refresh=fn=>()=>{if(fn())handlers.refresh();};
  const rules=(key,values)=>row(values.map(([value,label])=>b('rule-'+key+'-'+String(value),label,refresh(()=>d.setRule(key,value)),{active:q[key]===value,size:14})),{height:48});
  const scenarios=Object.values(SCENARIOS).map(s=>b('scenario-'+s.id,nm(s),refresh(()=>d.chooseScenario(s.id)),{active:s.id===q.scenario,detail:pair(s.about),lines:3,size:16}));
  const modes=row([['historical',p('历史势力','Historical faction')],['custom',p('自建势力','Found a faction')]].map(([id,label])=>b('mode-'+id,label,refresh(()=>d.chooseMode(id)),{active:id===q.mode,size:14})),{height:48});
  const branches=q.scenario==='184'&&!custom?Object.entries(BRANCHES).map(([id,br])=>b('branch-'+id,nm(br),refresh(()=>d.chooseBranch(id)),{active:id===q.branch,detail:pair(br.about),lines:3})):[];
  const powers=!custom&&!d.fixed()?d.factions.map(({f,p:fp})=>b('power-'+f.id,nm(f.name??FACTIONS[f.id])+' · '+t('factionCities',{n:fp.cities}),refresh(()=>d.chooseFaction(f.id)),{active:f.id===q.faction,size:14})):[];
  const selectedData=d.factions.find(({f})=>f.id===q.faction)?.p;
  const historical=custom?[]:[
    heading(t('chooseFaction')),d.fixed()?note(t('lockedBranch',{faction:nm(FACTIONS[d.fixed()])}),2):null,
    ...(d.fixed()?[]:chunks(powers,2).map(x=>row(x,{height:48}))),
    heading(p('自建武将','Custom officers')),note(p('只把勾选人物加入本次新局。名册及其他存档不受影响。','Only checked officers enter this new campaign. Your roster and other saves stay separate.'),3),
    ...d.roster().map(g=>P.toggle('setup-officer-'+g.id,nm(g)+' · '+g.age+' · '+serviceName(g.service),d.selected.has(g.id),refresh(()=>d.selectOfficer(g.id,!d.selected.has(g.id))))),
    d.roster().length?null:note(p('名册尚为空，可在这里登录人物。','Your roster is empty. Register an officer here.'),2),
    b('setup-roster',p('管理武将名册','Manage officer roster'),()=>handlers.goRoster())
  ];
  const summary=d.summary();
  // The selected ruler is a fixed header: the native clipped list deliberately
  // postpones rasterizing offscreen content, but selected art should always be visible.
  const setupHeader=custom?note(summary.result,2,{name:'setup-summary'}):row([
    image('setup-ruler-art',portrait(chosen.ruler,96),generalName(chosen.ruler),{width:58,height:76}),
    col([note(summary.result,2,{name:'setup-summary',height:34,size:15,color:C.paper,bold:true}),note([t('factionCities',{n:selectedData?.cities??0}),t('factionGenerals',{n:selectedData?.generals??0}),t('factionTroops',{n:num(selectedData?.troops??0)})].join(' · '),2,{height:36,size:13})],{width:'fill',height:74,gap:2})
  ],{name:'setup-ruler-header',height:84,color:C.slate,padding:4,gap:7});
  const content=[heading(t('newGame'),{name:'setup-title',size:24,height:35}),setupHeader,scroll([
    heading(p('选择年代','Starting year')),...scenarios,note(p('地图、人才和盟约为该时点的策略快照；之后由原有规则自由推演。','Territory, officers and pacts form a strategic snapshot. Existing rules determine what follows.'),3),
    heading(p('出身','Your beginning')),modes,
    q.scenario==='184'&&!custom?heading(t('chooseBranch')):null,...(q.scenario==='184'&&!custom?branches:[]),
    q.scenario!=='184'&&!custom?note(p('此年代使用自由历史局，不追补184年演义。','This era is a free campaign; the 184 story is not replayed.'),3):null,
    ...(custom?foundingRows(P,app,d,handlers):historical),
    heading(t('chooseRules')),q.scenario!=='184'?note(p('年轻武将的阅历、年长武将的体能有温和修正；智略与内政不会随高龄一刀切下降。','Younger officers have modest experience adjustments; older officers lose some physical strength, not their strategic or administrative expertise.'),4):null,
    text(t('lifespan')),rules('lifespan',[['history',t('lifeHistory')],['fiction',t('lifeFiction')]]),
    text(t('command')),rules('command',[[true,t('commandOn')],[false,t('commandOff')]]),
    text(t('difficulty')),rules('difficulty',[['easy',t('easy')],['normal',t('normal')],['hard',t('hard')]]),
    custom?note(d.errorText(),3,{color:C.gold,name:'founding-status'}):null,
    note(summary.rules,3,{name:'setup-rules'})
  ]),row([b('setup-back',t('back'),handlers.goTitle,{width:96}),b('setup-start',t('start'),()=>{if(d.submit())handlers.close();else handlers.refresh();},{active:true,disabled:!d.validation().ok})],{height:48})];
  return variants(content,{label:t('newGame'),bind});
}

export function buildRosterView(app,r,handlers){
  const P=parts(),{b,bind,absorb}=P;absorb('painted-panel');const d=r.draft;
  const refresh=fn=>()=>{fn();handlers.refresh();};
  const field=(name,label,key,limit,mode='text')=>labelledField(P,name,label,d[key],(name,edit)=>handlers.edit(name,edit,value=>r.set(key,value)),{maxLength:limit,mode});
  const choices=(key,values,label)=>P.b('roster-'+key,label+' · '+(values.find(([value])=>value===d[key])?.[1]??'—'),()=>handlers.select(label,values.map(([value,text])=>({value:String(value??''),text})),String(d[key]??''),value=>r.set(key, key==='female'?value==='true':key==='trait'?value||null:value)),{semanticLabel:label});
  const statFields=OFFICER_STATS.map(key=>labelledField(P,'roster-stat-'+key,t(key),Number.isFinite(d.stats[key])?d.stats[key]:'',(name,edit)=>handlers.edit(name,edit,value=>r.setStat(key,value)),{maxLength:4,mode:'numeric'}));
  const cards=Array.from({length:24},(_,i)=>P.clickPanel('roster-portrait-'+i,p('形象 ','Portrait ')+(i+1),[image('roster-thumbnail-'+i,art(i,'avatar'),p('形象 ','Portrait ')+(i+1),{height:54,width:'100%',semantic:false}),text((d.portrait===i?'✓ ':'')+(i+1),{align:'center',size:13,height:20,semantic:false})],refresh(()=>r.set('portrait',i)),{height:86,color:d.portrait===i?C.selected:C.slate,border:{color:d.portrait===i?C.gold:C.edge,width:d.portrait===i?2:1}}));
  const rosterRows=r.roster.map(g=>row([image('registered-image-'+g.id,art(g.portrait,'avatar'),nm(g),{width:44,height:50}),col([heading(nm(g),{size:16,height:22}),note(g.age+' · '+serviceName(g.service),2,{height:29})],{width:'fill',height:51,gap:1}),b('roster-remove-'+g.id,p('移除','Remove'),refresh(()=>r.remove(g.id)),{width:80})],{height:58,padding:3,color:C.slate}));
  const content=[heading(p('武将名册','Officer roster'),{name:'roster-title',height:34,size:24}),note(r.roster.length+' / '+OFFICER_LIMIT+' · '+p('各次开局独立选用','Select separately for each campaign'),2),scroll([
    ...rosterRows,heading(p('登录新武将','Register a new officer')),
    row([image('roster-preview',art(d.portrait),p('所选武将形象','Selected officer portrait'),{width:106,height:142}),col([field('roster-name',p('姓名','Name'),'zh',12),field('roster-English',p('英文名（可留空）','English name (optional)'),'en',48)],{width:'fill',height:148,gap:2})],{height:151}),
    field('roster-age',t('age'),'age',4,'numeric'),choices('female',[[false,p('男','Male')],[true,p('女','Female')]],p('性别','Gender')),
    choices('service',[['player',serviceName('player')],['free',serviceName('free')]],p('初始身份','Starting status')),
    heading(p('选择形象','Choose a portrait')),...chunks(cards,4).map(a=>row(a,{height:86})),
    heading(p('能力','Abilities')),...chunks(statFields,2).map(a=>row(a,{height:73})),
    text(p('能力合计 ','Ability total ')+r.budget()+' / 350',{name:'roster-budget',color:r.budget()>350?C.gold:C.paper}),
    choices('trait',[[null,p('不选特性','No trait')],...OFFICER_TRAITS.map(id=>[id,nm(TRAITS[id])])],p('一项特性','One trait')),
    note(p('属性总和上限350、单项上限90。年龄和身份按每次开局设定复制；注册不会改变已有存档。','Abilities total at most 350, with a maximum of 90 each. Age and status are copied when a campaign begins. Registration never changes an existing save.'),5),
    note(r.message(),3,{name:'roster-message',color:r.ok?0xa8d9b8:C.gold})
  ]),row([b('roster-back',t('back'),handlers.back,{width:96}),b('roster-commit',p('保存到名册','Save to roster'),refresh(()=>r.commit()),{active:true})],{height:48})];
  return variants(content,{label:p('武将名册','Officer roster'),kind:'roster',bind});
}

// A host may provide its shared screen stack. The page handle remains stable
// while its native view is rebuilt for structural changes; this preserves the
// stack's modal priority and leaves the 3D world/session untouched.
export function createNativeTitleScreens(game,{app,stack,paragraphCache,onError=error=>console.error(error)}){
  let screen=null,setup=null,roster=null,returnTo='title',slot=null,queued=false,revision=0,titleShade=null,shadeKey='',setupResume=null;
  function shade(){
    // A native gradient, not a DOM backing layer. Keep the living map visible
    // through the edge as on the original title composition.
    if(screen!=='title'){titleShade?.dispose();titleShade=null;shadeKey='';return;}
    if(!game.sprite||!game.screen)return;const r=game.screen,portrait=game.orientation==='portrait',key=[r.x,r.y,r.width,r.height,portrait].join('|');
    if(!titleShade){titleShade=game.sprite(undefined,game.ui);titleShade.touchEnabled=false;titleShade.touchChildren=false;}
    if(key===shadeKey)return;shadeKey=key;titleShade.x=r.x;titleShade.y=r.y;const g=titleShade.graphics;
    const stops=portrait?[{offset:0,color:0x101819,alpha:.12},{offset:.30,color:0x101819,alpha:.35},{offset:.55,color:0x101819,alpha:.87},{offset:1,color:0x101819,alpha:.99}]:[{offset:0,color:0x101819,alpha:.98},{offset:.26,color:0x101819,alpha:.95},{offset:.48,color:0x101819,alpha:.64},{offset:.78,color:0x101819,alpha:.06},{offset:1,color:0x101819,alpha:0}];
    g.clear().beginLinearGradientFill(0,0,portrait?0:r.width,portrait?r.height:0,stops).drawRect(0,0,r.width,r.height).endFill();game.invalidate?.();
  }
  const snapshot=()=>({screen,setup:setup?{pick:{...setup.pick},founding:{...setup.founding,companions:[...setup.founding.companions]},selected:[...setup.selected],summary:setup.summary(),valid:setup.validation().ok}:null,roster:roster?{draft:{...roster.draft,stats:{...roster.draft.stats}},budget:roster.budget(),message:roster.message(),count:roster.roster.length}:null,focus:slot?.view?.focused});
  function spec(){return screen==='title'?buildTitleView(app,handlers):screen==='setup'?buildSetupView(app,setup,handlers):screen==='roster'?buildRosterView(app,roster,handlers):null;}
  const find=(part,name)=>part?.name===name?part:part?.children?.map(c=>find(c,name)).find(Boolean);
  const gather=(part,names)=>{if(part.name)names.add(part.name);part.children?.forEach(c=>gather(c,names));};
  const omitRows=part=>part?.name==='page-body'?{...part,children:[]}:part?.children?{...part,children:part.children.map(omitRows)}:part;
  function pagePlan(next){
    const rows=find(next.description.root,'page-body')?.children??[], names=new Set();rows.forEach(r=>gather(r,names));
    const rowBind=Object.fromEntries(Object.entries(next.bind).filter(([name])=>names.has(name)));
    const outer={...next.description};for(const key of ['root','portrait','tablet','tabletPortrait'])outer[key]=omitRows(outer[key]);
    // Footer availability and labels belong to the outer view. Recreate it
    // only when those values or actual authored shell have changed.
    const outerValues=Object.entries(next.bind).filter(([name])=>!names.has(name)).map(([name,b])=>[name,...['label','disabled','checked','text'].map(key=>typeof b[key]==='function'?b[key]():null)]);
    return {rows,rowBind,revision:JSON.stringify([outer,outerValues])};
  }
  function focusDefault(target){
    if(target.resume){const prior=target.resume;target.resume=null;try{target.view?.scroll('page-body').scrollTo(prior.offset);}catch{}try{if(prior.focus&&target.view?.focus(prior.focus))return;}catch{}}
    const first=screen==='title'?(app.slotSummary('auto')?'title-continue':'title-new'):screen==='setup'?'scenario-'+setup.pick.scenario:'roster-name';
    try{if(first)target.view?.focus(first);}catch{}
  }
  function mount(target,preserve=true){
    const next=spec();if(!next)return;const plan=pagePlan(next);let offset=0,focus;
    if(preserve&&target.view&&target.pageRevision===plan.revision&&target.view.replaceChildren){
      target.view.replaceChildren('page-body',plan.rows,plan.rowBind);return;
    }
    if(target.view){if(preserve){focus=target.view.focused;try{offset=target.view.scroll('page-body').offset;}catch{}}target.view.close();}
    target.view=game.show(next.description,{bind:next.bind,paragraphCache,gamepad:true,built:()=>queueMicrotask(shade)});
    target.pageRevision=plan.revision;
    if(preserve&&offset)try{target.view.scroll('page-body').scrollTo(offset);}catch{}
    if(target.covered)target.view.cover();if(!target.active)target.view.deactivate();
    if(!target.active)return;
    if(focus)try{if(target.view.focus(focus))return;}catch{}
    focusDefault(target);
  }
  const request=()=>{if(queued)return;queued=true;const token=revision;queueMicrotask(()=>{queued=false;if(token===revision&&slot&&screen){if(!slot.active||slot.covered){slot.pending=true;return;}try{mount(slot);}catch(error){onError(error);}}});};
  function enter(next,resume=null){
    revision++;screen=next;app.screen=next;shade();
    const target={view:null,id:'nine-'+next,active:!stack,covered:false,pending:false,first:true,resume};
    if(stack){const def={id:target.id,layer:'page',back:'none',open(){if(slot!==target)return {};mount(target,false);return {show:()=>target.view?.show(),hide:()=>target.view?.hide(),close:()=>target.view?.close(),activate:()=>{target.active=true;target.view?.activate();if(target.first){target.first=false;focusDefault(target);}if(target.pending){target.pending=false;request();}},deactivate:()=>{target.active=false;target.view?.deactivate()},cover:()=>{target.covered=true;target.view?.cover()},reveal:()=>{target.covered=false;target.view?.reveal()}};}};target.def=def;slot=target;
      void (stack.snapshot().pages.length?stack.replace(def):stack.open(def)).catch(onError);
    }else{slot?.view?.close();slot=target;mount(slot,false);}
  }
  function showTitle(focusName=null){setup=null;roster=null;setupResume=null;app.pickFaction=null;app.pickCustomTown=null;enter('title',focusName?{focus:focusName,offset:0}:null);}
  function showSetup(branch=null){
    setupResume=null;setup=createCampaignDraft(app,branch);app.wake?.();app.map?.setDrift(null);
    app.pickFaction=id=>{const changed=setup?.chooseFaction(id);if(changed)request();return changed;};
    app.pickCustomTown=id=>{const changed=setup?.chooseTown(id);if(changed)request();return changed;};
    enter('setup');
  }
  function showOfficerRoster(){returnTo=screen==='setup'?'setup':'title';if(returnTo==='setup'){let offset=0;try{offset=slot?.view?.scroll('page-body').offset??0;}catch{}setupResume={focus:slot?.view?.focused,offset};}roster=createOfficerDraft(app);enter('roster');}
  function back(){if(screen==='roster'&&returnTo==='setup'&&setup){setup.reconcile();setup.focus();enter('setup',setupResume);setupResume=null;}else if(typeof app.toTitle==='function')app.toTitle();else showTitle();}
  function close(){revision++;screen=null;shade();const target=slot;slot=null;target?.view?.close();if(stack&&target?.def)void stack.close(target.def).catch(onError);}
  function edit(name,options,commit){
    const view=slot?.view;if(!view)return;
    // Pinyin/CJK composition must never apply provisional syllables. Search
    // updates its match-count binding live, without rebuilding an active editor.
    view.edit(name,{label:options.label,value:options.value,maxLength:options.maxLength,inputMode:options.inputMode,select:'all',
      ...(options.live?{onChange:({value,composing})=>{if(!composing){commit(value);view.refresh();}},onCancel:()=>{commit(options.value);request();}}:{}),
      onCommit:value=>{commit(value);request();}});
  }
  async function choose(label,all,current,commit){
    const PAGE=32;let index=Math.max(0,all.findIndex(x=>x.value===current)),page=Math.floor(index/PAGE);
    const token=revision;
    try{while(token===revision&&screen){
      const start=page*PAGE,choices=all.slice(start,start+PAGE);
      // Current selection may be outside the visible page; exactly one copy remains.
      const chosen=all.find(x=>x.value===current);if(chosen&&!choices.some(x=>x.value===current))choices.unshift(chosen);
      if(page>0)choices.push({value:'@previous-page',text:p('上一页','Previous page')});
      if(start+PAGE<all.length)choices.push({value:'@next-page',text:p('下一页','Next page')});
      const result=await game.select(choices,{title:label+(all.length>PAGE?' · '+(page+1)+' / '+Math.ceil(all.length/PAGE):''),value:current,cancel:p('取消','Cancel')});
      if(result===undefined||token!==revision)return;
      if(result==='@previous-page'){page--;continue;}if(result==='@next-page'){page++;continue;}
      commit(result);request();return;
    }}catch(error){onError(error);}
  }
  const handlers={goSetup:showSetup,goRoster:showOfficerRoster,goTitle:()=>{if(typeof app.toTitle==='function')app.toTitle();else showTitle();},back,refresh:request,edit,select:choose,close};
  return {showTitle,showSetup,showOfficerRoster,refresh:request,close,snapshot,get view(){return slot?.view},get screen(){return screen}};
}
