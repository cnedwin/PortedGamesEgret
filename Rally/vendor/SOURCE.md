# Vendored browser runtime

- Egret Engine community rebuild, branch `main`, pinned commit [`db9772ee104e77b5c34e4c59bbc6f7dde7e90419`](https://github.com/cnedwin/Egret_rebuild/tree/db9772ee104e77b5c34e4c59bbc6f7dde7e90419).
- Built from `packages/engine`, `packages/runtime` and `packages/contracts` with `node tools/build.mjs`, using Node.js 26.7.0 and TypeScript 7.0.2. Source tree: 8ed766202af5edd8648a38e3e12f291307792121.
- Only the JavaScript files the game loads are kept: the import closure of `@egret/engine`, `@egret/engine/world3d`, `@egret/engine/webgl2/world3d` and `@egret/engine/webgpu/world3d`. Source maps and type declarations are left out, and the source-map comment at the end of each file is removed; the code is otherwise unchanged.
- License: Apache-2.0, see `LICENSE` and `NOTICE`.
