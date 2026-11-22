import {ARSENAL_ITEMS,BASIC_SHOPS} from './arsenal.mjs';
import {CAMPAIGNS,CAMPAIGN_MAPS,CAMPAIGN_ENEMIES,CAMPAIGN_SPAWNS,CAMPAIGN_SIDE_QUESTS,CAMPAIGN_ITEMS} from './campaign-data.mjs';
export {PROFESSIONS,FORGE_RECIPES} from './arsenal.mjs';
export const CAMPAIGN_CHAPTERS=CAMPAIGNS;
export const EQUIPMENT_SLOTS = Object.freeze(['weapon', 'offhand', 'armor', 'boots', 'ring', 'skill']);
export const ITEMS = Object.freeze({
  'bronze-sword': {id:'bronze-sword',name:'青铜剑',slot:'weapon',professions:['guard'],attack:13,tier:'common',artId:'sword',price:35,sellPrice:8,description:'西岐军中制式兵器。'},
  'iron-sword': {id:'iron-sword',name:'岐山破邪剑',slot:'weapon',professions:['guard'],attack:22,tier:'rare',artId:'sword',price:95,sellPrice:26,description:'剑脊刻有破邪符，攻击明显提升。'},
  'wind-sword': {id:'wind-sword',name:'铜关回风剑',slot:'weapon',professions:['guard'],attack:31,tier:'epic',artId:'sword',sellPrice:70,description:'斩断铜关风阵所得，剑气随攻势回旋。'},
  'linen-armor': {id:'linen-armor',name:'布甲',slot:'armor',defense:1,tier:'common',artId:'armor',price:25,sellPrice:6,description:'轻便的护身布甲。'},
  'scale-armor': {id:'scale-armor',name:'玄甲鳞衣',slot:'armor',defense:5,tier:'rare',artId:'armor',price:110,sellPrice:30,description:'鳞片卸去锋芒，降低受击伤害。'},
  'bronze-shield': {id:'bronze-shield',name:'铸纹铜盾',slot:'offhand',defense:3,tier:'rare',artId:'shield',price:65,sellPrice:18,description:'铁匠以回收甲片锻成，可卸去近身冲击。'},
  'vanguard-shield': {id:'vanguard-shield',name:'铜关卫盾',slot:'offhand',defense:4,maxHp:10,tier:'epic',artId:'shield',sellPrice:40,description:'演武旧营战利品，坚韧而轻巧。'},
  'march-boots': {id:'march-boots',name:'轻行履',slot:'boots',defense:1,speed:15,tier:'rare',artId:'boots',price:55,sellPrice:15,description:'便于绕开蓄力的行军鞋。'},
  'wind-boots': {id:'wind-boots',name:'回风战靴',slot:'boots',defense:2,speed:20,tier:'epic',artId:'boots',sellPrice:40,description:'平定铜关后的军功奖赏。'},
  'jade-seal': {id:'jade-seal',name:'岐山镇邪印',slot:'ring',attack:4,defense:2,tier:'epic',artId:'ring',sellPrice:45,description:'旧护符现归戒印栏，原有镇邪之力完整保留。'},
  'verdant-ring': {id:'verdant-ring',name:'辛夷养心环',slot:'ring',defense:2,maxHp:15,tier:'rare',artId:'ring',price:95,sellPrice:24,description:'采药人的谢礼，护住心脉。'},
  'silver-ring': {id:'silver-ring',name:'护行银环',slot:'ring',attack:2,defense:1,tier:'common',artId:'ring',price:70,sellPrice:18,description:'商旅常备的小巧护身印。'},
  'storm-ring': {id:'storm-ring',name:'回风雷印',slot:'ring',attack:6,defense:2,tier:'epic',artId:'ring',sellPrice:55,description:'铜关邪阵中凝成的雷印。'},
  'qiankun-ring': {id:'qiankun-ring',name:'乾坤圈',slot:'skill',tier:'epic',artId:'ring',sellable:false,description:'投出金圈，飞出与返回各可伤敌一次。冷却五秒。'},
  'wind-banner': {id:'wind-banner',name:'回风幡',slot:'skill',tier:'rare',artId:'skill',price:130,sellable:false,description:'在身边连续卷出三道风阵，并获得三秒护体。冷却八秒。'},
  potion:{id:'potion',name:'回春散',tier:'common',artId:'potion',price:12,sellPrice:3,heal:45,consumable:'potions',description:'回复45点气血。'},
  gold:{id:'gold',name:'铜钱',tier:'common',artId:'gold'},
  'qingxin-herb':{id:'qingxin-herb',name:'清心草',tier:'material',artId:'herb',resource:'herb',description:'辛夷需要的古道药草。'},
  'scrap-iron':{id:'scrap-iron',name:'旧军甲片',tier:'material',artId:'parts',resource:'parts',description:'伯衡可将三片旧甲料锻成装备。'},
  ...ARSENAL_ITEMS,...CAMPAIGN_ITEMS
});
export const QUEST = Object.freeze({name:'古道除祟',requiredKills:6,descriptions:{
  unaccepted:'与姜尚交谈，领取古道除祟之托。',
  hunt:'前往岐山古道，击败六名邪祟。拾取并装备本职业兵器，按法宝键施展乾坤圈。',
  boss:'古道深处邪将现身。避开蓄力攻击，以乾坤圈往返破阵。',
  return:'邪将已伏。拾取镇邪印，经古道归营点回城，向姜尚复命。',
  complete:'古道已定。与姜尚交谈，可领取下一章「铜关回风」。'
}});
export const CHAPTER = Object.freeze({id:'windpass',name:'铜关回风',requiredKills:4,descriptions:{
  locked:'先平定岐山古道，回城向姜尚复命。',offer:'姜尚托你前往铜关，破除回风邪阵。',
  active:'由东侧铜关阵门入关，击退四名守军，追击回风阵主。',
  return:'回风阵主已败。拾取本职业兵器与雷印，返回姜尚处领军功。',complete:'铜关风息，西岐两路已通。向姜尚领取丹霞渡的新使命，也可回访铜关或挑战演武旧营。'
}});
export const SIDE_QUESTS = Object.freeze({
  herbs:{id:'herbs',name:'辛夷采药',npcId:'apothecary',resource:'herb',required:3,description:'在古道采三株清心草，选择回春散或养心环作为谢礼。'},
  parts:{id:'parts',name:'旧甲新铸',npcId:'smith',resource:'parts',required:3,description:'拾取三片旧军甲片，选择铸纹铜盾或轻行履。'},
  ...CAMPAIGN_SIDE_QUESTS
});
const townGate={id:'portal',name:'前往岐山古道',x:1450,y:840,radius:72,to:'trail'};
const trailGate={id:'portal',name:'归营阵 · 返回西岐',x:140,y:1260,radius:72,to:'city'};
const passGate={id:'portal',name:'铜关归营阵',x:140,y:1280,radius:72,to:'city'};
const trialGate={id:'portal',name:'演武归营阵',x:100,y:890,radius:65,to:'city'};
export const MAPS = Object.freeze({
  city:{id:'city',name:'西岐城',width:1600,height:1100,spawn:{x:800,y:810},portal:townGate,
    portals:[townGate,{id:'pass-gate',name:'前往铜关哨所',x:1450,y:560,radius:65,to:'pass'},
      {id:'trial-gate',name:'前往演武旧营',x:1400,y:1020,radius:60,to:'trial'},
      {id:'ford-gate',name:'前往丹霞渡',x:1450,y:300,radius:60,to:'ford'},
      {id:'siege-gate',name:'前往朝歌外城',x:1450,y:150,radius:60,to:'siege'}],
    npcs:[{id:'elder',name:'姜尚',x:800,y:460,radius:24,artKind:'elder'},
      {id:'smith',name:'铁匠·伯衡',x:1120,y:460,radius:24,artKind:'smith'},
      {id:'apothecary',name:'药师·辛夷',x:530,y:470,radius:24,artKind:'elder'},
      {id:'merchant',name:'行商·阿槐',x:420,y:570,radius:24,artKind:'smith'},
      {id:'scout',name:'斥候·青禾',x:1290,y:650,radius:24,artKind:'raider'}],
    obstacles:[{x:180,y:180,width:350,height:220,kind:'house'},{x:970,y:140,width:360,height:240,kind:'house'},
      {x:270,y:670,width:260,height:190,kind:'house'},{x:650,y:450,width:90,height:90,kind:'well'},
      {x:1050,y:780,width:170,height:130,kind:'tree'},{x:0,y:0,width:1600,height:85,kind:'wall'},
      {x:1190,y:425,width:90,height:80,kind:'forge'}]},
  trail:{id:'trail',name:'岐山古道',width:1800,height:1400,spawn:{x:180,y:1190},portal:trailGate,portals:[trailGate],npcs:[],
    gatherables:[{id:'herb-1',kind:'herb',itemId:'qingxin-herb',x:340,y:980},{id:'herb-2',kind:'herb',itemId:'qingxin-herb',x:680,y:1080},{id:'herb-3',kind:'herb',itemId:'qingxin-herb',x:790,y:490}],
    obstacles:[{x:430,y:250,width:170,height:650,kind:'cliff'},{x:830,y:700,width:360,height:120,kind:'cliff'},
      {x:1220,y:360,width:130,height:360,kind:'ruin'},{x:850,y:100,width:210,height:160,kind:'rock'}]},
  pass:{id:'pass',name:'铜关哨所',width:1800,height:1400,spawn:{x:200,y:1180},portal:passGate,portals:[passGate],npcs:[],repeatable:true,
    gatherables:[{id:'pass-herb-1',kind:'herb',itemId:'qingxin-herb',x:800,y:1100},{id:'pass-herb-2',kind:'herb',itemId:'qingxin-herb',x:1100,y:650}],
    obstacles:[{x:440,y:830,width:280,height:130,kind:'barracks'},{x:1080,y:880,width:240,height:160,kind:'watchpost'},
      {x:780,y:500,width:240,height:100,kind:'wall'},{x:1250,y:250,width:240,height:170,kind:'shrine'},
      {x:250,y:260,width:210,height:300,kind:'cliff'}]},
  trial:{id:'trial',name:'演武旧营',width:1200,height:1000,spawn:{x:180,y:800},portal:trialGate,portals:[trialGate],npcs:[],repeatable:true,
    obstacles:[{x:340,y:380,width:180,height:140,kind:'ruin'},{x:760,y:380,width:180,height:140,kind:'ruin'}]},
  ...CAMPAIGN_MAPS
});
export const NPCS=MAPS.city.npcs;
export const ENEMIES=Object.freeze({
  wolf:{name:'山魈獠兽',hp:32,attack:6,speed:110,radius:19,range:61,windup:.5,cooldown:1.5,xp:14},
  raider:{name:'蚀心兵卒',hp:43,attack:8,speed:82,radius:21,range:65,windup:.65,cooldown:1.7,xp:18},
  shaman:{name:'役火妖人',hp:36,attack:9,speed:65,radius:21,range:250,windup:.9,cooldown:2.2,xp:20},
  boss:{name:'蚀甲邪将',hp:340,attack:17,speed:68,radius:35,range:106,windup:.85,cooldown:1.8,xp:90,boss:true},
  guard:{name:'铜关玄甲卫',hp:86,attack:14,speed:90,radius:23,range:78,windup:.8,cooldown:1.8,xp:25,artKind:'raider',elite:true},
  slinger:{name:'回风术士',hp:65,attack:15,speed:70,radius:21,range:280,windup:.9,cooldown:2.1,xp:26,artKind:'shaman'},
  windlord:{name:'回风阵主',hp:760,attack:28,speed:80,radius:36,range:125,windup:.8,cooldown:1.35,xp:140,artKind:'boss',boss:true},
  trialCaptain:{name:'演武镇将',hp:225,attack:15,speed:78,radius:33,range:105,windup:.85,cooldown:1.7,xp:60,artKind:'boss',boss:true},
  ...CAMPAIGN_ENEMIES
});
export const SPAWNS=[['wolf',300,1050],['raider',440,1110],['wolf',710,1100],['raider',750,910],['shaman',790,560],['raider',1120,520],['wolf',1130,1010],['shaman',1470,810]];
export const ROOM_SPAWNS=Object.freeze({trail:SPAWNS,
  pass:[['guard',560,1050],['slinger',840,1050],['guard',900,760],['slinger',1130,650],['guard',1350,500]],
  trial:[['raider',360,760],['wolf',650,760],['guard',870,710],['slinger',610,560],['trialCaptain',600,250]],
  ...CAMPAIGN_SPAWNS
});
export const SHOPS=BASIC_SHOPS;
