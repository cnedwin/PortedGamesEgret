import test from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../src/input.mjs';
import { register } from 'node:module';
register('../tools/egret-resolve.mjs', import.meta.url);

const { createEngine, Sprite } = await import('@egret/engine');
const { createPointerInput } = await import('@egret/engine/input');
const { bindNativeTouchControls } = await import('../src/ui/touch.mjs');

// The raw camera route remains a browser-native 3D surface. All the visible
// stick and action inputs below run through real engine contacts and controls.
class PointerSurface extends EventTarget {
  constructor() {
    super();
    this.captures = new Set();
    this.lockRequests = 0;
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); }
  requestPointerLock() { this.lockRequests++; return Promise.resolve(); }
}
function point(surface, type, id, x, y, extra = {}) {
  const event = Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
    pointerId: id, clientX: x, clientY: y, pointerType: 'touch', button: 0,
    movementX: 0, movementY: 0, buttons: type === 'pointerup' ? 0 : 1, ...extra,
  });
  surface.dispatchEvent(event);
  if (surface !== window) window.dispatchEvent(event);
  return event;
}
const key = (type, code, prevented = false) => {
  const event = Object.assign(new Event(type, { cancelable: true }), { code, repeat: false });
  if (prevented) event.preventDefault();
  window.dispatchEvent(event);
  return event;
};
async function setup(t, coarse = true) {
  const gamepads = [];
  const originals = new Map();
  for (const [name, value] of Object.entries({
    window: Object.assign(new EventTarget(), { matchMedia: () => ({ matches: coarse }) }),
    document: new EventTarget(),
    navigator: { getGamepads: () => gamepads },
  })) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, configurable: true });
  }
  const canvas = new PointerSurface();
  const input = createInput(canvas);
  const engine = await createEngine({ host: {
    surface: {}, start() {}, stop() {}, async close() {}, setTimeout() { return () => {}; },
  } });
  const scope = engine.createScope();
  const make = (x, y, width, height) => {
    const s = scope.use(new Sprite());
    Object.assign(s, { x, y, touchEnabled: true, hitArea: { x: 0, y: 0, width, height } });
    s.graphics.beginFill(0xffffff).drawRect(0, 0, width, height).endFill();
    engine.stage.addChild(s);
    return s;
  };
  const stick = make(0, 0, 100, 100);
  const actions = Object.fromEntries(['jump','slam','roll','pause'].map((key,i)=>[key,make(120+i*60,0,50,50)]));
  const pointer = createPointerInput({ engine, scope, width: 400, height: 300 });
  const movementPaint = [];
  const native = bindNativeTouchControls({ pointer, stick, actions,
    onMovement(value, pressed) { movementPaint.push({ ...value, pressed }); }
  }, input);
  t.after(async () => {
    native.dispose(); input.dispose(); pointer.dispose(); await engine.dispose();
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name];
    }
  });
  input.setTouchEnabled(true);
  native.setActive(true);
  let stamp = 0;
  const begin = (id,x,y,extra={}) => pointer.begin({ pointerId: id, pointerType: 'touch', globalX: x, globalY: y, buttons: 1, timestamp: ++stamp, ...extra });
  const move = (s,x,y) => pointer.move(s,{globalX:x,globalY:y,buttons:1,timestamp:++stamp});
  const end = (s,x,y) => pointer.end(s,{globalX:x,globalY:y,buttons:0,timestamp:++stamp});
  const cancel = s => pointer.cancel(s,'pointercancel');
  const action = (name,id) => begin(id, actions[name].x + 25, 25);
  return { input, canvas, native, pointer, begin, move, end, cancel, action, actions, stick, movementPaint, gamepads };
}

