# 星旗战记 · 引擎问题与建议 · Starbanner Tactics · Engine notes

原生叠加层迁移基线 / Native overlay migration baseline: `938a8d206fb3395bbac47be832a374df7b37eed3`。本次引擎副本 / Current engine copy: `0e7b29321a07ec956f66efb293c79798270512bd`；引擎 #528 合并 / merge: `0e7b29321a07ec956f66efb293c79798270512bd`。

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
### 5. World3D 叠加层不支持 `uiScale` · World3D overlay does not expose `uiScale` — 已在 0e7b2932 解决 / resolved in 0e7b2932
<!-- engine-note: {"id": "StarBanner#5", "status": "resolved", "topic": "world3d-overlay-ui-scale", "workaround": []} -->

- 原现象 / Previous symptom：`play` 的界面缩放不能用于 `createWorld3DOverlay`。手机宽屏的可点尺寸与桌面的面板占比需要分别控制。 / The overlay has no independent interface scale; phone targets need a minimum size while desktop panels should not take over the scene.
- 旧版最小复现 / Previous reproduction：创建 800×420、`portrait:{width:380,height:680}, fit:'expand'` 的叠加层，注册一个 48×48 的按钮，将窗口从 1920×1080 改成 873×325。对比 `game.screen.scale` 后的 CSS 尺寸；叠加层配置没有 `uiScale`。 / Create this overlay and a 48×48 button, then resize from desktop to a short widescreen; its interface dimensions follow the scene scale.
- 旧版绕过 / Previous workaround：使用引擎 `game.screen.safe/scale`，以 `max(48u,44/scale)` 作为交互行的尺寸，不另建响应式 DOM。 / Derive hit sizes from the native screen plan and cap ordinary UI growth.
- 原建议 / Prior proposal：为叠加层提供与 `play` 一致且可独立配置的界面缩放，明确语义和指针几何也随变换更新。 / Expose matching independent UI scale in overlays, including pointer and semantic geometry.

- 状态 / Status：引擎 #528（`0e7b29321a07ec956f66efb293c79798270512bd`）提供 `createWorld3DOverlay(...,{uiScale:{min,max}})`，由实际逻辑舞台、指针换算和语义几何共同使用。游戏采用 `{min:44/48,max:1.35}` 配合 `fit:'expand'`；48 个逻辑单位最低 44 CSS px，桌面最大 64.8 CSS px。布局仍以 `game.screen.safe` 及实际矩形为准。 / Engine #528 makes bounded overlay stage scaling native, including pointer and semantic transforms. The game selects these bounds so a 48-unit row spans 44–64.8 CSS px before actual hit-area geometry is considered.
- 复跑 / Regression route：`node test/native-ui-accept.mjs` 与 `verify --screens` 的宽屏、竖屏档；验收数据另见 QUALITY。 / Exercise the wide and portrait profiles; measured results are recorded separately in QUALITY.

### 6. `verify --screens` 未检查 World3D 叠加层的控件几何 · Screen verification omits overlay control geometry — 已在 0e7b2932 解决 / resolved in 0e7b2932
<!-- engine-note: {"id": "StarBanner#6", "status": "resolved", "topic": "world3d-overlay-screen-verify", "workaround": []} -->

- 原现象 / Previous symptom：World3D 叠加层和它的原生语义树存在时，多屏幕工具只能执行页面检查；没有 `play` 的安全区、触控区与控件间距报告。 / Native overlay controls do not participate in the play-only geometry collector.
- 旧版最小复现 / Previous reproduction：建立 `createWorld3DOverlay`，在舞台边缘添加一个 20×20 的原生行动控件并发布语义，执行 `node vendor/egret.mjs verify --screens`。页面级检查会运行，但不会报告该控件进入安全区或触控区不足。 / Create a 20×20 native action at the edge, publish semantics, and run multi-screen verification; the per-control checks are absent.
- 旧版绕过 / Previous workaround：浏览器验收直接读取 native `createUiSemantics` 的控件矩形，以 `game.screen.scale` 转成 CSS 尺寸，并与 `game.screen.safe` 比对。 / The acceptance suite reads real semantic rectangles and checks their CSS geometry against the actual safe area.
- 原建议 / Prior proposal：提供可注册的叠加层 `verify --screens` 控件采集入口，与 `play` 共享几何、安全区和遮挡规则。 / Allow native overlays to register the shared screen-verification collector.

