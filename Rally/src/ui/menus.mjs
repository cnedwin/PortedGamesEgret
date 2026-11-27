// Responsive native screens. The 3D scene stays mounted: the select preview is only a safe stage-space region.
import { DisplayObjectContainer } from '@egret/engine';
import { createUiLayerManager,createUiRoot,createUiScreenStack } from '@egret/engine/ui';
import { CLASSES,LAP_CHOICES,RACERS,TEXT } from '../data.mjs';
import { createRallyKit,RALLY_THEME as T,FONT_SERIF } from './kit.mjs';

const rect=(x,y,width,height)=>({x,y,width,height});
const fit=(value,min,max)=>Math.max(min,Math.min(max,value));
const time=seconds=>{
  if(seconds===undefined)return '—';
  const n=Math.max(0,Math.round(seconds*100));
  return `${Math.floor(n/6000)}:${String(Math.floor(n/100)%60).padStart(2,'0')}.${String(n%100).padStart(2,'0')}`;
};
const failureWords={
  zh:{heading:'部分资源未能载入',body:'可以重试载入，或继续使用现有资源进入游戏。',retry:'重试',proceed:'先这样玩'},
  en:{heading:'Some resources did not load',body:'Retry loading, or continue with the available artwork.',retry:'Retry',proceed:'Play anyway'}
};
const split=(box,count,gap=5)=>Array.from({length:count},(_,i)=>{
  const w=(box.width-gap*(count-1))/count;return rect(box.x+i*(w+gap),box.y,w,box.height);
});
function centered(w,h,width,height){return rect((w-width)/2,(h-height)/2,width,height);}
function block(k,text,box,options={}){return k.label({text,rect:box,...options});}
function heading(k,text,box,size=26){return block(k,text,box,{size,weight:850,color:T.gold,family:FONT_SERIF,align:'center',role:'heading'});}
function action(k,id,text,box,fn,primary=false){return k.action({id,text,rect:box,onActivate:fn,primary});}
function settingsRow(k,t,settings,box,changed,switchLanguage){
  const [sound,quality,lang]=split(box,3,5),cycle={high:'medium',medium:'low',low:'high'};
  k.toggle({id:'sound',name:t.sound,text:`${t.sound}: ${settings.muted?t.off:t.on}`,rect:sound,checked:!settings.muted,
    onChange:value=>{settings.muted=!value;changed();}});
  action(k,'quality',`${t.quality}: ${t.qualities[settings.quality]}`,quality,()=>{settings.quality=cycle[settings.quality];changed();});
  action(k,'language',t.language,lang,()=>{switchLanguage();changed();});
}
function framedPanel(k,box,{accent=true}={}){
  k.panel(box,{fill:T.ink,alpha:.94,border:T.border,radius:15});
  if(accent)k.panel(rect(box.x+1,box.y+12,3,Math.max(1,box.height-24)),{fill:T.coral,border:T.coral,alpha:1,radius:2});
}
function title(k,entry,screen,lang,changed,switchLanguage){
  const t=TEXT[lang],{settings,handlers}=entry.model,{width:w,height:h}=screen;
  const wide=w>h*1.18,short=h<390,pad=short?14:22,gap=short?4:8;
  const width=Math.min(w-20,wide?fit(w*.50,365,520):480);
  const head=short?55:74,tag=short?36:46,credit=short?18:22;
  const height=2*pad+24+head+tag+48+20+48+credit+6*gap;
  const box=rect(wide?Math.max(10,w*.045):(w-width)/2,(h-height)/2,width,height);
  framedPanel(k,box);
  let y=box.y+pad,x=box.x+pad,inner=width-2*pad;
  const row=(height)=>{const r=rect(x,y,inner,height);y+=height+gap;return r;};
  block(k,t.subtitle,row(24),{size:16,color:T.coral,weight:800,family:FONT_SERIF});
  block(k,t.title,row(head),{size:short?47:60,minSize:28,color:T.pale,weight:900,family:FONT_SERIF,role:'heading'});
  block(k,t.tagline,row(tag),{size:17,weight:550,color:T.paper});
  entry.primary=action(k,'start',t.start,row(48),handlers.onStart,true).id;entry.primaryAction=handlers.onStart;
  block(k,t.pressStart,row(20),{size:13,color:T.muted});
  settingsRow(k,t,settings,row(48),changed,switchLanguage);
  block(k,t.engineCredit,row(credit),{size:12,color:T.muted});
}
function stat(k,label,value,box){
  const labelW=box.width*.55,gap=3,barW=(box.width-labelW-gap*5)/5;
  block(k,label,rect(box.x,box.y,labelW,box.height),{size:13,minSize:10,color:T.muted,wrap:false});
  for(let i=0;i<5;i++)k.panel(rect(box.x+labelW+i*(barW+gap),box.y+box.height*.3,Math.max(2,barW),Math.max(5,box.height*.4)),
    {fill:i<value?T.gold:T.jadeLight,alpha:1,border:i<value?T.gold:T.jadeLight,radius:2});
}
function racerDetails(k,racer,t,lang,box){
  const gap=6,first=box.width*.49,sealSize=Math.min(36,box.height-8),textX=box.x+sealSize+7;
  k.seal(rect(box.x,box.y+(box.height-sealSize)/2,sealSize,sealSize),racer);
  block(k,racer.name[lang],rect(textX,box.y,first-sealSize-7,box.height*.46),{size:15,minSize:11,weight:800,color:T.pale});
  block(k,racer.blurb[lang],rect(textX,box.y+box.height*.46,first-sealSize-7,box.height*.54),{size:12,minSize:10,color:T.muted,weight:500});
  const x=box.x+first+gap,width=box.width-first-gap;
  const stats=[[t.speed,racer.stats.speed],[t.accel,racer.stats.accel],[t.handling,racer.stats.handling],[t.weight,racer.stats.weight]];
  const columns=box.width<430?1:2,half=(width-(columns-1)*gap)/columns,rh=box.height/(4/columns);
  stats.forEach(([label,value],index)=>stat(k,label,value,rect(x+(index%columns)*(half+gap),box.y+Math.floor(index/columns)*rh,half,rh)));
}
function selection(k,entry,screen,lang,changed){
  const t=TEXT[lang],{settings,handlers}=entry.model,{width:w,height:h}=screen,racer=RACERS[settings.racer];
  const wide=w>=680&&w>h,short=h<390,pad=short?8:12,gap=short?3:6,margin=10;
  const panelW=wide?Math.min(660,Math.max(492,w*.62)):Math.min(650,w-2*margin);
  const cols=wide||panelW>=560?4:2,rows=Math.ceil(RACERS.length/cols),cardH=48;
  const headH=short?26:32,cardsH=rows*cardH+(rows-1)*gap,detailH=short?42:panelW<560?68:60;
  const separate=!wide&&panelW<560,optH=separate?2*48+gap:63;
  const panelH=2*pad+headH+cardsH+detailH+optH+48+4*gap;
  const panel=wide?rect(w-margin-panelW,(h-panelH)/2,panelW,panelH):rect((w-panelW)/2,h-margin-panelH,panelW,panelH);
  const previewSpace=wide?rect(margin,panel.y,Math.max(48,panel.x-margin-gap),panel.height):
    rect(panel.x,margin,panel.width,Math.max(70,panel.y-margin-gap));
  const tipH=wide?Math.min(94,Math.max(60,previewSpace.height*.28)):fit(previewSpace.height*.32,45,78);
  const preview=rect(previewSpace.x,previewSpace.y,previewSpace.width,Math.max(35,previewSpace.height-tipH-gap));
  const tipBox=rect(previewSpace.x,preview.y+preview.height+gap,previewSpace.width,tipH);
  entry.preview=preview;
  // A border marks the preview without drawing over its 3D model.
  k.panel(preview,{fill:T.ink,alpha:0,border:T.gold,radius:10});
  k.panel(tipBox,{fill:T.ink,alpha:.9,border:T.border,radius:9});
  block(k,t.tip,rect(tipBox.x+7,tipBox.y+4,tipBox.width-14,tipBox.height-8),{size:12,minSize:10,weight:500,color:T.muted});
  framedPanel(k,panel,{accent:false});
  const inner=panel.width-2*pad,x=panel.x+pad;let y=panel.y+pad;
  const row=(height)=>{const r=rect(x,y,inner,height);y+=height+gap;return r;};
  heading(k,t.choose,row(headH),short?25:30);
  const cards=row(cardsH),cellW=(cards.width-(cols-1)*gap)/cols;
  const racerGroup=k.choice({id:'racers',name:t.choose,selected:settings.racer,
    items:RACERS.map((r,i)=>({key:i,text:r.name[lang],badge:r,size:13,
      rect:rect(cards.x+(i%cols)*(cellW+gap),cards.y+Math.floor(i/cols)*(cardH+gap),cellW,cardH)})),
    onChange:value=>{settings.racer=Number(value);changed();}});
  entry.racerControl=racerGroup.control;
  entry.defaultFocus=racerGroup.id;
  racerDetails(k,racer,t,lang,row(detailH));
  const optionsBox=row(optH);
  function choices(id,name,values,value,names,box,set,withLabel=true){
    const labelW=withLabel?0:Math.min(62,box.width*.18);
    if(withLabel)block(k,name,rect(box.x,box.y,box.width,15),{size:12,color:T.muted,weight:700});
    else block(k,name,rect(box.x,box.y,labelW-3,box.height),{size:13,color:T.muted,weight:700});
    const controls=withLabel?rect(box.x,box.y+15,box.width,48):rect(box.x+labelW,box.y,box.width-labelW,48);
    k.choice({id,name,selected:value,items:values.map((v,i)=>({key:String(i),text:names(v),rect:split(controls,values.length,3)[i],size:14})),
      onChange:index=>{set(Number(index));changed();}});
  }
  if(separate){
    choices('class',t.klass,CLASSES,settings.klass,c=>c.name[lang],rect(optionsBox.x,optionsBox.y,optionsBox.width,48),i=>settings.klass=i,false);
    choices('laps',t.laps,LAP_CHOICES,LAP_CHOICES.indexOf(settings.laps),String,rect(optionsBox.x,optionsBox.y+48+gap,optionsBox.width,48),i=>settings.laps=LAP_CHOICES[i],false);
  }else{
    const first=optionsBox.width*.61;
    choices('class',t.klass,CLASSES,settings.klass,c=>c.name[lang],rect(optionsBox.x,optionsBox.y,first-gap,63),i=>settings.klass=i);
    choices('laps',t.laps,LAP_CHOICES,LAP_CHOICES.indexOf(settings.laps),String,rect(optionsBox.x+first,optionsBox.y,optionsBox.width-first,63),i=>settings.laps=LAP_CHOICES[i]);
  }
  const [back,race]=split(row(48),2,6);
  action(k,'back',t.back,back,handlers.onBack);
  entry.primary=action(k,'race',t.race,race,handlers.onRace,true).id;entry.primaryAction=handlers.onRace;
}
function pause(k,entry,screen,lang,changed,switchLanguage){
  const t=TEXT[lang],{settings,handlers}=entry.model,{width:w,height:h}=screen,gap=7,pad=16;
  const width=Math.min(510,w-20),height=2*pad+36+48+48+48+54+4*gap;
  const box=centered(w,h,width,height);framedPanel(k,box);
  const x=box.x+pad,inner=width-2*pad;let y=box.y+pad;
  const row=height=>{const r=rect(x,y,inner,height);y+=height+gap;return r;};
  heading(k,t.paused,row(36),30);
  entry.primary=action(k,'resume',t.resume,row(48),handlers.onResume,true).id;entry.primaryAction=handlers.onResume;
  const [restart,quit]=split(row(48),2,6);
  action(k,'restart',t.restart,restart,handlers.onRestart);
  action(k,'quit',t.quit,quit,handlers.onQuit);
  settingsRow(k,t,settings,row(48),changed,switchLanguage);
  block(k,t.help,row(54),{size:14,minSize:11,color:T.muted,weight:500});
}
function results(k,entry,screen,lang){
  const t=TEXT[lang],{game,handlers}=entry.model,{width:w,height:h}=screen,pad=12,gap=5;
  const rows=game.results(),width=Math.min(680,w-20),rh=fit((h-2*pad-36-20-48-3*gap-20)/Math.max(8,rows.length),20,37);
  const height=2*pad+36+20+rh*rows.length+48+3*gap,box=centered(w,h,width,height);
  framedPanel(k,box,{accent:false});
  const x=box.x+pad,inner=width-2*pad;let y=box.y+pad;
  heading(k,`${t.results} · ${t.place[game.human.place-1]}`,rect(x,y,inner,36),28);y+=36+gap;
  const rankW=inner*.09,timeW=inner*.22,nameW=inner-rankW-2*timeW;
  block(k,t.time,rect(x+rankW+nameW,y,timeW,20),{size:13,color:T.muted,align:'center'});
  block(k,t.bestLap,rect(x+rankW+nameW+timeW,y,timeW,20),{size:13,color:T.muted,align:'center'});
  y+=20+gap;
  for(const row of rows){
    const racer=RACERS[row.kart.racer],mine=row.kart.human;
    k.panel(rect(x,y,inner,rh-2),{fill:mine?T.jadeLight:T.jade,alpha:1,border:mine?T.gold:T.jade,radius:5});
    block(k,String(row.place),rect(x,y,rankW,rh-2),{size:15,color:mine?T.gold:T.pale,weight:800,align:'center'});
    const badge=Math.min(25,rh-6),rx=x+rankW+4;
    k.seal(rect(rx,y+(rh-2-badge)/2,badge,badge),racer);
    block(k,`${racer.name[lang]}${mine?' ('+t.you+')':''}`,rect(rx+badge+3,y,nameW-badge-10,rh-2),{size:14,minSize:10,color:mine?T.pale:T.paper,weight:700});
    block(k,time(row.time),rect(x+rankW+nameW,y,timeW,rh-2),{size:14,minSize:11,color:T.paper,align:'center'});
    block(k,time(row.bestLap),rect(x+rankW+nameW+timeW,y,timeW,rh-2),{size:14,minSize:11,color:mine?T.gold:T.paper,align:'center'});
    y+=rh;
  }
  y+=gap;const [menu,again]=split(rect(x,y,inner,48),2,6);
  action(k,'menu',t.menu,menu,handlers.onQuit);
  entry.primary=action(k,'again',t.again,again,handlers.onRestart,true).id;entry.primaryAction=handlers.onRestart;
}
function failure(k,entry,screen,lang){
  const t=failureWords[lang],{width:w,height:h}=screen,{retry,proceed,message}=entry.model;
  const width=Math.min(510,w-20),height=Math.min(245,h-20),box=centered(w,h,width,height),pad=16;
  framedPanel(k,box);
  const x=box.x+pad,inner=width-2*pad;
  heading(k,t.heading,rect(x,box.y+pad,inner,46),25);
  block(k,[t.body,message].filter(Boolean).join('\n'),rect(x,box.y+pad+50,inner,height-2*pad-50-55),
    {size:16,minSize:11,color:T.muted});
  const [again,cont]=split(rect(x,box.y+height-pad-48,inner,48),2,6);
  action(k,'retry',t.retry,again,retry,true);
  const proceedNow=()=>{entry.context.close();proceed?.();};
  entry.primary=action(k,'continue',t.proceed,cont,proceedNow).id;entry.primaryAction=proceedNow;
}

