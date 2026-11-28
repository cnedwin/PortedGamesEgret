// Declarative controls shared by all Wulin screens; no browser layout or widget tree.
export const COLORS = Object.freeze({paper:0xf3edde,ink:0x202a26,gold:0x88612f,vermillion:0x8e3d30,dark:0x23302b,cream:0xe9d9b1,muted:0x637466,edge:0xa59373});
export const SKIN = Object.freeze({text:COLORS.ink,panel:COLORS.paper,panelAlpha:.96,button:COLORS.dark,buttonText:COLORS.paper,disabled:0x989b91,accent:COLORS.gold,track:0xd4cbb8,radius:5,size:16,dim:.66});
const childrenOf = values => values.flat(Infinity).filter(value=>value && typeof value==='object');
const heightOf = item => typeof item.height==='number' ? item.height : 48;
export function text(value,props={}) {
  const {lines,kind,...rest}=props;
  const size=rest.size??16, words=String(value??'');
  const count=lines??(words.length>42 ? Math.min(8,Math.ceil(words.length/25)) : 1);
  return {type:'text',text:words,width:'fill',height:rest.height??Math.ceil(size*1.5)*count,size,
    ...(kind==='title'?{bold:true,fontFamily:'serif',color:COLORS.gold}:{}),
    ...rest,_lines:count};
}
export function button(label,act,data={},props={}) {
  const {kind,selected,disabled,detail,lines,badge,bold,...rest}=props;
  return {type:'button',text:String(label??''),width:'fill',height:detail?88:48,size:16,
    color:kind==='danger'?COLORS.vermillion:kind==='primary'||kind==='gold-button'?COLORS.gold:selected?COLORS.gold:COLORS.dark,
    textColor:COLORS.paper,border:{color:selected||kind==='primary'?0xc4a16c:0x687569,width:1},...rest,
    ...(rest.role==='tab'?{selected:!!selected}:{}),
    _action:act,_data:data,_disabled:!!disabled,_badge:badge,_detail:detail,_lines:lines??3};
}
export const space=(props={})=>({type:'space',...props});
function panel(layout,children,props={}) {
  const entries=childrenOf(children??[]), gap=props.gap??6,padding=props.padding??0;
  const height=layout==='row'?Math.max(0,...entries.map(heightOf))+padding*2:
    entries.reduce((sum,item)=>sum+heightOf(item),0)+Math.max(0,entries.length-1)*gap+padding*2;
  return {type:'panel',layout,width:'fill',height,children:entries,gap,...props};
}
export const row=(children,props={})=>panel('row',children,props);
export const col=(children,props={})=>panel('column',children,props);
export const scroll=(children,props={})=>panel('column',children,{height:'fill',scroll:'vertical',...props});
export const image=(src,props={})=>({type:'image',width:'fill',height:96,...(src?{src:String(src)}:{}),...props});
export const bar=(value,props={})=>({type:'bar',width:'fill',height:12,value:Math.max(0,Math.min(1,Number(value)||0)),...props});
export function field(label,id,value,props={}) {
  const {change,data,type,max,min,step,maxLength,placeholder,...rest}=props;
  return button(String(label)+' · '+(value??'—'),'@field',{id,label,value,change,data,type,max,min,step,maxLength,placeholder},rest);
}
export function choice(label,change,data,value,options,props={}) {
  const rows=(options??[]).map(option=>Array.isArray(option)?option:[option.value,option.label]);
  const current=rows.find(([v])=>String(v)===String(value));
  return button(String(label)+(current?' · '+current[1]:''),'@choice',{label,change,data,value,options:rows},props);
}
const perType={
  panel:new Set(['type','name','semantic','anchor','x','y','width','height','visible','border','role','layout','gap','padding','align','justify','card','color','alpha','label','scroll','children']),
  text:new Set(['type','name','semantic','anchor','x','y','width','height','visible','border','fontFamily','fontWeight','italic','text','size','color','align','bold','paragraph']),
  button:new Set(['type','name','semantic','anchor','x','y','width','height','visible','border','role','selected','fontFamily','fontWeight','italic','text','size','color','textColor','description','paragraph']),
  bar:new Set(['type','name','semantic','anchor','x','y','width','height','visible','border','value','color','label']),
  image:new Set(['type','name','semantic','anchor','x','y','width','height','visible','border','src','label']),
  space:new Set(['type','name','semantic','anchor','x','y','width','height','visible','border']),
  toggle:new Set(['type','name','semantic','anchor','x','y','width','height','visible','border','text','checked','size','fontFamily','fontWeight','italic']),
};
const normalizeName=s=>String(s).replace(/[^a-zA-Z0-9_.-]/g,'_');
function hash(s){let h=0;for(const char of s)h=Math.imul(h,31)+char.charCodeAt(0)|0;return (h>>>0).toString(36);}
export function compile(root,{translate=String,dispatch=()=>{},badge=()=>false,fieldValue=(id,fallback)=>fallback,live,wrap,paragraphBudget=14}={}) {
  const bind={}, used=new Set();let paragraphs=0;
  function visit(node,path,parentRole) {
    if(!node||!perType[node.type]) throw new Error('Unknown screen part: '+node?.type);
    const out={}; for(const key of perType[node.type]) if(node[key]!==undefined)out[key]=node[key];
    const action=node._action, data=node._data??{};
    const stable=action==='@field'?{id:data.id,key:data.data?.key,index:data.data?.index}:action==='@choice'?{change:data.change,data:data.data,label:data.label}:data;
    const stem=normalizeName(node.name??(action?'act_'+action+'_'+hash(JSON.stringify(stable)):'part_'+path));
    let name=/^[a-zA-Z_]/.test(stem)?stem:'p_'+stem;
    for(let n=1;used.has(name);n++) name=stem+'_'+n;
    used.add(name);
    if(node.type!=='space')out.name=name;
    // Semantic tab state is meaningful only inside a tablist.
    if(out.role==='tab'&&parentRole!=='tablist'){delete out.role;delete out.selected;}
    if('text' in out)out.text=translate(out.text);
    if('label' in out)out.label=translate(out.label);
    if(node.type==='text'&&node._lines>1&&(!wrap||paragraphs<paragraphBudget)){
      paragraphs++;
      out.paragraph={fontFamilies:[out.fontFamily??'sans-serif'],lineHeight:Math.ceil((out.size??16)*1.5),maxLines:node._lines,density:2,locale:'zh-CN'};
    }
    if(node.type==='button'&&node._detail&&(!wrap||paragraphs<paragraphBudget)){
      paragraphs++;
      out.description=translate(node._detail);
      out.paragraph={fontFamilies:['sans-serif'],lineHeight:20,maxLines:node._lines??3,density:2,locale:'zh-CN'};
    }
    // The engine paragraph cache admits at most 32 simultaneous paragraphs.
    // Reserve room for the page and a modal; overflow uses native line labels
    // or a single actionable card, not an extra renderer or DOM text.
    if(wrap&&((node.type==='text'&&node._lines>1&&!out.paragraph)||(node.type==='button'&&node._detail&&!out.paragraph))){
      const isButton=node.type==='button',height=typeof out.height==='number'?out.height:48,size=out.size??16,full=translate(isButton?node._detail:node.text);
      const count=Math.max(1,Math.floor((height-(isButton?32:0))/Math.ceil(size*1.4)));
      const lines=wrap(full,Math.max(18,Math.min(42,Math.ceil([...full].length*1.5/count))));
      const visible=lines.slice(0,count);
      const keep={};for(const k of ['name','width','height','anchor','x','y','visible','border'])if(out[k]!==undefined)keep[k]=out[k];
      const title=isButton?[{type:'text',text:out.text,size, color:out.textColor??COLORS.paper,height:30,width:'fill',align:'center'}]:[];
      const color=isButton?out.textColor??COLORS.paper:out.color??COLORS.ink;
      const children=[...title,...visible.map(line=>({type:'text',text:line,size:Math.max(12,size-1),color,width:'fill',height:Math.ceil(size*1.4),align:isButton?'center':out.align??'left'}))];
      for(const k of Object.keys(out))delete out[k];Object.assign(out,{...keep,type:'panel',layout:'column',gap:0,...(isButton?{role:'button',card:true,color:node.color??COLORS.dark,label:translate(node.text+' · '+node._detail)}:{label:full}),children});
    }
    if(live && node.type!=='space'){
      let rec=live.next[name]={};
      if('text' in out){rec.text=out.text;out.text=' ';bind[name]={...bind[name],text:()=>live.current[name]?.text??rec.text};}
      if(node.type==='bar'){rec.value=out.value;out.value=0;bind[name]={...bind[name],value:()=>live.current[name]?.value??rec.value};}
      if(node.type==='image'&&'src' in out){rec.src=out.src;bind[name]={...bind[name],src:()=>live.current[name]?.src??rec.src};}
    }
    if(action){
      const label=node.label??node.text;
      const effective=data.id&&action==='@field'?{...data,value:fieldValue(data.id,data.value)}:data;
      if(live)Object.assign(live.next[name],{action,data:effective,label:translate(label),disabled:node._disabled});
      bind[name]={...bind[name],tap:(_state,activation)=>{dispatch(action,live?.current[name]?.data??effective,activation,name);},label:()=>live?.current[name]?.label??translate(label),disabled:()=>live?.current[name]?.disabled??!!node._disabled};
      if(node._badge)bind[name].badge=()=>badge(node._badge);
    }
    if(node.type==='panel')out.children=childrenOf(node.children??[]).map((c,index)=>visit(c,path+'_'+index,out.role));
    return out;
  }
  return {root:visit(root,'root'),bind};
}
