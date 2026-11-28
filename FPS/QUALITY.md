# 品质验收 · Quality — Operation Cutoff · 断流行动

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。下方为 2026-11-28 原生 UI 迁移的实测，后附历史检查表；历史结果不代表本次版本。引擎固定于 `33897768c4f7933d289f083e4f34b3209b0aef31`，旧副本 `b5628eb`，更新旧界面的独立提交 `44cffe9e`。

Current native UI measurements precede the historical checklist. Engine revision `33897768c4f7933d289f083e4f34b3209b0aef31`; engine-only migration commit `44cffe9e`. The historical table must not be interpreted as the current build's results.

## 2026-11-28 对照实测 · Matched measurements

Windows Edge, NVIDIA GeForce RTX 5090 Laptop GPU, ANGLE Direct3D11, WebGL2; 1280×800 desktop and 873×325 touch **emulation on the same PC**, seed 7, medium graphics, local HTTP, 5 s per stable title and initial gameplay sample. New high mode separately rendered four shadow maps. Browser callback intervals are not GPU execution or display presentation intervals. New desktop title is available after all models and warm-up, not a placeholder title. Old engine-only title replay retains the historical device-specific shadows switch; the new build enables shadows. Therefore draw counts and isolated shader timings are not strict single-variable A/B results.

| Profile / 阶段 | Old DOM | Engine-only / 仅升级引擎 | Native UI / 原生界面 |
|---|---:|---:|---:|
| PC 标题可用 · title sampled (ms) | 8982 | 8933 | 7486 |
| PC 预热 · warm-up (ms) | 3773 | 4214 | 1360 (native prepare 674) |
| PC title/play P95 (ms) | 4.3 / 4.3 | 4.3 / 4.3 | 4.3 / 4.3 |
| PC title/play maximum (ms) | 4.4 / 4.4 | 6.1 / 4.3 | 4.5 / 4.5 |
| 873×325 模拟 title sampled (ms) | 4571 | 4627 | 4306 |
| 873×325 模拟 warm-up (ms) | 289 | 285 | 257 (native prepare 47) |
| 873×325 模拟 title/play P95 (ms) | 4.3 / 4.3 | 4.3 / 4.3 | 4.3 / 8.3 |
| 873×325 模拟 title/play maximum (ms) | 4.5 / 4.9 | 4.6 / 4.4 | 4.5 / 8.4 |
| >50 ms callbacks (all short samples) | 0 | 0 | 0 |

原生 UI 标题静止的 5 秒内无额外 2D 提交；PC 游戏中 746 次提交 / 1202 个更新，模拟手机 881 / 1110。3D 绘制调用（初始场景、每帧）为 PC 123、模拟 125。原 DOM 没有对应引擎 UI 提交计数。桌面帧间隔没有下降；模拟短屏 P95 有明确差异，不声称性能完全相等。预热数字受本机缓存、场景和阴影配置影响，不能归因为单一 API 提速。原生准备明确请求 627 个材质通道变体，并保留实际资源预上传过程。

Static title produced zero additional native 2D draws in five seconds; active play submitted 746/1202 updates (desktop), 881/1110 (emulated phone). No comparable old DOM draw counter exists. Desktop callback P95 is unchanged; the narrow emulated sample has a measurable slowdown, even though no sample exceeded 50 ms. Warm-up counts cannot isolate API causality and are not public-CDN measurements.

### 功能与实际复跑 · Functional regression (R3 / R5)

