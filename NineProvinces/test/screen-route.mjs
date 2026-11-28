// Multi-screen native UI checkpoints. Use the engine's named semantic actions;
// scroll to a real control's planned rectangle when it is outside a viewport.
async function until(player,fn,arg,label) {
  for(let i=0;i<120;i++){
    if(await player.read(fn,arg))return;
    await player.wait(.1);
  }
  throw Error(label+' did not become ready');
}
async function press(player,query,part=null,dialog=false) {
  await player.read(({query,part,dialog})=>{
    const {app,ui}=window.egretGame,view=dialog?app.dialogs.view:app.nativeTitle.view;
    if(part&&view&&!ui.exists(query)){
      const id=dialog?'dialog-body':'page-body',r=view.rect(part),b=view.rect(id);
      if(r&&b)view.scroll(id).scrollTo(Math.max(0,r.y-b.y-b.height*.35));
    }
  },{query,part,dialog});
  await until(player,q=>window.egretGame?.ui?.exists(q),query,query);
  await player.read(q=>window.egretGame.ui.press(q),query);
  await player.wait(.3);
}
export default async function(player){
  await until(player,()=>window.egretGame?.ready&&(window.egretGame?.ui?.exists('button:新的征程')||window.egretGame?.ui?.exists('button:New campaign')),null,'title');
  const lang=await player.read(()=>window.egretGame.app.language());
  if(lang==='zh')await press(player,'button:English','title-language');
  await until(player,()=>window.egretGame.ui.exists('button:New campaign'),null,'English title');
  await player.checkpoint('title-English');
  await press(player,'button:中文','title-language');
  await until(player,()=>window.egretGame.ui.exists('button:新的征程'),null,'Chinese title');
  await player.checkpoint('title-Chinese');
  await press(player,'button:设置','title-settings');
  await until(player,()=>window.egretGame.app.dialogs.name==='settings'&&window.egretGame.ui.exists('button:关闭'),null,'settings');
  await player.checkpoint('settings');
  await press(player,'button:关闭','dialog-close',true);
  await press(player,'button:新的征程','title-new');
  await until(player,()=>window.egretGame.app.nativeTitle.view?.visibleRect('setup-ruler-art'),null,'campaign setup');
  await player.checkpoint('campaign-setup');
  await press(player,'button:自建势力','mode-custom');
  await until(player,()=>window.egretGame.app.nativeTitle.snapshot().setup?.pick.mode==='custom',null,'custom banner');
  await player.checkpoint('custom-faction');
  await press(player,'button:返回','setup-back');
  await press(player,'button:登录新武将','title-roster');
  await until(player,()=>window.egretGame.screen==='roster'&&window.egretGame.app.nativeTitle.view?.visibleRect('roster-name'),null,'officer roster');
  await player.checkpoint('officer-roster');
}