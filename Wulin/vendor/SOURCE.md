# Vendored browser runtime

- Egret Engine community rebuild, branch `main`, pinned commit [`e471f9ee42fbe5b7a3a8b861adb5cb935c3c8091`](https://github.com/cnedwin/Egret_rebuild/tree/e471f9ee42fbe5b7a3a8b861adb5cb935c3c8091), tree `9014e3282e8b6afd9ae5348b293047f600de5c1e`.
- Built from `packages/engine`, `packages/runtime` and `packages/contracts` with the upstream `node tools/build.mjs`, using Node.js 22.23.4 and pnpm 11.25.0.
- Only the JavaScript files the game loads are kept: the import closure of `@egret/engine`, `@egret/engine/world3d`, `@egret/engine/webgl2/world3d`, `@egret/engine/webgpu/world3d` and `@egret/engine/web/text-input`. Source maps and type declarations are left out, and the source-map comment at the end of each file is removed; the code is otherwise unchanged.
- License: Apache-2.0, see `LICENSE` and `NOTICE`.
- To refresh: build the engine, then run `node tools/vendor.mjs <path to Egret_rebuild>` from the game's folder.
