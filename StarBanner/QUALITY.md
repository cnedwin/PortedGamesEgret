# 品质验收 · Quality — 星旗战记 · Starbanner Tactics

## iPhone 配置的 World3D 首场景追加验收 · WebKit first-world-scene check

- Windows Playwright WebKit 26.6, iPhone 15 Pro 竖屏配置，393 × 659 CSS px；公开 Pages d1bcff69 与候选本地 HTTP，均全新上下文、真实浏览器触摸。 / Windows WebKit with an iPhone 15 Pro portrait profile; clean browser contexts, actual browser touch events, public baseline at d1bcff69 and local candidate. Not a physical iPhone.
- 路线 / Route: 遭遇战→出阵→第 1 回合 / Skirmish → deploy → turn 1.
- 改前：CSS 渐变及 HUD；frame 503，31 draw calls / 1,134,046 triangles，3D backing buffer 235 × 395，截图没有场景。 / Before: missing visible 3D scene at a 235 × 395 backing buffer despite renderer submissions.
- 改后：同一场景可见完整棋格、人物、树林和建筑；frame 486，31 draw calls / 1,134,046 triangles，backing buffer 393 × 659，前后仍为 low 画质。 / After: the board, characters, trees and buildings are present; frame 486, 31 draw calls / 1,134,046 triangles, 393 × 659 backing buffer, still using the low quality tier.
- src/view/stage.mjs 只在移动 Apple WebKit 主机指定官方 `dynamicResolution:false`；保留其他平台、画质档、资源及玩法不变。 / Only mobile Apple WebKit passes the official dynamicResolution:false option, preserving the quality tiers, assets and other hosts.
- Node 65/65 通过；复测页面异常、控制台错误、HTTP 错误、失败请求均为 0。 / 65/65 Node checks pass and there are zero page exceptions, console errors, HTTP errors and failed requests.
- 分辨率锁定由 92,825 像素提升至 258,987（约 2.79 倍），是修复画面缺失的代价；没有在真实 iPhone GPU 上测到开销，不能将无头 WebKit 的 frame 计数当帧率，也不能断言故障根因完全在浏览器或引擎。 / Fixed resolution raises pixel area from 92,825 to 258,987 (about 2.79×). Physical iPhone GPU cost is unmeasured; frame counter values are receipts, not FPS, and ultimate engine/browser root cause has not been established.

## iPhone 配置 WebKit 启动回归（2026-11-28） · WebKit startup compatibility

Windows 上的 Playwright WebKit 26.6，iPhone 15 Pro 设备配置，竖屏 393 × 659 CSS px，独立的新浏览器上下文；不是 iPhone 真机或 iOS Safari 本体。改造前测试公开 Pages，改造后测试候选工作树的本地 HTTP 服务。

Windows Playwright WebKit 26.6 with an iPhone 15 Pro profile (portrait, 393 × 659 CSS px, isolated fresh browser context); not a physical iPhone or iOS Safari itself. Baseline: public Pages; retest: candidate worktree over local HTTP.

- 引擎副本 · Engine: `82561d6338a805f0e0459a2d5d42a284f9385b30`.
- 改造前：公开页显示 “Can't find variable: OffscreenCanvas”。地图缩图、字宽探测共用 src/ui/scratch-canvas.mjs，优先 OffscreenCanvas，否则用不插入页面的 HTML canvas。正式首屏 bundle 按最新副本重新生成，三个输入输出哈希及预加载图测试通过。 / Before: the page failed with “Can't find variable: OffscreenCanvas”. Map thumbnail and text probes share src/ui/scratch-canvas.mjs, preferring OffscreenCanvas with a detached HTML canvas fallback. The official startup bundle was rebuilt and passed all three input/output hash and preload graph tests.
- 按需绘制追加复测：原版本两张首屏截图（15/17 秒）均停在「载入中」，设置触摸后 3/5 秒两张图仍为标题；语义树早已切换，排除只看语义的误判。通过 src/ui/screen-present.mjs 在原生屏幕提交时调用正式 invalidate，并合并 250 ms 后一次补绘；不开启持续绘制。正式新 bundle 再测，15/17 秒两张均为完整标题，触摸设置后 3/5 秒两张均为实际设置（四张截图逐张核对）。 / Retained presentation recheck: two initial captures at 15/17 s stayed on Loading, and two 3/5 s after tapping Settings still showed the title although semantics had changed. src/ui/screen-present.mjs invalidates on native screen publication and coalesces one follow-up 250 ms later without continuous rendering. All four retest screenshots show the appropriate title or actual settings panel.
- 改造后 / After：标题完整可见，实际触摸设置按钮后语义树出现设置控件。仅有 AUDIO_HOST_UNAVAILABLE 诊断（本环境缺少两个 AudioContext 构造器），不代表真实 iOS 音频表现。 / The complete title is visible and touching Settings exposes controls in the semantic tree. The only diagnostic is AUDIO_HOST_UNAVAILABLE (both audio context constructors absent); not an iOS audio result.
- 复测无页面异常、控制台错误、HTTP 4xx/5xx 或失败请求（四项均 0）；`node --test test/*.test.mjs`：64/64 通过。 / No page exceptions, console errors, HTTP 4xx/5xx or failed requests on the local retest (zero in each category); 64/64 Node tests pass.
- 仅验收启动、首屏截图及一次浏览器触摸操作；未覆盖整局、设备横竖屏切换、物理 iPhone、真实 iOS 音频、Safari 版本差异或性能。 / Startup, title screenshot and one browser touch event only; full playthrough, rotation, physical iPhone, real iOS audio, Safari version variation and performance were not covered.

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs StarBanner` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs StarBanner`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 2026-11-25 真机回归 · Hardware regression

本节记录以 PR #238 的合并版本为基线、在本地候选版上的复测。以下历史自动表仍保留最初的 Linux 软件渲染结果。

This section records the local fixes tested against the PR #238 build. The original Linux software-rendering results remain below.

| 设备 · Device | 实测 · Measured |
|---|---|
| Windows Edge 158 / RTX 5090 Laptop / WebGL2 高画质 | 键鼠选格、旋转缩放、占领、手选出兵、攻击、回合、投降结算、重战与旧档续读。一次相同本地冷启动对照中，最大主线程任务 1069 → 106 ms，标题就绪 2068.5 → 865.5 ms。仍有一次 199 ms 浏览器帧间隔。 · Keyboard/mouse selections, deployment, combat and saves. One controlled cold run reduced the largest main-thread task from 1069 to 106 ms. A 199 ms frame interval remained. |
| Galaxy Z Fold7 / Android Chrome / Adreno 830 / WebGL2 自动低画质 / 411 × 813 CSS px | 触屏点格、取消、双指缩放、拖动、手选出兵、电脑回合、续档、认输重打和首章战役独立续档。麦浪渡口和带迷雾的双子海湾短样本 p95 16.7 ms。 · Touch selection, cancel, pinch, pan, deployment, AI turns, resume, rematch and independent campaign resume. Short samples on Wheatwater Ford and fog-enabled Twin Coves measured 16.7 ms p95. |

实机输入由浏览器自动化注入。真手柄、手机扬声器听感和三章从新档到通关的完整人工游玩仍待覆盖。Windows 软件渲染下三张旧参考图对比失败，原始合并版本在同环境也复现，功能断言通过。

Inputs were injected by browser automation on physical devices. Gamepad input, phone speaker listening and a full human playthrough of all chapters were outside this check. The three legacy pixel comparisons also failed on the original build under Windows software rendering. Functional assertions passed independently.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-25
- 浏览器 · Browser: 无头 Chromium 153.0.8010.12，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Linux 容器 · a Linux container, linux x64, Node v22.23.4
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 4 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 不达标 · fail | p95 633.3 ms over 14 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.5 s to the first playable screen, 3.5 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "Skirmish" (outline) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 4 named controls, e.g. button "Skirmish", button "How to play", button "Settings" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: star-banner) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: star-banner) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 达标 · pass | 21 files refused; no uncaught error; offers to try again |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: F1。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.

## 人工与真机结果 · By hand and on devices

- A1m、S4：由本目录的 `test/accept.mjs` 在无头 Chromium 里覆盖——只用键盘走完标题、设置、一局和结算，存档改坏后标题显示提示并重新开始。没有由人另做，也没有用真读屏。 · Covered by this folder's acceptance script in headless Chromium: the whole path by keyboard, and the notice after a broken save. Not done again by a person, nor with a real screen reader.
- T1、F2、E4、I2：未运行 · not run.

## 2026-11-27 原生 World3D 界面迁移 · Native World3D UI migration

