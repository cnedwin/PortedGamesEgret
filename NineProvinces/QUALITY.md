# 品质验收 · Quality — 九州烽烟 · Nine Provinces Ablaze

## 第五批引擎适配与性能 · Batch-five engine adaptation and performance (2026-11-29, candidate)

这批沿用正式引擎 `7fb371acb8bab254cf1c49b9da0ac0eed0c06fb4`，在已发布第四批上逐项适配原生接口、输入易用性与实际性能。不是新引擎版本的差分，不改变数值/存档/现有玩法。以下独立实验和最终组合路线须分开。 / The pinned engine remains unchanged from published batch four. This batch adopts additional native interfaces, accessibility and measured performance improvements without altering game rules, balance or saves. Independent experiments and final combined acceptance are separate.

### 纯软件绘制预算 · Automatic software-renderer pixel budget

Windows Chromium / ANGLE SwiftShader Vulkan，1280×800 CSS px，自动质量选择（两版均 low），相同标题固定场景，四秒浏览器 RAF 短窗口，各一次；零报错，71 次 World3D draw calls 保持。 / One matched four-second software-browser title sample per variant, automatic quality remains low, identical scene and 71 World3D draws, no errors.

| 测项 · Measurement | 第四批对照 · Before | 自动软件预算候选 · After |
|---|---:|---:|
| 标题实际就绪 · Cold title ready | 2,281.0 ms | 2,004.0 ms |
| 3D 绘制比例/尺寸 · World render ratio/size | 0.70 · 896×560 | 0.34 · 435×272 |
| RAF 间隔数 · Intervals | 43 | 112 |
| p95 / max | 120.9 / 237.5 ms | 41.6 / 87.5 ms |

自动软件专用预算由 `createDynamicResolution3D` 管理，低档 3D 的范围 0.34…0.50，原生输入及 UI 纹理仍保持 2 倍密度；实际硬件或明确手动选择质量继续使用既有动态范围。截图显示纯软件专用 3D 地形/城池细节确实更柔、更低分辨率，不是等视觉质量的性能优化，不降低正常硬件效果。候选试验的同预算可选地面 shader guard 为 p95 41.7 ms、112 个间隔，未见可确认收益，因此保留原着色程序。**F1 桌面软件 p95≤16.7 ms 仍未通过**；不能把软件数字当真机 GPU 数据或用早期不同条件基线宣称消除卡顿。 / Only automatically selected software rendering receives a tighter native dynamic-resolution range; native UI remains density 2. The screenshots show intentionally softer 3D scenery on software, not an equal-visual-quality optimization. Hardware and explicit quality selections retain their ordinary range. The small guarded shader variant yielded 41.7 ms p95 with 112 intervals, no proven benefit, so the original shader remains. **The 16.7 ms software F1 requirement still fails.** This is neither hardware GPU performance nor a universal elimination of stutter.

对照图：[软件标题改前 · Before](test/native-performance-evidence/software-title-before.jpg) · [自动软件预算 · Automatic budget](test/native-performance-evidence/software-title-automatic.jpg)，均保留 1280×800 原始截图尺寸。 / Original-size visual review copies.

### 同一 Play 时钟与原生文字调度 · Same-clock host and native text pacing

六次独立本地冷启动实际 Windows Edge / ANGLE D3D11 NVIDIA RTX 5090 Laptop GPU，高画质 1280×720，固定 reduced-motion、关闭网络/磁盘着色器缓存及 Service Worker；每次相同源文件指纹、同引擎。独立排除地形 Worker/首城准备以隔离宿主。A 立即提交、无文字预算；B 原生 `afterFrame + deferRender`、无文字预算；C **立即提交**、仅实际上下文 4 ms 文字预算。并非 C 同时启用两项。 / Six fresh real-hardware browser processes; identical measured source and explicit high quality. Terrain worker and city preparation are disabled for isolation. A immediate/none, B native deferred/none, C **immediate with text pacing only**. Final combined defaults are a separate candidate.

| Trial | 标题文字/操作就绪 · Title ready (ms) | 首次接受 World3D CPU draw (ms) | 首次实际操作→开局文字 · First action (ms) | 原生 2D 程序准备 · 2D program prep (ms) | 地图文字→安装 · Marker text (ms) |
|---|---:|---:|---:|---:|---:|
| A1 | 7283.2 | 4677.5 | 63.5 | 2180.2 | 20.5 |
| B2 | 6981.7 | 4257.6 | 65.7 | 1857.2 | 22.7 |
| C3 | 6840.1 | 4232.4 | 49.1 | 1831.4 | 21.1 |
| A4 | 6904.0 | 4183.6 | 61.9 | 1840.7 | 22.5 |
| B5 | 6826.5 | 4179.6 | 62.2 | 1850.7 | 22.5 |
| C6 | 6928.6 | 4255.6 | 50.0 | 1854.0 | 19.8 |

平原、洛阳、稳态标题和南皮布阵各约三秒，共 24 窗口：p95 均 4.2–4.3 ms、最大 25.0 ms、0 个 >50 ms；每窗口约 650–724 次已接受 World3D 帧。实际 RTX 路线每回调最多一次 3D 绘制，未自然出现可合并的追帧；B 的 updateMs 降低体现渲染 CPU 工作转入 afterFrameMs，不是 GPU 加速。每次 A/B/C 只抓到两个地图文字（城名/印章），2/2 均安装、无中止，无高密度标牌提速证据。冷启动数字含清除缓存/着色程序准备且只有两次各模式，不宣称显著的标题优化或和公开 CDN 数据直接比较。 / Across 24 ~3 s windows, p95 remained 4.2–4.3 ms, max25.0, no >50 ms. This hardware did not naturally need multiple catch-up World3D draws in one browser turn. Render work moving from update into afterFrame is not GPU speedup. Only two captured marker text revisions per trial reached 2/2; no dense-label workload proof. Cold times with disabled disk/cache and two trials per mode are not directly comparable to public-network or warm measurements. Actual GPU execution/presentation were not measured.

