# 引擎笔记 · Engine notes

做这款游戏时发现的新白鹭引擎（提交 `450bb9e`）的缺陷与建议，格式见 [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md) 第 3 节。

The faults found in the new Egret engine (commit `450bb9e`) while making this game, and suggestions, written as in
part 3 of [docs/GAME-STANDARD.md](../docs/GAME-STANDARD.md).

### 1. `loadGltf3D` 不认 `EXT_texture_webp` · `loadGltf3D` does not take `EXT_texture_webp` — 未解决 / open

- 现象：贴图压成 WebP 的模型会在 `extensionsRequired` 里写 `EXT_texture_webp`；`Gltf3D.js` 的 `SUPPORTED_EXTENSIONS` 里没有这一项，加载时报 `WORLD3D_GLTF_UNSUPPORTED: required extension EXT_texture_webp`，贴图也只从 `source` 或 `KHR_texture_basisu` 取。浏览器本身都能解 WebP，WebP 通常比同画质的 JPEG 小。 · What happens: a model with WebP textures lists `EXT_texture_webp` as required; the loader does not know it and refuses the file, and takes images only from `source` or `KHR_texture_basisu`, although every browser decodes WebP, usually smaller than JPEG at the same quality.
- 绕过办法：打包人物和物件时把贴图重新压成 JPEG（法线贴图质量 90 上下，其余 84–86），法线和颜色贴图按档位缩到 2048 / 1024 / 512。 · Workaround: the packing step re-encodes every texture as JPEG and resizes it per set.
- 建议：把 `EXT_texture_webp` 加进支持列表，取 `extensions.EXT_texture_webp.source` 作图源，交给已有的 `decodeImage`。 · Suggestion: accept it and take the image from `extensions.EXT_texture_webp.source`, decoded by the existing `decodeImage`.
- 状态：未解决。 · Status: open.

### 2. 粒子不给贴图时是方块 · Particles without a map are squares — 未解决 / open

- 现象：`createParticleEmitter3D` 和 `createGpuParticles3D` 不传 `map` 时，每个粒子画成实心方块，火花、尘土、雪都像像素块。文档里没有提到要自备贴图。 · What happens: without a `map` every particle is a solid square, and nothing in the docs says a sprite is needed.
- 绕过办法：在小画布上画一张柔边圆点和一张花瓣，作为 `map` 传进去（`src/view/effects.mjs` 的 `spriteTexture`）。 · Workaround: a soft dot and a petal drawn on a small canvas, passed as `map`.
- 建议：没有 `map` 时默认用一张柔边圆点，或者在材质里按到中心的距离算出圆形衰减。 · Suggestion: default to a soft round sprite, or fade by distance from the centre in the material.
- 状态：未解决。 · Status: open.

### 3. 无头 Chromium 里 WebGPU 后端画不出 3D 画面 · The WebGPU backend draws no 3D scene in headless Chromium — 未解决 / open

- 现象：无头 Chromium 开着 WebGPU 的命令行开关时，`about:blank` 上 `requestAdapter()` 返回空，但 `createWorld3DApp({ backend: 'webgpu' })` 仍然成功、报告后端是 `webgpu`、帧数在涨，控制台没有错误，画布却是一片白，只有页面上的界面。原因没有查明，也没有在有显卡的机器上试过。 · What happens: with WebGPU switched on in headless Chromium, `requestAdapter()` gives nothing on a blank page, yet the app is created as `webgpu`, frames count up, no error is logged, and the canvas stays white.
- 绕过办法：默认用 WebGL2，地址加 `?backend=webgpu` 才用 WebGPU（`src/main.mjs`）。 · Workaround: WebGL2 by default, WebGPU only on request.
- 建议：`createWorld3DApp` 拿不到适配器或设备时明确失败（或回落到 WebGL2 并在 `app.backend` 里如实报告）；给一个"第一帧是否真的画出东西"的自检。 · Suggestion: fail plainly (or fall back and say so in `app.backend`) when no adapter or device is had, and offer a check that the first frame drew something.
- 状态：未解决。 · Status: open.

### 4. `retargetAnimationClip3D` 不处理朝向不同的骨架，也不能截段、去根转、镜像 · `retargetAnimationClip3D` takes no account of rigs facing different ways, and cannot cut, still the root or mirror — 未解决 / open

- 现象：按代码，它把源骨骼相对静止姿势的世界空间旋转直接叠到目标骨骼的静止姿势上。动作捕捉的骨架面朝 +Z，生成的人物面朝 +X，这样腿往前迈会被套成往侧面迈。另外做循环动作还要截出一段帧、去掉根骨骼的转向和位移、做左右镜像，这些它都没有。 · What happens: it lays the source bone's world-space turn from rest onto the target's rest; with the capture facing +Z and the generated men facing +X, a step forward becomes a step sideways. Loops also need a frame range, a still root and mirroring, which it lacks.
- 绕过办法：离线写了 `tools/retarget.mjs`：先把两套骨架转到同一朝向，按每根骨骼静止时的指向对齐摆动，截段、去根转、可镜像，输出成每营一份紧凑的姿态数据，运行时由 `src/view/motion.mjs` 播放混合。 · Workaround: `tools/retarget.mjs` turns both rigs to one facing, aligns each bone by its rest direction, cuts, stills the root and mirrors, and writes compact pose data that `src/view/motion.mjs` plays.
- 建议：加一个 `facing`（或源、目标各自的前方向）选项，以及 `from` / `to`、`inPlace`、`mirror`（带左右骨骼名映射）。 · Suggestion: options for facing, a frame range, in-place and mirroring with a left/right name map.
- 状态：未解决。 · Status: open.

### 5. 引擎没有现成的两骨反向动力学 · No two-bone IK in the engine — 未解决 / open

- 现象：冷兵器游戏的出手、格挡、双手握持都要把手放到兵器上，引擎的动画只有按轨道播放和混合，没有反向动力学。 · What happens: every blow, guard and two-handed grip needs the hands placed on the weapon, and the engine plays and mixes clips but has no IK.
- 绕过办法：自己写了两骨 IK、肘部朝向和手腕扭转，算在模型根节点的空间里（`src/view/rig.mjs` 的 `reachArm`），姿态表在 `src/view/figure.mjs`。 · Workaround: our own two-bone IK with a pole and wrist roll (`reachArm` in `src/view/rig.mjs`).
- 建议：提供 `solveTwoBoneIK3D(root, mid, tip, target, pole)` 和"看向"约束，能在动画混合之后、蒙皮之前运行。 · Suggestion: a two-bone IK and a look-at constraint that run after mixing and before skinning.
- 状态：未解决。 · Status: open.
