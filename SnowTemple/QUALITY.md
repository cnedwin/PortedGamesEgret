# 品质验收 · Quality — Snow at the Mountain Temple · 风雪山神庙

## iPhone 配置的序幕与 World3D 首场景追加验收 · WebKit first-world-scene check

- Windows Playwright WebKit 26.6，iPhone 15 Pro 竖屏配置，393 × 659 CSS px；公开 Pages d1bcff69 与候选本地 HTTP，均为全新上下文和实际浏览器触摸，不是 iPhone 真机。 / Actual touch events in fresh Windows WebKit contexts with the iPhone 15 Pro portrait profile; public baseline d1bcff69 and local candidate, not physical iPhone.
- 对照路线：踏雪上路→序幕对白→雪路可操作界面。 / Route: open the chapter, watch the opening dialogue, reach the initial scene with HUD.
- 改前：标题、序幕 491 × 823 的 3D backing buffer 正常，第 246 帧、33 draw calls、279,388 triangles，动态降到 294 × 494 后实际 3D 画面完全消失，仅 HUD。 / Before: title and cutscene are visible at 491 × 823; at frame 246 the renderer still reports 33 draws / 279,388 triangles, but the actual scene is blank after the adaptive resize to 294 × 494.
- 改后：默认自动画质在移动 Apple WebKit 保持当前档位的 491 × 823，序幕、人物、雪地、石砖、灯光、HUD 均清楚可见（第 241 帧、33 draws、279,386 triangles）。其他平台仍启用原分辨率自动策略，固定画质档、窗口尺寸变化、模型资源和玩法不变。 / After: the current quality tier's 491 × 823 backing buffer remains stable on mobile Apple WebKit, so both the cutscene and initial scene visibly show the original character, snow, masonry, lighting and HUD. Frame 241 still has 33 draws / 279,386 triangles. Other hosts retain dynamic sizing; fixed quality options, normal window resize, assets and rules are unchanged.
- 113/113 Node 测试通过；页面异常、控制台错误、HTTP 错误及失败请求均为 0；唯一警告是原开场图片未及时消费的 preload 提示。 / 113/113 Node checks pass, zero page/console/HTTP/failed-request errors. The only warning is the original boot image preload advisory.
- 固定尺寸像素面积为 404,093，旧的降分辨率为 145,236，约 2.78 倍；可能增加 GPU 负荷。未测试实际 iPhone 性能、完整游玩或音频。renderer frame 回执不表示 FPS，最终根因属于浏览器还是引擎仍未确认。 / The fixed pixel area is approximately 2.78× the adapted area, potentially increasing GPU cost. Physical iPhone performance, full playthrough and audio are untested. Render receipts are not FPS, and ultimate engine/browser root cause remains unverified.

## iPhone 配置 WebKit 启动回归（2026-11-28） · WebKit startup compatibility

Windows 上的 Playwright WebKit 26.6，iPhone 15 Pro 设备配置，竖屏 393 × 659 CSS px，独立的新浏览器上下文；不是 iPhone 真机或 iOS Safari 本体。改造前测试公开 Pages，改造后测试候选工作树的本地 HTTP 服务。

Windows Playwright WebKit 26.6 with an iPhone 15 Pro profile (portrait, 393 × 659 CSS px, isolated fresh browser context); not a physical iPhone or iOS Safari itself. Baseline: public Pages; retest: candidate worktree over local HTTP.

- 引擎副本 · Engine: `82561d6338a805f0e0459a2d5d42a284f9385b30`.
- 改造前：公开页连续报告 TEXT_MEASURE_FAILED / WEB_TEXT_STATE_UNSUPPORTED（采样 55,690 条错误），页面求值超过 12 秒时限。已更新正式引擎文字路径。 / Before: repeated TEXT_MEASURE_FAILED / WEB_TEXT_STATE_UNSUPPORTED (55,690 sampled errors), then a 12 s evaluation watchdog. The official engine text path was updated.
- 按需绘制追加复测：触摸设置后语义树已更新，3/5 秒两张实际截图仍是标题。只在菜单栈呈现提交时调用引擎正式 `game.invalidate()`，并合并 250 ms 后一次补绘，销毁时取消；不启用永久绘制。复测 3/5 秒两张均为可读的真实设置面板，首屏保持正常。 / A separate visual recheck reproduced stale title pixels 3/5 s after tapping Settings even though semantics were updated. Invalidate on menu publication and coalesce a single follow-up 250 ms later; cancel on disposal. Both retest captures now show actual settings, and title pixels remain correct. No continuous drawing.
- 改造后 / After：标题清晰，实际触摸「设置」后出现画质、模型、粒子、声音等控件名称。仅有原启动图片预加载未及时使用的浏览器提示。 / The title is legible; tapping Settings exposes quality, model, particle and audio controls. The only browser warning is that the original boot image preload was not promptly used.
- 复测无页面异常、控制台错误、HTTP 4xx/5xx 或失败请求（四项均 0）；`node --test test/*.test.mjs`：112/112 通过。 / No page exceptions, console errors, HTTP 4xx/5xx or failed requests on the local retest (zero in each category); 112/112 Node tests pass.
- 仅验收启动、首屏截图及一次浏览器触摸操作；未覆盖整局、设备横竖屏切换、物理 iPhone、真实 iOS 音频、Safari 版本差异或性能。 / Startup, title screenshot and one browser touch event only; full playthrough, rotation, physical iPhone, real iOS audio, Safari version variation and performance were not covered.

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs SnowTemple` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs SnowTemple`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 2026-11-28：雪夜画面与演出 · Winter presentation

