# Vendored engine

- Egret Engine community rebuild, commit `a7be833b09ddad1936c79ff148c909cf452bea7f`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/play`, `@egret/engine/kit`, `@egret/engine/web/kit`, `@egret/engine/ui/semantics`, `@egret/engine/web/semantics`, `@egret/engine/physics2d`, `@egret/engine/web/gestures`, `@egret/engine/web/hover`, `@egret/engine/web/screen`, `@egret/engine/web/view`, `@egret/engine/ui/testing`, `@egret/engine/audio`, `@egret/engine/web/audio`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
