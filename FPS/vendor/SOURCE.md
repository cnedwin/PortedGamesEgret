# Vendored engine

- Egret Engine community rebuild, branch `main`, pinned commit [`264e17227b06298858a06b9fdfe0c4a3a427e13a`](https://github.com/cnedwin/Egret_rebuild/tree/264e17227b06298858a06b9fdfe0c4a3a427e13a).
- Built with `node tools/build.mjs`, Node.js 26.7.0 and TypeScript 7.0.2. Source tree: `ec3088f3331e905a703d82493d344ce5d4f1cd5d`. Copied by `tools/vendor-game.mjs`.
- Entries: `@egret/engine`, `@egret/engine/world3d`, `@egret/engine/webgl2/world3d`, `@egret/engine/webgpu/world3d`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
