// 新人：百年之间史书上的人物会一个个谢世，各地每年也会有无名之士出仕或在野——姓名按汉时习惯取（单名或双名），
// 能力在中等上下，带一两种常见特性。他们的资料存进局面（`state.custom`），读档时重新登记到武将名册里。
// New blood: over a hundred years the people of the histories pass away one by one, and each year men of no great name
// come forward to serve or wait unattached — named as men of Han were (one character or two), of middling ability,
// with one or two common traits. Their entries are kept in the game (`state.custom`) and entered into the roll of
// generals again when a save is loaded.
import { GENERALS } from '../data/generals.mjs';
import { NODES } from '../data/map.mjs';
import { dateOf, forgetGeneralIds, random, serving } from './core.mjs';

// Surnames and given-name characters, each with its pinyin.
const SURNAMES =
  '王wang 李li 张zhang 刘liu 陈chen 杨yang 赵zhao 黄huang 周zhou 吴wu 徐xu 孙sun 胡hu 朱zhu 高gao 林lin 何he 郭guo 马ma 罗luo 梁liang 宋song 郑zheng 谢xie 韩han 唐tang 冯feng 于yu 董dong 程cheng 曹cao 袁yuan 邓deng 许xu 傅fu 沈shen 彭peng 吕lü 苏su 卢lu 蒋jiang 蔡cai 贾jia 丁ding 魏wei 薛xue 阎yan 潘pan 杜du 夏xia 钟zhong 田tian 任ren 姜jiang 范fan 方fang 石shi 姚yao 廖liao 邹zou 金jin 陆lu 郝hao 孔kong 崔cui 毛mao 秦qin 史shi 顾gu 侯hou 孟meng 段duan 雷lei 尹yin 文wen 庞pang 臧zang 鲍bao 满man 桓huan 羊yang 蒯kuai 阚kan 虞yu 骆luo 甘gan 凌ling 全quan 步bu 诸葛zhuge 司马sima 夏侯xiahou 公孙gongsun';
const GIVEN =
  '德de 忠zhong 义yi 文wen 武wu 仲zhong 伯bo 元yuan 公gong 孝xiao 安an 平ping 远yuan 明ming 达da 通tong 宣xuan 威wei 雄xiong 昭zhao 承cheng 宗zong 恭gong 敬jing 和he 礼li 贤xian 良liang 进jin 茂mao 隆long 兴xing 泰tai 康kang 宁ning 靖jing 毅yi 勇yong 猛meng 烈lie 奇qi 正zheng 直zhi 方fang 圭gui 璋zhang 瑜yu 琮cong 质zhi 纪ji 纲gang 统tong 绍shao 继ji 辅fu 弼bi 佐zuo 翊yi 谦qian 让rang 诚cheng 信xin 智zhi 略lüe 韬tao 策ce 度du 规gui 典dian 谟mo 彦yan 俊jun 杰jie 英ying 豪hao 景jing 晏yan 恢hui 弘hong 广guang 嘉jia 祥xiang 瑞rui 植zhi 林lin 岳yue 峻jun 泽ze 渊yuan 澄cheng 济ji 舒shu 衡heng 夔kui 嵩song 乂yi 艾ai 越yue 冲chong 朗lang 粲can';
const split = (text) =>
  text.split(' ').map((w) => {
    const i = w.search(/[a-zü]/);
    return { zh: w.slice(0, i), py: w.slice(i) };
  });
const SUR = split(SURNAMES),
  GIV = split(GIVEN);

const COMMON = ['yongmeng', 'tongyu', 'bingfa', 'nengli', 'zhongyi', 'shanshe', 'qibing', 'qiangbing', 'gongnu', 'zuozhan', 'xiaowei', 'neizheng', 'qinmin', 'shoujiang', 'tuxi', 'mubing', 'shishi', 'xungen', 'jianshou', 'shuishou', 'kuanhou', 'jiangmen', 'gongjin'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

/** Enter the game's own generals into the roll (after a load). */
export function registerCustom(state) {
  // Those of another game are taken out first.
  for (const id of Object.keys(GENERALS)) if (GENERALS[id].made) delete GENERALS[id];
  for (const g of state.custom ?? []) GENERALS[g.id] = g;
}

/** Make one new general, of age this year, at a place: serving a faction, or unattached. */
export function newGeneral(state, at, faction = null) {
  const year = dateOf(state.day).year;
  const s = SUR[Math.floor(random(state) * SUR.length)];
  const two = random(state) < 0.55;
  const a = GIV[Math.floor(random(state) * GIV.length)],
    b = GIV[Math.floor(random(state) * GIV.length)];
  const zh = s.zh + a.zh + (two && b.zh !== a.zh ? b.zh : '');
  const en = cap(s.py) + ' ' + cap(a.py) + (two && b.zh !== a.zh ? b.py : '');
  const id = 'n' + (state.nextId++).toString(36);
  // One strength, the rest middling.
  const stats = { lead: 0, war: 0, int: 0, pol: 0, cha: 0 };
  const keys = Object.keys(stats),
    strong = keys[Math.floor(random(state) * keys.length)];
  for (const k of keys) stats[k] = Math.round(28 + random(state) * 38 + (k === strong ? 14 + random(state) * 16 : 0));
  const traits = [COMMON[Math.floor(random(state) * COMMON.length)]];
  if (random(state) < 0.45) traits.push(COMMON[Math.floor(random(state) * COMMON.length)]);
  const owner = faction ? state.factions[faction] : null;
  const camp = owner ? GENERALS[owner.ruler].camp : 'H';
  const born = year - 16 - Math.floor(random(state) * 10);
  const g = { id, zh, en, born, died: born + 48 + Math.floor(random(state) * 24), home: at, stats, traits: [...new Set(traits)], camp, female: false, start: null, made: true };
  (state.custom ??= []).push(g);
  GENERALS[id] = g;
  state.generals[id] = { status: faction ? 'serving' : 'free', faction, at, loyalty: faction ? 70 : 0, exp: {}, treasures: [], died: g.died, known: false };
  forgetGeneralIds(state);
  return id;
}

/** Each year: powers short of officers find new ones among their people, and a few wanderers appear. */
export function yearlyNewBlood(state) {
  for (const f of Object.values(state.factions)) {
    if (!f.alive) continue;
    const cities = Object.keys(state.nodes).filter((id) => state.nodes[id].owner === f.id && NODES[id].kind === 'city');
    if (!cities.length) continue;
    const want = 4 + Math.round(cities.length * 1.6);
    const have = serving(state, f.id).length;
    const n = Math.min(3, Math.max(0, Math.ceil((want - have) / 3)));
    for (let i = 0; i < n; i++) newGeneral(state, cities[Math.floor(random(state) * cities.length)], f.id);
  }
  const all = Object.values(NODES).filter((n) => n.kind === 'city');
  const wanderers = 2 + Math.floor(random(state) * 3);
  for (let i = 0; i < wanderers; i++) newGeneral(state, all[Math.floor(random(state) * all.length)].id, null);
}
