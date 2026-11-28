# 引擎缺口总账 · Engine gaps ledger

由 `node tools/engine-notes.mjs --write` 从各游戏的 ENGINE-NOTES 生成，不要手改；`--check` 检查它是否过期。引擎已解决的清单抄自引擎仓库的 `guide/resolved.json`，见 [engine-resolved.json](engine-resolved.json)（15 条）。笔记格式见 [GAME-STANDARD.md](GAME-STANDARD.md) 第 3 节。

Made by `node tools/engine-notes.mjs --write` from the ENGINE-NOTES of the games; do not edit by hand, and `--check` says whether it is out of date. What the engine resolved is copied from the engine's `guide/resolved.json` into [engine-resolved.json](engine-resolved.json) (15 entries). The form of a note is in part 3 of [GAME-STANDARD.md](GAME-STANDARD.md).

24 个游戏、285 条笔记：未解决 80，部分解决 24，游戏侧绕过 18，已写入文档 42，已解决 121。

285 notes from 24 games: 80 open, 24 partly resolved, 18 worked around in the game, 42 documented, 121 resolved.

## 1. 引擎已经解决、游戏还标着未解决 · Resolved by the engine, still open in a game

刷新引擎副本（引擎仓库的 `tools/vendor-game.mjs`），去掉绕过代码，再验一遍游戏，然后改笔记的状态。「副本里有」表示游戏现在的副本已经带着这个修复；在游戏目录里运行 `node vendor/egret.mjs notes` 也会列出这些。

