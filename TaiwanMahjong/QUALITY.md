# 品质验收 · Quality — 台灣十六張麻將 · Taiwan Sixteen-Tile Mahjong

2026-11-26。引擎副本为 `2e53f45f`。按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。横竖屏与牌局测试分别记录无头浏览器和真机结果。 · Tested with engine copy `2e53f45f`, using separate browser and physical-device checks.

## 自动验收 · Automated checks

- `node --test test/*.test.mjs` 通过 30 项。覆盖台数、庄家轮换、四圈结束、收支守恒、旧档和坏档。 · All 30 tests passed for scoring, dealer rotation, four winds, balanced payments and save compatibility.
- `node test/accept.mjs` 使用无头 Chromium、SwiftShader。覆盖语义树、键鼠、横竖屏触控、牌局行动、结算、战绩和标题／规则截图基线。 · Headless Chromium with SwiftShader covers browser semantics, mouse and keyboard, touch in both orientations, calls, settlements and records, with title and rules baselines.
- `node tools/quality.mjs TaiwanMahjong --no-write --json` 在 Windows 的无头 Chrome 上通过 14 个自动检查（T2、T3、F1、L1、O1、I1、A1、A2、A3、S1、S2、S3、E1、E3）。390×844 标题页 10 个控件均达到 44×44 CSS 像素。10/5 Mbps、40 ms 往返、CPU 降速 ×4 时，标题可操作耗时 1.7 秒，传输 2.7 MB。 · Fourteen generic checks passed. All ten projected title controls measured at least 44 × 44 CSS pixels in the 390 × 844 viewport. The title was playable in 1.7 seconds with 2.7 MB transferred on the throttled run.
- I3 报警来自旋转后宽度较窄的透明无障碍投影节点。已分别检查横、竖屏的英文标题和规则截图。 · I3 reports narrow transparent accessibility nodes after rotation. English title and rules were checked separately in landscape and portrait screenshots.
- E2 的通用规则遗漏繁体「重試」。单独阻断大厅主图和头像的首次请求后，繁中键盘与英文鼠标均能重试，且仅重新请求失败的插画。全阻断时仍能开局。音频重试单独未测。 · E2's generic text check misses the Traditional Chinese retry label. Targeted fault injection recovered each rejected title image using keyboard or mouse and left the game playable with all startup media blocked.

## 真机验收 · Physical devices

- Windows Chrome 158，GeForce RTX 5090 Laptop GPU，WebGPU。普通难度和内置「轻快」节奏，以浏览器键鼠事件打一将共 26 局，东、南、西、北分别 7、10、5、4 局。耗时 14 分 51 秒。选择、出牌、吃、碰、槓、胡和过均通过实际控件，托管关闭，牌局数据由正常规则产生。终局四家分数合计为零，刷新后保留 26 局的战绩。 · Windows completed a full four-wind match with 26 hands in 14:51 using normal rules and the built-in brisk pace. The driver sent browser inputs through the actual controls and left autoplay off. Scores balanced and the record survived reload.
- Galaxy Z Fold7，Android 17，Chrome 157，WebGPU。873×325 CSS 横屏通过两组吃牌候选、返回保持叫牌机会和选择第二组。411×813 CSS 竖屏通过出牌、碰、槓、自摸、暂停续播、四家结算和刷新读回战绩。按默认节奏完成东风圈 7 局，耗时 7 分 47 秒，托管关闭。使用 CDP 在真机 Chrome 注入触控。 · Fold7 verified branching chow in landscape and completed a seven-hand East round in portrait at normal pace using browser-injected touch. The record survived a page reload.
- Fold7 竖屏完整东风圈的首段 3.8 秒内，浏览器帧间隔 p95 为 16.7 ms，最长 33.4 ms。语音独立开关经验证，暂停冻结播放时间，恢复继续同一条语音。 · The 3.8-second frame pacing sample recorded 16.7 ms p95 and 33.4 ms max. Voice mute worked independently and the same clip continued after resume.
- 两场完整对局使用相同引擎运行时和规则，最终布局与模态框修正另外回归。扬声器实听、手指触控和真实读屏播报尚未覆盖。 · Both long matches used the same engine runtime and rules. Final presentation fixes had separate regression coverage. Speaker listening, finger input and live screen-reader speech are pending.

## 2026-11-26 · 引擎 `8e70dcb3` 与繁中文字清晰度 · Engine `8e70dcb3` and Traditional Chinese legibility

