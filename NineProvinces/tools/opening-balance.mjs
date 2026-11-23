// Reproducible opening diagnostics, not a claim of human completion.
// Run from NineProvinces: node tools/opening-balance.mjs --days=720
//   --seeds=7,19,43 --policies=idle,basic --out=/path/to/openings.json
// Add --case=custom --policies=prepared for a conservative defence policy;
// --case=200-custom --towns=all compares all alternate founding candidates.
// Runs at below-normal OS priority; it does not open a renderer or read saves.
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setPriority, constants } from 'node:os';
import { createGame, advance, income, upkeep, power, startWork, workQuote, study, recruit } from '../src/sim/world.mjs';
import { NODES } from '../src/data/map.mjs';
import { GENERALS } from '../src/data/generals.mjs';
import { FACTIONS } from '../src/data/factions.mjs';
import { dateOf, serving } from '../src/sim/core.mjs';
import { answerStory } from '../src/sim/story.mjs';
import { customFactionOptions } from '../src/sim/custom-faction.mjs';

try { setPriority(process.pid, constants.priority.PRIORITY_BELOW_NORMAL); } catch {}
const args = Object.fromEntries(process.argv.slice(2).map(value => value.replace(/^--/, '').split('=')));
const seeds = (args.seeds ?? '7,19,43').split(',').map(Number);
const days = Number(args.days ?? 720);
const policies = (args.policies ?? 'idle,basic').split(',');
const cases = [
  ...['caocao','liubei','sunjian','dongzhuo','yuanshao'].map(faction => ({id:'184-'+faction,scenario:'184',faction,branch:faction})),
  {id:'184-kongrong',scenario:'184',faction:'kongrong',branch:'free'},
  ...[['190',['caocao','liubei','dongzhuo','shixie']],['200',['caocao','yuanshao','liubei','zhangyan']],['208',['caocao','liubei','sunjian','shixie']],['219',['caocao','liubei','sunjian','gongsundu']]]
    .flatMap(([scenario,factions])=>factions.map(faction=>({id:scenario+'-'+faction,scenario,faction,branch:'free'}))),
  ...['184','190','200','208','219'].flatMap(scenario => [1,4].map(members=>({id:scenario+'-custom'+members,scenario,custom:members,branch:'free'})))
];
const jobs = args.towns === 'all' ? cases.flatMap(config => {
  if (!config.custom || (args.case && !config.id.includes(args.case))) return [];
  const original = createGame({scenario:config.scenario,seed:7,command:false});
  return customFactionOptions(original).towns.map(town => ({...config,id:config.id+'-'+town.id,town:town.id}));
}) : cases;
function summary(state, faction) {
  const f = state.factions[faction];
  const nodes = Object.keys(state.nodes).filter(id => state.nodes[id].owner === faction);
  const cities = nodes.filter(id => NODES[id].kind === 'city');
  const earned = nodes.reduce((all,id) => { const one=income(state,id);all.coin+=one.coin;all.grain+=one.grain;return all; },{coin:0,grain:0});
  const spent = upkeep(state,faction);
  const harvest = nodes.reduce((sum,id) => sum+Math.round(state.nodes[id].farm*160*Math.sqrt(state.nodes[id].people/300000)),0);
  return {name:f.name?.en??FACTIONS[faction]?.en??faction,alive:f.alive,coin:Math.round(f.coin),grain:Math.round(f.grain),...power(state,faction),
    officersAtCapital:serving(state,faction,f.capital).length,governedCities:cities.filter(id=>state.nodes[id].governor).length,
    support:cities.length?Math.round(cities.reduce((s,id)=>s+state.nodes[id].support,0)/cities.length):0,
    order:cities.length?Math.round(cities.reduce((s,id)=>s+state.nodes[id].order,0)/cities.length):0,
    income:earned,upkeep:spent,netCoin:earned.coin-spent.coin,annualGrain:12*(earned.grain-spent.grain)+harvest,
    treaties:Object.entries(f.treaties).filter(([,t])=>t.until>state.day).map(([id,t])=>({id,kind:t.kind,left:t.until-state.day})),
    topOfficers:serving(state,faction).map(id=>({id,ability:Object.values(GENERALS[id].stats).reduce((a,b)=>a+b,0)})).sort((a,b)=>b.ability-a.ability).slice(0,4)};
}
function make(config,seed) {
  if (!config.custom) return createGame({...config,seed,command:false,difficulty:'normal'});
  const original = createGame({scenario:config.scenario,seed,command:false});
  const town = config.town ?? customFactionOptions(original).towns[0].id;
  const officers=Array.from({length:config.custom},(_,i)=>({id:'u'+(i+1),zh:'试验义士'+i,en:'Test officer '+i,age:25+i,female:false,portrait:i,service:'player',stats:{lead:70,war:70,int:70,pol:70,cha:70},trait:i===0?'neizheng':null}));
  const state = createGame({scenario:config.scenario,seed,command:false,difficulty:'normal',officers,
    customFaction:{zh:'试验义军',en:'Study banner',flag:'义',colour:0x85643f,town,ruler:'roster:u1',companions:officers.slice(1).map(g=>'roster:'+g.id)}});
  return state;
}
function basic(state, prepared = false) {
  const f=state.factions[state.player];
  if (!f.alive) return;
  const town=f.capital, node=state.nodes[town];
  if (!node || node.owner!==state.player) return;
  const q=summary(state,state.player);
  if (prepared && node.troops<12000 && f.coin>=2400 && f.grain>q.upkeep.grain*8) {
    recruit(state,state.player,town,Math.min(2000,12000-node.troops));
  }
  if(node.work)return;
  // One deliberate city-work order per month, with a cash reserve. No wars,
  // gifts, conscription spam, reloads or power/treasury injection.
  const priorities=q.annualGrain<0?['farm','market']:q.netCoin<100?['market','farm']:prepared?['wall','market','farm']:['farm','market','office'];
  for(const kind of priorities){const quote=workQuote(state,town,kind);if(!quote.full&&f.coin>=quote.coin+(prepared?2000:800)){startWork(state,state.player,town,kind);break;}}
  if (!f.research.current && !f.techs.includes('writing')) study(state,state.player,'writing');
}
const report={method:'No player army orders; command=false resolves actual battles via ordinary autoBattle. Story answers choose first available; other blocking notices dismissed. Basic policy orders at most one capital work/month with 800 coin reserve and Writing; no recruitment. Prepared adds at most 2000 recruits/month up to a 12000 capital garrison, eight months grain buffer, 2000 coin reserve and walls when budget permits. No gifts or treasury manipulation. Normal difficulty. Runtime at below-normal OS priority. Opening diagnostics do not claim human completion.',days,seeds,policies,opening:{},runs:[]};
for(const scenario of ['184','190','200','208','219']){
  const s=createGame({scenario,seed:7,command:false});
  report.opening[scenario]=Object.values(s.factions).filter(f=>f.alive).map(f=>({id:f.id,...summary(s,f.id)}));
}
const start = performance.now();
for(const config of jobs){
  if(args.case&&!config.id.includes(args.case))continue;
  for(const seed of seeds)for(const policy of policies){
    const state=make(config,seed),player=state.player,initial=summary(state,player),firstDay=state.day;
    const row={id:config.id,seed,policy,town:state.founding?.town??state.factions[player].capital,initial,milestones:[],hungerMonths:0,zeroCoinMonths:0,firstLoss:null,firstSiege:null,minimumSupport:100};
    let lastLogDay=-1;
    for(let n=0;n<days&&!state.over;n++){
      for(const message of [...state.inbox]){
        if(message.kind==='story')answerStory(state,message.event,0);
        else state.inbox=state.inbox.filter(item=>item!==message);
      }
      if((policy==='basic'||policy==='prepared')&&dateOf(state.day).day===1)basic(state,policy==='prepared');
      advance(state);
      if(state.log[0]?.day!==lastLogDay){
        for(const entry of state.log)if(entry.day>lastLogDay&&entry.key==='logHunger')row.hungerMonths++;
        lastLogDay=state.log[0]?.day??lastLogDay;
      }
      const elapsed=state.day-firstDay;
      if(!row.firstSiege){
        const besiegers=Object.values(state.armies).filter(a=>a.besieging&&state.nodes[a.besieging]?.owner===player&&a.faction!==player);
        if(besiegers.length){row.firstSiege=elapsed;row.firstAttackers=besiegers.map(a=>({faction:a.faction,troops:a.troops,commander:a.commander,place:a.besieging}));}
      }
      if(dateOf(state.day).day===1){
        const snap=summary(state,player);
        row.minimumSupport=Math.min(row.minimumSupport,snap.support);
        if(snap.coin===0)row.zeroCoinMonths++;
        if(snap.cities<initial.cities&&row.firstLoss===null)row.firstLoss=elapsed;
      }
      if([180,300,360,540,720].includes(elapsed))row.milestones.push({day:elapsed,...summary(state,player)});
      if(n%120===0)await new Promise(resolve=>setImmediate(resolve));
    }
    row.elapsed=state.day-firstDay;
    row.over=state.over;
    if(row.over)row.lastEvents=state.log.slice(0,6);
    row.final=summary(state,player);
    if(row.firstLoss===null&&row.final.cities<initial.cities)row.firstLoss=row.elapsed;
    row.storyEvents=Object.keys(state.fired).filter(id=>state.fired[id]!=='missed');
    report.runs.push(row);
  }
  console.log(config.id,JSON.stringify(report.runs.filter(row=>row.id===config.id).map(r=>({seed:r.seed,policy:r.policy,coin:r.final.coin,grain:r.final.grain,cities:r.final.cities,officers:r.final.generals,hunger:r.hungerMonths,firstLoss:r.firstLoss,over:r.over?.kind??null}))));
  if (args.out) await writeFile(resolve(args.out), JSON.stringify({ ...report, seconds: (performance.now() - start) / 1000 }, null, 2) + '\n');
}
console.log('done',report.runs.length,'runs',Math.round((performance.now()-start)/1000),'seconds');
