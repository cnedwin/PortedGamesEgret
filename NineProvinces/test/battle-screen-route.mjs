// Native battle screen checkpoints. Named semantic actions drive the same
// interface as real input; deterministic completion is only a screenshot fixture.
async function until(player,fn,arg,label){for(let i=0;i<150;i++){if(await player.read(fn,arg))return;await player.wait(.1);}throw Error(label+' did not become ready');}
async function part(player,name,surface='battle'){
  await until(player,({name,surface})=>{const a=egretGame.app,v=surface==='title'?a.nativeTitle.view:surface==='lab'?a.lab?.controller.nativeView:a.battle?.nativeView;if(v?.rect(name)&&!v.visibleRect(name))v.focus(name);return a.uiHost.semantics.publish().nodes.some(n=>n.id.endsWith(':'+name)&&!n.hidden&&!n.inert&&!n.disabled);},{name,surface},name);
  await player.read(name=>{const {app,ui}=egretGame,nodes=app.uiHost.semantics.publish().nodes,n=nodes.find(n=>n.id.endsWith(':'+name)&&!n.hidden&&!n.inert&&!n.disabled),same=nodes.filter(x=>!x.hidden&&!x.inert&&x.role===n.role&&x.name===n.name);return ui.press(n.role+':'+n.name+(same.length>1?'#'+same.findIndex(x=>x.id===n.id):''));},name);
  await player.wait(.3);
}
export default async function(player){
 await until(player,()=>window.egretGame?.ready&&egretGame.screen==='title',null,'title');
 if(await player.read(()=>egretGame.app.language())!=='zh')await part(player,'title-language','title');
 await part(player,'title-nanpi','title');
 await until(player,()=>egretGame.battle?.phase==='deploy'&&!!egretGame.battle.nativeView,null,'deployment');
 await player.checkpoint('native-deploy');
 const id=await player.read(()=>egretGame.battle.nativeHud.units.find(u=>u.selected)?.id??egretGame.battle.nativeHud.units[0].id);
 await part(player,'battle-unit-'+id);
 await part(player,'battle-begin');
 await until(player,()=>egretGame.battle?.phase==='fight',null,'battle');
 await player.wait(.5);
 if(!await player.read(()=>egretGame.battle.tempo.paused))await part(player,'battle-bpause');
 await until(player,()=>egretGame.battle?.tempo.paused===true,null,'paused battle');
 await player.checkpoint('native-battle-paused');
 await player.read(()=>egretGame.battle.autoFinish());
 await until(player,()=>egretGame.ui.exists('button:回放战斗')||egretGame.app.uiHost.semantics.publish().nodes.some(n=>n.id.endsWith(':nanpi-replay')),null,'trial result');
 await player.checkpoint('native-nanpi-result');
 await part(player,'nanpi-replay','lab');
 await until(player,()=>!!egretGame.app.lab?.controller?.nativeView,null,'replay');
 await player.checkpoint('native-replay');
 await part(player,'replay-report-tab','lab');
 await player.checkpoint('native-battle-report');
 await part(player,'replay-exit','lab');
 await part(player,'nanpi-return','lab');
 await until(player,()=>egretGame.screen==='title',null,'return title');
 await part(player,'title-sandbox','title');
 await until(player,()=>egretGame.app.lab?.controller?.nativeView?.rect('sandbox-config-root'),null,'sandbox');
 await player.checkpoint('native-sandbox-config');
}
