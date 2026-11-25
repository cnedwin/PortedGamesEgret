# 品质验收 · Quality — 桃溪县令 · Magistrate of Peach Creek

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs PeachCreek` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs PeachCreek`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 95897d78 引擎适配验收 · Egret integration check

2026-11-26，候选版本使用白鹭主干 `95897d78`。原生按需渲染、垂直滚动、语义裁剪和 WebP 加载已接入。编译生成的副本与共用它的管理模板入口保持一致。

On 2026-11-26, the candidate used Egret main at `95897d78` for on-demand drawing, vertical scrolling, semantic clipping and WebP loading. The management template was synchronized with its shared engine copy.

- Windows 实机、有窗口的 Chrome 158.0.8127.37、RTX 5090 Laptop、游戏后端 WebGPU。旧公开页与本机候选均验证标题唤醒、设置、地图拖动、营建、保存和重新读档。英文长清单可以滚到底，开发者控制台无游戏错误。 · The previous public release and local candidate were tested on a Windows PC in headed Chrome 158.0.8127.37 on the RTX 5090 Laptop, running the game through WebGPU. The route covered idle title wake, settings, map drag, construction and save/reload. The long English list scrolled to its last entries without game errors.
- 同一路线分别取县城和营建面板各 5 秒前台浏览器帧间隔。旧版与候选四段的 P95 均为 4.3 ms，无超过 33 ms 的采样。营建最大间隔为 8.3 ms 与 12.5 ms。 · The 5-second foreground RAF intervals for town and Works had a P95 of 4.3 ms in both versions, with no interval over 33 ms. Works maxima were 8.3 ms and 12.5 ms.
- 无头 Edge 中 53 项浏览器检查通过。标题与旧基线差异 0.00%，设置差异 0.10%。模拟触屏验证了面板拖动、裁剪和偏移保持。实际阻断 WebP 后可从标题重试，解除阻断后装入封面。 · All 53 headless Edge checks passed. Compared to the existing baselines, title differed by 0.00% and Settings by 0.10%. Emulated touch covered dragging, clipping and offset retention. Blocking WebP left the retry available, and a real click restored it after unblocking.
- 桃溪 Node 测试 41 项，管理模板 Node 测试 4 项。管理模板的现有浏览器截图、键鼠、模拟触屏、建造和存读档均通过。 · All 41 game Node tests and 4 management-template Node tests passed, along with the template's existing browser screenshots, input, construction and save/reload.
- Fold7 已连接，Android 锁屏仍限制输入，本轮没有取得手机真机画面、帧时间或操作结果。 · The attached Fold7 remained behind an input-restricting lock screen. Phone hardware visuals, performance and operation were unavailable in this run.

## 51b6175d 原生 UI 迁移历史测量 · Prior native UI migration measurements

- 日期 · Date: 2026-11-25
- 浏览器 · Browser: Windows 上的无头 Edge 158.0.4370.33，Chromium 与 SwiftShader 软件渲染 · headless Edge 158.0.4370.33 on Windows with Chromium and SwiftShader
- 机器 · Machine: Windows x64，Node v24.22.3
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 不达标 · fail | 3 of 3 under 44×44: Take office 91×19; Settings 44×13; Switch to Chines 44×13 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 达标 · pass | idle title rAF p95 4.3 ms over 962 samples |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.5 s in the shared startup check, 3.0 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "桃溪县令" (focus drawn by the game) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 3 named controls, e.g. button "赴任", button "设置", button "切换到英文" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: peach-creek) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: peach-creek) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 达标 · pass | 3 files refused; no uncaught error; offers to try again |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: T2。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.

## UI 迁移对照 · UI migration comparison

引擎副本由 `91f350b1` 更新至 `51b6175d`。旧版留底来自主干 `f0379b7`。只刷新引擎、保留旧界面时，Node 41 项和浏览器 51 项均通过，两张既有截图差异均为 0.00%。迁移后，Node 41 项、浏览器 53 项均通过，标题和设置与各自的新基线差异均为 0.00%。

The engine copy moved from `91f350b1` to `51b6175d` after retaining the old UI reference at `f0379b7`. With only the engine refreshed, 41 Node tests and 51 browser checks passed, with 0.00% differences against both old screenshot baselines. After the rewrite, 41 Node tests and 53 browser checks passed. Title and Settings matched their reviewed new baselines at 0.00%.

按固定种子和时间分别拍摄新旧 128 张图。四种尺寸各跑中英文，覆盖标题、存档、设置、县城、五个标签页、空地、建筑、离开十小时后的收获、升格和晋升，另留升级前后和晋升后的画面。升格与晋升使用满足条件的县城数据作测试，实际点击并确认状态改变。检查到横屏紧凑顶栏和单子有重排，小字比旧版略软，地图镜头相同。

