// First-party cached 2D artwork. The game paints these once, then Egret owns
// the textures, depth order and every submitted frame. No third-party art.
export const PALETTE = { ink: '#182b32', bronze: '#a18446', gold: '#e4c47f', red: '#943e3a', jade: '#4c7770' };
const TAU = Math.PI * 2;
const poly = (g, p, fill, edge, line = 1) => { g.beginPath(); p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y)); g.closePath(); if(fill){g.fillStyle=fill;g.fill();} if(edge){g.strokeStyle=edge;g.lineWidth=line;g.stroke();} };
const ellipse = (g,x,y,rx,ry,c) => {g.beginPath();g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);g.fillStyle=c;g.fill();};
const line = (g,p,c,w=1) => {g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.strokeStyle=c;g.lineWidth=w;g.lineCap='round';g.lineJoin='round';g.stroke();};
function gradient(g,x,y,x1,y1,a,b){const k=g.createLinearGradient(x,y,x1,y1);k.addColorStop(0,a);k.addColorStop(1,b);return k;}
function radial(g,x,y,r,c){const k=g.createRadialGradient(x,y,0,x,y,r);k.addColorStop(0,c);k.addColorStop(1,'rgba(0,0,0,0)');return k;}
function random(seed){let s=seed;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function tree(g,x,y,s,r){
  ellipse(g,x+8*s,y+8*s,30*s,11*s,'rgba(12,26,25,.18)');
  line(g,[[x,y],[x-2*s,y-48*s],[x+10*s,y-67*s]],'#4e5142',7*s);
  for(let i=0;i<13;i++){const a=r()*TAU,d=r()*28*s,c=['#3d6252','#557a60','#718a65','#8a9d70'][i%4];ellipse(g,x+Math.cos(a)*d,y-66*s+Math.sin(a)*d*.65,14*s,11*s,c);}
  line(g,[[x-9*s,y-52*s],[x+2*s,y-68*s],[x+17*s,y-65*s]],'rgba(192,196,135,.25)',2*s);
}
function flag(g,x,y,s,red=true){
  ellipse(g,x+3*s,y+6*s,15*s,5*s,'rgba(0,0,0,.16)');
  line(g,[[x,y],[x,y-90*s]],'#725838',4*s);ellipse(g,x,y-92*s,4*s,4*s,'#d6b66c');
  const c=red?'#963f39':'#557268';
  poly(g,[[x+3*s,y-83*s],[x+43*s,y-78*s],[x+35*s,y-50*s],[x+28*s,y-55*s],[x+19*s,y-49*s],[x+4*s,y-54*s]],c,'#543e32',s);
  line(g,[[x+9*s,y-78*s],[x+33*s,y-75*s],[x+29*s,y-59*s],[x+9*s,y-61*s]],'#c6a768',s);
  line(g,[[x+21*s,y-75*s],[x+21*s,y-61*s],[x+14*s,y-66*s],[x+28*s,y-66*s]],'#dcc58c',1.5*s);
}
function path(g,points,width,base,edge){
  g.lineCap='round';g.lineJoin='round';g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));
  g.strokeStyle=edge;g.lineWidth=width+12;g.stroke();g.strokeStyle=base;g.lineWidth=width;g.stroke();
}

