import { play } from '@egret/engine/play';
import { createUiSemantics } from '@egret/engine/ui/semantics';
import { createBrowserSemantics } from '@egret/engine/web/semantics';
import { autoSlot, createSaveSlot, manualSlots } from '../../save-slot.mjs';
import { describeSaveSlot } from '../../save-info.mjs';
import { createRpgFrontEnd } from './native/front-end.mjs';
import { createShellWords } from './native/words.mjs';
import { palette, recommendedPlay } from './native/theme.mjs';
import { readPreferences, writePreferences, visualStyles, visualOptions } from './native/preferences.mjs';
import { titleBranding, titleHelpSections, titleArt } from './native/branding.mjs';

export { readPreferences, writePreferences };
export function returnToTitle() {
  const url = new URL(location.href);
  url.searchParams.delete('preview');
  url.searchParams.set('title', '1');
  location.assign(url);
}

export async function nativeSaveRequest(action, body) {
  const response = await fetch('/api/native-save/'+action, {
    method: 'POST', body, headers: { 'Content-Type': action === 'import' ? 'application/zip' : 'application/json' },
  });
  if (!response.ok) throw new Error(await response.text());
  return response;
}

// The platform chooser is not a game UI layer. Open it directly from a trusted
// activation so browsers requiring a user gesture can grant file access.
export async function pickNativeSave() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.zip,application/zip';
  const file = await new Promise(resolve => {
    input.addEventListener('change', () => resolve(input.files[0]), { once: true });
    input.addEventListener('cancel', () => resolve(undefined), { once: true });
    input.click();
  });
  return file ? (await nativeSaveRequest('import', file)).json() : undefined;
}

