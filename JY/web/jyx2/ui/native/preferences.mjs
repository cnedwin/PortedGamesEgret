import {createSaveStore} from '@egret/engine/kit';
import {browserSaveStorage} from '@egret/engine/web/kit';

const legacyKey='kys-game-preferences';
const preferenceKey='kys-game-preferences-v1';
export const visualStyles=Object.freeze(['jyx2','enhanced','classic']);
export const visualOptions=Object.freeze([
  Object.freeze({id:'jyx2',label:{zh:'立體畫面',en:'3D scene'}}),
  Object.freeze({id:'enhanced',label:{zh:'增強平面',en:'Enhanced 2D'}}),
  Object.freeze({id:'classic',label:{zh:'經典平面',en:'Classic 2D'}})
]);
export function normalizePreferences(value) {
  return {visual:visualStyles.includes(value?.visual)?value.visual:'jyx2',
    sound:value?.sound!==false,language:value?.language==='en'?'en':'zh'};
}
const valid=value=>!!value&&visualStyles.includes(value.visual)
  &&typeof value.sound==='boolean'&&['zh','en'].includes(value.language);

// Only migrate legacy unversioned preferences if the versioned key is absent.
// Preserve the original record and leave the save-slot storage untouched.
export function createPreferencesStore(storage=browserSaveStorage()) {
  let missing=false,legacy;
  try{
    missing=storage.getItem(preferenceKey)===null;
    if(missing){
      const text=storage.getItem(legacyKey);
      if(text!==null)legacy=JSON.parse(text);
    }
  }catch{/* The save store reports and handles inaccessible storage. */}
  const store=createSaveStore({
    key:preferenceKey,storage,version:1,defaults:()=>normalizePreferences(legacy),validate:valid
  });
  if(missing&&legacy&&typeof legacy==='object')store.save(normalizePreferences(legacy));
  return store;
}
let preferencesStore;
const preferences=()=>preferencesStore??=createPreferencesStore();
export function readPreferences() {return {...preferences().data}}
export function writePreferences(next) {return preferences().save(normalizePreferences(next))}
