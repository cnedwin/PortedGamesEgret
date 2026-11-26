// 浏览器验收：在无头 Chromium 里走一遍——标题（与截图基线比对）、开卷读序言、展开第一案；用鼠标点证物、点词收进词囊；
// 打开卷宗，把词签拖进空位，核验（先错一处得到"两处以内不实"，再改对盖印）；人物页对名字；第一案结案。第二案里连要
// 三次提示（区域、证物、问题）；在笔录里用原生文本框写字；设置里关音乐、切英文。最后一案：所有页已核，打开判词，
// 用画布文字输入写下判词并呈上，看到终卷；字盘模式（小游戏）也能写出判词；坏档重来；竖屏也能打开。全程不许有控制台
// 错误或缺文件。`node test/accept.mjs` 跑一遍（软件渲染，慢），`--update` 重写基线。
// Browser acceptance in headless Chromium: the title (against its baseline), the prologue, the first case opened;
// evidence tapped with the mouse and a word tapped into the pouch; the dossier opened, a word slip dragged onto a
// blank, a page checked (one wrong first, for "two or fewer are wrong", then right and sealed); the names page; the
// first case closed. In the second case three hints in a row (area, evidence, question); notes written in the native
// text field; music off and English from the settings. The last case with every page sealed: the verdict written
// with the canvas text input and submitted, and the ending shown; the word board (as in a mini game) writes a verdict
// too; a broken save starts again; the tall layout opens. No console error or missing file anywhere.
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, report, serve, until } from '../../tools/lib/browser.mjs';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  path = relative(ROOT, GAME).split('\\').join('/');
const server = await serve(),
  browser = await launch(),
  checks = [],
  started = Date.now();
const check = (ok, words) => {
  checks.push([Boolean(ok), words]);
  process.stderr.write(`${((Date.now() - started) / 1000).toFixed(0)}s ${ok ? 'ok' : 'not ok'} - ${words}\n`);
};
const view = (page, fn, arg) => page.evaluate(fn, arg);
const settle = (page, ms = 700) => page.waitForTimeout(ms);
const pointOfButton = (page, name) => view(page, (name) => {
  const { app } = window.egretGame;
  const { game } = app;
  const b = app.semantics.publish().nodes.find(node => node.role === 'button' && node.name === name)?.bounds;
  if (!b) throw Error('Missing button: ' + name);
  const r = game.canvas.getBoundingClientRect();
  return {
    x: r.left + (b.x + b.width / 2) * r.width / game.width,
    y: r.top + (b.y + b.height / 2) * r.height / game.height,
    height: b.height * r.height / game.height
  };
}, name);
const url = (q) => `${server.url}${path}/index.html?seed=1&quality=low&${q}`;
const ready = (page) => until(page, () => window.egretGame?.ready && !!window.egretGame.view, 240);
// The stack of a page error goes to the log, so a failure says where it came from.
const watch = (page) => page.on('pageerror', (error) => process.stderr.write(`page error: ${error.stack?.split('\n').slice(0, 6).join(' | ')}\n`));
// Every evidence spot seen and every word collected, as a thorough player would have done.
const gather = (page, caseId) =>
  view(page, async (id) => {
    const { app } = window.egretGame;
    const rules = await import(new URL('./src/sim/rules.mjs', location.href).href);
    const { caseById } = await import(new URL('./src/sim/cases/index.mjs', location.href).href);
    const c = caseById(id),
      st = rules.caseState(app.progress(), id);
    for (const s of Object.keys(c.spots)) {
      rules.seeSpot(st, c, s);
      for (const w of rules.wordsOfSpot(c, s)) rules.collect(st, c, w);
    }
    app.save();
    return st.found.length;
  }, caseId);

