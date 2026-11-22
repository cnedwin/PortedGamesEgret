# 引擎能力矩阵 · Engine capability matrix

由 `node tools/capability-matrix.mjs` 生成，不要手改；`--check` 检查它是否过期。行是引擎能力，列是游戏，✔ 链接到用这项能力的文件（游戏 README 能力对照表写了文件的，用 README 写的）。入口的全列表取自引擎 `packages/engine/package.json` 的 `exports`（引擎提交 `a778bed`），没有游戏用到的也列出；只统计游戏自己的代码，不含 `vendor/`、测试和工具。

Made by `node tools/capability-matrix.mjs`; do not edit by hand, and `--check` says whether it is out of date. Rows are
engine capabilities and columns games; each ✔ links the file that uses it (the one named in the game's README
capability table, when it names one). The entries are the `exports` of the engine's `packages/engine/package.json` (engine commit `a778bed`),
used or not; only each game's own code is read, not `vendor/`, tests or tools. The same table is on the showcase site
(`capabilities.html`).

## 入口 · Entries

| 能力 · Capability | 游戏数 · Games | CanalWatch | FengshenChronicle | FivePhases | FPS | jelly-pandas | JY | LanternShadows | LoveElective | MechanismCity | NezhaSea | NightWardens | OperaDrums | PeachCreek | Rally | SnowTemple | TaiwanMahjong | TeaHorseRoad | Wulin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `@egret/engine` | 16 |  | [✔](FengshenChronicle/src/view.mjs) | [✔](FivePhases/src/main.mjs) | [✔](FPS/src/main.mjs) | [✔](jelly-pandas/src/main.mjs) | [✔](JY/web/battle-view.mjs) | [✔](LanternShadows/src/main.mjs) | [✔](LoveElective/src/engine/stage.mjs) | [✔](MechanismCity/src/art/illustrations.mjs) | [✔](NezhaSea/src/actor-art.mjs) | [✔](NightWardens/src/art/atlas.mjs) |  | [✔](PeachCreek/src/view.mjs) | [✔](Rally/src/main.mjs) | [✔](SnowTemple/src/main.mjs) | [✔](TaiwanMahjong/src/view.mjs) | [✔](TeaHorseRoad/src/ui/card.mjs) | [✔](Wulin/src/view/stage.mjs) |
| `@egret/engine/webgpu` | 1 |  |  |  |  |  |  |  | [✔](LoveElective/src/engine/stage.mjs) |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/text` | 1 |  |  |  |  |  | [✔](JY/web/battle-view.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/layout` | 1 |  |  |  |  |  |  |  |  |  |  | [✔](NightWardens/src/screens.mjs) |  |  |  |  |  |  |  |
| `@egret/engine/web/input` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/image` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/text` | 1 |  |  |  |  |  | [✔](JY/web/main.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/webgl2` | 2 |  |  |  |  |  | [✔](JY/web/main.mjs) |  | [✔](LoveElective/src/engine/stage.mjs) |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/world3d` | 7 |  |  |  | [✔](FPS/src/asset-models.mjs) | [✔](jelly-pandas/src/island.mjs) | [✔](JY/web/jyx2/home3d/native-exit-effect.mjs) |  |  |  |  |  |  |  | [✔](Rally/src/grandstand.mjs) | [✔](SnowTemple/src/main.mjs) |  | [✔](TeaHorseRoad/src/art/font.mjs) | [✔](Wulin/src/view/arena-effects.mjs) |
| `@egret/engine/webgl2/world3d` | 7 |  |  |  | [✔](FPS/src/main.mjs) | [✔](jelly-pandas/src/main.mjs) | [✔](JY/web/jyx2/home3d/native-exit-effect.mjs) |  |  |  |  |  |  |  | [✔](Rally/src/main.mjs) | [✔](SnowTemple/src/main.mjs) |  | [✔](TeaHorseRoad/src/audio/soundscape.mjs) | [✔](Wulin/src/view/stage.mjs) |
| `@egret/engine/webgpu/world3d` | 4 |  |  |  | [✔](FPS/src/main.mjs) | [✔](jelly-pandas/src/main.mjs) |  |  |  |  |  |  |  |  | [✔](Rally/src/main.mjs) |  |  |  | [✔](Wulin/src/view/stage.mjs) |
| `@egret/engine/resources` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/resources` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/input` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/pointer` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/ui` | 3 |  |  |  |  |  |  |  |  | [✔](MechanismCity/src/screens.mjs) |  | [✔](NightWardens/src/screens.mjs) |  |  |  |  |  | [✔](TeaHorseRoad/src/ui/card.mjs) |  |
| `@egret/engine/animation` | 1 |  |  |  |  |  |  |  |  |  |  | [✔](NightWardens/src/view/field.mjs) |  |  |  |  |  |  |  |
| `@egret/engine/paragraph` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/paragraph` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/keyboard` | 1 |  |  |  |  |  | [✔](JY/web/main.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/text-input` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/ui/editing` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/editing` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/input/hover` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/hover` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/input/gamepad` | 1 |  |  |  |  |  |  |  |  |  |  | [✔](NightWardens/src/main.mjs) |  |  |  |  |  |  |  |
| `@egret/engine/web/gamepad` | 3 |  |  |  |  |  |  | [✔](LanternShadows/src/input.mjs) |  |  |  | [✔](NightWardens/src/main.mjs) |  |  |  |  |  | [✔](TeaHorseRoad/src/play/input.mjs) |  |
| `@egret/engine/camera` | 2 |  |  |  |  |  |  | [✔](LanternShadows/src/main.mjs) |  | [✔](MechanismCity/src/play/level.mjs) |  |  |  |  |  |  |  |  |  |
| `@egret/engine/tilemap` | 2 |  |  |  |  |  |  | [✔](LanternShadows/src/main.mjs) |  | [✔](MechanismCity/src/play/level.mjs) |  |  |  |  |  |  |  |  |  |
| `@egret/engine/particles` | 3 |  |  |  |  |  |  | [✔](LanternShadows/src/main.mjs) |  | [✔](MechanismCity/src/play/level.mjs) |  | [✔](NightWardens/src/view/field.mjs) |  |  |  |  |  |  |  |
| `@egret/engine/physics2d` | 1 |  |  |  |  |  |  |  |  | [✔](MechanismCity/src/sim/sim.mjs) |  |  |  |  |  |  |  |  |  |
| `@egret/engine/bitmapfont` | 2 |  |  |  |  |  |  |  |  | [✔](MechanismCity/src/main.mjs) |  |  |  |  |  |  |  | [✔](TeaHorseRoad/src/main.mjs) |  |
| `@egret/engine/video` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/video` | 2 |  |  |  |  |  |  |  |  | [✔](MechanismCity/src/screens.mjs) |  |  |  |  |  |  |  | [✔](TeaHorseRoad/src/ui/screens.mjs) |  |
| `@egret/engine/web/loop` | 1 |  |  |  |  |  |  |  | [✔](LoveElective/src/engine/stage.mjs) |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/kit` | 9 | [✔](CanalWatch/src/i18n.mjs) |  |  |  |  |  |  |  | [✔](MechanismCity/src/audio/sound.mjs) | [✔](NezhaSea/src/i18n.mjs) | [✔](NightWardens/src/audio/sound.mjs) | [✔](OperaDrums/src/audio/sound.mjs) | [✔](PeachCreek/src/i18n.mjs) |  | [✔](SnowTemple/src/saves.mjs) | [✔](TaiwanMahjong/src/i18n.mjs) | [✔](TeaHorseRoad/src/play/input.mjs) |  |
| `@egret/engine/web/kit` | 12 | [✔](CanalWatch/src/main.mjs) |  |  | [✔](FPS/src/main.mjs) |  |  |  |  | [✔](MechanismCity/src/main.mjs) | [✔](NezhaSea/src/main.mjs) | [✔](NightWardens/src/main.mjs) | [✔](OperaDrums/src/main.mjs) | [✔](PeachCreek/src/main.mjs) | [✔](Rally/src/main.mjs) | [✔](SnowTemple/src/main.mjs) | [✔](TaiwanMahjong/src/main.mjs) | [✔](TeaHorseRoad/src/main.mjs) | [✔](Wulin/src/main.mjs) |
| `@egret/engine/web/game` | 5 |  | [✔](FengshenChronicle/src/main.mjs) | [✔](FivePhases/src/main.mjs) |  |  |  | [✔](LanternShadows/src/main.mjs) |  | [✔](MechanismCity/src/main.mjs) |  | [✔](NightWardens/src/main.mjs) |  |  |  |  |  |  |  |
| `@egret/engine/play` | 5 | [✔](CanalWatch/src/main.mjs) |  |  |  |  |  |  |  |  | [✔](NezhaSea/src/main.mjs) |  | [✔](OperaDrums/src/main.mjs) | [✔](PeachCreek/src/main.mjs) |  |  | [✔](TaiwanMahjong/src/main.mjs) |  |  |
| `@egret/engine/audio` | 1 |  |  |  |  |  |  |  |  |  |  | [✔](NightWardens/src/audio/sound.mjs) |  |  |  |  |  |  |  |
| `@egret/engine/web/audio` | 4 |  |  |  |  |  |  | [✔](LanternShadows/src/sound.mjs) |  | [✔](MechanismCity/src/audio/sound.mjs) |  | [✔](NightWardens/src/audio/sound.mjs) | [✔](OperaDrums/src/audio/sound.mjs) |  |  |  |  |  |  |
| `@egret/engine/ui/semantics` | 3 |  |  |  |  |  |  |  |  | [✔](MechanismCity/src/main.mjs) |  | [✔](NightWardens/src/main.mjs) |  |  |  |  |  | [✔](TeaHorseRoad/src/main.mjs) |  |
| `@egret/engine/web/semantics` | 3 |  |  |  |  |  |  |  |  | [✔](MechanismCity/src/main.mjs) |  | [✔](NightWardens/src/main.mjs) |  |  |  |  |  | [✔](TeaHorseRoad/src/main.mjs) |  |
| `@egret/spine` | 1 |  |  |  |  |  |  | [✔](LanternShadows/src/puppets.mjs) |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/spine/web` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/contracts/resources` | 1 |  |  |  |  |  |  | [✔](LanternShadows/src/puppets.mjs) |  |  |  |  |  |  |  |  |  |  |  |

## 关键 API · Key APIs

| 能力 · Capability | 游戏数 · Games | CanalWatch | FengshenChronicle | FivePhases | FPS | jelly-pandas | JY | LanternShadows | LoveElective | MechanismCity | NezhaSea | NightWardens | OperaDrums | PeachCreek | Rally | SnowTemple | TaiwanMahjong | TeaHorseRoad | Wulin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 粒子发射器 · Particle emitter (`createParticleEmitter`) | 3 |  |  |  |  |  |  | [✔](LanternShadows/src/main.mjs) |  | [✔](MechanismCity/src/play/level.mjs) |  | [✔](NightWardens/src/view/field.mjs) |  |  |  |  |  |  |  |
| 2D 物理关节 · 2D physics joints (`addJoint`) | 1 |  |  |  |  |  |  |  |  | [✔](MechanismCity/src/sim/sim.mjs) |  |  |  |  |  |  |  |  |  |
| 托管界面根节点 · Managed UI root (`createUiRoot`) | 2 |  |  |  |  |  |  |  |  | [✔](MechanismCity/src/ui/settings.mjs) |  |  |  |  |  |  |  | [✔](TeaHorseRoad/src/ui/card.mjs) |  |
| 网页视频 · Browser video (`createBrowserVideo`) | 2 |  |  |  |  |  |  |  |  | [✔](MechanismCity/src/screens.mjs) |  |  |  |  |  |  |  | [✔](TeaHorseRoad/src/ui/screens.mjs) |  |
| 文字输入框 · Text input (`createTextInput`) | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Spine 骨骼动画 · Spine skeletons (`Spine`) | 1 |  |  |  |  |  |  | [✔](LanternShadows/src/puppets.mjs) |  |  |  |  |  |  |  |  |  |  |  |
| 多点触控 · Multi-touch (`multi-touch`) | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## 缺口 · Gaps

少于两款游戏用到的能力：只有一款游戏是例子，或者还没有例子。新游戏优先选这些能力来做。

Capabilities fewer than two games use: one example at most. A new game is a good place to show them.

| 能力 · Capability | 用到的游戏 · Used by |
|---|---|
| `@egret/engine/webgpu` | [LoveElective](LoveElective/src/engine/stage.mjs) |
| `@egret/engine/text` | [JY](JY/web/battle-view.mjs) |
| `@egret/engine/layout` | [NightWardens](NightWardens/src/screens.mjs) |
| `@egret/engine/web/input` | 无 · none |
| `@egret/engine/web/image` | 无 · none |
| `@egret/engine/web/text` | [JY](JY/web/main.mjs) |
| `@egret/engine/resources` | 无 · none |
| `@egret/engine/web/resources` | 无 · none |
| `@egret/engine/input` | 无 · none |
| `@egret/engine/web/pointer` | 无 · none |
| `@egret/engine/animation` | [NightWardens](NightWardens/src/view/field.mjs) |
| `@egret/engine/paragraph` | 无 · none |
| `@egret/engine/web/paragraph` | 无 · none |
| `@egret/engine/web/keyboard` | [JY](JY/web/main.mjs) |
| `@egret/engine/web/text-input` | 无 · none |
| `@egret/engine/ui/editing` | 无 · none |
| `@egret/engine/web/editing` | 无 · none |
| `@egret/engine/input/hover` | 无 · none |
| `@egret/engine/web/hover` | 无 · none |
| `@egret/engine/input/gamepad` | [NightWardens](NightWardens/src/main.mjs) |
| `@egret/engine/physics2d` | [MechanismCity](MechanismCity/src/sim/sim.mjs) |
| `@egret/engine/video` | 无 · none |
| `@egret/engine/web/loop` | [LoveElective](LoveElective/src/engine/stage.mjs) |
| `@egret/engine/audio` | [NightWardens](NightWardens/src/audio/sound.mjs) |
| `@egret/spine` | [LanternShadows](LanternShadows/src/puppets.mjs) |
| `@egret/spine/web` | 无 · none |
| 2D 物理关节 · 2D physics joints (`addJoint`) | [MechanismCity](MechanismCity/src/sim/sim.mjs) |
| 文字输入框 · Text input (`createTextInput`) | 无 · none |
| Spine 骨骼动画 · Spine skeletons (`Spine`) | [LanternShadows](LanternShadows/src/puppets.mjs) |
| 多点触控 · Multi-touch (`multi-touch`) | 无 · none |
