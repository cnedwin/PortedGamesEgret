# 界面迁移 · Native UI migration

《断流行动》将原来的页面控件、样式与界面画布改为新白鹭引擎的原生界面。游戏规则、地图、美术资源和关卡内容仍独立于界面。引擎副本从 `b5628eb9997b67cf6163a388f5aa06f321f3833a` 升到 `33897768c4f7933d289f083e4f34b3209b0aef31`，来源及入口见 [vendor/SOURCE.md](vendor/SOURCE.md)。

Operation Cutoff replaces its former page controls, CSS and interface canvases with Egret's native interface. Game rules, the map, art and mission content remain independent of the interface. The engine copy moves from `b5628eb9997b67cf6163a388f5aa06f321f3833a` to `33897768c4f7933d289f083e4f34b3209b0aef31`; see [vendor/SOURCE.md](vendor/SOURCE.md) for its provenance and entries.

## 架构 · Architecture

- [main.mjs](src/main.mjs) 保留独立的 World3D 场景、相机、画质配置及 WebGL2/WebGPU 后端。透明的 `play` 画布在 3D 画布上方，`createWorld3DView` 使用同一个 `play.engine`、scope 和时钟；不另起 World3D 循环。 · The existing World3D scene, camera, quality configuration and WebGL2/WebGPU backends remain. A transparent native `play` surface sits above the 3D canvas. The World3D view shares the Play engine, scope and clock: no second World3D loop.
- `fit: 'expand'`，横屏设计尺寸 960×540，竖屏 420×760；`uiScale: { min: 44/48, max: 1.25 }`。菜单部件按原生安全区及 portrait / tablet / tabletPortrait 变体布局，触控节点按引擎报告的屏幕框和缩放定位。转屏不用重新创建引擎。 · Expand fit, landscape design 960×540 and portrait 420×760, with an independent UI scale bounded to 44/48–1.25 CSS pixels per view unit. Menu variants and touch nodes follow the engine's safe-area geometry; orientation changes do not recreate the engine.
- `pixelRatio: 2` 单独提高 2D 字体和矢量绘制密度；3D 保持原画质选项和独立分辨率上限。原生 `renderMode: 'on-demand'` 在界面不变时保留上一帧，时钟、World3D 和输入仍运行。动态 HUD 更新时才需要更新界面；没有承诺所有游戏帧都可省掉 2D 绘制。 · The 2D layer uses an independent pixel ratio of 2 for sharper labels and vector art; 3D retains its own quality and resolution cap. Native on-demand rendering retains a static interface frame while the game clock, world and input continue; changing HUD content still legitimately redraws.
- `createUiSemantics`、`createBrowserSemantics` 和 `createUiTester` 提供一套真实的语义、精确控件框及按本地化名称查找。页面仅保留 3D 画布、原生 Play 画布、引擎启动前的纯文本提示和 noscript；语义层由引擎产生，不是第二套可见 DOM 界面。 · One native semantic tree, browser projection and named tester report the real control bounds. The page retains the 3D canvas, native Play canvas, a plain-text pre-engine startup fallback and noscript. The engine-generated semantic projection is not a second visual DOM interface.

## 原部件与迁移对应 · Former surfaces and their replacements

