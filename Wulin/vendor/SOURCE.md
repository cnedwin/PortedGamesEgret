# Vendored browser runtime

- Egret Engine community rebuild, branch `main`, pinned commit [`0bcce3174611694d064c08eb5135388328f898fc`](https://github.com/cnedwin/Egret_rebuild/tree/0bcce3174611694d064c08eb5135388328f898fc), tree `663a3d24a6067703791bae90b97a520ed7b2867b`.
- Built from `packages/engine`, `packages/runtime` and `packages/contracts` with the upstream `node tools/build.mjs`, using Node.js 26.7.0 and TypeScript 7.0.2.
- Only the JavaScript files the game loads are kept: the import closure of `@egret/engine`, `@egret/engine/world3d`, `@egret/engine/webgl2/world3d`, `@egret/engine/webgpu/world3d` and `@egret/engine/web/text-input`. Source maps and type declarations are left out, and the source-map comment at the end of each file is removed; the code is otherwise unchanged.
- License: Apache-2.0, see `LICENSE` and `NOTICE`.
- To refresh: build the engine, then run `node tools/vendor.mjs <path to Egret_rebuild>` from the game's folder.
