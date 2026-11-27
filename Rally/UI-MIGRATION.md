# 原生 UI 迁移 · Native UI migration

## 范围与引擎 · Scope and engine

本次把原有页面 DOM / CSS 界面迁到白鹭原生 2D 叠加层。引擎副本由官方工具生成，版本从 `b5628eb9997b67cf6163a388f5aa06f321f3833a` 升级为 `8ef4cf3a2cf507c58665de9f9b43c63b379121c2`；独立提交 `2c06e203` 的旧界面通过 34 项规则、模型及输入测试、完整无页面赛车和 `vendor/egret.mjs verify`，用于把引擎升级与界面迁移的影响分开。

The former DOM/CSS interface is migrated to Egret's native 2D overlay. The official vendor tool produced the engine copy at `8ef4cf3a2cf507c58665de9f9b43c63b379121c2`, replacing `b5628eb9997b67cf6163a388f5aa06f321f3833a`. The separate engine-only commit `2c06e203` passed all 34 existing tests, a complete headless rules race, and the engine browser verifier, isolating the effects of the upgrade from the UI work.

赛道、模型、道具、对手、模拟步进、赛制、音频与设置的 JSON 存档键均保持原样。页面仅提供全屏 3D 画布、由引擎创建的 UI 画布与语义投影、启动失败文本；不再有游戏菜单 DOM、第二套布局 CSS 或独立的小地图画布。

Track, models, items, rivals, simulation time steps, race rules, audio and the JSON settings key remain unchanged. The page hosts the full-screen 3D canvas, engine-created UI canvas and accessibility projection, and plain startup-failure text; it has no gameplay menu DOM, separate layout CSS or standalone minimap canvas.

## 界面映射 · Interface mapping

| 原界面 · Former interface | 原生实现 · Native implementation | 文件 · Source |
|---|---|---|
| 标题、开始、声音、画质、语言 · Title, start, sound, quality, language | `createUiRoot` 管理页面；原生操作、开关与焦点 · Managed screen, native actions, toggles and focus | [menus](src/ui/menus.mjs), [kit](src/ui/kit.mjs) |
| 八位车手、属性、级别、圈数 · Eight racers, stats, class & laps | 原生图形、文字和离散选择组 · Native geometry, text and discrete selection groups | [menus](src/ui/menus.mjs) |
| 选车 3D 预览 · Kart preview | 画布始终全屏，镜头根据叠加层留空区域取景 · Full-screen scene with camera framing the reserved overlay rectangle | [menus](src/ui/menus.mjs), [view](src/view.mjs) |
| 名次、圈数、时间、速度、铜钱 · Place, lap, time, speed, coins | 固定字形纹理、保留节点；只改变文字网格 · Fixed glyph page and retained nodes; update text geometry | [race HUD](src/ui/race-hud.mjs), [glyphs](src/ui/race-font.mjs) |
| 道具、三段漂移、受击与墨汁 · Item, three drift tiers, hit & ink | 保留图形、字形与状态改变 · Retained geometry, glyphs and state updates | [race HUD](src/ui/race-hud.mjs) |
| 小地图 · Minimap | 赛道轮廓绘制一次，八个车标只更新位置 · Draw track once; only move eight kart marks | [map](src/ui/race-map.mjs) |
| 倒计时、横幅、飘字 · Countdown, banner, popups | 保留的原生节点及固定池 · Retained native nodes and bounded pool | [race HUD](src/ui/race-hud.mjs) |
| 左右、漂移、道具、刹车、暂停 · Steering, drift, item, brake, pause | `createActionControl` 接管每个按钮的独立触点；手指离开区域仍保持归属，取消时释放 · Each button owns an independent engine contact; cancels release holds | [touch](src/ui/race-touch.mjs), [input](src/input.mjs) |
| 暂停、继续、重开、退出、结算 · Pause, resume, restart, quit, results | 原生页面栈与模态层、具名控件 · Native screen stack, modal layers and named controls | [menus](src/ui/menus.mjs) |
| 模型读取失败 · Model loading failure | 原生失败页可重试，或使用原有程序模型继续 · Native retry or continue using the existing procedural fallback | [main](src/main.mjs), [menus](src/ui/menus.mjs) |
| 读屏、键盘、手柄 · Accessibility, keyboard, gamepad | 原生语义树和真实节点矩形、焦点及按键，手柄保留驾驶曲线 · Native semantics, node bounds and focus, original gamepad driving curve | [host](src/ui/host.mjs), [kit](src/ui/kit.mjs), [input](src/input.mjs) |

## 屏幕与绘制 · Screens and rendering

