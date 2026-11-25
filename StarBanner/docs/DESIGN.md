# 星旗战记 · 设计与规则 · Starbanner Tactics · Design and rules

本作是原作规则的还原：棋盘上的数字和判定尽量与原作一致，人物、阵营、地图、外观、文字和音乐都是本作自己的。下面写明每条规则从哪里来，以及哪些是本作自定。

This game restores the original's rules: the numbers and judgements on the board follow the original as closely as we
could find them, while the people, factions, maps, looks, words and music are this game's own. Below is where each
rule comes from, and what is this game's own choice.

## 来源 · Sources

- 原作社区维基的伤害公式页（含两个算例）、规则页、兵种数据表与伤害矩阵；原作官方开发日志（2018 年 10 月）对法师治疗与魔女诅咒的说明。 · The original's community wiki (the damage formula page with its worked examples, the rules page, the unit table and damage matrix); the original's official development log of October 2018 on the mage's healing and the witch's hex.
- 规则只取数字和判定，用本作自己的代码实现（`src/sim/`）；兵种名字按本作的设定改写（如「狮鹫骑兵」「扫帚魔女」「飞龙」「战龟」「鱼人」）。 · Only the numbers and judgements are taken, implemented in this game's own code; unit names are this game's own.

## 伤害 · Damage

伤害按攻方的「基础伤害 + 随机加成」乘以攻方生命比、地形系数、暴击倍率和守方受伤系数，四舍五入，只要有伤害就至少 1 点：

    伤害 = round(100 × 攻方生命/100 × (基础伤害 + 加成) × 地形 × 暴击 × 受伤系数)
    加成 = 10% × (r × k + (1 − k) / 2)，r ∈ [0, 1) 随机，k = 1 / 暴击倍率
    地形 = 1 − 守方生命/100 × 防御星 × 10%（防御星 ≥ 0）；1 + 骷髅数 × 10%（河流、沙滩）

Damage is the attacker's base damage plus a random bonus, times the attacker's health share, the terrain factor, the
critical multiplier and the defender's intake, rounded, at least 1 whenever any is dealt. A critical narrows the random
bonus so its average stays the same.

- 验算：生命 75 的剑士在暴击时打山地上生命 60 的猎犬，中间值 = 100 × 0.75 × (0.45 + 5%) × (1 − 0.6 × 4 × 10%) × 1.5 = 43（`test/rules.test.mjs`）。 · Checked against the worked example's shape in `test/rules.test.mjs`.
- 空中单位和建筑不吃地形；要塞只受一半伤害。 · Fliers and buildings take no cover; strongholds take half.
- 武器分能打陆地、水面、空中哪几类目标（看目标所在的格子：沙滩和桥算陆地）；指挥官的武器三类都能打。 · A weapon reaches land, water or air targets by where the target stands; a commander's reaches all three.
- 反击：守方挨打后还活着、武器够得着攻方、且武器能移动后攻击（弩车和投石车不反击），就按挨打后的生命还手；建筑的守军在相邻时以满强度还手。 · The counter: a surviving defender whose weapon reaches and can strike after moving answers at its new health; a building's garrison answers adjacent attackers at full strength.

## 兵种 · Units

价格、移动、射程、可打目标与暴击条件：