- 基线源码 / Before: PortedGamesEgret `90084001` / vendored Egret `b3b594351e8017ce43a7c3cb20c769403806553e`。
- 候选引擎 / Candidate engine: `938a8d206fb3395bbac47be832a374df7b37eed3`。由 `tools/vendor-game.mjs` 生成，import map 完全一致 / generated by the official vendor tool, with matching import map.
- 旧版引擎未包含 `vendor/egret.mjs`，无法用旧副本直接执行 `verify --screens`（`MODULE_NOT_FOUND`）；保留旧版真实 Chromium 截图及 DOM 矩形、CSS 字号与模拟安全区的独立检查。这不是引擎 native verifier 的旧版结果。 / The old copy lacked the CLI, so the baseline used actual Chromium captures and independent DOM/CSS bounds/font/inset checks, not a native verifier result.
- 旧版 48/48 Node 测试通过；旧浏览器验收有 19 项功能通过，但 Windows SwiftShader 与原 Linux 截图基线有 3 处已有差异（标题 18.60%、准备 18.38%、开局 6.96%）。不因此覆盖原图。 / All 48 old Node tests and 19 functional browser assertions passed; three existing Windows-vs-Linux reference differences were retained.
- 旧版真实捕获 67 张，按实际物理像素检查尺寸并逐图对照；桌面和手机模拟都正常走到第 4 回合攻击预测与投降结算。旧 HUD 字号最低 11 CSS px；旧 CSS 1216 行，新宿主 12 行。 / 67 correctly-sized baseline captures were reviewed, with legal turn-four forecasts and concession on desktop and simulated touch. Old HUD text reached 11 CSS px. The UI stylesheet shrank from 1216 lines to 12 host-only lines.

### 改造前多屏检查 · Before screen checks

单元格 `错误/警告`（页面几何 + DOM 控件安全区、目标和截断） / Cells `errors/warnings` (page geometry and DOM safe area, target and clipping).

| Profile | 标题 Title | 准备 Setup | 开局 Opening | 选中 Selected | 行动 Action | 预测 Forecast | 战果 Result | 设置 Settings |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| phone-small 375×667 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| phone-notch 393×852 | 0/0 | 3/2 | 1/0 | 1/0 | 1/0 | 1/0 | 0/0 | 0/0 |
| phone-notch-wide 852×393 | 1/0 | 3/0 | 8/0 | 8/0 | 10/0 | 8/0 | 2/0 | 3/2 |
| phone-tall | 0/0 | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| tablet | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| tablet-wide | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| foldable | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| desktop 1920×1080 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |

旧横屏刘海遮挡了下方操作栏、标题、设置和行动菜单；旧竖屏底部控件部分进入主屏指示条区域。 / The old landscape notch covered the toolbar, title/settings content and action menu. The old tall screen put a bottom control inside the simulated home-indicator area.

### 改造后多屏检查 · After screen checks

官方 `verify --screens --play test/screen-route.mjs`：8/8 个设备档、64/64 个真实状态检查点通过，官方页面错误 0；官方 `controls:null`，故以下控件数字由实际 native semantic 节点补测，并核验每张 PNG 的 DPR 像素尺寸。截图红区是模拟系统遮挡。 / Official screen verifier: eight profiles, 64 played checkpoints, zero page errors. Overlay native-control probes are not yet emitted (`controls:null`), so the table supplements them with actual semantic rectangles and verified PNG sizes.

| Profile | 标题 Title | 准备 Setup | 开局 Opening | 选中 Selected | 行动 Action | 预测 Forecast | 战果 Result | 设置 Settings | 最小宽/高 CSS px / Min W/H |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| phone-small 375×667 | 0/0 | 0/1 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/3 | 52.97 × 47.08 |
| phone-notch 393×852 | 0/0 | 0/1 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/3 | 55.85 × 49.64 |
| phone-notch-wide 852×393 | 0/0 | 0/1 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/3 | 59.89 × 44.91 |
| phone-tall 360×800 | 0/0 | 0/1 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/3 | 51.16 × 45.47 |
| tablet 768×1024 | 0/0 | 0/1 | 0/0 | 0/0 | 0/1 | 0/0 | 0/0 | 0/3 | 73.21 × 66.26 |
| tablet-wide 1024×768 | 0/0 | 0/1 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/3 | 81.92 × 61.44 |
| foldable 884×1104 | 0/0 | 0/1 | 0/0 | 0/0 | 0/1 | 0/0 | 0/0 | 0/3 | 86.95 × 64.94 |
| desktop 1920×1080 | 0/0 | 0/1 | 0/0 | 0/0 | 0/1 | 0/0 | 0/0 | 0/3 | 88.50 × 67.20 |

表中 35 个补充 `apart` 警告均是相邻单选或按钮的焦点描边/阴影被计入语义视觉外框：29 个 ≤1 CSS px，其余含桌面约 1.2 px 描边、折叠档约 1.09 px 行动框和桌面约 4.2 px 行动阴影外框。真实命中矩形不包含描边/阴影，行动行间仍有 `4*u` 的正间隙，实测单选和行动正确。没有安全区/小目标错误，实际截图红区没有控件。宽、高是分别计算的各自最小值。 / The 35 supplementary `apart` warnings arise from focus strokes or shadows in visual semantic bounds: 29 are ≤1 CSS px; the rest include ~1.2 px desktop focus seams, ~1.09 px foldable action and ~4.2 px desktop action-shadow bounds. Explicit pointer hit rectangles exclude these decorations and action rows retain a positive `4*u` gap. No safe-area or undersized-target error. Minimum width and height are independent minima.

另跑英文 phone-small、phone-notch-wide、tablet 的 36 个检查点（标题、各准备标签、设置、帮助、战役）；发现英文短横屏标题与副标题重叠后修正标题行高度，在 852×393、873×325、393×852 双语 6 组针对性重拍，文字间实际间距 5.80–22.26 CSS px，无越界、小目标或浏览器错误。 / The 36 English menu checkpoints passed geometry, and visual review caught a short-landscape title overlap. Six bilingual targeted rerenders after the fix confirm 5.80–22.26 CSS px title/subtitle separation and zero geometry/browser errors.

### 软件渲染性能 · Software-rendered performance

Windows 无头 Chromium + SwiftShader，低画质，seed 3，剑士走两格至原生行动菜单；rAF 帧间隔，并非真实手机、独占 CPU/GPU 计时。旧版和新版包含引擎版本变化，另做同版 A/B/A 诊断。 / Headless software Chromium, low quality, same seeded legal route. rAF cadence, not separate GPU/CPU or physical-phone timing; the same-version A/B/A reduces the engine-version confound.

| Profile | Old p95 / n | New p95 / n | New max | New >50 ms |
|---|---:|---:|---:|---:|
| desktop 1920×1080 | 245.8 ms / 17 | 175.1 ms / 29 | 187.5 ms | 25 |
| phone-small 375×667 | 62.5 ms / 30 | 129.3 ms / 31 | 137.5 ms | 27 |

新版 3D 画布 backing 分别为 1152×648 / 225×400，2D 叠层为 1600×900 / 764×1360。另在静止棋盘以 2.5 秒为一个阶段，诊断性停止后恢复 overlay 的**渲染循环**，保持 3D 绘制。 / The new 3D and UI backing dimensions differ; the following diagnostic stops and restores only the overlay rendering loop in 2.5 s stages on a static scene, with 3D drawing still running.

| Profile | On p95 / UI+3D frames | Paused p95 / UI+3D frames | Restored p95 / UI+3D frames |
|---|---:|---:|---:|
| desktop | 179.1 ms / 27+27 | 91.6 ms / 0+32 | 175.0 ms / 28+28 |
| phone-small | 129.1 ms / 37+36 | 62.6 ms / 0+43 | 125.0 ms / 36+36 |

软件叠层持续绘制的成本明显，小屏回归未达到帧预算；真实 RTX 与 Fold7 的测试不能拿来抹去这一软件差距。正常游戏没有停止 UI 循环；原生 World3D overlay 没有按需绘制选项，记录 ENGINE-NOTES 10。 / The repeated overlay rendering cost is visible in software, and the small emulated viewport regresses against the old baseline. The actual device results are separate. The game does not ship with the overlay paused; on-demand native support is requested in ENGINE-NOTES 10.

共用品质工具 `node tools/quality.mjs StarBanner --no-write --json` 的新旧自动项目结果相同：F1 软件渲染 p95 158.3 ms（31 帧）→162.5 ms（47 帧），仍未达到 16.7 ms；T2、T3、L1、O1、I1、I3、A1、A2、A3、S1–S3、E1–E3 均通过。L1 的工具结果为 1.5 s、4.2 MB→1.5 s、3.1 MB；这是共用限速探针的结果，不替代下方真实 Edge 冷启动测量。 / The common quality tool reports the same pass/fail set before and after, with software F1 still over budget. Its throttled first-screen probe stays 1.5 s and transferred bytes fall from 4.2 to 3.1 MB; that probe does not replace the real Edge cold-start measurement.

### 真机 · Physical devices

Windows Edge / NVIDIA GeForce RTX 5090 Laptop GPU（ANGLE D3D11，非 SwiftShader），1280×720 低画质，seed 3，相同两格剑士路线。页面以浏览器自动化发出实际键鼠输入，非人工手打。 / Real GPU Edge, low quality, seed 3, same legal two-tile swordsman route; browser-automated physical PC keyboard/mouse path.

| 项目 / Metric | 旧 / Before | 新 / After |
|---|---:|---:|
| 标题冷上下文就绪 / Fresh browser context title ready | 0.813 s | 3.062 s |
| 标题 rAF p95 / Title rAF p95 | 4.3 ms (600) | 4.3 ms (601) |
| 战斗待机 rAF p95 / Idle battle rAF p95 | 4.3 ms (718) | 4.3 ms (720, independent rerun) |
| 战斗待机 max / Idle max | 8.3 ms | 4.5 ms (independent rerun) |
| 两格移动至菜单 rAF p95 / Move to action menu p95 | 4.3 ms | 4.3 ms (independent rerun) |
| 错误 / Console or page errors | 0 | 0 |

