# 品质验收 · Quality — 九州烽烟 · Nine Provinces Ablaze

## 原生界面第三批 · Native interface batch three (2026-11-28–29)

本节为本地候选阶段记录，沿用引擎 `7fb371acb8bab254cf1c49b9da0ac0eed0c06fb4`。原生化城池/军团详情、首月引导、记录/提示、互动地图名牌，以及包含原设置/存档在内的 18 类业务对话框。规则、数值、游戏资源、存档格式及 World3D 画质未改变；战场专用布阵、指挥与回放表现仍待第四批。 / This local-candidate record uses the same engine pin. The city/army sheets, first-month coach, journal/feedback, interactive map plates and 18 business-dialog types (including previous settings/saves) now use native UI. Simulation, balance, assets, save format and World3D quality remain unchanged. Battle-specific deployment, commands and replay presentation remain batch four.

### 本地验收 · Local acceptance

| 测项 · Check | 实际结果 · Observed result | 范围与限制 · Scope and limits |
|---|---|---|
| Node R1→R2 | 233/233 → **236/236** | 新增 3 项布局相关测试；R2 全集通过，严格引擎接口检查零错误。 · Three added layout-related tests; full R2 suite passes, with no strict engine-interface errors. |
| 软件浏览器 · Software browser R2 | 53/53 | 保留原流程及断言，包括开局、武将、战果/存读档、横竖布局、城市面板、速度与暂停；最终小幅布局调整前。 · Existing route and assertions, before the last minor layout refinements. Not a device test. |
| 最终软件浏览器 · Final software browser R5 | **54/54** | 最终确认取消回归新增一项，旧路线仍完整通过。固定参考截图：原生标题/设置 0.00% 差异、原战场 0.26%。 · All original assertions plus one native-confirmation cancellation; baseline title/settings 0.00% difference, original battle 0.26%. Not hardware/device metrics. |
| PC 对话框 · Hardware dialog R4 | 15/15 | Windows Edge/RTX 实际浏览器，鼠标、键盘及原生文本编辑；两个隔离预览见下文。 · Actual PC hardware with mouse, keyboard and native editing; two isolated previews noted below. |
| PC 地图名牌 · Hardware marker R1 | 20/20 | 同一个引擎和渲染器、城市/军团点击、模态遮挡、英文化、PC 窗口横竖重排、资源上限；非手机。 · Same renderer/engine, map picking, modal suppression, localization, desktop viewport reflow and bounded native resources. Not a phone test. |
| 官方多屏 R2 · Official screen matrix | **126/126** | 9 种屏幕配置各 14 个检查点，零 findings/engine warnings；浏览器布局配置非真机。 · Nine browser profiles, 14 checkpoints each; no findings or engine warnings. Not devices. |
| 实体 Fold7 · Physical Fold7 | **通过 · Pass** | 实际 Android 触摸、外屏横竖屏；22 个候选文件指纹及 8 项设备恢复均通过。详见下文。 · Actual Android touch on the cover display, all 22 selected source fingerprints and eight restoration checks. See below. |
| PC 原生确认追加 · Native confirmation R1 | **4/4** | 实际 RTX 浏览器的独立外交取消流程；保留原外交状态、下层界面及原生焦点；零页面/控制台/HTTP 错误。后续新增确认/通知/提示不是此前手机路线的一部分。 · Separate hardware route for canceling native diplomacy confirmation preserves state, underlying sheet and focus, with no console/page/HTTP errors. Newly added confirmation/badge/hint behaviors are not included in the earlier phone coverage. |

