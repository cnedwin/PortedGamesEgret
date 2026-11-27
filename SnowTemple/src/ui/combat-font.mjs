// A retained finite glyph page for combat counters and captions. Text mesh
// geometry changes when a value changes; no per-frame raster/page upload.
import { createBitmapText, parseBitmapFont } from '@egret/engine/bitmapfont';
import { SNOW_WORDS } from '../i18n.mjs';

const SIZE=48, LINE=64, BASE=50, PAD=4, WIDTH=2048;
const FAMILY='600 '+SIZE+'px "Kaiti SC", "STKaiti", "KaiTi", "Microsoft YaHei UI", "Noto Sans CJK SC", Arial, sans-serif';
const extra='零一二三四五六七八九十上下左右向前进阶第重拨回等狍满壶养气状态关所学过场位置帧率绘制比例灯分块弃陆谦气血枪意破绽领头目金星蓝赤冷却可用按住松开习得当前页恢复行囊上页下页移动施放之中请按键…·—–→←↑↓‹›×：，。！、（）「」　％';
export const combatGlyphs=()=>[...new Set([...Object.keys(SNOW_WORDS).join(''),...Object.values(SNOW_WORDS).join(''),...extra,
  ...Array.from({length:95},(_,i)=>String.fromCharCode(i+32))])].filter(c=>c.codePointAt(0)>=32).sort((a,b)=>a.codePointAt(0)-b.codePointAt(0));

const canvas=(w,h)=>typeof OffscreenCanvas==='function'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});

export async function createCombatFont(host){
  const chars=combatGlyphs(),sample=canvas(1,1).getContext('2d');
  if(!sample)throw Error('Combat glyph metrics unavailable');
  sample.font=FAMILY;
  const digitWidth=Math.ceil(Math.max(...[...'0123456789'].map(c=>sample.measureText(c).width)))+1;
  const entries=[];let x=0,y=0;
  for(const c of chars){
    const m=sample.measureText(c),advance=/^[0-9]$/.test(c)?digitWidth:Math.max(1,Math.ceil(m.width)+1);
    const extra=Math.max(0,Math.ceil((m.actualBoundingBoxLeft??0)+(m.actualBoundingBoxRight??0))-advance);
    const width=advance+PAD*2+extra;
    if(x+width>WIDTH){x=0;y+=LINE;}
    entries.push({c,x,y,width,advance,shift:(advance-m.width)/2});x+=width;
  }
  const height=y+LINE,pageCanvas=canvas(WIDTH,height),pen=pageCanvas.getContext('2d');
  if(!pen)throw Error('Combat glyph texture unavailable');
  pen.font=FAMILY;pen.textAlign='left';pen.textBaseline='alphabetic';pen.lineJoin='round';
  pen.lineWidth=3.5;pen.strokeStyle='rgba(5,8,13,.86)';pen.fillStyle='#fff';
  for(const e of entries){if(e.c===' '||e.c==='　')continue;pen.strokeText(e.c,e.x+PAD+e.shift,e.y+BASE);pen.fillText(e.c,e.x+PAD+e.shift,e.y+BASE);}
  const font=parseBitmapFont({info:{face:'Snow Temple combat',size:SIZE},common:{lineHeight:LINE,base:BASE},pages:['snow-combat-glyphs'],
    chars:entries.map(e=>({id:e.c.codePointAt(0),x:e.x,y:e.y,width:e.c===' '||e.c==='　'?0:e.width,height:e.c===' '||e.c==='　'?0:LINE,xoffset:-PAD,yoffset:0,xadvance:e.advance,page:0}))});
  const page=await host.game.textureFromCanvas(pageCanvas),labels=[];
  let changes=0;
  function label(parent,text='',color=0xe9eef5){
    const mesh=host.scope.use(createBitmapText({font,pages:[page],text:String(text),color,fallback:'?',kerning:false}));
    parent.addChild(mesh.display);labels.push(mesh);
    let box,scale=1;
    function fit(){
      if(!box)return;
      const nominal=box.size/SIZE;
      const maxWidth=box.wrap?Math.max(1,Math.floor(box.w/Math.max(.001,nominal))):undefined;
      if(mesh.maxWidth!==maxWidth)mesh.maxWidth=maxWidth;
      const textAlign=box.wrap?box.align:'left';if(mesh.align!==textAlign)mesh.align=textAlign;
      scale=Math.max(.001,Math.min(nominal,box.w/Math.max(1,mesh.width),box.h/Math.max(1,mesh.height)));
      mesh.display.scaleX=mesh.display.scaleY=scale;
      const renderedWidth=mesh.width*scale;
      mesh.display.x=box.align==='left'?box.x:box.align==='right'?box.x+box.w-renderedWidth:box.x+(box.w-renderedWidth)/2;
      mesh.display.y=box.y+(box.h-mesh.height*scale)/2;
    }
    return {
      root:mesh.display,get text(){return mesh.text;},get missing(){return mesh.layout.missing;},get renderedWidth(){return mesh.width*scale;},
      setText(value){const next=String(value??'');if(next!==mesh.text){mesh.text=next;changes++;fit();}},
      setColor(value){if(value!==mesh.color){mesh.color=value;changes++;}},
      rect(x,y,w,h,size,align='left',wrap=false){box={x,y,w:Math.max(1,w),h:Math.max(1,h),size,align,wrap};fit();},
      show(value){mesh.display.visible=Boolean(value);}
    };
  }
  return {label,info:()=>({glyphs:chars.length,pages:1,atlasWidth:WIDTH,atlasHeight:height,labels:labels.length,geometryChanges:changes,
    missing:labels.reduce((total,l)=>total+(l.display.visible?l.layout.missing:0),0)})};
}
