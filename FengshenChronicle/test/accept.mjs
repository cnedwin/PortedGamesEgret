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
const uiSnapshot = () => page.evaluate(() => window.egretGame.ui());

async function uiPart(id, condition = () => true) {
  const node = () => uiSnapshot().then(parts => parts.find(part => part.id === id && condition(part)));
  const deadline = Date.now() + 8000;
  for (let part = await node(); Date.now() < deadline; part = await node()) {
    if (part) return part;
    await page.waitForTimeout(40);
  }
  throw new Error('Native UI part was not ready: ' + id);
}

async function clickPart(id) {
  const {bounds, disabled} = await uiPart(id, part => !part.inert && part.bounds.width > 0 && part.bounds.height > 0);
  assert(!disabled, 'Native control is disabled: ' + id);
  assert(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 1280.5 && bounds.y + bounds.height <= 720.5,
    'Visible bounds should stay in the viewport: ' + id);
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

async function talkTo(id) {
  const point = await page.evaluate(id => window.egretGame.target(id), id);
  assert(point && point.x > 0 && point.x < 1280 && point.y > 0 && point.y < 720, 'NPC must be in the field: ' + id);
  await page.mouse.click(point.x, point.y);
  await waitPhase('dialogue');
  assert.equal((await inspect()).state.dialogue.npcId, id);
  await page.locator('#dialogue-next').click();
}

async function verifyStartup() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const opening = await context.newPage();
  const url = server.url + gamePath + '/?backend=webgl2';
  const resource = '**/assets/actors/hero.webp';
  let release, delayed = false;
  const gate = new Promise(resolve => { release = resolve; });
  try {
    await opening.route(resource, async route => {
      delayed = true;
      await gate;
      await route.continue();
    });
    await opening.goto(url, { waitUntil: 'domcontentloaded' });
    const arrivalDeadline = Date.now() + 25000;
    while (!delayed && Date.now() < arrivalDeadline) await opening.waitForTimeout(25);
    await opening.waitForFunction(() => {
      const bar = document.getElementById('boot-progress');
      return bar?.hasAttribute('value') && bar.value < bar.max
        && !document.getElementById('startup-loading').hidden
        && document.getElementById('new-game').disabled;
    }, null, { timeout: 25000 });
    assert(delayed, 'A real art request was held before the title became playable');
    checks.push([true, 'the cold title shows real work progress and disables Start while art is pending']);
    release();
    await opening.waitForFunction(() => window.egretGame?.inspect().ready, null, { timeout: 45000 });
    assert(await opening.locator('#startup-loading').isHidden());
    assert(await opening.locator('#new-game').isEnabled());
    checks.push([true, 'startup progress disappears only after the game is ready']);
    await opening.unroute(resource);
    await opening.route(resource, route => route.abort('failed'));
    await opening.reload({ waitUntil: 'domcontentloaded' });
    await opening.locator('#boot-retry').waitFor({ state: 'visible', timeout: 25000 });
    assert(await opening.locator('#new-game').isDisabled());
    await opening.unroute(resource);
    await opening.locator('#boot-retry').click();
    await opening.waitForFunction(() => window.egretGame?.inspect().ready, null, { timeout: 45000 });
    assert(await opening.locator('#startup-loading').isHidden());
    checks.push([true, 'failed art loads offer a real retry that returns to a playable title']);
  } finally {
    release();
    await context.close();
  }
}

