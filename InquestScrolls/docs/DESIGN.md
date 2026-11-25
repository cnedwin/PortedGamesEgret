# 洗冤笔录 · 设计与史料 · The Inquest Scrolls: design and sources

基于新白鹭引擎独立开发的宋代刑侦推理游戏 Demo。本文写玩法规则、谜题怎样保证“推得出、只有一个答案”、以及每一处宋代制度和检验手法的出处。

A Song-dynasty detective deduction game demo built independently on the new Egret engine. This document sets out the
rules, how each puzzle is made to have one answer that the evidence alone gives, and where every Song institution and
inquest method in the game comes from.

## 1. 玩法类型 · The kind of game

本作属于“定格现场推理”一类：玩家面对一幅停在案发瞬间的画面，自己看、自己想，从画里收集词语，再用这些词把一段段叙述补完整；游戏只负责核对，不替玩家推理。这一类作品口碑好，归纳起来有几条原因，本作逐条照着做：

- **推理是玩家自己做的。** 不选“下一句对话”，不点“指认凶手”，而是把“谁、在何处、用何物、做了何事、为何”一格一格填出来。填对的那一刻就是想通的那一刻。
- **证据全部摆在眼前。** 每个答案都能单凭画面和文书推出，不需要猜作者的心思；画面是“定格”的，不会错过。
- **核验给方向、不给答案。** 只说“全对”“错两处以内”“不实”，不说错在哪。玩家能据此缩小范围，却没法一格一格试出来：一页四到六个空、每空平均四五个同类候选，组合有几百到几千种。
- **词语分类上色。** 人、物、痕、由、处、情六类各有颜色，空位染成它要的那一类，减少无意义的乱试，把注意力留给真正的判断。
- **范围小而完整。** 每案一幅画、十来件证物、两三页卷宗，一两刻钟能想完；六案串成一条线，最后一案回头解释前五案。

This game belongs to the frozen-scene deduction kind: the player faces a picture stopped at the moment of the crime,
looks and thinks for themselves, gathers words from the picture and completes passages with them; the game only checks,
it does not reason for the player. Such games are well liked for a few reasons, and this one follows each:

- **The player does the deducing.** No choosing the next line, no "accuse" button: who, where, with what, did what and
  why are filled in blank by blank, and the moment a page is right is the moment it is understood.
- **All the evidence is in view.** Every answer follows from the picture and the documents alone; nothing has to be
  guessed from the author, and a frozen scene cannot be missed.
- **Checking points the way without giving answers.** "All right", "two or fewer wrong" and "not true" narrow the search
  but cannot be ground through: four to six blanks a page with four or five candidates each make hundreds to thousands
  of combinations.
- **Words come in coloured kinds.** Person, thing, mark, cause, place and motive each have a colour, and a blank takes
  the colour of the kind it wants, so trying is spent on real choices.
- **Small and whole.** One picture, about ten pieces of evidence and two or three pages a case; six cases form one line,
  and the last one explains the five before it.

## 2. 规则 · Rules

规则全部在 `src/sim/`，不碰页面也不碰引擎，在 Node 里测试。 · All rules live in `src/sim/`, free of the page and the engine, and are tested in Node.

