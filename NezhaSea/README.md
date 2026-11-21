# 哪吒闹海 · Nezha Stirs the Sea

## 简介 · Introduction

哪吒闹海是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的游戏 Demo，一款割草类肉鸽。东海龙王纵容三太子兴风作浪，虾兵蟹将、水母、鲨卒、河豚和海螺兵一波波涌上岸；哪吒只管走位，乾坤圈、混天绫、火尖枪、金砖、风火轮、九龙神火罩自己出手。结构学《土豆兄弟》：二十波，每波之间先升级、再进龙宫集市买法宝和宝物；再加一点合成玩法：同样两件同阶的法宝合成高一阶，乾坤圈配混天绫、火尖枪配风火轮、金砖配九龙神火罩，两件都到三阶就合成神器。第十波是巡海夜叉，第二十波是三太子敖丙。画面是红纸剪出的哪吒和夜里的东海，声音和配乐由引擎在代码里合成，不加载任何图片或声音文件。

Nezha Stirs the Sea is a game demo made on its own with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild), the
new Egret engine: a survivors-like roguelite. The Dragon King lets his third son raise the sea, and wave after wave of
shrimp soldiers, crab generals, jellyfish, sharks, pufferfish and conch soldiers storm the shore; Nezha only moves,
and her treasures — the Universe Ring, the Sky Ribbon, the Fire Spear, the Golden Brick, the Wind-Fire Wheels and the
Nine-Dragon Dome — strike by themselves. It is built like Brotato: twenty waves, with level-ups and then the Dragon
Palace market between them; and with a little merging: two of the same treasure and tier make the next tier, and the
Ring with the Ribbon, the Spear with the Wheels and the Brick with the Dome, both at tier three, make a divine
treasure. The sea yaksha comes on wave ten, and Ao Bing, the third prince, on wave twenty. It is drawn as a Nezha cut
from red paper on the night sea; the sound and music are made in code by the engine, with no picture or sound file.

