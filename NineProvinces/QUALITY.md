# 品质验收 · Quality — 九州烽烟 · Nine Provinces Ablaze

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
