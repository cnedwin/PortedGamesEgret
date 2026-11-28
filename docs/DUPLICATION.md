# 重复代码 · Duplicated code

由 `node tools/duplication.mjs --write` 从各游戏的 `src/` 生成，不要手改；`--check` 检查它是否过期。三个以上游戏各写了一遍的代码，该进引擎的 kit 或模板；「引擎已有」一栏写着可以换成什么。

Made by `node tools/duplication.mjs --write` from the `src/` of every game; do not edit by hand, and `--check` says whether it is out of date. Code three or more games each wrote belongs in the engine's kit or in the template; "Engine has" names what can replace it.

24 个游戏，4831 段至少 40 个词元的顶层代码。名字、数字和字符串都换成同一个记号后，连续 8 个词元的 Jaccard 指数不小于 0.6 就算相同。

24 games, 4831 top-level units of at least 40 tokens. With every name, number and string made one token, two units are alike when the Jaccard index of their runs of 8 tokens is 0.6 or more.

## 1. 3 个以上游戏写了几乎相同的代码 · Code that 3 or more games wrote nearly alike

| 名字 · Names | 游戏数 · Games | 相似度 · Alike | 词元 · Tokens | 引擎已有 · Engine has | 位置 · Where |
|---|:-:|:-:|:-:|---|---|
| `seeded`, `createRandom`, `rng`, `randomSource`, `random` | 11 | 0.84 | 109 | `createRandom`, `hashSeed` (@egret/engine/kit) | CanalWatch/src/sim/world.mjs:27<br>FiveRegiments/src/sim/fight.mjs:78<br>NezhaSea/src/sim/world.mjs:41<br>NineProvinces/src/sim/battle.mjs:85<br>NineProvinces/src/view/mapart.mjs:18<br>OperaDrums/src/sim/bot.mjs:7<br>PeachCreek/src/sim/world.mjs:47<br>Rally/src/sim.mjs:13<br>… +4 |
| `useFixedWorldResolution` | 4 | 0.82 | 57 | – | FiveRegiments/src/view/canvas-policy.mjs:2<br>NineProvinces/src/view3d/canvas-policy.mjs:2<br>SnowTemple/src/view/canvas-policy.mjs:2<br>StarBanner/src/view/canvas-policy.mjs:2 |
| `rgb` | 3 | 0.98 | 53 | – | FPS/src/build.mjs:9<br>Rally/src/shapes.mjs:19<br>jelly-pandas/src/panda.mjs:21<br>jelly-pandas/src/view.mjs:34 |

## 2. 5 个以上游戏用的同一个函数名 · Names that 5 or more games gave a function

同名不一定是同一段代码：`update`、`draw` 这类名字各游戏写法各异。和引擎已有的东西同名的，先看能不能换掉。

One name is not always one piece of code: games write an `update` or a `draw` of their own. A name that matches what the engine has is worth a look first.

