// Authored late-campaign world data. Water rectangles are solid; the bridge
// opening is deliberately left clear for both pathfinding and manual movement.
const fordReturn={id:'portal',name:'丹霞归营阵',x:140,y:1280,radius:72,to:'city'};
const siegeReturn={id:'portal',name:'外城归营阵',x:140,y:1390,radius:72,to:'city'};
export const CAMPAIGN_MAPS=Object.freeze({
 ford:{id:'ford',name:'丹霞渡',width:1800,height:1400,spawn:{x:200,y:1190},portal:fordReturn,portals:[fordReturn],npcs:[],repeatable:true,
  decorations:[{x:700,y:620,width:280,height:180,kind:'bridge'}],
  gatherables:[{id:'survivor-1',kind:'rescue',questId:'ferry',itemId:'rescued-runner',name:'受困驿卒',x:520,y:1030},
   {id:'survivor-2',kind:'rescue',questId:'ferry',itemId:'rescued-runner',name:'失散舟工',x:1080,y:520}],
  obstacles:[{x:0,y:640,width:700,height:140,kind:'water'},{x:980,y:640,width:820,height:140,kind:'water'},
   {x:310,y:900,width:180,height:100,kind:'rock'},{x:1170,y:900,width:280,height:160,kind:'watchpost'},
   {x:1150,y:270,width:300,height:160,kind:'shrine'},{x:280,y:180,width:230,height:280,kind:'cliff'}]},
 siege:{id:'siege',name:'朝歌外城',width:2000,height:1500,spawn:{x:200,y:1300},portal:siegeReturn,portals:[siegeReturn],npcs:[],repeatable:true,
  gatherables:[{id:'beacon-1',kind:'beacon',questId:'beacons',itemId:'beacon-report',name:'南门烽台',x:560,y:1190},
   {id:'beacon-2',kind:'beacon',questId:'beacons',itemId:'beacon-report',name:'东营烽台',x:1050,y:710},
   {id:'beacon-3',kind:'beacon',questId:'beacons',itemId:'beacon-report',name:'内门烽台',x:1220,y:340}],
  obstacles:[{x:0,y:900,width:650,height:120,kind:'wall'},{x:950,y:900,width:1050,height:120,kind:'wall'},
   {x:100,y:440,width:540,height:110,kind:'wall'},{x:970,y:440,width:900,height:110,kind:'wall'},
   {x:1220,y:1050,width:300,height:180,kind:'barracks'},{x:330,y:610,width:250,height:150,kind:'ruin'},
   {x:1320,y:600,width:200,height:200,kind:'tower'},{x:1590,y:180,width:280,height:180,kind:'shrine'}]}
});
export const CAMPAIGN_ENEMIES=Object.freeze({
 fenwolf:{name:'渡口魇狼',artKind:'wolf',hp:116,attack:22,speed:137,radius:20,range:90,windup:.64,cooldown:1.35,xp:31},
 sentinel:{name:'镇渡玄甲卫',artKind:'raider',hp:168,attack:23,speed:88,radius:25,range:90,windup:.85,cooldown:1.75,xp:40,elite:true},
 channeler:{name:'潮祭术士',artKind:'shaman',hp:122,attack:24,speed:78,radius:22,range:340,windup:1.15,cooldown:2.25,xp:37},
 riverLord:{name:'丹霞断潮君',artKind:'boss',hp:1180,attack:36,speed:82,radius:38,range:285,windup:1.1,cooldown:1.25,xp:220,boss:true},
 warMarshal:{name:'朝歌镇门将',artKind:'boss',hp:1660,attack:43,speed:87,radius:42,range:310,windup:1.1,cooldown:1.15,xp:320,boss:true}
});
export const CAMPAIGN_SPAWNS=Object.freeze({
 ford:[['fenwolf',400,1090],['sentinel',730,1020],['channeler',840,850],['fenwolf',1070,580],['sentinel',1240,540]],
 siege:[['sentinel',460,1260],['channeler',780,1130],['fenwolf',1080,1130],['sentinel',800,790],['channeler',1150,670],['sentinel',810,330]]
});
export const CAMPAIGNS=Object.freeze({
 ford:{id:'danxia-ford',mapId:'ford',name:'丹霞渡',requiredKills:4,bossKind:'riverLord',boss:{x:1450,y:210},gold:260,reward:'danxia-talisman',
  descriptions:{locked:'平定铜关并向姜尚复命，方可前往丹霞渡。',offer:'渡口风息潮却不退，姜尚请你寻回被潮阵困住的舟人。',
   active:'穿过丹霞木桥，击退四名潮阵守军，迎战断潮君。注意潮环内的安全地带。',return:'丹霞水路已通。护送幸存者回营，再向姜尚复命。',complete:'丹霞渡恢复通航。朝歌外城的烽火仍未熄灭。'}},
 siege:{id:'chaoge-siege',mapId:'siege',name:'朝歌外城',requiredKills:5,bossKind:'warMarshal',boss:{x:1450,y:240},gold:400,reward:'chaoge-seal',
  descriptions:{locked:'平定丹霞渡并向姜尚复命，方可进入朝歌外城。',offer:'商旅终于渡过丹霞，外城守将却以烽阵封路。去拆开最后一道城门。',
   active:'穿过两重断墙，击败五名烽阵守军，再破镇门将。交叉火区的空隙可以躲避重击。',return:'外城镇将已败。回西岐报捷，领取最后一份军功。',complete:'古道、铜关、丹霞与朝歌外城都已畅通。可回访各地刷取稀有军械，继续精锻行装。'}}
});
export const CAMPAIGN_SIDE_QUESTS=Object.freeze({
 ferry:{id:'ferry',name:'渡口故人',npcId:'merchant',resource:'survivors',required:2,
  description:'在丹霞渡找到两名幸存者，先清除他们身边的邪祟，再靠近施救。可选补给或护行戒。'},
 beacons:{id:'beacons',name:'断烽夜行',npcId:'scout',resource:'beacons',required:3,
  description:'清除朝歌外城三座烽台附近的守军，逐一断开烽阵，回青禾处选择军饷或锻材补给。'}
});
export const CAMPAIGN_ITEMS=Object.freeze({
 'danxia-talisman':{id:'danxia-talisman',name:'丹霞镇潮印',slot:'ring',tier:'epic',artId:'ring',attack:4,defense:3,maxHp:20,sellPrice:60,description:'渡口重归安宁的见证，护住持印者的心脉。'},
 'chaoge-seal':{id:'chaoge-seal',name:'朝歌定军印',slot:'ring',tier:'epic',artId:'ring',attack:8,defense:4,maxHp:25,sellPrice:95,description:'外城破阵的军功印，可在任何职业的戒印栏中装备。'},
 'rescued-runner':{id:'rescued-runner',name:'救援记录',tier:'material',artId:'herb',resource:'survivors',description:'丹霞渡救出的幸存者已经沿归路回城。'},
 'beacon-report':{id:'beacon-report',name:'断烽战报',tier:'material',artId:'parts',resource:'beacons',description:'一座外城烽台已被拆除。'}
});
