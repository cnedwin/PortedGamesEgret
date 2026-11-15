# Vendored browser runtime

- Egret Engine community rebuild, branch `main`, pinned commit [`b6a392a61348a5ba53a48a0d4fbed514ffd87afe`](https://github.com/cnedwin/Egret_rebuild/tree/b6a392a61348a5ba53a48a0d4fbed514ffd87afe), tree `a0f65aaca30e4f90e229eacdebe9bf847cfc73c5`.
- Built from `packages/engine`, `packages/runtime` and `packages/contracts` with the upstream `node tools/build.mjs`, using Node.js 26.7.0 and pnpm 11.25.0.
- Only the JavaScript files the game loads are kept: the import closure of `@egret/engine`, `@egret/engine/world3d`, `@egret/engine/webgl2/world3d`, `@egret/engine/webgpu/world3d` and `@egret/engine/web/text-input`. Source maps and type declarations are left out, and the source-map comment at the end of each file is removed; the code is otherwise unchanged.
- License: Apache-2.0, see `LICENSE` and `NOTICE`.
- To refresh: build the engine, then run `node tools/vendor.mjs <path to Egret_rebuild>` from the game's folder.
