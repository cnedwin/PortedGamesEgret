# 引擎笔记 · Engine notes

做洗冤笔录时发现的新白鹭引擎（提交 `f0f2e01`，副本已升到 `95897d7`）的缺口与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。凡是引擎做不到的，游戏都换了一个用引擎现有部件的做法，没有绕过引擎自己去画。

The gaps found in the new Egret engine (commit `f0f2e01`; the copy is now at `95897d7`) while making The Inquest Scrolls, and suggestions, written as
in part 3 of docs/GAME-STANDARD.md. Wherever the engine could not do something, the game found another way with the
engine's own parts instead of drawing around it.

### 1. 段落不支持竖排 · Paragraphs cannot set text vertically — 未解决 / open

- 现象：`createParagraph` 的请求只有 `direction: 'ltr' | 'rtl'`，没有竖排（`writing-mode: vertical-rl` 那样的从上到下、从右到左）。宋代题材的标题、卷宗、印文本该竖写。 · What happens: a paragraph request has only `direction: 'ltr' | 'rtl'`; there is no vertical writing, which titles and documents of a Song setting call for.
- 绕过办法：标题“洗冤笔录”用一个只有一字宽的段落，让排版每行只放一个字，看上去是竖写（`src/view/screens.mjs` 的 `titleScreen`）；卷宗正文保持横排。这个做法只适用于不断行的短标题，标点和西文都不会旋转。 · Workaround: the title is a paragraph one character wide, so each line holds one character; the dossier stays horizontal. It works only for short titles: punctuation and Latin letters are not turned.
- 建议：段落请求加竖排方向（CanvasKit 的 SkParagraph 目前不排竖排，需要引擎自己按列排字并提供列的文字几何），至少给出“每列一字、标点转向”的简化版。 · Suggestion: a vertical direction for paragraphs, with column geometry; even a simple one-character-per-row mode with turned punctuation would serve titles.
- 状态：未解决。 · Status: open.

### 2. `game.image` 只收 PNG · `game.image` takes PNG only — 已在 95897d7 解决 / resolved in 95897d7

- 现象：`play` 的 `game.image(url)` 读 WebP 时报 `WEB_PNG_STRUCTURE_INVALID`：它自己解 PNG，不走浏览器解码。本作五十多张图都是 WebP（同画质比 PNG 小得多）。 · What happens: `game.image` decodes PNG itself and refuses WebP with `WEB_PNG_STRUCTURE_INVALID`; all of this game's pictures are WebP.
- 绕过办法：用 `@egret/engine/web/kit` 的 `createBrowserImageTextureProvider` 注册一种资源类型，交给引擎资源管理器，`new Bitmap(lease)` 显示（`src/view/pictures.mjs`）；每案的图再用 `engine.createAssetGroup` 成组载入。 · Workaround: `createBrowserImageTextureProvider` registered as an asset type, shown with `new Bitmap(lease)`; each case's pictures are loaded as one asset group.
- 引擎提交 `95897d7`（#471）：`game.image` 按文件字节选解码器，JPEG、WebP、GIF、AVIF 走浏览器解码，PNG 仍严格校验。 · Engine commit `95897d7` (#471): `game.image` picks the decoder from the bytes; JPEG, WebP, GIF and AVIF go through the browser, PNG keeps its strict check.
- 本作现在：仍用资源类型加 `engine.createAssetGroup`，因为每案的图片要成组载入、成组释放；单张图本可以直接用 `game.image`。 · This game now: keeps the asset type with `engine.createAssetGroup`, since each case's pictures load and go as one group.
- 状态：已在 `95897d7` 解决。 · Status: resolved in `95897d7`.

### 3. 小游戏里没有 CanvasKit，段落用不了 · No CanvasKit in a mini game, so no paragraphs — 未解决 / open

