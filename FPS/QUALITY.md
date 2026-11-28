# 品质验收 · Quality — Operation Cutoff · 断流行动

## iPhone 配置 WebKit 启动回归（2026-11-28） · WebKit startup compatibility

Windows 上的 Playwright WebKit 26.6，iPhone 15 Pro 设备配置，竖屏 393 × 659 CSS px，独立的新浏览器上下文；不是 iPhone 真机或 iOS Safari 本体。改造前测试公开 Pages，改造后测试候选工作树的本地 HTTP 服务。

Windows Playwright WebKit 26.6 with an iPhone 15 Pro profile (portrait, 393 × 659 CSS px, isolated fresh browser context); not a physical iPhone or iOS Safari itself. Baseline: public Pages; retest: candidate worktree over local HTTP.

- 引擎副本 · Engine: `82561d6338a805f0e0459a2d5d42a284f9385b30`.
- 改造前：标题场景正常绘制，语义名称可读，但画布文本全部为空白。WebKit 的 Canvas 2D 缺少若干可选文本属性及完整的 context attributes；高层默认文字样式现在使用引擎正式的可移植路径。 / Before: the title scene rendered and buttons had semantic names, but canvas text was blank. The WebKit host lacks optional text properties and complete context attributes. The refreshed engine uses its portable high-level default text path.
- 按需绘制追加复测：触摸设置后语义树已更新，3/5 秒两张实际截图仍是标题。只在菜单栈呈现提交时调用引擎正式 `play.invalidate()`，并合并 250 ms 后一次补绘，销毁时取消；不启用永久绘制。复测 3/5 秒两张均为可读的真实设置面板，首屏保持正常。 / A separate visual recheck reproduced stale title pixels 3/5 s after tapping Settings even though semantics were updated. Invalidate on menu publication and coalesce a single follow-up 250 ms later; cancel on disposal. Both retest captures now show actual settings, and title pixels remain correct. No continuous drawing.
- 改造后 / After：标题文字、介绍和按钮清晰，实际触摸「设置」后语义树出现画面、输入、通用、画质和视野控件。 / The title, description and button labels are visible; touching Settings exposes display, input, general, quality and FOV controls in the semantic tree.
- 复测无页面异常、控制台错误、HTTP 4xx/5xx 或失败请求（四项均 0）；`node --test test/*.test.mjs`：107/107 通过。 / No page exceptions, console errors, HTTP 4xx/5xx or failed requests on the local retest (zero in each category); 107/107 Node tests pass.
- 仅验收启动、首屏截图及一次浏览器触摸操作；未覆盖整局、设备横竖屏切换、物理 iPhone、真实 iOS 音频、Safari 版本差异或性能。 / Startup, title screenshot and one browser touch event only; full playthrough, rotation, physical iPhone, real iOS audio, Safari version variation and performance were not covered.

## Whole-map Tripo environment art / 全地图 Tripo 场景美术

基线 / Baseline: game `949bf17334b6385933fff9b199765275df54ed3c`, fixed engine `d2e28f46182a563fd594cc51847240429ab0a5b5`. The changes are cosmetic only: no collision geometry, scenario, player input, rules, values, saves, quality choices or audio changes. / 保持原地图碰撞、玩法、操作、数值、存档、音频和画质档位，固定引擎。

- 全图实拍审计覆盖 18 组同机位（全景、东西树林、道路/灯具/井盖、围墙与远景、厂房内外/屋顶、管理楼内外/屋顶、大坝景观等）。原已有详细建筑、货箱、车辆等保留；显眼的旧美术替换为七个项目自制 Tripo GLB（阔叶树、杉树、双层床、档案架、维修台、桌面电脑组合、储物柜）。 / Eighteen matched physical-PC art viewpoints identified remaining prominent placeholders. Existing detailed environment assets were retained. The seven new authored models replace the primitive versions.
- 53 株树原位置不变，8 株近树保留约 17.6k 三角/原生 PBR 几何，45 株外侧树使用同一源模型烘焙的 6 三角 alpha-mask 近似轮廓；四组原生实例，共 140,954 视觉三角（不含阴影代理）。近处重新校正非金属材质、漫反射补光及底色自然色调，避免背光全黑；远景补光较弱、保留 alpha 深度阴影，正常启动不构造旧树。模型缺失时走原版 Retry，不混入旧素材。 / Native high-near and same-source masked far models share the placement frame and original texture channels; weathered tones and restrained textured fill improve shaded readability. Far models remain deliberately lightweight, not photographic full-foliage geometry.
- 五类室内家具纠正正面、贴地、等比比例；两屋共享无雨纹和镜面反射的干燥楼面，室外雨天反射不变。井盖由黑圆饼改为带浮雕法线的铸铁纹理，草丛改为弯曲叶片，路锥/灯具加可见细节，修正远山悬空暗带和警示标识长字裁切/遮挡。 / Native case props, dry floors, cast-iron drain relief, curved foliage ribbons, street fittings, terrain normals and fitted sign text. No topology/gameplay changes.
- 新增模型原导出 56,101,880 bytes，经纹理压缩、远景同源烘焙及树木底色精修，实际提交 9,268,700 bytes（新增下载量，非整个游戏缩小；原导出减少约83.5%）。所有 GLB 自含，非颜色通道、近景顶点与索引数据保持原样；[美术来源及校验](assets/models/scene-art-provenance.json)。 / 9.27 MB added shipping art instead of 56.10 MB original exported files; embedded textures, verified near meshes, same-source far art and license provenance.

