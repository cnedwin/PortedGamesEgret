# 星旗战记 · 原生界面迁移 / Native interface migration

引擎副本 / Engine copy: `0e7b29321a07ec956f66efb293c79798270512bd`；引擎 #528 合并 / merge: `0e7b29321a07ec956f66efb293c79798270512bd`。原迁移基线 / Original migration: `938a8d206fb3395bbac47be832a374df7b37eed3`。战斗规则、数值、AI、地图、战役、存档、美术、音效和音乐不因界面迁移而改变。 / The UI migration does not change combat rules, balance, AI, maps, campaign, saves, art, music or effects.

## 架构 / Architecture

`src/ui/host.mjs` 调用 `createWorld3DOverlay`，以独立透明 2D 舞台叠加在原 3D 画布上。`fit: 'expand'` 的横屏设计尺寸为 800×420，竖屏为 380×680。`game.onScreenChange` 在原地更新布局和辅助功能映射，不重建舞台、输入或战斗；全部交互面板以 `game.screen.safe` 为边界。空白处由引擎的事件穿透交还棋盘。 / The interface host creates one transparent overlay above the 3D surface, expands the stage on orientation changes and updates its layout and accessibility mapping in place. Controls use the engine's safe area, and an empty overlay passes scene input through.

`src/ui/kit.mjs` 负责原生图形、图集文字、纹理和控件的绑定，业务代码仍决定可用选项与命令。使用 `createActionControl`、`createToggleControl`、`createSelectionGroup`、`createControlKeys`、`createHoverControl`。图像由引擎拥有的纹理租约绑定到 Bitmap；屏幕关闭时释放视图资源而不是销毁游戏。语义树来自实际节点矩形，而不是另一套布局。引擎在 `loadTexture` 内排队等待资源占用槽，游戏只负责去重和租约。 / The kit paints the native control state, uses atlas text and engine texture leases, and binds actual semantic geometry. The game still decides valid choices; closing a screen releases its view, not the game. Native `loadTexture` admits image work through its internal queue; the game retains resource reuse and leases.

原有设置是三档动画速度、四档画质和布尔开关，没有连续调节字段；速度和画质保留具名离散选择组，而不是增加重复滑杆。公共 kit 也提供与 `createRangeControl` 的绑定，未把未使用的滑杆计为已验收玩法功能。 / The existing options are discrete speed/quality choices and booleans, not continuous sliders; they remain named selection groups. The shared kit also binds `createRangeControl`, but does not count an unused slider as a verified gameplay feature.

## 界面对应表 / Interface mapping

| 原界面 / Previous interface | 引擎界面 / Native equivalent |
|---|---|
| 顶部回合、双方指挥官信息 / Turn and commander cards | `hud.mjs`：图集文字、头像纹理、矩形进度条、阵营颜色、状态语义 / atlas labels, portrait textures, progress graphics, team colour and status semantics |
| 左下地形、右下单位信息 / Terrain and unit cards | `hud.mjs`：紧凑卡片、安全区锚定、暴击与能力描述 / compact safe-area panels, critical/ability descriptions |
| 行动菜单、出兵类型 / Action menu and recruit list | `hud.mjs`：原生按钮、键盘焦点、禁用/不足提示、按空间分页 / native controls, keyboard focus, disabled/unaffordable hints, space-aware pagination |
| 战斗预测 / Combat forecast | `hud.mjs`：伤害、暴击、反击、目标数据，原规则生成 / the same rule-generated damage, critical, counter and target information |
| 回合横幅、角落工具、提示 / Turn banner, corner tools, hints | `hud.mjs`：绘制层、操作控件与非阻塞状态标识 / native paint, controls and nonblocking status |
| 头顶生命、飘字、单位菜单 / Health, floating damage, anchored menu | `play.mjs` 继续 `projectToViewport3D`，`host.project` 映射到叠加层；有界复用池 / existing projection, overlay mapping, bounded pools |
| 标题、战役、出阵准备 / Title, campaign, preparation | `screens.mjs`：`createUiRoot`、页面栈、纹理及缩略图、单选组 / managed roots, page stack, textures, thumbnails, selection groups |
| 设置、玩法、暂停、投降确认 / Settings, help, pause, surrender prompt | `screens.mjs`：原生模态层、开关/单选、最上层返回并恢复焦点 / native modal layers, switch/choice, topmost back and focus restoration |
| 战果、再战与继续 / Result, rematch, resume | `screens.mjs`：原生页面与现有存档函数 / native pages and unchanged save functions |
| 模型读取失败 / Model load failure | `screens.mjs`：模态提示及原有重试/继续回调 / modal notice and retry/continue callbacks |
| DOM 尺寸、焦点与按钮测试 / DOM layout, focus and button tests | `host.mjs` / `kit.mjs`：`createUiSemantics`、`createBrowserSemantics`、`createUiTester`，隐藏的读屏投影由引擎维护 / named native semantics and engine-owned accessibility projection |

