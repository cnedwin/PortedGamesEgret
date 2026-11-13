# Vendored browser runtime

- Egret Engine community rebuild, branch `main`, pinned commit [`35ff4dfd0aba4244a0578e257e1bc645d5eeb45a`](https://github.com/cnedwin/Egret_rebuild/tree/35ff4dfd0aba4244a0578e257e1bc645d5eeb45a).
- Built from `packages/engine`, `packages/runtime` and `packages/contracts` with `node tools/build.mjs`, using Node.js 26.7.0 and TypeScript 7.0.2.
- Only the JavaScript files the game loads are kept: the import closure of `@egret/engine`, `@egret/engine/world3d`, `@egret/engine/webgl2/world3d` and `@egret/engine/webgpu/world3d`. Source maps and type declarations are left out, and the source-map comment at the end of each file is removed; the code is otherwise unchanged.
- License: Apache-2.0, see `LICENSE` and `NOTICE`.
