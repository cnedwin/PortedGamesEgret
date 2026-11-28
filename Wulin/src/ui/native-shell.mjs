import {wrapPlayWords} from '@egret/engine/play';
// Native view lifetime, input forms and the common command frame.
import {createUiScreenStack} from '@egret/engine/ui';
import {createCanvasParagraphProvider} from '@egret/engine/web/paragraph';
import {createParagraphCache} from '@egret/engine/paragraph';
import {createPage} from './native-pages.mjs';
import {createSheet} from './native-sheets.mjs';
import {createNativeNotices} from './native-notice.mjs';
import {COLORS,SKIN,BODY_FONT,TITLE_FONT,commandSeal,text,button,row,col,scroll,space,compile} from './native-kit.mjs';
import {SECT_BY_ID} from '../data/sects.mjs';
import {dateText} from '../core/world.mjs';
import {goalView} from '../core/goals.mjs';
import {attention} from '../core/disciples.mjs';

const free=(children,props={})=>({type:'panel',layout:'free',width:'100%',height:'100%',children,...props});
const navs=[['seat','山门'],['disciples','弟子'],['world','江湖'],['battle','战阵'],['chronicle','纪事'],['saves','存档']];
const n=v=>Math.round(v??0).toLocaleString('en-US');
function makeHud(ctx,mode){
  const {world,ui,helpers}=ctx,b=helpers.books(),sect=SECT_BY_ID[helpers.me()];
  const upright=mode.includes('portrait');
  const darkText=(v,p={})=>text(v,{color:COLORS.paper,size:14,height:23,...p});
  const pace=[[0,'暂停'],[1,'行'],[4,'快'],[16,'疾']].map(([v,label])=>button(label,'speed',{speed:v},{selected:ui.speed===v,width:'fill',height:44,size:14}));
  const resources=[['银两',b.silver],['粮草',b.grain],['威望',b.renown],['正邪',b.virtue]].map(([label,value])=>col([darkText(label,{align:'center',height:17}),darkText(n(value),{align:'center',size:16,bold:true,height:25})],{width:'fill',height:44,gap:0}));
  const date=button(ui.language==='en'?('Y'+(1+Math.floor(world.day/360))+' M'+(1+Math.floor(world.day%360/30))+' D'+(1+world.day%30)):dateText(world),'date',{}, {name:'date',kind:'scene',height:44,width:upright?'fill':174,size:14});
  const identity=row([commandSeal({width:22,height:22}),darkText(sect.name,{size:17,bold:true,fontFamily:TITLE_FONT,width:'fill',height:44,align:'center'})],{width:upright?'fill':104,height:44,gap:3});
  const top={type:'panel',layout:upright?'column':'row',width:'100%',height:upright?140:52,anchor:'top',color:COLORS.dark,alpha:1,border:{color:COLORS.bronzeLine,width:1},padding:4,gap:upright?1:5,children:[
    row([identity,date],{width:upright?'100%':284,height:44,gap:4}),
    row(resources,{width:'fill',height:44,gap:3}),
    row(pace,{width:upright?'100%':212,height:44,gap:3}),
  ]};
  const watch=attention(world,helpers.me()),english=ui.language==='en';
  const shortNames={seat:'Seat',disciples:'Pupils',world:'Map',battle:'Battle',chronicle:'Logs',saves:'Saves'};
  const nav=navs.map(([id,label])=>{
    const count=id==='seat'?watch.callers:id==='disciples'?watch.idle.length+watch.promotable.length:id==='world'&&world.pending?1:0;
    const locked=!helpers.open(id),selected=ui.page===id||(ui.page==='arts'&&id==='disciples');
    const word=locked?id==='world'?(english?'Map view':'江湖·览'):(english?'Battle*':'战阵·锁'):(english?shortNames[id]:label);
    const explanation=id==='seat'&&count?(english?'Seat: '+count+' applicants, open recruitment':'山门：'+count+' 人求见，前往招贤'):
      id==='disciples'&&count?(english?'Disciples: '+count+' matters awaiting orders':'弟子：'+count+' 项待办，前往处理'):
      id==='world'&&count?(english?'Realm: an event awaits your decision':'江湖：有奇遇待你定夺'):
      locked?id==='world'?(english?'Realm: browse only until first objective or ten days':'江湖：可观览，首项要务或首旬后开放事务'):
      (english?'Battle: opens after five objectives or one season':'战阵：开派满一季或完成前五项要务后开放'):undefined;
    // Put the pending count inside the actionable control. A floating corner
    // badge extended beyond the button's hit area and looked separately clickable.
    return button(word+(count?' '+(count>99?'99+':count):''),'page',{page:id,nav:'1'},{name:'nav-'+id,label:explanation??(english&&id==='disciples'?'Disciples':english&&id==='chronicle'?'Chronicle':word),selected,role:'tab',width:'fill',height:48,size:upright?12:16,
      // One continuous ink-wood rail: a gilded current plaque, subdued
      // cinnabar for pending affairs, and recessed ordinary or locked plaques.
      color:selected?0x345443:count?0x57352e:COLORS.deep,
      textColor:locked&&!selected?0xe2cfaa:COLORS.cream,
      border:{color:selected?COLORS.goldLight:count?0x754437:COLORS.deep,width:selected?2:1},
    });
  });
  nav.push(button(english?'Setup':'设置','sheet',{kind:'settings'},{name:'nav-settings',label:english?'Settings':'设置',width:'fill',height:48,size:upright?12:16,color:COLORS.deep,textColor:COLORS.goldLight,border:{color:COLORS.deep,width:1}}));
  const bottom=row(nav,{name:'navigation',role:'tablist',label:'主要功能',width:'100%',height:54,anchor:'bottom',y:ui.commandCollapsed&&!ui.sheet?38:0,color:COLORS.deep,alpha:1,padding:3,gap:1,border:{color:COLORS.bronzeLine,width:1}});
  const goal=goalView(world);
  const mission=goal&&!world.outcome&&!ui.fight&&helpers.isStaged()?button('要务'+(goal.done?' · 可领赏':''),'goal-open',{}, {name:'goal',width:upright?108:202,height:48,anchor:'top-left',x:upright?180:5,y:upright?201:56,kind:goal.done?'primary':'scene',badge:'goal'}):null;
  return free([top,bottom,mission].filter(Boolean));
}
function pickMode(game){const s=game.screen, scale=s.scale??(game.canvas.clientWidth/s.width);return (Math.min(s.width,s.height)*scale>=600?'tablet':'phone')+(game.orientation==='portrait'?'-portrait':'');}
function variant(p,mode){return mode==='tablet-portrait'?(p.tabletPortrait??p.portrait??p.root):mode==='tablet'?(p.tablet??p.root):mode==='phone-portrait'?(p.portrait??p.root):p.root;}
export function createNativeUi(game,{context,locale,dispatch,change,onClose,onError}) {
  const screens=createUiScreenStack({onError});
  const provider=createCanvasParagraphProvider(game.browser.scheduleTextWork?{schedule:game.browser.scheduleTextWork}:{}), cache=createParagraphCache(game.engine.assets,{provider,maxEntries:96,maxPendingJobs:96,maxImageBytes:64*1024*1024});
  const values=new Map(); let scopeKey='',sheetScopeKey='',pageSlot,modalSlot,choiceAbort,queued=false,running=false,pending=false,failed=false;
  let lastSheet=null, lastPage=null;
  const currentMode=()=>pickMode(game);
  const translate=value=>locale.translate(value);
  const notices=createNativeNotices(game,{context,translate,wrap:wrapPlayWords,onChange:request});
  const fieldId=data=>data?.id;
  const saveValue=(id,value)=>{if(id)values.set(id,String(value??''));};
  function getValue(id,fallback=''){if(!values.has(id))saveValue(id,fallback);return values.get(id)??'';}
  const read=id=>values.get(id.replace(/^#/,''));
  const badges=()=>{const c=context();if(!c.world)return;const watch=attention(c.world,c.helpers.me());game.badges.set('disciples',watch.idle.length+watch.promotable.length);game.badges.set('world',c.world.pending?1:0);game.badges.set('applicants',watch.callers);game.badges.set('goal',goalView(c.world)?.done?1:0);};
  function decorate(node){
    if((node._action==='@field'||node._action==='@choice')&&node._data){
      const d=node._data,id=node._action==='@field'?d.id:d.data?.id;
      if(id && !d.change){
        const value=getValue(id,d.value);
        if(node._action==='@field'){node={...node,text:d.label+' · '+(value||'—'),_data:{...d,value}};}
        else {const selected=d.options.find(([v])=>String(v)===String(value));node={...node,text:d.label+(selected?' · '+selected[1]:''),_data:{...d,value}};}
      }
    }
    return node.children?{...node,children:node.children.map(decorate)}:node;
  }
  function compileFor(root,slot){return compile(decorate(root),{translate,live:slot.live,badge:id=>game.badges.count(id),fieldValue:(id,fallback)=>fallback,dispatch:(act,data,activation,name)=>onActivate(act,data,activation,name,slot)});}
  function onActivate(act,data,activation,name,slot){
    if(act==='@field'){
      slot.view.edit(name,{value:String(data.value??''),label:translate(data.label),fontFamily:BODY_FONT,fontSize:Math.max(14,16*game.uiScale),inputMode:data.type==='number'?'decimal':'text',maxLength:data.maxLength??(data.type==='number'?18:128),color:COLORS.ink,backgroundColor:COLORS.paper,select:'all',padding:5,
        ...(data.placeholder?{placeholder:translate(data.placeholder)}:{}),
        onCommit(value){if(data.type==='number'&&!Number.isFinite(Number(value)))return;if(!data.change)saveValue(data.id,value);if(data.change)change(data.change,data.data??{},value,activation);else if(['own-name','own-leader','search-person'].includes(data.id))change('@field',{id:data.id},value,activation);else request();}});
      return;
    }
    if(act==='@choice'){openChoice(data,activation);return;}
    dispatch(act,data,activation);
  }
  function openChoice(d,activation){
    closeChoice();
    const controller=new AbortController();choiceAbort=controller;
    const choices=d.options.map(([value,label])=>({value:String(value),text:translate(label)}));
    try{
      void game.select(choices,{title:translate(d.label),value:String(d.value),cancel:translate('取消'),skin:{...SKIN,panel:COLORS.deep,text:COLORS.cream},signal:controller.signal}).then(value=>{
        if(choiceAbort!==controller)return;
        choiceAbort=null;
        if(value!==undefined){
          if(!d.change)saveValue(d.data?.id,value);
          if(d.change)change(d.change,d.data??{},value,activation);
        }
        request();
      },cause=>{if(choiceAbort===controller)choiceAbort=null;onError(cause);});
    }catch(cause){choiceAbort=null;onError(cause);}
    game.invalidate();
  }
  function closeChoice(){const previous=choiceAbort;choiceAbort=null;previous?.abort();}
  function makeSlot(kind,id,raw,label){
    const slot={kind,id,raw,label,view:null,revision:'',screen:null,live:{current:{},next:{}}};
    const def={id,layer:kind,back:kind==='modal'?()=>{onClose();return true;}: 'none',open(){
      mount(slot,slot.raw,slot.label);return {show:()=>slot.view?.show(),hide:()=>slot.view?.hide(),close:()=>slot.view?.close(),cover:()=>slot.view?.cover(),reveal:()=>slot.view?.reveal(),activate:()=>slot.view?.activate(),deactivate:()=>slot.view?.deactivate()};
    }};
    slot.screen=def;return slot;
  }
  function mount(slot,raw,label){
    slot.live.next={};const hasVariants=Object.hasOwn(raw,'root');const first=hasVariants?raw.root:raw;const c=compileFor(first,slot);const variants={};if(hasVariants){for(const k of ['portrait','tablet','tabletPortrait'])if(raw[k])variants[k]=compileFor(raw[k],slot).root;}const revision=JSON.stringify({root:c.root,...variants});slot.live.current=slot.live.next;
    if(slot.revision===revision&&slot.view){slot.view.refresh();return;}
    // Native keyed lists are safe when the replacement children are shared by
    // every orientation; retain the outer viewport and focus rather than replace it.
    const nextDesc={root:c.root,...variants};
    if(slot.view&&slot.description){
      const find=(node,name)=>node?.name===name?node:node?.children?.map(x=>find(x,name)).find(Boolean);
      const omit=(node,name)=>node?.name===name?{...node,children:[]}:node?.children?{...node,children:node.children.map(x=>omit(x,name))}:node;
      const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
      for(const key of ['page-rows','sheet-content']){
        const rows=find(c.root,key)?.children;
        if(!rows?.every(x=>x.name))continue;
        const entries=Object.entries(nextDesc);
        if(!entries.every(([v,root])=>same(find(root,key)?.children,rows)&&same(omit(root,key),omit(slot.description[v],key))))continue;
        const names=new Set();const gather=node=>{if(node.name)names.add(node.name);node.children?.forEach(gather);};rows.forEach(gather);
        const bind=Object.fromEntries(Object.entries(c.bind).filter(([name])=>names.has(name)));
        try{slot.view.replaceChildren(key,rows,bind);slot.description=nextDesc;slot.revision=revision;return;}catch{}
      }
    }
    // Keyed materialized rows keep the outer viewport and its focus/scroll on updates.
    if(!hasVariants&&slot.view&&slot.rootProps===JSON.stringify(({...c.root,children:undefined}))&&c.root.type==='panel'&&c.root.children.every(x=>x.name)){
      try{slot.view.replaceChildren(c.root.name,c.root.children,c.bind);slot.revision=revision;return;}catch(error){/* Different authored layout: rebuild the view, not the stage. */}
    }
    const old=slot.view,focus=old?.focused, offsets={};
    if(old){for(const key of ['page-rows','roster-controls','sheet-content','sheet-footer'])try{offsets[key]=old.scroll(key).offset}catch{};old.close();}
    slot.view=game.show({label:translate(label),root:c.root,...variants,skin:SKIN,modal:slot.kind==='modal'}, {bind:c.bind,paragraphCache:cache,gamepad:true,dismiss:slot.kind==='modal'?()=>onClose():undefined});
    slot.rootProps=JSON.stringify({...c.root,children:undefined});slot.description=nextDesc;slot.revision=revision;
    for(const [key,offset] of Object.entries(offsets))try{slot.view.scroll(key).scrollTo(offset);}catch{}
    if(focus)try{slot.view.focus(focus)}catch{}
    notices.sync(true);
    // Give a newly opened on-demand page one further presentation after mounting.
    if(!old)setTimeout(()=>{if(!failed&&(pageSlot===slot||modalSlot===slot))game.invalidate();},250);
  }
  function modal(ctx,content,mode){
    const upright=mode.includes('portrait'),tablet=mode.startsWith('tablet'),short=mode==='phone';
    const foot=content.footer??[],frame={color:COLORS.deep,card:true,border:{color:COLORS.goldLight,width:1},padding:3,gap:5};
    const footer=foot.length?(!upright&&foot.length<=4?row(foot,{name:'sheet-footer',height:54,...frame}):scroll(foot,{name:'sheet-footer',height:Math.min(short?58:132,foot.length*54),...frame})):null;
    // Brief decisions read like a sealed note rather than a full-page form.
    // Keep the same bounded scroll viewport and reserve a short status row.
    const known=content.children.every(part=>typeof part.height==='number'&&Number.isFinite(part.height));
    const total=known?52+(footer?.height??0)+16+18+48+content.children.reduce((sum,part)=>sum+part.height,0)+Math.max(0,content.children.length-1)*7:Infinity;
    const compact=!short&&total<=460;
    const header=row([commandSeal({width:upright?26:34,height:upright?26:34}),
      text(content.title,{fontFamily:TITLE_FONT,size:22,bold:true,color:COLORS.cream,height:44,width:'fill'}),
      button('关闭','close',{}, {name:'sheet-close',width:64,height:44,kind:'danger',size:15})],
      {height:52,gap:7,padding:3,color:COLORS.deep,card:true,border:{color:COLORS.goldLight,width:1}});
    return col([header,notices.inline(mode),scroll(content.children,{name:'sheet-content',height:'fill',padding:3,gap:7}),footer].filter(Boolean),
      {name:'sheet-root',width:upright?'100%':tablet?(compact?560:720):'94%',height:compact?Math.max(240,total):'96%',anchor:'center',card:true,color:COLORS.paper,alpha:1,padding:8,gap:6,border:{color:COLORS.goldLight,width:2}});
  }
  async function refresh(){
    if(failed)return;
    if(running){pending=true;return;}running=true;
    try{do{pending=false;const ctx=context(), mode=currentMode();badges();if(choiceAbort){pending=false;break;}if(!ctx.ui.sheet&&modalSlot){await screens.closeAll('modal');modalSlot=null;sheetScopeKey='';}
      if(lastPage!==ctx.ui.page){lastPage=ctx.ui.page;values.clear();}
      if(lastSheet!==ctx.ui.sheet){lastSheet=ctx.ui.sheet;for(const key of [...values.keys()])if(!['own-name','own-leader','search-person'].includes(key))values.delete(key);}
      const pageDesc=createPage(ctx);const raw={};for(const [key,m] of [['root','phone'],['portrait','phone-portrait'],['tablet','tablet'],['tabletPortrait','tablet-portrait']]){const pageRoot=pageDesc[key]??pageDesc.root;raw[key]=free([pageRoot,...(ctx.world&&!ctx.ui.fight?[makeHud(ctx,m)]:[])],{name:'page-root'});}
      const id='page-'+ctx.ui.page;
      if(scopeKey!==id||!pageSlot){if(modalSlot){await screens.closeAll('modal');modalSlot=null;sheetScopeKey='';}
        const next=makeSlot('page',id,raw,ctx.ui.page);pageSlot=next;scopeKey=id;void (screens.snapshot().pages.length?screens.replace(next.screen):screens.open(next.screen)).catch(onError);
      }else if(!modalSlot)mount(pageSlot,raw,ctx.ui.page);
      const sheet=ctx.ui.sheet?createSheet(ctx):null;
      if(sheet){const key='sheet-'+ctx.ui.sheet.kind,root={root:modal(ctx,sheet,'phone'),portrait:modal(ctx,sheet,'phone-portrait'),tablet:modal(ctx,sheet,'tablet'),tabletPortrait:modal(ctx,sheet,'tablet-portrait')};if(key!==sheetScopeKey||!modalSlot){
          if(modalSlot)await screens.closeAll('modal');sheetScopeKey=key;modalSlot=makeSlot('modal',key,root,sheet.title);void screens.open(modalSlot.screen).catch(onError);
        }else mount(modalSlot,root,sheet.title);
      }else if(modalSlot){await screens.closeAll('modal');modalSlot=null;sheetScopeKey='';}
      notices.sync();game.invalidate();
    }while(pending);}catch(error){onError(error);}finally{running=false;}
  }
  function request(){if(failed||queued)return;queued=true;queueMicrotask(()=>{queued=false;void refresh();});}
  function resize(){request();}
  return {request,resize,read,get editing(){return game.editing},get choosing(){return !!choiceAbort},get focused(){return !!(modalSlot?.view??pageSlot?.view)?.focused},closeChoice,screens,storage:values,
    focus(id){const v=modalSlot?.view??pageSlot?.view;try{return v?.focus(id)}catch{return false}},
    focusAction(action,match={}){const slot=modalSlot??pageSlot;if(!slot?.view)return null;
      for(const [name,item] of Object.entries(slot.live.current))if(item.action===action&&!item.disabled&&Object.entries(match).every(([k,v])=>String(item.data?.[k])===String(v))){try{if(slot.view.focus(name))return {name,label:item.label};}catch{}}
      return null;
    },
    confirm(question){return game.confirm(translate(question),{title:translate('请确认'),yes:translate('确认'),no:translate('取消'),skin:SKIN});},
    toast(message,tone){notices.toast(message,tone);},
    error(message){if(failed)return;failed=true;closeChoice();pageSlot?.view?.cancelEdit();modalSlot?.view?.cancelEdit();const slot={};const c=compileFor(col([text('载入失败',{size:24,height:40,bold:true}),text(String(message),{lines:4,height:112}),button('重试','retry',{}, {kind:'primary'})],{card:true,width:'90%',height:240,anchor:'center',padding:12,gap:8}),slot);slot.view=game.show({modal:true,skin:SKIN,label:translate('载入失败'),root:c.root},{bind:c.bind,paragraphCache:cache});},
  };
}
