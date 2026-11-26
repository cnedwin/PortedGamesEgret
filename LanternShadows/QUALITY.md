# 品质验收 · Quality — Lantern Shadows · 灯影·闹天宫

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs LanternShadows` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs LanternShadows`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-26
- 浏览器 · Browser: 无头 Chromium 157.0.8103.6，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Windows 11 x64, Node v26.7.0
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 达标 · pass | Fold7 / Chrome 157, three acts C/C/C, records and trial; see physical evidence |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 8 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 不达标 · fail | p95 17.5 ms over 329 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run | Fold7 flagship measured, not a mid-range device; see below |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 不达标 · fail | 3.3 s to the first playable screen, 3.0 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 达标 · pass | Native Chinese/English title, HUD and results reviewed; actual localized semantic names tested |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "皮影戏台" (focus drawn by the game) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 8 named controls, e.g. button "开锣", button "EN", button "直接会哪吒" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: lantern-, lantern-screen-controls) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: lantern-, lantern-screen-controls) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 达标 · pass | 28 files refused; no uncaught error; offers to try again |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: F1（无头软件渲染 p95 17.5 ms / software only）, L1（限速通用首屏 3.3 s / generic throttled screen）。E2 自动及独立故障重载均通过；F2、E4、A1m、S4 未完整验证。 · E2 passes both retry tests; F2, E4, A1m and S4 remain unverified.

## 实机证据 · Physical device evidence (2026-11-26)

实际操作路线使用键鼠或真实触屏事件，根据只读场况选择下一次输入，不跳关、不调血、不改规则。测量是浏览器 rAF 帧间隔，不是 GPU 执行耗时。 · Input-driven runs, with read-only route observation; no skips, health edits or rule changes. Measurements are browser rAF intervals, not GPU execution time.

| 设备、场面 · Device and scene | 南天门 · Gate | 蟠桃园 · Orchard | 兜率宫 · Palace |
|---|---|---|---|
| PC / Edge 158.0.4370.33 / WebGL2 | B, 45.73 s | A, 47.73 s | B, 64.15 s |
| PC normal rAF p95 | 4.3 ms (9055) | 4.3 ms (8981) | 4.3 ms (13348) |
| PC 100-clone rAF p95 | 16.7 ms (1248) | 16.7 ms (1524) | 16.7 ms (1292) |
| Fold7 / Chrome 157 / WebGL2 | C, 89.08 s | B, 75.63 s | B, 91.07 s |
| Fold7 normal rAF p95 | 16.7 ms (4847) | 16.7 ms (3923) | 16.7 ms (4416) |
| Fold7 100-clone rAF p95 | 33.3 ms (414) | 33.2 ms (675) | 33.2 ms (301) |

- PC 炉内阶段 p95 12.6 ms；Fold7 炉内 p95 16.7 ms。PC 第一幕分身一次 54.3 ms；Fold7 普通场景最大 116 / 99.4 / 49.8 ms，第一幕分身最大 66.7 ms。长帧未做逐帧归因，不归咎任何具体子系统。 · Furnace p95 12.6/16.7 ms (PC/Fold7); occasional long frames listed, not attributed to a specific subsystem.
- 两设备完成三幕、每幕自然放出两次分身、暂停恢复、音乐场景切换、通关成绩刷新续读，均无游戏错误或失败请求。Fold7 另通过越界摇杆、松手/取消、多点和唯一跳键测试。 · Three acts, two natural clone casts each, pause/resume, music playback state and persistent records, with no game error or failed request. Fold7 also passed drag-out, release/cancel, multi-touch and single Jump checks.
- 音乐声学实听、实体手柄、Safari、WebGPU、不同档位手机未在本轮验收。 · Speaker listening, physical gamepads, Safari, WebGPU and other phone classes were not tested this round.
- 最终样式的完整浏览器验收 10/10 通过（含英文标题横转竖、390×844 触控、结算布局测试）；截图基线复跑差异 0.00% / 1.69%，控制台/页面/HTTP 错误 0。 · Final browser acceptance 10/10; physical rotation has a separate device test, while this test suite uses headless emulation; baseline differences 0.00% and 1.69%.
- 真实旋转回归 · Physical rotation: Fold7 411×813 英文竖屏原开锣按钮中心超出视口；限制 grid 轨道和标题固有宽度后，实际开局、唯一跳键、摇杆及暂停恢复通过，html/booth/curtain/playbill scrollWidth=clientWidth=411。 · The English start button was off-screen on physical rotation; after the width constraints, actual start, one jump button, stick and pause/resume passed with no horizontal overflow.
- 横屏结算回归 · Landscape result: Fold7 再从兜率宫开演、正常击败老君（145.47 s, C）。标题、等级、统计、三项挑战、试演、全剧终及再演/回戏单等 12/12 内容和入口完整位于 325 CSS px 高的结算区域，中心均能命中；有 2 CSS px 装饰性滚动余量，没有裁切。该定向回归未实际按再演；之前三幕流程和 PC 自动验收覆盖输入、成绩与重演选择。 · Cleared the third act on the physical phone; all 12 result elements are in bounds with hit-tested centers. A 2 CSS px scroll remainder remains; Again was not pressed in this focused run.