// No changes to gameplay state or save format: read existing slots, then return
// the selected snapshot just as the former title adapter did.
export async function showTitle({initial,baseline,autoSave,save,saveError,preferences,search,loadCatalog}) {
  const title=document.querySelector('#title-screen');
  const holder=document.querySelector('#native-title-holder');
  const playScreen=document.querySelector('#play-screen');
  if(!title||!holder||!playScreen)throw new Error('Title host is missing');
  title.hidden=false;
  playScreen.hidden=true;
  document.querySelector('#game').dataset.phase='title';
  const requestedLanguage=search.get('lang');
  if(requestedLanguage==='zh'||requestedLanguage==='en')preferences.language=requestedLanguage;
  const words=createShellWords({language:preferences.language});
  document.documentElement.lang=words.language==='en'?'en':'zh-Hant';
  const semantics=createUiSemantics();
  let projection;
  const game=await play({...recommendedPlay,parent:holder,background:palette.night,audio:false,semantics,
    arrange(g){projection?.sync({width:g.screen.width,height:g.screen.height})}
  });
  projection=createBrowserSemantics({semantics,canvas:game.canvas,width:game.screen.width,height:game.screen.height,label:titleBranding.name[words.language]});
  const needsRecovery=saveError?.code==='SAVE_INCOMPATIBLE';
  const storageUnavailable=!!saveError&&!needsRecovery;
  const state={
    preparation:{phase:'ready'},canContinue:!!save&&!saveError,confirmNew:!!save||needsRecovery,
    needsRecovery,
    notice:needsRecovery?{zh:'自動存檔損壞 · 恢復時會先備份',en:'Auto record damaged · backed up on recovery'}:
      storageUnavailable?{zh:'本機儲存暫時不可用 · 可本次遊玩',en:'Storage unavailable · play this session'}:undefined,
    preferences:{...preferences,visual:visualStyles.includes(search.get('visual'))?search.get('visual'):preferences.visual}
  };
  let resolveSelection;
  const selection=new Promise(resolve=>{resolveSelection=resolve});
  let front,finished=false,places;
  async function start(selected) {
    if(finished)return;
    finished=true;
    if(search.get('qa')==='1')delete globalThis.__jyNativeQa;
    try{await front.dispose()}catch(error){console.warn('Title screen disposal:',error)}
    try{projection.dispose();await game.dispose()}catch(error){console.warn('Title host disposal:',error)}
    title.hidden=true;
    playScreen.hidden=false;
    const url=new URL(location.href);
    url.searchParams.delete('title');
    if(!search.has('visual'))url.searchParams.delete('visual');
    history.replaceState(history.state,'',url);
    resolveSelection(selected);
  }
  async function loadSlots({signal}) {
    const [sceneNames,catalog]=await Promise.all([
      places??fetch('/api/scenes',{signal}).then(response=>response.ok?response.json():[]).catch(()=>[]),
      loadCatalog().catch(()=>undefined)
    ]);
    if(signal.aborted)return [];
    places=sceneNames;
    const manual=await Promise.allSettled(manualSlots.map(async number=>({
      number,data:await createSaveSlot(initial.saveIdentity,number).read()
    })));
    if(signal.aborted)return [];
    const records=[{number:autoSlot,data:save,incompatible:needsRecovery},...manual.flatMap((result,index)=>result.status==='fulfilled'
      ?[result.value]:[{number:manualSlots[index],incompatible:true}])];
    return records.filter(entry=>entry.data||entry.incompatible).map(({number,data,incompatible})=>{
      const id=number===autoSlot?'auto':String(number);
      if(incompatible)return {id,auto:number===autoSlot,incompatible:true};
      const {location,detail}=describeSaveSlot(data,places,catalog?.roles);
      const time=typeof data.savedAt==='string'?Date.parse(data.savedAt):NaN;
      const count=Array.isArray(data.party)?data.party.filter(id=>Number.isInteger(id)&&id>=0).length:0;
      const english=[Number.isFinite(time)?'Saved '+new Date(time).toLocaleString('en-GB'):'',count?count+' in party':''].filter(Boolean).join(' · ');
      return {id,auto:number===autoSlot,data,title:{zh:location,en:location},detail:{zh:detail,en:english}};
    });
  }
  // The existing save store owns the atomic backup and recovery. No UI action
  // silently replaces a corrupted automatic record.
  const writeAutomatic=snapshot=>needsRecovery?autoSave.recover(snapshot):storageUnavailable?snapshot:autoSave.write(snapshot);
  const confirmCopy=needsRecovery?{
    line1:{zh:'恢復前會備份損壞的自動存檔。',en:'The damaged record is backed up first.'},
    line2:{zh:'確認後才開始新旅程；手動紀錄保留。',en:'Confirm to start; manual records are kept.'}
  }:{
    line1:{zh:'開始新旅程將替換自動存檔。',en:'The automatic record will be replaced.'},
    line2:{zh:'手動存檔仍可在紀錄中讀取。',en:'Manual records remain available.'}
  };
  front=createRpgFrontEnd(game,{state,words,branding:titleBranding,art:titleArt,visualOptions,helpSections:titleHelpSections,
    showPreparation:false,confirmCopy,onError:error=>console.warn('Title operation:',error),actions:{
    continueGame(){return start(save)},
    async newGame(){return start(save||needsRecovery?await writeAutomatic(baseline):undefined)},
    readSlots:loadSlots,
    async loadSave(slot){return start(slot.auto?slot.data:await writeAutomatic(slot.data))},
    async importSave(){
      const imported=await pickNativeSave();
      if(!imported)return undefined;
      await start(await writeAutomatic(imported));
      return true;
    },
    applySettings(next){
      const persisted=writePreferences(next);
      Object.assign(preferences,next);state.preferences={...next};
      document.documentElement.lang=next.language==='en'?'en':'zh-TW';
      const url=new URL(location.href);
      if(search.has('visual')){search.delete('visual');url.searchParams.delete('visual')}
      if(search.has('lang')&&search.get('lang')!==next.language){search.delete('lang');url.searchParams.delete('lang')}
      if(url.href!==location.href)history.replaceState(history.state,'',url);
      return {persisted};
    }
  }});
  front.openTitle();
  if(search.get('qa')==='1')globalThis.__jyNativeQa={semantics,game,front,preparation:()=>state.preparation};
  return selection;
}