- R4 对话框实际流程：桃园结义事件不可被 Escape 跳过；武将名册通过引擎文本编辑器输入「刘备」、切换详情并显示画像；科技树 Graphics 连线与具名焦点、演义树 Graphics 连线、外交滚动。势力详情及出征滑条通过原有 `app.open` 独立预览（不执行出征）；实际键盘 Home/End 为原有范围 0/7,800。原第二批设置配乐滑条 Home 回归通过。无页面/控制台/HTTP 错误；此非完整战役或真人输入法验收。 / Actual R4 checks cover blocked story dismissal, browser-native roster search for 刘备, officer dossier and portrait, connected/focusable invention nodes, tale links and diplomacy scrolling. The realm sheet and muster slider use isolated existing-dialog entry, without issuing a campaign command; actual Home/End reaches 0/7,800, and the original music-volume Home check still passes. No console/page/HTTP errors. This is not a full campaign or physical IME test.
- R3 曾实际发现城池侧栏覆盖顶栏势力按钮及首月提示右边裁切；随后的 HUD 位置调整与名牌路线是另一次验收。 / Actual R3 exposed the city sheet covering the faction control and a clipped guide. The subsequent HUD position changes and marker route are a separate verification run, not retroactive credit for R3.
- 名牌 R1 环境：Windows Edge 158.0.4370.45，ANGLE D3D11 / NVIDIA GeForce RTX 5090 Laptop GPU。实点城市并选中对应原有 ID；通过已有游戏出征流程建立军团后，实点军团选中同一 ID；模态打开时地图名牌全部退场。英文和 PC 411×813 竖屏重排仍保留同一暂停战役、原有渲染器和 Engine；实际报告无页面/控制台报错、无遗留 campaign DOM 名牌。最终样本 127 个逻辑记录、2 个可见名牌/2 个池对象、1 个可见头像；本帧 7/64 图像页、refusedFrames=0。仅为该场景的诊断快照，非全部地图峰值或性能测量。 / Marker R1 used hardware Edge 158.0.4370.45 with RTX 5090 Laptop GPU. Actual pointer picks select the original city and newly mustered army IDs; modal views suppress underlying map plates. English and PC portrait reflow retain the paused campaign, engine and renderer. There are no runtime errors or remaining campaign DOM plates. The final snapshot has 127 logical records, two visible/pooled plates, one portrait, seven of 64 image pages and zero refused frames; this is neither a peak budget nor a frame-rate measurement.

### 实体三星 Fold7 · Physical Galaxy Z Fold7 (candidate)

- Galaxy SM-F966U1，Android 17 / Chrome 158.0.8127.44，ANGLE / Qualcomm Adreno 830，外屏实际 873×325 与 411×813 CSS px，DPR 2.625；本地候选和实际 CDP 触摸注入，22 个选定文件指纹匹配，零页面/HTTP 错误，8 项设备/测试环境恢复均通过。此为实体设备测试，不是徒手操作或内屏测试。 / Physical cover-display hardware in both orientations, local candidate with actual CDP touch injection; all 22 selected served-file hashes and all eight restoration checks passed, with no page/HTTP errors. This is device testing, not unaided hand input or inner-display testing.
- 跟随开局剧情、首月提示、触摸原生城市名牌；切换营建/政令/武将/概况标签，实际滚动科技、外交与武将名册（原生各约 379.3 单位），旋转保留宿主/战役状态，单指拖动约 117.8 CSS px、双指地图缩放跨度 344.9→411.2，继续至 day38 后暂停。 / Actual opening story, first-month guide, native city picking, all four city tabs, genuine native list scrolling (~379.3 units each in inventions, diplomacy and officers), orientation changes retaining the game/host, real drag and pinch, and resume then pause at day 38.

| 实体外屏场景 · Physical cover-screen (~5 s RAF sample) | 间隔数 · n | p95 / max (ms) | >50 ms |
|---|---:|---:|---:|
| 横屏标题 · Landscape title | 301 | 16.7 / 33.1 | 0 |
| 横屏地图 · Landscape realm | 302 | 16.7 / 16.7 | 0 |
| 竖屏地图 · Portrait realm | 304 | 16.7 / 16.7 | 0 |

三组短样本只反映浏览器帧间隔，不是 GPU 执行、合成或整场战斗数据；单次标题从导航等待就绪约 2,219 ms，未经重复冷启动对照。 / These short samples measure browser-frame intervals, not GPU execution, compositor or full battle performance. The single observed title readiness was about 2,219 ms; no repeated matched cold-start experiment was conducted.

官方多屏 R2：phone-small、phone-notch、phone-notch-wide、phone-tall、tablet、tablet-wide、foldable-cover-wide、foldable、desktop，全九种配置 14 个检查点通过；包含中英标题、设置、开局/自建势力/新武将、开篇、首月、城务、出征、科技、外交、武将和记录。自动验证通过不意味着每个滚动区域的初始所有文字同时可见。 / The nine official profiles passed all 126 listed checkpoints, including bilingual title, setup/registration, native campaign guide/city screens and dialog examples. This does not imply every scrollable item is simultaneously visible at the initial offset.

