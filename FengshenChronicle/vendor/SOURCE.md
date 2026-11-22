# Vendored engine

- Egret Engine community rebuild, commit `60991a46eb2252e5c0e7790b90b51517e3cbd14c`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/web/game`, `@egret/engine/webgl2`, `@egret/engine/webgpu`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.

Release v7.0.2. The three official package archive SHA-256 hashes were checked against the release manifest before vendoring.
