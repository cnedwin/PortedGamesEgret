# 原生界面迁移验收 · Native UI migration

旧界面基于 PortedGamesEgret 的 `e85f81ca`，引擎为 `b5628eb`。新版引擎取自 Egret Rebuild main 的 `51b6175d`。首先替换引擎并保留旧界面复跑，随后再迁移界面。规则目录 `src/sim/` 的 Git 树、存档格式和原有中英文文本均保留。

The reference interface is PortedGamesEgret `e85f81ca` with engine `b5628eb`. The engine-only comparison used the old interface with Egret Rebuild main at `51b6175d`. The simulation tree, save format and existing locale catalogue entries are preserved.

## 2026-11-26 引擎复测 · Engine refresh

`95897d78` 接管集市文字、键盘和手柄焦点、暂停时的手柄操作、静止界面的按需绘制及 WebP 读取。已撤掉集市离屏字图、手写焦点框和 Tab 处理、自行轮询手柄，以及立绘的二次画布上传。保留动态无障碍名称映射、浮动战场摇杆、窄屏触控确认，以及立绘的焦点裁切。

At `95897d78`, the engine owns market text, keyboard and gamepad focus, paused pad navigation, on-demand drawing and WebP loading. The offscreen text bitmap, custom focus indicator and Tab handler, custom pad polling and portrait canvas upload are removed. Dynamic accessible names, the floating field stick, the compact confirmation and the portrait crop remain.

最新副本为 0728eccc，改用 view.focus 指定重建视图的焦点，使用可复现的首屏模块包；保持规则与旧档。三种主角形态的待机/滑行透明画集已更新。WebGPU 预热交给正常帧循环而非独立提交。 · The latest copy is 0728eccc, with native focus, a reproducible startup bundle and updated battle sprites. Warm-up uses the normal frame loop.

以下元素对照、截图和物理行数记录初次迁移。当前版本的验证见 [QUALITY.md](QUALITY.md)。 · The mapping, screenshot matrices and line counts below document the first migration. See the quality report for the current build.

## 旧元素与新实现 · Element mapping

| 旧界面 · Old element | 新实现 · Replacement |
|---|---|
| `#title`、`.title-copy`、出海、怎么玩和设置 | Egret title panel and named buttons. |
| `.hero-deck`、形态名称、解锁、最远波次、形态说明 | Bound disabled buttons, native Bitmap portraits and translated notes. |
| `.danger-picker`、难度说明 | Named buttons, selection colour and a wrapped note. |
| `#guide` 的说明列表、返回和出海 | Engine modal with wrapped text and named actions. |
| `#options`、暂停内的设置、语音/配乐/减弱动画和语言 | The same view builder retains all settings and the save callbacks. |
| `#hud`、波数、计时、暂停 | Safe-area HUD rendered in the fixed battlefield. |
| `#hpBar`、`#hpText`、`#xpBar`、等级、珍珠 | Bound bars and health text, plus pick/format/roll for the two counters. |
| `#bossBar`、`#bossText`、`#bossAnnouncement` | Bound health bar, title and reduced-motion-aware fade. |
| `#battleHint` | Native device hint and wrapped tutorial text. |
| `#seaStick` | Egret Graphics ring/knob and owned canvas pointer capture. |
| `#levelUp` 和升级按键 | Engine upgrade view with the live choice count and 1–4 shortcut. |
| `#shop` 的标题、余额、货架、买入、留货、换货和反馈 | Native view with responsive stock grid, bound disable/price states and feedback. |
| `#shop` 的货架／法宝分页、下一波 | Responsive engine page buttons and anchored compact footer. |
| 法宝槽、选中、合成预览、卖出和取消 | Named view actions and semantic state. The original tap-to-select chain also accepts a matching drag-and-drop. |
| 宝物、属性、合成配方 | Wrapped engine text with pages where vertical space is limited. |
| `#menu`、继续、标题、本局波次 | Engine modal preserves loop/audio pause and clears the floating stick. |
| `#end`、肖像、记录、解锁、中英文重开和回标题 | Engine result panel, Bitmap portrait and translated totals and notices. |
| `#loading`、`#loadError`、重载 | Engine progress and reload dialog once initialized. A pre-engine load/import failure keeps a minimal browser reload control. |
| `#say` 读屏播报 | Egret semantic status projected to the page for assistive software. |
| CSS 海面、标题和龙宫背景 | Original non-interactive WebP art under the transparent canvas. |