| 名字 · Name | 游戏数 · Games | 引擎已有 · Engine has | 游戏 · Games |
|---|:-:|---|---|
| `createSound` | 15 | `createAudioCues`, `encodeWav` (@egret/engine/kit) | CanalWatch, FengshenChronicle, FiveRegiments, InquestScrolls, LanternShadows, LubanBridge, MechanismCity, NezhaSea, NightWardens, NineProvinces, OperaDrums, PeachCreek, SandScroll, StarBanner, TaiwanMahjong |
| `WORDS` | 15 | `createTextTable`, `pickLanguage` (@egret/engine/kit) | CanalWatch, FiveRegiments, InquestScrolls, LanternShadows, LubanBridge, NezhaSea, NightWardens, NineProvinces, OperaDrums, PeachCreek, SandScroll, SnowTemple, StarBanner, TaiwanMahjong, Wulin |
| `app` | 13 | – | CanalWatch, InquestScrolls, LubanBridge, MechanismCity, NezhaSea, NightWardens, NineProvinces, OperaDrums, PeachCreek, SandScroll, StarBanner, TaiwanMahjong, TeaHorseRoad |
| `openSave` | 13 | `createSaveStore` + `shapeOf` (@egret/engine/kit) | CanalWatch, FiveRegiments, InquestScrolls, LubanBridge, MechanismCity, NezhaSea, NightWardens, OperaDrums, SandScroll, SnowTemple, StarBanner, TaiwanMahjong, TeaHorseRoad |
| `noise` | 12 | – | FPS, FiveRegiments, LanternShadows, LubanBridge, MechanismCity, NightWardens, NineProvinces, SandScroll, SnowTemple, StarBanner, TeaHorseRoad, Wulin |
| `createHud` | 10 | – | FivePhases, FiveRegiments, MechanismCity, NezhaSea, Rally, SnowTemple, StarBanner, TaiwanMahjong, TeaHorseRoad, jelly-pandas |
| `createView` | 10 | – | CanalWatch, FPS, FengshenChronicle, NezhaSea, OperaDrums, PeachCreek, Rally, SnowTemple, TaiwanMahjong, jelly-pandas |
| `C` | 9 | – | FPS, FivePhases, FiveRegiments, LanternShadows, LubanBridge, NineProvinces, OperaDrums, StarBanner, jelly-pandas |
| `finish` | 9 | – | CanalWatch, FivePhases, InquestScrolls, NezhaSea, NineProvinces, OperaDrums, StarBanner, TeaHorseRoad, Wulin |
| `freshSave` | 9 | `createSaveStore` + `shapeOf` (@egret/engine/kit) | CanalWatch, LubanBridge, NezhaSea, NightWardens, OperaDrums, PeachCreek, SandScroll, StarBanner, TaiwanMahjong |
| `mix` | 9 | – | FiveRegiments, LanternShadows, LoveElective, LubanBridge, NightWardens, NineProvinces, OperaDrums, SandScroll, Wulin |
| `seeded` | 9 | `createRandom`, `hashSeed` (@egret/engine/kit) | CanalWatch, LoveElective, LubanBridge, MechanismCity, NezhaSea, OperaDrums, PeachCreek, TaiwanMahjong, TeaHorseRoad |
| `settle` | 9 | – | FivePhases, FiveRegiments, MechanismCity, PeachCreek, SandScroll, SnowTemple, StarBanner, TeaHorseRoad, Wulin |
| `SKIN` | 9 | – | CanalWatch, FPS, FivePhases, LanternShadows, LoveElective, NezhaSea, NineProvinces, OperaDrums, Wulin |
| `text` | 9 | – | CanalWatch, FPS, FiveRegiments, LanternShadows, NineProvinces, OperaDrums, PeachCreek, TaiwanMahjong, Wulin |
| `button` | 8 | – | CanalWatch, FPS, FivePhases, LanternShadows, NezhaSea, PeachCreek, TaiwanMahjong, Wulin |
| `EFFECTS` | 8 | – | CanalWatch, InquestScrolls, LoveElective, LubanBridge, MechanismCity, NineProvinces, StarBanner, TaiwanMahjong |
| `panel` | 8 | – | CanalWatch, LubanBridge, NezhaSea, NineProvinces, PeachCreek, TaiwanMahjong, TeaHorseRoad, Wulin |
| `boot` | 7 | – | FengshenChronicle, FivePhases, NightWardens, NineProvinces, PeachCreek, SandScroll, TaiwanMahjong |
| `createGame` | 7 | – | FPS, LoveElective, NineProvinces, SandScroll, SnowTemple, StarBanner, jelly-pandas |
| `createInput` | 7 | – | FPS, FiveRegiments, LanternShadows, Rally, SnowTemple, StarBanner, jelly-pandas |
| `fail` | 7 | – | FPS, FiveRegiments, LanternShadows, Rally, SnowTemple, Wulin, jelly-pandas |
| `frame` | 7 | – | CanalWatch, FengshenChronicle, MechanismCity, NezhaSea, NightWardens, OperaDrums, SandScroll |
| `LEVELS` | 7 | – | LoveElective, LubanBridge, MechanismCity, SandScroll, SnowTemple, StarBanner, TaiwanMahjong |
| `titleScreen` | 7 | – | InquestScrolls, LoveElective, LubanBridge, MechanismCity, NightWardens, SandScroll, TeaHorseRoad |
| `tone` | 7 | `createAudioCues`, `encodeWav` (@egret/engine/kit) | FiveRegiments, MechanismCity, NightWardens, NineProvinces, PeachCreek, SandScroll, TeaHorseRoad |
| `act` | 6 | – | CanalWatch, LoveElective, NineProvinces, OperaDrums, StarBanner, TaiwanMahjong |
| `box` | 6 | – | CanalWatch, FPS, FivePhases, FiveRegiments, LanternShadows, TeaHorseRoad |
| `createAudio` | 6 | – | FPS, FivePhases, LoveElective, Rally, SnowTemple, jelly-pandas |
| `createScreens` | 6 | – | FiveRegiments, NezhaSea, OperaDrums, PeachCreek, StarBanner, TaiwanMahjong |
| `pluck` | 6 | – | FiveRegiments, LubanBridge, MechanismCity, OperaDrums, SandScroll, TeaHorseRoad |
| `polygon` | 6 | – | CanalWatch, FengshenChronicle, FiveRegiments, LubanBridge, NineProvinces, PeachCreek |
| `rgb` | 6 | – | FPS, LoveElective, Rally, SnowTemple, Wulin, jelly-pandas |
| `SOUNDS` | 6 | `createAudioCues`, `encodeWav` (@egret/engine/kit) | FiveRegiments, LanternShadows, NightWardens, NineProvinces, SandScroll, TeaHorseRoad |
| `spawn` | 6 | – | CanalWatch, NezhaSea, NightWardens, NineProvinces, SnowTemple, StarBanner |
| `step` | 6 | – | CanalWatch, FiveRegiments, NezhaSea, NightWardens, SandScroll, SnowTemple |
| `stroke` | 6 | – | CanalWatch, FPS, FengshenChronicle, LoveElective, SnowTemple, Wulin |
| `wrap` | 6 | – | CanalWatch, InquestScrolls, LubanBridge, NezhaSea, Rally, SandScroll |
| `backdrop` | 5 | – | InquestScrolls, MechanismCity, NightWardens, SandScroll, Wulin |
| `CUES` | 5 | `createAudioCues`, `encodeWav` (@egret/engine/kit) | FivePhases, NightWardens, OperaDrums, PeachCreek, Wulin |
| `ellipse` | 5 | – | CanalWatch, FengshenChronicle, LoveElective, NightWardens, OperaDrums |
| `ENEMIES` | 5 | – | FPS, FengshenChronicle, FivePhases, NezhaSea, jelly-pandas |
| `fit` | 5 | – | FiveRegiments, LoveElective, NineProvinces, PeachCreek, Rally |
| `pause` | 5 | – | LanternShadows, NezhaSea, Rally, TaiwanMahjong, TeaHorseRoad |
| `ring` | 5 | – | CanalWatch, FiveRegiments, NezhaSea, NineProvinces, TaiwanMahjong |
| `row` | 5 | – | CanalWatch, FPS, FiveRegiments, NineProvinces, jelly-pandas |
| `smooth` | 5 | – | FPS, LoveElective, NineProvinces, SnowTemple, jelly-pandas |
| `strike` | 5 | – | FiveRegiments, NezhaSea, NightWardens, OperaDrums, Wulin |
| `t` | 5 | `createTextTable`, `pickLanguage` (@egret/engine/kit) | FiveRegiments, NightWardens, NineProvinces, SandScroll, StarBanner |
