// Native presentation-only turn HUD. The host supplies available commands,
// previews, resources, target/actor records and all actual gameplay operations.
import {createUiScreenStack} from '@egret/engine/ui';
import {palette as C,skin,metrics} from './theme.mjs';

const COPY={
  en:{
    preparing:'Preparing',round:'Round',otherSide:'Opponent turn',automatic:'Automatic turn',animating:'Action in progress',
    choose:'Choose a command',range:'Move up to {n} tiles',health:'Health',energy:'Energy',target:'Target',
    invalid:'Invalid selection',highlight:'Choose a highlighted location',empty:'No target in range',resources:'Stamina',
    first:'First action',used:'Use 1',have:'In stock',repeat:'Repeat {n} times',unknown:'—',ready:'Ready',
    up:'Cursor up',left:'Cursor left',down:'Cursor down',right:'Cursor right',
    previous:'Previous skill',next:'Next skill',move:'Move',skill:'Skill',confirm:'Confirm',items:'Items',support:'Support',
    inspect:'Inspect',rest:'Rest',auto:'Auto',more:'More',less:'Back to commands',lessShort:'Less',restart:'Restart',retreat:'Retreat',
    cancel:'Cancel',selected:'Selected',confirmRestart:'Restart this encounter?',confirmRetreat:'Confirm retreat?',
    promptDetail:'Confirm or return to the current encounter.',continue:'Continue',victory:'Victory',defeat:'Defeat',
    commandNames:{KeyM:'Choose movement',KeyI:'Choose skill',Enter:'Confirm preview',KeyB:'Items and supplies',
      KeyT:'Support actions',KeyV:'Inspect participant',KeyL:'Rest',Tab:'Automatic play',KeyR:'Restart encounter'},
    selection:{move:'Choose destination',magic:'Choose skill location',poison:'Choose effect target',detox:'Choose recovery target',
      medicine:'Choose recovery target',dart:'Choose item target',status:'Choose participant'},
    preview:{move:'Destination preview',magic:'Skill preview',poison:'Effect preview',detox:'Recovery preview',
      medicine:'Recovery preview',dart:'Item target',status:'Inspect participant'},
    action:{attack:'Acting',move:'Moving',dead:'Down'}
  },
  zh:{
    preparing:'準備中',round:'第 {n} 輪',otherSide:'對方行動',automatic:'自動行動',animating:'行動演出',
    choose:'選擇指令',range:'可移動 {n} 格',health:'生命',energy:'內力',target:'目標',
    invalid:'此處不可選',highlight:'請選擇高亮位置',empty:'範圍內無目標',resources:'體力',
    first:'首擊',used:'使用 1 件',have:'持有',repeat:'連續 {n} 次',unknown:'—',ready:'準備',
    up:'游標上移',left:'游標左移',down:'游標下移',right:'游標右移',
    previous:'上一項武學',next:'下一項武學',move:'移動',skill:'武學',confirm:'確定',items:'道具',support:'支援',
    inspect:'察看',rest:'休息',auto:'自動',more:'更多',less:'返回指令',lessShort:'收起',restart:'重開',retreat:'認輸',
    cancel:'取消',selected:'已選擇',confirmRestart:'重開這場戰鬥？',confirmRetreat:'確認認輸？',
    promptDetail:'確認操作，或返回目前戰鬥。',continue:'繼續',victory:'勝利',defeat:'戰敗',
    commandNames:{KeyM:'選擇移動',KeyI:'選擇武學',Enter:'確定落點',KeyB:'藥品及道具',
      KeyT:'支援行動',KeyV:'察看人物',KeyL:'休息',Tab:'自動戰鬥',KeyR:'重開戰鬥'},
    selection:{move:'選擇移動格',magic:'選擇武學落點',poison:'選擇效果對象',detox:'選擇解毒對象',
      medicine:'選擇醫療對象',dart:'選擇道具目標',status:'選擇查看對象'},
    preview:{move:'移動落點',magic:'武學落點',poison:'效果預覽',detox:'解毒預覽',
      medicine:'醫療預覽',dart:'道具目標',status:'察看對象'},
    action:{attack:'出招中',move:'移動中',dead:'倒下'}
  }
};
export function battleWords(language='zh',overrides={}){
  const base=COPY[language==='en'?'en':'zh'];
  return {...base,...overrides,selection:{...base.selection,...overrides.selection},
    preview:{...base.preview,...overrides.preview},action:{...base.action,...overrides.action},
    commandNames:{...base.commandNames,...overrides.commandNames},language:language==='en'?'en':'zh'};
}
const string=value=>value===undefined||value===null?'':String(value);
const insert=(template,n)=>template.replace('{n}',String(n));
const round=(n,W)=>W.language==='en'?W.round+' '+n:insert(W.round,n);
const ratio=(value,maximum)=>Number.isFinite(value)&&Number.isFinite(maximum)&&maximum>0?Math.min(1,Math.max(0,value/maximum)):0;
const meterText=(label,value,maximum)=>label+' '+string(value??0)+'/'+string(maximum??0);
const directions=['KeyW','KeyA','KeyS','KeyD'];
const allCommands=[...directions,'KeyQ','KeyF','KeyM','KeyI','Enter','KeyB','KeyT','KeyV','KeyL','Tab','KeyR','Escape'];
const shorten=(value,max)=>{
  let width=0,out='';
  for(const ch of string(value)){
    const cost=/[\x20-\x7e]/u.test(ch)?0.54:1;
    if(width+cost>max)return out.trimEnd()+'…';
    width+=cost;out+=ch;
  }
  return out;
};
function readoutLines(value,max=18){
  const parts=string(value).split(' · ').filter(Boolean);
  if(!parts.length)return ['',''];
  let first='',second='';
  const fits=text=>shorten(text,max)===text;
  for(const part of parts){
    const next=first?first+' · '+part:part;
    if(!second&&fits(next))first=next;
    else second=second?second+' · '+part:part;
  }
  if(!first){first=shorten(second,max);second=''}
  return [first,shorten(second,max)];
}
function currentTurn(state,selection,W){
  if(!state.turn)return W.preparing;
  const title=round(state.round??0,W)+' · ';
  if(state.turn.side!==0)return title+W.otherSide;
  if(state.auto)return title+W.automatic;
  if(!state.canAct)return title+W.animating;
  return title+(W.selection[selection]??(state.turn.moved?W.choose:insert(W.range,state.moveRange??0)));
}
function targetReadout(state,actor,selection,preview,invalid,W){
  const base={visible:false,showMeter:false,title:'',detail:'',vitals:'',full:'',vitalRatio:0,tone:'active'};
  const target=state.target!==actor&&!state.target?.dead?state.target:undefined;
  if(!selection&&!target&&!invalid)return base;
  if(invalid)return {...base,visible:true,title:W.invalid,vitals:W.highlight,tone:'warning'};
  if(preview){
    const targets=Array.isArray(preview.targets)?preview.targets:[],names=targets.map(target=>string(target.name)).filter(Boolean);
    const n=targets.length;
    const detail=Array.isArray(preview.path)?preview.path.length+' / '+string(state.moveRange??0)+(W.language==='en'?' tiles':' 格'):
      n>1?n+(W.language==='en'?' targets · ':' 人 · ')+names.slice(0,2).join(' · ')+(n>2?'…':''):names[0]||W.empty;
    const costs=[];
    if(preview.mp!==undefined)costs.push((preview.strikes>1?W.first+' ':'')+W.energy+' '+string(preview.mp));
    if(preview.stamina!==undefined)costs.push(W.resources+' '+string(preview.stamina*(preview.strikes??1)));
    if(preview.stock!==undefined)costs.push(W.used+' · '+W.have+' '+string(preview.stock));
    if(preview.strikes>1)costs.push(insert(W.repeat,preview.strikes));
    if(preview.type==='status'&&targets[0])costs.push(meterText(W.health,targets[0].hp,targets[0].maxHp));
    return {...base,visible:true,title:string(preview.name)||W.preview[preview.type]||W.choose,detail,
      vitals:costs.join(' · '),full:names.join(' · '),tone:Array.isArray(preview.path)||n?'ready':'warning'};
  }
  if(selection)return {...base,visible:true,title:W.preview[selection]??W.choose,vitals:W.highlight};
  if(target)return {...base,visible:true,showMeter:true,title:W.target+' '+string(target.name),
    detail:W.action[target.action]??'',vitals:meterText(W.health,target.hp,target.maxHp),
    vitalRatio:ratio(target.hp,target.maxHp),tone:target.side!==0?'warning':'active'};
  return base;
}
export function projectBattleUi({state,actions=[],preview,context={}}={},W=battleWords()){
  if(!state||state.result!==null&&state.result!==undefined)return {phase:'hidden'};
  const prompt=context.prompt;
  if(prompt==='restart'||prompt==='surrender')return {phase:'confirm',prompt,
    title:prompt==='restart'?W.confirmRestart:W.confirmRetreat,detail:W.promptDetail,
    accept:prompt==='restart'?W.restart:W.retreat};
  if(prompt||state.pendingResult!==null&&state.pendingResult!==undefined)return {phase:'hidden'};
  const selection=state.selection?.type??(context.mode==='attack'?'magic':context.mode);
  const canAct=Boolean(state.canAct&&!state.auto);
  const actor=state.turn??state.controlled??state.player??{};
  const available=new Set(canAct&&Array.isArray(actions)?actions:[]);
  const enabled={
    KeyM:available.has('move'),KeyI:available.has('magic'),Enter:canAct&&Boolean(preview),
    KeyB:available.has('drug')||available.has('dart'),
    KeyT:['medicine','detox','poison'].some(key=>available.has(key)),
    KeyV:available.has('status'),KeyL:available.has('rest'),
    KeyQ:canAct&&(actor.learnedMagics?.length??0)>1,KeyF:canAct&&(actor.learnedMagics?.length??0)>1,
    Tab:true,KeyR:true,Escape:true
  };
  for(const code of directions)enabled[code]=canAct&&Boolean(selection||available.has('move'));
  const captions={KeyW:'↑',KeyA:'←',KeyS:'↓',KeyD:'→',KeyQ:'‹',KeyF:'›',
    KeyM:W.move,KeyI:W.skill,Enter:W.confirm,KeyB:W.items,KeyT:W.support,
    KeyV:W.inspect,KeyL:W.rest,Tab:W.auto,KeyR:W.restart,Escape:selection?W.cancel:W.retreat};
  const names={...W.commandNames,KeyW:W.up,KeyA:W.left,KeyS:W.down,KeyD:W.right,KeyQ:W.previous,KeyF:W.next,
    Escape:selection?W.cancel:W.retreat};
  const commands=Object.fromEntries(allCommands.map(code=>{
    const pressed=code==='Tab'?Boolean(state.auto):code==='KeyM'?selection==='move':code==='KeyI'?selection==='magic':false;
    return [code,{enabled:Boolean(enabled[code]),pressed,text:captions[code],label:names[code]??captions[code]}];
  }));
  return {
    phase:'active',selection:selection??'',commands,auto:Boolean(state.auto),canAct,
    metadata:{title:string(context.title),status:string(context.status),hint:string(context.hint)},
    actor:{name:string(actor.name)||W.unknown,turn:currentTurn(state,selection,W),
      tone:actor.side!==0?'warning':state.canAct?'ready':'active',
      hpText:meterText(W.health,actor.hp,actor.maxHp),mpText:meterText(W.energy,actor.mp,actor.maxMp),
      hpRatio:ratio(actor.hp,actor.maxHp),mpRatio:ratio(actor.mp,actor.maxMp)},
    target:targetReadout(state,actor,selection,preview,Boolean(context.invalid),W),
    skill:string(state.activeMagicName)||W.unknown
  };
}

