// 天下的地图：十三州、七十六座城、十一座关隘、三十四处渡口和港口，以及它们之间的道路、水路和海路。位置用经纬度写，
// 由 `project` 换成地图坐标；城的规模（1 到 5）定了人口、田地和市场的上限。
// The map of the realm: thirteen provinces, seventy-six cities, eleven passes and thirty-four ferries and ports, and the
// roads, rivers and sea lanes between them. Places are written in longitude and latitude and turned into map units by
// `project`; a city's size (1 to 5) sets the ceiling of its people, fields and markets.

/** The map's size in units, and the longitude and latitude it spans. */
export const MAP = { width: 3600, height: 2600, west: 93, east: 125, north: 43.5, south: 18.5 };

/** Longitude and latitude to map units. */
export function project(lon, lat) {
  return {
    x: ((lon - MAP.west) / (MAP.east - MAP.west)) * MAP.width,
    y: ((MAP.north - lat) / (MAP.north - MAP.south)) * MAP.height
  };
}

export const PROVINCES = {
  sili: ['司隶', 'Sili'],
  yu: ['豫州', 'Yu'],
  yan: ['兖州', 'Yan'],
  xu: ['徐州', 'Xu'],
  qing: ['青州', 'Qing'],
  jizhou: ['冀州', 'Ji'],
  you: ['幽州', 'You'],
  bing: ['并州', 'Bing'],
  liang: ['凉州', 'Liang'],
  yi: ['益州', 'Yi'],
  jing: ['荆州', 'Jing'],
  yang: ['扬州', 'Yang'],
  jiao: ['交州', 'Jiao']
};

