// English names and descriptions for authored lore. The Chinese game records
// retain their identity and numerical fields; only the presentation is localized.
import { ARTS } from '../data/arts.mjs';
import { SECTS, ELDERS } from '../data/sects.mjs';
import { PLACES } from '../data/places.mjs';
import { RELICS } from '../data/extras.mjs';
import { WANDERERS } from '../data/jianghu.mjs';

export function parsePairs(rows, target = {}) {
  for (const line of rows.trim().split('\n')) {
    const index = line.indexOf('|');
    if (index >= 0) target[line.slice(0,index).trim()] = line.slice(index+1).trim();
  }
  return target;
}
const result = {};
const sectNames = ['Shaolin Temple','Wudang Sect','Emei Sect','Huashan Sect','Beggars Guild','Ming Cult','Kunlun Sect','Canal Guild','Medicine Valley','Chongsheng Temple','Quanzhen Sect','Tang Clan'];
const masters = ['Master Huideng','Songhe Zhenren','Shen Qingshuang','Lu Guzhou','He Jiujin','Li Qianqiu','Tuoba Lie','Jiang Wanzhou','Bai Shuweng','Master Tanzhao','Guiyunzi','Tang Wanyue'];
const roles = ['Strong defence, endurance and numbers','Counterattacks and redirection','Fast offence and high accuracy','Few elite fighters with strong burst damage','Numbers, intelligence and rapid recruitment','Attrition and draining inner power','Charge through the front line','Mobility and maritime commerce','Healing, medicine and fewer casualties','Control and interrupted attacks','Formation bonuses and teamwork','Ranged burst damage and poison'];
SECTS.forEach((s,i) => { result[s.name] = sectNames[i]; result[s.leader.name] = masters[i]; result[s.role] = roles[i]; });
const elderNames = [
  'Wuyan','Jieduo','Qiweizi','Cui Handi','Ye Jingyun','Wen Caixue','Xu Yanwei','Cen Diefeng','Zhu Baijie','Luo Qiwan','Yanxiao','Duan Huisha',
  'Wulan Ce','Helan Feng','Shao Wenxi','Liu Shengqing','Sang Zhilu','Du Zhaopu','Chengtong','Faying','Xuanzhigu','Ruan Shoupu','Tang Yuntang','Tang Zhuya',
];
Object.values(ELDERS).flat().forEach((p,i)=>{result[p.name]=elderNames[i];});
const placeNames = ['Changbai Mountains','Shuntian','Mount Heng','Mount Tai','Mount Song','Mount Hua','Mount Zhongnan','Kunlun Mountains','Yingtian','Yangzhou','Mount Wudang','Mount Emei','Yuzhou','Lake Dongting','Huangshan','Mount Tiantai','Quanzhou','Lingnan','Guilin','Dali'];
const placeNotes = ['Hardy people versed in medicine','Wealthy recruits pay generous fees','Many swordsmen on the frontier','Abundant stone and a martial tradition','Roads in all directions, strategically vital','A famously precipitous mountain','Sacred Daoist mountain','Rich iron deposits, sparsely populated','A busy population brings many applicants','Canal hub and bustling trade','Towering rocky peaks','Many women disciples','Mountain city of skilled artisans','Fertile lands and navigable waters','Pines, rocks and a sea of clouds','Buddhist and Daoist traditions coexist','Sea port with overseas merchants','Varied resources, limited territory','Many mountains and broad lands','Buddhist kingdom, springlike all year'];
PLACES.forEach((p,i)=> { result[p.name]=placeNames[i]; if (p.note) result[p.note]=placeNotes[i]; });
// Rows follow the rule catalogue, with a name and the three move names.
const arts = [
  'Taizu Long Fist|Loosen the Robe|Seven Star Fist|Scout the Horse',
  'Six-Harmony Fist|Harmony Thrust|Cross-Step Punch|Close Shoulder',
  'Xingyi Fist|Splitting Fist|Crushing Fist|Tiger Pounce',
  'Joint Locks|Silk Coil|Reverse Joint|Throat Lock',
  'Soft Palm|Cloud Hands|Wave Push|Needle in Silk',
  'Eight-Trigram Palm|Single Palm Change|Double Palm Change|Circling Turn',
  'Spring Kicks|Springing Charge|Cross Kick|Linked Springs',
  'Tapping Kicks|Jade Ring Step|Mandarin Duck Kick|Mule Kick',
  'Mandarin Duck Kicks|Forward Sweep|Back Swing|Linked Ducks',
  'Pressure-Point Technique|Shoulder Well|Elbow Pool Seal|Hip Strike',
  'Eagle Claw|Eagle Grip|Tendon Divide|Bone-Twisting Claw',
  'One-Finger Zen|Tap Stone|Piercing Force|Immobilizing Finger',
  'Splitting Saber|Wrap Head|Split Mountain|Linked Chops',
  'Five Tiger Saber|Tiger Descends|Tiger Tail Sweep|Five Tigers Advance',
  'Eight-Trigram Saber|Circle Cut|Turning Chop|Storm from Eight Sides',
  'Green Duckweed Sword|Immortal Points the Way|White Snake Flick|Duckweed Touches Water',
  'Three Powers Sword|Heavenly Timing|Earthly Advantage|Human Harmony',
  'Yin-Yang Sword|Divide Yin and Yang|Balance Hard and Soft|United Duality',
  'Pear Blossom Spear|Block|Parry|Pear Blossom Swing',
  'Six-Harmony Spear|Middle Thrust|Returning Horse|Linked Harmony',
  'Yang Family Spear|Phoenix Nods|Dragon Reaches|Birds Greet the Phoenix',
  'Brow-High Staff|Mountain Presses Down|Sweep the Army|Part Grass for Snake',
  'Wulang Staff|Blocking Tiger|Overhead Smash|Eight-Trigram Dragon',
  'Eight Immortals Staff|Immortal Crosses Bridge|Drunken Linked Strike|Immortal Celebration',
  'Locust Stones|Single Flight|Linked Shots|Stars Fill the Sky',
  'Sleeve Darts|Sleeve Arrow|Turning Arrow|Plum Blossom Arrow',
  'Coin Darts|Straight Throw|Spinning Throw|Celestial Flowers',
  'Breathing Method|Regulate Breath|Return to Origin|Strengthen Foundation',
  'Eight Brocades|Balance Three Burners|Regulate Digestion|Strengthen Lower Back',
  'Five Animal Exercises|Tiger Stance|Crane Stance|Bear Stretch',
  'Light Leap|Raise Qi|Bound|Climb High',
  'Fly Over Grass|Swift Step|Tread Grass|Leave No Trace',
  'Eight-Step Cicada Chase|Quick Step|Chase Wind|Catch Cicada',
  'Qihuang Medicine|Take Pulse|Acupuncture|Set Bone',
  'Poison Lore|Identify Poison|Neutralize Poison|Apply Poison',
  'Mystic Gates|Lay Formation|Hide Form|Eight Gates',
  'Eighteen Arhat Hands|Arhat Strikes Bell|Subdue Evil, Move Mountain|Arhat Formation',
  'Bodhidharma Staff|Part Clouds|Cross River on a Reed|Face the Wall',
  'Muscle-Tendon Classic|Strengthen Sinews|Cleanse Marrow|Indestructible Body',
  'Taiji Sword|Three Rings around Moon|Swallow Skims Water|Phoenix Spreads Wings',
  'Taiji Fist|Grasp Bird Tail|Part Wild Horse Mane|Seal and Close',
  'Thirteen Taiji Forms|Ward, Roll, Press, Push|Pluck, Split, Elbow, Lean|Advance and Retreat',
  'Golden Summit Sword|Golden Summit Light|Cloud Sea Waves|Sunlit Golden Peak',
  'Emei Needles|Thread Needle|Draw Thread|Part Willow Blossom',
  'White Ape Sword|White Ape Offers Fruit|Linked Long Arms|Ape Plucks Stars',
  'Cloud Terrace Sword|Gaze at Moon|Pine Welcomes Guests|Cloud beyond Heaven',
  'Azure Dragon Sword|Dragon Emerges|Dragon Spine Return|Dragon Tail Sweep',
  'Silent Dao Sword|Invisible|Inaudible|Great Sound Is Silent',
  'Falling Lotus Palm|Lotus Unfolds|Lotus Steps|Falling Petals, Flowing Water',
  'Nine-Way Beggar Staff|Startle the Snake|Collect the Debt|Nine Ways Become One',
  'Hundred Schools Fist|Eastern Strength|Western Shortcoming|Taste Every School',
  'Light and Shadow Palm|Light Shines|Shadow Follows|Alternate Light and Shadow',
  'Crescent Saber|New Moon Slash|Waning Moon Spin|Full Moon Wheel',
  'Three Realms Method|Beginning|Middle|End',
  'Snow Ridge Spear|Snow Goose|Frozen River Thaws|Avalanche',
  'Snow-Treading Kicks|Seek Plum in Snow|Linked Snowfall|Wind Sweeps Snow',
  'Thunderclap Spear|Thunderclap|Thunder Pierces Sun|Thunderous Force',
  'Water-Parting Pole|Pole Touches Water|Part Waves|Lock the River',
  'Wave-Treading Step|Ride Waves|Ride Wind|Follow Current',
  'Wave-Calming Pole|Pillar in Midstream|Calm the Sea|Rivers Return to Sea',
  'Willow Leaf Saber|Willow Drifts|Spring Returns|Willows Sway',
  'Azure Satchel Needles|Golden Needle|Nine Revival Needles|Revive the Fallen',
  'Thousand Gold Qi Method|Nurture Qi|Cultivate Origin|Ceaseless Life',
  'Flower-Picking Finger|Smile with a Flower|Finger Flick|Flower Reveals Buddha',
  'Tiger-Taming Fist|Tiger-Taming Form|Tiger Roars in Forest|Subdue Dragon and Tiger',
  'Three Pagodas Finger|Pagoda Shadows|Three Pagodas Stand|One-Finger Meditation',
  'Pure Yang Sword|First Yang Movement|Purple Qi Rises|Three Blossoms Gather',
  'Seven Star Sword|Tianshu|Yaoguang|Seven Stars Align',
  'Golden Elixir Method|Lay Foundation|Form Elixir|Return to Emptiness',
  'Soul-Chasing Darts|Chase the Soul|Seize the Spirit|Shadowless',
  'Hundred Herbs Poison Classic|Coat with Poison|Bewildering Smoke|Corrode Bone',
  'Flying Star Hand|Meteor Chases Moon|Scattered Stars|Stars Fall Like Rain',
];
ARTS.forEach((a,i)=>{ const terms=arts[i].split('|'); result[a.name]=terms[0]; a.moves.forEach((m,j)=>{ result[m.name]=terms[j+1]; }); });
const relics = ['Heart Mirror','Tide Listener','Lone Goose','Cloud Cutter','Formation Breaker','Mountain Splitter','Goose Quill','Snow Drinker','Thunder Awakening','Wave Calmer','Cloud Piercer','Mountain Guardian','Pilgrim','Coiled Dragon','Tiger Tamer','Golden Thread','Stone Splitter','Star Point','Judge','Spring and Autumn','Firefly','Pear Blossom','Swallow Tail','Soundless'];
const tales = ['An ancient sword said to see a person’s courage','Grain like waves, singing like the sea','Worn by a swordsman at his burial','Thin as cicada wings, able to cut drifting fluff','A famous frontier general’s saber','Forty-nine jin of mountain-splitting weight','Shaped like a goose quill, silent from the scabbard','Inherited from the snowy northern plains','Thrusts like the first spring thunder','A flood-controlling general’s spear','Once said to have lifted a flag from a city tower','Treasure of an ancient mountain temple','Iron staff carried ten thousand miles by a pilgrim','A bronze dragon coils around its shaft','Gloves handed down seven generations of hunters','Woven from golden thread, resistant to blades','Knuckles inlaid with cold iron','A cold star at the tip of the brush','Iron stylus of an old court clerk','A brush that wrote history and took lives','Only a tiny glow when thrown at night','A mechanism releases a shower of silver needles','Forked tails return after flight','Its targets never hear it coming'];
RELICS.forEach((r,i)=>{ result[r.name]=relics[i]; result[r.tale]=tales[i]; });
const wanderers=['Song Zhexi','Mo Wenduo','Zhu Lingyi','Shu Mianheng','Tian Zhaodu','Wen Kezhou','Nie Yuanyin','Pang Bailu','Yan Feicen','Wang Shiyan','Qu Guoshan','Fan Muxi','Zhuo Liancheng','Xu Dinggui','Yu Fuwei','Bai Xingyan','Ruan Qihuai','Tan Jingsu','Ning Fupei','Xing Liangan','Ji Mingzhao','Liang Wanmo','Qi Tingjian','Jiang Liusun','Yin Caihan','Fang Pengyan','Jing Wanliao','Cheng Zoujie','Shi Jianqiu','Ming Cong'];
const biographies=['Spent half her life mapping crossings and reefs on the waterways.','A lifelong bell founder who can hear flaws in bronze with a single strike.','Escorted caravans for twenty years without losing one.','Diagnoses travellers at tea stalls and writes prescriptions on the back of receipts.','Ferries people at night and remembers every passenger.','Carves printing blocks for forgotten martial manuals.','Her music makes listeners forget hunger and cold.','Can track both wolves and people across snow.','An exceptional acrobat who treats city walls like steps.','Guarded beacon towers for decades; the wind tells him an approaching column’s size.','Fed hundreds from one iron wok and wields its spatula with skill.','Forty years in the mountains gathering medicine and setting bones.','Her words move the price of silk along three trade routes.','Surveyed half the dynasty’s mountains and knows where the iron lies.','Grew up among reeds; her arrows travel faster than her words.','Led salt caravans across the desert and knows every well.','Her puppet shows bring her rumours from all the neighbouring villages.','Studies stars and reminds people that each person has their own time.','Heals horses and keeps the caravan’s accounts with equal skill.','A bridge builder who can judge the load of a beam at a glance.','Her lake drums keep every oar in rhythm.','Fuses calligraphy with swordplay and joins only a deserving sect.','Thirty years managing court archives; she knows each document’s destination.','Follows migrating birds and can find anything in the mountains.','Weaves armour from cold silkworms that blades can barely mark.','Carried every pillar of an entire temple uphill on his shoulders.','Writes unrestrained poetry and fights even more boldly.','A market broker who makes both buyer and seller feel fortunate.','Writes petitions and knows every channel through officialdom.','A wandering monk who teaches wherever he goes and points the way without taking students.'];
WANDERERS.forEach((w,i)=>{result[w.name]=wanderers[i];result[w.about]=biographies[i];});

