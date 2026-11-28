// The same native menu route on every engine screen profile. The fight itself
// is not accelerated: checkpoints inspect the real HUD and pause screen.
export default async function screenRoute(player) {
  const {page}=player;
  const screen=kind=>page.waitForFunction(k=>window.egretGame?.screens?.current===k,kind,{timeout:180000});
  const activate=async(zh,en)=>{
    const name=await page.evaluate(({zh,en})=>document.documentElement.lang.startsWith('zh')?zh:en,{zh,en});
    await page.waitForFunction(n=>egretGame.tester.exists(n),name,{timeout:30000});
    await page.evaluate(n=>egretGame.tester.press(n),name);
  };
  await screen('title');
  await player.checkpoint('title-ready');
  await activate('设置','Settings'); await screen('settings');
  await player.checkpoint('settings');
  await page.keyboard.press('Escape'); await screen('title');
  await activate('征途','The road'); await screen('choose');
  await player.checkpoint('choose-regiment');
  await activate('下一步','Next'); await screen('loadout');
  await player.checkpoint('loadout');
  await activate('出阵','To the field'); await screen('card');
  await player.checkpoint('stage-card');
  await activate('战','Fight');
  await page.waitForFunction(()=>egretGame?.mode==='fight'&&egretGame.hud.snapshot().visible,null,{timeout:180000});
  await player.checkpoint('fight-hud');
  await page.keyboard.press('Escape');
  await screen('pause'); await player.checkpoint('pause');
  await activate('继续','Resume');
  await page.waitForFunction(()=>egretGame.screens.current===null,null,{timeout:30000});
}
