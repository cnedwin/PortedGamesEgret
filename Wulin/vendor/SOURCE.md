# Vendored engine

- Egret Engine community rebuild, commit `39560b3ef608e4dda68c8461f435c279d1eba3d2`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/world3d`, `@egret/engine/webgl2/world3d`, `@egret/engine/webgpu/world3d`, `@egret/engine/web/kit`, `@egret/engine/play`, `@egret/engine/ui`, `@egret/engine/ui/semantics`, `@egret/engine/web/semantics`, `@egret/engine/ui/testing`, `@egret/engine/web/text-input`, `@egret/engine/kit`, `@egret/engine/paragraph`, `@egret/engine/web/paragraph`, `@egret/engine/bitmapfont`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
- For a coding agent: `node vendor/egret.mjs guide <question>` asks the engine's guide, copied with its command under `vendor/egret/`; `node vendor/egret.mjs explain <ERROR_CODE>` gives an engine error in English and Chinese. `verify` runs the game in a headless browser with `pngjs` (MIT, `vendor/egret/third-party/pngjs`).
