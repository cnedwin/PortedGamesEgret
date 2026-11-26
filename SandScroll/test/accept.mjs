// 浏览器验收：在无头 Chromium 里打开游戏，走一遍固定流程——卷首、设置（关声音、切语言）、开卷、用鼠标从托盘拖一块
// 积木到沙盘上松手、轻点一块转向、用键盘选块移动落下、一条同色沙连通两墙后闪光消掉并染进手卷、暂停与继续、画成后的
// 卷尾和存档、回到卷首、坏档——断言每一步，比对卷首、设置、作画三张截图基线，最后断言没有控制台错误。
// `node test/accept.mjs` 跑一遍；`--update` 重写基线。
// Browser acceptance: opens the game in headless Chromium and walks a fixed path — the title, the settings (sound off,
// language switched), starting, dragging a piece from the dish over the tray with the mouse and letting go, a tap that
// turns a piece, picking, moving and dropping one with the keys, a strip of one colour from wall to wall that shines,
// goes and colours the scroll, pausing and resuming, the end of a finished scroll and its save, back to the title, and
// a broken save — checking each step, comparing the title, the settings and a round in play with their screenshot
// baselines, and finally that the console stayed clean. `node test/accept.mjs` runs it; `--update` writes the baselines.
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, report, serve, until } from '../../tools/lib/browser.mjs';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  path = relative(ROOT, GAME).split('\\').join('/');
const server = await serve(),
  browser = await launch(),
  checks = [],
  check = (ok, words) => checks.push([Boolean(ok), words]);