const F='fill',B=metrics.target,COMPACT=56,SPACE=4;
const panel=(children,opts={})=>({type:'panel',width:F,height:F,children,...opts});
const row=(children,opts={})=>panel(children,{layout:'row',height:B,gap:SPACE,align:'stretch',...opts});
const col=(children,opts={})=>panel(children,{layout:'column',gap:SPACE,align:'stretch',...opts});
const text=(name,value,opts={})=>({type:'text',name,text:value,width:F,height:24,size:16,color:C.cream,align:'left',...opts});
const button=(name,value,opts={})=>({type:'button',name,text:value,width:F,height:B,color:C.jade,textColor:C.cream,size:18,...opts});
const card=(children,opts={})=>col(children,{card:true,color:C.deep,alpha:.96,padding:7,gap:3,border:{color:C.line,width:1},...opts});
const spacer=width=>({type:'space',width,height:B});
function commandButton(code,W,opts={}){
  const buttons={KeyW:'↑',KeyA:'←',KeyS:'↓',KeyD:'→',KeyQ:'‹',KeyF:'›',KeyM:W.move,KeyI:W.skill,
    Enter:W.confirm,KeyB:W.items,KeyT:W.support,KeyV:W.inspect,KeyL:W.rest,KeyR:W.restart,Escape:W.retreat};
  return button(code,buttons[code],{...opts});
}
function actorCard(W,width,compact){
  const meter=(key,words,color)=>row([
    text(key+'-text',words,{width:'58%',height:compact?23:25,size:15}),
    {type:'bar',name:key+'-bar',value:0,label:words,width:F,height:10,color}
  ],{height:compact?23:25,align:'center'});
  return card([
    text('actor-name',W.unknown,{height:compact?21:23,size:21,bold:true,color:C.gold}),
    text('turn-state',W.preparing,{height:compact?18:21,size:15,color:C.muted}),
    meter('hp',W.health,C.red),meter('mp',W.energy,C.jadeActive)
  ],{name:'actor-card',anchor:'top-left',x:compact?4:8,y:compact?4:8,width,height:compact?112:120});
}
function targetCard(W,width,compact){
  return card([
    text('target-name',W.target,{height:compact?22:25,size:20,bold:true,color:C.gold}),
    text('target-detail','',{height:22,size:15}),
    text('target-vitals','',{height:19,size:15,color:C.muted}),
    text('target-vitals-secondary','',{height:19,size:15,color:C.muted}),
    {type:'bar',name:'target-bar',label:W.health,value:0,color:C.red,width:F,height:8}
  ],{name:'target-card',label:W.target,anchor:'top-right',x:compact?4:8,y:compact?4:8,width,
    padding:compact?6:7,gap:compact?2:3,height:compact?112:120,visible:false});
}
function dpad(W,upright,compact,narrow){
  if(compact){
    // The expanded short-screen host keeps UI scale >= 1; a single row
    // preserves a clear space between cards and controls at 325 CSS px.
    return row(['KeyA','KeyW','KeyS','KeyD'].map(code=>commandButton(code,W,{width:COMPACT,height:COMPACT,size:25})),
      {name:'battle-dpad',label:W.move,width:COMPACT*4+SPACE*3,height:COMPACT,anchor:'bottom-left',x:4,y:COMPACT+8});
  }
  const arrow=code=>commandButton(code,W,{width:B,size:26});
  const rows=narrow?[row([arrow('KeyW'),arrow('KeyD')]),row([arrow('KeyA'),arrow('KeyS')])]:[
    row([spacer(B),arrow('KeyW'),spacer(B)]),row([arrow('KeyA'),arrow('KeyS'),arrow('KeyD')])];
  return col(rows,{name:'battle-dpad',label:W.move,width:narrow?B*2+SPACE:B*3+SPACE*2,height:B*2+SPACE,anchor:'bottom-left',
    x:compact?4:8,y:compact?B+8:upright?B*2+SPACE+12:8});
}
function skillStrip(W,upright,compact){
  return card([
    text('skill-name',W.unknown,{height:compact?22:27,size:18,color:C.gold,bold:true,align:'center'}),
    row([commandButton('KeyQ',W,{size:28,height:compact?COMPACT:B}),commandButton('KeyF',W,{size:28,height:compact?COMPACT:B})],{height:compact?COMPACT:B})
  ],{name:'skill-strip',label:W.skill,width:compact?220:upright?'46%':220,height:compact?90:117,padding:4,gap:4,
    anchor:compact?'bottom-left':upright?'bottom-right':'bottom-left',
    x:compact?4:upright?8:B*3+SPACE*2+16,y:compact?COMPACT+8:upright?B*2+SPACE+12:8,visible:!compact});
}
function actionRail(W,upright,compact){
  const controlHeight=compact?COMPACT:B;
  const auto=panel([{type:'toggle',name:'Tab',text:W.auto,width:F,height:controlHeight,checked:false,size:16}],{
    name:'auto-background',label:W.auto,layout:'row',width:F,height:controlHeight,padding:0,gap:0,align:'stretch',
    card:true,color:C.deep,alpha:.96,border:{color:C.line,width:1}
  });
  const more=button('more',W.more,{color:C.card,size:16,height:compact?COMPACT:B});
  // A fixed 16:9 map cannot spare two permanent rows across its entire lower
  // half on a phone. Leave a single rail and expose the secondary actions
  // using the existing More affordance; the host command set is unchanged.
  if(compact)return row([
    ...['KeyM','KeyI','Enter','KeyB'].map(code=>commandButton(code,W,{size:16,height:COMPACT,...(code==='Enter'?{color:C.red}:{})})),
    auto,more
  ],{name:'command-rail',label:W.choose,anchor:'bottom',y:4,width:'98%',height:COMPACT,gap:SPACE});
  return col([
    row(['KeyM','KeyI','Enter','KeyB','KeyT'].map(code=>commandButton(code,W,{size:16,
      ...(code==='Enter'?{color:C.red}:{})}))),
    row([commandButton('KeyV',W),commandButton('KeyL',W),auto,more])
  ],{name:'command-rail',label:W.choose,anchor:compact?'bottom-right':upright?'bottom':'bottom-right',
    x:compact?4:upright?0:8,y:compact?4:8,
    width:compact?390:upright?'96%':460,height:B*2+SPACE,gap:SPACE});
}
function extraRail(W,upright,compact){
  const children=[
    ...(compact?['KeyT','KeyV','KeyL'].map(code=>commandButton(code,W,{size:15,height:COMPACT})):[]),
    commandButton('KeyR',W,{color:C.card,height:compact?COMPACT:B}),commandButton('Escape',W,{color:C.redDim,height:compact?COMPACT:B})
  ];
  return row(children,{name:'extra-rail',label:W.more,visible:false,anchor:compact?'bottom-right':upright?'bottom':'bottom-right',
    x:compact?4:upright?0:8,y:compact?COMPACT+8:B*2+SPACE+12,width:compact?390:upright?'96%':460,height:compact?COMPACT:B});
}
function contextCard(upright,compact){
  return card([
    text('encounter-title','',{height:17,size:15,color:C.gold,bold:true}),
    text('encounter-status','',{height:17,size:15}),
    text('encounter-hint','',{height:17,size:14,color:C.muted})
  ],{name:'encounter-context',anchor:compact?'bottom-right':'top',
    x:compact?4:0,y:compact?COMPACT+8+29:upright?130:8,
    width:compact?390:upright?'96%':'31%',height:65,padding:4,gap:2,visible:false});
}
export function buildBattleHud(W=battleWords(),{compact=false}={}){
  const build=(upright,useCompact,narrow=false)=>panel([
    actorCard(W,useCompact?'35%':upright?'46%':274,useCompact),targetCard(W,useCompact?'35%':upright?'46%':274,useCompact),
    contextCard(upright,useCompact),dpad(W,upright,useCompact,narrow),skillStrip(W,upright,useCompact),
    actionRail(W,upright,useCompact),extraRail(W,upright,useCompact),
    text('compact-skill-name',W.unknown,{anchor:'bottom-right',x:4,y:COMPACT+8,width:390,height:25,
      color:C.gold,size:17,bold:true,visible:useCompact})
  ]);
  return {label:W.choose,area:'safe',skin,root:build(false,compact),portrait:build(true,false,true),
    tablet:build(false,compact),tabletPortrait:build(true,false,false)};
}
export function buildBattlePrompt(W=battleWords()){
  const build=wide=>card([
    text('prompt-title',W.confirmRestart,{height:42,size:25,bold:true,color:C.gold}),
    text('prompt-detail',W.promptDetail,{height:42,size:18,color:C.muted}),
    row([button('confirm-back',W.cancel,{color:C.card}),button('confirm-accept',W.confirm,{color:C.red})])
  ],{anchor:'center',width:wide?600:'94%',height:202,padding:12,gap:8});
  return {label:W.confirm,area:'safe',skin,modal:true,root:build(false),portrait:build(false),tablet:build(true),tabletPortrait:build(false)};
}

