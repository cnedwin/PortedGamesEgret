# Vendored engine

- Egret Engine community rebuild, commit `8e70dcb3a8a0b40c9966483c92cb9f691a1cefd8`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/web/game`, `@egret/engine/webgl2`, `@egret/engine/webgpu`, `@egret/engine/camera`, `@egret/engine/particles`, `@egret/engine/tilemap`, `@egret/engine/web/audio`, `@egret/engine/web/gamepad`, `@egret/spine`, `@egret/contracts/resources`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense), `@esotericsoftware/spine-core` (LicenseRef-LICENSE).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
- For a coding agent: `node vendor/egret.mjs guide <question>` asks the engine's guide, copied with its command under `vendor/egret/`; `node vendor/egret.mjs explain <ERROR_CODE>` gives an engine error in English and Chinese. `verify` runs the game in a headless browser with `pngjs` (MIT, `vendor/egret/third-party/pngjs`).

- The Spine runtime license requires a Spine Editor license for use of a product built with the runtime. See the copied licence under @esotericsoftware__spine-core/LICENSE.
- The game serves the compact assembly build/lantern.js produced by tools/bundle.mjs; ?dev uses the module import map directly.