Refresh the engine copy (the engine's `tools/vendor-game.mjs`), take the workaround out, check the game again, then change the note's status. "In the copy" means the game's present copy already has the fix; `node vendor/egret.mjs notes` in the game's folder lists these too.

（没有 · None）

## 2. 两个以上游戏遇到的未解决缺口：在引擎里修 · Open faults that two or more games met: fix them in the engine

同一个绕过办法出现在两个以上游戏里，说明问题在引擎的接口上，应该改引擎，而不是再写一张卡片。

The same workaround in two or more games means the fault is in the engine's interface: change the engine rather than write another card.

| Topic | 游戏数 · Games | 笔记 · Notes |
|---|:-:|---|
| `static-webkit-presentation` | 5 | InquestScrolls#13 静止界面首绘仍保留旧帧 · Static screen retains prior presentation (worked-around)<br>LubanBridge#6 首屏只出现空面板 · First presentation shows empty panels (worked-around)<br>OperaDrums#24 静止模态框呈现延迟 · Static modal presentation delay (worked-around)<br>PeachCreek#10 静止页面第一次呈现不完整 · Incomplete first static presentation (worked-around)<br>TaiwanMahjong#13 静態畫面首幀未顯示 · Static screen retains an old frame (worked-around) |
| `world3d-webkit-dynamic-resize-presentation` | 4 | FiveRegiments#6 移动 Apple WebKit 动态分辨率后画面不可见 · Mobile Apple WebKit loses the composited World3D surface after dynamic resizing (open)<br>NineProvinces#9 移动 Apple WebKit 动态分辨率后画面不可见 · Mobile Apple WebKit loses the composited World3D surface after dynamic resizing (open)<br>SnowTemple#10 移动 Apple WebKit 动态分辨率后画面不可见 · Mobile Apple WebKit loses the composited World3D surface after dynamic resizing (open)<br>StarBanner#13 移动 Apple WebKit 动态分辨率后画面不可见 · Mobile Apple WebKit loses the composited World3D surface after dynamic resizing (open) |
| `webkit-on-demand-first-presentation` | 3 | jelly-pandas#10 WebKit 按需绘制的首屏可见性 · WebKit on-demand first-frame presentation (open)<br>Rally#7 WebKit 按需绘制的首屏可见性 · WebKit on-demand first-frame presentation (open)<br>Wulin#13 WebKit 按需绘制的首屏可见性 · WebKit on-demand first-frame presentation (open) |
| `webkit-retained-screen-presentation` | 3 | FPS#17 WebKit 按需画面晚一屏 · WebKit retains earlier on-demand frame (open)<br>SnowTemple#9 WebKit 按需画面晚一屏 · WebKit retains earlier on-demand frame (open)<br>StarBanner#12 WebKit 的按需画面提交晚一屏 · WebKit retains earlier on-demand frame (open) |
| `first-draw-program-link` | 2 | FPS#4 材质变体第一次绘制时链接着色器造成停顿 · The first draw of a material variant stalls while its program links (partly)<br>jelly-pandas#2 倒影通道和第一次出现的特效在第一次绘制时编译 · The mirror pass and first-use effects compile on first draw (partly) |
| `optional-web-audio-host` | 2 | CanalWatch#7 Play 可选音频宿主 · Optional Play audio host (worked-around)<br>NezhaSea#18 无 Web Audio 宿主时的游戏启动 · Startup without a Web Audio host (worked-around) |
| `ui-typography-styling` | 2 | OperaDrums#7 界面文字不能选字体 · View text has no typeface (open)<br>PeachCreek#3 文字和按钮样式需要显示对象补充 · Typography and button styling need display-object extensions (partly) |
| `vertex-layout-program` | 2 | jelly-pandas#1 顶点布局不同就要另编一条管线 · A different vertex layout needs a pipeline of its own (open)<br>Rally#2 少一个顶点色属性就是另一个着色器 · A missing vertex-colour attribute makes another program (open) |

## 3. 只有一个游戏遇到的未解决缺口 · Open faults one game met

先把教训写成引擎指南的卡片（引擎仓库 `guide/cards`），引擎能顺手修的就修；第二个游戏遇到时移到第 2 节。

Write the lesson as a card of the engine's guide (`guide/cards` in the engine repository) first, and fix it in the engine where that is easy; when a second game meets it, it moves to part 2.

| Topic | 笔记 · Note | 状态 · Status |
|---|---|---|
| `action-control-outside-release` | Rally#6 原生按钮拖出后释放仍激活 · Native action activates on release outside | 未解决 · open |
| `action-release-inside-policy` | SnowTemple#6 菜单 ActionControl 越界松手仍激活 · Menu actions activate after releasing outside | 未解决 · open |
| `animation-retarget-rigs` | FiveRegiments#4 `retargetAnimationClip3D` 不处理朝向不同的骨架，也不能截段、去根转、镜像 · `retargetAnimationClip3D` takes no account of rigs facing different ways, and cannot cut, still the root or mirror | 未解决 · open |
| `audio-custom-source-ducking-spatial-filter` | Wulin#3 声音混音与定位 · Audio mixing and localization | 部分解决 · partly |
| `body-angle-degrees` | LubanBridge#2 刚体的 `angle` 是角度，文档和类型都没说 · A body's `angle` is in degrees, which neither the documents nor the types say | 未解决 · open |
| `browser-game-css-fit-pixel-ratio` | FengshenChronicle#5 固定 DPR 与 CSS 放大后的画质 · Fixed DPR and CSS-upscaled field quality | 已在游戏侧绕过 · worked around |
| `burst-layer` | OperaDrums#20 `game.burst` 没有图层 · `game.burst` has no layer | 未解决 · open |
| `camera-zoom-clamp` | NineProvinces#4 相机缩放超出范围时抛错而不是夹住 · The camera throws instead of clamping a zoom out of range | 未解决 · open |
| `decal-changes-material` | TeaHorseRoad#8 `createDecal3D` 改写传入的材质 · `createDecal3D` changes the material it is given | 未解决 · open |
| `declarative-range-control` | NineProvinces#10 原生数据界面缺少具名范围控件 · Declarative views have no named range control | 未解决 · open |
| `declarative-tab-arrow-selection` | NineProvinces#12 数据界面页签需要业务方显式实现方向键选中 · Declarative tabs require explicit arrow selection | 未解决 · open |
| `expanded-stage-pixel-ratio` | LanternShadows#8 扩展舞台的画布像素密度 · Backing density on an expanded stage | 已在游戏侧绕过 · worked around |
| `geometry-budget-reuse` | FivePhases#1 每帧的几何预算连复用的几何也一起算 · The per-frame geometry budget also counts reused geometry | 部分解决 · partly |
| `gltf-webp-texture` | FiveRegiments#1 `loadGltf3D` 不认 `EXT_texture_webp` · `loadGltf3D` does not take `EXT_texture_webp` | 未解决 · open |
| `guide-card-crlf` | TeaHorseRoad#31 guide 卡片只接受 LF 行尾 · Guide cards reject CRLF line endings | 未解决 · open |
| `horizontal-touch-stick` | LanternShadows#4 原生触屏控件的横向模拟摇杆 · Horizontal analog touch control | 已在游戏侧绕过 · worked around |
| `image-job-limit` | OperaDrums#9 同时载入第五张图片时直接拒绝，不排队 · A fifth image loading at once is refused, not queued | 未解决 · open |
| `instanced-lod` | TeaHorseRoad#2 实例网格没有距离剔除和 LOD · No distance culling or LOD for instanced meshes | 部分解决 · partly |
| `managed-editor-focus` | InquestScrolls#12 笔录托管编辑器创建和失焦 · Managed editor creation and blur | 已在游戏侧绕过 · worked around |
| `mixed-world3d-2d-submit-order` | Wulin#11 独立 3D/2D 画布的同帧 GPU 同步等待 · Same-frame GPU synchronization between independent 3D and 2D canvases | 部分解决 · partly |
| `mouse-right-button` | LubanBridge#5 `web/input` 的鼠标输入只认左键 · The mouse input of `web/input` knows only the left button | 未解决 · open |
| `native-paragraph-density-font-weight` | Wulin#12 原生富文本的栅格密度与字重 · Native paragraph raster density and font weight | 部分解决 · partly |
| `native-scrolling` | PeachCreek#2 经营单子的原生滚动 · Native scrolling for county inspectors | 部分解决 · partly |
| `native-ui-artwork-slot` | LoveElective#5 运行时生成插画的视图挂载点 · Native view mount slots for generated artwork | 未解决 · open |
| `native-ui-dense-spine-frame-time` | LanternShadows#9 百个 Spine 角色与原生 HUD 的手机密集帧 · Dense mobile frames with 100 Spine puppets and native HUD | 部分解决 · partly |
| `native-ui-font-style` | LoveElective#4 原生短文字的字体控制和就绪 · Native short-label typography and readiness | 部分解决 · partly |
| `native-ui-hover-style` | LoveElective#6 高阶原生 View 的悬停皮肤 · Declarative hover styling | 未解决 · open |
| `native-view-image-failure-recovery` | Wulin#8 数据视图图片失败后的恢复 · Recovery from native view image failures | 未解决 · open |
| `nav-agent-forward-axis` | TeaHorseRoad#27 导航体转身以 -Z 为前方 · A navigation agent turns with -Z as its front | 未解决 · open |
| `navmesh-heightfield-holes` | TeaHorseRoad#28 从高度场铺导航网格：只能是一块高度场，洞只按顶点挖 · A navigation mesh from a height field takes one field, and holes go by vertices | 未解决 · open |
| `notes-parser-crlf` | FPS#10 引擎笔记工具不能识别 CRLF 标题 · Engine notes CLI misses CRLF headings | 未解决 · open |
| `on-demand-rendering` | NineProvinces#5 画面不变时帧循环也每帧整屏合成 · The frame loop composites the whole stage every frame even when nothing changes | 部分解决 · partly |
| `optional-audio-gamepad-host` | NightWardens#5 可选声卡与手柄 · Optional audio and gamepad hosts | 已在游戏侧绕过 · worked around |
| `optional-media-host` | MechanismCity#22 可选声音宿主与开场视频 · Optional audio and opening video | 已在游戏侧绕过 · worked around |
| `overlay-scroll-content-pan` | SnowTemple#7 3D 原生叠加层滚动控件缺少手指拖动内容 · Native 3D overlay scroll control lacks direct content panning | 未解决 · open |
| `paragraph-image-size-limit` | InquestScrolls#11 段落图像超过尺寸上限 · Paragraph image exceeds the size limit | 已在游戏侧绕过 · worked around |
| `particle-burst-fraction` | SandScroll#2 粒子 `burst` 传小数时报"选项无效"，并让整个帧循环停下 · A fractional `burst` count reports invalid options and stops the frame loop | 未解决 · open |
| `particles-without-map` | FiveRegiments#2 粒子不给贴图时是方块 · Particles without a map are squares | 未解决 · open |
| `paused-world-screen-offset` | TaiwanMahjong#11 暫停時 world 的 expand 偏移未跟隨轉向 · Paused world offset does not follow an expanded screen | 未解决 · open |
| `per-view-ui-scale` | TaiwanMahjong#9 uiScale 無法按個別視圖選擇 · uiScale cannot be selected per view | 未解决 · open |
| `physics2d-hinge-motor` | LubanBridge#3 刚体不会自己转，没有铰链和马达 · Bodies do not spin by themselves, and there is no hinge or motor | 未解决 · open |
| `physics2d-joints-ropes` | MechanismCity#1 关节、绳索和旋转 · Joints, ropes and rotation | 部分解决 · partly |
| `physics2d-truss-joints` | LubanBridge#1 距离关节连成桁架又软又偏，也读不到杆件受了多大的力 · Distance joints chained into a truss are soft and lopsided, and give no member force | 未解决 · open |
| `play-existing-browser-game-views` | FengshenChronicle#3 RPG 面板接入现有浏览器场景 · Attaching RPG panels to an existing browser game | 未解决 · open |
| `play-frame-timing-forwarding` | FPS#16 Play 未公开实际帧循环时序回调 · Play does not expose the active loop timing callback | 未解决 · open |
| `play-gesture-session` | FivePhases#4 Play 手势入口未覆盖棋盘按下即预览的完整会话 · High-level Play gestures omit the whole press-to-preview session | 未解决 · open |
| `play-hints-wrapping` | NezhaSea#12 提示换行、首领入场与启动失败 · Hint wrapping, Boss entry and boot recovery | 未解决 · open |
| `play-owned-canvas-fit` | FPS#8 自有 canvas 的 Play fit 不能自动扩展 · Play fit does not expand a caller-owned canvas | 部分解决 · partly |
| `play-responsive-hold-controls` | FPS#9 Play 数据视图的连续设置与触控按钮 · Continuous settings and responsive touch buttons | 部分解决 · partly |
| `play-startup-dependencies` | NezhaSea#13 静止视图重复提交，首屏依赖在后段串行加载 · Repeated static frames and late startup dependencies | 部分解决 · partly |
| `pointer-lock-capture-transition` | FiveRegiments#7 指针锁定过渡与原生捕获 · Native capture during pointer-lock transition | 未解决 · open |
| `prepare-programs-meshes` | JY#2 预编译着色器要求给出已经存在的网格 · Preparing programs needs meshes that already exist | 未解决 · open |
| `radial-gradient-triangles` | MechanismCity#6 径向渐变的三角形很多 · Radial gradients cost many triangles | 未解决 · open |
| `rapid-label-raster-supersession` | CanalWatch#8 快速变化文字的空白期 · Blank intervals in rapidly changing labels | 已在游戏侧绕过 · worked around |
| `save-update-return` | PeachCreek#6 存档更新与预制绘图对象 · Save updates and convenience drawing objects | 部分解决 · partly |
| `screen-verifier-state-coverage` | TaiwanMahjong#12 多螢幕 CLI 只能檢查啟動狀態 · Multi-screen CLI is limited to the launch state | 未解决 · open |
| `secondary-pointer-drag` | Wulin#7 次要鼠标键的镜头拖动 · Secondary-button camera drag | 未解决 · open |
| `semantic-bounds-transform` | PeachCreek#1 变换和裁剪后的语义区域 · Semantic bounds after transforms and clipping | 部分解决 · partly |
| `semantic-button-pressed-state` | Rally#5 原生语义按钮没有按住状态 · A native semantic button cannot report its held state | 未解决 · open |
| `semantic-projection-resize` | LanternShadows#6 扩展画布的语义投影尺寸 · Semantic projection on an expanding canvas | 已在游戏侧绕过 · worked around |
| `semantic-screen-resize` | TaiwanMahjong#10 瀏覽器語意映射的舞台尺寸固定 · Browser semantic projection has fixed stage dimensions | 未解决 · open |
| `semantics-projection-resize` | OperaDrums#16 页面投影的逻辑尺寸是固定的 · The page projection's logical size is fixed | 未解决 · open |
| `shape-mask-cost` | MechanismCity#3 形状遮罩的代价 · The cost of a shape mask | 部分解决 · partly |
| `skybox-black-software` | TeaHorseRoad#4 软件渲染下天空盒是黑的 · The skybox is black under software rendering | 未解决 · open |
| `spine-deferred-display` | LanternShadows#10 背压时 Spine 语义推进与绘制网格不能独立调度 · Spine semantic advance and display mesh publication are coupled under backpressure | 未解决 · open |
| `spine-instance-limit` | LanternShadows#3 同一份骨骼数据最多 128 个 Spine 实例 · At most 128 Spine instances of one skeleton | 未解决 · open |
| `stack-modal-focus-return` | OperaDrums#15 屏幕栈关掉对话框后焦点落空 · The focus is lost when a dialog of the screen stack closes | 未解决 · open |
| `still-layer-cache` | CanalWatch#3 静止的大图每帧重画，软件渲染下帧时间翻倍 · A still map drawn again each frame doubles the frame time under software rendering | 部分解决 · partly |
| `terrain-color-tile` | NineProvinces#6 地形流的 `colorAt` 只给地块内的坐标，不知道是哪一块 · The terrain stream's `colorAt` is given coordinates within a tile, and no way to tell which tile | 未解决 · open |
| `terrain-view-distance-budget` | NineProvinces#8 地形流视距稍大就抛 `WORLD3D_BUDGET` · The terrain stream throws `WORLD3D_BUDGET` for a view distance a little too large | 未解决 · open |
| `text-cache-budget-batch` | JY#1 同时准备很多文字时超出文字缓存的预算 · Preparing many texts at once passes the text cache's budget | 部分解决 · partly |
| `text-font-quoted-generic` | OperaDrums#22 引擎要的字体是带引号的 `"sans-serif"` · The engine asks for `"sans-serif"` in quotes | 未解决 · open |
| `texture-from-canvas-scope` | NineProvinces#3 `textureFromCanvas` 的纹理只能归游戏本身的作用域 · Textures from `textureFromCanvas` belong to the game's own scope only | 未解决 · open |
| `two-bone-ik` | FiveRegiments#5 引擎没有现成的两骨反向动力学 · No two-bone IK in the engine | 未解决 · open |
| `ui-root-active-contacts-admission` | SnowTemple#8 按住触点时动态创建模态根拒绝 · Creating a modal root while contacts are held is refused | 未解决 · open |
| `vertex-hook-error` | StarBanner#2 只有顶点钩子的着色器写进 `glsl` 时报错不直观 · A vertex-only hook given as `glsl` fails with an unhelpful error | 未解决 · open |
| `vertical-text` | InquestScrolls#1 段落不支持竖排 · Paragraphs cannot set text vertically | 部分解决 · partly |
| `view-accessible-label` | OperaDrums#13 按钮的读屏名字只能是它的字 · A button's accessible name is only its words | 未解决 · open |
| `view-during-setup` | OperaDrums#10 `setup` 等着的界面不画 · A view that `setup` awaits is not drawn | 未解决 · open |
| `view-focus-call` | OperaDrums#14 没有把焦点放到某个部件上的调用 · No call to put the focus on a named part | 未解决 · open |
| `view-group-name-fallback` | OperaDrums#21 没有 `label` 的面板按部件名读出 · A panel without a `label` is read by its part's name | 未解决 · open |
| `view-label-binding` | OperaDrums#17 组的读屏名字不能绑定，隐藏的部件仍占位置 · Group names cannot be bound, and hidden parts keep their room | 未解决 · open |
| `view-press-down` | OperaDrums#11 界面的点按在抬起时才算 · A view's tap counts when the finger lifts | 部分解决 · partly |
| `view-selected-state` | OperaDrums#12 选中状态进不了语义树 · A chosen part cannot say it is chosen | 未解决 · open |
| `view-size-classes` | OperaDrums#18 只有横屏和竖屏两套部件 · Only a wide and a tall set of parts | 未解决 · open |
| `view-text-fit` | OperaDrums#23 放不下的字不缩小，多行字只能整块居中 · Words that do not fit are not shrunk, and lines are centred only as a block | 未解决 · open |
| `view-text-wrap` | OperaDrums#6 文字部件不按宽度折行 · A text part is not wrapped to its width | 未解决 · open |
| `web-text-fractional-stroke` | SnowTemple#5 小数描边宽度导致原生图集文字失败 · Fractional outline width rejects native atlas text | 未解决 · open |
| `webgpu-cold-atlas-upload` | NezhaSea#5 WebGPU 首次可见的图集可能在连续帧重复上传 · Two consecutive WebGPU frames can upload a cold atlas twice | 未解决 · open |
| `webgpu-compute` | SandScroll#5 WebGPU 没有开放计算通道 · No compute pass on WebGPU | 未解决 · open |
| `webgpu-headless-3d` | FiveRegiments#3 无头 Chromium 里 WebGPU 后端画不出 3D 画面 · The WebGPU backend draws no 3D scene in headless Chromium | 未解决 · open |
| `webgpu-loading-atlas-prewarm` | NezhaSea#14 WebGPU 加载页与主动预热共享存储竞争 · WebGPU loading and manual warm-up compete for shared storage | 已在游戏侧绕过 · worked around |
| `webkit-retained-presentation` | NezhaSea#19 WebKit 的按需首屏提交 · WebKit on-demand initial presentation | 已在游戏侧绕过 · worked around |
| `webkit-world3d-canvas-presentation` | TeaHorseRoad#32 WebKit 世界画布未呈现 · WebKit World3D canvas presentation | 未解决 · open |
| `world3d-attached-interactive-markers` | NineProvinces#11 原生 World3D 投影标记不能直接接入附着式 Play，且没有交互选项 · Native World3D projected markers cannot attach directly to attached Play and have no interactive option | 未解决 · open |
| `world3d-native-marker-overlay-batching` | jelly-pandas#9 原生浮字触发整层界面提交 · Animated native markers wake the full overlay | 未解决 · open |
| `world3d-overlay-frame-tail` | jelly-pandas#8 软件渲染下 3D 与原生叠加层的帧尾延迟 · Frame-tail latency with the native 3D overlay under software rendering | 部分解决 · partly |
| `world3d-prepare-internal-passes` | FiveRegiments#8 World3D 预热入口尚不覆盖内置场景与后处理通道 · World3D preparation does not yet expose built-in scene and post passes | 未解决 · open |
| `world3d-screen-markers-safe-insets` | TeaHorseRoad#29 3D 屏幕标记不能分边避让安全区 · 3D screen markers cannot respect per-edge safe areas | 未解决 · open |

## 4. 各游戏 · By game

| 游戏 · Game | 笔记 · Notes | 未解决 · Open | 部分 · Partly | 绕过 · Worked around | 文档 · Documented | 已解决 · Resolved | 引擎已解决待去掉 · To take out | 引擎副本 · Engine pin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| [CanalWatch](../CanalWatch/ENGINE-NOTES.md) | 8 | 0 | 1 | 2 | 2 | 3 | 0 | `82561d6` |
| [FengshenChronicle](../FengshenChronicle/ENGINE-NOTES.md) | 5 | 1 | 0 | 1 | 0 | 3 | 0 | `94bd70f` |
| [FivePhases](../FivePhases/ENGINE-NOTES.md) | 7 | 1 | 1 | 0 | 0 | 5 | 0 | `82561d6` |
| [FiveRegiments](../FiveRegiments/ENGINE-NOTES.md) | 8 | 8 | 0 | 0 | 0 | 0 | 0 | `2129726` |
| [FPS](../FPS/ENGINE-NOTES.md) | 17 | 3 | 3 | 0 | 2 | 9 | 0 | `82561d6` |
| [InquestScrolls](../InquestScrolls/ENGINE-NOTES.md) | 13 | 0 | 1 | 3 | 1 | 8 | 0 | `82561d6` |
| [jelly-pandas](../jelly-pandas/ENGINE-NOTES.md) | 10 | 3 | 2 | 0 | 0 | 5 | 0 | `82561d6` |
| [JY](../JY/ENGINE-NOTES.md) | 3 | 1 | 1 | 0 | 0 | 1 | 0 | `ca9ff2a` |
| [LanternShadows](../LanternShadows/ENGINE-NOTES.md) | 13 | 2 | 1 | 3 | 2 | 5 | 0 | `82561d6` |
| [LoveElective](../LoveElective/ENGINE-NOTES.md) | 8 | 2 | 1 | 0 | 0 | 5 | 0 | `82561d6` |
| [LubanBridge](../LubanBridge/ENGINE-NOTES.md) | 6 | 4 | 0 | 1 | 1 | 0 | 0 | `82561d6` |
| [MechanismCity](../MechanismCity/ENGINE-NOTES.md) | 22 | 1 | 2 | 1 | 5 | 13 | 0 | `82561d6` |
| [NezhaSea](../NezhaSea/ENGINE-NOTES.md) | 19 | 2 | 1 | 3 | 1 | 12 | 0 | `82561d6` |
| [NightWardens](../NightWardens/ENGINE-NOTES.md) | 5 | 0 | 0 | 1 | 3 | 1 | 0 | `82561d6` |
| [NineProvinces](../NineProvinces/ENGINE-NOTES.md) | 12 | 8 | 1 | 0 | 1 | 2 | 0 | `7fb371a` |
| [OperaDrums](../OperaDrums/ENGINE-NOTES.md) | 24 | 15 | 1 | 1 | 3 | 4 | 0 | `82561d6` |
| [PeachCreek](../PeachCreek/ENGINE-NOTES.md) | 10 | 0 | 4 | 1 | 0 | 5 | 0 | `82561d6` |
| [Rally](../Rally/ENGINE-NOTES.md) | 7 | 4 | 0 | 0 | 2 | 1 | 0 | `82561d6` |
| [SandScroll](../SandScroll/ENGINE-NOTES.md) | 7 | 2 | 0 | 0 | 5 | 0 | 0 | `82561d6` |
| [SnowTemple](../SnowTemple/ENGINE-NOTES.md) | 10 | 6 | 0 | 0 | 0 | 4 | 0 | `82561d6` |
| [StarBanner](../StarBanner/ENGINE-NOTES.md) | 13 | 3 | 0 | 0 | 4 | 6 | 0 | `82561d6` |
| [TaiwanMahjong](../TaiwanMahjong/ENGINE-NOTES.md) | 13 | 4 | 0 | 1 | 3 | 5 | 0 | `82561d6` |
| [TeaHorseRoad](../TeaHorseRoad/ENGINE-NOTES.md) | 32 | 7 | 1 | 0 | 7 | 17 | 0 | `82561d6` |
| [Wulin](../Wulin/ENGINE-NOTES.md) | 13 | 3 | 3 | 0 | 0 | 7 | 0 | `82561d6` |
