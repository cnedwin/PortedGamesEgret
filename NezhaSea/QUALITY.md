# 品质验收 · Quality — 哪吒闹海 · Nezha Stirs the Sea

## 2026-11-27 原生集市与屏幕通知 · Native market and screen notifications

- **版本 · Version:** Egret main `94bd70fb26b1f81794c9c6fbbb258c655fcd19df`。官方副本刷新、正式入口重建，265 项运行文件（含游戏源码、引擎 JS 和入口包）与完成验收的候选逐字节相同；仅 pin 和构建元数据改变。无规则、存档、音频及素材改动。 · Official vendor and entry rebuild; all 265 checked runtime paths match the tested candidate byte for byte.
- **适配 · Integration:** 删除画布 ResizeObserver、语义别名代理和法宝/强化卡片自绘文字；使用原生 arrange、标签绑定、叶子按钮面板。固定数量的货架与槽位继续使用普通绑定；拖放、出售确认、分页和下一波操作不变。 · Native screen notifications, labels and leaf-button panels replace the local bridges without changing market operations.
- **自动验收 · Automated:** 正式 Node 32/32；功能字节一致的 Chromium SwiftShader 74/74，包含实际视口缩放、两位数波次与 44 CSS px Pause、正常键盘、模拟手柄、触屏和合成。标题/结算截图差异 0.31% / 0.52%，旧基线未改。 · The approved baselines remain unchanged.
- **PC 硬件 · PC hardware:** Windows Edge 158、WebGPU，1440×850；同 seed 8 的隔离市场场景，改前/改后均 11/11，购买、锁定、点选与拖放神器合成、出售确认、安全进入下一波。短时 wave 1 的 rAF p95 4.3→4.3 ms、最大 16.7→20.8 ms（193→196 样本）；wave 2 p95 4.3→4.3、最大 8.3→8.3 ms（121→127），无 >50 ms、页面异常或失败 HTTP 请求；同构集市和强化卡片视觉一致。 · Hardware keyboard/mouse with a controlled market fixture; times are browser cadence, not GPU execution.
- **Fold7 硬件 · Fold7 hardware:** Chrome 157、WebGPU，实际横竖屏。同市场测试 12/12→12/12；各 121 个短时 rAF 间隔 p95/max 16.7→16.7 ms，零页面错误和失败请求。真实竖屏法宝格、分页、下一波入口前后实拍一致。 · Physical handset, injected actual browser gestures, not human touch or a desktop viewport simulation.
- **限制 · Limits:** 这是定向集市场景而非正常二十波通关；本轮未测物理手柄、Safari、读屏软件、音响听感或最终 140 敌压力。未将短时稳定性外推为整局性能提升。 · Targeted market checks do not certify a natural twenty-wave game, physical gamepads, Safari, screen readers, speaker audio or maximum-enemy performance.

## 2026-11-26 最新引擎、角色与首屏 · Latest engine, actors and startup

