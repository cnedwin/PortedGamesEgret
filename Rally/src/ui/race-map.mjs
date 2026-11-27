// Native retained circuit geometry and a fixed pool of racer markers. No map raster or per-frame path drawing.
import { DisplayObjectContainer, Shape } from '@egret/engine';
import { RACERS } from '../data.mjs';

export const MAP_SIZE=168;
export function mapProjection(track,size=MAP_SIZE,pad=6){
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(let i=0;i<track.count;i++){
    minX=Math.min(minX,track.px[i]);maxX=Math.max(maxX,track.px[i]);
    minZ=Math.min(minZ,track.pz[i]);maxZ=Math.max(maxZ,track.pz[i]);
  }
  const zoom=(size-pad*2)/Math.max(1,maxX-minX,maxZ-minZ),
    x=world=>pad+(world-minX)*zoom+(size-pad*2-(maxX-minX)*zoom)/2,
    y=world=>pad+(world-minZ)*zoom+(size-pad*2-(maxZ-minZ)*zoom)/2;
  return {x,y};
}

export function createRaceMinimap(parent,scope,track){
  const root=scope.use(new DisplayObjectContainer()),path=scope.use(new Shape());
  parent.addChild(root);root.addChild(path);
  const {x,y}=mapProjection(track),g=path.graphics;
  // A compact polyline retains the contour at 168 logical units, independently of the 3D track mesh.
  const step=Math.max(1,Math.ceil(track.count/220));
  for(const [width,color,alpha] of [[7.5,0x141820,.8],[4,0xf6efe0,1]]){
    g.lineStyle(width,color,alpha,{caps:'round',joints:'round'}).moveTo(x(track.px[0]),y(track.pz[0]));
    for(let i=step;i<track.count;i+=step)g.lineTo(x(track.px[i]),y(track.pz[i]));
    g.lineTo(x(track.px[0]),y(track.pz[0])).lineStyle(0);
  }
  g.beginFill(0xd8262c).drawRect(x(track.px[0])-1.5,y(track.pz[0])-4.5,3,9).endFill();

  const dots=Array.from({length:RACERS.length},()=>{
    const dot=scope.use(new Shape());dot.visible=false;root.addChild(dot);
    return {dot,racer:-1};
  });
  const arrow=scope.use(new Shape());
  arrow.graphics.lineStyle(1.5,0x2b2522,1,{joints:'round'}).beginFill(0xfff3cb)
    .moveTo(0,7).lineTo(-3.5,-3.5).lineTo(3.5,-3.5).lineTo(0,7).endFill().lineStyle(0);
  arrow.visible=false;root.addChild(arrow);
  let updates=0;
  return {
    root,
    rect(left,top,size){root.x=left;root.y=top;root.scaleX=root.scaleY=size/MAP_SIZE;},
    reset(){for(const {dot} of dots)dot.visible=false;arrow.visible=false;},
    update(game){
      const human=game.human;
      let n=0;
      for(const kart of game.karts){
        if(kart===human||n>=dots.length)continue;
        const entry=dots[n++],{dot}=entry;
        if(entry.racer!==kart.racer){
          entry.racer=kart.racer;
          dot.graphics.clear().lineStyle(1,0x141820,.8).beginFill(RACERS[kart.racer]?.body??0xcccccc)
            .drawCircle(0,0,3).endFill().lineStyle(0);
        }
        dot.x=x(kart.x);dot.y=y(kart.z);dot.visible=true;
      }
      for(;n<dots.length;n++)dots[n].dot.visible=false;
      if(human){
        arrow.x=x(human.x);arrow.y=y(human.z);arrow.rotation=-human.heading*180/Math.PI;arrow.visible=true;
      }else arrow.visible=false;
      updates++;
    },
    info:()=>({trackShapes:1,markerPool:dots.length+1,updates})
  };
}
