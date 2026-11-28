# 原生界面迁移 · Native UI migration

引擎：原生迁移自 `b5628eb9997b67cf6163a388f5aa06f321f3833a` 升至 `39560b3ef608e4dda68c8461f435c279d1eba3d2`；本轮先验证 #557 候选 `3748b332b5fafd2cb4530ca3df88ddd9d2939d46`，合并后使用正式 main `dfd8cc6205ed61f368f4c7408cee6473e042d973`。正式副本版本与入口见 [vendor/SOURCE.md](vendor/SOURCE.md)，只使用官方工具，无本地补丁。后续 #563 性能专项升至正式 main 8a88cf84e171bc753e0b9491aaf8216834f57ba9。 · The initial native migration moved from b5628eb to 39560b3. This follow-up first tested #557 candidate 3748b332, then vendors main dfd8cc62 after the merge. The exact copy and entries are in vendor/SOURCE.md. Official vendoring only; no local patch. The subsequent #563 performance follow-up vendors official main 8a88cf84e171bc753e0b9491aaf8216834f57ba9.

## 界面 · Screens

游戏共用一个 Play + World3D 时钟；3D 画布始终全屏。交互和文本是 egret display tree，不是 HTML。界面以暖宣纸、深墨绿、铜金边线和朱色统一，有宋体标题、无衬线正文、自制装饰章纹、立绘、可滚动名册和安全区布局。主次按钮色彩统一，按钮内的待办数字可直接进入对应事务；战斗专用 HUD 在矮横屏留出操作视野。 · The transparent Play view and World3D share a clock. The native tree uses warm paper, deep ink-green, brass borders, cinnabar, Song-style headings, sans-serif body text, portraits and an original decorative seal. Consistent primary/secondary controls and actionable pending counts guide navigation; the combat-only HUD leaves room on short landscape displays.

| 原功能 · Former screen | 原生实现 · Native replacement |
|---|---|
| 标题、三幕序章、门派选择、传承 · Title, prologue, founder and succession | `src/ui/native-pages.mjs`: images, selected tabs, scroll, confirmation |
| 山门 · Seat | `src/ui/native-pages.mjs`、`src/ui/native-shell.mjs`：原生指令、场景手势、建筑/空地点选、待办数跳转招贤 · Native command panel, scene gestures, building/ground and person picking, applicant shortcut |
| 弟子、武学 · Disciples and arts | 具名分页列表、待办筛选、`game.select` 与 `view.edit` · Named paged lists, pending filters, native selection and editor |
| 江湖 · Realm | World3D 点选和手势、原生据点详情、画卷备用；新档先观览，原有事务开放条件不改 · World3D picking and gestures, native map detail, painted fallback; browse-only before the original command unlock |
| 战阵 · Battle | 队伍条、战术指令、战报开关、集火和撤退；前期锁定导航显示原有条件 · Army bars, tactical commands, report toggle, focus and retreat; locked navigation explains unchanged progression |
| 纪事 · Chronicle | Scroll and paged annals, arts, wanderers and relics |
| 存档 · Saves | 原生槽卡、`pickBrowserTextFile` / `downloadBrowserTextFile`，保留旧校验字节 · Native slot cards and engine file actions; old checksummed bytes retained |
| 常驻栏、要务、提示 · HUD, objectives, feedback | `src/ui/native-shell.mjs`、`src/ui/native-notice.mjs`：`game.show`、badges、hints、可定位的 `game.toast`、确认 · named views, pending status, hints, positioned toast and confirmation |
| 音频 · Audio | `src/ui/audio-graph.mjs`：`createBrowserAudio` 与 `createInput` 四路混音；保留原声源调度 · One four-bus native mixer without changing authored source scheduling |
| 原有 33 种弹出单 · 33 original sheets | `src/ui/native-sheets.mjs`: guide, guard, goal, load, build, applicant, job, batch, wheel, master, move, settle, march, event, person, assign, moment, unlock, tourney, duel, season, herald, outcome, siege, gear, pills, meridian, create, offices, retreat, fight, diplomacy, teaching, settings, editor |
| 地名、建筑名、人物与伤害 · Scene labels/damage | `src/view/scene-markers.mjs` native World3D overlay projection, glyph font |
| 语言 · Languages | `src/ui/locale.mjs` and dictionaries, `createTextTable`, `pickLanguage`; Chinese rule data and save IDs unchanged |

