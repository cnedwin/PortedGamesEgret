// 战法：怒气满时放出的招。通用战法按兵器分（枪、戟、刀、弓、骑、器械、水军），谋略战法看智力，专属战法属于某位武将。
// 每条：谁能用、打哪里（单体、直线、周围一圈、两圈、自身、身边友军）、效果、威力、持续或要求。
// Tactics: what a general unleashes when his rage is full. The common ones go by weapon (spear, halberd, sword, bow,
// horse, engines, ships), schemes by intellect, and the signature ones belong to one general each. Each row: who may use
// it, where it lands (one target, a line, a ring, two rings, oneself, allies near), what it does, its power, and how long
// it lasts or what it asks.

/** Shapes: where a tactic lands, from its target. */
export const SHAPES = {
  one: ['单体', 'one target'],
  line: ['直线三格', 'a line of three'],
  ring1: ['周围一圈', 'the target and all round it'],
  ring2: ['周围两圈', 'two rings round the target'],
  self: ['自身', 'oneself'],
  allies: ['身边友军', 'allies near'],
  all: ['全军', 'the whole army']
};

/** What a tactic does. */
export const KINDS = {
  dmg: ['伤害', 'damage'],
  burn: ['火焰伤害并点燃', 'fire damage, and sets the ground alight'],
  confuse: ['伤害并混乱', 'damage, and confusion'],
  fear: ['伤害并恐惧', 'damage, and fear'],
  stun: ['伤害并定身', 'damage, and stuns'],
  drain: ['伤害并夺取士气', 'damage, and takes morale'],
  atk: ['提升攻击', 'raises attack'],
  def: ['提升防御', 'raises defence'],
  spd: ['提升速度', 'raises speed'],
  heal: ['恢复兵力', 'restores troops'],
  rally: ['恢复士气并解除异常', 'restores morale and clears confusion and fear'],
  rage: ['友军怒气增加', 'gives allies rage']
};

