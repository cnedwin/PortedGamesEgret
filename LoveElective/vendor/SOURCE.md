# Vendored browser runtime

- Egret Engine community rebuild, branch `main`, pinned commit [`0492498019ee329b82e343013210dcfe6e185885`](https://github.com/cnedwin/Egret_rebuild/tree/0492498019ee329b82e343013210dcfe6e185885).
- Built from `packages/engine`, `packages/runtime` and `packages/contracts` with `node tools/build.mjs`, using Node.js 26.7.0 and TypeScript 7.0.2. Source tree: f1ba81a585bd7d6fc5d53efcc0b03ba0808a3c66.
- Only the JavaScript files the game loads are kept: the import closure of `@egret/engine`, `@egret/engine/webgl2` and `@egret/engine/webgpu`. Source maps and type declarations are left out, and the source-map comment at the end of each file is removed; the code is otherwise unchanged.
- `robust-predicates` 3.0.3 is the engine's dependency, copied unchanged with its license.
- License: Apache-2.0, see `LICENSE` and `NOTICE`.