- 126 张检查点原图均已通过独立汇总视觉复看（18 张适配缩放、未裁剪接触表）。所有屏幕未见操作按钮或固定底栏进入模拟刘海遮挡区；首月提示、城池与小地图各占独立区域。极短横屏 873×325 的科技树节点与武将列表要向下滚动才能见到，出征先显示第一位武将；固定返回/取消/出征仍可见。第二批遗留 873×325 标题语言切换时的滚动位置可裁掉部分第一个入口；桌面/平板英文标题尾注位于初始滚动视口之外。短剧情和记录模态仍有较多空白。这些是实际看图所得的体验限制，不是自动布局失效。 / All 126 checkpoint images were visually reviewed via 18 uncropped fit-only contact sheets. No actionable controls or fixed footers intruded into simulated notches; the coach, city sheet and minimap occupy separate regions. The shortest landscape view (873×325) requires scrolling to reach invention and officer rows and initially exposes only the top muster officer; fixed Back/Cancel/Muster controls remain visible. The batch-two language-switch title clipping remains in that viewport, English title attribution lies below the initial desktop/tablet viewport, and short story/chronicle dialogs contain excess blank space. These are observed UX caveats, distinct from layout-verifier failures.
- 18 张实体 Fold7 画面复看确认首月引导、选择城市与四类城务标签、三类原生长列表滚动；近看部分小字号仍有轻微光栅阶梯。 / Review of all 18 physical-device captures corroborates the guide, picked city, four city tabs and three long-list scroll paths; some small native glyph edges remain visibly stepped at close inspection.

### 实际画面 · Actual captures

下表来自本地候选的 Windows 硬件浏览器测试。JPEG 是未经缩放或裁剪的审阅副本；PC 竖屏图来自窗口配置，**不是 Fold7 真机**。 / These JPEG review copies retain the original screenshot dimensions and are not pixel-assertion references. The PC portrait example is a viewport configuration, **not a physical Fold7**.

| 对话框路线 R4 · Dialog route | 地图路线 R1 · Map route |
|---|---|
| [桃园结义 · Story](test/native-realm-evidence/pc-story.jpg) | [原生城池面板/名牌 · City sheet/plate](test/native-realm-evidence/pc-city-marker.jpg) |
| [名册搜索 · Roster search](test/native-realm-evidence/pc-officer-search.jpg) | [出征选择 · Muster](test/native-realm-evidence/pc-muster.jpg) |
| [武将详情 · Dossier](test/native-realm-evidence/pc-officer-dossier.jpg) | [原生军团面板/名牌 · Army sheet/plate](test/native-realm-evidence/pc-army-marker.jpg) |
| [科技树 · Invention graph](test/native-realm-evidence/pc-tech-tree.jpg) | [PC 竖屏配置 · PC portrait emulation](test/native-realm-evidence/pc-portrait-emulation.jpg) |
| [演义树 · Tale graph](test/native-realm-evidence/pc-tale-tree.jpg) | — |

实体 Fold7 外屏（原图 1080×2283 px，竖屏 411×813 CSS px）：[首月引导 · Coach](test/native-realm-evidence/fold7-first-month.jpg)、[城务政令 · City orders](test/native-realm-evidence/fold7-city-orders.jpg)、[科技树滚动 · Scrolled inventions](test/native-realm-evidence/fold7-tech-scrolled.jpg)、[手势后地图 · Map after gestures](test/native-realm-evidence/fold7-map-portrait.jpg)。 / Physical Fold7 cover-display screenshots, kept at the original physical dimensions; these four are actual device captures rather than the PC emulated portrait example above.

