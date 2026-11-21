# Vendored engine

- Egret Engine community rebuild, commit `d43ce973b2b5114010c9a291c833aee54acd5ab8`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/webgl2`, `@egret/engine/webgpu`, `@egret/engine/web/loop`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