引擎更新到 `a1d6bc6215ce1fd9af1e9361286525ae737ad347`（7.0.3 发布准备）。由官方工具生成副本，核对原 `e15aabcf` 与新版：包内容、浏览器运行时代码及导入表逐文件一致，仅 `vendor/SOURCE.md` 更新。此处画面收益来自游戏现有 World3D 能力的运用，而非新版运行时提速。 · The official vendor refresh reaches a1d6bc6. The distributed runtime and import map are byte-identical to the previous copy; provenance alone changed. Visual improvements come from the game's use of existing World3D abilities, not a new runtime speedup.

- 雪与湿石分开调色、粗糙度和霜层，灯光减弱过曝，雪地颜色更中性，冷暖轮廓更易分辨。山坡边墙改为随地形分段，但仍为一个网格（24→768 个三角形），未改变碰撞。 · Distinct snow and wet paving, more controlled warm lighting and neutral snow, and a terrain-following wall (one mesh, 24→768 triangles; unchanged collision).
- 保留原有五个角色及模型档位；调整冷暖材质轮廓、受击闪烁、首领转阶段表现和原有特效的可辨识度；不新增资产、渲染通道或着色程序变体。原命中、数值、音频及存档不变。 · Existing roles and model tiers are retained, with clearer color separation, hit flashes, boss transition and effect layers. No new asset, render pass or shader program variant; simulation, numbers, recordings and saves unchanged.
- 原版实机 PC 页面离开时两次报 `UI_CONTROL_CLOSED`（visibilitychange → reset → releaseTouch → disposed control）。新增测试先复现，再在控件销毁后阻止迟到的 release/activate/enable；保持正常释放。新版七个同构图诊断状态零错误。标注气血、气力、枪意；黑边层只在 HUD 背后，剧情字幕仍位于前景。 · Two real late teardown errors in the old browser route, reproduced by a regression test and fixed by respecting the control lifetime. The new seven-state visual route reports zero errors. Named bars and correct letterbox compositing improve usability.

### 实拍与回归 · Captures and regression

Windows Edge / RTX 5090 Laptop / ANGLE D3D11，高画质高模型、1280×800、seed 7，同构图标题、开场、雪路、草料场、登场、首领预警和转阶段：后两类对照采用原有诊断入口，非自然完整游玩；另有正式正常路线 41/41，含原生设置、语言、真实完整胜利、枪谱、重战、倒地复起、读档、守草料场败局及故意拒绝资源后的重试。Node 112/112。SwiftShader 8/8；因画面有意改动，目视核查并重拍唯一 `native-title.png`，第二次复跑差异 0.61%。 · Seven RTX hardware visual captures, with existing diagnostic entrances for boss/rage; separate 41/41 real hardware input acceptance covers the legitimate full chapter and recovery. Node 112/112; SwiftShader opening smoke 8/8; intentional appearance change reviewed before recapturing the native title reference, then 0.61% pixel difference on repeat.

实拍对照 · [PC shots](test/evidence/pc-winter-polish-before-after.jpg) · [PC receipt](test/evidence/pc-winter-polish-receipt.json).

官方多屏 `verify --screens` 复跑 9 个尺寸 × 标题、设置、开场、雪路、行囊，45/45 零错误零警告（[summary](test/evidence/winter-polish-screen-summary.json)）。RTX 硬件浏览器模拟尺寸和切口，非九台实机；逐张目视复核，安全区内的交互保持可用。极窄竖屏开场的 3D 电影式构图仍可能裁掉角色一侧，属于构图改进点而非控件布局错误。 · Official screen verifier: nine emulated profiles, five states, 45/45 with no warnings or errors. Reviewed screenshots, with narrow portrait cinematic framing still occasionally clipping the side of a character; no control safe-area failure.

### Fold7 实机对照 · Physical Fold7 comparison

