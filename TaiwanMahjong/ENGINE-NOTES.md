# 引擎笔记 · Engine notes

当前引擎副本为 `2e53f45f`，见 [vendor/SOURCE.md](vendor/SOURCE.md)。第 1 至 6 条保留初版 `b5628eb` 的验证记录，所列帧时间来自无头 Chromium 153 和 SwiftShader。第 7 条记录现版原生界面发现的问题。

The current engine copy is `2e53f45f`. Items 1–6 retain findings from `b5628eb`, with frame timings from headless Chromium 153 and SwiftShader. Item 7 concerns the current native UI.

### 1. `play` 让页面按钮上的 Tab 和 Space 失灵 · `play` takes Tab and Space from the page's buttons — 已在 `450bb9e` 解决 / resolved in `450bb9e`
<!-- engine-note: {"id": "TaiwanMahjong#1", "status": "resolved", "topic": "play-page-keys", "workaround": ["src/main.mjs"]} -->

- 现象：与 [CanalWatch 的 ENGINE-NOTES 第 1 条](../CanalWatch/ENGINE-NOTES.md)相同。本作的操作全是页面按钮（手牌、吃碰槓胡、面板）。 · What happens: as CanalWatch's item 1; every control here is a page button.
- 绕过办法：本作不读 `play` 的按键，所以在 `window` 的捕获阶段接住所有按键、自己处理，再停止传播（`src/main.mjs` 的「Keys」一节）。 · Workaround: the game reads none of play's keys, so every key is caught in the capture phase, handled, and stopped.
- 建议：同 CanalWatch 第 1 条。 · Suggestion: as there.
- 状态：已在 `450bb9e` 解决（引擎 #457）：同 CanalWatch 第 1 条。 · Resolved in `450bb9e` (engine #457): as CanalWatch item 1.

### 2. `play({ parent, transparent: true })` 的画布盒子是黑的 · A black holder under a clear canvas — 已在 `450bb9e` 解决 / resolved in `450bb9e`
<!-- engine-note: {"id": "TaiwanMahjong#2", "status": "resolved", "topic": "play-clear-holder", "workaround": ["src/main.mjs"]} -->

- 现象：与 [CanalWatch 的 ENGINE-NOTES 第 2 条](../CanalWatch/ENGINE-NOTES.md)相同，下面的牌桌透不出来。 · What happens: as CanalWatch's item 2.
- 绕过办法：`play` 返回后把 `game.canvas.parentElement` 的背景改成透明（`src/main.mjs` 的 `buildEngine`）。 · Workaround: the holder made clear.
- 建议：同 CanalWatch 第 2 条。 · Suggestion: as there.
- 状态：已在 `450bb9e` 解决（引擎 #457）：同 CanalWatch 第 2 条。 · Resolved in `450bb9e` (engine #457): as CanalWatch item 2.

### 3. `play` 的画布像素只看 `width`，不能降分辨率；1280×720 的空画布就超时 · `play`'s canvas follows its width alone, with no way to draw at a lower resolution; an empty 1280 × 720 canvas is already over budget — 已在 `95897d7` 解决 / resolved in `95897d7`
<!-- engine-note: {"id": "TaiwanMahjong#3", "status": "resolved", "topic": "play-resolution", "workaround": ["src/view.mjs"]} -->

- 现象：画布的像素数总是 `width × height × 设备像素比`，和外层盒子多大无关（盒子 960 宽时画布仍是 1280 宽），`play` 还把画布的内联 CSS 宽高设成 `width`、`height`。什么都不画的 `play({ width: 1280, height: 720 })`，透明或不透明，帧时间 p95 都是 33.4 ms；960×540 是 16.8 ms，640×360 是 16.7 ms。本作需要整张 1280×720 的桌面（牌会飞过整张桌子）。 · What happens: the canvas always has width × height × device ratio pixels, whatever its holder (a 960-wide holder still got a 1280-wide canvas), and play sets the canvas's inline CSS to that size. An empty `play` of 1280 × 720, clear or not, ran at 33.4 ms p95; 960 × 540 at 16.8 ms and 640 × 360 at 16.7 ms. This game needs the whole 1280 × 720 table, as tiles fly across it.
- 绕过办法：`play` 开成 960×540，游戏自己的根节点缩放 0.75（`src/view.mjs`），外层盒子用 CSS 放大 4/3，再用 `!important` 把画布的 CSS 尺寸压回盒子大小（`style.css`）。标题和牌局中的帧时间 p95 都回到 16.8 ms；代价是像素比 1 的屏幕上手牌比静态牌稍软（像素比 2 时引擎画布实际 1920 宽）。 · Workaround: play at 960 × 540 with the game's own root scaled 0.75, the holder scaled up 4/3 by CSS, and the canvas's CSS size pinned to the holder with `!important`. Title and play run at 16.8 ms p95; the cost is a slightly softer hand on a ratio-1 screen (at ratio 2 the canvas is 1920 wide).
- 建议：给 `play` 一个 `resolution`（或 `pixelRatio`）选项，并让画布按外层盒子的大小来定。 · Suggestion: a `resolution` (or `pixelRatio`) option on play, and the canvas sized by its holder.
- 状态：已在 `95897d7` 解决（引擎 #471）：`play({ pixelRatio })` 与舞台尺寸分开，可以降分辨率。 · Resolved in `95897d7` (engine #471): `play({ pixelRatio })` is apart from the stage size and can draw at a lower resolution.

