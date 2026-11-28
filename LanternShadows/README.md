# Lantern Shadows · 灯影·闹天宫

## 简介 · Introduction

灯影·闹天宫是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的 2D 横版动作游戏 Demo，整出戏演在一块皮影戏的幕布上：灯在幕后，镂空上色的皮偶贴着幕布，孙悟空一路打上南天门。目前有三幕。**第一幕南天门**：十名天兵把守一路，哪吒踏着风火轮在门前拦路。**第二幕蟠桃园**：桃林里有持盾的力士和从空中扑下来的仙鹤，枝上的桃子可以打下来吃，出口由二郎神带着哮天犬把守。**第三幕兜率宫**：太上老君的丹房，地上的炉口轮流喷火，丹炉可以打翻去烧敌人，有扇火的童子和扔丹药的道士，最后是老君本人、他的金刚琢和八卦炉。每幕四五分钟，三幕演完有一行总评。[在线试玩](https://cnedwin.github.io/PortedGamesEgret/LanternShadows/)

Lantern Shadows is an independently developed 2D side-scrolling action demo built with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild), played as a shadow-puppet show: a lamp behind a cloth, carved and dyed leather puppets against it, and the Monkey King fighting his way to the Southern Gate of Heaven. Three acts are here. **Act one, the Southern Gate**: ten soldiers of heaven hold the road, and Nezha comes down on his wheels of wind and fire to bar the gate. **Act two, the Peach Orchard**: shield-bearers among the trees, cranes that stoop out of the air, peaches on the boughs to knock down and eat, and Erlang with his hound holding the way out. **Act three, the Tushita Palace**: Laozi's furnace room, where grates in the floor breathe fire by turns, a furnace can be knocked over to burn whoever is beyond it, a boy fans the flames and an alchemist throws pills, and at the end Laozi himself, with his Diamond Snare and the Eight Trigrams Furnace. Each is four or five minutes, and when all three are played their seals are told together. [Play online](https://cnedwin.github.io/PortedGamesEgret/LanternShadows/)

## 玩法 · How to play

| | 键盘 · Keyboard | 手柄 · Gamepad | 触屏 · Touch |
|---|---|---|---|
| 走 · Move | A D，或左右方向键 · A D or Left/Right | 左摇杆、十字键 · left stick, D-pad | 横向摇杆 · horizontal stick |
| 跳 · Jump | 空格 · Space | A | 跳 · Jump |
| 棍 · Staff | J | X | 棍 · Staff |
| 筋斗云 · Cloud roll | L，或 Shift · L or Shift | B | 闪 · Roll |
| 身外身 · Clones | I，或 C · I or C | Y | 变 · Hairs |

- 连按三下棍是一套连击：平扫、上挑、劈砸，一下比一下重。击中时分别是竹木、上挑的短响和鼓皮般的重击，格挡和卸开飞来的兵器另有不同的声音。
- 跳键按得久跳得高，轻点是小跳；云朵可以从下面跳上去，石台要跳上去。
- 筋斗云贴地翻出一段，空中可以用一次；翻滚途中什么都伤不到他，枪尖和箭都能穿过去。一棍打中之后可以用它收招。
- **身外身**：他自己打中的每一棍都攒一根毫毛，攒满三十根（桃子下面那条金线满了），就能拔一把毫毛吹出一百个小悟空。它们翻着筋斗落地，扑向附近的天兵或哪吒围着打，七秒后变回毫毛；附近没有敌人时就在他身边跑跳。分身打中的也计入连击，但不攒毫毛。施法的那一下谁也伤不到他。分身在场时，台口会写出分身数、正在推进的骨骼数和每秒帧数。
- **枪兵**先把枪放平后撤（这是预警），再一步刺出。预警时打他能打断；已经刺出就只有重击才拦得住，最好翻过去。
- **弓手**站着不动，拉满弓后放箭。箭可以跳过、翻过，也可以一棍打落。
- 五个桃是他的体力，挨一下少一个；吃完就倒，随后在上一面红旗（歇脚处）重新站起来。
- 把十名天兵全部击退再走进门前的院子，哪吒就到了；打退他，南天门才开。落幕时按用时、受伤和倒地次数盖一枚印：S、A、B、C。
- P、Esc 或戏台上的「暂停」按钮可暂停。手机竖屏也能从戏单开锣，触控键排在幕布下方。
- 手机默认显示横向摇杆，越往边缘推，移动越快。电脑可用「屏幕按键」打开同一套控制，也可用键盘。
- 戏单可选从第二、三幕起演，或直接到三位首领的院子。一幕落幕后可以接着演、重演本幕或返回戏单。
- 完整演完一幕会记下最好评级、最快时间和最高连击，并可拿下限时、连击和不倒地三枚印。直接进首领院子是独立练习。
- 三幕都有「单棒试演」。整幕禁用百身术，限时、连击和不倒地目标独立计分，从戏单或通关结算页进入。
- 三幕各有一首两分钟以上的原创配乐，进场按需加载。换幕时配乐交接，同幕重演接着播放。戏台上可以分别开关配乐和音效。

**第二幕**新添的：

