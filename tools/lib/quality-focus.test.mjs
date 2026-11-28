import assert from 'node:assert/strict';
import test from 'node:test';
import { launch } from './browser.mjs';
import { focusedNamedControl } from './quality-focus.mjs';

// Standalone browser fixtures, independent of any game implementation.
test('A1 detects only a connected, visible and owned active descendant', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <canvas id="surface" role="application" tabindex="0" width="320" height="180"
        aria-owns="projection" aria-activedescendant="first"></canvas>
      <div id="projection" style="position:absolute;left:8px;top:8px;width:320px;height:180px;opacity:0;pointer-events:none">
        <button id="first" tabindex="-1" style="position:absolute;left:10px;top:10px;width:120px;height:48px" aria-label="Open game"></button>
        <button id="second" tabindex="-1" style="position:absolute;left:10px;top:65px;width:120px;height:48px">Load save</button>
      </div>
      <button id="unowned" tabindex="-1" aria-label="Wrong element">Wrong</button>
      <script>
        const host = document.getElementById('surface');
        host.addEventListener('keydown', event => {
          if (event.key === 'Tab') {
            event.preventDefault();
            host.setAttribute('aria-activedescendant','second');
          }
        });
      </script>`);
    await page.keyboard.press('Tab');
    assert.deepEqual(await page.evaluate(focusedNamedControl),
      { name: 'Open game', size: 120 * 48, outline: false, activeDescendant: true });
    await page.keyboard.press('Tab');
    assert.equal((await page.evaluate(focusedNamedControl)).name, 'Load save');

    for (const invalid of ['absent', 'unowned']) {
      await page.evaluate(id => document.getElementById('surface').setAttribute('aria-activedescendant', id), invalid);
      assert.equal(await page.evaluate(focusedNamedControl), null, invalid);
    }
    await page.evaluate(() => document.getElementById('surface').setAttribute('aria-activedescendant', 'second'));
    for (const attr of ['inert', 'hidden', 'aria-hidden', 'aria-disabled']) {
      await page.evaluate(attr => document.getElementById('projection').setAttribute(attr, attr.startsWith('aria-') ? 'true' : ''), attr);
      assert.equal(await page.evaluate(focusedNamedControl), null, 'ancestor ' + attr);
      await page.evaluate(attr => document.getElementById('projection').removeAttribute(attr), attr);
    }
    await page.evaluate(() => document.getElementById('second').disabled = true);
    assert.equal(await page.evaluate(focusedNamedControl), null, 'disabled target');
    await page.evaluate(() => {
      const node = document.getElementById('second');
      node.disabled = false;
      node.style.width = '0';
      node.style.height = '0';
      node.style.padding = '0';
      node.style.border = '0';
    });
    assert.equal(await page.evaluate(focusedNamedControl), null, 'zero rectangle');
    await page.evaluate(() => document.getElementById('second').remove());
    assert.equal(await page.evaluate(focusedNamedControl), null, 'retired node');
  } finally {
    await browser.close();
  }
});

test('A1 retains ordinary DOM buttons and real descendant focus', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setContent('<button style="width:120px;height:48px;outline:2px solid blue">Ordinary button</button>');
    await page.keyboard.press('Tab');
    assert.deepEqual(await page.evaluate(focusedNamedControl),
      { name: 'Ordinary button', size: 120 * 48, outline: true, activeDescendant: false });
    await page.setContent(`
      <div id="composite" role="listbox" tabindex="0" aria-activedescendant="child" style="width:200px;height:100px">
        <div id="child" role="option" style="width:120px;height:48px">Option A</div>
      </div>`);
    await page.keyboard.press('Tab');
    assert.equal((await page.evaluate(focusedNamedControl)).name, 'Option A');
  } finally {
    await browser.close();
  }
});