原始源代码的弹出单键数以实际源码为准：33，不是规划估计数。主程序原约 2,100 行，现在把描述、公共组件、本地化和规则回调分离；删除页面游戏 CSS 和旧 HTML 界面生成器。 · The real source had 33 sheet keys. The main controller is split into data descriptions, shared controls, localization and rule callbacks. Legacy DOM/CSS authoring is removed from the live game.

正常标题和全部游戏界面均由原生数据视图绘制；当首屏美术或清单读取失败时，在原生载入层中显示可重试的错误视图。只有 WebGL2/Play 宿主已终止、无法再绘制时才恢复载入前的状态行和一个可操作的重载链接（见 [ENGINE-NOTES #8](ENGINE-NOTES.md)）。 · The normal title and game are native data views. Essential art failures use a native retry view; only a stopped host that cannot draw again exposes a reload link in the pre-existing bootstrap status line.

## 屏幕与性能 · Fit and performance

`fit:'expand'`、`portrait`、原生 `tablet/tabletPortrait`、`uiScale:{min:1,max:1.2}`；48 单位普通按钮目标至少 44 CSS 像素，2D 绘制按需，屏幕切换不重新创建引擎。段落使用正式 Canvas paragraph provider 而非 CanvasKit；显式配置 96 条目、96 并发准备任务及 64 MiB 图像预算，删除原编译器 14 段落的临时替代显示。仍采用分页和键控替换来保持清晰的阅读与焦点，且视口外富文本目前仍会提前准备。 · Native fit/orientation variants target at least 44 CSS pixels for ordinary 48-unit controls, use on-demand drawing and retain one engine across screen changes. The Canvas paragraph provider needs no Wasm. An explicit 96-entry/96-job/64 MiB image budget removes the former 14-paragraph compiler fallback. Pagination and keyed changes preserve readable lists and focus; offscreen rich rows still prepare eagerly.

地图场景的优化不改变绘制结果的计算边界：[`realm.mjs`](src/view/realm.mjs) 预先记录各河道及线段的切削边界，凡在 3 格影响范围内仍精确计算原点到线段的距离，范围外才跳过；一次生成地形顶点时预计算地理上最近两个据点及距离，刷新归属色仍以原门派归属判断。场景和地形使用同一顺序的生成器，`createRealmAsync` 将构造分到多个帧间批次，取消时不把不完整场景或标记交给渲染器。测试比较同步与分段地形的高度、顶点、法线、索引、颜色和归属数组，以及完整场景的节点与几何清单；不以这些自动化等价断言代替真机画质和帧时间测量。 · Realm changes preserve the calculation domain: precomputed river and segment cut bounds skip only points outside the three-grid-unit influence radius, while exact point-to-segment distances inside remain unchanged. The original nearest-two stronghold ordering and distances are computed once with the terrain lattice; recolouring still uses live ownership. The synchronous and frame-sliced builders share the same ordered generator, and cancelled work never attaches a partial scene or markers. Tests compare terrain heights, positions, normals, indices, colours and claim arrays, plus full scene inventories. These equivalence assertions do not stand in for device visuals or frame timing.

[`stage.mjs`](src/view/stage.mjs) 将着色程序预热和真实渲染区分开：新场景在 World3D 的帧诊断报告 `outcome:'rendered'` 前不标记为已呈现；`main.mjs` 按该状态开放场景输入和加载呈现。静态画卷只作明确的非 3D 备用，不冒充加载完成的 3D 首帧。正式引擎上的性能数据以 [QUALITY.md](QUALITY.md) 的版本与设备记录为准。 · Shader warmup is not treated as a presented scene. World3D frame diagnostics must report an actual rendered result before scene input and loading state are released. The painting remains an explicit non-3D fallback, not a substitute for a supposedly completed first 3D frame. Final performance is recorded against the official engine and devices in QUALITY.md.

## 能力接续 · Native API follow-up

| 原绕过 · Former workaround | 正式接法 · Engine API |
|---|---|
| 每页富文本额度及备用单行 · capped compiler fallback | `createParagraphCache` 扩大可配置额度；[`native-shell.mjs`](src/ui/native-shell.mjs)、[`native-kit.mjs`](src/ui/native-kit.mjs) · explicit bounded shared cache |
| 游戏侧外部声音与定位混音图 · game-owned external source mixing graph | `createBrowserAudio` / `createInput`，原生四总线、源音量、压低渐变、声像与低通；[`audio-graph.mjs`](src/ui/audio-graph.mjs) · four native buses and per-source controls |
| 自建选择模态与编辑生命周期 · assembled choice and editor lifecycle | `game.select` / `view.edit`；[`native-shell.mjs`](src/ui/native-shell.mjs) · native selection and named view editor |
| 游戏侧临时文件选择与下载 DOM · temporary game-side file controls | `pickBrowserTextFile` / `downloadBrowserTextFile`；[`main.mjs`](src/main.mjs) · explicit user-initiated browser file exchange |
| 场景通知的被动数据视图 · passive scene-notice view | `game.toast` 的 `placement`、对比色、前景、持久句柄；[`native-notice.mjs`](src/ui/native-notice.mjs) · positioned, contrasted foreground toast with a closable handle |

原来的本地文件封装 `magic:wulin-save` 与存档槽键保留；系统文件选择器、系统输入法由引擎正式浏览器 API 承接。配乐、录音、合成声音与位置声继续使用原始素材、时序及音量设计，共享 `music`、`effects`、`voice`、`ambience` 四路原生混音。设备系统动态语音不是 WebAudio 音源，通过原有开始/结束事件联动压低其他声音；弹窗反馈则刻意保留在原生单子内的状态行。 · Save bytes and slot keys stay compatible; the engine's browser APIs own file selection and system editing. Music, recordings, synthesized and positional sounds retain their authored assets, scheduling and levels on four native buses. Platform speech is not a WebAudio source and continues to duck other sounds through speech start/end events. Inline feedback deliberately remains in the native modal's reading order.

新局全部七项主导航可见，「山门 2」等朱色待办数字和按钮共享实际点击区；弟子待办直接进入待处理筛选。江湖可提前只读观览，战阵锁定时显示开派满一季或完成前五项要务的原条件。保留实际开放条件、战斗规则、数值及存档格式。 · All seven main routes are discoverable from day zero. A pending count shares the visible button's hit area, and the disciple count opens the relevant filter. The realm can be inspected before its commands unlock; the battle tab explains the original first-season or five-objective condition. Actual progression, combat rules, numbers and save format are unchanged.

## 复跑 · Repeat

```sh
cd Wulin
node --test test/*.test.mjs
node test/accept.mjs
node test/keyboard.mjs
node test/native-form-file.mjs
node vendor/egret.mjs verify
node vendor/egret.mjs verify --screens --play test/screen-verify.mjs --out <directory>
node tools/headless.mjs
node tools/balance.mjs
```

最终验收详情、物理设备、未覆盖条件与工具裁切报告修复前后对比见 [QUALITY.md](QUALITY.md) 与 [ENGINE-NOTES.md](ENGINE-NOTES.md)。旧验收与候选软件渲染结果分别记录，不将旧版真机或模拟尺寸当作本轮真机合格证明。 · See the quality record and engine notes for measured device results, unrun scenarios and the before/after screen-verifier findings. Earlier hardware checks and candidate software-rendered results are kept separate; neither old hardware nor simulated viewports certify a new physical device result.

[界面对照实拍 · Interface comparisons](docs/ui-migration-comparison.jpg) — 标题、山门及 Fold7 战斗指挥栏调整前后；非等种子的画质测量图。 · Title, seat and Fold7 combat HUD comparisons; not a seeded performance fixture.

江湖进入专项中，正式 `play({textWorkBudgetMs: 4, textWorkBudgetWhen})` 仅在无弹窗的3D江湖为新 Canvas 文字任务提供协作预算，自建富文本提供者使用同一 `game.browser.scheduleTextWork`。保留整个原生页面栈、可操作区域、焦点、字号和字形，不将整个页面推迟到下一帧。地图仍以实际3D首帧就绪撤掉准备提示；高画质可并行准备几何。详见 [性能实测 / Performance evidence](docs/realm-entry-performance.md)。 · A scoped 4ms Canvas preparation budget shares native label and paragraph work in the modal-free 3D realm; other screens keep immediate preparation; screen stack, hit areas, fonts and focus remain unchanged. Scene preparation remains tied to an accepted 3D frame.
