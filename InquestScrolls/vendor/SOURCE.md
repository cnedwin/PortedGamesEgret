# Vendored engine

- Egret Engine community rebuild, commit `95897d78095ae8fda9e34dbc13bbbd15db8eaa12`, copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/play`, `@egret/engine/kit`, `@egret/engine/web/kit`, `@egret/engine/paragraph`, `@egret/engine/web/paragraph`, `@egret/engine/web/text-input`, `@egret/engine/ui`, `@egret/engine/ui/editing`, `@egret/engine/web/editing`, `@egret/engine/ui/semantics`, `@egret/engine/web/semantics`, `@egret/engine/layout`, `@egret/engine/resources`, `@egret/engine/web/resources`, `@egret/engine/input/hover`, `@egret/engine/web/hover`, `@egret/engine/web/audio`, `@egret/engine/animation`, `@egret/engine/web/gestures`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