实际 PC 完成出阵、键盘选兵与落点、鼠标待命、菜单设置；第一次候选脚本在等`move`状态时超时，重新采集焦点后正常（焦点在 3D canvas，Enter 后状态 move），不能把第一次超时直接判为稳定输入故障。候选标题额外启动约 2.2 s，诊断里 UI 主机 2576 ms/3D 主机 287 ms，见 ENGINE-NOTES 8；虽已并行准备但仍有冷启动差距。 / The PC completed setup, keyboard unit movement, mouse Wait and settings. One initial candidate script timed out waiting for move, but the independent focus-instrumented rerun passed; no persistent keyboard failure was reproduced. Cold-load difference remains despite concurrent host preparation.

Galaxy Z Fold7（SM-F966U1，Android 17，Chrome 157），实际外屏有效视口 411×813 和 873×325，DPR 2.625，自动低画质，World3D 与叠加层均 WebGL2。未模拟成真机，使用真实手机 Chrome 的 CDP 触控，非人手。标题、准备、出阵、游戏菜单、设置值、音乐、语种、横竖屏往返，舞台、战斗、语义与焦点身份保持；16 个原生控件触控通过、无浏览器错误。 / Actual Fold7 outer screen; real phone browser touch injection, not a resized desktop or human finger test. Native screens and battle identity retained through turning and language/settings changes.

| 外屏 / Outside display | Samples | rAF p95 | Max | >50 ms |
|---|---:|---:|---:|---:|
| 横屏 Landscape 873×325 | 90 | 16.7 ms | 24.9 ms | 0 |
| 竖屏 Portrait 411×813 | 90 | 16.7 ms | 16.7 ms | 0 |

另一次实体手机路线真实点格，将剑士从 (2,9) 移到 (5,8)，再由 (5,8) 到 (7,6)，原生待命、结束回合确认正确；第三轮曾等待点选超时。没有把该超时推定为触控丢失。手机测试创建独立浏览器上下文并恢复旋转、USB 保持唤醒、调试转发和控制租约。 / Another phone run completed those legal moves, Wait and enemy turns; one later selection timed out, without enough evidence to blame input routing. Device state and test ownership were restored.

后续等待镜头稳定并校对点格投影，Fold7 完成 1–4 回合四次合法移动和待命（27 次真实触控输入），首次点选超时未能重现。移动后采样 90 帧，p95/max 16.7 ms、0 帧 >50 ms。该路线内没有可合法攻击的目标，因此未声称手机战斗预测、招募、战果已真机完成。 / The settled-camera physical retry completed four legal moves and Wait over turns 1–4, with 27 injected touches; the earlier miss did not recur. Post-move cadence was 16.7 ms p95/max over 90 frames with no >50 ms. Phone combat forecast, recruitment and settlement were not reached in this bounded route.

### 功能回归 · Functional regression

| 检查 / Test | 结果 / Result |
|---|---|
| `node --test test/*.test.mjs` | 50/50；旧规则 48 项保留，新加合法回放存档、叠加层转发输入回归 / preserved rule tests plus replay-save and forwarded pointer tests |
| `node test/accept.mjs` | 40/40，0 浏览器错误；具名原生语义选项、实际键鼠、合法移动/占领/出兵/敌方回合/攻击预测与伤害、认输/再战/续档、战役首章及设备 Gamepad API 模拟 / named-control, legal battle, settlement, battle and chapter save/resume, simulated standard gamepad |
| `node test/art-accept.mjs` | 2/2；从 106 条合法指令重建并验证的第 8 回合存档进入，释放战意技消耗战意；不是从标题自然游玩到满槽 / replay-derived legal turn-eight save, actual art command, not natural play from the title |
| `node test/touch-accept.mjs` | 12/12；模拟触摸浏览器 411×813→813×411，原生触摸选兵、落点预览/确认、待命、拖动、双指缩放、取消、旋转中的游戏/UI/语义与焦点 / real browser touch events on emulated screen, not a physical device |
| `node test/resource-accept.mjs` | 故意拒绝 21 个有效模型资源；原生重试/继续提示可见，继续返回标题，无未捕获错误 / deliberate refusal of 21 model requests, native error actions and return to title |

旧截图不覆盖（逐文件 SHA-256 与冻结版相同），新建三张 `test/baseline/native-*.png`。标题行高修复后重新审看并仅替换本次新建的 native-title 参考；不写图重跑，相对最终新基线标题 0.15%、准备 0.00%、开局 0.01% 差异，均在阈值内。早期迁移相对旧 Linux 图标题 28.14%、准备 61.61%、开局 27.08%，属于已观察的原平台差异与布局变化：标题保留中央 logo、按钮和动态沙盘；准备改为战场/双方/难度分类页以免窄屏裁切，地图纹理与所有选项保留；战斗围绕棋盘维持原卡片信息，以原生图集、触控工具栏和投影标记替代 DOM。实看过每张新基线，不以重拍绕过失败。 / Original PNGs stay byte-for-byte intact; three separately reviewed native references pass without rewriting. After the title spacing fix, only this migration's newly introduced title reference was updated following visual review. Larger differences against historical Linux references reflect both prior platform differences and the native presentation. Title retains the central logo, controls and animated board; setup gains tabs rather than clipped content; battle retains card information with native atlas text, toolbar and markers.

仓库检查 / Repository checks：`npm run check:showcase`（24 案例、72 webp）、`node tools/capability-matrix.mjs --check`、`node tools/check-standard.mjs` 与 `node tools/check-standard.mjs --strict StarBanner` 均按退出码通过。全仓库标准普通模式仍列出 FPS、jelly-pandas、JY、MechanismCity、Rally、TeaHorseRoad、Wulin 已有缺项（不能在本 PR 跨项目修改）。 / The requested commands return zero; the default report still lists seven other games' pre-existing missing tests/baselines, unchanged by this PR.

未覆盖 / Untested：Fold7 内屏的物理面板（折叠档 884×1104 仅浏览器尺寸模拟）、其他机型实体刘海与系统主屏指示条、Safari、Firefox、微信或其他嵌入式浏览器、实际屏幕阅读器、真手柄、扬声器听感。虽通过具名语义树和辅助功能映射检查，未将其等同于读屏实测；虽通过模拟标准手柄，也未将其称为物理手柄测试。每个屏幕档完成了标题到合法战斗预测和结果，完整招募/占领/战意技/战役续档由集中浏览器路径分项覆盖，而非声称每种输入和每个尺寸各自完整打一场。 / The Fold7 inner panel, other physical cutouts, Safari/Firefox, embedded browsers, a real screen reader, physical controller and speaker listening were not tested. Each screen profile reached legal forecasts and result; the complete recruitment/capture/rally art/chapter resume flow is covered across focused browser routes, not claimed on every input type and profile independently.

## 原生叠加层后续（引擎 #528） · Native overlay follow-up (engine #528)

- 引擎正式合并 / Engine merge: `0e7b29321a07ec956f66efb293c79798270512bd`；本游戏官方副本 / Official game vendor: `0e7b29321a07ec956f66efb293c79798270512bd`。
- 游戏候选标识、环境与执行日期 / Game candidate, environment and execution dates: 2026-11-27，PortedGamesEgret 本地正式候选（官方已合并引擎 0e7b2932 的副本）；以下正式验收为同一 StarBanner 候选本机服务，而非公开 GitHub Pages 部署证据。保留旧版迁移资料，独立区分 Windows 实体 GPU、实体 Fold7 外屏和 SwiftShader 多屏模拟 / Local formal game candidate using the officially merged engine copy. The following formal acceptance uses the candidate served locally, not public Pages. Hardware PC, physical Fold7 outer panel and simulated SwiftShader profiles are separate.。
- 原 2026-11-27 迁移数据保留（包含旧版 `controls:null`、语义视觉外框警告和软件 A/B/A），不因接口改变而重写原始验收。 / Original migration results, including missing native control receipts, supplementary visual warnings and software A/B/A, are retained as history.
- 实际采用原生有界缩放、按需绘制、单页 WebGL2 批处理、图片排队、响应式根与已挂载控件注册；不改变战斗规则、数值、AI、存档、美术与音频。 / Native bounded scaling, on-demand drawing, single-page batching, image admission, responsive roots and attachment-time registration are used without changing rules, balance, AI, saves, art or audio.

### 预合并独立 A/B 调查 · Separate pre-merge A/B investigation (not release evidence)

候选引擎 `32d79f393d9223caf9f89795445f9c1e0dfd0a3c`（未发布）由官方 vendor 工具生成。同一候选的默认持续、多页模式 A 与按需、单页模式 B 比较；分辨率、特效、玩法、资产与回调不变，已包含上游 #525。以下为预合并实际 PC 与实体 Fold7 的观察，不是最终合并版本或公开站点的测量。 / Officially vendored scratch candidate prior to merge. The modes differ only in native rendering/page-batching options; same quality, effects, assets, callbacks and rules. Upstream #525 is included. These observations do not establish final merge or deployment acceptance.

