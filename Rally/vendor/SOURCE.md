# Vendored engine

- Egret Engine community rebuild, branch `main`, commit [`f1fbd9093c47dd83a770a0a13aa88901edc0b90d`](https://github.com/cnedwin/Egret_rebuild/tree/f1fbd9093c47dd83a770a0a13aa88901edc0b90d), copied by `tools/vendor-game.mjs`.
- Source tree `5c3a6d42997ce410cbb7aebec6ee8a8c73af9ad5`, built with Node.js 26.7.0 and TypeScript 7.0.2.
- Entries: `@egret/engine`, `@egret/engine/world3d`, `@egret/engine/webgl2/world3d`, `@egret/engine/webgpu/world3d`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
