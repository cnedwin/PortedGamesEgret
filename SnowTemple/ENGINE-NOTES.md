# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（最初为提交 `c049bc3`，2026-11-21 升级到 `b5628eb`，2026-11-26 升级到 `8e70dcb3`，2026-11-27 升级到 `e15aabcf`，2026-11-28 刷新至 `a1d6bc6`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (first `c049bc3`, `b5628eb` since 2026-11-21, `8e70dcb3` since 2026-11-26, `e15aabcf` since 2026-11-27, and `a1d6bc6` since 2026-11-28) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. 迟出现的着色器在第一次绘制时链接 · Late programs link on their first draw — 已在 `8b634fe` 解决 / resolved in `8b634fe`
<!-- engine-note: {"id": "SnowTemple#1", "status": "resolved", "topic": "first-draw-program-link", "workaround": ["src/view/view.mjs"]} -->

- 现象 · What happens：淡出的屋顶和松树、法阵、脚印、落枪这些开局后才出现的材质，第一次绘制时链接着色器，打斗中出现停顿。 · Materials that appear after the start (faded roof and pines, the formation, footprints, falling spears) linked their programs on first draw and stalled the fight.
- 游戏里 · In the game：起初在加载画面下把这些网格隐藏着画一帧（`43466ba`、`8e152a4`）；引擎 `8b634fe` 提供 `renderer.preparePrograms` 后，`src/view/view.mjs` 的 `view.preparePrograms` 把它们列成描述符交给引擎（`58554b3`）。 · At first a hidden frame under the loading screen; since engine `8b634fe`, a list of descriptors given to `renderer.preparePrograms`.
- 建议 · Suggestion：描述符要写清雾、阴影、镜像通道等每种变体，容易漏；引擎可以从场景里自动收集。 · Every variant (fog, shadows, the mirror pass) must be named; the engine could gather them from the scene.
- 状态 · Status：原生准备接口已解决，本作已改用。现有 `view.preparePrograms` 以普通弓弦和铜钱网格作为代表，调用 `renderer.preparePrograms(requests, { includeAutoInstancing: true })` 由引擎准备自动实例化伴随程序；保留透明淡出材质、自带实例 RGBA 的足迹、落枪等请求及场景雾、环境、接收阴影标志。分阶段角色模型仍走各自的准备流程。`test/program-warmup.test.mjs` 核查描述符与选项，首帧及首次出现的实际耗时另见 [QUALITY.md](QUALITY.md)。 · The native preparation API is in use. Ordinary bowstring and coin meshes represent automatic batch variants passed with `includeAutoInstancing: true`; translucent fades, authored RGBA instance effects and scene variants remain explicit. Staged character preparation is unchanged. The descriptor test checks the inputs, separate from device first-use timings in QUALITY.md.

### 2. 镜面倒影要来回切换渲染器的色调映射 · The mirror had to switch the renderer's tone mapping back and forth — 已在 `8b634fe` 解决 / resolved in `8b634fe`
<!-- engine-note: {"id": "SnowTemple#2", "status": "resolved", "topic": "mirror-tone-mapping", "workaround": ["src/view/view.mjs"]} -->

- 现象 · What happens：湿石板的平面倒影需要和主画面不同的色调映射，只能在每次镜像绘制前后改渲染器的设置。 · The wet flagstones' planar mirror needed a tone mapping of its own, so the renderer's setting was switched around every mirror draw.
- 游戏里 · In the game：引擎 `8b634fe` 给平面反射通道加了自己的设置，`src/view/view.mjs` 给 `PlanarReflection3D` 单独设色调映射，回到湿石板时立刻刷新一次（`58554b3`）。 · The engine's planar reflection pass now has its own settings; the mirror is given its own tone mapping and refreshed at once on return.
- 建议 · Suggestion：无 · none.
- 状态 · Status：已解决，本作已改用 · resolved and in use.

