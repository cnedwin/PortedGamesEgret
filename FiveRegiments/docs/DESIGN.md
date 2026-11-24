# 五营争锋 · 设计 · Five Regiments · Design

## 一句话 · In one line

选五营之一，在县城营寨、桃林、竹林、雪原关城和王城宫前，依次单挑另外四营，最后以一敌二。第三人称冷兵器对决：鼠标方向决定刀路，右键按方向格挡，踢腿破防，体力管着每一刀；每个职业带两个职业技能上阵，武器带战技，怒气满了才能放。

Pick one of five regiments and fight the other four one at a time — in a frontier camp, a peach grove, a bamboo grove, a snowy pass fort and before the palace — then take on two at once. Third-person cold-steel duels: the way the mouse moves sets the line of the cut, the right button guards that line, a kick breaks a guard, stamina governs every swing; each regiment takes two profession skills into a fight, and each weapon has its weapon art, used when the rage is full.

## 数值从哪来 · Where the numbers come from

本作追求贴近原作，每个数要么有出处，要么写明是本作自定。出处分四类：

1. **公开的版本公告**：职业转职的版本更新（2025 年 3 月），以及赛季版本的 S1（2026-04-14）、S2（2026-06-24）、S3（2026-08-31）、S4（2026-11-18）更新公告里的「职业平衡调整（满级数据）」。职业与武器种类、技能和天赋的名字、伤害百分比、冷却、体力消耗都从这里来；同一项被多个赛季改过时取最新的值。S2 起所有主动职业技能冷却加 5 秒，下面的冷却已经算进去。
2. **游戏内的物品面板**（玩家提供的截图）：单手利刃、双手斧钺、长杆斧钺、长杆利刃、短弓、轻盾的伤害和战技；一套重甲、一套轻甲的护甲值、偏斜和移动惩罚。
3. **玩家口述**：各职业的大致生命值、默认技能搭配、PC 按键（X 战技、R T 职业技能）、战技要怒气满、银翎卫马上以挥砍为主也有刺、下马才能放职业技能、方天戟可以马上架枪、虎步穿轻甲。另有一篇玩家攻略说架枪比普通刺短、敌人在马右侧最好打、枪尖指向马头右前方约两点钟。
4. **本作自定**：公告和面板都没有的数（出手前摇、距离、没有公布的冷却和伤害、怒气怎么涨、伤害公式里的三个常数等），每个都在下面标为「本作」。

The game aims to keep close to the original, so every number either has a source or is marked as this demo's own. The sources: (1) the published release notes — the profession release (March 2025) and the seasonal notes S1 (14 Apr 2026), S2 (24 Jun 2026), S3 (31 Aug 2026), S4 (18 Nov 2026), from which come the professions, weapon kinds, skill and talent names, damage shares, cooldowns and stamina costs (the latest value where seasons changed one; from S2 every active skill waits 5 s longer, included below); (2) in-game item cards from a player's screenshots — weapon damage and weapon arts, and a heavy and a light armour set; (3) a player's account — each profession's health, the default skills, the keys, that an art needs full rage, how the Silver Wing Guard fights from the saddle, that the fangtian ji can couch, that the Tiger Step wears light armour — and a player's guide to the couched lance; (4) this demo's own numbers, marked "demo" below.

体力：公告里的体力消耗按 ×0.25 换算，因为本作一个人的体力是 100。 · Stamina: the official costs are scaled ×0.25, since a man here has 100 stamina.

## 五营 · The five regiments

| 营 · Regiment | 兵器（种类） · Weapon (kind) | 护甲 · Armour | 生命 · Health | 步速 · Pace | 战技 · Weapon arts |
|---|---|---|---|---|---|
| 羽林卫 · Imperial Guard | 环首刀（单手利刃）+ 盾 · sabre + shield | 重甲 · heavy | 18000 | 3.07 | X 终结打击，Z 盾牌猛击 |
| 虎步 · Tiger Step | 汉剑（单手利刃） · Han sword | 轻甲 · light | 12000 | 3.57 | X 终结打击 |
| 陷阵营 · Berserker Battalion | 长斧（双手斧钺） · long axe | 重甲 · heavy | 20000 | 3.28 | X 斧钺猛击 |
| 银翎卫 · Silver Wing Guard | 方天戟（长杆斧钺）、披甲战马 · fangtian ji, armoured horse | 重甲 · heavy | 13000（马 5700，本作） | 3.28 | 步战 X 斧钺猛击，马上 X 架枪 |
| 武射史 · Martial Archery Expert | 角弓、铁制狩猎刀 · bow, hunting knife | 轻甲 · light | 11000 | 3.36 | X 多重射击 |

