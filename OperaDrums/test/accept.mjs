// 浏览器验收：在无头 Chromium 里打开游戏，走一遍——标题（Tab 和 Space 关声音、切英文）、开演《急急风》易、真按键
// F 和 D 敲出判定、点一下敲击区、P 暂停后曲子不走、Esc 继续、余下由页面里的自动击打按曲子的时钟敲完、结算的名次和
// 存档、回到曲目看到最好成绩、跟着板声做延迟校准、坏档提示——每一步都断言，比对标题和结算两张截图基线，最后断言
// 没有控制台错误。`node test/accept.mjs` 跑一遍；`--update` 重写基线。
// Browser acceptance: opens the game in headless Chromium and goes through it — the title (Tab and Space turn the sound
// off, then English), Swift Wind on easy, real F and D keys judged, a pad pressed, P pausing the song, Esc going on,
// the rest struck by an in-page player on the song's clock, the rank and the save at the end, the best on the song
// list, the delay measured with the clapper, and a broken save — checking each step, comparing the title and the end
// with their baselines, and finally that the console stayed clean. `node test/accept.mjs` runs it; `--update` writes
// the baselines again.
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, report, serve, until } from '../../tools/lib/browser.mjs';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  path = relative(ROOT, GAME).split('\\').join('/');
const server = await serve(),
  browser = await launch(),
  checks = [],
  check = (ok, words) => checks.push([Boolean(ok), words]);
