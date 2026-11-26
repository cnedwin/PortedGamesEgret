# 漕河守闸 · Canal Watch

## 简介 · Introduction

漕河守闸是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的塔防 Demo。北宋汴河上，水寇的快艇、楼船和旗舰顺流而下，轻步匪和刀盾兵沿纤道逼近。在河岸的十二个建造位建弩楼、砲车、火箭台和铜锣哨，适时关闸拦船，守住城门十二波。标题页使用为本项目生成的雨夜汴河插画。战场底图由 Canvas 绘制，白鹭实时绘制塔、敌人、水闸和战斗特效，并混合本作原创的配乐与音效。

Canal Watch is a game demo made on its own with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild), the new
Egret engine: a tower defence. On the Bian canal of the Northern Song, raiders' skiffs, junks and a flagship come
down the water while men on foot and shield-bearers come along the towpath. Build crossbow towers, trebuchets, fire
arrows and gong posts on twelve plots along the banks, shut a sluice gate to hold the boats for a few seconds when it
counts, and keep the city gate for twelve waves. The title illustration of the Bian Canal in the rain was generated
for this game. Canvas paints the battlefield backdrop. Egret renders towers, enemies, gates and combat effects
in real time and mixes the original score with the synthesized effects.

[在线试玩 · Play online](https://cnedwin.github.io/PortedGamesEgret/CanalWatch/)

## 双闸截漕 · Sluice Intercept

标题页可进入五波短关，以 ×1 速度正常布防约需 5–6 分钟。第一波水陆同时来敌，第二波开始有载人楼船。上闸适合提前布置砲车和岸防，船员上岸后需要多走一段。下闸靠近城门，可以多打一段水路，但也要在近处接住上岸的船员。点船或「登陆预判」可以看到它此刻沉没的大致上岸点。战报分别记录两闸截停的船只、上岸船员和漏进城的船员。

Select Sluice Intercept on the title screen for a five-wave challenge that takes about 5–6 minutes at ×1.
The first wave attacks by water and land. Junks carry crews from wave two. An upstream defence trades early
tower investment for more time to catch crews on the towpath. The lower gate gives towers longer to fire on boats,
with less room to catch crews before the wall. Select a ship or use Landing preview to see where its crew would land
if it sank now. The report tracks ships held at each gate and crews ashore, stopped and leaked.

## 玩法与操作 · How to play

**标准守城 · Standard defence**：挡住十二波敌人，城门的命不归零。守住时按剩下的命给星：剩九成以上三颗，五成以上两颗，其余一颗；两种难度各记最好的星数。 · Stop twelve waves before the gate's lives run out. A held game earns stars by the lives kept: three for nine tenths or more, two for half or more, otherwise one; the best on each difficulty is kept.

**规则 · Rules**

- 船走水道，人走纤道，都往右边的城门去。楼船被击沉时，船上的人跳上最近的纤道接着走。 · Boats keep to the canal and men to the towpath, both towards the gate on the right. A sunk junk's crew jump ashore onto the nearest towpath and go on.
- 四种塔各能升两级 · Four towers, each raised twice:

| 塔 · Tower | 用处 · What it does |
|---|---|
| 弩楼 · Crossbow tower | 射得快，打盾兵只有一半伤害 · fast; half damage to shields |
| 砲车 · Trebuchet | 石头砸一片，打船 1.5 倍，太近够不着 · stones hit an area, 1.5× on boats, cannot reach close |
| 火箭台 · Fire arrows | 点着了会一直烧，船烧得更旺 · sets raiders burning, boats burn harder |
| 铜锣哨 · Gong post | 附近敌人变慢，附近的塔射得更快 · slows raiders near it, quickens towers near it |

- 上闸、下闸各能关 6 秒，船在闸前排队停下，人不受影响；关过以后 20 秒才能再关。 · Each gate shuts for 6 seconds: boats queue above it, men walk on; it can be shut again 20 seconds later.
- 两波之间有 12 秒；提前叫下一波，按剩下的秒数每秒多给 2 两。拆塔退回所花银子的七成。 · There are 12 seconds between waves; calling the next one early pays 2 silver for every second left. A tower sold returns seven tenths of what it cost.
- 寻常：20 条命、起手 240 两。险峻：15 条命，敌人更结实。 · Normal: 20 lives, 240 silver. Hard: 15 lives and tougher raiders.

| | 键盘 · Keyboard | 鼠标 · Mouse | 触屏 · Touch |
|---|---|---|---|
| 选建造位 · Choose a plot | Tab / Shift+Tab | 点 · click | 点 · tap |
| 打开建塔 / 升级 / 拆除 · Open build, upgrade, sell | Enter | 点建造位 · click the plot | 点建造位 · tap the plot |
| 直接建塔 · Build at once | 1 弩楼 · 2 砲车 · 3 火箭台 · 4 铜锣哨 | | |
| 升级 / 拆除 · Upgrade / sell | U / X | 选单里的按钮 · the picker's buttons | 同左 · the same |
| 关上闸 / 下闸 · Shut a gate | Q / E | 顶栏按钮 · the bar's buttons | 同左 · the same |
| 下一波 · Next wave | N，焦点不在按钮上时也可按 Space · or Space when no button has the focus | 顶栏「下一波」· the bar | 同左 · the same |
| 加速 · Speed | F（×1 → ×2 → ×3） | 顶栏 · the bar | 同左 · the same |
| 暂停与菜单 · Pause and menu | P 或 Esc · P or Esc | 「菜单」· Menu | 同左 · the same |

游戏没有手柄操作。切到别的标签页时，进行中的一局会停在菜单上。设置在标题和菜单里：音效、配乐、减弱动画（系统设了「减少动态效果」时自动减弱）、中英文。 · There are no gamepad controls. Switching to another tab pauses a game in play behind the menu. The settings, on the title and in the menu: sound, music, reduced motion (on already when the system asks), and the language.

触屏先点塔种预览花费与射程，再点「建造」确认。备战提示会指出第一波的进攻路线，并在波次间预告水路和纤道的来敌。 · On touch screens, choose a tower to preview its cost and range, then tap Build to confirm. The preparation cue identifies the first wave’s route and previews water and towpath raiders between waves.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `play`（`@egret/engine/play`） | 一次调用建好画布、帧循环和地图框里的透明舞台 · one call makes the canvas, the loop and the clear stage inside the map's box | `src/main.mjs` |
| `game.sprite` + Graphics | 四种塔（每级多一点红）、五种敌人、箭石火、闸门、射程圈，全用代码画 · the towers (a red pip a level), the raiders, arrows, stones and fire, the gates and the reach rings, all drawn in code | `src/view.mjs` |
| `game.rect`、`game.circle`、图层精灵 · layer sprites | 血条、火苗；塔、敌人、箭石分层，后建的塔也在敌人后面 · health bars and flames; towers, raiders and shots in layers | `src/view.mjs` |
| `game.burst`、`game.shake` | 投石尘浪和落水、沉船碎片、失守反馈。减弱动画时保留静态命中标记 · debris, water impacts, and a breach cue. Reduced motion keeps static hit markers | `src/combat-fx.mjs` |
| `game.text` + `game.tween` | 击退时飘起的「+银子」· the floating silver on a kill | `src/view.mjs` |
| `game.toast` | 「第 n 波来了」「旗舰来了」· the wave notices | `src/main.mjs` |
| `game.timeScale`、`pause`、`resume`、`after` | ×1/×2/×3 加速、菜单暂停、结算前的停顿 · the speeds, the pause behind the menu, the beat before the end | `src/main.mjs` |
| `game.reducedMotion` | 设置里的「减弱动画」，没设时跟随系统 · the reduced-motion setting, following the system unless set | `src/main.mjs` |
| `createBrowserAudio` + `game.sfx` | 后台合成琴笛、战鼓和器械声，交给白鹭混音。配乐随战况切换，两类音量各自控制 · original plucked strings, flute, drums and foley synthesized off-thread, with separate music and effects buses in Egret | `src/sound.mjs` |
| `createTextTable` + `pickLanguage`（`@egret/engine/kit`） | 中英文文字表、`missing()` 检查两种语言齐全、按浏览器语言开局 · the word table, `missing()` to check both languages, the browser's language at the start | `src/i18n.mjs` |
| `browserLanguages`、`prefersReducedMotion`（`@egret/engine/web/kit`） | 开局的语言；关掉「减弱动画」时回到系统设置 · the first language; the system's motion setting when the game's is turned off | `src/main.mjs` |
| `createSaveStore` + `browserSaveStorage` | 设置和两种难度的最好星数；坏档另存后重新开始，存储拒绝写入时提示 · settings and best stars; a broken save set aside, a refusing storage told | `src/saves.mjs`, `src/main.mjs` |

## 规则与平衡 · Rules and balance

规则在 `src/sim/`，不碰页面也不碰引擎；`src/sim/bot.mjs` 是按计划下塔的电脑玩家，`tools/balance.mjs` 让它按几种打法各打若干局。改了 `src/sim/data.mjs` 的数字之后跑一遍：

The rules are in `src/sim/`, free of the page and the engine; `src/sim/bot.mjs` is a computer player that builds to a
plan, and `tools/balance.mjs` has it play a number of games each way. Run it after changing a number in
`src/sim/data.mjs`:

```sh
node tools/balance.mjs 12
```

2026-11-21 在 Node 22 里各打 12 局（种子 1–12）的结果 · The results of 12 games each (seeds 1–12) in Node 22 on
2026-11-21:

| 打法 · Way of playing | 寻常 守住 · Normal held | 寻常 平均星 · stars | 险峻 守住 · Hard held | 险峻 平均星 · stars |
|---|---|---|---|---|
| 按计划建 12 座、升级、关闸 · the plan, upgrades, gates | 12/12 | 3.00 | 12/12 | 2.00 |
| 不关闸 · no gates | 12/12 | 2.83 | 12/12 | 1.92 |
| 不升级 · no upgrades | 0/12 | 0 | 0/12 | 0 |
| 只建前 6 座 · half the plan | 12/12 | 1.33 | 1/12 | 0.08 |
| 全是弩楼 · crossbows only | 0/12（到第 9 波） | 0 | 0/12（到第 7 波） | 0 |
| 每波都提前叫 · every wave called early | 12/12 | 2.75 | 5/12 | 0.42 |

## 已验证 · Verified

- `node --test test/*.test.mjs`（Node 22，28 项全部通过）：规则——建造位不压道且都够得着一条道、同种子同结果、建塔升级拆塔与银子、瞄准最靠前的敌人、盾兵减伤和对船加成、溅射、燃烧、铜锣减速和加快塔、闸门拦船不拦人且有冷却、沉船船员上岸、进城扣命与失败、提前叫波的奖励、险峻难度更少命更强敌、十二波编排、星数、不建塔必败、电脑玩家在寻常难度的 4 个种子上都守住且至少两星；存档——新档、设置与星数写入、只有更多星才算新纪录、坏档另存、版本过新、存储拒绝写入；文字——两种语言齐全且占位符一致、英文里没有中文、按浏览器语言开局、界面代码不写死中文；引擎副本——import map 一致、用到的入口都在副本里、规则文件不碰页面和引擎。 · All 28 Node tests pass: the rules, the save, the words and the engine copy.
- `node test/accept.mjs`（无头 Chromium 153，SwiftShader 软件渲染，1280×800）：只用键盘走完——标题第一个难度有焦点；Tab 到「音效」按 Space 关掉并存档；切到英文后所有按钮读英文、语言存档；Enter 开局、焦点落在建造位 6；Enter 打开选单、再 Enter 建弩楼扣 70 两、焦点回到建造位并读出塔名；Tab 到下一个建造位按 4 建铜锣哨；N 开第一波；F 两次三倍速；Q 关上闸；P 暂停后画面不动；Esc 继续；剩一条命时第一个进城的敌人结束这一局、结算写「城门失守」并计数；Enter 再来一局地图清空；把第十二波打完得三星和「新的最好成绩」并存档；回标题显示最好星数；存档改坏后标题提示并重新开始。标题、开局地图和结算三张截图基线一致，控制台没有错误。 · The whole game by keyboard alone in headless Chromium with software rendering, three baselines matching and a clean console.
- `node ../tools/quality.mjs CanalWatch`：自动项全部达标，见 [QUALITY.md](QUALITY.md)。桌面帧时间 p95 16.7 ms（标题，无头 SwiftShader）；另在同一环境里量了第十波、几十个敌人同屏时 p95 16.8 ms。 · Every automatic item passes; frame time p95 16.7 ms on the title and 16.8 ms in a crowded tenth wave, headless and software-drawn.
- `node tools/balance.mjs 12`：结果见上一节 · results in the section above.

## 已知问题 · Known issues

- 没有在真机（手机、带显卡的桌面）上运行过；触屏走完一局、中端手机帧时间、切回后台后的声音和计时都「未运行」。帧时间只在无头浏览器的软件渲染里量过。 · Not run on a real phone or a desktop with a GPU; touch play, phone frame times and sound after coming back are not run. Frame times come only from software rendering in a headless browser.
- 竖着拿手机时地图只有屏幕宽，建造位按钮保持 44 像素，彼此最近处只隔几个像素；横过来玩更从容。 · On an upright phone the map is only as wide as the screen; the plot buttons keep 44 pixels and come within a few pixels of each other. Turning the phone sideways gives more room.
- 没有手柄操作。 · No gamepad controls.
- 读屏只在无头 Chromium 的无障碍树里查过名字，没有用真读屏器走过。 · Screen-reader names were checked only in headless Chromium's accessibility tree, not with a real screen reader.

## 已解决 · Solved

- 页面按钮上的 Tab 和 Space 失灵：引擎 `play` 在窗口上拦下这两个键（ENGINE-NOTES 1）。在捕获阶段先接住按键并停止传播，`play` 自己的按键就不用了，全部快捷键由 `src/main.mjs` 处理。 · Tab and Space did nothing on the page's buttons because `play` keeps them from the page (ENGINE-NOTES 1); keys are caught first, in the capture phase, and the game reads its own shortcuts.
- 透明画布下面是一片黑：`play` 给装画布的盒子写死了黑底（ENGINE-NOTES 2），开局后把它改成透明。 · A black box under the clear canvas, from the holder `play` makes (ENGINE-NOTES 2); made clear after start.
- 标题画面帧时间 p95 33 ms：静止的地图交给引擎每帧重画，大片半透明的填充在软件渲染下太贵（ENGINE-NOTES 3）。地图改由页面在一块二维画布上画一次（`src/ground.mjs`），画法函数和引擎 Graphics 同名，p95 回到 16.7 ms。 · A title frame time of 33 ms p95 from the still map being drawn again each frame (ENGINE-NOTES 3); the page now paints it once on a 2D canvas, and p95 is 16.7 ms.
- `game.browser.canvas` 是 `undefined`，画布在 `game.canvas`（ENGINE-NOTES 4）。 · The canvas is `game.canvas`, not `game.browser.canvas` (ENGINE-NOTES 4).
- 第一版平衡里险峻难度第三波就输、铜锣哨放在够不着道的建造位上：加了每波 6% 的强度递增、调了弩楼和险峻的数字，电脑玩家的铜锣改放到建造位 8。 · The first balance lost hard at wave 3 and put the gong where it reached no way; a 6% rise in strength a wave, new crossbow and hard numbers, and the bot's gong moved to plot 8.

## 未完成 · Unfinished

- 手柄操作。 · Gamepad controls.
- 真机上的触屏、帧时间和声音验收。 · Touch, frame-time and sound checks on real devices.
- 更多地图与关卡；现在只有一张汴河图、一套十二波。 · More maps; there is one canal and one set of twelve waves.

## 目录结构 · Layout

| 路径 · Path | 内容 · Contents |
|---|---|
| `index.html`, `style.css` | 页面、import map、顶栏、地图框、建造位按钮层、标题 / 菜单 / 结算 · the page, the import map, the bar, the map's box, the plot buttons, the panels |
| `src/main.mjs` | 入口：存档、语言、`play`、建造位和选单、顶栏、键位、画面切换 · the entry |
| `src/view.mjs` | 地图的画法；塔、敌人、箭石火、闸门的精灵和事件效果 · how the map is drawn; the sprites and the effects of events |
| `src/ground.mjs` | 把地图画到页面的二维画布上（只画一次） · paints the map once on the page's 2D canvas |
| `src/sound.mjs` | 合成音效与配乐 · effects and music |
| `src/i18n.mjs` | 中英文文字表 · the words in both languages |
| `src/saves.mjs` | 存档 · the save |
| `src/sim/data.mjs` | 地图、塔、敌人、难度、十二波的数字 · the numbers |
| `src/sim/world.mjs` | 规则，不碰页面和引擎 · the rules, free of the page and the engine |
| `src/sim/bot.mjs`, `tools/balance.mjs` | 电脑玩家和平衡脚本 · the computer player and the balance script |
| `test/*.test.mjs` | Node 测试 · Node tests |
| `test/accept.mjs`, `test/baseline/` | 浏览器验收和截图基线 · browser acceptance and baselines |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 `b5628eb9997b67cf6163a388f5aa06f321f3833a`，由引擎仓库的 `tools/vendor-game.mjs` 复制，见 [vendor/SOURCE.md](vendor/SOURCE.md)。用到的入口：`@egret/engine/play`、`@egret/engine/kit`、`@egret/engine/web/kit`（`@egret/engine` 随 `play` 一起复制）。

The engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit
`b5628eb9997b67cf6163a388f5aa06f321f3833a`, copied by the engine's `tools/vendor-game.mjs`; see
[vendor/SOURCE.md](vendor/SOURCE.md). Entries used: `@egret/engine/play`, `@egret/engine/kit` and
`@egret/engine/web/kit` (`@egret/engine` comes with `play`).

```sh
node tools/vendor-game.mjs ../PortedGamesEgret/CanalWatch @egret/engine @egret/engine/play @egret/engine/kit @egret/engine/web/kit
```
