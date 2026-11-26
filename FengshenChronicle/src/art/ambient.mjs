// Ambient animals are presentation only: no rule state, input or collision.
// All frame rasterization runs once when the shared Egret atlas is prepared.
export const AMBIENT_FRAMES=Object.freeze(['dog','hen'].flatMap(kind=>Array.from({length:4},(_,frame)=>Object.freeze({key:`ambient:${kind}:${frame}`,kind,frame,w:kind==='dog'?80:48,h:kind==='dog'?64:42,pivotY:kind==='dog'?54:34}))));

export function paintAmbientFrame(g,sheet,kind,frame=0){
  const col=((Math.floor(frame)%4)+4)%4,row=kind==='hen'?1:0,sw=sheet.width/4,sh=sheet.height/2,
    sx=Math.floor(col*sw),sy=Math.floor(row*sh),ew=Math.floor((col+1)*sw)-sx,eh=Math.floor((row+1)*sh)-sy,
    scale=kind==='hen'?.085:.16,pinX=(col+.5)*sw,pinY=kind==='hen'?795:374;
  g.drawImage(sheet,sx,sy,ew,eh,(sx-pinX)*scale,(sy-pinY)*scale,ew*scale,eh*scale);
}

const animal=(id,kind,speed,phase,points)=>({id,kind,x:points[0][0],y:points[0][1],speed,phase,route:points.map(([x,y])=>({x,y}))});
export function ambientActors(mapId){
  if(mapId==='city')return[
    animal('city-dog-market','dog',22,.1,[[610,650],[665,665],[675,725],[610,720]]),
    animal('city-dog-gate','dog',18,.8,[[1250,700],[1320,710],[1320,770],[1250,760]]),
    animal('city-hen-a','hen',8,.2,[[435,945],[495,942],[510,994],[450,1000]]),
    animal('city-hen-b','hen',7,1.2,[[490,980],[530,950],[570,980],[525,1015]]),
    animal('city-hen-market','hen',9,2.3,[[545,595],[610,605],[615,650],[560,640]])
  ];
  if(mapId==='pass')return[animal('pass-camp-dog','dog',20,.5,[[780,1080],[925,1080],[950,1150],[800,1160]])];
  return[];
}