| 原界面 · Former surface | 原生做法 · Native replacement | 实现 · Implementation |
|---|---|---|
| 标题与行动介绍 · Title and briefing | `game.show` 数据描述、状态绑定及原生按钮；横屏以左侧行动概要呈现，右侧保留场景预览；竖屏为居中卡片。 · Declarative native view, bindings and actions; left dossier on wide screens leaves the scene visible. | [menus.mjs](src/ui/menus.mjs) |
| 暂停、失败、撤离结算 · Pause, failure, debrief | 原生视图及 `createUiScreenStack`，保存结果快照、按原有数值显示统计及带出物品、关闭最前层后回到父屏。 · Native views and screen stack, outcome snapshots and existing statistics/items, returning to the parent screen. | [menus.mjs](src/ui/menus.mjs) |
| 设置、操作说明 · Settings and controls help | 原生选项、画面 / 输入 / 通用三个设置分类、按设备分组的滚动操作说明及数值增减按钮，保留原范围和步长；新增鼠标模式、动效偏好。 · Native choices, three preference categories (Display, Input, General), scrolling device-specific help and steppers preserve the previous ranges and steps; mouse mode and motion preference are explicit settings. | [menus.mjs](src/ui/menus.mjs), [native-settings.mjs](src/native-settings.mjs) |
| 加载与资源失败 · Loading and failed resources | `play.loading` 等待真实模型与渲染器准备，失败弹出原生重试界面；Play 尚不可用时才显示页面纯文本。 · Native loading waits for actual art and renderer readiness; native Retry on failure; plain page text only when Play is unavailable. | [main.mjs](src/main.mjs), [menus.mjs](src/ui/menus.mjs) |
| 任务、计时、进度、状态、装备、无线电及反馈 · Objectives, timing, progress, status, equipment, radio and feedback | 数据描述的 HUD 卡片及绑定；从已有游戏状态提取只读显示值，并从事件更新有界的瞬时反馈。 · Declarative HUD cards and bindings, read-only presentation values from game state and bounded event feedback. | [hud.mjs](src/ui/hud.mjs), [hud-state.mjs](src/ui/hud-state.mjs) |
| 罗盘、小地图、世界标记及中央图形 · Compass, minimap, world markers and central graphics | 原生 Sprite / Graphics / Text；复用节点及小地图静态图形，原生遮罩；`projectToViewport3D` 与安全区用于标记布局。保留原有信息显示条件及大小地图语义，不另建页面 Canvas2D。 · Native graphics, text, mask and retained nodes; project with the engine and lay out within the safe area, keeping the existing visibility conditions. There is no separate Canvas2D minimap. | [hud.mjs](src/ui/hud.mjs), [hud-state.mjs](src/ui/hud-state.mjs) |
| 背包 · Backpack | 原生 12 格物品网格与武器 / 配件 / 补给三个标签页；PC 与触屏均使用具名原生装备控件。打开时游戏规则仍运行，关闭或点选由原生控件发出原有操作，浏览器指针生命周期由主程序接管。 · Native twelve-slot inventory grid and Weapons / Attachments / Supplies tabs, with named equipment controls for PC and touch. The game continues while the backpack is open; native actions invoke existing operations and delegate pointer restoration to the application. | [menus.mjs](src/ui/menus.mjs), [main.mjs](src/main.mjs) |
| 触屏控件、移动摇杆 · Touch controls and movement stick | `createActionControl` 原生触点归属、`play.touchStick` 浮动摇杆；具名控件及屏幕几何，取消、失焦、暂停时清理输入。 · Native action controls with contact ownership, floating Play stick, named controls and engine screen geometry; cancellation, focus loss and pause clean up input. | [touch.mjs](src/ui/touch.mjs), [input.mjs](src/input.mjs) |
| 浏览器菜单键、指针锁定与全屏状态 · Browser menu keys, pointer lock and fullscreen | 原生 Play 键盘 / pointer 及实际浏览器能力；在真实按钮激活内请求，全屏及锁定失败通过状态和显式重试处理。游戏面积内仍禁止浏览器右键菜单；不禁止右键输入。 · Native Play keyboard/pointer and actual browser capabilities; browser requests run within genuine button activation, with state and explicit retry on failure. Browser context menus remain suppressed only inside the game; right-button input is retained. | [input.mjs](src/input.mjs), [menus.mjs](src/ui/menus.mjs), [main.mjs](src/main.mjs) |
| 性能读数 · Performance readout | `createWorld3DStats` 与原生文字；即使不显示统计也可记录。提交时间是 CPU 侧测量，不是 GPU 完成或显示呈现的时间。 · Native timing and text; measurements remain available when hidden. Submission duration measures CPU-side work, not GPU completion or presentation. | [native-stats.mjs](src/native-stats.mjs), [main.mjs](src/main.mjs) |

设置仍使用浏览器原有键 `operation-cutoff`。旧的未封装 JSON 可正常读取，明确保存时由 `createSaveStore` 使用版本化格式写入；无须清除玩家旧设置。语言同时更新界面、语义名称及页面语言。动效偏好允许跟随系统、减少或正常表现，系统读取使用 `prefersReducedMotion` / `watchReducedMotion`。音频采用 `createBrowserAudio` 的主总线及限幅器，保留现有的自制音色、配乐图及混响处理，未在界面迁移中更换音乐。

Preferences retain the original browser key `operation-cutoff`. Legacy unwrapped JSON is accepted; an explicit save uses the versioned native `createSaveStore` format, without requiring a reset. Language changes update the interface, semantic names and page language. Motion can follow the system, be reduced or normal, using the engine's motion-preference helpers. The engine browser audio host owns the master bus and limiter, while the authored procedural score, sound graph and reverberation are retained; the migration does not replace the soundtrack.

## 选择与引擎能力缺口 · Choices and engine boundaries