### 2026-11-26 · 白鹭原生 UI 迁移 / Native UI migration (f0dfde36)

- 规则与资源未改变：三幕、首领、默认 100 分身、独立试演、音频混音和原有成绩存档；89/89 Node 测试通过，最终 packed 浏览器验收 12/12（真实键盘事件、CDP 模拟触屏、语义树、失败重载、开局/暂停、试演/旧档和结算）。经新旧截图目视对照后更新两张基线，最终入口优先版复跑标题差异 0.00%、暂停 0.62%（阈值 4%）；无未预期浏览器错误。 · Original rules, art, audio and record keys unchanged; all 89 Node and 12 browser acceptance checks passed. Screenshots were reviewed before replacing the baselines; final differences 0.00% and 0.62%.
- 从旧版起，相同真实硬件：Windows 11 / Edge 158 / RTX 5090 WebGL2；Samsung Galaxy Z Fold7 SM-F966U1 / Android 17 / Chrome 157 / Adreno 830 WebGL2。完整整章候选使用实际键盘/真实手机浏览器 CDP 触点（不是视口模拟）；通过游戏操作自然通关，不改血量、敌人、规则、关卡状态或分身数。后续仅微调视觉/语义与 backing，并做定向复测。 · Real PC keyboard and physical phone browser touch contacts; full three-act candidate, followed by targeted regressions of visual and density refinements.

| 实机 / Hardware | 南天门 / Gate | 蟠桃园 / Orchard | 兜率宫 / Palace |
|---|---:|---:|---:|
| PC 完整三幕 / Full | B, 47.36 s | B, 55.47 s | B, 62.45 s |
| PC normal rAF p95 | 4.3 ms | 4.7 ms | 4.7 ms |
| PC dense rAF p95（并行负载 / concurrent load） | 24.9 ms | 16.9 ms | 20.8 ms |
| Fold7 完整三幕 / Full | C, 190.66 s | C, 197.54 s | C, 105.20 s |
| Fold7 normal rAF p95 | 16.7 ms | 16.7 ms | 16.7 ms |
| Fold7 dense rAF p95 | 49.8 ms | 49.7 ms | 49.8 ms |

