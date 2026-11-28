// Campaign setup and title roster share the existing simulation validators.
// These drafts live only in the menu; they do not mutate a campaign or a save.
import { FACTIONS } from '../data/factions.mjs';
import { NODES } from '../data/map.mjs';
import { BRANCHES } from '../sim/story.mjs';
import { createGame, power } from '../sim/world.mjs';
import { SCENARIOS, scenarioOf } from '../sim/scenarios.mjs';
import { normalizeRoster, newRosterOfficer, OFFICER_STATS } from '../custom-officers.mjs';
import { BANNER_COLOURS, customFactionOptions, validateCustomFaction } from '../sim/custom-faction.mjs';
import { freshFounding, reconcileFounding, foundingSubmission, filterFoundingOfficers, foundingErrorText } from './founding.mjs';
import { nm, t } from '../i18n.mjs';
import { pair } from './text.mjs';
import { generalName, placeName } from '../view/names.mjs';

export function createCampaignDraft(app, pickedBranch=null) {
  const pick={scenario:'184',mode:'historical',branch:BRANCHES[pickedBranch]?pickedBranch:'caocao',faction:null,lifespan:'history',command:true,difficulty:'normal'};
  const founding=freshFounding(), selected=new Set();
  let demo=app.demoState?.scenario==='184'?app.demoState:createGame({seed:184});
  let cachedOptions=null, cachedRoster='', cachedDemo=null;
  const roster=()=>normalizeRoster(app.officerRoster?.()??[]);
  const options=()=>{
    const people=roster(), key=JSON.stringify(people);
    if(cachedDemo!==demo||cachedRoster!==key){cachedDemo=demo;cachedRoster=key;cachedOptions=customFactionOptions(demo,people);}
    return cachedOptions;
  };
  const fixed=()=>pick.mode==='historical'&&pick.scenario==='184'?BRANCHES[pick.branch]?.faction??null:null;
  function reconcile(){
    if(fixed())pick.faction=fixed();
    if(!demo.factions[pick.faction]?.alive)pick.faction='caocao';
    if(pick.mode==='custom')reconcileFounding(demo,roster(),founding);
    const keep=new Set(roster().map(g=>g.id)); for(const id of selected)if(!keep.has(id))selected.delete(id);
  }
  function focus(){const n=NODES[pick.mode==='custom'?founding.town:demo.factions[pick.faction]?.capital];if(n)app.map?.focus(n.id,90);}
  function applyDemo(next){demo=next;app.demoState=demo;app.map?.refreshLands?.(true);reconcile();focus();}
  applyDemo(demo);
  return {
    pick,founding,selected,roster,options,reconcile,focus,fixed,
    get demo(){return demo},
    get chosen(){return demo.factions[pick.faction]},
    get spec(){return scenarioOf(pick.scenario)},
    get factions(){return Object.values(demo.factions).filter(f=>f.alive).map(f=>({f,p:power(demo,f.id)})).sort((a,b)=>b.p.cities-a.p.cities||b.p.troops-a.p.troops)},
    chooseScenario(id){if(!SCENARIOS[id])return false;pick.scenario=id;if(id!=='184')pick.branch='free';applyDemo(createGame({scenario:id,seed:184,branch:'free',faction:pick.faction??'caocao'}));return true;},
    chooseMode(mode){if(!['historical','custom'].includes(mode))return false;pick.mode=mode;reconcile();focus();return true;},
    chooseBranch(id){if(!BRANCHES[id]||pick.scenario!=='184'||pick.mode!=='historical')return false;pick.branch=id;pick.faction=BRANCHES[id].faction??pick.faction;reconcile();focus();return true;},
    chooseFaction(id){if(pick.mode==='custom'||fixed()||!demo.factions[id]?.alive)return false;pick.faction=id;focus();return true;},
    chooseTown(id){if(pick.mode!=='custom'||!options().towns.some(n=>n.id===id))return false;founding.town=id;focus();return true;},
    chooseRuler(ref){if(!options().officers.some(g=>g.ref===ref))return false;founding.ruler=ref;founding.companions=founding.companions.map(x=>x===ref?'':x);return true;},
    chooseCompanion(index,ref){if(!Number.isInteger(index)||index<0||index>2)return false;if(ref&&(!options().officers.some(g=>g.ref===ref)||ref===founding.ruler||founding.companions.some((x,i)=>x===ref&&i!==index)))return false;founding.companions[index]=ref;return true;},
    officers(index){const ruler=index==='ruler';const current=ruler?founding.ruler:founding.companions[index]??'';const excluded=ruler?[]:[founding.ruler,...founding.companions.filter((_,i)=>i!==index)];return filterFoundingOfficers(options().officers,founding.search,current,excluded);},
    setFounding(key,value){if(['zh','en','flag','search'].includes(key)){founding[key]=String(value??'');return true;}if(key==='colour'&&BANNER_COLOURS.includes(value)){founding.colour=value;return true;}return false;},
    selectOfficer(id,on){if(!roster().some(g=>g.id===id))return false;if(on)selected.add(id);else selected.delete(id);return true;},
    setRule(key,value){if(key==='lifespan'&&['history','fiction'].includes(value))pick.lifespan=value;else if(key==='command'&&typeof value==='boolean')pick.command=value;else if(key==='difficulty'&&['easy','normal','hard'].includes(value))pick.difficulty=value;else return false;return true;},
    validation(){return pick.mode==='custom'?validateCustomFaction(demo,foundingSubmission(founding),roster()):{ok:!!demo.factions[pick.faction]?.alive,errors:[]};},
    summary(){
      let result;
      if(pick.mode==='custom'){
        const valid=this.validation(), town=valid.options.towns.find(n=>n.id===valid.config.town), ruler=valid.options.officers.find(g=>g.ref===valid.config.ruler), companions=valid.config.companions.map(ref=>valid.options.officers.find(g=>g.ref===ref)).filter(Boolean);
        result=[pair(['起家城：','Town: '])+(town?nm(town):'—'),pair(['主公：','Ruler: '])+(ruler?nm(ruler):'—'),pair(['同行：','Companions: '])+(companions.length?companions.map(nm).join(' / '):pair(['无','None']))].join(' · ');
      }else{const chosen=demo.factions[pick.faction];result=[placeName(chosen.capital),generalName(chosen.ruler),nm(chosen.name??FACTIONS[chosen.id])].join(' · ');}
      const rules=[nm(scenarioOf(pick.scenario)),t(pick.lifespan==='history'?'lifeHistory':'lifeFiction'),t(pick.command?'commandOn':'commandOff'),t(pick.difficulty)].join(' · ');
      return {result,rules};
    },
    errorText(){return foundingErrorText(this.validation().errors);},
    submit(){const valid=this.validation();if(!valid.ok)return false;const officers=roster();app.newGame(pick.mode==='custom'?{...pick,branch:'free',officers,customFaction:valid.config}:{...pick,officers:officers.filter(g=>selected.has(g.id))});return true;}
  };
}

