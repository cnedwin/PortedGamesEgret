# Vendored engine

- Egret Engine community rebuild, commit `687037ac462c48dbfe00523312125b94072ffea4`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/physics2d`, `@egret/engine/tilemap`, `@egret/engine/camera`, `@egret/engine/particles`, `@egret/engine/bitmapfont`, `@egret/engine/ui`, `@egret/engine/ui/semantics`, `@egret/engine/web/semantics`, `@egret/engine/kit`, `@egret/engine/web/kit`, `@egret/engine/audio`, `@egret/engine/web/audio`, `@egret/engine/web/video`, `@egret/engine/web/game`, `@egret/engine/web/hover`, `@egret/engine/text`, `@egret/engine/web/text`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