const toneColor=tone=>tone==='warning'?0xd68164:tone==='ready'?C.gold:C.muted;
export function createBattleControls(game,{
  signal,getState=()=>undefined,getModel=()=>undefined,getPreview=()=>undefined,getContext=()=>({}),press,
  language=()=> 'zh',labels:overrides,isMenuActive=()=>false,restoreFocus=()=>{},claimGameplayKeys=true,
  stack:injectedStack,onError=()=>{},layout='auto'
}={}){
  if(typeof press!=='function')throw new TypeError('command callback required');
  const words=()=>battleWords(typeof language==='function'?language():language,typeof overrides==='function'?overrides():overrides);
  const stack=injectedStack??createUiScreenStack({onError});
  let model={phase:'hidden'},lastSignature='',moreOpen=false,hud,confirm,disposed=false;
  const report=error=>{try{onError(error)}catch{/* Diagnostic callback is optional. */}};
  const uiEligible=()=>model.phase==='active'&&!isMenuActive()&&!disposed;
  const claims=claimGameplayKeys&&game.keys?.claim?['Tab','Enter','Space'].map(code=>game.keys.claim(code,uiEligible)):[];
  const refresh=()=>{hud?.refresh();confirm?.refresh();game.invalidate?.()};
  function emit(code){
    if(disposed||isMenuActive())return false;
    if(model.phase==='active'){
      if(!model.commands[code]?.enabled)return false;
      moreOpen=false;refresh();
    }else if(model.phase==='confirm'){
      if(code!=='Enter'&&code!=='Escape')return false;
    }else return false;
    try{restoreFocus()}catch(error){report(error)}
    try{press(code)}catch(error){report(error);return false}
    update();return true;
  }
  const promptScreen={
    id:'native-battle-confirm',layer:'modal',back:'none',
    open(){
      const W=words();
      confirm=game.show(buildBattlePrompt(W),{
        // Preserve the host's existing Enter-to-confirm and Escape-to-cancel
        // contract; a native focused Confirm button answers the same action.
        state:()=>model,gamepad:true,initialFocus:'confirm-accept',
        dismiss:()=>emit('Escape'),bind:{
          'prompt-title':{text:()=>model.title??''},'prompt-detail':{text:()=>model.detail??''},
          'confirm-back':{text:()=>words().cancel,tap:()=>emit('Escape')},
          'confirm-accept':{text:()=>model.accept??W.confirm,tap:()=>emit('Enter')}
        }
      });
      const view=confirm;return {
        show(){view.show()},hide(){view.hide()},activate(){view.activate()},deactivate(){view.deactivate()},
        close(){if(confirm===view)confirm=undefined;view.close()}
      };
    }
  };
  function buildHud(){
    const W=words(),select=code=>model.commands?.[code];
    const compact=layout==='compact'||(layout==='auto'&&game.orientation!=='portrait'&&game.screen?.width<850);
    const upright=()=>['portrait','tabletPortrait'].includes(hud?.variant ?? (game.orientation==='portrait'?'portrait':'landscape'));
    const compactNow=()=>compact&&!upright();
    const actor=()=>model.actor??{},target=()=>model.target??{};
    const bind={
      'actor-name':{text:()=>shorten(actor().name,upright()?8:12),label:()=>actor().name??''},
      'actor-card':{label:()=>[actor().name,actor().turn,actor().hpText,actor().mpText,model.metadata?.title,model.metadata?.status,model.metadata?.hint].filter(Boolean).join(' · ')},
      'encounter-context':{visible:()=>Boolean(model.metadata?.title||model.metadata?.status||model.metadata?.hint)&&!(compactNow()&&moreOpen)},
      'encounter-title':{text:()=>shorten(model.metadata?.title,24),label:()=>model.metadata?.title??''},
      'encounter-status':{text:()=>shorten(model.metadata?.status,34),label:()=>model.metadata?.status??''},
      'encounter-hint':{text:()=>shorten(model.metadata?.hint,40),label:()=>model.metadata?.hint??''},
      'turn-state':{text:()=>shorten(upright()?(actor().turn??'').split(' · ').at(-1):actor().turn,upright()?12:18),label:()=>actor().turn??'',color:()=>toneColor(actor().tone)},
      'hp-text':{text:()=>actor().hpText??''},'mp-text':{text:()=>actor().mpText??''},
      'hp-bar':{value:()=>actor().hpRatio??0,label:()=>actor().hpText??W.health},
      'mp-bar':{value:()=>actor().mpRatio??0,label:()=>actor().mpText??W.energy},
      'target-card':{visible:()=>Boolean(target().visible),label:()=>[target().title,target().detail,target().vitals,target().full].filter(Boolean).join(' · ')},
      'target-name':{text:()=>shorten(target().title,upright()?8:12),label:()=>target().title??''},
      'target-detail':{text:()=>shorten(target().detail,upright()?11:20),label:()=>target().detail??'',color:()=>toneColor(target().tone)},
      'target-vitals':{text:()=>readoutLines(target().vitals,upright()?11:18)[0],label:()=>target().vitals??''},
      'target-vitals-secondary':{text:()=>readoutLines(target().vitals,upright()?11:18)[1]},
      'target-bar':{visible:()=>Boolean(target().showMeter),value:()=>target().vitalRatio??0,label:()=>target().vitals??W.health},
      'skill-name':{text:()=>shorten(model.skill,upright()?9:12),label:()=>model.skill??''},
      'compact-skill-name':{text:()=>shorten(model.skill,12),label:()=>model.skill??'',visible:()=>compactNow()&&!moreOpen},
      'extra-rail':{visible:()=>moreOpen},'battle-dpad':{visible:()=>!moreOpen||(!upright()&&!compactNow())},
      'skill-strip':{visible:()=>compactNow()?moreOpen:!moreOpen||!upright()},
      more:{text:()=>moreOpen?words().lessShort:words().more,label:()=>moreOpen?words().less:words().more,
        disabled:()=>!uiEligible(),tap:()=>{moreOpen=!moreOpen;refresh()}}
    };
    for(const code of allCommands){
      bind[code]={
        text:()=>select(code)?.text??'',label:()=>[select(code)?.label,select(code)?.pressed&&code!=='Tab'?words().selected:''].filter(Boolean).join(' · '),
        disabled:()=>!uiEligible()||!select(code)?.enabled,tap:()=>emit(code)
      };
      if(code==='Tab')bind[code].checked=()=>Boolean(model.auto);
      else bind[code].color=()=>!uiEligible()||!select(code)?.enabled?C.disabled:
        select(code)?.pressed?C.jadeActive:code==='Enter'?C.red:code==='Escape'?C.redDim:code==='KeyR'?C.card:C.jade;
    }
    hud=game.show(buildBattleHud(W,{compact}),{state:()=>model,bind,gamepad:false});
  }
  function update(){
    if(disposed)return;
    const state=getState(),context=getContext()??{},W=words();
    const available=state?.canAct&&!state?.auto?getModel()?.listActions?.()??[]:[];
    const next=projectBattleUi({state,actions:available,preview:getPreview(),context},W);
    const key=JSON.stringify(next)+'|menu:'+isMenuActive();
    if(key===lastSignature)return;
    lastSignature=key;
    const oldPhase=model.phase,oldSelection=Boolean(model.selection);
    model=next;
    if(oldPhase!==model.phase||oldSelection!==Boolean(model.selection))moreOpen=false;
    if(model.phase==='active'){
      if(stack.isOpen(promptScreen))void stack.close(promptScreen).catch(report);
      if(!hud)buildHud();
      else hud.show();
    }else hud?.hide();
    if(model.phase==='confirm'&&!stack.isOpen(promptScreen))void stack.open(promptScreen).catch(report);
    else if(model.phase!=='confirm'&&stack.isOpen(promptScreen))void stack.close(promptScreen).catch(report);
    refresh();
  }
  async function dispose(){
    if(disposed)return;disposed=true;
    signal?.removeEventListener('abort',abort);
    for(const release of claims)release();
    hud?.close();hud=undefined;
    if(injectedStack)await stack.close(promptScreen);
    else await stack.dispose();
  }
  const abort=()=>{void dispose().catch(report)};
  if(signal?.aborted)abort();
  else signal?.addEventListener('abort',abort,{once:true});
  update();
  function ownsPoint({x,y}){
    if(disposed||model.phase==='hidden')return false;
    if(model.phase==='confirm')return true;
    // Readable but non-actionable painted panels must not select an unseen cell.
    return Boolean(hud&&['actor-card','target-card','encounter-context','battle-dpad','skill-strip',
      'command-rail','extra-rail','compact-skill-name'].some(name=>{
      const box=hud.visibleRect(name);
      return box&&x>=box.x&&x<=box.x+box.width&&y>=box.y&&y<=box.y+box.height;
    }));
  }
  return {update,emit,dispose,ownsPoint,get active(){return model.phase!=='hidden'&&!disposed},
    get phase(){return disposed?'hidden':model.phase},getView:()=>model.phase==='confirm'?confirm:hud,stack};
}

// Optional compatibility bridge for a host which still exposes state through
// its existing canvas metadata. The caller decides when to call update; no
// DOM panel, click handlers or MutationObserver are required.
export function attachNativeBattleControls(game,canvas,options){
  return createBattleControls(game,{...options,getContext:options.getContext??(()=>({
    prompt:canvas?.dataset?.battlePrompt,mode:canvas?.dataset?.battleCommandMode,
    invalid:canvas?.dataset?.battlePreview==='invalid'
  })),restoreFocus:options.restoreFocus??(()=>canvas?.focus?.({preventScroll:true}))});
}
