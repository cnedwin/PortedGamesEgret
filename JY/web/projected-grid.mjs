// Pure presentation of injected board geometry. No board rules or event content.
function rgba(value){const n=String(value).replace('#','');return {color:Number.parseInt(n.slice(0,6),16),alpha:n.length===8?Number.parseInt(n.slice(6,8),16)/255:1};}
const pointsKey=list=>(list??[]).map(({x,y,side})=>[x,y,side]).join(';');
export function createProjectedGrid(graphics,{width,height,project,root,scale=1}){
 let previous='';
 const point=({x,y})=>{const [px,py]=project(x,y);return [root.x+px*root.scaleX,root.y+py*root.scaleY]};
 const stroke=(hex,w)=>{const {color,alpha}=rgba(hex);graphics.lineStyle(w,color,alpha,{caps:'round',joints:'round'});};
 function polygon(points,hex,w,fill){stroke(hex,w);if(fill){const {color,alpha}=rgba(fill);graphics.beginFill(color,alpha);}graphics.moveTo(...points[0]);for(const p of points.slice(1))graphics.lineTo(...p);graphics.lineTo(...points[0]);if(fill)graphics.endFill();graphics.lineStyle(0);}
 function path(points,hex,w){stroke(hex,w);graphics.moveTo(...points[0]);for(const p of points.slice(1))graphics.lineTo(...p);graphics.lineStyle(0);}
 return {
  draw(state,cursor,preview){
   const key=JSON.stringify([state.result,state.canAct,state.selection?.type,root.x,root.y,root.scaleX,root.scaleY,pointsKey(state.selection?.cells),pointsKey(preview?.path),pointsKey(preview?.cells),pointsKey(preview?.targets),cursor?.x,cursor?.y,state.turn?.id,state.turn?.x,state.turn?.y,state.turn?.side,state.turn?.dead]);
   if(previous===key)return false;previous=key;graphics.clear();if(state.result!==null)return true;
   const cells=state.canAct?state.selection?.cells??[]:[],rx=18*scale*root.scaleX,ry=9*scale*root.scaleY, moving=state.selection?.type==='move';
   const within=(x,y)=>x>=-rx&&x<=width+rx&&y>=-ry&&y<=height+ry;
   function diamond(cell,colour,fill,w=1){if(!cell)return;const [x,y]=point(cell);if(!within(x,y))return;polygon([[x,y-ry+1],[x+rx-2,y],[x,y+ry-1],[x-rx+2,y]],colour,w,fill);}
   function roleMark(role,colour,active){const [x,y]=point(role);if(!within(x,y))return;for(const [color,w] of [['#251f18',4],[colour,2.1]]){if(active){stroke(color,w);graphics.drawEllipse(x-rx*.67,y-ry*.58,rx*1.34,ry*1.16);graphics.lineStyle(0);}else{path([[x-rx*.51,y-ry*.45],[x-rx*.78,y],[x-rx*.51,y+ry*.45]],color,w);path([[x+rx*.51,y-ry*.45],[x+rx*.78,y],[x+rx*.51,y+ry*.45]],color,w);}}}
   for(const cell of cells)diamond(cell,moving?'#8bd5cabb':'#f5a17dbb',moving?'#4acdb81a':'#fa775322');
   if(state.canAct&&preview){for(const cell of preview.path??[])diamond(cell,'#c9fff1','#49d9bc66',1.7);for(const cell of preview.cells??[])diamond(cell,'#ffd8a4','#ee7d543f',1.7);diamond(cursor,'#fff0be','#ffdb9142',2.7);for(const role of preview.targets??[])roleMark(role,role.side===state.turn?.side?'#baf7df':'#ffb788',false);}
   if(state.turn&&!state.turn.dead)roleMark(state.turn,state.turn.side===0?'#ffe4a4':'#e99170',true);return true;
  },invalidate(){previous='';}
 };
}
