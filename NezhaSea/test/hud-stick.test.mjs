import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSeaStick } from '../src/sea-stick.mjs';
import '../vendor/node-register.mjs';
const { createHud } = await import('../src/ui-hud.mjs');

function fixture() {
  const listener = new Map(), captures = new Set(), controls = [], removed = [], sprites = [];
  let toStageCalls = 0;
  const host = {
    addEventListener(type, call) { listener.set('host:' + type, call); },
    matchMedia() { throw Error('Use the engine screen plan, not a window media query'); }
  };
  const canvas = {
    ownerDocument: { defaultView: host },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 640 }),
    addEventListener(type, call) { listener.set(type, call); },
    setPointerCapture(id) { captures.add(id); },
    hasPointerCapture(id) { return captures.has(id); },
    releasePointerCapture(id) { captures.delete(id); }
  };
  const graphics = new Proxy({}, { get: () => () => graphics });
  const game = {
    canvas, ui: {}, width: 540, height: 960, orientation: 'landscape',
    screen: { x: -480, y: 0, width: 1500, height: 960 },
    browser: {
      screen: { scale: 2 / 3 },
      toStage(x, y) { toStageCalls++; return { x: x * 1.5, y: y * 1.5 }; }
    },
    fromStage(x, y) { return { x: x - 480, y }; },
    sprite() {
      const node = { x: 0, y: 0, visible: true, graphics };
      sprites.push(node);
      return node;
    },
    touchStick(options) {
      const node = { visible: false, options };
      controls.push(node);
      return node;
    },
    remove(node) { removed.push(node); node.visible = false; },
    keys: { axis: () => ({ x: 0, y: 0 }) }
  };
  let moving = true;
  const stick = createSeaStick(game, () => moving, (x, y) => x === 270 && y < 90);
  const send = (type, x, y, options = {}) => {
    const event = { pointerId: 11, clientX: x, clientY: y, pointerType: 'mouse', button: 0, preventDefault() {}, ...options };
    listener.get(type)?.(event);
    return event;
  };
  return { game, stick, controls, removed, captures, sprites, send, get conversions() { return toStageCalls; }, stop() { moving = false; } };
}

test('expanded landscape still limits a fresh floating touch to the original design and steering radius', () => {
  const f = fixture(), { stick, controls, game } = f;
  stick.arrange();
  assert.equal(controls.length, 1);
  assert.deepEqual(controls[0].options.floating.area(), { x: 0, y: 0, width: 540, height: 960 });
  assert.equal(controls[0].options.floating.deadZonePx, 5);
  const cssReach = 540 * game.browser.screen.scale * 0.14;
  assert(Math.abs(controls[0].options.radius - (cssReach - 5) / game.browser.screen.scale) < 1e-9);
  assert(controls[0].options.floating.exclude(270, 40), 'the HUD control takes precedence');
  assert(!controls[0].options.floating.exclude(270, 400), 'an ordinary battlefield point remains a valid origin');
  f.send('pointerdown', 50, 280);
  assert(!stick.active, 'an empty expanded-stage margin is not a new steering origin');
  f.send('pointerdown', 500, 40);
  assert(!stick.active, 'UI exclusion applies to the mouse as well');
  f.send('pointerdown', 500, 300);
  assert(stick.active && f.captures.has(11));
  assert.equal(f.sprites[0].x, 270);
  assert.equal(f.sprites[0].y, 450);
  assert.equal(f.conversions, 3, 'client points use the engine conversion, not a handwritten CSS ratio');
  f.send('pointermove', 504, 300);
  assert.equal(stick.vector.x, 0);
  f.send('pointermove', 518, 300);
  assert(stick.vector.x > 0.18 && stick.vector.x < 0.4);
  f.send('pointermove', 1100, 300);
  assert.equal(stick.vector.x, 1);
  f.send('pointercancel', 1100, 300);
  assert(!stick.active && !f.captures.has(11));
  assert.deepEqual(stick.vector, { x: 0, y: 0 });
});

test('resizing a held native stick retires its old owner even when its radius is unchanged', () => {
  const f = fixture();
  f.stick.arrange();
  f.controls[0].visible = true;
  f.stick.arrange();
  assert.equal(f.removed.length, 1);
  assert.equal(f.controls.length, 2);
  assert(!f.stick.active);
  f.stick.arrange();
  assert.equal(f.controls.length, 2, 'unchanged idle screens reuse the native control');
  f.game.browser.screen.scale = 0.8;
  f.stick.arrange();
  assert.equal(f.removed.length, 2);
  assert.equal(f.controls.length, 3);
  f.stick.retire();
  assert(!f.stick.active);
  assert.deepEqual(f.stick.vector, { x: 0, y: 0 });
});

test('HUD uses native safe anchors and converts the visible pause rectangle to field input coordinates', () => {
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ getContext: () => ({
    font: '', measureText: words => ({ width: String(words).length * 7 })
  }) }) };
  try {
    const views = [];
    let pauseRect = { x: 800, y: 30, width: 98, height: 66 };
    const game = {
      safe: { x: -470, y: 0, width: 1480, height: 960 },
      uiScale: 1.5,
      reducedMotion: false,
      time: 0,
      toStage: (x, y) => ({ x: x + 480, y }),
      hints: () => ({ shown: ['move'], dispose() {} }),
      show(description, options) {
        const view = {
          description, options, close() {}, deactivate() {}, activate() {}, refresh() {},
          rect() { throw Error('HUD input must not use unscaled view rectangles'); },
          visibleRect(name) { assert.equal(name, 'pause'); return pauseRect; }
        };
        views.push(view);
        return view;
      }
    };
    const app = { screen: 'play', run: { wave: 1, waveLeft: 60, player: { hp: 90 }, xp: 1, level: 1, pearls: 2, boss: null } };
    const hud = createHud(game, app, { statsOf: () => ({ maxHp: 100 }) }, () => {});
    hud.arrange();
    const root = views[0].description.root;
    assert.equal(views[0].description.area, 'safe');
    assert.equal(root.width, 'fill');
    assert.equal(root.height, 'fill');
    assert.equal(root.children[0].anchor, 'top');
    assert.equal(root.children[0].width, 560);
    assert.equal(root.children[1].anchor, 'bottom');
    const pause = root.children[0].children.find(p => p.name === 'pause');
    assert.equal(pause.height, 44);
    assert(hud.exclude(321, 40), 'design point translates into the visible stage pause');
    assert(!hud.exclude(319, 40), 'the surrounding battlefield is still available');
    assert(!hud.exclude(321, 96), 'visible rectangle is half open');
    pauseRect = undefined;
    assert(!hud.exclude(321, 40), 'no hidden control blocks a valid origin');
    game.safe = { x: 0, y: 0, width: 405, height: 960 };
    hud.arrange();
    assert.equal(views[1].description.root.children[0].width, 258);
    hud.close();
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
