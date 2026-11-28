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

## 2026-11-27 引擎更新回归 · Engine refresh regression

本轮先对同一游戏源码的引擎候选 `b1f275d7c208784f73824f20d8de4b093de3d00c` 执行回归与实机对照，再核对正式提交的运行时字节；上面的全量自动质量表与 11-26 深度诊断为历史证据，本轮不重新执行整套 `tools/quality.mjs` 或旧私有计时探针。· Historical full-table and detailed profiling results remain version-bound. This refresh uses focused regression and physical-device comparisons.

- Node `--test test/*.test.mjs`：90/90；`node test/accept.mjs`：13/13，无页面错误。既有标题/暂停画面差异 0.67%/1.87%，不更新基线。新增空 Boss/百身术状态不会发布语义占位符；packed、?dev、键盘、模拟触屏、转向、坏资源恢复、单棒/剧目记录通过。· All tests pass with baselines retained and optional text covered.
- PC 真机 · Physical PC：Windows / Edge 158.0.4370.33 / RTX 5090 Laptop / WebGL2，1280×800 CSS、backing 1281×801。同路线正常键鼠开锣、移动、暂停恢复通过；普通 120 rAF 间隔 p95 4.3→4.3 ms，最大 8.4→4.3。单独诊断固定 `?clones=100`、给予一次百身术毫毛和临时安全时间、实际 I 键释放；均实际出现并携带 100 个分身，120 rAF p95 20.8→20.8 ms，最大 25.0→25.1 ms，零错误、零 >33.4 ms、零渲染重试。· Natural short play and explicit 100-clone fixture are separate; visual review preserves the puppets, stage and native HUD. They are not frame-by-frame matched poses.
- Fold7 真机 · Physical Fold7：SM-F966U1 / Android 17 / Chrome 157 / Adreno 830 / WebGL2，实际横屏 873×325 CSS、backing 2291×854。真实触控移动 168→341.25、摇杆释放归零、跳跃及暂停恢复通过，121 rAF p95/最大值均为 16.7/16.7 ms（旧版→新版不变），零错误。· Matched physical touch short route; this round does not retest simultaneous multi-touch.
- Fold7 单独简化诊断 · Separate simplified dense fixture：仍以实际一次百身术和 100 个分身为条件，不使用 11-26 复杂私有测点。旧→新 rAF p50/p95/max 16.7/49.6/49.8→16.6/33.2/66.2 ms，游戏统计平滑 pose 计时 p50/p95 9.91/11.53→6.60/8.66 ms。实测有单次 66.2 ms；两组均为横屏 873×325 CSS、2291×854 backing、DPR 2.625、WebGL2，温度 33.2→33.3°C（thermal 0），120/120 帧均为 logical/out/carried=100。逻辑采样年龄因自动化输入启动时差为 3.59–6.64 s 对 6.91–9.46 s，骨骼样本不完全相同，不据此归因 #500 或 #504，也不承诺全面帧率提升。· The simplified outcome has a lower observed p95 and pose duration but a higher worst frame, with different natural pose ages. No causal or universal FPS claim.
- 保留玩法 · Gameplay retained：百身术 100 分身没有人为裁减来制造测试收益，不采用上一轮否决的延迟网格发布；数值、三幕规则、存档与动作资源未改变。原生 `beforeRender` 只为特定精度错误的下一次 admitted 画面准备补偿。实际短测没有触发该精度错误，因此恢复接口验证为正常集成，不声称复现了旧精度异常。
- 未覆盖 · Limits：不是新的完整三幕通关、无实体手柄或真实扬声器听感复验、无中端设备、Safari/Firefox、GPU 执行或屏幕呈现计时；之前完整路线仍见历史记录。

正式副本 · Released engine copy：94bd70fb26b1f81794c9c6fbbb258c655fcd19df。官方工具重生成后，与实测候选的所有 451 个记录文件逐项校验 SHA-256，除 vendor/SOURCE.md 的正式版本标记外 450 个文件均完全相同（运行时、导入映射、页面与发布包均一致），因此上述实际验收适用于正式运行时代码。 · Official generation from main is byte-identical to the tested candidate except the provenance pin in SOURCE.md.
发布包 · Packed JS SHA-256: a9862dd15f396023ed4489f07aac5d1426b6b005b9469d3dbcc12bf5218cf60a (1,256,814 bytes).

