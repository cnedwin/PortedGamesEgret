// The interactive presentation runs on a modestly slower virtual clock.
// Each admitted step is the original fixed interval; no input is sampled or
// consumed by this scheduler, and deterministic tools can retain rate 1.
export const INTERACTIVE_TEMPO = .90;

export function advanceVirtualFrame(carry,wallSeconds,tick,{scale=1,paced=false}={}) {
  if(!Number.isFinite(carry)||carry<0||!Number.isFinite(wallSeconds)||wallSeconds<0||
     !Number.isFinite(tick)||tick<=0||!Number.isFinite(scale)||scale<0)
    throw new RangeError('Invalid virtual clock frame');
  const rate=scale*(paced?INTERACTIVE_TEMPO:1);
  const virtualSeconds=wallSeconds*rate;
  let remainder=carry+virtualSeconds,steps=0;
  // Retain the same arithmetic and boundary as the legacy accumulator, rather
  // than changing fixed-mode rounding with an independently rounded quotient.
  while(remainder>=tick){remainder-=tick;steps++;}
  return {scale:rate,virtualSeconds,steps,remainder};
}
