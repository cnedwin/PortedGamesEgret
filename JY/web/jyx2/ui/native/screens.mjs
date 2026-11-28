import {palette as C,skin,metrics} from './theme.mjs';
import {localized} from './words.mjs';

const W='fill', H='fill', b=metrics.target;
const panel=(children,extra={})=>({type:'panel',width:W,height:H,children,...extra});
const label=(name,text,height=28,extra={})=>({type:'text',name,text,width:W,height,align:'left',color:C.cream,size:18,...extra});
const button=(name,text,extra={})=>({type:'button',name,text,width:W,height:b,color:C.jade,textColor:C.cream,size:19,...extra});
const row=(children,extra={})=>panel(children,{layout:'row',height:b,gap:8,align:'stretch',...extra});
const column=(children,extra={})=>panel(children,{layout:'column',gap:6,align:'stretch',...extra});
const ornament=(height=2)=>({type:'panel',semantic:false,height,width:W,color:C.gold,alpha:0.75,children:[]});
const profiles=Object.freeze({
  root:{upright:false,tablet:false,titleSize:45,titleMenu:'51%',dialogW:'94%'},
  portrait:{upright:true,tablet:false,titleSize:46,titleMenu:W,dialogW:'96%'},
  tablet:{upright:false,tablet:true,titleSize:64,titleMenu:'42%',dialogW:620},
  tabletPortrait:{upright:true,tablet:true,titleSize:64,titleMenu:W,dialogW:'78%'}
});
const variant=(label,build,options={})=>({
  label,area:'safe',skin,...options,
  ...Object.fromEntries(Object.entries(profiles).map(([key,profile])=>[key,build(profile)]))
});

export function preparationPolicy(value) {
  const phase=value?.phase??'idle';
  const working=['checking','downloading','reading','extracting','saving','validating','worker','initializing'].includes(phase);
  return {ready:phase==='ready',working,retry:['idle','error','cancelled'].includes(phase),cancel:working};
}
export function preparationStatus(words,value) {
  const phase=value?.phase??'idle', key='prep.'+phase;
  const progress=preparationRatio(value);
  // The stable phase is separately captioned; numbers never enter an actionable control label.
  return words.text(words.has(key)?key:'prep.idle')+(progress===undefined?'':(' · '+words.text('progress.percent',{n:Math.floor(progress*100)})));
}
export function preparationRatio(value) {
  if(value?.phase==='ready')return 1;
  if(Number.isFinite(value?.ratio))return Math.min(1,Math.max(0,value.ratio));
  if(Number.isFinite(value?.done)&&Number.isFinite(value?.total)&&value.total>0)return Math.min(1,Math.max(0,value.done/value.total));
  return undefined;
}
function titleStory(words,p,art,branding={}) {
  const name=localized(branding.name,words,words.text('title.name'));
  const kicker=localized(branding.kicker,words,words.text('title.kicker'));
  const subtitle=localized(branding.subtitle,words,words.text('title.subtitle'));
  const titleSize=branding.size??p.titleSize;
  const visual=[
    // Decorative art is attached explicitly by the front-end so a missing
    // optional image cannot turn the whole native view into a fatal error.
    ...(art?[panel([],{name:'title-art-holder',semantic:false,width:W,height:H})]:[]),
    panel([],{semantic:false,anchor:'top',height:38,width:'88%',color:C.night,alpha:.84}),
    label('title-kicker',kicker,38,{anchor:'top',width:'86%',align:'center',color:C.gold,size:p.tablet?19:16}),
    panel([],{semantic:false,anchor:'bottom',width:W,height:p.tablet?148:112,color:C.deep,alpha:.9}),
    panel([],{semantic:false,anchor:'center',width:'96%',height:p.tablet?96:76,color:C.night,alpha:.76}),
    label('title-name',name,p.tablet?82:64,{anchor:'center',width:'92%',align:'center',size:titleSize,bold:true,color:C.cream}),
    label('title-subtitle',subtitle,38,{anchor:'bottom',y:9,width:'94%',align:'center',size:p.tablet?21:16,color:C.muted})
  ];
  return panel(visual,{width:p.upright?W:'fill',height:H,card:true,color:C.night,border:{color:C.line,width:1}});
}
export function buildTitle({words,art,branding,showPreparation=true}={}) {
  const t=k=>words.text(k);
  return variant(localized(branding?.name,words,t('title.name')),p=>{
    const actions=column([
      label('menu-title',t('title.menu'),26,{color:C.gold,bold:true,size:18}),
      button('continue',t('title.continue'),{color:C.jadeActive}),
      button('new',t('title.new'),{color:C.red}),
      row([
        button('load',t('title.load'),{size:16}),
        button('settings',t('title.settings'),{size:16}),
        button('help',t('title.help'),{size:16})
      ]),
      label('data-status',showPreparation?t('prep.checking'):'',25,{size:15,color:C.muted}),
      ...(showPreparation?[{type:'bar',name:'data-progress',width:W,height:10,value:0,color:C.gold,label:t('prep.progress')},
      row([
        button('data',t('title.data'),{size:15,color:C.card}),
        button('retry',t('action.retry'),{size:16,color:C.card}),
        button('cancel',t('action.cancel'),{size:16,color:C.redDim})
      ])]:[])
    ],{width:p.titleMenu,height:p.upright?(showPreparation?420:310):H,justify:'center',gap:4,padding:8,card:true,color:C.deep,border:{color:C.line,width:1}});
    return panel([titleStory(words,p,art,branding),actions],{
      width:W,height:H,layout:p.upright?'column':'row',padding:p.tablet?18:12,gap:p.tablet?18:10,align:'stretch'
    });
  });
}

