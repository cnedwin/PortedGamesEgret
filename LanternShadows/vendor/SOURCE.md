# Vendored browser runtime

- Egret Engine community rebuild, branch `main`, pinned commit [`2fb4646c1ccec058d31c6f93cc2193061add1979`](https://github.com/cnedwin/Egret_rebuild/tree/2fb4646c1ccec058d31c6f93cc2193061add1979).
- Built from `packages/engine`, `packages/runtime`, `packages/contracts` and `packages/spine` with `node tools/build.mjs`, using Node.js 26.7.0 and TypeScript 7.0.2. Source tree: `aa6c1ee215d1663fdc42901032785f6d3cbad1ee`. The runtime packages and dependency lockfile have the same source as the previous pin.
- Only the JavaScript files the game loads are kept: the import closure of the entries named in the import map of `index.html` (`@egret/engine`, its `web/game`, `webgl2`, `webgpu`, `camera`, `particles`, `tilemap`, `web/audio` and `web/gamepad` entries, `@egret/spine` and `@egret/contracts/resources`). Source maps and type declarations are left out, and the source-map comment at the end of each file is removed; the code is otherwise unchanged.
- `@esotericsoftware/spine-core` 4.3.13 is the Spine package's dependency, copied with its license (`spine-core/LICENSE`) and with inline source-map comments removed. It is used under the Spine Runtimes License Agreement, which requires a Spine Editor license of whoever uses a product built with it.
- `robust-predicates` 3.0.3 is the engine's dependency, copied unchanged with its license.
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- The page does not load these files one by one: `tools/bundle.mjs` packs them, with the game's own modules, into `build/lantern.js`. The files here are what that is made from, and what the page loads with `?dev` in its address.
