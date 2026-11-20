// Adds the engine's import map to the page. Load it with a plain <script src> before any module script.
const imports = {
  "@egret/contracts": "./contracts/dist/index.js",
  "@egret/runtime": "./runtime/dist/index.js",
  "@egret/contracts/resources": "./contracts/dist/resources/index.js",
  "@egret/engine": "./engine/dist/index.js",
  "@egret/engine/physics2d": "./engine/dist/physics2d.js",
  "@egret/engine/tilemap": "./engine/dist/tilemap.js",
  "@egret/engine/camera": "./engine/dist/camera.js",
  "@egret/engine/particles": "./engine/dist/particles.js",
  "@egret/engine/bitmapfont": "./engine/dist/bitmapfont.js",
  "@egret/runtime/ui": "./runtime/dist/ui/index.js",
  "@egret/engine/ui": "./engine/dist/ui/index.js",
  "@egret/engine/ui/semantics": "./engine/dist/semantics.js",
  "@egret/engine/web/semantics": "./engine/dist/web/semantics.js",
  "@egret/engine/kit": "./engine/dist/kit.js",
  "@egret/engine/web/kit": "./engine/dist/web/kit.js",
  "@egret/engine/audio": "./engine/dist/audio.js",
  "@egret/engine/web/audio": "./engine/dist/web/audio.js",
  "@egret/engine/video": "./engine/dist/video.js",
  "@egret/engine/web/video": "./engine/dist/web/video.js",
  "@egret/runtime/text": "./runtime/dist/text/index.js",
  "@egret/engine/text": "./engine/dist/text.js",
  "@egret/runtime/input": "./runtime/dist/input/index.js",
  "#egret-pointer-input": "./engine/dist/pointerInput.js",
  "#egret-keyboard-input": "./engine/dist/keyboardInput.js",
  "robust-predicates": "./robust-predicates/index.js",
  "#egret-textured-frame-state": "./engine/dist/internal/texturedFrameState.js",
  "@egret/engine/input/hover": "./engine/dist/hover.js",
  "@egret/engine/web/game": "./engine/dist/web/game.js",
  "@egret/engine/web/hover": "./engine/dist/web/hover.js",
  "@egret/engine/web/text": "./engine/dist/web/text.js"
};
const base = document.currentScript.src;
for (const name of Object.keys(imports)) imports[name] = new URL(imports[name], base).href;
const map = document.createElement('script');
map.type = 'importmap';
map.textContent = JSON.stringify({ imports });
document.currentScript.after(map);