const dialogBody=(name,children)=>column(children,{name,scroll:'vertical',height:H,padding:6,gap:9,card:true,color:C.night});
function dialog(words,heading,build,foot,builtOptions={}) {
  const t=k=>words.text(k);
  return variant(t(heading),p=>column([
    label('dialog-heading',t(heading),p.upright?42:32,{size:p.tablet?27:24,bold:true,color:C.gold}),
    ornament(),
    build(p),
    row(foot(p),{height:b})
  ],{anchor:'center',width:p.dialogW,height:p.upright?'94%':'96%',padding:p.upright?12:8,gap:p.upright?8:5,card:true,color:C.deep,border:{color:C.line,width:1.5}}),{modal:true,...builtOptions});
}
export const DEFAULT_VISUAL_OPTIONS=Object.freeze([
  Object.freeze({id:'high',key:'settings.visual.high'}),
  Object.freeze({id:'balanced',key:'settings.visual.balanced'}),
  Object.freeze({id:'classic',key:'settings.visual.classic'})
]);
export function normalizeVisualOptions(options=DEFAULT_VISUAL_OPTIONS) {
  if(!Array.isArray(options)||!options.length||options.length>4)throw TypeError('visual options: 1 to 4');
  const ids=new Set();
  return options.map(option=>{
    if(!option||typeof option.id!=='string'||!/^[a-z0-9_-]+$/i.test(option.id)||ids.has(option.id))throw TypeError('duplicate or invalid visual option');
    ids.add(option.id);
    return {...option,name:'visual-'+option.id};
  });
}
export const optionWords=(option,words)=>option.key?words.text(option.key):localized(option.label,words,option.id);
export function buildSettings({words,visualOptions=DEFAULT_VISUAL_OPTIONS}={}) {
  const t=k=>words.text(k), options=normalizeVisualOptions(visualOptions);
  return dialog(words,'settings.heading',p=>{
    const audio={type:'toggle',name:'sound',text:t('settings.sound'),width:W,height:b,checked:true,size:19};
    const languageHeading=label('language-heading',t('settings.language'),27,{color:C.gold,bold:true});
    const languages=row([button('language-zh',t('settings.zh'),{size:17}),button('language-en',t('settings.en'),{size:17})]);
    // A short landscape screen needs both audio and language within arm's reach,
    // rather than putting the language buttons beneath a clipped scrolling list.
    return dialogBody('settings-body',[
      label('visual-heading',t('settings.visual'),27,{color:C.gold,bold:true,size:19}),
      row(options.map(option=>button(option.name,optionWords(option,words),{size:p.upright?15:19}))),
      ...(p.upright?[audio,languageHeading,languages]:[row([
        column([audio],{width:'40%',justify:'end'}),column([languageHeading,languages],{width:W})
      ],{height:110,gap:12})]),
      label('settings-status','',25,{size:15,color:C.muted})
    ]);
  },()=>[button('back',t('action.back'),{color:C.card}),button('apply',t('action.apply'),{color:C.red})]);
}

