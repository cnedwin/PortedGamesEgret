// A static terrain illustration, rasterized once per actual terrain version.
// It is not a separate UI canvas: the pixels are an ordinary native bitmap.
import {BOARD,boardPoint,terrainLift} from './battle-board-layout.mjs';
export const TERRAIN_COLOURS={plain:0xbeac81,grass:0xa2aa76,road:0xd9bd81,forest:0x718568,hill:0xa99470,mountain:0x858176,river:0x76a7a2,water:0x4c8588,marsh:0x849b7a,wall:0xaa9f88,gate:0x9d7b53,town:0xc2b290,camp:0xb5a078,ship:0x7f8d7c};
const css=n=>'#'+n.toString(16).padStart(6,'0');
function polygon(ctx,points,fill,stroke=null,width=.7){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill!=null){ctx.fillStyle=css(fill);ctx.fill()}if(stroke!=null){ctx.strokeStyle=css(stroke);ctx.lineWidth=width;ctx.stroke()}}
function hex(ctx,x,y,color,stroke=0x665d43){polygon(ctx,Array.from({length:6},(_,i)=>{const t=(i*60-30)*Math.PI/180;return [x+19.05*Math.cos(t),y+19.05*Math.sin(t)]}),color,stroke);}
function tri(ctx,x,y,w,h,color){polygon(ctx,[[x-w,y],[x,y-h],[x+w,y]],color);}
function line(ctx,points,color,width=1,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=css(color);ctx.lineWidth=width;ctx.stroke();ctx.restore();}
function rect(ctx,x,y,w,h,color,stroke=null){ctx.fillStyle=css(color);ctx.fillRect(x,y,w,h);if(stroke!=null){ctx.strokeStyle=css(stroke);ctx.lineWidth=.7;ctx.strokeRect(x,y,w,h)}}
export const canPaintBoardSurface=()=>typeof globalThis.OffscreenCanvas==='function'||typeof globalThis.document?.createElement==='function';
export function paintBoardSurface(tiles,{density=1.5,thumbnail=false,units=[]}={}){
 const width=Math.round(BOARD.width*density),height=Math.round(BOARD.height*density),canvas=typeof globalThis.OffscreenCanvas==='function'?new OffscreenCanvas(width,height):globalThis.document?.createElement('canvas');if(!canvas)throw Error('Static board texture unavailable');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Static board texture unavailable');ctx.scale(density,density);rect(ctx,0,0,BOARD.width,BOARD.height,0x4b5744);
 for(let at=0;at<tiles.length;at++){const tile=tiles[at],p=boardPoint(at),x=p.x,y=p.y-(thumbnail?0:terrainLift(tile));if(!thumbnail)hex(ctx,x,p.y+3,0x555540,0x555540);hex(ctx,x,y,TERRAIN_COLOURS[tile]??TERRAIN_COLOURS.plain);
   if(thumbnail)continue;line(ctx,[[x-10,y-3],[x-6,y-3]],0x5f6249,1,.35);line(ctx,[[x+8,y+5],[x+12,y+5]],0x5f6249,1,.35);
   if(tile==='forest'){for(const [dx,dy]of [[-8,5],[7,7],[0,-1]]){tri(ctx,x+dx,y+dy,6,16,0x365847);tri(ctx,x+dx,y+dy-5,5,14,0x6b865a);}}
   else if(tile==='hill'||tile==='mountain'){tri(ctx,x-6,y+9,10,tile==='hill'?12:25,0x65716b);tri(ctx,x+8,y+9,9,tile==='hill'?8:17,0x889287);}
   else if(tile==='water'||tile==='river'||tile==='ship')line(ctx,[[x-12,y],[x-4,y-2],[x+4,y],[x+11,y-2]],0xd9eadb,1,.5);
   else if(tile==='wall'||tile==='gate'){rect(ctx,x-13,y-5,26,10,0xbfb69d,0x5c615a);for(let i=-10;i<=10;i+=6)rect(ctx,x+i,y-9,4,4,0xbfb69d);}
   else if(tile==='camp')tri(ctx,x,y+8,12,17,0xe0c18b);else if(tile==='town'){rect(ctx,x-11,y-3,22,12,0xe1c9a0);tri(ctx,x,y-3,13,10,0x476361);}
 }
 if(thumbnail)for(const u of units){const x=boardPoint(u.pos);ctx.beginPath();ctx.arc(x.x,x.y,12,0,Math.PI*2);ctx.fillStyle=css(u.side?0x9d543e:0x51768c);ctx.fill();ctx.lineWidth=3;ctx.strokeStyle=css(0xffe9b5);ctx.stroke()}
 return canvas;
}