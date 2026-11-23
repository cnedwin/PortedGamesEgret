// 特性：两百种，每种是一组效果。效果的含义见 `EFFECTS`；数值是百分比（加成）或点数（标了 pt 的）。一位武将最多带四种。
// Traits: two hundred, each a set of effects. `EFFECTS` says what each effect means; values are percentages (bonuses) or
// points (those marked pt). A general carries up to four.

/** What each effect does, in both languages; {v} is its value. */
export const EFFECTS = {
  atk: ['战斗攻击 +{v}%', 'Attack in battle +{v}%'],
  def: ['战斗防御 +{v}%', 'Defence in battle +{v}%'],
  spd: ['战场移动 +{v}%', 'Speed on the field +{v}%'],
  rage: ['怒气积累 +{v}%', 'Rage gained +{v}%'],
  tactic: ['战法威力 +{v}%', 'Tactic power +{v}%'],
  morale: ['士气 +{v}', 'Morale +{v}'],
  cav: ['率骑兵 攻防 +{v}%', 'With cavalry, attack and defence +{v}%'],
  inf: ['率步兵 攻防 +{v}%', 'With infantry, attack and defence +{v}%'],
  bow: ['率弓弩 攻防 +{v}%', 'With bows and crossbows, attack and defence +{v}%'],
  siege: ['攻城伤害 +{v}%', 'Damage to walls and gates +{v}%'],
  navy: ['水战 攻防 +{v}%', 'On water, attack and defence +{v}%'],
  fire: ['火攻威力 +{v}%', 'Fire attacks +{v}%'],
  ambush: ['山林中 攻击 +{v}%', 'Attack from hills and woods +{v}%'],
  wall: ['守城 防御 +{v}%', 'Defending walls +{v}%'],
  charge: ['冲锋伤害 +{v}%', 'Charge damage +{v}%'],
  counter: ['反击伤害 +{v}%', 'Counter-attack damage +{v}%'],
  crit: ['暴击率 +{v}%', 'Critical hits +{v}%'],
  heal: ['战后伤兵恢复 +{v}%', 'Wounded recovered after battle +{v}%'],
  duel: ['单挑 +{v}', 'Duels +{v}'],
  resist: ['异常抗性 +{v}%', 'Resisting confusion and fear +{v}%'],
  troops: ['统兵上限 +{v}%', 'Troops led +{v}%'],
  scheme: ['计略成功 +{v}%', 'Schemes succeed +{v}%'],
  farm: ['开垦与粮产 +{v}%', 'Farming and grain +{v}%'],
  trade: ['商业与钱收 +{v}%', 'Trade and coin +{v}%'],
  order: ['治安 +{v}%', 'Public order +{v}%'],
  build: ['建设速度 +{v}%', 'Building speed +{v}%'],
  recruit: ['征兵 +{v}%', 'Conscription +{v}%'],
  train: ['训练 +{v}%', 'Training +{v}%'],
  search: ['寻访人才 +{v}%', 'Finding talent +{v}%'],
  persuade: ['登用说服 +{v}%', 'Persuading to serve +{v}%'],
  diplo: ['外交 +{v}%', 'Diplomacy +{v}%'],
  supply: ['行军粮耗 -{v}%', 'Grain used on the march -{v}%'],
  march: ['行军速度 +{v}%', 'Marching speed +{v}%'],
  support: ['民心 +{v}%', 'Support of the people +{v}%'],
  fame: ['名声 +{v}%', 'Fame +{v}%'],
  tech: ['研究 +{v}%', 'Research +{v}%'],
  loyal: ['忠诚 +{v}pt', 'Loyalty +{v}pt'],
  betray: ['易生异心 +{v}%', 'Inclined to betray +{v}%'],
  life: ['寿命 +{v} 年', 'Lifespan +{v} years'],
  capture: ['擒获敌将 +{v}%', 'Capturing enemy generals +{v}%']
};

