import assert from 'node:assert/strict';
import { launch, openPage, serve } from '../../tools/lib/browser.mjs';

const server = await serve();
const browser = await launch();
const url = server.url + 'SandScroll/?lang=zh&seed=2&backend=webgl2';
const startRound = async (touch) => {
  const page = await openPage(browser, url + (touch ? '&touch' : ''), { touch });
  const at = (screen) => page.waitForFunction((name) => window.egretGame?.ready && window.egretGame.screen === name, screen);
  await at('title');
  if (touch) await page.touchscreen.tap(721, 92);
  else await page.keyboard.press('Enter');
  await at('pick');
  if (touch) await page.touchscreen.tap(425, 115);
  else await page.keyboard.press('Enter');
  await at('play');
  return page;
};
const observe = (page) => page.evaluate(() => {
  const game = window.egretGame.app.round;
  const pieces = [];
  const sample = () => {
    const falling = game.falling;
    if (falling && pieces.at(-1)?.id !== falling.piece.id) {
      const { id, pigment, turns } = falling.piece;
      pieces.push({ id, pigment, turns, column: falling.x });
    }
    requestAnimationFrame(sample);
  };
  sample();
  window.observedPlacements = pieces;
});
const finish = async (page) => {
  await page.waitForFunction(() => window.egretGame.app.round.pieces >= 2 && window.egretGame.isSettled());
  assert.deepEqual(page.problems, []);
  return page.evaluate(() => window.observedPlacements);
};
try {
  const keyboard = await startRound(false);
  await observe(keyboard);
  for (const slot of ['Digit1', 'Digit2', 'Digit3', 'Digit1']) {
    await keyboard.keyboard.down(slot);
    await keyboard.keyboard.press('Space', { delay: 25 });
    await keyboard.keyboard.up(slot);
  }
  assert.equal(await keyboard.evaluate(() => window.egretGame.app.round.pieces), 1, 'All commands arrived during the first fall');
  await keyboard.keyboard.press('Escape', { delay: 25 });
  await keyboard.waitForFunction(() => window.egretGame.current?.paused);
  const pausedTime = await keyboard.evaluate(() => window.egretGame.app.round.time);
  await keyboard.setViewportSize({ width: 540, height: 960 });
  await keyboard.waitForFunction(() => window.egretGame.ready && window.egretGame.app.stage.width === 540);
  assert.equal(await keyboard.evaluate(() => window.egretGame.current.paused), true, 'Rotation preserves pause');
  assert.equal(await keyboard.evaluate(() => window.egretGame.app.round.time), pausedTime, 'Queued drops stay pending through rotation');
  await keyboard.keyboard.press('Escape', { delay: 25 });
  await keyboard.waitForFunction(() => !window.egretGame.current?.paused);
  assert.deepEqual((await finish(keyboard)).map((piece) => piece.pigment), [1, 5, 2], 'The first three keyboard drops land in order and an extra drop is rejected');
  await keyboard.context().close();

  const touch = await startRound(true);
  await observe(touch);
  const cdp = await touch.context().newCDPSession(touch);
  for (const [trayY, x] of [[120, 337], [270, 470], [430, 630]]) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 808, y: trayY, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 174, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await touch.touchscreen.tap(808, 270);
  assert.equal(await touch.evaluate(() => window.egretGame.app.round.tray[1].turns), 0, 'A queued piece cannot rotate');
  assert.deepEqual((await finish(touch)).map(({ pigment, turns, column }) => [pigment, turns, column]), [[1, 0, 0], [5, 0, 74], [2, 0, 160]]);
  console.log('Rapid keyboard and touch drops land in order, reject extra inputs, and survive a paused orientation change.');
} finally {
  await browser.close();
  await server.close();
}
