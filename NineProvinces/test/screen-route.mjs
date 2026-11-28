// Multi-screen native UI checkpoints. Use the engine's named semantic actions;
// scroll to a real control's planned rectangle when it is outside a viewport.
async function until(player,fn,arg,label) {
  for(let i=0;i<120;i++){
    if(await player.read(fn,arg))return;
    await player.wait(.1);
  }
  throw Error(label+' did not become ready');
}
async function press(player,query,part=null,dialog=false,surface='title') {
  await player.read(({query,part,dialog,surface})=>{
    const {app,ui}=window.egretGame,view=dialog?app.dialogs.view:surface==='realm'?app.hud.view:surface==='coach'?app.coach.view:app.nativeTitle.view;
    if(part&&view&&!ui.exists(query)){
      const id=dialog?'dialog-body':surface==='realm'?'realm-body':surface==='coach'?'coach-body':'page-body',r=view.rect(part),b=view.rect(id);
      if(r&&b)view.scroll(id).scrollTo(Math.max(0,r.y-b.y-b.height*.35));
    }
  },{query,part,dialog,surface});
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
  await press(player,'button:返回','roster-back');
  await press(player,'button:新的征程','title-new');
  await press(player,'button:季汉春秋','branch-liubei');
  await press(player,'button:开始','setup-start');
  await until(player,()=>window.egretGame.app.dialogs.name==='story'&&window.egretGame.ui.exists('button:下一步'),null,'opening story');
  await player.checkpoint('opening-story');
  await press(player,'button:下一步','story-next',true);
  await until(player,()=>!window.egretGame.app.dialogOpen&&window.egretGame.app.hud.view?.visibleRect('realm-shell'),null,'realm');
  await player.checkpoint('realm-first-month');
  if(await player.read(()=>window.egretGame.ui.exists('button:收起首月建议')))await press(player,'button:收起首月建议','coach-dismiss',false,'coach');
  await press(player,'tab:政令','realm-tab-orders',false,'realm');
  await player.checkpoint('city-orders');
  await press(player,'button:出征','muster',false,'realm');
  await until(player,()=>window.egretGame.app.dialogs.name==='muster'&&window.egretGame.ui.exists('button:取消'),null,'muster');
  await player.checkpoint('muster');
  await press(player,'button:取消','dialog-cancel',true);
  for(const [name,button] of [['tech','科技'],['diplomacy','外交'],['generals','武将'],['chronicle','记录']]){
    await press(player,'button:'+button+(name==='chronicle'?'#0':''));
    await until(player,n=>window.egretGame.app.dialogs.name===n&&window.egretGame.ui.exists('button:关闭'),name,name);
    await player.checkpoint(name);
    await press(player,'button:关闭','dialog-close',true);
  }
}