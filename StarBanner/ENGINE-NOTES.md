# 星旗战记 · 引擎问题与建议 · Starbanner Tactics · Engine notes

原生叠加层版本 / Native overlay version: `938a8d206fb3395bbac47be832a374df7b37eed3`.

开发中遇到的引擎问题、本作的绕过办法和给引擎的建议。

Engine problems met while making this game, what the game does about them, and suggestions for the engine.

### 1. `Material3D.clone()` 与原材质共用同一个自定义着色器参数 · `Material3D.clone()` shares the custom shader's parameters with the original — 已写入文档 / documented
<!-- engine-note: {"id": "StarBanner#1", "status": "documented", "topic": "material-clone-shader", "workaround": ["src/view/figures.mjs"]} -->

- **现象 · What happens**：材质的 `shader` 是冻结的对象，`clone()` 只复制引用，所以克隆出来的材质和原材质共用同一个 `uniforms` 数组。本作每个单位要单独变灰、闪白、换阵营色，克隆材质后改一个单位的参数，同一种兵就全部跟着变了。 · A material's `shader` is a frozen object and `clone()` copies the reference, so a clone shares the original's `uniforms`; greying one unit greyed every unit of its kind.
- **绕过办法 · Workaround**：每份克隆后再用 `createCustomShader3D({ ...m.shader, uniforms: m.shader.uniforms })` 建一个新的着色器对象（同一个 `key`，程序仍然共用），见 `src/view/figures.mjs`。 · Each copy gets a fresh `createCustomShader3D` with the same key (the compiled program is still shared).
- **建议 · Suggestion**：`clone()` 对自定义着色器复制一份参数（或提供 `material.cloneWith({ uniforms })`），并在文档里写明克隆的深浅。 · Copy the parameters on `clone()` (or offer a way to), and document how deep a clone goes.
- **状态 · Status**：已写入文档（引擎 #485，`8637ace`）：引擎把这条写成 guide 卡片 toon-figure-hooks；`Material3D.clone()` 仍共用着色器参数。 · Documented (engine #485, `8637ace`): the engine wrote this up as its toon-figure-hooks guide card; `Material3D.clone()` still shares the shader's parameters.

### 2. 只有顶点钩子的着色器写进 `glsl` 时报错不直观 · A vertex-only hook given as `glsl` fails with an unhelpful error — 未解决 / open
<!-- engine-note: {"id": "StarBanner#2", "status": "open", "topic": "vertex-hook-error", "workaround": ["src/view/board.mjs"]} -->

- **现象 · What happens**：把 `customVertex` 函数错放进 `createCustomShader3D({ glsl })`，编译时报 `'customFragment' : no matching overloaded function found`，每帧刷一次 `WORLD3D_SHADER_FAILED`。 · Putting a `customVertex` function in `glsl` fails at compile time with "no matching overloaded function", once a frame.
- **绕过办法 · Workaround**：顶点钩子放 `glslVertex` / `wgslVertex`（`src/view/board.mjs` 的草丛摇摆和水面起伏）。 · Vertex hooks go in `glslVertex` / `wgslVertex`.
- **建议 · Suggestion**：`createCustomShader3D` 检查源码里有没有对应的函数名（`customFragment`、`customVertex`、`customNormal`），放错位置时给出明确的错误；同一个失败的程序只报一次。 · Check the source names the function its slot expects and say so clearly; report a failed program once.
- **状态 · Status**：未解决 / open。

### 3. 卡通材质没有边缘光、暗部颜色和描边选项 · The toon material has no rim, shade colour or outline options — 已写入文档 / documented
<!-- engine-note: {"id": "StarBanner#3", "status": "documented", "topic": "toon-material-options", "workaround": ["src/view/toon.mjs", "src/view/stage.mjs"]} -->