| 规则 · Rule | 内容 · What it does | 代码 · Code |
|---|---|---|
| 词的六类 · Six kinds | 人（朱红）、物（石青）、痕（赭）、由（石绿）、处（藤黄）、情（紫） · person, thing, mark, cause, place, motive, each with its colour | `kinds.mjs` |
| 看证物 · Looking | 点开过的证物才能收它的词；带下划线的字一点即收 · words can be collected only from evidence that has been opened | `rules.mjs` `seeSpot` `collect` |
| 填空 · Filling | 只接受同类、已收的词；盖印的页锁定；点已填的空清掉它 · a blank takes only a collected word of its kind; a sealed page is locked | `placeWord` |
| 核验 · Checking | 一页填满才能核验：全对盖印；错 1–2 处只说“尚有两处以内不实”；错更多只说“不实” · a full page only: all right seals it; one or two wrong says only that; more says only "not true" | `checkPage`（`NEAR = 2`） |
| 提示 · Hints | 对准第一个空着的空，连要三次逐级加深：1 指出该看的区域（现场里亮起证物），2 说出相关证物的名字，3 问一个引向答案的问题；永远不说答案 · aimed at the first empty blank: 1 lights the area, 2 names the evidence, 3 asks a question; never the answer | `nextHint`（`HINT_LEVELS = 3`） |
| 结案 · Closing | 所有页盖印即结案，下一案解锁；最后一案还要写判词 · all pages sealed closes the case and opens the next; the last also needs the verdict | `pagesDone` `unlocked` |
| 判词 · Verdict | 主使、同谋、罪名三栏亲手写；名字栏写对一种写法（陆承恩 / 承恩 / Lu Cheng'en…）且不夹带别人的名字才算；罪名分三组要点（伪造会子 / 杀人灭口 / 格目不实），写中两组即可；忽略大小写、空格和标点；只回答“成立 / 不成立” · three fields written by hand; a name counts in any accepted spelling and only if no other person is named with it; two of three groups of charges; case, spaces and punctuation ignored; only "holds" or "does not" | `judgeVerdict` |
| 笔录与存档 · Notes and save | 每案的进度、看过的证物、词囊、已填的空、盖印、提示次数、笔录和判词随时写入存档，退出后接着玩；坏档另存后重开 · everything of each case is saved as it changes; a broken save is set aside | `saves.mjs` |

## 3. 谜题的数据与审计 · Puzzle data and the audit

每个词带着它的事实，每条事实注明是哪件证物说出来的；每个空写明它要求哪些事实。例如第一案：

Each word carries its facts, each naming the evidence that shows it; each blank names the facts it needs. From the first
case:

```js
// 词：事实的值，后面是说出这条事实的证物 · a word: each fact's value, then the evidence that shows it
rope: { kind: 'thing', zh: '麻绳', en: 'hemp rope', is: { ligature: ['yes', 'rope'], width: ['finger', 'rope'] } },
sash: { kind: 'thing', zh: '青布腰带', en: 'blue sash', is: { ligature: ['yes', 'vat'], width: ['cun', 'vat'] } },
// 卷宗：凶手用{{b2}}从背后把他勒死 · the dossier: the killer strangled him from behind with {{b2}}
b2: { answer: 'sash', needs: { ligature: 'yes', width: 'cun' }, why: { zh: '勒痕阔一寸。哪样东西勒得出这么宽的痕？', … } }
```

麻绳也能勒人，但它只有一指宽（麻绳那件证物说的），勒不出尸身上一寸阔的痕；青布腰带沉在纸槽底，阔一寸。提示的第三级就是这里的 `why`。

The rope could strangle too, but it is a finger wide (its own card says so) and cannot leave the inch-wide mark on the
body; the sash, sunk in the pulp trough, is an inch wide. The third level of a hint is this `why`.

`src/sim/audit.mjs` 逐案检查，`test/cases.test.mjs` 在 Node 里跑，中英两套案卷分别跑一遍：

`src/sim/audit.mjs` checks every case, run in Node by `test/cases.test.mjs`, once for each language:

1. **可解 · Solvable**：每个空的答案满足它的全部要求，每条要求都有证物为据，而且那件证物里真能收到这个词。 · each answer meets every need, each backed by evidence from which the word can be collected.
2. **唯一 · One answer**：同类的每个其他词至少有一条要求与之相反，这条相反的事实也有证物为据——玩家能凭证据把它排除。 · every other word of the kind fails a need, and that too is backed by evidence, so the player can rule it out.
3. **无两可 · No word fits two blanks**：同一案里没有一个词能同时满足两个答案不同的空。 · no word meets two blanks with different answers.
4. **两种文字各自完整 · Both languages whole**：每个空在中英文卷宗里各出现一次，每个词在两种文字里都能收到，同类词的名字不重复。 · each blank once in each language, each word collectible in each, no two names alike.

测试还把案卷故意改坏（换掉一个答案、删掉一条证据），确认审计能抓出来。 · The tests also break a case on purpose and see the audit catch it.

