// 浏览器验收：在无头 Chromium 里打开游戏，走一遍——标题（Tab 选难度、Space 关声音、切英文）、Enter 出海、D 键让哪吒
// 向右走、P 暂停后不动、Esc 继续、第一波打完、1 键升级、集市里用键盘买一件、选两件同阶法宝合成、两件三阶配对法宝
// 合成神器、出发去第二波、血尽失守和存档、再出海、守住第二十波解锁新的哪吒、标题上看到解锁、坏档提示——每一步都
// 断言，比对标题和结算两张截图基线，最后断言没有控制台错误。`node test/accept.mjs` 跑一遍；`--update` 重写基线。
// Browser acceptance: opens the game in headless Chromium and goes through it — the title (Tab to a danger, Space
// turning the sound off, English), Enter to set out, D moving Nezha right, P pausing, Esc going on, the first wave
// done, 1 taking a level-up, a purchase in the market by keyboard, two treasures of a tier merged, two paired third-tier
// treasures merged into a divine one, the second wave, defeat and its record, another game, the twentieth wave held
// and the forms it unlocks, the title showing them, and a broken save — checking each step, comparing the title and
// the end with their baselines, and finally that the console stayed clean.
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
const focused = () => state(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim() || document.activeElement?.tagName);
const tabTo = async (pattern, back = false) => {
  for (let i = 0; i < 60 && !pattern.test(await focused()); i++) await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
  return pattern.test(await focused());
};
try {
  page = await openPage(browser, `${server.url}${path}/?seed=11&lang=zh`, { width: 540, height: 960 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await until(page, () => window.nezhaSea?.ready && window.nezhaSea.screen === 'title');
  await page.waitForTimeout(500);
  const title = await matchBaseline(page, GAME, 'title');
  check(title.written || title.passed, `title looks as its baseline (${(title.share * 100).toFixed(2)}% differs)`);
  check(/出海/.test(await focused()), `the title opens on Set out (${await focused()})`);

  // Choices on the title by keyboard.
  check(await tabTo(/^浪急/), 'Tab reaches the second danger');
  await page.keyboard.press('Enter');
  await until(page, () => window.nezhaSea.app.danger === 1);
  check(/浪急/.test(await focused()), 'Enter chooses it and the focus stays');
  check(await tabTo(/^设置$/, true), 'Shift+Tab reaches the separate Settings dialog');
  await page.keyboard.press('Enter');
  await until(page, () => window.nezhaSea.screen === 'options');
  check(await tabTo(/声音：开/), 'Tab reaches the sound switch');
  await page.keyboard.press('Space');
  await until(page, () => window.nezhaSea.app.save.data.settings.sound === false);
  check(true, 'Space turns the sound off and keeps it');
  await page.keyboard.press('Space');
  check(await tabTo(/切换到英文/), 'Tab reaches the language switch');
  await page.keyboard.press('Enter');
  await until(page, () => document.documentElement.lang === 'en');
  await page.keyboard.press('Escape');
  await until(page, () => window.nezhaSea.screen === 'title');
  const names = await state(() => [...document.querySelectorAll('button')].filter((b) => !b.closest('[hidden]')).map((b) => b.getAttribute('aria-label') || b.textContent).join('|'));
  check(!/[\u3400-\u9fff]/.test(names.replace('中文', '')) && /Set out/.test(names), `in English every button reads in English: ${names.slice(0, 90)}…`);

  // A game.
  check(await tabTo(/^Set out$/, true), 'Shift+Tab goes back to Set out');
  await page.keyboard.press('Enter');
  await until(page, () => window.nezhaSea.screen === 'play');
  await state(() => (window.nezhaSea.app.run.player.hp = 1e6));
  const x0 = await state(() => window.nezhaSea.app.run.player.x);
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(700);
  await page.keyboard.up('KeyD');
  const x1 = await state(() => window.nezhaSea.app.run.player.x);
  check(x1 > x0 + 60, `D moves Nezha right (${x0.toFixed(0)} → ${x1.toFixed(0)})`);
  await page.keyboard.press('p');
  await until(page, () => window.nezhaSea.screen === 'menu' && window.nezhaSea.game.paused);
  const t0 = await state(() => window.nezhaSea.app.run.time);
  await page.waitForTimeout(500);
  check((await state(() => window.nezhaSea.app.run.time)) === t0, 'P pauses: nothing moves behind the menu');
  await page.keyboard.press('Escape');
  await until(page, () => window.nezhaSea.screen === 'play' && !window.nezhaSea.game.paused);
  check(true, 'Escape goes on');

  // The first wave runs out; its pearls bring a level.
  await state(() => {
    const run = window.nezhaSea.app.run;
    run.waveLeft = Math.min(run.waveLeft, 3);
    run.pending = Math.max(run.pending, 1);
  });
  await until(page, () => window.nezhaSea.screen === 'levelUp', 30);
  const levelPanel = await state(() => document.querySelector('#levelUp').textContent);
  check(/Level up/.test(levelPanel), 'the wave ends in a level-up');
  for (let i = 0; i < 8 && (await state(() => window.nezhaSea.screen)) === 'levelUp'; i++) {
    await page.keyboard.press('1');
    await page.waitForTimeout(100);
  }
  await until(page, () => window.nezhaSea.screen === 'shop');
  check(/Dragon Palace Market/.test(await state(() => document.querySelector('#shop h2').textContent)), 'then the market opens');

  // Buy something from the keyboard.
  await state(() => {
    const run = window.nezhaSea.app.run;
    run.pearls = 999;
    window.nezhaSea.refresh();
  });
  const before = await state(() => window.nezhaSea.app.run.pearls);
  check(await tabTo(/^Buy /), 'Tab reaches a purchase');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  check((await state(() => window.nezhaSea.app.run.pearls)) < before, 'Enter buys it for its pearls');

  // Merge two of a kind, then a divine pair.
  await state(() => {
    const run = window.nezhaSea.app.run;
    run.weapons = [
      { kind: 'ring', tier: 0, divine: false, cooldown: 0, angle: 0, also: 0 },
      { kind: 'ring', tier: 0, divine: false, cooldown: 0, angle: 0, also: 0 },
      { kind: 'ring', tier: 2, divine: false, cooldown: 0, angle: 0, also: 0 },
      { kind: 'ribbon', tier: 2, divine: false, cooldown: 0, angle: 0, also: 0 }
    ];
    window.nezhaSea.refresh();
  });
  check(await tabTo(/^Universe Ring · Tier 1$/), 'Tab reaches a treasure');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  check(await tabTo(/Merge into Universe Ring · Tier 2/), 'with one picked, the one it merges with says so');
  await page.keyboard.press('Enter');
  await until(page, () => window.nezhaSea.app.run.weapons.length === 3);
  check((await state(() => window.nezhaSea.app.run.weapons.find((w) => w.kind === 'ring' && w.tier === 1))) !== undefined, 'Enter merges them into the next tier');
  const slotNames = await state(() => [...document.querySelectorAll('[data-slot]')].map((b) => b.getAttribute('aria-label')).join(' | '));
  check(await tabTo(/^Universe Ring · Tier 3$/), `Tab reaches the third-tier ring (${slotNames}; focus ${await focused()})`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  check(await tabTo(/Merge into Dragon-Binding Ring/), 'the third-tier ribbon offers the divine merge');
  await page.keyboard.press('Enter');
  await until(page, () => window.nezhaSea.app.run.divines === 1);
  check((await state(() => window.nezhaSea.app.run.weapons.some((w) => w.divine && w.kind === 'bindDragon'))) === true, 'Ring and Ribbon make the Dragon-Binding Ring');

  check(await tabTo(/^Set out for wave 2$/, true), 'Shift+Tab reaches Next wave');
  await page.keyboard.press('Enter');
  await until(page, () => window.nezhaSea.screen === 'play' && window.nezhaSea.app.run.wave === 2);
  check(true, 'Enter sets out for wave 2');

  // Defeat.
  await state(() => {
    const run = window.nezhaSea.app.run;
    run.player.hp = 0.5;
    run.player.guard = 0;
    run.weapons = [];
  });
  await until(page, () => window.nezhaSea.screen === 'end' && !document.querySelector('#end').hidden, 60);
  check(/Nezha falls back/.test(await state(() => document.querySelector('#end h2').textContent)), 'with no health left Nezha falls back');
  const saved = await state(() => JSON.parse(localStorage.getItem('nezha-sea')).data);
  check(saved.best.boy?.[1] === 2 && saved.plays === 1, `the furthest wave is kept (${JSON.stringify(saved.best)})`);
  await state(() => document.querySelectorAll('#end .sheet p, #end .run-totals dd').forEach((p) => (p.style.visibility = 'hidden')));
  const end = await matchBaseline(page, GAME, 'end');
  check(end.written || end.passed, `the end looks as its baseline (${(end.share * 100).toFixed(2)}% differs)`);
  check(/Set out again/.test(await focused()), `the end offers another game first (${await focused()})`);
  await page.keyboard.press('Enter');
  await until(page, () => window.nezhaSea.screen === 'play' && window.nezhaSea.app.run.wave === 1);
  check(true, 'Enter sets out again');

  // Put the next run at wave 10 to check the introduction separately from the port's playthrough.
  await state(() => {
    const run = window.nezhaSea.app.run;
    run.wave = 10;
    run.waveLeft = 45;
    run.time = 3;
  });
  await until(page, () => !document.querySelector('#bossAnnouncement').hidden);
  check(await state(() => {
    const notice = document.querySelector('#bossAnnouncement');
    const meter = document.querySelector('#bossBar');
    return /sea yaksha/i.test(notice.textContent) && notice.getBoundingClientRect().top >= meter.getBoundingClientRect().bottom;
  }), 'the boss introduction is visible below its health bar');
  await until(page, () => document.querySelector('#bossAnnouncement').hidden);
  check(true, 'the boss introduction clears after the opening');

  // A won game: the twentieth wave's boss falls.
  await state(() => {
    const run = window.nezhaSea.app.run;
    run.player.hp = 1e6;
    run.wave = 20;
    run.bossCalled = true;
    run.boss = null;
    run.enemies = [];
  });
  await until(page, () => window.nezhaSea.screen === 'end' && !document.querySelector('#end').hidden, 30);
  const won = await state(() => document.querySelector('#end').textContent);
  check(/Chentang Pass held/.test(won) && /Unlocked: Lotus Body/.test(won) && /Unlocked: Three Heads, Six Arms/.test(won), 'holding all twenty waves unlocks both other forms');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await until(page, () => window.nezhaSea.screen === 'title');
  const locks = await state(() => [...document.querySelectorAll('[data-hero]')].map((b) => b.getAttribute('aria-disabled')));
  check(locks.every((value) => value === null), 'the title opens every form');

  // A broken save.
  await state(() => localStorage.setItem('nezha-sea', '{broken'));
  page.problems.length = 0;
  await page.reload();
  await until(page, () => window.nezhaSea?.ready && window.nezhaSea.screen === 'title');
  check((await state(() => document.querySelector('#title .notice')?.textContent ?? '')).length > 0, 'a broken save is started again, and the title says so');
} catch (error) {
  check(false, `the walk stopped: ${error.message.split('\n')[0]}`);
} finally {
  const problems = page?.problems ?? [];
  await browser.close();
  await server.close();
  report('NezhaSea acceptance (headless Chromium, SwiftShader)', checks, problems);
}
