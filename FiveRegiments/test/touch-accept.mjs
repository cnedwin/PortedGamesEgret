import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { launch, serve } from '../../tools/lib/browser.mjs';

const server = await serve();
const browser = await launch();
try {
  const page = await browser.newPage({ hasTouch: true, viewport: { width: 873, height: 325 } });
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const importMap = html.match(/<script type="importmap">[\s\S]*?<\/script>/)?.[0];
  const url = server.url + 'FiveRegiments/touch-test.html';
  await page.route(url, (route) => route.fulfill({ contentType: 'text/html', body: `${importMap}
    <link rel="stylesheet" href="./style.css">
    <div id="frame"><canvas></canvas><div id="ui"></div></div>
    <script type="module">
      import { createInput } from './src/input.mjs';
      import { createTouchControls } from './src/hud.mjs';
      const input = createInput(document.querySelector('canvas'), { settings: { control: 'directional' } });
      const touch = createTouchControls(document.querySelector('#ui'), input);
      touch.show(true);
      window.testTouch = { input, touch };
    </script>` }));
  await page.goto(url);
  await page.waitForFunction(() => window.testTouch);
  const actual = await page.evaluate(async () => {
    const { input, touch } = window.testTouch;
    const fire = (button, type, pointerId = 1, clientX = 60, clientY = 80) =>
      document.querySelector(button).dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'touch', pointerId, clientX, clientY }));
    const sample = (threat = 'O') => input.sample(1 / 60, { threat });
    const attack = '.touch .attack', guard = '.touch .guard', stick = '.touch .stick';

    fire(attack, 'pointerdown');
    fire(attack, 'pointermove', 1, 96, 80);
    fire(attack, 'pointercancel');
    const canceled = sample().attack;
    await new Promise((resolve) => setTimeout(resolve, 70));
    sample();

    fire(attack, 'pointerdown');
    fire(attack, 'pointermove', 1, 60, 116);
    fire(attack, 'pointerup', 2);
    const secondFinger = sample().attack;
    fire(attack, 'pointerup');
    const swipe = sample();
    const repeated = sample().attack;

    fire(guard, 'pointerdown');
    fire(guard, 'pointerup');
    const tapGuard = sample();
    const guardStuck = sample().guard;

    function overhead() {
      fire(attack, 'pointerdown');
      fire(attack, 'pointermove', 1, 60, 41);
      fire(attack, 'pointerup', 1, 60, 41);
    }
    fire(guard, 'pointerdown', 2);
    overhead();
    const overlap = sample('R');
    sample('R');
    fire(guard, 'pointerup', 2);
    overhead();
    const attackOnly = sample('R');
    sample('R');

    fire(attack, 'pointerdown');
    fire(attack, 'pointermove', 1, 60, 116);
    fire(attack, 'pointerup', 1, 60, 116);
    sample();
    sample();
    fire(guard, 'pointerdown', 2);
    fire(guard, 'pointerup', 2);
    overhead();
    const fallback = sample(null);

    fire(attack, 'pointerdown');
    fire(guard, 'pointerdown', 2);
    fire(stick, 'pointerdown', 3);
    fire(stick, 'pointermove', 3, 60, 28);
    touch.show(false);
    input.clear();
    await new Promise((resolve) => setTimeout(resolve, 225));
    touch.show(true);
    const resumed = sample();
    const visibleButtons = [...document.querySelectorAll('.touch button:not([hidden])')].every((button) => {
      const bounds = button.getBoundingClientRect();
      return bounds.width >= 44 && bounds.height >= 44 && bounds.top >= 0 && bounds.bottom <= innerHeight
        && bounds.left >= 0 && bounds.right <= innerWidth;
    });
    return { canceled, secondFinger, swipe: [swipe.attack, swipe.line], repeated, visibleButtons,
      guard: [tapGuard.guard, tapGuard.line], guardStuck,
      overlap: [overlap.attack, overlap.guard, overlap.line, overlap.guardLine],
      attackOnly: [attackOnly.attack, attackOnly.guard, attackOnly.line, attackOnly.guardLine],
      fallback: [fallback.attack, fallback.guard, fallback.line, fallback.guardLine],
      resumed: [resumed.attack, resumed.guard, Math.hypot(...resumed.move)] };
  });
  assert.deepEqual(actual, {
    canceled: false, secondFinger: false, swipe: [true, 'T'], repeated: false, visibleButtons: true,
    guard: [true, 'O'], guardStuck: false, overlap: [true, true, 'O', 'R'],
    attackOnly: [true, false, 'O', undefined], fallback: [true, true, 'O', 'T'],
    resumed: [false, false, 0]
  });
  console.log('Touch cancellation, pointer ownership, quick guard, and pause/resume verified.');
} finally {
  await browser.close();
  await server.close();
}
