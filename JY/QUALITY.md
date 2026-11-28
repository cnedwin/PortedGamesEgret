# 品质验收 · Quality — JY · 金庸群侠传致敬 Demo

## iPhone 配置 WebKit 启动回归（2026-11-28） · WebKit startup compatibility

Windows 上的 Playwright WebKit 26.6，iPhone 15 Pro 设备配置，竖屏 393 × 659 CSS px，独立的新浏览器上下文；不是 iPhone 真机或 iOS Safari 本体。改造前测试公开 Pages，改造后测试候选工作树的本地 HTTP 服务。

Windows Playwright WebKit 26.6 with an iPhone 15 Pro profile (portrait, 393 × 659 CSS px, isolated fresh browser context); not a physical iPhone or iOS Safari itself. Baseline: public Pages; retest: candidate worktree over local HTTP.

- 引擎副本 · Engine: `c1570b0878d1be8716d06320206f51a62f9e3f32`.
- 改造前：自动下载原作包后提示资源写入失败。独立探测中 IndexedDB 写入 1 MiB Blob 报 UnknownError，ArrayBuffer 可正常写入。browser/pack-storage.mjs 在 Blob 写入发生 UnknownError / DataCloneError 时等待事务中止，然后仅重试一次为 ArrayBuffer，后续批次采用该类型并保持旧 Blob 记录可读；不重试配额或约束错误。引擎副本不变。 / Before: original-data pack writes failed. An isolated 1 MiB IndexedDB probe reproduced UnknownError on Blob but saved ArrayBuffer. browser/pack-storage.mjs waits for the failed transaction to abort, retries only UnknownError / DataCloneError once with bytes, preserves old Blob reads, and does not retry quota/constraint errors. The engine copy is unchanged.
- 改造后 / After：从全新上下文自动导入 37,440,245 字节的包，进入原版标题，实际触摸「設定」打开画面及音乐音效设置。 / A fresh context automatically imports the 37,440,245-byte pack, reaches the title and opens graphics/audio settings with a touch.
- 复测无页面异常、控制台错误、HTTP 4xx/5xx 或失败请求（四项均 0）；`node --test test/*.test.mjs`：75/75 通过。 / No page exceptions, console errors, HTTP 4xx/5xx or failed requests on the local retest (zero in each category); 75/75 Node tests pass.
- 仅验收启动、首屏截图及一次浏览器触摸操作；未覆盖整局、设备横竖屏切换、物理 iPhone、真实 iOS 音频、Safari 版本差异或性能。 / Startup, title screenshot and one browser touch event only; full playthrough, rotation, physical iPhone, real iOS audio, Safari version variation and performance were not covered.

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs JY` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs JY`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-29 (final rerun)
- 浏览器 · Browser: 无头 Chromium 157.0.8103.6，SwiftShader 软件渲染（没有使用设备显卡） · headless, software rendering, no GPU
- 机器 · Machine: Windows x64, Node v26.7.0
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 部分验证 · partial | real Fold7 opening, travel, battle48 victory with explicit Auto after manual commands, reward/reload; not full campaign |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 8 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 达标 · pass | p95 4.2 ms over 944 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 2.2 s to native usable title, 2.5 MB; not data and first scene ready |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 部分达标 · partly | generic title check passes; original story and data remain Chinese by design |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 部分验证 · partial | named English native title, map/dialogue controls and battle shown; source text intentionally unchanged |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "開始新旅程" (owned active descendant) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 5 named controls, e.g. button "繼續旅程", button "開始新旅程", button "讀取紀錄" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 专项验证 · dedicated | generic n/a does not inspect IndexedDB; incompatible record preserved/recovery backup tested, see below |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 专项验证 · dedicated | generic n/a does not inspect IndexedDB; incompatible record preserved/recovery backup tested, see below |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 达标 · pass (fixture) | explicit recovery dialog, cancel preserves old record, backup and valid new revision |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 不达标 · fail | generic runner refused 2 files, no uncaught error; actual named zh/en Retry and Cancel separately pass |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项 · Automatic runner: T3/L1 pass; E2 fails its generic matcher although named retry works, I1 only tests the title. Actual device/manual scope is separately recorded above. 2026-11-29 first generic run sampled across the root-to-runtime navigation and lost its page context; a successful second run supplies these numbers.

