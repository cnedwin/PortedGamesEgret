// Original, coarse strategic snapshots, not a reenactment or a claim that every
// county changes hands on an exact historical day. Stable faction IDs preserve
// save/UI compatibility when a house changes ruler (Sun Jian → Sun Ce → Sun Quan).
import { FACTIONS } from '../data/factions.mjs';
import { GENERALS } from '../data/generals.mjs';
import { NODES } from '../data/map.mjs';
import { dayOf } from './core.mjs';

export const SCENARIOS = Object.freeze({
  '184': { id: '184', year: 184, month: 2, zh: '184 · 黄巾起义', en: '184 · Yellow Turban Rising', about: ['群雄初起，可选择原有六条演义。', 'The lords rise. Choose any of the six original story routes.'] },
  '190': { id: '190', year: 190, month: 3, zh: '190 · 关东讨董', en: '190 · Coalition against Dong Zhuo', about: ['洛阳受董卓控制，关东诸侯暂结盟约。自由历史局，不补播旧演义。', 'Dong Zhuo holds the capital; the eastern lords share a temporary pact. A free campaign without earlier scripted events.'] },
  '200': { id: '200', year: 200, month: 1, zh: '200 · 官渡风云', en: '200 · Gathering at Guandu', about: ['袁绍据河北，曹操守许昌；孙策仍在江东，刘备暂据徐州。', 'Yuan Shao holds the north and Cao Cao guards Xu. Sun Ce leads the south-east; Liu Bei has a precarious foothold in Xu.'] },
  '208': { id: '208', year: 208, month: 10, zh: '208 · 赤壁前夜', en: '208 · Before the Red Cliffs', about: ['曹军南下，孙刘结盟；刘备立足夏口，荆南仍待争夺。', 'Cao marches south. Sun and Liu unite; Liu Bei holds Xiakou while southern Jing remains contested.'] },
  '219': { id: '219', year: 219, month: 7, zh: '219 · 汉中争雄', en: '219 · The Hanzhong Settlement', about: ['刘备已得汉中，关羽镇江陵；孙刘的荆州边界暗流涌动。', 'Liu Bei has taken Hanzhong and Guan Yu guards Jiangling. The Sun–Liu frontier in Jing is uneasy.'] }
});
export const scenarioOf = id => SCENARIOS[String(id)] ?? SCENARIOS['184'];
const words = text => text ? text.trim().split(/[\s,]+/).filter(Boolean) : [];
const provinceCities = (...provinces) => Object.values(NODES).filter(n => n.kind === 'city' && provinces.includes(n.prov)).map(n => n.id);
const group = (ruler, capital, cities, name = null) => ({ ruler, capital, cities: Array.isArray(cities) ? cities : words(cities), name });