export function paintGround(g,id,map){
  const w=map.width,h=map.height,r=random(id==='city'?1029:7721);
  g.fillStyle=gradient(g,0,0,w,h,id==='city'?'#b8b28b':'#7b9189',id==='city'?'#8f9779':'#3d625e');g.fillRect(0,0,w,h);
  for(let i=0;i<1300;i++){
    const x=r()*w,y=r()*h;
    ellipse(g,x,y,8+r()*48,3+r()*14,id==='city'?'rgba(230,219,173,.1)':'rgba(191,204,172,.055)');
  }
  if(id==='city'){
    path(g,[[75,830],[w-50,830]],160,'#b5ab87','#959476');
    path(g,[[800,90],[800,h-90]],165,'#c5b898','#9d9d7a');
    path(g,[[480,488],[1230,488]],125,'#b8ad88','#959879');
    for(let x=0;x<w;x+=45)for(let y=408;y<568;y+=25){if(r()<.27)line(g,[[x,y],[x+20+r()*22,y-4]],'rgba(92,87,65,.14)',1);}
    for(let i=0;i<800;i++){const x=r()*w,y=r()*h;if(Math.abs(y-830)<72||Math.abs(x-800)<75||y>425&&y<550)line(g,[[x,y],[x+3+r()*12,y-2]],'rgba(93,83,61,.13)',1);}
    // Fitted paving marks keep the street readable without a checkerboard.
    for(let y=160;y<h-90;y+=42)for(let x=738;x<858;x+=44){const xx=x+(Math.round(y/42)%2)*20;poly(g,[[xx,y],[xx+37,y-4],[xx+40,y+20],[xx+3,y+25]],'rgba(219,208,172,.17)','rgba(94,91,71,.08)');}
    for(const [x,y,s] of [[100,500,1.3],[1440,220,1.4],[80,1020,1.4],[1500,1040,1.35],[600,1060,.9]])tree(g,x,y,s,r);
    for(const [x,y] of [[594,404],[926,400],[1350,779],[1538,778]])flag(g,x,y,.95);
    // The eastern road ends at a timber checkpoint around the real portal.
    for(const x of [1374,1528]){
      ellipse(g,x+4,887,25,9,'rgba(0,0,0,.2)');g.fillStyle='#695039';g.fillRect(x-8,719,16,163);g.fillStyle='#a2864b';g.fillRect(x-12,731,24,8);
    }
    poly(g,[[1356,725],[1548,725],[1530,700],[1380,700]],'#6c6648','#4e4a36',2);
    line(g,[[1370,701],[1538,701]],'#c1a56b',3);
    flag(g,1390,786,.65);flag(g,1508,786,.65);
    // Small training marks, hand carts and a brazier belong to the town.
    for(const x of [1128,1192]){g.fillStyle='#5a4632';g.fillRect(x-3,560,6,40);line(g,[[x-18,569],[x+18,569]],'#967f4a',5);ellipse(g,x,559,11,13,'#9e8b5e');}
    ellipse(g,592,627,25,10,'rgba(20,25,21,.18)');poly(g,[[575,620],[610,620],[605,640],[581,640]],'#655c46','#383f37');
    ellipse(g,592,619,17,7,'#d4a16a');ellipse(g,592,619,10,4,'#ebce8c');
  }else{
    // A broad winding slate route, with the genuine colliders drawn separately.
    path(g,[[140,1280],[268,1115],[280,920],[300,700],[340,480],[700,400],[740,600],[775,945],[1320,1060],[1490,820],[1480,450],[1480,220]],112,'#7e918b','#5e7973');
    for(let i=0;i<220;i++){
      const x=r()*w,y=r()*h;
      poly(g,[[x,y],[x+12+r()*21,y-6],[x+25+r()*15,y+7],[x+6,y+12]],'rgba(180,194,178,.18)','rgba(43,71,66,.1)');
    }
    for(let i=0;i<70;i++){
      const x=r()<.5?r()*110:w-r()*140,y=r()*h;tree(g,x,y,.8+r()*.8,r);
    }
    for(const [x,y] of [[94,1130],[1706,1080],[1580,150],[710,90]]){
      ellipse(g,x,y+9,36,12,'rgba(18,42,42,.25)');poly(g,[[x-18,y],[x-24,y-57],[x-10,y-78],[x+18,y-70],[x+20,y]],'#526b60','#354e48',2);
      line(g,[[x-10,y-16],[x-12,y-53],[x+10,y-55],[x+10,y-28],[x-3,y-28],[x-3,y-45]],'#b7a16a',2);
    }
    // Mist is baked at the mountain edges, not a translucent full-screen pass.
    for(const [x,y,rx] of [[250,100,430],[1580,180,480],[1710,1220,390]]){
      const mist=g.createRadialGradient(x,y,1,x,y,rx);mist.addColorStop(0,'rgba(218,229,211,.18)');mist.addColorStop(1,'rgba(218,229,211,0)');g.fillStyle=mist;g.fillRect(x-rx,y-rx,rx*2,rx*2);
    }
  }
  // A soft edge finishes the map. Everything remains in one opaque texture.
  const v=g.createRadialGradient(w*.5,h*.5,w*.2,w*.5,h*.5,Math.max(w,h)*.72);v.addColorStop(0,'rgba(13,35,34,0)');v.addColorStop(1,'rgba(13,35,34,.2)');g.fillStyle=v;g.fillRect(0,0,w,h);
}

