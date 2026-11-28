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
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 达标 · pass | p95 4.3 ms over 961 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 2.1 s to the first playable screen, 2.9 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "开创新局" (owned active descendant) |
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

自动项不达标 · Automatic items failing: 无 · none。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.

## 人工与真机结果 · Manual and device results

- 引擎 · Engine: `8424ff2afb0afdc103b06d51e3fd749f7a8fc379`，官方副本，无本地补丁。 · Official copy, no local patches.
- Node v26.7.0: 旧版 80/80；升级迁移后 98/98（规则、场景、图形、动作、音频以及新增数据视图/存档/文字/手势）。10 年无界面推演、200 场各组平衡系列正常，规则与数据文件未改。 · 80/80 before, 98/98 after; ten-year simulation and 200-bout balance series run.
- PC 浏览器流程：标题 → 序章 → 自选门派 → 传承 → 确认 → 手札 → 招募 → 建造单 → 弟子/差事 → 设置全开 → 江湖 → 战阵命令 → 纪事 → 存档及续读；已审核的标题、传承截图基线差异均为 0。 · PC browser acceptance covers the opening, guide, recruitment, construction, roster and job, unlocks, map, battle orders, annals and save/reload; both reviewed baselines have zero changed-pixel share.
- 初次迁移时通用 A1 报告失败：它只看 DOM activeElement，而原生 Tab 焦点在画布内。单独实际 Tab/Enter 无程序设置焦点的路线从标题走至弟子页，成功且无页面错误。A2 读取五个具名标题控件。 · At the initial migration generic A1 failed because it measures DOM focus rather than native focus. A separate actual Tab/Enter-only route reached the disciples page without scripted focus or errors; A2 reports five named title controls.
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

`node vendor/egret.mjs verify --screens --play test/screen-verify.mjs`：9 种规格 × 7 个真实路线检查点，63 张截图。路线完成；初次迁移的原始工具报告 36 errors / 25 warnings，作为历史基线保留。红色安全区截图逐组检查，原始报告的滚动面板裁切行（指南分页、门派列表、传承选项）及底层滚动内容分类见 ENGINE-NOTES #2。两种矮横屏的内容可以滚动，底部按钮固定，并在真实设备复测。 · All nine scripted routes complete, 63 screenshots. The initial migration verifier reported raw bounds (36 errors/25 warnings) for clipped rows; retained as the historical baseline. All nine screenshot groups were reviewed; short landscape controls and fixed footers were also exercised on the actual phone.

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

### #552 正式合入后的回归 · Regression after engine #552

- 引擎 · Engine: `39560b3ef608e4dda68c8461f435c279d1eba3d2`（#552 已通过 M0 / merge-ready 后合入 main，含 #549、#551、#553），由官方复制工具生成 337 个文件。 · Official main after #552 passed M0 / merge-ready, 337 files generated, no vendor patch.
- 自动验证 · Automated: Node 101/101；浏览器主流程及已核对截图基线全部通过（title/legacy 差异 0）；两次独立纯键盘七步均通过，零错误；自建门派/修改器/损坏档 5/5；十年推演和 200 场各组平衡均正常。 · All 101 Node cases, full browser acceptance with unchanged reviewed goldens, two independent seven-step keyboard routes, 5/5 editor/save cases, ten-year simulation and balance series pass.
- 原始固定等待的键盘测试偶发在慢速软件渲染场景初始化时采样不到手札焦点；诊断确认实际原生焦点有效。测试改为等待真实 ARIA/语义回执及路线状态，仍只发送真实 Tab/Enter。 · The initial fixed-delay keyboard test missed the guide focus during slower software rendering; diagnostics confirmed valid native focus. The test now waits for actual ARIA/semantic receipts and route state, using real keyboard input only.
- 正式九屏 · Official nine screens: 9/9, 63/63 fresh checkpoints, 0 errors, 0 warnings. 原报告为 36 errors / 25 warnings，作为历史比较保留。逐组目视复核刘海区、窄横屏滚动、固定操作区及通知。 · The previous raw findings are retained above as history; all final screenshot groups were reviewed. [前后对比 / Before and after](docs/short-landscape-ui-followup.jpg).
- 通用质量 · Common quality: all automated items pass, A1 valid owned active descendant, F1 4.2 ms p95 (960 software frames), L1 1.1 s / 2.9 MB. This is headless software, not GPU performance.
- PC 真机 · PC device: Windows Chrome 157.0.8103.6, NVIDIA RTX 5090 Laptop GPU / D3D11, 1280×800 high. 13/13 checks, 0 console errors/warnings. Actual Tab/Shift+Tab/Enter, hall and free plot, scene gestures, realm pan/zoom, 10v10 pause, focus/cancel/resume; notice readability verified.
- Fold7 真机 · Fold7 device: SM-F966U1 Android 17 Chrome 157, Adreno 830, low quality, 411×813 → 873×325 CSS, DPR2.625. 43/43 checks, 0 runtime exceptions. Fresh private test origin: opening, recruitment 10→11, manual save/reload, actual rotation keeps the same world and native game; drag/pinch; Shaolin vs Huashan 10v10 tactical pause and resume, natural defeat using available 4× time, not fast resolve. Device/lease restored.