原生 `onFrameTiming` 两个观察者记录 CPU 阶段，共用 performance time origin，不能相加重叠的 Play/World3D 开销。独立受控时钟试验确认多次更新合并一次提交并保留首个/暂停/取消语义。候选最后选择启用同一时钟的 2D-first 与仅空闲天下图 4 ms 原生文字预算；标题/开局/模态/选中城池/战场及演武均禁用该文字预算，保留独立关闭开关。组合默认值另作完整设备回归。 / Independent native timing callbacks observe overlapping CPU phases; do not sum their totals. A controlled-clock fixture verified coalescing and first-frame/pause/cancellation. Candidate combined policy uses 2D-first and contextual native text pacing only on idle realm, with title/setup/modal/selection/battle/trial excluded; both have independent opt-outs. Final combined device route is separate.

实际显卡截图：[A 即时标题 · Immediate](test/native-performance-evidence/pc-host-immediate-title.jpg) · [B 延迟同钟 · Deferred](test/native-performance-evidence/pc-host-defer-title.jpg)；[A 平原字牌 · Baseline label](test/native-performance-evidence/pc-label-before.jpg) · [C 仅文字调度 · Text pacing](test/native-performance-evidence/pc-label-budget.jpg)。动态水面可有差异，未声称逐像素相同。 / Matched hardware review screenshots, not pixel identity evidence.

### 原生文字与键盘 · Native text and keyboard

- B5 最终候选 Node R4 **291/291**，包含原生文字/列表专项 **33/33**：全部 502 个原中英文条目、7,028 次占位符/缺值等价对照、8 个旧语言归一化行为与具名目的地列表入口。独立草案还逐条验证 1,848 次日期、28 次数字和 12 次名称输出，完全相同；没有改动保存/查询优先级。 / Final Node R4 **291/291** includes 33 focused text/list checks, 502 original entries, 7,028 exact substitution pairs, eight language normalization cases and named list entry. Separate adapter evaluation also matches 1,848 dates, 28 numbers and 12 name outputs; no saved/query locale priority changes.
- 目的地列表使用正式 `game.select` 的分页滚动/具名操作与取消，保留原地图点击，选择最终 ID 仍走相同业务入口；过期战役/选择/模式或取消不得发出操作。5/5 纯生命周期测试通过。实际 Windows Edge/RTX 键盘 **14/14**：Tab/Enter 从标题、刘备开局、剧情、首月、城务、出征到按列表选择冀州/南皮，原游戏订单的军团 `target` 为 `nanpi`、原路径 `[nanpi]`；模拟标准手柄由实际 Play 轮询检测后 B 关闭设置，零浏览器错误。未用真手柄、未声称纯键盘完整战役。 / Five picker lifecycle checks pass, preserving existing map input and callback and rejecting cancelled/stale contexts. Actual keyboard on PC Edge/RTX **14/14** runs from title through the native campaign/guide/city sheet to the original destination order, with exact original target and path. Simulated standard controller polling and B cancellation of Settings pass, no browser errors. Not physical controller input or a full keyboard-only campaign.
- [实际键盘出征后的地图 · Actual keyboard destination receipt](test/native-performance-evidence/pc-native-keyboard-destination.jpg)；原地图点击同时保留。第五批 I1 初轮发现浏览器原生 canvas label 是固定双语，改为应用自己的真实 canvas 前后切换中英名称；没有重建语义树。Windows 软件浏览器实际 en→zh→en 复测通过，英文可访问名称除切换语言「中文」按钮外无 CJK，零错误。 / Actual keyboard screenshot; original pointer path remains. The first quality check found a fixed bilingual canvas accessibility name; the real canvas now follows the selected locale without rebuilding browser semantics. Separate actual software-browser en→zh→en succeeds with no leftover CJK in English labels except the language toggle, zero errors.
- 百年种子 7、曹操演义：与此前基准 184–280 年全部统计行及最终 tally 完全一致（仅运行用时标题不同）；`src/sim`、`src/data`、存档和战役恢复规则没有差分。 / All seed-7 century-run era rows and final tally exactly match the existing baseline, excluding only the time header; no simulation/data/save/recovery-rule changes.

- 最终独立可复跑 `node test/native-input-accept.mjs` 在无头 Chromium 软件浏览器 **12/12**：原生键盘开局/城务/订单、Escape 取消列表并保留军团/模式/日期、精确目的地回调、模拟标准手柄 B 取消无命令，零浏览器错误。正式旧主流程 `node test/accept.mjs` 最终 **56/56**，含新增两个语言/真实 canvas 名称断言；标题/设置/战场固定参考差异仅 0.25% / 0.16% / 0.55%，未换参考图。 / Reproducible native keyboard/input acceptance passes all 12 checks in a software browser, including Escape and simulated controller B cancellation without state/command changes. The final original functional/screenshot route passes 56/56 including both new locale/canvas assertions; reference differences 0.25%/0.16%/0.55%, no rebaseline.

### 故障恢复 · Asset failure recovery

