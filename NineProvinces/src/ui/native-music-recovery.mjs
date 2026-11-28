// An optional music file never makes the player lose progress. Use the
// engine's real modal/focus path, and retry only the currently wanted score
// after the player's explicit choice.
export function createMusicRecovery({game,getSound,enabled=()=>true,words,onError=()=>{}}){
 let closed=false,running=false,pending=null,active=null;
 const current=name=>!closed&&enabled()&&getSound()?.music===name;
 async function drain(){
  try{
   while(!closed&&pending!==null){
    const name=pending;pending=null;
    if(!current(name))continue;
    active=name;
    const retry=await game.confirm(words('本幕配乐未能载入，仍可继续游戏。','This scene’s music could not load. You can continue playing.'),{
      title:words('配乐暂未载入','Music unavailable'),
      yes:words('重试配乐','Retry music'),no:words('继续游戏','Continue playing'),
      skin:{panel:0x18272a,button:0x354747,text:0xf2e4c6,accent:0xe7c78b,buttonText:0xf2e4c6}
    });
    active=null;
    if(retry&&current(name))await getSound().theme(name);
   }
  }catch(error){if(!closed)onError(error);}
  finally{running=false;active=null;if(!closed&&pending!==null)schedule();}
 }
 function schedule(){if(running||closed)return;running=true;queueMicrotask(()=>{void drain();});}
 return {failed(name){if(closed||!current(name)||name===active||name===pending)return;pending=name;schedule();},
   dispose(){closed=true;pending=null;}};
}
