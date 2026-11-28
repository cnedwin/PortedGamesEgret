# 品质验收 · Quality — 锦绣飞车 · Jinxiu Rally

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs Rally` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs Rally`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-27
- 浏览器 · Browser: 无头 Chromium 158.0.8127.37，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Linux 容器 · a Linux container, win32 x64, Node v26.7.0
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 达标 · pass | Fold7 external panel, 14/14 native UI route; details below |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 4 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 不达标 · fail | p95 1509.8 ms over 13 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.6 s to the first playable screen, 3.0 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "锦绣飞车" (outline) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 3 named controls, e.g. button "开始", switch "声音", button "English" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: jinxiu-rally) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: jinxiu-rally) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 达标 · pass | 1 files refused; no uncaught error; offers to try again |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: F1。中端设备 F2、声学/后台复归 E4，以及人工项（I2、A1m、S4）未运行，除非上表或后续验收另有记录。/ Mid-range F2, acoustic/background E4 and manual I2, A1m, S4 were not run unless recorded above or below. 自动工具上方 Linux 容器字样为通用环境标签；此次实际 Node `win32 x64`，使用 Windows 上的无头 Chromium 软件渲染。/ The automatic tool's generic container label above says Linux; this run actually reported `win32 x64` and headless Chromium software rendering on Windows.

同引擎 DOM 软件渲染留底 F1 p95 1316.6ms，新原生 1509.8ms（13 帧）；都是不达标的极慢软件光栅化样本。普通 `node vendor/egret.mjs verify` 的软件渲染基础检查仍 7/7 通过。完整合法比赛/截图检查另使用明确指定真实显卡的无头浏览器；不能把该环境称为手机真机。/ The same-engine DOM software baseline F1 was 1316.6ms p95, versus 1509.8ms (13 frames) for native UI; both fail under slow software rasterization. Normal software `node vendor/egret.mjs verify` still passes seven of seven basic checks. The full legitimate-race and screenshot checks use an explicitly selected hardware GPU in a headless browser; these profiles are not physical phones.

## 原生 UI 改造前后：同引擎真机对照 · Same-engine native UI comparison on physical hardware

旧界面留底使用只升级引擎副本、保留 DOM 的 `2c06e203`；新界面使用同一个 Egret main `8ef4cf3a2cf507c58665de9f9b43c63b379121c2`，避免将引擎版本差异混入界面对照。两者均为 High 画质，本地 HTTP、正常游戏 UI 选择团团与一圈赛事（seed 7），通过真实浏览器键盘或触屏事件完成赛道，连续采集 `requestAnimationFrame` 帧间隔。只读赛道感知选择输入方向，未修改赛车规则、位置、时间、道具或结算。实际对手排序和相遇、碰撞、镜头位置有差异，单次圈速和 3D draw 数不是严格相同的工作量。标题可操作时间是导航到真实标题就绪，不能与上表自动 L1 指标混用。

The baseline is the engine-only DOM revision `2c06e203`; both versions use Egret main `8ef4cf3a2cf507c58665de9f9b43c63b379121c2`, High quality, local HTTP, Panda, one lap and seed 7. An input driver reads the course and sends normal browser keyboard or touch events throughout the race without changing the simulation, positions, time, items or results. Frame intervals are sampled on `requestAnimationFrame`. Opponent order, encounters, collisions and camera positions vary; lap duration and World3D draw counts are not identical workloads. Title readiness is navigation to the actual interactive title, not the automatic L1 definition above.

[四轮实测简表（JSON） / machine-readable four-run receipt](test/evidence/physical-ab.json) 保存设备信息、逐项验证、实际圈数和结算及各窗口采样统计。/ Records devices, actual checks and race results, and sampled phase statistics.

**Windows Edge — NVIDIA GeForce RTX 5090 Laptop, ANGLE D3D11 / WebGL2，1280×800 CSS px，DPR 1。**