| 案 · Case | 证物 · Evidence | 页 · Pages | 空 · Blanks | 词 · Words | 干扰词 · Words never an answer | 每空同类候选（最少 / 平均） · Candidates per blank (min / mean) |
|---|---|---|---|---|---|---|
| 纸坊悬梁 · The Beam at the Paper Mill | 10 | 2 | 8 | 14 | 7 | 3 / 5.4 |
| 渡口浮尸 · The Body at the Ferry | 10 | 3 | 13 | 17 | 5 | 2 / 4.2 |
| 质库茶毒 · Tea at the Pawnshop | 11 | 3 | 15 | 18 | 6 | 2 / 4.5 |
| 刻坊夜火 · Fire at the Engraver's | 12 | 3 | 13 | 19 | 7 | 2 / 4.6 |
| 镰刀聚蝇 · Flies on the Sickle | 11 | 3 | 15 | 15 | 1 | 2 / 4.5 |
| 县尉书房 · The Sheriff's Study | 11 | 3 | 13 | 19 | 7 | 2 / 4.4 |

“干扰词”是从来不是答案的词；此外每个答案词对其他同类空也是干扰。第一案是教学：页少、空少、候选多但一眼可辨；之后每案三页、十三到十五个空，第五案几乎每个词都要用上，第六案的干扰词最多，并且要回头用前五案的线索。 · Besides the words that are never an answer, every answer is a distractor for the other blanks of its kind. The first case teaches; from the second on each case has three pages and thirteen to fifteen blanks; the fifth uses almost every word; the sixth has the most distractors and calls back to the first five.

## 4. 六案 · The six cases

一桩大案：县城质库主陆承恩私印会子（南宋的纸币），押司冯禄替他改格目、抹痕迹；县尉韦衡在格目上签押。前五案里死去的，都是撞见了暗纹纸、重号会子、会子铜版或格目破绽的人。第六案韦衡真是自缢，认罪书却是冯禄写的。

One case behind the six: Lu Cheng'en, owner of the town's pawnshop, prints paper money (*huizi*) in secret; Feng Lu, the
clerk, rewrites the inquest forms and covers the traces; Sheriff Wei Heng signs the forms. Everyone who died in the
first five cases had seen the marked paper, the repeated note numbers, the note plates or a flaw in the forms. In the
sixth, Wei Heng truly hanged himself, but his confession was written by Feng Lu.

| 案 · Case | 初检之说 · The first finding | 覆检之实 · What the second inquest shows | 元凶 · Who did it |
|---|---|---|---|
| 一 纸坊悬梁 | 纸工阿满自缢 · the paper-maker hanged himself | 项下两道痕：一道平绕交于项后、有血荫（勒），一道斜起耳后、色白无血荫（死后吊）；死者右手指甲里有带血皮屑，工头手背有抓痕 · two marks: a level one crossing at the nape, bruised (strangled), and a pale one rising behind the ears (hung after death); bloody skin under the nails, scratches on the foreman's hand | 工头孙大，用青布腰带 · the foreman Sun Da, with his blue cloth sash |
| 二 渡口浮尸 | 艄公老何醉酒落水 · the ferryman drank and fell in | 肚腹不胀，口鼻无水沫，指甲无沙泥：死后入水；脑后方寸他物伤 · no swelling, no froth, no sand under the nails: dead before the water; a square blunt wound behind the head | 钱五，用秤砣 · Qian Wu, with a steelyard weight |
| 三 质库茶毒 | 管账吴伯谦心痛暴卒 · the bookkeeper died of a seizure | 银钗皂角水洗过探喉，青黑，再洗不去：中毒；毒在黑盏不在汤瓶；袖中私账记着重号会子 · the washed silver pin turns blue-black and stays so: poison, in the black bowl, not the ewer; his ledger records repeated note numbers | 郑七，用信石 · Zheng Qi, with arsenic |
| 四 刻坊夜火 | 刻工葛三失火烧死 · the engraver burned in a fire | 口鼻无烟灰：火起时已死；心口刃伤、掌心挡刀伤 · no ash in mouth or nose: dead before the fire; a stab to the heart, a cut palm | 杜明远行刺，另有穿青色公服者取走铜版 · Du Mingyuan stabbed him; a man in a clerk's blue took the plates |
| 五 镰刀聚蝇 | 沈砚亲临初检 · Shen Yan's own inquest | 十几处镰刀斫伤、钱袋未动：寻仇不是劫财；全村镰刀摆在日头下，蝇集一把，柄刻三道横；包会子的是一张空白格目 · a dozen sickle cuts and the purse untouched: revenge; flies gather on one sickle marked with three bars; the notes are wrapped in a blank inquest form | 屠二，受新会子买凶 · Tu Er, paid in new notes |
| 六 县尉书房 | 县尉韦衡畏罪自缢 · the sheriff hanged himself in guilt | 痕起耳后、八字不交，舌抵齿：真自缢；认罪书墨迹未干而他的砚台是干的、指上无墨，冯禄指上有新墨；火盆里残信写着陆承恩 · a mark rising behind the ears, not crossing: truly hanged; the confession is wet, his inkstone dry and his fingers clean, Feng Lu's inked; the half-burned letter names Lu Cheng'en | 判词：主使陆承恩、同谋冯禄 · the verdict: Lu Cheng'en behind it, Feng Lu with him |