- 状态 / Status：引擎 #528（`0e7b29321a07ec956f66efb293c79798270512bd`）把真实原生 hitArea、显示变换及裁切接入 `verify --screens`；存在浏览器原生语义投影时结合实际几何与语义名称。只有测试工具才启动采集，普通游戏无需轮询。补充语义视觉外框保留为诊断，不再替代官方控件报告。 / Engine #528 adds actual native hit targets, transforms and clips to screen verification, with names from native browser semantics when present. Collection is tooling-only; semantic visual bounds remain a supplementary diagnosis rather than a substitute collector.
- 复跑 / Regression route：`node vendor/egret.mjs verify --screens --play test/screen-route.mjs --out <new-dir>`，以原生报告为主，补测 `node test/screen-report.mjs <new-dir>`。 / Use native control receipts and the independent supplementary report.

### 7. 原生图片加载的并发超限直接失败 · Concurrent native image jobs are rejected instead of queued — 已在 0e7b2932 解决 / resolved in 0e7b2932
<!-- engine-note: {"id": "StarBanner#7", "status": "resolved", "topic": "browser-game-image-admission", "workaround": []} -->

- 原现象 / Previous symptom：浏览器实测连续打开招募、设置、战果时出现 5 次 `ASSET_LOAD_FAILED`，内层为 `WEB_PNG_JOB_LIMIT`，头像并未缺失。`BrowserGame` 对所有图片编码共享 4 项的占用上限。 / Five such errors were observed during the initial browser route, even though the portraits existed. BrowserGame shares a four-job occupancy limit across image formats.
- 旧版最小复现 / Previous reproduction：在 `createWorld3DOverlay` 后同时调用五个不同有效 URL 的 `game.loadTexture`，网络稍慢时第五个任务会被拒绝；调用 `Promise.allSettled` 可确认。 / Request five distinct valid textures at once on an overlay; with overlapping fetch/decode, the fifth can be rejected.
- 旧版绕过 / Previous workaround：应用层按 URL 缓存实际引擎纹理租约，用最多三个并发的队列调用 `loadTexture`，让面板更替不会丢图。 / Cache actual engine leases and admit at most three URL jobs at once.
- 原建议 / Prior proposal：保留严格的资源上限，提供可配置、有取消和优先级的排队入口，或公开等待占用槽的机制，避免普通场景切换把资源超限当成损坏。 / Keep the resource budget but expose cancellable/prioritized admission or a way to wait for a slot.

- 状态 / Status：引擎 #528（`0e7b29321a07ec956f66efb293c79798270512bd`）以每个 BrowserGame 的取消安全等待队列限制图片任务，在占用槽空闲前不发起实际任务；严格的 4 项上限保留。游戏取消自己的并发队列，保留同资源去重、真实引擎纹理租约及失败重试。没有取消资源额度，也未声称实现优先级队列。 / Engine #528 queues per-game image jobs until a slot is available, supports cancellation, and retains the four-job limit. The game retains resource reuse, leases and retries. Unlimited loading or priority scheduling is not claimed.
- 复跑 / Regression route：`node test/native-ui-accept.mjs`，同时请求八张实际头像和重复 URL，观测请求并发与同资源租约。 / Load eight actual portraits concurrently and a duplicate URL; observe admission and resource sharing.

### 8. 叠加层冷启动的耗时需要可观察性 · Overlay cold-start timing needs attribution — 已在 0e7b2932 解决 / resolved in 0e7b2932
<!-- engine-note: {"id": "StarBanner#8", "status": "resolved", "topic": "world3d-overlay-startup-timing", "workaround": []} -->

- 原现象 / Previous symptom：RTX 5090 Laptop、Edge、WebGL2、1280×720、低画质的新浏览器会话中，旧标题约 0.81 s 可用；迁移后约 3.06 s。并行初始化时 3D 主机在页面时间 287 ms 就绪，`createInterfaceHost` 在 2576 ms 就绪，背景在 2864 ms、标题在 2917 ms 就绪。这里的 UI 主机时段含 overlay、语义和 hover 接入，尚未证明单个着色程序或 GPU 调用是根因。 / In a fresh real-GPU Edge session the title was ready at ~0.81 s before, ~3.06 s after. Parallel startup timestamps are 287 ms (3D host), 2576 ms (UI host including overlay/semantics/hover), 2864 ms (backdrop), 2917 ms (ready). The cause within UI initialization is not isolated.
- 旧版最小复现 / Previous reproduction：本 Demo 清洁浏览器上下文访问 `?quality=low&lang=zh&map=wheat&seed=3`；读取 `window.egretGame.status.startup`，并在 3D 画布上单独测 `createWorld3DOverlay(canvas,{width:800,height:420,portrait:{width:380,height:680},fit:'expand',pixelRatio:2})` 初始化。 / Use a fresh context and read startup milestones; separately measure the native overlay creation with those options.
- 旧版绕过 / Previous workaround：并行准备两套引擎主机，不把 UI 初始化延迟移到出阵按钮之后。 / Prepare both hosts in parallel rather than moving the cost into a player action.
- 原建议 / Prior proposal：为 overlay 提供主机初始化、着色器准备、首帧与资源启动子阶段计时；根据测量结果评估管线缓存或异步预热。 / Expose host, shader, first-frame and resource startup timings; investigate caching or async warmup using the evidence.