- 完整路线：PC 每幕自然使用百身术两次，Fold7 3/3/2 次，逻辑和实际绘制峰值均为 100；击退 10/14/11 名天兵、三位 Boss 和炉内阶段、下一幕、最终结算、回戏单/再演、刷新续读三条成绩、单棒试演均通过。Fold7 QA 循环的输入等待较旧长，不把通关时间和倒地次数当作同条件难度对比。两设备游戏错误为 0（整章候选）。 · Full natural clears with the original enemies and 100-clone peak, records/replay/trial; the phone input cadence differed from the old route, so times/falls are not a controlled difficulty comparison.
- 真实 Fold7：固定轨道死区、轻推/重推、越界、第二触点长按跳、释放/取消、持杆暂停清空再抓握；实际英文横转竖、完整标题、唯一 Jump、四个 44.525×44.525 CSS px 动作键及暂停续演通过。独立音效和配乐开关、实际音频播放主题及运行状态正常；未做扬声器声学实听。 · Physical touch session and rotation passed, including one Jump, independent effects/music toggles and playback state; no acoustic listening.
- 实际 backing：PC 1440×900 CSS px 由 960×600 改为 1441×901，文字与 HUD 实拍更清晰。Fold7 横屏 872.68×325 CSS px / DPR 2.625 由 2855×1064 调整至 2291×854。真实 PC 无其他渲染验收并发时首个自然百身 normal p95 4.3 ms（4416 帧，最大 49.9），dense p95 16.8 ms（614 帧，最大 29.1），pose p95 4.75 ms，接近旧版 dense 16.7 ms；不能把前面的并发负载结果归因于 UI。 · The density correction sharpened desktop text and removed excess phone pixels; isolated PC performance is near baseline.
- Fold7 单测首个自然百身：normal p95 16.7 ms（2213 帧，最大 66.2），dense p95 49.7 ms（227 帧，最大 67.8，4 帧 >50），pose p95 12.3 ms，LoAF 最大 71.2 ms。相同 backing 的幕布裁切 A/B（逐皮偶裁切 vs 原生遮板）B dense p95 49.7 ms（251 帧，最大 67.8，2 帧 >50），无足够收益，已回退 B。原版密集约 33.2–33.3 ms；本作保留 100 分身，差距记为引擎/应用联合待定位项，不能从 rAF 判断 GPU 或某一个引擎阶段的耗时。 · Mobile dense performance remains open; the matte A/B did not restore it. Natural routes are not identical deterministic traces; no causal claim.
- 未覆盖：实体手柄、读屏软件/Safari、WebGPU、其他手机档位、扬声器声学实听；浏览器模拟与真机数据分别列出。 · No physical controller, actual screen reader/Safari, WebGPU, other handset class or speaker acoustic test.

- 最后 HUD 定向实机：Fold7 自然触控攻击达到 2 连击时，计时 CSS 矩形 y74.03–90.28、连击 y95.69–125.79，分隔 5.42 CSS px；这来自实机状态与布局测量（截图未同时捕获短暂的连击文字），未把未出现的所有同时提示当作已目测。20 个文件哈希均通过。最终启动策略变更不改变 JS bundle（SHA256 `904d5728d41fb53e3c64f39cb6abc045dc9b98b1b989fdcfe5490affa625af65`）。 · Final real-phone layout probe measured a 5.42 CSS px gap; the transient combo was not simultaneously visible in the saved image. The final startup policy leaves the verified JS bundle unchanged.

#### 限速启动对照 · Throttled cold start

同一 390×844 Chromium/SwiftShader、冷缓存、下行 10 Mbps / 上行 5 Mbps / RTT 40 ms / CPU ×4，三种条件各一次。旧版为干净 `c971c0ff`（8e70dcb3）；第三项只在测试服务器移除 66 项资产 preload，之后将相同策略加入打包脚本，所有资源仍在 Begin 可用前加载。 · One cold sample per condition, same viewport and throttling; the third test removed only asset preloads and preserved modulepreload.

| 阶段 / Phase | 旧版 / Old | 原生 UI 原候选 / Native before | 原生 UI 入口优先 / Entry first |
|---|---:|---:|---:|
| 初始标题或启动提示可见 / Boot visible | 315 ms | 192 ms | 176 ms |
| 首次绘制提交 / First WebGL draw submission | 3,937 ms | 3,550 ms | 1,728 ms |
| 开锣真正可用 / Begin genuinely enabled | 3,779 ms | 5,568 ms | 5,109 ms |

