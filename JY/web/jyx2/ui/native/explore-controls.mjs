// Native travel controls. The application remains the sole owner of movement,
// commands, interaction outcomes and the currently active gameplay state.
import { createActionControl } from '@egret/engine/ui';
import { palette as C,skin } from './theme.mjs';

const DIRECTIONS=Object.freeze({up:'ArrowUp',left:'ArrowLeft',right:'ArrowRight',down:'ArrowDown'});
const SYMBOLS=Object.freeze({up:'▲',left:'◀',right:'▶',down:'▼'});
const COPY={en:{up:'Move up',down:'Move down',left:'Move left',right:'Move right',talk:'Talk',continue:'Continue',
  bag:'Bag',menu:'Menu',exit:'Go to exit',history:'Review dialogue',skip:'Skip read dialogue',title:'Travel controls'},
zh:{up:'向上移動',down:'向下移動',left:'向左移動',right:'向右移動',talk:'對話',continue:'繼續',
  bag:'行囊',menu:'選單',exit:'前往出口',history:'對話回看',skip:'跳過已讀',title:'探索操作'}};
const F='fill';
const panel=(children,extra={})=>({type:'panel',width:F,height:F,children,...extra});
const col=(children,extra={})=>panel(children,{layout:'column',gap:5,...extra});

export function exploreControlDescription(L=COPY.zh){
  function layout(upright,tablet){
    // The live game uses 640×360 / 360×640 rather than the title's larger
    // design. At 325 CSS px tall, 56 stage units are still about 50 CSS px.
    const target=upright?64:56,gap=4,step=target+gap;
    const row=(children,extra={})=>panel(children,{layout:'row',height:target,gap,...extra});
    const action=(name,text,extra={})=>({type:'button',name,text,width:F,height:target,color:C.jade,textColor:C.cream,size:17,...extra});
    const spacer=()=>({type:'space',width:F,height:target});
    const direction=word=>action('explore-move-'+word,SYMBOLS[word],{size:24});
    const dpad=col([
      row([spacer(),direction('up'),spacer()]),
      row([direction('left'),spacer(),direction('right')]),
      row([spacer(),direction('down'),spacer()])
    ],{name:'explore-dpad',anchor:'bottom-left',x:6,y:88,width:upright?'47%':tablet?188:176,height:3*step-gap,gap});
    // Two core rows and one optional exit row. Review/skip use the same
    // bottom row as Bag/Menu, never reserve an extra invisible row.
    const operations=panel([
      row([action('explore-history',L.history,{size:12}),action('explore-skip',L.skip,{size:12})],{name:'explore-reading',anchor:'bottom',y:0}),
      row([action('explore-exit',L.exit,{color:C.jadeActive})],{name:'explore-exit-row',anchor:'bottom',y:2*step}),
      row([action('explore-talk',L.talk,{color:C.red})],{anchor:'bottom',y:step}),
      row([action('explore-bag',L.bag),action('explore-menu',L.menu)],{name:'explore-bag-menu',anchor:'bottom',y:0})
    ],{name:'explore-actions',anchor:'bottom-right',x:6,y:88,width:upright?'46%':tablet?230:210,height:3*step-gap});
    return panel([dpad,operations]);
  }
  return {label:L.title,area:'safe',skin,root:layout(false,false),portrait:layout(true,false),
    tablet:layout(false,true),tabletPortrait:layout(true,true)};
}

// A directional contact owns exactly one legacy cardinal movement until its
// terminal event. Other independent fingers still reach actions, but a second
// direction cannot steal or prematurely release the first one.
export function createMoveOwnership({onDown,onUp}={}){
  if(typeof onDown!=='function'||typeof onUp!=='function')throw new TypeError('Movement callbacks required');
  let held;
  function press(code,source='pointer'){
    if(held!==undefined)return false;
    held=code;onDown(code,source);return true;
  }
  function release(code,reason='release'){
    if(held!==code)return false;
    held=undefined;onUp(code,reason);return true;
  }
  return {press,release,pulse(code,source){if(!press(code,source))return false;release(code);return true;},
    clear(reason='cancel'){return held!==undefined&&release(held,reason)},get held(){return held;}};
}