品质工具最初的拒绝加载路径中只拒绝了 `assets/audio/title-score.mp3`，原版仍可玩但没有重试提示（E2）。候选加入原生模态 `配乐暂未载入 / Music unavailable`、`重试配乐 / Retry music`（默认焦点）及 `继续游戏 / Continue playing`，无需伪造成功加载。实际中英画面可见。独立浏览器首个请求被拒后手动重试，实际共两次文件请求且第二次音频解码进入标题缓存；持续拒绝时继续游戏只保留第一次请求，正常标题上的 New campaign 可进入开局。故意拒绝网络时有一次预期资源失败控制台信息，无未捕获 pageerror；相关 Node **4/4**。未实测真实扬声器听感。最终品质工具 R2 已通过 E2：只拒绝一件资源、无未捕获异常且提供重试。 / The initial quality refusal route rejected only the title score and exposed the absent retry affordance (E2). The native bilingual modal now offers focused Retry and Continue. The actual temporary-failure retry uses two requests and decodes the second title score; the persistent-failure Continue uses one request and still permits normal New campaign entry. One expected failure console message under injected network refusal is not an uncaught page error. Four focused recovery/compatibility tests passed. This is not human speaker acceptance; the final quality-tool R2 passes E2 after the single refusal, with a retry and no uncaught error.

[实际原生重试提示 · Actual retry prompt](test/native-performance-evidence/pc-music-retry.jpg) · 软件浏览器故障注入后的英文原生模态 / English native modal after the deliberate software-browser refusal.

### 地形流与首城 · Terrain streaming and first detailed city

- 正式 `createTerrainStream3D.load` 接受异步实际 HeightField3D。单个原生 Worker 只迁移确定性高度/颜色采样，用 transferable arrays；原公式主线程兜底。按正式 1.25×视距+四分之一块的保留范围及时结束过期队列，不让迟到数据进入当前地块。真实 Node worker/native tile 16/16 专项（含城市上传和取景）；改前/改后/终版四块高度/色彩与两块原生顶点位置、法线、UV、颜色、drawCount、原 GLSL/key/uniforms 的指纹完全一致 `78116fe77f328d435304a1176ecd20042171611176416ebd2aa25bb224d68062`。 / The public async terrain-loader contract permits a real module worker and transferred deterministic arrays. Retired requests are settled without publishing stale geometry, retaining the old synchronous formula. Sixteen focused tests (including city/viewport) pass. Pre/post/final deterministic tile data, native mesh attributes and original shader/uniform fingerprints are identical.
- 原生 WebGL2 `prepareGeometries` 以 4 ms/切片、最多 4 个几何的协作预算，将原实际详细城池和共享旗帜几何准备进正式缓存；不提交隐藏画面，不等待 GPU 完成；旧代理在准备期间保持实际可见，不支持/失败保留原普通路径。 / Public native geometry preparation cooperatively yields with a 4 ms/four-geometry slice budget. The existing proxy stays visible until actual detail geometry is admitted, without a hidden draw or GPU completion wait; unsupported or failed preparation retains ordinary rendering.

Windows 实际 Edge / RTX 5090 Laptop / ANGLE D3D11，显式 low、1280×800、禁用缓存、固定 reduced-motion、明确相同 defer/text 默认。每模式一次，原曹操暂停战役同一天，受控镜头 洛阳→襄阳→洛阳（距离 52）；并非玩家完整战役性能。三次真实地形与详细城池最终可见，零报错。 / Real hardware with explicit low quality, fixed paused campaign/camera route, one trial per mode, cache disabled. All real terrain and detailed cities become visible, no errors. A controlled camera benchmark, not a played campaign.

| 模式 · Variant | 首帧 / 初始地形 · First play/initial field ms | 洛阳地形就绪 / RAF p95 · Luoyang ms | 襄阳 · Xiangyang ms | 返回洛阳 · Return ms | 过期 Worker 任务 · Retired jobs |
|---|---:|---:|---:|---:|---:|
| A 主线程 / 无准备 · Sync | 4706.3 / 4817.8 | 36.5 / 27.6 | 77.4 / 66.0 | 12.2 / 12.3 | 0 |
| B Worker / 无准备 · Worker | 4292.2 / 4707.5 | 65.7 / 22.7 | 32.7 / 13.8 | 73.2 / 63.1 | 12 |
| C Worker + 正式准备 · Worker + preparation | 3903.9 / 4836.9 | 68.7 / 23.5 | 32.8 / 13.7 | 13.7 / 9.3 | 14 |

Worker 并非所有地点都更快：首个详细地区地形就绪反而延后，襄阳短窗由 66.0→13.8/13.7 ms，初始完整地形仍约 4.7–4.8 秒。与 B 相比 C 首次详细城池出现延后洛阳 20.0 ms、襄阳 8.8 ms（原代理始终可见）；样本没有证明缓存准备带来额外 p95 收益，保留其作为可独立关闭的引擎能力演示。早期不同宿主默认的过期队列曾为 114.5–159.4 ms，终版短至 65.7–68.7 ms，不能把非同条件数字写成因果加速。着色程序 `preparePrograms` 仅做过草案验证，没有在生产启用或把等待移到点开始之后。 / Worker improves some synchronous spikes, not every location; initial complete terrain stays near 4.7–4.8 s. Native city preparation keeps the existing proxy but adds ~20.0/8.8 ms before detail at the two targets. One sample does not establish an additional p95 gain, so it remains an independently disableable demonstration of the supported API. Preliminary backlog runs used different host defaults and are not a causal comparison. No production program prewarm or wait shifted to game entry.