### Matched hardware evidence / 同机位真机证据

[树木前后对照](test/evidence/tripo-trees-before-after.jpg) · [室内和道路前后对照](test/evidence/tripo-environment-before-after.jpg) · [性能与版本校验记录](test/evidence/tripo-scene-receipt.json)。PC uses Windows Edge RTX 5090 Laptop native WebGL2 D3D11, 1400×900, medium quality, seed 7. Fold7 uses Galaxy Z Fold7 native Adreno 830 Android Chrome, 873×325 landscape, same settings. All before/after art positions were inspected. Art screenshots use a paused, isolated diagnostic camera, not natural playthrough or performance evidence; normal input and cadence were measured separately. / 所有美术截图与正常操作、帧率采样分开；物理屏幕实测与 PC 视口模拟分开。

| Normal 7-second initial-area window / 正常开局 | Before / 旧版 | Final / 新版 |
| --- | ---: | ---: |
| PC actual rAF callbacks / 约7秒回调次数 | 1675 | 1667 |
| PC P50/P95/max interval (ms) | 4.2 / 4.3 / 8.3 | 4.2 / 4.3 / 20.8 |
| Fold7 callbacks / frequency | 420 / 60.04 Hz | 420 / 59.90 Hz |
| Fold7 P50/P95/max interval (ms) | 16.6 / 16.7 / 33.2 | 16.6 / 16.7 / 33.2 |
| Fold7 world draws / triangles | 129 / 9,416,040 | 136 / 9,596,727 |
| Fold7 single fresh-context title wall time | 6436 ms | 7381 ms |
| Fold7 broad draw EWMA | 6.02 ms | 6.17 ms |

No interval >50 ms in these paired normal-start samples. On Fold7, actual touch movement, cancel, pause freeze and resume passed; each sample preserved the same initial route, and the eleven additional isolated art camera views retained game mode/time. 43/43 final served source/runtime/GLB hashes matched; all 43 exact model roles loaded with no unexpected request/runtime errors; device was restored. Actual Fold7 steady short sample is essentially matched, not a high-load performance guarantee. The single cold-title observations are not statistical: PC 7350→6718 ms, Fold7 6436→7381 ms. New downloads add 9.27 MB; the start-up cost varies by link/device. / 该同条件开局窗口两台设备均未出现 >50ms；手机并非模拟。新版开销增加且单轮冷启动略慢，不能据此断言普遍启动改善或完整混战性能不变。

最终实际 PC Edge RTX：原生桌面操作 33/33、PC 手机尺寸模拟 17/17、官方硬件通用检查 8/8，模型拒绝后重试恢复；0 运行/请求错误。15/15 关键源码与七个新 GLB 字节指纹匹配，18 个定点对照均通过。 / Final native desktop 33/33, PC phone-viewport emulation 17/17 and official verifier 8/8 passed; 43 models loaded, critical resource retry recovered; 15 served source and asset fingerprints matched. The generic input verifier is not a full mission.

Final Node tests 119/119; three independent no-browser rules simulations still reach extraction at 357/358/357 s. Not repeated: full manual high-load extraction on both devices, WebGPU, Safari/Firefox, dedicated listening and physical controller. The near models preserve volumetric foliage clusters, not individual botanical needles; the inaccessible exterior intentionally retains simplified distant scenery and ordinary structural trim. / 自动回归 119 项全过，三组独立规则模拟正常；未重新跑整局高负载真机完整撤离或其他浏览器，近景仍是实时 3D 叶簇表现，并非照片级或真实植物模拟。

## Scene art repair / 场景美术缺陷修复

Baseline / 基线：`3ca60f0edb0898f4b3222f7a93c67bafab099b61`；引擎固定为 `d2e28f46182a563fd594cc51847240429ab0a5b5`。仅替换场景表现，地图坐标、碰撞、玩法、存档、画质选项和音频不变。 / Same engine and rules, collision, placements, settings and audio; only scene presentation changed.

- 大坝：三个泄洪口的无纹理实心白色流体/泡沫盒改为透明水纹及柔边水花，地面十处重叠黑色多边形积水改为单层不规则纹理，复用原生平面反射与雨水法线。 / Feathered textured sluice sheets/spray and a single irregular puddle surface retain native planar reflection and rain normals (`src/water-details.mjs`). 两类表面各保留一个网格，无额外反射通道。 / Two mesh surfaces, no extra reflection pass.
- 植被：原 10 株阔叶、43 株杉树的坐标和尺寸不变，改为独立树干枝条、带颜色和法线纹理的树皮和透明裁切叶片；共四个原生实例批次，保留投影及背光层次。叶片色调和杉树枝条倾角再次精修。 / Native instanced bark and masked foliage replace the cone/ball placeholders at the original tree locations. Four shared batches with shadows, muted foliage and varied spray angles (`src/vegetation.mjs`). No external downloads or new binary art assets; four 256² RGBA vegetation maps (1 MiB raw) and two small water maps are generated locally.
- 物资箱：移除整块发光内板，保留原开盖动画及搜集逻辑，用受光内衬、隔板和通用小包装形成真正的箱内层次；回退箱子也改为同外边界的空壳。 / Recessed lit lining, dividers and packages replace the luminous rarity slab in one mesh; the fallback is hollow. No change to the opening threshold or inventory (`src/supply-crate-art.mjs`).

