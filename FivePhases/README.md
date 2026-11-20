# FivePhases · 五行牌阵

## 简介 · Introduction

2D 卡牌 + 三消混合玩法 Demo，基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)。上半屏是带立绘与动效的卡牌回合对战，下半屏是消除盘；消除攒能量、也掉新卡，卡与卡之间的羁绊反过来改变你该怎么消。五行既是消除的配色，也是五个流派与羁绊网。

A 2D card battler over a match-three board, built on [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). The top half is turn-based card combat with animated portraits; the bottom half is the board. Matching charges energy and drops new cards, and the bonds between cards change how you want to match. The five phases are at once the board's colours, five playstyles, and a bond network.

三关依次迎战山魈、赤蛟和混沌。战斗有 30 张卡、五行羁绊、奖励三选一以及胜败结算。四套矿彩立绘、标题画、战场画与原创音乐随游戏提供。

Play through three encounters with 30 cards, elemental bonds, pick-one-of-three rewards and a win or defeat screen. Four articulated portraits, illustrated screens and original music are bundled with the game.

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

## 未做的部分 · Not done yet

- 关间地图与事件节点（现在是固定三关）
- 存档与卡组成长（奖励只在单局内有效）

## 玩法与操作 · How to play

（待补 · To be written）

## 引擎能力对照表 · Engine capabilities

（待补 · To be written）

## 已验证 · Verified

（待补 · To be written）

## 已知问题 · Known issues

- 品质验收未达标 · Quality items failing（[QUALITY.md](QUALITY.md)，2026-11-20，无头 Chromium + SwiftShader · headless, software rendering）：T2 触控区 ≥ 44×44 CSS px（2 of 2 under 44×44: 开阵 121×43; 静音 40×40）；F1 桌面帧时间 p95 ≤ 16.7 ms（p95 99.9 ms over 53 frames）；I1 中英文全可切换，英文下无中文（html lang "zh-CN", Chinese left: 五行牌阵 消除聚灵 出牌破阵 开阵 阵法说明）。

## 已解决 · Solved

（待补 · To be written）

## 引擎副本 · Engine copy

（待补 · To be written）
