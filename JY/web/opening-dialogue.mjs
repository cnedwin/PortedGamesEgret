import { palette as C } from './jyx2/ui/native/theme.mjs';
import { readingLabels, readingDescription, panel, column, row, label, button,
  scrollBody, createReadingRows, placeReadingArt } from './jyx2/ui/native/reading-view.mjs';

// Keep the game's existing logical page boundaries. Only the visual line wrap
// and scroll extent within a page now belong to the engine.
export function paginateDialogue(text, lineSeparator = '\n') {
  const lines = [];
  let line = '';
  let units = 0;
  for (const character of text) {
    line += character;
    units += character.codePointAt(0) > 128 ? 2 : 1;
    if (units >= 40) {
      lines.push(line);
      line = '';
      units = 0;
    }
  }
  if (line || !lines.length) lines.push(line);
  const pages = [];
  for (let index = 0; index < lines.length; index += 4) {
    pages.push(lines.slice(index, index + 4).join(lineSeparator));
  }
  return pages;
}

function dialogueDescription(L,{portrait,lower,right,heading,index,pages}) {
  return readingDescription(L.dialogue,profile=>{
    const target=profile.portrait?64:56;
    const image=panel([],{name:'dialogue-art',width:portrait?(profile.portrait?72:90):1,height:portrait?(profile.portrait?72:'fill'):1,
      card:true,color:C.card,visible:portrait,semantic:false});
    const title=label('dialogue-speaker',heading||L.dialogue,{height:26,size:17,bold:true,color:C.gold});
    const count=label('dialogue-page',`${index+1} / ${pages}`,{height:26,color:C.muted,size:13,align:'right',width:profile.portrait?'fill':130});
    const body=scrollBody('dialogue-body');
    const columnBody=column([row([title,count],{height:26,gap:4}),body],{width:'fill',height:'fill',gap:4});
    const portraitHeader=profile.portrait?row([image,column([title,count],{width:'fill',height:'fill',gap:2})],{height:portrait?72:56}):null;
    const presentation=profile.portrait?column([portraitHeader,body],{height:'fill',gap:5}):
      row(right?[columnBody,image]:[image,columnBody],{height:'fill',gap:9});
    return column([
      presentation,
      row([button('dialogue-history',profile.portrait?L.historyShort:L.history,{size:profile.portrait?13:15,height:target}),
        button('dialogue-skip-read',profile.portrait?L.skipReadShort:L.skipRead,{size:profile.portrait?13:15,height:target}),
        button('dialogue-continue',L.continue,{color:C.red,height:target,size:17})],{height:target})
    ],{anchor:profile.portrait||lower?'bottom':'top',width:profile.tablet?(profile.portrait?'91%':'87%'):'96%',
      height:profile.portrait?365:225,card:true,color:C.deep,padding:9,gap:6,border:{color:C.gold,width:1}});
  });
}

/** Presentation adapter. The event interpreter, choice outcomes, voice cues and
 * persistence still live with the caller. A page is acknowledged only after its
 * paragraph is prepared and the caller's accepted-frame barrier has completed.
 */
