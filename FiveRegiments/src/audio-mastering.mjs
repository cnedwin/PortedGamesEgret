// Generic one-shot mastering before PCM encoding. Preserve quieter clips and
// already-ended waveforms; never apply this terminal fade to a music loop.
const CEILING=.88;
const TAIL_SECONDS=.008;

/** Return a mastered copy only when needed; never modify the original waveform. */
export function masterOneShot(samples,sampleRate){
  if(!samples.length)return samples;
  let peak=0;
  for(const sample of samples)peak=Math.max(peak,Math.abs(sample));
  const gain=peak>CEILING?CEILING/peak:1;
  const tail=samples.at(-1)!==0;
  if(gain===1&&!tail)return samples;

  const out=samples.slice();
  if(gain!==1)for(let i=0;i<out.length;i++)out[i]*=gain;
  if(tail){
    const count=Math.min(out.length,Math.max(1,Math.round(sampleRate*TAIL_SECONDS)));
    for(let i=out.length-count;i<out.length;i++){
      const t=(out.length-1-i)/Math.max(1,count-1);
      out[i]*=t*t*(3-2*t);
    }
  }
  return out;
}