- 职业对应的武器（盾牌、单手、双手、长杆、弓箭）来自转职公告；具体兵器选的是原作里有的物品名。陷阵营原先拿斩马刀，因为有战技截图的是双手斧钺，改成了双手长斧。 · The weapon kinds are from the profession notes; the weapons are items the original has. The Berserker Battalion carries a two-handed axe because that is the kind whose weapon art is on a card.
- 武器伤害（面板）：单手利刃 挥砍 762 / 穿刺 842，双手斧钺 1062 / 909，长杆斧钺 998 / 759，长杆利刃 穿刺 1091，轻盾 钝击 123。面板上除了正下方（穿刺），各方向都是挥砍；本作四个刀路里左、右、上劈算挥砍，突刺算穿刺。弓的面板是「箭的伤害 ×904.2%」，箭本身没有面板，本作按 140 算（满弓 1266）。 · Weapon damage from the cards; the bow multiplies the arrow ×9.042 and the arrow is taken as 140 (demo).
- 护甲（面板，一套百炼）：重甲 头、身 挥砍 2603 / 穿刺 2343 / 钝击 2083，腿 2108 / 1897 / 1686；轻甲 头 1379 / 1510 / 1762，身、腿 1116 / 1223 / 1426，另有 **偏斜 33%，偏斜减伤 50%**。重甲三件移动惩罚合计 22%，轻甲 15%；盾和弓的面板各 −5%。 · Armour from the cards: heavy and light values per part; light armour deflects 33% of blows for half damage. Movement penalties: heavy 22% in all, light 15%, a shield or bow 5% more.
- 步速 = 4.2 米/秒（本作）×（1 − 护甲惩罚 − 盾或弓的惩罚）。虎步穿轻甲，跑得最快。 · Pace = 4.2 m/s (demo) × (1 − the penalties); the Tiger Step, in light armour, is quickest.

## 伤害公式 · The damage formula

原作没有公布伤害公式。本作按上面的武器面板、护甲面板和生命值推出一个，目标是「有来有回、打得爽、不会一刀死、普通一刀也不是只掉血皮」：

```
原始伤害 = 武器伤害（挥砍或穿刺、钝击）× 动作倍率 × 暴击 × 天赋 × 马速加成
实际伤害 = 原始伤害 × 2.8 × 6000 / (6000 + 打中部位对应类型的护甲值)，轻甲偏斜时再 × 0.5
扣    血 = 生命 × x / (1 + x / 0.4)，其中 x = 实际伤害 ÷ 生命
```

- 动作倍率：普通一刀 100%，按住蓄力最高 160%，技能和战技用官方百分比。暴击 10% 几率、1.5 倍（本作；天赋另加）。马速加成：马越快越疼，疾驰时最多 +35%（本作）。 · Move share: 100% for a blow, up to 160% held, the official share for skills and arts; crits 10% for ×1.5 (demo); up to +35% at a gallop (demo).
- **2.8**：面板上是武器本身的伤害，原作里等级、熟练度还会加成，用这一个系数代表（本作）。 · 2.8 stands for what levels and proficiency add (demo).
- **6000**：护甲值 A 挡掉 A/(A+6000)。重甲挡挥砍约 30%，轻甲约 16%，加上偏斜，平均下来两者差不多，但轻甲忽高忽低。重甲穿刺、钝击护甲低，刺和砸更疼；轻甲反过来。上劈打头，其余打身。 · 6000: an armour value A takes off A/(A+6000) — heavy about 30% of a cut, light about 16% plus its deflections, so about even on average, light more uneven; thrusts and blunt blows do better on heavy armour, cuts on light. Overhead lands on the head, the rest on the body.
- **0.4**：最后一行把大伤害压弯，任何一下都打不到 40% 生命，所以不会被一刀秒；小伤害几乎不受影响。 · 0.4: the last line bends big blows so that none reaches 40% of a man's health; small ones are barely touched.