同一 Galaxy Z Fold7 (SM-F966U1, Android 17, Chrome 157, Adreno 830)，外屏横放 873×325 CSS、DPR 2.625、中画质/低模型、seed 7、真实本机手机浏览器，经 CDP 实际触屏交互，独立新会话；两次自然战斗路径及掉落不完全一致，不能当严格 GPU 同帧基准。旧版正常胜利后，验收脚本在重载新文档时因未定义的 `__snow` 失败，故旧版整份报告未通过；修正脚本后新版完整通过，非游戏错误。新版真实两次枪谱、8 条语音事件、5 个角色 ready、胜利（85.62 s，甲，HP88）、重战和正常存档重载均通过；536/536 资源指纹吻合，0 页面/HTTP 错误。 · Same actual Fold7, local serving, physical touch via CDP in distinct disposable contexts. Combat paths and loot differ. Old victory is proved, but its harness accessed an undeclared identifier during reload and did not finish the hash sweep. The corrected candidate route passes the entire chapter, two manuals, eight dialogue events, all five low-tier models, victory, rematch, reload, and 536/536 file hashes with no HTTP/page errors.

| 路段 · Phase | 旧 view-update P95 ms | 新 view-update P95 ms | 旧→新 RAF P95 ms |
|---|---:|---:|---:|
| 雪路 · Road | 20.5 | 20.1 | 16.7→16.7 |
| 草料场 · Yard | 25.4 | 24.4 | 16.7→16.7 |
| 山门 · Gate | 23.1 | 22.5 | 16.7→16.7 |
| 首领一段 · Boss 1 | 29.5 | 29.7 | 16.7→16.7 |
| 首领二段 · Boss 2 | 29.1 | 29.1 | 16.7→16.7 |

长帧峰值 149.3→132.7 ms，超过 50 ms 共 38→31 次（样本时长不同，不证明优化归因）；首次 3D 帧 946.6→1139.7 ms（单次、非公网冷启动，保留该劣化观察，不能推断趋势）。主观画面：新版雪和石层次清晰、暖灯仍清楚，状态文字可读；低模型边缘仍有像素阶梯。未测：内屏、iOS、其他手机、真实人手操作和扬声器主观听感；未测独立 GPU 执行时间。 · Rare long frames remain; counts differ in duration and cannot establish a gain. One local first-3D sample is slower; it is not a network or controlled multi-run startup benchmark. Close-up low-tier edge aliasing remains. No inner-screen, iOS, other handset, human dexterity, speaker listening, or isolated GPU timing measurement in this round.

[手机场景 · Phone scenes](test/evidence/quality-fold7-scenes-before-after.jpg) · [战斗 · Combat](test/evidence/quality-fold7-battle-before-after.jpg) · [结算 · Ending](test/evidence/quality-fold7-ending-before-after.jpg) · [实测收据 · Receipt](test/evidence/quality-physical-fold7-quality-comparison.json).

## 2026-11-27：原生 UI · Native UI acceptance

引擎 `e15aabcf742ec7c82ba4a8e8c2de663137c18f71`，同一游戏规则、模型、存档及音频文件。UI 改为原生 2D 叠加层，新增英语字幕及界面（原中文表演语音不变）。 · Engine e15aabcf, with identical simulation, assets, saves and recordings. The interface uses a native 2D overlay and adds English display text/subtitles while retaining Chinese speech.

### 多屏布局 · Screen layout

引擎工具实际检查 9 种视口；用 Windows Edge RTX 5090 Laptop ANGLE/D3D11 硬件浏览器验证屏幕几何，**模拟尺寸和刘海，不等于九台真机**。初轮设置页 7 个 touchTarget 警告，均为滚动裁切后只剩部分可见区域的按钮；禁用这些部分可见节点的原生触摸命中后，45 个检查点全通过。当前具名操作区最小 44×44 CSS px，真实 Fold7 的七个动作键最小 52.25 CSS px。逐张检查实拍与红色安全区覆盖；原生标题保留竖排书名、红印与原雪路，长英文标题另行换行。 · Nine profiles checked with a real Windows GPU browser but simulated viewport and cutout geometry, not nine physical devices. Initially seven partially clipped settings actions triggered touchTarget warnings. After gating the native pointer targets until wholly visible, all 45 checkpoints pass; named controls reach at least 44 CSS px, physical Fold7 combat actions 52.25 CSS px. Reviewed the checkpoint images and cutout tint. The vertical Chinese title and seal are kept; English wraps separately.

| 视口 · Viewport | 标题 · Title E/W | 设置 · Settings E/W | 开场 · Opening E/W | 雪路 · Road E/W | 行囊 · Bag E/W |
|---|---:|---:|---:|---:|---:|
| 375×667 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| 393×852 (cutouts) | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| 852×393 (cutouts) | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| 360×800 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| 768×1024 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| 1024×768 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| 873×325 Fold7 cover | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| 884×1104 foldable | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |
| 1920×1080 | 0/0 | 0/0 | 0/0 | 0/0 | 0/0 |