| 兵种 · Unit | 价格 · Cost | 移动 · Move | 射程 · Range | 目标 · Reach | 暴击 · Critical |
|---|:-:|---|:-:|---|---|
| 剑士 · Swordsman | 100 | 步行 · walk 4 | 1 | land | ×1.5 站在本方指挥官旁 |
| 猎犬 · Hound | 150 | 步行 · walk 5 | 1 | land | ×1.5 目标旁有另一只友方猎犬 |
| 枪兵 · Pikeman | 250 | 步行 · walk 3 | 1 | land | ×1.5 旁边有另一名友方枪兵 |
| 补给马车 · Supply Wagon | 300 | 车轮 · wheels 12 | — | — | — |
| 法师 · Mage | 400 | 步行 · walk 5 | 1 | land/air | ×1.5 自身站在 3 星以上地形 |
| 弓手 · Archer | 500 | 步行 · walk 3 | 1–3 | land/water/air | ×1.35 本回合没移动（反击不算） |
| 骑士 · Knight | 600 | 骑乘 · ride 6 | 1 | land | ×1.5 攻击位置离回合起点整整 6 格 |
| 弩车 · Ballista | 800 | 车轮 · wheels 6 | 2–6（不能移动后攻击 · no move-and-strike） | land/water/air | ×1.5 目标恰在 2 格 |
| 投石车 · Trebuchet | 1000 | 车轮 · wheels 6 | 2–5（不能移动后攻击 · no move-and-strike） | land/water | ×1.5 目标在 5 格 |
| 巨人 · Giant | 1200 | 步行 · walk 5 | 1 | land | ×2.5 自身生命 ≤ 40 |
| 热气球 · Balloon | 450 | 飞行 · fly 6 | — | — | — |
| 狮鹫骑兵 · Griffin Rider | 600 | 飞行 · fly 5 | 1 | land/water/air | ×1.25 自身在山地上空 |
| 扫帚魔女 · Broom Witch | 800 | 飞行 · fly 7 | 1 | air | ×2 目标旁没有它那方的魔女 |
| 飞龙 · Wyvern | 1250 | 飞行 · fly 8 | 1 | land/water | ×2 目标在道路上 |
| 渡船 · Ferry | 200 | 航行 · sail 10 | — | — | — |
| 战龟 · War Turtle | 400 | 航行 · sail 12 | 1 | water | ×1.5 自身在深海 |
| 鱼叉船 · Harpoon Ship | 550 | 航行 · sail 4 | 3–6 | air/water | ×1.5 自身在礁石 |
| 战舰 · Galleon | 900 | 航行 · sail 8 | 2–4 | land/water | ×1.5 自身在沙滩 |
| 鱼人 · Merfolk | 350 | 两栖 · amphibious 5 | 1–2 | land/water | ×2 自身在河/海/礁 |
| 指挥官 · Commander | 500 | 步行 · walk 4 | 1 | land/water/air | — |

## 基础伤害 · Base damage (%)

行是攻方，列是守方（剑=剑士、犬=猎犬、枪=枪兵、弓=弓手、法=法师、骑=骑士、巨=巨人、车=补给马车、弩=弩车、投=投石车、鱼=鱼人、鹫=狮鹫骑兵、魔=扫帚魔女、龙=飞龙、球=热气球、渡=渡船、龟=战龟、叉=鱼叉船、舰=战舰、帅=指挥官、建=建筑）。空格表示打不了。

| 攻 ↓ / 守 → | 剑 | 犬 | 枪 | 弓 | 法 | 骑 | 巨 | 车 | 弩 | 投 | 鱼 | 鹫 | 魔 | 龙 | 球 | 渡 | 龟 | 叉 | 舰 | 帅 | 建 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 剑士 | 55 | 45 | 35 | 65 | 55 | 15 | 5 | 35 | 35 | 30 | 55 |  |  |  |  |  |  |  |  | 10 | 35 |
| 猎犬 | 75 | 65 | 45 | 75 | 55 | 10 | 5 | 30 | 40 | 35 | 75 |  |  |  |  |  |  |  |  | 15 | 20 |
| 枪兵 | 75 | 80 | 55 | 70 | 65 | 70 | 10 | 45 | 55 | 50 | 75 |  |  |  |  |  |  |  |  | 15 | 50 |
| 法师 | 85 | 80 | 75 | 85 | 35 | 30 | 20 | 55 | 30 | 45 | 55 | 140 | 130 | 80 | 100 | 20 | 20 |  | 15 | 20 | 35 |
| 弓手 | 70 | 75 | 60 | 65 | 75 | 40 | 10 | 35 | 30 | 25 | 70 | 30 | 20 | 10 | 20 | 20 | 20 | 20 | 20 | 5 | 20 |
| 骑士 | 90 | 120 | 45 | 100 | 110 | 55 | 25 | 55 | 85 | 80 | 85 |  |  |  |  |  |  |  |  | 25 | 65 |
| 弩车 | 40 | 50 | 30 | 30 | 40 | 25 | 10 | 30 | 20 | 10 | 40 | 130 | 95 | 85 | 110 | 20 | 20 | 20 | 20 | 10 | 30 |
| 投石车 | 100 | 110 | 80 | 120 | 90 | 80 | 55 | 70 | 85 | 80 | 100 |  |  |  |  | 80 | 45 | 65 | 75 | 25 | 85 |
| 巨人 | 130 | 150 | 100 | 150 | 110 | 85 | 45 | 75 | 100 | 105 | 130 |  |  |  |  |  |  |  |  | 35 | 85 |
| 狮鹫骑兵 | 65 | 55 | 45 | 75 | 25 | 75 | 10 | 35 | 35 | 55 | 65 | 55 | 30 | 35 | 55 | 35 | 25 | 25 | 45 | 15 | 50 |
| 扫帚魔女 |  |  |  |  |  |  |  |  |  |  |  | 60 | 35 | 35 | 50 |  |  |  |  |  |  |
| 飞龙 | 120 | 150 | 120 | 140 | 65 | 100 | 65 | 80 | 110 | 105 | 120 |  |  |  |  | 110 | 75 | 70 | 90 | 35 | 65 |
| 战龟 |  |  |  |  |  |  |  |  |  |  | 110 |  |  |  |  | 55 | 50 | 35 | 80 |  | 45 |
| 鱼叉船 |  |  |  |  |  |  |  |  |  |  | 30 | 130 | 80 | 70 | 80 | 45 | 75 | 30 | 15 |  | 30 |
| 战舰 | 100 | 110 | 75 | 120 | 80 | 70 | 55 | 60 | 85 | 80 | 75 |  |  |  |  | 65 | 30 | 80 | 55 | 25 | 75 |
| 鱼人 | 35 | 45 | 25 | 35 | 45 | 15 | 5 | 35 | 25 | 20 | 25 |  |  |  |  | 10 | 10 | 30 | 5 | 10 | 15 |
| 指挥官 | 115 | 115 | 75 | 130 | 80 | 55 | 40 | 70 | 60 | 55 | 95 | 90 | 70 | 35 | 55 | 60 | 55 | 45 | 55 | 40 | 70 |