推算结果（`node tools/formula.mjs`）：每格是「普通一刀 / 蓄满一刀 / 最大技能或战技暴击」占对方生命的比例。 · The table it gives (ordinary / held / biggest skill or art, critical), as shares of the defender's health:

| 攻 → 守 | 羽林卫 | 虎步 | 陷阵营 | 银翎卫 | 武射史 |
|---|---|---|---|---|---|
| 羽林卫 | — | 9.4 / 13.1 / 26.8% | 6.3 / 9.2 / 20.1% | 8.9 / 12.6 / 24.3% | 10.0 / 13.9 / 27.6% |
| 虎步 | 6.9 / 9.9 / 21.1% | — | 6.3 / 9.2 / 20.1% | 8.9 / 12.6 / 24.3% | 10.0 / 13.9 / 27.6% |
| 陷阵营 | 8.9 / 12.6 / 26.0% | 11.9 / 16.1 / 30.8% | — | 11.4 / 15.6 / 28.8% | 12.7 / 16.9 / 31.4% |
| 银翎卫 | 8.5 / 12.1 / 22.7% | 11.4 / 15.5 / 28.1% | 7.8 / 11.2 / 21.6% | — | 12.1 / 16.3 / 28.8% |
| 武射史（满弓 / 扇形射击暴击） | 10.5 / 21.1% | 13.3 / 26.4% | 9.7 / 20.0% | 13.2 / 24.3% | — |

实测（电脑对电脑 200 场，强度 0.6）：每命中一下中位数掉 7.8% 生命，一成的命中低于 3.5%（多是被格挡后漏过来的），一成高于 15.9%；单次最大 28.8%；一场平均 41 秒，领先的一方平均换手 2.3 次。 · In play (200 bouts at strength 0.6): a landed blow takes a median 7.8% of health, a tenth under 3.5% (mostly what gets through a guard), a tenth over 15.9%; the biggest 28.8%; a bout lasts 41 s and the lead changes hands 2.3 times.

## 职业技能（上阵两个）· Profession skills (two taken)

R、T 放技能。银翎卫骑马时职业技能放不了，要下马。「本作」是公告没有给、本作补的数。 · R and T; the Silver Wing Guard must be on foot. "Demo" marks what the notes do not give.

