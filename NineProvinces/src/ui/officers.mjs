import { normalizeRoster, newRosterOfficer, OFFICER_LIMIT, OFFICER_STATS, OFFICER_TRAITS } from '../custom-officers.mjs';
import { TRAITS } from '../data/traits.mjs';
import { nm, t } from '../i18n.mjs';
import { $, h, button, clear } from './dom.mjs';
import { pair } from './text.mjs';

const art = (index, kind = 'panel') => new URL(`../../assets/portraits/${kind}/type-${index}.webp`, import.meta.url).href;
const errors = {
  name: ['姓名请输入1–12字，不含尖括号。','Enter a name of 1–12 characters without angle brackets.'],
  english: ['英文名最多48字。','The English name can contain at most 48 characters.'],
  age: ['出场年龄为16–60岁。','Starting age must be 16–60.'],
  portrait: ['请选择现有形象。','Choose an available portrait.'],
  service: ['请选择仕官或在野。','Choose service or unattached status.'],
  stats: ['五项能力各为20–90的整数。','Each ability must be a whole number from 20 to 90.'],
  budget: ['五项能力总和不能超过350。','The five abilities must total no more than 350.'],
  trait: ['请选择列表中的特性。','Choose a listed trait.'],
  duplicate: ['名册中已有同名人物。','An officer with this name is already registered.'],
  limit: ['名册最多保存12名人物。','The roster holds at most 12 officers.'],
  save: ['浏览器未能保存名册，请重试。','The browser could not save the roster. Please retry.']
};

