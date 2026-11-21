# FivePhases · 五行牌阵

## 简介 · Introduction

2D 卡牌 + 三消混合玩法 Demo，基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)。上半屏是带立绘与动效的卡牌回合对战，下半屏是消除盘；消除攒能量、也掉新卡，卡与卡之间的羁绊反过来改变你该怎么消。五行既是消除的配色，也是五个流派与羁绊网。[在线试玩](https://cnedwin.github.io/PortedGamesEgret/FivePhases/)

A 2D card battler over a match-three board, built on [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). The top half is turn-based card combat with animated portraits; the bottom half is the board. Matching charges energy and drops new cards, and the bonds between cards change how you want to match. The five phases are at once the board's colours, five playstyles, and a bond network. [Play online](https://cnedwin.github.io/PortedGamesEgret/FivePhases/)

三关依次迎战山魈、赤蛟和混沌。战斗有 30 张卡、五行羁绊、奖励三选一以及胜败结算。四套矿彩立绘、标题画、战场画与原创音乐随游戏提供。

Play through three encounters with 30 cards, elemental bonds, pick-one-of-three rewards and a win or defeat screen. Four articulated portraits, illustrated screens and original music are bundled with the game.

## 玩法与操作 · How to play

下半屏的 7×7 消除盘：点一格再点相邻的一格交换，连成三个或以上同色即消除，连锁越长攒的能量越多，也会掉落新卡。上半屏是回合制卡牌对战：用能量从手牌里出牌攻击或防守，按「结束回合」让敌人行动。卡牌按五行结成羁绊，改变你该优先消哪种颜色。三关依次迎战山魈、赤蛟和混沌，每关胜利后从三张奖励卡里选一张。

The lower half is a 7 × 7 board: tap a tile, then a neighbouring one, to swap them; three or more of a colour in a line clear, longer chains charge more energy and drop new cards. The upper half is turn-based card combat: spend energy to play cards from the hand, then press End turn for the enemy to act. Cards form bonds by the five phases, which change which colour you want to match. Three encounters in turn, with a pick of one reward card from three after each win.

| 操作 · Action | 触屏和鼠标 · Touch and mouse |
|---|---|
| 交换 · Swap | 点一格，再点相邻一格 · tap a tile, then a neighbour |
| 出牌 · Play a card | 点手牌 · tap a card in the hand |
| 结束回合 · End the turn | 「结束回合」按钮 · the End turn button |
| 静音 · Mute | 静音按钮（本机记住） · the mute button, remembered on this device |

震屏在系统开启「减弱动态效果」时关闭。 · Screen shake is off when the system asks for reduced motion.

## 怎么跑 · Running

```bash
npx serve .            # 或 python -m http.server，起在仓库根目录
# 打开 /FivePhases/
```

**必须走 HTTP**：`type="importmap"` 与 ES module 在 `file://` 下都不工作。

### 测试与美术工具

```bash
node --test FivePhases/test/*.test.mjs FivePhases/src/portrait/*.test.mjs FivePhases/src/view/*.test.mjs
node FivePhases/tools/spine-export.mjs
node FivePhases/tools/parts-table.mjs
```

浏览器诊断：

```bash
node FivePhases/tools/probe.mjs --url http://127.0.0.1:8123/FivePhases/ \
  --wait 2000 --shot FivePhases/.feel/shot.png \
  --eval "window.fivephases.hint()"

# 放大看细节：--clip x,y,w,h,倍数（页面坐标，不是设计坐标）
node FivePhases/tools/probe.mjs --url http://127.0.0.1:8123/FivePhases/ \
  --wait 2200 --size 540,1080 --clip "20,250,250,240,3" \
  --shot FivePhases/.feel/hero.png \
  --eval "window.fivephases.start()"
```

页面暴露了 `window.fivephases`：`start()` / `stage(n)` / `swap(a,b)` / `play(uid)` / `endTurn()` / `hint()` / `stats()`。
自动化测试和手感实测都从这里进，不靠像素点。

## 结构上的一条硬线 · The one rule

`src/core/` 不认识显示对象，也不自己播动画：它只改状态、吐一张事件表。
`src/main.mjs` 拿到事件表，翻译成演出队列。

```
core/battle.mjs  ──事件表──▶  main.mjs  ──▶  sequence / fx / hud / audio
   （判定）                     （演出）
```

好处是判定和演出可以分别改、分别测：棋盘逻辑的测试在 Node 里跑，一帧都不用画。
代价是事件表要设计得足够细——`clearStep`、`fall`、`energy`、`damage` 各是一条，
少一条表现层就得去猜。

## 立绘、界面与音频

四个角色使用同一套矿彩墨绘风格。每套都保存完整 `master.webp`、可编辑的透明部件、图集与关节清单。关节负责变换，独立绘制顺序保留头发、衣袍、持械手与护甲的层叠关系。游戏在白鹭 WebGL2 直接渲染这些部件。

查看 [30 个部件和 Spine 接入步骤](docs/PORTRAIT-PARTS.md)。预览页可切换四套骨架，并显示关节和轴心。标题与战斗的插画位于 `assets/art/`。素材与生成记录见 [美术与音频来源](docs/ART-SOURCES.md)。

配乐随标题与三场战斗切换，覆盖战斗结果时淡出。音效按换位、消除、连锁、出牌、受击、奖励及结算触发。浏览器在第一次有效点击或触控后启用声音，静音设定在本机保留。

## 前期矢量版的引擎测量 · Earlier vector-rendering measurements

这个仓库是 Egret Rebuild 的玩法验证场，每个游戏都是一次"用真实玩法压测引擎某条路径"的实验。本作压的是 2D 共享渲染在高频重绘下的表现，撞到两件事：

1. **几何预算按"每帧总量"记，不是按"这一帧新做了什么"记。** 抛 `WEBGL2_GEOMETRY_RANGE ← Geometry preparation budget`（每帧 prepared vertices 上限 1,048,576）时，第一反应是"每帧重画太多了"。但引擎有 retention：输入没变的 draw 会复用上一帧的几何。问题在于**复用的那份照样记账**——`prepareSharedDraws2D` 每帧新建一个 ledger，把整场戏的几何从头累一遍。所以压垮它的是**场景本身的复杂度**，不是某一帧的额外开销。

   量化下来（在 `admit()` 里临时打日志，量完还原并核对 md5）：静态待机一帧 754k，只剩 28% 余量，连锁一起来就破。两个大头：

   | 来源 | 每帧 | 占比 |
   |---|---|---|
   | 49 格棋盘的**圆角矩形描边** | 258k | 34% |
   | 立绘 40 个部件的**描边** | 195k | 26% |

   描边贵在轮廓要摊成三角形带、圆角还要加圆形接头，而填充只要扇形三角化。改成"外圈实心 + 内圈实心盖上去"、立绘干脆不描边（改用一个比袍子深半档的袖色分出手臂）之后，静态一帧 **268k**，长跑峰值 320k，机器人狂点压测连跑九次零复现。

   顺带一个反面教训：一开始把粒子池从 `visible` 改成 `alpha`，压测确实不报了——但那是把 754k 压到刚好不越线，不是把根因解决掉。换了个场景（立绘放大、敌人重画）立刻复发。**"改完不报了"不等于"改对了"。**

2. **"非零但极小"的坐标是致命错误，不是退化图形。** `prepareRectangles2D` 的 `coordinate()` 对 `|v| < 2^-100` 直接抛 `GeometryPreparationError('range')`，整帧渲染失败。震屏收尾那一帧的余量按比例平方下去，`world.x` 会落在 `1e-32` 这个量级——而闪光层的矩形是从 `(0,0)` 画的，四个角全落在这上面。症状是"十次里炸一次，只在震屏和白闪同一帧出现时"，查了很久。我们的修法是震屏余量小于一帧就直接归零；从引擎侧看，这种退化四边形更合理的处理是丢弃而不是报错。

3. **帧循环报错后停在 `failed`，画面还在但什么都不动了。** 这比崩溃更难查。`main.mjs` 里接了 `onError`：把真正的原因（`cause` 链）打出来，并有限次重启帧循环。引擎侧建议给 `createBrowserGame` 两个选项：一个"渲染失败后重试"，一个能调几何预算上限——现在每个 Demo 都要自己写重试，而 1,048,576 对一块 49 格的棋盘加立绘加特效是偏紧的。

复现方式：`node FivePhases/tools/probe.mjs` 用 `window.fivephases` 让机器人以最快速度出牌与交换，看控制台。

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `@egret/engine/web/game` `createBrowserGame` | 画布、2D 舞台、帧循环和 `onError`；帧循环失败时报出原因并有限次重启 · canvas, 2D stage, frame loop and `onError`, with bounded restarts after a failure | `src/main.mjs` |
| `game.toStage` | 把触点换算成棋盘格 · turning a touch into a board cell | `src/main.mjs` |
| `Sprite`、`Bitmap`、`DisplayObjectContainer` | 棋盘格子池、立绘部件、粒子特效 · the pooled board tiles, portrait parts and particles | `src/view/board-view.mjs`、`src/view/portrait.mjs`、`src/view/fx.mjs` |
| `Sprite.graphics` | 棋盘格的实心圆角块和特效形状 · solid rounded tiles and effect shapes | `src/view/draw.mjs` |

## 已验证 · Verified

- 2026-11-21 在提交 `fc1dacb`、Node 22.23.4 下运行 `node --test test/*.test.mjs`：49 项全部通过（棋盘、战斗、棋盘视图）。另有 `src/portrait/`、`src/view/` 下的测试，本次没有跑。 · `node --test test/*.test.mjs` at commit `fc1dacb` with Node 22.23.4: all 49 pass; the tests under `src/portrait/` and `src/view/` were not run this time.
- 2026-11-20 `node tools/quality.mjs FivePhases` 在无头 Chromium + SwiftShader 下测了 16 个自动项，结果见 [QUALITY.md](QUALITY.md)。 · The 16 automatic quality items in headless Chromium, see QUALITY.md.
- 上面「前期矢量版的引擎测量」一节记录的压测：`tools/probe.mjs` 让机器人以最快速度出牌和交换，几何预算问题修复后连跑九次没有复现。 · The stress runs recorded above: after the geometry fix, nine runs of the fastest robot play showed no recurrence.

## 已知问题 · Known issues

- 只有中文界面，`<html lang>` 也固定为中文（品质 I1）。 · Chinese only.
- 品质验收未达标 · Quality items failing（[QUALITY.md](QUALITY.md)，2026-11-21，无头 Chromium + SwiftShader · headless, software rendering）：T2 触控区 ≥ 44×44 CSS px（2 of 2 under 44×44: 开阵 121×43; 静音 40×40）；F1 桌面帧时间 p95 ≤ 16.7 ms（p95 66.7 ms over 74 frames）；I1 中英文全可切换，英文下无中文（html lang "zh-CN", Chinese left: 五行牌阵 消除聚灵 出牌破阵 开阵 阵法说明）。

## 已解决 · Solved

- 几何预算超限（`WEBGL2_GEOMETRY_RANGE`）：棋盘描边改为两层实心块，立绘不再描边，静态一帧从约 754k 降到 268k 个预备顶点（`142ee83`，ENGINE-NOTES 第 1 条）。 · The geometry budget: outlines became two solid fills, the portraits lost their outlines, a still frame went from about 754k to 268k prepared vertices (item 1).
- 震屏收尾时坐标落到 `1e-32` 量级，整帧渲染失败：余量小于一帧就归零（`fa55164`，ENGINE-NOTES 第 2 条）。 · The dying shake left coordinates near `1e-32` and failed the frame; it now snaps to zero (item 2).
- 帧循环失败后画面冻住：`onError` 打出原因链并最多重启五次（ENGINE-NOTES 第 3 条）。 · A failed loop froze the picture; `onError` reports the cause and restarts it up to five times (item 3).
- 立绘部件的绘制顺序（`e4a68fd`）；隐藏的浮层仍拦截输入（`eeb8973`）；深层连锁时棋盘动画不稳（`024b5b1`）；潮汐填充和特殊格触发（`f667521`）。 · Portrait draw order, hidden overlays taking input, deep cascades, tide fills and special tiles.

## 未做的部分 · Not done yet

- 关间地图与事件节点（现在是固定三关）
- 存档与卡组成长（奖励只在单局内有效）

## 目录 · What is here

| 路径 | 是什么 |
|---|---|
| [`DESIGN.md`](DESIGN.md) | 完整设计草案：布局、核心循环、爽感工程化、卡牌约束、羁绊、数值、演出分级、里程碑 |
| `index.html` / `style.css` | 页面与界面样式。画布画战场，DOM 画 HUD |
| `src/main.mjs` | 入口：搭台、收输入、把事件表翻译成演出、走流程 |
| `src/core/` | **纯逻辑，不 import 任何显示对象**。棋盘、卡牌、战斗状态机 |
| `src/view/` | 表现层：棋盘视图、立绘绑定、粒子特效、演出队列、Web Audio 配乐与音效 |
| `src/ui/hud.mjs` | 血条、能量、手牌、步数、连锁、飘字（DOM） |
| `src/portrait/` | 贴图骨架清单与 Spine 导出 |
| `test/` | 逻辑层测试，`node --test` 直接跑，不需要浏览器 |
| `tools/` | 立绘预览、Spine 导出、无头浏览器探针 |
| `vendor/` | 本作自带的一份引擎（与 LanternShadows 一致，每个 Demo 各带一份） |

## 引擎副本 · Engine copy

引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 `b5628eb9997b67cf6163a388f5aa06f321f3833a`，由引擎仓库的 `tools/vendor-game.mjs` 复制（入口 `@egret/engine`、`@egret/engine/web/game`），见 [vendor/SOURCE.md](vendor/SOURCE.md)。2026-11-21 之前的副本没有记录提交号，早于引擎 `66f7c59`。

The engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit `b5628eb9997b67cf6163a388f5aa06f321f3833a`, copied by the engine's `tools/vendor-game.mjs` (entries `@egret/engine` and `@egret/engine/web/game`); see [vendor/SOURCE.md](vendor/SOURCE.md). The copy before 2026-11-21 had no recorded commit and predated engine `66f7c59`.