### 4. 外层元素旋转时 `play` 直接拒绝启动，哪怕游戏不读指针 · `play` refuses to start under a rotated element, even when the game reads no pointer — 已写入文档 / documented
<!-- engine-note: {"id": "TaiwanMahjong#4", "status": "documented", "topic": "play-rotated-parent", "workaround": ["src/main.mjs", "src/view.mjs"]} -->

- 现象：竖屏时把整张牌桌（含引擎画布）用 CSS 转 90°，`play` 报 `POINTER_INPUT_SURFACE_INVALID: an element around the canvas has a CSS transform that rotates, skews or mirrors it`，游戏起不来。本作的点击全在页面按钮上，用不到引擎的指针输入。 · What happens: turning the whole table, engine canvas included, a quarter with CSS on a tall screen made play fail with `POINTER_INPUT_SURFACE_INVALID`. Every tap here is on a page button; the engine's pointer input is not used.
- 绕过办法：牌桌拆成下层（静态牌桌）、引擎画布、上层（按钮和面板）三层；只有上下两层用 CSS 转，引擎画布不转。竖屏时把引擎重开成竖的（540×960），由游戏自己的根节点转 90°（`src/main.mjs` 的 `fit`、`buildEngine`，`src/view.mjs`）；屏幕方向一变就重开引擎。 · Workaround: the table split into a still layer, the engine canvas and a layer of controls; only the two page layers turn with CSS. On a tall screen the engine is made again tall (540 × 960) and the game's root turns a quarter inside it; the engine is made again whenever the screen turns.
- 建议：让 `play` 可以不建指针输入（例如 `pointer: false`），或者在旋转的外层下把指针坐标换算过去。 · Suggestion: let play leave pointer input out (`pointer: false`, say), or map pointer positions through a rotated parent.
- 状态：已写入文档（引擎 #485，`8637ace`）：引擎把这条写成 guide 卡片 play-turned-table；拒绝启动时的原因现在会说明规则。 · Documented (engine #485, `8637ace`): the engine wrote this up as its play-turned-table guide card; the refusal's cause now names the rule.

### 5. 几百个共用一张图集的静止 Bitmap 也很贵 · A few hundred still Bitmaps sharing one atlas are costly too — 已写入文档 / documented
<!-- engine-note: {"id": "TaiwanMahjong#5", "status": "documented", "topic": "shared-texture-bitmap-cost", "workaround": ["src/felt.mjs"]} -->

- 现象：原型里 1280×720 的 `play` 加 N 个共用一张 1024×1032 图集的 `Bitmap`（各取一块 `sourceRect`，缩放 0.4，静止不动）：0 个 p95 33.4 ms（见第 3 条），25 个 33.4 ms，100 个 p50 33.3 / p95 50.0 ms，250 个 p50 50.0 / p95 66.7 ms；250 个里有 40 个每帧移动也一样。一桌麻将到后半局有两百多张牌在桌上。与 [NezhaSea 的 ENGINE-NOTES 第 3 条](../NezhaSea/ENGINE-NOTES.md)（移动的 Bitmap）是同一类问题，这里静止的也一样贵。 · What happens: in a prototype, N Bitmaps cut from one 1024 × 1032 atlas by sourceRect, scaled 0.4 and still, on a 1280 × 720 play: none 33.4 ms p95 (item 3), 25 the same, 100 at 33.3 ms p50 / 50.0 ms p95, 250 at 50.0 / 66.7 ms; 40 of the 250 moving made no difference. A table late in a hand holds over two hundred tiles. The same kind of cost as NezhaSea's item 3, for still Bitmaps.
- 绕过办法：桌上静止的牌（牌河、副露、别家的手牌、花）画在引擎画布下面的一张页面 2D canvas 上，只在牌局变化时重画（`src/felt.mjs`）；引擎只画玩家的手牌（最多十几张）、飞行中的牌和大字、火花。 · Workaround: tiles at rest are painted on a page 2D canvas under the engine's, again only when the hand changes; the engine draws the player's hand, tiles in flight, and the words and sparks.
- 建议：同 NezhaSea 第 3 条：查贴图路径在软件渲染下的开销；另外可以考虑一个「静态层」——内容不变时只合成一次的容器（类似 `cacheAsBitmap`）。 · Suggestion: as NezhaSea's item 3; and perhaps a still layer — a container drawn once into a texture until its content changes, as `cacheAsBitmap` was.
- 状态：已写入文档（引擎 #485，`8637ace`）：同 NezhaSea 第 3 条，写进 guide 卡片 sprite-swarm。 · Documented (engine #485, `8637ace`): as NezhaSea item 3, in the sprite-swarm guide card.