### 3. 每帧只有八盏点光源 · Eight point lights a frame — 已在 `e5cc13b` 解决 / resolved in `e5cc13b`
<!-- engine-note: {"id": "SnowTemple#3", "status": "resolved", "topic": "point-light-limit"} -->

- 现象 · What happens：庙前和草料场有多盏灯，再加上地上的火和烧着的人，超过八盏点光后多出来的不照亮任何东西。 · With the lamps plus fire on the ground and burning men, lights past the eighth lit nothing.
- 游戏里 · In the game：灯只点亮最近的六盏；火光用引擎 `e5cc13b` 起的分块点光源（`renderer.tiledLights`，最低画质不开），只有被照到的像素付出代价，没有东西烧着时没有开销（`e99e4e4`）。 · The six nearest lamps are lit; fires use the engine's tiled point lights, off at the lowest quality.
- 建议 · Suggestion：分块点光不投影，火光照不出影子；以后可以考虑给少量分块光加阴影。 · Tiled lights cast no shadow; a few shadowed tiled lights would help.
- 状态 · Status：已解决，本作已改用 · resolved and in use.

### 4. Windows ANGLE D3D11 高画质阴影接收导致上下文丢失 · Directional-shadow receivers lose the Windows WebGL2 context — 已在 `bd012daf` 解决 / resolved in `bd012daf`
<!-- engine-note: {"id": "SnowTemple#4", "status": "resolved", "topic": "world3d-directional-shadow-receiver", "workaround": ["src/main.mjs"]} -->

