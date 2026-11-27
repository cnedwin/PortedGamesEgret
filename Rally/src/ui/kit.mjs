// Racing interface primitives: native geometry, atlas text and one control state for drawing, keys and semantics.
import { DisplayObjectContainer,Sprite } from '@egret/engine';
import { createActionControl,createControlKeys,createHoverControl,createSelectionGroup,createToggleControl } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';

export const RALLY_THEME={
  ink:0x101f26,jade:0x18363d,jadeLight:0x285159,dim:0x122b31,
  gold:0xf2c230,pale:0xffedc9,paper:0xf6efe0,coral:0xe77553,muted:0xbdd1ca,
  border:0x92774b,red:0xd8262c,black:0x09171b,white:0xffffff
};
// The native text raster API accepts one literal family, not a CSS fallback list.
// Measure the same family that the engine actually rasterizes.
export const FONT_SANS='Arial';
export const FONT_SERIF='Georgia';
let measuring;
function measure(text,size,weight,family){
  measuring??=(typeof OffscreenCanvas==='function'?new OffscreenCanvas(1,1):document.createElement('canvas')).getContext('2d');
  if(!measuring)return text.length*size;
  measuring.font=`${weight} ${size}px "${family}"`;return measuring.measureText(text).width;
}
function wrap(text,width,size,weight,family,allowWrap){
  const lines=[];
  for(const paragraph of String(text).split('\n')){
    if(!allowWrap||!paragraph||measure(paragraph,size,weight,family)<=width){lines.push(paragraph);continue;}
    let line='';
    for(const token of paragraph.match(/\s+|[^\s]+/gu)??[]){
      const next=line+token;
      if(measure(next,size,weight,family)<=width){line=next;continue;}
      if(line.trim())lines.push(line.trimEnd());line='';
      const word=token.trimStart();
      if(measure(word,size,weight,family)<=width){line=word;continue;}
      for(const char of Array.from(word)){
        if(line&&measure(line+char,size,weight,family)>width){lines.push(line);line='';}
        line+=char;
      }
    }
    if(line||!lines.length)lines.push(line.trimEnd());
  }
  return lines;
}
function fitWords(text,rect,size,minSize,weight,family,allowWrap){
  let lines,lineHeight;
  for(let font=size;font>=minSize;font--){
    lines=wrap(text,Math.max(1,rect.width),font,weight,family,allowWrap);lineHeight=font*1.22;
    if(lines.length*lineHeight<=rect.height+.5&&lines.every(line=>measure(line,font,weight,family)<=rect.width+.5))
      return {lines,size:font,lineHeight};
  }
  // Dense noninteractive descriptions may use the remaining space; controls keep their full touch rectangle.
  let font=minSize;
  while(font>9&&(lines.length*lineHeight>rect.height+.5||lines.some(line=>measure(line,font,weight,family)>rect.width+.5))){
    font--;lines=wrap(text,Math.max(1,rect.width),font,weight,family,allowWrap);lineHeight=font*1.22;
  }
  return {lines,size:font,lineHeight};
}
const rectOf=(x,y,width,height)=>({x,y,width,height});
function round(graphics,w,h,fill,alpha,border,radius=8){
  graphics.clear();
  if(alpha>0)graphics.beginFill(fill,alpha).drawRoundRect(0,0,w,h,radius*2).endFill();
  if(border!==undefined)graphics.lineStyle(1,border,1).drawRoundRect(.5,.5,Math.max(1,w-1),Math.max(1,h-1),radius*2);
}

