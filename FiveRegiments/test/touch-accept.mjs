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
      import { createFight, step, TICK } from './src/sim/fight.mjs';
      const input = createInput(document.querySelector('canvas'), { settings: { control: 'directional' } });
      const touch = createTouchControls(document.querySelector('#ui'), input);
      touch.show(true);
      window.testTouch = { input, touch, createFight, step, TICK };
    </script>` }));
  await page.goto(url);
  await page.waitForFunction(() => window.testTouch);
  const actual = await page.evaluate(async () => {
    const { input, touch, createFight, step, TICK } = window.testTouch;
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
    const reins = () => {
      const next = input.sample(1 / 60, { mounted: true });
      return [next.reins?.throttle, next.reins?.turn, next.sprint];
    };
    input.setYaw(Math.PI);
    fire(stick, 'pointerdown', 3);
    fire(stick, 'pointermove', 3, 60, 52);
    const canter = reins();
    fire(stick, 'pointermove', 3, 60, 25);
    const gallop = reins();
    const onFoot = sample().sprint;
    fire(stick, 'pointermove', 3, 60, 135);
    const back = reins();
    fire(stick, 'pointermove', 3, 115, 80);
    const turn = reins();
    fire(stick, 'pointercancel', 3);
    const neutral = reins();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', bubbles: true }));
    const keyBack = reins();
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyS', bubbles: true }));
    const mountedFight = () => createFight({ hero: { regiment: 'plume' }, foes: [{ regiment: 'tiger' }] });
    const rideFrame = (game) => step(game, { hero: input.sample(TICK, { mounted: true }) });
    const footBattle = createFight({ hero: { regiment: 'tiger' }, foes: [{ regiment: 'yulin' }] });
    const footFrame = () => step(footBattle, { hero: input.sample(TICK) });
    footFrame();
    fire(attack, 'pointerdown');
    await new Promise((resolve) => setTimeout(resolve, 230));
    footFrame();
    const initial = footBattle.hero.act?.line;
    const aimLine = initial === 'T' ? 'O' : 'T';
    const aimY = aimLine === 'T' ? 119 : 41;
    fire(attack, 'pointermove', 1, 60, aimY);
    const footHeld = Array.from({ length: 135 }, footFrame).flat();
    const footLoad = footBattle.hero.act;
    const lateHold = [!!initial, footLoad?.line === aimLine, !!footLoad?.awaitingRelease && footLoad.held >= 0.84];
    fire(attack, 'pointerup', 1, 60, aimY);
    const footLift = Array.from({ length: 55 }, footFrame).flat();
    let battle = mountedFight();
    rideFrame(battle);
    fire(attack, 'pointerdown');
    fire(attack, 'pointermove', 1, 96, 80);
    await new Promise((resolve) => setTimeout(resolve, 230));
    const held = Array.from({ length: 135 }, () => rideFrame(battle)).flat();
    const mountLoad = [battle.hero.act?.line, battle.hero.act?.awaitingRelease, battle.hero.act?.held];
    fire(attack, 'pointerup', 1, 96, 80);
    const lifted = Array.from({ length: 45 }, () => rideFrame(battle)).flat();
    battle = mountedFight();
    fire(attack, 'pointerdown');
    await new Promise((resolve) => setTimeout(resolve, 230));
    rideFrame(battle);
    fire(attack, 'pointercancel');
    const aborted = Array.from({ length: 45 }, () => rideFrame(battle)).flat();
    const mountedCanceled = !battle.hero.act && !aborted.some((e) => e.type === 'swingRelease');
    battle = mountedFight();
    fire(attack, 'pointerdown');
    await new Promise((resolve) => setTimeout(resolve, 230));
    rideFrame(battle);
    window.dispatchEvent(new Event('blur'));
    const afterBlur = Array.from({ length: 45 }, () => rideFrame(battle)).flat();
    fire(attack, 'pointerup');
    afterBlur.push(...Array.from({ length: 45 }, () => rideFrame(battle)).flat());
    const visibleButtons = [...document.querySelectorAll('.touch button:not([hidden])')].every((button) => {
      const bounds = button.getBoundingClientRect();
      return bounds.width >= 44 && bounds.height >= 44 && bounds.top >= 0 && bounds.bottom <= innerHeight
        && bounds.left >= 0 && bounds.right <= innerWidth;
    });
    return { canceled, secondFinger, swipe: [swipe.attack, swipe.line], repeated, visibleButtons,
      lateFootAim: [...lateHold, footHeld.filter(e => e.type === 'swingRelease').length,
        footLift.filter(e => e.type === 'swingRelease' && e.line === aimLine).length],
      guard: [tapGuard.guard, tapGuard.line], guardStuck,
      overlap: [overlap.attack, overlap.guard, overlap.line, overlap.guardLine],
      attackOnly: [attackOnly.attack, attackOnly.guard, attackOnly.line, attackOnly.guardLine],
      fallback: [fallback.attack, fallback.guard, fallback.line, fallback.guardLine],
      mounted: { canter, gallop, onFoot, back, turn, neutral, keyBack },
      mountedAttack: {
        line: mountLoad[0], waitingForRelease: mountLoad[1],
        fullyCharged: mountLoad[2] >= 0.84,
        releasesWhileHeld: held.filter((e) => e.type === 'swingRelease').length,
        releasesAfterLift: lifted.filter((e) => e.type === 'swingRelease' && e.line === 'R').length,
        canceled: mountedCanceled, blurred: !battle.hero.act && !afterBlur.some((e) => e.type === 'swingRelease')
      },
      resumed: [resumed.attack, resumed.guard, Math.hypot(...resumed.move)] };
  });
  assert.deepEqual(actual, {
    canceled: false, secondFinger: false, swipe: [true, 'T'], repeated: false, visibleButtons: true,
    lateFootAim: [true, true, true, 0, 1],
    guard: [true, 'O'], guardStuck: false, overlap: [true, true, 'O', 'R'],
    attackOnly: [true, false, 'O', undefined], fallback: [true, true, 'O', 'T'],
    mounted: { canter: [0.56, 0, false], gallop: [1, 0, true], onFoot: false,
      back: [-1, 0, false], turn: [0, -1, false], neutral: [0, 0, false], keyBack: [-1, 0, false] },
    mountedAttack: { line: 'R', waitingForRelease: true, fullyCharged: true, releasesWhileHeld: 0, releasesAfterLift: 1, canceled: true, blurred: true },
    resumed: [false, false, 0]
  });
  console.log('Touch cancellation, pointer ownership, quick guard, pause/resume, mounted reins and mounted charged release verified.');
} finally {
  await browser.close();
  await server.close();
}