建筑守军反击的基础伤害见 `src/sim/units.mjs` 的 `GARRISON`。 · A garrison's counter is `GARRISON` in `src/sim/units.mjs`.

## 地形 · Terrain

| 地形 · Terrain | 防御星 · Cover | 每格移动花费（没写的走不了） · Cost per tile (missing: impassable) |
|---|:-:|---|
| 平原 · Plains | 1 | walking 1、riding 1、flying 1、wheels 2、amphibious 2 |
| 道路 · Road | 0 | walking 1、riding 1、flying 1、wheels 1、amphibious 2 |
| 森林 · Forest | 3 | walking 2、riding 3、flying 1、amphibious 4 |
| 山地 · Mountain | 4 | walking 3、flying 1 |
| 桥 · Bridge | 0 | walking 1、riding 1、flying 1、wheels 1、amphibious 2、sailing 2 |
| 河流 · River | -2 | walking 2、riding 4、flying 1、amphibious 1 |
| 沙滩 · Beach | -1 | walking 1、riding 1、flying 1、amphibious 2、sailing 2 |
| 浅海 · Sea | 1 | sailing 2、flying 1、amphibious 1 |
| 深海 · Deep sea | 0 | sailing 1、flying 1、amphibious 1 |
| 礁石 · Reef | 2 | sailing 4、flying 1、amphibious 2 |
| 城砖 · Courtyard | 0 | walking 1、riding 1、flying 1、wheels 1、amphibious 2 |
| 港湾 · Harbour | 0 | sailing 1、flying 1、amphibious 1 |

## 建筑、收入与招募 · Buildings, income and recruiting

- 要塞和村庄每回合开始各给 100 金；兵营、飞羽塔、港口不给钱。 · Strongholds and villages give 100 gold at the start of each turn.
- 自己的建筑每回合回复 10 点耐久；指挥官每回合回复 5 点生命。 · Your buildings mend 10 a turn; the commander mends 5.
- 兵营招地面兵（轻、重），飞羽塔招飞兵，港口招舰船和鱼人；每座建筑每回合招一次，新兵放在相邻空格，下回合才能行动。 · Barracks train ground troops, aeries fliers, harbours ships and merfolk; once a building a turn; the recruit waits a turn.
- 占领：会占领的单位（剑士、枪兵、弓手、法师、鱼人、指挥官）站到中立建筑旁边即可占领，建筑的耐久是占领者生命的一半；敌方建筑要先打到 0 变回中立。要塞不能占领，被打到 0 就输。 · Capture: a capturing unit next to a free building takes it, the building getting half the unit's health; an enemy building must first be beaten to 0. A stronghold cannot be taken and losing it loses the battle.
- 援军：单位站在自己的村庄、兵营、飞羽塔或港口旁可以回血，回多少建筑就掉多少（建筑至少留 1），花费 = 单位价格 × 回复比例。 · Reinforcing draws health from adjacent friendly buildings (each keeps 1) at the unit's price times the share regained.
- 法师治疗：花 300 金，2 格内选一格，那格及相邻格的友军各回 20。魔女诅咒：花 300 金，4 格内所有敌方单位各掉 10。 · A mage's healing: 300 gold, 20 health to friends on and around a tile within 2. A witch's hex: 300 gold, 10 to every enemy within 4.
- 运输：补给马车载 1 个轻步兵，热气球载 2 个，渡船载 2 个（轻重都行）；卸下的单位当回合不能行动。 · Carrying: the wagon one light unit, the balloon two, the ferry two of any ground kind; dropped units wait a turn.