export function createOpeningDialogue({game,engine=game?.engine,scope=game?.scope,requestFrame=()=>game.invalidate(),
  presentFrame=async()=>{},loadPortrait=async()=>undefined,speakerName,onPage,language=()=> 'zh',
  bottomDocked,onJournal,canJournal=()=>true,canSkipRead=()=>false,onSkipRead,onAcknowledge,onError=console.error}={}) {
  if(!game?.show||!engine||!scope)throw new TypeError('Native Play game and scope required');
  const owned=scope.use(engine.createScope());
  let waiter,active=false,closed=false,current;
  const closedError=new DOMException('Dialogue closed','AbortError');
  const checkOpen=()=>{if(closed||owned.signal.aborted)throw closedError;};
  function abortWait(){
    if(closed)return;
    closed=true;
    current?.close();current=undefined;
    const pending=waiter;waiter=undefined;
    pending?.reject(closedError);
  }
  function close(){if(closed)return;abortWait();owned.dispose();}
  owned.signal.addEventListener('abort',abortWait,{once:true});
  function acknowledge(skip){
    if(!waiter||closed)return false;
    const pending=waiter;waiter=undefined;
    pending.resolve(skip);
    onAcknowledge?.({skip});
    return true;
  }
  function closePage(){current?.close();current=undefined;}
  async function talk({text:content,head,style,voice,item,speakerName:overrideName}){
    checkOpen();
    if(active)throw new Error('Another dialogue is already active');
    active=true;
    try{
      const portrait=head>=0&&style!==2&&style!==3?await loadPortrait(head):undefined;
      checkOpen();
      const art=item??portrait;
      const heading=!item&&head>=0?overrideName??speakerName?.(head):undefined;
      const pages=paginateDialogue(content);
      for(let index=0;index<pages.length;index++){
        checkOpen();
        const pageText=pages[index], labels=readingLabels(language());
        const child=owned.use(engine.createScope());
        const reading=createReadingRows({game,scope:child,body:'dialogue-body',rows:()=>[{body:pageText}],language,onError,
          fontSize:20,lineHeight:25});
        let view;
        let ended=false;
        const page={close(){if(ended)return;ended=true;reading.close();view?.close();child.dispose();}};
        current=page;
        try{
          view=game.show(dialogueDescription(labels,{portrait:Boolean(art),lower:bottomDocked?.()||style%2===1,
            right:style===1||style===4,heading,index,pages:pages.length}),{
            bind:{
              'dialogue-page':{text:()=>`${index+1} / ${pages.length}`+(view?.scroll('dialogue-body').maximum>0?' · '+labels.scroll:'')},
              'dialogue-continue':{disabled:()=>!waiter,tap:()=>acknowledge(false)},
              'dialogue-history':{label:()=>labels.history,disabled:()=>!waiter||!onJournal||!canJournal(),tap:()=>{if(waiter&&canJournal())onJournal?.();}},
              'dialogue-skip-read':{label:()=>labels.skipRead,disabled:()=>!waiter||!onSkipRead||!canSkipRead(),tap:()=>{if(waiter&&canSkipRead())onSkipRead?.();}}
            },
            built(v){placeReadingArt(v,'dialogue-art',art);reading.render(v);}
          });
          // A turn during preparation supersedes the view's text revision.
          // Wait for the replacement instead of cancelling the caller's message.
          const textNames=['dialogue-speaker','dialogue-page','dialogue-continue','dialogue-history','dialogue-skip-read'];
          for(;;){
            await reading.ready();checkOpen();
            view.refresh();
            const layout=view.get('dialogue-body');
            const jobs=textNames.map(name=>view.textReady(name));
            try{await Promise.all(jobs.filter(Boolean));}
            catch(error){
              checkOpen();
              if(error?.name==='AbortError'&&(layout!==view.get('dialogue-body')||jobs.some((job,i)=>job!==view.textReady(textNames[i]))))continue;
              throw error;
            }
            if(layout===view.get('dialogue-body'))break;
          }
          requestFrame();await presentFrame();checkOpen();
          const skipped=await new Promise((resolve,reject)=>{
            waiter={resolve,reject};
            onPage?.({text:pageText,speaker:heading??overrideName??speakerName?.(head),head,style,voice,page:index+1,pages:pages.length});
            view.refresh();view.focus('dialogue-continue');requestFrame();
          });
          if(skipped)return false;
        }finally{
          waiter=undefined;
          if(current===page)closePage();else page.close();
        }
      }
      return true;
    }finally{
      active=false;
      if(!closed)requestFrame();
    }
  }
  return {talk,prepareSkin:()=>Promise.resolve(),confirm:()=>acknowledge(false),skip:()=>acknowledge(true),close,
    get waiting(){return waiter!==undefined},get presenting(){return active}};
}
