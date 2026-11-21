// 浏览器验收：在无头 Chromium 里打开游戏，走一遍——标题（Tab 选「高手」和「一將」再改回「東風圈」、设置里关音效、
// 切英文再切回中文）、规则面板、Enter 开局、用真按键选一张牌再打出去（轮到别人能吃碰时按 Esc 过）、P 暂停后牌局
// 不动、Esc 继续、托管打到一局结算、Enter 下一局、托管打完一圈看终局排名和战绩、回首页、坏档提示——每一步都断言，
// 比对标题和规则两张截图基线，最后断言没有控制台错误。`node test/accept.mjs` 跑一遍；`--update` 重写基线。
// Browser acceptance: opens the game in headless Chromium and goes through it — the title (Tab to Expert and to the
// full game and back to the East round, sound off in the settings, English and back), the rules, Enter to sit down,
// a tile chosen and discarded with real keys (Escape passing when a call is offered), P pausing the table, Escape
// going on, auto-play to a hand's result, Enter for the next hand, auto-play to the end of the round with the ranking
// and the record, back to the title, and a broken save — checking each step, comparing the title and the rules with
// their baselines, and finally that the console stayed clean.
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
const focused = () =>
  state(() => {
    const el = document.activeElement,
      by = el?.getAttribute('aria-labelledby');
    if (by) return by.split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
    return el?.getAttribute('aria-label') || el?.textContent?.trim() || el?.tagName;
  });
const tabTo = async (pattern, back = false) => {
  for (let i = 0; i < 60 && !pattern.test(await focused()); i++) await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
  return pattern.test(await focused());
};
const waitFor = (fn, arg, seconds = 60) => page.waitForFunction(fn, arg, { timeout: seconds * 1000 });

