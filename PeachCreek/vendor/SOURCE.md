# Vendored engine

- Egret Engine community rebuild, commit `51b6175de36aa1e85878d3c6ca9b8e841e405504`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/play`, `@egret/engine/kit`, `@egret/engine/web/kit`, `@egret/engine/ui`, `@egret/engine/ui/semantics`, `@egret/engine/ui/testing`, `@egret/engine/web/semantics`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