- 状态 / Status：`overlay.getStartupTiming()`、`game.getStartupTiming()` 在引擎 #528（`0e7b29321a07ec956f66efb293c79798270512bd`）记录宿主准备与首个真实提交；WebGL2 细分上下文、程序准备、单页/多页及其他着色程序阶段。上游 #525 的并行程序准备独立合入，原生 `webgl2PageBatching:'single-page'` 可省去多页程序而不禁用特效、不改变纹理内容。不同管线计时不能简单相加，实际耗时取决于设备与缓存；游戏继续并行准备两个宿主。 / Startup timings expose readiness, first admitted submit, and WebGL2 phases. Upstream #525 independently adds parallel preparation; #528's explicit single-page path omits the multi-page program without disabling effects. Parallel intervals are not isolated compilation times. Both hosts continue preparing concurrently.
- 复跑 / Regression route：`test/native-ui-accept.mjs` 读取首个实际提交，`test/perf-route.mjs` 记录 `overlay.getStartupTiming()`；性能结果见 QUALITY。 / Observe actual first submission and startup phases; see QUALITY for results.

### 9. 托管界面根的响应式树形与键盘注册限制 · Managed root responsive tree shape and keyboard attachment — 已在 0e7b2932 解决 / resolved in 0e7b2932
<!-- engine-note: {"id": "StarBanner#9", "status": "resolved", "topic": "ui-root-responsive-shape-and-attach", "workaround": []} -->

- 原现象 / Previous symptom：`createUiRoot.setTree` 要求稳定树形，而 `KeyboardInput.registerTarget` 要求已附着的目标；在托管 leaf 的异步 prepare 阶段创建并注册控件时，目标尚未挂载。 / Managed-root updates require the same tree shape, and keyboard targets cannot register until attached; preparing controls in a detached leaf cannot register them yet.
- 旧版最小复现 / Previous reproduction：在同一 `createUiRoot` 中把一列内容改成不同数量的叶子；另在 leaf `prepare` 返回前调用 `keyboard.registerTarget({id,target})`。 / Change the number of leaves on the same root, then separately try registering a control before the prepared leaf is published.
- 旧版绕过 / Previous workaround：固定 16 个托管叶子槽，将不使用的槽设为零高度；prepare 原生空容器，提交后再在容器范围内连接原生控件和语义。屏幕根、栈和层管理器仍由引擎持有。 / Keep sixteen stable leaf slots, zero unused heights, prepare an empty scoped container, and connect native controls after attachment. Roots and layers remain engine-managed.
- 原建议 / Prior proposal：支持可控的布局形状变化和已提交后注册钩子，让响应式屏幕减少不必要的视图重建并保留焦点。 / Offer safe responsive shape changes and a post-attachment registration hook preserving focus.

- 状态 / Status：引擎 #528（`0e7b29321a07ec956f66efb293c79798270512bd`）提供 `UiRoot.setTree(tree,{responsive:true})` 和 leaf `onAttach(context)`。游戏按实际布局生成叶子，在已发布内容的作用域中注册控件及语义；屏幕、叠加层、战斗及稳定的焦点标识保持。严格同形规则默认有效，不声称任意树形更新兼容。 / Opt-in responsive trees and post-attachment hooks permit generated leaves with attachment-safe registration. The same managed root, overlay, battle and stable focus identity are kept; strict same-shape updates remain the default.
- 复跑 / Regression route：`node test/native-ui-accept.mjs`，转屏时核对树形、叠加层、根实例与已注册的键盘焦点，继续合法移动和出兵。 / Check actual responsive tree shape and stable focus, then play a legal move and recruit.

### 10. World3D 叠加层没有原生按需绘制模式 · World3D overlay has no native on-demand render mode — 已在 0e7b2932 解决 / resolved in 0e7b2932
<!-- engine-note: {"id": "StarBanner#10", "status": "resolved", "topic": "world3d-overlay-on-demand-render", "workaround": []} -->

