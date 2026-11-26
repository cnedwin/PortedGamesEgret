# 引擎笔记 · Engine notes

引擎主干 `8e70dcb3a8a0b40c9966483c92cb9f691a1cefd8`，与 `vendor/SOURCE.md` 一致。

### 1. 冷打开含多个图标的原生界面触发图像任务上限 · Cold native views can overflow the image job limit — 已解决 / resolved
<!-- engine-note: {"id": "FengshenChronicle#1", "status": "resolved", "topic": "play-view-image-job-queue", "workaround": ["src/native-rpg-ui.mjs"]} -->

- 现象 · Observed: PC Chromium 从新档打开行囊时，一次声明多个 WebP 原生 `image`。`game.show` 同时启动加载，外层报 `ASSET_LOAD_FAILED`，内层为 `WEB_PNG_JOB_LIMIT`。引擎 Web 图像提供器当时只容许四个未完成的任务。 · Opening the bag from a new game started multiple native WebP image requests and hit `WEB_PNG_JOB_LIMIT`, wrapped in `ASSET_LOAD_FAILED`.
- 当前做法 · Workaround removed: [引擎 PR #482](https://github.com/cnedwin/Egret_rebuild/pull/482) 为同一 Play 宿主的声明式图片建立最多四个同时工作的加载队列，关闭或重建视图时清除待处理请求。`src/native-rpg-ui.mjs` 已移除手工预热，图片直接交给 `game.show`。 · Play views share a four-job image queue and discard pending requests when closed or rebuilt. The Demo now declares images directly through `game.show`, using no manual warm-up.
- 建议 · Suggestion implemented: 声明式队列按请求顺序调度。显式 `game.image()` 和 `loadTexture()` 仍分用浏览器图像预算，并可能耗尽名额；本面板的图像仅通过声明式视图加载。 · The queue governs declared images. Explicit image requests still use the shared browser budget and may exhaust it. This panel loads its images through views only.
- 状态 · Status: 旧引擎以独立的六张装备图页面复现并发错误。修复合入主干后，Chromium 157 WebGL2 引擎回归同时声明六张独立 WebP 图，完整挂载六张，并发峰值四张，跳过关闭视图的请求，保留真实错误上报。 · The original six-image reproducer confirmed the overflow. On the merged engine, Chromium 157 WebGL2 mounted all six cold images, peaked at four reads, skipped a closed view request and preserved genuine errors.

- 实机复核 · Device follow-up: PC Edge 与 Fold7 Chrome 使用同一个旧档从首次原生行囊加载开始，分别完成八种 WebP 非缓存请求、可见图标与原资源的像素匹配、卸装再换装以及保存刷新。界面首次可操作的观测上限由旧 PC 的 585.7 ms 降至 149.3 ms，Fold7 为 135.5 ms；两台均无控制台错误、警告或失败请求。 · Physical Edge and Fold7 Chrome each loaded eight uncached image requests, verified matching icon pixels, switched equipment and saved/reloaded. First actionable upper-bound observations were 585.7 ms on the older PC build, 149.3 ms on the updated PC and 135.5 ms on the Fold7. No console errors, warnings or failed requests.

### 2. 原生声明式视图的动态列表和焦点 · Keyed collections and focus in declarative views — 已解决 / resolved
<!-- engine-note: {"id": "FengshenChronicle#2", "status": "resolved", "topic": "play-view-keyed-collections"} -->

- 现象 · What happens: `game.show` 支持滚动和裁剪语义，列表成员发生变化时需要按新的描述重建。 · Play views support scrolling and clipped semantics. A membership change requires a new view description.
- 绕过（已移除） · Workaround removed: #488 提供命名焦点，#506 提供 `view.replaceChildren` 与图片地址绑定。行囊、商店和铁匠铺使用物品/材料稳定编号，更新列表成员时保留外围面板、滚动区和仍存在的行；普通绑定更新文字、颜色、图标和选中状态。跨页、尺寸或结构改变时才按新描述重建。 · #488 supplies named focus; #506 supplies keyed replacement and image source binding. Bags, stock and forge materials use stable item identities, retaining the surrounding view, scroll and surviving rows. Ordinary bindings change text, colour, icons and selection; changed layout structure still requires a new description.
- 状态 · Status: 原生集合能力已接入，浏览器验收核对购买前后货品、货架语义身份不变，切到出售列表仍保留同一个外围滚动 panel。尚未把 30 件装备虚拟化，也不宣称每次不同布局均可保留全部节点。 · Native collections are integrated. Browser acceptance checks stable stock and list semantic identities across a purchase and keeps the list when changing to sale members. The game does not virtualize all thirty rows or promise retention across incompatible layouts.

### 3. RPG 面板接入现有浏览器场景 · Attaching RPG panels to an existing browser game — 未解决 / open
<!-- engine-note: {"id": "FengshenChronicle#3", "status": "open", "topic": "play-existing-browser-game-views", "workaround": ["src/native-rpg-ui.mjs"]} -->

- 现象 · What happens: 声明式 `game.show` 绑定 Play，地图入口使用 `createBrowserGame`。 · Declarative views are exposed through Play. The field uses `createBrowserGame`.
- 绕过 · Workaround: `src/native-rpg-ui.mjs` 用单独的按需绘制层，关闭面板时暂停该层帧循环。页签使用引擎按钮和选中色，配方用原生滚动列表，材料用开关。 · A dedicated on-demand Play layer hosts the panels and stops its loop when they close. Buttons, a scroll panel and toggles represent tabs, recipes and materials.
- 建议 · Suggestion: 支持在现有 `BrowserGame` 显示树上挂载声明式视图，并提供带选中语义的页签组与单选组件。 · Allow declarative views to attach to an existing browser game and add semantic tabs and single-choice controls.

### 4. 声明式长段落固定 1× 栅格密度 · Declarative paragraphs use a fixed 1× raster density — 已解决 / resolved
<!-- engine-note: {"id": "FengshenChronicle#4", "status": "resolved", "topic": "play-view-paragraph-density"} -->

- 现象 · Observed: Fold7 Chrome 157 竖屏约 411×813 CSS px、DPR 2.625 的原生商店中，单行标题清晰，但装备说明的中文字边缘明显锯齿。引擎 playView 的 paintParagraph 在 setRequest 中固定 density: 1，普通原生标签则支持更高像素比。 · Small Chinese item descriptions are visibly softer than native one-line titles. Play's paragraph renderer requests density 1 regardless of the display scale.
- 绕过（已移除） · Workaround removed: 引擎 #503 提供 `ViewParagraphStyle.density`。本作删除整个设计坐标树、字号及边框的比例缩放，段落直接指定 1–2.5× 密度，使用原来的逻辑尺寸和 4 MP 的物理 UI 背板预算。 · Engine #503 exposes paragraph density. The game removes coordinate-tree and font-size scaling, requests 1–2.5× native raster density and keeps the original logical geometry and physical canvas budget.
- 建议 · Suggestion: 提供原生 view 的段落栅格密度参数或根据实际渲染目标自动选择密度，保持布局逻辑单位不变、复用相同缓存身份。验收在 DPR 1、2.625 和 3 下检查中英文长文、选中开关、滚动裁剪、冷缓存与清晰度。 · Expose paragraph raster density or derive it from the presentation target while preserving logical metrics and cache ownership. Verify long text, toggles, clipping and cold caches on multiple display densities.
- 状态 · Status: 旧版高密度绕过曾改善正文笔画；新主干原生 density 版在 Fold7 实拍中保持原有竖屏段落清晰度、换行、滚动裁切及配方选择。没有为清晰度增加旧物理背板预算。 · The old workaround improved body text; the native density version retains the portrait legibility, line wrapping, scrolling and recipe selection on actual Fold7 captures without raising the previous physical backing budget.

### 5. 固定 DPR 与 CSS 放大后的画质 · Fixed DPR and CSS-upscaled field quality — 已在游戏侧绕过 / worked around
<!-- engine-note: {"id": "FengshenChronicle#5", "status": "worked-around", "topic": "browser-game-css-fit-pixel-ratio", "workaround": ["src/main.mjs", "src/render-density.mjs"]} -->

- 现象 · Observed: PC Edge 158 的 1440×850 CSS px、DPR 1 战场设计为约 915×540；默认 pixelRatio=1 使浏览器再放大约 1.57×。人物及场景纹理相对 DOM HUD 发虚，移动时分数坐标采样可令观感更明显。Fold7 横屏原本已超采样，不能把所有手机移动发虚归因于这一项。 · Fixed logical world size can produce a smaller backing than the displayed pixels. The mobile landscape sample was already oversampled; do not infer a motion-specific defect from the desktop comparison alone.
- 绕过 · Workaround: 通过公开 createBrowserGame pixelRatio 参数计算 CSS fit 与设备 DPR，保持原逻辑尺寸和相机行为，最大 2.5× 并限制约 3.5 MP，通常不降低原有 DPR 默认质量。 · Choose a bounded physical backing scale through the public API. Keep gameplay and camera unchanged.
- 建议 · Suggestion: 提供适配 CSS 显示比例的可选自动像素比/像素预算策略，并能在 resize 时重评，避免默认逻辑渲染尺寸被额外放大；应独立测量 CPU/GPU 与浏览器呈现。 · Consider an opt-in physical-fit resolution policy and bounded resize adaptation, with separate GPU and presentation measurements.
- 状态 · Status: PC 浏览器回归检查画布覆盖实际物理像素；Fold7 竖屏由约 878×1740 升至 1079×2137，横屏保留原有 2902×1080。 · Desktop physical backing is verified; mobile portrait density increases and landscape retains its previous oversampling.