| 场景 · Phase | 帧间隔 p95，旧 → 新 / ms | 最大帧间隔，旧 → 新 / ms | 3D draw 中位数，旧 → 新 | 原生 2D 绘制 / 更新 | 原生 2D `texSubImage2D` 次数 |
|---|---:|---:|---:|---:|---:|
| 标题 · Title | 4.3 → 4.3 | 4.4 → 4.4 | 91 → 91 | 0 / 601 | 0 |
| 选车 · Select | 4.3 → 4.3 | 4.4 → 12.5 | 80 → 81 | 0 / 599 | 0 |
| 暂停 · Pause | 4.3 → 4.2 | 8.4 → 4.3 | 136 → 136 | 0 / 603 | 0 |
| 比赛 · Race | 4.3 → 4.3 | 70.8 → 8.9 | 130 → 134 | 12002 / 12880 | 0 |
| 结算 · Results | 4.3 → 4.3 | 8.4 → 12.5 | 112 → 128 | 1 / 598 | 1 |

- 两轮均通过真实赛事 9/9 项检查、8 人结算、暂停/继续、返回标题，未观察到浏览器错误或 context loss。比赛阶段记录 11,755 → 12,879 个帧间隔，>50ms 为 1 → 0；单轮标题可操作 4,431 → 4,959ms（不能据此断言冷启动回归或改善）。旧版不存在引擎 2D overlay，不能把 DOM 的绘制或纹理流量当成 0。新版静止菜单没有提交新的 2D 帧，比赛因 HUD 动态变化仍按需更新；结算中其他赛车完成后仅刷新一次。WebGL API 调用数不等于实际 GPU 传输字节数，3D draw count 也不是 GPU 时间。/ Both runs passed all nine physical-route checks, including one complete lap, eight result rows, pause/resume and return to title, with no browser errors or context loss. Race samples: 11,755 → 12,879; >50ms: 1 → 0. In a single run title readiness was 4,431 → 4,959ms, not evidence by itself of a start-up regression or improvement. The old DOM has no engine overlay, so its browser painting/texture traffic is not assumed to be zero. Static native menus skip new overlay submissions; the race HUD updates on demand, and results redraw once as remaining racers finish. API call counts are not GPU bytes or GPU duration.
- [PC 改造前后真实截图 / PC actual before-after captures](test/evidence/pc-high-before-after.jpg)：标题、选车、比赛、暂停、结算均为实际游玩时捕获，非设计图。/ All five checkpoints are captured while running the game, not mockups.

**Samsung Galaxy Z Fold7（SM-F966U1, Android 17, Chrome 157.0.8103.78，Adreno 830 / WebGL2）**。真实外屏 1080×2520 物理像素；浏览器竖向 411×813、横向 873×325 CSS px，DPR 2.625。使用专用临时浏览器页并通过设备的浏览器触控通道发送真实设备上的输入事件；不是桌面模拟，也不是人手操作。测试结束恢复设备原方向、息屏设置、前台应用、已有浏览器页及临时网络配置。/ Physical outer panel; browser input delivered to the actual Android Chrome via its touch channel, not desktop emulation or human fingers. Device orientation, stay-awake settings, foreground app, existing tabs and temporary forwarding were restored.

| 场景 · Phase | 帧间隔 p95，旧 → 新 / ms | 最大帧间隔，旧 → 新 / ms | 3D draw 中位数，旧 → 新 | 原生 2D 绘制 / 更新 | 原生 2D `texSubImage2D` 次数 |
|---|---:|---:|---:|---:|---:|
| 标题 · Title | 16.7 → 16.7 | 132.7 → 33.2 | 87 → 86 | 0 / 241 | 0 |
| 选车 · Select | 16.7 → 16.7 | 24.9 → 58.0 | 81 → 85 | 0 / 211 | 0 |
| 暂停 · Pause | 16.7 → 16.7 | 16.7 → 16.7 | 130 → 91 | 0 / 160 | 0 |
| 比赛 · Race | 16.7 → 16.7 | 16.7 → 116.0 | 100 → 98 | 9782 / 10832 | 0 |
| 结算 · Results | 16.7 → 16.7 | 16.7 → 16.7 | 74 → 103 | 0 / 204 | 0 |