`createWorld3DOverlay` 使用 `fit: 'expand'`，横屏逻辑尺寸 960×540，竖屏为 420×760；布局读引擎屏幕和安全区。原生 `uiScale` 的最小有效目标为 44÷48，最大 1.25，避免桌面界面过大。横竖屏改变时只重新布局，不重建 3D 场景、比赛或叠加层。比赛界面的空白区通过原生透传，模态遮罩则阻止底层交互。

The overlay uses `fit: 'expand'` with landscape 960×540 and portrait 420×760. Layout uses engine screen and safe bounds; native `uiScale` targets a minimum effective 44/48 scale and caps the maximum at 1.25. Orientation or window changes reflow the same overlay, race and scene. Empty non-modal race UI regions pass through; modal backdrops intentionally block underlying interaction.

赛车界面固定字形集覆盖实际比赛用到的中英文字符、数字、道具图标，实测图集为167个字形、1024×1056、单页；生成的是纹理源而不是另一个可交互画布。数字改变不光栅化整段文字。菜单文字使用引擎图集；静止界面采用按需绘制，WebGL2 的叠加层选择 single-page 批处理，比赛中的变化按状态更新原生节点。实际触控区、渲染提交和帧时间以 [QUALITY.md](QUALITY.md) 中的测量结果为准。

A bounded glyph page covers both languages' racing characters, numbers and item icons. The observed atlas is one 1024×1056 page of 167 glyphs. It is a texture source, not an independent interactive canvas. Counter changes do not rasterize complete strings. Menus use engine atlas text; static UI uses on-demand rendering with single-page WebGL2 batching and racing updates retained nodes. See [QUALITY.md](QUALITY.md) for measured physical control sizes, rendering submissions and frame time.

## 复跑 · Reproduction

从本目录运行 · Run in this directory:

```sh
node --test test/*.test.mjs
node tools/headless.mjs 1 3 7
node vendor/egret.mjs verify
node test/accept.mjs
node vendor/egret.mjs verify --screens --play test/screen-route.mjs --out ui-screen-report
node test/engine-gaps.mjs
```

从仓库根目录运行 · Run from the repository root:

```sh
node tools/quality.mjs Rally
node tools/check-standard.mjs
node tools/capability-matrix.mjs --check
node tools/duplication.mjs --check
npm run check:showcase
```

浏览器及设备覆盖、未运行项目，以及界面截图、引擎缺口与性能证据分别见 [QUALITY.md](QUALITY.md) 和 [ENGINE-NOTES.md](ENGINE-NOTES.md)。

Browser/device coverage, untested items, screenshot evidence, engine gaps and performance evidence are identified in [QUALITY.md](QUALITY.md) and [ENGINE-NOTES.md](ENGINE-NOTES.md).

多屏验收使用相同的实际赛道驾驶路线，只发送正常键盘或指针输入；不会设置车辆位置、道具或完赛状态。完整版软件渲染耗时较长；可以显式通过环境变量 `RALLY_HARDWARE=1` 与 `CHROMIUM_PATH` 让浏览器验收在本机 GPU 上运行（模拟屏幕尺寸不属于手机真机验收）。`verify --screens` 也支持 `--playwright` 选择已安装的浏览器适配器；实际所用渲染器在报告中记录。

The multi-screen route drives the actual circuit using ordinary keyboard or pointer input, without setting the car position, item or finish state. Software rendering of the full track is slow; explicitly set `RALLY_HARDWARE=1` and `CHROMIUM_PATH` for an installed hardware-accelerated browser in the acceptance script (emulated viewport sizes are not physical devices). The screen verifier also accepts `--playwright` for an installed-browser adapter, with the measured renderer identified in the report.

Windows 硬件浏览器验收复跑例（有 Playwright 开发依赖、已安装 Edge）：

Example for a hardware-accelerated Windows browser (with the repository's Playwright dependency and installed Edge):

```powershell
$env:RALLY_HARDWARE = '1'
$env:CHROMIUM_PATH = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
node test/accept.mjs
node vendor/egret.mjs verify --screens --play test/screen-route.mjs --playwright test/hardware-playwright.mjs --out ui-screen-report-hardware
```

真机、八屏回执及逐项截图见 [QUALITY.md](QUALITY.md) 与 [test/evidence](test/evidence/)。`test/hardware-playwright.mjs` 只影响验收浏览器的渲染后端，不修改引擎、不启用任何游戏调试捷径。

The device evidence, per-profile receipts and screenshots are linked from QUALITY.md. The optional test adapter changes only the acceptance browser's rendering backend; it does not modify the engine or enable game shortcuts.
