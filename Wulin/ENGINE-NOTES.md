# 引擎笔记 · Engine notes

引擎副本：`39560b3ef608e4dda68c8461f435c279d1eba3d2`。本作原生迁移不修改引擎副本。
Engine copy: `39560b3ef608e4dda68c8461f435c279d1eba3d2`. No local engine patch.

### 1. 长名册与弹窗的段落缓存上限 · Paragraph capacity in rosters and dialogs — 部分解决 / partly
<!-- engine-note: {"id":"Wulin#1","status":"partly","topic":"paragraph-cache-budget","workaround":["src/ui/native-kit.mjs","src/ui/native-pages.mjs","src/ui/native-sheets.mjs"]} -->

- 现象 · Observation：在弟子名册打开人物单，实际 Chromium 验收出现 `PARAGRAPH_CACHE_BUDGET`。缓存的条目数及并发作业数硬上限均为 32；纵向滚动视图仍会实体化视口外的富文本。 · Chromium reported the cache budget error when opening a person sheet above the roster. Both the entries and pending jobs are capped at 32; a scroll view materializes rich labels outside its viewport.
- 最小复现 · Reproduction：创建带 20 个段落的原生滚动视图，再打开带 20 个不同段落的模态；使用 Canvas paragraph provider，不需 Wasm。 · Show a native scrolling view with 20 distinct paragraphs, then a modal with 20 different paragraphs, using the Canvas paragraph provider.
- 游戏里的处理 · Workaround：长名册、编年、武学、季报按原生键控分页；每个描述保留不超过 14 个富文本段落，为模态与选择保留预算。其余仍是引擎文字与滚动，并没有另绘 Canvas。 · Keyed pages limit rich paragraphs to 14 per view, leaving capacity for dialogs and pickers; the remaining content is native text and native scrolling.
- 建议 · Proposal：为原生视图的富文本提供视口感知的延迟实体化、复用与预算/排队诊断；支持可配置的大型经营界面缓存额度。 · Add viewport-aware paragraph realization, reuse, budget and queue diagnostics, and a configurable capacity for management UIs.

### 2. 多屏验收与滚动裁切边界 · Screen verification and clipped controls — 已解决 / resolved
<!-- engine-note: {"id":"Wulin#2","status":"resolved","topic":"screen-verification-scroll-clipping"} -->

- 现象 · Observation：`verify --screens --play test/screen-verify.mjs` 的九种尺寸均可完成路线，但报告的 `inSafeArea` / `apart` 把滚动视口以外的指南分页、门派列表及设置选项也计入，包括实际被裁切掉的按钮。截图与真实可见语义框必须独立核对。 · All nine routes complete but the verifier also counts raw rectangles of scroll-clipped controls, including the guide pagination, sect list and scenario choices. Compare screenshots and the native visible semantic bounds independently.
- 最小复现 · Reproduction：在安全区内放置一只纵向滚动面板，内容超过窗口，下方固定两个按钮；验收未滚动与末尾位置。 · Place a scroll panel inside the safe area with content longer than its viewport and two fixed footer buttons; verify both its first and last scroll positions.
- 状态 · Status：引擎 #549 的共享控件报告器及 #552 的精确变换裁切已合入主干。只使用正式 `verify --screens`；不再需要绕过裁切报告，仍保留实际滚动及下层控件遮挡回归。 · Resolved by engine #549 and #552. Use the official verifier without a clipping workaround; retain real scrolling and overlap regressions.
- 建议 · Proposal：以裁切后的可操作矩形及有效可见性作安全区/相交检查，同时单独报告部分露出的控件。 · Use effective visibility and clipped actionable bounds for safe-area and overlap checks, reporting partially visible rows separately.

### 3. 声音混音与定位 · Audio mixing and localization — 未解决 / open
<!-- engine-note: {"id":"Wulin#3","status":"open","topic":"audio-custom-source-ducking-spatial-filter","workaround":["src/ui/soundtrack.mjs","src/ui/feedback-audio.mjs","src/ui/world-audio.mjs","src/ui/spatial-audio.mjs","src/ui/voice.mjs"]} -->

- 现象 · Observation：正式混音器支持总线、解码声音、循环与淡入淡出；现有合成音频、系统语音、旁白侧链压低、按镜头缩放与视点控制的距离低通仍需要外部源接入。World3D HRTF 监听器与本作俯视声场并不等价。 · Native buses, decoded voices, loops and fades are available; external synthesized graphs or speech, sidechain ducking, and focus/zoom-dependent distance lowpass are not equivalent to World3D HRTF.
- 游戏里的处理 · Workaround：保留现有录音、四路设置、合成声音和定位混音；原有音频单测照常通过。没有声称已经完成混音器替换或音箱盲听。 · Retain the existing four controls, recorded and synthesized cues and calibrated spatial mix. Existing audio tests pass; no mixer migration or speaker listening claim.
- 建议 · Proposal：提供外部音源/PCM 总线入口、语音生命周期与压低包络、每源距离滤波或自定义衰减曲线。 · Expose custom-source/PCM bus input, voice-lifetime signals and duck envelopes, per-source filters and attenuation callbacks.