| 技能 · Skill | 公告 · From the notes | 本作 · Demo |
|---|---|---|
| **羽林卫** 冲锋突刺 Charge and Thrust（默认） | 名称；加快释放速度 | 冲 6 米后突刺 150%，冷却 12 秒，体力 18 |
| 蛮牛冲击 Bull Charge（默认） | 命中骑兵使其落马；目标 4 秒内无法攻击和防御（招架/格挡状态下时长不变）；体力 75 | 冲 8 米，伤害 100%，格挡着的人 2 秒（调整前的时长），冷却 15 秒 |
| 格挡反击 Parry and Counter | 伤害 260%，体力 62 | 举挡 1.5 秒，冷却 12 秒 |
| 回身斩 Spinning Slash | 伤害 280% | 环身一圈，冷却 10 秒，体力 22 |
| 圆月斩 Full Moon Slash | 体力影响的额外伤害 150%；释放速度提高 | 基础 100%，额外伤害 = 150% × 出手时的体力比例，冷却 10 秒，体力 24 |
| **虎步** 回旋击 Spinning Strike（默认） | 体力 90，冷却 5 + 5 秒 | 原地回旋一圈 200% |
| 挥砍 Swing Slash（默认） | 每次 105%，体力 90 | 三下，冷却 10 秒 |
| 毒瘴 Poison Mist | 冷却 18 + 5 秒；中毒伤害 240；传染；中毒结束后 8 秒内不再中毒 | 240 按每秒、中毒 6 秒，2 米内传给同伴，毒雾半径 4 米留 6 秒，体力 20 |
| **陷阵营** 下劈 Downward Slash（默认） | 伤害 240%，范围半径 2.5 米，体力 80 | 冷却 14 秒 |
| 剑气斩 Sword Qi Slash（默认） | 伤害 170%，体力 105，冷却 6 + 5 秒 | 剑气飞 14 米 |
| 旋风斩 Whirlwind Slash | 每次命中 34.5%，体力 60，冷却 15 秒 | 五下 |
| 跳劈 Leap Slash | 伤害 123.5%，范围半径 3 米 | 扑 6.5 米，冷却 10 秒，体力 20 |
| 昂扬战吼 Spirited Battle Cry | 每 2 秒恢复已损失生命的 5% | 持续 10 秒，冷却 25 秒 |
| **银翎卫** 回马枪 Returning Spear（玩家默认） | 本作步战突刺伤害 ×1.12，冷却 10 秒，体力 18 | 侧撤后回身单刺，判定距离 3.05 米，可格挡、可打断 |
| 上步挥砍 Forward Slash | 伤害 244% | 上步 1.8 米，冷却 10 秒，体力 20 |
| 猪突猛进 Ferocious Charge（默认） | 两段：75%、90%；冷却 9 + 5 秒；体力 155 | 冲 7 米 |
| 枪花乱舞 Spear Dance | 每次 44%；释放时自身减速 10%；冷却 9 + 5 秒；体力 50 | 六下 |
| 千斤坠 Thousand-Pound Descend | 攻击半径 4.2 米；命中高速移动的目标后 7 秒内限速 | 伤害 150%，限到 2.2 米/秒，冷却 12 秒，体力 22 |
| **武射史** 扇形射击 Scatter Shot（默认） | 范围内 33%–210%；冷却 6 + 5 秒 | 五箭一扇，每人只吃一次，2 米内 210%、12 米外 33%，体力 20 |
| 飓风箭 Storm Arrow（默认） | 伤害 105%，冷却 15 秒，体力 90；公告说武射史的范围输出包括它 | 一箭贯穿，飞行路线 1.2 米内的人都中 |
| 后撤步 Back Step | 伤害 148% | 后跃 4 米放一箭，冷却 9 秒，体力 18 |
| 爆炸箭 Explosive Arrow | 命中与爆炸 110%，爆炸半径 3.5 米，体力 90 | 边缘伤害降到六成，冷却 12 秒 |
| 蛛网束缚 Web Shot | 命中 82.8%；网内持续减速 40% | 网半径 3.4 米、5 秒，冷却 14 秒，体力 18 |

公告里还有、本作没做的技能 · Skills in the notes not made here：羽林卫 中流砥柱、盾刺、剑盾连击、挑战；虎步 瞬杀、引爆、放血、自曝、破甲；陷阵营 狂暴怒吼、乱舞、拨挡攻击、上撩、沸腾战吼；银翎卫 狂怒战吼、后跳斩、横扫、上步突刺；武射史 锁链剑、剧毒箭、定点射击。

## 战技与怒气 · Weapon arts and rage

战技跟着武器走（原作里来自武器的锤锻属性），X 放主手的战技，Z 放副手（盾）的。每个战技面板上写着伤害、冷却和消耗的怒气。怒气在战斗中积累；本作的怒气条上限等于他最贵的那个战技的消耗，所以「怒气满了才能放」。 · A weapon art comes with the weapon (in the original, from its forging); X for the main hand, Z for the shield. Each card gives the damage, the cooldown and the rage spent. Rage builds in the fight; here the bar holds as much as his dearest art, so an art goes when the bar is full.

