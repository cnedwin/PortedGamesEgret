// Lets Node find the engine copy in this folder under the names the page's import map uses,
// so rules and tests run unchanged outside a browser. Registered by node-register.mjs.
export const MAP = {
  "@egret/contracts": "./contracts/dist/index.js",
  "@egret/runtime": "./runtime/dist/index.js",
  "@egret/contracts/resources": "./contracts/dist/resources/index.js",
  "@egret/engine": "./engine/dist/index.js",
  "#egret-textured-frame-state": "./engine/dist/internal/texturedFrameState.js",
  "robust-predicates": "./robust-predicates/index.js",
  "@egret/engine/webgl2": "./engine/dist/web/webgl2.js",
  "@egret/engine/webgpu": "./engine/dist/web/webgpu.js",
  "@egret/engine/web/loop": "./engine/dist/web/loop.js",
  "@egret/runtime/input": "./runtime/dist/input/index.js",
  "#egret-pointer-input": "./engine/dist/pointerInput.js",
  "@egret/engine/web/pointer": "./engine/dist/web/pointer.js",
  "@egret/engine/input/hover": "./engine/dist/hover.js",
  "@egret/engine/web/hover": "./engine/dist/web/hover.js",
  "#egret-keyboard-input": "./engine/dist/keyboardInput.js",
  "@egret/engine/web/keyboard": "./engine/dist/web/keyboard.js",
  "@egret/engine/audio": "./engine/dist/audio.js",
  "@egret/engine/web/audio": "./engine/dist/web/audio.js",
  "@egret/engine/kit": "./engine/dist/kit.js",
  "@egret/engine/input/gamepad": "./engine/dist/gamepad.js",
  "@egret/runtime/text": "./runtime/dist/text/index.js",
  "@egret/engine/text": "./engine/dist/text.js",
  "@egret/runtime/paragraph": "./runtime/dist/paragraph/index.js",
  "@egret/engine/paragraph": "./engine/dist/paragraph.js",
  "@egret/engine/bitmapfont": "./engine/dist/bitmapfont.js",
  "@egret/runtime/ui": "./runtime/dist/ui/index.js",
  "@egret/engine/ui": "./engine/dist/ui/index.js",
  "@egret/engine/play": "./engine/dist/web/play.js",
  "@egret/engine/web/kit": "./engine/dist/web/kit.js",
  "@egret/engine/ui/semantics": "./engine/dist/semantics.js",
  "@egret/engine/ui/testing": "./engine/dist/ui/testing.js",
  "@egret/engine/web/semantics": "./engine/dist/web/semantics.js"
};
export function resolve(specifier, context, next) {
  const file = MAP[specifier];
  return file ? { url: new URL(file, import.meta.url).href, shortCircuit: true } : next(specifier, context);
}