## WebKit 开场事件 691 回归 · WebKit opening event 691 (2026-11-28)

- 公开旧版冷启动导入原版数据、标题后，实际触屏「開始新遊戲」进入 691 时复现 `TEXT_MEASURE_FAILED / WEB_TEXT_STATE_UNSUPPORTED`。由正式引擎 main `ca9ff2a0ef9ff67af7795f9600ba40668383a0a2` 构建并按九个实际入口生成副本（327 个文件）。JY 自己创建的低层 Canvas 游戏文字缓存显式采用引擎 `compatibility:'game-labels'`；保留严格 WC1 的底层语义。 · The hosted title worked while entering the opening aborted on strict text state. Use the merged engine's documented compatibility option only for ordinary game labels.
- 浏览器服务工作线程和本地服务优先读取真正的官方生成 `vendor/importmap.json`，而非旧的全包版本导出表；重新生成及核验标题 175、小蝦米居 155 条额外 modulepreload。新增正式映射中所有入口均实际存在的测试。Node **76/76** 通过。
- Windows Playwright WebKit 26.6、iPhone 15 Pro 配置（393×659 CSS px，非真机），全新本地 HTTP 公开版等价路线实际自动导入原版 37.4 MB 数据；标题约 30.673 s（该机本次样本），真实触控「開始新遊戲」，实拍小蝦米居 3D 树木、家具、角色、光影及 691 第一句对白、角色立绘、继续按钮均完整可见。JS、控制台和 HTTP 错误 0。 · Actual hosted-style fresh data import to title and opening dialogue in the browser; source artwork, rules, IDB compatibility and save format are unchanged.
- 未测实体 iPhone、全部 691 后续对白、全流程和移动 GPU 帧率；本机截图计时不代表用户网络或手机性能。 · This does not qualify full campaign, physical Safari performance or audio.

## 引擎升级第一批 · Engine-only refresh (2026-11-29)

- 基线游戏 main: `41ff086f`; old engine `ca9ff2a0` → engine main `212972678e633b1f3667f345d0646b0fba907ee1`. Official vendor, nine entries, 326 runtime files and official guide kit; startup preload 175 modules and Home additional 155. No gameplay, UI or save-format change.
- Node: 76/76 before and 76/76 after. On Windows Edge 158.0.4370.45 (RTX 5090 Laptop, ANGLE D3D11), same fresh local HTTP route completes 691 (33 dialogue pages), 692 battle 48, reward and save revision 2; reload restored revision 2 and wins=1, zero page/HTTP errors. A second visual run captures the first scene, battle and result.
- Windows Playwright WebKit 26.6 iPhone 15 Pro profile, not physical iOS: same local start→title sample 30.683→34.016 s, complete data import required; both touch Start routes reach opening 691, zero errors. One sample each; no startup acceleration claimed. L1 remains open.

| 场景 / Scene (3 s, same hardware) | rAF p95 old → new | max old → new | native draw/s old → new | draw calls old → new |
|---|---:|---:|---:|---:|
| Home idle | 4.3 → 4.3 ms | 4.4 → 4.6 ms | 240 → 240 | 106 → 106 |
| Battle 48 idle | 4.3 → 4.3 ms | 4.3 → 8.3 ms | 60 → 60 | 16–17 → 16–17 |

Both 3 s windows had zero rAF samples >33.4 ms. rAF dispatch and native render counters are distinct; not GPU duration. No physical iPhone, physical controller, Fold7, VRAM or complete campaign measured in this batch. No change is made to older automatic quality rows until retested. / 两次短窗均无超过 33.4 ms 样本；不是 GPU 耗时。未运行实体 iPhone、Fold7、实体手柄、显存和完整战役。本批不改此前自动验收结论。

## 原生标题与数据准备第二批 · Native title and data preparation (2026-11-29)

