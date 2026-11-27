// Native vector emblems for the established seven deeds. The silhouette and
// short captions remain legible on a phone rather than relying on emoji.
const path=(g,points)=>{points.forEach(([x,y],i)=>i===0?g.moveTo(x,y):g.lineTo(x,y));};
const poly=(g,color,points)=>{g.beginFill(color);path(g,[...points,points[0]]);g.endFill();};
const stroke=(g,color,fn,width=2.5)=>{g.lineStyle(width,color,1,{caps:'round',joints:'round'});fn(g);g.lineStyle(0);};
const star=(g,color,x,y,r)=>poly(g,color,[[x,y-r],[x+r*.25,y-r*.25],[x+r,y],[x+r*.25,y+r*.25],[x,y+r],[x-r*.25,y+r*.25],[x-r,y],[x-r*.25,y-r*.25]]);
export function paintDeedIcon(node,name,color=0xe9eef5){
  const g=node.graphics;g.clear();
  if(name==='attack'){
    stroke(g,color,p=>{path(p,[[6,34],[28,12]]);path(p,[[17,18],[23,18],[23,24]]);});
    poly(g,color,[[25,12],[36,4],[30,16],[27,13]]);
  }else if(name==='counter'){
    stroke(g,color,p=>{p.drawArc(20,20,14,-.8,1.08,true);path(p,[[33,16],[33,8],[25,8]]);path(p,[[12,28],[29,11]]);path(p,[[21,13],[31,9],[27,20]]);});
  }else if(name==='guard'){
    stroke(g,color,p=>{p.moveTo(20,4).lineTo(32,9).lineTo(32,18).curveTo(31,27,20,35).curveTo(9,27,8,18).lineTo(8,9).lineTo(20,4);
      path(p,[[12,22],[26,11],[20,12]]);path(p,[[13,22],[17,27],[25,20]]);});
  }else if(name==='stars'){
    star(g,color,21,10,8);star(g,color,11,24,6);star(g,color,29,29,6);
  }else if(name==='rain'){
    stroke(g,color,p=>{for(const [x,y,h] of [[10,7,15],[20,3,28],[30,7,15]]){path(p,[[x,y],[x,y+h],[x-3,y+h-4]]);path(p,[[x,y+h],[x+3,y+h-4]]);}
      p.moveTo(5,34).curveTo(20,28,35,34);});
  }else if(name==='dodge'){
    stroke(g,color,p=>{path(p,[[10,28],[16,28],[19,17],[26,19],[25,24],[32,23],[34,29],[26,34],[10,34],[10,28]]);
      path(p,[[4,23],[12,23]]);path(p,[[5,16],[14,16]]);path(p,[[25,8],[36,8],[32,4]]);path(p,[[36,8],[32,12]]);});
  }else if(name==='glide'){
    stroke(g,color,p=>{p.moveTo(5,29).curveTo(17,33,35,22);p.moveTo(5,35).curveTo(16,36,28,31);
      path(p,[[18,3],[18,21]]);path(p,[[11,7],[25,17]]);path(p,[[11,17],[25,7]]);path(p,[[29,16],[35,16]]);});
  }else if(name==='drink'){
    stroke(g,color,p=>{path(p,[[17,4],[23,4],[23,9],[17,9],[17,4]]);p.moveTo(17,9).lineTo(17,12).curveTo(9,14,14,22)
      .curveTo(6,25,6,30).curveTo(6,36,20,36).curveTo(34,36,34,30).curveTo(34,25,26,22).curveTo(31,14,23,12)
      .lineTo(23,9);p.moveTo(12,30).curveTo(16,33,21,32);path(p,[[14,23],[26,23]]);});
  }
}