- 旧 9/9、新 14/14 真机检查通过。两轮均由真实输入选车、完成一圈、八人结算，五个驾驶触控按钮均可用，支持暂停恢复；新横屏五个驾驶按钮实际最小 56.83×56.83 CSS px，暂停 44×44（旧分别 58×58、44×44）。新版本两独立触点持有左转和漂移意图共 28 帧，实际物理漂移观测到 26 帧；漂移手指越出控制区仍持续追踪，未发生页面滚动或缩放，取消时清除两触点，第二指暂停时比赛时钟停止，再继续。早期诊断中轮询未及时捕捉到持续漂移；帧级记录证明实际有 57 帧漂移，然后车辆碰墙减速导致物理漂移自然结束，并非触控丢失。/ Baseline 9/9, native 14/14 physical-route checks passed. Both completed a real lap and eight-racer results using actual inputs, including all five drive controls and pause/resume. Native landscape drive targets are at least 56.83×56.83 CSS px, Pause 44×44 (old 58×58 and 44×44). Independent left/drift contacts were held together for 28 sampled frames, with 26 observed physics-drift frames. Dragging out did not scroll or zoom the page; cancel cleared both contacts; second-finger Pause froze race time and Resume continued. Earlier polling missed a transient drift; the frame receipt showed 57 drift frames followed by a wall collision and normal physics termination, not lost touch input.
- 比赛采集 12,374 → 10,831 帧间隔；>50ms 由 0 → 2，新版本在比赛时刻约 14.09s/14.16s 连续记录 116ms 两次，另外选车最大 58ms。没有分层 GPU/浏览器追踪，无法断定原因是叠加层绘制、3D 资源或设备系统调度；不宣称长帧彻底解决。P95 维持约 16.7ms。标题单轮可操作时间 3,850 → 2,576ms，不能以单轮下结论。此手机为高端机，并未完成上表中端设备 F2 标准。/ Race frame-interval samples 12,374 → 10,831; >50ms: 0 → 2. The new run has two 116ms intervals around race time 14.09/14.16s, and the selection max is 58ms. No separate GPU/browser trace was taken, so the cause is not attributed to the overlay, 3D resources or system scheduler. P95 holds at 16.7ms. A single title readiness measurement of 3,850 → 2,576ms does not establish a cold-start trend. The Fold7 is a high-end device; the mid-range F2 criterion remains untested.
- [Fold7 外屏横向 / outer landscape](test/evidence/fold7-landscape-high-before-after.jpg)、[Fold7 外屏竖向 / outer portrait](test/evidence/fold7-portrait-high-before-after.jpg)：旧横屏选车、结算截图中底部按钮/行超出可视范围，需要额外滚动；新版重排预览、八人选车、圈数、出发与八行结算及返回/重赛按钮，可以直接查看并点击。竖屏新版也保留车辆预览、完整操作提示和所有选择功能。/ Actual old landscape selection and result captures have below-viewport content (extra scrolling). The new layout brings the preview, all eight racer choices, laps, Race, all eight result rows, Back and Rematch into view. Portrait also retains the preview, instructions and all selection functions.

限制：Fold7 内屏、其他真实平板、中端手机、Safari、Firefox、实际读屏器、实体手柄和人工手感盲测未覆盖；设备实测仅验证原有音频设置路径，没有扬声器声学验收。/ Not covered: the Fold7 inner panel, other physical tablets, mid-range phones, Safari, Firefox, actual screen readers or controllers, human blind feel test, and speaker acoustic verification.

