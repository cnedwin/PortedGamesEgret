# Vendored engine

- Egret Engine community rebuild, commit `9d801beb0667dac833a57ae20a09b552e862b275`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/web/game`, `@egret/engine/camera`, `@egret/engine/input/hover`, `@egret/engine/web/hover`, `@egret/engine/web/pointer`, `@egret/engine/kit`, `@egret/engine/web/kit`, `@egret/engine/particles`, `@egret/engine/audio`, `@egret/engine/web/audio`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