- **现象 · What happens**：`createToonMaterial3D` 只有分层数 `steps`。日系卡通渲染常用的边缘光、暗部偏色（而不是单纯变暗）、按物体的描边都要自己写。 · `createToonMaterial3D` has only `steps`; the rim light, tinted shade and per-object outline anime shading needs are left to the game.
- **游戏里 · In the game**：边缘光写在自定义片元钩子里（读 `uCameraPosition` / `frame.cameraPosition`），描边用后期的 `outlineLayers`（`src/view/toon.mjs`、`src/view/stage.mjs`）。 · The rim is in a custom fragment hook; outlines use the post-process `outlineLayers`.
- **建议 · Suggestion**：给卡通材质加 `rim`（颜色、宽度）、`shadeColor` 和可选的反向外壳描边，并在 guide 里给一个日系卡通渲染的完整例子。 · Add `rim`, `shadeColor` and an optional inverted-hull outline to the toon material, with a full example in the guide.
- **状态 · Status**：已写入文档（引擎 #485，`8637ace`）：本作在片元钩子里做边缘光和换色的办法写进了 guide 卡片 toon-figure-hooks；卡通材质本身仍只有 `steps`。 · Documented (engine #485, `8637ace`): this game's rim and colours in a fragment hook went into the toon-figure-hooks guide card; the toon material itself still has only `steps`.

### 4. 软件渲染下帧率很低，镜头插值和时间驱动的动画脱节 · Under software rendering the frame rate is very low and eased cameras lag behind time-driven animation — 已写入文档 / documented
<!-- engine-note: {"id": "StarBanner#4", "status": "documented", "topic": "software-rendering-frame-rate", "workaround": ["src/view/stage.mjs", "src/view/figures.mjs"]} -->

- **现象 · What happens**：无头 Chromium + SwiftShader 下，带阴影和后期的棋盘只有每秒 1–4 帧。按帧插值的镜头半天到不了位置，而按时间推进的走路已经走完。 · Headless Chromium with SwiftShader draws the board at 1–4 frames a second; a camera eased per frame lags while time-driven walks finish.
- **绕过办法 · Workaround**：验收脚本和截图前调用 `rig.snap()` 让镜头直接落位；单位走路、出手按时间推进，不依赖帧数（`src/view/stage.mjs`、`src/view/figures.mjs`）。 · Captures snap the camera; walks and blows advance by time.
- **建议 · Suggestion**：引擎的验收工具文档里写明软件渲染的帧率范围，以及截图前应把按帧插值的状态落位。 · Note the software-rendering frame rate in the engine's testing guide.
- **状态 · Status**：已写入文档 / documented（本条）。
### 5. World3D 叠加层不支持 `uiScale` · World3D overlay does not expose `uiScale` — 未解决 / open

<!-- engine-note: {"id": "StarBanner#5", "status": "open", "topic": "world3d-overlay-ui-scale", "workaround": ["src/ui/host.mjs", "src/screens.mjs", "src/hud.mjs"]} -->

- 现象 / Symptom：`play` 的界面缩放不能用于 `createWorld3DOverlay`。手机宽屏的可点尺寸与桌面的面板占比需要分别控制。 / The overlay has no independent interface scale; phone targets need a minimum size while desktop panels should not take over the scene.
- 最小复现 / Reproduction：创建 800×420、`portrait:{width:380,height:680}, fit:'expand'` 的叠加层，注册一个 48×48 的按钮，将窗口从 1920×1080 改成 873×325。对比 `game.screen.scale` 后的 CSS 尺寸；叠加层配置没有 `uiScale`。 / Create this overlay and a 48×48 button, then resize from desktop to a short widescreen; its interface dimensions follow the scene scale.
- 绕过 / Workaround：使用引擎 `game.screen.safe/scale`，以 `max(48u,44/scale)` 作为交互行的尺寸，不另建响应式 DOM。 / Derive hit sizes from the native screen plan and cap ordinary UI growth.
- 建议 / Proposal：为叠加层提供与 `play` 一致且可独立配置的界面缩放，明确语义和指针几何也随变换更新。 / Expose matching independent UI scale in overlays, including pointer and semantic geometry.

### 6. `verify --screens` 未检查 World3D 叠加层的控件几何 · Screen verification omits overlay control geometry — 未解决 / open

<!-- engine-note: {"id": "StarBanner#6", "status": "open", "topic": "world3d-overlay-screen-verify", "workaround": ["src/ui/host.mjs", "test/accept.mjs"]} -->

