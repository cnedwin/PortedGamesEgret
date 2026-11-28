// Standalone native menu controller. Data, settings and gameplay remain with the host.
import {createUiScreenStack} from '@egret/engine/ui';
import {palette} from './theme.mjs';
import {createShellWords,localized} from './words.mjs';
import {
  buildTitle,buildSettings,buildHelp,buildSaves,buildConfirm,preparationPolicy,preparationStatus,preparationRatio,
  normalizeSlots,slotCopy,saveRows,normalizeVisualOptions,optionWords,DEFAULT_VISUAL_OPTIONS,DEFAULT_HELP
} from './screens.mjs';

// Convert the portable screen cancellation signal to one supported by browser APIs.
function abortFor(context) {
  const abort=new AbortController();
  if(context.signal.aborted)abort.abort(context.signal.reason);
  else context.signal.addEventListener('abort',()=>abort.abort(context.signal.reason),{once:true});
  return abort.signal;
}
export function createRpgFrontEnd(game,{
  state=()=>({}),actions={},words=createShellWords(),art,artAspect=1.5,onArtworkError=()=>{},branding={},showPreparation=true,confirmCopy,
  visualOptions=DEFAULT_VISUAL_OPTIONS,helpSections=DEFAULT_HELP,onError=()=>{},idPrefix='front'
}={}) {
  const read=()=>((typeof state==='function'?state():state)??{});
  const options=normalizeVisualOptions(visualOptions);
  const views=new Map();
  const report=error=>{try{onError(error)}catch{/* Diagnostics cannot break a screen. */}};
  const stack=createUiScreenStack({onError:report});
  let disposed=false,titleBusy=false,titleStatus='';
  const available=key=>typeof actions[key]==='function';
  const t=(key,values)=>words.text(key,values);
  const tx=key=>({text:()=>t(key)});
  const screenId=name=>idPrefix+'-'+name;
  function refresh(){
    for(const view of views.values())view.refresh();
    game.invalidate?.();
  }
  function open(screen){
    if(disposed)return Promise.resolve(undefined);
    const pending=stack.open(screen);
    void pending.catch(report);
    return pending;
  }
  // A stack modal deactivates its page; some hosts forget the saved native
  // focus when two independent state machines (stack + view) close it.
  // Restore the opener only after the stack has made the title active again.
  function openFromTitle(screen,opener){
    const restore=()=>{
      if(!disposed&&stack.active===title){
        views.get('title')?.focus(opener);
        game.invalidate?.();
      }
    };
    return open(screen).then(result=>{restore();return result},error=>{restore();throw error});
  }
  const dismiss=()=>{void stack.back().catch(report)};
  const artLayers=new WeakSet();
  function installArt(view){
    if(!art)return;
    const layer=view.get('title-art-holder');
    if(artLayers.has(layer))return;
    artLayers.add(layer);
    const {width,height}=view.rect('title-art-holder');
    const fittedWidth=Math.min(width,height*artAspect);
    // The title painting is optional. Explicit image loading exposes its
    // rejected promise, unlike a declarative required image part.
    void game.image(art,{layer,x:width/2,y:height/2,width:fittedWidth}).then(
      ()=>game.invalidate?.(),
      error=>{if(!layer.isDisposed&&!disposed){try{onArtworkError(error)}catch{/* optional diagnostic */}}}
    );
  }
  function viewFor(name,description,bind,initialFocus){
    const view=game.show(description,{
      state:read,bind,gamepad:true,...(description.modal?{initialFocus,dismiss}:{}),
      ...(name==='title'&&art?{built:installArt}:{})
    });
    views.set(name,view);
    const handle={
      show(){view.show()},hide(){view.hide()},cover(){view.cover()},reveal(){view.reveal()},
      activate(){view.activate()},deactivate(){view.deactivate()},
      close(){views.delete(name);view.close();game.invalidate?.()}
    };
    return {view,handle};
  }
  function invoke(action,...args){
    try{return Promise.resolve(actions[action](...args))}
    catch(error){return Promise.reject(error)}
  }
  function titleRun(action,context){
    if(disposed||titleBusy||!available(action)||context.signal.aborted)return;
    titleBusy=true;titleStatus='status.busy';refresh();
    const signal=abortFor(context);
    // Invoke at the actual user activation, not a Promise continuation: file
    // pickers and audio unlock can require the browser's gesture.
    void invoke(action,{signal}).then(result=>{
      if(!signal.aborted)titleStatus=result===false?'status.failed':'';
    },error=>{
      if(!signal.aborted){titleStatus='status.failed';report(error)}
    }).finally(()=>{
      titleBusy=false;if(!disposed)refresh();
    });
  }
  const title={
    id:screenId('title'),layer:'page',back:'none',
    open(context){
      const ready=()=>preparationPolicy(read().preparation).ready;
      const task=callback=>()=>titleRun(callback,context);
      const modal=(screen,opener)=>()=>{void openFromTitle(screen,opener).catch(report)};
      const bind={
        'title-kicker':{text:()=>localized(branding.kicker,words,t('title.kicker'))},
        'title-name':{text:()=>localized(branding.name,words,t('title.name'))},
        'title-subtitle':{text:()=>localized(branding.subtitle,words,t('title.subtitle'))},
        'menu-title':tx('title.menu'),
        continue:{...tx('title.continue'),disabled:()=>!ready()||!read().canContinue||titleBusy||!available('continueGame'),tap:task('continueGame')},
        new:{...tx('title.new'),disabled:()=>!ready()||titleBusy||!available('newGame'),
          tap:()=>{
            if(read().canContinue||read().confirmNew||read().needsRecovery)void openFromTitle(confirm,'new').then(answer=>{if(answer)titleRun('newGame',context)},report);
            else titleRun('newGame',context);
          }},
        load:{...tx('title.load'),disabled:()=>!ready()||titleBusy,tap:modal(saves,'load')},
        settings:{...tx('title.settings'),tap:modal(settings,'settings')},
        help:{...tx('title.help'),tap:modal(help,'help')},
        'data-status':{text:()=>titleStatus?t(titleStatus):
          localized(read().notice,words,showPreparation?preparationStatus(words,read().preparation):'')},
        'data-progress':{value:()=>preparationRatio(read().preparation)??0,label:()=>t('prep.progress')},
        data:{...tx('title.data'),disabled:()=>!available('openData')||titleBusy,tap:task('openData')},
        retry:{...tx('action.retry'),disabled:()=>!preparationPolicy(read().preparation).retry||!available('retryPreparation')||titleBusy,tap:task('retryPreparation')},
        // Cancellation must be independent of the pending preparation operation.
        cancel:{...tx('action.cancel'),disabled:()=>!preparationPolicy(read().preparation).cancel||!available('cancelPreparation'),
          tap:()=>{void invoke('cancelPreparation',{signal:abortFor(context)}).then(refresh,report)}}
      };
      if(!showPreparation)for(const key of ['data-progress','data','retry','cancel'])delete bind[key];
      const {view,handle}=viewFor('title',buildTitle({words,art,branding,showPreparation}),bind);
      view.focus(ready()&&read().canContinue&&available('continueGame')?'continue':ready()&&available('newGame')?'new':'settings');
      return handle;
    }
  };
  const settings={
    id:screenId('settings'),layer:'modal',
    open(context){
      const previous=read().preferences??{};
      const draft={...previous,visual:options.some(o=>o.id===previous.visual)?previous.visual:options[0].id,
        sound:previous.sound!==false,language:previous.language==='en'?'en':words.language};
      let busy=false,status='',view;
      const changed=()=>{view?.refresh();game.invalidate?.()};
      const signal=abortFor(context);
      const bind={
        'dialog-heading':tx('settings.heading'),'visual-heading':tx('settings.visual'),
        sound:{...tx('settings.sound'),checked:()=>draft.sound,disabled:()=>busy,tap:()=>{draft.sound=!draft.sound;changed()}},
        'language-heading':tx('settings.language'),'settings-status':{text:()=>status?t(status):''},
        back:{...tx('action.back'),tap:()=>context.close()},
        apply:{...tx('action.apply'),disabled:()=>busy||!available('applySettings'),tap:()=>{
          if(busy)return;busy=true;status='settings.applying';changed();
          void invoke('applySettings',{...draft},{signal}).then(result=>{
            if(signal.aborted)return;
            if(result===false){status='status.failed';return}
            words.setLanguage(draft.language);
            if(result?.persisted===false){status='settings.notSaved';refresh();return}
            refresh();context.close(true);
          },error=>{if(!signal.aborted){status='status.failed';report(error)}})
            .finally(()=>{busy=false;if(!signal.aborted)changed()});
        }}
      };
      for(const option of options)bind[option.name]={
        text:()=>optionWords(option,words),label:()=>optionWords(option,words)+(draft.visual===option.id?' · '+t('action.chosen'):''),disabled:()=>busy,
        color:()=>draft.visual===option.id?palette.jadeActive:palette.card,tap:()=>{draft.visual=option.id;changed()}
      };
      for(const lang of ['zh','en'])bind['language-'+lang]={
        ...tx('settings.'+lang),label:()=>t('settings.'+lang)+(draft.language===lang?' · '+t('action.chosen'):''),disabled:()=>busy,
        color:()=>draft.language===lang?palette.jadeActive:palette.card,tap:()=>{draft.language=lang;changed()}
      };
      const made=viewFor('settings',buildSettings({words,visualOptions}),bind,'visual-'+draft.visual);
      view=made.view;return made.handle;
    }
  };
  const help={
    id:screenId('help'),layer:'modal',
    open(context){
      const bind={'dialog-heading':tx('help.heading'),back:{...tx('action.back'),tap:()=>context.close()}};
      helpSections.forEach((section,i)=>{
        bind['help-heading-'+i]={text:()=>localized(section.label,words,section.heading?t(section.heading):'')};
        section.lines.forEach((line,j)=>{bind['help-line-'+i+'-'+j]={text:()=>typeof line==='string'?t(line):localized(line,words)}});
      });
      return viewFor('help',buildHelp({words,sections:helpSections}),bind,'back').handle;
    }
  };
  const saves={
    id:screenId('saves'),layer:'modal',
    open(context){
      const signal=abortFor(context);
      let view,slotList=[],busy=false,loading=false,status='saves.loading';
      const changed=()=>{view?.refresh();game.invalidate?.()};
      function run(action,...args){
        if(busy||signal.aborted||!available(action))return;
        busy=true;status='status.busy';changed();
        void invoke(action,...args,{signal}).then(result=>{
          if(signal.aborted)return;
          if(result===false){status='status.failed';return}
          if(action==='loadSave'){context.close(true);return}
          // Import cancellation leaves the list unchanged and open.
          if(result===undefined||result===null)status=slotList.length?'':'saves.empty';
          else load();
        },error=>{if(!signal.aborted){status='status.failed';report(error)}})
          .finally(()=>{busy=false;if(!signal.aborted)changed()});
      }
      function rows(){
        if(signal.aborted)return;
        const bind=Object.fromEntries(slotList.map(slot=>[slot.name,{
          label:()=>slotCopy(slot,words).complete,disabled:()=>!slot.eligible||busy||loading||!available('loadSave'),
          tap:()=>run('loadSave',slot)
        }]));
        view.replaceChildren('save-rows',saveRows(words,slotList),bind);changed();
      }
      function load(){
        if(signal.aborted)return;
        status='saves.loading';loading=true;changed();
        const pending=available('readSlots')?invoke('readSlots',{signal}):Promise.resolve(read().slots??[]);
        void pending.then(result=>{
          if(signal.aborted)return;
          slotList=normalizeSlots(result);status=slotList.length?'':'saves.empty';rows();
        }).catch(error=>{if(!signal.aborted){status='saves.error';report(error)}})
          .finally(()=>{loading=false;if(!signal.aborted)changed()});
      }
      const made=viewFor('saves',buildSaves({words}),{
        'dialog-heading':tx('saves.heading'),'saves-status':{text:()=>status?t(status):''},
        back:{...tx('action.back'),tap:()=>context.close()},
        import:{...tx('saves.import'),disabled:()=>busy||loading||!available('importSave'),tap:()=>run('importSave')}
      },'back');
      view=made.view;load();return made.handle;
    }
  };
  const confirm={
    id:screenId('confirm'),layer:'modal',
    open(context){
      return viewFor('confirm',buildConfirm({words,confirmCopy}),{
        'dialog-heading':tx('confirm.heading'),
        'confirm-line-1':{text:()=>localized(confirmCopy?.line1,words,t('confirm.explain.1'))},
        'confirm-line-2':{text:()=>localized(confirmCopy?.line2,words,t('confirm.explain.2'))},
        back:{...tx('action.back'),tap:()=>context.close(false)},
        'confirm-new':{...tx('confirm.new'),tap:()=>context.close(true)}
      },'back').handle;
    }
  };
  return {
    stack,words,refresh,openTitle:()=>open(title),openSettings:()=>openFromTitle(settings,'settings'),
    openHelp:()=>openFromTitle(help,'help'),openSaves:()=>openFromTitle(saves,'load'),closeTitle:()=>stack.closeAll(),
    back:()=>stack.back(),getView:name=>views.get(name),
    setLanguage(language){words.setLanguage(language);refresh()},
    async dispose(){if(disposed)return;disposed=true;await stack.dispose()}
  };
}