function layout(year) {
  if (year === 190) {
    const out = Object.fromEntries(Object.values(FACTIONS)
      .filter(f => !['han', 'zhangjiao', 'zhangmancheng', 'bocai', 'dingyuan'].includes(f.id))
      .map(f => [f.id, group(f.ruler, f.seat, f.places.filter(id => NODES[id].kind === 'city'))]));
    out.dongzhuo = group('dongzhuo', 'luoyang', 'luoyang,changan,hongnong,hedong,longxi,tianshui');
    out.yuanshu = group('yuanshu', 'wan', 'wan,runan');
    out.menghuo = group('yongkai', 'jianning', 'jianning,yongchang', { zh: '南中诸部', en: 'Southern Clans' });
    return out;
  }
  const out = {
    caocao: group('caocao', 'xuchang', provinceCities('sili','yu','yan','xu','qing')),
    sunjian: group(year === 200 ? 'sunce' : 'sunquan', year === 200 ? 'wu' : year === 208 ? 'chaisang' : 'jianye', provinceCities('yang'), { zh: year === 200 ? '孙策' : '孙权', en: year === 200 ? 'Sun Ce' : 'Sun Quan' }),
    gongsundu: group(year === 200 ? 'gongsundu' : 'gongsunkang', 'liaodong', 'liaodong', year === 200 ? null : { zh: '公孙康', en: 'Gongsun Kang' }),
    shixie: group('shixie', 'jiaozhi', provinceCities('jiao')),
    menghuo: group('yongkai', 'jianning', 'jianning,yongchang,yuexi', { zh: '南中诸部', en: 'Southern Clans' })
  };
  if (year === 200) {
    out.yuanshao = group('yuanshao', 'ye', provinceCities('jizhou','you','bing').filter(id => id !== 'liaodong'));
    out.liubei = group('liubei', 'xiapi', 'xiapi,xiaopei');
    out.liubiao = group('liubiao', 'xiangyang', provinceCities('jing'));
    out.liuyan = group('liuzhang', 'chengdu', provinceCities('yi').filter(id => !['hanzhong','jianning','yongchang','yuexi'].includes(id)), { zh: '刘璋', en: 'Liu Zhang' });
    out.zhanglu = group('zhanglu', 'hanzhong', 'hanzhong');
    out.mateng = group('mateng', 'wuwei', 'wuwei,tianshui,longxi,anding');
    out.hansui = group('hansui', 'jincheng', 'jincheng,dunhuang');
    // Black Mountain's autonomous mountain camps are represented by Changshan.
    out.zhangyan = group('zhangyan', 'changshan', 'changshan');
  } else {
    out.caocao.cities.push(...provinceCities('jizhou','you','bing').filter(id => id !== 'liaodong'), 'wan','xiangyang','shouchun');
    out.liubei = group('liubei', year === 208 ? 'xiakou' : 'chengdu', year === 208 ? ['xiakou'] : [...provinceCities('yi').filter(id => !['jianning','yongchang','yuexi'].includes(id)), 'jiangling','wuling','shangyong']);
    if (year === 208) {
      out.caocao.cities.push('jiangling','shangyong');
      out.liuyan = group('liuzhang', 'chengdu', provinceCities('yi').filter(id => !['hanzhong','jianning','yongchang','yuexi'].includes(id)), { zh: '刘璋', en: 'Liu Zhang' });
      out.zhanglu = group('zhanglu', 'hanzhong', 'hanzhong');
      out.mateng = group('machao', 'wuwei', 'wuwei,tianshui,longxi,anding', { zh: '马超', en: 'Ma Chao' });
      out.hansui = group('hansui', 'jincheng', 'jincheng,dunhuang');
    } else {
      out.caocao.cities.push(...provinceCities('liang'));
      out.sunjian.cities.push('xiakou','changsha','lingling');
    }
    out.sunjian.cities = out.sunjian.cities.filter(id => id !== 'shouchun');
  }
  // Overlapping province claims are resolved explicitly, not object order.
  const claims = new Map();
  for (const [f, data] of Object.entries(out)) for (const id of data.cities) claims.set(id, f);
  for (const [f, data] of Object.entries(out)) data.cities = data.cities.filter(id => claims.get(id) === f);
  return out;
}

const assignments = {
  '190': {
    dongzhuo: 'lvbu,huaxiong,lijue,guosi,zhangji,zhangliao,jiaxu', caocao: 'xiahoudun,xiahouyuan,caoren,caohong',
    liubei: 'guanyu,zhangfei', yuanshao: 'yanliang,wenchou', hanfu: 'zhanghe,gaolan,jushou',
    sunjian: 'huanggai,chengpu,handang', liubiao: 'huangzhong',
    free: 'xunyu,guojia,xunyou,zhugeliang,pangtong,zhaoyun,xuhuang'
  },
  '200': {
    caocao: 'xunyu,xunyou,guojia,chengyu,xuhuang,zhangliao,yujin,zhangxiu,jiaxu,manchong,liuye,caopi',
    yuanshao: 'yanliang,wenchou,zhanghe,gaolan,jushou,tianfeng,shenpei,fengji,guotu,xuyou,yuantan,yuanshang,yuanxi,chenlin',
    liubei: 'guanyu,zhangfei,zhaoyun,sunqian,jianyong,mizhu,mifang',
    sunjian: 'zhouyu,zhangzhao,zhanghong,taishici,huanggai,chengpu,handang,zhoutai,sunquan,lvmeng',
    liubiao: 'huangzhong,liuqi,liucong,caimao,zhangyun,kuailiang,kuaiyue,wangcan',
    liuyan: 'fazheng,zhangsong,mengda,wuyi,huangquan', mateng: 'machao,madai,pangde',
    free: 'zhugeliang,pangtong,jiangwan,feiyi,weiyan,ganning,luxun,xushu,dengzhi,liaohua'
  },
  '208': {
    caocao: 'xunyu,xunyou,chengyu,xuhuang,zhangliao,yujin,zhanghe,jiaxu,manchong,liuye,caopi,simayi,liucong,caimao,zhangyun,xushu',
    liubei: 'guanyu,zhangfei,zhaoyun,zhugeliang,sunqian,jianyong,mizhu,mifang,liuqi,chendao,guanping,liufeng,yiji,zhoucang,huangyueying,zhugejun',
    sunjian: 'zhouyu,lusu,zhangzhao,zhanghong,taishici,huanggai,chengpu,handang,zhoutai,lvmeng,ganning,luxun,lingtong',
    liuyan: 'fazheng,zhangsong,mengda,wuyi,huangquan,dengzhi', mateng: 'machao,madai,pangde',
    free: 'huangzhong,weiyan,pangtong,jiangwan,feiyi,liaohua'
  },
  '219': {
    caocao: 'caopi,simayi,xuhuang,zhangliao,yujin,zhanghe,jiaxu,manchong,liuye,caoren,caohong,xiahoudun,jiangwei,xushu',
    liubei: 'guanyu,zhangfei,zhaoyun,zhugeliang,huangzhong,weiyan,fazheng,machao,madai,mengda,huangquan,jiangwan,feiyi,wuyi,liaohua,wangping,mizhu,mifang',
    sunjian: 'lusu,lvmeng,luxun,ganning,lingtong,zhoutai,huanggai,chengpu,handang,zhangzhao,zhanghong', free: 'liuzhang'
  }
};