// Rows: id, Chinese, English (words joined by _), effects.
const ROWS = `
yongmeng 勇猛 Valiant atk=5,duel=6
xiaoyong 骁勇 Fierce atk=8,duel=10,charge=6
wanfu 万夫莫敌 Matchless atk=12,duel=16,charge=10,resist=10
wushuang 天下无双 Peerless atk=16,duel=24,charge=14,morale=8
wusheng 武圣 God_of_War atk=12,duel=18,morale=10,loyal=10
huchi 虎痴 Tiger_Fool atk=10,duel=14,def=6
elai 恶来 Evil_Comer atk=10,duel=14,counter=12
yanren 燕人 Man_of_Yan atk=10,duel=14,charge=8
longdan 龙胆 Dragon_Courage atk=9,duel=14,resist=12,spd=6
jinma 锦马超 Splendid atk=11,duel=15,cav=10
laojiang 老当益壮 Old_but_Strong atk=8,bow=8,life=8
shenshe 神射 Divine_Archer bow=15,crit=8
shanshe 善射 Fine_Archer bow=8,crit=4
qishen 骑神 Rider_God cav=16,spd=8,charge=10
qishe 骑射 Mounted_Archer cav=8,bow=6
qijiang 骑将 Cavalry_Captain cav=8,charge=6
qiangwang 枪王 Spear_King inf=10,counter=10
jizhan 戟战 Halberd_Fighter inf=8,atk=4
tuji 突击 Breakthrough charge=12,spd=4
xianfeng 先锋 Vanguard atk=6,spd=6,morale=4
tiebi 铁壁 Iron_Wall def=14,wall=8
jianshou 坚守 Stalwart def=8,wall=12
buqu 不屈 Unbending resist=14,morale=8,def=4
xiandeng 先登 First_on_the_Wall siege=12,atk=4
xianzhen 陷阵 Breaker_of_Lines inf=10,charge=8,atk=4
douzhi 斗志 Fighting_Spirit rage=12,morale=4
nuhou 怒吼 Roar rage=18,atk=4
gangli 刚烈 Fiery atk=6,rage=8,betray=-4
mengjiang 猛将 Fierce_Captain atk=7,charge=5
yiqi 一骑当千 Worth_a_Thousand atk=10,duel=12,resist=6
huwei 虎卫 Tiger_Guard def=8,duel=8,loyal=10
qinwei 亲卫 Bodyguard def=6,loyal=8
tongyu 统御 Command atk=4,def=4,troops=10
mingjiang 名将 Renowned_General atk=6,def=6,troops=15,morale=6
bingsheng 兵圣 Sage_of_War atk=8,def=8,troops=20,tactic=10
bingfa 兵法 Art_of_War tactic=10,def=4
zhijun 治军 Strict_Discipline train=15,def=6,resist=6
yanzheng 严整 Orderly_Ranks def=8,resist=8
weiming 威名 Dreaded_Name morale=8,atk=4
weizhen 威震 Terror_of_the_Foe morale=12,atk=6,resist=6
jixing 疾行 Swift_March march=15,spd=6
shensu 神速 Lightning_Speed march=25,spd=12
qixi 奇袭 Surprise_Attack ambush=12,atk=4,march=8
fubing 伏兵 Ambusher ambush=16
huogong 火攻 Fire_Attack fire=20
huoshen 火神 Master_of_Fire fire=35,tactic=8
shuizhan 水战 Waterborne navy=15
shuishen 水神 Lord_of_the_River navy=25,fire=8
shanzhan 山战 Mountain_Fighter ambush=10,def=6
shoucheng 守城 Defender_of_Walls wall=15
gongcheng 攻城 Siegemaster siege=18
yezhan 夜战 Night_Fighter ambush=8,crit=6
shenjing 神算 Divine_Reckoning scheme=20,tactic=10
guicai 鬼才 Ghostly_Talent scheme=18,tactic=12,life=-6
dongcha 洞察 Insight resist=10,scheme=8
kanpo 看破 See_Through resist=18
lianhuan 连环 Chained_Ships scheme=12,fire=10
lijian 离间 Sowing_Discord scheme=15,persuade=6
fanji 反计 Counterplot resist=12,scheme=6
yaoshu 妖术 Sorcery tactic=18,scheme=8
guwu 鼓舞 Rallying morale=10,rage=6
jiuhu 救护 Field_Healer heal=25
yishu 医术 Physician heal=40,life=6
tuntian 屯田 Military_Farms farm=25,supply=10
nongzheng 农政 Husbandry farm=15
shangcai 商才 Merchant_Mind trade=20
caizheng 财政 Treasury trade=12,tax=0
renzheng 仁政 Benevolent_Rule support=15,order=6
fazhi 法治 Rule_of_Law order=20
mingcha 明察 Clear-sighted order=10,scheme=6
nengli 能吏 Able_Official farm=8,trade=8,order=8
qinglian 清廉 Incorruptible support=8,order=8,loyal=6
zhishui 治水 Water_Works farm=12,build=10
zhucheng 筑城 Fortifier build=20,wall=8
mingshi 名士 Celebrated_Scholar fame=15,persuade=8
renwang 人望 Beloved support=10,persuade=10,recruit=8
shiren 识人 Judge_of_Men search=25,persuade=6
lixian 礼贤 Courteous_to_Worthies search=15,persuade=15
waijiao 外交 Envoy diplo=20
biancai 辩才 Silver_Tongue diplo=12,persuade=12
zhengbing 征兵 Recruiter recruit=20
xunlian 训练 Drillmaster train=20
liangdao 粮道 Supply_Lines supply=20
keji 发明 Inventor tech=25,siege=8
tianwen 天文 Astronomer tech=10,fire=6
wenxue 文学 Man_of_Letters fame=10,tech=8
shicai 诗才 Poet fame=12
qinyi 琴艺 Musician support=6,fame=6
shufa 书法 Calligrapher fame=8
jingxue 经学 Classicist tech=12,support=4
zhongyi 忠义 Loyal_and_True loyal=20,morale=4
zhonglie 忠烈 Steadfast_to_Death loyal=25,resist=8
yexin 野心 Ambitious betray=25,atk=4
duoyi 多疑 Suspicious resist=10,persuade=-10
tancai 贪财 Greedy trade=6,betray=15,loyal=-8
jiaoao 骄傲 Proud atk=4,def=-4,resist=-6
baonue 暴虐 Cruel order=6,support=-15
qianxun 谦逊 Modest loyal=6,persuade=6
lengjing 冷静 Composed resist=12,def=4
jizao 急躁 Hot-tempered atk=6,def=-6,rage=8
jiaozha 狡诈 Cunning scheme=10,betray=8
haoshuang 豪爽 Open-handed persuade=8,morale=4
rende 仁德 Virtue support=20,persuade=12,loyal=6
jianxiong 奸雄 Hero_of_Chaos persuade=12,scheme=10,troops=10
bawang 霸王 Little_Conqueror atk=10,charge=10,morale=8,life=-8
huangzu 皇族 Imperial_Clan fame=15,support=6
mingmen 名门 Great_Family fame=12,persuade=6
hanmen 寒门 Humble_Birth loyal=6
jiangmen 将门 Soldier_Family troops=8,train=8
waizu 外族 Frontier_Blood cav=8,recruit=6
yinshi 隐士 Recluse search=-10,tech=8
yongjiang 庸将 Middling_Captain atk=-6,def=-4
ruoqi 懦弱 Faint-hearted morale=-8,resist=-8
haojiu 嗜酒 Drinker atk=4,def=-6,order=-4
qingdi 轻敌 Careless def=-8,ambush=-6
moce 谋策 Planner tactic=6,scheme=6
jiaoyu 教化 Educator support=8,tech=6
anmin 安民 Settler_of_People support=10,order=10
kaituo 开拓 Pioneer farm=10,build=10
haiyun 海运 Sea_Trader trade=12,navy=6
beixia 北狄 Northern_Raider cav=12,march=10
nanman 南蛮 Southern_Tribes ambush=12,resist=8
qiangzu 羌胡 Qiang_Horsemen cav=10,charge=6
xiongnu 匈奴 Xiongnu_Archers cav=6,bow=8
shanyue 山越 Shanyue_Hillmen ambush=10,recruit=10
tengpai 藤牌 Rattan_Shields def=12,fire=-30
qushou 驱兽 Beastmaster tactic=14,charge=8
feidao 飞刀 Flying_Knives bow=10,crit=10
xianshu 仙术 Immortal_Arts tactic=20,life=20
taiping 太平道 Way_of_Peace recruit=25,support=8,tactic=8
wudoumi 五斗米 Five_Pecks_of_Rice support=15,order=8
huangjin 黄巾 Yellow_Scarf recruit=15,morale=4
heishan 黑山 Black_Mountain ambush=10,recruit=10
baima 白马 White_Horses cav=14,bow=6
xiliang 西凉 Liang_Riders cav=12,charge=8
qingzhou 青州兵 Qingzhou_Corps inf=8,recruit=10
danyangb 丹阳精兵 Danyang_Veterans inf=10,def=6
tiqi 铁骑 Iron_Horse cav=10,def=6
wangzuo 王佐 Adviser_to_Kings farm=10,trade=10,search=10,persuade=10
shisheng 十胜 Ten_Victories scheme=15,tactic=8,morale=6
luanwu 乱武 Chaos_of_War scheme=22,resist=8
wolong 卧龙 Sleeping_Dragon tactic=20,scheme=20,fire=15,tech=15
fengchu 凤雏 Young_Phoenix tactic=15,scheme=18,fire=10
youlin 幼麟 Young_Qilin tactic=10,atk=6,loyal=10
miaosuan 妙算 Shrewd_Reckoning scheme=12,tactic=6
bianhua 机变 Adaptable spd=6,resist=6,tactic=6
juedou 决斗 Duellist duel=12
dandao 单刀 Lone_Blade duel=8,morale=6
baiqi 百骑劫营 Hundred-Rider_Raid ambush=14,charge=10
xiaoyao 威震逍遥 Terror_of_Xiaoyao cav=10,morale=10,atk=6
dingjun 定军 Dingjun_Strike bow=10,charge=8
baiyi 白衣渡江 White-Robed_Crossing navy=10,ambush=12,scheme=8
lianying 火烧连营 Burning_Camps fire=25,ambush=8
yinping 偷渡阴平 Secret_Road march=20,ambush=12
jianbi 坚壁 Fortified_Camp def=10,wall=10,supply=10
yingshi 鹰视狼顾 Hawk_Eyes scheme=14,resist=14,betray=10
zhengnan 征南 Southern_Campaign nanman=0,ambush=6,resist=8
taoyuan 桃园 Peach_Garden_Oath loyal=30,morale=6
hongyi 弘毅 Resolute morale=6,resist=6,def=4
juntu 军屯 Garrison_Farms supply=15,farm=8
duhu 都护 Protector_General order=8,def=6,troops=6
xungen 巡边 Border_Warden cav=6,def=6
gongjin 恭谨 Respectful loyal=8,order=4
baoxian 保境 Keeper_of_the_Realm wall=8,order=8,support=6
shenzhi 慎重 Cautious def=8,resist=6,atk=-4
wuhou 武侯 Marquis_of_Wu tactic=10,train=10,supply=15
lianhe 联合 Alliance_Builder diplo=15,fame=4
qiaobian 巧变 Ingenious tactic=8,spd=8,resist=8
shouwei 守卫 Guardian def=8,counter=6
juhuo 举火 Torchbearer fire=10
gongnu 弓弩 Bowman bow=6
qiangbing 枪兵 Spearman inf=5
qibing 骑兵 Horseman cav=5
shuishou 水手 Sailor navy=8
gongjiang 工匠 Craftsman build=10,siege=6
kanyu 堪舆 Geomancer ambush=6,march=6
jiyi 技艺 Skilled_Hand build=8,tech=8
zhencha 侦察 Scout march=6,resist=4
xinxin 信义 Trustworthy diplo=8,loyal=8
haoxia 豪侠 Gallant persuade=8,duel=6
youxia 游侠 Wandering_Swordsman duel=8,spd=6
sanquan 刺客 Assassin crit=12,scheme=6
huanguan 宦官 Eunuch scheme=8,support=-8
shishi 谋士 Counsellor scheme=6
dangan 胆识 Daring atk=4,resist=6
zhiyong 智勇 Wise_and_Brave atk=5,tactic=6
gaojie 高洁 Noble_Spirit loyal=10,fame=6
wuqian 无欠 Untroubled life=6
duanming 短命 Fragile life=-10
changshou 长寿 Long-lived life=12
huajia 华佗 Divine_Physician heal=60,life=10
nvjiang 女将 Woman_General spd=6,crit=6
cainv 才女 Gifted_Lady fame=10,tech=10
qingguo 倾国 Peerless_Beauty scheme=14,persuade=8
jinguo 巾帼 Heroine atk=6,morale=6
shanfa 善罚 Fair_Judge order=12,loyal=4
mingjian 明鉴 Discerning search=12,resist=6
zuozhan 作战 Field_Officer atk=3,def=3
xiaowei 校尉 Colonel troops=5
mubing 募兵 Levy_Raiser recruit=12
qinmin 亲民 Close_to_the_People support=12
lianzheng 廉政 Clean_Hands order=6,support=6
jianzhi 谏臣 Upright_Counsellor resist=8,order=6
neizheng 内政 Administrator farm=6,trade=6,build=6
kuanhou 宽厚 Generous support=8,loyal=4
sheshui 涉水 River_Crosser navy=6,march=6
yongbing 用兵 Field_Commander atk=4,def=4,tactic=4
tuxi 突袭 Raider charge=6,ambush=6
shoujiang 守将 Garrison_Commander wall=8,def=4
hanjiang 悍将 Ferocious atk=6,resist=-4
qiangnu 强弩 Strong_Crossbows bow=10,siege=4
lianzhu 连珠 Rapid_Shot bow=8,spd=4
baoxing 暴行 Plunderer recruit=8,support=-10
`;

export const TRAITS = {};
for (const line of ROWS.trim().split('\n')) {
  const [id, zh, en, list] = line.trim().split(/\s+/);
  const effects = {};
  for (const pair of list.split(',')) {
    const [k, v] = pair.split('=');
    if (k in EFFECTS && +v) effects[k] = +v;
  }
  TRAITS[id] = { id, zh, en: en.replace(/_/g, ' '), effects };
}
