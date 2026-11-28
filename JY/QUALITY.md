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

- 日期 · Date: 2026-11-20
- 浏览器 · Browser: 无头 Chromium 153.0.8010.12，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Linux 容器 · a Linux container, linux x64, Node v22.23.4
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 5 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 不达标 · fail | overscroll free, touch-action auto, double-tap zoom on |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 达标 · pass | p95 16.7 ms over 242 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 不达标 · fail | 37.9 s to the first playable screen, 37.5 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 不达标 · fail | no way to choose English found |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "讀取存檔" (outline) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 5 named controls, e.g. button "繼續遊戲", button "開始新遊戲", button "讀取存檔" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 不适用 · n/a | the game keeps nothing in browser storage |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 不适用 · n/a | the game keeps nothing in browser storage |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 达标 · pass | 1 files refused; no uncaught error; offers to try again |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: T3, L1, I1。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.

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
