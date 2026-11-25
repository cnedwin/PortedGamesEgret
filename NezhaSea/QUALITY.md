# 品质验收 · Quality — 哪吒闹海 · Nezha Stirs the Sea

## 2026-11-26 引擎复测 · Engine refresh

- **版本 · Version:** Egret main `95897d78095ae8fda9e34dbc13bbbd15db8eaa12`。规则和存档源码逐文件一致。 · Simulation and save source files are unchanged.
- **浏览器回归 · Browser regression:** Node **31/31**，浏览器 **66/66**，零控制台错误。保留原标题、结算基线，差异为 **0.26% / 0.34%**，均在原阈值内。覆盖 Tab 离开嵌入画布、Shift+Tab、Enter/Space、模拟标准手柄的 A、方向键、B 和按住 Start 恢复。 · All checks passed. Both previous baselines stayed within the unchanged threshold. Checks cover focus, modal navigation, idle first input and a held Start through resume.
- **集市 · Market:** 在 1280×800、390×844、844×390 和 768×1024 验证原生文字。1280×800 的八法宝场景最高 **60/60** 条可见文字就绪，连续七轮换货、选中与取消未出现空白。768×1024 注入式测量累计 **3 次缓存拒绝**，最终检查文字均可见。 · Tested native market text across all four sizes. The eight-relic desktop fixture reached 60 of 60 visible captions. Seven repeated restocks and selections stayed complete. The 768×1024 fixture reported three transient refusals, with all visible text prepared at inspection.
- **PC 硬件 · PC hardware:** 本机 Chrome 158.0.8127.37、NVIDIA Blackwell WebGPU。用浏览器键鼠输入验证可见焦点、开场、暂停恢复、集市换货、配对合成与第 2 波，无控制台错误。集市由固定局面驱动。 · The installed Chrome used a hardware WebGPU adapter. Browser keyboard and mouse input drove the game to wave 2 through the dense market fixture without console errors.
- **质量脚本 · Quality command:** 静置标题 F1 p95 **4.2 ms**。限速首屏 **3.7 s / 2.6 MB**，仍超 3 秒目标。通用 E2 阻断资源未触发致命加载，定向图集失败的错误页和重载通过。其他上一轮达标的自动项通过。 · The settled title F1 passes. L1 and generic E2 remain open, while the targeted atlas failure and retry pass.
- **设备限制 · Device limits:** 已授权的 Fold7 已连接。标准唤醒后仍锁屏，Android 限制输入，未完成真机游戏或帧率测量。浏览器触屏和标准手柄样本均为自动注入，物理手柄未测。 · The connected Fold7 remained locked after a normal wake. No real-device gameplay or timing was recorded. Browser touch and standard gamepad input were injected. A physical controller was not tested.

以下为第一次迁移的环境与历史结果。 · The environment and results below document the initial migration.

## 测量环境 · Where it was measured

- 2026-11-25，Windows，Node v26.7.0。Edge Chromium 无头浏览器，WebGL2 SwiftShader 软件渲染。 · Windows, Node v26.7.0, headless Edge Chromium, WebGL2 SwiftShader.
- 首屏限速为下行 10 Mbps、上行 5 Mbps、40 ms 往返和 CPU 降速 ×4。 · First playable screen measured with 10/5 Mbps, 40 ms RTT and ×4 CPU slowdown.
- 命令为 `node tools/quality.mjs NezhaSea --no-write --json`。真机限制另列。 · Automated output from that quality command. Device limits are listed separately.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 9 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 达标 · pass | p95 4.3 ms over 962 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 未达标 · fail | 3.6 s to the first playable screen, 2.8 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "东海" (focus drawn by the game) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 9 named controls, e.g. button "出海", button "怎么玩", button "设置" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: nezha-sea) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: nezha-sea) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 未达标 · fail | 5 files refused; no uncaught error; no error screen with a retry |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

F1 测量的是已静置的标题页。标题画面无变化时暂停绘制，菜单输入、窗口变化和立绘就绪会唤醒引擎。L1 的 3 秒门槛在同机旧 UI 基线也超出。E2 默认拒绝的五个文件没有触发致命错误。单独验收强制角色图集创建失败，白鹭错误界面和重载均通过。 · F1 is sampled at the settled title. The idle view stops drawing until input, layout or artwork changes. The same host also missed the 3-second L1 target on the legacy interface. E2's five generic file refusals did not cause a fatal load. A separate injected atlas failure verified the Egret error screen and a working reload.

## 同机性能对照 · Matched performance

| 场景 · Scenario | 旧界面 `b5628eb` | 旧界面 `51b6175d` | 引擎 UI `51b6175d` |
|---|---:|---:|---:|
| F1 静置标题 p95 · Idle title p95 | 16.7 ms | 16.7 ms | 4.3 ms |
| L1 限速首屏 · Throttled first playable | 3.5–3.6 s / 2.4 MB | 3.6 s / 2.5 MB | 3.6 s / 2.8 MB |
| 1280×800，不密集战斗 p95 · Sparse combat | 20.8 ms | — | 19.7 ms |
| 1280×800，第 16 波 139–140 敌人 p95 · Dense combat | 25.1 ms | — | 25.0 ms |
| 同一密集段 p99 · Same dense segment | 33.4 ms | — | 29.2 ms |

密集段采样 5.6 秒。旧版 286 帧，新版 322 帧。新版全宽画布实验为 30.2 ms p95，战斗画布恢复到战场大小后降至 29.1 ms，最终版包含 HUD 文案按变化刷新，整段复跑为 25.0 ms。最终样本无超过 50 ms 的帧。该对照属于同机软件渲染，包含浏览器排程、玩法与绘制。集市文字回退画布在 390×844 的 10 次交互读回中位数 0.95 ms，范围 0.5–3.0 ms，未包含 GPU 上传和合成。

Each dense sample covers 5.6 seconds, with 286 and 322 frames respectively. The initial expanded battle canvas was 30.2 ms p95. Limiting the canvas to the field improved it to 29.1 ms. The final build also updates formatted HUD labels only when visible values change. Its full run was 25.0 ms p95 with no interval above 50 ms. Results include game work, rendering and browser scheduling on one software-rendered host. The text fallback at 390 × 844 made ten canvas readbacks at a 0.95 ms median (0.5–3.0 ms), excluding GPU uploads or compositing.

## 人工与真机结果 · By hand and on devices

- 浏览器键盘、触屏多点、模拟标准手柄，以及四尺寸中英文截图已经复测。胜负、旧档和首领节点用固定测试局面覆盖。 · Tested browser keyboard, multitouch input, a simulated standard gamepad and both languages at four sizes. Fixed states exercised defeat, victory, old saves and the Boss.
- 三星 Fold7 连接到调试环境，进入输入步骤前休眠，唤醒后仍锁屏。本轮未完成手机真机游玩。物理手柄、屏幕阅读软件、Safari、完整二十波真人游玩及外放实听未验收。 · The connected Fold7 slept before input and woke to its lock screen. Physical mobile gameplay, a hardware gamepad, a screen reader, Safari, a full human twenty-wave run and speaker listening were not verified.
- 画布缩放用四个标准尺寸复跑。390×320 等更矮窗口的集市内容仍可能重叠。 · The four standard sizes and live resizing were checked. Very short windows such as 390 × 320 can still crowd the market.

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