| 场景 · Scene | PC RAF p95 / max (ms) | Fold7 RAF p95 / max (ms) |
|---|---:|---:|
| 山门 · Seat | 4.3 / 4.3 (120) | 16.7 / 16.7 (101) |
| 江湖 · Realm | 8.5 / 12.5 (120) | 16.7 / 16.7 (101) |
| 战阵 · Arena | 4.3 / 4.3 (120) | 16.7 / 33.1 (101) |
| 手机转屏山门 · Rotated phone seat | — | 16.7 / 41.5 (101) |

数字是短时稳态、实际浏览器 RAF 间隔，不是 GPU 执行时长、整场最大帧或每台硬件都达标的证明；保留之前的 66.3 ms 隔离战斗样本。 · Short steady-state RAF intervals on physical hardware, not GPU execution timing, full-fight maxima, or proof for other devices; the earlier 66.3 ms isolated sample remains in the record.

另外：桌面单次截图里有飞鸟短暂过近镜头的视觉现象，其他规格与真机未复现；不能确认引擎回归，作为后续美术品质观察。 · A single desktop checkpoint caught a bird near the camera; other screenshots/device runs did not reproduce it. Not attributed to an engine regression.

仍未覆盖完整人手触屏长期战役、实体手柄、读屏软件、原生输入法选词、Safari/Firefox/微信、手机高画质及音箱实听。 · Full human-touch campaign, physical pad, assistive reader, native IME candidate selection, Safari/Firefox/WeChat, high phone quality and speaker listening remain untested.

### #557 正式合入及体验改进 · Engine #557 and experience follow-up

- 引擎 · Engine: `dfd8cc6205ed61f368f4c7408cee6473e042d973`，#557 在全部 Windows/Linux/macOS 和 M0 门禁通过后合入 main；337 个文件由官方工具生成。游戏规则与数值目录未改，保留原存档格式。 · Main after engine #557 passed all required checks; 337 files generated by the official tool. Rules, balance data and save format unchanged.
- 原生能力 · Native capabilities: 96-entry / 96-pending paragraph cache with bounded bytes; one browser mixer (music/effects/voice/ambience), native form edits and selection, browser file exchange, styled safe-area foreground notices. 系统语音由平台直接播放，不声称进入 WebAudio。 · System speech remains outside WebAudio; see ENGINE-NOTES.
- 界面 · UI: 深墨、暖纸、金边、朱印统一标题、案卷、弹出单与底部命令栏；浅底深字、正文富文本二倍密度，按钮和重点字号/字重区别。首档固定显示七项导航；山门待办数字进入招贤，江湖可观览而不解锁事务，战阵说明开战条件。 · Cohesive ink, paper, gold and seal treatment; high-contrast body text and 2× paragraph density. All seven tabs visible; the seat's count opens recruitment, realm browse is read-only, battle shows the existing gate. [同机位前后图 / Real before-and-after views](docs/native-quality-comparison.jpg)（左旧右新；上标题、下山门 / before left, after right; title above, seat below）。
- 载入 · Loading: 3D 可用时先显示非交互原生准备层，首个 `outcome: rendered` 后撤掉；只有真正失败才显示画卷后备。实际 PC 人为延迟模块 900ms 时手札仍可读，返回山门取消未挂接江湖，请求重入复用同一世界；读档重建新世界，7/7 检查通过，零错误（引擎候选历史证据）。 · Native preparation remains until the first accepted 3D frame. Controlled 900ms module delay, modal retention, cancellation, re-entry and new-world load: seven browser checks, zero errors on the candidate.
- 性能 · Performance: 同一台 RTX 5090 / Chrome 157，高画质 1280×800，同种子首次进入江湖，实际浏览器最大 RAF 间隔 1295.8 ms → 95.8 ms（下降 92.6%），P95 8.4 ms 不变。三档地形 position/normal/color/index SHA-256 完全一致；独立 Node 高档同步构造 1230.3 → 267.8 ms；实际异步装配 wall 546.4 ms，不再单次阻塞输入。着色预热约 325 ms，首次提交仍有约 96–101 ms 峰值；不能把全部耗时归因引擎。4× 普通经营最后采样 P95/max 8.4/37.5 ms，16× 8.4/41.6 ms；首次打开弟子和人物单仍分别有约 62.5/50.1 ms 峰值。 · Same physical GPU before/after candidate profiling. Geometry buffers byte-identical across all three qualities. Remaining first submission and first-open UI tails are documented, not claimed eliminated.
- PC 最终版 · Final PC: Chrome 157.0.8103.6, Windows RTX 5090 Laptop GPU / D3D11, high quality, 1280×800. 15/15 checks, 0 errors. Actual Tab/Shift+Tab/Enter; hall/free plot ray picks; drag, wheel; new red count, early realm and battle-lock entry; 10v10 actual enemy pick, focus/cancel, pause/resume. 首两轮右拖不平移；改用引擎 native routed contact observer 后，镜头目标 [0,1,-2] → [-4.0012,1,-5.7143]，保留主要手势。PC 本轮未自然打到结算；Fold7 结算已验证。 · Both initial right-drag attempts failed; the native contact observer restored it. PC route ended after battle resume, not natural settlement.
- Fold7 最终版 · Final Fold7: SM-F966U1, Android Chrome, 411×813 → 873×325 CSS at DPR2.625, low quality. Two runs of 48/48 checks, 0 runtime errors (including after the right-drag fix). Actual native touches: first-day badge/recruit (10 → 11), read-only world, locked battle explanation, build, camera drag/pinch, manual save/load, actual rotation retaining the same world/overlay, 10v10 paused/resumed and natural settlement at player-selectable 4×. Device lease, orientation, stay-awake and connections restored. · 两次真机路线均正常结算；没有改血量、门派数值或使用速决；为覆盖战斗使用游戏内正常“开放全部功能”设置。实际设备自动化触点，不是人手或模拟手机尺寸。

