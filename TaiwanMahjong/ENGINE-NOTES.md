# 引擎笔记 · Engine notes

當前引擎副本為 `13d70b73`，見 [vendor/SOURCE.md](vendor/SOURCE.md)。第 1 至 6 條保留初版 `b5628eb` 的驗證紀錄，所列幀時間來自無頭 Chromium 153 和 SwiftShader。第 7、8 條記錄原生界面問題及引擎修復後的適配；各輪實測版本與結果見 [QUALITY.md](QUALITY.md)。

The current engine copy is `13d70b73`. Items 1–6 retain findings from `b5628eb`, with frame timings from headless Chromium 153 and SwiftShader. Items 7 and 8 record native UI issues and the migration after the engine fixes. See [QUALITY.md](QUALITY.md) for the tested versions and results.

本輪引擎集成：主幹 `13d70b73904266c11b23de4c09c239240a7162db`（包含 #507–#515），按需采用原生能力；下列原先的版本号保留作为问题发生时的历史。

This integration vendors official main `13d70b73904266c11b23de4c09c239240a7162db` (including #507–#515), adopting native capabilities where equivalent; older revisions below are historical evidence.

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
- 狀態：已在 `95897d7` 解決（引擎 #471）。本輪使用 1280×720 原生設計，移除 0.75 邏輯縮放；由引擎 `planScreen` 取得初始顯示倍率，`play({ pixelRatio })` 選獨立光柵密度，桌面數值上限 1.5（原 0.75×2）。緊湊裝置採較低密度預算，實測見 QUALITY。pixelRatio 建置後仍不能改變，不能為更換密度而重建對局。 · Resolved by #471 (95897d7). This revision removes the 0.75 logical intermediary and uses the native 1280×720 design. Initial density derives from the engine screen plan, with a 1.5 desktop ceiling (former .75×2) and a lower compact budget. See QUALITY for measured timing. The runtime has no density setter; do not rebuild a live hand merely to change it.

### 4. 外层元素旋转时 `play` 直接拒绝启动，哪怕游戏不读指针 · `play` refuses to start under a rotated element, even when the game reads no pointer — 已写入文档 / documented
<!-- engine-note: {"id": "TaiwanMahjong#4", "status": "documented", "topic": "play-rotated-parent", "workaround": ["src/main.mjs", "src/view.mjs"]} -->

- 现象：竖屏时把整张牌桌（含引擎画布）用 CSS 转 90°，`play` 报 `POINTER_INPUT_SURFACE_INVALID: an element around the canvas has a CSS transform that rotates, skews or mirrors it`，游戏起不来。本作的点击全在页面按钮上，用不到引擎的指针输入。 · What happens: turning the whole table, engine canvas included, a quarter with CSS on a tall screen made play fail with `POINTER_INPUT_SURFACE_INVALID`. Every tap here is on a page button; the engine's pointer input is not used.
- 原繞過辦法：初版三層 CSS 旋轉與重建直向引擎。現已移除手寫 fit 及 CSS transform；`play({ fit: 'expand', portrait, arrange })` 保持畫布與全域 UI 不旋轉。窄直手機只轉動牌桌專屬根節點與桌面命中區，平板直放正向，規則／設定等原生版型正向閱讀。頁面 2D canvas 由 game.toStage 與元素矩形投影。 · Former workaround: CSS-turn two page layers and rebuild a tall play. Now expand, portrait and arrange keep the engine and global UI upright. Only board-specific roots and hit regions turn on small portrait phones, tablets remain upright and menus read normally. The page canvas maps through game.toStage and the actual canvas rectangle.
- 建议：让 `play` 可以不建指针输入（例如 `pointer: false`），或者在旋转的外层下把指针坐标换算过去。 · Suggestion: let play leave pointer input out (`pointer: false`, say), or map pointer positions through a rotated parent.
- 状态：已写入文档（引擎 #485，`8637ace`）：引擎把这条写成 guide 卡片 play-turned-table；拒绝启动时的原因现在会说明规则。 · Documented (engine #485, `8637ace`): the engine wrote this up as its play-turned-table guide card; the refusal's cause now names the rule.

### 5. 几百个共用一张图集的静止 Bitmap 也很贵 · A few hundred still Bitmaps sharing one atlas are costly too — 已写入文档 / documented
<!-- engine-note: {"id": "TaiwanMahjong#5", "status": "documented", "topic": "shared-texture-bitmap-cost", "workaround": ["src/felt.mjs"]} -->

- 现象：原型里 1280×720 的 `play` 加 N 个共用一张 1024×1032 图集的 `Bitmap`（各取一块 `sourceRect`，缩放 0.4，静止不动）：0 个 p95 33.4 ms（见第 3 条），25 个 33.4 ms，100 个 p50 33.3 / p95 50.0 ms，250 个 p50 50.0 / p95 66.7 ms；250 个里有 40 个每帧移动也一样。一桌麻将到后半局有两百多张牌在桌上。与 [NezhaSea 的 ENGINE-NOTES 第 3 条](../NezhaSea/ENGINE-NOTES.md)（移动的 Bitmap）是同一类问题，这里静止的也一样贵。 · What happens: in a prototype, N Bitmaps cut from one 1024 × 1032 atlas by sourceRect, scaled 0.4 and still, on a 1280 × 720 play: none 33.4 ms p95 (item 3), 25 the same, 100 at 33.3 ms p50 / 50.0 ms p95, 250 at 50.0 / 66.7 ms; 40 of the 250 moving made no difference. A table late in a hand holds over two hundred tiles. The same kind of cost as NezhaSea's item 3, for still Bitmaps.
- 绕过办法：桌上静止的牌（牌河、副露、别家的手牌、花）画在引擎画布下面的一张页面 2D canvas 上，只在牌局变化时重画（`src/felt.mjs`）；引擎只画玩家的手牌（最多十几张）、飞行中的牌和大字、火花。 · Workaround: tiles at rest are painted on a page 2D canvas under the engine's, again only when the hand changes; the engine draws the player's hand, tiles in flight, and the words and sparks.
- 建议：同 NezhaSea 第 3 条：查贴图路径在软件渲染下的开销；另外可以考虑一个「静态层」——内容不变时只合成一次的容器（类似 `cacheAsBitmap`）。 · Suggestion: as NezhaSea's item 3; and perhaps a still layer — a container drawn once into a texture until its content changes, as `cacheAsBitmap` was.
- 状态：已写入文档（引擎 #485，`8637ace`）：同 NezhaSea 第 3 条，写进 guide 卡片 sprite-swarm。 · Documented (engine #485, `8637ace`): as NezhaSea item 3, in the sprite-swarm guide card.

- 本轮评估 · Integration：#505 提供显式 WebGL2 静态层捕获，但本游戏原本已将静止牌一次画成单层且实机默认可选 WebGPU；不额外读回、上传或强制切换后端。靜態牌桌保留；本輪改用引擎幾何投影，座位資料與提示改成原生節點。 · #505 adds explicit WebGL2 static-layer capture; the felt is already a single raster and the normal device path can be WebGPU, so a second capture/upload or backend change is not equivalent.

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
- 建议：统一在视口本地坐标中判断拖拽阈值、方向和位移。回歸驗證 0°、90°、反向拖动、横向滚动、越界释放。 · Use viewport-local coordinates for slop, direction and movement. Cover unrotated and rotated views, opposite-axis rejection, horizontal panels and release outside the viewport.
- 状态：引擎 [#486](https://github.com/cnedwin/Egret_rebuild/pull/486) 已於 `a52708fb` 合併修復；`playViewScroll` 現在統一使用視口本地座標判斷拖曳方向、閾值及位移。本 Demo 已移除 `scrollRotatedTouch` 與規則／結算兩處擷取邏輯，直接使用 `view.scroll(name)`；本輪選單在小手機仍正向閱讀，Fold7 直向規則實測偏移 0→157.66。更新後的瀏覽器驗收檢查 0°、90°、反向及垂直於捲動軸的拖曳。 · Resolved by engine #486 (`a52708fb`): scrolling uses viewport-local axes for slop, direction and movement. The Demo removes its rotated gesture observers from the rules and settlement and uses native scrolling. The present native screen integration keeps menu variants upright even while the table turns; actual Fold7 portrait rule scrolling moved the offset from 0 to 157.66. The updated browser script checks 0°/90°, reversal and cross-axis rejection.

### 8. 弹窗初始焦点与仅指针面板 · Named modal focus and pointer-only panels — 已在 `5da4489c` 解决 / resolved in `5da4489c`
<!-- engine-note: {"id": "TaiwanMahjong#8", "status": "resolved", "topic": "named-modal-focus", "workaround": ["src/ui.mjs", "src/screens.mjs", "src/round-ui.mjs"]} -->

- 现象：舊版的原生視圖預設選取彈窗中第一個可操作元件，遊戲無法依名稱指定開啟時的焦點，也沒有 `view.focus(name)`／`view.focused` 讓程式明確設定或讀取目前的焦點。如果用面板 `tap` 攔截空白處的指標操作，該面板亦會進入鍵盤焦點順序。 · Previously a modal picked its first actionable part by default, with no named initial choice or view-level focus access. A panel with a tap binding also took part in keyboard navigation.
- 最小复现：從標題的規則按鈕打開一個有兩個按鈕的彈窗，要求第二個按鈕先獲得焦點；再加入僅需要指標操作的面板，確認它不會接受 Tab 或語意啟用。關閉巢狀彈窗後，確認焦點回到開啟它的按鈕。 · Open a two-button modal from a title button and request its second action first. Add a pointer-only panel and ensure Tab and semantic activation skip it. Close nested modals and check focus returns to each opener.
- 绕过办法（已移除）：`src/ui.mjs` 自行保存焦點、繪製焦點框、攔截介面 Tab／Enter／Space，並在彈窗開關時恢復焦點；`src/screens.mjs`、`src/round-ui.mjs` 各自指定初始控件。 · The former Demo controller stored focus, drew its own outline, intercepted UI keys and restored the opener. The screen and round modules set initial focus separately.
- 建议：為原生彈窗提供具名初始焦點、公開焦點讀寫，以及只需指標操作的面板選項；原生語意與鍵盤焦點應保持一致。 · Provide a named modal initial focus, public focus access and a pointer-only panel binding so native semantics and keyboard focus agree.
- 状态：引擎 [#488](https://github.com/cnedwin/Egret_rebuild/pull/488) 已於 `5da4489c` 合併，提供 `initialFocus`、`view.focus(name)`、`view.focused` 及面板綁定的 `pointerOnly`。本 Demo 將一般介面焦點交由原生視圖，規則、設定、暫停、吃牌與結算使用 `initialFocus`；保留遊戲特有的方向鍵選牌和叫牌快捷鍵。自訂介面適配只負責角色、名稱與裝飾，純裝飾紙面不綁 `tap`，所以目前無需 `pointerOnly` 攔截。巢狀彈窗、語言切換、兩次 Enter 出牌及語意焦點納入瀏覽器驗收腳本；本輪 Fold7 真機轉向保留 view7:tile-44 與暫停具名焦點。 · Engine #488 (`5da4489c`) supplies named modal focus, public focus access and pointer-only tap panels. The Demo delegates normal UI focus to native views and uses named initial focus for the rules, settings, pause, chow and settlement. Game-specific arrow and call shortcuts remain. Decorative paper has no tap action, so no production pointer-only interception is needed. Nested modal restoration, language changes, two-press discard and semantic focus are covered in the browser test script. On current native rotation, the semantic id view7:tile-44 and the named pause focus also remain unchanged on physical Fold7.


### 9. uiScale 無法按個別視圖選擇 · uiScale cannot be selected per view — 未解决 / open
<!-- engine-note: {"id": "TaiwanMahjong#9", "status": "open", "topic": "per-view-ui-scale", "workaround": ["src/ui.mjs", "src/round-ui.mjs"]} -->

- 现象：`play({uiScale:{min:0.8}})` 同時放大全部 game.show，包括與牌張對齊的透明命中區。在短螢幕上只放大選單的需求無法表達。`game.onTap` 的節點語意只有名稱及啟用回調，缺少原生 disabled、具名焦點與方向鍵選牌整合，不能直接等價取代。 · Global uiScale enlarges all shown views, including transparent board-hit regions; node onTap lacks the equivalent disabled state and native named keyboard/semantic focus contract.
- 最小復現：在 873×325 的 expand play 中，畫一張已知座標的牌，在同處放 game.show 的透明按鈕，再放一般 modal。打開 uiScale min 後，按鈕與牌的實際界限不同；改用具名 onTap 節點時，原有 Tab／Arrow／Enter 與 disabled 語意不能完整保留。 · Place a tile and a matching transparent view button in an expanded short viewport with a modal; enable the minimum scale and compare hit bounds against the visual. Replacing with named node tap loses the existing focus/disabled behavior.
- 绕过办法：不啟用 uiScale，保留同一原生手牌視圖的具名按鈕及幾何，選單使用原生 phone/tablet variants。 · Leave uiScale off, preserve native named hand hit targets and arrange menus using native variants.
- 建议：提供 per-view scale policy（如 `uiScale: 'game'`），另讓具名 node taps 支援 disabled、焦點與語意啟用。 · Allow an individual view to keep game scale; optionally supply disabled, focus and semantic activation for named nodes.
- 状态：未解决，截至 13d70b73；保留鍵盤、語意與點牌一致性優先。 · Open at 13d70b73; alignment and accessible operation take precedence.

### 10. 瀏覽器語意映射的舞台尺寸固定 · Browser semantic projection has fixed stage dimensions — 未解决 / open
<!-- engine-note: {"id": "TaiwanMahjong#10", "status": "open", "topic": "semantic-screen-resize", "workaround": ["src/main.mjs"]} -->

- 现象：createBrowserSemantics 接收 width/height 固定數值；expand/portrait 變更 stage frame 後僅 sync 仍使用舊尺寸。 · The projection captures width and height once; sync alone keeps the old frame extent after an expanded stage changes orientation or size.
- 最小復現：play 1280×720，portrait 720×1280、expand；建立右下具名按鈕和 browser projection。轉向後比較原生 bounds、實際畫布與投影 DOM 的 CSS 界限。 · Resize an expanded game with a named lower-right button and fixed browser projection; compare native bounds, canvas and projected CSS bounds before and after.
- 绕过办法：frame extent 改變時只重接 browser projection，保留同一 play、UiSemantics 與具名原生焦點。 · Reattach only the browser projection when frame extent changes, retaining the play instance, UiSemantics and named native focus.
- 建议：sync 接收新的 stage extent 或由 adapter 訂閱引擎 screen plan，避免外部重接。 · Accept new stage dimensions in sync, or subscribe to the native screen plan.
- 状态：未解决，13d70b73；轉向測試驗證原生語意 ID 與焦點保持。 · Open at 13d70b73; rotation regression checks identity and focus.

### 11. 暫停時 world 的 expand 偏移未跟隨轉向 · Paused world offset does not follow an expanded screen — 未解决 / open
<!-- engine-note: {"id": "TaiwanMahjong#11", "status": "open", "topic": "paused-world-screen-offset", "workaround": ["src/view.mjs"]} -->

- 现象：Fold7 外螢幕在開局語音／發牌期間暫停，直向 411×813 轉為橫向 873×325，安全區座位牌及暫停視圖已正確定位，但 world 內的手牌沿舊設計偏移被裁到牌底；恢復後回到正確位置。 · On the physical Fold7, pause during the opening on a 411×813 portrait viewport, then rotate to 873×325. Safe HUD and pause UI relocate, whereas the world layer retains the old design offset and clips the hand; resuming restores it.
- 最小復現：用 `play({width:1280,height:720,fit:'expand',portrait:{width:720,height:1280}})`，在 `game.world` 及 `game.ui` 各加一個同原點標記。`game.pause()` 後改變視口方向，在 `arrange` 觀察兩層 `localToGlobal(0,0)` 和 `game.toStage(0,0)`。`BrowserPlay.ts` 的 `placeLayers()` 只更新 ui/glass，world/effects 的設計矩形偏移在更新步內寫入。 · Add equal-origin marks to world and ui, pause and change orientation; compare their global origins with `toStage(0,0)` in arrange. Screen change's placeLayers updates ui/glass only; the world/effects offsets are written during the update step.
- 實測幾何：無頭 Chromium / SwiftShader 同一路線 411×813→873×325，frame 1934×720，designRect `(327,0,1280,720)`，ui 原點 `(327,0)`，暫停中的 world 原點卻是 `(0,72)`。固定舞台層手牌界限為 `(6.91,592.16)–(1568.72,716)`，若在舊 world 偏移下則為 `(−320.09,664.16)–(1241.72,788)`，超出左、下緣。 · Measured on the same SwiftShader route: frame 1934×720, designRect (327,0,1280,720), ui origin (327,0), paused world origin (0,72). Fixed-stage hand bounds stay inside the frame; subtracting 327 from x and adding 72 to y predicts the observed left/bottom clipping.
- 绕过办法：本遊戲牌桌是固定於舞台的 2D 節點，並不使用相機；把牌桌專屬根放在原生 `game.ui` 層之下（在 HUD、選單之前建立），不用手寫 world 偏移或重建 play。動畫仍由原引擎時鐘執行。 · The table has no camera and is stage-fixed: place its visual root under native ui, before HUD and views. Keep the original animation clock, no world-offset patch and no game reconstruction.
- 建议：screen change 時同時更新 world/effects 的設計矩形偏移，保留 camera / shake 狀態；覆蓋 paused + expand + portrait 的座標一致性測試。 · Update world/effects with the new design rectangle on screen change while preserving camera and shake; test paused expand/portrait geometry.
- 状态：未解决，13d70b73；本 Demo 選用原生固定舞台節點。 · Open at 13d70b73; the game uses the native fixed-stage layer.

### 12. 多螢幕 CLI 只能檢查啟動狀態 · Multi-screen CLI is limited to the launch state — 未解决 / open
<!-- engine-note: {"id": "TaiwanMahjong#12", "status": "open", "topic": "screen-verifier-state-coverage", "workaround": ["test/screens.mjs"]} -->

- 现象：`verify --screens` 能掃描八種視口，但不能配合 `--play` 操作腳本，故不能直接覆蓋叫牌、結算或開啟規則的狀態。 · The eight-screen command cannot combine with a play script, so a single invocation cannot drive call, settlement or rules states.
- 最小復現：在遊戲根目錄執行 `node vendor/egret.mjs verify --screens --play <script>`，CLI 回覆 `--play plays in one window; --screens takes no script`。舊版 94bd70fb 尚無可用的多螢幕輸出。 · Combine the multi-screen flag with a play script; the CLI rejects the combination.
- 绕过办法：原生 CLI 檢查標題；額外瀏覽器測試以實際按鍵／觸控進入各狀態，匯入原生 SCREENS 和 controlFindings、讀取 native agent 控件資料。 · Use the CLI for the initial screen and the same native profiles/checker and controls for browser-driven state tests.
- 建议：提供可重播、以具名語意控件操作的狀態腳本，在每個 screen profile 執行至檢查點，再輸出畫面和錯誤統計。 · Support named-control replay/checkpoints across each screen profile, with screenshots and findings for each checkpoint.
- 状态：未解决，截至 13d70b73；本 Demo 以額外自動驗收補足，不改 CLI 或引擎。 · Open at 13d70b73; supplemented by test automation without modifying the engine.
