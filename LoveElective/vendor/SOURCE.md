# Vendored browser runtime

- Egret Engine community rebuild, branch `main`, pinned commit [`99dbb2cbcc1dae673b5320f350852ed09315138c`](https://github.com/cnedwin/Egret_rebuild/tree/99dbb2cbcc1dae673b5320f350852ed09315138c).
- Built from `packages/engine`, `packages/runtime` and `packages/contracts` with `node tools/build.mjs`, using Node.js 26.7.0 and TypeScript 7.0.2. Source tree: 7f8a77cb20455a8c261a154284d8392d66f3de3a.
- Only the JavaScript files the game loads are kept: the import closure of `@egret/engine`, `@egret/engine/webgl2` and `@egret/engine/webgpu`. Source maps and type declarations are left out, and the source-map comment at the end of each file is removed; the code is otherwise unchanged.
- `robust-predicates` 3.0.3 is the engine's dependency, copied unchanged with its license.
- License: Apache-2.0, see `LICENSE` and `NOTICE`.