**完整浏览器验收 / Full browser acceptance.** `RALLY_HARDWARE=1` 配合 `CHROMIUM_PATH` 指向已安装的 Edge，运行 `node test/accept.mjs`，实际识别 RTX 5090/D3D11，53/53 通过、退出码 0。未改动赛事逻辑或完成条件：一圈由实际键盘事件完成，正常获取并用 E 消耗道具，八行结算、再来一局和退出均通过；已有旧设置读回、音量开关和画质循环、按住拖出取消、初次与返回焦点、真实键盘、模拟标准手柄 Start/D-pad/A/B、暂停时切英文后继续比赛及恢复中文（HUD、语义名称、同一比赛）、触屏双指所有权/越界/取消，选车、比赛、暂停、结算四状态分别横转竖再转回，均保留同一叠加层、语义树、焦点、赛事与设置；主动拒绝一次模型 manifest（HTTP 503），从原生 Retry 点击触发真实页面重载，12 个模型成功加载、错误清空。除了有意拒绝的资源，最终没有控制台错误。/ Explicit installed Edge hardware renderer, 53/53 PASS, exit 0. Through legitimate keys: one lap, genuine item collection and expenditure, eight result rows, Rematch and Quit. Old settings, sound and quality, drag-out release guards, initial/restored focus, physical key events, simulated standard controller Start/D-pad/A/B, pause-language/live-HUD round trip, dual touch ownership/drag-out/cancel, and selection/racing/paused/results orientation round trips retain overlay, semantics, focus, race and settings. The deliberate HTTP 503 opens Retry; the physical click navigates/reloads, actually loads all 12 models and clears failure. No unexpected console error. The rotated touch profiles here are browser emulations, in addition to the physical Fold7 measurements above.

1024×600 已人工查看的新原生标题、选车和暂停基线正常比较（未刷新旧参考文件）：差异面积 8.15%、8.06%、0.66%（像素通道差阈值 40）；赛车背景、展示车辆动画以及真实赛道位置随时间变动，比赛/道具/结算的截图作为实拍路线证据，不设置固定完整像素基线。/ Normal comparison against reviewed 1024×600 native title, select and paused references (8.15%, 8.06%, 0.66% differing area at channel threshold 40; no reference rewrite). Animated 3D backdrops vary; race, item and results remain actual route evidence rather than fixed whole-image pixel baselines.

## 八屏原生控件验收 · Eight-screen native control acceptance

引擎 `8ef4cf3a2cf507c58665de9f9b43c63b379121c2` 官方 `verify --screens --play test/screen-route.mjs`，Windows Edge headless / ANGLE RTX 5090 Laptop D3D11 硬件浏览器；分两组覆盖同样的八个官方尺寸及模拟安全区。使用 low 画质、seed 7、减弱动态效果，真实按键驾驶一圈并取得实物道具、暂停、续跑和完赛；没有设置车辆位置、道具、时间或比赛结果。此项是**浏览器尺寸模拟，不是真机**，与上文高画质 PC、Fold7 实机性能对照分开。

Official screen verifier at the named engine commit, running Windows Edge headless on the actual RTX 5090 through D3D11. Two disjoint runs cover all eight official profiles with the same low-quality, seed-7, reduced-motion route, real keyboard driving, legitimate pickups, pause and a completed lap. No position, item, time or result is assigned by the harness. This is viewport emulation, **not physical mobile hardware**; the high-quality device comparison above is separate.

检查点 · Checkpoints: title (ZH), title (EN), selection (EN), selection (ZH), countdown, race, acquired item, pause, results. **8/8 profiles; 72/72 checkpoints; 0 errors; 0 warnings**. All controls have names, fresh native control receipts and valid safe-area positions; none overlap. Physical CSS sizes are rounded to two decimals.

