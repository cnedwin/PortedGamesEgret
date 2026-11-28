// Lets Node find the engine copy in this folder under the names the page's import map uses,
// so rules and tests run unchanged outside a browser. Registered by node-register.mjs.
export const MAP = {
  "@egret/contracts": "./contracts/dist/index.js",
  "@egret/runtime": "./runtime/dist/index.js",
  "@egret/contracts/resources": "./contracts/dist/resources/index.js",
  "@egret/engine": "./engine/dist/index.js",
  "@egret/engine/world3d": "./engine/dist/rendering/world3d/index.js",
  "@egret/runtime/text": "./runtime/dist/text/index.js",
  "@egret/engine/text": "./engine/dist/text.js",
  "@egret/runtime/input": "./runtime/dist/input/index.js",
  "#egret-pointer-input": "./engine/dist/pointerInput.js",
  "#egret-keyboard-input": "./engine/dist/keyboardInput.js",
  "robust-predicates": "./robust-predicates/index.js",
  "#egret-textured-frame-state": "./engine/dist/internal/texturedFrameState.js",
  "@egret/engine/input/hover": "./engine/dist/hover.js",
  "@egret/runtime/paragraph": "./runtime/dist/paragraph/index.js",
  "@egret/engine/paragraph": "./engine/dist/paragraph.js",
  "@egret/engine/bitmapfont": "./engine/dist/bitmapfont.js",
  "@egret/engine/kit": "./engine/dist/kit.js",
  "@egret/engine/audio": "./engine/dist/audio.js",
  "@egret/engine/input/gamepad": "./engine/dist/gamepad.js",
  "@egret/runtime/ui": "./runtime/dist/ui/index.js",
  "@egret/engine/ui": "./engine/dist/ui/index.js",
  "@egret/engine/webgl2/world3d": "./engine/dist/web/world3d/index.js",
  "@egret/engine/webgpu/world3d": "./engine/dist/web/world3d/webgpu.js",
  "@egret/engine/web/kit": "./engine/dist/web/kit.js",
  "@egret/engine/play": "./engine/dist/web/play.js",
  "@egret/engine/ui/semantics": "./engine/dist/semantics.js",
  "@egret/engine/web/semantics": "./engine/dist/web/semantics.js",
  "@egret/engine/ui/testing": "./engine/dist/ui/testing.js",
  "@egret/engine/web/text-input": "./engine/dist/web/textInput.js",
  "@egret/engine/web/paragraph": "./engine/dist/web/paragraph.js"
};
export function resolve(specifier, context, next) {
  const file = MAP[specifier];
  return file ? { url: new URL(file, import.meta.url).href, shortCircuit: true } : next(specifier, context);
}