- 保留 1280×720 牌桌设计坐标及 960×540（竖屏交换宽高）的引擎逻辑舞台。调整小字号和对比度，并由实际 CSS 显示尺寸、设备像素比选择白鹭原生 `pixelRatio`；不低于既有默认值且以 2× 为上限。在较大的 PC 窗口补足栅格分辨率，手机不无谓扩大渲染目标。牌局规则、操作逻辑和存档格式不变。 · The table's design coordinates and three-quarter logical stage are unchanged. Typography and contrast are refined; the engine chooses its native pixel ratio from the actual CSS size and device density, bounded by the existing default and a 2× ceiling. This improves larger desktop rendering without unnecessarily increasing the mobile target. Rules, controls and save format are unchanged.
- 最新候选的 `node --test test/*.test.mjs` 为 **32/32**，含自适应像素比、原存档与规则等回归。 · All 32 Node tests passed, including the display-density tests and existing save and rules regressions.

### PC 实际设备 · PC physical device

Windows Chrome 158、GeForce RTX 5090 Laptop GPU，硬件 WebGPU。使用实际浏览器输入事件的专项路线 **12/12** 通过；完成一把牌的专项路线耗时 29.545 秒，四家结算为 1600／−500／−600／−500（守恒）。无浏览器错误。CSS 画面 1280×720、DPR 约 1 时，实际引擎画布 1281×721；文字缓存拒绝 0 次，使用 1 张图集。 · Hardware WebGPU on the RTX 5090 Laptop GPU with Chrome 158 passed all 12 focused assertions. The focused one-hand route took 29.545 seconds and settled to 1600/−500/−600/−500. No browser errors were observed. At a 1280×720 CSS display and approximately DPR 1, the backing canvas was 1281×721 with zero text-cache refusals and one atlas.

### Galaxy Z Fold7 实际设备 · Galaxy Z Fold7 physical device

Android 17、Chrome 157、硬件 WebGPU。使用 CDP 向真机浏览器注入触控；测量为浏览器帧间隔，不是 GPU 内部耗时。 · Hardware WebGPU on Android 17 and Chrome 157, with CDP-injected touch on the physical phone. Timings below are browser frame intervals, not isolated GPU timings.

| 实际视口与设备像素比 · Viewport and device pixel ratio | 功能断言 · Assertions | 平均 FPS · Mean FPS | p95 帧间隔 · Frame interval | 最大帧间隔 · Max | 源文件指纹 · Source asset fingerprints |
| --- | ---: | ---: | ---: | ---: | ---: |
| 竖屏 · Portrait 411×813 CSS, DPR 2.625 | 19/19 | 59.53 | 16.7 ms | 49.8 ms | 16/16 |
| 横屏 · Landscape 873×325 CSS | 11/11 | 60.07 | 16.7 ms | 31.5 ms | 16/16 |

竖屏覆盖碰、槓、自摸、结算及刷新读档；横屏覆盖两个吃牌组合及返回后的焦点恢复。两场均无浏览器错误；采样内未出现超过 50 ms 的帧间隔。验收结束释放手机测试控制并恢复测试前状态。 · Portrait covered Pong, Kong, self-draw, settlement and reload; landscape covered both Chow choices and focus restoration. Neither had browser errors or sampled frame intervals above 50 ms. The device test lease was released and restored afterward.

无头 Chromium／SwiftShader 完整功能回归通过：东风圈、原生焦点与滚动、合法吃／碰／槓／胡、自摸、坏档恢复和语义树。首次对照旧截图仅标题（3.98%）与规则（7.47%）因清晰度调整超限；人工审阅后重拍两张基线，独立复跑同一截图步骤，两张差异均为 0.00%。 · The full headless Chromium/SwiftShader functional walk passed, including the East round, native focus and scroll, legal calls and wins, corrupt saves and semantics. The old title (3.98%) and rules (7.47%) screenshots alone exceeded the limit after the deliberate clarity change; both were visually reviewed, recaptured and independently compared again at 0.00% difference.

通用品质检查通过 14 项，限速首屏 1.6 秒（3.1 MB）。I3 仍会将旋转后的透明语义节点判为裁切；有意增大的字号曾导致英文难度说明越界，局部收紧英文窄卡片后，1280×720 与 390×844 复查均无实际溢出。E2 的繁体「重試」误报也已复核：首次阻断两张插画，实际点选「重試載入插畫」后均返回 HTTP 200，游戏可正常开局，无未捕获异常。 · Fourteen generic checks passed, with a throttled start-up of 1.6 s (3.1 MB). I3 still flags the projected semantic nodes that rotate; a real English difficulty-caption overflow was fixed by sizing compact English cards separately and rechecked visually at 1280×720 and 390×844. E2 misses Traditional Chinese retry wording; blocking each title image once and clicking the native retry recovered both with HTTP 200 and no uncaught exception.

本轮实机为专项回归，未重新打完一将，也未验证真人手指输入、扬声器主观听感或真人读屏。 · The hardware runs were focused regressions. A fresh full four-wind match, unaided finger input, subjective speaker listening and live screen-reader speech are not covered by this round.