| 同版 A→B / Same runtime A→B | RTX 5090 Laptop / D3D11 | SwiftShader 375×667 |
|---|---:|---:|
| 标题可操作 wall ms / Title actionable wall ms | 2577→1102 | 1756→827 |
| UI host ready ms | 2005.6→520.6 | 238.3→213.7 |
| WebGL2 programPreparationMs | 1826.8→380.4 | 0→0（同步 / synchronous） |
| Idle rAF p95 ms | 4.3→4.3 | 125.0→70.9 |
| Idle overlay draws / steps（2.5s） | 494/601→0/585 | 34/41→0/41 |
| Move/action rAF p95 ms | 4.3→4.3 | 129.1→133.3 |
| Static action menu p95 ms | 4.3→4.3 | 125.0→62.5 |
| Static menu UI draws / steps | 600/601→19/602 | 32/39→0/45 |
| Last menu frame native draw calls | 31→34 | 33→36 |

RTX 的 shader programPreparationMs 为并行程序准备阶段，不是各程序独占链接时间。单页少准备多页程序，以该菜单帧约 +3 draw calls 为代价。实际 GPU 帧间隔原本已很低；软件动态移动仍超预算，该样本中动态 p95 并未改善。 / RTX parallel program preparation time is not an isolated per-program linking duration. Single-page batching avoids the paged shader at a cost of three additional draws in the measured menu frame. Hardware cadence was already low; dynamic software movement remains over budget and did not improve in that sample.

预合并实体 Fold7 外屏（SM-F966U1、Chrome 157、DPR 2.625、411×813/873×325）两模式四个静止状态 p95 均 16.7 ms；候选叠层 0/152 绘制/更新步，3D 152 帧，真实 host serial 无变化。真实手机经 CDP 注入 20 次触控，合法移动、待命、设置、语种和转屏通过。浏览器进程及 GPU 缓存保持，标题 wall ms 1800→1301 仅为观察，不等同冷缓存 shader 因果或耗电测试。 / Four static states on the actual Fold7 outer panel held 16.7 ms p95 in both modes. Candidate overlay submitted zero times in 152 steps while 3D continued at 152 frames. Twenty physical-device injected touches exercised a legal move, Wait, settings, language and rotation. Chrome/GPU cache was kept; title timing is observational rather than isolated cold-shader causality or power evidence.

实际 PC 标题的 UI-only 诊断（计时后暂时隐藏 3D canvas）两选项像素完全一致。动态投影菜单位置会变化，整图差异 RTX 1.65%、软件小屏 3.91%，排除两个菜单区域的并集后均为 0%，不声称动态截图完全一致。 / UI-only title comparisons after timing were exact; anchored menus move slightly. Whole menu-screenshot differences were 1.65% RTX and 3.91% software small-screen, zero outside the union of projected menu regions; dynamic screenshots are not claimed identical.

### 正式引擎副本的功能和实际命中区域 · Official vendor functional and native-hit verification

正式副本的 Chromium + SwiftShader 多屏工具对 8 档实际浏览器、每档 8 个合法检查点均发出新鲜的原生控件报告（64/64）。由实际原生命中矩形检测安全区、44 CSS px 触控区和重叠；补充报告中 8/8 档安全区互相核对一致，逐张视觉核验 64 张截图无实质裁切。以下每格为 `控件数（错误/警告）`，不是界面节点总数；桌面触控栏较少，符合设计。 / All 64 checkpoints in Chromium/SwiftShader emitted fresh native-control receipts. The verifier checks actual hit rectangles for safe area, 44 CSS px targets and overlap; all eight safe-area comparisons matched. Every screenshot was reviewed without material clipping. Cells are `control count (errors/warnings)`, not total visual nodes.

| Profile | Title | Settings | Setup | Opening | Selected | Action | Forecast | Result | Min W/H (CSS px) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| phone-small 375×667 | 5 (0/0) | 12 (0/0) | 9 (0/0) | 8 (0/0) | 8 (0/0) | 2 (0/0) | 8 (0/0) | 2 (0/0) | 51.00 / 47.08 |
| phone-notch 393×852 | 5 (0/0) | 12 (0/0) | 9 (0/0) | 8 (0/0) | 8 (0/0) | 2 (0/0) | 8 (0/0) | 2 (0/0) | 53.78 / 49.64 |
| phone-notch-wide 852×393 | 5 (0/0) | 12 (0/0) | 9 (0/0) | 8 (0/0) | 8 (0/0) | 2 (0/0) | 8 (0/0) | 2 (0/0) | 58.01 / 44.91 |
| phone-tall 360×800 | 5 (0/0) | 12 (0/0) | 9 (0/0) | 8 (0/0) | 8 (0/0) | 2 (0/0) | 8 (0/0) | 2 (0/0) | 49.26 / 45.47 |
| tablet 768×1024 | 5 (0/0) | 12 (0/0) | 9 (0/0) | 8 (0/0) | 8 (0/0) | 2 (0/0) | 8 (0/0) | 2 (0/0) | 70.20 / 64.80 |
| tablet-wide 1024×768 | 5 (0/0) | 12 (0/0) | 9 (0/0) | 8 (0/0) | 8 (0/0) | 2 (0/0) | 8 (0/0) | 2 (0/0) | 79.36 / 61.44 |
| foldable 884×1104 | 5 (0/0) | 12 (0/0) | 9 (0/0) | 8 (0/0) | 8 (0/0) | 2 (0/0) | 8 (0/0) | 2 (0/0) | 83.70 / 64.80 |
| desktop 1920×1080 | 5 (0/0) | 12 (0/0) | 9 (0/0) | 6 (0/0) | 7 (0/0) | 2 (0/0) | 7 (0/0) | 2 (0/0) | 83.70 / 64.80 |

总错误、警告及引擎警告均为 0，非桌面档的独立最小宽 49.26 与最小高 44.914 CSS px；分别来自不同检查点，非同一控件。原有 35 项补充视觉外框警告不是新版本原生命中矩形的冲突；按实际命中区域验收，不把描边/阴影间距误判为控件重叠。折叠档与其他机型为浏览器视口模拟而非实体内屏。 / Zero native errors, warnings and engine warnings; independent minimum touch width and height are 49.26 and 44.914 CSS px. Prior visual-bound warnings do not imply native-hit overlap. The foldable and other profiles are emulated viewports, not measurements of an actual inner display.

另以最紧的横屏刘海档 852×393 跑完正式英文标题、各准备标签、设置、帮助及战役 12 个检查点：12/12 新鲜原生控件报告，0 错误、0 警告、0 引擎警告，安全区一致，独立最小宽 109.71 CSS px / 高 44.914 CSS px。逐图看过标题、按钮、长介绍、帮助及战役目标，没有文本裁切或进入模拟红区。本次只补这一英文档，不等同于八档全英文回归。 / The tight landscape-notch English route added twelve title/setup/settings/help/campaign checkpoints; all emitted fresh native-control receipts, with no errors, warnings or engine warnings, matching safe geometry, and independent minimum 109.71/44.914 CSS-pixel width/height. Visual review found no clipping or text in the simulated red zones. Only this English profile was repeated.

正式 `native-ui-accept.mjs` 10/10（真实 Chromium、模拟触屏视口）：873×325 能读取原生最小比例 `44/48`、`unit=1,tap=48`；同时载入八张存在的头像和一个重复 URL，9 个租约、8 次传输、峰值并发 4、重复使用同一纹理，成功保留资源上限。标题重新排版后名称与 ID 不变，叠加层、场景、语义树及焦点保持；模态内转屏、音乐开关持久化、准备页、两格合法移动、待命及出兵 100 金费用正常。原生启动报告的 ready/firstSubmit 时间有限，单页模式 pagedMs=0。 / All 10 native-interface browser checks passed: native bounded sizing with 48-unit targets, eight valid portrait downloads plus a duplicate sharing its texture (nine leases, eight transports, peak four), native title/modal reflow and stable identity/name/focus, persisted music toggle, setup, legal movement and Wait, and the existing 100-gold recruit cost. Startup receipts report finite readiness/first-submission timing and no paged-program preparation in single-page mode. This is browser simulation, not a phone hardware measurement.

### 正式回归与实际性能 · Final regression and measured performance

| 检查 / Test | 正式 vendor 结果 / Official-vendor result |
|---|---|
| `node --test test/*.test.mjs` | 50/50；规则与存档测试保留 / Rule and save tests retained |
| `node test/native-ui-accept.mjs` | 10/10；浏览器触屏模拟，非实体手机 / Chromium touch-emulated viewport, not phone hardware |
| `node test/accept.mjs` | 40/40，无浏览器错误 / zero browser errors |
| `node test/touch-accept.mjs` | 12/12；触摸平移、双指缩放、取消与原位转屏 / drag, pinch, cancellation and in-place rotation in browser |
| `node test/art-accept.mjs` | 2/2，106 条合法命令、8 回合回放档战意技 / legal 106-order replay save and rally art |
| `node test/resource-accept.mjs` | 故意拒绝 21 模型，重试/继续及回标题正常 / 21 intentional model refusals handled by native error controls |
| 参考图 / References | 保留旧基线，native-title/setup/opening 差异 0.09% / 0.06% / 2.85%，在既有阈值内 / Existing references not rewritten; all native image differences within their limits |

