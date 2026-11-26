// 宝物：一百一十件名器、名马、兵书、印玺和奇珍。每件加一项能力，有的另带效果；开局在某位武将身上或藏在某座城里，
// 由寻访找到、赏赐给部下（忠诚上升），也会在战场上被缴获。
// Treasures: a hundred and ten famed weapons, horses, books, seals and curiosities. Each raises one ability and some
// carry effects besides; each starts with a general or hidden in a city, is found by searching, given to a follower
// (whose loyalty rises), or taken on the battlefield.

// Rows: id, Chinese, English, kind, ability, amount, holder at the start (a general, a city as @city, or - for none),
// effects (as in traits).
const ROWS = `
qinglong 青龙偃月刀 Green_Dragon_Crescent_Blade weapon war 6 guanyu atk=6
zhangba 丈八蛇矛 Serpent_Spear weapon war 6 zhangfei atk=6
fangtian 方天画戟 Sky_Piercer weapon war 7 lvbu atk=8
qinggang 青釭剑 Qinggang_Sword weapon war 4 @jiangling crit=8
yitian 倚天剑 Heaven_Leaning_Sword weapon war 4 caocao crit=6
cixiong 雌雄双股剑 Twin_Swords weapon war 3 liubei duel=6
gudingdao 古锭刀 Ancient_Ingot_Blade weapon war 4 sunjian atk=4
tieji 双铁戟 Twin_Iron_Halberds weapon war 5 dianwei atk=5
huoshi 火龙枪 Fire_Dragon_Spear weapon war 4 @jincheng charge=6
yayue 涯角枪 Horizon_Spear weapon war 5 zhaoyun atk=4
bawangqiang 霸王枪 Conqueror's_Spear weapon war 4 @wu atk=4
lianhuan 链锤 Chain_Flail weapon war 3 @chenliu crit=4
qianfan 七星刀 Seven_Star_Blade weapon war 3 @luoyang crit=6
baiyin 白银狮子 Silver_Lion weapon war 3 @ye def=4
zhanmadao 斩马刀 Horse-Cutting_Blade weapon war 3 @wuwei charge=4
liubiaodao 流星锤 Meteor_Hammer weapon war 3 @changsha crit=4
yangyou 养由基弓 Bow_of_Yang_You weapon war 4 huangzhong bow=8
liyi 李广弓 Bow_of_Li_Guang weapon war 4 @beiping bow=8
paxiong 霸王弓 Conqueror's_Bow weapon war 3 @shouchun bow=6
tiesuo 铁胎弓 Iron-Core_Bow weapon war 3 taishici bow=6
jinbei 金背刀 Gold-Backed_Blade weapon war 2 @xiangyang atk=3
yanlingdao 偃月刀 Crescent_Blade weapon war 2 @hedong atk=3
diantie 点钢枪 Steel_Spear weapon war 2 @ji atk=3
sanjian 三尖两刃刀 Three-Point_Blade weapon war 3 jiling atk=4
zhurongdao 飞刀 Flying_Knives weapon war 3 zhurong crit=6
dagui 大斧 Great_Axe weapon war 2 @yanmen atk=3
zhanmajian 斩蛇剑 Snake-Slaying_Sword weapon war 5 @luoyang fame=10
shuangjian 吴钩 Wu_Hooks weapon war 2 @kuaiji crit=4
ganjiang 干将 Gan_Jiang weapon war 4 @wu crit=6
moye 莫邪 Mo_Ye weapon war 4 @kuaiji crit=6
chitu 赤兔马 Red_Hare horse lead 4 lvbu spd=12,march=15
dilu 的卢 Dilu horse lead 3 @xiangyang spd=10,march=10
jueying 绝影 Shadowless horse lead 3 caocao spd=10,march=10
zhaoye 爪黄飞电 Flying_Lightning horse lead 3 @xuchang spd=8,march=10
baiyouma 白鹄马 White_Swan horse lead 2 @beiping spd=8
dawan 大宛马 Ferghana_Horse horse lead 2 @dunhuang spd=8,march=8
xilianma 西凉马 Liang_Horse horse lead 2 mateng spd=6
huangbiao 黄骠马 Yellow_Dappled horse lead 2 @jinyang spd=6
qingzong 青骢马 Grey_Dappled horse lead 2 @changan spd=6
wuzhui 乌骓 Black_Steed horse lead 3 @shouchun spd=8
baiyima 白义马 White_Steed horse lead 2 gongsunzan spd=6
zhaoyema 照夜玉狮子 Jade_Lion horse lead 3 @changshan spd=8
xiangbing 白象 White_Elephant horse lead 2 menghuo def=6
mulu 木鹿 Wooden_Deer horse lead 2 @jianning spd=4
liuma 流马 Gliding_Horse horse pol 3 @chengdu supply=20
sunzi 孙子兵法 Art_of_War book int 6 @luoyang tactic=10
wuzi 吴子兵法 Wu_Qi's_Art book int 4 @ye tactic=6
taigong 六韬 Six_Secret_Teachings book int 5 @linzi tactic=8
sanlve 三略 Three_Strategies book int 4 @xiapi tactic=6
mengde 孟德新书 Mengde's_New_Book book int 4 caocao tactic=6
bingshu 兵法二十四篇 Twenty-Four_Chapters book int 5 @xiangyang tactic=8
taiping 太平要术 Way_of_Great_Peace book int 5 zhangjiao tactic=10
dunjia 遁甲天书 Book_of_Hidden_Arts book int 6 @kuaiji scheme=12
qingnang 青囊书 Green_Bag_Book book pol 3 huatuo heal=30
shanghan 伤寒论 Treatise_on_Fevers book pol 3 @changsha heal=20
chunqiu 春秋左氏传 Zuo's_Annals book int 3 guanyu loyal=10
shiji 史记 Records_of_the_Historian book pol 4 @changan fame=8
hanshu 汉书 Book_of_Han book pol 3 @luoyang fame=6
shuowen 说文解字 Explaining_Characters book pol 3 @runan tech=10
lunheng 论衡 Balanced_Discourses book pol 2 @kuaiji tech=6
lunyu 论语 Analects book pol 3 @taishan support=8
zhouli 周礼 Rites_of_Zhou book pol 3 @luoyang order=8
guanzi 管子 Guanzi book pol 4 @linzi trade=10
shangjun 商君书 Book_of_Lord_Shang book pol 3 @changan order=10
hanfeizi 韩非子 Han_Feizi book pol 3 @xuchang order=8
laozi 老子 Laozi book int 3 @chen resist=8
zhuangzi 庄子 Zhuangzi book int 2 @qiao resist=6
shanhai 山海经 Classic_of_Mountains book int 2 @baxi search=10
jiuzhang 九章算术 Nine_Chapters book pol 3 @xuchang build=10
nongshu 氾胜之书 Fan_Shengzhi's_Farming book pol 3 @changan farm=12
shuijing 水经 Classic_of_Waters book pol 2 @jiangling build=8
mojing 墨经 Mohist_Canon book int 3 @pengcheng siege=10
gongshu 鲁班书 Lu_Ban's_Book book int 3 @shouchun siege=12
bagua 八卦图 Eight_Trigrams book int 3 @chengdu tactic=6
yuxi 传国玉玺 Imperial_Seal seal cha 8 @luoyang fame=20
jinyin 金印 Gold_Seal seal pol 3 @xuchang order=6
yinshou 印绶 Seal_and_Ribbon seal pol 2 @ye support=6
hufu 虎符 Tiger_Tally seal lead 3 @changan troops=10
jiemao 节钺 Staff_and_Axe seal lead 4 @luoyang troops=12
yuruyi 玉如意 Jade_Ruyi jewel cha 3 @wu support=6
yebi 夜明珠 Night-Shining_Pearl jewel cha 3 @nanhai fame=6
heshibi 和氏璧 Jade_of_Bian_He jewel cha 5 @xiangyang fame=12
tongque 铜雀 Bronze_Sparrow jewel cha 3 @ye fame=8
jiaoweiqin 焦尾琴 Burnt-Tail_Lute jewel cha 3 caiyong fame=8
hupo 琥珀杯 Amber_Cup jewel cha 2 @jiaozhi trade=6
shanhu 珊瑚 Red_Coral jewel cha 2 @hepu trade=8
xiangya 象牙 Ivory jewel cha 2 @jianning trade=6
xiniu 犀角 Rhino_Horn jewel cha 2 @yongchang heal=10
jinlv 金缕玉衣 Jade_Burial_Suit jewel cha 3 @luoyang fame=8
dingba 九鼎 Ritual_Tripod jewel cha 4 @luoyang fame=10
qiyao 七星宝刀 Seven-Star_Dagger weapon war 3 wangyun crit=8
baoshu 宝书 Precious_Scroll book int 2 @xiapi scheme=6
xianglu 博山炉 Boshan_Censer jewel cha 2 @wan support=4
yugui 玉圭 Jade_Tablet seal pol 2 @chenliu order=4
jiling 吉灵铃 Bells_of_Fortune jewel cha 2 ganning morale=6
mazhu 马镫 Stirrups horse lead 2 @wuwei cav=6
bumu 布幕 War_Screen book lead 2 @hanzhong def=6
liannu 连弩图 Repeating-Crossbow_Plans book int 3 @chengdu bow=8
mubiao 木牛图 Wooden_Ox_Plans book pol 3 @hanzhong supply=20
haijing 海图 Sea_Chart book int 2 @wu navy=10
jiangtu 江图 River_Chart book int 2 @jiangling navy=8
dili 舆地图 Map_of_the_Realm book int 3 @luoyang march=10
xuanjia 玄甲 Black_Armour weapon lead 3 @ye def=8
tiejia 铁甲 Iron_Armour weapon lead 2 @jinyang def=6
yinjia 银甲 Silver_Armour weapon lead 3 machao def=6
shizijia 狮子盔 Lion_Helmet weapon lead 2 @wuwei def=4
hongpao 红袍 Crimson_Robe jewel cha 2 @changsha morale=4
xiangnang 香囊 Fragrant_Pouch jewel cha 1 @wu support=4
`;

export const TREASURES = {};
for (const line of ROWS.trim().split('\n')) {
  const [id, zh, en, kind, ability, amount, holder, list = ''] = line.trim().split(/\s+/);
  const effects = {};
  for (const pair of list.split(',').filter(Boolean)) {
    const [k, v] = pair.split('=');
    effects[k] = +v;
  }
  TREASURES[id] = {
    id,
    zh,
    en: en.replace(/_/g, ' '),
    kind,
    ability,
    amount: +amount,
    holder: holder === '-' ? null : holder.startsWith('@') ? { city: holder.slice(1) } : { general: holder },
    effects
  };
}