- 现象 · What happens：旧引擎 `c049bc3` 下，Windows RTX 5090 Laptop GPU（ANGLE D3D11）在首次方向光阴影接收绘制时发生 WebGL2 上下文丢失。引擎团队随后在高画质的标准材质场景中复现，并通过仅关闭阴影接收而不是关闭 SSAO 证实触发路径。 · The old engine lost its WebGL2 context on the RTX 5090 Laptop with ANGLE D3D11 during the first directional-shadow receiver. The engine-side high-quality fixture isolated the receiver rather than SSAO.
- 游戏里 · In the game：旧本地验收版本曾识别该显卡／驱动组合并默认禁用阴影。更新引擎后已移除该硬件特例；中、高画质正常开启阴影，`?noshadows` 仅作为同配置的主动对照诊断。 · A former local acceptance build disabled shadows for that exact adapter. The updated Demo removes the hardware exception, keeps normal medium/high shadows and offers an explicit comparison switch only.
- 建议 · Suggestion：保留方向光阴影和 SSAO，不依赖显卡名称绕过故障；修复级联索引、范围和接收路径。 · Fix cascade selection and receiver code while retaining directional shadows and SSAO, without adapter-name exceptions.
- 状态 · Status：引擎 [#375](https://github.com/cnedwin/Egret_rebuild/pull/375) 已在 `bd012daf` 合并，通过四个固定向量分量选择级联及远边界；引擎自身同一硬件复现从一帧后全黑恢复到 120 次回调中 119 次更新、零上下文丢失。该修复已包含在本 Demo 的旧 `b5628eb` 与现 `8e70dcb3` 副本中。以上是引擎用例的结果，不替代本游戏的新版真机验收；游戏实测见 [QUALITY.md](QUALITY.md)。 · Engine #375 (`bd012daf`) uses fixed vector components for cascade selection. Its hardware fixture recovered from a black canvas after one update to 119 updates in 120 callbacks, with no lost contexts. Both the previous `b5628eb` and current `8e70dcb3` copies contain the fix. These are engine fixture results, not a device acceptance claim for the Demo; see [QUALITY.md](QUALITY.md) for game measurements.

### 5. 小数描边宽度导致原生图集文字失败 · Fractional outline width rejects native atlas text — 未解决 / open
<!-- engine-note: {"id": "SnowTemple#5", "status": "open", "topic": "web-text-fractional-stroke", "workaround": ["src/ui/kit.mjs"]} -->

- 现象 · What happens：在浏览器中创建 World3D 原生 2D 叠加层后，`game.createAtlasLabel({ text: '风雪山神庙', fontFamily: 'KaiTi', fontSize: 46, fontWeight: 400, color: 0xe9eef5, strokeWidth: 1.3, strokeColor: 0x0a0f18, locale: 'zh' })` 的文字准备路径报 `TEXT_MEASURE_FAILED`，原因 `WEB_TEXT_STATE_UNSUPPORTED`。首次菜单复跑出现 7 次该错误，启动标题与进度文字不可见。最小 Chromium 实测写入 `ctx.lineWidth=2.6` 读回 `2.5999999046325684`；相同标签仅改 `strokeWidth: 1.5` 通过。 · The native atlas label using a fractional outline width failed with these errors in browser overlay tests. Seven text errors appeared, including missing loading labels. An isolated Chromium probe read back 2.5999999046325684 after writing 2.6; changing only the label outline to 1.5 passed. The Canvas text provider compares the written numeric state with its browser readback exactly.
- 游戏里 · In the game：把描边宽度限制到半像素增量（`Math.round(strokeWidth * 2) / 2`），保持原生文字图集和描边；孤立菜单复测 17/17、零文字错误。 · Quantize the requested stroke width to half-pixel increments so the doubled browser line width is integral. The native label and outline remain in use; the isolated menu rerun passed 17/17 with no text errors.
- 建议 · Suggestion：对合法有限数值按浏览器可表示精度校验，而不是按双精度逐位相等判断；补 0.7、1.3 等合法描边、Canvas/OffscreenCanvas、不同像素比和 Unicode 文字的测试。 · Compare finite numeric browser state within its supported precision, not bit-identically; include fractional outlines, both canvas kinds, varying density and Unicode in regression coverage.
- 状态 · Status：引擎 `e15aabcf` 中未解决，游戏采用受支持的描边精度。 · Open at engine `e15aabcf`; the game uses an admitted outline precision.

### 6. 菜单 ActionControl 越界松手仍激活 · Menu actions activate after releasing outside — 未解决 / open
<!-- engine-note: {"id": "SnowTemple#6", "status": "open", "topic": "action-release-inside-policy", "workaround": ["src/ui/kit.mjs"]} -->

- 现象 · What happens：在真实原生 `createPointerInput`、48×48 hitArea 的 Sprite 上创建 `createActionControl({input, target, onActivate})`，同一触点在 (10,10) 按下，移至 (10,90) 后终止；默认回调计数为 1，而菜单通常要求滑出取消。格挡、踏雪等持续按住动作则需要保留触点追踪，不应全局改变其语义。 · A genuine native pointer session beginning inside a 48×48 control and ending at (10,90) calls onActivate once. Menu taps need a release-inside option; held combat actions still require tracking beyond the boundary.
- 游戏里 · In the game：菜单节点的原生 end 事件在实际目标或裁切框外停止传递给激活动作，原生终止观察者仍释放 press。最小原生测试中 guardedActivations=0、pressed=false；正常 press/release=1，toggle 和 selection 越界不误改。 · A native end listener suppresses only an outward activation, retaining the engine's terminal observer. The guarded reproduction yielded zero activations and no stuck press; an ordinary press/release still activates once.
- 建议 · Suggestion：在 action/toggle/selection 控件中提供可选的 release-inside/tap cancellation policy（兼容原有 owner 终止语义），统一实际裁切区域与允许拖出继续持有的判定。 · Offer optional release-inside / tap cancellation with unchanged default owner delivery. Include clipped controls and independent held contacts in tests.
- 状态 · Status：原生终止追踪正确，菜单激活策略仍需应用端组合。 · Terminal ownership works; menu activation policy is still composed in the game.

### 7. 3D 原生叠加层滚动控件缺少手指拖动内容 · Native 3D overlay scroll control lacks direct content panning — 未解决 / open
<!-- engine-note: {"id": "SnowTemple#7", "status": "open", "topic": "overlay-scroll-content-pan", "workaround": ["src/ui/menus.mjs"]} -->

- 现象 · What happens：World3D overlay 中 `createScrollControl({viewportLength, contentLength, thumb, wheel, onScroll})` 处理滚轮、拖动滚动条和编程滚动；`ui-controls.md` 明确说明尚未处理内容区拖动及与其中按钮的手势仲裁。设置列表有五组选择、十二项改键，旧网页支持直接滑动内容。 · The native overlay scroll API handles a wheel, scrollbar thumb and calls, but its documentation explicitly excludes panning the content itself and arbitration with child presses. The lengthy previous settings list could be panned directly.
- 游戏里 · In the game：使用原生滚动条、滚轮、44 CSS px 以上的翻页控件和键盘焦点自动滚入可视区，滚动中仅完全可见的按钮参与语义操作。不另造 DOM 界面，不宣称支持直接手指滑动。 · Native thumb, wheel, page controls and focus reveal provide access. Only fully visible interactive rows expose active semantics. No DOM replacement and no claim of content swipe support.
- 建议 · Suggestion：把高阶滚动视图的触摸拖动仲裁能力开放到原生叠加层 / ScrollControl，支持在按钮上起手拖动后取消 tap、触点越界继续滚动、转屏或模态关闭时释放。 · Expose content drag arbitration in the overlay/scroll control, including cancellation of taps on drag, out-of-bounds ownership and reset on rotation/modal closure.
- 状态 · Status：文档已明确现有限制；本作的原生替代操作可用，直接内容滑动待引擎支持。 · The limitation is documented by the engine, and native alternatives are available; direct finger pan remains open.

### 8. 按住触点时动态创建模态根拒绝 · Creating a modal root while contacts are held is refused — 未解决 / open
<!-- engine-note: {"id": "SnowTemple#8", "status": "open", "topic": "ui-root-active-contacts-admission", "workaround": ["src/ui/menus.mjs"]} -->

- 现象 · What happens：Galaxy Z Fold7 外屏 873×325，草料场正常移动拾枪谱（游戏时间 27.283 s，事件为 choice + pickup page），摇杆仍被物理触点拥有。Combat 控件禁用会清除角色移动意图，但不终止输入路由中的真实 contact。自动创建的 `createUiRoot({input: overlay.game.pointer, ...})` 报 `UI_INPUT_BUSY`，游戏被错误页覆盖。最小 Node 原生输入复现：建立两个活动接触（移动、格挡），禁用各控件后 router.contacts 仍为 2，创建 root 被拒绝。 · On a real Fold7, collecting a spear-manual page while a finger still owns the stick caused the native modal root to refuse admission. Disabling combat targets clears game intent, not the router session. A native Node reproduction with two held contacts retained both contacts and reproduced UI_INPUT_BUSY when constructing the root.
- 游戏里 · In the game：在已经串行排队的模态创建流程中，等待浏览器原生恢复 suspended 输入，再调用 `pointer.cancelAll('suspended')` 终止仍存的会话，然后创建原生 root。原生专项测试：contact 数 2→0，root commit 正常，旧松手不能激活新控件，新的触点可正常选择；键盘上保留旧玩法的按住状态。 · The queued modal creation awaits native resume if suspended, cancels old sessions with the engine's own API and creates the root. The native regression shows two contacts reduced to zero, successful commit, stale releases unable to activate the new control, and a fresh contact activating normally.
- 建议 · Suggestion：公开明确说明 root 的 contact-free admission 与层管理器取消现有触点的先后要求，或提供一个原子 modal creation/replace API，先由引擎安全取消被遮盖层的接触，再创建、提交并接管输入；不能把接触转交到新按钮。 · Document the ordering between contact-free root admission and modal cancellation, or offer an atomic modal creation/replace helper which terminates the covered input before constructing and committing the new layer; an old contact must never be transferred to a new button.
- 状态 · Status：引擎 `e15aabcf` 的准入约束保留，Demo 原生接口绕过；真机复跑见 QUALITY.md。 · The admission constraint is unchanged in e15aabcf; the game uses the native cancellation API. See QUALITY.md for physical regression.
