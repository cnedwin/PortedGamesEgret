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
