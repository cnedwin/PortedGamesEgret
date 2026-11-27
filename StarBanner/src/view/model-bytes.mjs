// One bounded, page-start-only byte admission. No model decode, texture upload or persistent cache here.
import { assetUrl } from '../asset-url.mjs';

export const MAX_INITIAL_MODEL_PREFETCH=16;
export const modelUrl=(name,set,base=assetUrl('models/'))=>new URL(`${name}-${set}.glb`,base);

async function download(name,url,fetcher,signal) {
  const response=await fetcher(url,signal?{signal}:undefined);
  if(!response.ok)throw Error(`${name}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function modelBytes(name,set,{base=assetUrl('models/'),prefetch,fetcher=globalThis.fetch}={}) {
  const url=modelUrl(name,set,base);
  // A failed prefetched request is still the real request; the caller owns failure reporting.
  const pending=prefetch?.take(url);
  return pending===undefined?download(name,url,fetcher):pending;
}

export function prefetchInitialModels(names,set,{base=assetUrl('models/'),fetcher=globalThis.fetch}={}) {
  const admitted=[...new Set(names)].slice(0,MAX_INITIAL_MODEL_PREFETCH),pending=new Map();
  const controller=new AbortController(),receipts=[];
  for(const name of admitted){
    const url=modelUrl(name,set,base);
    // Turn rejection into an outcome immediately: an engine startup failure may mean nobody takes it.
    const result=download(name,url,fetcher,controller.signal).then(bytes=>({ok:true,bytes}),cause=>({ok:false,cause}));
    pending.set(url.href,result);
    receipts.push(result.then(value=>value.ok));
  }
  // The receipt retains counts, not a second copy of the model bytes.
  const done=Promise.all(receipts).then(flags=>{
    const downloaded=flags.filter(Boolean).length;
    return {requested:flags.length,downloaded,failed:flags.length-downloaded};
  });
  return {
    names:admitted.slice(),set,done,
    get remaining(){return pending.size;},
    take(url){
      const key=url.href,result=pending.get(key);
      if(result===undefined)return undefined;
      pending.delete(key);
      return result.then(value=>{if(!value.ok)throw value.cause;return value.bytes;});
    },
    cancel(){pending.clear();controller.abort();}
  };
}
