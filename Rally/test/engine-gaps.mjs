// Reproduction against the official vendored engine (does not change game state).
// Run: node test/engine-gaps.mjs
import '../vendor/node-register.mjs';
const { createEngine, DisplayObjectContainer } = await import('@egret/engine');
const { createPointerInput } = await import('@egret/engine/input');
const { createActionControl } = await import('@egret/engine/ui');
const { createUiSemantics } = await import('@egret/engine/ui/semantics');

const bounds = { x: 0, y: 0, width: 48, height: 48 };
const semantics = createUiSemantics();
semantics.add({
  id: 'hold', role: 'button',
  describe: () => ({ name: 'Drift', bounds, pressed: true }),
  onActivate() {},
});
semantics.publish();
console.log('Rally#5 semantic momentary press:', JSON.stringify(semantics.snapshot.nodes[0]));
semantics.dispose();

const engine = await createEngine({ host: {
  surface: {}, start() {}, stop() {}, async close() {}, setTimeout() { return () => {}; },
} });
const scope = engine.createScope();
const target = scope.use(new DisplayObjectContainer());
target.hitArea = bounds;
target.touchEnabled = true;
engine.stage.addChild(target);
const input = createPointerInput({ engine, scope, width: 150, height: 150 });
let activated = 0;
const button = createActionControl({ input, target, onActivate() { activated++; } });
const contact = input.begin({ pointerId: 1, pointerType: 'touch', globalX: 10, globalY: 10, buttons: 1, timestamp: 1 });
input.move(contact, { globalX: 90, globalY: 90, buttons: 1, timestamp: 2 });
input.end(contact, { globalX: 90, globalY: 90, buttons: 1, timestamp: 3 });
console.log('Rally#6 out-of-bounds release:', JSON.stringify({ activated, pressed: button.pressed }));
button.dispose();
input.dispose();
await engine.dispose();
