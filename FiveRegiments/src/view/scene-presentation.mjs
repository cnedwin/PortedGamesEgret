// Visual composition for the existing non-interactive scene notices.
const clamp01=n=>Math.max(0,Math.min(1,n));
const ease=n=>n*n*(3-2*n);

export function sceneBannerOpacity(remaining,duration,reduced=false){
  if(!(remaining>0&&duration>0))return 0;
  if(reduced)return 1;
  const age=Math.max(0,duration-remaining),appear=Math.min(.18,duration*.25),tail=Math.min(.28,duration*.25);
  return (.85+.15*ease(clamp01(age/appear)))*ease(clamp01(remaining/tail));
}

export function sceneBannerOutline(width,height){
  const w=Math.max(0,width),h=Math.max(0,height),c=Math.min(9,w*.08,h*.14);
  return [[c,0],[w-c,0],[w,c],[w,h-c],[w-c,h],[c,h],[0,h-c],[0,c]];
}