## 2026-11-27 百身术同逻辑长帧复测 · Matched 100-clone tail investigation

本次只替换已测试的引擎共享网格准备实现；游戏玩法、100 个分身、资源、Spine 动作、原生 HUD、显示密度、判定与存档均保持。诊断固定第一幕、种子 734、逻辑步长 1/60 s、同一施法时刻，不是自然通关。所有记录的 rAF 为浏览器回调间隔；各阶段为 CPU 墙钟耗时（包含可能的驱动等待），不是 GPU 执行或屏幕呈现时间。历史 66.2 ms 记录不含精确状态，不能断言复现了同一个历史随机帧。· The matched deterministic fixture isolates CPU stages, not GPU execution, with no gameplay or visual reduction.

| 诊断 · Probe | Fold7 旧版 / 候选 · A / B | 解释 · Interpretation |
|---|---|---|
| 严格 A/B/B/A（每块 330 个密集采样） | rAF p95 均约 49.7 ms；最大 66.4 / 49.8 / 66.3 / 51.3 ms；>50 ms：2 / 0 / 1 / 3 | 深度测点有开销；未消除全部长帧 / deep probe retains tails |
| 严格共同准入的 190 个逻辑点（A/B 各 380 样本） | 几何准备 p50/p95 5.4/12.0 → 4.7/7.8 ms；整个 WebGL2 prepare 6.6/13.3 → 5.9/10.0；Host CPU 25.3/40.8 → 24.2/38.3；提交 3.7/11.4 → 3.3/10.8 | 预算和几何输出不变；局部几何 p95 降约 35% / measured stage reduction |
| 低开销 B/A/B（每块 330 个密集采样） | p95/max B1 33.2/49.7、A 49.7/66.3、B2 33.2/49.8 ms；>50 ms：0/5/0 | 重复实测改善，不承诺永远无长帧 / observed, not guaranteed |
| 低开销共同准入的 205 个逻辑点 | 几何中位 6.6 → 4.5 ms，p95 11.2 → 12.4；Host CPU p50/p95 24.5/40.0 → 22.8/35.1 ms | 中位稳定、尾部仍波动 / median improves; tail varies |
| PC 实机严格 A/B/A | 几何 p50 2.4 / 1.8 / 2.9 ms；rAF p95 16.7 / 16.8 / 20.9，max 20.9 / 29.0 / 29.2 ms；无超过 33.4 ms | 不把帧率波动解释为性能提升 / no general FPS claim |