同机位实际画面：洛阳 [A 同步采样 · Sync](test/native-performance-evidence/pc-terrain-sync.jpg) · [C Worker/几何准备 · Worker/preparation](test/native-performance-evidence/pc-terrain-worker-prepared.jpg)，襄阳 [A 同步 · Sync](test/native-performance-evidence/pc-xiangyang-sync.jpg) · [C Worker/准备 · Worker/preparation](test/native-performance-evidence/pc-xiangyang-worker-prepared.jpg)。地形采样/原生几何指纹一致，不把动态整帧画面声称为像素一致。 / Matched-camera actual PC images; deterministic sampled/mesh fingerprints are equal, not a whole-frame equality claim.

### 最短横屏定位与实体手机 · Short-landscape Locate and physical Fold7 (interim)

- 实际 PC RTX 873×325 窗口专项 **6/6**，定位后原选中单位可见，暂停时间、单位、选择及 HUD 触控范围不变；无错误。不是实体旋转。 / Actual PC viewport regression **6/6** confirms the selected unit remains visible after Locate, preserving paused time and original selection. Not a handset rotation test.
- 三星 Galaxy Z Fold7 实体外屏，Android 17 / Chrome158 / Adreno830，中画质，实际 873×325／411×813 CSS px，中画质，36 个候选文件指纹、8 项恢复、零错误。第四批公开同路线是 5→3→定位 0→俯视 3 个名牌；第五批本地此候选 5→3→定位 3（选中完整名牌、仍原镜头距离 45）→俯视 3。实际野战回放拖到 6.061/7.9 并读战报，短横屏绘制棋盘仍约 200 CSS px，缩放行需滚动。 / Physical Fold7 cover-screen candidate passes all 36 tested hashes/eight restoration receipts and no errors. Published B4 yielded 5→3→Locate0→Overview3 plates; B5 local yields 5→3→Locate3 including the selected full plate at the same original camera distance 45→Overview3. Touch replay seek/report still work, while short-landscape replay board sizing remains a limitation.
- 此候选为最后地形过期队列修改前的真机快照，约 5 秒三窗（标题/进行中南皮/暂停野战）n=302/302/303，p95/max 均 16.7 ms、无 >50；本地单次就绪 1.924 s 不与旧公开 11.651 s 归为同网络对照。最终原始软件功能路线后来单独通过；没有重跑完整 390 秒南皮或完成整场野战。 / This handset route predates the final terrain-retirement changes. Three ~5 s browser RAF samples have n=302/302/303 and p95/max 16.7 ms, none >50. Its local 1.924 s title is not directly comparable with the published 11.651 s network run. Final software functional acceptance followed separately; neither full Nanpi nor a full field battle was repeated here.
- 手机对照（实际外屏）：[B4 公开定位 · Before](test/native-performance-evidence/fold7-public-b4-locate.jpg) · [B5 定位可见 · After](test/native-performance-evidence/fold7-b5-locate.jpg) · [野战回放 · Replay](test/native-performance-evidence/fold7-b5-replay.jpg)。 / Physical screenshots, contrasting real public B4 and local B5 Locate; the replay viewport remains compact.
- 最后地形版本后另一次 Fold7 英文重点路径：39 个实际文件指纹、8 项环境恢复、零报错；实际横竖切换保留同一宿主。英文标题真实 canvas `aria-label` 本地化，极短横屏 `Campaign paused` 两行清楚、Dismiss 69.67×44 CSS px；归城/关闭城务后原平原名牌由不可见恢复 138×44 CSS px（安全区顶栏下），实际点名牌和单独点 3D 城池均选择原地点。先前设备地形路线的过期 Worker 任务 0→8→15、真实 ready/pending=0 与本次最后名牌修正是两次独立记录，不合称同一个成功路径；最后资源失败处理在软件浏览器独立通过，未在该设备重新实测。 / A separate physical English follow-up after terrain changes matched 39 loaded fingerprints, eight restoration checks and zero errors, retaining the live host on rotation. The canvas name is localized, two-line coach fits and its actual Dismiss measures 69.67×44 CSS px. Returning home restores the previously absent Pingyuan plate (138×44 CSS px below the top bar); actual native plate and separate 3D city taps select the same place. Earlier worker-retirement and later marker-fix receipts remain separate, not one fabricated complete route. Final asset-failure recovery passes separately in the software browser, not again on the handset.

[实体 Fold7 英文提示 · English coach](test/native-performance-evidence/fold7-english-coach.jpg) · [实体 Fold7 平原名牌 · Home nameplate](test/native-performance-evidence/fold7-home-nameplate.jpg)。两张来自后期 39 指纹的同一重点路线，不是早期 36 指纹路线。 / Both are from the later 39-fingerprint focused route, not the earlier 36-fingerprint run.

### 官方多屏 · Official screen profiles

最终原生天下图矩阵为九种配置 ×14 检查点 **126/126**，所有 findings/engine warnings 为 0；126 张原始截图经独立适配缩放、不裁剪接触表复核。各安全区没有新增操作控制遮挡，873×325 城务名牌重新可见、英文双行引导清楚。仍有既有超短横屏滚动要求：中英切换后标题首入口可能被自身滚动视口部分裁切（滚动可见），英文尾注在首屏下方，短剧情/记录面板空间较多。纯软件自动预算的背景更柔，不代表硬件画质回退。 / All 126 final realm checkpoints passed, with zero findings or engine warnings, and every capture was visually reviewed in uncropped fit-only contact sheets. No new unsafe hit regions were found, the city plate is visible at 873×325 and the English coach wraps clearly. Existing short-title scroll behavior, attribution below the fold, and sparse short-story/chronicle sheets remain UX caveats. Softer background detail in automatic software captures is not evidence of hardware visual regression.

