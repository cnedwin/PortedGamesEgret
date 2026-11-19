# FivePhases · 五行牌阵

2D 卡牌 + 三消混合玩法 Demo，基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)。上半屏是带立绘与动效的卡牌回合对战，下半屏是消除盘；消除攒能量、也掉新卡，卡与卡之间的羁绊反过来改变你该怎么消。五行既是消除的配色，也是五个流派与羁绊网。

A 2D card battler over a match-three board, built on [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). The top half is turn-based card combat with animated portraits; the bottom half is the board. Matching charges energy and drops new cards, and the bonds between cards change how you want to match. The five phases are at once the board's colours, five playstyles, and a bond network.

**当前状态 · Status**：**可玩**。三关（山魈 → 赤蛟 → 混沌）、消除攒能量、30 张卡、五条羁绊、奖励三选一、胜负结算全部跑通；逻辑层 37 例 + 立绘往返 11 例测试全过。

Playable. Three stages, match-to-charge-energy, 30 cards, five bonds, pick-one-of-three rewards, win and lose all work. 37 logic tests and 11 rig round-trip tests pass.

## 目录 · What is here

| 路径 | 是什么 |
|---|---|
| [`DESIGN.md`](DESIGN.md) | 完整设计草案：布局、核心循环、爽感工程化、卡牌约束、羁绊、数值、演出分级、里程碑 |
| `index.html` / `style.css` | 页面与界面样式。画布画战场，DOM 画 HUD |
| `src/main.mjs` | 入口：搭台、收输入、把事件表翻译成演出、走流程 |
| `src/core/` | **纯逻辑，不 import 任何显示对象**。棋盘、卡牌、战斗状态机 |
| `src/view/` | 表现层：棋盘视图、立绘绑定、粒子特效、演出队列、WebAudio 合成音 |
| `src/ui/hud.mjs` | 血条、能量、手牌、步数、连锁、飘字（DOM） |
| `src/portrait/` | 立绘部件清单 + Spine 双向转换 |
| `test/` | 逻辑层测试，`node --test` 直接跑，不需要浏览器 |
| `tools/` | 立绘预览、Spine 导出、无头浏览器探针 |
| `vendor/` | 本作自带的一份引擎（与 LanternShadows 一致，每个 Demo 各带一份） |

## 怎么跑 · Running

```bash
npx serve .            # 或 python -m http.server，起在仓库根目录
# 打开 /FivePhases/
```

**必须走 HTTP**：`type="importmap"` 与 ES module 在 `file://` 下都不工作。

测试与工具：

```bash
node --test FivePhases/test/battle.test.mjs FivePhases/test/board.test.mjs   # 37
node --test FivePhases/src/portrait/spine.test.mjs                            # 11
node --test FivePhases/src/view/portrait.test.mjs                             # 6
node FivePhases/tools/spine-export.mjs     # → assets/spine/*.skeleton.json + *.manifest.json
node FivePhases/tools/parts-table.mjs      # → docs/PORTRAIT-PARTS.md
```

无头自查（AI 没有眼睛，用这个代替）：

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

好处是判定和演出可以分别改、分别测：棋盘逻辑的 37 个测试在 Node 里跑，一帧都不用画。
代价是事件表要设计得足够细——`clearStep`、`fall`、`energy`、`damage` 各是一条，
少一条表现层就得去猜。

## 立绘为什么是代码画的 · Why the portraits are drawn in code

一开始打算用 AI 生成整张立绘，验证过可行（透明底、1024×1536 RGBA 正常）。但整张位图**拆不出骨骼**，等于把演出能力锁死——而这个 Demo 的卖点之一就是立绘要能动。

所以改成：先用代码按 Spine 的槽位结构画出占位件，把**骨骼、层序、尺寸、轴心、旋转**这五样定死，写成一份部件清单。这份清单就是合同：

```
部件清单 ──现在：代码画形状，能跑能演能调
        └─将来：只填 image 字段，换成真美术，骨骼与动画一行不改
```

将来要提升画面品质，照 `assets/spine/<角色>.manifest.json` 里的 `size` 一张张出 PNG 就行，轴心位置已经写在 `pivot` 里，图集由打包器出。skeleton.json 不用动。

绑定时有一处必须说清楚：**骨骼树只管变换，不管绘制顺序**。把部件直接挂在各自骨下看着很自然，但那样真正的顺序是骨骼树的深度优先遍历，`layer` 只决定同一根骨下几个部件的先后——子骨永远排在父骨自己的部件之前。踩到的结果是清单里 `blade` 写着 19、`robe` 写着 9，屏幕上整把刀被身体挡住，近侧手臂也藏在袍子里。所以部件放在一个平层里按 `layer` 排，骨骼只提供世界变换，改完骨骼调一次 `sync()`。`src/view/portrait.test.mjs` 钉住了这条：刀必须在袍子之后、近手在前远手在后、转肩骨刀要跟着走。

## 给引擎的两个实测结论 · Two findings for the engine

这个仓库是 Egret Rebuild 的玩法验证场，每个游戏都是一次"用真实玩法压测引擎某条路径"的实验。本作压的是 2D 共享渲染在高频重绘下的表现，撞到两件事：

1. **每帧切换大量 `sprite.visible` 会撑爆几何预算。** 粒子池最初用 `visible = true/false` 开关，一次消除几十颗、连着几轮连锁，就会抛 `WEBGL2_GEOMETRY_RANGE ← Geometry preparation budget`（每帧 prepared vertices 上限 1,048,576）。改成"图形预画一次、运行期只改 `alpha`/缩放/位置"之后，同样的机器人狂点压测连跑五次零复现。
2. **帧循环报错后停在 `failed`，画面还在但什么都不动了。** 这比崩溃更难查。`main.mjs` 里接了 `onError`：把真正的原因（`cause` 链）打出来，并有限次重启帧循环。引擎侧建议给 `createBrowserGame` 一个"渲染失败后重试"的选项——现在每个 Demo 都要自己写一遍。

复现方式：`node FivePhases/tools/probe.mjs` 用 `window.fivephases` 让机器人以最快速度出牌与交换，看控制台。

## 未做的部分 · Not done yet

- 水 / 木 / 金 / 土四个角色的立绘清单（现在只有火）
- 关间地图与事件节点（现在是固定三关）
- 存档与卡组成长（奖励只在单局内有效）
- 真机手感实测（`tools/feel-test.mjs` 还没写，需要连着安卓设备）