- 旧版及仅升级引擎的 Node 测试各 51/51；原生 UI 迁移后 85/85。规则复跑 `node tools/headless.mjs 3 1`：种子 1、2、3 全部获胜，模拟局时 357、358、357 s（不是浏览器人工打完三局）。
- Windows 硬件浏览器回归 17/17：原生设置、语言、真实进入/退出全屏、部署后的鼠标锁定、右键、左右键同时输入、移动、实际 Tab 背包打开/关闭、暂停时间停止、场景右键网页菜单抑制、正常继续；8 个入口文件 SHA-256 与本地一致，0 意外响应/运行错误。
- 同机 873×325 触屏模拟 14/14：所有 11 个触控按钮达到 44 CSS px；弹药栏下边缘至首排按钮有 3.17 CSS px 间隙；无线电字幕不覆盖任务卡或按钮；标题、设置、实战、背包、暂停分别双向转屏，场景、界面和语义对象保持相同。该检查不是三星真机。
- 真实 HTTP 503 资源拒绝测试：模型清单第一次拒绝，原生错误重试按钮重新加载第二次请求成功，36 个模型全部恢复。高画质实际阴影通过，移除显卡型号特例。
- 最终分类设置及三页背包回归 R5：桌面 22/22、模拟短屏 16/16，两个环境均 8/8 文件哈希、0 意外控制台/HTTP 错误；真实 Tab/Enter 菜单导航、背包开时释放锁且继续既有任务计时，指针操作选装备，原生关闭后重锁、再次开启与关闭、恢复通过。旧 R4 的测试查询把名称内的 ` / ` 弹药分隔符误当作层级路径；固定语义名称后复跑成功。源码的原三类装备标签与12格背包均可访问，规则与弹药数值不变。
- 触控与锁定缺陷的复现、兼容层及建议见 [ENGINE-NOTES.md](ENGINE-NOTES.md) 第 7、11、12 条；真实桌面右键异常及 Tab 失锁问题已经复跑通过。

The original and engine-only versions each passed 51/51 Node tests; the native UI revision passed 85/85. Three complete deterministic simulation runs reached the game ending at 357, 358 and 357 seconds, not three human browser runs. Real hardware desktop 17/17 and PC-emulated touch 14/14, zero unexpected runtime/HTTP errors. Eight served source hashes matched. Five states rotated both ways without replacing the game, Play host or semantics. Actual 503 manifest refusal recovered 36 models from the named native Retry action. All eleven touch targets reached 44 CSS px in the emulated 873×325 route; ammo and radio no longer overlap the touch controls or objective. See engine notes for real right-button and Tab defects and verified compatibility adapters. Final categorized settings/backpack R5 was 22/22 desktop and 16/16 emulated touch; keyboard Tab/Enter, real equipment selection, bag release/reacquire and normal resume succeeded. The earlier named test was blocked by the slash in the dynamic ammo label used as a tester path separator; the stable accessible label fixed it. See test/evidence for retained screenshots and receipts.

### 多屏验证 · Screen verification