- 现象 / Symptom：World3D 叠加层和它的原生语义树存在时，多屏幕工具只能执行页面检查；没有 `play` 的安全区、触控区与控件间距报告。 / Native overlay controls do not participate in the play-only geometry collector.
- 最小复现 / Reproduction：建立 `createWorld3DOverlay`，在舞台边缘添加一个 20×20 的原生行动控件并发布语义，执行 `node vendor/egret.mjs verify --screens`。页面级检查会运行，但不会报告该控件进入安全区或触控区不足。 / Create a 20×20 native action at the edge, publish semantics, and run multi-screen verification; the per-control checks are absent.
- 绕过 / Workaround：浏览器验收直接读取 native `createUiSemantics` 的控件矩形，以 `game.screen.scale` 转成 CSS 尺寸，并与 `game.screen.safe` 比对。 / The acceptance suite reads real semantic rectangles and checks their CSS geometry against the actual safe area.
- 建议 / Proposal：提供可注册的叠加层 `verify --screens` 控件采集入口，与 `play` 共享几何、安全区和遮挡规则。 / Allow native overlays to register the shared screen-verification collector.

### 7. 原生图片加载的并发超限直接失败 · Concurrent native image jobs are rejected instead of queued — 未解决 / open

<!-- engine-note: {"id": "StarBanner#7", "status": "open", "topic": "browser-game-image-admission", "workaround": ["src/ui/host.mjs"]} -->

- 现象 / Symptom：浏览器实测连续打开招募、设置、战果时出现 5 次 `ASSET_LOAD_FAILED`，内层为 `WEB_PNG_JOB_LIMIT`，头像并未缺失。`BrowserGame` 对所有图片编码共享 4 项的占用上限。 / Five such errors were observed during the initial browser route, even though the portraits existed. BrowserGame shares a four-job occupancy limit across image formats.
- 最小复现 / Reproduction：在 `createWorld3DOverlay` 后同时调用五个不同有效 URL 的 `game.loadTexture`，网络稍慢时第五个任务会被拒绝；调用 `Promise.allSettled` 可确认。 / Request five distinct valid textures at once on an overlay; with overlapping fetch/decode, the fifth can be rejected.
- 绕过 / Workaround：应用层按 URL 缓存实际引擎纹理租约，用最多三个并发的队列调用 `loadTexture`，让面板更替不会丢图。 / Cache actual engine leases and admit at most three URL jobs at once.
- 建议 / Proposal：保留严格的资源上限，提供可配置、有取消和优先级的排队入口，或公开等待占用槽的机制，避免普通场景切换把资源超限当成损坏。 / Keep the resource budget but expose cancellable/prioritized admission or a way to wait for a slot.

### 8. 叠加层冷启动的耗时需要可观察性 · Overlay cold-start timing needs attribution — 未解决 / open

<!-- engine-note: {"id": "StarBanner#8", "status": "open", "topic": "world3d-overlay-startup-timing", "workaround": ["src/main.mjs"]} -->

- 现象 / Symptom：RTX 5090 Laptop、Edge、WebGL2、1280×720、低画质的新浏览器会话中，旧标题约 0.81 s 可用；迁移后约 3.06 s。并行初始化时 3D 主机在页面时间 287 ms 就绪，`createInterfaceHost` 在 2576 ms 就绪，背景在 2864 ms、标题在 2917 ms 就绪。这里的 UI 主机时段含 overlay、语义和 hover 接入，尚未证明单个着色程序或 GPU 调用是根因。 / In a fresh real-GPU Edge session the title was ready at ~0.81 s before, ~3.06 s after. Parallel startup timestamps are 287 ms (3D host), 2576 ms (UI host including overlay/semantics/hover), 2864 ms (backdrop), 2917 ms (ready). The cause within UI initialization is not isolated.
- 最小复现 / Reproduction：本 Demo 清洁浏览器上下文访问 `?quality=low&lang=zh&map=wheat&seed=3`；读取 `window.egretGame.status.startup`，并在 3D 画布上单独测 `createWorld3DOverlay(canvas,{width:800,height:420,portrait:{width:380,height:680},fit:'expand',pixelRatio:2})` 初始化。 / Use a fresh context and read startup milestones; separately measure the native overlay creation with those options.
- 绕过 / Workaround：并行准备两套引擎主机，不把 UI 初始化延迟移到出阵按钮之后。 / Prepare both hosts in parallel rather than moving the cost into a player action.
- 建议 / Proposal：为 overlay 提供主机初始化、着色器准备、首帧与资源启动子阶段计时；根据测量结果评估管线缓存或异步预热。 / Expose host, shader, first-frame and resource startup timings; investigate caching or async warmup using the evidence.

