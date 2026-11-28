# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（最初为提交 `264e172`，2026-11-21 升级到 `b5628eb`，2026-11-28 升级到 `33897768`，正式接口适配版本 `4f08d2bcd25de3aafa7295f3b349970f8003ed71`，后续更新至 `d2e28f46182a563fd594cc51847240429ab0a5b5`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (first `264e172`, `b5628eb` since 2026-11-21, `33897768` since 2026-11-28, formal API adoption at `4f08d2bcd25de3aafa7295f3b349970f8003ed71`, refreshed to `d2e28f46182a563fd594cc51847240429ab0a5b5`) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. 每帧只有八盏点光源被完整照亮 · Only eight point lights a frame are fully lit — 已在 `e5cc13b` 解决 / resolved in `e5cc13b`
<!-- engine-note: {"id": "FPS#1", "status": "resolved", "topic": "point-light-limit", "workaround": ["src/main.mjs", "src/view.mjs"]} -->

- 现象 · What happens：水电站有十几盏灯，超过八盏后多出来的没有照明效果，哪几盏亮也会随镜头跳变。 · The station has more than a dozen lamps; past eight the extra ones lit nothing, and which ones lit jumped with the camera.
- 游戏里 · In the game：三个画质档均打开 `renderer.tiledLights`，灯光由原生分块照明。仅显式性能对照 `?lights=near` 保留旧距离策略（`src/main.mjs`、`src/view.mjs`）。 · All three quality presets use native tiled lighting; only the explicit `?lights=near` diagnostic retains the historical comparison path.
- 建议 · Suggestion：引擎在 `e5cc13b` 加了按屏幕分块照亮的点光源（第八盏之后最多再 256 盏，需要 `range`，不投影）。 · Engine `e5cc13b` lights point lights past the eighth by screen tile (they need a `range` and cast no shadow).
- 状态 · Status：引擎已解决，本作 2026-11-21 改用（无头 Chromium 中等画质下 `renderer.info.lightsTiled` 为 2，没有控制台错误） · resolved, and in use here since 2026-11-21 (two lamps lit by tile in a headless run at medium quality, clean console).

### 2. 加色混合的材质不设混合模式就画成不透明方块 · Additive materials draw as opaque squares unless set to blend — 已写入文档 / documented
<!-- engine-note: {"id": "FPS#2", "status": "documented", "topic": "additive-material-blend", "workaround": ["src/view.mjs", "src/gun.mjs", "src/scenery.mjs"]} -->

- 现象 · What happens：太阳光晕、枪口火光、瞄具红点只设了 `blending: 'additive'`，画出来是黑底的方块。 · The sun halo, muzzle flash and sight dot, with only `blending: 'additive'`, drew as squares on black.
- 游戏里 · In the game：这些材质一律写 `alphaMode: 'blend'`、`blending: 'additive'`、`depthWrite: false`（`src/view.mjs`、`src/gun.mjs`、`src/scenery.mjs`）。 · All of them set `alphaMode: 'blend'`, `blending: 'additive'` and `depthWrite: false`.
- 建议 · Suggestion：`blending: 'additive'` 而 `alphaMode` 仍是 `opaque` 时，引擎可以给出警告，或默认改用 `blend`。 · The engine could warn about, or default to `blend` for, an additive material left opaque.
- 状态 · Status：引擎 guide 卡片 `world3d-lights-shadows` 已写明这条规则 · the engine's world3d-lights-shadows card states the rule.

### 3. 某一块显卡上接收阴影的着色器丢失 WebGL 上下文 · The shadow-receiving shader loses the WebGL context on one adapter — 已写入文档 / documented
<!-- engine-note: {"id": "FPS#3", "status": "documented", "topic": "shadow-shader-context-loss", "workaround": ["src/main.mjs"]} -->

