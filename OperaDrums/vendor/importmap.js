// Adds the engine's import map to the page. Load it with a plain <script src> before any module script.
const imports = {
  "@egret/contracts": "./contracts/dist/index.js",
  "@egret/runtime": "./runtime/dist/index.js",
  "@egret/contracts/resources": "./contracts/dist/resources/index.js",
  "@egret/engine": "./engine/dist/index.js",
  "@egret/engine/kit": "./engine/dist/kit.js",
  "@egret/engine/audio": "./engine/dist/audio.js",
  "@egret/engine/input/gamepad": "./engine/dist/gamepad.js",
  "@egret/runtime/text": "./runtime/dist/text/index.js",
  "@egret/engine/text": "./engine/dist/text.js",
  "@egret/runtime/input": "./runtime/dist/input/index.js",
  "#egret-pointer-input": "./engine/dist/pointerInput.js",
  "#egret-keyboard-input": "./engine/dist/keyboardInput.js",
  "robust-predicates": "./robust-predicates/index.js",
  "#egret-textured-frame-state": "./engine/dist/internal/texturedFrameState.js",
  "@egret/engine/input/hover": "./engine/dist/hover.js",
  "@egret/engine/play": "./engine/dist/web/play.js",
  "@egret/engine/web/kit": "./engine/dist/web/kit.js",
  "@egret/engine/web/audio": "./engine/dist/web/audio.js"
};
const base = document.currentScript.src;
for (const name of Object.keys(imports)) imports[name] = new URL(imports[name], base).href;
const map = document.createElement('script');
map.type = 'importmap';
map.textContent = JSON.stringify({ imports });
document.currentScript.after(map);
