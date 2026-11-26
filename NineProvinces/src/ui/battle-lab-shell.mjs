import {h,button} from './dom.mjs';
import {getLanguage,nm} from '../i18n.mjs';
import {UNITS} from '../data/battle.mjs';
import {generalName} from '../view/names.mjs';
import {isolateBattleModal} from './battle-modal-focus.mjs';
export const words=(zh,en)=>getLanguage()==='en'?en:zh;
export const unitName=u=>u.general?generalName(u.general):nm(UNITS[u.kind??u.unit]);
export const phaseName=p=>words({deploy:'部署',fight:'交战',result:'结算'}[p]??p,{deploy:'Deployment',fight:'Combat',result:'Result'}[p]??p);
const sign=n=>(n>=0?'+':'')+Math.round(n*100)+'%';
export const formationInfo=f=>words('攻','ATK ')+sign(f.atk)+' · '+words('守','DEF ')+sign(f.def)+' · '+words('速','SPD ')+sign(f.spd)+(f.front?' · '+words('正面','Front ')+sign(f.front):'')+(f.flank?' · '+words('夹击','Flank ')+sign(f.flank):'');
export const stamp=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');

/** One overlay owns its RAF, listeners and every board/child resource registered with it. */
export function createLabShell(title,onExit){
 const previous=document.activeElement,cleanups=[];
 const host=h('section.battleLab',{role:'dialog','aria-modal':'true','aria-label':title});
 const heading=h('h2',title),body=h('div.labBody'),notice=h('p.labNotice',{role:'status','aria-live':'polite'});
 let gone=false,frame=0,runKey=()=>false;
 function destroy(){
  if(gone)return;gone=true;cancelAnimationFrame(frame);window.removeEventListener('keydown',key,true);
  for(const fn of cleanups)fn();host.remove();focusGuard.release();
 }
 function close(){if(!gone){destroy();onExit?.();}}
 const back=button(words('返回','Return'),close);back.dataset.lab='exit';
 host.append(h('header.labHeader',h('div',h('small',words('九州烽烟 · 兵法卷','NINE PROVINCES · TACTICS')),heading),back),body,notice);
 document.body.append(host);const focusGuard=isolateBattleModal(host,previous);back.focus({preventScroll:true});
 function key(e){
  if(!host.isConnected||[...document.querySelectorAll('.battleLab')].at(-1)!==host)return;
  if(focusGuard.tab(e)){e.stopImmediatePropagation();return;}
  if(runKey(e.code,e)){e.preventDefault();e.stopImmediatePropagation();return;}
  if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}
 }
 window.addEventListener('keydown',key,true);
 host.addEventListener('wheel',e=>e.stopPropagation(),{passive:true});
 host.addEventListener('pointerdown',e=>e.stopPropagation());
 function loop(fn){
  let last=performance.now();
  function tick(now){if(gone)return;const dt=Math.min(.1,(now-last)/1000);last=now;fn(dt);frame=requestAnimationFrame(tick);}
  frame=requestAnimationFrame(tick);
 }
 return {host,body,heading,notice,close,destroy,loop,onDestroy:fn=>cleanups.push(fn),key:code=>runKey(code),setKey:fn=>{runKey=fn;},get gone(){return gone;}};
}
