import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { launch, serve } from '../../tools/lib/browser.mjs';

const server = await serve();
const browser = await launch();
try {
  const page = await browser.newPage();
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const importMap = html.match(/<script type="importmap">[\s\S]*?<\/script>/)?.[0];
  assert.ok(importMap);
  const url = server.url + 'FiveRegiments/pointer-test.html';
  await page.route(url, (route) => route.fulfill({ contentType: 'text/html', body: `${importMap}
    <canvas width="400" height="250"></canvas>
    <script type="module">
      import { createInput } from './src/input.mjs';
      const canvas = document.querySelector('canvas');
      const input = window.testInput = createInput(canvas, { settings: { control: 'direction', sensitivity: 1 } });
      canvas.addEventListener('click', () => input.capture(true), { once: true });
    </script>` }));
  await page.goto(url);
  await page.waitForFunction(() => window.testInput);
  await page.locator('canvas').click();
  await page.waitForFunction(() => window.testInput.state.pointerLocked);
  const actual = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const mouse = (type, detail) => canvas.dispatchEvent(new MouseEvent(type, { bubbles: true, ...detail }));
    const tap = (button) => { mouse('mousedown', { button }); mouse('mouseup', { button }); };
    window.testInput.setYaw(0);
    mouse('mousemove', { movementX: 14 });
    const yaw = window.testInput.state.yaw;
    tap(0);
    mouse('mousemove', { movementY: -34 });
    const attack = window.testInput.sample(1 / 60);
    tap(2);
    const guard = window.testInput.sample(1 / 60);
    const next = window.testInput.sample(1 / 60);
    const lines = [[-24, 0], [24, 0], [0, -24], [0, 24]].map(([movementX, movementY]) => {
      window.testInput.clear();
      mouse('mousemove', { movementX, movementY });
      tap(0);
      return window.testInput.sample(1 / 60).line;
    });
    return { yaw, attack: [attack.attack, attack.line], guard: [guard.guard, guard.line], cleared: !next.attack && !next.guard, lines };
  });
  assert.ok(Math.abs(actual.yaw - (-14 * 0.0022)) < 1e-6, 'A pointer event rotates the camera once');
  assert.deepEqual(actual.attack, [true, 'R'], 'A quick attack survives the tick with its original direction');
  assert.deepEqual(actual.guard, [true, 'O'], 'A quick guard survives the tick');
  assert.ok(actual.cleared, 'A short tap does not stick into the next tick');
  assert.deepEqual(actual.lines, ['L', 'R', 'O', 'T'], 'The four raw mouse directions select four distinct lines');
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.evaluate(() => window.testInput.capture(false));
  await page.waitForFunction(() => !document.pointerLockElement);
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    canvas.requestPointerLock = () => Promise.reject(new DOMException('Pointer lock rejected for this document', 'WrongDocumentError'));
    window.testInput.capture(true);
  });
  await page.locator('canvas').click();
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 50)));
  assert.deepEqual(errors, [], 'A refused pointer lock keeps click-to-fight fallback without an uncaught error');
  console.log('Pointer lock, single mouse motion and between-tick inputs verified.');
} finally {
  await browser.close();
  await server.close();
}
