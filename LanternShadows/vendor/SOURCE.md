# Vendored browser runtime

- Egret Engine community rebuild, branch `main`, pinned commit [`ab2527359e475f2f24f6758538d925abcce53846`](https://github.com/cnedwin/Egret_rebuild/tree/ab2527359e475f2f24f6758538d925abcce53846).
- Built from `packages/engine`, `packages/runtime`, `packages/contracts` and `packages/spine` with `node tools/build.mjs`, using Node.js 26.7.0 and TypeScript 7.0.2. Source tree: 29cf01d67c23e337199892f6893b0f1ca1fc19fc.
- Only the JavaScript files the game loads are kept: the import closure of the entries named in the import map of `index.html` (`@egret/engine`, its `web/game`, `webgl2`, `webgpu`, `camera`, `particles`, `tilemap`, `web/audio` and `web/gamepad` entries, `@egret/spine` and `@egret/contracts/resources`). Source maps and type declarations are left out, and the source-map comment at the end of each file is removed; the code is otherwise unchanged.
- `@esotericsoftware/spine-core` 4.3.13 is the Spine package's dependency, copied unchanged with its license (`spine-core/LICENSE`). It is used under the Spine Runtimes License Agreement, which requires a Spine Editor license of whoever uses a product built with it.
- `robust-predicates` 3.0.3 is the engine's dependency, copied unchanged with its license.
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- The page does not load these files one by one: `tools/bundle.mjs` packs them, with the game's own modules, into `build/lantern.js`. The files here are what that is made from, and what the page loads with `?dev` in its address.
