// Engine save-store adapter. The original checksummed Wulin file is the payload,
// and the persisted bytes stay compatible with older deployments.
import { createSaveStore } from '@egret/engine/kit';
import { serialize, deserialize } from '../core/save.mjs';
const SLOT_KEYS=['auto','1','2','3'];
const prefix='wulin-slot-';
const SAVE_KEY='wulin-slot-auto';
const keyOf=slot=>slot==='auto'?SAVE_KEY:prefix+slot;
function looksLikeFile(raw){
  if(typeof raw!=='string')return false;
  try {const x=JSON.parse(raw);return x.magic==='wulin-save'&&typeof x.body==='string'&&typeof x.check==='string'&&Number.isInteger(x.version);}
  catch{return false;}
}
export function nativeSlots(storage,onProblem=()=>{}) {
  const adapter={
    getItem(key){const raw=storage.getItem(key);return raw===null?null:JSON.stringify({version:1,data:raw});},
    setItem(key,value){
      let raw;try{raw=JSON.parse(value).data;}catch{}
      storage.setItem(key,typeof raw==='string'?raw:value);
    },
    removeItem(key){storage.removeItem(key);},
  };
  const open=slot=>createSaveStore({key:keyOf(slot),version:1,defaults:()=>null,storage:adapter,
    validate:raw=>raw===null||looksLikeFile(raw),onProblem});
  const safeGet=key=>{try{return storage.getItem(key)}catch(error){onProblem({kind:'unreadable',key,cause:error});return null}};
  return {
    persistent:storage.persistent,
    write(slot,state,label){return open(slot).save(serialize(state,label));},
    read(slot){
      const raw=safeGet(keyOf(slot));
      if(!raw)return {ok:false,why:'空存档位'};
      const store=open(slot);
      let answer;
      try{answer=store.data?deserialize(store.data):{ok:false,why:'存档已损坏'};}catch{answer={ok:false,why:'存档已损坏'};}
      if(!answer.ok){try{storage.setItem(keyOf(slot)+'.unread',raw);}catch{}}
      return answer;
    },
    list(){return SLOT_KEYS.flatMap(slot=>{const raw=safeGet(keyOf(slot));if(!raw)return [];try{const f=JSON.parse(raw);return [{slot,label:f.label??'',day:f.savedAt??0}]}catch{return [{slot,label:'存档已损坏',day:0}]}});},
    remove(slot){open(slot).remove();},
  };
}
