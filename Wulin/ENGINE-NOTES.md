# 引擎笔记 · Engine notes

引擎副本：正式 main `a0fb4e6c40a93156acd49f78ebf622375193a92c`（含 #557、#563、#567；见 [vendor/SOURCE.md](vendor/SOURCE.md)）。使用官方工具生成，不修改引擎副本。以下保留 #557 候选 `3748b332b5fafd2cb4530ca3df88ddd9d2939d46` 的历史验证证据，正式版本的设备和性能复测另见 QUALITY。
Engine copy: official main `a0fb4e6c40a93156acd49f78ebf622375193a92c` (including #557, #563 and #567; see [vendor/SOURCE.md](vendor/SOURCE.md)). Official vendoring only, no local patch. The historical #557 candidate evidence from 3748b332 is retained below; official-pin device and performance results are recorded separately in QUALITY.

### 1. 长名册与弹窗的段落缓存上限 · Paragraph capacity in rosters and dialogs — 已解决 / resolved
<!-- engine-note: {"id":"Wulin#1","status":"resolved","topic":"paragraph-cache-budget"} -->

- 原现象 · Original observation：在弟子名册打开人物单，实际 Chromium 验收出现 `PARAGRAPH_CACHE_BUDGET`。旧版缓存的条目数及并发作业数硬上限均为 32；纵向滚动视图会实体化视口外的富文本。 · Chromium reported the cache budget error when opening a person sheet above the roster. The former entries and pending-job hard cap was 32; a scroll view materializes rich labels outside its viewport.
- 最小复现 · Reproduction：创建带 20 个段落的原生滚动视图，再打开带 20 个不同段落的模态；使用 Canvas paragraph provider，不需 Wasm。 · Show a native scrolling view with 20 distinct paragraphs, then a modal with 20 different paragraphs, using the Canvas paragraph provider.
- 状态 · Status：已在 #557 合入 main，允许显式设置 1–128 个缓存条目及并发准备任务，默认仍为 32。256 个调用者需求及图像、几何字节等独立预算依旧有限。20+20 个真实 Canvas 段落用例在合并前候选上通过。 · Resolved by #557 on main, allowing explicit 1–128 entry and concurrent preparation budgets while retaining the default of 32. The independent 256-caller and byte budgets remain bounded. The actual 20+20 Canvas paragraph case passed on the pre-merge candidate.
- 游戏里的处理 · Game use：[`src/ui/native-shell.mjs`](src/ui/native-shell.mjs) 使用 `createParagraphCache`，设置 `maxEntries:96`、`maxPendingJobs:96`、`maxImageBytes:64*1024*1024`；[`src/ui/native-kit.mjs`](src/ui/native-kit.mjs) 删掉每页 14 段落及替代单行的绕过。分页仍用于阅读、焦点和滚动。 · The shared cache explicitly uses 96 entries, 96 jobs and 64 MiB of images; the former 14-paragraph compiler fallback is gone. Pagination remains for readable, navigable lists.
- 证据 · Evidence：候选预览的软件渲染 Chromium 实测第 1440 日有效存档，24 名弟子、96 条纪事。名册与人物单同时 19 个活动租约，关闭人物单回到 11；浏览纪事第二页共驻留 49 个条目，4,555,220 图像记账字节，无缓存错误。鼠标滚轮到达各列表末尾。这是功能与逻辑预算证据，不是物理内存、GPU 或手机帧率测量。 · A software-rendered Chromium walk with a valid day-1440 simulated save (24 disciples, 96 chronicle entries) observes 19 live leases with the person modal and roster, 11 after closing, and 49 resident entries / 4,555,220 charged image bytes after browsing page two of the chronicle, with no budget errors. Mouse-wheel scrolling reaches the ends. These are functional and accounting observations, not physical memory, GPU or phone performance.
- 后续建议 · Further proposal：视口外的富文本仍会提前准备；若后续做更大规模列表，可另行提供视口感知的延迟实体化、复用与排队诊断，不把容量配置当作虚拟化。 · Offscreen paragraphs still prepare eagerly; viewport-aware realization, reuse and queue diagnostics remain worthwhile for larger future lists. Increasing the budget is not virtualization.

### 2. 多屏验收与滚动裁切边界 · Screen verification and clipped controls — 已解决 / resolved
<!-- engine-note: {"id":"Wulin#2","status":"resolved","topic":"screen-verification-scroll-clipping"} -->

- 现象 · Observation：`verify --screens --play test/screen-verify.mjs` 的九种尺寸均可完成路线，但报告的 `inSafeArea` / `apart` 把滚动视口以外的指南分页、门派列表及设置选项也计入，包括实际被裁切掉的按钮。截图与真实可见语义框必须独立核对。 · All nine routes complete but the verifier also counts raw rectangles of scroll-clipped controls, including the guide pagination, sect list and scenario choices. Compare screenshots and the native visible semantic bounds independently.
- 最小复现 · Reproduction：在安全区内放置一只纵向滚动面板，内容超过窗口，下方固定两个按钮；验收未滚动与末尾位置。 · Place a scroll panel inside the safe area with content longer than its viewport and two fixed footer buttons; verify both its first and last scroll positions.
- 状态 · Status：引擎 #549 的共享控件报告器及 #552 的精确变换裁切已合入主干。只使用正式 `verify --screens`；不再需要绕过裁切报告，仍保留实际滚动及下层控件遮挡回归。 · Resolved by engine #549 and #552. Use the official verifier without a clipping workaround; retain real scrolling and overlap regressions.
- 建议 · Proposal：以裁切后的可操作矩形及有效可见性作安全区/相交检查，同时单独报告部分露出的控件。 · Use effective visibility and clipped actionable bounds for safe-area and overlap checks, reporting partially visible rows separately.

### 3. 声音混音与定位 · Audio mixing and localization — 部分解决 / partly
<!-- engine-note: {"id":"Wulin#3","status":"partly","topic":"audio-custom-source-ducking-spatial-filter","workaround":["src/ui/voice.mjs"]} -->

- 原现象 · Original observation：旧混音器没有为本作用到的精确录音/合成声调度提供共享外部输入条；旁白侧链压低、按镜头缩放与视点控制的距离低通难以共用正式总线。World3D HRTF 监听器与本作俯视声场并不等价。 · The previous mixer lacked a shared external-input strip for the game's precise recorded and synthesized scheduling, ducking and camera-dependent lowpass. World3D HRTF is not equivalent to the overhead sound design.
- 状态 · Status：#557 已合入 main；`createBrowserAudio` / `BrowserAudio.createInput` 提供外部源入口、音量、压低、声像、低通及渐变控制，解决现有 WebAudio 源的接入与定位需求。 · Engine #557 is on main; its browser mixer and input strip support external sources, gain, ducking, panning, lowpass and glides, addressing the game's WebAudio mixing and spatial-filter needs.
- 游戏里的处理 · Game use：[`src/ui/audio-graph.mjs`](src/ui/audio-graph.mjs) 在可信用户操作时创建一次原生混音器，使用 `music`、`effects`、`voice`、`ambience` 四条总线；配乐、合成、录制语音、环境与战斗声音使用其输入条，保留各自的片段调度、音量和压低值。定位声的距离、方向及镜头缩放计算仍是本作的声音设计，不替换成 HRTF。 · One native mixer is created on trusted player input, with four named buses. Recordings, synthesized and environmental sound use its strips without changing clip scheduling or mix values. Distances, directions and camera zoom remain intentional game-specific sound design rather than HRTF.
- 剩余限制 · Remaining limit：浏览器动态系统语音仍由平台语音服务直接播放，不是 WebAudio 节点；[`src/ui/voice.mjs`](src/ui/voice.mjs) 保留开始/结束事件及其他声音的压低联动。不能声称系统语音已被四路混音器处理。原生输入与游戏调度有自动化回归；物理扬声器实听、系统语音覆盖与不同设备的混音表现单独验收。 · System speech remains a platform voice outside the WebAudio graph, with start/end-driven ducking of the other sounds. Automated input and scheduling regressions do not establish speaker listening, platform voice availability or device-specific mix quality.

- 建议 · Proposal：保留外部源混音与空间滤波正式接口；在支持的平台进一步统一语音开始、完成、取消与压低生命周期，不把系统语音误作可连接的 WebAudio 节点。 · Keep the external-source mixer and spatial filters; expose consistent speech start, completion, cancellation and duck lifecycle where the platform allows it, without representing system speech as a connectable WebAudio node.

### 4. 文件交换与原生表单 · File exchange and native forms — 已解决 / resolved
<!-- engine-note: {"id":"Wulin#4","status":"resolved","topic":"native-file-and-choice-controls"} -->

- 原现象 · Original observation：旧版数据视图缺少直接的原生选择/编辑调用和浏览器文件交换 API，需要在游戏侧组装选择模态、编辑生命周期与临时文件控件。 · The previous data-view APIs lacked direct native selection/editing and browser file exchange; the game assembled the modal, edit lifetime and temporary file controls.
- 状态 · Status：已在 #557 合入 main；`game.select`、`view.edit`、`pickBrowserTextFile`、`downloadBrowserTextFile` 满足本作现有表单和文件交换。 · Resolved in #557 on main; native selection, view editing and browser file helpers cover the game's current form and file operations.
- 游戏里的处理 · Game use：[`src/ui/native-shell.mjs`](src/ui/native-shell.mjs) 调用原生选择和指定视图名称编辑，由引擎管理原生输入框、键盘焦点、取消和选择返回；[`src/main.mjs`](src/main.mjs) 调用浏览器文件 API 进行存档与数据包导入导出。用 `createSaveStore` 保留旧档字节、槽键和校验，不新增游戏侧 DOM 文件选择器。文件选择必须由玩家主动操作；浏览器返回文本后仍由原存档/数据包解析器验证。 · View-name editing and selection are native calls with engine-managed editor, focus and cancellation. File exchange uses the browser entry and preserves the old save codec, slot keys and checksums. The player explicitly selects the file; existing parsers still validate its returned text.
- 边界 · Boundary：本作表单以数据视图按钮触发正式调用，不声称新增了独立的声明式输入/步进部件；系统 IME、读屏软件等实际设备路径另验。 · Form buttons invoke native methods; this does not claim a new declarative input or stepper part. Physical IME and screen-reader paths are separate acceptance.

### 5. 通用键盘验收辨认 native focus · Detecting native focus in generic quality probes — 已解决 / resolved
<!-- engine-note: {"id":"Wulin#5","status":"resolved","topic":"native-ui-keyboard-quality-probe"} -->

- 现象 · Observation：通用 A1 检查依据 document.activeElement，不能辨认 Play 画布内的实际原生焦点；A2 仍正常读到语义节点。 · The generic A1 active-element probe cannot identify the focused native view part while the canvas owns keyboard input; A2 does see the projected semantics.
- 证据 · Evidence：实际 Tab / Enter 从标题经过序章、传承、确认、掌门手札进入弟子页；语义树焦点按键变化；零控制台错误。 · Actual Tab/Enter navigated from title through prologue, succession, confirmation and guide to disciples, with published focus changes and no console errors.
- 状态 · Status：引擎 #552 增加真实键盘导航和焦点语义回归；通用质量工具读取已获得 DOM 焦点的画布拥有的有效 `aria-activedescendant`，不更改画布焦点归属。A1 可检查原生控件；拒绝失效、无归属、隐藏及禁用目标。 · Engine #552 verifies real keyboard and semantic focus. The common quality probe recognizes the actual DOM owner’s valid owned active descendant, without changing canvas ownership, and rejects stale, unowned, hidden and disabled targets.

- 游戏里的处理 · Workaround：无游戏专用兼容代码；正式通用验收读取浏览器拥有的语义焦点，保留实按 Tab/Enter 测试。 · No game-specific workaround; the common verifier reads browser-owned semantic focus and retains real keyboard tests.
- 建议 · Proposal：采用 #552 的正式键盘回归，并对浏览器质量验收统一使用有效、具归属的 active descendant。 · Adopt the official keyboard regression and validate owned active descendants.

### 6. 原生通知位置与配色 · Native toast placement and contrast — 已解决 / resolved
<!-- engine-note: {"id":"Wulin#6","status":"resolved","topic":"native-toast-placement-contrast"} -->

- 现象 · Observation：固定顶部的 `game.toast` 在常驻命令顶栏下可能被遮挡；游戏主题深色文字与默认深色背景也不够清楚。 · A fixed-top toast can sit behind the persistent command header; dark themed text on the default dark background has poor contrast.
- 最小复现 · Reproduction：显示满宽固定顶栏，调用默认 `game.toast`，在 1280×800 和 873×325 下进入地图。 · Show a fixed top header, call the default toast, and enter a map at 1280×800 and 873×325.
- 状态 · Status：已在 #557 合入 main，提供 `game.toast` 的安全区锚点、偏移、尺寸与样式、前景放置、持续模式及可关闭句柄。正式场景通知不再需要自建被动视图。 · Resolved in #557 on main with safe-area anchor/offset, sizing and styling, foreground placement, persistence and a closable toast handle. Scene notifications no longer need an assembled passive view.
- 游戏里的处理 · Game use：[`src/ui/native-notice.mjs`](src/ui/native-notice.mjs) 按场景、安全区和矮横屏空白选定 `placement`，调用 `game.toast` 并使用句柄关闭旧通知；保留原提示时长，使用高对比度配色。弹窗里的反馈有意放在同一张原生单子内的状态行，避免挡住操作并保持阅读顺序。没有自建 DOM 界面。 · The native toast uses scene-aware safe-area placement, appropriate contrast and a handle to replace or close notices. Inline feedback in a modal deliberately remains part of its native reading order, not a replacement floating layer.

### 7. 次要鼠标键的镜头拖动 · Secondary-button camera drag — 未解决 / open
<!-- engine-note: {"id":"Wulin#7","status":"open","topic":"secondary-pointer-drag","workaround":["src/view/orbit.mjs"]} -->

- 现象 · Observation：正式引擎 `dfd8cc6` 的原生手势将右键作为次要点击识别，并在拖动时抑制点击，不发布主要 drag 回调。实际桌面浏览器两次验证中，左拖与滚轮正常，但场景空白处右拖未平移。 · The native gesture recognizer distinguishes secondary click and suppresses clicks after movement without dispatching primary drag callbacks. In two physical-GPU desktop runs, left drag and wheel worked but right drag in the scene did not pan.
- 最小复现 · Reproduction：用 `game.gestures(sceneSurface, { drag })` 注册场景拖动，鼠标右键在同一区域按下、移动并释放；对照左键。 · Register a scene drag, then press, move and release the right mouse button in that region; compare the primary button.
- 游戏里的处理 · Workaround：使用引擎 `game.browser.pointer.observe` 的具归属接触流单独识别次要按钮拖动；主要手势、点选、捏合继续使用原生手势，不增加 DOM 指针处理或修改引擎副本。 · Use the engine's owned contact observer for secondary-button camera movement. Primary gestures, picking and pinch remain native, without DOM input handlers or local engine patches.
- 建议 · Proposal：给 `game.gestures` 增加显式选择的次要键拖动及相应取消语义，默认保留次要点击识别，避免改变已有游戏。 · Consider opt-in secondary-button drag and cancellation while preserving the default secondary-click contract.

### 8. 数据视图图片失败后的恢复 · Recovery from native view image failures — 未解决 / open
<!-- engine-note: {"id":"Wulin#8","status":"open","topic":"native-view-image-failure-recovery","workaround":["src/main.mjs"]} -->

- 现象 · Observation：当 `game.show` 的图片读取失败时，当前 BrowserPlay 在帧更新中抛出该失败并终止引擎循环。如果页面同时在 `game.loading` 中等待清单，已有的原生错误框可能无法发布和呈现。E2 实际拦截印章、清单两项时重试不可见，未出现浏览器未捕获异常。 · A native view image failure can stop the BrowserPlay frame loop, preventing the newly opened error UI from being presented. The actual E2 test refused the seal and manifest and found no visible retry.
- 最小复现 · Reproduction：在首屏数据视图中引用无法读取的 PNG，在另一个加载层等待失败的 JSON 任务，失败后尝试创建原生重试视图。 · Load an unavailable PNG from a data view while a loading layer waits on an unavailable JSON manifest, then show a native error/retry view.
- 游戏里的处理 · Workaround：启动时统一在正式 `game.loading` 内读取清单并以引擎 `game.browser.loadTexture` 的 scope lease 预加载首屏印章/封面；成功前不挂数据视图。失败时仍可渲染原生重试。若宿主已经终止，才恢复页面原有载入状态行并提供一个实际重载链接，不在正常游戏中用 DOM 界面。 · Resolve the essential title images through the engine's loader and scoped texture leases before mounting image-bearing views. Recoverable startup failures retain a native retry; only a stopped host exposes a reload link in the existing bootstrap status line.
- 证据 · Evidence：正式浏览器 test/asset-retry.mjs 的五个实际故障场景全部恢复：全拦截、清单、印章、英文封面及晚期序章图（触屏）。前四项保留原生宿主和重试；最后一项实际终止循环后由最小重载链接恢复。同一资源恢复后可以重新进入场景，无未捕获异常。 · All five injected fault cases recovered after an actual retry; the late-scene case proved the host had stopped before using the emergency reload link.
- 建议 · Proposal：考虑允许数据视图的图片失败采用可控占位或失败回调，保留其所在页面的事件循环和重试能力；对不可恢复宿主错误明确提供独立恢复入口。 · Consider a recoverable image error/placeholder and callback policy that retains the page's event loop and retry capability, plus a distinct path for unrecoverable host failures.

### 9. 大型 World3D 场景的首次几何上传 · Cold geometry upload for a large World3D scene — 已解决 / resolved
<!-- engine-note: {"id":"Wulin#9","status":"resolved","topic":"world3d-budgeted-geometry-preparation"} -->

- 现象 · Observation：PC 实测进入江湖首次 3D 渲染 CPU 42.8/44.3ms，其中约 34.79MB 冷几何、1,950 次 bufferData；首次绘制的着色程序已提前准备，并没有新链接。 · Actual first desktop rendering uploaded ~34.79MB in 1,950 bufferData calls; the shaders were already prepared.
- 游戏里的处理 · Game use：[`src/view/scene-preparation.mjs`](src/view/scene-preparation.mjs) 在高画质有限批次调用引擎 `prepareGeometries`，与程序准备并行；地图显示、取消、context restore 保持真实缓存生命周期。低档实测预备收益为负，保留按需上传。[`src/view/buildings.mjs`](src/view/buildings.mjs) 共享江湖静态建筑模板，独立保留节点与所有权颜色。 · Budgeted geometry preparation runs alongside programs only on the measured high-quality path; low quality stays lazy. The game shares immutable static templates with separate transforms and ownership.
- 状态 · Status：引擎 #563 已合入 main，提供正式几何预备 API，无 vendor 补丁。实际数据、复现和低档不采用该策略的原因见[性能记录](docs/realm-entry-performance.md)。 · Engine #563 on main exposes explicit preparation without a vendor patch; measured controls and the low-quality opt-out are documented in the performance report.
- 边界 · Limit：仍可能等待 GPU 首次阴影工作及 2D WebGL2 必需的错误检查。保留安全检查，不将 RAF 等同于 GPU 时间，也不承诺每帧无长帧。 · Cold GPU shadow work and mandatory WebGL2 error-query waits can remain; retain validation, and do not equate RAF with GPU execution.

### 10. Canvas 字形和富文本的同帧 CPU 峰值 · Canvas label and paragraph CPU bursts — 已解决 / resolved
<!-- engine-note: {"id":"Wulin#10","status":"resolved","topic":"browser-canvas-text-work-budget"} -->

- 现象 · Observation：Fold7 实际点击江湖的 pointerup 路径曾出现 69.7ms CPU 段，主要来自 Canvas 文字测量、绘制和读回，而非游戏逻辑。 · Actual device input showed a 69.7ms handler segment dominated by Canvas text measure/draw/readback rather than simulation.
- 游戏里的处理 · Game use：[`src/main.mjs`](src/main.mjs) 用 `play({textWorkBudgetMs: 4, textWorkBudgetWhen})`，仅无弹窗的3D江湖对新任务启用分帧；[`src/ui/native-shell.mjs`](src/ui/native-shell.mjs) 让原生富文本提供者共用 `game.browser.scheduleTextWork`。保留文字缓存、资源、取消及原生焦点。 · Opt-in 4ms shared budgeting applies to new work in the modal-free 3D realm; other screens retain immediate work, with normal cache, cancellation and focus semantics.
- 状态 · Status：引擎 #563 已合入 main，提供可选且可限定范围的 CPU 文字准备接口，无 vendor 补丁。全局开启曾引起手札短暂缺字，作对照记录而非改黄金图。 · Engine #563 on main exposes scoped opt-in budgeting; the global opt-in transient guide regression is documented, not hidden by modifying goldens.
- 边界 · Limit：单次 Canvas 作业不可抢占，逐帧预算不是保证帧耗时；只有在实际场景验证可接受时采用。 · A single Canvas job remains atomic. A cooperative budget is not a frame time guarantee.

### 11. 独立 3D/2D 画布的同帧 GPU 同步等待 · Same-frame GPU synchronization between independent 3D and 2D canvases — 部分解决 / partly
<!-- engine-note: {"id":"Wulin#11","status":"partly","topic":"mixed-world3d-2d-submit-order"} -->

- 现象 · Observation：PC 冷江湖首次真实 3D 提交 CPU 约5.6–5.9ms，紧随 2D `workingAttachment → getError` 等待共享 GPU 服务约35–38ms；最新版 #560 仍可复现。 · The required synchronous 2D check waits on preceding independent 3D GPU commands, not the scene's CPU assembly or a confirmed standalone compositor defect.
- 游戏里的处理 · Game use：[`src/main.mjs`](src/main.mjs) 使用正式 `play({afterFrame})`，[`src/view/stage.mjs`](src/view/stage.mjs) 仅实测桌面（非触摸、细指针）高档 WebGL2 江湖设置 `World3DView.deferRender`，时钟更新正常、同一帧在2D后调用 `drawPending()`；真实接受才发布首图就绪。保留所有错误、完成及资源生命周期检查。 · The optional phase orders independent submission after native UI on the measured route without changing logic or default order elsewhere.
- 证据 · Evidence：同引擎四轮完整窗口峰54.1/50.0/50.0/58.3ms→33.3/37.5/29.2/29.2ms，LoAF四轮→0，后续 `SharedGLHost.poll` 的实际等待仍11.7–17.2ms；完整路线、鼠标及真实接受计数正常。 · Compare full-window and tail rather than merely leaving the cost beyond the first frame. [追踪与限制 / Detailed evidence](docs/realm-frame-pacing.md).
- 状态 · Status：引擎 #567 已正式合入 main，新增可选提交阶段；等待未完全消失，仍需按设备验证启用。 · Engine #567 merged; the optional phase is official, while GPU completion wait still requires device-specific validation.
- 后续真实 Fold7 高档证据 · High-preset device follow-up：4组冷/热和2项对照共108/108。当前无KHR并行编译扩展，实际8个程序状态查询峰8.1–9.3ms，历史84.2ms未复现；首图3D后必要2D getError仍51.4–67.3ms，即使实际预上传 fence 已完成。关闭预备仅将上传集中到首绘，fence也未建立稳定净收益，皆未上线。[完整实测 / Detailed evidence](docs/fold7-high-program-preparation.md)。 · Separate historical query from current cross-context wait; do not remove validation or ship the negative experiments.
- 建议 · Proposal：保留显式同帧提交阶段与精确时序诊断；继续观察平台GPU命令等待，不去掉必要的 `getError` 或将未接受 draw 标成已呈现。 · Keep the explicit phase and lifecycle validation; measure the remaining completion wait per device.

### 12. 原生富文本的栅格密度与字重 · Native paragraph raster density and font weight — 部分解决 / partly
<!-- engine-note: {"id":"Wulin#12","status":"partly","topic":"native-paragraph-density-font-weight","workaround":["src/ui/native-kit.mjs","src/ui/native-shell.mjs"]} -->

- 现象 · Observation：PC 实际画布1.5 backing pixels/UI unit，正文固定 density2，最近邻1.333倍缩放造成笔画锯齿；标题、单行及按钮标签使用实际密度相对清楚。富文本第一段声明bold，但实际 Canvas font 是regular。 · Actual desktop raster/display density mismatch on multiline paragraph, and paragraph weight distinct from the documented single-line style.
- 游戏里的处理 · Game use：[`src/ui/native-kit.mjs`](src/ui/native-kit.mjs) 从真实 backing/frame 与 uiScale 计算原生 paragraph density，精度稳定、最大保留2；[`src/ui/native-shell.mjs`](src/ui/native-shell.mjs) 编译当前原生描述时传入。同一弹窗三段实际匹配1:1、原1.333倍、位图字节541424→315484；与真实四组 nearest/linear 对照确认匹配+nearest 最清楚，不全局修改过滤。 · Match actual physical pixels and maintain existing cache budget; no custom page text or forced filter.
- 状态 · Status：密度错配为游戏修复，现有正式引擎即可完成。引擎文档明确 weight/italic 只适用单行和按钮标题，`ViewParagraphStyle` 与段落 provider request/capability/cache key 没有字重；本轮不伪造 family 或扩大两种后端的字体契约。 · Game density mismatch resolved, paragraph weight remains an explicit native capability limit.
- 建议 · Proposal：考虑让原生段落描述默认取当前实际栅格密度，支持显式可选精细字重（同步 Canvas/CanvasKit、measure、cache identity、fallback 和 raster 语义）。 · Consider adaptive paragraph density and formal optional weight across both providers; not a global texture filtering change.