- 现象 · What happens：RTX 5090 Laptop GPU（0x00002C58）在 Edge 的 ANGLE Direct3D11 下，开启实时阴影后 WebGL 上下文丢失。 · On an RTX 5090 Laptop GPU under ANGLE Direct3D11 in Edge, the WebGL context was lost with live shadows on.
- 游戏里 · In the game：`33897768` 实际 RTX 5090 Edge 中画质首屏和操作已经通过，移除适配器特殊关闭；仍保留显式 `?shadows=0` 诊断开关。 · The real RTX 5090 Edge medium-quality startup and input pass on 33897768; the adapter-specific switch is removed, with an explicit `?shadows=0` diagnostic retained.
- 建议 · Suggestion：查明是哪一段着色器触发的；在引擎里提供按适配器关闭阴影的统一开关，并在上下文丢失时报出是哪条管线。 · Find which shader part causes it; offer an engine-level per-adapter shadow switch and name the pipeline when the context is lost.
- 状态 · Status：原因未查明；guide 卡片 `world3d-lights-shadows` 记录了绕过办法 · cause unknown; the workaround is in the world3d-lights-shadows card.

### 4. 材质变体第一次绘制时链接着色器造成停顿 · The first draw of a material variant stalls while its program links — 部分解决 / partly resolved
<!-- engine-note: {"id": "FPS#4", "status": "partly", "topic": "first-draw-program-link", "workaround": ["src/view.mjs"]} -->

- 现象 · What happens：点击开始后第一次出现普通双面补给箱时，主图和镜面两种材质路径首次链接，出现约 130 ms 的两次停顿。 · When the first ordinary two-sided crate appeared, its main and mirror paths linked for the first time: two stalls of about 130 ms.
- 游戏里 · In the game：先由 `view.prepare` 调用引擎 `renderer.preparePrograms` 收集主图、阴影、镜面、普通补给箱及自动实例化变体，随后保留有界预绘上传纹理/网格，规则不推进。 · `view.prepare` now calls the native API for main, shadow, reflection, ordinary supply and auto-instancing variants; a bounded warm draw remains for GPU resource uploads without advancing the game.
- 建议 · Suggestion：引擎在 `ee94fa5` 加了 `renderer.preparePrograms`，本作副本已包含但还没用：`view.warm` 是按实测的两种路径写的，换成描述符需要在真显卡上重新量停顿，2026-11-21 升级引擎时没有动它；可以把 `view.warm` 换成描述符列表。难以描述的变体（实例化与非实例化、镜面通道）最好由引擎从场景里自动收集。 · Engine `ee94fa5` added `renderer.preparePrograms`, which this copy has but does not use yet; variants that are hard to describe could be collected from the scene by the engine.
- 状态 · Status：已使用原生预编译；仍需完整资源预上传 API，WebGPU 无同等 `preparePrograms` 时保留有界预绘。 · Native compilation preparation is used; an equivalent resource-preparation API is still needed, and WebGPU without the same API retains the bounded draw.

### 5. 引擎没有读取"减少动态效果"的现成办法 · No ready way to read the system's reduced-motion setting — 已在 `1b40619` 解决 / resolved in `1b40619`
<!-- engine-note: {"id": "FPS#5", "status": "resolved", "topic": "reduced-motion-setting", "workaround": ["src/main.mjs", "src/view.mjs"]} -->

- 现象 · What happens：品质验收 A3 不达标：中弹、开火和爆炸时镜头一直在抖，系统打开"减少动态效果"后也一样。 · Quality item A3 failed: the camera shook on hits, shots and blasts even with the system set to reduce motion.
- 游戏里 · In the game：`src/main.mjs` 用 `@egret/engine/web/kit` 的 `prefersReducedMotion()` 读设置、`watchReducedMotion()` 跟随变化；`src/view.mjs` 在 `view.reducedMotion` 为真时不晃镜头，爆炸闪光减弱到三分之一。 · The game reads the setting with `prefersReducedMotion()` and follows changes with `watchReducedMotion()`; with it on, the camera does not shake and blasts flash at a third.
- 建议 · Suggestion：无 · none.
- 状态 · Status：引擎已提供，本作 2026-11-21 起使用 · provided by the engine and used here since 2026-11-21.