独立战场九种配置的首次报告 **54/54**，但 360 CSS px 窄竖屏暂停工具栏有 5 个实际热区警告（继续、1×/2×/4×、离开演武均 42×44 CSS px）。随后仅调整多按钮竖屏工具栏分配，保留间距和 2 px 余量；最终 Node R4 291/291（新增规划回归）。五种受影响竖屏配置重新验收 **30/30**，无 findings 或 engine warnings，30 张真实暂停/其他画面逐张复看，未见新增遮挡；四种未发生改动的横屏配置沿用此前 **24/24**，合计最终 **54/54**、零 findings/engine warnings。短横屏棋盘和竖屏滚动仍有限制。 / The initial nine-profile battle run passed 54/54 but showed five 42×44 CSS pixel touch-target warnings on the 360-pixel portrait paused toolbar. Reallocation fixes the portrait multi-control row while preserving gaps and two pixels of slack. All five affected portrait profiles reran 30/30 with no findings or engine warnings; their captures were visually checked, including actual pause. Four unchanged landscape profiles retain 24/24, for 54/54 final clear checkpoints. Compact replay and portrait scrolling remain limitations.

官方普通验收（最终 Windows 软件浏览器）**8/8**：声明式 ready 实测 4,071 ms（60 s 上限、0 待完成请求、29 回调观察）、实际画布非空、持续运行、输入反馈、音频启动及无错误/外部请求；1 条 Chromium Canvas2D readback 通知，0 engine warnings。此 4.071 s 属不同验收路径，不等于上述限速品质 L1 或设备冷启动，也不证明 GPU 提交 60 FPS。 / The final ordinary verifier passes all eight checks; declared readiness takes 4,071 ms (60 s timeout, zero pending requests, 29 observed RAF callbacks). No errors/external requests, visible canvas, ongoing frames, input response and sound start. One generic Chromium Canvas2D readback advisory, zero engine warnings. This is neither the throttled L1 measurement, a device cold-start nor GPU FPS.

### WebKit 配置回归 · WebKit compatibility profile

本地 Windows Playwright WebKit 26.6 iPhone 15 Pro 配置，最终独立 **6 个界面状态**（标题、开局竖屏/横屏/返回、天下图竖屏/横屏）零错误；实际 renderSize 从 393×659 ↔ 852×393，稳定呈现 backing 保持 393×659、测试 3D 比例固定 1。开局和两方向天下图可见，英文引导无重叠，竖屏正文可滚动；初始标题在仅两个 3D 帧时截到未完全就绪的地形而菜单已可操作（不是黑图），此前等待约十帧的独立样本地形已可见。未重复量化真实加载/长帧，未证明物理 iPhone、iOS Safari、正常 iOS 音频或动态缩放效果。 / Final local Windows Playwright WebKit 26.6 iPhone 15 Pro profile: six title/setup/rotation/realm states without errors. Real renderSize follows 393×659 ↔ 852×393 while the stable presentation backing stays 393×659; the tested 3D ratio stays 1. Setup and both realm orientations are visible, English coach no overlap and body scrolls in portrait. The initial title capture after only two 3D frames contains partially streamed terrain but a usable menu, not a black frame; the earlier distinct ten-frame sample displayed settled terrain. Not actual iOS Safari hardware, iOS audio, dynamic scaling or performance validation.

[WebKit 开局竖屏 · Setup portrait](test/native-performance-evidence/webkit-setup-portrait.jpg) · [天下图竖屏 · Realm portrait](test/native-performance-evidence/webkit-realm-portrait.jpg) · [天下图横屏 · Realm landscape](test/native-performance-evidence/webkit-realm-landscape.jpg)。浏览器设备配置，不是手机实机。 / Browser profile only, not a physical handset.

### 最终自动品质检查 · Final automatic quality checklist (R2)

按本仓库 [QUALITY-CHECKLIST](../docs/QUALITY-CHECKLIST.md)，2026-11-29 Windows 无头软件 Chromium/SwiftShader，采用工具自动测试，**15 个自动项通过、1 个未达标、6 个人工/设备项本工具未运行**。不能用前文的物理 Fold7 部分路线替代完整清单；独立真机、键盘和人工画面详见上方。 / The final Windows software-browser quality-tool run passes 15 automatic items, fails one and does not run six device/manual items. The partial hardware routes are separate evidence, not full checklist credit.

| 编号 · ID | 标准 · Standard | R2 结果 · Result | 实际记录 · Measured |
|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 通过 · pass | 7 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 通过 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | **未达标 · fail** | p95 41.6 ms over 109 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 通过 · pass | 1.6 s to the first playable screen, 3.0 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 通过 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 通过 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 通过 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 通过 · pass | Tab → "新的征程" (owned active descendant) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 通过 · pass | 7 named controls, e.g. button "新的征程", button "读取", button "登录新武将" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 通过 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 通过 · pass | unreadable text; started without an uncaught error (keys: nine-provinces) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 通过 · pass | a save from a newer version; started without an uncaught error (keys: nine-provinces) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 通过 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 通过 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 通过 · pass | 1 files refused; no uncaught error; offers to try again |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 通过 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 未运行 · not run |  |

[第五批实际画面与每张出处 · Evidence index](test/native-performance-evidence/README.md)。

## 原生界面第四批 · Native interface batch four (2026-11-29)