- **力士**举着一面高盾，正面的平扫和劈砸都被盾挡住。连击的第二下上挑能把盾掀开，盾回来之前（一秒多）怎么打都中；或者翻到他背后，他转身要半秒多。他的锤子抡起来有预警，落在身前。
- **仙鹤**停在半空，看见他就仰身一叫（预警），然后沿一条直线扑下来，再飞回原处。扑的方向在起扑时就定了，走开一步就落空；也可以迎着它一棍打下来，或者趁它停在空中时跳起来打。上挑够得着低处的鹤。
- **桃子**挂在枝上，一棍能打下来，也可以跳起来够。少了桃（体力）的时候碰到就吃掉，回一个；体力满的时候它留在原地。

**第三幕**新添的：

- **炉口**在地上，轮流喷火：先冒一阵小火（预警），再喷起一人多高的火柱，然后歇一阵。看准歇的时候过去；各个炉口的节奏是错开的。
- **丹炉**立在路上，一棍就能打翻，炉火顺着地面往悟空对面泼出去一段，烧两秒多：站在里面的敌人每半秒挨一下，悟空自己走进去也会被烧。把敌人引到丹炉后面再打翻最划算。
- **扇火童子**一扇子扇出一道贴地的火舌，同时起一阵风把悟空往后推：火舌可以跳过去，也可以一棍打灭；翻滚能顶着风穿过去。他挨了打，风就停。
- **炼丹道士**把丹药抛到悟空站的地方，落地后亮一下才炸开：看见它落地就走开。

**太上老君**守在宫门前。他不和悟空硬拼：

- **金刚琢**：他抛出一个金圈，飞出去再飞回来。这个圈专收兵器，**不能打**：一棍打上去，金箍棒就被套走，老君把它扔到院子另一头。棒子不在手时只有一下很短的拳头，没有连击；走到棒子落下的地方就捡回来了。圈本身碰到人也会伤人，跳过去或翻过去。
- **拂尘**：贴得太近他会横扫一下，有预警，翻过去。
- 第二段他取出扇子，接连扇出三道贴地的火舌，一道一道跳过去。
- 体力剩三分之一时他把悟空收进**八卦炉**：院子两头烧起火墙并且往中间合拢，头顶不断落火（落点先在地上亮一下），院子里的炉口照常喷。这十四秒打不到他，只能躲。撑过去就破炉而出，炼成**火眼金睛**：此后对老君的每一下伤害加倍，他也要踉跄三秒。如果在炉里倒下，炉子不再合上，但也没有火眼金睛。
- 轻击打不动他，连击最后一下劈砸能把他打得踉跄。

**二郎神**守在月洞门前，体力也分三段，哮天犬从头到尾都在：

- 第一段是本相。他抡起三尖两刃刀劈下来，刀很长，身前一大片都在范围里：在刀落下的那一下翻过去。他还会纵身一跃，落在悟空刚才站的地方，脚下的都挨打：看他腾空就走开或翻开。
- 第二段他会变化：一蹲身变成一只鹰，升到半空悬一下（预警），俯冲两次，再变回来。鹰俯冲的方向在起冲时就定了；迎着它一棍打中，他会现出原形跌下来踉跄好一阵，这是最好的机会。
- 第三段法天象地：他长到一倍半多高，刀够得更远，落地时向两边各推出一道贴地的震波，要跳过去。
- **哮天犬**每隔几秒从悟空背后那一头的院子边上露面，伏低呲牙（预警），然后贴地冲过他身边。跳起来让它从脚下过，或者迎着给它一棍：挨了打它当场退走，挨够两棍会躲得久一些。
- 轻击打不动二郎神，连击最后一下劈砸能把他打得踉跄。悟空在院子里倒下，二郎神的体力回到当前这一段的开头。

**哪吒**的体力分三段，每打掉一段他就换一种打法：

- 第一段只用火尖枪。他先收枪后撤，再一枪刺出很远：翻过去，或者跳起来让枪从脚下过。贴得太近他会抡枪横扫，那一下跳不过，只能翻或退开。
- 第二段加上乾坤圈：圈飞出去还会飞回来。跳过它，或者迎着它一棍打回去，圈砸在他自己身上，他要晃好一阵。
- 第三段现出三头六臂，风火轮烧起来：他腾空蜷身，然后贴地冲到院子尽头，轮子碾过的地面会烧一阵。上云躲开，等火灭了再下来。
- 轻击打不动他，一套连击的最后一下劈砸能把他打得踉跄，这是多打几下的机会；刚踉跄过的他一时不会再中招。
- 悟空在院子里倒下，会在院口的红旗处站起来，哪吒的体力回到当前这一段的开头。

- Three presses of the staff make a combination: a level sweep, a lift, and a smash, each heavier than the last. Every blow that lands has its beat: clappers for the sweep, the small gong for the lift, the great gong for the smash.
- Hold jump to go higher; a tap is a hop. Clouds can be jumped onto from below; a stone step has to be jumped up.
- The cloud roll carries him a set distance along the ground, and may be used once in the air. Nothing can hurt him while he rolls: it goes through a spear point and through an arrow. After a blow has landed it may cut the blow short.
- **The body beyond the body**: every blow of his own that lands is a hair, and with thirty of them (the gold line under the peaches is full) he can pluck a tuft and blow it into a hundred small Monkey Kings. They tumble out, make for the soldiers near him or for Nezha, and beat them in a crowd; after seven seconds they are hairs again. With no enemy near they run and hop about him. What the clones land is added to the count of blows but grows no hairs. Nothing can hurt him at the moment he works it. While they are out, the foot of the booth says how many there are, how many bones are being moved, and how many frames a second are drawn.
- A **spearman** levels his spear and draws it back, which is the warning, and then steps into a thrust. Struck during the warning he is stopped; once he is thrusting only the heaviest blow stops him, and it is better to roll through.
- An **archer** stands where he is, draws, and looses. An arrow can be jumped, rolled through, or knocked out of the air with the staff.
- Five peaches are his strength, and each blow he takes eats one. When they are gone he falls, and is stood up again at the last red pennant he passed.
- When all ten soldiers are down and he walks into the court before the gate, Nezha arrives; the gate opens only when Nezha has been driven off. As the curtain falls a seal is set on the act for its time, his wounds and his falls: S, A, B or C.
- Use P, Esc or the on-stage Pause button. The portrait playbill can start the show and places the touch buttons below the cloth.
- The playbill can start acts two and three or open any of the three bosses' courts for practice. After an act, continue, replay it or return to the playbill.
- A complete act records the best rank, fastest clear and highest combo. Each act has three seals for time, hits and finishing without a fall.
- Each act loads its own original loop on demand. Music and percussion have separate switches on the stage.