// City rows: id, Chinese, English, province, longitude, latitude, size, people (in ten thousands), traits.
// Traits: r by a great river, c by the sea, m in the mountains, p on a wide plain, w strong walls, b by the frontier tribes.
const CITY_ROWS = `
luoyang 洛阳 Luoyang sili 112.45 34.65 5 90 pw
changan 长安 Chang'an sili 108.95 34.27 5 80 pw
hongnong 弘农 Hongnong sili 110.85 34.55 2 22 m
henei 河内 Henei sili 113.1 35.2 3 38 p
hedong 河东 Hedong sili 111.0 35.15 3 34 p
fufeng 扶风 Fufeng sili 107.7 34.4 3 28 p
xuchang 许昌 Xuchang yu 113.85 34.0 4 52 p
runan 汝南 Runan yu 114.5 33.0 4 60 p
qiao 谯郡 Qiao yu 115.78 33.85 3 36 p
xiaopei 小沛 Xiaopei yu 116.9 34.6 2 24 p
chen 陈国 Chen yu 114.9 33.7 3 32 p
chenliu 陈留 Chenliu yan 114.5 34.75 3 40 p
puyang 濮阳 Puyang yan 115.0 35.75 3 34 pr
changyi 昌邑 Changyi yan 116.2 35.25 3 30 p
taishan 泰山 Taishan yan 117.1 36.2 2 20 m
xiapi 下邳 Xiapi xu 117.95 34.3 4 42 pw
pengcheng 彭城 Pengcheng xu 117.2 34.25 3 36 p
langya 琅邪 Langya xu 118.4 35.2 3 30 c
guangling 广陵 Guangling xu 119.4 32.4 3 32 rc
linzi 临淄 Linzi qing 118.3 36.85 4 46 p
beihai 北海 Beihai qing 119.2 36.6 3 34 c
pingyuan 平原 Pingyuan qing 116.4 37.15 3 30 p
donglai 东莱 Donglai qing 120.4 37.5 2 22 c
ye 邺城 Ye jizhou 114.4 36.3 5 56 pw
nanpi 南皮 Nanpi jizhou 116.7 38.05 3 36 pc
julu 巨鹿 Julu jizhou 115.0 37.25 3 40 p
changshan 常山 Changshan jizhou 114.5 38.1 3 34 m
zhongshan 中山 Zhongshan jizhou 115.0 38.9 3 38 p
hejian 河间 Hejian jizhou 116.1 38.45 3 32 p
xindu 信都 Xindu jizhou 115.6 37.65 3 34 p
ji 蓟城 Ji you 116.4 39.9 4 36 pw
beiping 北平 Beiping you 117.9 40.0 2 18 b
liaoxi 辽西 Liaoxi you 119.6 40.6 2 16 b
liaodong 辽东 Liaodong you 123.0 41.2 3 24 b
dai 代郡 Dai you 114.2 40.15 2 16 bm
jinyang 晋阳 Jinyang bing 112.55 37.85 4 34 w
shangdang 上党 Shangdang bing 113.1 36.2 2 22 m
xihe 西河 Xihe bing 111.15 37.5 2 14 mb
yanmen 雁门 Yanmen bing 112.8 39.3 2 16 b
yunzhong 云中 Yunzhong bing 111.6 40.8 1 10 b
tianshui 天水 Tianshui liang 105.7 34.6 3 26 m
longxi 陇西 Longxi liang 104.0 35.4 2 18 mb
anding 安定 Anding liang 106.7 35.55 2 16 b
jincheng 金城 Jincheng liang 103.6 36.1 2 14 rb
wuwei 武威 Wuwei liang 102.6 37.9 3 20 b
dunhuang 敦煌 Dunhuang liang 94.7 40.1 2 12 b
chengdu 成都 Chengdu yi 104.05 30.65 5 70 pw
hanzhong 汉中 Hanzhong yi 107.0 33.07 3 34 m
zitong 梓潼 Zitong yi 105.15 31.65 2 22 m
baxi 巴西 Baxi yi 106.0 31.55 2 24 m
jiangzhou 江州 Jiangzhou yi 106.55 29.55 3 34 r
yongan 永安 Yong'an yi 109.5 31.05 2 16 rm
yuexi 越巂 Yuexi yi 102.25 27.9 2 14 mb
jianning 建宁 Jianning yi 103.8 25.5 2 18 b
yongchang 永昌 Yongchang yi 99.15 25.1 2 16 b
wan 宛城 Wan jing 112.53 33.0 4 50 p
xiangyang 襄阳 Xiangyang jing 112.14 32.0 4 46 rw
jiangling 江陵 Jiangling jing 112.2 30.35 4 44 r
xiakou 夏口 Xiakou jing 114.3 30.55 3 30 r
changsha 长沙 Changsha jing 113.0 28.2 3 38 r
wuling 武陵 Wuling jing 111.7 29.05 2 26 m
lingling 零陵 Lingling jing 111.6 26.4 2 22 m
shangyong 上庸 Shangyong jing 110.2 32.3 2 16 m
shouchun 寿春 Shouchun yang 116.8 32.6 4 48 rw
lujiang 庐江 Lujiang yang 116.7 31.05 3 30 r
jianye 建业 Jianye yang 118.8 32.05 4 40 rw
wu 吴郡 Wu yang 120.6 31.3 4 44 c
kuaiji 会稽 Kuaiji yang 120.6 30.0 3 36 c
danyang 丹阳 Danyang yang 118.7 30.9 3 32 m
yuzhang 豫章 Yuzhang yang 115.9 28.7 3 34 r
chaisang 柴桑 Chaisang yang 115.95 29.7 2 20 r
jianan 建安 Jian'an yang 118.3 27.0 2 16 m
nanhai 南海 Nanhai jiao 113.27 23.13 3 26 c
cangwu 苍梧 Cangwu jiao 111.3 23.5 2 20 r
hepu 合浦 Hepu jiao 109.2 21.7 2 14 c
jiaozhi 交趾 Jiaozhi jiao 105.9 21.0 3 30 rb
`;

// Passes: id, Chinese, English, province, longitude, latitude, how hard it is to take (1 to 5).
const PASS_ROWS = `
hulao 虎牢关 Hulao Pass sili 113.25 34.8 5
tongguan 潼关 Tong Pass sili 110.25 34.6 5
wuguan 武关 Wu Pass jing 110.9 33.6 4
sanguan 散关 San Pass sili 106.9 34.2 4
yangping 阳平关 Yangping Pass yi 106.2 33.15 5
jiange 剑阁 Jiange yi 105.55 32.2 5
tianjing 天井关 Tianjing Pass bing 112.9 35.5 3
juyong 居庸关 Juyong Pass you 116.0 40.35 4
lulong 卢龙塞 Lulong Fort you 118.8 40.3 3
hefei 合肥 Hefei yang 117.25 31.85 4
yiling 夷陵 Yiling jing 111.3 30.7 3
`;

