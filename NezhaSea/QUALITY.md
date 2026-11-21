# 品质验收 · Quality — 哪吒闹海 · Nezha Stirs the Sea

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs NezhaSea` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs NezhaSea`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-21
- 浏览器 · Browser: 无头 Chromium 153.0.8010.12，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Linux 容器 · a Linux container, linux x64, Node v22.23.4
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 7 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 达标 · pass | p95 16.8 ms over 241 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.5 s to the first playable screen, 1.8 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "Young NezhaStarts with the Uni" (outline) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 8 named controls, e.g. button "Set out", button "Young Nezha Starts with the Universe Ring; even in everything. Not played yet", button "Lotus Body · Locked Starts with the Sky Ribbon; more health and mending, a little slower. Hold wave 10 to unlock" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: nezha-sea) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: nezha-sea) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 不适用 · n/a | the game loads no image, sound, font or data file |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: 无 · none。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.

## 人工与真机结果 · By hand and on devices

- A1m、S4：由本目录的 `test/accept.mjs` 在无头 Chromium 里覆盖——只用键盘走完标题、选难度、设置、出海、走动、暂停、升级、集市里买、合成、合成神器、下一波、失守、再出海、守住和回标题；存档改坏后标题显示提示并重新开始。没有由人另做，也没有用真读屏。 · Covered by this folder's acceptance script in headless Chromium: the whole game by keyboard, and the notice after a broken save. Not done again by a person, nor with a real screen reader.
- I2：画布上的字是伤害数字。首领登场提示取自文字表，显示在血条下方。可从标题或暂停菜单切换语言。 · The canvas shows damage numbers. Boss notices from the word table appear below the boss health bar. Change languages on the title or pause menu.
- 另量 · Also measured：第 9、16 波中途 p95 16.8 ms；场上兵数顶到上限 140 时 p95 33.3 ms（无头 SwiftShader，540×960 和 1280×800）。 · Mid-game waves at 16.8 ms p95; 140 soldiers at 33.3 ms, headless.
- T1、F2、E4：未运行 · not run.

## 「出海」输入与呈现追踪 · Set out input and presentation trace

从仓库根目录运行 `node NezhaSea/test/serve-input-trace.mjs 52790`。打开终端打印的两个地址。两条路线返回同一版游戏和相同的资源内容，仅慢速路线的 `vendor/robust-predicates/esm/util.js` 延迟 5 秒。均禁用 HTTP 缓存，游戏种子相同。 · Run the command from the repository root and use the two printed URLs. Both lanes serve identical assets with the same seed and no HTTP cache. Only the slow lane delays the named dependency by five seconds.

1. 每次使用新建测试页，在「出海」可点前开始采集。固定设备、方向、输入方式和渲染后端。分别保留正常和慢速的首帧及首波记录。 · Record from before the title becomes actionable. Use a fresh test tab and the same hardware, orientation, input method and backend.
2. 分开记录按下、松手和 `click` 的事件时间、派发或 `processingStart`、处理结束和首个推进帧。浏览器自动化触摸和 Android 系统输入应分别报告。 · Record the event, dispatch and handler timestamps for each input stage, then the first advancing frame. Label the input method.
3. 在 Chrome 追踪中用精确的输入延迟 ID 关联浏览器与渲染器。再核对同一输入的 surface frame ID、Viz 聚合后的 display frame ID 和呈现反馈。以无损字符串保留 64 位 ID。将缺少关联的阶段记为未知。相邻的 rAF 时间、LoAF 和提交时间不能代替同一帧的呈现。 · Join browser and renderer on the exact input latency ID, then match the surface frame through Viz aggregation to the display frame and its presentation feedback. Preserve 64-bit IDs losslessly and identify missing links explicitly.

真机对照固定在公开版 `b5600046`，Fold7 Chrome 的慢速复跑曾录到 **66.6 ms** 的 rAF 间隔，完整落在松手与点击派发的等待段。提前完成开场音效和标题曲的实验也出现过长帧，因此本次发布仅增加复跑入口和记录。 · The slow Fold7 route reproduced a 66.6 ms rAF interval while release and click dispatch were pending. The experiment that prepared opening sounds earlier still exhibited long frames. This release adds the diagnostic route and notes.

Fold7 Chrome 157 的无损追踪把松手关联到了对应的 surface frame。以 DOM 开始派发 `click` 为零点，单位为毫秒。第一条慢速样本记录到不同的一次 74.7 ms rAF 间隔，跨过点击。最后一列使用本节的复跑工具，点击后的采集窗口延长至 500 ms，该次未见超过 50 ms 的帧间隔。 · Lossless traces link the release to its surface frame. Times are relative to DOM click dispatch. The first slow sample had a separate 74.7 ms interval that crossed the click. The final column uses the documented runner and a 500 ms post-click trace window.

| 关联阶段 · Linked stage | 正常 · Normal | 慢速初测 · Slow | 慢速复跑 · Slow repeat |
| --- | ---: | ---: | ---: |
| Chrome 输入时钟的松手 · TouchEnd source | −63.73 | −49.80 | −42.76 |
| 浏览器 UI 发给渲染器 · Browser send | −8.14 | −7.20 | −4.14 |
| 渲染器主线程接收 · Renderer main handled | −3.21 | −5.26 | −2.24 |
| 同一输入关联的 surface 提交 · Surface submit | +14.87 | +67.34 | +19.85 |
| Viz 接收该 surface · Viz receive | +15.08 | +67.73 | +20.00 |
| 对应 display 帧聚合 · Display aggregation | +23.61 | 未关联 · unlinked | +27.80 |
| 对应 display 帧的交换确认 · Display swap ACK | +40.45 | 未关联 · unlinked | +44.26 |

交换确认是浏览器记录的事件。它与屏幕扫描输出分开，历史 66.6 ms 样本也缺少足够的帧编号来追到 Viz。 · Swap ACK is a browser event, separate from physical scan-out. The historical 66.6 ms sample has no verified frame-ID chain into Viz.
