// Render-only dimensions. Simulation positions remain odd-row 22×14 hexes.
export const BOARD={width:800,height:470,cols:22,rows:14};
export const boardPoint=at=>({x:36+(at%22)*33+(Math.floor(at/22)%2)*16.5,y:42+Math.floor(at/22)*28.58});
export const terrainLift=tile=>tile==='wall'?10:tile==='gate'?8:tile==='mountain'?13:tile==='hill'?5:0;
export const hexPoints=(x,y)=>Array.from({length:6},(_,i)=>{const a=(i*60-30)*Math.PI/180;return (x+19.05*Math.cos(a)).toFixed(2)+','+(y+19.05*Math.sin(a)).toFixed(2);}).join(' ');
export function formationSlots(id,count=9){
 const n=Math.max(3,Math.min(12,Math.round(count)||3)),out=[];
 for(let i=0;i<n;i++){
  let x,y;const c=i%3,r=Math.floor(i/3);
  if(id==='square'){const a=i/n*Math.PI*2;x=Math.cos(a)*11;y=Math.sin(a)*9;}
  else if(id==='arrowhead'||id==='fishscale'){const rank=Math.floor(Math.sqrt(i)),first=rank*rank;x=(i-first-rank)*4.2;y=rank*4-7;}
  else if(id==='craneswing'||id==='crescent'){const a=(i/(n-1)-.5)*Math.PI;x=Math.sin(a)*12;y=(1-Math.cos(a))*10-5;}
  else if(id==='longsnake'){x=(i%2-.5)*5;y=(Math.floor(i/2)-(Math.ceil(n/2)-1)/2)*4.2;}
  else if(id==='geese'){x=(i-(n-1)/2)*2.4;y=Math.abs(x)*.55-6;}
  else{x=(c-1)*7;y=(r-1)*5;}
  out.push({x,y});
 }
 return out;
}