- 引擎 / Engine `212972678e633b1f3667f345d0646b0fba907ee1`; official 16-entry vendor. Native Play title, settings, guide, save selection, preparation and import. Background transfer/validation remains an independently cancelable job; the existing single validated archive is not split, and no partial data is treated as ready. / 标题可以早于数据准备操作，完整数据验证仍是进入实际游戏的前置条件。
- 启动通过已提交且排空的原生 2D 帧与关键标签确认，不仅是 canvas 分配。 / Title readiness requires committed native labels and a submitted frame drained by the host, not merely canvas allocation.
- `node --test test/*.test.mjs`: 86/86; `node vendor/egret.mjs check JY --strict` (from root via `JY/vendor/egret.mjs`): 0 errors, 0 warnings, 132 files, 62 engine imports.
- Same repository automatic Chromium quality runner (software-rendered, throttled L1 10/5 Mbps, 40 ms, CPU ×4) after native title and optional art error recovery: earlier L1 37.9 s / 37.5 MB, now **2.0 s / 2.5 MB to the usable title**; full archive validation and first playable map require further time. T2 8/8 targets ≥44 CSS px; T3 pass (overscroll held, touch-action none, double-tap zoom off); F1 p95 4.3 ms / 947 frames; O1 four profiles pass; A2 names present; E1 0 errors. I1 passes for the title page only; source narrative remains untranslated and gameplay UI remains unmigrated. / 以上仅是本机浏览器自动测量，不是手机性能或公网延迟。
- E2 generic runner refused 2 resources: no uncaught error, but its word matcher does not recognize Traditional Chinese 「重試」. Dedicated named acceptance exercises Retry and Cancel through actual UI; the optional artwork failure leaves a working title. / 通用 E2 仍记录不达标，不改写其结果；具名测试验证真正的重試操作。
- S1/S2 generic checker reports n/a because it does not recognize IndexedDB; that is not an assertion that the game stores nothing. Dedicated test injects an unsupported save version and verifies that cancellation leaves it intact, explicit recovery backs it up and writes a valid revision 1, rather than silently deleting it. / 旧记录保留并以独立键备份，原有存档格式不变。
- Root cancellation on a held manifest request reproduced on Windows WebKit; using a retained ordinary AbortController with explicit parent forwarding and timeout instead of an inline composite signal corrected the observed cancellation. Four targeted tests; no changes to archive validation. / WebKit 是真实浏览器内核配置，不是实体 iPhone 测试。

暂不把标题计时当成到默认存档、691 或任何完整游玩流程的等待时间；原有地图战斗仍按第一批的测量。实际 Fold7、Safari 实体设备、手柄、读屏软件和 GPU 显存尚未完成本批验收。 / No title benchmark is represented as first-play readiness. Latest physical Fold7, iPhone Safari, controller, screen reader and VRAM measurements are outstanding in this batch.

- 最终具名验收：Chromium 360/360 检查，14 张实拍，12 张正式基线像素差异比例均为 0.000；Windows WebKit 186/186 检查、8 张实拍，零意外错误。模拟 503、实际触屏取消挂起的清单请求再重试、资料验证、进入实际原有 3D 开场均通过。 / Chromium and Windows WebKit profiles exercise real pointer/touch and named controls; none are physical phone measurements. The synthetic save is kept unchanged until confirmation; recovery writes one matching backup and valid revision 1.
- WebKit 本轮：显示可操作的标题 5.615 s、资料准备 33.012 s（设置保持打开）、运行时标题 3.613 s、开始后 5.740 s 进入 3D。 / Separate local timing intervals from a WebKit run; not the Chromium throttled L1 result or a public network measurement.
- 同通用质检拒资源条件，繁中及英文实际 2/2：重試/Retry 按钮 148.45×76 CSS px，启用并可点击；各在点击后发起一次真实重试请求，零 pageerror。 / Named retry verification in both languages confirms generic E2 text detection is a false negative for Traditional Chinese.
- 正式 `verify --screens` 默认 Playwright Chromium shell 缺失（需要 1243，本机缓存 1248）；采用相同官方 `verifyScreens` 导出函数，仅显式指定已安装的 Chromium 157.0.8103.6。全部 **9/9** 现有引擎配置通过、0 错误/0 警告（phone-small, phone-notch, phone-notch-wide, phone-tall, tablet, tablet-wide, foldable-cover-wide, foldable, desktop），每屏四个有效控件；人工检查九图，所有菜单按钮位于安全区内。 / The unmodified engine verifier ran with the installed explicit Chromium binary; all nine profiles pass. The CLI itself could not locate its pinned browser shell. This is a title-state verification; the later game screens have not yet migrated.
- 根 `check-standard`：JY 通过；已有 MechanismCity / TeaHorseRoad 两个无关目录缺验收脚本和基线，不改它们。`check:showcase`、能力矩阵、笔记检查通过。 / JY passes; two unrelated existing directories remain incomplete. Showcase and generated ledgers pass.