1. **数据式 UI 的宿主。** 当前 `createWorld3DOverlay` 返回低层 `BrowserGame`，而声明式 `show`、屏幕绑定和 Play 原生语义属于 `PlayGame`。因此使用透明 Play 层，共享时钟及 scope，而不是在游戏内复制数据式视图绘制器。更直接的 World3D + Play data-view 入口会简化后续集成。

   **Data-view host.** The current World3D overlay returns a lower-level BrowserGame, whereas declarative `show`, bindings and Play semantics belong to PlayGame. A transparent Play surface with shared clock and scope provides those capabilities without reimplementing the data-view renderer. A direct World3D/Play data-view entry could simplify integration.
2. **声明式滑块。** 现有数据式部件没有 range/slider 类型。设置使用原生按钮增减，保留四项范围、步长和数值显示；不是自行绘制可拖动网页滑块。未来若数据式视图直接支持 range control，可统一原生拖动、按键、语义 slider、滚动裁切及焦点。

   **Declarative slider.** Data-view parts lack a range/slider kind. Native step buttons preserve all four ranges, increments and numeric readouts rather than adding a visible HTML slider. A first-class data-view range control could unify drag, key increments, slider semantics, scroll clipping and focus.
3. **浏览器生命周期。** Pointer Lock 与 Fullscreen 的真实启用、失败、释放，以及窗口失焦/后台转换仍涉及浏览器事件。请求不能推迟到屏幕栈的异步重建；单一输入拥有者、取消后的迟到响应和全屏退出需明确处理。保留这部分窄适配，不声称 CSS 或他处事件已经消失。

   **Browser lifecycle.** Pointer lock and fullscreen still involve native browser activation, asynchronous failure and release, window blur and page visibility. Requests cannot be deferred into a screen-stack rebuild; consent and lifecycle are handled in a narrow adapter. This is not a claim that every browser event or all CSS have disappeared.
4. **文本与布局。** 当前菜单将有限的长说明分为已设计好的单行文字区域，保留双语原句；没有追加另一套字体/段落渲染器。引擎负责部件规划、实际语义边界及滚动。测试时仍须目检长英文和中文，而不仅比较控件框。

   **Text and layout.** Finite authored explanations are divided into native text lines without a second font/paragraph renderer. The engine handles part planning, semantic bounds and scroll. Long English and Chinese still need visual inspection in addition to control geometry.
5. **设置分页与实际安全区。** 首轮九机型检查中，设置列表的滚动裁切正确地隐藏了部分行，但原生多机型验证仍报告被裁掉的控件的未裁切矩形。例如 852×393 的 FOV 控件被报告在 y=407（安全区底为 372 CSS px）；触屏模式隐藏鼠标倍率还在页面留下空行。界面改成三个真实分类：横屏两列、竖屏一列，按当前分类控制部件的真实可见性及输入。对原九种尺寸及安全边距，用原生 `planView` 复算中英文六个设置 / 背包页面，共检查 972 个可见控件，未发现越界或重叠；873×325 短横屏计划最小控件为 44×44 CSS px。该结果是引擎规划器复算，不代表浏览器或真机复测通过。背包同样改为真实标签页，使所有装备动作有可见的有效点击区，而不是在屏幕外排长列表。

   **Preference pages and real safe bounds.** The first nine-profile check found that scrolling clipped rows visually but the native screen verifier still reported their un-clipped authored rectangles. For example, on 852×393 the FOV controls were reported at y=407, below the safe bottom at 372 CSS px. Hiding the mouse multiplier for touch also left an empty row. The interface therefore uses three genuine categories, two columns wide and one column upright, with actual visibility and input following the selected page. Replanning the original nine profile sizes and insets in the engine, across both languages and the six preference/backpack pages, checked 972 visible controls with no unsafe or overlapping rectangles; the planned minimum on 873×325 was 44×44 CSS px. That is a native planner result, not a browser or real-device acceptance result. The backpack also uses real tabs, keeping equipment actions in visible hit areas instead of an offscreen list.

## 改造前同条件测量 · Matched pre-migration observations

2026-11-28 的实际 Windows/Edge RTX 5090 Laptop GPU（ANGLE D3D11）留底：seed 7、中等画质、中文、WebGL2。每项记录 1,200 个帧间隔。两组均是 PC 硬件；873×325 只为桌面浏览器尺寸和接触路径模拟，**不是手机真机性能**。旧 DOM 及单纯更新引擎后的旧 DOM 路线均通过。

