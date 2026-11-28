// Generic native encounter result. The game computes settlement, rewards,
// progression and persistence; this adapter displays its supplied copy only.
import {createUiScreenStack} from '@egret/engine/ui';
import {palette as C,skin,metrics} from './theme.mjs';
import {battleWords} from './battle-ui.mjs';

const string=value=>value===undefined||value===null?'':String(value);
function linesOf(text,width=16.5){
  const lines=[];
  for(const source of string(text).split(/\r?\n/u)){
    let line='',units=0;
    const tokens=source.match(/[a-z0-9][a-z0-9'_-]*|\s+|./giu)??[];
    const count=token=>Array.from(token).reduce((sum,char)=>sum+(/[\x20-\x7e]/u.test(char)?0.55:1),0);
    for(const token of tokens){
      const chunks=count(token)>width?Array.from(token):[token];
      for(const chunk of chunks){
        const cost=count(chunk);
        if(units+cost>width&&line.trim()){lines.push(line.trim());line='';units=0}
        if(!line&&chunk.trim()==='')continue;
        line+=chunk;units+=cost;
      }
    }
    if(line.trim())lines.push(line.trim());
  }
  return lines;
}
export function normalizeResultCopy(value={},W=battleWords()){
  const rawEntries=Array.isArray(value.entries)?value.entries:
    string(value.summary).split(/\s*·\s*/u).filter(Boolean);
  const entries=rawEntries.flatMap(entry=>typeof entry==='string'?[entry]:
    entry&&typeof entry==='object'?[entry.title,entry.detail].filter(text=>text!==undefined&&text!==null).map(string):[string(entry)]);
  const title=string(value.title)||(value.won===true?W.victory:value.won===false?W.defeat:W.confirm);
  const detail=string(value.detail);
  return {won:value.won,title,detail,entries,
    lines:entries.flatMap(text=>linesOf(text)),detailLines:linesOf(detail)};
}
const F='fill',B=metrics.target;
const panel=(children,opts={})=>({type:'panel',width:F,height:F,children,...opts});
const col=(children,opts={})=>panel(children,{layout:'column',gap:7,align:'stretch',...opts});
const text=(name,value,opts={})=>({type:'text',name,text:value,width:F,height:29,color:C.cream,size:18,...opts});
function resultRows(result){
  return [
    ...result.lines.map((line,index)=>text('result-line-'+index,line,{height:28})),
    ...result.detailLines.map((line,index)=>text('result-note-'+index,line,{height:27,color:C.muted,size:16}))
  ];
}
export function buildBattleResult(W=battleWords(),result=normalizeResultCopy({},W)){
  const build=profile=>col([
    text('result-title',result.title,{height:56,size:profile.upright?32:36,align:'center',bold:true,
      color:result.won===false?0xe2a48f:C.gold}),
    panel([],{semantic:false,width:F,height:2,color:C.gold}),
    col(resultRows(result),{name:'result-scroll',scroll:'vertical',card:true,color:C.night,height:F,padding:8,gap:5}),
    {type:'button',name:'continue',text:W.continue,width:F,height:B,color:C.red,textColor:C.cream,size:20}
  ],{anchor:'center',width:profile.width,height:'94%',padding:12,card:true,color:C.deep,border:{color:C.line,width:1.5}});
  return {label:result.title,area:'safe',skin,modal:true,
    root:build({width:'84%',upright:false}),portrait:build({width:'96%',upright:true}),
    tablet:build({width:690,upright:false}),tabletPortrait:build({width:'82%',upright:true})};
}

export function createBattleResultUi(game,{
  signal,language=()=> 'zh',labels,onContinue,restoreFocus=()=>{},stack:injectedStack,onError=()=>{}
}={}){
  if(typeof onContinue!=='function')throw new TypeError('result continuation callback required');
  const words=()=>battleWords(typeof language==='function'?language():language,typeof labels==='function'?labels():labels);
  const stack=injectedStack??createUiScreenStack({onError});
  let current,sequence=0,disposed=false;
  const report=error=>{try{onError(error)}catch{/* Optional diagnostics never control result settlement. */}};
  function settle(op,continued){
    if(op.closing)return false;
    op.closing=true;
    if(op.context)op.context.close(Boolean(continued));
    else void stack.close(op.screen,Boolean(continued)).catch(report);
    return true;
  }
  function show(copy){
    if(disposed)return false;
    const W=words(),result=normalizeResultCopy(copy,W);
    if(current&&!current.closing){
      current.copy=result;current.raw=copy;
      if(current.view){
        current.view.replaceChildren('result-scroll',resultRows(result));
        current.view.refresh();game.invalidate?.();
      }
      return true;
    }
    const op={raw:copy,copy:result,closing:false};
    current=op;
    op.screen={
      id:'native-result-'+(++sequence),layer:'modal',back:'none',
      open(context){
        op.context=context;
        if(op.closing||disposed){context.close(false);return}
        const view=game.show(buildBattleResult(W,op.copy),{
          state:()=>op.copy,gamepad:true,initialFocus:'continue',dismiss:()=>{},bind:{
            'result-title':{text:()=>op.copy.title,color:()=>op.copy.won===false?0xe2a48f:C.gold},
            continue:{text:()=>words().continue,tap:()=>settle(op,true)}
          }
        });
        op.view=view;return view;
      }
    };
    void stack.open(op.screen).then(continued=>{
      if(current!==op)return;
      current=undefined;game.invalidate?.();
      if(continued===true&&!disposed){
        try{restoreFocus()}catch(error){report(error)}
        try{void Promise.resolve(onContinue(op.raw)).catch(report)}catch(error){report(error)}
      }
    },error=>{
      if(current===op)current=undefined;
      report(error);
    });
    return true;
  }
  function hide(){
    if(!current)return false;
    return settle(current,false);
  }
  function continueResult(){
    if(!current||disposed)return false;
    return settle(current,true);
  }
  async function dispose(){
    if(disposed)return;disposed=true;
    signal?.removeEventListener('abort',abort);
    const op=current;
    if(op)settle(op,false);
    if(!injectedStack)await stack.dispose();
    else if(op)await stack.close(op.screen,false);
    current=undefined;
  }
  const abort=()=>{void dispose().catch(report)};
  if(signal?.aborted)abort();
  else signal?.addEventListener('abort',abort,{once:true});
  return {show,hide,continue:continueResult,dispose,stack,get active(){return !!current&&!disposed},getView:()=>current?.view};
}