## 第三批原生宿主与探索 · Batch 3 native host and travel (2026-11-29)

- 引擎仍为 `212972678e633b1f3667f345d0646b0fba907ee1`。Play owns the native 2D host and update clock, while existing scene and battlefield World3D presenters keep their own contexts. The design is 640×360 with 360×640 portrait, fit expand and safe-area bounds. Legacy board rules and coordinate identifiers are unchanged; only the screen projection is mapped.
- PC hardware Edge actual opening entry: native 3D Home, a single physical keyboard Enter advanced 1/2→2/2, zero application/HTTP errors. Earlier duplicate `TEXT_CACHE_ALREADY_CREATED` exposed by integration was fixed by removing the second owner and using public browser atlas labels. / 原生缓存成为唯一文字所有者，旧手工队列撤掉。
- Windows RTX 5090 Laptop, Chromium ANGLE D3D11 actual hardware rendering, 844×390 emulated touch: 138/138 checks, 11 screenshots, zero unexpected errors and warnings. Native 691 complete: 33 actual Continue operations, 129 animation frames, 8.245 s route after journal; Start→phase 3.462 s, presentable host 3.526 s. Direct exit enters worldView=3d; Bag, Travel menu, native scroll to Save progress and Back work. / PC 硬件浏览器实际完成，触屏属于浏览器模拟，不是手机。SwiftShader run was still progressing at its 240 s route deadline (80 animation frames, submitted 152, refused/retry 0); not accepted as full software-route completion.
- Real WebKit 26.6 iPhone-profile browser rotation on the same game: 873×325→393×852→768×1024→873×325, actual CSS canvas fit difference ≤0.5 px; same Play host and canvas identity, opening page 2/2 remains, native 3D frame 32→57→68→95. 14 submitted / 81 retained / 0 refused, zero page/HTTP/console errors; smallest enabled Continue/Review height 56 CSS px. / 不是实体 iPhone。
- Galaxy Z Fold7 real Android 17 cover-screen landscape, Chrome 873×325 CSS, DPR 2.625: isolated loopback-hosted candidate, actual CDP-injected touch (not human fingers), opening/3D Home/dialogue journal/back and 1→2 page progression passed. Two 3.5 s displayed short samples: 211 and 212 rAF intervals, p95/max 16.7 ms, zero >33.4 ms. Second cold local route root title 0.914 s, prepared/runtime title 4.876 s, Start→3D Home 2.672 s; completed remaining 691 with 32 additional real taps, exited and opened Bag/Menu. World screenshot initially showed fallback 2D; rejected that result as visual regression and diagnosed invalid declarative toggle field. / 真机只测当前外屏横放；未作公网冷链路或显存推断。Device lease, prior targets and USB stay-awake setting restored after each run.
- Visual fix: short screen stale two-column CSS previously collapsed the native viewport. Narrow native host layout isolation replaces it; smaller location card avoids the left direction target. Native perspective world camera toggle accepts only its documented fields; `color` removed from toggle (the previous invalid part had made World3D setup fall back). PC actual native 3D world after fix verified. / 修复前后实际场景帧截图是验收证据，非仅检查画布存在。
- Independent native panels: choice and item menus actual Chromium/WebKit four profiles; reading/journal real touch, rotation, long paragraph scrolling; explore input two simultaneous touch contacts and cancel/covered release. Minimum native travel controls 50.6×50.6 CSS in the 873×325 compact Chromium fixture; WebKit 852×393 min 61.1. / 独立控件夹具使用自制资料，不替代实际事件的复测。
- Existing source gameplay, save format, models, music, script data unchanged. `test/accept.mjs --travel --capture --native-gpu --sizes 844x390 --no-recovery` runs the named route and captures the true scene, not a simulated save override. Windows WebKit and Fold7 actual device observations are separate.
- Final native input integration: 129/129 Node tests (including neutral focus gate). Actual hardware PC first 691 and single physical Enter 1/2→2/2 pass, 36 World3D frames, zero errors; independent actual Chromium 11 input-route checks and 6 sampler units. `game.keys`/`game.onTap`/pointer is the standard path, official low-level raw pad channels only for the existing unexposed stick clicks, analog threshold and axes. / 原生键鼠以及命令输入迁移验证；实体手柄未测，参见 JY#6。
- Final Fold7 real-device repeat on the corrected source: native `worldView=3d` verified by actual frame and screenshot, camera both directions with measured 159×52 CSS targets, physical-device injected D-pad moves one tile (357,235→357,234), independent Bag/Menu and Back succeed, no warnings/exceptions captured from the owned target. 211 rAF intervals in 3.5 s; p95 16.6 ms, maximum 16.7 ms, zero >33.4 ms. Final actual screenshot confirms the camera card no longer overlaps Talk and the location card no longer covers directional input; controller restored its lease, prior tabs and USB keep-awake setting. / 最终第三批设备回归通过，小屏位置修复亦经实拍核对。仅外屏横放，未测实体其他方向、实体手柄和读屏软件。
- PC final native input route repeat `accept-travel-input-r6`: 138/138 checks, same 33 native Continue actions and 129 animation frames, 7.921 s, 3D world and native inventory/menu including actual scroll, zero unexpected errors/warnings. / 键鼠迁移后复测通过。

