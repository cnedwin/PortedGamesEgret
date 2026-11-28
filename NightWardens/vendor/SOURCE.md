# Vendored engine

- Egret Engine community rebuild, commit `82561d6338a805f0e0459a2d5d42a284f9385b30`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/ui`, `@egret/engine/ui/semantics`, `@egret/engine/web/semantics`, `@egret/engine/kit`, `@egret/engine/web/kit`, `@egret/engine/web/game`, `@egret/engine/audio`, `@egret/engine/web/audio`, `@egret/engine/text`, `@egret/engine/web/text`, `@egret/engine/particles`, `@egret/engine/animation`, `@egret/engine/layout`, `@egret/engine/input/gamepad`, `@egret/engine/web/gamepad`, `@egret/engine/webgpu`, `@egret/engine/webgl2`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