E/W = verifier errors/warnings。实测表及截图 · Receipt and inspected contact sheets: [summary](test/evidence/native-screen-summary.json), [title](test/evidence/screens-title.jpg), [settings](test/evidence/screens-settings.jpg), [road](test/evidence/screens-road.jpg)。

### PC 实机 · Physical PC

Windows Edge 158，RTX 5090 Laptop，ANGLE D3D11，1280×800，高画质／高模型。正常键鼠从开场推进两拨草料场、两次实际枪谱、山门、陆谦两个阶段、胜利、解锁、重战（不修改血量、装备、规则或作弊跳关）。设置暂停、战斗中切换英文再恢复中文、行囊、静音、同一 overlay 与游戏身份通过，五个高档角色无 stock 回退。原诊断 r2 在重战后误等「败局结算」超时：章节原规则是倒地后火盆复起，实际 trace 已观察 fall 17.1 s → revive 20.5 s、HP120。该诊断脚本未全通过，首胜及重战有真实证据；正式路线按原规则修正。 · Real keyboard/mouse through the full chapter, two actual manual rewards, both Lu phases, victory, next tier and rematch, without state injection. Settings pause, bilingual live HUD, satchel, mute, stable identity and all five high models passed. The exploratory r2 script mistakenly awaited a defeat result in chapter rematch, which instead naturally revives at the brazier; the trace proves the actual fall and revival. This does not count as a fully passed script. The formal route follows the original rule.

首胜前相同 view-update 采样，旧 DOM → 原生 P95（ms）：雪路 4.3→4.4，草料场 4.5→5.3，山门 4.5→5.3，首领一段 7.8→5.4，二段 7.5→7.6。标题就绪 4.144→4.303 s，旧就绪为帧计数、新为语义可操作，非完全相同测点；标题 529 个叠加层更新零提交，静止设置 531 个更新零提交，两段均零纹理上传。结算进入时仍有过场黑边淡出。非严格可归因的 GPU 定时，实际操作、截图取样有差异。 · P95 from comparable first-win World3D view-update observations shown above; title-ready definitions differ. Idle title and settings submit zero overlay frames and no uploads across 529 and 531 steps respectively. Result arrival has the letterbox transition. These are browser observations, not GPU timer results.

[PC comparison](test/evidence/pc-native-menu-before-after.jpg) · [PC receipt](test/evidence/physical-pc-receipt.json)。

最终正式硬件浏览器验收 `SNOW_HARDWARE=1` 41/41 通过（首次设置 resize 的复合断言失败，增加诊断后同运行时代码完整重跑通过）。正常完整章节，包括设置/雪路/枪谱/结算横竖往返、语言、改键 Esc/Tab、真实重战倒地复起、旧档刷新、独立守草料场败局返回。真实硬件浏览器中的模拟双触点越界和取消也通过；拒绝 optional hero GLB（HTTP503）保留原 fallback，拒绝必需 scene pack（HTTP503）显示具名原生 Retry，真实点击重新加载，五个角色恢复，正常流程零错误。 · The final hardware acceptance passed all 41 checks. The first composite resize assertion failed; a retry with diagnostics and unchanged runtime passed the entire route. The actual PC scene, rotations, inputs, victory/revival/save and genuine yard loss pass. The PC browser's two-contact emulation is not a mobile device. Real intentional HTTP503 responses separately verify the optional hero fallback, required scene-pack Retry, fresh reload and five recovered roles.

三档原生设置逐档选择与重新载入 3/3 通过，15/15 GLB 档位正确；首帧仅新版主角（waiting），随后三个草料场角色，再陆谦，全部 ready，无 stock 回退或未预期请求。低/中/高模型首个实际 3D 帧 638/541/604 ms，标题加载罩退场 1541/1443/1512 ms；同低画质、热资源上下文顺序测量，旧 DOM 分别 371/368/426 ms 和 1287/1278/1337 ms，新增原生标题约 0.17–0.27 s；不是网络冷启动测量。 · All three native quality settings and actual reloads pass, correct 15 GLBs, original staged ordering and no fallback. Warm local sequential times show the extra native title cost; these are not network cold starts.

### Fold7 实机 · Physical Fold7