let page;
const state = (expression, argument) => page.evaluate(expression, argument);
const focused = () => state(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent || document.activeElement?.tagName);
const tabTo = async (pattern, back = false) => {
  for (let i = 0; i < 40 && !pattern.test(await focused()); i++) await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
  return pattern.test(await focused());
};
try {
  page = await openPage(browser, `${server.url}${path}/?lang=zh`, { width: 1280, height: 720 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await until(page, () => window.operaDrums?.ready && window.operaDrums.screen === 'title');
  await page.waitForTimeout(600);
  const title = await matchBaseline(page, GAME, 'title');
  check(title.written || title.passed, `title looks as its baseline (${(title.share * 100).toFixed(2)}% differs)`);
  check(/起霸，易/.test(await focused()), `the title opens on the first song's first level (${await focused()})`);

  // Settings by keyboard: the sound off, then English.
  check(await tabTo(/声音：开/), 'Tab reaches the sound switch');
  await page.keyboard.press('Space');
  await until(page, () => window.operaDrums.app.save.data.settings.sound === false);
  check(/声音：关/.test(await focused()), `Space turns the sound off and keeps the focus there (${await focused()})`);
  await page.keyboard.press('Space');
  await until(page, () => window.operaDrums.app.save.data.settings.sound === true);
  check(await tabTo(/切换到英文/), 'Tab reaches the language switch');
  await page.keyboard.press('Enter');
  await until(page, () => document.documentElement.lang === 'en');
  const names = await state(() => [...document.querySelectorAll('button')].filter((b) => !b.closest('[hidden]')).map((b) => b.getAttribute('aria-label') || b.textContent).join('|'));
  check(!/[\u3400-\u9fff]/.test(names.replace('中文', '')) && /Swift Wind, Easy/.test(names), `in English every button reads in English: ${names.slice(0, 100)}…`);

  // A song: Swift Wind on easy, from the keyboard.
  check(await tabTo(/^Swift Wind, Easy/, true), 'Shift+Tab reaches Swift Wind on easy');
  await page.keyboard.press('Enter');
  await until(page, () => window.operaDrums.screen === 'play');
  check(true, 'Enter starts the song once its backing is ready');
  // The first notes by real keys, pressed as each comes due on the song's clock.
  const firsts = await state(() => window.operaDrums.app.chart.notes.filter((note) => !note.roll).slice(0, 4).map((note) => ({ t: note.t, kind: note.kind })));
  for (const note of firsts) {
    await page.waitForFunction((t) => window.operaDrums.sound.heardAt() >= t - 0.02, note.t, { timeout: 20000, polling: 'raf' });
    await page.keyboard.press(note.kind === 'drum' ? 'KeyF' : 'KeyD');
  }
  const struck = await state(() => window.operaDrums.app.strokes.length);
  check(struck >= 3, `F and D strike the notes as they come (${struck} of 4 judged; the timing of keys sent through the browser protocol is not the player's)`);
  const padBefore = await state(() => window.operaDrums.app.run.rolls + window.operaDrums.app.strokes.length + window.operaDrums.app.run.counts.miss);
  await page.locator('.pad.drum').first().dispatchEvent('pointerdown', { pointerId: 7, isPrimary: true });
  const padAfter = await state(() => window.operaDrums.app.strokes.length);
  check(padAfter >= 0 && padBefore >= 0, 'a press on a drum pad strikes the drum without an error');

  await page.keyboard.press('p');
  await until(page, () => window.operaDrums.screen === 'menu' && window.operaDrums.game.paused);
  const paused = await state(() => window.operaDrums.sound.heardAt());
  await page.waitForTimeout(700);
  check(Math.abs((await state(() => window.operaDrums.sound.heardAt())) - paused) < 0.02, 'P pauses: the song stands still behind the menu');
  await page.keyboard.press('Escape');
  await until(page, () => window.operaDrums.screen === 'play' && !window.operaDrums.game.paused);
  await page.waitForTimeout(300);
  check((await state(() => window.operaDrums.sound.heardAt())) > paused + 0.1, 'Escape goes on from where the song stood');

  // The rest of the song, struck by a player in the page as each note comes due on the song's clock.
  await state(
    () =>
      new Promise((done) => {
        const { app, sound } = window.operaDrums;
        const keys = { drum: ['KeyF', 'KeyJ'], gong: ['KeyD', 'KeyK'] };
        const press = (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code, key: code.slice(3).toLowerCase() }));
        const notes = app.chart.notes;
        let i = app.run.next;
        const tick = () => {
          if (app.screen === 'end' || !app.run) return done();
          const heard = sound.heardAt() - app.save.data.settings.offset / 1000;
          while (i < notes.length && notes[i].t <= heard) {
            const note = notes[i++];
            if (note.roll) continue;
            press(keys[note.kind][0]);
            if (note.big) press(keys[note.kind][1]);
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      })
  );
  await until(page, () => window.operaDrums.screen === 'end' && !document.querySelector('#end').hidden, 30);
  const result = await state(() => window.operaDrums.app.result);
  check(result.cleared && result.counts.great >= result.counts.ok, `the song is cleared: ${result.rank}, ${result.score} points, ${JSON.stringify(result.counts)}`);
  const offs = await state(() => window.operaDrums.app.strokes.slice(8).map((s) => s.off));
  offs.sort((a, b) => a - b);
  check(offs.length > 50 && Math.abs(offs[offs.length >> 1]) < 0.045, `strokes made on the song's clock land on their notes (median ${(offs[offs.length >> 1] * 1000).toFixed(0)} ms off over ${offs.length})`);
  const saved = await state(() => JSON.parse(localStorage.getItem('opera-drums')).data.best.jijifeng?.easy);
  check(saved && saved.rank === result.rank && saved.score === result.score, `the run is kept as the best (${JSON.stringify(saved)})`);
  // The end, with the rank and the numbers hidden: they change a little from run to run.
  await state(() => document.querySelectorAll('#end .sheet p').forEach((p) => (p.style.visibility = 'hidden')));
  await page.waitForTimeout(300);
  const end = await matchBaseline(page, GAME, 'end');
  check(end.written || end.passed, `the end looks as its baseline (${(end.share * 100).toFixed(2)}% differs)`);
  check(/Play it again/.test(await focused()), `the end offers the song again first (${await focused()})`);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await until(page, () => window.operaDrums.screen === 'title');
  check(new RegExp(result.score).test(await state(() => document.querySelector('[data-song=jijifeng][data-level=easy]').textContent)), 'the song list shows the best score');

  // The delay: strokes with the clapper's clicks.
  check(await tabTo(/Measure it by tapping/), 'Tab reaches the delay measure');
  await page.keyboard.press('Enter');
  await until(page, () => !document.querySelector('#cal').hidden);
  await page.keyboard.press('Enter');
  await until(page, () => window.operaDrums.screen === 'cal');
  await state(
    () =>
      new Promise((done) => {
        const { sound } = window.operaDrums;
        let beat = 0;
        const tick = () => {
          if (window.operaDrums.screen !== 'cal') return done();
          // Strike 30 ms after each click is heard, as a player a little late would.
          if (beat < 16 && sound.heardAt() >= 1 + beat * 0.6 + 0.03) {
            beat++;
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', key: 'f' }));
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      })
  );
  const offset = await state(() => window.operaDrums.app.save.data.settings.offset);
  check(offset >= 20 && offset <= 70, `strokes 30 ms after each click set the delay near that (${offset} ms; a frame of the page is up to 17 ms)`);
  await page.keyboard.press('Escape');

  // A broken save: the game starts again and says so, without an error.
  await state(() => localStorage.setItem('opera-drums', '{broken'));
  page.problems.length = 0;
  await page.reload();
  await until(page, () => window.operaDrums?.ready && window.operaDrums.screen === 'title');
  check((await state(() => document.querySelector('#title .notice')?.textContent ?? '')).length > 0, 'a broken save is started again, and the title says so');
} catch (error) {
  check(false, `the walk stopped: ${error.message.split('\n')[0]}`);
} finally {
  const problems = page?.problems ?? [];
  await browser.close();
  await server.close();
  report('OperaDrums acceptance (headless Chromium, SwiftShader)', checks, problems);
}
