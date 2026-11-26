# 引擎笔记 · Engine notes

做这款游戏时发现的新白鹭引擎（提交 `450bb9e`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。第 1 条随模板而来，仍然适用。

The faults found in the new Egret engine (commit `450bb9e`) while making this game, and suggestions, written as in
part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md). Item 1 came with the template and still applies.

### 1. `save.update` 返回布尔值 · `save.update` returns a boolean — 已写入文档 / documented

- 现象：`createSaveStore` 的 `update(change)` 在存储拒绝写入或数据没通过 `validate` 时返回 `false`，成功返回 `true`，不返回对象；写成 `result.ok === false` 的判断永远不成立，进度丢了也不会提示。 · What happens: `update(change)` returns `false` when the storage refuses or the data fails `validate`, and `true` otherwise — not an object; a check written as `result.ok === false` never holds, and lost progress goes unsaid.
- 绕过办法：直接用返回的布尔值，`false` 时在界面上说「本次进度不会保留」（`src/main.mjs` 的 `setSetting`，`src/screens.mjs` 的结算）。 · Workaround: use the boolean as it is, and say on the screen that the progress will not be kept when it is `false`.
- 建议：引擎文档已写明返回值；可以在 `SaveStore` 的类型里给 `update` 的返回值起名（如 `SaveWriteResult = boolean`），让读类型的人一眼看到。 · Suggestion: the docs already say so; naming the return type would make it plain to anyone reading the types.
- 状态：已写入文档（`packages/engine/src/saveStore.ts` 的注释）。 · Status: documented in the engine's comments.

### 2. 粒子 `burst` 传小数时报"选项无效"，并让整个帧循环停下 · A fractional `burst` count reports invalid options and stops the frame loop — 未解决 / open

- 现象：`emitter.burst(60 + size / 30)` 传入小数时抛出 `PARTICLE_OPTIONS_INVALID`（`packages/engine/src/particleEmitter.ts` 第 280 行要求安全整数）。错误名说的是"创建选项"，查了半天选项才发现是 `burst` 的参数；而且异常是在 `update` 里抛的，`createBrowserGame` 的帧循环随之停下，画面定格、没有任何提示。 · What happens: a fractional count throws `PARTICLE_OPTIONS_INVALID`, which names the creation options although the fault is `burst`'s argument; thrown inside `update`, it stops the game's loop and the picture freezes without a word.
- 绕过办法：`emitter.burst(Math.round(...))`（`src/view/play.mjs`）。 · Workaround: round the count.
- 建议：`burst` 把数向下取整（或至少用 `PARTICLE_BURST_INVALID` 这样指明参数的错误名）；帧循环因为 `update` 抛错停下时，在控制台说一句"帧循环已停止"并给出 `onError` 的用法。 · Suggestion: floor the count in `burst`, or at least name the argument in the error; and when the loop stops because `update` threw, say so in the console with a pointer to `onError`.
- 状态：未解决。 · Status: open.

### 3. 放掉仍挂在 `Bitmap` 上的贴图，要到下一帧画的时候才报错 · Releasing a texture a `Bitmap` still shows fails only when the next frame is drawn — 已写入文档 / documented

- 现象：托盘里的积木换了以后，代码把旧积木的贴图租约 `release()` 掉，但空中那块积木的 `Bitmap` 还挂着同一张贴图（已经隐藏）。`release()` 本身不报错，下一帧画面收集时抛出 `ASSET_LEASE_RELEASED`，帧循环停下。报错里看不出是哪个 `Bitmap`、哪张贴图。 · What happens: a lease was released while a hidden `Bitmap` still held it; `release()` succeeded, and the next frame threw `ASSET_LEASE_RELEASED` and the loop stopped, without saying which bitmap or texture.
- 绕过办法：只放掉没有任何积木、也没有任何 `Bitmap` 在用的贴图（`src/view/play.mjs` 的 `forget`）。 · Workaround: release only textures no piece and no bitmap uses.
- 建议：`Bitmap` 被赋予租约时自己记一次引用，或者 `release()` 时发现还有显示对象在用就直接报错并带上那个对象的名字；画面收集时遇到已放掉的租约，跳过这个对象并警告一次，而不是让整帧失败。 · Suggestion: let a `Bitmap` hold its own reference, or make `release()` fail at once naming the display object still using it; when drawing meets a released lease, skip that object with one warning instead of failing the frame.
- 状态：已写入文档（引擎 #485，`8637ace`）：引擎把这条写成 guide 卡片 pixel-strips；放掉仍在显示的贴图仍不当场报错，下一帧以 `ASSET_LEASE_RELEASED` 失败。 · Documented (engine #485, `8637ace`): the engine wrote this up as its pixel-strips guide card; releasing a shown lease still does not throw, and the next frame fails with `ASSET_LEASE_RELEASED`.

### 4. 2D 没有可以局部更新的贴图 · No 2D texture that can be updated in part — 已写入文档 / documented

