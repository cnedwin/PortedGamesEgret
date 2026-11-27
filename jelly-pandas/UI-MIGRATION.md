# 原生界面迁移 · Native UI migration

《果冻熊猫》的 3D 岛屿、角色、动作、战斗规则、掉落与升级数据、音乐和音效均保留。原先页面上的 HTML/CSS 菜单和战斗操作由一个贯穿整局的白鹭 World3D 叠加层接管；读取与保存玩家设置仍使用同一存档键和原有字段。验收环境、结果和前后对照见 [QUALITY.md](QUALITY.md)，引擎能力缺口见 [ENGINE-NOTES.md](ENGINE-NOTES.md)。

The 3D island, characters, movement, combat rules, drops, upgrade data and audio remain in place. One persistent Egret World3D overlay now owns the former HTML/CSS menus and play controls. The existing settings key and fields remain compatible. See [QUALITY.md](QUALITY.md) for measured comparisons and [ENGINE-NOTES.md](ENGINE-NOTES.md) for engine observations.

## 界面对照 · UI inventory

| 原界面 · Former UI | 现在的实现 · Native implementation | 文件 · Location |
| --- | --- | --- |
| 标题、标语、旋转角色预览 · Title, tagline, live character preview | 原生图形面板、共享文字图集；3D 场景直接为选角留出预览区域，不移动 3D canvas · Native graphics and atlas labels, with the 3D camera framing the preview rather than reparenting its canvas | [menus](src/ui/menus.mjs), [main](src/main.mjs) |
| 八只熊猫的头像、初始玩具、选中样式、全身图和打法说明 · Eight portraits, starting toys, selected state, full-body art and play styles | 原图集一份纹理租约，`Bitmap.sourceRect` 读取头像和全身区域；`createSelectionGroup` 管理选角 · One native texture lease and Bitmap crops; native selection group | [menus](src/ui/menus.mjs) |
| 单人或 +1/+2/+3 伙伴 · Solo or one to three companions | 原生选择组、焦点样式、单选语义；继续更新原设置与实时预览 · Native selection, focus and radio semantics, still updating settings and preview | [menus](src/ui/menus.mjs) |
| 开始游戏 · Play | 引擎按钮，同一游戏开始回调 · Engine action control invokes the same start callback | [menus](src/ui/menus.mjs), [main](src/main.mjs) |
| 中英文、开关声音、三档画质 · Language, sound, quality | 集中到设置面板，`createUiScreenStack` 管理关闭/返回，原设置回调不变 · One native settings panel, screen stack and the existing callbacks | [menus](src/ui/menus.mjs), [hud](src/hud.mjs), [save](src/save.mjs) |
| 操作指南 · Control guide | 原生帮助面板和按当前设备显示的文字，保留键鼠与触屏操作并补全手柄说明 · Native help, with keyboard/mouse, touch and gamepad instructions | [menus](src/ui/menus.mjs) |
| 经验条、等级、计时、糖果击杀数 · XP, level, timer, kills | 原生图形条、共享文字图集、`createBitmapText` 数字页；数值变化时才更新对应内容 · Native graphics, atlas labels and a shared bitmap-font page | [play-hud](src/ui/play-hud.mjs) |
| 首领条、出场提示、十秒预警 · Boss health, incoming message, ten-second warning | 原生进度条、状态播报语义与计时器颜色，原规则事件继续驱动 · Native progress, status and timer tint driven by the same rule events | [play-hud](src/ui/play-hud.mjs) |
| 受伤红晕、低血量脉动 · Hit flash and low-health pulse | 引擎原生径向渐变与透明度变化，保留受击和低血量提示 · Native radial gradient and alpha modulation | [play-hud](src/ui/play-hud.mjs) |
| 果冻三连、完成数量 · Jelly hat trick and completion count | 原生图形状态和标签，按三种动作命中状态更新 · Native graphics and labels bound to the existing trick flags | [play-hud](src/ui/play-hud.mjs) |
| 队友头像、生命/复活、耐力 · Party portraits, health/revive and stamina | 四个预置原生行，按队伍人数显示；头像取同一图集，状态条更新 · Four retained native rows using the shared atlas and bars | [play-hud](src/ui/play-hud.mjs) |
| 玩具、护符、进化和等级 · Toys, charms, evolution and levels | 原生图标格和数字字库，保留构筑上限并留出触控区 · Native item chips/bitmap counters, with space reserved for all build slots | [play-hud](src/ui/play-hud.mjs), [touch](src/ui/touch.mjs) |
| 伤害数字、倒地队友图标 · Floating damage and downed-friend markers | 原生 `createScreenMarkers3D` 投影，预分配的非交互标记元素仅承载浮字/图标 · Engine-projected, pooled noninteractive marker elements | [markers](src/ui/markers.mjs) |
| 移动摇杆、跳跃、下砸、翻滚、暂停 · Move stick, Jump, Slam, Roll, Pause | `createMovementControl`、`createActionControl`、引擎触点路由和原生图形命中区，多触点和取消均交给引擎控制；相机拖拽继续走 3D 画布 · Native movement/action controls and contact routing; empty areas route to the 3D camera | [touch](src/ui/touch.mjs), [input](src/input.mjs) |
| 升级三选一、初始搭配说明、重抽 · Three upgrades, starter/evolution guidance, reroll | 管理式原生卡片根、只允许一次提交的选择组、独立效果文字及状态播报；仍走原有选择/重抽规则 · Managed native cards, selection group, effect text and status announcement; same choose/reroll rules | [menus](src/ui/menus.mjs), [main](src/main.mjs) |
| 暂停、继续、重新开始、返回标题 · Pause, resume, restart, title | 原生面板/按钮及屏幕栈；回到战斗后点空白场景重新进入鼠标锁定 · Native panel and stack; clicking empty gameplay space re-enters pointer lock | [menus](src/ui/menus.mjs), [main](src/main.mjs) |
| 胜败结算、时间、等级、击杀、三连、构筑、再来一次 · Result, time, level, kills, tricks, build, replay | 原生结算根、文字和按钮；同时发布统计与构筑的语义文字 · Native result root and controls, with semantic statistics and build text | [menus](src/ui/menus.mjs) |
| 加载失败与重试 · Load failure and retry | 叠加层可用时使用原生错误面板和重载按钮。引擎本身未能创建时，仅显示页面错误提醒 · Native failure/reload when the overlay exists; a minimal page alert only when the engine could not start | [menus](src/ui/menus.mjs), [main](src/main.mjs), [index](index.html) |
| 性能计时开关 · Optional frame timing | 诊断文字使用原生图集标签；测量来源仍为游戏与渲染器计时 · Native atlas label for diagnostics, with the existing timing measurements | [main](src/main.mjs), [stats](src/stats.mjs) |