Galaxy Z Fold7 Android 17 Chrome 157，外屏横放873×325及竖放411×813 CSS，DPR2.625，默认中画质/低模型。第一次在实际草料场 27.283 s 按住摇杆拾枪谱报 `UI_INPUT_BUSY`（ENGINE-NOTES #8）；原生接触取消修复后同台正常重跑，实际拾枪谱冻结及选择、两拨、两阶段首领、甲等 1:40、弹反5、回马枪9、倒地0、结算、重战倒地复起、返回/刷新旧存档和独立守草料场真实败局均通过。536/536 请求资源指纹一致，8条对白事件，设置声音开关；三处实际转屏（标题/设置/结算）保持同一引擎叠加层、焦点和状态。摇杆半幅/全幅实测 1.74/4.95 m/s，双指同时持有与越界持续追踪、取消释放通过。 · Actual Fold7 external display landscape/portrait through the full chapter, including the real held-contact manual trigger after the specific fatal issue, result, replay, natural revival, reload and real endless-yard loss. Grade A, 1:40, 5 parries/9 ripostes/0 falls; 536/536 matched resources; eight dialogue events and sound toggling. Real rotations retain identity, focus and state. Analog movement and multitouch ownership/cancellation pass.

| 路段 · Phase | 旧 DOM view-update P95 / max ms | 原生 view-update P95 / max ms |
|---|---:|---:|
| 雪路 · Road | 17.3 / 29.1 | 21.9 / 105.6 |
| 草料场 · Yard | 17.4 / 36.1 | 24.9 / 109.9 |
| 山门 · Gate | 17.5 / 27.2 | 22.4 / 44.0 |
| 陆谦一段 · Boss 1 | 17.1 / 20.0 | 28.4 / 116.2 |
| 陆谦二段 · Boss 2 | 17.5 / 18.9 | 28.4 / 116.2 |

同台整章采样显示新 UI 的 view-update P95 升高；新测试额外记录两个 WebGL 宿主、实际转屏和长回合，不能直接归因为 GPU 渲染。新轮的独立浏览器 RAF P95 约16.7 ms，但仍有偶发长帧，二种统计不可混用。原生位图字形纹理固定一页，boss2 实际动态 HUD 并没有按帧上传文字纹理。 · Full-run view-update intervals increased. The new run also records two hosts and rotates the real phone; different fight paths, thermal state and observer costs cannot establish the cause. Its separate browser RAF p95 is about 16.7 ms with occasional long frames. The metrics are not interchangeable. Fixed glyph text does not upload by every counter change.

#### 同场低开销对照 · Same-scene low-overhead A/B

实机外屏 873×325，中画质/低模型、seed 7，两次独立新浏览器上下文。实际点击进入守草料场，首拨待机，两个版本的最终位置、HP120→45一致；仅采 RAF 和 view-update 时间，不逐帧拦截 GL、语义或音频，不转屏，不在采样中截图。标题 8 秒，草料场约9秒。 · Same physical external screen and settings, fresh browser contexts, normal title/yard entry and the same first wave, final hero position and health. Lightweight RAF and view-update measurements only; no per-frame GL, semantics or audio hooks, no rotation or capture during sampling.

| 指标 · Measure | DOM · old | Native · new |
|---|---:|---:|
| 标题 RAF P95 · Title RAF P95 | 16.7 ms | 16.7 ms |
| 标题 view interval P95 | 17.2 ms | 17.2 ms |
| 标题 view work P95 | 1.7 ms | 1.7 ms |
| 草料场 RAF P95 · Yard RAF P95 | 16.7 ms | 16.7 ms |
| 草料场 view interval P95 | 17.9 ms | 20.0 ms |
| 草料场 view work P95 | 2.9 ms | 2.4 ms |
| 草料场 >50 ms RAF | 0 / 540 | 0 / 541 |
| 草料场 >33.33 ms RAF | 0 | 1 |

新标题叠加层 485 次更新/0 次提交，草料场 544 次更新/340 次提交；初始电池温度 32.1°C，相同；结束 32.1/32.3°C（非 GPU 温度）。此较短同场低开销对照不支持把整章较大的 P95 差异直接归结为原生 UI；仍有小幅 view 回调间隔开销，保留原生绘制清晰度。未做同条件完整首领战 A/B 或 GPU fence 测定。 · The native title has 485 updates and zero submissions; the yard has 544 updates and 340 submissions. Identical starting battery temperature, ending 32.1/32.3°C; not a GPU sensor. This smaller controlled test does not establish the native UI as the entire cause of larger full-run differences. Modest callback-phase jitter remains; visual density is retained. A matched complete boss fight and GPU fence measurement remain untested.

[Fold7 comparison](test/evidence/fold7-native-before-after.jpg) · [portrait](test/evidence/fold7-native-portrait.jpg) · [device receipt](test/evidence/physical-fold7-receipt.json) · [low-overhead A/B](test/evidence/physical-fold7-cadence-ab.json)。

