# 品质验收 · Quality — Mechanism City · 千机巧匠

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs MechanismCity` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs MechanismCity`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-20
- 浏览器 · Browser: 无头 Chromium 153.0.8010.12，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Linux 容器 · a Linux container, linux x64, Node v22.23.4
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 不达标 · fail | 4 of 4 under 44×44: 开始 115×28; 选关 55×22; 开场短片 55×22; 设置 55×22 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 不达标 · fail | p95 50.0 ms over 105 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.5 s to the first playable screen, 2.2 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 不达标 · fail | no way to choose English found |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "千机巧匠 Mechanism City" (focus drawn by the game) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 4 named controls, e.g. button "开始", button "选关", button "开场短片" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 不达标 · fail | prefers-reduced-motion is not read |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: mechanism-city) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: mechanism-city) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 不达标 · fail | 1 files refused; uncaught: pageerror: ASSET_LOAD_FAILED: A provider failed to load the asset. What it threw is in cause. Cause:; no error screen with a retry |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: T2, F1, I1, A3, E2。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.

## 2026-11-28 WebKit 兼容回归 · WebKit compatibility regression

- 引擎副本 · Engine copy: `82561d6338a805f0e0459a2d5d42a284f9385b30` (official vendor tool).
- 环境 · Environment: Windows 上的 Playwright WebKit，iPhone 15 Pro 设备配置（393×659 页面视口、DPR 3），全新浏览器上下文及实际自动化触屏点击；改前 GitHub Pages，改后本地同一游戏目录。**不是 iPhone 或 iOS Safari 真机。** · Windows Playwright WebKit, iPhone 15 Pro device profile (393×659 page viewport, DPR 3), fresh context and actual browser touchscreen taps; public Pages baseline, local repaired build. **Not physical iPhone or iOS Safari.**
- 改前 · Before: 无 Web Audio 宿主时启动中断；修复后暴露文字状态检查错误。开始按钮也会被等待开场视频播放的未决 Promise 阻住。 · Missing Web Audio initially stopped startup; the text-state error appeared after that fix. A pending opening-video play promise could also prevent the first level from opening.
- 改后 · After: 实际触屏点击「开始」进入短片状态，跳过按钮可用；点击「跳过开场短片」进入初试机弩，关卡和对白文字可见。 · Touching Start entered the film state; tapping the now-available Skip opened the first level with its HUD and dialogue visible. 自动回退独立复跑：不点击跳过，从出现短片状态后的采样起 9,129 ms 进入首关，无页面或网络错误。 · In a separate run, without tapping Skip, the first level opened 9,129 ms after the film-state sample, with no page or HTTP errors. The optional film has a 10-second first-frame deadline; its three focused Node tests cover timeout, rejection and disposal.
- 验证 · Evidence: title and post-tap screenshots visually reviewed; zero uncaught page errors, console errors and HTTP error responses on the repaired route. The directory's `node --test test/*.test.mjs` suite passed 67/67. 未改写旧的截图与帧率基线。 · Existing screenshot and timing baselines are unchanged.
- 范围 · Limits: 本轮为启动与代表性触屏路线，不是整局；没有测物理 iPhone、iOS Safari 音频、Safari GPU/帧时间、真机刘海区域或系统读屏。Windows WebKit 缺少 Web Audio 不代表实际 iPhone Safari 缺少 Web Audio。 · Startup and representative interaction, not a full session; no physical iPhone, iOS Safari audio, Safari GPU/frame time, physical notch or system screen reader was tested. Windows WebKit's absence of Web Audio does not imply the same limitation on an iPhone.