test('native stick preserves fixed-center deflection, rejects second movement owner, and independently holds roll', async t => {
  const { input, begin, move, end, cancel, action } = await setup(t);
  const movement = begin(1,50,20), second = begin(2,50,50), roll = action('roll',3);
  assert.ok(input.poll().forward > 0.9, 'off-centre press moves immediately');
  move(second,90,50);
  assert.equal(input.poll().right, 0);
  assert.equal(input.poll().roll, true);
  move(movement,-50,50);
  assert.equal(input.poll().right,-1);
  cancel(roll);
  assert.equal(input.poll().roll,false);
  assert.equal(input.poll().right,-1);
  end(movement,-50,50);
  assert.equal(input.poll().right,0);
  end(second,50,50);
});
test('quick native jump press/release reaches one poll, held jump persists, cancel clears its charge', async t => {
  const { input, action, end, cancel } = await setup(t);
  const quick = action('jump',1); end(quick,145,25);
  assert.equal(input.poll().jump,true);
  assert.equal(input.poll().jump,false);
  const held=action('jump',2);
  assert.equal(input.poll().jump,true); assert.equal(input.poll().jump,true);
  let cancellations=0;
  input.onJumpCancel=()=>cancellations++;
  cancel(held);
  assert.equal(input.poll().jump,false);
  assert.ok(cancellations);
});
test('three simultaneous contacts: native movement and jump plus raw scene look, never lock or slam on touch', async t => {
  const { input, canvas, begin, action, end } = await setup(t);
  const movement=begin(1,50,20), jump=action('jump',2);
  point(canvas,'pointerdown',3,60,40);
  point(canvas,'pointermove',3,80,50);
  const f=input.poll();
  assert.ok(f.forward>0.9);
  assert.deepEqual([f.lookX,f.lookY,f.jump,f.slam,canvas.lockRequests],[20,10,true,false,0]);
  point(canvas,'pointerup',3,80,50);
  end(jump,145,25); end(movement,50,20);
});
test('slam contact consumes one poll, not repeated while held', async t => {
  const { input, action, end } = await setup(t);
  const s=action('slam',1);
  assert.equal(input.poll().slam,true);
  assert.equal(input.poll().slam,false);
  end(s,205,25);
  assert.equal(input.poll().slam,false);
});
test('a refused raw scene capture preserves outside movement and release', async t => {
  const { input,canvas } = await setup(t), elsewhere=new PointerSurface();
  canvas.setPointerCapture=()=>{throw new DOMException('Cannot capture','NotFoundError');};
  point(canvas,'pointerdown',1,60,40);
  point(elsewhere,'pointermove',1,86,51);
  assert.deepEqual([input.poll().lookX,input.lookY],[26,11]);
  point(elsewhere,'pointerup',1,86,51);
  point(elsewhere,'pointermove',1,95,58);
  assert.deepEqual([input.poll().lookX,input.lookY],[0,0]);
});
test('outside cancellation discards only the canceled unsampled look gesture', async t => {
  const { input,canvas }=await setup(t), elsewhere=new PointerSurface();
  canvas.setPointerCapture=()=>{};
  point(canvas,'pointerdown',1,62,40);
  point(canvas,'pointermove',1,71,50);
  point(canvas,'pointerup',1,71,50);
  point(canvas,'pointerdown',2,66,36);
  point(canvas,'pointermove',2,90,55);
  point(elsewhere,'pointercancel',2,90,55);
  const {lookX,lookY}=input.poll();
  assert.deepEqual([lookX,lookY],[9,10]);
  point(canvas,'pointerdown',3,68,37);
  point(elsewhere,'pointermove',3,74,37);
  assert.equal(input.poll().lookX,6);
});
test('lost browser capture and pause discard old scene/native gestures; new contacts work after resume', async t => {
  const { input,canvas,begin,move,action,native }=await setup(t), elsewhere=new PointerSurface();
  point(canvas,'pointerdown',10,60,40);
  point(canvas,'pointermove',10,72,46);
  canvas.captures.delete(10);
  point(canvas,'lostpointercapture',10,72,46);
  assert.equal(input.poll().lookX,0);
  point(elsewhere,'pointermove',10,90,50);
  assert.equal(input.poll().lookX,0);
  point(canvas,'pointerdown',11,62,40);
  const s=begin(12,50,18), jump=action('jump',13);
  assert.equal(input.poll().jump,true);
  let canceled=false; input.onJumpCancel=()=>{canceled=true;};
  input.setTouchEnabled(false); native.setActive(false);
  input.setTouchEnabled(true); native.setActive(true);
  point(elsewhere,'pointermove',11,78,50); move(s,50,15); move(jump,200,20);
  const f=input.poll();
  assert.deepEqual([f.lookX,f.forward,f.jump,canvas.hasPointerCapture(11),canceled],[0,0,false,false,true]);
  const fresh=begin(14,50,20); assert.ok(fresh); assert.ok(input.poll().forward>0.9);
});
test('native pause activates on a second finger while movement is still held', async t => {
  const { input,begin,end,action,native }=await setup(t);
  const commands=[];
  input.onCommand=command=>{assert.ok(input.poll().forward>0.9);commands.push(command);input.setTouchEnabled(false);native.setActive(false);};
  const s=begin(1,50,20), pause=action('pause',2);
  assert.deepEqual(commands,[]);
  end(pause,326,26); end(s,50,20);
  assert.deepEqual(commands,['menu']); assert.equal(input.poll().forward,0);
});
test('native pause ignores cancel, outside release and drag there/back; a clean tap opens menu',async t=>{
  const { input,begin,move,end,cancel,action }=await setup(t);
  const commands=[]; input.onCommand=c=>commands.push(c);
  cancel(action('pause',1));
  let s=begin(2,302,20);end(s,299,20);
  s=action('pause',3);move(s,346,20);end(s,325,25);
  assert.deepEqual(commands,[]);
  s=action('pause',4);end(s,325,25);
  assert.deepEqual(commands,['menu']);
});
test('blur clears every native hold and raw look before a fresh contact',async t=>{
  const {input,canvas,begin,action,move}=await setup(t);
  const s=begin(1,50,20);action('roll',2);action('jump',3);
  point(canvas,'pointerdown',4,70,40);point(canvas,'pointermove',4,80,50);
  input.poll(); let canceled=false; input.onJumpCancel=()=>canceled=true;
  window.dispatchEvent(new Event('blur')); move(s,50,10);point(canvas,'pointermove',4,90,60);
  const f=input.poll();assert.deepEqual([f.forward,f.jump,f.roll,f.lookX,canceled],[0,false,false,0,true]);
});
test('PC requests mouse pointer lock; captured left down slams and right held rolls including mouse chords',async t=>{
  const {input,canvas}=await setup(t,false);
  point(canvas,'pointerdown',1,50,20,{pointerType:'mouse'});
  assert.equal(canvas.lockRequests,1);
  document.pointerLockElement=canvas;document.dispatchEvent(new Event('pointerlockchange'));
  point(canvas,'pointerdown',1,50,20,{pointerType:'mouse',button:2,buttons:2});
  assert.equal(input.poll().roll,true);
  point(canvas,'pointermove',1,50,20,{pointerType:'mouse',button:0,buttons:3,movementX:6,movementY:-3});
  let f=input.poll();assert.deepEqual([f.slam,f.roll,f.lookX,f.lookY],[true,true,6,-3]);
  point(canvas,'pointermove',1,50,20,{pointerType:'mouse',button:2,buttons:1});
  assert.equal(input.poll().roll,false);
});
test('native focused menus retain Space/Arrow while gameplay input is paused',async t=>{
  const {input}=await setup(t,false);
  input.enabled=false;
  assert.equal(key('keydown','Space').defaultPrevented,false);
  assert.equal(key('keydown','ArrowUp').defaultPrevented,false);
  assert.equal(input.poll().jump,false);assert.equal(input.poll().forward,0);
  let menu=0;input.onCommand=c=>{if(c==='menu')menu++};
  key('keydown','Escape',true);assert.equal(menu,0);
  key('keydown','KeyP');assert.equal(menu,1);
  input.enabled=true;
  assert.equal(key('keydown','Space').defaultPrevented,true);
  assert.equal(input.poll().jump,true);
});
test('menu gamepad routes D-pad and A/B once per press, while cards preserve direct picks and Y reroll',async t=>{
  const {input,gamepads}=await setup(t,false);
  const buttons=Array.from({length:16},()=>({pressed:false}));
  gamepads.push({connected:true,buttons,axes:[0,0,0,0]});
  const commands=[];input.onCommand=c=>commands.push(c);
  const press=i=>{buttons[i].pressed=true;input.poll();input.poll();buttons[i].pressed=false;input.poll();};
  input.enabled=false;input.commandMode='menu';
  press(12);press(0);press(1);assert.deepEqual(commands,['up','confirm','back']);
  assert.equal(input.gamepadMode,true);
  key('keydown','Tab');assert.equal(input.gamepadMode,false);
  input.commandMode='cards';press(14);press(12);press(15);press(3);
  assert.deepEqual(commands,['up','confirm','back','pick1','pick2','pick3','reroll']);
});

