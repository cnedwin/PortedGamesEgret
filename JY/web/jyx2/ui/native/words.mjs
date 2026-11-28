import {createTextTable,pickLanguage} from '@egret/engine/kit';

export const SHELL_WORDS = Object.freeze({
  zh: Object.freeze({
    'title.name':'江湖行記','title.kicker':'風起山河 · 遠行之卷','title.subtitle':'一卷山河，一程江湖。',
    'title.menu':'行旅卷冊','title.continue':'繼續旅程','title.new':'開始新旅程','title.load':'讀取紀錄',
    'title.settings':'設定','title.help':'操作指南','title.data':'遊戲資料',
    'action.retry':'重試','action.cancel':'取消','action.back':'返回','action.apply':'套用',
    'action.choose':'選擇','action.import':'匯入存檔','action.confirm':'確認','action.chosen':'已選擇',
    'prep.idle':'等待準備遊戲資料','prep.checking':'正在檢查遊戲資料','prep.downloading':'正在下載資料','prep.progress':'資料準備進度',
    'prep.reading':'正在讀取檔案','prep.extracting':'正在解壓資料','prep.saving':'正在保存資料',
    'prep.validating':'正在驗證資料','prep.worker':'正在啟動瀏覽器服務','prep.initializing':'正在準備旅程',
    'prep.ready':'資料已就緒','prep.error':'遊戲資料準備失敗','prep.cancelled':'已取消資料準備',
    'progress.percent':'{n}%','settings.heading':'行旅設定','settings.visual':'畫面',
    'settings.visual.high':'精緻','settings.visual.balanced':'均衡','settings.visual.classic':'經典',
    'settings.sound':'音樂與音效','settings.language':'語言','settings.zh':'繁體中文','settings.en':'English',
    'settings.applying':'正在套用設定','settings.notSaved':'設定已套用，但裝置未能保存。','help.heading':'行旅指南',
    'help.explore':'探索','help.explore.1':'使用方向鍵或點選可通行地面。','help.explore.2':'輕觸角色或互動提示以確認。',
    'help.menu':'選單','help.menu.1':'按 Esc 或返回鍵關閉最上層視窗。','help.menu.2':'鍵盤、觸屏或手柄均可操作選單。',
    'help.save':'旅程保存','help.save.1':'可在指定時機保存或讀取旅程。','help.save.2':'跨裝置前請先匯出你的紀錄。',
    'saves.heading':'旅程紀錄','saves.loading':'正在讀取紀錄','saves.empty':'目前沒有紀錄',
    'saves.error':'未能讀取部分紀錄','saves.auto':'自動紀錄','saves.slot':'第 {n} 槽',
    'saves.emptySlot':'空槽','saves.incompatible':'不相容','saves.import':'匯入存檔',
    'confirm.heading':'開始新旅程？','confirm.explain.1':'將開始新的旅程。','confirm.explain.2':'請先保留想繼續的紀錄。',
    'confirm.new':'確認開始','status.busy':'正在處理','status.failed':'未能完成操作','status.done':'操作已完成'
  }),
  en: Object.freeze({
    'title.name':'Wandering Trails','title.kicker':'THE JOURNEY BEGINS','title.subtitle':'Beyond the hills, a new road awaits.',
    'title.menu':'Journey ledger','title.continue':'Continue journey','title.new':'New journey','title.load':'Load record',
    'title.settings':'Settings','title.help':'Guide','title.data':'Game data',
    'action.retry':'Retry','action.cancel':'Cancel','action.back':'Back','action.apply':'Apply',
    'action.choose':'Choose','action.import':'Import save','action.confirm':'Confirm','action.chosen':'Selected',
    'prep.idle':'Game data is not prepared','prep.checking':'Checking game data','prep.downloading':'Downloading data','prep.progress':'Data preparation progress',
    'prep.reading':'Reading files','prep.extracting':'Extracting data','prep.saving':'Saving data',
    'prep.validating':'Validating data','prep.worker':'Starting browser services','prep.initializing':'Preparing the journey',
    'prep.ready':'Game data is ready','prep.error':'Could not prepare game data','prep.cancelled':'Preparation cancelled',
    'progress.percent':'{n}%','settings.heading':'Journey settings','settings.visual':'Display',
    'settings.visual.high':'Rich','settings.visual.balanced':'Balanced','settings.visual.classic':'Classic',
    'settings.sound':'Music and effects','settings.language':'Language','settings.zh':'繁體中文','settings.en':'English',
    'settings.applying':'Applying settings','settings.notSaved':'Applied for this session; not saved.','help.heading':'Traveller guide',
    'help.explore':'Explore','help.explore.1':'Move with keys or select open ground.','help.explore.2':'Touch an actor or prompt to confirm.',
    'help.menu':'Menus','help.menu.1':'Esc or Back closes the top panel.','help.menu.2':'Use keyboard, touch or a controller.',
    'help.save':'Save your journey','help.save.1':'Save or load at available checkpoints.','help.save.2':'Export your records for another device.',
    'saves.heading':'Journey records','saves.loading':'Reading records','saves.empty':'No records yet',
    'saves.error':'Some records could not be loaded','saves.auto':'Auto record','saves.slot':'Slot {n}',
    'saves.emptySlot':'Empty slot','saves.incompatible':'Incompatible','saves.import':'Import save',
    'confirm.heading':'Begin a new journey?','confirm.explain.1':'This starts a new journey.','confirm.explain.2':'Keep any record you want to continue.',
    'confirm.new':'Begin journey','status.busy':'Working','status.failed':'Action could not finish','status.done':'Action completed'
  })
});
export function createShellWords({language,wanted=[],onMissing, languages=SHELL_WORDS}={}) {
  const keys=Object.keys(languages);
  return createTextTable({languages,language:keys.includes(language)?language:pickLanguage(keys,wanted),
    fallback:keys[0],...(onMissing?{onMissing}:{})});
}
export function localized(value,words,fallback='') {
  if(typeof value==='string')return value;
  return value?.[words.language]??value?.zh??value?.en??fallback;
}
