// Native reading controls shared by live messages and review lists. The caller
// supplies every word and portrait; this module owns only presentation.
import { Bitmap } from '@egret/engine';
import { palette as C, skin, metrics } from './theme.mjs';

export const readingLabels = language => (language === 'en' ? {
  dialogue:'Dialogue', continue:'Continue', history:'Review dialogue', skipRead:'Skip read dialogue',
  historyShort:'Review',skipReadShort:'Skip read',scroll:'Scroll ↓', journal:'Dialogue journal', previous:'Previous page', next:'Next page', back:'Back', page:'Page'
} : {
  dialogue:'對話', continue:'繼續', history:'對話回看', skipRead:'跳過已讀',
  historyShort:'回看',skipReadShort:'跳過已讀',scroll:'滑動 ↓', journal:'對話回看', previous:'上一頁', next:'下一頁', back:'返回', page:'頁次'
});
const fill = 'fill';
export const panel = (children, options = {}) => ({type:'panel', width:fill, height:fill, children, ...options});
export const column = (children, options = {}) => panel(children, {layout:'column', gap:6, ...options});
export const row = (children, options = {}) => panel(children, {layout:'row', gap:7, ...options});
export const label = (name, text, options = {}) => ({type:'text', name, text, width:fill, height:28,
  align:'left', size:18, color:C.cream, ...options});
export const button = (name, text, options = {}) => ({type:'button', name, text, width:fill,
  height:metrics.target, size:18, color:C.jade, textColor:C.cream, ...options});
export const scrollBody = name => column([], {name, scroll:'vertical', height:fill, gap:6,
  color:C.night, card:true, padding:6});

export function readingDescription(heading, build, options = {}) {
  const profiles={root:{portrait:false,tablet:false}, portrait:{portrait:true,tablet:false},
    tablet:{portrait:false,tablet:true}, tabletPortrait:{portrait:true,tablet:true}};
  return {label:heading,area:'safe',skin,...options,
    ...Object.fromEntries(Object.entries(profiles).map(([name,profile])=>[name,build(profile)]))};
}

// Each replacement installs only measured native paragraph displays, and every
// asynchronous result belongs to the current view generation. Keep the shared
// browser provider/cache inside Play; do not duplicate canvas text raster code.
export function createReadingRows({game,scope,body='reading-body',rows,language=()=> 'zh',onError=console.error,fontSize=22,lineHeight=29}) {
  let generation=0,closed=false,pending=Promise.resolve(false),revision=0;
  const scopes=new Set();
  function report(error){try{onError(error)}catch{/* Keep diagnostics out of UI control flow. */}}
  function render(view,{toEnd=false}={}){
    if(closed||scope.signal.aborted)return Promise.resolve(false);
    const token=++generation;

    const child=scope.use(game.engine.createScope());
    scopes.add(child);
    const alive=()=>!closed&&token===generation&&!child.signal.aborted;
    const width=Math.max(1,Math.floor(view.rect(body).width-12));
    const source=rows().map(entry=>({heading:entry.heading??'',body:entry.body??''}));
    const currentPage=++revision;
    const job=(async()=>{
      const visuals=await Promise.all(source.map(async entry=>{
        const paragraph=await game.browser.createParagraphLabel({scope:child,text:entry.body,width,
          fontFamily:'Microsoft YaHei',fontSize,lineHeight,locale:language()==='en'?'en':'zh-TW',color:C.cream});
        await paragraph.ready;
        return {entry,paragraph};
      }));
      if(!alive()){child.dispose();scopes.delete(child);return false;}
      const parts=visuals.map(({entry,paragraph},i)=>{
        const name='reading-paragraph-'+currentPage+'-'+i;
        const textHeight=Math.max(25,Math.ceil(paragraph.bounds.height)+2);
        const headingName='reading-heading-'+currentPage+'-'+i;
        return column([
          ...(entry.heading?[label(headingName,entry.heading,{height:26,color:C.gold,bold:true,size:17})]:[]),
          panel([],{name,width:fill,height:textHeight,label:entry.body})
        ],{name:'reading-row-'+i,height:textHeight+(entry.heading?32:0),gap:6});
      });
      view.replaceChildren(body,parts);
      for(let i=0;i<visuals.length;i++){
        const holder=view.get('reading-paragraph-'+currentPage+'-'+i);
        holder.addChild(visuals[i].paragraph.display);
      }
      const scroll=view.scroll(body);
      scroll.scrollTo(toEnd?scroll.maximum:0);
      // The previous rows are no longer in the view after collection replace.
      for(const old of scopes)if(old!==child){old.dispose();scopes.delete(old);}
      game.invalidate();
      return true;
    })().catch(error=>{
      if(!alive()){child.dispose();scopes.delete(child);return false;}
      for(const old of scopes)if(old!==child){old.dispose();scopes.delete(old);}
      child.dispose();scopes.delete(child);
      report(error);throw error;
    });
    pending=job;
    // The owner can explicitly await ready; relayout callbacks have no awaiter.
    void job.catch(()=>{});
    return job;
  }
  async function ready(){
    for(;;){
      const awaited=pending;
      try{await awaited}catch(error){if(awaited===pending)throw error;}
      if(awaited===pending||closed)return !closed;
    }
  }
  function close(){if(closed)return;closed=true;++generation;for(const child of scopes)child.dispose();scopes.clear();}
  scope.signal.addEventListener('abort',close,{once:true});
  return {render,ready,close};
}

// Borrow an already-loaded texture, as supplied by the application. The named
// view's native holder is recreated by Play on rotation, not by DOM layout.
export function placeReadingArt(view,name,lease){
  if(!lease)return;
  const holder=view.get(name);
  const rect=view.rect(name);
  const picture=new Bitmap(lease);
  const scale=Math.min(rect.width/picture.naturalWidth,rect.height/picture.naturalHeight);
  picture.scaleX=picture.scaleY=scale;
  picture.x=(rect.width-picture.naturalWidth*scale)/2;
  picture.y=(rect.height-picture.naturalHeight*scale)/2;
  holder.addChild(picture);
}
