// Generic native RPG choice, inventory and team UI. The caller owns every
// record, action, result, translation, image and gameplay constraint.
import {createUiScreenStack} from '@egret/engine/ui';
import {palette as C,skin,metrics} from './theme.mjs';

const COPY={
  en:{all:'All',filter:'Categories',category:'Category',back:'Back',previous:'Previous',next:'Next',
    page:'Page',empty:'No matching choices',yes:'Yes',no:'No',proceed:'Proceed?',team:'Select team',
    allTeam:'Toggle all',confirm:'Confirm team',selected:'Selected',inventory:'Inventory',use:'Use',
    unnamed:'Unnamed choice',count:'Selected',choices:'Choices'},
  zh:{all:'全部',filter:'分類',category:'類別',back:'返回',previous:'上一頁',next:'下一頁',
    page:'頁',empty:'沒有符合條件的選項',yes:'是',no:'否',proceed:'是否繼續？',team:'選擇隊伍',
    allTeam:'全選／取消',confirm:'確認隊伍',selected:'已選擇',inventory:'行囊',use:'使用',
    unnamed:'未命名選項',count:'已選',choices:'選項'}
};
export function choiceLabels(language='zh',overrides={}) {
  return {...COPY[language==='en'?'en':'zh'],...overrides};
}
const str=value=>value===undefined||value===null?'':String(value);
const trim=(value,budget)=>{
  let width=0,out='';
  for(const ch of str(value).replace(/\s+/gu,' ')){
    const cost=/[\x20-\x7e]/u.test(ch)?0.56:1;
    if(width+cost>budget)return out.trimEnd()+'…';
    width+=cost;out+=ch;
  }
  return out;
};
function wrap(value,budget,limit=6){
  const lines=[];let width=0,out='';
  const cost=token=>Array.from(token).reduce((sum,ch)=>sum+(/[\x20-\x7e]/u.test(ch)?0.56:1),0);
  // Keep ordinary Latin tokens together when possible; CJK and overlong
  // identifiers still break by character inside the bounded native label box.
  const tokens=str(value).replace(/\s+/gu,' ').match(/[a-z0-9][a-z0-9'_-]*|\s+|./giu)??[];
  const emit=()=>{if(out.trim())lines.push(out.trim());out='';width=0};
  for(const token of tokens){
    if(lines.length>=limit)break;
    const tokenWidth=cost(token);
    const pieces=tokenWidth>budget?Array.from(token):[token];
    for(const piece of pieces){
      if(lines.length>=limit)break;
      const pieceWidth=cost(piece);
      if(width+pieceWidth>budget)emit();
      if(lines.length>=limit)break;
      if(!out&&piece.trim()==='')continue;
      out+=piece;width+=pieceWidth;
    }
  }
  if(lines.length>=limit){lines[limit-1]=trim(lines[limit-1]+'…',budget);return lines}
  emit();return lines;
}
const collect=(value,keys)=>keys.map(k=>str(value[k])).filter(Boolean).join(' · ');
export function normalizeChoiceRows(rows,{portraitUrl,itemIconUrl,fallbackImageUrl}={}) {
  if(!Array.isArray(rows))throw new TypeError('choice rows must be an array');
  return rows.map((row,index)=>{
    if(!row||typeof row!=='object')throw new TypeError('choice row must be a record');
    const name='choice-'+index;
    const image=typeof row.icon==='string'&&row.icon?row.icon:
      row.portrait&&row.headId!==undefined?portraitUrl?.(row.headId):
      row.dataset?.itemId!==undefined?itemIconUrl?.(row.dataset.itemId):undefined;
    return {...row,name,rowIndex:index,title:str(row.title??row.label),label:str(row.label??row.title),
      detail:str(row.detail),trailing:str(row.trailing),description:str(row.description),
      image:typeof image==='string'&&image?image:undefined,
      fallbackImage:row.fallbackIcon??fallbackImageUrl?.(row),disabled:row.disabled===true};
  });
}
export function choiceFilters(rows,labels,provided) {
  const choices=provided??[...new Map(rows.filter(row=>row.itemType!==undefined)
    .map(row=>[row.itemType,{type:row.itemType,label:labels.category+' '+str(row.itemType)}])).values()];
  const seen=new Set();
  const filters=[{name:'filter-all',type:undefined,label:labels.all}];
  for(const entry of choices){
    if(entry?.type===undefined||seen.has(entry.type))continue;
    seen.add(entry.type);
    filters.push({name:'filter-'+(filters.length-1),type:entry.type,label:str(entry.label)||labels.category+' '+str(entry.type)});
  }
  if(filters.length>8)throw new RangeError('At most eight visible filters; supply grouped categories through the host');
  return filters;
}
export function choicePage(rows,{filter,page=0,size=24}={}) {
  if(!Number.isSafeInteger(size)||size<1||size>48)throw new RangeError('choice page size must be between 1 and 48');
  // Explicit host actions can remain available independently of inventory tabs.
  const filtered=filter?.type===undefined?rows:rows.filter(row=>row.alwaysVisible===true||Object.is(row.itemType,filter.type));
  const pages=Math.max(1,Math.ceil(filtered.length/size));
  const current=Math.max(0,Math.min(pages-1,Math.trunc(page)||0));
  return {rows:filtered.slice(current*size,(current+1)*size),page:current,pages,total:filtered.length};
}
export function createTeamSelection(rows,{initial=[],minimum=1}={}) {
  const valid=rows.filter(row=>!row.disabled),allowed=new Set(valid.map(row=>row.value));
  if(!Number.isSafeInteger(minimum)||minimum<0||minimum>valid.length)throw new RangeError('invalid minimum team size');
  const selected=new Set(initial.filter(value=>allowed.has(value)));
  return {
    has:row=>selected.has(row.value),toggle(row){
      if(!allowed.has(row.value)||row.disabled)return;
      if(!selected.delete(row.value))selected.add(row.value);
    },
    toggleAll(){
      if(valid.every(row=>selected.has(row.value)))selected.clear();
      else for(const row of valid)selected.add(row.value);
    },
    get size(){return selected.size},get canConfirm(){return selected.size>=minimum},
    values:()=>new Set(valid.map(row=>row.value).filter(value=>selected.has(value)))
  };
}

const F='fill',B=metrics.target;
const panel=(children,opts={})=>({type:'panel',width:F,height:F,children,...opts});
const col=(children,opts={})=>panel(children,{layout:'column',gap:6,align:'stretch',...opts});
const line=(children,opts={})=>panel(children,{layout:'row',height:B,gap:8,align:'stretch',...opts});
const text=(name,value,opts={})=>({type:'text',...(name?{name}:{semantic:false}),text:value,width:F,height:29,
  color:C.cream,size:18,align:'left',...opts});
const button=(name,value,opts={})=>({type:'button',name,text:value,width:F,height:B,size:18,
  color:C.jade,textColor:C.cream,...opts});

function rowCard(row,columns) {
  const budget=columns>1?8:row.image?18:22;
  const short=trim(row.title||row.label,budget);
  const body=col([
    text(undefined,short,{height:30,size:columns>1?18:21,bold:true}),
    text(undefined,trim(collect(row,['detail','trailing'])||row.description,columns>1?8.5:Math.round(budget*1.15)),{
      color:C.muted,size:15,height:27
    })
  ],{gap:3,height:F,justify:'center'});
  const image=row.image?[panel([],{name:'choice-icon-'+row.rowIndex,semantic:false,width:58,height:58,color:C.card,card:true})]:[];
  return panel([...image,body],{
    name:row.name,role:'button',label:row.label||row.title,
    layout:'row',height:82,width:F,card:true,color:row.disabled?C.card:C.jade,
    padding:8,gap:9,align:'center',border:{color:C.line,width:1}
  });
}
export function buildChoiceRows(rows,columns,labels) {
  if(!rows.length)return [text('empty-choice-list',labels.empty,{height:76,color:C.muted,align:'center'})];
  const groups=[];
  for(let i=0;i<rows.length;i+=columns){
    const members=rows.slice(i,i+columns).map(row=>rowCard(row,columns));
    while(members.length<columns)members.push({type:'space',width:F,height:B});
    groups.push(line(members,{name:'choice-group-'+rows[i].rowIndex,label:labels.choices,height:82}));
  }
  return groups;
}
export function buildChoiceDescription({
  labels,title,detail='',mode='choice',columns=1,rows=[],filters=[],page=0,pages=1,
  showBack=true,memberImage,pageControls=false
}) {
  const heading=str(title);
  const rowGroups=buildChoiceRows(rows,columns,labels);
  const tabRow=filters.length?line(filters.map(filter=>button(filter.name,trim(filter.label,9),{
    role:'tab',selected:false,size:16
  })),{name:'choice-filters',role:'tablist',label:labels.filter,gap:5}):undefined;
  const variants={
    root:{upright:false,wide:true,width:'94%',height:'96%'},
    portrait:{upright:true,wide:false,width:'98%',height:'96%'},
    tablet:{upright:false,wide:true,width:800,height:'94%'},
    tabletPortrait:{upright:true,wide:false,width:'90%',height:'94%'}
  };
  function build(profile){
    const actions=[];
    if(pageControls||pages>1){
      actions.push(button('page-prev',labels.previous,{color:C.card,size:16}),
        button('page-next',labels.next,{color:C.card,size:16}));
    }
    if(mode==='team')actions.push(button('team-all',labels.allTeam,{color:C.card,size:16}),button('team-confirm',labels.confirm,{color:C.red,size:17}));
    if(mode==='inventory')actions.push(button('use-focused',labels.use,{color:C.red}));
    if(showBack)actions.push(button('back',labels.back,{color:C.card}));
    // The host may suppress explicit Back (e.g. a two-way decision); native
    // Escape/dismiss remains available only if the request says so.
    const header=col([
      text('choice-title',trim(heading,profile.upright?22:40),{height:34,size:profile.upright?25:27,color:C.gold,bold:true}),
      ...(detail?[text('choice-detail',trim(detail,profile.upright?26:48),{height:29,color:C.muted,size:17})]:[])
    ],{height:detail?68:34,justify:'center'});
    const summary=memberImage?line([
      panel([],{name:'member-image-holder',semantic:false,width:54,height:54,card:true,color:C.card}),header
    ],{height:detail?70:60}):header;
    const list=col(rowGroups,{name:'choice-list',scroll:'vertical',height:F,card:true,color:C.night,padding:5,gap:6});
    const details=mode==='inventory'?col([
      text('item-focus-name','',{height:30,size:19,color:C.gold,bold:true}),
      ...Array.from({length:6},(_,index)=>text('item-focus-line-'+index,'',{height:23,size:15,color:C.muted}))
    ],{name:'item-focus-detail',label:labels.inventory,scroll:'vertical',width:profile.upright?F:'30%',
      height:profile.upright?145:F,padding:8,gap:3,card:true,color:C.card}):undefined;
    const content=details?(profile.upright?col([list,details],{height:F,gap:5}):line([list,details],{height:F,gap:8})):list;
    return col([
      summary,
      ...(tabRow?[tabRow]:[]),
      ...(pageControls||pages>1?[text('page-status',labels.page+' '+(page+1)+' / '+pages,{color:C.muted,size:16,height:23})]:[]),
      content,
      ...(mode==='team'?[text('team-count','',{height:22,color:C.gold,size:16})]:[]),
      ...(actions.length?[line(actions,{gap:6})]:[])
    ],{anchor:'center',width:profile.width,height:profile.height,card:true,color:C.deep,padding:profile.upright?8:10,
      gap:5,border:{color:C.line,width:1}});
  }
  return {label:heading,area:'safe',skin,modal:true,
    ...Object.fromEntries(Object.entries(variants).map(([name,profile])=>[name,build(profile)]))};
}

export function createChoiceMenu(game,{
  portraitUrl=()=>undefined,itemIconUrl=()=>undefined,fallbackImageUrl,language=()=> 'zh',labels:overrideLabels,
  inventoryFilters,stack:injectedStack,onActiveChange=()=>{},onError=()=>{},
  pageSize=24,frameId='choice-menu',teamOptions={}
}={}) {
  const stack=injectedStack??createUiScreenStack({onError});
  let current,sequence=0;
  const imageQueue=[];
  let imageJobs=0;
  const report=error=>{try{onError(error)}catch{/* Diagnostics do not settle gameplay promises. */}};
  const labels=()=>choiceLabels(typeof language==='function'?language():language,typeof overrideLabels==='function'?overrideLabels():overrideLabels);
  function setActive(op){
    const changed=Boolean(current)!==Boolean(op);current=op;
    if(changed)try{onActiveChange(Boolean(op))}catch(error){report(error)}
    game.invalidate?.();
  }
  function pumpImages(){
    while(imageJobs<3&&imageQueue.length){
      const task=imageQueue.shift(),op=task.op;
      if(op.closed||task.layer.isDisposed)continue;
      imageJobs++;
      const tryImage=async()=>{
        for(const src of [task.src,task.fallback].filter((value,index,all)=>typeof value==='string'&&value&&all.indexOf(value)===index)){
          if(op.closed||task.layer.isDisposed)return;
          try{
            const picture=await game.image(src,{layer:task.layer,x:task.width/2,y:task.height/2,width:task.width});
            if(op.closed||task.layer.isDisposed)return;
            const factor=Math.min(1,task.height/(picture.height||task.height));
            picture.scaleX=factor;picture.scaleY=factor;
            game.invalidate?.();return;
          }catch{/* Keep the native placeholder if both optional sources fail. */}
        }
      };
      void tryImage().finally(()=>{imageJobs--;pumpImages()});
    }
  }
  function openRequest(title,inputRows,signal,requestedColumns=1,options={}){
    if(signal?.aborted)return Promise.reject(signal.reason);
    if(current)close();
    const L={...labels(),...options.labels},mode=options.variant??'choice';
    const columns=Math.max(1,Math.min(2,Math.trunc(requestedColumns)||1));
    const rows=normalizeChoiceRows(inputRows,{portraitUrl,itemIconUrl,fallbackImageUrl});
    const suppliedFilters=typeof inventoryFilters==='function'?inventoryFilters():inventoryFilters;
    const filters=mode==='inventory'?choiceFilters(rows,L,options.filters??suppliedFilters):[];
    const team=mode==='team'?createTeamSelection(rows,options.team??{}):undefined;
    const op={rows,filters,team,labels:L,mode,columns,filterIndex:0,page:0,size:options.pageSize??pageSize,signal,
      canCancel:options.canCancel!==false,keys:new Set(),view:undefined,closed:false,aborted:false};
    const pageControls=rows.length>op.size;
    const showBack=!rows.length||options.showBack!==false||options.returnOption===true;
    const window=()=>choicePage(op.rows,{filter:op.filters[op.filterIndex],page:op.page,size:op.size});
    // Optional art must never stop Play if a host URL is missing, corrupted or
    // unsuitable for the strict texture decoder. Use the public rejecting
    // game.image API instead of a required declarative image; pace loads so
    // large filtered pages cannot exhaust the engine's pending-image budget.
    const loadedLayers=new WeakSet();
    function queueImage(view,name,src,fallback){
      if(!src||op.closed)return;
      const layer=view.get(name);
      if(loadedLayers.has(layer))return;
      loadedLayers.add(layer);
      const {width,height}=view.rect(name);
      if(!(width>0&&height>0))return;
      layer.clipRect={x:0,y:0,width,height};
      imageQueue.push({op,layer,width,height,src,fallback});
    }
    function buildImages(view){
      for(const row of window().rows)if(row.image)queueImage(view,'choice-icon-'+row.rowIndex,row.image,row.fallbackImage);
      const memberImage=options.member?.headId!==undefined?portraitUrl(options.member.headId):undefined;
      if(memberImage)queueImage(view,'member-image-holder',memberImage,options.member.fallbackIcon);
      pumpImages();
    }
    let lastFocused;
    function chosenRow(){
      const page=window().rows;
      const focused=page.find(row=>row.name===op.view?.focused&&!row.disabled);
      if(focused)lastFocused=focused;
      return page.includes(lastFocused)?lastFocused:page.find(row=>!row.disabled);
    }
    function answer(value){
      if(op.closed)return;op.closed=true;
      if(op.context)op.context.close(value);
      else void stack.close(op.screen,value).catch(report);
    }
    function select(row){
      if(op.closed||row.disabled)return;
      if(team){team.toggle(row);op.view.refresh();game.invalidate?.()}
      else answer(row.value);
    }
    function binds(page){
      return Object.fromEntries(page.rows.map(row=>[row.name,{
        label:()=>[row.label||row.title||L.unnamed,team?.has(row)?L.selected:''].filter(Boolean).join(' · '),
        disabled:()=>row.disabled||op.closed,
        color:()=>row.disabled?C.card:team?.has(row)?C.jadeActive:C.jade,
        tap:()=>select(row)
      }]));
    }
    function refreshRows(){
      if(!op.view||op.closed)return;
      const page=window();op.page=page.page;lastFocused=page.rows.find(row=>!row.disabled);
      op.view.replaceChildren('choice-list',buildChoiceRows(page.rows,columns,L),binds(page));
      buildImages(op.view);
      op.view.scroll('choice-list').scrollTo(0);
      if(lastFocused)op.view.focus(lastFocused.name);
      op.view.refresh();game.invalidate?.();
    }
    function changeFilter(index){
      if(!filters.length||op.closed)return;
      op.filterIndex=(index+filters.length)%filters.length;op.page=0;refreshRows();
    }
    function changePage(delta){op.page=window().page+delta;refreshRows()}
    function moveFocus(code){
      if(!op.view||op.closed)return;
      const page=window();
      const order=page.rows.filter(row=>!row.disabled).map(row=>row.name);
      if(team){
        order.push('team-all');
        if(team.canConfirm)order.push('team-confirm');
      }
      if(pageControls){
        if(page.page>0)order.push('page-prev');
        if(page.page<page.pages-1)order.push('page-next');
      }
      if(mode==='inventory'&&chosenRow())order.push('use-focused');
      if(showBack&&op.canCancel)order.push('back');
      if(!order.length)return;
      const index=order.indexOf(op.view.focused);
      const step=code==='ArrowLeft'?-1:code==='ArrowRight'?1:code==='ArrowUp'?-columns:columns;
      const next=index<0?0:Math.max(0,Math.min(order.length-1,index+step));
      op.view.focus(order[next]);game.invalidate?.();
    }
    op.changeFilter=changeFilter;op.changePage=changePage;op.answer=answer;
    op.moveFocus=moveFocus;
    op.screen={
      id:frameId+'-'+(++sequence),layer:'modal',back:op.canCancel?'close':'none',
      open(context){
        op.context=context;
        if(op.closed||signal?.aborted){context.close();return}
        const page=window();
        const bind={...binds(page)};
        for(const [index,filter] of filters.entries())bind[filter.name]={
          label:()=>filter.label,selected:()=>op.filterIndex===index,color:()=>op.filterIndex===index?C.jadeActive:C.card,
          tap:()=>changeFilter(index)
        };
        if(pageControls){
          bind['page-prev']={disabled:()=>window().page===0,tap:()=>changePage(-1)};
          bind['page-next']={disabled:()=>window().page>=window().pages-1,tap:()=>changePage(1)};
          bind['page-status']={text:()=>L.page+' '+(window().page+1)+' / '+window().pages};
        }
        if(team){
          bind['team-all']={tap:()=>{team.toggleAll();op.view.refresh();game.invalidate?.()}};
          bind['team-confirm']={disabled:()=>!team.canConfirm,tap:()=>{if(team.canConfirm)answer(team.values())}};
          bind['team-count']={text:()=>L.count+' '+team.size+' / '+rows.length};
        }
        if(mode==='inventory'){
          bind['use-focused']={
            disabled:()=>!chosenRow(),tap:()=>{const row=chosenRow();if(row)select(row)}
          };
          const detailText=()=>{const row=chosenRow();return row?collect(row,['detail','trailing','description']):L.empty};
          bind['item-focus-detail']={label:()=>[chosenRow()?.label,detailText()].filter(Boolean).join(' · ')};
          bind['item-focus-name']={text:()=>trim(chosenRow()?.title??chosenRow()?.label??L.empty,13)};
          for(let index=0;index<6;index++)bind['item-focus-line-'+index]={
            text:()=>wrap(detailText(),['portrait','tabletPortrait'].includes(op.view?.variant)?32:17)[index]??''
          };
        }
        if(showBack)bind.back={tap:()=>answer(undefined),disabled:()=>!op.canCancel};
        const desc=buildChoiceDescription({labels:L,title:options.heading??title,detail:options.detail,mode,columns,
          rows:page.rows,filters,page:page.page,pages:page.pages,showBack,memberImage:options.member?.headId!==undefined?
            portraitUrl(options.member.headId):undefined,pageControls});
        const initialFocus=page.rows.find(row=>!row.disabled)?.name??(filters[0]?.name)??(showBack?'back':undefined);
        const view=game.show(desc,{state:()=>op,bind,gamepad:true,initialFocus,built:buildImages,
          dismiss:()=>{if(op.canCancel)answer(undefined)}});
        op.view=view;
        return view;
      }
    };
    const abort=()=>{
      op.aborted=true;op.reason=signal.reason;answer(undefined);
    };
    setActive(op);signal?.addEventListener('abort',abort,{once:true});
    return stack.open(op.screen).then(result=>{
      if(op.aborted||signal?.aborted)throw op.reason??signal.reason;
      return result;
    }).finally(()=>{
      op.closed=true;signal?.removeEventListener('abort',abort);
      if(current===op)setActive(undefined);
    });
  }
  function choose(title,rows,signal,columns=1,options={}){
    return openRequest(title,rows,signal,columns,options);
  }
  function askJoin(signal,title=labels().proceed){
    const L=labels();
    return choose(title,[{label:L.yes,value:true},{label:L.no,value:false}],signal,2,{showBack:false});
  }
  function chooseTeam(roles,signal,options={}){
    const config={...teamOptions,...options};
    const L=labels(),records=roles.map((role,index)=>{
      const id=config.idOf?.(role,index)??role.id;
      return {...role,label:config.labelFor?.(role,index)??role.label??role.name??L.unnamed,
        title:role.title??role.name,detail:config.detailFor?.(role,index)??role.detail,
        portrait:role.headId!==undefined,headId:role.headId,value:id};
    });
    const initial=config.initialSelection?.(roles)??(records.length?[records[0].value]:[]);
    return choose(config.title??L.team,records,signal,2,{
      variant:'team',canCancel:config.canCancel??false,showBack:config.canCancel??false,
      team:{initial:[...initial],minimum:config.minimum??1}
    });
  }
  function showItems(items,use,cancel,options={}){
    const L=labels(),controller=new AbortController();
    const rows=items.map(item=>({
      label:([str(item.name),item.count!==undefined?'× '+item.count:''].filter(Boolean).join(' ')),
      title:item.name,description:item.description,detail:item.detail,trailing:item.count!==undefined?'× '+item.count:'',
      itemType:item.type,dataset:{itemId:item.id},value:item.id,disabled:item.disabled
    }));
    const pending=choose(options.title??L.inventory,rows,options.signal??controller.signal,options.columns??1,
      {...options,variant:'inventory'});
    const request=current;
    void pending.then(value=>{
      // A host transition can dismiss the UI without invoking its player
      // cancellation callback; explicit Back still calls it exactly once.
      if(request?.externalClose)return;
      return value===undefined?cancel?.():use?.(value);
    },error=>{if(!request?.aborted)report(error)});
    return pending;
  }
  function close(){
    const op=current;if(!op)return;
    op.externalClose=true;
    op.answer(undefined);
  }
  // The data-view modal owns Tab, Enter, Space, Escape and D-pad/A/B. General
  // data views do not claim arrow navigation like the built-in select widget;
  // preserve the host's directional menu commands using native view.focus.
  function handleKey(code,release){
    const op=current;if(!op)return false;
    if(!release){
      op.keys.add(code);
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(code))op.moveFocus(code);
      return true;
    }
    if(!op.keys.delete(code))return true;
    if(code==='BracketLeft')op.changeFilter(op.filterIndex-1);
    else if(code==='BracketRight')op.changeFilter(op.filterIndex+1);
    else if(code==='PageUp')op.view?.scroll('choice-list').page(-1);
    else if(code==='PageDown')op.view?.scroll('choice-list').page(1);
    else if(code==='KeyA'&&op.team){op.team.toggleAll();op.view?.refresh();game.invalidate?.()}
    else if(code==='KeyO'&&op.team?.canConfirm)op.answer(op.team.values());
    return true;
  }
  return {
    stack,choose,askJoin,chooseTeam,showItems,close,handleKey,portraitUrl,itemIconUrl,
    get active(){return Boolean(current)},getView:()=>current?.view,
    async dispose(){close();if(!injectedStack)await stack.dispose()}
  };
}
