# 引擎笔记 · Engine notes

引擎副本：`8424ff2afb0afdc103b06d51e3fd749f7a8fc379`。本作原生迁移不修改引擎副本。
Engine copy: `8424ff2afb0afdc103b06d51e3fd749f7a8fc379`. No local engine patch.

### 1. 长名册与弹窗的段落缓存上限 · Paragraph capacity in rosters and dialogs — 部分解决 / partly
<!-- engine-note: {"id":"Wulin#1","status":"partly","topic":"paragraph-cache-budget","workaround":["src/ui/native-kit.mjs","src/ui/native-pages.mjs","src/ui/native-sheets.mjs"]} -->

- 现象 · Observation：在弟子名册打开人物单，实际 Chromium 验收出现 `PARAGRAPH_CACHE_BUDGET`。缓存的条目数及并发作业数硬上限均为 32；纵向滚动视图仍会实体化视口外的富文本。 · Chromium reported the cache budget error when opening a person sheet above the roster. Both the entries and pending jobs are capped at 32; a scroll view materializes rich labels outside its viewport.
- 最小复现 · Reproduction：创建带 20 个段落的原生滚动视图，再打开带 20 个不同段落的模态；使用 Canvas paragraph provider，不需 Wasm。 · Show a native scrolling view with 20 distinct paragraphs, then a modal with 20 different paragraphs, using the Canvas paragraph provider.
- 游戏里的处理 · Workaround：长名册、编年、武学、季报按原生键控分页；每个描述保留不超过 14 个富文本段落，为模态与选择保留预算。其余仍是引擎文字与滚动，并没有另绘 Canvas。 · Keyed pages limit rich paragraphs to 14 per view, leaving capacity for dialogs and pickers; the remaining content is native text and native scrolling.
- 建议 · Proposal：为原生视图的富文本提供视口感知的延迟实体化、复用与预算/排队诊断；支持可配置的大型经营界面缓存额度。 · Add viewport-aware paragraph realization, reuse, budget and queue diagnostics, and a configurable capacity for management UIs.

### 2. 多屏验收与滚动裁切边界 · Screen verification and clipped controls — 未解决 / open
<!-- engine-note: {"id":"Wulin#2","status":"open","topic":"screen-verification-scroll-clipping","workaround":["test/screen-verify.mjs","test/screen-route.mjs"]} -->

- 现象 · Observation：`verify --screens --play test/screen-verify.mjs` 的九种尺寸均可完成路线，但报告的 `inSafeArea` / `apart` 把滚动视口以外的指南分页、门派列表及设置选项也计入，包括实际被裁切掉的按钮。截图与真实可见语义框必须独立核对。 · All nine routes complete but the verifier also counts raw rectangles of scroll-clipped controls, including the guide pagination, sect list and scenario choices. Compare screenshots and the native visible semantic bounds independently.
- 最小复现 · Reproduction：在安全区内放置一只纵向滚动面板，内容超过窗口，下方固定两个按钮；验收未滚动与末尾位置。 · Place a scroll panel inside the safe area with content longer than its viewport and two fixed footer buttons; verify both its first and last scroll positions.
- 游戏里的处理 · Workaround：保留引擎原生视口和滚动，完整路线仍按实际控件焦点操作；没有为通过工具而隐藏检查对象或改引擎。 · Keep the real native viewport and focus route; no verification suppression or engine patch.
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

### 5. 通用键盘验收辨认 native focus · Detecting native focus in generic quality probes — 已记录 / documented
<!-- engine-note: {"id":"Wulin#5","status":"documented","topic":"native-ui-keyboard-quality-probe","workaround":["test/screen-route.mjs"]} -->

- 现象 · Observation：通用 A1 检查依据 document.activeElement，不能辨认 Play 画布内的实际原生焦点；A2 仍正常读到语义节点。 · The generic A1 active-element probe cannot identify the focused native view part while the canvas owns keyboard input; A2 does see the projected semantics.
- 证据 · Evidence：实际 Tab / Enter 从标题经过序章、传承、确认、掌门手札进入弟子页；语义树焦点按键变化；零控制台错误。 · Actual Tab/Enter navigated from title through prologue, succession, confirmation and guide to disciples, with published focus changes and no console errors.
- 建议 · Proposal：品质检查同时查看引擎语义树的 focused 状态与画布内可见焦点，不更改浏览器正确的 tabindex 机制。 · Inspect the engine's focused semantic state and drawn focus, rather than changing correct browser tab-index ownership.
