import { palette as C, skin } from './native/theme.mjs';

const valid=p=>Array.isArray(p)&&p.length>=2&&p.every(value=>Number.isFinite(value)&&value>=0&&value<=1);
/** 3D projection is in normalized viewport coordinates; map to Play's actual shown screen. */
export function routePoints(project,position,steps,screen) {
 return [position,...steps.slice(0,14)].map(({x,y})=>{
  const p=project(x,y);return valid(p)?[screen.x+p[0]*screen.width,screen.y+p[1]*screen.height]:null;
 });
}
export function navigationWords(state,message,language) {
 if(language!=='en')return message;
 return ({walking:'Following route · tap to reroute',cancelled:'Route cancelled',unreachable:'Choose a reachable tile or landmark',arrived:'Arrived'})[state]??message;
}
function description(upright) {
 return {type:'panel',width:'fill',height:'fill',children:[{type:'panel',name:'route-card',layout:'row',anchor:'top',width:upright?'94%':'35%',height:upright?82:62,y:upright?126:7,padding:3,gap:4,color:C.night,alpha:.94,border:{width:1,color:C.line},children:[
  {type:'panel',width:'fill',height:'fill',layout:'column',gap:3,padding:4,children:[{type:'text',name:'route-destination',text:'',height:25,width:'fill',size:18,bold:true,color:C.gold},{type:'text',name:'route-status',text:'',height:25,width:'fill',size:15,color:C.muted}]},
  {type:'button',name:'route-cancel',text:'取消尋路',width:108,height:56,color:C.redDim,textColor:C.cream,size:18}
 ]}]};
}
export function createWorldNavigation(game,{cancel,signal,language=()=> 'zh'}={}) {
 const guide=game.sprite(undefined,game.effects);
 guide.visible=false;
 let state='',name='',message='',timer,visible=false,drawn='',closed=false,localized=false;
 const view=game.show({label:'Travel route',area:'safe',skin,root:description(false),portrait:description(true),tablet:description(false),tabletPortrait:description(true)}, {bind:{
  'route-card':{visible:()=>visible},'route-destination':{text:()=>name},'route-status':{text:()=>localized?message:navigationWords(state,message,language())},
  'route-cancel':{visible:()=>state==='walking',disabled:()=>state!=='walking',text:()=>language()==='en'?'Cancel route':'取消尋路',tap:()=>cancel?.()}
 }});
 const refresh=()=>{view.refresh();game.invalidate?.();};
 function hide(){clearTimeout(timer);visible=false;state='';guide.visible=false;drawn='';guide.graphics.clear();refresh();}
 function close(){if(closed)return;closed=true;clearTimeout(timer);view.close();if(!guide.isDisposed)guide.dispose();signal?.removeEventListener('abort',close);}
 if(signal?.aborted)close();else signal?.addEventListener('abort',close,{once:true});
 return Object.freeze({
  hide,
  show(next,destination,detail,alreadyLocalized=false){clearTimeout(timer);state=next;name=destination;message=detail;localized=alreadyLocalized;visible=true;if(state!=='walking'){guide.visible=false;timer=setTimeout(hide,3200)}refresh();},
  draw(project,position,steps,target){
   if(signal?.aborted)return;
   const points=routePoints(project,position,steps,game.screen);
   const end=project(target.x,target.y),marker=valid(end)&&end.every(n=>n>.02&&n<.98)?[game.screen.x+end[0]*game.screen.width,game.screen.y+end[1]*game.screen.height]:null;
   const key=JSON.stringify([points.map(p=>p?.map(Math.round)??null),marker?.map(Math.round)??null]);
   if(key===drawn&&guide.visible)return;
   drawn=key;guide.visible=true;
   const g=guide.graphics;g.clear();
   // Dark underlay aids visibility on snow and light terrain. Reuse one native display node.
   for(const [colour,alpha,width] of [[C.night,.9,5],[C.gold,.98,2.5]]){
    g.lineStyle(width,colour,alpha);let connected=false;
    for(const point of points){if(!point){connected=false;continue;} if(connected)g.lineTo(...point);else g.moveTo(...point);connected=true;}
   }
   if(marker){g.lineStyle(4,C.night,.9).drawCircle(...marker,7);g.lineStyle(2,C.gold,1).drawCircle(...marker,7);}
   game.invalidate?.();
  },close
 });
}
