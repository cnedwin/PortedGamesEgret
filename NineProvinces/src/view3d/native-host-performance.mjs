// Optional measured presentation controls for the existing attached Play clock.
// No new RAF, clock, renderer, queue, GPU ownership or game-state mutation.
import {createFrameLog} from './frame-timing-probe.mjs';

/** Explicit option-off keeps immediate submission as the A/B control. */
export function createRealmPerformanceMode({defer3d=false,textBudget=false,measure=false,probe=measure?createFrameLog(4096):null,textBudgetWhen=()=>false}={}){
 let session=null,attachedView=null,closed=false;
 const isLive=view=>view&&!view.isDisposed;
 const safeMark=(name,value)=>{try{probe?.mark?.(name,value);}catch{/* observations cannot alter simulation/presentation */}};
 function admitView(){if(closed)return false;const view=session?.view;if(view===attachedView)return true;attachedView=isLive(view)?view:null;if(attachedView&&defer3d){
   // The public attached session may have drawn its first frame while its
   // Promise was pending. Start deferred mode only after this handle exists.
   // Do not issue a second draw during that initial immediate frame.
   attachedView.deferRender=true;
 }return false;}
 function afterFrame(){if(!defer3d||closed)return false;const same=admitView();if(!same||!isLive(attachedView)||attachedView.paused)return false;return attachedView.drawPending();}
 const playOptions={...(defer3d||probe?{afterFrame}:{}),...(probe?{onFrameTiming:probe.onPlay}:{}),...(textBudget?{textWorkBudgetMs:4,textWorkBudgetWhen:()=>!closed&&Boolean(textBudgetWhen())}:{})};
 // `deferRender` is intentionally omitted from the world constructor; the
 // borrowed view first participates in the native clock normally. `bind`
 // switches mode exactly once when play3dAttached has returned its session.
 const worldOptions=probe?{onFrameTiming:probe.onWorld}:{};
 function bind(next){if(closed)return;session=next;admitView();safeMark('attached.session',{defer3d,textBudget,hasView:Boolean(attachedView)});}
 function dispose(){closed=true;session=null;attachedView=null;}
 return {playOptions,worldOptions,bind,dispose,mark:safeMark,
   snapshot(game){const startup=game?.browser?.getStartupTiming?.();return {mode:{defer3d:Boolean(defer3d),textBudget:Boolean(textBudget),textBudgetActive:Boolean(textBudget&&!closed&&textBudgetWhen()),measured:Boolean(probe)},startup:startup??null,view:{attached:Boolean(isLive(attachedView)),deferred:Boolean(attachedView?.deferRender),paused:Boolean(attachedView?.paused)},frames:probe?.snapshot?.()??null};},clear(){probe?.clear?.();},get probe(){return probe}};
}

/** Context-level policy for *new* native Canvas text jobs. A queued label
 * keeps its original engine admission; title and modal jobs start immediately.
 * Selected city/army, coach, query, battle and lab are all excluded. */
export function campaignMarkerTextContext(app){return Boolean(app?.screen==='play'&&!app.dialogOpen&&!app.game?.asking&&!app.lab&&!app.battle&&!app.sel&&!app.coach?.view);}