### 6. 存档库的 `update` 把回调的返回值当新数据 · The save store's `update` takes the callback's return value as the new data — 已写入文档 / documented
<!-- engine-note: {"id": "TaiwanMahjong#6", "status": "documented", "topic": "save-update-return", "workaround": ["src/main.mjs"]} -->

- 现象：`save.update((data) => (data.setup.rounds = 4))` 这样的箭头函数返回了 `4`，`update` 就把 `4` 当成整份新存档，校验不过而拒绝写入，设置没改上，也没有报错。类型里写了 `(data: T) => T | void`，所以是设计如此，但很容易踩。 · What happens: an arrow such as `(data) => (data.setup.rounds = 4)` returns 4, which update takes as the whole new save; it fails validation, nothing is written, and no error is thrown. The type says `(data: T) => T | void`, so it is by design, but easy to fall into.
- 绕过办法：所有 `update` 的回调都写成花括号函数体，不返回值（`src/main.mjs`）。 · Workaround: every update callback has a block body and returns nothing.
- 建议：返回值不是对象时在开发模式里警告，或者在文档的例子里提醒。 · Suggestion: a development warning when the result is not an object, or a note in the docs' example.
- 状态：已写入文档（引擎 #423，`b3523fa`）：引擎把这条写成 guide 卡片 save-update-callbacks（回调写成花括号函数体）；回调的返回值仍当作新数据，`#424` 起回调改的是副本。 · Documented (engine #423, `b3523fa`): the engine wrote this up as its save-update-callbacks guide card (write callbacks as blocks); a returned value is still the new data, and since #424 the callback changes a copy.


### 7. 旋转界面上的纵向列表无法顺着内容拖动 · Vertical scrolling inside a rotated view — 未解决 / open
<!-- engine-note: {"id": "TaiwanMahjong#7", "status": "open", "topic": "rotated-view-scrolling", "workaround": ["src/ui.mjs"]} -->

- 现象：把 `game.ui` 转 90°，在其下用 `game.show` 创建 `scroll: 'vertical'` 的可滚动面板。从列表中央沿屏幕水平方向拖约 78 CSS 像素，滚动偏移不变。未旋转时沿屏幕纵轴拖动能滚动。 · With a 90-degree rotation on `game.ui`, a vertical scroll panel does not acquire a drag along its own vertical axis, now horizontal on screen. The same drag on the unrotated viewport scrolls normally.
- 最小复现：在 540×960 的画布上旋转 `game.ui` 90°，创建 300×200 的纵向面板并放入足够多的行。以触控顺着旋转后列表的纵轴拖动，比较 `view.scroll(name).offset`。`playViewScroll.js` 用舞台轴 `dx/dy` 决定是否接管，随后却按列表本地 Y 计算滚动位移。 · In a 540×960 stage, rotate the UI root, show a 300×200 vertical panel with content beyond its viewport and compare the scroll offset before and after a touch drag along its local Y. The drag threshold uses stage coordinates while the offset uses local Y.
- 绕过办法：在 `src/ui.mjs` 里由公开指针接口按面板本地坐标接管旋转后的触控，再写入白鹭的滚动偏移。 · The Demo observes and captures touch via the public pointer API in viewport coordinates, then updates the native scroll offset.
- 建议：统一在视口本地坐标中判断拖拽阈值、方向和位移。回归验证 0°、90°、反向拖动、横向滚动、越界释放。 · Use viewport-local coordinates for slop, direction and movement. Cover unrotated and rotated views, opposite-axis rejection, horizontal panels and release outside the viewport.
- 状态：Demo 已绕过，引擎仍待修复。 · The Demo has a workaround. The engine issue is open.
