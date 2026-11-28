# 品质验收 · Quality — 帝国竞技场 · Imperial Arena

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs FiveRegiments` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs FiveRegiments`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-28
- 浏览器 · Browser: 无头 Chromium 157.0.8103.6，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Windows 实机的无头软件渲染 · Windows host, headless software renderer, win32 x64, Node v26.7.0
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 7 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 不达标 · fail | p95 158.3 ms over 41 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.6 s to the first playable screen, 2.7 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "破关行" (owned active descendant) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 7 named controls, e.g. button "征途", button "破关行", button "自由对决" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: five-regiments) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: five-regiments) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 达标 · pass | 68 files refused; no uncaught error; offers to try again |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: F1。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.

## 人工与真机结果 · By hand and on devices

- A1m、S4：由本目录的 `test/accept.mjs` 在无头 Chromium 里覆盖——只用键盘走完标题、设置、一局和结算，存档改坏后标题显示提示并重新开始。没有由人另做，也没有用真读屏。 · Covered by this folder's acceptance script in headless Chromium: the whole path by keyboard, and the notice after a broken save. Not done again by a person, nor with a real screen reader.
- T1、F2、E4、I2：未运行 · not run.

## Stonegate WebGL2 on Windows · 石门关 Windows 真机复验

2026-11-25 · Edge 158.0.4370.33 · RTX 5090 Laptop · ANGLE D3D11 · 1280 × 720 · KHR_parallel_shader_compile

Each version ran in a fresh Edge session. Start the expedition as Vanguard, seed 31, medium quality. Clear Stonegate, turn toward the exit and ride through the gate. Both runs ended in victory. The first color draws batching eight pines and eight rocks used the prepared geometry, material and shader variants, including shadow reception.

两个版本分别使用全新 Edge 会话。选先锋、中画质、种子 31 进入行军，清敌后转向出口，穿过石门关。两次均获胜。松树和岩石分别首次达到 8 个可见实例时，实际颜色绘制使用的几何、材质和着色变体均与预热匹配，并保留了接收阴影的变体。