同机位美术检查：Windows Edge、RTX 5090 Laptop 实际 WebGL2 D3D11、1400×900、中画质、seed 7，旧版与最终修订版均完整加载 36 个模型。两次各六组场景定点画面，分别核对水闸宽/近景、积水、阔叶与混合植被、杉树、开启物资箱；截图已逐张检查，无运行或 HTTP 错误。 [五组前后对照](test/evidence/scene-art-before-after.jpg)。定点相机和仅用于检查外观的开箱状态设置均只在独立诊断页面，在规则暂停后执行，不计为正常游玩。 / Matched real-GPU art checks at six cameras were inspected individually, with 36 models and no runtime/HTTP errors on either revision. The isolated fixed-camera/open-case presentation fixture is not a playthrough or a frame benchmark.

### Device and regression checks / 设备与回归

| Condition / 条件 | Before / 改造前 | Initial candidate / 初版修复 | Final / 最终修订 |
| --- | ---: | ---: | ---: |
| PC RTX 5090, 7 s starting-area rAF, medium/seed 7 (callbacks / P95 / max) | 1668 / 4.3 / 12.5 ms | 1661 / 4.3 / 41.9 ms | 1678 / 4.3 / 8.3 ms |
| Fold7 start-area A→B (Hz / P95 / max) | 59.76 / 16.7 / 33.2 ms | 50.34 / 33.2 / 49.8 ms | — |
| Fold7 fresh contexts in reverse B→A | 39.79 / 49.7 / 66.3 ms | 59.76 / 16.7 / 33.2 ms | — |
| Fold7 final art, same route, battery 32.6→32.7°C | — | — | 50.23 / 33.2 / 82.9 ms |

三星 Galaxy Z Fold7 实体手机（Adreno 830、外屏横屏 873×325，WebGL2，中画质）两组顺序相反的约 7 秒正常开局对照，结果反转，因此未确认可重复的美术改动引起的性能下降。最终修订版真实源文件 35/35 校验通过，完成触屏移动、取消、暂停及恢复；36/36 模型正常，无运行或请求错误。最终 7.03 秒样本出现 82.9 ms 和 66.3 ms 两次长间隔，平均 50.23 次回调/秒；不是持续满帧或混战性能结论。开局场景实际绘制由 125→129 次、三角数 9,405,794→9,416,038（约 +0.11%）。另行检查最终版六个定点镜头，未出现原白块、黑圆盘或发光内板。 / Physical Fold7 smoke used actual touch input, source hashes and six isolated art cameras. Two short A/B pairs reverse the apparent cadence difference, so causality is not established. The final sample has two >50 ms intervals; no claim of a universal frame-rate improvement or high-load qualification.

最终版本 107/107 Node 测试（新增 9 项针对性场景与材质检查）、三组无页面规则模拟分别 357/358/357 秒到达撤离终点；实际 RTX 桌面原生交互验收 33/33，同机手机尺寸模拟 17/17，官方硬件通用验收 7/7，均无运行异常或 HTTP 失败，实际资源拒绝后重试恢复 36 个模型。13/13 桌面及尺寸模拟路径的源码校验包括新美术实现；35/35 真机源码/关键引擎入口校验。 / Final 107 tests, three deterministic no-browser rule runs, 33/33 hardware desktop, 17/17 PC-emulated phone layout and 7/7 official hardware verification; the last three rule simulations are not manually completed missions. New art modules are generated at scene creation, not downloaded as GLB assets.

本轮没有改动存档、引擎副本及游戏规则；没有重新执行两台设备上的完整高负载撤离、WebGPU、Safari、Firefox、实机手柄或专门听音。水流和树木是高效实时美术表现，非真实流体或全叶片三维模拟。手机长帧仍应独立追踪，不能从本短样本断言引擎缺陷。 / No final full high-load device mission, WebGPU, Safari/Firefox, physical controller or dedicated listening test. This is an art repair with bounded visual and interaction evidence, not a fluid simulation or a general performance guarantee.

## Fold7 frame pacing and public startup / Fold7 长帧与公网冷启动专项

Baseline / 基线：game release `91e1f0e4`, engine `d2e28f46182a563fd594cc51847240429ab0a5b5`, seed 3 medium WebGL2 on Fold7 and seed 7 medium on Windows Edge RTX 5090 Laptop. The geometry-cache and HUD-revision experiments retain the engine pin for attribution. No art, quality setting, simulation, input, save or audio change. / 模型、画质、规则、操作、存档、声音不变，以下A/B固定引擎以区分Demo改动与引擎。

### Public cold startup attribution / 公网冷启动归因

Three fresh exact-public-file PC runs (one CPU-profiled), 16/16 source hashes and 36 models in each, no errors. Durations are measured in the actual page; overlapping intervals are not additive. / 三轮实际冷启动（其中一轮CPU追踪），资源版本一致，以下阶段有重叠不能相加。

