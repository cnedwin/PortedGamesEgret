# Vendored engine

- Egret Engine community rebuild, commit `33897768c4f7933d289f083e4f34b3209b0aef31`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/world3d`, `@egret/engine/webgl2/world3d`, `@egret/engine/webgpu/world3d`, `@egret/engine/web/kit`, `@egret/engine/play`, `@egret/engine/kit`, `@egret/engine/ui`, `@egret/engine/ui/semantics`, `@egret/engine/ui/testing`, `@egret/engine/web/semantics`, `@egret/engine/web/audio`, `@egret/engine/input`, `@egret/engine/web/hover`, `@egret/engine/web/view`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
- For a coding agent: `node vendor/egret.mjs guide <question>` asks the engine's guide, copied with its command under `vendor/egret/`; `node vendor/egret.mjs explain <ERROR_CODE>` gives an engine error in English and Chinese. `verify` runs the game in a headless browser with `pngjs` (MIT, `vendor/egret/third-party/pngjs`).