// engine-note Rally#6: ActionControl currently activates even when its routed end is
// outside the hit area; ToggleControl and SelectionGroup share that implementation.
// Suppressing only the outside end lets the native terminal observer release the
// original contact without activation; keyboard/semantic calls are not routed here.
export function guardReleaseInside(scope,input,node){
  const dispose=node.on(input.events.end,event=>{
    const {globalX,globalY}=event.payload,r=node.hitArea,point=node.globalToLocal(globalX,globalY);
    if(!r||!point||point.x<r.x||point.x>=r.x+r.width||point.y<r.y||point.y>=r.y+r.height)
      event.stopImmediatePropagation();
  });
  scope.use({dispose});
}
export function createRallyKit(host,parent,{scope=host.scope,prefix='rally-ui',semanticParent,lang='zh'}={}){
  const T=RALLY_THEME,focusId=()=>host.keyboard?.getSnapshot().focusedId;
  let nextLabel=0;
  const own=value=>scope.use(value);
  function shape(rect,inside=parent){
    const node=own(new Sprite());node.x=rect.x;node.y=rect.y;inside.addChild(node);return node;
  }
  function panel(rect,{fill=T.ink,alpha=.92,border=T.border,radius=12,inside=parent}={}){
    const node=shape(rect,inside);round(node.graphics,rect.width,rect.height,fill,alpha,border,radius);return node;
  }
  function label({text,rect,size=18,minSize=12,weight=600,color=T.paper,family=FONT_SANS,align='left',wrap:allowWrap=true,
    role='text',id,inside=parent,strokeWidth=0,strokeColor=T.black}){
    const textValue=String(text??'');
    const node=own(new DisplayObjectContainer());node.x=rect.x;node.y=rect.y;inside.addChild(node);
    const fit=fitWords(textValue,rect,size,Math.min(size,minSize),weight,family,allowWrap);
    let live=true;own({dispose(){live=false;}});
    for(const [index,line] of fit.lines.entries()){
      if(!line)continue;
      const work=host.game.createAtlasLabel({scope,text:line,fontFamily:family,fontSize:fit.size,fontWeight:weight,
        lineHeight:fit.lineHeight,color,strokeWidth,strokeColor,locale:lang}).then(async atlas=>{
        if(!live)return;
        node.addChild(atlas.display);
        await atlas.ready;if(!live)return;
        const b=atlas.bounds,x=align==='center'?(rect.width-b.width)/2:align==='right'?rect.width-b.width:0;
        const top=(rect.height-fit.lines.length*fit.lineHeight)/2+index*fit.lineHeight;
        atlas.display.x=x-b.x;atlas.display.y=top+(fit.lineHeight-b.height)/2-b.y;
        host.requestPublish();
      }).catch(cause=>{if(live)throw cause;});
      host.track(work);
    }
    if(role&&textValue.trim())host.addSemantic({id:id??`${prefix}:label-${++nextLabel}`,parent:semanticParent,role,
      describe:()=>({name:textValue,bounds:semanticBoundsOf(node)})},scope);
    return node;
  }
  function seal(rect,entry,inside=parent){
    panel(rect,{fill:entry.body,alpha:1,border:entry.trim,radius:7,inside});
    label({text:lang==='en'?entry.id[0].toUpperCase():entry.seal,rect,size:Math.min(23,rect.height*.72),color:T.white,weight:800,family:FONT_SERIF,align:'center',wrap:false,role:null,inside});
  }
  function face(rect,inside=parent){
    const node=shape(rect,inside);node.touchEnabled=true;node.touchChildren=false;
    node.hitArea={x:0,y:0,width:rect.width,height:rect.height};guardReleaseInside(scope,host.pointer,node);return node;
  }
  function paintFace(node,rect,{primary=false,chosen=false,held=false,hovered=false,focused=false,disabled=false}={}){
    const fill=disabled?0x29333a:held?T.coral:chosen||primary?T.gold:hovered?T.jadeLight:T.jade;
    round(node.graphics,rect.width,rect.height,fill,1,focused?T.white:chosen||primary?T.pale:T.border,8);
    if(focused)node.graphics.lineStyle(2,T.white,1).drawRoundRect(3,3,Math.max(1,rect.width-6),Math.max(1,rect.height-6),10);
  }
  function focusKey(id){host.keyboard?.focus(id,{visible:true});host.focus();host.requestPublish();}
  function action({id,text,name=text,rect,primary=false,disabled=false,size=16,onActivate,inside=parent}){
    const node=face(rect,inside),key=`${prefix}:${id}`;
    let control,hover,keys;
    const paint=()=>{paintFace(node,rect,{primary,disabled,held:control?.pressed||keys?.pressed,hovered:hover?.hovered,
      focused:focusId()===key&&host.keyboard?.getSnapshot().focusVisible});host.requestPublish();};
    control=own(createActionControl({input:host.pointer,target:node,onActivate:()=>{onActivate?.();host.requestPublish();},onPressChange:paint}));
    if(host.hover)hover=own(createHoverControl({hover:host.hover,target:node,onHoverChange:paint}));
    if(host.keyboard){
      own(host.keyboard.registerTarget({id:key,target:node,disabled}));
      keys=own(createControlKeys({keyboard:host.keyboard,target:node,kind:'action',control,onPressChange:paint}));
    }
    control.setEnabled(!disabled);hover?.setEnabled(!disabled);paint();own({dispose:host.registerPainter(paint)});
    label({text,rect:rectOf(6,3,rect.width-12,rect.height-6),size,minSize:12,weight:760,color:primary?T.black:T.paper,
      align:'center',role:null,inside:node});
    host.addSemantic({id:key,parent:semanticParent,role:'button',describe:()=>({name:String(name),bounds:semanticBoundsOf(node),
      disabled,focused:focusId()===key}),onActivate:()=>{control.press();control.release();},onFocus:()=>focusKey(key)},scope);
    return {id:key,node,control,paint};
  }
  function toggle({id,text,name=text,rect,checked,onChange,size=15}){
    const node=face(rect),key=`${prefix}:${id}`;let control,hover,keys;
    const paint=()=>{paintFace(node,rect,{chosen:control?.checked,held:control?.pressed||keys?.pressed,
      hovered:hover?.hovered,focused:focusId()===key&&host.keyboard?.getSnapshot().focusVisible});host.requestPublish();};
    control=own(createToggleControl({input:host.pointer,target:node,checked,onChange:value=>{paint();onChange?.(value);},onPressChange:paint}));
    if(host.hover)hover=own(createHoverControl({hover:host.hover,target:node,onHoverChange:paint}));
    if(host.keyboard){
      own(host.keyboard.registerTarget({id:key,target:node}));
      keys=own(createControlKeys({keyboard:host.keyboard,target:node,kind:'toggle',control,onPressChange:paint}));
    }
    paint();own({dispose:host.registerPainter(paint)});
    label({text,rect:rectOf(5,3,rect.width-10,rect.height-6),size,minSize:12,color:checked?T.black:T.paper,weight:740,align:'center',role:null,inside:node});
    host.addSemantic({id:key,parent:semanticParent,role:'switch',describe:()=>({name:String(name),bounds:semanticBoundsOf(node),
      checked:control.checked,focused:focusId()===key}),onActivate:()=>control.toggle(),onFocus:()=>focusKey(key)},scope);
    return {id:key,node,control};
  }
  function choice({id,name,items,selected,onChange,orientation='horizontal'}){
    const groupNode=own(new DisplayObjectContainer());parent.addChild(groupNode);
    const key=`${prefix}:${id}`,faces=items.map(item=>({item,node:face(item.rect,groupNode),hover:undefined}));
    let control;
    const paint=()=>{
      for(const entry of faces){
        const {item,node,hover}=entry;
        paintFace(node,item.rect,{chosen:control?.selected===String(item.key),hovered:hover?.hovered,
          focused:control?.selected===String(item.key)&&focusId()===key&&host.keyboard?.getSnapshot().focusVisible});
      }
      host.requestPublish();
    };
    control=own(createSelectionGroup({input:host.pointer,items:faces.map(({item,node})=>({key:String(item.key),target:node})),
      selected:String(selected),onChange:value=>{paint();onChange?.(value);}}));
    if(host.keyboard){
      own(host.keyboard.registerTarget({id:key,target:groupNode}));
      own(createControlKeys({keyboard:host.keyboard,target:groupNode,kind:'selection',control,orientation}));
    }
    host.addSemantic({id:key,parent:semanticParent,role:'radiogroup',describe:()=>({name,bounds:semanticBoundsOf(groupNode)})},scope);
    for(const [index,entry] of faces.entries()){
      const {item,node}=entry,r=item.rect,badge=item.badge,margin=5,badgeSize=badge?Math.min(28,r.height-12,r.width*.27):0;
      if(host.hover)entry.hover=own(createHoverControl({hover:host.hover,target:node,onHoverChange:paint}));
      if(badge)seal(rectOf(margin,(r.height-badgeSize)/2,badgeSize,badgeSize),badge,node);
      label({text:item.text,rect:rectOf(margin+badgeSize+(badge?3:0),3,r.width-2*margin-badgeSize-(badge?3:0),r.height-6),
        size:item.size??15,minSize:11,weight:740,color:control.selected===String(item.key)?T.black:T.paper,role:null,
        align:'center',inside:node});
      host.addSemantic({id:`${key}:${item.key}`,parent:key,role:'radio',describe:()=>({name:String(item.name??item.text),
        bounds:semanticBoundsOf(node),checked:control.selected===String(item.key),focused:focusId()===key&&control.selected===String(item.key),
        position:{index:index+1,size:faces.length}}),onActivate:()=>{control.select(String(item.key));},onFocus:()=>focusKey(key)},scope);
    }
    paint();own({dispose:host.registerPainter(paint)});
    return {id:key,node:groupNode,control};
  }
  return {panel,label,seal,action,button:action,toggle,choice};
}