## 第四批原生战斗及清理 · Batch 4 native encounters and clean shell (2026-11-29)

- 引擎 `21297267` unchanged. Legacy battle DOM/buttons/outcome/game-created canvas grid and page-CSS layouts removed. `web/index.html` 799 bytes, `web/style.css` 20 lines; remaining page elements are the native host/title container, canvas placeholder, one boot/error status, noscript and minimum file chooser on actual file exchange. / 仅留下宿主所需页面结构，所有正常操作由白鹭界面与语义树呈现。
- Native stage 640×360 expand UI, short landscape 873×325, portrait 393×852, tablet768×1024, desktop1280×800: standalone Windows WebKit controls pass, min56 CSS px on short screen, no overlap or application error. Actual source uses the original combat rules/projection with a retained Graphics draw signature; synthetic 196-cell actual engine draw measured 6.31 ms first CPU build, unchanged geometry reused. / 这是独立图形验证，非整局帧率。
- 138/138 Node tests after removing obsolete runtime gamepad adapter; old input mappings retained as tests of actual native mapping, not shipped bypass. Public raw low-level pad snapshot only for channels documented in JY#6. / 原输入覆盖保留，运行时旧适配器删除。
- First true GPU route on cleaned source selected event training battle48 and courtyard rendering. Manual movement tick135→164; actual skill cast tick35→73 (not asserting a hit if no target in range); item quantity and usage marker changed; Rest advanced round4→5. Then explicitly used the game's own Auto mode and won round12/tick922, reward indicator shown, auto-save revision2, wins1. This is **manual command coverage + automatic finish**, not manual full victory. / 原版活动路径，没有人工修改战斗状态或数值。
- Auto toggle contrast repaired against bright snow with actual native dark card and unchanged role/hit geometry; final PC/device route and screenshots separate below. / 短屏增补实际对比。
- Windows Edge 158 / RTX 5090 Laptop native acceptance final run R6: **684/684**, 23 inspected captures; 0 unexpected console/HTTP errors or warnings (three injected faults are expected). Actual randomized battle42 courtyard: item quantity/usage both changed, Rest 2→3, movement tick403→429, skill cast tick440→473; then the named Auto control was explicitly used, resulting in loss at round6/tick840. Continue recorded revision2/losses1 and actual refresh directly resumed scene70/revision2. Across 873×325, 393×852, 768×1024, 1280×800, and 844×390, the selection, native host and canvas identity were retained and controls did not overlap; minimum targets respectively 56×56, 72×83, 106.4×106.4, 78.4×78.4 and 60.7×60.7 CSS px. Result reflowed in portrait and landscape without replacing the host; Continue ≥83 CSS px. / 实际胜败、存档及转屏回归；并非全程手动胜利。
- Galaxy Z Fold7 SM-F966U1, Android 17 Chrome, actual cover-screen landscape 873×325, local isolated origin: battle52 accepted movement tick122→325 and confirmed skill preview (cast cue not captured before round2 defeat); Continue returned and wrote revision2/losses1. A separate real restore from the same test origin at scene70 (19,19) opened ordinary randomized battle7, item quantity/usage changed, Rest advanced round2→3, naturally lost round3/tick609; Continue wrote revision3/losses2, actual refresh directly restored scene70/revision3. Physical test did not capture a successful skill cast or win; unattainable manual families remain failed in those individual receipts. Real phone screenshot showed readable native defeat card and Continue. Device session restored the original stay-awake state and closed only owned tabs. / 两次真实手机触控战败和回档通畅；分开覆盖移动、药品、休息，手机武学命中与胜利、实机内屏/转屏仍未验证。Browser rotation measurements above are not physical-device rotation.
## 第五批最终验收 · Final native migration (2026-11-29)

