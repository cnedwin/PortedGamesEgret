# Vendored engine

- Egret Engine community rebuild, commit `b3b594351e8017ce43a7c3cb20c769403806553e`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/world3d`, `@egret/engine/webgpu/world3d`, `@egret/engine/webgl2/world3d`, `@egret/engine/kit`, `@egret/engine/web/kit`, `@egret/engine/audio`, `@egret/engine/web/audio`, `@egret/engine/input/gamepad`, `@egret/engine/web/gamepad`, `@egret/engine/input/hover`, `@egret/engine/web/hover`, `@egret/engine/ui/semantics`, `@egret/engine/web/semantics`, `@egret/engine/animation`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