根仓库门禁 / Repository gates：`node tools/capability-matrix.mjs` 正式生成（58 rows / 24 games / 25 gaps），`node tools/capability-matrix.mjs --check`、`node tools/check-standard.mjs --strict StarBanner`、全仓 `node tools/check-standard.mjs`、`node tools/check-showcase.mjs`（24 cases / 72 WebP）均退出 0。能力矩阵生成结果与现有文件一致，根目录无变动。全仓普通标准报告列出 FPS、jelly-pandas、JY、MechanismCity、Rally、TeaHorseRoad、Wulin 的已有缺项，本任务没有跨游戏修改。 / All listed gates returned zero. The generated matrix matches the repo, with no root-file changes; the repository-wide standard checker reports existing gaps in those seven other projects, untouched by this work.

共用品质工具 / Common quality gate：`node tools/quality.mjs StarBanner --no-write --json` 退出 1，实际只有 F1 软件渲染帧预算失败（p95 175.0 ms / 43 帧，上次迁移 162.5 ms / 47 帧）。这是不同次软件抽样，不声称整体 F1 改善。其余自动 T2、T3、L1、O1、I1、I3、A1、A2、A3、S1–S3、E1–E3 通过；L1 仍为限速/CPU 降速的 1.5 s、3.1 MB。工具中的 device/manual 项按报告均未执行，独立物理 RTX 和 Fold7 路线见下，不把它们代替质量工具的未执行项。 / The shared quality command returns one because software-rendered F1 alone fails (175.0 ms p95 over 43 frames, previously 162.5 over 47). Different single samples do not establish improvement in overall F1. The remaining listed automated items pass; the throttled L1 remains 1.5 s / 3.1 MB. Device/manual rows remain unrun in the tool itself; separate physical-device results do not change those row statuses.

#### 实体 Fold7 · Physical Fold7

SM-F966U1、Android 17、Chrome 157.0.8103.78，外屏 411×813 / 873×325，DPR 2.625；World3D 和 overlay 为 WebGL2 低画质。20 次真实手机的 CDP 触控完成进场、剑士合法两格移动 (2,9)→(0,9)、待命、设置、语言与横竖屏往返；同一叠加层、战斗及设置焦点保持。待命前后原生提交序号 39→42，有真实重绘，不是停游戏。8/8 路线检查、0 浏览器错误；设备旋转、控制器、上下文、forward/reverse 全部恢复。 / On the physical outer Fold7 display, 20 real-device CDP-injected touches entered battle, moved a swordsman legally two tiles, waited, changed settings/language and rotated. Overlay, battle and settings focus remained the same. The native submit serial advanced 39→42 after Wait, proving actual redraw. All eight route checks passed, no browser errors; device/controller/browser/forwarding states were restored. Not a human-finger session.

| 外屏静止状态 / Outer-display static state | Samples | rAF p95 / max (ms) | >50 ms | Overlay draws / steps | Host serial Δ | World3D frames |
|---|---:|---:|---:|---:|---:|---:|
| 竖屏标题 / Portrait title | 152 | 16.7 / 16.7 | 0 | 0 / 153 | 0 | 153 |
| 横屏战斗 / Landscape idle battle | 151 | 16.7 / 16.7 | 0 | 0 / 152 | 0 | 152 |
| 横屏行动菜单 / Landscape static action menu | 151 | 16.7 / 16.7 | 0 | 0 / 152 | 0 | 152 |
| 竖屏战斗 / Portrait idle battle | 151 | 16.7 / 16.7 | 0 | 0 / 152 | 0 | 152 |

正式副本本次标题浏览器导航 wall 2845 ms、游戏时间 ready 2625.7 ms，overlay `readyMs=102.9`、`firstSubmitMs=135`、WebGL2 total=23 ms、paged=0 ms、`parallelPrograms=false`。手机浏览器缓存不可控，与上方独立 A/B 标题耗时不能直接归因为 shader 构建变化。没有实施停帧或牺牲画质，UI/3D 都持续计步，静止原生 UI 提交为零；不是能源或 GPU 占用百分比。 / Navigation wall 2845 ms and game-ready timeline 2625.7 ms; overlay ready 102.9 ms, first submit 135 ms, WebGL2 total 23 ms, paged 0 ms, synchronous programs. The phone cache is not controlled; do not attribute the time difference from the pre-merge A/B to shader preparation alone. Zero static UI draws accompanies continuing updates and 3D frames, not a measured energy or GPU percent saving.

实看正式候选手机截图：投影行动菜单轻盖上方卡片边框与空白，重要文字和按钮完整，未发现实际控件冲突；个别位置有视觉交叠，不声称画面完全无交叠。 / Actual candidate phone captures show a slight overlap of the projected action-menu decoration with the upper card border and blank region, with key text and buttons intact; not a hit-target conflict.

#### 正式 PC · Official PC

Windows 实体电脑 Edge 158.0.4370.33，NVIDIA GeForce RTX 5090 Laptop GPU（ANGLE D3D11，非 SwiftShader），1280×720、DPR 1、seed 3、中文、低画质、麦浪渡口及减弱动画。新 Edge 进程禁用 shader 磁盘缓存，网络/驱动内部缓存仍不可控；实际浏览器键鼠自动化以确定性游标操作，未调用隐式改档、强制绘制或镜头吸附。正式标题可操作 wall 1224 ms、游戏时间 ready 1078.7 ms，叠加层 ready 585.4 ms / 首次实际提交 597.1 ms，WebGL2 parallel programPreparation 362.5 ms / paged 0 ms / total 366.7 ms。 / Actual PC GPU Edge, fresh browser process, no shader disk cache; driver and network internal caches uncontrolled. Real browser keyboard/mouse automation with deterministic cursor positioning, without forced state changes, repaint or camera snap. Title actionable wall 1224 ms, game ready 1078.7 ms; native overlay ready/first submit 585.4/597.1 ms and parallel preparation 362.5 ms, paged 0 ms, total WebGL2 366.7 ms.

| 场景 / State | Samples | rAF p95 / max (ms) | >50 ms | Overlay draws / steps | Host serial Δ | World3D frames |
|---|---:|---:|---:|---:|---:|---:|
| 标题静止 2.5s / Static title | 600 | 4.3 / 4.3 | 0 | 0 / 602 | 0 | 602 |
| 战斗待机 2.5s / Idle battle | 583 | 4.3 / 8.4 | 0 | 0 / 585 | 0 | 585 |
| 两格移动至行动菜单 / Moving to action menu | 392 | 4.3 / 8.3 | 0 | 236 / 394 | 236 | 394 |
| 自然行动菜单 2.5s / Natural action menu | 600 | 4.3 / 4.5 | 0 | 19 / 601 | 19 | 601 |

10/10 路线核对通过、0 浏览器错误：剑士 (2,9)→(2,7) 合法移动并在原生行动菜单待命；原生实际提交增长，招募列表含投石车和巨人等后部兵种（此视口列表直接可见，未声称实体 PC 分页按钮实测）；游戏中双语、音乐持久化、刷新恢复同一回合、位置与设置。正式截图已实看。真实 GPU 的 rAF 间隔说明观察到的流畅度，不是引擎提交或 GPU 单独耗时。 / All ten hardware-browser route checks passed without browser errors: legal native move and Wait, actual host redraw, later recruitment choices visible, bilingual settings, persisted music, refreshed save with original turn/position/settings, and inspected captures. No physical-PC page-flip claim. Frame intervals measure browser cadence rather than exclusive engine or GPU latency.

#### 正式软件定向采样 · Official targeted software sample

375×667、DPR 2，Chromium + SwiftShader，正式 `test/perf-route.mjs` 完成合法两格行动与待命，退出 0。动态首次移动/菜单阶段 p95 133.4 ms（33 个记录间隔，max 137.5 ms，28 >50 ms）；原始记录保留首个 rAF 标记相对起点的 -2.4 ms 边界值；统计明确排除首个标记，p95 仅使用后续帧间隔，不当成 GPU 成本。 / The official software-rendered phone-size route passed the action and post-Wait checks. Dynamic action p95 is 133.4 ms over 33 recorded intervals, max 137.5 ms, 28 over 50 ms. The raw report retains a -2.4 ms initial rAF timestamp boundary artifact; the statistic explicitly excludes the initial marker and uses subsequent frame intervals, not GPU latency.

| 自然静止菜单样本 / Natural menu sample | Duration (s) | p95 (ms) | UI draws / loop steps | Host serial Δ | World3D frames |
|---|---:|---:|---:|---:|---:|
| 1 | 2.6777 | 70.8 | 1 / 41 | 1 | 41 |
| 2 | 2.5578 | 100.0 | 1 / 45 | 1 | 45 |
| 3 | 2.5226 | 91.6 | 1 / 47 | 1 | 47 |
| 4（稳定 / settled） | 2.5223 | 58.4 | 0 / 46 | 0 | 46 |