- Engine pin `212972678e633b1f3667f345d0646b0fba907ee1`, official 17 public entries; generated runtime hints 240/88. 148/148 Node tests including bilingual event-state equality and fixed-label/preparation lifetimes. Program-generated headings, notices, shops, rewards, status, save metadata and UI action labels use `createTextTable` and `pickLanguage`. All source dialogue, names, skills and data remain verbatim. No rule or save format changed. / 各界面中的原版内容不翻译；英文界面只覆盖程序生成内容。
- Windows Edge 158 / RTX 5090 Laptop D3D11 hardware route **683/683**, 0 unexpected errors/warnings. Local sample Start to scene 3.006 s and accepted native host 3.018 s, full opening 33 acknowledgments 7.976 s. Actual 692 randomly selected courtyard battle48; item/usage changed, skill cast tick164→200, Rest 3→4, move319→344; explicit native Auto after four manual command families, victory round15/tick1208, reward, save revision2 and browser refresh direct resume. Rotations used browser viewport resizing, not physical rotation. / 全部四类实际手动指令，随后原有自动战斗；非全程手打。
- Physical Samsung Galaxy Z Fold7 SM-F966U1 Android17 Chrome, cover landscape 873×325 CSS, original isolated QA save from earlier device encounters: 30/30 named device checks, no target warnings/exceptions; courtyard battle48, item/usage changed, rest2→3, move667→966, cast1026→1415; then explicit Auto won round12/tick2093, reward and revision4 restored after direct refresh. Real screenshots verified readable skill preview and result. Original device settings and unrelated tabs restored; no personal profile/save changed. / 本轮从保存的实际测试进度复跑；不声称原作全战役、实机转屏或整局手动胜利。
- Windows WebKit 26.6 iPhone device profile (not iOS hardware), English first scene and actual touch Continue 1/2→2/2: all visible application UI controls named in English, source name/dialogue retained in Chinese, no unexpected page/console/HTTP/request errors. Actual DOM structure has no old app controls; semantic ownership is the native canvas.
- Official exported `verifyScreens` using installed Chromium157 (default CLI shell pin absent): all 9 profiles title pass, 0 errors/warnings, all screenshots reviewed (including safe-area red bands). The live battle route separately retains the same host and selected command over five viewport sizes; simulated rotation does not substitute for real Fold7 inner screen or physical iPhone. / 标题多屏与实际战斗多尺寸分别记录，不把软件检查当成真机。

