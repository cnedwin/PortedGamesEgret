// Native accessible alternate picker for existing map destinations. No game
// simulation or routing logic: the final ID goes to the original tapNode.
export function createRealmDestinationPicker(app,{nodes,provinces,placeName,language,onError=console.error,pageSize=24}={}){
  if(!Number.isInteger(pageSize)||pageSize<1||pageSize>32)throw new RangeError('Destination page size must be 1..32');
  const groups=new Map(Object.entries(provinces).map(([id,names])=>[id,{names,items:[]}])) ;
  for(const [id,node] of Object.entries(nodes)){
    if(id.startsWith('@'))throw Error('Reserved destination id');
    const group=groups.get(node.prov)??groups.get('@other')??{names:['其他','Other'],items:[]};
    if(!groups.has(node.prov)&&!groups.has('@other'))groups.set('@other',group);
    group.items.push(id);
  }
  const words=(zh,en)=>language()==='en'?en:zh,sk={panel:0x18272a,button:0x354747,text:0xf2e4c6,accent:0xe7c78b,buttonText:0xf2e4c6};
  let active,closed=false;
  function cancel(){const old=active;active=null;old?.controller.abort();}
  function allowed(entry){const army=entry.state?.armies?.[entry.army];return !closed&&active===entry&&!entry.controller.signal.aborted&&app.screen==='play'&&!app.battle&&!app.lab&&app.state===entry.state&&app.sel?.army===entry.army&&app.mode===entry.mode&&army?.faction===entry.state.player;}
  const choose=(entry,choices,title)=>app.game.select(choices,{title,cancel:words('取消','Cancel'),skin:sk,signal:entry.controller.signal});
  async function run(entry){
    while(allowed(entry)){
      const provinceChoices=[...groups].filter(([,g])=>g.items.length).map(([id,g])=>({value:id,text:g.names[language()==='en'?1:0]}));
      const p=await choose(entry,provinceChoices,words('按列表选择目的地 · 州','Choose destination · province'));
      if(!allowed(entry)||p===undefined)return false;const group=groups.get(p);if(!group)return false;
      let page=0;
      while(allowed(entry)){
        const start=page*pageSize,count=Math.ceil(group.items.length/pageSize);
        const choices=group.items.slice(start,start+pageSize).map(id=>({value:id,text:placeName(id)}));
        choices.push({value:'@province',text:words('返回州列表','Back to provinces')});
        if(page>0)choices.push({value:'@previous',text:words('上一页','Previous page')});
        if(start+pageSize<group.items.length)choices.push({value:'@next',text:words('下一页','Next page')});
        const id=await choose(entry,choices,group.names[language()==='en'?1:0]+' · '+(page+1)+' / '+count);
        if(!allowed(entry)||id===undefined)return false;
        if(id==='@province')break;if(id==='@previous'&&page>0){page--;continue;}if(id==='@next'&&page+1<count){page++;continue;}
        // Accept only a value from the currently authored page; no hidden or
        // stale selector result can dispatch a new command.
        if(!choices.some(c=>c.value===id)||!group.items.includes(id)||!Object.hasOwn(nodes,id))return false;
        if(entry.mode?.kind!=='march'||entry.mode.army!==entry.army)app.setMode({kind:'march',army:entry.army});
        app.tapNode(id);return true;
      }
    }
    return false;
  }
  return {open(army){
    if(closed)return Promise.resolve(false);if(active?.army===army)return active.promise;if(active)cancel();
    if(app.game.asking||app.dialogOpen||app.screen!=='play'||!app.state||app.sel?.army!==army)return Promise.resolve(false);
    const entry={army,state:app.state,mode:app.mode,controller:new AbortController()};active=entry;
    entry.promise=run(entry).catch(error=>{if(!entry.controller.signal.aborted)onError(error);return false;}).finally(()=>{if(active===entry)active=null;});return entry.promise;
  },cancel,dispose(){closed=true;cancel();},get active(){return Boolean(active)}};
}