test('gamepad confirm that starts a game does not also charge jump until its next fresh press', async t => {
  const {input,gamepads}=await setup(t,false);
  const buttons=Array.from({length:16},()=>({pressed:false}));
  gamepads.push({connected:true,buttons,axes:[0,0,0,0]});
  input.enabled=false;input.commandMode='menu';
  input.onCommand=command=>{if(command==='confirm'){input.commandMode='play';input.enabled=true;}};
  buttons[0].pressed=true;
  assert.equal(input.poll().jump,false);
  assert.equal(input.poll().jump,false);
  buttons[0].pressed=false;input.poll();
  buttons[0].pressed=true;
  assert.equal(input.poll().jump,true);
});

test('mouse drag without pointer lock consumes native forwarded relative movement once', async t => {
  const {input,canvas}=await setup(t,false);
  point(canvas,'pointerdown',1,50,20,{pointerType:'mouse',movementX:0,movementY:0});
  assert.equal(canvas.lockRequests,1);
  point(canvas,'pointermove',1,65,27,{pointerType:'mouse',movementX:11,movementY:-5});
  const f=input.poll();assert.deepEqual([f.lookX,f.lookY],[11,-5], 'native relative motion, not reconstructed client deltas');
  point(canvas,'pointerup',1,65,27,{pointerType:'mouse'});
  point(canvas,'pointermove',1,70,30,{pointerType:'mouse'});
  assert.equal(input.poll().lookX,0);
});

