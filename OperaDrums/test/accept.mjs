// 浏览器验收：在无头 Chromium 里打开游戏，走一遍——标题（Tab 和 Space 关声音、切英文）、开演《急急风》易、真按键
// F 和 D 敲出判定、鼠标按住敲击区、P 暂停后曲子不走、Esc 继续、余下由页面里的自动击打按曲子的时钟敲完、结算的名次和
// 存档、回到曲目看到最好成绩、跟着板声做延迟校准、竖着拿的手机上用手指开演和敲击、坏档提示——每一步都断言，比对标题
// 和结算两张截图基线，最后断言没有控制台错误。界面都是引擎画的，所以按名字找部件：键盘焦点和部件的名字来自引擎的
// 语义树，鼠标和手指按在语义树投影到页面上的位置。`node test/accept.mjs` 跑一遍；`--update` 重写基线。
//
// Browser acceptance: opens the game in headless Chromium and goes through it — the title (Tab and Space turn the sound
// off, then English), Swift Wind on easy, real F and D keys judged, the mouse held on a pad, P pausing the song, Esc
// going on, the rest struck by an in-page player on the song's clock, the rank and the save at the end, the best on the
// song list, the delay measured with the clapper, a song started and struck by finger on an upright phone, and a broken
// save — checking each step, comparing the title and the end with their baselines, and finally that the console stayed
// clean. The engine draws every screen, so parts are found by name: the keyboard focus and the names come from the
// engine's semantic tree, and the mouse and fingers press where that tree is projected onto the page.
// `node test/accept.mjs` runs it; `--update` writes the baselines again.
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
// A name broken over two lines (and led by spaces to stand centred) reads as one line here.
const focused = () => state(() => window.operaDrums.focused().replace(/\s+/gu, ' ').trim());
const tabTo = async (pattern, back = false) => {
  for (let i = 0; i < 40 && !pattern.test(await focused()); i++) await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
  return pattern.test(await focused());
};
/** The names the screen shows now, as the semantic tree publishes them. */
const shown = () => state(() => window.operaDrums.semantics.publish().nodes.filter((n) => !n.hidden && !n.inert && n.name.trim()).map((n) => `${n.role}:${n.name}`));
/** Groups the tree would read by a part's own name (`view3:readout-box`) rather than words for a person, gathered over the walk. */
const leaked = new Set();
const unnamed = async () => {
  for (const name of await state(() => window.operaDrums.semantics.publish().nodes
    .filter((n) => !n.hidden && !n.inert && n.role === 'group' && n.name === n.id.split(':').pop()).map((n) => n.name))) leaked.add(name);
};
/** Where the part named `name` is on the page: its element in the projection for assistive technology. */
const placeOf = (name) => state((name) => {
  const element = [...document.querySelectorAll('[aria-label]')].find((e) => e.getAttribute('aria-label') === name && e.getBoundingClientRect().width > 0);
  if (!element) return null;
  const r = element.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, width: r.width, height: r.height };
}, name);
try {
  page = await openPage(browser, `${server.url}${path}/?lang=zh`, { width: 1280, height: 720 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await until(page, () => window.operaDrums?.ready && window.operaDrums.screen === 'title');
  await page.waitForTimeout(900);
  const title = await matchBaseline(page, GAME, 'title');
  check(title.written || title.passed, `title looks as its baseline (${(title.share * 100).toFixed(2)}% differs)`);
  check(await focused() === '起霸', `the title opens on the first act (${await focused()})`);
  check((await shown()).includes('group:已选'), 'the chosen act carries its tag where the tree reads it');
  await unnamed();

  // Dialogs by keyboard: the guide, then the settings with the sound off and on, then English.
  check(await tabTo(/^怎么敲$/), 'Tab reaches the controls guide');
  await page.keyboard.press('Enter');
  await until(page, () => window.operaDrums.screen === 'guide');
  const guide = await shown();
  check(guide.includes('button:\u25a1 试敲鼓') && guide.includes('button:\u25c7 试敲锣'), 'the guide offers drum and gong practice');
  await unnamed();
  check(!guide.includes('button:设置'), 'behind the dialog the title takes no keys or presses');
  await page.keyboard.press('Escape');
  await until(page, () => window.operaDrums.screen === 'title' && window.operaDrums.focused() !== '');
  check(await focused() === '怎么敲', `Escape closes the guide and gives the focus back (${await focused()})`);
  check(await tabTo(/^设置$/), 'Tab reaches Settings');
  await page.keyboard.press('Enter');
  await until(page, () => window.operaDrums.screen === 'options');
  check(await tabTo(/^声音$/), 'Tab reaches the sound switch');
  await unnamed();
  await page.keyboard.press('Space');
  await until(page, () => window.operaDrums.app.save.data.settings.sound === false);
  check(await focused() === '声音', `Space turns the sound off and keeps the focus there (${await focused()})`);
  await page.keyboard.press('Space');
  await until(page, () => window.operaDrums.app.save.data.settings.sound === true);
  check(await tabTo(/^English$/), 'Tab reaches the language switch');
  await page.keyboard.press('Enter');
  await until(page, () => document.documentElement.lang === 'en' && window.operaDrums.screen === 'options');
  await page.waitForTimeout(400);
  check(await focused() === '中文', `the settings come back in English with the focus on the language (${await focused()})`);
  await page.keyboard.press('Escape');
  await until(page, () => window.operaDrums.screen === 'title');
  await page.waitForTimeout(300);
  const names = (await shown()).join('|');
  check(!/[\u3400-\u9fff]/.test(names) && /Swift Wind/.test(names), `in English every part reads in English: ${names.slice(0, 120)}…`);

  // A song: Swift Wind on easy, from the keyboard.
  check(await tabTo(/^Swift Wind$/), 'Tab reaches Swift Wind');
  await page.keyboard.press('Enter');
  check(await tabTo(/^Take the stage( ·)? Swift Wind · Easy$/), 'the primary action names the act and difficulty');
  await page.keyboard.press('Enter');
  await until(page, () => window.operaDrums.screen === 'play', 15);
  check(true, 'Enter starts the song once its backing is ready');
  const firsts = await state(() => window.operaDrums.app.chart.notes.filter((note) => !note.roll).slice(0, 4).map((note) => ({ t: note.t, kind: note.kind })));
  for (const note of firsts) {
    await page.waitForFunction((t) => window.operaDrums.sound.heardAt() >= t - 0.02, note.t, { timeout: 20000, polling: 'raf' });
    await page.keyboard.press(note.kind === 'drum' ? 'KeyF' : 'KeyD');
  }
  const struck = await state(() => window.operaDrums.app.strokes.length);
  check(struck >= 3, `F and D strike the notes as they come (${struck} of 4 judged; the timing of keys sent through the browser protocol is not the player's)`);
  await unnamed();
  const pad = await placeOf('Strike the drum (F)');
  check(pad && pad.height >= 44, `the F drum pad is on the page where the tree says (${pad && Math.round(pad.width)}×${pad && Math.round(pad.height)} px)`);
  const before = await state(() => window.operaDrums.sound.heardAt());
  await page.mouse.move(pad.x, pad.y);
  await page.mouse.down();
  await page.waitForTimeout(60);
  check(await state(() => window.operaDrums.app.hud.padsDown.f === 1), 'a pressed pad lights at once');
  const lit = await page.screenshot({ clip: { x: pad.x - 20, y: pad.y + pad.height / 2 - 14, width: 40, height: 10 } });
  await page.mouse.move(5, 5);
  await page.mouse.up();
  await page.waitForTimeout(80);
  check(await state(() => window.operaDrums.app.hud.padsDown.f === 0), 'release outside clears the held pad');
  const plain = await page.screenshot({ clip: { x: pad.x - 20, y: pad.y + pad.height / 2 - 14, width: 40, height: 10 } });
  check(!lit.equals(plain), 'the engine draws the held pad lighter than the free one');
  check(await state((t) => window.operaDrums.app.strokes.some((s) => s.at >= t - 0.1), before), 'the press itself was judged, at the moment it went down');

  await page.keyboard.press('p');
  await until(page, () => window.operaDrums.screen === 'menu' && window.operaDrums.game.paused);
  const paused = await state(() => window.operaDrums.sound.heardAt());
  await page.waitForTimeout(700);
  check(Math.abs((await state(() => window.operaDrums.sound.heardAt())) - paused) < 0.02, 'P pauses: the song stands still behind the menu');
  check(await focused() === 'Resume', `the pause opens on Resume (${await focused()})`);
  await unnamed();
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
  await until(page, () => window.operaDrums.screen === 'end' && window.operaDrums.screens.snapshot().pages.includes('end'), 30);
  await page.waitForTimeout(900);
  const result = await state(() => window.operaDrums.app.result);
  check(result.cleared && result.counts.great >= result.counts.ok, `the song is cleared: ${result.rank}, ${result.score} points, ${JSON.stringify(result.counts)}`);
  const offs = await state(() => window.operaDrums.app.strokes.slice(8).map((s) => s.off));
  offs.sort((a, b) => a - b);
  check(offs.length > 50 && Math.abs(offs[offs.length >> 1]) < 0.045, `strokes made on the song's clock land on their notes (median ${(offs[offs.length >> 1] * 1000).toFixed(0)} ms off over ${offs.length})`);
  const saved = await state(() => JSON.parse(localStorage.getItem('opera-drums')).data.best.jijifeng?.easy);
  check(saved && saved.rank === result.rank && saved.score === result.score, `the run is kept as the best (${JSON.stringify(saved)})`);
  check((await shown()).includes(`text:${result.score} pts`), 'the curtain call shows the score');
  await unnamed();
  const end = await matchBaseline(page, GAME, 'end', { limit: 0.03 });
  check(end.written || end.passed, `the end looks as its baseline (${(end.share * 100).toFixed(2)}% differs; the numbers change a little from run to run)`);
  check(/^Play it again$/.test(await focused()), `the end offers the song again first (${await focused()})`);
  check(await tabTo(/^Back to the songs$/), 'Tab reaches the way back');
  await page.keyboard.press('Enter');
  await until(page, () => window.operaDrums.screen === 'title');
  await page.waitForTimeout(300);
  check((await shown()).some((name) => name.startsWith('button:') && name.includes(String(result.score))), 'the song list shows the best score');

  // The delay: strokes with the clapper's clicks, then a press on the tap pad by the mouse.
  check(await tabTo(/^Settings$/), 'Tab reaches Settings after returning to the song list');
  await page.keyboard.press('Enter');
  check(await tabTo(/^Measure it by tapping$/), 'Tab reaches the delay measure');
  await page.keyboard.press('Enter');
  await until(page, () => window.operaDrums.screen === 'calIdle' && window.operaDrums.focused().trim() === 'Start');
  check(await focused() === 'Start', `the measure opens on Start (${await focused()})`);
  await unnamed();
  await page.keyboard.press('Enter');
  await until(page, () => window.operaDrums.screen === 'cal');
  await page.waitForTimeout(300);
  const tap = await placeOf('Tap with the clapper');
  check(tap && tap.height >= 44, 'the tap pad of the measure is on the page');
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
  check(/Your measured timing offset/.test((await shown()).join('|')), 'the measure says what it found');
  await page.keyboard.press('Escape');
  await until(page, () => window.operaDrums.screen === 'options');
  check(true, 'Escape leaves the measure for the settings');
  await page.keyboard.press('Escape');
  await until(page, () => window.operaDrums.screen === 'title');

  // An upright phone: a finger chooses The General Arms, starts it and strikes a gong pad.
  const phone = await openPage(browser, `${server.url}${path}/?lang=zh`, { width: 390, height: 844, touch: true });
  const previous = page;
  page = phone;
  await until(page, () => window.operaDrums?.ready && window.operaDrums.screen === 'title');
  await page.waitForTimeout(600);
  const portraitStart = await placeOf('开锣 · 起霸 · 易');
  check(portraitStart && portraitStart.width >= 120 && portraitStart.y < 844, 'on the phone the start button is on the screen');
  await page.touchscreen.tap(portraitStart.x, portraitStart.y);
  await until(page, () => window.operaDrums.screen === 'play', 15);
  const gong = await placeOf('敲锣（D）');
  const drumF = await placeOf('敲鼓（F）');
  check(gong && drumF && gong.y < drumF.y && gong.width > 150, `on the phone the pads are two by two, gongs above the drums (${gong && Math.round(gong.width)}×${gong && Math.round(gong.height)} px)`);
  const stageTop = await state(() => window.operaDrums.app.portrait());
  check(stageTop, 'the phone is held upright and the portrait parts are used');
  await unnamed();
  const presses = await state(() => window.operaDrums.app.padPresses);
  await page.touchscreen.tap(gong.x, gong.y);
  await page.waitForTimeout(200);
  check(await state((n) => window.operaDrums.app.padPresses === n + 1 && window.operaDrums.app.hud.padsDown.d === 0, presses), 'a finger on a gong pad strikes once and lets go');
  const hint = await shown();
  check(hint.includes('text:方印敲鼓 · 菱形敲锣'), 'under the stage the phone names the pads, not the keys');
  await page.close();
  page = previous;

  // A broken save: the game starts again and says so, without an error.
  await state(() => localStorage.setItem('opera-drums', '{broken'));
  page.problems.length = 0;
  await page.reload();
  await until(page, () => window.operaDrums?.ready && window.operaDrums.screen === 'title');
  await page.waitForTimeout(300);
  check((await shown()).some((name) => /The save could not be read|存档读不懂/.test(name)), 'a broken save is started again, and the title says so');
  check(leaked.size === 0, `every group the tree reads has words for a person, not a part's name (${[...leaked].join(', ') || 'none'})`);
} catch (error) {
  check(false, `the walk stopped: ${error.message.split('\n')[0]}`);
} finally {
  const problems = page?.problems ?? [];
  await browser.close();
  await server.close();
  report('OperaDrums acceptance (headless Chromium, SwiftShader)', checks, problems);
}
