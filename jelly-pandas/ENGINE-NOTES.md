# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（最初为提交 `db9772e`，2026-11-21 升级到 `b5628eb`，2026-11-27 更新为 `2fbe5563`，2026-11-28 更新为 `8424ff2a`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (first `db9772e`, `b5628eb` since 2026-11-21, `2fbe5563` from 2026-11-27, `8424ff2a` from 2026-11-28) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. 顶点布局不同就要另编一条管线 · A different vertex layout needs a pipeline of its own — 未解决 / open
<!-- engine-note: {"id": "jelly-pandas#1", "status": "open", "topic": "vertex-layout-program", "workaround": ["src/view.mjs"]} -->

- 现象 · What happens：第一发圆弹和第一颗宝石出现时画面停顿。它们和敌群用的是同类实例化材质，但网格的顶点布局不同（弹丸没有顶点色），每种都在第一次绘制时编译自己的颜色和深度管线。 · The first round shot and the first gem stalled the picture: same kind of instanced material as the horde, but a different vertex layout, so each compiled its own colour and depth pipelines on first draw.
- 游戏里 · In the game：`src/view.mjs` 把弹丸和宝石改用敌群的顶点布局（加上白色顶点色）和同一种材质，复用已经编译好的管线（`e5ca02e`、`13783f8`）。 · Shots and gems are built with the horde's vertex layout and material, so they reuse its pipelines.
- 建议 · Suggestion：在开发模式下报告第一次编译的管线是因为哪个属性不同；或者对缺少的属性用默认值，减少变体。 · Report in development which attribute made a new pipeline, or fill a missing attribute with a default to cut variants.
- 状态 · Status：游戏里已绕过 · worked around here.

### 2. 倒影通道和第一次出现的特效在第一次绘制时编译 · The mirror pass and first-use effects compile on first draw — 部分解决 / partly resolved
<!-- engine-note: {"id": "jelly-pandas#2", "status": "partly", "topic": "first-draw-program-link", "workaround": ["src/view.mjs"]} -->

- 现象 · What happens：标题画面的海面倒影会剔掉熊猫的脸，倒影里第一次画到这些着色器变体时卡顿；冲击环、拖尾等特效第一次出现时也会卡顿。 · The title's sea mirror culls the panda's face, so those variants first compiled during play; the ring, trail and other effects stalled on first appearance.
- 游戏里 · In the game：`src/view.mjs` 在标题画面的倒影通道里用零面积三角形把这些变体画一遍，第一帧再画一份透明的特效样本（`f3cbec0`、`d016836`）。 · Those variants are drawn with zero-area triangles inside the title's mirror pass, and a transparent sample of each effect is drawn on the first title frame.
- 建议 · Suggestion：WebGL2 已有 `renderer.preparePrograms`（含倒影通道的描述）；WebGPU 也需要同样的预编译接口，而不是靠画一帧。 · WebGL2 has `renderer.preparePrograms`, mirror pass included; WebGPU needs the same rather than a drawn frame.
- 状态 · Status：WebGL2 一侧引擎已提供接口（`ee94fa5`）；WebGPU 一侧游戏仍靠预画 · the engine offers it for WebGL2; on WebGPU the game still draws a warm-up.

### 3. World3D 屏幕标记只能跟随页面元素 · World3D screen markers only place page elements — 已解决 / resolved
<!-- engine-note: {"id":"jelly-pandas#3","status":"resolved","topic":"world3d-screen-marker-native-display"} -->