export function paintStructure(g,kind,w,h,index=0){
  const r=random(182+index*31);
  ellipse(g,12,-8,w*.54,Math.max(12,h*.17),'rgba(13,30,27,.24)');
  if(kind==='tree'){tree(g,0,0,Math.max(w/90,h/110),r);return;}
  if(kind==='well'){
    poly(g,[[-w/2,-h*.75],[w/2,-h*.75],[w/2,-14],[0,1],[-w/2,-14]],'#777b69','#4a5148',2);
    ellipse(g,0,-h*.7,w*.51,h*.23,'#aaa68c');ellipse(g,0,-h*.7,w*.33,h*.14,'#344d4b');ellipse(g,0,-h*.7,w*.24,h*.09,'#627a71');
    for(const x of [-w*.4,w*.4]){g.fillStyle='#68533b';g.fillRect(x-3,-h-30,6,h*.7);}
    line(g,[[-w*.48,-h-31],[w*.48,-h-31]],'#927948',6);line(g,[[0,-h-30],[0,-h*.7]],'#b5a77c',2);return;
  }
  if(['cliff','rock','ruin'].includes(kind)){
    const rise=kind==='rock'?42:75;
    poly(g,[[-w/2,-h],[w/2,-h-12],[w/2+10,-20],[w*.32,8],[-w*.43,0],[-w/2-11,-h*.35]],gradient(g,0,-h,0,10,'#596f68','#334d49'),'#2b4844',2);
    poly(g,[[-w/2,-h],[w/2,-h-12],[w*.46,-h-rise],[w*.1,-h-rise-9],[-w*.43,-h-rise+15]],'#839083','#445f53',2);
    for(let y=-h+20;y<-8;y+=24){line(g,[[-w*.42,y],[w*.3,y-13],[w*.46,y-8]],'rgba(179,192,164,.16)',2);}
    for(let i=0;i<9;i++){const x=(r()-.5)*w*.85,y=-h+r()*h;line(g,[[x,y-22],[x-7,y],[x+3,y+16]],'rgba(18,46,42,.3)',1.5);}
    for(let i=0;i<14;i++)ellipse(g,(r()-.5)*w,-h-rise+15+r()*22,8+r()*18,4+r()*9,['#68846a','#789071','#506f58'][i%3]);
    if(kind==='ruin'){
      for(let y=-h+10;y<-25;y+=42){g.fillStyle='#a49665';g.fillRect(-w*.26,y,w*.52,5);line(g,[[-w*.23,y+10],[0,y+23],[w*.23,y+10]],'#677a66',3);}
      poly(g,[[-w*.3,-h-rise+7],[w*.3,-h-rise+7],[w*.22,-h-rise-22],[-w*.22,-h-rise-22]],'#718077','#b19b62',2);
    }
    return;
  }
  if(kind==='wall'){
    g.fillStyle='#606454';g.fillRect(-w/2,-h-36,w,h+36);g.fillStyle='#a09a79';g.fillRect(-w/2,-h-46,w,18);
    for(let x=-w/2;x<w/2;x+=42){g.fillStyle='#85876a';g.fillRect(x,-h-61,27,25);}
    for(let y=-h;y<0;y+=22)for(let x=-w/2;x<w/2;x+=52)line(g,[[x,y],[x+48,y-2]],'#77806a',1);
    return;
  }
  // Timber halls: broad hipped roof, dark posts and a warm raised plinth.
  poly(g,[[-w/2,-h*.7],[w/2,-h*.7],[w/2,0],[-w/2,0]],gradient(g,0,-h*.7,0,0,'#bca880','#867457'),'#564f3d',2);
  poly(g,[[w/2-28,-h*.7],[w/2+18,-h*.8],[w/2+18,-17],[w/2,0]],'#6c6850','#514d3c');
  g.fillStyle='#5d4835';
  for(let x=-w*.43;x<=w*.44;x+=w/5)g.fillRect(x-5,-h*.55,10,h*.55);
  g.fillStyle='#4e4434';g.fillRect(-w*.12,-h*.38,w*.24,h*.38);
  for(const x of [-w*.29,w*.29]){
    g.fillStyle='#e4c790';g.fillRect(x-w*.065,-h*.37,w*.13,h*.18);
    g.strokeStyle='#6a5338';g.lineWidth=2;g.strokeRect(x-w*.065,-h*.37,w*.13,h*.18);
    line(g,[[x,-h*.37],[x,-h*.19]],'#6a5338',2);
  }
  poly(g,[[-w/2-26,-h*.52],[w/2+30,-h*.56],[w*.37,-h-64],[-w*.37,-h-60]],gradient(g,0,-h-70,0,-h*.5,index%2?'#738878':'#8c8261',index%2?'#465f56':'#5f644c'),'#3f5148',3);
  for(let i=1;i<14;i++){const t=i/14;line(g,[[-w*.37+t*w*.74,-h-60],[-w/2-23+t*(w+50),-h*.54]],'rgba(207,202,150,.22)',1.3);}
  line(g,[[-w*.39,-h-63],[w*.39,-h-67]],'#c2a367',5);
  line(g,[[-w/2-29,-h*.52],[w/2+31,-h*.56]],'#aa8b54',4);
  for(const x of [-w*.3,w*.3]){g.fillStyle='#8e3f35';g.fillRect(x-6,-h*.44,12,h*.26);g.fillStyle='#c5a66a';g.fillRect(x-8,-h*.44,16,3);}
  poly(g,[[-w/2-9,-2],[w/2+11,-2],[w/2+20,10],[-w/2-20,10]],'#8c927b','#656d58');
  for(let i=0;i<3;i++)line(g,[[-w*.18-i*5,10+i*5],[w*.18+i*5,10+i*5]],'#b2ac88',4);
}