所有样本原生 loopState 为 running，前三次自然稳定期间各仍提交一次；第四次零提交不是暂停。随后实际按待命，原生绘制与 serial 都增加 2，功能回归通过。在静止软件菜单减少重复提交已验证，动态软件帧仍明显超预算。 / The native loop stayed running in every sample. Each of the first three naturally settling windows submitted once; the settled fourth window submitted zero, not a paused loop. An actual Wait produced two additional native draws and serials. Repeated static submits are removed, but dynamic software rendering remains above its 16.7 ms budget.

复跑 / Reproduction（从 StarBanner 目录 / from the StarBanner directory）：

```sh
node --test test/*.test.mjs
node test/accept.mjs
node test/touch-accept.mjs
node test/art-accept.mjs
node test/resource-accept.mjs
node vendor/egret.mjs verify --screens --play test/screen-route.mjs --out /path/to/new/screens
node test/screen-report.mjs /path/to/new/screens
node vendor/egret.mjs verify --screens=phone-small,phone-notch-wide,tablet --play test/screen-menus.mjs --out /path/to/new/menus
```

追加专项 / Additional checks: `node test/native-ui-accept.mjs`, `node vendor/egret.mjs verify --screens=desktop,phone-small --play test/perf-route.mjs --out /path/to/new/perf`。分别单独运行测量档位，避免浏览器互相争用。 / Run measured profiles separately to avoid competing browser instances.

未覆盖 / Untested：本轮仅补英文最紧 852×393 档 12 状态，未重复八档英文多机型长文本矩阵（语言切换和普通功能路线已通过，原迁移英文专项结果仍保留），未验 Fold7 实体内屏、其他实体刘海/系统条、Safari、Firefox、微信或嵌入式浏览器、真人读屏、真手柄、实体扬声器听感、能耗以及人工打完每个战役/每种输入。硬件路线覆盖有限合法操作，完整多项玩法分由浏览器验收承担。 / Only twelve states of the tight 852×393 English profile were repeated; the full English multi-profile long-text matrix was not repeated (language switching and general routes passed; historical results are retained). The physical Fold7 inner panel, other actual cutouts, Safari, Firefox, embedded browsers, real screen readers/controllers/speaker listening, power and a complete human campaign on every input method were not tested. Hardware routes exercise bounded legal actions; broader flows are covered by browser acceptance. 区分物理设备 CDP、浏览器尺寸模拟、自动化输入、完整人工游玩，以及静止叠加层提交与独占 GPU 时间/能耗。 / Distinguish real-device injection, simulated viewport, browser automation, complete manual play, and native dispatch from exclusive GPU work or energy.

## 2026-11-27 后续生产 ESM 交付 · Production ESM delivery follow-up

引擎副本仍为 `0e7b29321a07ec956f66efb293c79798270512bd`。旧公开先验为游戏 merge `275ce9a21fc61320d6f8137cd9065dfb6394409b`；新候选身份及发布状态：正式游戏本地候选已接入内容 hash ESM，采用前述已合并原生引擎，不把本地候选视作已部署 / The formal local game candidate uses content-hashed ESM and the already-merged native engine; local acceptance is not a Pages deployment.。未改变战斗规则、数值、3D 画质、模型资源或原生 UI，以下独立检查比较交付模块与启动顺序。 / The engine copy remains the same. The former public game is identified above; the new delivery identity is recorded separately. Delivery measurements do not change rules, quality, model assets or native UI.

### 公开旧版诊断 · Public baseline diagnosis

真实 PC Edge / NVIDIA RTX 5090 Laptop D3D11，1280×720、DPR1、seed3、低画质、中文、麦浪渡口。每次新浏览器进程，CDP 从导航前抓 Network+Tracing，HTTP browser cache 与 shader disk cache 禁用，实际浏览器键鼠点步骤到战场；OS、CDN、链路与驱动内部缓存不能控制。两次实际公网样本不挑选结果。 / Fresh real-GPU Edge under the same legal route, traced before navigation. Browser HTTP/shader disk caches disabled; OS, transit, CDN and driver caches uncontrolled. Both public timings retained.

| 阶段 / Stage | Slow (ms) | Fast (ms) |
|---|---:|---:|
| 标题真实可操作 wall / Title actionable | 6777 | 1234 |
| 主入口开始运行 / Entry evaluates | 3395.1 | 271.7 |
| 原生 overlay 后端模块 / Native backend module | 1520.8 | 93.4 |
| WebGL2 parallel program preparation | 381.4 | 370.0 |
| 13 个关键模型批次 / Title GLB batch (start→last responseEnd) | 5315.2→6512.9 | 751.9→840.5 |
| 出阵至真实可玩 / Deploy→actionable | 136 | 101 |

两次均通过，标题前 352 请求（329 个脚本），全流程 359 个请求（公网 HTTP/2，0 browser cache hit）。298 静态脚本压缩正文 1,052,664 B，最后 PointerRouter.js 3389.9/266.6 ms；29 个 overlay 后端 lazy 脚本压缩正文 99,274 B，最后 robust-predicates util.js 4914.4/364 ms；实际发起链是父模块响应完成后继续发现子模块。入口前主线程 parse/compile 标记并集 5.26/4.30 ms，而墙钟 3395/272 ms；渲染器主线程 trace 对齐误差 <0.084 ms，不能把嵌套标记、后台线程或并发请求持续时间直接相加。原生 programme prep 约 0.37 秒，两次差异远小于交付变动。慢模型 barracks-low.glb 请求→header 1194.6 ms、正文 1.9 ms；这是 ResourceTiming 证据，而不是把 CDP 派发顺序误差当负传输。 / Both public routes passed. The slow route is dominated by deep module discovery and headers wait, not JS parse or newly slow shader linking. See ENGINE-NOTES 11. Trace unions are not exclusive CPU/GPU timing.

### 同约束 PC A/B · Matched-network physical PC A/B

同一实体 Edge/RTX、raw HTTP/1.1 no-store loopback，CDP latency 40 ms、下载 10 Mbps、上传 5 Mbps，无 CPU 降速；fresh process，cache disabled，同一路线。不是 GitHub Pages HTTP/2 压缩测量。先两次 A 再两次 B，未随机交错。 / Same PC, raw local HTTP/1.1 no-store, matched network emulation, no slowed CPU. A1,A2 then B1,B2, not randomized. Not a compressed public- transport measurement.

| 观测 / Metric | A1 | A2 | B1 | B2 |
|---|---:|---:|---:|---:|
| 标题可操作 / Title wall ms | 8569 | 8438 | 4602 | 4594 |
| Main entry page ms | 4480.7 | 4379.0 | 1186.6 | 1151.9 |
| Overlay ready page ms | 5528.1 | 5400.8 | 1570.9 | 1533.6 |
| Native backend module ms | 631.8 | 631.7 | 7.1 | 7.5 |
| Native WebGL2 prepare ms | 403.4 | 376.5 | 364.1 | 361.3 |
| Attract backdrop page ms | 8446.8 | 8323.4 | 4476.2 | 4444.4 |
| Deploy wall ms | 124 | 96 | 102 | 142 |
| Requests issued before title | 352 | 352 | 35 | 35 |
| Script requests before title | 329 | 329 | 12 | 12 |
| Requests through battle | 359 | 359 | 42 | 42 |

本机受控平均开页→标题 8503.5→4598 ms（-45.9%）；原 329 个脚本 raw 正文 4,203,668 B，候选 12 个预加载脚本 1,250,132 B（-70.3%），关键 13 个 GLB raw 3,306,300 B 完全不变。四个样本无浏览器错误、无 trace loss。出阵 96–124→102–142 ms，未把省去的数秒等待移到出阵，不声称出阵更快。入口前主线程 module compile 标记并集 5.79/6.37→0.30/0.38 ms；整段 title compile+execution 标记并集 286.9/288.2→265.9/312.5 ms，无确定整体 CPU 性能提升。 / Controlled title mean falls 45.9%, raw JS body 70.3%, critical GLB bodies unchanged. All four routes pass. Deploy does not become the deferred seconds-long wait, but is not claimed faster. Trace confirms delivery gain rather than general CPU improvement.

候选 13 关键 GLB 仍等 overlay ready 后启动，受控带宽窗口 B1 1574.3→4311.8、B2 1537→4275.9 ms；这约 2.74 s 的资源阶段是下一步可选并行优化，不包含在本轮收益。 / Critical title models still begin after overlay readiness; additional overlap is a separate opportunity.

### 真实 Fold7 对照 · Physical Fold7

实体 Galaxy Z Fold7 外屏 SM-F966U1，Android 17/Chrome 157，低画质 WebGL2；英文 seed5/wheat，同一合法 Seline/Garron/Easy、物理转横屏、To battle。每次新拥有的浏览器 context，HTTP 缓存禁用、SW bypass，但既有 Chrome 进程/GPU/驱动和热状态不重置。设备实测为 CDP 注入触摸，非浏览器尺寸模拟或人工手指。 / Real-device outer-panel CDP touch, same legal setup and rotation route; fresh owned contexts with cache disabled and SW bypass, without resetting the existing browser/driver caches.

