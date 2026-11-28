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
  // Wait for the title's streamed terrain to settle, including on software WebGL.
  await until(page, async () => {
    const { land: { stream }, app: { renderer } } = window.egretGame.app.map;
    const count = stream.tiles.length, frame = renderer.info.frame;
    if (!count || stream.pendingCount) return false;
    for (let i = 0; i < 3; i++) await new Promise(requestAnimationFrame);
    return stream.tiles.length === count && !stream.pendingCount && renderer.info.frame >= frame + 2;
  }, 30);
  const title = await matchBaseline(page, GAME, 'title');
  check(title.written || title.passed, `the title looks as its baseline (${(title.share * 100).toFixed(2)}% differs)`);
  check(await state(page, () => document.activeElement?.textContent === '新的征程'), 'the new campaign button holds the focus on the title');

  // Settings: the sound off, kept in the save; Escape closes.
  await page.locator('.titleMenu nav').getByRole('button', { name: '设置', exact: true }).click();
  await page.waitForTimeout(400);
  const settings = await matchBaseline(page, GAME, 'settings');
  check(settings.written || settings.passed, `the settings look as their baseline (${(settings.share * 100).toFixed(2)}% differs)`);
  await page.getByRole('slider', { name: '配乐音量' }).press('Home');
  check(await state(page, () => JSON.parse(localStorage.getItem('nine-provinces')).data.settings.musicVolume === 0), 'the keyboard can change and persist music volume independently');
  await page.click('.setting:nth-of-type(2) .choice button:nth-child(2)');
  check(await state(page, () => JSON.parse(localStorage.getItem('nine-provinces')).data.settings.sound === false), 'turning the sound off is kept in the save');
  await page.keyboard.press('Escape');
  check(await state(page, () => document.querySelector('#modal').hidden), 'Escape closes the settings');

  // English and back.
  await page.locator('.titleMenu nav').getByRole('button', { name: 'English', exact: true }).click();
  await page.waitForTimeout(200);
  const english = await state(page, () => [document.documentElement.lang, [...document.querySelectorAll('.titleMenu .btn')].map((b) => b.textContent).join('|')]);
  check(english[0] === 'en' && /New campaign/.test(english[1]) && !/[\u3400-\u9fff]/.test(english[1].replace('中文', '')), `the title reads in English: ${english[1]}`);
  await page.locator('.titleMenu nav').getByRole('button', { name: '中文', exact: true }).click();
  await page.waitForTimeout(200);

  // A new campaign as Liu Bei; the peach garden unrolls.
  await page.click('.titleMenu nav .btn:nth-child(1)');
  await page.waitForTimeout(300);
  await page.click('.branch:nth-child(2)');
  check(await state(page, () => document.querySelector('.chosen b')?.textContent === '刘备'), "Liu Bei's tale is played as Liu Bei");
  await page.locator('.chosen .face').evaluate((image) => image.decode());
  check(await state(page, () => document.querySelector('.chosen .face')?.src.endsWith('/panel/liubei.webp')), 'campaign setup loads the assigned Liu Bei illustration');
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
  await page.locator('#side').getByRole('tab', { name: '政令' }).click({ timeout: 2000 });
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
  check(await state(page, () => window.egretGame.battle.battle.setup.presentation === 'nanpi-sunset'), 'the formal Nanpi campaign uses the sunset battlefield');
  check(await state(page, () => {
    const { battle, state } = window.egretGame;
    const side = battle.battle.setup.factions.indexOf(state.player);
    return battle.battle.units.filter(unit => unit.side === side).every(unit => !unit.autoTactic);
  }), 'taking command leaves allied tactics in the player’s hands');
  await page.locator('.bSide.ours .ucard').first().press('Enter');
  check(await state(page, () => window.egretGame.battle.phase === 'deploy'), 'Enter on a focused unit card selects the unit without starting the battle');
  await page.click('.bDeploy .btn.main');
  await page.click('.bSide.ours .ucard');
  await page.waitForTimeout(1500);
  await page.click('.bTop .clock .spd:nth-child(4)');
  await page.waitForTimeout(1500);
  const fought = await state(page, () => ({ time: window.egretGame.battle?.battle.time ?? 0, cards: document.querySelectorAll('.ucard').length, tactics: document.querySelectorAll('.bSide.ours .tac').length }));
  check(fought.time > 3 && fought.cards >= 2 && fought.tactics >= 1, `the battle runs at four times speed with unit cards and tactics (${JSON.stringify(fought)})`);
  const field = await matchBaseline(page, GAME, 'battle', { limit: 0.35, update: process.argv.includes('--update-battle') || process.argv.includes('--update') });
  check(field.written || field.passed, `the battlefield looks much as its baseline (${(field.share * 100).toFixed(2)}% differs)`);
  await page.setViewportSize({ width: 873, height: 325 });
  check(await state(page, () => {
    const rail = document.querySelector('.bSide.ours');
    const bounds = rail.getBoundingClientRect();
    const tactics = [...rail.querySelectorAll('.ucard.on .tac')];
    return getComputedStyle(rail).flexDirection === 'column' && tactics.length >= 4 && tactics.every((button) => {
      const rect = button.getBoundingClientRect();
      return rect.height >= 44 && rect.left >= bounds.left && rect.right <= bounds.right;
    });
  }), 'tactic buttons fit a scrollable vertical rail in short landscape');
  check(await state(page, () => {
    const center = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    return Boolean(center && !center.closest('#battleHud .bCommand, #battleHud .bSide'));
  }), 'the battleground center stays available beside the command rail in short landscape');
  for (const [width, height] of [[667, 375], [640, 360], [568, 320]]) {
    await page.setViewportSize({ width, height });
    const usable = await state(page, () => {
      const command = document.querySelector('#battleHud .bCommand');
      const overview = command.querySelector('.bViewTools button:last-child');
      const field = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
      const panel = command.getBoundingClientRect();
      const control = overview.getBoundingClientRect();
      const hit = document.elementFromPoint(control.x + control.width / 2, control.y + control.height / 2);
      return panel.height >= 132 && panel.right <= innerWidth && control.height >= 44 && overview.contains(hit)
        && field && !field.closest('#battleHud .bCommand, #battleHud .bSide');
    });
    check(usable, `the command rail and battleground remain usable at ${width}×${height}`);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await state(page, () => window.egretGame.battle?.autoFinish());
  await until(page, () => window.egretGame.screen === 'play' && window.egretGame.app.dialogs.name === 'battleResult', 20);
  check(true, 'the battle ends with its outcome');
  const originalResultState = await state(page, () => JSON.stringify(window.egretGame.state));
  await page.getByRole('button', { name: '回放战斗' }).click();
  await until(page, () => !!window.egretGame.app.lab);
  const timeline = page.getByRole('slider', { name: '回放时间' });
  await timeline.press('End');
  check(await timeline.evaluate(node => node.valueAsNumber > 0 && node.value === node.max), 'the replay timeline seeks to the recorded end');
  await page.keyboard.press('Escape');
  await until(page, () => !window.egretGame.app.lab);
  check(await state(page, (saved) => window.egretGame.app.dialogs.name === 'battleResult' &&
    JSON.stringify(window.egretGame.state) === saved, originalResultState), 'playing and closing the battle replay leaves the campaign unchanged');
  await page.click('.dlgFoot .btn.main');

  // A save in slot one, read back after a reload.
  await page.evaluate(() => window.egretGame.app.open('saves'));
  await page.click('.slot:nth-child(2) .btn');
  const day = await state(page, () => window.egretGame.state.day);
  check(await state(page, () => JSON.parse(localStorage.getItem('nine-provinces.1')).data.summary.faction === 'liubei'), 'the game is written into slot one');
  await page.reload();
  await until(page, () => window.egretGame?.ready && window.egretGame.screen === 'title');
  check(await state(page, () => document.querySelector('.titleMenu .btn.main')?.textContent === '继续'), 'after a reload the title offers to continue');
  const savedBeforeTrial = await state(page, () => localStorage.getItem('nine-provinces.1'));
  await page.locator('.titleMenu .nanpi-entry').click();
  await until(page, () => window.egretGame?.battle?.phase === 'deploy');
  await page.getByRole('button', {name:'离开演武',exact:true}).click();
  await until(page, () => window.egretGame.screen === 'title');
  check(await state(page, saved => localStorage.getItem('nine-provinces.1') === saved &&
    !window.egretGame.battle && document.activeElement?.classList.contains('nanpi-entry'), savedBeforeTrial),
    'entering and leaving the Nanpi trial preserves the existing slot and restores focus to its title entry');
  await page.locator('.titleMenu nav').getByRole('button', { name: '读取', exact: true }).click();
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
  await phone.getByRole('button', { name: '收起首月建议' }).tap();
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
  const city = phone.locator('#side');
  const overview = city.getByRole('tab', { name: '概况' });
  check(await overview.getAttribute('aria-selected') === 'true', 'owned city opens in its compact overview');
  check(await state(phone, () => document.querySelector('#side').offsetHeight < innerHeight * .4), 'phone city overview leaves most of the map unobstructed');
  await overview.press('ArrowRight');
  check(await city.getByRole('tab', { name: '营建' }).getAttribute('aria-selected') === 'true', 'arrow key selects the adjacent city section');
  await city.getByRole('tab', { name: '政令' }).tap();
  check(await city.getByRole('button', { name: '寻访', exact: true }).isVisible(), 'city orders are directly reachable from the fixed tabs');

  const speed = phone.locator('#campaignSpeed');
  check(await speed.evaluate(node => node.offsetWidth >= 44 && node.offsetHeight >= 44), 'phone speed selector has a readable touch target');
  const campaignClock = () => state(phone, () => ({
    speed: window.egretGame.app.speed,
    paused: window.egretGame.app.paused,
    day: window.egretGame.state.day,
  }));
  const beforeSpeed = await campaignClock();
  const pausedDay = beforeSpeed.day;
  await speed.selectOption('4');
  await phone.waitForTimeout(320);
  const afterSpeed = await campaignClock();
  check(beforeSpeed.paused && afterSpeed.speed === 4 && afterSpeed.paused && afterSpeed.day === pausedDay,
    'changing the campaign speed keeps a paused day paused (' + JSON.stringify({ beforeSpeed, afterSpeed }) + ')');
  await city.getByRole('tab', { name: '政令' }).press('Digit2');
  const afterShortcut = await campaignClock();
  check(afterShortcut.speed === 1 && afterShortcut.paused && afterShortcut.day === pausedDay,
    'the campaign speed shortcut also preserves pause (' + JSON.stringify(afterShortcut) + ')');
  check(await state(phone, () => {
    const original = document.querySelector('#campaignSpeed');
    window.egretGame.app.hud.refresh(true);
    return original === document.querySelector('#campaignSpeed');
  }), 'a HUD refresh keeps the native speed picker attached');
  const pause = phone.locator('#topbar .pause');
  await pause.tap();
  await speed.selectOption('4');
  await phone.waitForFunction((day) => !window.egretGame.app.paused && window.egretGame.state.day > day, pausedDay, { timeout: 5000 });
  check(await state(phone, () => window.egretGame.app.speed === 4 && !window.egretGame.app.paused), 'continuing advances time at the selected speed');
  await pause.tap();
  const domains = phone.locator('#territoryMapBtn');
  await domains.tap();
  check(await domains.getAttribute('aria-pressed') === 'true' && await phone.locator('#territoryLegend').isVisible(), 'turning on the political map reveals its legend');
  await domains.tap();
  check(await domains.getAttribute('aria-pressed') === 'false' && !await phone.locator('#territoryLegend').count(), 'turning off the political map hides its legend');

  await phone.setViewportSize({ width: 873, height: 325 });
  await until(phone, () => innerWidth > innerHeight);
  check(await state(phone, () => {
    const details = document.querySelector('#side');
    const hit = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    return !details.hidden && details.getBoundingClientRect().right < innerWidth / 2 && !details.contains(hit);
  }), 'sideways phone details leave the centre of the map tappable');
  check(await state(phone, () => {
    const root = document.querySelector('#side');
    const body = root.querySelector('.placeBody'), close = root.querySelector('button.x');
    body.scrollTop = body.scrollHeight;
    const box = close.getBoundingClientRect();
    return box.width >= 44 && box.height >= 44 && close.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
  }), 'sideways phone city close stays in reach while the contents scroll');

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
