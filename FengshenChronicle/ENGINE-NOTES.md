# 引擎笔记 · Engine notes

引擎主干 `8e70dcb3a8a0b40c9966483c92cb9f691a1cefd8`，与 `vendor/SOURCE.md` 一致。

### 1. 冷打开含多个图标的原生界面触发图像任务上限 · Cold native views can overflow the image job limit — 已解决 / resolved
<!-- engine-note: {"id": "FengshenChronicle#1", "status": "resolved", "topic": "play-view-image-job-queue", "workaround": ["src/native-rpg-ui.mjs"]} -->

- 现象 · Observed: PC Chromium 从新档打开行囊时，一次声明多个 WebP 原生 `image`。`game.show` 同时启动加载，外层报 `ASSET_LOAD_FAILED`，内层为 `WEB_PNG_JOB_LIMIT`。引擎 Web 图像提供器当时只容许四个未完成的任务。 · Opening the bag from a new game started multiple native WebP image requests and hit `WEB_PNG_JOB_LIMIT`, wrapped in `ASSET_LOAD_FAILED`.
- 当前做法 · Workaround removed: [引擎 PR #482](https://github.com/cnedwin/Egret_rebuild/pull/482) 为同一 Play 宿主的声明式图片建立最多四个同时工作的加载队列，关闭或重建视图时清除待处理请求。`src/native-rpg-ui.mjs` 已移除手工预热，图片直接交给 `game.show`。 · Play views share a four-job image queue and discard pending requests when closed or rebuilt. The Demo now declares images directly through `game.show`, using no manual warm-up.
- 建议 · Suggestion implemented: 声明式队列按请求顺序调度。显式 `game.image()` 和 `loadTexture()` 仍分用浏览器图像预算，并可能耗尽名额；本面板的图像仅通过声明式视图加载。 · The queue governs declared images. Explicit image requests still use the shared browser budget and may exhaust it. This panel loads its images through views only.
- 状态 · Status: 旧引擎以独立的六张装备图页面复现并发错误。修复合入主干后，Chromium 157 WebGL2 引擎回归同时声明六张独立 WebP 图，完整挂载六张，并发峰值四张，跳过关闭视图的请求，保留真实错误上报。 · The original six-image reproducer confirmed the overflow. On the merged engine, Chromium 157 WebGL2 mounted all six cold images, peaked at four reads, skipped a closed view request and preserved genuine errors.

- 实机复核 · Device follow-up: PC Edge 与 Fold7 Chrome 使用同一个旧档从首次原生行囊加载开始，分别完成八种 WebP 非缓存请求、可见图标与原资源的像素匹配、卸装再换装以及保存刷新。界面首次可操作的观测上限由旧 PC 的 585.7 ms 降至 149.3 ms，Fold7 为 135.5 ms；两台均无控制台错误、警告或失败请求。 · Physical Edge and Fold7 Chrome each loaded eight uncached image requests, verified matching icon pixels, switched equipment and saved/reloaded. First actionable upper-bound observations were 585.7 ms on the older PC build, 149.3 ms on the updated PC and 135.5 ms on the Fold7. No console errors, warnings or failed requests.

### 2. 原生声明式视图的动态列表和焦点 · Keyed collections and focus in declarative views — 部分解决 / partly
<!-- engine-note: {"id": "FengshenChronicle#2", "status": "partly", "topic": "play-view-keyed-collections", "workaround": ["src/native-rpg-ui.mjs"]} -->

- 现象 · What happens: `game.show` 支持滚动和裁剪语义，列表成员发生变化时需要按新的描述重建。 · Play views support scrolling and clipped semantics. A membership change requires a new view description.
- 绕过 · Workaround: `src/native-rpg-ui.mjs` 按物品编号保存动作身份、滚动位置；本轮引擎 #488 已提供 view.focused 和 view.focus(name)，原语义树查找及人为聚焦改用引擎原生接口。物品消失时回落到有效页签或关闭按钮。 · Preserve stable action keys and scroll offsets. Engine #488 now supplies view.focused and view.focus(name), replacing semantic focus scanning and activation. If an item disappears, fall back to an eligible tab or Close.
- 建议 · Suggestion: 给 Play 视图加按键保留节点的集合更新能力，与低层 UI Root 的虚拟列表衔接。验收从 30 件装备中部连续出售或合成，焦点和滚动位置稳定，图标与说明按行回收。 · Add keyed collections. Verify stable focus and scroll after a sale or craft in the middle of a 30-item bag, with row assets released. 此项仍为动态列表能力请求；不再需要语义焦点绕过。

### 3. RPG 面板接入现有浏览器场景 · Attaching RPG panels to an existing browser game — 未解决 / open
<!-- engine-note: {"id": "FengshenChronicle#3", "status": "open", "topic": "play-existing-browser-game-views", "workaround": ["src/native-rpg-ui.mjs"]} -->

- 现象 · What happens: 声明式 `game.show` 绑定 Play，地图入口使用 `createBrowserGame`。 · Declarative views are exposed through Play. The field uses `createBrowserGame`.
- 绕过 · Workaround: `src/native-rpg-ui.mjs` 用单独的按需绘制层，关闭面板时暂停该层帧循环。页签使用引擎按钮和选中色，配方用原生滚动列表，材料用开关。 · A dedicated on-demand Play layer hosts the panels and stops its loop when they close. Buttons, a scroll panel and toggles represent tabs, recipes and materials.
- 建议 · Suggestion: 支持在现有 `BrowserGame` 显示树上挂载声明式视图，并提供带选中语义的页签组与单选组件。 · Allow declarative views to attach to an existing browser game and add semantic tabs and single-choice controls.
