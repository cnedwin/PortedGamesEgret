# Vendored browser runtime

- Egret Engine community rebuild, branch `main`, pinned commit [`57ff83fd31cbaf96d7257f3725d688a082ba1b74`](https://github.com/cnedwin/Egret_rebuild/tree/57ff83fd31cbaf96d7257f3725d688a082ba1b74).
- Built from `packages/engine`, `packages/runtime`, `packages/contracts` and `packages/spine` with `node tools/build.mjs`, using Node.js 26.7.0 and TypeScript 7.0.2. Source tree: 73262cfde953973378008b73112089502432b8b7.
- Only the JavaScript files the game loads are kept: the import closure of the entries named in the import map of `index.html` (`@egret/engine`, its `web/game`, `webgl2`, `webgpu`, `camera`, `particles`, `tilemap`, `web/audio` and `web/gamepad` entries, `@egret/spine` and `@egret/contracts/resources`). Source maps and type declarations are left out, and the source-map comment at the end of each file is removed; the code is otherwise unchanged.
- `@esotericsoftware/spine-core` 4.3.13 is the Spine package's dependency, copied unchanged with its license (`spine-core/LICENSE`). It is used under the Spine Runtimes License Agreement, which requires a Spine Editor license of whoever uses a product built with it.
- `robust-predicates` 3.0.3 is the engine's dependency, copied unchanged with its license.
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