let page;
const problems = [];
try {
  page = await openPage(browser, url('lang=zh'), { width: 1280, height: 720 });
  watch(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await ready(page);
  check((await view(page, () => window.egretGame.screen)) === 'title', 'the title is up');
  await settle(page, 1500);
  const title = await matchBaseline(page, GAME, 'title', { limit: 0.04 });
  check(title.written || title.passed, `the title looks as its baseline (${(title.share * 100).toFixed(2)}% differs)`);

  // Begin: the prologue, then the first case's report, then the case, all with the keyboard.
  await page.keyboard.press('Enter');
  await until(page, () => window.egretGame.screen === 'prologue', 60);
  check(true, 'Enter on the first button opens the prologue');
  await page.keyboard.press('Enter');
  await until(page, () => window.egretGame.screen === 'intro', 60);
  await page.keyboard.press('Enter');
  await until(page, () => window.egretGame.screen === 'case' && window.egretGame.view?.caseId === 'c1', 120);
  check(true, 'the report leads into the first case');
  await settle(page, 1200);

  // Old Qin's first lesson shows over the scene; a tap puts it away.
  await until(page, () => !!window.egretGame.view.teachPoint(), 30);
  const qin = await view(page, () => window.egretGame.view.teachPoint());
  await page.mouse.click(qin.x, qin.y);
  await settle(page, 300);
  check((await view(page, () => window.egretGame.view.teachPoint())) === null, 'a tap puts away Old Qin\'s lesson');

  // Tap the body in the scene with the mouse, then tap a word in its card.
  const body = await view(page, () => window.egretGame.view.spotPoint('body'));
  await page.mouse.click(body[0], body[1]);
  await until(page, () => window.egretGame.view.overlay?.kind === 'card', 60);
  await settle(page, 900);
  const word = await view(page, () => window.egretGame.view.overlay.wordRect('strangle'));
  await page.mouse.click(word.x, word.y);
  await settle(page, 400);
  check((await view(page, () => window.egretGame.app.progress().cases.c1.found)).includes('strangle'), 'a tapped word goes into the pouch');
  await page.keyboard.press('Escape');
  await settle(page, 300);
  const found = await gather(page, 'c1');
  check(found === 14, `every word of the first case can be collected (${found})`);

  // The dossier with J; drag one slip onto a blank with the mouse.
  await page.keyboard.press('j');
  await until(page, () => window.egretGame.view.overlay?.kind === 'dossier', 60);
  await view(page, () => window.egretGame.view.overlay.show('p1'));
  await view(page, () => window.egretGame.view.overlay.settled());
  await settle(page, 600);
  const drag = await view(page, () => window.egretGame.view.overlay.dragPoints('sash', 'b2'));
  await page.mouse.click(drag.from.x, drag.from.y);
  check(await view(page, () => window.egretGame.view.overlay.focus.every(item => !item.sprite.isDisposed)), 'selecting a slip keeps the blanks in the focus order alive');
  await page.mouse.click(drag.from.x, drag.from.y);
  await page.mouse.move(drag.from.x, drag.from.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(drag.from.x + ((drag.to.x - drag.from.x) * i) / 8, drag.from.y + ((drag.to.y - drag.from.y) * i) / 8);
  await page.mouse.up();
  await view(page, () => window.egretGame.view.overlay.settled());
  check((await view(page, () => window.egretGame.app.progress().cases.c1.place.p1?.b2)) === 'sash', 'a word slip dragged onto a blank stays there');
  const tap = await view(page, () => window.egretGame.view.overlay.dragPoints('aman', 'b1'));
  await page.mouse.click(tap.from.x, tap.from.y);
  await page.mouse.click(tap.to.x, tap.to.y);
  await view(page, () => window.egretGame.view.overlay.settled());
  check(await view(page, () => window.egretGame.app.progress().cases.c1.place.p1?.b1 === 'aman'), 'clicking a slip and then its blank also places it');
  await view(page, async () => {
    const d = window.egretGame.view.overlay;
    for (const [b, w] of [['b1', 'aman'], ['b3', 'sunda'], ['b4', 'skin']]) {
      d.place(b, w);
      await d.settled();
    }
    d.check();
  });
  check((await view(page, () => window.egretGame.app.progress().cases.c1.sealed)).length === 0, 'one wrong blank does not seal the page');
  check((await view(page, () => window.egretGame.view.overlay.resultText())) === '尚有两处以内不实', 'and the page says only that two or fewer are wrong');
  await view(page, async () => {
    const d = window.egretGame.view.overlay;
    d.place('b4', 'scratch');
    await d.settled();
    d.check();
  });
  check((await view(page, () => window.egretGame.app.progress().cases.c1.sealed)).includes('p1'), 'all right, the page is sealed');
  await settle(page, 1600);
  const dossier = await matchBaseline(page, GAME, 'dossier', { limit: 0.05 });
  check(dossier.written || dossier.passed, `the sealed page looks as its baseline (${(dossier.share * 100).toFixed(2)}% differs)`);
  await view(page, async () => {
    const d = window.egretGame.view.overlay;
    d.show('names');
    await d.settled();
    for (const [b, w] of [['sunda', 'sunda'], ['xiaoqi', 'xiaoqi'], ['du', 'du'], ['fenglu', 'fenglu']]) {
      d.place(b, w);
      await d.settled();
    }
    d.check();
  });
  await until(page, () => window.egretGame.screen === 'outro', 60);
  check(true, 'naming everyone closes the first case');

  // The next case: three hints, each one deeper.
  await settle(page, 600);
  await page.keyboard.press('Enter');
  await until(page, () => window.egretGame.screen === 'intro' && window.egretGame.view.arg === 'c2', 60);
  await page.keyboard.press('Enter');
  await until(page, () => window.egretGame.view?.caseId === 'c2', 120);
  await settle(page, 800);
  const levels = [];
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('h');
    await settle(page, 300);
    levels.push(await view(page, () => window.egretGame.app.progress().cases.c2.hint?.level));
  }
  check(levels.join() === '1,2,3', `three hints go area, evidence, question (${levels.join()})`);

  // Notes: the native editor, written into and kept.
  const notesPoint = await pointOfButton(page, '笔录');
  await page.mouse.click(notesPoint.x, notesPoint.y);
  await until(page, () => typeof window.egretGame.view.overlay?.edit === 'function', 60);
  const writePoint = await pointOfButton(page, '书写');
  await page.mouse.click(writePoint.x, writePoint.y);
  await until(page, () => document.activeElement?.tagName === 'TEXTAREA', 30);
  const writingArea = await view(page, () => {
    const r = document.activeElement.getBoundingClientRect();
    return { x: r.left + 20, y: r.top + 20 };
  });
  await page.keyboard.type('test');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('钱五的鞋是湿的');
  const note = 'test\n钱五的鞋是湿的';
  await page.waitForFunction((value) => window.egretGame.app.progress().cases.c2.notes === value, note, { timeout: 20_000 });
  check(true, 'mouse-opened notes handle regular keys, line breaks, and committed Chinese text');
  await page.keyboard.press('Tab');
  await until(page, () => !document.querySelector('textarea'), 10);
  await page.mouse.click(writingArea.x, writingArea.y);
  await until(page, () => document.activeElement?.tagName === 'TEXTAREA', 10);
  check(await view(page, (value) => document.activeElement.value === value, note), 'leaving notes with Tab then clicking the paper restores editing');
  const closeNote = await pointOfButton(page, '合上');
  await page.mouse.click(closeNote.x, closeNote.y);
  await until(page, () => !window.egretGame.view.overlay && !document.querySelector('textarea'), 20);
  await page.mouse.click(notesPoint.x, notesPoint.y);
  await until(page, () => typeof window.egretGame.view.overlay?.edit === 'function', 60);
  await page.mouse.click(writingArea.x, writingArea.y);
  await until(page, () => document.activeElement?.tagName === 'TEXTAREA', 30);
  check(await view(page, (value) => document.activeElement.value === value, note), 'clicking the writing area reopens the saved text');
  await page.mouse.click(closeNote.x, closeNote.y);
  await until(page, () => !window.egretGame.view.overlay && !document.querySelector('textarea'), 20);

  // Settings: music off, then English.
  await view(page, () => window.egretGame.app.overlay('settings'));
  await view(page, () => window.egretGame.app.setSetting('music', false));
  check((await page.evaluate(() => JSON.parse(localStorage.getItem('inquest-scrolls')).data.settings.music)) === false, 'music turned off and kept');
  await view(page, () => window.egretGame.app.setLanguage('en'));
  await until(page, () => !window.egretGame.busy && window.egretGame.view?.caseId === 'c2' && document.documentElement.lang === 'en', 120);
  check((await page.title()) === 'The Inquest Scrolls', 'the language switch turns the page to English');
  await until(page, () => window.egretGame.overlay === 'settings', 15);
  await page.keyboard.press('j');
  await settle(page, 300);
  check(await view(page, () => !window.egretGame.view.overlay), 'settings blocks dossier shortcuts behind its modal');
  const reset = await pointOfButton(page, 'Start over');
  await page.mouse.click(reset.x, reset.y);
  await until(page, () => window.egretGame.app.semantics.publish().nodes.some(node => node.name === 'Yes'), 10);
  await page.keyboard.press('Escape');
  await settle(page, 300);
  check(await view(page, () => window.egretGame.overlay === 'settings' && !window.egretGame.app.semantics.publish().nodes.some(node => node.name === 'Yes')),
    'Escape dismisses the reset confirmation before closing settings');
  check(await view(page, () => window.egretGame.app.progress().cases.c1.solved), 'canceling reset leaves the solved case in the save');

  // The last case: pages sealed, the verdict written with the canvas text input.
  await view(page, async () => {
    const { app } = window.egretGame;
    const rules = await import(new URL('./src/sim/rules.mjs', location.href).href);
    for (const id of ['c1', 'c2', 'c3', 'c4', 'c5']) rules.caseState(app.progress(), id).solved = true;
    const st = rules.caseState(app.progress(), 'c6');
    st.sealed = ['names', 'p1', 'p2'];
    app.setLanguage('zh');
  });
  await until(page, () => !window.egretGame.busy && document.documentElement.lang === 'zh-CN', 60);
  await settle(page, 300);
  await view(page, () => window.egretGame.app.go('case', 'c6'));
  await until(page, () => window.egretGame.view?.overlay?.kind === 'verdict', 120);
  for (const [field, text] of [['chief', '陆承恩'], ['partner', '冯禄'], ['crimes', '伪造会子，杀人灭口，伪造格目']]) {
    await view(page, (f) => window.egretGame.view.overlay.focusField(f), field);
    await until(page, () => !!document.querySelector('input, textarea'), 30);
    await page.keyboard.insertText(text);
    await page.keyboard.press(field === 'crimes' ? 'Control+Enter' : 'Enter');
    await settle(page, 300);
  }
  check((await view(page, () => window.egretGame.app.progress().cases.c6.verdict?.answers?.chief)) === '陆承恩', 'the verdict is typed into the canvas text input');
  await view(page, () => window.egretGame.view.overlay.send());
  await until(page, () => window.egretGame.screen === 'outro', 60);
  check((await view(page, () => window.egretGame.app.progress().cases.c6.solved)) === true, 'the right verdict closes the last case');
  await view(page, () => window.egretGame.app.go('ending'));
  await until(page, () => window.egretGame.screen === 'ending', 60);
  check(true, 'and the ending follows');
  problems.push(...page.problems);

  // As in a mini game: no CanvasKit (paragraphs from labels) and no text field (boards for notes and the verdict).
  const board = await openPage(browser, url('lang=zh&plain=1&board=1&case=c6'), { width: 1280, height: 720 });
  watch(board);
  await ready(board);
  await view(board, async () => {
    const { app } = window.egretGame;
    const rules = await import(new URL('./src/sim/rules.mjs', location.href).href);
    const { caseById } = await import(new URL('./src/sim/cases/index.mjs', location.href).href);
    const c = caseById('c6'),
      st = rules.caseState(app.progress(), 'c6');
    for (const s of Object.keys(c.spots)) {
      rules.seeSpot(st, c, s);
      for (const w of rules.wordsOfSpot(c, s)) rules.collect(st, c, w);
    }
    app.save();
  });
  await view(board, () => window.egretGame.view.openSpot('body'));
  await until(board, () => window.egretGame.view.overlay?.kind === 'card', 60);
  await settle(board, 800);
  const plainWord = await view(board, () => window.egretGame.view.overlay.wordRect('eightsplay'));
  check(plainWord && plainWord.x > 0, 'without CanvasKit the evidence is laid out from labels and its words can be found');
  await board.keyboard.press('Escape');
  await settle(board, 300);
  await board.keyboard.press('n');
  await until(board, () => window.egretGame.view.overlay?.kind === 'notes', 60);
  const noted = await view(board, () => window.egretGame.view.overlay.tap('冯禄', '说谎'));
  check(noted && (await view(board, () => window.egretGame.app.progress().cases.c6.notes)) === '冯禄说谎', 'notes are written on the board where there is no text field');
  check(await view(board, () => !document.querySelector('textarea, input')), 'and no platform text field is made');
  await board.keyboard.press('Escape');
  await settle(board, 300);
  await view(board, () => {
    const st = window.egretGame.app.progress().cases.c6;
    st.sealed = ['names', 'p1', 'p2'];
    window.egretGame.view.openVerdict();
  });
  await until(board, () => window.egretGame.view?.overlay?.kind === 'verdict', 60);
  const tapped = await view(board, () => window.egretGame.view.overlay.boardWrite({ chief: '陆承恩', partner: '冯禄', crimes: '伪造会子杀人' }));
  check(tapped && (await view(board, () => !document.querySelector('textarea, input'))), 'the word board writes a verdict without any text field');
  await view(board, () => window.egretGame.view.overlay.send());
  await until(board, () => window.egretGame.screen === 'outro', 60);
  check(true, 'and the board verdict is accepted');
  problems.push(...board.problems);
  await board.close();

  // A broken save starts again and says so; the tall layout opens.
  const tall = await openPage(browser, url('lang=zh'), { width: 720, height: 1280 });
  watch(tall);
  await tall.evaluate(() => localStorage.setItem('inquest-scrolls', '{broken'));
  await tall.reload();
  await ready(tall);
  check((await view(tall, () => window.egretGame.app.game.height)) === 1280, 'a tall window gets the tall layout');
  check(await view(tall, () => window.egretGame.problems.length > 0), 'a broken save is noticed and started again');
  await view(tall, () => window.egretGame.app.go('case', 'c4'));
  await until(tall, () => window.egretGame.view?.caseId === 'c4', 120);
  check(true, 'a case opens in the tall layout');
  problems.push(...tall.problems);
  await tall.close();

  // Two already-filled pages can be sealed in quick succession. Their animations must lead to one closing only.
  const rapid = await openPage(browser, url('lang=zh&case=c4'), { width: 1280, height: 720 });
  watch(rapid);
  await ready(rapid);
  await gather(rapid, 'c4');
  await view(rapid, async () => {
    const { app } = window.egretGame;
    const { caseById } = await import(new URL('./src/sim/cases/index.mjs', location.href));
    const { blanksOfPage, placeWord, checkPage } = await import(new URL('./src/sim/rules.mjs', location.href));
    const c = caseById('c4'), st = app.progress().cases.c4;
    for (const { id } of c.pages) {
      for (const blank of blanksOfPage(c, id)) placeWord(st, c, id, blank.id, blank.answer);
    }
    checkPage(st, c, 'names');
    window.caseClosingRequests = 0;
    const go = app.go;
    app.go = (name, id) => {
      if (name === 'outro' && id === 'c4') window.caseClosingRequests++;
      return go(name, id);
    };
  });
  await rapid.keyboard.press('j');
  await until(rapid, () => typeof window.egretGame.view.overlay?.settled === 'function', 30);
  await settle(rapid, 280);
  const checkPagePoint = await pointOfButton(rapid, '核验');
  await rapid.mouse.click(checkPagePoint.x, checkPagePoint.y);
  await view(rapid, async () => {
    const dossier = window.egretGame.view.overlay;
    dossier.show('p2');
    await dossier.settled();
  });
  await rapid.mouse.click(checkPagePoint.x, checkPagePoint.y);
  await until(rapid, () => window.egretGame.screen === 'outro' && window.egretGame.view.arg === 'c4', 10);
  await settle(rapid, 1400);
  check(await view(rapid, () => window.caseClosingRequests === 1), 'two quick page seals request the case closing only once');
  problems.push(...rapid.problems);
  await rapid.close();

  const short = await openPage(browser, url('lang=zh'), { width: 873, height: 325, touch: true, scale: 2.625 });
  watch(short);
  await ready(short);
  const begin = await pointOfButton(short, '开卷');
  check(begin.height >= 44, 'the title button is at least 44 CSS pixels tall on a short touch viewport');
  await short.touchscreen.tap(begin.x, begin.y);
  await until(short, () => window.egretGame.screen === 'prologue' && !window.egretGame.failed, 25);
  check(true, 'the high-DPR landscape touch opens the complete prologue');
  await view(short, () => window.egretGame.app.go('case', 'c1'));
  await until(short, () => window.egretGame.view?.caseId === 'c1' && !!window.egretGame.view.teachPoint(), 30);
  for (const name of ['笔录', '书写']) {
    const pt = await pointOfButton(short, name);
    await short.touchscreen.tap(pt.x, pt.y);
  }
  await until(short, () => document.activeElement?.tagName === 'TEXTAREA', 10);
  await short.keyboard.type('note');
  const closeTouchNote = await pointOfButton(short, '合上');
  await short.touchscreen.tap(closeTouchNote.x, closeTouchNote.y);
  await until(short, () => !window.egretGame.view.overlay && !document.querySelector('textarea'), 10);
  check(await view(short, () => window.egretGame.app.progress().cases.c1.notes === 'note'), 'one touch closes active notes and retains the text');
  problems.push(...short.problems);
  await short.close();
} catch (error) {
  check(false, `the walk stopped: ${error.message.split('\n')[0]}`);
  problems.push(...(page?.problems ?? []));
} finally {
  await browser.close();
  await server.close();
  report('InquestScrolls acceptance (headless Chromium, SwiftShader)', checks, problems);
}
