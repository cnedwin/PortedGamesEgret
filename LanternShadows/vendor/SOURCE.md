# Vendored engine

- Egret Engine community rebuild, commit `b5628eb9997b67cf6163a388f5aa06f321f3833a`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/web/game`, `@egret/engine/webgl2`, `@egret/engine/webgpu`, `@egret/engine/camera`, `@egret/engine/particles`, `@egret/engine/tilemap`, `@egret/engine/web/audio`, `@egret/engine/web/gamepad`, `@egret/spine`, `@egret/contracts/resources`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense), `@esotericsoftware/spine-core` (LicenseRef-LICENSE).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
