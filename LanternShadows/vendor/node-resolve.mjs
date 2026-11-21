// Lets Node find the engine copy in this folder under the names the page's import map uses,
// so rules and tests run unchanged outside a browser. Registered by node-register.mjs.
export const MAP = {
  "@egret/contracts": "./contracts/dist/index.js",
  "@egret/runtime": "./runtime/dist/index.js",
  "@egret/contracts/resources": "./contracts/dist/resources/index.js",
  "@egret/engine": "./engine/dist/index.js",
  "@egret/runtime/text": "./runtime/dist/text/index.js",
  "@egret/engine/text": "./engine/dist/text.js",
  "@egret/runtime/input": "./runtime/dist/input/index.js",
  "#egret-pointer-input": "./engine/dist/pointerInput.js",
  "#egret-keyboard-input": "./engine/dist/keyboardInput.js",
  "robust-predicates": "./robust-predicates/index.js",
  "#egret-textured-frame-state": "./engine/dist/internal/texturedFrameState.js",
  "@egret/engine/input/hover": "./engine/dist/hover.js",
  "@egret/engine/web/game": "./engine/dist/web/game.js",
  "@egret/engine/webgl2": "./engine/dist/web/webgl2.js",
  "@egret/engine/webgpu": "./engine/dist/web/webgpu.js",
  "@egret/engine/camera": "./engine/dist/camera.js",
  "@egret/engine/particles": "./engine/dist/particles.js",
  "@egret/engine/tilemap": "./engine/dist/tilemap.js",
  "@egret/engine/audio": "./engine/dist/audio.js",
  "@egret/engine/web/audio": "./engine/dist/web/audio.js",
  "@egret/engine/input/gamepad": "./engine/dist/gamepad.js",
  "@egret/engine/web/gamepad": "./engine/dist/web/gamepad.js",
  "@esotericsoftware/spine-core": "./@esotericsoftware__spine-core/dist/index.js",
  "@egret/engine/resources": "./engine/dist/resources.js",
  "@egret/spine": "./spine/dist/index.js"
};
export function resolve(specifier, context, next) {
  const file = MAP[specifier];
  return file ? { url: new URL(file, import.meta.url).href, shortCircuit: true } : next(specifier, context);
}