| 同样 fixture / Identical renderer fixture | Windows WebKit | Chromium SwiftShader |
|---|---:|---:|
| 120 changing integer labels, atlas measure/fill/readback → fixed | 120/120/120 → 0/0/0 | 120/120/120 → 0/0/0 |
| One-time fixed page preparation | 54 ms | 59.9 ms |
| First batch atlas → fixed (excluding one-time page) | 91 → 33 ms | 147.1 → 16.2 ms |
| 12 batches atlas → fixed | 337 → 219 ms | 572.9 → 392.6 ms |
| 32 arbitrary fallback labels, budgeted vs unbounded maximum callback | 78 → 36 ms | 83.3 → 79.1 ms |
| Same 32-label all-ready latency | 68 → 202 ms | 109.3 → 142.9 ms |
| Actual geometry upload before draw / on first draw | 4 / 0 | 4 / 0 |
| Program link before draw / on first draw | 1 / 0 | 1 / 0 |

Both vendored fixtures 6/6 and the exact production real-geometry helper passed. Chromium visible procedural geometry confirmed; raw default Windows WebKit one-shot screenshot after idle is black on both paths. With explicit preserveDrawingBuffer in the test only, visible green geometry and immediate center RGBA [155,201,143,255] were observed; the actual game route also visibly works. Budget pacing changes readiness latency and is limited to known ≥8 arbitrary labels, never applied globally to startup. Neither preparation nor a submitted frame is actual GPU completion. No whole-battle FPS reduction or VRAM saving claimed from these fixtures. / 固定字形、程序及几何测试不是完整战场帧率；真实 GPU 完成和显存另测。

Startup same browser 10/5 Mbps 40 ms CPU×4 isolated A/B (separate from generic quality numbers): baseline title 4.796 s / full data+title 43.339 s; broad 63 preloads 4.536 / 44.430 s; 117 preloads 4.880 / 44.302 s. Both alternatives rejected: total time regressed. Generic L1 2.2 s qualifies early title on its runner, but these independent samples and public latency can exceed 3 s, and full compressed pack validation remains mandatory. Do not move this wait back before the title. / 不以自动验收数值承诺所有网络三秒可玩。不改变现有数据包、校验和许可。

Remaining validation: physical iPhone/Safari, Firefox, WeChat, physical gamepad/screen reader, device inner screen/rotation, full campaign and full audio/VRAM/frame timing under dense encounters. Standard checker still has unrelated missing items in MechanismCity and TeaHorseRoad; JY, showcase and generated engine/capability ledgers pass. / 未覆盖部分保留，不改其他项目。
- 实际密集战斗补充 · Dense encounter: Windows Edge 158 / RTX 5090 Laptop **159/159** (15 actual captures, no page errors/warnings), isolated native opening earned normally followed by the pre-existing QA save fixture for 133. This is fixture-based, not natural campaign progression. Actual player input entered arena 133, move tick11→40 and skill cast436→463; remained manual. 20 unique real geometries and 35 program requests, no shader-only stand-in needed in this scene; program146.4 ms, geometry106.4 ms, parallel preparation146.5 ms, fixed glyph page8.9 ms. During an actual 10.0035 s sampled segment: rAF 2348 intervals p95 4.3 ms / max16.6 ms, zero >33.4 ms; 587 World3D draws (~58.68/s), 9 fixed numeric label jobs, 0 atlas fallback jobs; host refusal/retry0 and backpressure10. The segment naturally reached defeat by its end; Continue/reload was not tested in this dense case. These are observed CPU/dispatch/render counts, not GPU duration or a winning battle. / 未实测 133 全场结算、实体手机 133 或显存；同机旧版完整 133 没有等条件对照，因此不声称整个战场提升了多少百分比。
- Final root shell-only baseline regression: 271/271 named checks, all eight root title/settings screenshots match existing approved references, zero unexpected errors or warnings; no baseline rewritten. The prior full title/runtime baseline regression covered 12 references. · 不覆盖全部新战斗场景的像素基线，实机截图另行检查。
