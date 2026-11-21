# 引擎笔记 · Engine notes

本游戏发现的新白鹭引擎（提交 `f1fbd90`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (commit `f1fbd90`) while making this game, and suggestions,
written as in part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. 画布像素做的贴图上下颠倒 · Textures made from canvas pixels come out upside down — 已写入文档 / documented

- 现象 · What happens：在 2D 画布上写好牌匾和横幅的字，用 `getImageData` 的像素直接建 `Texture3D`，字是倒的：画布从上往下数行，贴图的 V = 0 在最下面一行。 · Writing painted on a canvas and turned into a `Texture3D` from its pixels came out upside down: a canvas counts rows from the top, a texture from the bottom.
- 游戏里 · In the game：`src/shapes.mjs` 复制像素时逐行倒过来再建贴图（`1330ced`）。 · The rows are copied in reverse before the texture is made.
- 建议 · Suggestion：`Texture3D` 有 `flipY` 选项（上传时翻转），本作副本 `f1fbd90` 已有；可以改用它。引擎可以再提供一个"从画布建贴图"的函数，把方向处理好。 · `Texture3D` has a `flipY` option, which this copy has; the engine could also offer a texture-from-canvas helper that gets the orientation right.
- 状态 · Status：引擎的 `Texture3D` 文档写明了 `flipY` 的含义；游戏仍自己倒行 · `flipY` is documented; the game still reverses the rows itself.

### 2. 少一个顶点色属性就是另一个着色器 · A missing vertex-colour attribute makes another program — 未解决 / open

- 现象 · What happens：拿到玉佩时它的材质第一次绘制，链接新的着色器，画面停顿。玉佩和赛车用的是同一种标准材质，只是没有顶点色，就成了另一个变体。 · The jade charm's first draw linked a new program and stalled; it used the same kind of material as the karts, but without vertex colours that is another variant.
- 游戏里 · In the game：`src/racers.mjs` 给玉佩环加一组全为 1 的顶点色，材质设 `vertexColors: true`，复用赛车已经画过的着色器；测试检查这一点（`b8b0c07`）。 · The ring gets neutral vertex colours and `vertexColors: true`, so it shares the karts' programs; a test checks it.
- 建议 · Suggestion：在 `renderer.preparePrograms` 之外，引擎可以在开发模式下报告"第一次链接"的材质和原因（哪个特性不同），方便合并变体。 · Beyond `preparePrograms`, the engine could report in development which material linked for the first time and which feature made it differ.
- 状态 · Status：游戏里已绕过；引擎没有这样的报告 · worked around here.

### 3. 水面倒影每帧都把场景再画一遍 · The water's reflection draws the scene again every frame — 已写入文档 / documented

- 现象 · What happens：`createWater3D` 的倒影每帧都把镜像场景渲染一遍，每帧多出一整遍场景绘制。 · The water's reflection rendered the mirrored scene every frame, a whole extra pass over the scene.
- 游戏里 · In the game：`src/scenery.mjs` 设 `reflection.interval = 3`，每三帧更新一次倒影（`ee391d0`）。 · The reflection updates every third frame.
- 建议 · Suggestion：按画质档给出默认的更新间隔。 · Give a default interval per quality tier.
- 状态 · Status：引擎 guide 卡片 `world3d-draw-cost` 已写明这种做法 · described in the world3d-draw-cost card.
