import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import '../vendor/node-register.mjs';

const { createLevelSim } = await import('../src/sim/sim.mjs');
const { RULES } = await import('../src/sim/rules.mjs');
const { loadMap } = await import('../tools/solve.mjs');
const { projectTrajectory } = await import('../src/play/trajectory.mjs');

const scenarios = [
  { level: 'l01', aim: [-62, 100], contact: 'lock', event: 'lock', minimumX: 1000 },
  { level: 'l01', aim: [0, 100], contact: 'ground', event: 'hit', surfaceY: 736 },
  { level: 'l02', aim: [-44, 92], contact: 'block', event: 'hit' },
  { level: 'l03', aim: [-54, 92], contact: 'rope', event: 'cut' },
  { level: 'l04', aim: [-72, 92], contact: 'seesaw', event: 'hit' },
  { level: 'l05', aim: [-67, 100], contact: 'ramp', event: 'hit' },
  { level: 'l06', aim: [-64, 72], contact: 'spring', event: 'hit' },
  { level: 'l09', aim: [-56, 88], contact: 'stone', event: 'hit' },
  { level: 'l11', aim: [-50, 72], contact: 'block', event: 'hit' },
  { level: 'l12', aim: [-58, 75], contact: 'rope', event: 'cut' }
];

for (const { level, aim, contact, event, minimumX, surfaceY } of scenarios) {
  test(`${level} ${aim.join('° / ')} projects its first ${contact} contact`, () => {
    const events = [];
    const sim = createLevelSim(loadMap(`${level}.tmj`), { onEvent: (value) => events.push(value) });
    const projection = projectTrajectory(sim, ...aim);
    assert.equal(projection.contact?.kind, contact);
    assert.equal(sim.state.shotsFired, 0);
    assert.equal(events.length, 0);
    if (minimumX) assert.ok(projection.points.at(-1).x > minimumX, 'the guide must reach the distant lock');
    if (surfaceY) {
      assert.equal(projection.contact.y, surfaceY);
      assert.ok(projection.points.every((point) => point.y < surfaceY), 'the guide must stop above the ground');
    }

    assert.ok(sim.fire(...aim));
    const relevant = () => events.find(({ type }) => type === 'hit' || type === 'cut' || type === 'lock');
    for (let round = 0; round < 360 && !relevant(); round++) sim.update(RULES.step);
    const actual = relevant();
    assert.equal(actual?.type, event);
    if (event === 'hit') assert.equal(actual.on, contact);
    assert.ok(Math.abs(actual.time - projection.contact.time) <= RULES.step * 2.01, 'the estimate should be within two physics steps');
    sim.dispose();
  });
}

test('a lock that no longer responds to a pellet does not stop the preview', () => {
  const sim = createLevelSim(loadMap('l01.tmj'));
  sim.locks[0].open = true;
  const projection = projectTrajectory(sim, -62, 100);
  assert.equal(projection.contact?.kind, 'ground');
  assert.equal(projection.contact.y, 544);
  sim.dispose();
});

test('only the initiating pointer can fire, using the actual release position', async () => {
  const { createEngine, createAssetType, createAssetRef, createTexture, createImageData2D, isTexture } = await import('@egret/engine');
  const { createPointerInput } = await import('#egret-pointer-input');
  const { createLevel } = await import('../src/play/level.mjs');
  const engine = await createEngine({ host: {
    surface: {},
    setTimeout(work, delay) {
      const timer = setTimeout(work, delay);
      return () => clearTimeout(timer);
    },
    async close() {}
  } });
  const fetch = globalThis.fetch;
  const scope = engine.createScope();
  try {
    const image = createAssetType('trajectory-test-image', isTexture);
    engine.assets.register(image, {
      load: () => createTexture(createImageData2D({ width: 128, height: 128, pixels: new Uint8Array(128 * 128 * 4) })),
      dispose: (texture) => texture.dispose()
    });
    const texture = scope.use(await engine.assets.acquire(createAssetRef(image, 'blank')));
    const pointer = createPointerInput({ engine, scope, width: 960, height: 540 });
    const shots = [];
    globalThis.fetch = async (url) => ({ json: async () => JSON.parse(await readFile(url, 'utf8')) });
    await createLevel({ stage: engine.stage, pointer, engine }, {
      file: 'l01.tmj', chapter: 0, scope,
      textures: { terrain: texture, dot: texture, splinter: texture, lockLights: texture },
      on: (event) => { if (event.type === 'shot') shots.push(event); }
    });
    globalThis.fetch = fetch;

    let timestamp = 0;
    const sample = (globalX, globalY) => ({ globalX, globalY, buttons: 1, timestamp: ++timestamp });
    const begin = (pointerId, x, y) => pointer.begin({ pointerId, pointerType: 'touch', ...sample(x, y) });
    pointer.end(begin(1, 500, 350), sample(476, 350));
    assert.equal(shots.length, 0, 'the release threshold must remain strictly greater than 24 stage units');

    const pull = begin(1, 500, 350);
    pointer.end(begin(2, 320, 340), sample(250, 390));
    assert.equal(shots.length, 0, 'a second finger cannot fire the bow');
    pointer.end(pull, sample(420, 395));
    assert.equal(shots.length, 1);
    assert.ok(Math.abs(shots[0].angle + 29.358) < 0.001);
    assert.ok(Math.abs(shots[0].power - 48.309) < 0.001);
  } finally {
    globalThis.fetch = fetch;
    scope.dispose();
    await engine.dispose();
  }
});
