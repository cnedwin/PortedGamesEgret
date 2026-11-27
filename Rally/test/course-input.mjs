// A read-only driving policy for browser acceptance, not an input mode of the game.
// The actual driver sends the normal steering, throttle and brake keys.
export function senseCourse(rally,collect=false,plan={}){
 const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v)),angle=x=>Math.atan2(Math.sin(x),Math.cos(x));
 const {race}=rally,{human:car,track}=race,ahead=8.5+Math.max(0,car.speed)*.37,center=track.sample(car.s+ahead,0,{}),half=track.halfWidth[center.index];
 let lane=0;for(const lion of track.lions){const gap=track.delta(car.s,lion.s),offset=lion.lateral;if(gap < -3||gap>31||Math.abs(offset)>4)continue;lane+=clamp((31-gap)/16,0,1)*clamp((gap+3)/6,0,1)*(offset>.5?-1:1)*(lion.radius+2.5);}
 for(const mud of track.mud){const gap=track.delta(car.s,mud.s);if(gap>=0&&gap<18&&Math.abs(mud.lateral-lane)<mud.radius)lane+=.6*(mud.lateral>=lane?-1:1)*(1-gap/18);}
 let boxTarget=null,boxGap=null;
 if(collect&&!car.item&&car.roulette<=0){
   const gap=b=>track.delta(car.s,b.s);
   // Keep a single collision target instead of chasing whichever box is
   // nearest on each frame. Slow down in time for its precise position.
   boxTarget=race.boxes.find(b=>b.index===plan.boxIndex&&gap(b)>=-1&&gap(b)<160)??null;
   if(!boxTarget){const boxes=race.boxes.filter(b=>gap(b)>=3&&gap(b)<160).sort((a,b)=>gap(a)-gap(b));if(boxes.length){const first=boxes[0];const row=boxes.filter(b=>Math.abs(b.s-first.s)<.01).sort((a,b)=>(a.timer>0)-(b.timer>0)||Math.abs(a.lateral-car.lateral)-Math.abs(b.lateral-car.lateral));boxTarget=row[0];plan.boxIndex=boxTarget.index;}}
   if(boxTarget){boxGap=gap(boxTarget);lane=boxTarget.lateral;}
 }
 lane=clamp(lane,-half+2.25,half-2.25);const point=boxTarget&&boxGap<28?boxTarget:track.sample(car.s+ahead,lane,{}),error=angle(Math.atan2(point.x-car.x,point.z-car.z)-car.heading);let turn=0;
 for(let d=10;d<=Math.max(40,car.speed*1.7);d+=5)turn=Math.max(turn,Math.abs(track.curvature[track.sample(car.s+d,0,{}).index]));
 let desired=clamp(Math.sqrt(20/Math.max(.004,turn)),16,38);const severity=Math.abs(error),recover=severity>1.05||Math.abs(car.lateral)>half+.5;
 // Item boxes are genuinely collected by the car's collision circle. Slow
 // near the next row / let used boxes respawn, and allow the actual roulette
 // to finish before crossing the line. Do not write the item or race state.
 if(boxTarget){desired=Math.min(desired,boxGap<12?4:boxGap<30?7:boxGap<85?11:20);if(boxTarget.timer>0&&boxGap<12&&boxGap>2.5)desired=0;}
 if(collect&&car.roulette>0)desired=Math.min(desired,6);
 const cap=recover?Math.min(15,desired):desired;
 return{time:race.time,stage:race.state,s:car.s,length:track.length,lap:car.lap,laps:race.laps,place:car.place,finished:car.finished,speed:car.speed,turn:severity<.044?0:-Math.sign(error),throttle:car.speed<cap,brake:car.speed>cap+(collect?2.5:4),lateral:car.lateral,error,item:car.item,itemCount:car.itemCount,roulette:car.roulette,boxTarget:boxTarget&&{index:boxTarget.index,s:boxTarget.s,x:boxTarget.x,z:boxTarget.z,lateral:boxTarget.lateral,timer:boxTarget.timer,gap:boxGap,distance:Math.hypot(car.x-boxTarget.x,car.z-boxTarget.z)}};
}