### 9. 托管界面根的响应式树形与键盘注册限制 · Managed root responsive tree shape and keyboard attachment — 未解决 / open

<!-- engine-note: {"id": "StarBanner#9", "status": "open", "topic": "ui-root-responsive-shape-and-attach", "workaround": ["src/screens.mjs"]} -->

- 现象 / Symptom：`createUiRoot.setTree` 要求稳定树形，而 `KeyboardInput.registerTarget` 要求已附着的目标；在托管 leaf 的异步 prepare 阶段创建并注册控件时，目标尚未挂载。 / Managed-root updates require the same tree shape, and keyboard targets cannot register until attached; preparing controls in a detached leaf cannot register them yet.
- 最小复现 / Reproduction：在同一 `createUiRoot` 中把一列内容改成不同数量的叶子；另在 leaf `prepare` 返回前调用 `keyboard.registerTarget({id,target})`。 / Change the number of leaves on the same root, then separately try registering a control before the prepared leaf is published.
- 绕过 / Workaround：固定 16 个托管叶子槽，将不使用的槽设为零高度；prepare 原生空容器，提交后再在容器范围内连接原生控件和语义。屏幕根、栈和层管理器仍由引擎持有。 / Keep sixteen stable leaf slots, zero unused heights, prepare an empty scoped container, and connect native controls after attachment. Roots and layers remain engine-managed.
- 建议 / Proposal：支持可控的布局形状变化和已提交后注册钩子，让响应式屏幕减少不必要的视图重建并保留焦点。 / Offer safe responsive shape changes and a post-attachment registration hook preserving focus.

### 10. World3D 叠加层没有原生按需绘制模式 · World3D overlay has no native on-demand render mode — 未解决 / open

<!-- engine-note: {"id": "StarBanner#10", "status": "open", "topic": "world3d-overlay-on-demand-render", "workaround": ["src/ui/host.mjs", "src/ui/kit.mjs", "src/hud.mjs", "test/perf-route.mjs"]} -->

- 现象 / Symptom：当前叠加层通过 `createBrowserGame` 建立持续帧循环，未暴露 `play` 的按需渲染选项。独立 SwiftShader 同版本、静止棋盘 A/B/A，桌面叠层运行/暂停/恢复 p95 179.1/91.6/175.0 ms，375×667 模拟手机 129.1/62.6/125.0 ms；暂停段 UI 帧数为零而 World3D 继续更新。此为浏览器 rAF 间隔，不是 GPU 提交独占计时，也不是手机实机数字。 / A same-version software-rendered A/B/A reveals the repeated overlay-loop cost; rAF timing is not an exclusive GPU submission timer nor phone hardware measurement.
- 最小复现 / Reproduction：`node vendor/egret.mjs verify --screens=desktop,phone-small --play test/perf-route.mjs --out <fresh-dir>`。在相同场景测 2.5 秒，诊断性调用 `game.loop.stop()`，再 2.5 秒，恢复 `game.loop.start()` 后重测；检查 overlay 与 World3D 计数，不能把停止的 UI 当成正常玩法。 / The route compares a running, diagnostically stopped and restored native overlay on the same scene, checking both frame counters.
- 绕过 / Workaround：复用头顶标记和飘字，跳过相同内容的卡片、文字与几何绘制，语义树仅变化时发布。保留正常 overlay 帧循环，不为性能手写一套渲染、转屏、指针和动画调度。 / Pool projected nodes, skip unchanged content and geometry, and publish semantics when dirty. Keep the normal native loop rather than a custom render scheduler.
- 建议 / Proposal：`createWorld3DOverlay` 暴露与 `play` 一致的按需绘制，由原生 visual-revision、纹理就绪、hover/focus、动画与屏幕变更触发；可对 3D 投影标记在每次坐标变化时显式 invalidation。测量软件 A/B 改善同时保持实际触屏、转屏、语义与动态图集正确。 / Expose native on-demand rendering with visual-revision and input/resource/screen invalidation, plus explicit projected-marker updates; verify both performance and functional parity.
