// Decorative number plates share one bounded lifetime. No simulation data is owned here.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const smooth=t=>t*t*(3-2*t);
export const FEEDBACK_LIFETIME=.9;
export function floatingFeedback(age,reduced=false){
  const time=clamp(Number.isFinite(age)?age:0,0,FEEDBACK_LIFETIME);
  const u=time/FEEDBACK_LIFETIME;
  const alpha=1-smooth(clamp((u-.64)/.36,0,1));
  return {
    alpha:time===FEEDBACK_LIFETIME?0:alpha,
    offset:reduced?0:30*(1-(1-u)**2),
    scale:reduced?1:1+.13*(1-smooth(clamp(time/.18,0,1)))
  };
}

export function feedbackLook(type,value){
  const warning=type.includes('bad'),emphasis=type.includes('crit'),special=type==='horse';
  const size=emphasis?23:19,height=emphasis?32:27;
  return {
    size,height,width:clamp(Math.ceil([...String(value)].length*size*.66)+18,32,104),
    text:warning?0xffa89b:special?0xa8edd2:emphasis?0xffe09e:0xfff6e4,
    edge:warning?0xb44c38:special?0x77aa90:emphasis?0xf6bd64:0xa68c60,
    fill:warning?0x301915:0x1c1813
  };
}