界面分组及返回由引擎屏幕栈处理；画布的 Tab、Enter、Space 及焦点框基于引擎语义树。Battle entry keeps the original 540 × 960 simulation space and limits canvas width to the battlefield while playing. Menus use the expanded canvas.

## 画面对照 · Side by side

每张图按同一视口和语言排列，左为旧版，右为新版。宽屏集市同屏展示货架与法宝，窄屏分别截图。结果使用固定的测试局面。 · Each sheet puts the old view on the left and the new view on the right at the same size and locale. The wide market shows both sections. The compact market has separate shots for each tab. Results use fixed test scenarios.

| 尺寸 · Viewport | 简体中文 | English |
|---|---|---|
| 1280 × 800 | [对照](test/visual-comparison/1280x800-zh.webp) | [Comparison](test/visual-comparison/1280x800-en.webp) |
| 390 × 844 | [对照](test/visual-comparison/390x844-zh.webp) | [Comparison](test/visual-comparison/390x844-en.webp) |
| 844 × 390 | [对照](test/visual-comparison/844x390-zh.webp) | [Comparison](test/visual-comparison/844x390-en.webp) |
| 768 × 1024 | [对照](test/visual-comparison/768x1024-zh.webp) | [Comparison](test/visual-comparison/768x1024-en.webp) |

[标准基线的标题和结算对照 · Reviewed title and result baselines](test/visual-comparison/stock-acceptance-540x960.webp)。标题布局保留原有背景和三张立绘。首领提示与集市保留原有层级和快捷入口。短横屏标题的难度选择可以直接点到。英文的「中文」按钮沿用目标语言自己的名称。

## 引擎反馈优先级 · Engine feedback priorities

1. 密集场景文字在缓存满时消失；即使还能点，也不知道按钮是什么。Dense text exhaustion hides labels even when the buttons are active. [Engine notes §8](ENGINE-NOTES.md#8-集市文字达到缓存上限后空白--dense-market-labels-go-blank-at-the-text-cache-limit--未解决--open)
2. 声明式界面补齐键盘、手柄和模态焦点。在旧 HTML 上修复的拦截与新画布焦点是两个问题。Declarative keyboard, gamepad and modal focus need engine support. [Engine notes](ENGINE-NOTES.md)
3. 浮动摇杆的全场起手、触点归属和取消。Native floating stick ownership and cancellation. [Engine notes](ENGINE-NOTES.md)
4. 确认框触控尺寸、滚动区、列表、图像部件、分页和换行。CSS-pixel confirmation targets, scrolling, lists, images, tabs and wrapping. [Engine notes](ENGINE-NOTES.md)

## 界面代码体积 · UI source size

下表是文件物理行数。旧版可分辨的界面代码共 1,136 行，扣除空行和注释，计入界面控制桥接和美术 CSS，不计 import map。新版把原 DOM 界面移出入口；表中也计入新加的视图、布局、语义和集市操作模块，方便审阅总成本。 · Physical lines are listed below. The legacy UI subset had 1,136 nonblank, uncommented lines, including interface glue and art CSS, excluding the import map. The new total includes first-party view, layout, semantic and market modules.

| 文件 · File | 旧版 · Before | 新版 · After |
|---|---:|---:|
| `src/main.mjs` | 699 | 436 |
| `src/sea-stick.mjs` | 47 | 105 |
| `index.html` | 90 | 84 |
| `style.css` | 480 | 79 |
| `src/ui-*.mjs`（5 个文件 · 5 modules） | 0 | 1,204 |
| 合计 · Total | 1,316 | 1,908 |

## 复跑 · Reproduce

```sh
cd NezhaSea
node --test test/*.test.mjs
node test/accept.mjs
cd ..
node tools/quality.mjs NezhaSea
node tools/check-standard.mjs
npm run check:showcase
```

[品质验收及设备限制 · Quality and devices](QUALITY.md)
