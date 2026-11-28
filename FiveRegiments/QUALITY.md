# 品质验收 · Quality — 五营争锋 · Five Regiments

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs FiveRegiments` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs FiveRegiments`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-28
- 浏览器 · Browser: 无头 Chromium 157.0.8103.6，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Linux 容器 · a Linux container, win32 x64, Node v26.7.0
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 7 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 不达标 · fail | p95 129.2 ms over 51 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.5 s to the first playable screen, 3.4 MB |
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
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 达标 · pass | 34 files refused; no uncaught error; offers to try again |
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