New in **act two**:

- A **shield-bearer** carries a tall shield, and it takes the sweep and the smash from in front. The lift, the second blow of the combination, knocks the shield aside, and until he has it back (a little over a second) everything lands; or get behind him, since he takes more than half a second to come about. His hammer is raised as a warning and comes down in front of him.
- A **crane** keeps its place in the air. When it sees him it rears and calls, which is the warning, stoops along a straight line, and climbs back. The line is fixed as the stoop begins, so a step aside is enough; or meet it with the staff, or jump and strike it where it waits. The lift reaches a crane that hangs low.
- A **peach** hangs on a bough until the staff knocks it down, or he jumps for it. Short of a peach of his own, he eats it on touching it and has one back; whole, he leaves it where it is.

New in **act three**:

- A **grate** in the floor breathes fire by turns: a sputter as the warning, then a column taller than he is, then a rest. Go by in the rest; the grates do not keep the same time.
- A **furnace** stands in the way and one blow knocks it over, spilling its fire along the floor away from him for a little over two seconds. Whoever of the household stands in it is burned every half second, and so is he if he walks into it. It is best knocked over with someone beyond it.
- The **boy with the fan** sends a tongue of flame along the floor and a wind that pushes the Monkey King back. The flame can be jumped or put out with the staff, and the roll goes through the wind. Strike the boy and the wind dies.
- The **alchemist** throws a pill at where the Monkey King stands; it lies lit for a moment before it bursts, which is the time to walk away.

**Laozi** holds the door of the palace, and does not fight as the others do:

- **The Diamond Snare**: he throws a ring of gold that flies out and comes back. It takes whatever weapon is raised against it, and **must not be struck**: strike it and the staff is gone, flung by Laozi to the far end of the court. Without the staff there is one short blow with the hand and no combination; walk to where the staff fell and it is his again. The ring itself hurts whoever it touches, so jump it or roll through.
- **The whisk**: stand too close and he sweeps it across, after a warning. Roll through.
- In his second part he takes out his fan and sends three tongues of flame along the floor, one after another, to be jumped.
- With a third of his strength left he shuts the Monkey King in **the Eight Trigrams Furnace**: walls of fire rise at both ends of the court and close toward the middle, fire falls from above (the place is shown on the floor first), and the grates in the floor go on as before. For fourteen seconds Laozi cannot be reached, and there is nothing to do but keep out of the fire. Last it out and he breaks free with **eyes of fire**: every blow on Laozi counts double from then on, and Laozi reels for three seconds. If he falls in the furnace it is not shut again, but there are no eyes of fire either.
- A light blow does not move Laozi, and the smash that ends the combination staggers him.

**Erlang** holds the moon gate. His strength too is in three parts, and his hound is there throughout:

- In the first he is himself. He swings the three-pointed glaive up and brings it down, and it is long: a wide space before him is under it, so roll through as it falls. He also leaps, and comes down where the Monkey King was standing, striking what is under him: when he leaves the ground, walk or roll away.
- In the second he changes his shape: he crouches and is a hawk, climbs, hangs a moment in the air as a warning, stoops twice, and is himself again. The line of a stoop is fixed as it begins. Meet the hawk with the staff and he falls out of the air in his own shape and reels for a good while, which is the best chance there is.
- In the third he grows to more than half as tall again: the glaive reaches further, and his landing sends a wave along the ground to either side, to be jumped.
- **The hound** shows itself every few seconds at the end of the court behind the Monkey King, down on its forelegs with its teeth bared, which is the warning, and then runs past him along the ground. Jump and let it pass under, or meet it with the staff: a blow sends it off at once, and after two it keeps away longer.
- A light blow does not move Erlang, and the smash that ends the combination staggers him. If the Monkey King falls in the court, Erlang's strength goes back to the start of the part it had reached.

**Nezha**’s strength is in three parts, and with each that is spent he fights another way:

- In the first he has only the fire-tipped spear. He draws it back and then drives it a long way: roll through, or jump and let it pass under. Stand too close and he sweeps the spear across, which cannot be jumped, only rolled through or stepped back from.
- In the second he throws the Universe Ring as well, and it comes back the way it went. Jump it, or meet it with the staff and send it back: it strikes him instead, and he reels for a good while.
- In the third he takes on three heads and six arms and his wheels catch fire. He rises, curls over them, and rides low to the far end of the court; the ground they crossed burns for a time. Take to a cloud until the fire is out.
- A light blow does not move him. The smash that ends the combination staggers him, which is the moment to land more; having just been staggered, he is not staggered again at once.
- If the Monkey King falls in the court he is stood up at the pennant at its entrance, and Nezha’s strength goes back to the start of the part it had reached.

