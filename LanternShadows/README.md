# Lantern Shadows · 灯影·闹天宫

灯影·闹天宫是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的 2D 横版动作游戏 Demo，整出戏演在一块皮影戏的幕布上：灯在幕后，镂空上色的皮偶贴着幕布，孙悟空一路打上南天门。目前有三幕。**第一幕南天门**：十名天兵把守一路，哪吒踏着风火轮在门前拦路。**第二幕蟠桃园**：桃林里有持盾的力士和从空中扑下来的仙鹤，枝上的桃子可以打下来吃，出口由二郎神带着哮天犬把守。**第三幕兜率宫**：太上老君的丹房，地上的炉口轮流喷火，丹炉可以打翻去烧敌人，有扇火的童子和扔丹药的道士，最后是老君本人、他的金刚琢和八卦炉。每幕四五分钟，三幕演完有一行总评。

Lantern Shadows is an independently developed 2D side-scrolling action demo built with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild), played as a shadow-puppet show: a lamp behind a cloth, carved and dyed leather puppets against it, and the Monkey King fighting his way to the Southern Gate of Heaven. Three acts are here. **Act one, the Southern Gate**: ten soldiers of heaven hold the road, and Nezha comes down on his wheels of wind and fire to bar the gate. **Act two, the Peach Orchard**: shield-bearers among the trees, cranes that stoop out of the air, peaches on the boughs to knock down and eat, and Erlang with his hound holding the way out. **Act three, the Tushita Palace**: Laozi's furnace room, where grates in the floor breathe fire by turns, a furnace can be knocked over to burn whoever is beyond it, a boy fans the flames and an alchemist throws pills, and at the end Laozi himself, with his Diamond Snare and the Eight Trigrams Furnace. Each is four or five minutes, and when all three are played their seals are told together.

## 玩法 · How to play

| | 键盘 · Keyboard | 手柄 · Gamepad | 触屏 · Touch |
|---|---|---|---|
| 走 · Move | A D，或方向键 · A D or the arrow keys | 左摇杆、十字键 · left stick, D-pad | ◀ ▶ |
| 跳 · Jump | K，或空格 · K or Space | A | 跳 · Jump |
| 棍 · Staff | J | X | 棍 · Staff |
| 筋斗云 · Cloud roll | L，或 Shift · L or Shift | B | 云 · Roll |
| 身外身 · Clones | I，或 C · I or C | Y | 变 · Hairs |

- 连按三下棍是一套连击：平扫、上挑、劈砸，一下比一下重。每一下打中都有一记锣鼓：平扫是梆子，上挑是小锣，劈砸是大锣。
- 跳键按得久跳得高，轻点是小跳；云朵可以从下面跳上去，石台要跳上去。
- 筋斗云贴地翻出一段，空中可以用一次；翻滚途中什么都伤不到他，枪尖和箭都能穿过去。一棍打中之后可以用它收招。
- **身外身**：他自己打中的每一棍都攒一根毫毛，攒满三十根（桃子下面那条金线满了），就能拔一把毫毛吹出一百个小悟空。它们翻着筋斗落地，扑向附近的天兵或哪吒围着打，七秒后变回毫毛；附近没有敌人时就在他身边跑跳。分身打中的也计入连击，但不攒毫毛。施法的那一下谁也伤不到他。分身在场时，台口会写出分身数、正在推进的骨骼数和每秒帧数。
- **枪兵**先把枪放平后撤（这是预警），再一步刺出。预警时打他能打断；已经刺出就只有重击才拦得住，最好翻过去。
- **弓手**站着不动，拉满弓后放箭。箭可以跳过、翻过，也可以一棍打落。
- 五个桃是他的体力，挨一下少一个；吃完就倒，随后在上一面红旗（歇脚处）重新站起来。
- 把十名天兵全部击退再走进门前的院子，哪吒就到了；打退他，南天门才开。落幕时按用时、受伤和倒地次数盖一枚印：S、A、B、C。
- P 或 Esc 暂停。开场的戏单上可以选“直接会哪吒”“直接会二郎神”“直接会太上老君”，从各自的院子演起；也可以选从第二、三幕演起。一幕落幕后，按“下一幕”接着演。

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
- P or Esc pauses. The playbill at the start offers “straight to Nezha”, “straight to Erlang” and “straight to Laozi”, each beginning at his court, and a beginning from act two or three. When an act's curtain has fallen, “Next act” goes on to the one after.

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

## 用到的引擎能力 · What it uses of the engine

