# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（最初为提交 `2fb4646`，2026-11-21 升级到 `b5628eb`，2026-11-26 升级到 `8e70dcb3`，现为 `f0dfde36`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (first `2fb4646`, `b5628eb` since 2026-11-21, `8e70dcb3` since 2026-11-26, now `f0dfde36`) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. iPhone 上引擎的 PNG 读取拒绝画布，游戏停在加载 · On iPhone the engine's PNG reader refused the canvas and the game never left loading — 已在 `1878ad0` 解决 / resolved in `1878ad0`
<!-- engine-note: {"id": "LanternShadows#1", "status": "resolved", "topic": "ios-png-reader", "workaround": ["src/pictures.mjs"]} -->

- 现象 · What happens：引擎的浏览器贴图读取要求 2D 画布的 `getContextAttributes()` 报告 `colorSpace: 'srgb'`；iPhone 上的浏览器（WebKit）不报告这一项，读取以 `SURFACE_INVALID`（"Canvas backing must support sRGB with alpha"）失败，开锣键一直没有反应。 · The engine's texture reader asked the 2D context to report `colorSpace: 'srgb'`; WebKit on iPhone does not, so reading failed with `SURFACE_INVALID` and the game never started.
- 游戏里 · In the game：`src/pictures.mjs` 自己取字节、按清单的 SHA-256 核对，用浏览器的图片元素解码，再从画布读回像素交给引擎做贴图；Spine 加载器用这些作为提供者（`e6dd7ac`）。 · The game fetches the bytes, checks them against the manifest, decodes them with the browser's image element and gives the pixels to the engine.
- 建议 · Suggestion：引擎已在 `1878ad0` 对原生画布接受缺省的 `colorSpace`；以后可以换回引擎的读取，删掉自己的解码。 · The engine now accepts the missing attribute on a native canvas; the game could return to the engine's reader.
- 状态 · Status：引擎已解决，本作副本（`2fb4646` 起，现为 `f0dfde36`）包含该修复。2026-11-21 升级引擎时仍保留游戏自己的解码：换回引擎的读取要在 iPhone 上复测，这里没有真机 · resolved, and the copy has the fix; the game keeps its own decoder, since going back to the engine's reader needs an iPhone to test on.

### 2. 引擎副本是几百个小模块，逐个请求拖慢首屏 · The engine copy is hundreds of small modules, each a request — 已写入文档 / documented
<!-- engine-note: {"id": "LanternShadows#2", "status": "documented", "topic": "engine-copy-requests", "workaround": ["tools/bundle.mjs"]} -->

- 现象 · What happens：`vendor/` 加上游戏自己的模块，页面在开始前要发出约 260 个请求，手机网络下首屏很慢。 · With the engine copy and the game's own modules, the page made about 260 requests before anything could start.
- 绕过办法 · Workaround：`tools/bundle.mjs` 用 esbuild 把它们打成一个压缩的 `build/lantern.js`，`?dev` 仍按源码逐个加载；测试检查打包文件不比源码旧（`7647b50`）。 · The modules are packed with esbuild into one file; `?dev` still loads them one by one, and a test checks the pack is current.
- 建议 · Suggestion：引擎仓库的 `tools/vendor-game.mjs` 可以提供 `--bundle`，直接给游戏一个按入口打好的单文件。 · `tools/vendor-game.mjs` could offer `--bundle` and give a game one file per entry.
- 状态 · Status：引擎 guide 卡片 `fast-startup` 已写明这种做法；引擎还没有打包选项 · the fast-startup card describes it; the engine has no bundling option yet.

- 2026-11-26 原生 UI 启动策略：打包仍为单文件，但不再把 66 个资产与模块入口同时预取；限速冷启动单次实测首次原生绘制 3.55→1.73 s、真正可开锣 5.57→5.11 s，未把加载移至开锣后。 · Native title now prioritizes the bundle rather than 66 eager asset requests; actual readiness remains gated by full asset loading. See QUALITY.md.

