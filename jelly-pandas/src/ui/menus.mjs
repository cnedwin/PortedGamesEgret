// The island's menus are genuine Egret display trees. One managed root per
// page follows the safe screen plan; native controls, focus and semantics
// are registered only for committed leaves.
import { Bitmap, Sprite } from '@egret/engine';
import { createActionControl, createControlKeys, createHoverControl, createSelectionGroup, createUiRoot, createUiScreenStack } from '@egret/engine/ui';
import { semanticBoundsOf } from '@egret/engine/ui/semantics';
import { CHARMS, CHARM_BY_KEY, PLAY_STYLES, RUN, SKINS, TOY_BY_KEY, TOYS } from '../data.mjs';

const C = { ink: 0x271633, panel: 0x291938, panelInner: 0x20132e, border: 0x77538e, cream: 0xfff5e5, hint: 0xd6c4e8,
  gold: 0xffdf92, green: 0x79e68c, grove: 0x247b57, surface: 0x47305e, hover: 0x5c4177, held: 0x39224c,
  red: 0xff899f, blue: 0x8fd4ff };
const TRICKS = ['slam', 'bump', 'roll'];
const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const DELTA = {
  damage:(v,zh)=>zh?`伤害 +${v}`:`+${v} damage`, cooldown:(v,zh)=>zh?`冷却 ${v} 秒`:`Fires ${-v} s sooner`,
  amount:(v,zh)=>zh?`数量 +${v}`:`+${v} more`, area:(v,zh)=>zh?`范围 +${Math.round(v*100)}%`:`${Math.round(v*100)}% bigger`,
  duration:(v,zh)=>zh?`持续 +${v} 秒`:`Lasts ${v} s longer`, range:(v,zh)=>zh?`射程 +${v}`:`Reaches ${v} m farther`,
  speed:(v,zh)=>zh?`速度 +${v}`:'Faster', knock:(v,zh)=>zh?`击退 +${v}`:'Harder shove',
  pierce:(v,zh)=>zh?`穿透 +${v}`:`Passes through ${v} more`, extra:(_v,zh)=>zh?'效果增强':'Stronger effect'
};

const rect = (g, x, y, w, h, fill, radius = 10, alpha = 1) => {
  if (w <= 0 || h <= 0) return;
  g.beginFill(fill, alpha).drawRoundRect(x, y, w, h, radius, radius).endFill();
};
const box = (x, y, width, height) => ({ x, y, width, height });
const sum = (arr, key, gap) => arr.reduce((v,a)=>v+a[key],0) + Math.max(0,arr.length-1)*gap;
const row = (id, children, gap = 6) => ({
  id, kind:'row', explicitWidth:sum(children,'explicitWidth',gap),
  explicitHeight:Math.max(...children.map(c=>c.explicitHeight)), gap, crossAlign:'center', children
});
const column = (id, children, gap = 6) => ({
  id, kind:'column', explicitWidth:Math.max(...children.map(c=>c.explicitWidth)),
  explicitHeight:sum(children,'explicitHeight',gap), gap, crossAlign:'center', children
});
const evenly = (width, count, gap = 6) => Math.floor((width-(count-1)*gap)/count);