- 入口优先使原生画布首次绘制在这一次对照中提前约 1.82 s，真正就绪也提前约 0.46 s；没有把加载挪到首次游戏操作。原生版实际可开锣仍比旧版慢约 1.33 s，未达到 3 s 完全就绪目标；首次绘制提交不是浏览器最终合成呈现时刻。原先通用 L1 1.5 s 是可见 HTML 元素的近似探测，不等于旧版实际就绪。 · The entry-first policy helps both first draw and actual readiness in this one comparison, not a controlled mean. Actual ready remains slower than the old page and above 3 seconds; no claim of compositor presentation.

### 2026-11-26 · Fold7 百身术受控分阶段验收 / Controlled dense-frame follow-up

实机：Samsung Galaxy Z Fold7 (SM-F966U1), Android 17, Chrome 157, Adreno 830, WebGL2, USB 供电；固定 1/60 虚拟时步，同一第一幕起始位置/天兵/场地/种子，预建 100，授予一次技能毫毛及临时保护（仅诊断，不记录成绩，也不是手动自然通关）。取每段分身年龄 1–6.5 秒，九块各 330 逻辑帧，共 2,970 帧，所有帧均为 100 个 shown、posed 分身。实机设备/输入环境均已恢复。 · Matched deterministic diagnostic, not a player clear. All sampled clones remained visible and posed.

| 对照 / Mode | 实际 backing | rAF p95 | 实际提交间隔 p50 / p95 | 提交数 / 330 | Draw calls p50 |
|---|---:|---:|---:|---:|---:|
| Expanded native A | 2291×854 | 34.4 ms | 33.1 / 49.8 ms | 283 | 43 |
| Expanded static bindings | 2291×854 | 49.6 ms | 33.1 / 49.8 ms | 289 | 41 |
| Expanded native linear | 2291×854 | 49.7 ms | 33.1 / 49.8 ms | 289 | 43 |
| Expanded native A repeat | 2291×854 | 49.7 ms | 33.1 / 49.8 ms | 296 | 43 |
| Expanded UI hidden (diagnostic) | 2291×854 | 33.2 ms | 16.7 / 49.7 ms | 291 | 11 |
| Compact old DOM / linear | 1517×854 | 33.2 ms | 16.6 / 49.7 ms | 289 | 11 |
| Compact native / linear | 1517×854 | 49.7 ms | 33.1 / 49.8 ms | 295 | 43 |
| Expanded atlas control | 2291×854 | 49.7 ms | 33.1 / 49.8 ms | 287 | 43 |
| **Expanded atlas** | 2291×854 | 49.7 ms | **17.8 / 49.7 ms** | **293** | **33** |

最终 Atlas 对照实际提交行 CPU p50 24.9→22.0 ms（p95 39.6→40.4），capture p50 3.0→2.2 ms，draw calls p50/p95 43/81→33/71；因此保留共享装饰图集。高分位未解决。Compact 对照 direct hook 确认旧/新 41/35 行因 pending=2 被跳过。分阶段值及逐帧资料在 [test/perf](test/perf/README.md)，所有时间为实际墙钟 CPU/rAF，实际提交间隔≠屏幕呈现。 · Atlas reduces median cost and draws, does not restore tail. Compact skips were explicitly measured. See reproducible CPU profiling data.

最终未插桩 packed 文件真机网络内容 5/5 hashes 匹配（包括新增图集），真实触控 Start、摇杆拖出轴 1、松手轴 0、暂停时间冻结/恢复通过，0 errors。该短测只覆盖第一幕，并未重新跑完整三幕。Node 90/90、packed browser acceptance 12/12，标题差 0.00%、暂停画面差 0.52%，原基线保持。 · Exact release package and real physical touch smoke passed; prior all-act acceptance remains history, not repeated here.

本批通用自动品质复测 14/16 通过：F1 无头 SwiftShader p95 17.5 ms（上一版 16.7），L1 通用限速首屏 3.3 s（上一版 3.1），均略超阈值；E2 通过（28 项拒绝请求仍可恢复）。这两次单次软件/启动测量不等于真机帧率，不能由此断言相同场景的稳定回退；真实 Fold7 的同条件 A/B 数据单列。 · Generic quality: 14/16 pass; software F1 and approximate L1 exceed thresholds. Do not conflate these with physical-device performance.