| 场景 · Scene | PC RTX 5090 RAF p95 / max (ms) | Fold7 RAF p95 / max (ms) |
|---|---:|---:|
| 山门 · Seat | 4.3 / 4.3 (120) | 16.7 / 16.7 (101) |
| 江湖 · Realm | 8.5 / 12.6 (120) | 16.7 / 33.2 (101) |
| 战阵 · Arena | 9.7 / 9.8 (120) | 16.7 / 33.2 (101) |
| 手机转屏山门 · Rotated seat | — | 16.7 / 24.7 (101) |

短时稳态 RAF 间隔并非 GPU 执行时长或整场最大值；Fold7 是高端机而非中端性能目标。 · These are short stable browser intervals, not GPU execution time or full-game maxima. Fold7 is not a mid-range target device.
- 规则 · Rules: Node 119/119, ten-year seed-7 simulation and 200-fight-per-line balance report actually run. `src/core` and `src/data` unchanged.
- 未覆盖 · Not covered: human touch or multi-year play, physical gamepad, independent speaker listening, real screen reader and native IME candidate selection, Safari/Firefox/WeChat, full WebGPU battle, other GPUs and phone high-quality thermal performance.

- 正式浏览器 · Browser checks: startup verify passed (earlier formal UI candidate, 0 console/engine warnings); nine profiles × 7 route checkpoints, 63/63, 0 errors/warnings; 72 screenshots including final views reviewed, no important elements in the notch/gesture band. Title and legacy goldens were reviewed against the previous images before intentional update (channel delta shares 2.8918% and 9.6253%). Regular acceptance after the reviewed update had zero changed-pixel share on both. Keyboard-only 10/10, custom editor/save 5/5, native selection/file exchange 4/4.
- 资源失败修复 · Asset recovery: quality initially failed E2 with a refused seal plus manifest and an obscured retry. Essential manifest/title textures now finish through the native loading API before mounting the title. Four separate startup refusals recover via native retry; a later refused scene image that actually stops the engine recovers via an emergency reload link. Five real browser fault/retry cases pass, including a touch retry. See ENGINE-NOTES #8 and test/asset-retry.mjs.
- 最终通用质量 · Final common quality: all automatic items pass, F1 software p95 4.3 ms / 961 frames, L1 2.1 s / 2.9 MB under specified throttling, E2 actual retry available. L1 before controlled title preloading was 1.0 s; now measured readiness includes essential displayed assets. No delay was moved to the new-game button, and the 3-second threshold is maintained. 不将软件渲染和多屏模拟当成真机。 · No software viewport is counted as a device.

- 故障修复后的最终正常截图回归仍沿用已审阅基准：标题差异 0.1383%（低于 2% 容限），传承 0；主流程全部通过，未再次替换基准。 · Final normal acceptance after recovery changes kept both reviewed goldens; title 0.1383% changed-pixel share, legacy zero, both below the threshold. No subsequent baseline rewrite.
