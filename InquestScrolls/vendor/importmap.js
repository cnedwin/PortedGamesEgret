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
  "@egret/runtime/ui": "./runtime/dist/ui/index.js",
  "@egret/engine/ui": "./engine/dist/ui/index.js",
  "@egret/engine/play": "./engine/dist/web/play.js",
  "@egret/engine/web/kit": "./engine/dist/web/kit.js",
  "@egret/runtime/paragraph": "./runtime/dist/paragraph/index.js",
  "@egret/engine/paragraph": "./engine/dist/paragraph.js",
  "@egret/engine/web/paragraph": "./engine/dist/web/paragraph.js",
  "@egret/engine/web/text-input": "./engine/dist/web/textInput.js",
  "@egret/runtime/ui/editing": "./runtime/dist/ui/editing.js",
  "@egret/engine/ui/editing": "./engine/dist/ui/editing.js",
  "#egret-text-editor": "./engine/dist/ui/textEditor.js",
  "@egret/engine/web/editing": "./engine/dist/web/editing.js",
  "@egret/engine/ui/semantics": "./engine/dist/semantics.js",
  "@egret/engine/web/semantics": "./engine/dist/web/semantics.js",
  "@egret/engine/layout": "./engine/dist/layout.js",
  "@egret/engine/resources": "./engine/dist/resources.js",
  "#egret-manifest-resources": "./engine/dist/manifestResourceState.js",
  "@egret/engine/web/resources": "./engine/dist/web/resources.js",
  "@egret/engine/web/hover": "./engine/dist/web/hover.js",
  "@egret/engine/web/audio": "./engine/dist/web/audio.js",
  "@egret/engine/animation": "./engine/dist/animation/index.js",
  "@egret/engine/web/gestures": "./engine/dist/web/gestures.js"
};
const base = document.currentScript.src;
for (const name of Object.keys(imports)) imports[name] = new URL(imports[name], base).href;
const map = document.createElement('script');
map.type = 'importmap';
map.textContent = JSON.stringify({ imports });
document.currentScript.after(map);