- 现象：段落提供者只有 `createCanvasKitFontSetProvider`，要靠 CanvasKit 的 WebAssembly（8.5 MB）。微信小游戏的适配层不提供 `WebAssembly`（手机上是另一套 `WXWebAssembly`），也不提供 `FontFace`，CanvasKit 的脚本也不会被导出工具打进 `game.js`；何况它本身就超过 4 MB 主包。 · What happens: the only paragraph provider needs CanvasKit's WebAssembly; the mini game adapter gives no `WebAssembly` and no `FontFace`, the exporter does not bundle the CanvasKit script, and it alone is larger than the 4 MB main package.
- 游戏里：小游戏（或网页加 `?plain=1`）改用 `src/view/plainText.mjs`：用画布量出每个字的宽度，按中文与西文各自的断行规矩（行首不放“，。”、行尾不留“（《”）断行，每行按颜色切成几段，每段是一个引擎的画布文字标签；同时给出与 CanvasKit 段落同形的文字几何（`clusters`、`getSelectionRects`、`hitTest`），所以证物点词、卷宗量空位的代码两边通用。小游戏验收脚本 `test/minigame.mjs` 在替身里走通了全程。 · In the game: in a mini game paragraphs are put together from canvas labels by measured widths and line-breaking rules, with text geometry of the same shape as CanvasKit's, so the same code finds words and blanks; the mini game walk passes in the stand-in.
- 建议：给 `@egret/engine/paragraph` 加一个不依赖 WebAssembly 的简单提供者（画布 2D、按字量宽、基本断行、带样式的段、文字几何），并在小游戏文档里写明段落、编辑器、网页字体在小游戏里不可用。 · Suggestion: a plain paragraph provider without WebAssembly (2D canvas, measured characters, basic line breaking, styled runs, geometry), and a line in the mini game document saying paragraphs, editors and page fonts are not available there.
- 状态：未解决。 · Status: open.

### 4. 小游戏里没有文字输入 · No text input in a mini game — 未解决 / open

- 现象：`@egret/engine/web/text-input` 和 `@egret/engine/web/editing` 都靠在画布上放一个平台文本框；小游戏只有一块画布，没有文本框，适配层也不把 `wx.showKeyboard` 接成输入。 · What happens: the text input and the editor both place a platform text field over the canvas; a mini game has one canvas and no text field, and the adapter does not turn `wx.showKeyboard` into input.
- 游戏里：小游戏里判词和笔录都改用字盘（`src/view/board.mjs`）：判词的字盘是答案要用的字加同样多的干扰字，笔录的字盘是本案收到的词加一组记号（“可疑”“说谎”“不在场”……）。一行字签合成一个标签，五十个字签只占几张图。 · In the game: the verdict and the notes are tapped out on a board in a mini game; the verdict board holds the characters an answer needs and as many that lead nowhere, the notes board the case's words and a few marks.
- 建议：引擎提供一个基于 `wx.showKeyboard` / `onKeyboardInput` / `onKeyboardConfirm` 的文字输入后端，接口与 `createBrowserTextInput` 相同。 · Suggestion: a text input backend over `wx.showKeyboard` with the same interface as the browser one.
- 状态：未解决。 · Status: open.

### 5. 命中只看节点自己的绘制 · Hit testing uses only a node's own drawing — 未解决 / open

- 现象：`game.onTap(sprite, …)` 打开了 `touchEnabled`，但命中检测只拿这个节点自己的 `graphics` 当命中区，子节点的绘制不算，没开 `touchEnabled` 的子节点也不把命中交给父节点（`displayHitTest.js`：“Without an area, the node's own drawing is the area”）。按钮的底色画在子节点上时，按钮永远点不中，键盘却能触发，很难发现。 · What happens: `onTap` enables touch, but a hit uses only the node's own drawing; a child's drawing does not count and an untouchable child does not pass the hit up. A button whose face is drawn on a child can never be clicked, though the keyboard still works.
- 绕过办法：每个可点的精灵在自己身上画一块几乎透明的命中区（`src/view/ui.mjs` 的 `hitBox`，按钮里补了这一步）。 · Workaround: every tappable sprite draws a nearly clear box of its own.
- 建议：`onTap` 在节点自己没有绘制时用它的包围盒，或在文档和报错里写明这条规则、推荐设置 `hitArea`。 · Suggestion: let `onTap` fall back to the node's bounds when it draws nothing itself, or say so in the docs and recommend `hitArea`.
- 状态：未解决。 · Status: open.

### 6. 移除精灵不释放标签的光栅 · Removing a sprite does not free a label's raster — 部分解决 / partly resolved