目前没有第三批同机位性能对照、第三批公开部署、实体内屏/完整手机战役或长时间高负载结论。官方多屏 R2 和实体外屏路线早于最后一次原生确认/通知/提示微调；其后另有最终软件 R5 54/54 和 PC 隔离确认 4/4，但尚未在同一手机或全部配置重复最后变更。第二批的性能和真机数据仍单独保留，不挪用为第三批结果。 / Batch-three matched performance, public release verification, the physical inner display/full mobile campaign and sustained high-load results remain unmeasured. The official screen matrix and physical-device route precede the last confirmation/badge/hint polish. Final software R5 (54/54) and isolated PC confirmation (4/4) followed, but the last changes have not been repeated across all profiles or on the same phone. Batch-two figures below remain separate evidence.

## 原生界面第二批 · Native interface batch two (2026-11-28)

- 公开版追加复测 · Public follow-up: [PR #306](https://github.com/cnedwin/PortedGamesEgret/pull/306) 合并 `d726a21c220b9da308dffa247b5afca1e2bdbc88` 后，[Pages 运行 46160930591](https://github.com/cnedwin/PortedGamesEgret/actions/runs/46160930591) 成功。独立 Windows Edge 158.0.4370.45 访问实际公开英文版，**7/7** 通过：HTTP 200、实际英文标题及按钮、鼠标打开/关闭原生设置、index.html 和 main.mjs 绝对指纹吻合、零浏览器/HTTP 错误。单次公开标题就绪 9,138 ms，不能与下述本地启动值直接比较。 / The successful Pages deployment of merged batch two passed seven distinct assertions in an actual public English browsing session: HTTP, title/control, settings open/close, two served-file hashes and no errors. One public readiness measurement was 9,138 ms, not directly comparable to the local cold sample.

- 版本与范围 · Pin and scope: `7fb371acb8bab254cf1c49b9da0ac0eed0c06fb4`，与独立引擎升级后的旧 UI 对照，保留 3D 场景、资源、规则、数值、存档格式。原生化标题、开局与自建势力、武将登录、设置/存档/确认、天下图顶栏和小地图，复用同一个 Play/World3D 宿主。 / Same pin on both sides of the UI comparison; gameplay, saves and World3D assets are retained. The native shell includes the title, campaign/custom banner setup, officer registration, settings/saves/confirmation, realm HUD top bar and minimap on the shared Play/World3D host.
- 自动验收 · Automated acceptance: Node **217/217**；`test/accept.mjs` R6，SwiftShader 软件渲染 **53/53**（包括原路线、原生独立音量、存读档、中文武将姓名编辑与自建势力开局）；官方屏幕验收 **9/9** 配置各 6 个界面检查，共 **54/54**（中英标题、设置、剧本开局、自建势力、武将登录，含刘海/窄横屏/平板/折叠屏配置；无 findings 或 engine warnings）。屏幕配置不是物理设备。 / All 217 Node tests and 53 browser assertions passed, plus six official checkpoints on each of nine screen profiles. The 54 screen checks are browser layout configurations, not physical devices.
- PC 真机设置 R3 · Hardware-backed settings R3: Windows Edge / NVIDIA GeForce RTX 5090 Laptop GPU (ANGLE D3D11), **8/8**：原生设置可打开，Home/End 将配乐音量置 0/100%，真实鼠标拖动保存到 77%，独立关闭音效，Escape 返回打开者焦点，实际 GPU，零控制台/页面错误。 / The native settings sheet, Home/End, actual mouse drag, independent effects, Escape focus restoration and real hardware checks all passed with no console or page errors.

### 同机位 PC 性能 · Matched PC performance

两版均为本地 HTTP、同引擎、1280×720、高画质、固定机位，等待地形流式加载稳定后分别采集约 2.4 秒真实浏览器 RAF 间隔；这是受控场景短样本，不是完整战役或 GPU 执行/合成计时。 / Local HTTP and the same engine pin, high quality, 1280×720, fixed cameras, streamed terrain settled; approximately 2.4 seconds of browser RAF intervals per sample. These are controlled short samples, not a full playthrough or GPU/compositor timings.

| 场景 · Scene | 改前 p95 / n | 改后 p95 / n | 最大间隔 ms · Max before → after | World3D draws / triangles（两侧相同 · unchanged） |
|---|---:|---:|---:|---:|
| 标题 · Title | 4.3 / 568 | 4.3 / 568 | 8.5 → 8.4 | 96 / 565,500 |
| 平原 · Pingyuan | 4.3 / 566 | 4.3 / 565 | 8.4 → 8.5 | 63 / 317,080 |
| 南皮演武 · Nanpi deployment | 4.3 / 544 | 4.3 / 547 | 16.8 → 16.7 | 140 / 1,059,477 |

各样本 p50 为 4.2 ms，>50 ms 的间隔均为 0，零浏览器错误。**冷启动仍需优化**：旧标题 ready 1,667.2 ms → 新版 title ready 且原生按钮可用 3,003.4 ms；进入天下图 ready 847.8 → 997.5 ms。各一次；新标题多一道实际原生控件就绪检查，未归因网络、资源、UI 或 GPU，不以此判断稳态改善或引擎回退。 / Both versions have 4.2 ms p50, zero >50 ms intervals and zero browser errors in the settled samples. Single cold runs show the additional title readiness wait (1,667.2 → 3,003.4 ms) and realm readiness (847.8 → 997.5 ms); the native title additionally awaits its real button. Further phase attribution is needed.

| PC 实际截图 · PC hardware images | 旧界面 · Before | 原生界面 · Native |
|---|---|---|
| 标题 · Title | [before](test/native-shell-evidence/pc-before-title.jpg) | [native](test/native-shell-evidence/pc-native-title.jpg) |
| 平原 · Pingyuan | [before](test/native-shell-evidence/pc-before-pingyuan.jpg) | [native](test/native-shell-evidence/pc-native-pingyuan.jpg) |
| 南皮演武 · Nanpi deployment | [before](test/native-shell-evidence/pc-before-nanpi-deploy.jpg) | [native](test/native-shell-evidence/pc-native-nanpi-deploy.jpg) |

### 三星实机 · Physical Galaxy Z Fold7

- 外屏 Galaxy SM-F966U1，Android 17 / Chrome 158.0.8127.44 / Adreno 830 WebGL2，中画质、中文，实际横屏 873×325、竖屏 411×813、DPR 2.625；新版本局域 HTTP/USB reverse，20/20 选定服务源与运行时文件指纹匹配，零页面/HTTP 错误，测试租约和环境恢复。 / Physical cover display in the two listed orientations, local candidate; all 20 sampled served-file fingerprints match, with no runtime/HTTP failures and device state restored.
- 原生触控滑条实测接触 0→1→0：配乐 55%→29%，音效 80%→66%，独立预览、释放后应用状态/存储/音量一致，返回设置开启者焦点；竖屏触点约 363.9×44 CSS px。 / Actual touches changed the music and effects ranges independently, previewed sound, committed the final values after release to the game, storage and mixer, and restored opener focus.
- 旧版短横屏首月提示底部超出屏幕至 y373.60；新版底部 y313.33（325px 屏幕），实际滚动 0→56.38 px，主操作按钮全部可见，小地图未被覆盖。单指拖动地图、双指张合、点击城池、原生小地图/归城、继续至 day34 后暂停及横竖旋转保留同一宿主/地图/战役对象均通过。 / Actual scrolling reveals the clipped first-month action; map drag/pinch, city selection, minimap/home-city, continuation then pause and rotation retain the same live campaign.

| 外屏场景 · Cover-screen sample (~5 s) | RAF 次数 · Intervals | 原生 p50/p95/max (ms) | >50 ms |
|---|---:|---:|---:|
| 标题横屏 · Title landscape | 302 | 16.6 / 16.7 / 16.7 | 0 |
| 标题竖屏 · Title portrait | 302 | 16.6 / 16.7 / 24.9 | 0 |
| 暂停地图横屏 · Paused map landscape | 302 | 16.6 / 16.7 / 16.7 | 0 |
| 暂停地图竖屏 · Paused map portrait | 302 | 16.6 / 16.7 / 41.6 | 0 |

上述均为浏览器帧间隔，约 60 Hz，并非 GPU 耗时或高负载战斗。B2 本地冷启动 2,252 ms（另两次 2,083/3,468），B1 公开 CDN 6,348/7,126 ms；网络和传输不同，不作为提速证据。 / These are browser frame intervals, not GPU times or high-load fights. B2 local cold starts and B1 public CDN cold starts are different transports and not evidence of speedup.

实际截图 · Physical images: [设置竖屏 / portrait settings](test/native-shell-evidence/fold7-settings-portrait.jpg) · [开局竖屏 / campaign setup](test/native-shell-evidence/fold7-campaign-portrait.jpg) · [首月提示滚动 / scrolled guide](test/native-shell-evidence/fold7-first-month-scrolled.jpg) · [地图竖屏 / portrait map](test/native-shell-evidence/fold7-map-portrait.jpg). 功能路线截图 · Browser route images: [武将登录 / registered officer](test/native-shell-evidence/registered-officer.jpg) · [自建势力 / custom founding](test/native-shell-evidence/custom-founding.jpg).

**限制 · Limits:** 原生文字边缘在外屏仍略有阶梯，短横屏首月提示与旧城池面板边缘仍小幅重叠（可关闭提示）；其余城池/剧情/战斗等业务 UI 暂留旧版。未测试物理 Fold7 内屏、手机英文切换、完整手机战役、长时间密集战斗、人的扬声器主观听感或实体 iPhone。本节是候选的本地验收，不代替 GitHub Pages 发布后验证。 / Mild native text stair-stepping and a small guide/legacy-city overlap remain. The inner display, physical iPhone, mobile English switch, full mobile campaign, sustained battle load and human speaker listening were not covered. This is local candidate acceptance, not post-deployment verification.

## 引擎独立升级 · Engine-only refresh (2026-11-28)

- 对照版本 · Comparison: `82561d6338a805f0e0459a2d5d42a284f9385b30` → `7fb371acb8bab254cf1c49b9da0ac0eed0c06fb4`；同一游戏提交的规则、资源、界面和存档。 / Identical gameplay source, assets, UI and save format. The pinned engine was built with Node 26.7.0 and copied with the official vendor tool.
- Node: 196/196 → 196/196. `node tools/balance.mjs` 种子 7 的最终统计及逐年代数据一致，仅程序报告的运行时间不同。 / Seed 7 yields identical era tables and final tallies; the reported running times differ.
- 软件渲染 · Software browser acceptance: 50/50 → 50/50. 原测试把两个含「寻访」的按钮都匹配到了；仅为该定位器增加 exact:true，未删断言、未重拍旧截图基线。旧版严格原脚本止于该歧义，修正后完整路线通过。新版标题和设置对固定软件参考图差异均 0.00%。 / The sole selector correction is exact matching for the ordinary Search button; the old script otherwise stops on two matching controls. All original assertions remain and the reference images are unchanged; candidate title/settings differ by 0.00% from them.
- 真显卡 · Hardware-backed browser: same Windows Edge / ANGLE D3D11 / NVIDIA RTX 5090 Laptop GPU, 1280×720, high quality. 两个硬件样本均为自动浏览器交互、非真人通关；旧软件基线和硬件画面不能混比（标题、设置固定跨渲染器差异约 9.30%、2.40%），48 项功能断言全部通过。 / Both are automated real-PC browser routes, not human campaign completion. The two software-reference image comparisons on hardware have the same pre-existing renderer differences; all 48 functional assertions pass. Portrait below is PC emulation, not a handset.
- 官方验收器 · Official generic verifier: pass 8/8、无错误、无警告、无失败请求，已声明 ready 3,616 ms。默认 Playwright 的固定 Chromium 缓存缺失；通过官方 --playwright 参数只选择已安装 Edge 可执行文件并保留软件渲染标志、原判定。 / Missing the pinned Chromium executable locally, the supported --playwright transport selects installed Edge; the verifier retains all checks and software-renderer flags. Strict source check: 0 errors, 0 warnings (135 files, 21 engine imports).

| 实际 PC 浏览器采样 · PC frame-interval sample | 改前 p95 / n | 改后 p95 / n | 改前/后最大间隔 · Max ms |
|---|---:|---:|---:|
| 城池 · City, high | 8.4 ms / 276 | 8.4 ms / 269 | 312.5 / 325.0 |
| 战场 · Battle, high | 4.3 ms / 469 | 4.3 ms / 455 | 29.2 / 33.3 |
| 390×844 PC 模拟 · Emulation, low | 8.4 ms / 279 | 8.3 ms / 289 | 1674.9 / 1758.3 |

标题冷启动初次间隔约 3.55 → 3.29 秒（4/5 个样本）；不是稳态帧率。上述为浏览器帧间隔，非 GPU 执行或呈现耗时。软件渲染 F1、地形和首次城池构建优化仍待专项验证。 / First title intervals about 3.55 → 3.29 s (four/five samples) are not a steady-state rate. These are browser callback intervals, not GPU execution or presentation latency. Software F1, terrain and first city construction remain separate work.

| 同显卡旧版/新版截图 · Hardware before/after | 任一 RGB 通道差 >40 的像素比例 · Changed pixels |
|---|---:|
| [标题 before](test/engine-refresh-7fb371ac/before-title.jpg) · [after](test/engine-refresh-7fb371ac/after-title.jpg) | 0.00857% |
| [设置 before](test/engine-refresh-7fb371ac/before-settings.jpg) · [after](test/engine-refresh-7fb371ac/after-settings.jpg) | 0.00011% |
| [城池 before](test/engine-refresh-7fb371ac/before-world-city.jpg) · [after](test/engine-refresh-7fb371ac/after-world-city.jpg) | 0.00553% |
| [战场 before](test/engine-refresh-7fb371ac/before-battle.jpg) · [after](test/engine-refresh-7fb371ac/after-battle.jpg) | 0.05024% |
| [竖屏 PC 模拟 before](test/engine-refresh-7fb371ac/before-portrait-city-emulation.jpg) · [after](test/engine-refresh-7fb371ac/after-portrait-city-emulation.jpg) | 0.0000% |

对比在未压缩的原始 PNG 上完成；链接为审阅用 JPEG，不是正式截图断言基线。 / Pixel checks use the original uncompressed PNGs; linked JPEG copies are for inspection, not the assertion baselines.
未运行：实体手机/平板（本批）、Safari/Firefox/读屏/真手柄、多屏 UI 用例、完整真人战役。 / Not run for this batch: physical phone/tablet, Safari/Firefox, screen reader, physical controller, full multi-screen UI cases, complete human campaign.

## iPhone 配置的 World3D 首场景追加验收 · WebKit first-world-scene check

- Windows Playwright WebKit 26.6, iPhone 15 Pro 竖屏配置，393 × 659 CSS px；公开 Pages d1bcff69 与候选本地 HTTP，均全新上下文、真实浏览器触摸。 / Windows WebKit with an iPhone 15 Pro portrait profile; clean browser contexts, actual browser touch events, public baseline at d1bcff69 and local candidate. Not a physical iPhone.
- 路线 / Route: 新的征程→开局→城池大地图 / New campaign → start → city map.
- 改前：地图全黑、只剩城市名称及 DOM 控件；frame 197，37 draw calls / 101,290 triangles，3D backing buffer 235 × 395，截图没有场景。 / Before: missing visible 3D scene at a 235 × 395 backing buffer despite renderer submissions.
- 改后：标题与开局地图均恢复；关闭首月建议/城池详情后可见完整城墙、道路、地形及树木；frame 354，36 draw calls / 101,146 triangles，backing buffer 393 × 659，前后仍为 low 画质。 / After: title and map restore; after dismissing the first-month guide and city detail, the walls, roads, land and trees are visible; frame 354, 36 draw calls / 101,146 triangles, 393 × 659 backing buffer, still using the low quality tier.
- src/view3d/stage.mjs 只在移动 Apple WebKit 主机指定官方 `dynamicResolution:false`；保留其他平台、画质档、资源及玩法不变。 / Only mobile Apple WebKit passes the official dynamicResolution:false option, preserving the quality tiers, assets and other hosts.
- Node 196/196 通过；复测页面异常、控制台错误、HTTP 错误、失败请求均为 0。 / 196/196 Node checks pass and there are zero page exceptions, console errors, HTTP errors and failed requests.
- 分辨率锁定由 92,825 像素提升至 258,987（约 2.79 倍），是修复画面缺失的代价；没有在真实 iPhone GPU 上测到开销，不能将无头 WebKit 的 frame 计数当帧率，也不能断言故障根因完全在浏览器或引擎。 / Fixed resolution raises pixel area from 92,825 to 258,987 (about 2.79×). Physical iPhone GPU cost is unmeasured; frame counter values are receipts, not FPS, and ultimate engine/browser root cause has not been established.

## iPhone 配置 WebKit 启动回归（2026-11-28） · WebKit startup compatibility

Windows 上的 Playwright WebKit 26.6，iPhone 15 Pro 设备配置，竖屏 393 × 659 CSS px，独立的新浏览器上下文；不是 iPhone 真机或 iOS Safari 本体。改造前测试公开 Pages，改造后测试候选工作树的本地 HTTP 服务。

Windows Playwright WebKit 26.6 with an iPhone 15 Pro profile (portrait, 393 × 659 CSS px, isolated fresh browser context); not a physical iPhone or iOS Safari itself. Baseline: public Pages; retest: candidate worktree over local HTTP.

- 引擎副本 · Engine: `82561d6338a805f0e0459a2d5d42a284f9385b30`.
- 改造前：加载页停滞并报告 AUDIO_HOST_UNAVAILABLE；本环境缺少两个 AudioContext 构造器。src/audio/sound.mjs 仅在该错误时提供无声可选服务，正常音频路径不变，其他错误照常抛出。 / Before: loading stalled with AUDIO_HOST_UNAVAILABLE; both audio context constructors are absent. src/audio/sound.mjs treats only that error as unavailable optional audio; the usual audio path is unchanged, and other errors propagate.
- 改造后 / After：标题正常，实际触摸设置打开设置，即使这个测试环境没有 Web Audio 也不阻止进入标题。 / The title displays correctly, touching Settings opens its panel, and the tested no-Web-Audio host no longer blocks startup.
- 复测无页面异常、控制台错误、HTTP 4xx/5xx 或失败请求（四项均 0）；`node --test test/*.test.mjs`：195/195 通过。 / No page exceptions, console errors, HTTP 4xx/5xx or failed requests on the local retest (zero in each category); 195/195 Node tests pass.
- 仅验收启动、首屏截图及一次浏览器触摸操作；未覆盖整局、设备横竖屏切换、物理 iPhone、真实 iOS 音频、Safari 版本差异或性能。 / Startup, title screenshot and one browser touch event only; full playthrough, rotation, physical iPhone, real iOS audio, Safari version variation and performance were not covered.

**历史基线 · Historical baseline**

本页记录 3D 天下图初版的软件渲染数据。新版立绘、场景配乐和地图远近景的实测记录见 [README](README.md#已验证--verified)。

This page records the first 3D realm build in software rendering. See the README for the later artwork, soundtrack, and map verification.

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs NineProvinces` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs NineProvinces`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-23
- 浏览器 · Browser: 无头 Chromium 153.0.8010.12，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Linux 容器 · a Linux container, linux x64, Node v22.23.4
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 4 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 不达标 · fail | p95 233.3 ms over 25 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 2.8 s to the first playable screen, 3.1 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "Load" (outline) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 4 named controls, e.g. button "New campaign", button "Load", button "Settings" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: nine-provinces) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: nine-provinces) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 不适用 · n/a | the game loads no image, sound, font or data file |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: F1。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.

## 人工与真机结果 · By hand and on devices

- A1m、S4：由本目录的 `test/accept.mjs` 在无头 Chromium 里覆盖——只用键盘走完标题、设置、一局和结算，存档改坏后标题显示提示并重新开始。没有由人另做，也没有用真读屏。 · Covered by this folder's acceptance script in headless Chromium: the whole path by keyboard, and the notice after a broken save. Not done again by a person, nor with a real screen reader.
- T1、F2、E4、I2：未运行 · not run.

- 54 张多屏检查点截图逐张复核：菜单边框和固定按钮不进入模拟刘海；873×325 短横屏在语言切换后可保留滚动位置，首个入口可能部分裁在滚动区域外，向上滚动可完整看到。其他滚动列表截断在自身视口，固定返回、保存、开始按钮可见。正式场内界面和内屏实机仍待后续批次。 / All 54 screen checkpoint pictures inspected: menu frames and fixed controls avoid simulated notches. After changing language at 873×325, retained scroll position can partly clip the first title action inside its own scroll body; scrolling up reveals it. Other scrolling lists clip within their own viewport, with fixed Back, Save and Start controls visible. Full in-game native UI and physical inner-screen checks belong to later batches.