启动图由旧页面 `as=image` 预加载改为匹配原生纹理 fetch 的 `as=fetch crossorigin=anonymous`。同一台 PC 两次新浏览器上下文：原版迁移候选出现 image+fetch 两个请求通知及一次未使用 preload 警告；新声明仅一个请求、零该警告，原图编码47,538 B，标题正常、无游戏错误。请求通知数不等于两次完整网络字节。 · Match the native loader's fetch preload instead of the old image preload. In two fresh contexts the previous candidate emitted image and fetch request events plus the unused-preload warning; the corrected declaration produces one request and no warning, identical 47,538-byte content, healthy title. Request events do not prove two full transfers.

安卓缺少桌面 KaiTi 时使用系统中文回退，实机中文字可读但字形风格不同；2 倍叠加层物理像素比（Fold7 DPR2.625）细小图标轮廓略有阶梯，不为提高分辨率盲目增加成本，尚无独立像素比 A/B。 · Android falls back when desktop KaiTi is absent. Chinese remains legible; small outline raster edges differ from DOM at the 2× overlay density versus 2.625 device DPR. No isolated density A/B has been run.

### 软件验证与边界 · Software verification and limits

SwiftShader Chromium 640×360 开场验收 8/8，人工查看新截图并另建 native-title 基线；再次运行截图差异 1.09%。原 DOM title.png 留存作为历史画面，并非覆盖旧基线。真机操作采用真实设备 Chrome/Edge 的浏览器键鼠／CDP 触屏事件，未冒称真人手指或扬声器主观实听。未覆盖物理展开内屏、其他手机/GPU、Safari、Firefox、微信、屏幕阅读软件、长时间热稳态和实机手柄。 · Software opening acceptance 8/8 at 640×360, with a separately reviewed native-title image and 1.09% difference in a second run. The old title reference is retained. Actual devices use browser keyboard/mouse and CDP touch; no claim of unaided human finger or subjective speaker listening. Unfolded physical screen, wider hardware, Safari/Firefox/WeChat, screen readers, long thermal runs and hardware gamepads remain untested.

### 通用品质工具 · General quality tool

`node tools/quality.mjs SnowTemple --no-write --json`，Windows 无头 Chromium / SwiftShader（软件渲染）。保留先前记录，不用工具覆盖本文件；最终 16 个自动项 12 pass、3 n/a、1 fail。 · Run without overwriting history; 12 of 16 automatic checks pass, three are not applicable to the generic DOM probe, and one software-rendered timing fails.

| 项 · Check | 结果 · Result | 实测 · Measured |
|---|---|---|
| T2 | n/a | no page controls; the canvas is measured by hand |
| T3 | pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | fail | p95 1300.0 ms over 6 frames |
| L1 | pass | 1.5 s to the first playable screen, 3.2 MB |
| O1 | pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | pass | html lang "en", no Chinese in page text or names |
| I3 | pass | no page text cut off at 390 px in English |
| A1 | pass | Tab → "风雪山神庙" (outline) |
| A2 | pass | 4 named controls, e.g. button "全屏", button "设置", button "踏雪上路" |
| A3 | pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | n/a | the game keeps nothing in browser storage |
| S2 | n/a | the game keeps nothing in browser storage |
| S3 | pass | storage refused: started without an uncaught error |
| E1 | pass | 0 errors |
| E2 | pass | 8 files refused; no uncaught error; offers to try again |
| E3 | pass | no errors; the game or the engine loop watches visibility |

T2 通用品质工具没有识别原生画布控件；上面的原生几何 45/45 和真实 Fold7 触控记录才是 T2 实测，最小44 CSS px。S1/S2 通用工具没有在初始标题发现档案，旧档／损坏档与版本回退由 Node 专门测试及真机刷新覆盖。A3 首次静态扫描未识别原生 `prefersReducedMotion` 命名；以清晰变量名及实际系统偏好 watcher 测试验证，不替换原生接口。F1 软件渲染失败（1300 ms，仅6帧），与真实 RTX/Fold7 不可混用；原 3D 画质保留。最终 103/103 Node，最终软件开场回归 8/8、截图差异 0.50%。 · The generic DOM probe does not see native canvas controls; the native geometry and physical Fold7 evidence qualify T2. Its title-only storage probe does not detect a save; separate save tests and physical reload cover the format and corruption. The first static A3 scan missed the native preference API's naming, now covered by an explicit preference-watcher test. F1 fails in software and is not interchangeable with hardware. Final Node 103/103 and software opening 8/8, final native-title difference 0.50%.

## 2026-11-27：原生 UI 迁移前基线 · Baseline before native UI migration

独立引擎升级提交 `07639ada`：官方工具由 `8e70dcb3` 更新至 `e15aabcf742ec7c82ba4a8e8c2de663137c18f71`，生成 324 个文件，只更新引擎副本和 import map。旧版与升级后旧 DOM 分别 92/92 Node；引擎 verify 无控制台或引擎警告；旧版浏览器验收 7/7，标题截图与原基线差异 0.75%。 · The independent engine refresh changes only the official vendor copy and import map. Both old and refreshed DOM versions passed all 92 Node tests; the refreshed copy passed the engine verifier and 7/7 former browser acceptance checks. Its title screenshot differed from the original baseline by 0.75%.

