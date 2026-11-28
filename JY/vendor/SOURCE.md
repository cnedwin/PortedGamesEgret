# Vendored engine

- Egret Engine community rebuild, commit `ca9ff2a0ef9ff67af7795f9600ba40668383a0a2`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/text`, `@egret/engine/web/audio`, `@egret/engine/web/gamepad`, `@egret/engine/web/keyboard`, `@egret/engine/web/text`, `@egret/engine/webgl2`, `@egret/engine/webgl2/world3d`, `@egret/engine/world3d`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