const errors={
  name:['姓名请输入1–12字，不含尖括号。','Enter a name of 1–12 characters without angle brackets.'],english:['英文名最多48字。','The English name can contain at most 48 characters.'],age:['出场年龄为16–60岁。','Starting age must be 16–60.'],portrait:['请选择现有形象。','Choose an available portrait.'],service:['请选择仕官或在野。','Choose service or unattached status.'],stats:['五项能力各为20–90的整数。','Each ability must be a whole number from 20 to 90.'],budget:['五项能力总和不能超过350。','The five abilities must total no more than 350.'],trait:['请选择列表中的特性。','Choose a listed trait.'],duplicate:['名册中已有同名人物。','An officer with this name is already registered.'],limit:['名册最多保存12名人物。','The roster holds at most 12 officers.'],save:['浏览器未能保存名册，请重试。','The browser could not save the roster. Please retry.']
};
const fresh=()=>({zh:'',en:'',age:24,female:false,portrait:0,service:'player',stats:{lead:70,war:70,int:70,pol:70,cha:70},trait:null});
export function createOfficerDraft(app){
  let draft=fresh(), roster=normalizeRoster(app.officerRoster?.()??[]), message=null, ok=false;
  const save=list=>{if(typeof app.saveOfficerRoster!=='function'||app.saveOfficerRoster(list)===false){message=['save'];ok=false;return false;}roster=normalizeRoster(list);return true;};
  return {
    get draft(){return draft},get roster(){return roster},get ok(){return ok},
    message(){return message?Array.isArray(message[0])?pair(message[0]):message.map(k=>pair(errors[k])).join(' '):'';},
    budget(){return Object.values(draft.stats).reduce((sum,n)=>sum+(Number.isFinite(n)?n:0),0);},
    set(key,value){if(!['zh','en','age','female','portrait','service','trait'].includes(key))return false;draft[key]=key==='age'||key==='portrait'?Number(value):value;return true;},
    setStat(key,value){if(!OFFICER_STATS.includes(key))return false;draft.stats[key]=value===''?NaN:Number(value);return true;},
    commit(){const result=newRosterOfficer(draft,roster);if(!result.ok){message=result.errors;ok=false;return false;}if(!save([...roster,result.officer]))return false;message=[['已登录。新开局时勾选此人即可出场。','Registered. Select this officer when starting a new campaign.']];ok=true;draft=fresh();return true;},
    remove(id){if(!roster.some(g=>g.id===id)||!save(roster.filter(g=>g.id!==id)))return false;message=[['已从未来开局名册移除；已有存档不变。','Removed from the roster for future campaigns. Existing saves are unchanged.']];ok=true;return true;}
  };
}
