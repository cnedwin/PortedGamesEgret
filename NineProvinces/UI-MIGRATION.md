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
| 城池、军团、原生名牌与天下图全部详情 · City/army sheets, markers and remaining realm dialogs | 逐项迁移；中间版本保留尚未替换的界面 · subsequent native integration | 第三批 · Batch 3 |
| 布阵、战场指挥、演武、结算、回放 · Deployment, battle UI, trials, outcomes, replay | 按原状态和命令迁移 · retain state and actions | 第四批 · Batch 4 |

声明式范围控件的焦点/语义接缝见 [ENGINE-NOTES.md 第10条](ENGINE-NOTES.md)。对照画面与测试环境见 [QUALITY.md](QUALITY.md)。 / See engine note 10 for the declarative range/focus seam and QUALITY for screenshots and verification environments.

## 复跑 · Verification

```sh
node --test test/*.test.mjs
node test/accept.mjs
node vendor/egret.mjs verify
node vendor/egret.mjs verify --screens
```

完整迁移进度、已验收内容与未覆盖项以 README / QUALITY 的实际记录为准。 / Completed scope, verification and untested cases are listed in README and QUALITY.