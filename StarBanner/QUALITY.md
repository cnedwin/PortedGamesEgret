# 品质验收 · Quality — 星旗战记 · Starbanner Tactics

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