### 3. 同一份骨骼数据最多 128 个 Spine 实例 · At most 128 Spine instances of one skeleton — 未解决 / open
<!-- engine-note: {"id": "LanternShadows#3", "status": "open", "topic": "spine-instance-limit"} -->

- 现象 · What happens：`?act=3&clones=200` 时，分身连同台上的悟空超过 128 个，`@egret/spine` 的加载器在建第 129 个实例时抛 `SPINE_INSTANCE_LIMIT_FAILED`（原因 `INSTANCE_LIMIT`），多出的分身建不出来。升级前后的副本（`2fb4646` 与 `b5628eb`）都是这样；默认的一百个分身不会碰到。 · With `?clones=200` the clones and the Monkey King pass 128 instances and the 129th fails with `SPINE_INSTANCE_LIMIT_FAILED`; both engine copies behave so, and the default hundred stays under it.
- 游戏里 · In the game：默认一把毫毛变一百个分身；画面太慢时还会收回一部分。`?clones` 允许到 400，超过上限的部分建不出来。 · A hundred clones by default, fewer when the stage is slow; `?clones` allows up to 400, and those past the limit are not made.
- 建议 · Suggestion：在文档里写明这个上限并允许设置；或者给出上限常量，让游戏据此限制分身数。 · Document the limit and let it be set, or export it so a game can cap its crowd.
- 状态 · Status：8e70dcb3 的 Spine 加载器仍有 128 个活跃实例限制（vendor/spine/dist/loader.js），默认一百个分身在真实 PC 三幕正常运行；未重新运行 200 分身的越界复现。游戏没有改 `?clones` 的范围 · open: the 8e70dcb3 loader still limits live instances to 128; the default hundred clones ran in the three-act desktop test. The 200-clone failure was not re-run. The game's `?clones` range is unchanged.

### 4. 原生触屏控件的横向模拟摇杆 · Horizontal analog touch control — 已在游戏内绕过 / worked around
<!-- engine-note: {"id":"LanternShadows#4","status":"worked-around","topic":"horizontal-touch-stick","workaround":["src/joystick.mjs","src/input.mjs","src/native-ui.mjs"]} -->

- 现象 · What happens：本作的原版摇杆只控制横向速度，按固定轨道中心计算模拟量，死区为 16%，同时另一指可以长按跳跃。Play 的 `touchStick` 是径向控件，直接替换会改变原来的响应和造型。 · The original track computes horizontal analog speed around a fixed centre with a 16% dead zone; a second contact may hold Jump. The radial Play touch stick is not a drop-in replacement for this design.
- 绕过办法 · Workaround：原生视图绘制轨道和按钮，使用 `browser.pointer.observe` 的真实 contact session 绑定起手、移动、结束和取消；仿真层仍读取同一模拟量与长按状态，不使用 HTML 按钮。 · Native views draw the controls and raw engine pointer sessions route held actions and the original horizontal response without HTML controls.
- 建议 · Suggestion：可为原生触屏控件增加单轴模拟轨道、可配置死区、视觉偏移和触点取消的状态绑定。 · Consider an optional one-axis analog track with configurable dead zone, visual offset and cancellation bindings.
- 状态 · Status：2026-11-26，`f0dfde36`，原生指针会话可实现此需求；不是指针输入缺陷。 · Native pointer sessions support this behaviour; this is an optional higher-level widget enhancement, not a pointer defect.

### 5. 原生按钮的造型与焦点轮廓 · Native button styling and focus outline — 已记录 / documented
<!-- engine-note: {"id":"LanternShadows#5","status":"documented","topic":"native-ui-shaped-controls","workaround":["src/native-ui.mjs"]} -->

