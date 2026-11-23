// 演义：六条路线。五条跟着一位君主走史事（曹操的霸业、刘备的季汉、孙氏的江东、董卓的西凉、袁绍的河北），每条有自己的
// 事件、抉择和奖励，也有"假如"——赤壁曹操得胜、夷陵陆逊兵败、五丈原续命北伐功成；第六条"自由书写"没有剧本事件。
// 天下大势（十常侍之乱、讨董、迁都、连环计、各家称帝、司马代魏）在五条史事路线里都会发生。
// The romance: six branches. Five follow one ruler through history (Cao Cao's hegemony, Liu Bei's Han, the Suns'
// south-east, Dong Zhuo's west, Yuan Shao's north), each with its own events, choices and rewards, and its what-ifs —
// Cao Cao wins at the Red Cliffs, Lu Xun is beaten at Yiling, Zhuge Liang's life is lengthened and the northern campaign
// succeeds; the sixth, "write your own", has no scripted events. The great turns of the age (the eunuchs' coup, the
// coalition, the move of the capital, the chain stratagem, the emperors' crowning, the Simas taking Wei) happen in all
// five history branches.
import { GENERALS } from '../data/generals.mjs';
import { NODES } from '../data/map.mjs';
import { clamp, dateOf, dayOf, note, random, serving, stat } from './core.mjs';
import { absorb } from './diplomacy.mjs';
import { battle, nearestFriendly, order } from './military.mjs';
import { die, join, succeed } from './people.mjs';

export const BRANCHES = {
  caocao: { faction: 'caocao', zh: '曹魏霸业', en: "Cao Cao's Hegemony", about: ['挟天子以令诸侯，官渡破袁，问鼎赤壁。', 'Hold the emperor, break Yuan Shao at Guandu, and reach for the south at the Red Cliffs.'] },
  liubei: { faction: 'liubei', zh: '季汉春秋', en: "Liu Bei's Han", about: ['桃园结义，三顾茅庐，入蜀称王，北伐中原。', 'Sworn in the peach garden, the thrice-visited cottage, a kingdom in Shu, and the march north.'] },
  sunjian: { faction: 'sunjian', zh: '江东基业', en: 'The South-East of the Suns', about: ['孙坚得玺，孙策平江东，孙权赤壁破曹。', 'Sun Jian finds the seal, Sun Ce takes the south-east, Sun Quan breaks Cao at the Red Cliffs.'] },
  dongzhuo: { faction: 'dongzhuo', zh: '西凉铁骑', en: 'The Riders of Liang', about: ['入京废立，虎牢拒关东，迁都长安，连环计生死。', 'Into the capital, holding Hulao against the east, the move to Chang\'an, and the chain stratagem.'] },
  yuanshao: { faction: 'yuanshao', zh: '河北霸主', en: 'Lord of the North', about: ['夺冀州，界桥破白马，易京灭公孙，官渡决胜负。', 'Take Ji, break the White Horses at Jieqiao, end Gongsun at Yijing, and stake all at Guandu.'] },
  free: { faction: null, zh: '自由书写', en: 'Write Your Own', about: ['没有剧本，任何势力，天下由你书写。', 'No script, any power: the age is yours to write.'] }
};

const alive = (s, id) => ['serving', 'free', 'captive'].includes(s.generals[id]?.status);
const serves = (s, id, f) => s.generals[id]?.status === 'serving' && s.generals[id].faction === f;
const live = (s, f) => s.factions[f]?.alive;
const owns = (s, f, place) => s.nodes[place]?.owner === f;
const P = (s) => s.player;
const fame = (s, f, n) => (s.factions[f].fame += n);
function rename(s, f, zh, en, flag) {
  s.factions[f].name = { zh, en };
  s.factions[f].flag = flag;
}
function bring(s, id, f) {
  if (alive(s, id) && !serves(s, id, f)) join(s, id, f, s.factions[f].capital);
}
function ally(s, a, b, days) {
  if (!live(s, a) || !live(s, b)) return;
  s.factions[a].treaties[b] = { kind: 'ally', until: s.day + days };
  s.factions[b].treaties[a] = { kind: 'ally', until: s.day + days };
}
/** An army appears for an event, without the cost of mustering. */
function spawn(s, f, at, commander, troops, unit = 'spear', deputies = []) {
  if (!live(s, f) || !s.generals[commander] || s.generals[commander].status !== 'serving') return null;
  const id = 'a' + s.nextId++;
  s.armies[id] = { id, faction: f, commander, deputies: deputies.filter((d) => serves(s, d, f)), troops, unit, formation: 'fishscale', morale: 80, training: 70, grain: troops / 4, at, link: null, path: [], home: at, target: null, besieging: null };
  for (const g of [commander, ...s.armies[id].deputies]) s.generals[g].at = id;
  return id;
}
/** The player's best general near a place, to lead an event army. */
function champion(s, near) {
  const list = serving(s, P(s)).filter((g) => s.nodes[s.generals[g].at]);
  list.sort((a, b) => stat(s, b, 'lead') + stat(s, b, 'war') - stat(s, a, 'lead') - stat(s, a, 'war'));
  const at = nearestFriendly(s, P(s), near) ?? s.factions[P(s)].capital;
  return { general: list[0], at };
}
/** A special battle for the player: his event army against theirs. */
function eventBattle(s, special, place, mine, theirs, mineAttacks = true) {
  const kind = special === 'chibi' ? 'naval' : 'field';
  const ids = [mine, theirs].filter(Boolean);
  if (ids.length < 2) return;
  battle(s, { kind, place: { node: place }, attackers: [mineAttacks ? mine : theirs], defenders: [mineAttacks ? theirs : mine], special });
  s.flags['special_' + special] = s.day;
}

/**
 * The events. branch: which branch has it ('history' for every branch but the free one). at: [year, month] from which
 * it may fire, until: the last year. when: whether it fires. choices: what the player may do (each with run); auto: what
 * happens when the player is not asked.
 */
