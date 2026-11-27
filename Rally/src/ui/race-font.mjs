// A finite bilingual HUD glyph page. Only this texture source is rasterized;
// every changing HUD label uses native BitmapText geometry over the same page.
import { createBitmapText, parseBitmapFont } from '@egret/engine/bitmapfont';
import { ITEMS, TEXT } from '../data.mjs';

const SOURCE_SIZE=64, LINE=88, BASE=68, PAD=5, ATLAS_WIDTH=1024;
const FAMILY='900 '+SOURCE_SIZE+'px Arial, "Microsoft YaHei UI", "PingFang SC", "Noto Sans CJK SC", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
export const glyphText=value=>String(value??'').replace(/\uFE0F/g,'');

export function raceGlyphs() {
  const values=['0123456789:/×!? —.-','◀▶▼★⤴','?'];
  for(const t of Object.values(TEXT)) {
    values.push(t.lap,...t.place,t.go,t.finalLap,t.wrongWay,t.finish,t.kmh,t.coins,
      t.driftBuild,...t.driftTiers,t.driftRelease,...Object.values(t.popups).flat());
  }
  for(const item of Object.values(ITEMS))values.push(item.icon,item.name.zh,item.name.en);
  return [...new Set([...glyphText(values.join(''))])].sort((a,b)=>a.codePointAt(0)-b.codePointAt(0));
}

function sourceCanvas(width,height) {
  // Detached source for a single leased texture, never a page/overlay canvas.
  if(typeof OffscreenCanvas==='function')return new OffscreenCanvas(width,height);
  return Object.assign(document.createElement('canvas'),{width,height});
}

export async function createRaceFont(host) {
  const chars=raceGlyphs(),icons=new Map(Object.values(ITEMS).map(v=>[glyphText(v.icon),v.icon]));
  const measure=sourceCanvas(1,1).getContext('2d');
  if(!measure)throw Error('HUD glyph raster context unavailable');
  measure.font=FAMILY;
  const digitAdvance=Math.ceil(Math.max(...[...'0123456789'].map(ch=>measure.measureText(ch).width)))+1;
  const entries=[];let x=0,y=0;
  for(const ch of chars){
    const ink=icons.get(ch)??ch,m=measure.measureText(ink),
      advance=/^[0-9]$/.test(ch)?digitAdvance:Math.max(1,Math.ceil(m.width)+1),
      extra=Math.max(0,Math.ceil((m.actualBoundingBoxLeft||0)+(m.actualBoundingBoxRight||0))-advance),
      width=Math.max(advance+2*PAD+extra,2*PAD+1);
    if(x+width>ATLAS_WIDTH){x=0;y+=LINE;}
    const shift=(advance-m.width)/2;
    entries.push({ch,ink,x,y,width,advance,shift});
    x+=width;
  }
  const height=y+LINE;
  const atlas=sourceCanvas(ATLAS_WIDTH,height),pen=atlas.getContext('2d');
  if(!pen)throw Error('HUD glyph atlas context unavailable');
  pen.font=FAMILY;pen.textBaseline='alphabetic';pen.textAlign='left';
  pen.lineJoin='round';pen.lineWidth=5;pen.strokeStyle='rgba(18,20,27,.87)';pen.fillStyle='#fff';
  for(const g of entries){
    if(g.ch===' ')continue;
    const dx=g.x+PAD+g.shift,dy=g.y+BASE;
    // Colour emoji are baked once; the native bitmap tint is white on item icons.
    if(!icons.has(g.ch))pen.strokeText(g.ink,dx,dy);
    pen.fillText(g.ink,dx,dy);
  }
  const font=parseBitmapFont({
    info:{face:'Jinxiu HUD',size:SOURCE_SIZE},common:{lineHeight:LINE,base:BASE},
    pages:['rally-hud-glyphs'],chars:entries.map(g=>({id:g.ch.codePointAt(0),x:g.x,y:g.y,
      width:g.ch===' '?0:g.width,height:g.ch===' '?0:LINE,xoffset:-PAD,yoffset:0,xadvance:g.advance,page:0}))
  });
  const page=await host.game.textureFromCanvas(atlas);
  let labels=0,changes=0;
  function label(parent,text='',color=0xf6efe0){
    const value=host.scope.use(createBitmapText({font,pages:[page],text:glyphText(text),color,fallback:'?',kerning:false}));
    parent.addChild(value.display);
    labels++;
    let box,scale=1;
    const fit=()=>{
      if(!box)return;
      const natural=box.size/SOURCE_SIZE, s=Math.min(natural,box.w/Math.max(1,value.width),box.h/Math.max(1,value.height));
      scale=Math.max(.001,s);
      value.display.scaleX=value.display.scaleY=scale;
      const drawWidth=value.width*scale;
      value.display.x=box.align==='left'?box.x:box.align==='right'?box.x+box.w-drawWidth:box.x+(box.w-drawWidth)/2;
      value.display.y=box.y+(box.h-value.height*scale)/2;
    };
    return {
      root:value.display,
      get text(){return value.text;},get width(){return value.width*scale;},
      get missing(){return value.layout.missing;},
      setText(text){const next=glyphText(text);if(next!==value.text){value.text=next;changes++;fit();}},
      setColor(color){if(color!==value.color){value.color=color;changes++;}},
      rect(x,y,w,h,size,align='center'){box={x,y,w,h,size,align};fit();},
      show(visible){value.display.visible=visible;}
    };
  }
  return {label,info:()=>({glyphs:chars.length,atlasWidth:ATLAS_WIDTH,atlasHeight:height,pages:1,labels,geometryChanges:changes})};
}