| Stage / 阶段 | Run 1 | Run 2 | Run 3 |
|---|---:|---:|---:|
| HTML TTFB / 首字节 | 264 ms | 9 ms | 259 ms |
| First model request → last model end / GLB首请求至末尾 | 3.299→5.316 s | 0.344→1.730 s | 3.818→5.492 s |
| Asset progress complete / 模型进度完成 | 5.340 s | 1.754 s | 5.528 s |
| Scene long task / 场景同步长任务 | 3325 ms | 3536 ms | 3543 ms |
| Native 3D prepare / 着色变体准备 | 762 ms | 793 ms | 908 ms |
| Total first-view warmup / 3D首绘预热 | 1505 ms | 1597 ms | 1702 ms |
| Title usable wall / 标题可用 | 13.564 s | 9.035 s | 15.002 s |
| Deploy lock / 部署锁定 | 268 ms | 346 ms | 274 ms |

34 unique GLBs / 34个唯一GLB，36个角色与场景资源槽，公网编码传输约48.17 MB; public network request timing varies with RTT and module discovery. Native 2D host `getStartupTiming()` on matched local PC reports context creation ~5–6 ms, parallel program preparation ~1.8–2.0 s (distinct from 3D preparation). CPU profile puts the main scene task in `createView`→`buildScenery`→`buildSections`; GLTF accessor/geometry work is much smaller. / 本地2D正式宿主时序表明创建上下文和着色程序准备是不同阶段，后者约2秒，不能把这段时间都归入解码。模块预加载的受控四轮平均标题仅改善约0.7%，未采用；提前同步构建整个场景会阻塞宿主模块发现，也未采用。 / Six exact module preload hints in a controlled 120 ms/100 Mbps HTTP1 test did not reliably shorten the critical path (average title -0.7%, no duplicates); rejected. A scratch early-scene prototype delayed host module readiness and produced no wall benefit; rejected. Neither experiment is a measured public h2 speedup.

### Exact geometry optimization / 精确场景优化

The flat per-part typed cache retains exact transformed vertex and normal/UV values, reuses three corner tuples in each clipping calculation, and avoids rebuilding the same indexed input. Intersections, output order, bounds, indices and attributes remain byte-exact on generated boundary fixtures and authored plant/container GLBs. No additional objects kept alive across scene creation. / 每个网格部件用扁平数字缓存和三个可复用角点，保留原始输出及碰撞，四项回归验证（含非单位变换共享索引）。

| Matched local RTX runs / 同路线本地PC | Prior A | Candidate B |
|---|---:|---:|
| Title ready (two runs) / 标题可用 | 7150 / 6994 ms | 6253 / 6295 ms |
| Scene long task / 场景长任务 | 2906 / 2929 ms | 1903 / 1932 ms |
| CPU profile `buildSections` inclusive / 裁切采样 | 1949.6 ms | 991.3 ms |
| GC CPU sample / 垃圾回收采样 | 192.1 ms | 153.6 ms |
| `createView` inclusive / 场景创建采样 | 2694.6 ms | 1748.2 ms |
| Delay to deploy lock / 部署输入锁定 | 241 / 256 ms | 270 / 257 ms |

The preliminary cache of retained JS arrays reduced clipping work but increased GC and did not improve end-to-end startup, so it was replaced with bounded flat storage. Actual results show the revised representation reduces the scene long task about one second without deferring the work to the first action; shader preparation not claimed faster. / 首个JS对象缓存方案被实测否决，扁平缓存实际使场景长任务减少约1秒，无首操作等待转移。

### Physical Fold7 pacing / 三星真机帧间隔

Adreno 830, Android17 Chrome158, 873×325 CSS, DPR2.625, medium WebGL2. Fresh owned browser contexts, ordinary trusted-protocol touch, seed3, ~115s gameplay through the same first objective. Untouched public baseline measured 4352 stable intervals, p95/max49.8/99.5ms, 103>50ms, zero>100ms. A separate public attribution run measured 4515 stable intervals, p95/max49.7/99.5ms, 29>50. GPU timer extension unavailable on this device; numbers are actual callback gaps and synchronous CPU metrics, not GPU or screen presentation FPS. / 不把部署/暂停时跨边界间隔当稳定长帧，不把手机模拟或协议输入当真人操作。

