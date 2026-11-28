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
