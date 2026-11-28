// Native choice adapter for the existing gameplay callers. The host owns
// its scenario, inventory records, save semantics and all combat decisions.
import {createBattleMenu as createNativeBattleMenu} from './jyx2/ui/native/battle-menu-native-adapter.mjs';

export function createBattleMenu(game, canvas, {
  portraitUrl: enhancedPortrait,itemIconUrl: themedItemIcon,
  visualStyle=()=> 'jyx2',language=()=> 'zh',onActiveChange,onError,stack
}={}) {
  const visual=()=>typeof visualStyle==='function'?visualStyle():visualStyle;
  const lang=()=>typeof language==='function'?language():language;
  const tr=(zh,en)=>lang()==='en'?en:zh;
  // Preserve the existing host URL selection and the previously available
  // fallback for optional enhanced portraits/items. No assets are copied.
  const portraitUrl=id=>visual()==='classic'?'/art/head/'+id+'.png':
    enhancedPortrait?.(id)??('/art/portrait/'+id+'.png');
  const itemIconUrl=id=>(visual()==='jyx2'&&themedItemIcon?.(id))||('/art/item/'+id+'.png');
  const menu=createNativeBattleMenu(game,canvas,{
    portraitUrl,itemIconUrl,language:lang,onActiveChange,onError,stack,
    fallbackImageUrl:row=>row.portrait&&row.headId!==undefined?'/art/head/'+row.headId+'.png':
      row.dataset?.itemId!==undefined?'/art/item/'+row.dataset.itemId+'.png':undefined,
    inventoryFilters:()=>[
      {type:0,label:tr('道具','Items')},{type:1,label:tr('裝備','Gear')},
      {type:2,label:tr('經書','Books')},{type:3,label:tr('消耗品','Supplies')},
      {type:4,label:tr('暗器','Tools')}
    ],
    // This is the old adapter's initial UI selection; eligibility, party
    // membership, combat and the selected ID set remain host responsibilities.
    initialTeamSelection(roles){
      const lead=roles.find(role=>role.id===0)??roles[0];
      return lead?[lead.id]:[];
    },
    teamDetail(role){
      const level=Number.isFinite(role.level)?(lang()==='en'?'Lv. '+role.level:role.level+' 級'):'';
      const health=Number.isFinite(role.hp)?tr('生命 ','Health ')+role.hp+'/'+role.maxHp:'';
      return [level,health].filter(Boolean).join(' · ');
    }
  });
  const choose=menu.choose,askJoin=menu.askJoin,showItems=menu.showItems;
  menu.choose=(title,rows,signal,columns=1,options={})=>choose(title,rows,signal,
    visual()==='jyx2'&&['roster','inventory'].includes(options.variant)?2:columns,{
      ...options,...(options.member?.headId!==undefined?{
        member:{...options.member,fallbackIcon:'/art/head/'+options.member.headId+'.png'}
      }:{})
    });
  menu.askJoin=(signal,title=tr('是否要求加入？','Invite to join?'))=>askJoin(signal,title);
  menu.showItems=(items,use,cancel)=>showItems(items,use,cancel,{
    title:tr('藥品與暗器','Supplies and tools'),columns:visual()==='jyx2'?2:1,
    labels:{back:tr('返回戰鬥','Back to battle')}
  });
  return menu;
}
