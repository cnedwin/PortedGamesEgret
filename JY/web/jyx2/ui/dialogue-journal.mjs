import { createUiScreenStack } from '@egret/engine/ui';
import { palette as C } from './native/theme.mjs';
import { readingLabels, readingDescription, column,row,label,button,scrollBody,createReadingRows } from './native/reading-view.mjs';

const PAGE_SIZE=3;
// The caller's existing entry array remains the sole record. No UI storage or
// extra dialogue entries are created by review, paging, rotation or reopening.
export function createDialogueJournal(entries,{game,signal,restoreFocus=()=>{},language=()=> 'zh',onError=console.error}={}){
  if(!game?.show||!Array.isArray(entries))throw new TypeError('Native game and journal entries required');
  const stack=createUiScreenStack({onError});
  const owner=game.scope.use(game.engine.createScope());
  let current,closed=false,sequence=0;
  const report=error=>{try{onError(error)}catch{/* Diagnostic only. */}};
  const dismiss=()=>{if(current)void stack.back().catch(report)};
  function close(){dismiss();}
  function show(){
    if(current||closed||!entries.length)return;
    const labels=readingLabels(language());
    const snapshot=entries.map(({speaker,text})=>({heading:speaker,body:text}));
    const pages=Math.ceil(snapshot.length/PAGE_SIZE);
    const scope=owner.use(game.engine.createScope());
    let page=pages-1,view;
    const reading=createReadingRows({game,scope,body:'journal-body',
      rows:()=>snapshot.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE),language,onError});
    const move=delta=>{
      const selected=Math.max(0,Math.min(pages-1,page+delta));
      if(selected===page||!view)return;
      page=selected;view.refresh();reading.render(view,{toEnd:delta>0});
    };
    let ended=false;
    const screen={id:'dialogue-journal-'+(++sequence),layer:'modal',back:'close',open(context){
      if(closed||signal?.aborted){context.close();return}
      const description=readingDescription(labels.journal,profile=>column([
        label('journal-heading',labels.journal,{color:C.gold,bold:true,size:22,height:36}),
        scrollBody('journal-body'),
        label('journal-page','',{color:C.muted,height:26,align:'center'}),
        row([button('journal-previous',labels.previous,{size:16}),button('journal-next',labels.next,{size:16}),
          button('journal-back',labels.back,{color:C.red})],{height:76})
      ],{anchor:'center',width:profile.tablet?'78%':'94%',height:profile.portrait?'82%':'89%',card:true,
        color:C.deep,padding:12,gap:8,border:{color:C.gold,width:1}}),{modal:true});
      view=game.show(description,{initialFocus:'journal-back',dismiss:()=>context.close(),bind:{
        'journal-page':{text:()=>`${labels.page} ${page+1} / ${pages}`},
        'journal-previous':{disabled:()=>page===0,tap:()=>move(-1)},
        'journal-next':{disabled:()=>page===pages-1,tap:()=>move(1)},
        'journal-back':{tap:()=>context.close()}
      },built(v){reading.render(v,{toEnd:page===pages-1});}});
      return view;
    }};
    current={screen};
    void stack.open(screen).catch(report).finally(()=>{
      if(ended)return;ended=true;
      reading.close();scope.dispose();
      if(current?.screen===screen)current=undefined;
      if(!closed){restoreFocus();game.invalidate();}
    });
  }
  function dispose(){
    if(closed)return;closed=true;
    signal?.removeEventListener('abort',dispose);
    void stack.dispose().catch(report).finally(()=>owner.dispose());
  }
  signal?.addEventListener('abort',dispose,{once:true});
  if(signal?.aborted)dispose();
  return {
    get open(){return Boolean(current)},get hasEntries(){return entries.length>0},
    record(speaker,text){entries.push({speaker,text});if(entries.length>60)entries.shift();},
    show,close,dispose,
    // Only legacy command bridges call this. Native modal Escape/pad-B uses
    // the engine dismiss binding and is consumed before gameplay input.
    handleKey(code,repeat){if(!current)return false;if(!repeat&&code==='Escape')dismiss();return true;}
  };
}
