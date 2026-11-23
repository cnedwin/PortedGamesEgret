import { UNITS, defaultFormation, formationAllowed } from '../data/battle.mjs';
import { GENERALS } from '../data/generals.mjs';
import { createBattle } from './battle.mjs';
export const SANDBOX_MAPS={
 plain:{id:'plain',zh:'平原对垒',en:'Open plain',kind:'field',terrain:{hills:0,woods:0,water:0,marsh:0}},
 woods:{id:'woods',zh:'林丘伏击',en:'Wooded hills',kind:'field',terrain:{hills:.17,woods:.20,water:0,marsh:.03}},
 pass:{id:'pass',zh:'狭关争道',en:'Mountain pass',kind:'field',terrain:{hills:.10,woods:.05,water:0,marsh:0,pass:true}},
 siege:{id:'siege',zh:'城门攻防',en:'Siege',kind:'siege',terrain:{hills:.05,woods:.05,water:0,marsh:0}},
 river:{id:'river',zh:'江上水战',en:'River battle',kind:'naval',terrain:{hills:0,woods:0,water:.8,marsh:0}}
};
export const DEFAULT_SANDBOX={map:'plain',seed:184,armies:[[{unit:'spear',troops:6000,formation:'fishscale'},{unit:'archer',troops:6000,formation:'geese'}],[{unit:'lightcav',troops:6000,formation:'arrowhead'},{unit:'halberd',troops:6000,formation:'fishscale'}]]};
const row=(unit,troops,formation,general=null)=>({unit,troops,formation,general});
export const ENCOUNTERS={
 spears:{id:'spears',zh:'鹤翼拒骑',en:'Hold against horse',tag:['入门 · 接敌与克制','Intro · Contact & counters'],description:['以枪阵护住后排弓军。骑兵冲来时，选枪军拦截，再让弓军集火。','Protect the bows with spears. Intercept horse with the front line, then focus the archers.'],objective:['击退红军；保护后排弓军','Break the red army; protect the archers'],config:{map:'plain',seed:184,armies:[[row('spear',8000,'fishscale','guanyu'),row('archer',5000,'geese','huangzhong')],[row('cavalry',8500,'arrowhead','xiahoudun'),row('lightcav',4500,'crescent','zhangliao')]]}},
 woodland:{id:'woodland',zh:'林丘破阵',en:'Ambush in the hills',tag:['进阶 · 地形与夹击','Tactical · Ground & flanks'],description:['山林会削弱骑兵冲势。让前军守住有利地形，弓军绕侧形成交叉火力。','Rough ground blunts horse. Hold defensible ground and flank with supporting bow fire.'],objective:['利用林丘，击退红军','Use the wooded heights and break the red army'],config:{map:'woods',seed:129,armies:[[row('halberd',6500,'fishscale','zhangfei'),row('archer',5500,'geese','huangzhong')],[row('spear',8000,'fishscale','caoren'),row('sword',5500,'square','lidian')]]}},
 breach:{id:'breach',zh:'破关夺营',en:'Breach the gate',tag:['攻城 · 器械与本营','Siege · Engines & keep'],description:['护送冲车接近城门。井阑支援攀墙；破门后抢占本营并守满十秒。','Escort the ram to the gate. Towers support climbers; break in and hold the keep for ten seconds.'],objective:['破门并占营10秒，或击退守军','Breach and hold the keep for 10s, or break the garrison'],config:{map:'siege',seed:311,armies:[[row('spear',8000,'fishscale','guanyu'),row('ram',3500,'square'),row('tower',2500,'square'),row('archer',4000,'geese','huangzhong')],[row('sword',7000,'square','caoren'),row('archer',4500,'geese','xiahouyuan')]]}},
 riverfire:{id:'riverfire',zh:'江上火攻',en:'Fire on the river',tag:['水战 · 施策与风向','Naval · Fire & wind'],description:['周瑜蓄怒后可施赤壁之火。先用前舰牵制，点亮施策，再选择敌舰确认范围。','Build Zhou Yu’s rage for Red Cliffs fire. Screen with the front ship, arm the tactic and choose an enemy ship to inspect its area.'],objective:['用火攻打开缺口，击退敌舰','Use fire to break through the enemy fleet'],config:{map:'river',seed:17,armies:[[row('louchuan',8000,'square','zhouyu'),row('mengchong',6000,'fishscale','huanggai')],[row('doujian',16000,'square','caocao'),row('doujian',6000,'square','caoren')]]}}
};
export function encounterConfig(id){const e=ENCOUNTERS[id];if(!e)throw new Error('Unknown encounter');return {...JSON.parse(JSON.stringify(e.config)),encounter:id};}
/** No realm references, campaign writes, technology costs, or hidden combat bonuses. */
export function createSandboxSetup(config={}) {
 const map=SANDBOX_MAPS[config.map??DEFAULT_SANDBOX.map];if(!map)throw new Error('Unknown sandbox map');
 const armies=config.armies??DEFAULT_SANDBOX.armies;
 if(!Array.isArray(armies)||armies.length!==2||armies.some(a=>!Array.isArray(a)||a.length<1||a.length>4))throw new Error('Each side needs one to four units');
 const seed=Number.isInteger(config.seed)?config.seed>>>0:184;
 const units=armies.flatMap((army,side)=>army.map(row=>{
  const kind=UNITS[row.unit];if(!kind)throw new Error('Unknown troop kind');
  if(row.general&&!GENERALS[row.general])throw new Error('Unknown officer');
  if(map.kind!=='naval'&&kind.group==='navy')throw new Error('Ships require a river map');
  const troops=Number.isFinite(+row.troops)?Math.max(1000,Math.min(20000,Math.round(+row.troops/100)*100)):6000;
  return {side,unit:kind.id,general:row.general??null,deputies:[],faction:side?'caocao':'liubei',troops,morale:80,training:60,formation:formationAllowed(kind.id,row.formation)?row.formation:defaultFormation(kind.id)};
 }));
 return {id:'sandbox-'+seed,kind:map.kind,place:{link:['pingyuan','nanpi']},sandboxMap:map.id,encounterId:ENCOUNTERS[config.encounter]?config.encounter:null,seed,wall:map.kind==='siege'?40:0,special:null,terrain:{...map.terrain},units,factions:['liubei','caocao']};
}

/** Official base officer abilities/traits, with no campaign tech, experience, treasure or save references. */
export function createSandboxBattle(config={}) {
 const setup=createSandboxSetup(config);
 return createBattle(setup,{generals:{},factions:{liubei:{techs:[]},caocao:{techs:[]}}});
}
