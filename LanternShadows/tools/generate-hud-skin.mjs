// Generate the original vector HUD paint shapes as a shared PNG atlas.
// Run: node tools/generate-hud-skin.mjs . Uses the existing vendored pngjs;
// no additional build or game runtime dependencies.
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {PNG} from '../vendor/egret/third-party/pngjs/lib/png.js';
import {HUD_SKIN,HUD_SKIN_SIZE} from '../src/hud-skin-layout.mjs';

const {width,height}=HUD_SKIN_SIZE;
const png=new PNG({width,height});
const clamp=(t,low=0,high=1)=>Math.min(high,Math.max(low,t));
const mix=(a,b,t)=>[16,8,0].reduce((n,bit)=>n+(Math.round(((a>>bit)&255)*(1-t)+((b>>bit)&255)*t)<<bit),0);
function sample(stops,t){
  let i=1;while(i<stops.length-1&&t>stops[i][0])i++;
  const [x,c]=stops[i-1],[y,d]=stops[i];return mix(c,d,clamp((t-x)/(y-x)));
}
function raster(name,w,h,paint){
  const rect=HUD_SKIN[name],shapes=[];
  const ink=(color,alpha,test)=>shapes.push({r:(color>>16)&255,g:(color>>8)&255,b:color&255,alpha,test});
  const g={
    circle(x,y,r,color,alpha=1){ink(color,alpha,(px,py)=>(px-x)**2+(py-y)**2<=r*r);},
    ellipse(x,y,w,h,color,alpha=1){const rx=w/2,ry=h/2,cx=x+rx,cy=y+ry;ink(color,alpha,(px,py)=>((px-cx)/rx)**2+((py-cy)/ry)**2<=1);},
    pill(x,y,w,h,color,alpha=1){const r=Math.min(w,h)/2,cx=x+w/2,cy=y+h/2;ink(color,alpha,(px,py)=>Math.max(0,Math.abs(px-cx)-(w/2-r))**2+Math.max(0,Math.abs(py-cy)-(h/2-r))**2<=r*r);}
  };
  paint(g);
  const sub=4,inv=1/(sub*sub);
  for(let y=0;y<rect.height;y++)for(let x=0;x<rect.width;x++){
    let red=0,green=0,blue=0,coverage=0;
    for(let j=0;j<sub;j++)for(let i=0;i<sub;i++){
      const px=(x+(i+.5)/sub)*w/rect.width,py=(y+(j+.5)/sub)*h/rect.height;
      let r=0,b=0,g=0,a=0;
      // Source-over in premultiplied space, then unpremultiply when encoding PNG.
      for(const shape of shapes)if(shape.test(px,py)){
        const t=shape.alpha,l=1-t;r=shape.r*t+r*l;g=shape.g*t+g*l;b=shape.b*t+b*l;a=t+a*l;
      }
      red+=r;green+=g;blue+=b;coverage+=a;
    }
    const off=((rect.y+y)*width+rect.x+x)*4;
    if(coverage>0){
      png.data[off]=Math.round(red/coverage);png.data[off+1]=Math.round(green/coverage);
      png.data[off+2]=Math.round(blue/coverage);png.data[off+3]=Math.round(255*coverage*inv);
    }
  }
}
function peach(name,size){
  raster(name,size,size,g=>{
    const x=size/2,y=size*.56,r=size*.39;
    g.circle(x,y,r+1.3,0x4a251b);
    const stops=[[0,0xe98269],[.50,0xffb496],[1,0xffdbb8]];
    for(let i=0;i<13;i++){const t=i/12;g.circle(x-r*.24*t,y-r*.28*t,r*(1-.79*t),sample(stops,t));}
    g.ellipse(x-1,0,size*.39,size*.23,0x243a28);
    g.ellipse(x+1,1,size*.29,size*.16,0x2b8a55);
  });
}
raster('track',205,100,g=>{
  g.pill(0,0,205,100,0x9a8050);g.pill(2,2,201,96,0x2b170f);g.pill(8,8,189,84,0x3d2417);
});
raster('knob',64,64,g=>{
  const c=32,r=30;
  g.circle(c,c,r,0xffe5aa);g.circle(c,c,r-1.5,0x652a18);g.circle(c,c,r*.78,0x8f3b23);
  g.circle(c,c,r*.55,0xb75a30);g.circle(c,c,r*.25,0xe5a05a);g.circle(c,c,r*.13,0x9d4b29);
});
for(const attack of [false,true])for(const held of [false,true]){
  const name=(attack?'attack':'action')+(held?'Hot':'');
  raster(name,100,100,g=>{
    const c=50,r=100*(attack?.49:.455);
    g.circle(c,c,r,attack?0xe3b455:0xc9a67c);
    g.circle(c,c,r-3,held?0xa45c23:attack?0x95251a:0x321b12);
    if(held)g.circle(c,c,r-7,0xe2b06a,.12);
  });
}
peach('peachSmall',31);peach('peachLarge',47);
const file=fileURLToPath(new URL('../assets/ui/hud-skin.png',import.meta.url));
fs.mkdirSync(fileURLToPath(new URL('../assets/ui/',import.meta.url)),{recursive:true});
fs.writeFileSync(file,PNG.sync.write(png,{colorType:6}));
console.log('Generated native HUD atlas '+width+'x'+height+' ('+fs.statSync(file).size+' bytes)');