export const DEFAULT_HELP=Object.freeze([
  Object.freeze({heading:'help.explore',lines:['help.explore.1','help.explore.2']}),
  Object.freeze({heading:'help.menu',lines:['help.menu.1','help.menu.2']}),
  Object.freeze({heading:'help.save',lines:['help.save.1','help.save.2']})
]);
export function buildHelp({words,sections=DEFAULT_HELP}={}) {
  const t=k=>words.text(k);
  return dialog(words,'help.heading',()=>dialogBody('help-body',
    sections.flatMap((section,i)=>[
      label('help-heading-'+i,localized(section.label,words,section.heading?t(section.heading):''),34,{color:C.gold,bold:true,size:20}),
      ...section.lines.map((line,j)=>label('help-line-'+i+'-'+j,typeof line==='string'?t(line):localized(line,words),42,{
        color:C.muted,size:16
      }))
    ])
  ),()=>[button('back',t('action.back'),{color:C.card})]);
}

export function normalizeSlots(slots=[]) {
  if(!Array.isArray(slots))throw TypeError('invalid save slots');
  const used=new Set();
  return slots.map(slot=>{
    const id=String(slot?.id??'');
    if(!/^[a-z0-9_-]{1,40}$/i.test(id)||used.has(id))throw TypeError('invalid or duplicate save slot identity');
    used.add(id);
    return {...slot,id,name:'slot-'+id,eligible:!(slot.empty||slot.incompatible||slot.disabled)};
  });
}
export function slotCopy(slot,words) {
  const prefix=slot.auto||slot.id==='auto'?words.text('saves.auto'):words.text('saves.slot',{n:slot.labelNumber??slot.id});
  const title=localized(slot.title,words,slot.incompatible?words.text('saves.incompatible'):slot.empty?words.text('saves.emptySlot'):'');
  const detail=localized(slot.detail,words,'');
  return {prefix,title,detail,complete:[prefix,title,detail].filter(Boolean).join(' · ')};
}
function fitRow(text,limit) {
  let width=0,out='';
  for(const char of String(text)){
    const cost=/[\x00-\x7f]/u.test(char)?0.56:1;
    if(width+cost>limit)return out.trimEnd()+'…';
    width+=cost;out+=char;
  }
  return out;
}
export function saveRows(words,slots) {
  return normalizeSlots(slots).map(slot=>{
    const text=slotCopy(slot,words);
    return panel([
      label(undefined,fitRow(text.prefix+(text.title?' · '+text.title:''),19),34,{semantic:false,color:slot.eligible?C.cream:C.muted,bold:true,size:18}),
      label(undefined,fitRow(text.detail,28),27,{semantic:false,color:C.muted,size:15})
    ].map(({name,...part})=>part),{name:slot.name,role:'button',card:true,color:slot.eligible?C.jade:C.card,height:78,padding:9,gap:2,layout:'column',border:{color:C.line,width:1}});
  });
}
export function buildSaves({words,slots=[]}={}) {
  const t=k=>words.text(k);
  return dialog(words,'saves.heading',()=>column([
    label('saves-status',t('saves.loading'),30,{color:C.muted,size:16}),
    dialogBody('save-rows',saveRows(words,slots))
  ],{gap:5}),()=>[button('back',t('action.back'),{color:C.card}),button('import',t('saves.import'),{color:C.red})]);
}
export function buildConfirm({words,confirmCopy}={}) {
  const t=k=>words.text(k);
  return dialog(words,'confirm.heading',()=>dialogBody('confirm-body',[
    label('confirm-line-1',localized(confirmCopy?.line1,words,t('confirm.explain.1')),48,{size:18,color:C.cream}),
    label('confirm-line-2',localized(confirmCopy?.line2,words,t('confirm.explain.2')),48,{size:16,color:C.muted})
  ]),()=>[button('back',t('action.back'),{color:C.card}),button('confirm-new',t('confirm.new'),{color:C.red})]);
}