| Game version · 游戏版本 | Preparation elapsed · 预热总耗时 | First pine batch after clear · 清敌后松树首批 | First rock batch after clear · 清敌后岩石首批 | Draw-time links / LINK_STATUS from clear to victory · 清敌至胜利的绘制期链接／查询 |
| --- | ---: | ---: | ---: | ---: |
| [#235](https://github.com/cnedwin/PortedGamesEgret/pull/235) · temporary instance meshes / 临时实例网格 | 300.3 ms | 0.4 ms | 0.6 ms | 0 / 0 |
| [Engine #458](https://github.com/cnedwin/Egret_rebuild/pull/458) · ordinary meshes / 普通网格 | 322.3 ms | 0.8 ms | 0.4 ms | 0 / 0 |

Preparation elapsed includes asynchronous completion during loading. Each first-batch time measures the CPU submission for the entire World3D render containing that batch. These are single observations for each version. On #235, pines had already batched once during combat (0.6 ms CPU submission, zero links and zero status queries). On the updated copy both props first batched after the fight. Other programs linked earlier in both runs.

预热耗时包含加载期等待异步链接完成的时间。首批耗时取首次合批所在整次 World3D 绘制的 CPU 提交时间。每个版本各记录一次有效实跑。#235 在清敌前就曾首次合批松树，CPU 提交为 0.6 ms，链接和状态查询均为零；新版两种道具均在清敌后首次合批。两个版本的战斗早段另有其他程序发生链接。

For visual comparison, hold the game clock and camera at the wide-field and gate-turn views. Across versions all 921,600 RGBA pixels per view matched with directional shadows enabled and with them disabled. Disabling shadows changed 38,392 pixels in the wide view and 437,238 in the gate view on each version. Re-enabling shadows restored both original images exactly.

画面对照固定游戏时钟，分别拍摄全景和转向关门两个机位。每个机位的 921,600 个 RGBA 像素在新旧版本间完全相同，开、关定向光阴影均通过。两版关闭阴影后，全景均有 38,392 个像素变化，关门机位均有 437,238 个；重新开启阴影后逐像素复原。

## 2026-11-28 V1–V5 真机验收 · Physical-device validation

引擎快照 / Engine: 7fb371acb8bab254cf1c49b9da0ac0eed0c06fb4, official vendor. The newer #575 merge appeared during acceptance; this release retains the measured pin rather than changing the runtime after device qualification. / 验收期间主干新增 #575，发布保留已完成设备验收的固定版本，避免在最后更换未经复测的运行时。

| 环境 / Environment | 采样 / Intervals | p95 | Max | >50 ms | 实际流程 / Route |
| --- | ---: | ---: | ---: | ---: | ---: |
| Windows, RTX 5090 Laptop GPU, Edge, 1280×800, high | 860 | 4.3 ms | 8.3 ms | 0 | Natural duel, pause and relock, settlement 18.9 s |
| Samsung Galaxy Z Fold7 SM-F966U1, Android 17, Chrome 158, Adreno 830, 873×325, medium | 845 | 16.7 ms | 33.2 ms | 0 | Touch duel, outside-drag, 3-contact release, pause/resume, settlement 16.1 s |

两条实机路线使用正常游戏操作；均为自然战败，未修改生命值、能量或模拟器。计时段没有截图，设备控制恢复；浏览器注入输入不等同人工手指。 / Both routes use normal gameplay input and end in natural losses without gameplay-state edits; timing excludes screenshot capture. Browser-generated input on the actual devices is not human input. Device state restored.

九种浏览器屏幕规格（含 Fold7 外屏 873×325）63 个流程检查点、9 个最终状态无报告错误或警告；目检后修复窄屏 HUD 覆盖，额外实拍三种竖屏确认标题四模式与三个底部按钮均可见，实际高度 48 CSS px。 / Nine simulated screen profiles: 63 route checkpoints and nine final states, zero reported findings. Visual HUD overlap corrected; three additional portrait title checks confirm all seven controls with 48 CSS px height.

独立 error-accept.mjs 实际阻断进场资源，验证原生错误/重试及画质低、高往返。原生触控与鼠标锁定专项通过。 / The failure/retry and quality-tier round trip, native touch and pointer tests passed. The initial Edge capture exception was addressed via an explicit click-release lock request; engine internals remain unproven (ENGINE-NOTES #7).

自动质量工具的 SwiftShader F1 不达标（p95 129.2ms, 51 intervals），旧历史软件结果为 383.4ms。不要把软件与真实设备直接混为同一性能指标。本次其他自动项通过，包括 L1 1.5s、3.4MB。 / Automatic SwiftShader F1 remains below target; hardware results above are separate. Other automatic items pass, including L1 1.5s and 3.4MB. Hardware data are short route samples, not exhaustive campaign or GPU-completion measurements.

未测 / Not run: complete campaign on hardware, physical gamepad, screen reader output, Safari/Firefox/WeChat, physical phone portrait or all quality tiers. No unverified engine cause is claimed.

## 2026-11-29 完整首屏、名称与呈现 · Full title startup, name and presentation

引擎 / Engine: `212972678e633b1f3667f345d0646b0fba907ee1` (official generated vendor). The display title is now 帝国竞技场 / Imperial Arena; the existing folder, link and saved data key remain unchanged.

**受控冷启动对照 · Matched cold startup.** Windows RTX 5090 Laptop GPU (ANGLE D3D11), hardware Chrome 157, 1280×800/high/WebGL2, fresh browser contexts, same local no-store HTTP server and CDP 40 ms/100 Mbps profile. Full title means all five figures, complete high-quality scene and two rendered frames, not a loading placeholder. The former public cold samples were about 9.66–10.67 s; public network latency varies and these are not the controlled A/B numbers.

| 指标 / Metric | 旧版 / Previous, two runs | 单入口及预热候选 / Bundle + preparation, two runs |
| --- | ---: | ---: |
| 完整标题就绪 / Full title readiness | 7693.5 / 7728.4 ms | 2911.5 / 2680.2 ms |
| 首个美术请求 / First asset request | 4530.3 / 4534.1 ms | 504.2 / 292.6 ms |
| 点出阵至 HUD 后两帧 / Confirm to fight HUD + two frames | 529.7 / 518.8 ms | 546.8 / 528.9 ms |
| 首屏最长 RAF 间隔 / Longest startup RAF gap | 1095.8 / 1096.0 ms | 354.2 / 350.0 ms |
| 同步 LINK_STATUS 查询总耗时 / CPU link-status query total | 1640 / 1654 ms | 158.8 / 153.2 ms |
| 最大单次 LINK_STATUS / Largest synchronous query | 255.0 / 252.9 ms | 57.4 / 51.7 ms |
| UI 后端模块加载 / UI backend module import | — | 6.0 / 5.4 ms |

首屏耗时缩短约 62–65%；仍有约 350 ms 启动长帧。原图和高画质资源均保留：首屏 34 个美术请求约 18.21 MB；其中 14 个场景道具 GLB 13.09 MB、6 个角色/马 GLB 4.33 MB。将 384 个游戏与正式引擎模块合为约 1.66 MB 的静态 ESM，保留正式导入表和独立天空 worker。仅预取首屏真实依赖，下载和模型解码可以重叠。候选实际调用 268 次 bufferData（16.94 MB），与旧版相同；74 次 texImage2D 的 CPU 调用累计 200.4 / 209.4 ms。GLB 解码、资源上传和场景构建并发，不能相加成总耗时，亦不能把 WebGL API CPU 调用等同于 GPU 执行。未把等待转移到点出阵后。 / The measured bundle candidate shortens full readiness by roughly 62–65% without reducing title assets or resolution. Residual startup gaps remain. Resource/decoding spans overlap; WebGL CPU call times are not GPU-completion measurements.

呈现 / Presentation: decorative light uses a bounded smooth decay, transient notices retain their original display duration with a softer tail, and decorative camera shake is attenuated with a reduced-motion path. No changes to simulation rules, hit determination, numbers, animation data or the default game clock. / The changes concern visual comfort rather than actual combat timing. They are not a claim of matching a mature commercial action game.

复跑 / Reproduce: `npm ci && npm run bundle` in this game; `node --test test/bundle.test.mjs` validates the generated entry and its source hashes without installing build dependencies. Fresh contexts can open `?quality=high&seed=3&lang=zh&startup-profile=1` and inspect `window.egretGame.startupTrace`; measure full ready and the normal menu-to-game route independently. Engine preparation limitations are recorded in ENGINE-NOTES #8.

**最终名称及高画质设备路线 · Final named build, high quality hardware routes (local static server).**

| 设备 / Device | 完整标题 / Title wall time | 战斗间隔 / Intervals | p95 | Max | >50 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Windows RTX 5090 Laptop, Edge 1280×800/high | 5.30 s | 871 | 4.3 ms | 5.0 ms | 0 |
| Samsung Galaxy Z Fold7 SM-F966U1, Android 17, Chrome 158, Adreno 830, 873×325/high | 1.94 s | 874 | 16.7 ms | 33.3 ms | 0 |

PC: native menu, Chinese/English titles, selection/loadout, pointer lock and relock, pause/resume, natural settlement (loss, 14.27 s). Fold7: native title/settings, joystick outside capture and release, three-contact input and release, pause/resume, natural settlement (loss, 16.12 s), no reported exceptions. Fold7 did not expose `KHR_parallel_shader_compile`; startup trace: 34 downloads (917.9 ms first-start to last-end), 20 GLB decodes (652.0 ms span), stage construction (984.2 ms), overlapping. This is actual hardware driven via browser automation, not manual player ratings. Local phone route does not establish the public internet cold-cache download time or a matched old phone high-quality comparison. / 两台实机均完成自然结算，未改状态或数值，未测整条征途和物理手柄。没有在该采样段截屏；设备连接和先前状态已恢复。

最终回归 / Final regression: 216/216 Node tests, 21 browser acceptance checks, error retry and quality change, pointer and touch acceptance passed. Engine multi-screen verification reports all nine profiles and 63 route checkpoints passing. The title baseline alone was intentionally updated for the new title after review. Automatic SwiftShader p95 is 95.7 ms (60 intervals, F1 fails); the remaining measured automatic checks pass. / 软件渲染未达到桌面 F1，不能以真实硬件的数据替换其自动结果。

## 2026-11-29 节奏与视听呈现 · Virtual tempo and audiovisual presentation

正常交互模式的真实运行时钟调整为 0.90×，固定步长、规则、数值和存档完全保留；固定截图及自动测试路径仍按原速度。移动及其它局内进程亦按统一虚拟时间推进。界面与镜头时钟保持真实时间。模型验证中，稳定显示调度最多增加一显示帧的输入等待，不能称为零额外延迟。 / Normal interactive game time is uniformly 0.90×; the original fixed step, values, save format and rules remain. Deterministic captures and test routes retain the original time; UI/camera retain wall time. Stable scheduling can add one display frame of input wait; no claim of zero latency.

| 设备 / Device (actual local web route) | 旧版 4 s 时间比 / Previous virtual ÷ wall | 新版 / Final refined |
| --- | ---: | ---: |
| Windows / RTX 5090 Laptop / Edge, 1280×800 high | 0.9993 (3.99999/4.003 s) | 0.8994 (3.60/4.0026 s) |
| Galaxy Z Fold7 / Android 17 / Chrome 158 / Adreno 830, 873×325 high | 0.9989 (4.00/4.0044 s) | 0.8972 (3.60/4.0125 s) |

Normal browser inputs, no simulation-state change. PC final narrowed-ribbon route: 833 sampled intervals, p95 4.9 ms, max 19.5 ms, 0 over 50 ms; previous same PC route 864 intervals, p95 4.3 ms, max 8.2 ms. Native menu, pause freeze, pointer lock/relock and natural settlement passed. Fold7 touch ownership, multi-contact release, pause/continue and actual natural result screen passed; see the matched sampling below.

**独立呈现验证 · Independent presentation evidence.** Across five motion sets, neutral loop-end angular difference fell from 9.66° to ~0.001° (sampled pose, not physical foot motion). Adjacent-frame checks cover the seam on six neutral clips. Desktop Node microbench, 6 × 50,000 actor frames with warmup and identical captured data: normal phase 3.607→3.720 μs/actor-frame, artificial seam-concentrated phase 3.711→5.112 μs. These are not mobile CPU timings. PC normal visual route recorded 9 new decorations, peak 1; an independent skill-visual route emitted 6, peak 3, with visibly thinner halo in two third-person stills. First-person camera can occlude the ornament. Six high/three low slots share static motifs; reduced motion suppresses the added decorative motion. No new model, texture, dynamic mesh upload or shadow pass. Floating feedback reuses the existing pool. / 以上是具体呈现指标，并非商业游戏质量或真人手感的等价结论。

35 original synthesized one-shot samples (551,360 values): 31 values outside ±1 before mastering, 0 after; peak 1.1034→0.88, all terminal values zero. 20 samples require no change. Existing volume, music loops and event timing remain. No live loudspeaker listening test was made. / 音频数值回归不等同真人实听。

**Fold7 帧抖动排查 · Phone cadence investigation.** Same physical Fold7, high, WebGL2, identical local assets, old verified published bundle SHA vs final bundle, screenshot-free active-play samples after pause/resume. All final routes actually reached a natural result. An earlier automation attempt tapped during the result transition and returned to title; it was rejected, not counted as acceptance.

| 路线 / Route | Samples | p95 | Max | >50 ms |
| --- | ---: | ---: | ---: | ---: |
| Previous exact bundle, same matched route | 341 | 33.2 ms | 33.3 ms | 0 |
| Final, first matched run | 209 | 49.6 ms | 99.5 ms | 1 |
| Final, rested normal motion (1746×650 actual render) | 382 | 33.2 ms | 49.7 ms | 0 |
| Final, page-only reduced-motion emulation | 213 | 49.8 ms | 132.6 ms | 1 |

Normal rested sample: 31 intervals while the decorative pool was active, p95/max 33.2 ms; 351 inactive, p95 33.2 ms and max 49.7 ms. In first matched run, all 11 ≥40 ms frames occurred while decoration was inactive. Disabling the added decorative motion (verified 0 emissions) did not reliably remove the intermittent longer frames. The phone reports thermal status 0 at both ends of the rested normal route and 0→1 in the subsequent reduced-motion route. This is a confound, not proof of identical conditions or a thermal root cause. Early four-second route peaks were 82.8 ms (old), 99.5 ms (first new), 66.3 ms (rested normal), and 66.4 ms (reduced). The evidence does not establish a causal engine or demo subsystem defect. Keep quality and the bounded decoration pool; further browser/render-stage profiling needed if long frames recur. / 间歇抖动仍存在，不宣称性能完全无回退或根因已修复。所有租约已恢复并释放。

Final regression: 233/233 Node tests, 21 browser acceptance checks including all original goldens (no replacement or threshold changes), pointer/keyboard, routed touch and error/retry/quality switch passed. Reviewed candidate screenshot differences: title 0.01%, choose 0%, fight 1.43%. Automatic SwiftShader F1: 112.4 ms p95 over 55 intervals, remains failing (prior 95.7 ms), separate from hardware. Other measured automatic items pass including 4 viewport sizes, language, storage and recovery. Full campaign, physical gamepad, actual reader audio, real speaker listening, physical iPhone and other browsers not covered. / 此轮没有重跑九屏完整路线，使用现有截图与自动四屏/转屏检查。

## 2026-11-29 动作连续性与移动长帧 · Pose continuity and mobile frame investigation

五套现有真实 GLB 角色与动作数据：最终独立头部显示旋转在普通移动起停、转向的最大相邻帧角差 15.84°→8.20°；既有其它表现状态切换 5.52°→4.17°。其它被测骨骼位置、旋转及头部原点完全相同，原动作事件、虚拟 0.90 时间、数值与规则未改变；标题、骑乘及已有近脸锚定路径保留原样。测试不代表所有技能完整新动作或正面近景。菜单固定目标60Hz首帧位移 3.278%→0.192%，90%落位 1.167→1.033s，减少动效直接固定构图。非交互入场/结束提示牌维持原安全区、时长、文字和即时可读性。 / These scoped animation-presentation changes reduce measured orientation discontinuities without retiming the original authored events. They are not a new full motion-capture library or a commercial-quality equivalence claim.

| 实际设备与路线 / Actual device, local static game | 虚拟时间÷真实时间 / Clock ratio | Samples | p95 | Max | >50 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| RTX 5090 Laptop/Edge, 1280×800 high, final normal | 0.8999 | 876 | 4.3 ms | 8.4 ms | 0 |
| Fold7, old exact published bundle, Chrome trace | 0.8996 | 499 | 16.7 ms | 33.2 ms | 0 |
| Fold7, new, bounded trace + official timing | 0.9018 | 452 | 33.2 ms | 49.8 ms | 0 |
| Fold7, new, no engine timing or Chrome trace | 0.8986 | 392 | 33.2 ms | 49.6 ms | 0 |

Fold7 is the same actual SM-F966U1 (Android 17, Chrome 158, Adreno 830, 873×325/high); timings above are the uninterrupted later play intervals, separate from entry and early four-second samples. Both old and new reach natural settlement through actual browser-generated touch; normal joystick-outside capture, three contacts, pause/resume, PC pointer lock/relock pass. No simulation-state edit. Diagnostic and uninstrumented routes are distinct, variable phone scheduling prevents an assertion of full performance equivalence. / 真机不是尺寸模拟，也不是人工操作主观评分。

**Fold7 分项实测 · Separate performance evidence.**

- Same entry rAF interval 165.8 ms reproduced on the previous and candidate builds. New aligned LoAF 155.2 ms, blocking 0; Play callback 13.8 ms (update 6.7, 2D rendering 7.0); attached World3D update 3.2 ms, render submission 1.1 ms (overlaps Play update). Trace renderer main-task union 29.82 ms; graphics service CrGpuMain nested WebGL CPU work 43.37 ms (old 43.77). These lanes overlap; none is GPU completion or present latency.
- Early play: previous peak 99.4 ms, candidate traced peak 66.3 ms; the latter has LoAF 68.3 ms, Play callback 5.2 ms, World3D update 1.5 / render 0.8 ms; main-task union 5.87 ms, graphics service WebGL 28.87 ms. The separate uninstrumented final run still records 99.5 ms in the early window. Do not claim the occasional long frame is fixed or caused by the new animation. In later steady samples no >50 ms. / 偶发早期帧仍存在，未证实 GPU 硬件执行或合成呈现根因。
- Independent entry listener: 97.8 ms LoAF, pointerup 93.7 ms, 289/523 CPU samples in glTF `copyElements` with accessor/geometry stack, not elapsed-time attribution. This is separate from the rAF/graphics-service windows. A proposed validated fast copy remains open in ENGINE-NOTES #9.
- Opt-in only: `?frame-profile=1` exposes `egretGame.frameProfile()` with two bounded (2048 each) official CPU timing streams. Compare the callback timestamps, do not sum overlapping phases; never treat CPU submit as GPU completion. The short private Chrome trace (27,979,393 B, no loss reported) is scoped before entry through the early play window; no full trace committed. Old trace was truncated but recoverable complete prefix events and marks were aligned. Device leases restored.

Final regression: 243/243 Node, 21 strict browser acceptance checks; pointer, touch, resource error/retry and quality switching passed. Original screenshot references retained. Independent PC visual sequence confirms five actual sampled views of menu/selection/ordinary movement-to-stop; no newly observed head/body clipping at those views, not a complete skill-animation or front-face test. Automatic SwiftShader F1 is 158.3 ms p95 (41 intervals, fails; previous 112.4 ms); other measured automatic items pass, including the four viewport/live resize, language, storage and error checks. Physical hardware, software emulation and human judgments remain distinct. / 未测全征途、物理手柄、完整动作及正面近景、真实扬声器及其它手机浏览器。