/** State-local, modest age offsets: older officers keep strategy and governance. */
export function ageAdjustment(age) {
  const result = { lead: 0, war: 0, int: 0, pol: 0, cha: 0 };
  if (age < 20) Object.assign(result, { lead: -6, war: -3, int: -5, pol: -6 });
  else if (age < 25) Object.assign(result, { lead: -3, int: -2, pol: -3 });
  else if (age >= 65) Object.assign(result, { lead: -3, war: -8 });
  else if (age >= 55) Object.assign(result, { lead: -1, war: -4 });
  return result;
}

/** Apply only to a new game. No static officer/faction entry is mutated. */
export function applyScenario(state, spec) {
  if (spec.year === 184) return;
  const year = spec.year, groups = layout(year), active = Object.keys(groups);
  for (const f of Object.values(state.factions)) {
    f.alive = false; f.treaties = {}; f.coin = 0; f.grain = 0;
  }
  for (const node of Object.values(state.nodes)) { node.owner = null; node.governor = null; }
  for (const [id, data] of Object.entries(groups)) {
    const f = state.factions[id];
    Object.assign(f, { alive: true, ruler: data.ruler, capital: data.capital, name: data.name, fame: 200 + data.cities.length * 8,
      coin: 4200 + data.cities.length * 750, grain: 22000 + data.cities.length * 7000 });
    for (const city of data.cities) state.nodes[city].owner = id;
  }
  // A pass/ferry follows the nearest owned city in its province. Major front
  // gates and naval crossings below explicitly override this coarse heuristic.
  for (const n of Object.values(NODES)) if (n.kind !== 'city') {
    const cities = Object.values(NODES).filter(c => c.kind === 'city' && c.prov === n.prov && state.nodes[c.id].owner);
    cities.sort((a,b) => Math.hypot(a.x-n.x,a.y-n.y)-Math.hypot(b.x-n.x,b.y-n.y));
    state.nodes[n.id].owner = cities.length ? state.nodes[cities[0].id].owner : null;
  }
  if (year === 190) for (const id of ['hulao','tongguan','mengjin']) state.nodes[id].owner = 'dongzhuo';
  if (year >= 200) { state.nodes.baima.owner = 'caocao'; state.nodes.hefei.owner = 'caocao'; }
  if (year === 208) for (const id of ['chibi','wulin','gongan']) state.nodes[id].owner = 'sunjian';
  if (year === 219) for (const id of ['gongan','yiling','zigui','yangping']) state.nodes[id].owner = 'liubei';
  for (const [id, n] of Object.entries(state.nodes)) {
    const data = NODES[id], owner = n.owner;
    n.support = owner ? 62 : 45; n.order = owner ? 65 : 50; n.training = owner ? 60 : 35;
    n.troops = data.kind === 'city' ? data.size * (owner ? 3200 : 1400) : data.kind === 'pass' ? data.hard * (owner ? 1700 : 900) : owner ? 1000 : 500;
    // A large nominal map footprint is not the same as a fully mobilised army.
    // In 200 the northern coalition has the larger field strength; Cao's court
    // territories start with a leaner levy and treasury, not an ahistorical edge.
    if (year === 200 && owner === 'caocao') n.troops = Math.round(n.troops * .75);
    if (year === 200 && owner === 'yuanshao') n.troops = Math.round(n.troops * 1.55);
  }
  if (year === 200) {
    state.factions.caocao.coin = Math.round(state.factions.caocao.coin * .75);
    state.factions.caocao.grain = Math.round(state.factions.caocao.grain * .85);
    state.factions.yuanshao.coin = Math.round(state.factions.yuanshao.coin * 1.4);
    state.factions.yuanshao.grain = Math.round(state.factions.yuanshao.grain * 1.4);
  }
  const overrides = new Map();
  for (const [f, text] of Object.entries(assignments[String(year)])) for (const id of words(text)) if (GENERALS[id]) overrides.set(id, f);
  const shifted = { han: year === 190 ? 'dongzhuo' : 'caocao', hanfu: 'yuanshao', dingyuan: 'dongzhuo', baoxin: 'caocao', zhangmiao: 'caocao', liudai: 'caocao', taoqian: 'caocao', kongrong: 'caocao', gongsunzan: 'yuanshao', liuyu: 'yuanshao' };
  for (const [id, s] of Object.entries(state.generals)) {
    const g = GENERALS[id];
    Object.assign(s, { status: g.died < year || (year === 208 && id === 'liubiao') ? 'dead' : 'unborn', faction: null, at: null, loyalty: 0, known: false,
      exp: {}, treasures: [], statAdjust: ageAdjustment(year-g.born) });
    if (s.status === 'dead' || g.born + 15 > year) continue;
    // A fictional lifespan randomised from 184 may land before this start.
    // Officers demonstrably alive at the snapshot receive future lifetime.
    if (state.options.lifespan === 'fiction') s.died = Math.max(s.died, year + 3);
    let f = overrides.get(id);
    if (f === undefined) {
      const original = g.start?.faction ?? g.start?.house;
      if (original && groups[original]) f = original;
      else if (original && groups[shifted[original]]) f = shifted[original];
      else if (year >= 200 && g.camp === 'W') f = 'caocao';
      else if (year >= 200 && g.camp === 'U') f = 'sunjian';
      // A later Shu allegiance is not evidence of service at Xiakou in 208.
      // Keep that one-town opening to its named followers; future Yi/Jing
      // talent remains discoverable rather than drawing the entire court's pay.
      else if (year >= 219 && g.camp === 'S') f = 'liubei';
    }
    if (f && f !== 'free' && groups[f]) {
      const cities = groups[f].cities;
      const hash = [...id].reduce((v,c) => v+c.charCodeAt(0),0);
      const at = state.nodes[g.home]?.owner === f ? g.home : cities[hash % cities.length];
      Object.assign(s, { status: 'serving', faction: f, at, loyalty: 78 });
    } else Object.assign(s, { status: 'free', at: g.home, known: false });
  }
  for (const id of active) {
    const f = state.factions[id];
    Object.assign(state.generals[f.ruler], { status: 'serving', faction: id, at: f.capital, loyalty: 100 });
  }
  if (year === 219) {
    state.generals.guanyu.at = 'jiangling'; state.generals.weiyan.at = 'hanzhong';
  }
  const ally = (a,b,days,kind='ally',regard=65) => {
    if (!groups[a] || !groups[b]) return;
    state.factions[a].treaties[b] = { kind, until: state.day+days };
    state.factions[b].treaties[a] = { kind, until: state.day+days };
    state.factions[a].relations[b] = state.factions[b].relations[a] = regard;
  };
  if (year === 190) {
    const coalition = ['caocao','yuanshao','yuanshu','sunjian','hanfu','zhangmiao','liudai','baoxin','wangkuang'];
    for (let a=0;a<coalition.length;a++) for (let b=a+1;b<coalition.length;b++) ally(coalition[a],coalition[b],180);
    for (const id of coalition) state.factions[id].relations.dongzhuo = state.factions.dongzhuo.relations[id] = -85;
  } else if (year === 200) ally('liubei','yuanshao',120);
  else if (year === 208) ally('liubei','sunjian',540);
  else ally('liubei','sunjian',75,'truce',5);
  if (year >= 200 && groups.yuanshao) state.factions.caocao.relations.yuanshao = state.factions.yuanshao.relations.caocao = -85;
  if (year >= 208) {
    for (const id of ['liubei','sunjian']) state.factions.caocao.relations[id] = state.factions[id].relations.caocao = -85;
  }
  // Story rules are for an 184 campaign. A dated snapshot is a free campaign,
  // so neither expired events nor unresolved historical events replay at entry.
  state.branch = 'free'; state.inbox = []; state.fired = {}; state.flags = {};
}