旧版公开页两次（不受控网络）标题 7785/932 ms，入口 4385.3/372.8 ms，后端模块 2020.8/114.3 ms，实际 WebGL2 初始化 28.4/19.3 ms，出阵 pointerup→ready 2538.8/1854.8 ms。两次每条 360 个 HTTP 200 请求，无缓存/SW flags 或错误；公网快慢同时保留，不把 CDN Age 与性能差别当成确定因果。 / Previous public slow/fast samples are both retained; same 360 successful requests, variable transport, and no attribution of CDN age as a proven cause.

| 同约束手机 / Controlled physical device | A1 | A2 | B1 | B2 |
|---|---:|---:|---:|---:|
| Title actionable wall ms | 7811 | 7803 | 4066 | 4104 |
| Module page ms | 4369.5 | 4345.3 | 1160.7 | 1150.2 |
| Native backend module ms | 538.7 | 532.4 | 7.9 | 8.0 |
| Actual WebGL2 init ms | 30.7 | 26.1 | 25.4 | 26.1 |
| Overlay→game ready ms | 2790.7 | 2802.1 | 2780.1 | 2796.3 |
| Owned requests by battle | 360 | 360 | 43 | 43 |
| Actual To battle pointerup→ready ms | 2379.9 | 2351.3 | 2252.5 | 2676.2 |

同 PC 的 raw/no-store loopback 经 ADB reverse，40 ms CDP latency/10 Mbps 下/5 Mbps 上，不 CPU 降速。标题两次平均 7807→4085 ms（-47.7%）。A/B 本轮出阵后的唯一资源均为同一个 garron-low.glb（436,791 B 含 HTTP overhead，首字节约 42 ms、正文约 355 ms），无新 post-click 脚本；原来正常未减弱动画模式仍有 1.6 s banner。B2 比 A2 慢约 325 ms、两样本均值增长约 99 ms，不能从四样本归因系统性退化，亦不声称出阵加速。四次都进入合法第一回合、截图实看，关键模型与 UI 不变；未重测显示帧率。 / Same controlled raw network as PC over ADB reverse. Mean title reduces 47.7%; identical single post-click model and no delayed scripts; the original 1.6-second banner remains. B2 is 325 ms slower than A2; the small sample does not establish a systematic change, and Deploy is not claimed faster. Legal turn one and appearance verified, not a full match/FPS rerun. All owned contexts, rotation, wake/original foreground and ADB/lease state restored.

### 构建与完整回归 · Reproducible build and regression

生产交付从同一 vendor import map 及游戏源码生成，esbuild 0.28.2（仅开发工具）、ES2022 ESM + splitting/minify/keepNames，16 个带 hash 输出，默认 WebGL2/title/text 12 项 preloads，WebGPU 仅选择时额外加载；manifest 包含引擎 SHA、输入/输出哈希及图，`src/asset-url.mjs` 统一 GLB、音乐等路径。 / Deterministic development-only bundle, content-hashed outputs, selected backend/text preloads and source/output graph provenance; assets remain game-root relative.

```sh
npm ci --prefix tools/launch-bundle --ignore-scripts
node tools/launch-bundle/build.mjs
node --test test/*.test.mjs
node test/accept.mjs
```

正式 game worktree 使用 clean `npm ci --ignore-scripts` 与固定生产构建器重生成，31 个相关路径的 canonical bytes 全部一致；Node 53/53，包括新增 manifest/端口/资产路径 3 项。 / Fresh pinned install and build reproduce all 31 relevant canonical files; Node 53/53 includes three delivery provenance/preload/asset-path tests.

| 检查 / Test | 本轮生产包结果 / Delivery candidate result |
|---|---|
| `node test/accept.mjs` | 40/40；无浏览器错误，原 native-title/setup/opening 基线差异 0.08% / 0.06% / 2.85%，均阈值内且未更新参考图 / reference images retained |
| `node test/touch-accept.mjs` | 12/12，触屏模拟与转屏 / browser touch and rotation, not device |
| `node test/art-accept.mjs` | 2/2，合法回放档战意技 / legal replay save and rally art |
| `node test/native-ui-accept.mjs` | 10/10，原生控件交互、图片排队、焦点与缩放 / native controls, image admission, focus and scale |
| `node test/resource-accept.mjs` | 故意拒绝 21 个模型，原生 Retry/Continue 正常 / native failure controls preserved |
| 真实 PC WebGPU 专项 / Actual PC WebGPU | Edge NVIDIA Blackwell GPU、真实 GPUDevice，World3D WebGPU + overlay WebGL2，10/10；≥13 个 GLB/头像和 3 首 MP3 HTTP 200 且有传输，无模型、音频、shader 错误 / real GPU Device, successful resource transfer, no model/audio/shader errors; not speaker listening |

默认 WebGL2 仍是原生，WebGPU 后端只在选择时加载；以上不代表实听音乐、实体 Fold7 内屏、其它浏览器或每种输入的完整战役通过。本轮聚焦冷启动交付，未重新执行上轮软件 F1 全局品质抽样。 / WebGPU is independently exercised without making it the default; no speaker listening or all-device campaign claim. This delivery study does not rerun the prior software F1 quality sample.

### 公网发布与限制 · Public publication and limits

本节旧公开数据已按原部署 275ce9a2 核验；新交付包的公网部署及从实际公开链接复跑须另附结果，当前不提前声称上线。 / Former public measurements are bound to deploy 275ce9a2; new bundle publication and real public retest remain separate evidence.

浏览器缓存禁用不意味着真实 CDN/驱动缓存全冷；手机已有 Chrome 的缓存状态单独记录。PC 与手机受控服务器为 raw HTTP1.1，不与压缩公网 bytes 混合计算。未测试实体 Fold7 内屏、其它设备、Safari/Firefox、能耗和人工完整战役；不以同设备 CDP 浏览器路径当人工操作。 / Browser cache disable does not clear all CDN/driver caches. Controlled raw transfer differs from compressed public delivery. Inner panel, other devices, Safari/Firefox, energy and complete human-play campaigns remain untested.

## 2026-11-27 标题模型传输与原生宿主并行 · Title model transfer overlapped with host startup

- 基线 / Baseline：正式 game merge `e81496b77ef2b34d4cd47d5bf0e1a40cdaa6027a`，原生引擎 `0e7b29321a07ec956f66efb293c79798270512bd`；本轮候选身份 / new candidate identity：正式本地 game 候选已应用同源12路径并重生成 manifest；游戏未以本地验证冒充线上 / The formal local candidate applies the tested source/output changes and rebuilds the manifest. Local acceptance is not a public deployment.。
- 旧生产 ESM 交付优化仍保留，本轮仅在真实 World3D 已选定画质后，提前请求标题当前模型的同一批 GLB **bytes**；不预取其它画质、不提前把模型放进场景，解析/解码、原生 shader 与场景构建仍由原 loader 在原消费点执行。载入失败及取消/清理行为需专项复测。 / Retain production bundles. After actual World3D selects the quality, request the same title GLB bytes earlier; do not load unused qualities or create models early. Parse/decode and renderer/scene preparation remain in the original consumer. Regress failure/cancellation and cleanup separately.
- 该问题是 Demo 自己的资源调度改进，不是新引擎功能缺陷。 / This is a game-owned scheduling improvement, not a new runtime bug.

### 新轮受控真实 PC 基线 · Fresh physically-rendered PC baseline

Windows Edge RTX 5090 Laptop ANGLE/D3D11、1280×720 DPR1、seed3/wheat/zh/low、减弱动画，新 Edge 进程、HTTP 和 shader disk cache 禁用；raw(no-store) loopback HTTP1.1，CDP 40 ms latency / 10 Mbps 下 / 5 Mbps 上，无 CPU 降速。与前一轮相同条件重新采两次 #281，避免仅用历史样本判断小变化；公网 CDN 与驱动缓存另有变化。 / Fresh real-GPU Edge, same controlled network and legal route as previous delivery trial, two new #281 baselines instead of relying on older samples. Device/CDN caches are separate.

| 观测 / Metric | A1 | A2 | B1 | B2 |
|---|---:|---:|---:|---:|
| Title actionable wall ms | 4591 | 4542 | 4197 | 4204 |
| Main entry page ms | 1177.7 | 1127.2 | 1162.7 | 1153.8 |
| World3D ready page ms | 1201.6 | 1150.6 | 1188.0 | 1177.5 |
| Overlay ready page ms | 1562.0 | 1510.2 | 1541.6 | 1536.1 |
| 13 GLB first request page ms | 1565.8 | 1513.6 | 1188.8 | 1178.2 |
| 13 GLB last responseEnd page ms | 4314.5 | 4249.1 | 3915.8 | 3918.1 |
| GLBs started before overlay (n/13) | 0 | 0 | 13 | 13 |
| Network interval overlapped World3D→overlay (ms) | 0 | 0 | 352.8 | 357.9 |
| Backdrop complete page ms | 4468.8 | 4410.6 | 4067.6 | 4073.8 |
| Click Deploy→actual battle wall ms | 93 | 96 | 99 | 120 |