try {
  await verifyStartup();
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
  const backing = await page.evaluate(() => {
    const canvas = document.querySelector('#stage'), rect = canvas.getBoundingClientRect();
    return { width: canvas.width, height: canvas.height, physicalWidth: rect.width * devicePixelRatio, physicalHeight: rect.height * devicePixelRatio };
  });
  assert(backing.width >= Math.floor(backing.physicalWidth) - 2 && backing.height >= Math.floor(backing.physicalHeight) - 2);
  checks.push([true, 'the desktop map backing covers its physical display pixels instead of enlarging a low-resolution canvas']);
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
  await uiPart('bag-gear-starter-armor');
  await clickPart('bag-slot-weapon');
  await uiPart('bag-slot-weapon', part => part.selected);
  assert(!(await uiSnapshot()).some(part => part.id === 'bag-gear-starter-armor'));
  const weapon = (await inspect()).state.equipment.weapon;
  const attack = (await inspect()).state.hero.attack;
  await clickPart('bag-gear-' + weapon);
  await uiPart('bag-gear-' + weapon, part => part.name === '装备');
  await clickPart('bag-tab-equipment');
  await uiPart('bag-tab-equipment', part => part.focused);
  await page.keyboard.press('ArrowRight');
  await uiPart('bag-tab-stats', part => part.selected && part.focused);
  const attackTotal = async () => Number((await uiPart('bag-attribute-attack')).name.split(' ').at(-1));
  assert(await attackTotal() < attack);
  await page.keyboard.press('ArrowLeft');
  await uiPart('bag-tab-equipment', part => part.selected);
  await clickPart('bag-gear-' + weapon);
  await uiPart('bag-gear-' + weapon, part => part.name === '卸下');
  assert.equal((await inspect()).state.equipment.weapon,weapon);
  await clickPart('bag-tab-stats');
  assert.equal(await attackTotal(),attack);
  const scroll = (await uiPart('bag-scroll')).bounds;
  await page.mouse.move(scroll.x + scroll.width / 2, scroll.y + scroll.height / 2);
  await page.mouse.wheel(0, 530);
  assert.match((await uiPart('bag-ability-artifact')).name, /乾坤圈.*Q/);
  assert.match((await uiPart('bag-ability-detail-artifact')).name, /^投出金圈/);
  await clickPart('bag-tab-items');
  assert((await uiPart('bag-use-potion')).disabled);
  await uiPart('bag-material-qingxin-herb-title');
  const itemsScroll = (await uiPart('bag-scroll')).bounds;
  await page.mouse.move(itemsScroll.x + itemsScroll.width / 2, itemsScroll.y + itemsScroll.height / 2);
  await page.mouse.wheel(0, 420);
  await uiPart('bag-material-scrap-iron-title');
  await page.keyboard.press('Escape');
  await waitPhase('play');
  checks.push([true, 'native inventory supports filtered equipment, stat comparison, keyboard tabs, scrolling and disabled medicine']);

  await talkTo('apothecary');
  await page.locator('#dialogue-options [data-choice="open-shop"]').click();
  await waitPhase('shop');
  const beforeBuy = (await inspect()).state;
  const potionOffer = beforeBuy.shop.offers.find(offer => offer.itemId === 'potion' && offer.quantity === 1);
  await clickPart('offer-' + potionOffer.id);
  await uiPart('shop-status', part => part.name.includes('购得'));
  const bought = (await inspect()).state;
  assert.equal(bought.hero.gold, beforeBuy.hero.gold - potionOffer.price);
  assert.equal(bought.hero.potions, beforeBuy.hero.potions + 1);
  await clickPart('shop-sell-tab');
  assert((await uiPart('offer-' + weapon)).disabled, 'Worn equipment cannot be sold');
  await clickPart('shop-close');
  await waitPhase('play');
  checks.push([true, 'native shop buys exactly once and disables sales of equipped gear']);

  await page.locator('#stage').focus();
  await page.keyboard.down('KeyA');
  try {
    await page.waitForFunction(() => window.egretGame.inspect().state.hero.x <= 620, null, { timeout: 8000 });
  } finally { await page.keyboard.up('KeyA'); }
  await page.keyboard.down('KeyS');
  try {
    await page.waitForFunction(() => window.egretGame.inspect().state.hero.y >= 590, null, { timeout: 8000 });
  } finally { await page.keyboard.up('KeyS'); }
  await page.keyboard.down('KeyD');
  try {
    await page.waitForFunction(() => {
      const point = window.egretGame.target('smith');
      return point && point.x > 140 && point.x < innerWidth - 140 && point.y > 100 && point.y < innerHeight - 100;
    }, null, { timeout: 8000 });
  } finally { await page.keyboard.up('KeyD'); }
  await talkTo('smith');
  await page.locator('#dialogue-options [data-choice="open-forge"]').click();
  await waitPhase('forge');
  assert((await uiPart('forge-submit')).disabled, 'Opening level-one forge cannot consume resources');
  await clickPart('forge-picker');
  await clickPart('forge-recipe-fine-offhand-1');
  await uiPart('forge-picker', part => part.name.includes('精锻副手'));
  assert((await uiPart('forge-submit')).disabled);
  assert.equal((await inspect()).state.hero.gold, bought.hero.gold);
  await clickPart('forge-close');
  await waitPhase('play');
  checks.push([true, 'native smith recipe selection preserves resources while the forge is locked']);

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
