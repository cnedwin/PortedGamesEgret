// 中平元年（184 年）的三十四路势力：君主、旗号、颜色、阵营，开局占有的城、关、津。其余城池空着，由当地守军和在野
// 人才守着，谁先拿下归谁。
// The thirty-four powers of the first year of Zhongping (184): each ruler, banner, colour and camp, and the cities,
// passes and ferries each holds at the start. The other cities stand empty, held by local garrisons and unattached
// talent, for whoever takes them first.

// Rows: id, Chinese, English, ruler, banner character, colour, camp, places (the first is the seat).
// Camps: W Wei, S Shu, U Wu, H the Han court and the lords, Y the Yellow Turbans, N the southern tribes, X the north-west.
const ROWS = `
han 汉室 Han_Court hejin 汉 d8b54a H luoyang,hongnong,changan,hulao,tongguan,mengjin
zhangjiao 太平道 Way_of_Great_Peace zhangjiao 黄 e0c040 Y julu,xindu,pingyuanjin
zhangmancheng 南阳黄巾 Nanyang_Turbans zhangmancheng 巾 c9a93a Y wan
bocai 颍川黄巾 Yingchuan_Turbans bocai 波 b89a30 Y xuchang
dongzhuo 董卓 Dong_Zhuo dongzhuo 董 5a4a8a X longxi,tianshui
caocao 曹操 Cao_Cao caocao 曹 3a5ca8 W qiao
liubei 刘备 Liu_Bei liubei 刘 3f8f4a S pingyuan
sunjian 孙坚 Sun_Jian sunjian 孙 c0463a U changsha
yuanshao 袁绍 Yuan_Shao yuanshao 袁 b8922e H nanpi
yuanshu 袁术 Yuan_Shu yuanshu 仲 8a6a2a H runan
liuyan 刘焉 Liu_Yan liuyan 焉 6a8a9a H chengdu,jiangzhou,zitong,jiange,jiangyang
liubiao 刘表 Liu_Biao liubiao 表 4a8a8a H xiangyang,jiangling,xiakou,hanjin
gongsunzan 公孙瓒 Gongsun_Zan gongsunzan 瓒 e8e2d0 H beiping,liaoxi,lulong
liuyu 刘虞 Liu_Yu liuyu 虞 8aa070 H ji,juyong
taoqian 陶谦 Tao_Qian taoqian 陶 7a8a5a H xiapi,pengcheng
kongrong 孔融 Kong_Rong kongrong 孔 9a7aa0 H beihai
mateng 马腾 Ma_Teng mateng 马 2e6e6a X wuwei
hansui 韩遂 Han_Sui hansui 韩 6a5a3a X jincheng
dingyuan 丁原 Ding_Yuan dingyuan 丁 8a3a5a H jinyang
zhanglu 张鲁 Zhang_Lu zhanglu 鲁 a89a6a H hanzhong,yangping
gongsundu 公孙度 Gongsun_Du gongsundu 度 5a7a9a H liaodong,tajin
shixie 士燮 Shi_Xie shixie 士 6a9a6a H jiaozhi
liuyao 刘繇 Liu_Yao liuyao 繇 7a6a9a H danyang,niuzhu
wanglang 王朗 Wang_Lang wanglang 王 9a9a7a H kuaiji,gouzhang
yanbaihu 严白虎 Yan_Baihu yanbaihu 严 a8a8a8 H wu
zhangyan 黑山军 Black_Mountain zhangyan 黑 3a3a3a Y changshan
zhangyang 张杨 Zhang_Yang zhangyang 杨 7a8aa8 H shangdang,tianjing
wangkuang 王匡 Wang_Kuang wangkuang 匡 a87a5a H henei
zhangmiao 张邈 Zhang_Miao zhangmiao 邈 5a8a7a H chenliu,yanjin
liudai 刘岱 Liu_Dai liudai 岱 8a8a5a H changyi
baoxin 鲍信 Bao_Xin baoxin 鲍 6a6a8a H taishan
liuchong 陈王 Prince_of_Chen liuchong 陈 a85a7a H chen
hanfu 韩馥 Han_Fu hanfu 馥 9a6a4a H ye,baima
menghuo 南蛮 Southern_Tribes menghuo 蛮 6a3a2a N jianning,yongchang
`;

export const FACTIONS = {};
for (const line of ROWS.trim().split('\n')) {
  const [id, zh, en, ruler, flag, colour, camp, places] = line.trim().split(/\s+/);
  const list = places.split(',');
  FACTIONS[id] = { id, zh, en: en.replace(/_/g, ' '), ruler, flag, colour: parseInt(colour, 16), camp, seat: list[0], places: list };
}

/** Banner characters and colours for powers that rise later (a successor state, or a lord who declares himself). */
export const LATER = {
  jin: { zh: '晋', en: 'Jin', flag: '晋', colour: 0x2a3a6a, camp: 'J' },
  wei: { zh: '魏', en: 'Wei', flag: '魏', colour: 0x3a5ca8, camp: 'W' },
  shu: { zh: '汉', en: 'Shu Han', flag: '蜀', colour: 0x3f8f4a, camp: 'S' },
  wu: { zh: '吴', en: 'Wu', flag: '吴', colour: 0xc0463a, camp: 'U' },
  rebel: { zh: '叛军', en: 'Rebels', flag: '叛', colour: 0x7a7a7a, camp: 'H' }
};