export const EVENTS = [
  // ——— The age, in every history branch ———
  {
    id: 'eunuchs',
    branch: 'history',
    at: [189, 1],
    until: 190,
    when: (s) => live(s, 'han') && alive(s, 'hejin'),
    title: ['十常侍之乱', 'The Ten Attendants'],
    text: ['大将军何进谋诛宦官，反被张让等诱入宫中杀害。袁绍引兵入宫，宦官尽诛，京师大乱。', 'The Grand General He Jin plotted against the eunuchs and was lured into the palace and killed. Yuan Shao led troops in and put the eunuchs to the sword; the capital fell into chaos.'],
    auto: (s) => {
      die(s, 'hejin', 'battle');
      for (const id of ['zhangrang', 'zhaozhong', 'jianshuo']) if (alive(s, id)) die(s, id, 'executed');
    }
  },
  {
    id: 'turbansFall',
    branch: 'history',
    at: [184, 3],
    until: 186,
    when: (s) => live(s, 'zhangjiao') && s.player !== 'zhangjiao' && ['zhangjiao', 'zhangbaoyt', 'zhangliang'].every((id) => s.generals[id].status === 'dead'),
    title: ['黄巾败亡', 'The Yellow Turbans Broken'],
    text: ['张角病死，张宝、张梁相继战殁于广宗、下曲阳。太平道群龙无首，黄巾余众四散。', 'Zhang Jiao died of illness, and Zhang Bao and Zhang Liang fell in turn at Guangzong and Xiaquyang. The Way of Great Peace had no head, and the Yellow Turbans scattered.'],
    auto: (s) => scatter(s, 'zhangjiao')
  },
  {
    id: 'dongEnters',
    branch: 'history',
    at: [189, 9],
    until: 191,
    when: (s) => live(s, 'han') && live(s, 'dongzhuo') && s.player !== 'han' && s.branch !== 'dongzhuo',
    title: ['董卓入京', 'Dong Zhuo Enters the Capital'],
    text: ['董卓率西凉兵入洛阳，废少帝，立陈留王刘协为帝，自为相国，朝廷尽入其手。', "Dong Zhuo marched into Luoyang with the riders of Liang, deposed the young emperor, set up Liu Xie, Prince of Chenliu, and made himself chancellor: the court was his."],
    auto: (s) => absorb(s, 'dongzhuo', 'han')
  },
  {
    id: 'lvbuTurns',
    branch: 'history',
    at: [189, 10],
    until: 191,
    when: (s) => live(s, 'dingyuan') && live(s, 'dongzhuo') && serves(s, 'lvbu', 'dingyuan') && s.player !== 'dingyuan' && s.branch !== 'dongzhuo',
    title: ['吕布弑丁原', 'Lü Bu Kills Ding Yuan'],
    text: ['董卓以赤兔马和金珠收买吕布。吕布斩丁原首级，率并州兵投入董卓麾下。', 'Dong Zhuo bought Lü Bu with the horse Red Hare and gold. Lü Bu cut off Ding Yuan\'s head and brought the men of Bing over to Dong Zhuo.'],
    auto: (s) => {
      die(s, 'dingyuan', 'executed');
      if (live(s, 'dingyuan')) absorb(s, 'dongzhuo', 'dingyuan');
    }
  },
  {
    id: 'coalition',
    branch: 'history',
    at: [190, 1],
    until: 191,
    when: (s) => live(s, 'dongzhuo') && owns(s, 'dongzhuo', 'luoyang'),
    title: ['关东联军', 'The Coalition East of the Passes'],
    text: ['桥瑁传檄天下，关东诸侯共推袁绍为盟主，起兵讨伐董卓。', 'Qiao Mao sent his call to arms through the realm; the lords east of the passes chose Yuan Shao to lead them and rose against Dong Zhuo.'],
    choices: [
      {
        label: ['加入联军（与诸侯结盟一年，名声上升）', 'Join the coalition (allied with the lords for a year; fame rises)'],
        when: (s) => s.player !== 'dongzhuo',
        run: (s) => {
          for (const f of Object.values(s.factions)) if (f.alive && f.camp === 'H' && f.id !== s.player) ally(s, s.player, f.id, 360);
          s.factions[s.player].relations.dongzhuo = -80;
          fame(s, s.player, 40);
        }
      },
      { label: ['按兵不动', 'Stay out of it'], run: () => {} }
    ],
    auto: (s) => {
      const lords = Object.values(s.factions).filter((f) => f.alive && f.camp === 'H' && f.id !== 'dongzhuo');
      for (const a of lords) for (const b of lords) if (a.id < b.id) ally(s, a.id, b.id, 360);
      for (const a of lords) a.relations.dongzhuo = s.factions.dongzhuo.relations[a.id] = -80;
    }
  },
  {
    id: 'moveCapital',
    branch: 'history',
    at: [191, 2],
    until: 192,
    when: (s) => live(s, 'dongzhuo') && owns(s, 'dongzhuo', 'luoyang') && owns(s, 'dongzhuo', 'changan') && s.player !== 'dongzhuo',
    title: ['火烧洛阳', 'Luoyang Burns'],
    text: ['董卓挟天子西迁长安，驱洛阳百姓数百万口随行，焚烧宫室宗庙，二百里内尽为焦土。', 'Dong Zhuo carried the emperor west to Chang\'an, drove the people of Luoyang before him and burned the palaces and the temples; for two hundred li all was ash.'],
    auto: (s) => burnLuoyang(s)
  },
  {
    id: 'chain',
    branch: 'history',
    at: [192, 4],
    until: 193,
    when: (s) => s.player !== 'dongzhuo' && live(s, 'dongzhuo') && s.factions.dongzhuo.ruler === 'dongzhuo' && serves(s, 'lvbu', 'dongzhuo') && serves(s, 'wangyun', 'dongzhuo'),
    title: ['连环计', 'The Chain Stratagem'],
    text: ['司徒王允以貂蝉离间董卓与吕布。吕布于未央殿前刺杀董卓，自领其众。', 'Wang Yun, Minister over the Masses, set Dong Zhuo and Lü Bu against each other through Diaochan. Lü Bu stabbed Dong Zhuo before the Weiyang Hall and took his army for himself.'],
    auto: (s) => lvbuTakes(s)
  },
  {
    id: 'emperorWei',
    branch: 'history',
    at: [220, 10],
    until: 240,
    when: (s) => live(s, 'caocao') && ['caopi', 'caorui'].includes(s.factions.caocao.ruler) && !s.factions.caocao.name,
    title: ['魏代汉', 'Wei Replaces Han'],
    text: ['曹丕受汉献帝禅让，即皇帝位，国号大魏，改元黄初。', 'Cao Pi received the throne from the last Han emperor, took the title of emperor and named his state Wei.'],
    auto: (s) => rename(s, 'caocao', '魏', 'Wei', '魏')
  },
  {
    id: 'emperorShu',
    branch: 'history',
    at: [221, 4],
    until: 240,
    when: (s) => live(s, 'liubei') && owns(s, 'liubei', 'chengdu') && !s.factions.liubei.name,
    title: ['昭烈称帝', 'Liu Bei Takes the Throne'],
    text: ['闻汉帝被废，刘备于成都即皇帝位，延续汉祚，史称季汉。', 'Hearing that the Han emperor had been set aside, Liu Bei took the throne at Chengdu to carry on the house of Han.'],
    auto: (s) => rename(s, 'liubei', '汉', 'Shu Han', '汉')
  },
  {
    id: 'emperorWu',
    branch: 'history',
    at: [229, 4],
    until: 250,
    when: (s) => live(s, 'sunjian') && ['sunquan', 'sunliang', 'sunxiu', 'sunhao'].includes(s.factions.sunjian.ruler) && !s.factions.sunjian.name,
    title: ['孙权称帝', 'Sun Quan Takes the Throne'],
    text: ['孙权于武昌即皇帝位，国号吴，三国鼎立之势遂成。', 'Sun Quan took the throne at Wuchang and named his state Wu: three empires now stood like the legs of a tripod.'],
    auto: (s) => rename(s, 'sunjian', '吴', 'Wu', '吴')
  },
  {
    id: 'jin',
    branch: 'history',
    at: [265, 12],
    until: 280,
    when: (s) => live(s, 'caocao') && (serves(s, 'simayan', 'caocao') || serves(s, 'simazhao', 'caocao')),
    title: ['司马代魏', 'The Simas Take Wei'],
    text: ['司马氏三代专权，司马炎逼魏帝禅位，建立晋朝。', 'After three generations of the Simas holding power, Sima Yan made the emperor of Wei yield the throne and founded Jin.'],
    auto: (s) => {
      const heir = serves(s, 'simayan', 'caocao') ? 'simayan' : 'simazhao';
      s.factions.caocao.ruler = heir;
      s.generals[heir].loyalty = 100;
      rename(s, 'caocao', '晋', 'Jin', '晋');
    }
  },
  // ——— Cao Cao ———
  {
    id: 'c_chenliu',
    branch: 'caocao',
    at: [189, 12],
    until: 191,
    when: (s) => live(s, 'caocao'),
    title: ['陈留起兵', 'The Rising at Chenliu'],
    text: ['曹操散家财，于陈留招募义兵，乡里豪杰卫兹出资相助，乐进、李典等纷纷来投。', 'Cao Cao spent his family\'s wealth raising volunteers at Chenliu; Wei Zi of the district paid towards it, and Yue Jin, Li Dian and others came to join him.'],
    auto: (s) => {
      s.factions.caocao.coin += 3000;
      for (const id of ['yuejin', 'lidian']) if (s.generals[id]?.status === 'free') bring(s, id, 'caocao');
      fame(s, 'caocao', 20);
    }
  },
  {
    id: 'c_xunyu',
    branch: 'caocao',
    face: 'xunyu',
    at: [191, 3],
    until: 196,
    when: (s) => live(s, 'caocao') && s.generals.xunyu?.status === 'free',
    title: ['王佐之才', 'An Adviser for a King'],
    text: ['颍川荀彧见袁绍终不能成大事，弃之而来。曹操大喜：“吾之子房也。”', 'Xun Yu of Yingchuan, seeing Yuan Shao would never achieve great things, left him and came. Cao Cao rejoiced: "Here is my Zhang Liang."'],
    choices: [
      {
        label: ['以上宾之礼相待（荀彧加入，并举荐郭嘉、荀攸）', 'Receive him as an honoured guest (Xun Yu joins, and recommends Guo Jia and Xun You)'],
        run: (s) => {
          bring(s, 'xunyu', s.player);
          for (const id of ['guojia', 'xunyou']) if (s.generals[id]?.status === 'free') bring(s, id, s.player);
        }
      }
    ]
  },
  {
    id: 'c_qingzhou',
    branch: 'caocao',
    at: [192, 6],
    until: 196,
    when: (s) => live(s, 'caocao') && Object.keys(s.nodes).some((id) => s.nodes[id].owner === 'caocao' && ['yan', 'qing'].includes(NODES[id].prov)),
    title: ['收编青州兵', 'The Qingzhou Corps'],
    text: ['青州黄巾百万众入兖州。曹操追击至济北，降卒三十余万，选其精锐，号为“青州兵”。', 'A million Yellow Turbans of Qing poured into Yan. Cao Cao pursued them to Jibei and took the surrender of three hundred thousand; the best of them he made the Qingzhou Corps.'],
    auto: (s) => {
      const cap = s.factions.caocao.capital;
      s.nodes[cap].troops += 20000;
      s.flags.qingzhou = 'caocao';
    }
  },
  {
    id: 'c_emperor',
    branch: 'caocao',
    at: [196, 1],
    until: 200,
    when: (s) => live(s, 'caocao') && (owns(s, 'caocao', 'xuchang') || owns(s, 'caocao', 'luoyang')) && alive(s, 'liuxie'),
    title: ['奉迎天子', 'Receiving the Emperor'],
    text: ['献帝流离洛阳，宫室残破。荀彧进言：“奉主上以从民望，大顺也。”', 'The emperor wandered among the ruins of Luoyang. Xun Yu urged: "To serve our sovereign is to follow the hopes of the people: there is no greater cause."'],
    choices: [
      {
        label: ['迎天子都许（名声大涨，诸侯好感下降）', 'Bring the emperor to Xu (fame soars; the lords grow cold)'],
        run: (s) => {
          fame(s, s.player, 120);
          bring(s, 'liuxie', s.player);
          for (const f of Object.values(s.factions)) if (f.alive && f.id !== s.player) f.relations[s.player] = clamp((f.relations[s.player] ?? 0) - 10, -100, 100);
          s.flags.emperor = s.player;
        }
      },
      { label: ['不必理会', 'Leave him be'], run: () => {} }
    ]
  },
  {
    id: 'c_guandu',
    branch: 'caocao',
    at: [200, 2],
    until: 203,
    when: (s) => live(s, 'caocao') && live(s, 'yuanshao') && s.factions.yuanshao.ruler === 'yuanshao',
    title: ['官渡之战', 'The Battle of Guandu'],
    text: ['袁绍拥众十万南下，与曹军相持于官渡。许攸夜奔曹营，献计火烧乌巢屯粮。', 'Yuan Shao came south with a hundred thousand and the armies faced each other at Guandu. Xu You fled to Cao\'s camp by night and told of the grain store at Wuchao.'],
    choices: [
      {
        label: ['亲率轻骑夜袭乌巢', 'Lead the light horse by night against Wuchao'],
        run: (s) => {
          if (s.generals.xuyou?.status === 'serving' && s.generals.xuyou.faction === 'yuanshao') join(s, 'xuyou', s.player, s.factions[s.player].capital);
          const c = champion(s, 'chenliu');
          const mine = spawn(s, s.player, c.at, c.general, 6000, 'lightcav');
          const guard = serving(s, 'yuanshao').find((g) => g === 'chunyuqiong') ?? serving(s, 'yuanshao')[0];
          const theirs = spawn(s, 'yuanshao', c.at, guard, 9000, 'spear');
          s.flags.guandu = 'raid';
          eventBattle(s, 'wuchao', c.at, mine, theirs, true);
        }
      },
      {
        label: ['坚守营垒，等待时机', 'Hold the camp and wait'],
        run: (s) => {
          s.flags.guandu = 'wait';
        }
      }
    ]
  },
  {
    id: 'c_chibi',
    branch: 'caocao',
    at: [208, 10],
    until: 212,
    when: (s) => live(s, 'caocao') && owns(s, 'caocao', 'xiangyang') && (live(s, 'sunjian') || live(s, 'liubei')),
    title: ['赤壁之战', 'The Red Cliffs'],
    text: ['曹军顺江东下，连环战船屯于乌林。孙刘联军隔江对峙，黄盖请降。', 'Cao\'s fleet came down the river and lay chained at Wulin; the allied Sun and Liu faced it across the water, and Huang Gai offered to surrender.'],
    choices: [
      {
        label: ['识破诈降，解开铁索，迎战联军（假如：曹胜赤壁）', 'See through the false surrender, loose the chains and meet the allies (what if Cao wins)'],
        run: (s) => {
          const c = champion(s, 'wulin');
          const mine = spawn(s, s.player, c.at, c.general, 30000, 'doujian');
          const foe = live(s, 'sunjian') ? 'sunjian' : 'liubei';
          const lead = ['zhouyu', 'luxun', 'lvmeng', 'zhugeliang'].find((g) => serves(s, g, foe)) ?? s.factions[foe].ruler;
          const theirs = spawn(s, foe, c.at, lead, 26000, 'mengchong', ['huanggai', 'chengpu', 'ganning']);
          s.flags.chibi = 'cao';
          eventBattle(s, 'chibi', c.at, mine, theirs, false);
        }
      },
      {
        label: ['北方士卒不习水战，暂且退兵', 'Northern men do not know the water: withdraw for now'],
        run: (s) => {
          s.flags.chibi = 'withdrew';
        }
      }
    ]
  },
  {
    id: 'c_duke',
    branch: 'caocao',
    at: [213, 5],
    until: 220,
    when: (s) => live(s, 'caocao') && s.factions.caocao.ruler === 'caocao' && owns(s, 'caocao', 'ye'),
    title: ['魏公', 'Duke of Wei'],
    text: ['献帝策命曹操为魏公，加九锡，以冀州十郡为魏国。', 'The emperor named Cao Cao Duke of Wei, with the nine honours, and gave him ten commanderies of Ji as his state.'],
    auto: (s) => {
      fame(s, 'caocao', 60);
      rename(s, 'caocao', '魏', 'Wei', '魏');
    }
  },
  // ——— Liu Bei ———
  {
    id: 'l_oath',
    branch: 'liubei',
    at: [184, 2],
    until: 185,
    when: (s) => live(s, 'liubei') && serves(s, 'guanyu', 'liubei') && serves(s, 'zhangfei', 'liubei'),
    title: ['桃园结义', 'The Oath of the Peach Garden'],
    text: ['刘备、关羽、张飞于涿郡桃园焚香结拜：不求同年同月同日生，但愿同年同月同日死。', 'In a peach garden of Zhuo, Liu Bei, Guan Yu and Zhang Fei burned incense and swore: not born on the same day, but let us die on the same day.'],
    auto: (s) => {
      for (const id of ['guanyu', 'zhangfei']) s.generals[id].loyalty = 100;
      fame(s, 'liubei', 20);
      s.factions.liubei.coin += 1500;
    }
  },
  {
    id: 'l_xu',
    branch: 'liubei',
    at: [194, 3],
    until: 197,
    when: (s) => live(s, 'liubei') && live(s, 'taoqian') && s.factions.taoqian.ruler === 'taoqian',
    title: ['三让徐州', 'Xu Offered Three Times'],
    text: ['陶谦病笃，三次以徐州相让：“非刘公不能安此州也。”', 'Tao Qian, mortally ill, three times offered Xu: "None but Lord Liu can keep this province safe."'],
    choices: [
      {
        label: ['接受徐州（陶谦的城池与部下归附）', 'Accept Xu (Tao Qian\'s cities and officers come over)'],
        run: (s) => {
          die(s, 'taoqian');
          if (live(s, 'taoqian')) absorb(s, s.player, 'taoqian');
        }
      },
      { label: ['推辞不受（名声上升）', 'Decline (fame rises)'], run: (s) => fame(s, s.player, 40) }
    ]
  },
  {
    id: 'l_cottage',
    branch: 'liubei',
    face: 'zhugeliang',
    at: [207, 1],
    until: 214,
    when: (s) => live(s, 'liubei') && alive(s, 'zhugeliang') && s.generals.zhugeliang.status === 'free' && Object.keys(s.nodes).some((id) => s.nodes[id].owner === 'liubei' && NODES[id].prov === 'jing'),
    title: ['三顾茅庐', 'Three Visits to the Cottage'],
    text: ['徐庶荐卧龙于隆中。刘备冒雪三往，诸葛亮感其诚意，陈三分天下之策。', 'Xu Shu spoke of the Sleeping Dragon at Longzhong. Liu Bei went three times through the snow; moved by his sincerity, Zhuge Liang laid out the plan of a realm in three.'],
    choices: [
      {
        label: ['三顾茅庐（诸葛亮出山，黄月英同往）', 'Visit three times (Zhuge Liang comes, and Huang Yueying with him)'],
        run: (s) => {
          bring(s, 'zhugeliang', s.player);
          if (s.generals.huangyueying?.status === 'free') bring(s, 'huangyueying', s.player);
          fame(s, s.player, 30);
        }
      }
    ]
  },
  {
    id: 'l_chibi',
    branch: 'liubei',
    at: [208, 10],
    until: 212,
    when: (s) => live(s, 'liubei') && live(s, 'caocao') && live(s, 'sunjian') && owns(s, 'caocao', 'xiangyang'),
    title: ['孙刘联盟', 'Sun and Liu Allied'],
    text: ['诸葛亮出使江东，舌战群儒，说动孙权联兵抗曹。周瑜屯兵赤壁，只待东风。', 'Zhuge Liang went to the south-east, out-argued its scholars and won Sun Quan to a common stand. Zhou Yu camped at the Red Cliffs and waited for the east wind.'],
    choices: [
      {
        label: ['借东风，火攻曹营', 'Borrow the east wind and set Cao\'s fleet on fire'],
        run: (s) => {
          ally(s, s.player, 'sunjian', 1080);
          const c = champion(s, 'chibi');
          const mine = spawn(s, s.player, c.at, c.general, 18000, 'mengchong');
          const lead = ['caoren', 'caocao', 'xiahoudun'].find((g) => serves(s, g, 'caocao')) ?? s.factions.caocao.ruler;
          const theirs = spawn(s, 'caocao', c.at, lead, 34000, 'doujian', ['caimao', 'zhangyun']);
          s.flags.chibi = 'allies';
          eventBattle(s, 'chibi', c.at, mine, theirs, true);
        }
      },
      { label: ['只结盟，不出兵', 'Ally, but send no men'], run: (s) => ally(s, s.player, 'sunjian', 1080) }
    ]
  },
  {
    id: 'l_shu',
    branch: 'liubei',
    at: [211, 6],
    until: 216,
    when: (s) => live(s, 'liubei') && live(s, 'liuyan') && !owns(s, 'liubei', 'chengdu'),
    title: ['入蜀', 'Into Shu'],
    text: ['张松献西川地图，法正迎刘备入蜀以拒张鲁。', 'Zhang Song brought the map of the west; Fa Zheng invited Liu Bei into Shu to hold off Zhang Lu.'],
    choices: [
      {
        label: ['应邀入蜀（张松、法正来投，蜀中门户大开）', 'Accept and go west (Zhang Song and Fa Zheng join; Shu opens its gates)'],
        run: (s) => {
          for (const id of ['zhangsong', 'fazheng', 'mengda']) if (alive(s, id)) bring(s, id, s.player);
          s.nodes.jiange.troops = Math.floor(s.nodes.jiange.troops * 0.3);
          s.nodes.zitong.troops = Math.floor(s.nodes.zitong.troops * 0.5);
        }
      },
      { label: ['同宗之地，不忍取之', 'It is a kinsman\'s land: leave it'], run: (s) => fame(s, s.player, 20) }
    ]
  },
  {
    id: 'l_king',
    branch: 'liubei',
    at: [219, 7],
    until: 225,
    when: (s) => live(s, 'liubei') && owns(s, 'liubei', 'hanzhong') && owns(s, 'liubei', 'chengdu'),
    title: ['汉中王', 'King of Hanzhong'],
    text: ['刘备取汉中，群臣上表，进位汉中王，以关张马黄赵为五虎上将。', 'Liu Bei took Hanzhong; his officers petitioned and he became King of Hanzhong, naming Guan, Zhang, Ma, Huang and Zhao the Five Tiger Generals.'],
    auto: (s) => {
      fame(s, 'liubei', 60);
      for (const id of ['guanyu', 'zhangfei', 'machao', 'huangzhong', 'zhaoyun']) if (serves(s, id, 'liubei')) s.generals[id].loyalty = 100;
    }
  },
  {
    id: 'l_yiling',
    branch: 'liubei',
    at: [222, 2],
    until: 224,
    when: (s) => live(s, 'liubei') && live(s, 'sunjian') && serves(s, 'luxun', 'sunjian'),
    title: ['夷陵之战', 'The Battle of Yiling'],
    text: ['为报荆州之仇，大军东出，连营七百里。陆逊坚守不战，只待天热火起。', 'To avenge Jing the army marched east, its camps stretched seven hundred li. Lu Xun held fast and waited for the summer heat and fire.'],
    choices: [
      {
        label: ['移营山林之外，与陆逊决战（假如：陆逊兵败）', 'Move the camps out of the woods and give battle (what if Lu Xun loses)'],
        run: (s) => {
          const c = champion(s, 'yiling');
          const mine = spawn(s, s.player, c.at, c.general, 28000, 'halberd');
          const theirs = spawn(s, 'sunjian', c.at, 'luxun', 24000, 'spear', ['zhuran', 'hanxuan']);
          s.flags.yiling = 'battle';
          eventBattle(s, null, c.at, mine, theirs, true);
        }
      },
      {
        label: ['罢兵议和', 'Make peace instead'],
        run: (s) => {
          s.factions[s.player].treaties.sunjian = { kind: 'truce', until: s.day + 720 };
          s.factions.sunjian.treaties[s.player] = { kind: 'truce', until: s.day + 720 };
        }
      }
    ]
  },
  {
    id: 'l_wuzhang',
    branch: 'liubei',
    at: [234, 6],
    until: 235,
    when: (s) => live(s, 'liubei') && serves(s, 'zhugeliang', s.player) && s.generals.zhugeliang.died <= 234,
    title: ['五丈原', 'Wuzhang Plains'],
    text: ['丞相屯兵五丈原，积劳成疾。姜维请设七星灯禳星续命。', 'The chancellor camped on the Wuzhang plains, worn out by his labours. Jiang Wei begged him to light the seven-star lamps and pray for his life.'],
    choices: [
      {
        label: ['设灯禳星（成则续命十二年，北伐可期）', 'Light the lamps (if it works, twelve more years, and the north within reach)'],
        run: (s) => {
          if (random(s) < 0.6) {
            s.generals.zhugeliang.died = 246;
            fame(s, s.player, 50);
            s.flags.wuzhang = 'saved';
          } else s.flags.wuzhang = 'failed';
        }
      },
      { label: ['天命如此', 'Accept what Heaven wills'], run: () => {} }
    ]
  },
  // ——— The Suns ———
  {
    id: 's_seal',
    branch: 'sunjian',
    at: [191, 2],
    until: 193,
    when: (s) => live(s, 'sunjian') && s.hiddenTreasures.some((t) => t.id === 'yuxi'),
    title: ['井中玉玺', 'The Seal in the Well'],
    text: ['孙坚入洛阳，于城南甄官井中得传国玉玺，上刻“受命于天，既寿永昌”。', 'In Luoyang Sun Jian found the Imperial Seal in a well south of the city, carved: "Received from Heaven; long life and lasting glory."'],
    auto: (s) => {
      s.hiddenTreasures = s.hiddenTreasures.filter((t) => t.id !== 'yuxi');
      (s.factions.sunjian.store ??= []).push('yuxi');
      fame(s, 'sunjian', 30);
    }
  },
  {
    id: 's_xianshan',
    branch: 'sunjian',
    at: [191, 6],
    until: 192,
    when: (s) => live(s, 'sunjian') && s.factions.sunjian.ruler === 'sunjian' && s.generals.sunjian.died <= 191,
    title: ['岘山伏箭', 'Arrows at Mount Xian'],
    text: ['孙坚追黄祖至岘山，单骑深入竹林，林中伏兵乱箭齐发。', 'Sun Jian pursued Huang Zu to Mount Xian and rode alone into the bamboo, where hidden archers waited.'],
    choices: [
      {
        label: ['勒马回营（孙坚得免，寿延十年）', 'Rein in and turn back (Sun Jian is spared ten years)'],
        run: (s) => {
          s.generals.sunjian.died = 201;
        }
      },
      { label: ['乘胜追击', 'Press on'], run: () => {} }
    ]
  },
  {
    id: 's_jiangdong',
    branch: 'sunjian',
    at: [195, 1],
    until: 199,
    when: (s) => live(s, 'sunjian') && serves(s, 'sunce', 'sunjian'),
    title: ['小霸王平江东', 'The Little Conqueror Takes the South-East'],
    text: ['孙策借兵渡江，转战千里，所向披靡。周瑜引兵来会，太史慈神亭一战后归降。', 'Sun Ce borrowed troops, crossed the river and fought across a thousand li, sweeping all before him. Zhou Yu brought men to join him, and Taishi Ci came over after their fight at Shenting.'],
    auto: (s) => {
      s.nodes[s.factions.sunjian.capital].troops += 10000;
      for (const id of ['zhouyu', 'taishici', 'jiangqin', 'zhoutai', 'lvmeng']) if (s.generals[id]?.status === 'free') bring(s, id, 'sunjian');
      fame(s, 'sunjian', 40);
    }
  },
  {
    id: 's_sunce',
    branch: 'sunjian',
    at: [200, 4],
    until: 201,
    when: (s) => live(s, 'sunjian') && s.factions.sunjian.ruler === 'sunce' && s.generals.sunce.died <= 200,
    title: ['丹徒遇刺', 'Ambush at Dantu'],
    text: ['孙策出猎丹徒，许贡门客埋伏林中。左右请主公勿要独行。', 'Sun Ce went hunting at Dantu, where Xu Gong\'s retainers lay in wait; his guards begged him not to ride alone.'],
    choices: [
      {
        label: ['听从劝谏，带亲卫同行（孙策免于此难）', 'Heed them and take the guard (Sun Ce is spared)'],
        run: (s) => {
          s.generals.sunce.died = 212;
        }
      },
      { label: ['小霸王何惧刺客', 'The Little Conqueror fears no assassin'], run: () => {} }
    ]
  },
  {
    id: 's_chibi',
    branch: 'sunjian',
    at: [208, 10],
    until: 212,
    when: (s) => live(s, 'sunjian') && live(s, 'caocao') && owns(s, 'caocao', 'xiangyang'),
    title: ['赤壁之战', 'The Red Cliffs'],
    text: ['曹操号称八十万众顺江而下。周瑜力主抗曹，黄盖献苦肉计，诈降火攻。', 'Cao Cao came down the river with what he called eight hundred thousand. Zhou Yu stood for war; Huang Gai offered the self-inflicted wound, a false surrender and fire.'],
    choices: [
      {
        label: ['用黄盖之计，火烧连环船', 'Use Huang Gai\'s plan and burn the chained fleet'],
        run: (s) => {
          const c = champion(s, 'chibi');
          const mine = spawn(s, s.player, c.at, ['zhouyu', 'luxun', 'lusu'].find((g) => serves(s, g, s.player)) ?? c.general, 24000, 'mengchong', ['huanggai', 'chengpu', 'ganning']);
          const lead = ['caoren', 'caocao', 'xiahoudun'].find((g) => serves(s, g, 'caocao')) ?? s.factions.caocao.ruler;
          const theirs = spawn(s, 'caocao', c.at, lead, 34000, 'doujian', ['caimao', 'zhangyun']);
          s.flags.chibi = 'sun';
          eventBattle(s, 'chibi', c.at, mine, theirs, true);
        }
      },
      {
        label: ['遣使求和', 'Send envoys to make peace'],
        run: (s) => {
          s.factions[s.player].treaties.caocao = { kind: 'truce', until: s.day + 360 };
          s.factions.caocao.treaties[s.player] = { kind: 'truce', until: s.day + 360 };
        }
      }
    ]
  },
  {
    id: 's_white',
    branch: 'sunjian',
    at: [219, 9],
    until: 222,
    when: (s) => live(s, 'sunjian') && serves(s, 'lvmeng', 'sunjian') && s.nodes.jiangling.owner && s.nodes.jiangling.owner !== 'sunjian',
    title: ['白衣渡江', 'Across the River in White'],
    text: ['吕蒙称病，以陆逊代守陆口。精兵扮作商旅白衣摇橹，夜渡长江，袭取江陵。', 'Lü Meng pleaded illness and left Lu Xun at Lukou. Picked men dressed as merchants rowed across the river by night and took Jiangling.'],
    choices: [
      {
        label: ['白衣渡江，袭取江陵', 'Cross in white and take Jiangling'],
        run: (s) => {
          const old = s.nodes.jiangling.owner;
          for (const id of serving(s, old, 'jiangling')) s.generals[id].at = nearestFriendly(s, old, 'jiangling') ?? s.factions[old].capital;
          Object.assign(s.nodes.jiangling, { owner: s.player, troops: 6000, governor: null });
        }
      },
      { label: ['盟约为重', 'Keep faith with the alliance'], run: (s) => fame(s, s.player, 20) }
    ]
  },
  // ——— Dong Zhuo ———
  {
    id: 'd_capital',
    branch: 'dongzhuo',
    at: [189, 9],
    until: 191,
    when: (s) => live(s, 'dongzhuo') && live(s, 'han'),
    title: ['入京废立', 'The Capital Taken'],
    text: ['何进身死，宫中大乱。董卓兵至洛阳，挟持少帝，朝野震恐。', 'He Jin was dead and the palace in turmoil. Dong Zhuo\'s riders reached Luoyang and seized the young emperor; court and country trembled.'],
    choices: [
      { label: ['废少帝，立陈留王（汉室归于麾下）', 'Depose the young emperor and set up the Prince of Chenliu (the court is yours)'], run: (s) => absorb(s, s.player, 'han') },
      {
        label: ['尊奉天子，与朝臣共治（名声上升，汉室结为同盟）', 'Honour the emperor and rule with the court (fame rises; allied with the court)'],
        run: (s) => {
          ally(s, s.player, 'han', 1080);
          fame(s, s.player, 60);
        }
      }
    ]
  },
  {
    id: 'd_redhare',
    branch: 'dongzhuo',
    at: [189, 10],
    until: 192,
    when: (s) => live(s, 'dongzhuo') && live(s, 'dingyuan') && serves(s, 'lvbu', 'dingyuan'),
    title: ['赤兔收吕布', 'Red Hare for Lü Bu'],
    text: ['李肃献计：以赤兔马和金珠说吕布来降。', 'Li Su had a plan: win Lü Bu over with the horse Red Hare and gold.'],
    choices: [
      {
        label: ['以赤兔马收买吕布（丁原势力并入）', 'Buy Lü Bu with Red Hare (Ding Yuan\'s power comes over)'],
        run: (s) => {
          die(s, 'dingyuan', 'executed');
          if (live(s, 'dingyuan')) absorb(s, s.player, 'dingyuan');
        }
      },
      { label: ['不屑此等手段', 'Such means are beneath us'], run: () => {} }
    ]
  },
  {
    id: 'd_hulao',
    branch: 'dongzhuo',
    at: [190, 2],
    until: 191,
    when: (s) => live(s, 'dongzhuo') && owns(s, 'dongzhuo', 'hulao') && live(s, 'yuanshao'),
    title: ['虎牢关', 'Hulao Pass'],
    text: ['关东联军兵临虎牢。孙坚为先锋，刘关张三英与吕布酣战关前。', 'The coalition stood before Hulao, Sun Jian leading; before the gate the three heroes, Liu, Guan and Zhang, fought Lü Bu.'],
    auto: (s) => {
      const lords = Object.values(s.factions).filter((f) => f.alive && f.camp === 'H' && f.id !== s.player);
      for (const a of lords) for (const b of lords) if (a.id < b.id) ally(s, a.id, b.id, 360);
      for (const f of lords) f.relations[s.player] = s.factions[s.player].relations[f.id] = -80;
      const near = nearestFriendly(s, 'yuanshao', 'hulao');
      if (near) {
        const lead = ['yanliang', 'wenchou', 'yuanshao'].find((g) => serves(s, g, 'yuanshao') && s.nodes[s.generals[g].at]);
        if (lead) {
          const a = spawn(s, 'yuanshao', near, lead, 26000, 'spear', ['chunyuqiong']);
          if (a) order(s, a, 'hulao');
        }
      }
    }
  },
  {
    id: 'd_move',
    branch: 'dongzhuo',
    at: [191, 2],
    until: 192,
    when: (s) => live(s, 'dongzhuo') && owns(s, 'dongzhuo', 'luoyang') && owns(s, 'dongzhuo', 'changan'),
    title: ['迁都长安', 'The Move to Chang\'an'],
    text: ['联军势大。李儒进言：火焚洛阳，迁都长安，据关中之险。', 'The coalition was strong. Li Ru advised burning Luoyang and moving the capital to Chang\'an, behind the passes of the west.'],
    choices: [
      {
        label: ['焚洛阳，迁长安（得钱两万，洛阳残破）', 'Burn Luoyang and move west (twenty thousand coin; Luoyang laid waste)'],
        run: (s) => {
          burnLuoyang(s);
          s.factions[s.player].coin += 20000;
        }
      },
      { label: ['坚守洛阳', 'Hold Luoyang'], run: () => {} }
    ]
  },
  {
    id: 'd_chain',
    branch: 'dongzhuo',
    at: [192, 4],
    until: 193,
    when: (s) => live(s, 'dongzhuo') && s.factions.dongzhuo.ruler === 'dongzhuo' && serves(s, 'lvbu', 'dongzhuo'),
    title: ['凤仪亭', 'The Phoenix Pavilion'],
    text: ['李儒密报：吕布与貂蝉私会于凤仪亭，司徒王允似有异图。', 'Li Ru brought word: Lü Bu had met Diaochan in secret at the Phoenix Pavilion, and Wang Yun seemed to be plotting.'],
    choices: [
      {
        label: ['将貂蝉赐予吕布，收其心（吕布忠诚大增，王允下狱）', 'Give Diaochan to Lü Bu and win his heart (Lü Bu\'s loyalty soars; Wang Yun is jailed)'],
        run: (s) => {
          s.generals.lvbu.loyalty = 100;
          if (serves(s, 'wangyun', s.player)) die(s, 'wangyun', 'executed');
          s.flags.chain = 'foiled';
        }
      },
      { label: ['一介武夫，何足挂齿', 'A mere soldier: why worry'], run: (s) => lvbuTakes(s) }
    ]
  },
  // ——— Yuan Shao ———
  {
    id: 'y_ji',
    branch: 'yuanshao',
    at: [191, 7],
    until: 193,
    when: (s) => live(s, 'yuanshao') && live(s, 'hanfu'),
    title: ['兵不血刃得冀州', 'Ji Taken Without a Blow'],
    text: ['逢纪献策：密约公孙瓒南下，再遣辛评、荀谌说韩馥让出冀州。', 'Feng Ji\'s plan: get Gongsun Zan to march south, then send Xin Ping and Xun Chen to talk Han Fu into giving up Ji.'],
    choices: [
      { label: ['遣使说韩馥（韩馥势力并入）', 'Send envoys to Han Fu (his power comes over)'], run: (s) => absorb(s, s.player, 'hanfu') },
      { label: ['不行此诈谋', 'No such trickery'], run: (s) => fame(s, s.player, 20) }
    ]
  },
  {
    id: 'y_jieqiao',
    branch: 'yuanshao',
    at: [192, 1],
    until: 194,
    when: (s) => live(s, 'yuanshao') && live(s, 'gongsunzan'),
    title: ['界桥之战', 'The Battle of Jieqiao'],
    text: ['公孙瓒以白马义从冲阵。鞠义率先登死士八百伏于盾下，弩发如雨。', 'Gongsun Zan charged with his White Horse Volunteers; Ju Yi\'s eight hundred First-on-the-Wall men lay under their shields and loosed their crossbows like rain.'],
    choices: [
      {
        label: ['令鞠义迎击白马义从', 'Send Ju Yi against the White Horses'],
        run: (s) => {
          const c = champion(s, 'nanpi');
          const lead = serves(s, 'juyi', s.player) ? 'juyi' : c.general;
          const mine = spawn(s, s.player, c.at, lead, 16000, serves(s, 'juyi', s.player) ? 'xiandeng' : 'crossbow');
          const theirs = spawn(s, 'gongsunzan', c.at, 'gongsunzan', 16000, 'baima', ['yangang2']);
          eventBattle(s, null, c.at, mine, theirs, false);
        }
      },
      { label: ['深沟高垒，避其锋芒', 'Dig in and let their charge spend itself'], run: () => {} }
    ]
  },
  {
    id: 'y_guandu',
    branch: 'yuanshao',
    at: [200, 2],
    until: 203,
    when: (s) => live(s, 'yuanshao') && live(s, 'caocao'),
    title: ['官渡决战', 'The Decision at Guandu'],
    text: ['大军与曹操相持官渡，屯粮于乌巢。沮授劝增兵守护粮道，许攸却心怀怨望。', 'Your army faced Cao Cao at Guandu, its grain stored at Wuchao. Ju Shou urged more men to guard the grain; Xu You nursed a grudge.'],
    choices: [
      {
        label: ['重兵守乌巢，厚待许攸（假如：袁胜官渡）', 'Guard Wuchao strongly and treat Xu You well (what if Yuan wins at Guandu)'],
        run: (s) => {
          if (serves(s, 'xuyou', s.player)) s.generals.xuyou.loyalty = 90;
          const c = champion(s, 'chenliu');
          const mine = spawn(s, s.player, c.at, c.general, 14000, 'spear', ['chunyuqiong']);
          const lead = ['caocao', 'xuchu', 'xiahouyuan'].find((g) => serves(s, g, 'caocao')) ?? s.factions.caocao.ruler;
          const theirs = spawn(s, 'caocao', c.at, lead, 6000, 'lightcav');
          s.flags.guandu = 'guard';
          eventBattle(s, 'wuchao', c.at, theirs, mine, true);
        }
      },
      { label: ['依原计而行', 'Keep to the plan'], run: (s) => (s.flags.guandu = 'plan') }
    ]
  },
  {
    id: 'y_heir',
    branch: 'yuanshao',
    at: [202, 5],
    until: 203,
    when: (s) => live(s, 'yuanshao') && s.factions.yuanshao.ruler === 'yuanshao' && s.generals.yuanshao.died <= 202 && serves(s, 'yuantan', 'yuanshao') && serves(s, 'yuanshang', 'yuanshao'),
    title: ['立嗣之争', 'The Quarrel over the Heir'],
    text: ['袁绍病重。审配、逢纪拥立幼子袁尚，郭图、辛评辅佐长子袁谭。', 'Yuan Shao lay dying. Shen Pei and Feng Ji stood for the younger son, Yuan Shang; Guo Tu and Xin Ping for the elder, Yuan Tan.'],
    choices: [
      { label: ['立长子袁谭', 'Name Yuan Tan, the elder'], run: (s) => (s.flags.heir = 'yuantan') },
      { label: ['立幼子袁尚', 'Name Yuan Shang, the younger'], run: (s) => (s.flags.heir = 'yuanshang') }
    ]
  }
];