- 原现象 / Previous symptom：当前叠加层通过 `createBrowserGame` 建立持续帧循环，未暴露 `play` 的按需渲染选项。独立 SwiftShader 同版本、静止棋盘 A/B/A，桌面叠层运行/暂停/恢复 p95 179.1/91.6/175.0 ms，375×667 模拟手机 129.1/62.6/125.0 ms；暂停段 UI 帧数为零而 World3D 继续更新。此为浏览器 rAF 间隔，不是 GPU 提交独占计时，也不是手机实机数字。 / A same-version software-rendered A/B/A reveals the repeated overlay-loop cost; rAF timing is not an exclusive GPU submission timer nor phone hardware measurement.
- 旧版最小复现 / Previous reproduction：`node vendor/egret.mjs verify --screens=desktop,phone-small --play test/perf-route.mjs --out <fresh-dir>`。在相同场景测 2.5 秒，诊断性调用 `game.loop.stop()`，再 2.5 秒，恢复 `game.loop.start()` 后重测；检查 overlay 与 World3D 计数，不能把停止的 UI 当成正常玩法。 / The route compares a running, diagnostically stopped and restored native overlay on the same scene, checking both frame counters.
- 旧版绕过 / Previous workaround：复用头顶标记和飘字，跳过相同内容的卡片、文字与几何绘制，语义树仅变化时发布。保留正常 overlay 帧循环，不为性能手写一套渲染、转屏、指针和动画调度。 / Pool projected nodes, skip unchanged content and geometry, and publish semantics when dirty. Keep the normal native loop rather than a custom render scheduler.
- 原建议 / Prior proposal：`createWorld3DOverlay` 暴露与 `play` 一致的按需绘制，由原生 visual-revision、纹理就绪、hover/focus、动画与屏幕变更触发；可对 3D 投影标记在每次坐标变化时显式 invalidation。测量软件 A/B 改善同时保持实际触屏、转屏、语义与动态图集正确。 / Expose native on-demand rendering with visual-revision and input/resource/screen invalidation, plus explicit projected-marker updates; verify both performance and functional parity.

- 状态 / Status：引擎 #528（`0e7b29321a07ec956f66efb293c79798270512bd`）让 `createWorld3DOverlay` 使用原生 `renderMode:'on-demand'`。静止 UI 保留已提交帧；时钟、输入、更新与 3D 继续，视觉、资源或舞台变化触发新提交。游戏保留标记池与跳过无效文本更新等普通优化，不需诊断性暂停循环。通过真实提交序号与帧间隔区分静/动态画面，不以停循环或 GPU 独占计时冒充。 / Native on-demand mode retains unchanged UI frames without stopping clocks, input, updates or 3D. Visual/resource/stage changes submit again. Ordinary pooling and unchanged-text optimization remain; measured serials and cadence distinguish redraw from paused loops and exclusive GPU timing.
- 复跑 / Regression route：`node vendor/egret.mjs verify --screens=desktop,phone-small --play test/perf-route.mjs --out <new-dir>`；分别观察原生 host 提交计数、游戏更新与 3D 帧；结果见 QUALITY。 / Observe native Host submits, game updates and World3D frames separately; see QUALITY for measurements.

### 11. 按文件交付的生产 ESM 模块发现瀑布 · Production ESM module-discovery waterfall — 已写入文档 / documented
<!-- engine-note: {"id": "StarBanner#11", "status": "documented", "topic": "browser-module-delivery", "workaround": ["tools/launch-bundle/build.mjs", "src/asset-url.mjs", "index.html"]} -->

