// Normal browser controls only. The diagnostic interface supplies detached observations and coordinate conversion.
// 本脚本只通过页面按钮、键盘与鼠标操作，诊断接口仅用于读取状态与坐标。
import assert from 'node:assert/strict';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, launch, matchBaseline, openPage, report, serve } from '../../tools/lib/browser.mjs';
import { MAPS } from '../src/sim/data.mjs';

const gameDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gamePath = relative(ROOT, gameDir).split('\\').join('/');
const server = await serve();
const browser = await launch();
const checks = [];
let page;
const inspect = () => page.evaluate(() => window.egretGame.inspect());
const waitPhase = phase => page.waitForFunction(phase => window.egretGame?.inspect().ready
  && window.egretGame.inspect().phase === phase, phase, { timeout: 45000 });

try {
  page = await openPage(browser, `${server.url}${gamePath}/?backend=webgl2`, { width: 1280, height: 720, reducedMotion: true });
  await waitPhase('title');
  assert.equal((await inspect()).backend, 'webgl2');
  checks.push([true, 'the native Egret 2D game boots on WebGL2 with all assets local']);
  const title = await matchBaseline(page, gameDir, 'title-desktop');
  checks.push([title.written || title.passed, `title screenshot (${(title.share * 100).toFixed(2)}% changed)`]);

  await page.locator('#new-game').click();
  const choices = page.locator('#profession-choices button');
  assert.equal(await choices.count(), 3);
  await choices.filter({hasText:'方士'}).click();
  assert.equal(await page.locator('#profession-confirm').textContent(), '以方士启程');
  await page.keyboard.press('Escape');
  assert(await page.locator('#profession-panel').isHidden());
  assert(await page.locator('#continue-game').isHidden());
  await page.locator('#new-game').click();
  await page.locator('#profession-confirm').click();
  await waitPhase('play');
  const initial = await inspect();
  assert.equal(initial.state.mapId, 'city');
  assert.equal(initial.state.quest.stage, 'unaccepted');
  assert.equal(initial.state.profession, 'guard');
  checks.push([true, 'the class selection changes the confirmation and Escape leaves the empty save untouched']);
  const city = await matchBaseline(page, gameDir, 'city-desktop');
  checks.push([city.written || city.passed, `Xiqi screenshot (${(city.share * 100).toFixed(2)}% changed)`]);

  await page.locator('#stage').focus();
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyD');
  assert((await inspect()).state.hero.x > initial.state.hero.x + 50);
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyA');
  checks.push([true, 'real keyboard input moves the character in both directions']);

  const elder = MAPS.city.npcs.find(npc => npc.id === 'elder');
  await page.locator('#track').click();
  await page.waitForFunction(({ x, y }) => {
    const hero = window.egretGame.inspect().state.hero;
    return Math.hypot(hero.x - x, hero.y - y) < 120;
  }, elder, { timeout: 10000 });
  await page.locator('#track').click();
  await page.waitForFunction(() => window.egretGame.inspect().state.quest.stage === 'hunt', null, { timeout: 10000 });
  assert((await inspect()).state.flags.artifactOwned);
  await waitPhase('dialogue');
  const heroArt = await page.locator('.dialogue-hero').boundingBox();
  const npcArt = await page.locator('.dialogue-npc').boundingBox();
  assert(heroArt && npcArt && heroArt.x < npcArt.x && heroArt.y > npcArt.y);
  await page.locator('#dialogue-next').click();
  await page.locator('#dialogue-close').click();
  await waitPhase('play');
  checks.push([true, 'the visible quest route walks to Jiang Shang, then the nearby action accepts his quest and ring']);
  checks.push([true, 'two illustrated dialogue positions and dismissal work through normal controls']);

  await page.locator('#artifact').click();
  assert((await inspect()).state.artifact.cooldown > 0);
  await page.waitForFunction(() => window.egretGame.inspect().state.artifact.phase === 'idle', null, { timeout: 6000 });
  checks.push([true, 'the visible artifact button launches the ring and it returns']);

  await page.locator('#stage').focus();
  await page.keyboard.press('KeyX');
  await page.waitForFunction(() => window.egretGame.inspect().state.hero.classCooldown > 0);
  assert((await inspect()).hud.history.some(event => event.type === 'classSkill' && event.skillId === 'shield-break'));
  checks.push([true, 'X triggers the selected class skill and starts its cooldown']);

  await page.locator('#inventory').click();
  await waitPhase('inventory');
  assert(await page.locator('#equipment-list li').count() >= 2);
  await page.locator('#equipment-slots [data-filter="weapon"]').click();
  assert.equal(await page.locator('#equipment-list .unequip').count(), 1);
  const weapon = (await inspect()).state.equipment.weapon;
  const attack = (await inspect()).state.hero.attack;
  await page.locator('#equipment-list .unequip').click();
  await page.locator('#bag-tab-equipment').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#bag-tab-stats').getAttribute('aria-selected'),'true');
  const attackTotal = page.locator('#bag-attributes [data-stat="attack"] strong');
  assert(Number(await attackTotal.textContent()) < attack);
  await page.keyboard.press('ArrowLeft');
  await page.locator('#equipment-list .equip').click();
  assert.equal((await inspect()).state.equipment.weapon,weapon);
  await page.locator('#bag-tab-stats').click();
  assert.equal(Number(await attackTotal.textContent()),attack);
  const artifactRow = page.locator('#bag-abilities li').filter({hasText:'乾坤圈'});
  assert.deepEqual(await artifactRow.locator('kbd').allTextContents(), ['Q']);
  assert.match(await artifactRow.locator('small').textContent(), /^投出金圈/);
  await page.locator('#bag-tab-items').click();
  assert(await page.locator('#bag-consumables [data-use-item="potion"]').isDisabled());
  assert(await page.locator('#bag-materials li').count() >= 2);
  await page.locator('#close-inventory').click();
  await waitPhase('play');
  checks.push([true, 'inventory tabs support keyboard selection, compare worn gear and prevent use at full health']);

  await page.locator('#pause').click();
  await waitPhase('pause');
  const frozen = (await inspect()).state.time;
  await page.waitForTimeout(300);
  assert.equal((await inspect()).state.time, frozen);
  await page.locator('#save').click();
  const saved = await inspect();
  assert(saved.hud.savedAt > 0);
  await page.locator('#return-title').click();
  await waitPhase('title');
  await page.reload();
  await waitPhase('title');
  await page.locator('#continue-game').click();
  await waitPhase('play');
  const restored = await inspect();
  assert.equal(restored.state.quest.stage, 'hunt');
  assert.equal(restored.state.flags.artifactOwned, true);
  assert.deepEqual(restored.state.inventory, saved.state.inventory);
  assert.equal(restored.state.hero.gold, saved.state.hero.gold);
  checks.push([true, 'pause freezes the simulation and a normal save survives page reload and Continue']);
  assert.deepEqual(page.problems, []);
} catch (error) {
  checks.push([false, error.stack ?? error.message]);
} finally {
  report('Fengshen Chronicle — desktop browser controls', checks, page?.problems ?? []);
  await browser.close();
  await server.close();
}
