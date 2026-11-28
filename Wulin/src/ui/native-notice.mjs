// Short-lived order feedback and persistent world news share one native
// status card. Scene cards are passive; modal cards occupy their own row.
import {COLORS,col,text} from './native-kit.mjs';

function noticeGeometry(message,tone,{width,height,portrait,world,staged,collapsed,inline,battle}) {
  const size=14,padding=8,short=world&&staged&&!battle&&!portrait&&height<520;
  // Preserve the stage-specific clear space beside the right command panel.
  const left=short?184:8;
  const available=short?width-left-(collapsed?8:358):portrait?width-16:width*.48;
  const cardWidth=inline?width:Math.min(portrait?520:550,Math.floor(available),Math.max(184,[...message].length*size+28));
  const color=tone==='warning'?COLORS.vermillion:tone==='success'?0x284e3d:COLORS.dark;
  const y=battle?80:world?(portrait?(staged?255:148):short?168:56):8;
  return {size,padding,cardWidth,color,y,left,short,inline};
}
export function noticeOptions(message,tone,shape) {
  const {size,cardWidth,color,y,left,short}=noticeGeometry(message,tone,shape);
  return {persistent:true,color:COLORS.paper,background:color,backgroundAlpha:1,borderColor:COLORS.gold,
    placement:{anchor:short?'top-left':'top-right',offsetX:left,offsetY:y,maxWidth:Math.max(64,cardWidth),fontSize:size,foreground:true}};
}
export function noticeDescription(message,tone,shape,wrap) {
  const {size,padding,cardWidth,color,y,left,short,inline}=noticeGeometry(message,tone,shape);
  const lines=wrap(message,Math.max(8,(cardWidth-padding*2-12)/size));
  return col(lines.map(line=>text(line,{size,height:20,color:COLORS.paper,lines:1,align:'center'})),{
    name:'wulin-notice',width:inline?'fill':cardWidth,height:lines.length*20+padding*2,
    ...(!inline?{anchor:short?'top-left':'top-right',x:left,y}:{}),
    padding,gap:0,color,alpha:1,border:{color:COLORS.gold,width:1},card:true,
  });
}
export function createNativeNotices(game,{context,translate,wrap,onChange=()=>{},schedule=setTimeout,cancel=clearTimeout}) {
  let transient=null,timer=null,view=null,revision='';
  function close(){view?.close();view=null;revision='';}
  const screen=()=>({width:game.safe.width/(game.uiScale||1),height:game.safe.height/(game.uiScale||1),portrait:game.orientation==='portrait'});
  function sync() {
    const {world,ui,helpers}=context();
    const message=transient?.message??(!ui.fight?ui.notice:'');
    const tone=transient?.tone??'notice';
    if(ui.sheet||!message){close();return;}
    const words=translate(message),options=noticeOptions(words,tone,{
      ...screen(),world:!!world,staged:!!world&&helpers.isStaged(),collapsed:!!ui.commandCollapsed,battle:!!ui.fight,
    });
    const next=JSON.stringify([words,options]);
    // The engine maintains the foreground and safe placement across ordinary view remounts.
    if(revision===next&&view?.active)return;
    close();
    view=game.toast(words,options);
    revision=next;
  }
  function toast(message,tone='notice') {
    if(!message)return;
    if(timer!==null)cancel(timer);
    const current={message,tone};transient=current;
    timer=schedule(()=>{
      if(transient!==current)return; // Late callback cannot clear a newer message.
      transient=null;timer=null;sync();onChange();
    },tone==='warning'?4800:3200);
    sync();onChange();
  }
  function inline(mode) {
    if(!transient)return null;
    const s=screen(),portrait=mode.includes('portrait'),tablet=mode.startsWith('tablet');
    const w=(portrait?s.width:tablet?Math.min(s.width,720):s.width*.94)-16;
    return noticeDescription(translate(transient.message),transient.tone,{...s,width:w,portrait,inline:true},wrap);
  }
  return {sync,toast,inline};
}
