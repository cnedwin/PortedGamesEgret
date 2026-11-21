// Adds the engine's import map to the page. Load it with a plain <script src> before any module script.
const imports = {
  "@egret/contracts": "./contracts/dist/index.js",
  "@egret/runtime": "./runtime/dist/index.js",
  "@egret/contracts/resources": "./contracts/dist/resources/index.js",
  "@egret/engine": "./engine/dist/index.js",
  "#egret-textured-frame-state": "./engine/dist/internal/texturedFrameState.js",
  "robust-predicates": "./robust-predicates/index.js",
  "@egret/engine/webgl2": "./engine/dist/web/webgl2.js",
  "@egret/engine/webgpu": "./engine/dist/web/webgpu.js",
  "@egret/engine/web/loop": "./engine/dist/web/loop.js"
};
const base = document.currentScript.src;
for (const name of Object.keys(imports)) imports[name] = new URL(imports[name], base).href;
const map = document.createElement('script');
map.type = 'importmap';
map.textContent = JSON.stringify({ imports });
document.currentScript.after(map);