- 现象 · What happens：同一 Play 视图中的金锣、桃子及皮影操作键需要圆形、金属渐变与自定轮廓；初迁移的普通面板和按钮看起来是方块。自定绘制可恢复圆形美术，但键盘焦点仍以矩形描边显示。 · Plain Play panels/buttons produced square controls for the gong, peaches and action buttons. Native custom decoration restores the art, while the keyboard focus outline remains rectangular.
- 绕过办法 · Workaround：`src/native-ui.mjs` 使用原生 Sprite/Graphics 装饰既有 `game.show` 节点，保留引擎的语义、布局、命中区域和激活逻辑。 · Native graphics decorate Play nodes while leaving layout, semantics, hit targets and activation to the engine.
- 建议 · Suggestion：支持单部件圆形/胶囊造型、焦点轮廓路径以及渐变填充，可降低定制游戏界面的重复绘制工作。 · Per-part circle/pill shapes, matching focus outlines and gradient fills would reduce game-specific styling code.
- 状态 · Status：原生绘制与键盘焦点功能均可用；造型匹配作为 UI 扩展建议。 · Native graphics and keyboard focus work; shape matching is a UI enhancement suggestion.

### 6. 扩展画布的语义投影尺寸 · Semantic projection on an expanding canvas — 已在游戏内绕过 / worked around
<!-- engine-note: {"id":"LanternShadows#6","status":"worked-around","topic":"semantic-projection-resize","workaround":["src/main.mjs"]} -->

- 现象 · What happens：`fit:'expand'` 在横竖屏切换时改变逻辑画布尺寸；`createBrowserSemantics` 的 width/height 是创建时传入的定值。 · Expanded-stage orientation changes the logical canvas extent; the browser semantic adapter takes fixed width and height at creation.
- 绕过办法 · Workaround：在 Play arrange 时如果逻辑尺寸变化，就重新建立语义投影（复用同一语义树）；其它布局变化只同步位置。 · Arrange re-creates the projection on logical extent changes, reuses the semantic tree and otherwise syncs geometry.
- 建议 · Suggestion：语义投影可以接受尺寸回调或在 sync 时更新逻辑尺寸，减少游戏侧重建。 · Accept a logical-size callback or an explicit resize in sync, reducing game-side adapter recreation.
- 状态 · Status：浏览器英文横转竖与按键输入回归已通过；此为便利性建议，非已复现的引擎故障。 · Browser rotation and keyboard input checks passed; a convenience suggestion, not a reproduced engine failure.

### 7. 可见按钮文字与语义名称的分别配置 · Separate visible button text and semantic name — 已记录 / documented
<!-- engine-note: {"id":"LanternShadows#7","status":"documented","topic":"native-ui-accessible-button-name","workaround":["src/native-ui.mjs"]} -->

- 现象 · What happens：短横屏工具栏若把 Effects 缩成 FX，原生按钮的语义名称也变成 FX。当前原生视图的按钮名称直接来自文字绑定；部件 label 不能作为独立按钮名称。 · Abbreviating Effects to FX also changes the semantic name, because a native button's name follows its text binding rather than an independent part label.
- 绕过办法 · Workaround：恢复完整的 Effects、Music、On-screen 和中文名称，用开关状态后缀及自适应字号保持含义明确。 · Restore full localized labels and state suffixes, using adaptive text size.
- 建议 · Suggestion：为按钮增加独立的无障碍名称（或明确现有 label 的优先级），使短文字、图标与更完整的语音描述可以共存。 · Offer an independent accessible button name, or clarify label precedence, so short text/icons and full spoken names can coexist.
- 状态 · Status：已通过实际语义树复现；本作使用完整可见名称绕过，不需要修改引擎。 · Reproduced in the semantic tree; full visible names are the game-side workaround.

### 8. 扩展舞台的画布像素密度 · Backing density on an expanded stage — 已在游戏内绕过 / worked around
<!-- engine-note: {"id":"LanternShadows#8","status":"worked-around","topic":"expanded-stage-pixel-ratio","workaround":["src/main.mjs"]} -->