| 实测 · Measurement | 同一新引擎旧 DOM · Same refreshed engine, old DOM |
|---|---|
| PC, Windows Edge 158, RTX 5090 Laptop ANGLE/D3D11, 1280×800, 高画质／高模型 · high picture/detail | 标题可操作 4144 ms；实际键鼠第一回至陆谦二阶段、结算与重战，游戏时间 74.87 s、HP120，无页面异常；两条音效 CPU 调度分别 14.67/17.33 ms，超出旧诊断 10 ms 阈值，因此该脚本随后读档步骤未运行，不计整份脚本通过。 · Title 4144 ms; real browser input through chapter, second boss phase, results and rematch; 74.87 game seconds, full HP, no page errors. Two pre-existing audio scheduling observations exceeded the old strict 10 ms diagnostic, stopping the script before the final reload. |
| Fold7 Android 17 Chrome, 外屏横放 873×325 CSS, DPR 2.625, 中画质／低模型 · medium scene/low detail | 实际触屏完整章，甲等 1:52，弹反3、回马枪10、倒地0；重战、战败、旧档重载、8条对白、静音恢复、五角色加载通过。 · Full touch chapter, grade A, 1:52, 3 parries, 10 ripostes and no falls; rematch, defeat, old-format reload, eight spoken lines, mute recovery and all five roles passed. |
| 三档实际设置切换与重载 · Three real model-quality settings and reloads | 3/3；首帧仅 hero，随后 blade/shield/bow，最后 lu；15/15 GLB 下载属正确档位，零 stock 回退。低/中/高首帧 371.2/367.7/426 ms、标题 1287/1278/1337 ms（低画质、热资源上下文，不能作为冷启动性能）。 · Three tiers pass; hero alone at first render, then three yard roles, then Lu; all 15 expected GLBs, no stock fallback. Timings are warm-resource/low-render setup, not cold-start evidence. |

| 路段 · Phase | PC 旧 DOM P95 / max (ms) | Fold7 旧 DOM P95 / max (ms) |
|---|---:|---:|
| 雪路 · Road | 4.3 / 242.0 | 17.3 / 29.1 |
| 草料场 · Yard | 4.5 / 221.0 | 17.4 / 36.1 |
| 山门 · Gate | 4.5 / 262.4 | 17.5 / 27.2 |
| 陆谦一段 · Boss 1 | 7.9 / 102.8 | 17.1 / 20.0 |
| 陆谦二段 · Boss 2 | 7.5 / 135.3 | 17.5 / 18.9 |

帧间隔是浏览器 RAF 的观测，受显示刷新频率、测试截图与驱动影响，并非 GPU 执行时间；PC 抓取高刷新率样本，不能直接与手机 60 Hz 比绝对值。 · These are browser RAF intervals, affected by refresh rate, screenshot capture and the driver, not GPU durations. PC's high-refresh sample cannot be compared absolutely to the phone's 60 Hz sample.

## 2026-11-26：引擎 `8e70dcb3` 实机回归 · Engine refresh on physical devices

官方引擎工具生成 306 个文件，逻辑、数值、模型、动画、音频与原主干一致。适配原生自动实例化预热，去掉已不需要的特定硬件阴影禁用，保留有效像素比的动态调节及旧档读取容错。Node 回归 92/92 通过。 · The official vendor tool generated 306 files. Rules, balance, models, animation and audio are unchanged. Auto-instancing program preparation uses the native option, the obsolete adapter-specific shadow disable is removed, and effective render-density control and legacy-save fallback are retained. All 92 Node tests passed.

### 实际 PC · Physical PC

Windows Edge 158.0.4370.33、RTX 5090 Laptop GPU (ANGLE/D3D11)、WebGL2，实际浏览器键鼠事件。新档从标题和雪路打到草料场两波、山门、陆谦两阶段，结算甲等，未倒地；完整流程、设置按键取消/Tab、暂停、性能读数、重战及刷新读档通过。实时阴影开启、没有上下文丢失，五个高档角色均加载成功且无错误。正常获得的 `open:2` 和第一重甲等记录在刷新后保留。 · Real Windows Edge with hardware WebGL2 and browser keyboard/mouse input completed the chapter. Settings, pause, performance readout, rematch and reload passed. Shadows remained enabled, the WebGL context remained valid and all five high-detail characters loaded. The naturally earned second tier and first-tier A mark survive reload.