| 屏幕 · Profile | CSS | 最小触控区 · Min target (CSS px) | 一圈 · Lap | 检查点 · Checks | 错误/警告 · E/W | 实拍 · Actual images |
|---|---:|---:|---:|---:|---:|---|
| phone-small | 375×667 | 44.00×44.00 | 63.82 s | 9 | 0 / 0 | [截图 / sheet](test/evidence/native-screens/screen-phone-small.jpg) |
| phone-notch | 393×852 | 44.91×44.91 | 63.92 s | 9 | 0 / 0 | [截图 / sheet](test/evidence/native-screens/screen-phone-notch.jpg) |
| phone-notch-wide | 852×393 | 44.00×44.00 | 63.96 s | 9 | 0 / 0 | [截图 / sheet](test/evidence/native-screens/screen-phone-notch-wide.jpg) |
| phone-tall | 360×800 | 44.00×44.00 | 65.12 s | 9 | 0 / 0 | [截图 / sheet](test/evidence/native-screens/screen-phone-tall.jpg) |
| tablet | 768×1024 | 60.00×60.00 | 66.42 s | 9 | 0 / 0 | [截图 / sheet](test/evidence/native-screens/screen-tablet.jpg) |
| tablet-wide | 1024×768 | 51.20×51.20 | 63.74 s | 9 | 0 / 0 | [截图 / sheet](test/evidence/native-screens/screen-tablet-wide.jpg) |
| foldable | 884×1104 | 60.00×60.00 | 66.17 s | 9 | 0 / 0 | [截图 / sheet](test/evidence/native-screens/screen-foldable.jpg) |
| desktop | 1920×1080 | 60.00×60.00 | 65.54 s | 9 | 0 / 0 | [截图 / sheet](test/evidence/native-screens/screen-desktop.jpg) |

截图（72 张）已逐张通过八组实拍联系表目检：红带只覆盖背景，未遮挡控制；所有车手、属性、选项、道具、圈数、名次和完整结算可见。小屏个别中文介绍的标点换行属于文字排版细节，不影响操作。完整控件回执及成绩见 [screen-receipts.json](test/evidence/native-screens/screen-receipts.json)。截图基线另存 `test/baseline/`；比赛、道具及结算背景随实际竞赛变化，以检查点和真实照片为证，不强制等同动态帧。

All 72 actual screenshot checkpoints were visually inspected using the eight sheets. Red inset bands cover backgrounds only, not controls; full racer selection, statistics, options, race HUD, held item and all result rows remain readable. At very narrow widths, a few Chinese punctuation characters can wrap onto a new line; this does not change controls. The [screen receipt and actual finish data](test/evidence/native-screens/screen-receipts.json) are retained. Separate reviewed static screenshot references live in `test/baseline/`; dynamic world/finish frames are evidenced by real screenshots rather than treated as pixel-identical runs.

复跑 · Re-run:

```sh
node vendor/egret.mjs verify --screens --play test/screen-route.mjs --out <new-directory>
```

完整版软件渲染很慢，本次全八屏明确选择已安装硬件浏览器适配器（`--playwright <adapter>`，并记录实际 GPU），用相同几何规则分组：`--screens=phone-small,phone-notch,phone-notch-wide,phone-tall` 与 `--screens=tablet,tablet-wide,foldable,desktop`。默认软件渲染的普通 `verify` 则独立通过七项检查，没有控制台或引擎警告。

Full track software rendering is slow; the eight-screen runs explicitly used an installed hardware-browser adapter and reported the GPU, in the two named groups above. Separately the default software-rendered ordinary verifier passed all seven checks without console or engine warnings.

## WebKit 手机兼容回归 · Mobile WebKit compatibility (2026-11-28)

- 公开版在 Windows Playwright WebKit 26.6（iPhone 15 Pro 配置，393×659 CSS px）出现 `TEXT_MEASURE_FAILED / WEB_TEXT_STATE_UNSUPPORTED`，不是资源 404。使用正式工具更新引擎后，异步菜单字形准备结束时安排一次额外的 250 ms 原生重绘；不增加静止菜单常驻绘制循环。 · The previous public build failed text preparation; the officially vendored engine and a single bounded repaint after menu work settles address stale initial UI.
- 本地候选标题实拍可读，实际点「开始」进入完整选车画面（车模、八个车手、三档级别与圈数）；JS、控制台、HTTP 错误均 0。原 Node 测试 42/42 通过。 · Captured both screens and activated the engine control by actual emulated touch; existing Node suite passes.
- 这是 Windows 上的 WebKit+iPhone 配置，不是实体 iPhone 或 iOS Safari 排他认证。未跑完比赛、未测声音实听或测移动 GPU 性能。 · Physical iPhone audio, full race and performance remain unverified.