### 2026-11-26 · Fold7 Spine 语义/网格拆分与 Host 背压 / Spine semantics versus display under host backpressure

同一 Fold7（Android 17 / Chrome 157 / Adreno 830 / WebGL2）USB 供电，温度 30.1–30.4°C，thermal status 0，backing 2291×854；正式 Atlas 版本 5188e53c / 引擎 f0dfde36。固定 1/60 逻辑时步，诊断夹具临时提供百身术毫毛与保护，正常执行原规则但不写成绩。三次 fresh reload A/B/A，每段完整 548 行、分身年龄 1–6.5 s 的密集区 330 行，100 分身均逻辑存在、显示并更新姿势。 · Matched instrumented physical-device fixture, not a natural playthrough.

| 密集区指标 / Dense block | A 同步 / sync | B 延期 / deferred | A′ 同步复测 / sync repeat |
|---|---:|---:|---:|
| 实际提交 / submitted (of 330) | 296 | 271 | 303 |
| Host pending=2 跳过 / skipped | 34 | 59 | 27 |
| 提交间隔 p50/p95 ms / submit cadence | 16.7 / 49.7 | 33.1 / 49.8 | 16.7 / 49.7 |
| rAF p50/p95 ms | 16.6 / 33.2 | 16.6 / 49.7 | 16.6 / 49.6 |
| 跳过帧 CPU p50/p95 ms / skipped CPU | 11.3 / 22.2 | 4.7 / 9.9 | 13.3 / 24.2 |
| 跳过帧网格准备 / skipped display.prepare p50/p95 ms | 6.5 / 13.9 | 未执行 / none | 7.6 / 16.1 |
| 实际提交整帧 CPU p50/p95 ms / submitted CPU (steady) | 21.5 / 38.4 | 25.3 / 40.1 | 21.5 / 39.6 |
| 语义推进 / semantic deliveries | 34,229 | 34,229 | 34,229 |
| 网格发布 / display publications | 34,229 | 28,115 | 34,229 |

A 实际提交的稳态 CPU p50/p95：动画 update 0.1/0.3 ms、apply 0.4/1.0、骨骼与物理求解 0.1/0.5、语义快照 0.5/1.3；网格 extract 1.4/5.5、copy 2.8/9.8、包含上述两者的 prepare 4.4/12.8。B 的 display flush（含 prepare/commit/retire）在实际提交帧 p50/p95 7.6/16.4 ms（稳态样本）。稳态分组排除三次额外姿势摘要测量；原始密集数据及含检查点数据也保留。阶段有包含关系，不加总各 p95。 · Extract/copy are larger than animation update/apply/solve in the measured baseline. These are CPU spans, not GPU or display presentation.

严格查验：三组逐帧 548/548 对齐，相同逻辑状态、随机数、动画事件摘要及累计 6,421 次事件，三个骨骼/槽/轨道语义检查点完全一致；全段实际提交版本正确 501/501、472/472、510/510。初次诊断因两个独立页面时钟导致时步误差，有 45 行无法对齐，未认定等价；改为精确固定规则与 Spine delta 输入后重新实测，保留绝对 tick ID 作单列诊断。 · The initial clock-v1 run was rejected; exact clock-v2 A/B/A passed. This is fixture-specific proof, not an arbitrary-listener/lifecycle contract.

**结论：不采用延期作为正式版优化。** 它消除了被 Host 拒绝的帧的重复绘制工作，但成本移至真实提交帧，吞吐未改善。公开 API 目前不支持独立延期。保留上一批共享 UI 图集、100 分身及原有判定；生产源码、引擎副本、正式包均未改变。诊断脚本、[汇总 JSON](test/perf/reference-spine-fold7.json)、[990 行 CSV](test/perf/reference-spine-fold7.csv) 与引擎反馈 [#10](ENGINE-NOTES.md) 已保存。没有重新做三幕自然通关或 GPU 执行/屏幕呈现测试。 · The diagnostic is not a release optimization; it moved work to admitted frames and did not improve overall cadence. No new natural-play or GPU/presentation claim.
