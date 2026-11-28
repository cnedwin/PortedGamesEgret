// Native campaign dialogs — authored game.show data; no visible HTML controls.
import { getLanguage, nm, t } from '../i18n.mjs';
import { FACTIONS } from '../data/factions.mjs';
import { SCENARIOS } from '../sim/scenarios.mjs';
import { SLOTS } from '../saves.mjs';
import { dayWords, pair } from './text.mjs';
import { progressPrompt } from './player-flow.mjs';

const C = { ink:0x18272a, panel:0x233337, border:0xa38651, text:0xf2e4c6, muted:0xb7b6a7,
  gold:0xe7c78b, button:0x354747, active:0x825045, danger:0x9f3c36, disabled:0x515454, track:0x131f23 };
export const dialogSkin = { text:C.text, panel:C.ink, panelAlpha:.98, button:C.button, buttonText:C.text,
  disabled:C.disabled, accent:C.gold, track:C.track, radius:5, size:18, dim:.58 };
const FONT = ['Noto Sans SC','Microsoft YaHei','PingFang SC','sans-serif'];
const row = (children,height=48,extra={})=>({type:'panel',layout:'row',height,width:'fill',gap:8,children,...extra});
const column = (children,height,extra={})=>({type:'panel',layout:'column',height,width:'fill',gap:10,children,...extra});
const panel = (children,height,extra={})=>column(children,height,{card:true,color:C.panel,padding:10,border:{color:C.border,width:1},...extra});
const gap = (height=8)=>({type:'space',height});
const txt=(text,height=30,size=18,extra={})=>({type:'text',text:String(text??''),width:'fill',height,size,color:C.text,...extra});
const paragraph=(text,width,size=18,extra={})=>{
  const s=String(text??''), units=[...s].reduce((n,c)=>n+(/[\u3400-\u9fff\uf900-\ufaff]/u.test(c)?1:.54),0);
  const maxLines=Math.min(256,Math.max(1,Math.ceil(units/Math.max(10,width/size))+s.split('\n').length-1));
  const lineHeight=Math.ceil(size*1.45);
  return txt(s,maxLines*lineHeight+5,size,{paragraph:{fontFamilies:FONT,lineHeight,maxLines,locale:getLanguage()==='en'?'en-GB':'zh-CN'},...extra});
};
const small=(text,height=26)=>txt(text,height,16,{color:C.muted});
const section=text=>txt(text,34,20,{color:C.gold,bold:true});
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const nativeView=(name,text,extra={})=>({type:'button',name,text:String(text),width:'fill',height:48,size:17,border:{color:C.border,width:1},...extra});
function ctxBuilder(width){
  const bind={},ranges=[];
  const act=(name,label,callback,{disabled=false,selected=false,main=false,danger=false,semanticLabel,width:buttonWidth='fill',height=48,...rest}={})=>{
    bind[name]={disabled:()=>Boolean(disabled),...(semanticLabel?{label:()=>String(semanticLabel)}:{}),tap:()=>{if(!disabled)callback?.();}};
    return nativeView(name,label,{width:buttonWidth,height,color:danger?C.danger:main||selected?C.active:C.button,...rest});
  };
  const note=(words,size=17)=>paragraph(words,width-28,size,{color:C.muted});
  return {bind,ranges,act,note,width,txt,paragraph:(words,size=18,extra={})=>paragraph(words,width-28,size,extra),row,column,panel,section,small,gap};
}
function settings(app,args,again,b){
  const st=app.settings;
  const set=(key,value)=>{app.setSetting(key,value);again();};
  const toggle=(key)=>column([txt(t(key),28,18,{color:C.gold}),row([
    b.act('setting-'+key+'-on',t('on'),()=>set(key,true),{selected:st[key]===true,semanticLabel:t(key)+' · '+t('on')}),
    b.act('setting-'+key+'-off',t('off'),()=>set(key,false),{selected:st[key]===false,semanticLabel:t(key)+' · '+t('off')})
  ])],86,{gap:6});
  const volume=(key,bus,fallback)=>{
    const level=Number.isFinite(st[key])?clamp(Math.round(st[key]*100),0,100):fallback;
    const range={name:key+'-slider',label:t(key),min:0,max:100,step:1,value:level,bus,
      preview:value=>app.sound.setVolumes?.({[bus]:value/100}),commit:value=>app.setSetting(key,value/100)};
    b.ranges.push(range);
    // The data view creates and focuses the named panel. A native RangeControl
    // drives its bar and live number; its own semantic slider is mounted by the controller.
    b.bind[range.name]={tap:()=>{}};
    b.bind[key+'-meter']={value:()=>range.value/100};
    b.bind[key+'-amount']={text:()=>range.value+'%'};
    return column([row([txt(t(key),32,18,{color:C.gold}),{...txt(level+'%',32,18,{width:72,align:'right',bold:true,color:C.gold}),name:key+'-amount'}],32),
      {type:'panel',name:range.name,role:'button',card:true,color:C.button,height:48,width:'fill',padding:12,border:{color:C.border,width:1},children:[
        {type:'bar',name:key+'-meter',semantic:false,value:level/100,color:C.gold,height:16,width:'fill',anchor:'center'}]}],88,{gap:6});
  };
  const language=column([txt(t('languageLabel'),28,18,{color:C.gold}),row([
    b.act('setting-lang-zh','中文',()=>app.setLanguage('zh'),{selected:getLanguage()==='zh'}),
    b.act('setting-lang-en','English',()=>app.setLanguage('en'),{selected:getLanguage()==='en'})])],86,{gap:6});
  return {title:t('settings'),body:[language,toggle('sound'),toggle('music'),toggle('reducedMotion'),
    volume('musicVolume','music',55),volume('effectsVolume','effects',80),b.note(t('keysHelp')),
    app.state?b.act('setting-to-title',t('toTitle'),()=>app.toTitle(),{danger:true}):null,b.note(t('demo'))],
    actions:[b.act('dialog-close',t('close'),()=>app.dialogs.close(),{main:true})],initialFocus:'dialog-close'};
}
function saves(app,args,again,b,host){
  const cards=SLOTS.map(slot=>{
    const sum=app.slotSummary(slot), savedAt=sum?.savedAt?new Date(sum.savedAt):null;
    const details=[sum?.scenario&&SCENARIOS[sum.scenario]?nm(SCENARIOS[sum.scenario]):null,
      savedAt&&Number.isFinite(savedAt.getTime())?pair(['保存于 ','Saved '])+savedAt.toLocaleString(getLanguage()==='zh'?'zh-CN':'en-GB',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}):null].filter(Boolean);
    const savedFaction=sum&&(sum.name?{id:sum.faction,name:sum.name,colour:sum.colour,flag:sum.flag}:
      FACTIONS[sum.faction]??{id:sum.faction,name:{zh:'自建势力',en:'Custom banner'},colour:sum.colour??0x85643f,flag:sum.flag??'义'});
    const name=slot==='auto'?t('autosave'):t('slot',{n:slot}),children=[section(name)];
    if(sum){const mark=getLanguage()==='zh'?(savedFaction.flag??'—'):(nm(savedFaction.name??savedFaction).replace(/^The /,'')[0]??'—').toUpperCase();
      const summaryText=paragraph(nm(savedFaction.name??savedFaction)+' · '+dayWords(sum.day)+' · '+t('factionCities',{n:sum.cities}),Math.max(180,b.width-90),17);
      children.push(row([{type:'panel',width:40,height:40,card:true,color:savedFaction.colour??0x85643f,children:[txt(mark,40,22,{width:40,align:'center',bold:true})]},summaryText],Math.max(48,summaryText.height)));
    } else children.push(small(t('empty'),36));
    if(details.length)children.push(b.note(details.join(' · '),15));
    const actions=[app.state&&slot!=='auto'?b.act('slot-'+slot+'-save',t('saveHere'),()=>app.act('saveSlot',slot),{semanticLabel:name+' · '+t('saveHere')}):null,
      sum?b.act('slot-'+slot+'-load',t('loadThis'),()=>app.loadSlot(slot),{main:true,semanticLabel:name+' · '+t('loadThis')}):null].filter(Boolean);
    if(actions.length)children.push(row(actions));
    const h=children.reduce((n,x)=>n+Number(x.height),0)+Math.max(0,children.length-1)*10+20;
    return panel(children,h);
  });
  const actions=[app.state?b.act('save-export',t('exportSave'),()=>app.exportFile()):null,
    b.act('save-import',t('importSave'),()=>host.importSave())].filter(Boolean);
  return {title:t('menuSave'),body:[...cards,row(actions)],actions:[b.act('dialog-close',t('close'),()=>app.dialogs.close(),{main:true})],initialFocus:'dialog-close'};
}
function confirmProgress(app,args,again,b){
  const prompt=progressPrompt(args.reason),cancel=()=>args.backToSaves?app.open('saves'):app.dialogs.close();
  return {title:prompt.title,body:[b.paragraph(prompt.text),args.slot?b.note(t('slot',{n:args.slot})):null],actions:[
    b.act('dialog-cancel',t('cancel'),cancel),args.reason!=='overwrite'&&app.state?b.act('confirm-save-first',pair(['先去存档','Save first']),()=>app.open('saves')):null,
    b.act('confirm-proceed',prompt.action,()=>{app.dialogs.close(true);args.proceed();},{main:true})],initialFocus:'dialog-cancel',dismiss:cancel};
}
export const nativeBuilders = {settings,saves,confirmProgress};

