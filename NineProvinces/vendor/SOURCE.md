# Vendored engine

- Egret Engine community rebuild, commit `7fb371acb8bab254cf1c49b9da0ac0eed0c06fb4`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/web/kit`, `@egret/engine/kit`, `@egret/engine/audio`, `@egret/engine/web/audio`, `@egret/engine/world3d`, `@egret/engine/webgl2/world3d`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
- For a coding agent: `node vendor/egret.mjs guide <question>` asks the engine's guide, copied with its command under `vendor/egret/`; `node vendor/egret.mjs explain <ERROR_CODE>` gives an engine error in English and Chinese. `verify` runs the game in a headless browser with `pngjs` (MIT, `vendor/egret/third-party/pngjs`).
