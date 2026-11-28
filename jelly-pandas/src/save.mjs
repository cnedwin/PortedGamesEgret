// The original flat settings record remains compatible. Reject invalid fields independently.
export const STORAGE_KEY='jelly-pandas';
export const DEFAULT_SETTINGS=Object.freeze({skin:0,party:1,muted:false,quality:'high'});
export function validateSettings(value) {
  const defaults={...DEFAULT_SETTINGS};
  if(!value||typeof value!=='object'||Array.isArray(value))return defaults;
  return {
    skin:Number.isInteger(value.skin)&&value.skin>=0&&value.skin<8?value.skin:defaults.skin,
    party:Number.isInteger(value.party)&&value.party>=1&&value.party<=4?value.party:defaults.party,
    muted:typeof value.muted==='boolean'?value.muted:defaults.muted,
    quality:['high','medium','low'].includes(value.quality)?value.quality:defaults.quality,
  };
}
export function loadSettings(storage) {
  try{return validateSettings(JSON.parse(storage?.getItem(STORAGE_KEY)??'{}'));}
  catch{return {...DEFAULT_SETTINGS};}
}
export function saveSettings(storage,settings) {
  try{storage?.setItem(STORAGE_KEY,JSON.stringify(validateSettings(settings)));return !!storage;}
  catch{return false;}
}
