# Vendored engine

- Egret Engine community rebuild, commit `5792d800a4932da81ddf6af9314a430c41cb0f30`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/world3d`, `@egret/engine/webgl2/world3d`, `@egret/engine/webgpu/world3d`, `@egret/engine/kit`, `@egret/engine/web/kit`, `@egret/engine/audio`, `@egret/engine/web/audio`, `@egret/engine/input/gamepad`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