function robe(g,c,trim,back,step){
  poly(g,[[-15,-50],[15,-50],[22,-9],[11,-1],[-17,-2],[-23,-12]],gradient(g,-14,-50,15,0,c,trim),'#263b37',1.4);
  line(g,[[-12,-42],[0,-26],[13,-42]],'#c8b48c',2);
  line(g,[[-12,-13+step],[0,-8],[13,-12-step]],'rgba(231,219,168,.36)',1);
  if(back)line(g,[[0,-48],[-4,-18],[5,-3]],'rgba(22,36,34,.35)',2);
}
export function paintActor(g,kind,frame,back=false){
  const phase=Math.sin(frame/4*TAU),step=phase*3;
  ellipse(g,0,3,kind==='boss'?29:22,8,'rgba(8,28,27,.27)');
  if(kind==='wolf'){
    poly(g,[[-25,-22],[-19,-43],[1,-48],[21,-32],[27,-16],[13,-5],[-14,-7]],'#566a68','#263e3c',2);
    for(const s of [-1,1]){line(g,[[s*13,-15],[s*18+step,-1]],'#354d4c',7);poly(g,[[s*7,-45],[s*16,-56],[s*18,-39]],'#526b65','#263f3b');}
    ellipse(g,1,-31,19,14,'#6e8279');poly(g,[[-5,-37],[23,-28],[10,-17],[-6,-20]],'#91a198','#304a45',1.5);
    for(const x of [-6,9])ellipse(g,x,-35,2,2,'#d9ad64');line(g,[[-19,-25],[-31,-20],[-35,-7]],'#5f7870',7);return;
  }
  const hero=kind==='hero'||kind==='heroElite',elite=kind==='heroElite',boss=kind==='boss',elder=kind==='elder',smith=kind==='smith',shaman=kind==='shaman';
  if(boss){g.save();g.scale(1.32,1.32);}
  for(const s of [-1,1]){
    line(g,[[s*8,-18],[s*9, -7+step*s],[s*12,-1+step*s]],elder?'#656452':'#384c4b',9);
    ellipse(g,s*12,-1+step*s,7,3,'#313f37');
    if(hero||boss)poly(g,[[s*7-4,-21],[s*7+4,-21],[s*11+4,-7+step*s],[s*11-4,-7+step*s]],'#8f845c','#394b41');
  }
  if(hero||boss)poly(g,[[-12,-56],[16,-51],[18,-9],[5,-16],[-17,-7],[-19,-27]],gradient(g,0,-50,0,-6,hero?'#8b3938':'#6a2b35','#4e3436'),'#553431',1);
  robe(g,elder?'#c9c6a2':smith?'#7c7860':shaman?'#5f5968':hero?'#64736a':'#565b5b',elder?'#8c9c89':shaman?'#382f46':'#384b47',back,step);
  if(hero||boss||kind==='raider'){
    poly(g,[[-15,-51],[15,-51],[17,-27],[0,-20],[-17,-27]],gradient(g,-13,-53,17,-22,boss?'#6c6755':'#b3a065',boss?'#403d3c':'#63755d'),'#3e5044',1.5);
    for(let y=-45;y<-25;y+=7)for(let x=-11;x<12;x+=7){g.beginPath();g.arc(x+(y%2)*2,y,3.7,0,Math.PI);g.strokeStyle='#d2ba78';g.lineWidth=.8;g.stroke();}
    for(const s of [-1,1])ellipse(g,s*16,-47,10,6,'#a89962');
    g.fillStyle='#6c4b36';g.fillRect(-15,-25,30,5);ellipse(g,0,-23,4,4,'#ceb470');
  }
  const skin=shaman?'#b6b0a0':boss?'#a1a58e':'#d8bd91';
  for(const s of [-1,1]){
    line(g,[[s*17,-44],[s*20,-28+step*s]],elder?'#b7bca0':smith?'#696d59':shaman?'#51485a':'#5e6f62',10);
    ellipse(g,s*21,-26+step*s,4,5,skin);
  }
  if(elder){
    line(g,[[23,0],[24,-72],[31,-82]],'#786344',3);
    ellipse(g,29,-78,5,5,'#d1b369');
  }else if(shaman){
    line(g,[[24,-1],[23,-64]],'#554839',3);ellipse(g,23,-69,8,9,'#a08258');ellipse(g,23,-70,4,5,'#d49c64');
  }else{
    const sy=-26+step;
    poly(g,[[21,sy+9],[25,sy-28],[29,sy-33],[30,sy-26],[26,sy+9]],hero?'#d0c69b':'#959d8c','#4e5e50',1);
    line(g,[[17,sy+1],[32,sy+3]],'#b39757',3);
  }
  if(hero||boss){
    ellipse(g,-23,-30,15,18,'#705e3e');ellipse(g,-23,-31,12,15,'#8f8c60');ellipse(g,-23,-31,5,6,'#c4aa66');
    for(let i=0;i<6;i++){const a=i*TAU/6;ellipse(g,-23+Math.cos(a)*10,-31+Math.sin(a)*12,1,1,'#d5bb79');}
  }
  ellipse(g,0,-65,11,13,back?'#3f4237':skin);
  if(back){ellipse(g,0,-70,12,10,elder?'#c6c9b2':'#333e36');}
  else{
    poly(g,[[-12,-66],[-12,-76],[0,-81],[10,-74],[12,-66],[5,-71],[-4,-70]],elder?'#cdd0b8':'#303d35');
    line(g,[[-6,-65],[-2,-65]],'#4d4a37',1);line(g,[[3,-65],[6,-64]],'#4d4a37',1);
    if(elder)poly(g,[[-7,-59],[0,-42],[8,-60],[2,-56]],'#dad8ba','#9da78f',.7);
  }
  if(hero||boss||kind==='raider'){
    line(g,[[-11,-72],[10,-72]],boss?'#a49b6f':'#b59c5a',3);ellipse(g,0,-73,3,3,'#e1c382');
    ellipse(g,0,-82,7,7,'#333d34');line(g,[[-4,-87],[7,-86]],'#ac874b',2);
  }
  if(shaman)poly(g,[[-13,-71],[0,-92],[13,-71],[0,-78]],'#4d4256','#af9c72',1.3);
  if(hero){poly(g,[[-12,-53],[4,-50],[16,-43],[18,-33],[4,-40]],'#963f3a','#c1905d',1);line(g,[[4,-45],[20,-43],[26,-34-frame]],'#b15b4a',3);}
  if(elite){for(const s of [-1,1]){ellipse(g,s*17,-48,11,7,'#c7b47b');line(g,[[s*12,-48],[s*21,-46]],'#e8d49a',2);}line(g,[[-13,-40],[0,-31],[13,-40]],'#e8cc83',2);}
  if(smith){poly(g,[[-11,-43],[11,-43],[15,-9],[-14,-9]],'#776047','#b09766',1);line(g,[[22,-29],[26,-46]],'#6a5340',4);g.fillStyle='#63746b';g.fillRect(18,-50,16,9);}
  if(boss){poly(g,[[-12,-76],[-25,-89],[-14,-68]],'#877651','#c1a970');poly(g,[[12,-76],[25,-89],[14,-68]],'#877651','#c1a970');g.restore();}
}

