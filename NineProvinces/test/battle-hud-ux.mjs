// Native DOM regression for the retained formal battle HUD. No save, engine,
// campaign shortcut or remote resource is needed; run with the repo's Playwright.
import assert from 'node:assert/strict';
import {launch, openPage, serve} from '../../tools/lib/browser.mjs';

const server = await serve();
const browser = await launch();
let page;
const checks = [];
const check = (value, name) => { assert(value, name); checks.push(name); };
try {
  const url = server.url + 'NineProvinces/__battle-hud-test__';
  page = await openPage(browser, url, {
    width: 667, height: 325,
    before: page => page.route(url, route => route.fulfill({
      contentType: 'text/html', body: '<!doctype html><main id="hud"></main>'
    }))
  });
  await page.evaluate(async () => {
    const {hudElement: h, hudButton: button, updateBattleHud} = await import('./src/ui/battle-hud.mjs');
    const root = document.querySelector('#hud');
    window.testHud = {root, generation: 0, selected: 0, ready: true, cue: false, calls: [], checked: true};
    window.renderHud = () => {
      const state = window.testHud, generation = state.generation, selected = state.selected;
      const command = button('Order ' + selected, () => state.calls.push([generation, selected]), {why: state.ready ? null : 'Unavailable'});
      command.dataset.k = 'order-' + selected;
      const execute = button('Continue', () => state.calls.push('continue')); execute.dataset.k = 'execute';
      const options = h('input', {type: 'checkbox', checked: state.checked, dataset: {k: 'options'}, onchange: e => {state.checked = e.target.checked; window.renderHud();}});
      updateBattleHud(root,
        h('aside.rail', {style: {height: '100px', width: '180px', overflow: 'auto'}},
          Array.from({length: 14}, (_, i) => h('div.row', {dataset: {k: 'row-' + i}, style: {height: '38px'}}, 'Troops ' + i + ': ' + generation))),
        h('section.command'+(state.hidden?'.concealed':''), state.cue ? h('p.cue', 'A new status') : null, command, execute, options)
      );
    };
    window.renderHud();
    window.testHud.rail = root.querySelector('.rail');
  });
  await page.mouse.move(70, 55);
  await page.mouse.wheel(0, 240);
  await page.waitForFunction(() => window.testHud.rail.scrollTop > 100);
  await page.locator('[data-k="order-0"]').focus();
  const retained = await page.evaluate(() => {
    const state = window.testHud, focused = document.activeElement, scroll = state.rail.scrollTop;
    for (let i = 1; i <= 12; i++) {state.generation = i; state.cue = i % 2 === 0; window.renderHud();}
    return {rail: state.rail === state.root.querySelector('.rail'), scroll: state.rail.scrollTop === scroll,
      focus: document.activeElement === focused, vitals: state.rail.firstChild.textContent.endsWith(': 12')};
  });
  check(retained.rail && retained.scroll && retained.focus && retained.vitals, 'scroll, focused control and rail are retained while vitals and optional status change');
  await page.keyboard.press('Enter');
  check(await page.evaluate(() => JSON.stringify(window.testHud.calls) === '[[12,0]]'), 'native keyboard action calls the latest handler exactly once');

  await page.evaluate(() => {window.testHud.ready = false; window.renderHud();});
  check(await page.evaluate(() => document.querySelector('[data-k="order-0"]').disabled && document.activeElement.dataset.k === 'execute'), 'a newly unavailable focused command moves focus to a valid continuation');
  await page.evaluate(() => document.querySelector('[data-k="order-0"]').click());
  check(await page.evaluate(() => window.testHud.calls.length === 1), 'disabled command has no retained stale action');
  await page.evaluate(() => {window.testHud.ready = true; window.renderHud();});
  await page.locator('[data-k="order-0"]').focus();
  await page.evaluate(() => {window.testHud.selected = 1; window.renderHud();});
  check(await page.evaluate(() => !document.querySelector('[data-k="order-0"]') && document.activeElement.dataset.k === 'execute'), 'a different selected unit replaces the obsolete command and preserves a valid focus target');
  await page.locator('[data-k="order-1"]').click();
  check(await page.evaluate(() => JSON.stringify(window.testHud.calls.at(-1)) === '[12,1]'), 'replacement command targets the current unit');

  await page.locator('[data-k="options"]').uncheck();
  await page.evaluate(() => {window.testHud.generation++; window.renderHud();});
  check(await page.evaluate(() => !document.querySelector('[data-k="options"]').checked && !window.testHud.checked), 'native checkbox state survives the next update');

  const command = page.locator('[data-k="order-1"]'), box = await command.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.evaluate(() => {window.testHud.pressed = document.querySelector('[data-k="order-1"]'); window.testHud.generation++; window.renderHud();});
  check(await page.evaluate(() => window.testHud.pressed === document.querySelector('[data-k="order-1"]')), 'a held command stays the same native button');
  await page.mouse.up();
  check(await page.evaluate(() => JSON.stringify(window.testHud.calls.at(-1)) === '[14,1]' && window.testHud.calls.length === 3), 'pointer release runs the current action once');
  await page.addStyleTag({content: '.command.concealed [data-k^="order-"] {display:none}'});
  await page.locator('[data-k="order-1"]').focus();
  await page.evaluate(() => {window.testHud.hidden = true; window.renderHud();});
  check(await page.evaluate(() => document.activeElement.dataset.k === 'execute'), 'an unselected unit hiding its enabled tactic moves focus to a visible command');
  check(page.problems.length === 0, 'no browser errors');
  console.log(JSON.stringify({passed: checks.length, checks}));
} finally {
  await browser.close();
  await server.close();
}
