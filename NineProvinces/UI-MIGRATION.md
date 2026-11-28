# 九州烽烟原生界面 · Native UI migration

本作是基于新白鹭引擎独立开发的即时制大战略游戏 Demo。界面迁移使用引擎主干 `7fb371acb8bab254cf1c49b9da0ac0eed0c06fb4`。游戏规则、数值、存档格式以及世界地图资源不因界面迁移而改变。

An independent real-time grand-strategy game demo made with the new Egret engine. This migration uses engine main at `7fb371acb8bab254cf1c49b9da0ac0eed0c06fb4`. It does not change simulation rules, balance, save schema or realm artwork.

## 会话与画布 · Session and canvases

- `play3dAttached` 接入已经配置好的 World3D 渲染器、镜头与场景；只由 Play 的一个 Engine 时钟推进。原质量档、光照、设备降分辨率及 Apple WebKit 的稳定背缓冲策略保留。
- The existing configured renderer, camera and scene attach to one Play clock. Quality presets, lighting, adaptive resolution and the Apple WebKit stable-backing policy remain.
- `fit: 'expand'`，横屏 960×540、竖屏 540×960；原生视图使用安全区与 `portrait/tablet/tabletPortrait`，不重建场景。UI 的 CSS 单位通过 `uiScale: {min:44/48,max:1}` 约束，48 个单位的主要操作至少 44 CSS px。原生 2D 使用 2 倍密度；3D 画质和背缓冲独立。
- Expanded fit, landscape 960×540 and portrait 540×960. Native views reflow on the safe area, retaining the realm and game state. A 48-unit primary target has at least 44 CSS pixels; UI density is two, independently of 3D resolution.
- `createUiScreenStack`、`createUiSemantics`、浏览器语义投影和按名称测试共用一个会话；文本编辑采用引擎的原生编辑器。图形内容和名单选择不依赖游戏自己的 DOM 控件。

## 分批对应 · Staged mapping

| 界面 · UI | 原生做法 · Native implementation | 状态 · Scope |
|---|---|---|
| 标题、开局、名册、自建势力 · Title, new campaign, roster, founding | `native-title.mjs`, `native-title-model.mjs`；数据视图、滚动、原生文本编辑和选择 | 第二批 · Batch 2 |
| 设置、存档、覆盖/进展确认 · Settings, saves, progress confirmation | `native-dialogs.mjs` / builders；模态栈、范围控件、原生文件交换 | 第二批 · Batch 2 |
| 顶栏、日期钱粮、五档速度、归城、势力图 · Realm header | `native-topbar.mjs`；保留绑定、选择器和同一状态 | 第二批 · Batch 2 |
| 小地图 · Minimap | `native-minimap.mjs`；原生纹理、Graphics 和拖动，地形底图离屏生成 | 第二批 · Batch 2 |
| 地图拾取、拖动和缩放 · Map input | `realm.mjs`；引擎指针手势及原有 3D 射线 | 第二批 · Batch 2 |
| 城池、军团、记录与首月提示 · City/army sheets, journal and coach | `native-realm-hud.mjs`, `native-campaign-coach.mjs`；原生保留式面板、标签页、滚动和具名操作，按顶栏、安全区及窗口形态布局 · retained panels, tabs, scrolling and named actions around the top bar and safe area | 第三批，已发布 · Batch 3, published |
| 天下图业务对话框 · Campaign dialogs | `native-dialogs.mjs`、`native-dialog-builders.mjs`、`native-campaign-builders.mjs`、`native-campaign-event-builders.mjs`；保留 18 类原有入口及业务回调，原生文本检索、画像、滚动、范围控件、模态栈与焦点；科技树及演义树保留关系线 · all 18 dialog entry types, original business callbacks, native search, portraits, scroll, ranges, modal stack/focus, and connected invention/tale graphs | 第三批，已发布 · Batch 3, published |
| 确认、通知与帮助 · Confirmations, notifications and hints | `game.confirm` 处理不可逆外交/解散/覆盖操作，`game.badges` 保存待办/治理通知计数，`game.hints` 和原生提示承载操作引导；不新增业务规则 · native confirmations, notification counts and contextual hints, retaining business rules | 第三批，已发布 · Batch 3, published |
| 城关津与军团名牌 · Campaign place/army plates | `native-map-markers.mjs`、`native-map-plates.mjs`；原生 `projectToViewport3D` 投影、Play 显示对象与 `createActionControl`、同一语义树、可见对象和头像有限复用；不新增渲染器或引擎时钟 · native projection, Play display and action controls, one semantics tree and bounded visible plate/portrait reuse | 第三批，已发布 · Batch 3, published |
| 战场布阵与指挥 · Deployment and battle commands | `native-battle-hud.mjs`、`native-battle-command.mjs`；原生具名部队列表、战场目标预览、暂停/继续及速度切换，保留原业务回调和战斗时钟；原生界面随安全区重排 · named native roster, existing preview/actions, state and clock, responsive layout | 第四批，本地候选 · Batch 4, local candidate |
| 战场名牌和漂浮反馈 · Battle markers and floating feedback | `native-battle-markers.mjs`；World3D 投影、原生显示对象及 `createActionControl`；可见名牌指向原始单位身份，具名列表接管键盘焦点，原事件反馈进入有限资源池 · native projection/action control, original unit IDs, roster focus, bounded original event feedback | 第四批，本地候选 · Batch 4, local candidate |
| 演武、战果、战报及回放 · Trials, results, reports and replay | `native-battle-sandbox-setup.mjs`、`native-sandbox-battle-view.mjs`、`native-battle-replay.mjs`；原生显示对象、棋盘静态纹理及 native range 时间轴，按原有记录读取，保留独立演武存档隔离 · native display/board texture and timeline, using original recorded snapshots, with sandbox storage isolation | 第四批，本地候选 · Batch 4, local candidate |

