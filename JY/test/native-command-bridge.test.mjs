import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommandBridge } from '../web/jyx2/ui/native/command-bridge.mjs';

function rig() {
  const events = [];
  const keys = new Set(), edges = new Set();
  const game = {
    device: 'keyboard',
    keys: {
      axis: () => axis,
      down: (...names) => names.some(name => keys.has(name)),
      pressed: (...names) => names.some(name => edges.has(name))
    }
  };
  let axis = { x: 0, y: 0 };
  const bridge = createCommandBridge({
    emit: event => events.push([event.command, event.phase, event.source]),
    bindings: { confirm: ['enter', 'space', 'pad:a'], cancel: ['escape', 'pad:b'], menu: ['m', 'pad:start'] }
  });
  const sample = (enabled = true) => { bridge.sample(game, { enabled }); edges.clear(); };
  return { events, game, keys, edges, bridge, sample, axis: (x,y) => { axis = {x,y}; } };
}

test('one semantic command owns all its keyboard, touch and standard-pad aliases', () => {
  const r=rig();
  r.keys.add('enter'); r.edges.add('enter'); r.sample();
  r.game.device='gamepad'; r.keys.add('pad:a'); r.edges.add('pad:a'); r.sample();
  r.keys.delete('enter'); r.sample();
  assert.deepEqual(r.bridge.held,['confirm']);
  r.keys.delete('pad:a'); r.sample();
  assert.deepEqual(r.events,[['confirm','press','keyboard'],['confirm','release','keyboard']]);
});

test('native axis becomes one stable cardinal legacy command without diagonal churn', () => {
  const r=rig(); r.game.device='touch';
  r.axis(.7,.64); r.sample(); r.axis(.64,.7); r.sample();
  assert.deepEqual(r.bridge.held,['right']);
  r.axis(.18,.8); r.sample();
  r.axis(.1,.1); r.sample();
  assert.deepEqual(r.events,[
    ['right','press','touch'],['right','release','touch'],['down','press','touch'],['down','release','touch']
  ]);
});

test('two simultaneous controls, short taps, cancel and resume preserve balanced events', () => {
  const r=rig(); r.game.device='touch';
  r.axis(-.9,0); r.keys.add('space'); r.sample();
  r.bridge.suspend('modal opened');
  assert.deepEqual(r.bridge.held,[]);
  r.sample(false); // both unchanged; a resume must not replay either held contact
  r.sample(true);
  assert.equal(r.events.length,4);
  r.axis(0,0);r.keys.clear();r.sample(); // neutral clears the resume gate
  r.edges.add('space'); r.sample();    // tap pressed and released inside a single engine turn
  assert.deepEqual(r.events,[
    ['left','press','touch'],['confirm','press','touch'],['left','release','touch'],['confirm','release','touch'],
    ['confirm','press','touch'],['confirm','release','touch']
  ]);
});

test('a UI activation does not synthesize a release for a held input from another source', () => {
  const r=rig();r.keys.add('enter');r.sample();
  assert.equal(r.bridge.pulse('confirm','semantic'),false);
  assert.deepEqual(r.bridge.held,['confirm']);
  r.keys.clear();r.sample();r.bridge.pulse('confirm','semantic');
  assert.deepEqual(r.events,[
    ['confirm','press','keyboard'],['confirm','release','keyboard'],['confirm','press','semantic'],['confirm','release','semantic']
  ]);
});

test('modal opened synchronously from command handler interrupts the rest of the input sample', () => {
  const seen=[];let bridge;
  bridge=createCommandBridge({
    bindings:{confirm:['enter'], menu:['m']},
    emit:e=>{seen.push([e.command,e.phase]);if(e.command==='confirm'&&e.phase==='press')bridge.suspend('modal');}
  });
  const game={device:'keyboard',keys:{axis:()=>({x:0,y:0}),down:()=>true,pressed:()=>true}};
  bridge.sample(game);
  assert.deepEqual(seen,[['confirm','press'],['confirm','release']]);
  assert.deepEqual(bridge.held,[]);
});

test('disposing releases owned directions and stops dispatch; invalid configuration is refused', () => {
  const r=rig();r.axis(0,-1);r.sample();r.bridge.dispose();
  assert.deepEqual(r.events,[['up','press','keyboard'],['up','release','keyboard']]);
  assert.equal(r.bridge.pulse('confirm','semantic'),false);
  assert.throws(()=>createCommandBridge({emit(){},bindings:{right:['d']}}),/movement/);
});
