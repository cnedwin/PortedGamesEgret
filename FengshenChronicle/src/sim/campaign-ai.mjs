const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function segmentDistance(point,x1,y1,x2,y2){
 const dx=x2-x1,dy=y2-y1,t=Math.max(0,Math.min(1,((point.x-x1)*dx+(point.y-y1)*dy)/Math.max(1,dx*dx+dy*dy)));
 return Math.hypot(point.x-x1-dx*t,point.y-y1-dy*t);
}
/** Geometry shared by live attacks and focused rule tests. A safe circle must
 * contain the complete player's collision disc, including at a ring edge. */
export function forecastHits(point,mark,actorRadius=18){
 if(mark.safeZones?.some(zone=>distance(point,zone)+actorRadius<=zone.radius))return false;
 if(mark.shape==='ring')return distance(point,mark)<=mark.radius+actorRadius&&distance(point,mark)+actorRadius>mark.innerRadius;
 if(mark.shape==='cross'){
  const width=(mark.width??70)/2+actorRadius,r=mark.radius;
  return segmentDistance(point,mark.x-r,mark.y,mark.x+r,mark.y)<=width
   ||segmentDistance(point,mark.x,mark.y-r,mark.x,mark.y+r)<=width;
 }
 return distance(point,mark)<=mark.radius+actorRadius;
}
export function lateBossForecast(state,foe){
 if(foe.kind!=='riverLord'&&foe.kind!=='warMarshal')return null;
 const hero=state.hero,phase=foe.hp/foe.maxHp<=.5?2:1,cycle=(foe.attacks-1)%3;
 const mark={x:hero.x,y:hero.y,radius:68,total:1.05,extra:[],followUps:[],phase};
 if(foe.kind==='riverLord'){
  if(cycle===0)Object.assign(mark,{kind:'tidal-fan',name:'赤潮三叠',hint:'离开三处潮汐落点，向河岸侧移。',
   extra:[{x:hero.x-110,y:hero.y-15,radius:58},{x:hero.x+110,y:hero.y+15,radius:58}]});
  else if(cycle===1)Object.assign(mark,{kind:'undertow',name:'回潮空心阵',hint:'进入首领脚下的青色安全圈，或远离外缘。',
   x:foe.x,y:foe.y,shape:'ring',radius:330,innerRadius:92,total:1.35,safeZones:[{x:foe.x,y:foe.y,radius:92}]});
  else Object.assign(mark,{kind:'channel-tide',name:'潮祭引流',hint:'持续攻击可以打断潮祭；也可先离开落点。',radius:92,total:1.45,
   channeling:true,breakDamage:Math.max(35,foe.maxHp*.045),followUps:[{x:hero.x-95,y:hero.y,radius:65,delay:.48},{x:hero.x+95,y:hero.y,radius:65,delay:.96}]});
 }else{
  if(cycle===0)Object.assign(mark,{kind:'fire-sequence',name:'三烽追爆',hint:'三个落点会依次爆开，沿空隙持续移动。',radius:72,
   followUps:[{x:hero.x-110,y:hero.y,radius:66,delay:.46},{x:hero.x+110,y:hero.y,radius:66,delay:.92},
    ...(phase===2?[{x:hero.x,y:hero.y-110,radius:60,delay:1.38}]:[])]});
  else if(cycle===1)Object.assign(mark,{kind:'siege-cross',name:'十字镇门',hint:'沿斜向进入青色空隙，避开横竖火线。',
   x:foe.x,y:foe.y,shape:'cross',radius:310,width:74,total:1.25,
   safeZones:[{x:foe.x-145,y:foe.y-145,radius:64},{x:foe.x+145,y:foe.y+145,radius:64}]});
  else Object.assign(mark,{kind:'command-channel',name:'镇将军令',hint:'攻击首领打断号令，阻止援军。进入内圈也能避开震波。',
   x:foe.x,y:foe.y,shape:'ring',radius:300,innerRadius:75,total:1.55,channeling:true,breakDamage:Math.max(45,foe.maxHp*.04),
   safeZones:[{x:foe.x,y:foe.y,radius:75}],summon:true});
 }
 mark.skillId=foe.kind+'-'+mark.kind;mark.pattern=mark.kind;mark.total*=phase===2?.88:1;mark.remaining=mark.total;
 return mark;
}