### 4. 文件交换与原生表单 · File exchange and native forms — 部分解决 / partly
<!-- engine-note: {"id":"Wulin#4","status":"partly","topic":"native-file-and-choice-controls","workaround":["src/main.mjs","src/ui/native-shell.mjs","src/ui/native-save.mjs"]} -->

- 现象 · Observation：数据视图没有文件导入/导出、原生选择列表/编辑框的直接描述部件。 · Declarative views do not currently have a file picker/export or editable select/text field part.
- 游戏里的处理 · Workaround：下拉改成具名原生模态列表；编辑经 `createBrowserTextInput`（仅编辑期间由引擎管理系统输入框），实际存档用 `createSaveStore` 和原格式适配器。只有浏览器文件交换用最小的临时 file input 和 Blob 链接。 · Native named modal lists, engine-managed browser text input, and an old-format save-store adapter; only file exchange creates a temporary file input and Blob link.
- 建议 · Proposal：数据视图支持输入、步进、选择列表绑定与原生文件交换回调。 · Add editable field, stepper, select and file-exchange bindings.

### 5. 通用键盘验收辨认 native focus · Detecting native focus in generic quality probes — 已解决 / resolved
<!-- engine-note: {"id":"Wulin#5","status":"resolved","topic":"native-ui-keyboard-quality-probe"} -->

- 现象 · Observation：通用 A1 检查依据 document.activeElement，不能辨认 Play 画布内的实际原生焦点；A2 仍正常读到语义节点。 · The generic A1 active-element probe cannot identify the focused native view part while the canvas owns keyboard input; A2 does see the projected semantics.
- 证据 · Evidence：实际 Tab / Enter 从标题经过序章、传承、确认、掌门手札进入弟子页；语义树焦点按键变化；零控制台错误。 · Actual Tab/Enter navigated from title through prologue, succession, confirmation and guide to disciples, with published focus changes and no console errors.
- 状态 · Status：引擎 #552 增加真实键盘导航和焦点语义回归；通用质量工具读取已获得 DOM 焦点的画布拥有的有效 `aria-activedescendant`，不更改画布焦点归属。A1 可检查原生控件；拒绝失效、无归属、隐藏及禁用目标。 · Engine #552 verifies real keyboard and semantic focus. The common quality probe recognizes the actual DOM owner’s valid owned active descendant, without changing canvas ownership, and rejects stale, unowned, hidden and disabled targets.

- 游戏里的处理 · Workaround：无游戏专用兼容代码；正式通用验收读取浏览器拥有的语义焦点，保留实按 Tab/Enter 测试。 · No game-specific workaround; the common verifier reads browser-owned semantic focus and retains real keyboard tests.
- 建议 · Proposal：采用 #552 的正式键盘回归，并对浏览器质量验收统一使用有效、具归属的 active descendant。 · Adopt the official keyboard regression and validate owned active descendants.

### 6. 原生通知位置与配色 · Native toast placement and contrast — 部分解决 / partly
<!-- engine-note: {"id":"Wulin#6","status":"partly","topic":"native-toast-placement-contrast","workaround":["src/ui/native-notice.mjs","src/ui/native-shell.mjs"]} -->

- 现象 · Observation：固定顶部的 `game.toast` 在常驻命令顶栏下可能被遮挡；游戏主题深色文字与默认深色背景也不够清楚。 · A fixed-top toast can sit behind the persistent command header; dark themed text on the default dark background has poor contrast.
- 最小复现 · Reproduction：显示满宽固定顶栏，调用默认 `game.toast`，在 1280×800 和 873×325 下进入地图。 · Show a fixed top header, call the default toast, and enter a map at 1280×800 and 873×325.
- 游戏里的处理 · Workaround：以被动原生数据视图呈现高对比度提示；模态使用保留的状态行，矮横屏留在场景空白位置。保留原提示时长与键盘归属，不创建 DOM 界面。 · Use passive native data views with a reserved modal status row and clear scene space on compact landscape; retain timing and keyboard ownership, without DOM UI.
- 建议 · Proposal：为引擎 toast 提供安全区内的锚点、偏移、主题和可选独立叠加层。 · Add safe-area anchor/offset, skin and optional dedicated overlay placement for toasts.