地址参数 · Address options：`?act=2`、`?act=3` 从第二、三幕演起；默认用 WebGL2，`?backend=webgpu` 改用 WebGPU，`?stats` 显示帧率与骨骼数，`?slow=0.25` 以四分之一速度播放（看动作用），`?from=nezha` 从门前的院子演起（`?from=erlang`、`?from=laozi` 从第二、三幕的院子），`?clones=200` 设定一把毫毛变出多少个分身（10 到 400，默认 100），`?lang=en` 以英文开始，`?dev` 不用打包好的文件而逐个加载 `src/` 与 `vendor/` 里的模块（改代码时用）。画面太慢时会自动收回一部分分身，写了 `?clones` 就一个不收。
`?act=2` and `?act=3` begin with the second and third acts; WebGL2 is the default and `?backend=webgpu` draws with WebGPU instead, `?stats` shows the frame rate and bone count, `?slow=0.25` plays at quarter speed (to watch the motion), `?from=nezha` begins at the court before the gate (and `?from=erlang` and `?from=laozi` at the second and third acts'), `?clones=200` sets how many clones a tuft makes (10 to 400, a hundred unless said), `?lang=en` starts in English, and `?dev` loads the modules in `src/` and `vendor/` one by one instead of the packed file (for working on the code). When the stage is drawn too slowly some of the clones are sent back; with `?clones` given, none are.

## 美术是怎么来的 · Where the art comes from

没有一张手绘位图。每片皮的轮廓、染色和镂空花纹都写在 `tools/puppets/` 里，由 `tools/author.mjs` 画成矢量图、拼成图集，并写出把它们重新连起来的 Spine 骨骼与动画；幕布、戏台、布景和地面的瓦片出自 `tools/scenery.mjs`；关卡在 `tools/levels/` 里用字母格子摆出来，写成 Tiled 地图。皮影本来就是关节相连的平面偶，所以骨骼动画在这里就是它本来的动法。

No picture here was painted by hand. The outline, dye and carving of every piece of leather is written in `tools/puppets/`; `tools/author.mjs` draws them as vectors, packs them into an atlas, and writes the Spine skeleton and animations that join them again. The cloth, the booth, the scenery and the tiles of the ground come from `tools/scenery.mjs`, and a level is laid out as a grid of letters in `tools/levels/` and written as a Tiled map. A shadow puppet is a flat figure jointed at the limbs, so skeletal animation is simply how it moves.

```
node tools/author.mjs                重新生成 assets/ · rebuilds assets/
node tools/author.mjs --sheet        另在 tools/out/ 输出每个皮偶的站姿与全部动作的姿势表 · also writes each puppet standing and in every pose
node tools/author.mjs --sheet=attack 只画名字以 attack 开头的动作，取更多时刻 · only the animations whose names begin so, at more moments
```

绘制需要带 Chromium 的 Playwright（不在本目录时用环境变量 `PLAYWRIGHT` 指向它的模块路径）。
Drawing needs Playwright with Chromium (set `PLAYWRIGHT` to its module path if it is not installed here).

## 加载 · Loading

页面加载的是 `build/lantern.js`：`tools/bundle.mjs` 把游戏自己的模块和 `vendor/` 里的引擎运行库打成一个压缩过的文件，两百六十个模块变成一次请求。它还在 `index.html` 里列出第一幕要读的每个文件，让浏览器在代码还没到时就开始取；开锣键下面的金线随文件到齐而填满。幕布是唯一不透明的大图，存成 JPEG。

The page loads `build/lantern.js`: `tools/bundle.mjs` packs the game's own modules and the engine runtime in `vendor/` into one minified file, so that two hundred and sixty modules are one request. It also lists in `index.html` every file the first act reads, so that the browser starts on them while the code is still on its way; the gold line under the gong fills as they arrive. The cloth is the one large picture with nothing to see through, and is kept as a JPEG.

```
node tools/bundle.mjs                改过 src/、vendor/ 或 assets/ 之后重新打包 · packs again after a change under src/, vendor/ or assets/
```

打包需要 esbuild（不在本目录时用环境变量 `ESBUILD` 指向它的模块路径）。没有重新打包时，测试会指出来。
Packing needs esbuild (set `ESBUILD` to its module path if it is not installed here). A test says so when it has not been done.

三首配乐的原始谱和合成器在 `tools/compose-score.py`。可用 Python、NumPy 和 FFmpeg 重新导出。
The original scores and synthesizers are in `tools/compose-score.py`. Python, NumPy and FFmpeg can render them again.

```
python tools/compose-score.py ./score-export --ffmpeg ffmpeg
```

## 运行与测试 · Run and test

```
python3 -m http.server 4180        在仓库根目录执行，然后打开 /LanternShadows/ · from the repository root, then open /LanternShadows/
node --test test/*.test.mjs        在本目录执行 · from this folder
```

## 许可 · Licences

游戏代码与生成的美术以 Apache-2.0 发布。引擎运行库与其依赖的许可见 `vendor/NOTICE`；其中 Spine 运行库按 Spine Runtimes License Agreement 使用，要求使用者持有 Spine 编辑器授权。

The game's code and its generated art are released under Apache-2.0. The engine runtime and its dependencies are listed in `vendor/NOTICE`; the Spine runtime among them is used under the Spine Runtimes License Agreement, which requires a Spine Editor license of whoever uses it.

## 用到的引擎能力 · What it uses of the engine

| 引擎入口 / API · Entry / API | 在本游戏中的用途 · Use in this game | 文件 · File |
|---|---|---|
| Spine 骨骼动画 · Spine skeletal animation (`@egret/spine`) | 十种皮偶（第二幕添了力士、仙鹤、二郎神、他变的鹰和 15 根骨骼的哮天犬；鹰与仙鹤骨骼同名，共用一套动画；二郎神法天象地时整副骨骼按比例放大），其中：悟空 25 根骨骼、24 片皮、12 段动画；哪吒 21 根骨骼、19 片皮、17 段动画；枪兵与弓手各 18 根骨骼；木人桩 8 根。一幕里同台 14 个，只推进镜头附近的；使出身外身时再加一百个悟空，一共两千五百多根骨骼同时在动。动画之间有混合，受击时整台戏定格几帧。 · Ten puppets (act two adds the shield-bearer, the crane, Erlang, the hawk he becomes and a hound of 15 bones; the hawk has the crane's bones under other feathers and moves by the crane's animations; and when Erlang grows, his whole skeleton is scaled), among them the Monkey King with 25 bones, 24 pieces and 12 animations; Nezha with 21 bones, 19 pieces and 17 animations; a spearman and an archer with 18 bones each; and a post with 8. Fourteen share the stage in an act, and only those near the camera are moved on; the body beyond the body adds a hundred Monkey Kings, more than two and a half thousand bones moving at once. Animations blend into one another, and the whole stage holds still for a few frames when a blow lands. | `src/puppets.mjs` |
| 多轨动画 · Animation tracks | 悟空的金箍棒在不在手里是单独一条轨（被金刚琢套走时收起）。哪吒同时放三条轨：第一条是他在做什么，第二条收放三头六臂，第三条管乾坤圈在不在手里。后两条只动自己那块骨头，其余照旧。 · Whether the staff is in the Monkey King's hand is a track of its own (it is put away when the snare takes it). Nezha plays three tracks at once: what he is doing on the first, his three heads and six arms shown or put away on the second, and whether the ring is in his hand on the third. The upper two move only their own bone and leave the rest as it was. | `src/puppets.mjs` |
| 瓦片地图 · Tile map (`@egret/engine/tilemap`) | 每一幕是一张 Tiled 地图，各用自己的一套瓦片（南天门的石台与云，蟠桃园的草地与树枝，兜率宫的地板与回廊）：引擎用它画地面，规则读同一个文件里的实心格、可以站的格和摆放的东西。换幕时拆掉上一幕的地图、布景和皮偶，搭起下一幕的。 · Each act is a Tiled map with a tile set of its own (stone and cloud for the gate, turf and boughs for the orchard, boards and galleries for the palace): the engine draws the ground from it, and the rules read the solid cells, the cells that can be stood on and the things placed in the same file. Between acts the last one's map, scenery and puppets are taken down and the next one's put up. | `src/main.mjs` |
| 资源清单 · Resource manifest | 骨骼、图集和贴图由清单登记，按清单里的校验和核对后加载。图片由浏览器自带的图片解码读入（`src/pictures.mjs`），这条路在各家手机浏览器上都走得通。 · Skeletons, atlases and their pages are listed in a manifest and checked against its checksums as they load. Pictures are decoded by the browser's own image element (`src/pictures.mjs`), a way that works in every phone browser. | `src/pictures.mjs` |
| 混合模式 · Blend modes | 皮偶与布景用正片叠底画在幕布上：皮只会让透过它的光变暗，两片叠着的地方更暗；火星用相加。 · Puppets and scenery are multiplied onto the cloth, since leather only darkens the light that passes through it, and where two pieces overlap it is darker still. Sparks are added. | `src/main.mjs` |
| 2D 摄像机 · 2D camera | 跟随、前瞻、边界、多层视差、受击震动与重击时的推近。 · Following with a lead, bounds, parallax layers, a shake when a blow lands and a push-in on the heaviest. | `src/main.mjs` |
| 粒子 · Particles | 火星、稻草屑、脚下的尘，风火轮上和它碾过的地面上的火，丹房里炉口的火柱、打翻的炉火、扇出的火舌与风。 · Sparks, straw, dust underfoot, the fire on the wheels and on the ground they have crossed, and in the palace the columns over the grates, the spilled furnace fire, and the fan's flame and wind. | `src/main.mjs` |
| 混音器 · Audio mixer | 三幕配乐和动作音效走独立音轨。频繁动作使用不同的短音，限制混战时的重复和叠声。 · The score and foley use separate buses. Common actions rotate through synthesized variants, with limits on repeated and overlapping cues. | `src/sound.mjs` |
| 输入 · Input | 键盘、手柄（带震动）、触屏。 · Keyboard, gamepad with rumble, and touch. | `src/input.mjs` |
| 渲染后端 · Renderers | 默认 WebGL2，可选 WebGPU。 · WebGL2 by default, WebGPU on request. | `src/main.mjs` |

## 已验证 · Verified

- 2026-11-27：固定百身术 100 分身、同逻辑进度 Fold7 严格 A/B/B/A 与低开销 B/A/B；共同准入的几何准备 p95 12.0 → 7.8 ms、低探针候选两轮密集 p95 33.2 ms，原版 49.7 ms。更新后的集成候选真实 PC/Fold7 与 Node 90/90、浏览器 13/13 通过，未改变规则和资源。详见 [QUALITY.md](QUALITY.md) 与 [本地复现](test/perf/tail-20261127/README.md)。 · Matched physical-device clone geometry work decreases; all original counts, state, events and rules retained.

- 2026-11-26：使用引擎主干 8e70dcb3 的官方生成副本，重建轻量单文件及开发模式的入口映射。89 项游戏 Node 测试全部通过，保持三幕规则、资源校验、历史通关记录和独立单棒试演。 · Official engine copy 8e70dcb3; rebuilt the compact package and development import map. All 89 Node tests passed, including three-act rules, resource integrity, campaign records and separate staff trials.

- 2026-11-21 引擎副本升级到 `b5628eb`、重新打包后：85 项 Node 测试通过；无头 Chromium 下打包页面和 `?dev` 都能开始，第一幕和第三幕各打 20 秒无控制台错误（`?clones=200` 时的 Spine 实例上限报错升级前后都有，见已知问题）。 · After the engine update and a new pack: 85 tests pass, both the packed page and ?dev start, and acts one and three play clean.
- 2026-11-21 在提交 `fc1dacb`、Node 22.23.4 下运行 `node --test test/*.test.mjs`：85 项全部通过（三幕的规则、Boss、分身、资源清单与校验和、打包文件不比源码旧）。 · `node --test` at commit `fc1dacb` with Node 22.23.4: all 85 tests pass, including the check that the packed file is not older than its sources.
- 2026-11-20 `node tools/quality.mjs LanternShadows` 在无头 Chromium + SwiftShader 下测了 16 个自动项，结果见 [QUALITY.md](QUALITY.md)；软件渲染下桌面帧时间 p95 为 66.7 ms，不代表真显卡。 · The 16 automatic quality items in headless Chromium with software rendering; the frame time there says nothing of a real GPU.

- 2026-11-26 PC 实机：Windows 11 / Edge 158.0.4370.33，WebGL2。用正常键鼠输入完整通过南天门、蟠桃园和兜率宫，评级 B/A/B，游戏内耗时 45.73/47.73/64.15 秒；暂停恢复、分身、落幕及成绩刷新续读正常。三幕普通战斗帧时间 p95 皆为 4.3 ms，百身术 p95 皆为 16.7 ms；第一幕百身术记录一次 54.3 ms 长帧。 · Physical Windows PC, Edge 158.0.4370.33, WebGL2: cleared all three acts through keyboard input (B/A/B), pause/resume, clones and saved records verified. Normal combat p95 4.3 ms and dense-clone p95 16.7 ms in every act; one 54.3 ms dense frame in act one.

- 2026-11-26 三星 Galaxy Z Fold7（SM-F966U1，Android 17，Chrome 157.0.8103.78）横屏真机 WebGL2：仅用触控输入连续通过三幕（C/B/B，游戏内 89.08/75.63/91.07 秒），每幕两次百身术、峰值 100 个分身；老君炉内阶段、落幕、成绩刷新续读正常。移动摇杆越界跟踪、释放/取消、多点操作、暂停恢复及唯一跳键通过。普通战斗 p95 16.7 ms，百身术约 33.2–33.3 ms；普通战斗出现三次 >50 ms（最大 116 ms），第一幕分身三次 >50 ms（最大 66.7 ms）。音乐切换和运行状态通过，扬声器音色未人工实听。 · Physical Fold7 (SM-F966U1, Android 17, Chrome 157), landscape WebGL2: all acts completed through touch (C/B/B), each with two natural clone casts and a peak of 100 clones. Furnace, results, record reload, drag-out, release/cancel, multitouch, pause/resume and a single Jump control verified. Normal p95 16.7 ms; dense p95 33.2–33.3 ms, with occasional long frames (max 116 ms normal, 66.7 ms dense). Music playback state, not acoustic quality, was checked.

- 2026-11-26：最终浏览器验收 10/10，包含英文标题横转竖、真实控件命中（浏览器模拟）、390×844 触控和横屏结算布局；标题和暂停战场基线差异 0.00% / 1.69%。T2 触控目标和 I1 双语语义检查通过。 · Final headless browser acceptance 10/10; image differences 0.00% / 1.69%. T2 and I1 now pass.

- 2026-11-26 原生 UI：89 项 Node、12 项浏览器验收全部通过；PC 和 Fold7 真机按正常规则实打三幕，原生触控会话、结算、记录刷新、单棒试演通过。PC 分身独立短测 p95 16.8 ms；Fold7 普通战斗仍为 16.7 ms，密集分身 p95 49.7 ms。详见 [QUALITY.md](QUALITY.md)。 · Native UI migration: 89 Node and 12 browser checks pass; real PC and Fold7 clear all acts, with records and trial. Isolated desktop clone p95 16.8 ms; Fold7 ordinary 16.7 ms and dense 49.7 ms. See QUALITY.md.

- 2026-11-26 百身术专项：Fold7 固定场景 100 分身实测九块（共 2,970 帧）；原生 HUD 共享装饰图集减少实际 draw calls 中位 43→33、提交间隔中位 33.1→17.8 ms，密集 p95 仍约 49.7 ms。最终正式包真实触控短测、90 项 Node、12 项浏览器验收通过。可公开复现见 [test/perf](test/perf/README.md)。 · Controlled 100-clone profiling and native HUD atlas reduce median rendering cost; tail remains open.


- Fold7 最新百身术受控 A/B/A：拆开 Spine 动画/骨骼语义与网格发布，延期可省去背压跳过帧的网格工作；但真实提交间隔 p50 16.7→33.1→16.7 ms，因此保留生产同步发布。完整逐帧严格等价检查及 990 帧数据在 [test/perf](test/perf/README.md)，正式版 100 分身、规则与引擎副本未改。 · Controlled physical-device A/B/A found that mesh deferral saved rejected-frame CPU but worsened cadence. The release is unchanged; see the detailed reproducer and evidence.

- 2026-11-27 引擎升级：90/90 Node、13/13 浏览器验收全部通过，既有标题/暂停画面基线差异 0.67%/1.87%。真实 PC/Fold7 普通输入短路线及单独 100 分身诊断通过；没有重新把三幕全部通关，也不宣称密集性能已根治。见 QUALITY.md。 · Engine refresh: 90 Node and 13 browser checks pass; existing title and pause baselines remain within tolerance. Physical short routes and a separately identified 100-clone diagnostic passed; no claim of a new three-act run or universal frame-rate uplift.

## 已知问题 · Known issues

- 百身术密集长尾仍非完全解决：严格候选一次 66.3 ms，余下主要为 Spine 同步发布与 WebGL2 提交波动；集中退场的独立粒子热点已解决（ENGINE-NOTES #9、#13）。 · Residual synchronous Spine and WebGL2 submission variance; no universal FPS claim.

- Fold7 原生 UI 密集百身术仍存在帧率差距，此前自然路线 rAF p95 旧版 33.2–33.3 ms、新版 49.7 ms；本轮固定同背板测量旧新实际提交 p95 均约 50 ms，Atlas 已降低中位开销但尾部仍待优化；已验证 backing 和幕布裁切对照，保留全部分身，详见 ENGINE-NOTES 第 9 条。 · Native UI dense clone p95 remains higher on Fold7; the measured backing and clip comparison did not restore the old result. All clones are retained; see engine note 9.

- `?clones` 设得太大（例如 200）时，同台的 Spine 实例超过引擎每个骨骼的 128 个上限，多出的分身建不出来，控制台报 `SPINE_INSTANCE_LIMIT_FAILED`（ENGINE-NOTES 第 3 条）；默认的一百个不会碰到。 · A large `?clones` (200, say) passes the engine's limit of 128 Spine instances; the default hundred does not.
- 画面太慢时会自动收回一部分分身（写了 `?clones` 就不收），所以慢的设备上身外身的分身数会少于一百。 · On a slow device some clones are sent back, so fewer than a hundred appear unless `?clones` is given.
- 第一次加载页面要先下载打包文件和第一幕的全部文件，改过 `src/`、`vendor/` 或 `assets/` 后必须重新运行 `tools/bundle.mjs`，否则页面跑的是旧代码（测试会指出来）。 · After a change under `src/`, `vendor/` or `assets/` the page runs old code until `tools/bundle.mjs` is run again (a test says so).
- 2026-11-26 历史统一品质基线：[QUALITY.md](QUALITY.md)，当时 14/16 达标；F1 无头软件渲染 p95 17.5 ms、L1 限速通用首屏 3.3 s 略超阈值（此前 16.7 ms / 3.1 s）。真实 Fold7 同场景 A/B 单列，不将通用软件测试当真机。 · The historical generic software F1 and startup proxy exceeded their thresholds; this refresh uses targeted acceptance and physical-device routes, not a new full quality-table run.

## 已解决 · Solved

- 百身术退场的多点尘雾：白鹭 #508 公开了 burstAtMany，同一发射器 48 次网格发布合为一次，仍保留全部 48 个位置和 192 个粒子；Fold7 同引擎 A/B/B 的事件 CPU 40.0→2.2/5.4 ms（ENGINE-NOTES #13）。 · Exact simultaneous puffs retained; repeated mesh rebuild removed.

- iPhone 上一直停在加载、开锣键没有反应：引擎自带的 PNG 读取要求 2D 画布报告 sRGB 色彩空间，iPhone 的浏览器不报告。改为用浏览器自带的图片元素解码，并按清单校验和核对（`src/pictures.mjs`，`e6dd7ac`，ENGINE-NOTES 第 1 条）。 · Stuck on loading on iPhone: pictures are now decoded by the browser's image element (item 1).
- 页面逐个加载约 260 个模块才开始：`tools/bundle.mjs` 打成一个压缩文件，并早期在 `index.html` 里预先列出第一幕要读的文件；原生 UI 后改为入口优先，全部资产仍在开锣前就绪（`7647b50`，ENGINE-NOTES 第 2 条）。 · About 260 module requests before the start; packed into one file (item 2).
- 手机上快速点触屏按钮会缩放页面、戏台滑出屏幕：固定视口，戏台不响应双指、双击和拖动，长按不弹菜单，并在脚本里再拒绝一次（`52cf172`）。 · Quick taps zoomed the page on phones; the viewport and gestures are now held.
- 触屏上分身计数挡住提示（`15621a1`）；丹房炉火特效分批绘制（`0cf5159`）。 · The clones' line covered the notice on touch screens; the furnace effects are batched.

- Fold7 真实竖屏旋转时英文标题撑大布局而无法开锣：限制网格内在尺寸和字体，英文允许换行。实际 411×813 屏幕开锣、摇杆、单跳及暂停恢复通过。 · Rotating a physical Fold7 had pushed the English Start button off-screen; bounded grid tracks and wrapping fix it, verified on the real portrait phone.

- 短横屏落幕上下裁切：印章与统计并排，操作区和挑战完整显示；Fold7 实打第三幕落幕验证 12/12 内容及入口可见/命中。仍有 2 CSS px 装饰性滚动余量。 · Short landscape result clipping fixed; 12/12 result items and control centers were in bounds in a physical-device win, with a 2 px scroll remainder.

- 引擎现在原生处理空的非交互状态文字与独立标签；正常首幕不发布空 Boss/分身占位符（ENGINE-NOTES 7、11）。官方 renderRetry/ beforeRender 替代游戏侧循环重启，仍只允许原有的特定 WebGL2 精度拒绝和限次相机呈现补偿，不延迟任何 Spine 更新（ENGINE-NOTES 12）。 · Native empty text and independent accessible names; bounded render-only recovery replaces the custom loop restart, without deferring Spine.

## 未完成 · Unfinished

- iPhone Safari、实体手柄、真实扬声器音质，以及剩余长帧的 GPU 执行与呈现归因尚未验证。 · iPhone Safari, a physical gamepad, acoustic speaker quality and remaining GPU/presentation tail attribution remain unverified.
- 中端设备、独立扬声器试听和失效资源重试仍需独立验收。 · Mid-range phones, acoustic listening and failed-resource retry need separate acceptance.

## 目录 · Layout

```
index.html, style.css   画布容器与启动失败兜底 · the canvas host and pre-engine error fallback
src/native-ui.mjs      原生戏单、战斗 HUD、触控、暂停与结算 · native playbill, combat HUD, controls, pause and results
src/main.mjs            搭台、加载、每一帧 · sets the stage, loads, runs each frame
src/rules/act.mjs       一幕戏：地面、悟空、天兵、箭、桃子、拦路的哪吒与计数 · an act: the ground, the hero, the soldiers, arrows, peaches, whoever bars the gate, and the count
src/rules/boss.mjs      哪吒：三段打法、乾坤圈与风火轮 · Nezha: his three phases, the ring and the wheels
src/rules/erlang.mjs    二郎神与哮天犬：变鹰、法天象地 · Erlang and his hound: the hawk, and his growing
src/rules/laozi.mjs     太上老君：金刚琢、扇子与八卦炉 · Laozi: the snare, the fan and the furnace
src/rules/clones.mjs    身外身：毫毛变出的分身 · the clones his hairs become
src/rules/hero.mjs      悟空的移动、连击与受伤（不含绘制）· how he moves, fights and is hurt, with no drawing
src/rules/foes.mjs      枪兵、弓手、力士、仙鹤、扇火童子与炼丹道士 · the spearman, the archer, the shield-bearer, the crane, the boy with the fan and the alchemist
src/rules/level.mjs     地面与碰撞，读自关卡地图 · the ground and what stops a body, read from the level's map
src/puppets.mjs         加载并操纵皮偶 · loads and plays the puppets
src/pictures.mjs        读入图片 · reads pictures in
src/input.mjs           键盘、手柄、触屏 · keyboard, gamepad, touch
src/joystick.mjs        横向屏幕摇杆 · horizontal on-screen stick
src/sound.mjs           配乐和音效混音 · score and effects mix
src/foley.mjs           按动作合成音效 · synthesizes foley for each action
tools/                  画皮、绑骨、出图集、布景与关卡，以及打包 · drawing, rigging, atlases, scenery and levels, and the packing
build/                  tools/bundle.mjs 的产物，页面加载的就是它 · what tools/bundle.mjs writes, and what the page loads
assets/                 tools/author.mjs 的产物 · what tools/author.mjs writes
vendor/                 引擎运行库的源文件，见 vendor/SOURCE.md · the engine runtime's files, see vendor/SOURCE.md
test/                   规则与资源的检查 · checks of the rules and the assets
```

## 引擎副本 · Engine copy

游戏的全部可互动界面由白鹭 Play 的原生视图绘制，使用语义树提供键盘焦点、无障碍名称及浏览器验收入口。扩展屏幕布局在竖屏上将 HUD 和按键安排在皮影幕布之外；原有规则、三幕场景、成绩键和音频混音不改变。横向模拟摇杆和长按跳跃由白鹭原生指针会话处理。只有引擎尚未运行时的可恢复启动提示留在网页中。

All playable screens use native Egret Play views, with a semantic tree for keyboard focus, accessibility names and browser acceptance. Expanded screen layout keeps the portrait HUD and controls outside the shadow cloth. The original rules, three stages, record keys and audio mix remain unchanged. Horizontal analog input and held jumping use native engine pointer sessions. Only the pre-engine recoverable boot notice remains in HTML.

引擎副本取自 [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) 提交 `82561d6338a805f0e0459a2d5d42a284f9385b30`，由引擎仓库的 `tools/vendor-game.mjs` 复制，见 [vendor/SOURCE.md](vendor/SOURCE.md)。

The engine copy is from [Egret_rebuild](https://github.com/cnedwin/Egret_rebuild) commit `82561d6338a805f0e0459a2d5d42a284f9385b30`, copied by the engine's `tools/vendor-game.mjs`; see [vendor/SOURCE.md](vendor/SOURCE.md).
