# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（提交 `2fb4646`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (commit `2fb4646`) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. iPhone 上引擎的 PNG 读取拒绝画布，游戏停在加载 · On iPhone the engine's PNG reader refused the canvas and the game never left loading — 已在 `1878ad0` 解决 / resolved in `1878ad0`

- 现象 · What happens：引擎的浏览器贴图读取要求 2D 画布的 `getContextAttributes()` 报告 `colorSpace: 'srgb'`；iPhone 上的浏览器（WebKit）不报告这一项，读取以 `SURFACE_INVALID`（"Canvas backing must support sRGB with alpha"）失败，开锣键一直没有反应。 · The engine's texture reader asked the 2D context to report `colorSpace: 'srgb'`; WebKit on iPhone does not, so reading failed with `SURFACE_INVALID` and the game never started.
- 游戏里 · In the game：`src/pictures.mjs` 自己取字节、按清单的 SHA-256 核对，用浏览器的图片元素解码，再从画布读回像素交给引擎做贴图；Spine 加载器用这些作为提供者（`e6dd7ac`）。 · The game fetches the bytes, checks them against the manifest, decodes them with the browser's image element and gives the pixels to the engine.
- 建议 · Suggestion：引擎已在 `1878ad0` 对原生画布接受缺省的 `colorSpace`；以后可以换回引擎的读取，删掉自己的解码。 · The engine now accepts the missing attribute on a native canvas; the game could return to the engine's reader.
- 状态 · Status：引擎已解决，本作副本 `2fb4646` 包含该修复；游戏仍用自己的解码，没有在 iPhone 上复测引擎的读取 · resolved, and this copy has the fix; the game still decodes for itself, and the engine's reader was not tested again on an iPhone.

### 2. 引擎副本是几百个小模块，逐个请求拖慢首屏 · The engine copy is hundreds of small modules, each a request — 已写入文档 / documented

- 现象 · What happens：`vendor/` 加上游戏自己的模块，页面在开始前要发出约 260 个请求，手机网络下首屏很慢。 · With the engine copy and the game's own modules, the page made about 260 requests before anything could start.
- 绕过办法 · Workaround：`tools/bundle.mjs` 用 esbuild 把它们打成一个压缩的 `build/lantern.js`，`?dev` 仍按源码逐个加载；测试检查打包文件不比源码旧（`7647b50`）。 · The modules are packed with esbuild into one file; `?dev` still loads them one by one, and a test checks the pack is current.
- 建议 · Suggestion：引擎仓库的 `tools/vendor-game.mjs` 可以提供 `--bundle`，直接给游戏一个按入口打好的单文件。 · `tools/vendor-game.mjs` could offer `--bundle` and give a game one file per entry.
- 状态 · Status：引擎 guide 卡片 `fast-startup` 已写明这种做法；引擎还没有打包选项 · the fast-startup card describes it; the engine has no bundling option yet.