// Paragraph wrapping and font fallback are owned by the engine. The card retains
// its authored rectangle and scales the committed paragraph to keep every line.
function textLine(text,x,y,w,h,size=16,color=C.cream,options={}) {
  return {text,x,y,w,h,size,color,...options};
}
function paragraph(text,x,y,w,h,size=14,color=C.hint,options={}) {
  return [{...textLine(text,x,y,w,h,size,color,options),paragraph:true}];
}
export function createMenus(game, { semantics, atlas, locale, hover=game.hover, onError, onTitleLayout,
  getTouchMode=()=>false, getGamepadMode=()=>false, onChanged=()=>{}, focusCanvas=()=>{} } = {}) {
  const t=key=>locale.t(key),name=def=>locale.name(def),describe=def=>locale.describe(def),zh=()=>locale.zh();
  const stack=game.scope.use(createUiScreenStack({onError}));
  const pages=new Map();
  let wanted, generation=0, ready=Promise.resolve(), closed=false, titleModel, lastFocus='',lastDevice='';
  let offerStatus='',offerStatusBounds=box(0,0,1,1);
  // Keep the live region alive between offers: an existing polite status
  // changes on the first offer and on rerolls rather than inserting an
  // already-filled region only when the sheet is shown.
  const statusHandle=semantics?.add({id:'menu-offer-status',role:'status',
    describe:()=>({name:offerStatus,bounds:offerStatusBounds})});
  if(statusHandle)game.scope.use({dispose:()=>statusHandle.remove()});
  const current=()=>pages.get(stack.snapshot().active);
  const words=(en,cn)=>zh()?cn:en;
  const publish=()=>{onChanged();game.invalidate();};
  function guide() {
    if (getGamepadMode()) return words('Left stick move · Right stick look · A jump · B slam · X roll · D-pad choose · Y reroll · Start menu',
      '左摇杆移动 · 右摇杆转视角 · A 跳跃 · B 下砸 · X 翻滚 · 方向键选卡 · Y 重抽 · Start 菜单');
    return t(getTouchMode()?'touchControls':'controls');
  }
  function queue(work) {
    ready=ready.catch(()=>{}).then(()=>closed?undefined:work());
    void ready.catch(cause=>{if(!closed)onError?.(cause);});
    return ready;
  }
  const record=(page,id)=>page.records.get(id);
  function refresh(page) {
    for(const group of page.groups.values()) {
      if(group.control.enabled!==page.active)group.control.setEnabled(page.active);
      for(const id of group.ids){
        const enabled=!page.specs.get(id)?.disabled;
        if(group.control.isItemEnabled(id)!==enabled)group.control.setItemEnabled(id,enabled);
      }
    }
    for(const [id,rec] of page.records) {
      const spec=page.specs.get(id);
      if(!spec)continue;
      if(rec.control||rec.groupName) {
        const enabled=page.active && !spec.disabled;
        if(rec.control&&rec.control.enabled!==enabled)rec.control.setEnabled(enabled);
        if(rec.hover?.enabled!==enabled)rec.hover?.setEnabled(enabled);
        if(rec.enabled!==enabled){rec.enabled=enabled;rec.registration?.update({disabled:!enabled});}
      }
      rec.paint();
    }
    publish();
  }
  function drawCard(rec, spec) {
    const {surface,w,h,control,hover:pointed,enabled}=rec;
    const snapshot=game.keyboard?.getSnapshot();
    const focused=snapshot?.focusedId===rec.id && snapshot.focusVisible;
    const pressed=!!control?.pressed||!!rec.keyHeld, over=!!pointed?.hovered, selected=!!spec.checked;
    const flags=[enabled,focused,pressed,over,selected,spec.primary,spec.evo,spec.accent,spec.panel].join(':');
    if(rec.last===flags)return;
    rec.last=flags;
    const g=surface.graphics;g.clear();
    if(!spec.action && !spec.panel)return;
    const primary=spec.primary, accent=spec.accent??(spec.evo?C.gold:C.border);
    const rim=focused?C.green:selected?C.gold:spec.evo?C.gold:accent;
    const fill=primary?(pressed?C.grove:over?0x49bc72:0x359a60):
      !enabled&&spec.action?0x332640:pressed?C.held:over?C.hover:selected?0x5a4169:spec.panel?C.panelInner:C.surface;
    rect(g,0,0,w,h,rim,13,(!enabled&&spec.action)?0.4:1);
    rect(g,focused?3:1.5,focused?3:1.5,w-(focused?6:3),h-(focused?6:3),fill,11,1);
    // A light edge and a candy-coloured stripe keep portrait selection clear.
    if(spec.accent && spec.action)rect(g,5,5,w-10,3,spec.accent,3,0.9);
    if(selected)rect(g,w-14,5,9,9,C.gold,9);
  }
  async function addText(scope,surface,line) {
    if(line.paragraph){
      const label=await game.createParagraphLabel({scope,text:String(line.text),width:Math.max(1,line.w),
        fontFamilies:zh()?['Microsoft YaHei','Noto Sans CJK SC','sans-serif']:['Arial','sans-serif'],
        fontSize:Math.max(8,line.size),lineHeight:Math.max(10,line.size*1.25),
        color:line.color,locale:locale.lang,textAlign:line.align==='left'?'left':'center'});
      await label.ready;
      const bounds=label.bounds,scale=Math.min(1,line.w/Math.max(1,bounds.width),Math.max(1,line.h)/Math.max(1,bounds.height));
      label.display.scaleX=label.display.scaleY=scale;
      label.display.x=line.x+(line.align==='left'?0:(line.w-bounds.width*scale)/2)-bounds.x*scale;
      label.display.y=line.y+(line.vcenter?(line.h-bounds.height*scale)/2:0)-bounds.y*scale;
      surface.addChild(label.display);
      return label;
    }
    const label=await game.createAtlasLabel({scope,text:String(line.text),fontFamily:zh()?'Microsoft YaHei':'Arial',
      // A regular CJK body avoids the synthetic-heavy 1x raster observed
      // with small 600-weight Chinese descriptions; headings remain bold.
      fontSize:Math.max(8,line.size),fontWeight:line.bold?800:zh()?400:600,color:line.color,locale:locale.lang});
    await label.ready;
    const bounds=label.bounds;
    const scale=Math.min(1,line.w/Math.max(1,bounds.width),line.h/Math.max(1,bounds.height));
    label.display.scaleX=label.display.scaleY=scale;
    label.display.x=line.x+(line.align==='left'?0:(line.w-bounds.width*scale)/2)-bounds.x*scale;
    label.display.y=line.y+(line.h-bounds.height*scale)/2-bounds.y*scale;
    surface.addChild(label.display);
    return label;
  }
  async function addPortrait(scope,surface,image) {
    const lease=await Promise.resolve(atlas).catch(()=>undefined);
    if(!lease) {
      const placeholder=scope.use(new Sprite());
      rect(placeholder.graphics,image.x,image.y,image.w,image.h,SKINS[image.index].body,12);
      surface.addChild(placeholder);
      return;
    }
    const bitmap=scope.use(new Bitmap(lease));
    const full=image.full;
    bitmap.sourceRect={x:(image.index%4)*384+(full?0:32),y:Math.floor(image.index/4)*512+(full?0:24),
      width:full?384:320,height:full?512:320};
    const factor=Math.min(image.w/bitmap.naturalWidth,image.h/bitmap.naturalHeight);
    bitmap.scaleX=bitmap.scaleY=factor;
    bitmap.x=image.x+(image.w-bitmap.naturalWidth*factor)/2;
    bitmap.y=image.y+(image.h-bitmap.naturalHeight*factor)/2;
    surface.addChild(bitmap);
  }
  function leaf(page, key, w, h, spec={}) {
    w=Math.floor(w);h=Math.floor(h);
    const id=`menu-${page.kind}-${key}`;
    spec={...spec,id,w,h};
    page.nextSpecs.set(id,spec);
    const signature=JSON.stringify([w,h,spec.lines,spec.image,spec.action?true:false,!!spec.panel,spec.group,locale.lang]);
    let source=page.sources.get(id);
    if(source?.signature!==signature) {
      const content={
        revision:(source?.content.revision??-1)+1,
        async prepare({scope}) {
          const surface=scope.use(new Sprite());
          const rec={surface,w,h,id,enabled:false,last:''};
          // The drawing and hit geometry are exactly this leaf's own box.
          if(spec.action){surface.hitArea=box(0,0,w,h);surface.touchEnabled=true;surface.touchChildren=false;}
          rec.paint=()=>drawCard(rec,page.specs.get(id)??spec);
          drawCard(rec,spec);
          const lines=(spec.lines??[]).map(line=>addText(scope,surface,line));
          const [labels]=await Promise.all([Promise.all(lines),spec.image?addPortrait(scope,surface,spec.image):undefined]);
          rec.labels=labels.map(label=>label.display);
          // Draw a background even for a fallback portrait after preparing.
          rec.last='';drawCard(rec,spec);
          page.prepared.set(surface,rec);
          return {content:surface,measuredHeight:h};
        },
        onAttach({scope,content:surface}) {
          const rec=page.prepared.get(surface);
          if(!rec)return;
          page.records.set(id,rec);
          scope.use({dispose:()=>{if(page.records.get(id)===rec)page.records.delete(id);}});
          if(spec.action) {
            const activate=()=>{const s=page.specs.get(id);if(page.active&&wanted&&s?.action&&!s.disabled)s.action();};
            rec.groupName=spec.group;
            if(!spec.group)rec.control=scope.use(createActionControl({input:game.pointer,target:surface,onActivate:activate,
              onPressChange:pressed=>{
                if(pressed&&page.active)game.keyboard?.focus(id,{visible:false,reason:'pointer'});
                rec.paint();publish();
              }}));
            // SelectionGroup is the only pointer/activation authority for
            // roster, party and upgrade choices. The documented keyboard
            // action facade simply selects that same native item by key.
            const choose=()=>page.groups.get(rec.groupName)?.control.select(id);
            const keyAction=rec.control??{
              get enabled(){return rec.enabled;},press(){},release(){if(rec.enabled)choose();}
            };
            if(hover)rec.hover=scope.use(createHoverControl({hover,target:surface,onHoverChange:()=>{rec.paint();publish();}}));
            if(game.keyboard) {
              rec.registration=scope.use(game.keyboard.registerTarget({id,target:surface,disabled:!page.active||!!spec.disabled}));
              scope.use(createControlKeys({keyboard:game.keyboard,target:surface,kind:'action',control:keyAction,
                onPressChange:pressed=>{rec.keyHeld=pressed;rec.paint();publish();}}));
            }
            const semantic=semantics?.add({id,role:spec.role??'button',parent:spec.parent??page.semanticId,
              describe:()=>{
                const s=page.specs.get(id)??spec;
                const info={name:s.name,bounds:semanticBoundsOf(surface),disabled:!page.active||!!s.disabled,
                  focused:game.keyboard?.getSnapshot().focusedId===id};
                if(s.role==='radio'||s.role==='switch')info.checked=!!s.checked;
                return info;
              },
              onActivate:()=>{if(rec.enabled){if(rec.groupName)choose();else {rec.control.press();rec.control.release();}}},
              onFocus:()=>game.keyboard?.focus(id,{visible:true})});
            if(semantic)scope.use({dispose:()=>semantic.remove()});
          }
          // Published from the same committed leaf that draws these words.
          // A button's effect is a sibling, not an illegal child of its
          // leaf semantic role. Button names remain exact for focus/testing.
          const text=spec.semanticText??(spec.lines??[]).map(line=>line.text).filter(Boolean).join(' ');
          if(text&&(!spec.action||spec.semanticDetail)){
            const role=spec.action?'text':spec.semanticRole??'text';
            const semanticId=spec.action?id+'-detail':id;
            const detail=semantics?.add({id:semanticId,role,parent:page.semanticId,describe:()=>{
              const s=page.specs.get(id)??spec;
              const content=s.semanticText??(s.lines??[]).map(line=>line.text).filter(Boolean).join(' ');
              const displays=rec.labels.slice(s.semanticDetail??0);
              const boxes=displays.filter(d=>!d.isDisposed&&d.visible).map(semanticBoundsOf).filter(b=>b.width>0&&b.height>0);
              const x=boxes.length?Math.min(...boxes.map(b=>b.x)):0,y=boxes.length?Math.min(...boxes.map(b=>b.y)):0;
              const bounds=boxes.length?box(x,y,Math.max(...boxes.map(b=>b.x+b.width))-x,Math.max(...boxes.map(b=>b.y+b.height))-y):semanticBoundsOf(surface);
              return {name:String(content),bounds,...(role==='heading'?{level:1}:{})};
            }});
            if(detail)scope.use({dispose:()=>detail.remove()});
          }
        }
      };
      source={signature,content};page.sources.set(id,source);
    }
    return {id,kind:'leaf',explicitWidth:w,explicitHeight:h,content:source.content};
  }
  function label(page,key,w,h,text,size=18,color=C.cream,opts={}) {
    return leaf(page,key,w,h,{semanticText:text,semanticRole:['heading','logo'].includes(key)?'heading':'text',
      lines:[textLine(text,0,0,w,h,size,color,{bold:true,...opts})]});
  }
  function button(page,key,w,h,text,action,opts={}) {
    return leaf(page,key,w,h,{...opts,name:opts.name??text,action,
      lines:opts.lines??[textLine(text,8,4,w-16,h-8,opts.size??17,opts.primary?0xffffff:C.cream,{bold:true})]});
  }
  function textBlock(page,key,w,h,text,size=14,color=C.hint,options={}) {
    return leaf(page,key,w,h,{semanticText:text,lines:paragraph(text,2,1,w-4,h-2,size,color,options)});
  }
  function partyButtons(page,w,h,count,first=1) {
    const state=page.model.state;
    return row(`party-${first}`,Array.from({length:count},(_,n)=>{
      const size=first+n, text=size===1?t('solo'):`+${size-1} ${t(size===2?'friend':'friends')}`;
      return button(page,`party-${size}`,evenly(w,count),h,text,()=>{
        if(state.party===size)return;state.party=size;page.model.handlers.onChange?.();rerender(page);
      },{role:'radio',group:'party',parent:'menu-title-party',checked:state.party===size,size:13});
    }));
  }
  function roster(page,w,cardH) {
    const state=page.model.state;
    const cardW=evenly(w,4,5);
    const cards=SKINS.map((skin,index)=>{
      const toy=TOYS[TOY_BY_KEY[skin.start]], ownName=name(skin), toyName=name(toy);
      const face=Math.min(cardH-29,cardW-12,cardH>75?50:34);
      return button(page,`skin-${skin.key}`,cardW,cardH,ownName,()=>{
        if(state.skin===index)return;state.skin=index;page.model.handlers.onChange?.();rerender(page);
      },{name:`${ownName} · ${toyName}`,role:'radio',group:'skin',parent:'menu-title-skins',checked:state.skin===index,accent:skin.body,
        image:{index,x:0,y:5,w:cardW,h:face},
        lines:[textLine(ownName,3,face+4,cardW-6,15,13,C.cream,{bold:true}),
          textLine(`${toy.icon} ${toyName}`,3,face+18,cardW-6,cardH-face-20,10.5,C.hint)]});
    });
    return column('roster',[row('roster-row-a',cards.slice(0,4),5),row('roster-row-b',cards.slice(4),5)],5);
  }
  function profile(page,w,h) {
    const index=page.model.state.skin,skin=SKINS[index],toy=TOYS[TOY_BY_KEY[skin.start]];
    const imageW=Math.min(54,Math.floor(h*0.72));
    return leaf(page,'profile',w,h,{panel:true,accent:skin.body,
      semanticText:`${name(skin)} · ${name(toy)} · ${name(PLAY_STYLES[skin.key])}`,
      image:{index,full:true,x:5,y:3,w:imageW,h:h-6},
      lines:[textLine(`${name(skin)} · ${name(toy)}`,imageW+10,4,w-imageW-16,18,15,skin.body,{bold:true,align:'left'}),
        ...paragraph(name(PLAY_STYLES[skin.key]),imageW+10,24,w-imageW-16,h-28,13,C.cream,{align:'left'})]});
  }
  function titleLayout(page,safe) {
    const sw=safe.width,sh=safe.height, portrait=sh>sw, short=sh<415&&!portrait;
    const w=Math.floor(portrait?Math.min(538,sw-24):Math.min(short?615:590,sw-(short?142:110)));
    const gap=short?5:7, controlH=46, bodyW=w;
    const children=[label(page,'logo',w,short?29:44,t('title'),short?29:42,C.green)];
    children.push(label(page,'tag',w,short?17:23,t('tagline'),short?11.5:14,C.hint));
    if(short) {
      const left=Math.floor(bodyW*.55),right=bodyW-left-8;
      const r=roster(page,left,72);
      const p=column('summary-short',[profile(page,right,62),partyButtons(page,right,44,2,1),partyButtons(page,right,44,2,3)],5);
      children.push(row('title-body',[r,p],8));
    } else {
      children.push(label(page,'pick',w,18,t('pick'),15,C.gold));
      children.push(roster(page,w,portrait?79:89));
      children.push(profile(page,w,portrait?67:75));
      children.push(label(page,'party-label',w,17,t('party'),14,C.gold));
      children.push(partyButtons(page,w,46,4));
    }
    const actions=[button(page,'play',Math.floor(w*.36),controlH,t('play'),()=>page.model.handlers.onPlay(),{primary:true,size:22}),
      button(page,'settings',Math.floor(w*.31)-6,controlH,words('Settings','设置'),()=>openPopup('settings'),{size:15}),
      button(page,'help',w-Math.floor(w*.36)-Math.floor(w*.31)-6,controlH,words('How to play','玩法说明'),()=>openPopup('help'),{size:15})];
    children.push(row('title-actions',actions,6));
    if(!short && !portrait)children.push(textBlock(page,'guide',w,34,guide(),11.5,C.hint));
    const tree=column('body',children,gap),margin=12, W=tree.explicitWidth+margin*2,H=tree.explicitHeight+margin*2;
    const x=portrait?safe.x+(sw-W)/2:safe.x+sw-W-10;
    // Leave the selected panda's live preview clear above the panel on an upright phone.
    const y=portrait?safe.y+sh-H-8:safe.y+(sh-H)/2;
    return {tree,panel:box(x,y,W,H),origin:box(x+margin,y+margin,tree.explicitWidth,tree.explicitHeight),
      preview:portrait?box(safe.x,safe.y,sw,Math.max(0,y-safe.y-4)):box(safe.x,safe.y,Math.max(0,x-safe.x-6),sh),portrait};
  }
  function cardInfo(card,panda) {
    if(card.type==='heal')return {icon:'🎋',title:t('heal'),tag:'',text:t('healDesc')};
    if(card.type==='bonus')return {icon:'✨',title:t('bonus'),tag:'',text:t('bonusDesc')};
    let info;
    if(card.type==='charm') {const def=CHARMS[card.id];info={icon:def.icon,title:name(def),tag:card.level===1?t('newCharm'):`${t('level')} ${card.level}`,text:describe(def)};}
    else {
      const def=TOYS[card.id];
      if(card.type==='evo')info={icon:def.icon,title:name(def.evo),tag:t('evolve'),text:describe(def.evo),evo:true};
      else if(card.level===1)info={icon:def.icon,title:name(def),tag:t('newToy'),text:describe(def)};
      else info={icon:def.icon,title:name(def),tag:`${t('level')} ${card.level}${card.level===RUN.maxToyLevel?' · '+t('toyMax'):''}`,
        text:Object.entries(def.levels[card.level-2]).map(([key,v])=>DELTA[key]?.(v,zh())??key).join(zh()?'，':', ')};
    }
    if(panda.openingOffer) {
      const starter=TOYS[TOY_BY_KEY[SKINS[panda.skin].start]];
      if(card.type==='toy'&&card.id===TOY_BY_KEY[starter.key])info.tag=t('starterUpgrade')+' · '+info.tag;
      if(card.type==='charm'&&card.id===CHARM_BY_KEY[starter.charm]){
        info.tag=t('starterEvolution');
        info.text+=zh()?`。配合满级${name(starter)}可进化为${name(starter.evo)}。`:
          ` With max-level ${name(starter)}, evolves into ${name(starter.evo)}.`;
      }
    }
    return info;
  }
  function upgradeLayout(page,safe) {
    const panda=page.model.panda,portrait=safe.height>safe.width&&safe.width<650,
      w=Math.floor(Math.min(portrait?520:790,safe.width-34)),cardW=portrait?w:evenly(w,3,8);
    const cardH=portrait?Math.max(111,Math.min(142,Math.floor((safe.height-142)/3))):Math.min(254,Math.floor(safe.height-140));
    const cards=panda.offer.map((card,i)=>{
      const info=cardInfo(card,panda), number=getTouchMode()?'':`${i+1} · `,icon=info.icon;
      const lines=portrait?[
        textLine(icon,9,11,58,60,34,C.cream),
        textLine(number+info.title,73,6,cardW-82,24,17,C.cream,{bold:true,align:'left'}),
        textLine(info.tag,73,31,cardW-82,18,11,C.gold,{align:'left'}),
        ...paragraph(info.text,73,51,cardW-84,cardH-55,13,C.cream,{align:'left',vcenter:true})
      ]:[
        textLine(icon,4,5,cardW-8,Math.min(70,cardH*.29),Math.min(47,cardH*.22)),
        textLine(number+info.title,6,Math.min(75,cardH*.29+7),cardW-12,25,17,C.cream,{bold:true}),
        textLine(info.tag,6,Math.min(101,cardH*.29+33),cardW-12,22,11,C.gold),
        ...paragraph(info.text,9,Math.min(126,cardH*.29+57),cardW-18,cardH-Math.min(126,cardH*.29+57)-8,13,C.cream,{vcenter:true})
      ];
      return button(page,`offer-${i+1}`,cardW,cardH,info.title,()=>page.model.handlers.onPick(i),
        {name:`${i+1}. ${info.title}`,group:'offer',evo:info.evo,lines,semanticDetail:2,
          semanticText:[info.title,info.tag,info.text].filter(Boolean).join(' · ')});
    });
    const children=[label(page,'heading',w,34,t('levelUp'),30,C.gold),portrait?column('deck',cards,7):row('deck',cards,8)];
    children.push(button(page,'reroll',Math.min(w,250),46,`${t(getTouchMode()?'rerollTouch':'reroll')} ×${panda.rerolls}`,
      ()=>page.model.handlers.onReroll(),{disabled:panda.rerolls<=0,size:16}));
    if(panda.openingOffer)children.push(label(page,'reroll-tip',w,16,t('starterReroll'),12,C.hint));
    return centerPanel(column('body',children,5),safe,8);
  }
  function centerPanel(tree,safe,padding=12) {
    const w=tree.explicitWidth+padding*2,h=tree.explicitHeight+padding*2;
    const x=safe.x+(safe.width-w)/2,y=safe.y+(safe.height-h)/2;
    return {tree,panel:box(x,y,w,h),origin:box(x+padding,y+padding,tree.explicitWidth,tree.explicitHeight)};
  }
  function simpleLayout(page,safe) {
    const w=Math.floor(Math.min(440,safe.width-42)),h=46, children=[];
    const model=page.model, kind=page.kind, compact=safe.height<405;
    if(kind==='settings') {
      const state=titleModel.state, change=()=>{titleModel.handlers.onChange?.();rerender(page);};
      children.push(label(page,'heading',w,34,words('Settings','设置'),27,C.green));
      children.push(button(page,'language',w,h,words('Language: English','语言：中文'),()=>{
        locale.setLang(zh()?'en':'zh');rerender(pages.get('jelly-title'));rerender(page);
      }));
      children.push(button(page,'sound',w,h,`${words('Sound','声音')} · ${state.muted?words('Off','关'):words('On','开')}`,()=>{
        state.muted=!state.muted;change();
      },{name:words('Sound','声音'),role:'switch',checked:!state.muted}));
      children.push(button(page,'quality',w,h,`${t('quality')}${t('quality_'+state.quality)}`,()=>{
        state.quality={high:'medium',medium:'low',low:'high'}[state.quality]??'high';change();
      }));
      children.push(button(page,'close',w,h,words('Close','关闭'),closePopup,{primary:true}));
    } else if(kind==='help') {
      children.push(label(page,'heading',w,34,words('How to play','玩法说明'),26,C.gold));
      children.push(textBlock(page,'goal',w,compact?29:44,t('tagline'),16,C.cream,{vcenter:true}));
      children.push(textBlock(page,'moves',w,compact?110:160,guide().split(' · ').join('\n'),compact?13:15,C.cream,{vcenter:true}));
      children.push(button(page,'close',w,h,words('Close','关闭'),closePopup,{primary:true}));
    } else if(kind==='pause') {
      children.push(label(page,'heading',w,36,t('paused'),30,C.green));
      for(const [key,fn]of [['resume',model.handlers.onResume],['restart',model.handlers.onRestart],['quit',model.handlers.onQuit]])
        children.push(button(page,key,w,h,t(key),fn,{primary:key==='resume'}));
      children.push(textBlock(page,'guide',w,compact?44:70,guide(),12.5,C.hint));
    } else if(kind==='end') {
      const sim=model.sim,won=sim.state==='won',human=sim.pandas.find(p=>p.human)??sim.pandas[0];
      children.push(label(page,'heading',w,37,t(won?'victory':'defeat'),26,won?C.green:C.red));
      const values=[[t('survived'),clock(sim.t)],[t('level'),sim.level],[t('kills'),sim.kills]];
      if(human.tricks)values.push([t('trickTitle'),`${TRICKS.filter(key=>human.tricks[key]).length}/3`]);
      children.push(leaf(page,'stats',w,compact?70:100,{panel:true,lines:values.flatMap(([key,value],i)=>{
        const lineH=(compact?70:100)/values.length;
        return [textLine(key,12,i*lineH,w*.68-12,lineH,14,C.hint,{align:'left'}),
          textLine(String(value),w*.68,i*lineH,w*.32-12,lineH,17,C.cream,{bold:true})];
      }),semanticText:values.map(([key,value])=>`${key}: ${value}`).join(' · ')}));
      const build=[...human.toys.map(toy=>`${TOYS[toy.id].icon}${toy.evo?'★':toy.level}`),
        ...[...human.charms].map(([id,level])=>`${CHARMS[id].icon}${level}`)].join('  ');
      if(build)children.push(leaf(page,'build',w,compact?34:49,{
        lines:paragraph(build,2,1,w-4,(compact?34:49)-2,19,C.gold),
        semanticText:[...human.toys.map(toy=>`${name(toy.evo?TOYS[toy.id].evo:TOYS[toy.id])} ${t('level')} ${toy.level}`),
          ...[...human.charms].map(([id,level])=>`${name(CHARMS[id])} ${t('level')} ${level}`)].join(' · ')
      }));
      children.push(row('end-actions',[
        button(page,'again',evenly(w,2),h,t('again'),model.handlers.onRestart,{primary:true}),
        button(page,'quit',evenly(w,2),h,t('quit'),model.handlers.onQuit)
      ]));
    } else if(kind==='failure') {
      children.push(label(page,'heading',w,36,words('Could not load the island','玩具岛加载失败'),25,C.red));
      children.push(textBlock(page,'detail',w,compact?92:132,String(model.error?.message??model.error),14,C.cream));
      children.push(button(page,'reload',w,h,words('Reload','重新加载'),model.reload,{primary:true}));
    }
    return centerPanel(column('body',children,compact?5:8),safe,12);
  }
  function paintBackdrop(page, layout) {
    const screen=game.screen,{panel:p}=layout;
    const g=page.backdrop.graphics;g.clear();
    g.beginFill(0x130b21,page.kind==='title'?0.08:0.72).drawRect(0,0,screen.width,screen.height).endFill();
    const x=p.x,y=p.y,w=p.width,h=p.height;
    rect(g,x,y+4,w,h-4,C.ink,23,0.9);rect(g,x,y,w,h,C.border,23);
    rect(g,x+1.5,y+1.5,w-3,h-3,C.panel,21);
    page.backdrop.hitArea=box(0,0,screen.width,screen.height);
  }
  function syncGroups(page) {
    const entries=new Map();
    for(const [id,rec]of page.records)if(rec.groupName){
      const list=entries.get(rec.groupName)??[];
      list.push({id,rec});entries.set(rec.groupName,list);
    }
    for(const [key,group]of page.groups)if(!entries.has(key)){
      group.control.dispose();page.groups.delete(key);
    }
    for(const [key,list]of entries) {
      // Registration/commit order is not the logical roster order when leaves
      // are reused. Stable spec insertion order retains native group ordering.
      list.sort((a,b)=>[...page.specs.keys()].indexOf(a.id)-[...page.specs.keys()].indexOf(b.id));
      const ids=list.map(v=>v.id),targets=list.map(v=>v.rec.surface);
      const selected=ids.find(id=>page.specs.get(id)?.checked);
      const old=page.groups.get(key);
      if(old&&old.targets.length===targets.length&&old.targets.every((target,i)=>target===targets[i])&&old.control.selected===selected)continue;
      old?.control.dispose();
      const control=page.scope.use(createSelectionGroup({input:game.pointer,
        items:ids.map((id,i)=>({key:id,target:targets[i],enabled:!page.specs.get(id)?.disabled})),
        ...(selected?{selected}:{}),onChange:id=>{
          const spec=page.specs.get(id);
          if(page.active&&wanted&&spec?.action&&!spec.disabled){
            if(key!=='offer'){
              for(const item of ids){
                const s=page.specs.get(item);if(s)s.checked=item===id;
                page.records.get(item)?.paint();
              }
            }
            const focus=game.keyboard?.getSnapshot();
            if(focus?.focusedId!==id)game.keyboard?.focus(id,{visible:!getTouchMode()&&!!focus?.focusVisible});
            spec.action();publish();
          }
        }}));
      page.groups.set(key,{control,ids,targets});
    }
  }
  function announceOffer(page) {
    if(page.kind!=='cards'||!page.active)return;
    const panda=page.model.panda;
    const choices=panda.offer.map((card,index)=>{
      const info=cardInfo(card,panda);
      return `${index+1}. ${[info.title,info.tag,info.text].filter(Boolean).join(' · ')}`;
    });
    offerStatus=[t('levelUp'),...choices,`${t('rerollTouch')} ×${panda.rerolls}`].join(' · ');
    offerStatusBounds=page.layout.panel;
  }
  function firstEligible(page) {
    return [...page.specs.keys()].find(id=>page.records.get(id)?.enabled);
  }
  async function render(page) {
    if(page.scope.state!=='open')return;
    const priorFocus=game.keyboard?.getSnapshot();
    page.nextSpecs=new Map();
    const safe=game.screen.safe;
    const layout=page.kind==='title'?titleLayout(page,safe):page.kind==='cards'?upgradeLayout(page,safe):simpleLayout(page,safe);
    const nextSpecs=page.nextSpecs;
    // Keep the prior committed semantic words/geometry authoritative while
    // labels and the next managed layout are preparing.
    if(!page.layout)paintBackdrop(page,layout);
    const view={width:layout.origin.width,height:layout.origin.height},origin={x:layout.origin.x,y:layout.origin.y};
    if(!page.root) page.root=page.scope.use(createUiRoot({engine:game.engine,scope:page.scope,id:`jelly-${page.kind}`,
      viewport:view,origin,density:1,tree:layout.tree,input:game.pointer}));
    else {page.root.setOrigin(origin);page.root.setViewport(view,1);page.root.setTree(layout.tree,{responsive:true});}
    const token=await page.root.prepare();
    if(page.scope.state!=='open')return;
    const done=page.root.commit(token);
    if(done.postCommitErrors?.length)throw done.postCommitErrors[0];
    page.layout=layout;page.specs=nextSpecs;paintBackdrop(page,layout);
    syncGroups(page);
    refresh(page);hover?.sync();
    if(page.active&&priorFocus?.focusedId){
      // A consumed last reroll (or other changed state) can disable the
      // former control. Never restore an ineligible logical focus target.
      const focus=page.records.get(priorFocus.focusedId)?.enabled?priorFocus.focusedId:firstEligible(page);
      if(focus)game.keyboard?.focus(focus,{visible:priorFocus.focusVisible});
    }
    if(page.kind==='title')onTitleLayout?.({portrait:layout.portrait,previewRect:layout.preview,panelRect:layout.panel});
    announceOffer(page);
    publish();
    // A prepared static page may need one more presentation; never repaint it continuously.
    clearTimeout(page.presentTimer);
    page.presentTimer=setTimeout(()=>{if(page.scope.state==='open')game.invalidate();},250);
  }
  function rerender(page) {
    if(!page||page.scope.state!=='open')return;
    if(page.pending)return;
    page.pending=true;
    queue(async()=>{page.pending=false;await render(page);});
  }
  function addGroups(page) {
    if(!semantics)return;
    const groupName=()=>({title:t('title'),cards:t('levelUp'),pause:t('paused'),end:t(page.model.sim?.state==='won'?'victory':'defeat'),
      settings:words('Settings','设置'),help:words('How to play','玩法说明'),failure:words('Could not load the island','玩具岛加载失败')})[page.kind];
    const group=semantics.add({id:page.semanticId,role:'group',describe:()=>({name:groupName(),bounds:page.layout?.panel??box(0,0,1,1),hidden:!page.active})});
    page.scope.use({dispose:()=>group.remove()});
    if(page.kind==='title')for(const [id,key]of [['menu-title-skins','pick'],['menu-title-party','party']]){
      const child=semantics.add({id,role:'radiogroup',parent:page.semanticId,describe:()=>({name:t(key),bounds:page.layout?.panel??box(0,0,1,1)})});
      page.scope.use({dispose:()=>child.remove()});
    }
  }
  function enablePage(page,on) {
    if(page.active===on)return;
    page.active=on;
    if(!on)page.savedFocus=game.keyboard?.getSnapshot().focusedId;
    refresh(page);
    if(on) {
      focusCanvas();
      const focus=page.records.get(page.savedFocus)?.enabled?page.savedFocus:firstEligible(page);
      if(focus)game.keyboard?.focus(focus,{visible:false});
      announceOffer(page);publish();
    }
  }
  async function open(kind,model,layer='page') {
    const id=`jelly-${kind}`;
    let resolveOpened,rejectOpened;
    const opened=new Promise((resolve,reject)=>{resolveOpened=resolve;rejectOpened=reject;});
    const lifetime=stack.open({id,layer,back:layer==='modal'?'close':'none',async open(){
      const scope=game.engine.createScope(),backdrop=scope.use(new Sprite());backdrop.touchEnabled=true;backdrop.touchChildren=false;
      game.stage.addChild(backdrop);
      const page={id,kind,model,scope,backdrop,semanticId:`menu-screen-${kind}`,sources:new Map(),specs:new Map(),
        records:new Map(),groups:new Map(),prepared:new WeakMap(),active:false};
      pages.set(id,page);addGroups(page);
      try {await render(page);}
      catch(cause){pages.delete(id);scope.dispose();rejectOpened(cause);throw cause;}
      return {activate(){enablePage(page,true);resolveOpened(page);},deactivate(){enablePage(page,false);},
        close(){pages.delete(id);clearTimeout(page.presentTimer);scope.dispose();publish();}};
    }},{});
    void lifetime.catch(rejectOpened);
    return opened;
  }
  function switchPage(kind,model) {
    wanted=kind;const revision=++generation;
    if(kind!=='cards'&&offerStatus){offerStatus='';offerStatusBounds=box(0,0,1,1);publish();}
    const present=current();
    if(present?.kind===kind&&kind==='cards'){
      present.model=model;rerender(present);return ready;
    }
    if(present)enablePage(present,false);
    return queue(async()=>{
      if(revision!==generation)return;
      await stack.closeAll();
      if(revision!==generation||!kind)return;
      await open(kind,model);
    });
  }
  function openPopup(kind) {
    if(current()?.kind!=='title')return;
    const page=current();enablePage(page,false);
    queue(async()=>{await open(kind,{},'modal');});
  }
  function closePopup() {
    if(!['settings','help'].includes(current()?.kind))return;
    const page=current();enablePage(page,false);
    queue(async()=>{await stack.back();const title=current();if(title?.kind==='title')await render(title);});
  }
  const removeResize=game.onScreenChange(()=>{
    for(const page of pages.values())rerender(page);
  });
  function handleCommand(command) {
    const page=current();
    if(!wanted)return false;
    if(!page?.active)return true;
    if(command==='menu'||command==='back'){
      if(['settings','help'].includes(page.kind))closePopup();
      else if(page.kind==='pause')page.model.handlers.onResume();
      return true;
    }
    if(page.kind==='cards') {
      if(/^pick[1-3]$/.test(command))page.groups.get('offer')?.control.select(`menu-cards-offer-${command.slice(4)}`);
      else if(command==='reroll'&&page.model.panda.rerolls>0)page.model.handlers.onReroll();
      else if(command==='confirm'){
        game.keyboard?.keyDown({code:'Enter',key:'Enter'});game.keyboard?.keyUp({code:'Enter',key:'Enter'});
      }
      else if(['left','up','right','down','previous','next'].includes(command))game.keyboard?.moveFocus(['left','up','previous'].includes(command)?'previous':'next',true);
      return true;
    }
    if(command==='confirm'){
      game.keyboard?.keyDown({code:'Enter',key:'Enter'});
      game.keyboard?.keyUp({code:'Enter',key:'Enter'});
    } else if(['left','up','right','down','previous','next'].includes(command)) {
      game.keyboard?.moveFocus(['left','up','previous'].includes(command)?'previous':'next',true);
    } else return false;
    refresh(page);return true;
  }
  return {
    stack,get kind(){return wanted?(current()?.kind??wanted):undefined;},get ready(){return ready;},
    showTitle(state,handlers){titleModel={state,handlers};return switchPage('title',titleModel);},
    startPlay(){return switchPage(undefined);},hideTitle(){return switchPage(undefined);},
    showCards(panda,handlers){return switchPage('cards',{panda,handlers});},
    hideCards(){if(wanted==='cards')return switchPage(undefined);},
    showMenu(on,handlers){if(on)return switchPage('pause',{handlers});if(wanted==='pause')return switchPage(undefined);},
    showEnd(sim,handlers){return switchPage('end',{sim,handlers});},
    showFailure(error,reload=()=>location.reload()){return switchPage('failure',{error,reload});},
    setTouchMode(){const p=current();if(p)rerender(p);},
    handleCommand,
    update(){
      const page=current();
      if(page?.active){
        for(const rec of page.records.values())rec.paint();
        const state=game.keyboard?.getSnapshot(), focus=`${state?.focusedId??''}:${state?.focusVisible??false}`;
        if(focus!==lastFocus){lastFocus=focus;publish();}
        const device=getGamepadMode()?'pad':getTouchMode()?'touch':'keys';
        if(lastDevice&&lastDevice!==device)rerender(page);
        lastDevice=device;
      }
    },
    dispose(){if(closed)return;closed=true;removeResize();void stack.closeAll().catch(()=>{});}
  };
}
