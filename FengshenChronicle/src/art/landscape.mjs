// First-party generated mineral-pigment environment art. Raster composition is
// performed only while the Egret map textures are prepared, never per frame.
import {AMBIENT_FRAMES,ambientActors,paintAmbientFrame} from './ambient.mjs';
import {yieldArtPreparation} from './prepare.mjs';
const TAU=Math.PI*2;
const BOX={
  hall:[0,0,605,500],workshop:[606,0,520,500],well:[1160,0,376,500],
  elm:[0,512,610,512],brazier:[620,570,330,410],wall:[958,640,578,330],
  spur:[0,0,420,520],shelf:[430,130,690,390],pillar:[1160,0,376,520],
  boulders:[0,590,490,434],ferns:[495,525,615,499],altar:[1115,525,421,499],
  shop:[0,0,515,500],inn:[518,0,515,500],shrine:[1040,0,496,500],
  watchpost:[0,505,445,519],barracks:[450,570,550,440],grove:[1008,515,528,509]
  ,'ford-bridge':[0,55,500,450],'ford-post':[520,0,515,515],'ford-cliff':[1040,0,496,515],
  'ford-rock':[0,610,505,400],'ford-willow':[505,510,530,514],'ford-shrine':[1035,515,501,509],
  'siege-wall':[0,130,640,340],'siege-gate':[650,0,560,495],'siege-tower':[1230,0,306,510],
  'siege-shrine':[0,510,580,514],'siege-barracks':[575,565,570,420],'siege-ruin':[1150,550,386,450]
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function random(seed){let s=seed;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);}
function path(g,points){g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));}
function ellipse(g,x,y,rx,ry,fill){g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);g.fillStyle=fill;g.fill();}
function glow(g,x,y,r,inner){const k=g.createRadialGradient(x,y,0,x,y,r);k.addColorStop(0,inner);k.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=k;g.fillRect(x-r,y-r,r*2,r*2);}
function image(url){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('Landscape art could not load: '+url));i.src=url;});}
function cleanSheet(source){
  const c=document.createElement('canvas');c.width=source.naturalWidth;c.height=source.naturalHeight;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(source,0,0);
  const data=g.getImageData(0,0,c.width,c.height);for(let i=3;i<data.data.length;i+=4)data.data[i]=Math.max(0,Math.round((data.data[i]-8)*255/247));g.putImageData(data,0,0);return c;
}