export const DATA_TERMS = parsePairs(`
少林寺|Shaolin Temple
武当派|Wudang Sect
峨嵋派|Emei Sect
华山派|Huashan Sect
丐帮|Beggars Guild
明教|Ming Cult
昆仑派|Kunlun Sect
漕帮|Canal Guild
药王谷|Medicine Valley
崇圣寺|Chongsheng Temple
全真教|Quanzhen Sect
唐门|Tang Clan
拳|Fist
掌|Palm
腿|Kicks
点穴|Pressure points
刀|Saber
剑|Sword
枪|Spear
棍|Staff
暗器|Darts
内功|Inner arts
轻功|Lightness
奇术|Mystic arts
拳脚|Unarmed
刀剑|Blades
枪棍|Polearms
内奇|Inner and mystic
臂力|Arm strength
腰力|Core strength
腿力|Leg strength
内力|Inner power
身法|Agility
悟性|Insight
杂役|Novice
外门|Outer disciple
内门|Inner disciple
亲传|Direct disciple
长老|Elder
掌门|Sect leader
舵主|Warden
左堂主|Left hall master
右堂主|Right hall master
传功长老|Training elder
执法长老|Discipline elder
外务长老|Diplomatic elder
丹房长老|Alchemy elder
器房长老|Forge elder
金矿|Gold ore
木材|Wood
石矿|Stone
铁矿|Iron ore
药材|Herbs
正殿|Main hall
山门|Gate
招贤榜|Recruitment
厢房|Dormitory
膳堂|Canteen
库房|Storehouse
金矿坑|Gold mine
采石场|Quarry
铁矿坑|Iron mine
伐木场|Lumber yard
药圃|Herb garden
铸剑坊|Forge
织造坊|Weaving workshop
丹房|Alchemy room
演武场|Training yard
兵器场|Weapon yard
静室|Meditation room
藏经阁|Library
医馆|Infirmary
箭楼|Watchtower
议事堂|Council hall
分舵核心，设职位|Branch headquarters; appoint officers
守战防线|Defensive line in a siege
招收弟子|Recruit disciples
住人|Accommodate people
存粮，安人心|Stock grain and sustain morale
储物|Store supplies
采金|Gather gold
采石|Quarry stone
采铁|Gather iron
伐木|Chop wood
种药|Grow herbs
造兵器、暗器|Craft weapons and darts
造衣、鞋、饰品|Craft clothes, shoes and accessories
炼丹|Brew pills
练拳、掌、腿、点穴|Train unarmed and pressure-point arts
练刀、剑、枪、棍、暗器|Train weapon arts
闭关，练内功、轻功、奇术|Meditate and train inner, light and mystic arts
存秘笈|Hold manuals
疗伤解毒|Treat wounds and poison
守战远程火力|Ranged defence during sieges
外交、探子|Diplomacy and intelligence
凡铁|Common iron
精钢|Fine steel
百炼|Tempered
寒铁|Cold iron
玄铁|Dark iron
门派专属|Sect-forged
神兵|Legendary weapon
拳套|Gloves
点穴笔|Stylus
镖囊|Dart pouch
布衣|Robe
甲衣|Armour
回气丹|Restoring Pill
续气丹|Renewal Pill
还魂丹|Revival Pill
聚元丹|Focus Pill
培元丹|Cultivation Pill
归元丹|Origin Pill
雄黄丸|Realgar Remedy
清心丸|Clear Mind Pill
化蛛散|Spider Antidote
驱蛊丹|Gu Antidote
壮骨丹|Bone Strengthening Pill
洗髓丹|Marrow Cleansing Pill
破障丹|Breakthrough Pill
任脉|Ren meridian
督脉|Du meridian
冲脉|Chong meridian
带脉|Dai meridian
阴跷|Yin Qiao
阳跷|Yang Qiao
阴维|Yin Wei
阳维|Yang Wei
养气|Nurture Qi
强身|Fortify body
发劲|Release power
稳桩|Rooted stance
轻身|Lightness
健步|Firm stride
明目|Clear vision
开悟|Awakening
不设专精|No specialty
矿场|Mining
工坊|Crafting
演武|Training
关隘|Fortification
无增减|No modifiers
此处采集多三成|Gathering here +30%
此处制造多三成|Crafting here +30%
此处修练快一成半|Training here +15%
此处守城防御加一成半|Defence at this stronghold +15%
群雄并起|Rising Powers
正邪对峙|Rivals Divided
五强争霸|Five Rival Powers
孤峰独立|Lone Peak
十二派各守一方，实力相若。|Twelve sects begin at comparable strength.
邪派两家各多一处据点、多五名弟子，正派彼此交好。|Both unorthodox sects gain a stronghold and five disciples; righteous sects are friendly.
只余五家大派，各据三处，本派必在其中。|Five major sects remain with three strongholds each, including your own.
本派开局只有掌门与四名弟子，银两减半。|Begin with the leader and four disciples and half the silver.
从容|Relaxed
寻常|Normal
艰难|Hard
绝境|Desperate
猎户|Hunter
镖师|Escort
书生|Scholar
富家子|Merchant’s child
逃兵|Deserter
农家|Farmer
渔家|Fisher
药童|Apothecary apprentice
孤儿|Orphan
江湖艺人|Travelling performer
勤勉|Diligent
懒散|Lazy
高傲|Proud
贪财|Greedy
重义|Loyal
好动|Restless
好学|Studious
温和|Gentle
严肃|Stern
修练快一成|Training +10%
修练慢一成|Training -10%
久不晋升便生怨|Resents long delays in promotion
欠薪时格外不满|Unhappy when wages are unpaid
忠诚每旬自增|Loyalty rises each ten days
坐不住，想下山闯荡|Restless, eager to explore
有武可练便安心|Content while learning an art
待人宽和，善调停|Kind and good at mediation
律己律人，眼里不揉沙|Strict with self and others
凡品|Ordinary
良品|Fair
上品|Fine
极品|Rare
绝世|Peerless
资质平平，胜在肯下苦功|Ordinary gifts; compensates with hard work
中人之资，循序渐进可成器|Average gifts, develops with steady practice
天资不俗，值得悉心栽培|Talented, worth careful training
百里挑一的好苗子|A one-in-a-hundred prospect
不世出的奇才，可遇不可求|An extraordinary prodigy
授业|Teaching
回春|Healing
聚财|Commerce
巧匠|Artisan
识地|Prospecting
守御|Defence
先登|Vanguard
识人|Scouting
点拨|Guidance
理事|Stewardship
同乐|Fellowship
通达|Court connections
全派修练加快一成|All training +10%
全派养伤加快|Faster recovery for everyone
每旬多入银六十两|Earn 60 extra silver each ten days
制造所得多两成半|Crafting output +25%
采集所得多两成半|Gathering output +25%
守城时全队防御加一成|Defence in sieges +10%
出战时全队攻势加半成|Attack in battle +5%
来投者更多|More applicants
闭关更易有悟|Greater chance of a breakthrough
薪俸开支省一成|Wages cost 10% less
每旬全派忠诚加一|All loyalty +1 each ten days
朝廷关系每旬加一|Court standing +1 each ten days
循旧例|Keep tradition
严规|Strict discipline
宽和|Lenient
尚武|Martial emphasis
重商|Commerce emphasis
不增不减|No modifiers
修练加快一成，每旬忠诚减一|Training +10%, loyalty -1 every ten days
每旬忠诚加一，修练慢半成|Loyalty +1 every ten days, training -5%
出战攻势加半成，采集少一成|Attack +5%, gathering -10%
制造所得多一成半，修练慢半成|Crafting output +15%, training -5%
长蛇阵|Long Snake
锋矢阵|Arrowhead
方圆阵|Square and Circle
鹤翼阵|Crane Wing
罗汉阵|Arhat Formation
真武阵|Zhenwu Formation
金顶剑阵|Golden Summit Swords
两仪阵|Yin-Yang Formation
莲花阵|Lotus Formation
圣火阵|Sacred Flame
雪岭冲阵|Snow Ridge Charge
分水阵|Parting Waters
回春阵|Spring Revival
三塔阵|Three Pagodas
北斗阵|Northern Dipper
雁翅阵|Goose Wing
寻常阵势|Standard formation
攻势加三分，防御减六分，阵形收窄|Attack +3%, defence -6%, narrower formation
防御加一成，攻势减四分|Defence +10%, attack -4%
两翼展开包抄，攻势加两分|Flank with both wings, attack +2%
防御加一成二|Defence +12%
防御加六分，气力回复加快|Defence +6%, faster recovery
攻势加六分|Attack +6%
攻势加八分，防御减两分|Attack +8%, defence -2%
攻守各加半成|Attack and defence +5%
攻势加七分|Attack +7%
攻势加六分，防御减三分，阵形收窄|Attack +6%, defence -3%, narrower formation
防御加半成，攻势加四分|Defence +5%, attack +4%
防御加六分，气力回复大为加快|Defence +6%, much faster recovery
防御加七分|Defence +7%
攻势加半成，气力回复加快|Attack +5%, faster recovery
两翼展开，攻势加六分|Spread wings, attack +6%
传令官|Imperial courier
山门信使|Mountain messenger
守印长老|Seal-keeping elder
禁武令|Edict against Arms
山河未静|Troubled Rivers and Mountains
山门待启|A Gate Yet to Open
承和元年，城门未开，官军已封了演武场。铁匠交刀，武师交名册。明日日出前，未交兵刃的山门，一并查封。|In the first Chenghe year, before the city gates opened, troops sealed every training yard. Smiths must surrender weapons, masters their rosters. By tomorrow’s sunrise, every sect that has kept its arms will be sealed.
山下的渡口封了。我绕了两座山，才把这封信送上来。各派都在问，明日官兵上山，还有谁肯替门中的弟子开门？|The ferry below the mountain is closed. I crossed two mountains to bring this letter. Everyone asks: when the troops climb the mountain tomorrow, who will open the gate for their disciples?
这枚印，盖过拜师帖，也盖过送行帖。你若接下，山门里每一个人都要有个去处。若要另立门户，天亮后，便让江湖记住你的旗号。|This seal has marked both pledges of discipleship and letters of farewell. If you accept it, you take responsibility for every soul behind these gates. If you found a new sect, let the martial world remember your banner at dawn.
人物年龄照常增长，年迈不会导致离世。|Characters age normally, but old age does not cause death.
年迈的门人可能离世，掌门离世后由门中后继者继任。|Elders may pass away; when the leader dies, a successor takes their place.
`, result);