`verify --screens --play test/screen-route.mjs --playwright test/screen-browser.mjs` uses the actual PC GPU with simulated viewport/DPR/insets: 375×667, 393×852 (top 59 / bottom 34), 852×393 (left/right 59, bottom 21), 360×800, 768×1024, 1024×768, 873×325, 884×1104 and 1920×1080. The first scroll-based settings implementation failed 9/9 due to authored offscreen rects. Categorized settings passed the nine profiles and ten checkpoints, but visual review exposed portrait HUD overlap (the checker counts zero direct controls in its active-play snapshot, see ENGINE-NOTES #14). This is why native action-button semantic geometry and actual screenshots are checked separately. These are emulations, not physical devices.

修复后另用 `test/portrait-route.mjs` 在实际 Windows GPU 上跑 375×667 中文和 393×852 英文（模拟刘海）：均检查了 11 个实测原生语义框和 4 个 HUD 卡片，点击区安全、不重叠；375×667 状态框 x=9.29、宽 172.38 CSS px，右端 181.67，小于第一列按钮 x=213；393×852 最小目标 48 CSS px、状态框宽 180.78。两例均完成实际双触点与 CDP touchCancel，不出现运行错误。新版无线电完整分行，任务标题和计时分开。没有物理手机参与。R6 实测同样通过桌面22/22、模拟短屏16/16，恢复按键的保护和暂停同帧的规则停止由测试覆盖。

After the portrait fix, both actual-GPU emulated 375×667 Chinese and 393×852 English with insets passed the focused `test/portrait-route.mjs`: eleven real native target rectangles were inside the safe area without intersecting the four HUD cards; the 375 px status card ends at x=181.67 versus x=213 for actions; 393 px targets are 48 CSS px. Real two-contact / CDP touchCancel steps produced no runtime error. The revised subtitles and separated title/time are fully visible. R6 preceded the portrait-only correction and again passed 22/22 desktop, 16/16 wide emulation, including the resume-input guard.

最终多屏复跑含前述增强的语义检查：九种配置每种 10 个检查点全部通过，0 个错误、0 个告警；每个触屏实战检查 11 个具名低层原生控件 ≥44 CSS px，安全区、互相及与主要 HUD 卡片的遮挡都通过。所有截图均逐页对照看过，红色区域为模拟刘海或底条；本轮结果不包含完整人工撤离和实际手机。留存 [汇总](test/evidence/screens-release-summary.json)、[屏幕联图 1](test/evidence/screens-release-1.jpg)、[2](test/evidence/screens-release-2.jpg)、[3](test/evidence/screens-release-3.jpg)，及 [竖屏修复前后](test/evidence/portrait-hud-before-after.jpg)。

Final enhanced screen replay passed all nine configurations × ten checkpoints with zero errors/warnings. Each touch gameplay checkpoint additionally verifies eleven named native controls, 44 CSS px minimum, safe containment and non-overlap with each other and primary HUD cards. All screenshots were reviewed; the red regions are simulated insets. See the linked compact screenshots and machine-readable summary above. These are PC emulations, not device measurements.

### 软件浏览器兼容 · Software browser smoke

`node test/accept.mjs` 默认软件路径实际退出码 0：本机未安装 Playwright 自带浏览器，使用仓库支持的 `CHROMIUM_PATH` 指向已安装 Edge，ANGLE Google Vulkan SwiftShader 而非 RTX 硬件；全量美术标题与已审核 640×420 基线差异 0.12%，未重拍基线。设置、操作说明、返回正常，0 控制台/HTTP 异常。此路径不作为 GPU 性能测量。

Default `node test/accept.mjs` smoke exited 0 with the installed Edge executable via the supported CHROMIUM_PATH setting (bundled Playwright browser unavailable) and Google Vulkan SwiftShader, not the RTX hardware. Complete title art differed from the reviewed 640×420 baseline by 0.12%, with no baseline replacement; settings, controls and return succeeded without unexpected errors or HTTP failures. This is compatibility evidence, not a frame-rate measurement.

### 验收边界 · Limits

- 2026-11-28 在 PC 端两次运行 `adb devices -l` 均无任何设备；无法连接原 Galaxy Z Fold7 / SM-F966U1。本轮没有 Fold7 真机帧率、实体触屏、真实刘海或扬声器实听结果。上表的 873×325 只是在 PC 模拟视口。
- 本轮没有 WebGPU 真机、Safari、Firefox、微信、真实手柄、读屏软件、全程人工撤离与完整对局帧时间测量；原有游戏规则自动整局并不代表上述覆盖。
- 历史自动检查 F1 的 2 帧/7849.7 ms 不构成有效性能基线，不能与实测 PC 5 秒样本混合。旧 T2、I1 的问题由本轮实际触控框与语言操作复测，自动检查工具若未理解原生控件须单独说明。

Two `adb devices -l` attempts listed no device, so no new physical Fold7 input, frame-time, notch or speaker result is claimed. WebGPU hardware, Safari/Firefox/WeChat, real gamepad, screen reader, full human extraction and complete-match rendering trace are untested in this round. The historical F1 two-frame measurement is invalid, not a performance baseline.

## 历史自动检查（2026-11-21） · Historical checks (not current)

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
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 不达标 · fail | 3 of 3 under 44×44: Deploy 132×43; Settings 132×43; Controls 132×43 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 不达标 · fail | p95 7849.7 ms over 2 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.5 s to the first playable screen, 3.0 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 不达标 · fail | html lang "en", Chinese left: 断流行动 第一人称射击 移动 鼠标瞄准 左键开火 |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "断流行动：第一人称射击。WASD 移动，鼠标瞄准，左键开火，" (focus drawn by the game) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 4 named controls, e.g. button "Deploy", button "Settings", button "Controls" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 不适用 · n/a | the game keeps nothing in browser storage |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 不适用 · n/a | the game keeps nothing in browser storage |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 达标 · pass | 1 files refused; no uncaught error; offers to try again |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: T2, F1, I1。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.
