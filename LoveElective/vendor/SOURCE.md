# Vendored browser runtime

- Egret Engine community rebuild, branch `main`, pinned commit [`ef900ac852d68070c8f37cf131560234c5f27db4`](https://github.com/cnedwin/Egret_rebuild/tree/ef900ac852d68070c8f37cf131560234c5f27db4).
- Built from `packages/engine`, `packages/runtime` and `packages/contracts` with `node tools/build.mjs`, using Node.js 22.23.4 and TypeScript 7.0.2.
- Only the JavaScript files the game loads are kept: the import closure of `@egret/engine`, `@egret/engine/webgl2` and `@egret/engine/webgpu`. Source maps and type declarations are left out, and the source-map comment at the end of each file is removed; the code is otherwise unchanged.
- `robust-predicates` 3.0.3 is the engine's dependency, copied unchanged with its license.
- License: Apache-2.0, see `LICENSE` and `NOTICE`.