| 战技 · Art | 武器 · Weapon | 面板 · From the card | 谁用 · Who |
|---|---|---|---|
| 终结打击 Finishing Strike | 单手/利刃 | 向前攻击 361.3% 武器伤害；击杀时立刻刷新冷却、返还 10 怒气；冷却 16.0 秒，消耗 32.2 怒气 | 羽林卫、虎步（X） |
| 盾牌猛击 Shield Slam | 盾牌/轻盾 | 盾击 237.1% 武器伤害，击倒第 1 个命中的敌人；冷却 38.4 秒，消耗 35.0 怒气 | 羽林卫（Z） |
| 斧钺猛击 Axe Smash | 双手/斧钺 | 大力挥击总计 430.2% 武器伤害；冷却 16.2 秒，消耗 32.4 怒气 | 陷阵营（X） |
| 斧钺猛击 Axe Smash | 长杆/斧钺（方天戟通用） | 大力挥击总计 322.1% 武器伤害；冷却 17.3 秒，消耗 32.7 怒气 | 银翎卫步战（X） |
| 多重射击 Multi-Shot | 弓/短弓 | 快速拔出三支箭连射，总计最多 314.9% 穿刺伤害；冷却 17.7 秒，消耗 34.8 怒气 | 武射史（X） |
| 架枪 Couched Lance（马上战技） | 长杆/利刃（方天戟马上也能用） | 骑乘、马跑起来时架枪，命中 125% 武器伤害；击杀时立刻重置冷却、返还 5 怒气；冷却 9.6 秒，**不耗怒气** | 银翎卫马上（X） |

- 面板上的「被招架或格挡时造成 5 倍耐久消耗」本作没有做：本作没有兵器耐久。 · The cards' "five times the durability loss when parried or blocked" is not made: there is no durability here.
- 架枪：玩家攻略说距离比普通刺短、敌人在马右侧最好打、枪尖指向马头右前方约两点钟；本作的架枪就指向马头右前方 60°，距离 2.9 米（马上突刺 3.5 米），架住 3.2 秒（本作）。 · The couched ji points 60° to the right of the horse's head and reaches 2.9 m, shorter than the 3.5 m thrust, as a player's guide describes; it is held for 3.2 s (demo).
- 怒气怎么涨（本作）：命中 +3.5，挨打 +2.5，格挡 +1.5，弹刀 +4，破对方防 +3，射中 +3。 · How rage builds (demo): landing +3.5, taking +2.5, guarding +1.5, deflecting +4, breaking a guard +3, an arrow +3.

## 天赋（最多四个）· Talents (up to four)

只收公告写明了效果的天赋。 · Only talents whose effect the notes state.

| 营 · Regiment | 天赋 · Talent | 公告 · From the notes |
|---|---|---|
| 羽林卫 | 强化威慑 Heightened Deterrence | 每次成功格挡，额外扣除敌人 8 点体力（本作换算成 2） |
| 虎步 | 万人敌 Solo Fighter | 暴击伤害 +25% |
| 虎步 | 命悬一线 Lingering Life | 生命低于 50% 时，抗暴击 12%（本作：对他暴击的几率 −12%） |
| 陷阵营 | 克制重甲 Heavy Armour Counter | 伤害 +20%（本作按名字理解为打重甲时） |
| 银翎卫 | 金戈铁马 Cavalry | 骑乘时受到的伤害 −12% |
| 银翎卫 | 人马合一 Centaur | 骑乘时造成的伤害 +8% |
| 银翎卫 | 装备精良 Well-Equipped | 暴击伤害 +12%，骑乘时不生效 |
| 银翎卫 | 龙精虎猛 Full Vigour | 生命高于 85% 时受到的伤害 −45% |
| 银翎卫 | 重甲克星 Heavy Armor Nemesis | 击中重甲伤害 +10%，骑乘时也生效 |

公告里有名字、但效果没写全的天赋暂不收录：羽林卫 格挡专家；虎步 金蝉脱壳、身轻如燕、轻身逐风；银翎卫 暖衣饱食、身手敏捷、剑戟森森、盛食厉兵；武射史 致命感知、下马威、乘人之危、快速拉弓、穿透攻击。 · Talents named in the notes without their full effect are left out.

## 手感 · How it handles

