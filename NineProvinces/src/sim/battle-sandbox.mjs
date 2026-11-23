import { UNITS, defaultFormation, formationAllowed } from '../data/battle.mjs';
export const SANDBOX_MAPS={
 plain:{id:'plain',zh:'平原对垒',en:'Open plain',kind:'field',terrain:{hills:0,woods:0,water:0,marsh:0}},
 woods:{id:'woods',zh:'林丘伏击',en:'Wooded hills',kind:'field',terrain:{hills:.17,woods:.20,water:0,marsh:.03}},
 pass:{id:'pass',zh:'狭关争道',en:'Mountain pass',kind:'field',terrain:{hills:.10,woods:.05,water:0,marsh:0,pass:true}},
 siege:{id:'siege',zh:'城门攻防',en:'Siege',kind:'siege',terrain:{hills:.05,woods:.05,water:0,marsh:0}},
 river:{id:'river',zh:'江上水战',en:'River battle',kind:'naval',terrain:{hills:0,woods:0,water:.8,marsh:0}}
};
export const DEFAULT_SANDBOX={map:'plain',seed:184,armies:[[{unit:'spear',troops:6000,formation:'fishscale'},{unit:'archer',troops:6000,formation:'geese'}],[{unit:'lightcav',troops:6000,formation:'arrowhead'},{unit:'halberd',troops:6000,formation:'fishscale'}]]};
/** No realm references, campaign writes, technology costs, or hidden combat bonuses. */
export function createSandboxSetup(config={}) {
 const map=SANDBOX_MAPS[config.map??DEFAULT_SANDBOX.map];if(!map)throw new Error('Unknown sandbox map');
 const armies=config.armies??DEFAULT_SANDBOX.armies;
 if(!Array.isArray(armies)||armies.length!==2||armies.some(a=>!Array.isArray(a)||a.length<1||a.length>4))throw new Error('Each side needs one to four units');
 const seed=Number.isInteger(config.seed)?config.seed>>>0:184;
 const units=armies.flatMap((army,side)=>army.map(row=>{
  const kind=UNITS[row.unit];if(!kind)throw new Error('Unknown troop kind');
  if(map.kind!=='naval'&&kind.group==='navy')throw new Error('Ships require a river map');
  const troops=Number.isFinite(+row.troops)?Math.max(1000,Math.min(20000,Math.round(+row.troops/100)*100)):6000;
  return {side,unit:kind.id,general:null,deputies:[],faction:side?'caocao':'liubei',troops,morale:80,training:60,formation:formationAllowed(kind.id,row.formation)?row.formation:defaultFormation(kind.id)};
 }));
 return {id:'sandbox-'+seed,kind:map.kind,place:{link:['pingyuan','nanpi']},sandboxMap:map.id,seed,wall:map.kind==='siege'?40:0,special:null,terrain:{...map.terrain},units,factions:['liubei','caocao']};
}