const round = (page) => page.evaluate(() => {
  const g = window.egretGame.app.round;
  return { pieces: g.pieces, grains: g.grains, cleared: g.cleared, score: g.score, falling: Boolean(g.falling), turns: g.tray.map((p) => p.turns), over: g.over };
});
// Wait until nothing falls or slides, so a picture of the tray is the same every run.
const still = (page) => until(page, () => window.egretGame.isSettled());
let page, compactPage;
try {
  page = await openPage(browser, `${server.url}${path}/?seed=1&lang=zh`, { width: 960, height: 540 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await until(page, () => window.egretGame?.ready && window.egretGame.screen === 'title');
  await page.waitForTimeout(800);
  const title = await matchBaseline(page, GAME, 'title');
  check(title.written || title.passed, `title looks as its baseline (${(title.share * 100).toFixed(2)}% differs)`);

  // Settings: the first control holds the focus; Space turns the sound off, which is saved.
  await page.evaluate(() => window.egretGame.app.go('settings'));
  await until(page, () => window.egretGame.ready && window.egretGame.screen === 'settings');
  await page.waitForTimeout(500);
  const settings = await matchBaseline(page, GAME, 'settings');
  check(settings.written || settings.passed, `settings look as their baseline (${(settings.share * 100).toFixed(2)}% differs)`);
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  check((await page.evaluate(() => window.egretGame.app.save.data.settings.sound)) === false, 'Space on the focused switch turns the sound off and saves it');
  await page.evaluate(() => window.egretGame.app.switchLanguage('en'));
  await until(page, () => window.egretGame.ready);
  check((await page.evaluate(() => document.documentElement.lang)) === 'en', 'switching to English changes the page language');
  const names = await page.evaluate(() => [...document.querySelectorAll('[role=button], button')].map((node) => node.getAttribute('aria-label') || node.textContent).join('|'));
  check(/Done/.test(names) && !/[\u3400-\u9fff]/.test(names.replace('中文', '')), `buttons read in English: ${names}`);
  await page.evaluate(() => window.egretGame.app.switchLanguage('zh'));

  // Play: Enter on the title opens the scrolls, and Enter on the first open scroll starts a round.
  await page.evaluate(() => window.egretGame.app.go('title'));
  await until(page, () => window.egretGame.ready && window.egretGame.screen === 'title');
  await page.keyboard.press('Enter');
  await until(page, () => window.egretGame.ready && window.egretGame.screen === 'pick');
  const pick = await matchBaseline(page, GAME, 'pick');
  check(pick.written || pick.passed, `the scrolls to choose look as their baseline (${(pick.share * 100).toFixed(2)}% differs)`);
  await page.keyboard.press('Enter');
  await until(page, () => window.egretGame.ready && window.egretGame.screen === 'play');
  await page.waitForTimeout(500);

  // The mouse: hold the first piece in the dish (on the right of a wide stage), drag it over the tray and let go.
  await page.mouse.move(808, 120);
  await page.mouse.down();
  for (let k = 1; k <= 10; k++) await page.mouse.move(808 - k * 34, 120 + k * 6);
  await page.waitForTimeout(200);
  await page.mouse.up();
  await until(page, () => window.egretGame.app.round.pieces === 1);
  await still(page);
  const dropped = await round(page);
  check(dropped.pieces === 1 && dropped.grains > 0 && !dropped.falling, `a dragged piece falls and breaks into sand (${dropped.grains} grains)`);

  // A tap on a piece turns it.
  const before = (await round(page)).turns[1];
  await page.mouse.click(808, 270);
  await page.waitForTimeout(300);
  const after = (await round(page)).turns[1];
  check(after === (before + 1) % 4, `a tap on the middle piece turns it (${before} → ${after})`);

  // The keys: 3 picks the last piece, the right arrow moves it, Space drops it.
  await page.keyboard.press('Digit3');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('Space');
  await until(page, () => window.egretGame.app.round.pieces === 2);
  await still(page);
  check((await round(page)).pieces === 2, 'number keys, arrows and Space pick, move and drop a piece');
  const play = await matchBaseline(page, GAME, 'play');
  check(play.written || play.passed, `a round in play looks as its baseline (${(play.share * 100).toFixed(2)}% differs)`);

  // A strip of one colour across the floor, from wall to wall: it shines, goes, scores and colours the scroll.
  await page.evaluate(() => {
    const g = window.egretGame.app.round,
      cols = 200,
      rows = 300;
    for (let x = 0; x < cols; x++) g.color[(rows - 1) * cols + x] = g.level.pigments[0];
    g.unsettled = true;
    g.dirtyTop = rows - 1;
    g.dirtyBottom = rows - 1;
  });
  await until(page, () => window.egretGame.app.round.cleared > 0);
  const cleared = await round(page);
  check(cleared.cleared >= 200 && cleared.score >= 200, `a run from wall to wall clears and scores (${cleared.cleared} grains, ${cleared.score} points)`);

  // F sets off a firecracker over the chosen column: sand is blown away and the firecracker is used.
  const beforeBoom = await page.evaluate(() => ({ grains: window.egretGame.app.round.grains, crackers: window.egretGame.app.round.crackers }));
  await page.keyboard.press('KeyF');
  await page.waitForTimeout(300);
  const afterBoom = await page.evaluate(() => ({ grains: window.egretGame.app.round.grains, crackers: window.egretGame.app.round.crackers }));
  check(afterBoom.crackers === beforeBoom.crackers - 1 && afterBoom.grains < beforeBoom.grains, `F sets off a firecracker (${beforeBoom.grains} → ${afterBoom.grains} grains)`);

  // Esc pauses; the round stands still; Esc again goes on.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const paused = await page.evaluate(() => window.egretGame.current.keys && window.egretGame.app.round.time);
  await page.waitForTimeout(600);
  const stillPaused = await page.evaluate(() => window.egretGame.app.round.time);
  check(paused === stillPaused, 'Esc pauses the round');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  check((await page.evaluate(() => window.egretGame.app.round.time)) > stillPaused, 'Esc again resumes it');

  // The painting finished: the end of the round, the score saved and the scroll marked done.
  await page.evaluate(() => {
    const g = window.egretGame.app.round;
    g.cleared = g.level.target;
  });
  await until(page, () => window.egretGame.ready && window.egretGame.screen === 'end');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('sand-scroll')).data);
  check(saved.best > 0 && saved.finished.includes('spring') && saved.plays === 1, `the score and the finished scroll are saved (best ${saved.best})`);
  await page.keyboard.press('Escape');
  await until(page, () => window.egretGame.ready && window.egretGame.screen === 'title');
  check(true, 'Escape goes back to the title');

  // The endless tray: enough score brings in cinnabar, and the round goes on past a finished painting.
  await page.evaluate(() => window.egretGame.app.go('play', { level: 3 }));
  await until(page, () => window.egretGame.ready && window.egretGame.screen === 'play');
  await page.evaluate(() => {
    const g = window.egretGame.app.round;
    g.score = 31000;
    g.cleared = g.level.target + 5;
    for (let x = 0; x < 200; x++) g.color[299 * 200 + x] = 2;
    g.unsettled = true;
  });
  await page.waitForTimeout(1500);
  const endless = await page.evaluate(() => ({ pigments: window.egretGame.app.round.pigments.length, paintings: window.egretGame.app.round.paintings, over: window.egretGame.app.round.over }));
  check(endless.pigments === 4 && endless.paintings === 1 && !endless.over, `the endless tray adds a pigment and rolls on to the next painting (${JSON.stringify(endless)})`);

  // Unpainting: the picture opens as sand; a click on a lane puts its bucket on the belt; collected to the last grain,
  // the picture is finished and saved.
  await page.evaluate(() => window.egretGame.app.go('unpaint', { level: 0 }));
  await until(page, () => window.egretGame.ready && window.egretGame.screen === 'unpaint');
  await page.waitForTimeout(600);
  const unpaint = await matchBaseline(page, GAME, 'unpaint');
  check(unpaint.written || unpaint.passed, `the unpaint picture looks as its baseline (${(unpaint.share * 100).toFixed(2)}% differs)`);
  await page.mouse.click(470, 200);
  await page.waitForTimeout(300);
  check((await page.evaluate(() => window.egretGame.app.round.belt.filter(Boolean).length)) === 1, 'a click on a lane puts its front bucket on the belt');
  await page.evaluate(async () => {
    const { chooseLane } = await import('./tools/unpaint-bot.mjs');
    const { stepUnpaint, tapLane } = await import('./src/sim/unpaint.mjs');
    const g = window.egretGame.app.round;
    let wait = 0;
    while (!g.over && g.time < 400) {
      wait -= 1 / 60;
      if (wait <= 0) {
        const lane = chooseLane(g, 1);
        if (lane >= 0 && tapLane(g, lane)) wait = 0.6;
      }
      stepUnpaint(g, 1 / 60);
    }
  });
  await until(page, () => window.egretGame.ready && window.egretGame.screen === 'end');
  const unpainted = await page.evaluate(() => JSON.parse(localStorage.getItem('sand-scroll')).data.unpainted);
  check(unpainted.includes('peak'), `the finished picture is saved (${unpainted.join(', ')})`);

  // A broken save: the game starts again and says so, without an error.
  await page.evaluate(() => localStorage.setItem('sand-scroll', '{broken'));
  page.problems.length = 0;
  await page.reload();
  await until(page, () => window.egretGame?.ready && window.egretGame.screen === 'title');
  check((await page.evaluate(() => window.egretGame.app.notice)) !== null, 'a broken save is started again, and the title says so');
  // Real phones and resized desktops letterbox the stage. The static art and live controls share one origin.
  for (const viewport of [{ width: 1280, height: 540 }, { width: 540, height: 820 }]) {
    await page.setViewportSize(viewport);
    const stageWidth = viewport.width > viewport.height ? 960 : 540;
    await page.waitForFunction((width) => window.egretGame?.ready && window.egretGame.app.stage.width === width, stageWidth);
    await page.waitForTimeout(120);
    const error = await page.evaluate(() => {
      const art = document.querySelector('#back').getBoundingClientRect(),
        game = document.querySelector('#stage').getBoundingClientRect();
      return Math.max(...['x', 'y', 'width', 'height'].map((side) => Math.abs(art[side] - game[side])));
    });
    check(error < 1, `the art and live stage are aligned at ${viewport.width}×${viewport.height} (max error ${error.toFixed(2)} CSS px)`);
  }

  compactPage = await openPage(browser, `${server.url}${path}/?seed=1&lang=zh`, { width: 873, height: 325, touch: true });
  const bounds = async (name) => {
    const button = compactPage.getByRole('button', { name, exact: true });
    await button.waitFor({ state: 'attached' });
    return button.boundingBox();
  };
  const touchTarget = ({ width, height }) => Math.min(width, height) >= 44;
  check(touchTarget(await bounds('设置')) && touchTarget(await bounds('切换到英文')), 'compact landscape title controls are at least 44 CSS px');
  await compactPage.evaluate(() => window.egretGame.app.go('play'));
  const cracker = await bounds('爆竹 ×1'),
    pause = await bounds('暂停');
  check(touchTarget(cracker) && touchTarget(pause) && pause.x + pause.width < cracker.x, 'compact landscape game controls are at least 44 CSS px and do not overlap');
  await compactPage.touchscreen.tap(pause.x + pause.width / 2, pause.y + 5);
  const resume = await bounds('继续');
  check(touchTarget(resume), 'a tap near the top of Pause opens a touch-sized modal');
  await compactPage.touchscreen.tap(resume.x + resume.width / 2, resume.y + resume.height - 5);
  const resumedAt = await compactPage.evaluate(() => window.egretGame.app.round.ticks);
  await compactPage.waitForFunction((ticks) => window.egretGame.app.round.ticks > ticks, resumedAt);
  await compactPage.getByRole('button', { name: '继续', exact: true }).waitFor({ state: 'hidden' });
  check(true, 'the lower edge of Resume restores play');

  await compactPage.evaluate(() => window.egretGame.app.go('unpaint'));
  const unpaintPause = await bounds('暂停');
  check(touchTarget(unpaintPause), 'compact landscape Unpaint pause is at least 44 CSS px');
} catch (error) {
  check(false, `the walk stopped: ${error.message.split('\n')[0]}`);
} finally {
  const problems = [...(page?.problems ?? []), ...(compactPage?.problems ?? [])];
  await browser.close();
  await server.close();
  report('SandScroll acceptance (headless Chromium, SwiftShader)', checks, problems);
}