/** Title registration never edits a running campaign or its save slots. */
export function showOfficerRoster(app, back) {
  const box = $('#title');
  let roster = normalizeRoster(app.officerRoster?.() ?? []);
  let draft = fresh(), message = '', ok = false;
  function fresh() { return { zh:'',en:'',age:24,female:false,portrait:0,service:'player',stats:{lead:70,war:70,int:70,pol:70,cha:70},trait:null }; }
  function save(list) {
    if (typeof app.saveOfficerRoster !== 'function' || app.saveOfficerRoster(list) === false) {
      message=pair(errors.save);ok=false;return false;
    }
    roster=normalizeRoster(list);return true;
  }
  function render() {
    app.screen = 'roster';
    clear(box); box.hidden=false; box.className='title setup officerSetup';
    const note=h('p.rosterMessage',{role:'status',className:ok?'rosterMessage good':'rosterMessage'},message);
    const total=h('output.officerBudget');
    const showBudget=()=>{const sum=Object.values(draft.stats).reduce((a,b)=>a+(Number.isFinite(b)?b:0),0);total.value=pair(['能力合计 ','Ability total '])+sum+' / 350';total.classList.toggle('over',sum>350)};
    const field=(label,input)=>h('label.officerField',h('span',label),input);
    const number=(key,value,min,max,oninput)=>h('input',{type:'number',name:key,value,min,max,step:1,inputMode:'numeric',oninput});
    const preview=h('img.officerPreview',{src:art(draft.portrait),alt:pair(['所选武将形象','Selected officer portrait']),draggable:false});
    const form=h('form.officerForm',{onsubmit:event=>{event.preventDefault();commit();}},
      h('div.officerIdentity',preview,h('div',
        field(pair(['姓名','Name']),h('input',{name:'zh',value:draft.zh,maxLength:12,autocomplete:'off',oninput:({target})=>draft.zh=target.value})),
        field(pair(['英文名（可留空）','English name (optional)']),h('input',{name:'en',value:draft.en,maxLength:48,autocomplete:'off',oninput:({target})=>draft.en=target.value})),
        field(t('age'),number('age',draft.age,16,60,({target})=>draft.age=target.valueAsNumber)),
        field(pair(['性别','Gender']),h('select',{name:'female',value:String(draft.female),onchange:({target})=>draft.female=target.value==='true'},
          h('option',{value:'false'},pair(['男','Male'])),h('option',{value:'true'},pair(['女','Female'])))),
        field(pair(['初始身份','Starting status']),h('select',{name:'service',value:draft.service,onchange:({target})=>draft.service=target.value},
          h('option',{value:'player'},pair(['仕官所选势力','Serve chosen faction'])),h('option',{value:'free'},pair(['在野，已发现','Unattached, known']))))
      )),
      h('fieldset.officerPortraits',h('legend',pair(['选择形象','Choose a portrait'])),
        Array.from({length:24},(_,i)=>h('button.officerPortrait',{type:'button','aria-label':pair(['形象 ','Portrait '])+(i+1),'aria-pressed':i===draft.portrait?'true':'false',dataset:{portrait:String(i)},onclick:({currentTarget})=>{
          draft.portrait=i;preview.src=art(i);
          form.querySelectorAll('.officerPortrait').forEach(b=>b.setAttribute('aria-pressed',String(b===currentTarget)));
        }},h('img',{src:art(i,'avatar'),alt:'',loading:'lazy',draggable:false})))),
      h('div.officerAbilities',OFFICER_STATS.map(k=>field(t(k),number(k,draft.stats[k],20,90,({target})=>{draft.stats[k]=target.valueAsNumber;showBudget();})))),
      total,
      field(pair(['一项特性','One trait']),h('select',{name:'trait',value:draft.trait??'',onchange:({target})=>draft.trait=target.value||null},
        h('option',{value:''},pair(['不选特性','No trait'])),OFFICER_TRAITS.map(id=>h('option',{value:id},nm(TRAITS[id]))))),
      h('p.note',pair(['属性总和上限350、单项上限90。年龄和身份按每次开局设定复制；注册不会改变已有存档。','Abilities total at most 350, with a maximum of 90 each. Age and status are copied when a campaign begins. Registration never changes an existing save.'])),
      note,
      button(pair(['保存到名册','Save to roster']),commit,{kind:'main'})
    );
    // h() assigns properties before appending options; restore selections only
    // after the select's children exist (e.g. remove a record while editing).
    form.querySelector('[name="female"]').value=String(draft.female);
    form.querySelector('[name="service"]').value=draft.service;
    form.querySelector('[name="trait"]').value=draft.trait??'';
    function commit() {
      const result=newRosterOfficer(draft,roster);
      if(!result.ok){message=result.errors.map(k=>pair(errors[k])).join(' ');ok=false;note.textContent=message;return;}
      if(!save([...roster,result.officer])){note.textContent=message;return;}
      message=pair(['已登录。新开局时勾选此人即可出场。','Registered. Select this officer when starting a new campaign.']);ok=true;draft=fresh();render();
    }
    box.append(h('section.setupPanel.officerPanel',{role:'dialog','aria-label':pair(['武将名册','Officer roster'])},
      h('header',h('h2',pair(['武将名册','Officer roster'])),h('p.dim',roster.length+' / '+OFFICER_LIMIT+' · '+pair(['各次开局独立选用','Select separately for each campaign']))),
      h('div.setupBody',h('div.registeredOfficers',roster.map(g=>h('article.registeredOfficer',
        h('img',{src:art(g.portrait,'avatar'),alt:'',loading:'lazy',draggable:false}),
        h('div',h('b',nm(g)),h('small',g.age+' · '+pair(g.service==='player'?['仕官','In service']:['在野','Unattached']))),
        button(pair(['移除','Remove']),()=>{if(save(roster.filter(row=>row.id!==g.id))){message=pair(['已从未来开局名册移除；已有存档不变。','Removed from the roster for future campaigns. Existing saves are unchanged.']);ok=true;}render();},{small:true})
      ))),h('h3',pair(['登录新武将','Register a new officer'])),form),
      h('footer',button(t('back'),back))
    ));
    showBudget();
  }
  render();
}
