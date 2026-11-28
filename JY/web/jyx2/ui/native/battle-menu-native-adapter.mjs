// Bridge the host's existing menu interface to the engine-owned choice UI.
// The bridge owns no scenario records, conditions, combat or game state.
import {createChoiceMenu} from './choice-menu.mjs';

const copy={
  zh:{level:'級',health:'生命',team:'選擇出戰隊友',allTeam:'全選／取消',confirm:'確定出戰',
    inventory:'物品選擇',use:'使用',yes:'是',no:'否'},
  en:{level:'Lv.',health:'Health',team:'Select team',allTeam:'Toggle all',confirm:'Confirm team',
    inventory:'Item selection',use:'Use',yes:'Yes',no:'No'}
};
export function createBattleMenu(game, gameplayCanvas, {
  portraitUrl,itemIconUrl,fallbackImageUrl,inventoryFilters,
  language=()=> 'zh',initialTeamSelection,teamLabel,teamDetail,stack,onActiveChange,onError,pageSize
}={}) {
  const locale=()=>typeof language==='function'?language():language;
  const words=()=>copy[locale()==='en'?'en':'zh'];
  return createChoiceMenu(game,{
    portraitUrl,itemIconUrl,fallbackImageUrl,inventoryFilters,language,labels:words,stack,onError,pageSize,
    onActiveChange(active){
      onActiveChange?.(active);
      // Return gameplay focus only when the last modal actually closes.
      if(!active)gameplayCanvas?.focus?.({preventScroll:true});
    },
    teamOptions:{
      // The caller retains the prior default-team policy; the adapter only
      // exposes its selected ID set.
      initialSelection:initialTeamSelection,
      labelFor:teamLabel??(role=>{
        const level=Number.isFinite(role.level)?(locale()==='en'?words().level+' '+role.level:role.level+' '+words().level):'';
        return [role.name,level].filter(Boolean).join(' · ');
      }),
      detailFor:teamDetail??(role=>Number.isFinite(role.hp)?words().health+' '+role.hp+'/'+role.maxHp:role.detail)
    }
  });
}
