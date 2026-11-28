// Starbanner's paper, navy outline and gold focus, rendered by the native 2D stage.
// Controls own their interaction state; the kit only draws that state and describes it.
import { Bitmap, DisplayObjectContainer, Sprite } from '@egret/engine';
import { createActionControl, createControlKeys, createHoverControl, createRangeControl, createSelectionGroup, createToggleControl } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { createScratchCanvas } from './scratch-canvas.mjs';
import { getLanguage } from '../i18n.mjs';

export const COLORS = { ink:0x1b2340, soft:0x3a4670, panel:0xf4f7fb, pale:0xe4ebf5, gold:0xf5c542, blue:0x3d7bff, red:0xe8384a, green:0x3fbf6a, white:0xffffff };
// Atlas raster requests accept one family; a CSS fallback list would be quoted as a single name.
export const FONT = 'Arial';
let sequence = 0;
const measure = typeof document !== 'undefined' || typeof OffscreenCanvas === 'function' ? createScratchCanvas(1,1).getContext('2d') : null;
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const live = (node) => {
  if (!node || node.isDisposed || !node.parent) return false;
  for (let p=node; p; p=p.parent) if (!p.visible || p.alpha <= 0 || p.isDisposed) return false;
  return true;
};
function textLines(text, size, weight, width, wrap) {
  const paragraphs = String(text ?? '').split('\n');
  if (!wrap || !width || !measure) return paragraphs.slice(0,32);
  measure.font = weight+' '+size+'px '+FONT;
  const result=[];
  for (const paragraph of paragraphs) {
    let row='';
    // Break on words in Latin text, and at each CJK character. This is measurement only; all pixels come from atlas labels.
    const parts = paragraph.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|\s+|[^\s\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu) ?? [''];
    for (const part of parts) {
      if (row && measure.measureText(row+part).width > width) { result.push(row.trimEnd()); row=part.trimStart(); }
      else row+=part;
      if (row && measure.measureText(row).width > width && Array.from(row).length>1) {
        let head='';
        for (const ch of Array.from(row)) {
          if(head&&measure.measureText(head+ch).width>width){result.push(head);head=ch;}else head+=ch;
        }
        row=head;
      }
    }
    result.push(row);
  }
  return result.slice(0,32);
}
const colorOf = (value, fallback=COLORS.ink) => typeof value==='number'?value : typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?Number.parseInt(value.slice(1),16):fallback;
export { colorOf };