export function paintFx(g,kind){
  if(kind==='ring'){
    g.strokeStyle='#edd392';g.lineWidth=4;g.beginPath();g.ellipse(0,0,17,12,-.5,0,TAU);g.stroke();g.strokeStyle='#94733b';g.lineWidth=1.4;g.beginPath();g.ellipse(0,0,13,8,-.5,0,TAU);g.stroke();
    ellipse(g,-10,-8,4,2,'#fff1c4');return;
  }
  if(kind==='slash'){
    const k=g.createLinearGradient(-40,-20,40,20);k.addColorStop(0,'rgba(226,214,156,0)');k.addColorStop(.5,'rgba(250,233,181,.85)');k.addColorStop(1,'rgba(255,250,211,0)');
    g.beginPath();g.arc(0,0,39,-2.5,.45);g.arc(0,0,29,.45,-2.5,true);g.closePath();g.fillStyle=k;g.fill();return;
  }
  if(kind==='impact'){
    const r=random(923);for(let i=0;i<10;i++){const a=i*TAU/10,d=10+r()*14;line(g,[[Math.cos(a)*5,Math.sin(a)*5],[Math.cos(a)*d,Math.sin(a)*d]],i%2?'#f6d68c':'#fff2c5',1+r()*2);}ellipse(g,0,0,6,6,'#fff0b6');return;
  }
  if(kind==='heal'||kind==='level'){
    g.strokeStyle=kind==='heal'?'#a9d8a2':'#ebcf80';g.lineWidth=3;g.beginPath();g.ellipse(0,0,31,15,0,0,TAU);g.stroke();
    for(let i=0;i<8;i++){const a=i*TAU/8;ellipse(g,Math.cos(a)*26,Math.sin(a)*13,2,2,'#f2e6af');}return;
  }
  if(kind==='dust'){ellipse(g,0,0,19,9,'rgba(206,201,162,.25)');ellipse(g,7,-3,10,8,'rgba(225,221,192,.2)');return;}
  if(kind==='portal'){
    g.lineWidth=2;g.strokeStyle='#c9b578';g.beginPath();g.ellipse(0,0,46,23,0,0,TAU);g.stroke();
    for(let i=0;i<8;i++){const a=i*TAU/8,x=Math.cos(a)*35,y=Math.sin(a)*17;line(g,[[x-3,y-2],[x+4,y-2]],'#ebd39a',2);line(g,[[x-3,y+3],[x+4,y+3]],'#9cb9a1',1);}return;
  }
  if(kind==='quest'){poly(g,[[0,-15],[9,-7],[0,2],[-9,-7]],'#e6c278','#78633e',1);ellipse(g,0,8,2,2,'#e9cf88');return;}
  if(kind==='gold'){ellipse(g,0,0,8,6,'#b59650');ellipse(g,-1,-2,6,4,'#e7ce84');g.fillStyle='#7b673f';g.fillRect(-2,-3,4,4);return;}
  if(kind==='potion'){poly(g,[[-4,-9],[4,-9],[4,-5],[8,0],[6,8],[-6,8],[-8,0],[-4,-5]],'#a85a50','#574b3e');g.fillStyle='#d1bd7c';g.fillRect(-4,-10,8,4);line(g,[[-3,0],[3,0]],'#ead7a2',2);return;}
  if(kind==='sword'){poly(g,[[-3,12],[-2,-16],[2,-21],[4,-16],[2,12]],'#d7d6b2','#586e5f',1);line(g,[[-8,8],[8,8]],'#cfab59',3);line(g,[[0,10],[0,18]],'#8e5c43',4);return;}
  if(kind==='armor'){poly(g,[[-10,-14],[-4,-19],[4,-19],[10,-14],[15,-6],[10,-1],[8,15],[-8,15],[-10,-1],[-15,-6]],'#88956a','#4d6352',1);for(let y=-9;y<12;y+=5)line(g,[[-6,y],[0,y+3],[6,y]],'#c2b27b',1);return;}
  if(kind==='seal'){poly(g,[[-11,-7],[0,-14],[12,-7],[12,8],[0,15],[-11,8]],'#6b9582','#c9b578',1.5);line(g,[[-5,-4],[5,-4],[5,5],[-5,5],[-5,0],[2,0]],'#dfd1a2',1.3);return;}
}

