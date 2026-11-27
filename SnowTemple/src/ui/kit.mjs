// Snow, ink and lacquer. Each visual control uses its native pointer, key and semantic state.
import { DisplayObjectContainer,Sprite } from '@egret/engine';
import { createActionControl,createControlKeys,createHoverControl,createSelectionGroup } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';

export const INK={ink:0x0a0f18,panel:0x141d2b,line:0xaa894e,gold:0xe2b866,ivory:0xffefcf,
  snow:0xe9eef5,dim:0xa8b6c9,red:0x8c2821,redLight:0xb13c2d,paper:0xdccfae,written:0x251c15,frost:0x9cc8f2};
export const rect=(x,y,width,height)=>({x,y,width,height});
export const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export const fontScript='Georgia',fontPlain='Arial';
let measuring;
function width(text,size,weight,family){
  measuring??=(typeof OffscreenCanvas==='function'?new OffscreenCanvas(1,1):document.createElement('canvas')).getContext('2d');
  if(!measuring)return text.length*size;
  measuring.font=weight+' '+size+'px "'+family+'"';return measuring.measureText(text).width;
}
function wrapWords(text,limit,size,weight,family,wrap){
  const lines=[];
  for(const paragraph of String(text).split('\n')){
    if(!wrap||width(paragraph,size,weight,family)<=limit){lines.push(paragraph);continue;}
    let line='';
    for(const token of paragraph.match(/\s+|[\u2e80-\u9fff\uff00-\uffef]|[^\s\u2e80-\u9fff\uff00-\uffef]+/gu)??[]){
      if(width(line+token,size,weight,family)<=limit){line+=token;continue;}
      if(line.trim())lines.push(line.trimEnd());line='';
      for(const char of Array.from(token.trimStart())){
        if(line&&width(line+char,size,weight,family)>limit){lines.push(line);line='';}
        line+=char;
      }
    }
    if(line||!lines.length)lines.push(line.trimEnd());
  }
  return lines;
}
function fitText(text,box,fontSize,min,weight,family,wrap){
  let lines,height;
  for(let size=fontSize;size>=min;size--){
    lines=wrapWords(text,Math.max(1,box.width),size,weight,family,wrap);height=size*1.22;
    if(lines.length*height<=box.height+.5&&lines.every(line=>width(line,size,weight,family)<=box.width+.5))
      return {lines,size,height};
  }
  return {lines:wrapWords(text,Math.max(1,box.width),min,weight,family,wrap),size:min,height:min*1.22};
}
function intersect(a,b){
  if(!b)return a;
  const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y),r=Math.min(a.x+a.width,b.x+b.width),d=Math.min(a.y+a.height,b.y+b.height);
  return rect(x,y,Math.max(0,r-x),Math.max(0,d-y));
}
export function hitBounds(node){
  const a=node.hitArea;
  if(!a)return semanticBoundsOf(node);
  const p=node.localToGlobal(a.x,a.y),q=node.localToGlobal(a.x+a.width,a.y+a.height);
  return rect(Math.min(p.x,q.x),Math.min(p.y,q.y),Math.abs(q.x-p.x),Math.abs(q.y-p.y));
}
const inside=(box,x,y)=>box&&x>=box.x&&x<box.x+box.width&&y>=box.y&&y<box.y+box.height;
const whollyVisible=(box,clip)=>!clip||box.x>=clip.x-.1&&box.y>=clip.y-.1&&box.x+box.width<=clip.x+clip.width+.1&&box.y+box.height<=clip.y+clip.height+.1;
// engine-note: native ActionControl still activates a routed end outside its hit area.
// Its own terminal observer clears the press if this one end is not delivered.
export function guardMenuRelease(scope,input,node,clip){
  const dispose=node.on(input.events.end,e=>{
    const {globalX:x,globalY:y}=e.payload;
    const b=hitBounds(node),c=clip?.();if(!inside(b,x,y)||(c&&(!inside(c,x,y)||!whollyVisible(b,c))))e.stopImmediatePropagation();
  });
  scope.use({dispose});
}
export function createSnowKit(host,parent,{scope=host.scope,prefix='snow-ui',semanticParent,locale,clip,parchment=false,
  onControl}={}){
  let nextLabel=0;const own=value=>scope.use(value);
  const clippedFaces=[];
  // A half-visible row is not a small interactive target. Keep native
  // keyboard registration so focusing a row can still scroll it into view.
  function registerClippedFace(node,enabled=true){
    if(clip)clippedFaces.push({node,enabled});
  }
  function syncClip(){
    if(!clip)return;
    const viewport=clip();
    for(const {node,enabled} of clippedFaces)node.touchEnabled=enabled&&whollyVisible(hitBounds(node),viewport);
  }
  const focusId=()=>host.keyboard?.getSnapshot().focusedId;
  function shape(box,container=parent){
    const node=own(new Sprite());node.x=box.x;node.y=box.y;container.addChild(node);return node;
  }
  function panel(box,{fill=INK.panel,alpha=.92,border=INK.line,radius=2,container=parent}={}){
    const node=shape(box,container);
    if(alpha>0)node.graphics.beginFill(fill,alpha).drawRoundRect(0,0,box.width,box.height,radius*2).endFill();
    if(border!==null)node.graphics.lineStyle(1,border,.85).drawRoundRect(.5,.5,box.width-1,box.height-1,radius*2);
    return node;
  }
  function label(text,box,{size=19,min=12,weight=600,color=parchment?INK.written:INK.snow,family=fontPlain,
    align='left',wrap=true,role='text',id,container=parent,strokeWidth=0,strokeColor:stroke=INK.ink}={}){
    text=String(text??'');if(family===fontScript&&locale?.lang!=='en')family='KaiTi';
    const node=own(new DisplayObjectContainer());node.x=box.x;node.y=box.y;container.addChild(node);
    const fit=fitText(text,box,size,Math.min(size,min),weight,family,wrap);let live=true;
    own({dispose(){live=false;}});
    fit.lines.forEach((line,index)=>{
      if(!line)return;
      const task=host.game.createAtlasLabel({scope,text:line,fontFamily:family,fontSize:fit.size,fontWeight:weight,
        lineHeight:fit.height,color,strokeWidth:Math.round(strokeWidth*2)/2,strokeColor:stroke,locale:locale?.lang==='en'?'en':'zh'}).then(async atlas=>{
        if(!live)return;node.addChild(atlas.display);await atlas.ready;if(!live)return;
        const b=atlas.bounds,dx=align==='center'?(box.width-b.width)/2:align==='right'?box.width-b.width:0;
        atlas.display.x=dx-b.x;atlas.display.y=(box.height-fit.lines.length*fit.height)/2+index*fit.height+(fit.height-b.height)/2-b.y;
        host.requestPublish();
      }).catch(cause=>{if(live)throw cause;});
      host.track(task);
    });
    if(role&&text.trim())host.addSemantic({id:id??prefix+':text-'+(++nextLabel),parent:semanticParent,role,
      describe:()=>{const b=intersect(semanticBoundsOf(node),clip?.());return {name:text,bounds:b,hidden:b.height<=0||b.width<=0};}},scope);
    return node;
  }
  function face(box,container=parent){
    const node=shape(box,container);node.touchEnabled=true;node.touchChildren=false;
    node.hitArea=rect(0,0,box.width,box.height);guardMenuRelease(scope,host.pointer,node,clip);return node;
  }
  function paint(node,box,{primary,chosen,hovered,held,focus,disabled}){
    const g=node.graphics;g.clear();
    // Parchment lesson cards retain dark ink; every interaction state stays on light paper.
    const fill=parchment?(disabled?0xb2a58b:held?0xe3b978:focus?0xf0dfb8:hovered?0xe6d5ac:0xcbbb98):
      disabled?0x10141d:held?INK.redLight:chosen?INK.gold:primary?INK.red:hovered?0x29394b:INK.panel;
    g.beginFill(fill,disabled ? .55 : parchment&&!held&&!hovered&&!focus ? .40 : .96).drawRoundRect(0,0,box.width,box.height,4).endFill();
    g.lineStyle(focus?2:1,focus?(parchment?INK.red:INK.ivory):chosen||primary?INK.gold:INK.line,.95)
      .drawRoundRect(.5,.5,box.width-1,box.height-1,4);
  }
  function addControlSemantic(id,name,role,node,describe,onActivate){
    host.addSemantic({id,parent:semanticParent,role,describe:()=>{
      const full=hitBounds(node),c=clip?.(),b=intersect(full,c);return {name,bounds:b,hidden:!whollyVisible(full,c)||b.height<=0||b.width<=0,...describe()};
    },onActivate,onFocus:()=>{host.keyboard?.focus(id,{visible:true});host.focus();host.requestPublish();}},scope);
  }
  function button({id,text,name=text,box,onActivate,primary=false,disabled=false,size=18,detail,decorate,container=parent}){
    const node=face(box,container),key=prefix+':'+id;let control,hover,keys;
    const refresh=()=>{paint(node,box,{primary,disabled,held:control?.pressed||keys?.pressed,hovered:hover?.hovered,
      focus:focusId()===key&&host.keyboard?.getSnapshot().focusVisible});host.requestPublish();};
    control=own(createActionControl({input:host.pointer,target:node,onPressChange:refresh,onActivate:()=>{onActivate?.();host.requestPublish();}}));
    if(host.hover)hover=own(createHoverControl({hover:host.hover,target:node,onHoverChange:refresh}));
    if(host.keyboard){own(host.keyboard.registerTarget({id:key,target:node,disabled}));keys=own(createControlKeys({
      keyboard:host.keyboard,target:node,kind:'action',control,onPressChange:refresh}));}
    control.setEnabled(!disabled);node.touchEnabled=!disabled;
    registerClippedFace(node,!disabled);
    if(decorate)decorate(node);
    else if(detail){
      label(text,rect(8,3,box.width-16,Math.min(30,box.height*.43)),{size,min:13,weight:750,color:parchment?INK.written:INK.ivory,align:'center',role:null,container:node});
      label(detail,rect(8,Math.min(32,box.height*.46),box.width-16,box.height-Math.min(36,box.height*.46)),
        {size:14,min:11,weight:500,color:parchment?0x5b4f3c:INK.dim,align:'center',role:null,container:node});
    }else label(text,rect(7,3,box.width-14,box.height-6),{size,min:12,weight:730,color:parchment?INK.written:disabled?INK.dim:INK.ivory,
      align:'center',wrap:true,role:null,container:node});
    refresh();own({dispose:host.registerPainter(refresh)});
    addControlSemantic(key,String(name),'button',node,()=>({disabled,focused:focusId()===key}),()=>{control.press();control.release();});
    onControl?.(key,node,disabled);return {id:key,node,control};
  }
  function selection({id,name,items,value,onChange,container=parent}){
    const group=own(new DisplayObjectContainer());container.addChild(group);
    const key=prefix+':'+id,entries=items.map(item=>({item,node:face(item.box,group)}));
    let control;
    const refresh=()=>{
      for(const e of entries)paint(e.node,e.item.box,{chosen:control?.selected===String(e.item.key),hovered:e.hover?.hovered,
        focus:focusId()===key&&control?.selected===String(e.item.key)&&host.keyboard?.getSnapshot().focusVisible});
      host.requestPublish();
    };
    control=own(createSelectionGroup({input:host.pointer,items:entries.map(e=>({key:String(e.item.key),target:e.node})),selected:String(value),
      onChange:next=>{refresh();onChange?.(next);}}));
    if(host.keyboard){own(host.keyboard.registerTarget({id:key,target:group}));own(createControlKeys({
      keyboard:host.keyboard,target:group,kind:'selection',control,orientation:'horizontal'}));}
    host.addSemantic({id:key,parent:semanticParent,role:'radiogroup',describe:()=>{
      const b=intersect(semanticBoundsOf(group),clip?.());return {name,bounds:b,hidden:b.height<=0||b.width<=0};
    }},scope);
    for(const [index,e] of entries.entries()){
      registerClippedFace(e.node);
      if(host.hover)e.hover=own(createHoverControl({hover:host.hover,target:e.node,onHoverChange:refresh}));
      label(e.item.text,rect(3,2,e.item.box.width-6,e.item.box.height-4),{size:15,min:11,color:control.selected===String(e.item.key)?INK.written:INK.ivory,
        weight:750,align:'center',role:null,container:e.node});
      const itemKey=key+':'+e.item.key;
      host.addSemantic({id:itemKey,parent:key,role:'radio',describe:()=>{
        const full=hitBounds(e.node),c=clip?.(),b=intersect(full,c);return {name:e.item.name??e.item.text,bounds:b,
          hidden:!whollyVisible(full,c)||b.height<=0||b.width<=0,checked:control.selected===String(e.item.key),focused:focusId()===key&&control.selected===String(e.item.key),
          position:{index:index+1,size:entries.length}};
      },onActivate:()=>control.select(String(e.item.key)),onFocus:()=>{host.keyboard?.focus(key,{visible:true});host.focus();host.requestPublish();}},scope);
    }
    refresh();own({dispose:host.registerPainter(refresh)});
    onControl?.(key,group);return {id:key,control,node:group};
  }
  return {panel,shape,label,button,selection,syncClip};
}
