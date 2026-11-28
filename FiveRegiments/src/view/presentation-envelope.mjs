// Decorative display envelopes. They own no simulation state or resources.
const saturate=value=>Math.min(1,Math.max(0,value));
const smooth=value=>{const x=saturate(value);return x*x*(3-2*x);};

/**
 * A single cosmetic light pulse, starting immediately at the requested peak.
 * The original duration is the entire window, including a smooth zero ending.
 * A new accent replaces the old one, so a burst of events never adds lights.
 */
export function createVisualPulse(){
  let peak=0,duration=0,elapsed=0;
  return {
    begin(level,seconds){
      peak=Number.isFinite(level)?Math.max(0,level):0;
      duration=Number.isFinite(seconds)?Math.max(0,seconds):0;
      elapsed=0;
      return duration>0?peak:0;
    },
    advance(dt){
      if(duration<=0||elapsed>=duration)return 0;
      elapsed+=Number.isFinite(dt)?Math.max(0,dt):0;
      if(duration-elapsed<1e-12){elapsed=duration;return 0;}
      return peak*smooth(1-elapsed/duration);
    },
    clear(){peak=duration=elapsed=0;}
  };
}

/** Keep the notice readable immediately, easing only its existing fade tail. */
export function noticeOpacity(remaining){
  return Number.isFinite(remaining)?smooth(remaining/.18):0;
}