try {
  page = await openPage(browser, `${server.url}${path}/?seed=11&lang=zh`, { width: 1280, height: 720 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await until(page, () => window.mahjong?.ready && window.mahjong.screen === 'title');
  await page.waitForTimeout(500);
  const title = await matchBaseline(page, GAME, 'title');
  check(title.written || title.passed, `title looks as its baseline (${(title.share * 100).toFixed(2)}% differs)`);
  check(/開始打牌/.test(await focused()), `the title opens on Sit down (${await focused()})`);

  // Choices on the title by keyboard.
  check(await tabTo(/^一將/), 'Tab reaches the full game');
  await page.keyboard.press('Enter');
  await until(page, () => window.mahjong.app.save.data.setup.rounds === 4);
  check(/^一將/.test(await focused()), 'Enter chooses it and the focus stays');
  check(await tabTo(/^高手/), 'Tab reaches Expert');
  await page.keyboard.press('Space');
  await until(page, () => window.mahjong.app.save.data.setup.level === 'hard');
  check(true, 'Space chooses Expert and the save keeps it');
  check(await tabTo(/^東風圈/, true), 'Shift+Tab goes back to the East round');
  await page.keyboard.press('Enter');
  await until(page, () => window.mahjong.app.save.data.setup.rounds === 1);
  check(true, 'and Enter chooses it again');

  // Settings.
  check(await tabTo(/^設定$/), 'Tab reaches Settings');
  await page.keyboard.press('Enter');
  await until(page, () => !document.querySelector('#settings').hidden);
  check(await tabTo(/^音效/), 'Tab reaches the sound switch');
  await page.keyboard.press('Enter');
  await until(page, () => window.mahjong.app.save.data.settings.sound === false);
  check(true, 'Enter turns the sound off and the save keeps it');
  await page.keyboard.press('Escape');
  await until(page, () => document.querySelector('#settings').hidden);
  check(/^設定$/.test(await focused()), 'Escape closes the settings and the focus goes back');

  // Rules.
  check(await tabTo(/^規則與台數$/, true), 'Shift+Tab reaches the rules');
  await page.keyboard.press('Enter');
  await until(page, () => !document.querySelector('#rules').hidden);
  const rules = await state(() => document.querySelector('#rules').textContent);
  check(/門清一摸三/.test(rules) && /八仙過海/.test(rules) && /截胡/.test(rules), 'the rules list the tai and the nearest-winner rule');
  const rulesShot = await matchBaseline(page, GAME, 'rules');
  check(rulesShot.written || rulesShot.passed, `the rules look as their baseline (${(rulesShot.share * 100).toFixed(2)}% differs)`);
  await page.keyboard.press('Escape');

  // English and back.
  check(await tabTo(/切換到英文/), 'Tab reaches the language switch');
  await page.keyboard.press('Enter');
  await until(page, () => document.documentElement.lang === 'en');
  const names = await state(() => [...document.querySelectorAll('#title button')].map((b) => b.getAttribute('aria-label') || b.textContent).join('|'));
  check(!/[\u3400-\u9fff]/.test(names) && /Sit down/.test(names), `in English every title button reads in English: ${names.slice(0, 90)}…`);
  await page.keyboard.press('Enter');
  await until(page, () => document.documentElement.lang === 'zh-Hant');
  check(true, 'Enter on the same key goes back to Chinese');

  // A game.
  check(await tabTo(/^開始打牌$/, true), 'Shift+Tab goes back to Sit down');
  await page.keyboard.press('Enter');
  await until(page, () => window.mahjong.screen === 'play' && window.mahjong.app.match?.hand);
  let discarded = false,
    passed = false;
  for (let i = 0; i < 40 && !discarded; i++) {
    await waitFor(() => window.mahjong.app.human || window.mahjong.screen !== 'play', null, 60);
    if ((await state(() => window.mahjong.screen)) !== 'play') break;
    const type = await state(() => window.mahjong.app.human.options.type);
    if (type === 'act') {
      const before = await state(() => window.mahjong.app.match.hand.players[0].discards.length);
      const label = await focused();
      await page.keyboard.press('Enter');
      await until(page, () => window.mahjong.app.selected !== null);
      const raised = await state(() => document.querySelector('#handKeys button[aria-pressed="true"]')?.getAttribute('aria-label'));
      check(/手牌|剛摸的/.test(label) && raised === label, `Enter on a tile chooses it (${label})`);
      await page.keyboard.press('Enter');
      await waitFor((n) => window.mahjong.app.match.hand.players[0].discards.length > n, before, 10);
      discarded = true;
      check(true, 'Enter again discards it into the river');
    } else {
      await page.keyboard.press('Escape');
      passed = true;
    }
  }
  check(discarded, 'the player discarded with real keys');
  if (passed) check(true, 'Escape passed on an offered call');

  // Pause.
  await waitFor(() => !window.mahjong.app.human || window.mahjong.app.human.options.type === 'act', null, 30);
  await state(() => document.querySelector('#pauseButton').focus());
  await page.keyboard.press('Enter');
  await until(page, () => !document.querySelector('#menu').hidden && window.mahjong.game.paused);
  const events = await state(() => window.mahjong.app.match.hand.events.length);
  await page.waitForTimeout(1500);
  check((await state(() => window.mahjong.app.match.hand.events.length)) === events, 'paused: no one plays behind the menu');
  await page.keyboard.press('Escape');
  await until(page, () => document.querySelector('#menu').hidden && !window.mahjong.game.paused);
  check(true, 'Escape goes on');

  // Auto-play to the hand's result, faster.
  await state(() => {
    window.mahjong.game.timeScale = 6;
    window.mahjong.app.speed = 6;
    document.querySelector('#autoButton').click();
  });
  check((await state(() => document.querySelector('#autoButton').getAttribute('aria-pressed'))) === 'true', 'the auto-play switch says it is on');
  await waitFor(() => window.mahjong.screen === 'result', null, 180);
  const result = await state(() => ({ title: document.querySelector('#resultTitle').textContent, tai: document.querySelector('#resultTai').textContent, rows: document.querySelectorAll('#resultPay tr').length, sum: window.mahjong.app.match.scores.reduce((a, b) => a + b, 0) }));
  check(result.rows === 4 && result.sum === 0 && (/胡|自摸/.test(result.title) ? /台/.test(result.tai) : /流局/.test(result.title)), `the hand ends with its result, tai and payments summing to zero (${result.title})`);
  check(/下一局|看總分/.test(await focused()), 'the result offers the next hand');
  check((await state(() => JSON.parse(localStorage.getItem('taiwan-mahjong')).data.record.hands)) === 1, 'the hand is counted in the record');
  await page.keyboard.press('Enter');

  // On to the end of the round.
  for (let i = 0; i < 40; i++) {
    await waitFor(() => ['result', 'final'].includes(window.mahjong.screen), null, 240);
    if ((await state(() => window.mahjong.screen)) === 'final') break;
    await state(() => document.querySelector('#nextButton').click());
  }
  const final = await state(() => ({ ranks: [...document.querySelectorAll('#finalRanks li')].map((li) => li.textContent), me: document.querySelector('#finalRanks li.me')?.textContent }));
  check(final.ranks.length === 4 && final.me, `the round ends with the four ranked (${final.ranks.join(' / ')})`);
  const record = await state(() => JSON.parse(localStorage.getItem('taiwan-mahjong')).data.record);
  check(record.games === 1 && record.bestGame !== null && record.hands >= 4, `the record keeps the game (${record.hands} hands)`);
  check(/再來一將/.test(await focused()), `the end offers another game first (${await focused()})`);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await until(page, () => window.mahjong.screen === 'title');
  check(true, 'and then the title');

  // A broken save.
  await state(() => localStorage.setItem('taiwan-mahjong', '{broken'));
  page.problems.length = 0;
  await page.reload();
  await until(page, () => window.mahjong?.ready && window.mahjong.screen === 'title');
  check((await state(() => document.querySelector('#title .notice')?.textContent ?? '')).length > 0, 'a broken save is started again, and the title says so');
} catch (error) {
  check(false, `the walk stopped: ${error.message.split('\n')[0]}`);
} finally {
  const problems = page?.problems ?? [];
  await browser.close();
  await server.close();
  report('TaiwanMahjong acceptance (headless Chromium, SwiftShader)', checks, problems);
}