## 5. 史料 · Sources

验尸手法依宋慈《洗冤集录》（1247）。原文取自维基文库所录本（[卷一](https://zh.wikisource.org/wiki/%E6%B4%97%E5%86%A4%E9%9B%86%E9%8C%84/%E5%8D%B71)至卷五），下面引的都是原句。检验文书与制度另据《宋史·刑法志二》（[卷二百](https://zh.wikisource.org/wiki/%E5%AE%8B%E5%8F%B2/%E5%8D%B7200)）。

The inquest methods follow Song Ci's *Collected Cases of Injustice Rectified* (洗冤集录, 1247), quoted from the
Wikisource text (scrolls 1 to 5); the forms and the procedure also follow the *History of Song*, treatise on law, part 2
(scroll 200). The lines below are the sources' own words.

| 游戏里 · In the game | 原文 · The source | 出处 · Where |
|---|---|---|
| 勒死与自缢之别：项下绳索交过、指甲抓损；自缢则脑后分八字、索子不交（第一、六案） · strangling against hanging (cases 1 and 6) | “若被人勒死，項下繩索交過，手指甲或抓損；若自縊，即腦後分八字，索子不交” | 《洗冤集录》卷一 · 檢覆總說；卷三 · 十九自縊、二十被打勒死假作自縊 |
| 死后吊起、死后推入水，都是伪作（第一、二案） · hung or thrown in after death (cases 1 and 2) | “亦有死後用繩吊起，假作生前自縊者；亦有死後推在水中，假作自投水者” | 卷二 · 疑難雜說下 |
| 生前落水：腹胀、指甲内有沙泥（第二案反过来用） · drowned alive: swelling, sand under the nails (case 2, by its absence) | “落水時尚活，其屍腹肚膨脹，十指甲内有沙泥” | 卷一 · 疑難雜說上 |
| 银钗验毒，皂角水洗不去（第三案） · the silver pin and soap-pod water (case 3) | “若驗服毒，用銀釵，皂角水揩洗過，探入死人喉内，以紙密封，良久取出，作青黑色，再用皂角水揩洗，其色不去” | 卷四 · 二十八服毒 |
| 砒霜中毒，十指甲青黑（第三案） · arsenic and dark nails (case 3) | “砒霜、野葛毒……十指甲青黑” | 卷四 · 二十八服毒 |
| 生前烧死口鼻有烟灰，死后焚尸则无（第四案） · ash in the mouth only if alive in the fire (case 4) | “凡生前被火燒死者，其屍口、鼻内有煙灰”；“口内即無煙灰” | 卷四 · 二十六火死 |
| 镰刀聚蝇（第五案的手法，案情另写） · the sickles and the flies (case 5's method; the case itself is new) | “居民賫到鎌刀七八十張，令布列地上” | 卷二 · 疑難雜說下 |
| 验尸先用酒醋、红油伞（序言里老秦的行头） · wine, vinegar and the red oiled umbrella (the prologue) | “先使酒醋蘸紙……澆上酒醋”；“將紅油傘遮屍骨驗” | 卷一 · 檢覆總說上；卷三 · 論沿身骨脉及要害去處 |
| 县尉初检，邻县覆检（白蘋县的格目都是县尉签押） · the sheriff holds the first inquest, a near county the second | “縣差尉，縣尉闕即以次差簿、丞……若過十里或驗本縣囚，牒最近縣” | 卷一 · 條令 |
| 检验格目由提刑司印造，一式三纸，千字文编号，一份申提刑司（提刑因此能翻出格目；第五案空白格目的“盈字第三十号”） · the forms printed by the circuit's judicial office, three sheets numbered by the Thousand Character Text, one sent to the intendant | “諸初、覆檢屍格目，提點刑獄司依式印造。每副初、覆各三紙，以《千字文》為號鑿定，給下州縣……一申州縣，一付被害之家……一具日時字号入急遞，徑申本司點檢” | 卷一 · 條令 |
| 检验格目始于淳熙初 · the inquest form from the 1170s | “淳熙初，浙西提刑鄭興裔上檢驗格目，詔頒之諸路提刑司。凡檢覆必給三本” | 《宋史》卷二百 · 刑法二 |
| 正背人形图，伤处朱红画出（证物卡里的白描人形图和朱红伤痕） · the front and back body chart, wounds drawn in red (the body cards) | “江西提刑徐似道言……乞以湖南正背人形隨格目給下，令於傷損去處，依樣朱紅書畫，唱喝傷痕，眾無異詞，然後署押。詔從之，頒之天下”（嘉定四年） | 《宋史》卷二百 · 刑法二 |
| 伪造会子是重罪（判词的罪名） · forging paper money was a capital crime (the verdict) | 理宗慮囚，“偽造符印、會子……”不在減降之列 | 《宋史》卷二百 · 刑法二 |

**哪些是虚构的 · What is invented.** 人物（沈砚、老秦、韦衡、冯禄、陆承恩等）、地名（沅湘路、蘅州、白蘋县、桑田乡）和六桩案情都是原创，不用宋慈等真实人物。提点刑狱司、县尉、押司、仵作、检验格目、会子是宋代实有的官职、文书和钱钞；“淳祐年间”只作时代背景。 · The people, the places and the six cases are made up; no real person such as Song Ci appears. The offices, the forms and the paper money are real Song institutions; the Chunyou years only set the time.

## 6. 画面与声音 · Picture and sound

- 每案一张 3840×1440 的长卷背景（远景、中景），人物和可交互器物各是透明底的单独图层，按场景表 `src/view/scenes.mjs` 摆放；镜头拖动时三层有轻微视差，灯焰、水纹、烟、蝇、尘、雨等环境动态由代码画，人物定格不动。 · A 3840 × 1440 handscroll background a case, with each figure and thing on its own transparent layer, placed by `src/view/scenes.mjs`; slight parallax between layers, flames, water, smoke, flies, dust and rain drawn in code, the figures frozen.
- 卷轴、宣纸、朱印、词签、字盘全部由引擎绘制（图形、文字标签、CanvasKit 段落），不用 HTML 覆盖层；只有输入判词和笔录时由引擎的文本输入在原处放一个平台文本框。 · Scrolls, paper, seals, slips and the board are drawn by the engine; only while typing the verdict or the notes does the engine's text input put a platform field in place.
- 配乐用代码合成的古琴（拨弦衰减）、洞箫（带气声的正弦）、编钟（非谐泛音）、木鱼和低音持续音，D 宫五声音阶，四段：标题、现场、结案、终卷；音效有翻卷、落印、毛笔书写、拖词落位、核验正确与错误、提示、收词。 · Music synthesized in code from a plucked qin, a breathy xiao, inharmonic bells, a woodblock and a drone, in the D *gong* pentatonic mode, four pieces; effects for paper, the seal, the brush, a word placed, right and wrong, the hint and a word collected.
- 图片的提示词与来源见 [ASSETS.md](ASSETS.md)。 · The prompt and origin of every picture are in ASSETS.md.