export function createExploreControls({game,signal=game?.scope.signal,language=()=> 'zh',readState,
  onMoveDown,onMoveUp,onCommand,onExit,onHistory,onSkipRead}={}){
  if(!game?.show||typeof readState!=='function'||typeof onCommand!=='function')throw new TypeError('Explore controls need native game and callbacks');
  const ownership=createMoveOwnership({onDown:onMoveDown,onUp:onMoveUp});
  let disposed=false,view,controls=[],lastEnabled,activeLanguage=language();
  const L=()=>COPY[language()==='en'?'en':'zh'];
  const state=()=>readState()??{};
  const shown=()=>!disposed&&state().visible!==false;
  const moving=()=>shown()&&Boolean(state().canMove)&&state().showMovement!==false;
  const actions=()=>shown()&&state().showActions!==false;
  const commandsAllowed=()=>actions()&&state().commandsEnabled!==false;
  const optional=key=>()=>actions()&&Boolean(state()[key]);
  const readingTools=()=>optional('showHistory')()||optional('showSkipRead')();
  function clearHeld(reason='cancel'){
    ownership.clear(reason);
    for(const c of controls)c.setEnabled(false);
    lastEnabled=false;
  }
  function retireControls(){
    clearHeld('layout');
    for(const c of controls)c.dispose();
    controls=[];
  }
  function sync(){
    if(disposed)return;
    const enabled=moving();
    if(enabled!==lastEnabled){
      if(!enabled)ownership.clear('covered');
      for(const c of controls)c.setEnabled(enabled);
      lastEnabled=enabled;
    }
  }
  function refresh(){
    if(disposed)return;
    if(activeLanguage!==language()){
      activeLanguage=language();retireControls();view?.close();view=buildView();
    }
    sync();view?.refresh();game.invalidate();
  }
  function run(callback,...args){
    if(disposed)return;
    callback?.(...args);
    // An action can synchronously enter a modal or change scenes. Clear held
    // motion before the next pointer callback, rather than leaving latent input.
    if(!disposed)refresh();
  }
  function built(v){
    retireControls();
    const input=game.browser.pointer;
    if(input){
      for(const [word,code] of Object.entries(DIRECTIONS)){
        const control=createActionControl({input,target:v.get('explore-move-'+word),
          onPressChange(pressed){
            if(pressed){if(moving())ownership.press(code,'pointer');}
            else ownership.release(code);
            if(!disposed)game.invalidate();
          }});
        controls.push(control);
      }
    }
    lastEnabled=undefined;sync();
  }
  const directionBindings=Object.fromEntries(Object.entries(DIRECTIONS).map(([word,code])=>['explore-move-'+word,{
    label:()=>L()[word],disabled:()=>!moving(),
    color:()=>ownership.held===code?C.jadeActive:C.jade,
    tap:(_,activation)=>{
      if(!moving())return;
      // Pointer ownership is the action control's press/release above. Named
      // semantic and keyboard activation executes the same one-step command.
      if(activation?.source==='semantic'||activation?.source==='keyboard'||activation?.source==='gamepad'||!game.browser.pointer)
        ownership.pulse(code,activation?.source??'semantic');
      else if(commandsAllowed())view?.focus('explore-talk');
      refresh();
    }}]));
  function buildView(){return game.show(exploreControlDescription(L()),{built,bind:{...directionBindings,
    'explore-dpad':{visible:moving},'explore-actions':{visible:actions},
    'explore-reading':{visible:readingTools},'explore-bag-menu':{visible:()=>!readingTools()},
    'explore-history':{visible:optional('showHistory'),text:()=>L().history,label:()=>L().history,
      disabled:()=>!onHistory||!optional('showHistory')(),tap:()=>run(onHistory)},
    'explore-skip':{visible:optional('showSkipRead'),text:()=>L().skip,label:()=>L().skip,
      disabled:()=>!onSkipRead||!optional('showSkipRead')(),tap:()=>run(onSkipRead)},
    'explore-exit-row':{visible:optional('showExit')},'explore-exit':{text:()=>L().exit,label:()=>L().exit,
      disabled:()=>!onExit||!optional('showExit')(),tap:()=>run(onExit)},
    'explore-talk':{text:()=>state().reading?L().continue:L().talk,label:()=>state().reading?L().continue:L().talk,
      disabled:()=>!commandsAllowed()||state().canInteract===false,tap:()=>run(onCommand,'Enter')},
    'explore-bag':{text:()=>L().bag,label:()=>L().bag,disabled:()=>!commandsAllowed()||state().reading,
      tap:()=>run(onCommand,'KeyB')},
    'explore-menu':{text:()=>L().menu,label:()=>L().menu,disabled:()=>!commandsAllowed()||state().reading,
      tap:()=>run(onCommand,'Escape')}
  }});}
  view=buildView();
  function dispose(){
    if(disposed)return;disposed=true;signal?.removeEventListener('abort',dispose);
    retireControls();view.close();
  }
  signal?.addEventListener('abort',dispose,{once:true});
  if(signal?.aborted)dispose();
  return {refresh,sync,clearHeld,dispose,get held(){return ownership.held},get view(){return view}};
}
