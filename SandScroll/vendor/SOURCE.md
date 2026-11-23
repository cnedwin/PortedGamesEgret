# Vendored engine

- Egret Engine community rebuild, commit `450bb9eb62fec9d3032b35766817844adc6eba33`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/ui`, `@egret/engine/ui/semantics`, `@egret/engine/web/semantics`, `@egret/engine/kit`, `@egret/engine/web/kit`, `@egret/engine/web/game`, `@egret/engine/audio`, `@egret/engine/web/audio`, `@egret/engine/text`, `@egret/engine/web/text`, `@egret/engine/particles`, `@egret/engine/webgpu`, `@egret/engine/webgl2`, `@egret/engine/web/pointer`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
