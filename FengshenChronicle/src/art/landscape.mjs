// First-party generated mineral-pigment environment art. Raster composition is
// performed only while the Egret map textures are prepared, never per frame.
const TAU=Math.PI*2;
const BOX={
  hall:[0,0,605,500],workshop:[606,0,520,500],well:[1160,0,376,500],
  elm:[0,512,610,512],brazier:[620,570,330,410],wall:[958,640,578,330],
  spur:[0,0,420,520],shelf:[430,130,690,390],pillar:[1160,0,376,520],
  boulders:[0,590,490,434],ferns:[495,525,615,499],altar:[1115,525,421,499]
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
  const [materials,city,trail]=await Promise.all(['terrain-materials.webp','city-props.webp','trail-props.webp'].map((name,i)=>image(new URL('../../assets/world/'+name,import.meta.url)).then(source=>i?cleanSheet(source):source)));
  const tiles={};
  // Overlap and blend opposite source halves into a periodic texture. This
  // matches its edges without mirrored rocks or kaleidoscopic earth patterns.
  for(const [id,qx,qy,size]of [['earth',0,0,190],['sandstone',1,0,112],['mountain',0,1,256],['slate',1,1,150]]){
    const c=document.createElement('canvas');c.width=c.height=size;const p=c.getContext('2d'),sw=materials.naturalWidth/2,sh=materials.naturalHeight/2;
    const sample=document.createElement('canvas');sample.width=sample.height=size*2;const sg=sample.getContext('2d',{willReadFrequently:true});
    sg.drawImage(materials,qx*sw+4,qy*sh+4,sw-8,sh-8,0,0,size*2,size*2);const src=sg.getImageData(0,0,size*2,size*2).data,dst=p.createImageData(size,size),weight=Float32Array.from({length:size},(_,i)=>Math.sin(i/size*Math.PI/2)**2);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const wx=weight[x],wy=weight[y],a=(y*size*2+x)*4,b=a+size*4,d=a+size*size*8,e=d+size*4,k=(y*size+x)*4;
      for(let channel=0;channel<3;channel++)dst.data[k+channel]=src[a+channel]*wx*wy+src[b+channel]*(1-wx)*wy+src[d+channel]*wx*(1-wy)+src[e+channel]*(1-wx)*(1-wy);dst.data[k+3]=255;
    }
    p.putImageData(dst,0,0);tiles[id]=c;
  }
  const sprite=(g,key,x,y,w,h,{alpha=1,mirror=false,contain=true}={})=>{
    const b=BOX[key],source=['hall','workshop','well','elm','brazier','wall'].includes(key)?city:trail;
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
  const cityRoutes=[[[55,830],[1540,830]],[[800,100],[800,1020]],[[480,488],[1230,488]]];
  const trailRoute=[[140,1280],[268,1115],[280,920],[300,700],[340,480],[700,400],[740,600],[775,945],[1320,1060],[1490,820],[1480,450],[1480,220]];
  function paintGround(g,id,map){
    const w=map.width,h=map.height,r=random(id==='city'?2387:50491);g.save();material(g,id==='city'?'earth':'mountain');g.fillRect(0,0,w,h);
    if(id==='city'){
      // The three streets follow the original map, including its real NPC and
      // portal positions. Only low, passable paving is painted in corridors.
      cityRoutes.forEach((p,i)=>road(g,p,i===2?126:164,'sandstone','rgba(89,66,40,.45)'));
      g.globalAlpha=.12;g.fillStyle='#e0ad59';g.fillRect(0,0,w,h);g.globalAlpha=1;
      // Worn thresholds lead precisely to each actual house footprint.
      for(const o of map.obstacles.filter(o=>o.kind==='house'))road(g,[[o.x+o.width/2,o.y+o.height-8],[o.x+o.width/2,o.y+o.height+42]],o.width*.35,'sandstone','rgba(98,70,37,.25)');
      for(const [x,y]of [[548,394],[960,382],[540,844]])glow(g,x,y,135,'rgba(255,162,54,.19)');
      // Small edge vegetation and lamps never block the playable streets.
      for(const [x,y,s]of [[38,450,1],[1550,270,.85],[42,1038,.9],[1567,1080,1]])sprite(g,'elm',x,y,170*s,195*s,{alpha:.96});
      for(const [x,y]of [[1362,780],[1542,780]]){glow(g,x,y-29,96,'rgba(249,155,42,.24)');sprite(g,'brazier',x,y,43,64);}
      // The old checkpoint is marked by bronze inlays rather than painted
      // walls across its usable portal. The view supplies the active rune.
      g.save();g.translate(map.portal.x,map.portal.y);g.strokeStyle='rgba(201,155,70,.75)';g.lineWidth=2;g.beginPath();g.ellipse(0,0,74,35,0,0,TAU);g.stroke();
      for(let i=0;i<12;i++){const a=i*TAU/12;g.fillStyle='rgba(114,82,39,.7)';g.fillRect(Math.cos(a)*67-2,Math.sin(a)*31-1,4,2);}g.restore();
      // Sunset is directional but kept out of the character's value range.
      const sun=g.createLinearGradient(0,0,w,h);sun.addColorStop(0,'rgba(247,192,100,.14)');sun.addColorStop(.55,'rgba(177,115,57,0)');sun.addColorStop(1,'rgba(46,46,38,.19)');g.fillStyle=sun;g.fillRect(0,0,w,h);
    }else{
      g.fillStyle='rgba(5,25,37,.18)';g.fillRect(0,0,w,h);road(g,trailRoute,118,'slate','rgba(5,30,40,.52)');
      // The botanicals stay at the perimeter or clear of the actual route;
      // ground-level grass may be traversed and does not suggest a new wall.
      for(let i=0;i<46;i++){
        const x=i<30?(i%2?r()*100:w-r()*110):r()*w,y=r()*h;
        if(distanceToRoute(x,y,trailRoute)<112)continue;
        if(map.obstacles.some(o=>x>o.x-35&&x<o.x+o.width+35&&y>o.y-35&&y<o.y+o.height+35))continue;
        const s=.45+r()*.55;sprite(g,'ferns',x,y,160*s,145*s,{mirror:r()>.5,alpha:.66+r()*.25});
      }
      // Moonlight pools are baked, not extra translucent runtime layers.
      for(const [x,y,rr]of [[330,230,340],[1650,150,360],[1550,1220,310]])glow(g,x,y,rr,'rgba(160,210,213,.095)');
      const night=g.createLinearGradient(0,0,w,h);night.addColorStop(0,'rgba(6,35,48,.02)');night.addColorStop(1,'rgba(2,15,31,.25)');g.fillStyle=night;g.fillRect(0,0,w,h);
    }
    // Tiny chips are flat marks, never fake obstacle silhouettes.
    g.globalAlpha=id==='city'?.35:.22;for(let i=0;i<150;i++){const x=r()*w,y=r()*h;g.fillStyle=id==='city'?'#e5c68d':'#acc8c5';g.fillRect(x,y,1+r()*2,1);}g.globalAlpha=1;
    const edge=g.createRadialGradient(w/2,h/2,Math.min(w,h)*.3,w/2,h/2,Math.max(w,h)*.68);edge.addColorStop(0,'rgba(0,0,0,0)');edge.addColorStop(1,id==='city'?'rgba(47,32,20,.23)':'rgba(1,14,26,.35)');g.fillStyle=edge;g.fillRect(0,0,w,h);g.restore();
  }
  function paintStructure(g,kind,w,h,index=0){
    g.save();g.save();g.filter='blur(8px)';ellipse(g,9,-5,w*.48,Math.max(8,h*.1),'rgba(4,17,20,.16)');g.restore();
    if(kind==='house'){
      sprite(g,index===1?'workshop':'hall',0,13,w+74,h+91);
      // Attached lantern light is clipped to the building texture's own
      // allocated area, keeping its original foot-pivot and occlusion.
      glow(g,-w*.24,-h*.27,44,'rgba(255,177,65,.12)');glow(g,w*.24,-h*.27,44,'rgba(255,177,65,.1)');
    }else if(kind==='well')sprite(g,'well',0,12,w+42,h+92);
    else if(kind==='tree')sprite(g,'elm',0,12,w+88,h+115);
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
  return {paintGround,paintStructure};
}