声明式范围控件的焦点/语义接缝见 [ENGINE-NOTES.md 第10条](ENGINE-NOTES.md)。对照画面与测试环境见 [QUALITY.md](QUALITY.md)。 / See engine note 10 for the declarative range/focus seam and QUALITY for screenshots and verification environments.

## 引擎能力链接 · Engine capability references

- [原生数据界面 · Native data views](https://github.com/cnedwin/Egret_rebuild/blob/7fb371acb8bab254cf1c49b9da0ac0eed0c06fb4/knowledge-base/en/docs/ui-views.md)：数据描述、原生布局/滚动、具名 `game.show` 及模态焦点。 / Declarative descriptions, layout, scrolling and named modal focus.
- [Play](https://github.com/cnedwin/Egret_rebuild/blob/7fb371acb8bab254cf1c49b9da0ac0eed0c06fb4/knowledge-base/en/docs/play.md) 与 [Play3D](https://github.com/cnedwin/Egret_rebuild/blob/7fb371acb8bab254cf1c49b9da0ac0eed0c06fb4/knowledge-base/en/docs/play3d.md)：单一宿主、原生 UI 与已有 World3D 组合；地图名牌仍通过正式 World3D 投影和 Play 原生操作控件组合，不构造第二个 Overlay/渲染器。 / Single host, native UI and the existing World3D renderer; interactive map plates compose public projection with native action controls, without a second overlay renderer.
- [第三批实际画面 · Batch-three captures](test/native-realm-evidence/)、[第四批实际画面 · Batch-four captures](test/native-battle-evidence/) 与 [品质验收 · Quality records](QUALITY.md)：软件/硬件与独立预览分项记录；多屏检查不等同手机真机，候选画面不等同公开新版。 / Software and hardware checks, including isolated previews, are reported separately; viewport profiles are not handset tests, and candidate captures are not public-release evidence.

第三批已通过 [PR #308](https://github.com/cnedwin/PortedGamesEgret/pull/308) 和 [Pages 46163054628](https://github.com/cnedwin/PortedGamesEgret/actions/runs/46163054628) 发布。第四批已替换业务游戏界面的旧 DOM 实现，网页宿主、原生浏览器语义投影和离屏原画纹理仍是必要边界，而非独立游戏界面。 / Batch three has shipped. Batch four replaces the remaining gameplay DOM UI; web hosting, native accessibility projection and offscreen artwork preparation are intentional presentation boundaries, not another gameplay UI.

## 复跑 · Verification

```sh
node --test test/*.test.mjs
node test/accept.mjs
node vendor/egret.mjs verify
node vendor/egret.mjs verify --screens
```

完整迁移进度、已验收内容与未覆盖项以 README / QUALITY 的实际记录为准。 / Completed scope, verification and untested cases are listed in README and QUALITY.