### 6. Play3D 不接受现有世界宿主 · Play3D cannot adopt an existing World3D host — 已在 4f08d2bcd25de3aafa7295f3b349970f8003ed71 解决 / resolved in 4f08d2bcd25de3aafa7295f3b349970f8003ed71
<!-- engine-note: {"id": "FPS#6", "status": "resolved", "topic": "play3d-existing-renderer", "workaround": ["src/main.mjs"]} -->

- 现象 · What happens：`play3d` 自建底层 canvas、renderer、默认 scene/camera/light 与画质，不能传已有 renderer、固定像素比和原有单时钟 View。 · `play3d` owns its under-canvas, renderer, defaults and quality, with no option for an existing configured World3D view.
- 最小复现 · Reproduction：给 `play3d` 传已有 canvas、独立 toneMapping、shadow atlas 或 World3D renderer，公开 options 不提供这些参数。 · Existing canvas/renderer and construction-time quality options are not in `Play3DOptions`.
- 历史绕过 · Former workaround：用 `play({ parent, transparent:true, fit:'expand' })` + `createWorld3DView(play.engine, play.scope, ...)`，由同一引擎时钟绘制已有场景。 · Native transparent Play and a native World3D view share the same Engine clock; no independent animation loop.
- 建议 · Suggestion：公开接入现有 World3D scene/camera/renderer 的入口和唯一时钟的宿主模式。 · Offer explicit existing scene/camera/renderer adoption and a shared clock mode.
- 正式接口与验收 · Formal API and acceptance：[引擎 PR #549](https://github.com/cnedwin/Egret_rebuild/pull/549) 提供 `play3dAttached`，借用配置好的渲染器、场景、相机，由 Play 管理单一时钟、附加视图和世代生命周期，不另建默认灯光与渲染器。游戏改为使用该入口，资产失败时仍保留原生重试界面而不附加世界。独立引擎 fixture 的借用对象、重开、失败重试及双后端记录不替代本作验收；本作结果：真实 RTX/WebGL2 与 WebGPU 的原生 title/初段，场景、相机、渲染器身份保持；资源首次 503 时保留纯 UI，重试恢复 36 个模型；Fold7 旋转身份不变。 · PR #549 supplies `play3dAttached` for a borrowed configured renderer, scene and camera, sharing the Play clock and attached-view generation lifecycle without default lights or a new renderer. The game adopts that entry, retaining native Retry without attaching a world on an asset failure. Independent engine fixtures are not consumer acceptance; game result: Actual RTX WebGL2 and WebGPU title/initial-play preserve renderer, scene, and camera identity. A first HTTP 503 leaves native UI-only Retry; retry restores 36 models. Fold7 rotation preserves the session.

### 7. Play 指针锁定没有结果或原始位移选项 · Play pointer-lock has no result or raw movement option — 已在 4f08d2bcd25de3aafa7295f3b349970f8003ed71 解决 / resolved in 4f08d2bcd25de3aafa7295f3b349970f8003ed71
<!-- engine-note: {"id": "FPS#7", "status": "resolved", "topic": "play-pointer-lock-result", "workaround": ["src/input.mjs"]} -->

- 现象 · What happens：`game.pointer.lock()` 同步返回 void，失败被吞掉，不接受 `unadjustedMovement`；`PlayPointer` 不区分鼠标按钮。 · The call returns void, suppresses failure, exposes no raw movement option; PlayPointer has no button bitmask.
- 最小复现 · Reproduction：根据实际用户点击调用 `game.pointer.lock()`，在拒绝、超时和迟到成功时不能直接得到各自结果。 · A real click followed by denial, timeout, or delayed acquisition has no distinct public completion result.
- 历史绕过 · Former workaround：锁定、解锁、相对位移和滚轮均走原生 Play，按钮位掩码和触点走引擎 `browser.pointer.observe`；只保留确认/超时/失锁处理，不再保留整套自写鼠标监听，也不请求原始物理鼠标位移。 · Native lock/deltas/wheel and contact flags, with only a bounded completion/loss adapter; no raw movement claim.
- 建议 · Suggestion：显式 Promise 结果、请求身份与取消、可选原始位移以及按键位掩码。 · Expose a cancellable request result, optional raw deltas and button flags.
- 正式接口与验收 · Formal API and acceptance：PR #549 的 `game.pointer.lock({unadjustedMovement?,signal?})` 提供 `locked/denied/canceled/unavailable` 结果、`lockPending` 和独立 held/pressed/released 位掩码。本作改用原生结果与状态，普通锁定仍是旧档和缺省值；新增可选原始锁定（`mouseMode:'raw'`），拒绝时明确提示玩家选择普通锁定或拖动，不自动回退。真实浏览器请求、两键同时按下与各自释放以及失败恢复仍须按本游戏复测；结果：实际 Edge 普通锁定、原始锁定单次请求、普通模式恢复；拒绝/取消和迟到结果由引擎及游戏单测验证，真实手机不请求 pointer lock。 · PR #549 gives explicit lock outcomes, pending state and independent button masks. The game consumes the native result, keeps ordinary lock as the default for existing saves, and adds opt-in raw lock with explicit refusal guidance rather than silent fallback. Actual browser lock/chord/recovery acceptance for this game: Actual Edge ordinary lock, exactly one raw request, and ordinary-mode restoration passed; engine/game tests cover denial/cancel and late completion; the real handset does not request pointer lock.

### 8. 自有 canvas 的 Play fit 不能自动扩展 · Play fit does not expand a caller-owned canvas — 部分解决 / partly resolved
<!-- engine-note: {"id": "FPS#8", "status": "partly", "topic": "play-owned-canvas-fit", "workaround": ["src/main.mjs"]} -->

- 现象与复现 · What happens and reproduction：真实 1280×800 或 873×325 上 `play({canvas,width:960,height:540,fit:'expand'})` 保持固定 960×540 舞台，CSS 填满会非等比拉伸；同条件改 `parent` 让引擎创建 canvas 后等比扩展正常。 · A caller canvas with `fit:'expand'` retains the fixed 960×540 stage and a full-width CSS canvas stretches; native `parent` sizing works.
- 游戏里 · In the game：用原生 parent 模式、`game.safe` 与 `browser.screen`，不写另一个适配公式。 · Native parent, safe rectangle and screen plan; no second fit implementation.
- 建议 · Suggestion：可选的现成 canvas 自适应模式（给定 fitTo）、明确说明现有行为。 · Allow an explicit fitTo for a caller-owned canvas; clarify the existing behavior.

### 9. Play 数据视图的连续设置与触控按钮 · Continuous settings and responsive touch buttons — 部分解决 / partly resolved
<!-- engine-note: {"id": "FPS#9", "status": "partly", "topic": "play-responsive-hold-controls", "workaround": ["src/ui/menus.mjs", "src/ui/touch.mjs"]} -->

- 现象 · What happens：数据 view 没有滑杆部件；`touchButton` 只在创建时存坐标，没有动态 reposition、启用和独立语义接口。 · Data views lack a slider part; touchButton stores its hit centre when created and has no public reposition/enable/semantic state API.
- 游戏里 · In the game：设置用具名原生步进按钮保持同数值范围，触屏用 native Play floating stick 及 `createActionControl`/语义树的响应式按钮，按住、取消、触点归属走引擎。 · Named native steppers keep ranges; native floating stick and action controls with semantic bounds own the individual contacts.
- 建议 · Suggestion：原生可布局 range/hold/touch controls（支持动态 hit region 与语义描述）。 · Add native data range/hold controls and dynamic touch-button bounds and semantics.

### 10. 引擎笔记工具不能识别 CRLF 标题 · Engine notes CLI misses CRLF headings — 尚未解决 / open
<!-- engine-note: {"id": "FPS#10", "status": "open", "topic": "notes-parser-crlf", "workaround": ["ENGINE-NOTES.md"]} -->

- 现象与复现 · What happens and reproduction：Windows Checkout 的 5 个合法 CRLF `### <n>.` 标题和 5 个元数据 header，`node FPS/vendor/egret.mjs notes FPS --check` 返回 0 notes，exit 0；同内容内存转 LF 为 5 notes/5 header。 · Five valid CRLF notes are silently counted as zero, whereas the LF copy parses five.
- 游戏里 · In the game：.gitattributes 将本文件与工具生成的 guide 文本保留为 LF；不修改 vendor 文件，也不把该 exit 0 当作旧笔记问题已修。旧版 Windows 签出还复现了 guide front matter 解析中断。 · Preserve generated guide text and this file as LF at checkout via .gitattributes, without editing vendor files or treating the CLI parser as fixed. The old Windows checkout also reproduced a guide front-matter parse failure.
- 建议 · Suggestion：按 `/\\r?\\n/` 分行并补 Windows CRLF 测试。 · Split CRLF/LF equivalently and test both.

### 11. 浏览器指针锁定时原生 contact 尝试非法 capture · Native contact attempts prohibited capture during pointer lock — 已在 4f08d2bcd25de3aafa7295f3b349970f8003ed71 解决 / resolved in 4f08d2bcd25de3aafa7295f3b349970f8003ed71
<!-- engine-note: {"id": "FPS#11", "status": "resolved", "topic": "pointer-lock-native-capture", "workaround": ["src/input.mjs", "test/input.test.mjs"]} -->

- 现象与最小复现 · What happens and reproduction：在 `33897768` 的 Windows Edge/RTX 硬件浏览器，用原生 Play 按钮调用 `game.pointer.lock()` 成功后按真实右键，`BrowserPointerInput.js` 的 `acquireNative` 调用 `setPointerCapture` 抛 `InvalidStateError: Failed to execute 'setPointerCapture' on 'Element'`，游戏进入错误页。独立透明 Play 画布即可复现，不依赖 3D 场景。 · Click a native button calling `game.pointer.lock()`, wait for `locked`, then press the real secondary button. Native `acquireNative` calls the forbidden browser capture and throws.
- 历史绕过 · Former workaround：只在已经锁定的桌面鼠标期间暂停原生 contact router，桥接浏览器 `buttons` 位掩码；原生 Play 相对位移、滚轮与键盘不变，解锁时恢复 router。未锁定的触屏和普通指针照常原生路由。 · Suspend the contact router only for confirmed pointer lock, bridge button flags, and restore it on release. Relative movement, wheel, keyboard and normal touch remain native.
- 建议与验收 · Suggestion and acceptance：已锁定 mouse surface 不执行 native `setPointerCapture`，仍保留逻辑 contact 和全局 move/up/cancel，触屏及非锁定鼠标不改变；实际右键、同时两键、释放一键、解锁再进入均无错，取消后按键状态归零。 · Skip only illegal native capture on locked mouse, retain logical contacts/global terminals, and verify real primary/secondary chord, release order, unlock/re-enter, and ordinary mobile capture.
- 正式接口与验收 · Formal API and acceptance：PR #549 已将锁定鼠标的逻辑 contact、多键状态、锁变化与取消清理放入引擎；本作适配不再保留暂停原生 router 和桥接鼠标事件的绕过实现。真实 PC、手机控件的输入及失焦回归结果：实际 Edge 已验证右键、双键合持、独立松手、失锁与暂停，并由原生位掩码 2→3→2→0 确认，无非法 capture 错误。 · The engine now owns logical locked contacts, button flags and transition/cancellation cleanup. The game adaptation removes suspension of its native contact router and the parallel mouse-event bridge. Consumer physical input/focus findings: Actual Edge button chord, separate releases, lock loss and pause passed with native masks 2→3→2→0, without illegal pointer capture.

### 12. 嵌入式 Play 无法接收场景专用 Tab 快捷键 · Embedded Play reserves Tab even during captured gameplay — 已在 4f08d2bcd25de3aafa7295f3b349970f8003ed71 解决 / resolved in 4f08d2bcd25de3aafa7295f3b349970f8003ed71
<!-- engine-note: {"id": "FPS#12", "status": "resolved", "topic": "embedded-play-gameplay-tab", "workaround": ["src/input.mjs", "test/input.test.mjs"]} -->

- 现象与最小复现 · What happens and reproduction：在 `play({parent})` 中通过真实点击锁定鼠标后，在实战从 `game.keys.pressed('Tab')` 读取背包快捷键；实测浏览器把 Tab 用作页面焦点导航，失锁进入暂停，背包未打开。`BrowserPlay.keyDown` 对 embedded Tab 在 NativeKeys 写入前直接返回。 · After locking the pointer from an embedded Play button, `game.keys.pressed('Tab')` stays unset; the actual browser focus changes, releases lock and pauses instead of opening inventory.
- 历史绕过 · Former workaround：只在实战输入启用时拦截 Tab，调用同一背包动作，一次按压只处理一次；界面内 Tab 和无障碍导航仍走引擎。不另写键盘系统。 · Scope a single inventory shortcut to live gameplay, ignoring repeats; normal menu and accessibility Tab remain native.
- 建议与验收 · Suggestion and acceptance：提供可按游戏模式注册、取消的原生独占快捷键；实战 Tab 能打开背包，界面内 Tab 仍循环有效控件，取消监听后网页 Tab 正常。 · Provide a scoped opt-in shortcut capture: gameplay Tab opens the inventory, modal Tab navigates controls, and releasing the scope restores browser Tab.
- 正式接口与验收 · Formal API and acceptance：PR #549 提供 `game.keys.claim('Tab', when)`，实战输入启用时才申请该快捷键；菜单、背包的原生焦点和关闭后的普通页面导航不另写窗口级键盘拦截。消费端实测：实际 Edge 实战 Tab 打开背包，弹窗 Tab 导航，关闭后重新锁定；引擎独立实际浏览器用例验证 claim 失效后网页 Tab 恢复。 · The native claim is active only during gameplay input, preserving native menu/inventory focus and ordinary browser Tab after release. The consumer no longer installs a separate window-level Tab interceptor. Actual game evidence: Actual Edge gameplay Tab opens inventory, modal Tab navigates, and close reacquires lock; the independent browser fixture proves page Tab returns when the claim is inactive.
### 13. 原生滚动控件的检查未考虑裁切 · Screen verification ignores clipped scrolling controls — 已在 4f08d2bcd25de3aafa7295f3b349970f8003ed71 解决 / resolved in 4f08d2bcd25de3aafa7295f3b349970f8003ed71
<!-- engine-note: {"id": "FPS#13", "status": "resolved", "topic": "verify-scroll-clipped-controls", "workaround": ["src/ui/menus.mjs", "test/screen-route.mjs"]} -->

- 现象与最小复现 · What happens and reproduction：`play({fit:'expand'})` 中 `game.show` 的 `scroll:'vertical'` 面板含若干 48×48 的按钮，最后一些在面板剪裁区下方；实际可以滚动访问，`verify --screens` 仍检查未剪裁的 authored bounds。初版设置 9/9 profile 报 `inSafeArea`；873×325 画面中 FOV 按钮尚未滚入，检查却给出 y=406；在 1920×1080 也将未滚出的全屏按钮 y=1097 记为错误。 · A vertical scrolling data view with buttons below its clipped viewport is reported out of the safe area even though the UI actually clips and can scroll them into view. All nine profiles flagged settings; e.g. y=406 on 873×325, y=1097 on 1920×1080.
- 游戏里 · In the game：分类设置降低窄屏的滚动和搜索负担；保留原生滚动用于只读长文字、物品和结算内容。 · Use real categorized settings rather than filtering the verifier; retain native scrolling for long read-only content, items and debrief.
- 建议与验收 · Suggestion and acceptance：语义和 verify 的检测应分辨布局框、可见裁切后的矩形、滚动可达但未显示的控件；当前 48 px 按钮在滚入后通过，真正露在危险区域的按钮仍报错，测试滚动前后及部分裁切的按钮。 · Distinguish authored bounds, the clipped visible intersection, and scroll-reachable offscreen controls; a newly revealed 48 px target passes, genuinely unsafe visible controls still fail; test before/after scroll and partial clips.
- 正式接口与验收 · Formal API and acceptance：PR #549 以真实祖先 clip 限制露出框，完全裁掉的控件不报告，部分露出框用于安全区和重叠、原始控件尺寸用于固有触控尺寸。保留分类设置作为更容易操作的设计，而非规避检查。引擎独立 Browser/Node 验证通过；本游戏正式九机型路线：正式九种尺寸、每种十状态全通过，原生裁切回执新鲜；引擎独立真实浏览器测试确认绘制前/后的可见裁切几何。 · The native collector now uses actual ancestor clipping, omits fully clipped targets and separates exposed safety/overlap geometry from authored target size. Preference categories remain a usability improvement, not a verifier workaround. Consumer nine-profile route: All 90 final screen checkpoints pass with fresh native receipts; the independent real-browser engine fixture covers visible clipped geometry before/after scroll.
### 14. 多屏检查遗漏低层原生触屏控件 · Screen verifier omits lower-level native action controls — 已在 4f08d2bcd25de3aafa7295f3b349970f8003ed71 解决 / resolved in 4f08d2bcd25de3aafa7295f3b349970f8003ed71
<!-- engine-note: {"id": "FPS#14", "status": "resolved", "topic": "verify-native-action-controls", "workaround": ["src/ui/touch.mjs", "test/screen-route.mjs"]} -->

- 现象与最小复现 · What happens and reproduction：`play` 数据 HUD 与 `createActionControl` 直接挂在舞台的 11 个原生按钮/开关同时存在且有具名语义，`verify --screens` 的实战 checkpoint 却报告 `shown 1, 0 controls`。393×852 画面中状态卡盖住了右侧操作键，而工具没有报错。 · A Play data HUD and eleven named native action/switch controls attached directly to the stage coexist; the verifier reports `shown 1, 0 controls` in active play and misses an actual portrait status-card overlap.
- 游戏里 · In the game：根据实际截图修正竖屏布局；通过同一原生语义树独立测量动作控件、触控尺寸、安全区和主要 HUD 卡片遮挡，截图仍人工核对。 · Fix the actual portrait layout and independently measure native semantic rectangles, targets, safe area and HUD occlusion; continue visual review.
- 建议与验收 · Suggestion and acceptance：verify 集合包含同一舞台的原生低层语义控件并提供其实际可见框，标出非交互 HUD 遮挡；一个直接创建的 43 px 按钮、小于安全区的落点与覆盖其可点范围的可见卡片应产生相应告警；正常 48 px 控件不误报。 · Include direct native semantic controls and their actual visible boxes, and report visible HUD occlusion; a 43 px target or unsafe/covered direct control should be detected while healthy 48 px controls pass.
- 正式接口与验收 · Formal API and acceptance：PR #549 的共享采集器包含直接安装的原生控件、当前语义命名、真实显示祖先关系及实际 pick 阻挡；游戏用 `registerScreenOccluder` 声明实际绘制的 HUD 面板，响应视图重建和销毁，原生检查产生有证据的 `occluded` 建议告警，不把透明容器或所有语义组的聚合矩形当作不透明像素。实际语义名称、控件数、安全区、HUD 覆盖及所有截图仍需游戏路线复测；结果：正式九屏每个触控实战状态 11 个原生具名控件、独立语义区域及实际截图均通过，0 错误/0 告警；透明和几何遮挡边界不等同像素级检测。 · The shared collector includes direct native controls, current semantic names, true ancestry and actual pick interference. Explicit painted HUD faces are registered with `registerScreenOccluder` and retired with the view. Coverage is an advisory geometric observation, not inferred opacity of a transparent container or arbitrary group. Consumer results and visual inspection: Each final touch gameplay checkpoint sees 11 named native targets; independent semantic rectangles and actual screenshot review passed, zero errors/warnings. Declared coverage is not pixel opacity.

### 15. 通用浏览器验收过早采样 · Generic browser verification samples before readiness — 已在 d2e28f46182a563fd594cc51847240429ab0a5b5 解决 / resolved in d2e28f46182a563fd594cc51847240429ab0a5b5
<!-- engine-note: {"id":"FPS#15","status":"resolved","topic":"verify-startup-ready","workaround":["test/verify-route.mjs","test/accept.mjs"]} -->

- 现象与复现 · What happens and reproduction：在 Windows Edge WebGL2 冷启动，旧版 33897768 与正式版 4f08d2bc 的通用 verify 都在固定导航后 2.5 秒取第一张图，随后 1 秒计数。实测双方都是 1 色、1 idle frame，后续正常画面及动画、响应、声音均正常且零运行错误。加载资源完成后再进行原生按名称的游玩路线，标题、移动和暂停三个检查点通过。 · The bare verifier samples a fixed 2.5 s after navigation and then counts idle frames for 1 s. Both the old and formal hardware-browser runs returned one color and one idle frame while art was loading; later frames, input, sound, and no errors were normal. The readiness-aware named route reaches the complete title, movement and pause checkpoints.
- 本作现在 · In the game：引擎 [PR #555](https://github.com/cnedwin/Egret_rebuild/pull/555) 已进入 main，正式复制的工具直接提供有界启动等待，记录 `startupReady` 的状态、等待原因和耗时；普通路线根据已观察到的可见画布、非空画面和持续动画回调判断，不需要新增游戏专用接口。超时不操作游戏。保留具名路线（`test/verify-route.mjs`、`test/accept.mjs`）进行功能验收，并保留历史验收失败记录。 · The merged engine PR #555 provides bounded readiness in the officially vendored tool, with `startupReady` status, reason and elapsed time. The ordinary route uses observed visible canvas, nonblank picture and advancing callbacks, so no game-specific readiness interface is required. It sends no input on timeout. Keep the named functional routes and historical failed receipts.
- 状态 · Status：已在 d2e28f46182a563fd594cc51847240429ab0a5b5 解决。合并前正式候选运行时（`7800686b`）在独立本作副本的真实 RTX 上确认完整标题后通过 8 项检查；SwiftShader 虽显示完整标题但回调速率低于门槛时仍应报告等待帧循环超时，不属于提前黑图缺陷。当前正式主干副本的本作复跑见 [QUALITY.md](QUALITY.md)。 · Resolved in d2e28f46182a563fd594cc51847240429ab0a5b5. Before merge, the officially generated candidate runtime (`7800686b`) passed all eight ordinary checks in an isolated copy of this game on physical RTX hardware after reaching the complete title. SwiftShader may still time out waiting for the callback threshold even when the title is already visible; that is not the premature-black-image fault. Current main consumer reruns are in QUALITY.md.