## 屏幕、输入与可访问性 · Screen, input and accessibility

- `createWorld3DOverlay` 使用横竖设计、`fit: 'expand'`、`uiScale` 和当前 `game.screen.safe`；`onScreenChange` 同步布局与语义投影。窄竖屏把选角面板留在画面下方，短横屏把头像与详情并列，平板和桌面保留宽敞的 3D 预览。 · The overlay follows engine screen plans and safe areas; portrait, short landscape and wider layouts are placed without rebuilding the 3D renderer.
- `createUiRoot` 管理菜单的行、列和叶子。改变屏幕形态或文字时先准备新的叶子，再提交布局；兼容叶子保留其绑定作用域，需要替换的叶子在提交后重新注册，保留玩家选择及可用焦点。 · Managed row/column/leaf preparation and commit retain compatible bindings and restore eligible focus when a leaf changes.
- `createUiScreenStack` 管理页面和设置/帮助模态层，后方页面的控件停用。引擎原生键盘目标与 `createControlKeys` 提供 Tab、Enter/Space；游戏保留数字键、重抽和暂停的快捷键，手柄菜单通过原生逻辑焦点与选择组操作。 · The native stack and control keys manage focus and activation; game shortcuts and controller navigation retain the same gameplay actions.
- `createUiSemantics` 和 `createBrowserSemantics` 以实际原生显示对象的边界发布控件名称、选中/禁用状态、进度、说明、标题及状态播报。升级效果作为卡片按钮的同级文字发布，同时更新持久化的 polite 状态节点；按钮的精确名称不受影响。`createUiTester` 使用同一语义动作，不另造 HTML 点击区域。 · Actual display bounds drive the semantic projection, including menu text, card effects and a persistent polite offer status; named UI tests take the same native activation path.

## 保留的页面层与能力边界 · Remaining page layers and limits

1. `createScreenMarkers3D` 的接口需要承载元素。伤害数字和救援标记使用预分配的非交互 spans；只消费引擎投影坐标，跟随安全区裁切，并避开 UI 所占区域。这不是另一套菜单或交互系统。 · The engine marker API currently projects supplied page elements; these are noninteractive presentation glyphs, not a replacement UI.
2. 当前 `createWorld3DOverlay` 没有公开 hover 选项，使用白鹭已有 `createBrowserHoverInput` 与 `createHoverControl`，传入实时引擎屏幕尺寸。 · Hover uses the engine's public browser adapter because the overlay factory does not expose its hover option.
3. 叠加层的普通 BrowserGame 文字标签是单行；菜单段落拆为原生图集标签，并按照文字实际度量限制显示尺寸。叠加层不能直接让原 CSS backdrop-filter 模糊独立的 3D 画布，因此改用原生半透明遮罩。 · BrowserGame's single-line labels are composed into bounded paragraphs; a native translucent shade replaces cross-canvas CSS blur.
4. 原摇杆以固定圆心而不是起手点为原点，使用原生移动控制的 `setDirection` 映射到该策略，触点归属、释放及取消依然由引擎控制。 · The fixed-centre stick maps to the native movement control using setDirection without replacing native contact ownership.
5. 真实操作系统的读屏软件、物理手柄和浏览器/GPU 覆盖范围不能由模拟窗口推断；请以 [QUALITY.md](QUALITY.md) 的具体证据和限制为准。 · Browser semantic projections, device-profile checks and physical hardware/accessibility qualification are distinct measurements.