- 现象：`browser.createLabel` 做出的标签占着文字缓存里的一格，只有 `made.dispose()` 才还。把标签所在的精灵 `game.remove` 掉，缓存不还；反复重排卷宗后新标签等不到缓存位，出现字不显示或旧字残留。 · What happens: a label holds a place in the text cache until its own `dispose()`; removing its sprite does not give it back, and after many re-layouts new labels wait or old ones linger.
- 绕过办法：`src/view/type.mjs` 的 `discard(node)` 先走一遍子树，逐个释放标签，再移除；全游戏的移除都经过它。 · Workaround: `discard(node)` walks the subtree and frees each label before removing it.
- 引擎提交 `95897d7`（#472）：标签有了 `setRasterActive(false)`，隐藏时能先还掉光栅、留着文字和样式；`getLabelStatus()` 给出排队、拒绝和释放的计数。play 自己的标签隐藏时会自动释放。 · Engine commit `95897d7` (#472): a label can give back its raster while hidden with `setRasterActive(false)`, and `getLabelStatus()` counts the queue, refusals and releases; play's own labels do this when hidden.
- 建议：`browser.createLabel` 的标签在显示对象被销毁时也自动释放，省掉游戏自己的 `discard`。 · Suggestion: free a `createLabel` label when its display object is disposed too.
- 状态：部分解决：移除精灵仍不会自动释放，本作继续用 `discard`。 · Status: partly resolved; removing a sprite still frees nothing, and this game keeps `discard`.

### 7. 一个资源管理器只能有一个段落缓存 · One paragraph cache per asset manager — 未解决 / open

- 现象：段落缓存要在资源管理器上注册段落这种资源类型，同一个管理器上第二次 `createParagraphCache(engine.assets, …)` 会被拒绝；段落的文档里没有写这一点，笔录编辑器又要求传入缓存，容易各建一个。 · What happens: a paragraph cache registers the paragraph asset type on the manager, so a second `createParagraphCache` on the same manager is refused; the paragraph documents do not say so, and the notes editor asks for a cache too, which invites making a second one.
- 游戏里：全游戏的段落共用 `openType` 里建的一个缓存（`src/view/type.mjs`），包括笔录合上输入框后的正文。 · One cache made in `openType` serves all paragraphs, including notes after the native input closes.
- 建议：在 `createParagraphCache` 和段落 SDK 的文档里写明“一个资源管理器一个缓存，全游戏共用”。 · Suggestion: say "one cache per asset manager, shared by the whole game" in the function's and the paragraph SDK's documentation.
- 状态：未解决。 · Status: open.

### 8. 一帧最多 64 张图，每个标签算一张 · At most 64 images a frame, and each label is one — 未解决 / open

- 现象：每个文字标签是一张独立的纹理；字盘的五十个字签加上卷宗和现场，一帧超过 64 张，引擎报 `FRAME_IMAGE_BUDGET` 并停下。 · What happens: each label is its own texture; fifty board tiles with the dossier and the scene went over 64 images and the engine stopped with `FRAME_IMAGE_BUDGET`.
- 绕过办法：字盘一行字签合成一个标签（按量出的宽度画方框）；卷宗占满全屏时不画底下的现场。 · Workaround: one label a row of tiles, boxes drawn by measured widths; the scene is hidden under the full-screen dossier.
- 建议：标签共用文字图集，或把预算的说明和当前帧用了多少张图暴露出来，便于在开发时就看到。 · Suggestion: share an atlas between labels, or expose the budget and the current count so it shows during development.
- 状态：未解决。 · Status: open.

### 9. 小游戏里舞台大于游戏区，坐标差一个偏移 · In a mini game the stage is larger than the game's area — 未解决 / open

- 现象：微信适配层让画布铺满手机屏，舞台按设计宽度长成屏幕的形状（390×844 的屏上是 720×1558），游戏区 720×1280 居中。此时 `game.pointer.x/y` 是游戏区坐标，`localToGlobal` / `globalToLocal` 和悬停事件的 `globalX/Y` 是舞台坐标，两者差游戏区的偏移；网页上 `fit: 'contain'` 时两者相同，问题只在小游戏出现。`game.width/height` 仍是 720×1280，多出来的上下两条游戏画不到。 · What happens: in the mini game the stage grows to the screen's shape and the game's area sits centred in it; `game.pointer` is in the game's units while `localToGlobal` and hover events are in stage units, which differ by that offset only there. `game.width/height` stay 720 × 1280, so the bands above and below cannot be drawn.
- 绕过办法：需要换算的地方用 `game.ui.localToGlobal(0, 0)` 取偏移（`src/view/card.mjs` 点词、`src/view/casebook.mjs` 悬停）；上下两条留作暗色边。 · Workaround: the offset from `game.ui.localToGlobal(0, 0)` where a point crosses over; the bands stay dark.
- 建议：给 `game.pointer` 加一个舞台坐标，或给 play 一个把舞台点换成游戏点的函数；`fit: 'expand'` 在小游戏里也让 `game.width/height` 跟着变。 · Suggestion: a stage-unit pointer or a conversion function in play, and `game.width/height` that follow `fit: 'expand'` in a mini game too.
- 状态：未解决。 · Status: open.

