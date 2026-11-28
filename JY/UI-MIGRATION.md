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