## 指挥官与战意技 · Commanders and rally arts

战意槽的规则同原作：每回合结束 +10、主动攻击 +20、反击 +10、击倒 +30，满了就能在指挥官行动时放一次。四位指挥官和他们的战意技是本作原创：

| 指挥官 · Commander | 阵营 · Faction | 战意技 · Art | 槽 · Meter | 效果 · Effect |
|---|---|---|:-:|---|
| 赛琳 · Seline | 晨星王国 | 破晓突刺 · Daybreak Lance | 150 | 朝一个方向连刺三格，每个敌人按满血吃一枪 · three tiles in a line, each foe takes a full-strength blow |
| 埃德蒙 · Edmund | 晨星王国 | 星落 · Starfall | 200 | 5 格内一处及周围一格的敌人各掉 30（指挥官和建筑至少留 1） · 30 to foes on and around a tile within 5 |
| 维蕾塔 · Vireta | 夜鸦公国 | 鸦羽契约 · Raven Pact | 150 | 两格内敌人各掉 20（至少留 1），自身回复吸走总量的一半 · 20 from foes within 2, half of it back to her |
| 格伦 · Garron | 夜鸦公国 | 黑铁号令 · Iron Command | 100 | 自身和两格内友军回复 10，到他下回合前受伤减 40% · he and friends within 2 mend 10 and take 40% less until his next turn |

战意技的数值是本作自定（原作每位指挥官的技能不同，这里不照搬）。 · The arts' numbers are this game's own.

## 胜负 · Victory

击倒敌方指挥官或把敌方要塞打到 0 即胜；被淘汰的一方剩下的单位离场，建筑变回中立。 · Fell the enemy commander or break their stronghold; the beaten side's army leaves and its buildings stand free.

## 地图 · Maps

三张地图都是本作原创，每张只设计上半边，下半边是绕中心转半圈得到的，双方地形、建筑和兵力完全对等（`test/rules.test.mjs` 检查）。 · Three maps of this game's own; each is drawn as a top half turned half a circle for the bottom, so both sides are equal.

| 地图 · Map | 大小 · Size | 起始金 · Gold | 特点 · Character |
|---|:-:|:-:|---|
| 麦浪渡口 · Wheatwater Ford | 16×12 | 100 | 小河斜穿，两座桥是要冲 · a stream with two bridges to fight over |
| 双子海湾 · Twin Coves | 20×14 | 300 | 两座港湾，陆路狭窄 · two harbours and a narrow land route |
| 龙脊隘口 · Dragonspine Pass | 20×16 | 200 | 群山分出三条路，山顶有飞羽塔 · three roads through the peaks |

## 电脑对手 · The computer

逐个单位估值：期望伤害按目标身价折算、击倒另加；挨的反击和下回合可能挨的打按自己身价扣分；占领、治疗、援军、诅咒各有收益；没事做时朝最近的目标前进并找有防御的格子。指挥官倒下即输，对它的风险估值加倍。招兵按「能打谁、怕谁」对敌方阵容打分，同种兵越多越不想再招。难度只改风险权重和随机性。 · Each unit is valued by expected damage priced by the target, a kill bonus, the counter and next turn's danger priced by itself, capture, healing, reinforcing and hexes; with nothing to do it heads for the nearest objective on cover. The commander's danger counts double. Recruits are scored against the enemy's army, with less wish for more of one kind. Levels change only the weight of danger and the noise.
