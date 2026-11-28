# 品质验收 · Quality — Wulin · 武林天下

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs Wulin` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs Wulin`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-28
- 浏览器 · Browser: 无头 Chromium 157.0.8103.6，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Windows 工作站 · Windows workstation, win32 x64, Node v26.7.0
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 5 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 达标 · pass | p95 4.3 ms over 962 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.1 s to the first playable screen, 2.9 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 不达标 · fail | Tab reached no named control |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 5 named controls, e.g. button "开创新局", button "载入存档", button "开启背景音乐" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: wulin-language, wulin-slot-auto) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: wulin-language, wulin-slot-auto) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 达标 · pass | 1 files refused; no uncaught error; offers to try again |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: A1。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.

## 人工与真机结果 · Manual and device results

- 引擎 · Engine: `8424ff2afb0afdc103b06d51e3fd749f7a8fc379`，官方副本，无本地补丁。 · Official copy, no local patches.
- Node v26.7.0: 旧版 80/80；升级迁移后 98/98（规则、场景、图形、动作、音频以及新增数据视图/存档/文字/手势）。10 年无界面推演、200 场各组平衡系列正常，规则与数据文件未改。 · 80/80 before, 98/98 after; ten-year simulation and 200-bout balance series run.
- PC 浏览器流程：标题 → 序章 → 自选门派 → 传承 → 确认 → 手札 → 招募 → 建造单 → 弟子/差事 → 设置全开 → 江湖 → 战阵命令 → 纪事 → 存档及续读；已审核的标题、传承截图基线差异均为 0。 · PC browser acceptance covers the opening, guide, recruitment, construction, roster and job, unlocks, map, battle orders, annals and save/reload; both reviewed baselines have zero changed-pixel share.
- 通用 A1 仍报告失败：它只看 DOM activeElement，而原生 Tab 焦点在画布内。单独实际 Tab/Enter 无程序设置焦点的路线从标题走至弟子页，成功且无页面错误。A2 读取五个具名标题控件。 · Generic A1 fails because it measures DOM focus rather than native focus. A separate actual Tab/Enter-only route reached the disciples page without scripted focus or errors; A2 reports five named title controls.
- 官方 `verify` 启动检查通过；资源失败提供重试，英文 URL 和原生标题选择可切换。S1/S2/S3 自动通过，原始文件格式留字节验证、损坏文件另存与拒绝写入单测。 · Official startup verification passes; retry on resource failure; the English URL and title choice work. S1–S3 pass and the native save adapter tests exact legacy bytes and corruption handling.

### 实际 GPU/手机 · Physical GPU and phone

PC: Windows, Chrome for Testing 157.0.8103.6, NVIDIA GeForce RTX 5090 Laptop GPU / D3D11. 1280×800, DPR 1, high quality. Fold7: SM-F966U1, Android 17, Chrome 157, Adreno 830, low quality. The isolated phone scene fixture reports 980×365 CSS px / DPR 2.625 (no viewport metadata in the isolated fixture); the full app reports its actual 411×813 / 873×325 CSS px. Protocol inputs on real devices, not human fingers or a viewport simulation.

同种子 7，同场景 101 个 RAF 间隔（稳定态，毫秒 P95 / 最大）。行为、粒子与物理未改。 · Seed 7, same scene, 101 stable RAF intervals (milliseconds P95 / max). The isolated comparison has one native UI test control; it is not a claim about the full management screen.

| 场景 · Scene | PC 旧 · before | PC 新 · after | Fold7 旧 · before | Fold7 新 · after |
|---|---:|---:|---:|---:|
| 山门 · Seat | 4.3 / 4.4 | 4.3 / 4.3 | 16.7 / 16.7 | 16.7 / 16.7 |
| 江湖 · Realm | 4.3 / 4.3 | 4.3 / 8.4 | 16.7 / 16.7 | 16.7 / 16.7 |
| 战阵 · Arena | 4.3 / 4.5 | 4.2 / 4.3 | 16.7 / 16.7 | 16.7 / 66.3 |

