import { parsePairs } from './locale-data.mjs';

// Narration generated from live state still uses its original content in saves.
// These clause translations preserve changing names, dates, quantities and reasons.
export const RUNTIME_TERMS = parsePairs(`
载入失败|Load failed
承和|Chenghe
夜|Night
晨|Dawn
上午|Morning
正午|Noon
午后|Afternoon
黄昏|Dusk
子丑寅卯辰巳午未申酉戌亥|Traditional hours
时|watch
粮草告急|Grain reserves low
银两不足发薪|Not enough silver for wages
有人心生去意|Some disciples may leave
有客求见|Applicants waiting
山门安定|The seat is stable
闭关悟|Meditate on
铸造|Forge
织造|Weave
闲着|Idle
可晋升|Can promote
想走|Wants to leave
带伤|Injured
本门绝学|Exclusive sect art
可授|Teachable
抄本|Manual
入门功夫|Foundational art
秒|sec
以|using
背袭|Rear attack
侧击|Flank attack
重创|Critical hit
击中|Hits
，伤|, damage
倒下|Falls
脱离战场|Leaves the battlefield
一声号令，|orders a rally:
守方|Defenders
攻方|Attackers
士气大振|Morale rises
历时|Duration
战殁：|Casualties:
无人战殁。|No fatalities.
守住了山门。|The seat was successfully defended.
击退来敌，但掌门战殁、无人继任，山门失守。|The attack was repelled, but the leader fell without a successor and the seat was lost.
首战失利，众人退守内院，仍持有|The first defence failed. The disciples fell back to the inner court and retained
损失银两|Silver lost:
、粮草|, grain:
他派仍可能来犯，可趁机整备守军或改善邻派关系。|Other sects may attack again. Prepare the garrison or improve relations.
据点失守。|Stronghold lost.
攻打|Attack
得胜，据点易主。|Victory; captured the stronghold.
败退。|Defeated; withdrew.
对|against
胜，威望有增。|won and earned renown.
负，带伤下台。|lost and left injured.
胜|Victory
晋级下一轮。|advances to the next round.
夺得魁首！|wins the championship!
不敌|lost to
，止步|; eliminated in
无法保存，请导出存档文件。|Could not save. Please export a save file.
存档无法读取。原档已保留。|Could not read the save. The original has been preserved.
改动|changes
处，新增事件|entries and
条|events
这个文件不是可用的数据包。|This file is not a valid data package.
已读入存档。|Save imported.
战事未了。|The battle is still in progress.
此处尚未开放。|This feature is not unlocked.
请为门派和掌门定下名号。|Choose a name for your sect and leader.
已读取存档。|Save loaded.
进度已存入卷宗|Progress saved to slot
这块地已被占用或不可建造。|This plot is occupied or unsuitable.
建筑|Building
已建成。|construction complete.
扩建完成。|Expansion complete.
收入门墙。|Disciple accepted.
已改派差事。|Task assigned.
已为|Assigned
名弟子改派差事。|disciples new tasks.
次序已定。|Move sequence set.
已交还本人安排。|Disciple will arrange their own moves.
已晋升。|Promoted.
已拜师。|Apprenticeship accepted.
已启程。|Departed.
已入藏经阁。|added to the library.
送来|delivered
抄本。|a manual.
已开始修练。|began training.
分舵已立。|Branch founded.
已向|Gift sent to
馈赠。|successfully.
已成。|completed.
下一件：|Next objective:
店铺开张了。|Shop opened.
银两散出，本派声名更著。|Charity has increased the sect’s renown.
新兵器与护具已送到。|New weapons and armour delivered.
已将|Gifted
赐予|to
服下了|used
炼成一颗|Brewed one
经脉已通。|Meridian opened.
新武学已录入本派名录。|New art registered in the sect's catalogue.
秘笈已藏入阁中。|Manual added to the library.
人已安插进去。|Spy successfully embedded.
江湖路远，各位保重。|The realm is vast. Take care on your journey.
众弟子听令，随我上！|Disciples, heed my command and follow me!
人晋升：|promotions:
等|and others
眼下无人可晋升。|No one is eligible for promotion.
人安排差事。|people assigned tasks.
各人差事未动。|Assignments unchanged.
各项事务已全部开放。|All features unlocked.
已还原。|Original data restored.
已设定。|Applied.
没有这种物品。|Unknown item.
已迁建。|Building relocated.
此处专精改为|Specialty changed to
已任命。|Appointed.
门规改为|House rules changed to
确定开始新局？|Start a new game?
保存当前进度并返回标题？|Save current progress and return to title?
确定撤退？|Retreat?
还原修改器打开前的状态？|Restore the state before the editor was opened?
清除当前数据包？|Remove the active data package?
覆盖此存档？|Overwrite this save?
立足期将尽|Opening truce ending
日。届时他派可能来攻。先检查本地守军、山门和库存，或去江湖改善邻派关系。|days. Other sects may attack when it ends. Review your local garrison, gate and reserves, or improve relations.
天下据点尽归本派，一统江湖！|All strongholds belong to your sect. The realm is united!
武林大会推举你为盟主，号令天下，莫敢不从。|The Summit elected you its leader. The martial realm acknowledges your command.
本门已不复存在。江湖路远，后会有期。|Your sect is no more. Farewell until our paths meet again.
终局|End
功成|Victory
春|Spring
夏|Summer
秋|Autumn
冬|Winter
除名|Destroyed
武林大会|Martial Summit
克城|Captured
失地|Territory lost
正在展开画卷|Unrolling the scroll…
当前浏览器无法永久保存，请导出存档。|This browser cannot save permanently. Export your save.
承和元年，|In the first Chenghe year,
立派于|founded the sect at
查无此人|Person not found
没有这门武学|Unknown art
没有这种建筑|Unknown building
不是本派据点|Not a stronghold of this sect
需先建正殿|Build a main hall first
正殿与山门有固定位置|Main hall and gate have fixed locations
这块地已被占用或不可建造|This plot is occupied or unsuitable
建地不足|Insufficient building space
没有这座建筑|Building not found
已是最高等级|Maximum level reached
生产经验不足|Insufficient production experience
此人已离去|This person has departed
需掌门亲至面试|Leader must be present to interview
厢房已满|Dormitories are full
拜入|joined
门下|as a disciple
需忠诚五十、一门武学三重|Requires 50 loyalty and mastery 3 in one art
需十级、二阶武学五重|Requires level 10 and mastery 5 in a tier-2 art
需二十级并已拜师|Requires level 20 and an apprenticeship
亲传名额已满|No direct-disciple positions available
需三十级|Requires level 30
长老之位已满|No elder positions available
席|seats
已是长老|Already an elder
晋为|promoted to
师父须是本门长老或掌门|Teacher must be an elder or sect leader
拜|apprenticed to
为师|as teacher
无法任命|Cannot appoint
只能调往本派据点|Can only transfer to our own strongholds
此地已有主|This place already has an owner
需与本派据点相邻|Requires adjacency to a friendly stronghold
无可攻之敌|No eligible opponents
开局休战期内，本门暂不受该派攻打|The opening truce still protects our sect against this opponent
无人出战|No available fighters
本门向|Our sect attacks
出兵，该派与本门提前结束开局休战。|, ending the opening truce early.
非本派据点|Not held by our sect
此地店铺已满|Shop limit reached here
退守内院，仍守住|Fell back to the inner court and retained
随军攻下|marched to capture
攻下|captured
得秘笈|gained a secret manual
击退|repelled
战殁。|fell in battle.
继任|succeeded as
就此除名江湖。|was eliminated from the realm.
闭关|Seclusion
日，悟出|days, attained
日归来|days later returned
人满为患|Overcrowding
遣散了|dismissed
不辞而别。|departed without notice.
寿终。|died of old age.
武林大会推举|The Summit elected
为盟主。|as its leader.
残部在|Surviving members at
重立山门。|re-established the sect.
初窥门径|learned the fundamentals
已可授徒|can now teach
功行圆满|mastered the art
已是可造之材|a promising disciple
堪为亲传|worthy of direct discipleship
足以开坛授业|able to teach others
当世少有敌手|few rivals remain
已臻化境|has reached perfection
将|brought
练到|to mastery
三重|3
六重|6
十重|10
修为到了|cultivation reached
废寝忘食|Training Without Rest
练功过了头，手上磨出血泡仍不肯歇，教头来请掌门示下。|has trained to exhaustion and will not rest despite blistered hands. The instructor asks for your decision.
命其歇息三日|Order three days of rest
伤势尽愈|Wounds fully healed
被按着歇了三日，嘴上不说，心里是暖的。|rested for three days and inwardly appreciated your concern.
由他去|Let them continue
经验|Experience
带些轻伤|minor injuries
咬牙练了下去，功夫又深了一层。|persevered and deepened their skill.
偷懒被抓|Caught Slacking
练功时靠着兵器架打瞌睡，被教头抓了个正着。|was caught dozing against the weapon rack during practice.
罚扫山门三日|Assign three days of sweeping
扫了三日石阶，此后倒也不敢再睡。|swept the stone steps for three days and dared not doze again.
一笑置之|Laugh it off
挠挠头：|scratches their head:
掌门大度，弟子下回一定站着睡。|You are generous, Master. Next time I shall sleep standing!
心高气傲|Ambitious
自觉本事不在师兄之下，来问掌门：何时才轮到自己出头？|believes their skill equals the seniors’ and asks when they will have a chance to shine.
当众嘉许|Praise publicly
昂着头走了出去，练功比往日更卖力。|left proudly and trained even harder.
让其再磨一磨|Ask them to hone their skills
憋了一肚子气，回去把一招使了三百遍。|returned frustrated and practised the same move three hundred times.
预支月例|Advance on Wages
说家里要翻修屋子，想预支三个月的月例。|requests three months of advance wages to repair their family home.
准了|Approve
接过银子，千恩万谢地去了。|accepted the silver and departed gratefully.
门规不许|Refuse under the rules
嘟囔了几句，悻悻而退。|muttered and stepped away resentfully.
把攒下的月例交到账房，说要为山门添几片瓦。|offers saved wages to buy new tiles for the sect buildings.
倾囊相助|Generous Support
收下，记其一功|Accept and honour the deed
账簿上添了|The accounts now bear
的名字，门人都看在眼里。|'s name, and all disciples have noticed.
退回，另加赏赐|Return the silver with a reward
红了眼眶：|says with tearful eyes:
弟子这条命，是山门的。|My life belongs to the sect.
静极思动|Restless at the Seat
在山上待得发闷，来求掌门放自己下山走一遭。|is bored with life on the mountain and asks permission to travel.
准其下山历练|Allow the journey
历练三十日，长进快而有险|Thirty days of travel; rapid growth with some risk
当晚就收拾好了包袱。|packed their things that very night.
留在山上练功|Keep them training at the mountain
望着山门外的路，叹了口气。|looked at the road outside and sighed.
挑灯夜读|Studying by Lamplight
有一处关节怎么也想不通，夜里来敲掌门的门。|cannot understand a detail of an art and knocks on the leader's door late at night.
亲自指点|Give personal guidance
一番点拨，|With guidance,
豁然开朗。|suddenly grasps it.
让其自悟|Let them discover it themselves
在院中站到天明，终于自己想通了。|remained in the courtyard until dawn and finally understood.
居中调停|Mediation
两名弟子起了争执|Two disciples have quarrelled
出面劝开，来请掌门示下如何处置。|separates them and asks the leader how to proceed.
交其全权处置|Let them handle the matter
三言两语，两人握手言和。|A few words suffice; both reconcile.
各打五十大板|Discipline both
门规森严的名声传了出去，门人却都有些怕了。|The sect earns a reputation for severity, and disciples grow fearful.
整肃门风|Restore Discipline
直言门中有人练功敷衍，请掌门准自己督课一月。|complains that some members practise carelessly and requests a month of supervision.
准其督课|Allow supervision
全派经验|All experience
板着脸站在演武场边，没人再敢偷懒。|stood sternly by the training yard, and nobody dared slack.
宽以待人|Counsel leniency
没再说什么，只是自己练得更狠了。|said nothing more, but trained even harder.
此事已了|This matter is over
资质平平，去作坊出力|Ordinary aptitude; work in the workshop
眼下无艺可学，下山行侠|No art currently available; patrol the realm
没有这条门规|Unknown house rule
应邀投入|accepted the invitation to join
投入|joined
传于|Teach to
故人所托未了|An old promise remains unfulfilled
约|approximately
之能|:
无事可决|No pending decision
说到做到，门中上下都看在眼里。|kept their word, and everyone in the sect noticed.
没有再提，只是此后话少了些。|did not raise the matter again and became quieter.
之艺传于|passed on the art to
行了大礼。|bowed deeply.
说|said
往后本派这门本事，就看你的了。|The future of this art lies in your hands.
著书一部，传抄江湖。|wrote a treatise circulated throughout the realm.
书成之日，求抄本的人从山门排到了山脚。|When the book was finished, the queue for copies stretched to the mountain foot.
心愿得偿，自此倾囊相授。|fulfilled the wish and now shares all knowledge.
了却旧事归来，长揖到地|returned after fulfilling the old duty and bowed to the ground
此身此艺，尽付本派。|My craft and my life are now devoted to this sect.
默然良久，告退而去。|fell silent for a long time before departing.
收下聘礼，留了下来。|accepted the reward and remained.
沉吟片刻，点头应允。|thought for a moment and agreed.
拱手作别|bowed farewell
他日有缘再会。|May we meet again someday.
饮罢一盏茶，下山去了。|finished a cup of tea and departed.
得|gained
朝廷废《禁武令》，封|The court repealed the Edict against Arms and appointed
掌门为武林都指挥使。|as commander of the martial realm.
届论剑大会定于三十日后举行。各派可遣一名弟子出战，掌门与长老不得下场。|Sword Meet will be held in thirty days. Each sect may send one disciple; leaders and elders cannot fight.
大会尚未召集|The Sword Meet has not been called
此人不能出战|This person is not eligible
决战|Final
四强战|Semifinal
八强战|Quarterfinal
初战|Opening bout
大会未开|The meet has not started
亚军|Runner-up
四强|Semifinalist
八强|Quarterfinalist
出战|Contestant
届论剑大会夺魁|won the Sword Meet
届论剑大会获|Sword Meet result:
出战第|Competed in
居次|placed second
书贩手里没有这一部|The bookseller does not have this manual
对方并无此艺可授|The other sect cannot teach this art
交情未到|Relations too low
已是可造之极|Maximum craftable grade reached
级铸剑坊|level forge
银两或铁矿不足|Insufficient silver or iron
现世，归于本派|discovered and added to the sect
本派没有这件神兵|The sect does not possess this weapon
此人所长的武学用不上这件兵器|This weapon does not match the disciple's expertise
获赐神兵|received the legendary weapon
没有这种丹药|Unknown pill
药材不足|Insufficient herbs
库中没有这种丹药|No pill of this kind in storage
此丹对其已无效|This pill can no longer benefit this person
此人无伤|This person has no wounds
此丹须在闭关时服用|This pill must be used in seclusion
需将此武学练至七重|Requires mastery 7 in this art
此处没有藏经阁|No library here
阁中已有不逊于此的抄本|An equal or better manual is already in the library
著成|Wrote
秘笈，藏于阁中。|and stored the manual in the library.
需亲传以上方可自创武学|Requires direct disciple rank or higher to create an art
请为武学起名|Give the new art a name
每派至多自创|Each sect may create up to
已有同名武学|An art with this name already exists
需选三个不同的招式|Choose three different moves
有招式尚未学会|Some moves are not yet learned
三招须用同一种兵器（或同为空手）|All three moves must use the same weapon or be unarmed
融会所学，自创|Combined learned skills to create
八脉已通|All eight meridians are open
内功根基不足|Insufficient inner art foundation
请择其一|Choose one
打通|Opened
无此建筑|Building not found
正殿与山门的位置是定下的|Main hall and gate have fixed sites
没有这块地|Plot not found
无法设置|Cannot set
需二级正殿|Requires level 2 main hall
无此门派|Sect not found
已有卧底在内|Spy already embedded
本派派往|Our sect sent spies to
的卧底败露。|and they were discovered.
外派卧底败露。|spies abroad were discovered.
本派查获|Our sect uncovered
安插的卧底。|an embedded spy.
安插在本派的卧底败露。|A spy embedded in our sect was discovered.
安插在他派的卧底败露。|A spy embedded in another sect was discovered.
无人上台|No contender
此人带伤，不宜上台|This person is injured and unfit to fight
擂台每|The arena opens every
日一开|days
过路刀客|Passing saber fighter
关外来客|A visitor beyond the frontier
无名剑士|Nameless swordsman
江南拳师|Jiangnan fist master
游方道人|Wandering Daoist
初次登擂便得胜|won their first duel
登擂得胜，已胜|won a duel, with
场|bouts
获胜，本派威望有增|won; the sect gains renown
落败|defeated
不是有效的存档文件|Invalid save file
不是《武林天下》的存档|Not a Wulin save
存档已损坏|Save is damaged
存档来自更新的版本|Save comes from a newer version
无法升级第|Cannot upgrade version
版存档|save
空存档位|Empty save slot
`);
