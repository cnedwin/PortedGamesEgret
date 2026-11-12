# Vendored browser runtime

- Egret Engine community rebuild, branch `main`, pinned commit [`0348339ca8c24b16223f0e43f2a9696082b714db`](https://github.com/cnedwin/Egret_rebuild/tree/0348339ca8c24b16223f0e43f2a9696082b714db).
- Build inputs for `engine`, `runtime` and `contracts` were checked against Git tree `a63dc8b1c252b7e2d5337dcc838b5cea241ddd9e`. Compile used Node.js 26.7.0 and TypeScript 7.0.2 via `tsc --build packages/engine/tsconfig.web.json --force`.
- `robust-predicates` 3.0.3 is the existing vendored WebGL2 dependency. License text is retained next to the package.