// Ferries and ports: id, Chinese, English, province, longitude, latitude, kind (r a river ferry, s a sea port).
const PORT_ROWS = `
mengjin 孟津 Mengjin sili 112.75 34.95 r
yanjin 延津 Yanjin yan 114.15 35.3 r
baima 白马津 Baima yan 114.6 35.5 r
pingyuanjin 平原津 Pingyuan Ford qing 116.2 36.75 r
puban 蒲阪津 Puban sili 110.35 34.95 r
junzijin 君子津 Junzi Ford bing 111.3 39.9 r
hanjin 汉津 Hanjin jing 113.2 30.75 r
huaiyin 淮阴 Huaiyin xu 119.0 33.55 r
zigui 秭归 Zigui jing 110.65 30.95 r
gongan 公安 Gong'an jing 112.25 29.95 r
baqiu 巴丘 Baqiu jing 113.1 29.35 r
wulin 乌林 Wulin jing 113.55 30.0 r
chibi 赤壁 Red Cliffs jing 113.95 29.75 r
qichun 蕲春 Qichun jing 115.35 30.25 r
wankou 皖口 Wankou yang 116.95 30.5 r
ruxu 濡须口 Ruxu yang 117.85 31.4 r
niuzhu 牛渚 Niuzhu yang 118.45 31.55 r
jingkou 京口 Jingkou yang 119.7 31.95 r
pengze 彭泽 Pengze yang 116.35 29.25 r
fuling 涪陵 Fuling yi 107.4 29.7 r
jiangyang 江阳 Jiangyang yi 105.45 28.9 r
xiangnan 湘南 Xiangnan jing 112.6 27.3 r
bushan 布山 Bushan jiao 110.1 23.1 r
qiantang 钱唐 Qiantang yang 120.2 30.4 r
tajin 沓津 Tajin you 121.5 38.95 s
jieshi 碣石 Jieshi you 119.2 39.65 s
zhangwu 章武 Zhangwu jizhou 117.2 38.4 s
buqi 不其 Buqi qing 120.4 36.35 s
gouzhang 句章 Gouzhang yang 121.45 29.9 s
zhangan 章安 Zhang'an yang 121.3 28.8 s
dongye 东冶 Dongye yang 119.3 26.1 s
jieyang 揭阳 Jieyang jiao 116.4 23.6 s
xuwen 徐闻 Xuwen jiao 110.2 20.4 s
zhuya 珠崖 Zhuya jiao 110.3 19.6 s
`;

// Links: a road unless marked ~ (a river, by boat or along its bank) or = (the sea, ships only).
const LINK_ROWS = `
luoyang-hulao luoyang-mengjin luoyang-hongnong luoyang-xuchang luoyang-wan
hulao-chenliu mengjin-henei henei-tianjing henei-ye henei-yanjin tianjing-shangdang
shangdang-jinyang shangdang-ye hongnong-tongguan hongnong-hedong tongguan-changan tongguan-puban
puban-hedong hedong-jinyang hedong-xihe changan-fufeng changan-wuguan changan-anding
fufeng-sanguan fufeng-tianshui fufeng-anding sanguan-hanzhong tianshui-longxi tianshui-yangping
tianshui-anding longxi-jincheng jincheng-wuwei wuwei-dunhuang anding-xihe
hanzhong-yangping hanzhong-shangyong hanzhong-baxi yangping-jiange jiange-zitong
zitong-chengdu zitong-baxi baxi-jiangzhou chengdu-jiangzhou chengdu-yuexi chengdu-jiangyang
jiangzhou~jiangyang jiangzhou~fuling fuling~yongan yongan~zigui zigui~yiling yiling-jiangling
jiangling~gongan jiangling-xiangyang jiangling-hanjin gongan-wuling gongan~baqiu wuling-changsha
wuling-lingling baqiu-changsha baqiu~wulin baqiu~chibi changsha-xiangnan changsha-yuzhang
xiangnan-lingling lingling-cangwu cangwu-nanhai cangwu~bushan bushan-hepu hepu-xuwen
hepu-jiaozhi xuwen=zhuya jiaozhi-jianning jianning-yongchang jianning-yuexi
xiangyang-wan xiangyang-shangyong xiangyang~hanjin wan-wuguan wan-xuchang wan-runan
hanjin~xiakou hanjin~wulin wulin~chibi chibi-xiakou xiakou~qichun qichun~chaisang
qichun~wankou qichun-lujiang chaisang~pengze chaisang-yuzhang pengze-yuzhang pengze~wankou
yuzhang-jianan jianan-dongye jianan-kuaiji dongye=zhangan dongye=jieyang jieyang=nanhai
zhangan=gouzhang zhangan-kuaiji gouzhang-kuaiji kuaiji-qiantang qiantang-wu qiantang-danyang
wu-jingkou wu-danyang jingkou~jianye jingkou~guangling jianye~niuzhu jianye-danyang
niuzhu-danyang niuzhu~ruxu ruxu-hefei ruxu~wankou wankou-lujiang lujiang-hefei hefei-shouchun
shouchun-runan shouchun-qiao shouchun~guangling guangling-huaiyin huaiyin-xiapi
xiapi-pengcheng xiapi-langya pengcheng-xiaopei pengcheng-qiao xiaopei-changyi xiaopei-chenliu
qiao-chen chen-xuchang chen-runan chen-chenliu runan-xuchang xuchang-chenliu chenliu-yanjin
chenliu-baima baima-puyang puyang-ye puyang-changyi puyang-pingyuanjin changyi-taishan
taishan-linzi taishan-langya langya-buqi buqi-beihai linzi-beihai linzi-pingyuan beihai-donglai
donglai=tajin tajin-liaodong pingyuan-pingyuanjin pingyuan-nanpi pingyuanjin-julu
julu-ye julu-xindu julu-changshan xindu-hejian xindu-nanpi changshan-zhongshan changshan-jinyang
zhongshan-hejian zhongshan-ji zhongshan-dai hejian-nanpi hejian-ji nanpi-zhangwu zhangwu=jieshi
zhangwu=donglai ji-juyong ji-beiping juyong-dai dai-yanmen yanmen-jinyang yanmen-yunzhong
yunzhong-junzijin junzijin-xihe xihe-jinyang beiping-lulong lulong-liaoxi liaoxi-liaodong
liaoxi-jieshi buqi=huaiyin jingkou=qiantang nanhai=xuwen
`;

