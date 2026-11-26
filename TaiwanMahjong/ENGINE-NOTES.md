# 引擎笔记 · Engine notes

當前引擎副本為 `8e70dcb3`，見 [vendor/SOURCE.md](vendor/SOURCE.md)。第 1 至 6 條保留初版 `b5628eb` 的驗證紀錄，所列幀時間來自無頭 Chromium 153 和 SwiftShader。第 7、8 條記錄原生界面問題及引擎修復後的適配；各輪實測版本與結果見 [QUALITY.md](QUALITY.md)。

The current engine copy is `8e70dcb3`. Items 1–6 retain findings from `b5628eb`, with frame timings from headless Chromium 153 and SwiftShader. Items 7 and 8 record native UI issues and the migration after the engine fixes. See [QUALITY.md](QUALITY.md) for the tested versions and results.

本轮引擎集成：主干 `94bd70fb26b1f81794c9c6fbbb258c655fcd19df`（#502–#506），按需采用原生能力；下列原先的版本号保留作为问题发生时的历史。

This integration vendors official main `94bd70fb26b1f81794c9c6fbbb258c655fcd19df` (#502–#506), adopting native capabilities where equivalent; older revisions below are historical evidence.

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
- 原绕过办法（初版纪录）：`play` 开成 960×540，游戏自己的根节点缩放 0.75（`src/view.mjs`），外层盒子用 CSS 放大 4/3，再用 `!important` 把画布的 CSS 尺寸压回盒子大小（`style.css`）。當時标题和牌局中的帧时间 p95 都回到 16.8 ms；代价是像素比 1 的屏幕上手牌比静态牌稍软（像素比 2 时引擎画布实际 1920 宽）。 · Former workaround (original measurement): play at 960 × 540 with the game's own root scaled 0.75, the holder scaled up 4/3 by CSS, and the canvas's CSS size pinned to the holder with `!important`. Title and play then ran at 16.8 ms p95; the cost was a slightly softer hand on a ratio-1 screen (at ratio 2 the canvas was 1920 wide).
- 建议：给 `play` 一个 `resolution`（或 `pixelRatio`）选项，并让画布按外层盒子的大小来定。 · Suggestion: a `resolution` (or `pixelRatio`) option on play, and the canvas sized by its holder.
- 状态：已在 `95897d7` 解决（引擎 #471）：`play({ pixelRatio })` 与舞台尺寸分开，可以独立调整渲染密度。現在本 Demo 保留 0.75 的邏輯舞台比例，在 `src/layout.mjs` 按 `min(2, max(1, devicePixelRatio, CSS 顯示倍率 × devicePixelRatio))` 選擇密度，於舞台建置（含轉向重建）時透過 `src/main.mjs` 傳入原生 `pixelRatio`。一般文字標籤也使用該密度建立圖集，修正低像素比桌面上畫布及中文小字被放大的問題；標題細字、規則說明和結算資料略為加大。上限仍為 2，超過預算的大螢幕或高密度顯示仍可能略為放大。 · Resolved in `95897d7` (engine #471): `play({ pixelRatio })` controls render density independently of stage size. The current Demo keeps its 0.75 logical stage and picks `min(2, max(1, devicePixelRatio, CSS display scale × devicePixelRatio))` in `src/layout.mjs` when creating the stage, including on orientation changes. `src/main.mjs` passes it to native `play`; normal label rasters share that density, avoiding the former low-density desktop text upscaling. Small title, rule and settlement type is slightly enlarged. The 2× ceiling protects budgets; displays beyond that ceiling may still upscale.

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

- 本轮评估 · Integration：#505 提供显式 WebGL2 静态层捕获，但本游戏原本已将静止牌一次画成单层且实机默认可选 WebGPU；不额外读回、上传或强制切换后端。原来的旋转布局与语义扩展仍需保留。 · #505 adds explicit WebGL2 static-layer capture; the felt is already a single raster and the normal device path can be WebGPU, so a second capture/upload or backend change is not equivalent.

### 6. 存档库的 `update` 把回调的返回值当新数据 · The save store's `update` takes the callback's return value as the new data — 已写入文档 / documented
<!-- engine-note: {"id": "TaiwanMahjong#6", "status": "documented", "topic": "save-update-return", "workaround": ["src/main.mjs"]} -->

- 现象：`save.update((data) => (data.setup.rounds = 4))` 这样的箭头函数返回了 `4`，`update` 就把 `4` 当成整份新存档，校验不过而拒绝写入，设置没改上，也没有报错。类型里写了 `(data: T) => T | void`，所以是设计如此，但很容易踩。 · What happens: an arrow such as `(data) => (data.setup.rounds = 4)` returns 4, which update takes as the whole new save; it fails validation, nothing is written, and no error is thrown. The type says `(data: T) => T | void`, so it is by design, but easy to fall into.
- 绕过办法：所有 `update` 的回调都写成花括号函数体，不返回值（`src/main.mjs`）。 · Workaround: every update callback has a block body and returns nothing.
- 建议：返回值不是对象时在开发模式里警告，或者在文档的例子里提醒。 · Suggestion: a development warning when the result is not an object, or a note in the docs' example.
- 状态：已写入文档（引擎 #423，`b3523fa`）：引擎把这条写成 guide 卡片 save-update-callbacks（回调写成花括号函数体）；回调的返回值仍当作新数据，`#424` 起回调改的是副本。 · Documented (engine #423, `b3523fa`): the engine wrote this up as its save-update-callbacks guide card (write callbacks as blocks); a returned value is still the new data, and since #424 the callback changes a copy.


### 7. 旋转界面上的纵向列表无法顺着内容拖动 · Vertical scrolling inside a rotated view — 已在 `a52708fb` 解决 / resolved in `a52708fb`
<!-- engine-note: {"id": "TaiwanMahjong#7", "status": "resolved", "topic": "rotated-view-scrolling", "workaround": ["src/ui.mjs"]} -->

- 现象：把 `game.ui` 转 90°，在其下用 `game.show` 创建 `scroll: 'vertical'` 的可滚动面板。从列表中央沿屏幕水平方向拖约 78 CSS 像素，滚动偏移不变。未旋转时沿屏幕纵轴拖动能滚动。 · With a 90-degree rotation on `game.ui`, a vertical scroll panel does not acquire a drag along its own vertical axis, now horizontal on screen. The same drag on the unrotated viewport scrolls normally.
- 最小复现：在 540×960 的画布上旋转 `game.ui` 90°，创建 300×200 的纵向面板并放入足够多的行。以触控顺着旋转后列表的纵轴拖动，比较 `view.scroll(name).offset`。`playViewScroll.js` 用舞台轴 `dx/dy` 决定是否接管，随后却按列表本地 Y 计算滚动位移。 · In a 540×960 stage, rotate the UI root, show a 300×200 vertical panel with content beyond its viewport and compare the scroll offset before and after a touch drag along its local Y. The drag threshold uses stage coordinates while the offset uses local Y.
- 绕过办法（已移除）：在 `src/ui.mjs` 透過公開指標介面，以面板本地座標接管旋轉後的觸控，再寫入白鷺的捲動偏移。 · Former workaround (removed): observe and capture touch via the public pointer API in viewport coordinates, then update the native scroll offset.
- 建议：统一在视口本地坐标中判断拖拽阈值、方向和位移。回归验证 0°、90°、反向拖动、横向滚动、越界释放。 · Use viewport-local coordinates for slop, direction and movement. Cover unrotated and rotated views, opposite-axis rejection, horizontal panels and release outside the viewport.
- 状态：引擎 [#486](https://github.com/cnedwin/Egret_rebuild/pull/486) 已於 `a52708fb` 合併修復；`playViewScroll` 現在統一使用視口本地座標判斷拖曳方向、閾值及位移。本 Demo 已移除 `scrollRotatedTouch` 與規則／結算兩處擷取邏輯，直接使用 `view.scroll(name)`；更新後的瀏覽器驗收檢查 0°、90°、反向及垂直於捲動軸的拖曳。 · Resolved by engine #486 (`a52708fb`): scrolling uses viewport-local axes for slop, direction and movement. The Demo removes its rotated gesture observers from the rules and settlement and uses native scrolling. The updated browser script checks 0°/90°, reversal and cross-axis rejection.

### 8. 弹窗初始焦点与仅指针面板 · Named modal focus and pointer-only panels — 已在 `5da4489c` 解决 / resolved in `5da4489c`
<!-- engine-note: {"id": "TaiwanMahjong#8", "status": "resolved", "topic": "named-modal-focus", "workaround": ["src/ui.mjs", "src/screens.mjs", "src/round-ui.mjs"]} -->

- 现象：舊版的原生視圖預設選取彈窗中第一個可操作元件，遊戲無法依名稱指定開啟時的焦點，也沒有 `view.focus(name)`／`view.focused` 讓程式明確設定或讀取目前的焦點。如果用面板 `tap` 攔截空白處的指標操作，該面板亦會進入鍵盤焦點順序。 · Previously a modal picked its first actionable part by default, with no named initial choice or view-level focus access. A panel with a tap binding also took part in keyboard navigation.
- 最小复现：從標題的規則按鈕打開一個有兩個按鈕的彈窗，要求第二個按鈕先獲得焦點；再加入僅需要指標操作的面板，確認它不會接受 Tab 或語意啟用。關閉巢狀彈窗後，確認焦點回到開啟它的按鈕。 · Open a two-button modal from a title button and request its second action first. Add a pointer-only panel and ensure Tab and semantic activation skip it. Close nested modals and check focus returns to each opener.
- 绕过办法（已移除）：`src/ui.mjs` 自行保存焦點、繪製焦點框、攔截介面 Tab／Enter／Space，並在彈窗開關時恢復焦點；`src/screens.mjs`、`src/round-ui.mjs` 各自指定初始控件。 · The former Demo controller stored focus, drew its own outline, intercepted UI keys and restored the opener. The screen and round modules set initial focus separately.
- 建议：為原生彈窗提供具名初始焦點、公開焦點讀寫，以及只需指標操作的面板選項；原生語意與鍵盤焦點應保持一致。 · Provide a named modal initial focus, public focus access and a pointer-only panel binding so native semantics and keyboard focus agree.
- 状态：引擎 [#488](https://github.com/cnedwin/Egret_rebuild/pull/488) 已於 `5da4489c` 合併，提供 `initialFocus`、`view.focus(name)`、`view.focused` 及面板綁定的 `pointerOnly`。本 Demo 將一般介面焦點交由原生視圖，規則、設定、暫停、吃牌與結算使用 `initialFocus`；保留遊戲特有的方向鍵選牌和叫牌快捷鍵。自訂介面適配只負責角色、名稱與裝飾，純裝飾紙面不綁 `tap`，所以目前無需 `pointerOnly` 攔截。巢狀彈窗、語言切換、兩次 Enter 出牌及語意焦點納入瀏覽器驗收腳本。 · Engine #488 (`5da4489c`) supplies named modal focus, public focus access and pointer-only tap panels. The Demo delegates normal UI focus to native views and uses named initial focus for the rules, settings, pause, chow and settlement. Game-specific arrow and call shortcuts remain. Decorative paper has no tap action, so no production pointer-only interception is needed. Nested modal restoration, language changes, two-press discard and semantic focus are covered in the browser test script.