| 场景 · Scene | P95 帧间隔 · Frame interval | Max |
| --- | ---: | ---: |
| 雪路开场动画 · Road cinematic | 8.2 ms | 25.1 ms |
| 雪路操作 · Road | 4.3 ms | 111.3 ms |
| 草料场 · Yard | 4.4 ms | 72.7 ms |
| 山门 · Gate | 8.3 ms | 9.0 ms |
| 首领第一阶段 · Boss I | 8.3 ms | 8.7 ms |
| 首领第二阶段 · Boss II | 8.3 ms | 10.7 ms |

PC 为高刷新率浏览器帧间隔，不等价于显示器真实呈现或 GPU 独立耗时。3.90 秒标题就绪；雪路与草料场仍有少量长帧，不能据此宣布启动卡顿完全消失。音乐层与场景对白媒体事件通过监测，未做人耳听感验收。 · PC intervals are high-refresh browser callbacks rather than measured presentation or isolated GPU time. Title ready in 3.90 s. Occasional long road/yard frames remain. Music and dialogue media events were observed; no subjective speaker listening.

雪路 111.3 ms 与一条 112.4 ms 浏览器长动画帧对齐，发生于设置操作之前；该记录无归因脚本或主线程阻塞，不能区分 GPU、音频、引擎提交或浏览器调度。草料场 72.7 ms 发生在奖励选择面板，详细追踪已结束，两者保留为后续专项复现。 · The 111.3 ms road interval aligned with a 112.4 ms browser long-animation frame before settings interaction, with no attributed script or blocking; cause remains unresolved. The 72.7 ms yard interval coincided with the reward modal outside the detailed trace window. Neither has a proven engine or application cause.

### Galaxy Z Fold7 实机 · Galaxy Z Fold7 physical device

Android 17、Chrome 157、WebGL2，873×325 CSS 横屏，DPR 2.625，实际 GL 画布 1091×406；实时阴影、分块灯光均开启。使用 CDP 真机触控，从开场正常打完整章，结算甲等 1:30，弹反 5、回马枪 9、倒地 0。重战后实际战败，演出正常；独立静音恢复、八段对白媒体事件、变幅摇杆、进度与设置刷新读回均通过。508/508 资源指纹匹配、零页面或加载错误。 · Automated CDP touch on the physical Fold7 completed the normal chapter, earned grade A in 1:30, verified rematch and defeat, independent mute, eight dialogue events, stick amplitude and progress/settings reload. All 508 expected resource fingerprints matched; no page or load errors.

| 场景 · Scene | P95 帧间隔 · Frame interval | Max | 样本 · Samples |
| --- | ---: | ---: | ---: |
| 雪路 · Road | 17.3 ms | 19.2 ms | 808 |
| 草料场 · Yard | 17.2 ms | 37.0 ms | 1814 |
| 山门 · Gate | 17.4 ms | 26.0 ms | 316 |
| 首领第一阶段 · Boss I | 17.2 ms | 22.4 ms | 1193 |
| 首领第二阶段 · Boss II | 17.3 ms | 21.9 ms | 1125 |

实测章节样本内没有超过 50 ms 的帧间隔。手机测试环境、方向和连接已恢复；不把自动注入触摸称为真人操作，也未覆盖低端手机、多种硬件或扬声器实听。 · No interval over 50 ms in the recorded chapter. Test-device settings and connections were restored. This is physical-device automation, not human-finger or speaker acceptance, nor broad hardware qualification.

### 可重复浏览器验收 · Repeatable browser acceptance

新增 `node test/accept.mjs`：固定种子 7、低档画质和模型、640×360 无头 Chromium／SwiftShader，验证标题与两个入口、实际点选章节、角色进入雪路及开场游戏时钟推进。初次截图生成和不带 `--update` 的复跑均 7/7，零页面或 HTTP 错误；审核过的标题截图基线差异 0.77%。这是自动冒烟检查，不替代上面的实机完整章节。 · Fixed-seed, low-detail headless smoke: title and entry controls, a trusted Chapter click and advancing opening clock. Both capture and normal runs passed 7/7, with no errors and 0.77% screenshot difference. This does not substitute for the physical-device chapter runs.

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
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 不达标 · fail | 3 of 12 under 44×44: 行囊0B 85×35; 全屏 64×35; 设置 64×35 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 不达标 · fail | p95 2233.2 ms over 5 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.6 s to the first playable screen, 3.1 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 不达标 · fail | no way to choose English found |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 不达标 · fail | cut off: 风雪山神庙 |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "风雪山神庙：俯视角动作游戏。W A S D 移动，左键出枪，" (focus drawn by the game) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 5 named controls, e.g. button "行囊 0 B", button "踏雪上路", button "守草料场 一拨接一拨，倒下为止" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 不适用 · n/a | the game keeps nothing in browser storage |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 不适用 · n/a | the game keeps nothing in browser storage |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 不达标 · fail | 9 files refused; no uncaught error; no error screen with a retry |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: T2, F1, I1, I3, E2。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.
