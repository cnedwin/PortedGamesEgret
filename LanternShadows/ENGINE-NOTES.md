# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（最初为提交 `2fb4646`，2026-11-21 升级到 `b5628eb`，2026-11-26 升级到 `8e70dcb3`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (first `2fb4646`, `b5628eb` since 2026-11-21, `8e70dcb3` since 2026-11-26) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. iPhone 上引擎的 PNG 读取拒绝画布，游戏停在加载 · On iPhone the engine's PNG reader refused the canvas and the game never left loading — 已在 `1878ad0` 解决 / resolved in `1878ad0`
<!-- engine-note: {"id": "LanternShadows#1", "status": "resolved", "topic": "ios-png-reader", "workaround": ["src/pictures.mjs"]} -->

- 现象 · What happens：引擎的浏览器贴图读取要求 2D 画布的 `getContextAttributes()` 报告 `colorSpace: 'srgb'`；iPhone 上的浏览器（WebKit）不报告这一项，读取以 `SURFACE_INVALID`（"Canvas backing must support sRGB with alpha"）失败，开锣键一直没有反应。 · The engine's texture reader asked the 2D context to report `colorSpace: 'srgb'`; WebKit on iPhone does not, so reading failed with `SURFACE_INVALID` and the game never started.
- 游戏里 · In the game：`src/pictures.mjs` 自己取字节、按清单的 SHA-256 核对，用浏览器的图片元素解码，再从画布读回像素交给引擎做贴图；Spine 加载器用这些作为提供者（`e6dd7ac`）。 · The game fetches the bytes, checks them against the manifest, decodes them with the browser's image element and gives the pixels to the engine.
- 建议 · Suggestion：引擎已在 `1878ad0` 对原生画布接受缺省的 `colorSpace`；以后可以换回引擎的读取，删掉自己的解码。 · The engine now accepts the missing attribute on a native canvas; the game could return to the engine's reader.
- 状态 · Status：引擎已解决，本作副本（`2fb4646` 起，现为 `8e70dcb3`）包含该修复。2026-11-21 升级引擎时仍保留游戏自己的解码：换回引擎的读取要在 iPhone 上复测，这里没有真机 · resolved, and the copy has the fix; the game keeps its own decoder, since going back to the engine's reader needs an iPhone to test on.

### 2. 引擎副本是几百个小模块，逐个请求拖慢首屏 · The engine copy is hundreds of small modules, each a request — 已写入文档 / documented
<!-- engine-note: {"id": "LanternShadows#2", "status": "documented", "topic": "engine-copy-requests", "workaround": ["tools/bundle.mjs"]} -->

- 现象 · What happens：`vendor/` 加上游戏自己的模块，页面在开始前要发出约 260 个请求，手机网络下首屏很慢。 · With the engine copy and the game's own modules, the page made about 260 requests before anything could start.
- 绕过办法 · Workaround：`tools/bundle.mjs` 用 esbuild 把它们打成一个压缩的 `build/lantern.js`，`?dev` 仍按源码逐个加载；测试检查打包文件不比源码旧（`7647b50`）。 · The modules are packed with esbuild into one file; `?dev` still loads them one by one, and a test checks the pack is current.
- 建议 · Suggestion：引擎仓库的 `tools/vendor-game.mjs` 可以提供 `--bundle`，直接给游戏一个按入口打好的单文件。 · `tools/vendor-game.mjs` could offer `--bundle` and give a game one file per entry.
- 状态 · Status：引擎 guide 卡片 `fast-startup` 已写明这种做法；引擎还没有打包选项 · the fast-startup card describes it; the engine has no bundling option yet.

### 3. 同一份骨骼数据最多 128 个 Spine 实例 · At most 128 Spine instances of one skeleton — 未解决 / open
<!-- engine-note: {"id": "LanternShadows#3", "status": "open", "topic": "spine-instance-limit"} -->

- 现象 · What happens：`?act=3&clones=200` 时，分身连同台上的悟空超过 128 个，`@egret/spine` 的加载器在建第 129 个实例时抛 `SPINE_INSTANCE_LIMIT_FAILED`（原因 `INSTANCE_LIMIT`），多出的分身建不出来。升级前后的副本（`2fb4646` 与 `b5628eb`）都是这样；默认的一百个分身不会碰到。 · With `?clones=200` the clones and the Monkey King pass 128 instances and the 129th fails with `SPINE_INSTANCE_LIMIT_FAILED`; both engine copies behave so, and the default hundred stays under it.
- 游戏里 · In the game：默认一把毫毛变一百个分身；画面太慢时还会收回一部分。`?clones` 允许到 400，超过上限的部分建不出来。 · A hundred clones by default, fewer when the stage is slow; `?clones` allows up to 400, and those past the limit are not made.
- 建议 · Suggestion：在文档里写明这个上限并允许设置；或者给出上限常量，让游戏据此限制分身数。 · Document the limit and let it be set, or export it so a game can cap its crowd.
- 状态 · Status：8e70dcb3 的 Spine 加载器仍有 128 个活跃实例限制（vendor/spine/dist/loader.js），默认一百个分身在真实 PC 三幕正常运行；未重新运行 200 分身的越界复现。游戏没有改 `?clones` 的范围 · open: the 8e70dcb3 loader still limits live instances to 128; the default hundred clones ran in the three-act desktop test. The 200-clone failure was not re-run. The game's `?clones` range is unchanged.