渲染调用/三角形相同（PC 112/463786、293/2548788、81/108550；手机 106/466470、145/599734、73/98318）。手机隔离战斗残留单次 66.3 ms，本轮未能归因于具体 GPU/主线程阶段；不能断言长帧已消除。 · Same 3D draw and triangle counts. The isolated phone battle retained a 66.3 ms tail that was not decomposed into CPU/GPU stages.

Fold7 真机路线：实际触控招募 10→11；建筑单、保存/续读 11 人、真实横竖转屏，经营场景单指平移和双指缩放，地图平移/缩放；出征少林攻华山 10 对 10，战术暂停、继续及 4× 到自然结果。修正战斗独立 HUD 后同一存档测试 14/14，P95/max 33.2/49.8 → 16.7/33.2 ms，战斗画面可用高度明显增加。手机此前的 58 ms 转屏样本和 66.3 ms 隔离场景仍保留。 · Actual phone interaction recruited the 11th disciple, opened construction, saved and loaded, rotated, dragged / pinched the seat and realm, and completed a 10v10 Shaolin–Huashan fight after tactical pause/resume and 4× speed. Compact HUD/marker follow-up passed 14/14, RAF P95/max 33.2/49.8 → 16.7/33.2 ms.

PC 实际鼠标点击建筑、空地、拖视角、滚轮缩放、右拖平移 5/5；战场直接点敌人集火与取消 2/2。 · Real mouse scene picks/orbit/zoom passed 5/5; real battlefield focus and cancel passed 2/2.

### 九屏检查 · Nine-screen check

`node vendor/egret.mjs verify --screens --play test/screen-verify.mjs`：9 种规格 × 7 个真实路线检查点，63 张截图。路线完成；原始工具仍报告 36 errors / 25 warnings，不把它称为通过。红色安全区截图逐组检查，原始报告的滚动面板裁切行（指南分页、门派列表、传承选项）及底层滚动内容分类见 ENGINE-NOTES #2。两种矮横屏的内容可以滚动，底部按钮固定，并在真实设备复测。 · All nine scripted routes complete, 63 screenshots. The verifier still reports raw bounds (36 errors/25 warnings) for clipped rows, not a clean pass. All nine screenshot groups were reviewed; short landscape controls and fixed footers were also exercised on the actual phone.

| 规格 · Profile | 原始错误 · Errors | 原始警告 · Warnings |
|---|---:|---:|
| phone-small (375×667) | 2 | 0 |
| phone-notch (393×852) | 2 | 0 |
| phone-notch-wide (852×393) | 10 | 7 |
| phone-tall (360×800) | 2 | 0 |
| tablet (768×1024) | 2 | 0 |
| tablet-wide (1024×768) | 2 | 0 |
| foldable-cover-wide (873×325) | 12 | 18 |
| foldable (884×1104) | 2 | 0 |
| desktop (1920×1080) | 2 | 0 |

### 未覆盖 · Not covered

物理手柄、辅助技术真实读屏、手机中文输入法选词、Safari/Firefox/微信、全 WebGPU 实战、扬声器独立实听、完整多年战役以及其他硬件的长尾。Fold7 不是中端性能目标机。 · Physical pad, assistive speech, native IME candidate selection, Safari/Firefox/WeChat, full WebGPU play, speaker listening, complete multi-year play and other hardware tails. Fold7 is not a mid-range target device.

- 新建自定义门派、原生文本输入框中插入并提交中文（浏览器键盘文本插入，不是物理输入法选词）、F8 连按、修改器数字编辑及原生确认还原、旧格式存档：浏览器 5/5 通过（含损坏槽位另存）。 · Custom founding, engine-managed text-field commit by browser text insertion (not native IME composition), F8 double press, number edit / confirmed revert and original save bytes: 5/5 browser checks pass, including preservation of a corrupt slot. Reproduce: `node test/custom-editor.mjs` and `node test/keyboard.mjs`.