// Rows: id, Chinese, English, who, shape, kind, power, extra.
// who: a weapon (spear halberd sword bow cav siege navy), int (needs that much intellect: extra is the intellect asked),
// or g:<general> for a signature tactic. power: damage in tenths of an ordinary blow, or a percentage for a buff.
// extra: seconds a status or buff lasts (for int tactics, the intellect asked; the status lasts six seconds).
const ROWS = `
tuci 突刺 Thrust spear one dmg 18 0
chuanci 穿刺 Piercing_Lunge spear line dmg 16 0
qiangzhen 枪阵 Spear_Wall spear self def 30 8
jumaqiang 拒马枪 Anti-Horse_Spears spear ring1 stun 12 2
xuanfengqiang 旋风枪 Whirlwind_Spear spear ring1 dmg 15 0
tieqiang 铁枪冲阵 Iron_Spear_Charge spear line fear 18 4
changqiangwu 长枪舞 Dance_of_the_Long_Spear spear ring1 confuse 14 4
qiangfeng 枪锋 Spearpoint spear one dmg 24 0
pizhan 劈斩 Cleave halberd one dmg 20 0
henghsao 横扫 Sweep halberd ring1 dmg 15 0
jijun 戟军突击 Halberd_Assault halberd line dmg 18 0
luanwuji 乱舞戟 Frenzied_Halberds halberd ring1 confuse 14 4
shuangji 双戟 Twin_Halberds halberd one dmg 26 0
pozhen 破阵 Break_the_Formation halberd line fear 16 4
jidong 戟动山河 Halberds_Shake_the_Land halberd ring2 dmg 12 0
tiequan 铁拳 Iron_Fist halberd one stun 18 2
dunqiang 盾墙 Shield_Wall sword self def 40 8
dunji 盾击 Shield_Bash sword one stun 16 2
daoguang 刀光 Flash_of_Blades sword ring1 dmg 14 0
zhiqi 执旗 Hold_the_Banner sword allies def 15 8
fanzhan 反斩 Riposte sword self atk 30 6
gudun 固守 Hold_Fast sword allies def 20 10
xuezhan 血战 Blood_and_Iron sword self atk 40 6
duanhou 断后 Rearguard sword ring1 dmg 13 0
qishe 齐射 Volley bow ring1 dmg 13 0
lianshe 连射 Rapid_Volley bow one dmg 22 0
huojian 火箭 Fire_Arrows bow ring1 burn 12 0
jianyu 箭雨 Rain_of_Arrows bow ring2 dmg 10 0
juji 狙击 Marksman bow one stun 18 2
qiangnu 强弩 Heavy_Bolts bow line dmg 18 0
luanshe 乱射 Wild_Shooting bow ring1 confuse 11 4
pojia 破甲箭 Armour-Piercing bow one dmg 26 0
tuxi 突袭 Raid cav one dmg 20 0
chongfeng 冲锋 Charge cav line dmg 18 0
tieqi 铁骑突击 Iron_Horse_Charge cav line fear 20 4
jianta 践踏 Trample cav ring1 dmg 15 0
youji 游击 Skirmish cav self spd 40 8
raohou 绕后 Strike_from_Behind cav one confuse 20 4
benlei 奔雷 Thunder_of_Hooves cav ring1 stun 14 2
qixi 奇袭 Surprise_Charge cav one dmg 28 0
zhuangmen 撞门 Batter_the_Gate siege one dmg 40 0
pishi 霹雳 Thunderbolt_Stone siege ring1 dmg 18 0
luoshi 落石 Falling_Rocks siege ring1 stun 14 2
xuanshi 旋石 Hurled_Stones siege ring2 dmg 12 0
huoyou 火油 Burning_Oil siege ring1 burn 14 0
denglou 登楼 Over_the_Wall siege line dmg 16 0
zhuangchuan 撞船 Ramming navy one dmg 26 0
huochuan 火船 Fire_Ship navy ring1 burn 18 0
lianzhou 连舟 Linked_Hulls navy self def 35 8
langshe 浪射 Shots_from_the_Waves navy ring1 dmg 13 0
tiesuo 铁索 Iron_Chain navy one stun 16 3
fengfan 乘风 Catch_the_Wind navy self spd 45 8
jiangchao 江潮 Tide navy ring2 dmg 11 0
dengchuan 登船 Boarding navy one fear 22 4
huoji 火计 Fire_Scheme int ring1 burn 16 60
hunluan 混乱 Confusion int ring1 confuse 6 65
weibao 伪报 False_Report int one confuse 4 70
guwu 鼓舞 Rally int allies rally 30 55
zhiliao 治疗 Healing int allies heal 12 60
luolei 落雷 Lightning int ring1 stun 18 85
yaoshu 妖术 Sorcery int ring1 fear 14 80
xianji 陷阱 Pitfall int one stun 14 60
liuyan 流言 Rumours int ring2 drain 6 70
jiefeng 借风 Borrow_the_Wind int all atk 20 92
mafei 麻沸 Numbing_Draught int allies heal 18 75
fubing 伏兵 Ambush int ring1 fear 16 72
shuiyan 水淹 Flood int ring2 dmg 14 85
jiaji 夹击 Pincer int one dmg 22 65
ji'ang 激昂 Stir_the_Blood int allies atk 20 62
bingfen 兵分 Split_and_Strike int allies spd 30 58
tianxiang 天象 Omens int ring2 fear 10 88
diaohu 调虎离山 Lure_the_Tiger int one confuse 8 78
kongcheng 空城 Empty_Fort int all def 30 90
shimian 十面埋伏 Ambush_on_Ten_Sides int ring2 fear 14 90
lianhuanji 连环计 Chained_Scheme int ring2 stun 8 92
fanjian 反间 Turn_the_Spy int one drain 20 75
yingjiang 迎将 Brace_for_Them int allies def 20 55
gufeng 鼓风 Fan_the_Flames int ring1 burn 20 80
wusheng 武圣 God_of_War g:guanyu line fear 34 5
paoxiao 咆哮 Roar_of_Changban g:zhangfei ring1 stun 24 3
longdan 龙胆 Dragon's_Courage g:zhaoyun line dmg 36 0
shenwei 神威 Divine_Might g:machao line fear 32 5
baibu 百步穿杨 Hundred-Pace_Shot g:huangzhong one dmg 46 0
wushuang 天下无双 Peerless_Under_Heaven g:lvbu ring1 fear 32 5
bawang 霸王 Little_Conqueror g:sunce line fear 30 5
chibi 赤壁之火 Fire_of_the_Red_Cliffs g:zhouyu ring2 burn 22 0
bazhen 八阵图 Eight_Formations g:zhugeliang ring2 confuse 14 6
dongfeng 东风 East_Wind g:zhugeliang all atk 30 10
lianhuan 连环 Chain_the_Ships g:pangtong ring2 stun 12 4
jianxiong 奸雄 Hero_of_Chaos g:caocao all atk 26 10
luoyi 裸衣 Bare-Chested g:xuchu self atk 70 8
shuangtie 双铁戟 Twin_Iron_Halberds g:dianwei ring1 dmg 26 0
xiaoyao 逍遥津 Xiaoyao_Ford g:zhangliao line fear 30 5
jieying 百骑劫营 Raid_with_a_Hundred g:ganning ring1 confuse 22 5
shenshe 神射 Divine_Archery g:taishici one dmg 40 0
lianying 火烧连营 Burn_the_Camps g:luxun ring2 burn 20 0
baiyi 白衣渡江 White_Robes g:lvmeng one confuse 30 6
jianshou 坚守 Hold_the_Line g:simayi all def 35 12
yinping 阴平奇袭 Yinping_Road g:dengai line dmg 34 0
jizhi 继志 Heir_of_the_Will g:jiangwei line dmg 30 0
shensu 神速 Lightning_Speed g:xiahouyuan allies spd 50 10
changqu 长驱 Long_Drive g:xuhuang line fear 28 5
qiaobian 巧变 Ingenious_Shift g:zhanghe ring1 confuse 20 5
ziwu 子午谷 Ziwu_Valley g:weiyan line dmg 34 0
taiguan 抬棺 Coffin_at_Hand g:pangde self atk 80 8
kurou 苦肉计 Self-Inflicted_Wound g:huanggai ring1 burn 22 0
yiji 遗计 Last_Counsel g:guojia ring2 confuse 14 6
wangzuo 王佐之才 Adviser_to_Kings g:xunyu all rage 20 0
luanwu 乱武 Chaos_of_War g:jiaxu ring2 drain 16 0
fazheng 奇谋 Uncanny_Plan g:fazheng ring1 confuse 22 5
zuoduan 坐断东南 Lord_of_the_Southeast g:sunquan all def 25 10
rende 仁德 Virtue g:liubei all heal 15 0
sishi 四世三公 Four_Generations g:yuanshao all atk 22 10
xiliangb 西凉铁骑 Liang_Iron_Horse g:dongzhuo line dmg 30 0
yaozhan 斩将 Slayer g:huaxiong one dmg 40 0
heji 河北名将 Hebei_Champion g:yanliang line dmg 32 0
wenchou 延津之刃 Blade_of_Yanjin g:wenchou line dmg 32 0
xianzhenying 陷阵营 Formation_Breakers g:gaoshun line fear 30 5
xiandengb 先登 First_on_the_Wall g:juyi line dmg 34 0
baimab 白马义从 White_Horse_Volunteers g:gongsunzan ring1 dmg 22 0
taiping 太平要术 Way_of_Great_Peace g:zhangjiao ring2 stun 14 4
qiqin 七擒 Seven_Captures g:menghuo self def 45 10
feidao 飞刀 Flying_Knives g:zhurong line dmg 30 0
tengjiab 藤甲 Rattan_Armour g:wutugu self def 60 10
qushou 驱兽 Beasts_of_the_South g:mulu ring1 fear 24 5
dingjun 定军山 Dingjun_Mountain g:huangzhong line dmg 34 0
dandao 单刀赴会 Alone_to_the_Feast g:guanyu self def 50 8
changban 长坂 Changban_Bridge g:zhangfei ring2 fear 20 5
huajia 刮骨 Scraping_the_Bone g:huatuo allies heal 40 0
luanji 乱击 Thousand_Blows g:sunjian line dmg 30 0
gudingdao 古锭刀 Ancient_Blade g:sunjian one dmg 40 0
kongcheng2 空城计 Empty_Fort_Strategy g:zhugeliang all def 40 12
yingshi 鹰视狼顾 Hawk_and_Wolf g:simayi ring2 confuse 14 6
weizhen 威震华夏 Shake_the_Realm g:guanyu ring2 fear 18 5
huxiao 虎啸 Tiger's_Roar g:zhangfei line dmg 32 0
qijin 七进七出 Seven_Times_Through g:zhaoyun ring1 dmg 26 0
jinma 锦马 Splendid_Steed g:machao one dmg 44 0
fengshi 锋矢 Spearhead g:caoren allies def 30 10
jushou 据守 Stand_Firm g:yujin allies def 30 10
tunzhan 屯战 Soldier-Farmers g:dengai allies heal 20 0
xianzhu 先主 First_Lord g:liubei allies atk 30 8
junlv 军律 Military_Law g:yujin all def 20 10
zhenwei 镇卫 Guardian_of_the_West g:guohuai allies def 30 10
duanjiang 断江 Cut_the_River g:zhuran ring1 dmg 24 0
lingtong 凌统 Avenger g:lingtong line dmg 28 0
zhoutai 不坏之身 Hundred_Scars g:zhoutai self def 60 10
xusheng 疑城 False_Walls g:xusheng all def 25 10
dingfeng 雪中奋短兵 Short_Blades_in_Snow g:dingfeng ring1 dmg 26 0
lusu 联刘 Ally_with_Liu g:lusu all rage 18 0
zhanghong 江东 Jiangdong_Counsel g:zhangzhao all def 20 10
luji 孝悌 Filial_Piety g:lukang allies def 30 10
zhugeke 东兴 Dongxing_Dam g:zhugeke ring2 dmg 14 0
jiangwei2 一身是胆 Courage_Through_and_Through g:jiangwei self atk 50 8
zhonghui 钟会 Bold_Plan g:zhonghui ring1 confuse 22 5
simazhao 司马昭之心 Sima_Zhao's_Heart g:simazhao all atk 22 10
simashi 定乱 Quell_the_Revolt g:simashi line fear 28 5
yanggu 羊公碑 Tablet_of_Lord_Yang g:yanghu all heal 14 0
duyu 破竹 Split_Bamboo g:duyu all atk 30 10
wangjun 楼船东下 Ships_Down_the_River g:wangjun ring2 burn 18 0
caopi 魏文 Wen_of_Wei g:caopi all def 22 10
caozhi 七步 Seven_Steps g:caozhi allies rage 30 0
caozhen 镇西 Guardian_of_the_West g:caozhen allies def 30 10
xiahoudun 拔矢啖睛 Eat_the_Eye g:xiahoudun self atk 60 8
caochun 虎豹骑 Tiger_and_Leopard g:caochun line dmg 32 0
zhangren 落凤 Fallen_Phoenix_Slope g:zhangren ring1 dmg 26 0
yanyan 断头将军 Headless_General g:yanyan allies def 30 10
huangquan 镇北 Garrison_of_the_North g:huangquan allies def 25 10
mazhong 奇射 Hidden_Archer g:mazhong one stun 24 3
wangping 无当 Wudang_Strike g:wangping ring1 dmg 24 0
zhangni 平南 Pacify_the_South g:zhangni line dmg 28 0
liaohua 老将 Old_Campaigner g:liaohua allies def 25 10
guanxing 青龙 Green_Dragon g:guanxing line dmg 30 0
zhangbao 丈八 Eighteen-Foot_Spear g:zhangbao line dmg 30 0
guanping 卫父 Shield_of_the_Father g:guanping allies def 28 10
weiyan2 反骨 Rebel's_Bone g:weiyan self atk 55 8
madai 斩魏延 Strike_Behind g:madai one dmg 40 0
liufeng 上庸 Shangyong_Rush g:liufeng line dmg 26 0
mengda 反复 Turncoat g:mengda one confuse 24 5
chendeng 湖海之士 Man_of_Lakes_and_Seas g:chendeng ring1 confuse 20 5
chengong 陈宫 Last_Stand_Counsel g:chengong ring2 confuse 12 5
tianfeng 刚而犯上 Bold_Remonstrance g:tianfeng allies rally 40 0
jushou2 沮授 Loyal_Plan g:jushou all def 22 10
shenpei 审配 Defence_of_Ye g:shenpei all def 30 12
zhangliao2 八百破十万 Eight_Hundred g:zhangliao ring2 fear 18 5
taishici2 酣战 Fight_to_the_End g:taishici self atk 50 8
lvmeng2 刮目 A_New_Man g:lvmeng allies atk 25 8
zhouyu2 雅量 Elegance g:zhouyu allies rally 40 0
xunyou 奇策 Twelve_Stratagems g:xunyou ring1 confuse 22 5
chengyu 十面 Ten_Sides g:chengyu ring2 fear 14 5
liuye 霹雳 Thunder_Cart g:liuye ring1 dmg 26 0
manchong 疑兵 Decoys g:manchong all def 25 10
wenpin 镇江 Guardian_of_Jiangxia g:wenpin allies def 28 10
yuejin 骁果 Dauntless g:yuejin line dmg 28 0
lidian 儒将 Scholar-General g:lidian allies def 24 10
zangba 泰山 Lord_of_Taishan g:zangba ring1 dmg 24 0
gongsundu 辽东 Lord_of_Liaodong g:gongsundu all def 22 10
shixie2 交州 Lord_of_Jiaozhou g:shixie all heal 12 0
liubiao2 八俊 Eight_Paragons g:liubiao all def 22 10
liuzhang 益州 Lord_of_Yi g:liuzhang all def 18 10
zhanglu2 师君 Heavenly_Master g:zhanglu allies heal 20 0
mateng2 伏波 Wave-Queller g:mateng line dmg 28 0
hansui2 黄河九曲 Nine_Bends g:hansui ring1 confuse 20 5
yuanshu2 仲家 Emperor_of_Zhong g:yuanshu all atk 18 10
taoqian2 让徐州 Yielding_Xu g:taoqian all heal 12 0
kongrong2 让梨 Sharing_Pears g:kongrong allies rally 30 0
huangfusong 名将 Pillar_of_Han g:huangfusong all atk 24 10
zhujun 讨贼 Crush_the_Rebels g:zhujun line dmg 28 0
luzhi 大儒 Great_Scholar g:luzhi allies def 24 10
dingyuan2 并州 Bing_Riders g:dingyuan line dmg 24 0
hejin 大将军 Grand_General g:hejin all atk 15 10
`;

export const TACTICS = {};
for (const line of ROWS.trim().split('\n')) {
  const [id, zh, en, who, shape, kind, power, extra] = line.trim().split(/\s+/);
  const t = { id, zh, en: en.replace(/_/g, ' '), shape, kind, power: +power };
  if (who.startsWith('g:')) t.general = who.slice(2);
  else if (who === 'int') t.mind = +extra;
  else t.weapon = who;
  t.seconds = who === 'int' ? 6 : +extra;
  TACTICS[id] = t;
}
