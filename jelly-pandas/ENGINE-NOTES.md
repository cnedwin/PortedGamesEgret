# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（提交 `db9772e`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (commit `db9772e`) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. 顶点布局不同就要另编一条管线 · A different vertex layout needs a pipeline of its own — 未解决 / open

- 现象 · What happens：第一发圆弹和第一颗宝石出现时画面停顿。它们和敌群用的是同类实例化材质，但网格的顶点布局不同（弹丸没有顶点色），每种都在第一次绘制时编译自己的颜色和深度管线。 · The first round shot and the first gem stalled the picture: same kind of instanced material as the horde, but a different vertex layout, so each compiled its own colour and depth pipelines on first draw.
- 游戏里 · In the game：`src/view.mjs` 把弹丸和宝石改用敌群的顶点布局（加上白色顶点色）和同一种材质，复用已经编译好的管线（`e5ca02e`、`13783f8`）。 · Shots and gems are built with the horde's vertex layout and material, so they reuse its pipelines.
- 建议 · Suggestion：在开发模式下报告第一次编译的管线是因为哪个属性不同；或者对缺少的属性用默认值，减少变体。 · Report in development which attribute made a new pipeline, or fill a missing attribute with a default to cut variants.
- 状态 · Status：游戏里已绕过 · worked around here.

### 2. 倒影通道和第一次出现的特效在第一次绘制时编译 · The mirror pass and first-use effects compile on first draw — 部分解决 / partly resolved

- 现象 · What happens：标题画面的海面倒影会剔掉熊猫的脸，倒影里第一次画到这些着色器变体时卡顿；冲击环、拖尾等特效第一次出现时也会卡顿。 · The title's sea mirror culls the panda's face, so those variants first compiled during play; the ring, trail and other effects stalled on first appearance.
- 游戏里 · In the game：`src/view.mjs` 在标题画面的倒影通道里用零面积三角形把这些变体画一遍，第一帧再画一份透明的特效样本（`f3cbec0`、`d016836`）。 · Those variants are drawn with zero-area triangles inside the title's mirror pass, and a transparent sample of each effect is drawn on the first title frame.
- 建议 · Suggestion：WebGL2 已有 `renderer.preparePrograms`（含倒影通道的描述）；WebGPU 也需要同样的预编译接口，而不是靠画一帧。 · WebGL2 has `renderer.preparePrograms`, mirror pass included; WebGPU needs the same rather than a drawn frame.
- 状态 · Status：WebGL2 一侧引擎已提供接口（`ee94fa5`）；WebGPU 一侧游戏仍靠预画 · the engine offers it for WebGL2; on WebGPU the game still draws a warm-up.
