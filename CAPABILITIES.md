# 引擎能力矩阵 · Engine capability matrix

由 `node tools/capability-matrix.mjs` 生成，不要手改；`--check` 检查它是否过期。行是引擎能力，列是游戏，✔ 链接到用这项能力的文件（游戏 README 能力对照表写了文件的，用 README 写的）。入口的全列表取自引擎 `packages/engine/package.json` 的 `exports`（引擎提交 `f0f2e01`），没有游戏用到的也列出；只统计游戏自己的代码，不含 `vendor/`、测试和工具。

Made by `node tools/capability-matrix.mjs`; do not edit by hand, and `--check` says whether it is out of date. Rows are
engine capabilities and columns games; each ✔ links the file that uses it (the one named in the game's README
capability table, when it names one). The entries are the `exports` of the engine's `packages/engine/package.json` (engine commit `f0f2e01`),
used or not; only each game's own code is read, not `vendor/`, tests or tools. The same table is on the showcase site
(`capabilities.html`).

## 入口 · Entries

| 能力 · Capability | 游戏数 · Games | CanalWatch | FengshenChronicle | FivePhases | FiveRegiments | FPS | InquestScrolls | jelly-pandas | JY | LanternShadows | LoveElective | MechanismCity | NezhaSea | NightWardens | NineProvinces | OperaDrums | PeachCreek | Rally | SandScroll | SnowTemple | StarBanner | TaiwanMahjong | TeaHorseRoad | Wulin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `@egret/engine` | 18 |  | [✔](FengshenChronicle/src/view.mjs) | [✔](FivePhases/src/main.mjs) |  | [✔](FPS/src/main.mjs) | [✔](InquestScrolls/src/view/pictures.mjs) | [✔](jelly-pandas/src/main.mjs) | [✔](JY/web/main.mjs) | [✔](LanternShadows/src/main.mjs) | [✔](LoveElective/src/engine/stage.mjs) | [✔](MechanismCity/src/art/illustrations.mjs) | [✔](NezhaSea/src/actor-art.mjs) | [✔](NightWardens/src/screens.mjs) |  |  | [✔](PeachCreek/src/inspector.mjs) | [✔](Rally/src/main.mjs) | [✔](SandScroll/src/screens.mjs) | [✔](SnowTemple/src/main.mjs) |  | [✔](TaiwanMahjong/src/view.mjs) | [✔](TeaHorseRoad/src/ui/card.mjs) | [✔](Wulin/src/view/stage.mjs) |
| `@egret/engine/webgpu` | 1 |  |  |  |  |  |  |  |  |  | [✔](LoveElective/src/engine/stage.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/text` | 1 |  |  |  |  |  |  |  | [✔](JY/web/opening-dialogue.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/layout` | 2 |  |  |  |  |  | [✔](InquestScrolls/src/view/dossier.mjs) |  |  |  |  |  |  | [✔](NightWardens/src/screens.mjs) |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/input` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/image` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/text` | 1 |  |  |  |  |  |  |  | [✔](JY/web/main.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/webgl2` | 2 |  |  |  |  |  |  |  | [✔](JY/web/main.mjs) |  | [✔](LoveElective/src/engine/stage.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/world3d` | 10 |  |  |  | [✔](FiveRegiments/src/main.mjs) | [✔](FPS/src/asset-models.mjs) |  | [✔](jelly-pandas/src/island.mjs) | [✔](JY/web/jyx2/home3d/native-exit-effect.mjs) |  |  |  |  |  | [✔](NineProvinces/src/view3d/ambient.mjs) |  |  | [✔](Rally/src/grandstand.mjs) |  | [✔](SnowTemple/src/main.mjs) | [✔](StarBanner/src/view/stage.mjs) |  | [✔](TeaHorseRoad/src/art/font.mjs) | [✔](Wulin/src/view/arena-effects.mjs) |
| `@egret/engine/webgl2/world3d` | 8 |  |  |  |  | [✔](FPS/src/main.mjs) |  | [✔](jelly-pandas/src/main.mjs) | [✔](JY/web/jyx2/scene/world3d-renderer.mjs) |  |  |  |  |  | [✔](NineProvinces/src/view3d/stage.mjs) |  |  | [✔](Rally/src/main.mjs) |  | [✔](SnowTemple/src/main.mjs) |  |  | [✔](TeaHorseRoad/src/audio/soundscape.mjs) | [✔](Wulin/src/view/stage.mjs) |
| `@egret/engine/webgpu/world3d` | 6 |  |  |  | [✔](FiveRegiments/src/main.mjs) | [✔](FPS/src/main.mjs) |  | [✔](jelly-pandas/src/main.mjs) |  |  |  |  |  |  |  |  |  | [✔](Rally/src/main.mjs) |  |  | [✔](StarBanner/src/view/stage.mjs) |  |  | [✔](Wulin/src/view/stage.mjs) |
| `@egret/engine/resources` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/resources` | 1 |  |  |  |  |  | [✔](InquestScrolls/src/view/type.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/input` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/gestures` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/view` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/pointer` | 1 |  |  |  |  |  |  |  |  |  | [✔](LoveElective/src/engine/stage.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/ui` | 6 |  |  |  |  |  | [✔](InquestScrolls/src/view/notes.mjs) |  |  |  |  | [✔](MechanismCity/src/screens.mjs) |  | [✔](NightWardens/src/screens.mjs) |  |  | [✔](PeachCreek/src/main.mjs) |  | [✔](SandScroll/src/ui/kit.mjs) |  |  |  | [✔](TeaHorseRoad/src/ui/card.mjs) |  |
| `@egret/engine/animation` | 1 |  |  |  |  |  |  |  |  |  |  |  |  | [✔](NightWardens/src/view/field.mjs) |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/paragraph` | 1 |  |  |  |  |  | [✔](InquestScrolls/src/view/type.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/paragraph` | 1 |  |  |  |  |  | [✔](InquestScrolls/src/view/type.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/keyboard` | 2 |  |  |  |  |  |  |  | [✔](JY/web/main.mjs) |  | [✔](LoveElective/src/engine/stage.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/text-input` | 1 |  |  |  |  |  | [✔](InquestScrolls/src/view/verdict.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/ui/editing` | 1 |  |  |  |  |  | [✔](InquestScrolls/src/view/notes.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/editing` | 1 |  |  |  |  |  | [✔](InquestScrolls/src/view/notes.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/input/hover` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/hover` | 2 |  |  |  |  |  | [✔](InquestScrolls/src/view/casebook.mjs) |  |  |  | [✔](LoveElective/src/engine/stage.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/input/gamepad` | 3 |  |  |  | [✔](FiveRegiments/src/input.mjs) |  |  |  |  |  |  |  |  | [✔](NightWardens/src/main.mjs) |  |  |  |  |  |  | [✔](StarBanner/src/input.mjs) |  |  |  |
| `@egret/engine/web/gamepad` | 4 |  |  |  |  |  |  |  | [✔](JY/web/main.mjs) | [✔](LanternShadows/src/input.mjs) |  |  |  | [✔](NightWardens/src/main.mjs) |  |  |  |  |  |  |  |  | [✔](TeaHorseRoad/src/play/input.mjs) |  |
| `@egret/engine/camera` | 2 |  |  |  |  |  |  |  |  | [✔](LanternShadows/src/main.mjs) |  | [✔](MechanismCity/src/play/level.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/tilemap` | 2 |  |  |  |  |  |  |  |  | [✔](LanternShadows/src/main.mjs) |  | [✔](MechanismCity/src/play/level.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/particles` | 4 |  |  |  |  |  |  |  |  | [✔](LanternShadows/src/main.mjs) |  | [✔](MechanismCity/src/play/level.mjs) |  | [✔](NightWardens/src/view/field.mjs) |  |  |  |  | [✔](SandScroll/src/view/play.mjs) |  |  |  |  |  |
| `@egret/engine/physics2d` | 1 |  |  |  |  |  |  |  |  |  |  | [✔](MechanismCity/src/sim/sim.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/bitmapfont` | 2 |  |  |  |  |  |  |  |  |  |  | [✔](MechanismCity/src/main.mjs) |  |  |  |  |  |  |  |  |  |  | [✔](TeaHorseRoad/src/main.mjs) |  |
| `@egret/engine/video` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/video` | 2 |  |  |  |  |  |  |  |  |  |  | [✔](MechanismCity/src/screens.mjs) |  |  |  |  |  |  |  |  |  |  | [✔](TeaHorseRoad/src/ui/screens.mjs) |  |
| `@egret/engine/web/loop` | 1 |  |  |  |  |  |  |  |  |  | [✔](LoveElective/src/engine/stage.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/screen` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/kit` | 14 | [✔](CanalWatch/src/i18n.mjs) |  |  | [✔](FiveRegiments/src/audio.mjs) |  | [✔](InquestScrolls/src/saves.mjs) |  |  |  |  | [✔](MechanismCity/src/audio/sound.mjs) | [✔](NezhaSea/src/i18n.mjs) | [✔](NightWardens/tools/balance.mjs) | [✔](NineProvinces/src/saves.mjs) | [✔](OperaDrums/src/audio/sound.mjs) | [✔](PeachCreek/src/i18n.mjs) |  | [✔](SandScroll/src/main.mjs) | [✔](SnowTemple/tools/balance.mjs) | [✔](StarBanner/src/audio/sound.mjs) | [✔](TaiwanMahjong/src/i18n.mjs) | [✔](TeaHorseRoad/src/play/input.mjs) |  |
| `@egret/engine/web/kit` | 17 | [✔](CanalWatch/src/main.mjs) |  |  | [✔](FiveRegiments/src/saves.mjs) | [✔](FPS/src/main.mjs) | [✔](InquestScrolls/src/view/pictures.mjs) |  |  |  |  | [✔](MechanismCity/src/main.mjs) | [✔](NezhaSea/src/main.mjs) | [✔](NightWardens/src/main.mjs) | [✔](NineProvinces/src/saves.mjs) | [✔](OperaDrums/src/main.mjs) | [✔](PeachCreek/src/main.mjs) | [✔](Rally/src/main.mjs) | [✔](SandScroll/src/main.mjs) | [✔](SnowTemple/src/main.mjs) | [✔](StarBanner/src/main.mjs) | [✔](TaiwanMahjong/src/main.mjs) | [✔](TeaHorseRoad/src/main.mjs) | [✔](Wulin/src/main.mjs) |
| `@egret/engine/web/game` | 6 |  | [✔](FengshenChronicle/src/main.mjs) | [✔](FivePhases/src/main.mjs) |  |  |  |  |  | [✔](LanternShadows/src/main.mjs) |  | [✔](MechanismCity/src/main.mjs) |  | [✔](NightWardens/src/main.mjs) |  |  |  |  | [✔](SandScroll/src/main.mjs) |  |  |  |  |  |
| `@egret/engine/play` | 6 | [✔](CanalWatch/src/main.mjs) |  |  |  |  | [✔](InquestScrolls/src/main.mjs) |  |  |  |  |  | [✔](NezhaSea/src/main.mjs) |  |  | [✔](OperaDrums/src/main.mjs) | [✔](PeachCreek/src/main.mjs) |  |  |  |  | [✔](TaiwanMahjong/src/sound.mjs) |  |  |
| `@egret/engine/audio` | 1 |  |  |  |  |  |  |  |  |  |  |  |  | [✔](NightWardens/src/audio/sound.mjs) |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/audio` | 11 |  |  |  | [✔](FiveRegiments/src/audio.mjs) |  | [✔](InquestScrolls/src/audio/sound.mjs) |  | [✔](JY/web/wav-effects.mjs) | [✔](LanternShadows/src/sound.mjs) | [✔](LoveElective/src/audio.mjs) | [✔](MechanismCity/src/audio/sound.mjs) |  | [✔](NightWardens/src/audio/sound.mjs) | [✔](NineProvinces/src/audio/sound.mjs) | [✔](OperaDrums/src/audio/sound.mjs) |  |  | [✔](SandScroll/src/audio/sound.mjs) |  | [✔](StarBanner/src/audio/sound.mjs) |  |  |  |
| `@egret/engine/ui/semantics` | 7 |  |  |  |  |  | [✔](InquestScrolls/src/main.mjs) |  |  |  | [✔](LoveElective/src/engine/ui-semantics.mjs) | [✔](MechanismCity/src/main.mjs) |  | [✔](NightWardens/src/main.mjs) |  |  | [✔](PeachCreek/src/main.mjs) |  | [✔](SandScroll/src/main.mjs) |  |  |  | [✔](TeaHorseRoad/src/main.mjs) |  |
| `@egret/engine/ui/testing` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/engine/web/semantics` | 7 |  |  |  |  |  | [✔](InquestScrolls/src/main.mjs) |  |  |  | [✔](LoveElective/src/engine/ui-semantics.mjs) | [✔](MechanismCity/src/main.mjs) |  | [✔](NightWardens/src/main.mjs) |  |  | [✔](PeachCreek/src/main.mjs) |  | [✔](SandScroll/src/main.mjs) |  |  |  | [✔](TeaHorseRoad/src/main.mjs) |  |
| `@egret/spine` | 1 |  |  |  |  |  |  |  |  | [✔](LanternShadows/src/puppets.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/spine/web` | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| `@egret/contracts/resources` | 2 |  |  |  |  |  | [✔](InquestScrolls/src/view/type.mjs) |  |  | [✔](LanternShadows/src/puppets.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |

## 关键 API · Key APIs

| 能力 · Capability | 游戏数 · Games | CanalWatch | FengshenChronicle | FivePhases | FiveRegiments | FPS | InquestScrolls | jelly-pandas | JY | LanternShadows | LoveElective | MechanismCity | NezhaSea | NightWardens | NineProvinces | OperaDrums | PeachCreek | Rally | SandScroll | SnowTemple | StarBanner | TaiwanMahjong | TeaHorseRoad | Wulin |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 粒子发射器 · Particle emitter (`createParticleEmitter`) | 4 |  |  |  |  |  |  |  |  | [✔](LanternShadows/src/main.mjs) |  | [✔](MechanismCity/src/play/level.mjs) |  | [✔](NightWardens/src/view/field.mjs) |  |  |  |  | [✔](SandScroll/src/view/play.mjs) |  |  |  |  |  |
| 2D 物理关节 · 2D physics joints (`addJoint`) | 1 |  |  |  |  |  |  |  |  |  |  | [✔](MechanismCity/src/sim/sim.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |
| 托管界面根节点 · Managed UI root (`createUiRoot`) | 3 |  |  |  |  |  | [✔](InquestScrolls/src/view/notes.mjs) |  |  |  |  | [✔](MechanismCity/src/ui/settings.mjs) |  |  |  |  |  |  |  |  |  |  | [✔](TeaHorseRoad/src/ui/card.mjs) |  |
| 网页视频 · Browser video (`createBrowserVideo`) | 2 |  |  |  |  |  |  |  |  |  |  | [✔](MechanismCity/src/screens.mjs) |  |  |  |  |  |  |  |  |  |  | [✔](TeaHorseRoad/src/ui/screens.mjs) |  |
| 文字输入框 · Text input (`createTextInput`) | 1 |  |  |  |  |  | [✔](InquestScrolls/src/view/verdict.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Spine 骨骼动画 · Spine skeletons (`Spine`) | 1 |  |  |  |  |  |  |  |  | [✔](LanternShadows/src/puppets.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| 多点触控 · Multi-touch (`multi-touch`) | 1 |  |  |  |  |  |  |  |  |  | [✔](LoveElective/src/engine/stage.mjs) |  |  |  |  |  |  |  |  |  |  |  |  |  |

## 缺口 · Gaps

少于两款游戏用到的能力：只有一款游戏是例子，或者还没有例子。新游戏优先选这些能力来做。

Capabilities fewer than two games use: one example at most. A new game is a good place to show them.

| 能力 · Capability | 用到的游戏 · Used by |
|---|---|
| `@egret/engine/webgpu` | [LoveElective](LoveElective/src/engine/stage.mjs) |
| `@egret/engine/text` | [JY](JY/web/opening-dialogue.mjs) |
| `@egret/engine/web/input` | 无 · none |
| `@egret/engine/web/image` | 无 · none |
| `@egret/engine/web/text` | [JY](JY/web/main.mjs) |
| `@egret/engine/resources` | 无 · none |
| `@egret/engine/web/resources` | [InquestScrolls](InquestScrolls/src/view/type.mjs) |
| `@egret/engine/input` | 无 · none |
| `@egret/engine/web/gestures` | 无 · none |
| `@egret/engine/web/view` | 无 · none |
| `@egret/engine/web/pointer` | [LoveElective](LoveElective/src/engine/stage.mjs) |
| `@egret/engine/animation` | [NightWardens](NightWardens/src/view/field.mjs) |
| `@egret/engine/paragraph` | [InquestScrolls](InquestScrolls/src/view/type.mjs) |
| `@egret/engine/web/paragraph` | [InquestScrolls](InquestScrolls/src/view/type.mjs) |
| `@egret/engine/web/text-input` | [InquestScrolls](InquestScrolls/src/view/verdict.mjs) |
| `@egret/engine/ui/editing` | [InquestScrolls](InquestScrolls/src/view/notes.mjs) |
| `@egret/engine/web/editing` | [InquestScrolls](InquestScrolls/src/view/notes.mjs) |
| `@egret/engine/input/hover` | 无 · none |
| `@egret/engine/physics2d` | [MechanismCity](MechanismCity/src/sim/sim.mjs) |
| `@egret/engine/video` | 无 · none |
| `@egret/engine/web/loop` | [LoveElective](LoveElective/src/engine/stage.mjs) |
| `@egret/engine/web/screen` | 无 · none |
| `@egret/engine/audio` | [NightWardens](NightWardens/src/audio/sound.mjs) |
| `@egret/engine/ui/testing` | 无 · none |
| `@egret/spine` | [LanternShadows](LanternShadows/src/puppets.mjs) |
| `@egret/spine/web` | 无 · none |
| 2D 物理关节 · 2D physics joints (`addJoint`) | [MechanismCity](MechanismCity/src/sim/sim.mjs) |
| 文字输入框 · Text input (`createTextInput`) | [InquestScrolls](InquestScrolls/src/view/verdict.mjs) |
| Spine 骨骼动画 · Spine skeletons (`Spine`) | [LanternShadows](LanternShadows/src/puppets.mjs) |
| 多点触控 · Multi-touch (`multi-touch`) | [LoveElective](LoveElective/src/engine/stage.mjs) |
