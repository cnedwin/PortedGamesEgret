// Each overlay restores exactly the interaction/ARIA state it inherited, including a parent battle overlay.
const top=()=>[...document.querySelectorAll('.battleLab')].at(-1);
const focusable='button,input,select,textarea,a[href],[tabindex]';
const available=node=>!node.disabled&&node.tabIndex>=0&&!node.closest('[inert],[aria-hidden="true"]')&&node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden';

export function isolateBattleModal(host,opener){
 const scope=opener?.closest?.('[role="dialog"]')??document.body;
 const openerKey=opener?.dataset?.lab??null;
 const previous=[...document.body.children].filter(node=>node!==host&&!['SCRIPT','STYLE','LINK'].includes(node.tagName)).map(node=>({node,inert:node.inert,hidden:node.getAttribute('aria-hidden'),modal:node.getAttribute('aria-modal')}));
 for(const {node,modal}of previous){node.inert=true;node.setAttribute('aria-hidden','true');if(modal!==null)node.setAttribute('aria-modal','false');}
 host.tabIndex=-1;
 const entries=()=>[...host.querySelectorAll(focusable)].filter(available);
 function focusInside(){(entries()[0]??host).focus({preventScroll:true});}
 function keepFocus(event){if(top()===host&&!host.contains(event.target))focusInside();}
 document.addEventListener('focusin',keepFocus,true);
 let released=false;
 return {
  tab(event){
   if(event.code!=='Tab'||top()!==host)return false;
   const controls=entries(),at=controls.indexOf(document.activeElement);
   const index=at<0?(event.shiftKey?controls.length-1:0):(at+(event.shiftKey?-1:1)+controls.length)%controls.length;
   const next=controls[index]??host;
   event.preventDefault();next.focus({preventScroll:true});return true;
  },
  release(){
   if(released)return;released=true;document.removeEventListener('focusin',keepFocus,true);
   for(const {node,inert,hidden,modal}of previous){
    if(!node.isConnected)continue;node.inert=inert;
    for(const[name,value]of[['aria-hidden',hidden],['aria-modal',modal]])value===null?node.removeAttribute(name):node.setAttribute(name,value);
   }
   const rebuilt=openerKey&&scope.isConnected?scope.querySelector(`[data-lab="${CSS.escape(openerKey)}"]`):null;
   const target=opener?.isConnected&&available(opener)?opener:rebuilt&&available(rebuilt)?rebuilt:[...scope.querySelectorAll(focusable)].find(available);
   if(target&&available(target))target.focus({preventScroll:true});
  }
 };
}
