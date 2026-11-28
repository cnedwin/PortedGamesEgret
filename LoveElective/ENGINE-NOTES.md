# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（最初为提交 `b6a392a`，2026-11-21 升级到 `b5628eb`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (first `b6a392a`, `b5628eb` since 2026-11-21) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

本轮引擎集成：主干 `94bd70fb26b1f81794c9c6fbbb258c655fcd19df`（#502–#506），按需采用原生能力；下列原先的版本号保留作为问题发生时的历史。

This integration vendors official main `94bd70fb26b1f81794c9c6fbbb258c655fcd19df` (#502–#506), adopting native capabilities where equivalent; older revisions below are historical evidence.

### 1. 引擎时钟拒绝一次推进太长的时间 · The engine clock refuses a long step — 已在 `6805db7` 解决 / resolved in `6805db7`
<!-- engine-note: {"id": "LoveElective#1", "status": "resolved", "topic": "clock-long-step", "workaround": ["src/engine/stage.mjs"]} -->

- 现象 · What happens：一帧画得慢或标签页被隐藏后回来，把整段时间交给 `engine.advanceTime`，时钟以 `CLOCK_DELTA_LIMIT` 拒绝。 · After a slow frame or a hidden tab, handing the whole gap to `engine.advanceTime` was refused with `CLOCK_DELTA_LIMIT`.
- 游戏里 · In the game：起初 `src/engine/stage.mjs` 自己把落后的时间截到 0.5 秒、拆成几步推进；2026-11-21 起改用引擎的 `createBrowserFrameLoop`（`maxStepSeconds` 为时钟上限的九成，`catchUpSeconds: 0.5`），做法相同。 · First the game capped and split the gap itself; since 2026-11-21 the engine's `createBrowserFrameLoop` does it with the same numbers.
- 建议 · Suggestion：时钟可以提供"超过上限就截断"的选项，而不是只能抛错。 · The clock could offer to clamp instead of only refusing.
- 状态 · Status：已改用引擎的循环 · now uses the engine's loop.

### 2. 共享宿主只能积压很少几帧 · A shared host holds only a few unfinished frames — 已在 `6805db7` 解决 / resolved in `6805db7`
<!-- engine-note: {"id": "LoveElective#2", "status": "resolved", "topic": "shared-host-pending-frames"} -->

- 现象 · What happens：每个 `requestAnimationFrame` 都调用 `renderSharedFrame`，宿主来不及完成时提交失败，原因以 `_BACKPRESSURE` 结尾。 · Calling `renderSharedFrame` on every animation frame fails, with a cause ending in `_BACKPRESSURE`, when the host has not caught up.
- 游戏里 · In the game：起初每帧先看 `host.getStatus()`，`pendingFrames` 为 0 才提交；2026-11-21 起由 `createBrowserFrameLoop`（`maxPendingFrames: 1`）在宿主忙时跳过这一帧，失败交给 `onError` 显示。 · First the game checked `pendingFrames` itself; now `createBrowserFrameLoop` skips a frame while the host is busy and reports a failure through `onError`.
- 建议 · Suggestion：手写 2D 共享宿主的游戏改用引擎的 `createBrowserFrameLoop`，不再各自写这段。 · Games with a hand-made 2D shared host should use the engine's `createBrowserFrameLoop`.
- 状态 · Status：已改用引擎的循环 · now uses the engine's loop.

### 3. 原生视图的激活坐标与冒泡 · Native view activation coordinates and bubbling — 已解决 / resolved (#499)
<!-- engine-note: {"id": "LoveElective#3", "status": "resolved", "topic": "native-ui-activation-source"} -->

- 现象：换装任意色带的色相/明暗依赖实际局部 x/y；`game.show` 的 tap 绑定不传此次指针位置。另在弹窗绑定透明外部和空白区域时，点「保存进度」也触发外层关闭，实际浏览器复现。· Free dye uses local coordinates; a declarative tap has no coordinate argument. A save button also bubbled into an outside-dismiss surface in an actual browser.
- 已移除的绕过办法：删除临时指针坐标和超时猜测，通过 native tap activation 的 source、localX/localY、stageX/stageY 与 stopPropagation；空白面保留边界检查。 · Removed the cached-pointer and timeout shim; uses the native activation coordinates and propagation control with a boundary guard for blank surfaces.
- 建议：tap 可选事件参数包含 input source、local x/y、target/currentTarget 与停止冒泡能力；支持仅指针的禁用绑定和动态可访问名称。· Add optional activation source, local position, target and propagation control; declarative disabled pointer targets and dynamic accessible names would help.
- 状态：#499 支持原生激活来源、局部坐标及传播，普通按钮和可操作 panel 的名称、角色、禁用状态也由引擎负责。分段按钮的选中状态直接写入原生可访问名称；不再使用不支持的 selected 字段；运行时插画挂载另外见第 5 条。 · Native activation, role, name and disabled state are used. Selected segmented buttons announce their state using the native label; no bridge or invalid selected field; generated-artwork mount slots remain item 5.

### 4. 原生短文字的字体控制和就绪 · Native short-label typography and readiness — 部分解决 / partly resolved (#499)
<!-- engine-note: {"id": "LoveElective#4", "status": "partly", "topic": "native-ui-font-style", "workaround": ["src/engine/ui.mjs", "src/screens/story.mjs"]} -->

- 现象：普通原生 text/button 使用字体图集；`PlayTextOptions` 只支持 size、color、bold、align 等，不提供字体系列、字体粗细和斜体；长文本可用可选 paragraph SDK（额外字体/提供器）。· Native atlas labels lack font-family, exact weight and italic controls; rich paragraphs are opt-in.
- 绕过办法：使用现有测量算法兼容换行，全部可见文字和逐字对白由原生文字渲染；保留原配色与字号。· Keep the original wrapping measurement and use native labels and native clipped dialogue text.
- 建议：轻量原生标签支持 fontFamilies、fontWeight、italic 和文字准备完成的公开信号，以便 UI 风格和 VN 可读性测试。· Native text style and an explicit ready signal would help lightweight UI and VN acceptance.
- 状态：#499 已提供单行 fontFamily/fontWeight/italic 与 textReady；游戏原有换行量测及逐行裁剪的打字机仍需保留，未为了新接口改变美术版式。· Native single-line font styling and textReady are now available; the game retains its measured line wrapping and clipped dialogue reveal to preserve authored layout.

### 5. 运行时生成插画的视图挂载点 · Native view mount slots for generated artwork — 未解决 / open
<!-- engine-note: {"id": "LoveElective#5", "status": "open", "topic": "native-ui-artwork-slot", "workaround": ["src/engine/ui.mjs"]} -->

- 现象：动态服饰、染色、头像与装饰需要从运行时 Canvas 生成纹理，而声明式 image 接收静态 src。· Procedural outfit, dye, portrait and decoration textures do not have a static image URL.
- 绕过办法：原有纹理租约/插画容器随原生 view 更新和动画，所有交互和文字在原生视图中；不另启引擎，不重复实现命中和焦点。· Reuse texture leases and illustration containers, mount them under the native view; all interaction and text are native.
- 建议：声明式视图支持指定父容器、一个持有已有引擎显示对象或纹理的 slot/image 输入，生命周期、布局和层级由 view 统一管理。· A public slot for an existing display object or generated texture would preserve native view lifetime and layout.
- 状态：游戏侧挂载适配已记录；引擎只读。· Game-side integration recorded; engine is unchanged.

### 6. 高阶原生 View 的悬停皮肤 · Declarative hover styling — 未解决 / open
<!-- engine-note: {"id": "LoveElective#6", "status": "open", "topic": "native-ui-hover-style", "workaround": ["src/engine/ui.mjs"]} -->

- 现象：原生 View 自带点击和焦点，但没有统一声明式 hover 样式。· Native views handle actions and focus but have no declarative hover skin.
- 绕过办法：同一引擎宿主利用 `createBrowserHoverInput` + `createHoverControl` 对实际原生目标添加轻微高亮、鼠标指针，关闭视图时释放；PC 实测进入/离开及点击正常。· Use the native hover authority on actual view nodes, with cleanup; physical PC enter/leave and single click verified.
- 建议：在原生 UI skin 中可选 hover/pressed 反馈或状态回调，保持触屏不触发鼠标悬停。· Add optional hover/pressed styles or callbacks for declarative views, without causing mouse hover on touch.
- 状态：游戏侧已经交付兼容方案。· Game-side native integration is verified.

### 7. 软件 WebGL2 单密度文字与奇数高度 · Native label alignment at low-density software WebGL2 — 已解决 / resolved (#499)
<!-- engine-note: {"id": "LoveElective#7", "status": "resolved", "topic": "native-ui-low-density-text"} -->

- 现象：在同一个 f0dfde36 引擎、无头 Chromium SwiftShader WebGL2、640×360 CSS/逻辑、pixelRatio=1 的独立原生 `game.show` 中，`size:16,height:23` 的两行英文出现横向断笔；同文字 `height:24` 完整，`size:14,height:20` 基本正常。此时 atlasPending=0、refusals=0、console errors=0。· Isolated native view (no game or painter), odd-height 23 labels at font size 16 exhibit broken strokes at ratio 1; height 24 is clear, and the atlas queue is empty.
- 绕过办法：既有 `?ratio=2`（同 CSS 尺寸 2 倍 backing）在该独立复现与实际游戏中均清晰；软件截图基线使用 ratio=2。PC RTX 5090 与 Fold7 Adreno 830 的实际默认模式清晰，未全局提高真机像素密度。· Ratio 2 removes the artifact in both isolated and game software captures. Real default hardware shots are clear; no device-wide density change.
- 建议：检查原生文本文字基线和 display transform 的半像素对齐。最小验收为同一 screen 的 16px、height 23/24 两条 text 在 ratio 1 均完整，ratio 2 无回归，原有绑定和布局保持。当前未定位具体 shader/atlas 原因。· Investigate alignment; require both odd/even layout heights to be clear at ratio 1 without affecting ratio 2 or layout.
- 状态：#499 修正单行文字基线。相同 640×360 SwiftShader 最小例，ratio=1 的奇数高度 23、偶数 24 标签均清晰，ratio=2 无回归；14 标签就绪、零拒绝、零报错。历史 ratio=2 图像基线保留用于前后比较，不需要为真机提高 DPR。· The original minimal software WebGL2 fixture now renders odd and even heights clearly at ratio 1 and 2, 14 ready labels with no refusals or errors. The historical ratio-2 screenshot baseline remains solely for comparability.

### 8. WebKit 的原生控件文字 · Native control labels on WebKit — 已解决 / resolved
<!-- engine-note: {"id":"LoveElective#8","status":"resolved","topic":"webkit-canvas-text-state"} -->

- **现象 · What happens**：Windows WebKit 的标题美术出现但原生按钮没有字；最小 Canvas2D 中文绘制能成功。此宿主欠缺若干可选的排版状态（如 fontStretch、textRendering），引擎文字提供器原先拒绝。 · Title art rendered without native button captions even though a plain Canvas2D Chinese drawing succeeded. The previous text provider rejected some optional typography states absent on this host.
- **绕过办法 · Workaround**：保持单一白鹭 UI 宿主，直接更新生成的副本；不新增 DOM 文本。 · Retain a single Egret UI host and refresh the generated engine copy rather than adding DOM labels.
- **建议 · Suggestion**：把宿主未实现的可选默认文字状态和真实配置错误区分开。 · Distinguish unsupported optional default text state from actual invalid settings.
- **状态 · Status**：引擎 82561d63；Windows WebKit 复测标题文字及进入序章对白可读。未测物理 iPhone。 · Title captions and the prologue are readable on Windows WebKit; physical iPhone is untested.
