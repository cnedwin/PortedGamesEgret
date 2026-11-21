# Vendored engine

- Egret Engine community rebuild, commit `b5628eb9997b67cf6163a388f5aa06f321f3833a`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/play`, `@egret/engine/kit`, `@egret/engine/web/kit`, `@egret/engine/audio`, `@egret/engine/web/audio`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
