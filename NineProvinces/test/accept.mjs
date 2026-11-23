// 浏览器验收：在无头 Chromium 里把游戏走一遍——标题和设置对照截图基线、关掉音效并存下、切成英文再切回；新的征程
// 选「季汉春秋」，桃园结义的画轴展开；点平原城、出征、在地图上点南皮，军团上路围城；攻城时亲自指挥：布阵、开战、
// 四倍速、选中部队，打完看战果；存进存档位一、刷新后从标题读回同一天；手机竖屏下城池详情从底部升起；坏掉的自动
// 存档另放一边并在标题上说明——最后断言控制台没有错误。`node test/accept.mjs` 跑一遍；`--update` 重写基线。
// Browser acceptance: walks the game in headless Chromium — the title and settings against their screenshot
// baselines, the sound turned off and kept, English and back; a new campaign as Liu Bei's Han, with the scroll of the
// peach garden; Pingyuan tapped, an army mustered and sent against Nanpi on the map; the assault taken in hand:
// deployment, the fight, four times speed, a unit chosen, and the outcome; a save in slot one, read back from the title
// after a reload on the same day; on a phone held upright the city's details rising from the bottom; a broken autosave
// set aside with a notice on the title — and finally that the console stayed clean. `node test/accept.mjs` runs it;
// `--update` writes the baselines again.
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, report, serve, until } from '../../tools/lib/browser.mjs';

const GAME = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  path = relative(ROOT, GAME).split('\\').join('/');
const server = await serve(),
  browser = await launch(),
  checks = [],
  check = (ok, words) => checks.push([Boolean(ok), words]);
const state = (page, fn, arg) => page.evaluate(fn, arg);
const tapPlace = async (page, id) => {
  // The realm is large: bring the place into view first, then tap the ground beside its walls.
  await state(page, (place) => window.egretGame.look(place), id);
  await page.waitForTimeout(400);
  const p = await state(page, (place) => window.egretGame.nodeAt(place), id);
  await page.mouse.click(p.x, p.y + 12);
};
let page,
  phone;