/** Each screen/card can dispose its own kit without touching the rest of the stage. */
export function createKit(host, parent, { prefix='ui', semanticParent, scope: supplied }={}) {
  const { game, keyboard, semantics, hover } = host;
  const scope=supplied ?? game.engine.createScope(), ownScope=!supplied, owned=[], labels=[], painters=[];
  let closed=false;
  const own=(v)=>{owned.push(v);return v;};
  const add=(Type, target=parent)=>{const node=scope.use(new Type());target.addChild(node);return node;};
  const register=(id,target,kind,control,extra={})=>{
    if(!keyboard)return {};
    const registration=own(keyboard.registerTarget({id,target}));
    const keys=own(createControlKeys({keyboard,target,kind,control,...extra}));
    return {registration,keys};
  };
  const semantic=(id,role,describe,actions={})=>own(semantics.add({id,role,...(semanticParent?{parent:semanticParent}:{}),...actions,describe}));
  const handle=(root,config,draw)=>({
    root, setRect(next){if(Object.keys(next).every(k=>config[k]===next[k]))return;Object.assign(config,next);draw();host.requestPublish();},
    setVisible(value){if(root.visible!==!!value){root.visible=!!value;host.requestPublish();}},
    dispose(){if(!root.isDisposed)root.dispose();host.requestPublish();}
  });
  function label(spec) {
    const config={text:'',x:0,y:0,width:0,height:0,size:18,color:COLORS.ink,weight:500,align:'left',wrap:false,alpha:1,...spec};
    const root=add(DisplayObjectContainer), slots=[]; let disposed=false, revision=0;
    const style=(text)=>({text,fontFamily:FONT,fontSize:Math.max(1,config.size),fontWeight:config.weight,color:colorOf(config.color),locale:getLanguage()==='zh'?'zh':'en',lineHeight:config.size*1.25});
    function align(slot,index,count){
      if(disposed||closed||!slot.label)return;
      const made=slot.label, bounds=made.bounds, d=made.display, h=config.size*1.25;
      const fit=config.width>0&&bounds.width>config.width?config.width/Math.max(1,bounds.width):1;
      d.scaleX=d.scaleY=fit;
      const contentW=bounds.width*fit;
      d.x=(config.align==='center'?(config.width-contentW)/2:config.align==='right'?config.width-contentW:0)-bounds.x*fit;
      d.y=(config.height>0?Math.max(0,(config.height-count*h)/2):0)+index*h-bounds.y*fit;
    }
    function update(){
      if(disposed||closed)return;
      root.x=config.x??0;root.y=config.y??0;root.alpha=config.alpha??1;
      const rows=textLines(config.text,config.size,config.weight,config.width,config.wrap);
      const token=++revision;
      for(let i=0;i<rows.length;i++){
        const desired=style(rows[i]), key=JSON.stringify(desired);
        if(!slots[i]){
          const slot=slots[i]={label:null,key:null,desired,active:true};
          host.track(game.createAtlasLabel({...desired,scope}).then(async made=>{
            if(disposed||closed||root.isDisposed){made.dispose();return;}
            slot.label=made;root.addChild(made.display);
            made.set(slot.desired);await made.ready;
            if(!disposed&&!closed&&!root.isDisposed){made.display.visible=slot.active&&root.visible;made.setRasterActive(made.display.visible);align(slot,i,slot.count??rows.length);host.requestPublish();}
          }).catch(cause=>{if(!disposed&&!closed&&!root.isDisposed)throw cause;}));
        }
        const slot=slots[i];slot.active=true;slot.count=rows.length;slot.desired=desired;
        if(slot.label){
          slot.label.display.visible=root.visible;slot.label.setRasterActive(root.visible);
          if(slot.key!==key){slot.label.set(desired);host.track(slot.label.ready.then(()=>{if(!disposed&&!closed&&token===revision)align(slot,i,rows.length);}).catch(cause=>{if(!disposed&&!closed&&!root.isDisposed)throw cause;}));}
          align(slot,i,rows.length);
        }
        slot.key=key;
      }
      for(let i=rows.length;i<slots.length;i++){const slot=slots[i];slot.active=false;if(slot.label){slot.label.display.visible=false;slot.label.setRasterActive(false);}}
      host.requestPublish();
    }
    const h={...handle(root,config,update),setRect(next){const changed=Object.keys(next).filter(k=>config[k]!==next[k]);if(!changed.length)return;Object.assign(config,next);if(changed.every(k=>k==='x'||k==='y')){root.x=config.x;root.y=config.y;}else update();},setText(text,overrides={}){const next={...overrides,text:String(text??'')};if(Object.keys(next).every(k=>config[k]===next[k]))return;Object.assign(config,next);update();},
      setVisible(value){if(root.visible===!!value)return;root.visible=!!value;for(const slot of slots)if(slot.label){slot.label.display.visible=slot.active&&root.visible;slot.label.setRasterActive(slot.label.display.visible);}host.requestPublish();},
      dispose(){if(disposed)return;disposed=true;for(const slot of slots)slot.label?.dispose();if(!root.isDisposed)root.dispose();}
    };
    labels.push(h);own(h);update();return h;
  }
  function panel(spec){
    const c={x:0,y:0,width:100,height:60,fill:COLORS.panel,alpha:.96,border:COLORS.ink,radius:10,block:false,...spec};
    const root=add(Sprite);
    function paint(){
      root.x=c.x;root.y=c.y;root.touchEnabled=!!c.block;root.hitArea=c.block?{x:0,y:0,width:c.width,height:c.height}:undefined;
      const g=root.graphics;g.clear();if(c.border!==null&&c.border!==false)g.lineStyle(typeof c.border==='object'?c.border.width??2:2,colorOf(typeof c.border==='object'?c.border.color:c.border),1);
      g.beginFill(colorOf(c.fill,COLORS.panel),c.alpha).drawRoundRect(0,0,c.width,c.height,c.radius,c.radius).endFill().lineStyle(0);
    }
    const h=handle(root,c,paint);own(h);paint();return h;
  }
  function image(spec) {
    const c={x:0,y:0,width:54,height:54,source:null,...spec},root=add(DisplayObjectContainer);
    let bitmap=null, token=0, disposed=false;
    const place=()=>{root.x=c.x;root.y=c.y;if(bitmap){bitmap.width=c.width;bitmap.height=c.height;}};
    function load(source) {
      const serial=++token;c.source=source;
      if(!source){if(bitmap)bitmap.visible=false;return;}
      host.track(host.texture(source).then(texture=>{
        if(disposed||closed||root.isDisposed||serial!==token||!texture)return;
        if(bitmap&&!bitmap.isDisposed)bitmap.dispose();
        bitmap=scope.use(new Bitmap(texture));root.addChild(bitmap);place();host.requestPublish();
      }).catch(cause=>{if(!disposed&&!closed&&!root.isDisposed)throw cause;}));
    }
    const h={...handle(root,c,place),setSource(source){if(c.source!==source)load(source);},
      dispose(){if(disposed)return;disposed=true;if(!root.isDisposed)root.dispose();}
    };own(h);place();load(c.source);return h;
  }
  function button(spec) {
    const c={id:'b'+(++sequence),text:'',name:undefined,x:0,y:0,width:120,height:48,primary:false,enabled:true,role:'button',...spec};
    const id=prefix+':'+c.id,root=add(DisplayObjectContainer),face=add(Sprite,root);
    // Labels and portraits must render above the hit sprite, but are not themselves hit targets.
    const subKit=createKit(host,root,{prefix:id+'-art',scope}); own({dispose:()=>subKit.dispose()});
    const icon=c.icon?subKit.image({source:c.icon,x:5,y:5,width:32,height:32}):null;
    const words=subKit.label({text:c.text,weight:800,color:COLORS.ink,align:'center'});
    const sub=c.sub?subKit.label({text:c.sub,weight:600,color:COLORS.soft,align:'center'}):null;
    let enabled=!!c.enabled, hovered=false, focusedBefore=false;
    const action=own(createActionControl({input:game.pointer,target:face,onActivate:()=>{
      if(!enabled){c.onRefuse?.();return;}
      keyboard?.focus(id,{visible:false});
      c.onActivate?.();host.requestPublish();
    },onPressChange:pressed=>{if(pressed)c.onFocus?.();paint();}}));
    const keyed=register(id,face,'action',action,{onPressChange:()=>paint()});
    if(hover)own(createHoverControl({hover,target:face,onHoverChange(value){hovered=value;if(value)c.onFocus?.();paint();}}));
    function paint(){
      if(root.isDisposed||closed)return;
      const focused=keyboard?.getSnapshot().focusedId===id, ring=focused&&keyboard?.getSnapshot().focusVisible;
      if(focused&&!focusedBefore)c.onFocus?.();focusedBefore=focused;
      const pressed=action.pressed||keyed.keys?.pressed, g=face.graphics;
      root.x=c.x;root.y=c.y;face.touchEnabled=enabled;face.hitArea={x:0,y:0,width:c.width,height:c.height};
      g.clear();const shade=pressed?1:3,bg=c.primary?COLORS.gold:COLORS.panel;
      g.beginFill(COLORS.ink,.86).drawRoundRect(0,shade,c.width,c.height,12,12).endFill();
      g.lineStyle(ring?3:2,ring?COLORS.gold:COLORS.ink,1).beginFill(hovered||ring?0xfff4cf:bg,enabled?1:.75).drawRoundRect(0,pressed?2:0,c.width,c.height-2,12,12).endFill().lineStyle(0);
      root.alpha=enabled?(c.muted ? .66 : 1):.58;
      const iconW=icon?Math.min(c.height-10,32):0;if(icon)icon.setRect({x:5,y:(c.height-iconW)/2,width:iconW,height:iconW});
      const left=icon?iconW+10:4, w=Math.max(1,c.width-left-4);
      words.setRect({x:left,y:sub?4:0,width:w,height:sub?c.height*.53:c.height-2});
      words.setText(c.text,{size:c.size??clamp(c.height*.37,12,19)});
      if(sub){sub.setRect({x:left,y:c.height*.53,width:w,height:c.height*.42});sub.setText(c.sub,{size:c.subSize??clamp(c.height*.24,10,14)});}
      host.requestPublish();
    }
    action.setEnabled(enabled);keyed.registration?.update({disabled:!enabled});
    const activate=()=>{if(enabled){action.press();action.release();}};
    semantic(id,c.role,()=>({name:c.name??c.text,bounds:semanticBoundsOf(face),disabled:!enabled,focused:keyboard?.getSnapshot().focusedId===id,hidden:!live(root)}),
      {onActivate:activate,onFocus:()=>keyboard?.focus(id,{visible:true})});
    const h={...handle(root,c,paint),face,id,control:action,focus(visible=true){keyboard?.focus(id,{visible});host.requestPublish();},
      setEnabled(value){enabled=!!value;action.setEnabled(enabled);keyed.registration?.update({disabled:!enabled});paint();},
      setText(text,overrides={}){Object.assign(c,overrides,{text});paint();},
      setVisible(value){root.visible=!!value;host.requestPublish();}, paint
    };own(h);painters.push(paint);paint();return h;
  }
  function toggle(spec) {
    const c={id:'toggle'+(++sequence),text:'',x:0,y:0,width:200,height:48,checked:false,...spec};
    const id=prefix+':'+c.id,root=add(DisplayObjectContainer),face=add(Sprite,root),sub=createKit(host,root,{prefix:id+'-art',scope});
    own({dispose:()=>sub.dispose()});const word=sub.label({text:c.text,weight:700,align:'left'});
    const control=own(createToggleControl({input:game.pointer,target:face,checked:!!c.checked,onChange:value=>{c.onChange?.(value);paint();}}));
    const keyed=register(id,face,'toggle',control,{onPressChange:()=>paint()});
    function paint(){if(root.isDisposed||closed)return;root.x=c.x;root.y=c.y;face.touchEnabled=control.enabled;face.hitArea={x:0,y:0,width:c.width,height:c.height};
      const g=face.graphics,focus=keyboard?.getSnapshot().focusedId===id&&keyboard?.getSnapshot().focusVisible;g.clear().lineStyle(focus?3:2,focus?COLORS.gold:COLORS.ink).beginFill(COLORS.panel).drawRoundRect(0,0,c.width,c.height,10,10).endFill();
      const w=Math.min(68,c.width*.3),h=Math.min(28,c.height-10),x=c.width-w-7,y=(c.height-h)/2;g.lineStyle(1,COLORS.ink).beginFill(control.checked?COLORS.green:COLORS.pale).drawRoundRect(x,y,w,h,h,h).endFill();
      g.beginFill(COLORS.white).drawCircle(x+(control.checked?w-h/2:h/2),y+h/2,h/2-3).endFill().lineStyle(0);word.setRect({x:9,y:0,width:c.width-w-20,height:c.height});word.setText(c.text,{size:c.size??16});host.requestPublish();}
    semantic(id,'switch',()=>({name:c.text,bounds:semanticBoundsOf(face),checked:control.checked,disabled:!control.enabled,focused:keyboard?.getSnapshot().focusedId===id,hidden:!live(root)}),
      {onActivate:()=>control.toggle(),onFocus:()=>keyboard?.focus(id,{visible:true})});
    const h={...handle(root,c,paint),face,id,control,focus:(visible=true)=>keyboard?.focus(id,{visible}),setEnabled(v){control.setEnabled(v);keyed.registration?.update({disabled:!v});paint();},setText(text){c.text=text;paint();},paint};own(h);painters.push(paint);paint();return h;
  }
  function choice(spec){
    const c={id:'choice'+(++sequence),items:[],x:0,y:0,width:240,height:48,selected:undefined,vertical:false,...spec};
    const id=prefix+':'+c.id,root=add(DisplayObjectContainer),strip=add(Sprite,root),sub=createKit(host,root,{prefix:id+'-art',scope});own({dispose:()=>sub.dispose()});
    const faces=c.items.map(item=>({item,face:add(Sprite,root),word:sub.label({text:item.text,weight:700,align:'center'})}));
    const group=own(createSelectionGroup({input:game.pointer,items:faces.map(({item,face})=>({key:item.key,target:face,enabled:item.enabled!==false})),selected:c.selected,wrap:false,onChange:(value)=>{c.onChange?.(value);paint();}}));
    const keyed=register(id,strip,'selection',group,{orientation:c.vertical?'vertical':'horizontal'});
    function paint(){
      if(root.isDisposed||closed)return;root.x=c.x;root.y=c.y;strip.hitArea={x:0,y:0,width:c.width,height:c.height};strip.graphics.clear();
      const n=Math.max(1,faces.length), w=c.vertical?c.width:c.width/n,h=c.vertical?c.height/n:c.height;
      const focus=keyboard?.getSnapshot().focusedId===id&&keyboard?.getSnapshot().focusVisible;
      faces.forEach(({item,face,word},i)=>{face.x=c.vertical?0:i*w;face.y=c.vertical?i*h:0;face.touchEnabled=item.enabled!==false;face.hitArea={x:0,y:0,width:w,height:h};
        face.graphics.clear().lineStyle(group.selected===item.key||focus?3:2,group.selected===item.key||focus?COLORS.gold:COLORS.ink).beginFill(group.selected===item.key?0xffeab0:COLORS.panel).drawRoundRect(1,1,Math.max(1,w-2),Math.max(1,h-2),8,8).endFill().lineStyle(0);
        word.setRect({x:face.x+3,y:face.y,width:Math.max(1,w-6),height:h});word.setText(item.text,{size:c.size??14});});
      host.requestPublish();
    }
    semantic(id,'radiogroup',()=>({name:c.name??c.text??c.id,bounds:semanticBoundsOf(strip),hidden:!live(root)}),{onFocus:()=>keyboard?.focus(id,{visible:true})});
    for(const {item,face} of faces) own(semantics.add({id:id+':'+String(item.key),parent:id,role:'radio',
      describe:()=>({name:item.name??item.text,checked:group.selected===item.key,bounds:semanticBoundsOf(face),disabled:item.enabled===false||!group.enabled,focused:keyboard?.getSnapshot().focusedId===id&&group.selected===item.key,hidden:!live(root)}),
      onActivate:()=>group.select(item.key),onFocus:()=>keyboard?.focus(id,{visible:true})}));
    const h={...handle(root,c,paint),id,group,control:group,focus:(visible=true)=>keyboard?.focus(id,{visible}),setEnabled(v){group.setEnabled(v);keyed.registration?.update({disabled:!v});paint();},paint};own(h);painters.push(paint);paint();return h;
  }
  function range(spec){
    const c={id:'range'+(++sequence),text:'',x:0,y:0,width:240,height:48,min:0,max:100,step:1,value:0,...spec};
    const id=prefix+':'+c.id,root=add(DisplayObjectContainer),face=add(Sprite,root),sub=createKit(host,root,{prefix:id+'-art',scope});own({dispose:()=>sub.dispose()});
    const word=sub.label({text:c.text,color:COLORS.ink,weight:700,align:'center'});
    const control=own(createRangeControl({input:game.pointer,target:face,length:Math.max(1,c.width),min:c.min,max:c.max,step:c.step,value:c.value,onChange:value=>{c.onChange?.(value);paint();}}));
    const keyed=register(id,face,'range',control);
    function paint(){if(root.isDisposed||closed)return;root.x=c.x;root.y=c.y;face.touchEnabled=control.enabled;face.hitArea={x:0,y:0,width:c.width,height:c.height};
      const g=face.graphics,d=c.height*.5;g.clear().lineStyle(2,COLORS.ink).beginFill(COLORS.pale).drawRoundRect(0,0,c.width,c.height,10,10).endFill();
      g.beginFill(COLORS.gold).drawRoundRect(5,d-4,Math.max(2,(c.width-10)*control.fraction),8,3,3).endFill();
      g.beginFill(COLORS.white).drawCircle(5+(c.width-10)*control.fraction,d,8).endFill().lineStyle(0);
      word.setRect({x:5,y:0,width:c.width-10,height:Math.max(10,d-4)});word.setText(c.text+' '+control.value,{size:13});host.requestPublish();}
    semantic(id,'slider',()=>({name:c.text,bounds:semanticBoundsOf(face),range:{min:c.min,max:c.max,now:control.value},disabled:!control.enabled,focused:keyboard?.getSnapshot().focusedId===id,hidden:!live(root)}),
      {onFocus:()=>keyboard?.focus(id,{visible:true})});
    const h={...handle(root,c,paint),id,control,focus:(visible=true)=>keyboard?.focus(id,{visible}),setEnabled(v){control.setEnabled(v);keyed.registration?.update({disabled:!v});paint();},paint};own(h);painters.push(paint);paint();return h;
  }
  const unpaint=host.registerPainter(()=>{for(const paint of painters)paint();});
  return {scope,parent,own,label,panel,button,toggle,choice,range,image,
    repaint:()=>painters.forEach(paint=>paint()),
    setRasterActive(value){for(const label of labels)label.setVisible(value);},
    dispose(){if(closed)return;closed=true;unpaint();for(const item of owned.reverse())try{if(typeof item.remove==='function')item.remove();else item.dispose?.();}catch{}owned.length=0;painters.length=0;if(ownScope)scope.dispose();host.requestPublish();}
  };
}
