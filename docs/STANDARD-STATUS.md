# 工程标准现状 · Standard status

由 `node tools/check-standard.mjs --write` 生成；标准见 [GAME-STANDARD.md](GAME-STANDARD.md)。✔ 达标，✘ 缺或不全。

Made by `node tools/check-standard.mjs --write`; the standard is [GAME-STANDARD.md](GAME-STANDARD.md). ✔ meets it, ✘ missing or incomplete.

| 项 · Item | FivePhases | FPS | jelly-pandas | JY | LanternShadows | LoveElective | MechanismCity | Rally | SnowTemple | TeaHorseRoad | Wulin | egret-game |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| README.md | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| README title (# 中文 · English) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| README: 简介 · Introduction | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| README: 玩法与操作 · How to play | ✘ | ✔ | ✔ | ✘ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| README: 引擎能力对照表 · Engine capabilities | ✘ | ✔ | ✔ | ✘ | ✔ | ✔ | ✔ | ✔ | ✘ | ✔ | ✘ | ✔ |
| README: 已验证 · Verified | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ | ✘ | ✘ | ✔ | ✘ | ✔ |
| README: 已知问题 · Known issues | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| README: 已解决 · Solved | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ | ✘ | ✘ | ✔ | ✘ | ✔ |
| README: 未完成 · Unfinished | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ | ✘ | ✘ | ✔ | ✘ | ✔ |
| README: 目录结构 · Layout | ✔ | ✔ | ✔ | ✘ | ✔ | ✔ | ✔ | ✔ | ✘ | ✔ | ✘ | ✔ |
| README: 引擎副本 · Engine copy | ✘ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| README: sections in order | ✘ | ✘ | ✘ | ✔ | ✘ | ✘ | ✔ | ✘ | ✔ | ✔ | ✔ | ✔ |
| README: play link and engine link | ✘ | ✔ | ✔ | ✘ | ✘ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| README: capability table (… | 文件 · File) | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ | ✘ | ✘ | ✔ | ✘ | ✔ |
| README: engine commit as in vendor/SOURCE.md | ✘ | ✔ | ✘ | ✔ | ✔ | ✘ | ✔ | ✘ | ✔ | ✔ | ✔ | ✔ |
| ENGINE-NOTES.md | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| ENGINE-NOTES: numbered items | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ | ✘ | ✘ | ✔ | ✘ | ✔ |
| ENGINE-NOTES: status, what happens, workaround, suggestion in every item | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ | ✘ | ✘ | ✔ | ✘ | ✔ |
| QUALITY.md | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| test/*.test.mjs | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| tests cover the save | ✘ | ✘ | ✘ | ✔ | ✘ | ✔ | ✔ | ✘ | ✔ | ✔ | ✔ | ✔ |
| tests cover the rules | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| test/accept.mjs (browser acceptance) | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ |
| test/baseline/*.png | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ | ✔ |
| vendor/SOURCE.md with the engine commit | ✘ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| index.html import map = vendor/importmap.json | – | ✘ | – | – | – | – | ✔ | ✔ | ✔ | ✔ | – | ✔ |

## 每个游戏缺的项 · What each game lacks

- **FivePhases**: README: 玩法与操作 · How to play (empty); README: 引擎能力对照表 · Engine capabilities (empty); README: 已验证 · Verified (empty); README: 已解决 · Solved (empty); README: 引擎副本 · Engine copy (empty); README: sections in order (3,112,116,120,124,128,107,13,132); README: play link and engine link; README: capability table (… | 文件 · File); README: engine commit as in vendor/SOURCE.md (no commit); ENGINE-NOTES: numbered items (0 items); ENGINE-NOTES: status, what happens, workaround, suggestion in every item; tests cover the save; test/accept.mjs (browser acceptance); test/baseline/*.png (0 pictures); vendor/SOURCE.md with the engine commit
- **FPS**: README: 已验证 · Verified (empty); README: 已解决 · Solved (empty); README: 未完成 · Unfinished (empty); README: sections in order (3,9,57,152,156,160,164,91,168); README: capability table (… | 文件 · File) (| 部分 · Part | 引擎功能 · Engine feature |); ENGINE-NOTES: numbered items (0 items); ENGINE-NOTES: status, what happens, workaround, suggestion in every item; tests cover the save; test/accept.mjs (browser acceptance); test/baseline/*.png (0 pictures); index.html import map = vendor/importmap.json
- **jelly-pandas**: README: 已验证 · Verified (empty); README: 已解决 · Solved (empty); README: 未完成 · Unfinished (empty); README: sections in order (3,9,39,127,131,135,139,66,121); README: capability table (… | 文件 · File) (| 部分 · Part | 引擎功能 · Engine feature |); README: engine commit as in vendor/SOURCE.md (db9772e); ENGINE-NOTES: numbered items (0 items); ENGINE-NOTES: status, what happens, workaround, suggestion in every item; tests cover the save; test/accept.mjs (browser acceptance); test/baseline/*.png (0 pictures)
- **JY**: README: 玩法与操作 · How to play (empty); README: 引擎能力对照表 · Engine capabilities (empty); README: 已验证 · Verified (empty); README: 已解决 · Solved (empty); README: 未完成 · Unfinished (empty); README: 目录结构 · Layout (empty); README: play link and engine link; README: capability table (… | 文件 · File); ENGINE-NOTES: numbered items (0 items); ENGINE-NOTES: status, what happens, workaround, suggestion in every item; test/accept.mjs (browser acceptance); test/baseline/*.png (0 pictures)
- **LanternShadows**: README: 已验证 · Verified (empty); README: 已解决 · Solved (empty); README: 未完成 · Unfinished (empty); README: sections in order (3,9,122,210,214,218,222,172,226); README: play link and engine link; README: capability table (… | 文件 · File) (| 能力 · Capability | 用在哪里 · Where |); ENGINE-NOTES: numbered items (0 items); ENGINE-NOTES: status, what happens, workaround, suggestion in every item; tests cover the save; test/accept.mjs (browser acceptance); test/baseline/*.png (0 pictures)
- **LoveElective**: README: 已验证 · Verified (empty); README: 已解决 · Solved (empty); README: 未完成 · Unfinished (empty); README: sections in order (3,11,113,196,200,204,208,136,190); README: capability table (… | 文件 · File) (| 部分 · Part | 引擎功能 · Engine feature |); README: engine commit as in vendor/SOURCE.md (b6a392a); ENGINE-NOTES: numbered items (0 items); ENGINE-NOTES: status, what happens, workaround, suggestion in every item; test/accept.mjs (browser acceptance); test/baseline/*.png (0 pictures)
- **MechanismCity**: test/accept.mjs (browser acceptance); test/baseline/*.png (0 pictures)
- **Rally**: README: 已验证 · Verified (empty); README: 已解决 · Solved (empty); README: 未完成 · Unfinished (empty); README: sections in order (3,9,84,172,176,180,184,111,166); README: capability table (… | 文件 · File) (| 部分 · Part | 引擎功能 · Engine feature |); README: engine commit as in vendor/SOURCE.md (f1fbd90); ENGINE-NOTES: numbered items (0 items); ENGINE-NOTES: status, what happens, workaround, suggestion in every item; tests cover the save; test/accept.mjs (browser acceptance); test/baseline/*.png (0 pictures)
- **SnowTemple**: README: 引擎能力对照表 · Engine capabilities (empty); README: 已验证 · Verified (empty); README: 已解决 · Solved (empty); README: 未完成 · Unfinished (empty); README: 目录结构 · Layout (empty); README: capability table (… | 文件 · File); ENGINE-NOTES: numbered items (0 items); ENGINE-NOTES: status, what happens, workaround, suggestion in every item; test/accept.mjs (browser acceptance); test/baseline/*.png (0 pictures)
- **TeaHorseRoad**: test/accept.mjs (browser acceptance); test/baseline/*.png (0 pictures)
- **Wulin**: README: 引擎能力对照表 · Engine capabilities (empty); README: 已验证 · Verified (empty); README: 已解决 · Solved (empty); README: 未完成 · Unfinished (empty); README: 目录结构 · Layout (empty); README: capability table (… | 文件 · File); ENGINE-NOTES: numbered items (0 items); ENGINE-NOTES: status, what happens, workaround, suggestion in every item; test/accept.mjs (browser acceptance); test/baseline/*.png (0 pictures)
- **templates/egret-game**: 全部达标 · all met