- **现象 · What happens**：`createScreenMarkers3D` 接收 HTMLElement，在全画布 CSS 坐标中投影；没有把原生 DisplayObject 放到 World3D 叠加层的接口，边距也是单一数值。 · The marker helper positions HTML elements across the canvas; there is no overlay-display-object marker or per-edge margin.
- **游戏里 · In the game**：使用 `createOverlayScreenMarkers3D` 放置原生显示对象；共享固定字形图页的 40 个伤害数字和 4 个救援标记由引擎投影、避让安全区，游戏仅保留 HUD 遮挡和浮字动画策略。 · Native pooled displays use the overlay marker API and a shared glyph page. The game retains only its HUD-occlusion and floating-animation policy.
- **建议 · Suggestion**：让屏幕标记支持叠加层原生显示对象、分边安全区与标记尺寸。 · Support overlay display objects and per-edge safe margins that account for the marker's extent.
- **状态 · Status**：引擎 PR [#545](https://github.com/cnedwin/Egret_rebuild/pull/545) 提供正式能力，游戏改用原生 API。 · Resolved in engine PR #545; the game uses the native API.

### 4. World3DOverlay 未转发悬停输入选项 · World3DOverlay does not forward the hover option — 已解决 / resolved
<!-- engine-note: {"id":"jelly-pandas#4","status":"resolved","topic":"world3d-overlay-hover-input"} -->

- **现象 · What happens**：在 `2fbe5563`，`createWorld3DOverlay` 创建的 BrowserGame 默认没有 `game.hover`，不能直接建立菜单的 `createHoverControl`。 · Overlay-created BrowserGame has no hover input by default; its option surface does not forward BrowserGame's hover flag.
- **游戏里 · In the game**：直接启用 `createWorld3DOverlay({hover:true})`，使用 `game.hover`；删除额外的浏览器悬停适配器。 · The overlay enables native hover directly; the separate browser hover adapter is removed.
- **建议 · Suggestion**：将 BrowserGame 的 hover 选项暴露给 World3DOverlay，并随转屏自动同步。 · Forward the hover option and maintain it across screen changes.
- **状态 · Status**：引擎 PR [#545](https://github.com/cnedwin/Egret_rebuild/pull/545) 提供正式能力，游戏改用原生 API。 · Resolved in engine PR #545; the game uses the native API.

### 5. 摇杆固定中心及暂停点击语义 · Fixed-centre stick and tap-only pause semantics — 已解决 / resolved
<!-- engine-note: {"id":"jelly-pandas#5","status":"resolved","topic":"touch-movement-origin-and-tap-policy"} -->

- **现象 · What happens**：原生 `createMovementControl` 以触点起点为相对原点；固定中心摇杆从圆边起手应立即有幅度。动作控件以捕获触点的完成为激活依据，旧玩法的 Pause 还需要松手在目标内且严格限制拖移。 · The native movement control uses its touch-down origin, whereas this game's fixed stick must respond to an off-centre down. Pause also needs release-inside with a bounded tap excursion.
- **游戏里 · In the game**：使用原生 fixed-centre 几何配置及 `setGeometry`，不再计算相对位移；Pause 使用 `activation:tap`，将原有 12 CSS px 容差换算到舞台坐标，尺寸变化只重新建立该动作控件。保留游戏的蓄力取消逻辑。 · Native fixed-centre geometry and tap activation replace manual direction and excursion tracking; the authored 12 CSS px tolerance and cancel-charge policy are retained.
- **建议 · Suggestion**：增加固定中心模式、可配置点击超出/移动容差。 · Add a fixed-centre movement mode and explicit tap qualification options.
- **状态 · Status**：引擎 PR [#545](https://github.com/cnedwin/Egret_rebuild/pull/545) 提供正式能力，游戏改用原生 API。 · Resolved in engine PR #545; the game uses the native API.

### 6. 叠加层透传指针丢失相对位移 · Overlay passthrough omits relative pointer motion — 已解决 / resolved
<!-- engine-note: {"id":"jelly-pandas#6","status":"resolved","topic":"world3d-overlay-pointer-relative-motion"} -->

- **现象 · What happens**：`overlay3D` 的透传 PointerEvent 会复制坐标与按钮，但没有 `movementX/Y`。如果桌面尚未拿到指针锁定而以按键拖动转视角，新原生叠加层的转发事件没有原始相对位移。 · The copied pointer event carries its position/buttons but omits relative movement; fallback mouse drag before locking loses its deltas.
- **游戏里 · In the game**：未锁定拖动和锁定转向均直接使用引擎传递的 `movementX/Y`，删除连续 client 坐标补偿，保留游戏的输入和暂停清理。 · Both unlocked drag and locked look use the engine movement deltas; the client-coordinate compensation is removed.
- **建议 · Suggestion**：透传 PointerEvent 时保留标准 movementX/Y 字段，并覆盖未锁定拖动与锁定后按键的测试。 · Copy the relative motion fields and test both unlocked dragging and locked input.
- **状态 · Status**：引擎 PR [#545](https://github.com/cnedwin/Egret_rebuild/pull/545) 提供正式能力，游戏改用原生 API。 · Resolved in engine PR #545; the game uses the native API.

### 7. BrowserGame 标签的换行与字体族 · BrowserGame label wrapping and font-family choice — 已解决 / resolved
<!-- engine-note: {"id":"jelly-pandas#7","status":"resolved","topic":"browser-game-label-layout"} -->

- **现象 · What happens**：`createAtlasLabel` 是单行标签；现有 CanvasTextRasterProvider 按单个字体名称加引号，传入整个 CSS 多字体族列表会被当作一个名称。 · Atlas labels are single-line; the rasterizer quotes its family as one name, so a CSS comma-separated stack does not select its intended family.
- **游戏里 · In the game**：菜单正文由 `createParagraphLabel` 实际度量、换行和候选字体处理；单行标题保留图集文字，计数和浮字使用 `createGlyphFont` 的固定字形页，不再自行绘制字体图页。 · Native paragraphs replace estimated wrapping and fallback-family shims; titles keep single-line labels and counters/markers borrow engine-built glyph fonts.
- **建议 · Suggestion**：支持标签的限宽换行、字体候选名单，以及可测量的固定字形集。 · Offer measured line wrapping, font candidates and a reusable glyph path for labels.
- **状态 · Status**：引擎 PR [#545](https://github.com/cnedwin/Egret_rebuild/pull/545) 提供正式能力，游戏改用原生 API。 · Resolved in engine PR #545; the game uses the native API.

### 8. 软件渲染下 3D 与原生叠加层的帧尾延迟 · Frame-tail latency with the native 3D overlay under software rendering — 部分解决 / partly resolved
<!-- engine-note: {"id":"jelly-pandas#8","status":"partly","topic":"world3d-overlay-frame-tail","workaround":["src/main.mjs","src/ui/play-hud.mjs"]} -->

- **现象 · What happens**：同一设备、同为 844×390、ratio=1、中档、种子 7，规则推进到 285 秒（80 个敌人、18 级、1701 击杀、120 生命）。旧 DOM 与只升级引擎的 p95 分别为 181.8、191.2 ms；原生叠加层两轮 p95 为 519.7、511.5 ms。在 60 帧中原生 2D 的纹理上传/分配调用均为 0；规则、视图的 CPU p95 仍约 1 ms，绘制 API 调用的 CPU 时间也未解释长帧。静止标题的 30 个 3D 帧没有 2D GL 调用。 · Under identical SwiftShader conditions and a seeded rule-step fixture at 285 s, legacy and engine-only p95 were 181.8 and 191.2 ms; native overlay repeats were 519.7 and 511.5 ms. Zero 2D texture uploads/allocations in each warmed 60-frame sample. Rules/view CPU p95 stayed around 1 ms; measured GL API call CPU did not explain the tail. Static title retained its 2D frame across 30 world frames.
- **最小复跑 · Reproduce**：同机软件 Chromium，运行 `node test/performance.mjs`，对照第一个提交的 DOM 版本与本版、第二轮用 `JELLY_PERF_DETAIL=1`，参见 [QUALITY.md](QUALITY.md)。不修改规则或生命值。 · Run the same measured route with the engine-only commit and this revision; repeat with detailed API timing. The simulation advances using its existing rules, not patched HP or elapsed time.
- **游戏里 · In the game**：保留 `renderMode: 'on-demand'`、共享数字字形、按变化更新与复用对象，不降低视觉质量或规则频率来隐藏长帧。 · On-demand rendering, retained objects and shared numeric glyphs; no gameplay or visual quality reduction to hide the tail.
- **建议 · Suggestion**：为 World3DOverlay 暴露 2D/3D 宿主提交、等待/背压和合成阶段的分别计时，检查两个 WebGL2 上下文组合时的长尾。有真实 GPU 的设备需要复测。 · Expose separate host-submit, wait/backpressure and composition timings for World3DOverlay and investigate two-context scheduling. Repeat on real GPU hardware.
- **状态 · Status**：#545 提供分层 CPU/RAF 与 WebGL2 Host 时序，但软件环境长尾尚未解决；未将浏览器合成或 GPU 执行时间视为已查明。 · #545 exposes CPU/RAF and WebGL2 Host timing. The software tail remains open; these observations do not identify compositor presentation or actual GPU execution.
- **硬件对照 · Hardware cross-check**：同一 844×390 高负载场景，RTX 5090 Laptop/D3D11、Chrome 157 每组 120 帧：旧版 4.5、仅升级引擎 4.7、原生 UI 6.0 ms p95，中档原生最大 14.9 ms。软件长尾在这一硬件样本中未复现；仍建议隔离软件/宿主/合成路径。 · The same fixture on RTX 5090 Laptop/D3D11, 120 frames per run, gives 4.5/4.7/6.0 ms p95; the medium-native maximum is 14.9 ms. The software tail did not reproduce in this hardware sample.
- **手机对照 · Physical mobile cross-check**：Fold7/Adreno830，同一 t285 原生 UI 前后，接受帧 p95 17.9→26.5 ms，而浏览器实际 RAF 均为 16.7 ms p95、59 个接受帧间隔均值 16.585→16.580 ms；11 个 >20 ms 后常伴随 10–12 ms 短间隔。画质版 28.0 ms p95、RAF 16.7 ms p95、一次 33.2 ms RAF。建议同步记录 2D/3D 宿主时序、RAF 和提交完成，而不是将接受帧尾直接解释为显示掉帧。 · Physical Fold7 shows more accepted-frame jitter with unchanged median browser RAF; the later visual sample has one 33.2 ms RAF gap. Keep RAF, host scheduling and submission timing distinct.
- **2026-11-28 同机软件复测 · Controlled software recheck**：旧线上原生 UI 60 个接受帧的 p95/max 为 523.6/541.5 ms；#545 预验收副本（打开诊断）为 365.7/373.0 ms。独立 RAF p95/max 为 345.9/362.6 → 358.3/370.8 ms，不能将接受帧指标变化还原为显示性能改善。新引擎实际观测：3D advance p95 3.1 ms，UI CPU render p95 183.3 ms，Host submit p95/max 182.7/230.8 ms，completion-error-query 182.5/195.5 ms，sync-delete-error-query 191.8/194.1 ms；49 次同步删除查询中 31 次 >50 ms，纹理上传为 0。阶段有嵌套，不加总。 · The same seeded medium WebGL2 fixture still has a software-only tail. Native timings identify blocking CPU wall time around Host submission and GL error queries, not a proved GPU or compositor cause. No texture uploads occurred. The engine's strict ownership/error contract must be maintained; investigate the query and retirement schedule without suppressing errors to improve a benchmark. 最长 373.0 ms 的接受帧中，实际 Host 区间合并后覆盖 370.0 ms；其中 completion-error-query 195.6 ms、retire 173.2 ms（内含 sync-delete 查询 173.1 ms），该样本不支持游戏逻辑为主要耗时。50 个 >50 ms 的接受帧都有 >20 ms 的 Host 区间；区间并集总计覆盖 98.1%。 · The union of measured Host spans covers 370.0 ms of the worst 373.0 ms accepted interval and 98.1% of the total 50 long intervals. The nested delete query is not counted twice.

### 9. 原生浮字触发整层界面提交 · Animated native markers wake the full overlay — 未解决 / open
<!-- engine-note: {"id":"jelly-pandas#9","status":"open","topic":"world3d-native-marker-overlay-batching","workaround":["src/ui/markers.mjs","src/ui/play-hud.mjs"]} -->

- **现象 · What happens**：同一 RTX 5090 硬件、844×390、种子 7、t285 的 120 接受帧样本，从旧 DOM 浮字到原生浮字后，2D GL drawArrays 190 → 2926，虽然固定字形页不为每次伤害重新光栅化。Fold7 预验收样本中原生 2D render CPU p95 为 9.5 ms，实际 RAF p95 仍为 16.7 ms；此为可优化的开销，不是已证实的手机掉帧。 · Native floating animation wakes the ordinary overlay painter more often; this increases draw calls even though glyph pages are reused. The mobile hardware cadence remained stable in this run.
- **游戏里 · In the game**：40+4 固定池、共享字形页、无活动标记时跳过更新、只在 UI 或可见标记状态变化时 invalidate。 · Retain a bounded pool, shared glyph page and change-driven invalidation. No downgrade to visual quality or game rules.
- **建议 · Suggestion**：提供原生标记的跨对象批处理、或支持独立保留 HUD 层与动态浮字层按需合成；用同一真实负载比较主线程准备、提交、错误查询及实际 RAF。 · Consider cross-object marker batching or independently retained HUD composition with animated markers; validate against the same physical workload.

### 10. WebKit 按需绘制的首屏可见性 · WebKit on-demand first-frame presentation — 未解决 / open
<!-- engine-note: {"id":"jelly-pandas#10","status":"open","topic":"webkit-on-demand-first-presentation","workaround":["src/ui/menus.mjs"]} -->

- **现象 / Observation**：Windows Playwright WebKit 26.6、iPhone 15 Pro 配置，标题逻辑就绪时整个角色选择面板为空；触屏开始后正常出现游戏 HUD。 · The portrait roster is blank even when title semantics are ready; play HUD appears after touching Start.
- **游戏里的处理 / Workaround**：[src/ui/menus.mjs](src/ui/menus.mjs)：每次静态菜单布局提交后合并为一笔 250 ms invalidate，关闭页面取消。 · Coalesce a single 250 ms invalidate after each committed static menu, cancelled at screen close. 实拍首屏与触屏后画面正常，不强制连续重绘。 · Inspected title and subsequent touch screen both render correctly, without a continuous redraw loop.
- **建议 / Proposal**：引擎异步资源就绪后保证最后接收帧正常交给合成器；测试静止首屏不点击即呈现，且呈现后不再连续提交。 · Ensure the last accepted asynchronously populated frame is presented; verify an untouched static page becomes visible and then stays on demand.
- **状态 / Status**：对 Windows WebKit 已验证有限补帧绕过，未验证实体 iPhone。 · Bounded workaround verified on Windows WebKit; physical iOS remains unverified.
