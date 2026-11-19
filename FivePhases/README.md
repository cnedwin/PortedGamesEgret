# FivePhases · 五行牌阵

2D 卡牌 + 三消混合玩法 Demo，基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)。上半屏是带立绘与动效的卡牌回合对战，下半屏是消除盘；消除攒能量、也掉新卡，卡与卡之间的羁绊反过来改变你该怎么消。五行既是消除的配色，也是五个流派与羁绊网。

A 2D card battler over a match-three board, built on [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). The top half is turn-based card combat with animated portraits; the bottom half is the board. Matching charges energy and drops new cards, and the bonds between cards change how you want to match. The five phases are at once the board's colours, five playstyles, and a bond network.

**当前状态 · Status**：设计定稿，立绘部件管线与 Spine 导出已跑通，**游戏本体未开工**。这个目录现在只有设计文档、火角色的立绘部件清单和工具，没有可玩的构建。

Design is settled and the portrait rig pipeline works; the game itself has not been started. There is nothing playable in this directory yet.

## 目录 · What is here

| 路径 | 是什么 |
|---|---|
| [`DESIGN.md`](DESIGN.md) | 完整设计草案：布局、核心循环、爽感工程化、卡牌约束、羁绊、数值、演出分级、里程碑 |
| [`docs/PORTRAIT-PARTS.md`](docs/PORTRAIT-PARTS.md) | 立绘部件明细表（16 骨 / 40 部件），由工具生成，不手写 |
| `src/portrait/fire.mjs` | 火 · 焰的部件清单——占位图与真美术之间的合同 |
| `src/portrait/spine.mjs` | 清单 ⇄ Spine 骨架的双向转换 |
| `src/portrait/spine.test.mjs` | 往返测试：导出再读回来必须逐字段相等 |
| `tools/portrait-preview.html` | 部件预览页，可开骨骼、轴心、部件名 |
| `tools/spine-export.mjs` | 导出 Spine 4.1 骨架 + 美术交付单 |
| `tools/parts-table.mjs` | 从清单生成 `docs/PORTRAIT-PARTS.md` |
| `assets/spine/` | 导出的骨架与交付单 |

## 怎么跑 · Running the tools

预览立绘（任意静态服务器起在仓库根目录）：

```bash
npx serve .        # 或 python -m http.server
# 打开 /FivePhases/tools/portrait-preview.html
```

参数：`?bones=0` 隐藏骨骼，`?labels=1` 显示部件名，`?bg=0` 透明底，`?id=fire` 选角色。

导出与校验：

```bash
node FivePhases/tools/spine-export.mjs     # → assets/spine/*.skeleton.json + *.manifest.json
node FivePhases/tools/parts-table.mjs      # → docs/PORTRAIT-PARTS.md
node --test FivePhases/src/portrait/spine.test.mjs
```

## 立绘为什么是代码画的 · Why the portraits are drawn in code

一开始打算用 AI 生成整张立绘，验证过可行（透明底、1024×1536 RGBA 正常）。但整张位图**拆不出骨骼**，等于把演出能力锁死——而这个 Demo 的卖点之一就是立绘要能动。

所以改成：先用代码按 Spine 的槽位结构画出占位件，把**骨骼、层序、尺寸、轴心、旋转**这五样定死，写成一份部件清单。这份清单就是合同：

```
部件清单 ──现在：代码画形状，能跑能演能调
        └─将来：只填 image 字段，换成真美术，骨骼与动画一行不改
```

将来要提升画面品质，照 `assets/spine/<角色>.manifest.json` 里的 `size` 一张张出 PNG 就行，轴心位置已经写在 `pivot` 里，图集由打包器出。skeleton.json 不用动。

## 与引擎的关系 · Relation to the engine

这个仓库是 Egret Rebuild 的玩法验证场，每个游戏都是一次"用真实玩法压测引擎某条路径"的实验。本作要压的是：**2D 共享渲染在高频重绘下的稳定性**（棋盘每帧重绘）与 **Spine 立绘在卡面上的开销**。引擎升级后这个 Demo 要跟着适配。