| 能力 · Capability | 用在哪里 · Where |
|---|---|
| Spine 骨骼动画 · Spine skeletal animation (`@egret/spine`) | 十种皮偶（第二幕添了力士、仙鹤、二郎神、他变的鹰和 15 根骨骼的哮天犬；鹰与仙鹤骨骼同名，共用一套动画；二郎神法天象地时整副骨骼按比例放大），其中：悟空 25 根骨骼、24 片皮、12 段动画；哪吒 21 根骨骼、19 片皮、17 段动画；枪兵与弓手各 18 根骨骼；木人桩 8 根。一幕里同台 14 个，只推进镜头附近的；使出身外身时再加一百个悟空，一共两千五百多根骨骼同时在动。动画之间有混合，受击时整台戏定格几帧。 · Ten puppets (act two adds the shield-bearer, the crane, Erlang, the hawk he becomes and a hound of 15 bones; the hawk has the crane's bones under other feathers and moves by the crane's animations; and when Erlang grows, his whole skeleton is scaled), among them the Monkey King with 25 bones, 24 pieces and 12 animations; Nezha with 21 bones, 19 pieces and 17 animations; a spearman and an archer with 18 bones each; and a post with 8. Fourteen share the stage in an act, and only those near the camera are moved on; the body beyond the body adds a hundred Monkey Kings, more than two and a half thousand bones moving at once. Animations blend into one another, and the whole stage holds still for a few frames when a blow lands. |
| 多轨动画 · Animation tracks | 悟空的金箍棒在不在手里是单独一条轨（被金刚琢套走时收起）。哪吒同时放三条轨：第一条是他在做什么，第二条收放三头六臂，第三条管乾坤圈在不在手里。后两条只动自己那块骨头，其余照旧。 · Whether the staff is in the Monkey King's hand is a track of its own (it is put away when the snare takes it). Nezha plays three tracks at once: what he is doing on the first, his three heads and six arms shown or put away on the second, and whether the ring is in his hand on the third. The upper two move only their own bone and leave the rest as it was. |
| 瓦片地图 · Tile map (`@egret/engine/tilemap`) | 每一幕是一张 Tiled 地图，各用自己的一套瓦片（南天门的石台与云，蟠桃园的草地与树枝，兜率宫的地板与回廊）：引擎用它画地面，规则读同一个文件里的实心格、可以站的格和摆放的东西。换幕时拆掉上一幕的地图、布景和皮偶，搭起下一幕的。 · Each act is a Tiled map with a tile set of its own (stone and cloud for the gate, turf and boughs for the orchard, boards and galleries for the palace): the engine draws the ground from it, and the rules read the solid cells, the cells that can be stood on and the things placed in the same file. Between acts the last one's map, scenery and puppets are taken down and the next one's put up. |
| 资源清单 · Resource manifest | 骨骼、图集和贴图由清单登记，按清单里的校验和核对后加载。图片由浏览器自带的图片解码读入（`src/pictures.mjs`），这条路在各家手机浏览器上都走得通。 · Skeletons, atlases and their pages are listed in a manifest and checked against its checksums as they load. Pictures are decoded by the browser's own image element (`src/pictures.mjs`), a way that works in every phone browser. |
| 混合模式 · Blend modes | 皮偶与布景用正片叠底画在幕布上：皮只会让透过它的光变暗，两片叠着的地方更暗；火星用相加。 · Puppets and scenery are multiplied onto the cloth, since leather only darkens the light that passes through it, and where two pieces overlap it is darker still. Sparks are added. |
| 2D 摄像机 · 2D camera | 跟随、前瞻、边界、多层视差、受击震动与重击时的推近。 · Following with a lead, bounds, parallax layers, a shake when a blow lands and a push-in on the heaviest. |
| 粒子 · Particles | 火星、稻草屑、脚下的尘，风火轮上和它碾过的地面上的火，丹房里炉口的火柱、打翻的炉火、扇出的火舌与风。 · Sparks, straw, dust underfoot, the fire on the wheels and on the ground they have crossed, and in the palace the columns over the grates, the spilled furnace fire, and the fan's flame and wind. |
| 混音器 · Audio mixer | 七种锣鼓声都由代码合成为 WAV 再交给混音器，仓库里没有录音文件。 · All seven percussion sounds are worked out in code as WAV bytes and handed to the mixer; the repository holds no recordings. |
| 输入 · Input | 键盘、手柄（带震动）、触屏。 · Keyboard, gamepad with rumble, and touch. |
| 渲染后端 · Renderers | 默认 WebGL2，可选 WebGPU。 · WebGL2 by default, WebGPU on request. |

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

## 目录 · Layout

```
index.html, style.css   页面、幕布前的字与触屏按钮 · the page, the words in front of the cloth, the touch buttons
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
src/sound.mjs           合成的锣鼓 · the synthesised percussion
tools/                  画皮、绑骨、出图集、布景与关卡，以及打包 · drawing, rigging, atlases, scenery and levels, and the packing
build/                  tools/bundle.mjs 的产物，页面加载的就是它 · what tools/bundle.mjs writes, and what the page loads
assets/                 tools/author.mjs 的产物 · what tools/author.mjs writes
vendor/                 引擎运行库的源文件，见 vendor/SOURCE.md · the engine runtime's files, see vendor/SOURCE.md
test/                   规则与资源的检查 · checks of the rules and the assets
```

## 运行与测试 · Run and test

```
python3 -m http.server 4180        在仓库根目录执行，然后打开 /LanternShadows/ · from the repository root, then open /LanternShadows/
node --test test/*.test.mjs        在本目录执行 · from this folder
```

## 许可 · Licences

游戏代码与生成的美术以 Apache-2.0 发布。引擎运行库与其依赖的许可见 `vendor/NOTICE`；其中 Spine 运行库按 Spine Runtimes License Agreement 使用，要求使用者持有 Spine 编辑器授权。

The game's code and its generated art are released under Apache-2.0. The engine runtime and its dependencies are listed in `vendor/NOTICE`; the Spine runtime among them is used under the Spine Runtimes License Agreement, which requires a Spine Editor license of whoever uses it.
