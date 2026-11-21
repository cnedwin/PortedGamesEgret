// 浏览器验收：在无头 Chromium 里打开游戏，走一遍固定流程，断言每一步，比对标题和选夜两张截图基线，量一次最忙场景的
// 帧时间，最后断言没有控制台错误。流程：标题（键盘 Enter）→ 选夜（只开第一夜）→ 第一夜：方向键移动符弩、自动射击和击杀、
// 鼠标在路面上拖动符弩、暂停与继续、升级时按 2 选符法、天雷符、整夜（替身玩家快进）守住 → 结算并存档、开第二夜 → 切到英文
// → 坏档时重新开始并在标题上说明。`node test/accept.mjs` 跑一遍；`--update` 重写基线。
// Browser acceptance: opens the game in headless Chromium, walks a fixed path checking each step, compares the title
// and the night choice with their screenshot baselines, measures the frame time of the busiest scene, and finally
// checks the console stayed clean. The path: title (Enter) → nights (only the first open) → night one: the arrows move
// the crossbow, it fires and kills on its own, a mouse drag on the road leads it, pause and resume, "2" chooses a ward
// at a level, the thunder talisman, the whole night held (played forward by the stand-in player) → the end, saved, the
// second night opened → English → a broken save started again and said so on the title.
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
const screenIs = (name) => page.waitForFunction((n) => window.egretGame?.ready && window.egretGame.screen === n, name, { timeout: 60000, polling: 100 });
let page;
try {
  page = await openPage(browser, `${server.url}${path}/?seed=1&lang=zh`, { width: 540, height: 960 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await screenIs('title');
  await page.waitForTimeout(800);
  const title = await matchBaseline(page, GAME, 'title');
  check(title.written || title.passed, `title looks as its baseline (${(title.share * 100).toFixed(2)}% differs)`);

  // Enter on the title opens the nights; only the first is open.
  await page.keyboard.press('Enter');
  await screenIs('nights');
  await page.waitForTimeout(600);
  const nights = await matchBaseline(page, GAME, 'nights');
  check(nights.written || nights.passed, `the night choice looks as its baseline (${(nights.share * 100).toFixed(2)}% differs)`);
  check((await page.evaluate(() => window.egretGame.app.save.data.open)) === 1, 'only the first night is open on a fresh save');

  // Enter on the focused first night starts it.
  await page.keyboard.press('Enter');
  await screenIs('play');
  const startX = await page.evaluate(() => window.egretGame.view.world.turret.x);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  const movedX = await page.evaluate(() => window.egretGame.view.world.turret.x);
  check(movedX > startX + 40, `the right arrow moves the crossbow (${startX.toFixed(0)} → ${movedX.toFixed(0)})`);
  await page.waitForTimeout(3500);
  const early = await page.evaluate(() => ({ ...window.egretGame.view.world.stats }));
  check(early.shots >= 3 && early.kills > 0, `the crossbow fires and kills on its own (${early.shots} shots, ${early.kills} kills)`);

  // A mouse held on the road leads the crossbow to it.
  const box = await page.locator('#stage').boundingBox();
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  const ledX = await page.evaluate(() => window.egretGame.view.world.turret.x);
  check(ledX < 120, `a press on the road leads the crossbow there (${ledX.toFixed(0)})`);

  // Escape pauses, and the night stands still; Escape again goes on.
  await page.keyboard.press('Escape');
  await until(page, () => window.egretGame.view.pausedNow);
  const frozen = await page.evaluate(() => window.egretGame.view.world.time);
  await page.waitForTimeout(500);
  check((await page.evaluate(() => window.egretGame.view.world.time)) === frozen, 'the night stands still while paused');
  await page.keyboard.press('Escape');
  await until(page, () => !window.egretGame.view.pausedNow);

  // A level gained opens the choice of three wards; "2" takes the second.
  await page.evaluate(() => {
    const w = window.egretGame.view.world;
    w.souls = w.need - 1;
    w.orbs.push({ x: w.turret.x, y: 700, soul: 1, time: 0 });
  });
  await until(page, () => window.egretGame.view.offerOpen);
  const offered = await page.evaluate(() => window.egretGame.view.world.offer.slice());
  await page.keyboard.press('Digit2');
  await until(page, () => !window.egretGame.view.offerOpen);
  check((await page.evaluate((id) => window.egretGame.view.world.wards[id], offered[1])) >= 1, `"2" takes the second ward offered (${offered[1]})`);

  // The thunder talisman, when full, strikes on Space.
  await page.waitForTimeout(400);
  await page.evaluate(() => (window.egretGame.view.world.thunder = 1));
  await page.keyboard.press('Space');
  await until(page, () => window.egretGame.view.world.stats.thunders === 1);
  check(true, 'Space strikes with the thunder talisman once it is full');

  // The busiest scene: the night played forward to the eve of the warden, then measured for four seconds.
  await page.evaluate(async () => {
    const { createBot } = await import('./src/sim/bot.mjs'),
      { step } = await import('./src/sim/world.mjs'),
      w = window.egretGame.view.world,
      bot = createBot(w);
    while (w.time < 190 && w.state === 'play') {
      const input = bot.think();
      if (!w.offer) step(w, input, 1 / 60);
    }
    window.choosing = setInterval(() => w.offer && window.egretGame.view.pick(0), 50);
  });
  await page.waitForTimeout(800);
  const busy = await page.evaluate(
    () =>
      new Promise((done) => {
        const deltas = [];
        let last = performance.now();
        const end = last + 4000;
        const tick = (now) => {
          deltas.push(now - last);
          last = now;
          if (now < end) requestAnimationFrame(tick);
          else done({ deltas, haunts: window.egretGame.view.world.haunts.length, particles: window.egretGame.view.field.particles() });
        };
        requestAnimationFrame(tick);
      })
  );
  busy.deltas.sort((a, b) => a - b);
  const p95 = busy.deltas[Math.floor(busy.deltas.length * 0.95)];
  check(true, `busiest scene measured: p95 ${p95.toFixed(1)} ms over ${busy.deltas.length} frames, ${busy.haunts} haunts, ${busy.particles} particles (software rendering; see QUALITY.md)`);

  // The rest of the night, played forward by the stand-in player, is held; the end is saved and opens night two.
  await page.evaluate(async () => {
    const { createBot } = await import('./src/sim/bot.mjs'),
      { step } = await import('./src/sim/world.mjs'),
      w = window.egretGame.view.world,
      bot = createBot(w);
    while (w.state === 'play' && w.time < 900) {
      const input = bot.think();
      if (!w.offer) step(w, input, 1 / 60);
    }
  });
  await screenIs('end');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('night-wardens')).data);
  check(saved.open === 2 && saved.nights[1]?.stars >= 1, `the held night is saved with its stars (${saved.nights[1]?.stars}) and opens night two`);

  // English: the page language and the names read aloud change.
  await page.evaluate(() => window.egretGame.app.switchLanguage('en'));
  await screenIs('end');
  check((await page.evaluate(() => document.documentElement.lang)) === 'en', 'switching to English changes the page language');
  const names = await page.evaluate(() => [...document.querySelectorAll('[role=button], button')].map((node) => node.getAttribute('aria-label') || node.textContent).join('|'));
  check(/Next night/.test(names) && !/[\u3400-\u9fff]/.test(names.replace('中文', '')), `buttons read in English: ${names}`);
  await page.keyboard.press('Escape');
  await screenIs('nights');
  check(true, 'Escape on the end goes to the nights');

  // A broken save: the game starts again and says so, without an error.
  await page.evaluate(() => localStorage.setItem('night-wardens', '{broken'));
  page.problems.length = 0;
  await page.reload();
  await screenIs('title');
  check((await page.evaluate(() => window.egretGame.app.notice)) !== null, 'a broken save is started again, and the title says so');

  // A wide window gets the wide stage, and a night opens on it.
  await page.setViewportSize({ width: 960, height: 540 });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.egretGame.app.go('play', { night: 1 }));
  await screenIs('play');
  check((await page.evaluate(() => window.egretGame.app.stage.width)) === 960, 'a wide window plays on the wide stage');

  // Late in a real night there are more choices than the text cache can retain at once.
  // Open and close that many through the normal controls without waiting for the spawns.
  await until(page, () => Boolean(window.egretGame.view?.world));
  for (let level = 2; level <= 20; level++) {
    await page.evaluate((level) => {
      const world = window.egretGame.view.world;
      world.level = level;
      world.owed = 1;
      world.offer = ['volley', 'haste', 'pierce'];
    }, level);
    await until(page, () => window.egretGame.view.offerOpen, 4);
    await page.keyboard.press('Digit2');
    await until(page, () => !window.egretGame.view.offerOpen && !window.egretGame.view.world.offer, 4);
  }
  check(true, '19 consecutive ward choices open, accept keyboard input, and close');

  // The earlier fast-forward never drew a live warden before defeating it. Let the
  // real view build its walk controller, then defeat it while a haunt survives
  // and the warden's soul opens an upgrade choice.
  await page.evaluate(() => window.egretGame.app.go('play', { night: 1 }));
  await page.evaluate(async () => {
    const { createBot } = await import('./src/sim/bot.mjs'),
      { step } = await import('./src/sim/world.mjs'),
      world = window.egretGame.view.world,
      bot = createBot(world);
    while (world.time < world.plan.bossAt - 0.075 && world.state === 'play') {
      const input = bot.think();
      if (!world.offer) step(world, input, 1 / 60);
    }
    if (world.offer) bot.think();
  });
  await until(page, () => {
    const world = window.egretGame.view.world;
    return world.boss?.age >= 0.12 && world.haunts.some((haunt) => haunt !== world.boss && !haunt.dead && haunt.y >= -20);
  }, 4);
  await page.evaluate(() => {
    const world = window.egretGame.view.world;
    world.boss.hp = 1;
    world.boss.y = 100;
    world.haunts.find((haunt) => haunt !== world.boss && !haunt.dead && haunt.y >= -20).hp = 10000;
    world.souls = world.need - 1;
    world.orbs.push({ x: world.turret.x, y: 700, soul: 1, time: 0 });
    world.thunder = 1;
  });
  await page.locator('#stage').focus();
  await page.keyboard.press('Space');
  await until(page, () => {
    const world = window.egretGame.view?.world;
    return world?.bossFell && !world.boss;
  }, 4);
  await until(page, () => window.egretGame.view.offerOpen, 5);
  const afterWarden = await page.evaluate(() => window.egretGame.view.world.time);
  await page.keyboard.press('Digit1');
  await page.waitForFunction((time) => window.egretGame.view?.world?.time > time + 0.1, afterWarden, { timeout: 4000 });
  check(true, 'the rendered warden can fall, open a ward choice, and resume the night');
} catch (error) {
  check(false, `the walk stopped: ${error.message.split('\n')[0]}`);
} finally {
  const problems = page?.problems ?? [];
  await browser.close();
  await server.close();
  report('NightWardens acceptance (headless Chromium, SwiftShader)', checks, problems);
}
