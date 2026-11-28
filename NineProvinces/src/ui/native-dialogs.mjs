// A single native modal controller with the legacy game-facing contract.
// Business actions stay on app; the native screen stack owns rendering and focus.
import { createUiScreenStack, createRangeControl } from '@egret/engine/ui';
import { buildDialog, nativeBuilders } from './native-dialog-builders.mjs';

export function createNativeDialogs(app,{game,stack,paragraphCache,semantics=app.uiHost?.semantics,sliderSemanticMeta=app.uiHost?.sliderSemanticMeta,viewport=()=>game.safe??game.screen,onError=console.error}={}){
  if(!game?.show)throw TypeError('A native Play host is required');
  const ownStack=!stack,layer=stack??createUiScreenStack({onError});
  const supported=name=>Object.hasOwn(nativeBuilders,name);let current=null,serial=0,disposed=false;
  const host={importSave(){
    if(typeof app.pickImportFile!=='function'){onError(new Error('Native save file picker is not connected'));return;}
    try{const result=app.pickImportFile();if(result?.then)void result.catch(onError);}catch(error){onError(error);}
  }};
  const clearRanges=entry=>{
    for(const item of entry?.ranges??[])item.control.dispose();
    if(entry){entry.ranges=[];entry.repeat=null;}
  };
  const destroy=entry=>{
    if(!entry)return;
    clearRanges(entry);
    const view=entry.view;entry.view=null;view?.dispose();
    for(const name of entry.rangeNames??[])sliderSemanticMeta?.delete(name);
    entry.rangeNames=[];
  };
  function mountRanges(entry,view,ranges){
    clearRanges(entry);if(!ranges.length)return;
    const input=game.browser?.pointer;if(!input)throw Error('Native range controls require the Play host pointer input');
    entry.ranges=ranges.map(range=>{
      const target=view.get(range.name),rect=view.rect(range.name);let dragging=false,changed=false;
      const control=createRangeControl({input,target,start:12,length:Math.max(1,rect.width-24),min:range.min,max:range.max,step:range.step,value:range.value,
        onDragChange(next){if(next){dragging=true;changed=false;view.focus(range.name);}else{dragging=false;if(changed)range.commit(range.value);changed=false;}},
        onChange(value){range.value=value;range.preview(value);if(dragging)changed=true;else range.commit(value);view.refresh();}});
      return {range,control};
    });
  }
  // The Play host intentionally owns keyboard transport (BrowserGame.keyboard
  // is disabled in Play). Use its one native key snapshot, only while the named
  // slider holds native focus. No document listener or second keyboard input.
  const KEY_STEPS={ArrowLeft:c=>c.stepBy(-1),ArrowDown:c=>c.stepBy(-1),ArrowRight:c=>c.stepBy(1),ArrowUp:c=>c.stepBy(1),
    PageDown:c=>c.stepBy(-10),PageUp:c=>c.stepBy(10),Home:c=>c.toMin(),End:c=>c.toMax()};
  function update(dt=1/60){
    const entry=current,view=entry?.view;
    const range=view?.visible&&entry.ranges?.find(item=>item.range.name===view.focused);
    if(!range||!game.keys){if(entry)entry.repeat=null;return;}
    const keys=game.keys,key=Object.keys(KEY_STEPS).find(code=>keys.pressed(code));
    if(key){KEY_STEPS[key](range.control);entry.repeat={key,range,wait:.4};return;}
    const repeat=entry.repeat;
    if(!repeat||repeat.range!==range||!keys.down(repeat.key)){entry.repeat=null;return;}
    if(repeat.key==='Home'||repeat.key==='End')return;
    repeat.wait-=Math.max(0,Math.min(.1,dt));if(repeat.wait<=0){KEY_STEPS[repeat.key](range.control);repeat.wait=.075;}
  }
  function retire(entry){
    if(!entry)return Promise.resolve();
    destroy(entry);
    return entry.definition?layer.close(entry.definition):Promise.resolve();
  }
  function paint(entry){
    if(disposed||current!==entry)return;
    const old=entry.view, priorFocus=old?.focused;let priorOffset=0;
    if(old)priorOffset=old.scroll('dialog-body').offset;
    const raw=viewport(),scale=game.uiScale??1;
    const built=buildDialog(entry.name,app,entry.args,()=>render(),{width:raw.width/scale,height:raw.height/scale},host);
    if(!built){close(true);return;}
    entry.blocking=built.blocking;
    destroy(entry);
    if(built.ranges.length&&!sliderSemanticMeta)throw Error('Native slider semantic metadata is not connected');
    entry.rangeNames=built.ranges.map(range=>range.name);
    for(const range of built.ranges)sliderSemanticMeta.set(range.name,range);
    const initial=built.initialFocus;
    entry.view=game.show(built.description,{state:app,bind:built.bind,paragraphCache,
      ...(initial?{initialFocus:initial}:{}),
      built:view=>{if(entry.view===view)mountRanges(entry,view,built.ranges);},
      ...(entry.blocking?{}:{dismiss:()=>{if(current===entry)(built.dismiss??close)();}})});
    mountRanges(entry,entry.view,built.ranges);
    if(priorOffset>0)entry.view.scroll('dialog-body').scrollTo(priorOffset);
    if(priorFocus&&built.bind[priorFocus]?.tap)entry.view.focus(priorFocus);
  }
  function render(){if(current?.view)paint(current);}
  function open(name,args={}){
    if(disposed||!supported(name))return false;
    const fresh=current?.name!==name;
    if(!fresh){current.args=args;render();return true;}
    const previous=current;
    const opener=previous?.opener??semantics?.publish().focused;
    const entry={name,args,opener,blocking:false,view:null,definition:null};
    current=entry;app.dialogOpen=true;
    void retire(previous).catch(onError);
    entry.definition={id:'nine-campaign-dialog-'+(++serial),layer:'modal',back:'none',open(){
      if(current!==entry||disposed)return {};
      paint(entry);
      // Attached Play binds desktop key transport to its actual canvas. A
      // semantic activation or an older foreground control may not have
      // transferred that browser focus yet. Do it once on opening the sheet.
      game.canvas?.focus({preventScroll:true});
      return {
        show:()=>entry.view?.show(),hide:()=>entry.view?.hide(),
        cover:()=>entry.view?.cover(),reveal:()=>entry.view?.reveal(),
        activate:()=>entry.view?.activate(),deactivate:()=>entry.view?.deactivate(),
        close:()=>destroy(entry)
      };
    }};
    void layer.open(entry.definition).catch(error=>{
      destroy(entry);
      if(current===entry){current=null;app.dialogOpen=false;app.afterDialog?.();}
      onError(error);
    });
    app.sound.play('open');return true;
  }
  function close(force=false){
    if(!current||(current.blocking&&!force))return false;
    const previous=current;current=null;app.dialogOpen=false;
    const finished=retire(previous);
    if(!disposed){app.sound.play('close');app.afterDialog?.();}
    // The stack reveals/reactivates its covered page asynchronously. Native
    // modal focus must be restored after that step, not while the opener is inert.
    void finished.then(()=>{
      if(!disposed&&!current&&previous.opener&&semantics){
        const visible=semantics.publish().nodes.find(n=>n.id===previous.opener&&!n.inert&&!n.hidden&&!n.disabled);
        if(visible)semantics.perform(visible.id,'focus');
      }
    }).catch(onError);
    return true;
  }
  function dispose(){if(disposed)return;disposed=true;const previous=current;current=null;void retire(previous).catch(onError);app.dialogOpen=false;if(ownStack)void layer.dispose?.();}
  return {supports:supported,open,close,render,resize:render,update,dispose,get name(){return current?.name??null;},get blocking(){return current?.blocking??false;},get view(){return current?.view??null;}};
}