export async function loadLandscape(){
  const [materials,city,trail,buildings,animals,forgeSheet,campaignMaterials,ford,siege]=await Promise.all(['terrain-materials.webp','city-props.webp','trail-props.webp','rpg-buildings.webp','village-animals.webp','rpg-forge.webp','campaign-terrain.webp','ford-props.webp','siege-props.webp'].map(name=>image(new URL('../../assets/world/'+name,import.meta.url)).then(source=>name.includes('terrain')?source:cleanSheet(source))));
  const tiles={};
  // Overlap and blend opposite source halves into a periodic texture. This
  // matches its edges without mirrored rocks or kaleidoscopic earth patterns.
  for(const [id,qx,qy,size,source=materials]of [['earth',0,0,190],['sandstone',1,0,112],['mountain',0,1,256],['slate',1,1,150],['river',0,0,240,campaignMaterials],['danxia',1,0,195,campaignMaterials],['imperial',0,1,170,campaignMaterials],['basalt',1,1,210,campaignMaterials]]){
    const c=document.createElement('canvas');c.width=c.height=size;const p=c.getContext('2d'),sw=source.naturalWidth/2,sh=source.naturalHeight/2;
    const sample=document.createElement('canvas');sample.width=sample.height=size*2;const sg=sample.getContext('2d',{willReadFrequently:true});
    sg.drawImage(source,qx*sw+4,qy*sh+4,sw-8,sh-8,0,0,size*2,size*2);const src=sg.getImageData(0,0,size*2,size*2).data,dst=p.createImageData(size,size),weight=Float32Array.from({length:size},(_,i)=>Math.sin(i/size*Math.PI/2)**2);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const wx=weight[x],wy=weight[y],a=(y*size*2+x)*4,b=a+size*4,d=a+size*size*8,e=d+size*4,k=(y*size+x)*4;
      for(let channel=0;channel<3;channel++)dst.data[k+channel]=src[a+channel]*wx*wy+src[b+channel]*(1-wx)*wy+src[d+channel]*wx*(1-wy)+src[e+channel]*(1-wx)*(1-wy);dst.data[k+3]=255;
    }
    p.putImageData(dst,0,0);tiles[id]=c;await yieldArtPreparation();
  }
  const sprite=(g,key,x,y,w,h,{alpha=1,mirror=false,contain=true}={})=>{
    const b=key==='forge'?[0,0,forgeSheet.width,forgeSheet.height]:BOX[key],source=key.startsWith('ford-')?ford:key.startsWith('siege-')?siege:key==='forge'?forgeSheet:['shop','inn','shrine','watchpost','barracks','grove'].includes(key)?buildings:['hall','workshop','well','elm','brazier','wall'].includes(key)?city:trail;
    if(contain){const s=Math.min(w/b[2],h/b[3]);w=b[2]*s;h=b[3]*s;}
    g.save();g.globalAlpha*=alpha;g.translate(x,y);if(mirror)g.scale(-1,1);g.drawImage(source,...b,-w/2,-h,w,h);g.restore();
  };
  function material(g,key){g.fillStyle=g.createPattern(tiles[key],'repeat');}
  function road(g,points,width,key,edge){
    g.save();g.lineCap='round';g.lineJoin='round';path(g,points);g.lineWidth=width+17;g.strokeStyle=edge;g.globalAlpha*=.3;g.filter='blur(8px)';g.stroke();
    g.globalAlpha=1;g.filter='blur(2.5px)';path(g,points);g.lineWidth=width;g.strokeStyle=g.createPattern(tiles[key],'repeat');g.stroke();
    // Keep slab detail sharp inside the feathered, worn shoulder.
    g.filter='none';g.lineWidth=width-7;g.stroke();g.restore();
  }
  function distanceToRoute(x,y,route){let best=Infinity;for(let i=1;i<route.length;i++){const [ax,ay]=route[i-1],[bx,by]=route[i],dx=bx-ax,dy=by-ay,t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1);best=Math.min(best,Math.hypot(x-ax-dx*t,y-ay-dy*t));}return best;}
  const cityRoutes=[[[55,830],[1540,830]],[[800,100],[800,1020]],[[370,488],[1230,488]],[[370,488],[370,570],[600,570]],[[1120,488],[1120,555],[1320,620],[1450,560]],[[1450,840],[1400,1020]]];
  const trailRoute=[[140,1280],[268,1115],[280,920],[300,700],[340,480],[700,400],[740,600],[775,945],[1320,1060],[1490,820],[1480,450],[1480,220]];
  const passRoute=[[140,1280],[200,1180],[560,1050],[850,1050],[900,780],[1110,650],[1150,450],[1150,170],[1450,170]];
  const trialRoute=[[100,890],[180,800],[600,800],[600,250]];
  const fordRoute=[[140,1280],[200,1190],[650,1100],[840,850],[840,710],[840,570],[1070,580],[1130,490],[1510,500],[1510,190],[1450,190]];
  const siegeRoute=[[140,1390],[200,1300],[800,1250],[800,950],[800,750],[800,500],[800,300],[1450,240]];
  function paintGround(g,id,map){
    const w=map.width,h=map.height,r=random(id==='city'?2387:id==='pass'?9143:50491),warm=['city','pass','ford'].includes(id),route=id==='ford'?fordRoute:id==='siege'?siegeRoute:id==='pass'?passRoute:id==='trial'?trialRoute:trailRoute;
    g.save();material(g,id==='ford'?'danxia':id==='siege'?'basalt':warm||id==='trial'?'earth':'mountain');g.fillRect(0,0,w,h);
    if(id==='city'){
      // The three streets follow the original map, including its real NPC and
      // portal positions. Only low, passable paving is painted in corridors.
      cityRoutes.forEach((p,i)=>road(g,p,i<2?164:i===2?126:96,'sandstone','rgba(89,66,40,.45)'));
      g.globalAlpha=.12;g.fillStyle='#e0ad59';g.fillRect(0,0,w,h);g.globalAlpha=1;
      // Worn thresholds lead precisely to each actual house footprint.
      for(const o of map.obstacles.filter(o=>['house','shop','inn','shrine','barracks','watchpost','forge'].includes(o.kind)))road(g,[[o.x+o.width/2,o.y+o.height-8],[o.x+o.width/2,o.y+o.height+42]],o.width*.35,'sandstone','rgba(98,70,37,.25)');
      for(const [x,y]of [[548,394],[960,382],[540,844]])glow(g,x,y,135,'rgba(255,162,54,.19)');
      // Small edge vegetation and lamps never block the playable streets.
      for(const [i,[x,y,s]]of [[38,450,1],[1550,270,.85],[42,1038,.9],[1567,1080,1]].entries())sprite(g,i%2?'grove':'elm',x,y,170*s,195*s,{alpha:.96});
      for(const [x,y]of [[1362,780],[1542,780]]){glow(g,x,y-29,96,'rgba(249,155,42,.24)');sprite(g,'brazier',x,y,43,64);}
      // The old checkpoint is marked by bronze inlays rather than painted
      // walls across its usable portal. The view supplies the active rune.
      for(const p of map.portals??[map.portal]){g.save();g.translate(p.x,p.y);g.strokeStyle='rgba(201,155,70,.75)';g.lineWidth=2;g.beginPath();g.ellipse(0,0,74,35,0,0,TAU);g.stroke();
        for(let i=0;i<12;i++){const a=i*TAU/12;g.fillStyle='rgba(114,82,39,.7)';g.fillRect(Math.cos(a)*67-2,Math.sin(a)*31-1,4,2);}g.restore();}
      // Sunset is directional but kept out of the character's value range.
      const sun=g.createLinearGradient(0,0,w,h);sun.addColorStop(0,'rgba(247,192,100,.14)');sun.addColorStop(.55,'rgba(177,115,57,0)');sun.addColorStop(1,'rgba(46,46,38,.19)');g.fillStyle=sun;g.fillRect(0,0,w,h);
    }else if(id==='ford'){
      road(g,route,126,'sandstone','rgba(76,47,28,.45)');
      // Both water colliders are exactly the authored river band; the bridge
      // deck is composed across their 280px gap, with railings OUTSIDE it.
      material(g,'river');g.fillRect(0,640,w,140);
      g.strokeStyle='rgba(210,220,178,.36)';g.lineWidth=2;for(const y of[641,778]){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
      const b=BOX['ford-bridge'];for(const [x,width]of [[640,60],[980,60]]){g.save();g.beginPath();g.rect(x,600,width,222);g.clip();sprite(g,'ford-bridge',840,822,400,230,{contain:false});g.restore();}
      // Real painted bridge paving, uninterrupted throughout the playable gap.
      g.drawImage(ford,140,175,230,245,700,620,280,180);
      for(const[x,y]of[[80,620],[1720,650],[90,1300],[1690,1120]])sprite(g,'ford-willow',x,y,180,220,{alpha:.9});
      for(let i=0;i<50;i++){const x=r()*w,y=640+r()*140;if(x>695&&x<985)continue;g.strokeStyle='rgba(239,211,151,.25)';g.lineWidth=.8;g.beginPath();g.moveTo(x,y);g.lineTo(x+9+r()*13,y-2);g.stroke();}
      glow(g,1360,1050,160,'rgba(236,155,56,.12)');
    }else if(id==='siege'){
      g.fillStyle='rgba(3,13,25,.23)';g.fillRect(0,0,w,h);road(g,route,132,'imperial','rgba(0,9,18,.6)');
      road(g,[[800,1130],[1110,1130]],105,'imperial','rgba(0,9,18,.5)');road(g,[[800,1250],[1370,1300]],108,'imperial','rgba(0,9,18,.5)');
      road(g,[[800,750],[1110,750],[1230,340]],108,'imperial','rgba(0,9,18,.5)');
      for(const[x,y]of[[635,1030],[965,1030],[625,565],[990,565],[1520,400]])glow(g,x,y,100,'rgba(198,96,41,.12)');
      // Embers are flat, sparse pigment marks; the entire centre gate stays open.
      for(let i=0;i<65;i++){const x=r()*w,y=r()*h;g.fillStyle='rgba(230,150,75,.3)';g.fillRect(x,y,1.1,1.1);}
    }else{
      g.fillStyle=id==='pass'?'rgba(25,38,46,.38)':id==='trial'?'rgba(48,39,43,.35)':'rgba(5,25,37,.18)';g.fillRect(0,0,w,h);
      road(g,route,id==='trial'?158:118,id==='pass'||id==='trial'?'sandstone':'slate','rgba(5,30,40,.52)');
      if(id==='trial'){
        road(g,[[240,650],[980,650]],95,'sandstone','rgba(27,28,31,.4)');
        // Engraved drill rings are flat, passable paving in the open arena.
        g.strokeStyle='rgba(207,163,92,.35)';g.lineWidth=3;for(const rr of [128,143]){g.beginPath();g.ellipse(600,250,rr,rr*.58,0,0,TAU);g.stroke();}
      }
      if(id==='pass'){
        for(const o of map.obstacles.filter(o=>['barracks','watchpost','shrine'].includes(o.kind)))road(g,[[o.x+o.width/2,o.y+o.height-5],[o.x+o.width/2,o.y+o.height+40]],o.width*.45,'sandstone','rgba(30,30,26,.3)');
        for(const [x,y]of [[750,970],[1350,1080],[1210,450]])glow(g,x,y,115,'rgba(236,142,43,.13)');
      }
      // The botanicals stay at the perimeter or clear of the actual route;
      // ground-level grass may be traversed and does not suggest a new wall.
      for(let i=0;i<46;i++){
        const x=i<30?(i%2?r()*100:w-r()*110):r()*w,y=r()*h;
        if(distanceToRoute(x,y,route)<112)continue;
        if(map.obstacles.some(o=>x>o.x-35&&x<o.x+o.width+35&&y>o.y-35&&y<o.y+o.height+35))continue;
        const s=.45+r()*.55;sprite(g,id==='pass'&&i%3===0?'grove':'ferns',x,y,160*s,145*s,{mirror:r()>.5,alpha:.66+r()*.25});
      }
      // Moonlight pools are baked, not extra translucent runtime layers.
      for(const [x,y,rr]of [[330,230,340],[1650,150,360],[1550,1220,310]])glow(g,x,y,rr,'rgba(160,210,213,.095)');
      const night=g.createLinearGradient(0,0,w,h);night.addColorStop(0,id==='pass'?'rgba(239,158,76,.08)':'rgba(6,35,48,.02)');night.addColorStop(1,'rgba(2,15,31,.25)');g.fillStyle=night;g.fillRect(0,0,w,h);
    }
    // Tiny chips are flat marks, never fake obstacle silhouettes.
    g.globalAlpha=warm?.35:.22;for(let i=0;i<150;i++){const x=r()*w,y=r()*h;g.fillStyle=warm?'#e5c68d':'#acc8c5';g.fillRect(x,y,1+r()*2,1);}g.globalAlpha=1;
    const edge=g.createRadialGradient(w/2,h/2,Math.min(w,h)*.3,w/2,h/2,Math.max(w,h)*.68);edge.addColorStop(0,'rgba(0,0,0,0)');edge.addColorStop(1,warm?'rgba(47,32,20,.23)':'rgba(1,14,26,.35)');g.fillStyle=edge;g.fillRect(0,0,w,h);g.restore();
  }
  function paintStructure(g,kind,w,h,index=0,mapId=''){
    if(kind==='water')return;
    g.save();g.save();g.filter='blur(8px)';ellipse(g,9,-5,w*.48,Math.max(8,h*.1),'rgba(4,17,20,.16)');g.restore();
    if(mapId==='ford'&&['rock','cliff','watchpost','shrine','tree'].includes(kind)){
      const key=kind==='rock'?'ford-rock':kind==='cliff'?'ford-cliff':kind==='watchpost'?'ford-post':kind==='shrine'?'ford-shrine':'ford-willow';sprite(g,key,0,13,w+72,h+100,{contain:false});
    }else if(mapId==='siege'&&['wall','tower','shrine','barracks','ruin'].includes(kind)){
      if(kind==='wall'){const count=Math.ceil(w/330),tile=w/count;for(let i=0;i<count;i++)sprite(g,'siege-wall',-w/2+tile*(i+.5),8,tile+3,h+75,{contain:false});}
      else sprite(g,kind==='tower'?'siege-tower':'siege-'+kind,0,13,w+72,h+105,{contain:false});
    }else if(kind==='house'){
      sprite(g,index===1?'workshop':index===2?'inn':'shop',0,13,w+68,h+91,{contain:false});
      // Attached lantern light is clipped to the building texture's own
      // allocated area, keeping its original foot-pivot and occlusion.
      glow(g,-w*.24,-h*.27,44,'rgba(255,177,65,.12)');glow(g,w*.24,-h*.27,44,'rgba(255,177,65,.1)');
    }else if(['shop','inn','shrine','watchpost','barracks'].includes(kind))sprite(g,kind,0,13,w+72,h+106);
    else if(kind==='forge'){sprite(g,'forge',0,9,w+22,h+47);glow(g,0,-h*.45,52,'rgba(255,150,42,.17)');}
    else if(kind==='well')sprite(g,'well',0,12,w+42,h+92);
    else if(kind==='tree')sprite(g,index%2?'elm':'grove',0,12,w+88,h+115);
    else if(kind==='wall'){
      const count=Math.ceil(w/294),tile=w/count;for(let i=0;i<count;i++)sprite(g,'wall',-w/2+tile*(i+.5),8,tile+5,h+70,{contain:false});
    }else if(kind==='cliff'){
      if(h>w*1.25){
        // Long footprint: overlapping hand-painted outcrops form a ridge,
        // rather than stretching one boulder into a flat 650-pixel rectangle.
        const count=Math.ceil(h/185),stride=h/count;
        for(let i=count-1;i>=0;i--)sprite(g,'spur',i%2?-6:5,-i*stride+12,w+76,Math.min(285,stride+126),{contain:false,mirror:i%2===1});
      }else sprite(g,'shelf',0,12,w+78,h+109,{contain:false});
    }else if(kind==='ruin'){
      sprite(g,'pillar',0,10,w+74,h+82,{contain:false});
      glow(g,0,-h*.52,49,'rgba(67,170,160,.08)');
    }else if(kind==='rock'){
      sprite(g,'boulders',0,14,w+70,h+80);
      // The sacrificial vessel stands on an existing solid rock footprint.
      sprite(g,'altar',w*.1,-h*.48,w*.55,h*.66);
    }
    g.restore();
  }
  return {paintGround,paintStructure,paintGatherable:(g)=>sprite(g,'brazier',0,8,60,70),ambientFrames:AMBIENT_FRAMES,paintAmbient:(g,kind,frame)=>paintAmbientFrame(g,animals,kind,frame),ambientActors};
}