- 现象 · What happens：PC 真机 1440×900 CSS px 下，沿用旧固定比例会生成 960×600 的画布，原生 UI 文字被放大而发虚。Fold7 横屏 873×325、DPR 2.625 时，原比例生成 2855×1064 的画布，高于约 2292×853 的设备像素。 · Keeping the old fixed ratio yielded a 960×600 backing at 1440×900 desktop CSS pixels, softening native UI text; on Fold7 it yielded 2855×1064 at a physical viewport of about 2292×853 pixels.
- 绕过办法 · Workaround：按初始 CSS 视口与设备像素比计算 `Play` 的 pixelRatio，并为竖屏首次载入保留有限的旋转余量；所有控件仍按逻辑尺寸布局。 · Calculate the initial Play pixel ratio from the CSS extent and DPR, with a bounded portrait rotation reserve; retain logical UI layout.
- 建议 · Suggestion：提供按实际物理视口自动调整的 backing-density 策略或可运行时调整的 pixelRatio，让扩展屏幕与原生文字在旋转/窗口变化时同时兼顾清晰度和渲染预算。 · Offer a viewport-aware backing-density policy or runtime pixelRatio adjustment for crisp native text and bounded rendering cost across rotations and window changes.
- 状态 · Status：在实际设备确认了原候选的分辨率差异；最终配置的性能与画面验收见 QUALITY.md。 · The mismatch was observed on hardware; see QUALITY.md for the final configuration's validation.

### 9. 百个 Spine 角色与原生 HUD 的手机密集帧 · Dense mobile frames with 100 Spine puppets and native HUD — 部分解决 / partly
<!-- engine-note: {"id":"LanternShadows#9","status":"partly","topic":"native-ui-dense-spine-frame-time","workaround":["src/main.mjs","src/native-ui.mjs"]} -->

- 现象 · What happens：同一 Fold7（SM-F966U1 / Android 17 / Chrome 157 / Adreno 830），旧页面 UI（引擎 `8e70dcb3`）三幕的自然百身术 rAF p95 约 33.2–33.3 ms，普通战斗 16.7 ms。原生 UI 候选（`f0dfde36`，100 个实际画出的分身）三幕密集 p95 49.7–49.8 ms，普通仍 16.7 ms。独立 PC 最终密集短测 p95 16.8 ms，接近旧版 16.7 ms。 · On the same physical Fold7, the prior page UI yielded about 33.2–33.3 ms dense rAF p95; native UI yields about 49.7–49.8 ms with 100 drawn clones. Ordinary combat remains 16.7 ms. An isolated PC short run is near the previous dense result (16.8 vs 16.7 ms).
- 绕过办法与实测 · Workaround and measurements：按实际像素密度把 Fold7 横屏 backing 从 2855×1064 调整为 2291×854；用同一自然走位输入路线复跑，密集 p95 49.7 ms（227 帧，最大 67.8，4 帧 >50；姿势计算 p95 12.3 ms）。另一个只把幕布 clipRect 换成原生遮板的候选在相同 backing 下仍为 49.7 ms（251 帧，最大 67.8，2 帧 >50；姿势 p95 11.85 ms）；因收益不充分已回退遮板。保留真实显示像素密度、原判定和百身。 · Matching the display density and then removing the inherited cloth clip did not materially improve dense p95. The matte experiment was reverted. The density fix, all 100 clones and the game rules are retained.
- 建议 · Suggestion：使用本作同一横向幕布、100 个 Spine 角色、新旧 HUD 和相同 viewport/backing 的最小测试，分开测骨骼姿势计算、SharedDraws/裁剪、Play 绑定和语义树同步、WebGL2 提交与 GPU 执行。 · Profile an equivalent cloth with 100 Spine puppets and comparable HUD/backing, separating pose evaluation, shared draw preparation/clipping, Play bindings and semantics, WebGL2 submission and GPU execution.
- 状态 · Status：自然路线非逐帧固定种子，旧/new 输入测试节奏存在差异；以上为真机 rAF 和游戏姿势耗时，不是 GPU 或引擎子系统独立计时，不能据此归因。最慢 LoAF 短测 71.2 ms（压缩 bundle 的脚本约 69.5 ms，函数级未分解）。 · The natural routes are not identical deterministic traces and input cadences differed. These are rAF and measured pose durations, not subsystem/GPU timings; causality is not established. The slowest mobile short-test LoAF was 71.2 ms, with about 69.5 ms attributed to the packed script but no function-level split.

#### 2026-11-26 受控实机复查 · Controlled physical-device follow-up

