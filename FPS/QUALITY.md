# 品质验收 · Quality — Operation Cutoff · 断流行动

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
