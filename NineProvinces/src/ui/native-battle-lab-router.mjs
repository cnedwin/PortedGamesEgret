// Native battle-lab session coordinator. Called by the existing application;
// no independent render/simulation loop or browser event transport is created.
import {getLanguage,t} from '../i18n.mjs';
import {battleOutcomeReason} from './battle-copy.mjs';
import {openNativeBattleReplay} from './native-battle-replay.mjs';
import {createNativeBattlePlayground} from './battle-playground-native.mjs';
const w=(zh,en)=>getLanguage()==='en'?en:zh;
const C={ink:0x1b2b2a,panel:0x2a413e,paper:0xf3e7cd,gold:0xdeb577,edge:0x947d52,muted:0xb7c0ae};
const skin={panel:C.ink,panelAlpha:.98,text:C.paper,button:C.panel,buttonText:C.paper,disabled:0x53605e,accent:C.gold,track:0x40514d,radius:3,size:14,dim:.65};
const text=(name,value,height=25,props={})=>({type:'text',name,text:value,width:'fill',height,size:15,color:C.paper,...props});
const paragraph={fontFamilies:['Microsoft YaHei','Arial','sans-serif'],lineHeight:18,maxLines:3,density:2};
const row=(name,children,height=48)=>({type:'panel',name,layout:'row',width:'100%',height,gap:4,children});
export function buildNativeNanpiResult(done,{onReplay,onRetry,onExit}){
 const breach=done.tape.events.find(e=>e.kind==='gateOpen'),hold=done.tape.frames.at(-1).keepHeld,ours=done.report.sides[0],display=value=>Math.round(value).toLocaleString(getLanguage()==='zh'?'zh-CN':'en');
 const bind={};const button=(id,title,tap)=>{bind[id]={tap};return {type:'button',name:id,text:title,width:'fill',height:48,size:14,color:id==='nanpi-replay'?0x805d36:C.panel};};
 const stats=[[w('破门用时','Gate breached at'),breach?display(breach.t)+w(' 秒',' s'):w('未破门','Gate held')],[w('本营控制','Keep held'),Math.min(10,hold).toFixed(1)+' / 10 '+w('秒','s')],[w('我军余部','Your survivors'),display(ours.remaining)],[w('我军减员','Your losses'),display(ours.losses)]];
 const entries=stats.map(([label,value],i)=>({type:'panel',layout:'column',name:'nanpi-stat-'+i,width:'fill',height:46,gap:0,color:C.panel,padding:3,children:[text('nanpi-stat-label-'+i,label,17,{color:C.muted,size:11,align:'center'}),text('nanpi-stat-value-'+i,value,23,{color:C.gold,size:17,bold:true,align:'center'})]}));
 const footer=[button('nanpi-replay',w('关键时刻回放','Replay key moments'),onReplay),button('nanpi-retry',w('再战南皮','Try Nanpi again'),onRetry),button('nanpi-return',w('回到标题','Return to title'),onExit)];
 const content=[text('nanpi-kicker',w('夕照南皮 · 演武战果','NANPI AT SUNSET · TRIAL RESULTS'),22,{color:C.gold,size:13,align:'center'}),text('nanpi-result-title',done.result.winner===0?t('victory'):t('defeat'),40,{color:C.gold,size:29,bold:true,align:'center'}),text('nanpi-result-reason',battleOutcomeReason(done.result,0,getLanguage()),56,{paragraph,align:'center',color:C.paper,size:14}),row('nanpi-stats-1',entries.slice(0,2),46),row('nanpi-stats-2',entries.slice(2),46),text('nanpi-readonly',w('独立演武 · 不写入战役存档','Standalone trial · Campaign saves are unaffected'),24,{align:'center',color:C.muted,size:11}),row('nanpi-actions',footer)];
 const wide={type:'panel',name:'nanpi-result',layout:'column',card:true,width:'86%',height:'96%',anchor:'center',padding:8,gap:3,children:[...content.slice(0,-1),content.at(-1)]};
 // A scrollable native result keeps the full statistics on the short outer
 // display while action buttons remain fixed and do not fall under the safe edge.
 const scrollRoot={...wide,children:[{type:'panel',name:'nanpi-detail',layout:'column',width:'fill',height:'fill',gap:3,scroll:'vertical',children:content.slice(0,-1)},content.at(-1)]};
 return {description:{label:w('夕照南皮战果','Nanpi trial results'),modal:true,skin,root:scrollRoot},bind};
}
export function createNativeNanpiResult(host,done,actions){const {game,paragraphCache}=host;let closed=false;const spec=buildNativeNanpiResult(done,actions),view=game.show(spec.description,{bind:spec.bind,paragraphCache,gamepad:true,initialFocus:'nanpi-replay'});return {view,show(){if(!closed){view.show();view.focus('nanpi-replay')}},hide(){if(!closed)view.hide()},destroy(){if(closed)return;closed=true;view.close()}};}
export function createNativeBattleLabRouter(app,{openSandbox=createNativeBattlePlayground,openReplay=openNativeBattleReplay,onError=console.error}={}){
 let loading=false;const current=()=>app.lab?.controller??null;
 function open(tape=null,{trial=false,trialView=null,tab='replay',playerSide=trial?0:null,validate=()=>true}={}){
  if(app.lab||loading||!validate())return false;loading=true;if(tape&&playerSide===null){const side=tape.setup.factions?.indexOf(app.state?.player);if(side>=0)playerSide=side;}const screen=app.screen,state=app.state,nativeTitle=app.nativeTitle?.view,nativeDialog=app.dialogs?.view,nativeFocus=nativeTitle?.focused,dialogFocus=nativeDialog?.focused,trialFocus=trialView?.view?.focused;let active;
  function restore(){app.map.setVisible(true);if(app.screen!==screen||app.state!==state)return;nativeTitle?.show();if(nativeFocus)try{nativeTitle?.focus(nativeFocus)}catch{}nativeDialog?.show();if(dialogFocus)try{nativeDialog?.focus(dialogFocus)}catch{}trialView?.show();if(trialFocus)try{trialView?.view?.focus(trialFocus)}catch{}app.hud.refresh(true);app.sound.theme(trial?'battle':screen==='title'?'title':'realm');}
  function close(){if(!active||app.lab!==active)return;app.lab=null;active.controller?.destroy();restore();}
  try{active={controller:null,close};app.lab=active;nativeTitle?.hide();nativeDialog?.hide();trialView?.hide();app.hud.refresh(true);app.map.setVisible(false);
    // The retained 3D map's visibility flag also disables its native Play
    // parent. Keep the single Play overlay active for this replacement page;
    // map gestures see the map visibility flag false and cannot select land.
    app.uiHost.setInputEnabled(true);app.sound.theme('battle');active.controller=tape?openReplay(app.uiHost,tape,{onExit:close,tab,playerSide,onError}):openSandbox(app,{onExit:close,onError});return true;
  }catch(error){close();onError(error);return false;}finally{loading=false;}
 }
 return {open,close(){app.lab?.close?.()},update(dt){current()?.update?.(dt)},key(code){return current()?.key?.(code)??false},get loading(){return loading},get active(){return Boolean(app.lab)}};
}