- 实机条件 · Setup：Fold7 / Android 17 / Chrome 157 / Adreno 830 / WebGL2，USB 供电，电池温度传感器约 29.9–30.9°C、thermal status 0；固定虚拟步长 1/60、相同初始场景和随机种子、分身年龄 1–6.5 s，每块 330 帧，9 块 2,970 帧均验证 100 个逻辑/已出现/显示/参与姿势更新的分身。诊断仅授予一次百身术所需毫毛和临时保护，照常执行分身规则，未写成绩。实际 rAF 及 CPU 耗时是墙钟时间。 · Fixed-step diagnostic, matched scene and seed, all 100 shown and posed clones, 330 samples per block. The test fixture grants the cast and protects the hero; it is not natural play.
- 数据 · Data：新增 [可复现脚本](test/perf/README.md)、[汇总](test/perf/reference-fold7.json) 和 [逐帧数据](test/perf/reference-fold7.csv)。Expanded 2291×854 中，原生 UI 正常/冻结绑定与语义/linear 混色/正常复跑，实际提交间隔 p50 均 33.1 ms、p95 均 49.8 ms；隐藏 UI 仅作诊断，draw calls p50 43→11、提交间隔 p50 16.7 ms，p95 49.7 ms。Compact 匹配 1517×854、旧版 DOM/新原生 linear 对照：实际提交 p50 16.6→33.1 ms，p95 49.7→49.8；draw calls p50 11→43，场景采集 p50 2.2→2.8 ms。旧 41/330、新 35/330 个逻辑更新帧由直接 hook 证实 `pendingFrames=2` 达到 limit，未实际提交绘制。 · Static bindings and linear blending had no reproducible gain. Hiding UI reduced median draws and cadence but not tail. Matched compact old/new both had roughly 50 ms submission p95; explicit pending-limit checks account for skipped renders.
- Demo 修复 · Game-side fix：保留所有原生控件/语义，将桃子、摇杆、动作键静态矢量装饰合并为共享 848×424 PNG 原生 Bitmap 图集（56,352 B），按状态切换裁切，贴图失败仍走原矢量绘制。最终同背板 A→Atlas 实测绘制调用中位 43→33、实际提交的整帧 CPU p50 24.9→22.0 ms，提交间隔 p50 33.1→17.8 ms、p95 49.8→49.7 ms；提交行 287→293/330。最终无插桩正式包 Fold7 实际触控开局、越界、释放和暂停恢复通过。 · Native shared atlas with vector fallback reduces 10 draw calls and median frame cost, not tail latency; final packed touch regression passed.
- 最终分阶段 · Final phase times：实际提交的 293 帧，CPU inclusive p50/p95：Spine advance（包含同步姿势/网格发布）7.0/16.7 ms，Demo UI refresh 0.0/0.1、engine views 0.0/0.1、semantics publish 0.4/1.0、capture 2.2/5.0、WebGL2 prepare 6.3/13.1（其中 geometry 4.9/11.3）、submit 3.4/13.6（其中 draw 2.2/10.9，upload 0.1/0.2）。这些为嵌套 CPU 区间，不能加总各 p95；未测 GPU execution 或屏幕呈现。 · Per-phase CPU inclusive timing, host-submitted rows only; nested quantiles do not add, not GPU execution/presentation.
- 引擎优先项 · Engine priorities：① Spine 100 实例的 pose evaluation、同步 display mesh publication 与共享/保留几何路径分解；② WebGL2 capture、prepare/geometry、submit/draw 的热路径与批处理；③ 浏览器帧预算已满时，当前 `BrowserFrameLoop` 在昂贵的 `update`（含 Spine mesh）之后才判定 pending 上限，建议提供分离逻辑/渲染准备的调度钩子，在不损失动画时间的前提下避免未提交帧的重复渲染准备；④ 原生 UI 的静态图形缓存/批处理能力。UI 绑定或色彩空间并非本次最慢帧的主要原因；旧/新核心 Spine/WebGL2 文件相同，并未证明某个引擎提交回归。 · Focus on Spine pose/display, capture/shared draw preparation, GL submission and CPU work done despite host backpressure, plus cached native UI decoration. The specific engine root cause remains open.