Actual time-aligned scratch diagnosis (same original game and engine, normal defeat at16.31s): top-level Play timing hook supplied but 0 samples, World3D hook 751; 82.8ms gap aligned with native World3D13.4ms and actual 2D shared capture/submission57.7ms, another67.4/66.3ms gap aligned with world2.6/3.5ms and 2D53.6/58.9ms. The separate public scoped renderer samples had main CPU submission p95 3.5ms, reflection1.6ms; the actual GPU-query status was unsupported. These native CPU scopes overlap and there is no proof of GPU execution time or host-only texture time. / 诊断正常阵亡仍保留原始证据；正式Play接口缺少帧采样回调，已单独向引擎提交 [#562](https://github.com/cnedwin/Egret_rebuild/pull/562)，它修的是观察能力，不是性能数字本身。

The HUD no longer flips an already-visible stable marker off/on each update or rebuilds hidden hit graphics when only the crosshair spacing changes. The displayed quantized shape, presence, position, and event timing stay the same. / 优化指南针同状态显示及隐藏命中图形的重复标脏，保留反馈即时性、位置及画面。Three native Sprite/Graphics tests verify stable no-change and independent shape/event updates; combined with four geometry tests 98 Node tests pass.

| Matched local Fold7 A/B, 115s / 同机局部线路 | A old game | B geometry + HUD |
|---|---:|---:|
| Steady samples / 稳定区间样本量 | 4114 | 4552 |
| Callback median / 中位数 | 33.0 ms | 16.6 ms |
| Callback P95 / P95 | 49.8 ms | 49.8 ms |
| Maximum / 最大 | 99.5 ms | 116.0 ms |
| Intervals >50ms / 超过50ms | 137 (33.3/1000) | 132 (29.0/1000) |
| Intervals >100ms / 超过100ms | 0 | 1 |
| Callback cadence / 平均回调频率 | 36.03 Hz | 39.86 Hz |
| Actual native UI submissions / steps | 3458/4258 (81.2%) | 2477/4777 (51.9%) |
| Estimated submissions per second / 提交频率 | 29.39 | 20.84 |
| Outstanding upload credit p95 / 在途存储信用费P95（非上传字节） | 936 KB | 810 KB |
| Broad native draw EWMA median / 宽口径draw均值的中位数 | 19.52 ms | 16.55 ms |

Both routes reached the first objective and restored the device; no errors, 16/16 expected files each. The path naturally varied; start/end battery 32.1→33.2°C vs33.4→34.4°C, USB. B title6796→7206ms did not show a phone startup gain in this pair; the improvement in actual UI submissions is measured, cadence direction is encouraging, P95 unchanged and a longer event remains. Do not claim a uniform long-frame or GPU regression fix; source identity, screenshots and raw private recordings remain separate. / 实际提交比例明确下降，帧间隔P95未改善且仍有长帧，不宣称全部消除，也不从单次A/B推断纯引擎因果。任务全流程在上一轮两台设备完成，本轮高负载路线与操作回归不重复完整撤离。

### Separate engine candidate / 独立引擎候选对照

An isolated official vendor build of unmerged engine candidate `51c5e43e` (related [engine PR #560](https://github.com/cnedwin/Egret_rebuild/pull/560), clip reuse and other upstream changes) used the exact same final game HUD/geometry source. Node98/98 passed. The extra physical test ended in ordinary defeat in both editions, without runtime/HTTP failure. In the common early game-time 1→11.92 s interval, current A and candidate B had 432/404 callback intervals, p95 49.7/49.8 ms, max82.9/114.6 ms, >50 6/10, callback39.49/35.79Hz; sample counts and actual paths differ. This cannot establish a matched high-load gain or blame one change. The candidate is not adopted, and no unmerged engine code is published. / 独立测试候选包含相关引擎裁切复用改动与其他更新，不归因为单一变更。共同早期区间较短，实际流程正常阵亡，证据不足以证明改善；保持原已合并引擎副本。
### Verification / 复跑与边界

- `node --test test/*.test.mjs` (98/98), headless rules 3/3 with 357/358/357s. Root standard (FPS strict), showcase, canonical LF capability/duplication checks pass; only generated note ledger changes when a new engine note is recorded. / 全量规则和工程标准检查通过；未改其他游戏。
- Final hardware bare verifier and native PC controls checked separately; physical Fold7 A/B is not desktop emulation. Exact runtime pin, profile phases, outcomes and later public results are recorded in [the sanitized receipt](test/evidence/fps-performance-20261128.json). User-facing visuals and mechanics unchanged / 保留原画质和玩法。
- No real human input, external browser/controller, speaker listening, direct GPU timing or present FPS claim. Raw source-hash/trace records private; no personal device identifiers included. / 不将协议输入当真人，不对未测设备、听音、屏幕呈现或GPU执行作推断。

## Latest main, physical mission and startup regression / 最新主干、真机整局与启动验收

Engine / 引擎：`4f08d2bc` → `d2e28f46182a563fd594cc51847240429ab0a5b5` ([PR #555](https://github.com/cnedwin/Egret_rebuild/pull/555)), officially generated 15-entry vendor; 32 import mappings are unchanged. 引擎正式复制工具生成，无手改副本。Native input, art, rules, damage, collision, save format and audio are unchanged / 原生输入、美术、玩法、数值、碰撞、存档格式和音频不变。The only game-code optimization skips unnecessary scenery geometry clipping and allocation during startup, with exact-output tests / 游戏代码仅优化首屏场景网格裁切，精确输出回归保持原始顶点、索引、法线、UV、切线及材质。

| Physical device / 真机 | Complete mission / 整局 | Callback interval p50 / p95 / p99 / max | >50 ms |
|---|---|---|---:|
| Windows Edge 158, RTX 5090 Laptop, D3D11, WebGL2, 1440×900, medium, seed 7 | 359.03 s, 3/3 objectives, 6/6 calibration, A, won | 4.2 / 8.4 / 12.5 / 34.6 ms (60,561 intervals) | 0 |
| Galaxy Z Fold7, Android 17, Chrome 158, Adreno 830, WebGL2, 873×325 CSS, medium, seed 3 | 411.735 s, 3/3 objectives, 6/6 calibration, B, won | 33.1 / 49.8 / 66.4 / 364.7 ms (14,686 intervals) | 612 |

Both missions ran at normal time using actual browser keyboard/mouse or physical-device touch events, without overriding simulation state or rules. These full-route runs preceded the byte-equivalent scenery clipping optimization at the same engine pin; the optimized build was separately checked with startup and input smoke. Fold7's maximum interval crossed the transition into play; largest later interval was 132.5 ms, with six later intervals over 100 ms. USB battery temperature 32.7→35.4 °C during the complete Fold7 run. Callback intervals are not GPU execution or display FPS. / 两台真机以真实浏览器键鼠、触屏事件按正常时间完成整局，不写入模拟状态、不修改规则。整局在同一引擎版本且裁切优化前完成，裁切精确输出回归与优化后首屏及操作复测另行执行。手机最大间隔跨越进入游玩时点，随后最大132.5 ms、有6次超过100 ms；USB连接，整局电池温度32.7→35.4°C。回调间隔不等于GPU执行或屏幕呈现帧率。

- PC native acceptance: 33/33 desktop, 17/17 mobile-size emulation (not phone), actual fullscreen enter/exit, right-button gameplay input while the browser context menu is suppressed, independent button state, explicit raw/normal lock, loss→pause→resume, asset-error retry, no runtime/HTTP errors. / PC原生验收通过，全屏、右键、失锁和恢复均实际验证，手机尺寸模拟单独计。Final local native smoke: 11/11 (title, deploy, movement, aim, inventory, pause/resume, exact file hashes, renderer and errors). / 优化后本地关键流程11/11。
- Fold7 physical smoke: fresh-context cold title around 7.4 s (36/36 models), physical orientation changes in five states, joystick excursion, simultaneous contacts, cancellation, pause and resume; no errors, device restoration complete. An initial smoke and full-route attempt ended in ordinary defeat; revised automation clicked release-activated native controls as actual touches, not changing the game. / 实体折叠屏横竖屏、摇杆越界、多点、取消和暂停恢复通过。首轮测试自然阵亡，后改正测试脚本松手触发语义，未改游戏规则。System screenshot for the private browser context was blank; the visible CDP browser capture below is from actual phone Chrome, not a simulated desktop viewport. / 系统截图未显示私密浏览器内容，以下是实际手机 Chrome 的浏览器画面截图。
- Debrief evidence / 结算截图：[PC](test/evidence/engine-main-d2e28f46-pc-debrief.png) · [Fold7](test/evidence/engine-main-d2e28f46-fold7-debrief.png).

### Startup / 冷启动

RTX hardware bare `node vendor/egret.mjs verify` (ordinary route, no `--play`) passed all 8 checks, with 318 colors and observed `startupReady` at 9.545 s; the optimized run again passed all 8, readiness 7.652 s, 307 colors. No early black-image failure or blind inputs before readiness. The old fixed-delay false report remains documented in the previous record. / 新版通用验收器真实显卡两次8/8，确认真正非空标题后验收；优化后实测7.652秒，不在资源等待阶段误操作。软件光栅器历史运行能显示标题但帧回调低于门槛，不能称硬件帧率。

A targeted real Edge CPU profile repeated the 3.8 s main-thread task after 36 resources were marked loaded, before shader warmup. `createView`→`buildScenery`→`buildSections` was the main source. / 冷启动主线程任务在资源进度完成及着色预热之前，实际CPU追踪定位到场景裁切。

| Same-route CPU profile / 同路线采样 | Before / 前 | After / 后 |
|---|---:|---:|
| Ready title / 标题可用 | 8374.9 ms | 8030.6 ms |
| Long main task / 最大初始化长任务 | 3824 ms | 3288 ms |
| `buildSections` sampled inclusive / 裁切采样归属耗时 | 2775.2 ms | 2168.1 ms |
| `buildScenery` sampled inclusive / 场景组装 | 3196.5 ms | 2637.7 ms |
| `createView` sampled inclusive / 创建场景视图 | 3537.6 ms | 3028.4 ms |

Independent bare runs measured 3787→2987 ms for the corresponding startup task; conditions/cache can vary, so the profile-pair comparison is the scoped evidence, not a guaranteed speedup. The startup still has a multi-second synchronous task, but no work was deferred to deploying. The two title captures preserve the same scene and UI; weather/camera animation means they cannot be compared pixel-for-pixel. Exact geometry fingerprints cover synthetic boundaries and actual container/plant GLBs with unchanged index, attribute and material identity. / 独立裸验收另测到对应任务3787→2987毫秒，缓存在不同轮可能不同，应以同路线CPU采样为证；仍有同步启动长任务，未挪到部署之后。标题观感一致，天气与镜头动画不同不可逐像素比较；测试用几何哈希保证原始输出。

### Fold7 paired short route / 手机短路线对照

Same 873×325 CSS, DPR 2.625, medium WebGL2, seed 7, fresh contexts, USB, approximately 34.6°C; five seconds each. / 同一设备同画质、同一自然出生点各五秒，A旧引擎，B新引擎和裁切优化。

| Sample / 采样 | A `4f08d2bc` | B `d2e28f46` + crop optimization |
|---|---:|---:|
| Title usable wall / 标题就绪 | 7212 ms | 10414 ms |
| Title p95 / max | 16.7 / 16.7 ms | 33.2 / 49.8 ms |
| Play p95 / max | 49.8 / 82.9 ms | 66.4 / 99.5 ms |
| Play >50 ms | 8 | 12 |

Both passed, with equal 125 world draws and approximately 9.4058M triangles at spawn. Earlier new-pin runs showed title ~7.4 s and play p95 49.7/66.3 ms. This single pair plus preceding samples show a mobile performance limit and variability, not an isolated engine regression; optimization does not change steady-state geometry. Do not infer causation or promise steady 60 FPS. / 两轮都通过，世界绘制数与三角形量一致；前两轮新版标题约7.4秒。手机高负载有实际性能限制，不能只凭单次A/B归因引擎，仍需多轮单阶段追踪。

### Rerun and limits / 复跑与边界

- `node --test test/*.test.mjs` (including exact geometry fixtures); `node tools/headless.mjs` preserves deterministic rules tests. `node vendor/egret.mjs verify` uses the default software renderer unless an actual hardware browser is selected via the verification configuration. `FPS_HARDWARE=1` and installed Chromium for `node test/accept.mjs`. / 软件验收与显卡验收分开记录。
- 本次原91项Node测试升级前后全部通过，新增3项精确裁切回归后94/94；原规则无头完整模拟357/358/357秒三轮通过（不是真机）。仓库规范与展示站检查通过；能力矩阵、重复代码及引擎问题清单在规范LF生成输入上复查通过，能力矩阵与重复代码无FPS变化，仅引擎问题清单更新FPS#15（保留246条记录）。直接Windows CRLF检出会使旧清单解析误报，未改其他游戏行尾。 / All original 91 Node tests pass before and after the refresh; 94/94 including three geometry regressions. Three headless rule simulations finish in 357/358/357 seconds (not device runs). Standard and showcase checks pass. Capability, duplication and engine-notes generators pass on canonical LF inputs; only the generated engine-notes ledger changes for FPS#15, retaining all 246 records. Direct Windows CRLF checkouts cause false generator drift; other games are untouched.
- Evidence / 证据：[sanitized machine receipt](test/evidence/engine-main-d2e28f46-receipt.json).
- Full-device runs use trusted protocol inputs, not human finger/keyboard play; complete manual difficulty assessment, other browsers and devices, real controller, and listening tests remain unverified. No WebGPU performance conclusion from this WebGL2 run. / 真机为协议输入，不等于真人操作；未覆盖其他设备、浏览器、真实手柄、人工听音及WebGPU性能。No private serial, unrelated app data, or browser storage published. / 未发布设备序号、其他应用或浏览器内容。

## Formal native input and attached World3D verification / 正式原生输入与 World3D 接入验收

Engine / 引擎: `33897768` → `4f08d2bcd25de3aafa7295f3b349970f8003ed71`. Real Windows Edge WebGL2 hardware / 实体 Windows PC：ANGLE (NVIDIA, NVIDIA GeForce RTX 5090 Laptop GPU (0x00002C58) Direct3D11 vs_5_0 ps_5_0, D3D11). Actual / 真机 Fold7：SM-F966U1, Android 17, Chrome/158.0.8127.44, ANGLE (Qualcomm, Adreno (TM) 830, OpenGL ES 3.2), 873×325 CSS @ 2.625 DPR. Seed 7, medium, zh. PC conditions match / PC 条件一致：true; handset conditions match / 手机条件一致：true.

Five-second callback cadence / 5 秒回调采样（P95 / max; >50 ms interval count; 2D submit / steps；均非 GPU 执行耗时或屏幕呈现 FPS）:

| Device / 设备 | State / 状态 | Before / 改造前 | After / 改造后 |
|---|---|---|---|
| PC 1280×800 | title / 标题 | 4.3 / 4.7 ms; >50: 0; 0/1202 | 4.3 / 4.5 ms; >50: 0; 0/1203 |
| PC 1280×800 | play / 游玩 | 4.3 / 4.8 ms; >50: 0; 743/1204 | 4.3 / 8.5 ms; >50: 0; 823/1170 |
| PC 873×325 emulation / 手机尺寸模拟 | title / 标题 | 4.3 / 4.8 ms; >50: 0; 0/1203 | 4.3 / 16.7 ms; >50: 0; 0/1199 |
| PC 873×325 emulation / 手机尺寸模拟 | play / 游玩 | 8.3 / 12.5 ms; >50: 0; 866/1107 | 8.4 / 12.6 ms; >50: 0; 716/821 |
| Fold7 physical / 真机 | title / 标题 | 16.7 / 16.7 ms; >50: 0; 0/304 | 16.7 / 16.7 ms; >50: 0; 0/306 |
| Fold7 physical / 真机 | play / 游玩 | 33.2 / 49.8 ms; >50: 0; 191/218 | 33.3 / 66.3 ms; >50: 4; 184/208 |

- PC named acceptance / PC 具名操作：33/33 desktop、17/17 mobile-size geometry; 9 actual file identities each; runtime/HTTP errors 0. Exact renderer/scene/camera/canvas retained; native lock locked, raw one explicit request → locked, ordinary resume locked. Native mouse masks 2 → 3 → 2 → 0 (trusted event receipt), independent edges. Tab and modal navigation, pause and native asset refusal: UI-only then retry, 36 models restored.
- Fold7 physical / 手机真机：11 file hashes, 36 loaded models, 5 states × 2 physical orientation transitions; joystick boundary and 2 simultaneous contacts, cancellation 0 contacts, no page scroll; all restoration receipts true. Battery 29.7→30.8 °C, USB. Actual injected touch / 真机协议触控，而非真人操作。

Native screen verifier / 原生屏幕检查 (90→90 checkpoints, all 9 profiles): errors 0→0; warnings 0→0; engine warnings 0→0. Fresh receipts / 全部新鲜回执。Play checkpoint's native control counts / 对局原生控件数量：

| Profile / 机型 | Before / 前 | After / 后 | Errors / 警告数(错误/警告) |
|---|---:|---:|---:|
| phone-small (375×667) | 0 | 11 | 0/0 |
| phone-notch (393×852) | 0 | 11 | 0/0 |
| phone-notch-wide (852×393) | 0 | 11 | 0/0 |
| phone-tall (360×800) | 0 | 11 | 0/0 |
| tablet (768×1024) | 0 | 11 | 0/0 |
| tablet-wide (1024×768) | 0 | 11 | 0/0 |
| foldable-cover-wide (873×325) | 0 | 11 | 0/0 |
| foldable (884×1104) | 0 | 11 | 0/0 |
| desktop (1920×1080) | 0 | 0 | 0/0 |


### Rerun / 复跑

- `node --test test/*.test.mjs`
- `node test/accept.mjs` (software title/menu smoke / 软件标题与菜单检查).
- Set `FPS_HARDWARE=1` and `CHROMIUM_PATH` to installed Chromium; run `node test/accept.mjs` (actual PC and geometry-emulated screens / 实体 PC 与手机尺寸模拟).
- `node vendor/egret.mjs verify --screens --play test/screen-route.mjs --playwright test/screen-browser.mjs` (hardware opt-in; actual reviewed screen checkpoints / 实际多机型截图检查).

Limits / 未覆盖：the observed route is not a whole real-device mission; handset cadence is not GPU execution/presented FPS; no human finger or hand-controller test, Safari/Firefox or audio-perception claim. 真机采样是有界初段路线，不是整章通关；手机温度与 GPU 缓存不作全局控制，不把桌面模拟当真机。No private serials, target IDs, browser storage or unrelated phone data are included.

- 本轮 Node 测试 91/91，规则模拟三次完整到撤离（357、358、357 s），不是人工/真机整局。保留原始玩法、资产与画质。 · 91/91 Node tests; 3 complete deterministic rule simulations, 357/358/357 seconds, not whole real-device missions. Original rules, art and renderer settings remain unchanged.
- RTX 5090 Laptop 的正式 WebGPU 初段检查：实际 NVIDIA Blackwell adapter，未回退；标题、原生菜单及初段移动通过，九个源文件核验、零运行异常。 · Actual hardware WebGPU initial title/menu/movement passed on NVIDIA Blackwell with no renderer fallback, nine file identities and zero errors; no whole WebGPU mission or handset WebGPU.
- Fold7 同条件短样本存在波动。未合并候选的两次初段 P95 49.7/66.3 ms，最长 66.3/82.9 ms；稍后同版旧引擎 A2 复跑 P95 66.4 ms、最长 83.0 ms，候选 B3 P95 67.6 ms、最长 82.9 ms。两者每帧 World3D 绘制 125，平滑规则/视图/CPU 提交中位数 A2 0.309/1.307/21.357 ms，B3 0.360/1.495/22.670 ms；非 GPU 执行时间。不能把短采样波动归因于新接口，保留正式版偶发长帧记录，不因假设降画质。 · Short handset callback samples vary, including on the older engine. The later instrumented A2/B3 old/candidate repeat recorded P95 66.4/67.6 ms and maximum 83.0/82.9 ms, 125 world draws each and smoothed rules/view/CPU-submit medians 0.309/1.307/21.357 versus 0.360/1.495/22.670 ms. These are diagnostic runs, not causal proof or GPU execution timings. Retain the final long-frame observations, no speculative quality downgrade.
- 正式 SwiftShader 软件兼容：3/3，通过标题、设置、说明；标题基线差异 4.05%，未更新原基线，零运行/HTTP 错误。 · Formal SwiftShader smoke 3/3, title/settings/help, title baseline difference 4.05%, original baseline retained, zero runtime/HTTP errors.
- 通用 verify 默认 2.5 秒探针历史同样失败：旧/正式版均为 1 色、1 idle frame；正式硬件脚本路线 title-ready/moving/pause 3 个检查点、声音和输入均通过，无运行/外部请求错误。保留 overall pass=false，不把子项通过冒充通用探针通过。见第 15 条引擎笔记及 [formal-verify-probe.json](test/evidence/formal-verify-probe.json)。 · Bare generic probe fails before assets are ready in both old and formal builds; the readiness-aware route passes all three scripted checkpoints, input and sound, with no errors/external requests. Preserve overall false and distinguish played.pass=true (ENGINE-NOTES 15).
- 可核对的精简正式验收记录：[formal-api-receipt.json](test/evidence/formal-api-receipt.json)。 · Sanitized formal device and screen receipt: [formal-api-receipt.json](test/evidence/formal-api-receipt.json).

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。下方为历史 2026-11-28 原生 UI 迁移的实测，后附历史检查表；历史结果不代表本次版本。引擎固定于 `33897768c4f7933d289f083e4f34b3209b0aef31`，旧副本 `b5628eb`，更新旧界面的独立提交 `44cffe9e`。

Historical initial native UI measurements precede the earlier checklist. Engine revision `33897768c4f7933d289f083e4f34b3209b0aef31`; engine-only migration commit `44cffe9e`. The historical table must not be interpreted as the current build's results.

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
