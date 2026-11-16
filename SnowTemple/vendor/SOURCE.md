# Vendored browser runtime

- Egret Engine community rebuild, branch `main`, pinned commit [`2fb4646c1ccec058d31c6f93cc2193061add1979`](https://github.com/cnedwin/Egret_rebuild/tree/2fb4646c1ccec058d31c6f93cc2193061add1979).
- Built from `packages/engine`, `packages/runtime` and `packages/contracts` with `node tools/build.mjs`, using Node.js 26.7.0 and TypeScript 7.0.2. Source tree: `aa6c1ee215d1663fdc42901032785f6d3cbad1ee`.
- Only the JavaScript files the game loads are kept: the import closure of `@egret/engine`, `@egret/engine/world3d` and `@egret/engine/webgl2/world3d`. Source maps and type declarations are left out, and the source-map comment at the end of each file is removed; the code is otherwise unchanged.
- License: Apache-2.0, see `LICENSE` and `NOTICE`.
