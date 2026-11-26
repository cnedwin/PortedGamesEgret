# 品质验收 · Quality — 漕河守闸 · Canal Watch

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项来自 `node tools/quality.mjs CanalWatch --no-write --json`，另有独立浏览器和真机验收；未覆盖的项目不计通过。· Automatic checks, independent browser acceptance and physical device results are distinguished.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-26；Egret Rebuild `8e70dcb3a8a0b40c9966483c92cb9f691a1cefd8`。
- 软件渲染 · Software: Windows / Node 26.7.0 / headless Edge 158 / SwiftShader, 1280×800; start-up 10/5 Mbps, 40 ms RTT, CPU ×4.
- PC 真机 · Device: Windows, headed Edge 158.0.4370.33, ANGLE NVIDIA GeForce RTX 5090 Laptop GPU, 1280×800, real mouse input via automation.
- 手机真机 · Device: Samsung Fold7 SM-F966U1, Android 17, Chrome 157.0.8103.78, Adreno 830, WebGPU; internal display 873×325 and 411×813 CSS pixels, DPR 2.625; trusted touch events via device browser.
- 帧时间使用浏览器 rAF 间隔，非 GPU 单独执行时间。· Frame cadence is browser rAF, not isolated GPU time.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 短关通过 · challenge pass | Fold7 five-wave lower route plus standard setup and pause, not full twelve-wave standard |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 8 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 未达标 · fail | p95 25.1 ms over 201 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run | Fold7 only (flagship, not mid-range): p95 16.7 ms |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.6 s to the first playable screen, 2.6 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · manual | 已检查 · checked | Native Chinese/English title, picker and field screenshots; 51-check browser suite |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "漕河地图" (focus drawn by the game) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · manual | 未运行 · not run | Keyboard route with deterministic outcome fixture passed, not manual full normal game |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 8 named controls, e.g. button "寻常", button "险峻", button "双闸截漕" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: canal-watch) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: canal-watch) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · manual | 自动覆盖 · automated | Corrupt save notice and fresh start passed acceptance |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 未达标 · fail | 1 files refused; no uncaught error; no error screen with a retry |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run | Pause/resume time and independent toggles verified; actual speaker/return audio not listened to |

## 人工与真机结果 · By hand and on devices

### 迁移前后 · Migration regression

- 旧版 b5628eb：26/26；只换引擎后 8e70dcb3 上的旧 UI：26/26。四种窗口、四类界面留存了 16 张对照截图。· 26/26 before and after the engine-only transition, 16 comparison screenshots.
- 新原生 UI：35/35 Node；51/51 浏览器，三张视觉基线（标题、开局、结算）独立复跑像素差异 0.00%。四视口真实交互冒烟均通过；地图与塔位最大偏差 <0.02 CSS px。· 35/35 Node, 51/51 browser, 0.00% differences against three reviewed baselines, four layout smoke routes.
- 原版规则 `src/sim/`、`src/saves.mjs` 与美术资源未改。原本 552 行 CSS 变为 11 行（非空行）；所有可操作界面由 `game.show` 原生视图绘制。 · Rules, save format and assets unchanged; 552 nonblank CSS lines reduced to 11; native views own all interaction.

### 真机短关结果 · Physical-device challenge

| 设备 · Device | 路线 · Route | 波次 · Waves | 剩命 · Lives | 上/下截船 · Upper/lower | 登陆/拦下/漏兵 · Landed/stopped/leaked | rAF p95 | >50 ms |
|---|---|---|---:|---|---|---|---:|
| PC RTX 5090 | Upper | 5/5 win | 19 | 10 / 0 | 26 / 26 / 0 | 4.3 ms, 4.4 ms in preparation | 2 (~99.9 ms) |
| Fold7 landscape | Lower | 5/5 win | 7 | 0 / 9 | 26 / 17 / 9 | 16.7 ms | 0 |

- PC：标准战场 11/11 操作验收，上闸五波完整路线 10/10；×3 由实际 UI 设置，模拟时间 333.3 s，五波 rAF 约 238–239 FPS，观察到两帧 99.9 ms，未定位为引擎或业务原因。· Physical mouse controls, natural five-wave upper route, no game state injection.
- Fold7 横屏：20/20；短关全程由可信触摸输入，52 次 touch start / 208 个可信指针事件，模拟时间 355.85 s；每波 1160–1826 帧样本，约 60.33 FPS，最大 16.7 ms；结算全部五项数值一致，标准存档未改变。· Physical landscape touch controls, a complete lower route and matching scorecard.
- Fold7 竖屏：13/13；411×813 CSS，23 次触摸开始，92 个可信指针事件，正常建造、预览、升级、出售、设置存储与暂停恢复通过；无需滚动即可操作，未专门验证实际竖屏滚动。· Portrait standard setup and settings; no separate physical scroll gesture.
- 两台设备均为最终候选，核对 26/26 关键文件哈希且没有页面或控制台错误；真机输入通过自动化工具完成，不是玩家盲测。· 26/26 file fingerprints matched on both devices, zero app errors, automated actual-device input.
- 自动品质工具 F1 在并行运行时为 33.4 ms，单独复跑 25.1 ms，均高于 16.7 ms 软件基准；真实 GPU 的主流程符合上表。这不是对 GPU 执行耗时的归因。· F1 software-rendered title target was not met; real GPU measurements are separate.
- E2：拒绝一项装饰标题图资源，无未捕获异常，但没有单独重试按钮；标题可用性与装饰图缺失接受标准不同。· A refused decorative title image does not crash; the standalone retry check still fails.
- 未覆盖：标准 12 波两种难度完整真机手动战斗、低/中端设备、系统读屏器和扬声器实听、PC 两次长帧归因。· Full physical twelve-wave runs on both difficulties, low/mid-range devices, actual screen-reader and speaker listening, and PC long-frame attribution remain unverified.
