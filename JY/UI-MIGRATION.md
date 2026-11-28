# 原生界面迁移 · Native UI migration

引擎 · Engine: `212972678e633b1f3667f345d0646b0fba907ee1`，由正式工具生成。游戏逻辑、既有素材与数据格式保持原样。 · Generated using the engine delivery tool. Game rules, existing artwork and source formats remain intact.

| 原界面 · Previous layer | 原生实现 · Native layer |
|---|---|
| 首屏载入与导入 · Bootstrap and import | `browser/import-ui.mjs`, native Play state and `preparation-controller.mjs`. Existing archive validation, worker and IndexedDB; minimal hidden file chooser. |
| 标题、帮助、设置 · Title, guide, settings | `web/jyx2/ui/native/front-end.mjs`, `screens.mjs`, `theme.mjs`, `words.mjs`. Data views, screen stack, safe layout, semantics. |
| 存档槽位 · Save slots | Native named menu, explicit confirmation and incompatible-data recovery in `web/save-slot.mjs`. Recovery preserves the unread record as a separate backup in the same transaction. |
| 地图、剧情、战斗 · Exploration, dialogue, battle | 本批保留原实现，后续迁移。 · Existing implementation retained in this batch. |

标题艺术 · Title art: 仅对项目自身既有标题图进行兼容 PNG 转码，以符合引擎原生纹理读取要求；不修改源图或现有素材许可。 · An engine-compatible PNG derivative of the existing project title image preserves the original and its notices.

复跑 · Reproduce: `node --test test/*.test.mjs`, `node test/accept.mjs`, `node ../tools/quality.mjs JY` (from JY; the root quality command is normally run from the repository root). Named tests and baselines cover native first-screen and runtime title. See QUALITY for environment, timings and limitations.

## 游戏内宿主与探索（第三批） · In-game host and exploration (batch 3)

| 原界面 · Previous layer | 原生实现 · Native layer |
|---|---|
| 低层 2D 宿主、独立 RAF | `web/game-host.mjs`, `web/main.mjs`: one Play-owned update and admitted-frame barrier; independent native World3D presenters. |
| 地图上方场景、坐标与提示 | `web/jyx2/ui/native/map-hud.mjs`: data views and change-only bindings. |
| 大地图 SVG 路线和取消按钮 | `web/jyx2/ui/world-navigation.mjs`: reused native Graphics node and named cancel action. |
| 大地图镜头按钮 | `web/jyx2/scene/native-world-view.mjs`: native toggle, preserved camera state. |
| 行囊、队伍、分类、装备选择 | `web/jyx2/ui/native/choice-menu.mjs`, `battle-menu-native-adapter.mjs`: native lists, tabs, paging, focus, safe image fallback; existing callback results. |
| 旧对白框和手机 DOM 白话副本 | `web/opening-dialogue.mjs`, `web/jyx2/ui/native/reading-view.mjs`: native paragraph and responsive reading card; preserve logical page boundaries. |
| 对话记录 | `web/jyx2/ui/dialogue-journal.mjs`: native scroll and modal stack; replay does not advance dialogue. |
| 探索触控 | `web/jyx2/ui/native/explore-controls.mjs`: named controls, native held movement ownership, release on cancel/modal. |

640×360 / 360×640 设计，Play `fit: expand` 原地调整，并使用其 safe/screen 几何；经典格子仍使用原来规则坐标，映射由 `web/board-viewport.mjs` 负责。 · Expand and portrait are native; board coordinates are preserved and mapped only for presentation/picking.

不能把帧接收当成真实 GPU 完成或合成呈现。 · A submitted host frame is not a GPU completion or compositor guarantee. See ENGINE-NOTES JY#5.

## 原生战斗与旧页面清理（第四批） · Native encounters and shell cleanup (batch 4)

| 原界面 · Previous layer | 原生实现 · Native layer |
|---|---|
| 状态栏、操作/武学/物品/支援、待机/自动 | `web/jyx2/ui/native/battle-ui.mjs`: native data bindings, actor/target bars, command rail, compact More, valid preview; existing command IDs. |
| 原战斗高亮单独 Canvas | `web/battle-view.mjs` + retained native Graphics grid helper: same board projection, stable draw signature; no per-frame new DOM canvas. |
| 投降/重开确认与战果 | `battle-ui.mjs`, `battle-result-ui.mjs`: native modal stack with explicit continue, existing result/reward callbacks and revision unchanged. |
| 多余 DOM/UI 样式与旧手柄合成器 | `web/index.html` now only host/title containers, canvas placeholder, minimal boot/error text and noscript; `web/style.css` is 20 lines of host layout. Only the minimum file chooser is kept for actual file import/export. |
| 键鼠、手柄和焦点 | `native-input.mjs`, `input-mapping.mjs`: Play routes named inputs, official lower-level snapshot only for missing raw channels. Previous runtime gamepad adapter removed. |

保持原战斗分支、数值、AI、技能、场景、动画、结算和存档不变；新增控件只调用既有命令。 · Native controls invoke existing commands without changing the rules, animation, rewards or saves. Parent-owned expand layout retains the original classic board coordinate mapping; portrait and short screen arrange through engine geometry.
## 最终运行时文案、文字与几何（第五批） · Runtime copy, text and geometry (batch 5)

| 范围 · Area | 原生实现 · Native implementation |
|---|---|
| 程序生成的地图、提示、商店、奖励、状态和存档文字 | `runtime-words.mjs`: `createTextTable` / `pickLanguage`, verbatim source values; same event state in both languages. |
| 范围效果的伤害数字 | `fixed-labels.mjs`: one immutable engine glyph page and `createBitmapText`; arbitrary text remains native atlas labels. Conditional native 4 ms text work only for known ≥8 fallback labels. |
| 战场首次几何上传 | `prepare-battle-resources.mjs`: official program and unique real geometry preparation, bounded slices, report both costs; a program-only stand-in is still required for billboard variants. |
| 首屏 | Independent native title and background data validation retained. Existing monolithic archive must finish validation before actual play. Extra broad preloads did not improve both early-title and full readiness, so were not adopted. |

不修改原资料、游戏规则、存档格式或者源叙事。 · No changes to source data, gameplay rules, save format or source narrative. See QUALITY for actual PC, Fold7, Windows WebKit, multi-screen and synthetic renderer results, and ENGINE-NOTES for remaining API gaps.