/** A power breaks up: its places stand empty and its officers wander. */
function scatter(s, f) {
  for (const id in s.nodes) if (s.nodes[id].owner === f) Object.assign(s.nodes[id], { owner: null, governor: null, work: null });
  for (const a of Object.values(s.armies)) if (a.faction === f) delete s.armies[a.id];
  for (const id of serving(s, f)) Object.assign(s.generals[id], { status: 'free', faction: null, at: GENERALS[id].home, known: false });
  s.factions[f].alive = false;
  note(s, 'logFall', { faction: f });
}

function burnLuoyang(s) {
  const n = s.nodes.luoyang;
  n.people = Math.round(n.people * 0.35);
  n.market = Math.round(n.market * 0.4);
  n.farm = Math.round(n.farm * 0.6);
  n.support = 10;
  if (owns(s, 'dongzhuo', 'changan')) s.factions.dongzhuo.capital = 'changan';
  for (const id of serving(s, 'dongzhuo', 'luoyang')) s.generals[id].at = 'changan';
}

function lvbuTakes(s) {
  if (!live(s, 'dongzhuo')) return;
  die(s, 'dongzhuo', 'executed');
  if (!serves(s, 'lvbu', 'dongzhuo')) return;
  // Lü Bu takes over what Dong Zhuo had, and the Liang generals' loyalty wavers.
  s.factions.dongzhuo.ruler = 'lvbu';
  s.generals.lvbu.loyalty = 100;
  rename(s, 'dongzhuo', '吕布', 'Lü Bu', '吕');
  for (const id of ['lijue', 'guosi', 'zhangji', 'fanchou']) if (serves(s, id, 'dongzhuo')) s.generals[id].loyalty = 30;
}