- Fold7：SM-F966U1 / Android 17 / Chrome 157 / Adreno 830 / WebGL2，横屏 CSS 873×325、backing 2291×854，严格和低开销交替时电池温度约 31.7–32.8°C，thermal 0。每块 548 逻辑行、330 密集行均呈现/求姿 100 个分身；严格四块的 6,421 次有序事件摘要与每次 Host 可提交修订一致，低开销的三处状态摘要一致；均无页面错误。PC：实际 Windows Edge / RTX 5090 Laptop / WebGL2，1280×800 CSS、1281×801 backing。同设备各组尺寸、输入进度、种子一致。· All matched state and committed revisions passed; no simulated device claim.
- 分解：严格旧版一条 66.2 ms 的间隔对应同步 CPU 40.8 ms，其中 Spine 10.0、几何 18.9、提交 4.3；低开销旧版一条长回调 CPU 60.9 ms，其中 Spine 24.7、几何 10.7、提交 17.6，LoAF/longtask 匹配。候选严格剩余 66.3 ms 的间隔对应 CPU 54.7 ms，其中 Spine 32.6（拷贝 12.4、提取 8.4）、几何 7.0、提交 2.3。未发现 UI、判定或特效突然爆发导致这些长帧。不同长帧的瓶颈并非同一个阶段。· No evidence of one universal cause.
- 本次引擎补丁：[Egret Rebuild #508](https://github.com/cnedwin/Egret_rebuild/pull/508)，直接复用已验证的非退化三角形角点并保持原预算和回退顺序。独立的 100 份 Spine 几何准备 A/B/A/B 中位 2.46/2.06/2.41/1.96 ms；所有输出、打包及预算完全相同。· Exact preparation/packing microbenchmark and real devices agree on the local gain.
- 未覆盖 · Limits：没有本轮自然三幕通关、实体手柄、中端手机、Safari/Firefox、异步 GPU 执行或屏幕呈现时间；不隐藏历史全量质量表的失败项。密集区外的百身术同时退场，另一次严格探针测到规则回调长任务，低开销候选未再出现；需独立复现，不并入本次密集几何优化。

- 未插桩候选发布包 · Uninstrumented candidate: Fold7 实际点击开锣、摇杆按住移动 x168→346.75 再松手（轴归零）、跳跃、暂停继续均正常，普通路线 121 个 rAF 间隔 p95/max 16.7/16.7 ms，无页面错误。单独百身术视觉检查两张实拍前后均 100 logical/out/carried/made、1 次施法，未见明显几何或纹理损坏；这不是性能采样期间截图。候选发布 JS SHA-256 46bb2112cba170b8915b72294798144845eb9aa0327b8d911ab1900939f2ce19。 · Real device touch and independent visual fixture; no timing claim from the screenshot.

- 引擎验收额外边界 · Engine verification scope: 423/423 共享渲染/Spine CPU 检查与类型检查通过。默认 Edge 的 WebGL2/WebGPU 26 个原纯 2D 正例，对两版本共 104 次原像素规则检查均通过，52 对整幅读回逐字节相同。历史全量 shared-webgpu 工具在基线与候选均因已删除 Scene3D 入口在启动前失败；四个旧的混合 3D 正例和 mutation 控制未由补充范围运行，完整旧门不记为通过，不改变其判定。 · Applicable 2D readback suite passed independently; obsolete mixed 3D full gate remains incomplete.

可公开复跑 · Reproducible diagnostic: [test/perf/tail-20261127/README.md](test/perf/tail-20261127/README.md), [脱敏数据 · sanitized reference](test/perf/tail-20261127/reference-fold7.json)。诊断测点只构建本地测试包，不进入发布包。

- 候选游戏回归 · Candidate game regression: Node 90/90；原浏览器验收 13/13（headless Chromium / SwiftShader，非真机），标题/暂停截图差异 0.67%/2.28%，保留原基线。键盘、原生焦点、中英文、模拟触屏越界/释放、暂停、坏资源恢复、记录和重演均通过。 · Existing suite and screenshot baselines retained; no new natural three-act claim.

- 主干并行更新后的实际回归 · Integration refresh: #507 合入后，#508 的测试头正常更新为 df0e12369d3477f2f7033e824e96f3eadafd39b3。几何文件及专项测试字节完全不变；它额外包含 BrowserGame/BrowserPlay/screen 的屏幕模式更新，本作明确沿用 expand，不启用 wholeScale。引擎 build 及 28/28 定向测试通过。Fold7 同低探针固定 548/330 行、3 个稀疏摘要与画布相同，p95/max 33.2/49.8 ms，密集 >50 ms 为零；PC 同低探针 16.4/26.2 ms，相同逻辑和几何。未插桩集成包 SHA256 03bb38d064608454ef6cce03aaa7688e571c28fa6a4db81e3a99d3190bde2a07：Fold7 普通路线移动 x168→338.5、释放归零、跳跃、暂停恢复、两张 100 分身实拍均通过，普通 121 rAF p95/max 16.7/16.7 ms，零错误；Node 90/90、浏览器 13/13、标题/暂停截图差异 0.67%/1.91%，保留基线。· Integrated candidate, not merely the earlier patch, also passed the actual device route and existing browser tests.

- 分身集中退场 · Separate expiry event: 集成候选全段另一次 82.9 ms 发生在 sample516 百身术由 100→0，规则 step 0.3 ms、事件 66.3 ms、Spine 0.1、geometry 0.5、submit 2.8，整同步 CPU 74.4 ms；较早的严格候选也在相同退场点出现类似长帧。源码中退场尘雾 48 次 `burst(4)` 每次重建整个 emitter 网格；这是独立的可复现粒子发布问题，不计入密集区，也不是此次三角形补丁已解决的部分。· The expiry event is distinct from dense geometry processing and warrants a targeted batched emission fix that preserves every puff.

### 分身退场粒子发布 · Clone-expiry particle publication

本次又在同一个固定逻辑点复现了百身术退场的独立长帧。使用引擎 [#508](https://github.com/cnedwin/Egret_rebuild/pull/508) 的 `ParticleEmitter.burstAtMany(sites)`：游戏仅在 `clones-gone` 将前 48 个位置的 4 粒子逐点 burst 换为一次同序批处理（`src/main.mjs`），192 个尘雾的数量、位置、随机序列、容量、音效、出现时间、战斗规则与存档不变。引擎完整预校验、逐点 spawn，返回前同步发布最终网格；原单次 burst 不变。· The second bottleneck uses one synchronous multi-origin emission, without changing the particles or gameplay.

| 同一逻辑点 sample516 · Matched expiry at logic 1034 | 旧逐点 A · Sequential | 批量 B · Batch | 旧复跑或批量复跑 |
|---|---:|---:|---:|
| Fold7 事件 CPU (ms) | 40.0 | 2.2 | 5.4 (B) |
| Fold7 同步整帧 CPU (ms) | 45.7 | 10.1 | 13.3 (B) |
| Fold7 rAF (ms) | 33.2 | 16.5 | 16.5 (B) |
| PC 事件 CPU (ms) | 28.6 | 1.6 | 30.2 (A) |
| PC 同步整帧 CPU (ms) | 34.0 | 6.4 | 35.6 (A) |
| PC rAF (ms) | 35.8 | 7.8 | 36.5 (A) |
| 实际非空事件网格发布 · Real event mesh publications | 48 | 1 | B 1 / A 48 |
| 尘雾存活粒子 · Live dust | 192 | 192 | 192 |

- 两组 A/B 输入的 448 个 vendor 文件逐字节一致，合并候选 `99f520231d0423edbe5a28ba575d7508c0b32ac5`，两端每块 548 行/330 个 100 分身密集行，逻辑/RNG、三个状态摘要、所有粒子存活计数完全对齐；Fold7 为 A/B/B、PC A/B/A。Fold7 30.6–30.8°C、thermal 0、同 Adreno 830 WebGL2 2291×854。48 处、192 请求、每个退场样本粒子列表 alive=[17,23,192,0]。事件 CPU 下降 86.5%–94.5%（Fold7 本次独立观察）。· Real same-engine causal comparison; exact geometry and particle state also independently tested in Node (48 vs 1 publications, median CPU 39.42→1.37ms, 100 alternating rounds).
- 密集窗并非退场 · Dense window is separate：这组 Fold7 A/B/B 的密集 rAF p95 都约 33.2 ms，最大值 66.3/49.8/66.2 ms。B2 sample339、age 4.05 的 66.2 ms 对应 CPU 51.8、Spine 15.0、geometry 11.5、prepare 13.0、submit 11.7 ms，事件/UI 均 0；本次批量接口不可能修复此类时序波动。· The independently fixed expiry does not eliminate dense tails; CPU phase measurements are not GPU execution.

- 未插桩双修复包 · Physical production candidate: SHA-256 ae31f37e900fec5811b2908ff30cdd566a4443537f90e7d0acd2c210cba83c0d；Fold7 实际移动、松手归零、跳跃、暂停恢复正常（普通 121 rAF p95/max 16.7/16.7 ms，零错误）。在未修改时钟、无暂停的独立实拍中，真实分身剩余寿命 0.242 s 后自然 100→0，保留可见多点烟尘带、角色与 UI 无明显几何或布局异常。Node 90/90、浏览器 13/13（headless）通过；标题/暂停基线差异 0.67%/1.62%，保留原基线。 · Real touch and separate puff visual inspection; not a performance capture.

- 最新集成头 · Newest measured integration: `5059be3a4ad15084422a63af72a609969844690f` 额外包含主干 #510 的可选 UI scale（本作不传，默认 1）；源几何粒子实现和测试仍逐字节相同，双语 API 索引重生。真实 PC/Fold7 同探针均与上一候选 548/330 行、状态/粒子数匹配，退场事件 1.7/3.4 ms、一次网格发布、尘雾 192；dense p95/max PC 16.7/25.1，Fold7 33.2/49.8 ms（该块全段无 >50）。Fold7 未插桩正式候选 SHA-256 b1cb1f403f349e0a2920b926dfd6fb6b722d0f8d4be6987431abc1346ed11976，普通触控 x168→341.25、释放、跳跃、暂停恢复零错误，121 rAF p95/max 16.6/16.7 ms。· Same verified patch after main integration; no global long-tail guarantee. 最新候选 Node 90/90、原无头浏览器验收 13/13，通过未改基线的标题/暂停差异 0.67%/1.80%。 · Latest candidate passes both existing suites without updating baselines.

- #511 平板布局集成 · Tablet integration: `703cda2476cc3fc3e1550d657d51266df2b69ab5` 保留两项优化源码/测试字节，重生 API 索引，57/57 定向通过。本作未指定平板专用分支，仍按 root/portrait 回退。此次实际 PC/Fold7 单 B 复核 548/330 逻辑及全部粒子计数一致（无新 A/B 归因）；退场事件 PC 1.4、Fold7 2.2 ms，一次网格发布、192 尘雾；密集 p95/max PC 16.7/29.1, Fold7 33.2/49.8。未插桩候选包 SHA256 332ebb39046e9a290e9e12b673e60a3e1ac53dccd55fdd1be9b3c60df2a057ff，Fold7 普通触控、跳跃、暂停恢复通过，121 rAF p95/max 16.7/16.7，无错误。 · Latest tested integration retains both exact fixes.

- 正式发布引擎 · Released engine main: `83bec954ef253be13455af2016af956376f98b71`（[Egret Rebuild #508](https://github.com/cnedwin/Egret_rebuild/pull/508) 已通过正常 M0/merge-ready、Windows 全量/四分片、macOS/Linux 等检查并合入），Git tree 与最终候选 `7b8f9ba2` 完全一致。由官方 detached main 构建和 vendor-game 重新生成，不发布诊断代码。包含 #513 的新可选八屏验收工具（正常游戏不设置其 agent）。发布包 SHA-256 `098ded1e996c15a2593a43ac45e7637049131d21973442a221219fabc54f255f`，实际 Fold7 读取该包并完成普通真实触控路线（x168→346.75、轴归零、跳跃、暂停恢复、121 rAF p95/max 16.7/16.7 ms，零错误）及独立自然退场烟尘实拍。Node 90/90、原浏览器验收 13/13（headless）、标题/暂停基线 0.67%/2.02%、原基线保留、游戏标准通过。· Official generated bundle on real handset, not a new full profiling matrix; engine merge is distinct from Pages deployment.

## WebKit 手机兼容回归 · Mobile WebKit compatibility (2026-11-28)

- Windows Playwright WebKit 26.6、iPhone 15 Pro 配置（393×659 CSS px）：公开旧版标题有原生控件形状但菜单文字不可见；通过正式工具更新引擎副本并重建发行 bundle 后，标题文字恢复。真实触屏点击「开锣」，入场画面和 HUD 可读；JS、控制台、HTTP 错误 0；Node 90/90（含 bundle 一致性测试）通过。 · Official engine delivery and rebuilding the production bundle restore visible labels and initial play, verified with browser screenshots and touch.
- 未测实体 iPhone、三幕完整通关、声音实听或手机性能。 · The test is Windows WebKit with an iPhone profile, not physical iOS acceptance.
