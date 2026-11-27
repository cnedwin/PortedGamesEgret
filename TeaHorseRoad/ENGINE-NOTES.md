# 引擎笔记 · Engine notes

做《茶马古道》时记下的新白鹭引擎（[Egret_rebuild](https://github.com/cnedwin/Egret_rebuild)，提交 `687037a`）的缺口、问题、文档不清处和建议。原则是：要求的能力一律用引擎 API 实现；引擎缺的或别扭的，不在游戏里另写一套替代品，而是用引擎已有的部件把效果拼出来、在这里写明。每条写了现象、游戏里的处理和建议。

游戏后来升级到 `8637ace`（引擎 #423–#485），每条的「游戏里」写了升级后的做法；第 25–28 条是升级时新记下的。现用引擎提交 `72be4978226951c0727262e81da87f1aa7e15242`；第 25、26 条已由引擎正式实现。

Gaps, problems, unclear documentation and suggestions found in the new Egret engine
([Egret_rebuild](https://github.com/cnedwin/Egret_rebuild), commit `687037a`) while making *Tea Horse Road*. The rule:
every capability asked for is done through the engine's API; where the engine lacks something or makes it awkward, the
game does not write its own replacement but builds the effect from parts the engine has, and it is written down here.
Each item gives what happens, what the game does and a suggestion.

The game later moved to `8637ace` (engine #423–#485); each item's "in the game" says what it does now, and items 25–28
were written during that move. The game now uses `72be4978226951c0727262e81da87f1aa7e15242`; the engine officially implements items 25 and 26.

类别 · Kinds: **缺陷 / bug** · **缺口 / gap** · **文档 / docs** · **别扭 / awkward**；状态 · Status: **未解决 / open**：引擎还没有改 · nothing changed in the engine yet

---

## 3D 渲染 · Rendering

### 1. 布和绳的网格移动后被视锥剔除掉 · Cloth and rope meshes are culled once they move — 缺陷 / bug · 已在 `79cad81` 解决 / resolved in `79cad81`
<!-- engine-note: {"id": "TeaHorseRoad#1", "status": "resolved", "topic": "cloth-rope-culling"} -->

- 现象：`Cloth3D` / `Rope3D` 的 `update()` 每帧改写顶点，调用 `attribute.touch()` 和 `geometry.invalidateBounds()`；但 `Mesh3D.worldBoundingSphere` 按 `geometry.version`（`Resource3D` 的版本号）缓存世界包围球，这两个调用都不改这个版本号。于是包围球一直停在网格刚建好的位置，车开出去几十米，篷布和捆绳就被视锥剔除、消失了。`Rope3D.createMesh` 还特意设了 `frustumCulled = true`。
- 游戏里：原先车上的篷布和绳子设 `mesh.frustumCulled = false`。升级到 `8637ace` 后去掉了，按默认剔除；在无头 Chromium 里车队开出 370 米后，篷布和捆绳的包围球都还在车上。
- 建议：`invalidateBounds()` 同时递增几何体版本号，或者包围球缓存也看包围盒是否被作废。

- What happens: `Cloth3D` and `Rope3D` rewrite their vertices in `update()` and call `attribute.touch()` and
  `geometry.invalidateBounds()`; but `Mesh3D.worldBoundingSphere` caches the world sphere on `geometry.version` (the
  `Resource3D` version), which neither call changes. The sphere stays where the mesh was made, and once the truck has
  driven some tens of metres its tarp and lashings are frustum-culled and vanish. `Rope3D.createMesh` even sets
  `frustumCulled = true`.
- In the game: the trucks' tarps and ropes used to have `mesh.frustumCulled = false`. Since the move to `8637ace` they
  are culled as usual; in headless Chromium, after the convoy had driven 370 m, the bounds of every tarp and lashing were
  still on the trucks.
- Suggestion: have `invalidateBounds()` also bump the geometry's version, or key the sphere cache on the bounds too.
- 状态 · Status：已在 `79cad81` 解决（引擎 #425）：移动的布和绳重新算包围球，不再被剔除。 · Resolved in `79cad81` (engine #425): moving cloth and rope recompute their bounds and are no longer culled.

### 2. 实例网格没有距离剔除和 LOD · No distance culling or LOD for instanced meshes — 缺口 / gap · 部分解决 / partly resolved
<!-- engine-note: {"id": "TeaHorseRoad#2", "status": "partly", "topic": "instanced-lod"} -->

- 现象：草木按 192 米的地块各成一组 `InstancedMesh3D`。第一版在「低」画质下一帧画了 630 万个三角形（大半是茶树丛），软件渲染下只有 1.3 帧。引擎的实例网格只有整体视锥剔除，没有按距离隐藏或换低模的办法。
- 游戏里：每个地块的树各有一份近处的精细几何和一份远处的简化几何（都是 `InstancedMesh3D`），茶园再切成 3×3 的小格，近处画一丛一丛的茶树、远处画成一条条茶垄；每帧按相机距离切换 `visible`。降到「低」40 万、「高」100 万个三角形。
- 建议：给 `InstancedMesh3D` 一个 `maxDistance` 或按实例的距离剔除，或一个 `createLod3D`（文档里 `serializeScene3D` 提到 level-of-detail groups，但没找到公开的建法）。
- 升级到 `8637ace` 后：碎草和碎石改用 `cullDistance`（过了细节距离既不画也不投影）。树和茶的远近两种仍由游戏切换：`Lod3D` 按到自己原点的三维距离选级，而游戏要的是相机到地块最近一点的地面距离，192 米的地块里两者最多差 136 米（半条对角线）。建议 `Lod3D` 也能像 `cullDistance` 那样按包围体的近侧量，或只量水平距离。

- What happens: plants are one `InstancedMesh3D` per kind per 192 m tile. The first version drew 6.3 million
  triangles a frame on *Low* (mostly tea bushes) and ran at 1.3 fps under software rendering. Instanced meshes are only
  culled as a whole by the frustum; there is no way to hide them by distance or swap in a simpler shape.
- In the game: each tile's trees have a detailed near geometry and a simple far one (both `InstancedMesh3D`), and the
  tea gardens are cut into 3 × 3 cells drawn as single bushes near the camera and as plain hedge strips further off;
  `visible` is switched each frame by the distance to the camera. *Low* now draws 0.4 million triangles, *High* 1 million.
- Suggestion: a `maxDistance` or per-instance distance culling on `InstancedMesh3D`, or a `createLod3D` (the
  `serializeScene3D` docs mention level-of-detail groups, but there is no documented way to make one).
- Since the move to `8637ace`: tufts and scree use `cullDistance` (past the detail distance neither drawn nor
  shadowed). Trees and tea still switch between their two shapes in the game: `Lod3D` chooses by the 3D distance to its
  own origin, while the game wants the ground distance from the camera to the nearest point of the tile, and on a
  192 m tile the two differ by up to 136 m (half the diagonal). Suggest letting `Lod3D` measure to the near side of its bounds, as
  `cullDistance` does, or on the ground alone.
- 状态 · Status：部分解决（引擎 #425，`79cad81`）：网格有了 `cullDistance`，近远两个版本用 `Lod3D`；按实例的距离剔除还没有，`cullDistance` 对整组实例生效。 · Partly resolved (engine #425, `79cad81`): meshes have `cullDistance` and `Lod3D` takes a near and a far version; culling instance by instance is not there yet, `cullDistance` acting on the whole set.

### 3. 大气后期把天空也当成雾 · The atmosphere pass fogs the sky — 别扭 / awkward · 已在 `79cad81` 解决 / resolved in `79cad81`
<!-- engine-note: {"id": "TeaHorseRoad#3", "status": "resolved", "topic": "atmosphere-fogs-sky"} -->

- 现象：`createAtmosphere3D` 的雾按每个像素的深度积分，天空背景在远平面上，地平线附近被雾色完全盖住，天空发灰；没有排除天空或单独设定天空雾量的选项。
- 游戏里：调了三段路的天空渐变和雾色，让雾色本身接近地平线的天色；黄昏时雾色和天空一起变暖。升级到 `8637ace` 后没有设 `skyFog`（默认 1，与升级前一样）：软件渲染下天空盒是黑的（第 4 条），这里看不出天空少雾以后的样子，留到真显卡上再调。
- 建议：给天空像素（深度为 1）单独的雾量或直接跳过，或提供 `skyFog` 参数。

- What happens: the fog of `createAtmosphere3D` integrates along each pixel's depth; the sky background is at the far
  plane, so near the horizon it is entirely fog-coloured and the sky looks grey. There is no option to leave the sky out
  or give it its own amount.
- In the game: the sky gradients and fog colours of the three legs are tuned so the fog colour is close to the horizon's;
  at dusk both warm together. Since the move to `8637ace` `skyFog` is left at its default of 1, as before: under
  software rendering the skybox is black (item 4), so the sky with less fog cannot be judged here; that waits for a real
  GPU.
- Suggestion: a separate fog amount for sky pixels (depth 1), or skip them, or a `skyFog` option.
- 状态 · Status：已在 `79cad81` 解决（引擎 #425）：大气后期有了 `skyFog`，天空不再按地面的雾量算。 · Resolved in `79cad81` (engine #425): the atmosphere pass has `skyFog`, so the sky is not fogged as the ground is.

### 4. 软件渲染下天空盒是黑的 · The skybox is black under software rendering — 缺陷？/ bug? · 未解决 / open
<!-- engine-note: {"id": "TeaHorseRoad#4", "status": "open", "topic": "skybox-black-software"} -->

- 现象：在无头 Chrome 的 SwiftShader（WebGL2）里，`scene.background = createGradientCubeTexture3D(...)` 画出来是黑的：天空盒那个全屏三角形确实画了（3 个顶点、深度比较 LEQUAL），但采样结果是黑色；把同一个立方体贴图设为 `scene.environment`，一个全金属小球也是黑的。一个只有相机和天空盒的最小页面就能复现。没有在真显卡上验证，可能只是 SwiftShader 的问题。
- 游戏里：天空仍然交给引擎的天空盒（`backgroundIntensity` 1.9），地平线一带由大气雾的颜色撑起来；所以在软件渲染的截图里，天顶偏暗。
- 建议：用软件渲染跑一遍天空盒和环境贴图的回归测试；若是立方体贴图在 sRGB + 生成 mipmap 时的问题，给出降级路径。

- What happens: under SwiftShader (WebGL2) in headless Chrome, `scene.background = createGradientCubeTexture3D(...)` comes
  out black: the skybox's full-screen triangle is drawn (3 vertices, LEQUAL depth test) but samples black, and a fully
  metallic ball with the same cube as `scene.environment` is black too. A page with only a camera and the skybox shows
  it. Not checked on a real GPU; it may be SwiftShader alone.
- In the game: the sky is still the engine's skybox (`backgroundIntensity` 1.9), with the horizon carried by the colour
  of the atmosphere's fog; so in software-rendered pictures the zenith is dark.
- Suggestion: a software-rendered regression check of the skybox and environment maps, and a fallback if it is the cube
  map's sRGB format with generated mipmaps.

### 5. 地形流没有「地块离相机多远」的回调 · The terrain stream says nothing of a tile's distance — 缺口 / gap · 已在 `887f2d8` 解决 / resolved in `887f2d8`
<!-- engine-note: {"id": "TeaHorseRoad#5", "status": "resolved", "topic": "terrain-tile-distance"} -->

- 现象：`createTerrainStream3D` 的 `onLoad` / `onUnload` 让游戏在地块上撒草木，但分块的 LOD 切换在引擎内部完成，游戏拿不到地块当前的距离或细节级别，只能自己再算一遍（见第 2 条）。
- 建议：`onLevelChange(tile, level)` 或公开地块的当前 LOD。

- What happens: `onLoad` and `onUnload` of `createTerrainStream3D` let the game scatter plants over a tile, but the
  chunks' LOD changes inside the engine and the game cannot see a tile's distance or level, so it works it out again
  (see item 2).
- Suggestion: an `onLevelChange(tile, level)` callback, or the tile's current LOD made public.
- 游戏里 · In the game：草木按相机距离自己切换远近两种几何（第 2 条）。升级后仍自己算：`stream.distanceOf` 量的是地形流跟着的车队，草木的远近要按相机 · the plants switch between a near and a far shape by the camera's distance (item 2); still worked out by the game, as `stream.distanceOf` measures from the convoy the stream follows, and the plants go by the camera.
- 状态 · Status：已在 `887f2d8` 解决（引擎 #426）：地形流有了 `stream.distanceOf`。 · Resolved in `887f2d8` (engine #426): the terrain stream has `stream.distanceOf`.

### 6. 高度场以原点为中心，地块以角为原点 · Height fields are centred, stream tiles are not — 文档 / docs · 已在 `887f2d8` 解决 / resolved in `887f2d8`
<!-- engine-note: {"id": "TeaHorseRoad#6", "status": "resolved", "topic": "heightfield-origin"} -->

- 现象 · What happens：`createHeightField3D` 的场以自身中心为原点，而地形流把第 (tx, tz) 块放在 `((tx + 0.5) · size, 0, (tz + 0.5) · size)`。在地块上取高度要先减去地块中心：`field.heightAt(x - cx, z - cz)`。文档没有把两者放在一起说明，第一次撒的树全都悬空。建议在 `createTerrainStream3D` 一节写明地块中心和 `field` 坐标的关系，或给 `tile.heightAt(worldX, worldZ)`。
- A `createHeightField3D` field has its origin at its centre, while the stream puts tile (tx, tz) at
  `((tx + 0.5) · size, 0, (tz + 0.5) · size)`. Sampling a tile needs the centre subtracted:
  `field.heightAt(x - cx, z - cz)`. The docs do not put the two side by side, and the first trees floated. Suggest
  stating the relation in the `createTerrainStream3D` section, or a `tile.heightAt(worldX, worldZ)`.
- 游戏里 · In the game：取高度前先减去地块中心，`field.heightAt(x - cx, z - cz)`；升级后地形碰撞体和草木用 `tile.center`，在 Worker 里铺草木时手上没有地块对象，仍按 `(x + 0.5) · size` 算 · subtract the tile's centre before reading a height; since the upgrade the ground's collider and the plants take `tile.center`, while the worker that plans the plants, which has no tile object, still works it out.
- 状态 · Status：已在 `887f2d8` 解决（引擎 #426）：`TerrainTile3D.center` 给出地块中心，文档写明了两种原点。 · Resolved in `887f2d8` (engine #426): `TerrainTile3D.center` gives a tile's centre, and the documents explain both origins.

### 7. 浏览器入口和核心入口的分工 · What lives in the browser entry — 文档 / docs · 已写入文档 / documented
<!-- engine-note: {"id": "TeaHorseRoad#7", "status": "documented", "topic": "browser-entry-contents"} -->

- 现象 · What happens：`createAudioListener3D`、`createPositionalAudio3D`、`createOrbitControls3D`、`createTransformControls3D`、`createScreenMarkers3D`、`createAtmosphere3D`、`createWorld3DOverlay` 只在 `@egret/engine/webgl2/world3d`（和 webgpu 入口）里，`@egret/engine/world3d` 没有。`world3d.md` 只对其中一部分写了「from the browser entry」，音频那一句没写，第一次从核心入口导入时页面直接报模块错误。建议在 world3d.md 开头列一张「哪个函数在哪个入口」的表。
- `createAudioListener3D`, `createPositionalAudio3D`, `createOrbitControls3D`, `createTransformControls3D`,
  `createScreenMarkers3D`, `createAtmosphere3D` and `createWorld3DOverlay` are only in `@egret/engine/webgl2/world3d`
  (and the WebGPU entry), not in `@egret/engine/world3d`. `world3d.md` says "from the browser entry" for some of them
  but not for the audio, and the first import from the core entry failed with a module error. Suggest a table of which
  function is in which entry at the top of world3d.md.
- 游戏里 · In the game：这些函数一律从 `@egret/engine/webgl2/world3d` 导入 · these are all imported from `@egret/engine/webgl2/world3d`.
- 状态 · Status：已写入文档（引擎 #425，`79cad81`）：文档写明了浏览器入口和核心入口各有什么。 · Documented (engine #425, `79cad81`): the documents say what the browser entry and the core entry each hold.

### 8. `createDecal3D` 改写传入的材质 · `createDecal3D` changes the material it is given — 别扭 / awkward · 未解决 / open
<!-- engine-note: {"id": "TeaHorseRoad#8", "status": "open", "topic": "decal-changes-material"} -->

- 现象 · What happens：`createDecal3D(mesh, material, …)` 会把传入材质的 `depthWrite` 设为 false、补上 `polygonOffset`。共用一份泥点材质没有问题，但这是对调用方对象的副作用，文档没提。建议写明，或在内部复制材质。
- `createDecal3D(mesh, material, …)` sets the given material's `depthWrite` to false and fills in `polygonOffset`. With
  one shared mud material that is fine, but it changes the caller's object and the docs do not say so. Suggest saying
  it, or copying the material inside.
- 游戏里 · In the game：泥点共用一份专门给贴花的材质，不和车身共用 · the mud uses one material kept for decals, never shared with the body.

## 物理与模拟 · Physics and simulation

### 9. `Cloth3D` 的 `right` / `down` 是整条边 · `right` and `down` of `Cloth3D` are whole edges — 文档 / docs · 已写入文档 / documented
<!-- engine-note: {"id": "TeaHorseRoad#9", "status": "documented", "topic": "cloth-edges"} -->

- 现象：网格点按 `origin + right · u + down · v`（u、v 从 0 到 1）摆放，`right` 和 `down` 是整块布的宽和高。名字读起来像相邻两点的间距，第一版按间距传，整块篷布和每一串经幡都缩成一团。
- 建议：在 `ClothOptions3D` 的注释和文档里写明「整条边的向量」。

- What happens: the points are placed at `origin + right · u + down · v` with u and v from 0 to 1, so `right` and
  `down` are the whole width and height of the sheet. The names read like the step between neighbours; passed that way,
  the tarp and every line of flags collapsed into a knot.
- Suggestion: say "the vector of the whole edge" in the `ClothOptions3D` comments and the docs.
- 游戏里 · In the game：`right` / `down` 按整块布的宽和高传 · `right` and `down` are passed as the whole width and height.
- 状态 · Status：已写入文档（引擎 #423，`b3523fa`）：写进了 guide 卡片 cloth-and-rope（整条边）。 · Documented (engine #423, `b3523fa`): written into the cloth-and-rope guide card (whole edges).

### 10. 绳子的 `slack` 是多出来的比例 · A rope's `slack` is the extra share — 文档 / docs · 已写入文档 / documented
<!-- engine-note: {"id": "TeaHorseRoad#10", "status": "documented", "topic": "rope-slack"} -->

- 现象：`createRope3D` 的 `slack` 是「比两端距离多出的比例」，0 是绷直，0.1 是长一成；绳子先按长度摆直、挤在两端之间，再自己垂成弧线。第一版把它当成「长度倍数」传了 1.0028、1.33，吊桥主索成了两倍长、在桥下来回打折，车上的捆绳松垮垮地垂着。
- 游戏里：主索 `slack: 0.0028`（垂到扶手上方），扶手按吊杆分成八段短绳 `slack: 0.01`，捆绳 `0.33`。
- 建议：在 `RopeOptions3D` 的注释和文档里写明含义和常用范围；`slack ≥ 1` 时在开发模式下给一句警告。

- What happens: `slack` of `createRope3D` is the share by which the rope is longer than the distance between its ends —
  0 is taut, 0.1 a tenth longer; the rope is laid out straight, bunched between its ends, and falls into its curve. The
  first version took it for a length factor and passed 1.0028 and 1.33: the bridge cables came out twice as long and
  folded back and forth under the deck, and the lashings on the trucks hung loose.
- In the game: the cables have `slack: 0.0028` (dipping to just above the hand ropes), each hand rope is eight short
  ropes between hangers at `0.01`, the lashings `0.33`.
- Suggestion: say what it means and its usual range in the `RopeOptions3D` comments and the docs; warn in development
  when `slack ≥ 1`.
- 状态 · Status：已写入文档（引擎 #423，`b3523fa`）：写进了 guide 卡片 cloth-and-rope（`slack` 是多出来的比例）。 · Documented (engine #423, `b3523fa`): written into the cloth-and-rope guide card (`slack` is the extra share).

### 11. 布和绳钉在刚体上是单向的 · Pinning cloth and rope to a body is one-way — 文档 / docs · 已写入文档 / documented
<!-- engine-note: {"id": "TeaHorseRoad#11", "status": "documented", "topic": "cloth-pin-one-way"} -->

- 现象 · What happens：`pin(…, body)` / `pinPoint(i, body)` 让点跟着刚体走，但不对刚体施力：篷布挂在车上不会拖车。这正是想要的，但文档没说，第一次以为车开不动是篷布拖住了。建议写一句「钉住的点跟随刚体，不反作用于它」。
- `pin(…, body)` and `pinPoint(i, body)` make points follow the body but put no force on it: a tarp tied to a truck
  does not drag it. That is what the game wants, but the docs do not say so. Suggest one sentence: pinned points follow
  the body and do not act on it.
- 游戏里 · In the game：篷布钉在车身刚体上，只跟随不拖车 · the tarps are pinned to the truck body and follow it.
- 状态 · Status：已写入文档（引擎 #423，`b3523fa`）：写进了 guide 卡片 cloth-and-rope（单向钉住）。 · Documented (engine #423, `b3523fa`): written into the cloth-and-rope guide card (one-way pins).

### 12. 车轮节点在世界坐标里 · Wheel nodes are placed in world space — 文档 / docs · 已写入文档 / documented
<!-- engine-note: {"id": "TeaHorseRoad#12", "status": "documented", "topic": "wheel-nodes-world-space"} -->

- 现象 · What happens：`createVehicle3D` 把车轮的 `node` 摆在世界坐标里，所以车轮节点要加在场景根上，而不是车身节点下面；加在车身下面车轮会飞到两倍远。文档有一句，但容易漏看。建议在示例代码里写出 `scene.addChild(wheel.node)`。
- `createVehicle3D` places each wheel's `node` in world space, so wheel nodes go under the scene root, not under the
  chassis node (there they end up twice as far out). The docs say so in a sentence that is easy to miss. Suggest
  showing `scene.addChild(wheel.node)` in the example.
- 游戏里 · In the game：车轮节点加在场景根上 · the wheel nodes are added to the scene root.
- 状态 · Status：已写入文档（引擎 #425，`79cad81`）：World3D 文档写明车轮的 `node` 每次更新放在世界坐标里，要加在场景根上。 · Documented (engine #425, `79cad81`): the World3D document says a wheel's `node` is placed in world space each update and belongs on the scene's root.

### 13. 导航体只写位置 · A navigation agent writes only the position — 缺口 / gap · 已在 `887f2d8` 解决 / resolved in `887f2d8`
<!-- engine-note: {"id": "TeaHorseRoad#13", "status": "resolved", "topic": "nav-agent-position-only"} -->

- 现象 · What happens：`NavCrowd3D` 的 agent 给了 `node`，每帧只写 `node.position`，不转身。山匪和狼的朝向由游戏按 `agent.velocity` 平滑转过去。建议加 `faceVelocity` 选项（带转身速度）。
- An agent of `NavCrowd3D` with a `node` only writes `node.position` each frame and does not turn it. The game turns
  the bandits and wolves toward `agent.velocity` itself, smoothly. Suggest a `faceVelocity` option with a turn rate.
- 游戏里 · In the game：山匪和狼的朝向仍按 `agent.velocity` 由游戏平滑转过去：引擎的 `heading` 以 -Z 为前方，本作的人物和狼面向 +Z，见第 27 条 · bandits and wolves still turn toward `agent.velocity` in the game: the engine's `heading` takes -Z as the front, and these figures face +Z (item 27).
- 状态 · Status：已在 `887f2d8` 解决（引擎 #426）：导航体有了 `turnSpeed` 和 `heading`。 · Resolved in `887f2d8` (engine #426): navigation agents have `turnSpeed` and `heading`.

### 14. 导航网格要自己从地形铺 · A navigation mesh has to be laid over the terrain by hand — 缺口 / gap · 已在 `887f2d8` 解决 / resolved in `887f2d8`
<!-- engine-note: {"id": "TeaHorseRoad#14", "status": "resolved", "topic": "navmesh-over-terrain"} -->

- 现象 · What happens：`createNavMesh3D` 接受几何或顶点数组，但没有从 `HeightField3D` / 地形流直接生成的办法。游戏为每处埋伏按 3 米网格取地面高度，自己拼出三角形，再用 `setEnabled` 关掉水面和障碍下的三角形。建议 `createNavMesh3D(heightField, { region, cellSize })`，以及按圆形障碍挖洞的选项。
- `createNavMesh3D` takes a geometry or arrays, but cannot be made from a `HeightField3D` or the terrain stream. For
  each ambush the game samples the ground on a 3 m grid, builds the triangles itself and switches off the ones in water
  and under obstacles with `setEnabled`. Suggest `createNavMesh3D(heightField, { region, cellSize })` and an option to
  cut holes for round obstacles.
- 游戏里 · In the game：每处埋伏按 3 米网格取地面高度拼三角形，`setEnabled` 关掉水面和障碍下的三角形。升级后仍这样做，原因见第 28 条 · each ambush lays a 3 m grid over the ground and disables triangles under water and obstacles; still so after the upgrade, for the reasons in item 28.
- 状态 · Status：已在 `887f2d8` 解决（引擎 #426）：`createNavMesh3D` 能直接从 `HeightField3D` 铺。 · Resolved in `887f2d8` (engine #426): `createNavMesh3D` lays a mesh over a `HeightField3D` itself.

## 声音 · Sound

### 15. 正在播放的声音不能改音高 · A playing voice cannot be re-pitched — 缺口 / gap · 已在 `887f2d8` 解决 / resolved in `887f2d8`
<!-- engine-note: {"id": "TeaHorseRoad#15", "status": "resolved", "topic": "voice-repitch"} -->

- 现象：`PositionalAudio3D.playbackRate` 只在 `play()` 开新声部时读一次；循环的发动机声开着以后，改这个属性没有效果。
- 游戏里：保存 `play()` 返回的 `AudioBufferSourceNode`，每帧直接设它的 `playbackRate.value`，让发动机音高跟着车速走。升级到 `8637ace` 后改为每帧设声源的 `playbackRate`，不再自己留着节点（`src/audio/soundscape.mjs`）。
- 建议：`playbackRate` 的 setter 同时作用到正在播放的声部，或提供 `setPlaybackRate(rate, rampSeconds)`。

- What happens: `PositionalAudio3D.playbackRate` is read once, when `play()` starts a voice; changing it while a looping
  engine sound plays does nothing.
- In the game: the `AudioBufferSourceNode` returned by `play()` is kept and its `playbackRate.value` set each frame, so
  the engine's pitch follows the truck's speed. Since the move to `8637ace` the game sets the source's `playbackRate`
  instead and keeps no node of its own (`src/audio/soundscape.mjs`).
- Suggestion: have the `playbackRate` setter reach the playing voices too, or add `setPlaybackRate(rate, rampSeconds)`.
- 状态 · Status：已在 `887f2d8` 解决（引擎 #426）：`PositionalAudio3D.playbackRate` / `setPlaybackRate(rate, rampSeconds)` 作用于正在播放的声音。 · Resolved in `887f2d8` (engine #426): `PositionalAudio3D.playbackRate` / `setPlaybackRate(rate, rampSeconds)` act on a playing voice.

### 16. 定位声音没有从采样直接建的入口 · No way to make a positional sound from samples — 别扭 / awkward · 已在 `887f2d8` 解决 / resolved in `887f2d8`
<!-- engine-note: {"id": "TeaHorseRoad#16", "status": "resolved", "topic": "positional-sound-from-samples", "workaround": ["src/audio/soundscape.mjs"]} -->

- 现象 · What happens：`AudioListener3D.load(url)` 从网址解码；合成的声音只能用 `listener.context.createBuffer` 自己装进 `AudioBuffer`。可以接受，但 2D 的混音器有 `encodeWav` + `decode`，3D 这边没有对应的说明。建议给 `listener.bufferFrom(samples, rate)` 或在文档里给出这种写法。
- `AudioListener3D.load(url)` decodes from an address; synthesized sound has to go into an `AudioBuffer` through
  `listener.context.createBuffer`. Workable, but the 2D mixer has `encodeWav` + `decode` and the 3D side has nothing
  said about it. Suggest `listener.bufferFrom(samples, rate)`, or the pattern in the docs.
- 游戏里 · In the game：原先用 `listener.context.createBuffer` 把合成的采样装进 `AudioBuffer`；升级到 `8637ace` 后改用 `listener.bufferFrom(samples, RATE)`（`src/audio/soundscape.mjs`） · synthesized samples used to go into an `AudioBuffer` through `listener.context.createBuffer`; since the move to `8637ace` through `listener.bufferFrom(samples, RATE)`.
- 状态 · Status：已在 `887f2d8` 解决（引擎 #426）：`listener.bufferFrom` 从采样建定位声音。 · Resolved in `887f2d8` (engine #426): `listener.bufferFrom` makes a positional sound from samples.

## 界面 · Interface

### 17. 叠加层的舞台大小固定 · The overlay's stage size is fixed — 缺口 / gap · 已在 `1bfe818` 解决 / resolved in `1bfe818`
<!-- engine-note: {"id": "TeaHorseRoad#17", "status": "resolved", "topic": "overlay-stage-size"} -->

- **现象 · What happens**：早期叠加层的舞台宽高固定，画布拉伸后界面变形。 · Earlier overlays stretched their fixed logical stage to the canvas box, squashing the UI.
- **游戏里 · In the game**：现用 `createWorld3DOverlay(canvas, {width:1066,height:600,fit:'expand'})`，利用 `game.screen` 与 `game.onScreenChange` 原地摆放现存节点；满屏背景使用舞台，贴边组使用安全区，居中卡片以舞台中心为基准。语义投影只创建一次，用 `projection.sync({width,height})` 同步实际舞台尺寸及节点边界。手机竖屏保留转屏提示，平板竖屏仍能直接游玩。 · One expanded native overlay; relayout existing controls using the current screen and safe rectangle, fill the full stage where appropriate, and sync the existing semantic projection in place. Phone rotation prompt remains; portrait tablet stays usable.
- **状态 · Status**：已在 `1bfe818` 解决（#427）比例适配；`72be497` 的原生扩展舞台、屏幕变化及逻辑语义尺寸更新已用于本作。 · Proportional overlay fit was resolved in #427. The 72be497 native expanding stage and responsive semantic geometry are now used in the game.

### 18. 打开模态对话框时焦点和语义 · Focus and semantics when a modal dialog opens — 别扭 / awkward · 已在 `1bfe818` 解决 / resolved in `1bfe818`
<!-- engine-note: {"id": "TeaHorseRoad#18", "status": "resolved", "topic": "modal-focus-semantics"} -->

- 现象：语义树里加了 `modal: true` 的对话框后，对话框外仍持有键盘焦点的条目变成「被聚焦又是 inert」，下一次 `publish()` 直接抛 `UI_SEMANTICS_FOCUS`；对话框里的按钮如果没写 `parent` 指向对话框，也会被判为 inert，同样抛错。错误从界面帧里抛出，暂停卡第一次就没打开。
- 游戏里：卡片打开前先 `keyboard.focus(undefined)`，关闭时把焦点还回去；卡片里所有控件的语义条目都以对话框为 `parent`（界面零件加了 `semanticParent`）。升级后这两样都保留：前者是把焦点移进卡片的正常做法，后者是对话框里的条目不被当成 inert 的条件；`publish()` 不再因此抛错。
- 建议：打开模态对话框时自动把焦点移进去（或清掉），`publish()` 对这种情况给警告而不是抛错；在 semantics 文档里写明模态对话框的子条目必须声明 `parent`。

- What happens: once a dialog with `modal: true` is in the semantic tree, an entry outside it that still holds the
  keyboard focus is "focused and inert", and the next `publish()` throws `UI_SEMANTICS_FOCUS`; buttons in the dialog
  without `parent` pointing at it are inert too and throw the same. The error came out of the interface's frame, and the
  pause card failed to open the first time.
- In the game: before a card opens it calls `keyboard.focus(undefined)` and gives the focus back on closing; every
  control in a card has the dialog as its semantic `parent` (the kit gained a `semanticParent`). Both stay after the
  upgrade: the first is how the focus moves into a card, the second what keeps a card's entries from being inert;
  `publish()` no longer throws over it.
- Suggestion: move (or clear) the focus into a modal dialog when it opens, have `publish()` warn rather than throw in
  this case, and say in the semantics docs that a modal dialog's children must declare `parent`.
- 状态 · Status：已在 `1bfe818` 解决（引擎 #427）：`modal: true` 的对话框发布时，对话框以外的语义节点都是 inert，不接受任何操作。 · Resolved in `1bfe818` (engine #427): while a dialog with `modal: true` is published, every semantic node outside it is inert and refuses every action.

### 19. 交互回调不能返回 Promise · Interaction callbacks may not return a promise — 文档 / docs · 已写入文档 / documented
<!-- engine-note: {"id": "TeaHorseRoad#19", "status": "documented", "topic": "ui-callback-promise"} -->

- 现象 · What happens：按钮的 `onActivate` 若是 `async` 函数（例如开场字卡的「跳过」要等文字换好），返回的 Promise 会让指针输入抛 `POINTER_INPUT_CALLBACK_FAILED`（`ASYNC_EVENT_HANDLER`）。界面零件里改为 `void onActivate()`。这是合理的约束，建议在 ui 控件的文档里写明「回调须同步返回，异步工作自己 `void` 掉」。
- If a button's `onActivate` is `async` (the opening's *Skip* waits for the words to change), the promise it returns
  makes the pointer input throw `POINTER_INPUT_CALLBACK_FAILED` (`ASYNC_EVENT_HANDLER`). The kit now calls
  `void onActivate()`. A fair rule; suggest saying in the ui controls' docs that callbacks must return synchronously and
  start async work with `void`.
- 游戏里 · In the game：界面零件里写成 `void onActivate()` · the UI parts call `void onActivate()`.
- 状态 · Status：已写入文档（引擎 #423，`b3523fa`）：写进了 guide 卡片 ui-callbacks。 · Documented (engine #423, `b3523fa`): written into the ui-callbacks guide card.

### 20. 托管界面不能在按键投递中途建 · A managed UI root cannot be made while input is being delivered — 别扭 / awkward · 已在 `1e60300` 解决 / resolved in `1e60300`
<!-- engine-note: {"id": "TeaHorseRoad#20", "status": "resolved", "topic": "ui-root-during-input"} -->

- 现象 · What happens：和《千机巧匠》笔记第 19 条相同，在 `687037a` 仍然如此：在按钮回调里直接 `createUiRoot` 会被拒绝。卡片在建根节点前先 `await Promise.resolve()` 离开这次投递。
- As item 19 of the *Mechanism City* notes, still so at `687037a`: `createUiRoot` called from a button's callback is
  refused. The card does `await Promise.resolve()` first to leave the delivery.
- 建议 · Suggestion：见上文 · see above.
- 游戏里 · In the game：原先建根节点前先 `await Promise.resolve()`；升级到 `8637ace` 后去掉了，卡片在按钮回调里直接建（`src/ui/card.mjs`），在无头 Chromium 里用鼠标按「设置」、按 Esc 暂停都能直接打开 · it used to `await Promise.resolve()` before making the root; since the move to `8637ace` a card is made straight from the button's callback, and in headless Chromium the settings button and Esc open their cards at once.
- 状态 · Status：已在 `1e60300` 解决（引擎 #424）：按钮回调里可以新建 UI 根（同 MechanismCity 第 19 条）。 · Resolved in `1e60300` (engine #424): a UI root can be made from a button callback (as MechanismCity item 19).

### 21. 变换手柄和轨道相机抢同一块画布 · Transform handles and the orbit camera share one canvas — 别扭 / awkward · 已在 `1bfe818` 解决 / resolved in `1bfe818`
<!-- engine-note: {"id": "TeaHorseRoad#21", "status": "resolved", "topic": "transform-handles-orbit-camera"} -->

- 现象 · What happens：`createTransformControls3D` 和 `createOrbitControls3D` 都监听同一块 3D 画布，文档没说两者同时用时谁先拿到按下。游戏在 `gizmo.onDraggingChanged` 里关掉/打开 `orbit.enabled`，避免拖手柄时相机也转。建议手柄命中时阻止事件继续传递，或让 `createTransformControls3D` 接受一个要暂停的 `orbit`，并在文档里给出两者同用的写法。
- `createTransformControls3D` and `createOrbitControls3D` both listen on the same 3D canvas, and the docs do not say
  which gets a press first when both are used. The game switches `orbit.enabled` in `gizmo.onDraggingChanged` so the
  camera does not turn while a handle is dragged. Suggest stopping the event when a handle is hit, or letting
  `createTransformControls3D` take an `orbit` to pause, and showing the two together in the docs.
- 游戏里 · In the game：原先在 `gizmo.onDraggingChanged` 里开关 `orbit.enabled`；升级到 `8637ace` 后去掉了。在无头 Chromium 里拖手柄，物件移动 3.5 米、相机不动；拖空白处相机照常转 · `orbit.enabled` used to be switched in `gizmo.onDraggingChanged`; since the move to `8637ace` it is not. In headless Chromium a handle dragged moved its piece 3.5 m with the camera still, and a drag on empty ground turned the camera.
- 状态 · Status：已在 `1bfe818` 解决（引擎 #427）：变换手柄在捕获阶段先接住指针，轨道相机不再抢。 · Resolved in `1bfe818` (engine #427): transform handles take the pointer in the capture phase, before the orbit camera.

### 22. 场景文档把几何体全部内嵌 · Scene documents embed every geometry — 缺口 / gap · 已在 `1bfe818` 解决 / resolved in `1bfe818`
<!-- engine-note: {"id": "TeaHorseRoad#22", "status": "resolved", "topic": "scene-documents-geometry"} -->

- 现象 · What happens：`serializeScene3D` 把每份几何体都写进文档。一座营地六件物件（代码拼的合并几何）就是约 170 KB 的 JSON，三个驿站加起来放进 localStorage 偏大。贴图有 `textureKey` / `resolveTexture`，几何体没有对应的办法。
- 建议：加 `geometryKey` / `resolveGeometry`，让游戏只存自己程序生成的几何体的名字。

- `serializeScene3D` writes every geometry into the document. A camp of six pieces (merged geometry built in code) is
  about 170 KB of JSON, heavy for localStorage across three stations. Textures have `textureKey` / `resolveTexture`;
  geometries have nothing like it.
- Suggestion: `geometryKey` / `resolveGeometry`, so a game can store just the names of its own procedural geometries.
- 游戏里 · In the game：原先存整份场景文档；升级到 `8637ace` 后同一种物件的几何只建一次、各件共用，存档里按名字（如 `tent/0`）写，读回时由 `resolveGeometry` 找回。一顶帐篷的营地从约 19 KB 降到约 1.6 KB；旧存档里整份写下的几何照样能读（`src/play/camp.mjs`、`test/camp.test.mjs`） · the whole document used to be saved; since the move to `8637ace` each kind of piece makes its geometry once, shared by every piece of that kind, and the save names it (`tent/0`), found again by `resolveGeometry`. A camp of one tent went from about 19 KB to about 1.6 KB, and camps saved earlier with whole geometries still load.
- 状态 · Status：已在 `1bfe818` 解决（引擎 #427）：场景文档有了 `geometryKey` / `resolveGeometry`。 · Resolved in `1bfe818` (engine #427): scene documents have `geometryKey` / `resolveGeometry`.

### 23. Font3D 没有现成字体 · Font3D comes without a font — 缺口 / gap · 已在 `1bfe818` 解决 / resolved in `1bfe818`
<!-- engine-note: {"id": "TeaHorseRoad#23", "status": "resolved", "topic": "font3d-without-font"} -->

- 现象 · What happens：`Font3D` 需要调用方给出每个字的轮廓。没有内置字体，也没有从 TTF/OTF 或画布读字形的工具；中文尤其麻烦。游戏用 `tools/make-glyphs.py` 按笔画画出路牌用到的 49 个字（宽笔画合并成轮廓，保留孔洞），写成 JSON。
- 建议：一个从 OpenType 字体文件取轮廓的加载器（只取用到的字），或从 `CanvasRenderingContext2D` 描边生成轮廓的工具。

- `Font3D` needs the outline of every glyph from its caller. There is no built-in font and no tool to read glyphs from
  TTF/OTF or a canvas, which is hard for Chinese in particular. The game draws the 49 glyphs its signs use stroke by
  stroke in `tools/make-glyphs.py` (strokes merged into outlines, holes kept) and writes them as JSON.
- Suggestion: a loader that takes outlines from an OpenType file (only the glyphs used), or a tool that outlines text
  drawn on a canvas.
- 游戏里 · In the game：`tools/make-glyphs.py` 按笔画画出路牌用到的 49 个字，写成 JSON。升级后仍用这份字形：`createCanvasFont3D` 取的是浏览器里的字体，各平台装的中文字体不同，石碑上的字就会因机器而变；自画的字形在哪里都一样 · `tools/make-glyphs.py` draws the 49 characters of the signs into JSON; still used after the upgrade, as `createCanvasFont3D` takes the browser's fonts, and the Chinese fonts installed differ from one machine to the next, so the steles would change with the machine; the drawn glyphs are the same everywhere.
- 状态 · Status：已在 `1bfe818` 解决（引擎 #427）：Font3D 能用画布字体生成轮廓。 · Resolved in `1bfe818` (engine #427): Font3D can make outlines from a canvas font.

## 测试与验证 · Testing and verification

### 24. 软件渲染下的帧率 · Frame rate under software rendering — 已写入文档 / documented
<!-- engine-note: {"id": "TeaHorseRoad#24", "status": "documented", "topic": "software-rendering-frame-rate"} -->

- 现象：在没有显卡的无头 Chrome（SwiftShader）里，640×360「低」画质约 5–6 帧，同尺寸「高」约 1.6 帧；关掉地形流能到 17 帧，再关大气后期到 60 帧，JS 每帧只占一两毫秒。所以自动化测试里用 `teaHorseRoad.sim(seconds, controls, auto)` 不画画面地推进游戏，再截图看结果。真机显卡上的帧率没有在这里测量。
- What happens: in headless Chrome without a GPU (SwiftShader), 640 × 360 on *Low* runs at about 5–6 fps and the same size on *High*
  at about 1.6 fps; hiding the terrain stream gives 17 fps and dropping the atmosphere pass 60, while the game's JavaScript takes
  a millisecond or two a frame. Automated runs therefore step the game without drawing through
  `teaHorseRoad.sim(seconds, controls, auto)` and take pictures after. Frame rates on real GPUs were not measured here.
- 游戏里 · In the game：自动化测试用 `teaHorseRoad.sim()` 推进 · automated runs step the game with `teaHorseRoad.sim()`.

## 升级到 8637ace 时记下的 · Written during the move to 8637ace

### 25. 2D 宿主创建时同步链接全部着色器 · The 2D host links all its programs synchronously when made — 缺口 / gap · 已在 `72be497` 解决 / resolved in `72be497`
<!-- engine-note: {"id": "TeaHorseRoad#25", "status": "resolved", "topic": "webgl2-2d-program-link-startup"} -->

- **现象 · What happens**：叠加层的 2D WebGL2 宿主曾在创建和恢复时依次编译、链接主程序、纯色、合成等程序，立即查询 LINK_STATUS，导致标题出现前主线程阻塞。 · The former overlay host linked and synchronously validated its programs on startup and recovery, holding the main thread before the title.
- **游戏里 · In the game**：使用引擎自身的 GLNativeSession.preparePrograms(sources, wait)，有 KHR_parallel_shader_compile 时批量链接后每 8 ms 查询完成状态；无扩展时逐个链接并在程序间让出主线程。原本本地补丁完全删除；test/webgl2-startup.test.mjs 继续检查引擎契约。 · The official implementation batches links and polls at 8 ms with KHR, or yields between serial links without it; the regression tests retain the same contract.
- **状态 · Status**：已在 72be497 解决（引擎 [#525](https://github.com/cnedwin/Egret_rebuild/pull/525)），游戏的 2D 宿主直接使用正式实现。 · Resolved in 72be497 (#525); no local vendor patch.

### 26. 三角网碰撞形状不能在 Worker 里建好再交回 · A triangle mesh shape cannot be built in a worker and handed back — 缺口 / gap · 已在 `72be497` 解决 / resolved in `72be497`
<!-- engine-note: {"id": "TeaHorseRoad#26", "status": "resolved", "topic": "mesh-shape-worker-transfer"} -->

- **现象 · What happens**：每个 192 米地块需要独立三角网碰撞体；曾无法从 Worker 传递构造完成的包围层次，主线程构造会产生停顿。 · The worker-built mesh hierarchy could not formerly be adopted by the main thread.
- **游戏里 · In the game**：src/world/tileWorker.mjs 继续调用 exportBuffers()，src/world/land.mjs 用 TriangleMeshShape3D.fromBuffers(buffers) 检查后接管相同数组，无复制、无重建。非法 prepared mesh buffers 抛 WORLD3D_INPUT_INVALID；test/terrain-shape-transfer.test.mjs 继续验证碰撞查询及拒绝行为。 · The existing worker/receiver calls use the official buffer adoption and preserve collision queries; malformed buffers are rejected by the engine.
- **状态 · Status**：已在 72be497 解决（引擎 [#524](https://github.com/cnedwin/Egret_rebuild/pull/524)），不再携带本地补丁。 · Resolved in 72be497 (#524); no local vendor patch.

### 27. 导航体转身以 -Z 为前方 · A navigation agent turns with -Z as its front — 别扭 / awkward · 未解决 / open
<!-- engine-note: {"id": "TeaHorseRoad#27", "status": "open", "topic": "nav-agent-forward-axis", "workaround": ["src/play/threats.mjs"]} -->

- 现象：`turnSpeed` 让节点朝着行进方向转，前方固定是本地 -Z。本作的山匪和狼按 +Z 朝前建模，交给引擎转会倒着跑。节点不能有变换过的父节点，布娃娃又绑在模型根节点上，没法在中间加一层转 180°。
- 游戏里：不设 `turnSpeed`，仍按 `agent.velocity` 自己平滑转身（`src/play/threats.mjs`）。
- 建议：给导航体一个前方朝向（如 `forward: '+z'` 或 `headingOffset`）。

- What happens: `turnSpeed` turns the node toward the way it walks with local -Z as the front. The bandits and wolves are
  modelled facing +Z and would run backwards. The node may not have a transformed parent, and the ragdoll is bound to
  the model's root, so there is nowhere to put a parent turned half round.
- In the game: no `turnSpeed`; the game still turns them smoothly toward `agent.velocity` (`src/play/threats.mjs`).
- Suggestion: a front for an agent, such as `forward: '+z'` or a `headingOffset`.

### 28. 从高度场铺导航网格：只能是一块高度场，洞只按顶点挖 · A navigation mesh from a height field takes one field, and holes go by vertices — 缺口 / gap · 未解决 / open
<!-- engine-note: {"id": "TeaHorseRoad#28", "status": "open", "topic": "navmesh-heightfield-holes", "workaround": ["src/play/threats.mjs"]} -->

- 现象：`createNavMesh3D(heightField, { region, cellSize, holes, minHeight })` 只接一块高度场，而一处埋伏的地面横跨几块流式地块，每块各有自己的高度场。`holes` 去掉的是有顶点落在圆里的三角形：3 米一格时，半径不到 1.5 米的树干常常一个顶点都不盖住，于是没有洞。水面由 `minHeight` 判断，而这里的河是沿河道走的，不是一个高度以下。
- 游戏里：仍按 3 米网格用 `land.heightAt` 取高度自己拼三角形，按三角形中心落在障碍圆里或河道里用 `setEnabled` 关掉（`src/play/threats.mjs`）。
- 建议：接受一个取高度的函数或地形流；洞按三角形与圆是否相交（或按中心）去掉；水面可以给一个判断函数。

- What happens: `createNavMesh3D(heightField, { region, cellSize, holes, minHeight })` takes one height field, while the
  ground of an ambush spans several streamed tiles, each with its own field. `holes` drop the triangles with a vertex in
  the circle: on a 3 m grid a trunk of radius under 1.5 m often covers no vertex and makes no hole. Water goes by
  `minHeight`, while the river here follows its course rather than lying below one height.
- In the game: it still samples `land.heightAt` on a 3 m grid, builds the triangles itself, and switches off with
  `setEnabled` those whose centre is in an obstacle's circle or in the river (`src/play/threats.mjs`).
- Suggestion: accept a height function or the terrain stream; drop a triangle when it meets the circle (or by its
  centre); allow a test for water.

## 升级到 72be497 时记下的 · Written during the move to 72be497

### 29. 3D 屏幕标记不能分边避让安全区 · 3D screen markers cannot respect per-edge safe areas — 缺口 / gap · 未解决 / open
<!-- engine-note: {"id": "TeaHorseRoad#29", "status": "open", "topic": "world3d-screen-markers-safe-insets", "workaround": ["src/main.mjs", "src/ui/markers.mjs"]} -->

- **现象 · What happens**：`createScreenMarkers3D` 的 `margin` 仅接收一个 CSS px 数值，添加时固定，仅约束离屏标记的投影锚点而非整个文字标牌；手机旋转后刘海、圆角及主屏指示条位于不同边缘，无法分别避让。 · The scalar margin is immutable after registration and clamps only off-screen anchors, not entire badges; asymmetric safe insets cannot be applied per edge.
- **游戏里 · In the game**：`game.onScreenChange` 计算 `max(54, 最大安全区内缩 CSS px)`；变化时仅重新注册原有驿站标记，保留 DOM、场景目标及引擎投影。 · The largest safe inset gives a conservative scalar margin; only the marker registration changes, not the overlay or projection.
- **建议 · Suggestion**：支持分边 margin 或安全区矩形，并支持更新标记选项。 · Accept edge margins or the current screen safe rect and support changing marker options in place.
- **状态 · Status**：未解决 / open（`72be497`）。

### 30. 3D 叠加层的控件检查未纳入八屏报告 · Native 3D overlay controls are absent from the eight-screen report — 缺口 / gap · 未解决 / open
<!-- engine-note: {"id": "TeaHorseRoad#30", "status": "open", "topic": "world3d-overlay-screen-verifier-controls", "workaround": ["test/play.mjs"]} -->

- **现象 · What happens**：在 `72be497`，`verify --screens` 可截图、检查舞台尺寸与页面错误，但 World3DOverlay 使用 BrowserGame 而非 Play；没有原生的控件收据，报告不能证明 HUD/模态控件安全区、点击大小及间距。 · The verifier captures the overlay but at this pin receives native control receipts only from Play, not BrowserGame-backed World3D overlays.
- **游戏里 · In the game**：在验收脚本中读取真实引擎语义树当前可交互节点及 `game.screen.safe` 检查边界和尺寸，不更改引擎报告、不另造投影。 · The route asserts actual semantic control rectangles against the native safe area and measures CSS targets separately; no synthetic receipt.
- **建议 · Suggestion**：让 World3DOverlay 原生将活动控件及当前屏幕计划交给同一验收工具。 · Report the active overlay controls and screen plan through the same native verifier channel.
- **状态 · Status**：未解决 / open（`72be497`）。

### 31. guide 卡片只接受 LF 行尾 · Guide cards reject CRLF line endings — 缺陷 / bug · 未解决 / open
<!-- engine-note: {"id": "TeaHorseRoad#31", "status": "open", "topic": "guide-card-crlf", "workaround": [".gitattributes"]} -->

- **现象 · What happens**：Windows Git 使用 `core.autocrlf=true` 检出时，`egret-guide.mjs` 的 `parseCard` 用 LF 分隔后将首行与字面 `---` 比较，CRLF 卡片报 `a card starts with a front matter line ---`。用正式 `72be497` 导入 `parseCard`，同一官方卡片 LF 成功、转换为 CRLF 后原样复现。 · At the official pin the same card parses with LF but fails with CRLF, reproducing the Windows checkout error without editing the vendored tool.
- **游戏里 · In the game**：`.gitattributes` 仅要求官方生成的 vendor 文本检出时保留 LF；不手改任何生成文件。 · Keep generated vendor text in LF on checkout; the engine tool and generated bytes remain unmodified.
- **建议 · Suggestion**：引擎 guide 解析兼容 CRLF（例如按 `/\r?\n/` 拆分）。 · Accept CRLF in the guide parser.
- **状态 · Status**：未解决 / open（`72be497`）。
