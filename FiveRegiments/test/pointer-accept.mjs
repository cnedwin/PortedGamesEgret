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
      const settings = window.testInputSettings = { control: 'direction', sensitivity: 1 };
      const input = window.testInput = createInput(canvas, { settings });
      canvas.addEventListener('click', () => input.capture(true), { once: true });
    </script>` }));
  await page.goto(url);
  await page.waitForFunction(() => window.testInput);
  await page.locator('canvas').click();
  await page.waitForFunction(() => window.testInput.state.pointerLocked);
  const actual = await page.evaluate(async () => {
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
    window.testInput.clear();
    window.testInput.sample(1 / 60);
    mouse('mousemove', { movementX: 35 });
    mouse('mousedown', { button: 0 });
    const preparing = window.testInput.sample(1 / 60);
    mouse('mousemove', { movementY: -90 });
    dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    const held = window.testInput.sample(1 / 60);
    mouse('mouseup', { button: 0 });
    const released = window.testInput.sample(1 / 60);
    const after = window.testInput.sample(1 / 60);
    mouse('mousedown', { button: 0 });
    window.testInput.sample(1 / 60);
    dispatchEvent(new Event('blur'));
    mouse('mouseup', { button: 0 });
    const canceled = window.testInput.sample(1 / 60);
    tap(0);
    const bow = window.testInput.sample(1 / 60, { bow: true });
    dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB' }));
    tap(0);
    const continuous = window.testInput.sample(1 / 60);
    dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyB' }));
    dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB' }));
    const activeLine = () => {
      tap(0);
      return window.testInput.sample(1 / 60).line;
    };
    window.testInput.clear();
    mouse('mousemove', { movementX: -100 });
    await new Promise((resolve) => setTimeout(resolve, 130));
    mouse('mousemove', { movementX: 20 });
    const afterIdle = activeLine();
    mouse('mousemove', { movementY: -6 });
    await new Promise((resolve) => setTimeout(resolve, 130));
    mouse('mousemove', { movementY: -6 });
    const separatedFine = activeLine();
    window.testInput.clear();
    mouse('mousemove', { movementY: -100 });
    mouse('mousemove', { movementX: 24 });
    const sharpTurn = activeLine();
    window.testInput.clear();
    mouse('mousemove', { movementX: 24 });
    for (let i = 0; i < 12; i++) mouse('mousemove', { movementY: -2 });
    const fineStroke = activeLine();
    window.testInput.clear();
    window.testInputSettings.assist = true;
    mouse('mousemove', { movementX: 40 });
    mouse('mousedown', { button: 2 });
    window.testInput.sample(1 / 60, { threat: 'L' });
    mouse('mousedown', { button: 0 });
    const fromGuard = window.testInput.sample(1 / 60, { threat: 'L' });
    mouse('mouseup', { button: 0 });
    mouse('mouseup', { button: 2 });
    window.testInput.clear();
    const edge = () => {
      const sample = window.testInput.sample(1 / 60);
      return [sample.meleeLine, sample.meleeDown, sample.meleeUp];
    };
    mouse('mousemove', { movementX: 27 });
    mouse('mousedown', { button: 0 });
    edge();
    mouse('mouseup', { button: 0 });
    mouse('mousemove', { movementX: -29 });
    tap(0);
    const sameTick = [edge(), edge(), edge()];
    return { yaw, attack: [attack.attack, attack.line], guard: [guard.guard, guard.line], cleared: !next.attack && !next.guard, lines,
      short: [attack.meleeRelease, attack.meleeDown, attack.meleeUp],
      preparing: [preparing.meleeRelease, preparing.meleeDown, preparing.meleeUp, preparing.line],
      held: [held.meleeRelease, held.meleeDown, held.meleeUp, held.line],
      released: [released.meleeRelease, released.meleeDown, released.meleeUp, released.line],
      after: [after.meleeRelease, after.meleeUp], canceled: [canceled.meleeCancel, canceled.meleeUp],
      bow: bow.meleeRelease, continuous: continuous.meleeRelease, afterIdle, separatedFine, sharpTurn, fineStroke,
      fromGuard: [fromGuard.line, fromGuard.meleeLine, fromGuard.meleeDown], sameTick };
  });
  assert.ok(Math.abs(actual.yaw - (-14 * 0.0022)) < 1e-6, 'A pointer event rotates the camera once');
  assert.deepEqual(actual.attack, [true, 'R'], 'A quick attack survives the tick with its original direction');
  assert.deepEqual(actual.guard, [true, 'O'], 'A quick guard survives the tick');
  assert.ok(actual.cleared, 'A short tap does not stick into the next tick');
  assert.deepEqual(actual.lines, ['L', 'R', 'O', 'T'], 'The four raw mouse directions select four distinct lines');
  assert.deepEqual(actual.short, [true, true, true], 'A complete tap between ticks preserves both mouse edges');
  assert.deepEqual(actual.preparing, [true, true, false, 'R']);
  assert.deepEqual(actual.held, [true, false, false, 'R'], 'Camera movement and WASD do not replace the selected line');
  assert.deepEqual(actual.released, [true, false, true, 'R']);
  assert.deepEqual(actual.after, [false, false], 'A release can commit at most once');
  assert.deepEqual(actual.canceled, [true, false], 'Blur clears the gesture without treating it as a release');
  assert.equal(actual.bow, false, 'The bow keeps its existing input path');
  assert.equal(actual.continuous, false, 'Continuous attack keeps its existing input path');
  assert.equal(actual.afterIdle, 'R', 'A fresh right stroke after a pause does not inherit the old left stroke');
  assert.equal(actual.separatedFine, 'R', 'Small cursor adjustments separated by a pause do not turn into a strike direction');
  assert.equal(actual.sharpTurn, 'R', 'One clear horizontal stroke can replace the previous vertical stroke');
  assert.equal(actual.fineStroke, 'O', 'A deliberate movement made of small packets can choose an overhead cut');
  assert.deepEqual(actual.fromGuard, ['L', 'R', true], 'Guard assist and the sampled mouse attack keep separate directions');
  assert.deepEqual(actual.sameTick, [['R', false, true], ['L', true, true], [undefined, false, false]],
    'A later click sharing a tick with a prior release retains both edges and its own locked line');
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
