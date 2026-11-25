# 星旗战记 · 引擎问题与建议 · Starbanner Tactics · Engine notes

开发中遇到的引擎问题、本作的绕过办法和给引擎的建议。

Engine problems met while making this game, what the game does about them, and suggestions for the engine.

### 1. `Material3D.clone()` 与原材质共用同一个自定义着色器参数 · `Material3D.clone()` shares the custom shader's parameters with the original — 未解决 / open

- **现象 · What happens**：材质的 `shader` 是冻结的对象，`clone()` 只复制引用，所以克隆出来的材质和原材质共用同一个 `uniforms` 数组。本作每个单位要单独变灰、闪白、换阵营色，克隆材质后改一个单位的参数，同一种兵就全部跟着变了。 · A material's `shader` is a frozen object and `clone()` copies the reference, so a clone shares the original's `uniforms`; greying one unit greyed every unit of its kind.
- **绕过办法 · Workaround**：每份克隆后再用 `createCustomShader3D({ ...m.shader, uniforms: m.shader.uniforms })` 建一个新的着色器对象（同一个 `key`，程序仍然共用），见 `src/view/figures.mjs`。 · Each copy gets a fresh `createCustomShader3D` with the same key (the compiled program is still shared).
- **建议 · Suggestion**：`clone()` 对自定义着色器复制一份参数（或提供 `material.cloneWith({ uniforms })`），并在文档里写明克隆的深浅。 · Copy the parameters on `clone()` (or offer a way to), and document how deep a clone goes.
- **状态 · Status**：未解决 / open。

### 2. 只有顶点钩子的着色器写进 `glsl` 时报错不直观 · A vertex-only hook given as `glsl` fails with an unhelpful error — 未解决 / open

- **现象 · What happens**：把 `customVertex` 函数错放进 `createCustomShader3D({ glsl })`，编译时报 `'customFragment' : no matching overloaded function found`，每帧刷一次 `WORLD3D_SHADER_FAILED`。 · Putting a `customVertex` function in `glsl` fails at compile time with "no matching overloaded function", once a frame.
- **绕过办法 · Workaround**：顶点钩子放 `glslVertex` / `wgslVertex`（`src/view/board.mjs` 的草丛摇摆和水面起伏）。 · Vertex hooks go in `glslVertex` / `wgslVertex`.
- **建议 · Suggestion**：`createCustomShader3D` 检查源码里有没有对应的函数名（`customFragment`、`customVertex`、`customNormal`），放错位置时给出明确的错误；同一个失败的程序只报一次。 · Check the source names the function its slot expects and say so clearly; report a failed program once.
- **状态 · Status**：未解决 / open。

### 3. 卡通材质没有边缘光、暗部颜色和描边选项 · The toon material has no rim, shade colour or outline options — 未解决 / open

- **现象 · What happens**：`createToonMaterial3D` 只有分层数 `steps`。日系卡通渲染常用的边缘光、暗部偏色（而不是单纯变暗）、按物体的描边都要自己写。 · `createToonMaterial3D` has only `steps`; the rim light, tinted shade and per-object outline anime shading needs are left to the game.
- **游戏里 · In the game**：边缘光写在自定义片元钩子里（读 `uCameraPosition` / `frame.cameraPosition`），描边用后期的 `outlineLayers`（`src/view/toon.mjs`、`src/view/stage.mjs`）。 · The rim is in a custom fragment hook; outlines use the post-process `outlineLayers`.
- **建议 · Suggestion**：给卡通材质加 `rim`（颜色、宽度）、`shadeColor` 和可选的反向外壳描边，并在 guide 里给一个日系卡通渲染的完整例子。 · Add `rim`, `shadeColor` and an optional inverted-hull outline to the toon material, with a full example in the guide.
- **状态 · Status**：未解决 / open。

### 4. 软件渲染下帧率很低，镜头插值和时间驱动的动画脱节 · Under software rendering the frame rate is very low and eased cameras lag behind time-driven animation — 已写入文档 / documented

- **现象 · What happens**：无头 Chromium + SwiftShader 下，带阴影和后期的棋盘只有每秒 1–4 帧。按帧插值的镜头半天到不了位置，而按时间推进的走路已经走完。 · Headless Chromium with SwiftShader draws the board at 1–4 frames a second; a camera eased per frame lags while time-driven walks finish.
- **绕过办法 · Workaround**：验收脚本和截图前调用 `rig.snap()` 让镜头直接落位；单位走路、出手按时间推进，不依赖帧数（`src/view/stage.mjs`、`src/view/figures.mjs`）。 · Captures snap the camera; walks and blows advance by time.
- **建议 · Suggestion**：引擎的验收工具文档里写明软件渲染的帧率范围，以及截图前应把按帧插值的状态落位。 · Note the software-rendering frame rate in the engine's testing guide.
- **状态 · Status**：已写入文档 / documented（本条）。
