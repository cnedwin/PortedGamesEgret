# 五年代开局平衡 · Opening balance

本轮检查的是开局是否存在必然的钱粮陷阱，以及弱势力是否有合理的准备空间。保留各年代的强弱差异，不把每家势力调成同一种局面。战斗伤害公式、普通历史局的城属、起始钱粮和存档版本均未因此改动。

This pass checks opening fiscal traps and preparation opportunities while keeping each era's identity. It does not make every faction equally strong. Combat damage formulas, ordinary historical ownership, starting treasuries and the save version are unchanged.

## 方法 · Method

- 正常难度，种子 `7, 19, 43`，每局推进720个游戏日（两年）。检查32种开局：184五位主公各自的演义及孔融自由局，后续各年代的强弱势力，以及五年代的1人／4人自建队伍。改前和改后各192条。
- `idle` 不作玩家军令；`basic` 每月最多一项首府建设，保留800钱；两者都不主动征兵、扩张或赠礼。剧情选择首个可用选项，其余阻塞通知略过，战斗用原有自动结算。
- 另用 `prepared` 检查自建势力：每月最多募2000人，将首府守军补至12000；粮秣须有八个月余量，建设保留2000钱。仍不主动出征。各年代各两种队伍、三种子，合计30条；另外逐一比较200的八个候选城和208的三个空城。
- 记录首月收入／军俸、年化粮秣收支、初始军力、任职／在野人才、盟约、钱归零月份、饥荒、失城和覆灭。年化粮秣只是当前田地与守军的预算，不包含后续人口、营建和战争变化。

The deterministic study uses normal difficulty and three seeds over two in-game years. Its idle/basic policies make no offensive orders. A separate prepared policy recruits conservatively and builds defences. It records income, wages, food, officers, pacts and actual simulation outcomes. These are rule simulations, not renderer benchmarks or claims of human completion.

## 实施及结果 · Changes and results

| 项目 / Item | 改前 / Before | 改后 / After |
| --- | --- | --- |
| 208刘备，夏口一城 / Liu Bei at Xiakou | 39名在仕人物，月净钱−379 / 39 serving officers, −379 coin per month | 17名当前随从与家属，月净钱−49 / 17 opening followers/family, −49 per month |
| 同起点720日的钱 / Same opening after 720 days | 三种子闲置、建设两组均归零 / All six runs ended at zero coin | 闲置4313、建设1145；无归零月 / Idle 4,313, basic 1,145; no zero-coin months |
| 200自建默认，准备政策 / 200 custom default, prepared | 安定仅1/6存活；实际主要来犯为曹操 / Anding survived 1/6, chiefly threatened by Cao | 推荐巴西，6/6存活 / Recommended Baxi survived 6/6 |
| 208自建，修正人才后 / 208 custom starts after roster correction | 长沙准备组4/6；武陵未备兵组压力更高 / Changsha prepared 4/6; Wuling proved less forgiving without recruitment | 推荐零陵，准备组6/6；长沙与武陵仍可选 / Recommended Lingling prepared 6/6; all three remain selectable |
| 219架空苍梧，准备政策 / 219 alternate Cangwu, prepared | 2/6存活 / 2/6 survived | 与原领主撤离停战540日，6/6存活 / A 540-day withdrawal truce raised this to 6/6 |

208的修正针对一个明确来源：把未来蜀汉阵营直接当作208年任职，会使夏口预支整批后期官员的薪俸。保留刘备、关张赵、诸葛亮、糜氏、孙乾、简雍、刘琦及当时随从；秦宓、杨洪、王平等未来人才留在原籍在野，仍能寻访登用。219的人才布局保持原样。伊籍随刘表去世后南渡的背景可参考[《三国志》卷三十八](https://zh.wikisource.org/wiki/三國志/卷38)；本作也保留既有演义人物，并非逐人逐月的史学复原。

The 208 repair removes premature hiring of the later Shu court rather than granting free money. Later talent remains discoverable; the 219 roster is unchanged. It retains the game's existing historical and romance-inspired cast.

撤离停战仅用于新建的架空边城势力，与退回守军的原领主双向生效。其他势力仍可敌对；540日后正常到期，也可按外交规则提前毁约。原本就无主的城没有这项停战。旧存档不会追补条约。推荐起点只调整新局候选顺序，不删除安定、长沙等挑战选项，也不改普通历史局的地图。

The withdrawal truce applies only to a newly founded alternate-history town and its former owner. It expires or can be broken through ordinary diplomacy; third powers remain unrestricted. Naturally vacant towns receive no such truce, and existing saves receive no retroactive treaty. Recommendations only reorder new-game choices.

184五条演义、190普通开局、200普通开局及219普通开局，在相同输入下的两年资源与存亡指标保持不变。官渡仍是袁绍动员兵力较大（235910对曹操189000）；赤壁曹军仍超过孙刘合计四倍，孙刘起始盟约仍为540日。三种子中没有新出现的开局饥荒。

## 复跑 · Reproduce

从本目录运行。默认只打印汇总；需要JSON时，以 `--out=` 指定仓库外的目标文件。

Run from this directory. The tool prints summaries by default; use `--out=` with a path outside the repository to keep JSON evidence.

```sh
node tools/opening-balance.mjs --days=720 --seeds=7,19,43 --policies=idle,basic
node tools/opening-balance.mjs --case=custom --policies=prepared
node tools/opening-balance.mjs --case=200-custom --towns=all --policies=prepared
node tools/opening-balance.mjs --case=208-custom --towns=all --policies=idle,basic,prepared
node --test test/opening-balance.test.mjs
```

## 边界 · Limits

这是三个种子的开局诊断，不是胜率统计或通关保证。闲置或只建设、不备兵的弱势开局仍可能被攻破：例如184孔融与219辽东在六条闲置／建设样本中各仅两条存活。零陵带四人却不备兵，也有被攻破的样本。停战结束后仍需经营、部署或外交；维持12000守军会使小城的钱变得紧张。新手应看月收支，不宜把测试政策当作固定攻略。

Three seeds do not establish a population win rate or guarantee survival. Weak factions can still fall without military or diplomatic preparation. Large garrisons can exhaust a small town's cash. This pass does not cover full campaigns, all event choices, difficulty extremes, manual-combat skill or real-device performance.
