# Vendored engine

- Egret Engine community rebuild, commit `82561d6338a805f0e0459a2d5d42a284f9385b30`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/web/kit`, `@egret/engine/kit`, `@egret/engine/audio`, `@egret/engine/web/audio`, `@egret/engine/world3d`, `@egret/engine/webgl2/world3d`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