export const ART_RES = 2;
export async function buildArt(game,scope,maps){
  const entries=[];
  const add=(key,w,h,draw,pivotY=h/2)=>entries.push({key,w,h,draw,pivotY});
  for(const kind of ['hero','heroElite','elder','smith','raider','wolf','shaman','boss'])for(const back of [false,true])for(let f=0;f<4;f++)add(`${kind}${back?'Back':''}:${f}`,kind==='boss'?132:96,kind==='boss'?144:112,g=>paintActor(g,kind,f,back),kind==='boss'?128:96);
  for(const [key,w,h] of [['ring',48,40],['slash',96,96],['impact',64,64],['heal',80,48],['level',80,48],['dust',48,32],['portal',110,66],['quest',28,42],['gold',24,24],['potion',28,32],['sword',36,50],['armor',40,48],['seal',40,44]])add(key,w,h,g=>paintFx(g,key));
  for(let n=0;n<=9;n++)add('digit:'+n,17,25,g=>{g.textAlign='center';g.textBaseline='middle';g.font='bold 23px Georgia,serif';g.lineWidth=3;g.strokeStyle='#263c35';g.strokeText(String(n),0,0);g.fillStyle='#f4dfab';g.fillText(String(n),0,0);});
  const frames={},pad=4,maxWidth=2048;
  let x=pad,y=pad,row=0;
  for(const e of entries){e.pw=e.w*ART_RES;e.ph=e.h*ART_RES;if(x+e.pw+pad>maxWidth){x=pad;y+=row+pad;row=0;}e.x=x;e.y=y;x+=e.pw+pad;row=Math.max(row,e.ph);}
  const atlas=document.createElement('canvas');atlas.width=maxWidth;atlas.height=y+row+pad;
  const a=atlas.getContext('2d');
  for(const e of entries){a.save();a.beginPath();a.rect(e.x,e.y,e.pw,e.ph);a.clip();a.translate(e.x+e.pw/2,e.y+e.pivotY*ART_RES);a.scale(ART_RES,ART_RES);e.draw(a);a.restore();frames[e.key]={x:e.x,y:e.y,width:e.pw,height:e.ph,w:e.w,h:e.h,pivotY:e.pivotY};}
  const atlasLease=await game.textureFromCanvas(atlas);scope.use({dispose:()=>atlasLease.release()});
  const grounds={},structures={};
  for(const [id,map] of Object.entries(maps)){
    const c=document.createElement('canvas');c.width=map.width;c.height=map.height;paintGround(c.getContext('2d'),id,map);
    const lease=await game.textureFromCanvas(c);scope.use({dispose:()=>lease.release()});grounds[id]={lease,width:c.width,height:c.height};
    structures[id]=[];
    for(const [i,o] of map.obstacles.entries()){
      const w=o.width,h=o.height,extra=o.kind==='tree'?Math.max(130,h):100;
      const c=document.createElement('canvas');c.width=Math.ceil(w+100);c.height=Math.ceil(h+extra+40);
      const g=c.getContext('2d');g.translate(c.width/2,c.height-22);paintStructure(g,o.kind,w,h,i);
      const lease=await game.textureFromCanvas(c);scope.use({dispose:()=>lease.release()});structures[id].push({lease,x:o.x+w/2,y:o.y+h,pivotX:c.width/2,pivotY:c.height-22,kind:o.kind});
    }
  }
  return {atlas:atlasLease,frames,grounds,structures,res:ART_RES};
}
