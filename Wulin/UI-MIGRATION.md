# 原生界面迁移 · Native UI migration

引擎：`b5628eb9997b67cf6163a388f5aa06f321f3833a` → `39560b3ef608e4dda68c8461f435c279d1eba3d2`，官方 vendor 工具生成，无本地补丁。 · Official vendoring only; no local patch.

## 界面 · Screens

游戏共用一个 Play + World3D 时钟；3D 画布始终全屏。交互和文本是 egret display tree，不是 HTML。界面以纸色、墨色、金色和朱色统一，有宋体标题、立绘、可滚动名册和安全区布局；战斗专用 HUD 在矮横屏留出操作视野。 · The transparent Play view and World3D share a clock. The command frame uses the drawn native tree with paper, ink, gold and cinnabar, serif headings and portraits; the combat-only HUD leaves room on short landscape displays.

| 原功能 · Former screen | 原生实现 · Native replacement |
|---|---|
| 标题、三幕序章、门派选择、传承 · Title, prologue, founder and succession | `src/ui/native-pages.mjs`: images, selected tabs, scroll, confirmation |
| 山门 · Seat | Native command panel, scene gestures, building/ground and person picking |
| 弟子、武学 · Disciples and arts | Named, paged lists, native selection and editor |
| 江湖 · Realm | World3D picking and gestures, native map detail, optional painted list |
| 战阵 · Battle | Army bars, tactical commands, report toggle, focus and retreat |
| 纪事 · Chronicle | Scroll and paged annals, arts, wanderers and relics |
| 存档 · Saves | Native slot cards and file actions; old check-summed bytes retained |
| 常驻栏、要务、提示 · HUD, objectives, feedback | `src/ui/native-shell.mjs`: `game.show`, badges, hints, toast, confirmation |
| 原有 33 种弹出单 · 33 original sheets | `src/ui/native-sheets.mjs`: guide, guard, goal, load, build, applicant, job, batch, wheel, master, move, settle, march, event, person, assign, moment, unlock, tourney, duel, season, herald, outcome, siege, gear, pills, meridian, create, offices, retreat, fight, diplomacy, teaching, settings, editor |
| 地名、建筑名、人物与伤害 · Scene labels/damage | `src/view/scene-markers.mjs` native World3D overlay projection, glyph font |
| 语言 · Languages | `src/ui/locale.mjs` and dictionaries, `createTextTable`, `pickLanguage`; Chinese rule data and save IDs unchanged |

原始源代码的弹出单键数以实际源码为准：33，不是规划估计数。主程序原约 2,100 行，现在把描述、公共组件、本地化和规则回调分离；删除页面游戏 CSS 和旧 HTML 界面生成器。 · The real source had 33 sheet keys. The main controller is split into data descriptions, shared controls, localization and rule callbacks. Legacy DOM/CSS authoring is removed from the live game.

## 屏幕与性能 · Fit and performance

`fit:'expand'`、`portrait`、原生 `tablet/tabletPortrait`、`uiScale:{min:1,max:1.2}`；48 单位普通按钮至少 44 CSS 像素，2D 绘制按需，屏幕切换不重新创建引擎。段落使用正式 Canvas paragraph provider 而非 CanvasKit；存在硬缓存上限，采用分页和键控替换。 · Native fit/orientation variants adapt touch size; static views use on-demand 2D drawing. The Canvas paragraph provider needs no Wasm; long lists page within its hard budget.

原来的本地文件封装 `magic:wulin-save` 与存档槽键保留。音频在本轮保留原有的混音与旁白实现，文件选择仍由浏览器提供（见 ENGINE-NOTES）。 · Existing save bytes and slot keys stay compatible. Audio's existing calibrated mix and browser file exchange are retained.

## 复跑 · Repeat

```sh
cd Wulin
node --test test/*.test.mjs
node test/accept.mjs
node vendor/egret.mjs verify
node vendor/egret.mjs verify --screens --play test/screen-verify.mjs --out <directory>
node tools/headless.mjs
node tools/balance.mjs
```

最终验收详情、物理设备、未覆盖条件与工具裁切报告修复前后对比见 [QUALITY.md](QUALITY.md) 与 [ENGINE-NOTES.md](ENGINE-NOTES.md)。 · See the quality record and engine notes for measured device results, unrun scenarios and the before/after screen-verifier findings.

[界面对照实拍 · Interface comparisons](docs/ui-migration-comparison.jpg) — 标题、山门及 Fold7 战斗指挥栏调整前后；非等种子的画质测量图。 · Title, seat and Fold7 combat HUD comparisons; not a seeded performance fixture.