按键沿用原作 PC 版：WASD 移动，左 Shift 冲刺，空格跳，左键攻击、右键格挡，F 踢，**X 战技、Z 盾牌战技，R、T 职业技能**，B 切换单击/连击，1–0 物品栏（1、2 兵器，3 绷带），E 上马/下马，U 召唤战马，V 切换第一/第三人称，滚轮拉近拉远，Tab 隐藏界面，Ctrl+H 按键提示，Esc 菜单；小键盘 8 2 4 6（及四角）直接朝对应方向出手。鼠标中键可以把镜头锁在对手身上。

The keys follow the original's PC layout: WASD, left Shift to sprint, Space to jump, left button to attack and right to guard, F to kick, **X the weapon art and Z the shield's, R and T the profession skills**, B single or continuous attack, 1–0 the bar (1 and 2 weapons, 3 a bandage), E to get on or off the horse, U to call it, V for the view, the wheel for nearer or further, Tab to hide the panels, Ctrl+H key hints, Esc the menu; keypad 8 2 4 6 (and the corners) strike on that line. The middle button holds the camera on a foe.

- **刀路**：出手前鼠标最后往哪边动，就从哪边砍——左劈、右劈、上劈或突刺，准星上的四个刃口亮出当前刀路。设置里可换成「经典」：刀路轮流。原作是八个方向，本作做了四个。 · **Lines**: whichever way the mouse last moved; four lines here where the original has eight.
- **格挡**：按住右键举兵器，方向对上才算挡住，挡偏了只卸掉一半；盾牌挡住整个正面（头顶除外）。刚举起的 0.2 秒内接住是**弹刀**（招架）：不耗体力，对方踉跄。格挡耗的体力按对方这一下的武器伤害算，一下最多四成（本作）。 · **Guard**: only the right line holds; a shield takes the whole front but overhead. Caught in the first 0.2 s it is a deflection (a parry). A guard costs stamina by the blow's weapon damage, at most two fifths a blow (demo).
- **踢**：F，踢中正在格挡的人会破防（本作）。 · **Kick**: F breaks a held guard (demo).
- **重击**：按住左键蓄力，最高 1.6 倍（本作）。 · **Held blows**: up to 1.6 times (demo).
- **体力**：出手、冲刺、跳、被挡下都耗体力；见底时举不住兵器。 · **Stamina**: as before; with none left a guard cannot be held.
- **跳**：空格，朝移动方向一跃（没有无敌时间）。 · **Jump**: Space, a leap the way he is moving (no moment of immunity).
- **骑马（银翎卫）**：开局在马上，E 上下马（各约一秒），U 叫马。马上 WASD 驭马，越快转得越慢，Shift 疾驰耗马的体力。马上出手以挥砍为主，也有突刺，用的是方天戟自己的伤害（面板骑乘效果 100%），马越快越疼。X 架枪要马跑起来。马上不能踢、不能跳、不能放职业技能。砍在骑手身上的伤害人和马各担一半（原作按真实碰撞分人和马，本作没有分部位碰撞，取各半）；马被砍倒或被蛮牛冲击撞中，人落马倒地 1.6 秒（本作）。 · **Riding**: blows from the saddle are mostly cuts, with thrusts, at the ji's own damage (its card says mounted effect 100%), harder at speed; X couches it once the horse is running. A blow on a rider is shared evenly with the horse (the original sorts man and horse by real hits; there are no hit boxes here). A horse cut down, or a Bull Charge, unhorses him for 1.6 s (demo).
- **绷带**：3，一秒半包好，回两成生命，一场两卷（本作）。 · **Bandage**: 3, a second and a half, a fifth of his health back, two a fight (demo).

## 一局怎么走 · How a run goes

1. 选营：五个人站在营寨里，转着看兵器、护甲和生命。 · Choose a regiment.
2. 配技能：本营技能里挑两个，天赋最多四个（有默认搭配）；同页列出这一营的战技。 · Fit two skills and up to four talents; the weapon arts are shown on the same page.
3. 征途：四场单挑，对手按电脑对电脑的胜率从易到难：虎步、武射史、陷阵营、银翎卫、羽林卫（除去自己）。每场赢了满血进下一场。 · The road: four duels, the foes ordered by how often each wins against the computer.
4. 终局：王城宫前以一敌二；独战两人时伤害 ×1.5、受伤 ×0.5，对手生命六成五（本作的难度设定）。 · The last fight: two at once (lone fighter ×1.5 dealt and ×0.5 taken, foes at 65% health — demo settings).
5. 结算：用时（一分钟以上才扣分）、剩余生命、弹刀、破防、被击中次数，按甲乙丙丁评等。 · The tally, marked 甲 乙 丙 丁.
6. 自由对决：任选自己和对手（一人或两人）、任选场景。 · Free duel.

