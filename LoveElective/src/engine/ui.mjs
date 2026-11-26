// Native Egret views own interactive parts, text and focus. Canvas artwork is decoration only.
import { W, H } from './stage.mjs';
import { rrect, rgba, shade, heart, star, poly } from '../art/draw.mjs';
import { Sprite } from '@egret/engine';
import { createHoverControl } from '@egret/engine/ui';
import { createBrowserHoverInput } from '@egret/engine/web/hover';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { describePaintedHit } from './ui-semantics.mjs';

export const FONT = '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", system-ui, sans-serif';
export const SERIF = '"Noto Serif SC", "Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", "STSong", Georgia, serif';

export const THEME = {
  ink: '#27263d', soft: '#575469', faint: '#736f83', line: '#e2d9e0',
  paper: '#fff9ee', canvas: '#181627', night: '#211c32', light: '#fff9ef',
  pink: '#e97984', rose: '#ab3656', violet: '#6554a6', sky: '#426c93',
  gold: '#a07135', mint: '#397e6c', warn: '#b85c3e',
};

/** Break text into lines no wider than maxW: CJK may break anywhere, Latin words stay whole. */
export function wrapText(g, text, maxW) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    const tokens = para.match(/[A-Za-z0-9'’\-.,!?;:"“”()…~→%¥+]+\s*|\s+|./gu) ?? [''];
    let line = '';
    for (const token of tokens) {
      if (line && g.measureText(line + token.trimEnd()).width > maxW) {
        lines.push(line.trimEnd());
        line = token.trimStart();
      } else line += token;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

const rgb = (value, fallback = 0x27263d) => {
  if (Number.isInteger(value)) return value;
  const hex = String(value).match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)?.[1];
  if (hex) return Number.parseInt(hex.length === 3 ? [...hex].map(c=>c+c).join('') : hex.slice(0,6), 16);
  const rgba = String(value).match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  return rgba ? Number(rgba[1])*65536+Number(rgba[2])*256+Number(rgba[3]) : fallback;
};
const SKIN = {text:0x27263d,panel:0xfff9ee,panelAlpha:1,button:0xfffbf3,buttonText:0x27263d,
  disabled:0x968c9b,accent:0xf5bb81,track:0xe2d9e0,radius:10,size:18,dim:.22};
const rect = (x,y,w,h) => ({x,y,width:Math.max(.5,w),height:Math.max(.5,h)});

/** Drawing helpers bound to one panel's canvas. */
export class Painter {
  constructor(g, panel) {
    this.g = g;
    this.panel = panel;
  }

  font(size, weight = 500, family = FONT) {
    this.g.font = `${weight} ${size}px ${family}`;
  }

  /** Draw text; returns the height used. opt: size, weight, color, align, maxW, lineH, family, shadow. */
  text(str, x, y, { size = 18, weight = 500, color = THEME.ink, align = 'left', maxW, lineH, family, stroke, alpha = 1 } = {}) {
    const g = this.g;
    this.font(size, weight, family);
    g.textAlign = align;
    g.textBaseline = 'top';
    const lines = maxW ? wrapText(g, str, maxW) : String(str).split('\n');
    const lh = lineH ?? Math.round(size * 1.45);
    const width = Math.max(0, ...lines.map(line => g.measureText(line).width));
    this.panel.words.push({ text: String(str), x: x - (align === 'center' ? width / 2 : align === 'right' ? width : 0), y, w: width, h: lines.length * lh, size });
    lines.forEach((line, i) => {
      if (!line) return;
      const width = Math.max(6, (maxW ?? g.measureText(line).width) * 1.12 + 6);
      const left = x - (align === 'center' ? width / 2 : align === 'right' ? width : 0);
      const name = this.panel.partName('text');
      this.panel.parts.push({type:'text',name,...rect(left,y+i*lh,width,Math.max(lh,size*1.28)),
        text:line,size,color:rgb(color),bold:weight>=650,align});
      if(alpha!==1)this.panel.alphas.set(name,alpha);
    });
    return lines.length * lh;
  }

  measure(str, size, weight = 500, family) {
    this.font(size, weight, family);
    return this.g.measureText(str).width;
  }

  /** A raised paper surface. */
  card(x, y, w, h, { r = 14, fill = rgba(THEME.paper, 0.97), stroke = THEME.line, shadow = 0.16, lineW = 1.25 } = {}) {
    const g = this.g;
    const p = rrect(x, y, w, h, Math.min(r, 18));
    g.save();
    if (shadow) {
      g.shadowColor = rgba(THEME.night, shadow);
      g.shadowBlur = 22;
      g.shadowOffsetY = 8;
    }
    g.fillStyle = fill;
    g.fill(p);
    g.restore();
    if (stroke) {
      g.lineWidth = lineW;
      g.strokeStyle = stroke;
      g.stroke(p);
    }
  }

  /** Full panel with a warm paper surface and a structured top edge. */
  sheet(x, y, w, h, { accent = THEME.rose, dark = false } = {}) {
    const g = this.g;
    const wash = g.createLinearGradient(x, y, x + w * .75, y + h);
    wash.addColorStop(0, dark ? '#302641' : '#fffbf1');
    wash.addColorStop(1, dark ? '#201a31' : '#f3ebed');
    this.card(x, y, w, h, { fill: wash, stroke: dark ? '#5b4a64' : '#e9d9dc', shadow: .28, r: 16 });
    g.save();
    g.clip(rrect(x, y, w, h, 16));
    g.fillStyle = this.gradient(x, Math.min(210, w * .5), accent, rgba(accent, 0));
    g.fillRect(x, y, w, 3);
    g.restore();
  }

  /** A recessed well for item art, lit from above. */
  well(x, y, w, h, { active = false, accent = THEME.violet } = {}) {
    const g = this.g;
    const fill = g.createRadialGradient(x + w * .52, y + h * .38, 6, x + w * .5, y + h * .52, w * .72);
    fill.addColorStop(0, active ? '#fff8ef' : '#fffbf3');
    fill.addColorStop(1, rgba(accent, active ? .14 : .09));
    this.card(x, y, w, h, { fill, shadow: 0, stroke: active ? rgba(accent, .36) : '#e7dee6', r: 10 });
  }

  /** Shared segmented control used in the wardrobe and phone. */
  segment(x, y, w, h, label, on, tap, { size = 16 } = {}) {
    this.panel.control(x,y,w,h,tap,{label,role:'button',selected:Boolean(on),type:'button',
      color:on?0x34304c:0xede5eb,textColor:on?0xfff9ef:0x575469,size,border:{color:on?0xdca0b5:0xe2d9e0,width:1}});
  }
  /** Left-to-right gradient fill for accents. */
  gradient(x, w, a = THEME.pink, b = THEME.violet) {
    const gr = this.g.createLinearGradient(x, 0, x + w, 0);
    gr.addColorStop(0, a);
    gr.addColorStop(1, b);
    return gr;
  }

  /** Register a tappable rectangle; tap(x, y) receives where inside it the tap landed. */
  hit(x, y, w, h, tap, { hover = true, r = 12, label, role = 'button', selected, disabled = false } = {}) {
    const hit={x,y,w,h,tap,hover,r,disabled};
    this.panel.control(x,y,w,h,tap,{type:'panel',role:'button',label:label??describePaintedHit(this.panel.words,hit,this.g.fillStyle),
      selected,disabled,coordinate:!hover});
  }

  /** Native buttons use the original warm-paper, rose and dark palette. */
  button(x, y, w, h, label, tap, { kind = 'plain', disabled = false, size = 18, sub, icon, r = 10, color, accessibleName } = {}) {
    const fill=kind==='primary'?rgb(color?shade(color,-.17):'#a93758'):kind==='dark'?0x322d48:kind==='ghost'?0x3b304c:0xfffbf3;
    const ink=kind==='plain'?0x27263d:0xfff9ef;
    const display=icon?icon+'  '+label:label;
    this.panel.control(x,y,w,h,tap,{type:'button',label:accessibleName??(sub?label+' · '+sub:label),display,
      disabled,color:fill,textColor:ink,size:sub?Math.min(size,h*.32):size,
      border:{color:kind==='primary'?0xdca0b5:kind==='ghost'?0xa18196:0xdfd4df,width:1}});
    if(sub)this.text(sub,x+w/2,y+h*.68,{size:Math.min(size*.68,Math.max(10,h*.23)),weight:500,
      color:kind==='plain'?'#575469':'#f2dce0',align:'center',maxW:w-14,lineH:Math.max(13,size*.83)});
  }
  /** A small rounded label. */
  chip(str, x, y, { color = THEME.violet, size = 13, ink = '#ffffff', padX = 10, h = 24 } = {}) {
    const w = this.measure(str, size, 700) + padX * 2;
    this.g.fillStyle = color;
    this.g.fill(rrect(x, y, w, h, Math.min(7, h / 2)));
    this.text(str, x + w / 2, y + (h - size * 1.25) / 2, { size, weight: 700, color: ink, align: 'center' });
    return w;
  }

  /** Progress bar from 0 to max. */
  bar(x, y, w, h, value, max, { color = THEME.pink } = {}) {
    this.panel.parts.push({type:'bar',name:this.panel.partName('bar'),...rect(x,y,w,h),
      value:Math.max(0,Math.min(1,max?value/max:0)),color:rgb(color)});
  }
  heart(x, y, s, color = THEME.rose) {
    this.g.fillStyle = color;
    this.g.fill(heart(x, y, s));
  }
  star(x, y, s, color = THEME.gold) {
    this.g.fillStyle = color;
    this.g.fill(star(x, y, s, s * 0.45));
  }

  /** Section heading with a small editorial rule. */
  title(str, x, y, { size = 29, color = THEME.ink } = {}) {
    this.panel.label ??= String(str);
    this.text(str, x, y, { size, weight: 750, family: SERIF, color });
    const base = y + size * 1.34;
    this.g.fillStyle = THEME.rose;
    this.g.fill(poly([[x, base], [x + 3, base - 3], [x + 6, base], [x + 3, base + 3]]));
    this.g.fillStyle = this.gradient(x + 11, 50, '#bd637e', rgba('#bd637e', 0));
    this.g.fillRect(x + 11, base - .5, 52, 1);
  }

  /** Draw another canvas (a portrait, an icon) into the panel, optionally inside a rounded frame. */
  image(source, x, y, w, h, { r = 0, sx, sy, sw, sh } = {}) {
    const g = this.g;
    g.save();
    if (r) g.clip(rrect(x, y, w, h, r));
    if (sw) g.drawImage(source, sx, sy, sw, sh, x, y, w, h);
    else g.drawImage(source, x, y, w, h);
    g.restore();
  }
}


/**
 * A panel has a stable display container for the illustrated backing and existing scene animation.
 * Its corresponding native view owns every word, button, bar, focus and pointer activation.
 * Mounting both under the view also keeps modal dimming, art and controls in the same order.
 */
export class Panel {
  constructor(ui, { x = 0, y = 0, w = W, h = H, res = 1.25, parent, modal = false, title }) {
    Object.assign(this,{ui,w,h,res,modal,title,parentRef:parent??ui.layer,enabled:true});
    this.id='love'+(++ui.serial);
    this.pic=ui.stage.pic(this.parentRef);
    this.node=this.pic.node;
    this.node.x=x;this.node.y=y;
    this.nativeLineHandles=new Set();
    ui.panels.push(this);
  }
  partName(kind) { return this.id+'-'+kind+'-'+(this.counts[kind]=(this.counts[kind]??0)+1); }
  active() {return this.enabled&&!this.closed&&!this.ui.locked&&this.node.visible;}
  activation(w,h,fn,event) {
    if(!this.active()||!fn)return;
    const lx=Number.isFinite(event.localX)?Math.max(0,Math.min(w,event.localX)):w/2;
    const ly=Number.isFinite(event.localY)?Math.max(0,Math.min(h,event.localY)):h/2;
    event.stopPropagation();
    this.ui.onTap?.();
    fn(lx,ly);
  }
  pointerInside(event) {
    if(!Number.isFinite(event.stageX)||!Number.isFinite(event.stageY))return null;
    try{return this.node.globalToLocal(event.stageX,event.stageY);}catch{return null;}
  }
  inside(p) {return p&&p.x>=0&&p.y>=0&&p.x<=this.w&&p.y<=this.h;}
  control(x,y,w,h,tap,options) {
    const name=this.partName('control'), box=rect(x,y,w,h), opts=options??{};
    this.controlBoxes.push({...box,name,hover:!opts.disabled&&!opts.coordinate});
    const words=String(opts.label??opts.display??'');
    // Ordinary button roles cannot publish a selected field. Keep the visual
    // segment unchanged, and speak the chosen state in its native label.
    const label=opts.selected?words+(document.documentElement.lang==='en'?' · Selected':' · 已选'):words;
    if(opts.type==='button'){
      this.parts.push({type:'button',name,...box,text:String(opts.display??opts.label??''),size:opts.size??18,
        color:opts.color??SKIN.button,textColor:opts.textColor??SKIN.buttonText,...(opts.border?{border:opts.border}:{})});
      this.bind[name]={label:()=>label,disabled:()=>Boolean(opts.disabled)||!this.active(),tap:(_state,event)=>this.activation(w,h,tap,event)};
    }else{
      this.parts.push({type:'panel',name,...box,...(!opts.coordinate?{role:'button'}:{}),children:[]});
      // A painted illustration remains the visual for this target; Egret supplies the actual hit and focus.
      this.bind[name]={label:()=>label,disabled:()=>Boolean(opts.disabled)||!this.active(),tap:(_state,event)=>this.activation(w,h,tap,event),...(opts.coordinate?{pointerOnly:true}:{})};
    }
  }
  clearHover() {
    for(const {name,handle,glow} of this.hoverControls??[]){
      handle.dispose();
      this.ui.hovered.delete(name);
      glow.parent?.removeChild(glow);
      if(!glow.isDisposed)glow.dispose();
    }
    this.hoverControls=[];
    this.ui.updateCursor();
  }
  attachHover(view) {
    this.clearHover();
    for(const {name,width,height,hover} of this.controlBoxes){
      if(!hover)continue;
      const target=view.get(name),glow=new Sprite();
      glow.touchEnabled=false;glow.visible=false;
      glow.graphics.beginFill(0xffffff,.13).drawRoundRect(0,0,width,height,Math.min(16,height)).endFill();
      target.addChild(glow);
      const handle=createHoverControl({hover:this.ui.hover,target,onHoverChange:value=>{
        const active=value&&this.active();
        glow.visible=active;
        if(active)this.ui.hovered.add(name);else this.ui.hovered.delete(name);
        this.ui.updateCursor();
      }});
      this.hoverControls.push({name,handle,glow});
    }
    this.ui.hover.sync?.();
  }
  unmount() {
    if(!this.view)return;
    this.clearHover();
    // Detach the stable art/animation container before disposing the native view's transient parts.
    this.oldFocus=this.view.focused;
    const shell=this.shell, screen=this.screenNode;
    if(shell?.parent===this.node&&screen&&!screen.isDisposed)screen.addChild(shell);
    if(this.node.parent)this.node.parent.removeChild(this.node);
    if(this.proxy?.parent)this.proxy.parent.removeChild(this.proxy);
    if(this.proxy&&!this.proxy.isDisposed)this.proxy.dispose();
    this.view.close();
    this.view=null;this.proxy=null;this.shell=null;this.screenNode=null;
  }
  syncTransform() {
    if(!this.proxy||!this.screenNode||this.parentRef.isDisposed)return;
    // Campus pins parallax with their authored parent; the native controls follow exactly the same transform.
    const from=(x,y)=>{
      const a=this.parentRef.localToGlobal(x,y);
      return this.screenNode.globalToLocal(a.x,a.y);
    };
    const a=from(0,0),b=from(1,0),c=from(0,1);
    this.proxy.x=a.x;this.proxy.y=a.y;
    this.proxy.scaleX=Math.hypot(b.x-a.x,b.y-a.y);
    this.proxy.scaleY=Math.hypot(c.x-a.x,c.y-a.y);
    this.proxy.rotation=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
    this.proxy.visible=this.parentRef.visible;
  }
  mount(view) {
    const screen=view.get(this.id+'-screen'), shell=view.get(this.id+'-surface');
    if(this.proxy?.parent&&this.proxy.parent!==screen){
      this.proxy.parent.removeChild(this.proxy);
      if(!this.proxy.isDisposed)this.proxy.dispose();
      this.proxy=null;
    }
    if(!this.proxy)this.proxy=new Sprite();
    screen.addChild(this.proxy);
    this.proxy.addChild(this.node);
    this.node.addChild(shell);
    shell.x=shell.y=0;
    this.screenNode=screen;this.shell=shell;
    this.syncTransform();
    for(const [name,alpha] of this.alphas)view.get(name).alpha=alpha;
    this.attachHover(view);
  }
  paint(draw) {
    if(this.closed)return this;
    this.unmount();
    this.parts=[];this.bind={};this.words=[];this.counts={};this.alphas=new Map();this.controlBoxes=[];
    this.label=this.title;
    const canvas=this.ui.stage.canvas(this.w,this.h,this.res,g=>draw(new Painter(g,this)));
    this.pic.show(canvas,canvas.res);
    const surface={type:'panel',name:this.id+'-surface',...rect(0,0,this.w,this.h),children:this.parts};
    if(this.modal||this.solid||this.blank)this.bind[surface.name]={pointerOnly:true,tap:(_state,event)=>{
      // A blank surface is not an additional control activation.
      const p=this.pointerInside(event);
      if(this.active()&&this.inside(p)&&!this.controlBoxes.some(b=>p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height))this.blank?.();
    }};
    const screen={type:'panel',name:this.id+'-screen',...rect(0,0,W,H),children:[surface]};
    if(this.modal)this.bind[screen.name]={pointerOnly:true,tap:(_state,event)=>{
      // Only a press outside the illustration dismisses the modal.
      const p=this.pointerInside(event);
      if(this.active()&&p&&!this.inside(p))this.dismiss?.();
    }};
    const description={label:this.label??'Love Elective',area:'screen',modal:this.modal,skin:SKIN,root:screen};
    // Repaint is a new native view with the same part IDs. Retain focus where the part still exists.
    this.view=this.ui.stage.native.show(description,{
      bind:this.bind,built:view=>this.mount(view),
      ...(this.modal?{dismiss:()=>{if(this.active()&&this.dismiss)this.dismiss();else this.ui.keys?.('Escape');}}:{})
    });
    if(this.oldFocus&&this.parts.some(p=>p.name===this.oldFocus)){
      try{this.view.focus(this.oldFocus);}catch{}
    }
    return this;
  }
  /** Native retained text nodes, clipped per line for the original dialogue typewriter. */
  nativeLines(lines,{x,y,width,size,lineH,color,weight}) {
    const native=this.ui.stage.native, group=new Sprite(), lineGroups=[];
    this.node.addChild(group);group.x=x;group.y=y;
    for(let i=0;i<lines.length;i++){
      const row=new Sprite();
      group.addChild(row);row.y=i*lineH;
      const text=native.text(lines[i],{layer:row,size,color:rgb(color),bold:weight>=650,baseline:'top'});
      row.clipRect={x:0,y:0,width:1,height:lineH+8};row.visible=false;
      lineGroups.push({row,text});
    }
    const id=this.id+'-dialogue-'+this.ui.serial++;
    let closed=false;
    const semantic=this.ui.semantics.add({id,role:'text',describe:()=>{
      const a=group.localToGlobal(0,0),b=group.localToGlobal(width,lines.length*lineH);
      return {name:lines.join(' '),hidden:closed||!this.node.visible||this.node.alpha<.01,
        bounds:{x:a.x,y:a.y,width:Math.max(1,b.x-a.x),height:Math.max(1,b.y-a.y)}};
    }});
    const handle={
      reveal:(line,pixels)=>{
        if(closed)return;
        lineGroups.forEach(({row},i)=>{
          row.visible=i<line||(i===line&&pixels>0);
          row.clipRect={x:0,y:0,width:i<line?width+20:Math.max(1,pixels),height:lineH+8};
        });
      },
      showAll:()=>handle.reveal(lines.length,width+20),
      close:()=>{
        if(closed)return;closed=true;
        semantic.remove();
        for(const {text} of lineGroups)native.remove(text);
        group.parent?.removeChild(group);group.dispose();
        this.nativeLineHandles.delete(handle);
      }
    };
    this.nativeLineHandles.add(handle);
    return handle;
  }
  close() {
    if(this.closed)return;this.closed=true;
    for(const handle of [...this.nativeLineHandles])handle.close();
    this.unmount();
    const i=this.ui.panels.indexOf(this);
    if(i>=0)this.ui.panels.splice(i,1);
    this.pic.destroy();
  }
}

/** The native view manager owns activation and focus; game shortcuts and coordinate dye input are adapters only. */
export function createUI(stage,layer) {
  const ui={stage,layer,panels:[],serial:0,background:null,keys:null,locked:0,
    semantics:stage.semantics};
  const canvas=stage.canvasElement;
  // Hover is another native input authority on the same host, not a game-side hit router.
  ui.hovered=new Set();
  ui.updateCursor=()=>{canvas.style.cursor=ui.hovered.size?'pointer':'default';};
  ui.hover=createBrowserHoverInput({canvas,engine:stage.engine,scope:stage.native.browser.scope,width:W,height:H,onError:stage.fail});
  stage.on('up',(x,y)=>{if(!ui.locked&&x>=0)ui.background?.(x,y);});
  stage.on('key',(key,event)=>{if(!ui.locked)ui.keys?.(key,event);});
  stage.onTick(()=>{
    for(const panel of ui.panels)panel.syncTransform();
  });
  ui.panel=options=>new Panel(ui,options);
  ui.projection=createBrowserSemantics({semantics:stage.semantics,canvas,width:W,height:H,onError:stage.fail});
  ui.point=name=>{
    const nodes=ui.semantics.publish().nodes;
    const node=[...nodes].reverse().find(n=>(n.id===name||n.name===name||n.id.endsWith(':'+name))&&!n.hidden&&!n.inert&&n.bounds.width>0&&n.bounds.height>0);
    if(!node)return null;
    const b=node.bounds,r=canvas.getBoundingClientRect();
    return {x:r.left+(b.x+b.width/2)*r.width/W,y:r.top+(b.y+b.height/2)*r.height/H};
  };
  return ui;
}