Each version has 128 fixed-seed, fixed-time screenshots in both languages at 1280×800, 390×844, 844×390 and 768×1024. Scenes cover title, slots, settings, county, five tabs, an empty plot, a building, ten hours away, rank-up and promotion, plus upgrade and post-promotion views. Rank and promotion use eligible county fixtures, with actual clicks and state assertions. The compact HUD and inspector reflow, and small text looks softer. Map framing matches between the captures.

最终版 128 组前后截图的地图镜头位置全部一致。按 RGB 任一通道差值大于 40 计，平均变化面积为 7.06%，最高为 844×390 中文升格单子的 17.79%。空闲时保留最后一帧后，标题、设置和存档槽的 24 张截图与停绘前逐字节一致。八种组合各从空闲标题打开设置和存档槽，16 次操作均提交了新画面。

All 128 old/final pairs match in camera framing. With a change threshold of 40 on any RGB channel, an average 7.06% of pixels changed, with a 17.79% maximum in the Chinese 844×390 rank-up sheet. All 24 title, settings and slot captures are byte-identical before and after idle drawing was suspended. Opening both dialogs from an idle title submitted a new frame on all 16 attempts across the eight configurations.


| 对照 · Comparison | 旧版 · Before | 移植后 · After |
|---|---:|---:|
| 静止标题浏览器帧间隔 P95 · Idle title browser RAF P95 | 12.6 ms（410 次） | 4.3 ms（962 次） |
| 限速首屏通用检查 · Shared throttled startup check | 1.5 s / 2.5 MB | 1.5 s / 3.0 MB |
| 竖屏标题按钮小于 44×44 CSS px · Portrait title targets below 44×44 CSS px | 3 / 3 | 3 / 3 |
| 封面失败后重试 · Retry after blocked cover | 不达标 · fail | 达标 · pass |

静止标题按需提交后，浏览器空闲帧间隔恢复。县城继续逐帧绘制。另一条软件渲染探针在营建单子打开时记录到整帧 P95 23.3 ms，语义发布 P95 0.3 ms。这是新界面上的独立采样，缺少同路线旧版性能对照。首屏项目沿用仓库脚本的画布就绪判断和等待时间。

The idle title holds its last submitted frame and wakes for visual changes. The county still draws every frame. In a separate software-renderer probe with Works open, frame P95 was 23.3 ms and semantic publish P95 was 0.3 ms. That route has no like-for-like legacy performance sample. The startup figure uses the shared harness's canvas-readiness check and settling interval.

| 界面相关物理行数 · UI-related physical lines | 旧版 · Before | 移植后 · After |
|---|---:|---:|
| `src/main.mjs` 的界面、视角、状态反馈和操作回调 · UI, camera, feedback and actions | 1,227 | 1,232 |
| `index.html` 的游戏宿主与界面标记 · Game shell and UI markup | 43 | 6 |
| `style.css` | 183 | 28 |
| 原生视图、对话框、单子模块 · Native view, dialog and inspector modules | 0 | 1,146 |

混合入口文件的统计包含地图操作、渲染交互和界面动作，排除导入、时钟推进、持久化实现、引擎初始化和测试接口。HTML 只计 `main` 内的宿主标记及起止行。新增模块的全部行计入。

The mixed entry point counts map interaction, visual feedback and UI actions, excluding imports, clock advancement, persistence internals, engine startup and test hooks. The HTML tally covers the game shell through its closing `main` tag. The three new modules are counted in full.

## 自动化与设备覆盖 · Automated and device coverage

- 浏览器中的真实键盘与鼠标事件和模拟触屏覆盖设置开关、滚动、县城地块、迁移旧码头、布防、三个存档、离线上线和坏档提示。 · Real browser keyboard and mouse events and emulated touch covered settings, scrolling, parcels, legacy dock relocation, defence, all three saves, offline progress and corrupt-save notices.
- 浏览器语义树和焦点通过自动检查。屏幕阅读器软件、手机真机、手机音频和性能未验证。 · Browser semantic roles and focus were checked automatically. Actual screen-reader software, phone hardware, audio and performance were outside the run.
- `node tools/check-standard.mjs PeachCreek --strict`、全仓默认标准检查和 `npm run check:showcase` 通过。管理模板预览共用这个引擎副本，提交号与导入映射一并同步。 · The scoped and repository-wide standard checks and the showcase check passed. The management template shares this engine copy and its provenance and import map were updated together.