- 现象：沙盘每帧都有沙在动。2D 的 `Texture` 是不可变的，`game.textureFromPixels` 每调一次就是一张新贴图（新的资源键、新的显卡纹理）。整张 200×300 的沙盘每帧重建一张贴图太浪费。 · What happens: 2D textures are immutable and each `textureFromPixels` call makes a new one; rebuilding the whole tray each frame is wasteful.
- 绕过办法：沙盘切成十五条 200×20 的贴图，每条一个 `Bitmap`，只有沙动了的那几条重新 `textureFromPixels`，换上新租约后放掉旧的；同一条上一次还没传完就等下一帧（`src/view/board.mjs`）。 · Workaround: fifteen strip textures, each its own bitmap; only the strips whose sand moved are made again, the old lease released after the swap.
- 建议：给 2D 一个可写的贴图，例如 `game.createDynamicTexture(width, height)` 返回 `{ lease, write(pixels, rect) }`，`write` 只上传改动的矩形（WebGL2 的 `texSubImage2D`、WebGPU 的 `writeTexture`）。World3D 的 `Texture3D.setSource` 已经能换源，2D 可以对齐。 · Suggestion: a writable 2D texture whose `write(pixels, rect)` uploads only the changed rectangle, in line with `Texture3D.setSource` in World3D.
- 状态：已写入文档（引擎 #485，`8637ace`）：引擎把本作的条带做法写成 guide 卡片 pixel-strips；可局部更新的 2D 贴图还没有。 · Documented (engine #485, `8637ace`): the engine wrote this game's strips up as its pixel-strips guide card; a 2D texture that updates in part is not there yet.

### 5. WebGPU 没有开放计算通道 · No compute pass on WebGPU — 未解决 / open

- 现象：沙的模拟（每帧几万个格子按规则移动）正适合放到 WebGPU 计算着色器里，但引擎的 2D 与 World3D 都没有让游戏提交计算着色器的接口（引擎副本里找不到 `createComputePipeline` 或 `dispatchWorkgroups`）。 · What happens: the sand is a good fit for a WebGPU compute shader, but neither the 2D side nor World3D lets a game submit one.
- 绕过办法：规则在主线程上用类型数组跑，只处理有沙在动的行，每帧约 0.5 ms（`src/sim/sand.mjs`）。 · Workaround: the rules run on the main thread over typed arrays, only rows with moving sand, about 0.5 ms a frame.
- 建议：加一个最小的计算接口：建存储缓冲、写 WGSL 计算着色器、按格子派发，结果直接作为 2D 或 3D 贴图的来源；WebGL2 下给出明确的"不支持"，让游戏退回 CPU。 · Suggestion: a minimal compute interface (storage buffers, a WGSL compute shader, a dispatch, the result usable as a texture), with a clear "unsupported" on WebGL2 so a game can fall back.
- 状态：未解决。 · Status: open.

### 6. `createLabel` 不会按宽度换行 · `createLabel` does not wrap to a width — 已写入文档 / documented

- 现象：玩法说明、失败提示这类长句需要在固定宽度里折行，`game.createLabel` 只认 `\n`，没有宽度选项。段落排版在 `@egret/engine/paragraph` 里，但要另配字体资源和段落提供器，对一行说明来说太重。 · What happens: `createLabel` breaks lines only at `\n` and has no width option; the paragraph entry needs its own font resources and provider, too much for a line of help.
- 绕过办法：`src/screens.mjs` 的 `wrap()` 按字号估算每行字数，中文按字、英文按词插入 `\n`。 · Workaround: a small `wrap()` that estimates characters a line from the font size.
- 建议：`createLabel` 加 `maxWidth`，用文字光栅化时已经量出的字宽折行（中文按字、西文按词，避头标点）。 · Suggestion: a `maxWidth` option that wraps with the widths the rasterizer already measures.
- 状态：已写入文档（引擎 #485，`8637ace`）：引擎把这条写成 guide 卡片 label-wrap：`play` 用 `wrapPlayWords`，要求断行准确时用段落；`createLabel` 自己仍不折行。 · Documented (engine #485, `8637ace`): the engine wrote this up as its label-wrap guide card: `wrapPlayWords` in `play`, a paragraph where breaking must be right; `createLabel` itself still does not wrap.

### 7. 不会动的大块内容每帧都要重画 · Large still content is drawn again every frame — 已写入文档 / documented

- 现象：引擎每帧把整棵显示树重画一遍。沙盘的紫檀框、碟子、手卷和装裱都不会动，但无头 Chromium + SwiftShader 下逐个隐藏它们测帧时间，每个都占 3–5 ms；把卷首的静止部分合成一张全屏贴图反而更慢（p95 从 33.4 ms 升到 66.7 ms），因为整屏贴图每帧都要填一遍。 · What happens: the whole display tree is drawn every frame. The frame, dishes, scroll and mount never move, yet under software drawing each cost 3–5 ms; one full-screen texture of the title's still parts was slower still (p95 33.4 → 66.7 ms), since the whole screen is filled every frame.
- 绕过办法：引擎画布透明（`clearAlpha: 0`），页面在它下面放一张 canvas，由各画面在进入时画一次、变化时重画（`src/main.mjs` 的 `backdrop`）；卷首的沙雨改成 CSS 变换动画。作画画面中位数从约 35 ms 降到约 20 ms，卷首 F1 降到 16.8 ms。 · Workaround: a clear engine canvas over a page canvas each screen paints once and again on change; the title's drifting sand is a CSS transform animation. A round went from about 35 to 20 ms a frame, the title's F1 to 16.8 ms.
- 建议：给显示对象一个"静止层"（类似旧白鹭的 `cacheAsBitmap`）：子树画进一张离屏贴图，内容不变时每帧只合成脏区域；或者让 `createBrowserGame` 提供一张由引擎管理的背景层，免得每个游戏自己对齐页面画布。 · Suggestion: a still layer for a subtree (like the old engine's `cacheAsBitmap`), or a background layer managed by `createBrowserGame` so games need not line up a page canvas themselves.
- 状态：已写入文档（引擎 #485，`8637ace`）：同 CanalWatch 第 3 条，写进 guide 卡片 still-background。 · Documented (engine #485, `8637ace`): as CanalWatch item 3, in the still-background guide card.
