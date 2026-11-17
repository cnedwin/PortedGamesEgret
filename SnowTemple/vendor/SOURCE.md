# Vendored browser runtime

- Egret Engine community rebuild, branch `main`, pinned commit [`8b634fe9b757561385d904a53f3d2732dd4af557`](https://github.com/cnedwin/Egret_rebuild/tree/8b634fe9b757561385d904a53f3d2732dd4af557).
- Built from `packages/engine`, `packages/runtime` and `packages/contracts` with `node tools/build.mjs`, using Node.js 26.7.0 and TypeScript 7.0.2. Source tree: `4c54d2a4d7b4424b2c9026f7c9d8d6443b52e153`.
- Only the JavaScript files the game loads are kept: the import closure of `@egret/engine`, `@egret/engine/world3d` and `@egret/engine/webgl2/world3d`. Source maps and type declarations are left out, and the source-map comment at the end of each file is removed; the code is otherwise unchanged.
- License: Apache-2.0, see `LICENSE` and `NOTICE`.