/** Each month: fire the events whose time has come. The player is asked when an event has choices for him. */
export function checkStory(s) {
  if (s.branch === 'free') return;
  const { year, month } = dateOf(s.day);
  for (const e of EVENTS) {
    if (s.fired[e.id]) continue;
    if (e.branch !== 'history' && e.branch !== s.branch) continue;
    if (year < e.at[0] || (year === e.at[0] && month < e.at[1])) continue;
    if (year > e.until) {
      s.fired[e.id] = 'missed';
      continue;
    }
    if (!e.when(s)) continue;
    s.fired[e.id] = s.day;
    const options = (e.choices ?? []).filter((c) => !c.when || c.when(s));
    if (options.length && (e.branch === s.branch || e.id === 'coalition') && s.factions[s.player]?.alive) {
      s.inbox.push({ kind: 'story', event: e.id, blocks: true });
    } else {
      if (e.auto) e.auto(s);
      note(s, 'logStory', { event: e.id });
    }
  }
}

/** The player's choice in a story event. */
export function answerStory(s, eventId, choice) {
  const e = EVENTS.find((x) => x.id === eventId);
  s.inbox = s.inbox.filter((m) => !(m.kind === 'story' && m.event === eventId));
  const options = (e.choices ?? []).filter((c) => !c.when || c.when(s));
  const c = options[choice] ?? options[0];
  if (c) c.run(s);
  note(s, 'logStory', { event: eventId });
  return { ok: true };
}

/** The choices of an event as the player sees them now. */
export const choicesOf = (s, eventId) => (EVENTS.find((x) => x.id === eventId).choices ?? []).filter((c) => !c.when || c.when(s));

export { dayOf, GENERALS, succeed };