旧版 13 GLB raw body 合计 3,306,300 B，全部在 overlay ready 3.8/3.4 ms 之后才发出，批次持续 2748.7/2735.5 ms；最后 Vireta model request→headers 40.1 ms、正文 1785.1/1781.5 ms（共享带宽下受控测量），从最后 GLB 到实际 backdrop 还有 154.3/161.5 ms，不能独占归因给 decoder。两次均 42 个全路请求、无新增 post-deploy resource/trace loss/error，native shader preparation 363.8/363.5 ms。 / Both baselines use the same 13 critical GLB bodies, with all fetching after overlay; post-network time includes decode and scene preparation, not an isolated decoder. Both passed with 42 requests and no new post-deploy fetch, errors or trace loss.

候选两次标题 4197/4204 ms，平均 4566.5→4200.5 ms（缩短 366 ms / 8.0%）。13/13 模型的实际 URL 与 raw 正文逐一完全相同（合计 3,306,300 B，ResourceTiming transferSize 3,310,200 B），实际在 World3D ready 后 0.8/0.7 ms 开始，较 overlay ready 提前 352.8/357.9 ms。批次持续 2727.0/2739.9 ms，与旧版相同量级，last responseEnd 驱动到 backdrop 151.8/155.7 ms，与旧 154.3/161.5 ms 同量级；不是模型解码加速。原生报告 `startup.modelsRequested=1188.3/1177.8`、`modelsDownloaded=3918.1/3920.2`，`modelPrefetch={requested:13,downloaded:13,failed:0,set:'low'}`，实际最后传输后仅 2.3/2.1 ms 完成 promises。 / Candidate starts every identical model before overlay readiness, overlapping 352.8/357.9 ms of the native UI startup. Title mean improves 366 ms (8.0%) without reducing model bytes or accelerating the measured network/decode work itself. Native promise receipts match final responses.

四次均 35 请求在标题前发出、42 全流程，0 cache hits/errors/trace loss；无 post-deploy 资源请求。Deploy 93/96→99/120 ms，候选单样本略慢，未将 366ms 标题收益移到出阵，不声称出阵改善。Native program prep 363.8/363.5→359.3/363.4 ms；入口 parse/compile 标记并集 5.39/4.95→5.24/4.99 ms，整段 title compile+eligible execution 标记并集 245.4/268.1→242.8/244.5 ms，样本小，不声称 CPU 或 shader 性能提高。新增打包代码约 +2,016 raw B，模型完全不变。 / All matched runs pass with the same request count and no new post-Deploy resource; Deploy is not claimed faster. Native shader and main thread trace measurements do not establish a renderer/CPU speedup. The added bundled code is small; assets are unchanged.

### 真实 Fold7 · Physical Fold7

实体 Fold7 外屏 SM-F966U1、Android17/Chrome157，英文 seed5/wheat/low，同一设置 Seline/Garron/Easy、真实物理横转与 To battle。受控 raw/no-store HTTP1.1 loopback（ADB reverse），CDP 40 ms / 10 Mbps / 5 Mbps，无 CPU 降速。每次独立拥有 context、HTTP cache disabled/SW bypass，不重置既有 browser/GPU/driver/热状态；实际 CDP 注入触控，不是模拟尺寸或人工手指。 / Actual physical outer Fold7 panel, same controlled local network and game route. Fresh owned contexts without resetting browser/driver/thermal state; physical-device injected input, not emulated/human play.

| 观测 / Metric | A1 | A2 | B1 | B2 |
|---|---:|---:|---:|---:|
| Title actionable wall ms | 4149 | 4077 | 4030 | 4036 |
| World3D ready page ms | 1229.4 | 1176.3 | 1154.0 | 1164.8 |
| Overlay ready page ms | 1242.4 | 1186.2 | 1170.6 | 1176.3 |
| First critical GLB page ms | 1246.0 | 1189.3 | 1154.6 | 1165.5 |
| Last critical GLB responseEnd page ms | 3944.6 | 3887.8 | 3853.8 | 3863.2 |
| Starts before overlay | 0/13 | 0/13 | 13/13 | 13/13 |
| Game ready page ms | 4021.8 | 3969.3 | 3931.4 | 3963.5 |
| Native WebGL2 init total ms | 34.6 | 28.2 | 28.8 | 22.2 |
| Actual To battle pointerup→ready ms | 2510.5 | 2245.9 | 2533.6 | 2452.2 |

四次 13 个关键 GLB 唯一请求及 raw bytes（CDP encodedDataLength 含 HTTP overhead）3,308,939 B 完全相同；候选原生 marker 1154.2/1165.1 请求、3855.0/3864.7 下载完成；set low、13/13 成功。全部实际开始于 native World3D ready 之后、overlay ready 之前，B1/B2 实际可交叠 16.0/10.8 ms。观察平均标题 4113→4033ms（-80ms / -1.9%），手机宿主窗口很短，不能将全部 80ms 归因于重叠；不套用 PC 的幅度。 / Four trials have identical 13 critical URLs and counted transfer bytes. Native receipts show 13 successful requests; the actual overlap window is 16.0/10.8 ms. Observed title mean falls 80 ms (1.9%), not all causally attributable to overlap in this small sample.

四次真实合法进入第一回合，43 请求/0 错误/0 trace loss/0 cache flags，图实看，原模型 UI 保留。出阵后仍唯一同 Garron GLB 436,791 B（含 overhead），A TTFB/body42.9/351.2、42.4/357.3ms；B43.1/351.9、43.2/354.5ms；无额外脚本，保留原1.6秒 banner。出阵两样本均值增加约115ms，不声称等时/改善，也无新增网络加载证据。所有设备控制/转屏/USB唤醒/调试/lease 按记录恢复。 / All real-device routes and restoration pass; the same only post-click model and original 1.6 s banner remain. Deploy is observed ~115 ms slower on average in these small samples, with no newly shifted resource/script load; it is not claimed faster or invariant.

### 模型身份、失败与取消回归 · Asset identity, failure and cancellation regression

正式候选已应用并重新生成 canonical manifest，原生 vendor 不变；Node 60/60（比前轮新增7项 startup model 单测）。 / Final local candidate rebuild matches its manifest; engine unchanged, Node 60/60 (seven new startup-model tests).

实际实现：`src/startup-models.mjs` 只在 native World3D ready 且 overlay 未 ready 时规划一次真实标题地图，直接出阵、overlay 已 ready、宿主失败均跳过；`src/view/model-plan.mjs` 使用与原 battle 相同 props/建筑/军团/兵种/cargo 名单与实际 `stage.quality` 档；`src/view/model-bytes.mjs` 限16唯一模型，以精确 URL 消费一次早期 promise，成功或失败都交原 loader，取消及时 abort 和清 map，不持久缓存、不重复发请求、不把失败翻倍计数。原 `loadModel` 解码、现有失败提示及场景构建顺序保留。 / Prepare only while the real UI host is pending, using the same selected map and quality. Bound at 16 unique early binary requests, consume once per exact URL, retain original loader failure handling/decoding and cancellation; no persistent cache or early renderer upload.

Node 的 7 项专项覆盖三地图原模型列表/cargo、真实 medium 分档和随机一次、直接出阵/先完成 overlay/宿主失败跳过、一次读取及不同地址/档不误用、HTTP 失败交原 loader 一次、取消 pending/迟到 world 不启动、固定16上限。 / Seven new unit cases cover the model list, actual tier, single random choice, paths that must skip prefetch, single consumption and path/tier isolation, original failure handling, abort on startup failure and finite limit.

实际浏览器硬件验证 / Actual hardware-browser boundary route：5 cases / 18 assertions PASS。故意延迟 2D backend 500 ms 并令 oak-low.glb 返回503，world ready 127.5 ms / 早期请求 127.7 / 下载收据 193.1（12/13 成功、1 失败）/ overlay ready 1015.2；oak 只发一次，原告警仅一次，原 Retry/Continue 及恢复标题正常。直接战斗不预取标题；auto 实际 HIGH 时 13 个模型均 high 档且各一次；invalid quality/backend 保留原 fatal 且零 GLB，HIGH 截图实际检查无问题（不是性能 A/B）。既有 `node test/resource-accept.mjs` 故意拒绝 21 个模型资源，原生重试/继续通过。 / Delayed-backend/503 control, single failure reporting and original retry/continue path, no direct-battle prefetch, exact auto-HIGH tier and original invalid-options failure, with reviewed HIGH output; existing 21-model failure acceptance also passes. This is functional boundary evidence, not a timed high-quality trial.

正式主流程回归 / Formal route regression：`node test/accept.mjs` 40/40、`node test/touch-accept.mjs` 12/12（浏览器触屏/转屏，不是实体手机）、`node test/art-accept.mjs` 2/2，全部 0 浏览器错误。既有 native-title/setup/opening 参考图差异 0.08% / 0.07% / 2.86%，均在阈值内；没有重写任何原截图基线。 / All three formal browser routes pass without errors. Existing reference images remain unchanged and their differences are within the previous limits.

### 公开复测、限制及复跑 · Public check, limitations and reproduction

本节当前为 #281 基线与候选受控测试；正式发布后另按实际 Pages 结果核对标题与出阵，不提前声称。原真实内屏/其它浏览器/扬声器/真人完整战役未测；独占 GLB decoder 时钟不存在，responseEnd→backdrop 是组合窗口。 / Local matched measurements are not public deployment evidence. Physical inner display, other browsers, audio listening and full manual matches remain untested. No isolated GLB decoder time is asserted.
