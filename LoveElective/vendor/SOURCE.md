# Vendored browser runtime

- Egret Engine community rebuild, branch `main`, pinned commit [`b6a392a61348a5ba53a48a0d4fbed514ffd87afe`](https://github.com/cnedwin/Egret_rebuild/tree/b6a392a61348a5ba53a48a0d4fbed514ffd87afe).
- Built from `packages/engine`, `packages/runtime` and `packages/contracts` with `node tools/build.mjs`, using Node.js 26.7.0 and TypeScript 7.0.2. Source tree: a0f65aaca30e4f90e229eacdebe9bf847cfc73c5.
- Only the JavaScript files the game loads are kept: the import closure of `@egret/engine`, `@egret/engine/webgl2` and `@egret/engine/webgpu`. Source maps and type declarations are left out, and the source-map comment at the end of each file is removed; the code is otherwise unchanged.
- `robust-predicates` 3.0.3 is the engine's dependency, copied unchanged with its license.
- License: Apache-2.0, see `LICENSE` and `NOTICE`.
