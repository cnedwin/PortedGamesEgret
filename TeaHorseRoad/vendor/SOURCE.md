# Vendored engine

- Egret Engine community rebuild, commit `8637ace9a40667714abd6d74157e8dcf4587232d`, copied by `tools/vendor-game.mjs`.
- Local patch in `engine/dist/web/WebGL2Host.js` and `engine/dist/web/webgl2Native.js` batches initial 2D program links and polls `KHR_parallel_shader_compile` before validating them. On contexts without the extension, the host yields between synchronous program links. [Khronos WebGL extension specification](https://registry.khronos.org/webgl/extensions/KHR_parallel_shader_compile/) Carried over unchanged from the `687037a` copy (ENGINE-NOTES.md, item 25).
- Local patch in `engine/dist/rendering/world3d/PhysicsMesh3D.js` transfers the triangle mesh and its collision hierarchy from a terrain worker. The receiver adopts buffers produced by the same engine copy and uses the original collision queries. Carried over unchanged from the `687037a` copy (ENGINE-NOTES.md, item 26).
- Entries: `@egret/engine`, `@egret/engine/world3d`, `@egret/engine/webgl2/world3d`, `@egret/engine/webgpu/world3d`, `@egret/engine/bitmapfont`, `@egret/engine/ui`, `@egret/engine/ui/semantics`, `@egret/engine/web/semantics`, `@egret/engine/kit`, `@egret/engine/web/kit`, `@egret/engine/web/game`, `@egret/engine/web/video`, `@egret/engine/web/gamepad`, `@egret/engine/input/gamepad`, `@egret/engine/text`, `@egret/engine/web/text`. Only the JavaScript files they import are kept; source maps and declarations are left out.
- Third-party packages, copied with their own licences: `robust-predicates` (Unlicense).
- First-party engine code: Apache-2.0, see `LICENSE` and `NOTICE`.
- In a page: add `vendor/importmap.json` to the import map, or load `vendor/importmap.js` first. In Node: `node --import ./vendor/node-register.mjs`.
- For a coding agent: `node vendor/egret.mjs guide <question>` asks the engine's guide, copied with its command under `vendor/egret/`; `node vendor/egret.mjs explain <ERROR_CODE>` gives an engine error in English and Chinese.