function rows(text) {
  return text
    .trim()
    .split('\n')
    .map((line) => line.trim().split(/\s+/));
}

/** Every place on the map, by id. */
export const NODES = {};
for (const [id, zh, en, prov, lon, lat, size, people, traits = ''] of rows(CITY_ROWS))
  NODES[id] = { id, kind: 'city', zh, en, prov, lon: +lon, lat: +lat, size: +size, people: +people * 10000, traits };
for (const r of rows(PASS_ROWS)) {
  const hard = r.pop(),
    lat = r.pop(),
    lon = r.pop(),
    prov = r.pop(),
    [id, zh, ...en] = r;
  NODES[id] = { id, kind: 'pass', zh, en: en.join(' '), prov, lon: +lon, lat: +lat, size: 1, people: 0, hard: +hard, traits: 'mw' };
}
for (const r of rows(PORT_ROWS)) {
  const water = r.pop(),
    lat = r.pop(),
    lon = r.pop(),
    prov = r.pop(),
    [id, zh, ...en] = r;
  NODES[id] = { id, kind: 'port', zh, en: en.join(' '), prov, lon: +lon, lat: +lat, size: 1, people: 0, water, traits: water === 's' ? 'c' : 'r' };
}
for (const node of Object.values(NODES)) Object.assign(node, project(node.lon, node.lat));

/** Links between places: { a, b, kind: 'land' | 'river' | 'sea', length } in map units. */
export const LINKS = [];
/** For each place, the links that leave it. */
export const ADJACENT = {};
for (const word of LINK_ROWS.trim().split(/\s+/)) {
  const kind = word.includes('~') ? 'river' : word.includes('=') ? 'sea' : 'land';
  const [a, b] = word.split(/[-~=]/);
  if (!NODES[a] || !NODES[b]) throw new Error(`map: unknown place in ${word}`);
  const length = Math.hypot(NODES[a].x - NODES[b].x, NODES[a].y - NODES[b].y);
  const link = { a, b, kind, length };
  LINKS.push(link);
  (ADJACENT[a] ??= []).push({ to: b, link });
  (ADJACENT[b] ??= []).push({ to: a, link });
}

export const CITIES = Object.values(NODES).filter((n) => n.kind === 'city');
export const PASSES = Object.values(NODES).filter((n) => n.kind === 'pass');
export const PORTS = Object.values(NODES).filter((n) => n.kind === 'port');