/** Build native Play view data. Dimensions are the host's logical safe-area units. */
export function buildDialog(name,app,args,again,viewport,host){
  const width=Math.max(240,Math.min(760,Math.floor(viewport.width-20))),height=Math.max(240,Math.min(740,Math.floor(viewport.height-20)));
  const b=ctxBuilder(width-32),fn=nativeBuilders[name];if(!fn)return null;
  const spec=fn(app,args,again,b,host);if(!spec)return null;
  const body=spec.body.filter(Boolean),actions=spec.actions.filter(Boolean);
  const footerStack=actions.length>1&&width<600&&height>=480;
  const footerHeight=footerStack?actions.length*48+(actions.length-1)*8:48;
  const header=txt(spec.title,44,Math.min(25,Math.max(19,Math.floor(width/20))),{color:C.gold,bold:true});
  const root={type:'panel',name:'dialog-root',anchor:'center',width,height,card:true,color:C.ink,border:{color:C.border,width:1},padding:15,layout:'column',gap:8,children:[
    header,{type:'panel',name:'dialog-body',scroll:'vertical',layout:'column',width:'fill',height:'fill',gap:10,children:body},
    footerStack?column(actions,footerHeight,{gap:8}):row(actions,48)]};
  return {description:{label:spec.title,area:'safe',modal:true,uiScale:true,skin:dialogSkin,root},bind:b.bind,ranges:b.ranges,initialFocus:spec.initialFocus,blocking:Boolean(spec.blocking),dismiss:spec.dismiss};
}