### 10. 字体内容构建要 Node 26.7.0 · The font content build needs Node 26.7.0 — 已写入文档 / documented

- 现象：引擎的内容构建工具（`buildContentProject`）要求 Node 26.7.0，常见的 Node 22 跑不起来。 · What happens: the engine's content build tools require Node 26.7.0, so the common Node 22 cannot run them.
- 游戏里：`tools/assets/fonts.mjs` 只在换字体或改了文字时跑，用官方的 Node 26.7.0 压缩包；产物（`assets/fonts/build/`）提交进仓库，游戏和测试只用 Node 22。 · In the game: the font build runs only when the words change, with the official Node 26.7.0 archive; its output is committed, and the game and tests need only Node 22.
- 建议：在字体资源文档里也写上这个版本要求。 · Suggestion: say so in the font resource document too.
- 状态：已写入文档（引擎的 `tools/doctor.mjs` 与 `tools/verify-content-build.mjs`）。 · Status: documented in the engine's `tools/doctor.mjs` and `tools/verify-content-build.mjs`.

### 11. 段落图像超过尺寸上限 · Paragraph image exceeds the size limit — 已在游戏侧绕过 / worked around

- 现象：Fold7 横屏开卷时，段落按画布缓冲区选择的像素密度过高，序言准备失败。外层报 `ASSET_LOAD_FAILED`，内层为 `PARAGRAPH_IMAGE_LIMIT`。 · On a Fold7 in landscape, the density chosen from the canvas backing buffer was too high for the prologue paragraph. Preparation failed with `ASSET_LOAD_FAILED` wrapping `PARAGRAPH_IMAGE_LIMIT`.
- 绕过办法：`src/view/type.mjs` 按可见画布尺寸和 DPR 算密度。遇到尺寸上限时降低密度重试，沿用原段落布局和命中几何。 · The game derives density from the displayed canvas and DPR, and retries size-limit failures at a lower density while preserving layout and hit geometry.
- 建议：给应用提供可用的最大光栅尺寸及结构化错误原因，便于在准备前选择密度。 · Expose raster limits and a structured failure cause so callers can choose a density before preparation.
- 状态：网页真机复测通过。 · Workaround verified on the physical Fold7.

### 12. 笔录托管编辑器创建和失焦 · Managed editor creation and blur — 已在游戏侧绕过 / worked around

- 现象：Windows Chrome 和 Fold7 在 `game.onTap` 派发内调用 `createUiTextEditor` 会报 `UI_BUSY: input is being delivered`。延后创建可首次输入，但 PC 键入后按 Tab，`createBrowserTextEditor` 保留只读输入框，点纸面重进报 `BROWSER_TEXT_EDITOR_PRESENTATION_PENDING`。 · Creating the managed editor during tap dispatch raised `UI_BUSY: input is being delivered` on Windows Chrome and Fold7. Deferring creation let the first edit work. On PC, typing then pressing Tab left a readonly textarea, and tapping the paper to re-enter raised `BROWSER_TEXT_EDITOR_PRESENTATION_PENDING`.
- 绕过办法：`src/view/notes.mjs` 改用 `createBrowserTextInput`，沿用宣纸段落，保存已完成输入法组字的文本，失焦时提交。 · Notes now use `createBrowserTextInput` over the canvas paragraph. Completed input is autosaved and blur commits.
- 建议：记录派发限制，并提供已改值的托管多行编辑器在 Tab 失焦后提交展示、退役只读控件和重新激活的示例。 · Document the dispatch restriction and provide a changed multiline example that publishes after Tab blur, retires the readonly control and reopens cleanly.
- Fold7 额外复现：软键盘展开时，点「合上」的按下触发失焦。可见区域移动后，松手被引擎解析到按钮外。`src/view/notes.mjs` 用同一触点的物理落点复核松手，保留原生失焦提交。 · Fold7 also reproduced blur moving the visual viewport between touch down and up on Close. The game checks the release of the same touch in visual viewport coordinates while retaining native blur-to-commit.
- 状态：游戏侧修复，白鹭副本保持 `95897d78`。 · Game-side workaround on unmodified Egret `95897d78`.