The actual Windows/Edge RTX 5090 Laptop GPU (ANGLE D3D11) baseline on 2026-11-28 used seed 7, medium quality, Chinese and WebGL2, 1,200 frame-interval samples each. Both configurations ran on PC hardware; the 873×325 geometry is desktop browser emulation, **not a physical phone performance result**. The old DOM route passed both before and after the engine-only update.

| 状态 / Stage | 旧引擎 + DOM p95 / max · ms | 新引擎 + DOM p95 / max · ms |
|---|---:|---:|
| 1280×800 标题 · Title | 4.3 / 4.4 | 4.3 / 6.1 |
| 1280×800 游戏中 · Play | 4.3 / 4.4 | 4.3 / 4.3 |
| 873×325 标题 · Title, emulated | 4.3 / 4.5 | 4.3 / 4.6 |
| 873×325 游戏中 · Play, emulated | 4.3 / 4.9 | 4.3 / 4.4 |

两个版本、上述八个短样本均无超过 50 ms 的帧间隔。测量用于隔离仅更换引擎与后续界面改造的影响，不足以证明整关表现。更早的 2026-11-21 软件渲染验收 F1 只有 2 个样本、p95 7849.7 ms；T2 首屏三控件高 43 CSS px，I1 英文画布的辅助文本仍含中文。这些均是历史值，不是本轮原生界面的结果。

None of the eight short baseline samples exceeded 50 ms. This separates the engine-only update from the subsequent UI change, not a qualification of the full mission. An older software-rendered run on 2026-11-21 reported F1 p95 of 7849.7 ms from only two samples, three 43 CSS-pixel-high title controls at T2, and Chinese accessible canvas text at I1 in English mode. Those are historical observations, not new native-UI results.

## 复跑 · Reproduction

在仓库根目录按 README 的运行要求安装测试工具；以下从 FPS 目录执行。 · Install the repository test dependencies as described in README; run the following inside FPS:

```sh
node --test test/*.test.mjs
node test/accept.mjs
node vendor/egret.mjs verify --screens --play test/screen-route.mjs --out /path/to/new-screen-receipt
```

Windows 有硬件浏览器时，PowerShell 下选择实际 Edge/Chrome 的可执行文件，保留测量环境及截图；普通 `accept` 默认使用软件 Chromium。 · With an actual hardware browser on Windows, supply the Edge/Chrome executable in PowerShell and retain the report and screenshots; default `accept` uses software Chromium.

```powershell
$env:FPS_HARDWARE='1'
$env:CHROMIUM_PATH='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$env:FPS_ACCEPT_OUT='C:\path\to\new-acceptance-receipt'
node test/accept.mjs
```

- `test/native-menus.test.mjs` 使用正式引擎 `checkView`、`planView` 验证屏幕描述、有界控件尺寸及屏幕栈生命周期，并检查同步按钮回调和设置兼容。
- 浏览器路线以真正的 `createUiTester` 语义控件定位，再用真实浏览器输入操作；不会凭 DOM 选择器推测位置。 `screen-route.mjs` 检查标题、设置、操作说明、游戏、背包和暂停。
- 对比实际 RTX 和手机帧间隔、静态 2D 提交数量及真实屏幕布局；设备模拟与手机真机分开记录。资源失败、原生指针释放恢复、全屏、横竖屏、语义焦点、真实长流程及声音实听均需相应验收，不以 Node 计划验证替代。

- The native-menu test uses the official view checker and planner for descriptions, target geometry and actual screen-stack lifecycle, as well as synchronous callbacks and preference compatibility.
- Browser routes locate genuine native semantic controls through the UiTester, then operate them using browser input rather than guessing positions from DOM selectors. The screen route checks title, settings, help, live play, backpack and pause.
- Compare actual RTX and physical phone frame intervals, static 2D submissions and visual layouts separately. Simulated device geometry is not phone performance. Resource failure, pointer release/recovery, fullscreen, rotation, focus, a complete mission and listening require their own acceptance evidence; planning tests are not substitutes.

最终的全流程和设备验收结果以 [QUALITY.md](QUALITY.md)、[README.md](README.md) 和 [ENGINE-NOTES.md](ENGINE-NOTES.md) 中注明版本与环境的实测记录为准。本文只保留可复跑的原生迁移结构及已取得的改造前基线，不把待复测项目写成已通过。 · The versioned, environment-specific acceptance evidence and remaining engine issues belong in QUALITY, README and ENGINE-NOTES. This document records the reproducible architecture and actual pre-migration baseline, not unperformed acceptance.