export function createRallyMenus(host,{lang,onPreviewRect,onLanguage}={}){
  let language=lang==='en'||lang==='zh'?lang:(navigator.language?.startsWith('zh')?'zh':'en');
  const {game,scope,keyboard,semantics}=host,entries=new Map();
  const stack=createUiScreenStack({onError:host.reportError});host.setScreenStack(stack);
  const manager=createUiLayerManager({engine:game.engine,scope,input:host.pointer,keyboard,viewport:host.metrics().safe,onInvalidate:host.requestPublish});
  let desired=null,closed=false,work=Promise.resolve(),previewRect=null;
  const setLang=value=>{
    if(value!=='zh'&&value!=='en')return false;
    if(language===value)return false;
    language=value;document.documentElement.lang=value;document.title=TEXT[value].title;
    host.overlay.canvas.setAttribute('aria-label',TEXT[value].title);onLanguage?.(value);return true;
  };
  document.documentElement.lang=language;document.title=TEXT[language].title;
  host.overlay.canvas.setAttribute('aria-label',TEXT[language].title);
  function publishLayers(){
    const result=manager.sync();
    if(result.postCommitErrors.length)throw Error('Rally UI layer: '+result.postCommitErrors.map(String).join(', '));
    host.requestPublish();return result;
  }
  function setPreview(entry){
    const r=entry?.active&&entry.kind==='select'?entry.preview:null,safe=host.metrics().safe;
    previewRect=r?rect(r.x+safe.x,r.y+safe.y,r.width,r.height):null;
    onPreviewRect?.(previewRect,host.game.screen);
  }
  function moveFocus(entry,previous=entry.lastFocus,visible=true){
    if(!entry.active||!keyboard)return;
    const id=previous&&entry.focusIds.has(previous)?previous:
      entry.lastFocus&&entry.focusIds.has(entry.lastFocus)?entry.lastFocus:entry.defaultFocus??entry.primary;
    if(id)keyboard.focus(id,{visible});
    else keyboard.moveFocus('next',true);
    host.focus();host.requestPublish();
  }
  function refreshEntry(entry){
    if(entry.closed)return;
    schedule(()=>render(entry));
  }
  function changed(entry){
    entry.model.handlers?.onChange?.();refreshEntry(entry);
  }
  function switchLanguage(entry){
    const next=language==='zh'?'en':'zh';
    setLang(next);
    if(entry.model.settings)entry.model.settings.lang=next;
  }
  async function render(entry,deferLayer=false){
    if(entry.closed)return;
    const safe=host.metrics().safe,size={width:safe.width,height:safe.height},old=keyboard?.getSnapshot();
    const ids=new Set(),version=++entry.version;
    const tree={kind:'leaf',id:'sheet',explicitWidth:size.width,explicitHeight:size.height,content:{
      revision:version,prepare(context){return {content:context.scope.use(new DisplayObjectContainer()),measuredHeight:size.height};},
      onAttach(context){
        const base=createRallyKit(host,context.content,{scope:context.scope,prefix:entry.id,semanticParent:entry.semanticId,lang:language});
        const capture=fn=>options=>{const handle=fn(options);ids.add(handle.id);return handle;};
        const k={...base,action:capture(base.action),toggle:capture(base.toggle),choice:capture(base.choice)};
        entry.primary=null;entry.primaryAction=null;entry.defaultFocus=null;entry.preview=null;
        (entry.kind==='title'?title:entry.kind==='select'?selection:entry.kind==='pause'?pause:entry.kind==='results'?results:failure)
          (k,entry,size,language,()=>changed(entry),()=>switchLanguage(entry));
        entry.content=context.content;entry.content.visible=!entry.covered;
      }
    }};
    if(!entry.root)entry.root=createUiRoot({id:entry.id,engine:game.engine,scope,viewport:size,density:1,tree,
      input:host.pointer,keyboard:{input:keyboard,idPrefix:entry.id}});
    else {entry.root.setViewport(size,1);entry.root.setTree(tree,{responsive:true});}
    let token;for(let i=0;i<8;i++){token=await entry.root.prepare();if(token.status!=='pending')break;}
    if(entry.closed)return;
    if(!token||token.status==='pending')throw Error('Rally UI preparation incomplete: '+entry.id);
    const result=entry.root.commit(token);
    if(!['committed','unchanged'].includes(result.kind)||result.postCommitErrors.length)
      throw Error('Rally UI commit '+entry.id+': '+result.kind+' '+result.postCommitErrors.map(String).join(', '));
    entry.focusIds=ids;entry.size=size;
    if(!entry.registration){
      entry.registration=manager.register({id:entry.id,root:entry.root,kind:'modal',closeOnEscape:false,closeOnOutside:false,
        backdropColor:T.ink,backdropAlpha:entry.kind==='title'?.12:entry.kind==='select'?.18:.62});
    }
    if(entry.visible)manager.open(entry.id);
    if(!deferLayer){manager.setViewport(safe);publishLayers();if(entry.active){moveFocus(entry,old?.focusedId,old?.focusVisible??true);setPreview(entry);}}
  }
  function schedule(fn){
    const task=work.catch(()=>{}).then(()=>{if(!closed)return fn();});
    work=task;host.track(task);return task;
  }
  function definition(kind,layer){
    const id='rally-'+kind;
    return {id,layer,back:kind==='select'?()=>{entries.get(id)?.model.handlers.onBack?.();}:
      kind==='pause'?()=>{entries.get(id)?.model.handlers.onResume?.();}:'none',
      async open(context){
        const {model,activated}=context.params,entry={kind,id,model,context,semanticId:id+'-dialog',version:0,closed:false,visible:false,
          covered:false,active:false,focusIds:new Set(),size:{width:0,height:0}};
        entries.set(id,entry);
        const name=()=>kind==='title'?TEXT[language].title:kind==='select'?TEXT[language].choose:
          kind==='pause'?TEXT[language].paused:kind==='results'?TEXT[language].results:failureWords[language].heading;
        const semantic=semantics.add({id:entry.semanticId,role:'dialog',describe:()=>({name:name(),bounds:host.metrics().safe,
          hidden:entry.closed||!entry.visible||entry.covered,modal:entry.active})});
        try{await render(entry);}catch(cause){entry.closed=true;entry.root?.dispose();semantic.remove();entries.delete(id);activated.reject(cause);throw cause;}
        return {
          show(){entry.visible=true;manager.open(id);publishLayers();},
          hide(){entry.visible=false;manager.close(id);publishLayers();},
          cover(){entry.covered=true;if(entry.content)entry.content.visible=false;host.requestPublish();},
          reveal(){entry.covered=false;if(entry.content)entry.content.visible=true;host.requestPublish();},
          activate(){entry.active=true;moveFocus(entry);setPreview(entry);activated.resolve();},
          deactivate(){
            const focused=keyboard?.getSnapshot().focusedId;
            if(entry.focusIds.has(focused))entry.lastFocus=focused;
            entry.active=false;host.requestPublish();
          },
          close(){entry.closed=true;entry.visible=false;entry.registration?.dispose();entry.root?.dispose();semantic.remove();entries.delete(id);publishLayers();if(kind==='select')setPreview(null);}
        };
      }};
  }
  const defs={title:definition('title','page'),select:definition('select','page'),pause:definition('pause','modal'),
    results:definition('results','page'),failure:definition('failure','modal')};
  function show(kind,model){
    desired=kind;
    return schedule(async()=>{
      const def=defs[kind],existing=entries.get(def.id);
      if(existing&&!existing.closed){
        if(kind==='title'&&stack.active!==def)await stack.popTo(def);
        existing.model=model;await render(existing);return;
      }
      const previous=entries.get(stack.active?.id),focused=keyboard?.getSnapshot().focusedId;
      if(previous?.focusIds.has(focused))previous.lastFocus=focused;
      // Keep the title as the bottom page while selecting. The native stack's back rule
      // deliberately never dismisses a lone bottom page, and returning reveals its saved focus.
      if(kind!=='pause'&&kind!=='failure'&&!(kind==='select'&&stack.isOpen(defs.title)))await stack.closeAll();
      let resolve,reject;
      const openReady=new Promise((yes,no)=>{resolve=yes;reject=no;});
      const opened=stack.open(def,{model,activated:{resolve,reject}});
      opened.catch(reject);
      await openReady;
    });
  }
  const menus={
    get lang(){return language;},set lang(value){if(setLang(value))menus.refresh();},
    get active(){return Boolean(desired||stack.active);},get previewRect(){return previewRect&&{...previewRect};},
    showTitle(settings,handlers){return show('title',{settings,handlers});},
    showSelect(settings,handlers){return show('select',{settings,handlers});},
    showPause(on,settings,handlers){
      if(on)return show('pause',{settings,handlers});
      desired=null;return schedule(async()=>{await stack.close(defs.pause);host.blurToScene();});
    },
    showResults(game,handlers){return show('results',{game,handlers});},
    showFailure({retry,continue:proceed,message}={}){return show('failure',{retry,proceed,message});},
    hide(){desired=null;return schedule(async()=>{await stack.closeAll();setPreview(null);host.blurToScene();});},
    refresh(){const entry=entries.get(stack.active?.id);if(entry&&!entry.closed)return schedule(()=>render(entry));},
    command(name,detail={}){
      if(!menus.active)return false;
      if(detail.taken??detail.event?.defaultPrevented)return true;
      if(name==='menu'||name==='back'){schedule(()=>stack.back());return true;}
      const entry=entries.get(stack.active?.id);
      if(!entry)return true;
      if(entry.kind==='select'&&detail.source==='keyboard'&&document.activeElement!==host.overlay.canvas&&(name==='left'||name==='right')){
        if(name==='left')entry.racerControl?.previous();else entry.racerControl?.next();return true;
      }
      if(name==='confirm'){if(!host.command(name,detail))entry.primaryAction?.();return true;}
      return host.command(name,detail);
    },
    snapshot(){return {stack:stack.snapshot(),layers:manager.snapshot(),previewRect};},
    dispose(){closed=true;stopLayout();return stack.dispose().finally(()=>manager.dispose());}
  };
  const stopLayout=host.registerLayout(()=>schedule(async()=>{
    const active=entries.get(stack.active?.id),previous=keyboard?.getSnapshot();
    for(const entry of entries.values())await render(entry,true);
    manager.setViewport(host.metrics().safe);publishLayers();
    if(active){moveFocus(active,previous?.focusedId,previous?.focusVisible??true);setPreview(active);}
  }));
  stack.onChange(()=>host.requestPublish());
  return menus;
}