[在线试玩 · Play online](https://cnedwin.github.io/PortedGamesEgret/NezhaSea/)

## 玩法与操作 · How to play

**目标 · Goal**：守住陈塘关二十波。血量归零就输；第十波和第二十波要打倒首领才算过。每种哪吒在每档难度上记最远到过第几波。 · Hold Chentang Pass for twenty waves. No health left is a loss; waves ten and twenty end only when their boss falls. The furthest wave of each form on each danger is kept.

**一局 · A game**
- 一波 19 秒起，到第八波起每波 45 秒。击退的水族兵掉珍珠：靠近就被吸过来，既是经验也是钱；一波结束时场上剩下的珍珠全收。 · A wave lasts 19 seconds at first and 45 from the eighth. Fallen soldiers drop pearls, pulled in when Nezha is near: experience and money at once; any left are gathered at the end of a wave.
- 一波结束：每升一级挑一项属性（四选一，按 1–4 也行），然后进集市。集市里有四件货：法宝或宝物，可以买、留到下一次（不被换掉），也可以花珍珠换一批（越换越贵）。 · After a wave: one raise of four for each level gained (1–4 work too), then the market: four offers, treasures or items, to buy, keep for next time, or restock for pearls (dearer each time).
- 法宝槽：少年哪吒和莲花身 6 个，三头六臂 8 个。点一件法宝选中，能和它合成的会写「合成……」，再点那一件就合成；也可以卖掉它。槽满时买到同样的同阶法宝会自动合成。 · Treasure slots: six, or eight for Three Heads, Six Arms. Pick a treasure, and those it merges with say so; pick one of them to merge; or sell the picked one. With every slot full, buying a treasure of the same kind and tier merges it at once.
- 下一波开始时哪吒回满血，回到海面中央。 · The next wave starts with Nezha whole in the middle of the sea.

**三种哪吒 · Three forms**：少年哪吒（乾坤圈起手，样样平均）；莲花身（混天绫起手，血多回血快，走得慢一点；守过第 10 波解锁）；三头六臂（火尖枪起手，8 个法宝槽，出手快一成、伤害低一成；守住一局解锁）。 · Young Nezha (Ring, even); Lotus Body (Ribbon, more health and mending, a little slower; unlocked by holding wave 10); Three Heads, Six Arms (Spear, eight slots, faster and weaker; unlocked by a win).

**难度 · Danger**：风平、浪急、翻江，水族兵依次更结实、出手更重，翻江还多一成。 · Calm, Rough, Storm: soldiers tougher and harder-hitting in turn, and a tenth more of them in a storm.

| | 键盘 · Keyboard | 手柄 · Gamepad | 触屏 · Touch |
|---|---|---|---|
| 走 · Move | WASD、方向键 · WASD, arrows | 左摇杆、十字键 · left stick, d-pad | 手指按住海面拖 · hold and drag on the sea |
| 暂停 · Pause | P、Esc | | 「暂停」· Pause |
| 升级 · Level-up | 1–4，或 Tab 加 Enter · or Tab and Enter | | 点 · tap |
| 集市 · Market | Tab、Enter、Space；Esc 取消选中 · Esc to unpick | | 点 · tap |

设置在标题和暂停菜单里：声音、配乐、减弱动画（系统设了「减少动态效果」时自动减弱）、中英文。切到别的标签页时，进行中的一波停在暂停菜单上。 · Settings on the title and in the pause menu: sound, music, reduced motion, and the language. Switching tabs pauses a wave behind the menu.

## 法宝、神器与宝物 · Treasures and items

| 法宝 · Treasure | 出手 · Stroke | 一阶 → 四阶伤害 · Damage, tier 1 → 4 |
|---|---|---|
| 乾坤圈 · Universe Ring | 掷出再飞回，一路穿过 · out and back, through all | 8 → 40 |
| 混天绫 · Sky Ribbon | 向前横扫 120° · a 120° sweep ahead | 10 → 46 |
| 火尖枪 · Fire Spear | 一条线直刺 · a thrust in a line | 14 → 66 |
| 金砖 · Golden Brick | 砸落，范围伤害 · lands and bursts | 16 → 76 |
| 风火轮 · Wind-Fire Wheels | 绕身旋转，碰到就烧（2 → 4 只） · circle and burn (2 → 4) | 5 → 25 |
| 九龙神火罩 · Nine-Dragon Dome | 身边一圈火 · a ring of fire around her | 9 → 42 |

神器（两件第三阶以上合成） · Divine treasures (two of tier three or above)：擒龙圈绫（乾坤圈 + 混天绫：圈飞出、绫横扫）、火轮神枪（火尖枪 + 风火轮：四只火轮绕身、长枪连刺）、九龙金砖（金砖 + 九龙神火罩：大火圈、金砖砸下）。 · Dragon-Binding Ring (Ring + Ribbon), Fire-Wheel Spear (Spear + Wheels), Nine-Dragon Brick (Brick + Dome).

宝物十六种，加血量、回血、吸血、伤害、攻速、暴击、范围、护甲、闪避、移速、运气、收成或拾取范围，有的有代价（战鼓攻速 +10、血量 −3）。数字都在 `src/sim/data.mjs`。 · Sixteen items raise health, mending, lifesteal, damage, attack speed, crits, range, armour, dodge, speed, luck, harvest or pickup, some at a cost; every number is in `src/sim/data.mjs`.

## 平衡 · Balance

`node tools/balance.mjs 12` 让电脑玩家（躲近处的兵和水弹、去捡珍珠、先买能合成的法宝、能合成就合成）用三种哪吒在三档难度上各打 12 局。2026-11-21 在 Node 22 里： · The computer player plays each form on each danger 12 times:

| 难度 · Danger | 少年哪吒 · Young | 莲花身 · Lotus | 三头六臂 · Six Arms |
|---|---|---|---|
| 风平 · Calm | 10/12 守住 · held | 10/12 | 11/12 |
| 浪急 · Rough | 8/12 | 9/12 | 8/12 |
| 翻江 · Storm | 5/12 | 7/12 | 7/12 |

对照：站着不动的 12 局、什么都不买的 12 局全部守不住（平均到第 5.7 波和第 4.8 波）。电脑玩家知道每个兵和每颗水弹在哪里，比人好躲，所以真人的守住率会低一些。 · Standing still and buying nothing lost all 12 (waves 5.7 and 4.8 on average). The computer player knows where every soldier and drop of water is, so people will hold less often.

## 引擎能力对照表 · Engine capabilities

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| `play`（`@egret/engine/play`） | 一次调用建好竖屏 540×960 的透明画布和帧循环 · the clear 540 × 960 canvas and the loop from one call | `src/main.mjs` |
| `game.keys.axis()` | 键盘、手柄摇杆和手指摇杆合成一个移动方向 · keys, the gamepad stick and the finger's stick as one direction | `src/main.mjs` |
| `game.touchStick` | 手机上按住拖动的摇杆 · the hold-and-drag stick on a phone | `src/main.mjs` |
| `game.sprite` + Graphics | 哪吒、八种水族兵和首领、法宝出手全用矩形拼的剪纸；精灵按种类放进池子反复用 · Nezha, the soldiers, the bosses and the strokes, cut from rectangles; sprites kept in pools by kind | `src/view.mjs` |
| `game.burst`、`game.shake`、`game.flash`、`game.text` | 击退、砸落、升级的碎片；受伤一抖；合成神器一闪；伤害数字（减弱动画时不抖不闪） · bursts, a shake when hurt, a flash for a divine merge, damage numbers | `src/view.mjs`, `src/main.mjs` |
| `game.toast` | 首领登场的提示 · the boss notices | `src/main.mjs` |
| `game.pause`、`resume`、`after` | 暂停菜单、结算前的停顿 · the pause menu, the beat before the end | `src/main.mjs` |
| `game.sfx.define` / `play`、`game.music` | 每种出手、击退、珍珠、受伤、升级、首领锣、合成的合成音效；波次里「战斗」、集市里「平静」的配乐 · synthesized effects; 'battle' music in a wave, 'calm' in the market | `src/sound.mjs` |
| `createTextTable` + `pickLanguage` | 中英文文字表，`missing()` 检查两种语言齐全 · the word table, checked complete | `src/i18n.mjs` |
| `createSaveStore` + `browserSaveStorage` | 解锁、最远波次、设置；坏档另存后重新开始 · unlocks, furthest waves, settings; a broken save set aside | `src/saves.mjs` |
| `browserLanguages`、`prefersReducedMotion` | 开局的语言；关掉「减弱动画」时回到系统设置 · the first language; the system's motion setting | `src/main.mjs` |

## 已验证 · Verified

- `node --test test/*.test.mjs`（Node 22，31 项全部通过）：三种哪吒的开局；走位和边界；水族兵冒在离哪吒远处、冒出来前打不到；乾坤圈去回各打一次、混天绫只扫前方、火尖枪一条线、金砖砸一片、九龙神火罩一圈、风火轮每个冷却打一次；暴击翻倍、护甲减伤、闪避有上限；珍珠掉落吸取和升级；一波结束收珍珠、付收成、先升级后集市；首领波要打倒首领；买法宝、槽满时自动合成或拒绝、买宝物加属性；同阶合成到四阶为止；三阶以上的配对合成神器、二阶不行、神器不再合成；神器两种出手都有；换一批越来越贵、留着的货不被换、卖掉退钱、最后一件不能卖；下一波回满血；输赢；同种子同结果；电脑玩家在风平 4 局至少守住 3 局、站着不动必输；存档（新档、最远波次、解锁、坏档、版本过新、存储拒绝写入）；文字齐全、英文里没有中文；引擎副本。 · All 31 Node tests pass.
- `node test/accept.mjs`（无头 Chromium 153，SwiftShader 软件渲染，540×960）：标题焦点在「出海」；Tab 选难度、Space 关声音并存档、切英文后所有按钮读英文；Enter 出海；按住 D 哪吒右移；P 暂停后不动、Esc 继续；第一波结束先升级、按 1 选完进集市；Tab 到货架按 Enter 买下；选一件法宝后能合成的那件写「合成……」、Enter 合成到下一阶；三阶的乾坤圈和混天绫合成擒龙圈绫；出发去第二波；血尽失守、最远波次存档；再出海；第二十波首领倒下即守住，解锁另外两种哪吒，标题上都能选；坏档提示。标题和结算两张截图基线一致，控制台没有错误。 · The whole walk by keyboard in headless Chromium with software rendering, two baselines matching and a clean console.
- `node ../tools/quality.mjs NezhaSea`：自动项全部达标，见 [QUALITY.md](QUALITY.md)。 · Every automatic item passes.
- 另量 · Also measured（无头 SwiftShader）：标题 p95 16.8 ms；第 9、16 波电脑玩家打到中途（场上二十到四十个兵、一两百颗珍珠）p95 16.8 ms；把场上兵数顶到上限 140 个时 p95 33.3 ms（540×960 和 1280×800 都是）。规则本身一步 0.47 毫秒（Node，140 个兵）。 · The title and mid-game waves at 16.8 ms p95; 140 soldiers, the most the field holds, at 33.3 ms; the rules take 0.47 ms a step.

## 已知问题 · Known issues

- 没有在真机上运行过：触屏摇杆、手柄、手机帧时间都「未运行」。 · Not run on a real device; the touch stick, a gamepad and phone frame times are not run.
- 场上兵数到上限 140 时，无头软件渲染下帧时间 p95 33 毫秒（见上）。 · At 140 soldiers, frame time is 33 ms p95 under software rendering.
- 电脑玩家比人好躲，平衡表里的守住率会比真人高。 · The computer player dodges better than people, so the table above is kinder than real play.
- 读屏只在无头 Chromium 的无障碍树里查过名字。 · Screen-reader names were checked only in headless Chromium.

## 已解决 · Solved

- 页面按钮上的 Tab 和 Space 失灵（ENGINE-NOTES 1）：只在焦点在页面按钮或面板上时，于捕获阶段先接住 Tab、Space、Enter 和方向键；别的按键照常交给 `play`，所以 WASD 和方向键在海面上仍然能走。 · Tab and Space on the page's buttons (item 1): caught first only while a page button or panel has the focus; other keys still reach `play`.
- 透明画布下面是黑的（ENGINE-NOTES 2）：开局后把 `play` 的盒子改成透明。 · The black holder (item 2), made clear.
- 一开始想用贴图（`Bitmap`）画兵，原型里 100 个共用一张贴图的 Bitmap 就到 p95 33 毫秒，而 200 个矩形精灵是 16.7 毫秒（ENGINE-NOTES 3）：所有会动的东西都改用矩形拼。 · Bitmaps sharing one texture cost more than rectangles in a prototype (item 3); everything that moves is cut from rectangles.
- 神器的第二种出手和第一种共用冷却、一直不出手：给第二种出手单独的冷却。 · A divine treasure's second stroke shared the first one's cooldown and never fired; it has its own now.
- 平衡：第一版里前几波买不起第二件法宝、后期又从不受伤。加了开局 15 颗珍珠和每波 4 颗、调低一阶价格、后期水族兵按平方变强、出手更重、成群冒出、缩短法宝的射程。 · Balance: at first a second treasure was out of reach early and nothing hurt late; starting and per-wave pearls, cheaper first tiers, soldiers growing by the square late, harder hits, shoals, and shorter reaches.

## 未完成 · Unfinished

- 真机验收。 · Checks on real devices.
- 更多哪吒的样子、法宝和宝物；无尽模式。 · More forms, treasures and items; an endless mode.

## 目录结构 · Layout

| 路径 · Path | 内容 · Contents |
|---|---|
| `index.html`, `style.css` | 页面、import map、海面框、顶栏、标题 / 升级 / 集市 / 暂停 / 结算 · the page and its panels |
| `src/main.mjs` | 入口：存档、语言、`play`、每帧、集市与合成、画面切换 · the entry |
| `src/view.mjs` | 哪吒、水族兵、法宝出手、珍珠、水弹，按种类放池子 · what moves, pooled |
| `src/ground.mjs` | 海面（只画一次） · the sea, painted once |
| `src/sound.mjs` | 合成音效和配乐 · effects and music |
| `src/sim/data.mjs` | 哪吒、法宝、神器、宝物、水族兵、难度、波次的数字 · the numbers |
| `src/sim/world.mjs` | 规则：一波、出手、珍珠、升级、集市、合成 · the rules |
| `src/sim/bot.mjs`, `tools/balance.mjs` | 电脑玩家和平衡脚本 · the computer player and the balance script |
| `src/i18n.mjs`, `src/saves.mjs` | 文字表、存档 · the words, the save |
| `test/` | Node 测试、浏览器验收和截图基线 · tests, acceptance and baselines |
| `vendor/` | 引擎副本 · the engine copy |

## 引擎副本 · Engine copy

引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 `b5628eb9997b67cf6163a388f5aa06f321f3833a`，由引擎仓库的 `tools/vendor-game.mjs` 复制，见 [vendor/SOURCE.md](vendor/SOURCE.md)。用到的入口：`@egret/engine/play`、`@egret/engine/kit`、`@egret/engine/web/kit`（`@egret/engine` 随 `play` 一起复制）。

The engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit
`b5628eb9997b67cf6163a388f5aa06f321f3833a`, copied by the engine's `tools/vendor-game.mjs`; see
[vendor/SOURCE.md](vendor/SOURCE.md). Entries used: `@egret/engine/play`, `@egret/engine/kit` and
`@egret/engine/web/kit` (`@egret/engine` comes with `play`).

```sh
node tools/vendor-game.mjs ../PortedGamesEgret/NezhaSea @egret/engine @egret/engine/play @egret/engine/kit @egret/engine/web/kit
```