## 尺寸与性能取舍 / Sizing and performance

独立叠加层使用 `uiScale:{min:44/48,max:1.35}`。引擎夹定实际 CSS 像素/逻辑单位的比例，48 个逻辑单位自然得到至少 44 CSS px，并限制桌面比例；额外空间通过 `fit:'expand'` 扩展可用舞台。语义、路由及安全区使用同一几何。原迁移的手动尺寸公式及测量历史仍在 QUALITY。 本版 `uiMetrics` 固定 `unit:1,tap:48`，不再在游戏中计算 UI 缩小与触控下限。 / The native overlay bounds its CSS pixels per stage unit; a 48-unit target spans at least 44 CSS px. The desktop cap limits panel prominence; `expand` exposes more stage area. Input, semantics and safe areas use the same geometry. Historical sizing/results remain in QUALITY. This version sets ordinary `unit:1,tap:48` in `uiMetrics`; no game-side scale or minimum-target formula remains.

投影标记位置只改节点坐标；相同文案不重复上传图集，不为每帧创建新的伤害标记。屏幕视图通过 `setTree(tree,{responsive:true})` 更新同一托管根的真实布局树，leaf `onAttach` 注册已发布的控件，保持屏幕、焦点和存档。原生 `renderMode:'on-demand'` 保留静止 UI 的提交；时钟、资源和动作继续，由实际变化触发重新绘制。 / Projected markers move existing nodes; unchanged text is not rerasterized. Managed screen roots accept opt-in responsive topology and register controls on attachment, preserving the screen, focus and save. Native on-demand mode retains unchanged submissions while time, resources and gameplay continue; changes redraw.

页面仅保留场景宿主、引擎叠加层、引擎管理的不可见辅助功能投影和启动失败的纯文本。系统减弱动态效果偏好由宿主的 CSS 变量传入游戏设置；页面没有负责界面布局的媒体查询。 / The page has the scene host, overlay, engine-owned invisible accessibility projection and a plain startup error. A host CSS variable preserves the operating system's reduced-motion preference; no DOM media query lays out the interface.

## 测试与引擎缺口 / Testing and engine gaps

命名控件验收用 `node test/accept.mjs`，规则用 `node --test test/*.test.mjs`。在本目录运行以下脚本，可通过引擎验证器重放并截图八种屏幕的八个真实画面，再用语义树检查几何。 / Use named acceptance and the Node suite, then run the vendor script below in the game directory for eight real states on eight profiles and independent native-control geometry.

```sh
node vendor/egret.mjs verify --screens --play test/screen-route.mjs --out /path/to/new/screens
node test/screen-report.mjs /path/to/new/screens
node test/touch-accept.mjs
node test/art-accept.mjs
node test/resource-accept.mjs
node test/native-ui-accept.mjs
```

性能专项 / Performance route: `node vendor/egret.mjs verify --screens=desktop,phone-small --play test/perf-route.mjs --out /path/to/new/perf`；单独运行每种档位，不与其他浏览器测试争用。 / Run profiles separately without competing browser tests.

英文专项 / English menu check: `node vendor/egret.mjs verify --screens=phone-small,phone-notch-wide,tablet --play test/screen-menus.mjs --out /path/to/new/menus`。如环境没有 Playwright 的默认 Chromium，可加 `--playwright` 指向已安装的适配模块 / Pass `--playwright` with an installed adapter if the default Chromium is unavailable.

原迁移的六项能力缺口和本次原生接口对应见 [ENGINE-NOTES.md](ENGINE-NOTES.md) 5–10；现在由 `verify --screens` 检查实际 hitArea，语义视觉外框仅为补充。性能分开测真实 GPU、软件渲染、冷启动及静/动态帧，见 [QUALITY.md](QUALITY.md)。 / ENGINE-NOTES 5–10 preserve the six prior gaps and native follow-up. The verifier checks native hit areas; semantic visual bounds are supplementary. QUALITY separates real GPU/software, startup and static/dynamic results.
