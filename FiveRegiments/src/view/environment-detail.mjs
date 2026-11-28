// Static environment-only geometry. The collision plane, routes, posts and deck surfaces remain authored elsewhere.
// A single flat ground mesh keeps metre-scaled UVs and adds low-frequency colour without a new texture or draw.
const LOOKS = Object.freeze({
  county:  {seed:11,tint:[.90,.87,.81]},
  peach:   {seed:17,tint:[.88,.93,.84]},
  bamboo:  {seed:23,tint:[.83,.89,.78]},
  snow:    {seed:31,tint:[.88,.93,.98]},
  palace:  {seed:41,tint:[.88,.85,.83]},
  pass:    {seed:47,tint:[.85,.90,.80]},
  depot:   {seed:59,tint:[.91,.85,.78]},
  citadel: {seed:67,tint:[.86,.87,.91]}
});
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const profile=name=>{const look=LOOKS[name];if(!look)throw new RangeError('Unknown environment '+name);return look;};
const noise=(x,z,seed)=>.50*Math.sin(x*.162+seed*.27)*Math.cos(z*.19-seed*.19)
  +.31*Math.sin((x+z)*.078+seed*.43)+.19*Math.cos((x-z)*.31-seed*.11);

/** All tiers use exactly the same 1,600 m flat surface; only macro colour tessellation varies. */
export function groundDetail(name,radius,quality){
  const look=profile(name),cells=quality==='low'?12:quality==='medium'?18:24;
  const half=Math.max(40,radius+16),axis=[-800];
  for(let i=0;i<=cells;i++)axis.push(-half+2*half*i/cells);
  axis.push(800);
  const size=axis.length,n=size*size;
  const positions=new Float32Array(n*3),normals=new Float32Array(n*3),colors=new Float32Array(n*3),uvs=new Float32Array(n*2);
  const indices=new Uint16Array((size-1)*(size-1)*6);
  let i=0,j=0;
  for(const z of axis)for(const x of axis){
    positions.set([x,0,z],i);normals.set([0,1,0],i);uvs.set([800+x,800-z],j);
    // Fade naturally into the existing outer surface. The detail is visual only: no displaced vertices.
    const fade=clamp((half-Math.max(Math.abs(x),Math.abs(z)))/10),patch=noise(x,z,look.seed);
    for(let c=0;c<3;c++)colors[i+c]=clamp(1+fade*(look.tint[c]-1+patch*.095),.68,1);
    i+=3;j+=2;
  }
  let at=0;
  for(let z=0;z<size-1;z++)for(let x=0;x<size-1;x++){
    const a=z*size+x,b=a+size;
    indices.set([a,b,a+1,b,b+1,a+1],at);at+=6;
  }
  return {positions,normals,uvs,colors,indices};
}

/** Subtle weathering on the existing raised path strip; its shape and boundaries are unchanged. */
export function roadTints(name,widthSegments,lengthSegments){
  const look=profile(name),colors=new Float32Array((widthSegments+1)*(lengthSegments+1)*3);
  for(let j=0;j<=lengthSegments;j++)for(let i=0;i<=widthSegments;i++){
    const u=i/widthSegments,v=j/lengthSegments,centre=1-Math.pow(Math.abs(u*2-1),2);
    const worn=.80+.16*centre+.025*Math.sin(v*19+look.seed*.17)*Math.cos(u*6.4+v*4.8);
    const at=(j*(widthSegments+1)+i)*3;
    for(let c=0;c<3;c++)colors[at+c]=clamp(worn*(.94+.06*look.tint[c]),.68,1);
  }
  return colors;
}