try {
  page = await openPage(browser, `${server.url}${path}/?seed=1&lang=zh`, { width: 1280, height: 720 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await until(page, () => window.egretGame?.ready && window.egretGame.screen === 'title');
  await page.waitForTimeout(1500);
  const title = await matchBaseline(page, GAME, 'title');
  check(title.written || title.passed, `the title looks as its baseline (${(title.share * 100).toFixed(2)}% differs)`);
  check(await state(page, () => document.activeElement?.textContent === '新的征程'), 'the new campaign button holds the focus on the title');

  // Settings: the sound off, kept in the save; Escape closes.
  await page.click('.titleMenu nav .btn:nth-child(3)');
  await page.waitForTimeout(400);
  const settings = await matchBaseline(page, GAME, 'settings');
  check(settings.written || settings.passed, `the settings look as their baseline (${(settings.share * 100).toFixed(2)}% differs)`);
  await page.click('.setting:nth-of-type(2) .choice button:nth-child(2)');
  check(await state(page, () => JSON.parse(localStorage.getItem('nine-provinces')).data.settings.sound === false), 'turning the sound off is kept in the save');
  await page.keyboard.press('Escape');
  check(await state(page, () => document.querySelector('#modal').hidden), 'Escape closes the settings');

  // English and back.
  await page.click('.titleMenu nav .btn:nth-child(4)');
  await page.waitForTimeout(200);
  const english = await state(page, () => [document.documentElement.lang, [...document.querySelectorAll('.titleMenu .btn')].map((b) => b.textContent).join('|')]);
  check(english[0] === 'en' && /New campaign/.test(english[1]) && !/[\u3400-\u9fff]/.test(english[1].replace('中文', '')), `the title reads in English: ${english[1]}`);
  await page.click('.titleMenu nav .btn:nth-child(4)');
  await page.waitForTimeout(200);

  // A new campaign as Liu Bei; the peach garden unrolls.
  await page.click('.titleMenu nav .btn:nth-child(1)');
  await page.waitForTimeout(300);
  await page.click('.branch:nth-child(2)');
  check(await state(page, () => document.querySelector('.chosen b')?.textContent === '刘备'), "Liu Bei's tale is played as Liu Bei");
  await page.click('.setupPanel footer .btn.main');
  await until(page, () => window.egretGame.screen === 'play' && window.egretGame.app.dialogs.name === 'story', 10);
  check(await state(page, () => document.querySelector('#sheet h2').textContent === '桃园结义' && document.querySelector('#sheet').classList.contains('scroll')), 'the oath of the peach garden unrolls as a scroll');
  await page.click('.dlgFoot .btn.main');
  await page.waitForTimeout(300);
  await page.evaluate(() => window.egretGame.app.setPaused(true));

  // Pingyuan: its details, then an army mustered and sent against Nanpi on the map.
  await tapPlace(page, 'pingyuan');
  await page.waitForTimeout(400);
  check(await state(page, () => !document.querySelector('#side').hidden && document.querySelector('#side h2').textContent === '平原'), 'tapping Pingyuan opens its details');
  await page.click('#side .btn.main');
  await page.waitForTimeout(300);
  check(await state(page, () => window.egretGame.app.dialogs.name === 'muster' && document.querySelectorAll('.officer').length >= 3), 'the muster dialog lists the officers at Pingyuan');
  await page.click('.dlgFoot .btn.main');
  await page.waitForTimeout(300);
  const army = await state(page, () => window.egretGame.app.sel?.army);
  check(army && (await state(page, () => window.egretGame.app.mode?.kind === 'march')), 'the army is mustered and waits for a destination');
  await tapPlace(page, 'nanpi');
  await page.waitForTimeout(300);
  check(await state(page, (id) => window.egretGame.state.armies[id]?.target === 'nanpi', army), 'a tap on Nanpi sends the army against it');

  // The battle, taken in hand.
  await state(page, () => {
    for (let i = 0; i < 60 && window.egretGame.app.dialogs.name !== 'battle'; i++) {
      window.egretGame.days(1);
      if (window.egretGame.app.dialogs.name && window.egretGame.app.dialogs.name !== 'battle') window.egretGame.app.dialogs.close(true);
    }
  });
  check(await state(page, () => window.egretGame.app.dialogs.name === 'battle' && window.egretGame.app.dialogs.blocking), 'the siege of Nanpi comes to an assault to decide');
  await page.click('.dlgFoot .btn.main');
  await until(page, () => window.egretGame.screen === 'battle', 10);
  await page.waitForTimeout(600);
  check(await state(page, () => window.egretGame.battle.phase === 'deploy' && document.querySelector('.bDeploy') !== null), 'the battle opens on deployment');
  await page.click('.bDeploy .btn.main');
  await page.click('.bSide.ours .ucard');
  await page.waitForTimeout(1500);
  await page.click('.bTop .clock .spd:nth-child(4)');
  await page.waitForTimeout(1500);
  const fought = await state(page, () => ({ time: window.egretGame.battle?.battle.time ?? 0, cards: document.querySelectorAll('.ucard').length, tactics: document.querySelectorAll('.bSide.ours .tac').length }));
  check(fought.time > 3 && fought.cards >= 2 && fought.tactics >= 1, `the battle runs at four times speed with unit cards and tactics (${JSON.stringify(fought)})`);
  const field = await matchBaseline(page, GAME, 'battle', { limit: 0.35 });
  check(field.written || field.passed, `the battlefield looks much as its baseline (${(field.share * 100).toFixed(2)}% differs)`);
  await state(page, () => window.egretGame.battle?.autoFinish());
  await until(page, () => window.egretGame.screen === 'play' && window.egretGame.app.dialogs.name === 'battleResult', 20);
  check(true, 'the battle ends with its outcome');
  await page.click('.dlgFoot .btn.main');

  // A save in slot one, read back after a reload.
  await page.evaluate(() => window.egretGame.app.open('saves'));
  await page.click('.slot:nth-child(2) .btn');
  const day = await state(page, () => window.egretGame.state.day);
  check(await state(page, () => JSON.parse(localStorage.getItem('nine-provinces.1')).data.summary.faction === 'liubei'), 'the game is written into slot one');
  await page.reload();
  await until(page, () => window.egretGame?.ready && window.egretGame.screen === 'title');
  check(await state(page, () => document.querySelector('.titleMenu .btn.main')?.textContent === '继续'), 'after a reload the title offers to continue');
  await page.click('.titleMenu nav .btn:nth-child(3)');
  await page.click('.slot:nth-child(2) .btn.main');
  await until(page, () => window.egretGame.screen === 'play', 10);
  check(await state(page, (d) => window.egretGame.state.day === d && window.egretGame.state.player === 'liubei', day), 'slot one comes back on the same day');

  // In the game, English.
  await page.evaluate(() => window.egretGame.app.dialogs.close(true));
  await page.evaluate(() => window.egretGame.app.setLanguage('en'));
  check(await state(page, () => /Liu Bei/.test(document.querySelector('.realmName').textContent) && /Officers/.test(document.querySelector('.menu').textContent)), 'the top bar reads in English');

  // A phone held upright.
  phone = await openPage(browser, `${server.url}${path}/?seed=2&lang=zh&faction=caocao&branch=free`, { width: 390, height: 844, touch: true });
  await until(phone, () => window.egretGame?.ready && window.egretGame.screen === 'play');
  await phone.evaluate(() => window.egretGame.app.setPaused(true));
  await phone.waitForTimeout(600);
  const qiao = await phone.evaluate(() => window.egretGame.nodeAt('qiao'));
  await phone.touchscreen.tap(qiao.x, qiao.y);
  await phone.waitForTimeout(500);
  const sheet = await phone.evaluate(() => {
    const r = document.querySelector('#side').getBoundingClientRect();
    return { shown: !document.querySelector('#side').hidden, bottom: Math.round(r.bottom), width: Math.round(r.width) };
  });
  check(sheet.shown && sheet.bottom === 844 && sheet.width === 390, `on a phone the details rise from the bottom (${JSON.stringify(sheet)})`);
  check(await phone.evaluate(() => window.egretGame.app.stageSize.height > window.egretGame.app.stageSize.width), 'the stage stands upright on a phone');

  // A broken autosave is set aside, and the title says so.
  await page.addInitScript(() => localStorage.setItem('nine-provinces.auto', '{broken'));
  await page.goto(`${server.url}${path}/?seed=1&lang=zh`);
  await until(page, () => window.egretGame?.ready && window.egretGame.screen === 'title');
  check(await state(page, () => document.querySelector('.notice') !== null && document.querySelector('.titleMenu .btn.main')?.textContent === '新的征程'), 'a broken autosave is set aside with a notice on the title');
} catch (error) {
  check(false, `the walk stopped: ${error.message.split('\n')[0]}`);
} finally {
  const problems = [...(page?.problems ?? []), ...(phone?.problems ?? [])];
  await browser.close();
  await server.close();
  report('NineProvinces acceptance (headless Chromium, SwiftShader)', checks, problems);
}