## 场景 · Places

| 场景 · Place | 时间 · Light | 要点 · What makes it |
|---|---|---|
| 县城校场 · County drill ground | 正午 · noon | 边关营寨：带垛口的夯土城墙、城门楼、木寨门、营帐、箭楼、篝火、马厩、粮车、兵器架、战鼓、草靶、拒马 · a frontier camp |
| 桃林溪畔 · Peach grove by the stream | 午后 · afternoon | 桃树、落花、茅草土屋、篱笆、马厩、石桥 · peach trees, thatched houses, a bridge |
| 竹林古道 · Bamboo path | 薄雾 · mist | 竹海、石板路、亭子、茅屋 · bamboo, a flagstone path, a pavilion |
| 雪原关隘 · Snowy pass | 阴天飘雪 · snowing | 关城：城墙与寨门、烽火台、箭楼、投石车、床弩、拒马、木栅、营帐 · a pass fort |
| 王城宫前 · Before the palace | 黄昏 · dusk | 宫门、石狮、铜鼎、火盆、长旗、床弩 · palace gate, lions, braziers |

## 画面 · The picture

- 3D：引擎的 world3d（默认 WebGL 2，`?backend=webgpu` 用 WebGPU）；基于物理的材质、太阳阴影、环境光遮蔽、泛光、ACES 色调映射、高度雾、每个场景单独调色。 · 3D through the engine's world3d with PBR, shadows, AO, bloom, ACES, fog and a grade per place.
- 人物、战马、物件用 Tripo 生成；兵器（包括方天戟和双手长斧）用代码按尺寸建模。 · Men, horse and props generated with Tripo; the weapons, the fangtian ji and the long axe among them, modelled in code.
- 动作：移动是动作捕捉，出手、格挡、技能、战技、架枪是按兵器写的姿态加反向动力学；战马的走、小跑、疾驰按落蹄顺序用代码驱动。 · Movement is motion capture; blows, guards, skills, arts and the couched ji are poses with IK; the horse's gaits are driven in code.
- 界面按原作 PC 版的布局：顶上罗盘，对手头顶名牌和血条，左下自己的生命、体力和数值，底部 1–0 物品栏，旁边 R、T 职业技能和 X（以及羽林卫的 Z）战技，战技下面是怒气条，怒气够了战技框发亮；右下单击/连击和视角，右侧按键提示。 · The panels follow the original's PC layout; under each art a rage bar, the art lit when it can go.

## 对手 · The opponents

每个营有自己的打法：羽林卫举盾逼近、等你出手再反击，盾击把人撞倒；虎步跑得快、贴身连斩、放毒；陷阵营抡长斧、下劈和剑气斩；银翎卫骑马一趟趟冲过来，掠过时挥砍，怒气够了就让你在马的右侧、架枪冲过来，马快不行了就下马步战；武射史拉开距离放箭，被贴身就近身扇形射击。电脑会读你的刀路（有反应时间，越往后越快）、会假动作、会踢你的格挡、体力低时退开回气；被蛮牛冲击撞得不能攻防时会先跑开。一打二时两人轮流上前，另一个绕侧或放箭。

Each regiment fights its own way: the Imperial Guard comes on behind his shield, answers your blows and knocks you down with it; the Tiger Step is quick, cuts in bursts and poisons; the Berserker Battalion swings the long axe; the Silver Wing Guard rides at you in passes, cutting as he goes by, and with his rage full couches the ji with you on the horse's right; the Archer keeps away and shoots, and close in uses the spread shot. They read your line of cut, feint, kick a held guard, back off to breathe, and run while dazed by a Bull Charge. Two at once take turns.