test('unconsumed menu arrow keys move native focus without becoming gameplay or direct card picks', async t => {
  const {input}=await setup(t,false),commands=[];
  input.enabled=false;input.commandMode='menu';
  input.onCommand=command=>{commands.push(command);return command!=='down';};
  assert.equal(key('keydown','ArrowLeft',true).defaultPrevented,true);
  assert.deepEqual(commands,[],'already consumed native focus event is not repeated');
  assert.equal(key('keydown','ArrowUp').defaultPrevented,true);
  assert.equal(key('keydown','ArrowDown').defaultPrevented,false,'unhandled arrow retains default');
  input.commandMode='cards';
  assert.equal(key('keydown','ArrowRight').defaultPrevented,true);
  assert.deepEqual(commands,['up','down','right']);
  assert.equal(input.poll().right,0);
  input.enabled=true;input.commandMode='play';
  key('keydown','ArrowLeft');
  assert.equal(input.poll().right,-1);
  assert.deepEqual(commands,['up','down','right']);
});

test('centered movement paints pressed and released even without a direction change; resize retires its old owner',async t=>{
  const {input,native,stick,movementPaint,begin,move,end}=await setup(t);
  const centered=begin(1,50,50);
  assert.deepEqual(movementPaint.at(-1),{x:0,y:0,pressed:true});
  end(centered,50,50);
  assert.deepEqual(movementPaint.at(-1),{x:0,y:0,pressed:false});
  const held=begin(2,50,30);
  assert.ok(input.poll().forward>0.6);
  native.layout(1); // unchanged native geometry does not release an active stick
  assert.ok(input.poll().forward>0.6);
  stick.hitArea={x:0,y:0,width:80,height:80};
  native.layout(1);
  assert.equal(input.poll().forward,0);
  assert.deepEqual(movementPaint.at(-1),{x:0,y:0,pressed:false});
  move(held,10,10);
  assert.equal(input.poll().forward,0);
  const fresh=begin(3,40,15);assert.ok(input.poll().forward>0.99);
  end(held,10,10);
  assert.ok(input.poll().forward>0.99,'retired contact cannot release the new owner');
  end(fresh,40,15);
  assert.equal(input.poll().forward,0);
});

test('pause tap preserves the 12 CSS-pixel tolerance across scale changes without transferring a held contact',async t=>{
  const {input,native,begin,move,end,action}=await setup(t);
  const commands=[];input.onCommand=c=>commands.push(c);
  for(const scale of [0.5,1.5]){
    native.layout(scale);
    let s=action('pause',1);
    move(s,325-12/scale,25);
    end(s,325,25);
    assert.equal(commands.length,scale===0.5?1:2,'tolerance edge is inclusive');
    s=action('pause',1);
    move(s,325-12.5/scale,25);
    end(s,325,25);
    assert.equal(commands.length,scale===0.5?1:2,'an excursion over 12 CSS px cannot become a tap again');
  }
  const held=action('pause',2);
  native.layout(1);
  const fresh=action('pause',3);
  end(held,325,25);
  assert.equal(commands.length,2,'the pre-resize contact cannot open the menu');
  end(fresh,325,25);
  assert.deepEqual(commands,['menu','menu','menu']);
  const right=begin(4,325,25,{pointerType:'mouse',buttons:2});
  end(right,325,25);
  assert.equal(commands.length,3,'right mouse button is never a Pause press');
  native.activate('pause');
  assert.equal(commands.length,4,'the semantic action uses the native scripted activation path');
});