公开追加验收 · Public follow-up: [PR #310](https://github.com/cnedwin/PortedGamesEgret/pull/310)，合并 `0133b0b48299295b783badf7b634f6aef2735936`，[Pages 运行 46166418090](https://github.com/cnedwin/PortedGamesEgret/actions/runs/46166418090)。实际 PC Edge/RTX 1280×720 中画质公开版 13/13（5 个浏览器实际响应 SHA、437 响应、0 错误），从标题、布阵到暂停保持约 1.1 秒并回标题；一次公开冷标题 10.818s。实际 Fold7 外屏 Android17/Chrome158/Adreno830，中画质 873×325/411×813，25 个指纹、全部 7 项环境恢复、零错误，实际演武/旋转/暂停及野战实时录制回放 6.061/7.9。约 5 秒标题/进行中南皮/暂停野战的 p95 都是 16.7、max 33.2/33.2/24.9 ms，均无 >50 ms；公开冷标题 11.651s。公开网络条件没有控制，未重复旧本地的完整 390 秒南皮结束，也没有完成野战整场或真实手柄。 / Public deployment passes actual PC 13/13 with five served-response hashes/437 responses, title/deployment/pause and return; physical Fold7 has all 25 source fingerprints, seven restoration checks and zero errors, with rotation, pause and partial live field replay. The short three device windows have 16.7 ms p95 and no >50 ms. Public title readiness 10.818 s PC and 11.651 s phone are uncontrolled network timings, not local A/B. The original complete 390-second local Nanpi trial was not repeated publicly.

范围 · Scope: 引擎 `7fb371acb8bab254cf1c49b9da0ac0eed0c06fb4`，原生战场布阵、速度/暂停、指挥面板、军团标牌与战场反馈、演武配置及棋盘、战报和回放。沿用已有战役、规则、数值、存档和 World3D 资源。网页只保留宿主嵌入、两张引擎可见画布（World3D 和 Play）及浏览器语义投影；离屏绘制棋盘/小地图静态纹理不是独立游戏界面或时钟。 / Native deployment, speed and pause, battle command panel, unit plates and feedback, trials/board, reports and replay share the existing engine host. Campaign simulation, balance, saves and World3D assets remain unchanged. Only host integration, the two engine presentation surfaces and browser semantics remain on the web layer. Offscreen static art preparation does not create another visible UI or clock.

### 验收明细 · Acceptance receipts

| 测项 · Check | 已测结果 · Observed | 适用范围 · Qualification |
|---|---:|---|
| Node R1 → R2 | 255/255 → **258/258** | 原生 UI/资源池/旋转、规则回归；严格接口检查零错误。 · Native UI/pooling/rotation and rule regression; zero strict interface errors. |
| 软件浏览器 R3 · Software route R3 | **54/54** | 原完整战役关键路线，零浏览器错误；标题/设置与原参考分别 0.00% / 0.16%，战场旧参考差异 27.58%（原生界面改造）；非真机，最后镜头/回放布局微调前。 · Original full key route and screenshot references; the 27.58% battle difference reflects the intentional interface migration. Before last camera/replay polish. |
| 最终软件浏览器（旧参考） · Final software route against old reference | **54/54** | 标题/设置 0.00% / 0.16%，战场 31.53% 有意变化；复核无提示遮挡后只更新战场 PNG 的固定参考。 · Final title/settings differ 0.00%/0.16%; the battle differs 31.53% intentionally. Only the reviewed battle PNG is rebaselined after checking the tooltip/layout. |
| 新固定参考重新验收 R2 · Rebaselined software rerun R2 | **54/54** | 新战场参考 0.00%，原有标题 0.00%、原有设置 0.16%，全部断言保留，无额外更新其他参考图。 · New battle reference 0.00%; the unchanged title/settings references 0.00%/0.16%. All assertions retained, no other baseline replacement. |
| 实际 PC 原生标牌 · Hardware marker route | **23/23** | 中文、点选同一单位、名牌语义焦点委托原生列表、键盘、实战反馈、三种窗口形态及资源预算；RTX。 · Chinese, marker picks, roster focus delegation, keyboard, live feedback, three viewport forms and bounded resources; real RTX. |
| 实际 PC 英文 · Hardware English route | **10/10** | 南皮布阵英文按钮/语义标签、短屏与画像/反馈池验证，无遗漏中文操作标签，无报错。 · English controls/marker labels, narrow viewport and bounded pools; no untranslated marked action captions or errors. |
| 实际 PC 旋转专项 · Hardware rotation follow-up | **19/19** | 针对相机取景修正，桌面 5、竖屏 5、极短横屏 3、恢复桌面 5 个可见标记；同一布阵状态和宿主；用户主动缩放不被强制重置。 · Camera reframing across viewport changes, visible plate counts 5/5/3/5; same deployment/host and no reset of intentional zoom. PC viewport, not physical rotation. |
| PC 键盘及模拟手柄 · Keyboard/controller preflight | **11/11** | 真 PC Edge 键盘从标题开始原生开局、剧情、首月和城务操作；标准手柄通过浏览器轮询模拟并检测 B 取消，不是真手柄。 · Actual keyboard route from title; standard controller simulated through browser input polling, not a physical controller. |
| 原生 HUD 软件交互 · Native HUD interactions | **12/12** | 软件浏览器，对战前后的具名操作及界面反馈。 · Software-browser native controls and feedback. |
| 演武结算/回放 · Sandbox R4 | **28/28** | 软件浏览器正常演武到结算及回放（31.9 秒模拟、34 帧记录），重开与不写战役存档通过。 · Software sandbox completed naturally to result/replay, 31.9 simulated seconds and 34 recorded tape frames; rematch and no campaign-save writes. |
| 官方多屏 R1→最终 · Official screen matrix | 18/18 → **54/54** | 最终 9 配置 ×6 个检查点，无 findings 或 engine warnings；逐张视觉复看结论另记。非真机。 · Nine final profiles × six checkpoints with no findings or engine warnings; visual-review observations separate. Not devices. |
| 三星实机 · Physical Fold7 | **通过 · Pass** | 实体外屏横竖屏，南皮正常完成至结算与回放，野战部分流程；为最终小幅镜头/回放调整前的一次完整南皮路径。 · Cover display, both orientations, natural Nanpi trial through result/replay and partial field route before the last camera/replay refinements. |
| 实体 Fold7 最后专项 R2 · Focused physical retest | **通过 · Pass** | 最后镜头/回放修正后的 25 个指纹、8 项恢复，实际转屏及回放拖动；没有再次完整跑南皮。 · All 25 final-candidate hashes and eight restoration receipts, native rotation and replay scrubbing; not another full Nanpi completion. |

实际 PC 环境为 Windows Edge、ANGLE D3D11 / NVIDIA GeForce RTX 5090 Laptop GPU。标牌按原始单位身份点选，与原生指挥列表共享焦点/业务回调；可见战斗事件有实际浮动反馈，图片页和文字池保持预算内，环境/窗口调整保留原有战斗状态。未用 PC 窗口尺寸模拟代替 Fold7。 / The actual hardware routes use Windows Edge and RTX 5090 Laptop GPU. Native projected controls select the original game IDs, delegate focus to the authored roster, show existing event feedback, respect image budgets, and retain state through viewport changes. PC emulation is not a handset test.

官方最终多屏 54 张检查点逐张复看（9 种配置 ×6）：未见按钮进入模拟刘海区；固定开战/离开及结算按钮处于安全区。873×325 的紧凑敌方卡片占据上方部分地图，保留 3 个自方标牌，852×393 至少 4 个；窄竖屏的阵型/指挥列表需滚动，375×667 的切换按钮可能在初始滚动边缘局部裁切，固定开战仍可见。短横屏回放棋盘约 200 CSS px，缩放/选择行要滚动；野战配置的开始按钮初始在滚动区下方，返回可用。南皮战果模态在竖屏/桌面仍有较多空白。官方名为 `native-battle-paused` 的检查点实际截图是战斗运行状态（开始演武已暂停，测试又切换一次）；它验证战斗控件布局，不作为暂停视觉证明。真实暂停计时由手机和交互路线单独验证。 / All 54 final checkpoint pictures were reviewed. Actionable elements and fixed Begin/Leave/Result buttons avoid simulated notches. Compact enemy cards consume some upper-map space at 873×325 while leaving three friendly plates, and at least four at 852×393. Narrow portrait lists scroll; the toggle can be partially clipped at the 375×667 initial offset while fixed Begin remains reachable. Short-landscape replay and start configuration require scrolling; the replay board is about 200 CSS pixels wide. Nanpi result still contains excess blank space. Screens named `native-battle-paused` actually show the running state due to a fixture toggle, so they establish battle-control layout, not paused visuals. Physical/interaction pause timing is separate evidence.

### 三星真机 · Physical Galaxy Z Fold7 candidate

- Galaxy SM-F966U1，Android 17 / Chrome 158.0.8127.44 / Adreno 830 WebGL2；外屏横向 873×325 与纵向 411×813 CSS px，DPR 2.625，实际 CDP 触摸注入、本地服务。22 个选定候选文件指纹一致，8 项设备/临时浏览器环境恢复通过，无页面/控制台/HTTP 错误。该候选快照早于最终镜头/回放布局修正，不冒充最新字节。 / Actual physical cover screen in both orientations, touch injection on the device; tested 22 exact served-file fingerprints and eight device/browser restoration receipts, zero errors. This candidate snapshot precedes the last camera/replay layout tweaks.
- 南皮独立演武：正常开局/点选原生单位、实际旋转、暂停/继续，4×速自然运行 390 模拟秒至日落败北，没有注入数值、下达额外指令或调用自动结束；实际里程碑暂停后继续一次。打开战果中的回放，播放时间从 0 到约 1.824 秒，手指拖动时间轴到 299.197/390 秒，再查看战报、返回标题。 / The independent Nanpi trial runs naturally at 4× to the sunset defeat, 390 simulated seconds, with one ordinary milestone pause/resume and no simulated data adjustment, additional orders or forced finish. Replay plays 0→about 1.824 s, actual timeline drag seeks 299.197/390 s, opens the report, and returns to title.
- 野战演武：实际配置、开局、暂停（约 1.9 秒）、4×、旋转和部分实时回放（实际拖动到 6.061/7.9 秒）及退出标题均通过；**未在手机完成一场完整野战演武**。 / Field-trial configuration, opening, pause (about 1.9 s), 4×, rotation, partial live replay and return to title pass; **not a complete handset field-trial playthrough**.

| 实体外屏短样本 (~5 秒 RAF) · Physical cover-screen short RAF sample | 间隔 · n | p95 / max (ms) | >50 ms |
|---|---:|---:|---:|
| 横屏标题 · Title | 302 | 16.7 / 16.7 | 0 |
| 南皮演武 · Nanpi trial | 302 | 16.7 / 16.7 | 0 |
| 野战演武（暂停） · Field trial (paused) | 302 | 16.7 / 24.9 | 0 |

单次本地标题就绪约 3,451 ms；缺少同机位同条件旧版/新版重复冷启动对照。本表是短浏览器 RAF 间隔，非实际 GPU 执行/合成，不代表整场战斗负载。实体转屏发现部分地图取景问题，已作 PC 专项 19/19 后继续以下实际手持设备复测。未测内屏、实际手柄、真实长期战役、完整手机野战或主观扬声器听感。 / A single local title readiness of approximately 3,451 ms is not a matched/repeated cold-start comparison. These short browser frame intervals are not GPU/compositor or full-battle performance. The physical route exposed framing on rotation; PC focused retest passed 19/19 after correction, followed by the physical device retest below. Physical inner display, real controller, full mobile field battle, sustained full campaign and human speaker listening remain untested.

最后实际 Fold7 R2 专项（同一设备、最后候选）：25 个文件哈希、8 项恢复与零错误均通过。实际竖屏 5 个可见单位标牌，旋转至 873×325 后自动重构为 3 个，保持同一宿主/战斗；实际点击「定位」镜头距离约 95.37→45，此时紧凑敌方卡片仍可能暂时遮住全部名牌；点击「俯视」恢复 3 个。最后回放时间轴实际拖至 6.061/7.9，战报可打开；但极短横屏棋盘可见宽度约 200 CSS px，仍有放大阅读的体验空间。没有重复完整 390 秒南皮路径。 / Final focused physical Fold7 R2 passed 25 source hashes, eight restoration receipts and zero errors. Five native unit plates in portrait become three after the short landscape auto-frame while retaining the same battle/host. Actual Locate reduces camera distance about 95.37→45 and can temporarily conceal all plate targets behind the compact enemy card; Overview restores three. Actual field replay seeks 6.061/7.9 and opens the report, but the short-landscape board visibly spans around 200 CSS pixels. This remains a minor UX improvement opportunity. The full 390-second Nanpi route was not repeated after polishing.

| 最后实体外屏专项 (~5 秒 RAF) · Final targeted physical sample | 间隔 · n | p95 / max (ms) | >50 ms |
|---|---:|---:|---:|
| 横屏标题 · Title | 302 | 16.7 / 16.7 | 0 |
| 南皮演武 · Nanpi trial | 301 | 16.7 / 33.2 | 0 |
| 野战演武（暂停） · Field trial (paused) | 303 | 16.7 / 16.7 | 0 |

### 实际画面 · Evidence captures

以下 JPEG 为原始截图同尺寸审阅副本，无裁剪。各路线与候选时点分开： / All JPEG review copies retain the original capture dimensions, uncropped; each comes from its identified route and candidate revision.

| 证据 · Evidence | 原图路径对应 · Capture |
|---|---|
| 软件固定战场参考与新版 · Software battle reference/native | [旧版 · Before](test/native-battle-evidence/software-before-battle.jpg) · [最终新版 · Final native](test/native-battle-evidence/software-native-battle.jpg) |
| 实际 PC 标牌与反馈 · Hardware plates and feedback | [布阵 · Deployment](test/native-battle-evidence/pc-native-deploy.jpg) · [实战反馈 · Live feedback](test/native-battle-evidence/pc-live-effects.jpg) |
| 实际 PC 英文竖屏配置（非手机） · PC English portrait emulation | [英文布阵 · English deployment](test/native-battle-evidence/pc-en-portrait-emulation.jpg) |
| 软件正常演武 · Software sandbox R4 | [结算 · Result](test/native-battle-evidence/software-sandbox-result.jpg) · [战报 · Report](test/native-battle-evidence/software-sandbox-report.jpg) · [回放 · Replay](test/native-battle-evidence/software-sandbox-replay.jpg) |
| 实体 Fold7 外屏 · Physical Fold7 cover display | [南皮竖屏布阵 · Nanpi portrait](test/native-battle-evidence/fold7-nanpi-deploy.jpg) · [南皮结算 · Result](test/native-battle-evidence/fold7-nanpi-result.jpg) · [南皮拖动回放 · Replay seek](test/native-battle-evidence/fold7-nanpi-replay.jpg) · [野战竖屏布阵 · Field deployment](test/native-battle-evidence/fold7-sandbox-deploy.jpg) |
| 最后实体 Fold7 R2 专项 · Final targeted physical route | [转屏自动取景 · Auto-frame](test/native-battle-evidence/fold7-final-rotated.jpg) · [定位遮挡限制 · Locate limitation](test/native-battle-evidence/fold7-final-locate-limited.jpg) · [野战回放 · Field replay](test/native-battle-evidence/fold7-final-field-replay.jpg) |

## 原生界面第三批 · Native interface batch three (2026-11-28–29)

- 公开发布 · Publication: [PR #308](https://github.com/cnedwin/PortedGamesEgret/pull/308) 合并 `41ff086f` 后，[Pages 46163054628](https://github.com/cnedwin/PortedGamesEgret/actions/runs/46163054628) 成功。下列仍为第三批各候选本地实测，不改写为第四批版本或公开真机复测。 / Batch three was deployed following merged PR #308, run 46163054628. Its recorded local candidate tests remain distinct from batch four and are not a public-device retest.

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

目前没有第三批同机位性能对照、公开端完整实机复测、实体内屏/完整手机战役或长时间高负载结论。官方多屏 R2 和实体外屏路线早于最后一次原生确认/通知/提示微调；其后另有最终软件 R5 54/54 和 PC 隔离确认 4/4，但尚未在同一手机或全部配置重复最后变更。第二批的性能和真机数据仍单独保留，不挪用为第三批结果。 / Batch-three matched performance, full public-device retest, physical inner display/full mobile campaign and sustained high-load results remain unmeasured. The official screen matrix and physical-device route precede the last confirmation/badge/hint polish. Final software R5 (54/54) and isolated PC confirmation (4/4) followed, but the last changes have not been repeated across all profiles or on the same phone. Batch-two figures below remain separate evidence.

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