- **现象 · Symptom**：同一公开 Egret `0e7b2932` 版本、RTX 5090 Laptop、fresh Edge，标题可操作分别 6777/1234 ms。两次标题前发出 352 请求，包括 329 脚本；298 个静态 ESM 与 29 个后端动态模块造成逐级发现请求。慢样本中最后静态脚本到 3389.9 ms，后端链到 4914.4 ms；原生 WebGL2 着色程序准备 381.4/370.0 ms，入口前主线程 ESM parse/compile 标记并集 5.26/4.30 ms。因此本条是生产交付效率建议，不是 World3D 运行时或着色器故障。 · The same public vendor build varied between 6777 and 1234 ms to actionable title, with 329 script requests. Deep static and dynamic ESM discovery dominates the slow route; native WebGL2 program preparation and main-thread parsing/compilation do not account for those seconds. This is a delivery-tooling observation, not a new renderer bug.
- **最小复现 · Reproduction**：打开 `?seed=3&lang=zh&map=wheat&quality=low` 的公开页，从导航前抓 CDP Network、ResourceTiming 与 User Timing 对齐的 Tracing；实际标题后进入遭遇战并点击出阵。保留浏览器缓存禁用，区分请求开始、首字节、正文传输和引擎原生启动时间。 · Capture browser network, resource timing and trace from before navigation, then play through title/setup/Deploy to the actual battlefield. Disable browser cache and distinguish header wait, transfer and native startup.
- **游戏侧 · Game implementation**：固定开发期 esbuild 0.28.2、从原 `vendor/importmap.json` 和可读源码生成内容 hash 的共享 ESM、启动预加载和 manifest；同一图中保留模块实例，原引擎 vendor 不改。只预加载默认选中的原生后端及标题所需文字，WebGPU 额外 chunk 仅在实际选择时预加载。统一游戏资产 URL 从游戏根解析。 · Use a reproducible, pinned development-only bundle, one shared module graph, predetermined backend/label preloads and a source/output manifest. Vendor/import map and asset URLs remain authoritative; optional backends are not all eagerly fetched.
- **建议 · Proposal**：引擎 vendor/SDK CLI 可以提供可选 production ESM 输出、可追溯 source/import-map manifest、入口/后端 chunk 与 modulepreload 计划；保留 raw 源 debug，验收全程到可交互战场，不把等待后移。 · Offer optional production ESM delivery, source/import-map provenance, backend-aware preload and discovery-depth reports while retaining raw source/debug; validate both startup and first action.
- **状态 · Status**：本作已记录并在游戏层试行生产交付优化；建议未声称由引擎官方 CLI 实现，实测见 QUALITY。 · Documented and exercised as a game-owned delivery optimization. No claim that the official engine CLI yet implements this option; see QUALITY for the measured result.
- **后续游戏层资源调度 · Follow-up game asset scheduling**：在生产 ESM 已落地之后，两次相同 RTX 受控 #281 仍观察正式标题 4591/4542 ms，关键 13 GLB 在 overlay ready 后才启动。后续仅在实际 World3D 画质已确定时提前准备同一批 bytes，原 loader 保留解码、重试及实际消费点；不新增一项引擎故障；16个唯一 URL 上限、精确地址一次消费、取消/失败路径保留。实体 PC 重叠 352.8/357.9ms，Fold7 仅 16.0/10.8ms，不套用 PC 的幅度。结果见 QUALITY。 · Two fresh constrained baselines of the bundled game still fetch 13 title GLBs after overlay readiness. The follow-up overlaps byte requests after actual World3D quality selection without changing decode, retry or scene preparation. A bounded 16-URL admission preserves exact one-time consumption and original cancellation/failure handling. Measured overlap is 352.8/357.9ms on PC and only 16.0/10.8ms on Fold7. This is not a renderer defect. See QUALITY.

### 12. WebKit 的按需画面提交晚一屏 · WebKit retains earlier on-demand frame — 未解决 / open
<!-- engine-note: {"id": "StarBanner#12", "status": "open", "topic": "webkit-retained-screen-presentation", "workaround": ["src/ui/screen-present.mjs"]} -->

- **现象 · What happens**：Windows Playwright WebKit 26.6（iPhone 15 Pro 设备配置），原生叠加层语义树已切换到标题或设置，但可见像素仍是上一界面；15/17 秒及触摸后 3/5 秒成对截图均复现。 · The semantics reflect the next screen but visible pixels retain the preceding screen in this WebKit host.
- **最小复现 · Reproduce**：创建 `createWorld3DOverlay`，`renderMode:'on-demand'`，先绘制加载页，再由异步 managed root 开启标题页；待语义就绪后截取页面，然后实际触摸打开模态页。 · Open an async managed screen over the loading state, capture after semantics are ready, then touch the modal opener and capture again.
- **绕过 · Workaround**：仅在原生屏幕提交时调用 `game.invalidate()`，合并 250 ms 后一次补绘；销毁时取消定时器，无持续渲染。 · Invalidate on screen publication and coalesce one follow-up after 250 ms; cancel on disposal. No continuous rendering.
- **建议 · Proposal**：引擎提供可观测的提交与呈现确认，检查 WebKit 对按需模式和异步图集内容的呈现。 · Add observable submission/presentation confirmation and investigate on-demand presentation after asynchronous atlas changes in WebKit.
- **状态 · Status**：游戏侧补绘通过实际标题与设置截图复测；未在物理 iPhone 验证，尚不能断言根因在引擎或浏览器。 · Game workaround verified by screenshots; physical iPhone and the ultimate engine/browser root cause remain unverified.