- **版本 · Version:** Egret main `0728eccc8ee5340f786fdeacd375927d3d8e315a`。原规则、数值、存档模块未改；引擎副本由官方工具生成。三种哪吒新增共六个待机/滑行姿势的 352×540 透明 WebP（63,916 字节）；复用同一战斗图集。 · The simulation and save sources are unchanged. Three forms share six new idle/glide poses on the existing battle atlas.
- **集中自动验收 · Automated:** Node 32/32，Chromium SwiftShader 74/74，原标题及结算截图差异 0.26% / 0.34%；未修改本轮基线。质量脚本 16 项自动检查通过，0 失败；其余 6 项属人工或设备检查。F1 静置标题 p95 **4.3 ms**（962 样本），L1 限速首屏 **2.0 s / 1.4 MB**（上一轮 3.7 s / 2.6 MB），E2 拒绝 6 个资源时有重试且无未捕获错误。 · All automatic checks pass, including cold loading and failure recovery; baseline files are retained.
- **实际 PC · PC hardware:** Windows、Edge 158、RTX 5090 Laptop、WebGPU，1440×850。新档普通难度以真实浏览器键鼠输入（只读策略）通过第 1–10 波，击败 765 HP 夜叉，进入第 11 波自然失败，678 击杀、5 次合成、解锁莲花，刷新核对存档一致。36/36 检查；未更改规则、生命、物品、珍珠、时间或存档。战场 77,745 个 rAF 间隔 p95 4.3 ms / p99 4.4 ms / 最大 20.8 ms，>50 ms 为 0，Long Tasks 为 0。首屏就绪 983.6 ms，出海到推进观察 133 ms。 · Hardware run used actual input driven by read-only strategy and ended naturally; cadence is browser rAF, not GPU execution.
- **实际 Fold7 · Fold7 hardware:** SM-F966U1、Android 17、Chrome 157、Adreno 830、WebGPU，873×325 横屏及实际竖屏。新档普通难度真实触控通过第 1–10 波，击败夜叉后进入第 11 波自然失败，804 击杀、8 次合成、解锁莲花，刷新核对存档一致。51/51 检查；20,099 个战场 rAF 间隔 p95/p99 16.7 ms、最大 33.2 ms、>50 ms 为 0。独立浏览器 Long Tasks 3 次（71/56/63 ms），不能视作不存在长任务；这些数据不等于 GPU 时间。首屏就绪 1540.3 ms，出海观察 380 ms。 · Real touch was used on the Android hardware. The run ended naturally and the saved unlock persisted; no game values were scripted.
- **最终增量回归 · Final targeted regression:** PC 与 Fold7 的三形态资源、待机、移动及退出；Fold7 集市 12/12（余额不足、购买、留货、换货、双页、点选与拖放合成、出售确认和下一波）；两机横屏 HUD 3/3；Fold7 实际旋转 6/6（411×813→873×325→411×813，Pause 65×44→52×44→65×44 CSS px，继续、移动、松手和页面零滚动）。美术/市场/两位数 HUD 定向验证使用隔离测试局面，不算正常解锁或胜利。 · The full natural route preceded the localized HUD/resize patches. Final builds got targeted checks for forms, market, narrow HUD and live rotation; fixtures are distinct from the natural run.
- **复现与限制 · Reproduction and limits:** 两台自然路线零页面错误和资源 HTTP 错误；最终检查修复 WebGPU 载入图集背压与仅 CSS 尺寸变化不触发 arrange 的问题。详见 ENGINE-NOTES 14/15。未跑动物理手柄、Safari、屏幕阅读软件、完整二十波真人通关、扬声器听感或第 16 波 140 敌人的最终硬件压力测试。旧版本测量保留在下方。 · No page or resource HTTP errors on either natural run. Physical gamepads, Safari, screen readers, human twenty-wave completion, speaker listening and the final 140-enemy hardware stress test remain unverified.


## 2026-11-26 原生浮动摇杆与恢复 · Native floating stick and recovery

- **版本 · Version:** Egret main `253bd197febfff80608fa4b313b4026e5694e23f`。玩法、数值及存档源码没有改动。 · The rules and save sources are unchanged.
- **浏览器自动验收 · Browser acceptance:** 31/31 Node 测试，73/73 Chromium 157 SwiftShader 验收。正常标题/结算与原基线分别相差 0.26% / 0.34%；未更新截图。新增鼠标拖动、原生触摸死区、比例方向、越界捕获及立绘网络拒绝后的重试。 · The rule, save, words and browser walks pass. The approved screenshots remain unchanged. The new cases cover desktop dragging, native touch, and retrying failed portrait downloads.
- **浮动摇杆 · Floating stick:** 390×844 触屏的 4 CSS px 位移为零、18 px 位移为 0.2622。首触点拖出视口到 x=430 时方向为 1，第二触点未接管；松开首触点后归零，页面位移为零。 · The browser's touch protocol verified the original dead zone, proportional motion, outside capture and contact ownership. This measurement uses injected Chromium input.
- **通用品质 · Automatic quality:** F1 静置标题 p95 4.2 ms（961 帧）。T2、T3、O1、I1、I3、A1–A3、S1–S3、E1–E3 均通过。E2 拒绝 5 个资源时没有未捕获错误，界面出现重试。L1 仍为 3.7 s / 2.6 MB，超过 3 秒门槛，是本轮唯一未通过的自动项。 · The generic quality command now passes E2. L1 remains the sole failing automatic check; the original target is retained.
- **恢复 · Recovery:** 定向拒绝三张角色立绘仍可出海；标题的重试按钮重新请求三张图片并返回普通标题。独立的图集生成失败/重载继续通过。 · The optional artwork failure remains playable and can be retried. A forced actor-atlas failure still has a working native reload dialog.

下面保留上一轮及初次迁移的历史环境和数据。 · The following sections retain the earlier engine and migration measurements.

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
