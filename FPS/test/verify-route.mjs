import { nativeReady, pressNative, readLiveCamera } from './browser-ui.mjs';

// Use the verifier's documented scripted route: the first title is not
// ready after its blind 2.5s sample while the complete 3D art is loading.
export default async function (player) {
  const page = player.page;
  const url = new URL(page.url());
  url.searchParams.set('quality', 'low');
  url.searchParams.set('seed', '7');
  url.searchParams.set('lang', 'zh');
  await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  await nativeReady(page, 'button:部署', 120000);
  await page.waitForFunction(() => __cutoff.mode === 'title' && __cutoff.frames > 7, null, {timeout:120000});
  const start = await player.read(readLiveCamera);
  await page.waitForTimeout(1000);
  const idle = await player.read(readLiveCamera);
  player.expect(idle.frames > start.frames, 'the complete title has advancing World3D frames');
  await player.picture('title-ready');
  player.checkpoint('title-ready');
  await pressNative(page, 'button:部署');
  await page.waitForFunction(() => __cutoff.mode === 'play' || (__cutoff.mode === 'pause' && __cutoff.ui.menus.snapshot().mouseStatus === 'failed'), null, {timeout:30000});
  if (await player.read(() => __cutoff.mode === 'pause')) await pressNative(page, 'button:使用拖动瞄准');
  await page.waitForFunction(() => __cutoff.game.state === 'play' && __cutoff.mode === 'play', null, {timeout:30000});
  const before = await player.read(readLiveCamera);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(380);
  await page.keyboard.up('KeyW');
  const after = await player.read(readLiveCamera);
  player.expect(after.frames > before.frames && Math.hypot(after.position[0]-before.position[0],after.position[2]-before.position[2]) > .05, 'World3D updates and actual keyboard movement after deployment');
  await player.picture('moving');
  player.checkpoint('moving');
  if (await player.read(() => __cutoff.ui.game.pointer.locked)) await page.evaluate(() => __cutoff.ui.game.pointer.unlock());
  else await page.keyboard.press('Escape');
  await page.waitForFunction(() => __cutoff.mode === 'pause');
  await player.picture('pause');
  player.checkpoint('pause');
  player.expect(!await player.read(() => __cutoff.error), 'no runtime error');
}